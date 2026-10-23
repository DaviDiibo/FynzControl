-- ============================================================================
-- ControlFynz — Esquema Inicial Completo de Base de Datos (Supabase / Postgres 15+)
-- Versión: 1.0.0
-- Modo: 1-Clic ejecutable, idempotente y compatible con RLS + Delta Sync
-- ============================================================================

-- ============================================================================
-- 1. Extensiones del Sistema
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Tipos Enumerados (ENUMs)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM (
        'income',
        'expense',
        'reimbursement',
        'card_payment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM (
        'cash_debit',
        'credit_card'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE debt_category_enum AS ENUM (
        'credit_card',
        'loan',
        'mortgage',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE debt_type_enum AS ENUM (
        'credit_card',
        'installment_loan'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE card_payment_type_enum AS ENUM (
        'full_statement',
        'installments'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE friend_loan_status_enum AS ENUM (
        'active',
        'partial',
        'paid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE debt_payment_mode_enum AS ENUM (
        'next',
        'last'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE currency_code_enum AS ENUM (
        'USD',
        'EUR',
        'BRL',
        'ARS',
        'COP',
        'MXN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE card_network_enum AS ENUM (
        'visa',
        'mastercard',
        'amex',
        'discover',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. Funciones de Disparo (Triggers)
-- ============================================================================

-- Actualización automática de updated_at en UTC
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Tablas Relacionales (Orden estricto de Claves Foráneas)
-- ============================================================================

-- Tabla 1: profiles (extensión de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_profiles_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tabla 2: user_settings (preferencias y configuración de usuario)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    currency currency_code_enum NOT NULL DEFAULT 'USD',
    privacy_mode BOOLEAN NOT NULL DEFAULT false,
    biometrics_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- Trigger de nuevo usuario en auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = timezone('utc'::text, now());

    INSERT INTO public.user_settings (user_id, currency, privacy_mode, biometrics_enabled)
    VALUES (NEW.id, 'USD', false, false)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Tabla 3: banks (entidades bancarias del usuario)
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- Tabla 4: credit_cards (tarjetas de crédito con corte y límite de pago)
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bank_id UUID REFERENCES banks(id) ON DELETE SET NULL,
    bank_name TEXT NOT NULL CHECK (length(trim(bank_name)) > 0),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    payment_day SMALLINT NOT NULL CHECK (payment_day BETWEEN 1 AND 31),
    last_four_digits VARCHAR(4) CHECK (last_four_digits IS NULL OR last_four_digits ~ '^[0-9]{4}$'),
    credit_limit NUMERIC(14, 2) CHECK (credit_limit IS NULL OR credit_limit >= 0),
    color VARCHAR(20) DEFAULT '#00FFA3',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- Tabla 5: people (agenda y directorio de contactos)
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- Tabla 6: personal_debts (deudas bancarias y préstamos con amortización)
CREATE TABLE IF NOT EXISTS personal_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    entity TEXT NOT NULL CHECK (length(trim(entity)) > 0),
    category debt_category_enum NOT NULL DEFAULT 'other',
    debt_type debt_type_enum DEFAULT 'installment_loan',
    card_payment_type card_payment_type_enum,
    card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    bank_id UUID REFERENCES banks(id) ON DELETE SET NULL,
    principal_amount NUMERIC(14, 2) CHECK (principal_amount IS NULL OR principal_amount >= 0),
    is_preexisting BOOLEAN NOT NULL DEFAULT false,
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    remaining_amount NUMERIC(14, 2) NOT NULL CHECK (remaining_amount >= 0),
    due_day SMALLINT CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31),
    due_date TEXT NOT NULL,
    interest_rate NUMERIC(6, 2) DEFAULT 0 CHECK (interest_rate >= 0),
    monthly_payment NUMERIC(14, 2) CHECK (monthly_payment IS NULL OR monthly_payment >= 0),
    total_installments SMALLINT CHECK (total_installments IS NULL OR total_installments >= 0),
    paid_installments SMALLINT NOT NULL DEFAULT 0 CHECK (paid_installments >= 0),
    initial_paid_installments INTEGER NOT NULL DEFAULT 0 CHECK (initial_paid_installments >= 0),
    prepaid_last_installments SMALLINT NOT NULL DEFAULT 0 CHECK (prepaid_last_installments >= 0),
    total_discount_saved NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_discount_saved >= 0),
    total_actual_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_actual_paid >= 0),
    settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    last_payment_date TIMESTAMPTZ,
    icon TEXT NOT NULL DEFAULT 'cash-outline',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_personal_debts_amounts CHECK (remaining_amount <= total_amount)
);

-- Tabla 7: friend_loans (préstamos a amigos / dinero por cobrar)
CREATE TABLE IF NOT EXISTS friend_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    friend_name TEXT NOT NULL CHECK (length(trim(friend_name)) > 0),
    principal_amount NUMERIC(14, 2) NOT NULL CHECK (principal_amount >= 0),
    interest_rate NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
    total_to_collect NUMERIC(14, 2) NOT NULL CHECK (total_to_collect >= 0),
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    initial_paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (initial_paid_amount >= 0),
    remaining_amount NUMERIC(14, 2) NOT NULL CHECK (remaining_amount >= 0),
    is_preexisting BOOLEAN NOT NULL DEFAULT false,
    status friend_loan_status_enum NOT NULL DEFAULT 'active',
    notes TEXT,
    due_date TEXT NOT NULL,
    settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_friend_loans_balance CHECK (remaining_amount <= total_to_collect)
);

-- Tabla 8: third_party_card_charges (compras con tarjeta a nombre de terceros)
CREATE TABLE IF NOT EXISTS third_party_card_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    person_name TEXT NOT NULL CHECK (length(trim(person_name)) > 0),
    card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    card_name TEXT NOT NULL CHECK (length(trim(card_name)) > 0),
    concept TEXT NOT NULL CHECK (length(trim(concept)) > 0),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    remaining_amount NUMERIC(14, 2) NOT NULL CHECK (remaining_amount >= 0),
    installments_count SMALLINT NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
    monthly_installment_amount NUMERIC(14, 2) NOT NULL CHECK (monthly_installment_amount >= 0),
    current_period_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_period_paid_amount >= 0),
    paid_installments_count SMALLINT NOT NULL DEFAULT 0 CHECK (paid_installments_count >= 0),
    initial_paid_installments INTEGER NOT NULL DEFAULT 0 CHECK (initial_paid_installments >= 0),
    is_preexisting BOOLEAN NOT NULL DEFAULT false,
    last_payment_date TIMESTAMPTZ,
    date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    settled BOOLEAN NOT NULL DEFAULT false,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- Tabla 9: transactions (libro diario contable general)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    type transaction_type_enum NOT NULL,
    category TEXT NOT NULL CHECK (length(trim(category)) > 0),
    icon TEXT NOT NULL DEFAULT 'wallet-outline',
    date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    payment_method payment_method_enum,
    card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
    card_name TEXT,
    bank_id UUID REFERENCES banks(id) ON DELETE SET NULL,
    person_name TEXT,
    notes TEXT,

    -- Nexos relacionales de doble impacto contable
    related_debt_id UUID REFERENCES personal_debts(id) ON DELETE SET NULL,
    related_loan_id UUID REFERENCES friend_loans(id) ON DELETE SET NULL,
    related_charge_id UUID REFERENCES third_party_card_charges(id) ON DELETE SET NULL,
    related_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    related_person_name TEXT,

    -- Metadatos para pagos de cuotas y descuentos en deudas
    installments_count SMALLINT CHECK (installments_count IS NULL OR installments_count >= 1),
    debt_payment_mode debt_payment_mode_enum,
    nominal_debt_amount NUMERIC(14, 2) CHECK (nominal_debt_amount IS NULL OR nominal_debt_amount >= 0),
    debt_installments_paid SMALLINT CHECK (debt_installments_paid IS NULL OR debt_installments_paid >= 0),
    debt_discount_saved NUMERIC(14, 2) CHECK (debt_discount_saved IS NULL OR debt_discount_saved >= 0),
    payment_target TEXT CHECK (payment_target IS NULL OR payment_target IN ('statement', 'partial', 'total')),

    -- Asignaciones atómicas de reembolsos a compras compartidas
    third_party_allocations JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- 5. Triggers de Actualización de Marcas de Tiempo
-- ============================================================================
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON user_settings;
CREATE TRIGGER set_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_banks_updated_at ON banks;
CREATE TRIGGER set_banks_updated_at
    BEFORE UPDATE ON banks
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_credit_cards_updated_at ON credit_cards;
CREATE TRIGGER set_credit_cards_updated_at
    BEFORE UPDATE ON credit_cards
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_people_updated_at ON people;
CREATE TRIGGER set_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_personal_debts_updated_at ON personal_debts;
CREATE TRIGGER set_personal_debts_updated_at
    BEFORE UPDATE ON personal_debts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_friend_loans_updated_at ON friend_loans;
CREATE TRIGGER set_friend_loans_updated_at
    BEFORE UPDATE ON friend_loans
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_third_party_card_charges_updated_at ON third_party_card_charges;
CREATE TRIGGER set_third_party_card_charges_updated_at
    BEFORE UPDATE ON third_party_card_charges
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_transactions_updated_at ON transactions;
CREATE TRIGGER set_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- 6. Índices Optimizados B-Tree
-- ============================================================================

-- 6.1. Índices para Sincronización Delta Offline-First
CREATE INDEX IF NOT EXISTS idx_profiles_delta_sync ON profiles (id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_delta_sync ON user_settings (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_banks_delta_sync ON banks (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_cards_delta_sync ON credit_cards (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_delta_sync ON people (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_debts_delta_sync ON personal_debts (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_loans_delta_sync ON friend_loans (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_charges_delta_sync ON third_party_card_charges (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_delta_sync ON transactions (user_id, updated_at DESC);

-- 6.2. Índices Únicos Parciales
CREATE UNIQUE INDEX IF NOT EXISTS idx_banks_unique_name_per_user 
    ON banks (user_id, lower(trim(name))) 
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_cards_one_default_per_user
    ON credit_cards (user_id)
    WHERE is_default = true AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_people_unique_name_per_user
    ON people (user_id, lower(trim(name)))
    WHERE deleted_at IS NULL;

-- 6.3. Índices de Negocio y Ciclo de Facturación
CREATE INDEX IF NOT EXISTS idx_credit_cards_billing_cycle 
    ON credit_cards (user_id, closing_day, payment_day) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
    ON transactions (user_id, date DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_type_date 
    ON transactions (user_id, type, date DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_personal_debts_active 
    ON personal_debts (user_id, settled, due_day) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_friend_loans_active 
    ON friend_loans (user_id, settled, status) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_charges_active 
    ON third_party_card_charges (user_id, settled, person_id) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_third_party_charges_settled_at 
    ON third_party_card_charges(settled_at);

CREATE INDEX IF NOT EXISTS idx_third_party_charges_last_payment 
    ON third_party_card_charges(last_payment_date);

-- 6.4. Índices de Llaves Foráneas para Integridad y Reversión Contable
CREATE INDEX IF NOT EXISTS idx_transactions_fk_debt ON transactions (related_debt_id) WHERE related_debt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_fk_loan ON transactions (related_loan_id) WHERE related_loan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_fk_charge ON transactions (related_charge_id) WHERE related_charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_fk_person ON transactions (related_person_id) WHERE related_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_fk_card ON transactions (card_id) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_bank_id ON transactions(bank_id) WHERE bank_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_charges_fk_card ON third_party_card_charges (card_id) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_fk_card ON personal_debts (card_id) WHERE card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personal_debts_bank_id ON personal_debts(bank_id) WHERE bank_id IS NOT NULL;

-- ============================================================================
-- 7. Seguridad Row Level Security (RLS) y Políticas Multi-Tenant
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE third_party_card_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento por propietario
DROP POLICY IF EXISTS "profiles_owner_access" ON profiles;
CREATE POLICY "profiles_owner_access" ON profiles
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_settings_owner_access" ON user_settings;
CREATE POLICY "user_settings_owner_access" ON user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "banks_owner_access" ON banks;
CREATE POLICY "banks_owner_access" ON banks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "credit_cards_owner_access" ON credit_cards;
CREATE POLICY "credit_cards_owner_access" ON credit_cards
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "people_owner_access" ON people;
CREATE POLICY "people_owner_access" ON people
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "personal_debts_owner_access" ON personal_debts;
CREATE POLICY "personal_debts_owner_access" ON personal_debts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "friend_loans_owner_access" ON friend_loans;
CREATE POLICY "friend_loans_owner_access" ON friend_loans
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "third_party_card_charges_owner_access" ON third_party_card_charges;
CREATE POLICY "third_party_card_charges_owner_access" ON third_party_card_charges
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_owner_access" ON transactions;
CREATE POLICY "transactions_owner_access" ON transactions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. Permisos de Esquema y Roles (anon / authenticated)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================================================
-- 9. Funciones RPC Transaccionales y Protocolo Delta Sync
-- ============================================================================

-- 9.1. Amortización Atómica de Deudas con Doble Impacto Contable
CREATE OR REPLACE FUNCTION record_debt_amortization_atomic(
    p_user_id UUID,
    p_debt_id UUID,
    p_amount NUMERIC(14, 2),
    p_payment_mode debt_payment_mode_enum,
    p_discount_saved NUMERIC(14, 2),
    p_installments_count SMALLINT,
    p_transaction_id UUID,
    p_title TEXT,
    p_date TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
    -- 1. Actualizar el saldo y cuotas de la deuda
    UPDATE personal_debts
    SET 
        remaining_amount = GREATEST(0, remaining_amount - p_amount),
        paid_installments = paid_installments + COALESCE(p_installments_count, 1),
        prepaid_last_installments = CASE 
            WHEN p_payment_mode = 'last' THEN prepaid_last_installments + COALESCE(p_installments_count, 1)
            ELSE prepaid_last_installments 
        END,
        total_discount_saved = total_discount_saved + COALESCE(p_discount_saved, 0),
        total_actual_paid = total_actual_paid + (p_amount - COALESCE(p_discount_saved, 0)),
        last_payment_date = timezone('utc'::text, now()),
        settled = (remaining_amount - p_amount <= 0),
        settled_at = CASE WHEN (remaining_amount - p_amount <= 0) THEN timezone('utc'::text, now()) ELSE NULL END
    WHERE id = p_debt_id AND user_id = p_user_id;

    -- 2. Insertar la transacción correspondiente en el libro diario
    INSERT INTO transactions (
        id,
        user_id,
        title,
        amount,
        type,
        category,
        date,
        payment_method,
        related_debt_id,
        debt_payment_mode,
        nominal_debt_amount,
        debt_discount_saved,
        debt_installments_paid
    ) VALUES (
        p_transaction_id,
        p_user_id,
        p_title,
        (p_amount - COALESCE(p_discount_saved, 0)),
        'expense',
        'debt',
        p_date,
        'cash_debit',
        p_debt_id,
        p_payment_mode,
        p_amount,
        COALESCE(p_discount_saved, 0),
        COALESCE(p_installments_count, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9.2. RPC sync_pull (Delta Sync de Descarga)
CREATE OR REPLACE FUNCTION sync_pull(
    p_last_sync TIMESTAMPTZ DEFAULT '1970-01-01 00:00:00+00'::timestamptz
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT jsonb_build_object(
        'server_time', timezone('utc'::text, now()),
        'profiles', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM profiles p WHERE p.id = v_user_id AND p.updated_at > p_last_sync), '[]'::jsonb),
        'user_settings', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM user_settings s WHERE s.user_id = v_user_id AND s.updated_at > p_last_sync), '[]'::jsonb),
        'banks', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM banks b WHERE b.user_id = v_user_id AND b.updated_at > p_last_sync), '[]'::jsonb),
        'credit_cards', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM credit_cards c WHERE c.user_id = v_user_id AND c.updated_at > p_last_sync), '[]'::jsonb),
        'people', COALESCE((SELECT jsonb_agg(to_jsonb(pe)) FROM people pe WHERE pe.user_id = v_user_id AND pe.updated_at > p_last_sync), '[]'::jsonb),
        'personal_debts', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM personal_debts d WHERE d.user_id = v_user_id AND d.updated_at > p_last_sync), '[]'::jsonb),
        'friend_loans', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM friend_loans l WHERE l.user_id = v_user_id AND l.updated_at > p_last_sync), '[]'::jsonb),
        'third_party_card_charges', COALESCE((SELECT jsonb_agg(to_jsonb(tc)) FROM third_party_card_charges tc WHERE tc.user_id = v_user_id AND tc.updated_at > p_last_sync), '[]'::jsonb),
        'transactions', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM transactions t WHERE t.user_id = v_user_id AND t.updated_at > p_last_sync), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9.3. RPC sync_push (Subida y Fusión LWW de Mutaciones en Lote)
CREATE OR REPLACE FUNCTION sync_push(
    p_mutations JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_item JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- user_settings
    IF p_mutations ? 'user_settings' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'user_settings')
        LOOP
            INSERT INTO user_settings (
                user_id, currency, privacy_mode, biometrics_enabled, updated_at, deleted_at
            ) VALUES (
                v_user_id,
                COALESCE((v_item->>'currency')::currency_code_enum, 'USD'),
                COALESCE((v_item->>'privacy_mode')::boolean, false),
                COALESCE((v_item->>'biometrics_enabled')::boolean, false),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (user_id) DO UPDATE SET
                currency = EXCLUDED.currency,
                privacy_mode = EXCLUDED.privacy_mode,
                biometrics_enabled = EXCLUDED.biometrics_enabled,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE user_settings.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    -- banks
    IF p_mutations ? 'banks' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'banks')
        LOOP
            INSERT INTO banks (
                id, user_id, name, initial_balance, created_at, updated_at, deleted_at
            ) VALUES (
                (v_item->>'id')::uuid,
                v_user_id,
                v_item->>'name',
                COALESCE((v_item->>'initial_balance')::numeric, 0.00),
                COALESCE((v_item->>'created_at')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                initial_balance = EXCLUDED.initial_balance,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE banks.user_id = v_user_id AND banks.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    -- credit_cards
    IF p_mutations ? 'credit_cards' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'credit_cards')
        LOOP
            INSERT INTO credit_cards (
                id, user_id, bank_id, bank_name, name, closing_day, payment_day,
                last_four_digits, credit_limit, color, is_default, created_at, updated_at, deleted_at
            ) VALUES (
                (v_item->>'id')::uuid,
                v_user_id,
                (v_item->>'bank_id')::uuid,
                v_item->>'bank_name',
                v_item->>'name',
                (v_item->>'closing_day')::smallint,
                (v_item->>'payment_day')::smallint,
                v_item->>'last_four_digits',
                (v_item->>'credit_limit')::numeric,
                COALESCE(v_item->>'color', '#00FFA3'),
                COALESCE((v_item->>'is_default')::boolean, false),
                COALESCE((v_item->>'created_at')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
                bank_id = EXCLUDED.bank_id,
                bank_name = EXCLUDED.bank_name,
                name = EXCLUDED.name,
                closing_day = EXCLUDED.closing_day,
                payment_day = EXCLUDED.payment_day,
                last_four_digits = EXCLUDED.last_four_digits,
                credit_limit = EXCLUDED.credit_limit,
                color = EXCLUDED.color,
                is_default = EXCLUDED.is_default,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE credit_cards.user_id = v_user_id AND credit_cards.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    -- people
    IF p_mutations ? 'people' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'people')
        LOOP
            INSERT INTO people (
                id, user_id, name, phone, email, created_at, updated_at, deleted_at
            ) VALUES (
                (v_item->>'id')::uuid,
                v_user_id,
                v_item->>'name',
                v_item->>'phone',
                v_item->>'email',
                COALESCE((v_item->>'created_at')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                phone = EXCLUDED.phone,
                email = EXCLUDED.email,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE people.user_id = v_user_id AND people.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    -- personal_debts
    IF p_mutations ? 'personal_debts' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'personal_debts')
        LOOP
            INSERT INTO personal_debts (
                id, user_id, title, entity, category, debt_type, card_payment_type,
                card_id, credit_card_id, bank_id, principal_amount, is_preexisting,
                total_amount, remaining_amount, due_day, due_date, interest_rate,
                monthly_payment, total_installments, paid_installments, initial_paid_installments,
                prepaid_last_installments, total_discount_saved, total_actual_paid,
                settled, settled_at, last_payment_date, icon, created_at, updated_at, deleted_at
            ) VALUES (
                (v_item->>'id')::uuid,
                v_user_id,
                v_item->>'title',
                v_item->>'entity',
                COALESCE((v_item->>'category')::debt_category_enum, 'other'),
                COALESCE((v_item->>'debt_type')::debt_type_enum, 'installment_loan'),
                (v_item->>'card_payment_type')::card_payment_type_enum,
                (v_item->>'card_id')::uuid,
                (v_item->>'credit_card_id')::uuid,
                (v_item->>'bank_id')::uuid,
                (v_item->>'principal_amount')::numeric,
                COALESCE((v_item->>'is_preexisting')::boolean, false),
                COALESCE((v_item->>'total_amount')::numeric, 0),
                COALESCE((v_item->>'remaining_amount')::numeric, 0),
                (v_item->>'due_day')::smallint,
                COALESCE(v_item->>'due_date', ''),
                COALESCE((v_item->>'interest_rate')::numeric, 0),
                (v_item->>'monthly_payment')::numeric,
                (v_item->>'total_installments')::smallint,
                COALESCE((v_item->>'paid_installments')::smallint, 0),
                COALESCE((v_item->>'initial_paid_installments')::integer, 0),
                COALESCE((v_item->>'prepaid_last_installments')::smallint, 0),
                COALESCE((v_item->>'total_discount_saved')::numeric, 0),
                COALESCE((v_item->>'total_actual_paid')::numeric, 0),
                COALESCE((v_item->>'settled')::boolean, false),
                (v_item->>'settled_at')::timestamptz,
                (v_item->>'last_payment_date')::timestamptz,
                COALESCE(v_item->>'icon', 'cash-outline'),
                COALESCE((v_item->>'created_at')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                entity = EXCLUDED.entity,
                category = EXCLUDED.category,
                debt_type = EXCLUDED.debt_type,
                card_payment_type = EXCLUDED.card_payment_type,
                card_id = EXCLUDED.card_id,
                credit_card_id = EXCLUDED.credit_card_id,
                bank_id = EXCLUDED.bank_id,
                principal_amount = EXCLUDED.principal_amount,
                is_preexisting = EXCLUDED.is_preexisting,
                total_amount = EXCLUDED.total_amount,
                remaining_amount = EXCLUDED.remaining_amount,
                due_day = EXCLUDED.due_day,
                due_date = EXCLUDED.due_date,
                interest_rate = EXCLUDED.interest_rate,
                monthly_payment = EXCLUDED.monthly_payment,
                total_installments = EXCLUDED.total_installments,
                paid_installments = EXCLUDED.paid_installments,
                initial_paid_installments = EXCLUDED.initial_paid_installments,
                prepaid_last_installments = EXCLUDED.prepaid_last_installments,
                total_discount_saved = EXCLUDED.total_discount_saved,
                total_actual_paid = EXCLUDED.total_actual_paid,
                settled = EXCLUDED.settled,
                settled_at = EXCLUDED.settled_at,
                last_payment_date = EXCLUDED.last_payment_date,
                icon = EXCLUDED.icon,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE personal_debts.user_id = v_user_id AND personal_debts.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    -- friend_loans
    IF p_mutations ? 'friend_loans' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'friend_loans')
        LOOP
            INSERT INTO friend_loans (
                id, user_id, person_id, friend_name, principal_amount, interest_rate,
                total_to_collect, paid_amount, initial_paid_amount, remaining_amount,
                is_preexisting, status, notes, due_date, settled, settled_at,
                created_at, updated_at, deleted_at
            ) VALUES (
                (v_item->>'id')::uuid,
                v_user_id,
                (v_item->>'person_id')::uuid,
                v_item->>'friend_name',
                COALESCE((v_item->>'principal_amount')::numeric, 0),
                COALESCE((v_item->>'interest_rate')::numeric, 0),
                COALESCE((v_item->>'total_to_collect')::numeric, 0),
                COALESCE((v_item->>'paid_amount')::numeric, 0),
                COALESCE((v_item->>'initial_paid_amount')::numeric, 0),
                COALESCE((v_item->>'remaining_amount')::numeric, 0),
                COALESCE((v_item->>'is_preexisting')::boolean, false),
                COALESCE((v_item->>'status')::friend_loan_status_enum, 'active'),
                v_item->>'notes',
                COALESCE(v_item->>'due_date', ''),
                COALESCE((v_item->>'settled')::boolean, false),
                (v_item->>'settled_at')::timestamptz,
                COALESCE((v_item->>'created_at')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
                person_id = EXCLUDED.person_id,
                friend_name = EXCLUDED.friend_name,
                principal_amount = EXCLUDED.principal_amount,
                interest_rate = EXCLUDED.interest_rate,
                total_to_collect = EXCLUDED.total_to_collect,
                paid_amount = EXCLUDED.paid_amount,
                initial_paid_amount = EXCLUDED.initial_paid_amount,
                remaining_amount = EXCLUDED.remaining_amount,
                is_preexisting = EXCLUDED.is_preexisting,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                due_date = EXCLUDED.due_date,
                settled = EXCLUDED.settled,
                settled_at = EXCLUDED.settled_at,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE friend_loans.user_id = v_user_id AND friend_loans.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    -- third_party_card_charges
    IF p_mutations ? 'third_party_card_charges' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'third_party_card_charges')
        LOOP
            INSERT INTO third_party_card_charges (
                id, user_id, person_id, person_name, card_id, card_name, concept,
                amount, total_amount, remaining_amount, installments_count,
                monthly_installment_amount, current_period_paid_amount, paid_installments_count,
                initial_paid_installments, is_preexisting, last_payment_date, date,
                settled, settled_at, created_at, updated_at, deleted_at
            ) VALUES (
                (v_item->>'id')::uuid,
                v_user_id,
                (v_item->>'person_id')::uuid,
                v_item->>'person_name',
                (v_item->>'card_id')::uuid,
                v_item->>'card_name',
                v_item->>'concept',
                COALESCE((v_item->>'amount')::numeric, 0),
                COALESCE((v_item->>'total_amount')::numeric, 0),
                COALESCE((v_item->>'remaining_amount')::numeric, 0),
                COALESCE((v_item->>'installments_count')::smallint, 1),
                COALESCE((v_item->>'monthly_installment_amount')::numeric, 0),
                COALESCE((v_item->>'current_period_paid_amount')::numeric, 0),
                COALESCE((v_item->>'paid_installments_count')::smallint, 0),
                COALESCE((v_item->>'initial_paid_installments')::integer, 0),
                COALESCE((v_item->>'is_preexisting')::boolean, false),
                (v_item->>'last_payment_date')::timestamptz,
                COALESCE((v_item->>'date')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'settled')::boolean, false),
                (v_item->>'settled_at')::timestamptz,
                COALESCE((v_item->>'created_at')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
                person_id = EXCLUDED.person_id,
                person_name = EXCLUDED.person_name,
                card_id = EXCLUDED.card_id,
                card_name = EXCLUDED.card_name,
                concept = EXCLUDED.concept,
                amount = EXCLUDED.amount,
                total_amount = EXCLUDED.total_amount,
                remaining_amount = EXCLUDED.remaining_amount,
                installments_count = EXCLUDED.installments_count,
                monthly_installment_amount = EXCLUDED.monthly_installment_amount,
                current_period_paid_amount = EXCLUDED.current_period_paid_amount,
                paid_installments_count = EXCLUDED.paid_installments_count,
                initial_paid_installments = EXCLUDED.initial_paid_installments,
                is_preexisting = EXCLUDED.is_preexisting,
                last_payment_date = EXCLUDED.last_payment_date,
                date = EXCLUDED.date,
                settled = EXCLUDED.settled,
                settled_at = EXCLUDED.settled_at,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE third_party_card_charges.user_id = v_user_id AND third_party_card_charges.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    -- transactions
    IF p_mutations ? 'transactions' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_mutations->'transactions')
        LOOP
            INSERT INTO transactions (
                id, user_id, title, amount, type, category, icon, date, payment_method,
                card_id, card_name, bank_id, person_name, notes,
                related_debt_id, related_loan_id, related_charge_id, related_person_id,
                related_person_name, installments_count, debt_payment_mode,
                nominal_debt_amount, debt_installments_paid, debt_discount_saved,
                payment_target, third_party_allocations, created_at, updated_at, deleted_at
            ) VALUES (
                (v_item->>'id')::uuid,
                v_user_id,
                v_item->>'title',
                COALESCE((v_item->>'amount')::numeric, 0),
                (v_item->>'type')::transaction_type_enum,
                v_item->>'category',
                COALESCE(v_item->>'icon', 'wallet-outline'),
                COALESCE((v_item->>'date')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'payment_method')::payment_method_enum,
                (v_item->>'card_id')::uuid,
                v_item->>'card_name',
                (v_item->>'bank_id')::uuid,
                v_item->>'person_name',
                v_item->>'notes',
                (v_item->>'related_debt_id')::uuid,
                (v_item->>'related_loan_id')::uuid,
                (v_item->>'related_charge_id')::uuid,
                (v_item->>'related_person_id')::uuid,
                v_item->>'related_person_name',
                (v_item->>'installments_count')::smallint,
                (v_item->>'debt_payment_mode')::debt_payment_mode_enum,
                (v_item->>'nominal_debt_amount')::numeric,
                (v_item->>'debt_installments_paid')::smallint,
                (v_item->>'debt_discount_saved')::numeric,
                v_item->>'payment_target',
                COALESCE((v_item->'third_party_allocations'), '[]'::jsonb),
                COALESCE((v_item->>'created_at')::timestamptz, timezone('utc'::text, now())),
                COALESCE((v_item->>'updated_at')::timestamptz, timezone('utc'::text, now())),
                (v_item->>'deleted_at')::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                amount = EXCLUDED.amount,
                type = EXCLUDED.type,
                category = EXCLUDED.category,
                icon = EXCLUDED.icon,
                date = EXCLUDED.date,
                payment_method = EXCLUDED.payment_method,
                card_id = EXCLUDED.card_id,
                card_name = EXCLUDED.card_name,
                bank_id = EXCLUDED.bank_id,
                person_name = EXCLUDED.person_name,
                notes = EXCLUDED.notes,
                related_debt_id = EXCLUDED.related_debt_id,
                related_loan_id = EXCLUDED.related_loan_id,
                related_charge_id = EXCLUDED.related_charge_id,
                related_person_id = EXCLUDED.related_person_id,
                related_person_name = EXCLUDED.related_person_name,
                installments_count = EXCLUDED.installments_count,
                debt_payment_mode = EXCLUDED.debt_payment_mode,
                nominal_debt_amount = EXCLUDED.nominal_debt_amount,
                debt_installments_paid = EXCLUDED.debt_installments_paid,
                debt_discount_saved = EXCLUDED.debt_discount_saved,
                payment_target = EXCLUDED.payment_target,
                third_party_allocations = EXCLUDED.third_party_allocations,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at
            WHERE transactions.user_id = v_user_id AND transactions.updated_at <= EXCLUDED.updated_at;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'synced_at', timezone('utc'::text, now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permisos de ejecución de funciones RPC
GRANT EXECUTE ON FUNCTION record_debt_amortization_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION sync_pull TO authenticated;
GRANT EXECUTE ON FUNCTION sync_push TO authenticated;

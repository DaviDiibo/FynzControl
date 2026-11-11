import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useCardsStore, setCardSyncHandlers } from '../store/cards-store';
import { useDebtsStore, setDebtSyncHandlers, type ThirdPartyCardCharge } from '../store/debts-store';
import { useTransactionsStore, setTransactionSyncHandlers } from '../store/transactions-store';
import { useSettingsStore, type CurrencyCode } from '../store/settings-store';
import { safeStorage } from '../store/safe-storage';
import {
  bankToRow,
  rowToBank,
  cardToRow,
  rowToCard,
  personToRow,
  rowToPerson,
  debtToRow,
  rowToDebt,
  rowToDebt as rowToPersonalDebt,
  chargeToRow,
  rowToCharge,
  rowToCharge as rowToThirdPartyCharge,
  loanToRow,
  rowToLoan,
  rowToLoan as rowToFriendLoan,
  transactionToRow,
  rowToTransaction,
  settingsToRow,
  rowToSettings,
  toDeterministicUuid,
  type BankRow,
  type CreditCardRow,
  type PersonRow,
  type PersonalDebtRow,
  type ThirdPartyCardChargeRow,
  type FriendLoanRow,
  type TransactionRow,
  type UserSettingsRow,
} from '../lib/sync-adapters';

export type SyncTable =
  | 'transactions'
  | 'personal_debts'
  | 'friend_loans'
  | 'third_party_card_charges'
  | 'credit_cards'
  | 'banks'
  | 'people';

export type PendingDeletion = {
  id: string; // ID original o UUID
  table: SyncTable;
  deletedAt: string;
  attempts: number;
};

export const PENDING_DELETIONS_STORAGE_KEY = 'controlfynz-pending-deletions-v1';

let pendingDeletionsCache: PendingDeletion[] = [];
let isTombstoneQueueLoaded = false;
let isFlushingDeletions = false;
let hasPendingFlushRequest = false;

export const getPendingDeletions = async (): Promise<PendingDeletion[]> => {
  try {
    const raw = await safeStorage.getItem(PENDING_DELETIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        pendingDeletionsCache = parsed as PendingDeletion[];
        isTombstoneQueueLoaded = true;
        return [...pendingDeletionsCache];
      }
    }
  } catch {
    // Fallback a caché en memoria
  }
  isTombstoneQueueLoaded = true;
  return [...pendingDeletionsCache];
};

export const getPendingDeletionIdSet = (table: SyncTable): Set<string> => {
  const set = new Set<string>();
  for (const item of pendingDeletionsCache) {
    if (item.table === table) {
      set.add(item.id);
      set.add(toDeterministicUuid(item.id));
    }
  }
  return set;
};

export const enqueuePendingDeletion = async (
  table: SyncTable,
  id: string
): Promise<void> => {
  if (!isTombstoneQueueLoaded) {
    await getPendingDeletions();
  }

  const existingIndex = pendingDeletionsCache.findIndex(
    (item) =>
      item.table === table &&
      (item.id === id || toDeterministicUuid(item.id) === toDeterministicUuid(id))
  );

  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    pendingDeletionsCache[existingIndex] = {
      ...pendingDeletionsCache[existingIndex],
      deletedAt: now,
    };
  } else {
    pendingDeletionsCache.push({
      id,
      table,
      deletedAt: now,
      attempts: 0,
    });
  }

  try {
    await safeStorage.setItem(
      PENDING_DELETIONS_STORAGE_KEY,
      JSON.stringify(pendingDeletionsCache)
    );
  } catch {
    // safeStorage maneja fallback a memoria internamente
  }

  // Disparar en segundo plano flushPendingDeletions sin bloquear al llamador
  flushPendingDeletions().catch(() => {});
};

export const flushPendingDeletions = async (
  userId?: string
): Promise<{ success: boolean; processed: number }> => {
  if (isFlushingDeletions) {
    hasPendingFlushRequest = true;
    return { success: false, processed: 0 };
  }

  isFlushingDeletions = true;
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, processed: 0 };
      }
      targetUserId = data.session.user.id;
    }

    const currentDeletions = await getPendingDeletions();
    if (currentDeletions.length === 0) {
      return { success: true, processed: 0 };
    }

    const successfulKeys = new Set<string>();
    const failedAttemptMap = new Map<string, number>();
    let processedCount = 0;

    for (const item of currentDeletions) {
      const itemKey = `${item.table}:${toDeterministicUuid(item.id)}`;
      try {
        const uuid = toDeterministicUuid(item.id);
        const { error } = await supabase
          .from(item.table)
          .update({ deleted_at: item.deletedAt })
          .eq('id', uuid)
          .eq('user_id', targetUserId);

        if (error) {
          failedAttemptMap.set(itemKey, item.attempts + 1);
        } else {
          successfulKeys.add(itemKey);
          processedCount++;
        }
      } catch {
        failedAttemptMap.set(itemKey, item.attempts + 1);
      }
    }

    // Actualizar la caché conservando cualquier nuevo elemento encolado durante el flush
    pendingDeletionsCache = pendingDeletionsCache
      .filter((item) => !successfulKeys.has(`${item.table}:${toDeterministicUuid(item.id)}`))
      .map((item) => {
        const itemKey = `${item.table}:${toDeterministicUuid(item.id)}`;
        const updatedAttempts = failedAttemptMap.get(itemKey);
        return updatedAttempts !== undefined ? { ...item, attempts: updatedAttempts } : item;
      });

    try {
      await safeStorage.setItem(
        PENDING_DELETIONS_STORAGE_KEY,
        JSON.stringify(pendingDeletionsCache)
      );
    } catch {
      // safeStorage maneja fallback a memoria internamente
    }

    return { success: true, processed: processedCount };
  } catch {
    return { success: false, processed: 0 };
  } finally {
    isFlushingDeletions = false;
    if (hasPendingFlushRequest) {
      hasPendingFlushRequest = false;
      setTimeout(() => {
        flushPendingDeletions(userId).catch(() => {});
      }, 100);
    }
  }
};

export const PENDING_CHARGE_MUTATIONS_STORAGE_KEY = 'controlfynz-pending-charge-mutations-v1';

let chargeMutationSeq = 0;
let pendingChargeMutationsCache: Record<string, number> = {};
let isPendingChargeMutationsLoaded = false;
let pendingChargeMutationsLoadPromise: Promise<Record<string, number>> | null = null;
let isApplyingRemoteChargesUpdate = false;
let lastKnownChargesSnapshot = new Map<string, string>();

const normalizeChargeKey = (id: string): string => toDeterministicUuid(id);

const serializeChargeSnapshot = (charge: ThirdPartyCardCharge): string =>
  JSON.stringify({
    personName: charge.personName,
    personId: charge.personId ?? null,
    cardName: charge.cardName,
    cardId: charge.cardId ?? null,
    concept: charge.concept,
    amount: charge.amount,
    totalAmount: charge.totalAmount,
    remainingAmount: charge.remainingAmount,
    installmentsCount: charge.installmentsCount,
    monthlyInstallmentAmount: charge.monthlyInstallmentAmount,
    currentPeriodPaidAmount: charge.currentPeriodPaidAmount,
    paidInstallmentsCount: charge.paidInstallmentsCount,
    initialPaidInstallments: charge.initialPaidInstallments ?? 0,
    isPreexisting: Boolean(charge.isPreexisting),
    lastPaymentDate: charge.lastPaymentDate ?? null,
    date: charge.date,
    settled: Boolean(charge.settled),
    settledAt: charge.settledAt ?? null,
  });

const refreshChargeSnapshotFromStore = (): void => {
  const charges = useDebtsStore.getState().thirdPartyCharges || [];
  const nextSnapshot = new Map<string, string>();
  for (const charge of charges) {
    nextSnapshot.set(normalizeChargeKey(charge.id), serializeChargeSnapshot(charge));
  }
  lastKnownChargesSnapshot = nextSnapshot;
};

const persistPendingChargeMutations = async (): Promise<void> => {
  try {
    await safeStorage.setItem(
      PENDING_CHARGE_MUTATIONS_STORAGE_KEY,
      JSON.stringify(pendingChargeMutationsCache)
    );
  } catch {
    // safeStorage maneja fallback a memoria internamente
  }
};

export const getPendingChargeMutations = async (): Promise<Record<string, number>> => {
  if (isPendingChargeMutationsLoaded) {
    return { ...pendingChargeMutationsCache };
  }
  if (pendingChargeMutationsLoadPromise) {
    return pendingChargeMutationsLoadPromise;
  }

  pendingChargeMutationsLoadPromise = (async (): Promise<Record<string, number>> => {
    try {
      const raw = await safeStorage.getItem(PENDING_CHARGE_MUTATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number> | null;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const loaded: Record<string, number> = {};
          let maxLoadedSeq = chargeMutationSeq;
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
              const normalizedId = normalizeChargeKey(key);
              const seq = Math.max(loaded[normalizedId] ?? 0, value);
              loaded[normalizedId] = seq;
              if (seq > maxLoadedSeq) {
                maxLoadedSeq = seq;
              }
            }
          }

          let hasEarlyMemoryMutations = false;
          for (const [memKey] of Object.entries(pendingChargeMutationsCache)) {
            const normalizedId = normalizeChargeKey(memKey);
            maxLoadedSeq += 1;
            loaded[normalizedId] = maxLoadedSeq;
            hasEarlyMemoryMutations = true;
          }

          chargeMutationSeq = Math.max(chargeMutationSeq, maxLoadedSeq);
          pendingChargeMutationsCache = loaded;
          isPendingChargeMutationsLoaded = true;
          if (hasEarlyMemoryMutations) {
            await persistPendingChargeMutations();
          }
          return { ...pendingChargeMutationsCache };
        }
      }
    } catch {
      // Fallback a caché en memoria
    }
    isPendingChargeMutationsLoaded = true;
    return { ...pendingChargeMutationsCache };
  })();

  try {
    return await pendingChargeMutationsLoadPromise;
  } finally {
    pendingChargeMutationsLoadPromise = null;
  }
};

export const getPendingChargeMutationIdSet = (): Set<string> => {
  const set = new Set<string>();
  for (const key of Object.keys(pendingChargeMutationsCache)) {
    set.add(key);
  }
  return set;
};

export const hasPendingChargeMutations = (): boolean =>
  Object.keys(pendingChargeMutationsCache).length > 0;

const hasPendingChargeMutation = (id: string): boolean => {
  const key = normalizeChargeKey(id);
  return (pendingChargeMutationsCache[key] ?? 0) > 0;
};

const detectAndRecordPendingChargeMutations = (): boolean => {
  if (isApplyingRemoteChargesUpdate) {
    return false;
  }

  const currentCharges = useDebtsStore.getState().thirdPartyCharges || [];
  const pendingDeletions = getPendingDeletionIdSet('third_party_card_charges');
  const currentKeys = new Set<string>();
  let changed = false;

  for (const charge of currentCharges) {
    const key = normalizeChargeKey(charge.id);
    currentKeys.add(key);

    if (pendingDeletions.has(charge.id) || pendingDeletions.has(key)) {
      if (pendingChargeMutationsCache[key] !== undefined) {
        delete pendingChargeMutationsCache[key];
        changed = true;
      }
      lastKnownChargesSnapshot.delete(key);
      continue;
    }

    const serialized = serializeChargeSnapshot(charge);
    const prevSerialized = lastKnownChargesSnapshot.get(key);
    if (prevSerialized !== serialized) {
      chargeMutationSeq += 1;
      pendingChargeMutationsCache[key] = chargeMutationSeq;
      lastKnownChargesSnapshot.set(key, serialized);
      changed = true;
    }
  }

  for (const prevKey of Array.from(lastKnownChargesSnapshot.keys())) {
    if (!currentKeys.has(prevKey)) {
      lastKnownChargesSnapshot.delete(prevKey);
      if (pendingChargeMutationsCache[prevKey] !== undefined) {
        delete pendingChargeMutationsCache[prevKey];
        changed = true;
      }
    }
  }

  if (!useDebtsStore.persist || useDebtsStore.persist.hasHydrated()) {
    for (const pendingKey of Object.keys(pendingChargeMutationsCache)) {
      if (!currentKeys.has(pendingKey)) {
        delete pendingChargeMutationsCache[pendingKey];
        changed = true;
      }
    }
  }

  if (changed) {
    void persistPendingChargeMutations();
  }

  return changed;
};

export type SyncResult = {
  success: boolean;
  offline?: boolean;
  error?: string;
  syncedAt?: string;
  push?: SyncResult;
  pull?: SyncResult;
};

const mergeById = <T extends { id: string }>(
  local: T[],
  remote: T[],
  protectedIds?: Set<string>
): T[] => {
  const map = new Map<string, T>();
  for (const item of local) {
    map.set(toDeterministicUuid(item.id), item);
  }
  for (const item of remote) {
    const uuid = toDeterministicUuid(item.id);
    if (protectedIds && protectedIds.has(uuid) && map.has(uuid)) {
      continue;
    }
    map.set(uuid, item);
  }
  const result = Array.from(map.values());

  // Si los elementos corresponden a transacciones, ordenar cronológicamente descendente
  if (result.length > 0 && 'date' in result[0] && 'category' in result[0]) {
    return result.sort((a, b) => {
      const itemA = a as { date?: string | number | Date; createdAt?: string | number | Date };
      const itemB = b as { date?: string | number | Date; createdAt?: string | number | Date };
      const timeA = new Date(itemA.date || itemA.createdAt || 0).getTime();
      const timeB = new Date(itemB.date || itemB.createdAt || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }

  return result;
};

let isSyncInProgress = false;
let isPullInProgress = false;
let isPushInProgress = false;
let hasPendingPushRequest = false;
let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncTimestamp: string | null = null;

export const getLastSyncTime = (): string | null => lastSyncTimestamp;

export type SyncStateListener = (isSyncing: boolean) => void;
let isInitialSyncActive = false;
const syncListeners = new Set<SyncStateListener>();

export const notifySyncListeners = (status: boolean): void => {
  isInitialSyncActive = status;
  syncListeners.forEach((listener) => listener(status));
};

export const subscribeToInitialSync = (listener: SyncStateListener): (() => void) => {
  syncListeners.add(listener);
  listener(isInitialSyncActive);
  return () => {
    syncListeners.delete(listener);
  };
};

export const isInitialSyncing = (): boolean => isInitialSyncActive;

export const isSyncing = (): boolean =>
  isSyncInProgress || isPullInProgress || isPushInProgress;

export type SyncStatus = {
  isSyncing: boolean;
  lastSyncTime: string | null;
};
export type SyncStatusListener = (status: SyncStatus) => void;
const syncStatusListeners = new Set<SyncStatusListener>();

export const notifySyncStatusListeners = (): void => {
  const currentStatus: SyncStatus = {
    isSyncing: isSyncing(),
    lastSyncTime: lastSyncTimestamp,
  };
  syncStatusListeners.forEach((listener) => listener(currentStatus));
};

export const subscribeToSyncStatus = (listener: SyncStatusListener): (() => void) => {
  syncStatusListeners.add(listener);
  listener({
    isSyncing: isSyncing(),
    lastSyncTime: lastSyncTimestamp,
  });
  return () => {
    syncStatusListeners.delete(listener);
  };
};

export const hasPendingBackgroundPush = (): boolean =>
  pushDebounceTimer !== null || hasPendingPushRequest;

export const syncPush = async (userId?: string): Promise<SyncResult> => {
  if (isPushInProgress) {
    hasPendingPushRequest = true;
    return { success: false, offline: true, error: 'Sincronización push ya en curso' };
  }
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = null;
  }
  isPushInProgress = true;
  notifySyncStatusListeners();
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, offline: true, error: 'Usuario no autenticado' };
      }
      targetUserId = data.session.user.id;
    }

    // Escudo de salida: procesar y vaciar prioritariamente los borrados pendientes antes de push
    await flushPendingDeletions(targetUserId);
    await getPendingChargeMutations();
    detectAndRecordPendingChargeMutations();

    const { banks, cards } = useCardsStore.getState();
    const { people, personalDebts, friendLoans } = useDebtsStore.getState();
    const tableErrors: string[] = [];

    // 1. Bancos
    const pendingBankIds = getPendingDeletionIdSet('banks');
    const filteredBanks = (banks || []).filter(
      (b) => !pendingBankIds.has(b.id) && !pendingBankIds.has(toDeterministicUuid(b.id))
    );
    const bankRows: BankRow[] = filteredBanks.map((b) => bankToRow(b, targetUserId));
    const validBankIds = new Set<string>(bankRows.map((b) => b.id));
    if (bankRows.length > 0) {
      try {
        const { error } = await supabase.from('banks').upsert(bankRows, { onConflict: 'id' });
        if (error) {
          tableErrors.push(`banks: ${error.message}`);
          console.warn('[SyncPush] Error en banks (continuando con el resto):', error.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tableErrors.push(`banks: ${msg}`);
        console.warn('[SyncPush] Excepción en banks (continuando con el resto):', msg);
      }
    }

    // 2. Tarjetas de crédito
    const pendingCardIds = getPendingDeletionIdSet('credit_cards');
    const filteredCards = (cards || []).filter(
      (c) => !pendingCardIds.has(c.id) && !pendingCardIds.has(toDeterministicUuid(c.id))
    );
    const cardRows: CreditCardRow[] = filteredCards.map((c) => {
      const matchingBank = (banks || []).find(
        (b) => b.name.toLowerCase() === c.bankName.toLowerCase()
      );
      return cardToRow(c, targetUserId, matchingBank?.id);
    });
    const validCardIds = new Set<string>(cardRows.map((c) => c.id));
    if (cardRows.length > 0) {
      try {
        const { error } = await supabase
          .from('credit_cards')
          .upsert(cardRows, { onConflict: 'id' });
        if (error) {
          tableErrors.push(`credit_cards: ${error.message}`);
          console.warn('[SyncPush] Error en credit_cards (continuando con el resto):', error.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tableErrors.push(`credit_cards: ${msg}`);
        console.warn('[SyncPush] Excepción en credit_cards (continuando con el resto):', msg);
      }
    }

    // 3. Contactos / Personas
    const pendingPeopleIds = getPendingDeletionIdSet('people');
    const filteredPeople = (people || []).filter(
      (p) => !pendingPeopleIds.has(p.id) && !pendingPeopleIds.has(toDeterministicUuid(p.id))
    );
    const peopleRows: PersonRow[] = filteredPeople.map((p) => personToRow(p, targetUserId));
    const validPersonIds = new Set<string>(peopleRows.map((p) => p.id));
    if (peopleRows.length > 0) {
      try {
        const { error } = await supabase.from('people').upsert(peopleRows, { onConflict: 'id' });
        if (error) {
          tableErrors.push(`people: ${error.message}`);
          console.warn('[SyncPush] Error en people (continuando con el resto):', error.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tableErrors.push(`people: ${msg}`);
        console.warn('[SyncPush] Excepción en people (continuando con el resto):', msg);
      }
    }

    // 4. Deudas Personales
    const pendingDebtIds = getPendingDeletionIdSet('personal_debts');
    const filteredDebts = (personalDebts || []).filter(
      (d) => !pendingDebtIds.has(d.id) && !pendingDebtIds.has(toDeterministicUuid(d.id))
    );
    const debtRows: PersonalDebtRow[] = filteredDebts.map((d) =>
      debtToRow(d, targetUserId, validBankIds, validCardIds)
    );
    const validDebtIds = new Set<string>(debtRows.map((d) => d.id));
    if (debtRows.length > 0) {
      try {
        const { error } = await supabase
          .from('personal_debts')
          .upsert(debtRows, { onConflict: 'id' });
        if (error) {
          tableErrors.push(`personal_debts: ${error.message}`);
          console.warn('[SyncPush] Error en personal_debts (continuando con el resto):', error.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tableErrors.push(`personal_debts: ${msg}`);
        console.warn('[SyncPush] Excepción en personal_debts (continuando con el resto):', msg);
      }
    }

    // 5. Préstamos a Amigos
    const pendingLoanIds = getPendingDeletionIdSet('friend_loans');
    const filteredLoans = (friendLoans || []).filter(
      (l) => !pendingLoanIds.has(l.id) && !pendingLoanIds.has(toDeterministicUuid(l.id))
    );
    const loanRows: FriendLoanRow[] = filteredLoans.map((l) =>
      loanToRow(l, targetUserId, validPersonIds)
    );
    const validLoanIds = new Set<string>(loanRows.map((l) => l.id));
    if (loanRows.length > 0) {
      try {
        const { error } = await supabase
          .from('friend_loans')
          .upsert(loanRows, { onConflict: 'id' });
        if (error) {
          tableErrors.push(`friend_loans: ${error.message}`);
          console.warn('[SyncPush] Error en friend_loans (continuando con el resto):', error.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tableErrors.push(`friend_loans: ${msg}`);
        console.warn('[SyncPush] Excepción en friend_loans (continuando con el resto):', msg);
      }
    }

    // 6. Compras de Terceros (capturar versión monotónica pushSeq antes de enviar a red)
    const latestThirdPartyCharges = useDebtsStore.getState().thirdPartyCharges;
    const pushSeq = chargeMutationSeq;
    const pendingChargeIds = getPendingDeletionIdSet('third_party_card_charges');
    const filteredCharges = (latestThirdPartyCharges || []).filter(
      (tc) => !pendingChargeIds.has(tc.id) && !pendingChargeIds.has(toDeterministicUuid(tc.id))
    );
    const chargeRows: ThirdPartyCardChargeRow[] = filteredCharges.map((tc) =>
      chargeToRow(tc, targetUserId, validPersonIds, validCardIds)
    );
    const validChargeIds = new Set<string>(chargeRows.map((c) => c.id));
    const pushedChargeKeys = chargeRows.map((c) => normalizeChargeKey(c.id));
    if (chargeRows.length > 0) {
      try {
        const { error } = await supabase
          .from('third_party_card_charges')
          .upsert(chargeRows, { onConflict: 'id' });
        if (error) {
          tableErrors.push(`third_party_card_charges: ${error.message}`);
          console.warn(
            '[SyncPush] Error en third_party_card_charges (continuando con transacciones):',
            error.message
          );
        } else {
          let clearedAny = false;
          let hasNewerChargeMutations = false;
          for (const key of pushedChargeKeys) {
            const pendingSeq = pendingChargeMutationsCache[key];
            if (pendingSeq !== undefined) {
              if (pendingSeq <= pushSeq) {
                delete pendingChargeMutationsCache[key];
                clearedAny = true;
              } else {
                hasNewerChargeMutations = true;
              }
            }
          }
          for (const seq of Object.values(pendingChargeMutationsCache)) {
            if (seq > pushSeq) {
              hasNewerChargeMutations = true;
              break;
            }
          }
          if (clearedAny) {
            await persistPendingChargeMutations();
          }
          if (hasNewerChargeMutations) {
            hasPendingPushRequest = true;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tableErrors.push(`third_party_card_charges: ${msg}`);
        console.warn(
          '[SyncPush] Excepción en third_party_card_charges (continuando con transacciones):',
          msg
        );
      }
    }

    // 7. Transacciones del Libro Diario
    const latestTransactions = useTransactionsStore.getState().transactions;
    const pendingTxIds = getPendingDeletionIdSet('transactions');
    const filteredTx = (latestTransactions || []).filter(
      (t) => !pendingTxIds.has(t.id) && !pendingTxIds.has(toDeterministicUuid(t.id))
    );
    const txRows: TransactionRow[] = filteredTx.map((t) =>
      transactionToRow(t, targetUserId, {
        cardIds: validCardIds,
        bankIds: validBankIds,
        debtIds: validDebtIds,
        loanIds: validLoanIds,
        chargeIds: validChargeIds,
        personIds: validPersonIds,
      })
    );
    if (txRows.length > 0) {
      try {
        const { error } = await supabase
          .from('transactions')
          .upsert(txRows, { onConflict: 'id' });
        if (error) {
          tableErrors.push(`transactions: ${error.message}`);
          console.warn('[SyncPush] Error en transactions:', error.message);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tableErrors.push(`transactions: ${msg}`);
        console.warn('[SyncPush] Excepción en transactions:', msg);
      }
    }

    if (tableErrors.length > 0) {
      return { success: false, offline: true, error: tableErrors.join(' | ') };
    }

    lastSyncTimestamp = new Date().toISOString();
    return { success: true, syncedAt: lastSyncTimestamp };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error de conexión o red durante syncPush';
    return { success: false, offline: true, error: errMessage };
  } finally {
    isPushInProgress = false;
    notifySyncStatusListeners();
    if (hasPendingPushRequest) {
      hasPendingPushRequest = false;
      setTimeout(() => {
        syncPush(userId).catch(() => {});
      }, 100);
    }
  }
};

export const syncPull = async (userId?: string): Promise<SyncResult> => {
  if (isPullInProgress) {
    return { success: false, offline: true, error: 'Sincronización pull ya en curso' };
  }
  isPullInProgress = true;
  notifySyncStatusListeners();
  try {
    // Verificar que la sesión de Supabase Auth esté activa y con su token JWT antes de consultar tablas con RLS
    let {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      // Reintentar brevemente por si el cliente de Supabase aún está inicializando la sesión desde el storage
      await new Promise((resolve) => setTimeout(resolve, 300));
      const retryResult = await supabase.auth.getSession();
      session = retryResult.data.session;
    }

    if (!session || !session.user?.id) {
      return { success: false, offline: true, error: 'Sesión no activa en Supabase Auth' };
    }

    const targetUserId = userId || session.user.id;
    if (userId && userId !== session.user.id) {
      return {
        success: false,
        offline: true,
        error: 'Sesión no coincide con el usuario solicitado',
      };
    }

    // Cargar cola de borrados pendientes y mutaciones pendientes de cargos para el escudo anti-zombis de entrada
    await getPendingDeletions();
    await getPendingChargeMutations();

    // 1. Pull bancos
    const { data: banksData, error: banksErr } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (banksErr) {
      return { success: false, offline: true, error: banksErr.message };
    }
    const { data: deletedBanksData } = await supabase
      .from('banks')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 2. Pull tarjetas
    const { data: cardsData, error: cardsErr } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (cardsErr) {
      return { success: false, offline: true, error: cardsErr.message };
    }
    const { data: deletedCardsData } = await supabase
      .from('credit_cards')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 3. Pull personas
    const { data: peopleData, error: peopleErr } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (peopleErr) {
      return { success: false, offline: true, error: peopleErr.message };
    }
    const { data: deletedPeopleData } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 4. Pull deudas personales
    const { data: debtsData, error: debtsErr } = await supabase
      .from('personal_debts')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (debtsErr) {
      return { success: false, offline: true, error: debtsErr.message };
    }
    const { data: deletedDebtsData } = await supabase
      .from('personal_debts')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 5. Pull pr??stamos a amigos
    const { data: loansData, error: loansErr } = await supabase
      .from('friend_loans')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (loansErr) {
      return { success: false, offline: true, error: loansErr.message };
    }
    const { data: deletedLoansData } = await supabase
      .from('friend_loans')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 6. Pull compras de terceros
    const { data: chargesData, error: chargesErr } = await supabase
      .from('third_party_card_charges')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (chargesErr) {
      return { success: false, offline: true, error: chargesErr.message };
    }
    const { data: deletedChargesData } = await supabase
      .from('third_party_card_charges')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 7. Pull transacciones
    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null)
      .order('date', { ascending: false });
    if (txErr) {
      return { success: false, offline: true, error: txErr.message };
    }
    const { data: deletedTxData } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 8. Pull configuración de usuario (user_settings)
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', targetUserId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!settingsError && settingsData && settingsData.currency) {
        useSettingsStore.getState().setCurrency(settingsData.currency);
        if (settingsData.privacy_mode !== undefined) {
          useSettingsStore.getState().setPrivacyMode(Boolean(settingsData.privacy_mode));
        }
      }
    } catch (err) {
      console.warn('[SyncService] Error fetching user_settings in syncPull:', err);
    }

    // Aplicar actualizaciones a Zustand con Escudo Anti-Zombis (filtrar bajas pendientes)
    if (banksData && banksData.length > 0) {
      const pendingBankIds = getPendingDeletionIdSet('banks');
      const filteredBanks = (banksData as BankRow[]).filter(
        (row) => !pendingBankIds.has(row.id) && !pendingBankIds.has(toDeterministicUuid(row.id))
      );
      const pulledBanks = filteredBanks.map(rowToBank);
      const currentBanks = useCardsStore.getState().banks;
      useCardsStore.setState({ banks: mergeById(currentBanks, pulledBanks) });
    }
    if (deletedBanksData && deletedBanksData.length > 0) {
      const deletedBankIdSet = new Set<string>();
      for (const row of deletedBanksData as { id: string }[]) {
        deletedBankIdSet.add(row.id);
        deletedBankIdSet.add(toDeterministicUuid(row.id));
      }
      const currentBanks = useCardsStore.getState().banks;
      const prunedBanks = currentBanks.filter(
        (b) => !deletedBankIdSet.has(b.id) && !deletedBankIdSet.has(toDeterministicUuid(b.id))
      );
      if (prunedBanks.length !== currentBanks.length) {
        useCardsStore.setState({ banks: prunedBanks });
      }
    }

    if (cardsData && cardsData.length > 0) {
      const pendingCardIds = getPendingDeletionIdSet('credit_cards');
      const filteredCards = (cardsData as CreditCardRow[]).filter(
        (row) => !pendingCardIds.has(row.id) && !pendingCardIds.has(toDeterministicUuid(row.id))
      );
      const pulledCards = filteredCards.map(rowToCard);
      const currentCards = useCardsStore.getState().cards;
      useCardsStore.setState({ cards: mergeById(currentCards, pulledCards) });
    }
    if (deletedCardsData && deletedCardsData.length > 0) {
      const deletedCardIdSet = new Set<string>();
      for (const row of deletedCardsData as { id: string }[]) {
        deletedCardIdSet.add(row.id);
        deletedCardIdSet.add(toDeterministicUuid(row.id));
      }
      const currentCards = useCardsStore.getState().cards;
      const prunedCards = currentCards.filter(
        (c) => !deletedCardIdSet.has(c.id) && !deletedCardIdSet.has(toDeterministicUuid(c.id))
      );
      if (prunedCards.length !== currentCards.length) {
        useCardsStore.setState({ cards: prunedCards });
      }
    }

    const debtsStoreUpdates: Partial<ReturnType<typeof useDebtsStore.getState>> = {};

    if (peopleData && peopleData.length > 0) {
      const pendingPeopleIds = getPendingDeletionIdSet('people');
      const filteredPeople = (peopleData as PersonRow[]).filter(
        (row) => !pendingPeopleIds.has(row.id) && !pendingPeopleIds.has(toDeterministicUuid(row.id))
      );
      const pulledPeople = filteredPeople.map(rowToPerson);
      const currentPeople = useDebtsStore.getState().people;
      debtsStoreUpdates.people = mergeById(currentPeople, pulledPeople);
    }
    if (deletedPeopleData && deletedPeopleData.length > 0) {
      const deletedPeopleIdSet = new Set<string>();
      for (const row of deletedPeopleData as { id: string }[]) {
        deletedPeopleIdSet.add(row.id);
        deletedPeopleIdSet.add(toDeterministicUuid(row.id));
      }
      const basePeople = debtsStoreUpdates.people ?? useDebtsStore.getState().people;
      const prunedPeople = basePeople.filter(
        (p) => !deletedPeopleIdSet.has(p.id) && !deletedPeopleIdSet.has(toDeterministicUuid(p.id))
      );
      if (prunedPeople.length !== basePeople.length) {
        debtsStoreUpdates.people = prunedPeople;
      }
    }

    if (debtsData && debtsData.length > 0) {
      const pendingDebtIds = getPendingDeletionIdSet('personal_debts');
      const filteredDebts = (debtsData as PersonalDebtRow[]).filter(
        (row) => !pendingDebtIds.has(row.id) && !pendingDebtIds.has(toDeterministicUuid(row.id))
      );
      const pulledDebts = filteredDebts.map(rowToDebt);
      const currentDebts = useDebtsStore.getState().personalDebts;
      debtsStoreUpdates.personalDebts = mergeById(currentDebts, pulledDebts);
    }
    if (deletedDebtsData && deletedDebtsData.length > 0) {
      const deletedDebtIdSet = new Set<string>();
      for (const row of deletedDebtsData as { id: string }[]) {
        deletedDebtIdSet.add(row.id);
        deletedDebtIdSet.add(toDeterministicUuid(row.id));
      }
      const baseDebts = debtsStoreUpdates.personalDebts ?? useDebtsStore.getState().personalDebts;
      const prunedDebts = baseDebts.filter(
        (d) => !deletedDebtIdSet.has(d.id) && !deletedDebtIdSet.has(toDeterministicUuid(d.id))
      );
      if (prunedDebts.length !== baseDebts.length) {
        debtsStoreUpdates.personalDebts = prunedDebts;
      }
    }

    if (loansData && loansData.length > 0) {
      const pendingLoanIds = getPendingDeletionIdSet('friend_loans');
      const filteredLoans = (loansData as FriendLoanRow[]).filter(
        (row) => !pendingLoanIds.has(row.id) && !pendingLoanIds.has(toDeterministicUuid(row.id))
      );
      const pulledLoans = filteredLoans.map(rowToLoan);
      const currentLoans = useDebtsStore.getState().friendLoans;
      debtsStoreUpdates.friendLoans = mergeById(currentLoans, pulledLoans);
    }
    if (deletedLoansData && deletedLoansData.length > 0) {
      const deletedLoanIdSet = new Set<string>();
      for (const row of deletedLoansData as { id: string }[]) {
        deletedLoanIdSet.add(row.id);
        deletedLoanIdSet.add(toDeterministicUuid(row.id));
      }
      const baseLoans = debtsStoreUpdates.friendLoans ?? useDebtsStore.getState().friendLoans;
      const prunedLoans = baseLoans.filter(
        (l) => !deletedLoanIdSet.has(l.id) && !deletedLoanIdSet.has(toDeterministicUuid(l.id))
      );
      if (prunedLoans.length !== baseLoans.length) {
        debtsStoreUpdates.friendLoans = prunedLoans;
      }
    }

    const pendingChargeMutationIds = getPendingChargeMutationIdSet();

    if (chargesData && chargesData.length > 0) {
      const pendingChargeIds = getPendingDeletionIdSet('third_party_card_charges');
      const filteredCharges = (chargesData as ThirdPartyCardChargeRow[]).filter(
        (row) =>
          !pendingChargeIds.has(row.id) &&
          !pendingChargeIds.has(toDeterministicUuid(row.id)) &&
          !pendingChargeMutationIds.has(toDeterministicUuid(row.id))
      );
      const pulledCharges = filteredCharges.map(rowToCharge);
      const currentCharges = useDebtsStore.getState().thirdPartyCharges;
      debtsStoreUpdates.thirdPartyCharges = mergeById(
        currentCharges,
        pulledCharges,
        pendingChargeMutationIds
      );
    }
    if (deletedChargesData && deletedChargesData.length > 0) {
      const deletedChargeIdSet = new Set<string>();
      for (const row of deletedChargesData as { id: string }[]) {
        deletedChargeIdSet.add(row.id);
        deletedChargeIdSet.add(toDeterministicUuid(row.id));
      }
      const baseCharges = debtsStoreUpdates.thirdPartyCharges ?? useDebtsStore.getState().thirdPartyCharges;
      const prunedCharges = baseCharges.filter(
        (c) =>
          (!deletedChargeIdSet.has(c.id) && !deletedChargeIdSet.has(toDeterministicUuid(c.id))) ||
          pendingChargeMutationIds.has(toDeterministicUuid(c.id))
      );
      if (prunedCharges.length !== baseCharges.length) {
        debtsStoreUpdates.thirdPartyCharges = prunedCharges;
      }
    }

    if (Object.keys(debtsStoreUpdates).length > 0) {
      isApplyingRemoteChargesUpdate = true;
      try {
        useDebtsStore.setState(debtsStoreUpdates);
      } finally {
        isApplyingRemoteChargesUpdate = false;
      }
      refreshChargeSnapshotFromStore();
    }

    if (txData && txData.length > 0) {
      const pendingTxIds = getPendingDeletionIdSet('transactions');
      const filteredTx = (txData as TransactionRow[]).filter(
        (row) => !pendingTxIds.has(row.id) && !pendingTxIds.has(toDeterministicUuid(row.id))
      );
      const pulledTx = filteredTx.map(rowToTransaction);
      const currentTx = useTransactionsStore.getState().transactions;
      useTransactionsStore.setState({ transactions: mergeById(currentTx, pulledTx) });
    }
    if (deletedTxData && deletedTxData.length > 0) {
      const deletedTxIdSet = new Set<string>();
      for (const row of deletedTxData as { id: string }[]) {
        deletedTxIdSet.add(row.id);
        deletedTxIdSet.add(toDeterministicUuid(row.id));
      }
      const currentTx = useTransactionsStore.getState().transactions;
      const prunedTx = currentTx.filter(
        (t) => !deletedTxIdSet.has(t.id) && !deletedTxIdSet.has(toDeterministicUuid(t.id))
      );
      if (prunedTx.length !== currentTx.length) {
        useTransactionsStore.setState({ transactions: prunedTx });
      }
    }

    if (!hasPendingChargeMutations()) {
      useDebtsStore
        .getState()
        .reconcileThirdPartyCurrentPeriod(useTransactionsStore.getState().transactions, new Date());
    }

    lastSyncTimestamp = new Date().toISOString();
    return { success: true, syncedAt: lastSyncTimestamp };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error de conexión o red durante syncPull';
    return { success: false, offline: true, error: errMessage };
  } finally {
    isPullInProgress = false;
    notifySyncStatusListeners();
  }
};

export const syncAll = async (
  userId?: string,
  options?: { silent?: boolean }
): Promise<SyncResult> => {
  if (isSyncInProgress) {
    return { success: false, offline: true, error: 'Sincronización ya en curso' };
  }

  const isSilent = Boolean(options?.silent);
  isSyncInProgress = true;
  if (!isSilent) {
    notifySyncListeners(true);
  }
  notifySyncStatusListeners();
  const safetyTimeout = setTimeout(() => {
    if (!isSilent) {
      notifySyncListeners(false);
    }
    notifySyncStatusListeners();
  }, 4000);

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, offline: true, error: 'Sin sesión activa' };
      }
      targetUserId = data.session.user.id;
    }

    if (pushDebounceTimer) {
      clearTimeout(pushDebounceTimer);
      pushDebounceTimer = null;
    }

    // Escudo de salida: procesar y vaciar prioritariamente borrados y mutaciones locales pendientes
    await flushPendingDeletions(targetUserId);

    // 1. Push local changes first (evita que un pull pise mutaciones locales pendientes)
    const pushResult = await syncPush(targetUserId);

    // 2. Pull remote changes
    const pullResult = await syncPull(targetUserId);

    const success = pushResult.success && pullResult.success;
    const error = pushResult.error || pullResult.error;

    if (success) {
      lastSyncTimestamp = new Date().toISOString();
    }

    return {
      success,
      push: pushResult,
      pull: pullResult,
      error,
      offline: pushResult.offline || pullResult.offline,
      syncedAt: lastSyncTimestamp || pushResult.syncedAt || pullResult.syncedAt,
    };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error imprevisto durante syncAll';
    return { success: false, offline: true, error: errMessage };
  } finally {
    clearTimeout(safetyTimeout);
    if (!isSilent) {
      notifySyncListeners(false);
    }
    isSyncInProgress = false;
    notifySyncStatusListeners();
  }
};

export const syncPushUserSettings = async (
  userId: string,
  currency: CurrencyCode
): Promise<void> => {
  try {
    const privacyMode = useSettingsStore.getState().privacyMode;
    const biometricsEnabled = useSettingsStore.getState().biometricsEnabled;
    const row = settingsToRow(userId, currency, privacyMode, biometricsEnabled);
    const { error } = await supabase
      .from('user_settings')
      .upsert(row, { onConflict: 'user_id' });
    if (error) {
      console.warn('[SyncService] Failed to upsert user_settings:', error.message);
    }
  } catch (err) {
    console.warn('[SyncService] Error in syncPushUserSettings:', err);
  }
};

export const deleteRemoteRecord = async (
  table: SyncTable,
  localId: string
): Promise<void> => {
  try {
    await enqueuePendingDeletion(table, localId);
    const targetUuid = toDeterministicUuid(localId);
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;
    if (currentUserId) {
      let query = supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', targetUuid);
      if ((table as string) !== 'profiles') {
        query = query.eq('user_id', currentUserId);
      }
      await query;
    }
  } catch {
    // Silencioso ante fallas de persistencia o indisponibilidad offline
  }
};

export const triggerBackgroundPush = (): void => {
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
  }
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    syncPush().catch(() => {});
  }, 300);
};

let activeRealtimeChannel: RealtimeChannel | null = null;
let activeRealtimeUserId: string | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export const startRealtimeSubscription = (userId?: string): void => {
  const targetUserId = userId || activeRealtimeUserId;
  if (!targetUserId) return;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (
    activeRealtimeUserId === targetUserId &&
    activeRealtimeChannel &&
    (activeRealtimeChannel.state === 'joined' || activeRealtimeChannel.state === 'joining')
  ) {
    return;
  }

  const existingChannels = supabase
    .getChannels()
    .filter((c) => c.topic.includes('user-sync-'));
  for (const ch of existingChannels) {
    try {
      supabase.removeChannel(ch);
    } catch {
      // Silencioso
    }
  }
  activeRealtimeChannel = null;
  activeRealtimeUserId = targetUserId;

  const channel = supabase.channel('user-sync-' + targetUserId);

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const newRow = payload.new as TransactionRow | null;
          const oldRow = payload.old as Partial<TransactionRow> | null;

          if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
            const idToDelete = newRow?.id || oldRow?.id;
            if (idToDelete) {
              const targetUuid = toDeterministicUuid(idToDelete);
              const currentTx = useTransactionsStore.getState().transactions;
              useTransactionsStore.setState({
                transactions: currentTx.filter((t) => toDeterministicUuid(t.id) !== targetUuid),
              });
            }
          } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
            const pendingTxIds = getPendingDeletionIdSet('transactions');
            if (pendingTxIds.has(newRow.id) || pendingTxIds.has(toDeterministicUuid(newRow.id))) {
              return;
            }
            const incomingTx = rowToTransaction(newRow);
            const currentTx = useTransactionsStore.getState().transactions;
            useTransactionsStore.setState({
              transactions: mergeById(currentTx, [incomingTx]),
            });
          }
        } catch (err) {
          console.error('[SyncRealtime] Error procesando evento de transactions:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'personal_debts',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const newRow = payload.new as PersonalDebtRow | null;
          const oldRow = payload.old as Partial<PersonalDebtRow> | null;

          if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
            const idToDelete = newRow?.id || oldRow?.id;
            if (idToDelete) {
              const targetUuid = toDeterministicUuid(idToDelete);
              const currentDebts = useDebtsStore.getState().personalDebts;
              useDebtsStore.setState({
                personalDebts: currentDebts.filter((d) => toDeterministicUuid(d.id) !== targetUuid),
              });
            }
          } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
            const pendingDebtIds = getPendingDeletionIdSet('personal_debts');
            if (pendingDebtIds.has(newRow.id) || pendingDebtIds.has(toDeterministicUuid(newRow.id))) {
              return;
            }
            const incomingDebt = rowToPersonalDebt(newRow);
            const currentDebts = useDebtsStore.getState().personalDebts;
            useDebtsStore.setState({
              personalDebts: mergeById(currentDebts, [incomingDebt]),
            });
          }
        } catch (err) {
          console.error('[SyncRealtime] Error procesando evento de personal_debts:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friend_loans',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const newRow = payload.new as FriendLoanRow | null;
          const oldRow = payload.old as Partial<FriendLoanRow> | null;

          if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
            const idToDelete = newRow?.id || oldRow?.id;
            if (idToDelete) {
              const targetUuid = toDeterministicUuid(idToDelete);
              const currentLoans = useDebtsStore.getState().friendLoans;
              useDebtsStore.setState({
                friendLoans: currentLoans.filter((l) => toDeterministicUuid(l.id) !== targetUuid),
              });
            }
          } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
            const pendingLoanIds = getPendingDeletionIdSet('friend_loans');
            if (pendingLoanIds.has(newRow.id) || pendingLoanIds.has(toDeterministicUuid(newRow.id))) {
              return;
            }
            const incomingLoan = rowToFriendLoan(newRow);
            const currentLoans = useDebtsStore.getState().friendLoans;
            useDebtsStore.setState({
              friendLoans: mergeById(currentLoans, [incomingLoan]),
            });
          }
        } catch (err) {
          console.error('[SyncRealtime] Error procesando evento de friend_loans:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'third_party_card_charges',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const newRow = payload.new as ThirdPartyCardChargeRow | null;
          const oldRow = payload.old as Partial<ThirdPartyCardChargeRow> | null;

          if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
            const idToDelete = newRow?.id || oldRow?.id;
            if (idToDelete) {
              const targetUuid = toDeterministicUuid(idToDelete);
              if (hasPendingChargeMutation(targetUuid)) {
                return;
              }
              const currentCharges = useDebtsStore.getState().thirdPartyCharges;
              isApplyingRemoteChargesUpdate = true;
              try {
                useDebtsStore.setState({
                  thirdPartyCharges: currentCharges.filter((c) => toDeterministicUuid(c.id) !== targetUuid),
                });
              } finally {
                isApplyingRemoteChargesUpdate = false;
              }
              refreshChargeSnapshotFromStore();
            }
          } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
            const pendingChargeIds = getPendingDeletionIdSet('third_party_card_charges');
            if (pendingChargeIds.has(newRow.id) || pendingChargeIds.has(toDeterministicUuid(newRow.id))) {
              return;
            }
            const targetUuid = toDeterministicUuid(newRow.id);
            if (hasPendingChargeMutation(targetUuid)) {
              return;
            }
            const incomingCharge = rowToThirdPartyCharge(newRow);
            const currentCharges = useDebtsStore.getState().thirdPartyCharges;
            isApplyingRemoteChargesUpdate = true;
            try {
              useDebtsStore.setState({
                thirdPartyCharges: mergeById(
                  currentCharges,
                  [incomingCharge],
                  getPendingChargeMutationIdSet()
                ),
              });
            } finally {
              isApplyingRemoteChargesUpdate = false;
            }
            refreshChargeSnapshotFromStore();
          }
        } catch (err) {
          console.error('[SyncRealtime] Error procesando evento de third_party_card_charges:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'people',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const newRow = payload.new as PersonRow | null;
          const oldRow = payload.old as Partial<PersonRow> | null;

          if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
            const idToDelete = newRow?.id || oldRow?.id;
            if (idToDelete) {
              const targetUuid = toDeterministicUuid(idToDelete);
              const currentPeople = useDebtsStore.getState().people;
              useDebtsStore.setState({
                people: currentPeople.filter((p) => toDeterministicUuid(p.id) !== targetUuid),
              });
            }
          } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
            const pendingPeopleIds = getPendingDeletionIdSet('people');
            if (pendingPeopleIds.has(newRow.id) || pendingPeopleIds.has(toDeterministicUuid(newRow.id))) {
              return;
            }
            const incomingPerson = rowToPerson(newRow);
            const currentPeople = useDebtsStore.getState().people;
            useDebtsStore.setState({
              people: mergeById(currentPeople, [incomingPerson]),
            });
          }
        } catch (err) {
          console.error('[SyncRealtime] Error procesando evento de people:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'credit_cards',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const newRow = payload.new as CreditCardRow | null;
          const oldRow = payload.old as Partial<CreditCardRow> | null;

          if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
            const idToDelete = newRow?.id || oldRow?.id;
            if (idToDelete) {
              const targetUuid = toDeterministicUuid(idToDelete);
              const currentCards = useCardsStore.getState().cards;
              useCardsStore.setState({
                cards: currentCards.filter((c) => toDeterministicUuid(c.id) !== targetUuid),
              });
            }
          } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
            const pendingCardIds = getPendingDeletionIdSet('credit_cards');
            if (pendingCardIds.has(newRow.id) || pendingCardIds.has(toDeterministicUuid(newRow.id))) {
              return;
            }
            const incomingCard = rowToCard(newRow);
            const currentCards = useCardsStore.getState().cards;
            useCardsStore.setState({
              cards: mergeById(currentCards, [incomingCard]),
            });
          }
        } catch (err) {
          console.error('[SyncRealtime] Error procesando evento de credit_cards:', err);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'banks',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        try {
          const eventType = payload.eventType;
          const newRow = payload.new as BankRow | null;
          const oldRow = payload.old as Partial<BankRow> | null;

          if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
            const idToDelete = newRow?.id || oldRow?.id;
            if (idToDelete) {
              const targetUuid = toDeterministicUuid(idToDelete);
              const currentBanks = useCardsStore.getState().banks;
              useCardsStore.setState({
                banks: currentBanks.filter((b) => toDeterministicUuid(b.id) !== targetUuid),
              });
            }
          } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
            const pendingBankIds = getPendingDeletionIdSet('banks');
            if (pendingBankIds.has(newRow.id) || pendingBankIds.has(toDeterministicUuid(newRow.id))) {
              return;
            }
            const incomingBank = rowToBank(newRow);
            const currentBanks = useCardsStore.getState().banks;
            useCardsStore.setState({
              banks: mergeById(currentBanks, [incomingBank]),
            });
          }
        } catch (err) {
          console.error('[SyncRealtime] Error procesando evento de banks:', err);
        }
      }
    );

  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      reconnectAttempts = 0;
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      console.warn(`[SyncRealtime] Canal en estado ${status}:`, err);
      activeRealtimeChannel = null;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        try {
          supabase.removeChannel(channel);
        } catch {
          // Ignorar errores al desuscribir
        }
        startRealtimeSubscription(targetUserId);
      }, delay);
    }
  });

  activeRealtimeChannel = channel;
};

export const stopRealtimeSubscription = (): void => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;

  const existingChannels = supabase
    .getChannels()
    .filter((c) => c.topic.includes('user-sync-'));
  for (const ch of existingChannels) {
    try {
      supabase.removeChannel(ch);
    } catch {
      // Silencioso
    }
  }

  activeRealtimeChannel = null;
  activeRealtimeUserId = null;
};

export const purgeLocalSyncState = (): void => {
  stopRealtimeSubscription();
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = null;
  }
  hasPendingPushRequest = false;
  isSyncInProgress = false;
  isPullInProgress = false;
  isPushInProgress = false;
  isInitialSyncActive = false;
  lastSyncTimestamp = null;
  pendingDeletionsCache = [];
  chargeMutationSeq = 0;
  pendingChargeMutationsCache = {};
  isPendingChargeMutationsLoaded = false;
  pendingChargeMutationsLoadPromise = null;
  lastKnownChargesSnapshot.clear();
  try {
    void safeStorage.removeItem(PENDING_DELETIONS_STORAGE_KEY);
    void safeStorage.removeItem(PENDING_CHARGE_MUTATIONS_STORAGE_KEY);
  } catch {
    // Silencioso
  }
  notifySyncStatusListeners();
  notifySyncListeners(false);
};

export const syncService = {
  syncPush,
  syncPull,
  syncAll,
  syncPushUserSettings,
  flushPendingDeletions,
  getPendingDeletions,
  enqueuePendingDeletion,
  getPendingDeletionIdSet,
  getPendingChargeMutations,
  getPendingChargeMutationIdSet,
  hasPendingChargeMutations,
  hasPendingBackgroundPush,
  deleteRemoteRecord,
  triggerBackgroundPush,
  isSyncing,
  isInitialSyncing,
  subscribeToInitialSync,
  getLastSyncTime,
  subscribeToSyncStatus,
  startRealtimeSubscription,
  stopRealtimeSubscription,
  purgeLocalSyncState,
};

setTransactionSyncHandlers({
  onTransactionAdded: (): void => {
    syncService.triggerBackgroundPush();
  },
  onTransactionDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('transactions', id).catch(() => {});
    if (pushDebounceTimer !== null || hasPendingChargeMutations()) {
      if (pushDebounceTimer) {
        clearTimeout(pushDebounceTimer);
        pushDebounceTimer = null;
      }
      void syncPush().catch(() => {});
    }
  },
});

setDebtSyncHandlers({
  onDebtAddedOrUpdated: (): void => {
    detectAndRecordPendingChargeMutations();
    syncService.triggerBackgroundPush();
  },
  onPersonalDebtDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('personal_debts', id).catch(() => {});
  },
  onFriendLoanDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('friend_loans', id).catch(() => {});
  },
  onThirdPartyChargeDeleted: (id: string): void => {
    const key = normalizeChargeKey(id);
    lastKnownChargesSnapshot.delete(key);
    if (pendingChargeMutationsCache[key] !== undefined) {
      delete pendingChargeMutationsCache[key];
      void persistPendingChargeMutations();
    }
    syncService.deleteRemoteRecord('third_party_card_charges', id).catch(() => {});
  },
  onPersonDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('people', id).catch(() => {});
  },
});

setCardSyncHandlers({
  onCardAdded: (): void => {
    syncService.triggerBackgroundPush();
  },
  onCardUpdated: (): void => {
    syncService.triggerBackgroundPush();
  },
  onCardDeleted: (cardId: string): void => {
    syncService.deleteRemoteRecord('credit_cards', cardId).catch(() => {});
  },
  onBankAdded: (): void => {
    syncService.triggerBackgroundPush();
  },
  onBankUpdated: (): void => {
    syncService.triggerBackgroundPush();
  },
  onBankDeleted: (bankId: string): void => {
    syncService.deleteRemoteRecord('banks', bankId).catch(() => {});
  },
});

if (!useDebtsStore.persist || useDebtsStore.persist.hasHydrated()) {
  refreshChargeSnapshotFromStore();
} else {
  useDebtsStore.persist.onFinishHydration?.(() => {
    refreshChargeSnapshotFromStore();
  });
}

useDebtsStore.subscribe((state, prevState) => {
  if (state.thirdPartyCharges !== prevState.thirdPartyCharges) {
    if (useDebtsStore.persist && !useDebtsStore.persist.hasHydrated()) {
      return;
    }
    detectAndRecordPendingChargeMutations();
  }
});

// Carga temprana de colas persistidas para mantener la caché caliente
getPendingDeletions().catch(() => {});
getPendingChargeMutations().catch(() => {});

# Memoria Activa del Proyecto ControlFynz

> **Límite Estricto**: Este archivo mantiene el contexto de trabajo activo y NO debe superar las 100 líneas. Para la bitácora de tareas concluidas, consultar `HISTORY.md` bajo demanda.

## 1. Arquitectura y Stack Base
- **Framework**: Expo SDK 57 (React Native) + Expo Router (`app/` en la raíz).
- **Lenguaje & Tipado**: TypeScript estricto, arrow functions con tipado inline obligatorio (`const Comp = (props: Props): JSX.Element => ...`), cero `any` o `unknown`.
- **Estado y Persistencia**: Zustand con adaptador `safeStorage` (con respaldo resiliente en memoria). Claves activas: `*-storage-v2`.
- **UI & Tema**: Modo oscuro cyberpunk/neón (`#121212`, tarjetas `#1E1E1E`, acento `#00FFA3`, peligro `#FF453A`). Modales interactivos transparentes, nunca diálogos toscos nativos.
- **Multiplataforma**: Paridad iOS (KeyboardOffset 48dp, Safe Area), Android (KeyboardOffset 0dp, Edge-to-edge) y Web/Tauri Desktop (`useIsWide(768)`).
- **Backend / Infra & Sync**: Arquitectura Offline-First con proyección a Supabase (Auth, RLS, PostgreSQL). Sincronización Multi-Dispositivo en `sync-service.ts` y `use-app-hydration.ts`: Pull en hidratación, Focus Sync en Web/Móvil, Supabase Realtime e indicador de estado reactivo.
- **Testing & QA**: Jest 29 + `jest-expo` (~57.0.6). Verificación doble obligatoria (`npm test` 100% pass [121/121] + `npx tsc --noEmit` 0 errores) previo a cerrar cualquier tarea.

## 2. Estado Activo del Sprint y Foco Inmediato
- **Módulos Principales Culminados**:
  - 5 Tabs operativas con paridad móvil y escritorio: Dashboard, Movimientos, Deudas, Estadísticas y Ajustes.
  - Dock flotante centrado en barra de navegación inferior para pantallas de escritorio.
  - Todos los Card Modals adaptados como diálogos flotantes centrados con transparencia real sobre la vista previa.
  - Detalle de Tarjeta (`cards/[id].tsx`) con layout responsivo en 2 columnas para Web/Tauri y motor de proyección multi-período.
  - Pantalla de Detalle de Deudas en `app/(app)/debts/[id].tsx` con trazabilidad y auditoría histórica completa de pasivos propios y préstamos a amigos.
  - Centro de Gestión de Pasivos y Cobros: Préstamos bancarios, préstamos a amigos y Liquidación Mensual de Terceros (Fases 1 y 2).
  - Cobertura de Testing (121/121 tests en verde): Suites en `src/__tests__/` (divisas, ciclos de facturación, amortizaciones, fechas, integración contable).
- **Hitos Recientes Concluidos**:
  - **Logotipos Oficiales y Branding (`[TASK-OFFICIAL-BRAND-LOGOS]`)**: Integración de `LogoMiniaturaFynz` y `LogoFynz` en `assets/images/` (`icon.png`, `splash-icon.png`, `favicon.png`, `android-icon-foreground.png`), calibración en `app.json` e integración en cabecera de `login.tsx`. 121/121 tests y 0 errores TS.
  - **Términos y Política de Privacidad (`[TASK-LEGAL-PRIVACY-AND-TERMS]`)**: Rutas públicas y nativas `app/privacy.tsx` y `app/terms.tsx` (cero venta de datos, RLS, exención financiera bancaria), con accesos en login (`login.tsx`) y Ajustes (`settings-section-list.tsx`). 121/121 tests y 0 errores TS.
  - **Sincronización Offline-First y Realtime Granular (`[TASK-SYNC-PHASE-3-COMPLETE]`)**: `TombstoneQueue` persistida en `safeStorage`, doble escudo anti-zombis, 7 handlers granulares en memoria sobre Supabase Realtime (suprimiendo `triggerDebouncedPull`) y backoff exponencial en WebSockets (`sync-service.ts`, `use-app-hydration.ts`). 121/121 tests y 0 errores TS.
  - **Higiene Total de Dependencias y Código Huérfano (`[TASK-HYGIENE-PHASE-2-COMPLETE]`)**: Eliminación de 5 dependencias en `package.json` y purga completa de los 14 archivos huérfanos de plantilla (`animated-icon.*`, `app-tabs.*`, `external-link`, `hint-row`, `web-badge`, `themed-*`, `use-theme`, `use-color-scheme.*`, `theme.ts`, `global.css`). 121/121 tests y 0 errores TS.
  - **Eliminación Permanente de Cuenta (`[TASK-ACCOUNT-PERMANENT-DELETION]`)**: Implementación de `deleteAccount()` en `auth-store.ts`, `purgeLocalSyncState()` en `sync-service.ts` y diálogo destructivo de doble paso `Alert.alert` en `settings-section-list.tsx` cumpliendo Apple Guideline 5.1.1(v) y Google Play Data Safety. 121/121 tests en verde y 0 errores TS.
  - **Confirmación de Logout, Scroll en Dashboard e Indicador de Sync (`[TASK-POLISH-LOGOUT-SCROLL-SYNC-INDICATOR]`)**: Diálogo `Alert.alert` preventivo en cierre de sesión (`settings-section-list.tsx`), indicador de sync reactivo con `subscribeToSyncStatus` y botón interactivo en Ajustes (`sync-service.ts`), y homologación de `paddingBottom: 110` en Dashboard (`index.tsx`). 121/121 tests y 0 errores TS.
  - **Título Estático de la Pestaña Web (`[TASK-STATIC-WEB-TAB-TITLE]`)**: `<Head><title>ControlFynz</title></Head>` y `document.title = 'ControlFynz'` en `app/_layout.tsx` para fijar el título en Web. 121/121 tests en verde y 0 errores TS.
  - **Ordenamiento Cronológico Estricto de Movimientos (`[TASK-TRANSACTIONS-CHRONOLOGICAL-SORTING]`)**: Orden descendente por timestamp exacto (`t.date || t.createdAt`) en `transactions.tsx`, `index.tsx` ("Últimos Movimientos") y `sync-service.ts`. 121/121 tests y 0 errores TS.
  - **Sincronización Automática Multi-Dispositivo (`[TASK-MULTI-DEVICE-CLOUD-SYNC]`)**: Pull silencioso al hidratar, Focus Sync con cooldown de 6s y suscripción a Supabase Realtime (`user-sync-${userId}`) para replicación instantánea vía WebSockets. 121/121 tests en verde y 0 errores TS.
  - **Pantalla de Detalle y Bitácora de Deudas (`[TASK-DEBT-DETAIL-SCREEN-PHASE-2]`)**: `app/(app)/debts/[id].tsx` con Hero Card Financiero, barra de progreso de cuotas, bitácora cronológica de pagos bancarios vinculados y barra flotante de abonos. 121/121 tests en verde y 0 errores TS.
  - **Calibración de Semáforos en Dashboard (`[TASK-DASHBOARD-URGENCY-CALIBRATION-1B]`)**: Semáforo preventivo en `upcoming-debts-card.tsx` con `getDashboardUrgencyStatus` (`warning` <= 7d dorado `#FFD60A`). 121/121 tests en verde y 0 errores TS.
  - **Integridad Contable en Deudas y Transacciones (`[TASK-DEBTS-ACCOUNTING-INTEGRITY-1A]`)**: Trazabilidad directa mediante `relatedDebtId`/`relatedLoanId` en `new-transaction.tsx` y reseteo de `lastPaymentDate` en reversiones. 121/121 tests en verde y 0 errores TS.
  - **Blindaje de Pagos por Ciclo y Cuotas de Terceros (`[TASK-CARD-CYCLE-PAYMENTS-ISOLATION]`)**: Acotamiento estricto de `card_payment` al ciclo activo con `isDateInCurrentBillingCycle(t.date)` en `computeCardBillingStatement` y facturación de cuota pactada de terceros (`normalQuota`). 121/121 tests en verde y 0 errores TS.
- **Próximo Foco Inmediato**:
  - Continuar con la siguiente etapa de consolidación modular del módulo de deudas o siguientes optimizaciones del backlog.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO bloquear rutas informativas públicas en el Auth Gate (Regla de Rutas Públicas)**: Declarar siempre las rutas legales (`terms`, `privacy`) en `PUBLIC_ROUTES` en `app/_layout.tsx` para permitir su consulta antes del inicio de sesión.
- ❌ **NO registrar eventos Realtime sin purgar canales previos en `supabase.getChannels()` (Regla de Canales Realtime Limpios)**: Siempre remover instancias previas con `supabase.removeChannel()` antes de crear un canal nuevo con el mismo tópico para evitar `cannot add postgres_changes callbacks after subscribe()`.
- ❌ **NO cerrar sesión sin confirmación explícita (Regla de Confirmación de Logout)**: Siempre proteger el cierre de sesión con `Alert.alert` para prevenir purgas accidentales de caché local.
- ❌ **NO usar padding inferior menor a 110dp en scrolls de pestañas principales (Regla de Scroll Padding Homogéneo)**: Todos los contenedores de scroll en las pestañas principales deben mantener `paddingBottom: 110` para librar el TabBar flotante.
- ❌ **NO permitir que el título de la pestaña web muestre rutas internas o parámetros de OAuth (Regla de Título Web Estático)**: Usar `<Head><title>ControlFynz</title></Head>` y `document.title` en el layout raíz (`app/_layout.tsx`) para fijar el título en "ControlFynz".
- ❌ **NO mostrar transacciones sin orden cronológico estricto (Regla de Ordenamiento Cronológico de Movimientos)**: SIEMPRE ordenar transacciones descendentemente por timestamp (`b.date - a.date`) antes de agrupar o hacer `.slice()`.
- ❌ **NO ignorar `'INITIAL_SESSION'` al sincronizar sesiones persistentes (Regla de Sincronización al Recargar)**: Escuchar siempre `'INITIAL_SESSION'` en Supabase auth para disparar `syncAll` al refrescar el navegador (F5).
- ❌ **NO mostrar badge verde "En plazo" en deudas que alertan en el widget del Dashboard (Regla de Semáforos Preventivos en Dashboard)**: Alertas entre 4 y 7 días deben usar nivel `warning` (amarillo/dorado `#FFD60A`).
- ❌ **NO omitir `relatedDebtId` o `relatedLoanId` al generar transacciones vinculadas a deudas (Regla de Trazabilidad en Transacciones)**: Toda transacción generada para deudas o préstamos DEBE portar `relatedDebtId` o `relatedLoanId`.
- ❌ **NO preservar `lastPaymentDate` al revertir un pago de deuda personal (Regla de Reversión de Fechas de Deuda)**: Al revertir un pago de deuda personal, `lastPaymentDate` debe resetearse.
- ❌ **NO exigir `newRemaining === 0` exacto en compras a cuotas de terceros (Regla de Tolerancia IEEE-754 en Terceros)**: Liquidar con `newRemaining <= 0.05` para absorber centavos residuales.
- ❌ **NO acumular pagos de tarjeta (`card_payment`) sin acotarlos al ciclo de facturación activo (Regla de Pagos de Tarjeta por Ciclo)**: Los pagos de tarjeta (`card_payment`) SIEMPRE deben filtrarse con `isDateInCurrentBillingCycle(t.date)`.
- ❌ **NO reducir la cuota mensual de consumos de terceros en el extracto por abonos previos del amigo (Regla de Facturación de Cuotas de Terceros)**: El extracto debe exigir la cuota pactada completa (`normalQuota`).
- ❌ **NO usar `calculateRecurringDueDate` para tarjetas de crédito (Regla de Vencimientos de Tarjetas)**: Usar siempre `getCardBillingCycleDates(closingDay, paymentDay, refDate)`.
- ❌ **NO re-renderizar tarjetas de lista extensas ni recrear handlers inline en pantallas padre (Regla de Memoización en Listas)**: Envolver con `React.memo` y `useCallback`.
- ❌ **NO duplicar cálculos de ciclo ni abonos inline para tarjetas (Regla de Liquidación de Tarjetas)**: Usar siempre `computeCardBillingStatement`.
- ❌ **NO mutar entidades de Supabase en stores persistentes sin sincronización reactiva (Regla de Sincronización en Stores)**: Conectar handlers en `sync-service.ts`.
- ❌ **NO usar bordes superiores toscos ni tarjetas de balance gigantes en Dashboard**: Usar acento vertical neón interior y carrusel compacto de `BankDeckCard`.
- ❌ **NO usar `Math.floor((total - rem) / monthly)` directamente con decimales (Regla IEEE-754)**: Usar siempre `getEffectivePaidInstallments`.
- ❌ **NO incrementar ciegamente el número de cuota activa al pagar el ciclo en curso**: Mantener "Cuota X de Y • Cubierta" hasta el corte del siguiente ciclo.
- ❌ **NO estirar la tarjeta física de crédito al 100% en pantallas anchas**: Encapsular en layout de 2 columnas (`maxWidth: 1150`).
- ❌ **NO proyectar consumos en cuotas sumando meses ciegamente**: Usar siempre `getProjectedCardBillingPeriod` y `getProjectedInstallmentInfo`.
- ❌ **NO expulsar cargos de terceros saldados del extracto si pertenecen al ciclo actual**: Mantener cuota en extracto hasta el pago efectivo de la tarjeta.
- ❌ **NO omitir `presentation: 'transparentModal'` en Stacks anidados de modales en Web**.
- ❌ **NO usar `AsyncStorage.clear()` para reseteos**: Usar purga granular selectiva por store.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** sin solicitud explícita (`Visual Freeze`).
- ❌ **NO dejar código muerto, obsoleto o importaciones en desuso tras refactorizar (Regla de Zero Dead Code)**: Purgar inmediatamente código redundante verificando con `npm test` y `npx tsc --noEmit`.
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores).

## 4. Bugs Críticos Resueltos & Blindajes
- **Solapamiento en Dashboard y Cierre Accidental de Sesión**: Resuelto homologando `paddingBottom: 110` en scroll de Dashboard e implementando `Alert.alert` confirmatorio en botón Cerrar Sesión.
- **Título de Pestaña Web Alterado por Rutas y OAuth**: Inyección de `<Head><title>ControlFynz</title></Head>` y `document.title = 'ControlFynz'` en `app/_layout.tsx`.
- **Desorden Cronológico en Movimientos**: Corregido con orden descendente por timestamp en `transactions.tsx`, `index.tsx` y `sync-service.ts`.
- **Pérdida de Sincronización al Refrescar en Navegador (F5)**: Escucha de `'INITIAL_SESSION'`, Pull silencioso y suscripción a Supabase Realtime.
- **Disonancia Semafórica en Alertas de Dashboard**: Corregido con nivel `warning` (`#FFD60A`, "Próximo (Xd)").
- **Pérdida de Trazabilidad y Estado de Cuota en Reversión de Deudas**: Vinculación de `relatedDebtId`/`relatedLoanId` y reseteo de fecha en `debts-store.ts`.
- **Centavos Residuales Indefinidos en Liquidación de Terceros**: Absorción de residuo cuando `newRemaining <= 0.05`.
- **Fuga de Pagos de Tarjeta entre Ciclos Consecutivos y Sub-facturación de Cuotas de Terceros**: Acotación con `isDateInCurrentBillingCycle` y exigencia de `normalQuota`.
- **Falso Vencimiento Urgente en Tarjetas Post-Corte (Día 1)**: Corregido con `getCardBillingCycleDates`.
- **Falsa Cobertura de Cuotas Históricas Propias en Tarjeta**: Supeditado al pago del extracto (`cardCurrentMonthDebt <= 0`).
- **Truncamiento de Cuotas por Precisión IEEE-754**: Tolerancia epsilon `0.05` en `getEffectivePaidInstallments`.
- **Salto Prematuro de Cuota Cubierta**: Mantener "Cuota X de Y • Cubierta" en el ciclo en curso con `isCurrentPeriodPaid`.
- **Modales en Web/Tauri**: Fondo transparente con `transparentModal` y diálogo flotante centrado.

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.
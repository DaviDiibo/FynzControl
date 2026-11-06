# Memoria Activa del Proyecto ControlFynz

> **Límite Estricto**: Este archivo mantiene el contexto de trabajo activo y NO debe superar las 100 líneas. Para la bitácora de tareas concluidas, consultar `HISTORY.md` bajo demanda.

## 1. Arquitectura y Stack Base
- **Framework**: Expo SDK 58 (React Native 0.88) + Expo Router (`app/` en la raíz).
- **Lenguaje & Tipado**: TypeScript estricto, arrow functions con tipado inline obligatorio (`const Comp = (props: Props): JSX.Element => ...`), cero `any` o `unknown`.
- **Estado y Persistencia**: Zustand con adaptador `safeStorage` centralizado en `src/store/safe-storage.ts` (con respaldo resiliente en memoria). Claves activas: `*-storage-v2`.
- **UI & Tema**: Modo oscuro cyberpunk/neón (`#121212`, tarjetas `#1E1E1E`, acento `#00FFA3`, peligro `#FF453A`). Modales interactivos transparentes, nunca diálogos toscos nativos.
- **Multiplataforma**: Paridad iOS (KeyboardOffset 48dp, Safe Area), Android (KeyboardOffset 0dp, Edge-to-edge) y Web/Tauri Desktop (`useIsWide(768)`).
- **Backend / Infra & Sync**: Offline-First con Supabase (Auth, RLS, PostgreSQL). Sincronización Multi-Dispositivo en `sync-service.ts` y `use-app-hydration.ts`: Pull en hidratación, Focus Sync, Supabase Realtime, Tombstone Queue persistida y debouncing con reintento concurrente.
- **Testing & QA**: Jest 30 + `jest-expo` (139/139 tests aprobados, 100% pass). Verificación doble obligatoria (`npm test` + `npx tsc --noEmit` 0 errores) previo a cerrar cualquier tarea.

## 2. Estado Activo del Sprint y Foco Inmediato
- **Sprint Activo**: Auditoría y blindaje técnico integral completados con éxito (Fases 1 a 4).
- **Hitos Recientes Concluidos**: `[TASK-FIX-EXIGIBLE-DROP-AND-REALTIME-DELETION]` (Invarianza de exigible ante abonos parciales y baja inmediata/anti-resurrección en Supabase), `[TASK-CARD-INSTALLMENTS-UI-AND-PROJECTION]`, `[TASK-CARD-INSTALLMENTS-ACCOUNTING-CORE]`.
- **Propuestas Técnicas Pendientes**: Cola de propuestas técnicas pendientes 100% limpia y completada.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO purgar tiendas de dominio si `currentUser` es `null` o durante la hidratación**: Solo purgar si `currentUser` existe y su ID difiere de la nueva sesión, o en `SIGNED_OUT` explícito.
- ❌ **NO disparar sincronización en background sin debouncing cancelable ni reintento**: En `triggerBackgroundPush`, aplicar debouncing con `clearTimeout` y bandera `hasPendingPushRequest`.
- ❌ **NO duplicar implementaciones privadas de `safeStorage`**: Consumir siempre desde `src/store/safe-storage.ts`. Prohibido recrear copias locales en tiendas.
- ❌ **NO comparar IDs bancarios directamente con `===`**: Usar siempre `isSameBankId(a, b)` con normalización `toDeterministicUuid` para evitar desajustes UUID vs local con Supabase.
- ❌ **NO omitir clamping de fin de mes en `closingDay` de tarjetas**: Aplicar `Math.min(Math.max(1, closingDay), maxDaysInMonth)` para meses de 28/29/30 días.
- ❌ **NO forzar `lastPaymentDate = undefined` al revertir pagos si la deuda aún conserva abonos vigentes**: Preservar la fecha histórica si `hasRemainingPayments` es verdadero.
- ❌ **NO conservar dependencias huérfanas en `package.json`**: Auditar y purgar paquetes sin importaciones activas (`@tauri-apps/api`, `expo-constants`, `expo-device`, `expo-font`, `expo-linking`).
- ❌ **NO exportar helpers sin consumidor externo ni dejar código muerto (Zero Dead Code)**: Mantener ámbito privado o inlining en adaptadores (`isValidUuid`, `formatIsoToSpanishDate`).
- ❌ **NO mantener lógica inerte de timeout o bloqueo sin consumidor en `session.ts`**: Limitar el listener de `AppState` estrictamente a registrar actividad con `updateActivity()`.
- ❌ **NO usar ScrollView en listas extensas ni recrear componentes de búsqueda**: Usar `FlatList` virtualizado con modelo aplanado (`header` e `item`), `keyExtractor` determinista y `ListHeaderComponent` memoizado para no perder foco en `<TextInput>`.
- ❌ **NO omitir memoización ni comparador fino en tarjetas de lista**: Envolver `TransactionItemCard` con `React.memo` y `arePropsEqual` para evitar re-renderizados masivos ante cambios de filtro o búsqueda.
- ❌ **NO usar alertas nativas ni `window.confirm`**: Usar siempre componentes `<Modal transparent>` con diseño Cyberpunk y spinners integrados.
- ❌ **NO silenciar fallos de RPCs destructivos de cuenta**: `deleteAccount` jamás debe cerrar sesión o purgar datos locales si el servidor rechaza el RPC.
- ❌ **NO bloquear rutas informativas públicas en el Auth Gate**: Declarar siempre las rutas legales (`terms`, `privacy`) en `PUBLIC_ROUTES` en `app/_layout.tsx`.
- ❌ **NO registrar eventos Realtime sin purgar canales previos en `supabase.getChannels()`**: Siempre remover instancias previas con `supabase.removeChannel()`.
- ❌ **NO cerrar sesión sin confirmación explícita**: Proteger el cierre de sesión con diálogo confirmatorio para prevenir purgas accidentales.
- ❌ **NO usar padding inferior menor a 110dp en scrolls de pestañas principales**: Todos los scrolls de tabs deben mantener `paddingBottom: 110`.
- ❌ **NO permitir que el título de la pestaña web muestre rutas internas o parámetros de OAuth**: Fijar `<title>ControlFynz</title>` en el layout raíz.
- ❌ **NO mostrar transacciones sin orden cronológico estricto**: Ordenar siempre transacciones descendentemente por timestamp (`b.date - a.date`).
- ❌ **NO ignorar `'INITIAL_SESSION'` al sincronizar sesiones persistentes**: Escuchar siempre `'INITIAL_SESSION'` para disparar `syncAll` tras recarga.
- ❌ **NO mostrar badge verde "En plazo" en deudas que alertan en el widget del Dashboard**: Alertas entre 4 y 7 días deben usar nivel `warning` (`#FFD60A`).
- ❌ **NO omitir `relatedDebtId` o `relatedLoanId` al generar transacciones vinculadas a deudas**: Mantener siempre la trazabilidad relacional.
- ❌ **NO exigir `newRemaining === 0` exacto en compras a cuotas de terceros**: Liquidar con `newRemaining <= 0.05` para tolerar residuo IEEE-754.
- ❌ **NO acumular pagos de tarjeta sin acotarlos al ciclo de facturación activo**: Filtrar siempre con `isDateInCurrentBillingCycle(t.date)`.
- ❌ **NO reducir la cuota mensual de consumos de terceros en el extracto por abonos previos**: El extracto debe exigir la cuota pactada completa (`normalQuota`).
- ❌ **NO usar `calculateRecurringDueDate` para tarjetas de crédito**: Usar siempre `getCardBillingCycleDates(closingDay, paymentDay, refDate)`.
- ❌ **NO re-renderizar tarjetas de lista extensas ni recrear handlers inline en pantallas padre**: Envolver con `React.memo` y `useCallback`.
- ❌ **NO duplicar cálculos de ciclo ni abonos inline para tarjetas**: Usar siempre `computeCardBillingStatement`.
- ❌ **NO mutar entidades de Supabase en stores persistentes sin sincronización reactiva**: Conectar handlers en `sync-service.ts`.
- ❌ **NO usar bordes superiores toscos ni tarjetas de balance gigantes en Dashboard**: Usar acento vertical neón interior y carrusel compacto de `BankDeckCard`.
- ❌ **NO usar `Math.floor((total - rem) / monthly)` directamente con decimales**: Usar siempre `getEffectivePaidInstallments`.
- ❌ **NO incrementar ciegamente el número de cuota activa al pagar el ciclo en curso**: Mantener "Cuota X de Y • Cubierta" hasta el corte del siguiente ciclo.
- ❌ **NO estirar la tarjeta física de crédito al 100% en pantallas anchas**: Encapsular en layout de 2 columnas (`maxWidth: 1150`).
- ❌ **NO proyectar consumos en cuotas sumando meses ciegamente**: Usar siempre `getProjectedCardBillingPeriod` y `getProjectedInstallmentInfo`.
- ❌ **NO expulsar cargos de terceros saldados del extracto si pertenecen al ciclo actual**: Mantener cuota en extracto hasta el pago efectivo.
- ❌ **NO omitir `presentation: 'transparentModal'` en Stacks anidados de modales en Web**.
- ❌ **NO usar `AsyncStorage.clear()` para reseteos**: Usar purga granular selectiva por store.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** sin solicitud explícita (`Visual Freeze`).
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores).

## 4. Bugs Críticos Resueltos & Blindajes
- **Rendimiento de Listas en Móvil (`transactions.tsx`)**: Reemplazo de `ScrollView` con mapeo lineal por `FlatList` virtualizado con modelo heterogéneo aplanado (`header` e `item`), `keyExtractor` determinista y `ListHeaderComponent` memoizado para prevenir pérdida de foco en `<TextInput>`.
- **Memoización con Comparador Fino (`transaction-item-card.tsx`)**: Blindaje con `React.memo` y comparador personalizado `arePropsEqual` para evitar re-renderizados masivos ante cambios en filtros y búsqueda.
- **Poda de Dependencias Huérfanas y Cero Código Muerto**: Remoción de 5 paquetes no importados (`@tauri-apps/api`, `expo-constants`, `expo-device`, `expo-font`, `expo-linking`) y purga de exports no consumidos (`isValidUuid`, `formatIsoToSpanishDate`).
- **Saneamiento de Sesión en Primer Plano (`session.ts`)**: Erradicación de timeout inerte sin consumidor; listener de `AppState` concentrado exclusivamente en `updateActivity()`.
- **Desajuste de Saldo Bancario por Identificadores UUID vs Local**: Unificada la comparación en `transactions-store.ts` mediante `isSameBankId` con `toDeterministicUuid`.
- **Desfase de Ciclos de Facturación en Meses Cortos**: Clamping estricto de `closingDay` contra `maxDaysInMonth` en `computeMonthlyCashFlowBreakdown`.
- **Duplicación de Adaptador de Almacenamiento**: Centralizado `safeStorage` en `src/store/safe-storage.ts` con respaldo reactivo en `memoryStorage`.
- **Anulación Indebida de `lastPaymentDate` al Revertir Abonos**: Preservada la fecha de último pago si la deuda aún conserva abonos vigentes (`hasRemainingPayments`).
- **Purga Accidental de Tiendas al Iniciar Sesión / Hidratar**: Corregida condición `currentUser && currentUser.id !== mappedUser.id` en `auth-store.ts`.
- **Pérdida de Mutaciones Concurrentes en Push**: Implementado debouncing cancelable y bandera de reintento `hasPendingPushRequest` en `sync-service.ts`.
- **Solapamiento en Dashboard y Cierre Accidental de Sesión**: Homologado `paddingBottom: 110` en Dashboard y diálogo confirmatorio en Cerrar Sesión.
- **Título de Pestaña Web Alterado por Rutas y OAuth**: Inyección de `<Head><title>ControlFynz</title></Head>` y `document.title = 'ControlFynz'` en `app/_layout.tsx`.
- **Desorden Cronológico en Movimientos**: Corregido con orden descendente por timestamp en `transactions.tsx`, `index.tsx` y `sync-service.ts`.
- **Pérdida de Sincronización al Refrescar en Navegador (F5)**: Escucha de `'INITIAL_SESSION'`, Pull silencioso y suscripción a Supabase Realtime.
- **Disonancia Semafórica en Alertas de Dashboard**: Corregido con nivel `warning` (`#FFD60A`, "Próximo (Xd)").
- **Pérdida de Trazabilidad y Estado de Cuota en Reversión de Deudas**: Vinculación de `relatedDebtId`/`relatedLoanId` en `debts-store.ts`.
- **Centavos Residuales Indefinidos en Liquidación de Terceros**: Absorción de residuo cuando `newRemaining <= 0.05`.
- **Fuga de Pagos de Tarjeta entre Ciclos Consecutivos y Sub-facturación de Cuotas de Terceros**: Acotación con `isDateInCurrentBillingCycle` y exigencia de `normalQuota`.
- **Falso Vencimiento Urgente en Tarjetas Post-Corte (Día 1)**: Corregido con `getCardBillingCycleDates`.
- **Falsa Cobertura de Cuotas Históricas Propias en Tarjeta**: Supeditado al pago del extracto (`cardCurrentMonthDebt <= 0`).
- **Truncamiento de Cuotas por Precisión IEEE-754**: Tolerancia epsilon `0.05` en `getEffectivePaidInstallments`.
- **Salto Prematuro de Cuota Cubierta**: Mantener "Cuota X de Y • Cubierta" en el ciclo en curso con `isCurrentPeriodPaid`.
- **Modales en Web/Tauri**: Fondo transparente con `transparentModal` y diálogo flotante centrado.
- **Sanitización de Errores de Actualizador Desktop**: Mapeo defensivo de errores crudos de Rust/Tauri (404, red, Minisign) a mensajes amigables en español con `formatUpdaterErrorMessage` en `updater-service.ts`.
- **Liquidación Mensual Exacta de Compras en Tarjeta a Cuotas**: Imputación de cuota mensual activa con `monthsDiff` y consolidación de deuda diferida remanente (`directInstallmentsRemainingTotal`) en `card-accounting.ts` y `transactions-store.ts`.
- **Unificación y Proyección de Cuotas en Detalle de Tarjeta (`cards/[id].tsx`)**: Eliminación de cálculos inline duplicados mediante `computeCardBillingStatement`; visualización de cuota activa (`"Cuota X de Y"`), importe mensual prorrateado y proyección multi-período (+1 y +2 meses) de cuotas vigentes.
- **Invarianza de Exigible y Sincronización Inmediata de Bajas**: Eliminado redondeo al alza de cuotas en debts-store.ts (isFullySettled = newRemaining <= 0.05 con Math.floor), baja inmediata a Supabase en deleteRemoteRecord, escudo anti-resurrección en syncPush y purga de bajas remotas en syncPull.

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

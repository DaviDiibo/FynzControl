# Memoria Activa del Proyecto ControlFynz

> **Límite Estricto**: Este archivo mantiene el contexto de trabajo activo y NO debe superar las 100 líneas. Para la bitácora de tareas concluidas, consultar `HISTORY.md` bajo demanda.

## 1. Arquitectura y Stack Base
- **Framework**: Expo SDK 58 (React Native 0.88) + Expo Router (`app/` en la raíz).
- **Lenguaje & Tipado**: TypeScript estricto, arrow functions con tipado inline obligatorio (`const Comp = (props: Props): JSX.Element => ...`), cero `any` o `unknown`.
- **Estado y Persistencia**: Zustand con adaptador `safeStorage` centralizado en `src/store/safe-storage.ts` (con respaldo resiliente en memoria). Claves activas: `*-storage-v2`.
- **UI & Tema**: Modo oscuro cyberpunk/neón (`#121212`, tarjetas `#1E1E1E`, acento `#00FFA3`, peligro `#FF453A`). Modales interactivos transparentes, nunca diálogos toscos nativos.
- **Multiplataforma**: Paridad iOS (KeyboardOffset 48dp, Safe Area), Android (KeyboardOffset 0dp, Edge-to-edge) y Web/Tauri Desktop (`useIsWide(768)`).
- **Backend / Infra & Sync**: Offline-First con Supabase (Auth, RLS, PostgreSQL). Sincronización Multi-Dispositivo en `sync-service.ts` y `use-app-hydration.ts`: Pull en hidratación, Focus Sync, Supabase Realtime, Tombstone Queue persistida y debouncing con reintento concurrente.
- **Testing & QA**: Jest 30 + `jest-expo` (142/142 tests aprobados, 100% pass). Verificación doble obligatoria (`npm test` + `npx tsc --noEmit` 0 errores) previo a cerrar cualquier tarea.

## 2. Estado Activo del Sprint y Foco Inmediato
- **Sprint Activo**: Sistema de Moneda concluido de punta a punta: Fase 1 (Frontend local, micro-badge en balance y erradicación de fallbacks hardcodeados a `$`) y Fase 2 (Sincronización Cloud bidireccional en Supabase `user_settings` con adaptadores resilientes y upsert en segundo plano).
- **Hitos Recientes Concluidos**: `[TASK-CURRENCY-PHASE2-CLOUD-SYNC]`, `[TASK-CURRENCY-PHASE1-SUBTASK2]`, `[TASK-CURRENCY-PHASE1-SUBTASK1]`, `[RELEASE-V1.0.3-DESKTOP-AND-WEB]`.
- **Foco Inmediato / Próximos Pasos**: Monitoreo de sincronización remota multi-dispositivo y evaluación del siguiente ciclo funcional.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO omitir la sincronización bidireccional de `user_settings` en `sync-service.ts`**: Descargar siempre `user_settings` en `syncPull` para hidratar `useSettingsStore` y sincronizar cambios inmediatamente con `syncPushUserSettings` (upsert por `user_id`) en segundo plano sin bloquear la UI.
- ❌ **NO hardcodear el símbolo `$` ni dejar fallbacks huérfanos en listas o modales de tarjetas**: Usar siempre `getCurrencySymbol(currency)` de `src/utils/currency.ts`, micro-badge `[ COP ]` / `[ USD ]` (`getCurrencyBadgeLabel`) en Dashboard, y propagar `currencySymbol` a componentes memoizados (`TransactionItemCard` con `arePropsEqual`).
- ❌ **NO purgar tiendas de dominio si `currentUser` es `null` o durante la hidratación**: Solo purgar si `currentUser` existe y su ID difiere de la nueva sesión, o en `SIGNED_OUT` explícito.
- ❌ **NO disparar sincronización en background sin debouncing cancelable ni reintento**: En `triggerBackgroundPush`, aplicar debouncing con `clearTimeout` y bandera `hasPendingPushRequest`.
- ❌ **NO duplicar implementaciones privadas de `safeStorage`**: Consumir siempre desde `src/store/safe-storage.ts`. Prohibido recrear copias locales en tiendas.
- ❌ **NO comparar IDs bancarios directamente con `===`**: Usar siempre `isSameBankId(a, b)` con normalización `toDeterministicUuid` para evitar desajustes UUID vs local con Supabase.
- ❌ **NO omitir clamping de fin de mes en `closingDay` de tarjetas**: Aplicar `Math.min(Math.max(1, closingDay), maxDaysInMonth)` para meses de 28/29/30 días.
- ❌ **NO forzar `lastPaymentDate = undefined` al revertir pagos si la deuda aún conserva abonos vigentes**: Preservar la fecha histórica si `hasRemainingPayments` es verdadero.
- ❌ **NO exportar helpers sin consumidor externo ni dejar código muerto (Zero Dead Code)**: Auditar dependencias huérfanas y purgar exports no consumidos (`isValidUuid`, etc.).
- ❌ **NO usar ScrollView en listas extensas ni recrear componentes de búsqueda**: Usar `FlatList` virtualizado con modelo aplanado (`header` e `item`), `keyExtractor` determinista y `ListHeaderComponent` memoizado.
- ❌ **NO omitir memoización ni comparador fino en tarjetas de lista**: Envolver `TransactionItemCard` con `React.memo` y `arePropsEqual` para evitar re-renderizados masivos.
- ❌ **NO usar alertas nativas ni `window.confirm`**: Usar siempre componentes `<Modal transparent>` con diseño Cyberpunk y spinners integrados.
- ❌ **NO silenciar fallos de RPCs destructivos de cuenta**: `deleteAccount` jamás debe cerrar sesión o purgar datos locales si el servidor rechaza el RPC.
- ❌ **NO bloquear rutas informativas públicas en el Auth Gate**: Declarar siempre las rutas legales (`terms`, `privacy`) en `PUBLIC_ROUTES` en `app/_layout.tsx`.
- ❌ **NO registrar eventos Realtime sin purgar canales previos en `supabase.getChannels()`**: Siempre remover instancias previas con `supabase.removeChannel()`.
- ❌ **NO cerrar sesión sin confirmación explícita ni omitir `paddingBottom: 110` en tabs**: Proteger con diálogo confirmatorio y mantener espacio inferior en scrolls.
- ❌ **NO permitir que el título de la pestaña web muestre rutas internas o parámetros de OAuth**: Fijar `<title>ControlFynz</title>` en el layout raíz.
- ❌ **NO mostrar transacciones sin orden cronológico estricto**: Ordenar siempre transacciones descendentemente por timestamp (`b.date - a.date`).
- ❌ **NO ignorar `'INITIAL_SESSION'` al sincronizar sesiones persistentes**: Escuchar siempre `'INITIAL_SESSION'` para disparar `syncAll` tras recarga.
- ❌ **NO mostrar badge verde "En plazo" en deudas que alertan en el widget del Dashboard**: Alertas entre 4 y 7 días deben usar nivel `warning` (`#FFD60A`).
- ❌ **NO omitir `relatedDebtId` o `relatedLoanId` al generar transacciones vinculadas a deudas**: Mantener siempre la trazabilidad relacional.
- ❌ **NO exigir `newRemaining === 0` exacto en compras a cuotas de terceros**: Liquidar con `newRemaining <= 0.05` para tolerar residuo IEEE-754.
- ❌ **NO acumular pagos de tarjeta sin acotarlos al ciclo de facturación activo**: Filtrar siempre con `isDateInCurrentBillingCycle(t.date)`.
- ❌ **NO reducir la cuota mensual de consumos de terceros en el extracto por abonos previos**: El extracto debe exigir la cuota pactada completa (`normalQuota`).
- ❌ **NO usar `calculateRecurringDueDate` para tarjetas de crédito**: Usar siempre `getCardBillingCycleDates(closingDay, paymentDay, refDate)`.
- ❌ **NO duplicar cálculos de ciclo ni abonos inline para tarjetas**: Usar siempre `computeCardBillingStatement`.
- ❌ **NO usar `Math.floor((total - rem) / monthly)` directamente con decimales**: Usar siempre `getEffectivePaidInstallments`.
- ❌ **NO incrementar ciegamente el número de cuota activa al pagar el ciclo en curso**: Mantener "Cuota X de Y • Cubierta" hasta el corte del siguiente ciclo.
- ❌ **NO proyectar consumos en cuotas sumando meses ciegamente**: Usar siempre `getProjectedCardBillingPeriod` y `getProjectedInstallmentInfo`.
- ❌ **NO omitir `presentation: 'transparentModal'` en Stacks anidados de modales en Web**.
- ❌ **NO usar `AsyncStorage.clear()` para reseteos**: Usar purga granular selectiva por store.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** sin solicitud explícita (`Visual Freeze`).
- ❌ **NO renderizar opciones o enlaces de descarga en Android/iOS nativo**: Mantener `AppDownloadsCard` exclusivamente visible en Web y Tauri (`Platform.OS !== 'web' && !isTauri()` retorna `null`).
- ❌ **NO mostrar banners informativos descartables sin persistencia versionada**: Usar siempre `safeStorage` con clave versionada (ej. `'controlfynz_beta_banner_dismissed_v1'`).
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores).

## 4. Bugs Críticos Resueltos & Blindajes
- **Estandarización de Divisas y Sincronización Cloud (`currency.ts` / `user_settings`)**: Sistema de moneda completado de punta a punta (Fase 1 Frontend local con micro-badge y erradicación de `$` hardcodeado; Fase 2 sincronización bidireccional resiliente en Supabase `user_settings`). 142 tests unitarios en verde.
- **Banner Beta y Canal de Feedback en Dashboard**: Componente `BetaBanner` descartable con clave versionada en `safeStorage`, botón mailto a `fynzcontrol0627@gmail.com` e inserción con gap nativo.
- **Rendimiento de Listas en Móvil y Memoización Fina**: `FlatList` virtualizado en `transactions.tsx` con modelo aplanado y memoización de `TransactionItemCard` con `arePropsEqual`.
- **Poda de Dependencias y Cero Código Muerto**: Purga de paquetes huérfanos y exports no consumidos; saneamiento de listener en `session.ts`.
- **Desajuste de Saldo Bancario y Fechas de Tarjeta**: Comparación con `isSameBankId`, clamping de `closingDay` y preservación de `lastPaymentDate` en abonos vigentes.
- **Resiliencia de Sincronización y Sesión Supabase**: Debouncing con reintento en push, escucha de `'INITIAL_SESSION'`, reconexión Realtime por visibilidad y guarda asíncrona de token JWT en hidratación.
- **Liquidación Exacta e Invarianza de Deudas y Tarjetas**: Consolidación de cuotas de tarjeta con `monthsDiff`, proyección multi-período, absorción de residuo IEEE-754 (`<= 0.05`), exigencia de `normalQuota` y baja inmediata en Supabase.
- **Blindaje Multiplataforma y Desktop Updater**: Layout responsivo en tarjetas (`maxWidth: 1150`), `transparentModal` en web/Tauri, sanitización de errores de Rust/Tauri y descargas exclusivas en web/desktop.

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

# Memoria Activa del Proyecto ControlFynz

> **Límite Estricto**: Este archivo mantiene el contexto de trabajo activo y NO debe superar las 100 líneas. Para la bitácora de tareas concluidas, consultar `HISTORY.md` bajo demanda.

## 1. Arquitectura y Stack Base
- **Framework**: Expo SDK 57 (React Native) + Expo Router (`app/` en la raíz).
- **Lenguaje & Tipado**: TypeScript estricto, arrow functions con tipado inline obligatorio (`const Comp = (props: Props): JSX.Element => ...`), cero `any` o `unknown`.
- **Estado y Persistencia**: Zustand con adaptador `safeStorage` (con respaldo resiliente en memoria). Claves activas: `*-storage-v2`.
- **UI & Tema**: Modo oscuro cyberpunk/neón (`#121212`, tarjetas `#1E1E1E`, acento `#00FFA3`, peligro `#FF453A`). Modales interactivos transparentes, nunca diálogos toscos nativos.
- **Multiplataforma**: Paridad iOS (KeyboardOffset 48dp, Safe Area) y Android (KeyboardOffset 0dp, Edge-to-edge).
- **Backend / Infra**: Arquitectura Offline-First con proyección a Supabase (Auth, RLS, PostgreSQL).
- **Testing & QA**: Jest 29 + `jest-expo` (~57.0.6). Verificación doble obligatoria (`npm test` 100% pass + `npx tsc --noEmit` 0 errores) previo a cerrar cualquier tarea.

## 2. Estado Activo del Sprint y Foco Inmediato
- **Módulos Principales Culminados**:
  - 5 Tabs operativas: Dashboard, Movimientos, Deudas, Estadísticas y Ajustes.
  - Flujo modal de transacciones con catálogo segregado de gastos/ingresos y soporte de tarjetas diferidas.
  - Centro de Gestión de Pasivos y Cobros: Préstamos bancarios, préstamos a amigos, y Liquidación Mensual de Terceros (Fases 1 y 2).
  - Cobertura de Testing (54/54 tests en verde): Suites en `src/__tests__/` con Fake Timers deterministas para ciclos de facturación, amortizaciones contables y utilidades de fechas.
  - Especificación arquitectónica relacional en `DATABASE_SCHEMA.md` para Supabase/PostgreSQL.
- **Hitos Recientes Concluidos**:
  - **Corrección en Eliminación de Deudas y Restricción de Cuotas Previas (`[PERSONAL-DEBT-DELETE-AND-PREV-INSTALLMENTS-CLEANUP-001]`)**: Validación contable precisa (`totalActualPaid > 0 || paidInstallments > initialPaidInstallments`) en `debts-store.ts` y confirmación en `debts.tsx`; selectores de cuotas previas condicionados a `isLegacyMode` en `new-debt.tsx` (alta en Deudas inicia con 0 cuotas previas y 100% saldo); Caso 14 en `accounting-integration.test.ts`; 54/54 tests en verde (100%), 0 errores TS.
  - **Fix Overlap Multi-Tarjeta y Flex Responsivo en Deudas (`[DEBTS-MULTI-CARD-OVERLAP-FIX-AND-RESPONSIVE-FLEX-001]`)**: Pastillas independientes de tarjeta (`uniqueCardNames.map`, max 160, truncado), blindajes Flexbox (`minWidth: 0`, `flexShrink: 0`) contra colisiones y layout responsivo en 2 columnas (`cardsGridWide`, `width: '48.5%'`, `maxWidth: 1200`) en `debts.tsx`; móvil idéntico; 53/53 tests en verde (100%), 0 errores TS.
  - **Corrección de Invalid DOM Nesting en Dashboard (`[DASHBOARD-RECENT-TX-INVALID-DOM-NESTING-FIX-001]`)**: Erradicación del warning `validateDOMNesting: <button> inside <button>` en Tauri/Web sustituyendo `TouchableOpacity` exterior por `View` en `RecentTransactionsList`; botón de papelera interior intacto; móvil idéntico; 53/53 tests en verde (100%), 0 errores TS.
  - **Layout Responsivo en 2 Columnas para Estadísticas (`[STATS-RESPONSIVE-2-COLUMN-LAYOUT-001]`)**: Layout en 2 columnas en `stats.tsx` con `useIsWide(768)` (izq: selector de período, balance comparativo y Salud Financiera; der: gráfico y desglose por categorías, `maxWidth: 1200`); móvil intacto; 53/53 tests en verde (100%), 0 errores TS.
  - **Layout Responsivo en 2 Columnas para Movimientos (`[TRANSACTIONS-RESPONSIVE-2-COLUMN-LAYOUT-001]`)**: Hook `useIsWide(breakpoint = 768)` en `use-responsive.ts` para mitigar re-renders en redimensionamiento de Tauri; layout 2 columnas en `transactions.tsx` (izq: selector de mes, balance, buscador y filtros; der: feed de transacciones agrupadas, `maxWidth: 1200`); adopción en `index.tsx`; móvil intacto; 53/53 tests en verde (100%), 0 errores TS.
  - **Layout Responsivo en 2 Columnas para Dashboard (`[DASHBOARD-RESPONSIVE-2-COLUMN-LAYOUT-001]`)**: Layout en 2 columnas en `index.tsx` (`useWindowDimensions()`, breakpoint `>= 768px`, max-width 1200) separando balance/acciones rápidas (izq) y deudas/transacciones (der); ventana Tauri calibrada a 960x780; móvil vertical 100% preservado; 53/53 tests en verde (100%), 0 errores TS.
  - **Calibración Compacta de Ventana en Tauri (`[TAURI-WINDOW-COMPACT-SIZE-LIMITS-001]`)**: Dimensiones compactas smartphone/phablet (`width: 460`, `height: 860`, `center: true`) y límites de redimensión defensivos (`minWidth: 400`, `minHeight: 680`, `maxWidth: 580`, `maxHeight: 980`) para preservar ergonomía mobile-first en escritorio; 53/53 tests en verde (100%), 0 errores TS.
- **Próximo Foco Inmediato**:
  - Probar la pestaña Deudas en Tauri o avanzar con el Paso 3 (Dock flotante en `_layout.tsx`) en la rama `dev`.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO desarrollar directamente en rama `main`**: Operar siempre sobre `dev`; mergear hacia `main` únicamente al cerrar bloques grandes de tareas consolidadas y verificadas.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** a menos que el usuario lo solicite explícitamente (`Visual Freeze`).
- ❌ **NO usar imports estáticos cruzados entre Stores y Services**: Usar inyección de handlers para romper ciclos de require en Metro.
- ❌ **NO usar `Alert.alert` nativo**: Siempre implementar o reutilizar modales temáticos cyberpunk.
- ❌ **NO depender de selectores de funciones estáticas de Zustand en pantallas detrás de modales (`react-freeze`)**: Computar totales con `useMemo` directo sobre los arrays de estado junto con `focusRefreshKey` en `useFocusEffect`.
- ❌ **NO usar sufijo `/index` en rutas**: En Expo Router siempre navegar a `/(app)` o `/`, nunca `/(app)/index`.
- ❌ **NO declarar componentes con `function`**: Usar estrictamente `const Component = (props: Props): JSX.Element => { ... }`.
- ❌ **NO omitir `safeStorage` en tiendas Zustand**: `AsyncStorage` directo genera fallos en arranque nativo.
- ❌ **NO usar claves compuestas dependientes de tarjeta para agrupar compras de un deudor**: Agrupar siempre por persona normalizada (`normalizeStr`).
- ❌ **NO realizar abonos a terceros sin el algoritmo en 2 fases**: Fase 1 cubre compromisos exigibles del mes; Fase 2 amortiza el excedente a capital diferido.
- ❌ **NO degradar reembolsos a egresos**: Transacciones de tipo `'reimbursement'` suman a favor del balance (`+`).
- ❌ **NO sobrecargar un subagente con código + documentación masiva**: Mantener especialización por fases. Purgar subagentes ociosos al terminar.
- ❌ **NO matar subagentes prematuramente (`kill_all` antes de `<SYSTEM_MESSAGE>`)**: Esperar confirmación de finalización antes de purgar.
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores). Simular fechas con Fake Timers.
- ❌ **NO registrar pagos de tarjeta como `type: 'expense'`**: Usar siempre `type: 'card_payment'` para evitar doble gasto en presupuesto.
- ❌ **NO usar `keyboardType="numeric"` para dinero**: Usar siempre `keyboardType="decimal-pad"` y normalizar comas a puntos.
- ❌ **NO mezclar compras en tarjeta de crédito en la pestaña Deudas**: Las compras propias pertenecen a tarjetas. `debts.tsx` es exclusiva para préstamos y cuentas entre personas.
- ❌ **NO permitir cuotas previas en alta de Deudas ni bloquear borrado sin pagos reales en la app**: Las deudas en pestaña Deudas son estrictamente actuales (sin cuotas previas pagadas). Para borrado de deudas, `hasPayments` solo debe ser verdadero si existen desembolsos reales en la app (`totalActualPaid > 0 || paidInstallments > initialPaidInstallments`).

## 4. Bugs Críticos Resueltos & Blindajes
- **Bloqueo Injustificado de Eliminación de Deudas**: Resuelto evaluando desembolsos reales en la app (`totalActualPaid > 0 || paidInstallments > initialPaidInstallments`) en vez de cuotas iniciales históricas.
- **Colisión Multi-Tarjeta en Deudas**: Resuelto desglosando pastillas independientes por tarjeta y blindando con `minWidth: 0` y `flexShrink: 0` en `debts.tsx`.
- **Invalid DOM Nesting en Tauri/Web**: Resuelto sustituyendo `TouchableOpacity` exterior por `View` en `RecentTransactionsList`.
- **Destello de Ceros al Iniciar**: Resuelto reteniendo el Splash Screen nativo hasta confirmar rehidratación local de Zustand (`hasHydrated`).
- **"Native module is null"**: Resuelto aislando la persistencia mediante `safeStorage` con respaldo en memoria.
- **Desincronización de caché residual y purga incompleta**: Stores migrados a `*-storage-v2` y vaciado total en Ajustes.
- **Aislamiento y Purga Multi-Usuario**: Supresión de mocks semilla iniciales y purga forzada (`purgeAllDomainStores`) en logout, cambio de usuario y arranque no autenticado.
- **Congelamiento visual al volver de modales (`react-freeze`)**: Resuelto con `focusRefreshKey` en `useFocusEffect` y cálculo en `useMemo`.
- **Reversión Contable Integral**: Transacciones vinculadas ejecutan rollback automático e inverso en `useDebtsStore` al eliminarse.
- **Protección de Consumos en Cuotas**: Bloqueo preventivo de eliminación para compras diferidas con amortizaciones previas registradas para evitar inconsistencias contables.
- **Destello Web y Saldos en Cero Post-Login**: Resuelto con guardián `<Redirect>` en `app/(app)/_layout.tsx` y pantalla de carga inmersiva `isSyncingInitial` en Dashboard durante la hidratación desde Supabase.
- **Reaparición de Préstamos Eliminados tras Logout**: Resuelto conectando `DebtSyncHandlers` con `deleteRemoteRecord` (`deleted_at`) en `sync-service.ts`.

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

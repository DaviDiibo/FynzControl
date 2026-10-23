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
  - Cobertura de Testing (53/53 tests en verde): Suites en `src/__tests__/` con Fake Timers deterministas para ciclos de facturación, amortizaciones contables y utilidades de fechas.
  - Especificación arquitectónica relacional en `DATABASE_SCHEMA.md` para Supabase/PostgreSQL.
- **Hitos Recientes Concluidos**:
  - **Soporte de Escritorio Nativo con Tauri v2 (`[TAURI-V2-DESKTOP-APP-INITIALIZATION-001]`)**: Configuración e inicialización de Tauri v2 (`@tauri-apps/cli` 2.12.4, Tauri 2.12.5) bajo WebView2 en Windows; ventana 1280x850 centrada fondo `#121212`; pipeline enlazado a `dist/` (`npm run build:web`), scripts `desktop:dev` y `desktop:build`; 53/53 tests en verde (100%), 0 errores TS.
  - **Sincronización y Eliminación Remota de Deudas (`[DEBTS-REMOTE-DELETION-AND-SYNC-PERSISTENCE-001]`)**: Desacople con `DebtSyncHandlers` en `debts-store.ts`, soft-delete remoto (`deleted_at`) en Supabase para deudas, préstamos, cargos y personas en `sync-service.ts`, eliminación vinculada de desembolsos en `transactions-store.ts` y push en background; 53/53 tests en verde (100%), 0 errores TS.
  - **Guardián Web y Loader de Sync Inicial (`[WEB-AUTH-GUARD-AND-INITIAL-SYNC-LOADER-001]`)**: Guardián declarativo con `<Redirect href="/(auth)/login" />` en `app/(app)/_layout.tsx`; estado reactivo de sync inicial en `sync-service.ts` con timeout de 4s; pantalla de carga cyberpunk en `index.tsx` (`[ SINCRONIZANDO FINANZAS ]`) impidiendo saldos vacíos en $0,00 hasta hidratación de Supabase; 53/53 tests en verde (100%), 0 errores TS.
  - **Despliegue en Producción Web en Vercel (`[VERCEL-PRODUCTION-DEPLOYMENT-SUCCESS-001]`)**: Vinculación y despliegue exitoso en Vercel desde GitHub (`DaviDiibo/FynzControl`), compilación estática Expo Router (`dist/`), soporte de autenticación híbrida (Email/Password + Google OAuth), navegación SPA fluida y 100% operativo en caliente.
  - **Inicialización y Push a GitHub (`[GITHUB-REPOSITORY-INITIALIZATION-AND-PUSH-001]`)**: Repositorio Git inicializado en rama `main`, vinculado y subido exitosamente a `https://github.com/DaviDiibo/FynzControl.git` (212 archivos versionados, exclusión total de `.env*` y temporales).
  - **Preparación de Despliegue Web en Vercel (`[VERCEL-WEB-DEPLOYMENT-PREPARATION-001]`)**: Dependencia `@expo/metro-runtime` (~57.0.17), script `build:web`, configuración SPA en `vercel.json` (`dist/`, `cleanUrls`, rewrites SPA), blindaje en `.gitignore`; exportación web exitosa (42 rutas estáticas), 53/53 tests en verde (100%), 0 errores TS.
  - **Sincronización de Splash Screen y Rehidratación Zustand (`[SPLASH-SCREEN-AND-ZUSTAND-HYDRATION-SYNC-001]`)**: Hook `useAppHydration` sobre los 5 stores (`auth`, `transactions`, `debts`, `cards`, `settings`) con timeout 1500 ms; prevención de auto-hide nativo y montaje retenido hasta rehidratación en `app/_layout.tsx`, eliminando el destello de ceros; 53/53 tests en verde (100%), 0 errores TS.
  - **Resolución de Ciclo Require en Metro (`[RESOLVE-METRO-REQUIRE-CYCLE-SYNC-STORE-001]`)**: Inversión de dependencias en `transactions-store.ts` con `setTransactionSyncHandlers` y desacople en `sync-service.ts`, logrando flujo unidireccional y eliminando advertencia de ciclo en Metro; 53/53 tests en verde (100%), 0 errores TS.
  - **Formateo Unificado y Estado Vacío en Estadísticas (`[STATS-UNIFIED-FORMATTING-AND-EMPTY-STATE-PHASE-3-001]`)**: Formateo monetario en español (`es-ES`), supresión de mocks residuales, estado vacío contextual (`pie-chart-outline`) y clamping de porcentajes en `category-breakdown-card.tsx`; 53/53 tests en verde (100%), 0 errores TS.
- **Próximo Foco Inmediato**:
  - Probar ejecución en desarrollo de escritorio con `npm run desktop:dev` o compilar binario `.exe` con `npm run desktop:build`.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
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

## 4. Bugs Críticos Resueltos & Blindajes
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

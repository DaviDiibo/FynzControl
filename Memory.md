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
  - 5 Tabs operativas con paridad móvil y escritorio: Dashboard, Movimientos, Deudas, Estadísticas y Ajustes.
  - Dock flotante centrado en barra de navegación inferior para pantallas de escritorio.
  - Flujo modal de transacciones con catálogo segregado de gastos/ingresos y soporte de tarjetas diferidas.
  - Centro de Gestión de Pasivos y Cobros: Préstamos bancarios, préstamos a amigos, y Liquidación Mensual de Terceros (Fases 1 y 2).
  - Cobertura de Testing (56/56 tests en verde): Suites en `src/__tests__/` con Fake Timers deterministas para ciclos de facturación, amortizaciones contables y utilidades de fechas.
  - Especificación arquitectónica relacional en `DATABASE_SCHEMA.md` para Supabase/PostgreSQL.
- **Hitos Recientes Concluidos**:
  - **Sesión Persistente y Auto-Refresh de Tokens (`[PERSISTENT-AUTH-SESSION-AND-AUTO-REFRESH-001]`)**: Erradicación del cierre destructivo por inactividad de 60 minutos en `src/utils/session.ts`; conexión del ciclo de vida `AppState` con `supabase.auth.startAutoRefresh`/`stopAutoRefresh` en `src/lib/supabase.ts`; bloqueo seguro por PIN tras 15 minutos en background (`lockApp()`); 56/56 tests en verde (100%), 0 errores TS.
  - **Indicador Bancario Responsivo Auto-Ajustable en Deudas (`[DEBTS-RESPONSIVE-BANK-HEADER-CARD-001]`)**: Acotación de `bankGroupHeaderCard` con `alignSelf: 'flex-start'`, `minWidth: 320`, `maxWidth: 480` y `gap: 20` en `debts.tsx` con `useIsWide(768)`; móvil (`!isWide`) 100% intacto; 56/56 tests en verde.
  - **Layout Responsivo en 2 Columnas para Ajustes (`[SETTINGS-RESPONSIVE-2-COLUMN-LAYOUT-001]`)**: Distribución simétrica en 2 columnas en `settings.tsx` y `settings-section-list.tsx` con `useIsWide(768)`; 56/56 tests en verde.
  - **Dock Flotante Centrado en Navegación de Tabs (`[TABS-DESKTOP-FLOATING-DOCK-001]`)**: Integración de `useIsWide(768)` en `app/(app)/(tabs)/_layout.tsx` para desktop/Tauri/Web con dock flotante centrado (`maxWidth: 540`); 56/56 tests en verde.
  - **Corrección en Reversión de Abonos a Terceros y Paridad de Ingresos (`[THIRD-PARTY-ABONO-REVERSION-BETWEEN-DAYS-001]`)**: Persistencia de fechas en asignaciones de abonos a terceros; 56/56 tests en verde.
- **Próximo Foco Inmediato**:
  - Validar flujo de autenticación y persistencia en producción / merge hacia `main`.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO destruir la sesión (`logout()`) por inactividad en segundo plano**: Las sesiones se mantienen persistentes con rotación de JWT/Refresh Token en Supabase; la inactividad solo debe activar bloqueo por PIN (`lockApp()`).
- ❌ **NO omitir la restauración de fechas al revertir pagos/abonos**: Restaurar siempre 'lastPaymentDate' y 'settledAt'.
- ❌ **NO desarrollar directamente en rama `main`**: Operar siempre sobre `dev`; mergear hacia `main` únicamente al cerrar bloques consolidados.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** a menos que el usuario lo solicite explícitamente (`Visual Freeze`).
- ❌ **NO usar imports estáticos cruzados entre Stores y Services**: Usar inyección de handlers para romper ciclos de require en Metro.
- ❌ **NO usar `Alert.alert` nativo**: Siempre implementar o reutilizar modales temáticos cyberpunk.
- ❌ **NO depender de selectores de funciones estáticas de Zustand en pantallas detrás de modales (`react-freeze`)**: Computar totales con `useMemo` directo y `focusRefreshKey`.
- ❌ **NO usar sufijo `/index` en rutas**: En Expo Router siempre navegar a `/(app)` o `/`, nunca `/(app)/index`.
- ❌ **NO declarar componentes con `function`**: Usar estrictamente `const Component = (props: Props): JSX.Element => { ... }`.
- ❌ **NO omitir `safeStorage` en tiendas Zustand**: `AsyncStorage` directo genera fallos en arranque nativo.
- ❌ **NO realizar abonos a terceros sin el algoritmo en 2 fases**: Fase 1 cubre compromisos exigibles del mes; Fase 2 amortiza el excedente a capital diferido.
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores). Simular fechas con Fake Timers.

## 4. Bugs Críticos Resueltos & Blindajes
- **Cierre Prematuro de Sesión por Inactividad**: Erradicado `logout()` forzoso a los 60 min en `session.ts`; sincronizado `startAutoRefresh`/`stopAutoRefresh` con `AppState` en `supabase.ts`.
- **Indicador Bancario Responsivo en Deudas**: `bankGroupHeaderCard` auto-ajustable con `alignSelf: 'flex-start'`, `minWidth: 320`, `maxWidth: 480` en `debts.tsx`.
- **Layout Responsivo en Ajustes**: División semántica en 2 columnas balanceando perfil/preferencias con datos/logout.
- **Dock Flotante sin Colisión**: Dock flotante en `_layout.tsx` con `bottom: 16` y `position: 'absolute'` acotado a 540dp en pantallas anchas sin afectar móvil.
- **Inconsistencia Temporal al Revertir Abonos a Terceros**: Resuelto guardando `previousLastPaymentDate`/`previousSettledAt` en `ThirdPartyChargeAllocation`.

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

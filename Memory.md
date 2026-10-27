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
  - Cobertura de Testing (56/56 tests en verde): Suites en `src/__tests__/` con Fake Timers deterministas para ciclos de facturación, amortizaciones contables y utilidades de fechas.
  - Especificación arquitectónica relacional en `DATABASE_SCHEMA.md` para Supabase/PostgreSQL.
- **Hitos Recientes Concluidos**:
  - **Dock Flotante Centrado en Navegación de Tabs (`[TABS-DESKTOP-FLOATING-DOCK-001]`)**: Integración de `useIsWide(768)` en `app/(app)/(tabs)/_layout.tsx` para desktop/Tauri/Web con dock flotante centrado (`maxWidth: 540`, `position: 'absolute'`, `bottom: 16`, `borderRadius: 24`, sombra y elevación); móvil (`!isWide`) 100% idéntico e intacto; 56/56 tests en verde (100%), 0 errores TS.
  - **Corrección en Reversión de Abonos a Terceros y Paridad de Ingresos (`[THIRD-PARTY-ABONO-REVERSION-BETWEEN-DAYS-001]`)**: Persistencia de `previousLastPaymentDate` y `previousSettledAt` en asignaciones de abonos a terceros; blindaje contra `NaN` y reseteo de fechas; paridad de `reimbursement` en `getTotalIncome`/`getCurrentMonthIncome`; 56/56 tests en verde.
  - **Diseño Responsivo Split-View para Login en Escritorio (`[LOGIN-DESKTOP-RESPONSIVE-SPLIT-VIEW-001]`)**: Integración de `useIsWide(768)` en `app/(auth)/login.tsx` para desktop (Web/Tauri) con split view centrado de 2 columnas (`maxWidth: 960`); móvil intacto; 54/54 tests en verde.
  - **Corrección en Eliminación de Deudas (`[PERSONAL-DEBT-DELETE-AND-PREV-INSTALLMENTS-CLEANUP-001]`)**: Validación contable precisa (`totalActualPaid > 0 || paidInstallments > initialPaidInstallments`); cuotas previas en alta restringidas a legacy; 54/54 tests en verde.
  - **Fix Overlap Multi-Tarjeta y Flex Responsivo en Deudas (`[DEBTS-MULTI-CARD-OVERLAP-FIX-AND-RESPONSIVE-FLEX-001]`)**: Pastillas independientes de tarjeta (`uniqueCardNames.map`, max 160), blindajes Flexbox y layout responsivo 2 columnas en `debts.tsx`; móvil idéntico; 53/53 tests en verde.
  - **Layout Responsivo en 2 Columnas para Estadísticas, Movimientos y Dashboard**: Pestañas con `useIsWide(768)` en desktop acotadas a `maxWidth: 1200`; móvil vertical 100% preservado; 53/53 tests en verde.
  - **Calibración Compacta de Ventana en Tauri (`[TAURI-WINDOW-COMPACT-SIZE-LIMITS-001]`)**: Límites de redimensión y soporte desktop nativo con Tauri v2.
- **Próximo Foco Inmediato**:
  - Implementar el layout responsivo en 2 columnas para la pestaña Ajustes (`settings.tsx`) o validar en vivo con `npm run desktop:dev` en la rama `dev`.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
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
- **Dock Flotante sin Colisión**: Dock flotante en `_layout.tsx` con `bottom: 16` y `position: 'absolute'` acotado a 540dp en pantallas anchas sin afectar móvil.
- **Inconsistencia Temporal al Revertir Abonos a Terceros**: Resuelto guardando `previousLastPaymentDate`/`previousSettledAt` en `ThirdPartyChargeAllocation`.
- **Bloqueo Injustificado de Eliminación de Deudas**: Resuelto evaluando desembolsos reales en la app (`totalActualPaid > 0 || paidInstallments > initialPaidInstallments`).
- **Colisión Multi-Tarjeta en Deudas**: Resuelto con pastillas independientes por tarjeta y blindajes Flexbox.
- **Invalid DOM Nesting en Tauri/Web**: Resuelto sustituyendo `TouchableOpacity` exterior por `View` en `RecentTransactionsList`.
- **Destello de Ceros al Iniciar**: Resuelto reteniendo el Splash Screen nativo hasta confirmar rehidratación local (`hasHydrated`).

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

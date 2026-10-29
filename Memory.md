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
  - Card Modals responsivos centrados con transparencia real sobre la vista previa inferior.
  - Centro de Gestión de Pasivos y Cobros: Préstamos bancarios, préstamos a amigos, y Liquidación Mensual de Terceros (Fases 1 y 2).
  - Cobertura de Testing (56/56 tests en verde): Suites en `src/__tests__/` con Fake Timers deterministas para ciclos de facturación, amortizaciones contables y utilidades de fechas.
  - Especificación arquitectónica relacional en `DATABASE_SCHEMA.md` para Supabase/PostgreSQL.
- **Hitos Recientes Concluidos**:
  - **Transparencia Real y Erradicación del Fondo Gris en Modales (`[MODAL-TRANSPARENT-STACKS-DESKTOP-FIX-001]`)**: Configuración de `presentation: 'transparentModal'` y `contentStyle: { backgroundColor: 'transparent' }` en `(modal)/_layout.tsx` y `(app)/_layout.tsx`; erradica el fondo gris `#F2F2F2` inyectado por React Navigation Web; la pantalla previa permanece visible bajo el backdrop; 56/56 tests en verde (100%), 0 errores TS.
  - **Estilización Desktop para Modal de Nueva Deuda (`[MODAL-NEW-DEBT-DESKTOP-STYLING-001]`)**: Diálogo flotante centrado con `maxWidth: 620`, `maxHeight: '92%'`, backdrop `rgba(0,0,0,0.72)` y tecla `Escape` en Web/Tauri; 56/56 tests en verde.
  - **Estilización Desktop para Modal de Nueva Transacción (`[MODAL-NEW-TRANSACTION-DESKTOP-STYLING-001]`)**: Diálogo flotante centrado con `maxWidth: 580`, `maxHeight: '92%'`, backdrop translúcido y tecla `Escape`; 56/56 tests en verde.
  - **Limpieza Selectiva de Gastos y Deudas (`[SELECTIVE-DATABASE-CLEANUP-EXPENSES-DEBTS-001]`)**: Sustitución de `AsyncStorage.clear()` por purga selectiva en `settings-section-list.tsx`; preservación al 100% de `cards`, `banks`, `people`, perfiles y auth; 56/56 tests en verde.
  - **Erradicación de Redundancia y Blindaje de Cabecera Bancaria en Deudas (`[DEBTS-BANK-GROUP-HEADER-REDUNDANCY-FIX-001]`)**: Ocultamiento de `bankGroupHeaderCard` cuando solo existe 1 préstamo o 1 banco; 56/56 tests en verde.
- **Próximo Foco Inmediato**:
  - Subtarea 2: Estilización desktop de modales restantes (`cards-overview.tsx` y `legacy-card-expense.tsx`).

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO omitir `presentation: 'transparentModal'` en Stacks anidados de modales en Web**: De lo contrario, React Navigation inyecta un fondo gris opaco `#F2F2F2` que tapa la vista inferior.
- ❌ **NO mostrar modales a pantalla completa plana en escritorio**: Usar contenedor centrado tipo diálogo flotante (`maxWidth: 580-620`, backdrop translúcido, `Escape`).
- ❌ **NO usar `AsyncStorage.clear()` para reseteos**: Destruye tarjetas, bancos, contactos y credenciales; usar purga granular selectiva por store.
- ❌ **NO mostrar tarjetas de agrupación intermedias para 1 solo ítem**: Ocultar cabeceras redundantes cuando no hay múltiples entidades a comparar.
- ❌ **NO usar `flex: 0, flexShrink: 1` sin `minWidth` en Flexbox**: Provoca colapso vertical de texto en Web/Tauri.
- ❌ **NO destruir la sesión (`logout()`) por inactividad en segundo plano**: Las sesiones se mantienen persistentes con rotación de JWT/Refresh Token en Supabase; la inactividad solo debe activar bloqueo por PIN (`lockApp()`).
- ❌ **NO omitir la restauración de fechas al revertir pagos/abonos**: Restaurar siempre 'lastPaymentDate' y 'settledAt'.
- ❌ **NO desarrollar directamente en rama `main`**: Operar siempre sobre `dev`; mergear hacia `main` únicamente al cerrar bloques consolidados.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** a menos que el usuario lo solicite explícitamente (`Visual Freeze`).
- ❌ **NO usar imports estáticos cruzados entre Stores y Services**: Usar inyección de handlers para romper ciclos de require en Metro.
- ❌ **NO usar `Alert.alert` nativo**: Siempre implementar o reutilizar modales temáticos cyberpunk.
- ❌ **NO depender de selectores de funciones estáticas de Zustand en pantallas detrás de modales (`react-freeze`)**: Computar totales con `useMemo` directo y `focusRefreshKey`.
- ❌ **NO usar sufijo `/index` en rutas**: En Expo Router siempre navegar a `/(app)` o `/`, nunca `/(app)/index`.
- ❌ **NO declarar componentes con `function`**: Usar estrictamente `const Component = (props: Props): JSX.Element => { ... }`.
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores). Simular fechas con Fake Timers.

## 4. Bugs Críticos Resueltos & Blindajes
- **Fondo Gris Opaco en Modales Web**: Anulado el fondo `#F2F2F2` con `presentation: 'transparentModal'` y `contentStyle: { backgroundColor: 'transparent' }` en Stacks anidados.
- **Modales Estirados en Web/Tauri**: Diálogos flotantes centrados con backdrop translúcido y cierre exterior en `new-transaction.tsx` (580px) y `new-debt.tsx` (620px).
- **Limpieza Selectiva sin Pérdida de Tarjetas/Personas**: Reemplazado `AsyncStorage.clear()` por borrado acotado a transacciones y deudas locales y remotas en Supabase, preservando `cards`, `banks` y `people`.
- **Redundancia y Colapso de Tarjeta Bancaria**: Ocultamiento de cabecera bancaria en caso de 1 solo crédito y blindaje Flexbox (`minWidth: 0`, `numberOfLines={1}`) en `debts.tsx`.

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

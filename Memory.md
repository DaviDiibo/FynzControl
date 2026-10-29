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
  - **Limpieza Selectiva de Gastos y Deudas (`[SELECTIVE-DATABASE-CLEANUP-EXPENSES-DEBTS-001]`)**: Sustitución de `AsyncStorage.clear()` por purga selectiva en `settings-section-list.tsx`; preservación al 100% de `cards`, `banks`, `people`, perfiles y auth; sincronización y vaciado remoto en Supabase (`transactions`, `third_party_card_charges`, `friend_loans`, `personal_debts`); 56/56 tests en verde (100%), 0 errores TS.
  - **Erradicación de Redundancia y Blindaje de Cabecera Bancaria en Deudas (`[DEBTS-BANK-GROUP-HEADER-REDUNDANCY-FIX-001]`)**: Ocultamiento de `bankGroupHeaderCard` cuando solo existe 1 préstamo o 1 banco; eliminación de `flex: 0, flexShrink: 1` y blindaje Flexbox (`minWidth: 0`, `numberOfLines={1}`); 56/56 tests en verde.
  - **Sesión Persistente y Auto-Refresh de Tokens (`[PERSISTENT-AUTH-SESSION-AND-AUTO-REFRESH-001]`)**: Erradicación del cierre destructivo por inactividad de 60 minutos en `src/utils/session.ts`; conexión con Supabase `startAutoRefresh`/`stopAutoRefresh`; 56/56 tests en verde.
  - **Layout Responsivo en 2 Columnas para Ajustes (`[SETTINGS-RESPONSIVE-2-COLUMN-LAYOUT-001]`)**: Distribución simétrica en 2 columnas en `settings.tsx` y `settings-section-list.tsx` con `useIsWide(768)`; 56/56 tests en verde.
  - **Dock Flotante Centrado en Navegación de Tabs (`[TABS-DESKTOP-FLOATING-DOCK-001]`)**: Integración de `useIsWide(768)` en `app/(app)/(tabs)/_layout.tsx` para desktop/Tauri/Web; 56/56 tests en verde.
- **Próximo Foco Inmediato**:
  - Ejecutar limpieza selectiva (en UI de Ajustes o Supabase SQL) y consolidar hacia `main`.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
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
- ❌ **NO omitir `safeStorage` en tiendas Zustand**: `AsyncStorage` directo genera fallos en arranque nativo.
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores). Simular fechas con Fake Timers.

## 4. Bugs Críticos Resueltos & Blindajes
- **Limpieza Selectiva sin Pérdida de Tarjetas/Personas**: Reemplazado `AsyncStorage.clear()` por borrado acotado a transacciones y deudas locales y remotas en Supabase, preservando `cards`, `banks` y `people`.
- **Redundancia y Colapso de Tarjeta Bancaria**: Ocultamiento de cabecera bancaria en caso de 1 solo crédito y blindaje Flexbox (`minWidth: 0`, `numberOfLines={1}`) en `debts.tsx`.
- **Cierre Prematuro de Sesión por Inactividad**: Erradicado `logout()` forzoso a los 60 min en `session.ts`; sincronizado `startAutoRefresh`/`stopAutoRefresh` con `AppState` en `supabase.ts`.
- **Layout Responsivo en Ajustes**: División semántica en 2 columnas balanceando perfil/preferencias con datos/logout.
- **Dock Flotante sin Colisión**: Dock flotante en `_layout.tsx` con `bottom: 16` y `position: 'absolute'` acotado a 540dp en pantallas anchas sin afectar móvil.

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

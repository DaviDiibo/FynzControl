# Memoria Activa del Proyecto ControlFynz

> **Límite Estricto**: Este archivo mantiene el contexto de trabajo activo y NO debe superar las 100 líneas. Para la bitácora de tareas concluidas, consultar `HISTORY.md` bajo demanda.

## 1. Arquitectura y Stack Base
- **Framework**: Expo SDK 58 (React Native 0.88) + Expo Router (`app/` en la raíz).
- **Lenguaje & Tipado**: TypeScript estricto, arrow functions con tipado inline obligatorio (`const Comp = (props: Props): JSX.Element => ...`), cero `any` o `unknown`.
- **Estado y Persistencia**: Zustand con adaptador `safeStorage` (con respaldo resiliente en memoria). Claves activas: `*-storage-v2`.
- **UI & Tema**: Modo oscuro cyberpunk/neón (`#121212`, tarjetas `#1E1E1E`, acento `#00FFA3`, peligro `#FF453A`). Modales interactivos transparentes, nunca diálogos toscos nativos.
- **Multiplataforma**: Paridad iOS (KeyboardOffset 48dp, Safe Area), Android (KeyboardOffset 0dp, Edge-to-edge) y Web/Tauri Desktop (`useIsWide(768)`).
- **Backend / Infra & Sync**: Arquitectura Offline-First con proyección a Supabase (Auth, RLS, PostgreSQL). Sincronización Multi-Dispositivo en `sync-service.ts` y `use-app-hydration.ts`: Pull en hidratación, Focus Sync en Web/Móvil, Supabase Realtime e indicador de estado reactivo.
- **Testing & QA**: Jest 30 + `jest-expo` (~58.0.14). Verificación doble obligatoria (`npm test` 100% pass [130/130] + `npx tsc --noEmit` 0 errores) previo a cerrar cualquier tarea.

## 2. Estado Activo del Sprint y Foco Inmediato
- **Módulos Principales Culminados**:
  - 5 Tabs operativas con paridad móvil y escritorio: Dashboard, Movimientos, Deudas, Estadísticas y Ajustes.
  - Dock flotante centrado en barra de navegación inferior para pantallas de escritorio.
  - Todos los Card Modals adaptados como diálogos flotantes centrados con transparencia real sobre la vista previa.
  - Detalle de Tarjeta (`cards/[id].tsx`) con layout responsivo en 2 columnas para Web/Tauri y motor de proyección multi-período.
  - Pantalla de Detalle de Deudas en `app/(app)/debts/[id].tsx` con trazabilidad y auditoría histórica completa de pasivos propios y préstamos a amigos.
  - Centro de Gestión de Pasivos y Cobros: Préstamos bancarios, préstamos a amigos y Liquidación Mensual de Terceros (Fases 1 y 2).
  - Cobertura de Testing (130/130 tests en verde): Suites en `src/__tests__/` (divisas, ciclos de facturación, amortizaciones, fechas, integración contable, updater-service).
- **Hitos Recientes Concluidos**:
  - **Actualizador Desktop Auto-Update Completo (`[TASK-DESKTOP-UPDATER-COMPLETE]`)**: Sistema nativo Tauri v2 Updater (Fases 1-4). Plugin Rust `tauri-plugin-updater`, claves Minisign, capacidades IPC, servicio cliente `updater-service.ts`, suite Jest (130/130) y UI Cyberpunk en Ajustes con modal de descarga y reinicio. Instalador NSIS re-compilado (7.96 MB). 0 errores TS.
  - **Transición 100% Oscura y Cero Destello en Tabs (`[TASK-DESKTOP-DARK-THEME-TAB-TRANSITION-001]`)**: Inyección CSS `#121212` en `<Head>`, `ThemeProvider` oscuro, `sceneStyle`, `lazy: false` y `animation: 'fade'` en `<Tabs>`; instalador NSIS re-compilado (6.92 MB). 121/121 tests y 0 errores TS.
  - **Icono Runtime en Barra de Tareas Desktop (`[TASK-DESKTOP-TASKBAR-WM-SETICON-001]`)**: Asignación explícita `window.set_icon` (`WM_SETICON`) con `include_image!("icons/128x128.png")` en `lib.rs` y `cargo:rerun-if-changed` en `build.rs`; instalador NSIS re-compilado (6.91 MB). 121/121 tests y 0 errores TS.
  - **Logotipos Oficiales, Favicon y Branding (`[TASK-OFFICIAL-BRAND-LOGOS]`)**: Integración de `LogoMiniaturaFynz` y `LogoFynz` en `assets/images/` y `public/` (favicon web, icon, splash nativo), calibración en `app.json`, inyección `<Head>` en `_layout.tsx` y cabecera en `login.tsx`. 121/121 tests y 0 errores TS.
  - **Términos y Política de Privacidad (`[TASK-LEGAL-PRIVACY-AND-TERMS]`)**: Rutas públicas y nativas `app/privacy.tsx` y `app/terms.tsx` (cero venta de datos, RLS, exención financiera bancaria), con accesos en login (`login.tsx`) y Ajustes (`settings-section-list.tsx`). 121/121 tests y 0 errores TS.
  - **Sincronización Offline-First y Realtime Granular (`[TASK-SYNC-PHASE-3-COMPLETE]`)**: `TombstoneQueue` persistida en `safeStorage`, doble escudo anti-zombis, 7 handlers granulares en memoria sobre Supabase Realtime (suprimiendo `triggerDebouncedPull`) y backoff exponencial en WebSockets (`sync-service.ts`, `use-app-hydration.ts`). 121/121 tests y 0 errores TS.
  - **Higiene Total de Dependencias y Código Huérfano (`[TASK-HYGIENE-PHASE-2-COMPLETE]`)**: Eliminación de 5 dependencias en `package.json` y purga completa de los 14 archivos huérfanos de plantilla (`animated-icon.*`, `app-tabs.*`, `external-link`, `hint-row`, `web-badge`, `themed-*`, `use-theme`, `use-color-scheme.*`, `theme.ts`, `global.css`). 121/121 tests y 0 errores TS.
  - **Branding Oficial en Escritorio e Instalador (`[TASK-DESKTOP-BRANDING-TASKBAR-AND-INSTALLER-001]`)**: Iconos oficiales en `src-tauri/icons/` (`icon.ico`), `installerIcon` en NSIS, y fijación en barra de tareas de Windows vía `SetCurrentProcessExplicitAppUserModelID`; instalador re-compilado (6.88 MB). 121/121 tests en verde y 0 errores TS.
  - **Plantilla Cyberpunk OAuth Desktop (`[TASK-DESKTOP-OAUTH-HTML-TEMPLATE-001]`)**: Plantilla HTML5/CSS neón con autocierre de pestaña en `tauri-helpers.ts` para retorno de Google OAuth; instalador NSIS re-compilado (6.69 MB). 121/121 tests en verde y 0 errores TS.
  - **Corrección de Permisos ACL e Instalador Desktop (`[TASK-DESKTOP-ACL-PERMISSIONS-FIX-001]`)**: Permisos IPC explícitos `oauth:allow-start` y `oauth:allow-cancel` en `default.json`, `devtools: true` en `tauri.conf.json` e instalador NSIS re-compilado (6.69 MB). 121/121 tests en verde y 0 errores TS.
  - **Google OAuth Nativo en Escritorio (`[TASK-DESKTOP-GOOGLE-OAUTH-TAURI-001]`)**: Integración de `tauri-plugin-oauth` y `tauri-plugin-opener` en Tauri v2; loopback local dinámico con navegador del sistema en `auth-store.ts` evitando `disallowed_useragent`. 121/121 tests en verde y 0 errores TS.
  - **Instalador de Escritorio Oficial Windows (`[TASK-DESKTOP-TAURI-BUILD-001]`)**: Compilación nativa release con Tauri v2 y empaquetador NSIS; generación del ejecutable de instalación `ControlFynz_1.0.0_x64-setup.exe` (6.62 MB) en `src-tauri/target/release/bundle/nsis/`.
  - **Actualización a Expo SDK 58 y React Native 0.88 (`[TASK-EXPO-SDK-58-UPGRADE]`)**: Migración oficial a `expo@~58.0.23`, `react-native@0.88.1` y `expo-router@~58.0.30` restaurando compatibilidad con Expo Go en iOS (Apple); ambient augmentation `react-native-augmentations.d.ts`, modernización con `useWindowDimensions` en `useIsWide` y guardas de color en `Tabs`. 121/121 tests en verde y 0 errores TS.
  - **Modales In-App Cyberpunk para Logout y Eliminación (`[TASK-CYBERPUNK-MODALS-LOGOUT-AND-DELETION-001]`)**: Reemplazo total de alertas nativas/navegador por componentes `<Modal transparent>` estilizados (`#1E1E1E`, acento `#FF453A`, spinners y feedback in-app) para salida y borrado de cuenta en `settings-section-list.tsx`; `logout()` instantáneo con `{ scope: 'local' }` y purga explícita en `auth-store.ts`. 121/121 tests en verde y 0 errores TS.
  - **Eliminación Permanente de Cuenta e Integridad RPC (`[TASK-ACCOUNT-PERMANENT-DELETION-RPC-FIX]`)**: Función RPC `delete_user_account()` con `SECURITY DEFINER` y `DELETE FROM auth.users` en cascada atómica relacional; blindaje contra silenciamiento de errores RPC en `auth-store.ts` y flujo estricto de purga en `settings-section-list.tsx`. 121/121 tests en verde y 0 errores TS.
  - **Sincronización y UX Base Web/Móvil (`[TASK-MULTI-DEVICE-CLOUD-SYNC]`, `[TASK-TRANSACTIONS-CHRONOLOGICAL-SORTING]`, `[TASK-STATIC-WEB-TAB-TITLE]`, `[TASK-POLISH-LOGOUT-SCROLL-SYNC-INDICATOR]`)**: Título web estático, orden cronológico de movimientos, focus sync, indicador reactivo y confirmación de logout. 121/121 tests en verde y 0 errores TS.
- **Próximo Foco Inmediato**:
  - Monitoreo en producción, release v1.0.0 y soporte continuo de sincronización y UX.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO usar alertas nativas ni `window.confirm` para acciones de sesión o borrado (Regla de Modales In-App)**: Usar siempre componentes `<Modal transparent>` con diseño Cyberpunk y spinners integrados para garantizar paridad visual y funcional entre Web, iOS y Android.
- ❌ **NO silenciar fallos de RPCs destructivos de cuenta (Regla de Borrado Definitivo)**: `deleteAccount` jamás debe cerrar sesión o purgar datos locales si el servidor rechaza o no encuentra el procedimiento RPC.
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
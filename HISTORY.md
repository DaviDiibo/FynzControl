# Historial de Tareas y Procesos Concluidos (ControlFynz)

Este archivo almacena la memoria episódica y la bitácora técnica de tareas e hitos concluidos.
**Regla para agentes de IA**: Este archivo es de consulta histórica exclusivamente bajo demanda (*on-demand*). No debe inyectarse en el contexto de trabajo continuo salvo cuando se requiera investigar precedentes técnicos, decisiones pasadas o trazabilidad de un cambio específico.

---

## Bitácora de Tareas Concluidas

- `[TASK-OFFICIAL-BRAND-LOGOS]` (2026-11-03): Integración de Logotipos Oficiales, Iconos y Splash Screen:
  - Archivos intervenidos:
    * `assets/images/icon.png`
    * `assets/images/favicon.png`
    * `assets/images/android-icon-foreground.png`
    * `assets/images/splash-icon.png`
    * `app.json`
    * `app/(auth)/login.tsx`
  - Resumen técnico:
    * Se procesaron y generaron los activos de imagen oficiales a partir de `public/LogoMiniaturaFynz.jpeg` y `public/LogoFynz.jpeg`: icono de aplicación móvil, icono adaptativo de Android, favicon web y splash screen de alta resolución con fondo oscuro `#121212`.
    * En `app.json`: Se calibraron las dimensiones y fondo de `expo-splash-screen` (`imageWidth: 150`, `backgroundColor: "#121212"`) y el icono adaptativo de Android.
    * En `app/(auth)/login.tsx`: Se integró el logotipo oficial de ControlFynz en la cabecera de autenticación tanto para la vista móvil como para el panel responsivo de escritorio.
  - Decisiones permanentes y verificación:
    * Erradicación total de iconos y recursos de demostración de Expo, cumpliendo las directrices de identidad visual para tiendas.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-AUTH-GATE-PUBLIC-ROUTES]` (2026-11-03): Excepción de Rutas Públicas Legales en Auth Gate (`_layout.tsx`):
  - Archivos intervenidos:
    * `app/_layout.tsx`
  - Resumen técnico:
    * Se corrigió la redirección forzada a login al pulsar los enlaces legales desde la pantalla de autenticación.
    * Se definió la lista blanca `PUBLIC_ROUTES = ['terms', 'privacy']` y se integró la condición `!isPublicRoute` en el hook de navegación del Auth Gate, permitiendo que usuarios no autenticados puedan consultar libremente los Términos y Condiciones y la Política de Privacidad y regresar al login con `router.back()`.
  - Decisiones permanentes y verificación:
    * Regla de Rutas Públicas: Las páginas de consulta legal pre-login deben estar registradas en la lista blanca de rutas públicas para no ser interceptadas por el guardia de sesión.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-TERMS-AND-CONDITIONS-SCREEN]` (2026-11-03): Pantalla de Términos y Condiciones y Enlaces de Acceso:
  - Archivos intervenidos:
    * `app/terms.tsx` (nuevo archivo)
    * `app/(auth)/login.tsx`
    * `src/components/settings/settings-section-list.tsx`
  - Resumen técnico:
    * Se creó la ruta autónoma `app/terms.tsx` con redacción jurídica exhaustiva adaptada a ControlFynz: aceptación del servicio, cláusula expresa de exención aclarando que la app es de gestión y cálculo personal y no una entidad bancaria ni asesor financiero regulado, titularidad de propiedad intelectual, funcionamiento offline-first con Supabase RLS y derecho a rescisión mediante la eliminación definitiva de la cuenta en Ajustes.
    * En `app/(auth)/login.tsx`: Se actualizó el pie de página de autenticación para enlazar con un toque tanto a `/terms` como a `/privacy`.
    * En `src/components/settings/settings-section-list.tsx`: Se agregó en la sección de SEGURIDAD & PRIVACIDAD la opción navegable a `/terms` con icono `document-text-outline`.
  - Decisiones permanentes y verificación:
    * Requisito de blindaje jurídico y cumplimiento para publicación en Google Cloud Console, Google Play y App Store Connect.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-PRIVACY-POLICY-SCREEN]` (2026-11-03): Pantalla de Política de Privacidad y Enlaces de Acceso:
  - Archivos intervenidos:
    * `app/privacy.tsx` (nuevo archivo)
    * `app/(auth)/login.tsx`
    * `src/components/settings/settings-section-list.tsx`
  - Resumen técnico:
    * Se creó la ruta `app/privacy.tsx` adaptada a la arquitectura real de ControlFynz: términos legales rigurosos sobre recolección exclusiva de datos financieros y de cuenta, declaración taxativa de no comercialización ni monetización de datos, almacenamiento local seguro con Supabase PostgreSQL y políticas RLS aisladas por `auth.uid()`, y explicación del derecho de supresión permanente mediante el botón en Ajustes.
    * En `app/(auth)/login.tsx`: Se incorporó al pie del formulario el texto legal interactivo con enlace a `/privacy` para usuarios previos al registro o login.
    * En `src/components/settings/settings-section-list.tsx`: Se agregó en la tarjeta de SEGURIDAD & PRIVACIDAD la opción navegable a `/privacy` con icono de escudo neón.
  - Decisiones permanentes y verificación:
    * Cumplimiento con Apple Guideline 5.1.1 y Google Play User Data Policy para aprobación en tiendas y publicación de OAuth Consent Screen en Google Cloud Console.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-FIX-REALTIME-SUBSCRIPTION-RACE]` (2026-11-03): Corrección de Ciclo de Vida y Limpieza de Canales en Supabase Realtime:
  - Archivos intervenidos:
    * `src/services/sync-service.ts`
  - Resumen técnico:
    * Se corrigió la excepción `cannot add postgres_changes callbacks after subscribe()` en Supabase Realtime.
    * En `startRealtimeSubscription`: Se agregó una guardia de canal saludable (`joined` o `joining`) para evitar re-suscripciones innecesarias, y se implementó la purga proactiva de cualquier canal previo con tópico `user-sync-` en `supabase.getChannels()` mediante `supabase.removeChannel(ch)` antes de instanciar un canal nuevo.
    * En `stopRealtimeSubscription`: Se incorporó la remoción de todos los canales de sincronización de `supabase.getChannels()`, garantizando que el singleton global de Supabase no retenga instancias suscritas zombis.
  - Decisiones permanentes y verificación:
    * Regla de Canales Realtime Limpios: Siempre remover canales previos del registro del cliente Supabase antes de instanciar uno nuevo con el mismo tópico.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-SYNC-REALTIME-GRANULAR-3B]` (2026-11-03): Reconciliación Granular en Tiempo Real (Supabase WebSockets) y Backoff Exponencial:
  - Archivos intervenidos:
    * `src/services/sync-service.ts`
  - Resumen técnico:
    * Se configuró la reconciliación granular en memoria para las 7 tablas maestras en `startRealtimeSubscription` (`transactions`, `personal_debts`, `friend_loans`, `third_party_card_charges`, `people`, `credit_cards`, `banks`), actualizando y filtrando entidades directamente sobre Zustand con `mergeById` y transformadores tipados.
    * Se eliminó el llamado a `triggerDebouncedPull()` en los eventos regulares de WebSockets, suprimiendo la ráfaga de 7 consultas `SELECT *` consecutivas y reduciendo drásticamente el consumo de red.
    * Se implementó el mecanismo de reconexión con **backoff exponencial** (`1s`, `2s`, `4s`... hasta `30s`) ante estados `TIMED_OUT`, `CHANNEL_ERROR` y `CLOSED`, con reseteo de reintentos al conectar exitosamente (`SUBSCRIBED`) y cancelación de temporizadores en `stopRealtimeSubscription`.
  - Decisiones permanentes y verificación:
    * Replicación multi-dispositivo instantánea a 0ms sin recargas completas de la base de datos.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-SYNC-TOMBSTONE-QUEUE-3A]` (2026-11-03): Cola de Bajas Persistida (Tombstone Queue) y Escudo Anti-Zombis:
  - Archivos intervenidos:
    * `src/services/sync-service.ts`
    * `src/hooks/use-app-hydration.ts`
  - Resumen técnico:
    * Se implementó la arquitectura de Cola de Bajas Persistida (`TombstoneQueue`) en `sync-service.ts` utilizando `safeStorage` (clave `'controlfynz-pending-deletions-v1'`).
    * Se conectó `enqueuePendingDeletion` al listener `deleteRemoteRecord`, registrando tickets de baja persistidos en disco inmediatamente al ejecutarse cualquier acción de borrado en los stores locales (`transactions`, `debts`, `cards`, `banks`), garantizando latencia 0ms en la UI.
    * Se implementó el **Escudo de Entrada en `syncPull`**: Filtra y descarta proactivamente cualquier registro remoto de Supabase cuyo ID figure en la cola local de bajas pendientes, eliminando definitivamente la reaparición de "registros zombis".
    * Se implementó el **Escudo de Salida en `syncPush` y `syncAll`**: Drenaje prioritario mediante `flushPendingDeletions()`, con reintentos y persistencia en disco si el dispositivo está sin red.
    * En `src/hooks/use-app-hydration.ts`, se activó el drenaje automático al recuperar el foco (*Focus Sync*) y tras la hidratación inicial de stores.
  - Decisiones permanentes y verificación:
    * Sincronización basada en intenciones y acciones persistidas: las órdenes de borrado nunca se pierden en el aire ante desconexiones.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-HYGIENE-LOTE-2G-THEME-CSS]` (2026-11-03): Eliminación Final de Constantes de Plantilla (`theme.ts` y `global.css`):
  - Archivos intervenidos:
    * `src/constants/theme.ts` (eliminado)
    * `src/global.css` (eliminado)
  - Resumen técnico:
    * Se eliminaron de disco los dos últimos archivos de estilos y paleta de plantilla de Expo, completando al 100% la erradicación de los 14 archivos huérfanos del boilerplate inicial.
  - Decisiones permanentes y verificación:
    * El sistema visual de la app reside única y exclusivamente en `src/theme/colors.ts`.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-HYGIENE-LOTE-2F-COLOR-SCHEME]` (2026-11-03): Eliminación de Archivos Huérfanos de Plantilla (`use-color-scheme.ts` y `.web.ts`):
  - Archivos intervenidos:
    * `src/hooks/use-color-scheme.ts` (eliminado)
    * `src/hooks/use-color-scheme.web.ts` (eliminado)
  - Resumen técnico:
    * Se eliminaron de disco ambos hooks de alternancia de color de plantilla heredados de Expo, sin uso tras la purga de `useTheme` y desacoplados del diseño cyberpunk persistente de ControlFynz.
  - Decisiones permanentes y verificación:
    * Mantener el directorio `src/hooks/` exclusivamente con hooks de lógica de negocio y estado.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-HYGIENE-LOTE-2E-THEMED-COMPONENTS]` (2026-11-03): Eliminación de Archivos Huérfanos de Plantilla (`themed-text.tsx`, `themed-view.tsx` y `use-theme.ts`):
  - Archivos intervenidos:
    * `src/components/themed-text.tsx` (eliminado)
    * `src/components/themed-view.tsx` (eliminado)
    * `src/hooks/use-theme.ts` (eliminado)
  - Resumen técnico:
    * Se eliminaron de disco los componentes tipográficos y contenedores temáticos de plantilla y su hook consumidor `useTheme`, consolidando el uso exclusivo del sistema de diseño propio de ControlFynz en `src/theme/colors.ts`.
  - Decisiones permanentes y verificación:
    * Erradicación total de componentes de diseño de plantilla que competían con la arquitectura de diseño cyberpunk de la app.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-HYGIENE-LOTE-2D-HINT-BADGE]` (2026-11-03): Eliminación de Archivos Huérfanos de Plantilla (`hint-row.tsx` y `web-badge.tsx`):
  - Archivos intervenidos:
    * `src/components/hint-row.tsx` (eliminado)
    * `src/components/web-badge.tsx` (eliminado)
  - Resumen técnico:
    * Se eliminaron de disco ambos componentes auxiliares de demostración del template de Expo, desacoplando la dependencia de `themed-text` y `themed-view`.
  - Decisiones permanentes y verificación:
    * Purga secuencial ordenada de componentes no utilizados para preservar la compilación limpia.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-HYGIENE-LOTE-2C-APP-TABS]` (2026-11-03): Eliminación de Archivos Huérfanos de Plantilla (`app-tabs.*` y `external-link.tsx`):
  - Archivos intervenidos:
    * `src/components/app-tabs.tsx` (eliminado)
    * `src/components/app-tabs.web.tsx` (eliminado)
    * `src/components/external-link.tsx` (eliminado)
  - Resumen técnico:
    * Se eliminaron de disco los 3 archivos de navegación de demostración de Expo, los cuales formaban una isla de código cerrada sustituida por `app/(app)/(tabs)/_layout.tsx`.
  - Decisiones permanentes y verificación:
    * Aplicación continua de la Regla 9 (Zero Dead Code) para eliminar componentes de plantilla obsoletos.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-HYGIENE-LOTE-2B-ANIMATED-ICON]` (2026-11-03): Eliminación de Archivos Huérfanos de Plantilla (`animated-icon.*`):
  - Archivos intervenidos:
    * `src/components/animated-icon.tsx` (eliminado)
    * `src/components/animated-icon.web.tsx` (eliminado)
    * `src/components/animated-icon.module.css` (eliminado)
  - Resumen técnico:
    * Se eliminaron de disco los 3 archivos componentes de animación splash heredados del template de Expo, los cuales dependían de la librería desinstalada `react-native-worklets` y carecían de importaciones en la aplicación.
  - Decisiones permanentes y verificación:
    * Purga continua de código muerto en cumplimiento de la Regla 9 (Zero Dead Code).
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-HYGIENE-LOTE-2A-DEPS]` (2026-11-03): Saneamiento de Dependencias y Metadata en `package.json`:
  - Archivos intervenidos:
    * `package.json`
  - Resumen técnico:
    * Se eliminaron 5 dependencias en desuso/huérfanas (`@expo/ui`, `expo-glass-effect`, `expo-system-ui`, `expo-symbols`, `react-native-worklets`), reduciendo el bundle y posibles conflictos de autolinking en Expo SDK 57.
    * Se actualizó la propiedad `"name"` de `"temp_app"` a `"ControlFynz"`, homologando la metadata del proyecto con `app.json`.
  - Decisiones permanentes y verificación:
    * Mantener el árbol de dependencias estrictamente limpio de paquetes no importados.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-ACCOUNT-PERMANENT-DELETION]` (2026-11-03): Eliminación Permanente de Cuenta y Purga de Sincronización:
  - Archivos intervenidos:
    * `src/store/auth-store.ts`
    * `src/services/sync-service.ts`
    * `src/components/settings/settings-section-list.tsx`
  - Resumen técnico:
    * En `src/services/sync-service.ts`: Se implementó y exportó `purgeLocalSyncState()`, el cual detiene canales Realtime de Supabase (`stopRealtimeSubscription`), resetea banderas de sincronización (`isSyncInProgress`, `isPullInProgress`, `isPushInProgress`, `lastSyncTimestamp`) y notifica a los listeners reactivos.
    * En `src/store/auth-store.ts`: Se añadió la acción `deleteAccount: () => Promise<{ success: boolean; error?: string }>`, que invoca `supabase.rpc('delete_user_account')` (con manejo defensivo de errores), ejecuta `supabase.auth.signOut()`, purga stores de dominio locales (`purgeAllDomainStores`), elimina claves de `safeStorage` y resetea el estado de sesión a nulo.
    * En `src/components/settings/settings-section-list.tsx`: Se implementó el controlador `handleDeleteAccount` con diálogo de confirmación en dos pasos (`Alert.alert`) y botón destructivo estilizado en `#FF453A`, dando feedback visual de carga antes de purgar los datos y redirigir al login.
  - Decisiones permanentes y verificación:
    * Cumplimiento estricto de Apple Guideline 5.1.1(v) y Google Play Data Safety para aprobación obligatoria en tiendas.
    * Doble paso de confirmación nativo para prevenir pérdidas accidentales de cuentas.
    * Verificación: 121/121 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-POLISH-LOGOUT-SCROLL-SYNC-INDICATOR]` (2026-11-02): Confirmación de Cierre de Sesión, Corrección de Scroll en Dashboard e Indicador Visual de Sincronización:
  - Archivos intervenidos:
    * `src/services/sync-service.ts`
    * `src/components/settings/settings-section-list.tsx`
    * `app/(app)/(tabs)/index.tsx`
  - Resumen técnico:
    * En `src/services/sync-service.ts`: Se implementó el registro de `lastSyncTimestamp`, la función `getLastSyncTime()` y la suscripción reactiva `subscribeToSyncStatus(listener)` para notificar en vivo `isSyncing` y `lastSyncTime`. Aplicación de Regla 9 (Zero Dead Code).
    * En `src/components/settings/settings-section-list.tsx`: Se añadió diálogo nativo de confirmación `Alert.alert` al pulsar 'Cerrar Sesión' para evitar salidas involuntarias con pérdida de caché local, y se integró en la tarjeta 'DATOS & ALMACENAMIENTO' una fila interactiva con icono de nube/spinner, última hora de sincronización y botón interactivo `[ SINCRONIZAR ]` manual.
    * En `app/(app)/(tabs)/index.tsx`: Se homologó `paddingBottom: 110` en el scroll del Dashboard, resolviendo el solapamiento de los últimos movimientos con el TabBar flotante inferior.
  - Decisiones permanentes y verificación:
    * Confirmación de Logout: Siempre proteger el cierre de sesión con `Alert.alert` para prevenir purgas accidentales de caché local.
    * Scroll Padding Homogéneo: Todos los contenedores de scroll en las pestañas principales deben mantener `paddingBottom: 110` para librar el TabBar flotante.
    * Indicador Reactivo de Sincronización: Exponer `subscribeToSyncStatus` y `getLastSyncTime()` para dar feedback visual reactivo y permitir sincronizaciones manuales bajo demanda desde Ajustes.
    * Verificación y calidad: 121/121 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-STATIC-WEB-TAB-TITLE]` (2026-11-02): Título Estático de la Pestaña Web ('ControlFynz'):
  - Archivos intervenidos:
    * `app/_layout.tsx`
    * `app.json`
  - Resumen técnico:
    * En `app/_layout.tsx`: Se importaron `Head` desde `'expo-router/head'` y `Platform` desde `'react-native'`, renderizando `<Head><title>ControlFynz</title></Head>` en el layout raíz y sincronizando `document.title = 'ControlFynz'` en Web (`Platform.OS === 'web'`). Con esto se elimina el fallback del navegador que mostraba nombres de rutas (`index`, `transactions`, `debts`) o URLs con query strings de autenticación (`?code=...`), fijando el título permanentemente en "ControlFynz".
    * En `app.json`: Se actualizaron `"name": "ControlFynz"` y `"slug": "controlfynz"` eliminando `"temp_app"`.
  - Decisiones permanentes y verificación:
    * Título Web Estático: Usar `<Head><title>ControlFynz</title></Head>` y `document.title` en `app/_layout.tsx` para mantener el título de la pestaña del navegador estático sin que se altere por rutas o query params de OAuth.
    * Verificación y calidad: 121/121 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-TRANSACTIONS-CHRONOLOGICAL-SORTING]` (2026-11-01): Ordenamiento Cronológico Estricto de Movimientos (Fecha y Hora):
  - Archivos intervenidos:
    * `app/(app)/(tabs)/transactions.tsx`
    * `app/(app)/(tabs)/index.tsx`
    * `src/services/sync-service.ts`
  - Resumen técnico:
    * En `app/(app)/(tabs)/transactions.tsx`: Se ordenó descendentemente el array `monthTransactions` por timestamp exacto (`t.date || t.createdAt`), logrando que los grupos diarios y los movimientos individuales se listen estrictamente por hora de ingreso (más reciente arriba).
    * En `app/(app)/(tabs)/index.tsx`: Se ordenaron las transacciones por fecha y hora antes de tomar los 5 primeros elementos con `.slice(0, 5)` para el widget de "Últimos Movimientos".
    * En `src/services/sync-service.ts`: Se añadió `.order('date', { ascending: false })` en las consultas de Supabase y se garantizó el orden cronológico en `mergeById` y eventos Realtime. Aplicación de la Regla 9 de limpieza continua de código.
  - Decisiones permanentes y verificación:
    * Ordenamiento Cronológico de Movimientos: SIEMPRE ordenar transacciones descendentemente por timestamp (`b.date - a.date`) antes de agrupar o hacer `.slice()`, garantizando que el último gasto registrado aparezca en la cima.
    * Verificación y calidad: 121/121 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-MULTI-DEVICE-CLOUD-SYNC]` (2026-11-01): Sincronización Automática Multi-Dispositivo (Supabase Pull & Realtime):
  - Archivos intervenidos:
    * `src/store/auth-store.ts`
    * `src/hooks/use-app-hydration.ts`
    * `src/services/sync-service.ts`
  - Resumen técnico:
    * En `src/store/auth-store.ts`: Se incluyó el evento `'INITIAL_SESSION'` en el listener `onAuthStateChange` y en `checkAuth()`/`initializeAuth()`, asegurando que al recargar la página en navegador (F5) o iniciar la app con sesión persistente (Google o email), se ejecute inmediatamente `syncService.syncAll()` e inicialice la conexión Realtime.
    * En `src/hooks/use-app-hydration.ts`: Se añadió el efecto post-hidratación para ejecutar `syncPull()` silencioso cuando `isHydrated === true` con sesión activa. Se implementó Focus Sync (`window.addEventListener('focus')` en Web y `AppState.change === 'active'` en móvil con cooldown de 6s y protección de concurrencia) para actualizar automáticamente los datos al regresar a la ventana.
    * En `src/services/sync-service.ts`: Se implementó el canal Supabase Realtime (`user-sync-${userId}`) escuchando `postgres_changes` en el schema `public` filtrado por `user_id`. Las transacciones y mutaciones remotas se reconcilian atómicamente en `useTransactionsStore` en tiempo real (vía WebSockets). Se aplicó la Regla 9 de limpieza de código en los tres archivos intervenidos.
  - Decisiones permanentes y verificación:
    * Sincronización al Recargar y Realtime: Escuchar siempre `'INITIAL_SESSION'` en Supabase auth para disparar `syncAll` al refrescar el navegador (F5) y mantener suscripción a WebSockets para replicación instantánea entre dispositivos.
    * Verificación y calidad: 121/121 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-DEBT-DETAIL-SCREEN-PHASE-2]` (2026-11-01): Pantalla de Detalle Histórico y Bitácora por Deuda (`debts/[id]`):
  - Archivos intervenidos:
    * `app/(app)/debts/[id].tsx` (NUEVO ARCHIVO)
    * `app/(app)/(tabs)/debts.tsx`
  - Resumen técnico:
    * Creación de la pantalla completa `app/(app)/debts/[id].tsx` para deudas personales (`PersonalDebt`) y préstamos a amigos (`FriendLoan`) con TypeScript estricto, tema cyberpunk (fondo `#121212`, tarjetas `#1E1E1E`, acentos neón `#00FFA3`).
    * Integra Header con retorno, entidad/persona y badge semafórico reactivo de 5 niveles.
    * Hero Card Financiero con saldo restante, monto original, barra de progreso de cuotas amortizadas, cuota mensual nominal, ahorros acumulados por liquidación anticipada y fechas de ciclo de vida.
    * Bitácora Histórica de Pagos que agrupa y lista cronológicamente las transacciones vinculadas por `relatedDebtId` o `relatedLoanId`, indicando fecha, monto, cuenta bancaria utilizada, modo de pago y estado vacío amigable.
    * Barra de acción inferior flotante para registrar pagos y abonos directamente desde el detalle con modales conectados y doble impacto contable.
    * En `app/(app)/(tabs)/debts.tsx`: conexión del tap de tarjetas activas y liquidadas a `router.push({ pathname: '/debts/[id]', params: { id: item.id } })` con protección `e.stopPropagation()` en botones de acción rápida.
  - Decisiones permanentes y verificación:
    * Pantalla de Detalle de Deudas: Despliegue en ruta dinámica `app/(app)/debts/[id].tsx` para auditoría y trazabilidad histórica de deudas personales y préstamos, preservando la navegación canónica de Expo Router y el aislamiento de modales de acción rápida.
    * Verificación y calidad: 121/121 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-DASHBOARD-URGENCY-CALIBRATION-1B]` (2026-11-01): Calibración de Semáforos en Dashboard:
  - Archivos intervenidos:
    * `src/components/dashboard/upcoming-debts-card.tsx`
    * `src/__tests__/debt-dates-liquidation.test.ts`
  - Resumen técnico:
    * En `upcoming-debts-card.tsx`: Se implementó y exportó `getDashboardUrgencyStatus` calibrando un semáforo preventivo de 4 niveles (`overdue` < 0d en rojo, `today` = 0d en rojo, `urgent` <= 3d en naranja, `warning` <= 7d en amarillo dorado `#FFD60A`, y `normal` > 7d en verde). Se eliminó la disonancia donde ítems que alertaban en el widget con 4 a 7 días restantes mostraban un badge verde "En plazo", presentando ahora la advertencia dorada "Próximo (Xd)".
    * En `src/__tests__/debt-dates-liquidation.test.ts`: Se añadió el Caso 22 validando los 5 estados de urgencia, verificando que 5 días devuelve `warning` (#FFD60A) y nunca verde.
  - Decisiones permanentes y verificación:
    * Semáforos Preventivos en Dashboard: Alertas entre 4 y 7 días deben usar nivel `warning` (amarillo/dorado `#FFD60A`) y nunca `normal` verde, manteniendo la coherencia semafórica preventiva.
    * Verificación y calidad: 121/121 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-DEBTS-ACCOUNTING-INTEGRITY-1A]` (2026-11-01): Integridad Contable en Deudas y Transacciones:
  - Archivos intervenidos:
    * `app/(app)/(modal)/new-transaction.tsx`
    * `src/store/debts-store.ts`
    * `src/__tests__/debt-dates-liquidation.test.ts`
  - Resumen técnico:
    * En `new-transaction.tsx`: Se agregaron explícitamente `relatedDebtId: selectedDebtId` y `relatedLoanId: selectedLoanId` a la llamada a `addTransaction`, permitiendo la trazabilidad directa por ID para anulaciones y reversiones sin depender de coincidencias por texto en el título.
    * En `src/store/debts-store.ts`:
      - En `revertPersonalDebtPayment`: Se sincronizó `lastPaymentDate`, permitiendo restaurar la fecha previa o resetear a `undefined` al anular pagos, asegurando que `getDebtDueStatus` devuelva la cuota a su estado real de pendiente/vencida.
      - En `recordMonthlyPersonAbono` y `recordThirdPartyInstallmentAbono`: Se incorporó la tolerancia de punto flotante IEEE-754 (`newRemaining <= 0.05 || newPaidInstallments >= cargo.installmentsCount`), forzando `newRemaining = 0`, `settled = true` y `paidInstallmentsCount = cargo.installmentsCount`, evitando que compras a cuotas queden abiertas indefinidamente por centavos residuales ($0.01).
    * En `src/__tests__/debt-dates-liquidation.test.ts`: Se agregaron los Casos 20 y 21 con Fake Timers validando la reversión de fechas de deuda y la liquidación exacta del centavo residual.
  - Decisiones permanentes y verificación:
    * Trazabilidad de Deudas en Transacciones: Toda transacción generada para deudas o préstamos DEBE portar `relatedDebtId` o `relatedLoanId` para garantizar su reversión exacta por ID sin depender de descripciones o títulos.
    * Reversión de `lastPaymentDate`: Al revertir un pago de deuda personal, `lastPaymentDate` debe resetearse para no fingir que la deuda sigue al día en el período actual.
    * Tolerancia de Centavos IEEE-754 en Terceros: Liquidar con `newRemaining <= 0.05` para absorber centavos residuales generados por divisiones inexactas en cuotas periódicas.
    * Verificación y calidad: 120/120 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-CARD-CYCLE-PAYMENTS-ISOLATION]` (2026-11-01): Blindaje de Pagos por Ciclo y Facturación Íntegra de Cuotas de Terceros:
  - Archivos intervenidos:
    * `src/utils/card-accounting.ts`
    * `app/(app)/cards/[id].tsx`
    * `src/__tests__/accounting-integration.test.ts`
  - Resumen técnico:
    * En `src/utils/card-accounting.ts` (`computeCardBillingStatement`) y `app/(app)/cards/[id].tsx`, se acotó la sumatoria de transacciones `card_payment` utilizando `isDateInCurrentBillingCycle(t.date)`, aislando los pagos históricos de tarjetas estrictamente a su ciclo correspondiente y evitando que pagos previos absorban deudas en ciclos posteriores.
    * En el cálculo de cuotas de terceros (`thirdPartyMonthDue` / `tpMonthDue`), se garantizó que los consumos activos de terceros facturen la cuota íntegra mensual pactada (`normalQuota`), evitando que abonos parciales del amigo al titular reduzcan el monto nominal exigido por el banco en la factura física mensual.
    * En `src/__tests__/accounting-integration.test.ts`, se incorporó el Caso 17 validando con Fake Timers la independencia de pagos entre múltiples ciclos consecutivos y la exigencia de cuota completa ante el banco.
  - Decisiones permanentes y verificación:
    * Acotamiento de Pagos de Tarjeta por Ciclo: Los pagos de tarjeta (`card_payment`) SIEMPRE deben filtrarse con `isDateInCurrentBillingCycle(t.date)` al calcular la deuda del extracto actual. De lo contrario, los pagos de meses anteriores persisten y distorsionan períodos futuros.
    * Facturación Nominal de Cuotas de Terceros: El extracto de la tarjeta debe exigir la cuota pactada completa (`normalQuota`), ya que el banco factura el 100% independientemente de si el tercero abonó parcial o totalmente antes del vencimiento.
    * Verificación y calidad: 118/118 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-CARD-DUE-DATE-DASHBOARD-FIX]` (2026-11-01): Corrección de cálculo de vencimiento y alertas de tarjetas en Dashboard:
  - Archivos intervenidos:
    * `src/components/dashboard/upcoming-debts-card.tsx`
    * `src/__tests__/debt-dates-liquidation.test.ts`
  - Resumen técnico:
    * En `upcoming-debts-card.tsx` (`getConsolidatedUpcomingDebts`), se sustituyó la llamada ingenua a `calculateRecurringDueDate(paymentDay, ...)` por `getCardBillingCycleDates(cardClosingDay, cardPaymentDay, referenceDate)` para obtener la proyección de ciclo real (`cycleDates.daysUntilPayment` y `cycleDates.paymentDueFormatted`).
    * Evita falsos positivos de "¡Vence hoy! (Hoy)" cuando una tarjeta tiene compras ingresadas el día 1 tras el cierre del período anterior (ej. corte 29 de mes anterior, pago día 1). Ahora calcula 30 días restantes para el 1 de Diciembre y no dispara alerta urgente.
    * En el subtexto del ítem de tarjeta, ahora se muestra explícitamente "Vence: 1 Dic 2026" en lugar de "Vence día 1".
    * En `src/__tests__/debt-dates-liquidation.test.ts`, se incorporó Caso 19 con Fake Timers deterministas para validar 30 días restantes, ausencia de alerta urgente y formato de fecha.
  - Decisiones permanentes y verificación:
    * Regla de Vencimientos de Tarjetas: Para cálculo de vencimientos de tarjetas de crédito en cualquier componente o card (Dashboard o Overview), SIEMPRE usar `getCardBillingCycleDates(closingDay, paymentDay, refDate)` y NUNCA `calculateRecurringDueDate(paymentDay, ...)`, ya que este último ignora el corte y confunde compras post-cierre como vencimientos del mismo día.
    * Verificación y calidad: 117/117 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-OPTIMIZATION-PHASE-6B-FRIEND-LOAN-COLLECTION-MODAL]` (2026-10-31): Modularización y desacoplamiento del modal de cobro de préstamos a amigos en `debts.tsx`:
  - Archivos intervenidos:
    * `src/components/debts/friend-loan-collection-modal.tsx` (Nuevo)
    * `app/(app)/(tabs)/debts.tsx`
  - Resumen técnico:
    * Extracción del modal de cobro de préstamos a amigos hacia el componente modular independiente `FriendLoanCollectionModal`.
    * Eliminación de estados redundantes y 17 reglas de estilo exclusivas en `debts.tsx`.
    * Preservación estricta de la doble imputación contable (`collectFriendLoan` y `addTransaction`) y Visual Freeze.
    * Verificación de calidad: 116/116 tests en verde y 0 errores en TypeScript.
  - Decisiones permanentes y verificación:
    * Desacoplamiento de Modales de Cobro/Pago: Extraer modales secundarios a componentes independientes con props explícitas (`visible`, `onClose`, callbacks de acción) para mantener pantallas tab ligeras, legibles y con responsabilidad única.
    * Verificación y calidad: 116/116 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-OPTIMIZATION-PHASE-6A-DEBTS-PAYMENT-MODAL]` (2026-10-31): Modularización y desacoplamiento del modal de pago de deudas personales en `debts.tsx`:
  - Archivos intervenidos:
    * `src/components/debts/personal-debt-payment-modal.tsx` (Nuevo)
    * `app/(app)/(tabs)/debts.tsx`
  - Resumen técnico:
    * Extracción del modal monolítico de pago de deudas personales desde `debts.tsx` hacia un componente independiente `PersonalDebtPaymentModal`.
    * Reducción neta de más de 700 líneas en `debts.tsx`.
    * Preservación del 100% de la lógica contable, validaciones y estilos visuales (Visual Freeze).
    * Verificación de calidad: 116/116 tests en verde y 0 errores en TypeScript.
  - Decisiones permanentes y verificación:
    * Modularización de Modales Complejos: Desacoplar modales monolíticos extensos de pantallas principales hacia componentes dedicados en `src/components/`, delegando estado local y callbacks explícitos para mantener pantallas ligeras y mantenibles.
    * Verificación y calidad: 116/116 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-OPTIMIZATION-PHASE-5-TRANSACTIONS-MEMO]` (2026-10-31): Optimización de rendimiento en lista de movimientos con React.memo y callbacks memoizados:
  - Archivos intervenidos:
    * `src/components/transactions/transaction-item-card.tsx`
    * `app/(app)/(tabs)/transactions.tsx`
  - Resumen técnico:
    * Envoltura de `TransactionItemCard` en `React.memo` con comparador personalizado `arePropsEqual` para prevenir re-renders durante el scroll de listas largas de movimientos.
    * Memoización de handlers (`useCallback`) para eliminación, filtros de búsqueda y selección de períodos en `app/(app)/(tabs)/transactions.tsx`.
    * Preservación estricta de Visual Freeze.
    * Verificación de calidad: 116/116 tests en verde y 0 errores en TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Memoización en Listas: Envolver tarjetas de lista (`TransactionItemCard`) con `React.memo` y memoizar handlers con `useCallback` en pantallas padre para asegurar 60 FPS estables.
    * Verificación y calidad: 116/116 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-OPTIMIZATION-PHASE-4-CARD-ACCOUNTING-SSOT]` (2026-10-31): Unificación contable de liquidaciones de tarjeta en Single Source of Truth:
  - Archivos intervenidos:
    * `src/utils/card-accounting.ts` (Nuevo)
    * `src/components/dashboard/upcoming-debts-card.tsx`
    * `app/(app)/(modal)/cards-overview.tsx`
  - Resumen técnico:
    * Creación de `computeCardBillingStatement` en `src/utils/card-accounting.ts` como Single Source of Truth contable para liquidaciones de tarjeta.
    * Eliminación de más de 285 líneas de lógica contable duplicada en `upcoming-debts-card.tsx` y `cards-overview.tsx`.
    * Preservación total de Visual Freeze.
    * Verificación de calidad: 116/116 tests en verde y 0 errores en TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Liquidación de Tarjetas: Usar siempre `computeCardBillingStatement` para calcular extractos y deudas de tarjeta, evitando duplicar cálculos de ciclo y abonos inline.
    * Verificación y calidad: 116/116 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-OPTIMIZATION-PHASE-3-CURRENCY-STATS-BUGFIX]` (2026-10-31): Creación de utilidades puras de moneda y corrección de desfase mensual en estadísticas:
  - Archivos intervenidos:
    * `src/utils/currency.ts` (Nuevo)
    * `app/(app)/(tabs)/stats.tsx`
    * `src/__tests__/currency.test.ts` (Nuevo)
  - Resumen técnico:
    * Creación de `src/utils/currency.ts` con funciones puras `formatCurrency`, `getCurrencySymbol` y `sanitizeDecimalInput` con formato estándar en español (`es-ES`, miles con punto, decimales con coma).
    * Corrección de bug crítico en `app/(app)/(tabs)/stats.tsx`: la función `parseTxDate` restaba 1 al mes dos veces consecutivas (`m - 1`), clasificando transacciones de Octubre en Septiembre en las estadísticas mensuales.
    * Incorporación de 16 tests unitarios en `currency.test.ts`, alcanzando 116/116 tests en verde y 0 errores en TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Fechas ISO: Al parsear YYYY-MM-DD manualmente, no restar 1 al mes más de una vez antes de invocar `new Date(y, m, d)`.
    * Verificación y calidad: 116/116 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-OPTIMIZATION-PHASE-2-SAFE-STORAGE-SYNC]` (2026-10-31): Consolidación de persistencia resiliente y sincronización en stores:
  - Archivos intervenidos:
    * `src/store/safe-storage.ts` (Nuevo)
    * `src/store/cards-store.ts`
    * `src/services/sync-service.ts`
  - Resumen técnico:
    * Centralización de `safeStorage` en un único adaptador compartido con memoria en fallback resiliente.
    * Implementación de `setCardSyncHandlers` en `cards-store.ts` para capturar altas, bajas y modificaciones de tarjetas de crédito y bancos.
    * Conexión en `sync-service.ts` para encolar sincronización remota automática (`triggerBackgroundPush` y `deleteRemoteRecord`).
    * Verificación de calidad: 100/100 tests en verde y 0 errores de compilación TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Sincronización en Stores: Todo store persistente que mute entidades de Supabase debe exportar su setXSyncHandlers y estar conectado en sync-service.ts.
    * Verificación y calidad: 100/100 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-OPTIMIZATION-PHASE-1-DEAD-CODE]` (2026-10-31): Ejecución de la Fase 1 del plan de optimización (purgado de código muerto):
  - Archivos intervenidos:
    * `src/components/debts/debt-card.tsx` (Eliminado)
    * `src/components/debts/third-party-debts-card.tsx` (Eliminado)
    * `src/components/ui/collapsible.tsx` (Eliminado)
  - Resumen técnico:
    * Ejecución de la Fase 1 del plan de optimización.
    * Eliminación de 865 líneas de código muerto obsoleto con 0 referencias activas en el proyecto.
    * Verificación limpia de TypeScript (`tsc --noEmit` con 0 errores) y suite completa de Jest (100/100 tests en verde).
  - Decisiones permanentes y verificación:
    * Mantener higiene de código activo eliminando componentes obsoletos una vez verificado el desacoplamiento total en todo el árbol de dependencias.
    * Verificación y calidad: 100/100 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-DASHBOARD-BANK-DECK-REDESIGN]` (2026-10-31): Rediseño estético premium de tarjetas de bancos, ampliación de marcas y grid fluido en Desktop:
  - Archivos intervenidos:
    * `src/utils/bank-identity.ts`
    * `src/components/dashboard/bank-deck-card.tsx`
    * `src/components/dashboard/balance-hero-card.tsx`
    * `src/__tests__/bank-identity.test.ts`
  - Resumen técnico:
    * Rediseño estético premium de `BankDeckCard`: acento neón vertical integrado (3.5px) sin cortar esquinas redondeadas, squircle para avatar de marca, saldo prominente en 19px bold (`#FFFFFF`), supresión del texto redundante "SALDO DISPONIBLE", badge de porcentaje translúcido sutil (atenuado en 0%), y micro-chip estilizado de fondos en custodia.
    * Rediseño de `AddBankDeckCard` como ghost card moderna con acento `#00FFA3`.
    * Ampliación de marcas oficiales en `bank-identity.ts`: Next (`#00FF5F`), BTG Pactual (`#0A84FF`), Inter (`#FF7A00`), C6 Bank, Bradesco, Caixa, Banco do Brasil, Wise, PayPal, Lemon y Ualá.
    * Grid fluido de 2 columnas en Desktop (`isWide`): tarjetas con `width: '48.5%'`, `flexGrow: 1`, llenando el 100% del ancho de la columna izquierda y eliminando el hueco vacío lateral de la captura.
    * 100/100 tests unitarios en verde y 0 errores de compilación TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Tarjetas Bancarias en Dashboard: Usar acento vertical neón interior en lugar de bordes superiores toscos, suprimir etiquetas redundantes de saldo, y en Desktop usar grid fluido de 2 columnas (width 48.5%, flexGrow 1) para llenar la columna izquierda sin huecos asimétricos.
    * Verificación y calidad: 100/100 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-DASHBOARD-BANK-DECK]` (2026-10-30): Identidad bancaria, baraja de saldos y Micro-Hero en Dashboard (Fases 1 y 2):
  - Archivos intervenidos:
    * `src/utils/bank-identity.ts`
    * `src/components/dashboard/bank-deck-card.tsx`
    * `src/__tests__/bank-identity.test.ts`
    * `src/components/dashboard/balance-hero-card.tsx`
    * `app/(app)/(tabs)/index.tsx`
  - Resumen técnico:
    * Fase 1: Creación del motor puro de identidad bancaria `getBankIdentity` con colores corporativos e iconos de marcas reconocidas (Nubank, Santander, BBVA, MP, Brubank, Efectivo) y hashing determinista a paleta cyberpunk para bancos personalizados. Componentes modulares `BankDeckCard` y `AddBankDeckCard`.
    * Fase 2: Rediseño del Micro-Hero en `balance-hero-card.tsx` reduciendo 50% la altura vertical con saldo compacto (23px), micro-chips de flujo mensual, micro-barra segmentada de asignación patrimonial (4dp) y carrusel de bancos (scroll horizontal en móvil y flex-wrap en escritorio). Cómputo memoizado de saldos en `index.tsx`.
    * 89/89 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Liquidez y Bancos en Dashboard: Presentar la liquidez total en formato compacto con carrusel horizontal de BankDeckCard para diferenciar saldos bancarios rápidamente por color de marca, evitando cards de balance gigantes que empujen los vencimientos y transacciones.
    * Verificación y calidad: 89/89 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-PERSONAL-DEBT-HISTORICAL-PENDING]` (2026-10-30): Corrección de conteo de cuotas propias históricas y pendientes en tarjeta:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/utils/date-helpers.ts`
    * `app/(app)/cards/[id].tsx`
    * `src/__tests__/billing-cycle.test.ts`
  - Resumen técnico de la solución:
    * Eliminación de la asignación automática espuria de `new Date().toISOString()` a `lastPaymentDate` al crear deudas históricas/preexistentes en `debts-store.ts`.
    * En `app/(app)/cards/[id].tsx`, implementación de `computeCardPersonalDebtPeriodPaid`: las compras propias en tarjeta no se consideran cubiertas en el ciclo actual si el extracto de la tarjeta está pendiente de pago (`cardCurrentMonthDebt > 0`). Visualización con píldora naranja `Pendiente este mes` y badge `Cuota 5 de 8 • Pendiente` (caso iPhone 17 Pro Max).
    * Actualización de `getInstallmentProgressInfo` y `getProjectedInstallmentInfo` para emitir explícitamente `• Pendiente` cuando no esté cubierta.
    * Incorporación del Caso 13 con Fake Timers en `billing-cycle.test.ts`, validando el ciclo de 8 cuotas del iPhone (4 históricas, cuota 5 pendiente en ciclo actual, cuota 6 proyectada en próximo mes).
    * 67/67 tests unitarios en verde y 0 errores en TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Compras Propias en Tarjeta: Nunca asignar `new Date()` como `lastPaymentDate` a deudas preexistentes. Las cuotas propias de tarjeta están supeditadas al pago del extracto (`cardCurrentMonthDebt <= 0`); si la tarjeta no se ha pagado, la cuota a cobrar es `cuotas_pagadas + 1` (Pendiente).
    * Verificación y calidad: 67/67 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-INSTALLMENT-PRECISION-AUTOHEAL]` (2026-10-30): Precisión en amortización de cuotas con decimales, auto-reparación resiliente y proyección:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/utils/date-helpers.ts`
    * `app/(app)/cards/[id].tsx`
    * `src/__tests__/billing-cycle.test.ts`
  - Resumen técnico de la solución:
    * Erradicación del truncamiento por punto flotante IEEE-754 en `debts-store.ts`: se eliminó el cálculo vulnerable `Math.floor((total - remaining) / monthlyInstallment)` que truncaba cocientes como `0.9999999999999998` a `0` en compras con decimales periódicos (ej. caso "VS BIKES BREVES" por $169.900,01 a 3 cuotas de $56.633,34).
    * Implementación de la utilidad de auto-reparación `getEffectivePaidInstallments` en `src/utils/date-helpers.ts`: función pura resiliente con tolerancia epsilon (`0.05`), que deriva las cuotas pagadas reales desde el monto amortizado efectivo y auto-repara datos preexistentes corruptos o desincronizados en disco/AsyncStorage.
    * Sincronización del texto de progreso y proyección en `cards/[id].tsx`: visualización coherente del avance de amortización (mostrando "1 pagadas · Restan 2 cuotas" en lugar de "0 pagadas · Restan 3 cuotas") y proyección exacta para ciclos futuros ("Cuota 2 de 3 • Próximo Mes" en lugar de repetir Cuota 1).
    * Tests unitarios deterministas añadidos: Casos 11 y 12 en `src/__tests__/billing-cycle.test.ts` simulando compras con decimales amortizadas con Fake Timers, alcanzando 66/66 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript.
  - Decisiones permanentes y verificación:
    * Regla de Precisión IEEE-754 en Cuotas: Nunca usar `Math.floor((total - rem) / monthly)` directamente con decimales sin normalización previa. Usar siempre `getEffectivePaidInstallments` para derivar cuotas amortizadas y auto-reparar registros en disco.
    * Verificación y calidad: 66/66 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-INSTALLMENT-LIFECYCLE-UNIFICATION]` (2026-10-30): Unificación del ciclo de vida, conteo y estado de cuotas en toda la aplicación:
  - Archivos intervenidos:
    * `src/utils/date-helpers.ts`
    * `app/(app)/(tabs)/debts.tsx`
    * `app/(app)/cards/[id].tsx`
    * `src/__tests__/billing-cycle.test.ts`
  - Resumen técnico de la solución:
    * Unificación de la semántica y ciclo de vida de cuotas en toda la app (gastos de terceros, compras en cuotas en tarjeta y préstamos personales).
    * Inclusión del flag `isCurrentPeriodPaid` en `getInstallmentProgressInfo` y `getProjectedInstallmentInfo`.
    * Comportamiento cuando la cuota del período actual está cubierta (`isCurrentPeriodPaid = true`):
      - Ciclo actual: `Cuota X de Y • Cubierta` (sin saltar prematuramente al siguiente número de cuota).
      - Próximo Mes (`offset = 1`): Proyecta `Cuota X+1 de Y` (resolviendo la anomalía de "3 de 5" en el caso JBL).
      - En 2 Meses (`offset = 2`): Proyecta `Cuota X+2 de Y`.
    * Conexión reactiva en `debts.tsx` (consumos de terceros y préstamos) y `cards/[id].tsx` (consumos de terceros y cuotas propias).
    * Test unitario determinista del caso JBL añadido con Fake Timers (64/64 tests pasando, 0 errores de compilación TypeScript).
  - Decisiones permanentes y verificación:
    * Regla de Cuotas Activas: Al pagar la cuota de un ciclo, no incrementar ciegamente el número visible a cobrar en el ciclo en curso. Mantener "Cuota X de Y • Cubierta" hasta el corte del siguiente ciclo, y proyectar "Cuota X+1 de Y" únicamente para meses futuros.
    * Verificación y calidad: 64/64 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-CARDS-RESPONSIVE-PROJECTION]` (2026-10-30): Adaptación responsiva de detalle de tarjeta para escritorio y proyección inteligente de ciclos de facturación:
  - Archivos intervenidos:
    * `app/(app)/cards/[id].tsx`
    * `src/utils/date-helpers.ts`
    * `src/__tests__/billing-cycle.test.ts`
  - Resumen técnico:
    * Tarea 1: Adaptación responsiva para Web / Tauri (Desktop) en `cards/[id].tsx` mediante `useIsWide(768)`. Contenedor centrado (`maxWidth: 1150`), layout en 2 columnas (columna izquierda para tarjeta digital con proporciones físicas de ~400px, HUD de saldos compacto y botones ergonómicos; columna derecha para filtros y listado de consumos legibles) y atajo de teclado `Escape`. Preservación 100% intacta del diseño móvil (`!isWide`).
    * Tarea 2: Funciones puras de proyección en `src/utils/date-helpers.ts` (`getProjectedCardBillingPeriod`, `isOneTimeExpenseInPeriod`, `getProjectedInstallmentInfo`). Selector cyberpunk de períodos (`Actual`, `Próximo Mes`, `+2 Meses`). HUD de saldos dinámico con títulos e importes proyectados y lista de consumos con badges de cuota proyectada y compras post-corte. 4 pruebas unitarias deterministas con `jest.useFakeTimers()` agregadas (63/63 tests pasando, 0 errores de TypeScript).
  - Verificación y calidad: 63/63 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TASK-ABONOS-FACTURA-TARJETAS]` (2026-10-30): Corrección de reversión contable de abonos de terceros y sincronización del ciclo de facturación de tarjetas:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/store/transactions-store.ts`
    * `src/__tests__/accounting-integration.test.ts`
    * `app/(app)/cards/[id].tsx`
    * `app/(app)/(modal)/cards-overview.tsx`
    * `src/components/dashboard/upcoming-debts-card.tsx`
  - Resumen técnico de la solución:
    1. Reversión de abonos (`debts-store.ts` y `transactions-store.ts`):
       - Corrección de `revertThirdPartyPersonAbono` desvinculando la reactivación (`settled: false`, `settledAt: undefined`) de `isRestoredToFull` cuando `newRemaining > 0.0001`, permitiendo que compras de terceros con pagos históricos previos vuelvan a activarse de forma íntegra al eliminar un abono posterior.
       - Soporte bidireccional por ID directo y UUID determinista (`uuidv5(..., 'abono-allocation')`) en `revertThirdPartyAllocations`.
       - Implementación de fallback en cascada en `deleteTransaction` para revertir abonos incluso si la transacción carece de `targetDebtId` o metadatos explícitos, garantizando integridad referencial y contable.
    2. Facturación de tarjetas (`cards/[id].tsx`, `cards-overview.tsx`, `upcoming-debts-card.tsx`):
       - Retención de consumos de terceros saldados dentro del ciclo actual mediante `isDateInCurrentBillingCycle`, manteniendo su cuota mensual en `thirdPartyMonthDue` de la tarjeta hasta que el usuario registre el pago efectivo de la tarjeta (`card_payment`).
       - Sincronización contable exacta entre el detalle de la tarjeta (`cards/[id].tsx`), el modal de resumen de tarjetas (`cards-overview.tsx`) y el widget de vencimientos del dashboard (`upcoming-debts-card.tsx`).
    3. Preservación estricta de `Visual Freeze`: Ningún cambio en estilos, colores, espaciados o estructura visual preexistente; acotado 100% a la lógica contable y de ciclo de facturación.
  - Decisiones permanentes y pruebas:
    - Regla contable permanente: Nunca expulsar cargos de terceros saldados del extracto de la tarjeta si pertenecen al ciclo actual de facturación, y nunca condicionar `settled: false` al 100% de la compra original en reversiones de abono.
    - Extensión de la suite `src/__tests__/accounting-integration.test.ts` cubriendo la reversión de abonos parciales y la permanencia de compras saldadas en el ciclo de facturación de tarjetas. 56/56 tests unitarios en verde (100% pass) y 0 errores de TypeScript (`npx tsc --noEmit`).

- `[DEBTS-WEB-TAURI-IMPROVEMENTS-PHASE1-001]` (2026-10-29): Mejoras de ergonomía, KPIs en 3 columnas y atajos de teclado para Web y Tauri en Gestión de Deudas:
  - Archivos intervenidos:
    * `src/components/debts/debts-summary-card.tsx`
    * `app/(app)/(tabs)/debts.tsx`
  - Resumen técnico:
    - Rediseño responsivo en `debts-summary-card.tsx` con `useWindowDimensions` (`isWide >= 768`): panel superior en 3 columnas de KPIs ejecutivos (Bloque 1: Deuda Bancaria Total y progreso de amortización; Bloque 2: Cuentas por Cobrar con desglose de Préstamos a amigos y Compras compartidas; Bloque 3: Compromiso Exigible del mes con badges de estado).
    - Preservación íntegra al 100% de la tarjeta móvil (`!isWide`), cumpliendo estrictamente la regla de `Visual Freeze`.
    - Píldoras de filtro en `debts.tsx`: en `isWide`, reemplazo del `ScrollView` horizontal por contenedor flex (`flexDirection: 'row', flexWrap: 'wrap', gap: 10`), eliminando el incómodo scroll horizontal con ratón en escritorio.
    - Acotamiento responsivo del buscador en `isWide` con `maxWidth: 420` para evitar estiramiento desproporcionado en pantallas anchas.
    - Atajo global de teclado 'Escape' en Web/Tauri (`Platform.OS === 'web'`) para cerrar limpiamente cualquier modal activo (abonos, pagos, liquidaciones y confirmaciones).
    - Asignación condicional de `cursor: 'pointer'` en elementos interactivos clave (píldoras, botones de pago/abono, toggle de compras agrupadas y acciones rápidas).
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[MODAL-CARDS-LEGACY-DESKTOP-STYLING-001]` (2026-10-29): Estilización y adaptación de modales de tarjetas y consumos históricos para escritorio (Tauri y Web):
  - Archivos intervenidos:
    * `app/(app)/(modal)/cards-overview.tsx`
    * `app/(app)/(modal)/legacy-card-expense.tsx`
  - Resumen técnico:
    - Integración de `useIsWide(768)` para transformar las vistas a pantalla completa en tarjetas modales flotantes centradas (`maxWidth: 680` en `cards-overview.tsx` y `maxWidth: 580` en `legacy-card-expense.tsx`, esquinas `borderRadius: 20`, bordes `#2C2C2E`, fondo `#1E1E1E`, elevación y sombra premium).
    - Montaje de backdrop translúcido (`rgba(0, 0, 0, 0.72)`) con dismiss al hacer clic fuera de la tarjeta (`activeOpacity={1}`, `router.back()`).
    - Listener global para la tecla `Escape` en plataforma Web y Tauri (con gestión de cierre secuencial si hay submodales abiertos en `cards-overview`).
    - Ocultamiento de la barra táctil móvil de arrastre (`dragIndicator`) en escritorio.
    - Preservación íntegra al 100% de la presentación móvil en iOS (`SafeAreaView`) y Android (`androidBackdrop` + bottom sheet), cumpliendo con la directriz de `Visual Freeze`.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[MODAL-TRANSPARENT-STACKS-DESKTOP-FIX-001]` (2026-10-29): Erradicación de fondo gris opaco y habilitación de transparencia real en modales Web y Tauri:
  - Archivos intervenidos:
    * `app/(app)/_layout.tsx`
    * `app/(app)/(modal)/_layout.tsx`
  - Resumen técnico:
    - Configuración explícita de `presentation: Platform.OS === 'ios' ? 'card' : 'transparentModal'` y `animation: Platform.OS === 'ios' ? 'default' : 'fade'` en el Stack anidado `(modal)/_layout.tsx`.
    - Asignación de `contentStyle: { backgroundColor: Platform.OS === 'ios' ? colors.background : 'transparent' }` en ambos niveles del Stack.
    - Erradicación definitiva de la caja opaca gris claro (`#F2F2F2`) inyectada por omisión por el componente de fondo de React Navigation Web, permitiendo que la vista inferior (Dashboard, Movimientos, Deudas) permanezca 100% visible a través del backdrop oscuro translúcido `rgba(0, 0, 0, 0.72)`.
    - Registro formal de todas las pantallas en el Stack de modales (`new-transaction`, `new-debt`, `cards-overview`, `legacy-card-expense`).
    - Preservación íntegra de los comportamientos móviles en iOS (modal sheet) y Android (bottom sheet).
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[MODAL-NEW-DEBT-DESKTOP-STYLING-001]` (2026-10-29): Estilización y adaptación de modal de nueva deuda y préstamos para escritorio (Tauri y Web):
  - Archivo intervenido:
    * `app/(app)/(modal)/new-debt.tsx`
  - Resumen técnico:
    - Integración de `useIsWide(768)` para transformar el formulario plano de pantalla completa en una tarjeta modal centrada (`maxWidth: 620`, `maxHeight: '92%'`, `borderRadius: 20`, bordes `#2C2C2E`, fondo `#1E1E1E`, elevación y sombra premium), calibrando el ancho para permitir la distribución ergonómica de las 3 pestañas (*Deuda Propia*, *Préstamo a Amigo*, *Gasto en Tarjeta*).
    - Montaje de backdrop translúcido (`rgba(0, 0, 0, 0.72)`) que vislumbra la vista inferior y permite cerrar el modal haciendo clic fuera de la tarjeta (`activeOpacity={1}`, `router.back()`).
    - Incorporación de listener global para la tecla `Escape` en plataforma Web y Tauri.
    - Ocultamiento de la barra táctil de arrastre (`dragIndicator`) en escritorio.
    - Preservación íntegra al 100% de la presentación móvil en iOS (`SafeAreaView`) y Android (`androidBackdrop` + bottom sheet), cumpliendo estrictamente con la regla de `Visual Freeze`.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[MODAL-NEW-TRANSACTION-DESKTOP-STYLING-001]` (2026-10-29): Estilización y adaptación de modal de nueva transacción para escritorio (Tauri y Web):
  - Archivo intervenido:
    * `app/(app)/(modal)/new-transaction.tsx`
  - Resumen técnico:
    - Integración de `useIsWide(768)` para transformar el formulario plano de pantalla completa en una tarjeta modal centrada (`maxWidth: 580`, `maxHeight: '92%'`, `borderRadius: 20`, bordes `#2C2C2E`, fondo `#1E1E1E`, elevación y sombra premium).
    - Montaje de backdrop translúcido (`rgba(0, 0, 0, 0.72)`) que vislumbra la vista inferior y permite cerrar el modal haciendo clic fuera de la tarjeta (`activeOpacity={1}`, `router.back()`).
    - Incorporación de listener global para la tecla `Escape` en plataforma Web y Tauri.
    - Ocultamiento de la barra táctil de arrastre (`dragIndicator`) en escritorio.
    - Preservación íntegra al 100% de la presentación móvil en iOS (`SafeAreaView`) y Android (`androidBackdrop` + bottom sheet), cumpliendo estrictamente con la regla de `Visual Freeze`.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[SELECTIVE-DATABASE-CLEANUP-EXPENSES-DEBTS-001]` (2026-10-29): Implementación de limpieza selectiva de gastos y deudas en aplicación y Supabase:
  - Archivo intervenido:
    * `src/components/settings/settings-section-list.tsx`
  - Resumen técnico:
    - Sustitución del borrado total ciego (`AsyncStorage.clear()`) por una rutina de limpieza granular selectiva.
    - Preservación íntegra al 100% de tarjetas de crédito (`cards`), bancos (`banks`), contactos/personas (`people`), cuentas de usuario (`auth.users` / `profiles`) y configuraciones personales.
    - Vaciado específico de gastos e ingresos (`useTransactionsStore.clearAllTransactions()`) y deudas bancarias, préstamos a amigos y consumos diferidos (`useDebtsStore.clearAllDebts()`).
    - Integración de borrado remoto directo en Supabase (`transactions`, `third_party_card_charges`, `friend_loans`, `personal_debts`) acotado por `user_id` para los usuarios autenticados, previniendo resincronizaciones accidentales tipo zombie.
    - Actualización de textos, títulos y advertencias en el modal interactivo de la pantalla de Ajustes.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DEBTS-BANK-GROUP-HEADER-REDUNDANCY-FIX-001]` (2026-10-28): Erradicación de redundancia visual y blindaje flexbox en encabezado de banco en pestaña Deudas:
  - Archivo intervenido:
    * `app/(app)/(tabs)/debts.tsx`
  - Resumen técnico:
    - Ocultamiento inteligente del encabezado de entidad bancaria (`bankGroupHeaderCard`) cuando existe 1 único préstamo o 1 sola entidad bancaria activa (`groupedPersonalDebts.length > 1 || group.debts.length > 1`), eliminando el efecto tosco de "tarjeta encimada sobre tarjeta" y redundancia de datos (nombre de banco y subtotal idéntico).
    - Erradicación de la regla defectuosa `flex: 0, flexShrink: 1` en `bankGroupHeaderLeftWide` que provocaba el colapso vertical carácter por carácter en Web y Tauri.
    - Blindaje de Flexbox horizontal con `flex: 1, minWidth: 0` en `bankGroupHeaderLeft`, `bankGroupHeaderLeftWide` e `bankGroupInfoCol`, junto con `flexShrink: 0` en `bankGroupTotalBadge` y `numberOfLines={1}` en textos para garantizar diseño horizontal y fluido sin desbordamientos ni saltos de línea antiestéticos.
    - Transformación en pantallas de escritorio (`isWide`) a separador sutil de subsección (`backgroundColor: 'transparent'`, `borderBottomWidth: 1`, `borderBottomColor: '#252529'`, `width: '100%'`).
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[PERSISTENT-AUTH-SESSION-AND-AUTO-REFRESH-001]` (2026-10-28): Implementación de sesión de autenticación persistente y segura con auto-refresco en Supabase y bloqueo por PIN:
  - Archivos intervenidos:
    * `src/utils/session.ts`
    * `src/lib/supabase.ts`
    * `src/components/settings/settings-section-list.tsx`
  - Resumen técnico:
    - Erradicación de la expulsión destructiva forzosa por inactividad de 60 minutos en `src/utils/session.ts`. La sesión de Supabase ahora permanece persistente y renovable continuamente.
    - Implementación de bloqueo defensivo de pantalla por PIN (`lockApp()`) ante inactividad en segundo plano mayor a 15 minutos (`INACTIVITY_LOCK_MS = 15 * 60 * 1000`), protegiendo la privacidad sin destruir credenciales ni purgar stores de datos.
    - Conexión del ciclo de vida de la aplicación mediante `AppState.addEventListener` en `src/lib/supabase.ts` activando `supabase.auth.startAutoRefresh()` en primer plano (`active`) y `stopAutoRefresh()` en background, previniendo expiraciones no deseadas de JWT en Web y Móvil.
    - Actualización informativa de etiqueta en Ajustes (`settings-section-list.tsx`) a *"Sesión: Persistente (Segura)"*.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DEBTS-RESPONSIVE-BANK-HEADER-CARD-001]` (2026-10-27): Adaptación responsiva de tarjeta/indicador de banco en agrupación de deudas personales:
  - Archivo intervenido:
    * `app/(app)/(tabs)/debts.tsx`
  - Resumen técnico:
    - Incorporación de clases de estilo condicionales responsivas `bankGroupHeaderCardWide` y `bankGroupHeaderLeftWide` con `useIsWide(768)`.
    - En `isWide === true` (pantallas de escritorio Tauri y Web), la tarjeta de cabecera de la entidad bancaria adopta `alignSelf: 'flex-start'`, ancho auto-ajustable acotado (`minWidth: 320`, `maxWidth: 480`) y espaciado proporcional (`gap: 20`). Se erradica el estiramiento desproporcionado de 1200px y la franja oscura vacía entre el nombre y el subtotal.
    - En `isWide === false` (dispositivos móviles y anchos < 768px), se preserva al 100% el estilo estático original (`width: '100%'`, `justifyContent: 'space-between'`), cumpliendo la directriz estricta de `Visual Freeze`.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[SETTINGS-RESPONSIVE-2-COLUMN-LAYOUT-001]` (2026-10-27): Layout responsivo en 2 columnas para la pestaña Ajustes (Settings) en pantallas de escritorio (Tauri y Web):
  - Archivos intervenidos:
    * `app/(app)/(tabs)/settings.tsx`
    * `src/components/settings/settings-section-list.tsx`
  - Resumen técnico:
    - Extensión de `SettingsSectionList` con props opcionales `isWide?: boolean` y `userProfileSlot?: React.ReactNode` mediante arrow function y tipado inline estricto.
    - Implementación de distribución simétrica en 2 columnas (`styles.wideGridContainer`, `flexDirection: 'row'`, `gap: 16`) cuando `isWide === true` (`width >= 768px`): Columna Izquierda con perfil de usuario (`UserProfileCard`), finanzas/moneda y seguridad/privacidad; Columna Derecha con datos/almacenamiento y botón de cierre de sesión.
    - Centrado horizontal con `maxWidth: 1200` en el contenedor de scroll de `settings.tsx`.
    - Preservación 100% idéntica del flujo vertical para móviles (`!isWide`), garantizando la directriz estricta de `Visual Freeze`.
    - Modal de reseteo de base de datos desacoplado del grid para disponibilidad continua en cualquier resolución.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TABS-DESKTOP-FLOATING-DOCK-001]` (2026-10-27): Implementación de Dock flotante centrado en barra de navegación inferior (Tabs) para pantallas de escritorio (Tauri y Web):
  - Archivo intervenido:
    * `app/(app)/(tabs)/_layout.tsx`
  - Resumen técnico:
    - Integración de `useIsWide(768)` en `TabsLayout` para adaptar la barra de navegación inferior en pantallas anchas (Tauri WebView2 y Web).
    - En `isWide === true`, `tabBarStyle` se transforma en un Dock flotante centrado con `position: 'absolute'`, `bottom: 16`, `maxWidth: 540`, `width: '100%'`, `marginHorizontal: 'auto'`, `borderRadius: 24`, bordes completos (`borderWidth: 1`, `borderColor: '#2C2C2E'`), sombra suave y elevación (`elevation: 10`, `shadowOpacity: 0.4`, `shadowRadius: 16`), altura de `64dp` y `overflow: 'hidden'`.
    - En `isWide === false` (dispositivos móviles y anchos < 768px), se preserva al 100% el estilo estático original con las safe areas de iOS (`height: 88`) y Android (`height: 60 + insets.bottom`), cumpliendo la directriz estricta de `Visual Freeze`.
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[THIRD-PARTY-ABONO-REVERSION-BETWEEN-DAYS-001]` (2026-10-24): Corrección de reversión de abonos a terceros entre días distintos y paridad matemática en ingresos:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/store/transactions-store.ts`
    * `src/__tests__/accounting-integration.test.ts`
  - Resumen técnico:
    - Persistencia de `previousLastPaymentDate` y `previousSettledAt` en `ThirdPartyChargeAllocation` para restaurar con precisión temporal el estado de los cargos al eliminar transacciones de abonos realizadas en días previos.
    - Blindaje defensivo contra `NaN` en `revertThirdPartyPersonAbono` y reseteo de `settled`, `settledAt`, `lastPaymentDate` y `currentPeriodPaidAmount` cuando el cargo recupera su saldo íntegro.
    - Deducción inteligente de persona en `deleteTransaction` para disparar la reversión sin importar desde qué pestaña se elimine la transacción.
    - Inclusión de `reimbursement` en `getTotalIncome` y `getCurrentMonthIncome` para paridad matemática absoluta entre Dashboard y Movimientos.
    - Casos 15 y 16 en Jest con simulación temporal determinista (`useFakeTimers` y avance de ayer a hoy) verificando 100% pass (56/56 tests).
  - Verificación y calidad: 56/56 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[LOGIN-DESKTOP-RESPONSIVE-SPLIT-VIEW-001]` (2026-10-24): Estética de escritorio y diseño responsivo split-view en pantalla de login (Web y Tauri):
  - Archivo intervenido:
    * `app/(auth)/login.tsx`
  - Resumen técnico:
    - Integración de `useIsWide(768)` para dotar a la pantalla de login de un diseño de escritorio responsivo (Web y Tauri) con split view de 2 columnas centrado (`maxWidth: 960`): Panel izquierdo de marca y pilares (`ControlFynz OS`, `Ionicons`) y Panel derecho para el formulario ergonómico de acceso/registro.
    - Cero alteraciones en la experiencia móvil (`!isWide`), manteniendo la paridad y fidelidad visual al 100%.
    - Respeto estricto al protocolo de Visual Freeze en móvil y compatibilidad cross-platform en teclado y temas.
  - Verificación y calidad: 54/54 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[PERSONAL-DEBT-DELETE-AND-PREV-INSTALLMENTS-CLEANUP-001]` (2026-10-24): Corrección de eliminación de deudas personales y restricción de cuotas previas en pestaña Deudas:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/__tests__/accounting-integration.test.ts`
    * `app/(app)/(tabs)/debts.tsx`
    * `app/(app)/(modal)/new-debt.tsx`
  - Resumen técnico:
    - Corrección de validación contable en `deletePersonalDebt` (`src/store/debts-store.ts`) y en el modal de confirmación de eliminación (`debts.tsx`): ahora se evalúa si existen pagos reales registrados en la app (`totalActualPaid > 0` o `paidInstallments > initialPaidInstallments`), permitiendo eliminar deudas creadas con cuotas iniciales sin abonos reales.
    - Restricción en el alta de deudas (`new-debt.tsx`): los selectores de cuotas previas pagadas se ocultaron y condicionaron a `isLegacyMode`, garantizando que en la pestaña Deudas (`!isLegacyMode`) las deudas se inicialicen siempre con 0 cuotas previas y el 100% del saldo pendiente.
    - Incorporación del Caso 14 en `src/__tests__/accounting-integration.test.ts` que valida exhaustivamente la eliminación de deudas con cuotas iniciales sin abonos reales y el bloqueo preventivo cuando sí existen pagos reales en la app.
  - Verificación y calidad: 54/54 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DEBTS-MULTI-CARD-OVERLAP-FIX-AND-RESPONSIVE-FLEX-001]` (2026-10-24): Erradicación de sobreposición visual multi-tarjeta y layout responsivo con Flexbox en Deudas:
  - Archivos intervenidos:
    * `app/(app)/(tabs)/debts.tsx`
  - Resumen técnico:
    - Erradicación del bug de colisión y sobreposición visual cuando una persona tiene deudas en más de una tarjeta de crédito en `debts.tsx`.
    - Sustitución de la pastilla monolítica concatenada por pastillas independientes de tarjeta (`uniqueCardNames.map`), cada una con ancho acotado (`maxWidth: 160`) y truncado `numberOfLines={1}`.
    - Blindaje defensivo de Flexbox: `minWidth: 0` y `alignItems: 'flex-start'` en `summaryHeaderLeft`, altura calibrada en `personNameAccentBar`, `flexShrink: 0` en badges de estado y cabeceras de grupos de tarjetas.
    - Implementación de layout responsivo con Flexbox en 2 columnas (`cardsGridWide`, `width: '48.5%'`, `gap: 16`) para préstamos bancarios, préstamos a amigos, resúmenes de terceros y deudas liquidadas en pantallas anchas (`width >= 768px`) con contenedor centrado (`maxWidth: 1200`).
    - Preservación 100% idéntica del flujo vertical para móviles cuando `width < 768px`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DASHBOARD-RECENT-TX-INVALID-DOM-NESTING-FIX-001]` (2026-10-24): Erradicación de advertencia `validateDOMNesting` en Tauri/Web para lista de transacciones recientes:
  - Archivos intervenidos:
    * `src/components/dashboard/recent-transactions-list.tsx`
  - Resumen técnico:
    - Erradicación del error en React Native Web / Tauri `validateDOMNesting: <button> cannot appear as a descendant of <button>` en `RecentTransactionsList`.
    - Sustitución del contenedor exterior interactivo `<TouchableOpacity>` por un contenedor estructural pasivo `<View>`, retirando el rol y evento redundantes de eliminación.
    - Preservación del botón de papelera interior (`styles.deleteButton`) como único disparador de confirmación de borrado.
    - Paridad y Visual Freeze estricto: 0 alteraciones visuales en móvil, con mejora de UX evitando aperturas accidentales del modal de borrado al hacer scroll sobre la tarjeta.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[STATS-RESPONSIVE-2-COLUMN-LAYOUT-001]` (2026-10-24): Layout responsivo en 2 columnas para la pestaña Estadísticas (Stats) en escritorio y tablets:
  - Archivos intervenidos:
    * `app/(app)/(tabs)/stats.tsx`
  - Resumen técnico:
    - Implementación de layout responsivo en 2 columnas para la pestaña Estadísticas usando `useIsWide(768)`.
    - Distribución analítica para escritorio: Columna Izquierda con selector de período (`Mes`, `Trimestre`, `Año`), resumen comparativo de ingresos/gastos y tarjeta de Salud Financiera (`FinancialHealthCard`); Columna Derecha con gráfico de distribución y desglose por categorías (`CategoryBreakdownCard`).
    - Contenedor centrado acotado a `maxWidth: 1200`.
    - Preservación 100% intacta del flujo vertical para móviles cuando `width < 768px`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TRANSACTIONS-RESPONSIVE-2-COLUMN-LAYOUT-001]` (2026-10-23): Layout responsivo en 2 columnas para Movimientos (Transactions) en pantallas de escritorio y tablets:
  - Archivos intervenidos:
    * `src/hooks/use-responsive.ts`
    * `app/(app)/(tabs)/transactions.tsx`
    * `app/(app)/(tabs)/index.tsx`
  - Resumen técnico:
    - Creación del hook reactivo de alto rendimiento `useIsWide(breakpoint = 768)` en `src/hooks/use-responsive.ts` para mitigar re-renders continuos durante el redimensionamiento de ventanas en Tauri Desktop.
    - Implementación del layout responsivo en 2 columnas en `transactions.tsx`: panel izquierdo con selector de mes, resumen de flujo financiero, buscador y filtros segmentados; panel derecho con feed de transacciones agrupadas y tarjetas de detalle legibles sin fatiga visual.
    - Contenedor centrado acotado a `maxWidth: 1200`.
    - Preservación 100% idéntica del flujo vertical para móviles cuando `width < 768px`.
    - Unificación arquitectónica en `index.tsx` adoptando `useIsWide`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DASHBOARD-RESPONSIVE-2-COLUMN-LAYOUT-001]` (2026-10-23): Layout responsivo en 2 columnas para el Dashboard en pantallas de escritorio y tablets:
  - Archivos intervenidos:
    * `app/(app)/(tabs)/index.tsx`
    * `src-tauri/tauri.conf.json`
  - Resumen técnico:
    - Implementación de layout responsivo en 2 columnas para el Dashboard usando `useWindowDimensions()` con breakpoint `width >= 768px`.
    - Distribución equilibrada en pantalla ancha: Columna Izquierda con `BalanceHeroCard` y `QuickActionsGrid`; Columna Derecha con `UpcomingDebtsCard` y `RecentTransactionsList`; contenedor acotado a `maxWidth: 1200` y centrado en monitores grandes.
    - Preservación 100% intacta del flujo vertical para móviles cuando `width < 768px`.
    - Calibración de ventana en Tauri a 960x780 (min 460, max 1280) para habilitar experiencia de escritorio fluida.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TAURI-WINDOW-COMPACT-SIZE-LIMITS-001]` (2026-10-23): Calibración compacta y límites de tamaño para ventana de escritorio en Tauri:
  - Archivos intervenidos:
    * `src-tauri/tauri.conf.json`
  - Resumen técnico:
    - Calibración de dimensiones de ventana nativa de escritorio en Tauri para aspect-ratio tipo smartphone/phablet (`width: 460`, `height: 860`, `center: true`).
    - Establecimiento de límites de redimensión defensivos (`minWidth: 400`, `minHeight: 680`, `maxWidth: 580`, `maxHeight: 980`) para evitar estiramientos antiestéticos en monitores ultra-anchos y preservar la ergonomía visual mobile-first.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[GIT-DUAL-BRANCH-AND-VERCEL-BUILD-OPTIMIZATION-001]` (2026-10-23): Estrategia de ramas Dual-Branch y optimización de builds en Vercel con smart ignore:
  - Archivos intervenidos:
    * `scripts/vercel-ignore.sh`
    * `vercel.json`
  - Resumen técnico:
    - Adopción de la arquitectura de ramas Dual-Branch (`main` para producción consolidada y `dev` para trabajo diario).
    - Creación del script `scripts/vercel-ignore.sh` e integración como `ignoreCommand` en `vercel.json` para cancelar construcciones innecesarias en Vercel:
      * Cancelación si el commit contiene `[skip ci]` o `[skip vercel]`.
      * Cancelación si la rama no es `main` (cero builds en `dev` y ramas secundarias).
      * Smart diff: cancelación si solo se modificaron archivos documentales (`*.md`), soporte (`.agents/`, `.vscode/`) o escritorio (`src-tauri/`).
      * Autorización de build (`exit 1`) únicamente ante cambios reales para web sobre `main`.
    - Creación de la rama local `dev`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TAURI-V2-DESKTOP-APP-INITIALIZATION-001]` (2026-10-23): Inicialización y soporte de aplicación de escritorio nativa con Tauri v2:
  - Archivos intervenidos:
    * `package.json`
    * `package-lock.json`
    * `src-tauri/tauri.conf.json`
    * `src-tauri/Cargo.toml`
    * `src-tauri/src/main.rs`
  - Resumen técnico:
    - Configuración e inicialización de soporte de escritorio nativo con Tauri v2 (`@tauri-apps/cli` 2.12.4, Tauri 2.12.5) bajo WebView2 en Windows.
    - Paridad estética en la ventana nativa: dimensiones 1280x850, centrado automático, fondo `#121212` sin destellos.
    - Integración del pipeline: `beforeBuildCommand: "npm run build:web"`, `frontendDist: "../dist"` enlazado con la exportación estática de Expo Web, y `desktop:dev` / `desktop:build` en scripts de `package.json`.
    - Cero alteración a rutas móviles o lógica web.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DEBTS-REMOTE-DELETION-AND-SYNC-PERSISTENCE-001]` (2026-10-23): Sincronización y persistencia de eliminación remota en módulo de deudas y préstamos:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/services/sync-service.ts`
    * `src/store/transactions-store.ts`
  - Resumen técnico:
    - Definición y registro desacoplado de `DebtSyncHandlers` (`setDebtSyncHandlers`) en `debts-store.ts` para notificar eliminaciones y mutaciones sin dependencias circulares en Metro.
    - Conexión en `sync-service.ts` de `onPersonalDebtDeleted`, `onFriendLoanDeleted`, `onThirdPartyChargeDeleted` y `onPersonDeleted` invocando `deleteRemoteRecord` con sus tablas correspondientes en Supabase (`personal_debts`, `friend_loans`, `third_party_card_charges`, `people`), aplicando soft-delete `deleted_at = now()`.
    - Notificación de eliminación remota en `removeInitialLoanTransactions` dentro de `transactions-store.ts` para transacciones de desembolso asociadas.
    - Disparo reactivo en segundo plano (`triggerBackgroundPush`) ante altas y abonos en `debts-store`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[WEB-AUTH-GUARD-AND-INITIAL-SYNC-LOADER-001]` (2026-10-23): Guardián declarativo de autenticación web y pantalla de carga de sincronización inicial:
  - Archivos intervenidos:
    * `app/(app)/_layout.tsx`
    * `src/services/sync-service.ts`
    * `app/(app)/(tabs)/index.tsx`
  - Resumen técnico:
    - Erradicación del destello del Dashboard previo al login en web mediante guardián declarativo con `<Redirect href="/(auth)/login" />` en `app/(app)/_layout.tsx`.
    - Creación del estado reactivo de sincronización inicial en `sync-service.ts` (`subscribeToInitialSync`, `notifySyncListeners`) con timeout defensivo de 4000ms.
    - Pantalla de carga inmersiva cyberpunk en `app/(app)/(tabs)/index.tsx` durante `isSyncingInitial`, mostrando spinner neón y badge `[ SINCRONIZANDO FINANZAS ]` en lugar de saldos en $0,00 hasta que los datos reales de Supabase terminan de hidratarse.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[VERCEL-PRODUCTION-DEPLOYMENT-SUCCESS-001]` (2026-10-23): Despliegue exitoso en producción web en Vercel:
  - Archivos intervenidos:
    * `HISTORY.md`
    * `Memory.md`
  - Resumen técnico:
    - Despliegue en producción exitoso en Vercel conectado al repositorio GitHub `DaviDiibo/FynzControl`.
    - Compilación estática de Expo Router (`dist/`), renderizado web fluido de la interfaz cyberpunk, soporte de autenticación híbrida (Email/Password + Google OAuth) y navegación SPA.
    - Verificación: 100% operativo en producción web en caliente.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[GITHUB-REPOSITORY-INITIALIZATION-AND-PUSH-001]` (2026-10-23): Inicialización de repositorio Git y push inicial a GitHub:
  - Archivos intervenidos:
    * Repositorio completo (212 archivos versionados)
    * `.gitignore`
  - Resumen técnico:
    - Inicialización de repositorio Git en rama `main`.
    - Vinculación y push exitoso al repositorio remoto oficial: `https://github.com/DaviDiibo/FynzControl.git`.
    - 212 archivos versionados con exclusión total de credenciales sensibles (`.env*`) y artefactos temporales (`node_modules/`, `dist/`, `.expo/`).
    - Estado de árbol de trabajo limpio (`working tree clean`) en rama `main`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[VERCEL-WEB-DEPLOYMENT-PREPARATION-001]` (2026-10-23): Preparación y configuración de exportación web para despliegue en Vercel:
  - Archivos intervenidos:
    * `package.json`
    * `vercel.json`
    * `.gitignore`
  - Resumen técnico:
    - Instalación de dependencia oficial `@expo/metro-runtime` (`~57.0.17`) requerida por Expo Router para soporte web estático.
    - Configuración del script de compilación `"build:web": "expo export -p web"` en `package.json`.
    - Creación de configuración `vercel.json` especificando directorio de salida estática (`outputDirectory: "dist"`), URLs limpias (`cleanUrls: true`) y reescritura de rutas SPA hacia `/index.html` para navegación fluida de Expo Router.
    - Blindaje de `.gitignore` para exclusión de `.env*`, `.vercel/`, `dist/`, `.expo/`.
    - Verificación completa: exportación web exitosa (`npm run build:web`) con 42 rutas estáticas generadas, 53/53 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[SPLASH-SCREEN-AND-ZUSTAND-HYDRATION-SYNC-001]` (2026-10-23): Sincronización del Splash Screen nativo y rehidratación de stores Zustand:
  - Archivos intervenidos:
    * `src/hooks/use-app-hydration.ts`
    * `app/_layout.tsx`
  - Resumen técnico:
    - Erradicación del destello de saldos en cero ("flash of zeros") al abrir la app.
    - Creación de `useAppHydration` que monitorea `hasHydrated()` y `onFinishHydration()` en los 5 stores de Zustand (`auth`, `transactions`, `debts`, `cards`, `settings`) con timeout defensivo de 1500 ms.
    - En `app/_layout.tsx`: invocación de `SplashScreen.preventAutoHideAsync()` a nivel de módulo, retención del montaje (`return null`) mientras `!isHydrated`, y ejecución de `SplashScreen.hideAsync()` únicamente cuando los saldos y transacciones ya están en memoria RAM.
    - Blindaje del enrutamiento de autenticación para que evalúe `isAuthenticated` solo tras la rehidratación.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[RESOLVE-METRO-REQUIRE-CYCLE-SYNC-STORE-001]` (2026-10-23): Erradicación del ciclo de dependencias (require cycle) en Metro entre sync-service y transactions-store:
  - Archivos intervenidos:
    * `src/store/transactions-store.ts`
    * `src/services/sync-service.ts`
  - Resumen técnico:
    - Erradicación del require cycle entre `sync-service.ts` y `transactions-store.ts`.
    - Inversión de dependencias en `transactions-store.ts` mediante `setTransactionSyncHandlers` y suscripción desacoplada en `sync-service.ts`.
    - Flujo de imports transformado a estrictamente unidireccional (`sync-service -> transactions-store`).
    - Eliminación de la advertencia en consola de Metro al iniciar la app o autenticar con Google.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[STATS-UNIFIED-FORMATTING-AND-EMPTY-STATE-PHASE-3-001]` (2026-10-23): Unificación de formateo monetario en español, eliminación de mocks y estado vacío contextual en desglose por categorías (Fase 3):
  - Archivo intervenido:
    * `src/components/stats/category-breakdown-card.tsx`
  - Resumen técnico:
    - Unificación de formateo monetario en español (`es-ES`, punto como separador de miles y coma decimal) para cabecera e items individuales.
    - Erradicación definitiva de mocks residuales (`defaultItems`).
    - Incorporación de estado vacío contextual cyberpunk (`pie-chart-outline`, "Sin gastos registrados en este período") cuando `items.length === 0`.
    - Clamping matemático de porcentajes (`Math.min(100, Math.max(0, ...))`) en barras de progreso.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[STATS-REAL-DEBT-RATIO-AND-DYNAMIC-HEALTH-PHASE-2-001]` (2026-10-23): Ratio real de compromiso de deuda periódica y semáforo dinámico de salud financiera (Fase 2):
  - Archivos intervenidos:
    * `src/components/stats/financial-health-card.tsx`
    * `app/(app)/(tabs)/stats.tsx`
  - Resumen técnico:
    - Conexión con `useDebtsStore` para calcular el compromiso real de deuda periódica (`monthlyDebtCommitment` a partir de `personalDebts` vigentes y cuotas activas de `thirdPartyCharges`).
    - Sustitución de la fórmula errónea (gasto general) por el ratio de endeudamiento auténtico: `(cuotasDeuda / ingresos) * 100`.
    - Dinamización del semáforo de salud financiera en `FinancialHealthCard`: chips `ESTADO: ÓPTIMO` (verde neón `#00FFA3`), `ESTADO: MODERADO` (ámbar `#FFD60A`) y `ESTADO: CRÍTICO` (alerta `#FF453A`) evaluando balance neto, tasa de ahorro y ratio de endeudamiento.
    - Barra de progreso y leyenda de compromiso crediticio reactivas adaptadas al ratio real.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[STATS-DYNAMIC-TEMPORAL-FILTER-PHASE-1-001]` (2026-10-22): Filtro temporal dinámico en estadísticas, cálculos reactivos reales y desglose por categorías (Fase 1):
  - Archivo intervenido:
    * `app/(app)/(tabs)/stats.tsx`
  - Resumen técnico:
    - Eliminación de multiplicadores artificiales (`periodMultiplier * 3` y `* 12`) y dinamización del selector de año (`Año ${new Date().getFullYear()}`).
    - Filtrado de fechas real de transacciones para mes actual, trimestre y año en curso con parser resiliente `parseTxDate` para ISO timestamps y cadenas `YYYY-MM-DD`.
    - Cálculo de totales del período (`periodIncome`, `periodExpense`, `periodNet`, `savingsRate`) incluyendo reembolsos y pagos de tarjetas como salidas de liquidez.
    - Sincronización del desglose de categorías (`dynamicCategoryExpenses`) basado exclusivamente en los gastos del período activo.
    - Supresión del objeto estático `PERIOD_CHANGES` y sustitución por cálculo real de variación vs período previo (con fallback "Base" cuando no hay histórico previo).
    - Integración de `useFocusEffect` con `focusRefreshKey` contra congelamientos de renderizado `react-freeze`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TRANSACTIONS-DYNAMIC-MONTHLY-FILTER-001]` (2026-10-22): Filtro mensual dinámico con navegación ilimitada, métricas en tiempo real y soporte histórico:
  - Archivos intervenidos:
    * `src/components/transactions/transactions-summary-header.tsx`
    * `app/(app)/(tabs)/transactions.tsx`
  - Resumen técnico:
    - Eliminación de arreglo estático `AVAILABLE_MONTHS` y sustitución por estado de fecha dinámico `selectedDate: Date` y toggle `isAllTime`.
    - Navegación ilimitada mes a mes (`handlePrevMonth` / `handleNextMonth`) con formateo en español capitalizado.
    - Filtrado resiliente de fechas (`isSameMonthAndYear`) soportando ISO timestamps y cadenas `YYYY-MM-DD` sin desfases de huso horario.
    - Cálculo en tiempo real de métricas mensuales (`monthlyIncome`, `monthlyExpense`, `monthlyNet`) enlazadas al encabezado `TransactionsSummaryHeader`.
    - Soporte interactivo para alternar a "Histórico Completo" tocando el contenedor central del mes o desde el estado vacío.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[OFFLINE-FIRST-BIDIRECTIONAL-PERSISTENCE-AND-DELETE-001]` (2026-10-22): Persistencia bidireccional offline-first, soft-delete en Supabase y volcado preventivo en logout:
  - Archivos intervenidos:
    * `src/services/sync-service.ts`
    * `src/store/transactions-store.ts`
    * `src/store/auth-store.ts`
  - Resumen técnico:
    - En `sync-service.ts`: Implementación de `deleteRemoteRecord` con soft-delete (`deleted_at = now()`) en Supabase para transacciones eliminadas y `triggerBackgroundPush` asíncrono no bloqueante para sincronización inmediata tras mutaciones locales.
    - En `transactions-store.ts`: Disparo de `triggerBackgroundPush` al agregar transacciones (asegurando persistencia de altas en Supabase en segundo plano) y llamada a `deleteRemoteRecord` al eliminar transacciones (evitando que los registros eliminados resuciten en el siguiente login o sync).
    - En `auth-store.ts`: En `logout()` ejecución de volcado preventivo (*flush*) de cambios locales pendientes hacia Supabase con `Promise.race` y timeout defensivo de 2000 ms antes de purgar los stores de dominio con `purgeAllDomainStores()`.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[GOOGLE-OAUTH-AVATAR-INTEGRATION-001]` (2026-10-22): Extracción e integración reactiva de avatar de Google OAuth en perfil y cabecera:
  - Archivos intervenidos:
    * `src/store/auth-store.ts`
    * `src/components/settings/user-profile-card.tsx`
    * `src/components/dashboard/dashboard-header.tsx`
  - Resumen técnico:
    - Extracción dual y normalizada de avatar desde Supabase Auth: resolución de `avatar_url` y `picture` provenientes de metadatos OIDC de Google (`user_metadata.avatar_url ?? user_metadata.picture`), inyectándola reactivamente en el estado del usuario (`user.avatarUrl`).
    - Visualización de foto de perfil en `UserProfileCard` (`settings.tsx`): renderizado mediante componente `Image` optimizado cuando `avatarUrl` está presente, con fallback visual armonioso al ícono neón de persona (`#00FFA3`) sobre superficie `#1E1E1E` si no existe avatar o en error de carga (`onError`).
    - Visualización de avatar en `DashboardHeader` (`dashboard-header.tsx`): integración de la imagen de perfil del usuario en la cápsula de avatar del encabezado principal, preservando la estética neón/cyberpunk y fallback al ícono original.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[SAFE-SYNC-ORDER-AND-DYNAMIC-USER-UI-PHASE-2-001]` (2026-10-22): Sincronización segura (Pull previo a Push) y dinamización de perfil y saludo en UI (Fase 2):
  - Archivos intervenidos:
    * `src/services/sync-service.ts`
    * `src/components/dashboard/dashboard-header.tsx`
    * `app/(app)/(tabs)/settings.tsx`
  - Resumen técnico:
    - Inversión del orden en `syncAll()` dentro de `sync-service.ts` para ejecutar `syncPull()` previo a `syncPush()`, evitando la sobreescritura o propagación inadvertida de estados locales vacíos sobre datos existentes en Supabase al iniciar sesión en dispositivos nuevos o tras purgas de almacenamiento local.
    - Dinamización del saludo en `dashboard-header.tsx`: consumo reactivo de `useAuthStore` para extraer `user` y resolver el nombre para mostrar (`displayName`) a partir de `user_metadata.name`, `user_metadata.full_name`, el prefijo de su correo electrónico o el fallback amigable `'Usuario'`, renderizando "Hola, {displayName}".
    - Inyección de props dinámicas `name` y `email` en `<UserProfileCard />` dentro de `settings.tsx` extrayendo la identidad real desde `useAuthStore`, eliminando textos estáticos o hardcodeados en el perfil de ajustes.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[USER-DATA-ISOLATION-AND-LOGOUT-PURGE-PHASE-1-001]` (2026-10-22): Aislamiento de datos de usuario, eliminación de mocks semilla y purga integral de stores en logout:
  - Archivos intervenidos:
    * `src/store/cards-store.ts`
    * `src/store/debts-store.ts`
    * `src/store/auth-store.ts`
  - Resumen técnico:
    - Eliminación de mocks semilla hardcodeados en el estado inicial de las tiendas: vaciado de `INITIAL_BANKS = []`, `INITIAL_CARDS = []` y `INITIAL_PEOPLE = []`.
    - Supresión de la reinyección artificial de mocks durante la rehidratación (`onRehydrateStorage` / fallback condicional) en `cards-store.ts` y `debts-store.ts`, permitiendo que cuentas nuevas inicien 100% limpias.
    - Creación de acciones de reinicio `resetCardsStore` y `resetDebtsStore` exportadas independientemente en sus respectivos módulos de estado.
    - Implementación de la función centralizada `purgeAllDomainStores` en `auth-store.ts` integrando `resetTransactionsStore`, `resetCardsStore` y `resetDebtsStore`.
    - Invocación garantizada de `purgeAllDomainStores()` en flujos críticos de sesión: `logout()`, evento `SIGNED_OUT` del listener `onAuthStateChange`, al iniciar `login()` y `register()` para evitar contaminación cruzada de datos, y en `checkAuth()` ante ausencia de sesión activa o transición entre diferentes IDs de usuario (`currentUserId !== session.user.id`).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).


- `[REAL-AUTH-VALIDATION-AND-REGISTRATION-FLOW-001]` (2026-10-22): Validación y flujo de autenticación real con registro de usuarios contra Supabase:
  - Archivos intervenidos:
    * `src/store/auth-store.ts`
    * `app/(auth)/login.tsx`
  - Resumen técnico:
    - Eliminación definitiva del bypass de credenciales mock (`mock@controlfynz.app`) en `login()`, implementando autenticación estricta con `supabase.auth.signInWithPassword`.
    - Mapeo localizado y descriptivo de errores de Supabase Auth en español (credenciales inválidas, confirmación de correo requerida, usuario no encontrado, rate limits).
    - Activación completa de la acción `register()` conectada a `supabase.auth.signUp`, persistiendo metadatos de usuario (`name` y `full_name`) en `raw_user_meta_data`, gestionando tanto auto-confirmación inmediata como notificación al usuario si se requiere confirmación de email.
    - En `login.tsx`: integración de modo conmutable (`mode: 'login' | 'register'`), renderizado condicional del campo Nombre Completo en registro, spinner reactivo `ActivityIndicator` con `isLoggingIn`, enlace conmutable neón "¿No tienes cuenta? Regístrate" / "¿Ya tienes cuenta? Inicia sesión", y validación estricta de regex de email y longitud mínima de contraseña (6 caracteres).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[IOS-EXPO-GO-GOOGLE-OAUTH-VALIDATION-001]` (2026-10-22): Validación exitosa en vivo de inicio de sesión con Google OAuth en iPhone (Expo Go):
  - Componentes y plataformas configuradas:
    * Supabase Dashboard (Auth -> URL Configuration, Providers -> Google)
    * Expo Go (iPhone real / iOS)
    * `src/store/auth-store.ts`
  - Resumen técnico:
    - Configuración de Redirect URLs en Supabase Dashboard para entorno de desarrollo local con IP dinámica y puerto Metro: adición de comodines y endpoints canónicos (`exp://192.168.1.9:8081/**`, `exp://192.168.*.*:8081/**`, junto con `controlfynz://**`).
    - Calibración de Site URL en Supabase Dashboard para garantizar resolución y redirección base adecuada.
    - Activación de la opción "Skip nonce checks" en el proveedor de Google de Supabase, requisito crítico y obligatorio en flujos OAuth móviles con navegadores integrados en iOS (`ASWebAuthenticationSession` / `SFSafariViewController`) para evitar discrepancias de nonce en el intercambio de tokens.
    - Validación en vivo y de extremo a extremo en dispositivo físico iPhone con Expo Go: flujo de autorización Google completado, redirección al esquema Expo, canje exitoso de tokens (`exchangeCodeForSession` / hash fragment), cierre automático del modal del navegador y establecimiento reactivo de la sesión del usuario en la aplicación móvil.
  - Verificación y calidad: Flujo autenticado en dispositivo real verificado; preservación del 100% de tests unitarios (53/53 tests en verde) y 0 errores TypeScript (`npx tsc --noEmit`).

- `[IOS-GOOGLE-OAUTH-REDIRECT-AND-PKCE-CALIBRATION-001]` (2026-10-22): Calibración definitiva de redirección OAuth, PKCE y Bundle ID para iOS:
  - Archivos intervenidos:
    * `package.json`
    * `app.json`
    * `src/lib/supabase.ts`
    * `src/store/auth-store.ts`
  - Resumen técnico:
    - Instalación e integración de `expo-auth-session` (~6.0.3) compatible con Expo SDK 57.
    - En `app.json`: adición de `bundleIdentifier: "com.controlfynz.app"` en la sección `expo.ios` para resolución canónica de deep links y esquemas de retorno en iOS.
    - En `src/lib/supabase.ts`: configuración de `auth.flowType: 'pkce'` en `createClient` garantizando el flujo seguro Proof Key for Code Exchange en plataformas nativas.
    - En `src/store/auth-store.ts`: generación de callback unificado mediante `makeRedirectUri({ scheme: 'controlfynz', path: 'auth/callback' })`; soporte dual para extracción de tokens directos en hash fragment (`#access_token=...`) o código de autorización en query params (`?code=...`) con sanitización y escape de trailing hash; manejo robusto de cancelación o descarte (`type === 'cancel' | 'dismiss'`) con reseteo de `isLoggingIn` para evitar cuelgues o congelamientos de UI.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[IPHONE-OAUTH-REDIRECT-AND-PROMINENT-GOOGLE-BUTTON-001]` (2026-10-18): Calibración de redirección OAuth para iPhone y botón prominente de Google:
  - Archivos intervenidos:
    * `src/store/auth-store.ts`
    * `app/(auth)/login.tsx`
  - Resumen técnico:
    - En `auth-store.ts`: invocación de `WebBrowser.maybeCompleteAuthSession()` a nivel superior de módulo para interceptar retornos en iOS; `preferEphemeralSession: false` en `openAuthSessionAsync` para reuso de credenciales y cierre autónomo de Safari; extracción robusta de código o tokens.
    - En `login.tsx`: rediseño del botón de Google con ícono oficial de 4 colores vectorial (`GOOGLE_G_ICON_URI`), superficie elevada `#242429`, borde `#3D3D44`, texto "Continuar con Google" en blanco `#FFFFFF` y spinner de carga reactivo.
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[ACTIVATE-GOOGLE-OAUTH-LOGIN-001]` (2026-10-17): Activación de inicio de sesión con Google OAuth:
  - Archivos intervenidos:
    * `app.json`
    * `src/store/auth-store.ts`
    * `app/(auth)/login.tsx`
  - Resumen técnico:
    - Actualización de `scheme` a `controlfynz` en `app.json`.
    - Implementación de `loginWithGoogle` en `auth-store.ts` con bifurcación multiplataforma: en Web vía redirección OAuth y en Mobile vía `WebBrowser.openAuthSessionAsync` con intercambio de código de autorización (`exchangeCodeForSession`) o tokens directos en hash.
    - Activación del botón de Google en `login.tsx` con handler `handleGoogleLogin`, remoción de etiqueta `(Próximamente)` y cumplimiento estricto de Visual Freeze (Regla 8).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[SUPABASE-OFFLINE-FIRST-SYNC-LAYER-001]` (2026-10-17): Capa de sincronización Offline-First y adaptadores relacionales para Supabase:
  - Archivos intervenidos:
    * `src/lib/sync-adapters.ts`
    * `src/services/sync-service.ts`
    * `src/store/auth-store.ts`
  - Resumen técnico:
    - Creación de `sync-adapters.ts`: adaptadores puros para las 7 entidades relacionales (bancos, tarjetas, personas, deudas, préstamos, compras de terceros y transacciones con allocations JSONB) y utilidad `toDeterministicUuid`.
    - Creación de `sync-service.ts`: orquestador de sincronización en 2 vías (push upsert por orden foráneo y pull delta con merge idempotente), prevención de ejecuciones concurrentes y manejo resiliente ante caídas de red o desconexión.
    - Actualización de `auth-store.ts`: sincronización desatendida en segundo plano al iniciar sesión, restaurar sesión o renovar tokens.
    - Cumplimiento 100% de la Regla 8 (Visual Freeze).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[CONFIG-SUPABASE-MCP-SERVER-001]` (2026-10-17): Configuración del servidor MCP de Supabase e instalación de Agent Skills:
  - Archivos intervenidos:
    * `C:\Users\david\.gemini\antigravity\mcp_config.json`
    * `.agents/skills/supabase`
    * `.agents/skills/supabase-postgres-best-practices`
  - Resumen técnico:
    - Adición del servidor MCP oficial de Supabase en `mcp_config.json` vinculado al proyecto `adzfhzseviuchmazynct`.
    - Instalación de agent skills oficiales (`supabase/agent-skills`).
    - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[SUPABASE-REAL-AUTHENTICATION-001]` (2026-10-17): Integración de autenticación real con Supabase Auth:
  - Archivos intervenidos:
    * `src/store/auth-store.ts`
    * `src/types/index.ts`
  - Resumen técnico:
    - Conexión de `login(email, password)` con `supabase.auth.signInWithPassword` y mapeo de errores amigables en español.
    - Conexión de `register(name, email, password)` con `supabase.auth.signUp` y metadatos de usuario.
    - Implementación de `logout()` con `supabase.auth.signOut()` y limpieza de estado.
    - Restauración de sesión persistida en `checkAuth()` con `supabase.auth.getSession()` y listener reactivo `supabase.auth.onAuthStateChange` para renovación de tokens y sincronización de estado.
    - Preservación íntegra de la capa de seguridad y PIN local (`isLocked`, `pin`, `lockApp`, `unlockApp`).
    - Cumplimiento 100% de la Regla 8 (Visual Freeze).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[SUPABASE-CLIENT-SETUP-AND-INIT-SQL-001]` (2026-10-16): Configuración de cliente Supabase y generación de script SQL consolidado:
  - Archivos intervenidos:
    * `.env.local`
    * `src/lib/supabase.ts`
    * `supabase/init.sql`
  - Resumen técnico:
    - Instalación oficial de `@supabase/supabase-js` (^2.118.0) con Expo SDK 57.
    - Configuración de variables públicas de Supabase en `.env.local`.
    - Creación de `src/lib/supabase.ts` con adaptador `safeAuthStorage` (AsyncStorage con fallback en memoria), autoRefreshToken y persistSession.
    - Creación de `supabase/init.sql`: script DDL consolidado de 1-clic con 9 tablas relacionales, 9 tipos ENUM, triggers, RLS, índices de rendimiento y RPCs (`record_debt_amortization_atomic`, `sync_pull`, `sync_push`).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[BASELINE-PHASE-1-CONSTRUCTION-COMPLETE-001]` (2026-10-16): Punto de control y retorno seguro - Culminación de Fase 1 (Construcción Local y Funcionalidad Completa):
  - Resumen técnico:
    - Cierre definitivo de la fase local de la aplicación.
    - Total de suites de pruebas Jest: 4 suites pasando al 100% (53/53 tests en verde deterministas).
    - Compilación TypeScript: 0 errores (`npx tsc --noEmit`).
    - Estado de arquitectura: 5 pestañas operativas, catálogo de bancos con saldos en cuenta, tarjetas con extractos y detalle canónico, deudas con cuotas adelantadas, compras de terceros con amortización bola de nieve y reversión atómica 1:1, transición automática de ciclos, y `DATABASE_SCHEMA.md` homologado.
    - Este hito se fija como el punto de restauración seguro de la arquitectura local previa a la conexión con Supabase.

- `[DATABASE-SCHEMA-UPDATE-001]` (2026-10-16): Actualización integral del esquema de base de datos relacional para Supabase / PostgreSQL:
  - Archivos intervenidos:
    * `DATABASE_SCHEMA.md`
  - Resumen técnico:
    - Sincronización completa del DDL y tipos de datos:
      * `banks`: adición de `initial_balance NUMERIC(12,2)`.
      * `personal_debts`: incorporación de `bank_id`, `credit_card_id`, `initial_paid_installments`, `is_preexisting`, `last_payment_date`.
      * `third_party_card_charges`: adición de `initial_paid_installments`, `is_preexisting`, `last_payment_date`, `settled_at`, `current_period_paid_amount`.
      * `transactions`: incorporación de `bank_id` y estructura atómica JSONB `third_party_allocations` con especificación de snapshots para reversión contable 1:1.
    - Actualización del diagrama ERD en Mermaid con relaciones de `BANKS` hacia deudas y transacciones.
    - Creación de índices DDL para optimización de consultas (`idx_personal_debts_bank_id`, `idx_transactions_bank_id`, `idx_third_party_charges_settled_at`, `idx_third_party_charges_last_payment`).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).


- `[THIRD-PARTY-CYCLE-ROLLOVER-AUTOMATION-001]` (2026-10-16): Transición automática y reseteo de ciclo mensual para compras de terceros:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/__tests__/debt-dates-liquidation.test.ts`
  - Resumen técnico:
    - En `debts-store.ts`: incorporación de parámetro `referenceDate` en `getThirdPartyMonthlyBillingSummary`; cálculo de `effectivePaid` según coincidencia de mes/año de `lastPaymentDate`; reseteo automático de `currentPeriodPaidAmount` en `recordMonthlyPersonAbono` ante pagos de nuevos ciclos; exclusión de compras liquidadas en ciclos previos del resumen activo.
    - En `debt-dates-liquidation.test.ts`: prueba exhaustiva con Fake Timers modelando la transición real de Octubre ($4.012,78 pagados, Juliana Calzados liquidada) a Noviembre ($3.830,33 exigibles, 0 pagado al inicio, 7 compras activas) y Diciembre ($449,12 exigibles).
  - Verificación y calidad: 53/53 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[REMOVE-REDUNDANT-MODAL-AND-ADD-VISUAL-FREEZE-RULE-001]` (2026-10-16): Eliminación de modal redundante y regla estricta de congelamiento visual:
  - Archivos intervenidos:
    * `app/(app)/(tabs)/debts.tsx`
    * `AGENTS.md`
  - Resumen técnico:
    - En `debts.tsx`: supresión del botón "Desglose modal", remoción de estado `selectedSummaryForDetail`, eliminación del modal redundante y limpieza de estilos huérfanos, preservando el acordeón desplegable directo.
    - En `AGENTS.md`: adición de la Regla 8 ("Prohibición Estricta de Alteraciones Visuales No Solicitadas - Visual Freeze") para garantizar que tareas lógicas/contables no modifiquen la estética sin instrucción explícita del usuario.
  - Verificación y calidad: 52/52 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[THIRD-PARTY-CYCLE-ACCURACY-AND-COMPACT-CARD-UI-001]` (2026-10-16): Precisión contable de ciclo para abonos sucesivos y rediseño compacto de compras de terceros:
  - Archivos intervenidos:
    * `app/(app)/(tabs)/debts.tsx`
    * `src/store/debts-store.ts`
    * `src/__tests__/accounting-integration.test.ts`
  - Resumen técnico:
    - En `debts.tsx`: eliminación de caja tosca `coverageIndicatorContainer` que causaba desbordes; implementación de barra de progreso 4px, mini badges (`100% CUBIERTO` o `X%`) y líneas de estado responsive; retención en `thirdPartyMonthlySummaries` de cargos con `currentPeriodPaidAmount > 0`; tarjeta de éxito con borde `#00FFA3` y badge `🏆 SALDADO ESTE CICLO ($0.00 PENDIENTE)` cuando el saldo llega a $0.
    - En `debts-store.ts`: retención de cargos con abonos en el ciclo en `getThirdPartyMonthlyBillingSummary`.
    - En `accounting-integration.test.ts`: Caso 13 probando el ciclo de 2 abonos sucesivos ($1.800 y $2.212,78) con preservación exacta de montos abonados y saldos.
  - Verificación y calidad: 52/52 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[THIRD-PARTY-ABONO-ATOMIC-REVERSAL-AND-SETTLED-VISIBILITY-001]` (2026-10-15): Reversión atómica exacta de abonos y visibilidad de compras de terceros liquidadas:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `src/store/transactions-store.ts`
    * `app/(app)/(tabs)/debts.tsx`
    * `src/__tests__/accounting-integration.test.ts`
  - Resumen técnico:
    - En `debts-store.ts`: soporte de `initialPaidInstallments` e `isPreexisting` en `ThirdPartyCardCharge`; exportación de `ThirdPartyChargeAllocation`; retorno de snapshot previo en `recordMonthlyPersonAbono`; acción `revertThirdPartyAllocations` para restauración matemática idéntica de saldos y cuotas; blindaje de cuotas base mínimas en fallbacks heurísticos.
    - En `transactions-store.ts`: incorporación de `thirdPartyAllocations` en `Transaction`; reversión atómica prioritaria al eliminar transacciones de abono/reembolso.
    - En `debts.tsx`: captura de asignaciones al registrar abonos; sección "COMPRAS EN TARJETAS LIQUIDADAS (TERCEROS)" en la pestaña de Liquidadas con badge `LIQUIDADO`, cuotas amortizadas y fecha de liquidación.
    - En `accounting-integration.test.ts`: Caso 12 validando compra preexistente con 7 de 8 cuotas pagadas, liquidación por abono y reversión íntegra al eliminar la transacción (restaurando 7/8 cuotas y estado no liquidado).
  - Verificación y calidad: 51/51 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DEBTS-ORDERING-BANK-GROUPING-AND-COVERAGE-VISUALS-001]` (2026-10-15): Listado de deudas ordenado de menor a mayor, agrupadas por bancos/tarjetas y visualización de cobertura:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `app/(app)/(tabs)/debts.tsx`
    * `src/__tests__/debt-dates-liquidation.test.ts`
  - Resumen técnico:
    - En `debts-store.ts`: implementación de helpers puros `groupPersonalDebtsByBank`, `groupThirdPartyChargesByCard` y `getThirdPartyCoverageInfo`. Ordenamiento ascendente de menor a mayor saldo restante (`remainingAmount`).
    - En `debts.tsx`: agrupación visual de deudas personales por entidad bancaria con subtotales; agrupación de compras de terceros por tarjeta en acordeón y modal interactivo de desglose, incorporando badges cyberpunk de cobertura (`CUBIERTO`, `EN AMORTIZACIÓN`, `POR CUBRIR`).
    - En `debt-dates-liquidation.test.ts`: 3 pruebas unitarias nuevas cubriendo agrupación bancaria, ordenamiento ascendente y estados de cobertura.
  - Verificación y calidad: 50/50 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[THIRD-PARTY-MULTI-CARD-ABONO-SNOWBALL-001]` (2026-10-15): Abono multi-tarjeta en cascada con método bola de nieve para terceros:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `app/(app)/(tabs)/debts.tsx`
    * `src/__tests__/accounting-integration.test.ts`
  - Resumen técnico:
    - En `debts-store.ts`: refactorización de `recordMonthlyPersonAbono` para consolidar todas las compras de la persona en cualquier tarjeta. Amortización en 2 fases con ordenamiento ascendente por saldo remanente (`remainingAmount`), liquidando primero deudas menores. Redondeo financiero a 2 decimales en totales.
    - En `debts.tsx`: envío de `cardId: undefined` en el abono modal de la persona para habilitar cascada multi-tarjeta global.
    - En `accounting-integration.test.ts`: Caso 11 modelando exactamente el caso de Junior (7 compras Next + 1 Nubank por $4.012,78 con abono de $1.800 liquidando Next y reduciendo Nubank a $2.212,78).
  - Verificación y calidad: 47/47 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[LOAN-ADVANCE-INSTALLMENTS-SUPPORT-001]` (2026-10-15): Soporte nativo para deudas con cuotas adelantadas y proyección de próximo vencimiento:
  - Archivos intervenidos:
    * `src/utils/date-helpers.ts`
    * `app/(app)/(modal)/new-debt.tsx`
    * `app/(app)/(tabs)/debts.tsx`
    * `src/__tests__/debt-dates-liquidation.test.ts`
  - Resumen técnico:
    - En `date-helpers.ts`: actualización de `getDebtDueStatus` y creación de `getNextDebtDueDate` con proyección al mes siguiente ante cuota cubierta en el ciclo (`lastPaymentDate`), soporte de end-of-month clamping (ej. día 31 ajustado a día 30 en noviembre) y exclusión de alertas prematuras en Dashboard.
    - En `new-debt.tsx`: selector/switch cyberpunk "¿Cuota de este mes ya pagada?", deducción de capital amortizado en `remainingAmount`, registro de `lastPaymentDate` y soporte de cuotas previas sin generar transacciones bancarias ficticias ni alterar el flujo de caja.
    - En `debts.tsx`: visualización del badge 'AL DÍA ESTE MES' con ícono de checkmark y fecha proyectada de débito (ej. "Próximo débito: 30 Nov (Al día este mes)").
    - En `debt-dates-liquidation.test.ts`: casos 17 y 18 con Fake Timers validando estado up_to_date, clamping temporal y persistencia de cuota en curso.
  - Verificación y calidad: 46/46 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[CARD-LEGACY-EXPENSE-DELETION-001]` (2026-10-15): Eliminación segura de compras antiguas/preexistentes de tarjeta de crédito sin pagos nuevos en la app:
  - Archivos intervenidos:
    * `src/store/debts-store.ts`
    * `app/(app)/cards/[id].tsx`
    * `src/__tests__/accounting-integration.test.ts`
  - Resumen técnico:
    - Extensión de `PersonalDebt` incorporando `initialPaidInstallments?: number` y alias `creditCardId?: string`.
    - En `deletePersonalDebt`: permiso de eliminación para deudas con `isPreexisting: true` si no registran pagos posteriores en la app (`paidInstallments <= initialPaidInstallments` y `totalActualPaid === 0`). Recomposición automática del cupo y saldo diferido de la tarjeta.
    - En `cards/[id].tsx`: soporte de modal cyberpunk de confirmación de eliminación para cuotas preexistentes sin amortizaciones en la app.
    - En `accounting-integration.test.ts`: casos 9 y 10 validando eliminación permitida y bloqueo si hubo pagos posteriores.
  - Verificación y calidad: 44/44 tests unitarios en verde (100% pass) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[BANK-TRACEABILITY-ALL-FLOWS-001]` (2026-10-14): Trazabilidad bancaria integral de ingresos y egresos en todos los puntos de flujo de fondos:
  - Archivos intervenidos:
    * `app/(app)/(modal)/new-transaction.tsx`
    * `app/(app)/(tabs)/debts.tsx`
    * `app/(app)/(modal)/new-debt.tsx`
  - Resumen técnico:
    - Integración del selector de entidad bancaria en todos los puntos de entrada y salida de fondos del sistema:
      1. En `app/(app)/(modal)/new-transaction.tsx`: selector de cuenta bancaria de destino en movimientos de ingreso (`type === 'income'`) y de cuenta de salida en gastos (`type === 'expense'`) abonados con débito o efectivo.
      2. En `app/(app)/(tabs)/debts.tsx`: selector de cuenta bancaria receptora en abonos mensuales de terceros a tarjetas compartidas y en cobros de préstamos a amigos; selector de cuenta bancaria emisora de fondos en la amortización de deudas personales.
      3. En `app/(app)/(modal)/new-debt.tsx`: asignación automática del banco emisor al desembolsarse un préstamo bancario y selector de cuenta bancaria de origen al prestar dinero a un amigo.
    - Cierre integral del circuito contable de tesorería para que la función selectora pura `getBankComputedBalance` refleje en tiempo real y con precisión matemática el saldo disponible en custodia en cada cuenta bancaria.
  - Verificación y calidad: 27/27 tests unitarios en verde (100% pass en 4 suites) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[CARDS-MONTHLY-DUE-HIERARCHY-001]` (2026-10-14): Jerarquía visual de compromiso mensual y deuda total en modal de gestión de tarjetas (`cards-overview.tsx`):
  - Archivos intervenidos: `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - Sustitución de la cifra alarmante de deuda total única por una jerarquía visual estructurada en dos niveles:
      1. Nivel Primario (Compromiso Exigible del Mes): despliegue prominente del monto a pagar en el mes actual (`cardCurrentMonthDebt`) con tipografía destacada (22px negrita, `#FF453A` o `#00FFA3`), subtexto dinámico con la fecha límite de pago basada en `paymentDay` (ej. "Vence el 10 del mes actual" o "Vence el 10 del mes próximo" según si ya transcurrió el corte de ciclo `closingDay`), y micro-desglose segregado de responsabilidad de pago (`Propio $X · Terceros $Y`).
      2. Nivel Secundario (Deuda Total Diferida): visualización complementaria y discreta en tipografía secundaria (12px, `#8E8E93`) que refleja el total adeudado consolidado remanente (`cardTotalDebt`), evitando generar sensación de alarma financiera injustificada.
    - Lógica de cálculo contable exhaustiva integrando cuotas exigibles de deudas personales en tarjeta, cuotas devengadas de consumos diferidos de terceros, y compras directas del ciclo facturadas según el día de corte (`closingDay`).
  - Verificación y calidad: 27/27 tests unitarios en verde (100% pass en 4 suites) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[COLLAPSIBLE-BANK-FORM-001]` (2026-10-14): Formulario colapsable de alta de bancos en modal de gestión de tarjetas (`cards-overview.tsx`):
  - Archivos intervenidos: `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - Incorporación del botón de acción `+ Banco` y estado colapsable `isCreatingBank` en la cabecera de "Entidades Bancarias".
    - El formulario de alta (nombre + saldo inicial opcional + botones Guardar y Cancelar) permanece oculto por defecto para ofrecer una vista limpia de tarjetas y bancos, desplegándose únicamente a demanda del usuario y colapsándose automáticamente al guardar o cancelar.
  - Verificación y calidad: 27/27 tests unitarios en verde (100% pass en 4 suites) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[BANK-BALANCES-AND-CARDS-CLEANUP-001]` (2026-10-14): Saldos en cuenta por banco, custodia de fondos y eliminación de sección redundante de préstamos en `cards-overview.tsx`:
  - Archivos intervenidos: `src/store/cards-store.ts`, `src/store/transactions-store.ts`, `app/(app)/(modal)/cards-overview.tsx`, `src/__tests__/cards-store.test.ts`.
  - Resumen técnico:
    - En `src/store/cards-store.ts`:
      - Extensión de la interfaz `BankEntity` incorporando la propiedad opcional `initialBalance?: number`.
      - Incorporación de la acción `setBankBalance(bankId: string, initialBalance: number)` para registrar o actualizar el saldo base de custodia por cuenta bancaria con persistencia resiliente en `safeStorage`.
    - En `src/store/transactions-store.ts`:
      - Extensión de la interfaz `Transaction` incorporando `bankId?: string` para asociar movimientos a cuentas bancarias específicas.
      - Creación de la función selectora pura `getBankComputedBalance(bankId: string, initialBalance: number, transactions: Transaction[]): number`: computa el saldo disponible en tiempo real sumando `initialBalance` + ingresos (`type === 'income'`) + reembolsos (`type === 'reimbursement'`) y restando egresos (`type === 'expense'`), considerando transacciones asociadas a la cuenta bancaria.
    - En `app/(app)/(modal)/cards-overview.tsx`:
      - Eliminación integral y limpia de la sección redundante "Préstamos Bancarios Activos" (desacoplando pasivos bancarios de la administración de tarjetas y bancos).
      - Integración de visualización reactiva del saldo en cuenta por banco utilizando `getBankComputedBalance`.
      - Editor rápido inline cyberpunk con ícono de billetera (`wallet-outline`) e input numérico para actualizar el saldo de custodia de cada entidad bancaria sin fricción.
    - En `src/__tests__/cards-store.test.ts`:
      - Extensión de la suite de pruebas unitarias cubriendo `setBankBalance` (establecimiento de saldo inicial, actualización de saldo existente y manejo resiliente ante IDs no encontrados).
    - Verificación y calidad: 27/27 tests unitarios en verde (100% pass en 4 suites) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[CARDS-BANKS-DEBT-VALUATION-001]` (2026-10-14): Visualización reactiva de valoración de deudas por tarjeta de crédito y por entidad bancaria en el modal de gestión de tarjetas:
  - Archivos intervenidos: `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - En `app/(app)/(modal)/cards-overview.tsx`:
      - Incorporación de cálculos reactivos de deudas por tarjeta de crédito:
        - Consolidación de consumos diferidos de terceros pendientes (`thirdPartyCharges`) asociados a la tarjeta por ID o nombre.
        - Consolidación de deudas personales en tarjeta (`personalDebts`) vigentes no saldadas.
        - Fila destacada con chip de deuda cyberpunk: badge verde `#00FFA3` con `$0 al día` si no hay saldo adeudado, o badge rojo alerta `#FF453A` con el saldo exacto formateado mediante `formatCurrency(cardTotalDebt)`.
      - Incorporación de cálculos reactivos de deudas consolidadas por entidad bancaria en la sección de bancos:
        - Consolidación de préstamos activos de la entidad en `personalDebts` (`loan`, `mortgage`, `installment_loan`).
        - Consolidación acumulada de deudas de todas las tarjetas de crédito emitidas por dicho banco.
        - Despliegue en chips visuales temáticos: badge verde `#00FFA3` (`$0 deuda · Al día`) si no registra pasivos, o chips discriminados de alerta en rojo `#FF453A` (`Tarjetas: $X`) y ámbar `#FF9F0A` (`Préstamos: $Y`) según corresponda.
    - Verificación y calidad: 25/25 tests unitarios en verde (100% pass en 4 suites) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[BANKS-MANAGEMENT-AND-SAFE-DELETE-001]` (2026-10-14): Administración, creación ágil y eliminación protegida de entidades bancarias con verificación de dependencias:
  - Archivos intervenidos: `src/components/cards/delete-bank-modal.tsx`, `src/store/cards-store.ts`, `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - En `src/components/cards/delete-bank-modal.tsx`:
      - Creación del componente `DeleteBankModal` con estética cyberpunk (`#121212`, `#1E1E1E`) y sistema de doble modo basado en dependencias contables activas:
        1. Modo Bloqueado: si el banco tiene tarjetas de crédito asociadas en `cards-store` o préstamos bancarios registrados en `debts-store`, se despliega un escudo ámbar (`#FF9F0A`), desglose HUD de los productos vinculados y botón de cierre informativo ("ENTENDIDO"), impidiendo la eliminación accidental de entidades con registros financieros activos.
        2. Modo Habilitado: si el banco cuenta con 0 dependencias activas, se activa el modo de confirmación destructiva con ícono de papelera en rojo (`#FF453A`), badge verde 'Sin productos vinculados' y botones de cancelación o confirmación ("ELIMINAR BANCO").
    - En `src/store/cards-store.ts`:
      - Incorporación de la acción `updateBank(oldName, newName)` con propagación en cascada sobre `card.bankName` en todas las tarjetas registradas asociadas al banco editado.
    - En `app/(app)/(modal)/cards-overview.tsx`:
      - Integración de sección colapsable "Entidades Bancarias" en el modal de gestión de tarjetas, con contador de bancos registrados y listado detallado.
      - Indicador dinámico de productos asociados por banco (tarjetas y préstamos) y botón táctil de papelera conectado al modal seguro `DeleteBankModal`.
      - Formulario inline simplificado para alta rápida de nuevos bancos ("+ Nuevo Banco") y erradicación total de llamadas a `Alert.alert` nativo en favor de modales temáticos interactivos.
    - Verificación y calidad: 25/25 tests unitarios en verde (100% pass en 4 suites) en `npm test` y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[DATABASE-SCHEMA-SPECIFICATION-001]` (2026-10-13): Especificación arquitectónica y diseño relacional de base de datos para PostgreSQL 15+ y Supabase en modelo Offline-First:
  - Archivos intervenidos: `DATABASE_SCHEMA.md`.
  - Resumen técnico:
    - Redacción completa del documento arquitectónico `DATABASE_SCHEMA.md` con el diseño relacional para PostgreSQL 15+ y Supabase, acoplado al modelo Offline-First de ControlFynz.
    - Diagrama ERD en Mermaid modelando las 9 entidades del sistema (`profiles`, `user_settings`, `banks`, `credit_cards`, `people`, `personal_debts`, `friend_loans`, `third_party_card_charges`, `transactions`).
    - Scripts DDL exhaustivos con ENUMs, triggers de actualización automática de `updated_at`, aprovisionamiento en `on_auth_user_created`, soporte para modelo dual de fechas en tarjetas (`closing_day` y `payment_day`), y nexos relacionales para doble impacto y reversión contable en `transactions` (`related_debt_id`, `related_person_id`, etc.).
    - Políticas de seguridad Row Level Security (RLS) estrictas para aislamiento multi-tenant por usuario (`auth.uid() = user_id`).
    - Índices B-tree y parciales de alto rendimiento para ciclo de facturación, libro de movimientos y sincronización delta incremental (`updated_at`, `deleted_at`).
    - Protocolo de sincronización Offline-First con UUIDs v4 generados en cliente, soft-delete (`deleted_at`), sincronización push/pull bidireccional y resolución determinista de conflictos LWW (Last-Write-Wins).
    - Verificación y calidad: 25/25 tests unitarios en verde (100% pass) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[TESTING-FULL-COVERAGE-EXPANSION-001]` (2026-10-13): Cobertura del 100% en pruebas unitarias para stores contables y ciclo integral de liquidación/reversión bajo AGENTS.md (Sección 7):
  - Archivos intervenidos: `src/__tests__/cards-store.test.ts`, `src/__tests__/accounting-integration.test.ts`.
  - Resumen técnico:
    - En `src/__tests__/cards-store.test.ts` (6 tests unitarios):
      - Cobertura integral de acciones en `useCardsStore`: alta de tarjetas, auto-asignación de `isDefault: true` a la primera tarjeta registrada, designación manual con `setDefaultCard`, reasignación automática de tarjeta default al eliminar una tarjeta activa, y prevención de duplicados en el catálogo de bancos (`addBank`).
    - En `src/__tests__/accounting-integration.test.ts` (5 tests de integración contable):
      - Validación exhaustiva del algoritmo de abono en dos fases para terceros (`recordMonthlyPersonAbono`): Fase 1 liquidando saldo del mes exigible y Fase 2 amortizando excedente directamente al capital diferido no exigible.
      - Validación de la reversión contable integral en cascada al eliminar transacciones vinculadas en `transactions-store` hacia `debts-store`:
        1. Rollback de amortización en préstamos personales con descuento (restauración de saldo y cuotas).
        2. Rollback de cobros de préstamos a amigos (reactivación de deuda pendiente).
        3. Rollback de abonos mensuales a compras de terceros (restauración exacta de saldos pendientes por tarjeta y cuotas).
    - Verificación y calidad: 25/25 tests unitarios en verde (4/4 suites pasando al 100%) en ~180 ms y 0 errores de compilación TypeScript (`npx tsc --noEmit`).

- `[GOVERNANCE-AGENTS-UNIT-TESTING-RULE-001]` (2026-10-13): Incorporación del protocolo y criterios de pruebas unitarias (Jest) en AGENTS.md:
  - Archivos intervenidos: `AGENTS.md`.
  - Resumen técnico:
    - Incorporación formal y autorizada de la sección '7. Protocolo y Criterios de Pruebas Unitarias (Jest)' en `AGENTS.md`.
    - Establecimiento del mandato de verificación doble obligatoria: `npm test` (100% de tests en verde) y `npx tsc --noEmit` (0 errores) previo a declarar concluida cualquier tarea.
    - Delimitación del núcleo de cobertura obligatoria: mutaciones contables y stores Zustand (`transactions-store`, `debts-store`, `cards-store`), ciclos de facturación y liquidación diferida, y utilidades temporales puras (`date-helpers.ts`).
    - Prohibición estricta de tests frágiles de UI, snapshots o validaciones cosméticas.
    - Estandarización de simulación temporal determinista obligatoria con fake timers (`jest.useFakeTimers()` / `jest.setSystemTime()`).
    - Formalización de `npm test` en la sección `## Commands` de `AGENTS.md`.
    - Validación: 14/14 tests pasando exitosamente en Jest y 0 errores de compilación TypeScript.

- `[CARDS-SAFE-DELETE-MODAL-001]` (2026-10-13): Modal de eliminación protegida de tarjetas de crédito con detección de movimientos y reasignación de predeterminada:
  - Archivos intervenidos: `src/components/cards/delete-card-modal.tsx`, `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - En `src/components/cards/delete-card-modal.tsx`:
      - Creación del componente `DeleteCardModal` con diseño temático cyberpunk oscuro (`#1E1E1E` y `#121212`) que gestiona dos estados operativos según dependencias activas:
        1. Modo Bloqueado: si la tarjeta posee movimientos activos (transacciones registradas en `transactions-store`, deudas bancarias no saldadas o cobros a terceros pendientes en `debts-store`), despliega ícono de escudo ámbar (`#FF9F0A`), desglose HUD de compromisos activos y botón único 'ENTENDIDO', impidiendo la eliminación accidental de datos contables.
        2. Modo Habilitado: si no tiene movimientos activos (total = 0), despliega ícono de papelera en rojo (`#FF453A`), badge verde 'Sin movimientos activos', confirmación protegida y aviso de reasignación automática de tarjeta default.
    - En `app/(app)/(modal)/cards-overview.tsx`:
      - Integración de botón táctil de papelera en cada tarjeta registrada, estado `cardPendingDelete` y cálculo reactivo de dependencias antes de invocar `deleteCard`.
    - Validación: 0 errores TypeScript (`npx tsc --noEmit`) y 14/14 tests pasando en Jest.

- `[CARDS-OVERVIEW-INLINE-CREATION-001]` (2026-10-13): Creación ágil de tarjetas y bancos inline con gestión de tarjeta predeterminada en el modal de tarjetas:
  - Archivos intervenidos: `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - En `app/(app)/(modal)/cards-overview.tsx`:
      - Incorporación de botón '+ Nueva Tarjeta' en la cabecera de la sección de tarjetas, desplegando un formulario colapsable con diseño temático cyberpunk.
      - Formulario inline completo reutilizando el patrón probado de `new-transaction.tsx`:
        - Nombre de la tarjeta y selector de bancos con alta rápida '+ Registrar nuevo banco' inline (campo de texto y confirmación directa).
        - Configuración dual de ciclo de facturación con inputs numéricos (corte de ciclo 1-31 y límite de pago 1-31).
        - Límite de crédito opcional y switch interactivo para marcarla como predeterminada desde su creación.
      - Gestión interactiva de tarjetas existentes:
        - Badge visual '★ Predeterminada' en verde neón en la tarjeta activa.
        - Botón táctil con ícono de estrella (`star` / `star-outline`) para convertir cualquier tarjeta en predeterminada mediante `setDefaultCard(card.id)` con un solo toque y respuesta visual inmediata.
    - Validación: 0 errores TypeScript (`npx tsc --noEmit`) y 14/14 tests pasando en Jest.

- `[TESTING-DEBT-DATES-LIQUIDATION-001]` (2026-10-13): Extracción de utilidades de fecha pura y suite de pruebas unitarias para vencimientos, semáforo de urgencia y ciclo de liquidación de deudas:
  - Archivos intervenidos: `src/utils/date-helpers.ts`, `src/components/dashboard/upcoming-debts-card.tsx`, `src/__tests__/debt-dates-liquidation.test.ts`.
  - Resumen técnico:
    - En `src/utils/date-helpers.ts`:
      - Extracción y centralización de utilidades puras de fecha: `calculateRecurringDueDate(dueDay, referenceDate?)` y `getUrgencyStatus(daysUntilDue)`.
      - Soporte para desacoplar la fecha de referencia (`referenceDate`), permitiendo pruebas unitarias deterministas sin depender del reloj del sistema.
      - Manejo robusto de fin de mes (meses de 28, 30 y 31 días ajustando con `Math.min(dueDay, lastDayOfMonth)`) y saltos de año en vencimientos recurrentes.
    - En `src/components/dashboard/upcoming-debts-card.tsx`:
      - Refactorización para consumir `calculateRecurringDueDate` y `getUrgencyStatus` directamente desde `src/utils/date-helpers.ts`, eliminando lógica duplicada en UI.
    - En `src/__tests__/debt-dates-liquidation.test.ts`:
      - Creación de suite integral de 14 pruebas unitarias agrupadas en 2 bloques (cálculo de fechas y ciclo de vida de deudas):
        1. Semáforo "En plazo" (10 días de margen).
        2. Semáforo "¡Por vencer!" (3 días de anticipación).
        3. Semáforo "¡Vence hoy!" (0 días de margen).
        4. Rollover automático al mes siguiente al haber pasado el día límite.
        5. Ajuste inteligente para meses cortos (Febrero 28 días, Abril 30 días para `dueDay = 31`).
        6. Salto de año en vencimientos (Diciembre 2026 -> Enero 2027).
        7. Amortización progresiva, adelanto de cuotas con descuento, liquidación total a `settled: true` y reversión de pagos en `useDebtsStore`.
    - Validación: 14/14 tests pasando exitosamente (código 0) en Jest y `npx tsc --noEmit` con 0 errores de compilación.

- `[TESTING-BILLING-CYCLE-FAKETIMERS-001]` (2026-10-13): Soporte para inyección de fechas en transacciones y suite de pruebas unitarias para el motor de ciclo de facturación con Fake Timers:
  - Archivos intervenidos: `src/store/transactions-store.ts`, `src/__tests__/billing-cycle.test.ts`.
  - Resumen técnico:
    - En `src/store/transactions-store.ts`:
      - Extensión de `CreateTransactionDTO` incorporando `date?: string` opcional, permitiendo inyectar fechas deterministas (`ISO string`) tanto en pruebas unitarias como en flujos programados de la app, manteniendo `new Date().toISOString()` como valor por defecto.
    - En `src/__tests__/billing-cycle.test.ts`:
      - Creación de la suite integral de pruebas unitarias para el motor de ciclo de facturación (`getCurrentMonthIncome`, `getCurrentMonthExpense`, `getCurrentMonthNetBalance`).
      - Simulación temporal determinista con fake timers de Jest (`jest.useFakeTimers()`, `jest.setSystemTime()`), validando 7 escenarios críticos:
        1. Compra con TC antes del día de cierre (`d < closingDay`): computada inmediatamente en el mes en curso.
        2. Compra con TC en el día exacto de cierre (`d === closingDay`): diferida al mes siguiente según regla contable (`>= closingDay`).
        3. Compra con TC posterior al día de cierre (`d > closingDay`): diferida al mes siguiente.
        4. Salto de fin de año: compras post-cierre en Diciembre ruedan a Enero del año siguiente.
        5. Gastos en efectivo / débito: cobro inmediato en el mes en curso sin esperar fecha de corte.
        6. Balance neto mensual: consolidación precisa combinando ingresos, gastos en efectivo y compras diferidas por tarjeta.
        7. Inyección de fechas arbitrarias en el DTO respetando la lógica contable del ciclo de facturación.
    - Validación: 7/7 tests pasando exitosamente (código 0) y `npx tsc --noEmit` con 0 errores de compilación.

- `[TESTING-INFRASTRUCTURE-SETUP-001]` (2026-10-13): Configuración de infraestructura base de testing unitario y de integración con Jest y Expo:
  - Archivos intervenidos: `package.json`, `jest.config.js`.
  - Resumen técnico:
    - Instalación de dependencias de testing compatibles con Expo SDK 57: `jest-expo` (~57.0.6), `jest` (~29.7.0), `@types/jest` (29.5.14).
    - Adición del script `"test": "jest"` en `package.json`.
    - Creación de `jest.config.js` configurado con preset `jest-expo` y patrones de transformación para módulos nativos de Expo y React Native (`transformIgnorePatterns`).
    - Validación con `npx jest --version` (v29.7.0) y `npx tsc --noEmit` (0 errores).

- `[BILLING-CYCLE-ENGINE-HERO-CARD-001]` (2026-10-13): Motor contable de ciclo de facturación y dinamización del hero card en Dashboard:
  - Archivos intervenidos: `src/store/transactions-store.ts`, `src/components/dashboard/balance-hero-card.tsx`, `app/(app)/(tabs)/index.tsx`.
  - Resumen técnico:
    - En `src/store/transactions-store.ts`:
      - Motor contable de ciclo de facturación: para compras con tarjeta de crédito (`credit_card`), si el día de compra es `>= card.closingDay` (fallback 20), el cobro se difiere al mes siguiente, mientras que si es `< card.closingDay` impacta el mes en curso.
      - Métodos agregados al store: `getCurrentMonthIncome`, `getCurrentMonthExpense`, `getCurrentMonthNetBalance`.
    - En `src/components/dashboard/balance-hero-card.tsx`:
      - Dinamización del chip de salud financiera evaluando en tiempo real el ratio de ahorro (`DÉFICIT` en rojo neón `#FF453A`, `ÓPTIMO` en verde neón `#00FFA3`, `EQUILIBRADO` en azul `#0A84FF`).
    - En `app/(app)/(tabs)/index.tsx`:
      - Conexión de métricas mensuales reales alimentando a `BalanceHeroCard` con el flujo del mes en curso y respetando el modo privacidad.
    - Compilación verificada con 0 errores TypeScript (`npx tsc --noEmit`).

- `[CARDS-DUAL-DATE-MODEL-001]` (2026-10-13): Modelo dual de fechas en tarjetas de crédito (día de corte/cierre y día límite de pago) con migración retroactiva:
  - Archivos intervenidos: `src/store/cards-store.ts`, `app/(app)/(modal)/new-transaction.tsx`, `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - En `src/store/cards-store.ts`:
      - Extensión de la interfaz `CreditCard` incorporando `closingDay` (día de corte de facturación) y `paymentDay` (día límite de pago/vencimiento), manteniendo retrocompatibilidad mediante alias con el campo previo `billingCycleDay`.
      - Migración resiliente en rehidratación (`onRehydrateStorage`): normalización automática de tarjetas preexistentes para asegurar que ambas propiedades numéricas (1-31) estén presentes con valores consistentes.
    - En `app/(app)/(modal)/new-transaction.tsx`:
      - Actualización del formulario inline de alta de tarjeta con inputs numéricos dedicados para "Día de Corte" y "Día Límite de Pago", con validación de rango (1-31) y placeholders ilustrativos.
      - Despliegue en el selector horizontal de tarjetas con indicadores visuales claros mostrando tanto el día de cierre (`Corte: d. XX`) como el día de vencimiento (`Pago: d. YY`).
    - En `app/(app)/(modal)/cards-overview.tsx`:
      - Desacoplamiento visual de las fechas en la tarjeta de resumen crediticio, presentando chips con íconos distintos para "Cierre: día XX" y "Límite: día YY".
    - Compilación verificada con 0 errores TypeScript (`npx tsc --noEmit`).

- `[CARDS-DEFAULT-SELECTION-001]` (2026-10-13): Soporte de tarjeta predeterminada en store y preselección priorizada en modal de nueva transacción:
  - Archivos intervenidos: `src/store/cards-store.ts`, `app/(app)/(modal)/new-transaction.tsx`.
  - Resumen técnico:
    - En `src/store/cards-store.ts`:
      - Extensión de la interfaz `CreditCard` con `isDefault?: boolean`.
      - Adición de la acción `setDefaultCard: (id: string) => void` que activa la bandera exclusivamente en la tarjeta objetivo y la desactiva en las demás.
      - Promoción automática de tarjeta predeterminada: al crear la primera tarjeta, al eliminar una tarjeta (si la eliminada era la default, la primera restante asume el rol), y en la migración de persistencia (`onRehydrateStorage`) asegurando que siempre exista una tarjeta por defecto si hay plásticos registrados.
    - En `app/(app)/(modal)/new-transaction.tsx`:
      - Priorización en ordenamiento (`sortedCards`): la tarjeta default se ubica siempre en la primera posición de la lista horizontal.
      - Preselección automática: al abrir el modal se selecciona por defecto la tarjeta marcada con `isDefault` (o la primera si ninguna lo estuviera).
      - Identificador visual cyberpunk: badge neón `★ Predeterminada` sobre la tarjeta default para claridad inmediata del usuario.
    - Compilación verificada con 0 errores TypeScript (`npx tsc --noEmit`).

- `[DASHBOARD-CARDS-MODAL-ACTION-001]` (2026-10-13): Reemplazo de acción rápida "Abono" por "Tarjetas" en Dashboard y modal de vista general de pasivos/tarjetas:
  - Archivos intervenidos: `src/components/dashboard/quick-actions-grid.tsx`, `app/(app)/(tabs)/index.tsx`, `app/(app)/(modal)/cards-overview.tsx`.
  - Resumen técnico:
    - En `src/components/dashboard/quick-actions-grid.tsx`: sustitución de la acción "Abono" por el botón de acceso directo "Tarjetas" (ícono `card-outline`, acento azul `#0A84FF`, callback prop `onCardsPress`) en la cuadrícula de 4 acciones rápidas del Dashboard.
    - En `app/(app)/(tabs)/index.tsx`: conexión del handler `onCardsPress` en `QuickActionsGrid` hacia la ruta modal `/(app)/(modal)/cards-overview`.
    - En `app/(app)/(modal)/cards-overview.tsx`: nuevo modal con presentación cyberpunk nativa que consolida la salud crediticia:
      - Hero card de "Pasivo Global Integral" que totaliza la deuda contraída con entidades financieras (deuda viva en tarjetas de crédito + saldo remanente de préstamos bancarios activos), sin mezclar cobros a terceros.
      - Desglose de tarjetas registradas en `cards-store` con fecha de corte, cupo total, crédito utilizado y porcentaje de utilización.
      - Desglose de préstamos bancarios vigentes desde `debts-store` mostrando saldo remanente y cuota mensual pactada.
      - Accesos directos para registrar nueva tarjeta o gestionar préstamos.
    - Compilación verificada con 0 errores TypeScript (`npx tsc --noEmit`).

- `[TRANSACTIONS-INCOME-REIMBURSEMENT-CAT-001]` (2026-10-13): Simplificación de tipos en nuevo movimiento y adición de categoría 'Reembolsos' en ingresos:
  - Archivos intervenidos: `src/constants/categories.ts`, `app/(app)/(modal)/new-transaction.tsx`.
  - Resumen técnico:
    - En `app/(app)/(modal)/new-transaction.tsx`: depuración integral del modal de nueva transacción eliminando la opción de tipo 'reimbursement' y los mock data de personas/tarjetas de prueba. La UI queda simplificada y despejada a los 2 tipos fundamentales de flujo de caja: 'expense' e 'income'.
    - En `src/constants/categories.ts`: incorporación de la categoría 'Reembolsos' dentro de `INCOME_CATEGORIES` (ícono 'receipt-outline', color '#30D158') para permitir el registro ágil de reintegros de gastos laborales, corporativos o de terceros como ingresos directos al saldo disponible.
    - Compilación verificada con 0 errores TypeScript (`npx tsc --noEmit`).

- `[DEBTS-SETTLED-HISTORY-TAB-001]` (2026-10-13): Segregación de deudas activas e historial dedicado con 4ta pestaña 'Liquidadas' y eliminación de acordeones inline:
  - Archivos intervenidos: `app/(app)/(tabs)/debts.tsx`.
  - Resumen técnico:
    - Eliminación total de acordeones inline y elementos saldados de las vistas activas (`'all'`, `'personal'`, `'receivables'`), logrando que préstamos bancarios y préstamos a amigos desaparezcan instantáneamente al saldarse (100% de paridad con gastos en tarjeta).
    - Implementación de la 4ta píldora de filtro `Liquidadas` (`filterTab: 'settled'`) con `archive-outline` y contador dinámico de pasivos y cobros extintos.
    - Vista dedicada de historial para consultar y gestionar deudas liquidadas y préstamos cobrados con sus badges neón y botones de borrado seguro.
    - Ocultamiento de bloques vacíos innecesarios en la vista general `'all'` cuando hay actividad en otras categorías.
    - Compilación verificada con 0 errores TypeScript (`npx tsc --noEmit`).

- `[DEBTS-SETTLEMENT-LIFECYCLE-001]` (2026-10-13): Ciclo de vida completo de liquidación de deudas, segregación visual en acordeones y corrección contable:
  - Archivos intervenidos: `src/store/debts-store.ts`, `app/(app)/(tabs)/debts.tsx`.
  - Resumen técnico:
    - En `src/store/debts-store.ts`:
      - Introducción de `settled?: boolean` y `settledAt?: string` en el modelo `PersonalDebt`.
      - Marcado automático de liquidación (`settled: true`, `settledAt: new Date().toISOString()`) en `payPersonalDebt` cuando el saldo remanente alcanza cero (`remainingAmount <= 0.001`) o cuando se completan todas las cuotas pactadas (`paidInstallments >= totalInstallments`).
      - Desmarcado automático de liquidación (`settled: false`, `settledAt: undefined`) en `revertPersonalDebtPayment` al restaurar cuotas o saldo pendiente ante la eliminación de un pago.
    - En `app/(app)/(tabs)/debts.tsx`:
      - Corrección de cálculo en `monthCommitment`: filtrado estricto `d.isLender && !d.settled && (d.remainingAmount ?? 0) > 0.001` para excluir compromisos de deudas extintas y prevenir montos mensuales fantasma.
      - Supresión de falsos badges de vencimiento y leyendas de débito en deudas saldadas.
      - Segregación visual limpia de la vista activa mediante acordeones colapsables (`📦 Préstamos Liquidados` y `📦 Préstamos Cobrados`), preservando la lista de deudas activa despejada y el historial 100% auditable.
    - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[LEGACY-DEBT-MIGRATION-AND-CASHFLOW-001]` (2026-10-13): Flujo de deudas preexistentes (`mode=legacy`) desde Ajustes e impacto real en caja para nuevas deudas y préstamos:
  - Archivos intervenidos: `src/store/debts-store.ts`, `app/(app)/(modal)/new-debt.tsx`, `src/components/settings/settings-section-list.tsx`.
  - Resumen técnico:
    - En `src/store/debts-store.ts`: soporte de `initialPaidInstallments` en `addPersonalDebt` para inicializar `paidInstallments` y calcular `remainingAmount` descontando cuotas históricas ya pagadas sin alterar la caja actual.
    - En `app/(app)/(modal)/new-debt.tsx`: lectura de `useLocalSearchParams<{ mode?: string }>()`:
      - En modo normal (`!isLegacyMode`): al crear una deuda bancaria recibida se inyecta un ingreso (`type: 'income'`) por el monto desembolsado en `useTransactionsStore`; al otorgar un préstamo a amigo se inyecta un egreso (`type: 'expense'`) que descuenta el dinero prestado de la billetera actual.
      - En modo `legacy` (`mode=legacy` desde Ajustes): oculta la pestaña de "Gasto en Tarjeta", muestra banner informativo ámbar indicando que el registro es histórico y no afecta el saldo disponible actual, habilita el campo de cuotas ya pagadas para préstamos bancarios y registra préstamos a amigos por su saldo pendiente actual sin generar transacciones de caja.
    - En `src/components/settings/settings-section-list.tsx`: incorporación del acceso "Registrar Deudas Preexistentes" en la sección "Datos y Almacenamiento" que navega a `/(app)/(modal)/new-debt?mode=legacy`.
    - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[PERSONAL-DEBT-SAFE-DELETE-001]` (2026-10-13): Eliminación protegida de préstamos personales desde el modal de detalle con confirmación cyberpunk y limpieza en cascada:
  - Archivos intervenidos: `src/store/debts-store.ts`, `app/(app)/(tabs)/debts.tsx`.
  - Resumen técnico:
    - En `src/store/debts-store.ts`: implementación de `deletePersonalDebt: (id: string) => void` para remover el préstamo del estado persistido.
    - En `app/(app)/(tabs)/debts.tsx`: botón de eliminación dentro del modal de detalle de préstamo personal con confirmación interactiva de dos pasos (advertencia de acción irreversible y opción de conservar o eliminar también los pagos históricos vinculados en `useTransactionsStore` filtrados por `relatedDebtId`).
    - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[PERSONAL-DEBT-DISCOUNT-AND-LAST-INSTALLMENTS-001]` (2026-10-13): Pago de cuota regular con descuento por pronto pago y adelanto de últimas $N$ cuotas en préstamos personales:
  - Archivos intervenidos: `src/store/debts-store.ts`, `src/store/transactions-store.ts`, `app/(app)/(tabs)/debts.tsx`.
  - Resumen técnico:
    - En `src/store/debts-store.ts`: actualización de `payPersonalDebtInstallment` admitiendo `actualPaidAmount` e `installmentsSettledCount` para descontar del pasivo el valor nominal completo de las cuotas saldadas mientras el movimiento en caja refleja únicamente el desembolso efectivo con descuento; actualización simétrica de `revertPersonalDebtInstallment` restaurando exactamente la cantidad de cuotas y el valor nominal revertido.
    - En `src/store/transactions-store.ts`: adición de metadatos opcionales `debtInstallmentsCount` y `debtNominalDeduction` en `Transaction` para trazabilidad y reversión exacta al eliminar pagos desde Movimientos.
    - En `app/(app)/(tabs)/debts.tsx`: evolución del modal de detalle de préstamo personal con selector de modo ("Pagar Cuota del Mes" vs "Adelantar Últimas Cuotas"), selector interactivo `- / +` de cantidad de cuotas finales a liquidar, e input opcional de monto real pagado con cálculo en vivo del ahorro por descuento.
    - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[REIMBURSEMENT-UI-PARITY-FIX-001]` (2026-10-12): Paridad visual integral de reembolsos de terceros en Dashboard, Movimientos y modal de eliminación:
  - Archivos intervenidos: `app/(app)/(tabs)/index.tsx`, `app/(app)/(tabs)/transactions.tsx`, `src/components/transactions/delete-transaction-modal.tsx`.
  - Resumen técnico:
    - En `app/(app)/(tabs)/index.tsx` (Dashboard): preservación de `type: t.type` en `recentItems` eliminando la coerción ternaria que degradaba `'reimbursement'` a `'expense'` (rojo `-`).
    - En `app/(app)/(tabs)/transactions.tsx`: propagación de `cardName`, `paymentMethod` e `installmentsCount` en `mappedTransactions` para mostrar la etiqueta `💳 [Tarjeta]` en cada abono recibido para cubrir el plástico.
    - En `src/components/transactions/delete-transaction-modal.tsx`: unificación de positividad (`isPositive = type === 'income' || type === 'reimbursement'`) con color `#00FFA3`, signo `+`, y aviso contextual indicando que si se elimina el reembolso el monto vuelve a quedar pendiente en la cuenta del tercero.
    - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[DEBTS-MODAL-RETURN-RENDER-FIX-001]` (2026-10-12): Renderizado reactivo inmediato al regresar del modal de Nueva Deuda (bypass de `react-freeze`) y cálculo inline de resúmenes:
  - Archivos intervenidos: `app/(app)/(tabs)/debts.tsx`, `app/(app)/(modal)/new-debt.tsx`.
  - Resumen técnico:
    - En `app/(app)/(tabs)/debts.tsx`: sustitución de selectores basados en referencias de funciones estáticas de Zustand por cálculos reactivos directos con `useMemo` sobre los arrays de estado (`thirdPartyCharges`, `personalDebts`, `friendLoans`, `people`) e incorporación de `focusRefreshKey` incrementado en `useFocusEffect` para forzar el re-render al descongelar la pestaña tras cerrar el modal (`react-freeze` / `react-native-screens`).
    - Cálculo inline completo de `thirdPartyMonthlySummaries` dentro de `useMemo` en `debts.tsx` y limpieza de filtros/acordeones al detectar nuevos cargos.
    - En `app/(app)/(modal)/new-debt.tsx`: auto-creación y selección transparente de persona o tarjeta/banco si el usuario dejó texto en los formularios inline y pulsó directamente el botón principal con todos los datos de la compra completos.
    - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[NEW-DEBT-PERSON-CREATION-FLOW-FIX-001]` (2026-10-12): Flujo contextual de registro de personas, botón dinámico y erradicación de `Alert.alert` en Nueva Deuda:
  - Archivos intervenidos: `app/(app)/(modal)/new-debt.tsx`.
  - Resumen técnico:
    - Intercepción inteligente en `handleSave`: redirección contextual a la creación del sub-elemento cuando hay formularios inline abiertos (persona, tarjeta o banco), eliminando la falsa validación de "concepto requerido".
    - Botón inferior adaptativo (`saveButtonLabel`): refleja dinámicamente `'REGISTRAR PERSONA'`, `'GUARDAR BANCO'`, `'GUARDAR TARJETA'` o `'GUARDAR CARGO EN TARJETA'`.
    - Ergonomía móvil: soporte de `autoFocus`, `returnKeyType="done"` y `onSubmitEditing` en el input de personas para registro directo desde el teclado. Fila de botones "Cancelar" y "Registrar Persona".
    - Cumplimiento de regla de oro: erradicación total de llamadas a `Alert.alert` en el modal, reemplazadas por banner de error temático cyberpunk integrado (`formError`).
    - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[DEBTS-IMMEDIATE-REACTIVITY-FIX-001]` (2026-10-12): Reactividad inmediata en compras compartidas y sincronización atómica de personas sin reinicio:
  - Archivos intervenidos: `src/store/debts-store.ts`, `app/(app)/(tabs)/debts.tsx`.
  - Integridad relacional en `addThirdPartyCharge`: alta atómica de personas en `people` al registrar una compra para un contacto nuevo, previniendo datos huérfanos.
  - Suscripción reactiva en `debts.tsx` a `people` e inclusión en las dependencias de `thirdPartyMonthlySummaries`.
  - Sincronización de enfoque en `useFocusEffect`: detección de incremento en cargos para auto-conmutar de `'personal'` a `'receivables'` al regresar del modal, garantizando que el usuario vea de inmediato la persona con su compra sin necesidad de reiniciar la aplicación.
  - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[NEW-DEBT-INLINE-CARD-CREATION-001]` (2026-10-12): Integración del flujo de creación inline de tarjeta de crédito y bancos en el modal de Nueva Deuda:
  - Archivos intervenidos: `app/(app)/(modal)/new-debt.tsx`.
  - Integración del flujo de creación inline de tarjeta de crédito y bancos en el modal de Nueva Deuda (pestaña Gasto en Tarjeta), replicando la experiencia de Nuevo Gasto.
  - Soporte de nombre de tarjeta, selector de banco emisor con creación anidada inline de banco, y calibración de día de corte (1-31).
  - Auto-selección inmediata de la tarjeta recién creada en `selectedCardIdForCharge` para fluidez de registro sin abandonar el flujo.
  - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).

- `[THIRD-PARTY-MULTI-PURCHASES-FIX-001]` & `[SETTINGS-DATABASE-PURGE-HARDENING-001]` (2026-10-12): Visualización de múltiples compras por deudor, consolidación contable y blindaje integral del vaciado de base de datos:
  - En `src/store/debts-store.ts`: robustecimiento de identificadores unívocos en `addThirdPartyCharge` (`Date.now() + random`), normalización canónica (`normalizeStr`) y consolidación unificada por deudor en `getThirdPartyMonthlyBillingSummary()` agrupando todas las compras asociadas en `summary.charges`.
  - En `app/(app)/(tabs)/debts.tsx`: corrección del conteo total real de compras acumuladas en la cabecera de la sección de tarjetas, erradicación de colisiones de llaves React mediante IDs unívocos, y renderizado de cada compra con el nombre de su tarjeta correspondiente junto al botón de eliminación individual con modal de confirmación.
  - En `src/components/settings/settings-section-list.tsx`: blindaje del vaciado de base de datos en Ajustes con vaciado concurrente de `persist.clearStorage()`, remoción garantizada de claves v1 y v2 en `safeStorage`, y reseteo total de catálogos maestros (`people: []` y `banks: []`) sin dejar contactos ni datos huérfanos.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DEBTS-DIRECT-FOCUS-001]`: Foco táctil directo en la tarjeta de resumen y priorización de reembolsos de tarjetas compartidas:
  - En `src/components/debts/debts-summary-card.tsx`: interactividad táctil en las columnas de la cabecera mediante `onPressPersonal` y `onPressThirdParty` (`TouchableOpacity`), proveyendo acceso directo e intuitivo al filtro correspondiente con feedback táctil y chevrons estilizados.
  - En `app/(app)/(tabs)/debts.tsx`: conexión táctil directa en la tarjeta superior para alternar a 'personal' o 'receivables' instantáneamente; reorganización de la SECCIÓN 2 ("POR COBRAR") posicionando la Subsección de Reembolsos de Tarjetas Compartidas al tope antes de los préstamos a amigos, con todas las compras detalladas desplegadas por defecto.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[THIRD-PARTY-VISIBILITY-FIX-001]`: Resiliencia en cálculos de resumen de terceros y visibilidad inmediata con acordeón desplegado:
  - En `src/store/debts-store.ts`: resiliencia en `getThirdPartyMonthlyBillingSummary()` con fallback defensivo para `remainingAmount` (`c.remainingAmount !== undefined ? c.remainingAmount : c.amount`), cuotas (`installmentsCount` con default a 1) y cálculo defensivo de `monthlyInstallmentAmount` (`c.monthlyInstallmentAmount || (c.installmentsCount ? c.amount / c.installmentsCount : c.amount)`).
  - En `app/(app)/(tabs)/debts.tsx`: visualización inmediata de compras de terceros con acordeón desplegado por defecto (`collapsedSummaries: Record<string, boolean>`), banner aclaratorio en "POR COBRAR" que desglosa explícitamente `💳 Tarjetas de Terceros` vs `🤝 Préstamos a Amigos`, renderizado garantizado de la subsección `REEMBOLSOS DE TARJETAS COMPARTIDAS` y estado vacío informativo cuando no hay compras en tarjeta.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[THIRD-PARTY-PURCHASES-CONTROL-001]`: Control detallado de compras por persona, eliminación segura y distribución del abono en 2 fases:
  - En `src/store/debts-store.ts`: incorporación de la acción `deleteThirdPartyCharge: (chargeId: string) => void` para eliminar cargos individuales registrados por error, y optimización del algoritmo de abono general por persona (`recordMonthlyPersonAbono`) en 2 fases estrictas (Fase 1: cobertura secuencial de compromisos exigibles del mes actual para cada compra; Fase 2: amortización proporcional del excedente directamente a capital diferido remanente, recalculando cuotas futuras).
  - En `app/(app)/(tabs)/debts.tsx`: rediseño visual y ergonómico del desglose de compras individuales por persona en el acordeón, mostrando concepto, fecha de registro, cuota actual ("Cuota X de Y" o "1 cuota cierre"), valor mensual ($XX.XX/mes), barra de progreso horizontal en verde neón `#00FFA3`, estado mensual dinámico ("Cuota cubierta" con badge verde vs "Pendiente" con badge ámbar), y botón de papelera roja (`#FF453A`) con modal interactivo de confirmación segura para eliminar compras ingresadas por error. Incorporación de banner informativo al pie indicando que la anulación de abonos se realiza desde la pestaña Movimientos con reversión contable automática.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[TRANSACTIONS-REIMBURSEMENT-UI]`: Soporte integral de reembolsos de terceros en las vistas e historial de transacciones:
  - En `src/components/transactions/transaction-item-card.tsx`: ampliación de `TransactionType` con `'reimbursement'`, unificación del tratamiento positivo contable (`item.type === 'income' || item.type === 'reimbursement'`), renderizado del signo `+` y acento verde neón `#00FFA3` consistente.
  - En `app/(app)/(tabs)/transactions.tsx`: preservación fiel de `type: tx.type` al mapear transacciones sin degradar reembolsos a gastos, e inclusión de `'reimbursement'` en el filtro y conteo de transacciones de ingresos.
  - En `src/components/dashboard/recent-transactions-list.tsx`: soporte completo para `'reimbursement'` como movimiento positivo (`+ $XX.XX`), renderizado con acento verde neón y fondo verde translúcido en el icono.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DEBTS-ABONO-REACTIVITY]`: Reactividad instantánea en abonos de terceros y robustecimiento multidimensional de coincidencias:
  - En `src/store/debts-store.ts`: ampliación de la firma de `recordMonthlyPersonAbono` admitiendo `personId?: string` opcional, implementación de normalización canónica de cadenas sin diacríticos (`normalizeStr`), búsqueda y filtrado multidimensional de cargos de terceros coincidiendo por `personId` exacto o por coincidencia flexible de nombre en minúsculas y sin acentos, cascada amortizadora inmutable priorizando compras a 1 cuota y orden cronológico, y alineación de consistencia en `revertThirdPartyPersonAbono`.
  - En `app/(app)/(tabs)/debts.tsx`: suscripción reactiva directa y en tiempo real al array `thirdPartyCharges` desde `useDebtsStore`, memoización eficiente de `thirdPartyMonthlySummaries` recalculada al instante ante cambios en cargos o tarjetas, y suministro explícito de `personId` en la confirmación del abono dentro del modal interactivo, logrando actualización visual inmediata del saldo remanente y del estado mensual (`[ AL DÍA ESTE MES ]` / `[ CUOTA PENDIENTE ]`).
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DUAL-BILLING-PHASE2]`: Centro de Liquidación Mensual de Terceros por Persona y Modal Interactivo de Abono:
  - En `app/(app)/(tabs)/debts.tsx`: rediseño visual de la sección "Reembolsos de Tarjetas Compartidas" convirtiéndola en el Centro de Liquidación Mensual por Persona.
  - Cada tarjeta agrupa a la persona con su plástico bancario, desglose de compromiso exigible para el corte actual (cuota del mes, abonado este ciclo, resta exigible en verde neón `#00FFA3`), estado dinámico (`[ AL DÍA ESTE MES ]` vs `[ CUOTA PENDIENTE ]`), deuda global acumulada a futuro y acordeón táctil para desplegar el detalle de cada compra individual.
  - Implementación del Modal Interactivo de Abono de Terceros con píldoras de atajo rápido ("Cubrir resto del mes" y "Liquidar deuda total"), validación reactiva en tiempo real y despacho simultáneo de `recordMonthlyPersonAbono` y `addTransaction` de tipo `'reimbursement'` en `useTransactionsStore`. Erradicación absoluta de `Alert.alert`.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DUAL-BILLING-PHASE1]`: Consolidación contable y agrupación por ciclo de tarjeta (Fase 1 de facturación dual):
  - En `src/store/debts-store.ts`: creación de la interfaz `ThirdPartyPersonMonthlySummary`, método selector `getThirdPartyMonthlyBillingSummary` que agrupa compras por persona y tarjeta calculando compromisos exigibles del mes vs deuda total remanente; implementación de `recordMonthlyPersonAbono` (amortización en cascada priorizando compras diferidas a 1 cuota y por orden cronológico) y acciones de reversión contable `revertThirdPartyChargeCollection` y `revertThirdPartyPersonAbono`.
  - En `src/store/transactions-store.ts`: ampliación de `Transaction` y de la acción `addTransaction` con soporte para `relatedPersonId` y `relatedPersonName`. Enlace automático en `deleteTransaction` para disparar reversiones contables en `useDebtsStore` cuando se elimina un reembolso de tarjeta compartida.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[THIRD-PARTY-CHARGES-PHASE1]`: Fase 1 de cargos a terceros en tarjeta de crédito (Catálogo de personas, modelo contable ampliado y formulario reactivo):
  - En `src/store/debts-store.ts`: incorporación de la entidad `PersonContact` (`id`, `name`, `createdAt`), catálogo maestro `people: PersonContact[]`, y acciones `addPerson` (con normalización y prevención de duplicados) y `deletePerson`.
  - Ampliación del modelo contable en `ThirdPartyCardCharge`: incorporación de `personId`, `cardId`, `totalAmount`, `remainingAmount`, `installmentsCount`, `monthlyInstallmentAmount`, `currentPeriodPaidAmount`, `paidInstallmentsCount`, `lastPaymentDate` y `settledAt`. Nuevas acciones `recordThirdPartyInstallmentAbono` (para liquidación progresiva de cuotas o total) y `revertThirdPartyChargeCollection` (rollback contable seguro de abonos).
  - En `app/(app)/(modal)/new-debt.tsx`: rediseño integral de la pestaña de gastos compartidos en tarjeta (`card_charge`) con selector colapsable de personas registradas y creación inline de nuevos contactos (`addPerson`), selector colapsable de tarjetas reales disponibles (`useCardsStore.cards`), selector de cuotas (1 cuota del mes vs diferido hasta 36 cuotas) y tarjeta cyberpunk de cálculo en vivo del monto exigible para el próximo corte de la tarjeta con fecha de corte proyectada.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DASHBOARD-DEBTS-SYNC-001]`: Sincronización reactiva del monitor de deudas en el Dashboard y erradicación de mocks:
  - En `src/components/dashboard/upcoming-debts-card.tsx`: erradicación absoluta de `DEFAULT_DEBTS` y datos mock hardcodeados. Conexión reactiva en tiempo real con `useDebtsStore` (`personalDebts`) y `useSettingsStore` (`currency`).
  - Implementación de estado visual "Al Día" cuando no hay deudas registradas (`activeDebts.length === 0`) con chip verde y mensaje claro ("Sin compromisos pendientes • No tienes deudas registradas ni cuotas pendientes por vencer").
  - Renderizado dinámico de compromisos reales (`activeDebts.length > 0`) con cálculo de fecha de corte recurrente por día del mes (clamping mensual), semáforo de urgencia de vencimiento y navegación táctil hacia la pestaña de deudas.
  - En `app/(app)/(tabs)/index.tsx`: integración limpia del componente sin props residuales.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[CARD-BANK-DROPDOWN-001]`: Selector colapsable de Bancos en la creación rápida de tarjetas dentro del flujo de gastos:
  - En `app/(app)/(modal)/new-transaction.tsx`: sustitución del input de texto libre por un selector colapsable de Bancos registrados (`useCardsStore.banks`) en el formulario inline de creación rápida de tarjetas.
  - Soporte para selección directa de bancos existentes y opción inline para registrar un nuevo banco en el catálogo maestro (`addBank`), garantizando la relación jerárquica Banco -> Tarjeta.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[EXPENSE-CREDIT-CARD-001]`: Incorporación de método de pago con Tarjeta de Crédito y diferido a cuotas en gastos:
  - En `src/store/transactions-store.ts`: ampliación de `Transaction` con `paymentMethod` ('cash_debit' | 'credit_card'), `cardId`, `cardName` e `installmentsCount`, actualizando la firma y persistencia de `addTransaction`.
  - En `app/(app)/(modal)/new-transaction.tsx`: incorporación del selector de método de pago en gastos (Efectivo/Débito vs Tarjeta de Crédito). Selector colapsable de tarjetas registradas en `useCardsStore` con creación inline de tarjetas, selector de cuotas (1 cuota del mes vs diferido a cuotas con cálculo en vivo de cuota mensual estimada) y despacho completo al guardar.
  - En `src/components/transactions/transaction-item-card.tsx`: visualización contextual de badge de tarjeta de crédito en el historial (`💳 Visa Infinite` o `💳 Visa Infinite (3 cuotas)`).

- `[BANKS-LOANS-REFACTOR-001]`: Refactorización de deudas propias enfocada en Préstamos Bancarios Personales y Catálogo de Bancos:
  - En `src/store/cards-store.ts`: incorporación de la entidad `Bank` (`id`, `name`, `createdAt`), catálogo inicial de bancos populares y acciones `addBank` (con prevención de duplicados) y `deleteBank`.
  - En `app/(app)/(modal)/new-debt.tsx`: eliminación definitiva de tarjetas de crédito en deudas propias. Formulario 100% enfocado en Préstamos Bancarios Personales (selector colapsable de bancos registrados con opción inline de nuevo banco, concepto del préstamo, capital original, cuotas, cuota mensual, día de pago del mes y tarjeta en vivo con total e intereses calculados).
  - En `app/(app)/(tabs)/debts.tsx`: visualización contextual de deudas propias como Préstamos Bancarios (banco emisor, concepto, cuota mensual, progreso de cuotas pagadas/restantes y próximo día de débito).
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DEV-RESET-TOOL-001]`: Herramienta temporal de desarrollo para restablecimiento total y vaciado de transacciones de prueba:
  - En `src/store/transactions-store.ts`: vaciado al 100% de `INITIAL_TRANSACTIONS = []`, incorporación de `clearAllTransactions` y actualización de la clave de almacenamiento local a `'controlfynz-transactions-storage-v2'` para invalidar caché residual previa de transacciones en dispositivos.
  - En `src/components/settings/settings-section-list.tsx`: incorporación de la herramienta temporal de desarrollo en la pestaña de Ajustes con badge `[ DEV / TEST ]`, subtítulo explicativo de que es una herramienta temporal para fase de pruebas, y modal oscuro de confirmación para vaciar `AsyncStorage` y resetear todos los stores a cero en 1 toque.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[PERSONAL-DEBT-PAYMENT-MODAL]`: Modal interactivo cyberpunk para abonos a deudas personales y trazabilidad contable reversible:
  - En `src/store/debts-store.ts`: calibración de `payPersonalDebt` y `revertPersonalDebtPayment` para incrementar/decrementar de forma segura `paidInstallments` en préstamos por cuotas y ajustar el saldo restante a 2 decimales.
  - En `app/(app)/(tabs)/debts.tsx`: eliminación definitiva de `Alert.alert` al pagar deudas propias, creación del Modal interactivo con estética cyberpunk (`#1E1E1E`, badge neón `#00FFA3`, validación estricta que impide pagar más del saldo restante, píldoras de cuota sugerida y liquidación total). Despacho obligatorio de `addTransaction` (`type: 'expense'`, `category: 'Pago Deudas'`, `relatedDebtId: debt.id`) al confirmar el pago, garantizando que el movimiento aparezca en la pestaña Movimientos y sea 100% reversible si se elimina.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DEBTS-WIPE-CLEAN-001]`: Limpieza total de datos de prueba en deudas y estados vacíos (*Empty States*) elegantes:
  - En `src/store/debts-store.ts`: vaciado al 100% de los datos semilla de deudas (`personalDebts: []`, `thirdPartyCharges: []`, `friendLoans: []`), incorporación de la acción `clearAllDebts` y actualización de la clave de almacenamiento local a `'controlfynz-debts-storage-v2'` para invalidar caché residual previa en dispositivos físicos.
  - En `app/(app)/(tabs)/debts.tsx`: implementación de estados vacíos elegantes (*Empty States*) tanto para pasivos propios (*«Sin deudas registradas • Estás al día»*) como para cuentas por cobrar (*«Sin cuentas por cobrar pendientes»*), con iconos alusivos, diseño oscuro integrado y preservación del botón superior «NUEVA DEUDA».
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[UI-DELETE-MODAL-REUSE]`: Unificación y reutilización del Modal interactivo de eliminación de transacciones:
  - Creación de `src/components/transactions/delete-transaction-modal.tsx`: componente reutilizable que encapsula el modal de confirmación con diseño cyberpunk (icono de papelera en rojo translúcido, monto dinámico neón/rojo, mensaje explicativo de reversión automática y botones estilizados).
  - En `src/components/dashboard/recent-transactions-list.tsx`: eliminación de `Alert.alert` y sustitución por `<DeleteTransactionModal />`, unificando la experiencia estética en la sección "Últimos Movimientos" del Dashboard.
  - En `app/(app)/(tabs)/transactions.tsx`: refactorización limpia para reutilizar `<DeleteTransactionModal />` eliminando duplicación de código.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[TX-ROLLBACK-MODAL-001]`: Reversión contable integral y Modal interactivo de eliminación de transacciones:
  - En `src/store/debts-store.ts`: implementación de acciones de reversión contable `revertFriendLoanCollection` (restaura saldo del préstamo y reactiva de `settled: false`) y `revertPersonalDebtPayment` (restaura saldo de deudas personales).
  - En `src/store/transactions-store.ts`: incorporación de metadatos de trazabilidad en transacciones (`relatedLoanId`, `relatedDebtId`, `relatedChargeId`). En `deleteTransaction`, detección automática de operaciones vinculadas para disparar el rollback contable restaurando el estado original de la deuda o préstamo antes de eliminar el movimiento.
  - En `app/(app)/(tabs)/transactions.tsx`: sustitución de `Alert.alert` por un Modal de Confirmación interactivo oscuro con icono de papelera translúcido en rojo `#FF453A`, concepto, monto dinámico y advertencia clara de reversión de saldo.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[FRIEND-LOAN-MODAL-001]`: Reemplazo del diálogo nativo por Modal interactivo futurista de abonos a préstamos:
  - En `app/(app)/(tabs)/debts.tsx`: reemplazo completo del cuadro tosco nativo `Alert.alert` por un Modal interactivo diseñado con la estética futurista de ControlFynz (fondo translúcido oscuro, tarjeta `#1E1E1E` con bordes `#2C2C2E`, badge neón `#00FFA3` y botón cerrar ✕).
  - Validación reactiva estricta: restricción en tiempo real para impedir que el abono supere el saldo pendiente del préstamo, con feedback visual de advertencia en rojo (`#FF453A`) y bloqueo preventivo del botón de confirmación.
  - Píldoras de atajo rápido: botones de selección táctil inmediata para abono del 50% y Liquidar Total (100%).
  - Impacto contable simultáneo: persistencia directa en `collectFriendLoan` (`useDebtsStore`) y registro automático de la transacción de ingreso en `useTransactionsStore`.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[FRIEND-LOANS-001]`: Estandarización de fechas de cobro, amortización progresiva y liquidación de préstamos a amigos:
  - En `src/store/debts-store.ts`: incorporación de `settledAt` en `FriendLoan`, calibración de `collectFriendLoan` para liquidar en amortizaciones parciales y marcar `settled: true` automáticamente cuando se liquida el total.
  - En `app/(app)/(modal)/new-debt.tsx`: eliminación de texto libre para fechas de cobro en préstamos a amigos, implementación de selector de plazos rápidos (15 días, 1 mes, 3 meses, personalizada con auto-máscara DD/MM/AAAA) y tarjeta en vivo con cálculo de fecha y días restantes. Almacenamiento en ISO YYYY-MM-DD.
  - En `app/(app)/(tabs)/debts.tsx`: visualización estandarizada de vencimientos de préstamos a amigos con días restantes, botón de acción rápida `[ 💵 REGISTRAR ABONO ]` con opciones de abono parcial y liquidación total que generan la transacción de ingreso contable en paralelo en `useTransactionsStore`, e insignia `LIQUIDADO COMPLETO` con fecha de liquidación.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[CARD-INTEREST-001]`: Cálculo en vivo de tasa de interés y sobrecosto financiero en compras diferidas con tarjeta de crédito:
  - En `app/(app)/(modal)/new-debt.tsx`: cálculo matemático en vivo del porcentaje de interés y sobrecosto financiero en compras diferidas con tarjeta de crédito (`totalPagar = num * cuota`, `interes = totalPagar - orig`, `pct = (interes/orig)*100`). Bloque informativo interactivo que destaca en ámbar el sobrecosto o en verde neón cuando es una compra a meses sin intereses (`0.0%`). Persistencia de `interestRate` en el store.
  - En `app/(app)/(tabs)/debts.tsx`: visualización en las tarjetas de deudas diferidas con chip indicador del costo financiero (`+X.X% interés` o `Sin intereses (0%)`).
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[CARD-MODALITY-001]`: Soporte de doble modalidad para deudas de tarjetas de crédito (Pago a Cierre vs Compra a Cuotas):
  - En `src/store/debts-store.ts`: incorporación del atributo `cardPaymentType?: 'full_statement' | 'installments'` en la interfaz `PersonalDebt` para tipado y persistencia precisa del modelo operativo de la tarjeta.
  - En `app/(app)/(modal)/new-debt.tsx`: eliminación del campo redundante "Pago mínimo sugerido" y creación del selector de modalidad de tarjeta de crédito con 2 píldoras interactivas ("Pago a Cierre (Mes)" vs "Compra a Cuotas"). Captura especializada para compras diferidas en tarjeta con concepto de compra, número de cuotas, valor mensual y cálculo en vivo vinculado automáticamente al día de corte de la tarjeta seleccionada.
  - En `app/(app)/(tabs)/debts.tsx`: diferenciación visual clara en la sección "MIS DEUDAS" con badges contextuales `TARJETA • PAGO A CIERRE` (mostrando día de corte y saldo al cierre) vs `TARJETA • A CUOTAS` (mostrando cuotas pagadas/restantes y cuota mensual fija).
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[NEW-DEBT-002]`: Selector de instrumentos financieros en nueva deuda y visualización contextual de pasivos:
  - En `app/(app)/(modal)/new-debt.tsx`: eliminación de categorías abstractas y creación del selector de instrumentos financieros (Tarjeta de Crédito vs Préstamo en Cuotas). Conexión del selector colapsable de tarjetas registradas en `useCardsStore` con creación inline rápida de nuevas tarjetas/bancos (`addCard`). Cálculo matemático en vivo de cuotas e intereses para préstamos personales.
  - En `app/(app)/(tabs)/debts.tsx`: visualización contextual de deudas propias diferenciando tarjetas de crédito (badge, corte recurrente) y préstamos a plazos (badge, cuotas pagadas/restantes, día de pago).
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[CARDS-INIT-001]`: Creación del store de tarjetas de crédito y vinculación con deudas y transacciones:
  - Creación de `src/store/cards-store.ts` con persistencia `safeStorage`, interfaz `CreditCard` (`name`, `bankName`, `cutOffDay`, `creditLimit`, `color`, `createdAt`), acciones CRUD (`addCard`, `updateCard`, `deleteCard`) y exactamente 1 tarjeta demostrativa limpia.
  - Modificación de `src/store/debts-store.ts`: ampliación de `PersonalDebt` con soporte para `debtType` ('credit_card' | 'installment_loan'), `cardId`, `totalInstallments` y `paidInstallments`. Depuración de datos iniciales a 1 caso único por concepto (1 deuda de tarjeta, 1 préstamo en cuotas, 1 préstamo a amigo, 1 cargo en tarjeta de tercero).
  - Modificación de `src/store/transactions-store.ts`: depuración de datos semilla a exactamente 1 ingreso y 1 gasto demostrativo.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[DEBTS-CALIBRATION-002]`: Calibración y robustecimiento del sistema de deudas y préstamos:
  - En `src/store/debts-store.ts`: incorporación de `createdAt` en todas las interfaces de deudas y préstamos, soporte para `dueDay` (día de corte 1-31) y tasas de interés con precisión decimal.
  - En `app/(app)/(modal)/new-debt.tsx`: selector numérico de día de corte (1-31) con validación estricta y leyenda explicativa de autoajuste en meses cortos (*End-of-Month Clamping*); soporte decimal en tasas de interés con parseo de comas y puntos.
  - En `app/(app)/(tabs)/debts.tsx`: corrección de la cabecera en iOS haciendo el botón "NUEVA DEUDA" 100% visible y accesible; algoritmo de proyección de corte mensual para meses de 28, 29, 30 y 31 días; organización nítida en dos bloques independientes (MIS DEUDAS con acento rojo/ámbar vs CUENTAS POR COBRAR con acento cyan/verde neón), mostrando fecha de creación formateada en todas las tarjetas.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[NEW-DEBT-001]`: Implementación del modal de registro de nuevas deudas y préstamos:
  - En `app/(app)/(modal)/_layout.tsx`: registro de la pantalla `new-debt` en el Stack modal.
  - En `app/(app)/(modal)/new-debt.tsx`: creación del modal de 3 pestañas dinámicas (Deuda Propia, Préstamo a Amigo con cálculo de interés en tiempo real, y Gasto Compartido en Tarjeta), con persistencia en `useDebtsStore` y paridad multiplataforma (iOS y Android).
  - En `app/(app)/(tabs)/debts.tsx`: botón de acción rápida estilizado en verde neón en la cabecera ("NUEVA DEUDA") que navega al modal.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[RULES-002]`: Incorporación de la Regla 0 y blindaje estricto de la Regla 1 en [AGENTS.md](file:///c:/Users/david/Documents/ControlFynz/AGENTS.md):
  - **Regla 0 (Inmutabilidad Suprema)**: Prohibición total de auto-modificación de `AGENTS.md`. Ningún agente ni subagente puede modificar, agregar, editar o eliminar directrices en este archivo sin la instrucción explícita y directa del usuario.
  - **Refuerzo de la Regla 1 (Aprobación Previa Obligatoria)**: Protocolo de dos pasos estrictos e ineludibles: (1) Presentar resumen previo con archivos (1-3 máx.), acciones exactas y POR QUÉ técnico; (2) **STOP y Espera de Aprobación Explícita** del usuario (ej. "ok", "procede", "adelante") antes de tocar, crear o editar cualquier archivo en disco.

- `[RULES-001]`: Incorporación formal del Protocolo Estricto de Desarrollo y Reglas de Calidad (Zero Exceptions) en [AGENTS.md](file:///c:/Users/david/Documents/ControlFynz/AGENTS.md):
  1. **Protocolo Obligatorio de Planeación y Resumen Previo**: STOP Obligatorio antes de tocar cualquier archivo de código; presentación previa de archivos a intervenir (límite estricto de 1 a 3 archivos por tarea), desglose de acciones exactas y justificación técnica (POR QUÉ técnico). Tareas de más de 3 archivos deben dividirse en sub-tareas atómicas secuenciales.
  2. **Estándares Estrictos de Código y TypeScript**: Componentes declarados únicamente como arrow functions con tipado inline explícito (`const Component = (props: Props): JSX.Element => { ... }`), prohibición estricta de `function` declarations, cero tolerancia a `any` o `unknown`, y compilación obligatoria limpia (`npx tsc --noEmit` con 0 errores).
  3. **Paridad Multiplataforma (iOS & Android)**: Pruebas y calibración explícita para ambos ecosistemas (offsets de `KeyboardAvoidingView` específicos por plataforma, modales nativos vs transparentes con backdrop oscuro, insets y SafeArea en gestos y barras de navegación, tema oscuro futurista unificado).
  4. **Integridad Contable y Modelo Offline-First**: Implementación obligatoria de `safeStorage` con fallback en memoria para tiendas Zustand y principio de doble impacto contable en operaciones financieras y amortizaciones.
  5. **Idioma Español Obligatorio**: Comunicaciones con el usuario, explicaciones, memoria técnica ([Memory.md](file:///c:/Users/david/Documents/ControlFynz/Memory.md)) y tareas redactadas íntegramente en español impecable.

- `[TX-DELETE-001]`: Implementación de la eliminación reactiva de transacciones con confirmación previa:
  - En `src/components/transactions/transaction-item-card.tsx`: soporte para callbacks `onDelete` y `onLongPress`, agregando un botón sutil de papelera (`trash-outline`) con área táctil accesible y sin romper la estética de montos ni el layout visual.
  - En `app/(app)/(tabs)/transactions.tsx`: integración de `deleteTransaction` desde `useTransactionsStore` con diálogo nativo `Alert.alert` destructivo de confirmación previa antes de eliminar cualquier registro.
  - En `src/components/dashboard/recent-transactions-list.tsx`: tarjetas interactivas conectadas con diálogo de confirmación y eliminación directa desde el Dashboard.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[MODAL-DEBTS-001]`: Conexión del modal de nueva transacción (`app/(app)/(modal)/new-transaction.tsx`) con el store de deudas (`src/store/debts-store.ts`). Selectores dinámicos para amortizar deudas personales específicas (`personalDebts`), cobrar préstamos de amigos (`friendLoans`), y liquidación automática de reembolsos de terceros (`thirdPartyCharges`). Doble registro en paralelo contable (flujo en `useTransactionsStore` y reducción de pasivo/activo en `useDebtsStore`).

- **HITO HISTÓRICO - EL ECOSISTEMA DE ESTADO GLOBAL Y PERSISTENCIA ESTÁ 100% OPERATIVO EN LAS 5 PESTAÑAS**:
  - **Ajustes**: `useSettingsStore` (moneda base activa, modo privacidad con persistencia, autenticación biométrica y preferencias del sistema).
  - **Transacciones**: `useTransactionsStore` (Dashboard, Movimientos, Estadísticas y Modal de Nueva Transacción con persistencia local y reactividad en tiempo real).
  - **Deudas y Terceros**: `useDebtsStore` (Deudas personales, préstamos con interés/capital, cargos en tarjetas compartidas por cobrar y amortización reactiva).

- `[DEBTS-STORE-001]`: Implementación de la tienda de Deudas y conexión reactiva de la Pestaña 3 (Deudas y Terceros):
  - Creación de `src/store/debts-store.ts` con persistencia offline-first (`safeStorage`), soporte para deudas personales, préstamos a amigos con cálculo de interés/capital, cargos en tarjetas de terceros por cobrar y acciones de pago/abono (`payPersonalDebt`, `settleThirdPartyCharge`, `collectFriendLoan`).
  - Actualización de `app/(app)/(tabs)/debts.tsx` conectando `DebtsSummaryCard`, `DebtCard` y `ThirdPartyDebtsCard` al store global reactivo con símbolo de divisa dinámico.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[TX-SYNC-001]`: Sincronización reactiva de Movimientos y Estadísticas con los stores globales:
  - Conexión de `app/(app)/(tabs)/transactions.tsx` a `useTransactionsStore` y `useSettingsStore` (eliminación de mocks estáticos, filtros reactivos, búsqueda en tiempo real, conteos dinámicos y resumen de balance con divisa activa).
  - Conexión de `app/(app)/(tabs)/stats.tsx` a `useTransactionsStore`, `useSettingsStore` y `EXPENSE_CATEGORIES` (cálculo dinámico de tasa de ahorro, ratio deuda/ingreso, desglose porcentual de gastos por categoría con colores e iconos reactivos).
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[UI-004]`: Calibración de teclado y elevación ergonómica del botón en modal de nueva transacción:
  - Calibración de `KeyboardAvoidingView` con `keyboardVerticalOffset={Platform.OS === 'ios' ? 48 : 0}` en `app/(app)/(modal)/new-transaction.tsx`.
  - Incremento del margen inferior del botón de guardado (`marginBottom: 32` en iOS y `24` en Android) para que al emerger el teclado, el botón flote visible y holgadamente sin ser recortado.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[TX-STORE-001]`: Implementación del store global de transacciones y conexión reactiva con Dashboard y Modal:
  - Creación de `src/store/transactions-store.ts` con persistencia nativa local y adaptador seguro (`safeStorage`).
  - Conexión de `app/(app)/(modal)/new-transaction.tsx` a la acción `addTransaction` para que el formulario persista movimientos reales en almacenamiento local.
  - Conexión de `app/(app)/(tabs)/index.tsx` (Dashboard) para que los saldos disponibles, ingresos, gastos y la lista de movimientos recientes se calculen dinámicamente y sean reactivos en tiempo real.
  - Sincronización del símbolo de moneda dinámico (`$`, `€`, `R$`) derivado de `useSettingsStore`.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[STORE-002]`: Resolución de compatibilidad de persistencia y blindaje con adaptador seguro (`safeStorage`):
  - Instalación oficial con `npx expo install @react-native-async-storage/async-storage`.
  - Implementación del adaptador seguro `safeStorage` con fallback en memoria en `src/store/settings-store.ts`, previniendo errores de "Native module is null" y excepciones en promesas no controladas.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[STORE-001]`: Implementación de la tienda global de configuración (`settings-store.ts`) con reactividad de privacidad y biometría:
  - Creación de `src/store/settings-store.ts` con persistencia nativa local (Zustand + AsyncStorage).
  - Configuración de `NSFaceIDUsageDescription` en `app.json` para permisos nativos de Face ID en iOS.
  - Conexión de `src/components/settings/settings-section-list.tsx` a `useSettingsStore` (Modo Privacidad, Biometría persistente y selector de Moneda BRL, USD, EUR, etc.).
  - Conexión de `src/components/dashboard/balance-hero-card.tsx` al `privacyMode` global y reactividad en tiempo real sincronizada con el botón de visibilidad (ojito) del Dashboard.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- `[BIOM-001]`: Implementación de autenticación biométrica real y adición de moneda BRL:
  - Instalación e integración del módulo nativo `expo-local-authentication`.
  - Creación de `src/utils/biometrics.ts` (`checkBiometricSupport` para detección de hardware y credenciales enroladas, y `authenticateWithBiometrics` para validación interactiva).
  - Actualización de `src/components/settings/settings-section-list.tsx` integrando la moneda BRL (`R$`) al selector de monedas base y conectando el Switch de Face ID / Huella Dactilar a los sensores nativos del dispositivo para activar y desactivar con confirmación biométrica interactiva.

- **HITO HISTÓRICO - LAS 5 PESTAÑAS PRINCIPALES DEL APP ESTÁN 100% CONSTRUIDAS Y OPERATIVAS**:
  - **Pestaña 1: Resumen (Dashboard)**: Cabecera con perfil, Hero Card de balance con modo privacidad, monitor de deudas próximas, acciones rápidas compactas e historial reciente segmentado.
  - **Pestaña 2: Movimientos (Historial de Flujo)**: Navegación mensual, tarjeta de resumen de ingresos/gastos, buscador instantáneo, selector segmentado y lista agrupada cronológica.
  - **Pestaña 3: Deudas (Gestor de Pasivos y Terceros)**: Tarjeta de balance global con segregación de pasivos propios vs terceros, monitor de tarjetas con cobros a terceros y filtros interactivos.
  - **Pestaña 4: Estadísticas (Inteligencia de Gasto y Salud Financiera)**: Tarjeta de métricas de salud financiera (tasa de ahorro, ratio deuda/ingreso, flujo neto), distribución porcentual por categorías y selector temporal.
  - **Pestaña 5: Ajustes (Configuración del Sistema y Sesión)**: Tarjeta de perfil con estado de sincronización, selector de moneda base, controles de seguridad y privacidad, gestión de copias de seguridad y cierre de sesión.
  - **Flujo Modal Integrado**: Modal nativo multiplataforma (`app/(app)/(modal)/new-transaction.tsx`) con catálogo maestro de categorías (gastos e ingresos segregados) e inteligencia por plataforma.

- `[SETT-001]`: Implementación de la pantalla de Ajustes (Configuración del Sistema y Sesión):
  - Creación de `src/components/settings/user-profile-card.tsx` (avatar cibernético, correo y badge de sincronización Offline-First).
  - Creación de `src/components/settings/settings-section-list.tsx` (selector de moneda, switches de privacidad y biometría, respaldo de datos y botón de cierre de sesión conectado a `useAuthStore`).
  - Actualización de `app/(app)/(tabs)/settings.tsx` con pie de versión y ensamble visual completo en modo oscuro.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- **Hito Culminado - Pantalla de Ajustes**: Finalizada al 100% con arquitectura modular, diseño futurista coherente y validación estricta de TypeScript.

- `[STATS-001]`: Implementación de la pantalla de Estadísticas y Salud Financiera:
  - Creación de `src/components/stats/financial-health-card.tsx` (tasa de ahorro, ratio deuda/ingreso y flujo neto con métricas visuales).
  - Creación de `src/components/stats/category-breakdown-card.tsx` (distribución de gastos con barras de progreso y colores temáticos).
  - Actualización de `app/(app)/(tabs)/stats.tsx` con selector de período interactivo (Mes Actual, Trimestre, Año 2026), comparativa Ingresos vs Gastos y ensamble visual completo en modo oscuro.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- **Hito Culminado - Pantalla de Estadísticas**: Finalizada al 100% con arquitectura modular y validación estricta de TypeScript.

- `[CAT-001]`: Implementación del catálogo maestro de categorías e integración en el modal de transacciones:
  - Creación de `src/constants/categories.ts` con `EXPENSE_CATEGORIES` (14 categorías) e `INCOME_CATEGORIES` (8 categorías aisladas, incluyendo Rendimientos/Intereses y Cobro Préstamo).
  - Actualización de `app/(app)/(modal)/new-transaction.tsx` con sincronización dinámica de píldoras por tipo de operación, iconos y colores temáticos.
  - Verificación limpia de TypeScript (`npx tsc --noEmit` con 0 errores).

- **Hito Culminado - Modales Multiplataforma**: Finalizado y validado al 100% por el usuario en dispositivos físicos tanto en iOS como en Android, confirmando funcionamiento fluido, visualmente impecable y con total paridad multiplataforma.

- `[MODAL-003]`: Calibración de modal en Android (`transparentModal` + `slide_from_bottom` + backdrop oscuro) garantizando paridad fluida total con iOS.

- `[MODAL-002]`: Conexión de acciones rápidas a modal con preselección inteligente de tipo (`params: { type }`).

- `[MODAL-001]`: Flujo modal nativo de nueva transacción con soporte para Ingresos, Gastos y Reembolsos de Terceros (flujo neutro).

- **Hito Culminado - Pantalla de Deudas (Gestor de Pasivos)**: Finalizada al 100% y validada en dispositivo real, integrando la suite completa de módulos:
  - `src/components/debts/debts-summary-card.tsx` (Resumen con desglose de "Mi Deuda Real" vs "A Cargo de Terceros" y balance pendiente)
  - `src/components/debts/debt-card.tsx` (Tarjetas de pasivos con progreso de amortización y semáforo de urgencia)
  - `src/components/debts/third-party-debts-card.tsx` (Control de consumos prestados en tarjeta, cobrables por persona)
  - Selector segmentado de 4 filtros (`Todas`, `Mensuales`, `Personales`, `A Terceros`) y estado vacío interactivo en `app/(app)/(tabs)/debts.tsx`.

- `[DEBT-002]`: Módulo de Deudas en Tarjeta a Cargo de Terceros (`src/components/debts/third-party-debts-card.tsx`), actualización de `src/components/debts/debts-summary-card.tsx` con desglose "Mi Deuda Real" vs "A Cargo de Terceros", y actualización de `app/(app)/(tabs)/debts.tsx` con el filtro de 4 opciones (`Todas`, `Mensuales`, `Personales`, `A Terceros`).

- `[DEBT-001]`: Pantalla base de Deudas (Gestor de Pasivos) en `app/(app)/(tabs)/debts.tsx` con tarjeta de resumen (`src/components/debts/debts-summary-card.tsx`) y tarjetas de pasivos individuales (`src/components/debts/debt-card.tsx`) con soporte para amortización, cuotas mensuales y fechas pactadas.

- **Hito Culminado - Pantalla de Resumen (Dashboard)**: Finalizada al 100% y validada en dispositivo real, compuesta por la suite completa de módulos operativos:
  - `src/components/dashboard/dashboard-header.tsx` (Cabecera, saludo y perfil)
  - `src/components/dashboard/balance-hero-card.tsx` (Balance neto con modo privacidad e indicadores)
  - `src/components/dashboard/upcoming-debts-card.tsx` (Monitor de deudas próximas y semáforo de vencimiento)
  - `src/components/dashboard/quick-actions-grid.tsx` (Acciones rápidas en barra horizontal compacta)
  - `src/components/dashboard/recent-transactions-list.tsx` (Historial reciente con selector segmentado)

- `[DASH-004]`: Lista de Movimientos Recientes (`src/components/dashboard/recent-transactions-list.tsx`) con selector de filtros segmentado interactivo (Todos, Ingresos, Gastos), renderizado dinámico con estado vacío y vinculada en `app/(app)/(tabs)/index.tsx`.

- `[DASH-003]` y `[UI-002]`: Implementada la barra de Acciones Rápidas (`src/components/dashboard/quick-actions-grid.tsx`) con rediseño horizontal compacto en una sola fila (Ingreso, Gasto, Abono, Analítica), optimizando el espacio vertical.

- `[DASH-002]`: Implementado Monitor de Deudas Próximas por Vencer (`src/components/dashboard/upcoming-debts-card.tsx`) con modelo dual (cuotas mensuales vs fecha pactada personal) y semáforo de urgencia dinámico.

- `[ANDROID-001]`: Auditoría y blindaje total de Android en `app.json` (configuración edge-to-edge / traslúcida), `app/_layout.tsx` (`SafeAreaProvider` + `StatusBar` traslúcida con estilo claro) y `app/(app)/(tabs)/_layout.tsx` (insets dinámicos para navegación por gestos y barra tradicional de 3 botones).

- `[DASH-001]`: Implementada Cabecera y Tarjeta de Balance Neto (*Hero Card*) con modo privacidad interactivo (ocultar/mostrar montos) y métricas de ingresos/gastos en `app/(app)/(tabs)/index.tsx`.

- `[UI-001]`: Ajuste ergonómico y estético de la barra de navegación inferior para iPhones modernos (altura 88px, paddingBottom 28px, iconos 26px), verificado y validado por el usuario en su dispositivo físico.

- `[NAV-002]`: Implementación de la arquitectura de 5 Bottom Tabs (`Resumen`, `Movimientos`, `Deudas`, `Estadísticas`, `Ajustes`) en `app/(app)/(tabs)/_layout.tsx`, con `@expo/vector-icons` y `expo-asset` configurados e integrados.

- `[NAV-001]`: Corrección de ruta canónica a `/(app)` en `app/_layout.tsx` y creación de `app/(app)/_layout.tsx`, habilitando la redirección correcta y segura desde Login hacia el grupo protegido.

- `[AUTH-001]`: Pantalla de Login completa (`app/login.tsx`) con diseño en modo oscuro futurista, inputs controlados y botones de acceso social deshabilitados.

### [CARD-PAYMENT-AND-CUSTODY-INTEGRATION-001] - 2026-10-14
- **Archivos Intervenidos**:
  - `src/store/transactions-store.ts`
  - `src/__tests__/accounting-integration.test.ts`
  - `src/components/dashboard/recent-transactions-list.tsx`
  - `src/components/transactions/transaction-item-card.tsx`
  - `src/components/cards/card-payment-modal.tsx`
  - `src/components/transactions/delete-transaction-modal.tsx`
  - `app/(app)/(modal)/cards-overview.tsx`
  - `src/__tests__/billing-cycle.test.ts`
- **Resumen Técnico**:
  1. **Tipo de Transacción Contable**: Creación de `type: 'card_payment'` en `transactions-store.ts`. Deduce fondos de la cuenta bancaria seleccionada pero se excluye de `getCurrentMonthExpense()` y `getTotalExpense()`, blindando el presupuesto personal contra el doble gasto.
  2. **Custodia de Fondos de Terceros**: Selector `getBankCustodyAmount(bankId, unpaidCardIds)` que identifica reembolsos de compras compartidas retenidos en una cuenta para pagar la tarjeta, permitiendo calcular el saldo libre real (`computedBalance - custodyAmount`).
  3. **Componentes UI y Modal Cyberpunk**: Unificación de `TransactionType` en `recent-transactions-list.tsx` y `transaction-item-card.tsx` con badges azul neón `#0A84FF`. Modal `CardPaymentModal` con atajos de pago ("Mes Completo", "50% del Mes", "Deuda Total"), selector de banco pagador con saldo en vivo y validación de fondos.
  4. **Integración en Overview**: Botón `[ 💳 Pagar Tarjeta ]`, badge `AL DÍA` verde neón cuando el ciclo queda saldado, deducción reactiva en tiempo real y chips informativos de custodia en cada entidad bancaria.
  5. **Reversión y Testing**: Modal de eliminación `delete-transaction-modal.tsx` adaptado con aviso de reintegro bancario. 31/31 tests unitarios pasando al 100% en 4 suites y 0 errores en `npx tsc --noEmit`.

### [BANK-DECIMAL-INPUT-SUPPORT-001] - 2026-10-14
- **Archivos Intervenidos**:
  - `app/(app)/(modal)/cards-overview.tsx`
  - `src/__tests__/cards-store.test.ts`
- **Resumen Técnico**:
  1. **Entrada Decimal Móvil**: Sustitución de `keyboardType="numeric"` por `keyboardType="decimal-pad"` en el formulario de alta de banco (`newBankBalanceInput`) y en el editor inline de saldo (`editingBalanceInput`) en `cards-overview.tsx`.
  2. **Normalización en Vivo de Separador Decimal**: Sanitización en `onChangeText` convirtiendo comas (`,`) a puntos (`.`), impidiendo puntos duplicados y preservando centavos ingresados en teclados regionales.
  3. **Parseo Resiliente**: Sanitización con `.trim().replace(',', '.')` antes de `parseFloat` en `handleCreateBank` y `handleSaveBankBalance`, eliminando truncamientos indebidos.
  4. **Testing Unitario**: Añadido Caso 9 en `cards-store.test.ts` validando alta y actualización de saldos bancarios con decimales flotantes. 32/32 tests pasando al 100% (4 suites) y 0 errores en `npx tsc --noEmit`.

### [LEGACY-CARD-INSTALLMENTS-SUPPORT-001] - 2026-10-14
- **Archivos Intervenidos**:
  - `app/(app)/(modal)/new-debt.tsx`
  - `app/(app)/(tabs)/debts.tsx`
  - `src/__tests__/accounting-integration.test.ts`
- **Resumen Técnico**:
  1. **Captura de Compras en Tarjeta Propias**: Selector en Deuda Propia `[ 🏦 Préstamo Bancario | 💳 Compra en Tarjeta ]` en `new-debt.tsx` con selector de tarjeta, concepto, monto original, total de cuotas, valor de cuota mensual y cuotas ya abonadas en el pasado.
  2. **HUD Reactivo en Vivo**: Visualización instantánea de cuotas pendientes (`X de Y`), saldo remanente diferido y cuota exigible del próximo corte.
  3. **Aislamiento Contable Retroactivo**: Guardado en `debts-store` como `PersonalDebt` con `isPreexisting: true`, omitiendo la creación de transacciones en `transactions-store` para mantener intactos los saldos bancarios y el historial de consumo.
  4. **Visualización en Deudas**: Badges cian y azul neón en `debts.tsx` con el nombre de la tarjeta, progreso de cuotas y etiqueta `🕒 Preexistente`.
  5. **Testing Unitario**: Añadido Caso 9 en `accounting-integration.test.ts` validando la no distorsión de caja y el ciclo de amortización de cuotas remanentes. 33/33 tests pasando al 100% y 0 errores TS.

### [ROLLBACK-LEGACY-CARD-INSTALLMENTS-SUPPORT-001] - 2026-10-14
- **Archivos Intervenidos**:
  - `app/(app)/(modal)/new-debt.tsx`
  - `app/(app)/(tabs)/debts.tsx`
  - `src/__tests__/accounting-integration.test.ts`
- **Resumen Técnico**: Reversión completa de la captura de compras en tarjeta en la pestaña de deudas a solicitud del usuario. `new-debt.tsx` vuelve a enfocarse exclusivamente en préstamos bancarios personales y `debts.tsx` retira badges y barras de cuotas de tarjeta. Suite validada al 100% con 32/32 tests en verde y 0 errores en `npx tsc --noEmit`.

### [SETTINGS-LEGACY-CARD-EXPENSE-INTEGRATION-001] - 2026-10-14
- **Archivos Intervenidos**:
  - `src/components/settings/settings-section-list.tsx`
  - `app/(app)/(modal)/legacy-card-expense.tsx`
  - `app/(app)/(tabs)/debts.tsx`
- **Resumen Técnico**:
  1. **Acceso desde Configuración**: Nueva fila interactiva en `settings-section-list.tsx` ("Compras en Tarjeta (Cuotas Históricas)") con badge cibernético azul `#0A84FF` en la sección Datos & Almacenamiento.
  2. **Modal Dedicado de Captura Histórica**: Creación de `legacy-card-expense.tsx` con selector interactivo de tarjetas de crédito (`cards-store`), concepto, monto total original, total de cuotas, cuotas ya abonadas en el pasado y cuota mensual editable con HUD en tiempo real.
  3. **Integración Contable Sin Impacto de Caja**: Guardado en `debts-store` como `PersonalDebt` (`category: 'credit_card'`, `isPreexisting: true`) sin invocar `addTransaction`, alimentando automáticamente la cuota mensual exigible y la deuda diferida de la tarjeta en `cards-overview.tsx`.
  4. **Aislamiento en Pestaña Deudas**: Filtrado en `debts.tsx` (`d.category !== 'credit_card' && !d.cardId`) en listas y totales de deudas personales, preservando la pestaña exclusiva para pasivos bancarios mayores y cuentas entre amigos.
  5. **Verificación de Calidad**: 32/32 tests unitarios pasando al 100% y 0 errores en `npx tsc --noEmit`.

### [DASHBOARD-UPCOMING-CARD-CONSOLIDATION-001] - 2026-10-14
- **Archivos Intervenidos**:
  - `src/components/dashboard/upcoming-debts-card.tsx`
  - `src/__tests__/billing-cycle.test.ts`
- **Resumen Técnico**:
  1. **Exclusión de Ítems Sueltos de Tarjeta**: Filtrado estricto en `upcoming-debts-card.tsx` (`d.category !== 'credit_card' && !d.cardId`) para impedir que compras individuales en cuotas o corrientes aparezcan como deudas personales aisladas.
  2. **Consolidación de Extracto Mensual por Tarjeta**: Si una tarjeta registra `cardCurrentMonthDebt > 0`, se genera un único ítem consolidado que suma compras del ciclo, cuotas propias y cuotas de terceros, menos abonos realizados.
  3. **Semáforo y Vencimiento Bancario**: Se proyecta el vencimiento según el `paymentDay` de la tarjeta con cálculo de urgencia (`getUrgencyStatus`), glifo `card-outline` y badge azul neón `Resumen Tarjeta`.
  4. **Navegación Fluida**: Al tocar la tarjeta en Próximos Vencimientos se abre directamente `cards-overview` con la opción de liquidarla.
  5. **Testing Unitario**: Añadido Caso 9 en `billing-cycle.test.ts` con Fake Timers validando la no fragmentación de compras y el cómputo exacto de la obligación consolidada. 33/33 tests pasando al 100% y 0 errores en `npx tsc --noEmit`.

### [CARD-CANONICAL-DETAIL-AND-EXPENSES-001] - 2026-10-14
- **Archivos Intervenidos**:
  - `app/(app)/cards/[id].tsx`
  - `app/(app)/(modal)/cards-overview.tsx`
- **Resumen Técnico**:
  1. **Pantalla Canónica de Detalle**: Creación de `cards/[id].tsx` bajo el estándar de Expo Router `app/(app)/[modulo]/[id].tsx`.
  2. **Tarjeta Virtual Cyberpunk & Cupo**: Visualización de emisor, últimos 4 dígitos, color temático, barra de progreso de cupo usado vs límite asignado, y fechas de corte/vencimiento con semáforo de urgencia (`getUrgencyStatus`).
  3. **Pestañas y Auditoría de Gastos**: Filtros segmentados por pills (`Todos`, `Compras del Mes`, `Cuotas Propias`, `Terceros`) con listados especializados, barras de avance de cuotas y saldos diferidos.
  4. **Integración en Overview & Acciones**: Botón `[ 🔍 Ver Detalle y Consumos › ]` en `cards-overview.tsx`, y barra fija con acceso directo a `CardPaymentModal` y `legacy-card-expense`.
  5. **Verificación de Calidad**: 33/33 tests pasando al 100% y 0 errores en `npx tsc --noEmit`.

### [CARD-CYCLE-DATES-AND-CURRENT-INSTALLMENT-001] - 2026-10-15
- **Archivos Intervenidos**:
  - `src/utils/date-helpers.ts`
  - `src/__tests__/debt-dates-liquidation.test.ts`
  - `app/(app)/cards/[id].tsx`
  - `app/(app)/(modal)/cards-overview.tsx`
  - `app/(app)/(modal)/legacy-card-expense.tsx`
- **Resumen Técnico**:
  1. **Motor de Fechas Exactas de Ciclo (`getCardBillingCycleDates`)**: Cálculo determinista en `date-helpers.ts` de fechas con día, mes y año real (`21 Oct 2026` y `2 Nov 2026`), discriminación de fases (`accumulating` vs `payment_pending`), clamping de meses de 28/30/31 días y rollover de año (Diciembre -> Enero).
  2. **Lógica de Cuota en Curso (`getInstallmentProgressInfo`)**: Determinación matemática de la cuota en curso `paidInstallments + 1` (si se registraron 3 cuotas pagadas de 5, el sistema factura y muestra la Cuota 4 de 5, con subtexto de 3 pagadas y 2 restantes).
  3. **Integración en Detalle de Tarjeta (`cards/[id].tsx`)**: Exhibición de fechas completas con semáforo de urgencia en tarjeta virtual y HUD, y visualización de cuota en curso con barra de avance neón en cuotas propias y de terceros.
  4. **Integración en Overview y Formulario**: Conexión de fechas reales en `cards-overview.tsx` y HUD reactivo en `legacy-card-expense.tsx` confirmando en vivo la cuota que se cobrará este mes.
  5. **Testing Exhaustivo**: 5 nuevos casos de prueba en `debt-dates-liquidation.test.ts` con Fake Timers, alcanzando 38/38 tests en verde al 100% y 0 errores en `npx tsc --noEmit`.

### [CARD-DETAIL-THIRD-PARTY-UI-UNIFICATION-001] - 2026-10-15
- **Archivos Intervenidos**:
  - `app/(app)/cards/[id].tsx`
- **Resumen Técnico**:
  1. **Estructura Homogénea**: Se adaptó el renderizado de consumos de terceros (`linkedThirdPartyCharges`) en el detalle de tarjeta para utilizar la misma jerarquía de tarjetas que las compras propias: concepto limpio y cuota mensual a la derecha.
  2. **Identificación del Responsable**: Badge dedicado con icono `person-outline` y nombre del tercero (`thirdPartyPersonBadge`) en acento ámbar neón `#FF9F0A`, acompañado del pill de estado de pago del ciclo.
  3. **Bloque de Progreso y Barra Neón**: Incorporación del bloque `installmentProgressBlock` con cuota en curso, saldo remanente y barra de progreso porcentual en color ámbar `#FF9F0A`.
  4. **Calidad**: 38/38 tests pasando al 100% y 0 errores en `npx tsc --noEmit`.
### [LOAN-PROXIMITY-AND-UP-TO-DATE-STATUS-001] - 2026-10-15
- **Archivos Intervenidos**:
  - `src/store/debts-store.ts`
  - `src/utils/date-helpers.ts`
  - `src/components/dashboard/upcoming-debts-card.tsx`
  - `src/__tests__/debt-dates-liquidation.test.ts`
- **Resumen Técnico**:
  1. **Registro de Último Pago (`lastPaymentDate`)**: Extensión de la interfaz `PersonalDebt` en `debts-store.ts` incorporando la propiedad opcional `lastPaymentDate?: string` para registrar la fecha del último abono o cuota amortizada.
  2. **Motor de Estado de Vencimiento y Proximidad (`getDebtDueStatus`)**: Función utilitaria pura en `date-helpers.ts` que determina si el mes en curso ya está cubierto (`isUpToDateThisMonth`), proyecta el próximo vencimiento exigible con rollover mensual/anual y clamping para meses cortos, calcula días restantes y nivel de urgencia, y evalúa la ventana de alerta (`shouldAlertInDashboard`, activándose únicamente si la deuda está vencida, vence hoy o faltan <= 7 días).
  3. **Optimización de Próximos Vencimientos en Dashboard (`upcoming-debts-card.tsx`)**: Si todas las obligaciones o préstamos activos se encuentran al día en el mes y el próximo compromiso dista > 7 días, se sustituye la alarma prematura (de 20+ días de anticipación) por una tarjeta de estado positivo ('Al día este mes') con indicador sutil de la próxima fecha límite.
  4. **Pruebas Unitarias Deterministas**: Incorporación de 4 casos de prueba exhaustivos (Casos 13-16) en `debt-dates-liquidation.test.ts` simulando préstamos al día, transiciones de mes y umbrales de alerta con Fake Timers de Jest, alcanzando 42/42 tests en verde (100% pass) y 0 errores en `npx tsc --noEmit`.

### [CARD-OWN-EXPENSES-DELETION-001] - 2026-10-15
- **Archivos Intervenidos**:
  - `app/(app)/cards/[id].tsx`
- **Resumen Técnico**:
  1. **Botones de Eliminación Directa**: Incorporación de botones de eliminación con ícono `trash-outline` (`#FF453A`) en consumos propios de tarjeta, disponibles tanto en "Compras del ciclo (1 cuota)" como en "Compras en cuotas".
  2. **Conexión Reactiva a Stores**: Integración directa con `deleteTransaction` de `transactions-store` (para compras corrientes de 1 cuota) y `deletePersonalDebt` de `debts-store` (para compras diferidas en cuotas).
  3. **Modal de Confirmación Cyberpunk con Protección Contable**:
     - Modal estilizado (`#121212`, tarjeta `#1E1E1E`, borde `#2C2C2E`) con distinción inteligente de casos:
     - *Compra corriente*: confirmación estándar informando la restitución automática del cupo disponible de la tarjeta.
     - *Compra en cuotas sin amortizaciones previas*: confirmación estándar con eliminación de la deuda diferida vinculada.
     - *Compra en cuotas con pagos previos registrados*: bloqueo informativo de seguridad ("Eliminación protegida" con ícono `#FF9F0A`), impidiendo inconsistencias contables y explicando al usuario que la deuda ya contiene amortizaciones históricas asentadas.
  4. **Verificación de Calidad**: Validación técnica integral con 42/42 tests unitarios aprobados al 100% (`npm test`) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).




### [TASK-ACCOUNT-PERMANENT-DELETION-RPC-FIX] - 2026-11-03
- **Archivos Intervenidos**:
  - `supabase/init.sql`
  - `src/store/auth-store.ts`
  - `src/components/settings/settings-section-list.tsx`
- **Resumen Técnico**:
  1. **Función RPC `delete_user_account` en Supabase**: Definición con `SECURITY DEFINER` y `SET search_path = public` en `supabase/init.sql`. Ejecuta `DELETE FROM auth.users WHERE id = auth.uid()`, aprovechando las restricciones relacionales `ON DELETE CASCADE` para eliminar atómicamente el perfil y todos los datos contables asociados (transacciones, deudas, amigos, tarjetas, bancos). Permisos asignados exclusivamente a `authenticated` y revocados a `public`.
  2. **Blindaje en `auth-store.ts`**: Eliminación de silenciamiento con `console.warn` en `deleteAccount`. Si la llamada RPC a `delete_user_account` falla, el proceso se detiene de inmediato, resetea `isLoading: false` y retorna `{ success: false, error: rpcError.message }`, impidiendo falsos positivos de eliminación ("ghost deletion").
  3. **Corrección de Flujo en `settings-section-list.tsx`**: La purga de estado local (`purgeLocalSyncState()`) ahora se ejecuta únicamente tras confirmar `result.success === true`. Si la eliminación falla, el usuario recibe un `Alert.alert` descriptivo y su sesión local se mantiene intacta.
  4. **Verificación de Calidad**: 121/121 tests unitarios aprobados al 100% (`npm test`) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).


### [TASK-WEB-ALERT-PARITY-SETTINGS-001] - 2026-11-03
- **Archivos Intervenidos**:
  - `src/components/settings/settings-section-list.tsx`
- **Resumen Técnico**:
  1. **Paridad Web en Cierre de Sesión (`handleLogoutConfirmation`)**: Adaptador condicional con `Platform.OS === 'web'` que invoca `window.confirm` para confirmar el cierre de sesión, superando la limitación de `Alert.alert` como stub vacío en `react-native-web`. Mantiene intacto el `Alert.alert` nativo en iOS y Android.
  2. **Paridad Web en Eliminación de Cuenta (`handleDeleteAccount`)**: Implementación de doble confirmación secuencial en Web mediante `window.confirm` (`step1` advertencia general, `step2` confirmación irreversible). Si se aceptan ambos pasos, invoca de forma asíncrona `deleteAccount()`, presenta alertas descriptivas en caso de error y ejecuta `purgeLocalSyncState()` al completar exitosamente.
  3. **Visual Freeze**: Estilos, colores y componentes visuales 100% preservados sin alteración.
  4. **Verificación de Calidad**: 121/121 pruebas unitarias aprobadas al 100% (`npm test`) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).


### [TASK-CYBERPUNK-MODALS-LOGOUT-AND-DELETION-001] - 2026-11-03
- **Archivos Intervenidos**:
  - `src/store/auth-store.ts`
  - `src/components/settings/settings-section-list.tsx`
- **Resumen Técnico**:
  1. **Modales Cyberpunk In-App (`settings-section-list.tsx`)**: Reemplazo total de alertas del navegador (`window.confirm`) y `Alert.alert` por componentes `<Modal transparent animationType="fade">` estilizados al 100% en contexto con el tema oscuro de la aplicación (`#121212`, tarjeta `#1E1E1E`, peligro `#FF453A`, bordes `#2C2C2E`). Paridad visual y funcional absoluta en Web, iOS y Android.
  2. **Feedback y Estados de Carga**: Integración de spinners `ActivityIndicator` reactivos dentro de los botones de acción para `isLoggingOut` e `isDeletingAccount`, más visualización de mensajes de error in-app (`deleteErrorMessage`) sin ventanas emergentes del navegador.
  3. **Robustecimiento Determinista de `logout()` (`auth-store.ts`)**: Eliminación del retardo síncrono ciego de 2 segundos. Ahora cancela suscripciones Realtime primero, purga stores en memoria, ejecuta `Promise.allSettled` con `safeStorage.removeItem` para ambas claves de autenticación y `supabase.auth.signOut({ scope: 'local' })`, y garantiza el reseteo instantáneo de `isAuthenticated: false` y `user: null`.
  4. **Verificación de Calidad**: 121/121 pruebas unitarias aprobadas al 100% (`npm test`) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).


### [TASK-EXPO-SDK-58-UPGRADE] - 2026-11-04
- **Archivos Intervenidos**:
  - `package.json`
  - `package-lock.json`
  - `src/types/react-native-augmentations.d.ts`
  - `app/(app)/(tabs)/_layout.tsx`
  - `src/hooks/use-responsive.ts`
- **Resumen Técnico**:
  1. **Actualización del Ecosistema a Expo SDK 58**: Migración oficial de `expo` a `~58.0.23`, `react-native` a `0.88.1`, `expo-router` a `~58.0.30`, `jest-expo` a `~58.0.14` y dependencias asociadas (`expo-image`, `expo-font`, `react-native-reanimated` 4.7.1, `react-native-worklets` 0.13.0). Compatibilidad total restaurada para Expo Go en dispositivos Apple (iOS).
  2. **Resolución Estricta de Tipado en React Native 0.88**:
     - `src/types/react-native-augmentations.d.ts`: Aumentación de `React.JSX.IntrinsicAttributes` para soportar `backgroundColor?: string` en `<StatusBar>` globalmente sin modificar pantallas individuales.
     - `app/(app)/(tabs)/_layout.tsx`: Evaluación segura `typeof color === 'string' ? color : undefined` en iconos para compatibilidad con `ColorValue`.
     - `src/hooks/use-responsive.ts`: Modernización del hook con `useWindowDimensions()`, eliminando suscripciones imperativas a `Dimensions.addEventListener` y resolviendo `implicit any`.
  3. **Verificación de Calidad**: 121/121 pruebas unitarias aprobadas al 100% (`npm test`) y 0 errores de compilación TypeScript (`npx tsc --noEmit`).


### [TASK-DESKTOP-TAURI-BUILD-001] - 2026-11-04
- **Archivos Intervenidos**:
  - `dist/` (build web estático exportado)
  - `src-tauri/target/release/bundle/nsis/ControlFynz_1.0.0_x64-setup.exe` (instalador generado)
- **Resumen Técnico**:
  1. **Exportación Web de Producción**: Generación de bundles JS minificados y 46 rutas estáticas optimizadas mediante `npm run build:web` en `ControlFynz/dist/`.
  2. **Compilación de Núcleo Nativo con Tauri v2 y Rust**: Compilación en perfil `release` con Cargo/Rust y generación de instalador NSIS de Windows (`tauri build -b nsis`).
  3. **Artefacto Generado**: Instalador `ControlFynz_1.0.0_x64-setup.exe` (~6.62 MB) con asistente de instalación, accesos directos, desinstalador nativo en Panel de Control y ejecución sobre Microsoft Edge WebView2.
  4. **Verificación**: Exit code 0, instalador validado y disponible en el disco local.


### [TASK-DESKTOP-GOOGLE-OAUTH-TAURI-001] - 2026-11-04
- **Archivos Intervenidos**:
  - `src-tauri/Cargo.toml`
  - `src-tauri/src/lib.rs`
  - `src-tauri/capabilities/default.json`
  - `package.json`
  - `package-lock.json`
  - `src/utils/tauri-helpers.ts`
  - `src/store/auth-store.ts`
- **Resumen Técnico**:
  1. **Integración Nativa de Tauri v2 (`src-tauri/`)**: Registro de `tauri-plugin-oauth` v2.1.0 (microservidor HTTP loopback efímero) y `tauri-plugin-opener` v2.7.2 (manejador de apertura de navegadores del sistema). Permisos IPC autorizados en `default.json` (`oauth:default`, `opener:default`).
  2. **Detección de Plataforma Desacoplada (`src/utils/tauri-helpers.ts`)**: Implementación de `isTauri(): boolean` evaluando `window.__TAURI_INTERNALS__` sin dependencias estáticas frágiles.
  3. **Flujo OAuth Seguro de Escritorio (`auth-store.ts`)**:
     - Carga dinámica perezosa de `@fabianlars/tauri-plugin-oauth` y `@tauri-apps/plugin-opener`.
     - Inicio de servidor loopback local dinámico con `start()`.
     - Llamada a `supabase.auth.signInWithOAuth` con `skipBrowserRedirect: true` y redirección a `http://localhost:${port}`.
     - Apertura del navegador del sistema (Chrome/Edge) con `openUrl(data.url)`, evitando el bloqueo `403: disallowed_useragent` de Google.
     - Captura asíncrona de retorno con `onUrl()`, cierre seguro del puerto en bloque `finally` e intercambio de código mediante `supabase.auth.exchangeCodeForSession(code)`.
     - Preservación 100% inalterada de flujos Web y Móvil.
  4. **Verificación de Calidad**: `cargo check` código 0, `tsc --noEmit` 0 errores y 121/121 tests en verde (100% pass en Jest).


### [TASK-DESKTOP-ACL-PERMISSIONS-FIX-001] - 2026-11-04
- **Archivos Intervenidos**:
  - `src-tauri/capabilities/default.json`
  - `src-tauri/tauri.conf.json`
  - `src/store/auth-store.ts`
  - `src-tauri/target/release/bundle/nsis/ControlFynz_1.0.0_x64-setup.exe`
- **Resumen Técnico**:
  1. **Corrección de Permisos IPC de Tauri v2 (`default.json`)**: Sustitución de `"oauth:default"` (inexistente en el plugin) por los permisos atómicos `"oauth:allow-start"` y `"oauth:allow-cancel"`, autorizando la apertura y cierre del microservidor HTTP loopback para Google OAuth.
  2. **Habilitación de DevTools (`tauri.conf.json`)**: Inclusión de `"devtools": true` en la ventana principal de la app para permitir inspección en vivo de la consola WebView2 vía F12.
  3. **Tolerancia y Diagnóstico de Errores (`auth-store.ts`)**: Propagación explícita del mensaje de error real (`err.message`) en el bloque `catch` de `loginWithGoogle`.
  4. **Re-compilación y Generación del Instalador**: Generación exitosa de `ControlFynz_1.0.0_x64-setup.exe` (~6.69 MiB).
  5. **Verificación de Calidad**: `tsc --noEmit` 0 errores y 121/121 tests unitarios aprobados al 100% (`npm test`).


### [TASK-DESKTOP-OAUTH-HTML-TEMPLATE-001] - 2026-11-04
- **Archivos Intervenidos**:
  - `src/utils/tauri-helpers.ts`
  - `src/store/auth-store.ts`
  - `src-tauri/target/release/bundle/nsis/ControlFynz_1.0.0_x64-setup.exe`
- **Resumen Técnico**:
  1. **Plantilla Cyberpunk de Retorno OAuth (`src/utils/tauri-helpers.ts`)**: Implementación de `OAUTH_SUCCESS_HTML` sustituyendo la pantalla plana en blanco por una interfaz inmersiva con fondo `#121212`, tarjeta `#1E1E1E`, resplandor `#00FFA3`, badge `CONTROLFYNZ OS // SESIÓN CONFIRMADA`, icono animado de éxito, temporizador de cierre automático a los 3 segundos y botón manual de cierre de pestaña.
  2. **Integración con Tauri Loopback (`src/store/auth-store.ts`)**: Suministro de `response: OAUTH_SUCCESS_HTML` en `start()` para que el servidor local en Rust sirva la respuesta estilizada preservando la inyección de token en `<head>`.
  3. **Re-compilación y Generación del Instalador**: Generación exitosa de `ControlFynz_1.0.0_x64-setup.exe` (~6.69 MiB).
  4. **Verificación de Calidad**: `tsc --noEmit` 0 errores y 121/121 tests unitarios aprobados al 100% (`npm test`).


### [TASK-DESKTOP-BRANDING-TASKBAR-AND-INSTALLER-001] - 2026-11-04
- **Archivos Intervenidos**:
  - `src-tauri/Cargo.toml`
  - `src-tauri/Cargo.lock`
  - `src-tauri/src/main.rs`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/icons/*`
  - `src-tauri/target/release/bundle/nsis/ControlFynz_1.0.0_x64-setup.exe`
- **Resumen Técnico**:
  1. **Regeneración de Iconos Multi-Resolución**: Sustitución de los iconos genéricos por defecto de Tauri en `src-tauri/icons/` mediante `tauri icon` a partir de `assets/images/icon.png`. Generación de `icon.ico` (multi-capa Windows), `icon.icns` y variantes `Square*.png`.
  2. **Configuración de Instalador NSIS (`tauri.conf.json`)**: Definición explícita de `bundle.windows.nsis.installerIcon: "icons/icon.ico"`, incrustando el logotipo oficial en el archivo `.exe` del instalador y en el desinstalador de Windows.
  3. **Vincular Barra de Tareas con AppUserModelId (`main.rs` & `Cargo.toml`)**: Implementación de `SetCurrentProcessExplicitAppUserModelID("com.controlfynz.app")` con `windows-sys (Win32_UI_Shell)`, garantizando que Windows asigne y fije el icono oficial en la barra de tareas cuando la aplicación está en ejecución.
  4. **Re-compilación de Instalador**: Generación exitosa de `ControlFynz_1.0.0_x64-setup.exe` (~6.88 MiB) con branding oficial completo.
  5. **Verificación de Calidad**: `cargo check` 0 errores, `tsc --noEmit` 0 errores y 121/121 tests unitarios aprobados al 100% (`npm test`).


### [TASK-DESKTOP-TASKBAR-WM-SETICON-001] - 2026-11-04
- **Archivos Intervenidos**:
  - `src-tauri/src/lib.rs`
  - `src-tauri/build.rs`
  - `src-tauri/target/release/bundle/nsis/ControlFynz_1.0.0_x64-setup.exe`
- **Resumen Técnico**:
  1. **Asignación Explícita de Icono en Runtime (`src-tauri/src/lib.rs`)**: Importación de `tauri::Manager` y ejecución condicional para escritorio (`#[cfg(desktop)]`) obteniendo la ventana `"main"` para llamar `window.set_icon(tauri::include_image!("icons/128x128.png"))`. Esto envía el mensaje nativo `WM_SETICON` de Win32 forzando a Windows a asociar la ventana y la barra de tareas con el logotipo 3D oficial de ControlFynz en tiempo de ejecución.
  2. **Directivas de Detección de Cambios (`src-tauri/build.rs`)**: Incorporación de `cargo:rerun-if-changed` para `icons/icon.ico`, `icons/128x128.png` y `icons/32x32.png`, asegurando que `tauri-build` empaquete siempre los recursos gráficos actualizados.
  3. **Re-compilación de Instalador NSIS**: Generación exitosa de `ControlFynz_1.0.0_x64-setup.exe` (~6.91 MiB) con el icono incrustado en recursos PE e inyectado en runtime.
  4. **Verificación de Calidad**: `tsc --noEmit` 0 errores y 121/121 tests unitarios aprobados al 100% (`npm test`).


### [TASK-DESKTOP-DARK-THEME-TAB-TRANSITION-001] - 2026-11-04
- **Archivos Intervenidos**:
  - `app/_layout.tsx`
  - `app/(app)/_layout.tsx`
  - `app/(app)/(tabs)/_layout.tsx`
  - `src-tauri/target/release/bundle/nsis/ControlFynz_1.0.0_x64-setup.exe`
- **Resumen Técnico**:
  1. **Blindaje de Fondo y Tema Oscuro Global (`app/_layout.tsx`)**: Inyección en `<Head>` de regla CSS `html, body, #root { background-color: #121212 !important; margin: 0; padding: 0; }` para neutralizar el canvas blanco por defecto de Chromium/WebView2. Envoltura de la aplicación en `<ThemeProvider value={customDarkTheme}>` adaptado desde `DarkTheme` y contenedor base con `backgroundColor: '#121212'`, erradicando el tema claro `DefaultTheme` (`rgb(242, 242, 242)`) de React Navigation.
  2. **Contenedor Oscuro Continuo en Stack (`app/(app)/_layout.tsx`)**: Configuración de `contentStyle: { backgroundColor: '#121212' }` en `screenOptions` del `<Stack>` principal para prevenir marcos transparentes o blancos durante cambios de ruta.
  3. **Optimización de Pestañas y Transición Fade (`app/(app)/(tabs)/_layout.tsx`)**: Configuración en `screenOptions` de `<Tabs>` con `sceneStyle: { backgroundColor: '#121212' }`, `lazy: false` para precargar las 5 escenas suprimiendo el retardo de montaje en frío (*cold mount*), y `animation: 'fade'` para lograr un fundido suave y continuo.
  4. **Re-compilación de Instalador NSIS**: Generación exitosa de `ControlFynz_1.0.0_x64-setup.exe` (~6.92 MiB).
  5. **Verificación de Calidad**: `tsc --noEmit` 0 errores y 121/121 tests unitarios aprobados al 100% (`npm test`).


### [TASK-DESKTOP-UPDATER-PHASE-1] - 2026-11-04
- **Archivos Intervenidos**:
  - `src-tauri/Cargo.toml`
  - `src-tauri/src/lib.rs`
  - `src-tauri/Cargo.lock`
- **Resumen Técnico**:
  1. **Integración de Dependencia Nativa Rust (`src-tauri/Cargo.toml`)**: Incorporación de la crate oficial `tauri-plugin-updater = "2"` bajo `[dependencies]`.
  2. **Registro de Plugin en Runtime (`src-tauri/src/lib.rs`)**: Registro de `.plugin(tauri_plugin_updater::Builder::new().build())` en la función `run()` dentro de `tauri::Builder::default()`.
  3. **Verificación de Calidad**: `cargo check` 0 errores, `tsc --noEmit` 0 errores y 121/121 tests unitarios aprobados al 100% (`npm test`).


### [TASK-DESKTOP-UPDATER-PHASE-2] - 2026-11-04
- **Archivos Intervenidos**:
  - `src-tauri/capabilities/default.json`
  - `src-tauri/tauri.conf.json`
- **Resumen Técnico**:
  1. **Generación de Claves Criptográficas Minisign**: Creación del par de claves asimétricas en `~/.tauri/` (clave privada `controlfynz.key` resguardada fuera del repositorio; clave pública obtenida para la verificación de firmas).
  2. **Capacidades de Seguridad IPC (`src-tauri/capabilities/default.json`)**: Inclusión del permiso `"updater:default"` autorizando las operaciones de verificación, descarga e instalación en la ventana principal.
  3. **Configuración de Manifiesto (`src-tauri/tauri.conf.json`)**: Configuración de `"plugins.updater"` con la clave pública Minisign, el endpoint oficial de versiones (`https://github.com/DaviDiibo/FynzControl/releases/latest/download/latest.json`) y `windows.installMode: "passive"`.
  4. **Verificación de Calidad**: `cargo check` 0 errores, `tsc --noEmit` 0 errores y 121/121 tests unitarios aprobados al 100% (`npm test`).



### [TASK-DESKTOP-UPDATER-PHASE-3] - 2026-11-04
- **Archivos Intervenidos**:
  - `package.json`
  - `package-lock.json`
  - `src/services/updater-service.ts`
  - `src/__tests__/updater-service.test.ts`
- **Resumen Técnico**:
  1. **Dependencia Cliente Oficial (`package.json`)**: Adición e instalación de `@tauri-apps/plugin-updater: ^2.14.1`, garantizando compatibilidad con el ecosistema `@tauri-apps/api: ^2.12.0`.
  2. **Servicio Tipado de Actualizaciones (`src/services/updater-service.ts`)**: Implementación modular con guarda `isTauri()`, tipos estructurados (`UpdateCheckResult`, `UpdateProgress`), invocación a `check()`, y `downloadAndInstallUpdate()` con cómputo de progreso porcentual y captura segura de errores sin fugas de excepciones.
  3. **Suite Exhaustiva de Pruebas Unitarias (`src/__tests__/updater-service.test.ts`)**: 9 pruebas automatizadas en Jest validando guardas de plataforma (retorno inerte en Web/Móvil), actualización disponible, estado al día, cálculo de progreso en descargas y tolerancia a fallos.
  4. **Verificación de Calidad**: `tsc --noEmit` 0 errores y 130/130 tests unitarios aprobados al 100% (7 suites en verde en `npm test`).


### [TASK-DESKTOP-UPDATER-PHASE-4] - 2026-11-04
- **Archivos Intervenidos**:
  - `src/components/settings/update-checker-card.tsx`
  - `src/components/settings/settings-section-list.tsx`
  - `src-tauri/target/release/bundle/nsis/ControlFynz_1.0.0_x64-setup.exe`
- **Resumen Técnico**:
  1. **Componente Visual y Modal Cyberpunk (`src/components/settings/update-checker-card.tsx`)**: Implementación con tipado inline estricto y guarda `isTauri()`. Interfaz de consulta bajo demanda, indicador de estado ("Al día", "Buscando", "Error") y modal interactivo con badge `CONTROLFYNZ OS // ACTUALIZACIÓN`, visor scrolleable de notas de versión, barra de progreso neón reactiva en tiempo real y botones de acción ("Actualizar ahora" / "Más tarde").
  2. **Integración en Pantalla de Ajustes (`src/components/settings/settings-section-list.tsx`)**: Montaje en el layout responsivo de Ajustes (grilla ancha `isWide` de escritorio y layout vertical estándar), manteniendo inalterada la apariencia en Web y Móvil.
  3. **Re-compilación y Generación del Instalador NSIS**: Exportación web limpia (`dist/`) y compilación release con `npx tauri build -b nsis`, generando `ControlFynz_1.0.0_x64-setup.exe` (~7.96 MiB) con el sistema de auto-actualización plenamente operativo.
  4. **Verificación de Calidad**: `tsc --noEmit` 0 errores y 130/130 tests unitarios aprobados al 100% (7 suites en verde en `npm test`).


### [TASK-AUDIT-PHASE-1-AUTH-SYNC-SHIELD] - 2026-11-05
- **Archivos Intervenidos**:
  - `src/store/auth-store.ts`
  - `src/services/sync-service.ts`
- **Resumen Técnico**:
  1. **Blindaje contra Purga Accidental de Tiendas (`src/store/auth-store.ts`)**: Se corrigió la condición de reseteo en `initializeAuth`, `login`, `loginWithGoogle` y en el listener de `supabase.auth.onAuthStateChange`. Anteriormente se evaluaba `if (!currentUser || currentUser.id !== mappedUser.id)`, lo que provocaba que al arrancar o hidratar la app con `currentUser === null`, se ejecutara `purgeAllDomainStores()` eliminando indebidamente los datos locales de Zustand en caché. Se reemplazó por la guarda estricta `if (currentUser && currentUser.id !== mappedUser.id)`, asegurando que las tiendas solo se purguen si existe un usuario previo y su identificador difiere del nuevo usuario autenticado (cambio de cuenta), o ante un evento explícito de `SIGNED_OUT`.
  2. **Debouncing Cancelable y Cola de Reintento Concurrente en Push (`src/services/sync-service.ts`)**: En `triggerBackgroundPush()`, se implementó debouncing real con cancelación de temporizador (`clearTimeout(pushDebounceTimer)`) para evitar ráfagas descontroladas de peticiones. En `syncPush()`, cuando ya existe un push en ejecución (`isPushInProgress === true`), se activa la bandera `hasPendingPushRequest = true` en lugar de descartar la sincronización. En el bloque `finally`, si `hasPendingPushRequest` está activo, se reprograma automáticamente un nuevo `syncPush` tras 100ms, erradicando la pérdida silenciosa de mutaciones concurrentes. Asimismo, se incorporó la limpieza de temporizadores y banderas en `purgeLocalSyncState()`.
  3. **Decisiones Permanentes**:
     - Las tiendas de dominio offline jamás deben resetearse durante el arranque o login del mismo usuario.
     - Toda mutación local en segundo plano queda garantizada por la cola de reintento concurrente de `syncPush`.
  4. **Verificación de Calidad**: `npx tsc --noEmit` con 0 errores y 130/130 pruebas unitarias aprobadas al 100% en Jest (`npm test`).


### [TASK-AUDIT-PHASE-2-ACCOUNTING-ID-INTEGRITY] - 2026-11-05
- **Archivos Intervenidos**:
  - `src/store/safe-storage.ts`
  - `src/store/transactions-store.ts`
  - `src/store/debts-store.ts`
- **Resumen Técnico**:
  1. **Centralización y Robustez de Almacenamiento Seguro (`src/store/safe-storage.ts`)**:
     - Se eliminaron las implementaciones duplicadas locales de `safeStorage` y los mapas aislados `memoryStorage` en `transactions-store.ts` y `debts-store.ts`.
     - Ambas tiendas ahora consumen la instancia centralizada exportada desde `src/store/safe-storage.ts`.
     - Se reforzó `safeStorage` para que, al obtener un valor exitosamente de `AsyncStorage`, actualice automáticamente la copia en `memoryStorage.set(name, value)`. Esto asegura consistencia inmediata en memoria y elimina discrepancias de hidratación o lecturas obsoletas.
  2. **Paridad de Identidad Bancaria y Prevención de Desajustes de Saldo (`src/store/transactions-store.ts`)**:
     - Implementación de la función pura `isSameBankId(a, b)` con normalización determinista mediante `toDeterministicUuid`.
     - Aplicación de `isSameBankId` en los selectores contables fundamentales `getBankComputedBalance` y `getBankCustodyAmount`.
     - Se erradicaron desajustes de saldo bancario y cálculo de fondos en custodia causados por transacciones locales que poseían identificadores temporales/locales frente a bancos sincronizados con UUIDs de Supabase (o viceversa).
  3. **Clamping Defensivo de Fin de Mes en Ciclos de Tarjetas (`src/store/transactions-store.ts`)**:
     - En el cálculo de flujo de caja mensual `computeMonthlyCashFlowBreakdown`, se incorporó tolerancia a `cutOffDay` y clamping estricto del día de corte: `Math.min(Math.max(1, closingDay), maxDaysInMonth)`.
     - Previene distorsiones y desfasajes en la asignación de consumos al extracto mensual para tarjetas configuradas con día de corte 31 durante meses cortos de 28, 29 o 30 días.
  4. **Preservación Condicional de `lastPaymentDate` en Reversión de Deudas (`src/store/debts-store.ts`)**:
     - En `revertDebtPayment`, se corrigió la anulación incondicional de la fecha de último abono (`lastPaymentDate = undefined`).
     - Se introdujo el cálculo reactivo `hasRemainingPayments` que verifica si el préstamo aún conserva cuotas pagadas (`newPaid > 0` o `initialPaidInstallments > 0`), abonos acumulados (`newTotalActualPaid > 0`) o saldo amortizado (`newRemaining < totalAmount`).
     - Si `hasRemainingPayments` es verdadero y no se proveyó un `previousPaymentDate`, se preserva intacto `debt.lastPaymentDate`. Solo se asigna `undefined` cuando la deuda queda sin ningún abono histórico.
  5. **Decisiones Permanentes**:
     - Prohibición estricta de duplicar adaptadores de persistencia en stores individuales; todo Zustand persistente debe importar `safeStorage` desde `src/store/safe-storage.ts`.
     - Toda comparación de claves foráneas bancarias o entidades sincronizables debe usar `isSameBankId` para admitir paridad UUID/local.
     - Cualquier cómputo temporal atado a días específicos del mes debe aplicar clamping contra el último día del mes en curso (`new Date(y, m + 1, 0).getDate()`).
     - La reversión de transacciones vinculadas a deudas debe validar el estado residual de la deuda antes de resetear fechas históricas.
  6. **Verificación de Calidad**: `npx tsc --noEmit` con 0 errores y 130/130 tests unitarios aprobados al 100% en Jest (`npm test`).


### [TASK-AUDIT-PHASE-3-ZERO-DEAD-CODE] - 2026-11-05
- **Archivos Intervenidos**:
  - `package.json`
  - `src/lib/sync-adapters.ts`
  - `src/utils/session.ts`
- **Resumen Técnico**:
  1. **Higiene de Dependencias y Poda de Paquetes Huérfanos (`package.json`)**:
     - Se realizó una auditoría minuciosa de todas las dependencias declaradas en `package.json`, contrastándolas contra la totalidad del código fuente de la aplicación.
     - Se eliminaron 5 paquetes huérfanos sin importación alguna:
       * `@tauri-apps/api` (la funcionalidad de escritorio y actualización se canaliza a través de los plugins especializados `@tauri-apps/plugin-updater` y `@tauri-apps/plugin-opener`).
       * `expo-constants` (residuo de plantilla de Expo sin llamadas en la app).
       * `expo-device` (sin uso activo en la lógica de plataforma).
       * `expo-font` (la tipografía se maneja mediante fuentes del sistema y temas nativos).
       * `expo-linking` (la navegación y rutas se gestionan íntegramente con `expo-router`).
     - Se redujo el footprint del bundle y se previenen incompatibilidades o advertencias de dependencias transitivas durante futuras actualizaciones de SDK.
  2. **Zero Dead Code y Privacidad en Adaptadores de Sincronización (`src/lib/sync-adapters.ts`)**:
     - Se eliminaron exports innecesarios y helpers no consumidos fuera del archivo (`isValidUuid` y `formatIsoToSpanishDate`).
     - En `toDeterministicUuid`, se sustituyó la llamada indirecta por la validación directa mediante `UUID_REGEX.test(input)`.
     - En `rowToTransaction`, se internalizó la lógica de formateo y agrupamiento de fechas en español (`dateFormatted` y `dateGroup`), garantizando que la transformación de registros de transacciones permanezca autónoma y sin acoplamiento a funciones globales inertes.
  3. **Saneamiento de Sesión y Ciclo de Vida de AppState (`src/utils/session.ts`)**:
     - Se eliminó la constante inactiva `INACTIVITY_LOCK_MS = 15 * 60 * 1000` y la condición de bloqueo zombi (`currentTime - lastActiveTimestamp > INACTIVITY_LOCK_MS`), la cual invocaba `lockApp()` sin contar con un flujo de interfaz de usuario de desbloqueo orquestado.
     - Se simplificó `handleAppStateChange` para enfocarlo puramente en su objetivo operacional: notificar a `useAuthStore.getState().updateActivity()` cuando el estado de la aplicación cambia a `'active'`.
  4. **Decisiones Permanentes**:
     - Mantener el proyecto bajo la política estricta de Zero Dead Code: ninguna dependencia en `package.json` sin uso real en el código ni utilidades auxiliares exportadas sin consumidores externos.
     - Los adaptadores de persistencia y sincronización deben encapsular internamente su lógica de formateo específico a menos que exista un caso de uso multi-módulo justificado.
     - Los gestores de ciclo de vida (`AppState`) no deben alojar temporizadores o candados de seguridad que no estén plenamente coordinados con la UI y los stores correspondientes.
  5. **Verificación de Calidad**:
     - Compilación TypeScript limpia (`npx tsc --noEmit` / `node ./node_modules/typescript/bin/tsc --noEmit` con 0 errores).
     - Verificación completa de pruebas unitarias (`node ./node_modules/jest/bin/jest.js` con 130/130 pruebas aprobadas, 7/7 suites en verde, 100% pass).


### [TASK-AUDIT-PHASE-4-TRANSACTIONS-PERFORMANCE] - 2026-11-05
- **Archivos Intervenidos**:
  - `src/components/transactions/transaction-item-card.tsx`
  - `app/(app)/(tabs)/transactions.tsx`
- **Resumen Técnico**:
  1. **Virtualización de Listado en Móvil con FlatList (`app/(app)/(tabs)/transactions.tsx`)**:
     - Se reemplazó el `ScrollView` con mapeo lineal monolítico por un `FlatList` optimizado para dispositivos móviles (preservando el `ScrollView` de dos columnas exclusivamente para pantallas anchas `isWide`).
     - Se diseñó un modelo de datos aplanado heterogéneo (`TransactionListItem`) que alterna dinámicamente elementos de tipo `header` (agrupadores por fecha) y de tipo `item` (tarjetas de movimiento), eliminando anidamientos profundos de vistas.
     - Se implementó un `keyExtractor` determinista (`header_${dateGroup}` para cabeceras y `item.id` para transacciones).
     - Se configuraron parámetros de rendimiento óptimos: `initialNumToRender={15}`, `maxToRenderPerBatch={10}`, `windowSize={5}`, `removeClippedSubviews={Platform.OS === 'android'}` y `keyboardDismissMode="on-drag"`.
  2. **Preservación de Foco en Búsqueda y Memoización de Controles (`app/(app)/(tabs)/transactions.tsx`)**:
     - Se memoizó el `ListHeaderComponent` mediante `useMemo` (`listHeaderElement`), consolidando el resumen financiero (`TransactionsSummaryHeader`), la barra de búsqueda y los filtros de tipo de movimiento.
     - Esta estructura previene que `FlatList` desmonte o recree el `<TextInput>` de búsqueda mientras el usuario escribe, erradicando por completo el bug de pérdida de foco y cierre recurrente del teclado virtual.
     - Se envolvieron los callbacks de interacción (`handlePressTransaction`, `handleLongPressTransaction`, `handlePromptDelete`, `renderListItem`) con `useCallback` para garantizar referencias estables.
  3. **Blindaje de Re-renderizados en Items (`src/components/transactions/transaction-item-card.tsx`)**:
     - Se estabilizó `TransactionItemCardBase` envolviendo sus manejadores de pulsación (`handlePress`, `handleLongPress`, `handleDelete`) en `useCallback`.
     - Se reforzó la exportación mediante `React.memo` con el comparador personalizado `arePropsEqual`, validando individualmente propiedades críticas (`item.id`, `item.amount`, `item.description`, `item.date`, `item.category`, `item.type`, `item.paymentMethod`, `currencySymbol`).
     - Previene que las tarjetas de transacción no afectadas se re-rendericen masivamente ante mutaciones del texto de búsqueda o conmutación de filtros de período.
  4. **Decisiones Permanentes**:
     - Todo listado potencialmente extenso en vistas móviles debe implementarse mediante `FlatList` virtualizado con modelo aplanado.
     - Los campos de entrada de texto (`TextInput`) que coexistan con listas virtualizadas deben montarse en un `ListHeaderComponent` debidamente memoizado para salvaguardar el foco del teclado.
     - Las tarjetas de elementos repetitivos deben protegerse siempre con `React.memo` y comparadores de propiedades para aislar el re-renderizado.
  5. **Verificación de Calidad**:
     - Compilación TypeScript limpia (`node ./node_modules/typescript/bin/tsc --noEmit` con 0 errores).
     - Suite completa de pruebas unitarias en verde (`node ./node_modules/jest/bin/jest.js` con 130/130 tests aprobados, 7/7 suites en verde, 100% pass).


### [TASK-DESKTOP-UPDATER-ERROR-LOCALIZATION] - 2026-11-05
- **Archivos Intervenidos**:
  - `src/services/updater-service.ts`
  - `src/components/settings/update-checker-card.tsx`
  - `src/__tests__/updater-service.test.ts`
- **Resumen Técnico**:
  1. **Sanitización y Localización de Errores en Updater Desktop (`src/services/updater-service.ts`)**:
     - Se implementó y exportó la función pura `formatUpdaterErrorMessage(error: unknown): string`.
     - Mapeo defensivo de errores crudos devueltos por Tauri Updater / Rust / HTTP a mensajes en español concisos y amigables:
       * Fallos 404 / ausencia de releases (`release JSON`, `404`, `not found`) -> "No hay versiones publicadas en el servidor de actualizaciones."
       * Errores de red / conexión / DNS / timeout (`network`, `dns`, `connection`, `timeout`, `offline`) -> "No se pudo conectar con el servidor de actualizaciones. Revisa tu conexión a internet."
       * Fallos de validación de firma Minisign (`signature`, `minisign`, `verify`) -> "Error de validación de firma en la actualización descargada."
       * Fallback general amigable para excepciones imprevistas -> "No fue posible verificar actualizaciones en este momento."
  2. **Integración en Componente de Ajustes (`src/components/settings/update-checker-card.tsx`)**:
     - Se conectó `formatUpdaterErrorMessage` en el bloque `catch` de `handleCheckUpdates`.
     - Se garantiza que el usuario reciba retroalimentación inteligible en español sin alterar estilos ni layout (`Visual Freeze`).
  3. **Pruebas Unitarias Integrales (`src/__tests__/updater-service.test.ts`)**:
     - Se añadieron 6 casos de prueba unitaria cubriendo exhaustivamente todos los tipos de errores (404, red, firma Minisign, errores como string, instancias de `Error` y fallos desconocidos).
     - Suite global de pruebas unitarias elevada a 136/136 tests aprobados al 100% (8/8 suites en verde).
- **Decisiones Permanentes**:
  - Toda interacción con APIs o plugins nativos de Tauri debe filtrar y traducir mensajes de error crudos de Rust/C antes de exponerlos al usuario.
  - La lógica de normalización de errores debe aislarse en funciones puras en `src/services/` para garantizar verificabilidad unitaria determinista.
- **Verificación de Calidad**:
  - Compilación TypeScript limpia (`npx tsc --noEmit` con 0 errores).
  - Suite completa de pruebas unitarias en verde (`npm test` con 136/136 tests aprobados, 8/8 suites en verde, 100% pass).


### [TASK-CARD-INSTALLMENTS-ACCOUNTING-CORE] - 2026-11-05
- **Archivos Intervenidos**:
  - `src/utils/card-accounting.ts`
  - `src/store/transactions-store.ts`
  - `src/__tests__/billing-cycle.test.ts`
- **Resumen Técnico**:
  1. **Núcleo Contable de Compras Directas en Cuotas (`src/utils/card-accounting.ts`)**:
     - Se corrigió y completó la liquidación de compras directas a cuotas con tarjeta de crédito (`paymentMethod: 'credit_card'`, `installmentsCount > 1`).
     - Se implementó el cálculo determinista del primer mes y año de liquidación (`firstBillMonth`, `firstBillYear`) aplicando clamping en el día de corte efectivo del mes de compra (`Math.min(Math.max(1, closingDay), maxDaysInPurchaseMonth)`).
     - Si la compra se efectúa en o antes del día de corte, el primer ciclo de liquidación es el mes de la compra; si se efectúa después del corte, el primer ciclo pasa al mes subsiguiente (gestionando saltos de año de forma determinista).
     - Cálculo de `monthsDiff`: se computa la diferencia exacta de períodos mensuales entre el ciclo consultado (`statementMonth`, `statementYear`) y el ciclo inicial (`firstBillMonth`, `firstBillYear`).
     - Cómputo de cuota mensual exigible en el extracto (`Math.round((amount / installmentsCount) * 100) / 100`): se suma únicamente si el ciclo consultado cae dentro del rango activo de la compra (`0 <= monthsDiff < installmentsCount`).
     - Consolidación del remanente diferido total (`directInstallmentsRemainingTotal`): para cada compra activa o futura, se suma la deuda no vencida (`amount - (monthsDiff * monthlyQuota)` si `monthsDiff >= 0`, o el monto total si `monthsDiff < 0`) acumulándola en `rawTotalDebt`.
  2. **Imputación de Gastos Mensuales por Cuota en Store (`src/store/transactions-store.ts`)**:
     - Se adaptó `getCurrentMonthExpense()` para que las compras directas en cuotas con tarjeta de crédito (`paymentMethod: 'credit_card'` y `installmentsCount > 1`) no imputen el monto total en el mes de la compra.
     - Se calcula `monthsDiff` contra el ciclo consultado y se suma exclusivamente la cuota mensual calculada (`amount / installmentsCount`) si `0 <= monthsDiff < installmentsCount`.
  3. **Pruebas Unitarias Integrales con Fake Timers (`src/__tests__/billing-cycle.test.ts`)**:
     - Se desarrollaron casos de prueba unitaria exhaustivos utilizando simulación temporal mandatoria (`jest.useFakeTimers()` y `jest.setSystemTime()`).
     - Se validaron compras pre-corte (ej. día 5 con corte 20), compras post-corte con salto de año (ej. 25 de diciembre con corte 20 que liquida en enero), evolución y extinción de cuotas en ciclos sucesivos, y el remanente diferido en `computeCardBillingStatement`.
     - Suite global de pruebas unitarias elevada a 139/139 tests aprobados al 100% (7/7 suites en verde).
- **Decisiones Permanentes**:
  - Las compras en cuotas con tarjeta de crédito deben imputarse en el extracto mensual y en el gasto corriente mes a mes según `monthsDiff` y no de forma monolítica al momento de la compra.
  - El día de corte de tarjeta debe siempre calibrarse con clamping contra la cantidad de días del mes de compra para determinar con exactitud si la cuota inicial entra en el ciclo corriente o en el subsiguiente.
  - Toda prueba de ciclos contables, extractos y fechas límite debe fijar deterministamente el reloj con `jest.useFakeTimers()` y `jest.setSystemTime()`.
- **Verificación de Calidad**:
  - Compilación TypeScript limpia (`node ./node_modules/typescript/bin/tsc --noEmit` con 0 errores).
  - Suite completa de pruebas unitarias en verde (`node ./node_modules/jest/bin/jest.js` con 139/139 tests aprobados, 7/7 suites en verde, 100% pass).


### [TASK-CARD-INSTALLMENTS-UI-AND-PROJECTION] - 2026-11-05
- **Archivos Intervenidos**:
  - `app/(app)/cards/[id].tsx`
- **Resumen Técnico**:
  1. **Centralización con Single Source of Truth (`computeCardBillingStatement`)**:
     - Se eliminaron más de 120 líneas de cálculos manuales inline duplicados de extractos y cuotas en `app/(app)/cards/[id].tsx`, centralizando la lógica contable con `computeCardBillingStatement`.
  2. **Visualización Dinámica de Cuotas Directas en Consumos del Ciclo**:
     - En las pestañas "Consumos del Ciclo" (`cycle` y `all`), se incorporó la detección de consumos directos a cuotas (`installmentsCount > 1`).
     - Renderizado de badge dinámico `"Cuota X de Y"` (donde `X = monthsDiff + 1` e `Y = installmentsCount`).
     - Monto del ítem formateado con la cuota mensual prorrateada del período activo, y subtítulo descriptivo con la fecha de compra y el monto total original financiado.
  3. **Proyección Multi-período (+1 y +2 Meses)**:
     - Incorporación automática y transparente de cuotas directas vigentes en la proyección de los siguientes 2 ciclos llamando a `computeCardBillingStatement` para los períodos futuros objetivo.
  4. **Higiene de Código (Zero Dead Code) y Congelamiento Visual (Visual Freeze)**:
     - Purga de import en desuso `isOneTimeExpenseInPeriod`.
     - Preservación íntegra de la estética, layout, paleta de colores y componentes visuales preexistentes (`Visual Freeze` 100% respetado).
- **Decisiones Permanentes**:
  - Toda pantalla o componente que requiera calcular liquidaciones, extractos o cuotas de tarjetas de crédito debe consumir `computeCardBillingStatement` como única fuente de verdad contable.
  - La visualización de compras en cuotas debe explicitar tanto el avance de la cuota (`Cuota X de Y`) como el compromiso mensual real del ciclo, manteniendo trazabilidad del total financiado.
- **Verificación de Calidad**:
  - Compilación TypeScript limpia (`node ./node_modules/typescript/bin/tsc --noEmit` con 0 errores).
  - Suite completa de pruebas unitarias en verde (`node ./node_modules/jest/bin/jest.js` con 139/139 tests aprobados, 7/7 suites en verde, 100% pass).



### [TASK-FIX-EXIGIBLE-DROP-AND-REALTIME-DELETION] - 2026-11-06
- **Archivos Intervenidos**:
  - `src/store/debts-store.ts`
  - `src/services/sync-service.ts`
  - `app/(app)/(tabs)/debts.tsx`
- **Resumen Técnico**:
  1. **Invarianza de Cuotas y Eliminación de Redondeo Prematuro (`src/store/debts-store.ts`)**:
     - Se erradicó el bug de caída anómala del valor "EXIGIBLE ESTE MES" ante abonos parciales (causado previamente por redondeos al alza con `Math.round` y reseteo apresurado de `remainingAmount` a 0).
     - Se sustituyó `Math.round` por `Math.floor` estricto en el cómputo de `newPaidInstallments` tanto en `recordMonthlyPersonAbono` como en `recordThirdPartyInstallmentAbono`.
     - La condición de liquidación/saldado definitivo se supeditó exclusivamente a `newRemaining <= 0.05`, preservando saldos y cuotas pendientes cuando el cargo no ha sido saldado en su totalidad.
  2. **Preservación del Compromiso del Extracto Mensual (`app/(app)/(tabs)/debts.tsx`)**:
     - En el cálculo de `chargeMonthlyDue` para consumos de terceros en el ciclo activo, se aseguró que el compromiso del extracto mensual compute `remainingAmount + currentPeriodPaidAmount`, impidiendo que los abonos parciales decrementen el monto exigible original pactado del ciclo.
  3. **Sincronización Inmediata de Bajas y Escudo Anti-Resurrección (`src/services/sync-service.ts`)**:
     - En `deleteRemoteRecord`: Se dispara de forma inmediata la baja remota a Supabase con `deleted_at: NOW()` vía soft-delete / tombstone.
     - En `syncPush`: Se filtran y descartan proactivamente los registros presentes en la cola de bajas pendientes para impedir que se re-suban entidades eliminadas.
     - En `syncPull`: Detección de registros remotos con `deleted_at IS NOT NULL` y purga atómica de las tiendas locales de Zustand.
  4. **Higiene de Código y Congelamiento Visual (Visual Freeze)**:
     - Cero alteraciones en estilos, componentes visuales, colores o estructura visual (`Visual Freeze` 100% respetado).
- **Decisiones Permanentes**:
  - El cómputo de cuotas amortizadas en abonos debe usar siempre `Math.floor` estricto y la marca de saldado debe depender únicamente de `newRemaining <= 0.05`.
  - El monto mensual exigible de un extracto de tarjeta o tercero debe mantenerse invariante ante abonos parciales sumando el remanente con el abono del período en curso.
  - Las operaciones de eliminación local deben notificar de inmediato a la base de datos remota con timestamp de baja y estar protegidas con filtros anti-resurrección tanto en push como en pull.
- **Verificación de Calidad**:
  - Compilación TypeScript limpia (`node ./node_modules/typescript/bin/tsc --noEmit` con 0 errores).
  - Suite completa de pruebas unitarias en verde (`node ./node_modules/jest/bin/jest.js` con 139/139 tests aprobados, 7/7 suites en verde, 100% pass).



### [TASK-DEFENSIVE-NULL-SAFETY-STRINGS] - 2026-11-06
- **Archivos Intervenidos**:
  - `src/store/transactions-store.ts`
  - `src/utils/card-accounting.ts`
- **Resumen Técnico**:
  1. **Blindaje Defensivo en `src/store/transactions-store.ts`**:
     - En `getBankCustodyAmount` / `resolveKey` (línea 521): sustitución de `c.name.toLowerCase().trim()` por `(c.name ?? '').toLowerCase().trim()` previniendo `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` cuando existen tarjetas en caché con atributos incompletos.
     - En `getCurrentMonthExpense` (línea 411): corrección de encadenamiento opcional incompleto `c.name?.toLowerCase().trim()` mediante `Boolean(t.cardName) && (c.name ?? '').toLowerCase().trim() === (t.cardName ?? '').toLowerCase().trim()`.
     - En `deleteTransaction`: protección de todas las comparaciones de `p.name`, `c.personName`, `l.friendName`, `tx.title` y `d.title` con fallback seguro a cadena vacía y comprobaciones booleanas de existencia.
  2. **Blindaje Defensivo en `src/utils/card-accounting.ts`**:
     - En `computeCardBillingStatement` (línea 43): cambio a `(card.name ?? '').toLowerCase().trim()` asegurando tolerancia ante tarjetas sin `name`.
  3. **Congelamiento Visual y Calidad**:
     - Cero alteraciones en estilos ni layouts (`Visual Freeze`).
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas en verde (100% pass).
- **Decisiones Permanentes**:
  - Toda normalización de cadenas con `.toLowerCase()` y `.trim()` sobre entidades que provengan de `safeStorage` o red debe envolverse obligatoriamente con `(valor ?? '').toLowerCase().trim()`.



### [RELEASE-V1.0.1-DESKTOP-AND-WEB] - 2026-11-06
- **Archivos Intervenidos**:
  - `package.json`
  - `app.json`
  - `src-tauri/tauri.conf.json`
- **Resumen Técnico**:
  1. **Bump de Versión Oficial a 1.0.1**:
     - Sincronización de versión a `"1.0.1"` en los manifiestos de Node/Web (`package.json`), Expo Móvil (`app.json`) y Tauri Desktop (`src-tauri/tauri.conf.json`).
     - Configuración de compatibilidad de empaquetado para auto-actualizaciones con `createUpdaterArtifacts: "v1Compatible"`.
  2. **Compilación Criptográfica de Tauri para Windows (x64)**:
     - Firma digital con Minisign utilizando la clave privada `controlfynz.key`.
     - Generación del instalador completo `ControlFynz_1.0.1_x64-setup.exe` (~7.96 MiB) y del paquete comprimido de actualización del updater `ControlFynz_1.0.1_x64-setup.nsis.zip` con su firma asimétrica `.nsis.zip.sig`.
  3. **Calidad y Verificación**:
     - Compilación limpia con 0 errores TypeScript (`npx tsc --noEmit`).
     - 139/139 pruebas unitarias aprobadas al 100% en `npm test` (7 suites en verde).
- **Decisiones Permanentes**:
  - Toda versión de escritorio para el canal de actualización debe generarse firmada con la clave Minisign de producción para ser aceptada por `@tauri-apps/plugin-updater`.



### [TASK-WEB-VISIBILITY-REALTIME-RECONNECT] - 2026-11-06
- **Archivos Intervenidos**:
  - `src/hooks/use-app-hydration.ts`
  - `src/lib/sync-adapters.ts`
  - `src/services/sync-service.ts`
- **Resumen Técnico**:
  1. **Sincronización Web por `visibilitychange` (`src/hooks/use-app-hydration.ts`)**:
     - Adición de listener para el evento web estándar `visibilitychange` al reactivarse la pestaña (`document.visibilityState === 'visible'`). Dispara `triggerFocusSync()` y re-suscribe el canal Realtime si el usuario está autenticado, resolviendo el problema de suspensión de sockets en segundo plano de navegadores web.
     - Limpieza segura de listeners en el retorno del efecto.
  2. **Robustez y Resiliencia en Adaptador Contable (`src/lib/sync-adapters.ts`)**:
     - En `rowToCharge`: blindaje de `remainingAmount` con fallback múltiple `Number(row.remaining_amount ?? row.total_amount ?? row.amount ?? 0)` impidiendo generación de `NaN` en cálculos de deudas.
     - Fallbacks seguros para `cardName` (`row.card_name ?? ''`) y `createdAt` (`row.created_at || row.date || new Date().toISOString()`).
  3. **Tolerancia a Fallos y Reconexión en Realtime (`src/services/sync-service.ts`)**:
     - Envoltura defensiva con `try/catch` en todos los callbacks de eventos de PostgreSQL (`transactions`, `personal_debts`, `friend_loans`, `third_party_card_charges`, etc.).
     - Detección y manejo explícito de errores de canal (`CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) reseteando `activeRealtimeChannel = null` para permitir reconexión automática sin estados fantasma.
  4. **Calidad**:
     - TypeScript: 0 errores (`npx tsc --noEmit`).
     - Jest: 139/139 pruebas en verde (100% pass).
- **Decisiones Permanentes**:
  - En entornos web, la detección de actividad debe contemplar siempre `visibilitychange` además de `focus`.
  - Todo callback de suscripción a sockets debe estar protegido por `try/catch` para evitar caídas silenciosas del canal.


### [RELEASE-V1.0.2-DESKTOP-AND-WEB] - 2026-11-06
- **Archivos Intervenidos**:
  - `package.json`
  - `app.json`
  - `src-tauri/tauri.conf.json`
- **Resumen Técnico**:
  1. **Bump Oficial de Versión a 1.0.2**:
     - Sincronización coordinada en manifiestos web (`package.json`), Expo (`app.json`) y Tauri (`src-tauri/tauri.conf.json`).
  2. **Compilación Criptográfica de Tauri para Windows (x64)**:
     - Firma digital con Minisign (`controlfynz.key`) generando el instalador `ControlFynz_1.0.2_x64-setup.exe` (~7.97 MiB) y el bundle para updater `ControlFynz_1.0.2_x64-setup.nsis.zip` con su firma asimétrica `.nsis.zip.sig`.
  3. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas en verde (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Todo artefacto de release de escritorio debe estar firmado con `controlfynz.key` y acompañado de su manifiesto `latest.json` en UTF-8 puro sin BOM.


### [TASK-AUTH-TOKEN-AWAIT-SYNC-PULL] - 2026-11-07
- **Archivos Intervenidos**:
  - `src/hooks/use-app-hydration.ts`
  - `src/services/sync-service.ts`
- **Resumen Técnico**:
  1. **Eliminación de Carrera en Hidratación (`src/hooks/use-app-hydration.ts`)**:
     - En el `useEffect` post-hidratación, se espera asíncronamente a `supabase.auth.getSession()` antes de invocar `flushPendingDeletions`, `syncPull` y `startRealtimeSubscription`, garantizando que PostgREST reciba el Bearer token JWT y no viaje anónimo.
     - En `triggerFocusSync`: se valida la existencia de sesión activa de Supabase antes de disparar el pull.
  2. **Guarda de Autenticación RLS en `syncPull` (`src/services/sync-service.ts`)**:
     - Al inicio de `syncPull`: verificación obligatoria de sesión activa con reintento tras 300ms para dar tiempo a la restauración de tokens en navegadores.
     - Rechazo temprano si no hay sesión autenticada o si el `userId` no coincide con `session.user.id`, previniendo que RLS retorne conjuntos vacíos que dejen datos locales obsoletos.
  3. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas en verde (100% pass).
- **Decisiones Permanentes**:
  - Ninguna consulta a tablas de Supabase protegidas por RLS debe emitirse antes de validar la existencia de `session.access_token` en `supabase.auth.getSession()`.


### [CONFIG-EAS-ANDROID-PLAY-STORE] - 2026-11-07
- **Archivos Intervenidos**:
  - `app.json`
  - `eas.json`
- **Resumen Técnico**:
  1. **Identificador de Versión Android (`app.json`)**:
     - Adición de `"versionCode": 1` bajo la sección `"android"` garantizando el identificador entero estricto requerido por Google Play Console para paquetes de producción.
  2. **Configuración de Expo Application Services (`eas.json`)**:
     - Creación de `eas.json` con perfiles `development`, `preview` y `production`.
     - Perfil de producción configurado con `"buildType": "app-bundle"` para la generación de binarios `.aab` optimizados y firmados en la nube de EAS.
  3. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas en verde (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Las compilaciones de Android destinadas a la tienda Google Play deben generarse invariablemente como AAB (`buildType: "app-bundle"`) incrementando secuencialmente el `versionCode`.


### [CONFIG-EASIGNORE-OPTIMIZATION] - 2026-11-07
- **Archivos Intervenidos**:
  - `.easignore`
- **Resumen Técnico**:
  1. **Optimización de Empaquetado para EAS Build (`.easignore`)**:
     - Creación de `.easignore` excluyendo los artefactos nativos de escritorio Rust/Tauri (`src-tauri/`, 10.5 GB), builds web (`dist/`), `node_modules/`, repositorios y dotfiles.
     - Reducción del paquete de compilación móvil de 2.5 GB a menos de 15 MB, respetando el límite estricto de 2.0 GB de EAS Build.
  2. **Calidad y Verificación**:
     - TypeScript: 0 errores (`tsc --noEmit`).
     - Jest: 139/139 pruebas en verde (100% pass).
- **Decisiones Permanentes**:
  - Todo proyecto híbrido (Expo + Tauri) debe contar con un `.easignore` para impedir que los binarios nativos de escritorio se incluyan en los archivos de subida móvil.


### [BUILD-EAS-ANDROID-PRODUCTION-QUEUED] - 2026-11-07
- **Archivos Intervenidos**:
  - `.easignore`
  - `eas.json`
  - `app.json`
- **Resumen Técnico**:
  1. **Subida y Encolamiento en la Nube de Expo (EAS Build)**:
     - Con la exclusión de `.easignore`, el paquete de proyecto se comprimió y subió a EAS en 2 segundos (11.0 MB frente a los 2.5 GB iniciales que excedían el límite de 2.0 GB).
     - La nube de EAS reconoció las credenciales remotas y el Keystore de producción generado (`Build Credentials -0ejqE-WFx`).
     - Se inició el trabajo de compilación en los servidores de Expo para generar el Android App Bundle (`.aab`) de producción.
  2. **Enlace de Seguimiento en Vivo**:
     - `https://expo.dev/accounts/david.iibop/projects/controlfynz/builds/cf458d3e-86f5-4623-b240-2aa08dc7389d`
  3. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas aprobadas (100% pass).
- **Decisiones Permanentes**:
  - El monitoreo de compilaciones EAS en terminales con límites de espera debe ejecutarse con `--no-wait`, entregando al usuario el enlace oficial del dashboard para seguimiento y descarga directa del archivo `.aab`.

### [BUILD-EAS-ANDROID-IN-PROGRESS] - 2026-11-07
- **Archivos Intervenidos**:
  - `package-lock.json`
- **Resumen Técnico**:
  1. **Sincronización Determinista de Dependencias**:
     - Ejecución de `npm install --package-lock-only` para incorporar 10 paquetes transitivos faltantes (`@react-native/metro-config@0.88.1`, `flow-estree@0.327.0`, `flow-parser@0.327.0`, etc.) sin mutar dependencias primarias.
     - Verificación determinista con `npm ci --dry-run` (código de salida 0).
  2. **Relanzamiento de Compilación en EAS Cloud**:
     - Superadas con éxito las fases de `INSTALL_DEPENDENCIES`, `PREBUILD`, `RESTORE_CACHE`, `PREPARE_CREDENTIALS` y `CONFIGURE_EXPO_UPDATES`.
     - Compilación activa en la nube generando el bundle de producción (`.aab`): `https://expo.dev/accounts/david.iibop/projects/controlfynz/builds/9550a871-ae9e-425d-833c-c5792f289fc1`.
  3. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas aprobadas (100% pass).
- **Decisiones Permanentes**:
  - Todo build en EAS Build depende de que `package-lock.json` esté en sincronía perfecta con `package.json` para soportar `npm ci`. Ante discrepancias, usar siempre `npm install --package-lock-only`.

### [BUILD-EAS-ANDROID-AAB-SUCCESS] - 2026-11-07
- **Archivos Intervenidos**:
  - `package-lock.json`
  - `eas.json`
  - `app.json`
- **Resumen Técnico**:
  1. **Compilación de Producción Completada con Éxito (`FINISHED`)**:
     - Generación del paquete nativo Android App Bundle (`.aab`) firmado con Keystore de producción en EAS Build.
     - Build ID: `9550a871-ae9e-425d-833c-c5792f289fc1` (SDK 58.0.0, Version 1.0.2, VersionCode 1).
     - Artefacto descargado listo para su despliegue en Google Play Console.
  2. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas aprobadas (100% pass).
- **Decisiones Permanentes**:
  - El artefacto `.aab` generado por EAS Build con `buildType: "app-bundle"` es el único estándar aceptado por Google Play para distribución en tienda.


### [TASK-SETTINGS-DOWNLOADS] - 2026-11-08
- **Archivos Intervenidos**:
  - `src/constants/links.ts`
  - `src/components/settings/app-downloads-card.tsx`
  - `src/components/settings/settings-section-list.tsx`
- **Resumen Técnico**:
  1. **Centralización de URLs y Helper Mailto (`src/constants/links.ts`)**:
     - Creación de constantes de URLs oficiales (`GOOGLE_PLAY_STORE_URL`, `WINDOWS_EXE_DOWNLOAD_URL`, `BETA_TESTER_EMAIL`, `EMAIL_BETA_TESTER_MAILTO`) y función de apertura segura `openExternalUrl(url)` con captura defensiva de errores.
     - Helper mailto formateado hacia `fynzcontrol0627@gmail.com` con asunto `Solicitud de Acceso Beta Tester - ControlFynz` y plantilla de cuerpo descriptiva para invitar al usuario a indicar su correo de Google Play.
  2. **Componente Exclusivo para Web y Tauri (`src/components/settings/app-downloads-card.tsx`)**:
     - Implementación de `AppDownloadsCard` con estética cyberpunk (`#121212`, tarjeta `#1E1E1E`, neón `#00FFA3`), badges de plataforma para Windows (.EXE directo desde GitHub Releases) y Google Play Store.
     - Aviso contextual de fase de testeo cerrado en Google Play Console con botón interactivo de postulación inmediata vía correo electrónico (`mailto:`).
     - Cláusula de exclusión de plataforma estricta: `if (Platform.OS !== 'web' && !isTauri()) return null;`, asegurando el cumplimiento absoluto de la regla de Visual Freeze en dispositivos móviles nativos (Android e iOS).
  3. **Integración en la Vista de Ajustes (`src/components/settings/settings-section-list.tsx`)**:
     - Montaje de `<AppDownloadsCard />` en el encabezado de las opciones de configuración, visible exclusivamente en clientes de escritorio y navegadores.
  4. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 139/139 pruebas en verde (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Toda sección orientada a descargas o instaladores multiplataforma dentro de Ajustes debe estar estrictamente condicionada a Web y Tauri (`Platform.OS === 'web' || isTauri()`), previniendo cualquier alteración visual innecesaria en aplicaciones móviles ya instaladas.


### [TASK-DASHBOARD-BETA-BANNER] - 2026-11-08
- **Archivos Intervenidos**:
  - `src/constants/links.ts`
  - `src/components/dashboard/beta-banner.tsx`
  - `app/(app)/(tabs)/index.tsx`
- **Resumen Técnico**:
  1. **Helper de Feedback y Enlace Mailto (`src/constants/links.ts`)**:
     - Implementación de `getFeedbackMailtoUrl` con destino oficial `fynzcontrol0627@gmail.com` y plantilla preconfigurada para reporte de fallos, sugerencias o mejoras.
  2. **Componente Descartable y Persistente (`src/components/dashboard/beta-banner.tsx`)**:
     - Implementación de `BetaBanner` con estética Cyberpunk (`#121212`, tarjeta `#1E1E1E`, neón `#00FFA3`), badge indicador "VERSIÓN BETA", botón de acción para envío de comentarios/errores vía correo electrónico y botón de descarte (`✕`).
     - Persistencia de descarte gestionada mediante `safeStorage` con la clave `'controlfynz_beta_banner_dismissed_v1'`, asegurando que una vez cerrado no vuelva a mostrarse en futuros inicios.
  3. **Integración en Pantalla de Dashboard (`app/(app)/(tabs)/index.tsx`)**:
     - Inserción limpia de `<BetaBanner />` entre el bloque de bienvenida y el carrusel de liquidez / Micro-Hero, respetando el espaciado y gap nativo sin alterar layouts preexistentes.
  4. **Calidad y Verificación**:
     - TypeScript: 0 errores (`npx tsc --noEmit`).
     - Jest: 139/139 pruebas aprobadas (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Los banners informativos descartables de versión o fase de pruebas deben persistir su estado de descarte de manera desacoplada en `safeStorage` bajo una clave versionada (`_v1`), garantizando que no se reabran en montajes posteriores y respetando la experiencia de usuario.


### [RELEASE-V1.0.3-DESKTOP-AND-WEB] - 2026-11-08
- **Archivos Intervenidos**:
  - `package.json`
  - `app.json`
  - `src-tauri/tauri.conf.json`
- **Resumen Técnico**:
  1. **Bump Oficial de Versión a 1.0.3 Sincronizado**:
     - Incremento coordinado de versión semver a 1.0.3 en `package.json`, `app.json` y `src-tauri/tauri.conf.json`.
  2. **Compilación y Firma Digital Asimétrica (Minisign)**:
     - Compilación de escritorio nativo con Tauri (`npm run desktop:build`) y firma asimétrica de producción con `controlfynz.key`.
     - Generación de artefactos distribuidos: instalador ejecutable `ControlFynz_1.0.3_x64-setup.exe` (~12.22 MiB), paquete comprimido `ControlFynz_1.0.3_x64-setup.nsis.zip` y su respectiva firma digital `ControlFynz_1.0.3_x64-setup.nsis.zip.sig`.
  3. **Calidad y Verificación**:
     - TypeScript: 0 errores (`npx tsc --noEmit`).
     - Jest: 139/139 pruebas unitarias aprobadas (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Todo artefacto de release de escritorio debe estar firmado con `controlfynz.key` y acompañado de su manifiesto `latest.json` en UTF-8 puro sin BOM.


### [TASK-CURRENCY-PHASE1-SUBTASK1] - 2026-11-08
- **Archivos Intervenidos**:
  - `src/utils/currency.ts`
  - `app/(app)/(modal)/new-transaction.tsx`
  - `src/components/dashboard/balance-hero-card.tsx`
  - `src/__tests__/currency.test.ts`
- **Resumen Técnico**:
  1. **Helper `getCurrencyBadgeLabel` y Estandarización (`src/utils/currency.ts`)**:
     - Creación de la función `getCurrencyBadgeLabel(currency)` para devolver la etiqueta limpia del código de divisa (`'COP'`, `'USD'`, etc.) o fallback seguro a `'COP'`.
     - Exportación de la lista canónica de símbolos y divisas soportadas para evitar mapas inline duplicados en componentes de interfaz.
  2. **Eliminación de Símbolos Hardcodeados en Formulario de Transacción (`app/(app)/(modal)/new-transaction.tsx`)**:
     - Sustitución de `$` hardcodeado en el prefijo del input de monto por el símbolo dinámico canónico `getCurrencySymbol(currency)`.
     - Corrección en la selección y renderizado de deudas vinculadas, resolviendo el símbolo según la divisa configurada en el perfil/cuenta.
  3. **Micro-badge Cyberpunk en Balance General (`src/components/dashboard/balance-hero-card.tsx`)**:
     - Incorporación de un micro-badge no intrusivo (`[ COP ]` / `[ USD ]`) junto al título "Patrimonio Neto", disipando ambigüedades visuales cuando el símbolo común `$` se utiliza en diferentes monedas.
     - Eliminación del mapa estático local `CURRENCY_SYMBOLS`, reemplazándolo por el helper centralizado `getCurrencySymbol(currency)`.
  4. **Pruebas Unitarias Exhaustivas (`src/__tests__/currency.test.ts`)**:
     - Cobertura completa para `getCurrencyBadgeLabel`, `getCurrencySymbol`, `formatCurrency` y formateo con valores límite, nulos o no reconocidos.
  5. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 142/142 pruebas aprobadas (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Toda representación de moneda en la interfaz debe resolver su símbolo exclusivamente mediante `getCurrencySymbol(currency)` de `src/utils/currency.ts`. Queda prohibido hardcodear `$` o definir mapas de divisas locales.
  - Para disipar ambigüedades entre monedas que comparten el símbolo `$`, las tarjetas principales de balance deben mostrar el micro-badge `[ <CODIGO> ]` obtenido con `getCurrencyBadgeLabel`.


### [TASK-CURRENCY-PHASE1-SUBTASK2] - 2026-11-08
- **Archivos Intervenidos**:
  - `src/components/dashboard/recent-transactions-list.tsx`
  - `src/components/transactions/transaction-item-card.tsx`
  - `src/components/cards/card-payment-modal.tsx`
- **Resumen Técnico**:
  1. **Conexión de `useSettingsStore` en Lista de Transacciones Recientes (`recent-transactions-list.tsx`)**:
     - Conexión con `useSettingsStore((s) => s.currency)` y propagación reactiva de `currencySymbol={getCurrencySymbol(currency)}` hacia cada elemento `TransactionItemCard`.
  2. **Soporte Dinámico y Memoización Fina en Tarjeta de Transacción (`transaction-item-card.tsx`)**:
     - Inclusión de la prop opcional `currencySymbol?: string` en la interfaz `TransactionItemCardProps`.
     - Reemplazo del prefijo fijo `$` por `currencySymbol || '$'` en el renderizado de montos de transacciones.
     - Calibración de la función comparadora `arePropsEqual` en `React.memo` evaluando `prevProps.currencySymbol === nextProps.currencySymbol`, garantizando re-renderizado instantáneo ante cambios de configuración de divisa y evitando ciclos innecesarios.
  3. **Erradicación de Fallbacks Huérfanos a `$` en Modal de Pago de Tarjeta (`card-payment-modal.tsx`)**:
     - Lectura centralizada de `currency` vía `useSettingsStore` y resolución canónica del símbolo mediante `getCurrencySymbol(currency)`.
     - Eliminación de fallbacks hardcodeados a `$` tanto en los inputs de pago como en el desglose de deuda actual y cuota mínima a liquidar.
  4. **Calidad y Verificación**:
     - TypeScript: 0 errores (`npx tsc --noEmit`).
     - Jest: 142/142 pruebas unitarias aprobadas (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Todos los componentes de listado transaccional y modales de pago deben consumir la divisa del usuario a través de `useSettingsStore` y resolver su símbolo con `getCurrencySymbol(currency)`.
  - Queda prohibido hardcodear fallbacks estáticos a `$` en inputs o cards.
  - Toda optimización con `React.memo` en componentes que muestren montos debe incluir explícitamente `currencySymbol` en su función `arePropsEqual`.


### [TASK-CURRENCY-PHASE2-CLOUD-SYNC] - 2026-11-08
- **Archivos Intervenidos**:
  - `src/lib/sync-adapters.ts`
  - `src/services/sync-service.ts`
  - `src/components/settings/settings-section-list.tsx`
- **Resumen Técnico**:
  1. **Adaptadores Bidireccionales para Ajustes (`src/lib/sync-adapters.ts`)**:
     - Definición de la interfaz `UserSettingsRow` y funciones de conversión `settingsToRow` y `rowToSettings`.
     - Mapeo estricto y seguro de la divisa (`currency`) de `useSettingsStore` hacia las columnas de Supabase `user_settings`.
  2. **Integración en Servicio de Sincronización (`src/services/sync-service.ts`)**:
     - Descarga resiliente de `user_settings` durante `syncPull`, actualizando reactivamente el store local con `useSettingsStore.getState().setCurrency(remoteSettings.currency)` si existe registro remoto.
     - Implementación del método público `syncPushUserSettings(userId?: string)`, ejecutando un `upsert` seguro en la tabla `user_settings` con `onConflict: 'user_id'`.
  3. **Persistencia Remota Asíncrona en Ajustes (`src/components/settings/settings-section-list.tsx`)**:
     - Guardado asíncrono en segundo plano mediante `syncPushUserSettings()` al pulsar cualquier chip de divisa en `SettingsSectionList`, asegurando retroalimentación táctil inmediata (0ms) en la interfaz mientras se sincroniza en Supabase.
  4. **Calidad y Verificación**:
     - `npx tsc --noEmit`: 0 errores.
     - `npm test`: 142/142 pruebas aprobadas (100% pass, 7 suites).
- **Decisiones Permanentes**:
  - Toda preferencia o configuración de usuario que deba persistir entre dispositivos debe mapearse en `src/lib/sync-adapters.ts` e integrarse en `syncPull` y `syncPushUserSettings` de `sync-service.ts`.
  - Los cambios en la configuración deben reflejarse de inmediato en el store local y despachar su sincronización en segundo plano sin bloquear la experiencia de usuario.

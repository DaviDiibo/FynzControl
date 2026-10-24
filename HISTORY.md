# Historial de Tareas y Procesos Concluidos (ControlFynz)

Este archivo almacena la memoria episódica y la bitácora técnica de tareas e hitos concluidos.
**Regla para agentes de IA**: Este archivo es de consulta histórica exclusivamente bajo demanda (*on-demand*). No debe inyectarse en el contexto de trabajo continuo salvo cuando se requiera investigar precedentes técnicos, decisiones pasadas o trazabilidad de un cambio específico.

---

## Bitácora de Tareas Concluidas

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



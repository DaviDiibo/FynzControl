This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Protocolo Estricto de Desarrollo y Reglas de Calidad (Zero Exceptions)

### 0. Inmutabilidad de Reglas y Bloqueo de AGENTS.md (Regla Suprema)
- **PROHIBICIÓN TOTAL DE AUTO-MODIFICACIÓN**: Ningún agente ni subagente tiene autorización para modificar, agregar, eliminar o editar líneas en `AGENTS.md` a menos que el usuario lo solicite de manera explícita y directa en su mensaje.
- Cualquier intento de relajar, suprimir o alterar estas directrices de forma autónoma constituye una violación crítica de protocolo.

### 1. Protocolo Obligatorio de Planeación y Aprobación Previa (Antes de Tocar Código)
- **STOP OBLIGATORIO Y ESPERA DE APROBACIÓN**: Está terminantemente prohibido crear, modificar o eliminar archivos en disco sin cumplir estos dos pasos consecutivos:
  1. **Presentar el Resumen Previo**:
     - **Archivos a Intervenir**: Lista explícita (máximo estricto de 1 a 3 archivos por tarea).
     - **Acciones Exactas**: Qué se va a programar o cambiar en cada archivo.
     - **POR QUÉ Técnico**: Justificación técnica de la decisión, arquitectura elegida e impacto en el sistema.
  2. **ESPERAR APROBACIÓN EXPLÍCITA DEL USUARIO**: El agente NO PUEDE actuar, tocar código ni lanzar subagentes de modificación hasta que el usuario responda aceptando la propuesta (ej. "ok", "procede", "adelante").
- Si una tarea requiere más de 3 archivos, DEBE dividirse en sub-tareas atómicas secuenciales, cada una con su propia planeación y aprobación previa.

### 2. Estándares Estrictos de Código y TypeScript
- **Tipado Inline Obligatorio**: Todo componente React debe declararse como arrow function con tipado explícito de retorno:
  `const MiComponente = (props: MiProps): JSX.Element => { ... };`
- **Prohibición de `function` declarations** para componentes.
- **Tolerancia Cero a `any` o `unknown`**: Tipos estrictos y primitivos claros.
- **Compilación Limpia Obligatoria**: Antes de declarar CUALQUIER tarea como terminada, se DEBE ejecutar `npx tsc --noEmit` y confirmar 0 errores.

### 3. Paridad Multiplataforma (iOS & Android)
- Todo flujo o pantalla debe diseñarse y probarse considerando las diferencias entre iOS y Android:
  - Teclados: Calibración de `KeyboardAvoidingView` (offsets específicos: ej. 48dp en iOS, 0 en Android).
  - Modales: `modal` nativo en iOS y `transparentModal` con backdrop táctil oscuro en Android.
  - Insets y SafeArea: Respeto absoluto a la barra de estado y al indicador gestual inferior en ambos sistemas.
  - Tema: Prioridad absoluta al modo oscuro futurista (fondo `#121212`, superficies `#1E1E1E`, neón `#00FFA3`).

### 4. Integridad Contable y Modelo Offline-First
- **Persistencia Resiliente**: Todo store Zustand persistente debe usar el patrón `safeStorage` (con respaldo en memoria) para garantizar compatibilidad nativa sin excepciones no controladas.
- **Doble Impacto Contable**: Las transacciones que representen amortizaciones de deudas, cobros de préstamos o reembolsos de terceros deben reflejarse simultáneamente en `transactions-store` y en `debts-store`.

### 5. Idioma y Gestión Dual de Memoria (Activa vs Histórica)
- **Español Obligatorio**: Todas las comunicaciones, explicaciones, resúmenes, archivos de memoria (`Memory.md`, `HISTORY.md`) y tareas deben estar redactados en español impecable. El código, nombres de variables y commits se mantienen en inglés técnico estándar.
- **Memoria Activa de Trabajo (`Memory.md` <= 100 líneas)**:
  - `Memory.md` es el buffer de contexto activo y de trabajo inmediato del proyecto.
  - **Presupuesto Estricto**: No debe exceder las 100 líneas bajo ninguna circunstancia.
  - **Contenido Permitido**: Arquitectura esencial, estado activo del sprint/foco inmediato, lecciones aprendidas / reglas de oro ("qué NO hacer"), y advertencias de bugs críticos resueltos para prevenir regresiones.
  - **Prohibición de Inflado**: Queda terminantemente prohibido acumular listados detallados de tareas concluidas en `Memory.md`.
- **Bitácora Histórica Concluida (`HISTORY.md`)**:
  - Al culminar cada tarea, el agente debe registrar la entrada correspondiente en `HISTORY.md` con: `[TASK-ID]`, fecha, archivos intervenidos, resumen técnico de la solución y decisiones permanentes.
  - **Consulta Bajo Demanda (On-Demand)**: `HISTORY.md` NO se lee de forma automática al inicio de cada interacción ni se inyecta en el contexto de trabajo continuo; se consulta exclusivamente mediante `view_file` cuando se requiera investigar precedentes o trazabilidad histórica de un módulo específico.

### 6. Especialización y Ciclo de Vida Limpio de Subagentes
- **Principio de Responsabilidad Única (No Sobrecarga)**:
  - Calidad ante todo: Prohibido saturar a un subagente de código con redacción documental extensa de bitácoras en el mismo ciclo.
  - El subagente implementador (`builder`) se enfoca al 100% en la arquitectura, TypeScript estricto, paridad móvil y validación limpia de `npx tsc --noEmit`.
  - La memoria y bitácora (`Memory.md` / `HISTORY.md`) se actualizan en una fase documental separada una vez confirmada la compilación limpia y la solución técnica.
- **Investigación Holística en una Sola Pasada**:
  - Queda prohibido encadenar micro-subagentes de investigación redundantes para un mismo módulo. Las tareas de investigación (`research`) deben formularse con un alcance integral que cubra tienda, UI, y flujo en un único análisis profundo.
- **Higiene de Ciclo de Vida (Zero Idle Accumulation & No Premature Kill)**:
  - Todo subagente que concluya su misión debe ser cerrado/purgado formalmente del entorno activo. No se deben acumular procesos ociosos en memoria (`state: idle`).
  - **Prohibición de Cierre Prematuro (`No Premature Kill`)**: Jamás invocar `manage_subagents(kill / kill_all)` en el mismo turno en que se lanza un subagente ni mientras se encuentre ejecutando su tarea. El cierre/purga se ejecuta **única y exclusivamente después** de haber recibido el `<SYSTEM_MESSAGE>` con el reporte final del subagente confirmando que guardó los cambios en disco y validó la compilación.

### 7. Protocolo y Criterios de Pruebas Unitarias (Jest)
- **Obligatoriedad de Verificación Doble**: Antes de declarar CUALQUIER tarea como terminada, se DEBE ejecutar `npm test` junto con `npx tsc --noEmit`. La suite completa debe finalizar con **100% de tests en verde (0 fallos)**.
- **Núcleo de Cobertura Obligatoria**:
  - **Mutaciones Contables y Stores**: Probar rigurosamente las acciones de Zustand en `transactions-store`, `debts-store` y `cards-store` (altas, amortizaciones, cobros, reversión contable integral y persistencia `safeStorage`).
  - **Ciclos de Facturación y Liquidación**: Validar compras pre/post día de corte (`closingDay`), diferimiento a meses subsiguientes, saltos de año y algoritmos de abono en dos fases para terceros.
  - **Helpers Puros y Lógica Temporal**: Probar exhaustivamente utilidades en `date-helpers.ts` (semáforos de urgencia, cálculo de vencimientos recurrentes, meses de 28/30/31 días).
- **Prohibición de Tests Frágiles de UI**: Queda prohibido crear tests unitarios pesados o snapshots para validar renderizado visual trivial, estilos, animaciones o capas cosméticas. El esfuerzo de testing se concentra estrictamente en la integridad matemática, lógica de estado y reglas de negocio.
- **Simulación Temporal Mandatoria (Fake Timers)**:
  - Todo test que dependa de fechas, vencimientos o ciclos mensuales DEBE utilizar obligatoriamente `jest.useFakeTimers()` en `beforeEach` y `jest.useRealTimers()` en `afterEach`.
  - El tiempo debe fijarse explícitamente mediante `jest.setSystemTime(new Date('YYYY-MM-DDTHH:mm:ssZ'))` para garantizar determinismo absoluto e inmunidad ante la fecha u hora en que se ejecute la suite.
- **Criterio de Creación de Nuevas Pruebas**:
  - Es obligatorio añadir o extender casos en `src/__tests__/` ante:
    1. Introducción o cambio de una regla de cálculo contable o amortización.
    2. Modificación de selectores financieros mensuales o de flujo de caja.
    3. Resolución de bugs contables (test de regresión obligatorio que impida que el bug resurja).

### 8. Prohibición Estricta de Alteraciones Visuales No Solicitadas (Visual Freeze)
- Queda terminantemente prohibido modificar estilos, layouts, colores, tipografías, espaciados o estética visual de cualquier componente o pantalla del sistema a menos que el usuario lo solicite de manera explícita y directa en su mensaje.
- Si una tarea trata sobre lógica contable, corrección de bugs, modelos de datos o persistencia, la apariencia visual preexistente DEBE mantenerse 100% inalterada.
- Todo agente y subagente debe acotar cualquier cambio estrictamente a lo que fue pedido, sin iniciativas estéticas unilaterales.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npm test                    # unit tests (Jest) — 100% pass obligatorio
npx tsc --noEmit            # typecheck — 0 errores
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint, typecheck and unit tests (npm test && npx tsc --noEmit) before declaring any task done.

## Navigation & Routing

- Usar **Expo Router** para toda la navegación. Las rutas viven estrictamente en `app/` en la raíz (NUNCA en `src/app/`). Cada archivo allí es una pantalla y los archivos `_layout.tsx` definen navegadores.
- `src/` está reservado exclusivamente para lógica de negocio (`components/`, `hooks/`, `store/`, `theme/`, `utils/`, `types/`).
- Importar `Link`, `router` y `useLocalSearchParams` desde `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Reglas Estrictas de Enrutamiento y Nomenclatura (Expo Router - SDK 57)

- **Jerarquía Arquitectónica Escalable**:
  - `app/(auth)/`: Flujos de autenticación e inducción con su propio `_layout.tsx`.
  - `app/(app)/(tabs)/`: Exclusivamente las 5 pestañas principales persistentes (`index.tsx` para Dashboard, `transactions.tsx`, `debts.tsx`, `stats.tsx`, `settings.tsx`).
  - `app/(app)/[modulo]/`: Pantallas de detalle en pantalla completa (ej. `debts/[id].tsx`, `transactions/[id].tsx`). NUNCA colocar pantallas de detalle dentro de `(tabs)/`.
  - `app/(app)/(modal)/`: Flujos de acción rápida configurados como modales nativos (`presentation: 'modal'`).
- **Reglas de Navegación Canónica y Rutas Tipadas (Typed Routes)**:
  - Prohibición estricta de sufijo `/index` en `router.push()` y `router.replace()` (usar `/(app)` o `/`, NUNCA `/(app)/index`).
  - Navegación a rutas dinámicas siempre con objeto tipado: `router.push({ pathname: '/debts/[id]', params: { id } })`.
  - Extracción de parámetros con tipado explícito: `const { id } = useLocalSearchParams<{ id: string }>()`.
  - Obligatoriedad de ejecutar `npx tsc --noEmit` para verificar rutas tipadas antes de declarar cualquier tarea concluida.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Reglas Adicionales de Entorno y Framework

- Seguir estrictamente las directrices de `GUIA_TAREAS.md` y la habilidad `feature-prompt-generator` (`.agents/skills/feature-prompt-generator/SKILL.md`).
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

# Memoria Activa del Proyecto ControlFynz

> **Límite Estricto**: Este archivo mantiene el contexto de trabajo activo y NO debe superar las 100 líneas. Para la bitácora de tareas concluidas, consultar `HISTORY.md` bajo demanda.

## 1. Arquitectura y Stack Base
- **Framework**: Expo SDK 57 (React Native) + Expo Router (`app/` en la raíz).
- **Lenguaje & Tipado**: TypeScript estricto, arrow functions con tipado inline obligatorio (`const Comp = (props: Props): JSX.Element => ...`), cero `any` o `unknown`.
- **Estado y Persistencia**: Zustand con adaptador `safeStorage` (con respaldo resiliente en memoria). Claves activas: `*-storage-v2`.
- **UI & Tema**: Modo oscuro cyberpunk/neón (`#121212`, tarjetas `#1E1E1E`, acento `#00FFA3`, peligro `#FF453A`). Modales interactivos transparentes, nunca diálogos toscos nativos.
- **Multiplataforma**: Paridad iOS (KeyboardOffset 48dp, Safe Area), Android (KeyboardOffset 0dp, Edge-to-edge) y Web/Tauri Desktop (`useIsWide(768)`).
- **Backend / Infra**: Arquitectura Offline-First con proyección a Supabase (Auth, RLS, PostgreSQL).
- **Testing & QA**: Jest 29 + `jest-expo` (~57.0.6). Verificación doble obligatoria (`npm test` 100% pass [100/100] + `npx tsc --noEmit` 0 errores) previo a cerrar cualquier tarea.

## 2. Estado Activo del Sprint y Foco Inmediato
- **Módulos Principales Culminados**:
  - 5 Tabs operativas con paridad móvil y escritorio: Dashboard, Movimientos, Deudas, Estadísticas y Ajustes.
  - Dock flotante centrado en barra de navegación inferior para pantallas de escritorio.
  - Todos los Card Modals adaptados como diálogos flotantes centrados con transparencia real sobre la vista previa.
  - Detalle de Tarjeta (`cards/[id].tsx`) con layout responsivo en 2 columnas para Web/Tauri y motor de proyección multi-período.
  - Centro de Gestión de Pasivos y Cobros: Préstamos bancarios, préstamos a amigos, y Liquidación Mensual de Terceros (Fases 1 y 2).
  - Cobertura de Testing (100/100 tests en verde): Suites en `src/__tests__/` (ciclos de facturación, proyección de cuotas, amortizaciones, utilidades de fechas e identidad bancaria).
- **Hitos Recientes Concluidos**:
  - **Rediseño Estético de Tarjetas Bancarias en Dashboard (`[TASK-DASHBOARD-BANK-DECK-REDESIGN]`)**: Acento neón vertical integrado (3.5px), avatar squircle, saldo en 19px bold, supresión de texto redundante, ghost card para agregar banco, 17 marcas oficiales en `bank-identity.ts` y grid fluido de 2 columnas en Desktop (`width: 48.5%`, `flexGrow: 1`) sin huecos asimétricos. 100/100 tests en verde.
  - **Identidad Bancaria y Micro-Hero en Dashboard (`[TASK-DASHBOARD-BANK-DECK]`)**: Motor puro `getBankIdentity` con marcas (Nubank, Santander, BBVA, MP, Brubank, Efectivo) y hashing cyberpunk determinista. Carrusel `BankDeckCard` y Micro-Hero compacto (-50% altura, saldo 23px, micro-chips y barra patrimonial) en `balance-hero-card.tsx` e `index.tsx`. 89/89 tests en verde.
  - **Cuotas Propias Históricas y Pendientes en Tarjeta (`[TASK-PERSONAL-DEBT-HISTORICAL-PENDING]`)**: Eliminación de asignación espuria de `lastPaymentDate` en deudas preexistentes en `debts-store.ts`. Implementación de `computeCardPersonalDebtPeriodPaid` en `cards/[id].tsx` supeditada al extracto de la tarjeta (`cardCurrentMonthDebt <= 0`), emitiendo "Pendiente este mes" y "Cuota 5 de 8 • Pendiente" (caso iPhone). Caso 13 con Fake Timers en `billing-cycle.test.ts`.
  - **Precisión IEEE-754 y Auto-Reparación de Cuotas (`[TASK-INSTALLMENT-PRECISION-AUTOHEAL]`)**: Erradicación del truncamiento por punto flotante en `debts-store.ts`. Implementación de `getEffectivePaidInstallments` en `date-helpers.ts` derivando cuotas pagadas reales desde el monto amortizado y auto-reparando datos preexistentes en disco. Sincronización en `cards/[id].tsx`.
  - **Unificación de Ciclo de Vida de Cuotas (`[TASK-INSTALLMENT-LIFECYCLE-UNIFICATION]`)**: Semántica unificada con `isCurrentPeriodPaid` en `getInstallmentProgressInfo` y `getProjectedInstallmentInfo` ("Cuota X de Y • Cubierta" en ciclo actual, proyectando X+1 el próximo mes). Conectado en `debts.tsx` y `cards/[id].tsx`.
  - **Detalle de Tarjeta Desktop y Proyección Inteligente (`[TASK-CARDS-RESPONSIVE-PROJECTION]`)**: Layout en 2 columnas (`isWide >= 768`), tarjeta física calibrada a ~400px, selector cyberpunk de períodos (`Actual`, `Próximo Mes`, `+2 Meses`).
- **Próximo Foco Inmediato**:
  - Consolidar fase 3 de saldos bancarios o evaluar mejoras de modales de deuda en desktop.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO usar bordes superiores toscos, etiquetas redundantes ni anchos rígidos en tarjetas bancarias (Regla de Tarjetas Bancarias en Dashboard)**: Usar acento vertical neón interior en lugar de bordes superiores toscos, suprimir etiquetas redundantes de saldo, y en Desktop usar grid fluido de 2 columnas (width 48.5%, flexGrow 1) para llenar la columna izquierda sin huecos asimétricos.
- ❌ **NO usar tarjetas de balance gigantes que empujen los vencimientos y transacciones (Regla de Liquidez y Bancos en Dashboard)**: Presentar la liquidez total en formato compacto con carrusel horizontal de `BankDeckCard` para diferenciar saldos bancarios rápidamente por color de marca, evitando cards de balance gigantes que empujen los vencimientos y transacciones.
- ❌ **NO asignar `new Date()` como `lastPaymentDate` a deudas preexistentes ni asumir cuotas propias de tarjeta cubiertas sin pago del extracto (Regla de Compras Propias en Tarjeta)**: Nunca asignar `new Date()` como `lastPaymentDate` a deudas preexistentes. Las cuotas propias de tarjeta están supeditadas al pago del extracto (`cardCurrentMonthDebt <= 0`); si la tarjeta no se ha pagado, la cuota a cobrar es `cuotas_pagadas + 1` (Pendiente).
- ❌ **NO usar `Math.floor((total - rem) / monthly)` directamente con decimales sin normalización previa (Regla de Precisión IEEE-754 en Cuotas)**: Los errores de redondeo de punto flotante truncan cocientes como `0.9999999999999998` a `0`. Usar siempre `getEffectivePaidInstallments` para derivar cuotas amortizadas y auto-reparar registros preexistentes en disco.
- ❌ **NO incrementar ciegamente el número de cuota activa al pagar el ciclo en curso (Regla de Cuotas Activas)**: Al pagar la cuota de un ciclo, no incrementar ciegamente el número visible a cobrar en el ciclo en curso. Mantener "Cuota X de Y • Cubierta" hasta el corte del siguiente ciclo, y proyectar "Cuota X+1 de Y" únicamente para meses futuros (`offset >= 1`).
- ❌ **NO estirar la tarjeta física de crédito al 100% en pantallas anchas**: En escritorio (`isWide`), encapsular en layout de 2 columnas (`maxWidth: 1150`) con tarjeta digital acotada a ~400px y proporciones físicas reales a la izquierda, y consumos a la derecha.
- ❌ **NO proyectar consumos en cuotas sumando meses ciegamente ni omitir compras post-corte**: Usar siempre `getProjectedCardBillingPeriod` y `getProjectedInstallmentInfo` para derivar el rango de fechas de cada ciclo futuro, calcular la cuota según `periodOffset` y clasificar gastos de 1 cuota pre/post corte.
- ❌ **NO expulsar cargos de terceros saldados del extracto de la tarjeta si pertenecen al ciclo actual de facturación**: Mantener su cuota en `thirdPartyMonthDue` hasta el pago efectivo de la tarjeta (`card_payment`).
- ❌ **NO condicionar `settled: false` al 100% del monto original en reversiones de abono**: Si `newRemaining > 0.0001`, la compra debe reactivarse (`settled: false`, `settledAt: undefined`), permitiendo compras con pagos históricos previos.
- ❌ **NO omitir `presentation: 'transparentModal'` en Stacks anidados de modales en Web**: De lo contrario, React Navigation inyecta fondo gris opaco `#F2F2F2`.
- ❌ **NO mostrar modales a pantalla completa plana en escritorio**: Usar contenedor centrado tipo diálogo flotante (`maxWidth: 580-680`, backdrop translúcido, `Escape`).
- ❌ **NO usar `AsyncStorage.clear()` para reseteos**: Destruye tarjetas, bancos, contactos y credenciales; usar purga granular selectiva por store.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** a menos que el usuario lo solicite explícitamente (`Visual Freeze`).
- ❌ **NO usar imports estáticos cruzados entre Stores y Services**: Usar inyección de handlers para romper ciclos de require en Metro.
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores). Simular fechas con Fake Timers.

## 4. Bugs Críticos Resueltos & Blindajes
- **Falsa Cobertura de Cuotas Históricas Propias en Tarjeta (Caso iPhone)**: Creación de deuda histórica preexistente asignaba erróneamente `lastPaymentDate = now`, marcando la siguiente cuota como cubierta y saltando al número de cuota siguiente. Corregido en `debts-store.ts` y `cards/[id].tsx` supeditándolo al pago del extracto (`cardCurrentMonthDebt <= 0`) con estado `• Pendiente`.
- **Truncamiento de Cuotas por Precisión IEEE-754 (Caso VS BIKES)**: Compras con decimales amortizadas (ej. $169.900,01 con saldo restante $113.266,67) quedaban estancadas en `paidInstallments: 0` debido a `Math.floor` truncando `0.9999999999999998` a `0`. Blindado con `getEffectivePaidInstallments` y tolerancia epsilon `0.05`.
- **Salto Prematuro de Cuota Cubierta (Caso JBL)**: Erradicación del error donde pagar la cuota 1 saltaba a mostrar "Cuota 2 de 5" en el mes actual y "Cuota 3 de 5" en el próximo mes. Resuelto con `isCurrentPeriodPaid` en `getInstallmentProgressInfo` y `getProjectedInstallmentInfo`, manteniendo "Cuota X de Y • Cubierta" en el ciclo en curso.
- **Proyección de Ciclos de Tarjetas sin Desfases**: Manejo de compras en cuotas en períodos `+1` y `+2`, detección de compras post-corte del ciclo actual que ingresan en el próximo mes, y expiración de cuotas saldadas en el futuro sin descalabrar el límite disponible.
- **Reversión Contable de Abonos Parciales**: Desvinculación de `isRestoredToFull` en `revertThirdPartyPersonAbono`, soporte bidireccional por ID y UUID determinista en `revertThirdPartyAllocations` y fallback en cascada en `deleteTransaction`.
- **Retención de Compras de Terceros Saldadas en Tarjeta**: Filtro con `isDateInCurrentBillingCycle` en `cards/[id].tsx`, `cards-overview.tsx` y `upcoming-debts-card.tsx` para no restar cuotas del extracto mensual antes del pago de la tarjeta.
- **Fondo Gris Opaco en Modales Web**: Anulado el fondo `#F2F2F2` con `presentation: 'transparentModal'` y `contentStyle: { backgroundColor: 'transparent' }` en Stacks anidados.
- **Modales Estirados en Web/Tauri**: Diálogos flotantes centrados con backdrop translúcido y cierre exterior en `new-transaction.tsx` (580px), `new-debt.tsx` (620px), `cards-overview.tsx` (680px) y `legacy-card-expense.tsx` (580px).

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

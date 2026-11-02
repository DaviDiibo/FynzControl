# Memoria Activa del Proyecto ControlFynz

> **Límite Estricto**: Este archivo mantiene el contexto de trabajo activo y NO debe superar las 100 líneas. Para la bitácora de tareas concluidas, consultar `HISTORY.md` bajo demanda.

## 1. Arquitectura y Stack Base
- **Framework**: Expo SDK 57 (React Native) + Expo Router (`app/` en la raíz).
- **Lenguaje & Tipado**: TypeScript estricto, arrow functions con tipado inline obligatorio (`const Comp = (props: Props): JSX.Element => ...`), cero `any` o `unknown`.
- **Estado y Persistencia**: Zustand con adaptador `safeStorage` (con respaldo resiliente en memoria). Claves activas: `*-storage-v2`.
- **UI & Tema**: Modo oscuro cyberpunk/neón (`#121212`, tarjetas `#1E1E1E`, acento `#00FFA3`, peligro `#FF453A`). Modales interactivos transparentes, nunca diálogos toscos nativos.
- **Multiplataforma**: Paridad iOS (KeyboardOffset 48dp, Safe Area), Android (KeyboardOffset 0dp, Edge-to-edge) y Web/Tauri Desktop (`useIsWide(768)`).
- **Backend / Infra & Sync**: Arquitectura Offline-First con proyección a Supabase (Auth, RLS, PostgreSQL). Sincronización Multi-Dispositivo en `sync-service.ts` y `use-app-hydration.ts`: Soporta Pull en hidratación, Focus Sync en Web/Móvil y canal Supabase Realtime (WebSockets) para replicación instantánea entre dispositivos.
- **Testing & QA**: Jest 29 + `jest-expo` (~57.0.6). Verificación doble obligatoria (`npm test` 100% pass [121/121] + `npx tsc --noEmit` 0 errores) previo a cerrar cualquier tarea.

## 2. Estado Activo del Sprint y Foco Inmediato
- **Módulos Principales Culminados**:
  - 5 Tabs operativas con paridad móvil y escritorio: Dashboard, Movimientos, Deudas, Estadísticas y Ajustes.
  - Dock flotante centrado en barra de navegación inferior para pantallas de escritorio.
  - Todos los Card Modals adaptados como diálogos flotantes centrados con transparencia real sobre la vista previa.
  - Detalle de Tarjeta (`cards/[id].tsx`) con layout responsivo en 2 columnas para Web/Tauri y motor de proyección multi-período.
  - Pantalla de Detalle de Deudas en `app/(app)/debts/[id].tsx`: Soporta trazabilidad y auditoría histórica completa de pasivos propios y préstamos a amigos, con bitácora de transacciones bancarias vinculadas.
  - Centro de Gestión de Pasivos y Cobros: Préstamos bancarios, préstamos a amigos, y Liquidación Mensual de Terceros (Fases 1 y 2).
  - Cobertura de Testing (121/121 tests en verde): Suites en `src/__tests__/` (formato de divisas, ciclos de facturación, proyección de cuotas, amortizaciones, utilidades de fechas e integración contable).
- **Hitos Recientes Concluidos**:
  - **Sincronización Automática Multi-Dispositivo (`[TASK-MULTI-DEVICE-CLOUD-SYNC]`)**: Pull silencioso al hidratar, Focus Sync con cooldown de 6s y suscripción a Supabase Realtime (`user-sync-${userId}`) para replicación instantánea vía WebSockets. Soporte de `'INITIAL_SESSION'` en navegador (F5). 121/121 tests en verde y 0 errores de TypeScript.
  - **Pantalla de Detalle y Bitácora de Deudas (`[TASK-DEBT-DETAIL-SCREEN-PHASE-2]`)**: Creación de `app/(app)/debts/[id].tsx` con Hero Card Financiero, barra de progreso de cuotas, bitácora cronológica de pagos bancarios vinculados (`relatedDebtId`/`relatedLoanId`), barra flotante de amortización/abono con modales integrados y navegación conectada desde tarjetas en `debts.tsx`. 121/121 tests en verde y 0 errores de TypeScript.
  - **Calibración de Semáforos en Dashboard (`[TASK-DASHBOARD-URGENCY-CALIBRATION-1B]`)**: Semáforo preventivo en `upcoming-debts-card.tsx` con `getDashboardUrgencyStatus` (`overdue`/`today` rojo, `urgent` <= 3d naranja, `warning` <= 7d dorado `#FFD60A`, `normal` verde). Eliminación de badge verde en alertas a 4-7 días ("Próximo (Xd)"). Caso 22 en Jest. 121/121 tests en verde y 0 errores de TypeScript.
  - **Integridad Contable en Deudas y Transacciones (`[TASK-DEBTS-ACCOUNTING-INTEGRITY-1A]`)**: Trazabilidad directa mediante `relatedDebtId`/`relatedLoanId` en `new-transaction.tsx`, sincronización y reseteo de `lastPaymentDate` en reversiones de deuda personal en `debts-store.ts`, y tolerancia IEEE-754 (`<= 0.05`) para liquidar centavos residuales en abonos de terceros. Casos 20 y 21 en Jest. 120/120 tests en verde y 0 errores de TypeScript.
  - **Blindaje de Pagos por Ciclo y Cuotas de Terceros (`[TASK-CARD-CYCLE-PAYMENTS-ISOLATION]`)**: Acotamiento estricto de `card_payment` al ciclo activo con `isDateInCurrentBillingCycle(t.date)` en `computeCardBillingStatement` y `cards/[id].tsx`, evitando arrastre de pagos históricos. Facturación íntegra de cuota pactada de terceros (`normalQuota`) en extracto bancario y Caso 17 en Jest con Fake Timers. 118/118 tests en verde y 0 errores de TypeScript.
  - **Cálculo de Vencimiento y Alertas de Tarjetas en Dashboard (`[TASK-CARD-DUE-DATE-DASHBOARD-FIX]`)**: Sustitución de `calculateRecurringDueDate` por `getCardBillingCycleDates` en `upcoming-debts-card.tsx`. Eliminación de falso positivo "¡Vence hoy!" en compras post-corte, proyección a 30 días y Caso 19 en Jest. 118/118 tests en verde y 0 errores de TypeScript.
  - **Desacoplamiento y Modularización de Deudas (`[TASK-OPTIMIZATION-PHASE-6A/B]`)**: Extracción de modales monolíticos (`PersonalDebtPaymentModal` y `FriendLoanCollectionModal`) desde `debts.tsx`. Reducción neta de >700 líneas preservando doble imputación y Visual Freeze.
  - **Optimización y SSOT Contable de Tarjetas (`[TASK-OPTIMIZATION-PHASE-4/5]`)**: Memoización de ítems de lista con `React.memo` y creación de `computeCardBillingStatement` en `card-accounting.ts` como Single Source of Truth contable.
  - **Moneda, Persistencia y Sincronización (`[TASK-OPTIMIZATION-PHASE-2/3]`)**: Utilidades de moneda (`currency.ts`), corrección de doble resta en `stats.tsx` y adaptador centralizado `safeStorage` con handlers para Supabase.
- **Próximo Foco Inmediato**:
  - Continuar con la siguiente etapa de consolidación modular del módulo de deudas (ej. modal de amortización de préstamos bancarios o liquidaciones de terceros) o siguientes optimizaciones del backlog.

## 3. Lecciones Aprendidas y Reglas de Oro (Qué NO Hacer)
- ❌ **NO ignorar `'INITIAL_SESSION'` al sincronizar sesiones persistentes (Regla de Sincronización al Recargar)**: Escuchar siempre `'INITIAL_SESSION'` en Supabase auth para disparar `syncAll` al refrescar el navegador (F5).
- ❌ **NO mostrar badge verde "En plazo" en deudas que alertan en el widget del Dashboard (Regla de Semáforos Preventivos en Dashboard)**: Alertas entre 4 y 7 días deben usar nivel `warning` (amarillo/dorado `#FFD60A`) y nunca `normal` verde, manteniendo la coherencia semafórica preventiva ("Próximo (Xd)").
- ❌ **NO omitir `relatedDebtId` o `relatedLoanId` al generar transacciones vinculadas a deudas (Regla de Trazabilidad en Transacciones)**: Toda transacción generada para deudas o préstamos DEBE portar `relatedDebtId` o `relatedLoanId` para garantizar su reversión exacta por ID sin depender de descripciones o títulos.
- ❌ **NO preservar `lastPaymentDate` al revertir un pago de deuda personal (Regla de Reversión de Fechas de Deuda)**: Al revertir un pago de deuda personal, `lastPaymentDate` debe resetearse para no fingir que la deuda sigue al día en el período actual y permitir que vuelva a estado pendiente o vencido.
- ❌ **NO exigir `newRemaining === 0` exacto en compras a cuotas de terceros (Regla de Tolerancia IEEE-754 en Terceros)**: Liquidar con `newRemaining <= 0.05` para absorber centavos residuales generados por divisiones inexactas en cuotas periódicas.
- ❌ **NO acumular pagos de tarjeta (`card_payment`) sin acotarlos al ciclo de facturación activo (Regla de Pagos de Tarjeta por Ciclo)**: Los pagos de tarjeta (`card_payment`) SIEMPRE deben filtrarse con `isDateInCurrentBillingCycle(t.date)` al calcular la deuda del extracto actual. De lo contrario, los pagos de meses anteriores persisten y distorsionan períodos futuros.
- ❌ **NO reducir la cuota mensual de consumos de terceros en el extracto por abonos previos del amigo (Regla de Facturación de Cuotas de Terceros)**: El extracto de la tarjeta debe exigir la cuota pactada completa (`normalQuota`), ya que el banco factura el 100% independientemente de si el tercero abonó parcial o totalmente antes del vencimiento.
- ❌ **NO usar `calculateRecurringDueDate` para tarjetas de crédito (Regla de Vencimientos de Tarjetas)**: Para cálculo de vencimientos de tarjetas de crédito en cualquier componente o card (Dashboard o Overview), SIEMPRE usar `getCardBillingCycleDates(closingDay, paymentDay, refDate)` y NUNCA `calculateRecurringDueDate(paymentDay, ...)`.
- ❌ **NO re-renderizar tarjetas de lista extensas ni recrear handlers inline en pantallas padre (Regla de Memoización en Listas)**: Envolver tarjetas de lista con `React.memo` y memoizar handlers con `useCallback`.
- ❌ **NO duplicar cálculos de ciclo ni abonos inline para tarjetas (Regla de Liquidación de Tarjetas)**: Usar siempre `computeCardBillingStatement` para calcular extractos y deudas de tarjeta.
- ❌ **NO restar 1 al mes más de una vez al parsear YYYY-MM-DD manualmente (Regla de Fechas ISO)**: Restar 1 al mes únicamente una sola vez antes o al pasarlo al constructor (`new Date(y, m - 1, d)`).
- ❌ **NO mutar entidades de Supabase en stores persistentes sin sincronización reactiva (Regla de Sincronización en Stores)**: Exportar `setXSyncHandlers` y conectar en `sync-service.ts`.
- ❌ **NO usar bordes superiores toscos ni tarjetas de balance gigantes en Dashboard**: Usar acento vertical neón interior y carrusel compacto de `BankDeckCard`.
- ❌ **NO asignar `new Date()` como `lastPaymentDate` a deudas preexistentes ni asumir cuotas propias de tarjeta cubiertas sin pago del extracto**: Las cuotas de tarjeta dependen de `cardCurrentMonthDebt <= 0`.
- ❌ **NO usar `Math.floor((total - rem) / monthly)` directamente con decimales (Regla IEEE-754)**: Usar siempre `getEffectivePaidInstallments` con tolerancia epsilon.
- ❌ **NO incrementar ciegamente el número de cuota activa al pagar el ciclo en curso**: Mantener "Cuota X de Y • Cubierta" hasta el corte del siguiente ciclo.
- ❌ **NO estirar la tarjeta física de crédito al 100% en pantallas anchas**: Encapsular en layout de 2 columnas (`maxWidth: 1150`).
- ❌ **NO proyectar consumos en cuotas sumando meses ciegamente**: Usar siempre `getProjectedCardBillingPeriod` y `getProjectedInstallmentInfo`.
- ❌ **NO expulsar cargos de terceros saldados del extracto si pertenecen al ciclo actual**: Mantener cuota en extracto hasta el pago efectivo de la tarjeta.
- ❌ **NO omitir `presentation: 'transparentModal'` en Stacks anidados de modales en Web**.
- ❌ **NO usar `AsyncStorage.clear()` para reseteos**: Usar purga granular selectiva por store.
- ❌ **NO modificar estilos ni layouts visuales preexistentes** sin solicitud explícita (`Visual Freeze`).
- ❌ **NO dejar código muerto, obsoleto o importaciones en desuso tras refactorizar o añadir funciones (Regla de Zero Dead Code)**: Auditar y purgar inmediatamente código redundante o ineficiente en el mismo ciclo, verificando con `npm test` y `npx tsc --noEmit`.
- ❌ **NO dar por concluida una tarea sin verificación doble**: Mandatorio `npm test` (100% pass) y `npx tsc --noEmit` (0 errores).

## 4. Bugs Críticos Resueltos & Blindajes
- **Pérdida de Sincronización al Refrescar en Navegador (F5)**: Sesiones persistentes no disparaban `SIGNED_IN`. Corregido escuchando `'INITIAL_SESSION'`, ejecutando Pull silencioso e inicializando canal Supabase Realtime.
- **Disonancia Semafórica en Alertas de Dashboard**: Deudas de 4 a 7 días alertaban en el widget pero mostraban badge verde "En plazo". Corregido con nivel `warning` (`#FFD60A`, "Próximo (Xd)").
- **Pérdida de Trazabilidad y Estado de Cuota en Reversión de Deudas**: Anulación de movimientos no enlazaba IDs de deudas/préstamos y mantenía `lastPaymentDate` como pagado. Resuelto con vinculación de IDs y reseteo de fecha en `debts-store.ts`.
- **Centavos Residuales Indefinidos en Liquidación de Terceros**: Compras a cuotas quedaban abiertas con `$0.01` por redondeos flotantes. Resuelto absorbiendo residuo cuando `newRemaining <= 0.05`.
- **Fuga de Pagos de Tarjeta entre Ciclos Consecutivos y Sub-facturación de Cuotas de Terceros**: Pagos históricos de tarjeta absorbían deudas de ciclos futuros y abonos de amigos reducían la factura nominal del banco. Blindado acotando pagos con `isDateInCurrentBillingCycle` y exigiendo `normalQuota` en `computeCardBillingStatement` y `cards/[id].tsx`.
- **Falso Vencimiento Urgente en Tarjetas Post-Corte (Día 1)**: Tarjetas con corte 29 y pago 1 mostraban "¡Vence hoy!" en compras del día 1 por usar `calculateRecurringDueDate`. Corregido con `getCardBillingCycleDates`, calculando 30 días restantes para el siguiente mes.
- **Desfase de Mes en Estadísticas Mensuales (`stats.tsx`)**: `parseTxDate` restaba 1 al mes dos veces consecutivas, desfasando movimientos de Octubre a Septiembre.
- **Falsa Cobertura de Cuotas Históricas Propias en Tarjeta (Caso iPhone)**: Creación de deuda histórica asignaba erróneamente `lastPaymentDate = now`. Supeditado al pago del extracto (`cardCurrentMonthDebt <= 0`) con estado `• Pendiente`.
- **Truncamiento de Cuotas por Precisión IEEE-754 (Caso VS BIKES)**: Compras con decimales quedaban estancadas en `paidInstallments: 0`. Blindado con `getEffectivePaidInstallments` y tolerancia epsilon `0.05`.
- **Salto Prematuro de Cuota Cubierta (Caso JBL)**: Mantener "Cuota X de Y • Cubierta" en el ciclo en curso con `isCurrentPeriodPaid`.
- **Proyección de Ciclos de Tarjetas sin Desfases**: Manejo de cuotas en períodos `+1` y `+2` y compras post-corte.
- **Reversión Contable de Abonos Parciales**: Desvinculación de `isRestoredToFull` y soporte bidireccional en cascada.
- **Retención de Compras de Terceros Saldadas en Tarjeta**: Filtro con `isDateInCurrentBillingCycle` para mantener la cuota en el extracto mensual antes del pago de la tarjeta.
- **Modales en Web/Tauri**: Fondo transparente con `transparentModal` y contenedor centrado tipo diálogo flotante (`maxWidth: 580-680`).

## 5. Referencia Histórica
- Para la bitácora histórica completa de tareas concluidas, archivos modificados y trazabilidad técnica, consultar bajo demanda: `HISTORY.md`.

# Guía Estándar para Solicitud y Ejecución de Tareas

Esta guía establece el estándar obligatorio para estructurar y ejecutar tareas en el proyecto **ControlFynz**. Su propósito es garantizar un control estricto del desarrollo, asegurar cambios atómicos y predecibles, y evitar cualquier modificación no autorizada o desborde de alcance (*scope creep*).

---

## 1. Propósito

El desarrollo de software asistido por agentes o equipos requiere límites claros y disciplina estricta. Esta guía existe para:
- **Garantizar el control del alcance**: Definir con precisión quirúrgica qué se debe construir y qué debe permanecer intacto.
- **Evitar modificaciones o eliminaciones accidentales**: Prevenir que se alteren, refactoricen o eliminen archivos y componentes existentes sin una orden explícita.
- **Asegurar atomicidad**: Cada tarea debe constituir un cambio acotado, incremental y fácilmente verificable sin efectos colaterales.

---

## 2. Reglas de Oro para el Agente / Desarrollador

Cualquier agente de IA o desarrollador que opere en este repositorio debe acatar de forma estricta las siguientes reglas:

1. **Cero iniciativas no solicitadas**:
   - No refactorizar código fuera del alcance.
   - No renombrar variables, componentes ni reestructurar carpetas si no fue pedido expresamente.
   - No agregar dependencias, librerías o herramientas adicionales sin autorización previa.

2. **Prohibido modificar o eliminar archivos sin orden explícita**:
   - Solo se permite editar o crear los archivos listados en la sección **Archivos involucrados** de la tarea.
   - Está terminantemente prohibido borrar archivos (`rm`, `delete`) o vaciar contenidos salvo que la tarea lo instruya de manera directa.

3. **Cambios pequeños, verificables e incrementales**:
   - Realizar cambios paso a paso.
   - Validar la sintaxis y tipos de TypeScript antes de dar por cerrada la tarea.
   - Mantener las soluciones simples y directas al requerimiento planteado.

4. **Respetar convenciones de código y arquitectura del proyecto**:
   - **TypeScript tipado inline**: Declarar componentes con tipado explícito de retorno, por ejemplo:
     ```tsx
     const MiComponente = (props: MiComponenteProps): JSX.Element => {
       // ...
     };
     ```
   - **Expo Router**: Respetar las rutas basadas en sistema de archivos dentro de `app/`, layouts (`_layout.tsx`) y parámetros de navegación.
   - **Tema Oscuro**: La interfaz debe diseñarse con soporte prioritario para tema oscuro (*dark mode*), utilizando la paleta de colores y estilos globales del proyecto.

5. **Idioma y documentación**:
   - Todo el contenido, comentarios de código, documentación, mensajes de commit, notas y memorias deben redactarse **100% en español**.

6. **Resumen Previo Obligatorio antes de tocar archivos**:
   - Antes de proceder con la modificación o creación de archivos según lo planeado, el desarrollador o agente debe presentar un resumen claro y detallado de las **acciones que se van a realizar** y el **POR QUÉ** técnico de cada una.
   - Queda estrictamente prohibido realizar escrituras, modificaciones o eliminaciones de archivos en disco sin haber comunicado previamente esta explicación técnica.

---

## 3. Estructura Estándar de Solicitud de Tarea (Plantilla Copiable)

Utiliza la siguiente plantilla para redactar cualquier nueva solicitud de cambio, corrección o funcionalidad:

```markdown
# [ID/Nombre de la Tarea]

### 1. Protocolo Obligatorio de Resumen Previo
> **OBLIGATORIO**: Antes de proceder con la modificación o creación de archivos, informa un resumen claro de las acciones que realizarás y el **POR QUÉ** técnico de cada una.

### 2. Objetivo
[Descripción breve y concisa de lo que se busca lograr con esta tarea.]

### 3. Alcance (En Scope)
- [Funcionalidad o cambio específico requerido 1]
- [Funcionalidad o cambio específico requerido 2]
- [Detalle exacto de comportamiento esperado]

### 4. Fuera de Alcance (Out of Scope)
- [Cosas que EXPLÍCITAMENTE NO se deben tocar, inventar ni modificar]
- [Componentes, vistas o servicios relacionados que deben permanecer intactos]
- [Refactorizaciones o mejoras colaterales no solicitadas]

### 5. Archivos involucrados (Máximo 1 a 3)
- Crear:
  - `ruta/al/nuevo/archivo.tsx`
- Modificar:
  - `ruta/al/archivo/existente.ts`
*(Nota: Queda prohibido alterar cualquier archivo fuera de esta lista).*

### 6. Criterios de Aceptación
- [ ] Se presentó el resumen previo de acciones y el por qué técnico antes de modificar o crear archivos.
- [ ] [Condición verificable 1 para dar por completada la tarea]
- [ ] [Condición verificable 2 (ej. compila sin errores de TypeScript)]
- [ ] [Verificación de que no hay regresiones ni cambios colaterales]
```

---

## 4. Ejemplo Práctico de Uso

A continuación se muestra un ejemplo real completado utilizando la plantilla estándar:

```markdown
# [TASK-012] Tarjeta de Resumen de Saldo Mensual

### 1. Protocolo Obligatorio de Resumen Previo
> **OBLIGATORIO**: Antes de proceder con la modificación o creación de archivos, informa un resumen claro de las acciones que realizarás y el **POR QUÉ** técnico de cada una.

### 2. Objetivo
Crear el componente visual de resumen de saldo mensual para la pantalla principal del Dashboard, mostrando ingresos, egresos y balance total con soporte de tema oscuro.

### 3. Alcance (En Scope)
- Crear el componente `BalanceSummaryCard` con tipado inline en TypeScript.
- Recibir como props: `income: number`, `expenses: number` y `currency: string`.
- Calcular y mostrar el balance neto (`income - expenses`).
- Aplicar estilos acordes al tema oscuro (fondos oscuros, textos en alto contraste, verde para saldo positivo y rojo para negativo).
- Integrar el componente en la vista principal `app/(tabs)/index.tsx`.

### 4. Fuera de Alcance (Out of Scope)
- No conectar con APIs remotas ni modificar la capa de almacenamiento/servicios.
- No alterar otros componentes existentes dentro de `app/(tabs)/index.tsx`.
- No modificar el sistema de temas ni variables globales de estilo.
- No instalar librerías externas de iconos o diseño.

### 5. Archivos involucrados
- Crear:
  - `components/dashboard/BalanceSummaryCard.tsx`
- Modificar:
  - `app/(tabs)/index.tsx`

### 6. Criterios de Aceptación
- [ ] Se presentó el resumen previo de acciones y el por qué técnico antes de modificar o crear archivos.
- [ ] El componente `BalanceSummaryCard` se renderiza correctamente con el tipado `const BalanceSummaryCard = (props: BalanceSummaryCardProps): JSX.Element => ...`.
- [ ] El balance neto se calcula de forma precisa y muestra los colores correctos según el signo.
- [ ] El diseño cumple con el tema oscuro del proyecto sin desalinear la vista principal.
- [ ] No se editaron ni crearon archivos adicionales fuera de los dos indicados.
- [ ] El proyecto compila sin errores de TypeScript ni advertencias de linter.
```

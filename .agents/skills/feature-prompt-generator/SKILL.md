---
name: feature-prompt-generator
description: Generador guiado de prompts para nuevas funcionalidades en ControlFynz siguiendo GUIA_TAREAS.md, arquitectura móvil de Expo y protocolo de confirmación previa.
version: 1.0.0
---

# Feature Prompt Generator — ControlFynz

Habilidad especializada para transformar requerimientos e ideas de nuevas funcionalidades en prompts y tareas atómicas de ejecución técnica para el proyecto **ControlFynz**.

Esta habilidad garantiza que cualquier tarea generada cumpla estrictamente con:
1. Las directrices de [GUIA_TAREAS.md](file:///c:/Users/david/Documents/ControlFynz/GUIA_TAREAS.md).
2. El **Protocolo de Resumen Previo Obligatorio** (explicar qué acciones se tomarán y el porqué antes de crear o modificar código).
3. La arquitectura móvil del proyecto: **Expo SDK 57+**, **Expo Router** en `app/`, **React 19**, **TypeScript estricto con tipado inline**, diseño prioritario en **Modo Oscuro**, y las mejores prácticas de `vercel-react-native-skills` y `expo-native-ui`.
4. Máxima atomicidad: **1 a 3 archivos por prompt/tarea**.

---

## Fases del Proceso de Generación

### Fase 1: Recepción y Análisis de la Idea
- Recibir la solicitud o idea del usuario.
- Identificar el objetivo de negocio y la necesidad funcional concreta dentro de ControlFynz.
- Evaluar el impacto en el árbol de componentes existente y las dependencias ya instaladas en `package.json`.

### Fase 2: Refinamiento Guiado
- Si la solicitud es ambigua o faltan aspectos críticos (por ejemplo: modelo de datos exacto, origen de datos mock/store, navegación o interacción visual clave), formular **preguntas clave concisas**.
- **Regla**: Hacer solo preguntas esenciales. Si el contexto técnico o la convención del proyecto ya resuelve la duda, no sobrecargar al usuario y asumir la convención estándar de ControlFynz.

### Fase 3: Descomposición Atómica (1 a 3 Archivos por Tarea)
- Toda funcionalidad de mediana o alta complejidad **debe dividirse en pasos/prompts atómicos y secuenciales**.
- **Regla estricta**: Ningún prompt individual debe ordenar la creación o modificación de más de **3 archivos**.
- Si una funcionalidad requiere múltiples archivos (por ejemplo: tipos de datos, store Zustand, componentes UI y pantallas en `app/`), estructurarla en una serie ordenada de tareas (`[FEATURE-PARTE-1]`, `[FEATURE-PARTE-2]`, etc.).

### Fase 4: Inyección del Protocolo de Resumen Previo Obligatorio
Todo prompt generado debe incluir de forma explícita y no negociable la instrucción:
> **"Antes de crear o modificar cualquier archivo, debes presentar un resumen claro de las acciones que vas a realizar y el POR QUÉ técnico de cada una de ellas."**

Esto previene errores, modificaciones no autorizadas y garantiza alineación total antes de que el ejecutor escriba en disco.

### Fase 5: Inyección de Restricciones Técnicas Fijas
Cada prompt generado debe incorporar las siguientes restricciones del stack:
- **Expo Router en `app/`**: Rutas basadas en archivos en `app/`, layouts con `_layout.tsx`, navegación mediante `expo-router` (`Link`, `router`, `useLocalSearchParams`). Los componentes reutilizables residen fuera de las rutas (en `components/` o `src/`), nunca rutas auxiliares no intencionales en `app/`.
- **Expo SDK 57+ / React 19 / React Native 0.86**:
  - Emplear componentes y APIs nativas compatibles con SDK 57 (`@expo/ui`, `expo-symbols`, `expo-image`, `expo-glass-effect`).
  - No usar paquetes de terceros incompatibles con la arquitectura de React 19 o New Architecture si existe solución nativa en Expo.
- **TypeScript Tipado Inline Estricto**:
  - Declaración explícita de componentes y retornos:
    ```tsx
    const MiComponente = (props: MiComponenteProps): JSX.Element => {
      // ...
    };
    ```
- **Prioridad Modo Oscuro**:
  - Paleta con fondo oscuro dominante, contrastes legibles, acentos controlados, respetando el sistema de diseño visual de ControlFynz.
- **Rendimiento y Directrices de `vercel-react-native-skills`**:
  - Evitar recreación de funciones y objetos literales inline en renderers de listas (`FlashList` / `FlatList`).
  - Manejo optimizado de estados con `Zustand`.
  - Animaciones fluidas mediante `react-native-reanimated` y gestos con `react-native-gesture-handler`.
- **Directrices de `expo-native-ui`**:
  - Preferir `@expo/ui` para controles nativos (botones, menús, pickers).
  - Uso de `expo-symbols` para simbología e iconografía móvil nativa.
- **Delimitación Quirúrgica de Alcance (`Out of Scope`)**:
  - Listar explícitamente lo que NO se debe tocar ni refactorizar para evitar efectos secundarios.

---

## Plantilla Estándar de Salida

Todo prompt generado debe seguir con fidelidad la siguiente estructura:

```markdown
# [ID/Nombre de la Tarea]

### 1. Protocolo Obligatorio de Confirmación Previa
> **ATENCIÓN OBLIGATORIA**: Antes de proceder con la modificación o creación de archivos según lo planeado, debes informar un resumen claro y detallado de las acciones que realizarás y el **POR QUÉ** técnico de cada una.

### 2. Objetivo
[Descripción concisa del cambio o funcionalidad específica.]

### 3. Alcance (En Scope)
- [Requisito específico 1]
- [Requisito específico 2]
- [Regla técnica: Expo Router en app/, tipado inline `const Component = (props: Props): JSX.Element => ...`, tema oscuro prioritario]

### 4. Fuera de Alcance (Out of Scope)
- [Archivos, pantallas o módulos que NO se deben tocar]
- [Dependencias que NO se deben instalar]
- [Refactorizaciones colaterales prohibidas]

### 5. Archivos involucrados (Máximo 1 a 3)
- Crear:
  - `ruta/al/archivo.tsx`
- Modificar:
  - `ruta/al/archivo_existente.tsx`
*(Nota: Queda estrictamente prohibido alterar cualquier archivo fuera de esta lista).*

### 6. Criterios de Aceptación
- [ ] Se presentó el resumen previo explicativo (acciones + por qué) antes de crear o editar archivos.
- [ ] Cumple con tipado inline estricto y compila sin errores (`npx tsc --noEmit`).
- [ ] Cumple con el diseño de tema oscuro y convenciones de Expo SDK 57+.
- [ ] No se crearon ni editaron archivos fuera de la lista autorizada.
```

---

## Flujo de Trabajo del Generador (Instrucciones para el Agente)

Cuando se solicite generar un prompt para una nueva funcionalidad:
1. **Analizar la solicitud**: Entender qué pantalla, componente, store o flujo se pide.
2. **Dividir en pasos si supera 3 archivos**: Proponer el desglose en Partes/Fases (`Parte 1`, `Parte 2`, etc.).
3. **Generar el prompt listo para usar**: Utilizar la plantilla estándar con todas las secciones completas.
4. **Validar restricciones**: Verificar que no falten las cláusulas de resumen previo, modo oscuro, tipado inline y out-of-scope.

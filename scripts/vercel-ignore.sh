#!/bin/bash

echo "🔍 Evaluando condiciones de compilación en Vercel..."

# 1. Cancelar build si el commit contiene [skip ci] o [skip vercel]
if echo "$VERCEL_GIT_COMMIT_MESSAGE" | grep -qiE '\[(skip[ -]?ci|skip[ -]?vercel)\]'; then
  echo "🛑 [skip ci] detectado en mensaje de commit. Cancelando build en Vercel."
  exit 0
fi

# 2. Cancelar build si la rama NO es main (producción)
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then
  echo "🛑 Rama secundaria ($VERCEL_GIT_COMMIT_REF) detectada. Cancelando preview deployment para optimizar recursos."
  exit 0
fi

# 3. Inspeccionar archivos modificados en el último commit o merge
CHANGED_FILES=$(git diff --name-only HEAD^ HEAD 2>/dev/null || echo "ALL")

if [ "$CHANGED_FILES" != "ALL" ]; then
  WEB_IMPACT=$(echo "$CHANGED_FILES" | grep -v -E '^(\.agents/|src-tauri/|docs/|.*\.md$|\.vscode/|\.gitignore)')
  if [ -z "$WEB_IMPACT" ]; then
    echo "🛑 Solo cambiaron archivos de documentación, Tauri Desktop o soporte. Cancelando build web."
    exit 0
  fi
fi

# 4. Proceder con el build si hay cambios relevantes en web sobre main
echo "✅ Cambios legítimos para web detectados en 'main'. Procediendo con la compilación..."
exit 1

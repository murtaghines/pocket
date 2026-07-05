---
description: Retomar el trabajo de un epic de Pocket por nombre
argument-hint: [nombre-del-epic]
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

## Estado del epic
!`cat docs/epics/$ARGUMENTS.md 2>/dev/null || echo "No existe docs/epics/$ARGUMENTS.md — avisame antes de asumir nada"`

## Últimos commits relacionados
!`git log --oneline -8 -- "src/**/*$ARGUMENTS*" "src/components/$ARGUMENTS" 2>/dev/null`

## Instrucciones
Estás retomando el epic "$ARGUMENTS" de Pocket.
1. Usá el estado de arriba como contexto — no me pidas que te cuente qué se hizo, ya lo tenés
2. Las reglas de .claude/rules/ para este módulo se cargan solas cuando tocás los archivos correspondientes — no las repitas acá
3. Si el archivo de estado no existía, creá uno nuevo en docs/epics/$ARGUMENTS.md siguiendo el formato de docs/epics/_template.md
4. Antes de terminar la sesión, actualizá docs/epics/$ARGUMENTS.md con: qué se hizo, decisiones tomadas, próximo paso
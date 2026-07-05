---
description: Resume work on a Pocket epic by name
argument-hint: [epic-name]
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

## Epic state
!`cat docs/epics/$ARGUMENTS.md 2>/dev/null || echo "docs/epics/$ARGUMENTS.md does not exist — tell me before assuming anything"`

## Recent related commits
!`git log --oneline -8 -- "src/**/*$ARGUMENTS*" "src/components/$ARGUMENTS" 2>/dev/null`

## Instructions
You are resuming the "$ARGUMENTS" epic of Pocket.
1. Use the state above as context — don't ask me to recap what's been done, you already have it
2. The .claude/rules/ rules for this module load on their own when you touch the matching files — don't repeat them here
3. If the state file didn't exist, create a new one at docs/epics/$ARGUMENTS.md following the format of docs/epics/_template.md
4. Before ending the session, update docs/epics/$ARGUMENTS.md with: what was done, decisions made, next step

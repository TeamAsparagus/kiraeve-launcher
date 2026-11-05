---
name: nat-read
description: >
  Read and ingest project context from PROJECT_CONTEXT.md so the AI agent understands
  all decisions, requirements, stack, and next steps immediately. Trigger: /nat-read, /natread, /read-context.
argument-hint: "[filepath]"
---

# NAT Read (Project Context Ingestion)

Read and ingest project context, tech stack, decisions, and constraints from `PROJECT_CONTEXT.md` in the workspace root.

## Execution Steps
1. Locate `PROJECT_CONTEXT.md` in the current workspace (or the path passed in arguments).
2. If the file does not exist:
   - Inform the user that `PROJECT_CONTEXT.md` was not found.
   - Suggest running `/nat` to generate it.
3. Read the file completely.
4. Output a concise briefing to the user confirming:
   - **Project Name & Goal**
   - **Chosen Technology Stack**
   - **Active Constraints & Rules** (e.g. no emojis, no icons, coding rules)
   - **Current Implementation State** (Completed vs Pending)
   - **Immediate Next Step to Execute**
5. Retain all context and proceed directly with the task requested by the user.

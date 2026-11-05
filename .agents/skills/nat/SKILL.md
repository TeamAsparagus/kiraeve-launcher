---
name: nat
description: >
  Note Anything (NAT): Record consultation context, user decisions, chosen technologies,
  and architecture tradeoffs into a structured markdown document, or read and ingest existing
  context for AI continuation. Trigger: /nat, /NAT, /noteanything, /nat read.
argument-hint: "[read|write|filepath]"
---

# Note Anything (NAT)

Capture conversation decisions, stack choices, and project direction into a machine-readable markdown note for other AI agents to ingest, or read existing context to resume work.

## Commands

### 1. Read Mode (`/nat read` or `/nat read <filepath>`)
Used when a fresh AI session starts or when another agent needs to ingest the project context.
1. Locate `PROJECT_CONTEXT.md` in workspace root (or specified path).
2. If file not found, inform user and suggest running `/nat write`.
3. Read the file completely.
4. Output a terse briefing to the chat:
   - **Project Name & Goal**
   - **Tech Stack**
   - **User Constraints & Invariants** (e.g. no emojis, no icons, code style)
   - **Current Completed vs Pending items**
   - **Immediate Next Action**
5. Proceed with work based on the loaded context.

### 2. Write / Record Mode (`/nat`, `/nat write`, or `/NAT`)
Extract key architectural and technical decisions made in the current session and write/update them in `PROJECT_CONTEXT.md` at the root of the workspace.

1. Scan conversation context for:
   - **Goal & Core Requirements**: What the user wants to build.
   - **User Decisions**: Explicit choices the user confirmed.
   - **Chosen Technology Stack**: Languages, frameworks, tools, libraries, and protocols selected.
   - **Rejected Alternatives / Tradeoffs**: What was considered but dropped, and why.
   - **Current Implementation State**: What is already done vs what is pending.
   - **AI Agent Directives**: Instructions, constraints, or gotchas for the next agent picking up this repo.

2. Target File:
   - Default: `./PROJECT_CONTEXT.md` in the workspace root.
   - If user specifies another filename, use that.
   - If the file already exists, merge/update sections without wiping existing valid notes.

## Markdown Structure for `PROJECT_CONTEXT.md`

```markdown
# Project Context & Decisions (NAT)

> Last Updated: [ISO 8601 Timestamp]
> Status: Active

## 1. Project Overview & Goal
- Summary of the application or system.

## 2. Confirmed Requirements
- Specific user requirements and behavioral constraints.

## 3. Technology Stack & Rationale
| Component | Technology | Rationale / Key Reason |
| :--- | :--- | :--- |
| Framework / Runtime | ... | ... |
| Backend & Auth | ... | ... |
| Database | ... | ... |
| Distribution | ... | ... |

## 4. Key Decisions & User Selections
- Decision 1: ...
- Decision 2: ...

## 5. Rejected Alternatives & Constraints
- Why X was skipped in favor of Y.
- Constraints imposed by the user (no emoji, no icons, etc.).

## 6. Current Implementation State
- [x] Completed item
- [ ] In-progress / Pending item

## 7. Context Handoff for AI Agents
- **Primary Entry Points**: Paths to key source files.
- **Critical Invariants**: Rules any future agent must respect.
- **Immediate Next Step**: Exactly what the next agent should execute.
```

## Rules
- Keep output dense, structured, and factual.
- Do not add conversational fluff inside `PROJECT_CONTEXT.md`.
- Keep paths, identifiers, and table schemas verbatim.
- Always report the path of the created/updated file to the user once written.

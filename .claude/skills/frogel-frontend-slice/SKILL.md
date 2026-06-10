---
name: frogel-frontend-slice
description: Use this skill when making a small, safe Frogel frontend UI or UX change in HTML, CSS, or vanilla JavaScript.
---

# Frogel Frontend Slice Workflow

Use this workflow for frontend changes in Frogel.

## Before editing

1. Read CLAUDE.md.
2. Run or ask for:

```powershell
git status
```

3. Identify the slice type:

   * layout-only
   * visual polish
   * small JavaScript behavior
   * bug fix
   * refactoring

4. Name the exact files that should change.

## Safety rules

* Do not touch backend files.
* Do not change API contracts unless explicitly asked.
* Do not rename ids used by JavaScript.
* Do not break script order.
* Do not rewrite large files when a small patch is enough.
* Do not change Today Plan or Attention logic during unrelated layout work.
* Do not introduce frameworks.
* Do not use smart quotes in JavaScript.

## Implementation style

Prefer:

* small HTML wrappers
* CSS classes
* minimal JS changes
* preserving existing functions
* calm Frogel UI tone

Avoid:

* large refactors
* new architecture
* corporate dashboard patterns
* childish visual elements
* noisy gamification

## After editing

Provide:

1. Changed files.
2. Short summary.
3. Manual smoke test.
4. Risks or things to check.

Do not commit unless the user explicitly asks.

# ARCHITECTURE as a map: each part's spec in docs/spec/, its cited names kept as stubs

Date: 2026-11-18. PR: #1134. Rules or docs touched: docs/ARCHITECTURE.md, docs/spec/, tests/docs.test.js.

## Context

The docs restructuring plan ([docs audit](../reviews/2026-11-18-docs-audit.md) section 6.2, PR 4) turns
ARCHITECTURE.md into a map, one section per PR, the largest first: "the spec of the present moves to a spec file or
stays, the history moves". It did not say where the spec files live, what a map section holds, or what happens to the
section and lead-in names that code comments, rules and decision records cite (`tests/docs.test.js` checks that every
citation of an ARCHITECTURE section or lead-in by name resolves; a comment in `Code.gs` or `core.js` cannot change without a sheet-script version).

## Decision

Integrator's call, made while building the first section (Progress sync), within the plan Pierre approved on 2026-11-18
("ok" to the restructuring plan, audit 6.3 (a)):

- A part's specification goes to `docs/spec/<topic>.md`, in the present tense, with no dated history, quotes or
  version-by-version narration. Text that a section held but that belongs to another part gets a spec of its own (the
  cards and prompts that sat under Progress sync are `docs/spec/cards.md`).
- The ARCHITECTURE section keeps its heading and holds the map: what the part is, its main files and functions, how it
  connects to the others, and where each detail lives.
- Every name another file cites stays in the map as a bold stub that links to its new home, so the citers (Pierre's
  rules, the sheet script's comments, the decision records) need no change.
- In this PR the history of the section was not copied into another doc: it stays in git (the base of the PR), the
  PRs, `tools/sync/HISTORY.md` and these records. Whether a later section moves the decisions its history holds into
  records, or copies its old text to `docs/archive/`, as the plan allows, is not settled here.

## Consequences

The next sections (Data files, Admin, Front end, Subjects, Tools) follow the same shape: a spec file, a map section,
stubs for the cited names. `tests/docs.test.js` treats
`docs/spec/*.md` as governing docs (their backticked identifiers must exist, no done list, no manual version bump) and
fails when a spec file is linked from no ARCHITECTURE section. Specified now in [ARCHITECTURE.md](../ARCHITECTURE.md)
"Progress sync (Google Sheet)", [spec/sync.md](../spec/sync.md) and [spec/cards.md](../spec/cards.md).

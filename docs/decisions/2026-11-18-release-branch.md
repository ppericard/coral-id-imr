# The sheet script installs from a release branch only the merge train moves

Date: 2026-11-18 (Manila). PR: #1102. Rules or docs touched: D3 (`docs/rules/sheet.md`), W26 (`docs/rules/ship.md`),
HANDOVER "Code.gs" and "Protect main", SECURITY (self-update row), INTEGRATOR, ARCHITECTURE "Versioning and deploy".

## Context

The sheet script updated itself every 15 minutes from `tools/sync/Code.gs` on `main`, so the live script followed
`main`, including commits that reached it without a merge train (the admin's Publish, the Candidate photos workflow, a
fix pushed by hand). The architecture review of 2026-11-18 (R5, question (h)) asked whether the script should update from
a release branch that only the green train moves, so that a bad commit on `main` never reaches the backend by itself.

## Decision

`autoUpdate` reads `tools/sync/Code.gs` (and the manifest) from a branch named `release`, and `tools/train.py` moves
that branch, and only it does, to the commit `main` ended on after the train's last merge, once `main`'s tree equals
the tree the train tested (creating the branch when missing, a plain push that can only fast-forward). Pierre approved it
on 2026-11-18 (infrastructure item 2; the review recommended yes, "nothing changes for him"). Integrator's calls, easy to
correct: the branch is called `release` (the review wrote `release/sheet`); while `release` does not exist (GitHub answers
404) the script reads `main`, and any other answer is a failed read that installs nothing; the data files the script
reads (`data.json`, `curation.json`, the fish files) stay on `main`.

## Consequences

- The live script only runs code a green train tested. A `Code.gs` change merged without a train waits on `main` for the
  next train to carry it; a train stopped half way leaves `release` where it was.
- Rollout: the train that merges this change still runs the old `train.py` and creates no `release`; the script then
  installs the new version from `main` and, finding no `release`, keeps reading `main`; the next train, run from an
  updated checkout, creates `release`.
- `release` deserves `main`'s ruleset (restrict deletions, block force pushes), a setting for Pierre to make; deleting it
  would silently send the script back to `main`.
- Specified now in rule D3 and HANDOVER "Code.gs"; the train's step in `tools/train.py` and rule W26.

# tools/queue: the integrator's merge-queue scripts

Bash and Python helpers that carry PRs to a green merge train (rule W26) while the integrator does other work. They need
`gh`, `jq` and `python3`. Settings, all optional (`lib.sh`):

- `QUEUE_DIR`: log and state directory, outside the repo (default `~/.cache/reefid-queue`; the log is `nightq.log`).
- `QUEUE_REPO` (default `ppericard/coral-id-imr`), `REPO_DIR` (default: the main checkout this folder belongs to).
- `QUEUE_TRAILERS`: commit trailers for `assignver.sh`'s commit (default: none).

Update worktrees go to `.claude/worktrees/` (rule W22, git-ignored).

| Script | What it does |
|---|---|
| `nightq.sh N…` | One PR at a time: wait for every check, Codex's receipt and completed security review for the full head SHA. Dry-run and train that SHA on current main under W26. A draft, red PR, unresolved thread or finding, missing review, pending VERSION assign or refused train is skipped and logged. |
| `uptodate.sh N` | An explicit branch update for the integrator when needed. Merges `origin/main` into the PR's branch, settling only the decisions index, append-only files and generated data. Anything else aborts ("needs a hand"). Pushes and asks `@codex review`. |
| `assignver.sh N` | Code.gs PR: update it, then assign the sheet VERSION (rule D3). Takes only main's line 1 and `VERSION`, keeps the branch's own `Code.gs`; a `Code.gs` conflict outside the version lines and the core.js block (`resolve_gs.py`) is "needs a hand". Pushes and asks Codex (`codex.md`). |
| `seqver.sh N…` | Code.gs PRs one after another: `assignver.sh`, then `nightq.sh`, for each. |
| `chainq.sh`, `afterver.sh`, `afterall.sh` | The same queues, started once the others have finished (`afterall.sh` waits for everything, the version queue first). |
| `prstate.sh N…`, `wait_ready.sh N…` | The PR state line (with `security@head: <state> <full SHA>`); wait for the checks, then print it. |
| `secreview.py SHA FILE` | The state of Codex's security review for that full head SHA, read from the Codex bot's summary markers only: `completed`, or not ready (`running`, `absent`, `stale`, `failed:<status>`, `findings`, `?`). |
| `pushwait.sh DIR BRANCH` | Push once no train runs. |
| `failjobs.sh REF` | The failing jobs of a commit or train branch, with their error lines. |
| `thr.py`, `resolve_block.py`, `resolve_append.py`, `resolve_gs.py`, `mainver.py`, `headfind.py` | Helpers: unresolved threads, conflict-block, append-only and `Code.gs` metadata resolution, main's version line, unanswered findings on the head. |
| `codex.md` | The `@codex review` comment with its footer. |

The queue passes the same full SHA to both `tools/train.py --dry-run --sha SHA N` and `tools/train.py --sha SHA N`.
Being behind main is fine if the pinned head composes cleanly. A conflict leaves the branch to the integrator. If a fix,
conflict resolution or VERSION assignment creates a new head, it needs its own checks and reviews.

For a head with absent or stale security review, `nightq.sh` uses the existing draft/ready fallback after checks,
once per head. A running, failed, unreadable or flagged review cannot pass, and an author's draft is never picked up.

## Trusted tools

The queue runs with the integrator's credentials, so a PR's own `tools/*.py` never run in it. `uptodate.sh` and
`assignver.sh` run `check_versions.py`, `sync_core.py`, `sheet_version.py`, `decisions_index.py` and the generated-data
builders from `origin/main`'s reviewed copy over the PR's data (`trusted_root` in `lib.sh`: a throwaway shadow root, `python3 -E`),
the way the session hooks run main's `tools/brief.py`. A PR that changes one of these tools is checked by main's copy
until it merges.

## Follow-ups (cut from the PR under rule W27; none is a one-line fix)

- **A security alert needs an explicit answer.** `headfind.py` counts a person's later issue comment as the answer
  (except `@codex review` requests); the full fix ties the answer to the alert (a reply to its thread or a quoted id).
- **`fish.json` conflicts.** `uptodate.sh` takes the PR's copy (`--ours`) and runs `build_fish.py --regroup`, which
  regroups the existing file and does not regenerate the species lists from the merged sources. Until it does a full
  rebuild (or aborts to "needs a hand" when both sides changed species), the integrator checks a `fish.json` conflict's
  result by hand.
- **A security alert survives a new head.** `headfind.py` reads alerts posted after the head's commit, so an
  unanswered alert drops out of view once a catch-up merge makes a newer head; the full fix carries every unanswered
  alert across heads. Meanwhile a CodeQL alert also fails its check, which the checks gate stops.
- **Wait for the Candidate photos workflow.** A judging merge starts `approved-photos.yml`, whose `photos-push` job
  pushes to `main`; a train started meanwhile aborts because main moved (nothing merges, the PR is skipped). The full
  fix waits for that workflow before the next train.
- **A data file the PR deletes under `tools/`.** `trusted_root` overlays the PR's tracked files on main's `tools/`, so
  a file the PR deleted stays as main's copy for the tools run through it; the full fix removes from the shadow tree
  every file the PR deleted.

## Order

Code.gs PRs first, one at a time: `bash tools/queue/seqver.sh N1 N2`. The rest after them:
`bash tools/queue/afterall.sh N3 N4`. Start each in the background (`run_in_background`).

## Restarts

A container restart kills the scripts and their waits. The integrator's hourly check-in reads `$QUEUE_DIR/nightq.log`
and restarts what is missing.

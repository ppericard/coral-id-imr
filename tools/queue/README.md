# tools/queue: the integrator's merge-queue scripts

Bash and Python helpers that carry PRs to a green merge train (rule W26) while the integrator does other work. They need
`gh`, `jq` and `python3`. Settings, all optional (`lib.sh`):

- `QUEUE_DIR`: log and state directory, outside the repo (default `~/.cache/reefid-queue`; the log is `nightq.log`).
- `QUEUE_REPO` (default `ppericard/coral-id-imr`), `REPO_DIR` (default: the main checkout this folder belongs to).
- `QUEUE_TRAILERS`: commit trailers for `assignver.sh`'s commit (default: none).

Update worktrees go to `.claude/worktrees/` (rule W22, git-ignored).

| Script | What it does |
|---|---|
| `nightq.sh N…` | One PR at a time: merge `origin/main` into it (`uptodate.sh`), wait for every check and Codex's receipt on the head, then `tools/train.py N`. A PR that is red, has a Codex finding, an open thread or a pending VERSION assign is skipped and logged. |
| `uptodate.sh N` | Merge `origin/main` into the PR's branch, settling only the decisions index, append-only files and generated data; anything else aborts ("needs a hand"). Pushes and asks `@codex review`. |
| `assignver.sh N` | Code.gs PR: update it, then assign the sheet VERSION (rule D3). Takes only main's line 1 and `VERSION`, keeps the branch's own `Code.gs`. Pushes and asks Codex (`codex.md`). |
| `seqver.sh N…` | Code.gs PRs one after another: `assignver.sh`, then `nightq.sh`, for each. |
| `chainq.sh`, `afterver.sh`, `afterall.sh` | The same queues, started once the others have finished (`afterall.sh` waits for everything, the version queue first). |
| `prstate.sh N…`, `wait_ready.sh N…` | The PR state line; wait for the checks, then print it. |
| `pushwait.sh DIR BRANCH` | Push once no train runs. |
| `failjobs.sh REF` | The failing jobs of a commit or train branch, with their error lines. |
| `thr.py`, `resolve_block.py`, `resolve_append.py`, `mainver.py` | Helpers: unresolved threads, conflict-block and append-only resolution, main's version line. |
| `codex.md` | The `@codex review` comment with its footer. |

## Order

Code.gs PRs first, one at a time: `bash tools/queue/seqver.sh N1 N2`. The rest after them:
`bash tools/queue/afterall.sh N3 N4`. Start each in the background (`run_in_background`).

## Restarts

A container restart kills the scripts and their waits. The integrator's hourly check-in reads `$QUEUE_DIR/nightq.log`
and restarts what is missing.

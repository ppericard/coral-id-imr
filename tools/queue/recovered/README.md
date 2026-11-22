# Recovered queue scripts (reference code, not reviewed tooling)

Recovered on 2026-11-22 from the Claude Code integrator's temporary workspace at the pause (Linear REE-231, REE-220).
They are the scripts the integrator actually used on 2026-11-21/22 to queue grouped merge trains. **They are kept as
reference: they were never reviewed, tested or run by CI; do not run them as they are.** The reviewed queue tooling is
`tools/queue/` (README there): `nightq.sh`, `afterall.sh`, `afterver.sh`, `uptodate.sh`, `prstate.sh`, `lib.sh`.

| File | What it did | Status |
| --- | --- | --- |
| `trainq.sh` | **The final version.** Waits until each given PR has every check done and green, a clean Codex receipt on its head and no open thread (polls `tools/queue/prstate.sh` every 90 s, about 3 hours at most); then waits its turn behind every earlier `trainq.sh` (ordered by elapsed time, `ps -o etimes`) and while `tools/train.py` runs; then `python3 tools/train.py --dry-run N…` and `python3 tools/train.py N…`, retried up to 4 times when the output says "it moved, try again" or "main moved". | used from 2026-11-22 04:40 Manila |
| `readytrain.sh` | The same readiness wait, then calls `trainnext.sh`. | superseded by `trainq.sh` |
| `trainnext.sh` | Waits while `tools/train.py` runs or an "older" queued script is alive, then trains. **Bug:** "older" was decided by process id; when ids wrapped, newer queues jumped ahead and the oldest starved. | superseded |
| `aftertrain.sh` | The first version: waits for no running train, then trains; no ordering between waiters. | superseded |

**Invocation (as used):** from the main checkout, `bash <path>/trainq.sh 1438 1443` (one train for several PRs), each call
run in the background with a long timeout. **Dependencies:** `tools/train.py`, `tools/queue/prstate.sh` (and its
`lib.sh`), `gh` with REST access, `pgrep`, `ps`, the main checkout at `/home/user/coral-id-imr` (hard-coded).

**Known limitations (observed):**

- No binding of the head that was checked to the head that is trained: a push between the readiness check and the train
  is not caught here (the queue README's open point; see the review's package C).
- Stacked PRs (one built on another) must not share a train: the second fails at GitHub's merge after the first's
  squash (#1398 → #1401, #1403 on 2026-11-22). The script does not detect a stack.
- Several queued scripts running `git fetch` in the same checkout raced ("its fetched head is not X: it moved");
  the retry loop hid it rather than fixed it.
- Ordering is among `trainq.sh` processes on one machine only; nothing survives a container restart.
- The script trusts `prstate.sh`'s text format (the grep pattern) and would silently never fire if it changed.

What a reviewed replacement would need is tracked in Linear REE-220.

# REE-112 placement shrinkage check: the study scripts (recovered, reference)

Recovered on 2026-11-22 from the Claude Code integrator's temporary workspace (Linear REE-231). The study and its
conclusions are `docs/reviews/2026-11-21-placement-shrinkage-check.md` (PR #1380, merged as `05b4879a9` on 2026-11-21
19:57 Manila). **These scripts were not reviewed or tested as tools**; they are kept so the published figures can be
traced and recomputed. They are not wired into CI.

**Engine:** the `core.js` of the PR branch `claude/placement-shrinkage` (method declared at `e3dc326cf`; results
`dc08e7df2`, post-hoc checks `3592f2b2a`, views shown alone `2dbeada99`, the full jackknife `7569e3696`). Every script
loads it from a hard-coded worktree path (`/home/user/coral-id-imr/.claude/worktrees/placement-shrinkage/core.js`):
replace it with a checkout of one of those commits (`core.js` was a single file then; since #1452-#1457 it is built
from `core/*.js`, byte-identical for the same commit).

**Inputs (not in the repository, private):**

- `answers.json`: the sync sheet's Answers tab, read-only through the Sheets connector on 2026-11-21 about 18:20
  Manila (7,445 rows), pseudonymised by `pseudo.py` (player labels P1, P2… by first appearance; the name map is never
  written). The extract itself is **not** kept here (raw player histories stay out of GitHub). To reproduce: read the tab
  again (all columns), then `python3 -I pseudo.py <get_values.json> answers.json`; later rows change the figures.
- `cs.json`: the coral calibration set as it stood then (`calibration-set.json` at the repo root, built 2026-11-18).

**Scripts and commands (as run):**

| Script | Use |
| --- | --- |
| `pseudo.py` | pseudonymise the extract |
| `explore.js`, `counts.js` | orientation and design counts only (never the Right column) |
| `study.js` | the declared method: `node study.js answers.json cs.json out_real.json --only real`; `node study.js answers.json cs.json out_planted.json --only planted --planted 20` (log `planted.log`) |
| `bands.js`, `bandsB.js` | the 2026-11-18 placement model reimplemented: right-band rate at 15/20/25 questions for a rating error s (`node bands.js <tests per cell> <s,s,…>`; outputs `bands_main.txt`, `bandsA.txt`, `bands_sstar.txt`) |
| `extra.js`, `extra.sh` | post-hoc rerun, **added after the results, not declared**: D on the real held-out answers, the planted check with 40 replicates, count buckets (`out_extra_real.json`, `out_extra_planted.json`, `extra.log`) |
| `check2.js` | post-hoc check 2: views shown alone and items as shown (`out_check2.json`, `out_check2b.json`) |
| `jack2.js` | **the corrected jackknife** after Codex's P2 on #1380: a player is removed everywhere (as a rater of every prediction and as a held-out answer), not only from the evaluation; the first version understated the uncertainty (`out_jack.json`) |

Seeds: `study.js` and `extra.js` use their own seeded generator (`rng(seed)`); `bands*.js` use common random numbers
across s. **Outputs kept here are aggregates only** (no player label).

**Reading the results:** the review's own conclusion is that the decision is not identifiable from the available log
(the data cannot pin the true placement error); lowering the 20-answer bar is not justified by this evidence. A
pessimistic case is not a general result. Calibration counts must count the item as shown (a photo alone vs a view set).

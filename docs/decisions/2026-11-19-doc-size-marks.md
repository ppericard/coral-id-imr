# Doc size marks: a warning to check the doc, never a wall; ROADMAP keeps its open items, the decisions index is whole

Date: 2026-11-19. PR: #1254. Rules or docs touched: `tests/docs.test.js` (the marks), `tools/brief.py`, `docs/ROADMAP.md`
(its header and rows), `docs/decisions/README.md` (the whole index), `tools/decisions_index.py`, `docs/ANSWERS.md`.

## Context

The size and line-length budgets came with #1144, the last PR of the docs restructuring planned by the docs audit
([2026-11-18-docs-audit.md](../reviews/2026-11-18-docs-audit.md) 6.2, "keep it from drifting", approved by Pierre on
2026-11-18). The audit had found the two main references grown into changelogs nobody could read: ARCHITECTURE.md 731 KB
and LEARNING.md 738 KB (35 % of `docs/`), one 93,791-byte line holding the sheet script's version history, ROADMAP rows
past 2,000 characters and rows whose own status said Built. The weakness the budgets made up for: nothing kept history,
versions and duplicates out of the living docs (rule W19's "history stays in git" came the same week), and an agent reads
a whole doc into its context. Each budget was the doc's size about 5 % above `main`'s that day, an arbitrary number, and
the test failed past it, telling the PR "never raise the budget by habit". On 2026-11-19 two PRs bent the docs to the
numbers: #1244 moved open items and the figures rows decide on out of ROADMAP into a review file, and #1246 split the
decisions index into the newest 40 rows and an `OLDER.md`.

## Decision

Pierre, 2026-11-19 20:34 Manila: « La roadmap elle n'a pas forcément de raison d'avoir une taille limite si elle est
bien tenue et que [...] elle se retrouve pas avec un historique, avec des versions, avec à l'intérieur. » « Ça n'est
pas une bonne réaction que de déplacer de l'historique vers les fiches de décision pour pouvoir recharger la roadmap. »
« De manière générale, les tailles limites [...] ont été fixées de manière complètement arbitraire. Donc, elles ne sont
pas là pour empêcher de bien travailler. Elles sont là pour lever des warnings en disant « Attention, on est en train de
remplir ces documents-là, est-ce que vraiment on est sûr qu'on veut les remplir ? » Et si vraiment on est sûr [...] et
qu'on les remplit proprement [...], alors il faut augmenter les limites. »

- Every living doc keeps a mark in bytes and in its longest line (`tests/docs.test.js` `DOC_MARKS`). Past it, the test
  passes and prints a `MARK` line: is everything in the doc in its place? If so, the same PR raises the mark. History,
  versions and duplicates leave the doc (rule W19); what belongs there stays.
- The line length is a mark too, the same question: a ROADMAP or index row is one Markdown line, so its length is its
  content's; the mark still shows a line that swallows a history, as the 93 KB one did. AGENTS.md's 160 lines (a short
  core, Q425 B) and STATUS's 100 lines are marks as well.
- One hard limit stays, because its reason is measured and not ours: AGENTS.md at 30 KB, since Codex reads only the
  first 32 KiB of it. The check that every living doc has a mark stays a failure (it is completeness, not size).
- `tools/brief.py` names the docs past their mark at each session start (the short brief's last line), so the
  integrator sees them without reading test output.
- ROADMAP: the open items and figures #1244 moved out are back in their rows (the history it cut stays out), its header
  says what a row holds instead of a byte count, and its mark is raised to 128 KB.
- The decisions index is whole again in `docs/decisions/README.md`: the split had no reason but the budget, and one file
  is what is searched before a question. `OLDER.md` is retired: `decisions_index.py --check` fails while it exists and
  `--fix` deletes it.

## Consequences

A PR that grows a doc past its mark is not blocked; its author reads the doc against rule W19 and raises the mark in the
same PR, saying so. Agents never move content out of the doc it belongs to in order to fit a number. A branch that still
carries `OLDER.md` runs `python3 tools/decisions_index.py --fix` after merging `main`.

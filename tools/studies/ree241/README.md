# REE-241: the judged ease within a family, then within its unit

These scripts and outputs measured the **first build** of PR #1571: a judged photo's prior centred on its **family's**
mean ease. The app now centres it on its **unit's** mean ease (docs/decisions/2026-11-26-judged-ease-within-unit.md).
For a fish family the two are the same, so `replay.py` and `out/replay.txt` hold for the family questions. The opening
orders (`openorder.js`, `ordercmp.py`) and the app-world comparisons (`truth.py`, `metcmp.py`, `owcmp.py`, `out/cmp*`)
measured the family build and are kept as its record, not as checks of the rule in force. Pierre decided on
2026-11-26 that the unit rule ships without an effect simulation; it is measured again once the sea slugs have enough
real answers.

- `replay.py`: the real-log replay (rule L12). Input: the fish answers as REE-240 prepared them, a private extract kept
  outside the repo; its output here is aggregates only.
- `openorder.js`: the opening order of a fresh player, run on a checkout of each arm (`--root`), with the sheet's
  `?stats=1` reply saved to a file outside the repo (`--stats`, private).
- `truth.py`: the app world's true difficulties, from the same saved `?stats=1` reply (private).
- `metcmp.py`, `owcmp.py`, `ordercmp.py`: the comparisons, from `tools/learnsim.js` and `openorder.js` outputs made
  locally.
- `out/declared.txt`: the declaration made before running the family build's simulation.

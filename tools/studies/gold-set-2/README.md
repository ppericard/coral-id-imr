# Gold set 2: the page Pierre was sent on 2026-11-19, and the reader of his answers (REE-8, REE-277)

`revue-photos-2.html` is the review page of gold set 2, committed unchanged (byte for byte the copy Pierre sent back on 2026-11-24, the only survivor: «J'ai le fichier html encore»). French, 42 fish photos from iNaturalist (`medium` images, linked, not stored), each with one judge's pre-judgement: in play, out or doubt, ease, view, light, colours, sharpness, size, count, juvenile, watermark, camouflage. It shows no player, staff or photographer names (checked: species names and judge text only). Not wired into CI.

**The key is lost.** Each photo showed the view of one judge drawn at random among six model/effort configurations (`docs/reviews/2026-11-19-model-effort-combinations.md` §2). The key saying which, the scorer (`score2.py`) and the six outputs lived in a session scratchpad and are gone. I searched the repo (every branch, `git log --all`, `judging/`, the studies, #1211, #1257, the STATUS handovers) and the machine's temporary folders: the six raw outputs are in none of them. At `57e6a909` (the main of the draw, 2026-11-19 14:44 Manila) these 42 photos had no committed code; the codes now in `judging/fish/` come from later passes and differ from the page on most fields, and one config agreeing with a code would not tell the six apart anyway. The key cannot be rebuilt. Pierre's answers still give a true label per photo (the rubric check), but not the comparison between configurations.

**Pierre answers in chat**, field by field, as the page says: «ok sauf 4 (hors jeu : trop flou), 12 (juvénile)»; a photo or field not cited agrees.

**`parse.py`** turns that answer into a table per photo and field (agree, or his words):
`python3 -B -I tools/studies/gold-set-2/parse.py answer.txt [--long]` (`sample-answer.txt` is a made-up one). Check its words column before using it. `test_parse.py` tests it on made-up answers.

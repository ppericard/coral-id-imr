# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-15, about 17:00 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md)** (how the work is run, its handovers, what bites, the open work).

Last checked: reports and events: 2026-11-12 ~09:45 Manila

## Now

Main: sheet script **v143** (#963). Rule 0 is one sentence since #965 (after 17:30 ask Pierre nothing).

- **Merged 11-15** (about 40 PRs, #929-#965): no fish photo hot-linked (#931); fish judging done (#930 #932 #937), one
  judgement per photo (#942); watermark tag and its passes (#956 #961); sharks at 5 photos (#955); IMR lecture credits
  (#939); licence refresh, others only (#936); pCloud backup code (#946); coral and fish stats folded (#882 #940);
  confusion groups B everywhere (#871); fish To do, By difficulty, photo factors (#934 #938 #943); juvenile cover
  exception (#948); common-name rule (#954); Find the X tapped photo (#958); sheet overlay v2 design and steps 1-2, the
  editor (#945 #952 #957); leaderboard tree in chunks (#963); comeback tolerance (#951); fish taxonomy (#959); sea slug
  list and circle 1 (#950); studies: AVIF #933, nudibranchs #935, common names #947, photo memory #944, held-out set #962;
  `sheet_version.py` gate fix (#960); #964 restored docs an integrator merge had reverted.
- **Agents running**: the juvenile progressive path (simulations, long); pCloud backup by upload link (Q380, opens its
  PR now #963 is in); covers avoid watermarked photos (Q379); shared common names (Q381).
- **Queued**: sea slug reference sources and the egg-ribbon fix (Pierre: the Spanish dancer's "juveniles" are egg
  ribbons); the species level app PR (after #963, Q362/Q375/Q376/Q381).
- **Rows 9 and 10** (Q322): still doubled; corrected at their next sync; no hand correction (D8).
- **Kept on branches, no PR (W27)**: admin-signout-seal, level-count-from-log, fish-todo-wip (moot since #934: delete
  when Pierre says), photo-genus-ability, time-weighted-steps.

## Next

Four agents at a time (W27); what is easy to correct afterwards ships:

1. `Code.gs` logic, one PR at a time: the pCloud upload link, then the Analyses machine key, roles step 1, `readStats`
   and the replays reading the stats snapshot.
2. The species level (one unit per species; the tree gate `TREE_SHEET` 143 is in).
3. The sheet overlay's step 3 (circles and pairs per instance, the structure stamp and the replay, Q363).
4. Sea slugs: reference sources, then candidate photos and judging for circle 1 (Q377 targets).
5. The other ROADMAP "Next" rows. Deadline: the domain and repository rename before December 2026 (#886).

## Questions for Pierre

- **Held-out fish photo set (#962), (a)-(e)**: (a) size: 10% per family and genus, min 5, max a quarter (rec.); (b)
  never hold out reference photos nor his own (rec.); (c) probes count like any answer (rec.); (d) silent probes from a
  unit's first questions (rec.); (e) a separate `fish-held.json` (rec.). Details in the note.
- **The reference bonus** (#942): a photo's reference flag and +1 ease belong to its record, not the photo; 423 photos
  judged both ways get one point more when they play as a reference. Align (moves hundreds of eases) or leave.
- **In admin Points** (#959): Diploprion among the Soapfishes or WoRMS's Liopropomatidae; Ferdauia kept as is.
- **Rule D3's wording** (`docs/rules/sheet.md`): "every gate the PR adds or changes" → "adds" since #960.
- Not now (Pierre): the domain, the accounts, the IMR agreement, a second person (brief points 1, 2, 6, 8).
- Decided 11-15: Q356-Q381 (STATUS of 11-15 noon for Q356-Q374; Q375 the board tree in chunks; Q376 common names:
  IMR name first for IMR players, any listed name credits the species, regional names typed, inferred genus names;
  Q377 sea slugs yes to all six; Q378 comeback option D; Q379 covers avoid watermarks; Q380 pCloud by upload link;
  Q381 shared common names allowed, iNat default for non-IMR players).

Last question number: Q381

## Pierre's hands

Actions only Pierre can do.

- **pCloud backup, once the upload-link PR is merged**: Extensions › Apps Script › Project settings › Script
  properties › add `PCLOUD_UPLOAD_CODE` (the part after `code=` of his upload link); reload the sheet; Reef ID › Back up
  to pCloud now. Steps in `docs/BACKUP.md`.
- **In the admin, when he wants**: Photo review › Light proposals (incl. 38 "One judgement per photo") and › Cover
  proposals, then Publish; "Juvenile: confirm as cover?" on Damselfishes and Boxfishes (#948).
- **For an IMR trainer**: the three Q354 points in `points.json` (admin Points).
- Check the "Coral ID analyses" token's type and the R2 token's scope; **delete his rewrite backup** when he says so;
  restrict the Coral Finder PDF's sharing on his Drive.
- From before: "CF book: off" + Publish; one player's starting answer back to "I'm at IMR" with #726 (Q228); delete the
  morning report scheduled task from claude.ai; the 8 unsure fish candidates and the expert analyses' photos (11-06);
  covers for the 11 fish entries with no reference-level photo.
- **Astrea and Anacropora** photo hunt (links: `git show 4c8251a:docs/STATUS.md`); **protect `main`**; renew the admin
  GitHub token before late January 2027; look for the IMR benthic deck.

## Parked after hours

Ideas Pierre dictated after 17:30, kept for the morning.

- None.

## Last stop

2026-11-15 ~17:00 Manila, integrator, with Pierre through the day: the brief's questions walked one by one (Q356-Q381),
about 40 merges; four agents work on into the night.

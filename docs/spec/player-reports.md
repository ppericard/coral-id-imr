# Players' reports and Pierre's flags

How a player reports a problem from the app, how the report reaches the sheet and the admin, and what Pierre can do
with it there; and his own ⚑ flags on photos. This is the specification of what the code does now; why each part was
decided is in [docs/decisions/](../decisions/README.md) and the PRs. Nothing is ever changed automatically from a
report. The admin's To do, where reports are listed with the other items, is
[admin-players.md › Inbox › To do](admin-players.md#inbox--to-do); the thanks a player gets for a handled report is
[achievements.md › Your feedback helped](achievements.md#your-feedback-helped).

## Sending a report (`sync.js`)

- **In every game** (the Quiz, the Custom quiz, the Look-alike duels, Memory, Reveal), once the answer is out, the
  feedback shows a discreet "⚑ Report a problem" (`repBtn()`; Lab games call it if present; in the quiz and the Lab's
  photo games it is a line of its own on the short feedback sheet, under the decisive line, never behind More).
- **Elsewhere**: "⚑ Report" in the caption of any enlarged photo (the lightbox, not while a game hides the answer),
  "⚑ Report a problem with this sheet" at the bottom of a sheet, and "Send feedback" at the end of the ? help of every
  page and on About and credits.
- It opens a small dialog (`reportDialog()`) whose reasons depend on where it comes from (`REP_WHY[kind]`, in the current
  subject's words: `SUBJECTS` `one` and `several`): from a game, Wrong answer (with a "Right genus, if you know" field,
  or "Right family" with Fish on, its suggestions the names of the subject's game units as players read them, a fish
  entry's IMR name, never its teaching id), Several corals (or "Several fish species"), Bad photo, Other; from a photo,
  Wrong genus, Several corals, Bad photo, Other; from a sheet, Wrong information, Bad photo, Other; from a page, Wrong
  information, Bug, Suggestion, Other. Then an optional note, and "Your name" when the player is not signed in to the
  sync.
- A report carries the photos of the question (one observation), the expected unit, the answer given, the game, and
  the page it came from (`w`, the sheet's column `Where`). Send feedback from a game carries the question's unit and
  photos too (`app.js` `fbCtx`, `quiz.js` `qNow`).
- Reports queue in `localStorage` `reefid-reports` and are sent by `sendReports()` (on send, at start-up and when back
  online) to the sheet script, each with who sent it (the sync account or the name typed, so a report retried after
  another player signs in is never credited to them); an older script leaves them queued.
- **A screenshot or photo** (optional, one a report; "Screenshot or photo" under the note): offered only from the
  sheet script version that keeps it (`REPIMG_SHEET`, rule D4). The app reduces it on the phone (about 800 px, JPEG,
  no EXIF or GPS) and sends it with the report to the sheet's `Report images` tab; it is held in memory, never in the
  queue, so a report sent offline goes without it and the dialog says so. Pierre reads it when he handles the report
  and it is then deleted: [spec/sync.md › Report images](sync.md#report-images).

## In the admin (`reports.js`, admin only)

To do (views All and Reports) lists them first ("Reports and feedback", `renderTriage` `repCard`), with the reporter's
name (a `?` after it: not verified by a sync code).

**One action bar on every report**: its **status**, one click each (Undo is the safety net): **Done** (resolved;
`curation.json` `seen` `rep:<id>`, so the player who sent it is thanked), **Stand-by** and **Dismiss** (`curation.json`
**`reps`** `{id: 'wait'|'drop'}`, never in `seen`: no thanks), and Reopen once handled; through the draft and Publish
(Publish counts them as report statuses). Open reports come first, Stand-by below them (muted), the handled and the
dismissed folded with their counts (`REP_STATUS`, `repStatus`, `repStatusSet`, `repsOrder`; `tests/reports.test.js`).
Then the tools the report carries what they need for:

- **Journey** (the reporter is on the players' list: their journey in the report's subject);
- **Open genus / Open family** (the unit's admin page: a coral genus page, or a fish family's Photos › Tree page, also
  for a fish genus or species id);
- **Open page** (the app page it was sent from);
- on a report with no photo, **Attach a photo** (the photos of its unit, a unit picker first when it names none; the
  photo picked shows with its tools, kept in this tab only, never saved).

**Its photos carry every tool of their page**: a coral photo its genus page's tile (`coralRepTile`, `tile0` without the
drag handle: quality, growth form, view, ★ Cover, Remove, Crop with the rotation, Not this genus); a fish photo its
family page's, one renderer and one binder for both (`fishTile`, `bindFishTiles` in `admin.js`; `fishRepTile` reads
whether it is in play, featured or the cover as the family page does, `fuFam` once per draft, under the species it is in
play for and that species' family, `fishFamOf`, a photo moved with Not this into another family included): Feature,
★ Cover, Remove, Not this (a candidate photo), Crop (with the rotation, `admin-fish.js` `fishCrop`), Tags (its Ease,
phase and the rubric's tag rows and flags, `fishRows` / `bindFishRows` as on the fish Candidates card, unfolded on that
tile only, which on a family page then takes a whole row on a phone and two columns from 600 px), enlarge in place,
plus Open in Tree. A count of Other species in view (code `m`, several species on one photo; the Count row reads One
fish, Same species, Other species in view, Unclear, each with its tooltip) or Unclear set on a photo in play also takes
it out of play in the same Undo step (rule P3: the game never plays such a photo by itself, `autosort.js` `treeSure`,
`tools/fish_game.py` `judged_sure`). A fish flag's tile the same, the tools that take the photo out clearing the flag,
plus Done.

**What a report is about**, whatever it was sent from: `reports.js` `repCtx` (its source: game, photo, sheet, marks,
page; its unit, the expected one, else the unit whose sheet its page shows: a fish species id the script does not keep,
a feedback sent from a sheet; its photos; its page; its subject: the unit's, its photos', its page's, or none). A reason
names the organism in its subject's words (`repWhyText`: "Several corals", "Several fish species", "Wrong family", as
the player's dialog put it; the sheet keeps the key, so old reports read the same).

**The list follows the subject switch** (rule A4): each side lists its subject's reports and those about no subject
(Home, About, the leaderboard), and counts its own open ones (the switch, the Inbox, To do and its views: `repsOpen(S)`,
`todoHere`).

## Pierre's ⚑ flags (`flag.js`)

Separate from the reports, and admin-only. One brick for every subject: it names a photo by the `data-f` its page puts
on its `<img>` (the game, the lightbox, remote thumbnails), else by its file under `img/`, and asks the subject's data
what that name is (`app.js` `UNITS` `photo(f)`, the current subject first): its id in that subject's curation (fish:
`core.js` `treePid`) and what the flag records (corals: genus and view; fish: the photo's name, its unit, species and
view). `localStorage` `reefid-photo-flags` holds `{f: id, s: subject, ..., where, at}`; the admin's `importFlags` puts
each into its subject's part of `curation.json` (`SUBJECTS` `admin.cur`: `flag` at the top level for the corals,
`fish.flag` for fish), never another's, and To do › Reports lists the subject on screen's flags. A fish flag's × writes
`fish.exclude` under the photo's name (`treePhotos` drops its other copies by `treePid`), its Remove `fish.seen`; each,
and Done, clears it.

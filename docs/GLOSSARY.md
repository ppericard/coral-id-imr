# Glossary

The words this project uses with a meaning of its own, each with where it lives. Where one word has several meanings,
each is listed. Rule IDs (C3, D4…) are in [the rules index](rules/README.md#the-index).

## The game

- **Subject**: one group of organisms the app teaches: corals, reef fish, sea slugs. One engine teaches all of them;
  each subject has its own progress. Defined in `core.js` `SUBJECTS`.
- **Unit**: what a question asks the player to name, and what progress counts: a coral genus, a fish family, genus or
  species, a sea-slug genus. Defined in [docs/rules/README.md](rules/README.md); never hard-code how many there are
  (rule U8). The per-subject definitions are `app.js` `UNITS`.
- **Taxon**: a rank of the taxonomy itself (family, genus, species), when a rule means the taxonomy and not the game.
  Also in [docs/rules/README.md](rules/README.md).
- **Slate**: the units of a subject's path. For corals it is IMR's survey slate: the numbered genera IMR surveys, plus
  the starred look-alikes, plus Millepora. `app.js` `slateGenera()` returns the current subject's slate.
- **Starred genus (★)**: a coral genus on the slate that IMR does not survey, there to be told apart from a surveyed
  look-alike. It follows its look-alikes (rule L5).
- **Bonus genus**: a coral genus beyond the slate that a player adds by choice (rule L6). Listed in `core.js` `BONUS`.
- **Circle**: a ring of content around the core, for fish and sea slugs. Circle 1 is the core the IMR course teaches;
  the later circles widen it and open later. Each unit carries its `circle` in `fish.json` and `seaslug.json`; the
  admin's content editor can move a family between circles.
- **Look-alike pair**: two units easily taken for each other. A record's `look` lists its look-alikes and `lsrc` the
  source of each pair. Learn › Look-alikes shows them side by side. A pair is *declared* (named by IMR or a source) or
  *data* (found in the players' answers); the admin can add or withdraw a pair (`curation.json` `content`).
- **Duel**: a two-choice question between the units of a look-alike pair.
- **Again**: a two-choice question "A or B?" that comes a few questions after a mix-up, between the two units that
  were confused (`quiz.js` contrast queue).
- **Wink**: a rare surprise card with an unmistakable animal (a whale shark), a light bonus and not ID training. Fish
  only; `quiz.js` `WINK`.
- **Sheet** (Learn): the page of one unit with its photos, ID tips and look-alikes; `learn.js` `viewGenus`. Not the
  sync sheet below.
- **Feedback sheet**: the panel after an answer: the verdict, the photo's own species line and one decisive line;
  the rest sits behind "More" (rule C3).
- **Mastery level**: the named step of a unit on the learning scale: Snorkeler, Open Water, Advanced, Divemaster,
  Instructor. `model.js` `MASTERY`. Instructor is *learned*: the silent mastery exam is passed (rule L9).
- **Global level**: a player's ability on the scale of photo difficulty, one number per player, shown once enough
  answers are in. [LEARNING.md](LEARNING.md) "What each number measures".
- **Elo**: the rating used for two things. The *ability Elo* is a player's, per unit and overall (`model.js`); the
  *photo Elo* rates each photo from every player's answers and is computed by the sheet script (`core.js` `eloOf`).
  After each answer both move by how far the result was from the expected one.
- **Shaky**: a unit whose expected success on a typical photo is low, so it opens nothing new yet
  ([LEARNING.md](LEARNING.md) "What each number measures").
- **Phase** (`ph`): the life or colour stage a fish photo shows, such as juvenile, in the fish and sea-slug photo
  records.

## Content and photos

- **IMR lecture**: the Institute for Marine Research's course material. Lecture notes and photos (`course` in
  `data.json`) are never contradicted or corrected (rule C1).
- **Coral Finder**: the identification book whose criteria and look-alikes are cited as a source; none of its photos is
  used.
- **ID tip** (`qt`): a short line telling a unit from the others (rule C3).
- **Coral ID Key**: the Identify page: tap the clues you see, get a ranked shortlist. `proto/idkey.js`.
- **Candidate**: a photo found by a tool and waiting for Pierre's decision in the admin. Waiting coral candidates are in
  `cand.json`, fish in `fish-cand.json`, sea slugs in `seaslug-cand.json`.
- **In play**: a photo the games draw from. The fish and sea-slug photos in play are in `fish-game.json` and
  `seaslug-game.json`.
- **Curation**: Pierre's choices on photos and content, kept in `curation.json` and written only by the admin's
  **Publish** (rule A1).
- **Judging pass**: an outside agent's review of photos against a rubric, imported as suggestions (`judging/`,
  [judging/BRIEF.md](../judging/BRIEF.md)).
- **Presence rule**: a species counts only where it is confirmed near Dauin or in the Philippines (rule C8,
  `tools/presence.py`).
- **Point**: a discrepancy between sources, or a question for the trainers, kept for Pierre to settle (rule C5,
  `points.json`).
- **Report**: a player's message sent through "Send feedback"; Pierre handles it in the admin.
- **R2**: the Cloudflare bucket that hosts the photos; the app falls back to a photo's online original.
- **Instance**: the organisation the content is built for (today IMR); `tools/instance.json`.

## Sheet and data

- **Sync sheet**: the Google Sheet that holds players, answers, events and reports. The **sheet script**
  (`tools/sync/Code.gs`) is its Apps Script; the app talks to the sheet only through it.
- **Answer log**: every answer as a row in the sheet. It is the reference for progress (rule D9).
- **Replay**: recomputing a player's progress from their answer log with the app's own engine, which the sheet script
  embeds from `core.js`. Done when a progress rule changes (rules D5, D6).
- **Rules version**: a number appended to `core.js` `RVS` whenever a change moves a player's progress (rule D5).
- **Gate**: a feature of the app that turns on only once the sheet script reports a version at least N (rule D4); the
  constants are named `*_SHEET`.
- **Changes file**: the entry a PR adds in `tools/sync/changes/` when it changes the sheet script; the integrator
  assigns the version at merge (rule D3).
- **Release branch**: the branch the sheet script installs itself from; only the merge train moves it
  ([decision records](decisions/README.md)).

## Working here

- **Integrator**: the main agent of a session. It starts subagents, checks their work and merges (AGENTS.md "Working
  mode").
- **Merge contract**: the conditions under which the integrator merges a PR on its own (AGENTS.md "Working mode").
- **Merge train**: a temporary branch that holds `main` plus the ready PRs; the checks run on it once and the PRs merge
  from it (rule W26, `tools/train.py`).
- **Rule 0**: after 17:30 Manila time the integrator asks Pierre nothing (AGENTS.md).
- **Decision record**: a short file in [docs/decisions/](decisions/README.md) that keeps why something was decided
  (rule W19).
- **Slot** has three meanings. The **machine slot** limits heavy runs on the shared computer (rule W24,
  `tests/slot.js`). A **photo slot** is a place a photo can fill: a view of a genus, the sheet, the games, the Coral
  ID Key (`core.js` `applySlots`). A **text slot** is a piece of a sheet's text the content editor can reword
  (`curation.json` `content`).
- **Codex review**: the automated review each PR gets after `@codex review` (rule W23).
- **Smoke**: a Playwright test that drives the real app in a browser (`tests/*.smoke.js`).

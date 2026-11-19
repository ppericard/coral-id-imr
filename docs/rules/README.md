# Pierre's standing rules

One file per theme, each rule under its stable ID; the index of every rule is below. What every agent holds in every
task (the merge contract, how to work with Pierre, the rules that apply to any task) is the core,
[AGENTS.md](../../AGENTS.md). A rule says what holds now; why it was decided, and in whose words, is in a record under
[docs/decisions/](../decisions/README.md) (rule W19). Retired IDs are never reused: W2 (into W7), W5 (into W19), W20
(to [spec/photos.md](../spec/photos.md) "No more candidates is no more candidates").

## Words the rules use

The rules are written for every subject (corals, fish…) unless they say otherwise.

- **Unit**: what a question asks the player to name, and what the progress counts: a coral genus; a fish family (the
  identification key's family labels, not always taxonomic families), genus or species. "The subject's units" are all
  of them for the current subject.
- **Taxon**: a rank of the taxonomy itself (family, genus, species), when the rule means the taxonomy, not the game.
- **Corals:** / **Fish:** at the start of a rule or a part of one: it holds for that subject only.

## The index

**Content** ([content.md](content.md))
- **C1** Never contradict or "correct" the IMR course.
- **C2** Never invent categories or information; every clue carries its source.
- **C3** An ID tip is short and simple for anyone; detail goes on the sheet; the answer's feedback shows one decisive line, the rest behind "More".
- **C4** Corals: growth form is an entry point only: rank, never filter or group genera by it.
- **C5** Discrepancies between sources go to `points.json` (admin Points); never settle them.
- **C6** ID cues cite only species present at Dauin or in the Philippines.
- **C7** iNaturalist API: about one request a second, batched, a User-Agent, paced retries.
- **C8** Presence: one rule for every species, a species with no name yet by its label (`tools/presence.py`).

**Photos** ([photos.md](photos.md))
- **P1** A reference photo is chosen on its objective qualities (reference look, judged ease), never by source, for every subject; reference-route photos enter first.
- **P2** Corals: three views per genus (colony, close-up, corallites); never duplicate a photo to fill one.
- **P3** No photo of several corals or fish species in games; no book photo anywhere.
- **P4** A one-photo question shows one observation; a multi-photo format shows different observations.
- **P5** Credits in the lightbox and after the answer, never giving the answer away.
- **P6** Corals: no photo of a coral skeleton anywhere.

**Learning** ([learning.md](learning.md))
- **L1** Time between sessions never decays progress, mastery or ability.
- **L2** A wrong answer counts against both units.
- **L3** Adaptive difficulty, no level selector; every account counts, Pierre's included.
- **L4** One progression path: every game draws from `unlocked()`; only the quiz opens units.
- **L5** Corals: starred genera follow their look-alikes.
- **L6** Corals: Millepora counts, bonus genera opt-in; no unit-specific code (rule S1).
- **L7** Answer choices get harder gradually.
- **L8** Achievements reward learning, never time.
- **L9** Learned = the silent mastery exam.
- **L10** The first-launch question sets variables, never a path.
- **L11** The simplest algorithm that works; checks proportionate to the change, valid statistics, a hard cap of 40 minutes of compute, level 3 never on this machine.
- **L12** Check algorithm changes on the real log too.
- **L13** Compute once, not on phones.
- **L14** Visual recognition and side-by-side comparison beat theory.
- **L15** First goal: ID on ideal photos.

**UI** ([ui.md](ui.md))
- **U1** Declutter: no page titles or intros; explanations behind the shared "?".
- **U2** Every game fits one screen in every state.
- **U3** 1280 px, fixed header, one palette, DESIGN.md tokens only.
- **U4** Exactly 3 size classes, mobile-first; touch by media, never width.
- **U5** No third-party scripts; a new host goes into the CSP.
- **U6** No range sliders (swipeable photo strips are fine); visual beats text.
- **U7** Settings removed on purpose stay removed.
- **U8** Never hardcode the number of units.
- **U9** Sign-in never on My progress.
- **U10** Greet by first name only (`firstName()`).
- **U11** Questions to the player come at a natural break.
- **U12** Home = two doors.
- **U13** Lab prototypes graduate only with Pierre's OK.
- **U14** Players can report a problem anywhere.

**Admin** ([admin.md](admin.md))
- **A1** Never change `curation.json` automatically or in a PR; an agent may propose a change.
- **A2** The admin is minimal: no text on the page, one click with Undo, confirm only bulk.
- **A3** The top level stays short: a new page goes into an existing tab or group first.
- **A4** One subject switch covers every admin page.
- **A5** Every analysis says what it can conclude.

**Subjects** ([subjects.md](subjects.md))
- **S1** Shared and modular by default: one engine, no special case for one unit or one subject; an exception is declared and named in one place.
- **S2** Fish names: the IMR PDF's, WoRMS beside; Pierre's Needs ID confirms nothing.
- **S3** Fish groups come from the regional identification key.

**Sheet and data** ([sheet.md](sheet.md))
- **D1** Tests never reach the real sheet.
- **D2** Player names: real in chat, anonymous in the repo.
- **D3** A `Code.gs` or `core.js` change carries one changes file; the integrator assigns `VERSION` at merge.
- **D4** The app never gets ahead of the sheet script.
- **D5** Every progress-rule change appends a rules version.
- **D6** A recalculation of progress is silent, a learned mark taken away included.
- **D7** A deleted account leaves nothing in normal operation.
- **D8** Every leaderboard follows a progress recalculation, for every player, at once.
- **D9** The answer log is the reference for progress: trust it rather than the device.

**Working with Pierre, and shipping** ([ship.md](ship.md))
- **W1** Everything produced is in English; only the chat with Pierre is in French, and he is "tu".
- **W3** Alpha: no backward compatibility.
- **W4** Many prototypes first; Pierre judges by taps.
- **W6** No work sleeps on a branch; a PR waiting for Pierre is opened ready with `needs-pierre`.
- **W7** Work autonomously; fix by default; never re-ask what was answered.
- **W8** Independent reviews get an open mission that questions our choices.
- **W9** Latest stable version of tools.
- **W10** Never list Pierre's curation choices item by item; remind once, never nag.
- **W11** Say what you checked; a guess is labelled.
- **W12** Branch from a fresh `main`; run it locally; add a test with the logic.
- **W13** Format JS and CSS with Prettier 3.10.1.
- **W14** The fast tier before each push, the full tier on CI.
- **W15** Never edit a version number: the deploy stamps them.
- **W16** Corals: write `data.json` only with `tools/datajson.py`.
- **W17** Check visually with Playwright, light and dark.
- **W18** A PR from the template, squash-merged; merge `origin/main` into it, never rebase or force-push.
- **W19** Docs in the same PR; a decision carried out gets a record; ideas not built go into ROADMAP; no history in the docs.
- **W21** One consistent naming.
- **W22** A worktree each, one smoke at a time; one open PR per agent.
- **W23** The review loop on every PR; never re-run a failed job.
- **W24** Every heavy run takes the machine slot; keep 5 GB free and clean up behind you.
- **W25** Use the quota with care, never at the cost of the result.
- **W26** Every PR merges through a green merge train (`tools/train.py`), alone or with other ready PRs.
- **W27** No two open PRs on the same sensitive file; two Codex rounds, then cut the scope.

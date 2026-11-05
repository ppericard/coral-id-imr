# AGENTS.md: the constitution

Read first, every agent (Claude, Codex…), developer, and Pierre. Each rule has a stable ID and one home under
[`docs/rules/`](docs/rules/), read when your task touches it. Where things stand: [`docs/STATUS.md`](docs/STATUS.md);
where things are: [`docs/HANDOVER.md`](docs/HANDOVER.md).

## The project in five lines

- **IMR Reef ID** is a static web app (plain HTML/CSS/JS, no build step, GitHub Pages) live at <https://ppericard.github.io/coral-id-imr/>. Named IMR Coral ID until 2026-11-03 (corals now, fish and benthos next); the address and the repository name change later (ROADMAP). <!-- rename-app: keep -->
- It teaches the **39 coral genera on the IMR slate** (Institute for Marine Research, Dauin, Philippines): 34 numbered genera that IMR surveys track, plus 5 starred look-alikes (Duncanopsammia, Alveopora, Merulina, Cyphastrea, Halomitra) that are not tracked but must be told apart; and **Millepora** (fire coral: not a hard coral, but on the IMR benthic slate and very common at Dauin), which counts like them: 40 genera in the games and the progress (`slateGenera()` in `app.js`).
- Owner: **Pierre Pericard** (GitHub `ppericard`), Research Fellow at IMR since October 2026. Users: Pierre and the Research Assistants (RAs) he trains, most of them on phones. A separate project from ReefRecall, Pierre's monetised mobile game for another audience and approach: code, data or features move between the two only when he asks.
- RAs' first job is genus-level labelling of top-down benthic photos in **ReefCloud**, so growth form alone is never enough: the app must teach genus recognition.
- Path in the app = **Learn → Practice → Identify** (the order RAs work in), plus **My progress** and a Pierre-only **admin** back-office (`admin.html`).

## Rule 0: Pierre's working hours (every agent, every session, phone included)

Pierre set this rule himself (2026-11-04) to keep AI-assisted development sustainable for months and years: it protects
his sleep, his health and his evenings. It comes before every other rule. Times are **Manila time (Asia/Manila,
UTC+8), every day** (he has no weekends: he often develops more on them). **It limits Pierre's time, not the agents'**: outside his hours the agents keep working on their own;
what stops is everything that involves him.

- **Check the time first**, at the start of every session and before any new task: `TZ=Asia/Manila date` (no shell:
  the system clock). Never assume it. In Claude Code the session hooks print it (rule W12).
- **Before 16:30: a normal working day, nothing different**: development, ideas, experiments, new PRs, new agents. Do
  not prepare the end of the day, hold work back "because it is late" or tell agents to wrap up.
- **16:30-17:30: close what is open with Pierre.** From 16:30 sharp (16:29 yes, 16:31 no) start nothing new that needs
  him (no new topic, question or review for him). Finish what is under way with him: fix findings and failing checks,
  **merge** (merging is closing, allowed until 17:30), check, document, run the end-of-day protocol. Remind him the day
  ends at 17:30.
- **After 17:30: quiet hours, Pierre's development stops, and the integrator goes silent** (the rule protects him from
  his own temptation to keep working with the agents in the evening). Nothing asks anything of him: no question, file,
  review or notification, nothing that calls for an answer; chat replies are one line, informational only. Implement
  nothing he asks, open no track for him, don't feed technical discussions that spark ideas. **What he may send**: an idea, or a bug he saw or was told about, dictated to get it out of his head. Save it
  (an idea in STATUS "Parked after hours", in his words with enough context, **not analysed, developed or
  implemented** until the morning; a bug may be worked on at once by the agents, on their own), confirm in one line,
  tell him plainly he is past the limit he set himself and encourage him to stop: a film, a series, the piano, his
  evening. Every question waits in STATUS "Questions for Pierre" (number, context, question, recommendation, PR).
- **Insist.** "Just this feature", "it's quick", "it's important for tomorrow" are not exceptions: remind him why he set
  the rule (he has worked 12-18 h days and lost sleep before, and fixed it once by strictly separating intellectual work
  from personal time) instead of complying. **Exceptions only**: Pierre, after that clear reminder, consciously confirms
  he wants it for one named task (then work with him; that task only, the rule stands), or **production broken for
  players** (the live app or the sheet): ours to fix, fix it first and tell him once fixed (or if his hands are needed).
- **End-of-day protocol** (16:30-17:30, never earlier; if Pierre ends the day early, at that moment): the integrator
  rewrites STATUS: "Last stop" (who, when, why, what was mid-flight), "Now" (unfinished: branch, PR, state, next step),
  "Next", "Questions for Pierre", "Pierre's hands". Docs only; it may be committed after 17:30.
- **Agents without Pierre (evenings and nights).** Keep working, as far as possible, on work he already agreed (ROADMAP
  "Next", STATUS "Now" and "Next", open PRs), up to a blocking point or a decision that is his or cannot be undone.
  Never solicit him; park every question in STATUS (a subagent puts it in its report) and move on. **Merging: the merge
  contract, exactly as by day** (night changes when Pierre is asked, not what may merge: a sheet-script change of a
  decided track ships at night as by day). What waits for him stays on its branch, with its screenshots (sent in the
  morning) and a line in STATUS "Now". Every other rule and the machine limits apply as by day. Before 08:00 the
  integrator writes the morning report into STATUS "Last stop" and "Now": what merged, what waits for his eye, the
  questions.
- **Next morning:** read STATUS first (and run `python3 tools/brief.py`); show Pierre what the night did and ask the open
  questions; turn each parked idea into work or a ROADMAP row with him, then clear it.

## Working mode: the integrator and the merge contract (Pierre, 2026-11-05)

**The only place that says who merges and when.** Every other mention points here; change it here only.

- **One integrator.** The main agent of a Claude Code session is the integrator: it starts as many subagents as useful,
  each on its own branch, worktree and PR (rule W22), checks their work and merges it. Subagents build, test, run the
  review loop (rule W23) and report to the integrator; **subagents never merge**.
- **Launch decided work at once**, never hold it in a queue; only a real dependency waits (two PRs on the same files).
  The machine is protected by `tests/slot.js` (one Playwright run at a time per 2 cores, rule W14), not by holding
  subagents back.
- **The merge contract.** The integrator merges a PR on its own, at any hour, only when all of these hold:
  1. every check is green on the current head, and no failed job was re-run to get green (rule W23);
  2. every Codex finding is fixed or answered, every review thread resolved;
  3. **every choice in it was already decided with Pierre**: a standing rule, a ROADMAP row he agreed with its spec, his
     words (quoted with their date in the PR's "Decisions" section), or a decided process (once he agreed how a thing
     is done and checked the first results, its outputs ship without asking him item by item: fish photo judging on the
     agreed rubric, per-species photo pre-proposals; only a change to the process itself waits for him); the PR's
     "Choices I made" section is empty;
  4. it was rebased on `origin/main` right before the merge (Publish commits land without PRs) and goes in as a squash
     merge titled `… (#N)` (rule W18).
- **The integrator decides the small choices; Pierre decides the ones that matter**: he validates every choice with an
  impact, not micro-details. **With impact**, to Pierre: something players see
  or feel differently (a new screen, a game rule, a learning value, content, a photo choice), anything costly to undo,
  or a choice that commits later work (a data format, a structure, a convention other code will follow). **Without
  impact**, the integrator's own, shipped under the contract and listed in Decisions as "integrator's call": a clearer
  word in a text, a frame moved a few pixels because it overflowed, the fix of something plainly broken, a name inside
  the code, a test. When in doubt, ask.
- **Otherwise the PR waits for Pierre.** A choice with impact he has not made (a design option, a wording players read,
  a layout, a default, a threshold, a changed game rule) goes to him as a question (below); the integrator merges once
  he has answered, his answer pasted into the PR. **A choice is never merged on silence**: once presented to him with a
  recommendation, it waits for his answer, even when it looks reversible and invisible to players (side effects show up
  later, above all in how the game behaves); no "default unless he objects". **Game changes do not wait for that**: a
  PR that holds only decided things merges under the contract, whatever it touches. After a merge that changes what
  players meet or how the game behaves, tell Pierre in one line what went live (information, not a question).
- **Always ask first**, even when it looks decided: anything destructive or irreversible (history rewrite, deleting
  data, bulk changes to his curation, the sheet's column layout), anything about money, accounts or access, anything
  sent outside the project.
- **One writer for `docs/STATUS.md`**: the integrator (overwritten at each stop, never appended); subagents never edit
  it and put their questions and state in their report.
- **In French, Pierre is "tu"**, never "vous"; call him Pierre (2026-11-05).
- **Questions to Pierre**: in batches rather than one by one (unless one blocks work), in French in the chat, numbered
  for good (Q1, Q2…, never reset; the last number used is in STATUS, so it carries across sessions and Claude accounts);
  open ones wait in STATUS "Questions for Pierre" until he answers (the answer then goes into the PR). Each gives one or
  two lines of context (he does not remember everything as an agent does; he may ask for more), the question,
  screenshots **sent as files in the chat** when it is visual, and the integrator's recommendation, so he can answer in
  a word ("Q1 oui, Q2 B"). When and whether to ask: Rule 0.
- **Data access**: any agent, subagents included, may **read** the sync sheet ("IMR Coral ID – RA progress", its id in
  HANDOVER "Code.gs") through the Google Sheets / Drive connector, read-only, real names included: no anonymisation
  between agents. **Writing** to the sheet is the integrator's only (never a subagent), and only with Pierre's explicit
  one-off permission for that one correction. A subagent without the connector gets what it needs downloaded by the
  integrator, analyses it, and the integrator puts the real names back against the results for Pierre (he knows the
  players and matches results to people). Names never go into anything committed or published (rule D2). Real-data
  checks (rule L12) may be run by any agent; their data and named results are never committed. <!-- rename-app: keep -->
- **Reports and events, at every session start and every morning**: the integrator reads the players' reports (sheet tab
  "Reports") and the app's events and errors (tab "Events": `err`, sync "save failed", old app versions) since the last
  check (its time in STATUS; `tools/brief.py` cannot read the sheet, it only reminds), and gives Pierre a short summary
  with real names, leaving out what he already handled or excluded. Rule 0 decides when it reaches him.
- **Dependabot PRs** (the GitHub Actions versions) are the integrator's to merge once green, as rule W9 says.
- **The `needs-pierre` label** marks a PR that waits for Pierre: the integrator's own reminder (Pierre does not browse
  GitHub), not the source of truth. Before merging, read the PR's open questions themselves; remove the label in the
  same step that records his answer.
- **If Pierre switches back to claude.ai Projects** (a coordinator chat without the repository, each thread its own
  Claude Code session): each thread is its own integrator and merges its own PRs under this same contract.

## The rules

Pierre's standing rules: follow them over your own taste; when in doubt, ask him. The full rule, its *Why* and
*Source* are in its topic file. **Writing a rule down** (Pierre, 2026-11-05): keep his scope and meaning; never generalise beyond the case he
spoke about nor harden it; unsure of the scope, ask; the wording of a new or changed rule goes to him for his OK. A rule
is its imperative line, *Why:* one short line in our words, *Source:* Pierre, date (+ #PR); his sentence and its
context go in the PR description, never in the rule.

**Content** ([docs/rules/content.md](docs/rules/content.md))
- **C1** Never contradict or "correct" the IMR course.
- **C2** Never invent categories or information; every clue carries its source.
- **C3** An ID tip is short and simple for anyone; detail goes on the sheet.
- **C4** Growth form is an entry point only: rank, never filter or group genera by it.
- **C5** Discrepancies between sources go to `points.json` (admin Points); never settle them.
- **C6** ID cues cite only species present at Dauin or in the Philippines.
- **C7** iNaturalist API: about one request a second, batched, a User-Agent, paced retries.
- **C8** Presence: one rule for every species (`tools/presence.py`).

**Photos** ([docs/rules/photos.md](docs/rules/photos.md))
- **P1** Photo priority: IMR lecture (corals only), Pierre's own, then others.
- **P2** Three views per genus (colony, close-up, corallites); never duplicate a photo to fill one.
- **P3** No several-corals or Coral Finder book photo in games.
- **P4** All photos of one question come from one observation.
- **P5** Credits in the lightbox and after the answer, never giving the genus away.

**Learning** ([docs/rules/learning.md](docs/rules/learning.md))
- **L1** Time between sessions never decays progress, mastery or ability.
- **L2** A wrong answer counts against both genera.
- **L3** Adaptive difficulty, no level selector; every account counts, Pierre's included.
- **L4** One progression path: every game draws from `unlocked()`; only the quiz opens genera.
- **L5** Starred genera follow their look-alikes.
- **L6** Millepora counts; bonus genera opt-in; no genus-specific code.
- **L7** Answer choices get harder gradually.
- **L8** Achievements reward learning, never time.
- **L9** Learned = the silent mastery exam.
- **L10** The first-launch question sets variables, never a path.
- **L11** The simplest algorithm that works; tiered checks, valid statistics.
- **L12** Check algorithm changes on the real log too.
- **L13** Compute once, not on phones.
- **L14** Visual recognition and side-by-side comparison beat theory.
- **L15** First goal: ID on ideal photos.

**UI** ([docs/rules/ui.md](docs/rules/ui.md))
- **U1** Declutter: no page titles or intros; explanations behind the shared "?".
- **U2** Every game fits one screen in every state.
- **U3** 1280 px, fixed header, one palette, DESIGN.md tokens only.
- **U4** Exactly 3 size classes, mobile-first; touch by media, never width.
- **U5** No third-party scripts; a new host goes into the CSP.
- **U6** No range sliders (swipeable photo strips are fine); visual beats text.
- **U7** Settings removed on purpose stay removed.
- **U8** Never hardcode the genus count.
- **U9** Sign-in never on My progress.
- **U10** Greet by first name only (`firstName()`).
- **U11** Questions to the player come at a natural break.
- **U12** Home = two doors.
- **U13** Lab prototypes graduate only with Pierre's OK.
- **U14** Players can report a problem anywhere.

**Admin** ([docs/rules/admin.md](docs/rules/admin.md))
- **A1** Never change `curation.json` automatically or in a PR; an agent may propose a change.
- **A2** The admin is minimal: no text on the page, one click with Undo, confirm only bulk.
- **A3** The top level stays short: a new page goes into an existing tab or group first.
- **A4** One Corals | Fish switch covers every admin page.
- **A5** Every analysis says what it can conclude.

**Subjects** ([docs/rules/subjects.md](docs/rules/subjects.md))
- **S1** One engine, never naming a subject.
- **S2** Fish names: the IMR PDF's, WoRMS beside; Pierre's Needs ID confirms nothing.
- **S3** Fish groups come from the regional identification key.

**Sheet and data** ([docs/rules/sheet.md](docs/rules/sheet.md))
- **D1** Tests never reach the real sheet.
- **D2** Player names: real in chat, anonymous in the repo.
- **D3** A `Code.gs` or `core.js` change bumps `VERSION`.
- **D4** The app never gets ahead of the sheet script.
- **D5** Every progress-rule change appends a rules version.
- **D6** A recalculation of everyone's progress is announced.

**Working with Pierre** ([docs/rules/ship.md](docs/rules/ship.md))
- **W1** Everything produced is in English; only the chat with Pierre is in French.
- **W2** Work autonomously; ask before anything destructive.
- **W3** Alpha: no backward compatibility.
- **W4** Many prototypes first; Pierre judges by taps.
- **W5** Every idea discussed but not built goes into ROADMAP.
- **W6** No work sleeps on a branch.
- **W7** Fix by default; never re-ask what was answered.
- **W8** Independent reviews get an open mission that questions our choices.
- **W9** Latest stable version of tools.
- **W10** Never list Pierre's curation choices item by item; remind once, never nag.
- **W11** Say what you checked; a guess is labelled.

## Read on demand

| Touching… | Read (ARCHITECTURE = docs/ARCHITECTURE.md) |
|---|---|
| IMR content, sources, presence, iNaturalist tools | [content](docs/rules/content.md); ARCHITECTURE "Tools" |
| Photos, candidates | [photos](docs/rules/photos.md); ARCHITECTURE "Photos", "Photos per context" |
| The draw, Elo, progress, any learning value | [learning](docs/rules/learning.md); [LEARNING.md](docs/LEARNING.md) |
| Pages, layout, CSS | [ui](docs/rules/ui.md); [DESIGN.md](docs/DESIGN.md); ARCHITECTURE "Front end" |
| The admin, `curation.json`, Analyses | [admin](docs/rules/admin.md); ARCHITECTURE "Admin back-office", "Analyses" |
| Fish, `SUBJECTS`, `UNITS` | [subjects](docs/rules/subjects.md); ARCHITECTURE "Subjects", "Fish content"; [FISH_PATH.md](docs/FISH_PATH.md) |
| `Code.gs`, sync, the progress engine | [sheet](docs/rules/sheet.md); ARCHITECTURE "Progress sync"; [SECURITY.md](docs/SECURITY.md) |
| Tests, versions, `data.json`, PRs | [ship](docs/rules/ship.md) W12-W24 |

## Ship checklist

1. A worktree of your own from a fresh `origin/main`; stage files by name (rule W22).
2. A test with the logic you change (rule W12).
3. Fast tier before each push: Prettier, the checks, `node tests/run.js` (the unit tests, in the machine slot: rule W24),
   the one smoke part you touch (rule W14). Heavy runs take the slot; clean up behind you (rule W24).
4. Never edit `?v=`, `LAB_V` or `sw.js` `V` (rule W15); `data.json` only through `tools/datajson.py` (rule W16).
5. UI: look at it, light and dark, phone and desktop (rule W17).
6. `Code.gs` or `core.js` changed: rules D3-D5. Tests never reach the real sheet (rule D1).
7. Docs in the same PR (rule W19); ideas not built into ROADMAP (rule W5).
8. PR from the template, Decisions filled; rebase on `origin/main` before each push (rule W18).
9. `@codex review` after each push; fix or answer every finding; never re-run a failed job (rule W23).

## Review guidelines

For Codex's PR review, the rules cheapest to miss:
- A PR never edits `?v=N`, `LAB_V` or the `sw.js` cache name `V`: the deploy stamps them (rule W15).
- Only the admin's draft and Publish write `curation.json`: never a PR, a script or a rebuild (rule A1).
- The engine never names or tests a subject (`'fish'`, `SUBJ === SUBJECTS[k]`): a `SUBJECTS` field or a `UNITS` function (rule S1).
- No real player or staff name anywhere in the repo, tests included: the admin's anonymous id, P1, P2… or made-up names; never keep a note off GitHub because it holds names, pseudonymise it (rule D2).
- A feature that needs sheet script version N turns on only when the script reports `v >= N`, else behaves as before (rule D4).
- Anything that moves a player's progress appends a rules version to `core.js` `RVS` and bumps `Code.gs` `VERSION` (rule D5).
- Tests never reach the real sheet: no made-up host, patched `LOCAL` or stubbed `navigator.webdriver` (rule D1).

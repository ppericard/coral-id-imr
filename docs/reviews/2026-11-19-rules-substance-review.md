# The rules, reviewed for substance (2026-11-19)

**Status: study, docs only.** It changes no rule. Pierre's request of 2026-11-19, 09:46 Manila: «Est-ce que les règles
ne méritent pas d'être revues globalement ? Ya aucune optimisation/amélioration possible ?» The rules core proposal
(#1200) moved every rule without touching what it says, on purpose ("Writing a rule down": never generalise or harden;
a change of substance needs his OK). This study asks the other question: does each rule still earn its place, and how
can the set be better. **The batch for Pierre, in French, is §5.** No question number is assigned here: the integrator
numbers what it asks.

- **Base:** `origin/main` at `4165c3cf2` (#1116), 2026-11-19 about 10:00 Manila: #1117 (the guards, the rules audit)
  and #1198 (CLAUDE.md imports AGENTS.md; merge, never rebase; one PR per agent) are merged. Open and read: #1200 (the
  core proposal, branch `claude/rules-core-proposal`); open, not read beyond their titles: #1199 (`tools/asked.py`, the
  ledger check), #1195 (P1 in the corals' code), #1099, #1045.
- **Builds on, does not redo:** the rules audit (`docs/reviews/2026-11-18-rules-audit.md`: keep, guard, merge, delete;
  its decisions 1-5 and 8 approved on 2026-11-18 evening, 6 and 7 dropped, 9 parked), the agentic-practices study
  ([2026-11-19-agentic-practices-study.md](2026-11-19-agentic-practices-study.md): citation counts, contradictions,
  the research on instruction load) and #1200's placement of every rule.
- **Searched before any question:** `docs/ANSWERS.md` (read whole), the rules' *Source* lines, `docs/decisions/` (the
  rule-wording records of 11-18 and 11-19, rules step 1, guards rather than prose), STATUS "Questions for Pierre". What
  he already answered is applied, never asked (§5 says "pour info").

## 0. In short

- **Nearly every rule earns its place**: three IDs leave (W2 into W7, W5 into W19, W20 to the photos spec), and no
  product rule is retired or hardened. The weight is elsewhere:
  ten rules hold a third of the rule files' words (P1 956 words, L11 884, D3 690, W27 523, W14 497, W12 489, W19 392,
  W24 370, L2 338, L1 327: 5,466 of 15,985), and most of it is how-to, specs or history, not rule.
- **Three classes**, not two. **Editing** (wording, placement, duplicates merged, how-to moved to a tool or a spec,
  history to a record): the integrator's call. **Answered** (applies an answer Pierre already gave, quoted with its
  date; a paraphrase in the ledger is said to be one): done without asking, listed "pour info". **Substance** (changes
  what a rule requires, or adds a rule from his words): his OK, in the batch.
- **Verdicts on the 87 rule IDs:** keep 52, simplify 15, guard 14, merge 4, retire 2. **Classes:** editing 70,
  answered 13, substance 4 (W20, and the new lines in U7, L4 and S1). **AGENTS.md's 30 items** (#1200's list): keep
  16, simplify 6, merge 6, retire 2; editing 24, answered 5, substance 1 ("Writing a rule down"). A script counts the
  rows of §1 and §2 and checks that each of the 87 IDs appears once.
- **Missing rules:** five decisions of his act as rules and live nowhere in the rules (§3): the order of work is the
  integrator's; integrators run in auto mode; security alerts count like Codex findings; no GitHub chores for him; one
  judgement per photo. Three more are new rules and need his OK: the levels of each subject on its What I learn card,
  never more ⚙ rows; a common name never advances a scientific name, «partout»; S1's one engine across the game modes.
- **The most useful single change** (§4.1): "Writing a rule down" says that only a change of substance goes to Pierre;
  editing is the integrator's, listed in the PR. Today it says "the wording of a new or changed rule goes to him for his
  OK", which puts every shortened sentence of this whole edit in front of him.
- **Counts** (§6): 87 rule IDs become 84; AGENTS.md's 30 items become 26 (5 leave, 1 new); #1200's always-loaded core
  goes from 150 lines and 2,093 words to 153 lines and 2,134 words (measured on a scratch copy with these verdicts).
- **Departures from #1200** are named on their row and gathered in §4.6, so the two PRs do not silently disagree.

### The top 10 changes, by value (my judgement)

1. **"Writing a rule down": only substance goes to Pierre** (substance, §4.1). It decides how much of the rest needs
   him at all.
2. **W27 cut into its homes** (answered): the agent cap as the audit's decision 1, the ask-back as its decision 2, the
   rest where it belongs. The most relapsed rule (#798's six Codex rounds, the compute runs, the cap over-applied).
3. **"The order of work is the integrator's"** as a Working-mode line of its own (answered): asked three times
   (2026-11-12, 2026-11-19 08:54 and 08:57); today it is a parenthesis inside the questions bullet.
4. **W2 into W7, and W7's "where to look" becomes the ledger** (answered, 07:05): W7 still says "check ROADMAP and PR
   descriptions", the very gap behind this morning's «J'ai déjà répondu plein de fois à cette question!!!!».
5. **Every guarded rule becomes one line naming its guard** (answered: audit decision 3): C7, D3, W9, W12-W16, W21, W24,
   W26. These eleven rules hold 3,319 words today (measured); at one or two lines each, about 3,000 words of how-to
   leave the rules for the tools' `--help`, CONTRIBUTING and the specs (an estimate).
6. **P1 cut to its principle and its licences** (editing), with "one judgement per photo, «référence» read from the
   photo" added (answered, Q358, #1045). The largest rule, the most amended (14 ledger entries), and the one re-asked.
7. **L6's "no special case for one subject" gives way to S1** (answered: S1, 06:58). A live contradiction: L6 (Q169,
   2026-11-06) forbids what S1 now allows when it is declared in one place.
8. **D6's "announcement cards are never held" aligned with Q330 and Q332** (answered): no rule change or lost learned
   mark is announced any more, so the bullet now holds only for older cards and new-feature notes.
9. **U7: the levels of each subject on its What I learn card, never more ⚙ rows** (substance, from his 2026-11-18
   words). The settings rule says what was removed, not where new choices go.
10. **W20 out of the rules, into the photos spec** (substance), and **S1 across the game modes** (substance, a scope
    question): a pipeline decision stops counting as a working rule; one engine reaches the modes he asked about.

## 1. Every rule ID

Row: **ID** · verdict · class. Then: what it says today (its index line), the evidence, the proposal. "Cited" counts PR
descriptions since 2026-11-12 (352 PRs, read through the REST API) that name the rule after the word "rule(s)"; the
second figure counts those since 2026-11-18. "Ledger" counts its mentions in `docs/ANSWERS.md`. A guard named as
existing was checked by a script that the file is on `main`; "per the audit" means not re-checked here.

### Content (C1-C8)

- **C1** · keep · editing. Never contradict or "correct" the IMR course. Cited 7 (1). No relapse found. Later answer:
  the IMR content rules become the IMR instance's policy (Q347 a, ROADMAP "Roles, instances and cohorts"); the wording
  follows when instances are built, not now.
- **C2** · keep · editing. Never invent categories or information; every clue carries its source. Cited 30 (9). The
  Coral Finder is now «juste une source comme les autres» (2026-11-19 08:18): C2 already treats it as one.
- **C3** · keep · editing. Short ID tips; one decisive feedback line. Cited 9 (6). Worded 2026-11-18 ("ok", #1097).
- **C4** · simplify · editing. Corals: growth form is an entry point only. Cited 3. The rule is its first sentence; the
  seven IMR forms, the "x" and the polyps flag ✿ (which genera, never on macro photos) are the tagging spec. Proposal:
  "**Corals: growth form is an entry point only**: rank, never filter, never a way to group or pick genera; a list of
  genera is A-Z, the slate order or the IMR lecture groups." The forms and the ✿ flag move whole to the photos spec.
- **C5** · keep · editing. Discrepancies go to `points.json`; never settle them. Cited 8 (1).
- **C6** · keep · editing. ID cues cite only species present at Dauin or in the Philippines. Cited 10 (4).
- **C7** · guard · answered (audit decision 3). iNaturalist API pacing. Cited 22 (4). Guard exists: `tools/inat.py`,
  `tests/inat.test.js`. Proposal: "**Respect the iNaturalist API's terms**: every call goes through `tools/inat.py`
  (about one request a second, batched, a User-Agent, paced retries)." The how-to goes to the tool's docstring.
- **C8** · simplify · editing. Presence: one rule for every species. Cited 14 (2). The three tests, the observers'
  counts and "Pierre is one observer like anyone else" stay (his decisions); the list of the tools that call
  `tools/presence.py` goes (the tool is the single home, the rule says so). Absorbs S2's presence half (below).

### Photos (P1-P6)

- **P1** · simplify · editing, plus one answered line. A reference photo is chosen on its objective qualities. Cited
  21 (4); ledger 14, the most amended rule; 956 words, 7 lines of *Source*. This morning Pierre was asked again about
  the corals' source weight (×1.3) although P1 already said "no source priority anywhere": the gap was the corals' code
  (#1195), not P1's text. Proposal: keep the principle, the reference-route photos first, the photo never used alone,
  his own photos' inclusion (Q148), sea slugs as fish (Q386), the licences and the licence tie-break (Q270, Q284), the
  IMR lecture photos' caveat; move the R2 hosting, FishBase's automatic entry, the `thamnasteroid` identifications and
  the default-cover algorithm (Q339) to `docs/spec/photos.md` and `docs/spec/fish-photos.md` with their sources; the
  *Source* line becomes its first and last dates and a record. **Answered, to add once #1045 merges:** "one judgement
  per photo, whatever its route in; «référence» is read from the photo's own features, never a tag" (Q358: «il doit y
  avoir un seul jugement par photo»; #1045: «En vrai 'référence' devrait être déduit des caractéristiques de la photo,
  pas un tag»; Q421 "ok" to merge #1045, 08:53).
- **P2** · keep · editing. Corals: three views per genus. Cited 0. "Labelled Closer before 2026-11-01" goes to git.
- **P3** · simplify · editing. No photo of several organisms in games; no book photo anywhere. Cited 1. Guard exists:
  `tests/nobook.test.js`. "IMR lecture photos are game photos (since #227)" and what "Poor" means are photo specs: they
  move to the photos spec and the glossary. Proposal: the two prohibitions, "Enforced (book): `tests/nobook.test.js`".
- **P4** · keep · editing. One observation per one-photo question. Cited 11 (1). Worded 2026-11-18 ("ok").
- **P5** · keep · editing. Credits after the answer, never giving it away. Cited 1.
- **P6** · keep · editing. Corals: no skeleton photo anywhere. Cited 0. Guard exists in part: `tests/skeletons.test.js`
  drops the photos marked `skel`; the judging by eye stays a rule.

### Learning (L1-L15)

- **L1** · keep · editing. Time never decays progress. Cited 0; ledger 3 (its two exceptions, Q317). A principle that
  shapes the whole engine (not cited because it is not argued). "`s.pg` before rules version 9" goes to git.
- **L2** · simplify · editing. A wrong answer counts against both units. Cited 3. 338 words, 5 lines of *Why*: the
  literature (Pelánek, Snodgrass & Corwin, Green & Swets, Macmillan & Creelman) and the measured effects are LEARNING's
  ("The genus wrongly given in the Elo" and the domain-score bar's sections). Proposal: the two bold sentences and the
  bar's Pr = H − FA in one line; *Why:* "the bar does not over-claim a unit the player keeps naming wrongly, and strong
  players are not under-rated"; Pierre's «0 means you know nothing» stays in the record.
- **L3** · simplify · editing. Adaptive difficulty, no selector; every account counts. Cited 1; ledger 4. The photo
  exposure figures (30 % exploration, 40 colonies, the multi-view weight: Q187-Q190) are model parameters: they go to
  LEARNING with their sources. The rule keeps: adaptive and continuous, no Easy/Medium/Hard selector, every account
  counts (Pierre's included), starred genera always in Practice (#1200 keeps it too: L5 does not say it), the normal
  quiz never split by a group.
- **L4** · keep · substance. One progression path; only the quiz opens units. Cited 7 (4). Worded 2026-11-18. Gains,
  for Pierre's OK, "a common name never advances a scientific name, in every subject" (§3, N7: Q237, «c'est vrai pour
  tout le jeu, partout»).
- **L5** · keep · editing. Corals: starred genera follow their look-alikes. Cited 2.
- **L6** · simplify · answered. No unit-specific code; corals: Millepora counts, bonus genera opt-in. Cited 3. **A live
  contradiction:** its first line, in Pierre's words of Q169 (2026-11-06), says «no special cases for one unit or one
  subject; the data says it, the engine stays generic»; S1 (06:58 today) allows a difference between subjects
  «whatever its form (data, a parameter, a feature switched on for some subjects, or a patch)», declared in one place,
  after he refused a stricter wording as «trop conservatrice». The later answer wins (ANSWERS.md: a later answer that
  changes an earlier one). Proposal: "**No unit-specific code**: no special case for one unit; the data says it, the
  engine stays generic; a difference between subjects follows rule S1." The corals' part stays; the bonus mechanics
  are already in ARCHITECTURE "Bonus genera".
- **L7** · simplify · editing. Answer choices get harder gradually. Cited 1. The list of fish look-alike groups is data
  (`fish.json`); the rule names the source ("Pierre's declared look-alike groups") and drops the list.
- **L8** · keep · editing. Achievements reward learning, never time. Cited 1.
- **L9** · keep · editing. Learned = the silent mastery exam. Cited 3; ledger 4. Answered and to add once #1099 merges
  (Q420, 08:53, "keep it as built"): the exam's held-back photos are each player's own, used by the exam only
  (2026-11-18: «En fait la réserve elle doit être définie par joueur»); one line, in L9 or in LEARNING.
- **L10** · keep · editing. The first-launch question sets variables, never a path. Cited 2.
- **L11** · guard · answered (audit decision 8). The simplest algorithm; proportionate checks; a 40-minute cap
  (#1086). Cited 39 (17), the second most cited rule. Relapsed while written (a run of hours on 11-09, «6h de calcul ne
  devrait JAMAIS arriver» on 11-17). Proposal: the rule, the levels' table in one line each, the cap, "level 3 never on
  this machine", "Enforced: `tests/slot.js` ends a guarded heavy run at the cap" (guard not built yet); the method
  (looks, tests, multifactor) to LEARNING "Validating a learning change". Gains W27's "a simulation reads only what is
  declared" (placement).
- **L12** · keep · editing. Check algorithm changes on the real log too. Cited 23 (6). Its sentence on reading the log
  through the connector repeats AGENTS.md "Data access": one home there.
- **L13** · keep · editing. Compute once, not on phones. Cited 2.
- **L14** · keep · editing. Visual recognition and side-by-side comparison beat theory. Cited 0. A principle.
- **L15** · keep · editing. First goal: ID on ideal photos. Cited 0. Still the short-term goal (#1200 kept it too).

### UI (U1-U14)

- **U1** · keep · editing. Declutter; explanations behind the shared "?". Cited 0. Enforced in part by `pageHelp()`.
- **U2** · keep · editing. Every game fits one screen in every state. Cited 0.
- **U3** · simplify · editing. 1280 px, fixed header, one palette, DESIGN.md tokens only. Cited 2. The list of tokens,
  buttons and fonts repeats DESIGN.md, which the rule names as their home. Proposal: "**Fixed page width 1280 px; the
  header never changes size; one palette (⚙ Colours, Depth the default, Pierre's pick) and the DESIGN.md tokens only**;
  light theme default; ⚙ Colour-blind swaps green/red for blue/orange; genus names in true italics; readable text at
  least 12 px."
- **U4** · keep · editing. Exactly 3 size classes, mobile-first; touch by media. Cited 2. The one home of the test
  widths (W17 points to it, as #1200 says).
- **U5** · guard · editing. No third-party scripts; a new host goes into the CSP. Cited 1. Guard exists:
  `tests/csp.test.js`. One line naming it.
- **U6** · keep · editing. No range sliders; visual beats text. Cited 0.
- **U7** · keep · substance. Settings removed on purpose stay removed. Cited 1; ledger 2. Its stale reason "the
  IMR/own-first rule P1 already does that job" goes (editing: P1 changed on 2026-11-18). **Substance, from his
  words:** "the levels each subject teaches are set on its What I learn card (My progress), never as more ⚙ rows; ⚙
  keeps the general settings" (2026-11-18, #1071: «il faudrait pouvoir controler les niveaux de jeux par mode (coraux,
  poissons, limaces, ...). On ne peut pas continuer à empiler des settings dans le menu déroulant»; Q396: «il faudra que
  ça soit facilement visible et accessible pour les joueurs»; Q400 D). Scope kept to the levels per subject.
- **U8** · keep · editing. Never hardcode the number of units. Cited 4 (3).
- **U9** · keep · editing. Sign-in never on My progress. Cited 0. Consistent with Q349, Q365 and Q423 (name and code).
- **U10** · keep · editing. Greet by first name only. Cited 0.
- **U11** · keep · editing. Questions to the player come at a natural break. Cited 1.
- **U12** · keep · editing. Home = two doors. Cited 2.
- **U13** · keep · editing. Lab prototypes graduate only with Pierre's OK. Cited 0. Stricter than "easy to correct
  ships", and his: it stays.
- **U14** · keep · editing. Players can report a problem anywhere. Cited 1.

### Admin (A1-A5)

- **A1** · guard · editing. Never change `curation.json` automatically or in a PR. Cited 32 (8). The check that fails
  a PR diff touching `curation.json` is #1200's G2 (not built). Decided and waiting for the roles' build: "rule A1
  reworded" to the instance's content right (Q346 a; ROADMAP "Roles, instances and cohorts").
- **A2** · keep · editing. The admin is minimal: no text on the page, one click with Undo. Cited 14 (4). "For Pierre
  only" will change with the roles (Curators sort photos, Q422; `admin.html` goes, Q424): decided, applied when built.
- **A3** · keep · editing. The top level stays short. Cited 7 (3).
- **A4** · keep · editing. One subject switch covers every admin page. Cited 13 (3).
- **A5** · keep · editing. Every analysis says what it can conclude. Cited 5 (1).

### Subjects (S1-S3)

- **S1** · keep · substance. One shared engine; a difference declared in one place. Cited 37 (7). Worded at 06:58
  today. Guard exists in part: `tests/subject-neutral.test.js`. Its extension to the game modes is a scope question for
  Pierre (§3, N8); without his yes, S1 stays as it is.
- **S2** · simplify · editing. Fish names: the IMR PDF's, WoRMS beside. Cited 3. Its second half (Pierre's own
  observations: usable as photos, not as presence) repeats C8, which already says it; S2 keeps the names and a pointer
  ("his species-level photos stay usable; presence: rule C8").
- **S3** · keep · editing. Fish groups come from the regional identification key. Cited 1. Its build mechanics
  (`keyGroup`, `keyWhy`) are ARCHITECTURE's; the rule keeps the key, the attachment and Pierre's decision for a label.

### Sheet and data (D1-D9)

- **D1** · keep · editing. Tests never reach the real sheet. Cited 23 (8). Its how-to (the host mapping) stays, as
  #1200 keeps it: it is how the rule is obeyed.
- **D2** · keep · editing. Player names: real in chat, anonymous in the repo. Cited 13 (4). Gains AGENTS.md's "Data
  access" details (placement, as #1200). The names check is parked (audit decision 9).
- **D3** · guard · answered (audit decision 3). One changes file; `VERSION` at merge. Cited 66 (18), the most cited.
  Guards exist: `tools/check_versions.py --sheet-base`, `tools/sheet_version.py`, `tools/train.py`. 690 words to about
  150; the steps go to `tools/sheet_version.py --help`.
- **D4** · keep · editing. The app never gets ahead of the sheet script. Cited 35 (9). `tests/gates.test.js` exists.
- **D5** · simplify · editing. Every progress-rule change appends a rules version. Cited 20 (7). Its "No card" bullet
  repeats D6's first paragraph: one home for "silent" (D6), a pointer here.
- **D6** · simplify · answered. A recalculation is silent. Cited 8 (3). Its third bullet, "announcement cards are never
  held: a card that announces a rule change, a learned mark taken away or a big new app version", predates Q330
  (2026-11-09 ~14:45: no card for a recalculation) and Q332 (~15:40: the lost learned mark silent too). Since then no
  rule change or lost mark is announced; the bullet holds only for cards still pending from before rules version 10 and
  for `RECALC`'s new-feature notes (`progress.js` `recalcNotice`, `rvNotice`, `mxLostNotice` still exist). Proposal: the
  bullet says so; "until then … announced with a real pop-up" goes to the record.
- **D7** · keep · editing. A deleted account leaves nothing in normal operation. Cited 13 (3).
- **D8** · keep · editing. Every leaderboard follows a progress recalculation. Cited 14 (6). `tests/board.test.js`.
- **D9** · keep · editing. The answer log is the reference for progress. Cited 8 (2).

### Working with Pierre and shipping (W1-W27)

- **W1** · merge · editing. Everything in English; only the chat with Pierre in French. Cited 1. Absorbs AGENTS.md's
  "In French, Pierre is «tu»" and INTEGRATOR's "Language" (the dictation slips stay in INTEGRATOR), as #1200.
- **W2** · retire · editing (merged into W7). Work autonomously; ask before anything destructive. Cited 0, no file
  cites it. Its first half ("branch, build, test, open PRs and fix review findings without asking") is W7's "fix by
  default" said more widely; its second half is AGENTS.md "Always ask first". **Departure from #1200**, which kept W2
  because its first half "is said nowhere else": W7 takes those words, so they are still said, once.
- **W3** · keep · editing. Alpha: no backward compatibility. Cited 10 (5). Q159 (old ids keep mapping while old apps
  play) is a decided exception of its own, not a contradiction.
- **W4** · keep · editing. Many prototypes first; Pierre judges by taps. Cited 0. Its "ship, then iterate" is the
  merge contract's "easy to correct afterwards" (2026-11-14), which came later and goes further; W4 keeps what is its
  own: prototypes first, and how he judges (in use, on his phone, by taps and what is on screen).
- **W5** · merge · editing. Every idea discussed but not built goes into ROADMAP. Into W19 with its words, as #1200;
  2 files cite it (AGENTS.md, CONTRIBUTING.md).
- **W6** · guard · editing. No work sleeps on a branch. Cited 2. Guards exist: `tools/brief.py` and `tools/night.py`
  list the branches without a PR; `tools/train.py` refuses drafts and `needs-pierre`. Absorbs AGENTS.md's
  `needs-pierre` bullet, which W6 already describes. Proposal: "**No work sleeps on a branch**: a branch worth keeping
  gets a PR the same day; a PR that waits only for Pierre is opened ready with `needs-pierre`, never a draft. Listed by
  `tools/brief.py` and `tools/night.py`."
- **W7** · merge · answered. Fix by default; never re-ask what was answered. Cited 1. Two stale parts: "check ROADMAP
  and PR descriptions" (the ledger rule of 07:05: search the ledger, the rules and `docs/decisions/`) and "Apps Script
  redeploy" as an action that needs his hands (the script updates itself, D3). Absorbs W2. Proposal: "**Work
  autonomously; fix by default; never re-ask**: branch, build, test, open PRs and fix every review finding without
  asking; ask Pierre only what is costly to undo or needs his hands (his curation, IMR content); before any question,
  search the ledger, the rules and `docs/decisions/`."
- **W8** · keep · editing. Independent reviews: an open mission that questions our choices. Cited 2.
- **W9** · guard · answered (audit decision 3). Latest stable version of tools. Cited 2. Guards exist:
  `tools/stack_check.py --check` in CI, `--latest` in the brief, Dependabot. Absorbs AGENTS.md's Dependabot bullet.
  Keeps its substance line: "a bump that changes what players see, how photos are produced, or what Pierre does goes to
  Pierre".
- **W10** · keep · editing. Never list Pierre's curation choices item by item; remind once. Cited 0. Born of a relapse
  (2026-11-01, 11-05), none recorded since.
- **W11** · keep · editing. Say what you checked; a guess is labelled. Cited 7 (4).
- **W12** · guard · answered (audit decision 3). A test with the logic; run it locally. Cited 7 (2); 489 words, mostly
  how-to. Guard exists for its one rule-like part: `tests/answer.test.js` (smokes answer only through
  `tests/answer.js`). Proposal: "**A test with the logic you change**; a smoke answers a quiz question only through
  `tests/answer.js` (Enforced: `tests/answer.test.js`)." The local server, the admin demo, the workflows and the hooks
  go to CONTRIBUTING.md and `docs/spec/tools.md`.
- **W13** · guard · answered (audit decision 3). Prettier 3.10.1. Cited 0. Guard exists: `checks.yml`. One line; the
  Prettier 3.3.3 story goes to a record.
- **W14** · guard · answered (audit decision 3). The fast tier before each push; the full tier on CI. Cited 3 (2); 497
  words. The file-to-smoke map belongs in a tool (#1200's `tools/precheck.py`, not built); until it exists the map
  stays, and the rule is two lines above it.
- **W15** · keep · editing. Never edit `?v=`, `LAB_V` or `sw.js` `V`. Cited 1. In Codex's review guidelines; #1200's G7
  would check it. The stamping mechanics go to `docs/PAGES.md`.
- **W16** · guard · editing. Corals: `data.json` only through `tools/datajson.py`. Cited 5 (2); 8 files cite it, so it
  keeps its ID. Guard exists: `tools/datajson.py --check` in CI. One line.
- **W17** · keep · editing. Check visually, light and dark; replay as a new player. Cited 2 (2). #1200's G8 would
  catch `colorScheme: 'dark'`; the widths point to U4.
- **W18** · simplify · editing. PR from the template; squash; merge, never rebase or force-push. Cited 1. Worded this
  morning (#1198). "A merge to `main` is live within a minute or two" is a fact for `docs/PAGES.md`; the 2026-11-08
  rewrite story goes to its record; "any other rewrite needs Pierre's explicit go first, and a backup clone" stays.
- **W19** · keep · editing. Docs in the same PR; decision records; no history in the docs. Cited 22 (17). Absorbs W5.
  The long description of `tests/docs.test.js` goes (its test names say it).
- **W20** · retire · substance. Candidate photos refill automatically; "no more candidates is no more candidates". Cited
  1; 3 files cite it. A pipeline decision of Pierre's (Q171, 2026-11-06) about where photos come from, filed under "how
  to ship a change". Proposal: its text moves whole, with its *Why* and *Source*, to `docs/spec/photos.md` and
  `docs/spec/fish-photos.md`; the three files re-point; the ID retires. **Departure from #1200**, which kept it under W
  to avoid a renumbering: retiring it avoids the renumbering too.
- **W21** · guard · editing. One consistent naming; `reefid-` keys. Cited 0. Guard exists: `tools/rename_app.py`
  (`--check` in CI, per the audit). One line plus the key convention.
- **W22** · merge · editing. A worktree each, from a fresh `origin/main`; one PR per agent. Cited 1. Absorbs W27's
  "every branch starts from `origin/main`, never stacked" and W12's "branch from a fresh `main`"; the sparse checkout
  and the shared stash go to CONTRIBUTING.md; "one smoke at a time" is W24's; the Projects sentence goes (approved,
  audit decision 3).
- **W23** · keep · editing. `@codex review` after each push; never re-run a failed job. Cited 2. #1200's G1 would check
  the receipt and `run_attempt`; the REST notes go to INTEGRATOR.
- **W24** · guard · answered (audit decision 3). Every heavy run takes the machine slot. Cited 3 (1). Guards exist:
  `tests/slot.js`, `tests/slot.test.js`, `tests/slotguard.test.js`; no overload since 2026-11-05. Two lines; the
  details in `tests/slot.js`'s header.
- **W25** · simplify · editing. Use the quota with care, never at the cost of the result. Cited 0. Its model sentence
  repeats the Working-mode model bullet: a pointer. Kept as its own ID (as #1200), with "never for a judgment (photo
  judging included)", which the table does not say.
- **W26** · guard · answered (audit decision 3). Every PR merges through a green merge train. Cited 2 (1). Guard
  exists: `tools/train.py`. Two lines; the mechanics are its docstring's.
- **W27** · simplify · answered. Bounded cost: few agents, two Codex rounds, then cut. Cited 4; ledger 4; 523 words; a
  rule of eight concerns. Into its homes: **the agent cap** per the audit's decision 1 (approved 2026-11-18 evening, a
  paraphrase; read as (a), delete; #1200 §5 point 2 already holds the check against his daytime "ok" to "four, studies
  on top": not asked again here); **the ask-back** per decision 2 ("build the reading that is easy to correct and say
  which; ask back only when both readings are costly to undo"); "every branch from `origin/main`" to W22; "a simulation
  reads only what is declared" to L11; "one train at a time" to `tools/train.py` (#1200's G10); "scratch files carry
  the PR or topic in their name" to INTEGRATOR's brief habits (**departure from #1200**, which kept it: it is a habit of
  the scratchpad, not a rule of the project). What stays: "No two open PRs on the same sensitive file (`Code.gs`,
  `core.js`, `sync.js`, `model.js`); two Codex rounds, then cut the scope", with the structural-problem paragraph.

## 2. AGENTS.md's 30 items (#1200's list)

- **Rule 0, the sentence** · keep · editing. Pierre's words, 08:09 today.
- **Rule 0, the intro** · retire · editing. The history of its rewordings: its record (#1191), as #1200.
- **Rule 0, the bullets** · merge · editing. Into one bullet (the time source, what "asks nothing" means), as #1200.
- **The project in five lines** · simplify · editing. Facts kept; the rename's history to ROADMAP and git.
- **One integrator** · keep · editing.
- **Launch decided work at once** · keep · editing. Its relapses came from W27's cap (audit decision 1). The new line
  on the order of work sits beside it (§3, N1).
- **The merge contract** · keep · answered. Its item 2 gains "security alerts (CodeQL, secret scanning) count like Codex
  findings", today only in INTEGRATOR (2026-11-08, a paraphrase in the ledger; §3, N3). #1200's G1 would check items
  1-3.
- **Easy to correct afterwards** · simplify · answered. Absorbs INTEGRATOR's "never ask him to click" (2026-11-12,
  «c'est quoi ce micromanagement forcé ?») and "don't ask the obvious"; his quotes go to a record.
- **What players will see comes from Pierre** · keep · editing. Guard exists: `tools/train.py` ("Players see").
- **Costly to undo: the PR waits** · keep · editing.
- **Always ask first** · keep · editing. Takes W2's "ask before destructive" half (it already says it).
- **Research uses every useful source** · keep · editing. #1200's G6 would refuse a query holding the project's data.
- **Estimates in agent time** · keep · editing. Guard exists for the studies: `tools/effort.py --check`.
- **Model and effort per task** · simplify · editing. One line of about 600 characters; the table is INTEGRATOR's.
  Pierre asked it to be in the «règles hautes» (2026-11-18): it stays in the core, in four short lines, as #1200.
- **Model choice by measurement** · keep · editing.
- **No permission prompts** · simplify · answered. Guard exists: `tools/guard_bash.py`. Its clause on the read-only
  allowlist describes settings, not a rule: it goes, and the line on auto mode comes in (§3, N2).
- **One writer for STATUS** · keep · editing.
- **"tu"** · merge · editing. Into W1.
- **Questions to Pierre** · simplify · answered. About 250 words; "never the order" becomes its own line (N1); the two
  tests stay whole (Q297); the rest as #1200 shortens it.
- **Every answer reaches its doc** · keep · editing. #1199 (`tools/asked.py`, the ledger check: «ok», 08:53) would
  guard it.
- **Data access** · merge · editing. Its details into D2; a one-line duty stays in the core, as #1200.
- **Reports and events** · keep · editing.
- **Dependabot** · merge · editing. Into W9.
- **`needs-pierre`** · merge · editing. Into W6, which already describes the label; `tools/train.py` refuses it.
  **Departure from #1200**, which keeps it in the core: one home, and the train enforces it.
- **claude.ai Projects mode** · retire · answered. Approved (audit decision 3).
- **The rules, Writing a rule down** · keep · substance. Gains the approved "a friction first gets a guard" (audit
  decision 4) and, for Pierre's OK, "only a change of substance goes to him" (§4.1).
- **The rule index** · simplify · editing. Moves to `docs/rules/README.md`, as #1200.
- **Read on demand** · keep · editing.
- **Ship checklist** · merge · editing. Into the core's "Every task" lines, as #1200.
- **Review guidelines** · keep · editing. Codex reads only AGENTS.md: kept whole.

## 3. Missing rules: his decisions that act as rules and live nowhere in the rules

Searched in the ledger whole. Each: his words, where it goes, the class. A decision that is a product spec stays in
its spec (listed at the end, so nothing is lost by omission).

- **N1. The order of work is the integrator's** · answered · AGENTS.md "Working mode", beside "Launch decided work at
  once". «Mon seul input c'est quand j'ai besoin de mettre des choses en priorité» (08:57); «C'est toi qui est
  responsable de l'ordre du développement. Fait juste au mieux.» (08:54); «pourquoi tu me demandes mon avis pour un
  ordre alors que tu peux tout lancer en parallèle ?» (2026-11-12). Today: three words in a parenthesis of the questions
  bullet. Line: "**The order of work is the integrator's**: it sets the order of development and never asks Pierre
  «now or later»; he steps in only to raise a priority."
- **N2. Integrators run in auto mode** · answered · the "No permission prompts" bullet. «Par du principe que les
  intégrateurs tournent en mode auto» (06:37; the ledger adds: no allowlist PR for read-only commands, a narrow allow
  rule only for a routine command the classifier refuses); auto mode kept since 2026-11-12. Today in INTEGRATOR only.
  For the integrator, not for Pierre: the read-only allowlist merged with #1117 after 06:37 was approved on 2026-11-18
  («ok, lance les quatre»); the two do not need a question, only no new read-only entries.
- **N3. Security alerts count like Codex findings** · answered (a paraphrase in the ledger, 2026-11-08) · the merge
  contract's item 2. Today in INTEGRATOR "The merge mechanics" only, which a subagent does not read.
- **N4. No GitHub chores for Pierre** · answered · the "easy to correct" bullet. «c'est quoi ce micromanagement forcé
  ?» (2026-11-12): resolving threads, labels, ready-for-review, branch updates, workflow dispatches are the
  integrator's. Today in INTEGRATOR only.
- **N5. One judgement per photo; «référence» read from the photo** · answered · P1, once #1045 merges (§1, P1).
- **N6. The levels of each subject on its What I learn card, never more ⚙ rows** · substance · U7 (§1, U7).
- **N7. A common name never advances a scientific name, everywhere** · substance · `docs/rules/learning.md`, a line of
  L4 (one progression path). Q237, on typed answers: «c'est essentiel. Et c'est vrai pour tout le jeu, partout.»
  (2026-11-08); Q394 "A" (a common name or the genus alone typed for a scientific name are smaller faults, never a
  gain, a paraphrase); «Ce sont 2 arbres pédagogiques indépendants» (2026-11-18). Today in FISH_PATH only, a spec that
  a sea-slug or coral agent does not read. Scope: his «partout», every subject; no wider.
- **N8. One engine across the game modes too** · substance, a scope question · S1. Q356: «j'aurais préféré qu'on fasse
  la même chose pour les poissons et les coraux ... quelque chose qui soit cohérent entre tous les modes de jeu»
  (2026-11-15); Q411, 06:58: «Je ne comprends pas pourquoi le moteur n'est pas homogène… Pourquoi on a des exceptions
  en fonction des modes de jeux????». The second is a question, and the integrator has proposed an audit of the
  differences between modes: no rule is worded from a question. Asked as a scope question, with S1's own form: "a
  difference between game modes is declared and named in one place, never hidden".

Considered, and not proposed as rules (where each lives):

- **Rule 0's first message after 04:00** and **one shared engine**: in Rule 0 (#1191) and S1 (#1190) already.
- **Every answer reaches its doc**: in AGENTS.md (#1188); its check is #1199.
- **#773, publish without his validation** (2026-11-08): superseded, «Cette règle a été largement remplacée par des
  règles plus récentes sur quand merger tout seul» (08:05); the ledger's "AGENTS.md decided process (to add)" closes.
- **The exam reserve per player** (2026-11-18): L9 or LEARNING once #1099 merges (§1, L9).
- **No hidden placement test; an explicit, opt-in one** (2026-11-18): a paraphrase only, in the placement record; scope
  unclear, so no rule from it.
- **Progress errs on the slow side** (Q155, «I prefer progress that doesn't move fast enough…», as #646 quotes it):
  LEARNING's guardrail on over-claim holds it with its number.
- **Retired achievements leave every player, silently** (2026-11-08, Q260, Q264): a spec (`docs/spec/achievements.md`).
- **Lecture photos never upscaled** (2026-11-18, a paraphrase): P1's IMR caveat bullet, when it is next edited.
- **The privacy text read by him before it is published** (2026-11-18): a one-off for #1095, not generalised.
- **Keep the integrator's context (#711), regular handovers (#1088), work from the whole queue (#1111)**: INTEGRATOR
  habits, where they are.

## 4. Structural improvements

### 4.1 Say what goes to Pierre: substance only (substance)

"Writing a rule down" says: "the wording of a new or changed rule goes to him for his OK". Read as written, every
shortened sentence, every merged duplicate and every how-to moved to a tool goes to him, which is what Q425 B's
step-by-step edit would then cost him. His later answers point the other way: «Fais les choix tout seul si ils sont
facile à revenir dessus» (2026-11-17), «Il faut que tu pushes tout ce qui est facile à corriger à posteriori»
(2026-11-14), and the audit's decision 6 dropped because «the docs describe a coherent model in our words» (a
paraphrase). Proposal, his OK needed: "A change of substance (what a rule requires, a new rule) goes to Pierre for his
OK; editing (shortening, moving, merging duplicates, applying an answer he gave) is the integrator's call, listed in the
PR." Nothing about generalising or hardening changes: those stay forbidden.

### 4.2 One rule, one concern, one home

Eight rules carry more than one concern: P1 (eight bullets), W27 (eight), W12, W14, W22, L3, L6, D6. After the verdicts
each keeps one concern and points to the others' homes. Duplicates with two homes today, each to one: "tu" and W1;
W2's half and "Always ask first"; W5 and W19; the Dependabot bullet and W9; `needs-pierre` and W6; "Data access" and
D2 (and L12's copy); D5's "No card" and D6; S2's presence half and C8; W27's branches and W22. The five contradictions
the practices study found: two settled on 2026-11-19 (#1198), the agent cap and the ask-back by the audit's decisions 1
and 2, W7's places by the ledger rule; L6 against S1 is a sixth, found here.

### 4.3 The rule format, kept to its own words

AGENTS.md already says what a rule is: "its imperative line, *Why:* one short line in our words, *Source:* Pierre,
date (+ #PR)". Nine rules carry a *Source* of three lines or more (P1 7, L11 4, D3 4, W12, D5, D6, L6, L9, L3 3 each)
and two a *Why* of three or more (L2 5, W27 3). Proposal (editing): *Source* becomes the first date, the last change
and its record; the story behind a *Why* goes to the record. W19 already says history stays out of the docs.

### 4.4 Examples rather than prose

Where a rule needs a paragraph to say what counts, an example says it in a line, as P4 and C3 already do. Two
candidates: the questions bullet (about 250 words) becomes the two tests plus one model question ("Q426 — one line of
context — the question — options — recommendation"); "easy to correct afterwards" keeps its list of examples, which is
why it is followed.

### 4.5 Habits to INTEGRATOR, how-to to tools and CONTRIBUTING, specs to specs

- **Habits:** W27's scratch-file names; W22's shared stash; W23's REST notes.
- **How-to:** W12 (the local server, the admin demo, the workflows), W14 (the smoke map, into a tool once it exists),
  W24 (the slot's details), W26 and D3 (the train's and the assign's steps), C7, W9: to the tools' `--help`, their
  docstrings, CONTRIBUTING.md (it exists, 67 lines) and `docs/spec/tools.md`.
- **Specs:** W20 (§1); P1's hosting, FishBase, `thamnasteroid` and default-cover bullets; C4's forms; L3's exposure
  figures; L7's fish groups; U3's tokens; D6's card timing (`docs/spec/cards.md`); S3's build mechanics.

### 4.6 What changes in #1200's core if the verdicts are taken, and where this study departs from it

Measured on a scratch copy of #1200's core with these changes applied (§6): the questions bullet loses "never the order
of work"; a line "The order of work is the integrator's" comes in; "No permission prompts" loses nothing in the core
(the allowlist clause was already cut there) and gains "integrators run in auto mode"; the merge contract's item 2
gains the security alerts; the "easy to correct" bullet gains the GitHub chores; the `needs-pierre` bullet goes (its
half line joins W6's); "Writing a rule down" gains the substance-only sentence (if he says ok); the W27 line keeps
"no two open PRs on the same sensitive file; two Codex rounds, then cut" (the cap once settled, the branches in W22's
line); the W7 line takes W2's words. Result: 153 lines, 2,134 words (from 150 and 2,093).

Departures from #1200, each with its reason on its row: W2 retired into W7; W20 retired to the photos spec;
`needs-pierre` out of the core into W6; W27's scratch-file names to INTEGRATOR. Agreements: W5 into W19, L3's starred
sentence kept, L15 and W4 kept, W25 kept, D1's how-to kept, the review guidelines whole.

## 5. The batch for Pierre (French, ready to paste)

Already answered, not asked: the audit's decisions 1-5 and 8 (2026-11-18 evening); Q425 B; merge, never rebase, one PR
per agent (08:53); S1's wording (06:58); the ledger rule (07:05); the order of work (08:57). The agent cap is #1200's
§5 point 2, not repeated here. Numbered, by AGENTS.md's two tests: "Écrire une règle" (a rule's substance, cited later)
and the game modes (the engine's model); the integrator assigns the numbers. The rest is asked plainly.

```text
Pierre, la revue de fond des règles (étude #N). Réponds « ok » ou « ok sauf X ».

Écrire une règle
1. Seul un changement de fond (ce qu'une règle exige, une nouvelle règle) passe par toi ; le travail d'édition
   (raccourcir, déplacer, fusionner des doublons, appliquer une réponse que tu as déjà donnée) est le choix de
   l'intégrateur, listé dans la PR. Rien ne change pour « jamais généraliser ni durcir ». Reco : ok.

Retirer
2. W20 (« plus de candidats, c'est plus de candidats ») quitte les règles pour la spec des photos, mot pour mot,
   avec ta source : c'est une décision sur l'approvisionnement des photos, pas une règle de travail. Reco : ok.

Nouvelles règles (tes mots, à l'endroit qui les fera lire)
3. U7 : les niveaux de chaque matière se règlent sur sa carte What I learn, jamais en ajoutant des lignes dans ⚙ ;
   ⚙ garde les réglages généraux (tes mots du 18 : « On ne peut pas continuer à empiler des settings dans le menu
   déroulant »). Reco : ok.
4. Un nom commun ne fait jamais avancer un nom scientifique, dans toutes les matières (Q237 : « c'est vrai pour tout
   le jeu, partout »). Aujourd'hui ce n'est écrit que dans la spec des poissons. Reco : ok.
5. Les modes de jeu : S1 dirait aussi « une différence entre modes de jeu est déclarée et nommée à un seul endroit,
   jamais cachée » (ta question de 06:58 : « Pourquoi on a des exceptions en fonction des modes de jeux???? »).
   Reco : ok, écrit après l'audit des différences entre modes.

Pour info, déjà décidé par toi, j'applique sans te redemander :
- l'ordre du travail est à l'intégrateur (08:57) ; mode auto (06:37) ; les alertes de sécurité comptent comme
  celles de Codex ; aucune corvée GitHub pour toi : écrits dans les règles hautes ;
- W27 découpée selon l'audit (décisions 1 et 2) ; les règles tenues par un outil réduites à une ligne qui le nomme
  (décision 3) ; la méthode de L11 dans LEARNING (décision 8) ;
- W7 : avant toute question, chercher dans le registre de tes réponses (07:05) ; W2 fusionne dans W7 ;
- L6 : « pas de cas particulier pour une matière » cède à S1 de 06:58 ; D6 suit Q330 et Q332 (aucune carte) ;
- P1 : une seule évaluation par photo, « référence » déduite de la photo (Q358, #1045), quand #1045 sera mergée.
Aucune règle produit n'est supprimée ni durcie.
```

## 6. Counts

- **Rule IDs:** 87 today; 84 after (W2 into W7, W5 into W19, W20 to the spec; no new ID: the new lines go into U7,
  L4, P1 and, if he says yes, S1). `tests/docs.test.js` asks for at least 70. Citations to update: W5 in 2 files, W20
  in 3, W2 none.
- **AGENTS.md's items:** 30 today (#1200's list); 26 after: five leave AGENTS.md (Rule 0's intro to its record,
  Projects mode deleted, "tu" to W1, Dependabot to W9, `needs-pierre` to W6), the others stay as one item each (the
  Ship checklist as the "Every task" lines), and N1 comes in (N2, N3 and N4 join existing bullets).
- **Verdicts on the 87 IDs:** keep 52, simplify 15, guard 14, merge 4, retire 2 (W5 is counted as a merge); by class
  editing 70, answered 13, substance 4. On AGENTS.md's 30 items: keep 16, simplify 6, merge 6, retire 2; editing 24,
  answered 5, substance 1.
- **Words:** the rule files hold 15,985 words in their 87 rules (16,620 with the files' headers and the README);
  AGENTS.md 4,009; INTEGRATOR 3,362. The audit estimated about 13,500 for the three after its proposals (approved
  decision 4 sets a budget of 14,000); this study's verdicts are close to the audit's on the rule files and add no
  estimate of its own.
- **The always-loaded core:** CLAUDE.md 13 lines and 97 words, plus AGENTS.md 275 lines and 4,009 words today; #1200's
  core is 150 lines and 2,093 words; with these verdicts, 153 lines and 2,134 words (§4.6; `wc` on a scratch copy of
  #1200's core with the changes of §4.6 applied, "Writing a rule down" included). With CLAUDE.md: 166 lines.

## 7. What I checked and what I did not (rule W11)

- **Read in full:** AGENTS.md, CLAUDE.md, INTEGRATOR, the nine rule files, `docs/ANSWERS.md`, the decisions README and
  the records of the 11-18 and 11-19 rule wordings, rules step 1 and guards rather than prose, the rules audit, the
  agentic-practices study, #1200's proposal (its branch), STATUS "Questions for Pierre", the PR template,
  `.claude/settings.json`, the docs test's rule checks.
- **Measured with scratch scripts** (not committed): the citations of each rule ID in the 352 PR descriptions since
  2026-11-12, by the regular expression "rule(s)" followed by IDs, ranges expanded (it misses a rule named without the
  word and counts one named in passing; P and D IDs are also player pseudonyms, so only this form is counted for them);
  each rule's words and its *Why* and *Source* lines; each ID's mentions in the ledger; the files citing the IDs
  proposed for retirement; that each guard file named exists on `main`; the core's lines and words.
- **Not checked:** whether the guards named "would" (#1200's G1-G13) behave as proposed (none is built); the specs
  that would receive the moved text (only their names); the chat of 2026-11-18 evening (only its paraphrase); the code
  behind each product rule beyond the few names cited (`progress.js`'s three notice functions exist); #1199's tools.
- **Judgement, labelled:** the verdicts, the classes, the top 10 order and "a habit, not a rule" are mine.

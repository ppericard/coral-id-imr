# Backlog inventory: every open point, against Pierre's words (2026-11-20)

**A dated snapshot of 2026-11-20 evening, refreshed 2026-11-21 morning. [The ROADMAP](../ROADMAP.md) stays the one
list of work to come**; this PR
corrects its rows to what the sweep found. Pierre asked on 2026-11-20 at 17:12 Manila: «Sur le modèle de l'inventaire
du 18, refait un point complet sur l'ensemble des points ouverts, non terminé, laissé en vrac et backlog. Confirme bien
dans les documents ce à quoi j'ai déjà répondu ou permis de continuer (tu m'as affirmé "61 qui sont des idées ou du « plus
tard »", ça n'est pas cohérent avec ce que j'ai en tête)».

The figure he doubts comes from the integrator's ROADMAP audit of 2026-11-20 ~16:50 (scratchpad `roadmap-audit.md`,
not in the repo): A 7 launch now, B 37 blocked by a file, C 17 waiting for him, D 61 "idea, plus tard or wish". Its C and
D verdicts are re-checked one by one in [appendix A](#appendix-a-the-audits-c-and-d-entries-one-by-one).

Read from `origin/main` at `01bb16add` (#1312, 2026-11-20 17:07 Manila). `R30` is ROADMAP line 30 of that commit.

**Refreshed on 2026-11-21 against `origin/main` at `7fd48432f`** (#1349, 2026-11-21 morning; Pierre, 05:42: «il faut
remettre à jour encore cet inventaire et puis il faut le merger … sinon, tu n'utilises jamais la bonne info sur les
points encore en cours et ce qui doit être lancé»). The row IDs keep their 11-20 meaning. A refreshed row says so in its
basis cell, after **11-21:**; the rows nothing touched keep their 11-20 reading. What moved:

- **The 35 PRs merged since the snapshot** (`git log --first-parent 01bb16add..7fd48432f`, besides three commits
  without a PR: two Candidate photos runs and Pierre's photo curation; among them #1279 Memory, #1298 `data/`, #1299, #1310, #1324, #1328, #1330, #1333, #1335, #1336,
  #1339, #1341, #1344, #1349): their rows are Done or Partly done, with the PR number. The 13 PRs open on 11-20 all
  merged (§4.1); 5 PRs are open now besides this one and the ledger PR #1350 (#1351 opened during the refresh). #1349 merged while this refresh was being
  written: its rows say "merged later on 11-21".
- **Pierre's answers of 2026-11-21 05:32-05:42**, recorded by the ledger PR #1350 (not repeated in ANSWERS here):
  §1.2b.
- **Found obsolete or done by a check, not by a PR**: R71b (every FishBase main picture already carries `rep`) and R55's
  cap (8.7%, under the code's 10% bar; the units over it are `RARE.FEW` by design): the integrator's checks of 11-21,
  not in the repo.
- **Files held now** (§2) and so **§1.3, ready to launch**, recomputed; §1.4 keeps only the questions still open.
- Counts before the refresh, by the §6 script on this file at `d208682c0`: Done 3, Partly done 12, Decided ready 14,
  Decided 7, Blocked 45, Waiting for Pierre 24, Waiting 42, Idea 44, Obsolete 5 (196). The 10 rows added (R77c, N6,
  N7, PR15-PR21) bring the total to 206.

## 1. Summary

### 1.1 Counts per state

One row per open point in section 3 (the ROADMAP rows and their sub-items whose state differs) and section 4 (what lies
outside the ROADMAP). The counts are computed from those tables by a script (§6).

| State                                                                       | 11-20   | 11-21   |
| --------------------------------------------------------------------------- | ------- | ------- |
| Done (a row or sub-item the ROADMAP held as open on 11-20)                  | 3       | 27      |
| Partly done                                                                 | 12      | 17      |
| Decided, ready to launch                                                    | 14      | 22      |
| Decided (agreed, not started; waits only the order of work)                 | 7       | 8       |
| Blocked by an open PR or a held file (the open PRs included)                | 45      | 14      |
| Waiting for Pierre (a question, his review or his hands)                    | 24      | 23      |
| Waiting on data, a trigger he set or a third party                          | 42      | 43      |
| Idea (nobody decided, or his own doubt)                                     | 44      | 46      |
| Obsolete or declined                                                        | 5       | 6       |
| **All**                                                                     | **196** | **206** |

The 11-20 column is the §6 script on this file before the refresh (`d208682c0`; N5 had moved to Done after the table
was written). On 11-21, of the 14 blocked rows, 8 are decided work waiting for an open PR or a file one holds
(`app.js` held by #1331 and #1340, `quiz.js` and `model.js` by #1331, `admin.js` by #1348; N1 is #1331 and N6 is
#1351); the other 6 are the open PRs. Of
the 22 ready rows, 14 touch `core.js`, `Code.gs` or `sync.js`, freed when #1349 merged: rule W27 lets one PR at a time
hold each of those files, so they go one after another. Some "Partly done" and "Decided" rows have a part ready now:
§1.3 names them.

**What this says against "61 ideas or later"** (appendix A, counted by script). Of the audit's 61 single D entries:

- **7 are decided by his words, as work to build**: D5, D7, D21, D25, D34, D43, D46 (of them, D43, the response-time
  re-measure, can start now; the others wait for photos, data, or the order of work);
- **7 he parked himself with a trigger or a data gate**: D10, D26, D28, D30, D31, D42, D57 (not ideas: each says when
  it comes back; several were already marked parked by the audit);
- **3 he worded as a wish, a doubt or "to think about"**: D9, D24, D48 (ideas in his own words);
- **2 done or declined by his words**: D2, D29;
- **5 decided by a rule or the integrator's queue**, **3 whose data gate is met since**, **22 data or third-party waits
  he agreed to**, **1 declined**, and **11 ideas nobody decided**.

So 24 of the 61 are decided, done, or parked by him with a trigger, 22 wait on data he agreed to wait for, 14 are ideas
(11 nobody decided, 3 in his own words of a wish or a doubt), and 1 is declined. Of the 17 C entries: 2 are decided by his words, 1 has its gate met, 2 are
obsolete (C9 since 11-21; it was decided by a rule), 1 is an agent idea, and 11 are truly his (a question, his review or his hands).

### 1.2 Rows that move because of his words

Each is applied to its ROADMAP row in this PR (his words quoted there), unless an open PR already records it, and, when
the ledger lacked them, to [ANSWERS](../ANSWERS.md) under 2026-11-20.

| #   | Row                                                         | Was                     | Now                                                         | His words (date, where)                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Time, enlargement, response-time terms, R103, R204-R206     | Waiting for data        | Decided, ready: re-measure every subject                    | «La vitesse de réponse est définitivement un signal de difficulté (ainsi que le clic), quelque soit la matière, et même si la réponse est juste» (11-20, Reports tab)                                                                      |
| 2   | Opening: four units before a level is asked (new row)       | Not recorded            | Decided, after #1318, #1319, #1322 (L4's sentence to his OK) | «Lorsqu'on ouvre un niveau taxonomique il faut au moins 4 items ouverts avant de commencer à poser des questions. Sinon c'est juste trop facile»; «Le mode espèce arrive bien trop tôt» (11-20, Reports tab)                                |
| 3   | Bonus genera in the global progress (R202)                  | Parked                  | Decided in principle; one question (the scale)              | «Les genres bonus dans les coraux devraient définitivement compter dans le progres global» (11-20, Reports tab)                                                                                                                             |
| 4   | Groups by scope (R220)                                      | Not in the row          | Decided, blocked by `Code.gs`                               | «Groups have to be either instance wide or subject specific…» (11-20, Reports tab)                                                                                                                                                          |
| 5   | Beta: remove everyone (new row)                             | Not recorded            | Done: built by #1051 (`admin.js` `data-ugnone`, `data-gnone`) | «il me faudra un bouton pour supprimer aussi ou enlever tous les gens de la bêta, de la même manière qu'il y a un bouton pour les ajouter tous» (11-17 ~19:10, #1051's body). `admin.js` has Add all only                                |
| 6   | Report a problem, again on one page; a screenshot attached  | Not recorded            | Decided; recorded by #1319 (in review), not repeated here   | «Report a problem doit pouvoir être utilisé plusieurs fois sur la même page»; «Ajouter la possibilité de joindre une photo ou un screenshot au formulaire de feedback» (11-20, Reports tab)                                                |
| 7   | Fish "hunt" achievements (R76)                              | Idea ("proposed")       | Decided, designed later                                     | (paraphrase) his fish decisions of 11-04: "about 14 general fish achievements, plus a separate set of harder, specific 'hunt' achievements", his example *Centropyge vrolikii* against juvenile *Acanthurus pyroferus* (#467)          |
| 8   | Data into `data/` (R121)                                    | "approval a paraphrase" | Verbatim, in review #1298 (its row left to that PR)         | Q265 «Ok pour tes propositions» (11-08, ROADMAP row of #751): the ledger said no words of his were in the repo                                                                                                                             |
| 9   | Separate IMR-owned content (R123)                           | Paraphrase              | Decided (verbatim); the fish part ready                     | «quitte si besoin à licencier une version IMR à IMR ... ça me garde l'ensemble des droits pour moi.» (11-08, #737)                                                                                                                          |
| 10  | Juvenile classes read on the real data (R64)                | Not in the ledger       | Waiting on data (his words)                                 | Q435 (a) «Je sens qu'on va devoir finir par voir ce que ça donne sur les vrais données...» (11-19 15:32, #1228)                                                                                                                             |
| 11  | Fish species marks for adults and every subject (R60, R223) | Not in the ledger       | Done (#1232, #1236, #1263)                                  | «Est-ce qu'on a seulement fait le même travail pour les adultes?» (11-19 15:37, #1232); «On a fait le même travail de sourcing pour les coraux et les nudibranches?» (16:01, #1236); «Il faudra l'amener au niveau des espèces» (16:02, #1263) |
| 12  | Candidate photos outside the Philippines (R203)             | Parked (paraphrase)     | Declined for now (verbatim)                                 | «Non, pour l'instant, on va pas élargir au-delà des Philippines.» (11-02, #337)                                                                                                                                                             |

Rows 11 and 12 are not unblocked work: 11 is done, 12 is declined. They are listed because the ROADMAP or the ledger
said otherwise.

**Moved by a data gate met since, not by new words** (his earlier decision stands; the gate is now passed):

| #   | Row                                                                 | Was                           | Now                                    | Basis                                                                                                |
| --- | ------------------------------------------------------------------- | ----------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 13  | Fish judged-ease prior (R64), judged ease against ratings (R72)     | Waiting for the ratings       | Decided, ready (a read-only measure)   | (paraphrase) "Remove the fish easy-photos bootstrap once fish answers exist" (11-04); ratings served since v189 (#1148) |
| 14  | Fish sex and phase flags (R72)                                      | "when species questions come" | Decided, ready (bulk, measured first)  | (paraphrase) 11-04, R72; the species questions are built (#1273)                                      |
| 15  | Sea slug species achievements (R125)                                | Waits for the species units   | Decided, blocked by `core.js`          | The list approved 11-18 (paraphrase); the species units are built (#1273)                             |
| 16  | Fish photo exposure re-measure (R55)                                | Waiting for the answers       | Decided, ready                         | Q193 (paraphrase): at ~500 fish answers, passed long ago                                              |
| 17  | Live mode: the sea slugs (R166)                                     | Left                          | Done                                   | They opened to all (#1051); `live.js` `liveSubjects` hosts every subject not in a group's beta        |

**Readings, not his answers** (written in the rows as notes for the integrator, the status unchanged):

- **The 152 light proposals of Q308 (R73).** Rule A1's new wording («Pour la nouvelle formulation de A1, je valide»,
  11-20 05:39) may let the ones over a tag he only let through go into play; which of the 152 are his hand tags is not
  checked (his hand fish tags were 13 of 5,862 on 11-19, decision record `2026-11-19-auto-proposals-newer-judgement`).
- **Q351 (b), measuring the fish ease weight (R64).** A read-only measure, which AGENTS.md lets agents run without
  asking; the ROADMAP still records it as his question. **11-21:** it ran (#1341): "Not enough data yet".
- **A subject in a group's beta in live mode (R166).** Q437 may cover it.

Since 11-20, of the rows above: 1 measured (#1341), its build waits for the context he asked (§1.2b); 2 in review
(#1331); 3 decided (§1.2b); 6 built (#1339; the screenshot is N4); 9 the fish part built (#1328); 13 and 16 measured
(#1341; 16 closed by the cap check); 14 waits for #1342.

### 1.2b Rows that move because of his answers of 2026-11-21 (05:32-05:42)

His words are in the ledger PR #1350 (`claude/answers-1121`), which merges before this one; this PR does not repeat
them in ANSWERS. Each row's basis cell quotes the part that decides it.

| His answer (#1350)                                         | Rows                       | Now                                                                                     |
| ---------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| Rule L4, a level opens in a group of at least 4: yes       | N1                         | In review (#1331), to be checked in use                                                 |
| Q445 (A): one 45-genus coral scale, an "IMR slate" score   | R202b                      | Decided, built next; its files held by #1331; it rewrites rule L6                       |
| Q445's follow-up, the species order                        | N2                         | Not answered: he did not follow it; context owed                                        |
| Q446: a simple temporary store, deleted once processed     | N4                         | Not decided as proposed (no pCloud); the design goes back to him                        |
| Q447 yes; Q448 (A)                                         | R220, R220b                | Decided; built with rights 2a and 2c (`Code.gs` free since #1349 merged)                |
| Q449-Q451 «Ok» in direction; Q452 and the set: more context | R103, R204-R206           | Waiting for Pierre: the build waits for the context he asked                            |
| Benthos (B1, Q442, Q443): «non … pas sûr qu'on le traitera un jour» | R223              | Idea: long term, maybe never                                                            |
| Q444: yes, an implementation detail                        | R88                        | Decided, ready (`core.js` free since #1349 merged)                                      |
| Remove vs ×: «il me faut plus de contexte»                 | (§1.4)                     | Open: context owed                                                                      |
| R2: delete the unused files, yes (the list shown first)    | R32                        | Decided, ready                                                                          |
| R2 read-only CI token: «Ça sert à quoi?»                   | R35                        | Not answered (#1350); withdrawn by the integrator since: Obsolete                       |
| Q439: «J'ai pas testé encore»                              | R75, R165, R176, R177, N7  | Still open                                                                              |
| The compared photos stacked on a phone (05:32)             | N6                         | In review (#1351)                                                                       |
| The inventory merged first (05:42)                         | this PR                    | INTEGRATOR "A reference doc PR goes first" (#1350)                                      |

### 1.3 Ready to launch now (decided, unbuilt, no open PR on their files)

Refreshed 2026-11-21; files checked against the file lists of the open PRs (§2) and the remote branches without a PR
(§4.2: none builds any of these). In the integrator's order of work, oldest decision first where nothing else ranks them.

**A. Free of the sensitive files** (any number at once, heavy runs through `tests/slot.js`):

1. **R2: the files nothing uses** (R32): the list shown to Pierre, then the deletion (his yes of 05:40, #1350).
2. **Q316's offline fit on the real log** (R102; the read-only tool of #1310, outside the repo), then check 2B.
3. **FishBase judging pass on its candidates** (R71) and **watermark pass 5** (R78, the lists refilled since pass 4).
4. **Measured photo block, the full run** (R91; over rule L11's compute cap: a GitHub runner or `--minutes 35` slices).
5. **learnsim: the `shareFree` arm** (R31, read-only; a question to him only if it shows a cost).
6. **The Tree tab's build section** (R46's rest; `tools/*_game.py` free since #1298).
7. **Lab: Down the tree, Life stages matched** (R179, R180; `proto/lab.js` free).
8. **Sea slug species pairs, the 2 sourced** (R223b; `tools/seaslug_lookalikes_source.json` free).
9. **"Did you know?" tip (b)**, the next one of (b)-(h), one at a time (R49; `tips.js` free unless a counter needs
   `app.js`).
10. **Analyses: structure views, the later items** (R39) and the name-confusion study's (h) (R106; `analysis.js` free).
11. **One admin, the study's steps 9-10 and 13** (R94; [admin one-engine study](2026-11-19-admin-one-engine.md) §5):
    Learn's one list and one sheet (`learn.js` free, unless they need `app.js`), one tree-game builder (the tools).
12. **Deploy right after Candidate photos** (R34; the integrator's call, a workflow change; the ROADMAP calls it an open
    question, so it is the integrator's to take or drop).

**B. On `core.js`, `Code.gs` or `sync.js`, free since #1349 merged: one PR at a time on each file (rule W27)**, in
STATUS's order (#1343, Next 3) where it names them: the level's answer count from the log (R118); Fish basics'
`fbasics` and fpct100 (R76, R76b); one engine's next steps (R94) and architecture steps 3-4 (R93); the fish path's #892
and species exams (R85, R85b); then rights 2a, the audited-write path (R220, `Code.gs`), and 2c with Q448's trainer
lines (R220b); then, unranked: the sea slug species achievements (R125), Q444's common-name lists (R88), `ORG` (R123's
rest), the look-alike account names and the Alerts lines (R212, R214, `Code.gs`), typed Rejected tries (R37), the
admin's leaner log reply (R36b, a sheet change), Activity C2 (R51, `sync.js`), the Analyses' next views (R47).

Next once their files are free: after #1331 (`quiz.js`, `model.js`, `app.js`): Q445's coral scale (R202b), Find the X
on the mimicry pair (R67); after #1331 and #1340 (`app.js`): the tour leftovers (R116), the About version line (R58), the
calmer About text (R44); after #1348 (`admin.js`): species look-alike pairs in the admin (R151) and the one-admin
steps 7-8 (one montage and coverage page, one tile); after #1340 (`home.js`): the one-admin step 11 (the small Learn,
home and progress readers); after #1342: the fish
sex and phase flags (R72) and the photos re-judged on its phase list; in review: the compared photos stacked on a
phone (N6, #1351).

### 1.4 Questions still truly open

Refreshed 2026-11-21 from STATUS (#1343) and #1350. None is minted a number here.

1. **Q449-Q452** (response time): he asked for more context on the whole set before the build; Q452 open.
2. **Q445's follow-up, the species order** (N2): he did not follow it; to ask again with context.
3. **Remove vs ×** in the admin: «Je sais pas ce dont tu parles, il me faut plus de contexte» (05:40).
4. **Q446**: the screenshot store, redesigned to his direction (a simple temporary store), back to him (N4).
5. **Q439**: which Lab prototypes graduate (Matrix, Odd one out, Same or different?, the Fish ID Key), with the new-RA
   review's two options (N7): he has not tested the Lab yet.
6. **Asked never, costly**: the mimicry family pairs M7 and C11 (a structure change); `confTerm` if ever proposed
   (moves progress; #1341 measured it, a lead only).
7. **His review, not a blocker**: the fish and sea slug species-mark drafts (his 11-05 rule "agents draft, Pierre
   validates"); the tell-apart lines; the 8 unsure fish candidates; the 3 near-duplicate groups; admin Points (three new
   fish phase conflicts after #1342).

Answered since 11-20: B1, Q442, Q443 (long term, maybe never), Q444, Q445 (A), Q447, Q448 (A), rule L4, the R2
deletion, where the trainer list is stored (Q448). The R2 read-only CI token is out of this list: he asked what it is
for (not answered, #1350), and the integrator withdrew it (R35).

**Probably not questions any more, to confirm** (STATUS still lists them): **Q351 (b)**, measuring the fish ease
weight, ran read-only (#1341, "Not enough data yet"); **Q390** appears settled: answered D on 11-17, and the species
pairs enter play with species step 2 (the mimicry class decision of 11-18, paraphrase), which is built (#1273); what
STATUS still asks under Q390 was not read beyond its one line. One engine §6 (a)-(d) was not re-checked.

### 1.5 General permissions and their scope

AGENTS.md "Writing a rule down": never generalise beyond the case he spoke about. Each permission below covers only
what its source shows it answered.

| His words                                                                                                                                                         | Date, source                                | What it answered                                                                                        | Rows it decides                       | Not covered                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| «Je suis tes recommandations pour tout»                                                                                                                           | 11-14, Q124 (#901)                          | The name-confusion study's questions (a)-(h), §6, each with its recommendation                           | R106 (a)-(h); R171 name roots (d)     | Any other study                                     |
| «Ok pour tes propositions»                                                                                                                                        | 11-08, Q265 (ROADMAP row of #751)           | The move of the files players never download into `data/`; the code into `js/`, `css/` with the domain move | R121 (#1298)                          | Any other proposal of that day                      |
| «ok pour tes recommandations»                                                                                                                                     | 11-14 (#880's Decisions)                    | The Tree tab's key-group node behaviour, ranks shown, WoRMS absent                                       | R46 (built)                           |                                                     |
| «ok pour tes deux recommandations»                                                                                                                                | 11-08 (relayed, #740)                       | Phones 2 × 2 tiles, tiles near 3:2 on Home                                                               | built                                 |                                                     |
| «ok pour les 6 recommandations»                                                                                                                                   | 11-18 ~12:08 (#1119)                        | The feedback sheet's lines: writing the coral and sea-slug lines, corals first                           | R43                                   |                                                     |
| «oui à tout»                                                                                                                                                      | 11-14, Q350 (#871)                          | The confusion-group opening study a-j (f changed)                                                        | built (#871)                          |                                                     |
| «J'ai toujours dit de mettre en jeu les suggestions, surtout si elles peuvent être corrigées à postériori»                                                        | 11-19 14:42, Q430                           | Fish photo crops proposed by the judges                                                                  | R72 crops (built #1240)               | Exclusions, removals, rule changes                  |
| «il faut que tu fasses une proposition qui intègre directement le jeu. Quitte à ce que je corrige a posteriori» and A1 «je valide»                                | 11-19 20:57, 20:59; 11-20 05:39             | Agent proposals he let through in `curation.json` (not his hand choices)                                 | R72 auto-sort; R73 only as a reading (§1.2) | His hand decisions (13 fish tags, the coral counts) |
| «On valide par défaut et puis on corrige après si besoin»                                                                                                         | 11-18 (#1081)                               | The photo frames (subject, feature, context), agent-proposed                                             | the frames                            | The species-mark drafts (his 11-05 rule holds)      |
| Q437 «il faut ouvrir tous les modes de jeu aux différentes matières, à toutes les matières. Et oui, c'est du code commun»                                         | 11-19 20:34                                 | Every game mode for every subject, in shared code                                                        | R163, R164, the Duel tab, Basics, Memory; R166's group-beta subjects only as a reading | Graduating Lab prototypes (U13, Q439)              |
| «Tu dois régulièrement aller piocher dans la ROADMAP pour les taches suivantes»                                                                                   | 11-20 16:44 (#1321, merged 11-20)                   | Where the integrator takes its next task                                                                 | every "Decided, ready" row            | Rows that wait for him                              |
| «si dans la nuit t'as plus assez de travail, il faut que tu ailles taper dans la roadmap et dans les trucs que tu peux avancer tout seul» and «tu fais les tâches qu'on a déterminées ensemble» | 11-19 20:42-20:43 | Night work: decided ROADMAP rows; no filler study                                                        | every "Decided, ready" row            | Ideas nobody decided                                |
| «Plus tard ça veut juste dire qu'on le met dans la ROADMAP. Si t'écris litéralement ça, les agents suivant sont bloqués de manière permanente»                  | 11-19 15:07                                 | How a row is written: "later" is a ROADMAP row that says what to build                                   | the wording of every parked row       | Not a go to build what he doubted (R74)             |
| «C'est toi qui est responsable de l'ordre du développement. Fait juste au mieux.»; «Mon seul input c'est quand j'ai besoin de mettre des choses en priorité»     | 11-19 08:54, 08:57                          | The order of work                                                                                        | every decided row: no "now or later" question | What is built                                  |

## 2. How to read the tables, and the method

- **State**: Done (built, the ROADMAP still holds it); Partly done; Decided, ready (no open PR holds its files); Decided
  (agreed, not started, waits only the order of work or a sibling step); Blocked (an open PR or a held file, named);
  Waiting for Pierre (the one question); Waiting (data, a trigger he set, or a third party); Idea (nobody decided);
  Obsolete (overtaken or declined).
- **Basis**: **[i]** his recorded words, verbatim in «» with date and source, or "(paraphrase, source)"; **[ii]** a
  standing rule or the integrator's call (easy to correct); **[iii]** a data gate he agreed to, met since. A row he
  decided with a data gate, or parked himself with a trigger, is **Waiting**, never **Idea**.
- **Horizon**: Short (days), Medium (weeks), Long (months). **Size**: S one small PR, M a few PRs, L a series. My
  reading where the docs give none. No time estimate here: the 18th inventory's `tools/effort.py` figures still hold
  for the rows it shares.
- **Data gates**: the sheet's answer counts were not read today (the Answers tab was not queried); each gate gives its
  last recorded figure.
- Files held by the open PRs (`gh api pulls/N/files`, read at about 18:00): `core.js` and `Code.gs` #1279, #1298,
  #1299; `quiz.js` #1318, #1319, #1322; `app.js` #1279, #1298, #1318, #1322; `admin.js` #1298, #1313, #1320 (#1292,
  which held `app.js` and `admin.js` too, merged during the sweep, at `dc373a62e`, merged into this branch); `autosort.js` #1298, #1313; `analysis.js` #1298, #1299; `proto/lab.js` #1279, #1319; the tools' data,
  `judging/*`, `approved-photos.yml` and `tools/seaslug_lookalikes_source.json` #1298. Free: `learn.js`, `sync.js`,
  `model.js`, `tips.js`, `tools/learnsim.js`, `tools/build_fish.py`. #1286, #1301, #1311, #1312 merged after the audit.
- **Files held on 2026-11-21** (`gh api pulls/N/files` on the open PRs besides this one, read in the morning; #1349,
  which held `core.js`, `Code.gs`, `sync.js` and `quiz.js`, merged during the refresh): `quiz.js`, `model.js` #1331;
  `app.js` #1331, #1340; `admin.js` #1348; `home.js`, `proto/pairs.js` #1340; `data/points.json`,
  `tools/fish_phases.json` #1342; `app.css` #1351; #1350 holds docs only. Free: `core.js`, `Code.gs`, `sync.js`, `learn.js`, `tips.js`,
  `analysis.js`, `autosort.js`, `proto/lab.js`, the tools and their data, `judging/*`, `approved-photos.yml`.

**Sources swept** (rule W11):

- `docs/ROADMAP.md`, every row (the cells' ends included where a row's open part sits there);
- `docs/STATUS.md` and its 70 past versions (`git log -p origin/main -- docs/STATUS.md`: 2,037 distinct added lines);
- `docs/ANSWERS.md`, entries 2026-11-18 to 2026-11-20 read whole, the earlier days searched by keyword and question
  number;
- the 1,323 PR bodies (`gh api pulls?state=all`, 14 pages), their Decisions sections searched by keyword, and every
  French quote in them extracted by a script and compared with the ledger (143 quotes absent from it; the ones that
  decide an open row are in §1.2 and the ledger);
- the 14 PRs open at 17:07 and their ledger copies (`tools/asked.py` reads them): today's reports already recorded on #1316,
  #1318, #1319, #1320, #1322, #1323 are not added again;
- the 13 remote branches without a PR;
- the sheet's Reports tab, read-only (17 reports by Pierre on 2026-11-20; the other reporters' rows are not quoted);
- the scratchpad studies of today: `roadmap-audit.md`, `backlog-audit.md`, `opening-study.md`, `rights-pr2-design.md`,
  `benthos-study.md`, `q316-study.md`;
- `docs/reviews/2026-11-18-backlog-inventory.md` (whole), `2026-11-19-backlog-recheck.md`, `2026-11-19-open-points.md`
  (head), the modes plan, three decision records, FISH_PATH "Open all", #1264's 35-row table.

## 3. The ROADMAP, row by row

### 3.1 Next (agreed, not started)

| ID   | Item                                                         | State             | His words or basis                                                                                                                                                                      | Horizon | Size |
| ---- | ------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- |
| R30 | The Learn list's photo first on its sheet | Done | [i] «la photo doit être un lien. Vers la fiche» (11-20 06:02, ANSWERS); the fix [ii]; **11-21:** built (#1324) | - | - |
| R31 | learnsim: late fish family levels; the `--live` arm | Partly done | [ii] read-only study; `tools/learnsim.js` is free since #1301 merged; **11-21:** the late family levels examined read-only (#1341: the old delay excluded); left: the `shareFree` arm (read-only) | Short | S |
| R32 | R2 clean-up of unused files | Decided, ready | Deleting data: always ask first (AGENTS.md). Not asked yet; **11-21:** «R2, je peux supprimer les fichiers que plus rien n'utilise. Oui, carrément» (05:40, #1350); the list shown to him before deleting | Short | S |
| R33  | CI speed: a third shard, an `admin 1280 main` split          | Idea              | The agents' study; "only the touched smokes" needs his OK                                                                                                                              | Medium  | S    |
| R34 | Deploy right after Candidate photos | Decided, ready | [ii] #1298 holds `approved-photos.yml`; **11-21:** `approved-photos.yml` free since #1298 merged; still the integrator's call (ROADMAP "Open question") | Short | S |
| R35 | Hosting capacity: an R2 reading in CI | Obsolete | His hands: a read-only Cloudflare token (access). The watch is built; **11-21:** withdrawn by the integrator after his «Ça sert à quoi? Explique-moi à quoi ça sert» (05:40); the ledger records it as not answered (#1350) | - | - |
| R36 | Admin opening: lazy loads | Done | [i] «la page admin sur mon téléphone met de plus en plus de temps à s'ouvrir» (11-19 20:55); `claude/admin-lazy-loads`, 3 commits, no PR; **11-21:** the lazy loads built (#1336); the log reply is R36b | - | - |
| R36b | Admin opening: a leaner answer-log reply | Decided, ready | `Code.gs` holders; a rows-since-last-visit reply needs the declined device copy: his OK only; **11-21:** a sheet change: `Code.gs` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | M |
| R37 | Typed answers: Rejected tries served by `readAnswers` | Decided, ready | `Code.gs` holders; **11-21:** `Code.gs` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | S |
| R37b | Typed answers: `TYPED` tuning, dynamic share                 | Waiting           | 18 typed mix-ups on 11-18 (count not read today); a change players meet, for him                                                                                                        | Long    | M    |
| R38  | Corals of the World captures replaced by their originals    | Partly done       | (paraphrase) "C12 A+D" (11-18, STATUS 00f82557c); the originals merged (#1292, during this sweep); left: the admin's Crop on a lecture photo                                             | Short   | S    |
| R39 | Analyses: structure views, the later items | Decided | [i] Q70-Q77 (11-05); `analysis.js` held by #1298, #1299; **11-21:** `analysis.js` free since #1298, #1299 merged | Medium | M |
| R40  | iNaturalist API v1 to v2                                     | Idea              | Parked by the agents (v1 has no shutdown date)                                                                                                                                          | Long    | M    |
| R41  | Out-of-zone taxon-page photos (Q230)                         | Obsolete          | [i] Q230 "ok" to building nothing (11-14)                                                                                                                                               | -       | -    |
| R42  | More good fish photos we missed                              | Idea              | (paraphrase) his request for ideas, 11-08; no go to run one                                                                                                                             | Long    | M    |
| R43  | Feedback sheet lines: the 6 pairs left, a slot, the counter  | Partly done       | [i] «ok pour les 6 recommandations» (11-18 ~12:08, #1119); the lines are in play; his review corrects them, it blocks nothing                                                            | Medium  | S    |
| R44 | About and credits, a calmer text | Blocked | (paraphrase) 11-08, R44; #1292 merged; the About text is in `app.js` (held by #1279, #1298, #1318, #1322); **11-21:** `app.js` held by #1331, #1340 | Short | S |
| R45  | Coral ID Key photos in place of the drawings                 | Waiting           | [i] Q293 (11-08); as very good photos come                                                                                                                                              | Long    | M    |
| R46 | The Tree tab: generic `tree` section, coral Look-alikes page | Partly done | [i] Q339-Q341, Q359; the build section waits for #1298 (`tools/*_game.py`); **11-21:** `tools/*_game.py` free since #1298 merged: the build section can go | Medium | M |
| R46b | The Tree tab: filters (a species, no cover)                  | Idea              | "if Pierre wants them"                                                                                                                                                                  | Long    | S    |
| R47 | Analyses: next views; log card seen and comparisons | Decided, ready | (paraphrase) Pierre, 11-04; `analysis.js`, `sync.js` holders; **11-21:** `analysis.js` free; `sync.js` held by #1349; #1349 merged later on 11-21: its files are free | Medium | M |
| R48  | Analyses: the multiple-testing open items (a)-(e)            | Idea              | The agents' study; no decision                                                                                                                                                          | Medium  | M    |
| R49 | "Did you know?" tips (a), then (b)-(h) one by one | Partly done | (paraphrase) the owner, 11-04: the pop-ups for players who never used a feature, enabled one at a time; **11-21:** (a) built (#1333); (b)-(h) one at a time | Medium | M |
| R50  | Do sheet readers progress faster?                            | Waiting           | (paraphrase) 11-03; the Pages tab's events, logged since 2026-11-03 (not read)                                                                                                           | Medium  | S    |
| R51 | Activity outside the quiz: C2 | Decided, ready | [ii] integrator's call, design first; `sync.js` free since #1301; **11-21:** `sync.js` held by #1349; #1349 merged later on 11-21: its files are free | Short | S |
| R51b | Activity: C3 steps inside the Key, D daily roll-up           | Idea              | [i] «ça serait bien de compter les étapes dans la clé et les comparaisons» (11-08, #752): a wish                                                                                       | Long    | M    |
| R52  | Professionalise the platform                                 | Waiting           | [i] «trop compliquée pour l'instant» (11-15); «quand l'infrastructure qu'on utilise ne suivra plus» (11-18): parked by him with a trigger                                                | Long    | L    |
| R53  | First-launch fallback recalibrated                           | Waiting           | 5 players per answer with 80+ answers (not read)                                                                                                                                        | Long    | S    |
| R54  | Re-measure whether the quiz presses one pair too long        | Waiting           | (paraphrase) 11-04: "once there are more players"                                                                                                                                       | Medium  | S    |
| R55 | Fish photo exposure re-measure | Done | [iii] Q193 (11-06, paraphrase): at ~500 fish answers, passed long ago; **11-21:** measured (#1341); the cap check: 8.7%, under the code's 10% bar, the units over it `RARE.FEW` by design (the integrator's per-answer check of 11-21, not in the repo); its ROADMAP row deleted in this PR | - | - |
| R56  | Unanswered photos while the hold is on                       | Waiting           | (paraphrase) 11-04: re-measure before building                                                                                                                                          | Medium  | S    |
| R57  | No new genus after a miss outside the path                   | Idea              | "only if Pierre finds those odd too"                                                                                                                                                    | Medium  | S    |
| R58 | Credits: a version line and a source link | Blocked | [ii] the integrator's queue of 11-18 ("About version", STATUS de83ee3a9 Next 3); `app.js` holders; **11-21:** `app.js` held by #1331, #1340 | Short | S |
| R59  | Fish mode: circle 3 species, barracudas, PDF slips           | Waiting for Pierre | His curation, in the admin's Points (rule W10: remind once)                                                                                                                           | Medium  | S    |
| R60 | Fish sheets: the phase model, the shared components | Decided | [i] the 13 answers of 11-06; **11-21:** rule C1 reworded, fish phases from any cited source (#1334); the cited phase list in review (#1342) | Medium | L |
| R60b | Fish sheets: the species-mark drafts | Waiting for Pierre | (paraphrase) 11-05 "agents draft, Pierre validates": in play marked Draft; his review, not a blocker | Medium | S |
| R61  | Ability calibration (1)-(9)                                  | Idea              | Agent proposals of 11-03                                                                                                                                                                | Medium  | M    |
| R62  | After the fixes of 11-04, (1)-(4)                            | Idea              | Agent proposals; (1) moves progress: his OK if ever proposed                                                                                                                            | Medium  | S    |
| R63  | Admin per-genus abilities with the level's move              | Idea              | Agent proposal, display only; `admin.js` holders                                                                                                                                        | Medium  | S    |
| R64 | Fish judged-ease prior: refit or drop | Waiting | [iii] (paraphrase) 11-04 "once fish answers exist"; ratings served since v189 (#1148); measure first (Q351 (b) is that measure); **11-21:** measured read-only (#1341): the gate is met in the code, not the data (one answer a photo); re-run at 6+ players with 20+ post-switch fish answers | Medium | M |
| R65  | Juveniles: a card per species                                | Idea              | Parked by the agents                                                                                                                                                                    | Long    | S    |
| R66  | Fish look-alikes at any rank                                 | Waiting           | (paraphrase) 11-04: pairs proposed by real data or named by him; none chosen                                                                                                            | Medium  | L    |
| R67 | Mimicry: Find the X on the pair | Blocked | [i] Q416 (c) «ok. Du coup à mettre dans la suite des trucs à faire» (11-19); `core.js`/`quiz.js` holders; **11-21:** `core.js` held by #1349; `quiz.js` #1331, #1349; #1349 merged later on 11-21: its files are free; `quiz.js` still held by #1331 | Medium | M |
| R67b | Mimicry: the reverse trap                                    | Waiting           | [i] Q416 (a) "ok", when the species-level data shows the error                                                                                                                          | Long    | S    |
| R67c | Mimicry: M7, C11 as family pairs; the deck's photo pick      | Waiting for Pierre | A structure change; never asked                                                                                                                                                        | Medium  | S    |
| R68  | Fish confusion: memory and format offsets in the app         | Decided           | [i] Q123 a-o yes (11-14); moves progress (D5): its design first                                                                                                                         | Medium  | M    |
| R69  | Species photos: the 8 unsure candidates                      | Waiting for Pierre | His hands, in the admin                                                                                                                                                               | Short   | S    |
| R70  | Reef Life Survey Siquijor counts                             | Waiting           | Third party (not published on 11-04)                                                                                                                                                    | Long    | S    |
| R71 | FishBase: judging pass, iNaturalist covers as candidates | Decided, ready | (paraphrase) 11-05, same rules as the other sources; `judging/*`, `tools/*` held by #1298; **11-21:** `judging/*`, `tools/*` free since #1298 merged; a decided process (its rubric) | Medium | M |
| R71b | FishBase: the 87 former stopgap photos' `rep` tag | Obsolete | [ii] easy to correct (AGENTS.md merge contract); the stopgap list is retired (11-15); **11-21:** every FishBase main picture already carries `rep`: nothing to tag (the integrator's check); the item left the ROADMAP (#1343) | - | - |
| R71c | FishBase: a new rfishbase snapshot                           | Waiting           | Yearly                                                                                                                                                                                  | Long    | S    |
| R72 | Fish judging: sex and phase flags, the judged ease checked | Partly done | [iii] (paraphrase) 11-04 "when species questions come": built (#1273); the ratings are served (#1148); **11-21:** the judged ease measured (#1341, not enough data yet: R64); the sex and phase flags wait for #1342's cited phase list (`data/points.json`, `tools/fish_phases.json`) | Medium | M |
| R72b | Fish judging: the admin reads its proposals anew | Done | [i] Q438 «OK pour ta recommandation» (11-19 20:34); in review #1313; **11-21:** built (#1313) | - | - |
| R73  | The 152 light proposals                                      | Waiting for Pierre | His hands in the admin (the proposals' page, decided 11-14); a reading under A1 (11-20 05:39) noted in the row, not his answer (§1.2)                                                               | Short   | S    |
| R74  | Contrast correction                                          | Idea              | [i] «je ne suis pas convaincu qu'il faille les corriger, ou alors dans un deuxième temps» (11-19 15:01)                                                                                 | Long    | S    |
| R75 | Fish ID Key into Identify | Waiting for Pierre | Q439 (rule U13); **11-21:** Q439 not answered: «J'ai pas testé encore, donc il faut que je regarde» (05:40, #1350) | Short | S |
| R76 | Fish achievements: `fbasics` | Decided, ready | [i] «n'hésite pas à réfléchir au nom des succès» (11-08); `core.js` holders; **11-21:** `core.js` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Short | S |
| R76b | Fish achievements: fpct100 with the ultimate exam | Decided, ready | [i] Q395 «oui» (11-18); `core.js` holders; **11-21:** `core.js` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | M |
| R76c | Fish achievements: the hunt set; Q261's two                  | Decided           | [i] (paraphrase) 11-04, #467: "a separate set of harder, specific 'hunt' achievements", designed later                                                                                 | Long    | M    |
| R77 | Fish welcome: learnsim fish profiles, the names step | Done | [i] (paraphrase) 11-04; the profiles first (`tools/learnsim.js` free); **11-21:** the fish profiles existed; the check of the welcome values ran (#1344, nothing changed); the names step is R77c | - | - |
| R77c | Fish welcome: the names step (common / scientific / both) | Decided | [i] (paraphrase) 11-04, the row "Fish welcome question"'s Left; not started | Medium | S |
| R77b | Fish welcome: Danger zone step 2, the "lower" card           | Waiting           | [i] «on ne fasse pas les propositions de changement de niveau sur les poissons tant qu'on n'a pas mieux calibré» (11-08); step 2 "only if results show it is still too easy" (#467) | Long    | S    |
| R78 | Watermark pass 5 | Decided, ready | [i] Q373 (11-15, relayed); after #1298; **11-21:** #1298 merged and the lists refilled since (Candidate photos, 11-20/21): pass 5 is due | Short | S |
| R79  | Fish basics: glossary (2), the deck's other content (4)      | Idea              | "no words of Pierre's ask for it" (R79)                                                                                                                                                 | Medium  | S    |
| R80  | Fish key label points                                        | Waiting for Pierre | Admin Points                                                                                                                                                                         | Medium  | S    |
| R81  | Fish families left out on 11-08                              | Waiting           | [i] Q216: revisit at the next circle review                                                                                                                                             | Long    | S    |
| R82  | Trace IMR lecture photos                                     | Done              | [i] «pour l'instant, ça reste source IMR sans plus d'infos» (11-20 05:46)                                                                                                               | -       | -    |
| R83  | Corals of the World: permission before wider deployment      | Waiting           | (paraphrase) 11-15: he sends any request; trigger: a wider deployment                                                                                                                   | Long    | S    |
| R84  | IMR lecture photos, second pass                              | Waiting           | (paraphrase) 11-08 "second pass"; 11-20 05:46: they stay in play for now                                                                                                                | Long    | M    |
| R85 | Fish path: #892 (a wrong pick against both families) | Decided, ready | Rule L2; a fish rules version in `core.js`; **11-21:** `core.js` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | M |
| R85b | Fish path: the species exams (Q395) | Decided, ready | [i] Q395 «bonne idée», «oui» (11-17/18); `core.js` holders; **11-21:** `core.js` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | L |
| R86  | Scientific genera: the reading                               | Waiting           | (paraphrase) 11-08: built, read on data                                                                                                                                                 | Medium  | S    |
| R87  | Fish genera: further pairs from data; marks as a slot        | Waiting           | [i] Q418 (b): "the others later, from the players' data" (11-19 05:13)                                                                                                                 | Medium  | S    |
| R88 | Fish common names: a species' own list | Decided, ready | Q444; **11-21:** Q444 «Si tu penses que c'est le mieux, oui» (05:40, #1350): decided; after the `core.js` holder (#1349); #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | M |
| R89  | Held-out set: the transfer analysis                          | Decided           | [i] Q385, Q420 «ok»                                                                                                                                                                     | Medium  | M    |
| R90  | Auto-sort follow-ups (a), (b), (d)                           | Idea              | "no words of Pierre's"; measures first                                                                                                                                                  | Medium  | S    |
| R91 | Measured photo block: the full run | Decided, ready | [i] Q434 «oui» (11-19 15:05); #1229 merged, the run after #1298; **11-21:** #1229 and #1298 merged; the full run on a GitHub runner or in `--minutes 35` slices (rule L11) | Short | S |
| R92  | Modules: `app.js` split; ES modules                          | Partly done       | (paraphrase) code review L1 accepted; ES modules an idea                                                                                                                                | Long    | L    |
| R93 | Architecture steps 3 and 4 | Decided, ready | (paraphrase) Q406, the plan to him first; `core.js` holders; **11-21:** `core.js` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | L |
| R94 | One engine for every subject, steps left | Partly done | [i] «l'admin doit être le même ou presque le même pour l'ensemble des matières» (11-20 05:53); `core.js`, `Code.gs` holders; **11-21:** step 5's sheet half (#1346) and step 6 (#1337) built; step 5's app half in review (#1349); step 5's app half merged later on 11-21 (#1349) | Medium | L |
| R95 | Feedback without asking: a new-RA review on a phone | Done | (paraphrase) approved 11-02; **11-21:** the review ran on 11-20: findings 4-5 written as options for him (#1332, N7); finding 3 in review (#1340); the regular reviews go on | - | - |
| R96  | Level-dependent target from the one-tap answers              | Waiting           | ~20 answers a band from 5 devices (not read)                                                                                                                                            | Medium  | M    |
| R97  | Simulated profiles fitted to real players                    | Waiting           | (paraphrase) 11-05 "always part of the plan"; ~10 players with 200+ answers (not read)                                                                                                 | Medium  | M    |
| R98  | Lecture position bias                                        | Waiting           | (paraphrase) 11-03; camp data                                                                                                                                                           | Long    | S    |
| R99  | Comeback recalibrated                                        | Waiting           | Q378; ~20 players back after 2+ days                                                                                                                                                    | Medium  | S    |
| R100 | Next round of independent reviews                            | Waiting           | (paraphrase) 11-08: after everything planned                                                                                                                                            | Long    | L    |
| R101 | Learning algorithm review, proposals 2, 3, 5 | Idea | Overtaken by #646 and Q316 (inventory 11-18 L37); declined "a probabilistic model beyond BKT + Elo" (11-08); **11-21:** main's row: 2 measured and overtaken (#1341); 3 and 5 "to discuss with Pierre one by one" (agent proposals) | - | - |
| R102 | Engine coherence: Q316's offline fit | Partly done | (paraphrase) Q316 (11-09); in review #1310; **11-21:** the read-only tool built (#1310); next: the fit on the real log (outside the repo), then check 2B | Medium | L |
| R103 | Time in the photo rating | Waiting for Pierre | [i] «La vitesse de réponse est définitivement un signal de difficulté» (11-20, Reports): re-measure every subject now; the build waits for the figures; **11-21:** re-measured (#1341, thresholds not met); Q449-Q451 «Ok» in direction, the build waits for the context he asked; Q452 open (05:40, #1350) | Medium | M |
| R104 | Photo memory: the lag table at the next milestone            | Waiting           | [i] Q317; corals 4,000, fish 3,000 answers (not read today)                                                                                                                             | Short   | S    |
| R105 | More duels when several genera are shaky                     | Idea              | (paraphrase) 11-02 request partly built; the rate tied to shaky genera tried, no gain                                                                                                  | Medium  | S    |
| R106 | Name similarity: the re-test, (h) | Waiting | [i] Q124 «Je suis tes recommandations pour tout» (11-14); ~650 error trials; (h) also waits `analysis.js`; **11-21:** (h) free (`analysis.js`, #1298, #1299 merged) | Medium | M |
| R107 | Photo difficulty with few genera open                        | Waiting           | (paraphrase) 11-02; data                                                                                                                                                                | Long    | M    |
| R108 | Short lessons                                                | Idea              | (paraphrase) 11-02 "to think about"                                                                                                                                                     | Long    | M    |
| R109 | The expectation's slope, per-format guesses                  | Waiting           | (paraphrase) Q368 (11-15): again at ~20 players                                                                                                                                         | Long    | M    |
| R110 | Photo-level features in the difficulty                       | Waiting           | (paraphrase) 11-03 "keep them in mind for later"; ~5,000 trusted answers                                                                                                               | Long    | M    |
| R111 | Featured-photo suggestions from the data                     | Waiting           | (paraphrase) 11-03; ~10 first-sight answers a photo                                                                                                                                     | Long    | M    |
| R112 | Calibrated, medium-size photo sets                           | Obsolete          | (paraphrase) "L14 no, packs later" (11-18, STATUS de83ee3a9)                                                                                                                            | -       | -    |
| R113 | Taxonomy reference: the monthly refresh                      | Waiting           | [i] Q49 (11-05); next due about 12-18                                                                                                                                                   | Medium  | S    |
| R114 | Growth form and quality guesses                              | Waiting           | On his request                                                                                                                                                                          | Medium  | S    |
| R115 | Near-duplicate groups: Keep or Exclude                       | Waiting for Pierre | His hands in Triage (3 groups; his and IMR photos)                                                                                                                                    | Short   | S    |
| R116 | Tour leftovers | Blocked | [ii] the integrator's queue of 11-18 ("tour", STATUS de83ee3a9 Next 3); `app.js` holders; **11-21:** `app.js` held by #1331, #1340 | Short | S |
| R117 | Paliform-lobe rings                                          | Waiting           | A clearer photo                                                                                                                                                                         | Long    | S    |
| R118 | The level's answer count follows the log | Decided, ready | (paraphrase) Q322, Q330 (11-09); `core.js` holders; **11-21:** `core.js` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Short | M |
| R119 | Full replay leftovers (a)-(e)                                | Idea              | The agent's list of 11-03; (b), (e) also wait `Code.gs`/`core.js`                                                                                                                       | Medium  | M    |
| R120 | Fish progress replayed: the follow-ups                       | Decided           | [i] «il faut recalculer tous les progrès pour tous les joueurs à partir de leur réponse» (11-08, #776)                                                                                  | Medium  | M    |
| R121 | Tool and admin data into `data/` | Done | [i] Q265 «Ok pour tes propositions» (11-08); in review #1298; **11-21:** built (#1298) | - | - |
| R122 | Domain and repository rename                                 | Waiting           | [i] «quand l'infrastructure qu'on utilise ne suivra plus» (11-18)                                                                                                                       | Long    | L    |
| R123 | IMR content split: the fish part, then `ORG` | Partly done | [i] «les droits, ils me sont à moi à 100 %»; «quitte si besoin à licencier une version IMR à IMR» (11-08, #737); **11-21:** the fish part built (#1328); left: `core.js` `ORG` and the IMR wording (`core.js` held by #1349); #1349 merged later on 11-21: its files are free: `ORG` can go | Medium | M |
| R124 | Sea slugs "sp. N" (3)                                        | Waiting           | (paraphrase) Q389: published names                                                                                                                                                      | Long    | S    |
| R125 | Sea slug species achievements | Decided, ready | (paraphrase) the list ok (11-18), Q410 «ok»; species units built (#1273); `core.js` holders; **11-21:** `core.js` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | S |
| R127 | Placement test, step 3 (the opt-in test)                     | Waiting           | (paraphrase) 11-18 (#1080); after the calibration set reaches 20+ answers a photo (not read)                                                                                            | Medium  | L    |
| R131 | First-launch follow-ups (a), (b), (d)                        | Idea              | Agent notes of 11-03                                                                                                                                                                    | Medium  | S    |

### 3.2 Admin for every subject (plan PRs 9-12)

| ID   | Item                                                       | State       | His words or basis                                                                       | Horizon | Size |
| ---- | ---------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- | ------- | ---- |
| R150 | 9: the prior beside the answers, per subject               | Partly done | (paraphrase) 11-04: one pooled admin                                                     | Medium  | S    |
| R151 | 10: species look-alike pairs | Blocked | `admin.js` holders; **11-21:** `admin.js` held by #1348 | Medium | M |
| R152 | 11: the admin's pages per subject, the fish memory offsets | Partly done | [i] 11-20 05:53 (one admin); folded into R94; **11-21:** the band review for every subject built (#1337, step 6) | Medium | M |
| R153 | 12: Photo stats, Taxa, Players columns                     | Done        | Built (#690, #692, #992, #1169): **row deleted** in this PR                              | -       | -    |

### 3.3 Game modes

| ID   | Item                                                     | State             | His words or basis                                                                                                    | Horizon | Size |
| ---- | -------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- | ------- | ---- |
| R163 | Every game mode for every subject | Partly done | [i] Q437 (11-19 20:34); Memory in review #1279; **11-21:** Memory built (#1279); Find the X for the sea slugs waits for their photo boxes | Short | M |
| R164 | Find the X: its offset; species questions | Partly done | (paraphrase) Q321; offset in review #1299; **11-21:** its own offset built (#1299); the species questions left | Short | M |
| R165 | Matrix                                                   | Waiting for Pierre | Q439 (U13)                                                                                                           | Medium  | M    |
| R166 | Live mode after v1: the subjects                         | Partly done       | The sea slugs hostable since they opened to all (#1051, `live.js` `liveSubjects`); a subject in a group's beta left (Q437 may cover it: a reading) | Short | S |
| R166b | Live mode after v1: sets, a per-student view, WebSocket, typed and duels live | Idea | Each a product or cost choice for him (decision record `2026-11-18-live-after-v1`)                              | Long    | M    |
| R167 | Photo → trait                                            | Idea              | (paraphrase) "Spot the feature" stays in the Lab (11-04)                                                              | Long    | M    |
| R168 | 0 to 2 correct, or "None"                                | Idea              | The study's                                                                                                           | Long    | M    |
| R169 | Name → trait                                             | Idea              | Low priority                                                                                                          | Long    | S    |
| R170 | Macro lens hint                                          | Idea              | Needs feature crops                                                                                                   | Long    | M    |
| R171 | Name roots: the species epithets                         | Idea              | [i] Q124 (d) covered the genera; epithets the agents' idea                                                            | Long    | M    |
| R172 | Timed classification                                     | Idea              | (paraphrase) 11-03: not for IMR                                                                                       | Long    | M    |
| R173 | Replayable challenge                                     | Idea              | Not now (rules L1, L8)                                                                                                | Long    | S    |
| R174 | Find the Critter                                         | Idea              | Needs annotated images                                                                                                | Long    | L    |
| R175 | Regional (vernacular) names                              | Idea              | "Pierre's to say"                                                                                                     | Long    | M    |
| R176 | Odd one out                                              | Waiting for Pierre | Q439 (in the Lab)                                                                                                    | Medium  | M    |
| R177 | Same or different?                                       | Waiting for Pierre | Q439 (in the Lab)                                                                                                    | Medium  | M    |
| R178 | Sort them                                                | Idea              | No approval recorded                                                                                                  | Long    | M    |
| R179 | Down the tree | Decided, ready | (paraphrase) approved 11-18 as #1081 relays it; the Lab, `proto/lab.js` held by #1279, #1319; **11-21:** `proto/lab.js` free since #1279, #1319 merged | Medium | M |
| R180 | Life stages matched | Decided, ready | Same as R179; **11-21:** `proto/lab.js` free | Medium | M |
| R181 | Virtual dive                                             | Idea              | No approval recorded                                                                                                  | Long    | M    |
| R182 | Trainer's set                                            | Idea              | No approval recorded                                                                                                  | Long    | M    |
| R183 | Short-term study leftovers                               | Idea              | Parked                                                                                                                | Long    | M    |
| R184 | Learning-path study leftovers                            | Idea              | Parked                                                                                                                | Long    | M    |
| R185 | Corallite anatomy next steps                             | Idea              | Stays in the Lab until he promotes it                                                                                 | Long    | M    |
| R186 | Zoom ladder and Size ruler sliders                       | Idea              | Rework before any promotion                                                                                           | Long    | S    |

### 3.4 Parked and long term

| ID   | Item                                                   | State             | His words or basis                                                                                                                            | Horizon | Size |
| ---- | ------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- |
| R192 | A later tier's script that never came: Try again | Done | [ii] the integrator's queue of 11-18 ("Try again", STATUS de83ee3a9 Next 3); **11-21:** built (#1335) | - | - |
| R193 | Player learning trajectories                           | Waiting           | (paraphrase) 11-05: a later level, beyond 2,000 answers                                                                                       | Long    | M    |
| R194 | LEARNING.md and ARCHITECTURE.md split                  | Partly done       | (paraphrase) 11-05 "useful, not urgent"; the maps and specs restructuring (#1123-#1163)                                                       | Long    | M    |
| R195 | Glossary entries for unglossed sheet words             | Idea              | The agents' note                                                                                                                              | Medium  | S    |
| R199 | IMR survey records as presence evidence                | Waiting           | [i] Q46: "maybe one day" (third party)                                                                                                        | Long    | S    |
| R200 | Load order (e)                                         | Idea              | Parked                                                                                                                                        | Long    | S    |
| R201 | The CSS minified at deploy                             | Idea              | Parked (review R4)                                                                                                                            | Long    | S    |
| R202 | Bonus genera: more of them, in Memory, an admin list   | Idea              | Parked                                                                                                                                        | Long    | S    |
| R202b | Bonus genera count in the global progress | Blocked | [i] «Les genres bonus dans les coraux devraient définitivement compter dans le progres global» (11-20, Reports); one question: the scale; **11-21:** Q445 (A): «une seule échelle de 45 genres, oui, et du coup le pourcentage actuel gardé comme score ardoise IMR» (05:40, #1350): decided, built next; it rewrites rule L6; its files (`core.js`, `app.js`, `model.js`, `quiz.js`) held by #1331, #1349; #1349 merged later on 11-21: its files are free; still held by #1331 (`app.js`, `model.js`, `quiz.js`) | Medium | M |
| R203 | Candidate photos outside the Philippines               | Obsolete          | [i] «Non, pour l'instant, on va pas élargir au-delà des Philippines.» (11-02, #337)                                                           | -       | -    |
| R204 | Enlargement as a signal | Waiting for Pierre | [i] «(ainsi que le clic)» (11-20, Reports): the re-measure of R103; **11-21:** counted (#1341, not enough data); Q451 «Ok» (a weak but different signal), the build waits for the context he asked (#1350) | Medium | S |
| R205 | Response time, genus term | Waiting for Pierre | Same as R103; **11-21:** measured (#1341); the build waits for the context he asked on Q449-Q452 (#1350) | Medium | S |
| R206 | Response time, photo term | Waiting for Pierre | Same as R103; **11-21:** measured (#1341); the build waits for the context he asked on Q449-Q452 (#1350) | Medium | S |
| R207 | Reuse the data in ReefRecall                           | Waiting           | (paraphrase) 11-14: he will probably restart ReefRecall; a later question                                                                     | Long    | M    |
| R208 | Rights tagged for a later split: the rest              | Idea              | Licence study, parked                                                                                                                         | Long    | M    |
| R209 | First-time RA review: like-for-like comparisons        | Waiting           | Photo-dependent                                                                                                                               | Medium  | M    |
| R210 | Sign-out draft: the clean-up                           | Waiting           | [i] Q334; from 2026-12-18                                                                                                                     | Medium  | S    |
| R211 | PR preview links                                       | Waiting           | (paraphrase) 11-01 «plus tard»; with Professionalise                                                                                          | Long    | M    |
| R212 | Look-alike account names | Decided, ready | [ii] the integrator's queue of 11-18 ("account names"); `Code.gs` holders; **11-21:** `Code.gs` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | S |
| R213 | Security: archive old answers                          | Waiting           | [i] Q352 "ok" to D1 at a measured threshold (11-14)                                                                                           | Long    | L    |
| R214 | Alerts lines of a name taken again | Decided, ready | [ii] integrator's call; `Code.gs` holders; **11-21:** `Code.gs` held by #1349; #1349 merged later on 11-21: its files are free (one PR at a time on `core.js`, `Code.gs`, `sync.js`, rule W27) | Medium | S |
| R220 | Roles: rights PR 2-4, groups by scope, the relay | Partly done | [i] Q408 (11-19 06:50-06:58); «Groups have to be either instance wide or subject specific» (11-20, Reports); `Code.gs` holders; **11-21:** rights PR 2b built (#1330); Q447 «oui, c'est pas con» (the scope in the Rights column), Q448 (A) (05:40, #1350); left: the audited-write path (`Code.gs` held by #1349), PRs 3-4; #1349 merged later on 11-21: its files are free: rights 2a can go | Medium | L |
| R220b | Roles: where each cohort's trainer list is stored | Decided | STATUS question (a sheet format); **11-21:** Q448 (A), lines in the Groups tab: «je soupçonne que ça doit être bon» (05:40, #1350); built with rights 2c | Medium | S |
| R221 | The app as a generic product                           | Idea              | His own idea (11-08), not started                                                                                                             | Long    | L    |
| R222 | Training for survey organisations                      | Idea              | (paraphrase) 11-08, five Parked rows folded                                                                                                   | Long    | L    |
| R223 | More subjects: benthos | Idea | B1, Q442, Q443; **11-21:** «non, on ne traite pas ça pour l'instant ... je suis même pas sûr qu'on le traitera un jour» (05:40, #1350): long term, maybe never (B1, Q442, Q443 with it) | Medium | L |
| R223b | More subjects: sea slug species pairs (2 sourced) | Decided, ready | (paraphrase) Q390 D; the species level built; `tools/seaslug_lookalikes_source.json` held by #1298; **11-21:** `tools/seaslug_lookalikes_source.json` free since #1298 merged | Medium | S |
| R223c | More subjects: sea slug ID key; the 4 genera without marks | Idea          | Low yield (no source found); **11-21:** marks found and added for *Caloria* and *Taringa* (#1325, drafts); *Ardeadoris* and *Verconia* stay without                                                                                                                   | Long    | M    |
| R224 | Content versions: served to the admin's readers        | Waiting           | When needed                                                                                                                                   | Long    | S    |
| R225 | Partial transfer between regions                       | Idea              | A research question                                                                                                                           | Long    | M    |

### 3.5 New rows, from his reports of 2026-11-20 and an older request

| ID  | Item                                                         | State             | His words or basis                                                                                                                                                         | Horizon | Size |
| --- | ------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- |
| N1 | Opening: at least four units before a level is asked | Blocked | [i] «Au minimum 4 espèces proches ouvertes»; «il faut au moins 4 items ouverts avant de commencer à poser des questions»; «Le mode espèce arrive bien trop tôt» (Reports); `quiz.js`, `app.js` held by #1318, #1319, #1322 (small, near merge); L4's sentence to his OK; **11-21:** in review (#1331); rule L4 «Je pense que c'est une bonne idée» (05:40, #1350) | Short | M |
| N2 | Species by common name before the scientific names? | Waiting for Pierre | [i] «Pourquoi on commence à m'ouvrir des noms d'espèces alors que je n'ai même pas ouvert les noms scientifiques?» (Reports); opening study question B; **11-21:** asked with Q445 as "the species order question" (STATUS): not answered, «Je ne sais pas exactement ce dont tu parles» (#1350); context owed | Short | S |
| N3 | Report a problem, again on the same page | Done | [i] «Report a problem doit pouvoir être utilisé plusieurs fois sur la même page» (Reports); its ROADMAP row and ledger entry are on #1319 (in review); **11-21:** built (#1339) | - | - |
| N4 | A photo or screenshot attached to a report | Waiting for Pierre | [i] «Ajouter la possibilité de joindre une photo ou un screenshot au formulaire de feedback» (Reports); recorded on #1319; where the file is stored is his; **11-21:** Q446 not decided as proposed: «Est-ce qu'on peut pas juste stocker temporairement la photo ... le temps qu'un agent puisse le traiter et ensuite on dégage la photo» (05:40, #1350): a simple temporary store; the design goes back to him | Medium | M |
| N5  | Beta: remove everyone from a subject's beta                  | Done              | [i] «il me faudra un bouton pour … enlever tous les gens de la bêta» (11-17, #1051); `admin.js` held by #1298, #1313, #1320                                       | Short   | S    |
| N6  | The two compared photos stacked on a phone (fish)            | Blocked           | [i] «je pense que ça s'afficherait beaucoup mieux en étant au-dessus, en dessous» (11-21 05:32, #1350); in review (#1351) | Short   | S    |
| N7  | New-RA review findings 4-5: My progress's "Next step" line, the quiz photo's Colony / Close-up switch | Waiting for Pierre | Options for him (#1332), asked with Q439 in STATUS                                                                                | Short   | S    |

## 4. Outside the ROADMAP

### 4.1 Open PRs (13 on 11-20, all merged since; on 11-21 PR15-PR21, of which #1349 merged and #1351 opened during the refresh)

| ID    | PR                                                   | State   | Note                                                        | Horizon | Size |
| ----- | ---------------------------------------------------- | ------- | ----------------------------------------------------------- | ------- | ---- |
| PR1 | #1279 Memory for the fish and the sea slugs (Q437) | Done | Needs a sheet `VERSION` at merge (rule D3); **11-21:** merged | - | - |
| PR3 | #1298 Tool and admin data into `data/` | Done | Needs a `VERSION`; holds many files; **11-21:** merged | - | - |
| PR4 | #1299 Find the X's own offset | Done | Needs a `VERSION`; **11-21:** merged | - | - |
| PR5 | #1310 Q316 offline-fit tool | Done | Held: cut side check 2B, three threads open; **11-21:** merged (the tool; the real fit is R102) | - | - |
| PR6 | #1313 #1259's two auto-sort follow-ups | Done | Read its Codex first; **11-21:** merged | - | - |
| PR7 | #1315 Merge-queue scripts into `tools/queue` | Done | In review; **11-21:** merged | - | - |
| PR8 | #1316 Compared photos shown whole | Done | His report of 11-20; **11-21:** merged; his 05:32 wish (stacked on phones) is N6 | - | - |
| PR9 | #1318 Cards per subject | Done | His reports of 11-20; **11-21:** merged | - | - |
| PR10 | #1319 Report a problem out of More | Done | His report of 11-20; the repeat is N3; **11-21:** merged; the repeat merged too (#1339) | - | - |
| PR11 | #1320 Admin ? help scrolls | Done | His report of 11-20; **11-21:** merged | - | - |
| PR12 | #1321 INTEGRATOR: the next task from the ROADMAP | Done | His 16:44 words; its ledger entry is there; **11-21:** merged | - | - |
| PR13 | #1322 A unit's common name on its opening card | Done | His bannerfish report of 11-20; **11-21:** merged | - | - |
| PR14 | #1323 Fish juvenile cards | Done | His two juvenile reports of 11-20; **11-21:** merged; #1329 followed (the young beside an adult) | - | - |
| PR15  | #1331 A level opens in a group of at least 4 close units (rule L4) | Blocked | N1; L4 OK'd 05:40 (#1350)                          | Short   | M    |
| PR16  | #1340 Sea slugs: no Identify door or tab while no ID key is built | Blocked | R95's finding 3                                  | Short   | S    |
| PR17  | #1342 Fish colour phases sourced (`tools/fish_phases.json`)   | Blocked | R60, R72's flags                                            | Short   | S    |
| PR18  | #1348 Admin: a Published toast is not replaced; Undo         | Blocked | Holds `admin.js`                                            | Short   | S    |
| PR19 | #1349 Each subject adopts its own opening hold (one-engine step 5, the app's half) | Done | R94; holds `core.js`, `quiz.js`, `sync.js`, `Code.gs`; merged later on 11-21 | - | - |
| PR20  | #1350 Ledger: Pierre's answers of 2026-11-21 05:32-05:42      | Blocked | Merges before this PR; its answers are cited here          | Short   | S    |
| PR21  | #1351 The two compared photos stacked on phones               | Blocked | N6; holds `app.css`, opened during the refresh             | Short   | S    |

### 4.2 Branches without a PR (13 besides `main`, `release` on 11-20; 15 on 11-21, besides the `train/*` branches)

| ID  | Branch                                                                 | State       | Note                                                                                           | Horizon | Size |
| --- | ---------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- | ------- | ---- |
| B1 | `claude/admin-lazy-loads` (3 commits, 11-20) | Done | R36: finish its record, tests, PR; **11-21:** merged as #1336 | - | - |
| B2  | `claude/admin-signout-seal`, `level-count-from-log`, `fish-todo-wip`, `stoic-ritchie-fp1ipu`, `optimistic-newton-b82nxm`, `compassionate-cori-ecyc2t`, `juvenile-no-cap-sim`, five `live-locked-*` | Obsolete | References or experiments of merged work (#1078, #1053, #1234, #1237); the weekly clean-up workflow can drop them; **11-21:** also without a PR now: `photo-genus-ability` (#637, closed unmerged), `time-weighted-steps` (#808, closed unmerged), `autosort-followups` (#1313, merged; a late push re-created it): references too; no branch without a PR builds a §1.3 item (`level-count-from-log` holds the parked design note for R118, cut from #840 by
rule W27: a starting point, not work in flight), and the stacked compared photos (N6) are #1351 | - | - |

### 4.3 Pierre's hands (STATUS)

| ID  | Item                                                                  | State             | Note                     | Horizon | Size |
| --- | --------------------------------------------------------------------- | ----------------- | ------------------------ | ------- | ---- |
| H1  | Gold set 2: 42 photos to review                                        | Waiting for Pierre | Sent 11-19 15:36        | Short   | S    |
| H2  | GitHub: a `release` ruleset                                            | Waiting for Pierre | Access                  | Short   | S    |
| H3  | The trainer role for himself (a live game)                            | Waiting for Pierre | His own action          | Short   | S    |
| H4  | The admin: the Boxfishes juvenile cover, Cover proposals, 5 aquarium photos, Points | Waiting for Pierre | His curation; the Light proposals are R73; **11-21:** Points holds three new fish phase conflicts after #1342 | Short | S |
| H5  | The analyses token's type, the R2 token's scope, the admin token before late January 2027 | Waiting for Pierre | Access; **11-21:** still in STATUS; the read-only R2 CI token is withdrawn (R35) | Medium | S |

### 4.4 His reports of 2026-11-20 (Reports tab, 17 rows)

Every one is in a row above: compared photos (#1316); the one-tap counters per subject and a card before the sea slugs'
next circle (#1318); Report out of More (#1319) and again on one page (N3); the admin help (#1320); the bannerfish
opening card (#1322); the two juvenile cards (#1323); four units open before a level is asked and species too early
(N1); species names before scientific names (N2); response time and the click (R103, R204-R206); bonus genera (R202b);
groups by scope (R220); a screenshot attached (N4).

## Appendix A: the audit's C and D entries, one by one

The audit's D section lists 65 entries split on " · ": 61 single ones (D1-D61) and 4 groups (D62-D65). Bucket: **[i]**
his words decide or park it; **[ii]** a rule or the integrator's call; **[iii]** its data gate met since; **W** a data,
trigger or third-party wait he agreed to; **I** an idea nobody decided; **X** obsolete or stale.

The appendix is the 11-20 reading of the audit; the refresh of 11-21 changed only C9 (now X: nothing to tag) and its
counts line. Where a row moved since, §3 gives its state today.

| #   | Entry                                                   | Bucket | Now (row)                                                      |
| --- | ------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| C1  | R2 clean-up                                             | -      | Waiting for Pierre (deleting data), R32                        |
| C2  | R2 read-only token                                      | -      | Waiting for Pierre (access), R35                               |
| C3  | Feedback sheet lines, his review                        | [i]    | «ok pour les 6 recommandations»: in play, his review optional, R43 |
| C4  | Fish mode leftovers                                     | -      | Admin Points, R59                                              |
| C5  | Species-mark drafts                                     | -      | His review (his 11-05 rule), R60b                              |
| C6  | `confTerm`                                              | I      | An agent proposal; ask only if proposed, R62                   |
| C7  | Fish prior refit, Q351 (b)                              | [iii]  | Measure now, R64                                               |
| C8  | The 8 unsure candidates                                 | -      | His hands, R69                                                 |
| C9  | Stopgap photos' `rep` tag                               | X      | 11-21: every FishBase main picture carries `rep`, R71b         |
| C10 | Light proposals                                         | -      | His hands; an A1 reading noted, not his answer, R73            |
| C11 | Fish ID Key into Identify                               | -      | Q439, R75                                                      |
| C12 | Fish key points                                         | -      | Admin Points, R80                                              |
| C13 | Learning algorithm review 2, 3, 5                       | X      | Overtaken, R101                                                |
| C14 | Near-duplicate groups                                   | -      | His hands, R115                                                |
| C15 | Matrix, Odd one out, Same or different?                 | -      | Q439, R165, R176, R177                                         |
| C16 | Mimicry rest                                            | [i]    | Find the X on the pair decided (Q416 c), R67; M7/C11 his, R67c |
| C17 | Trainer list storage; benthos                           | -      | STATUS questions, R220b, R223                                  |
| D1  | CI speed                                                | I      | R33                                                            |
| D2  | Out-of-zone photos                                      | [i]    | Obsolete (Q230), R41                                           |
| D3  | iNaturalist API v2                                      | I      | R40                                                            |
| D4  | More fish photos                                        | I      | R42                                                            |
| D5  | Coral ID Key photos                                     | [i]    | Decided, waits for photos (Q293), R45                          |
| D6  | Multiple-testing (a)-(e)                                | I      | R48                                                            |
| D7  | Did you know (b)-(h)                                    | [i]    | Decided one at a time (11-04), R49                             |
| D8  | Sheet readers                                           | W      | His 11-03 request, R50                                         |
| D9  | Activity C3, D                                          | [i]    | A wish in his words, R51b                                      |
| D10 | Professionalise                                         | [i]    | Parked by him with a trigger, R52                              |
| D11 | First-launch recalibration                              | W      | R53                                                            |
| D12 | Photo quiz pressing                                     | W      | R54                                                            |
| D13 | Fish photo exposure                                     | [iii]  | Ready, R55                                                     |
| D14 | Unanswered photos in the hold                           | W      | R56                                                            |
| D15 | No new genus after a miss                               | I      | R57                                                            |
| D16 | Credits version line                                    | [ii]   | Queued 11-18, R58                                              |
| D17 | Ability calibration (1)-(9)                             | I      | R61                                                            |
| D18 | After 11-04 fixes (2)-(4)                               | I      | R62                                                            |
| D19 | `TYPED` tuning, re-test, dynamic share                  | W      | R37b                                                           |
| D20 | Fish look-alikes at any rank                            | W      | His 11-04 design, R66                                          |
| D21 | Mimicry reverse trap                                    | [i]    | Q416 (a) "ok", waits data, R67b                                |
| D22 | RLS counts                                              | W      | R70                                                            |
| D23 | rfishbase snapshot                                      | W      | Yearly, R71c                                                   |
| D24 | Contrast correction                                     | [i]    | His doubt: an idea in his words, R74                           |
| D25 | Fish hunt achievements                                  | [i]    | Decided 11-04 (#467), R76c                                     |
| D26 | Danger zone, "lower" card                               | [i]    | His 11-08 words on the level cards; data gate, R77b            |
| D27 | Fish basics glossary, deck                              | I      | R79                                                            |
| D28 | Fish families left out                                  | [i]    | Q216 trigger, R81                                              |
| D29 | Trace IMR lecture photos                                | [i]    | Done (11-20 05:46), R82                                        |
| D30 | Corals of the World permission                          | [i]    | Trigger, R83                                                   |
| D31 | Lecture photos second pass                              | [i]    | Trigger, R84                                                   |
| D32 | Genus-step re-offer, coral species knowledge            | I      | R85 (the fish path row's ideas)                                |
| D33 | Scientific genera reading                               | W      | R86                                                            |
| D34 | Fish genera further pairs                               | [i]    | Q418 (b), waits data, R87                                      |
| D35 | Auto-sort measures                                      | [ii]   | Read-only measures, integrator's call, R90                     |
| D36 | ES modules                                              | I      | R92                                                            |
| D37 | One-tap targets                                         | W      | R95                                                            |
| D38 | Level-dependent target                                  | W      | R96                                                            |
| D39 | Profiles fitted                                         | W      | R97                                                            |
| D40 | Lecture position bias                                   | W      | R98                                                            |
| D41 | Comeback                                                | W      | R99                                                            |
| D42 | Next round of reviews                                   | [i]    | Trigger (11-08), R100                                          |
| D43 | Time in the photo rating                                | [i]    | His 11-20 report: re-measure now, R103                         |
| D44 | Photo memory table                                      | W      | Milestone not read, R104                                       |
| D45 | More duels                                              | W      | Tried, no gain; his 11-02 request partly built, R105           |
| D46 | Name re-test                                            | [i]    | Q124, waits ~650 trials, R106                                  |
| D47 | Few genera photo difficulty                             | W      | R107                                                           |
| D48 | Short lessons                                           | [i]    | "To think about" in his words, R108                            |
| D49 | Photo-level features                                    | W      | R110                                                           |
| D50 | Featured suggestions                                    | W      | R111                                                           |
| D51 | Calibrated sets                                         | X      | Declined (L14 no), R112                                        |
| D52 | Taxonomy refresh                                        | [ii]   | Monthly (Q49), R113                                            |
| D53 | Growth-form guesses                                     | W      | On his request, R114                                           |
| D54 | Fish and sea slug duplicate finder                      | [ii]   | R115's process for every subject (rule S1)                     |
| D55 | Tour leftovers                                          | [ii]   | Queued 11-18, R116                                             |
| D56 | Paliform lobes                                          | W      | R117                                                           |
| D57 | Domain rename                                           | [i]    | Trigger (11-18), R122                                          |
| D58 | Sea slugs "sp. N"                                       | W      | R124                                                           |
| D59 | Placement step 3, fish set                              | [iii]  | Decided 11-18; its gate (20+ answers a photo) not read, R127   |
| D60 | First-launch follow-ups                                 | I      | Agent notes of 11-03, R131                                     |
| D61 | Live mode after v1                                      | [iii]  | The sea slugs hostable since #1051, R166; the rest ideas, R166b |
| D62 | Formats group (photo → trait … Trainer's set)           | I      | R167-R186; Down the tree and Life stages are decided (R179, R180) |
| D63 | Parked bullets                                          | [ii]   | Try again queued 11-18 (R192); the rest R193-R195              |
| D64 | Parked table                                            | [i]    | Enlargement and response time decided by his 11-20 words (R204-R206); bonus genera (R202b); the rest R199-R214 |
| D65 | Long term                                               | I      | R221-R225                                                      |

Counts (by script, §6). D1-D61: [i] 19, [ii] 5, [iii] 3, W 22, I 11, X 1. The groups D62-D65: [i] 1, [ii] 1, I 2,
each holding decided parts named in its cell. C1-C17: [i] 2, [iii] 1, I 1, X 2 (C9 moved from [ii] on 11-21), and 11
that are truly his (a question, his review or his hands). The [i] split of §1.1 (7 to build, 7 parked with a trigger, 3 a wish or doubt, 2
done or declined) is read from the "Now" cells above.

## 5. What changed in the docs (this PR)

The bullets before the last are the PR as written on 11-20 (the PRs they call open have all merged since); the last
bullet is the refresh of 11-21.

- **ROADMAP**: 25 rows corrected (state and source, his words quoted, or a reading marked as one): R31, R43, R55, R58,
  R60, R64, R72, R73 (a note only), R76, R85, R101, R103, R106, R116, R123, R125, R166, R192, R202, R203, R204, R205,
  R206, R212, R220. R153 deleted (built). Two new rows in "Next": N1 with N2, and N5. N3 and N4 are not added: #1319
  (open) adds their rows and ledger entries.
- **Left to the open PRs that edit them**: R91, R121 and the other rows #1298 touches (Admin opening, Domain rename,
  FishBase, More subjects, Taxonomy, Sea slugs); R164 (#1299); R102 (#1310); R163 (#1279). §3 gives their state; their
  ROADMAP cells are not touched here. **Conflicts to expect**: R72 with #1313 (both edit "Fish photo judging, next");
  the ANSWERS tail with #1316, #1318, #1319, #1320, #1321, #1322 and #1323, which all append there.
- **Not corrected in the ROADMAP**: rows whose §3 state only adds a reason (a held file, a count not read) keep their
  status cell; §3 is the reading of 2026-11-20.
- **ANSWERS**: 13 entries under 2026-11-20: his request of 17:12; the reports of the day not recorded on any open PR
  (opening by four, species names, response time, bonus genera, groups by scope); and the older words the ledger lacked
  (the beta's Remove all, Q265 verbatim, the IMR edition, outside the Philippines, the species marks, Q435 (a)); plus a
  note that the A1 reading on Q308 is a reading, not his answer.
- **The reviews index**: this file's row.
- STATUS is not edited (the integrator's): its "Questions for Pierre" still lists two questions that look settled
  (§1.4).
- **The refresh of 2026-11-21** (main merged in at `93cffa96e`, then `7fd48432f`; the ROADMAP settled row by row against main, a 3-way
  view of each row): against main, this PR now changes 18 ROADMAP rows, deletes 2 and adds 1. Main's later text won
  wherever main measured or built a row (learnsim, the learning-algorithm review, the time terms, the fish prior: the
  PR's "Next: re-measure" readings were dropped, the measures of #1341 having run); the PR's quotes of his words were
  kept on top of main's text (the IMR content row, Roles, Enlargement, the fish prior's Q435 (a)). Rows corrected in the
  refresh: "Fish photo judging, next" (the judged ease measured, #1313 built, the flags after #1342), the opening row
  (in review, #1331), "Name-similarity confusion" ((h) free). **Deleted**: R153 (built) and the fish photo exposure
  re-measure (R55): measured by #1341, its last open part, the cap, closed by the integrator's per-answer check of 11-21
  (8.7%, under the 10% bar; the units over it `RARE.FEW` by design), which is not in the repo. The rows main deleted as
  built (the Learn list photo, `data/`, Report again, Try again) stay deleted. ANSWERS gets nothing new: the answers of
  11-21 are #1350's. **Conflicts to expect** with #1350 (merging first): the Bonus genera and Roles rows, which both
  edit; #1350's text is taken there and this PR's quote kept where #1350 lacks it.

## 6. What I checked and what I did not

- **Checked**: every ROADMAP row's status cell and, for the audit's C and D rows, the whole row; the sources of §2,
  with the searches named there; the files of the 14 PRs open at 17:07 (`gh api pulls/N/files`, a watched list of 16 files); `admin.js` for a "remove all"
  beta button (none: "Add all" only); `live.js` subjects through the modes plan; #467 and #458 for the hunt set and the
  Danger zone.
- **Counted by script**: the state counts of §1.1, from the State column of §3 and §4.
- **Not read**: Pierre's chat with the integrator (only what STATUS, ANSWERS and the PRs recorded can be found here);
  ANSWERS before 2026-11-18 entry by entry (searched only); `docs/decisions/` beyond the three records cited; the other
  reviews beyond their marker lines; LEARNING.md and INTEGRATOR.md beyond keyword greps; the sheet's Answers and Events
  tabs, so every data gate's count is the last one recorded in the docs.
- **Paraphrases**: a "(paraphrase)" cell rests on an agent's wording of his answer (STATUS or a PR), never on his words.
- No simulation was run; nothing in the app or the data changed.
- **The refresh of 2026-11-21, checked**: `git log --first-parent 01bb16add..7fd48432f` (the merged PRs, mapped to their
  rows by their titles, bodies where needed and the ROADMAP rows they changed); every ROADMAP row of `01bb16add`
  compared with today's by a script (removed, status changed, text changed); the file lists of the 6 PRs open in the morning; the
  remote branches without a PR (`git ls-remote --heads` against the open PRs' heads); STATUS on main (#1343) for the
  open questions; the ledger PR #1350's ANSWERS entries for his answers of 05:32-05:42. The counts of §1.1 and the
  appendix line are from the same script as on 11-20 (§6 above), run on this file before and after the refresh.
- **Not checked by me in the refresh**: R55's cap figure and R71b's `rep` tags are the integrator's checks of 11-21
  (not in the repo), taken as given; the rows nothing merged touched keep their 11-20 reading, data gates included.

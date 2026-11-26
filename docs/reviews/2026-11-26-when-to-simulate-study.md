# When to simulate: what requires a simulation today, what simulations decided, and a proposed rule set (2026-11-26)

**Status: study (Decision input, docs only).** Asked in chat by the integrator on Pierre's words of 2026-11-26 (below).
Nothing in the rules, the tools or the app changes here: the wording in §7 is a proposal, and rules L10, L11 and L12
stay as they are until Pierre gives his OK (AGENTS.md "The rules"). It follows the 2026-11-21 discussion note
([2026-11-21-simulation-scope.md](2026-11-21-simulation-scope.md)) and the L11 paragraph "What a simulation decides,
and what it does not" that came from it (REE-71, 2026-11-23). Labels (rule W11): **[read]** read in a PR body, a doc,
the ledger or Linear; **[count]** counted by a script over PR bodies or git; **[guess]** my judgement.

## 0. In short

- **What requires a simulation today** (§2): three rules (L10, L11's level table, L12's "checked twice"), three process
  triggers (the integrator's checklist, Codex's review, the Linear issues whose completion evidence is "the simulation
  tables"), five tools of about 4,000 lines, two CI jobs and one manual workflow. Rule L11 picks the check by the
  change's *possible effect* (what it touches), not by whether a simulation can answer the question asked.
- **What the simulations did** (§3, a census of the 45 engine PRs from #790 to #1584 that declared level 1, 2 or 3):
  - they **changed the design in 4** (#855, #871, #975, #1331): two on a question of mechanics (#1331's group of four
    that came up to 7 times later; #975's rank share that held back the IMR genera), two on a simulated beginner's
    level or pace (#855, #871);
  - they **stopped 3 changes** (#808, #852, #1304), and #808's idea came back 12 days later as #1357, merged over a
    breached guardrail;
  - they **sent a simulation result to Pierre 17 times** (counted in the answers ledger, §3.2). He kept the change as
    built 13 times (10 of them with his words on the breach itself), chose a variant twice (Q338, Q355), closed the PR
    once (Q335) and, today, dropped the simulation (#1571);
  - they had **no bearing on the decision in 19**, and could not be run in 4;
  - **the simulator or its noise misled at least 4 checks** inside the census (a 3-seed breach that vanished at 20 seeds,
    an A/A comparison that read like a breach, a broken pairing), plus at least 6 tool bugs outside it (REE-249,
    REE-262, REE-281, among others).
- **What they cost** (§4): little on GitHub runners (2,355 runner-minutes, 1.4% of November's Actions, the CI cost
  study); much more in Pierre's attention (17 escalations), in waits (#1571 waited about 24 hours for a choice the simulation had
  raised), in the shared machine (#1099: 8.9 hours of runner time; #1067: 2 hours against 40 minutes declared), and in
  upkeep (78 commits on the simulation tools on `main`).
- **The 2026-11-23 scope paragraph did not change the practice** (§3.6): the next two level-2 PRs (#1519, #1571) still
  ran an effect simulation and turned its breaches into questions for Pierre, the second on sea slugs with 168 real
  answers.
- **Proposed** (§7): name the question first. A **regression check** always (cheap, no statistics). A **mechanics
  simulation** when the question follows from the rules alone, the simulator models the mechanism, and the answer would
  change what is built. **No effect simulation**: how real players learn is for the real log (rule L12) and for use.
  **While real data is lacking**: build on the logic, keep it reversible, say the expected cost in one line, open a Data
  issue with a gate, and come back at the gate. Pierre hears only of a **failure-sized** result.
- **Questions for Pierre** (§9): S1 the four questions in place of the levels; S2 L12 without "learnsim for every
  change"; S3 what goes to him; S4 the default data gate; S5 which earlier words this supersedes.

## 1. Pierre's words

- **2026-11-26 09:16** (REE-241, on the judged-ease prior, relayed by the integrator): «on a tellement peu de données
  réelles sur les nudibranches que toutes les simulations du monde ne pourront pas savoir si c'est ok ou pas. Je
  propose de juste implémenter sans simuler. Et de revenir simuler une fois qu'on aura un nombre suffisant de
  réponses.»
- **2026-11-26 09:19** (relayed by the integrator; the request for this study): «De manière générale il faut vraiment
  revenir sur cette tendance à vouloir appliquer une simulation pour toute modif du moteur. Je sais que c'est
  probablement contraire à des choses que j'ai dit au début du projet, mais maintenant qu'on a un meilleur recul il
  faut probablement affiner nos règles.»
- **2026-11-21 13:23-13:25** (on #1357's breach; [the discussion note](2026-11-21-simulation-scope.md)): «des fois j'ai
  l'impression qu'on ne regarde plus que la simulation pour déterminer si ça a fait du sens ou pas»; «on met la
  simulation avant la simple logique»; and the caution this study keeps: «il faut pas non plus l'inverser complètement
  et le transformer plus qu'en garde-fou … les simulations ont ses utilités, mais il faut déterminer dans quel contexte».
- **2026-11-21 05:40** (#1331, rule L4): «il faudra vérifier à l'usage, mais je pense que c'est une bonne idée, quel que
  soit l'impact que ça a pour l'instant sur les simulations.»
- **2026-11-19 14:42** (Q432, #1099's two breaches): «Ok. Je sais même pas pourquoi on se pose la question. C'est juste
  évident». 08:53 (Q420): «Il n'y a aucune raison que ça influence les résultats...».
- **2026-11-17** («6h de calcul ne devrait JAMAIS arriver», #1060, #1042): the 40-minute cap followed (Q405). The same
  evening he "questioned simulating a subject with no data" (ledger, paraphrase): that reached #1060 (no learnsim for the
  sea slugs) but never the rule. #1519 (11-24) still ran a level-2 check on the fish, saying no sea slug world existed;
  #1571 (11-25) then simulated the sea slugs, with 168 real answers in the log.
- **Earlier** (the habit's origin): Q188, 2026-11-06 15:35, "only after simulation; decide nothing the simulation
  contradicts"; Q315, 2026-11-09, option (1) "must go through the L11 level-2 simulation before it can go live"; L11's
  levels, 2026-11-08 (#735). §8 lists them with their scope.

## 2. Inventory: what requires or runs a simulation today

### 2.1 In the rules [read]

| Where | What it requires | Kind of question |
| --- | --- | --- |
| L10 (`docs/rules/learning.md`) | "A new variable there needs its learnsim check per answer, right and wrong" | effect, for every new first-launch variable |
| L11, the level table | level 1 (a constant nudged, a rare situation): the app world, 5 seeds × 300 questions; level 2 (the draw, the bar, the opening, the levels, the score): the rated world 10 seeds (20 if unclear) × 3,000 or 10,000 answers, "every guardrail"; level 3: Pierre's go, runners | effect, picked by what the change *touches* ("in doubt, the higher one") |
| L11, "Progressive" | a declared primary, a stratified sign-flip test, Holm; guardrails at fine margins (−1 point of score, +0.03 over-claim, −0.02 knowledge); "breached, or a cost not declared, goes to Pierre" | effect, at margins I judge smaller than the learner model's own uncertainty [guess; §3.5 shows the noise reaching them] |
| L11, "What a simulation decides" (11-23) | mechanics, bugs and extremes, equivalence, rough starting values: yes; how people learn, an unmodelled signal, small differences: no | the right scope, but it sits *below* the level table, which still triggers the runs |
| L12 | "Any change to the learning algorithm … is checked twice before its PR: in `tools/learnsim.js` (5 seeds …) and on the real answer log" | effect, for every engine change |
| W27 (`docs/rules/ship.md`) | "A simulation reads only what is declared"; "a check longer than 40 minutes is a tooling bug" (both from #843) | cost control |
| W24 | every heavy run takes the machine slot | cost control |
| AGENTS.md "Read on demand" | "L11–L12 before a run" | pointer |

### 2.2 In the process [read]

- **The integrator's checklist**: `docs/INTEGRATOR.md` "Learning changes need rule L11-L12 checks (learnsim before/after, 4
  profiles × 5 seeds) or Codex flags them".
- **Codex's review** asks for them: #857 ("added after Codex's finding"), #1116, #1133 ("asked by Codex"), #1148 and
  #1391 ("Codex P1"), #1273 ("Codex's finding, answered").
- **Linear issues whose next action or completion evidence is a simulation**: REE-245 (the continuous ease draw: "a
  simulation for the draw mechanics … a merged PR, with the simulation tables"), REE-241 (until this morning: "a merged
  PR with the simulation tables"), REE-187 (a learnsim arm, only if the real log shows late families), REE-97 (the profiles fitted to real players, gate: 10 players with 200+ answers), REE-304
  (sea slugs, at its gate: "run the simulation if it then helps").
- **The decisions that quote a simulation** as their condition: Q188, Q315, Q457 («ok», "later, with a simulation").

### 2.3 Tools [count]

| Tool | Lines | What it is for |
| --- | ---: | --- |
| `tools/learnsim.js` | 1,955 | the app world: the real app in Chromium with a simulated learner; also makes saved players for `answercost.js` |
| `tools/ratedworld.js` | 1,061 | the rated world: synthetic units, photos and players with known difficulty, the app's engine in Node |
| `tools/learncmp.js` | 681 | the paired comparison, the guardrails and their margins |
| `tools/checkbudget.js` | 221 | the 40-minute budget, the level-3 gate |
| `tools/learnprof.js` | 129 | the profiles (assumptions, not fits: LEARNING.md "Profiles") |
| `tools/answercost.js` | 1,063 | work counted per answer on simulated saved players (a regression check, not a learning one) |

78 commits on `main` touch the first five (`git log -- tools/learnsim.js tools/ratedworld.js tools/learncmp.js
tools/checkbudget.js tools/learnprof.js`), 81 with `.github/workflows/learncheck.yml` [count].

### 2.4 CI [read]

- **Smokes, job `profiles`** (`tests/profiles.smoke.js`): three simulated players × 300 questions on every Smokes run;
  pacing checks with coarse thresholds (a beginner meets at most 17 genera by question 100, the expert more than the
  beginner, no page error…). A **regression** check.
- **Smokes, job `answer cost`** (`tools/answercost.js --budget`): saved players made by learnsim, the work per answer
  against ceilings. A **regression** check.
- **Learning check (tier 2)** (`learncheck.yml`, manual): both arms of learnsim and learncmp on runners, the 40-minute
  cap and the level-3 go built in. Runs **effect** checks.
- Unit tests that run the rated world or learnsim pieces: `tests/ratedworld.test.js`, `tests/learncmp.test.js`,
  `tests/checkbudget.test.js`, `tests/learncheck.test.js`, `tests/faof.test.js` and others (about 30 test files name one of
  these tools). Tests **of the tools**, plus equivalence checks (`faof`: the table equals the scan).

### 2.5 Three kinds, kept apart

Pierre's complaint is about the third kind only.

1. **Regression and equivalence**: "does the code still do what it did, or the same thing faster?" Same seed, same
   output; pacing within coarse bounds; work per answer under a ceiling. Examples: #998 and #1514 (byte-identical
   outputs with the false-alarm table), the REE-265 series (#1531 to #1603, level 0, answer-cost counts). Cheap,
   decisive, never sent to Pierre.
2. **Mechanics**: "what follows from the rules alone?" How many answers before a level opens, a unit that never opens, a
   cliff, a rule that never binds. Decisive when the answer does not depend on how the simulated learner learns.
3. **Effect and value**: "does it help real players learn, and which value is best?" The level-1/2/3 runs with a
   primary and fine guardrails. Here the simulated learner's assumptions decide the answer.

## 3. What the simulations did: a census of 45 engine PRs

**Method** [count, read]. Every PR from #790 (the first after L11's levels, #735, and the tools of 2026-11-08) to #1584
whose body declares rule L11 level 1, 2 or 3 for a change to the engine (study, rules, docs and tool PRs left out),
found through the REST search on "learnsim", "rated world", "learncmp", "level 1", "level 2", "level 3", "simulation"
(348 PRs matched any of them; a keyword count that also matches docs and comment-only PRs, so an upper bound, not a
census), then read one by one: what ran, what it found, and whether the result changed what shipped. My pattern for a
declared level missed #855, #1148, #1234 and #1584, added by reading. Appendix A lists each PR and its class. A PR found
by none of the searches is missing; I believe few are [guess].

| What the simulation did to the decision | PRs | Which |
| --- | ---: | --- |
| Changed the design | 4 | #855, #871, #975, #1331 |
| Stopped the change | 3 | #808 (Pierre, Q335), #852 (Q338's first arms), #1304 (`CAL.U`) |
| A simulation result sent to Pierre, change merged as built | 13 | #809, #857, #953, #1045, #1093, #1099, #1130, #1148, #1195, #1273, #1357, #1391, #1519 |
| Breaches sent to Pierre, simulation then dropped | 1 | #1571 (2026-11-26 09:16) |
| No bearing: held, or "the measure cannot tell" | 19 | #790, #822, #833, #834, #840, #885, #951, #1057, #1067, #1116, #1133, #1162, #1234, #1301, #1349, #1376, #1410, #1414, #1584 |
| Not run (no world for the subject, dormant code, or Pierre's 11-17 words) | 4 | #1049, #1060, #1412, #1433 |
| A breach whose outcome I did not trace | 1 | #1237 |
| **Total** | **45** | |

### 3.1 Where they helped [read]

Two of the four design changes answered a question of mechanics; the other two rest on how the simulated beginner's
level and pace move, which is the learner model's part (§3.4).

- **#1331** (rule L4, a level opens with 4 close units): the first version, which waited for room for four at once,
  put the first species **1.2 to 6.9 times later** (strong RA 215 → 1,473 answers). A bound declared before measuring
  caught it and the fallback shipped. A mechanics question, answered.
- **#975** (species, step 1): the run found that the rank share **held back an IMR player's IMR genera** (the lecture
  RA had no genus question by question 600), so they were left out (`shareFree`). It also compared three curves
  (m, m², m³) and kept m²: a value choice on simulated players, which §7 would leave to the logic and the real log.
- **#855** (Q338 b): no threshold on the global level protected the simulated beginner, so **#857 shipped the plain
  200-answer floor** without the level condition: a simpler rule (L11's own "simplest algorithm"). It rests on the
  simulated beginner's level path (0.56 at 200 answers, 1.09 at 500), so on the learner model.
- **#871** (Q350): the beginner's first Open Water came 62 → 112 answers; Pierre chose variant B (Q355). The group's
  wait is a mechanic; how long it lasts is the simulated beginner's pace.
- **#729** (11-08, before the census): 20 seeds of the real app found why about 21% of the draw before Open Water was
  hard photos (the target sits between ease 4 and 3 after two right answers): a mechanic, fixed by the cap.
- **#1234**: a recurring breach traced to counting the live answers themselves (rule L4), not to the fix. A useful
  diagnosis, but it changed nothing that shipped (classed N).
- **#642** (Q133, 11-06): the simulation showed the opening order did not need the confusion term, so it was dropped:
  a simplification.
- **Equivalence**: #998 and #1514 showed byte-identical outputs with the false-alarm table; the REE-265 series used the
  same-seed counts. These are the cheapest and clearest uses.

### 3.2 Where they escalated: 17 questions to Pierre [read, ledger]

Counted in `docs/ANSWERS.md`: Q335 (#808), Q338 (#855, #857), Q355 (#871), Q392 (#953, level 3 or accept), Q412
(#1130), Q413 (#1148), Q420 and Q432 (#1099), Q421 (#1045), Q426 (#1093), Q427 (#1195), Q440 (#1273), 2026-11-21 05:40
(#1331), 2026-11-21 13:23 (#1357), 2026-11-23 17:22 (#1391), 2026-11-24 13:50 (#1519), 2026-11-26 09:16 (#1571).

- **13 times he kept the change as built.** In 10 of them his answer was on the breach itself (Q413, Q420, Q421, Q426,
  Q427, Q432, Q440, 11-21 05:40, 11-21 13:23, 11-24 13:50), often with words that say the question did not need
  asking: «C'est juste évident» (Q432), «aucune raison que ça influence les résultats» (Q420), «quel que soit l'impact
  … sur les simulations» (#1331), «Donc ça va dans le bon sens» (#1519), «C'est pas un coup à partir du moment où
  c'est un mode de jeu qu'on ajoute» (Q440); and «ok» to the option "merge with no further simulation" (Q421; Q413 the
  same). In the other 3 the question was wider than the breach: Q392 is recorded only as a paraphrase ("a, b", level 3
  or accept), Q412 settled three choices including an unclear simulated cost, and 11-23 17:22 merged #1391 as a stop-gap.
- **Twice he chose a variant** the simulation had informed: Q355 (variant B) and Q338 (the ledger records "option b,
  above an Elo level", #857 records "option a, after 200 answers"; #855's run showed no level gate works, and #857
  shipped the floor alone with its cost accepted).
- **Once he closed the PR** (Q335, #808).
- **Once, today, he dropped the simulation** (#1571).

Most breaches sent to him were of the same kind: **the shown score about 1 to 1.5 points lower at 1,000 answers for one
profile, equal again by 3,000** (#1093, #1195, #1304, #1357), or the bar's under-claim shrinking toward the truth
(#809, #1148, #1519). These breaches are a point on a simulated player's bar, and nothing a real player would notice.

### 3.3 Where they blocked: #808, then #1357 [read]

#808 (time in the photo rating, option 1) had a clear gain on the real log (−1.03 × 10⁻³ per answer, 10 of 14 players
better, p 0.0015, Q318) and failed level 2 in three rounds of simulation; Pierre closed it on 2026-11-09 (Q335). On
2026-11-21 a related design (#1357) breached a rated-world guardrail in its turn, and Pierre merged it: «est-ce que la
simulation en elle-même, en fait, elle est réellement représentative de ce qui se passe réellement dans un cas
d'apprentissage avec des joueurs réels?». In #1357's rated world every player had the same time noise,
so the weighting the PR builds could not be tested there at all (the 2026-11-21 note). The real log said yes in both
cases, and the simulation said no both times.

### 3.4 Where the simulator could not see the change, or no real data anchored it [read]

- **#1195** (rule P1, no source boost): "Neither world, as run, can see a source's difficulty", and yet a level-2
  check ran at 20 seeds and its one breach went to Pierre (Q427).
- **#1357**: the time weighting was not modelled (above).
- **#1519** (ease weight 0.3): no sea slug world existed, so the sea slugs were not simulated; the fish runs went on.
- **#1571** (ease within a family): the simulation did see the change, and its exploratory arm was useful: it showed
  the ranking alone breached nothing and the prior's *level*, moving by about 0.17 logit, caused the sea slug breaches
  (first Open Water 56 → 78 answers for the beginner). That split informed the redesign note (#1610). But nothing
  anchored the sea slug learner: 168 real answers from 2 players (REE-304, measured 2026-11-26), and Pierre's answer was
  that no simulation could tell.
- **Profiles are assumptions**: no profile is fitted to real players (REE-97's gate, 10 players with 200+ answers, not
  met), and LEARNING.md says so for the fish ("These fish values are assumptions, not fits").

### 3.5 Where noise or the tool misled [read]

- **#1057**: an A/A comparison (two practice pools 23 observations apart) read a breach-sized difference; "any change to
  a practice pool sends each run down another path", so the paired design loses its pairing.
- **#1067**: the rated world drew the new genera on the seed's single stream, so the two arms played different worlds
  (the tool fixed mid-PR); the lecture RA's 3-seed breach was gone at 20 seeds.
- **#1099**: the level-1 breaches were not confirmed at level 2, which found two others.
- **#1414**: a 5-seed breach, gone at 20 seeds.
- **Outside the census**: REE-249 (#1502), the fish app world never recorded a right typed answer from 2026-11-06 to
  2026-11-23 and froze on one question from #1375; the inventory (#1512) rated 2 of its 11 rows high, and **no
  conclusion that touched players changed**. REE-262 (#1514): long fish runs cut at 40 minutes with 0 runs done, the
  plan's estimate a seventh of the truth. REE-281: one random stream for the whole world, so a photo bot refill broke
  two tests and left `main` red (#1546); and the regression kind is not free either: three PRs made the answer-cost
  count repeat on the same seed (#1552, #1557, #1559). #998 (a 10,000-answer check could not end in the workflow's 6 hours), #769
  (long runs crashed), #1094 (`main` red: the rated world counted held-out photos).

### 3.6 The 2026-11-23 scope paragraph did not change the practice [read]

L11's "What a simulation decides" was applied on 2026-11-23 (#1475). The next two level-2 engine PRs:

- **#1519** (opened 2026-11-24 05:05 Manila): a full level-2 effect check on runners, an undeclared cost, Pierre's answer needed
  (11-24 13:50).
- **#1571** (opened 2026-11-25 09:01 Manila): level 2 in both worlds, six breaches listed under "Choices I made", Pierre's answer
  needed (11-26 09:16), the answer being not to simulate.

The reason is structural: the level table above the paragraph still decides *when* to run ("it changes the opening
order players meet and every judged photo's prior" makes it level 2), and the paragraph only says how to *read* the
result. An agent following the rules in order runs the check first.

## 4. What they cost

- **Runners: cheap** [read, [2026-11-24-ci-compute-cost.md](2026-11-24-ci-compute-cost.md)]: 81 learning-check dispatches, 2,355
  runner-minutes, 1.4% of November's Actions to the 24th; p90 49 billed minutes a run. Runner money is not the problem.
- **The shared machine** [read]: #1099 used about 8.9 hours of runner time over 13 jobs (3 hours of wall time); #1067
  about 2 hours of worker time against 40 minutes declared; #822's local reader hit a 2-hour limit; on 2026-11-09 a
  three-hour simulation read 10,000 answers where the guardrails read 3,000 (W27's "Why"); on 2026-11-17 the run that
  drew «6h de calcul ne devrait JAMAIS arriver» (#1042, #1060). Since the 40-minute cap (Q405, #1274) a single check is
  bounded, but each one still holds a machine slot other agents wait for (W24).
- **Agent time** [count, `tools/effort.py --like`]: the PRs whose simulation went to Pierre took far longer than the
  median engine PR: #1519 10.1 h, #1331 13.0 h, #1357 6.7 h, #1391 44.2 h, against a median of 1.7 h for an M engine
  PR and 79 min for an L one (300 merged PRs). **Not separable**: that time runs from the first commit to green checks
  and includes Codex rounds and the wait for Pierre's answer, so it is an upper bound on what the simulation itself cost
  (#1519, #1331, #1357, #1391).
- **Pierre's attention**: 17 questions (§3.2), each with tables of cells, bounds and margins to read; 13 answered "as
  built".
- **Waits**: #1571 waited from 2026-11-25 09:01 to 2026-11-26 09:16 Manila on a choice its simulation raised (#1571); #808's
  idea, closed on 2026-11-09, came back merged on 2026-11-21 (#808, #1357); REE-245's build waits on "a simulation for
  the draw mechanics".
- **Upkeep**: 78 commits on the simulation tools; about 4,000 lines; at least 7 tool bugs since 2026-11-08 (#1067 inside the
  census, 6 outside), each found and fixed by an agent (§3.5).

## 5. What the literature says

Only the abstracts and catalogue pages were read; the full texts were not.

- Käser and Alexandron's systematic review of simulated learners (IJAIED, 2023/2024) finds that simulated learner
  models "tend to represent only narrow aspects of student learning" and that almost half of the studies give no
  evidence that the model is valid; they propose a Turing-like test as the validity criterion. Our profiles are in that
  half until REE-97 fits them.
- Doroudi, Aleven and Brunskill's Robust Evaluation Matrix (Learning @ Scale 2017) evaluates a teaching policy under
  *several* student models, because the model used to design a policy and the one used to test it can disagree; it is a
  way to detect when a policy may not work on real students. A practical reading for us: a conclusion that changes when
  the learner is swapped (the item learner against the count learner, the normal against the heavy-tailed photos) is
  about the learner, not about the rules.
- Their review of reinforcement learning for instructional sequencing (IJAIED, 2019) finds it most successful when
  constrained by theories from cognitive psychology and the learning sciences, which matches Pierre's «la simple
  logique» before the simulation.

## 6. Why the habit persists

1. **The trigger is the size of what the change touches, not the question.** L11's table makes "the draw, the bar, the
   opening, the levels, the score" level 2 whatever the simulator can see; "in doubt, the higher one".
2. **L12 asks learnsim for every engine change**, beside the real log.
3. **The margins are finer than the model** [guess]. A one-point score margin and a +0.03 over-claim margin are, I
   judge, below what an unfitted learner can resolve; the noise alone reaches them (#1057's A/A, #1067, #1414).
4. **Every breach goes to Pierre**, and a cost not declared before running too, so a check almost always becomes a
   question.
5. **Codex and the issues ask for it** (§2.2), and the earlier decisions quote it as a condition (Q188, Q315, Q457).
6. **The tools are good and available**, so running one feels like diligence. Each PR that runs one adds to the habit.

## 7. The proposed rule set (for Pierre's OK; not applied)

### 7.1 Name the question first

Before any check, the PR says in one line which question it answers. Only the first two can be answered by a simulation.

| Question | Example | What answers it |
| --- | --- | --- |
| **Regression**: does everything else still work? | a refactor, a speed-up, a decided change landing | unit tests, the smokes (with `profiles`), `answercost`; for a refactor, the same seed gives the same output |
| **Mechanics**: what follows from the rules alone? | does a level open; can a unit get stuck; is there a cliff; does the rule ever bind | a short simulation, when §7.3 holds |
| **Effect**: does it help real players learn? | a new term in the difficulty; a change to the draw's targeting | the logic of the feature, then the real log (rule L12) and use, when the change can be reverted |
| **Value**: which constant? | 0.3 or 0.4; N 10 or 12 | the real log when it holds enough answers; before that, the logic or Pierre's choice, labelled a starting value |

### 7.2 Regression check: always, cheap

Every engine change keeps the unit tests and the CI smokes (`profiles` and `answer cost` included). A refactor or a
speed-up shows the same output on the same seed (as #998, #1514). A decided change shows no **failure**: no page error,
no freeze, no unit that never opens, no level that never comes. No primary, no margins, no statistics, and nothing for
Pierre unless a failure shows.

### 7.3 Mechanics simulation: when it is worth it

Run one when **all** of these hold, and say so in the PR:

1. the question follows from the rules (§7.1), not from how people learn;
2. the mechanism the change acts through is in the simulator (if not, write "the simulator cannot see this" and skip);
3. the answer would change what is built: a choice between designs, a fallback, a bug (#1331, #975), not a
   confirmation of a rule already decided;
4. the outcome is **failure-sized**: declared before running as a coarse threshold a player would notice (twice later,
   never, stuck, a cliff), not a point of score;
5. the conclusion holds with the two learners (item and count) or both photo distributions; if it flips, it is about the
   learner, not the rules (§5).

Few seeds and one look are enough for a failure-sized threshold; the 40-minute cap stays, level 3 stays behind Pierre's
go on runners.

### 7.4 Effect: real data decides, not the simulation

No effect simulation decides whether a change helps players learn, nor a value. The logic of the feature and Pierre's
decision come first; the real log (rule L12) judges when it holds enough answers, by player; use by real players judges
when the change can be reverted. A simulation of an effect may still be run as **exploration**, labelled so, never as a
gate and never sent to Pierre as a breach.

### 7.5 While real data is lacking

When the real log cannot judge yet (a new subject, a rare situation, a signal not logged before):

1. build on the logic and on Pierre's decision;
2. keep it reversible: one constant or switch that turns it off, and no rules version where rule D5 allows;
3. say in the PR, in one line, the expected direction and the cost the arithmetic gives (e.g. "sea slug units start
   about 0.17 logit harder");
4. make sure what the later check needs is logged;
5. open a Data issue with its gate and the reading declared in advance (REE-304 is the model: "sea slug answers ≥ 1,500
   from ≥ 5 players, each with ≥ 100"); at the gate, read the real log, and simulate only if it then helps.

### 7.6 What goes to Pierre

A failure-sized mechanics result, a real-log reading against the change, or a cost the PR's own arithmetic says players
will feel. Not a simulated guardrail at a fine margin.

### 7.7 The wording, location by location

| Where | Today | Proposed |
| --- | --- | --- |
| L11, the paragraph "Checks are proportionate…" and the level table | the check by the change's possible effect, levels 0-3, "in doubt, the higher one"; level 1 and 2 runs with every guardrail | **Checks follow the question, not the size of the change.** The PR names its question in one line: regression, mechanics, effect or value. Every engine change keeps the regression check (unit tests, CI smokes, the same seed for a refactor). A simulation answers a mechanics question only, when the simulator models the mechanism and the answer would change what is built, against a failure-sized threshold declared before running. Effects and values are for the real log (rule L12) and for use, when the change can be reverted. |
| L11, "Progressive" and the guardrails | a primary, sign-flip, Holm, guardrails at LEARNING.md's margins; a breach or an undeclared cost goes to Pierre | kept for the rare mechanics run that needs a measure (the method stays in LEARNING.md); **a breach goes to Pierre only when it is failure-sized**, otherwise it is reported in the PR |
| L11, "What a simulation decides" | as worded on 2026-11-23 | kept, moved to the top of L11 as the rule's first paragraph, so it is read before any run |
| L11, the 40-minute cap and level 3 | as today | unchanged |
| L11, new paragraph | none | **While the real log cannot judge**: build on the logic and the decision, reversible, the expected cost in one line, what the later check needs logged, a Data issue with its gate and the reading declared in advance; come back at the gate |
| L12, first sentence | "checked twice before its PR: in `tools/learnsim.js` (5 seeds …) and on the real answer log" | "Any change to the learning algorithm is checked on the real answer log where it holds the answers to judge it (players as the unit); where it does not, the PR says so and a Data issue carries the check to its gate (rule L11)." The rest of L12 unchanged. |
| L10 | "A new variable there needs its learnsim check per answer, right and wrong" | "A new variable there is checked like any engine change (rule L11)" |
| `docs/INTEGRATOR.md` "Learning changes" | "need rule L11-L12 checks (learnsim before/after, 4 profiles × 5 seeds) or Codex flags them" | "name their question (rule L11): a regression check always; a simulation only for a mechanics question" |
| Issues REE-245, REE-187 | next action or completion evidence "a simulation", "the simulation tables" | reworded to the question each one asks (REE-245's draw is a mechanics question: a cliff, a share; keep a short mechanics run there) |

Pierre's caution of 2026-11-21 («il faut pas non plus l'inverser complètement et le transformer plus qu'en garde-fou»)
stays visible: this does not reduce the simulation to a guardrail only. A mechanics simulation still decides a design
(§3.1, §7.8). The proposal takes the simulation away where it decided nothing or misled (§3.2 to §3.5).

### 7.8 Back-test: the 7 PRs where a simulation changed or stopped the change

What the proposal would have run on each, and what would have been lost [guess, from the PR bodies]:

| PR | Under §7 | Lost |
| --- | --- | --- |
| #1331 | run: a mechanics question, a "2× later" bound declared, a design choice at stake | nothing |
| #975 | the held-back IMR genera: caught by §7.2's failure check ("a level that never comes": no genus question by 600) or a §7.3 run; the m² curve: a value, left to the logic and Pierre | the comparison of three curves on simulated players |
| #871 | probably run: "the first level 62 → 112 answers" is near a "2× later" failure bound, and the group's wait is a mechanic | little, if the threshold is set near 1.5×; Q355 otherwise |
| #855 | not run as a gate: whether a level gate protects a beginner depends on the learner's level path (criterion 5) | the evidence that no gate works; the floor alone, which shipped, is what L11's "simplest algorithm" and Pierre's «le niveau Elo n'est pas stable avant un paquet de réponses» already point to |
| #808 | not run: an effect; the real log's clear gain decides | the finding that the photos' ranking improved while the ratings' spread worsened, which a real-log check could also look at; the change would have shipped 12 days before #1357 |
| #852 | not run: a value choice (N) | nothing decisive: #857 shipped the floor alone |
| #1304 | not run: a value choice (`CAL.U`) before data | the simulated reason not to change it; with no real-log gain, the logic keeps the current value anyway |

So the proposal keeps the two mechanics uses (#1331, #975's held-back genera), probably #871's, and gives up the
value comparisons and #855's evidence, which fall to the logic, Pierre's choice or the real log.

## 8. Earlier words a new rule would touch

| Words | Their scope | Under the proposal |
| --- | --- | --- |
| Q188, 2026-11-06 15:35: "only after simulation; decide nothing the simulation contradicts" | the photo exposure package (cap 40, γ 0.3, colony memory: #685) | superseded for effects and values; a mechanics result still stands |
| Q112, 2026-11-06: "simulation first" (the progress study) | asked, no answer recorded | moot |
| Q315, 2026-11-09: option (1) must pass level 2 before going live | the time term, option (1) | already overtaken by #1357 (11-21) |
| Q405, Q415 (11-18, 11-19): the 40-minute cap, level 3 off this machine, LEARNING.md's level-2 figures the minimum | every check | the cap and level 3 kept; "level 2's figures the minimum" applies only to a run that §7.3 allows |
| L11's levels, 2026-11-08 (#735) | every learning change | replaced by §7.1 if S1 is yes |
| Q457, 2026-11-23: «ok», "later, with a simulation" | REE-241 | already overtaken by today's 09:16 answer |
| 2026-11-17: questioned simulating a subject with no data | the sea slugs | becomes §7.5 |

## 9. Questions for Pierre

- **S1. Pick the check by the question, not by the change's size?** (A) Replace L11's levels with §7.1-§7.3: a
  regression check always, a mechanics simulation only when §7.3 holds, no effect simulation. (B) Keep the levels and add
  two exemptions: "the simulator cannot see the mechanism" and "the subject has too little data". (C) No change.
  **Recommended: A.** B keeps the trigger that ran #1519 and #1571 after the 11-23 paragraph. A is simpler; it keeps the
  mechanics uses that changed a design (#1331, #975's held-back genera, probably #871) and gives up the value
  comparisons and #855's evidence (§7.8), which fall to the logic, your choice or the real log.
- **S2. L12 without "learnsim for every change"?** The real log judges where it holds the answers; where it does not, a
  Data issue carries the check. **Recommended: yes.** The real log is the measure his rules already trust; the learnsim
  half of L12 is the effect simulation of S1.
- **S3. What goes to you?** Only a failure-sized mechanics result, a real-log reading against the change, or a cost the
  arithmetic says players will feel; a fine-margin guardrail is reported in the PR, not asked. **Recommended: yes**
  (13 of the 17 questions of §3.2 came back "as built", 10 of them with words on the breach itself).
- **S4. A default gate for a Data issue that proposes none?** (a) REE-304's form, about 1,500 answers from at least 5
  players with at least 100 each, per subject; (b) REE-97's 10 players with 200+ answers; (c) each issue sets its own,
  no default. **Recommended: (c) with (a) as the fallback**: the gate depends on what is measured, and the integrator
  proposes it in the issue (easy to correct).
- **S5. Which earlier words does this supersede?** §8's table: Q188 and L11's levels for effects and values; the cap,
  level 3 and the regression smokes kept. **Recommended: as in §8.**

## 10. What this study did not check

- The census reads PR bodies, not the runs; where a body is unclear I classed it by its own words. PRs found by none of
  the searches are missing (§3).
- Agent time per PR could not be split between the simulation, Codex rounds and waits (§4).
- The real-player value of the 4 designs the simulation changed (§3.1) is not measured: they are judged on their logic.
- The literature was read through abstracts only (§5).
- No simulation was run for this study, and the sheet was not read.

## Appendix A: the census

L = the level the PR declared. Class: **D** changed the design, **S** stopped, **P** breach to Pierre then merged as
built, **P0** breach to Pierre then the simulation dropped, **N** no bearing, **X** not run, **?** not traced.

| PR | L | Class | What the simulation found or did |
| --- | --- | --- | --- |
| #790 | 1 | N | held; the real log could not tell; shipped on its reason |
| #808 | 2 | S | 3 rounds failed level 2; closed (Q335); real log clear gain |
| #809 | 1 | P | over-claim breach on every fish profile, the bar still under the truth; accepted |
| #822 | 2 | N | the rule rarely binds; no breach; a local reader hit 2 hours |
| #833 | 1 | N | closed unmerged, replaced by #834 |
| #834 | 1 | N | no change expected, none found |
| #840 | 1 | N | held |
| #852 | 2 | S | Q338 (a)'s arms breached; not adopted |
| #855 | 2 | D | no level gate works; #857 drops the level condition |
| #857 | 2 | P | regression of the decided value; cost accepted (Q338) |
| #871 | 2 | D | first Open Water 62 → 112; variant B (Q355) |
| #885 | 2, 3 | N | level 3 on one unclear cell, 40 seeds: held |
| #951 | 1 | N | the cost reported; a smaller value would need level 3 |
| #953 | 2 | P | declared cost breached as declared; level 3 or accept (Q392) |
| #975 | 2 | D | found the IMR genera held back; curve m² chosen among three |
| #1045 | 1 | P | over-claim breach; «ok» to "merge with no further simulation" (Q421) |
| #1049 | 1 | X | no learnsim (Pierre, 11-17) |
| #1057 | 1, 3 | N | an A/A comparison read breach-sized: the variants could not be told apart |
| #1060 | 1 | X | sea slugs, almost no answers: no learnsim (Pierre, 11-17) |
| #1067 | 2 | N | the tool broke the pairing; a 3-seed breach gone at 20 seeds |
| #1093 | 2 | P | strong RA's score −1.4 at 1,000, equal at 3,000 (Q426) |
| #1099 | 1, 2 | P | level-1 breaches not confirmed; level 2 found two others (Q420, Q432) |
| #1116 | 1, 2 | N | no breach at 20 seeds |
| #1130 | 1 | P | the beginner's cost unclear; merged as is (Q412) |
| #1133 | 1 | N | the primary could not tell (7 pairs) |
| #1148 | 1 | P | over-claim breach, the bar closer to the truth (Q413) |
| #1162 | 1 | N | held |
| #1195 | 2 | P | neither world could see a source's difficulty; one breach (Q427) |
| #1234 | 1, 2 | N | a recurring breach traced to counting live answers (rule L4) |
| #1237 | 1 | ? | a plateau breach; outcome not traced |
| #1273 | 2 | P | about 1.3 fewer scientific genera at Advanced (Q440) |
| #1301 | 1 | N | held |
| #1304 | 2 | S | `CAL.U` 0.25: score −1.3 at 1,000, no gain in knowledge; not adopted |
| #1331 | 2 | D | room-for-four 1.2-6.9× later, fallback shipped; plateau breach accepted (11-21 05:40) |
| #1349 | 1 | N | held |
| #1357 | 2 | P | the weighting not modelled; score −1 to −1.4 at 1,000 (11-21 13:23) |
| #1376 | 1 | N | the primary could not tell |
| #1391 | 1, 2 | P | declared cost breached with heavy tails; merged as a stop-gap (11-23 17:22) |
| #1410 | 1 | N | held |
| #1412 | 1 | X | dormant on today's data |
| #1414 | 1, 2 | N | a 5-seed breach, gone at 20 seeds |
| #1433 | 1 | X | no sea slug world |
| #1519 | 2 | P | an undeclared cost; sea slugs not simulated (11-24 13:50) |
| #1571 | 2 | P0 | sea slug breaches from the level shift, split from the ranking by an exploratory arm; no simulation (11-26 09:16) |
| #1584 | 1 | N | a regression use: no value moves in any flow, fix against main and main against main |

## Sources

- Käser, T. and Alexandron, G. (2024). Simulated Learners in Educational Technology: A Systematic Literature Review and
  a Turing-like Test. *International Journal of Artificial Intelligence in Education* 34(2), 545-585
  (<https://doi.org/10.1007/s40593-023-00337-2>). Abstract read.
- Doroudi, S., Aleven, V. and Brunskill, E. (2017). Robust Evaluation Matrix: Towards a More Principled Offline
  Exploration of Instructional Policies. *Proceedings of the Fourth ACM Conference on Learning @ Scale*, 3-12
  (<https://doi.org/10.1145/3051457.3051463>). Abstract read.
- Doroudi, S., Aleven, V. and Brunskill, E. (2019). Where's the Reward? A Review of Reinforcement Learning for
  Instructional Sequencing. *International Journal of Artificial Intelligence in Education* 29(4), 568-620
  (<https://doi.org/10.1007/s40593-019-00187-x>). Abstract read.
- In the repository: rules L10-L12 (`docs/rules/learning.md`), W24 and W27 (`docs/rules/ship.md`), LEARNING.md
  "Validating a learning change", `docs/ANSWERS.md`, the reviews cited above, the PR bodies of Appendix A (REST API),
  and of #1502, #1512, #1514 (REE-249, REE-262); Linear REE-71, REE-97, REE-187, REE-191, REE-241, REE-245, REE-281
  (with its comments), REE-304.

# Opening by confusion group: a study

2026-11-06, for Pierre. Design study, no app code changed (`origin/main` `cc331f93`). It reframes question **k**
("partner pull") of the [fish confusion study](2026-11-05-fish-confusion-study.md) and reports Q140.

**Pierre (2026-11-06).** Look-alike taxa (any rank) must open close together, well before an exam; when one opens, the
others must follow. Form **confusion groups** from the confusion matrices and decide whether to open a group or a lone
taxon (an interest, probability or difficulty per group). Fish first; corals too? **07:18**: taxa still open one at a
time; once a group is chosen, its members take the next openings in a row. **07:25**: "I follow the IMR course" must
unlock the IMR families and genera quickly and first; and Q140 approved as a simulation.

Marks: **[repo]** the repository; **[log]** the real answer log; **[sim]** `tools/learnsim.js`; **[ours]** our reading.

---

## 0. Summary

1. **Nothing ties a taxon to its look-alikes when it opens.** `openPick` draws each unit alone and its confusability
   pushes each look-alike later, separately. Real log: look-alike genera first met a median **73.5 answers apart**, no
   closer than any two genera (64.5); simulation: 53-123 questions apart by profile. Traps only use units already met.
2. **The literature backs Pierre**: interleaving similar categories beats blocking (meta-analysis g = 0.42, strongest
   for similar visual categories) because it juxtaposes them; spacing that breaks the juxtaposition hurts. A first
   meeting then mixing loses nothing (one at a time is fine); similar sets are harder to start.
3. **Design**: confusion groups by average-linkage clustering of the pooled score, joined at `CONF.TRAP` (0.2), at most
   **G_MAX = 3**: corals 11 groups and 13 lone genera, fish entries 6 groups (the IMR look-alike sets) and 13 lone.
   **Once a group has a member open, its others are the next openings, one at a time** (Pierre, 07:18); otherwise a
   group or lone taxon is drawn with today's weight on the group's means. Everything else unchanged; one new constant.
4. **IMR priority** (07:25) decides what is eligible and how soon; the groups order what is eligible. The coral lecture
   groups do not order the opening today: the slate is the IMR priority. "I'm at IMR" fish: scientific genera on early.
5. **Simulation** (field learner, seeds 1-30, 4 profiles, 600 questions): partners **4-5 times closer** (beginner
   123 → 25 questions). All three primaries pass Holm, small effects: look-alike accuracy +0.006 at q300 (+0.020
   beginner), +0.002 at q600, +0.44 genera in the exam by q600. Guardrails held (strong RA's overclaim at the margin).
6. **Q140**: `INTRO.EVERY` never binds (all 120 runs identical without it): drop it. `openRight` is equivalent for
   learning but without it one card in five follows a miss, the feeling Pierre added it for: keep it.
7. **Questions a-j** at the end; d replaces question k of the fish study.

---

## 1. What exists

### 1.1 How a taxon opens today [repo]

- **When** (`quiz.js` `planPhoto`): at least `INTRO.EVERY` (2) answers since the last card, the last answer right
  (`openRight`), no hold, not in the floor of a visit or comeback, the pace (`openPace`: at most 3 in 15 answers, none
  while a recent card is unasked); then the chance `openChance` = 1 − shaky / `OPEN.K` (8), **the shaky limit**.
- **Which** (`model.js` `openPick`): the fish starter core first; a ★ coral genus after its references (rule L5); then
  easiest first (`genusDiff`, `OPEN.T`, trusted with the data) times most common (`commonFactor`). **Each unit is drawn
  on its own**, and `genusDiff` adds each unit's confusability, which pushes look-alikes *later*, separately.
- **Lecture groups** never order the opening (rule L3). **Fish**: entries one at a time; an entry's genera (opt-in) and
  species (not built) once it reaches Advanced, commonness order.
- **Traps** only come from units already met, so a partner not yet open is never contrasted. The **exam** opens at
  `knownP ≥ PROG.M`; nothing asks for the look-alikes to be met first (#611, not merged, proposes "cleared").

### 1.2 What confusion data exists [repo]

- **Corals**: pooled `conf` from the Answers log (stats of 2026-11-05: 780 pairs, 4,630 offers, 326 mix-ups), each
  pair's score `confScore` from a prior worth 8 offers (declared 0.3, family 0.12, shared form 0.08, else 0.03). The app
  treats a pair at `CONF.TRAP` (0.2) or more as a look-alike. **34 of the 59 declared pairs are now under it**
  (Acropora–Anacropora 0.11 after 58 offers); 3 undeclared ones are over it (Echinopora–Turbinaria 0.27, 14 mix-ups in
  45). The graph has **28 edges** among the 40 slate genera (29 with the app's shared-form prior).
- **Fish**: no answer logged yet, so priors only: 11 IMR entry pairs; every sibling genus declared at genus rank;
  species pairs designed (fish confusion study), not built.

### 1.3 How far apart look-alikes open now

**Real log** [log] (Answers tab read 2026-11-05: 2,018 coral answers, 10 players; `reallog.py`): answers between the
first meetings of the two genera of each confusion edge. Three players who opened everything at once are apart.

| Players | Pairs | Median answers apart | Over 30 | Within 10 |
| --- | --- | --- | --- | --- |
| on the path (7), confusion edges | 64 | **73.5** | 78% | 11% |
| on the path, any two genera | 2,420 | 64.5 | 73% | 10% |
| Open all (3), confusion edges | 46 | 11 | 20% | 50% |

On the path look-alikes open **as far apart as any two genera**. Where one side was met, the other was still unmet at
the end of the log in 48% of cases (103 of 213).

**Simulation, today's rule** [sim] (`tools/learnsim.js`, field learner, stats of 2026-11-05, seeds 1-30, the four
profiles; section 4): the 29 confusion edges of the app's own score open a median **123 / 83 / 62 / 53 questions
apart** (beginner / lecture RA / strong RA / expert); only 9-18% of them within 15 questions.

**Order alone** (`cg_order.js`, 300 orders from `openPick`): coral edges a median 9 places apart (9% adjacent), fish
entry edges 7 (12%); e.g. Wrasse 7th and Parrotfish 23rd, Snapper 10th and Emperor 21st.

---

## 2. What the literature says

| Source (section 6) | What it found | What it means here |
| --- | --- | --- |
| Kornell & Bjork 2008 | Paintings by 12 artists: interleaved study beat massed study for naming the artist of new paintings; learners still rated massing as more effective after doing worse with it. | Mixing look-alikes helps on new photos, and feels harder: keep it automatic, never a setting. |
| Kang & Pashler 2012 (secondary) | Interleaving helped; temporal spacing alone did not. | The gain is the contrast between categories, not the spacing. |
| Birnbaum et al. 2013 | Butterfly and bird photos: spacing **hurt** when it broke up the juxtaposition of interleaved categories, at equal total spacing; it helped when it did not. | Look-alikes must be in play at the same time. Opening them 70 answers apart (1.3) loses the juxtaposition. |
| Carvalho & Goldstone 2014a | Interleaving wins for categories with high within- and between-category similarity, blocking for low-similarity ones; side-by-side comparison across categories helps the similar ones. | A confusion group is the high-similarity case: mix it. A lone taxon gains nothing from being mixed with unrelated ones. The side-by-side montage and duels are the simultaneous comparison. |
| Carvalho & Goldstone 2014b (**full text**) | The interleaving advantage comes from cross-category comparison, not from spacing (a 24 h delay did not change it). In Experiment 1A, 24 of 94 learners of similar categories failed the learning criterion, against 3 of 84 for dissimilar ones. | Contrast needs closeness in time. A group of look-alikes is harder to start: plan for the player who struggles (3.3). |
| Carvalho & Goldstone 2017 | Sequential attention: each item is compared with the one before; interleaving draws attention to what differs between successive items. | The contrast happens between consecutive questions: both members must be open together, not merely both open some day. |
| Brunmair & Richter 2019 (meta-analysis, 59 studies) | Interleaving effect g = 0.42 overall, 0.67 for paintings and strongest for visual material, larger when categories are similar to each other and varied within, reversed for words. | Similar genera on varied photos is the case where interleaving pays most. |
| Yan et al. 2017 | Blocked-then-interleaved and mini-blocks were as effective as pure interleaving; pure blocking was worst. | A short first meeting (the card, a few questions) and then mixing loses nothing: opening one at a time (Pierre, 07:18) is fine. |
| Noh et al. 2016 | Blocking helps rule-based categories, interleaving helps information-integration ones (a crossover). | [ours] Naming a genus from a photo is mostly perceptual integration; the verbal ID tips are partly rules. |
| Pashler & Mozer 2013 | Easy-to-hard training (fading) helped when irrelevant variation surrounded the cue, as in natural categories. | Keep easy photos and easy choices first after a group opens (exists: photo aim, the trap ramp of rule L7). |
| Singla et al. 2014; Johns, Mac Aodha & Brostow 2015; Mac Aodha et al. 2018 | Machine teaching: choose the next example from a model of the learner; what to show depends on the learner and changes as they learn. | A full teacher is the fish study's stage 3. Groups are a cheap, data-driven prior on what to teach together. |
| Griffin & Perona 2008 (secondary); Blondel et al. 2008 | Splitting categories into minimally confused subsets from a confusion matrix (spectral clustering), giving a taxonomy; modularity optimisation for communities in large graphs. | Clustering a confusion graph is standard. With 27-45 units, a linkage clustering with a size cap is enough; modularity has no size control. |

None tested the **order in which confusable categories are introduced** over hours of adaptive practice: carrying the
within-session evidence to opening order is our inference.

---

## 3. The design

### 3.1 Confusion groups

- **Graph**: the units of one rank in play (`pool()`), weighted by `pooledConf`, the score traps already read. No new
  data or record.
- **Grouping**: average linkage. Merge the two clusters with the highest mean pairwise score while that mean is at least
  `CONF.TRAP` and the merged size at most **G_MAX**; ties alphabetical. A unit left alone is a **lone taxon**.
- **Why this one** (28 coral edges; `cluster.py`, prior without shared form):

  | Grouping | Group sizes | Lone | Edges inside | Their weight |
  | --- | --- | --- | --- | --- |
  | connected components (no cap) | 10, 7, 7, 2, 2 | 15 | 28 | 100% |
  | single linkage, cap 3 / cap 4 | 3 × 4, 2 × 6 / 4 × 4, 2 × 3 | 16 / 18 | 15 / 16 | 57% / 62% |
  | **average linkage, cap 3** (cap 4-5: the same) | 3 × 5, 2 × 5 | 15 | 18 | 65% |
  | complete linkage, cap 3 | 3 × 3, 2 × 7 | 17 | 16 | 57% |

  Components chain 10 look-alikes into one block. Average linkage keeps sets of 2-3 (the size of the interleaving
  studies) with the most confusion inside. Louvain was not tried: no size control.
- **Coral groups** (the app's score): Pocillopora–Stylophora; Porites–Astreopora; Echinopora–Turbinaria–Cyphastrea;
  Pachyseris–Merulina; Platygyra–Leptoria–Goniastrea; Goniopora–Alveopora; Montipora–Hydnophora;
  Fungia–Lithophyllon–Danafungia; Ctenactis–Lobactis; Herpolitha–Halomitra; Dipsastraea–Favites–Astrea (bonus genera
  join when on). 13 lone, Acropora among them: its declared look-alikes are rarely confused in the data.
- **Fish entry groups** (priors): Butterflyfish–Angelfish, Parrotfish–Wrasse, Snapper–Emperor–Bream,
  Triggerfish–Filefish, Soldierfish–Cardinalfish–Squirrelfish, Lizardfish–Sandperch; 13 lone (Moorish Idol's link to
  Butterflyfish is cut). The IMR presentation puts most of these sets on one slide each (29, 47, 48).
- **Updating**: recomputed when the pooled stats refresh (45 coral units: instant on the phone; 340 fish species: in the
  sheet's snapshot, rule L13). Pooled, the same for everyone. Groups only order what is not open; a regrouping only
  changes who is pending.
- **Edges cut by the cap** (10 of 28, e.g. Fungia–Lobactis 0.43) open as today (question e).

### 3.2 The unit of opening and its interest

Only **which** unit `openPick` returns changes; **when** a unit opens does not (Pierre, 07:18: one at a time).

1. **Pending partner first**: if a group has a member met and others not, the next opening is one of those (today's
   draw among them; the ★ rule above it).
2. **Otherwise a new unit**, a group or a lone taxon, drawn with today's weight on the group's means:
   exp(−`OPEN.T` × trust × (mean `genusDiff` − easiest)) × `commonFactor`(mean `cm`).

- **Interest, probability, difficulty**: that weight is the group's interest, its share the probability it opens next,
  its mean `genusDiff` (which already holds each member's confusability) its difficulty: hard look-alike sets come later
  as a whole, a set with a common genus earlier. **No new constant.**
- A group of 3 opens over three consecutive card slots, typically within 6-15 answers.
- **Not proposed**: the whole group at once (Pierre, 07:18; the 2026-11-03 bursts); groups per player; a full
  machine-teaching chooser (the fish study's stage 3).

### 3.3 With the rest of the engine, and a player who struggles

- **Unchanged**: the shaky limit (a partner is an opening like any other, so with 8 shaky units nothing opens), the
  success target, the pace, the right-answer rule, the hold, the floor, Open all, the ★ rule, the fish starter core
  (already holds Butterflyfish and Angelfish). Lecture groups still play no part (rule L3).
- **Traps and duels** start contrasting the pair within a few answers of the partner's card (rule L7 ramp).
- **The exam**: question k of the fish study (pull the partner at exam time) becomes a fallback. Proposed: a unit's
  exam opens once its group partners are met (question d).
- **Struggling**: misses make the members shaky, so no new group starts; the hold eases photos and format; traps ease;
  Again and duels drill the pair. The partner waits at the head of the queue, so the next opening is still the partner.
  Finishing a group despite the shaky limit is not recommended: similar sets are harder to start (Carvalho & Goldstone
  2014b) and bursts collapsed two runs on 2026-11-03.

### 3.4 Fish, corals, and what IMR looks for (Pierre, 07:25)

- **Corals: ready now** (pooled data exist). The ★ rule is already the group idea: ★ genera are on the slate because they
  look like surveyed ones.
- **The IMR priority for corals today is the slate, not the lecture groups** [repo]: the lecture groups never order the
  opening; they set the display (`shownGroup`), the easy wrong choices (other lecture groups) and the ★ references. The
  path holds only the IMR slate; bonus genera are opt-in, offered once every slate genus is met. "Had the IMR course"
  only sets the starting level (0.5) and an earlier open-all offer (answer 30).
- **Fish, the same split: IMR priority decides what is eligible and how soon; the groups decide the order inside it.**
  - Eligible: the IMR families are the 27 circle-1 entries (circles 2-3 opt-in); IMR's genera are the first words of the
    circle-1 PDF names (94). For "I'm at IMR": scientific genera on from the start (FISH_PATH: "scientific names
    early"), and possibly an entry's genera before Advanced (question h). A unit not eligible is not in the graph, so a
    group never pulls in a non-IMR unit.
  - Speed: the answer's starting level and open-all offer, as for corals, fish values from the fish profile to come.
  - Order: the groups; inside an entry, commonness stays the weight. The IMR slides (`sl`) could be the fish "lecture
    groups", but they repeat what `look` already declares.
- **Fish genera**: every sibling is declared (0.3), which would make arbitrary triples; group them only by IMR
  sub-entries (Chromis, Dascyllus, Pomacentrus; Bannerfish; Surgeonfish, Unicornfish) and data look-alikes.
- **Fish species** (not built): the same graph per entry plus cross-entry look-alikes; a partner in an entry not yet
  eligible becomes pending as soon as it is.

### 3.5 Constants

| Constant | Value | Who decides |
| --- | --- | --- |
| **G_MAX**, the largest group | **3** (2 keeps 39% of the confusion inside; 4-5 give the same groups today) | Pierre (question b) |
| Linkage threshold | `CONF.TRAP` (0.2), reused: no new constant | with the grouping (question a) |
| Linkage | average (mean pairwise score) | with the grouping (question a) |

---

## 4. Simulation

### 4.1 Declared before running

- **Arms**: today's `openPick` against the group rule of 3.2 (G_MAX 3), injected into the page by the simulation only.
  `tools/learnsim.js --learner field` (pair skill grows only when the pair is contrasted; the item learner cannot show an
  order effect on pairs [ours]), stats of 2026-11-05, four profiles, seeds 1-30, 600 questions, through `tests/slot.js`.
- **Primaries, one Holm family of 3**: P1 2-choice accuracy on the 29 confusion edges at q300; P2 the same at q600; P3
  genera entered in the exam by q600 (time to exam entry). Two-sided exact stratified sign-flip on the 120 (profile,
  seed) pairs (50,000 flips); per profile under Holm only after a pooled pass.
- **Guardrails** (one-sided 90% paired bound): true knowledge q300 and q600 ≥ −0.02; genera met q100 and q300 ≥ −2;
  overclaim at q600 ≤ +0.02, read against the field learner's own truth (the new judge, PR #624, is not merged).

### 4.2 Results [sim]

| Measure | beginner | lecture RA | strong RA | expert | pooled Δ, p |
| --- | --- | --- | --- | --- | --- |
| **P1** edge accuracy q300 | 0.747 → 0.766 | 0.857 → 0.857 | 0.948 → 0.951 | 0.995 → 0.996 | **+0.006, p = 0.008** |
| **P2** edge accuracy q600 | 0.951 → 0.958 | 0.978 → 0.980 | 0.992 → 0.992 | 0.998 → 0.998 | **+0.002, p = 0.015** |
| **P3** genera in the exam by q600 | 0.53 → 0.60 | 1.03 → 1.30 | 4.13 → 4.93 | 17.7 → 18.3 | **+0.44, p = 0.036** |
| questions between partners (median) | 123 → 25 | 83 → 18 | 62 → 12 | 53 → 12 | |
| partners within 15 questions | 9% → 44% | 11% → 48% | 13% → 57% | 18% → 59% | |
| true knowledge q300 | 0.607 → 0.609 | 0.750 → 0.749 | 0.857 → 0.858 | 0.953 → 0.953 | held |
| true knowledge q600 | 0.883 → 0.887 | 0.916 → 0.917 | 0.947 → 0.946 | 0.967 → 0.967 | held |
| genera met q100 | 17.3 → 16.8 | 18.4 → 17.9 | 18.8 → 18.8 | 19.3 → 19.2 | held (worst bound −0.9) |
| genera met q300 | 31.8 → 31.9 | 37.2 → 36.6 | 40 → 40 | 40 → 40 | held (worst bound −1.2) |
| overclaim q600 | 0.122 → 0.124 | 0.078 → 0.078 | 0.016 → 0.028 | −0.071 → −0.069 | strong RA: bound +0.020, at the margin |
| right %, questions 1-300 | 74.3 → 73.9 | 78.0 → 77.1 | 83.6 → 82.7 | 98.5 → 98.4 | (descriptive) |
| exams opened with a partner never met | 0 → 0 | 0 → 0 | 0 → 0.8% | 0.2% → 0.4% | (descriptive) |

- **Holm**: P1 (p 0.008 ≤ 0.017), P2 (0.015 ≤ 0.025), P3 (0.036 ≤ 0.05) all pass. Per profile, P1 holds for the beginner
  (+0.020, p 0.006) and the expert (at the ceiling); P2 and P3 for no single profile.
- **Reading**: partners open 4-5 times closer; the learning gain is real but **small** in this world (two points of
  look-alike accuracy for a beginner at q300, a little sooner to the exam). The cost: right % 0.4-0.9 points lower early
  (the partner arrives as a trap sooner) and the strong RA's overclaim at the edge of its margin.
- **Limits**: the field learner's contrast is our model; the literature's juxtaposition effect may be larger. Groups
  fixed on one day's stats. **Fish cannot be simulated** (no fish profile in `learnsim`): its evidence is the order,
  where the rule puts 73% of entry look-alikes side by side (12% today), 91% within two places (22%).
- Exams almost never open with a partner unmet in either arm, so question d is cheap insurance.

### 4.3 Q140: removing two opening gates (engine coherence review, F7)

Pierre approved Q140 as a simulation (07:25): remove `INTRO.EVERY`, then `openRight` too, in the same framework.

- **Declared before running**: arms today, A (`INTRO.EVERY` = 0) and B (also `openRight` always true), injected by the
  simulation only; same world and seeds, 300 questions, 1-2 workers in chunks of 10 seeds; baseline today's arm of 4.2
  at q300 (the same first 300 questions: checked identical on one run). Primary: true knowledge q300, each arm against
  today, sign-flip, Holm over two; "changes nothing" = TOST at ±0.02.

| Measure, q300 unless said | today | A: no `INTRO.EVERY` | B: no `INTRO.EVERY`, no `openRight` |
| --- | --- | --- | --- |
| true knowledge (pooled Δ, p) | 0.61 / 0.75 / 0.86 / 0.95 | **identical in all 120 runs** (Δ 0, p 1) | +0.004, p 0.041 (Holm threshold 0.025: no difference shown); TOST: equivalent |
| genera met at q100 | 17.3 / 18.4 / 18.8 / 19.3 | identical | +0.8 / +0.9 / +1.5 / +0.1 |
| right %, questions 1-300 | 74.3 / 78.0 / 83.6 / 98.5 | identical | −0.5 / −0.5 / −0.8 / +0.1 |
| cards on the question right after a miss, per run | 0 | 0 | **7.3 / 7.1 / 6.7 / 0.6** (of 28-41 cards) |

- **`INTRO.EVERY` never binds**: `openPace` already waits for each recent card's genus to be asked, which takes
  `INTRO.GAP` (2) answers. It can go; players see no change.
- **`openRight`** barely matters for learning, but it is the rule Pierre asked for (2026-11-03: a card felt like a reward
  for a wrong answer); without it, one card in five comes right after a miss. The simulation cannot weigh that feeling.

---

## 5. Questions for Pierre (each with a recommendation)

The integrator numbers them in STATUS. Each is a choice with impact: nothing ships without your answer.

**a.** Confusion groups by average linkage on the pooled score the traps use, joined at the trap level (0.2),
recomputed with the stats, the same for every player? *Recommendation*: yes: no new data, tight sets, 65% of the coral
confusion inside, follows the data.

**b.** The largest group, G_MAX: 2, 3 or 4? *Recommendation*: 3 (2 keeps only 39% inside; 4-5 give the same groups today).

**c.** The opening rule: once a group has a member open, its other members are the next openings, one at a time;
otherwise a group or lone taxon is drawn with today's weight on the group's means; shaky limit, pace, right-answer
rule, hold, ★ rule and starter core unchanged, no exception for a group in progress? *Recommendation*: yes, corals first
(their data exist): partners 4-5 times closer, +0.006 look-alike accuracy at q300 (+0.020 beginner), a start 0.5-1 point
harder.

**d.** A unit's exam opens only once its group partners are met? *Recommendation*: yes, it almost never binds and
guards a partner held back by the shaky limit. It replaces question k of the fish study.

**e.** Pairs cut by the cap (Fungia–Lobactis…) open as today? *Recommendation*: yes for now; a pull would add a constant.

**f.** Declared look-alikes the data no longer confirm (34 of 59, e.g. Acropora–Anacropora): the data decide, as for
traps (rule L7)? *Recommendation*: yes; a declared pair starts grouped (0.3) and leaves only on the players' evidence.

**g.** Fish: entry groups now from the IMR look-alikes; genus groups only from IMR sub-entries and data; species from
declared and data look-alikes, a cross-entry partner pending until eligible? *Recommendation*: yes (73% of entry
look-alikes side by side in the order, 12% today).

**h.** "I'm at IMR" for fish: scientific genera on from the start; an entry's genera before Advanced (Open Water?)?
*Recommendation*: genera on from the start, yes; keep Advanced as the bar until the fish profile can test a lower one.

**i.** Corals: keep the lecture groups out of the opening (rule L3), the slate being the IMR priority?
*Recommendation*: yes; they cut across the confusion groups (Porites, group 3, with Astreopora, group 4).

**j.** Q140: remove `INTRO.EVERY` (identical runs) and keep `openRight` (equivalent for learning, but one card in five
after a miss without it)? *Recommendation*: yes to both.

---

## 6. Sources

Read on 2026-11-06; abstracts through PubMed unless noted.

- Kornell & Bjork (2008), *Psychological Science* 19:585-592. Abstract. <https://doi.org/10.1111/j.1467-9280.2008.02127.x>
- Birnbaum, Kornell, Bjork & Bjork (2013), *Memory & Cognition* 41:392-402. Abstract. <https://doi.org/10.3758/s13421-012-0272-7>
- Kang & Pashler (2012), *Applied Cognitive Psychology* 26:97-103. Secondary (Birnbaum et al.'s abstract).
- Carvalho & Goldstone (2014a), *Memory & Cognition* 42:481-495. Abstract. <https://doi.org/10.3758/s13421-013-0371-0>
- Carvalho & Goldstone (2014b), *Frontiers in Psychology* 5:936. **Full text** (PMC4141442). <https://doi.org/10.3389/fpsyg.2014.00936>
- Carvalho & Goldstone (2017), *JEP: LMC* 43:1699-1719. Abstract. <https://doi.org/10.1037/xlm0000406>
- Brunmair & Richter (2019), *Psychological Bulletin* 145:1029-1052. Abstract. <https://doi.org/10.1037/bul0000209>
- Yan, Soderstrom, Seneviratna, Bjork & Bjork (2017), *JEP: Applied* 23:403-416. Abstract. <https://doi.org/10.1037/xap0000139>
- Noh, Yan, Bjork & Maddox (2016), *Cognition* 155:23-29. Abstract. <https://doi.org/10.1016/j.cognition.2016.06.007>
- Pashler & Mozer (2013), *JEP: LMC* 39:1162-1173. Abstract. <https://doi.org/10.1037/a0031679>
- Singla et al. (2014), ICML. Abstract (arXiv). <https://arxiv.org/abs/1402.2092>
- Johns, Mac Aodha & Brostow (2015), CVPR. Abstract (arXiv). <https://arxiv.org/abs/1504.07575>
- Mac Aodha, Su, Chen, Perona & Yue (2018), CVPR. Abstract (arXiv). <https://arxiv.org/abs/1802.06924>
- Griffin & Perona (2008), CVPR. Secondary (repository page, a course summary). <https://doi.org/10.1109/CVPR.2008.4587410>
- Blondel, Guillaume, Lambiotte & Lefebvre (2008), *J. Stat. Mech.* P10008. Abstract (arXiv). <https://arxiv.org/abs/0803.0476>
- Repository: `model.js` `openPick`, `openChance`, `openPace`, `openRight`, `shaky`, `genusDiff`, `pooledConf`,
  `distractors`, `examOn`; `core.js` `CONF`, `starWaits`, `fishGen`; LEARNING.md "Which genus comes next" to "Common
  first"; FISH_PATH.md "Unlock rules", "Look-alikes at any rank"; the engine coherence review (F7, branch
  `claude/review-engine-coherence`).
- Scripts (scratchpad, not committed): `graph.py`, `cluster.py`, `reallog.py`, `install.js` (the group rule injected into
  the page), `learnsim_cg.js` (`learnsim.js` with `--open group`, `--gates`, `--seed0`, the edge and gap measures),
  `cg_order.js`, `analyse.py`, `q140.py`.

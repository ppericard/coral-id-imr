# Progress and the size of the candidate set: a study

Written 2026-11-05, evening Manila, for Pierre to read on the morning of 2026-11-06. Read-only study: no branch, no PR,
no code changed. Code read on `origin/main` at `4ef43b16`.

**The concern (Pierre, 2026-11-05, as a scientist).** Progress is too generous. A genus at 100% should mean the player can
tell a photo of it from *any* other genus of the slate, whatever they have unlocked, even all ~40. Difficulty does not come
only from look-alikes: holding many candidate names in mind raises confusion on its own (8 names seen many times is not
40 names each seen less often). Typed answers help, but with 8 genera unlocked even typing is easy. Today a player who
unlocks 8 genera and drills them in the Custom quiz can reach 95%, then pass exams whose traps come only from the
genera already met.

**Scope added by the coordinator (Pierre's notes):**
1. The design must hold for corals and fish: any subject the engine serves, with fish units at the entry, scientific
   genus and species levels, the circles, and scientific names. It is stated without reference to a subject below, and
   section 4.6 checks the fish specifics.
2. Progress should be non-linear: fast at the start, then slower and slower. He already asked for this on fish, and
   corals use the same method.
3. A strong recalculation of everyone's progress is acceptable ("better coherent than making people think they know
   more than they do"). Section 4.8 explains how it would be applied.

Marks used for sources: **[checked]** means read this session (the paper, its abstract, or an official page; the link
given is the one read). **[checked, secondary]** means confirmed through a summary or a citing paper, not the original.
**[memory]** means from my own knowledge, not re-checked today.

---

## 0. The short version

1. **The science agrees with Pierre, on two separate grounds.**
   - *Set size*: identification gets harder as the number of possible answers grows, even with no look-alike among
     them. Speech heard in noise is much more intelligible with 2 possible words than with 256 (Miller, Heise &
     Lichten 1951). Choice time grows with log2 of the number of alternatives (Hick 1952). Checking a probe against a
     memory set takes longer with each item held (Sternberg 1966). Absolute identification levels off at about
     2.5 bits (Miller 1956).
   - *Closed set versus open set*: lexical competition is invisible in closed-set tests and appears only in open-set
     tests, or when confusable foils are added to the closed set (Clopper, Pisoni & Tierney 2006). Recognition with
     every alternative on the table performs no better than recall (Davis, Sutherland & Judd 1961).
   - *Category number*: in category learning, adding categories hurts (Maddox et al. 2004; Stanton & Nosofsky 2013,
     who correct that paper and find the cost in both kinds of task).
   - *Expertise*: species-level training transfers to new species (Tanaka, Curran & Sheinberg 2005), but how much
     transfers to genera never contrasted is unknown. It cannot be taken as given.
2. **No mainstream learning app scales mastery by the size of the candidate set.**
   - Duolingo (half-life regression), Anki/FSRS and Memrise model each item on its own.
   - Khan Academy and ALEKS do something close in spirit: *Mastered* is confirmed on mixed, cumulative assessments,
     and ALEKS knowledge checks send forgotten topics back to the learning path.
   - The closest match is Kellman's perceptual adaptive learning. A 2023 CogSci study retires a category only on a
     running d′ built from hits **and false alarms** (window of 8, d′ > 2.4). It beat accuracy-only mastery
     criteria [checked].
   - Larkwire (bird songs) merges small groups until the learner holds them all, and has a "Field" mode that
     identifies from memory.
3. **Where our model leaves the set out** (section 3):
   - Pick questions are weighed by the choices shown, not by the units the player would face in the field.
   - Typed answers count as k = ∞ (no guess rate, full weight), while the player's real vocabulary is the units they
     have unlocked.
   - Exam traps come only from units met, topped up with other units met.
   - The Custom quiz builds progress from the selection alone.

   With the 8 most common coral genera met, real pooled confusions (from the sheet), the app's own priors and a simple
   choice model, a player at 94% on 4-choice questions would be at about 34-76% against the whole slate. The range
   depends on how much transfers to pairs never contrasted. *Pocillopora*'s exam would offer *Tubastraea*,
   *Acropora* and *Montipora* (pooled confusion 0.03-0.06) while *Stylophora* (0.25, the one real trap) has never
   been met.
4. **Recommendation: one rule, "proven against the field"** (section 4.5). Each unit gets a **coverage** score between
   0 and 1: the share of its confusion mass, over *every* unit of its field, that the player has actually been tested
   against.
   - Every unit of the field counts, including unrelated ones (about half the mass), which carries Pierre's
     "sheer number".
   - A pair counts as tested once the unit was answered right with the other unit among the choices, or in the
     player's typed vocabulary.
   - The bar becomes `0.95 × min(1, pg / M) × h(coverage)`, with h concave: fast at the start, slower and slower.
   - The mastery exam opens only when coverage reaches about 0.9 and every look-alike of the slate is cleared. Its
     traps are the unit's 3 most confusable units of the slate.
   - The typed vocabulary is the units unlocked (the selection in the Custom quiz).
   - Nothing decays and nothing is capped by game mode; the Custom quiz needs no special rule.
   - It applies per rank, so it works for fish.
   - A full replay (rules version 5) recalculates everyone. Learned marks are kept only where the replayed coverage
     meets the exam's condition; other badges are never taken back.
5. **Validation**: `learnsim` cannot judge this as it is. Its learner recognises a genus whatever the competitors, so
   drilling 8 genera looks as good as drilling 40. A "field learner" (Luce choice over the learner's own vocabulary,
   pair skill learned only through contrast) and a Custom-quiz scenario come first. Then a pre-declared primary
   measure (overclaim, the bar against true whole-slate success), stratified sign-flip, Holm, guardrails for beginner
   motivation, and a replay on the real log.

---

## 1. The science

### 1.1 Set size: more candidates, more errors, slower answers

- **Number of alternatives in perception.** Miller, Heise & Lichten (1951) varied the test vocabulary across 2, 4, 8,
  16, 32 and 256 words. Intelligibility fell steadily as the number of alternatives grew; summaries report that
  2-word vocabularies needed about 18 dB less signal than 1,000-word ones. The authors tie this to the information
  needed for a correct answer, which grows with the range of alternatives
  ([summary](https://www.bohrium.com/paper-details/the-intelligibility-of-speech-as-a-function-of-the-context-of-the-test-materials/812082716714467328-17579);
  doi 10.1037/h0062491) **[checked, secondary; dB figures from summaries]**. This is the cleanest demonstration of
  Pierre's point: the same stimulus is harder to name when more names are possible, with no look-alike involved.
- **Hick-Hyman law.** Choice reaction time rises linearly with the information transmitted, about log2 of the number of
  equally likely alternatives (Hick 1952, doi 10.1080/17470215208416600; Hyman 1953, doi 10.1037/h0056940;
  [overview](https://en.wikipedia.org/wiki/Hick%27s_law)) **[checked, secondary]**.
- **Memory scanning.** Sternberg (1966, *Science* 153:652): recognition time grows linearly with the size of the memory
  set, about 25-30 items a second, consistent with an exhaustive comparison
  ([record](https://www.scilit.net/publications/a0c3d513fba08abfc3720f0a26bb7ea5)) **[checked, abstract]**. Holding
  more candidate names costs time and, under time pressure, accuracy.
- **Absolute identification.** Identifying stimuli along one dimension levels off at about 2.5 bits (about 6-7
  categories) whatever the number offered (Miller 1956; Pollack 1952) **[memory]**. Corals are multidimensional, which
  raises the ceiling but does not remove the principle.
- **Category number in category learning.** Maddox, Filoteo, Hejl & Ing (2004, *JEP:LMC* 30:227) found that going from
  2 to 4 categories hurt rule-based learning but not "information-integration" learning. Stanton & Nosofsky (2013,
  doi 10.1037/a0031670) showed that the original 4-category clusters were spread further apart. With that confound
  removed, information-integration learning was **also worse with 4 categories than 2**, and one similarity-based
  model explained both
  ([summary](https://next.sciencegate.app/document/10.1037/a0031670)) **[checked, secondary]**. Visual genus
  identification is mostly integration of many cues, so the corrected result applies: more categories, more errors.
- **Choice models.** In the similarity-choice and Luce models (Shepard 1957; Luce 1959) and the generalized context
  model (Nosofsky 1986), P(response c | stimulus t) = η_tc·b_c / Σ_{j∈V} η_tj·b_j over the set V of candidate responses
  **[memory]**. Every candidate added to V adds a term to the denominator, so accuracy falls as the set grows even when
  each new candidate is only weakly similar. Many weak competitors add up. This is the formal form of "40 names held
  in mind", and section 3.4 uses it.

### 1.2 Open set versus closed set, recall versus recognition

- **Closed-set tests hide competition.** In spoken word recognition, lexical competition and talker effects showed up in
  open-set tests but not closed-set ones. Adding highly confusable foils to the closed set brought them back
  (Clopper, Pisoni & Tierney 2006, *J Am Acad Audiol* 17:331;
  [record](https://thieme-connect.com/products/all/doi/10.3766/jaaa.17.5.4)) **[checked, abstract]**. Our multiple
  choice among units met is a closed set, and our "traps among units met" is the "confusable foils" fix, limited to
  the foils the player already knows.
- **Recognition among all alternatives is recall.** Davis, Sutherland & Judd (1961, *J Exp Psychol*) showed that when
  every possible item (90 two-digit numbers) is offered at recognition, performance is no better than recall. The
  advantage of recognition is largely the reduced number of alternatives
  ([citing paper, *Nature* 211:324](https://www.nature.com/articles/211324a0)) **[checked, secondary]**. So a typed
  answer is "recall against the vocabulary the learner holds". With 8 names it is a 1-in-8 recognition in disguise.
- **Open-set recognition in machine learning** formalises the risk of answering with a known class for something
  outside the known classes, called "open space risk" (Scheirer et al. 2013, *IEEE TPAMI* 35:1757,
  doi 10.1109/TPAMI.2012.256) **[checked, bibliographic]**. Our player with 8 genera is in exactly that position on a
  reef: every photo of the 32 others will be given one of the 8 names.
- **Prevalence** (radiology): rare targets are missed much more often (Wolfe, Horowitz & Kenner 2005, *Nature*
  435:439) **[memory]**. On a reef, genera met rarely in practice behave like rare targets.

### 1.3 Visual expertise and species identification training

- **Species-level training transfers.** Participants trained to tell 10 owl or 10 wading-bird species apart at the
  species level transferred better to new photos *and to new species* than those trained at the family level
  (Tanaka, Curran & Sheinberg 2005, *Psych Sci* 16:145,
  [PDF](https://www.colorado.edu/lab/curran-lab/sites/default/files/attached-files/tancurshein.pdf)) **[checked,
  abstract]**. Scott et al. (2008) found the same with 6 days of training
  ([PDF](https://www.colorado.edu/lab/curran-lab/sites/default/files/attached-files/scott_2008.pdf)) **[checked,
  abstract]**. So some transfer to never-contrasted pairs is real. How much is unknown, and the validation below must
  bracket it (τ, section 3.4).
- **Spacing and interleaving of bird families** help through discrimination between categories (Wahlheim, Dunlosky &
  Jacoby 2011, *Mem Cogn* 39:750, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3085105); Kornell & Bjork 2008,
  painting styles) **[checked, abstract / memory]**. The benefit comes from comparing categories against each other:
  a category is learned against the categories it is interleaved with.
- **Easy-to-hard ("fading")** helps when the relevant cue is buried in irrelevant variation (Pashler & Mozer 2013,
  *JEP:LMC*, [PDF](https://home.cs.colorado.edu/~mozer/Research/Selected%20Publications/reprints/PashlerMozer2013.pdf))
  **[checked, abstract]**. This justifies starting with a small set (our opening path), not counting the small set as
  final mastery. The final test in that line of work is always the full, hard task.
- **Multi-class machine teaching** with real learners (butterflies and other datasets): choosing which examples to show
  from a model of the learner's errors across *all* classes produces better "experts" (Johns, Mac Aodha & Brostow,
  CVPR 2015, [arXiv](https://arxiv.org/abs/1504.07575)) **[checked, abstract]**.
- **Perceptual and Adaptive Learning Modules (Kellman)** in dermatology and pathology give large, lasting gains (Rimoin
  et al. 2015, [PDF](https://kellmanlab.psych.ucla.edu/files/rimoin_altieri_craft_krasne_kellman_2015.pdf)).
  Categories are retired once they meet accuracy and speed criteria. **Kellman, Massey, Krasne et al., CogSci 2023**
  ([eScholarship](https://escholarship.org/uc/item/83z22046)) **[checked, full text]**, with 10 skin lesion types:
  "in forced-choice, multi-category classification, each miss for a presented category also comprises a false alarm
  for another category".
  - Their SDT retirement uses a running d′ over the last 8 presentations of the category.
  - Hits are the right answers on that category's items.
  - False alarms are the times its name was given, out of every presentation of another category in that window.
  - A category is retired at d′ > 2.4, with the usual speed criterion.
  - The result: more efficient learning than accuracy-only retirement, at immediate and delayed tests (medium
    effects).
  - Lesson for us: mastery must also check that the name is **not given to other things**, which requires the
    other things to have been shown.
- **Species identification in ecology education** shows modest gains and rarely tests transfer to species not taught:
  2.6 of 32 common plants known before German university courses, with significant but weak gains (Buck et al.
  2019, [PeerJ](https://peerj.com/articles/6581)) **[checked, abstract]**. BirdID (Nord University) trains over the
  whole Western Palearctic with a large mixed quiz ([birdid.no](https://birdid.no)) **[checked, programme page]**.

### 1.4 What follows for us

- A right answer proves recognition **relative to the set it was tested in**. Identification among k candidates is
  log2 k bits: 2 bits for 4 choices, 3 for 8, 5.3 for 40.
- A typed answer is tested against the vocabulary the learner holds, not against ∞.
- Small sets are a good way to *start* (fading, the opening path). Mastery has to be shown on the full field, with
  false alarms possible.
- Transfer to never-contrasted pairs exists but is unmeasured. A rule must not assume it is complete.

---

## 2. How other systems compute progress under a growing vocabulary

| System | How progress / mastery is computed | Does the candidate set enter? | Source |
|---|---|---|---|
| **Duolingo** | Half-life regression: a word's recall probability p = 2^(−Δ/h), with h = 2^(Θ·x) from the learner's counters on that word (seen, right, wrong) and lexeme tags. Strength meters, earlier doubling and halving. Birdbrain (Elo-like) on exercises. | No. Each word on its own; the exercise format enters Birdbrain's difficulty, not the number of words known. | [ACL 2016](https://preview.aclanthology.org/landing_page/P16-1174), [code](https://www.github.com/duolingo/halflife-regression), [blog](https://blog.duolingo.com/how-we-learn-how-you-learn) **[checked]** |
| **Anki / FSRS** | Per-card stability and difficulty; a power-law forgetting curve. | No. Interference between cards is not modelled. | **[memory]**; FSRS is in LEARNING.md references |
| **Memrise** | Multiple choice while a memory is new, then "more rigorous tests (like typing)" as it strengthens; item difficulty from earlier learners. | Partly: harder formats come in, but nothing about vocabulary size. | founder post, [forum](https://tl.net/forum/general/282817-memrise-learning-languages-with-a-game-approach?page=4) **[checked, secondary, 2011]** |
| **Khan Academy** | Mastery points per skill; levels Attempted, Familiar, Proficient, Mastered; quizzes, unit tests and course challenges (mixed items) raise or lower levels; a miss there can drop a level. | Indirectly: the top level is confirmed on mixed, cumulative assessments. | [help](https://support.khanacademy.org/hc/en-us/articles/115002552631), [levels](https://support.khanacademy.org/hc/bg/articles/5548760867853) **[checked]** |
| **ALEKS** (knowledge space theory) | A knowledge state; periodic Knowledge Checks re-test recently learned and earlier mastered topics; failed ones go back to the learning path and the pie shrinks. | Indirectly: re-testing on a mixed set as the state grows. | [ALEKS FAQ](https://www.mheducation.com/support/aleks-support-center/knowledge/why-does-aleks-periodically-give-me-new-knowledge-checks.html) **[checked]** |
| **Kellman PALMs** | Per-category retirement on accuracy + speed over spaced trials; SDT variant on running d′ from hits and false alarms. | **Yes, through false alarms**: a name given to other categories blocks retirement. | [CogSci 2023](https://escholarship.org/uc/item/83z22046) **[checked]** |
| **Larkwire** (bird songs) | Small groups that merge until all are known; "Gallery" (pick among birds shown) and "Field" (from memory); levels from beginner to master, each including every song of the lower ones. | **Yes, by design**: groups merge, and the master level holds every song. | [how to](https://larkwire.com/birdsong/howto), [review](https://www.birderslibrary.com/reviews/software/larkwire_birdsong_app.htm) **[checked]** |
| **Cornell Bird Song Hero** | Match a song to 1 of 3 spectrograms; Challenge (20+ songs), then Ultimate with "trickier answer choices". | Harder foils at the last stage, not set size. | [All About Birds](https://www.allaboutbirds.org/news/?p=7083) **[checked]** |
| **iNaturalist / Seek, Merlin, BirdNET** | Identification tools; Seek has badges and challenges for observations. No mastery quiz that I know of. | n/a | **[memory, not re-checked]** |
| **BirdID (Nord University)** | A very large mixed quiz (tens of thousands of tasks, sight and sound) over the Western Palearctic. | The whole region's species are candidates. | [birdid.no](https://birdid.no) **[checked, programme page]** |
| **Adaptive geography (Pelánek et al.)** | Elo with a 1/n guess floor for n options (2-6), distractors from past confusions, open questions too. | Through the guess floor only (1/n of the options shown). | [EDM 2014](https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf) **[checked]**; UMUAI 2017 in LEARNING.md |
| **IRT** | 3PL: the guessing parameter c, often estimated *below* 1/k because attractive distractors pull guessers; nominal-response and multiple-choice models (Bock 1972; Thissen & Steinberg 1984) model which option attracts whom. Three options are usually enough (Rodriguez 2005 meta-analysis). | Per item: the options shown; the learner's wider vocabulary is never a parameter. | **[memory]** for c; Rodriguez via [summary](https://u.osu.edu/cvmofficeofteachingandlearning/2018/02/02/how-many-options-should-a-multiple-choice-question-have-maybe-just-3/) **[checked, secondary]** |

**Reading.** Language apps get away with ignoring the set because a word's meaning does not change when other words
are learned. Perceptual categories are different: a category's boundary is defined against its neighbours (section
1.1). The systems built for perceptual categories (PALMs, Larkwire) are the ones that bring the set in, through false
alarms or by merging groups up to the full set. Khan and ALEKS confirm mastery on mixed, cumulative tests. **None
scales the bar continuously by the field**; that would be new, and it is what section 4 proposes, in a form that
comes down to the PALM and Larkwire practice at the exam.

---

## 3. Diagnosis: where the set size is missing in our model

Code: `core.js` `PROG`, `pgStep`, `pgRightW`, `pgMissW`, `scoreOf`, `guessOf`, `kOf`; `model.js` `pgWeight`,
`distractors`, `plausibleK`, `examSet`, `EXAM`, `TYPED`, `customChoices`; `quiz.js` question building
(`planPhoto` area, l. 1650-1690) and `answer`.

### 3.1 The four gaps

| # | Where | What it does today | What is missing |
|---|---|---|---|
| G1 | Right-answer weight `pgRightW(k, look)` | `(1 − 1/k)/(3/4) × (look ? 1 : 0.5)`, with k the plausible choices *shown* | The field the unit lives in. 4 choices with one look-alike give full weight whether the player has met 8 genera or 40. A right answer among choices from 8 units proves the same as one among 40. |
| G2 | Guess rate and weight of typed answers | `TYPED.k = Infinity`: no 1/k floor (`guessOf` 0), full weight; "every genus, its look-alikes included, was a possible answer" (`pgRightW`) | The vocabulary really held. The form accepts every name of the subject, but a player who has met 8 units recalls among those 8 (section 1.2: recall equals recognition among the alternatives held). The plausible ones among 8 may be 2-3, a guess rate of about 1/3, not 0. |
| G3 | Exam traps (`examSet` + `distractors(t, …, 3, known)`) | 3 traps requested, taken from `look` = the player's confusable pairs ∪ pooled ≥ `CONF.TRAP`, **among units met only**, then "other units met" by confusion score, then units never met. The answer is scored as k = 4 (traps ≥ 2). | The exam's own claim ("3 look-alike traps") holds only when the look-alikes have been met. Nothing requires the slate's look-alikes to be unlocked before the exam. |
| G4 | Custom quiz | Choices from the selection (topped up only under 4 units); every answer moves `s.pg` up to the exam's entry. The exam itself is left to the photo quiz, where G3 applies. | The selection *is* the field. 8 genera drilled reach 95%, and the exam that follows draws from the same 8 met. |

Two smaller points:

- The **look-alike test** behind the weight (`pooledConf ≥ CONF.TRAP` or `confusable`) follows the pooled data. With
  today's sheet copy, several declared pairs have fallen below 0.2: Acropora-Montipora is at 0.13 against its prior
  0.3. As the community stops confusing a pair, it stops counting as a look-alike for everyone. That is intended
  ("a pair nobody confuses fades"), but it moves more questions to the 0.5 weight.
- The rule "no genus reached the exam while 10 genera or fewer were met" (LEARNING.md) is a property of the natural
  path in simulation. Nothing enforces it, and the Custom quiz goes around it.

### 3.2 Pierre's scenario, step by step (the 8 most common genera)

Opening order by commonness (`gen[n].cm`): Acropora, Lobophyllia, Porites, Plerogyra, Pocillopora, Montipora,
Goniopora, Tubastraea. Computed with `data.json`, the app's priors (`CONF`) and the pooled confusions of a `?stats=1`
copy in this session's scratchpad (2026-11-05 02:27); script
`/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/setsize/illus.py`.

- **Custom drill.** Among these 8, no pair reaches the pooled `CONF.TRAP` (0.2) on today's data; the highest is
  Porites-Goniopora at 0.16. Questions are therefore scored with `plausibleK` (2-3) and the 0.5 look-alike factor:
  w ≈ 0.33-0.44.
  - The moving average settles where right·w·(1 − pg) = miss·w_miss·pg.
  - At 95% right, w 0.44 and misses in full: pg* = 0.95·0.44 / (0.95·0.44 + 0.05) ≈ 0.89.
  - At w 0.33: about 0.86.
  - Both are above the exam's entry (0.8, shown as 95%), as Pierre says. At 90% right with w 0.33 it settles at 0.75
    and stays under it.
- **Exam in the photo quiz** (traps among units met). The exam choices against the slate's real top 3 (pooled score;
  * = never met):

  | Genus | Exam choices today (pooled) | The slate's 3 most confusable |
  |---|---|---|
  | Pocillopora | Tubastraea 0.06, Acropora 0.04, Montipora 0.03 | **Stylophora 0.25\***, Mycedium 0.10\*, Astreopora 0.09\* |
  | Montipora | Porites 0.13, Acropora 0.13, Pocillopora 0.03 | **Hydnophora 0.27\***, Anacropora 0.15\*, Porites 0.13 |
  | Goniopora | Porites 0.16, Acropora 0.03, Pocillopora 0.03 | **Alveopora 0.20\***, Porites 0.16, Duncanopsammia 0.14\* |
  | Porites | Goniopora 0.16, Montipora 0.13, Pocillopora 0.02 | **Astreopora 0.21\***, Millepora 0.18\*, Goniopora 0.16 |
  | Tubastraea | Pocillopora 0.06, Montipora 0.02, Goniopora 0.02 | Alveopora 0.16\*, Duncanopsammia 0.15\*, Turbinaria 0.14\* |
  | Acropora | Montipora 0.13, Pocillopora 0.04, Goniopora 0.03 | Anacropora 0.13\*, Montipora 0.13, Cyphastrea 0.11\* |

  For every one of the 8, the strongest confusion of the slate is never in the exam. Two of the exam's 5 questions
  are typed, read against every name the app knows, but the player can only recall the 8 names they hold.

### 3.3 Coverage: how much of the confusion field a player has met

Weighting every other slate unit c by the pooled confusion score ω_tc (the traps' own score), the share of a unit's
confusion mass covered by the units met:

| Units met (commonness order) | 4 | 8 | 12 | 16 | 20 | 25 | 30 | 35 | 40 |
|---|---|---|---|---|---|---|---|---|---|
| Mean coverage of the units met | 0.08 | 0.18 | 0.27 | 0.38 | 0.46 | 0.59 | 0.73 | 0.87 | 1.00 |
| Lowest | 0.03 | 0.12 | 0.13 | 0.19 | 0.24 | 0.41 | 0.46 | 0.76 | 1.00 |

For the 8, between 83% and 100% of each genus's confusion mass lies *outside* the pairs at or above `TRAP`, in the many
weak competitors. Unrelated genera at 0.03 each, ×30, weigh about as much as three look-alikes at 0.3. This is the
quantitative form of "sheer number": the many weak competitors together weigh as much as the few strong ones, and
nothing in today's weights sees them.

### 3.4 What a choice model predicts (the 8 drilled, then the whole slate)

Luce choice, P(right on a photo of t | field V) = 1 / (1 + Σ_{c∈V, c≠t} r_tc), with r_tc the odds of a mix-up when c is
offered alone with t. Trained pairs (contrasted many times): 2% mix-up. Pairs never contrasted: the pooled score,
reduced by a transfer factor τ (how much of the training carries over; section 1.3).

| Genus | 4 choices (3 met traps) | All 8 met (typed) | Whole slate, τ = 0 / 0.5 / 0.8 |
|---|---|---|---|
| Acropora | 0.94 | 0.88 | 0.44 / 0.60 / 0.74 |
| Lobophyllia | 0.94 | 0.88 | 0.48 / 0.63 / 0.76 |
| Porites | 0.94 | 0.88 | 0.38 / 0.54 / 0.71 |
| Plerogyra | 0.94 | 0.88 | 0.49 / 0.63 / 0.76 |
| Pocillopora | 0.94 | 0.88 | 0.40 / 0.56 / 0.72 |
| Montipora | 0.94 | 0.88 | 0.34 / 0.50 / 0.68 |
| Goniopora | 0.94 | 0.88 | 0.40 / 0.55 / 0.71 |
| Tubastraea | 0.94 | 0.88 | 0.39 / 0.55 / 0.71 |

An illustration, not a measurement. The pooled scores come from average players who had not drilled anything, and τ
is unknown. Even with 80% transfer, the genus shown at 95% and then Learned would be named right about 7 times in 10
against the whole slate. With no transfer, 4 in 10. Typing among 8 names (0.88) is barely harder than picking among 4.

### 3.5 Information per answer

log2 k: 2 choices 1.0 bit, 3 choices 1.58, 4 choices 2.0, 8 units 3.0, 15 units 3.9, 40 units 5.3. As a share of a 40-way
identification: 0.19, 0.30, 0.38, 0.56, 0.73, 1. Today a 4-choice question with a look-alike carries **full weight
(1.0)** for 38% of the information a whole-slate identification carries. A typed answer with 8 units unlocked carries
full weight for 56%.

### 3.6 Why our simulation cannot see it

`tools/learnsim.js`'s learner recognises genus t with p = σ(logit(know[t]) − d − …). When it fails to recognise, it
picks among **the choices shown**. `know[t]` grows after each answer on t, *whatever the competitors were*. Drilling 8
genera therefore raises `know` exactly as drilling 40 would.

Its "hard reference question" does use the slate's 3 most confusable genera, met or not, but its recognition term
ignores them. So learnsim scores the 8-genus drill as real knowledge, and could not tell any of the options below from
today's rules. **A learner with set-size effects is a prerequisite** (section 4.9).

---

## 4. Options, then one design

### 4.1 Mild: fix the field of each answer (G1, G2)

- **Typed answers: k = the plausible vocabulary.** Replace `TYPED.k = Infinity` with the plausible units among those
  unlocked (`plausibleK` applied to the unlocked units, the same rule as picks; at least 2). In the Custom quiz, use
  the selection: the player knows the answer is one of the units they picked.
  - Pros: removes the "typing among 8 counts as ∞" inflation; one rule for picks and typed answers.
  - Cons: typed answers move the Elo less early on, and the sheet's `guess_` (v27) and the replay's `kOf` must
    follow (sheet script change).
  - Beginners: invisible.
- **Information weight**: w = min(1, log2 k_eff / log2 K), with K the reference (4 today, or the slate size).
  - With K = 4 it changes little.
  - With K = 40, every early answer would weigh 0.2-0.4: far too slow for beginners, and it double counts with the
    look-alike factor.
  - Not recommended alone.

### 4.2 Medium: a ceiling from slate coverage

- The bar is capped by the share of the slate's confusion mass the player has been tested against (section 3.3).
  - Pros: fixes G1-G4 at once; nothing decays; one rule for every mode.
  - Cons: per-unit bars fall for anyone who has met few units.
  - Beginners: their first units stop around 55-65% (section 4.5) unless the display shows the part "known among the
    units met" (section 4.7).
- A *flat* ceiling tied only to "units met / slate" is simpler but ignores which units: meeting 20 unrelated genera
  would "cover" Pocillopora without ever showing Stylophora. Use the confusion-weighted version.

### 4.3 Strong: the exam on the whole field

- Exam entry requires every look-alike of the slate (pooled ≥ `TRAP`, or declared) to be unlocked and contrasted.
  The exam's traps are the unit's 3 most confusable units of the slate (the same set as learnsim's reference
  question). Typed exam questions keep reading every name.
  - Pros: makes "Learned" mean what Pierre says, for the pairs that matter most; cheap to build.
  - Cons: delays Learned for anyone on the natural path, which is intended.
- **Open-set exam questions** ("None of these / another genus" as a fifth button, and sometimes a photo of a slate unit
  that is not among the choices) measure false alarms directly, in the PALM's SDT spirit.
  - Pros: the most faithful to the field.
  - Cons: a new question format players see (Pierre's call); harder to score.
  - Keep for later.
- **Choices drawn from the whole slate's names, unmet units included** (in the exam).
  - Cons: a beginner faces names never seen. That says nothing about their skill and contradicts the progressive path
    (rule 6d).
  - Not recommended: requiring the look-alikes to be *unlocked* first achieves the same honestly.

### 4.4 Other levers considered

- **Decay or re-test when the set grows** (ALEKS-like).
  - Pros: re-confirms against new competitors.
  - Cons: bars going down when a new unit opens feels like punishment, and players would avoid opening units.
  - With a fixed slate denominator (section 4.5), coverage already counts unmet units as untested, so no decay is
    needed.
  - A learned unit facing a newly opened look-alike gets it as a trap at once (the trap rule already picks
    confusable units), and two misses take Learned away (`mxKept`, as today).
- **Custom-quiz progress capped.**
  - Cons: a rule per mode ("no coded tracks or exceptions", Pierre 2026-11-02), and the Custom quiz is where players
    fix their mix-ups.
  - Not needed once coverage exists: drilling 8 units clears only the pairs among those 8.

### 4.5 Recommended design: "proven against the field"

One rule, the same for every subject and rank. The constants are proposals for the tier-2 sweep, not decisions.

1. **Field of a unit** F(t): the units of t's rank that the progress counts, i.e. the slate for corals (40 genera).
   Bonus genera are *not* in the field of slate genera, so turning the bonus on never lowers a bar. For fish, see
   section 4.6.
2. **Field of an answer** V(q):
   - a pick question: the choices shown;
   - a typed question: the units unlocked of that rank (the Custom quiz: its selection plus top-ups);
   - an "Again: A or B?" or a duel: the pair.
3. **Pair cleared**: `cl[t][c]` counts the right answers on t with c in V(q) (a new per-unit counter beside `off` and
   `conf`, synced, and rebuilt by the replay from the log's choices and mode).
   - cleared_tc = min(1, cl_tc / R), with R = 2 (to sweep: 1-3).
   - A mix-up of t and c (either direction) resets cl_tc to 0. The pair is no longer cleared, and the existing rule
     13 already costs both units progress.
   - Never time-based (rule 12).
4. **Coverage**: cov_t = Σ_{c∈F(t)} ω_tc · cleared_tc / Σ_{c∈F(t)} ω_tc, with ω_tc the pooled confusion score
   (`pooledConf`: declared look-alikes as prior, then the community's data).
   - Unrelated units weigh little each (`CONF.BASE` 0.03) but many: about half the mass. That is Pierre's "sheer
     number", with no new constant.
   - A unit never met has cleared 0, so the field is the whole slate whatever is unlocked.
5. **The bar** (`scoreOf`): `0.95 × min(1, pg / M) × h(cov)`, with h(c) = b + (1 − b) · c^γ; proposals b = 0.4, γ = 0.5.
   - Each exam question passed adds 1% as today; a passed exam gives 100%.
   - `pg` (the moving average) is unchanged: it stays the within-field measure and still drives the draw, the opening
     hold, the typed share and the miss weights. **The typed share must read the within-field score**, not the new
     bar, or typed questions would arrive later than simulated.
6. **The exam's entry**: pg ≥ M **and** cov ≥ C_EX (0.9) **and** every unit of F(t) with ω_tc ≥ `CONF.TRAP` or a
   declared look-alike is cleared. Its 3 traps are the 3 units of F(t) with the highest ω_tc; all are unlocked by the
   entry rule. Typed exam questions stay as they are (2 of 5, reading every name).
7. **Nothing else changes**: the Elo, the photo statistics, the draw and the opening path. The Custom quiz needs no
   special rule: coverage only counts the pairs its choices really contained.

**What it does, in numbers** (h with b 0.4, γ 0.5; the ceiling assumes every pair among the units met is cleared, so
real bars sit lower):

| Units met | Mean coverage | h (cap of the bar from 95%) | Highest bar of a unit |
|---|---|---|---|
| 4 | 0.08 | 0.57 | 54% |
| 8 | 0.18 | 0.65 | 62% |
| 12 | 0.27 | 0.71 | 67% |
| 20 | 0.46 | 0.81 | 77% |
| 30 | 0.73 | 0.91 | 87% |
| 40 (all pairs cleared) | 1.00 | 1.00 | 95%, then the exam |

The 8 drilled in the Custom quiz: about 62% each at best, and 12% overall on the slate (today 8 × 95-100% / 40 ≈ 19-20%),
with no Learned mark. That matches the choice model's 0.34-0.76 in section 3.4. Pierre's non-linear shape follows from
the formula:

- the moving average makes each point harder than the last;
- the concave h gives the first units met a large share early (0.57 at 4 units);
- the last 20-30 points need the whole field, opened and contrasted.

It is fast at the start and slower and slower, with no step and no hard cap. The global % is the mean of the bars,
as today.

**Why this rule rather than a model-based one.** The most principled bar would be "the success the app predicts against
the whole slate": the Luce formula of section 3.4, with the player's own pair records where they exist and the pooled
scores elsewhere. It depends on τ and on the Luce independence assumption, both unmeasured, and it is hard to explain.
Coverage is its transparent approximation ("proven against 31 of the 39 genera Acropora could be taken for, weighted
by how often players confuse them"). Keep the model-based bar as the validation's truth measure (section 4.9), not as
the rule.

### 4.6 Fish and other subjects

- **Ranks.** The field is per rank, along the tree of FISH_PATH "Levels". The parent's own unit handles telling
  parents apart; a child's field is its parent's children plus its look-alikes at the same rank elsewhere:
  - an entry (family): the 27 circle-1 entries;
  - a scientific genus: the genera of its entry plus its declared or data look-alikes in other entries (FISH_PATH
    "Look-alikes at any rank", designed);
  - a species (by common or scientific name): the species of its entry plus its look-alikes across entries.

  Without this, a species' denominator would hold about 300 unrelated species at `CONF.BASE`, and no species could
  get past a tiny coverage before all 340 were open. Corals have a single rank, so F = the slate.
- **Circles.** Circles 2 and 3 never count in the progress (as now), so they are not in the field of circle-1 units,
  the same rule as the coral bonus genera.
- **Typed answers for fish** read every name of an entry (`fishTypeNames`); the typed field is still the units
  unlocked at that rank. A right genus typed for a species (the partial credit) clears nothing at the species rank.
- **The global fish score** (25% entries + 75% species credit, `tools/fishscore.js`) takes the per-unit bars as inputs.
  Coverage lowers those inputs early, then they catch up. The score's anchors (80% common names, 85% scientific, 100%
  both) still hold at full mastery, because coverage reaches 1 when every unit is known. The "fast at the start" of the
  fish score comes from the entries' 25%; the corals get theirs from h. The two methods are compatible.
- **The fish exam** "to rethink" (about 20 hard questions in scientific names, FISH_PATH) should use the same entry
  rule (coverage and look-alikes cleared) and the same traps (the field's most confusable).

### 4.7 Beginners' motivation and how to say it

The risk is real: a beginner who sees their first genus stop at about 60% may feel stuck. Three things keep it fair:

- **Two-tone bar** (needs Pierre's approval; players see it):
  - a solid part, the bar as defined above (it counts in the %);
  - a light part behind it up to `0.95 × min(1, pg/M)`, labelled "among the genera you've met".
  - The beginner sees their work recognised, and the gap shows what the rest of the slate will ask.
- **A chip on the genus sheet**: "Proven against 7 of 39 genera" (counting cleared ≥ 0.5, weighted or not), and on
  hover or tap: "100% means you can tell it from every genus of the slate."
- **Opening a new unit raises bars.** Each new unit met adds pairs that can be cleared, so players learn that new
  genera move them forward. This is the incentive Pierre wants (no hoarding of 8 easy names).

Wording proposals (player text is Pierre's call):

- My progress help: "A genus reaches 100% when you can tell it apart from **every** genus on the slate, not just the
  ones you've met. Meeting new genera and getting them right beside it fills the bar."
- Mastery exam (help text, the exam stays unannounced): "The final check uses its real look-alikes, so it waits until
  you've met them."

### 4.8 The recalculation (rules version 5)

Pierre accepts a strong recalculation. The infrastructure exists (LEARNING.md "Full replay", "Rules versions"):

1. **Replay.** Add `cl` to `core.js` `replayProgress`.
   - From each log row: the choices (column 10) for picks.
   - For a typed answer (`|t`): the units *asked before that answer* stand in for the units unlocked. The log holds
     answers, not cards; listed as an approximation, slightly lower than the truth.
   - For a duel or an Again: the pair.
   - Mix-ups reset the pair. Coverage and the bar follow at each answer.
   - `RVS` gets v5 `{v: 5, at, why, msg: RV_CARD}`.
   - The sheet's `pctOf_` mirror and the leaderboard % follow (`tests/sync.test.js` keeps them equal). This is a
     sheet-script change: deploying it needs Pierre or his setup, as for earlier versions.
2. **Learned marks.** A mark stays when the replayed state *today* meets the new exam entry (coverage ≥ C_EX and every
   look-alike of the slate cleared). Otherwise `mxRecalc` takes it away with reason `rules`.
   - Judged on today's state, not the state at the exam: a player who has since opened and contrasted the field
     keeps the mark, which is kinder and still coherent.
   - The existing card tells the player once ("recalculated from all your answers with the app's current rules"),
     with the genus back on its bar and its exam to come again.
3. **Badges.** As today:
   - only the achievements that rest on learned genera (`ACH_LEARN`: Instructor 1/5/10/20, Coral master, Group
     complete) are revoked when no longer met, dated in `_gone`, so a merge never brings them back;
   - every other badge is kept.
4. **Players.** The standard `RV_CARD` shows the progress ring before and after, to every device with answers whose
   progress moved. A suggested line for Pierre: "We now count a genus as known only once you can tell it from every
   genus of the slate. Your bars were recalculated from all your answers; meeting new genera fills them again."
5. **Before merging**, the per-player effect on the real log is shown to Pierre: overall % old → new, marks kept or
   lost, the largest drops. The descriptive part of tier 3 below.

### 4.9 How to validate it (pre-declared, following the stats-methods study)

**Step 0: tools before any verdict.**

- **A field learner in `learnsim`** (`--learner field`). Per pair, a discriminability that grows only when the pair is
  contrasted (both in a question's choices, or in the feedback montage), with transfer τ from the per-unit learning
  to pairs never contrasted (τ ∈ {0, 0.5, 0.8} as a robustness factor).
  - A question's success: Luce over V(q).
  - A typed question: Luce over the learner's own vocabulary, the units met.
  - Truth measures:
    - **p_open(t)**: Luce over the whole slate, all names known to the scorer, an average photo, one view;
    - **d′_open(t)**: hits on t against false alarms of t over photos of every other slate unit, the PALM measure.
  - Keep the current learner as a second world: a rule that helps only in the world it was designed for is suspect
    (Doroudi et al., cited in the stats study).
- **A Custom-quiz scenario** (`--custom 8`): the player selects the 8 most common genera, drills N questions in the
  Custom quiz, then plays the photo quiz. Pierre's case, reproducible.

**Tier 2 (selection), seeds 1-30.** Sweep b ∈ {0.3, 0.4, 0.5}, γ ∈ {0.5, 1}, R ∈ {1, 2, 3}, C_EX ∈ {0.8, 0.9}, against
today's rules, the 4 profiles plus the Custom-8 scenario, under both learners. Choose on the primary measure while
holding the guardrails; fit a response curve rather than taking the best cell (stats study section 4).

**Tier 2 (confirmation), fresh seeds 31-60.** One pre-declared test, chosen setting against today's rules.

- **Primary 1: overclaim at 600 questions.** Per run, the mean over units met of max(0, bar_t − p_open(t)), field
  learner τ 0.5. Lower is better. Pooled over the 5 scenarios, stratified sign-flip over the (scenario, seed) units.
- **Primary 2: precision of Learned at 1000 questions.** Per run, the share of Learned units with p_open ≥ 0.8.
  Higher is better.
- Holm over the two primaries. Per-scenario claims only if a pooled primary passes (closed testing), Holm over 5.
- **Guardrails** (non-inferiority, one-sided 90% bound; margins to fix once in LEARNING.md, Pierre's "smallest change
  that matters"):
  - true learning `knowSlate` at 300 ≥ −0.02;
  - genera met at 100 within ±2 (the opening pace);
  - the expert's Learned at 1500 not below a floor Pierre sets ("strong players must be able to go far");
  - the beginner's first-session motivation proxy: the mean *displayed* bar of the genera met at question 50 (a
    margin Pierre sets; the two-tone bar's light part reported beside it);
  - the typed share and the typed right % unchanged within margins.
- **Exploratory, uncorrected, numbered**: everything else (open/15, comeback measures, d′_open).

**Tier 3 (real log).**

- (a) The per-player replay, descriptive (section 4.8, point 5).
- (b) One confirmatory question the replay *can* answer: **does the field size predict real answers?** Add log2(units
  unlocked of that rank at that answer) and coverage as predictors of correctness, beyond ability, photo and format,
  in `abilityeval.js`.
  - Measure: player-level paired log-loss, sign-flip over players. Declared direction: a larger field lowers
    success; higher coverage raises it.
  - With about 10 players this may be "no clear difference", and the report must say so (the stats study's wording
    rules).
  - The admin's Analyses can carry the same factor as exploratory.
- What the replay cannot judge: whether players learn better under the new bar (different questions would have been
  asked). Say it in one line.

---

## 5. Questions for Pierre (each with a recommendation)

**a. What should 100% promise?** "Can tell a photo of it from every unit of the slate" (field = the whole slate, a fixed
denominator, unmet units counting as untested)?
*Recommendation*: yes, exactly that. It makes the bar honest whatever is unlocked, and no bar ever drops when a new
unit opens.

**b. Coverage weighted by confusion, or flat?** Weighted by the pooled confusion score (look-alikes count most, the
many unrelated units together about half), or every unit equal?
*Recommendation*: weighted. Flat would let 20 unrelated genera "cover" Pocillopora without Stylophora ever being
shown. The weights already exist (`pooledConf`).

**c. How low may a beginner's first genera stop?** With b 0.4 a genus caps around 54-62% while 4-8 genera are met.
*Recommendation*: accept a cap in that range, chosen by the tier-2 sweep under a motivation guardrail you set, and pair
it with **d**.

**d. Two-tone bar** (solid: proven against the slate, counts in the %; light: "among the genera you've met")?
*Recommendation*: yes. It keeps beginners' work visible while the % stays honest. A mock-up for your eye first, since
players see it.

**e. Exam entry.** Require every slate look-alike to be unlocked and contrasted, coverage ≥ 0.9, and traps = the
slate's 3 most confusable?
*Recommendation*: yes. This is the PALM and Larkwire practice and your own rule of 2026-11-02 ("a genus can't be
confirmed as learned before it has been compared with the genera it gets confused with"), now enforced rather than
merely observed in simulation.

**f. Typed answers: field = units unlocked (the selection in the Custom quiz) instead of ∞?**
*Recommendation*: yes, for the coverage and the guess rate. It is the one change that makes "even typing is easy with
8 genera" disappear. A sheet-script change (guess rate v28) ships with the rules version.

**g. Custom quiz: no special cap, coverage only?**
*Recommendation*: yes. One rule for every mode. The 8 drilled stop around 62% on their own, and the mode stays the
place to fix mix-ups.

**h. No decay when the set grows?**
*Recommendation*: no decay. Coverage already counts the unmet; the trap rule and the two-miss rule (`mxKept`)
re-confirm learned units against new look-alikes. Revisit only if the real log shows learned units failing against
newly opened look-alikes.

**i. Recalculation.** Rules version 5, learned marks kept only where today's replayed state meets the new exam entry,
only the `ACH_LEARN` badges revoked, the standard card with before and after?
*Recommendation*: yes. Judging the mark on today's state is kinder than on the exam day and still coherent. Show the
per-player effect on the real log before merging.

**j. Fish ranks.** A child unit's field = its parent's children plus its cross-parent look-alikes (species within
their entry, genera within their entry), the parent unit handling the rest?
*Recommendation*: yes. Otherwise no species could ever be covered before all 340 were open. Fish look-alikes at any
rank (designed, not built) become the cross-parent part.

**k. Open-set exam questions** ("another genus" button; a photo of a unit not among the choices)?
*Recommendation*: later. The most faithful test (false alarms, as in Kellman 2023), but a new format players see;
first see whether **e** is enough.

**l. Validation order.** Build the field learner and the Custom-8 scenario in `learnsim` first, then the tier-2 sweep,
then the real-log check?
*Recommendation*: yes, in that order. Without the field learner the simulation scores the 8-genus drill as real
knowledge and cannot judge any option here.

**m. Rule 14f wording**: the stats study already asked whether "no p-values wanted" still stands. This study's
validation reports intervals and plain verdicts, with adjusted p-values in a details column. Same recommendation as
that study.

---

## 6. References

Checked this session (link read):

- Clopper, Pisoni & Tierney (2006). Effects of open-set and closed-set task demands on spoken word recognition. *J Am
  Acad Audiol* 17:331-349. https://thieme-connect.com/products/all/doi/10.3766/jaaa.17.5.4 [abstract]
- Davis, Sutherland & Judd (1961). Information content in recognition and recall. *J Exp Psychol*. Via
  https://www.nature.com/articles/211324a0 [secondary]
- Hick (1952) *QJEP* 4:11; Hyman (1953) *J Exp Psychol* 45:188. https://en.wikipedia.org/wiki/Hick%27s_law [secondary]
- Johns, Mac Aodha & Brostow (2015). Becoming the expert: interactive multi-class machine teaching. CVPR.
  https://arxiv.org/abs/1504.07575 [abstract]
- Kellman, Massey, Krasne et al. (2023). Connecting adaptive perceptual learning and signal detection theory in skin
  cancer screening. *Proc. CogSci* 45. https://escholarship.org/uc/item/83z22046 [full text]
- Maddox, Filoteo, Hejl & Ing (2004). Category number impacts rule-based but not information-integration category
  learning. *JEP:LMC* 30:227 [secondary]; Stanton & Nosofsky (2013), doi 10.1037/a0031670,
  https://next.sciencegate.app/document/10.1037/a0031670 [secondary]
- Miller, Heise & Lichten (1951). The intelligibility of speech as a function of the context of the test materials.
  *J Exp Psychol* 41:329.
  https://www.bohrium.com/paper-details/the-intelligibility-of-speech-as-a-function-of-the-context-of-the-test-materials/812082716714467328-17579
  [secondary]
- Pashler & Mozer (2013). When does fading enhance perceptual category learning? *JEP:LMC*.
  https://home.cs.colorado.edu/~mozer/Research/Selected%20Publications/reprints/PashlerMozer2013.pdf [abstract]
- Papoušek, Pelánek & Stanislav (2014). Adaptive practice of facts in domains with varied prior knowledge. EDM.
  https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf [abstract]
- Rimoin, Altieri, Craft, Krasne & Kellman (2015). Training pattern recognition of skin lesion morphology, configuration,
  and distribution. https://kellmanlab.psych.ucla.edu/files/rimoin_altieri_craft_krasne_kellman_2015.pdf [abstract]
- Scheirer, Rocha, Sapkota & Boult (2013). Toward open set recognition. *IEEE TPAMI* 35:1757, doi
  10.1109/TPAMI.2012.256 [bibliographic]
- Scott, Tanaka, Sheinberg & Curran (2008).
  https://www.colorado.edu/lab/curran-lab/sites/default/files/attached-files/scott_2008.pdf [abstract]
- Settles & Meeder (2016). A trainable spaced repetition model for language learning. ACL.
  https://preview.aclanthology.org/landing_page/P16-1174 ; https://www.github.com/duolingo/halflife-regression ;
  https://blog.duolingo.com/how-we-learn-how-you-learn
- Sternberg (1966). High-speed scanning in human memory. *Science* 153:652.
  https://www.scilit.net/publications/a0c3d513fba08abfc3720f0a26bb7ea5 [abstract]
- Tanaka, Curran & Sheinberg (2005). The training and transfer of real-world perceptual expertise. *Psych Sci* 16:145.
  https://www.colorado.edu/lab/curran-lab/sites/default/files/attached-files/tancurshein.pdf [abstract]
- Wahlheim, Dunlosky & Jacoby (2011). Spacing enhances the learning of natural concepts. *Mem Cogn* 39:750.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3085105 [abstract]
- Buck et al. (2019). Just a small bunch of flowers. *PeerJ*. https://peerj.com/articles/6581 [abstract]
- Khan Academy help: https://support.khanacademy.org/hc/en-us/articles/115002552631 ,
  https://support.khanacademy.org/hc/bg/articles/5548760867853
- ALEKS FAQ:
  https://www.mheducation.com/support/aleks-support-center/knowledge/why-does-aleks-periodically-give-me-new-knowledge-checks.html
- Larkwire: https://larkwire.com/birdsong/howto ; https://www.birderslibrary.com/reviews/software/larkwire_birdsong_app.htm
- Memrise (founder, 2011 forum post):
  https://tl.net/forum/general/282817-memrise-learning-languages-with-a-game-approach?page=4 [secondary]
- Cornell Bird Song Hero: https://www.allaboutbirds.org/news/?p=7083
- BirdID, Nord University: https://birdid.no
- Rodriguez (2005), three options are optimal (meta-analysis), via
  https://u.osu.edu/cvmofficeofteachingandlearning/2018/02/02/how-many-options-should-a-multiple-choice-question-have-maybe-just-3/
  [secondary]

From memory (not re-checked today): Miller (1956) magical number seven; Pollack (1952) absolute identification; Shepard
(1957) and Luce (1959) choice models; Nosofsky (1986) generalized context model; Kornell & Bjork (2008) interleaving;
Wolfe, Horowitz & Kenner (2005) prevalence effect; Lord (1980) on c below 1/k; Bock (1972), Thissen & Steinberg
(1984); FSRS / Anki; iNaturalist / Seek / Merlin / BirdNET without mastery quizzes. Pelánek 2016 / 2017 and FSRS are
also in LEARNING.md's references.

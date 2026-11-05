# Confused by the name? Name similarity, word parts and personal associations in genus mix-ups: a study

Written 2026-11-05, evening Manila, for Pierre to read on the morning of 2026-11-06. Read-only study: no branch, no PR,
no code changed. Code read on `origin/main` at `15a05894`. Players are P1…P10 (numbered by order of first answer; the
key is not in this file). Scripts and the pre-declared plan are in the scratchpad folder `namestudy/`
(`prereg.md` was written before any outcome was computed; `prep.py`, `roots.py`, `a1.py`, `a1b.py`, `a3.py`, `a6.py`,
`pxp.py`, `pxp2.py`). Marks used for sources: **[checked]** read today (abstract, full text or a reliable secondary page, as said);
**[memory]** from my own knowledge, not re-checked today; **[repo]** read in the repository.

**Pierre's hypothesis (2026-11-05), in three layers he gave during the day:**

1. *Sound and spelling.* Players mix genera up not only because they look alike but because their names are alike
   (Pectinia / Pavona: "it starts with a P, must be that"), in multiple choice and typed answers alike; likely the same
   for fish.
2. *Meaning of word parts.* Scientific names are built from roots with meaning (-phyllia "leaf", -pora "pore", Acro-
   "tip", Lepto- "thin", Echino- "spiny", Pecti- "comb"…); players build internal pictures of these parts, so names that
   share or evoke similar roots, or a root that suggests the other genus's look, get mixed up.
3. *Personal associations.* Beyond roots, each person has idiosyncratic, mostly unconscious associations for letter
   strings ("ecti" in Pectinia evokes a personal memory for one person); two names whose fragments link to associated
   personal memories get confused by that person, with no spelling, sound or root analysis showing it. That would
   explain why each person struggles with particular pairs and not others.

---

## 0. The short version

1. **The science supports layers 1 and 2 in general** and layer 3 in its weak form. Look-alike / sound-alike drug names
   are the best-measured case: spelling and sound similarity raise false recognition in pharmacists and students alike
   (Lambert, Chang & Lin 2001), and 68% of confusable drug-name pairs share their first letter (Shah et al. 2016).
   Partial-cue retrieval (tip-of-the-tongue: the first letter is often what is left, Brown & McNeill 1966) gives a
   mechanism for "it starts with a P". Similar response names slow paired-associate learning (Underwood's intralist
   similarity work). Word parts are decomposed automatically even in made-up words (Longtin & Meunier 2005; Rastle &
   Davis 2008), so a Latin name is read as pieces. Individual association networks really differ from person to person
   (Morais, Olsson & Schooler 2013). **What I did not find**: any study of name similarity in species-identification
   training, or one showing person-specific *pair* confusions caused by private associations. Layer 3 is plausible and
   consistent with the literature, not demonstrated by it.
2. **On our answers (10 players, 1,933 answers, 242 usable multiple-choice errors), the pre-declared test is not
   significant.** When a player picks a wrong genus among three wrong options, an option with the same first letter as
   the right genus is picked about **1.2 times** as often as one without, after the visual controls (declared
   look-alike, same family, shared growth form, same IMR lecture group): odds ratio 1.20, 95% interval 0.80 to 1.51
   (player bootstrap; 0.75 to 1.9 by the trial-level Wald interval). **Large first-letter effects are excluded**
   (more than about 1.5-1.9 times); a small one is possible.
3. **The raw pattern is there but most of it is visual.** Without visual controls the same-first-letter odds ratio is
   1.50; with the CONF priors only (look-alike, family, form) 1.33 (p ≈ 0.05); adding the IMR lecture group brings it
   to 1.20. Same-initial pairs are twice as often in the same IMR lecture group (18% against 8%): the lecture groups
   themselves put Pavona, Pectinia and Pachyseris together. Pectinia / Pavona (9 mix-ups in 54 offers, 17%) cannot be
   told apart from its visual link with our data.
4. **One exploratory hint**: among pairs with no visual link (not look-alikes, not the same family, not the same lecture
   group), a shared first letter has an odds ratio of **1.76** (interval 0.62 to 2.97, not significant); among visually
   linked pairs, 1.03. Merulina / Millepora (4 mix-ups in 14 offers, no declared link) is the clearest case. If the
   name works as a fallback cue when the eye has nothing to go on, this is where it would show. Worth pre-declaring as
   the next test.
5. **Other name measures and word parts**: none significant (bigram Dice, edit distance, phonetic, shared ending,
   shared root, related root meaning). Shared prefix length beyond the first letter even leans the other way.
6. **Typed answers**: 55 typed questions, 11 wrong typed genus names, 9 of them by one player: too few to test. 4 of
   the 11 share the first letter with the right genus (1.0 expected by chance among slate genera) but 6 are declared
   look-alikes too (0.8 expected). One of them is Pectinia typed as Echinopora, the "ecti / echi" pair of Pierre's own
   example; an anecdote, not evidence.
7. **Person-specific pairs: not shown yet.** A score test for a player-by-pair effect beyond the global pair effect
   (visual and name features + each pair's own pooled rate) gives p = 0.04, but once each player gets their own weights
   on the visual features (some players' errors follow look-alikes and families more than others') it falls to
   p = 0.28. What first looked personal is mostly *how much* each player follows visual similarity, not private pairs.
   Power is modest (about 50% for a pair two to three times harder for one player than for others), so layer 3 is
   **unproven, not contradicted**. Even a clear footprint would not say *why* a pair is personal (a visual distinction
   not yet learned looks the same as a private association).
8. **What the app could do**: the useful part needs no proof of mechanism. The personal confusion path (`pairConf` /
   `confOf`) already makes each player's own hard pairs traps and duels: the right response to layer 3 whatever its cause,
   with no change needed now. For names: show the name difference in the feedback and on the genus sheet (cheap, low risk), and the etymology
   where it describes the look (the IMR mnemonics already do this). Hold the name terms in CONF and the name traps
   until a pre-declared test shows an effect (5.3).
9. **Questions for Pierre** in section 6, each with a recommendation.

---

## 1. What exactly is being claimed, and what would show it

The three layers predict different footprints in the answer log:

| Layer | Mechanism | Footprint in the data | Can our log show it? |
|---|---|---|---|
| 1. Sound / spelling | Partial name memory ("P…"), lexical competition between similar word forms | Wrong picks lean toward options whose names resemble the right genus's, beyond visual similarity, for *everyone* | Yes: a name-similarity coefficient in a choice model with visual controls |
| 2. Word meaning | Roots read as meanings ("phyllia = leafy", "pora = holes"); shared or related roots blur the labels; a root that fits the other genus's look misleads | Wrong picks lean toward options sharing a root or a related meaning, again for everyone (roots are public) | Yes, with a root lexicon (built here, `roots.py`) |
| 3. Personal associations | Each person's private links between name fragments | Pair difficulty that differs *between players* beyond the global pair effect and the measured name and visual features, and that persists within a player | Partly: a player-by-pair variance. The mechanism stays invisible: any persistent personal difficulty (a visual distinction not yet learned, a bad first photo) leaves the same footprint |

Two design facts of the app matter for the test:

- **Choices are not random.** The wrong options are traps picked by the confusion score (`model.js` `pooledConf`,
  `confOf`: declared look-alikes, family, shared growth form, then the players' mix-ups) and easy ones (no shared growth
  form, other lecture groups) [repo]. Names play no part in the choice, so name similarity among options is incidental,
  which is what a test needs; but visual similarity drives who meets whom, so the visual controls are essential.
- **Option buttons show genus names**, so in multiple choice the name is on screen and only has to be recognised;
  in a typed question it has to be produced. The literature (2.1, 2.2) says name similarity acts differently in the two
  (recognition errors rise with similarity; recall errors less consistently).

---

## 2. The literature

### 2.1 Look-alike / sound-alike drug names: the best-measured name confusions

- **Similarity raises false recognition, in experts and novices.** Lambert, Chang & Lin (2001), recognition memory
  experiments with 30 pharmacists and 66 students: both orthographic (spelling) and phonological (sound) similarity
  increased the probability of falsely recognising a new drug name as studied [checked: abstract, IDEAS/RePEc]. A
  companion recall study reported the opposite or inconsistent effects for recall (higher orthographic similarity went
  with *fewer* recall errors; phonological similarity had an inverted-U relation) [checked: secondary summary of the
  recall paper on Lambert's site]. **For us**: multiple choice is recognition, the setting where name similarity
  should matter most; typed answers are recall, where it may not.
- **Which similarity measure.** Lambert, Lin, Chang & Gandhi (1999, *Medical Care*) validated 22 computerised measures
  against real confusion data; trigram (shared three-letter sequences) measures predicted best, and a bigram measure
  with a space added at each end was used later [checked: abstracts and slides on Lambert's site]. Kondrak & Dorr
  (2004 COLING; 2006 *Artificial Intelligence in Medicine*) proposed **BI-SIM** (bigram-based orthographic) and
  **ALINE** (feature-based phonetic alignment); BI-SIM did best on mixed look-alike / sound-alike pairs, ALINE on
  sound-alike pairs, and a combination did best overall; the FDA used their system to screen proposed drug names
  [checked: abstracts and UMD news]. Edit distance and N-gram Dice are the usual baselines [memory].
- **The beginning of the name matters.** Of 224 confused proprietary drug-name pairs studied by FDA staff, **154 (68%)
  started with the same letter**; 52% shared a string of 3 or more letters, mostly at the start (59%) or end (34%), and
  in 95% of those in the same position in both names (Shah, Merchant, Chan & Taylor 2016) [checked: full text, PMC].
  No base rate was given, so "68%" is a descriptive, not a risk ratio.
- **Countermeasure: Tall Man lettering** (chlorPROMAZINE / chlorPROPAMIDE: capitals on the letters that differ).
  Evidence is mostly from the laboratory and mixed: one systematic review (16 studies, 13 in the laboratory) found lower
  error rates in 6 studies and higher in 1; another (Bryan et al. 2021, 6 laboratory studies) judged it "only
  marginally effective" and noted a "quasi-placebo" effect when users know why it is used; a 2020 meta-analysis was more
  favourable for name-differentiation tasks [checked: abstracts]. **For us**: showing the letters that differ in the
  feedback ("PEctinia / PAvona") is the closest analogue; cheap, but expect a small effect.

### 2.2 Partial-cue retrieval: "it starts with a P"

- In tip-of-the-tongue states, people often know the first letter, the number of syllables and similar-sounding words
  without the word itself (Brown & McNeill 1966) [checked: secondary summaries; exact percentages not verified]. Brown
  (1991, *Psychological Bulletin*) reviews the same pattern across many studies [memory].
- Malapropisms (saying a similar-sounding wrong word) tend to share the target's first sounds, syllable count and stress
  (Fay & Cutler 1977, *Linguistic Inquiry*) [title checked; content memory]. Vitevitch (2002) found more elicited speech
  errors for words in dense phonological neighbourhoods [checked: secondary summary].
- **Mechanism for us**: a player who has kept only "P…" of the right name, and sees one option starting with P, has a
  partial match that a non-P option cannot give. This predicts a first-letter effect in *both* modes, but strongest
  when the visual memory is weak (the exploratory pattern in 3.5).

### 2.3 Lexical neighbourhoods

The number of words differing by one letter or sound (orthographic N; OLD20; phonological neighbourhood density) slows
recognition and raises competition between similar words (Luce & Pisoni 1998; Yarkoni, Balota & Yap 2008) [memory].
A genus name whose neighbours are other genus names on the slate (Leptoria / Leptoseris / Leptastrea; the -pora,
-astrea, -phyllia families) sits in a dense neighbourhood: more competitors when it has to be recalled.

### 2.4 Paired-associate learning: names as responses to pictures

Learning genus names for photos is a paired-associate task (picture → name). The classic verbal-learning work found that
**similar responses within a list slow learning and cause intrusions** (Underwood and colleagues on intralist
similarity; Underwood, Ekstrand & Keppel 1965) [checked: titles and secondary summaries], that pairs sharing a common
label suffer response competition [checked: abstract of a related study], and that transfer and interference depend on
stimulus and response similarity together (Osgood 1949, "transfer and retroaction surface"; Gibson 1940 on
generalisation and differentiation) [memory]. Proactive and retroactive interference between similar associations are
among the most replicated memory effects (McGeoch; Barnes & Underwood 1959; Anderson 1974 "fan effect": the more
associations share an element, the slower each is retrieved) [memory]. **For us**: genera with similar names should be
harder to learn *as names*, especially early, and the effect should fade with learning.

### 2.5 Similar options in multiple choice

- Multiple choice with competitive (plausible) wrong options helps later retention of related information, provided the
  options are competitive (Little, Bjork and colleagues 2010-2012) [checked: secondary summary].
- The cost: a picked wrong option can be remembered as true later ("negative suggestion", Roediger & Marsh 2005), and
  feedback largely removes it (Butler & Roediger 2008) [memory].
- I found no human study isolating *name* (orthographic) similarity among options as a distractor property; distractor
  generation work uses semantic or orthographic similarity to make options plausible (Mitkov et al. 2009) [checked:
  title only].

### 2.6 Word parts and meaning (layer 2)

- **Automatic decomposition, even of made-up words.** In masked priming, non-words built from real morphemes
  (*rapidifier, *sportation) prime their stems as real derived words do, whatever their meaning (Longtin & Meunier
  2005) [checked: abstract]; recognition of complex words starts with a fast segmentation based on spelling alone,
  before meaning (Rastle & Davis 2008; the "corner" effect: corn-er is segmented although it has nothing to do with
  corn, Rastle, Davis & New 2004) [checked: abstracts]. A Latin genus name is, for a player, a pseudo-word: it will be
  split into chunks (-pora, -phyllia, Lepto-, -astrea) automatically. That is the cognitive basis of layer 2.
- **Transparent parts help, misleading ones hurt.** Cognates (words that look like their translation) are learned
  faster than non-cognates, and false friends cause errors (de Groot & Keijzer 2000; the false-friend literature)
  [memory]; semantically transparent compounds are processed more easily than opaque ones (Libben 1998) [memory].
  Applied to us: Acropora ("tip pore", the axial corallite at the branch tip) is transparent and helps; a root that fits
  another genus's look is a false friend.
- **Etymology as a mnemonic.** Teaching roots is a standard aid in biology and medicine (Borror's *Dictionary of Word
  Roots and Combining Forms*, 1960, written for students and taxonomists) [checked: listings]; "etymological
  elaboration" improved retention of idioms in second-language learners (Boers and colleagues, 2004-2007) [memory];
  teaching morphemic analysis improves vocabulary learning (Baumann et al. 2002; Nagy & Townsend 2012) [memory]. I found
  no controlled study on etymology for learning species names; only teaching reports and the caution that many names
  honour people or places or describe a feature that is not the one used for identification [checked: teaching
  resources]. **The IMR course already uses name mnemonics** [repo, `data.json` `mn`]: Acropora "A-cup-ora", Anacropora
  "Nah, Acropora", Seriatopora "pores in series", Pectinia "popping his pecs out", Pavona "a star in the pavement",
  Platygyra "a plate in a gyre". Rule 1 applies: keep the IMR wording, add at most a sourced note.
- **The keyword method** (Atkinson & Raugh 1975) builds an acoustic link from a foreign word to a familiar keyword and an
  image linking the keyword to the meaning; it works well for vocabulary [checked: abstract and Stanford report]. It is
  the deliberate version of layer 3: a personal sound-based association, used on purpose.

### 2.7 Personal associations (layer 3)

- **Association networks differ between people.** Morais, Olsson & Schooler (2013) built individual semantic networks
  for six people by snowball free association: all small-world and sparse, but differing in size and connectivity,
  and individual networks are not well represented by aggregated norms [checked: abstract and lecture slides]. Large
  association norms (Nelson, McEvoy & Schreiber 2004; De Deyne et al. 2019, *Small World of Words*, 90,000+
  participants) show long tails of responses given by few people; in a Spanish replication 12-18% of cue-response
  pairs varied systematically with age, gender or nationality [checked: abstracts; the 12-18% from the Spanish study].
- **Associations drive memory errors.** In the DRM paradigm, studying associates of an unstudied word (bed, rest,
  tired… → sleep) produces confident false memories of it (Roediger & McDermott 1995) [memory], and the backward
  associative strength of the list to the lure is the strongest predictor of false recall (Roediger, Watson, McDermott
  & Gallo 2001) [checked: secondary sources]. Spreading activation (Collins & Loftus 1975) is the standard account
  [memory]. This is the mechanism layer 3 needs: an association activates the wrong name.
- **Personal letter associations exist.** People prefer the letters of their own name (the name-letter effect, Nuttin
  1985) [memory]: letters carry personal meaning outside awareness. (Claims that it steers big life choices are
  contested: Simonsohn 2011 [memory].)
- **But individual susceptibility is not a stable trait.** The same people tested on three false-memory tasks showed
  mostly null correlations between tasks: "no false memory trait" (Nichols & Loftus, 2019) [checked: abstract].
  So what is personal is *which* associations a person has, not a general proneness.
- **Not found**: a study measuring person-specific *pair* confusions in label or category learning caused by private
  associations. The closest evidence is indirect: models that fit a student-by-item interaction (collaborative
  filtering over students and items) predict forgetting better and improve outcomes in vocabulary review (Lindsey,
  Shroyer, Pashler & Mozer 2014: +16.5% retention over massed study, +10% over generic spaced review) [checked:
  abstract and press release]; person-by-item variance is routinely found in item-response data but is usually small
  next to the main effects [memory].

**How far layer 3 holds.** Every piece is documented separately: people decompose names into parts, parts carry
associations, associations differ between people, associations cause confusions. The chain "a private association
between two genus names makes that person confuse those two genera" is plausible and not tested anywhere I found. It
predicts a measurable footprint (player-by-pair variance beyond public features), which we looked for (3.6: not
shown on 242 errors, power about 50%), and even a clear footprint could not prove the cause.

### 2.8 Species identification training

I found no study of name similarity in species-identification training (search of the drug-name, taxonomy-teaching and
category-learning literatures; only teaching anecdotes that scientific names are learnable with meaning or stories)
[checked: search results]. The companion progress / set-size study reviews visual expertise and identification
training; nothing there concerns names [repo, scratchpad `progress-setsize-study.md` 1.3].

---

## 3. Our data

### 3.1 Data and the pre-declared plan

- **Answers tab** of the sync sheet, exported 2026-11-05 (1,933 answers, 2026-11-01 to 2026-11-05 14:34 Manila, 10
  players; the live sheet had no newer rows when checked). Corals only: fish answers are not logged on the sheet yet
  (`core.js` `SUBJECTS` log) [repo].
- 1,878 multiple-choice answers carry their choices (1,376 with 4 choices, 502 with 2: duels and "Again: A or B?").
  339 wrong answers: **242 usable** (4 choices, the wrong pick among the 3 wrong options), 84 two-choice (a wrong
  answer there has only one possible wrong pick, so it says nothing about which option attracts), 13 typed.
- All 10 players pass the sheet's trust rule (right rate 79-91% against expected 75-80%), so the "trusted only"
  sensitivity is the main analysis. Error trials per player: P6 68, P4 48, P7 42, P8 35, P9 17, P5 12, P2 10, P3 6,
  P1 2, P10 2.
- **Pre-declared** (`namestudy/prereg.md`, 18:37 Manila, before any outcome): primary = same-first-letter coefficient
  in a conditional logit of the wrong pick among the wrong options, with visual controls; 95% player-bootstrap
  interval; "shown" only if the interval excludes 0 and every leave-one-player-out fit keeps the sign.

**Features of each (right genus, offered option) pair:**

- Name: SAME1 (same first letter), DICE (bigram Dice with word boundaries, close to Lambert's measure), NED (1 − edit
  distance / longer length), PREF (shared beginning, letters, capped at 4), SUF (shared ending, capped at 5), PHON (NED
  on a crude phonetic key: ph→f, c/ch→k, y→i, ae→e, doubled letters merged; a stand-in for ALINE, which I did not
  implement).
- Word parts (layer 2; `roots.py`, a root lexicon for all 66 genera the app knows, from memory, uncertain roots marked):
  MORPH (the two names share a root chunk: -pora, -phyll-, -astrea, -fungia, -seris, -gyra, -actis, -litha, lepto-,
  echino-, gonio-, helio-, stylo-, tub-, lobo-, acro-…; people's names such as Dana-, Duncan-, Gardiner- left out),
  SEM (roots of the same or related meaning, including different forms: pecti- and cteno- both "comb"; astrea, galax-,
  helio- "sky"; echino-, acanth-, oxy- "sharp"; gyra, cyclo- "round"; pora, alveo-, tub- "hole"; phyll-, lobo- "leaf /
  lobe").
- Visual controls (the CONF priors, `model.js` `pooledConf`, plus one): LOOK (declared look-alike either way), FAM (same
  family), FORM (share an IMR growth form, `app.js` `imrFormsOf`, recomputed from `data.json` and `forms.json`), IG
  (same IMR lecture group, `gen[g].ig`).

### 3.2 Why a conditional logit on the errors

The question "did the name pull the player toward the wrong option?" is about *which* wrong option was picked, given
that the player missed. Conditioning on the trial (McFadden's conditional logit over the three wrong options) removes
everything that is the same for the three options: the player's ability, the photo's difficulty, fatigue, the mode.
What is left is how the options differ from each other. Assumptions: independence of irrelevant alternatives within a
trial (standard; the three options are symmetric in how they are shown), trials independent given the features (not
quite: the same player answers many; hence the player bootstrap), and a linear-logistic effect of each feature.

Pierre's framing (one row per offered wrong option, "was it picked?", with a player random effect) is fitted too (3.4).
It keeps the right answers but does not remove the trial-level differences, and it turns out to be confounded.

### 3.3 Primary result (A1)

Wrong picks, 242 trials, 3 wrong options each:

| Feature | Picked option has it | Offered wrong options have it (mean) |
|---|---|---|
| Same first letter | 18.6% | 15.2% |
| Declared look-alike | 42.6% | 30.3% |
| Same family | 46.3% | 35.1% |
| Shared growth form | 62.8% | 55.1% |
| Same IMR lecture group | 40.1% | 26.4% |

Conditional logit, all features together (odds ratio = how much more often an option with the feature is picked than
one without, the others equal):

| Feature | Coefficient | Odds ratio | 95% interval (player bootstrap, 4,000) | Leave-one-player-out range |
|---|---|---|---|---|
| **Same first letter (primary)** | **+0.18** | **1.20** | **0.80 to 1.51** | +0.06 to +0.24 |
| Declared look-alike | +0.40 | 1.49 | 0.67 to 3.94 | +0.04 to +0.77 |
| Same family | +0.50 | 1.66 | 0.88 to 2.84 | +0.27 to +0.66 |
| Shared growth form | +0.39 | 1.47 | 1.09 to 2.50 | +0.31 to +0.53 |
| Same IMR lecture group | +1.10 | 2.99 | 1.31 to 7.16 | +0.73 to +1.51 |

- **Primary test: not shown.** The interval includes 1 (one-sided bootstrap share ≤ 0: 16%). The sign is positive in
  every leave-one-player-out fit, so no single player drives it, but the effect is small and uncertain.
- **What it excludes**: a same-first-letter option picked more than about 1.5 times as often (bootstrap) or 1.9 times
  (trial-level Wald interval, 0.75 to 1.9, wider because the bootstrap over 10 unequal players can be too narrow).
  "It starts with a P" is not a major driver of wrong picks in multiple choice, at least not one this large.
- **What carries the errors is visual**, and the IMR lecture group is the strongest single predictor (odds ratio 3):
  the lecture's confusion groups are good. (Look-alike and family are positive but overlap with the lecture group.)

How the name effect shrinks as visual controls are added (same data, same method):

| Controls | Same-first-letter odds ratio | 95% interval |
|---|---|---|
| none | 1.50 | 0.84 to 2.02 |
| CONF priors (look-alike, family, growth form) | 1.33 | 0.88 to 1.67 (bootstrap p ≈ 0.05) |
| CONF priors + IMR lecture group (primary) | 1.20 | 0.80 to 1.51 |

Same-first-letter pairs are more often visually linked than other pairs: same lecture group 18% against 8%, same family
23% against 15%, declared look-alike 11% against 8%, sharing a root 23% against 11%. Names were given by taxonomists
who saw the same features, and the lecture groups follow the look, so names and looks travel together. A raw "P with P"
count would over-state the name effect by about half.

### 3.4 Pierre's framing: one row per offered option, player random effect (A3)

4,630 rows (every wrong option offered in a multiple-choice answer), 326 picked; random-intercept logistic regression
(Gauss-Hermite quadrature, 30 points). Same first letter: **−0.14** (95% CI −0.46 to +0.19); look-alike +0.37, family
+0.54, lecture group +0.75, growth form +0.23, log of the number of options −0.36; the player variance went to 0 (the
app aims every player at the same success, so players differ little in error rate per option). The sign of the name
term flips compared with A1: this model does not remove the target genus's and the photo's difficulty, and the slate
has many P genera (Pocillopora, Porites, Pavona, Pachyseris, Pectinia, Platygyra, Plerogyra…) whose difficulty differs.
It is the reason the conditional logit was pre-declared as primary; I report A3 for completeness, not as evidence
either way.

### 3.5 Secondary measures, word parts, and the exploratory split

Each name measure replacing the first letter in the primary model (bootstrap 2,000; exploratory, no correction for the
eight tests):

| Measure | Odds ratio per unit (or yes/no) | 95% interval |
|---|---|---|
| Bigram Dice (0-1) | 1.73 | 0.47 to 6.16 |
| 1 − normalised edit distance (0-1) | 1.29 | 0.38 to 7.68 |
| Phonetic similarity (0-1) | 1.02 | 0.27 to 6.14 |
| Shared beginning (per letter, max 4) | 0.88 | 0.72 to 1.02 |
| Shared ending (per letter, max 5) | 1.09 | 0.91 to 1.34 |
| **Shared root (MORPH)** | **0.97** | **0.49 to 1.90** |
| **Related root meaning (SEM)** | **1.43** | **0.63 to 3.10** |
| First letter + shared root together | 1.20 / 0.96 | 0.75 to 1.53 / 0.49 to 1.94 |

- Nothing is significant. Continuous measures (0 to 1) have wide intervals because most pairs sit between 0.1 and 0.4.
- A shared root, beyond the visual controls, does not pull wrong picks (0.97): genera sharing -pora or -astrea are
  confused about as their look predicts. Related meanings lean positive (1.43) on few pairs.
- **Shared beginning beyond the first letter leans negative** (0.88 per letter): Platygyra / Plerogyra or Acropora /
  Anacropora are *not* confused more than their look predicts. Combined with the first-letter estimate this hints that
  if the name helps confuse, it is the initial only (a coarse cue), and a longer shared beginning may even draw
  attention to where the names differ. Exploratory.

**Exploratory split (A6, not pre-declared).** Raw mix-up rates suggested the first letter matters only when nothing
visual links the pair:

| Pairs offered together | Same first letter | Different first letter |
|---|---|---|
| No declared look-alike | 7.0% (26 of 371 offers) | 4.5% (136 of 3,045) |
| Declared look-alike | 10.8% (27 of 249) | 14.2% (137 of 965) |
| Not same lecture group | 6.5% (22 of 338) | 4.5% (143 of 3,198) |
| Same lecture group | 11.0% (31 of 282) | 16.0% (130 of 812) |

In the conditional logit, same first letter on pairs with no visual link (not look-alike, family or lecture group):
odds ratio **1.76** (0.62 to 2.97; leave-one-out +0.26 to +0.77, always positive); on visually linked pairs 1.03
(0.68 to 1.33). Consistent with partial-cue retrieval as a *fallback*: when the eye gives no lead, the initial does.
Examples with no declared link: Merulina / Millepora 4 mix-ups in 14 offers (29%), Pavona / Porites 2 in 22. Not a
finding: a post-hoc split, wide interval. **It is the best candidate for the next pre-declared test** (question c).

### 3.6 Is pair difficulty personal? (layer 3's footprint)

Method: in the same 242 error trials, a conditional logit with the visual and first-letter features plus a **global
effect for each pair** (339 pairs met in these trials; ridge-penalised, which is a random effect with SD 1 in all but
name) gives each trial's residuals (picked option: 1 − p; the others: −p). The score statistic for a player-by-pair
random effect (Lin 1997's variance-component score test) sums, for every player-and-pair cell, the cross-products of
residuals from *different* trials: positive when a player keeps picking (or keeps avoiding) the same pair more than
the global model predicts. Its null distribution comes from a parametric bootstrap: simulate each trial's pick from the
fitted model without player-by-pair effects, refit, recompute (300 times). Second version: the null model also gets
**player-specific weights** on the five features (a beginner's errors spread differently from an expert's: that is a
player-by-feature effect, not a personal pair), so only what is left counts as personal. Power by simulation: add
player-by-pair effects of SD 0.5, 1 or 1.5 (logits) and count how often the test fires (100 runs each).

40 player-and-pair cells have two or more mix-ups (the most: 6 by one player on one pair).

| Null model | Statistic observed | Null mean (SD), parametric bootstrap | p (one-sided) |
|---|---|---|---|
| Features + global pair effects | −3.3 | −7.8 (2.5), 300 draws | **0.04** |
| Features + global pair effects + player-specific feature weights | −6.7 | −8.3 (2.4), 200 draws | 0.28 |

Power of the first version (simulated player-by-pair effects added to the fitted model, 100 runs each): SD 0.5
logits 25%, SD 1.0 58%, SD 1.5 87%. Second version (50 runs each): SD 1.0 50%, SD 1.5 82%.

The statistic is negative on average under the null because the penalised pair effects absorb part of each cell; only
the comparison with the bootstrap null counts. Observed −3.3 sits 1.8 null SDs above the null mean in the first
version; −6.7 sits 0.6 SDs above it in the second.

**Reading it.** Against global pair effects alone, players repeat their own mix-ups on particular pairs more than
predicted (p = 0.04). But that excess is mostly explained once each player has their own weights on the five features
(p = 0.28): a player who leans on growth form, or whose errors fall on look-alikes more than others', produces "personal"
pairs that are really a personal *style*. The second version is the fairer test of private pairs, and it is not
significant; its power is about 50% for a moderate effect (SD 1 logit, a pair two to three times harder for one player
than for the average player), so a real but moderate layer-3 effect could easily be missed with 242 errors. Verdict:
**unproven, not contradicted.** And a footprint, when it shows, has many possible causes besides private associations:
a visual distinction one player has not learned yet (the fungiids for one player below), one misleading photo seen
early, a lecture slide misremembered, a personal name association. The data can show *that* difficulty is personal,
never *why*.

The cells behind it (all multiple-choice answers, mix-ups by this player on this pair against everyone else's; the
2-choice "Again" questions are included here, and they follow a mix-up, so own rates are inflated; descriptive only):

| Player | Pair | This player: mixed up / offered | Other players |
|---|---|---|---|
| P4 | Fungia / Lithophyllon | 5 / 5 | 0 / 2 |
| P4 | Fungia / Lobactis | 4 / 5 | 0 / 2 |
| P8 | Alveopora / Tubastraea | 6 / 12 | 7 / 65 |
| P8 | Alveopora / Seriatopora | 2 / 3 | 0 / 18 |
| P7 | Dipsastraea / Goniastrea | 3 / 5 | 1 / 10 |
| P9 | Diploastrea / Dipsastraea | 2 / 2 | 0 / 10 |
| P6 | Ctenactis / Herpolitha | 3 / 4 | 8 / 53 |
| P6 | Leptoseris / Mycedium | 3 / 5 | 0 / 1 |

P4's mushroom corals look like a visual stage (the fungiids are hard for beginners). P8's Alveopora / Seriatopora
(2 of 3 against 0 of 18 for everyone else; both end in -pora, no declared link) is the kind of pair layer 3 or a name
pull would produce; two mix-ups prove nothing.

Validity notes: the app adapts the choices to each player's past mix-ups (personal traps), so the offers depend on
earlier answers; a likelihood-based test stays valid under such adaptive designs, but the bootstrap that keeps the
offers fixed is an approximation. Pair effects are unordered (A shown, B picked counts with B shown, A picked), as in
`CONF`. Two-choice questions are left out (no choice among wrong options), which also leaves out the "Again" and duel
questions the app sends after a mix-up.

### 3.7 Typed answers

55 typed questions (46 by P6, 5 by P4, 4 by P7), 42 right; 13 wrong: 2 "I don't know", 11 typed another genus (9 by P6).
Too few for the planned model (A4). Descriptively, against the expectation if the wrong genus were drawn at random
among the other 39 slate genera:

| Feature of (right, typed) | Observed (of 11) | Expected at random |
|---|---|---|
| Same first letter | 4 | 1.0 |
| Shared root | 4 | 1.5 |
| Declared look-alike | 6 | 0.8 |
| Same family | 7 | 1.0 |
| Same lecture group | 2 | 0.7 |

Typed errors are not random: they go to look-alikes and to similar names alike, and with 11 errors from essentially
one player the two cannot be separated. The pairs: Stylophora ↔ Seriatopora ↔ Pocillopora (the Pocilloporidae
look-alikes, 4), Anacropora → Acropora, Astrea → Favites, Pavona → Porites, Pocillopora → Alveopora, Porites →
Echinopora, Pectinia → Echinopora, Lobophyllia → Galaxea. Three of the last five end in or share "-pora"/"Por-";
Pectinia → Echinopora shares the "ecti"/"echi" chunk. Suggestive of name pull in recall, not evidence.

Spelling tolerance: the typed text is matched to a genus with 1 edit (names up to 6 letters) or 2 (longer) (`core.js`
`TYPE.tol`, `typeMatchIn`) [repo]. The closest pair of game names is Acropora / Anacropora (2 edits); all others are 3
or more apart. A misspelt answer can therefore be read as another genus only in rare cases (e.g. a one-letter slip of
Anacropora), so the tolerance is not manufacturing name confusions. The raw text is not logged ("never the raw text"),
so near-miss spellings cannot be studied; logging it would help (question g).

### 3.8 What can and cannot be concluded

- **Can**: on 242 multiple-choice errors by 10 players, a shared first letter does not make a wrong option much more
  attractive once visual similarity is accounted for; a large effect (more than about 1.5-1.9×) is unlikely. Visual
  similarity, and above all the IMR lecture groups, explains the wrong picks far better. Shared roots do not add pull
  beyond the look.
- **Cannot**: rule out a small first-letter effect (1.1-1.5×), which would still matter summed over thousands of
  answers; say anything firm about typed answers (11 errors) or fish (no logged answers); separate name from look for
  pairs where both coincide (Pectinia / Pavona, Pachyseris / Pavona, Diploastrea / Dipsastraea).
- **Power**: the first-letter coefficient's standard error is 0.24 with 242 error trials. To detect an odds ratio of 1.5
  with 80% power, about 650 usable error trials are needed; for 1.2, about 3,300 (more players too: with 10 players the
  between-player uncertainty dominates). At the current pace (about 50 usable errors a day) that is one to two more weeks
  for 1.5, and more players would help as much as more answers.
- **The data were not collected for this test**: the choices are adaptive, and 2-choice questions carry no information
  here.

---

## 4. Fish

No fish answer is logged yet, so this section is about the names only (`fish.json`, circle 1: 340 species, 94
scientific genera) [repo].

- **Common names share modifiers across families**: 47 modifier words appear in two or more families: "Lined" in 6
  families (Lined bristletooth, Lined butterflyfish, Three-lined wrasse…), "Yellow" 6, "Black" 5, "Yellowtail" 3
  (Yellowtail wrasse, Yellowtail damsel, Yellowtail emperor…), "Blackspot" 4, "Bicolor" 4 (goatfish, chromis,
  angelfish, cleaner wrasse), "Golden" 4. The head noun (wrasse 54 species, damsel 28, cardinalfish 24, parrotfish 20,
  butterflyfish 19…) carries the family; the modifier carries a colour or a pattern, often the very feature that is
  shared. For fish the *meaning* of a common name is a visual description, so layer 2 applies in full: "Yellowtail"
  is true of several species, and a player who sees a yellow tail and reads "Yellowtail" in an option is pulled toward
  it whatever the family. These are the fish analogue of a false friend when the head noun is wrong.
- **Scientific names within a genus differ only in the epithet**: 1,205 within-genus species pairs; 69 of them have
  epithets with the same first letter (Pomacentrus amboinensis / armillatus / auriventris / alexanderae; Chromis
  xanthochira / xanthura; Lutjanus fulviflamma / fulvus). Epithets describe colour, pattern or place (xanth- yellow,
  -ura tail, fulv- tawny), again descriptive roots.
- **Genus names**: 26 pairs share their first three letters (Labroides / Labropsis / Labrichthys; Cheilinus /
  Cheilio / Cheilodipterus; Chromis / Chrysiptera; Epibulus / Epinephelus; Balistapus / Balistoides), some in the same
  family (cleaner-wrasse-like Labroides / Labropsis: a real look-alike too), some not.
- **What follows**: for fish, name similarity and visual similarity are even more entangled than for corals, and
  common-name modifiers are a plausible confusion source worth logging from the start. The fish confusion study's
  prior chain (scratchpad `fish-confusion-study.md` 4.2) is where a name term would go, if ever.

---

## 5. What the app could do

Each option with pros and cons. Nothing here is decided; the questions in section 6 ask.

### 5.1 Show the name difference in feedback (Tall Man style)

After a mix-up between two similar names, write them with the differing part marked: "PEctinia / PAvona",
"Lepto**ria** / Lepto**seris**".
- Pros: cheap, harmless if the effect is nil, directly counters "it starts with a P"; the drug-name field uses it.
- Cons: evidence for Tall Man lettering is weak and laboratory-based; capitals inside a scientific name look odd (bold
  or underline is kinder and keeps the spelling); a rule is needed for "similar enough to mark" (first letter shared,
  or Dice ≥ 0.4).

### 5.2 Etymology on the genus sheet when it describes the look; flag misleading roots

`gen[g].info` already holds some etymologies ("The name comes from Greek akros (tip) and poros (pore)…" for Acropora,
platys + gyros for Platygyra) [repo]. Add, per genus, the root meaning and whether it points to the identifying
feature ("Acro-pora: tip-pore, the axial corallite at the branch tip ✓"), and a gentle warning where a root misleads
or is shared ("-pora: pore; 10 of the 40 slate genera end in -pora, so the ending does not tell them apart").
- Pros: a meaningful link is a strong memory aid (cognates, etymological elaboration); turns layer 2 from a source of
  confusion into a mnemonic; the IMR mnemonics already go this way.
- Cons: content work and sourcing (rule 2: every line sourced, e.g. Borror's dictionary or the original descriptions);
  many roots are not about the field mark (Danafungia honours Dana; Galaxea, Pavona); must sit beside, never replace,
  the IMR mnemonics (rule 1). My root lexicon in `roots.py` is from memory and needs checking before any use.

### 5.3 Name similarity in the confusion prior (CONF)

Add a name term to `pooledConf`'s prior (e.g. +0.02 for a shared first letter on pairs with no visual link).
- Pros: if the effect is real, traps and duels would target name pairs earlier.
- Cons: the data do not support it yet (3.3); the prior is only worth 8 offers (`CONF.W`) and the pooled data already
  correct it within days, so a name prior adds little even if real; it changes a learning value (Pierre's decision);
  it would make traps of pairs that are hard by name only, which is what 5.4 does more transparently. **Not
  recommended now.**

### 5.4 Name look-alikes as a trap source

Occasionally include among the wrong options a genus whose name resembles the right one (same first letter, no
visual link).
- Pros: forces discrimination on the name itself, exactly where the exploratory effect sits (3.5); harmless for
  players who know both.
- Cons: may teach the name contrast at the expense of visual contrast (RAs label by look in ReefCloud, the name is
  just the label); makes questions harder for a reason unrelated to coral identification; the difficulty controller
  would have to know about it (expected success). Better tested first as an experiment.

### 5.5 Name-contrast duels

A duel between two genera with similar names and different looks ("Merulina or Millepora?").
- Pros: a clean contrast: the photos differ a lot, so the player learns the label-to-look link.
- Cons: low value if the pair is visually easy (the player gets it right from the photo and never reads the name);
  duels are a scarce slot better spent on true look-alikes.

### 5.6 Personal pairs (layer 3), whatever their cause

The personal confusion path already exists: each player's own record on a pair (`core.js` `pairConf`) is blended with
the pooled score (`confOf`, worth `CONF.W` = 8 offers) and drives traps, the "Again" queue and the duels; `confTerm`
makes a question harder for a player who mixes up its pair more than everyone [repo]. Options:
- **Keep and trust it**: it is exactly the right response to idiosyncratic pairs, without needing to know why.
- **Faster personalisation**: lower the weight of the pooled prior for the player's own record (e.g. 4 offers instead
  of 8), so a personal pair becomes a trap after fewer mix-ups. Pros: would follow personal pairs sooner if they exist.
  Cons: noisier traps from one-off misses; a learning value, Pierre's decision; 3.6 found no firm player-by-pair signal
  yet, so the current weight is not shown to be too slow.
- **Show the player their own hard pairs** ("Your tricky pairs" on My progress): makes the private confusion visible
  and invites a deliberate fix (a personal mnemonic, the keyword method's lesson). Cons: a new screen.
- **Invite a personal mnemonic** after repeated mix-ups of one pair ("You often mix these up: what tells them apart
  for you?", a short free text kept on the device). Pros: self-generated cues are powerful; uses layer 3 on purpose.
  Cons: new UI, unproven in this setting, free text.

### 5.7 Mnemonic hints

Surface the IMR mnemonics (`gen[g].mn`) in the feedback after a mix-up of two genera that both have one (they are
name-based: "Nah, Acropora").
- Pros: content exists, IMR-sourced; targets the name-label link.
- Cons: some mnemonics are themselves name puns that could add to name confusion (Pavona "pavement", Pectinia "pecs"),
  a risk only data would show.

### 5.8 Logging for the next test (no visible change)

Log the raw typed text with typed answers (now dropped), so near-misses can be studied; and pre-declare the fallback
hypothesis (first letter matters on visually unlinked pairs) for a re-test at about 650 usable errors.
- Pros: invisible to players; makes the question answerable. Cons: the raw text is personal data of a sort (a typed
  word, no name); the sheet's column layout changes (always ask first, AGENTS.md "Always ask first").

---

## 6. Questions for Pierre (each with a recommendation)

**a.** The pre-declared test found no clear first-letter effect in multiple choice after visual controls (odds ratio
1.2, interval 0.8 to 1.5), and excludes a large one. Do you accept "not shown, possibly small" as the current answer,
and park the name hypothesis as a re-test rather than act on it now?
*Recommendation: yes; re-test at about 650 usable error trials (one to two more weeks of play).*

**b.** Show the differing letters of similar names in the feedback after a mix-up ("**PE**ctinia / **PA**vona", bold
rather than capitals)? A visible change in the quiz feedback.
*Recommendation: yes, for pairs sharing a first letter or with bigram Dice ≥ 0.4; cheap and harmless, and it targets
the fallback case.*

**c.** Pre-declare now the fallback hypothesis for the re-test: "a shared first letter attracts wrong picks on pairs
with no visual link (not look-alike, family or lecture group)", with the same method?
*Recommendation: yes; it is the only pattern that looked like an effect, and only a pre-declared test can confirm it.*

**d.** Add root meanings to the genus sheets where the root describes the identifying feature, and a note where a root
is shared or misleading? Content work, needs a source per line (rule 2) and sits beside the IMR mnemonics (rule 1).
*Recommendation: yes, as a small content track for the 40 slate genera, sourced from a root dictionary; start with
the transparent ones (Acropora, Seriatopora, Platygyra, Echinopora, Tubastraea).*

**e.** Name similarity in the CONF prior, or name look-alikes as a trap source?
*Recommendation: no for now (the data do not support it, and the pooled data already correct the prior within days);
revisit only if c is confirmed.*

**f.** Layer 3 (personal associations): the personal confusion path already turns each player's own hard pairs into
traps, Agains and duels. Should a personal pair become a trap faster (own record worth more against the pooled score),
or should players see their own tricky pairs on My progress?
*Recommendation: not yet for the weight (a learning value, and the player-by-pair signal of 3.6 did not survive the
fairer test; re-run it on more data); yes in principle for "Your tricky pairs" as a ROADMAP row, since it helps whatever
the cause.*

**g.** Log the raw typed text of typed answers (now only the genus read is kept)? It changes what the sheet stores.
*Recommendation: yes, in a new column, so typed near-misses and name-driven recall errors can be studied; needs your
OK for the sheet change.*

**h.** Fish: when fish answers start being logged, include the common-name modifiers (Yellowtail, Blackspot, Bicolor…)
as a candidate confusion source in the analyses from the start?
*Recommendation: yes, analysis only (no game change): log the options shown, then test "shared modifier word" the same
way.*

---

## 7. References

Drug names and name similarity
- Lambert, B. L., Chang, K.-Y., & Lin, S.-J. (2001). Effect of orthographic and phonological similarity on false
  recognition of drug names. *Social Science & Medicine*, 52(12), 1843-1857.
  [IDEAS](https://ideas.repec.org/a/eee/socmed/v52y2001i12p1843-1857.html),
  [PDF](https://brucelambert.soc.northwestern.edu/journal_art/EffectRecog.pdf) [checked: abstract]
- Lambert, B. L., et al. Recall study of drug names (orthographic similarity and recall errors).
  [PDF](https://brucelambert.soc.northwestern.edu/journal_art/EffectRecall.pdf) [checked: secondary summary]
- Lambert, B. L., Lin, S.-J., Chang, K.-Y., & Gandhi, S. K. (1999). Similarity as a risk factor in drug-name confusion
  errors: the look-alike (orthographic) and sound-alike (phonetic) model. *Medical Care*, 37(12), 1214-1225.
  [PDF](https://brucelambert.soc.northwestern.edu/journal_art/SimRisk.pdf),
  [abstract](https://read.qxmd.com/read/10599603/similarity-as-a-risk-factor-in-drug-name-confusion-errors-the-look-alike-orthographic-and-sound-alike-phonetic-model)
  [checked: abstract and slides]
- Kondrak, G., & Dorr, B. (2006). Automatic identification of confusable drug names. *Artificial Intelligence in
  Medicine*. [PDF](https://webdocs.cs.ualberta.ca/~kondrak/papers/aiim06.pdf),
  [abstract](https://webdocs.cs.ualberta.ca/~kondrak/abstracts/absAIIM.html); and (2004) COLING
  [abstract](https://webdocs.cs.ualberta.ca/~kondrak/abstracts/absCOL04.html) [checked: abstracts]
- Shah, M. B., Merchant, L., Chan, I. Z., & Taylor, K. (2016/2017). Characteristics that may help in the
  identification of potentially confusing proprietary drug names. *Therapeutic Innovation & Regulatory Science*.
  [PMC7238771](https://pmc.ncbi.nlm.nih.gov/articles/PMC7238771) [checked: full text]
- Bryan, R., et al. (2021). Tall Man lettering systematic review. *British Journal of Clinical Pharmacology*.
  [record](https://zendy.io/title/10.1111/bcp.14644) [checked: abstract]
- Systematic literature review on strategies to avoid look-alike errors of labels (2018). *European Journal of
  Clinical Pharmacology*. [PMC6061459](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6061459/) [checked: abstract]

Retrieval, lexicon, interference
- Brown, R., & McNeill, D. (1966). The "tip of the tongue" phenomenon. *Journal of Verbal Learning and Verbal
  Behavior*, 5, 325-337. [summary](https://wikipedia.com/wiki/Lethologica) [checked: secondary]
- Brown, A. S. (1991). A review of the tip-of-the-tongue experience. *Psychological Bulletin*, 109, 204-223. [memory]
- Fay, D., & Cutler, A. (1977). Malapropisms and the structure of the mental lexicon. *Linguistic Inquiry*, 8(3).
  [record](https://en.wikipedia.org/wiki/Malapropism) [title checked; content memory]
- Vitevitch, M. S. (2002). The influence of phonological similarity neighborhoods on speech production. *JEP: LMC*.
  [PMC2543127](https://pmc.ncbi.nlm.nih.gov/articles/PMC2543127) [checked: secondary summary]
- Luce, P. A., & Pisoni, D. B. (1998). Recognizing spoken words: the neighborhood activation model. *Ear and Hearing*.
  [memory]; Yarkoni, T., Balota, D., & Yap, M. (2008). Moving beyond Coltheart's N (OLD20). *PB&R*. [memory]
- Underwood, B. J., Ekstrand, B. R., & Keppel, G. (1965). An analysis of intralist similarity in verbal learning.
  *JVLVB*, 4, 447-462. [results page](https://next.sciencegate.app/document/10.1037/h0024118) [checked: title and
  secondary]
- Osgood, C. E. (1949). The similarity paradox in human learning. *Psychological Review*. [memory]; Gibson, E. J.
  (1940). A systematic application of the concepts of generalization and differentiation to verbal learning.
  *Psychological Review*. [memory]; Barnes, J. M., & Underwood, B. J. (1959). "Fate" of first-list associations.
  [memory]; Anderson, J. R. (1974). Retrieval of propositional information from long-term memory (fan effect).
  [memory]
- Roediger, H. L., & Marsh, E. J. (2005). The positive and negative consequences of multiple-choice testing. *JEP:
  LMC*. [memory]; Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the
  negative effects of multiple-choice testing. *Memory & Cognition*. [memory]
- Little, J. L., Bjork, E. L., Bjork, R. A., & Angello, G. (2012). Multiple-choice tests exonerated, at least of some
  charges. *Psychological Science*. [summary](https://escholarship.org/content/qt6w80f5c3/qt6w80f5c3.pdf?t=op2lih)
  [checked: secondary]

Word parts and meaning
- Longtin, C.-M., & Meunier, F. (2005). Morphological decomposition in early visual word processing. *Journal of
  Memory and Language*, 53(1), 26-41. [record](https://manuscript.isc.ac/Inventory/10/164896.htm) [checked: abstract]
- Rastle, K., & Davis, M. H. (2008). Morphological decomposition based on the analysis of orthography. *Language and
  Cognitive Processes*, 23(7-8), 942-971.
  [repository](https://repository.royalholloway.ac.uk/items/0647db1f-eeab-7cf5-89d5-e1c3fbf9dbf9/1/) [checked:
  abstract]; Rastle, Davis & New (2004), the "corner" manipulation [checked: secondary]
- de Groot, A. M. B., & Keijzer, R. (2000). What is hard to learn is easy to forget: cognates in foreign vocabulary
  learning. *Language Learning*. [memory]; Libben, G. (1998). Semantic transparency in compound processing. [memory]
- Borror, D. J. (1960). *Dictionary of Word Roots and Combining Forms*.
  [listing](https://www.librarything.com/work/42728) [checked: listing]
- Boers, F., Demecheleer, M., & Eyckmans, J. (2004). Etymological elaboration as a strategy for learning idioms.
  [memory]; Baumann, J. F., et al. (2002); Nagy, W., & Townsend, D. (2012). Words as tools. *Reading Research
  Quarterly*. [memory]
- Atkinson, R. C., & Raugh, M. R. (1975). An application of the mnemonic keyword method to the acquisition of a
  Russian vocabulary. *JEP: Human Learning and Memory*.
  [Stanford report](https://suppescorpus.stanford.edu/sites/g/files/sbiybj32751/files/media/file/imsss_256.pdf)
  [checked: abstract]

Associations and individual differences
- Morais, A. S., Olsson, H., & Schooler, L. J. (2013). Mapping the structure of semantic memory. *Cognitive Science*,
  37(1), 125-145. [record](https://zendy.io/title/10.1111/cogs.12013),
  [slides](https://cognitive-science-3211.djnavarro.net/lecture3_semanticnetworks.pdf) [checked: abstract, slides]
- De Deyne, S., Navarro, D. J., Perfors, A., Brysbaert, M., & Storms, G. (2019). The "Small World of Words" English
  word association norms for over 12,000 cue words. *Behavior Research Methods*, 51(3), 987-1006.
  [PDF](https://papers.djnavarro.net/2019_swow.pdf) [checked: abstract]
- Nelson, D. L., McEvoy, C. L., & Schreiber, T. A. (2004). The University of South Florida free association norms.
  [memory]
- Collins, A. M., & Loftus, E. F. (1975). A spreading-activation theory of semantic processing. [memory]
- Roediger, H. L., & McDermott, K. B. (1995). Creating false memories. [memory]; Roediger, H. L., Watson, J. M.,
  McDermott, K. B., & Gallo, D. A. (2001). Factors that determine false recall: a multiple regression analysis.
  *PB&R*, 8, 385-407. [secondary](https://pmc.ncbi.nlm.nih.gov/articles/PMC3226830/) [checked: secondary]
- Nichols, R. M., & Loftus, E. F. Who is susceptible in three false memory tasks?
  [record](https://libmast.utm.my/Record/ntu-10356%2F144618/Description) [checked: abstract]
- Nuttin, J. M. (1985). Narcissism beyond Gestalt and awareness: the name letter effect. [memory]; Simonsohn, U.
  (2011). Spurious? Name similarity effects (implicit egotism). [memory]
- McWeeny, K. H., Young, A. W., Hay, D. C., & Ellis, A. W. (1987). Putting names to faces (baker/Baker).
  [popular account](https://gizmodo.com/the-baker-baker-effect-explains-why-youre-awkward-at-pa-1671628340)
  [memory; popular account checked]
- Lindsey, R. V., Shroyer, J. D., Pashler, H., & Mozer, M. C. (2014). Improving students' long-term knowledge retention
  through personalized review. *Psychological Science*, 25(3), 639-647.
  [journal](https://www.psychologicalscience.org/journals/psychological-science/0956797613504302/) [checked: abstract]
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning (half-life regression).
  ACL. [PDF](https://preview.aclanthology.org/fix_video/P16-1174.pdf) [checked: abstract]

Statistics
- McFadden, D. (1974). Conditional logit analysis of qualitative choice behavior. [memory]
- Lin, X. (1997). Variance component testing in generalised linear models with random effects. *Biometrika*, 84,
  309-326. [memory]

# Levels and shares: one model for ranks and photo variants (design study, 2026-11-17)

Status: design study, measured on a prototype in a scratch branch that is never pushed. No engine change comes from this
PR. Pierre chooses the rule (last section, "Question for Pierre"); #975 and #953 are then finished or rebuilt on it.

## 1. Why this study

Pierre, 2026-11-17 06:26 Manila, on Q388 and #975:

> "Alors, pour la question 388, pour le request 975, je croyais qu'on avait dit qu'on regardait plus largement, parce
> que là tu ne parles que de la famille, tu parles que du niveau advanced, mais le problème il va se poser sur plein
> d'autres niveaux. Il va se poser au niveau du genre, de l'espèce, il va se poser au niveau des juvéniles, il va se
> poser au niveau des dimorphismes sexuels. Et là tu es juste en train de créer une exception en fait, et un cas
> particulier. Il me semblait que tu avais lancé une étude, je comprends pas pourquoi tu es revenu juste sur ce point
> là."

His earlier answers, which this study puts together:

- **Q382** (2026-11-16 15:05, on #975): "… je serais plutôt ouvert à une stratégie qui règle finalement la répartition
  des questions, soit au niveau de la famille, du genre ou de l'espèce, en fonction de la maîtrise justement des niveaux
  précédents."
- **Q384** (2026-11-16 15:10, on #953): "… il faudrait que les juvéniles et les phases de couleur arrivent
  progressivement à partir d'une certaine maîtrise de niveau précédent, en sachant que, par contre, effectivement,
  notamment les juvéniles, doivent pouvoir arriver très rapidement, donc c'est presque en fait quelque chose qu'il
  faudrait déterminer par espèce ou par genre ou par famille, mais il faudrait réfléchir à un mécanisme global en fait
  qui permette comme ça de retenir des questions ou d'avoir une répartition en fait des questions en fonction des
  niveaux et du niveau de maîtrise."
- **2026-11-04** (FISH_PATH "Juveniles and colour phases"): the juvenile classes, with class A and the show-early genera
  and species whose juveniles "help learn the family early"; sex and colour phases "a species-level difficulty".
- **2026-11-07** (ROADMAP row, built as #953): juvenile and phase photos never at the very start of a unit, then in
  stages; never a wall (2026-11-06, #660).

So the question is not "how many species once a family is at Advanced" but: **one rule that sets how many questions each
level gets from the mastery of the level it depends on, for every rank and every kind of photo, with thresholds that
the data can set per family, genus or species.**

## 2. What the engine already has

Each of these decides something different; the study keeps that apart, so that no two mechanisms do one job.

| Mechanism | What it decides | Where |
| --- | --- | --- |
| The opening (`OPEN`: K places for shaky units; `openPace`, `openRight`, the first-meeting card, the opening hold `introHold`) | **when one more unit opens**, at any level: the pace, never which level | `model.js` |
| Only the quiz opens units (rule L4) | **who opens**: a card in the photo quiz, never another game | `unlocked()` |
| `fishGate`, the circles; the opt-in sets (`SETS`, `setLater`: "families met first", Q208 A) | **which units may open at all**: breadth gates on the first level (circle 2 once circle 1 is asked, circle 3 at the Entries component's 55%, an offer) | `app.js` |
| `spPlay`, `sciOpen` | **which child may open next**: a family's species from its Advanced in commonness order; its genera from its Advanced (an IMR player's IMR genera from its Open Water, Q219; turned on by hand early, from Open Water, Q240) | `app.js` |
| #975's rank share (`SHARE`, `sharesNow`, `shareW`, `shareRoom`, `shareFree`) | **how many questions the child units of a level take**: at most m² of the draw, m the share of the parent level at Advanced | `model.js` (#975) |
| #953's stage (`phaseStage`, `SUBJECTS` `calib` `phase` N) | **how often a unit's variant photos show**: weight 0 in its first N = 10 answers, then a ramp to full at 2N | `model.js`, `core.js` (#953) |
| The juvenile ease cap (`tools/fish_judge.py` `cap`: a juvenile's judged ease at most 2, unless `juv_early`) and the cap under ease 4 before Open Water (`RARE`, 10%, Q252) | **how hard the photos are** before a unit is at Open Water, through the judged ease | judging, `model.js` |
| `TYPED`, the single-view share (corals), the name-display schedule (FISH_PATH, not built) | **the question's format**, a ramp on the unit's own level | `model.js` |
| Starred genera after their references (rule L5) | an opening order between units of one level (look-alikes), not a level | `core.js` `starRefs` |

What overlaps today: #975's share and #953's stage answer the same question ("how much of the level below, from the
mastery above") with two mechanisms keyed on two different things (a level's share at Advanced; a unit's answer
count), and the juvenile ease cap answers part of it a third way, through the photo's difficulty. The rule below
replaces the stage and keeps the cap as what it is (a difficulty, not a level).

## 3. One model of "level"

**A level is one step of the path a question can sit at.** There are two kinds, and the difference is what the question
asks:

- **A rank** asks another name: family, genus, species by common name, species by scientific name. Each of its units
  has **its own progress** (the domain-score bar, the Elo ability, the levels Open Water 0.5, Advanced 0.8, Divemaster
  0.85 = the exam's entry, Instructor = the exam passed: rule L9), its own score credit, its own record in the log and
  the replay. It depends on **its parent unit** (the record's `parent`).
- **A variant** asks the same name on other photos: the juveniles, the sexes, the colour phases of a unit. It has **no
  progress of its own**: a juvenile damselfish is answered "Damselfishes" and counts on the family. It is a slice of a
  unit's photos, and the unit it depends on is **the unit asked** (a family's juveniles on the family, a species' on the
  species).

Why a variant is not a unit (against #975's sketch of "each phase unit's record names its parent"): the same answer
would fill two bars, a wrong answer would count twice (rule L2), the log, the replay and the score tree would gain records
that are not a name to learn, and a change of that format is costly to undo (AGENTS.md "costly to undo"). Its mastery is
the unit's: **a unit is mastered with its variants**, because its exam draws the unit's hardest photos never seen
(`examSet`: `photoDiff` highest, every photo, no variant held back) and the bar is the share of all its photos
(`D*`), variants included. So a unit is never learned on its adult photos alone, whatever the share rule holds back
before its exam.

Every level of every subject (rule S1: each one a record field or a data file, never a subject in the code):

| Subject | Level | Kind | In the data | Depends on (its parent) | Mastered |
| --- | --- | --- | --- | --- | --- |
| Corals | genus (40 slate, 5 bonus) | rank, the first | `data.json` `gen`; bonus genera an opt-in set (`BONUS`) | none (starred genera open after their references, rule L5: an order, not a level) | its bar and exam |
| Corals | colony, close-up, corallites | format | `data.json` views | the unit's own level (single views rise with it) | - |
| Fish | family (65 in three circles) | rank, the first | `fish.json` `families` | none (circles: `fishGate`) | its bar and exam |
| Fish | scientific genus (130 in play) | rank | `fish.json` `genera`, `parent` the family | its family at Advanced (IMR genera at Open Water, Q219; by hand, Q240) | its bar and exam |
| Fish | species by common name (659) | rank | `fish.json` `species` `cn`, `s:` units (#975) | its family at Advanced | its bar (no exam yet) |
| Fish | species by scientific name | rank (not built) | the score tree's scientific bar (`treeScore`) | its common-name unit (both names) or its genus (scientific names only) | its bar |
| Fish | juveniles | variant | `ph` "juvenile" or the tag flag `j` (judging/FISH.md): 3,046 photos of 369 species | the unit asked | the unit's exam |
| Fish | sexes, colour phases | variant | `ph` male / female / intermediate: 1,661 photos of 132 species; the families marked `dimorph` (flag `p`: Parrotfishes, Anthias) | the unit asked | the unit's exam |
| Fish | night livery, camouflage, out of water | difficulty, not a level | light `n`, flags `c`, `a`: the judged ease capped at 3 | - | - |
| Sea slugs | genus (78) | rank, the first (`unitRank`, #1020) | `seaslug.json`; the families structure only | none (the circles) | its bar and exam |
| Sea slugs | species | rank (not built) | `seaslug.json` species | its genus | its bar |
| Sea slugs | juveniles | variant | `ph` "juvenile": 5 photos, one species (*Hexabranchus lacer*) | the unit asked | the unit's exam |

**The thresholds already in the data.** The juvenile classes of 2026-11-04 (`fish.json` `juv`, per family, with
genera and species named in `early` and `late`) are exactly Pierre's "par espèce ou par genre ou par famille". In play
today, by the class of the photo's species:

| Kind of variant photo | Photos | Units that have some (families / genera / species) |
| --- | --- | --- |
| **jE**: an early-class juvenile (class A: Spadefishes, Sweetlips, Boxfishes; or an `early` genus or species: *Dascyllus*, *Pomacanthus*, *Macolor*, *Coris gaimard*, *Novaculichthys*, *Arothron stellatus*) | 498 | 8 / 11 / 30 |
| **j**: another juvenile (class C, class "ns", the rest of a mixed family) | 2,113 | 51 / 135 / 292 |
| **jL**: a late-class juvenile (class B: Parrotfishes, Emperors; or a `late` one: *Acanthurus pyroferus*, *Scolopsis bilineata*, *Plectropomus laevis*, *Halichoeres*, *Thalassoma*) | 435 | 6 / 13 / 47 |
| **ph**: a sex or colour phase (male, female, intermediate) | 1,661 | 26 / 64 / 132 |

(19,679 of the 24,386 fish game photos are none of these. The phase photos of the sharks, rays and remoras are judged
male or female too: up to 52% of a family's photos; their sexes are no visual difficulty, which the per-family
threshold below can say.)

## 4. One share rule

**For anything that hangs from a parent unit p** (a child unit, or the variant photos of p itself), a factor

> g = ramp(bar of p; from `a`, full at `b`) = 0 below a, (bar − a) / (b − a) between, 1 from b (a step when a = b)

with `a` and `b` **data**: a default per kind, overridden on the record of a family, a genus or a species. Then:

- **a variant**: each of its photos weighs g in p's own draw (`photoSet`'s photo weight, as #953's stage does today).
  A variant never takes a question away from another unit, it only changes which photo of p is shown; so no cap is
  needed. The existing fallback stays: a unit with fewer than 3 observations at full weight holds nothing back.
- **a child unit**: it may open once g > 0 (through the usual opening: L4, `OPEN`, the card, `introHold`), and weighs g
  in the draw. Child units **do** take questions from every other unit, so **the units hanging from one level take at
  most cap = (mean g over that level's units in play)² of the questions** (#975's cap: with a step, the mean of g is
  #975's m).

The early cases are thresholds, not exceptions: an early-class juvenile has a = b = 0 (always in, from its unit's first
question: "très rapidement"); a late-class one comes after Advanced; the sexes of a family that is not `dimorph` can
have a = 0 at the family rank (Pierre, 2026-11-04: "an Anthias is easy to call an Anthias whatever its sex", the
difficulty is at the species). A family whose species should come earlier gets a lower `a` on its record.

**Defaults proposed** (starting values, the ones measured below):

| Kind | a | b | Why |
| --- | --- | --- | --- |
| species from its family; scientific genus from its family | 0.8 (Advanced) | 0.8 (a step), or 0.9 (a ramp) | Pierre, 2026-11-03 (species at Advanced), 2026-11-08 (genera back at Advanced) |
| an IMR player's IMR genera; genera turned on by hand early | 0.5 (Open Water) | 0.5 | Q219, Q240: they stay as #975's `shareFree` (out of the cap) |
| jE, an early-class juvenile | 0 | 0 | 2026-11-04: they help learn the family early; Q384 "très rapidement" |
| j, another juvenile | 0.5 (Open Water) | 0.8 (Advanced) | 2026-11-07: never at the very start, then in stages; about #953's 10-20 answers |
| jL, a late-class juvenile | 0.8 | 0.9 | 2026-11-04: "taught later, with their explanation card" |
| ph, a sex or colour phase | 0.5 | 0.8 | the 2026-11-07 row; a = 0 at the family rank outside `dimorph` is the alternative (2026-11-04) |

**What does not change**: the opening's pace, the circles, the opt-in sets and their offers, the commonness order of a
family's species, the first-meeting and explanation cards, rule L4, the exam, every progress rule (the rule moves no
record: no `RVS` entry), the corals (no unit has a parent, no photo a phase: the factor is 1 everywhere).

## 5. The variants of the rule

Three ways to read section 4, built in the prototype (`model.js`, calib `lv`) and measured. Each keeps everything section
4 says does not change.

- **A, one cap per level** (#975 extended as it stands): a child unit may open once its parent is at its threshold (a
  step), and the children of a level take at most m² of the questions, m the share of the parent level's units in play
  at their threshold. The variants are a level under the units: the photos of kind v in a level's units weigh m_v², m_v
  the share of that level's units in play at v's threshold, **pooled over the level** (so a family's juveniles wait for
  the other families, and a family met late gets them from its first question once most families are past).
- **B, each unit's own ramp, no cap**: a child unit weighs g of its own parent (a ramp from Advanced to 0.9), a variant
  photo g of the unit asked (the table above). Nothing pooled, no cap.
- **C, the own ramp under the cap**: B, and the child units of a level take at most (mean g)² of the questions. The
  variants as B (they take no question from another unit).
- **C0** (declared before reading the screen): C with a step for the ranks (a = b = Advanced), so its rank part is
  #975's cap exactly, and its variant part is B's.

## 6. The check (declared before running)

Declared in this branch's first commit (a97d4067), pushed before any run; arm C0 added in 168409ba, before the screen
was read (only a one-seed smoke run of B had been seen).

**Arms**, all on the same seeds. A scratch branch, never pushed (`scratch/levels-proto`): #975's head (2c1ba37b) with
#953's head (f1b94621) merged in, the prototype of the rules in `model.js` (calib `lv`, `lvRamp`, `lvVar`), the
juvenile classes kept on the family records (`core.js` `fishGen`, one line), and two more fields per question in
learnsim's `preOW` (the variant kind shown, the unit's bar), switched by learnsim's `--calib`:

- **main**: `origin/main` (03e14569; its data differs from the branch's by 3 candidate decisions in `curation.json`,
  none on a game photo);
- **975**: `--calib '{"phase":0}'` (#975 as it stands: the same questions as its head, checked on two profiles × 1,000
  answers);
- **975+953**: `--calib '{}'` (#953 as built, its stage N = 10 answers, on #975);
- **A**, **B**, **C**, **C0**: `--calib '{"phase":0,"lv":"A"}'` and so on.

**Screen**: the rated world, fish, normal photos, the app told the truth, the count learner, the 5 fish profiles × seeds
1-5 × 3,000 answers. Each arm against main with `tools/learncmp.js` (every guardrail, 90% one-sided bounds, one look),
and the per-step measures below, computed the same way for every arm from each run's questions (`expo`) and the photos'
records (`fish-game.json` phase and tags, `fish.json` juvenile classes).

**Per-step measures**: family → genus: the share of answers on genera, genera at Open Water and Advanced; family →
species: the share on species, species met and at Open Water; families at Advanced and the fish % at 1,000 and 3,000;
unit → its juveniles, unit → its phases and sexes: for each kind (jE, j, jL, ph), the share of questions showing one
among the questions on units that have such photos, **early** (in the unit's first 10 answers) and **late** (once it has
20 or more), and the unit's answers before the first one shown.

**The choice among A, B, C, C0**: (1) no guardrail breached against main that 975 does not already breach (its costs
are Q388's); (2) jE early at least 90% of main's; (3) j, jL, ph early at most 0.02; (4) no wall: each kind's late share
within ±0.03 of main's; (5) families at Advanced and the fish % within their margins of 975's; a tie goes to the
simplest. Then the chosen rule against 975 and main: the app world (5 profiles × 5 seeds × 600 questions, two looks:
95% bounds), the rated world at 10,000 answers (5 seeds), heavy-tailed photos at 3,000. The corals: a run under the
rule must be identical to one without it.

**Added after reading the screen of main, 975, 975+953, A and B, before running it** (2026-11-17): the answers to the
first unit at Open Water were breached for the lecture RA in A, B and 975+953 alike (5 seeds; the other profiles
improved), a cost no arm declared. A second look on that one guardrail: seeds 6-20 × 600 answers (every profile's
first Open Water comes before 600), arms main, 975, 975+953 and the chosen rule; read on seeds 1-20 with two looks
(95% bounds).

**What the worlds cannot say.** Neither learner knows what a juvenile or a phase is: to both, a juvenile photo is as
recognisable as an adult one at its true difficulty, and the rated world's learner learns by the number of answers. So
the runs show **how many** variant photos each rule shows and **when**, and what each rule costs the ranks and the
score; never whether an early juvenile teaches the family faster (Pierre's reason for class A), nor whether a phase met
too early confuses. The rated world draws each photo's judged ease from its own difficulty, so main's juvenile ease cap
does not exist there: main shows more juveniles early in the rated world than it does in the app world. The real log
(rule L12) cannot judge a change of what is asked (another draw asks other questions); the rule moves no record.

## 7. Results: the screen (rated world, 3,000 answers)

Means over the 5 seeds; beginner / casual diver / lecture RA / strong RA / expert. "Early": the share of the questions
on a unit that has such photos, asked in its first 10 answers, that show one; "first": the unit's answers before the
first one shown (mean over the units that showed one).

RESULTS_TABLE

**Every step, read one at a time.**

STEP_READING

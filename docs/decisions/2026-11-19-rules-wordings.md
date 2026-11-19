# The 2026-11-19 rule wordings: one shared engine, code comments, the slow tier, L11 over LEARNING, published ID marks

Date: 2026-11-19 (Manila, morning). PR: #1190. Rules touched: S1, W19, W14, L11, L12, AGENTS.md "Working mode" (the
merge contract's decided processes), its index, ship checklist and Review guidelines. The rules say what holds now; this
record keeps why and in whose words (each answer is also in [docs/ANSWERS.md](../ANSWERS.md)).

## One shared engine, differences declared in one place (S1)

Context: S1 said a subject differs only by a field of `SUBJECTS` or a function of `UNITS`. The one-engine audit
([the review](../reviews/2026-11-19-one-engine-audit.md)) proposed "only by its data and a few named parameters".
Decision: Pierre refused that wording at 06:50 ("On pourrait envisager des bouts de codes spécifiques (des 'patch') ou
des features activées seulement pour une matière. J'ai peur que la formulation soit trop conservatrice") and at 06:58
approved: "Every subject runs on one shared engine. A difference between subjects is declared and named in one place,
whatever its form (data, a parameter, a feature switched on for some subjects, or a patch), and never hidden in the
shared code as a test on the subject." Consequences: S1's first sentence is that text; the beta part is unchanged; the
AGENTS.md index and Review guidelines lines follow; `tests/subject-neutral.test.js` keeps holding the "no test on the
subject" half.

## Code comments (W19, Q409)

Context: the comments of `core.js` and the sheet script carried dates, quotes, Q-numbers and version tags (#1121).
Decision: Pierre, 06:50, OK to "A code comment says what the code does and why, in the present tense, in a few lines; a
decision links its record in docs/decisions/; no version tags, dates, quotes or Q-numbers." Consequences: a second bold
sentence of W19, the rule that keeps history out of the docs; no new rule ID.

## The slow tests out of the fast tier (W14, Q414)

Context: architecture step 4 proposed a `slow` test tag, which changes what the fast tier runs.
Decision: Pierre, 06:50, OK: a `slow` tag takes the slow statistical tests out of the pre-push tier; CI and the merge
train keep them. Consequences: W14 and the AGENTS.md ship checklist say the fast tier runs the unit tests without those
tagged `slow`. No test carries the tag yet: it comes with architecture step 4's PR, which adds the tag itself.

## L11 over LEARNING.md and the tools, L12's profiles (Q415)

Context: LEARNING.md's method and the tools differed from L11 on five points (#1163): level 2's worlds and length, the
cap and level 3's go against `learncheck.yml`, level 3's tests against `learncmp.js`, and L12's "four profiles" (the fish
default has five). Decision: Pierre, 06:50, OK to the recommendation: L11 prevails on points 1, 3 and 4; LEARNING's
figures are the minimum for point 2 (level 2's length); L12 says "the subject's default profiles". Consequences: L11
already said points 1, 3 and 4 (its *Source* now records that it prevails); it adds that LEARNING.md's level-2 figures
are the minimum; L12 names the subject's default profiles. LEARNING.md and the tools are to align in later PRs.

## Sourced ID marks published without his prior check (merge contract)

Context: the fish families with no IMR cue got ID marks in our own words, each with its sources (#773, after the
circle-1 family marks of #695). Decision: Pierre, 2026-11-08: "tu n'as pas besoin de ma validation avant de publier. On
publie. Si tu penses que c'est pertinent, tu publies et moi je verrai à l'usage si c'est bon ou pas." Consequences: the
fish families' sourced ID marks join the merge contract's decided processes: published, and he corrects them in place.
The scope is his case (the fish families' marks); IMR-owned content stays costly to undo.

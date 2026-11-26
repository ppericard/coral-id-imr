# The 2026-11-18 rule wordings

Date: 2026-11-18 (Manila, morning). PR: #1086. Rules touched: L11, W27, P1, P3, P4, C2, C3, D5, L4, W19, AGENTS.md
"Working mode". The rules say what holds now; this record keeps why and in whose words.

## Compute cap and checks (L11, Q405)

Context: a check had run for hours of compute. Decision: a hard cap of 40 minutes of compute at every level; level 2 runs only
the worlds the change touches; level 3 never on this machine (Pierre's go, GitHub runners, duration announced); an unclear
result is "the measure cannot tell", never escalated automatically. Pierre, 11-17: "6h de calcul ne devrait JAMAIS
arriver". Consequences: the level table, the "Progressive" paragraph and W27's check limit follow.

## Agents that count (W27)

Context: the cap on agents mixed light and heavy ones. Decision, the exact wording approved ("ok"): at most four agents
that write code or run tests at a time; read-only studies, which run no tests, may run on top. Consequences: W27,
AGENTS.md index, INTEGRATOR.md.

## Estimates in agent time (Working mode)

Decision, approved wording: estimates are the hours of agent work, reviews and checks included, never human days or
weeks; an estimate quoted from elsewhere is converted first.

## Reference photos by their own qualities (P1)

Context: source priority (IMR lecture, Pierre's own) decided which photos led. Decision: a reference photo is chosen on
objective qualities, its source a hint and a guarantee of evaluation, never a placement criterion, for every subject;
reference-route photos enter the base first; a photo strong players cannot identify alone is never used alone in a
question. Pierre: "La source ne devrait pas être le critère principal de 'référence' même si ça peut être un fort
indice. L'ensemble des photos de référence doit avoir des qualités intrinseques, basés sur des critères objectifs";
"Les photos IMR et les miennes devraient juste être garanties d'être évaluées pour rentrer dans la base de données, mais
au final, ça devrait juste être leurs qualités intrinseques qui les placent". Consequences: the coral-only priority and
the licence tie-break's source order are gone from P1.

## One observation per one-photo question (P4)

Decision, approved wording: a one-photo question shows one observation; a multi-photo format shows different
observations, never two photos of one observation as different choices.

## Sources and structure edits (C2, D5, L4), all "ok"

C2: an instance's content editor's own words, pairs and circles carry a source when they give one; the editor asks for
one when a fact is added. D5: a change to circles or look-alike pairs replays every player's progress as a rules version
does, keyed by the structure stamp (rules D6 and D8 apply). L4: another mode's answers may count as evidence on a locked
unit, never opening it; Pierre: live answers "count without unlocking".

## The book (Q294)

Decision: no Coral Finder mention in AGENTS.md or the rules, except where the book stays a cited source (C2).

## Models, effort and measurement (Working mode, INTEGRATOR.md)

Decision: model choice by measurement (a sample of 50-100 items against a strong model, a threshold set beforehand, a
random re-check of the bulk), and a table of model and effort per task (Opus 5.5 high, Sonnet 5.5 medium to high, Haiku
5.5 low after the sample test). Pierre: "A valider en comparant avec un modèle fort sur un échantillon"; "C'est une bonne
idée, et qui doit être bien documenté dans les règles hautes données aux agents (et notamment à l'intégrateur)"; "ok,
applique ce tableau". Consequences: W25 and the quota notes defer to the table.

## No permission prompts for Pierre (Working mode)

Decision: agents write files only with the file tools, never through shell commands that embed code. Pierre, shown a
prompt: "Pourquoi je me retrouve avec ces demandes alors que tu es en mode 'Accept edits'? Comment je suis sensé évaluer
la pertinence de ça???"

## Decision records (W19)

Context: ARCHITECTURE.md and LEARNING.md had grown past 700 KB each as changelogs (docs audit, PR #1089). Decision: a PR
updates the docs that describe what it changes and adds a decision record when it carries out a decision; history stays
in git and the PRs. Pierre: "ok".

## One decisive line in the answer's feedback (C3)

Decision: the feedback sheet shows the verdict, the species line and one decisive line; the rest sits behind "More"; no
line is made by comparing trait tags. Pierre, to the feedback sheet study's recommendation (e), PR #1097: "ok".

Changed by: [2026-11-26-checks-follow-the-question.md](2026-11-26-checks-follow-the-question.md) ("Compute cap and checks", Q405: level 2's worlds for a mechanics run only; the cap and level 3 stay).

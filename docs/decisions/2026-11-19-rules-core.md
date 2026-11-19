# The rules core: AGENTS.md cut to what every task holds, the index to docs/rules/, S1 and L6 merged

Date: 2026-11-19 (Manila). PR: #NNNN. Rules or docs touched: AGENTS.md, `docs/rules/` (README, every header, S1, L6,
U7, D2, W1, W6, W7, W19, W22, W25, W27; W2, W5 and W20 retired), `docs/spec/photos.md`, `tests/docs.test.js`.

## Context

AGENTS.md had grown to 275 lines, loaded by every agent through CLAUDE.md (#1198), and its rules drifted with nothing
checking them. Q425 B (2026-11-19 08:53, «ok»): apply what is decided, then a short core always loaded, topic files
and guards, step by step after a trial. The core proposal (#1200) wrote the core and placed every rule; the substance
review (#1206) asked whether each rule still earns its place and found what was missing. The trial's harness is #1209.

## Decision

- **The core** (Pierre, 2026-11-19 10:12, «ok» to #1200 adjusted by #1206): AGENTS.md holds Rule 0, the merge
  contract, how to work with Pierre, one line per rule that applies to any task, the topic files and Codex's review
  guidelines; the index of every rule moves to `docs/rules/README.md`. Its new lines apply answers he gave: the order
  of work is the integrator's (08:57, «Mon seul input c'est quand j'ai besoin de mettre des choses en priorité»);
  integrators run in auto mode (06:37, «Par du principe que les intégrateurs tournent en mode auto»); no GitHub chores
  for him (2026-11-12, «c'est quoi ce micromanagement forcé ?»); security alerts count like Codex findings
  (2026-11-08). No product rule is deleted or hardened.
- **Writing a rule down** (Q428, 10:12, «ok»): only a change of substance goes to Pierre; editing (shortening, moving,
  merging duplicates, applying an answer he already gave) is the integrator's call, listed in the PR; never generalise
  nor harden.
- **S1 and L6 merged** (10:13, «ok» to: «Partagé et modulaire par défaut : un seul moteur, pas de cas particulier pour
  une unité ou une matière. Une exception est permise quand elle est déclarée et nommée à un seul endroit, avec sa
  raison. Un test liste toutes les exceptions, et une exception non déclarée le fait échouer. L'intégrateur décide une
  exception comme un choix facile à corriger, et l'écrit dans la PR avec sa raison. Une exception qui touche la
  progression des joueurs ou le format des données passe par Pierre.»): S1 takes this text; L6 keeps its corals part
  and points to S1.
- **U7** (10:12, «ok»): the levels each subject teaches are set on its What I learn card, never as more ⚙ rows
  (2026-11-18: «On ne peut pas continuer à empiler des settings dans le menu déroulant»).
- **W20 retired** (10:12, «ok»): its text moves word for word to `docs/spec/photos.md` "No more candidates is no more
  candidates"; a decision on where photos come from, not a rule on shipping.
- **Editing, the integrator's call**: W2 into W7, W5 into W19 (their IDs retired); "tu" into W1; `needs-pierre` into W6;
  the data-access and reports details beside D2; the questions' details beside W7; the threshold detail into W25; the
  Projects mode and the pre-rewrite clones item deleted (rules audit decision 3, 2026-11-18 evening); the agent cap
  lifted and the ask-back rewritten (audit decisions 1 and 2, the same evening); W27's branches into W22.
- **Pierre's words that left the rules' text** (the rule format: his sentence goes to the record): easy to correct, «Tu
  pushe la mise en page. Au pire je corrigerais après. Il faut que tu pushes tout ce qui est facile à corriger à
  posteriori» and «ça c'est du micro management… je ne devrais pas à choisir» (2026-11-14); the model table, «C'est une
  bonne idée, et qui doit être bien documenté dans les règles hautes données aux agents (et notamment à
  l'intégrateur)» and «ok, applique ce tableau» (2026-11-18); the sample test, «A valider en comparant avec un modèle
  fort sur un échantillon» (2026-11-18); no permission prompts, «Pourquoi je me retrouve avec ces demandes alors que tu
  es en mode 'Accept edits'?» (2026-11-18); what players see, «ok, lance les quatre» (2026-11-18); W27, «si tu ne les
  écris pas quelque part, ça sera jamais fait» (2026-11-09).

## Consequences

Every session and subagent loads about 160 lines instead of 275; a topic file is read when the task touches it. A
retired ID is never reused: `tests/docs.test.js` lists W2, W5 and W20, skips them in a range and fails on one cited
alone. The index test reads `docs/rules/README.md`; AGENTS.md has a line budget. The topic files' loading on demand,
the other rule-text passes and the remaining guards are #1200's next PRs.

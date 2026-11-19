# Pierre's answers: the ledger

Append-only. Every answer Pierre gives (numbered or not) gets one entry here, in the PR that applies it to the
document it changes (AGENTS.md "Every answer reaches its doc"). Before asking Pierre anything, search this file, the
rules (`docs/rules/`) and the decision records (`docs/decisions/`): an answer found there is applied, never asked
again. STATUS only cites entries; it never holds an answer alone.

An entry: the date and Manila time, the question number if any, his words as written (French kept), what it decides in
one line, and where it is applied (the doc or the PR). A later answer that changes an earlier one is a new entry naming
the earlier; nothing here is edited or removed.

The entries before 2026-11-19 are being gathered from STATUS's history, the PRs' Decisions sections, the decision
records and the rules' *Source* lines (the 2026-11-19 pass); until that lands, also search those.

## 2026-11-19

- **05:13, Q412.** Merge #1130 as is. Applied: #1130's Decisions.
- **05:13, Q413.** Merge #1148, no simulation. Applied: #1148's Decisions.
- **05:13, Q418.** (b): the fish genus page's "Don't confuse with" lists sourced pairs only; the others later, from the
  players' data. Applied: #1171 (to redo).
- **05:15.** The app's engine is one engine for every subject, with only small per-subject parameters. Applied: the
  audit `docs/reviews/2026-11-19-one-engine-audit.md` (#1185); rule S1's wording (entry of 06:58).
- **06:26.** The invisible "Thank you / Your feedback helped" card on fish/progress: "Probablement moi, mais à corriger
  du coup". Applied: a fix (ROADMAP short term).
- **06:26.** "Commence par essayer de merger toutes les PR encore ouvertes que tu peux, en autonomie."
- **06:37.** "Par du principe que les intégrateurs tournent en mode auto": no allowlist PR for read-only commands; a
  narrow allow rule only for a routine command the classifier refuses.
- **06:50, Q407.** OK: Hide (Players › List) keeps a player off every leaderboard, their groups' boards included.
- **06:50, Q408 (groups carry rights, `docs/reviews/2026-11-18-groups-carry-rights-study.md` §6).** Questions 1-4, 7
  and 8: OK. On 7 he adds: "Une fusion de groupe devrait générer un warning, avec les modifications que ça entraine en
  pratique sur les réglages et les droits." On 5: "je suis pas fan de devoir créer un nouveau groupe de trainer chaque
  mois"; at 06:52 he accepted the alternative: one "Trainers" group gives the capacity, each cohort group carries its
  own list of trainers (members of "Trainers"), a trainer follows and invites only the cohorts that list them, and only
  an account with `grant` edits that list. On 6, his doubt ("admin … c'est le seul rôle inter-instances"); at 06:58 he
  accepted: groups carry only an instance's rights (Managers, Curators, Trainers); Admin stays outside the groups (the
  token plus a short list of admin accounts kept apart, not editable from the Groups page, shown in the Audit).
- **06:50, Q409.** OK to the comment rule: "A code comment says what the code does and why, in the present tense, in a
  few lines; a decision links its record in docs/decisions/; no version tags, dates, quotes or Q-numbers."
- **06:50, Q410.** OK: the five sea slug achievement names stay (Gill and frill, Muck magnet, Slug savant, Nudibranch
  nerd, Every last slug).
- **06:50, Q411.** Not answered: "J'ai pas assez de contexte." At 06:58, after the context: "Je ne comprends pas pourquoi
  le moteur n'est pas homogène… Pourquoi on a des exceptions en fonction des modes de jeux????" (the integrator then
  proposed a level-2 check and a merge unless it confirms a loss, and an audit of the differences between game modes).
- **06:50, Q414.** OK: a `slow` test tag takes the slow statistical tests out of the pre-push tier (CI and the train keep
  them); rule W14's wording follows.
- **06:50, Q415.** OK to the recommendation: rule L11 prevails on points 1, 3 and 4 (the tool aligned to the 40-minute
  cap and Pierre's go for level 3); LEARNING's figures are the minimum for point 2; L12 says "the subject's default
  profiles" for point 5.
- **06:50 and 06:58, Q416 (#1162's follow-ups).** (a) the reverse trap: later, when players' species-level data shows
  the error ("ok"); (b) the pair's sourced marks after a mix-up between the two: "oui", next; (c) Find the X on the pair:
  "ok. Du coup à mettre dans la suite des trucs à faire" (after the species units); (d) the duels stay at ×2: "ok".
- **06:50, Q417 (Pikachu).** "On en a déjà parlé. En pratique les plongeurs utilisent Pikachu pour plus qu'une seule
  espèce." (already answered 2026-11-17: shared, several species). At 06:58, on *Thecacera picta*: "ici c'est celle que
  les plongeurs ont tendance à appeler Pikachu. Donc il faut au moins le mentionner, même si on indique que ce n'est pas
  forcément approprié." Applied: the nickname counts for *T. pikachu* and *T. pacifica*; *T. picta* is mentioned as
  locally called so, with that note.
- **06:50, rule S1's wording.** The first wording ("only by its data and a few named parameters in `SUBJECTS`") refused:
  "On pourrait envisager des bouts de codes spécifiques (des 'patch') ou des features activées seulement pour une
  matière. J'ai peur que la formulation soit trop conservatrice". At 06:58, OK to: "Every subject runs on one shared
  engine. A difference between subjects is declared and named in one place, whatever its form (data, a parameter, a
  feature switched on for some subjects, or a patch), and never hidden in the shared code as a test on the subject."
- **06:50, the source weight of the corals' photos (`tiers` ×1.3).** "J'ai déjà répondu plein de fois à cette
  question!!!! On avait déjà fait des choix." The answer is rule P1 (no source priority anywhere, Pierre's and IMR's
  photos included; 2026-11-18) and #942 A ("référence … déduit des caractéristiques de la photo, pas un tag"): remove
  every source boost in the corals' code, add no tag.
- **06:59.** The rename: already answered 2026-11-18 ("Not now: the domain, the accounts, the IMR agreement, a second
  person"; the domain becomes urgent "quand l'infrastructure qu'on utilise ne suivra plus"). And: "J'aimerais que tu
  fasses une passe globale sur la base de toutes mes décisions d'hier aujourd'hui ou avant, et met à jour la doc
  proprement en conséquence!"
- **07:05.** OK to this ledger and its rule (AGENTS.md "Every answer reaches its doc, and the answers ledger").
- **08:18.** On README's credit line for the Coral Finder 2022 ("no photo of the book is used. It stays a cited
  source…"): "Je suis pas sur que c'est une bonne chose de mettre ça en avant. Maintenant c'est juste une source comme les
  autres". Applied: the line is gone from README's credits; the book is cited where it is used, like any source.

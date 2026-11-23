# Pierre's answers: the ledger

Append-only. Every answer Pierre gives (numbered or not) gets one entry here, in the PR that applies it to the
document it changes ([AGENTS.md, Working with Pierre](../AGENTS.md#working-with-pierre)). Before asking Pierre
anything, search this file, the rules (`docs/rules/`) and the decision records (`docs/decisions/`). STATUS only
cites entries; it never holds an answer alone.

This ledger is historical evidence: an entry keeps what was said and how it was read then, and a later entry may amend
an earlier one. A match is not by itself a current instruction: before applying it, check its scope, the later entries
and the subject's current home (its Linear issue or subject note, the rule or doc it was applied to); a decision that
settles the point is applied, never asked again.

An entry: the date and Manila time, the question number if any, his words as written (French kept), what it decides in
one line, and where it is applied (the doc or the PR). A later answer that changes an earlier one is a new entry naming
the earlier; nothing here is edited or removed.

The entries before 2026-11-19 were rebuilt on 2026-11-19 from STATUS's history and the PRs. A quote there is
Pierre's words only when the source attributes it to him (an English quote may be the PR's translation); any other
entry is a paraphrase and says so. A few early answers were given only in the chat and are not here.

## 2026-11-03

- **Photo memory.** (paraphrase) In a thin genus players learn the photos, not the genus: more photos first for the
  genera with the fewest. Applied: rules/learning.md L1; ROADMAP Photo memory that fades with time (#573).

## 2026-11-04

- **The fish path and the global score.** (paraphrase) The global fish score reaches 100% only with the common and
  scientific names of every species; the path is a tree; a right genus is partial credit. Applied: FISH_PATH.md Levels;
  ROADMAP Fish: the path as a tree (#689, #705). Changed by 2026-11-18 ~09:17 (two independent trees).

## 2026-11-05

- **Q3.** (paraphrase; the governance round's numbering, which may be that PR's own) A choice presented with a
  recommendation is never merged on silence; decided game changes still merge without waiting (Pierre, 2026-11-05; the
  PR says clarified). Applied: #558. Changed by 2026-11-14 (ship what is easy to correct).
- **Q5.** (paraphrase; same caveat) Screenshots go to him as files in the chat. Applied: #558; AGENTS.md Questions to
  Pierre.
- **Q83.** (paraphrase) Withdrawn: the progress is too generous beyond the look-alikes; the number of genera in mind
  matters. Replaced by the study of progress against the number of genera (Q101-Q113). Applied: STATUS (#594);
  LEARNING.md; rules/learning.md L11.
- **Fish public by Sunday 2026-11-08** (evening; paraphrase): the photos' step 3, the fish sheets at three levels and
  the new app icon very short term. Applied: STATUS (#594); done 2026-11-06.
- **Launch decided work at once.** (paraphrase) No queue held back; `tests/slot.js` protects the machine. Applied:
  AGENTS.md Working mode (#573).
- **Q19.** (paraphrase) The photo's difficulty is shown as the share of starting players (level 0, Elo 1000) who
  recognise it without guessing, 1 / (1 + e^d), worded recognised-by-N%, in one shared admin helper (admin.js
  recognised, recPct) for the follow-up PR on the rest of the admin. Applied: #557, #601, #566, #1132.
- **Q20.** (paraphrase) The four test tiers are now stated in the rules (then numbered 14f and 14g): Pierre answered Q20
  yes; tier 3 runs routinely through the Sheets connector. Applied: #561.
- **Q21, Q22, Q24, Q25, Q27-Q34, Q37-Q43.** (paraphrase) Answered together on 2026-11-05 with the rest of Q20-Q43,
  answered and closed (the data access bullet, the reports-and-events routine, the four test tiers); no words recorded,
  no separate content; see #561. Q20, Q23, Q26, Q35 and Q36 have their own entries. Applied: #561.
- **Q23, Q26.** (paraphrase) Yes to the whole proposal for the difficulty reading (Q19, Q23, Q26): the formula, the five
  bands and colours (colour-blind too), Elo ± margin for players, raw values in a tooltip; built in #566. Applied: #601,
  #566, #561, #1132.
- **Q35.** No share-alike for corals; waiting share-alike candidates leave the queue, never one he added: Pierre,
  2026-11-05 (Q35; ROADMAP row). (paraphrase). Applied: #568, #561.
- **Q36.** (paraphrase) The cap on fish candidates: Q36 (Pierre, 2026-11-05), unchanged; the fetcher rules unchanged
  (rules P1, C7, C8, S2; ARCHITECTURE, Fish candidates). Applied: #666, #599, #574, #715, #561, rules/ship.md W20.
- **Q45, Q47.** The Astrea question for a trainer with the study's photos, Q47 noted on it: Pierre, 2026-11-05, Q45 (the
  admin to-do screen to show it is a separate PR). (paraphrase). Applied: #570, #571.
- **Q46, Q48.** IMR survey records parked: Pierre, 2026-11-05, Q46. Pachyseridae: nothing to do, Q48. (paraphrase).
  Applied: #570.
- **Q49.** (paraphrase) The fish section and its readers (ROADMAP, Taxonomy reference, step d): Pierre expects it
  (2026-11-05); the readers already take a subject; build time only. Applied: #959, #570, #597, #906, #1132,
  decisions/2026-11-18-decisions-from-comments-tests-3.md.
- **Q50.** *Plesiastrea versipora* → *P. peroni* in the checklist, data only, with a test: Pierre, 2026-11-05, Q50.
  (paraphrase). Applied: #570.
- **Q51.** (paraphrase) The watch list (Favites revision and *F. irregularis*; the unnamed genus within *Fungia
  fungites*; Tubipora lineages; *Cyphastrea agassizi*), reported by the tool, never changing the app: Pierre,
  2026-11-05, Q51 (AGENTS.md, its first standing rule then). Applied: #570.
- **Q53-Q56.** (paraphrase) Decided together within the URL refonte, app and admin: #section/page and #group/tab/view in
  English, filters after ?, the subject prefix everywhere; no words recorded; see #573. Applied: #610, #612, #655, #675,
  #1132, rules/admin.md A4.
- **Q60.** (paraphrase) The list of dropped rules in the rules rewrite: approved by Pierre (Q60, 2026-11-05). Applied:
  #572.
- **Q61.** (paraphrase) The Why lines of the rules that were marked as inferred: Pierre gave or confirmed the reasons
  (2026-11-05); C3, P1, A1 and S2 rewritten as he said (changed.md 10). Applied: #572.
- **Q62.** (paraphrase) Where some rules landed in the rules rewrite: approved by Pierre (Q62, 2026-11-05). Applied:
  #572.
- **Q63.** Give the three stretched pictures back their true proportions: "the stretch was only for the slides: give
  them back their true proportions" (Pierre, 2026-11-05, as relayed by the integrator in the PR). Applied: #578.
- **Q65.** A separate family, Contributions, never counting in progress or the leaderboard; three tiers 1st / 5th /
  10th, each shown right after the report; counting rules (every report, signed in or not, one per photo, Other only
  with a note); synced with the achievements (paraphrase; Pierre, 2026-11-05, as #579 records it). Applied: #579, #785.
- **Q66.** When a player's report is handled, the player who sent it is thanked at their next visit, without being
  thanked over and over (Pierre, Q66 and 2026-11-05). (paraphrase). Applied: #581, #579, #665.
- **Q67.** "je vais suivre ta recommandation" (Pierre, 2026-11-05, to the integrator's recommendation): the old rule on
  ReefRecall (his separate app; numbered 28, later C9) is dropped as a rule for one context line in AGENTS.md, The
  project in five lines; the ID C9 stays unused. Applied: #572.
- **Q69.** Pierre's decision of 2026-11-05 (Q69: yes), from the statistical methods study
  (docs/reviews/2026-11-05-stats-methods-study.md on claude/stats-methods-study, §0, §2, §5.3, §6.3): the admin's
  Analyses now correct for multiple testing. (paraphrase). Applied: #588, #746, #830, #829.
- **Q70.** a map with a stability line, no named types until about 30 players. (paraphrase). Applied: #604, #589, #590,
  #829, #830.
- **Q71.** last 300 answers, count shown, rows under 100 greyed. (paraphrase). Applied: #604, #590, #589, #829, #830.
- **Q72.** (paraphrase) Left to the integrator's call, as recorded in #604: use the study's 8, each net of what the app
  decided; easy to change later. Applied: #604, #830, #589, #590, #829.
- **Q73.** admin only, anonymous ids in the report, counts only in the Action log, made-up players in tests and the
  demo. (paraphrase). Applied: #604, #589, #590, #829, #830.
- **Q74.** a real phone form (biplot with ~8 labelled points). (paraphrase). Applied: #620, #604, #589, #590, #829.
- **Q75.** in the milestone report; Recompute here bumps AV. (paraphrase). Applied: #620, #604, #589, #590, #829.
- **Q76.** a player × genus effect in the Learning model comes later. This PR does not add one: the residuals are
  computed after the current model. (paraphrase). Applied: #620, #589, #590, #829, #830.
- **Q77.** behaviour PCA, not raw answers. (paraphrase). Applied: #604, #620, #589, #590, #829.
- **Q78.** (paraphrase) Pierre's answers of 2026-11-05 to Q70-Q81 (the recommendation was yes): photos served from a
  domain of his own instead of `r2.dev` (development-only, rate-limited), together with the domain rename planned before
  December (Q78, already planned: added to that row); player learning trajectories from first answer to now as a later
  analysis level (Q71 follow-up). Applied: #590, #589.
- **Q79.** Titles *First feedback* / *Helping hand* / *Co-author*, the descriptions as written, icon 💬: Pierre,
  2026-11-05 (Q79, A). (paraphrase). Applied: #579, #589, #590.
- **Q80.** (paraphrase) Title Your feedback helped, the text saying that a report he sent was looked at and handled
  (handled is not fixed: never promise a fix), icon 🙌: Pierre, 2026-11-05 (Q80, A). Applied: #581, #589, #590.
- **Q81.** Reports already marked done are thanked once at release: Pierre, 2026-11-05 (Q81). (paraphrase). Applied:
  #581, #589, #590.
- **Q82.** The run achievements and Sharp eye must be earned "only in the normal Quiz", never in the Custom quiz (there
  the player picks the genera and the choices come from them, so runs and a photo most players miss come easier):
  Pierre, 2026-11-05 (Q82). The Met achievements stay as they were. Applied: #593.
- **Q84-Q91 (deleted accounts).** (paraphrase) Pierre, 2026-11-05: an archived account is Board -2 with no new column
  (Q84); delete everything erases the player's reports, keep answers anonymises answers and reports, and open reports
  read as from a removed account, never thanked (Q85); anonymised answers count in pooled fits only (Q86); page
  summaries are erased on delete (Q87, Q88); an archived account's device shows an account-archived message asking to
  sign out to start fresh, instead of re-creating the account (Q88); two named buttons with no default (Q89); the
  privacy wording says exactly what is done (Q90); yes to a one-shot logged cleanup run by the self-update (Q91).
  Self-service deletion: signed in, confirmed with the code in two steps, the device signed out and cleared, a discreet
  page, rate-limited. Applied: #592, #600, #603, #594, #1128, #1132, rules/sheet.md D7.
- **Q101.** 100% = tells the genus from every unit of the slate; unmet units untested; bonus genera out of the field.
  (paraphrase). Applied: #611 (closed, not merged), #596.
- **Q102.** a continuous per-player discrimination level per pair, built from the existing pair records, shrunk toward
  the pooled confusion; coverage = the pooled-weighted mean. (paraphrase). Applied: #611 (closed, not merged), #596.
- **Q103.** first genera capping around 54-62% is expected. (paraphrase). Applied: #611 (closed, not merged), #596.
- **Q104.** two-tone bar fully built, with a switch, default on unless Pierre says otherwise from the screenshots.
  (paraphrase). Applied: #611 (closed, not merged), #596.
- **Q106.** the typed vocabulary is the genera unlocked (the selection in the Custom quiz), as a similarity-weighted
  effective set size, for both the guess rate and the evidence. (paraphrase). Applied: #611 (closed, not merged), #596.
- **Q107.** one rule everywhere, no Custom-quiz cap. Q108: no decay, fixed denominator. (paraphrase). Applied: #611
  (closed, not merged), #596.
- **Q108.** Q107 yes: one rule everywhere, no Custom-quiz cap. Q108: no decay, fixed denominator. (paraphrase). Applied:
  #611 (closed, not merged), #596.
- **Q109.** rules-version replay, learned marks kept only where today's replayed state meets the exam entry, only
  ACH_LEARN revoked, an apology card whose PS names a player from a non-committed source. (paraphrase). Applied: #611
  (closed, not merged), #646, #596.
- **Q110.** the code is subject-agnostic, applied to corals only. (paraphrase). Applied: #611 (closed, not merged),
  #596.

## 2026-11-06

- **Q140.** Writing the study: Pierre's request of 2026-11-06 (relayed by the integrator), his clarifications at 07:18
  and 07:25, and Q140, which he approved as a simulation. (paraphrase). Applied: #641, #646.
- **07:30, Q138.** Q138 (approved by Pierre on 2026-11-06 as Q146; review
  docs/reviews/2026-11-06-engine-algorithms-review.md §3, §5, §10). The expectation's guess model, 1/k + (1 − 1/k) σ(θ −
  d), gets the formats wrong. On the real log, questions showing 4 choices of which 2 are plausible are right 87% of the
  time where the app expects 74%; with 3 plausible, 90% vs 71%; typed, 76% vs 82%; each over-credited answer inflates
  the ability and the level. (paraphrase) Pierre approved #638 as presented: per-format offsets from the data, served by
  the sheet, used in the expectation and the photo aim, guess rates kept at 1/k. Applied: #638, #646, #637 (closed, not
  merged).
- **07:30, Q144.** "merge now" (Pierre, Q144, 2026-11-06 07:30, #612): merge now, ahead of the fish flip plus 48 hours
  that the fish release plan had set. Applied: #612.
- **13:19, Q158.** Open fish to everyone now, keeping the beta label: Pierre, Q158 (2026-11-06 13:19). (paraphrase).
  Applied: #650, #598, #706, #737, #753.
- **14:57, Q175.** "fish is in beta, accepted" (Pierre, Q175, 2026-11-06, #669, on the fish % dropping once for every
  fish player, with no announcement). Every fish family in the game counts in progress, circles 2 and 3 included
  (replacing the old rule that circles 2 and 3 never count); the circles open after the IMR families. Applied: #669,
  #703, #730; FISH_PATH.md; rules/ui.md U7.
- **15:14, Q178.** Reference photos in play once judged at the reference level: #660 (Pierre, 2026-11-06; Q178/Q179).
  (paraphrase). Applied: #663, #667, #672, #679, #681.
- **15:14, Q179.** Fish calibration ref = 3, early = 1.5: Pierre, 2026-11-06 15:14 (Q179, yes). (paraphrase). Applied:
  #660, #663, #667, #672, #679.
- **15:16, Q180.** (paraphrase) One notion of in play, for every route: Pierre, 2026-11-06, Q180 and Q199 (the game
  already plays it; the admin now shows it). Applied: #716, #674, #599, #602, #687, rules/photos.md P1.
- **15:26, Q181.** Open all = circle 1 only; the later circles keep their automatic thresholds (cards for later circles
  maybe later, not in this PR): Pierre, 2026-11-06 15:26 (Q181). (paraphrase). Applied: #669, #689.
- **15:26, Q182.** (paraphrase) Help text (the My progress ? and the quiz ?): every fish family counts in your progress,
  you start with the families of the IMR survey and more open as you go. No SVS-videos jargon in player-facing text:
  Pierre, 2026-11-06 15:26 (Q182). Applied: #669, #689.
- **15:26, Q183.** (paraphrase) Rule U7 gains the fish SVS-video-extras and Beyond-IMR opt-ins in its list of settings
  removed on purpose: Pierre, 2026-11-06 15:26 (Q183). Applied: #669, #689.
- **15:33, Q186.** The draw keeps favouring the easy photos in the big pools: Pierre, 2026-11-06 15:33 (Q186), #678.
  (paraphrase). Applied: #674, #678, #685, #689.
- **15:35, Q191.** "add Seen % (photos the player has seen out of those in the units they had met at the time) and
  Spread % (when the unit still had colonies or photos the player hadn't seen, how often they got one; computed in time
  order) to the admin's player list. Computed in the sheet (Code.gs, as other per-player stats are), shown in admin."
  (Pierre, 2026-11-06 15:35 Manila, Q191, #680). The column names were left to the integrator; Seen % is headed Photos,
  Spread keeps the study's word. Applied: #680, #1132, #689.
- **15:35, Q192.** "aim for 3-5 answers per photo, and flag photos far harder than their unit (genus) in the admin
  (where photo stats live), with a clear threshold based on the study. Show answers-per-photo coverage (the share of
  photos with at least 3 answers, per unit)." (Pierre, 2026-11-06 15:35 Manila, Q192, #682). Applied: #682, #1132, #689.
- **15:36, Q189.** Fish too, with the observation as the fish's colony, no fish cap, and Q189 named as coral-only:
  Pierre, 2026-11-06 15:36 (via the integrator). (paraphrase). Applied: #685, #689, rules/learning.md L3.
- **15:41, Q195.** Pierre, 2026-11-06 15:41 (Q195): (1) two segments, each with an icon and a count, rather than the
  app's chip with a menu; (2) on phones the logo steps aside while the switch shows. (paraphrase). Applied: #633, #689.
- **15:43, Q197.** None: Pierre chose A on 2026-11-06 15:43 (Q197), with the card text and the six photos as shown.
  (paraphrase). Applied: #676, #689.
- **16:17, Q198.** (paraphrase) None. The Opened-for-me view follows Pierre's Q198 answer (A, 2026-11-06 16:17),
  recorded in #675. Applied: #677, #684, #675, #689.
- **16:20, Q199.** The same path as his adds, every fish photo on R2, the reference photos too: Pierre, 2026-11-06 16:20
  (Q199). (paraphrase). Applied: #674, #716, #687, #994, #797, rules/photos.md P1.
- **17:02, Q201.** Rule L3 wording (Photo exposure): Pierre, 2026-11-06 17:02 (Q201, yes). (paraphrase). Applied: #685,
  #689.
- **Save the quota** (paraphrase): flagged at 7%; stopped agents' work kept on branches. Applied: rules/ship.md W25;
  INTEGRATOR.md Quota (#705).
- **Q92.** (paraphrase) No answer recorded. Asked: everyone sees fish, signed-out players included (fish release plan
  (a); rec. yes). Left STATUS's open list on 2026-11-06 (#689) as fish opened to every player in beta (Q158). Applied:
  #650.
- **Q93.** (paraphrase) No answer recorded. Asked: keep the beta label (rec. yes). Left the open list on 2026-11-06
  (#689); the label stayed until 2026-11-17. Applied: core.js SUBJECTS.
- **Q94.** (paraphrase) No answer recorded under this number. Asked: a Fish-is-here card (rec. yes); built in #598 (see
  Q118, Q152). Applied: #598.
- **Q95.** (paraphrase) No answer recorded. Asked: PR C's copy edits (rec. yes); #598 merged. Applied: #598.
- **Q96.** (paraphrase) No answer recorded. Asked: fish level 1 on today's photos (rec. yes). Left the open list on
  2026-11-06 (#689).
- **Q97.** (paraphrase) No answer recorded. Asked: no fish answer logging for a week (rec. yes); overtaken the same day:
  fish answers logged from the very first second (Pierre, 2026-11-06; ROADMAP, Admin for every subject). Applied: #630.
- **Q98.** (paraphrase) No answer recorded. Asked: the smoke tests and a bug sweep as release checks (rec. yes). Left
  the open list on 2026-11-06 (#689).
- **Q99.** (paraphrase) No answer recorded. Asked: new players start on Corals (rec. yes). Left the open list on
  2026-11-06 (#689).
- **Q100.** (paraphrase) No answer recorded. Asked: the flip on Saturday ~10:00 Manila, Sunday morning in reserve (rec.
  yes); fish opened on 2026-11-06 instead (Q158). Applied: #650.
- **Q105.** (paraphrase) Not decided (#611, closed unmerged: Q105 not decided; a personalised exam behind a switch).
  Overtaken by the species exams (Q395) and the per-player reserve (#1099). Applied: none.
- **Q111.** (paraphrase) No answer recorded. Asked: another-genus answers later (the progress study). Left STATUS on
  2026-11-06 (#621) with #611's trade-off rejected. Applied: none.
- **Q112.** (paraphrase) No answer recorded. Asked: simulation first (the progress study). Left STATUS on 2026-11-06
  (#621). Applied: none.
- **Q113.** (paraphrase) Not decided (left open in #611); rule L11 has been reworded since (L11 validated 2026-11-08;
  Q405 2026-11-18): moot. Applied: rules/learning.md L11.
- **Q114.** (paraphrase) No answer recorded. Asked (#616): one retype on a close misspelling, grading unchanged, the raw
  typed text and a retyped flag logged (rec. yes). #616 merged. Applied: #616.
- **Q115.** (paraphrase) No answer recorded. Asked (#618): the one-tap Getting boring? question only after 15 answers
  and 5 minutes (rec. yes). Applied: #618.
- **Q116.** (paraphrase) No answer recorded. Asked (#603): the archive message and the self-delete page wording.
  Applied: #603.
- **Q117.** (paraphrase) No answer recorded. Asked (#579, #581): the four feedback cards (see Q65, Q66). Applied: #579,
  #581.
- **Q118.** (paraphrase) No answer recorded. Asked (#598): fish copy edits 1-7 and the Fish-is-here card (kicker,
  target, once per device, 10-answer minimum); #598 merged. Applied: #598.
- **Q119.** (paraphrase) No answer recorded. Asked: the fish admin screens of #599 and #602 (the Choices-I-made section
  of each). Applied: #599, #602.
- **Q120.** (paraphrase) No answer recorded. Asked (#614): keep the per-entry minimum rule; leave the 25 pre-flag-ease
  photos (rec. yes to both). Applied: #614.
- **Q125.** (paraphrase) The fish sheets study's 13 questions answered; the answers are quoted in the study's §9
  (Pierre, 2026-11-06, Q1-Q13, #631). Applied: reviews/2026-11-05-fish-sheets-study.md §9; ROADMAP Fish sheets at three
  levels.
- **Q139, Q141-Q143.** (paraphrase) Answered in the batch Q132-Q143, as answered (#646): Q139, exam photos at a fixed
  hard quantile (exam part 3); Q143, an exam over two visits; Q141 and Q142, content not recorded (the PR notes that
  nothing was tuned). Later, Pierre, 2026-11-18: no to both exam items (inventory L8). Applied: #646.
- **The morning report before 05:00** (paraphrase; he wakes about 05:00). Applied: STATUS (#621). Changed by 2026-11-18
  (D7 closed: no morning report).
- **The progress bar is right for every profile** (morning; paraphrase): he rejected #611's trade-off: the bar must be
  right for every profile, experts above all early. Applied: LEARNING.md; rules/learning.md L11 (#621).
- **Q122.** (paraphrase) The icon itself, C1 (straight handle): Pierre, 2026-11-06 (his answer to the app-icon question,
  Q122 in STATUS; ROADMAP, Rethink the app icon, Pierre 2026-11-04). Applied: #623, #621.
- **Q127, Q128.** (paraphrase) Pierre, 2026-11-06 06:38 Manila, on the research note (section 6 a and b, #622): Q127
  yes, 100% means naming right every photo of the genus, alone and without choices, over the theoretical distribution of
  all its possible photos, easy to hard (ours are a sample of it, so adding photos moves no bar); Q128 yes, the bar uses
  only the player's own answers on that genus (the global level serves everything else, not the bar). Part 2 (Q135,
  #646) built it as the posterior expected domain score. Applied: #646, #624, #622, rules/learning.md L9.
- **Q129.** pair coverage at the exam's entry: the exam needs the genus to have been asked beside its look-alikes.
  (paraphrase). Applied: #646, #624, #622, rules/learning.md L9.
- **Q130, Q131.** (paraphrase) Pierre, 2026-11-06 06:38 Manila, on the research note (section 6 d and e, #622,
  docs/reviews/2026-11-06-progress-metric-research.md): Q130 yes, replace the yardstick "overclaim vs pOpen" with the
  signed error against the true domain score plus time-to-credit, before any further tuning; Q131 yes, hold #611's bar
  change until that comparison has run on it and on the domain-score bar (its typed-vocabulary part does not depend on
  the bar). Applied: #624 (the judge), #622, #646.
- **Q132.** (paraphrase) One scorer, d0 and R logged before the new bar, replayed with one meaning (F6 (c), then (b) not
  needed for logged rows): Pierre, 2026-11-06, Q132 (coherence review decisions 1 and 4). Applied: #632, #643, #638,
  #977, #646.
- **Q133.** Genus difficulty = the sheet's gd, and the confusion term dropped unless the simulation shows the opening
  order needs it: Pierre, 2026-11-06, Q133 (coherence review decision 2). The simulation below shows no need, so the
  term goes. (paraphrase). Applied: #642, #632, #646.
- **Q134.** One level shown, the app's ~level, in the leaderboard and My progress; the sheet's R internal: Pierre,
  2026-11-06, Q134. (paraphrase). Applied: #639, #646.
- **Q135.** the posterior expected domain score from the player's own answers, format-aware, a miss never raising it;
  the old moving average pg removed while learned marks are protected. (paraphrase). Applied: #646, rules/learning.md
  L9.
- **Q137.** (paraphrase) Fix the double count now (§2a), and plan the Kalman/Glicko variance (§2b) with the new bar
  (algorithms review, choice 2): Pierre, 2026-11-06, Q137. Applied: #643, #632, #646.
- **Q145.** yes. (paraphrase). Applied: #637 (closed, not merged).
- **Q146.** the per-format offsets go into the bar, through #638's q.df. (paraphrase). Applied: #646, #638.
- **Q147.** no global slope. q.S stays at 1 (the overconfidence is a method issue for a later variance model).
  (paraphrase). Applied: #646, #651, #638.
- **Q148.** "every photo of his that is compatible ... must be included" (Pierre, Q148, 2026-11-06 13:14, in his words
  in #635; quoted again in #1017). Pierre's own photos are never ordered first. Applied: #614, #742, #1019, #635, #1017,
  rules/photos.md P1.
- **Q152.** (paraphrase) The Fish-is-here card becomes an invitation to test the fish beta (Pierre, 2026-11-06, Q152).
  Applied: #598.
- **Q155.** "I prefer progress that doesn't move fast enough, even if we speed it up later, rather than too fast,
  because every time we lower it people feel they go backwards." (Pierre, 2026-11-06, as quoted in #646). He approved
  tuning with an asymmetric target: over-claim at most +3 points, then the least under-claim. Applied: #646.
- **Q159.** The old ids keep mapping while old apps play: Pierre, 13:39 (Q159). (paraphrase). Applied: #656, #654.
- **Q163, Q174.** (paraphrase) Rule L2 in the bar becomes the signal-detection false-alarm correction, Pr = H − FA
  (Snodgrass & Corwin 1988), replacing the full miss, because a score of 0 would say you know nothing, which is not
  true; the ability is untouched (Pierre, 2026-11-06, Q163 at 14:05 and Q174 at 14:34). Applied: #646, rules/learning.md
  L2.
- **Q164.** (paraphrase) The added names: Pierre, 2026-11-06 (Q164, 14:14): all OK; Clownfish and clown accepted as
  right but corrected gently, the feedback saying the usual name is anemonefish, in the same style as the other
  kind-words feedback. Applied: #657, #834.
- **Q165.** Repeats: Pierre, 2026-11-06 (Q165): hold off; the real fix is more photos in the game (#614 and the
  reference photos). (paraphrase). Applied: #657.
- **14:17, no wall.** "No wall: before Open Water a photo under ease 4 may come, but rarely" (Pierre, 2026-11-06 14:17,
  as #729 quotes it). Applied: docs/LEARNING.md, tests/fish.smoke.js, #729; its number is Q252 (2026-11-08, below).
- **Q166.** "merge, once your L2 fix is green" (Pierre, 2026-11-06 14:24, via the integrator; #661). Applied: #661.
- **Q167.** "YES, it applies to fish too, i.e. no photo with several fish species. Make the rule subject-neutral."
  (Pierre, 2026-11-06 14:24, via the integrator; #661). Rule P3 now reads in terms of several organisms to identify
  (several corals; fish, several species); U14's report reason and the AGENTS.md index line follow. Applied: #661, #839,
  rules/photos.md P3.
- **Q168.** "obviously the same rule for fish. The normal quiz is never split by a course group or a book shape group;
  only the Custom quiz picks groups. Make it subject-neutral." (Pierre, 2026-11-06 14:26, via the integrator; #661).
  Rule L3 now says so for every subject. Applied: #661, rules/learning.md L3.
- **Q169.** "YES. The point is a development good practice: avoid exceptions in the code. Word it as 'no unit-specific
  code: no special cases for one unit or one subject; the data says it, the engine stays generic'." (Pierre, 2026-11-06,
  via the integrator; #661). Rule L6 now opens with that line for every subject; Millepora and the bonus genera stay
  under the corals' part. Applied: #661, rules/learning.md L6.
- **Q170.** (paraphrase) For fish, an easy first wrong choice is a unit from another shape group of the book, the fish
  equivalent of a coral genus of another growth form (rule L7, 14:26). The seed look-alikes for fish confusions are
  Pierre's declared groups, added to fish.json by another agent. Applied: #661, rules/learning.md L7.
- **Q171.** "no more candidates is no more candidates" (Pierre, Q171, 2026-11-06, #666): when a fish unit runs short of
  candidate photos, the tools fetch more on their own; when none are left, they stop. Applied: #666, rules/ship.md W20.
- **Q172.** (paraphrase) The apology card text as proposed, with the PS from the Notes tab (card.rv8.ps): Pierre,
  2026-11-06 14:44. Applied: #646, #736.
- **Q176.** Corals' bonus genera unchanged: Pierre, Q176. (paraphrase). Applied: #669, #706.
- **Q184, Q185.** (paraphrase) None needed: Pierre approved them on 2026-11-06 15:33 (Q184: placement on the card only,
  the wording with the count in bold, the old N/M met line removed; Q185: the line stays at 40/40). Applied: #671, #689.
- **Q187, Q190.** (paraphrase) Cap 40, exploration share γ = 0.3 on colonies never seen, cov instead of cov²,
  colony-level memory: Pierre, 2026-11-06 15:35 (Q187, Q188, Q189, Q190). Applied: #685, #1132, #689, #1099, #1130,
  rules/learning.md L3.
- **Q188.** "only after simulation; decide nothing the simulation contradicts" (Pierre, 2026-11-06 15:35, Q188, as
  quoted in #685), in the same bullet as Q187, Q189 and Q190 (cap 40, exploration share γ = 0.3, cov instead of cov²,
  colony-level memory). Applied: #685, #689, rules/learning.md L3.
- **Q193.** docs/ARCHITECTURE.md (cap), docs/ROADMAP.md (Q193). (paraphrase). Applied: #685, #689.
- **Q194.** Pierre, 2026-11-06 15:38 (Q194): the screens and choices as shown, merged as is; since Q180 the swiper
  mainly removes or corrects. The choices it covered: in #599, one card with the species' photos in play as small tiles
  under it, an Out of play button on an enlarged photo in play (one click, Undo), an All | Checks segment, Add writing
  the pass's tags, ease, phase and crop, and the order within a species (best, alt, not judged, near-duplicate, then
  the easiest, then a reference photo); in #602, Not this → another species making it that species' candidate, the
  phase row for the 5 entries with phase lines only, "missing phases first" ordering candidates within a species only,
  and phase "none" stored as an empty string. (paraphrase) Applied: #599, #602, #689.
- **15:41, Q196.** "we can merge the new bar now." (Pierre, 2026-11-06 15:41, Q196, #646). #638 merges first, so this PR
  is rules version 9. Applied: #646, #689.
- **Q200.** recalculate fish units under the new bar on the device, silently, keeping learned marks. (paraphrase).
  Applied: #688, #734, #689.
## 2026-11-07

- **08:50, Q177.** (paraphrase) Pierre, 2026-11-07 08:50-08:52: circle-3 fish families were opening one by one by
  themselves at the Q177 threshold (2026-11-06); he wants circle 3 to be an option the player can decline and unlock
  later, notably from My progress. Applied: #703, #669, #706, #1067.
- **08:06, Q203.** "you can validate" (Pierre, 2026-11-07 08:06, Q203, #694): the 14 fish achievements and their names,
  as listed in the PR. Applied: #694, #697.
- **09:03, Q205.** (paraphrase) Open Water instead of Advanced for the scientific genera (rec. A): Pierre, 2026-11-07
  09:03. Changed on 2026-11-08: genera back at Advanced (see that day's entry). Applied: #702, #720, #705, #706, #1067.
- **14:42, Q207.** Rule S1, the general text for anything in beta: Pierre, 2026-11-07 14:42 (Q207, yes). (paraphrase).
  Applied: #706, #707, #733.
- **Expert anchors** (paraphrase): two IMR coral experts and one IMR fish expert (families and genera) anchor the expert
  profiles; he is a fish expert for families only. Applied: INTEGRATOR.md (#705); the names stay out of the repo (rule
  D2).
- **Q202.** docs/STATUS.md for the morning of 2026-11-07 (no automatic morning report: Q202): the evening and night
  merges, Q203. (paraphrase). Applied: #697.
- **Q204.** Circle 3 still counts in the fish % (100% = everything unlocked and known; a player who declines has room
  left): Pierre, Q204, 2026-11-07. (paraphrase). Applied: #703, #706, rules/ui.md U7.
- **Q206.** The handover docs say the last question is Q207 (Q206: the experts in the sheet's Notes tab; Q207: rule S1
  general). (paraphrase). Applied: #707.

## 2026-11-08

- **15:35, Q300.** (paraphrase) The history rewrite all at once, photos and Coral Finder crops, after the queue is
  empty, today. Applied: #754, #848, #804.
- **Genera back at Advanced.** "initialement on avait proposé que ça arrive au niveau Advanced Open Water ... c'est ce
  qu'il faut" (Pierre, 2026-11-08, #720): scientific genera come back at Advanced, for the offer and for a family's
  genera; a genus met stays in. This replaces Q205 (2026-11-07, Open Water). Applied: #720, #721, #1067.
- **Scientific genera: too early.** "too early, too strong" (Pierre, 2026-11-08, on the scientific genera, as #975
  quotes it). Applied: #975.
- **16:20, Q121.** (paraphrase) The history rewrite, all at once (with Q300); no GitHub Support purge (his choice).
  Earlier the same day: not yet a go until he knew whether it needed him and how long the app is down. Applied:
  HANDOVER.md Photos out of the repo, step 3 (#752, #754).
- **16:55, Q305.** "Oui, fusionne cette nuit" (Pierre, 2026-11-08 ~16:55, #757): the rule texts and the four design
  choices (Q305 a, b and d adopted, c not; the version assigned on the PR branch before merge, one Code.gs PR per
  train); the rule wording goes to him before it lands. Applied: #754, #757, #807, #812, #838, rules/sheet.md D3,
  rules/sheet.md D5.
- **The photo's species after every answer** (paraphrase): after a family or genus answer, right or wrong, show the
  photo's species, common and scientific name. Applied: FISH_PATH.md The photo's species after every answer (go
  2026-11-09; #804).
- **Eel-tailed catfishes.** "Eel-tailed Catfish is really a family with its own thumbnail in the book's index" (Pierre,
  2026-11-08 ~20:20, from STATUS, in English there: likely translated). A family of circle 3. Applied: FISH_PATH.md; (a)
  already in place (2026-11-14).
- **Backlog in priority order** (paraphrase): first everything that speeds up development, then the Visits page, the
  fish flash or lamp bias, the install nudge, the reports action bar, the #664 re-check. Applied: ROADMAP Backlog in
  priority order (Pierre, 2026-11-08) (#754).
- **Coral Finder crops out** (midday; paraphrase): the CF book switched off in the admin, the key boxes drawn, then the
  crops removed; book-derived texts checked against the PDF. Applied: ROADMAP Declined; rules/content.md (#738, #748).
- **Keep the integrator's context for integrating.** "it's a good idea to preserve your context as integrator and
  delegate what you can delegate" (Pierre, 2026-11-08, in the chat, translated in #711); then "yes, you can add it" to
  the wording. Bulk reading goes to subagents. Applied: INTEGRATOR.md (#711).
- **Publish without his prior validation.** "tu n'as pas besoin de ma validation avant de publier. On publie. Si tu
  penses que c'est pertinent, tu publies et moi je verrai à l'usage si c'est bon ou pas." (Pierre, 2026-11-08, #773).
  Sourced content lines ship; he corrects them in place. Applied: #773; AGENTS.md decided process (to add).
- **Retired achievements.** "Pour les succès retirés, on le retire au jeu, à tout le monde ... on est en mode bêta, les
  gens le savent." (Pierre, 2026-11-08, #734). A retired achievement is removed from every player. Applied: #734;
  spec/achievements.md (to add).
- **Rule L11's levels approved** (#735; paraphrase). Applied: rules/learning.md L11 (#738).
- **Security bots** (paraphrase): he turned on CodeQL, secret scanning and push protection; their alerts count like
  Codex findings. Applied: rules/ship.md; SECURITY.md (#738).
- **Use the quota with care, never at the cost of the result** (paraphrase). Applied: rules/ship.md W25 (#713).
- **Q209.** "for now we don't need the card… we keep the idea of a card with automatic detection, but not now" (Pierre,
  2026-11-08, Q209, #713). The same day he set Q208 aside ("we set it aside, I need more information"); Q208 was decided
  on 2026-11-09. Applied: #713, #721.
- **Q210.** STATUS: questions Q208 (set aside), Q210, Q212 and Q213 are added; the last number is now Q213.
  (paraphrase). Applied: #713, #721.
- **Q211, Q215, Q222-Q225.** (paraphrase) Answered together on 2026-11-08 ~09:00 within the STATUS block Questions
  Q209-Q228 answered (Q208 set aside), Decided 11-08; no words recorded; see #721. Applied: #721.
- **Q212.** "The reference level stays an estimate by an agent. Those reference photos judged clean but just below
  reference level stay out while a candidate judged the same would enter. No: we bring them in like candidates. And if
  you think they are of a good level, bring them directly into play." (Pierre, 2026-11-08, Q212, translated in #714).
  Applied: #731, #797, #802, #803, #781, rules/photos.md P1.
- **Q213.** Judging these candidates and the order (species with the fewest easy photos in play first): Pierre, Q213,
  2026-11-08. (paraphrase). Applied: #718, #719, #724, #717, #713.
- **Q214.** "What is in the circle are the families, so it includes every species of the family ... it's the family's
  circle. And if that's not the case today, it's a problem" (Pierre, 2026-11-08, Q214, translated in #727): every
  near-Dauin species of the game families comes in (an exhaustive search of every family in play). Applied: #727, #721.
- **Q216.** The families and their circles: Pierre, 2026-11-08 (Q216). Hawkfishes, Blennies, Eel-tailed Catfishes,
  Bigeyes, Tunas, Soles, Cornetfishes, Remoras, Needlefishes, Eagle Rays, Cat Sharks, Dottybacks, Convict Blennies and
  Triplefins in circle 3. Trumpetfishes, Shrimpfishes and Sweepers in circle 2 ("we see them regularly, even in the
  videos", as #727 translates it). Each book label is its own family ("if the book has its own label, it goes under its
  own label", same translation). (paraphrase) Applied: #727, #751, #721.
- **Q217.** Dartfishes on their own key label, circle 3: Pierre, 2026-11-08 (Q217). (paraphrase). Applied: #727, #721.
- **Q218.** Duplicates stay out: the same photo id once only (put); a second photo of an observation already in play
  waits until judged against that observation's photos (Pierre, 2026-11-08, Q218, #715). (paraphrase). Applied: #731,
  #796, #780, #1009, #715.
- **Q219.** each IMR genus opens when its family reaches Open Water (50%), with its first-meeting card (name, photo, IMR
  cues, slide), then follows the normal opening queue and pace. (paraphrase). Applied: #720, #975, #822, #1092, #721.
- **Q220.** (paraphrase) Of the Surgeonfish-versus-Unicornfish options, only Naso enters as a genus (Pierre,
  2026-11-08). On families: "au niveau de la famille, il faut accepter qu'un unicorn fish soit classé dans les poissons
  chirurgiens": a Naso photo asked at family level is right as Surgeonfishes. Applied: #720, #721.
- **Q221.** a photo of another genus of the family (Abudefduf, Chrysiptera, a non-Heniochus butterflyfish,
  Acanthurus...) keeps the family as its right answer. This is unchanged behaviour (ranks never mix: distractors,
  typeMatch); a test pins it. (paraphrase). Applied: #720, #721.
- **Q226.** Judging these candidates and the order (refill top-ups first, then species under target or with the fewest
  easy photos in play, circle 1 first): Pierre, Q213 and Q226, 2026-11-08. (paraphrase). Applied: #724, #715, #721.
- **Q227.** "il faut garder cette information de un jour il a cliqué sur je suis à IMR" (Pierre, 2026-11-08, Q227,
  #720): the IMR exception applies to anyone who ever answered I'm at IMR; imrSaid reads the start record's history
  (kept whole and merged as a union across devices). Applied: #720, #721,
  decisions/2026-11-18-decisions-from-app-comments.md.
- **No level-change proposal on the fish.** "on ne fasse pas les propositions de changement de niveau sur les poissons
  tant qu'on n'a pas mieux calibré" (Pierre, 2026-11-08, #720). The fallback cards are off for the fish. Applied: #720,
  #721.
- **Q228.** no automatic move back to imr in the code. The one player to set back is corrected in the sheet by the
  integrator; the code holds no per-player logic. (paraphrase). Applied: #720, #726, #733, #721, #1132.
- **Q229.** "si on prend juste la toute première ou une, on peut louper des très belles photos" (Pierre, 2026-11-08,
  Q229, #731; "if we take just the very first one, or one, we can miss very beautiful photos"): every photo of the taxon
  page, for every species. They are reference photos: judged like the others (judging/FISH.md, Reference photos).
  Applied: #731, #1070, #738.
- **Q231.** "on ne peut pas les recadrer" (Pierre, 2026-11-08, Q231, #731; "we cannot crop them"): no licence with no
  derivatives, nor all rights reserved, for fish (lic_ok, Pierre, 2026-11-03). Applied: #936, #731, #1070.
- **Q232.** "here, specifically in the Philippines, and notably at Malapascua, it's a shark we see on the reefs"
  (Pierre, 2026-11-08, Q232, translated in #727): the thresher sharks are attached to group 20. Applied: #727,
  rules/subjects.md S3.
- **Q233.** (paraphrase) The back card's wording is OK as written: kicker Scientific names, title Keep the scientific
  genus names?, and a body saying that scientific genus names now come later, once a family is at Advanced, that he can
  close them for now and that his progress on them is kept (Pierre, 2026-11-08, Q233, via the integrator). Applied:
  #720.
- **Q234.** (paraphrase) OK. The IMR genera ignore the Scientific names switch (Off, Not now and Close them turn off
  only the other genera). Applied: #720.
- **Q235.** (paraphrase) OK. Once Chromis is open, a Chromis photo in a family question is right as Damselfishes.
  Applied: #720.
- **Q236.** keep as built for now (the global fish score is being started separately). The IMR genera are not in the
  fish %; they show as genus tiles and count towards the genus achievements. (paraphrase). Applied: #720.
- **Q237.** "c'est essentiel. Et c'est vrai pour tout le jeu, partout." (Pierre, 2026-11-08, Q237, on typed answers,
  #728). A typed IMR common name (Anemonefish, Bannerfish, Unicornfish) does not answer a genus question, under the
  existing rule that a common name never advances a scientific name (app.js fishGenera names, FISH_PATH); kept as is.
  Applied: #720, #728, #778, #834, #833 (closed, not merged).
- **Q238.** yes. The IMR-families-first opening order (model.js openPick) now reads imrSaid (ever answered imr), as the
  genera do. (paraphrase). Applied: #720, #807.
- **Q239.** (paraphrase) OK. The slide on the IMR genus card: ID tips (IMR, Chromis, slide 8); Amphiprion gets Its
  species here (IMR, Anemonefish, slide 22). Applied: #720.
- **Q240.** yes. A player who turns scientific names on by hand (⚙ or My progress) while no family is at Advanced gets a
  family's genera from its Open Water. This is Q.sciH, set by bonusSet and synced with the choice (sync.js mergeSubject,
  the progress reset clears it). The offer and the back card never set it; the My progress toast names the level that
  applies. (paraphrase) Applied: #720, #975, #822, #1071, #1067.
- **Q241, Q243-Q245, Q269, Q272-Q279.** (paraphrase) Answered together on 2026-11-08 ~12:10 within the STATUS block
  Questions Q229-Q280 answered except Q230 (out-of-zone taxon photos, waits for numbers); no words recorded; see #735,
  #738 and #751. Applied: #735, #738, #751.
- **Q242.** Weights by commonness near Dauin, the square-root display, not the circle weights: Pierre, 2026-11-08, Q242.
  (paraphrase). Applied: #730, #975, #1067, #735, #1041.
- **Q246.** (paraphrase) Rule S3's new sentence, OK as written (a label the book does not print is added to a group only
  by Pierre's decision, its note saying so: the thresher sharks in Sharks & Rays, Q232): Pierre, 2026-11-08 (Q246).
  Applied: #727.
- **Q247.** "elles ne participeront pas à la branche nom commun" (Pierre, 2026-11-08, Q247, #730): a species no
  reference names has none and no common-name unit. Applied: #778, #730, #727, #975, #828.
- **Q248.** "we'll do as in the book. We make a single soapfish family ... with the reminder ... with the groupers for
  the IMR course" (Pierre, 2026-11-08, Q248, translated in #727). Their circle is the family's (Q214). Applied: #727.
- **Q249.** "we can do it silently, unless you tell me it raises a real problem" (Pierre, 2026-11-08, Q249, translated
  in #727): no announcement card, and the new families count normally (the Codex D6 finding). The one real effect: until
  the judging pass puts their photos in play, the new families count in the progress % but cannot be asked. Applied:
  #727.
- **Q250.** "OK pour les textes" (Pierre, 2026-11-08, Q250, #728): the two nudge texts. Applied: #728.
- **Q251.** "OK pour rajouter une nouvelle colonne" (Pierre, 2026-11-08, Q251, #728): the new Answers column Rejected
  tries (column X, after Scoring). Applied: #728.
- **Q252.** "0.1" (Pierre, 2026-11-08, Q252, as #729 quotes it; the question was whether 1% is a good compromise for
  still getting never-rated photos rated, since the risk was that unrated photos never came for being thought too
  hard): `RARE.SHARE` = 0.1, so that before a unit reaches Open Water the photos under ease 4 weigh at most
  about 1 in 10 of the draw (the rule of 2026-11-06 14:17 above, now with its number). #1093 applies it to the window:
  before Open Water and for variants not released, the window keeps a full-weight colony rather than force a held-back
  one (the integrator's call, following that rule and the variants' ramp, Q391 a). Applied: #729, #735, #1093.
- **Q253.** Silent: "pour l'instant on le passe en silencieux" (Pierre, 2026-11-08, #730, on how current players learn
  of the new fish score). The ? text on My progress explains the score. Applied: #730.
- **Q254.** the circle-1 Entries component at 55%, OK. (paraphrase). Applied: #730, #1067.
- **Q255.** keep fpct25 / fpct50 as built for now. Pierre wants the whole fish achievement set redesigned around the
  global score: a separate proposal is being prepared, not in this PR. (paraphrase). Applied: #730, #734.
- **Q256.** (paraphrase) The component names Families, Common names and Scientific names, and the new ? text: OK.
  Applied: #730.
- **Q257.** weighted means with the genus half-credit in Scientific names, OK, on Pierre's condition: a player who plays
  genera and never species cannot pass a set level. The formula guarantees it (S = max(own, ½ × genus)) and
  tests/treescore.test.js proves it: genera alone keep Scientific names at 50% or less and the global % at or below the
  "families + every genus" anchor (74%), on any bars. (paraphrase) Applied: #730, #975, #1067.
- **Q258.** credit = S, OK. (paraphrase). Applied: #730, #1041.
- **Q259.** the 10-point ladder; retire fpct25. (paraphrase). Applied: #734, #975,
  decisions/2026-11-18-seaslug-achievements-high.md.
- **Q260.** "Si les succès sont plus bons, on les retire et on les remplace." (Pierre, 2026-11-08, Q260, #734): no
  silent keep. Applied: #734, #975.
- **Q261.** (paraphrase) Dauin's top 20 = circle-1 species for now, another top with circle 3 later; the frequency-based
  achievements (the X most frequent fish, the X least frequent at Dauin) go in the species-level design (Pierre,
  2026-11-08, Q261). Applied: #734, #975.
- **Q262.** a species is named in Latin once its scientific name's bar reaches Advanced, the counter's definition too.
  (paraphrase). Applied: #734, #1041, #975.
- **Q263.** "33 is fine" (Pierre, 2026-11-08, Q263, #734): the proposal of 33 achievements, with its ids and conditions.
  Applied: #734, #975.
- **Q264.** "le retrait il est fait en silence." (Pierre, 2026-11-08, Q264, #734): the removal is silent. Applied: #734,
  #975.
- **Q265.** (paraphrase) Next (short term): activity outside the quiz (the read-only study's findings: visits logged
  since sheet v30 (#423), signed in or not; the admin's Not signed in list counts only answers; next steps B, C1, C2,
  later C3, D); fish progress replayed. Applied: #751.
- **Q266-Q268.** (paraphrase) The LICENSE text, the README outline and the Content and rights draft (Pierre, 2026-11-08,
  Q266, Q267, Q268). Applied: #737.
- **Q270.** "à qualité égale" (Pierre, 2026-11-08, Q270, #742): licence is the last tie-break between equal photos
  (candidate fetching and refill, the auto-sort's ranking of equals, the default cover and featured photos); prefer CC0
  / CC BY and his own photos over CC BY-NC, but "je ne veux pas qu'on se prive des photos CC BY-NC, qui restent
  pleinement utilisables". Applied: #742, #864, #795, rules/photos.md P1.
- **Q271.** "le plafond pour les familles seulement ... c'est là que le débutant a besoin de photos faciles" (Pierre,
  2026-11-08, Q271, #729): the cap applies to the units of the subject's own rank (the fish families); genera are drawn
  as before. Applied: #729.
- **Q280.** STATUS rewritten at midday 2026-11-08: what merged since 09:00, the merge queue with the sheet version each
  PR takes, what is being built, Pierre's hands; last question Q280. (paraphrase). Applied: #738.
- **Q281.** "c'est une correction statistique. Ok, ça marche" (Pierre's OK, 2026-11-08, #735): the error split over the
  progressive looks (Bonferroni: each look at 1 − 0.10/k, two looks 95%), added after a Codex finding. Applied: #735.
- **Q282.** "je suis d'accord avec ce texte pour l'instant" (Pierre's OK, 2026-11-08, #737), with a note that it reads
  as if we were justifying our rights and must evolve soon (a ROADMAP item, in #738). The About and credits, Photos
  wording. Applied: #737.
- **Q283.** (paraphrase) The rule's wording (P1 bullet, Licence the last tie-break): OK as written; only its closing
  parenthesis was updated, to follow Q284 (Pierre, 2026-11-08, Q283). Applied: #742, #864, rules/photos.md P1.
- **Q284.** "je ne veux pas que ça soit au coût de la variété, surtout dans un premier temps. Je préférerais qu'on ait
  plus de variété et qu'on mette moins de poids sur les licences dans un premier temps, quitte à refaire un départage
  plus tard." (Pierre, 2026-11-08, Q284, #742): the fish fetch takes the licence last, after the distance and the
  variety. Applied: #742, #864, rules/photos.md P1.
- **Q285.** "on met dans la roadmap et on laisse toutes les options ouvertes" (Pierre, 2026-11-08, Q285, #746): the
  algorithm options stay in the ROADMAP, all open. Applied: #746.
- **Q286, Q287.** Pierre, 2026-11-08 (#746): the fish Analyses join the short-term fish-admin-at-parity item (Q286);
  slow as a primary effect is right: "Oui, c'est bien" (Q287). Applied: #746.
- **Q288.** "je valide les réécritures [...] je suis ta recommandation de garder les libellés reformulés." (Pierre,
  2026-11-08, Q288, #744): the new wording of the 67 texts and the three reworded Coral ID Key box labels. Applied:
  #744, #751.
- **Q289.** « les couvertures que j'ai choisies [...] ce sont soit ce qu'on mettrait en niveau 5, soit en niveau 4. Donc
  si ce n'est pas le cas, c'est qu'il y a un problème en termes de jugement. Parce que je considère qu'elles sont toutes
  hyper visibles et du niveau d'une référence. » (Pierre, 2026-11-08, Q289, #739): the first-meeting card shows his ★
  Cover too, even where it is not what the automatic choice would take (12 of his 28 picks are below reference level in
  a family that has a reference-level photo). Applied: #739, #1128, #751,
  decisions/2026-11-18-decisions-from-comments-tests-2.md.
- **Q290.** « On peut utiliser ma couverture pour la carte. » (Pierre, 2026-11-08, Q290, #739; "we can use my cover for
  the card"), of the Thresher sharks' surprise card: a wink's card shows its unit's ★ Cover when he picked one, written
  without naming a unit (rule L6). Applied: #739, #955, #1128, #751,
  decisions/2026-11-18-decisions-from-app-comments.md, decisions/2026-11-18-decisions-from-comments-tests-2.md.
- **Q291.** The photo choice: unchanged, tilePhoto (Pierre, 2026-11-08, Q291). (paraphrase). Applied: #770, #909, #739,
  #1128, #751, decisions/2026-11-18-decisions-from-comments-tests-2.md.
- **Q292.** "Si le livre dit autrement, on peut changer [...] On peut suivre la taille dite par le livre." (Pierre,
  2026-11-08, Q292, #744): Cycloseris 3-8 cm, as on its page. Applied: #744, #751.
- **Q293.** "c'est chouette d'avoir des dessins pour toutes les clés [...] deux choix de style, ok [...] pour l'instant,
  je valide les dessins" (Pierre, 2026-11-08, Q293, #747): the 21 box drawings and the two style choices (1 cm bar on
  every close-up, the criterion's part highlighted). Applied: #747, #751.
- **Q294.** "Ok pour la nouvelle formulation de la règle P3 [...] La règle P1, oui, ça me va aussi. La règle P5, oui, ça
  me va aussi" (Pierre, 2026-11-08, Q294, #748): the rules' new wording (the P3, P1 and P5 book clauses). Applied: #748,
  #1086, #751.
- **Q295.** "on peut corriger le texte" (Pierre, 2026-11-08, Q295, #767): reword the device-id sentence. Applied: #767,
  #752, #751.
- **Q296.** "on peut l'ajouter à la page de confidentialité" (Pierre, 2026-11-08, Q296, #767): describe the load event
  on the privacy page. Applied: #767, #752, #751.
- **Q297.** "les questions que tu dois me poser numérotées, c'est des questions dont les réponses sont ensuite
  enregistrées, sur lesquelles on peut revenir pour montrer comment on est arrivé à tel point" (Pierre, 2026-11-08, on
  Q297, #752): a numbered question is only a real development choice whose answer is recorded and changes what gets
  built; never one that anticipates his ROADMAP order (INTEGRATOR, Questions). Applied: #752, #751.
- **Q298, Q310.** (paraphrase) Fish progress replayed from the answer log, today's bar a floor: Pierre, 2026-11-08
  (Q298, Q310; ROADMAP row of that name); #812 makes the decided behaviour work, nothing new. Applied: #812, #779, #776,
  #752, #751, #810, #804.
- **Q299.** STATUS: Q298, measure the gap in the admin on real players first. Q299, the 9 names OK. Q123 and Q124, ask
  again. Q208 set aside again. Q121 is not yet a go: he asked whether it needs him and how long the app is down.
  (paraphrase). Applied: #752, #751.
- **Q301, Q304.** (paraphrase) Practice only (Q302), Without a game by default (Q303), the Tablet class (Q304), one page
  (Q301): Pierre, 2026-11-08, unchanged in #836. Applied: #836, #777, #1132, #754, #804.
- **Q302.** (paraphrase) What counts as a game: Practice pages only (quiz, custom, duels, Memory); Lab visits count as
  without a game: Pierre, 2026-11-08, Q302. Applied: #777, #836, #754, #804.
- **Q303.** (paraphrase) The default filter is Without a game: Pierre, 2026-11-08, Q303. Applied: #777, #836, #754,
  #804.
- **Q306.** #753's look OK; the one-tap flip chip under 380 px signed out OK. (paraphrase). Applied: #754, #753, #804.
- **Q307.** None (Pierre's OK, 2026-11-08 ~16:05 Manila, Q306 and Q307, below). (paraphrase). Applied: #753, #754, #804.
- **Q308.** Rubric 6 (Pierre, 2026-11-08, Q308) for the light tag. (paraphrase). Applied: #780, #781, #759, #796, #797.
- **Q311.** "judge and merge tonight; judged photos enter the game under today's rules" (Pierre, 2026-11-08, Q311,
  #803): judge the new families' next species with their candidates and reference photos, and put the sure ones in play;
  decided process (AGENTS.md merge contract). Applied: #797, #802, #803, #781, #796.
- **Q312.** "Oui, cette nuit" (Pierre, 2026-11-08, Q312, #774): every answer row now says which device sent it, so the
  admin's analyses and the coming Visits page can tell a player's devices apart (not used by any reader in this PR).
  Applied: #774, #804.
- **Q313.** "Publie, je corrige à l'usage" (Pierre, 2026-11-08, Q313, #778): publish without his prior check. Applied:
  #778, #834, #954, #828, #892.

## 2026-11-09

- **14:05, Q325.** (paraphrase) The choices listed in the PRs' Choices-I-made sections until now, each as recommended:
  Pierre, 2026-11-09 14:05 Manila (Q325). Applied: #826, #845.
- **14:05, Q328.** The 🌱 emoji in Pierre's own name, no other player able to use it, instead of a drawn badge: Pierre,
  2026-11-09 14:05 Manila (Q328). (paraphrase). Applied: #835, #841, #845.
- **14:35, Q326.** (paraphrase) The choices listed in the PRs' Choices-I-made sections until now, each as recommended:
  Pierre, 2026-11-09 14:35 Manila (Q326). Applied: #829, #830, #831, #832, #845.
- **14:35, Q327.** (paraphrase) The choices listed in the PRs' Choices-I-made sections until now, each as recommended:
  Pierre, 2026-11-09 14:35 Manila (Q327). Applied: #836, #845.
- **14:45, Q329.** (paraphrase) The choices listed in the PRs' Choices-I-made sections until now, each as recommended:
  Pierre, 2026-11-09 14:45 Manila (Q329). Applied: #837, #842, #845.
- **14:45, Q330.** (paraphrase) With Q332, on #840 (trust the log): no exception, no floor, no card. Applied: #840;
  rules/sheet.md D9.
- **15:40, Q332.** (paraphrase) The learned-mark card is silent too (Pierre, 2026-11-09 ~15:40 Manila, Q332). Applied:
  #840, #953, #845, rules/sheet.md D6.
- **16:10, Q334.** The split: Pierre, 2026-11-09 ~16:10 Manila (Q334: split). Merge the keys and the page titles; move
  Sign out sealing to Parked, on claude/admin-signout-seal. ROADMAP has its Parked row, and the branch has a design
  note. (paraphrase). Applied: #798, #1078, #845.
- **16:25, Q335.** Close #808 without merging, keep what can be merged and the conclusions: Pierre, 2026-11-09 ~16:25
  Manila (Q335: close #808, keep the conclusions). (paraphrase). Applied: #844, #845.
- **16:50, Q336.** Rule P3's new wording (k out, o may play): Pierre, 2026-11-09 ~16:50 Manila (Q336). (paraphrase).
  Applied: #839, #846, #845.
- **PRs on main, one topic at a time.** "on fait des PR sur main" (Pierre, 2026-11-09, rule W27, as INTEGRATOR.md quotes
  it); close the open PRs one by one before a new topic. Applied: rules/ship.md W27 (#843, #845).
- **Rule 0, read right** (paraphrase): from 16:30 open nothing new; questions that close a topic under way are fine
  until 17:30. Applied: AGENTS.md Rule 0 (#845). Changed by 2026-11-15 (one sentence).
- **Q136.** reopened for rework on the current multi-level engine: check whether the per-genus player ability can be
  assumed centred on zero across players on our data (literature warning), more literature if needed; folded with Q316's
  work. (paraphrase). Applied: #806, #637 (closed, not merged), #789, #804, #646.
- **Q208.** (paraphrase) Decided by Pierre on 2026-11-09 (option A, families met first): once a player has accepted the
  Scientific names offer, no new scientific-genus card opens while a family in play is still not met. (On 2026-11-08 he
  had set it aside.) Applied: #822, #713, #1067, #752, #751.
- **Q309.** The same tools on a reported photo as on its page: Pierre, 2026-11-09 (quoted above); Q309, 2026-11-08 (one
  action bar for every report). (paraphrase). Applied: #823, #785, #934, #1132, #804.
- **Q314.** Codex's limit lifted with credits. (paraphrase). Applied: #806, #804.
- **Q315.** option (2), a time intensity per photo in the prior part of photoDiff (fades as the photo's own answers come
  in); option (1) only as the declared comparison, never stacked; two variants tested, time intensity from all answers
  vs right answers only (with rapid-guess cut-offs), the one that predicts better kept (declared before); option (3),
  enlarging, waits for data; keep logging the time. Validation: L11 level 2 (real-log replay primary, players as the
  unit; corals primary, fish exploratory). (paraphrase, Pierre 2026-11-09, as #806 records it) Applied: #806, #808
  (closed, not merged), #844, #804, #1150.
- **Q316.** a componential difficulty model as an evolution of the current Elo engine: one difficulty per question =
  rank offset + family + genus + species + photo components, each shrunk toward its parent while it has few answers; the
  online update splits the surprise among the components by their uncertainty (a TrueSkill / simplified Kalman rule);
  with only genus + photo it must reproduce today's v31 ratings within rounding; the genus and species parts count also
  at family rank (his "yes"); order: an offline fit first (read-only), then the sheet, then the app; validated by L11.
  The same day Q136 was reopened on this engine: check whether the per-genus player ability can be assumed centred on
  zero across players on our data. (paraphrase, Pierre 2026-11-09, as #806 records it) Applied: #806, #809, #1165.
- **Q317.** keep #790's conservative prior for fish; later a memory model = a lasting per-outcome value + a boost
  decaying with the time since the photo was last shown, decay shape fixed from the literature, one fitted weight;
  L11/L12 validation steps (the read-only table first). It adds a photo-memory exception to rule L1. (paraphrase,
  Pierre 2026-11-09, as #806 records it) Applied: #806, #944, rules/learning.md L1.
- **Q318.** Pierre chose Q318 (a) on 2026-11-09: re-measure option (1) with z net of the player's right-answer speed.
  The real-log replay with z against the median of the player's own earlier right answers keeps a clear gain on corals:
  −1.03 × 10⁻³ per answer [−1.71, −0.34], 10 of 14 players better, p 0.0015, k 1.5 the commonest choice (the curve flat
  from 1 to 3); fish showed nothing clear. (paraphrase; the figures are the replay's, from the LEARNING notebook)
  Applied: #808 (closed, not merged), #845.
- **Q319.** (paraphrase) A name two game species share is dropped from the one that does not own it; a PDF name shared
  stays. This replaces Q319's earlier rule that a typed name is right whenever the photo's family is among the owners:
  Pierre, 2026-11-09 ~15:45 Manila (Q331 texts OK; Q333 strict). Applied: #834, #954, #833 (closed, not merged), #969,
  #1037.
- **Q320.** (paraphrase) dart stays the Dartfishes' own short form, so a jack's Smallspotted dart typed is not a Jacks
  answer: the rule as it stands (the short forms of Pierre's 2026-11-06 rule). Only one species carries it, below Q320's
  threshold. Integrator's call. Applied: #833 (closed, not merged), #834, #845.
- **Q321.** Find the X first, then Matrix; the photo pipeline first (this PR): Pierre, 2026-11-09, Q321 D1, and the
  order he set. (paraphrase). Applied: #826, #885, #875, #877, #878.
- **Q322.** the answer log is the only reference for progress. (paraphrase). Applied: #840, #1054, #846, #845,
  rules/sheet.md D9.
- **Q323.** The split, both routes on one rule, legacy m as confusion-possible until sorted, the re-judge by eye, the
  classification in the agent-writable judging files, the doubtful ones as Points: Pierre, 2026-11-09, Q323 (the
  integrator's brief). (paraphrase). Applied: #839, #1132, #845, rules/photos.md P3.
- **Q324.** The knowledge-gap term (−0.22) in the simulated times: Pierre, 2026-11-09 (Q324 (b)). (paraphrase). Applied:
  #844, #808 (closed, not merged), #845.
- **Q331, Q333.** (paraphrase) None. The feedback wording in #834 was OK'd by Pierre (Q331, 2026-11-09 ~15:45 Manila),
  plus the not-this-one form his Q333 example gives. Applied: #834, #845.

## 2026-11-12

- **17:19, Q338.** "option b, B10 au-dessus d'un niveau Elo" (Pierre, 2026-11-12, Q338 (b), #855); "le niveau Elo n'est
  pas stable avant un paquet de réponses" (hence the floor). Applied: #855, #852, #857, #856, #853.
- **Auto mode kept** (paraphrase); `.claude/settings.json` allows resolving review threads. Applied: INTEGRATOR.md
  (#854, #856).
- **Cards and EventMeasure** (paraphrase): the custom quiz reminder and the every-family-met card's wording (#850,
  #851); EventMeasure shown to IMR players only (#854). Applied: spec/cards.md (#856).
- **Never ask the order of work.** "pourquoi tu me demandes mon avis pour un ordre alors que tu peux tout lancer en
  parallèle ?" (Pierre, 2026-11-12, as INTEGRATOR.md records it). Independent work runs in parallel. Applied: AGENTS.md
  Working mode; INTEGRATOR.md (#856).
- **No GitHub chores for him.** "c'est quoi ce micromanagement forcé ?" (Pierre, 2026-11-12, as INTEGRATOR.md records
  it). Resolving threads, labels and branch updates are the integrator's. Applied: INTEGRATOR.md Habits (#856).
- **Q337.** "Q337, moi je pense qu'on va la supprimer. Donc option A." (Pierre, 2026-11-12, Q337 (a), #852): removing
  the offer card, keeping Open all, keeping the back card and reading old records. Applied: #852, #995.

## 2026-11-13

- **Q340.** (paraphrase) The Tree tab: any depth, two views (Key, WoRMS), groups as tags. Applied: ROADMAP The Tree tab;
  spec/admin-tree.md (#859).
- **Covers subject-neutral.** Pierre, 2026-11-13, said it must work for "coraux, nudibranches ou plantes" (#906): genus
  and species covers by ids and ranks, for any subject. Applied: rules/subjects.md; spec/admin-tree.md (#859).
- **Q339.** "Il faudra rendre générique la localisation centrale de l'instance, si jamais on propose d'autres instances
  à d'autres organisations plus tard." (Pierre, #864). Default cover on a node with no pick: the rule of Q339 (b)
  (Pierre, 2026-11-13), as on the Key's nodes. Applied: #887, #864, #870, #859, #880, rules/photos.md P1.
- **Q341.** (paraphrase) The overlay itself, its place in curation.json and its base shape {field: {v, src, was}}:
  Pierre, 2026-11-13, Q341 (a) (ROADMAP, The Tree tab). Applied: #903, #945, #859, #918, #921.
- **Q342, Q346.** (paraphrase) Content editor and platform admin rights; A1 reworded to the instance's content right;
  Q348 the relay; Q349 the pilot sign-in (ROADMAP, Roles, instances and cohorts). Applied: #945, #981, #859, #903,
  #1098.
- **Q343, Q348, Q349.** (paraphrase) Q343: one shared sheet now, one per organisation in the medium term (reopened by a
  second organisation). Q348: content editors (Curators) publish through a relay in the sheet script (reopened by
  editors outside IMR or a content repository). Q349: sign-in stays name + 4-digit code during the pilot (a stronger
  sign-in is the roles row's later step; confirmed by Q423, 2026-11-19). As `docs/reviews/2026-11-14-professionalise-study.md`
  §6 records them. Applied: #886, #859, #945, #981, #1098.
- **Q344.** The roles plan makes this sharper: trainers will see each answer of their cohort (Q344). (paraphrase).
  Applied: #859, #981, #1098.
- **Q345.** Cohorts for now = named groups the admin makes on Players, in the existing Groups tab, marked by a name
  prefix (cohort:); free-text display name chosen at creation; to be replaced by roles step 2's cohorts (Q345); the
  board depends only on membership. (paraphrase). Applied: #1050, #859, #981, #1098.
- **Q347.** Images or questions a trainer writes themself: the page builds questions from the database only. A trainer's
  own content would be content the instance owns (Q347) and goes through the editors' relay (Q348). (paraphrase).
  Applied: #859, #903, #981, #1098.

## 2026-11-14

- **16:48, Q355.** "ok pour B" (Pierre, 2026-11-14 16:48, Q355, #871): variant B for every subject, for the corals'
  start-of-path cost. After B' (the fish as first built) was shown, see Q356 (2026-11-15). Applied: #871, #872, #881.
- **Fill the agent slots.** "Tu ne te limites pas. Tu lances tout ce que tu peux lancer, en respectant le nombre d'agent
  en parallèle" (Pierre, 2026-11-14, #872). Four agents at a time, balanced by weight. Applied: rules/ship.md W27 (#862,
  #872).
- **Light and cover proposals as admin views** (paraphrase): the 152 light proposals (a) an admin view; PFMT already
  fixed (#809); *N. argenteus* corrected. Applied: spec/admin-photos.md (#862, #872).
- **Ship what is easy to correct.** "Tu pushe la mise en page. Au pire je corrigerais après. Il faut que tu pushes tout
  ce qui est facile à corriger à posteriori" and "ça c'est du micro management… je ne devrais pas à choisir" (Pierre,
  2026-11-14, #872). Applied: AGENTS.md Working mode (#872).
- **Q123.** (paraphrase) Option j first (pooled stats built incrementally, per subject): Pierre, 2026-11-14. Applied:
  #940, #882, #971, #1013, #1024, decisions/2026-11-18-decisions-from-comments-3.md.
- **Q124.** "Je suis tes recommandations pour tout" (Pierre, 2026-11-14, answering Q124, #901). The study's (d): sourced
  root meanings on the genus sheets, the transparent ones first. ROADMAP, Name roots, named the fish genera as next,
  with The ETYFish Project as the likely source. Applied: #901, #891, #873, #862, #752,
  decisions/2026-11-18-decisions-from-app-comments.md.
- **Q230.** "ok" to building nothing for now (Pierre, 2026-11-14): Q230 moves to Declined in the ROADMAP; rows deleted
  or re-statused by ROADMAP's own rule (a shipped row is deleted). Applied: #1104, #872, #862, #731, #866.
- **Q350.** "oui à tout" (Pierre, 2026-11-14, Q350, every choice a-j, #871); f changed: "je pense qu'il faut quand même
  forcer les paires déclarées. Si elles sont déclarées par des enseignants, c'est qu'il y a un intérêt à les voir
  ensemble, même s'ils sont faciles à distinguer". The ROADMAP row records it as: a declared pair always stays grouped,
  the data never remove it, and a declared pair split by the cap still pulls its partner next. Applied: #871, #862.
- **Q351.** (paraphrase) An uncertainty model (Glicko / Kalman-like) measured on the log first (#651's choices, decided
  by Pierre on 2026-11-14); the study docs/reviews/2026-11-14-q351-step2.md replays the real coral answer log under
  today's rules and under three uncertainty arms. Applied: #883, #862, #904, #1165.
- **Q352.** "ok" to D1 on a measured threshold (Pierre, 2026-11-14, Q352): the measurement itself, the storage study's
  step 1. Applied: #867, #886, #872.
- **Q353.** (paraphrase) The study, its scope and its constraints: the ROADMAP row Professionalise the platform (Pierre,
  2026-11-08), Q352 and Q353 (Pierre, 2026-11-14). Applied: #886, #945, #872.
- **Q354.** Q354 (a sourced check of three IMR fish species; Pierre's answer 2026-11-14). (paraphrase). Applied: #869,
  #959, #875, #872, #1132.

## 2026-11-15

- **16:08, Q377.** "oui à tout" (Pierre, 2026-11-15, Q377, #990): circle 1 has 45 species (circle 2 the next 60 by
  commonness, circle 3 the next 100); photo target start 6, game cap 12, 20 candidates per species, +5 where a
  different-looking juvenile is documented, 30 at most. Applied: #973, #1048, #985, #990, #950.
- **16:18, Q378.** "Celle là" (Pierre, 2026-11-15 16:18, Q378, #951), on option D (deliver, then measure again when
  players come back after several weeks): ship as built, measure again once players come back after weeks. Applied:
  #951, #967.
- **Q368.** (paraphrase) The engine unchanged; Q351's step 2 and the refit measured again at about 20 players (no game
  change now). Applied: STATUS (#949); ROADMAP The expectation's slope (to update).
- **Not now.** "trop compliquée pour l'instant" (Pierre, in STATUS, 2026-11-15, on the domain; the name not found yet);
  also not now: the accounts, the IMR agreement, a second person (STATUS brief points 1, 2, 6, 8). Applied: ROADMAP
  Domain and repository rename, Professionalise the platform (to update) (#941, #949).
- **Rule 0 in one sentence.** "ok pour cette phrase" (Pierre, 2026-11-15 16:25, #965): after 17:30 Manila the integrator
  asks him nothing. Applied: AGENTS.md Rule 0 (#965, #967).
- **Spanish dancer.** "No, those are the egg ribbons. Search online." (Pierre, 2026-11-15 16:49 Manila, translated, as
  docs/reviews/2026-11-15-seaslug-sources.md records it), answering the observation that *H. lacer* has the most
  "juvenile" annotations (43), so the Spanish dancer probably has a different juvenile form. The remark is about those
  annotations and a request to investigate, not a claim about juvenile animals: the investigation (§1.2) found that all
  of the 43 juvenile-annotated observations show the animal itself (small Spanish dancers in their juvenile colours),
  none an egg ribbon or an egg mass; the egg ribbons sit in the photo supply, annotated "Egg", not "Juvenile" (§1.3).
  The decision it led to (§1.4, Pierre, 2026-11-15): egg ribbons and egg masses are never candidate photos
  (`tools/seaslug_source.json` `photos.exclude`); genuine juvenile photos are not excluded. The same day he asked for
  online reference sources on nudibranchs, for facts and for photos (same document, §2). Applied: the sea slug
  photos (#967), docs/reviews/2026-11-15-seaslug-sources.md.
- **Q356.** "j'aurais préféré qu'on fasse la même chose pour les poissons et les coraux ... quelque chose qui soit
  cohérent entre tous les modes de jeu" (Pierre, 2026-11-15, #871, after B' was shown): variant B for every subject; the
  B' commit is reverted. Applied: #941.
- **Q357.** (paraphrase) Pierre, 2026-11-15, accepted the design: numbers over all the data, stored, never simplified
  (the per-player state kept in the Stats tab, as in #882). Applied: #971, #941.
- **Q358.** "Oui il doit y avoir un seul jugement par photo. Mes jugements jusqu'ici n'étaient pas forcément basés sur
  toutes les photos qu'on a en jeu donc n'hésite pas à les remettre en question et à faire de meilleures propositions.
  Donc refait un seul jugement." (Pierre, 2026-11-15, #942; "Yes, there must be a single judgement per photo. My
  judgements so far were not necessarily based on all the photos we have in play, so don't hesitate to question them and
  make better proposals. So, redo a single judgement."): one judgement per photo, re-judged by an agent; he accepted the
  integrator's recommendation (C). Applied: #941, #942.
- **Q359.** (Pierre, 2026-11-15; translated, his words in quotes in docs/reviews/2026-11-14-sheet-overlay-design.md;
  #977, #988) Circles and look-alike pairs are per-instance content, set by the organisation's content editor. Circles:
  "Circles will necessarily be per instance … defined according to what IMR decided … it's the person in the
  organisation responsible for the content." Look-alike pairs, likely yes: "It will depend on how people teach them."
  Applied: #977, #945, #983, #988, #952.
- **Q360.** #925: credit the lecture photos now (#939), no request to Corals of the World yet; permission or
  replacements (STATUS; paraphrase except quoted words). Applied: #941.
- **Q361.** (paraphrase) Licence refresh: weekly for the other photographers only, since he does not change his own
  photos every week (STATUS, 2026-11-15). Applied: #941.
- **Q362.** one progress unit per species. Key s:s091, as #963 sized the tree for. (paraphrase). Applied: #975, #963,
  #954, #947, #983.
- **Q363.** when a content editor changes circles or pairs, everyone's progress is recalculated from the answer log,
  silently (rules D5, D6, D8, D9). Built as the stamp replay, with no card. (paraphrase). Applied: #977, #957, #988,
  #983, #952.
- **Q364.** (paraphrase) Option B of the sheet overlay note's question (j): rights are separate in theory; the platform
  admin may grant himself a role, and the grant is logged (Pierre, 2026-11-15). Recorded at (j) and in the ROADMAP row,
  since neither held it yet. Applied: #981, #957, #1049, #952, #1098.
- **Q365.** (paraphrase) Option A of the note's question (k): the pilot sign-in (a name and a 4-digit code) is enough
  for now (Pierre, 2026-11-15). Recorded at (k) and in the ROADMAP row. Applied: #981, #957, #952, #1098, #949.
- **Q366.** the stored format of the note's section 6 is OK: (paraphrase). Applied: #977, #952, #988, #957, #986.
- **Q367.** "ok pour A" (Pierre, 2026-11-15, Q367, #951): the tolerance on the comeback's sum (0.1 an answer) added to
  the opening hold, the rest of the comeback kept; points (b), (c) and (f) stay unchanged and are re-measured. Applied:
  #951, #1165, #949.
- **Q369.** sea slugs are one subject; its area is the whole Philippines; scientific names only. → circle-1 species from
  tools/seaslugs.json, the Philippines as the first source, records carry the scientific name. (paraphrase). Applied:
  #973, #950, #987, #1035, #1019.
- **Q370.** AVIF parked. (STATUS; paraphrase except quoted words). Applied: #949.
- **Q371.** "ok pour A" (Pierre, 2026-11-15, Q371, #958): log the photo tapped, and through it its species, for every
  Find the X answer; the sheet field that #885 raised for FISH_PATH's species-to-family view. Applied: #958, #949.
- **Q372.** (paraphrase) The two surprise-only sharks keep 5 photos in the game data too (Pierre, 2026-11-15; STATUS).
  Before that, Pierre, 2026-11-08 (ROADMAP, Surprise-only species): "4-5 really good reference photos". Applied: #955,
  #949, decisions/2026-11-18-decisions-from-comments-tools-tests.md.
- **Q373.** (paraphrase) A watermark tag for fish photos; Home skips them, the games unchanged (Pierre, 2026-11-15;
  STATUS). Applied: #972, #956, #961, #993, #974.
- **Q374.** no covers above coral genera for now. (STATUS; paraphrase except quoted words). Applied: #949.
- **Q375.** the tree in chunks. Species open only once the sheet reports TREE_SHEET (treeOn()), and stay out of
  fishScoreTree below it. (paraphrase). Applied: #975, #963, #967.
- **Q376.** (paraphrase; the options' wording is as #954 and #975 record it) Pierre, 2026-11-15, on the common-name
  sources study (docs/reviews/2026-11-15-common-name-sources-study.md), which found that no reference ranks names by
  usage. (a) B: the main name is iNaturalist's default English name (FishBase's main English name where iNaturalist has
  none), shown first to every player except a player at IMR (who answered "I'm at IMR"), who sees the IMR name first;
  both are always listed and accepted. (b) A: the main name fills the species' one progress unit (Q362), and any other
  listed name is accepted and credits the same unit (this replaces "needs all its listed names"). (c) yes: regional
  standard names (the Australian AS 5300 / Fishes of Australia ones, e.g. "Swallowtail puller", "Headband humbug") are
  accepted when typed and never shown first (FISH_PATH now says never shown). (d) a genus with no reference name gets a name inferred from its species'
  names, flagged as inferred (as already done for Tobies and Rabbitfishes), while Centropyge, Dendrochirus and Dascyllus
  take the names iNaturalist or FishBase give them. #954's departure from (a) for a main name that is another species'
  IMR name was replaced by Q381 (2026-11-15: two species may share a name). Applied: docs/FISH_PATH.md Common names,
  #975, #954, #969, #1165, #967.
- **Q379.** "Perhaps we should also avoid them for covers" (Pierre, 2026-11-15, on his watermarked ★ covers, #993). This
  is why the default card photo moves for 3 families, and why his ★ Scorpionfishes cover gets the Keep / Choose another
  question in the admin. Applied: #993, #972, #968, #1132, #967.
- **Q380.** pCloud by upload link (STATUS; paraphrase except quoted words). Applied: #967.
- **Q381.** "the base name is the right one for everyone outside IMR" (Pierre, 2026-11-15, as
  docs/decisions/2026-11-18-decisions-from-comments-tests-2.md records it): shared names allowed. A multiple-choice
  question never shows two choices with the same label, and a typed shared name credits the asked species. Applied:
  #975, #1037, #969, #1128, #967, decisions/2026-11-18-decisions-from-comments-tests-2.md.

## 2026-11-16

- **15:05, Q382.** "Alors, question 382, je ne suis pas forcément d'accord pour qu'il y en ait une à la fois. Par
  contre, je suis plus ouvert à l'idée de limiter le nombre le pourcentage de questions tant que les autres niveaux, on
  va dire, ne sont pas maîtrisés." (Pierre, 2026-11-16 ~15:05 Manila, #975). The integrator's reading, confirmed to
  Pierre in the chat: one rule for every rank step; a finer rank may open, but its share of the questions is set by the
  mastery of the rank(s) above it. Applied: #975, #1033, #1067, #1041, #1025.
- **15:10, Q383.** "Question 383, pour l'instant tu m'implémentes ça et puis je vais tester ce que ça donne en réalité."
  (Pierre, 2026-11-16 ~15:10 Manila, option A, as built, #981; "For now, implement that for me, and then I'll test what
  it does in practice"): the admin audit as built: changes, grants, revokes and refusals audited, reads not. Applied:
  #981; SECURITY.md Roles and the Audit tab.
- **15:10, Q384.** "Pour moi, c'est un peu la même question que pour l'histoire de l'avancement des niveaux famille,
  genre, espèce. C'est-à-dire qu'en fait, il faudrait que les juvéniles et les phases de couleur arrivent
  progressivement à partir d'une certaine maîtrise de niveau précédent [...]" (Pierre, 2026-11-16 ~15:10 Manila, on
  #953, context for this mechanism; #975). Applied: #975, #1033, #1041, #1004, #1014.
- **15:10, Q385.** "Question 385, oui, on avait dit que ça serait bien d'avoir un lot de jamais montré. … je te laisse y
  réfléchir." (Pierre, 2026-11-16 ~15:10 Manila, answering the design note's (a)-(e), #1057). Never his own nor the
  reference photos; held-out questions counted like the others and slipped in unannounced; a file of their own. Applied:
  #1057, #1023, #1099, #1165, #1004.
- **15:10, Q386.** "les photos peuvent passer comme celles des autres" (Pierre, 2026-11-16, Q386, #1019): his photos
  judged exactly as anyone's, never boosted, as #1017 brought them in. Rule P1's wording: "ok" (Pierre, 2026-11-17,
  #1039). Applied: #1039, #1019, #1017, #1032, #1004, rules/photos.md P1.
- **15:10, Q387.** "Question 387, oui, ok, passons déjà pour côté R2, même si on arrive assez vite quand même. Là on est
  à plus de, si on est entre 6 et 7 gigas hein, pour l'instant de stockage, donc le maximum c'est 10 gigas, donc mais
  oui, faisons ça." (Pierre, 2026-11-16 ~15:10 Manila, #1016). The fix of a test made stale by Q387: integrator's call,
  easy to correct. Applied: #1018, #1016, #1019, #1014, #1021.
- **Sea slug units and Learn page.** "parfait !" (Pierre, 2026-11-16 15:00-15:45, on his grouping, STATUS, #1021):
  genera, not families, as units (15:00); Learn grouped by family and taxonomic group, Nudibranchia (Doridina,
  Cladobranchia) first (15:43-15:45). Applied: spec/seaslugs.md (#1021).
- **Every PR through a train, even alone** (paraphrase; #1001, his own PR). Applied: rules/ship.md W26 (#1004).

## 2026-11-17

- **06:26, Q388.** (paraphrase) Withdrawn: he wants one mechanism for every level; replaced by Q391. Applied: STATUS
  (#1036).
- **Research uses every source.** "Sauf que ça me va pas. Parce que je m'attends à ce que tu utilises toutes les sources
  possibles et du coup tu te limites" (Pierre, 2026-11-17 ~06:33-06:34 Manila, after "Ben oui! Pourquoi t'as besoin de
  mon autorisation?", #1027); the project's data never leaves. Applied: AGENTS.md Research uses every useful source
  (#1027, #1036).
- **06:46, Q389.** (paraphrase) Yes to both points of the question (the PR quotes the question as asked, not his words):
  (1) well-identified genus-level observations (2 agreeing identifications) become photos of the game's genera (+2,700
  photos); (2) at species level, Goniobranchus sp. 5 first, with a separate presence rule (3 observers with the label),
  since these species cannot reach Research Grade (Pierre, 2026-11-17 06:46-06:49 Manila, #1032). Rule C8's wording:
  "ok" (Pierre, 2026-11-17, #1039). On the 2018 guide, the same morning: "D'autant plus que je sais que le livre de 2018
  est déjà largement en retard par rapport aux connaissances actuelles." Applied: #1039, #1047, #1031, #1053, #1035,
  rules/content.md C8.
- **One judgement per photo; reference read from the photo.** "ok" to A on #942, one judgement per photo, no reference
  ease point (Pierre, 2026-11-17 about 17:40 Manila, #1045; see also Q358); "En vrai 'référence' devrait être déduit des
  caractéristiques de la photo, pas un tag" (Pierre, 2026-11-17, #1045). Applied: #1045; rules/photos.md P1.
- **Easy-to-undo choices are the integrator's.** "Fais les choix tout seul si ils sont facile à revenir dessus" (Pierre,
  2026-11-17, #1050). Applied: AGENTS.md Working mode (#1063).
- **Beta flags** (paraphrase): fish out of beta, sea slugs open to every player in beta, Remove all. Applied:
  rules/subjects.md S1; core.js SUBJECTS (#1051, #1063).
- **Q391.** "Q391 a oui, b oui" (Pierre, 2026-11-17 10:52 Manila, #975): (a) variant photos ride on their own unit's
  mastery, one model of levels; (b) the Learned mark asks a right answer on each variant group. Applied: #953, #975;
  LEARNING.md; rules/learning.md L9.
- **Q392.** (paraphrase) a, b (evening), with #953: variant photos on their unit's mastery, the Learned mark asking each
  variant group (sheet v162); the option texts are in #953. Applied: #953; LEARNING.md Juveniles and colour phases on
  their unit's mastery.
- **Q393.** (paraphrase) Live mode (evening): on the sheet, a speed bonus, counts, the trainer role to host, a nickname
  with an invitation to sign in. Applied: live.js (#1049); ROADMAP Live mode, after version 1; SECURITY.md Live games.
- **Q399.** "Le staff aurait un leaderboard permanent, et chaque nouvelle cohorte aurait un leaderboard indépendant"
  (Pierre, 2026-11-17 evening, Manila, #1050); other cohorts' boards: "Eventuellement mais pas forcément en priorité ou
  mis en avant"; "Techniquement le staff aurait les droits de 'trainer' dans l'app". Changed 2026-11-18: the staff is a
  group, not a role. Applied: #1050; SECURITY.md.
- **Pikachu, and licences** (evening; paraphrase): the Pikachu nickname is shared by several species; the licence change
  not now. Applied: STATUS (#1063); Q417 (2026-11-19).
- **Simulation length.** "6h de calcul ne devrait JAMAIS arriver" (Pierre, 2026-11-17, #1060, #1042; he also questioned
  simulating a subject with no data). Applied: rules/learning.md L11 (the 40-minute cap, 2026-11-18) (#1063).
- **Q390.** Species pairs recorded as literature sets, the format the build already ignores safely before the species
  level: Q390 D (Pierre, 2026-11-17). (paraphrase). Applied: #1164, #1060, #1042, #1165, #1075,
  decisions/2026-11-19-seaslug-literature-followup.md.
- **Q394.** "A" (Pierre, 2026-11-17 evening): a common name or the genus alone typed for a scientific name are smaller
  faults, never a gain. Applied: #1041, #1063, #1068.
- **Q398.** "C'est un détail d'implémentation" (Pierre, #1041): left to the integrator's call: key sci:<species id> and
  one central levels table in core.js. Applied: #1041, #1063, #1068.

## 2026-11-18

- **06:32, Q397.** "lance" (Pierre, 2026-11-18 ~06:32 Manila): add the scientific genera of circles 2-3; built and
  merged in #1067, their content in #1074. Applied: #1041, #1063, #1068.
- **06:02, Exam reserve: exam only.** "J'avais pas compris qu'on faisait ça. Je pensais qu'on gardait des photos pour la
  fin." (Pierre, 2026-11-18 ~06:02 Manila, on #1057's practice probe, #1057, #1099); and "Pour moi ce qui doit se passer
  au début c'est ce qu'on a déjà implémenté c'est d'introduire des photos pas ou peu notées." Exam only, no practice
  probe (Q385). Applied: #1057, #1099.
- **Levels per subject.** "il faudrait pouvoir controler les niveaux de jeux par mode (coraux, poissons, limaces, ...).
  On ne peut pas continuer à empiler des settings dans le menu déroulant" (Pierre, 2026-11-18, #1071); he approved the
  direction at 06:33 Manila: a What I learn card per subject, ⚙ for general settings only. Applied: #1071; Q400-Q404.
- **Two teaching trees.** "Ce sont 2 arbres pédagogiques indépendants" (Pierre, 2026-11-18 ~09:17, #1041): common names
  (families → species) and scientific names (genera → species), each its own progress and switch. Applied:
  reviews/2026-11-18-species-step2-plan.md; FISH_PATH.md (to update).
- **Handovers** (paraphrase): STATUS refreshed about every 90 minutes of work. Applied: STATUS (#1088); INTEGRATOR.md
  (to add).
- **Privacy page.** (paraphrase) Ok to bring privacy.html up to date with what the app collects and keeps; the text read
  by him before it is published. Applied: #1095.
- **Role names and one app.** Trainer, Curator (was content editor), Manager (was instance owner), Admin; "Idéalement il
  faudrait rester dans l'app. D'ailleurs pour l'admin aussi idéalement il faudrait arriver à rester dans l'app."
  (Pierre, 2026-11-18 ~11:47 Manila, #1098). Applied: #1098; ROADMAP (to update).
- **The exam reserve per player.** "En fait la réserve elle doit être définie par joueur. Il n'y a pas d'intérêt d'avoir
  une réserve globale" (Pierre, 2026-11-18 ~12:05 Manila, #1099; replaces #1057's one global set), then "oui, lance".
  Applied: #1099.
- **Fish basics content** (paraphrase): he converted the fish decks to Google Slides; their picture slides confirm the
  six tails, the six markings and the seven body shapes. Applied: decisions/2026-11-04-fish-basics.md (#1111).
- **Comment cleanup.** "ok, lance le nettoyage cette nuit" (Pierre, 2026-11-18, #1121): history out of the comments,
  code token-for-token the same. Applied: decisions/2026-11-18-decisions-from-*comments*.md; #1121.
- **Q400.** (paraphrase) D: the What I learn card lives on My progress, and a Home line opens it. Applied:
  reviews/2026-11-18-species-step2-plan.md §3 (Q396); #1071.
- **Q401.** (paraphrase) A: a row turned on means allowed; each part comes as its parent reaches the usual threshold
  (C0), never sooner. Applied: species-step2 plan §3; #1071.
- **Q402.** (paraphrase) A: a row turned off is kept: the level stops being asked, its units keep their bars, the score
  keeps one scale. Applied: FISH_PATH.md My progress (fish); species-step2 plan §3.
- **Q403.** (paraphrase) No switch for juveniles and colour phases: variants are required, only delayed. Applied:
  species-step2 plan §3; #1071.
- **Q404.** (paraphrase) A: every names row of the What I learn card can be turned off, a families-only player allowed;
  the two trees are independent. Applied: reviews/2026-11-18-species-step2-plan.md §3; FISH_PATH.md (#1092).
- **Q405.** (paraphrase) Rule L11 approved as worded: a hard 40-minute cap per check at every level; level 2 only the
  worlds the change touches; level 3 never on this machine, only with his go on GitHub runners; an unclear result is
  reported, never escalated. Applied: rules/learning.md L11 (#1086).
- **Q406.** (paraphrase) The corals move onto the tree engine, their ids unchanged: the principle agreed, a detailed
  plan to him first. Applied: decisions/2026-11-18-architecture-steps-3-4.md; STATUS (#1068).
- **#1045 aligns down.** "ok" (Pierre, 2026-11-18 morning, #1045, on which way A aligns): the 423 photos judged both
  ways align down, no reference ease point on any route. Applied: #1045.
- **Admin draft, model B** (paraphrase): the draft in one IndexedDB store, every write one transaction. Applied: #1078;
  ROADMAP Sign out keeps the draft.
- **Agents that count.** "C'est des agents en lecture seule", "ça évite aussi de trop charger la machine lors des tests"
  (Pierre, 2026-11-18, as STATUS quotes him): at most four agents that write code or run tests; read-only studies on
  top. Applied: rules/ship.md W27; AGENTS.md (#1068, #1086).
- **Content version on each answer** (paraphrase): built now, quickly, because the content evolves fast. Applied:
  ROADMAP Content versions and duplicate-safe answers (#1083).
- **Docs audit (a)-(d)** (paraphrase): the docs plan with a new W19; the licence kept all rights reserved for now (A);
  GitHub private vulnerability reporting enabled; the privacy update a separate PR. Applied:
  reviews/2026-11-18-docs-audit.md; rules/ship.md W19 (#1086).
- **Estimates in agent time** (paraphrase): never human days or weeks. Applied: AGENTS.md Working mode (#1068, #1086).
- **Feedback sheet (a)-(f)** (paraphrase): as recommended: layout A, the look-alike cue when right, the first tip when
  no pair line, the lines to write, rule C3's new wording, the More counter. Applied:
  reviews/2026-11-18-feedback-sheet-study.md; decisions/2026-11-18-feedback-sheet.md.
- **Files only through Write and Edit.** "Pourquoi je me retrouve avec ces demandes alors que tu es en mode 'Accept
  edits'? Comment je suis sensé évaluer la pertinence de ça???" (Pierre, ~11:32 on 2026-11-18, shown a permission prompt
  from an agent's shell command, #1086). Applied: AGENTS.md No permission prompts; #1117.
- **Frames, multi-photo** (paraphrase): (a) coral grids played too, no restriction set in advance but the size floor;
  (b) frames (subject, feature, context) for every subject, agent-proposed, valid by default, fixed in the admin; (c)
  the header and tab bar kept. Applied: reviews/2026-11-18-multi-photo-study.md.
- **Game modes** (paraphrase): the seven modes are built, the most useful first (Same or different?, Odd one out, Down
  the tree, Life stages matched, then Sort them, Virtual dive). Applied: STATUS queue (#1068); ROADMAP Game modes (to
  update).
- **Guards rather than prose.** «ok, lance les quatre» (Pierre, 2026-11-18, #1117): the PR template's Players-see item,
  the Bash guard, the night report, the rules audit. Applied: #1117.
- **Inventory items L8, L14** (paraphrase): L8 (exam photos at a hard quantile, an exam over two visits) no; L14
  (calibrated medium-size photo sets) no, packs later. Applied: STATUS (#1088); ROADMAP (to update for L14).
- **Lecture photos** (paraphrase, inventory C12 A+D): never upscaled; the 86 Corals of the World captures replaced by
  their originals with exact credit. Applied: STATUS queue (#1068).
- **Lighter models by measurement.** "A valider en comparant avec un modèle fort sur un échantillon" (Pierre ~11:02 on
  2026-11-18, #1086). Applied: AGENTS.md Model choice by measurement.
- **Live prep (a)-(e)** (paraphrase; content not recorded beyond the queue line: familiar live-quiz conventions, our own
  palette; live answers count without unlocking). Applied: STATUS (#1088); rules/learning.md.
- **Mimicry class** (paraphrase, inventory F28 and the pairs study (a)-(d)): M1-M7 enter play as declared pairs, C1-C12
  with species step 2. Applied: decisions/2026-11-18-variant-classes.md.
- **Model and effort per task.** "C'est une bonne idée, et qui doit être bien documenté dans les règles hautes données
  aux agents (et notamment à l'intégrateur)" (Pierre ~11:03 on 2026-11-18); "ok, applique ce tableau" (~11:12), on the
  named models (#1086, #1100). Applied: AGENTS.md; INTEGRATOR.md table (#1086, #1100).
- **No apart groups** (evening; paraphrase): Apart removed (#1113). Applied: decisions/2026-11-18-no-apart-groups.md.
- **No morning report** (paraphrase, inventory D7 closed). Applied: STATUS (#1068); INTEGRATOR.md (to update).
- **No source priority at all** (paraphrase, inventory C1): no photo boosted for who took it, IMR's and his own
  included. Applied: rules/photos.md P1 (#1086); the corals' code (to do).
- **Placement** (paraphrase, inventory L19): no hidden test; a coral calibration set first, then an explicit opt-in
  adaptive test. Applied: reviews/2026-11-18-placement-test-check.md (#1080); #1130.
- **Rules audit** (evening; paraphrase): its decisions 1-5 and 8 ok, 6 and 7 dropped (the docs describe a coherent model
  in our words; no new manual step for him), 9 parked. Applied: STATUS (#1122); #1117's study (to record).
- **Sea slug achievements** (paraphrase): the list ok, plus a ladder from 60 to 100%. Applied:
  decisions/2026-11-18-seaslug-achievements-high.md.
- **Staff is a group** (paraphrase, SECURITY.md): Staff is not a role, and the toggle that granted the trainer role is
  not fine enough for rights management; groups generalised. Applied: SECURITY.md; #1091.
- **The domain waits.** It becomes urgent "quand l'infrastructure qu'on utilise ne suivra plus" (Pierre, 2026-11-18, as
  STATUS quotes him); no December deadline; Professionalise has no deadline now. Applied: STATUS (#1068); ROADMAP (to
  update).
- **The night ends at 05:00.** «Ma journée elle démarre généralement à 5h du mat» (Pierre, 2026-11-18, #1117,
  tools/night.py). Applied: #1117 (`tools/night.py`).
- **What a reference photo is.** "La source ne devrait pas être le critère principal de 'référence' même si ça peut être
  un fort indice. L'ensemble des photos de référence doit avoir des qualités intrinsèques, basées sur des critères
  objectifs" (Pierre, 2026-11-18 morning, #1045). Applied: rules/photos.md P1 (#1086).
- **Work from the whole queue.** "On a une liste de 80+ taches en attente" (Pierre, 2026-11-18 afternoon, as
  INTEGRATOR.md records it). Applied: INTEGRATOR.md Habits (#1111).
- **Q395.** species exams (Pierre, 2026-11-17 evening and 2026-11-18 morning): a family exam at species level kept by a
  hidden checklist (a box ticked in ordinary play by a right answer on a first-seen photo at Advanced; the hidden exam
  asks only the remaining boxes, at least 3 questions; a miss unticks it, then 2 right in a row; no threshold: "bonne
  idée"), and an ultimate exam (100-200 questions, 95% to pass, hard but recognisable photos, the only way from 99% to
  100%: "oui"); exams may reuse seen photos when needed (as #1041 records it). (paraphrase) Applied: #1041, #1063, #1068.
- **Q396.** "il faudra que ça soit facilement visible et accessible pour les joueurs" (Pierre, 2026-11-18, #1071,
  #1041): a per-subject What I learn card instead of ⚙ settings; the card's study (#1071) answered: Q400 D, Q401 A, Q402
  A, Q403 no switch (variants are required, only delayed), Q404 A. Applied: #1041, #1063, #1068.

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
- **07:59, Q418 applied.** #1171 reworked to (b) and merged.
- **08:05.** On #773 («tu n'as pas besoin de ma validation avant de publier»): «Cette règle a été largement remplacée
  par des règles plus récentes sur quand merger tout seul» (the merge contract's "easy to correct" rule, 2026-11-14).
  Applied: #1190.
- **Applied in #1190:** S1's wording, Q409 (rule W19), Q414 (rule W14), Q415 (rules L11, L12); the Pikachu and Q408
  records.
- **08:07 and 08:09, Rule 0.** On ending the quiet hours at 05:00: "non. La journée démarre à partir de mon premier
  message après 4h du mat"; then "ok pour cette phrase" to: "After 17:30 (Manila time, read from the hook's line), the
  integrator asks Pierre nothing until his first message after 04:00; everything else goes on as normal, agents
  included." Applied: AGENTS.md Rule 0, `tools/brief.py` (#1191).
- **08:18.** On README's credit line for the Coral Finder 2022 ("no photo of the book is used. It stays a cited
  source…"): "Je suis pas sur que c'est une bonne chose de mettre ça en avant. Maintenant c'est juste une source comme les
  autres". Applied: the line is gone from README's credits; the book is cited where it is used, like any source.
- **08:53, Q420 (#1099, the per-player exam reserve on the corals).** A, keep it as built: "ok. Il n'y a aucune raison
  que ça influence les résultats...". Applied: #1099.
- **08:53, Q421 (#1045, the fish reference photos' level-1 margin).** A, merge with no further simulation: "ok".
  Applied: #1045.
- **08:53, the pCloud backups (#1095's privacy page).** "On a commencé hier": the weekly backups started 2026-11-18;
  the page states that and no deletion delay. Applied: #1095.
- **08:53 and 08:54, Q422 (#1098 b, Curators sorting photos).** "Pourquoi plus tard?"; then "ok" to building it with
  the Curators' relay, with a log and Undo; and "C'est toi qui est responsable de l'ordre du développement. Fait juste
  au mieux." Applied: ROADMAP "Roles, instances and cohorts".
- **08:53, Q423 (#1098 c, d, the pilot's name + 4-digit code).** B, both a Trainer's view of their cohorts and a
  Manager's rights with name + code: "Pour l'instant on n'a pas besoin de grosse sécurité. Ya rien de critique. Mais
  oui, la meilleure connection doit être prévue dans la roadmap". Applied: ROADMAP "Roles, instances and cohorts".
- **08:53, Q424 (#1098 e, the GitHub token).** A: in the app's Admin section, as the very last step, once the pages are
  protected (admin.html goes): "ok".
- **08:53, Q425 (#1197, how far to edit the rules).** B: apply what is decided, then a short core always loaded, topic
  files and guards, step by step after a trial: "ok". First step: CLAUDE.md imports AGENTS.md (#1198).
- **08:53, the answers ledger as checked data** (#1197 b3: a test that each answer reached its doc): "ok".
- **08:53, two contradicting rules** (#1197): merge `origin/main`, never rebase or force-push (rules W18, AGENTS.md
  checklist); one open PR per agent (rule W22): "ok". Applied: #1198.
- **08:57, the order of work.** "Mon seul input c'est quand j'ai besoin de mettre des choses en priorité": the
  integrator sets the order of development and never asks Pierre "now or later"; Pierre steps in only to raise a
  priority (AGENTS.md "Questions to Pierre": never the order).
- **09:09, Q426 (#1093, no photo twice: the strong RA's shown score lags at 1,000 answers).** A, keep the fix and accept
  the transient lag: «ok». Applied: #1093.
- **09:04, priority.** On the rules overhaul (Q425 B: the AGENTS.md loading, the rest of the approved audit, the search
  before any question and the ledger check, a short core with topic files and guards, fewer index conflicts): «ça c'est
  une priorité. Parce qu'en attendant on continue de développer avec les anciennes règles». Applied: the integrator's
  order of work (#1198, #1117, #1199, the core proposal).
- **Applied in #1188:** 07:05, OK to this ledger: AGENTS.md "Every answer reaches its doc, and the answers ledger" and
  this file.
- **Applied in #1190:** 06:50, rule S1's wording: rule S1 in `docs/rules/subjects.md` and AGENTS.md.
- **Applied in #1198:** Q425, its first step: CLAUDE.md loads AGENTS.md (decision record `2026-11-19-rules-step1`).
- **Applied in #1199:** 08:53, the answers ledger as checked data (tools/answers_check.py, in the docs test).
- **10:05, Q427 (#1195, rule P1 on the corals: no source boost; level 2 left one breach, the strong RA's shown score
  at 1,000 answers).** A, merge: «ok». Applied: #1195.
- **10:56-10:58, the privacy page.** "Arrête d'être plus catholique que le pape... C'est des trucs internes ça...";
  what stays after a deletion: "ok"; "ok, fais la version courte" (a half-page notice on the points the law asks for).
  Applied: #1095 (docs/decisions/2026-11-19-privacy-short.md).
- **09:46, a review of the rules' substance.** "Est-ce que les règles ne méritent pas d'être revues globalement? Ya
  aucune optimisation/amélioration possible?". Applied: the substance review (#1206); its answers go in with the
  rules core.
- **10:32-10:34, one code for every subject (the admin's Genera beside Tree).** 10:32: "A nouveau, le but est d'avoir
  un code commun entre les matières, pas des codes pour chaque matière..."; 10:33: "Il faut juste identifier les
  spécificités de chaque matières et voir comment les implémenter, soit avec des paramètres, soit avec des bouts de
  codes spécialisés"; 10:34, on a brief that quoted 10:32 as a new order: "Ne prend pas mon message comme parole
  d'évangile et seule règle. C'est déjà ce qu'on a écrit plein de fois et ya pleins de décisions qui vont dans ce
  sens" (briefs cite rule S1 and the decisions, not his latest message). Applied: the admin and Learn study
  (docs/reviews/2026-11-19-admin-one-engine.md), Genera folded into Tree.
- **10:36, a gold set of fish photos for Pierre.** "Oui, tu peux me préparer un petit set de photos représentatives
  que tu me demandes d'évaluer pour voir si je suis d'accord avec les pré-selection. Essaye de maximiser l'info que tu
  peux en tirer". Applied: a review page in preparation; his answers score the judges (#1211).
- **10:49, the order of merges.** "Il faut arrêter de lancer de nouvelles PR tant que t'as pas résolu celles qui sont
  bloqués depuis des plombes...". Applied: no new PR until the open ones merge; this one only records answers.
- **11:14, the old Genera addresses.** "Pourquoi? C'est quoi le use case que t'imagines?" (on keeping redirects): none,
  rule W3 holds. Applied: #1214 keeps no redirect.
- **11:28-11:43, the gold set of 30 fish photos, reviewed.** His verdicts per photo, dictated (kept in the
  integrator's scratchpad with the scores). On the observer's life stage, 11:43: "Il peut émettre un avis, mais son
  avis pèse beaucoup moins qu'un observateur humain, sauf s'il a des preuves solides". Applied: the judging rubric's
  wording, in the next judging PR; Q429-Q431 (contrast field, crops, the juvenile ease) wait for him.
- **10:08, the models measured.** "Du coup il faut peut-être monter dans les efforts ou les modèles et faire de
  nouveaux tests au lieu de default sur Opus high...". **10:09**, a question, not a decision: "Mais du coup qu'est-ce
  qui t'as fait changé d'avis? Que se serait-il passé si je n'avais pas posé la question?". Applied: the measurement
  (#1211); the integrator's answer, its call: a hook refuses an Agent launch without `model` and `effort`, every
  launch is logged, and the brief prints the day's distribution, `tools/agent_guard.py` (#1209).
- **10:12, Q428 (#1206, writing a rule down).** ok: only a change of substance goes to Pierre; editing is the
  integrator's call, listed in the PR; never generalise nor harden. Applied: #1217.
- **10:12, W20 out of the rules (#1206).** «ok»: its text moves word for word to the photos spec, with its source; the
  ID retires. Applied: `docs/spec/photos.md` "No more candidates is no more candidates" (#1217).
- **10:12, U7's new line (#1206).** «ok»: the levels each subject teaches are set on its What I learn card, never as
  more ⚙ rows (his words of 2026-11-18: «On ne peut pas continuer à empiler des settings dans le menu déroulant»).
  Applied: `docs/DESIGN.md` (My progress), as design guidance (#1217).
- **10:12, the rules core (#1200 adjusted by #1206).** «ok»: about 153 lines; the order of work is the integrator's,
  integrators run in auto mode, no GitHub chores for Pierre, security alerts count like Codex findings; no product rule
  deleted or hardened; a trial before the core replaces AGENTS.md. Applied: AGENTS.md (#1217).
- **10:13, rule S1 and L6 merged.** «ok» to: «Partagé et modulaire par défaut : un seul moteur, pas de cas particulier
  pour une unité ou une matière. Une exception est permise quand elle est déclarée et nommée à un seul endroit, avec sa
  raison. Un test liste toutes les exceptions, et une exception non déclarée le fait échouer. L'intégrateur décide une
  exception comme un choix facile à corriger, et l'écrit dans la PR avec sa raison. Une exception qui touche la
  progression des joueurs ou le format des données passe par Pierre.» Applied: #1217.
- **14:42, Q432 (#1099, the per-player reserve's two level-2 breaches).** Accept them as the reserve's cost: "Ok. Je
  sais même pas pourquoi on se pose la question. C'est juste évident". Applied: #1099; such a small breach with true
  knowledge held is the integrator's to settle.
- **14:42, Q430 (fish photo crops).** B, the photo enters cropped on its own: "J'ai toujours dit de mettre en jeu les
  suggestions, surtout si elles peuvent être corrigées à postériori, ce qui est le cas ici." Applied: the crop PR.
- **14:42, Q431 (juvenile ease).** «ok» to dropping "juvenile = hard" and its 2/5 cap except look-alike juveniles,
  and: "Mais certains juvéniles sont difficiles parce qu'ils ne sont justement pas remarquables et qu'ils ne
  ressemblent pas du tout à l'adulte. Tu peux faire une étude avec des sources externes pour voir ce qui connu comme
  "difficile" à identifier vs "facile"?". Applied: the juvenile difficulty study.
- **14:42, Q429 (a contrast field).** A question back, not a decision: "Si ça peut être utile il faut envisager de
  changer le format des données. Est-ce que ça pourrait être utile? Qu'est-ce que t'en penses?". Open: no doc change
  yet (the integrator's view went back to him: no judge field, a contrast measured by a tool, a ROADMAP row).
- **14:42, the rules (#1217).** Q433 (a re-ask of Q428, withdrawn) «ok»; W20: "Je sais même plus à quoi elle sert cette
  règle" (it leaves the rules); U7's line: "Ok. Mais à nouveau on fait une règle dure pour un truc qui est juste du bon
  sens de design..." (the line goes to DESIGN.md as guidance, not into U7); the agent cap removed: «oui». Applied:
  #1217.
- **14:42, one PR at a time.** "Pourquoi une PR à la fois? Il y avait combien d'agents qui tournaient?": no reason (an
  over-reading of 10:49); work runs in parallel. No doc change (the rules hold no such limit).
- **14:44, the next gold set.** "C'est pas un double aveugle. C'est pas moi qui doit pas voir les réponses. Sinon tu
  me demandes un travail de robot et je dois garder en tête la grille en entier". Applied: the judges stay blind to his
  verdicts, he sees a judge's view (a model drawn at random per photo), on new photos.
- **14:50, the next gold set, its model.** A model drawn at random per photo: «ok». Applied: the next gold set (no doc
  change yet).
- **14:50, why #1099 was evident.** "C'est pas pour ça que j'ai raison, je ne regardais pas les stats. Je regardais ce
  qu'on était en train de faire. Il n'y avait aucune raison que ça ne soit pas une amélioration". No doc change (it
  explains Q432).
- **14:50, Thecacera picta.** "Ou alors il faut le citer comme un cousin de l'espèce appelée Pikachu?". Applied: #1222.
- **14:50-15:05, contrast (Q429, Q434).** 14:50: "Tu vas d'abord faire une série de test où tu vas me montrer les
  avant-après"; 15:01, after the series: "je ne suis pas convaincu qu'il faille les corriger, ou alors dans un deuxième
  temps. Parce que c'est justement ce qui fait la difficulté des photos [...] on ne peut plus s'entrainer sur des
  photos réalistes avec peu de contraste" (no correction in the games); 15:02: "C'est une variable intéressante et utile
  à estimer. Ne serais-ce que pour nos analyses muti-variées des données réelles" and "c'est aussi une variable qui se
  calcule plutôt que s'estime par un agent. Tout comme les questions des couleurs j'imagine?"; **Q434**, a measured
  block per photo (contrast, brightness, saturation, colour loss, sharpness), computed once by a script: «oui». Applied:
  the measured-photo PR (the format; a ROADMAP row for a correction on the Learn sheets only). **15:07**, on "plus
  tard": "Plus tard ça veut juste dire qu'on le met dans la ROADMAP. Si t'écris litéralement ça, les agents suivant sont
  bloqués de manière permanente" (a ROADMAP row says what to build, never "later").
- **15:40, fish genus marks beside IMR cues.** On the rule keeping our sourced marks away from a genus with IMR cues:
  «Mouais bof». Decides (integrator's call): the genera IMR describes take our sourced marks under its cues, as the
  families. Applied: spec/fish-sheets.md "Genus presentation and ID marks", decisions/2026-11-19-genus-marks-beside-imr-cues.md (#1231).
- **15:35, Q435 (the juvenile classes, after the juvenile difficulty study #1228).** «ok» (the question, paraphrased: no
  juvenile ease cap a priori; the four classes Off, Finer rank, Bold, Like become a per-species label for the analyses,
  with no effect on the game; the players' answers decide which classes are hard). **15:35**, on sourcing: «Il faut
  sourcer tous les juvéniles qu'on peut et qui ont des sources externes qui les décrit ou parlent d'eux. Surtout si ça
  peut aider notre app». Applied: tools/fish_juveniles.json and the species sheets' juvenile line
  (docs/decisions/2026-11-19-fish-juveniles-sourced.md); the cap's removal in the judging, another PR.
- **20:34, Q438 (the fish the auto-sort set aside).** «OK pour ta recommandation»: a route back into his draft when a
  newer judgement saves a photo it set aside (a crop), undoable. Applied: spec/fish-photos.md "The fish auto-sort"
  (docs/decisions/2026-11-19-auto-proposals-newer-judgement.md).
- **20:57, a proposal he let through is not his curation.** «ce que tu appelles ma curation, si ça se trouve, c'est
  juste moi qui ai cliqué sur un bouton pour valider une proposition … si tu penses que ma curation entre guillemets
  n'est pas bonne, … il faut que tu fasses une proposition qui intègre directement le jeu. Quitte à ce que je corrige a
  posteriori.» Applied: the build reads the auto-sort's proposals anew (same record).
- **20:59, his hand decisions only.** «ma curation, si ça se trouve, c'est juste des propositions d'agents IA et j'ai
  cliqué OK pour tous … Sauf si c'est quelque chose où j'ai fait à la main un par un, c'est pas vraiment ma curation …
  je pense que j'ai fait très peu de curation manuelle et j'ai pas fait 100 photos en curation manuelle.» Applied: the
  counts of his hand decisions and the proposals he let through (same record); rule A1's wording goes to him.
- **20:45-20:48, the backlog recount.** «Et t'es sûr que sur les 151, notamment où il y en avait en attente de ma
  réponse, ou en attente de données ou d'un tiers, ou des simples idées, j'ai pas donné moi des réponses justement pour
  les débloquer»; «c'était pas que des réponses à des questions, hein, c'était aussi des commentaires, c'était aussi des
  messages directs». The recount found 35 of the inventory's open rows answered or decided; the ROADMAP becomes the one
  list and the inventory a dated snapshot; tools/answers_check.py fails a later entry that names a ROADMAP item without
  the ROADMAP or a PR after "Applied". Applied: ROADMAP (the rows below); docs/reviews/2026-11-18-backlog-inventory.md.
- **21:10, recorded late: inventory P2 (2026-11-18 morning).** "P2 B for now" (paraphrase, STATUS 00f82557c, #1068).
  The inventory's P2 is the lecture-photo study's (d): ask the IMR trainer which of the 34 untraced photos are IMR's own.
  What option B said is not recorded anywhere read: to confirm with Pierre. Applied: ROADMAP "Trace IMR lecture photos
  to their original source".
- **21:10, recorded late: inventory C12 and L3.** C12 "A+D" (2026-11-18, entry "Lecture photos" above); L3 is answered
  by Q405 and Q415 (above). Applied: ROADMAP "IMR lecture photos never upscaled; the Corals of the World captures
  replaced by their originals" (Next) and ROADMAP "Rule L11's check tool under the 40-minute cap" (Next).
- **21:10, recorded late: inventory L8.** "L8 no" (2026-11-18, entry "Inventory items L8, L14" above). Applied: ROADMAP
  "Declined" (the exam at a hard quantile, the exam over two visits).
- **21:10, recorded late: inventory D6 (2026-11-18 morning).** "D6 three wordings" (paraphrase, STATUS 00f82557c,
  #1068): rules C2 and D5 one line each, "ok"; the Coral Finder out of the rules but rule C2 (Q294). Applied: #1086.
- **21:10, recorded late: inventory S9 (2026-11-18 morning).** "#1061 both built now" (paraphrase, STATUS 00f82557c,
  #1068): the sea slugs' look-alike line editor and their Structure. Applied: #1075.
- **21:10, recorded late: the 2026-11-18 entries that said "to update" or "to do".** No source priority (inventory
  C1): the corals' code, #1195. No morning report (inventory D7): INTEGRATOR.md, #1192. Inventory L14, game modes, the
  domain waits, role names: ROADMAP, #1192. Two teaching trees: FISH_PATH.md, #1192. Handovers: INTEGRATOR.md, #1192.
  Applied: #1192, #1195.
- **20:40, model and effort combinations.** «C'est pas forcément un écart à la règle de mettre Opus Medium sur des
  tâches. C'est toi en fait qui s'est mis toute seule hein, la règle. Moi j'ai jamais dit que Opus c'était forcément en
  high. [...] Il y a clairement d'autres combinaisons possibles. Il faut voir ce que Anthropic recommande». Applied:
  docs/reviews/2026-11-19-model-effort-combinations.md (a study: a replacement for INTEGRATOR's table, for the
  integrator; the AGENTS.md bullet's new wording, for Pierre's OK).
- **20:34, Q437 (open Compare, pairs, the custom quiz and the duel to fish and sea slugs, in shared code).** «évidemment
  oui, il faut ouvrir tous les modes de jeu aux différentes matières, à toutes les matières. Et oui, c'est du code
  commun». Every game mode opens to every subject, in shared code. Applied: the modes PR(s).
- **20:34, Q438 (about 694 fish candidates the auto-sort rejected as `k`, confusion possible: a route back when a newer
  judgement saves one by a crop, like any auto-sort proposal, undoable).** «OK pour ta recommandation». Applied: the
  route-back PR.
- **20:34, the doc size limits.** «Alors tu parles d'alléger la roadmap, en l'occurrence la roadmap, il faut augmenter
  sa taille limite hein, s'il y a besoin. La roadmap, elle peut très bien devenir très longue. Ça serait dommage, enfin
  en tout cas il ne faut pas que les infos qui sont censées dans la roadmap soient ailleurs. Ça n'est pas une bonne
  réaction que de déplacer de l'historique vers les fiches de décision pour pouvoir recharger la roadmap. Là pour le
  coup je suis pas d'accord, c'est pas la bonne stratégie. La roadmap elle n'a pas forcément de raison d'avoir une
  taille limite si elle est bien tenue et que ça se retrouve pas, elle se retrouve pas avec un historique, avec des
  versions, avec à l'intérieur. Si elle est bien tenue, elle n'a pas de raison d'avoir une taille limite. […] De
  manière générale, les tailles limites, elles ne sont pas là pour être fixées, parce qu'elles ont été fixées de
  manière complètement arbitraire. Donc, elles ne sont pas là pour empêcher de bien travailler. Elles sont là pour
  lever des warnings en disant « Attention, on est en train de remplir ces documents-là, est-ce que vraiment on est sûr
  qu'on veut les remplir ?» Et si vraiment on est sûr qu'on veut les remplir et qu'on les remplit proprement et qu'on
  fait un job qui soit propre et qui est cohérent, sans venir juste remplir avec des trucs qui n'ont rien à faire
  dedans, alors il faut augmenter les limites. Donc là, typiquement, à nouveau, l'index des décisions qui a dépassé sa
  taille limite. La question, c'est est-ce que ça méritait de dépasser sa taille limite? Et la taille limite, comment
  elle a été fixée? Je suis quasiment sûr que la taille limite, elle est fixée de manière purement arbitraire. […] Mais
  le mécanisme, il a apparu parce qu'il y avait une raison, parce qu'il est venu compenser une faiblesse par ailleurs.
  Donc il faut essayer de réfléchir à ça, à comprendre, mais en tout cas on ne peut pas juste dire de manière
  arbitraire, ben, ces fichiers-là, ils ne dépasseront jamais cette taille-là, et puis même si il y a réellement des
  choses à y mettre dedans, qui sont importantes à mettre dedans.» A doc's size limit is a warning mark, raised when
  the doc is clean; ROADMAP's information stays in ROADMAP. Applied: #1255 (the marks in `tests/docs.test.js` and
  `tools/brief.py`, ROADMAP's rows and header, the whole decisions index;
  docs/decisions/2026-11-19-doc-size-marks.md).
- **Applied in #1265:** Q437: ROADMAP "Every game mode for every subject", `SUBJECTS` `closed`,
  docs/decisions/2026-11-19-modes-every-subject.md (the Duel tab first); the plan,
  docs/reviews/2026-11-19-modes-every-subject.md.
- **Applied in #1264:** Q437: applied in the ROADMAP Game modes row (its lead quotes him).
- **20:42-20:43, the night's work.** «t'es pas forcément obligé de tout lancer en parallèle [...] si dans la nuit t'as
  plus assez de travail, il faut que tu ailles taper dans la roadmap et dans les trucs que tu peux avancer tout seul.
  sans forcément lancer 30 agents en parallèle à chaque fois.» and «ça sert à rien d'imaginer des études juste pour
  remplir le temps. [...] Moi, j'ai mon quota à surveiller quand même. Donc, tu fais les tâches qu'on a déterminées
  ensemble.» A few agents at a time on decided work; then the next decided ROADMAP rows; no filler study. Applied:
  INTEGRATOR "Working with Pierre" (A night's work).
- **15:54, Q436 (the one-tap difficulty question for fish and sea slugs).** «Je ne comprends même pas pourquoi ça
  n'est pas juste une fonctionnalité du moteur et qui marche donc déjà pour toutes les matières... Donc oui bien sur,
  et il faut mutualiser le code tant que possible». The one-tap question runs for every subject, from the shared
  engine, its answers kept per subject. Applied: #1226 (`quiz.js` `PULSE` for every subject, paced per subject; the
  admin's tables read the subject on screen; LEARNING.md "What the players say about the difficulty").
- **15:55, the coral-only cards.** «ça veut pas dire qu'il ne faut pas garder les templates. On ne sait jamais quand on
  en aura besoin». The apology card and the recalculation notes are not extended to fish and sea slugs, but the cards
  stay in the code as templates with no subject by default, tagged only when their text concerns one subject. Applied:
  #1226 (`progress.js` `RECALC.L`, `sorryNotice` kept as an engine card).
- **20:50, why his words were not recorded.** «je comprends pas qu'est-ce qui fait que notre système de travail n'a
  pas permis le fait que tout le travail qu'on a fait ensemble avec l'autre agent ait été correctement enregistré
  [...] à chaque fois que je dis quelque chose, ben en fait, c'est pas enregistré correctement.» Every answer reaches
  ROADMAP or a PR, checked by a tool. Applied: #1264 (the recount written into ROADMAP's rows; `tools/answers_check.py`
  fails an entry that names a ROADMAP item without applying it).
- **20:55, the admin is slow to open on his phone.** «c'est pas ultra prioritaire, mais [...] la page admin sur mon
  téléphone met de plus en plus de temps à s'ouvrir. [...] je crois que par défaut ça cherche à s'ouvrir sur activité,
  mais globalement les pages dans admin, notamment la première fois que je me connecte depuis un moment [...] c'est
  vraiment très long à charger.» A fix of something plainly broken, low priority. Applied: the admin load PR.
- **20:57, agent proposals and his curation.** «ce que tu appelles macuration, si ça se trouve, c'est juste moi qui ai
  cliqué sur un bouton pour valider une proposition [...] si tu penses que macuration entre guillemets n'est pas bonne,
  [...] il faut que tu fasses une proposition qui intègre directement le jeu. Quitte à ce que je corrige a
  posteriori.» Applied: with the 20:59 entry, rule A1's new wording, for his OK.
- **20:57, photos in full size.** «fais attention aux photos, que les photos vues en petite résolution, on peut passer
  à côté de problèmes, ou de qualité d'ailleurs, et donc effectivement, quand on a le doute, il ne faut pas hésiter à
  les voir en plus haute résolution.» Applied: INTEGRATOR "The quota in practice"; the re-judge of the juveniles' tag
  doubts in full size.
- **20:59, rule A1 protects his own hand decisions.** «la fameuse règle A1, tu veux absolument pas toucher à ma
  curation. Mais [...] ma curation, c'est pas, si ça se trouve, c'est juste des propositions d'agents IA et j'ai cliqué
  OK pour tous et du coup tout est passé. Sauf si c'est quelque chose où j'ai fait à la main un par un, c'est pas
  vraiment ma curation. [...] À vérifier, mais je pense que j'ai fait très peu de curation manuelle et j'ai pas fait
  100 photos en curation manuelle.» A1 protects the choices he made by hand, one by one; accepted agent proposals can
  be replaced by a better proposal that goes into the game, which he corrects afterwards. Applied: the counts of hand
  and accepted curation (the Q438 PR); rule A1's new wording, for his OK.
- **Applied in #1274:** Q405, Q415: the check tools aligned with rule L11: a 40-minute budget that plans, refuses over it
  and stops with the runs done marked cut, level 3 refused without his go on a GitHub runner, level 2's figures kept as
  the minimum (`tools/checkbudget.js`; decision record `2026-11-19-check-cap`).
- **Applied in #1283:** Q405, Q415: the Learning check workflow keeps the 40-minute cap as one deadline
  for the whole check and the level-3 go before either arm, and `learncmp` reads an empty cut arm for every primary
  (`.github/workflows/learncheck.yml`; decision record `2026-11-19-check-cap`).

## 2026-11-20

- **05:31-05:33, Rule 0 and the night's work.** «J'ai pas dit que je me levais à 4 h du matin. J'ai dit que ça
  pouvait arriver que je me lève à partir de 4 h du matin. Ça veut dire qu'il faut pas que tu t'arrêtes à 4 h du
  matin.»; «la règle, ça n'a jamais été que tu t'arrêtes de travailler avant le début de la journée.»; «c'est mon
  temps qu'on essaye de protéger, pas le temps des agents, et c'est déjà écrit comme ça.» Rule 0 unchanged; the work
  goes on at every hour, and a check-in at most an hour apart re-starts the queue after a session restart. Applied:
  INTEGRATOR "Working with Pierre" (Rule 0).
- **05:39, Q440 (#1273, the species by their scientific names: about 1.3 fewer scientific genera at Advanced after
  3,000 answers).** «C'est pas un coup à partir du moment où c'est un mode de jeu qu'on ajoute […] Bien sûr qu'il faut
  accepter ce coup-là. Ne pas l'accepter, c'est ne pas faire le jeu, en fait.» Accepted; adding a game mode is not a
  cost. Applied: #1273's merge (its PR body).
- **05:39, rule A1's wording.** «Pour la nouvelle formulation de A1, je valide.» A1 protects the choices he made by
  hand, one by one; an accepted proposal is replaced by a better one. Applied: docs/rules/admin.md A1 and the rules
  index (#1282).
- **05:39, the model and effort bullet.** «Pour la ligne sur les modèles et l'effort, OK pour cette stratégie.»
  Applied: AGENTS.md "The right model and effort for each task" and INTEGRATOR's table (#1257's), #1282.
- **05:39, P2 (the 34 untraced lecture photos, "B for now" of 2026-11-18).** «Pour P2, non, j'en ai aucune idée, donc
  si vous n'avez pas réussi, si vous n'avez pas correctement noté les choses, ben, je ne sais pas.» Kept as they are;
  asking the IMR trainer stays his. Applied: ROADMAP "Trace IMR lecture photos to their original source", #1282.
- **05:39-05:40, no command for him to run.** «c'est jamais à moi de lancer une commande à la main dans un terminal.
  Ça devrait jamais être à moi. C'est à toi de le faire.»; «Comment ça se fait en fait que tu en es arrivé à devoir me
  demander manuellement de lancer une commande ?» The integrator does such steps itself; only a step it may not take
  goes to him, as a yes/no question. Applied: INTEGRATOR "Working with Pierre" (Never give him a command to run).
- **05:46, P2, what "B for now" meant (the 34 untraced lecture photos).** «quand je disais pas pour l'instant, c'est
  que probablement, pour l'instant, on les laisse en jeu, mais qu'à un moment donné, si on n'arrive vraiment pas à
  sourcer, ben, il faudra peut-être arriver à les supprimer. […] l'autre agent m'avait demandé de demander aux
  formateurs de IMR de les sourcer. Donc ça, non, ça, je vais pas les emmerder pour ça. Donc, pour l'instant, ça reste
  source IMR sans plus d'infos.» They stay in play, credited to IMR with no more information; nobody asks the IMR
  trainers; if they are never sourced, removing them may come later. Applied: ROADMAP "Trace IMR lecture photos to
  their original source", #1282.
- **06:58, flags and the two removals.** «Si je supprime une photo, pourquoi je dois encore cliquer sur Done pour
  évacuer le warning? D'ailleurs, je ne comprend toujours pas bien la différence entre cliquer sur la croix ou cliquer
  sur Remove. ça me gonfle qu'il y ait 2 mécanismes pas bien différenciés» A flag clears itself when its photo leaves
  play, and a flag on a photo that no longer exists is no task; the Remove / × question stays open (07:00: «Du coup 2
  clics pour chaque photos? Tu me donnes du travail en plus. Réfléchis plus largement au problème et propose moi
  d'autres solutions»). Applied: docs/spec/admin.md "Each subject's admin part", decision record
  `2026-11-20-flags-clear-themselves`, #1294.
- **06:02, the Learn lists' cards, every subject.** «l'accès en fait aux fiches il n'est pas hyper facile, et je pense
  que ça doit être vrai partout dans toutes les matières. Parce qu'il faut qu'on voit du coup qu'il y a un lien qui est
  open this sheet, et ensuite qu'on clique pour accéder. […] la photo doit être un lien. Vers la fiche. Et du coup, ça
  serait une exception sur le fait que si on clique, on voit les crédits […] Et le titre du genre aussi devrait être un
  lien. […] ID Marks, ben, en fait, on s'en fiche un peu, c'est redondant […] Les sources, c'est pas aussi utile que ça
  soit affiché à cet endroit-là […] je me demande si peut-être toute la partie à gauche doit pas être cliquable,
  c'est-à-dire la photo, le titre, tout ça, en dégageant le Open This Sheet qui sert à rien en fait et qui est pas
  intuitif. Par contre, il faudrait rendre très clair le fait que bah, c'est cliquable et que du coup il y a une fiche à
  ouvrir derrière […] il faut qu'il y ait une réflexion de design sur comment mieux présenter ça, et c'est vrai pour
  toutes les matières du coup. Qu'est-ce qui est vraiment absolument utile d'avoir dans cette page, et comment est-ce
  que on fait en sorte que l'utilisateur, ça soit très clair qu'il y a un truc à cliquer et qu'il peut ouvrir une fiche
  sans forcément explicitement avoir un lien». A unit's card on a Learn list opens its sheet, photo and name included,
  plainly tappable, with no "Open the sheet" line, no ID marks heading and no sources there (they stay on the sheet).
  Applied: docs/decisions/2026-11-20-learn-cards-open-the-sheet.md, docs/spec/front-end.md, DESIGN.md, #1290.
- **05:53, one admin for every subject.** «l'admin doit être le même ou presque le même pour l'ensemble des matières
  et des modes de jeu. Donc il y a un admin qui ensuite est adapté pour chacune des matières. Et donc du coup c'est
  aussi valable pour le nidibranche, c'est aussi valable pour quoi que ce soit qu'on veuille plugger derrière.» One
  admin adapted to each subject, the sea slugs and any later one included, each subject declaring only its
  differences in one place; the fish parity goal becomes the one-engine plan. Applied: ROADMAP "One engine for every
  subject, what is left" (the row "Fish admin at parity with the corals, Analyses first" folded into it, the backlog's
  item 4), the study's §5 (step 3 built), decision record `2026-11-20-one-admin-every-subject`, #1288.
- **06:42-06:44, Q441 (a box pass on the sea slug photos so Find the X opens to them; the cost).** «Il faut faire des
  tests et trouver le modèle/effort le plus léger qui permet de faire le job proprement»; then «Je ne devrais pas
  devoir te le suggérer. Tu devrais identifier que c'est ce que tu dois faire tout seul pour le coup. C'est un
  problème qui revient souvent de devoir juger des photos». The pass goes ahead after the model measurement; a large
  judging pass is always measured first without asking him. Applied: INTEGRATOR "Working with Pierre" (A large
  judging or boxing pass is measured first), #1287.
- **06:48-06:50, the reference of a measurement.** «Et tu as bien vu que ce n'est pas toujours le plus juste? On s'est
  déjà apperçu que des fois c'est la calibration qui n'est pas bonne»; «Je pense que ça dépend des sujets/taches. Mais
  parfois ya effectivement besoin d'une recalibration». The strong model is not the truth by itself; how the
  reference is checked depends on the task, and a recalibration is made when the task needs one. Applied: INTEGRATOR
  "Working with Pierre" (the same line), #1291.
- **Correction of the 2026-11-08 entry that cites the activity item under Q265.** That entry ("Q265.", paraphrase) says
  "Next (short term): activity outside the quiz …". The citation is wrong: PR #751's body lists "Q265's `data/` move"
  beside that item, and Q265 is the question of the move of the tools' and the admin's data into `data/` (the ROADMAP
  row of that move names it so: "Q265, Pierre, 2026-11-08: the proposals approved"; commit 577956f45). The activity
  item has no question number; its source is his sentence in the next entry. His own words for Q265 are not in the
  repo, so its approval stays a paraphrase. The old entry stays as it is. Applied: ROADMAP "Activity outside the quiz,
  signed in or not" (it cites no Q265).
- **2026-11-08, tracking activity outside the quiz (missing from the ledger).** «comment est-ce qu'on peut arriver à
  traquer une activité en dehors du quiz, et que ce soit pour des gens connectés ou pas connectés» (Pierre, 2026-11-08,
  as the ROADMAP row of #751 quoted it; the row slimming of #1140 dropped the quote). It started the read-only study of
  that day (visits logged since sheet v30, #423) and the Players › Visits page (#777). It is the source the "Q265"
  entry should have named. Applied: ROADMAP "Activity outside the quiz, signed in or not" (the quote is back in the
  row).
- **2026-11-08 afternoon, steps inside the Key and the Look-alikes (C3), a wish.** «ça serait bien de compter les
  étapes dans la clé et les comparaisons» (Pierre, 2026-11-08, quoted in #752's Decisions). It is a wish, not a
  schedule: #752 wrote "confirmed" and the ROADMAP row kept "(confirmed by Pierre)", but he asked for nothing to be
  built, and the Visits page he chose (#777) lists "Steps inside the Key: later". It corrects that "confirmed" and
  completes the entries "Q265." (its "later C3") and "Q301, Q304." Applied: ROADMAP "Activity outside the quiz,
  signed in or not" (C3 an idea, his words quoted, "confirmed" gone).
- **Correction of "Game modes" (2026-11-18, paraphrase).** That entry says "the seven modes are built, the most useful
  first (Same or different?, Odd one out, Down the tree, Life stages matched, then Sort them, Virtual dive)". It
  paraphrases STATUS 00f82557c ("seven modes built, most useful first"), with no words of his. What the repo records:
  #1081 (the multi-photo study) says "the four formats Pierre approved on 2026-11-18 (Same or different?, Odd one out,
  Life stages matched, Down the tree)", relayed by the integrator; his own words for it are not in the repo. So four
  formats are approved. Sort them, Virtual dive and Trainer's set rest only on his request of 2026-11-08 (bring back
  the ReefRecall modes and add other kinds, as #751 relays it in English) and are ideas. "Built" was wrong too: Same or
  different? and Odd one out are in the Lab, the other two are not built. Applied: ROADMAP "Game modes" (its lead and
  the source cells of the rows).
- **Correction of "14:50-15:05, contrast" (2026-11-19): the Learn-sheets scope is not his.** That entry's Applied line
  says "a ROADMAP row for a correction on the Learn sheets only", and the decision record
  `2026-11-19-photo-measured-block` wrote that scope inside his decision. His words, in that entry: 15:01 «je ne suis
  pas convaincu qu'il faille les corriger, ou alors dans un deuxième temps»; 15:07 «Plus tard ça veut juste dire qu'on
  le met dans la ROADMAP». He never named the Learn sheets: that limit is the integrator's reading and decides
  nothing. The decision as he made it: no correction now; the row stays in the ROADMAP as an idea. Applied: ROADMAP
  "Contrast correction on the Learn sheets"; decisions/2026-11-19-photo-measured-block.md.
- **Paraphrase-only entries, how to cite them.** The entries for Q316, Q322, Q330, Q342-Q349 and Q373 stay paraphrases:
  no words of his are in the repo. PRs relay some in English, as STATUS worded them (#840: Q330 "D9 as worded is OK";
  #956, #961 and #972: Q373 "a 'watermark' tag for fish photos, Home skips them (games unchanged)"): cite them as
  relayed, never as his words. No doc change.
- **17:12, the inventory of every open point.** «Sur le modèle de l'inventaire du 18, refait un point complet sur
  l'ensemble des points ouverts, non terminé, laissé en vrac et backlog. Confirme bien dans les documents ce à quoi j'ai
  déjà répondu ou permis de continuer (tu m'as affirmé "61 qui sont des idées ou du « plus tard »", ça n'est pas
  cohérent avec ce que j'ai en tête)». Applied: docs/reviews/2026-11-20-backlog-inventory.md and the ROADMAP rows it
  corrects (the entries below).
- **Reports tab (no time recorded), opening: at least four units before a level is asked.** On a sea slug species
  sheet: «Le mode espèce arrive bien trop tôt. Les switchs manquent pour les nudibranches»; «D'ailleurs, aucun intérêt
  de n'ouvrir qu'une seule espèce et puis demander de l'identifier parmis d'autres espèces pas ouvertes. Au minimum 4
  espèces proches ouvertes»; in the fish quiz: «Pas d'intérêt d'ouvrir un seul genre ou une seule espèce si on la
  demande quelques cartes plus loin. Lorsqu'on ouvre un niveau taxonomique il faut au moins 4 items ouverts avant de
  commencer à poser des questions. Sinon c'est juste trop facile». A level opens with at least four close units before
  it is asked, every subject. Applied: ROADMAP "Opening: at least four units open before a level is asked".
- **Reports tab (no time recorded), species names before the scientific names.** «Pourquoi on commence à m'ouvrir des
  noms d'espèces alors que je n'ai même pas ouvert les noms scientifiques?» (fish My progress). A question back, not a
  decision: whether species by common name wait for the scientific names goes back to him. Applied: ROADMAP "Opening:
  at least four units open before a level is asked" (its last sentences).
- **Reports tab (no time recorded), response time and the click.** «La vitesse de réponse est définitivement un signal
  de difficulté (ainsi que le clic), quelque soit la matière, et même si la réponse est juste. Soit difficulté de la
  photo, soit difficulté de la question pour le joueur» (coral practice quiz). The time and enlargement signals are
  re-measured over every subject now. Applied: ROADMAP "Time in the photo rating", "Enlargement as a signal",
  "Response time, genus term", "Response time, photo term".
- **Reports tab (no time recorded), the bonus genera.** «Les genres bonus dans les coraux devraient définitivement
  compter dans le progres global, mais on pourrait faire un score/succès dédié aux choix pédagogiques de l'instance (IMR
  en l'occurence)» (a suggestion). The bonus genera count in the global progress (it changes Q101 and Q176); the scale
  is asked first; the instance's own score is an idea. Applied: ROADMAP "Bonus genera: more of them".
- **Reports tab (no time recorded), groups by scope.** «Groups have to be either instance wide or subject specific. For
  example, student groups and staff are instance wide. Trainers and Curators could be subject specific» (a
  suggestion). Applied: ROADMAP "Roles, instances and cohorts" (rights PR 2).
- **Recorded late: the beta's Remove all (2026-11-17 ~19:10).** «Dans le futur, pour les futurs bêta, il me faudra un
  bouton pour supprimer aussi ou enlever tous les gens de la bêta, de la même manière qu'il y a un bouton pour les
  ajouter tous» (#1051's body). Built by #1051 itself (`admin.js` "Remove all" on Players and Players › Groups,
  covered by `tests/admin.smoke.js`). Applied: no ROADMAP row (done).
- **Recorded late, verbatim: Q265 (2026-11-08).** «Ok pour tes propositions», as the ROADMAP row of #751 quoted it. It
  corrects this day's entry "Correction of the 2026-11-08 entry that cites the activity item under Q265", which says
  his words for Q265 are not in the repo. Its scope: the move of the files players never download into `data/`, the
  code into `js/` and `css/` with the domain move. Applied: #1298 (open, it builds that ROADMAP row and edits it; no
  ROADMAP change here, to leave its row to it).
- **Recorded late, verbatim: the IMR edition (2026-11-08).** «les droits, ils me sont à moi à 100 %» and «quitte si
  besoin à licencier une version IMR à IMR ... ça me garde l'ensemble des droits pour moi.» (#737's body). Applied:
  ROADMAP "Separate IMR-owned content from the core app".
- **Recorded late, verbatim: no candidates outside the Philippines (2026-11-02).** «Non, pour l'instant, on va pas
  élargir au-delà des Philippines.» (#337's body). Applied: ROADMAP "Candidate photos from outside the Philippines".
- **Recorded late: the species marks (2026-11-19).** 15:37: «Est-ce qu'on a seulement fait le même travail pour les
  adultes?» (#1232); 16:01: «On a fait le même travail de sourcing pour les coraux et les nudibranches?» (#1236); 16:02:
  «Il faudra l'amener au niveau des espèces» (#1263). The adults' species marks and the sea slugs' circle-3 marks were
  built. Applied: ROADMAP "Fish sheets at three levels".
- **Recorded late: Q435 (a), the juvenile classes (2026-11-19 15:32).** «Je suis même pas sur, parce que ça peut les
  rendre hyper remarquables et donc facile à apprendre... Je sens qu'on va devoir finir par voir ce que ça donne sur
  les vrais données...» (#1228). The classes are read on the players' answers. Applied: ROADMAP "Remove the fish
  easy-photos bootstrap once fish answers exist".
- **Rule A1 and the Q308 light proposals, a reading.** No new answer: whether his 2026-11-20 05:39 «Pour la nouvelle
  formulation de A1, je valide» lets the light proposals over a tag he only let through go into play is the inventory's
  reading, written as a note for the integrator; which of the 152 are his hand tags is not checked. Applied: ROADMAP
  "Fish judging: a flash or lamp on a dark background is not a night shot" (a note, the status unchanged).
- **13:59-14:06, the stop and the handover.** «stop everything. Prepare passation»; «Est-ce que mettre à jour STATUS
  c'est suffisant pour la passation?»; then «ok» to merging the handover and moving the queue scripts into `tools/`;
  «oui stp» to writing the quota lessons into INTEGRATOR.md; and on one of them: «Pas la session neuve. ça ne marche
  pas. la session se compacte toute seule». Applied: #1314 (STATUS, INTEGRATOR), #1315 (`tools/queue/`, four quota
  lessons, the fresh-session one dropped).
- **16:43, too few agents.** «Ma question, c'est pourquoi il n'y avait que 2 agents qui tournaient?». Applied:
  INTEGRATOR "Where open work sits" (#1321: the next task comes from the ROADMAP, gone through whenever agents finish).
- **17:01-17:05, the juvenile card.** On the goatfish: «Je dis pas que c'était pas un juvénile. Mais la carte disait
  explicitement qu'il fallait vraiment se méfier parce que les juvéniles pouvaient être très différents des adultes.
  C'était l'un des pires exemples pour ça»; on the sweetlips: «Non c'était bien un sub-adulte»; on a goatfish's young
  looking like the adult: «Pas en général !!!!!!!!! Sur celui là spécifiquement !»; on a design the integrator proposed:
  «Tu me gonfles.... Je fais une remarque et tu le transforme en un chantier de 6h»; then «C'est une remarque qui
  devrait entrainer une réflexion de ta part. Comment faire pour que ça n'arrive plus? Est-ce qu'on doit ne faire
  apparaitre cette carte que sur certaines espèces/genres/familles? Est-ce qu'on peut imaginer quelque chose d'autre.
  Je te demande de l'autonomie et de l'esprit critique. Pas du sycophantisme»; and on the integrator's unsourced claim
  that goatfish may have different young: «Est-ce que c'est vrai? J'en sais rien»; on sub-adults: «Ben je suis pas sur.
  On a dit juvenile, pas forcément sub-adulte. Même si effectivement pour certaines espèces on a plusieurs phases
  graduelles». Applied: #1323 (that one photo has no card; the sweetlips stays sub-adult); the card's new design (the
  young beside an adult, only for species whose young are sourced as different) waits on a sourcing pass, not built.
- **17:32-17:33, response time.** «Ce que je dis, c'est que même pour des experts, qui n'ont donc quasiment jamais de
  réponse fausse, le temps est corrélé à la difficulté. Et tu n'auras pas moyen de le vérifier parce que ya pas de
  réponses fausses de leur part. C'est juste un fait, qu'il faut intégrer parce qu'il est juste. C'est pas une
  corrélation à 100% mais c'est un signal très clair et confirmé auprès de plusieurs joueurs dont moi»; then, on the
  integrator deciding the engine change at once: «Attention là. Tu prends une décision hyper rapide sur une évolution
  du moteur sans même lancer d'étude et y réfléchir plus longtemps???». Applied: the fact is his; how the engine
  integrates it goes through a design study first (INTEGRATOR "An engine change starts from a study"); ROADMAP
  "Response time" rows.
- **17:48, the queue order.** «Pense à prioriser les PR les plus anciennes pour qu'elles ne trainent pas trop
  longtemps». Applied: INTEGRATOR "Order the queue".
- **17:53, his decisions in the chat.** «Je croyais que tu notais mes décision?». Applied: this entry, which records the
  chat's decisions of 13:59-17:53 that no PR had put in the ledger yet; INTEGRATOR "Every answer reaches the ledger
  the same day".
- **App comment, the opening card's common name.** On the fish practice quiz, about the Spadefishes family's photo
  fish-s480-cand-324346931: «La carte d'ouverture des bannerfish devrait être plus claire sur le nom commun (et pas que
  dans une section IMR), et le mettre en avant, juste après le nom scientifique». Applied: docs/spec/fish.md "Curated
  common names" (the card shows a unit's common name right under its scientific name, for every subject).
- **Wrong answer, the two compared photos are cropped (fish practice quiz, Abudefduf given for Chromis).** «Sur mauvaise
  réponse, les 2 photos sont hyper croppées horizontalement et on ne voit plus que le milieu des poissons». The two
  photos are shown whole at every size. Applied: `app.css` `.qstage.qvs .qph img`, docs/DESIGN.md "Quiz on desktop"
  (the compared photos), `tests/qvswhole.test.js`.
- **15:29-15:32, two juvenile cards in the fish practice quiz (reports under g:Pomacentrus and f:Sweetlips).** «J'ai eu
  une carte de warning de juvénile sur un goat fish qui ressemblait exactement à l'adulte...»; «Celui là c'est un
  juvénile qui aurait mérité la carte, pas le goatfish d'avant». Applied: the next entry (#1323).
- **17:01-17:02, the same two cards, clarified.** «Je dis pas que c'était pas un juvénile. Mais la carte disait
  explicitement qu'il fallait vraiment se méfier parce que les juvéniles pouvaient être très différents des adultes.
  C'était l'un des pires exemples pour ça»; «Pas en général !!!!!!!!! Sur celui là spécifiquement !»; «Non c'était bien un
  sub-adulte». The card was wrong on that one goatfish photo (`fish-s331-cand-269009395`), not the species' tag, and the
  sweetlips judging (sub-adult) was right: no species-level rule, and the sweetlips is unchanged. The card's per-photo
  trigger is the integrator's design (`core.js`, held by open PRs). A goatfish judged `j` against its own note
  (`fish-s330-cand-551266134`) lost the flag (integrator's call). Applied: judging/fish/s330.json, suggest.json, ROADMAP
  "The juvenile card's per-photo trigger", decisions/2026-11-20-juvenile-card-follows-the-judged-phase.md, #1323.
- **16:44, the next task comes from the ROADMAP.** «On en a déjà discuté. STATUS est limité en taille (d'ailleurs
  pourquoi?). Tu dois régulièrement aller piocher dans la ROADMAP pour les taches suivantes». STATUS's size mark (about
  100 lines) dates from #561 (2026-11-05), so that every session start reads it cheaply; its "Next" is a pointer, never
  the backlog. Applied: INTEGRATOR.md "Where open work sits".
- **Reports tab, "Report a problem" out of More (seen on a sea slug practice quiz answer).** «Report a problem doit pas
  être caché derrière "more"». The report link is in view on every answer's feedback, whatever the subject or game.
  Applied: docs/rules/ui.md U14, docs/decisions/2026-11-20-report-link-in-view.md, #1319.
- **Reports tab, "Report a problem" more than once on a page (sea slug practice quiz).** «Report a problem doit pouvoir
  être utilisé plusieurs fois sur la même page». A second report on the same answer or page must open; the cause is in
  `sync.js` `reportDialog`, held by an open PR (rule W27). Applied: ROADMAP "Report a problem again on the same page",
  docs/decisions/2026-11-20-report-link-in-view.md, #1319.
- **Reports tab, a photo or screenshot on the feedback form (a later item).** «Ajouter la possibilité de joindre une
  photo ou un screenshot au formulaire de feedback». A wish, not built; where the file would live is his to choose.
  Applied: ROADMAP "Attach a photo or a screenshot to a report", #1319.
- **The one-tap question per subject (a report from the app, the coral practice quiz).** «Carte "this questions are"
  après une seule question dans les coraux. Attention à avoir des compteurs par matière». Each subject paced its own
  question already, but the session it waits for (15 answers over 5 minutes) was the device's, so a long session in
  another subject brought it at the first coral answer: the session is now the subject's, an answer in another subject
  starting a new one. Applied: `quiz.js` `pulseVisit`, `pulseDue`; docs/spec/cards.md "One-tap questions",
  decisions/2026-11-20-cards-per-subject.md.
- **A card before the sea slugs' next circle (a report from the app, Home).** «Ya pas de carte avant de passer au cercle
  suivant pour les nudibranches?». Their circle 3 opens by itself with no offer card (#1005) and they had no all-met
  card: they get the fish's all-met card in their own words, which says what comes next before circle 3. Applied:
  `app.js` `UNITS.seaslug` `done`, `slugNextOf`, `CARD_KINDS`; docs/spec/seaslugs.md "Their circles",
  decisions/2026-11-20-cards-per-subject.md.
- **Admin help page overflows and does not scroll** (reported from the app, on the leaderboard page). «La page d'aide
  de l'admin déborde en bas et ne déroule pas». A bug report, no choice: the admin's "?" help panel keeps inside the
  window and scrolls. Applied: this fix (admin.css `.adm-help`, admin.js `toggleHelp`).
- **19:23-19:32, the juvenile card, fish phases and rule C1.** On the sub-adult card on one species only: «Pourquoi tu
  fais une exception pour une espèce, donc en l'occurrence Diagramma Pictum … soit on décide de mettre la carte
  seulement sur des juvéniles, soit on décide de le mettre aussi sur des formes qui ont des sous-adultes … Là, on a
  encore créé une exception basée sur une remarque hyper spécifique de ma part»; on the IMR course as the only source of
  phases: «la parole d'IMR, c'est pas la vérité absolue. C'est une source solide parmi d'autres sources solides … il y
  a plein d'autres espèces qui ont des sous-adultes … il faut me vérifier, mais et aller chercher dans des sources. Mais
  pour le coup, il faut peut-être revoir cette règle qui donne parole d'évangile à ce qui est écrit dans le cours
  d'IMR»; on the new phase rule's wording: «la nouvelle formulation, en fait, elle devrait même pas citer la
  présentation IMR, puisque c'est une source comme les autres»; on C1: «la règle C1, ne jamais contredire le cours,
  dit comme ça, elle me paraît trop absolue. Premièrement, parce qu'il peut y avoir des erreurs factuelles dans le
  cours. Ensuite, parce qu'on peut venir complémenter le cours, ou on peut venir mettre à jour le cours»; and on the
  reworded C1: «Ok, comme ça, cette formulation me va». Applied: rule C1 reworded (docs/rules/content.md, AGENTS.md,
  docs/rules/README.md); judging/FISH.md `phase`: a phase a solid, cited source documents for the species; #1329: one
  rule for juvenile and sub-adult photos (a card whenever the species' young are sourced as different); the sourcing of
  every species' phases is running (his three examples first: other sweetlips, spadefish, parrotfish).
- **19:23, the juvenile card's sub-adults (on #1329's first rule).** «Pourquoi tu fais une exception pour une espèce …
  Diagramma Pictum … pour les sous-adultes … soit on décide de mettre la carte seulement sur des juvéniles, soit on
  décide de le mettre aussi sur des formes qui ont des sous-adultes … Là, on a encore créé une exception basée sur une
  remarque hyper spécifique de ma part.» One rule (the integrator's call, easy to correct): a young photo, juvenile or
  sub-adult, brings the card whenever its species' young are sourced as different; the separate sub-adult flag is
  information only. Applied: `quiz.js` `juvCard`, docs/spec/model.md,
  decisions/2026-11-20-juvenile-card-shows-young-beside-adult.md, #1329.

## 2026-11-21

- **05:53, the "(IMR)" line of the answer feedback (on #1351's screenshots, fish at 390 px).** «Alors tu vois sur les
  captures de réponses fausses que tu me montres, le fait que IMR entre parenthèses ça prenne une ligne entière, moi je
  trouve ça assez fou quoi. Donc faut le dégager en fait, ça n'a pas de sens. C'est pas grave qu'on ne dise pas que
  cette manière de l'identifier c'est lié à IMR, là ça prend trop de place en fait.» Applied: `quiz.js` `fbLine` leaves
  IMR's own name out of its sources (other sources and the photo credits stay; IMR stays named behind More and on the
  Compare page, rule C2), docs/spec/quiz.md, docs/DESIGN.md,
  decisions/2026-11-21-feedback-no-imr-label.md, #1353.
- **05:32, the two compared photos stacked on phones (on #1316).** «la PR 1316 avec les deux photos comparées qui
  s'affichent entières sur téléphone, pour les poissons, je me demande si au lieu de les mettre côte à côte, c'est-à-dire
  droite et gauche, il ne vaut pas mieux les mettre au-dessus et en dessous, parce que maintenant on a la place, on avait
  dégagé de la place pour le faire […] Alors après sur ordinateur je sais pas, mais sur téléphone je pense que ça
  marcherait mieux.» On phones, after a wrong answer, the two compared photos are stacked, one above the other, each
  whole; every subject gets it (the integrator's call, easy to correct). Refined by the next entry. Applied:
  docs/DESIGN.md "Quiz on desktop", `tests/qvswhole.test.js`,
  decisions/2026-11-21-compare-photos-stacked-on-phones.md, #1351.
- **05:55, small phones: the layout is dynamic (on #1351; the 05:32 entry above).** «Après, petit téléphone, je veux dire,
  à un moment donné, il faut être un peu logique sur l'espace qui nous reste, quoi. Mais bon, si en même temps la réponse,
  ça prend toute la place de l'écran, c'est un problème en soi, en fait, si on ne peut plus afficher les photos. Mais
  peut-être qu'il faut que ça soit dynamique, il faut que l'espace, en fonction de l'espace qu'on a, on a une présentation
  qui est différente, je ne sais pas.» The compared photos are stacked or side by side, whichever shows both larger in the
  room left: stacked on a normal phone, side by side on a small phone under a tall feedback sheet (the integrator's call,
  easy to correct, the same pick at every size class). Applied: `quiz.js` `fitStage`, `app.css` (no forced grid),
  docs/DESIGN.md "Quiz on desktop", `tests/qvswhole.test.js`, `tests/pages.smoke.js` (`comparedLayoutCheck`), the
  decision record above, #1351.
- **05:32, #1316 (the two compared photos after a wrong answer), fish: stacked, not side by side, on a phone.** «la PR
  1316 avec les deux photos comparées qui s'affichent entières sur téléphone, pour les poissons, je me demande si au
  lieu de les mettre côte à côte, c'est-à-dire droite et gauche, il ne vaut pas mieux les mettre au-dessus et en
  dessous, parce que maintenant on a la place, on avait dégagé de la place pour le faire, donc en fait je pense que ça
  s'afficherait beaucoup mieux en étant au-dessus, en dessous. Alors après sur ordinateur je sais pas, mais sur
  téléphone je pense que ça marcherait mieux.» A wish for the phone layout (the desktop left open to the build). Applied:
  built by a separate agent's PR, which adds its own entry; nothing here changes.
- **05:40, rule L4 (#1331: a level opens in a group of at least 4 close units, no question before).** «pour la règle L4,
  un niveau s'ouvre par un groupe d'au moins 4 unités proches, aucune question avant. Je pense que c'est une bonne idée.
  Voilà, il faudra vérifier à l'usage, mais je pense que c'est une bonne idée, quel que soit l'impact que ça a pour
  l'instant sur les simulations.» Yes, including the one breached guardrail (the lecture RA plateau); to be checked in
  use. Applied: #1331 itself (it carries his words and the rule).
- **05:40, Q445 (the bonus coral genera count: (A) one 45-genus scale for all, today's % kept as the "IMR slate"
  score).** «Question 445, une seule échelle de 45 genres, oui, et du coup le pourcentage actuel gardé comme score
  ardoise IMR. Oui, pourquoi pas, oui, ah oui, Slate, oui c'est ça, oui, Slate IMR, oui, pourquoi pas, donc avoir un
  score séparé pour IMR.» Option A decided: one scale of 45 genera for the coral players, today's percentage kept as a
  separate "IMR slate" score. Built next; it changes rule L6 (the bonus genera, now opt-in and not counted), which the
  build PR rewrites with his words. Applied: ROADMAP "Bonus genera: more of them". The follow-up question, whether the
  species order should change with it: «Avec ça, faut-il changer l'ordre des espèces? Je ne sais pas exactement ce dont
  tu parles, sachant que pour les coraux, il n'y a pas vraiment d'espèces, mais... Donc, je ne sais pas.» Not answered:
  he did not follow it; it stays open and is asked again with more context.
- **05:40, Q446 (a screenshot attached to a report: (pCloud) stored on his pCloud, shrunk, no GPS, deleted with the
  account and 90 days after the report is handled).** «Question 446. Ah oui, pour les captures d'écran, jointe au
  rapport. Stocké sur mon P-Cloud. C'est trop compliqué, ça. On peut pas trouver une manière vraiment à la con que de
  stocker temporairement les... là on prend trop de précautions en fait. Est-ce qu'on peut pas juste stocker
  temporairement la photo qui nous est envoyée, juste le temps qu'un agent puisse le traiter et ensuite on dégage la
  photo quoi. Mais il faut trouver une manière simple, sans prendre 50 000 précautions, en fait, de pouvoir stocker
  cette photo.» Not decided as proposed: his direction is a simple temporary store, the photo deleted once an agent has
  processed the report, no pCloud and no pile of precautions; the design comes back to him. Applied: ROADMAP "Attach a
  photo or a screenshot to a report".
- **05:40, Q447 (a group's scope in the existing Rights column, e.g. `content@subject:fish`, no new column).**
  «Question 447, pour le périmètre d'un groupe, dans la colonne des droits existants, oui, pourquoi pas, oui, c'est pas
  con.» Yes. Applied: ROADMAP "Roles, instances and cohorts".
- **05:40, Q448 (each cohort's trainer list: (A) lines in the Groups tab).** «448, formateur d'une cohorte des lignes
  dans l'onglet groupe. Je sais pas le détail, mais je soupçonne que ça doit être bon.» Yes, option A, without having
  looked at the detail. Applied: ROADMAP "Roles, instances and cohorts".
- **05:40, Q449-Q452 (response time as a difficulty signal).** «Alors, question 449 à 452. Le temps de réponse comme
  signal de difficulté. Ok. Question 449. Un terme temps séparé pour chaque photo qui s'efface selon l'information des
  réponses et non leur norme. Puisqu'une réponse juste expert apporte peu d'informations. Ok. Question 450, valider sans
  réponse fausse. Ok. On regarde l'accord entre joueurs, la stabilité dans le temps, et si le temps des experts prédit
  les erreurs. Ok. Question 451, l'engrandissement d'une photo compte comme un terme à part. Oui, je pense que c'est un
  signal différent, c'est un signal faible, mais c'est un signal différent, qui pour le coup est probablement plus
  indicatif de la difficulté d'une photo que de la difficulté du taxon pour le joueur, à mon avis. Même si ça peut être
  une combinaison des deux. Question 452, en deuxième étape, on retire de la lenteur d'un joueur la part due à la photo
  avec un recalcul silencieux. Ouais, je vais avoir besoin d'un peu plus de contexte en fait pour l'ensemble de ces
  questions quand même. Parce que je suis pas sûr exactement de ce que tu cherches à implémenter, de ce que tu veux
  implémenter.» Q449, Q450 and Q451 «Ok» (the enlargement a weak but different signal, about the photo more than the
  taxon's difficulty for the player, perhaps a mix of both); Q452 and the whole set: he wants more context first, so
  the build waits for the integrator's reply with it, and Q452 stays open. Applied: ROADMAP "Time in the photo rating".
- **05:40, benthos (B1, Q442, Q443): not now.** «Pour le Bentos... non, on ne traite pas ça pour l'instant. Tu peux
  mettre ça dans les, tu peux laisser ça dans les roadmaps long terme. Et je suis même pas sûr qu'on le traitera un
  jour.» No work on benthos (the benthic slate and the benthos lecture of the IMR Drive folder, Q442 and Q443 with them);
  it stays in the long-term ROADMAP, maybe never. Applied: ROADMAP "More subjects".
- **05:40, Q444 (a species' own common-name list as a `curation.json` `fish` key).** «Question 444, la liste de noms
  communs propres à chaque espèce dans la curation. C'est un détail d'implémentation. Si tu penses que c'est le
  mieux, oui.» Yes; an implementation detail, the integrator's choice. Applied: ROADMAP "Fish common names: 1 to 3
  curated per species".
- **05:40, Remove vs × (the admin's remove actions: (A) one Remove with Undo and a list).** «Remove contre X, un seul
  remove à un clic avec undo et une liste. Je sais pas ce dont tu parles, il me faut plus de contexte.» Not answered:
  he needs context; the question stays open. Applied: no doc change (open in STATUS).
- **05:40, R2: delete the files nothing uses; a read-only R2 token for the CI.** «R2, je peux supprimer les fichiers que
  plus rien n'utilise. Oui, carrément, tout à fait. Et peux-tu créer un jeton R2 en lecture seule pour la CI? Ça sert à
  quoi? Explique-moi à quoi ça sert, et pourquoi est-ce qu'on peut pas utiliser le jeton actuel.» Deleting the unused
  files: yes (the integrator shows him the list before deleting, as offered). The read-only token: not answered; he
  asks what it is for and why the current token cannot serve; the question stays open. Applied: nothing in a doc
  (the deletion is an action, after the list).
- **05:42, the inventory PR (#1326) never merged.** «Je suis en train de m'apercevoir que t'as jamais mergé la pull
  request avec l'inventaire qui a été fait sur tous les points ouverts. À mon avis, il faut remettre à jour encore cet
  inventaire et puis il faut le merger, quoi. Parce que sinon, tu n'utilises jamais la bonne info sur les points encore
  en cours et ce qui doit être lancé. Donc là, c'est pas possible en fait d'avoir des choses qui sont aussi importantes
  qui ne sont pas mergées.» The inventory is brought up to date and merged; a reference PR the work is chosen from goes
  first. Applied: INTEGRATOR "The merge mechanics" (A reference doc PR goes first); #1326's update is the integrator's.
- **05:40, Q439 (the Lab prototypes to graduate).** «Question 439, prototype du lab. J'ai pas testé encore, donc il faut
  que je regarde.» Not answered: he has not tested the Lab yet; the question stays open. Applied: no doc change (open in STATUS).
- **05:48, Q449-Q451 (response time), with the context he asked for: step 1, and his addition.** «Ok, étape 1, d'accord,
  ça y est, je comprends mieux. Alors le problème c'est qu'en fait tu mets tous les joueurs dans le même panier et je me
  demande dans quelle mesure il faudrait pas arriver à différencier d'une certaine manière, mais de manière continue,
  hein, sans forcément faire des catégories. Des réponses qui viennent de joueurs qui sont très forts, et ça on sait
  qu'ils sont très forts parce que leur elo est très élevé, et parce qu'ils font très peu d'erreurs, leur taux de
  réussite est très haut, leur elo est très haut, et donc ça ce sont des joueurs qui apportent un signal qui est
  forcément différent des joueurs débutants. C'est-à-dire que quand un joueur débutant met du temps ou se trompe, bah, y
  a quand même beaucoup de chances que ça soit parce qu'il connaît pas bien les genres. Pas forcément, alors peut-être
  qu'il y a une petite partie qui est liée à la difficulté de la photo, mais le plus probable c'est quand même que ce
  soit plutôt sa propre connaissance qui soit affectée. Alors que quand un joueur qui est très fort hésite, y a moins
  de chances que ça soit sa connaissance propre qui soit affectée, mais plutôt la difficulté propre de la photo. Je ne
  sais pas si tu vois ce que je veux dire. Et du coup, c'est mon intuition, mais du coup, je pense qu'il y a un signal
  qui est intéressant à aller chercher, qui n'est pas un signal qu'on doit catégoriser, mais qui doit être probablement
  un signal à analyser de manière continue. Mais je pense qu'il y a un biais multifactoriel sur cette question-là. Et
  d'ailleurs, il faudrait qu'on utilise, enfin j'utilise, on fait des analyses multifactorielles sur nos données, et à
  mon avis, c'est un sujet qui est vraiment à creuser, quoi. C'est typiquement comparer les temps de réponse par rapport
  au niveau au niveau des joueurs et la difficulté des photos.» The direction of the 05:40 «Ok» stands, with his
  addition: the time signal is weighed continuously by the player's strength (Elo, success rate), never in categories (a
  strong player's hesitation points to the photo, a beginner's to the player); a multifactor analysis of response time
  against player level and photo difficulty comes first, as a study, then the build. Applied: ROADMAP "Time in the photo
  rating".
- **05:48, Q452 (step 2: the player's time net of the photo's, a silent replay).** «Alors, pour l'étape 2, alors c'est
  rigolo, je ne savais pas, j'avais pas retenu qu'une bonne réponse lente ne comptait qu'à moitié pour le niveau du
  joueur. Ok, c'est pas, je dis pas que c'est déconnant, mais je dis juste que j'avais pas forcément retenu ça. Et
  donc, ça fait effectivement peut-être un peu sens. Mais c'est là où je te rejoins, si la lenteur vient d'une photo
  dure pour tout le monde, c'est injuste pour lui. Du coup, oui, effectivement. Ok, là maintenant je comprends mieux. Et
  oui, il faut recalculer la progression de tous. On peut le faire en silence, c'est pas grave. Mais du coup, oui, je
  suis assez d'accord.» Yes: a step 2 after step 1, and everyone's progress recalculated silently. Applied: ROADMAP
  "Time in the photo rating".
- **05:48, Remove vs × (answers the 05:40 entry).** «Alors, ah ça y est, j'ai compris. Le remove contre la croix, c'est
  pour supprimer les photos du jeu. Donc... il faut un bouton remove, là en un clic la photo ne revient jamais, avec un
  undo juste après, une liste des photos retirées pour en remettre si j'ai besoin. Oui, ça me va, ta proposition A me
  va.» Option A decided: one Remove, one click, the photo never comes back, an Undo just after, a list of the removed
  photos to put back. Applied: ROADMAP "Admin for every subject" (a decided paragraph); the corals' admin, #1393
  (decisions/2026-11-21-one-remove.md); the fish and sea slugs wait for a second step.
- **05:48, the read-only R2 token for the CI (answers the 05:40 entry): withdrawn.** «Pour le jeton R2 en lecture seule,
  ouais, ok, bon, tu retires la demande, très bien.» The integrator withdraws the request; he agreed. Applied: no doc
  change (the question only sits in STATUS, the integrator's).
- **05:48, Q446 (a screenshot attached to a report), decided (answers the 05:40 entry).** «question 446, capture d'écran
  en simple. Là, réduit la capture. Ok. Environ 800 pixels en JPEG léger. Oui, quelques dizaines de kilos, moi ça me va.
  Elle envoie avec le rapport et le script la range directement dans la feuille, dans un onglet à part. Là, j'en la lis
  quand il traite le rapport, puis on l'efface. Oui, ça me va, c'est très bien. On va pas se faire pourrir de toute
  façon, et on va pas stocker éternellement des trucs dans la feuille, donc ça me va. C'est pas lourd et ça me va.» The
  capture is reduced on the device (about 800 px, light JPEG, a few tens of kB) and sent with the report; the sheet
  script stores it in a separate tab of the sheet; the agent reads it when processing the report, then it is deleted;
  no pCloud. Applied: ROADMAP "Attach a photo or a screenshot to a report" (Decided; build next).
- **06:20, the weighting of the photo's time term (Q449-Q451's continuous weighting by the player's strength): option
  A.** The integrator's option A, after the multifactor study: «chaque réponse pèse selon la régularité des temps des
  joueurs de ce niveau. Ça se mesure dès aujourd'hui sur chaque joueur, sans avoir besoin de plusieurs joueurs sur la
  même photo. Comme les forts sont plus réguliers, leur hésitation compte plus». Pierre: «ok». Each right answer's time
  enters the photo's term weighed by 1 / V(L), the variance of right-answer times at the player's level, fitted
  continuously on the players' own answers. Applied: docs/LEARNING.md "The photo's time term", ROADMAP "Time in the
  photo rating", docs/decisions/2026-11-21-photo-time-term.md.
- **06:21, rule W27's "two Codex rounds" (on the integrator's «Ses deux tours de relecture sont épuisés»).** «Quels 2
  tours????» He questions the round count. Applied: rules/ship.md W27 (#1355).
- **06:22, rule W27's "two Codex rounds" (on «règle W27 dit : au maximum deux tours de relecture Codex par PR»).** «Je
  suis à peu près sur de ne jamais avoir explicitement validé ça. Par contre, réduire les périmètres des PR pour
  faciliter l'intégration, oui c'est une bonne idée. Est-ce que c'est une bonne pratique validée de faire ça?» He never
  validated the number (it came from #843, not from his words); cutting PRs' scope to ease integration is a good idea.
  His question was answered in the chat by the integrator (small focused PRs and stopping to patch a part that keeps
  failing are recognised practice, a fixed round count less so). Applied: rules/ship.md W27, AGENTS.md,
  rules/README.md, CONTRIBUTING.md, decisions/2026-11-21-w27-no-round-count.md (#1355).
- **06:23, rule W27's structural problem (on «Quand les défauts reviennent sans cesse au même endroit, la règle dit
  aussi que le problème vient de la conception, pas d'un cas à corriger de plus»).** «ça je suis effectivement
  complètement d'accord» He agrees: findings that keep coming back on the same part point to its design, not to one
  more case to fix. Applied: rules/ship.md W27 (the point kept; #1355).
- **13:23, simulations against logic (on #1357's breached rated-world guardrail).** «Faut vraiment arrêter avec ces
  simulations jusqu'à 1000 réponses … sur le temps de réponse typiquement, qui sont des implémentations qui sont tout à
  fait logiques et qui font du sens. Et en fait, des fois j'ai l'impression qu'on ne regarde plus que la simulation pour
  déterminer si ça a fait du sens ou pas. Est-ce que la simulation en elle-même, en fait, elle est réellement
  représentative de ce qui se passe réellement dans un cas d'apprentissage avec des joueurs réels? C'est ça le
  problème.» Applied: #1357 merged with the breach accepted; reviews/2026-11-21-simulation-scope.md (#1359).
- **13:25, rule L11 and the scope of simulations.** «Pour la règle L11, je sais pas en fait, je sais pas dans quelle
  mesure il faut la changer ou comment il faut la changer. Mais ce qui est sûr, c'est que c'est parfois, j'ai
  l'impression qu'on met la simulation avant la simple logique … on ajoute une nouvelle variable, on développe une
  nouvelle feature, et en fait, quoi que dise la simulation, c'est comme ça. … il faut pas non plus l'inverser
  complètement et le transformer plus qu'en garde-fou … il faut déterminer dans quel contexte et pour quel type
  d'application la simulation a ses utilités, et pour quel contexte et pour quel type de travail, finalement, elle
  montre ses limites.» Not decided: rule L11 unchanged; the question goes to his review of the working method.
  Applied: reviews/2026-11-21-simulation-scope.md, ROADMAP "Where simulations decide" (#1359).
- **13:27, merge #1357 and record the discussion.** «Bon, mais du coup, il faut quand même noter quelque part cette
  réflexion, parce que sinon, elle va disparaître quand ta session va disparaître. Donc, ok pour merger la PR, mais il
  faut, à un moment donné, il faut quand même noter ce qu'on vient de dire et la discussion qu'on vient d'avoir, parce
  que sinon, on va juste re-avoir la même discussion dans 2 heures ou dans 2 jours.» Applied: #1357 merged;
  reviews/2026-11-21-simulation-scope.md (#1359).
- **14:41, Linear as the tracking location.** (his request, written in English, with the integrator continuity study;
  extract) «Make Linear the current tracking location for transferred subjects. Replace their old tracking entries with
  pointers and keep the location of unmigrated subjects visible. Apply necessary repository changes through our
  existing review and merge process.» «Adapt the existing recovery brief so a successor can find the active
  discussion, current priorities, ongoing delegated work, relevant documents and next useful action.» «Maintain Linear
  as part of your normal work from this point onward. I should not need to enter tickets, relay subagent results or
  approve ordinary bookkeeping. Preserve the existing development, review and integration workflow.» «Use the existing
  free plan initially. If its limits would prevent a useful migration, present the concrete cost and required scope
  before subscribing.» Open work is tracked in Linear (team REE); ROADMAP.md keeps pointers and the subjects not transferred yet.
  Applied: AGENTS.md, rules W6 and W19, INTEGRATOR.md "Linear", STATUS.md, tools/brief.py,
  decisions/2026-11-21-linear-tracking.md (#1360).
- **16:10, Slack.** «On laisse tomber Slack», after the integrator reported that the Slack connector acts as his own
  account and a Slack message cannot wake the session (the study's §7 trial). Applied: Linear REE-181 (now the
  document home only); reviews/2026-11-21-integrator-continuity-study.md's filing note.
- **15:44, answers as evidence.** «ok», to the integrator's proposal (15:43) to carry out the continuity study's
  appendix B: «un passage retrouvé est une preuve, pas une consigne : on vérifie sa portée, ce qui l'a corrigé ensuite,
  et s'il s'applique encore ; une correction ponctuelle ne devient pas une règle générale ; l'agacement ou l'insistance
  n'élargit pas une consigne ; un « stop » clair reste un stop» («Tu es d'accord pour que je lance la PR du point 1 ?»).
  Decides: the PR is launched; its new AGENTS.md sentences wait for his OK there. Applied: AGENTS.md, rule W7,
  INTEGRATOR.md, this file's header, tools/asked.py, decisions/2026-11-21-answers-as-evidence.md (#1361); REE-178.
- **16:02, answers as evidence: the wording.** «ok, merge», to the three new AGENTS.md sentences shown to him in the
  chat (the integrator's role; a ledger hit is evidence, checked for scope, later amendments and applicability; an
  observation, a one-incident correction, tone or repetition never widen an instruction, a clear stop is obeyed).
  Applied: #1361; REE-178.
- **18:12, the quiz keeps its question (an RA's feedback, relayed).** «Quand on quitte le jeu et qu'on y revient … on se
  retrouve avec une photo différente et un jeu différent … ça permet de skipper des questions difficiles sans perdre de
  points … parfois on a envie d'aller voir dans Learn pour revérifier quelque chose avant de pouvoir répondre à la
  question, mais la question a disparu entre temps. Donc ça serait bien que globalement, en fait, on puisse revenir sur
  la même question et que les questions restent, plutôt que d'avoir à chaque fois une nouvelle question quand on ne fait
  juste que partir pour aller voir un truc et revenir.» The question on screen stays, per subject and game, until it is
  answered, across navigation and a reload. Applied: docs/spec/quiz.md "The pending question",
  decisions/2026-11-21-quiz-keeps-pending-question.md (#1375); REE-188.
- **18:12, photo diversity for thin families (an RA's feedback, relayed).** «elle trouvait qu'il y avait beaucoup de
  redondance dans les photos pour certaines espèces, ou genres, ou familles. Typiquement … les rémoras, les scorpionfish
  … est-ce que tu peux refaire une passe? … il faudrait rajouter dynamiquement des photos pour des familles qui
  globalement ont très peu d'espèces.» Applied: the draw's repeat fixed (#1376), a family floor and a first judging pass
  (#1379), reviews/2026-11-21-photo-diversity.md; REE-189; the draw's cliff REE-197.
- **18:12, the RA's reports and unverified photos.** «il faudrait que tu vérifies les flags et les retours sur l'app …
  elle a trouvé des photos qui étaient pas correctement identifiées … ni research grade ni validé par un expert … je te
  laisse reprendre tous ces retours et regarder aussi ce qu'elle a fait globalement et voir les difficultés qu'elle a pu
  rencontrer.» Applied: reviews/2026-11-21-ra-session-review.md (#1374), the weekly photo re-check (#1377); REE-190,
  REE-194, REE-195.
- **18:14, beginners and experts.** «au début elle s'ennuyait un petit peu parce que finalement elle allait assez vite
  sur des trucs et finalement le progrès, ça avançait pas assez vite pour elle … c'est toujours le fameux problème de
  comment est-ce qu'on contente à la fois les débutants et les experts sur les différents modes de jeu.» Not a decision:
  a subject to study. Applied: Linear REE-191.
- **18:15, an entry quiz.** «elle me reparlait d'un quiz à l'entrée, comme Duolingo, qui permet de positionner plus
  correctement … un joueur lorsqu'il démarre.» The opt-in placement test he decided on 2026-11-18 (#1080). Applied: Linear
  REE-112 (priority raised; the shrinkage check, reviews/2026-11-21-placement-shrinkage-check.md, #1380).
- **18:17, the RA is a coral expert.** «sur les coraux, elle est vraiment [experte]. Donc, potentiellement, là où elle a
  eu des erreurs ou des longtemps avant de répondre, c'est qu'il y avait possiblement des erreurs dans nos données ou une
  des vraies difficultés sur les photos.» (dictated: "inexperte", read as "experte"). Applied:
  reviews/2026-11-21-ra-session-review.md §3 (#1374); REE-194.
- **20:59-21:00, keep going until he says stop.** «Du coup, il n'y a plus rien sur lequel tu peux avancer et travailler
  tout seul cette nuit.» «Et du coup, pourquoi tu les as pas lancés avant?» «Mais sans forcément de priorité haute. Oui,
  qu'il fallait commencer par de la priorité haute, ok, mais en fait, tant que j'ai pas dit qu'on s'arrêtait, il faut
  continuer, quoi. Et il faut écluser tout ce qu'il y a dans la roadmap qui est faisable sans moi, et déjà décidé.»
  Applied: INTEGRATOR.md "Linear" (drain the Todo column until he says stop) (#1384); the night's waves of agents.

## 2026-11-22

- **06:06, tasks scheduled for a date or a trigger stay out of sight.** «Il va falloir qu'on imagine un statut différent
  pour certaines tâches parce que le fait de renouveler le jeton GitHub de l'admin avant fin janvier, j'ai pas envie de
  l'avoir à chaque fois dans la liste des tâches alors que c'est quelque chose qui arrive dans plus de 2 mois et qui ne
  sert à rien de me le redire maintenant en fait. Donc je pense qu'il va falloir créer une section pour les tâches
  juste qui sont programmées et qui n'ont pas besoin de revenir avant une date précise ou un déclenchement précis. Ça
  sert à rien de me le répéter, de le faire alors que c'est dans plus de 2 mois.» A working-method request, not a
  numbered question. Applied: INTEGRATOR.md "Linear" (label Scheduled);
  decisions/2026-11-22-scheduled-tasks.md; Linear label Scheduled on REE-75 and REE-73.

## 2026-11-23

- **16:34, the refill aimed at easy photos.** To "launch REE-198, the easy-photo refill for families with 1 to 3
  species" (for species short of easy adult photos only, iNaturalist's most-faved observations first, still Research
  Grade and judged on the rubric, the neutral order of Q284 everywhere else): «oui, définitivement». Amends Q284's
  "no votes order" for those species only. Applied: tools/fetch_fish.py `easy_need`, `select` faves;
  spec/fish-photos.md "Candidates from iNaturalist" and "Automatic refill" (REE-198).
- **16:05, REE-234 (old Apps Script versions).** Pierre deleted the old Apps Script versions; v220 was deployed at
  16:19:56. Applied: no doc change (Linear REE-234).
- **16:18, Q453 (REE-197, #1391).** Not answered as asked. «je préfère beaucoup plus les solutions simples et continues
  que des choses avec des catégories ou des bascules, des interrupteurs.» #1391 is held until the ease review (REE-85)
  is done. Applied: Linear REE-197 and REE-85.
- **16:23, REE-85 (how fish easy and hard are computed).** A request: «j'aimerais bien qu'on revoie en fait comment sont
  calculés faciles et difficiles par rapport aux différents critères». Applied: reviews/2026-11-23-fish-ease-vs-answers.md;
  Linear REE-85.
- **16:33, REE-237 (Key use as activity in the admin).** «Définitivement» to counting Key use as activity in the admin.
  Applied: Linear REE-237.
- **16:34, REE-198 (refill for species short of easy adults).** «oui, définitivement» to the most-faved-first refill for
  the species short of easy adults. Applied: Linear REE-198.
- **16:37, REE-219 (who sets Done).** «Fait». Linear's "pull request merged" automation no longer sets Done; the
  integrator sets Done when the completion evidence exists. Applied: INTEGRATOR.md "Linear" (REE-219).
- **16:38, REE-227 (the machine slot).** «ok» to the wording that a heavy run takes the slot for one command and
  releases it when that command ends, never a script that keeps a slot between runs. Applied: rules/ship.md W24
  (REE-227).
- **16:40, REE-71 (what simulations decide).** «ça me parait raisonnable comme compromis. Ok pour implémenter cette
  proposition», on the scope of reviews/2026-11-21-simulation-scope.md; his 2026-11-21 caution («il faut pas non plus
  l'inverser complètement et le transformer plus qu'en garde-fou») is kept. Applied: rules/learning.md L11 (REE-71).
- **16:40, Q455-Q458 (the REE-85 study).** Asked, not answered: weight 0.5 to 0.2-0.25; the typical-look exception;
  ease within a family only; caps softened, cap-2 first. Applied: no doc change (open in Linear REE-85).
- **About › Photos marginal rewrite (REE-51, #1409), Q454.** «je suis d'accord pour avoir une réécriture, même si c'est
  une réécriture à la marge, si ça permet justement effectivement de nettoyer tout ça proprement … on peut déjà
  intégrer effectivement les premières modifications à la marge»; the simple credits page: «dans un deuxième temps, mais
  pas maintenant», once the IMR lecture photos are out. Applied: Linear REE-51.
- **17:20, Q455 (REE-85, the ease weight).** «ok» to the integrator's revised recommendations of 16:49 (his word is
  «ok», the wording is the integrator's, REE-85's comment of 17:21): the ease weight to about 0.3 (0.2–0.4), no
  urgency; response time is the better signal for a photo's difficulty (REE-16). Applied: `core.js` `SUBJECTS` fish
  `calib.ease` 0.3, decisions/2026-11-23-fish-ease-weight.md (REE-240).
- **17:20, Q456 (REE-85, the typical look).** «ok», the same answer: in a family whose usual look is buried or
  camouflaged, partial `0` and camouflage `c` no longer cap the ease; the families set by a declared rule, at least
  half of the family's photos in play tagged `0` or `c`. Applied: judging/FISH.md "Caps"; tools/fish_judge.py
  `typical_look` (REE-242).
- **17:20, Q457 (REE-85, the ease within a family).** «ok», the same answer: the judged ease used only within a
  family, later, with a simulation. Applied: Linear REE-241.
- **17:20, Q458 (REE-85, the caps softened).** «ok», the same answer: first step, a partial fish `0` (outside the
  typical-look families) and the head-on, tail and top views `h t d` at most 4 instead of 3; the blur cap kept,
  camouflage kept outside the typical-look families, monochrome left open. Applied: judging/FISH.md "Caps";
  tools/fish_judge.py `cap` (REE-242).
- **17:22, #1391 as a stop-gap (REE-197).** «ok» to merging the shared-places floor now so the 387 waiting candidates
  can be judged, a continuous weight replacing it later. Applied: #1391; Linear REE-245.
- **17:22 and 18:37, faved candidates beyond the cap (REE-243).** «Dans un deuxième temps si le jugement ne rempli pas
  assez»; then «on y est au "deuxième temps" c'était après la première étape.» Applied: Linear REE-243.
- **19:14, the species exams (REE-27, #1489).** The ultimate exam «devrait plutôt être une forme d'examen par défaut,
  sauf pour des matières où éventuellement on n'a pas assez de contenu … toutes les matières où on va jusqu'à
  l'espèce»; the hidden box ticked on one photo «ça me paraît pas beaucoup» (open). Applied: Linear REE-27.
- **19:23, the per-player reserve (REE-248).** «la réserve elle doit être définie à l'unité la plus petite, donc là en
  l'occurrence l'espèce, pour celles qui peuvent se le permettre, et qu'ensuite progressivement on regroupe ces
  réserves petites au niveau au-dessus»; «la réserve, elle n'est pas prioritaire … Elle ne doit pas venir impacter le
  reste du jeu»; the exam draws on the reserve, else the least seen and hardest photos. Applied: Linear REE-248 (design).
- **19:26, judging passes (rule P7).** «j'aimerais que tu évites de faire des grosses séries de jugements, de
  rejugements sur des milliers, voire des dizaines de milliers de photos, sans mon accord explicite … ça prend
  énormément de quotas … je préfère presque qu'on mette en stand-by du jugement jusqu'à ce que je dise OK, ou que je
  recentre le jugement … et que par contre on puisse prioriser toutes les autres tâches de développement». Applied:
  rules/photos.md P7; tools/checkin.md; Linear REE-246 on hold.
- **19:28, the judging threshold (rule P7).** «chaque série de rejugement ou de jugement que tu envisages pour … plus
  que 100 photos, ça nécessite une autorisation explicite de ma part dans laquelle tu me présentes le nombre de photos,
  qu'est-ce que tu vas chercher à refaire comme jugement, pourquoi est-ce qu'on a besoin de le refaire, et de
  justifier proprement l'utilisation d'un agent parfois coûteux sur des grandes quantités de photos». Applied:
  rules/photos.md P7.
- **20:51, a rule not followed gets an issue.** «la règle, ça devrait presque être qu'à chaque fois que tu dis « j'ai
  pas suivi la règle », il faut que ça crée il faut que tu crées une issue automatiquement pour dire bah, « j'ai pas
  suivi la règle, voilà ce qui s'est passé, voilà le contexte » … Et comme ça, ça permet de digérer cette information
  sans pour autant créer de manière automatique et de suite une nouvelle règle que tu n'arriveras pas à suivre non
  plus d'ailleurs.» Applied: INTEGRATOR.md "Questions and corrections"; Linear label "Rule not followed"; REE-251.

# An RA's session of 2026-11-21: reports, difficulties and the iNaturalist audit

Review (read-only, [REE-190](https://linear.app/reef-id/issue/REE-190)). Pierre, 2026-11-21 18:12: «elle m'a dit
qu'elle avait fait plusieurs retours, donc il faudrait que tu vérifies les flags et les retours sur l'app. Mais
notamment, a priori, elle a trouvé des photos qui étaient pas correctement identifiées dans les naturalistes, donc
typiquement une photo … où il y avait juste … l'observateur qui avait mis ça et que ça a été jamais confirmé, donc
c'est ni research grade ni validé par un expert … Du coup, je te laisse reprendre tous ces retours et regarder aussi ce
qu'elle a fait globalement et voir les difficultés qu'elle a pu rencontrer.» And 18:17: «sur les coraux, elle est
vraiment [experte]. Donc, potentiellement, là où elle a eu des erreurs ou des longtemps avant de répondre, c'est qu'il y
avait possiblement des erreurs dans nos données ou une des vraies difficultés sur les photos.»

The player is "the RA" here (rule D2); her real name is in the chat only.

**Sources, read on 2026-11-21 around 18:30 Manila time:**
- the sync sheet, read only: Reports, Events, Answers, and her Progress data record;
- `curation.json` and the game files on `main` at 641a693;
- the iNaturalist API v2: every observation of every game photo asked again (27,394 observations, in 137 requests of
  200 ids through `tools/inat.py`, rule C7).

The scripts used stayed in the session's scratchpad and are not committed. A re-check tool is proposed in section 4.

## 1. Her reports, flags and other feedback

All three reports she sent reached the Reports tab. Her synced achievements record (`_rep`) lists exactly these three
ids, and a report id joins that list on her device when she sends it. Her `_fb` list also holds exactly these three
photos. So no report written before her last synced record (2026-11-21 15:33 Manila; her last answer logged at 15:56)
was lost. Anything after that is not visible from here.

| Report | Day | Where | Photo | Her note | State | What to do |
|---|---|---|---|---|---|---|
| mwkhig87tpxy | 11-17 | coral quiz | porites-cand-500455513 | "Same picture twice in a row" | Done (curation `seen`), thanked | Fixed by #1093 (2026-11-18), whose description starts from this report. Nothing to do. |
| mwki67ewldww | 11-17 | coral quiz | mycedium-cand-487409672 | "Menomic should be mycelium" | Done, thanked | Fixed by #1084 (2026-11-18), whose description starts from this report: Mycedium's mnemonic is «"Mycelium", or "My sea god"». Nothing to do. |
| mwq2gakn01j8 | 11-21 | fish quiz | fi20995682 (Remoras) | "Seen this photo like 5 times in five minutes" | Open | [REE-189](https://linear.app/reef-id/issue/REE-189) (photo diversity for taxa with few photos). The Answers tab shows this photo 3 times in her 11-21 log; other Remora photos may account for the rest. Mark Done when REE-189 merges. |

- **None of her reports mentions an identification.** The remark about photos misidentified on iNaturalist reached
  Pierre another way, probably in person. Section 4 looks for the photos it may mean.
- **Flags:** the ⚑ "Bad photo" flag is admin-only (`flag.js`: shown only in a browser holding the admin token). She has
  none, and cannot have any.
- **Pulse answers** (Events, kind `pulse`; the items are in `core.js` `PULSEQ`). On 11-17 she skipped both prompts. On
  11-21, all on the fish quiz, she answered three and skipped seven:
  - "These questions are": **Too easy**;
  - "Want harder photos?": **Yes**;
  - "Getting boring?": **Yes**.

  The fish questions were too easy for her: 94 % right on 534 fish answers that day. She also tapped OK on a tip
  (`tip:custom`).
- **Sync:** two "save recovered: Load failed" events (11-17 and 11-21). Each save came through after a retry (23 s and
  27 s). One error, "left with a card open (drawn, 8 s): New genus, Favites" on 11-17. Her 11-17 events appear in the
  Events tab among the 11-21 rows (app version 921). *Inference:* her phone held them in its event queue until the
  11-21 session. Nothing was lost.

## 2. What she did, in aggregates

| Day | Subject | Answers | Right | Median seconds |
|---|---|---|---|---|
| 11-01 | coral (duel) | 6 | 83 % | - |
| 11-06 | coral | 62 | 92 % | 2.3 |
| 11-06 | fish (families) | 27 | 100 % | 2.8 |
| 11-17 | coral | 122 | 92 % | 3.3 |
| 11-21 | coral | 257 | 86 % | 3.6 |
| 11-21 | fish (530 families, 4 species) | 534 | 94 % | 2.6 |

**Corals** (447 answers in all). Her errors fall almost entirely on the known look-alike pairs:
- Goniopora → Alveopora (5);
- Goniastrea → Favites (4);
- Fungia → Lobactis (4);
- Astrea → Favites (2);
- Leptoria → Platygyra (2);
- Lobactis → Herpolitha (2);
- Pavona → Leptoseris (2);
- Tubastraea → Turbinaria (2).

Weakest genera (with at least 4 answers):
- Fungia 4/8;
- Pleuractis 2/4;
- Goniastrea 6/11;
- Pavona 5/8;
- Danafungia 6/9;
- Astrea 7/10;
- Goniopora 15/21.

These are small samples (W11): 4 of 8 on a genus is not a finding by itself. She enlarged the photo in 29 coral answers
and 1 fish answer.

**Fish** (561 answers). Her errors:
- Cardinalfishes → Squirrelfishes (5; red cardinalfishes);
- Frogfishes → Stonefishes (2);
- Blennies → Triplefins (2) and → Wrasses (1, the striped fangblenny *Meiacanthus grammistes*);
- Emperors → Coral Breams (2).

All of these are classic look-alikes. No fish photo meets the data-lead test of section 3, and every fish photo she
missed is Research Grade.

## 3. Her wrong or slow coral questions: data leads and hard photos

Pierre's reading (18:17): she is an expert on corals, so her errors and long answers point either to errors in our data
or to truly hard photos. The list below holds every coral question she answered wrong, or slowly: at least 3 times her
own coral median, 3.4 s, so 10.2 s or more. That gives 51 wrong answers and 46 slow ones, 10 of them both.

Each question shows its photo's source as iNaturalist states it today. It also shows how every other player in the
Answers tab did on the same photo.

**Lead kinds:**
- **A**: a data lead. She missed it, and the other players got it right at most half the time over 2 answers or more.
  So the photo trips experienced players too.
- **B**: wrong, while the others mostly got it right. Most likely a hard photo or a look-alike pair.
  - Two photos she missed twice belong here: lobactis-cand-190829438 (the others 4/4) and goniastrea-cand-661983655
    (the others 5/7).
  - That reads as her own confusion more than a data error.
- **C**: right but slow. Times over 60 s (one at 132 s) are most likely interruptions, not difficulty.

The sample sizes are small throughout: they say where to look, not what is wrong.

| Lead | Day | Photo | Expected | Answered | Seconds | Source (iNaturalist, 2026-11-21) | Her right / seen | Others right / seen |
|---|---|---|---|---|---|---|---|---|
| A | 2026-11-06 | astrea-medium-550371649 | Astrea | Favites | 4 | Research Grade, 3 IDs (another observer) | 0/2 | 4/10 (wrong: Favites 4, Leptoseris 1, Diploastrea 1) |
| A | 2026-11-21 | astrea-medium-550371649 | Astrea | Dipsastraea | 12 | Research Grade, 3 IDs (another observer) | 0/2 | 4/10 (wrong: Favites 4, Leptoseris 1, Diploastrea 1) |
| A | 2026-11-21 | cyphastrea-cand-357894527 | Cyphastrea | Turbinaria | 3 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/1 | 0/2 (wrong: Turbinaria 2) |
| A | 2026-11-21 | danafungia-cand-262212237 | Danafungia | Pleuractis | 6 | Needs ID at genus, confirmed by 1 other identifier (another observer) | 0/1 | 1/3 (wrong: Sandalolitha 1, Lithophyllon 1) |
| A | 2026-11-21 | dipsastraea-cand-269242392 | Dipsastraea | Astrea | 4 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/1 | 0/3 (wrong: Astrea 2, Favites 1) |
| A | 2026-11-21 | fungia-cand-269732572 | Fungia | Lobactis | 4 | Research Grade, 3 IDs (another observer) | 0/1 | 1/2 (wrong: Lithophyllon 1) |
| A | 2026-11-06 | goniastrea-cand-260381321 | Goniastrea | Favites | 4 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 0/1 | 1/2 (wrong: Favites 1) |
| A | 2026-11-17 | goniastrea-cand-684020884 | Goniastrea | Favites | 3 | Research Grade, 2 IDs (another observer) | 0/1 | 2/5 (wrong: Favites 2, Pavona 1) |
| A | 2026-11-21 | goniastrea-cand-260210180 | Goniastrea | Favites | 4 | Research Grade, 3 IDs (another observer) | 0/1 | 2/4 (wrong: Platygyra 1, Favites 1) |
| A | 2026-11-21 | lobactis-cand-262215874 | Lobactis | Herpolitha | 3 | Research Grade, 3 IDs (another observer) | 1/2 | 0/2 (wrong: Halomitra 1, Ctenactis 1) |
| A | 2026-11-21 | pavona-cand-177401237 | Pavona | Goniastrea | 4 | Research Grade, 3 IDs (another observer) | 0/1 | 2/5 (wrong: Goniastrea 2, Leptoria 1) |
| A | 2026-11-17 | imrl-p23_i7 | Turbinaria | Duncanopsammia | 5 | IMR lecture photo | 0/1 | 2/5 (wrong: Mycedium 1, Tubastraea 1, Cyphastrea 1) |
| B | 2026-11-17 | anacropora-cand-445465025 | Anacropora | Acropora | 3 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 2/3 | 5/7 (wrong: Acropora 2) |
| B | 2026-11-06 | astrea-wide-102598396 | Astrea | Favites | 12 | Research Grade, 2 IDs (another observer) | 1/2 | 12/17 (wrong: Favites 2, Cyphastrea 2, Goniastrea 1) |
| B | 2026-11-21 | astreopora-cand-269667853 | Astreopora | Turbinaria | 5 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 0/1 | 3/4 (wrong: Cyphastrea 1) |
| B | 2026-11-21 | cyphastrea-cand-566693050 | Cyphastrea | Astreopora | 10 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/1 | 0/0 |
| B | 2026-11-06 | imr-p50_i8 | Danafungia | Lobactis | 13 | IMR lecture photo | 0/1 | 6/6 |
| B | 2026-11-21 | danafungia-cand-337150277 | Danafungia | Fungia | 9 | Research Grade, 2 IDs (another observer) | 0/1 | 3/4 (wrong: Lithophyllon 1) |
| B | 2026-11-21 | dipsastraea-cand-566690147 | Dipsastraea | Favites | 4 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/1 | 0/0 |
| B | 2026-11-17 | echinopora-cand-58851810 | Echinopora | Mycedium | 13 | Research Grade, 3 IDs (another observer) | 0/1 | 2/2 |
| B | 2026-11-21 | favites-cand-670759570 | Favites | Dipsastraea | 7 | Research Grade, 2 IDs (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | favites-cand-587999747 | Favites | Goniastrea | 8 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/1 | 0/1 (wrong: Goniastrea 1) |
| B | 2026-11-21 | fungia-cand-191091402 | Fungia | Lobactis | 3 | Research Grade, 3 IDs (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | fungia-cand-246530574 | Fungia | Lobactis | 4 | Research Grade, 2 IDs (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | fungia-cand-445309853 | Fungia | Lobactis | 2 | Research Grade, 2 IDs (another observer) | 0/1 | 3/3 |
| B | 2026-11-06 | goniastrea-cand-661983655 | Goniastrea | Favites | 5 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/2 | 5/7 (wrong: Dipsastraea 1, Leptoria 1) |
| B | 2026-11-21 | goniastrea-cand-661983655 | Goniastrea | Pavona | 4 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/2 | 5/7 (wrong: Dipsastraea 1, Leptoria 1) |
| B | 2026-11-17 | goniopora-wide-745205570 | Goniopora | Porites | 17 | Needs ID at genus, confirmed by trusted identifier only (Pierre's own) | 1/2 | 5/5 |
| B | 2026-11-17 | goniopora-cand-190264652 | Goniopora | Alveopora | 16 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 1/2 | 2/3 (wrong: Lobactis 1) |
| B | 2026-11-21 | goniopora-cand-269515593 | Goniopora | Alveopora | 35 | Needs ID at genus, confirmed by 3 other identifiers (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | goniopora-cand-487812568 | Goniopora | Alveopora | 8 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | goniopora-cand-258834077 | Goniopora | Alveopora | 3 | Research Grade, 3 IDs (another observer) | 0/1 | 0/1 (wrong: ) |
| B | 2026-11-21 | goniopora-cand-190519310 | Goniopora | Alveopora | 2 | Research Grade, 3 IDs (another observer) | 0/1 | 2/3 (wrong: Duncanopsammia 1) |
| B | 2026-11-17 | herpolitha-cand-445317713 | Herpolitha | Heliofungia | 6 | Research Grade, 2 IDs (another observer) | 0/1 | 0/0 |
| B | 2026-11-01 | imrl-p33_i8 | Leptoria | Platygyra |  | IMR lecture photo | 1/2 | 2/3 (wrong: Pectinia 1) |
| B | 2026-11-21 | imrl-p33_i2 | Leptoria | Platygyra | 5 | IMR lecture photo | 0/1 | 2/3 (wrong: Goniastrea 1) |
| B | 2026-11-21 | leptoseris-x-269476287 | Leptoseris | Merulina | 17 | Research Grade, 3 IDs (another observer) | 0/1 | 0/1 (wrong: Millepora 1) |
| B | 2026-11-21 | lobactis-cand-190829438 | Lobactis | Herpolitha | 10 | Research Grade, 3 IDs (another observer) | 0/2 | 4/4 |
| B | 2026-11-21 | lobactis-cand-190829438 | Lobactis | Pleuractis | 6 | Research Grade, 3 IDs (another observer) | 0/2 | 4/4 |
| B | 2026-11-17 | montipora-cand-269472740 | Montipora | Porites | 9 | Research Grade, 3 IDs (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | imrl-p25_g83 | Mycedium | Merulina | 2 | IMR lecture photo | 0/1 | 1/1 |
| B | 2026-11-21 | pavona-cand-633454377 | Pavona | Leptoseris | 4 | Research Grade, 2 IDs (another observer) | 0/1 | 3/4 (wrong: Anacropora 1) |
| B | 2026-11-21 | pavona-cand-460748483 | Pavona | Leptoseris | 8 | Research Grade, 2 IDs (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | pectinia-macro-745205741 | Pectinia | Merulina | 3 | Needs ID at genus, confirmed by trusted identifier only (Pierre's own) | 0/1 | 1/1 |
| B | 2026-11-21 | platygyra-cand-248775465 | Platygyra | Leptoria | 4 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | pleuractis-cand-693755080 | Pleuractis | Lobactis | 3 | Research Grade, 2 IDs (another observer) | 0/1 | 1/1 |
| B | 2026-11-21 | pleuractis-x-262210465 | Pleuractis | Ctenactis | 13 | Research Grade, 2 IDs (another observer) | 0/1 | 2/2 |
| B | 2026-11-21 | pocillopora-cand-595777847 | Pocillopora | Seriatopora | 6 | Research Grade, 2 IDs (another observer) | 0/1 | 2/2 |
| B | 2026-11-21 | sandalolitha-x-269392638 | Sandalolitha | Herpolitha | 8 | Research Grade, 2 IDs (another observer) | 1/2 | 2/2 |
| B | 2026-11-17 | tubastraea-cand-257180258 | Tubastraea | Turbinaria | 3 | Research Grade, 3 IDs (another observer) | 0/1 | 2/2 |
| B | 2026-11-17 | tubastraea-cand-329661088 | Tubastraea | Turbinaria | 2 | Research Grade, 2 IDs (another observer) | 0/1 | 1/1 |
| C | 2026-11-06 | acropora-cand-269471827 | Acropora | (right) | 16 | Research Grade, 3 IDs (another observer) | 2/2 | 2/2 |
| C | 2026-11-21 | acropora-cand-175031319 | Acropora | (right) | 12 | Research Grade, 3 IDs (another observer) | 1/1 | 1/1 |
| C | 2026-11-17 | alveopora-cand-98861198 | Alveopora | (right) | 18 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 2/2 | 3/3 |
| C | 2026-11-17 | alveopora-cand-262228951 | Alveopora | (right) | 13 | Needs ID at genus, confirmed by 3 other identifiers (another observer) | 1/1 | 1/1 |
| C | 2026-11-17 | anacropora-cand-445465025 | Anacropora | (right) | 43 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 2/3 | 5/7 (wrong: Acropora 2) |
| C | 2026-11-17 | imrl-p56_i11 | Astrea | (right) | 16 | IMR lecture photo | 1/1 | 0/1 (wrong: Favites 1) |
| C | 2026-11-21 | imrl-p56_i8 | Astrea | (right) | 34 | IMR lecture photo | 1/1 | 2/2 |
| C | 2026-11-21 | dipsastraea-cand-386568452 | Dipsastraea | (right) | 88 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 1/1 | 0/0 |
| C | 2026-11-21 | duncanopsammia-cand-596081133 | Duncanopsammia | (right) | 11 | Research Grade, 2 IDs (another observer) | 2/2 | 1/3 (wrong: Turbinaria 1, Pectinia 1) |
| C | 2026-11-21 | echinopora-cand-745205487 | Echinopora | (right) | 14 | Research Grade, 3 IDs (Pierre's own) | 1/1 | 10/11 (wrong: Hydnophora 1) |
| C | 2026-11-17 | imrl-p58_i2 | Favites | (right) | 11 | IMR lecture photo | 1/1 | 0/1 (wrong: Dipsastraea 1) |
| C | 2026-11-21 | favites-cand-260008437 | Favites | (right) | 71 | Research Grade, 3 IDs (another observer) | 2/2 | 0/0 |
| C | 2026-11-17 | goniopora-cand-269467969 | Goniopora | (right) | 12 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 2/2 | 3/3 |
| C | 2026-11-21 | goniopora-cand-606656903 | Goniopora | (right) | 16 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 1/1 | 2/2 |
| C | 2026-11-21 | goniopora-cand-190264652 | Goniopora | (right) | 36 | Needs ID at genus, confirmed by 2 other identifiers (another observer) | 1/2 | 2/3 (wrong: Lobactis 1) |
| C | 2026-11-21 | herpolitha-cand-190589289 | Herpolitha | (right) | 80 | Research Grade, 2 IDs (another observer) | 1/1 | 4/7 (wrong: Sandalolitha 1, Lithophyllon 1, Halomitra 1) |
| C | 2026-11-06 | imrl-p45_i14 | Lobactis | (right) | 21 | IMR lecture photo | 2/2 | 2/5 (wrong: Herpolitha 3) |
| C | 2026-11-17 | lobophyllia-cand-243661752 | Lobophyllia | (right) | 25 | Research Grade, 4 IDs (another observer) | 1/1 | 0/0 |
| C | 2026-11-17 | lobophyllia-wide-745205648 | Lobophyllia | (right) | 13 | Needs ID at genus, confirmed by trusted identifier only (Pierre's own) | 2/2 | 6/6 |
| C | 2026-11-17 | lobophyllia-cand-311685350 | Lobophyllia | (right) | 25 | Research Grade, 3 IDs (another observer) | 1/1 | 2/3 (wrong: Galaxea 1) |
| C | 2026-11-17 | millepora-cand-460597196 | Millepora | (right) | 13 | Research Grade, 2 IDs (another observer) | 1/1 | 3/3 |
| C | 2026-11-17 | montipora-cand-525086168 | Montipora | (right) | 33 | Research Grade, 3 IDs (another observer) | 1/1 | 1/1 |
| C | 2026-11-21 | montipora-cand-588678137 | Montipora | (right) | 27 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 1/1 | 1/1 |
| C | 2026-11-17 | mycedium-wide-745204684 | Mycedium | (right) | 32 | Needs ID at genus, confirmed by 2 other identifiers (Pierre's own) | 1/1 | 8/9 (wrong: Cyphastrea 1) |
| C | 2026-11-21 | pachyseris-cand-93255691 | Pachyseris | (right) | 14 | Research Grade, 2 IDs (another observer) | 1/1 | 3/3 |
| C | 2026-11-21 | pavona-cand-575527565 | Pavona | (right) | 132 | Research Grade, 2 IDs (another observer) | 1/1 | 1/3 (wrong: Pectinia 1, Porites 1) |
| C | 2026-11-17 | pectinia-cand-260171969 | Pectinia | (right) | 20 | Research Grade, 3 IDs (another observer) | 1/1 | 3/3 |
| C | 2026-11-17 | plerogyra-cand-34702069 | Plerogyra | (right) | 14 | Needs ID at genus, confirmed by 1 other identifier (another observer) | 1/1 | 3/3 |
| C | 2026-11-21 | pleuractis-x-262213606 | Pleuractis | (right) | 65 | Research Grade, 3 IDs (another observer) | 1/1 | 1/1 |
| C | 2026-11-06 | pocillopora-macro-745206193 | Pocillopora | (right) | 46 | Needs ID at genus, confirmed by trusted identifier only (Pierre's own) | 1/1 | 3/3 |
| C | 2026-11-06 | porites-cand-437174104 | Porites | (right) | 14 | Research Grade, 2 IDs (another observer) | 1/1 | 0/0 |
| C | 2026-11-17 | porites-cand-500455513 | Porites | (right) | 13 | Needs ID at genus, confirmed by trusted identifier only (another observer) | 2/2 | 1/1 |
| C | 2026-11-17 | porites-cand-461415515 | Porites | (right) | 27 | Research Grade, 2 IDs (another observer) | 1/1 | 1/1 |
| C | 2026-11-17 | porites-medium-746236449 | Porites | (right) | 11 | Needs ID at genus, confirmed by trusted identifier only (Pierre's own) | 1/1 | 0/0 |
| C | 2026-11-17 | porites-cand-587376235 | Porites | (right) | 12 | Research Grade, 2 IDs (another observer) | 1/1 | 0/0 |
| C | 2026-11-17 | tubastraea-cand-352427885 | Tubastraea | (right) | 12 | Research Grade, 2 IDs (another observer) | 1/1 | 0/0 |

**What the A leads suggest (to look at, not settled; rule C5):**

- **astrea-medium-550371649** (Research Grade *Astrea curta*, 3 identifications including the trusted identifier of
  rule P1). It was answered 12 times in all, 4 of them right; 4 of the wrong answers were "Favites".
  - Pierre reported this photo himself on 11-05 ("Wrong answer", note "?", report mw3hpn0iw1ze). He also reported
    astrea-macro-102598426 (mw3hre4e3cxe) and favites-cand-386693010 ("Astrea?", mw3hxz80hrpx).
  - All three of his reports are still open.
  - The Astrea boundary is already a point: `data/points.json` `astrea-reefcloud`.
- **cyphastrea-cand-357894527** (Needs ID at the genus; the observer and the trusted identifier agree on
  *Cyphastrea*). All 3 answers on it, hers included, were "Turbinaria". It may show another genus, or a *Cyphastrea*
  too unlike its sheet to teach with.
- **dipsastraea-cand-269242392** (Needs ID at the genus; the observer and the trusted identifier agree). All 4 answers
  on it were wrong, 3 of them "Astrea".
- **goniastrea-cand-684020884**, **goniastrea-cand-260210180**, **goniastrea-cand-260381321**,
  **pavona-cand-177401237**: mostly Research Grade, but missed by most players, often for Favites (the Goniastrea ones)
  or Goniastrea (the Pavona one).
- **lobactis-cand-262215874**, **danafungia-cand-262212237**, **fungia-cand-269732572**: the fungiids, where she and
  the others hesitate between the free-living genera.
- **imrl-p23_i7** (IMR lecture photo, Turbinaria): 2 right out of 5 among the other players.

**What I propose:** these 11 A photos go to Pierre's admin as a review list. On the genus's page under Photos he can
keep each one, move it to another genus, or exclude it. This is his curation (rule A1), never changed by a PR. A wrong
label he confirms is fixed by his exclusion or move; a disagreement between sources becomes a point (`data/points.json`,
rule C5). The B rows are the look-alike pairs her sheets and Tell-apart cards already teach. Nothing to do on the data
side.

## 4. The audit: game photos whose iNaturalist identification is not confirmed

Every game photo record with an iNaturalist observation was checked against iNaturalist on 2026-11-21:
- the corals (`data.json` `gen` and `x.gen` views, and the candidates in play through `curation.json` `genera.add`);
- the fish (`fish-game.json`, with `fish-photos.json`);
- the sea slugs (`seaslug-game.json`).

Photos with no observation were not audited:
- the IMR lecture photos;
- the FishBase photos;
- the photos Pierre added from other sources.

For each photo, the observation's grade and its current identifications were read. An identification by someone other
than the observer at the record's genus or below counts as a confirmation.

| | Corals | Fish | Sea slugs |
|---|---|---|---|
| Photos with an observation | 1,764 | 24,079 | 3,014 |
| Research Grade | 1,067 | 24,004 | 2,464 |
| Needs ID, confirmed at the genus by another identifier | 692 | 17 | 549 |
| ...by the trusted identifier of rule P1 alone | 365 | 0 | 0 |
| ...by one other identifier | 74 | 14 | 344 |
| ...by two or more | 253 | 3 | 205 |
| **Only the observer's identification** (Needs ID, never confirmed) | **4, all Pierre's own** | **57: 56 Pierre's own, 1 another observer's** | **1, Pierre's own** |
| Casual | 1 | 0 | 0 |
| Observation gone (deleted or private) | 0 | 1 | 0 |

### Each subject against its written rule

- **Corals** (rule P1, `tools/fetch_local.py` `ph_ok`): Research Grade, a genus-level community ID (two identifications
  agreeing), or the trusted identifier's genus, in the Philippines; Research Grade only abroad.
  - Every one of the 692 Needs ID coral photos is from Dauin or the Philippines (`loc`); none is from abroad.
  - All 692 are confirmed at the genus by someone other than the observer.
  - The 4 observer-only photos are Pierre's own, in the curated views.
  - The filter's rule holds on every coral photo in play.
- **Sea slugs** (`tools/fetch_seaslugs.py`):
  - The species route asks for Research Grade at the species. The two species-rank Needs ID records are both Pierre's
    own, which his rule allows (Q386).
  - The genus route asks for Research Grade, or 2 agreeing identifications and none disagreeing. Every genus-level
    Needs ID photo has the observer plus at least one other identifier agreeing.
- **Fish** (`tools/fetch_fish.py`): Research Grade at the species, or Pierre's own in any grade but casual. Nine photos
  do not meet it now (below). The candidate records keep no grade from fetch time, so *by inference only* they were
  Research Grade when fetched: the fetch asks for nothing else.

### What this means for the RA's remark

**No coral or sea-slug game photo rests on another observer's unconfirmed identification.**
- The 692 coral photos iNaturalist shows as "Needs ID" can still look unverified from the observation page: the page
  says "Needs ID" because no species was agreed, while the genus the game asks is agreed. This is the most likely
  source of the RA's remark.
- She did answer three of Pierre's own observer-only coral photos on 11-21, all of them right:
  - plerogyra-macro-552606630;
  - pavona-wide-745204920 with pavona-macro-745204888.

  She also answered one of his fish photos, fish-s427-cand-513855594, a dragonet.
- **Which genus she meant cannot be read from the data.** A guess, labelled as such: "Cyphastrea" is close to the name
  heard. Both of her Cyphastrea misses on 11-21 are on Needs ID photos confirmed only by the trusted identifier, and
  cyphastrea-cand-357894527 is a data lead (section 3). "Astrea" is the other guess (astrea-medium-550371649, also a
  lead).

### The photos the audit lists

- **Pierre's own observations with only his identification** (coral 4, fish 56, sea slugs 1) are allowed by rule P1:
  his own photos go into the fish and sea-slug pools in Needs ID (Q148, Q386), and the 4 coral ones are curated views of
  his own.
  - They match the words "only the observer's identification" literally, so they are listed here for him.
  - Whether his own photos need a second identifier is his call, a change of rule substance: a question for him, not a
    PR.
  - The coral four: acropora-wide-745675208, pavona-wide-745204920, pavona-macro-745204888, plerogyra-macro-552606630.
- **Fish photos that no longer meet the fish identity rule.** All nine are in `fish-game.json` and none is excluded,
  set aside or answered yet in the Answers tab.
  - Lost their species identification:
    - fish-s441-cand-621189474, *Gymnothorax fimbriatus*: only the observer's identification is left;
    - fish-s195-cand-600029477, *Scarus forsteni*: now Needs ID at *Scarus*;
    - fish-s209-cand-691355581, *Coris batuensis*: now Needs ID at *Coris*;
    - fish-s327-cand-636832429, *Mulloidichthys flavolineatus*: now Needs ID at *Mulloidichthys*.
  - Observation gone: fish-s509-cand-627616401, *Centropyge multifasciata* (the API returns nothing for it, asked twice).
  - Now Research Grade as another species, so the photo plays under the wrong species. The family is the same, so the
    family question is unaffected:
    - fish-s074-cand-701900425 and fish-s074-cand-701901884: *Amphiprion ocellaris*, now *A. frenatus*;
    - fish-s253-cand-759998657: *Oxycheilinus orientalis*, now *O. samurai*;
    - fish-s327-cand-519643870: *Mulloidichthys flavolineatus*, now *M. vanicolensis*.
- **One coral photo turned casual:** tubipora-x-59495931 (bonus genus *Tubipora*). Its identification is sound (three
  identifiers agree on *Tubipora musica*), but a quality vote says the evidence is not recent. This is not an
  identification problem; Pierre may keep it.
- One sea-slug record moved down a rank, from *Discodoris* to *Discodoris cebuensis*, inside its unit: nothing to do.

### The gap, and what is proposed

The candidate filters let nothing in against their rule. The gap is that nothing checks a photo again once it is in
play: an identification withdrawn or changed on iNaturalist later stays in the game.

**Proposed (not built):** a read-only re-check tool. It would ask iNaturalist again for every game photo's observation,
paced (rule C7), and list the photos that no longer meet their subject's rule, calling the fetchers' own predicates
rather than restating them. Running it regularly is a new process, for the integrator to order. Removing a photo stays
Pierre's (his admin exclusion, rule A1).

**Proposed to Pierre** (section 5):
- the 9 fish photos for exclusion or a move;
- the 11 A leads of section 3 to look at;
- his call on his own observer-only photos and on the casual *Tubipora*.

## 5. Questions for Pierre (held by the integrator; Rule 0)

1. **The 9 fish photos** that no longer meet the fish identity rule. Exclude them in the admin? Recommended:
   - yes for the 5 that lost their species identification or whose observation is gone;
   - for the 3 relabelled ones (4 photos), move them to the species iNaturalist now gives where we teach it, else
     exclude.
2. **His own observations identified by him alone** (coral 4, fish 56, sea slugs 1): keep them as rule P1 says, or
   require a second identifier? Recommended: keep, since he is the expert who identified them. At most, list them in
   the admin so he can ask for confirmation on iNaturalist.
3. **Which genus did the RA mean?** Ask her for the photo or the genus. If it is a Needs ID photo confirmed at the genus
   by the trusted identifier, the likeliest case, that is rule P1 as he decided it (2026-11-05, #568).
4. **The 11 A leads of section 3:** review them in the admin, together with his own 11-05 Astrea reports, which are
   still open.

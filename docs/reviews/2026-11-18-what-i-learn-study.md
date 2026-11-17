# What I learn: each subject's levels in one visible place (design study, 2026-11-18)

Status: design study with mockups, no app change. The mockups are the app itself served locally, with a seeded
mid-course player and the new card injected (section 13); they are not committed. Pierre chooses what players see in
the questions at the end (section 15); everything else is the integrator's call once he has answered.

## 1. Why this study

Pierre, 2026-11-18:

> "il faudrait pouvoir controler les niveaux de jeux par mode (coraux, poissons, limaces, ...). On ne peut pas continuer
> à empiler des settings dans le menu déroulant"

He approved the direction at 06:33 Manila: a **"What I learn" card per subject** where a player sees that subject's
levels and turns them on or off, its defaults set by the welcome answer, each level showing where the player stands;
⚙ keeps only the general settings. His condition:

> "il faudra que ça soit facilement visible et accessible pour les joueurs"

Then, on the sea slugs' open-all box ("Had a sea slug ID course? 24 genera are not open yet … Open all genera"):

> "Ya pas de cours sur les limaces, mais par contre il faut effectivement permettre l'ouverture. Ça rentre dans la
> réflexion en cours."

So the card also owns "open everything", worded per subject (section 10).

**Not a level selector.** Rules L3 and U7 forbid a difficulty selector (Easy / Medium / Hard, the quiz level). The card
chooses **which names a player learns** (families, scientific genera, species by common or scientific name…), as the
names choice of 2026-11-04 already does; the difficulty inside each level stays adaptive, and each level still opens
by mastery (rule C0, Q391 a). Nothing here lets a player pick "harder photos".

## 2. What exists today: every level-like control, and where it lives

Read in `index.html` (⚙), `app.js` (`UNITS` `sets` and `opens`), `progress.js` (My progress's side column),
`quiz.js` (the cards), `home.js` and `tour.js`, `main` at b6e0d26.

| Subject | Control | What it decides | Where it lives today | Default |
| --- | --- | --- | --- | --- |
| Corals | **Bonus genera** (`sets` `bon`) | 5 genera off the IMR list (Isopora, Leptoseris…) join the games; never in the % (rule L6) | ⚙ row "Bonus genera On / Off"; an offer card once every slate genus is met ("⚙ Settings, Bonus genera, any time") | Off |
| Corals | **Open all genera** | every genus open at once instead of one at a time | My progress box "Had the IMR coral lecture? … Open all genera"; the first genus cards ("Had the IMR coral lecture? Skip the cards…") | One at a time |
| Corals | **Coral basics** | a 5-minute module first | Home, a line in the Learn door ("New to corals? Basics in 5 min ›") for a new player with few answers | Offered to "I'm new" |
| Corals | Non-IMR genera | Coral ID Key: also rank the rarer genera | ⚙ row, shown on the Key's page only | Off |
| Fish | **Scientific names** (`sets` `sci`: the scientific genera) | a family's genera join as it reaches Advanced (an IMR player's IMR genera from Open Water, Q219; turned on by hand early, from Open Water, Q240) | ⚙ row "Scientific names On / Off"; offer card at Advanced; My progress box "Turn on scientific names"; a back card for those who had it on before 2026-11-08 | Off; the IMR genera on for "I'm at IMR" |
| Fish | **Beyond the IMR course** (`opens` `beyond`: circle 3) | 12 more families (frogfishes, ghost pipefishes…); in the % either way (Q204) | an offer card; My progress box "Open the families beyond IMR (n families)"; **never a ⚙ row** (rule U7) | Off until said yes |
| Fish | Species by common name (`sets` `sp`) | a family's species from its Advanced, at the rank share (Q382) | **no control** (Pierre, 2026-11-03 and 11-04: every player meets them) | On |
| Fish | Species by scientific name | not built (#1041, Q394-Q398) | planned: the **names choice** "common / scientific / both" at the fish welcome and **as a ⚙ row that replaces "Scientific names"** (#1041, Q396) | - |
| Fish | Juveniles and colour phases | variants of a unit, on that unit's own mastery (Q391 a); "Learned" asks each group (Q391 b) | no control | On |
| Fish | IMR sub-entries (level 1b, FISH_PATH "Levels") | designed with "a ⚙ On / Off row"; folded since into the IMR genera (Q219), not built as a set | - | - |
| Fish | **Open all families** | every family open at once ("Danger zone", FISH_PATH) | My progress box "Had the IMR fish presentation? …"; the first cards | One at a time |
| Sea slugs | Circles 2 and 3 | open by themselves at the fish's thresholds (`fishGate`), no offer | no control | Automatic |
| Sea slugs | **Open all genera** | every genus open at once | My progress box and first cards, **"Had a sea slug ID course?"** (`SUBJECTS` `lecture`: "a sea slug ID course"); there is none (Pierre, above) | One at a time |
| Every subject | Welcome question | starting values only (rule L10): new / IMR / know | the tour's first steps, or a card before the first question | asked once |
| Every subject | Leaderboard | show me on the public board | ⚙ row | On |

What this inventory shows:

- **The level controls are in three places, none of them visible.** ⚙ holds two (Bonus genera, Scientific names) next
  to the theme; My progress holds three boxes (Open all, Turn on scientific names, Beyond IMR); the cards come once.
  **On a phone, My progress's boxes sit under the whole board**: for the fish, under 65 tiles, about 1,900 px down a
  390 × 844 screen (mockup `before-progress-fish-phone.png`). A player who has not scrolled to the end has never seen
  them.
- **⚙ is about to grow again**: the names choice (#1041, Q396) was planned as a ⚙ row, the juveniles have no control
  at all, and the sea slug species are next. This is the stack Pierre wants to stop.
- **A player never sees where they stand per level** in one place: the fish badge has three bars (Families, Common
  names, Scientific names), but they are not where the switches are, and the corals and sea slugs have none.

## 3. The levels the engine has

From `core.js` `SUBJECTS` (`rank`, `unitRank`, `optin`, `start`), `app.js` `UNITS` (`sets`, `opens`) and the
levels study ([2026-11-17-levels-and-shares-study](2026-11-17-levels-and-shares-study.md) §3). **The opening rule**
is C0 (Q391 a, 2026-11-17): whatever depends on something comes as that thing is mastered.

| Subject | Level | Kind | Comes as… (C0) | Its own % | Switch today |
| --- | --- | --- | --- | --- | --- |
| Corals | Genera (40: the slate and Millepora) | rank, the base | the pace of the opening (one at a time, ★ after their look-alikes, rule L5) | yes, the % | - |
| Corals | Bonus genera (5) | breadth of the base | once on, one at a time | yes, outside the % | ⚙ |
| Corals | Growth forms | not a level (rule C4: an entry point only, never a filter) | - | - | - |
| Fish | Families (65, three circles) | rank, the base | circles 1-2 by themselves, circle 3 by choice | yes | circle 3: card, My progress |
| Fish | Scientific genera (130) | rank | its family at Advanced (IMR genera at Open Water, Q219; by hand early, Open Water, Q240) | yes, in the fish % (as scientific credit) | ⚙, card, My progress |
| Fish | Species, common names (659) | rank | its family at Advanced, at the rank share (Q382) | yes (Common names) | none |
| Fish | Species, scientific names | rank (not built) | its genus or family (Q397, open) | yes (Scientific names) | planned ⚙ |
| Fish | Juveniles and colour phases | variant of a unit | that unit's own bar (`VAR_AT`) | no: they count on the unit | none |
| Sea slugs | Genera (78, three circles) | rank, the base | the opening's pace; circles by themselves | yes | - |
| Sea slugs | Species | rank (not built) | after the genera (ROADMAP "More subjects") | - | - |

If growth forms ever become a level of the corals ("name the growth form"), the card takes it as one more row; rule C4
keeps it a level of its own, never a filter on the genera.

## 4. The card, whatever its place

One card per subject, the same component everywhere it shows. Mockup: `rec-progress-fish-desk-light.png`.

- **Rows as the subject's tree.** The base level on top, each level that hangs from it indented under it with a thin
  connector, so the dependency is visible without words (rule U6, visual beats text): for the fish, Families › Beyond
  the IMR course, Scientific genera › Species by scientific names, Species by common names, Juveniles and colour phases.
- **Each row**: the level's name (16 px, semibold), one muted line saying what a question asks ("A photo, four family
  names"), then its state, then its switch.
- **The switch** is the segmented On | Off that ⚙ already uses (DESIGN.md "Exclusive choice": no new control style);
  44 px tall on touch screens. The base level has no switch: a quiet "Always on" tag (everything else hangs from it).
- **Four states**, each readable without colour:
  - *playing*: a bar with its % and one line, "12 of 28 at Advanced · 30 met";
  - *waiting* (on, its parent not mastered yet): an empty dashed track and the reason, "Each family's genera come as it
    reaches Advanced";
  - *off*: the row faded, "Off · once on, they come one at a time"; the progress made stays (section 7);
  - *coming* (not built yet): the row faded with a "Coming" tag, no switch (species by scientific name, the sea slug
    species). It tells the player where the path goes, as the "?" tiles of My progress do.
- **A small accent dot** next to a level that just started (its first unit met), until the card is seen. The accent,
  not the review amber (one meaning per hue: amber is "to review" on My progress).
- **The footer** holds Open all, worded per subject (section 10), with how many are not open yet.
- **The header** says what set the defaults: "Set by "I'm at IMR" · change any time".
- **Per subject, from the data** (rule S1): the rows come from `SUBJECTS` / `UNITS` (sets, opens, ranks), never a
  subject named in code; a subject with one level (the sea slugs today) shows one row and its "Coming" row.

**The names choice maps onto the rows.** The 2026-11-04 choice (common names, scientific names, both; "I'm at IMR" =
both) becomes a preset of the fish rows: *common* = Species by common names on, the scientific rows off; *scientific* =
Scientific genera and Species by scientific names on, common off; *both* = all on. The welcome's names step (#1041's
plan) sets these rows and the card shows them; **#1041's planned ⚙ row is not needed** (Q396 stands as it is: players
who already play keep what they have). One case the three answers did not have: all names off, families only (question
(e)).

## 5. Placements

Each was mocked on the real Home and My progress at 390 × 844 and 1280 × 800, light and dark.

### A. A line on Home, in the Learn & practise door, opening the card over Home

One row under Learn and Practice (`rec-home-fish-phone-light.png`): the levels icon, **What I learn**, a one-line
summary with a dot per level (filled: playing; ring: waiting; grey: off), "›". A tap opens the card as an overlay
(`optA-overlay-fish-phone-light.png`, the `cardShow` frame).

- Visible: **at every visit**, on the screen every player starts on, per subject (it follows the subject switch above).
- Reach: one tap.
- Rules: a row inside the Learn door, as the "New to corals? Basics in 5 min" line already is; still one screen, but it
  is an addition to Home, whose rule (U12, "two big doors only") is Pierre's: it needs his OK.
- Fits one screen: measured, section 13.
- Weakness: an overlay over Home shows the levels away from the board the player's progress lives on.

### B. A card on My progress

The card at the top of the side column on desktop (`rec-progress-fish-desk-light.png`), right under the player's badge
on phones (`rec-progress-fish-phone-light.png`). The fish badge's three bars move into it (they are its rows' bars),
and the three boxes now at the bottom of the column (Open all, Turn on scientific names, Beyond IMR) go into it.

- Visible: where the player looks at their progress, and "where they stand" is already there.
- Reach: the Progress tab or the header pill, then the card.
- Rules: My progress keeps the board first (Pierre, 2026-11-01 and 11-02: the view switch went to the bottom because it
  hid the badge). A six-row fish card between the badge and the board pushes the board down about 330 px on a phone.
  So, on phones: **one line under the badge** (the same summary line as A, `rec-progress-fish-phone-light-line.png`),
  which opens the card in place; on desktop the card in the side column, open.
- Weakness: a player who never opens My progress never sees it.

### C. A chip on Practice

A chip "Families + 3 levels ▾" above the quiz, opening the card as a pop-up (`optC-chip-fish-phone-light.png`).

- Visible: while playing.
- Rules: every game fits one screen in every state (rule U2) and pages carry no extras (rule U1); the chip takes a row
  from the photo on a phone, at every question, for a setting changed a few times in a player's life. The Duels,
  Memory and the custom quiz draw from the same levels (rule L4), so it would be needed on each game.
- Not recommended.

### Pierre's example: a card on Home under the doors

Home must fit one screen from 360 × 640 (DESIGN.md "Home fits one screen", measured in `tests/pages.smoke.js`). The
fish Home already fills 390 × 844; a full card under the doors (about 330 px for the fish) cannot fit and would turn
Home into a scrolling page. The line of option A is the part of it that fits.

### Recommended: B, reached from Home by A's line

**The card lives on My progress** (desktop: open in the side column; phones: one line under the badge, opening in
place), and **Home's Learn door carries A's line**, which goes to My progress with the card open. One card, one home,
next to where the player stands, and seen at every visit on Home. Mockups: `rec-home-*` and `rec-progress-*`, three
subjects, two sizes, two themes.

## 6. Turning a level on

What the player sees when they turn a level on before its parent is mastered.

- **A. C0 as it is**: on means allowed; each part comes as its parent reaches the usual threshold (Advanced for the
  genera and species), the parents already there at once. The row shows *waiting* with its reason.
- **B. Today's rule for a level turned on by hand (Q240), for every level**: turned on by the player's own switch
  before it is due, a level comes from its parent's Open Water instead of Advanced. Today this holds for the scientific
  genera only (Pierre, 2026-11-08); B makes it the card's rule for every level.
- **C. Opens now**: every unit of the level opens at once, whatever the parent's mastery (what Open all does for the
  base level).

*Recommendation: B.* It is Pierre's existing rule (never re-asked, rule W7), one rule for every row, and it answers
the player who turns a level on early without the wall C would bring (the 2026-11-06 "never a wall"). The row then
says "come as each family reaches Open Water".

## 7. Turning a level off

What happens to the progress made and to the subject's %.

| Level | Counts in the % today | Precedent |
| --- | --- | --- |
| Coral bonus genera | never | rule L6 |
| Fish circle 3 (beyond IMR) | yes, on or off | Q204, rule U7 |
| Fish scientific genera | yes (scientific credit) | 2026-11-08 |
| Fish species by common name | yes | Q242 |

The binding decision is the fish's "**One score scale for everyone**, whatever the choice, so the leaderboards stay
comparable" (2026-11-04, FISH_PATH "Which names a player learns").

- **A. Kept, same scale**: the level stops being asked; its units keep their bars (back as they were when turned on
  again); the % keeps its scale, so that part simply stops rising. A bonus genus still counts nowhere.
- **B. Kept, the % over the levels on only**: a player with fewer levels can reach 100% sooner. Breaks the one scale:
  two players at 80% would not know the same thing, and the boards would compare different things.
- **C. Erased**: not offered (irreversible, and a level turned off by mistake would cost hours).

*Recommendation: A.* It is the decided scale, nothing is lost, and a switch back is free. The off row says so: "Off ·
your 21% is kept".

## 8. Juveniles and colour phases, against Q391 b

Q391 b (2026-11-17): "Learned" needs a right answer on each variant group a unit has. A switch that turns juveniles
and phases off meets it three ways:

- **A. A switch; Off caps the family at Divemaster**: the photos never come, and a family's Instructor (its exam) still
  needs them. Consistent with Q391 b and with the one scale (section 7 A: the level stops being asked, the % does not
  move).
- **B. A switch; Off waives them**: the photos never come and Learned no longer asks them, for that player. Changes Q391
  b and rule L9 for those players; their Instructor would not mean the same as others'.
- **C. No switch**: an information row ("each family's come as you master it, a few easy ones from the start").

*Recommendation: A*, with the row's line saying it ("Off: they never come, and a family's Instructor needs them").
Pierre listed them among the levels a player turns on or off; A gives that without touching what "learned" means.

## 9. Defaults from the welcome answer

The welcome answer sets starting values only (rule L10); the card's defaults are part of those values. Players who
already play keep what they have (Q396 A, recommended in #1041).

| Subject | "I'm new" | "IMR" answer | "I know … well" |
| --- | --- | --- | --- |
| Corals | Genera; Bonus off (offered once every slate genus is met) | the same | the same |
| Fish | Families; common names; scientific rows off (offered at Advanced); beyond IMR off (offered); juveniles on | Families; common and scientific names (the IMR genera from Open Water, Q219); beyond IMR off; juveniles on | the names step's answer (#1041's plan) |
| Sea slugs | Genera (scientific names only, Q369); species on once built | - (no IMR answer) | the same as new |

## 10. Open all, per subject

Pierre's sea slug remark: the "Had … course?" framing is right only where an IMR course exists. Today (`SUBJECTS`
`lecture`): the corals have the IMR coral lecture (Lecture 6), the fish the IMR fish presentation (the course the IMR
families come from: "the IMR survey families"), the sea slugs none.

| Subject | Today, My progress | Today, the first cards | Proposed, the card's footer and the first cards |
| --- | --- | --- | --- |
| Corals | "**Had the IMR coral lecture?** 12 genera are not open yet: they come one at a time as you play." [Open all genera] | "**Had the IMR coral lecture?** Skip the cards and play with all 40 genera." [Open all genera] | [Open all genera now] "Had the IMR coral lecture? 12 are not open yet: they come one at a time." |
| Fish | "**Had the IMR fish presentation?** 36 families are not open yet…" [Open all families] | "**Had the IMR fish presentation?** Skip the cards…" | [Open all families now] "Had the IMR fish presentation? 36 are not open yet…" |
| Sea slugs | "**Had a sea slug ID course?** 24 genera are not open yet…" [Open all genera] | "**Had a sea slug ID course?** Skip the cards…" | [Open all genera now] "**Know sea slugs already?** 24 are not open yet: they come one at a time." |

A subject without a course says "Know … already?" (its `start` words: "I know sea slugs well"); the course framing
comes from a subject's field, so a subject without one never shows it. Moving Open all into the card removes the My
progress box; the first cards keep theirs (the moment a player meets the pace), with the same wording. A wording is
the integrator's call (easy to correct).

## 11. How a player discovers it

- **Home's line, from the first visit** (option A's line), in the door every player starts from.
- **The tour**: no new step; "Two ways in" already spotlights the doors, the line inside them, and "Your progress"
  gets one sentence: "What I learn, at the top, is where you turn levels on or off."
- **The cards that offer a level** end with "What I learn, any time" instead of "⚙ Settings, Bonus genera, any time" /
  "⚙ Settings, Scientific names, any time" (`UNITS` `note`), and the scientific genera's back card says the same.
- **The milestone cards** (the first species, the first scientific name) add the same line.
- **The accent dot** on a level that just started, on the Home line and on its row, until the card is seen.

## 12. What ⚙ keeps, what leaves

- **Keeps** (general settings): the account line (Send now, Sign out), Photo size, Photo quality, Leaderboard On / Off,
  Theme, Colour-blind, Colours, Install the app, Backup or reset progress, and the admin's View and Admin page rows.
  The Coral ID Key's "Non-IMR genera" is a tool option, not a level: it moves onto the Key's page (it is only shown
  there already).
- **Leaves** for the card: Bonus genera (corals), Scientific names (fish), and every level to come (the names choice of
  #1041, the sea slug species, any future level). Rule U7 holds: the settings it lists stay removed; the fish circle 3
  becomes a row of the card, not of ⚙.
- **Leave My progress's column** for the card: the three boxes (Open all, Turn on scientific names, Beyond IMR).
- **Words to update** with it: `UNITS` `note` and `onToast` of each set, the back card, the tour's "⚙ sets the theme
  and colours" (unchanged: still true), DESIGN.md (a new component row and "My progress"), rule U12's text if Pierre
  agrees to the Home line, ARCHITECTURE "Bonus genera".

## 13. Mockups

Made on the real app served locally (`main` at b6e0d26, no file changed), with a seeded player per subject: corals
"I had the IMR coral course" (70% of the genera met, at every level), fish "I'm at IMR" (45% of the families, 14
scientific genera, 22 species met), sea slugs "I'm new" (20% met). The card and the line are injected markup with a
stylesheet that uses the app's tokens only (no colour literal), so light and dark come from the app's own token blocks.
Requests to the sync sheet and every host but the photo host were blocked. Files (in the session's scratchpad,
`whatilearn/`, not committed):

- **Recommended**: `rec-home-{coral,fish,seaslug}-{phone,desk}-{light,dark}.png`,
  `rec-progress-{coral,fish,seaslug}-{phone,desk}-{light,dark}.png`, the phone line `rec-progress-*-phone-*-line.png`,
  full pages `rec-progress-*-light-full.png`; Home at 360 × 640: `rec-home-*-small-light.png`.
- **Option A's overlay**: `optA-overlay-fish-{phone,desk}-light.png`. **Option C**: `optC-chip-fish-{phone,desk}-light.png`.
- **Today**: `before-progress-{coral,fish}-{phone,desk}.png` (full page), `before-settings-{coral,fish}-{phone,desk}.png`.

MEASURED_FIT

## 14. What building it would take

Not decided here (implementation details are the integrator's): one card component in `progress.js`, its rows from
`SUBJECTS` / `UNITS`; the Home line in `home.js`; the switches written to the same synced quiz settings the ⚙ rows use
today (`bonusSet`), one more per new switchable level; the ⚙ rows and My progress boxes removed; the words of section
11. The species-by-common-name and juveniles switches change what the draw may ask, so they carry a learnsim check per
rule L11 at the level the integrator sets. Order: after #1041's answers (the names rows), or first with the levels
that exist and the names rows added by #1041's PR.

## 15. Questions for Pierre

Only what players see. Each has a recommendation; the rest (wording, layout, the dot, "Coming" rows, the tour
sentence, Open all's words) ships as the integrator's call and is easy to correct.

**(a) Where the card lives.** Context: Pierre wants it "facilement visible et accessible"; Home must stay one screen
(rule U12, his).
- A: a line in Home's Learn door, opening the card over Home;
- B: a card on My progress only (phones: one line under the badge);
- C: a chip on Practice;
- **B reached from Home by A's line** (the card on My progress, the line on Home leading to it): this adds one row to
  Home's Learn door, as the Basics line already does.

*Recommendation: B with A's line on Home.*

**(b) Turning a level on before it is due.** Context: rule C0, each level comes as its parent is mastered; Q240 already
brings the scientific genera turned on by hand from their family's Open Water.
- A: it comes at the usual threshold (Advanced), the row waiting until then;
- B: Q240's rule for every level: turned on by hand, from the parent's Open Water;
- C: everything of the level opens at once.

*Recommendation: B.*

**(c) Turning a level off.** Context: "one score scale for everyone" (2026-11-04).
- A: progress kept, the % keeps its scale (that part stops rising);
- B: progress kept, the % over the levels on only;
- (erasing is not offered).

*Recommendation: A.*

**(d) Juveniles and colour phases.** Context: Q391 b, "Learned" asks each variant group.
- A: a switch; Off: they never come, and a family's Instructor still needs them;
- B: a switch; Off: Learned no longer asks them, for that player;
- C: no switch, an information row.

*Recommendation: A.*

**(e) Names: which rows can be off.** Context: on 2026-11-03 and 11-04 the species by common name had no switch (every
player meets them); the names choice offered common, scientific or both.
- A: every names row has its switch; all off leaves the families only, allowed;
- B: every names row has its switch, but at least one kind of names stays on;
- C: species by common name stay without switch (the card shows them, always on).

*Recommendation: A* (families only is a real choice for a diver who wants the families; the scale stays one, section 7).

---

Sources: `index.html` (⚙), `app.js` (`UNITS` `sets`, `opens`, `bonusSet`), `progress.js` (`quizBoard`, `scoreBars`),
`quiz.js` (the first cards' Open all), `home.js`, `tour.js`, `core.js` `SUBJECTS`; docs/FISH_PATH.md ("Levels", "Which
names a player learns", "The fish welcome question and the IMR answer", "Unlock rules"); docs/LEARNING.md "Juveniles
and colour phases on their unit's mastery"; [2026-11-17-levels-and-shares-study](2026-11-17-levels-and-shares-study.md);
#1041's plan (branch `claude/species-step2-plan`, Q394-Q398); rules L3, L4, L6, L9, L10, U1, U2, U6, U7, U12.

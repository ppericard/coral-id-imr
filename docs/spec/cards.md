# Cards and prompts

The cards and prompts the app shows around a game: the welcome tour, the first-launch question, the notes about a
change, the one-tap questions, the "Did you know?" tips and the reminders a game gives at a break. This is the
specification of what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and
the PRs. The rules they follow are mostly in [rules/ui.md](../rules/ui.md) (U1, U10, U11) and
[rules/learning.md](../rules/learning.md) (L4, L10); their look is in [DESIGN.md](../DESIGN.md) "Cards". Those kept with
the progress are synced as [sync.md](sync.md) says; a signed-in player's one-time cards wait for the visit's first sync
([sync.md](sync.md#one-time-notices-after-the-first-sync)).

## One card builder

Every card comes from one builder, `app.js` `cardShow` (DESIGN.md "Cards"): the `.unlock` overlay with role dialog,
`aria-modal`, labelled by its kicker and title; the focus on its main button, kept inside on Tab and given back on
close; Escape, Enter and a tap outside as each card says (`esc`, `enter`, `tap`: as its main or secondary button, or a
function); the quiz's answer keys never reaching the question behind; the tour's keys passing while it waits under the
tour; `ulClose` for `route()`; and on close `qclockAgain` (the time to answer counts from the card's close). The callers
keep their own rules (when a card is due, waiting while `#tour, .unlock` is up, what a button does): `quiz.js`
`introShow` / `introCard`, `backShow`, `bonusOfferShow`; `progress.js` `recalcNotice`, `sorryNotice`; `sync.js`
`signinNudge`. `tests/pages.smoke.js` opens every kind and checks the dialog, its title, the focus trap, Escape and the
focus return.

**One overlay at a time** (`pages.smoke.js` checks each): an achievement pop-up waits while a card or the tour is open,
and a card that opens over one sends it back to wait (`achBlocked()`, `achHold()` in `progress.js`); leaving the page a
card opened on (Back, a tab, a link; not a redraw of the same page) closes it and its keys (`route()` calls each card's
`ulClose`), and first-meeting cards not shown yet come next time. Any `.unlock` card or offer due while the tour runs
(the first genus cards on the tour's games step) waits under it, hidden by `html.touring .unlock`, and its keys let the
tour's through; it shows, focused, when the tour closes.

## Out-of-game prompts

Few, well-spaced pop-ups (`promptOk` / `promptMark` in `quiz.js`, `reefid-prompt-at`). The sign-in card (from 20
answers, [sync.md](sync.md#accounts-and-signing-in)), the one-tap question (from `PULSE.FIRST`, 35), the fallback card
of the first-launch question (at 40 or 60 answers, `startDue`), the card offering to go back to one at a time after Open
all (`backDue`), the tips and the reminders below come at least `PROMPT.GAP` (10) answers apart, never with a card, the
tour or an achievement toast on screen or waiting (`overlayBusy()`); one that falls too close waits. A right answer gets
a ~400 ms celebration on the choice itself and on "✓ Yes" (`.cheer` in `app.css`; none with reduced motion); Next is
there at once.

**The break at Next** (`quiz.js` `breakArm`): between an answer and the next question, at most one card. A card that
wants the break arms Next unless another already did (first come, first served). `quiz.js` `answer` asks them in this
order: a phase card (`phaseArm`), the Duel tab's relief card, the custom quiz's reminder; then, within the prompt
spacing, the sign-in card (shown at once, `signinNudge`) or else the one-tap question; then the card for every unit met
(`allMetArm`) and the tips (`tipAfter`). At the tap the card checks again and
either shows (its card then decides whether the next question follows) or lets Next go on. A card that waits for a break
is never shown right before a genus card (the next question planned, `NEXTQ`, brings none: `nextCards`), so two cards
never come back to back.

**Anti-reflex** (the one-tap question, the tips, the relief card, the reminder): every button takes no tap for 600 ms
(`PULSE.WAIT`, `TIP.WAIT`), the focus is on the question or title (Enter, Next's key, presses nothing), and a tap
outside does nothing, so a double tap or the reflex tap on Next cannot answer or dismiss it.

## The welcome tour

`tour.js`: 6 steps, the first-launch question first; 8 for a player with two subjects or more (below). Each step
spotlights `sel` (fallback `alt`), joined with `also` into one frame, plus an optional separate `plus` spotlight (step 3:
Practice in the menu). The bubble never covers a spotlight: `frame()` scrolls once per step so the target fits in the
band between the pinned header and the phone tab bar, beside or above or below the bubble (`.tbub.wide` on wide screens
when that is what it takes); a target taller than the band shows its top, or its bottom with `tall: 'end'` (the doors).
`arrows: true` (step 3) draws a big bobbing arrow at each spotlight (`arrows()`, below or above it, else beside, never
over the bubble or another spotlight; the phone sheet then sits midway between the two spotlights, and on wide screens
the bubble stands one arrow away from the target). `html.touring` adds room below the page so the last element can
scroll clear. `place()` then puts the bubble on the free side (phones: a sheet above the tab bar, or at the top with
`.up`). The tour never writes the number of units: it changes (rule U8). The sign-in step holds the sign-in form
([sync.md](sync.md#accounts-and-signing-in)).

### The subject to start with

New players choose the subject they start with. `tour.js` `plan()` works out the steps (`DEF`, keyed `k`) at each step.
A player with one subject open to them (`app.js` `subjMine`: the subjects `subjOpen` lets them play; a subject with
`open: 'group'` opens only to the admin and its group's members) gets the six steps, with no word of another subject. A player with two subjects or more gets **pick**
first, a forced choice like the first-launch question (no Skip, no Next until answered; Escape closes the tour, the
subject stays as it was): "What do you want to start with?", a line saying the app has that many subjects, each with
its own progress, switchable any time, and one `.startopt.tpick` button per subject (its icon, name, *beta* tag,
`UNITS[id].pick` line). The pick is kept (`SUBJECT_KEY`, synced) and `setSubject` loads the subject; then **ask** (that
subject's first-launch question), **swap** (spotlights the Home subject row `.hsubj`, else the header chip), then doors,
sign-in, games, progress, help in that subject's words (`UNITS[id].tour[k]` `{t, d}`; the steps' own words are the
corals'). A subject that opens by signing in during the tour (a group member on a new device: the sheet's reply names
the group, the page reloads on the sign-in step) adds pick, the new subject's question when it differs from the one
asked, and swap right after the sign-in step, the earlier steps unchanged; what the tour started with is kept for that
reload (`sessionStorage` `reefid-tour-open` `{two, s}`). The fish and the sea slugs have `open: 'all'`, so
today every new player gets the several-subject tour. `tests/pages.smoke.js` part `subjtour`.

## The first-launch question

It sets variables of the player's model, never a path (rule L10; LEARNING.md "The first-launch question"). `core.js`
`CHOICE`, `model.js` `startSet`, `startStep`, `startDue`, `startMerge`, `quiz.js` `startAskShow`, `startFbShow`.

**Asking.** "How well do you know corals?", a forced choice among "I'm new to corals", "I had the IMR coral course",
"I know corals well" (`app.js` `startOptsHtml`: big buttons, one per row, each with its line), asked as the welcome
tour's first step (no Skip, no Next and no arrow key until answered) or, for a player who skipped the tour (or closed it
with Escape), on a card before the next photo-quiz question (`startGate`, `.unlock.startq`: the three answers only;
Escape goes Home and the quiz asks again). A player with fewer than `CHOICE.ASK` (50) answers who never answered is
asked the same way; one with 50 or more is never asked, the answer inferred silently from their global level
(`core.js` `startInfer`, recorded `via: 'inferred'`).

**What it sets** (`startV()`): the level that the starting ability of a unit never answered is shrunk towards
(`core.js` `playerStart(P, skip, p)`) and, for "new", the basics module offered first (the tour's last button "Coral
basics (5 min)", the card's follow-up `startBasicsOffer`). `CHOICE.opts` is `[id, {p, basics}]`, from the lowest level
to the highest: the prior `p` and whether the basics are offered.

### One per subject

Each subject asks its own, in its own words (`core.js` `SUBJECTS` `start`: the question `q` and, per answer id of
`CHOICE.opts`, its answer and line; the fish: "How well do you know reef fish?", "I'm new to reef fish", "I'm at IMR
(Research Assistant programme)", "I know reef fish well"), with the same answers' variables, kept in its own record
(`core.js` `startKey`: `reefid-sync-<subject>-start`, so the corals' answer stays the corals'), asked on the card before
that subject's first quiz question, its fallback window counting that subject's answers. Everything in this section
holds per subject. A subject offers its own basics module after "new" and on its "lower" card (Coral basics, Fish basics:
`SUBJECTS` `pages` 'basics', `app.js` `basicsDue`, its words `UNITS` `basics`); the sea slugs have one (Sea slug basics)
but no first-launch question and no level-change card, so they offer it only on Home's line and the Learn page. The fish's level-change cards, that one included, stay off
(`UNITS` `startFb: false`). The fish answers are logged but not replayed, so the fish prior applies at once (`model.js` `startP`: no replay
to wait for). The admin's player journey shows the corals' record only.

### The record

Key **`reefid-sync-coral-start`** (synced with the progress like every `reefid-sync*` key, merged by `startMerge`; a
question card left waiting resumes the quiz only once `sync.js` `mergeSaved` has merged everything else,
`startResume`; cleared at sign-out; kept across a progress reset, its window restarted):

- `c`, `t`, `at`, `via` (`tour`, `card`, `fallback`, `inferred`): the answer in force, its time, the answers then, how
  it was given; and `ease`: [c, answers, time], the ease in force on the current answer. All are derived from `h`
  (`startNorm`).
- `h`, the history: an append-only list of timestamped events (`core.js` `startEvents`): answers given
  `[c, at, t, via]` and eases `[band below, answers, t, 'ease', the answer eased, the time of the choice event eased]`. An ease
  applies only while that very choice event is in force (an ease without that time is bound to the latest choice of its
  answer at or before it, in its own record). Every event is kept: the full replay needs each answer's prior, and a
  compaction would not commute with the union; `START_CAP` (200) is only a safety bound. The prior at any time comes
  from it (`startPriorAt`: an ease applies from its time until the next answer, to the answer it eased only); a record
  without `h` reads as its answer and its ease field.
- `w`: the fallback window, `[[difficulty, guess rate, right, first answer on its unit]…]`, up to the last of
  `CHOICE.AT` (60); `hd` (the opening hold fired in the window); `v` (the verdict waiting for its card); `fb`:
  `{'<answer>-lo' / '-hi': [answers, time]}`, the fallback cards shown.
- `wt`: the window's epoch, set by a progress reset of that subject (`startRestart`), so a window saved before it never
  wins a merge. A reset made here starts a new epoch; one adopted from another device (`sync.js` `mergeSubject`) takes
  that reset's time and keeps a window already counted since it; another subject's reset leaves it.

The variables in force are the `ease` band's when set, else the answer's (`startEff`). `startMerge` (and `sync.js`
`signIn`, for a record made on this device before signing in, and `core.js` `mergeUsers`, the admin's account merge)
takes the union of the two histories (`core.js` `startUnion`: one event per kind, time and value, oldest first, the same
whichever way round), keeps the window of the record holding the current answer (on the same answer the later epoch
`wt`, then the longer window), and drops the planned questions when the variables in force change.

### The fallback card

For everyone who answered, through the tour too (they may have picked wrong), never for an inferred answer. `quiz.js`
`answer` feeds `startStep` the answers after the choice (their difficulty `dm` and guess rate as the ability step takes
them, right, whether it was the unit's first answer), up to 60. At 40 and 60 answers only (`CHOICE.AT`), `core.js`
`startCheck` compares the global level (the Elo over every answer, with its standard error over the window) with the band
the answer predicts (`startBand`: the edges midway between the priors). A true beginner on the harder path is the
costliest error, so:

- `lo`, for "IMR course" and "know well" only: the level is under the floor with one-sided 80% confidence
  (`CHOICE.ZL`), or the opening hold fired in the window;
- `hi`, with `CHOICE.MET` (10) units met: the level is above the ceiling with 95% confidence and, as a guard only, the
  level fitted on the first answers on each unit (`levelFit`) is above it too.

`startDue` adds a card once per answer and direction (`fb`, marked when shown), no move back after a move (`startBack`,
the silent one included), `lo` only while the basics module is not done, `hi` only with a higher answer to offer; shown
by `quizPhoto` as an out-of-game prompt (`promptOk`, `noOpen`). `lo` is a gentle offer that never labels the player
(`.startfb[data-dir=lo]`): "The first genera feel hard?", **Coral basics in 5 minutes** (opens it and moves the
variables one band down silently: `model.js` `startEase`) and **No thanks, I know the basics** (changes nothing), two
buttons of equal weight. `hi`: "You know more than you said" with the higher answers (`startSet(c, 'fallback')`) or Keep
my answer. The answers are kept either way.

The admin's player journey (`admin-journey.js` `jStart`) shows the answer, how it was given ("inferred" in bold;
"changed by you on Players" for the admin's change, `core.js` `startAdminSet`, whose fallback window restarts from it),
each change, the silent ease ("Eased") and the fallback cards. Tests: `tests/start.test.js`, `tests/pages.smoke.js`
`startSmoke`.

### Replayed with the progress

The prior moves the progress, so the full replay ([sync.md](sync.md#full-replay)) applies it at each answer (`core.js`
`replayProgress` option `starts`, `startPriorAt`: the answer then in force, from the record's history). The sheet reads
the record from the saved data or an anonymous send, keys its stored replay by the history too (the Replayed tab's Since
column, `core.js` `startFp`), so a replay made with another history is not reused, and sends that fingerprint with the
replay (`fp`): `sync.js` `replayAdopt` adopts it only when it matches the history the device now holds. The prior enters
the live ability (`model.js` `startP`) and the replay of this device's pending answers (`sync.js` `replayAdopt`) as the
sheet replays it.

## Notes about a change

**Progress recalculated, and new game modes announced** (`RECALC` / `recalcNotice` in `progress.js`, `reefid-recalc`).
One pop-up per device, at the first moment no tour or card is open, to a player who already has answers: the notes of
`RECALC.L` not seen yet, latest first, in plain words with no algorithm details. Each note has an `id`, a title, a text,
its own kicker and button (`k`, `b`) and a `kind`: `update` for a recalculation (the card's medallion is then the
player's progress ring) or `feature` for a new game mode (✨); the latest due gives the card its kind. `reefid-recalc`
holds the id of the last note seen, so a player sees each note once. Marked seen by its button or Escape; leaving the
page closes it unseen. A note about one subject says so in its data (`subj`, a subject id or a list; `core.js`
`subjIn`): the two progress notes are the corals'; one without (the typed questions) is the engine's and shows in
whatever subject is on screen. A card holds the run one subject shows (`core.js` `noteRun`); a note about another
subject waits for the next card. A player with no answers in a note's subject has its notes marked seen unshown, and
the engine's notes after them still come in the subject on screen. A later recalculation that needs telling adds a
note at the end of `RECALC.L` (a `subj` if it speaks of one subject), no code; a recalculation of progress is
otherwise silent (rule D6).

**The apology card** (`progress.js` `sorryNotice`, `core.js` `SORRY`, `sorryOf`, `sorryFelt`, `sorryText`): one card,
at app open, to the players who played through a run of the draw that was not right, shown only until `SORRY.UNTIL`
(2026-11-17): it no longer shows, in any subject (an engine card, kept as a template). What the device held when this
code first ran on it is read once and kept (`reefid-sorry-first` {t, n, h, c}): n, the answers between `SORRY.FROM`
and then (the answers still in `LOG0` / `SYNC.log`, else those since the last card shown before the window); h, the
opening hold's sum (`reefid-hold`); c, the most units carded within 15 answers in the window. Due with n ≥
`SORRY.N` (20) and h ≥ `SORRY.H` (3), or h ≥ 1.5 with c ≥ `SORRY.CARDS` (4). It greets the player by first
name ("Hi Ana! Sorry about your last run.", `core.js` `firstName`: the first word of the sign-in name, capitalised,
else "Hi!"; rule U10), then "Yesterday evening we adjusted how the app
picks your questions, and some of it wasn't right yet: too many new genera came at once, and the questions didn't get
easier after misses. It's fixed now. Sorry for the rough ride!" (the day said in the player's clock: This or Yesterday
evening, else the date). Button "Thanks" or Escape: `reefid-sorry` (this device only, like
`reefid-recalc`). One card at a time, after `recalcNotice`.

## The enlarge hint

Every photo that opens the enlarged view in the quiz, the duels and the genus sheet carries the enlarge mark (`app.js`
`ZOOMI`, DESIGN.md), its button labelled "Enlarge photo". Once per device a coach mark, "Tap a photo to see it bigger"
("Click" with a mouse), points at the mark on the first photo of a photo-quiz question (`zoomHint()` in `quiz.js`,
called by `quizPhoto`; `ZHINT`: from `AT` = 1 answer, so the 2nd question at the earliest, `DELAY` 600 ms after the
question shows, gone at the first tap, click or key or after `MS` = 6 s). Key **`reefid-zoomhint`** (`app.js`
`ZHINT_KEY`, per device, outside the `reefid-sync-*` progress keys, kept on sign-out): `"seen"` once the hint has shown,
`"zoomed"` once any photo has been enlarged on the device (`zoom()` sets it); either value means it never shows (again).
It never shows with the tour, a card or an achievement toast on screen or waiting (`overlayBusy()`, the gating of
`promptOk` without its spacing: it asks nothing and goes by itself), nor once the question is answered or a photo
enlarged: while one is up it looks again every `DELAY` and shows once it has gone, on the same question if still
unanswered, else on a later one. Nothing in the scoring changes: the question, its clock (`QCLOCK`) and its answer are
untouched. `pages.smoke.js` checks the mark and its label, the hint on a new player's 2nd question only (held under an
achievement toast, then shown on the same question), not after a reload, and not after a photo was enlarged.

## One-tap questions

A short question about how the game feels, asked now and then (`quiz.js` `PULSE`, `pulseDue`, `pulseAsk`; the bank in
`core.js` `PULSEQ`, `pulsePick`, `pulseScore`, shared with the admin; LEARNING.md "What the players say about the
difficulty"), in every subject. Each subject paces its own (`sDev('pulse')`, `reefid-<dev>pulse`) = {at: its answers
when the last one showed, q: its item, left: the round's items still to ask, x: 1 after "Not now"}; the session is the
device's, every answer of any subject in it: `reefid-pulse` `v` = {t0: its first answer's time, t: its last, n: its
answers} (the first subject's own record too).

- **When**: after an answer in the photo quiz (the custom quiz too, `photoQuiz`) and the duels, as a card at Next,
  before the next question is drawn (in a flow of answers, a prompt inside the feedback is missed). The answer arms Next
  (`pulseArm`) when the prompt is due; at the tap it is checked again (a card or a toast that came meanwhile: no prompt,
  nothing marked, it stays due), then marked (`promptMark`) and shown (`pulseAsk`) with `cardShow` kind `feedback`
  (💬): kicker "Quick question", the question as the title, its three answers on one row of equal widths (`app.css`
  `.pulseb`), a quiet "Not now". Anti-reflex as above (`PULSE.WAIT`, 600 ms). Escape = Not now. When it closes (an
  answer, Not now, Escape) the next question is drawn (`route`); its clock starts with its photo, so the card's time is
  not counted.
- **How often**: first at `PULSE.FIRST` (35) answers, then every `PULSE.EVERY` (40; a target that depends on the level
  needs a few answers per level band from each player), `PULSE.AFTERX` (2) times that after a "Not now", always within
  the prompt spacing.
- **Never early in a session**: only once the current session has `PULSE.SESS_N` (15) answers and has lasted
  `PULSE.SESS_MS` (5 min) (`pulseSess`; still going: its last answer less than 30 min ago). A session is answers less
  than `model.js` `SESSION.GAP` (30 min) apart, as the admin's sessions (`admin.js` `HEALTH.GAP`) and the tips' visits;
  every answer in a game counts (`answer()` calls `pulseNote`, which keeps it in `reefid-pulse` `v` on the device: a
  reload is no new session). A prompt due sooner (the answers counter met in a previous session) waits for that, so no
  session opens on one; the spacing in answers is unchanged (in a long session, one every 40 answers). The same rule for
  every item.
- **The bank**: six items, asked in rounds (each once, shuffled; a new round never starts with the item just asked, so
  the same wording never comes twice in a row; the very first is the plain "These questions are"): "These questions
  are" (Too easy · About right · Too hard), "Right now I feel" (Bored · In the zone · Struggling), "Want harder
  photos?" (Yes · Keep it · Easier), "Having fun?" (Not really · It's OK · Yes!), "Frustrating?" (Not at all · A bit ·
  Very), "Getting boring?" (Not at all · A bit · Yes). Each answer sits on one or two common scales (`pulseScore`): felt
  difficulty (−1 too easy, 0 right, +1 too hard) and feel (−1 bad, +1 good).
- **Logged** by `ev('pulse')` with `r` = the answer's code, `src` = the item id, and `m`, `n` (the page's answers,
  `session.n`), `rr`, `lv`, `met` (what the game knew when the prompt showed, the same on every event of one prompt). The response rate: each prompt also
  logs `r` = `shown` when the card shows, `skip` for Not now or Escape, `none` when another page is opened with the card
  up (Back, a link: `cardShow` closes it with `route`); a prompt left open when the app closes is counted from its
  showing (shown − answered − Not now). At most two events a prompt, one prompt every 40 answers: far within the sheet's
  caps (200 a device, 3000 in all per 6 hours). How the sheet keeps them: [sync.md](sync.md#events-and-pages).
  `tests/pulse.test.js` checks the bank, the rotation, the spacing and the session gate (a fake clock: a new session
  with the counter due, slow and quick answers, a 30-minute break, a long session's cadence).
- **Admin** To do › Errors (`#inbox/todo/errors`, `pulseView`): the common scales by level band (overall level when
  answered: below −0.5, −0.5 to +0.5, above +0.5) and by mode with the prompts shown and the % answered, then every
  item's answers counted by band and mode (% of the column's answers) and under them its Not now, no answer and shown
  with the % answered (`pulseResp`; rows from before the showing was logged stay out of the rates).

## Did you know tips

For players who never, or very rarely, use a feature: a reminder that it exists, without them knowing they were picked;
once a player uses it, how often is their choice. A small generic system with one tip built (the candidates are in
ROADMAP "Did you know? tips").

- **Registry and rules** in `tips.js` (pure, no DOM, tier 2 before `quiz.js`, `tests/tips.test.js`): `TIPS` holds each
  tip's `id`, `ctx` (the games whose break may show it), `target(u)` (who it is for, on the usage counters), `from` (the
  questions answered from which it can first show), `now(b)` (its preferred moment at a break: b = {ctx, miss, zm}),
  `wait` (questions it waits for that moment before any break will do), `max` showings ever and `every` (questions
  between two), its card (`kick`, `title(o)`, `body(o)`, o = {mouse, subj}, subj the `core.js` `SUBJECTS` record on
  screen: the text follows the subject, whose fields hold the words, never a test on its id, rule S1; the zoom tip reads
  `zoom`: corallites for coral players, markings and fins for fish players) and `act` (its "Show me", `quiz.js`
  `TIP_ACT`). `tipDue(state, b)` picks the tip of a break; `TIPR`: at most one tip a visit, never in its first `FLOOR`
  (10) answers; a visit is answers less than `GAP` (30 min, as `model.js` `SESSION.GAP`) apart, and a reload is no new
  visit.
- **State, per device** (`reefid-tips`, outside the `reefid-sync-*` progress keys, so not synced and kept on sign-out,
  like `reefid-zoomhint`): `u` the usage counters (`q` game questions answered here: photo quiz, custom quiz, duels; `z`
  quiz photos the player enlarged here, on a question or its mix-up montage, `quiz.js` `tipZoomed`; a tip's own Show me
  is not counted; `c` times the Custom quiz was opened here), seeded once from the answers the device still holds (`LOG0` / `SYNC.log`: their count and `zm` flags;
  a signed-in device holds only its unsent answers); `s` per tip the `u.q` of each showing; `v` the visit {t, n, tip}.
  Per device on purpose: a tip is about how the person uses this device, the progress format and `core.js` stay
  untouched, and a tip shown on two devices does no harm.
- **At the break**: `answer()` arms the one-tap question first (`pulseArm`), then the tips (`tipAfter`: when the
  question is due, the tip waits for a later break). A tip arms Next only when due and within the prompt spacing
  (showing one calls `promptMark`, so the next prompt waits its turn too), never with the mastery toast due; at the tap
  it checks again that it is still due, that nothing is on screen and that the next question brings no genus card.
- **The zoom tip** (`id` `zoom`): for a player with 20 questions or more here and at most 2 photos enlarged ever (3 =
  never again); its moment, the Next right after a miss on a photo they did not enlarge before answering (`zm` 0), else
  any break from 20 questions later (40 for the first); twice at most, the second 100 questions after the first. Card
  (`tipShow`, `cardShow` kind `tip`, 💡): "Did you know?", "Tap a photo to see it bigger" ("Click" with a mouse), the
  photo just answered small with its enlarge mark ringed, one line, **Show me** (closes the card and opens the enlarged
  view of the photo just answered through the stage's own enlarge button, so with the answer shown; after a mix-up the
  photo shown, then the one of the unit answered; the player is back on the feedback when it closes, and Next goes on)
  and **Got it** (the next question). Anti-reflex as above (`TIP.WAIT`); Escape = Got it.
- **The Custom quiz tip** (`id` `custom`, ROADMAP "Did you know? tips" (a)): for a player with 100 questions or more here
  who never opened the Custom quiz (counter `u.c`, one per open of its picking page or its quiz, `quiz.js` `quizCustom`;
  the answer log cannot tell its answers from the Quiz's, so a saved selection also counts as one open, `tipsLoad`). In
  the Quiz only, at any break; twice at most, the second 150 questions after the first; after the zoom tip when both are
  due (one tip a visit). Card: "Did you know?", "Quiz yourself on just the genera you pick" (the subject's own word,
  `SUBJECTS` `many`), "The Custom quiz asks only the genera you choose. Quick picks choose for you: your weakest, or those
  you missed lately.", **Show me** (opens the Custom quiz's picking page) and **Got it**.
- **Logged** with the one-tap questions: `ev('pulse', {r, src: 'tip:<id>', m, n})`, r = `shown`, then `show` (Show me),
  `ok` (Got it, Escape) or `none` (another page opened with it up); no sheet change ([sync.md](sync.md#events-and-pages)).
  The admin (To do › Errors) keeps the `tip:` rows out of the one-tap tables and counts them apart (`tipsView`: per tip,
  devices, Shown, Show me, Got it, Left). At most 2 events a showing, 2 showings ever per tip and device.
  `tests/pages.smoke.js` `tipsCheck` (390 and 1280 px).

## The Duel tab's relief card

LEARNING.md "The Duel tab when the hold sets in"; `quiz.js` `DUELRUN`, `reliefNote`, `reliefDue`, `reliefArm`,
`reliefShow`. The first time in a duel run (`#practice/duels` or `#practice/duels/A/B`, from the moment the page is
opened, `app.js` `route` passing `quizDuel` whether it was just opened, until it is left; Next and Keep drilling stay in
it) that an answer takes the opening hold's sum (`HOLDS`, `holdStep`) from below `INTRO.HOLD` to it or more, the next
break at Next (`breakArm`) shows a card (`cardShow` kind `tip`, `.reliefcard`): "Tough pair today", "Take a step back?",
one line, **Mix in other genera** (the main button, `#practice/quiz`; the subject's word for its units, "families" for
the fish), **Compare them** (`#learn/compare/A/B`, the duel's two genera; only for a subject with the Compare page,
`SUBJECTS` `pages` `cmp`, and the line then leaves out "seeing these two side by side"), a quiet **Keep drilling**
(`.linkish.reliefx`, the next duel; Escape too).

**The way back.** Compare them keeps `DUELBACK` {h: the duel's hash, cmp: the comparison's, run, d: the duel page's
history depth}. The comparison (`learn.js` `viewCompare`, `duelBackFor`) then shows **Back to the duel**, in view however
far the page scrolls and in place of Drill this pair: on phones and tablets a floating main button at the bottom centre
(`.cmpfab`, the page ending with room for it, `.cmpfabpad`), from 1024 px a light band sticky under the page bar, "Duel
paused: A or B" and the button (`.duelband`, its offset from the bar's height in `--ctx-h`; DESIGN.md). `duelBack`:
`history.back()` when the entry before is the duel's, else the duel's address. The duel opened from it (that button or
the browser's Back: `route` passes `quizDuel` the page left) continues the same run (its card already shown), logged
`back`. Any other page drops `DUELBACK` (`route`, `duelBackKeep`), so a comparison opened any other way is unchanged.

At most once a run; gated like the tips (`promptOk` at arming and at the tap, `promptMark` when shown, never right before
a genus card, `nextCards`); a break it cannot take passes it to the next one of the run while the hold is on.
Anti-reflex as above. Logged with the tips: `ev('pulse', {r, src: 'tip:duelhold', m, n})`, r `shown`, then `mix`,
`cmp`, `keep` or `none`, and `back` on the return from the comparison; the admin's `tipsView` adds Compare, Mix in, Keep
drilling and Back to the duel columns when a row has them. In memory only (a reload starts a new run).
`tests/pages.smoke.js` `duelReliefCheck`, `tests/pace.test.js`.

## The custom quiz's reminder of the units waiting in the Quiz

The custom quiz opens no unit (rule L4), so a player who drills a long time there is reminded, once, of the units waiting
in the Quiz (LEARNING.md "Custom quiz"; `quiz.js` `LEFTN`, `leftStep`, `leftNote`, `leftDue`, `leftCount`, `leftWords`,
`leftArm`, `leftShow`).

- **Counting** (`leftNote`): a custom-quiz answer adds one, a photo-quiz answer starts the count over, a Duel-tab answer
  does neither; on this device, per subject (`reefid-<dev>custom-left` {n, shown}: `reefid-custom-left`,
  `reefid-fish-custom-left`; the player's, removed at sign-out and account deletion with the other per-subject records,
  `sync.js` `signOutClear`, rule D7).
- **Due** once the count reaches `LEFTN.AT` (100) while units of the path may still open (`leftCount`: the units in
  play, `pool()`, not met, `model.js` `introduced`, that the gates allow, `mayOpen`, as the photo quiz's opening reads
  them; bonus genera only when the player turned them on) and the opening hold is off (`model.js` `introHold`: while it
  is on the Quiz opens nothing new for a while, so the card waits for it to end).
- **The card**, at the next break at Next (`breakArm`; `cardShow` kind `tip`, `.leftcard`): "New genera", "13 new genera
  are waiting in the Quiz" (the subject's `one` / `many`: "1 new family is waiting…"), one line, **Go to the Quiz** (the
  main button, `#practice/quiz`) and **Keep drilling** (the next question; Escape too). Nothing to open: no card, the
  count goes on.
- **Once ever per subject**: marked when shown on this device (`shown`) and, signed in, for the account (`core.js`
  `TOLD` token `left:<subject>`, `sync.js` `toldAdd` / `toldHas`); signed in, it waits for the visit's first sync to have
  merged the account's notices (`noticesReady`).
- Gated like the relief card (`promptOk` at arming and at the tap, `promptMark` when shown, never right before a genus
  card, `nextCards`, nothing on screen); anti-reflex as above. Logged with the tips:
  `ev('pulse', {r, src: 'tip:customleft', m, n})`, r `shown`, then `quiz`, `keep` or `none`; the admin's `tipsView` adds a To the Quiz column
  when a row has one. `tests/custom.test.js`, `tests/pages.smoke.js` `customLeftCheck` (`SMOKE_ONLY=tips`).

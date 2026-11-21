# A new RA on a phone, second run (REE-182)

Date: 2026-11-21 night (Manila), after the evening's merges: the quiz keeps its question (#1375), fewer repeated
photos (#1376, #1379), the duels tip (#1370), Fish basics' achievement (#1369). The first run was 2026-11-20; its
findings 4 and 5 wait on Pierre in REE-70 and are not raised again here.

## How I played

- **Build**: a local copy of `origin/main` at `ef7819651`, served from this computer (rule D1: the app counts it as
  local and never writes to the sheet). The fish run played that commit as it is; the coral and sea slug runs played
  it with this PR's one-line basics fix (finding 1), which changes only the source line under a basics drawing.
  Sign-in, saves and loads were answered in the page by a made-up sheet (as `tests/pages.smoke.js` does); every other
  host was refused except the photo hosts. That made-up sheet answered saves too simply, so the signed-in coral player
  shows "Not saved" in the header in every screenshot: an artefact of the test, not of the app.
- **Real photos**: every R2 and iNaturalist photo was fetched with `curl` and served to the page, so the questions
  showed the photos players get. No photo failed (1,354 photo requests in the three complete runs).
- **Phone**: 390 × 844, touch, pixel ratio 2, motion allowed. Cards were closed by tapping their own button, never by
  a key a phone does not have.
- **Players**: a brand-new player per subject, from an empty browser: the welcome tour, "I'm new", the subject's
  basics step by step, then the quiz. A new RA's answers: half right in the first 20, two in three up to 50, three in
  four after (the script picks right or wrong; it does not learn, so the progress figures below are not a learner's).
  A few photos enlarged early, as a curious RA would.
- **Light and dark**: the first half of the answers in light, the second half in dark (the app's ⚙ Theme), then Home,
  My progress, Learn, the Duel tab and Achievements in both.
- **Runs**: corals 100 answers, signed in during the tour as a made-up "Testa B"; fish 100 answers, signed out; sea
  slugs twice, signed out: 50 answers (my script then tried to reach ⚙ behind a new-genus card, a script fault, not
  the app's), then a new player for 100 answers (screenshots `seaslug2-…`). At every question and every feedback, a
  probe checked for sideways scrolling, the answer buttons and Next off screen or covered, and those buttons under 40
  px tall.
- **Screenshots**: not committed (as the earlier reviews). They are named `<subject>-<nnn>-<what>.png` and the
  integrator has them; each finding names its files.

What held everywhere: no page error, no sideways scrolling, no card that would not close, no answer button or Next
under 40 px, every photo loaded, the feedback and Next always on one screen above the tab bar (but for finding 4).

## Tonight's changes, checked

| Change | What I saw |
|---|---|
| #1375, the quiz keeps its question | **Leaving and coming back** (My progress, then Learn, then the quiz) kept the same question, photo and choices in all three subjects (`coral-035-back-hash.png`, `fish-037-back-hash.png`, `seaslug-033-back-hash.png`). **A reload**: kept in fish and in the second sea slug run (`fish-045-back-reload.png`, `seaslug2-041-back-reload.png`), **not kept** in corals and in the first sea slug run (finding 2). |
| #1376 and #1379, fewer repeated photos | **Fish**: 100 questions on 98 different photo files (counted by file: 40 of them are not mapped to their observation by my script); the 2 repeats are Moorish Idol (a one-species family), 40 and 51 questions apart. **Sea slugs**: 50 photos in the first 50 questions; 89 in the second run's 100, 2 observations back within 20 questions. **Corals** (not in the scope of #1379): finding 3. |
| #1370, the duels tip | **Not reached**: it needs 150 questions, and a visit shows one tip; the Custom quiz tip took this visit's at answer 101 (`coral-061-card-tip.png`). As designed. |
| #1369, Fish basics' achievement | "Fin to tail" pops up on the last basics step, with its bronze badge (`fish-021-basics-end.png`); it is in the achievements list after. |

## Findings

### 1. Bug, fixed here: in Fish basics, the scalpel's IMR line reads as the source of every other feature

**Seen**: Fish basics, step 6 "One feature to look for", has five views (One scalpel, Two scalpels, Gill-cover spine,
Barbels, Locking spines). Under every one of them the page shows the step's official IMR line, *IMR fish presentation
(Lecture 10): "Presence of scalpel on caudal peduncle"*, with nothing saying it is about the scalpel. Under "Locking
spines" (`fish-021-basics-end.png`) a new RA reads it as the course's words for locking spines. The same holds for any
basics step of several views with an official line: the fish markings ("Bar"), the coral walls ("Wall"). The sea slug
steps checked show no such line.

**Cause**: `proto/basics.js` shows the step's term line (`official(s.term)`) beside every view, without the term; the
extra lines of a step (`also`) already name theirs.

**Fix (this PR)**: in a step of several views, the line names its term, as the extra lines do: "**Scalpel** · IMR fish
presentation (Lecture 10): "Presence of scalpel on caudal peduncle"". A step of one view is unchanged. The IMR wording
is untouched (rule C1). Checked by `tests/pages.smoke.js` (part `basics`, Fish basics); seen at 390 and 1280 px,
light and dark, on Fish basics' features and Coral basics' walls (`fix-fish-features-*.png`, `fix-coral-walls-*.png`).

### 2. Possible bug, cause unknown: a reload did not keep the question in 2 of 4 runs

**Seen**: #1375 says a question shown and not answered comes back after a reload, except a few cases it lists (a
question that came with a first-meeting card, a surprise card, a photo or genus gone from the draw). Reloading
mid-question:

- fish, answer 33, signed out: the same question (`fish-045-back-reload.png`);
- corals, answer 33, signed in: another genus, photo and choices (`coral-041-back-reload.png`; *Pectinia* became
  *Pocillopora*);
- sea slugs, first run, answer 33, signed out: another genus, photo and choices (`seaslug-041-back-reload.png`;
  *Chromodoris* became *Nembrotha*);
- sea slugs, second run (another new player), answer 33, signed out: the same question (`seaslug2-041-back-reload.png`).

Neither lost question was a first meeting (*Pectinia* was met at question 27, *Chromodoris* at question 1), and both
photos were still in play (the *Pectinia* one came back at question 43). What I did not record is whether the
device's store (`reefid-<device>pending`) held the question just before the reload, so I cannot tell a record that
was never written (one of #1375's not-kept cases I missed) from one lost at start-up. Leaving by the menu was tested
at question 12 only, which always followed a wrong answer in my pattern, so it is no proof that the record is written
at question 33. `tests/pending.smoke.js` checks a reload on a player's first questions and passes; these players had
30 answers and more.

**Not fixed here**: the cause is not found. Next step, a task of its own (REE-188's follow-up): replay a new player to
about 35 answers in each subject, log the pending record and the cards shown before each reload, and reload at
several points; a script that does this, written for this review but held back by the machine's queue, is with the
integrator (`repro.js`).

### 3. Design: a new coral player sees the same photos again within a few minutes

**Seen** (corals, 100 answers): 112 photo files on 87 observations; 6 times an observation came back within 20
questions. *Porites* showed the same two photos (one observation) at questions 7, 20 and 35; *Plerogyra* one photo at
12, 30 and 60; *Pocillopora* two observations twice each, 13 questions apart. Fish (98 photos in 100) and sea slugs (50
in 50, then 89 in 100 with 2 back within 20) had few. A likely reading, not measured here: a new player meets few
genera, the "Again" pairs come back often, and before Open Water a genus shows mostly its easiest photos, so the few
easy observations of a genus rotate fast.

**Already known**: `docs/reviews/2026-11-21-photo-diversity.md` measured it on the real log (corals' thin genera repeat
most: 234 near repeats in 3,920 answers) and left corals as report only, since coral photos come through Pierre's own
curation.

**Options**: (a) keep; (b) count the corals' easiest photos by observation in the draw, as #1376 did for fish (the
engine is one, so it may already apply: to check on the log); (c) more easy coral candidates for the thin genera,
through Pierre's curation.
**Recommendation**: (b) checked first on the real log (no player-visible change if it already applies), then (c) for
the genera still short. Not built: the draw's rules and the curation are Pierre's.

### 4. Design: the leaderboard note covers two answers on the phone quiz

**Seen**: after signing in, at the next visit, "🏆 New: a leaderboard. Your name shows there; to leave it, ⚙
Settings, Leaderboard: Off." slides up above the tab bar for 15 seconds (`coral-041-back-reload.png`,
`coral-043-q40.png`). On a phone it sits over the bottom row of the quiz's four answers (two of four hidden) and, on
the feedback, over Next. Its ✕ is 32 px, under the 40 px the answers have. A new RA also reads "New:" about something
that was never old to them.

**Cause**: `progress.js` `boardNotice`, written for players already signed in when the leaderboard came, shows to
every account that has not been told yet, so to every new one; `appToast` sits at the bottom on phones, above the tab
bar.

**Options**: (a) keep (✕ closes it, 15 s); (b) hold the note while a question is open, show it on a page without one
(Home, My progress); (c) for a player who signed in after the leaderboard came, a plain line "Your name shows on the
leaderboard; to leave it, ⚙ Settings, Leaderboard: Off" instead of "New:".
**Recommendation**: (b) and (c): the note matters (it says where a name shows), but not over an answer.

### 5. Design, small: Home's "Fish ID Key" opens a "coming soon" page

**Seen**: the fish Home shows "In EventMeasure · Identify a fish · **Fish ID Key**" as a ready button
(`fish-073-page-home-light.png`); it opens a page headed "Fish ID Key · Coming soon" (`fishkey-page-390-light.png`). The tour said so ("its key is
coming soon", `fish-004-tour4.png`), Home's door does not. The key itself is under way (REE-9), so this lasts until it
ships.

**Options**: (a) keep until REE-9 ships; (b) a "soon" tag on the door, as the sea slugs' "beta". **Recommendation**:
(b) unless REE-9 is about to ship, else (a).

### 6. Design, small: Sea slug basics earns no achievement

**Seen**: Coral basics earns "Coral basics" and, since #1369, Fish basics earns "Fin to tail"
(`fish-021-basics-end.png`). Sea slug basics, walked to its end, sets its done mark (`_sbasics`) and earns nothing
(`seaslug2-017-basics-end.png`); `core.js` `SEASLUG_ACH` has no basics entry. Pierre agreed the sea slugs' list as a
first version (2026-11-17, and its % ladder on 2026-11-18, `docs/decisions/2026-11-18-seaslug-achievements-high.md`),
so a new entry is his call.

**Options**: (a) keep (the sea slugs are in beta); (b) a sea slug basics achievement, as #1369 did for fish (one
`core.js` entry, a name to choose). **Recommendation**: (b), with the next look at the sea slug achievements.

### 7. For REE-70: the progress figure goes down as families open

Not a new finding: evidence for REE-70's finding 4. In the fish run, the tab bar's Progress read 0% for 3 answers,
climbed to 8% at answer 27, then fell to 0-5% as new families opened, ending at 3% after 100 answers at 67% right.
The corals, with the same pattern, climbed from 1% at answer 52 to 5-6% at answer 100. My answers do not learn (right
or wrong by a fixed pattern), so this says nothing about a real learner's figure; it shows that a new RA's fish number
can fall while they answer two in three right, which REE-70's "next step" line would help explain.

## Not checked

- Signing in against the real sheet (rule D1), and a sign-in on a second device.
- The duels tip (150 questions and a second visit).
- Tablet and desktop widths; Identify (the Coral Finder).

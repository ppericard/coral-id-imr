# The app's work per answer on a long history, on a phone-like CPU (2026-11-24)

Status: measurement, read-only, docs only (Linear REE-263, its "Next action"). No app code, data file, curation or
sheet was changed. The progress states are the simulator's (`tools/learnsim.js`), never the real sheet's (rule D1); no
player appears. It is before 04:00 Manila (Rule 0): nothing is asked here; the fixes below are proposals for the
integrator, each value-preserving.

Labels (rule W11): **[measured]** timed or profiled by the scripts below on `main` @b45dc395; **[read]** read in the
code or a doc; **[guess]** a judgement or an extrapolation.

## Answer first

- **Fish: yes, it matters.** One fish answer costs the page 0.5 s of main-thread work at 500 answers and 1 to 2.5 s at
  2,000 to 3,000 answers on this machine's CPU; under 4× CPU throttling (the slowdown Lighthouse uses for its mobile
  runs [read, from memory, not looked up here]) 1.7 s at 500 answers and 4.5 to 10.8 s at 2,000 to 3,000; at 4× the
  tap on a choice alone takes 0.8 s (500 answers) to 6.2 s (2,000) to show its feedback [measured]. That is far over
  the issue's ~100 ms.
- **Corals: no growth.** 60 ms an answer at 1,500 and 3,000 answers (1×), 270 to 300 ms at 4×, flat with the history
  [measured]. Most of it is the answer logs' storage reads and writes, not the units' bars.
- **Two thirds of the fish cost is the false-alarm scan** (`core.js` `faScan` and `faOf`: 71% of the busy time at
  3,000 answers × 4×) [measured]. Arming the false-alarm table in the page (`core.js` `faArm`, as PR #1514's learnsim
  does) cuts the fish time per answer by 43 to 73% across the cells (52 to 69% at 1×) and changes nothing for the
  corals [measured]. So learnsim's own timings, once #1514 is merged, understate the app's cost on the fish by about 2
  to 3 times. Values were not compared here: #1514 checked them with `FA_CHECK` on a full run [read].
- **What remains after that grows with the units squared**: `model.js` `examLooks` builds the units in play
  (`app.js` `bonusList`) once for every unit it checks, and `app.js` `lvlNext` counts the units met once for every
  family (section 4) [measured].

## 1. Method

**Histories** [measured]. A scratch copy of `tools/learnsim.js` (outside the repository) played one simulated player
to 3,000 answers per subject (`--profiles lectureRA --seeds 1 --questions 3000 --ach --choice auto`, the fish with
`--beyond yes`), with the false-alarm table armed as PR #1514 does (same answers, a run in minutes), and saved the
page's whole localStorage at 500, 1,000, 1,500, 2,000 and 3,000 answers. Units with a record: fish 64, 76, 97 and 137 at
500, 1,000, 2,000 and 3,000 answers; corals 46. localStorage held 2.6 to 3.9 million characters (the answer logs at
their cap make most of it).

**The timing** [measured]. A second scratch script serves the worktree, opens Chromium (Playwright) at 390 × 844 with
that localStorage (real browser storage, signed out, every request outside the page aborted), goes to the quiz and
plays answers through `tests/answer.js` `smokeAnswer` (three right, one wrong). For each answer, with
`Emulation.setCPUThrottlingRate` at 1×, 4× or 6×:

- **answer total**: the main thread's busy time (`Performance.getMetrics` `TaskDuration`) from the tap on a choice,
  through the feedback, the 50 ms deferred planning (`quiz.js` `planNext`), the tap on Next and its own deferred top-up,
  until the page is idle: what the CPU does per answer;
- **tap to feedback**: from the tap to the next frame after `quiz.js` `answer` (what the player waits for);
- **Next to question**: from the tap on Next to the next frame with the new question.

Each cell: a fresh page from the saved state, 2 answers of warm-up, then the median of 9 answers (25 at 1×, the fish).
A CPU profile (CDP `Profiler`, 200 µs sampling) over 6 answers at fish 3,000 × 4×, armed and not, and corals 3,000 × 4×.

**Limits** [read]. One simulated player and seed: a real history spreads over weeks and opens units in another order.
This machine is shared by other agents (4 cores, load 1 to 2 during the runs), so a cell's spread is wide (min to max
in the scratch output often 2 to 3 times); throttling slows this machine's CPU, it does not emulate a phone's. No photos
are served: a Find the X whose tiles never load stays closed (`q qnone`), so the fish 3,000 × 1× unarmed cell has 7 of 25
answers. Signed out: no sync traffic.

## 2. Time per answer

Median ms per answer: **answer total** (tap to feedback in brackets). "Armed": `faArm(P)` called in the page before
each answer, an experiment only (the app never arms it today).

| History | 1× | 4× | 6× | Armed 1× | Armed 4× | Armed 6× |
| --- | --- | --- | --- | --- | --- | --- |
| Fish, 500 answers (64 units) | 494 (237) | 1,663 (770) | 2,647 (1,067) | 153 (76) | 950 (359) | 944 (417) |
| Fish, 1,000 (76 units) | 536 (246) | 2,369 (1,654) | 4,094 (2,335) | 207 (98) | 971 (407) | 1,539 (707) |
| Fish, 2,000 (97 units) | 2,512 (1,420) | 10,777 (6,189) | 10,749 (9,043) | 847 (475) | 2,936 (2,432) | 6,353 (3,486) |
| Fish, 3,000 (137 units) | 962 (785), n = 7 | 4,538 (3,539) | 13,555 (5,147) | 461 (206) | 2,114 (968) | 3,264 (1,568) |
| Corals, 1,500 (46 units) | 59 (27) | 265 (148) | 390 (206) | 64 (26) | 241 (117) | 418 (181) |
| Corals, 3,000 (46 units) | 63 (33) | 299 (147) | 549 (265) | 77 (37) | 278 (137) | 419 (230) |

Next to question: fish 55 to 140 ms at 1× and 240 to 780 ms at 4× to 6× (unarmed), corals 14 ms at 1× and 60 to 80 ms
at 4× to 6× [measured].

Read [measured unless marked]:

- The fish cost does not follow the answers alone: 2,000 answers cost more than 3,000 in every column. **[guess]** The
  costly check (`model.js` `examOn`) stops early for a unit already learned (`s.mx`) or below the exam's bar, so its
  work peaks while many units sit near the exam's entry; at 3,000 answers more of this player's units may already be
  learned. Not checked unit by unit.
- The 4× and 6× columns are noisy (fish 2,000: 10.8 s at both); their ratio to 1× is 2 to 6.
- Even at 500 fish answers a 4× phone waits 0.8 s for the feedback after each tap, and the deferred planning that
  follows keeps the main thread busy about another second while the feedback is read (a tap on Next meanwhile waits).

## 3. Where the time goes (CPU profiles, 4×)

Shares of the busy (non-idle) samples. Inclusive: the function and what it calls [measured].

**Fish, 3,000 answers, not armed** (70.8 s busy over 6 answers):

| Function | Self | Inclusive | Reached from |
| --- | --- | --- | --- |
| `core.js` `faScan` | 49.3% | 49.8% | `faOf` |
| `core.js` `faOf` | 21.5% | 71.3% | `domVal` ← `barOf` / `scoreOf` ← `model.js` `genScore`: 45% under `planNext`, 22% under `answer`, 4% under Next |
| `model.js` `examOn` → `examLooks` | | 44.3% | `answer` 25%, `planNext` 20% (the exam check of every unit, each building `bonusList`) |
| `app.js` `sciOpen` | | 31.4% | the scientific genera's `units` and `auto` (`app.js` `SETS`), each reading every genus's bar |
| `model.js` `headScore` ← `treeC3` | | 28.8% | `planNext` |
| `progress.js` `achSnap` ← `achCheck` | | 27.1% | `answer` (`lvStep` of every unit) |
| `model.js` `nextTarget` → `weighted` | | 25.5% | `planPhoto` |
| `app.js` `spPlay` → `lvlNext` | | 21.2% | the species set's `auto` |
| `app.js` `bonusList`, direct callers | | 19.1% | `model.js` `cbPlay` (via `rustNow`) 9.6%, `app.js` `pool` 8.2%, `achSnap` 1.3% |

**Fish, 3,000 answers, armed** (19.8 s busy, 72% less): `faOf` 0.9%. What is left: `examOn` → `examLooks` 49.9%,
`spPlay` 49.5% (`lvlNext` 43.0%, of which `model.js` `introduced` ← `closed` / `asked` 33%: `lvlNext` counts the met
units of the whole list once per family), `nextTarget` 27.4%, `achSnap` 26.5%, `bonusList` direct 18.7%, `rustNow` →
`cbPlay` 10.4%, localStorage reads parsed in loops (`app.js` `store.get`: `sync.js` `sheetV` 2.7%, `model.js`
`startV` 1.5%, `quiz.js` `tipsLoad` 1.1%) 7.9% [measured].

**Corals, 3,000 answers, not armed** (2.2 s busy over 6 answers): `store.get` 21% and `store.set` 18% inclusive (the
answer logs read and written whole: `quiz.js` `logAnswer` 23%), `faOf` under 1% [measured].

## 4. Fix proposals, ranked by gain and risk

None changes a value: each computes the same results with less work, checked by tests that compare the old and the new
path on the same states. Lanes (rule W27): `core.js` and `Code.gs` are held by the open PR for REE-32; `model.js`,
`app.js` and `quiz.js` take one PR at a time (`app.js` and `quiz.js` are in #1513 now) [read].

| # | Proposal | Gain [measured or guess] | Risk | Lane |
| --- | --- | --- | --- | --- |
| 1 | **Arm the false-alarm table around each app handler**: `faArm(P)` at the start of `quiz.js` `answer`, `quizPhoto`, the `planNext` timers and `progress.js` `achCheck`, `faDisarm(P)` in a `finally` at their end, so the table lives only inside one synchronous task where nothing but `scoreAnswer` writes the records' `conf`, `off`, `ty` or the level's `tyk` (it already empties the table when it does). | Measured as an experiment: fish −43 to −73% per answer (1×: 494 → 153 ms at 500, 2,512 → 847 ms at 2,000; 4×: 10.8 → 2.9 s at 2,000); corals none | Low: `core.js` `faArm`'s contract and `FA_CHECK` exist; a sync reply arrives in its own task, so it cannot land inside the window. Tests: the fish smoke with `FA_CHECK.on` (every table read compared with the scan), and P disarmed after each handler | `quiz.js` (and `progress.js`); the sentence "the app and the sheet never arm" in `core/score.js` and LEARNING.md "Long rated runs" changes with it, so the comment waits for the `core.js` lane |
| 2 | **`app.js` `lvlNext`: count the met units of the list once per call of `spPlay` / `sciPlay`**, not once per family (pass the count in) | [guess from the profile] up to a third of what is left after 1 (`introduced` via `lvlNext` 33% of the armed busy time); about 8% before 1 | Very low: `met` reads nothing the call writes. Test: `spPlay` and `sciPlay` equal before and after on saved states | `app.js` |
| 3 | **`model.js` `examLooks`: find the look-alikes first, the units in play only if needed**: n's own look list and a reverse index of the look lists (built once per data load), then each candidate tested against the slate (a Set), and `bonusList` only when a candidate is not on the slate; the result in the same order as today (the slate's order, then `bonusList`'s) | [guess from the profile] most of `examLooks`' 44 to 50% for the units whose look-alikes are all on the slate or that have none | Low: same filter, same order. Test: `examLooks(n)` equal to today's for every unit on saved states of both subjects | `model.js` |
| 4 | **One list of the units in play per task**: `app.js` `bonusList` (and the sets' `auto`) kept until anything it reads is written (P, Q, the intro map, the sheet version), with a check mode as `FA_CHECK` (every kept value compared with a fresh one in the tests) | [guess] the rest of `bonusList`'s callers: `rustNow` → `cbPlay` 10%, `pool` 8%, `sciUp`, `achSnap`; 20 to 30% of what is left after 1 to 3 | Medium: the invalidation must see every writer; the check mode in the fish smoke and learnsim catches a miss | `app.js` (`model.js` for `cbPlay` if it changes) |
| 5 | **Storage read once, not per unit**: the small keys read inside per-unit loops (`sync.js` `sheetV`, `model.js` `startV`, `imrSaid`) and the answer logs (`quiz.js` `logAnswer`) kept parsed in memory, written through, refreshed on the `storage` event | Fish about 8% of what is left after 1; corals the largest share left (about 40% of their 0.3 s at 4×) | Low to medium: another tab's writes must refresh the copy | `sync.js` (sensitive, one PR at a time), `model.js`, `quiz.js` |

Order: 1 first (most of the gain, the smallest change); then 2 and 3 (each small, in their own lanes, so they can run
side by side with 1 if the lanes are free); 4 and 5 only if a re-measure with this note's scripts still shows more than
about 100 ms at 1× or 400 ms at 4× on the fish.

## 5. Scripts

The two scratch scripts (a learnsim copy that saves the page's storage at checkpoints, and the timing and profile
harness) stayed outside the repository, as did the saved states and profiles. The measure is repeatable from section 1;
a committed tool would be a separate change (`tools/`, a machine-slot guard, rule W24).

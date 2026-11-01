# Code re-review: coral-id-imr (senior developer)

> **Copied into the repo for the handover (2026-11-01).** Original: a private Claude doc on claude.ai (not reachable from another account). Reviewed `main` at 4f6df67 (PR #264).
>
> **Status since:** H1 fixed (#268: `curation.json` in the SW shell + `imr-curation-last` fallback); M1 fixed (#267: sign-in merges anonymous play); M2 fixed (#275: `applyCuration`/`applySlots` in `core.js`, `tests/photos.test.js`); M3 obsolete (#263, Code.gs v8 checks admins by GitHub token); M4 fixed (#272, tabs merge drafts); M5 partly fixed (#277 page smoke test in CI; `data.json` one genus per line and the Prettier/modules split are still open in `docs/ROADMAP.md`); L1, L2, L3 fixed (#268); L4 open (rate-limit reports only if abused); L5/L6 partly (#268); L7 = repo size watch (ROADMAP). `photoSet`/`distractors` still untested (ROADMAP).

Nov 1, 2026 · Pierre Pericard

## Verdict

The app is in clearly better shape than at the last review: 17 of the 18 earlier findings are fixed, there is now a test suite and a PR check, and nothing here is critical. One high-severity bug remains, found and reproduced in this review: after any deploy, a phone that goes offline runs the app **without Pierre's curation** (exclusions, hidden photos, "not this genus" moves), so wrong photos can reach the quiz.

One high, five medium, seven low. No code was changed.

Top actions, in order (M1 and M3 are already handled elsewhere, see Findings):

1. Keep `curation.json` available offline after a deploy (H1, about 30 min).
2. Stop signing in from wiping local progress without a word (M1).
3. Move `applyCuration`, `applySlots` and `photoSet` into `core.js` and test Pierre's photo rules (M2).
4. Have Pierre set `OWNER` in Script Properties right after redeploying Code.gs v7 (M3, two minutes, no code).
5. Add a Playwright smoke test to the PR check (M5).

## Findings

### High

**H1. Offline after a deploy, the app runs with no curation at all.** `curation.json` is not in the service worker's `SHELL` list (`sw.js:6`). It is cached only as a side effect of a normal fetch, into the versioned shell cache `V`. On a deploy, `activate` deletes the old shell cache and moves only `/img/` entries to the photo cache (`sw.js:10-17`); the page's own curation fetch has already gone through the old worker by then. Reproduced in headless Chromium on a local copy: before a simulated deploy, `imr-coral-id-v177` holds `curation.json`; after one online visit with the new `V`, no cache holds it; offline reload then gives `CUR` with 0 genera and 0 exclusions (49 and 10 online). `softFail` only warns in the console, and only shows a note in Pierre's browser. Effect for an RA offline on a boat: excluded photos, photos Pierre moved to another genus (`out`), hidden photos and his `single` marks are all ignored, so a quiz can show a photo under the wrong genus. Fix: add `curation.json` to `SHELL` (fetched with `cache: 'no-cache'` at install), or let `activate` carry over every non-versioned entry, and keep the last good curation in `localStorage` as a fallback in `curation()` (`app.js:1461`).

### Medium

*Update (same day): M1 is being fixed in the thread "Get beta testers signed in and playing fast", and M3 is gone since PR #263 (Code.gs v8 checks admins by their GitHub token, no OWNER). Both are kept below for the record only.*

**M1. Signing in to an existing name wipes this device's progress with no warning.** `bindSync` (`app.js:1260`) removes every `imr-coral*` key, then loads the sheet's copy. An RA who practised on a phone before signing in with the name they already use on a laptop loses the phone's answers (they were never logged either: `SYNC.log` only fills when signed in, `app.js:873`). The comment explains why (a shared device), but the user is not told. Fix: when local progress exists, ask "Keep this device's answers too?" and merge with `mergeProgress({}, P, R)`; keep the replace path for a shared device.

**M2. The rule-heavy photo logic has no tests.** The 21 tests cover `merge3`, `mergeProgress`, `eloOf` and Code.gs, which is good. But `applyCuration`, `applySlots`, `photoSet` and `distractors` (`app.js:59-186, 626-665`) carry most of Pierre's standing rules: book photos never in games, no multi-coral photos, IMR first, one observation per question, bonus genera Research Grade only. They are untested because they read app globals (`CUR`, `PICKS`, `AUTOQ`, `P`, `PSTAT`). Fix: pass those in as arguments, move them to `core.js`, and add invariant tests over the real `data.json` + `curation.json` ("no game set holds a `cf` or `multi` photo", "every question's photos share one `o`", "an excluded file appears nowhere"). This is the regression net for the next parallel threads.

**M3. Whoever calls `?reports=1` first becomes the reports owner.** `reports_` (`Code.gs`, end) sets Script Property `OWNER` to the first name with a right code while it is unset. Anyone can create a name with a POST, so anyone who calls it before Pierre gets every report with reporters' names, and Pierre then gets `owner`. Fix without code: set `OWNER` by hand when redeploying v7 and say so in the redeploy steps in ARCHITECTURE.md. Better: refuse while `OWNER` is unset.

**M4. Two admin tabs in one browser overwrite each other's draft.** Each tab keeps `DRAFT` in memory and writes the whole of it to `imr-curation-draft` on every click (`admin.js:51`); there is no `storage` listener for the draft (only for flags). Clicks made in tab A are lost from storage as soon as tab B is clicked, and lost for good if A is closed before publishing. Pierre does use the admin next to `index.html?draft`, so a second admin tab is plausible. Fix: listen for `storage` on `imr-curation-draft` and `rebase()` onto it, or warn "open in another tab" with a `BroadcastChannel`.

**M5. Code size keeps growing with no lint and no smoke test.** `app.js` is 144 KB (126 KB at the last review) and `admin.js` 161 KB (149 KB), classic globals, lines up to 660 characters. `data.json` is one 548 KB line, so any two edits conflict in full and diffs are unreadable. The PR check runs syntax, unit tests, JSON, Python and versions, but never loads a page. Fix: a 20-second Playwright step that opens the 10 main routes at 390 and 1280 px and fails on any page error (done by hand for this review: all clean); write `data.json` with one genus per line (gzip on Pages makes the size cost negligible); keep the deferred Prettier/modules split (ROADMAP) for a quiet moment.

### Low

- **L1. Network-first shell with no timeout.** On a slow link every shell file waits for the network before the cache answers (`sw.js:28`). With 8 s added per request, a reload had not finished after 60 s although every file was cached. Fix: race the network against a 3 s timer, then serve the cache.
- **L2. Bad hash links crash the page.** `#quiz-duel|Foo|Bar` throws in `photoSet` (`GX` undefined); `#g-%E0` throws `URI malformed` in `route()`. Fix: validate duel genera, wrap `decodeURIComponent`.
- **L3. A name can be locked out by anyone.** Five wrong codes block a name for 10 min (`blocked_`), including its owner, and the app then says "could not reach the sheet" (`wait` maps to `net`, `app.js:1131`). Show the real reason.
- **L4. Reports can be spammed.** Unverified reports are accepted with no rate limit (50 per call). Fine for 6 RAs; add a per-day cap if it is ever abused.
- **L5. Small template inconsistencies.** The lightbox puts `p.src` in an `href` without `safeUrl` (`app.js:242`); `credit()` leaves `p.pg` and `p.slide` unescaped. Data is first-party, so only defensive.
- **L6. Small leaks.** `REPC` grows by one entry per answer; `fitStage` adds a new `load` listener per image on every resize; `pool()` runs `photoSet` for all 45 genera per question. Harmless at this scale.
- **L7. Repository weight.** `.git` is 193 MB, `img/` 185 MB. Still far from the 1 GB Pages limit; keep watching.

## Better or worse than before

**Better, clearly.** The previous review ([Code review: coral-id-imr](https://claude.ai/artifact/9DbWPbTKU6YUnqU4oq1Tvq), same day, `main` at 7a3934e) had 3 high, 7 medium and 8 low findings. I formed my view first and read it only afterwards. Checked against the code, 17 of 18 are fixed; only the code-density item is still open (it got worse, M5). The two new mediums that matter most (M1, M3) come from features added since, not from regressions. H1 here predates both reviews: the old shell cache lost `curation.json` the same way, and neither the earlier review nor its photo-cache fix caught it.

| Earlier finding | Status now |
| --- | --- |
| H1 token in plain `localStorage` | Fixed: `sessionStorage` only, 90-day token, CSP |
| H2 progress over the 50,000-character cell | Fixed in Code.gs v6 (chunks, answers logged first); live once Pierre redeploys |
| H3 deploy wipes photo cache | Fixed: separate `imr-photos-v1`, `res.ok`, cap 2,500 |
| M1 two devices overwrite each other | Fixed: revision check, `stale`, retry twice (needs v6 live) |
| M2 open endpoint, formulas, PIN brute force | Fixed: `safe_`, pattern checks, throttle |
| M3 reversible anonymous ids | Fixed: secret salt |
| M4 stale GitHub reads | Fixed: `no-store`, auto-retry on 409 |
| M5 silent list conflicts | Fixed: toast names replaced choices |
| M6 no tests, no CI | Mostly fixed: 21 tests and a PR check; photo logic still untested (M2 here) |
| M7 hand-typed `?v=` | Fixed: `check_versions.py --fix`, enforced in CI |
| L1 code density | Open, and grown (M5 here) |
| L2 escaping, URLs, CSP | Fixed (two small gaps, L5 here) |
| L3 stacked key listeners | Fixed: one `AbortController` |
| L4 silent failures | Fixed: `softFail` (but RAs never see it, see H1) |
| L5 sync edge cases | Fixed: queue 2,000 |
| L6 repo weight | Watching (L7 here) |
| L7 dead tools | Fixed: `tools/archive/` |
| L8 Action downloads any URL | Fixed: iNat host allowlist |

What improved beyond the list: pure logic now lives in `core.js` and is checked against the Apps Script copy of the Elo; the security model and Code.gs versions are written down in ARCHITECTURE.md; the docs match the code on every point I checked. The one dependency that still sits with Pierre: Code.gs v7 is written but v5 is live, so H2, M1 and M3 of the old review only take effect after his redeploy.

## What was checked

Reviewed `main` at 4f6df67 (PR #264): `app.js`, `core.js`, `sw.js`, `index.html`, the publish, token and triage paths of `admin.js`, `tools/sync/Code.gs` v7, both GitHub workflows and `fetch_approved.py`, against AGENTS.md and docs/ARCHITECTURE.md. Ran `node --test` (21 pass) and `check_versions.py` (OK). In headless Chromium on a local copy: the offline-after-deploy test (H1), a slow-network reload (L1), and 12 routes at 390 and 1280 px (10 main routes clean, 2 malformed links crash, L2). Not reviewed line by line: `proto/` Lab tools, CSS, and the stats views of `admin.js`.

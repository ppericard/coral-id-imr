# Running, testing and deploying

How to run the site locally, what the tests cover, and how `main` reaches GitHub Pages. This is the specification of
what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and the PRs. Every
workflow, its triggers, the build at deploy, the health check and the recovery of a stuck deployment are in
[PAGES.md](../PAGES.md); how to run the tests is in the README's "Test" section; the rules are W12-W27
([rules/ship.md](../rules/ship.md)).

## Running locally

`python3 -m http.server 8000` at the repository root, then <http://localhost:8000> (`admin.html` for the back-office;
without a token `admin.html?demo`, made-up data, or `admin.html?readonly`, the real public curation). Only the deployed
site (`app.js` `SHEET_SITE`, the address in `index.html` `og:url`) talks to the sheet. Any other copy (`localhost`, an
address on the network, `file:`, a fork, a webdriver browser anywhere) is a local copy that never asks it anything,
statistics and leaderboards included (`app.js` `LOCAL`, `sheetFetch`: "local copy: the sheet is off" unless a test sets
`window.SHEET_STUB`); only the R2 photos reach a live service. The admin page keeps its own copy of that gate
(`admin.js` `SHEET_SITE`, `LOCAL`, `sheetFetch`): off outside the deployed site, `?readonly` included, so a local
`admin.html?readonly` shows no photo statistics; `?demo` answers in memory as before.

## Deploying

- `.github/workflows/pages.yml` publishes the current `main` as a static artifact, in one `pages` concurrency group with
  `cancel-in-progress: true`. Settings > Pages must use **GitHub Actions**; the workflow fails early while the legacy
  branch source is selected.
- **The artifact wait** (REE-279): before `deploy-pages`, a step polls the run's REST artifact listing every 2 s, for at most
  60 s, logs each attempt and the lag (`::notice title=pages-artifact-lag`, and the run's summary), and only warns
  (`::warning title=pages-artifact-lag`) if `github-pages` is never listed: it never fails the job, the deploy attempts go on
  and the second one decides. It needs the job permission `actions: read` and only measures. `deploy-pages` reads the artifact from the results service, not this listing, so the wait is a proxy
  ([PAGES.md › The artifact wait](../PAGES.md#the-artifact-wait-ree-279-2026-11-24)); `tests/pageswait.test.js` runs the
  step's script on a fake clock.
- **The second deploy attempt** (REE-279): the first `deploy-pages` step has `continue-on-error: true`; when it fails, a
  step logs `::warning title=pages-deploy-second-attempt`, pauses 20 s, and one second `deploy-pages` step (no
  `continue-on-error`) deploys, or fails the job. One bounded attempt in the same run, not a re-run; the page URL comes from
  whichever attempt deployed ([PAGES.md › The second attempt](../PAGES.md#the-artifact-wait-ree-279-2026-11-24)).
- **The live site is checked against `main`** every hour: Health reads the live build number (`<meta name="build">`, a
  Deploy Pages run number), finds that run, and fails when a commit of `main` dated after the run's start has waited more
  than 45 minutes, naming the commits (the job's e-mail and issue; the brief's `Infra:` line). Gaps on GitHub's side are
  notes, never failures ([PAGES.md › Infrastructure health](../PAGES.md#infrastructure-health); `tests/infra.test.js`).
- **The admin's Publish** pushes `curation.json` to `main`, which starts both Deploy Pages and Candidate photos (which
  also runs on a push changing `data/suggest.json`, `tools/fish_judge.json`, `tools/fish_refs.json`, `tools/fish_game.py` or
  `fish-photos.json`). Candidate photos commits `data.json`, `data/cand.json`, `data/excluded.json`, `fish-game.json`,
  `fish-photos.json`, `data/fish-cand.json`, `tools/fish_refs.json`, `data/seaslug-cand.json`,
  `seaslug.json`, `seaslug-game.json` and `img/` (and, in its `fish` job, `data/fish-cand.json` and
  `tools/fish_refill.json`) with `GITHUB_TOKEN`; its completion starts Deploy Pages again, so the bot's changes are published too
  ([photos.md › The Candidate photos workflow](photos.md#the-candidate-photos-workflow)).
- **The build**: the deploy writes the players' curation, minifies the scripts of its staged copy with source maps,
  stamps every `?v=` and `sw.js` `V` from content hashes (`tools/stamp_versions.py`, rule W15) and plays the copy
  before publishing it (`tools/build_site.py`, `tests/staged.smoke.js`;
  [PAGES.md › The build at deploy](../PAGES.md#the-build-at-deploy)). The
  repository's files stay as written, and a shell change reaches the players without anyone bumping a number.
  `curation.json` is fetched with `no-cache` (from the kept copy first at start-up:
  [loading.md › Start-up](loading.md#start-up)).
- **Pushes to `main` never run Checks** (the admin's Publish, the Candidate photos bot): Deploy Pages first checks that
  every tracked JSON file parses (`tools/check_json.py`, also a Checks step on pull requests) and the `data.json` layout
  (`tools/datajson.py --check`), so a broken commit fails the deploy and the last good site stays live; fix it with a new
  commit.
- A completed Actions run can leave a stale Pages backend lock: cancel the blocking **Pages deployment** as well as any
  stuck Actions run, then dispatch `pages.yml` on `main` ([PAGES.md › Manual recovery](../PAGES.md#manual-recovery)).
  Rerunning the blocking legacy commit again and again is not the fix.

## Tests

The sync's tests: [sync.md › Tests](sync.md#tests).

- CI's Checks runs `checks` (everything but the unit tests) beside two shards, `unit tests (k/2)`
  (`node --test --test-shard=k/2`: every file in one shard, the `// @slow` ones too; `tests/smokeparts.test.js` checks
  the list). Locally `node tests/run.js` skips the slow ones, `--all` runs them (rule W24).
- `tests/photos.test.js` checks the photo rules on the real data and curation.
- The Playwright smokes run in CI's smoke jobs (`smokes.yml`):
  - `tests/pages.smoke.js` opens the main routes, two malformed links and `admin.html?readonly` at 390 and 1280 px,
    external hosts cut off, and fails on any page error.
  - `tests/draw.smoke.js` runs the real `photoSet()` and `distractors()` in the page for every genus at 4 player levels
    and checks one observation per question, no multi-coral photo, bonus genera Research Grade only, and the asked
    number of traps among 3 distinct choices.
  - `tests/admin.smoke.js` opens `admin.html?demo` at 390 and 1280 px. After each step it waits for no demo call in
    flight (`admin-demo.js` `window.DEMO_PENDING`) and no "Loading…" note, over three frames, not a fixed time. It opens
    every view of every tab and every old address (each must land on its tab, in the tab row and the phone menu, and its
    view, with no sideways scroll), checks that each tab and group reopens its view used last (after a reload too), To
    do › All (Health's line first, reports, errors), the Where to look banner, Put back in Hidden and the genus page's
    view filter, then opens a player, merges two names, deletes one, checks the reports in To do, Skip and Reject in
    Candidates and Publish, and fails if a call reaches the sync script or GitHub or a real admin storage key is written.
  - `tests/fish.smoke.js` uses two jobs. `main` runs games (including Find the X), sync and load order. `fresh` runs
    the brand-new players, the quiz and progress sequence, the interface and beta access checks, and Memory. The five seeds
    each get their own context, with all five running at once on CI and two at a time in a local slot.
    Each job prints the time of its parts. `tests/smokeparts.test.js` checks the execution plan for both jobs.

## Repository attributes

`.gitattributes`: every text file stored with LF (`* text=auto eol=lf`); the machine-written JSON (`data/cand.json`,
`data/fish-cand.json`, `fish-game.json`, `data/suggest.json`) marked `linguist-generated`, so GitHub folds their diffs (`data.json`,
the hand-edited source of truth, stays shown); `docs/`, `tests/`, `tools/`, `judging/`, `.github/` and `.claude/` are
`export-ignore`, so the deploy's `git archive` leaves them out of the site (nothing it serves loads them:
`tests/artifact.test.js`; the sync script reads `tools/sync/Code.gs` from raw.githubusercontent.com). `data/` is **not**
`export-ignore`: the admin fetches its files from the published site (`tools/curplay.py` also reads two of them in the
staged copy). `.gitignore` also
keeps out `node_modules/` (a Playwright install by hand), `.DS_Store`, `r2-upload/`, `tools/.cache/` and
`curation-play.json`.

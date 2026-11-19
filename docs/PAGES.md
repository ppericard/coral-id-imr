# GitHub Pages deployment and recovery

## Incident diagnosis (2026-11-01)

The repository was using GitHub's generated **pages build and deployment**
workflow (`dynamic/pages/pages-build-deployment`), not a deploy workflow in git.
`docs/HANDOVER.md` recorded the source as **Deploy from a branch: main / (root)**.
The settings API was unavailable through the investigation's GitHub connector,
and the browser was signed out: the live source and environment protection rules
could not be independently read or changed. The move to a deploy workflow in git
(`pages.yml`, with Settings > Pages > Source **GitHub Actions**) was done and verified
the same day (below; docs/ROADMAP.md "Pages deployment migration").

Evidence from the Actions API and deploy job logs:

| Commit / event | Generated Pages run | Result observed |
|---|---|---|
| `86056df` — admin `Photo curation: growth-form tile photos (by ppericard)` | [41287102084](https://github.com/ppericard/coral-id-imr/actions/runs/41287102084) | Build succeeded; deploy refused by the Pages service. Also triggered Candidate photos run 41287102294. |
| `ff8f0b9` — merge #286 | [41287488821](https://github.com/ppericard/coral-id-imr/actions/runs/41287488821) | Failed |
| `92305f6` — merge #287 | [41287761850](https://github.com/ppericard/coral-id-imr/actions/runs/41287761850) | Failed |
| `5c7acb1` — merge #288 | [41287957918](https://github.com/ppericard/coral-id-imr/actions/runs/41287957918) | Failed |
| `4351a21` — merge #289 | [41288865401](https://github.com/ppericard/coral-id-imr/actions/runs/41288865401) | Failed |
| `a74bd57` — merge #290 | [41289234485](https://github.com/ppericard/coral-id-imr/actions/runs/41289234485) | Success, including deploy log `Reported success!` |
| `8ea9167` — merge #291 | [41289446535](https://github.com/ppericard/coral-id-imr/actions/runs/41289446535) | Build succeeded; deploy refused, naming `a74bd57ac68c3b645cd0b309e6321ef587f10d9e` as still in progress. |

The confirmed failure is **a Pages-side deployment lock surviving a successful
Actions run**. The logs for the inspected admin run also name `a74bd57…`; run
creation order is not sufficient to reconstruct retry order. We cannot establish
why GitHub retained the lock, or claim that the admin publish caused it.
There was no evidence of two custom deployers competing: neither checked-in
workflow deployed Pages. `candidate-photos` concurrency controls photo processing,
not Pages. Adding concurrency to that workflow or to Checks cannot clear this lock.

### Temporary success, recurrence and hosting reset (2026-11-01)

After the source switch to **GitHub Actions** (PR #292), deployments still failed
with "Please cancel `a74bd57` first", although the Pages API reported that commit
as `succeed` and refused cancellation because it was finished.
[Run 41291510767](https://github.com/ppericard/coral-id-imr/actions/runs/41291510767)
then published `067b947` successfully and the served files matched that revision.
The cancellation workflow reported "Nothing cancellable"; it did not establish
what released the lock.

**That success was temporary.** The next push, `d46e9b2`,
[failed in run 41291888560](https://github.com/ppericard/coral-id-imr/actions/runs/41291888560)
because Pages now considered `067b947` in progress. Its status was again
`succeed`, and direct cancellation again returned HTTP 400, "it's finished".
No other deployment was running. This recurrence happened with Actions already
selected as the publishing source.

Pierre explicitly authorized a site interruption. After saving the Pages settings
and environment protections, the Pages site configuration was deleted and recreated
with `build_type=workflow`, retaining the same URL, HTTPS enforcement and the
`github-pages` environment's `main` branch restriction. The first publication
after this reset,
[run 41292272145](https://github.com/ppericard/coral-id-imr/actions/runs/41292272145),
successfully published `d46e9b2`.

A single successful publication does not establish a lasting recovery. Validate
the next publication of a **different revision**, then compare the served content
with that revision. Re-running the same commit is insufficient to test the
observed failure, which affects the following commit. The underlying GitHub
backend cause remains unknown.

## Workflow inventory and triggers

Every workflow in `.github/workflows/` (`tests/docs.test.js` checks that this table names each one). Bot commits use
`GITHUB_TOKEN`, so they start no `push` workflow: Deploy Pages picks them up through `workflow_run`.

| Workflow | Trigger / commits | Publishes Pages? |
|---|---|---|
| `checks.yml` — Checks | Pull requests, pushes to a merge train's branch `train/*` (`tools/train.py`, rule W26) and manual dispatch (not pushes to `main`). The fast checks in the job `checks`, the unit tests (`tests/docs.test.js` among them) in two shards, `unit tests (1/2)` and `(2/2)`, on runners of their own, and the sheet's `VERSION` rules (rule D3). Commits nothing. | No |
| `smokes.yml` — Smokes | Pull requests that change more than docs (`paths-ignore`: `docs/**`, `*.md`, the PR template, `LICENSE`; Pierre, 2026-11-08, Q305), every push to `train/*`, and manual dispatch. Its jobs named `smoke (<name>)` run the Playwright smoke tests in parallel, pages in four groups, fish in two, admin whole at 390 px and in three groups at 1280, and `staged`, the copy as the deploy builds it (`tests/smokeparts.test.js` checks every group has a job here). Commits nothing. | No |
| `approved-photos.yml` — Candidate photos | Push to `main` changing `curation.json` (admin Publish or a PR merge touching it), `suggest.json`, `tools/fish_judge.json`, `tools/fish_refs.json`, `tools/fish_game.py` or `fish-photos.json` (a sheet-only fish photo to download); also manual dispatch, and weekly (Wednesday 03:47 Manila) for the licence refresh (`tools/licences.py`, which runs on the schedule and by hand only). Its `photos` job (read-only) makes the commit `Candidate photos: download added ones, refill the lists` (`data.json`, `cand.json`, `excluded.json`, `fish-game.json`, `fish-photos.json`, `fish-cand.json` and `tools/fish_refs.json` (the licence refresh), `img/`) and hands it as a patch to `photos-push`, which checks it touches only those files and pushes it; its `fish` job (read-only) does the same for `Candidate photos: refill the short fish species` (`fish-cand.json`, `tools/fish_refill.json`), pushed by `fish-push`; its `r2` job copies `img/` to R2. Read-only token but for the two push jobs, which run no repository code and hold it in their `Commit` step only; no checkout keeps credentials; Pillow installed by hash (docs/SECURITY.md). | No (its completion starts Deploy Pages) |
| `pages.yml` — Deploy Pages | Every push to `main`, manual dispatch on `main`, and completion of Candidate photos on `main` (any conclusion). No path filter, so curation-only publishes deploy too. Stages the commit (`git archive`), builds the copy (`tools/build_site.py`: the players' curation, the stamps, the scripts minified; "The build at deploy" below), plays it (`tests/staged.smoke.js`), then publishes it. Commits nothing. | **Yes, the only deployer** |
| `photos-r2.yml` — Photos to R2 | Push to `main` changing `img/**`, and manual dispatch. Copies `img/` to the Cloudflare R2 bucket and checks it (`tools/r2_sync.sh`); commits nothing. | No |
| `imr-originals.yml` — IMR lecture originals to R2 | Push to `main` changing `tools/imr_frames.json` or `tools/fetch_imr_originals.py`, and manual dispatch. Downloads the 86 Corals of the World originals of the IMR lecture photos (one request every 2 s, `www.coralsoftheworld.org` only), cuts them as the lecture framed them and uploads their four sizes to R2 (`tools/r2_sync.sh r2-upload`); read only, commits nothing. Same concurrency group as `photos-r2.yml`. | No |
| `analyses.yml` — Analyses report | Hourly schedule and manual dispatch (`force`). Reads the answer log and stores the report in the sync sheet (`tools/analyses.js`); skipped without `ANALYSES_ADMIN_TOKEN`; commits nothing. | No |
| `health.yml` — Health | Hourly schedule (minute 41) and manual dispatch. Checks the live site, the sync script and the infrastructure numbers (`tools/health.py`; "Infrastructure health" below); a failed check fails the job (GitHub e-mails it) and opens one issue labelled `health` unless one is open. The script takes a few seconds (2.4 s by hand, 2026-11-18), a run well under a minute; read-only repository token plus issues, no secret; commits nothing. | No |
| `learncheck.yml` — Learning check (tier 2) | Manual dispatch only: two versions (`before`, `after`), a subject, the app world, the rated world or both, seeds, questions or answers, the primary declared and its world, the looks, more learnsim options. Runs `tools/learnsim.js` on both versions with the same seeds and `tools/learncmp.js` on them; the report goes to the run's summary (rule L11, docs/LEARNING.md "Validating a learning change"). Commits nothing, no artifact. | No |
| `clean.yml` — Clean branches and Actions | Weekly schedule (Sundays 18:37 UTC) and manual dispatch (`dry_run` by default, `also_delete`). Deletes merged branches, merge-train branches older than two days, and the runs of workflows no longer on `main`; keeps open-PR branches and its `KEEP` list (docs/HANDOVER.md "Clean branches and Actions"). Commits nothing. | No |
| `pages-cancel.yml` — Cancel stuck Pages deployment | Manual dispatch only, with the SHA named in the error. Cancels that Pages deployment ("Manual recovery" below). | No |

The GitHub-generated **pages build and deployment** workflow (the old branch source) is retired since the switch to
the Actions source on 2026-11-01; a new run of it would mean the Pages source was changed back.

Admin `save()` in `admin.js` merges and writes `curation.json` through GitHub's
Contents API to `main`, using Pierre's token.
The `workflow_run` trigger covers bot commits without granting the photo workflow
additional permissions or adding another deployment implementation. It also
publishes committed curation if photo processing fails. It checks out current
`main`, never upstream artifacts or a feature branch.

The deploy job uses one fixed concurrency group, `pages`, and
`cancel-in-progress: true`: a newer eligible job replaces the active one and any
pending predecessor. The photo workflow keeps its separate group and
`cancel-in-progress: false` to let photo processing finish. Off-main dispatches
are skipped before entering deployment concurrency. All deployment paths check
out the latest `main` when the job starts, including delayed photo completions
and manual reruns; the actual source SHA is written in the job summary.

The action's 10-minute timeout leaves room inside the 15-minute job timeout for
cleanup. `deploy-pages` also handles cancellation signals. This prevents ordinary
Actions queue blockage; **it cannot guarantee that GitHub's Pages backend will
release an orphan lock**. That is a different state, with its own cancellation API.

## Infrastructure health

Pierre, 2026-11-18 11:21 ("lance 1, 2, 3 et 4"): an hourly check that the platform answers, and the numbers to watch before
it outgrows its free tiers. Code: `.github/workflows/health.yml`, `tools/health.py`, `tools/infra.json`, `tools/brief.py`
`infra_line`, the sheet's `readInfra_` (`Code.gs`, sheet v180) and the admin's card (`admin.js` `infraRows`); tests
`tests/infra.test.js` with `tests/infra.fixtures.py` (every request faked: rule D1), `tests/gates.test.js` (`INFRA_SHEET`).

**The hourly check** (`health.yml`, `tools/health.py`; nothing it prints holds a secret, the log is public):
- the site: `index.html` answers 200 and every `file.js?v=` in it is stamped with 10 hex (an unstamped `?v=N` means the
  deploy's stamping did not run), and the `data.json?v=…` its preload names answers 200 with JSON;
- the sync script answers the app's own public read-only request (`?stats=1&av=health`: an `av` that is no build number, so
  the script writes nothing to Events for it) with `ok` and its `v`; behind `main`'s `VERSION` is a note inside the
  self-update window (an hour after `Code.gs` last changed on `main`) and a failure after it (`autoUpdate` is stuck);
- the weekly pCloud backup: **nothing public says when it ran** (the Deploy log is read only through `readInfra`, which needs
  the admin token), so the check says "not exposed without the admin token" and passes; the admin card shows the backup's age.
  With `INFRA_TOKEN` in its environment the check reads it and fails when the last save is over 8 days old (tested; not wired:
  below);
- each request is tried twice before it fails; a failure fails the job, which GitHub e-mails (to the account that last changed
  the schedule line), and opens one issue labelled `health` unless one is open (close it once fixed: while it is open, nothing
  more is written). A number past a limit is a warning, never a failure.

**The numbers** (warning past 70% of a limit, the same rule in `health.py`, `brief.py` and `admin.js`):

| Number | Limit | Where it is read |
|---|---|---|
| Pages site size | 1 GB published | `health.py` and the admin card: the blobs of `main`'s tree the deploy keeps (`.gitattributes` export-ignore), before minifying, one API call |
| R2 storage | 10 GB free tier | **By hand**: `tools/infra.json` (`bytes`, `at`); said stale after 30 days |
| Sheet cells | 10 million | Admin To do › Alerts, `readInfra_`: every tab's allocated grid (rows × columns) |
| Answers tab | the same 10 million | the same: its rows, columns and grid |
| Sheet response times | 5 s (`Code.gs` `TIM.SLOW`, our own budget, not a quota) | the same: the Timings tab's last 7 days, per operation, weighted p50, p90 and max |

- **R2 is measured by hand**: no read-only token exists in CI (the R2 keys the workflows hold upload photos, and their scope is
  still unchecked: docs/STATUS.md "Pierre's hands"), and a key that can write is not given to an hourly job. To measure: the
  Cloudflare dashboard, R2, the photo bucket, Metrics (storage); then change `tools/infra.json` (`bytes` and `at` together).
  First figure: about 6.3 GB on 2026-11-15 ([AVIF study](reviews/2026-11-15-avif-study.md) §4), already 63%.
- **In `python3 tools/brief.py`** one `Infra:` line, read from the latest Health run's `infra` annotation (three REST calls,
  inside the brief's 5 s); in the short brief only when a number warns or the check failed.
- **In the admin** the card above To do › Alerts' list (`readInfra_`, the `players` right, never public; from sheet v180, rule D4),
  with a "?" paragraph: the five sheet rows live, and the Pages and R2 rows from GitHub with the admin's own token (main's
  tree and `tools/infra.json`), so those two show before the sheet script has the read. It holds what the hourly job does not.
- **Not wired, for Pierre**: giving the hourly job `ANALYSES_ADMIN_TOKEN` as `INFRA_TOKEN` (one line in `health.yml`) would add the
  sheet's cells, its slowest operation and the backup's age to the brief and to the run's public log (counts only, no player).
  It is the token `analyses.yml` already uses every hour, but it is an access decision, so the integrator asks first.

## The build at deploy

Development has no build step: the repository's files are what a local server shows. The deploy builds its staged copy
only, with `tools/build_site.py` (the staged smoke runs the same script, so a PR's CI checks what goes live):

1. `tools/curplay.py`: `curation-play.json`, the players' copy of the curation.
2. `tools/stamp_versions.py`: every `?v=N` becomes a 10-hex content hash (rule W15).
3. `tools/minify.js`: every script at the root and in `proto/` minified by terser (pinned in `tools/minify.js` `TERSER`
   and `tools/stack.json`, installed in a temporary folder), with a source map beside it (`<file>.map`, the original
   inside). Left as they are: `sw.js` and `proto/lab.js` (the version tools read them by shape), the HTML pages (their
   inline scripts are hashed in the CSP), the CSS. A file whose `?v=` references differ after minifying fails the build.
4. `tools/stamp_versions.py` again, on the minified bytes, with the build number: each `?v=` and `sw.js` `V` follow what
   is served, so a new terser reaches the phones' caches; 10 hex replace 10 hex, so the source maps stay exact.
5. `tools/check_versions.py --dir`.

Then `tests/staged.smoke.js` plays the copy (each subject's Home and one question, the Lab, the admin demo, the service
worker's shell), every other host refused, before `upload-pages-artifact`. It adds about a minute to a deploy. Locally:
`npm install --no-save --prefix <folder> terser@<version>`, then
`NODE_PATH=<folder>/node_modules node tests/slot.js -- node tests/staged.smoke.js` (it builds a copy of `HEAD`).

Sizes (2026-11-18, gzip -9): the player's scripts, tiers 1 and 2, 464 KB → 177 KB (tier 1, what Home waits for,
288 → 106 KB; tier 2, the quiz, 176 → 71 KB); every script 1,027 → 501 KB.

**Reading an error report** (`tools/unminify.js`). A report's `src` (`file:line:column` from 1, in the admin's Errors
page and the sheet's Events tab) points into a one-line minified file; its `av` (`appVer`) is the deploy's number, then
app.js's content hash: `982-a0aeab7eb0`. Plan decision (architecture review R4): the maps stay published beside the
scripts (`<file>.map`, the original inside; the repository is public, so they show nothing it does not), and the tool maps
a position back with Node's own source map reader, no dependency:

```sh
node tools/unminify.js --src 'app.js:1:23456' --av 982-a0aeab7eb0                 # the live site's maps (plain GETs)
node tools/unminify.js --commit <sha> --src 'app.js:1:23456' --av 982-a0aeab7eb0  # a deploy no longer live, rebuilt here
node tools/unminify.js --dir <built copy> stack.txt                               # a copy of tools/build_site.py; a pasted stack
```

It prints `reported -> original (name)` and the original line, for bare `file.js:line:col`, V8 `at f (url:l:c)` and
Safari or Firefox `f@url:l:c` frames. A report keeps no folder, so a name is looked up in the root, then in `proto/`;
`sw.js` and `proto/lab.js` are not minified and pass through. **The build is checked by the hash, not by the number**:
every Publish redeploys, so the number moves while the scripts stay the same. `--av`'s hash must be the hash of the
`app.js` the maps belong to, and a frame with its own `?v=` must match its file, or the tool refuses (exit 2; `--force`
maps anyway). That hash is all a report holds of the scripts (`app.js` names no other with `?v=`), so a frame in another
script, bare as the error handler reports it, is mapped and marked `[build not verified]`, unless the maps are the live
site's and its `<meta name="build">` is the report's deploy number (a number given with `--commit` or `--dir` proves
nothing: the caller chose that build). The live maps cover the latest deploy only, and phones keep a cached shell for
days: for an older report, `--commit` rebuilds its commit with this checkout's `git archive` and `tools/build_site.py`
(terser on `NODE_PATH` at the version `tools/minify.js` pins, installed as above). The commit is the "Published source"
line of the summary of the deploy run whose number `av` starts with; `pages.yml` checks out the latest `main` when its
job starts, so that run's `head_sha` can be a newer commit than the one published, and the `app.js` hash says when it is
the wrong one. Each deploy's staged smoke maps a position of every minified script back (`tests/staged.smoke.js`);
`tests/unminify.test.js` holds the tool's logic. A report carries one position (an error event's place, a rejection stack's first frame): the sheet keeps
160 characters of `src` (`Code.gs`) and the Errors page groups by message and `src`, so more frames are a later change
of both.

**Rolling back the minification**: revert the PR that added it (the "Build the site" step back to the stamps alone), or,
at once, change `tools/build_site.py` to skip step 3; the next deploy serves the source files, and since the stamps
hash what is served, every changed `?v=` and `sw.js` `V` move, so the phones fetch the unminified files.

## Manual recovery

First distinguish an active Actions run, an approval wait, and a Pages backend
lock. Use current IDs from the output, not historical IDs copied from this doc.

```sh
REPO=ppericard/coral-id-imr
gh run list --repo "$REPO" --limit 30 \
  --json databaseId,workflowName,headSha,status,conclusion,url
RUN_ID=123456789 # replace with the stuck Actions run's databaseId
gh run view "$RUN_ID" --repo "$REPO"
gh run cancel "$RUN_ID" --repo "$REPO"
```

If normal cancellation does not finish, recheck status and force-cancel that
specific run (not unrelated Checks or Candidate photos):

```sh
gh api --method POST "repos/$REPO/actions/runs/$RUN_ID/force-cancel"
```

**No terminal?** Actions > **Cancel stuck Pages deployment** (`pages-cancel.yml`) > Run workflow, paste the SHA from the error. Inspect its log: a green workflow can mean only that it warned "Nothing cancellable". The numeric records it lists come from the generic environment deployments API; they are not proof of valid Pages deployment IDs. Use the commit SHA with the Pages endpoint below, and only treat an accepted cancellation followed by a successful new deployment as evidence of recovery.

**If the run is already completed, or a new deploy still says “due to in progress
deployment. Please cancel <sha> first”, cancel the Pages deployment itself.**
A completed run cannot be fixed by cancelling the Actions run again. Read the
blocking SHA in the failed deploy log and inspect its Pages state:

```sh
FAILED_RUN_ID=123456790 # replace with the failed deployment run
gh run view "$FAILED_RUN_ID" --repo "$REPO" --log-failed
BLOCKING_SHA=replace_with_the_full_sha_named_in_the_error
gh api "repos/$REPO/pages/deployments/$BLOCKING_SHA"
gh api --method POST "repos/$REPO/pages/deployments/$BLOCKING_SHA/cancel"
gh api "repos/$REPO/pages/deployments/$BLOCKING_SHA"
```

The API accepts the Pages deployment ID **or commit SHA**. These are not the
numeric Actions run ID or the generic environment deployment ID. This cancellation
requires Pages write permission. A `403`/`404` is not proof that a lock was cleared:
check access and the ID. Do not delete generic environment deployment records or
just mark them inactive; that is not Pages cancellation. If the lock persists even
after cancellation, retain the run URL, SHA and request ID for GitHub Support.

After cancellation completes, start a fresh deployment of current `main`:

```sh
gh workflow run pages.yml --repo "$REPO" --ref main
gh run list --repo "$REPO" --workflow pages.yml --limit 5
NEW_RUN_ID=123456791 # choose the new run from the list
gh run watch "$NEW_RUN_ID" --repo "$REPO" --exit-status
```

Alternatively, rerun a completed **Deploy Pages** run:

```sh
gh run rerun "$FAILED_RUN_ID" --repo "$REPO"
```

Prefer fresh dispatch after changing workflow code: reruns use the original
workflow definition. This workflow explicitly checks out `main`; do not assume
that rerunning an arbitrary or legacy workflow deploys current `main`. The old
workaround of repeatedly rerunning the blocking legacy SHA does not clear the
underlying lock and is no longer the recovery procedure.

Finally check the job summary's source SHA and the live `admin.html`'s
`admin.js?v=` against that revision (a service worker may keep an older shell in
an existing tab). For example:

```sh
curl -fsS https://ppericard.github.io/coral-id-imr/admin.html | grep 'admin.js?v='
```

## References

- [GitHub Pages REST API: source settings, deployment status and cancellation](https://docs.github.com/en/rest/pages/pages)
- [Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [Workflow triggers and GITHUB_TOKEN recursion prevention](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [deploy-pages cancellation and timeout handling](https://github.com/actions/deploy-pages)

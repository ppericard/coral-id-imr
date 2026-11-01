# GitHub Pages deployment and recovery

## Incident diagnosis (2026-11-01)

The repository was using GitHub's generated **pages build and deployment**
workflow (`dynamic/pages/pages-build-deployment`), not a deploy workflow in git.
`docs/HANDOVER.md` recorded the source as **Deploy from a branch: main / (root)**.
The settings API was unavailable through the investigation's GitHub connector,
and the browser was signed out: the live source and environment protection rules
could not be independently read or changed. Complete and verify the migration
below; adding a YAML file alone does not change the Pages source.

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

| Workflow | Trigger / commits | Publishes Pages? |
|---|---|---|
| `checks.yml` — Checks | Pull requests and manual dispatch. Its job named `pages` is a Playwright smoke test. | No |
| `approved-photos.yml` — Candidate photos | Push to `main` changing `curation.json`, including admin Publish or a PR merge touching it; also manual dispatch. Commits `Candidate photos: …` changes to `data.json` and `img/` using `GITHUB_TOKEN`. | No |
| GitHub-generated pages build and deployment (old source) | Branch publication after eligible pushes to `main`: PR merges, direct pushes, admin PAT commits `Photo curation: …`. Bot `GITHUB_TOKEN` pushes do not trigger branch Pages builds. | Yes, until source is switched |
| `pages.yml` — Deploy Pages (new source) | Every eligible push to `main`, manual dispatch on `main`, and completion of Candidate photos on `main` (any conclusion). No path filter, so curation-only publishes deploy too. | **The only deployer after migration** |

Admin `save()` in `admin.js` merges and writes `curation.json` through GitHub's
Contents API to `main`, using Pierre's token. No admin code changes are needed.
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

## One-time migration (required to activate this PR)

Use a GitHub account with permission to manage this repository's Pages settings.
Do not unpublish/delete the site or change the custom domain/HTTPS settings.

1. Merge the PR containing `pages.yml` when Checks passes. Its source guard will
   refuse to deploy while branch publishing is still selected.
2. In **Settings > Pages > Build and deployment > Source**, select **GitHub Actions**.
   Equivalent CLI (authenticated `gh`; Pages write permission required):

   ```sh
   REPO=ppericard/coral-id-imr
   gh api --method PUT "repos/$REPO/pages" -f build_type=workflow
   gh api "repos/$REPO/pages" --jq '{build_type, source, html_url}'
   ```

   Verify `build_type` is `workflow`. A retained `source.branch` field alone does
   not mean branch publishing is still active.
3. Cancel any remaining legacy Actions run and the stale Pages deployment using
   the recovery steps below. The new `pages` group does not own old dynamic runs.
4. Check **Settings > Environments > github-pages** permits `main`. If it requires
   approval, approve the pending deployment; concurrency cannot bypass protection
   rules. Do not remove protections as a troubleshooting shortcut.
5. Start `gh workflow run pages.yml --repo "$REPO" --ref main`, watch it succeed,
   and verify the site. A later admin Publish and PR merge should each produce
   Deploy Pages runs, with a second deployment after Candidate photos completes.
   No new dynamic/legacy Pages run should appear.

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

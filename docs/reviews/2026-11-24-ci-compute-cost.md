# CI compute cost: where the Actions minutes go, what is paid twice, and what a private repository would pay (2026-11-24)

**Status: read-only study, docs only (REE-121).** No workflow, tool or setting was changed. Pierre's billing screen
(2026-11-24, 17:56 Manila) showed **$1,012.20** of Actions compute this month on this repository, all covered by the
public-repository discount. His words: «ça me fait peur pour le jour où je dev sur un dépot fermé.....». This study
measures where that compute goes, what is run twice, and what could be cut without losing a check the rules require.
Every option that changes a rule is a question for Pierre (section 7). None was asked: it was after 17:30 Manila (Rule 0).

Read on `origin/main` at `9045624a`. The scripts and the way to re-run them are in
[2026-11-24-ci-compute-cost/](2026-11-24-ci-compute-cost/) (section 9).

## 1. Summary

- **The $1,012 is accounted for.** The Actions API lists 14,014 runs and 74,182 jobs created from 2026-11-01 00:00 UTC
  to 09:56 UTC today. Each job rounded up to a whole minute, as GitHub bills, gives **167,504 runner minutes**. At the Linux
  2-core rate of $0.006 a minute that is **$1,005.02**, 99.3% of the screen. The other $7.18 (about 1,200 runner minutes) is
  not explained (section 2).
- **Smokes are 58% of the month and the PR pushes are 72%.** Smokes cost 97,000 runner-min, Checks 44,390, and CodeQL (GitHub's
  default setup) 17,782. Everything else is 5%: learning checks, photos, Deploy Pages, Analyses and Health together.
  By trigger: PR pushes 120,802 runner-min, train pushes 31,657, `main` pushes 10,581, schedules 1,133.
- **Today's rate is far above the month's average.** The last 7 full days (17 to 23 November) used 99,676 runner-min, which is
  **427,000 runner-min, or $2,563, per 30-day month** at the same price.
  - The window is almost all before #1470 (merged on 23 November at 08:12 UTC), which stopped the queue's catch-up
    merges. Up to $566 of that figure may already be gone (section 4).
  - One code PR push now costs about 64 runner-min: Smokes 49 and Checks 11 on today's layout (30 recent runs), plus
    CodeQL 4. A train costs about 60.
- **What is paid twice** (the 7-day window, scaled to a 30-day month):
  - New heads on PRs, $1,184. Catch-up merges of `main` cost $566, and fixes or other pushes cost $618.
  - Of the fix heads, 29% came right after a Codex inline finding ($175) and 14% after red CI only ($94). The other
    57% followed neither ($349).
  - Catch-up merges were 57% of later heads on 20 to 22 November and 30% on 24 November, once #1470 kept the reviewed
    head. That is one partial day.
  - 266 single-PR trains tested a tree that the PR's own last CI had already tested. Their repeat is $252, after
    leaving out the smokes of docs-only PRs, which only the train runs.
  - Smokes on docs-only trains, $117. The PR side already skips them, and 0 smoke minutes were measured there.
  - CodeQL on docs-only or data-only commits, $82.
  - Runs cancelled on superseded heads, $123 for the minutes used before the cancel. Checks and Smokes already cancel
    superseded runs.
  - The hourly Health job is $3.50, and the learning checks are $37.
- **Per-job rounding is 20% of the bill** (33,289 of 167,504 runner-min). It is a cost of the 17-job smoke matrix and the 3-job
  CodeQL runs. Packing the four short smokes into one runner saves 3.7% of Smokes with no change in train time.
  A 10-runner packing saves 12.1% and lengthens the critical job by about 50 s.
- **If the repository were private:**
  - At today's rate: **about $2,560 a month**. This keeps today's minutes on the 2-core runners private repositories
    get. Public jobs run on 4 cores, so the real figure is likely higher. The guess, unmeasured, is $3,100 to $4,100.
    4-core larger runners would cost $5,130.
  - CodeQL would also need a GitHub Team plan and GitHub Code Security, at $30 per active committer a month.
  - With what today's rules allow (section 5: G1, E and H, the integrator's calls): **about $2,475** at 2-core prices.
  - With package R, which adds A, D and F (no test dropped, but each changes a rule's wording and needs Pierre's yes):
    **about $2,035**.
  - With smokes run once per train instead of on every PR push: **about $1,095**. That one changes what an agent learns
    before the train, and it is question (d).

## 2. Method and reconciliation

- **Data.** Every run listed by `GET repos/ppericard/coral-id-imr/actions/runs?created=…`, per UTC day, split in halves
  while a window held 1,000 runs or more: the listing caps at 1,000. The jobs of each run came from
  `GET …/actions/runs/{id}/jobs?filter=all`, every attempt included. Retries were 0.1% of the minutes: 15 runs had a
  second or later attempt. Read-only GET requests through `gh api`. The billing API is outside this session's reach, so
  the per-SKU split on Pierre's screen is not read here.
- **Billed minutes** follow GitHub's rule: "GitHub rounds the minutes and partial minutes each job uses up to the
  nearest whole minute" ([Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing)).
  A job skipped by its `if`, with no runner, is counted as 0. In this study "runner-min" means these billed minutes
  of compute; times written as m:ss are elapsed (wall-clock) times.
- **Price.** Linux 2-core x64 is $0.006 a minute (`actions_linux`), from the same page. Every job here ran on
  `ubuntu-26.04` or `ubuntu-latest` in the "GitHub Actions" runner group: no larger or self-hosted runner. Applying
  that one rate reproduces the screen to 0.7%. So GitHub priced the public repository's minutes at the standard
  rate, although its public runners have 4 CPUs (next point).
- **Runner size.** Standard Linux runners have "4" CPUs and 16 GB for public repositories, and "2" CPUs and 8 GB for
  private ones ([GitHub-hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)).
- **The unexplained $7.18** is about 1,200 runner minutes. Possible causes, none checked: runs created before 09:56 UTC whose
  later jobs were billed by the time of the screen, the billing day boundary, or a usage line not listed by the runs
  API.
- **Runs deleted from the API** are missing from the data. `clean.yml` deletes only the runs of workflows no longer on
  `main`. The match above leaves little room for them.
- **The 30-day figures** scale the 7 full UTC days from 17 to 23 November by 30/7. That week includes the busy days of
  18 to 21 November (16,600 to 23,900 runner-min a day) and runs with the smoke layout of that time. The current layout costs
  more per run: 48.8 billed minutes per successful Smokes run on 441 runs with today's 17 jobs, against a 7-day median
  of 38. So the projection is not a ceiling.

## 3. Where the minutes go (month to date, 1 to 24 November)

### By workflow

| Workflow | Runs | Jobs | Billed min | Share | $ at $0.006 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Smokes | 2,797 | 42,100 | 97,000 | 57.9% | 582.00 |
| Checks | 4,791 | 17,472 | 44,390 | 26.5% | 266.34 |
| CodeQL (default setup, dynamic) | 3,710 | 11,131 | 17,782 | 10.6% | 106.69 |
| Learning check (tier 2) | 81 | 81 | 2,355 | 1.4% | 14.13 |
| Candidate photos | 195 | 746 | 2,323 | 1.4% | 13.94 |
| Deploy Pages | 1,502 | 1,502 | 1,947 | 1.2% | 11.68 |
| Analyses report | 495 | 495 | 972 | 0.6% | 5.83 |
| GitHub's own (Pages build, AI findings, Dependabot, Copilot) | 261 | 487 | 521 | 0.3% | 3.13 |
| Health | 146 | 146 | 146 | 0.1% | 0.88 |
| Others (R2 jobs, Clean, photo re-check, Pages cancel) | 22 | 22 | 68 | 0.0% | 0.41 |
| **Total** | **14,014** | **74,182** | **167,504** | | **1,005.02** |

Before #757 and the smoke split of 8 November, the smokes ran inside Checks, so Checks' early-month minutes hold smokes.

### By trigger

| Trigger | Runs | Billed min | Share | $ |
| --- | ---: | ---: | ---: | ---: |
| PR pushes (Checks, Smokes and CodeQL on `pull_request`) | 8,797 | 120,802 | 72.1% | 724.81 |
| Merge-train pushes (`train/*`: Checks and Smokes) | 1,486 | 31,657 | 18.9% | 189.94 |
| `main` pushes (CodeQL 6,629; Candidate photos 2,201; Deploy Pages 1,725) | 2,511 | 10,581 | 6.3% | 63.49 |
| Manual dispatches (learning checks 2,355) | 113 | 2,573 | 1.5% | 15.44 |
| Schedules (Analyses 959, Health 146, Candidate photos, Clean, CodeQL weekly) | 641 | 1,133 | 0.7% | 6.80 |
| Bots and GitHub's own (Pages build, AI findings, Dependabot, Copilot), `workflow_run` | 336 | 758 | 0.5% | 4.53 |

No run came from a bot account except GitHub's own: 159 CodeQL runs on `main` pushes made by the Candidate photos
Action's commits, and 141 "Code scanning AI findings" runs from `github-advanced-security[bot]`. Every other run is
under Pierre's account: the agents push with his credentials.

### The heaviest jobs

| Job | Billed min | $ |
| --- | ---: | ---: |
| Checks: `checks` | 9,549 | 57.29 |
| CodeQL: Analyze (javascript-typescript) | 9,214 | 55.28 |
| smoke (admin 1280 main) | 8,697 | 52.18 |
| smoke (fish main) | 8,481 | 50.89 |
| smoke (fish fresh) | 8,048 | 48.29 |
| smoke (pages rest) | 7,917 | 47.50 |
| smoke (pages overlays) | 7,086 | 42.52 |
| smoke (pages more) | 6,495 | 38.97 |
| smoke (net) | 6,420 | 38.52 |
| unit tests (1/2) and (2/2) | 10,237 | 61.42 |
| CodeQL: Analyze (python), Analyze (actions) | 8,568 | 51.41 |

### Runner OS and size

All 74,182 jobs ran on GitHub-hosted Linux x64: `ubuntu-26.04` for the repository's workflows (137,394 runner-min) and
`ubuntu-latest` for GitHub's dynamic ones, CodeQL first (30,108 runner-min). There is no Windows, macOS, arm64, larger or
self-hosted runner. 731 jobs never got a runner and cost nothing: 721 were cancelled while they waited for one (Smokes 535, Checks 149,
Deploy Pages 35, Pages build 2), and 10 were skipped or cancelled GitHub jobs. Their 4:00:00 of time between them is
queue wait. GitHub bills a job by its runner, so they are probably not the unexplained $7.18.

### What one cycle costs now

Medians of successful runs on 17 to 23 November, billed minutes:

| Run | Median | p10 to p90 |
| --- | ---: | ---: |
| Smokes on a PR push | 38 (48.8 on today's 17 jobs, 441 runs) | 34 to 49 |
| Smokes on a train | 39 | 34 to 50 |
| Checks on a PR push or a train | 7 | 4 to 9 |
| CodeQL on a PR push | 4 | 4 to 5 |
| CodeQL on a `main` push | 7 | 6 to 8 |
| Learning check | 12 | 5 to 49 |

From 30 recent successful runs of each workflow:
- **Smoke jobs.** A smoke job spends about 15 s on setup: checkout 3 to 4 s, setup-node 4 s, the Chromium cache 3 to
  4 s, the npm install about 2 s. The rest is the test.
- **Checks.** The unit shards take 11 s to install the Python packages. Their medians are 344 s and 202 s: the two
  shards are uneven.
- **Rounding.** It costs 5 to 52 s per job, median 44 s for a smoke job.

Over the 7-day window, rounding is 20% of Smokes (13,973 of 71,241 runner-min), 18% of Checks, 23% of CodeQL and 81% of Health.

## 4. What is paid twice or more

The 7-day figures (17 to 23 November) scaled to a 30-day month are the basis for the options. The month's figures are given
where they say something else.

| What | Month to date | 7-day window | Per 30-day month | $ per 30-day |
| --- | ---: | ---: | ---: | ---: |
| PR CI on catch-up heads (a merge of `main` into the PR) | 26,073 (685 heads) | 22,018 (549 heads) | 94,363 | 566 |
| PR CI on the other later heads (fixes and other pushes) | 52,807 (2,054 heads) | 24,041 (650 heads) | 103,033 | 618 |
| Trains whose tree the PR's last CI had tested (repeat, not counting docs-only Smokes) | 15,945 (374 trains; docs-only Smokes not taken out) | 9,813 | 42,056 | 252 |
| Smokes on docs-only trains | 5,539 (143 trains) | 4,566 (113 trains) | 19,569 | 117 |
| Smokes on docs-only PR heads | 0 | 0 | 0 | 0 |
| CodeQL on docs-only or data-only commits (PR and `main`) | not split | 3,182 | 13,637 | 82 |
| Minutes of runs cancelled on superseded heads (Checks, Smokes) | 8,852 | 4,785 | 20,507 | 123 |
| Learning checks (tier 2) on runners | 2,355 (81 runs) | 1,454 (58) | 6,231 | 37 |
| Analyses report, hourly | 972 (495 runs) | 573 | 2,456 | 15 |
| Health, hourly | 146 (146 runs since 18 Nov) | 136 | 583 (720 at 24 a day) | 3.50 |

**The same tree on the PR head and again on the train.**
- **Repeat or not.** A PR's CI tests GitHub's merge of its head into `main` as `main` was then. A single-PR train tests
  the same head merged into `main` as it is at the train. When `main` has not moved in between, the two trees are the
  same, and the train repeats the PR's CI. The test compares `main`'s tip at the PR's last Checks run with the train's
  base, on the first-parent history of `main`.
- **Counts.**
  - This month: 743 train commits and 678 single-PR trains. 374 of them had an unmoved `main`, for 15,945 train
    minutes.
  - Last 7-day window: 499 trains and 459 single-PR trains. 266 had an unmoved `main`, for 12,354 runner minutes. 2,541 of those
    minutes were the Smokes of docs-only PRs, which the PR had skipped, so that run was not a repeat.
  - Red trains this month: 32, with 1,338 runner minutes.
- **Multi-PR trains.** 65 of 743 trains held more than one PR, so W26's grouping is rare. A train always holds a tree
  the PRs' own CI never tested together. That part is not a repeat.

**Re-pushes for Codex findings or main merges.**
- **Heads per PR.** 1,295 PRs had CI this month, across 4,034 heads with CI. 392 PRs had one head. One PR had 24.
- **What each later head was.** A later head counts as a catch-up merge when it is a merge commit whose other parent is
  on `main`. Otherwise it counts as a fix or other push.
- **Codex findings** (`codexfix.py`, the 7-day window, 650 fix heads). A fix head counts as "after a Codex finding"
  when the head before it carries an inline comment from `chatgpt-codex-connector[bot]`, and "after red CI" when the
  head before it had a failed Checks or Smokes run.
  - After a Codex finding: 158 heads, 5,430 runner-min.
  - After both a Codex finding and red CI: 33 heads, 1,375.
  - After red CI only: 89 heads, 3,659.
  - After neither: 370 heads, 13,577. These are the author's follow-ups: answers to findings, handoff notes,
    findings of the security review, which has no inline comment, and further work.
  - Per 30-day month, the heads after a Codex finding cost about 29,200 runner-min ($175). A finding counted here
    can be a false alarm answered by a later push: the inline comment alone does not say.
- **Catch-up merges after #1470.** #1470 (merged 2026-11-23 16:12 Manila) stopped `nightq.sh` from merging `main` into
  ready PRs.
  - 20 to 22 November: 253 of the 445 later heads were catch-up merges (57%). Their CI cost 11,005 runner-min, more
    than the 6,430 of the first heads.
  - 24 November up to 09:56 UTC: 9 of the 30 later heads (30%).
  - That is one partial day, and agents still merge `main` by hand for real conflicts (W18). REE-121's integrator
    comment of 23 November already plans to measure it on the next PRs.
  - If catch-up heads fell to that share, about half of the $566 would go.
- **Completed runs on superseded heads.** Runs that completed on heads later replaced, 32,951 runner-min in the 7-day window, are not
  waste. They gave the agent its result before the next push.

**Smokes run for docs-only changes.**
- **On PR pushes, none.** `smokes.yml`'s `paths-ignore` worked: 0 Smokes runs on a PR head whose diff from its merge
  base touches only `docs/`, a root `*.md`, the PR template or `LICENSE`.
- **On trains, every docs-only train runs Smokes.** 143 docs-only trains this month, 113 of them in the
  7-day window (108 green). W12 says "A merge train's push runs both workflows in full" (its wording approved with Q305, Pierre,
  2026-11-08).
- **Checks on docs-only PRs.** 311 of the 1,695 PR Checks runs of the week were on docs-only PRs, 1,916 runner-min. W12 keeps
  Checks on them, `tests/docs.test.js` included.

**Superseded runs not cancelled.**
- **Checks and Smokes.** Both cancel a superseded PR run (`concurrency` per PR number, `cancel-in-progress: true`). A
  train branch is a new ref each time, so no train is ever cancelled. A cancelled run still bills its started jobs:
  8,852 runner-min this month.
- **CodeQL.** It runs as GitHub's default setup, which has no `concurrency` setting. Its superseded PR runs are not
  cancelled. Their share is not measured.
- **Deploy Pages.** It cancels a superseded deploy (155 runs, 242 runner-min).

**Simulations (learning checks) on runners.** 81 dispatches, 2,355 runner-min, 1.4% of the month. 6 cancelled runs used 420.
The 40-minute cap per check (rule L11, W27) holds. The p90 run is 49 billed minutes: one job, setup included.

**The hourly Health job.**
- **Health.** Each run takes 5 to 10 s and bills one minute: 146 runs, 146 runner-min since it began on 18 November. At 24 runs
  a day that is 720 runner-min a month, $4.32. The schedule was the integrator's call
  ([2026-11-18-infrastructure-health.md](../decisions/2026-11-18-infrastructure-health.md)). Its value, an alert
  before players find an outage, is worth the cost.
- **Analyses report.** It also runs hourly: 495 runs, 972 runner-min. 62 runs failed, for 474 runner-min.

**CodeQL on every push.**
- **The setup.** `GET code-scanning/default-setup` reads `state: configured`, languages `actions`,
  `javascript-typescript` and `python`, query suite `default`, schedule `weekly`.
- **The runs.** Despite the weekly schedule, the default setup also runs on every PR push and every push to `main`.
  That was 2,702 PR runs and 1,005 `main` runs this month, 17,782 runner-min. One run is three jobs: about 4 billed min on a
  PR and 7 on `main`.
- **Commits with no code.** In the 7-day window, 316 PR runs and 114 `main` runs were on docs-only commits. 101 and 95
  more were on commits with no `.js`, `.py`, workflow, HTML or `.gs` file. Those `main` runs are mostly Publish and
  Candidate photos commits.
- **Cost of those commits.** CodeQL on them cost 3,182 runner-min in the 7-day window, 13,637 per 30-day month.

## 5. Options to cut, without losing a check the rules require

Minutes and dollars are per 30-day month at $0.006, on the 7-day basis. A saving at 2-core prices grows with any
slowdown of the private runners.

| # | Option | Saves (min) | Saves ($) | Train or PR time | Risk, and what it needs |
| --- | --- | ---: | ---: | --- | --- |
| A | **Path filters: docs-only trains skip Smokes**; Checks still runs (`tests/docs.test.js`) | 19,569 | 117 | A docs-only train finishes with Checks (about 4:00), not with Smokes (5:00 to 6:00) | Changes W12 and W26 (their Q305 wording: "runs both workflows in full"). The tree that goes live is `main` plus docs. `main` itself was last smoked at the previous code train, so a Publish or Candidate photos commit since then goes unsmoked until the next code train. Pierre: question (b) |
| A2 | Docs-only PRs run only `checks` and `tests/docs.test.js`, not every unit test | about 7,400 | about 45 | Docs PR CI about 1:00 instead of 4:00 to 6:00 | W12 says "`checks` still runs on it, `tests/docs.test.js` included". It does not say every unit test. Reading the rule that narrowly would need Pierre's yes: question (b) |
| B | **`concurrency` with cancel-in-progress on PR branches, not on `main` or trains** | 0 for Checks and Smokes | 0 | none | Already in place: grouped by PR number, so a train ref is never cancelled. The 20,507 runner-min of cancelled runs are minutes used before the cancel, which no setting recovers. The default CodeQL setup has no such setting, so option F covers it |
| C | **Smokes once per train instead of on every PR push**, on demand on a PR (a label or a dispatch) | 218,721 gross; about 197,800 net of extra red trains | 1,312 gross; about 1,187 net | A PR's CI drops to Checks (4:00 to 6:00). Failures move to the train: up to 106 a week, against 10 red trains now. Each red train stops the queue (one train at a time, W27) for a rebuild | Changes W12, W14 and W26. Agents still run their smoke part locally before each push (W14). Smoke regressions would reach the train after a Codex review, then need a new head, a new review and a new train. Estimate: 106 PR Smokes failures in 7-day window, each a red train of about 46 runner-min. Pierre: question (d) |
| D | **A single-PR train whose tree the PR's CI already tested reuses that result** | 42,056 | 252 | A same-tree train merges at once (5:00 to 6:00 sooner) | No test lost: the same tree passed the same workflows on the PR's merge ref. One step differs: Checks runs `check_versions.py --sheet-base HEAD^1` on a PR and `--main` on a train. `tools/train.py` already runs main's `sheet_version.py --check --main` on the composed tree whenever it builds a train, dry run included, so the sheet rule stays checked. Needs `tools/train.py` to compare the trees and read the checks of that exact merge commit. Changes W26's "Checks and Smokes run once on it". Pierre: question (a). The queue work (REE-220, Codex) is in `tools/queue/`; this is in `tools/train.py`, so coordinate |
| E | **Caches** | about 1,900 (pip cache in the two unit shards) | about 11 | about 8 s per shard | Chromium is already cached in Smokes. The rest of a smoke job's setup is about 15 s, mostly not cacheable. Integrator's call. Small |
| F | **CodeQL: an advanced setup with `paths-ignore` for docs and data, and cancel-in-progress on PRs** | 13,637 for path filters, plus an unmeasured part for cancels | 82 or more | none | Same queries and languages. A commit that changes only JSON, images or docs is not scanned, but CodeQL scans none of them. It is Pierre's security setting: he turned CodeQL on (ANSWERS.md, 2026-11-08, a paraphrase), so question (c). The workflow file becomes one more to maintain |
| G1 | **A smaller matrix: the four short smokes on one runner** (draw, profiles, live, staged) | 11,300 | 68 | 0 s on the critical job (median 294 s both ways, 441 runs replayed) | Each smoke still reports: the job must run all four and fail if one fails. `tests/smokeparts.test.js` would read the new layout. Integrator's call |
| G2 | A smaller matrix: 17 jobs on 10 runners (pairs and triples, no runner above about 4:30 of test) | 36,900 | 222 | +52 s on the median critical job, +51 s at p90 | Latency is REE-121's first axis, so G1 first |
| H | **The scheduled jobs' frequency**: Analyses every three hours | 1,637 | 10 | none | The report waits up to three hours after a round thousand. Integrator's call, easy to correct. Keep Health hourly: $3.50 for an outage alert within the hour |
| I | Learning checks: no change | 0 | 0 | none | 1.4% of the month, already capped by L11 |

**Not counted as savings.**
- **Checks and Smokes.** Their PR cancel and the docs-only PR skip already exist. Their residual cost is in section 4.
- **PR #1540**, open, adds an `answer cost` job to Smokes: about 3:04 (median of 2 runs), billed 4 runner-min, on every Smokes run. That is about
  30,000 runner-min, $180, per 30-day month, on top of the figures here.
- **PR #1547**, open, adds one more API call to Health. Its cost is unchanged.

**What today's rules allow** (G1, E and H, the integrator's calls) saves about 14,800 runner-min (3.5%): 412,300
runner-min, **$2,474**.

**Package R** combines A, D, F, G1, E and H. No test is dropped, but A, D and F change rules (W12, W26) or Pierre's
CodeQL setting, so each needs his yes.
- It saves about **88,100 runner-min a month (21%)**: 339,100 runner-min, **$2,035**.
- The savings are combined, not added. A and D are disjoint: same-tree docs-only trains count in A. G1 applies to the
  smokes left after A and D.

**Package R plus C** saves about **244,600 runner-min (57%)**: 182,600 runner-min, **$1,095**.
- With C, the train becomes the only smoke run, so D keeps only its Checks part: 7,560 runner-min.
- It counts the extra red trains (+20,900) and G1 on the train smokes only.

## 6. If this repository were private

| | Runner-min (per 30-day month, except the first row) | 2-core, $0.006, same minutes | 2-core with a slowdown of 1.2 to 1.6 (guess, unmeasured) | 4-core larger runner, $0.012 |
| --- | ---: | ---: | ---: | ---: |
| Month to date (1 to 24 November), as run | 167,504 | $1,005 | $1,206 to $1,608 | $2,010 |
| Today's rate | 427,183 | $2,563 | $3,076 to $4,101 | $5,126 |
| With today's rules (G1, E, H) | 412,300 | $2,474 | $2,969 to $3,958 | $4,948 |
| With package R | 339,100 | $2,035 | $2,442 to $3,255 | $4,069 |
| With package R plus C | 182,600 | $1,095 | $1,315 to $1,753 | $2,191 |

- **The 30-day rows predate #1470.** The week they scale had the queue's catch-up merges, $566 a month of PR CI.
  If #1470 holds them at the share of 24 November, about half of that goes from every row.
- **Included usage.** Private repositories get $12 of included usage on GitHub Free and $18 on Pro and Team
  ([Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). At these volumes that
  is negligible: about 2,000 and 3,000 runner minutes. The same page says standard runners stay free for public repositories.
- **The slowdown is a guess.**
  - The private runner has 2 CPUs and 8 GB instead of 4 and 16. The unit tests run several files at once
    (`node --test`), and `smoke (fish fresh)` plays five players side by side on CI (#1177).
  - Both would slow down, and the long jobs would also cross more minute boundaries.
  - One measured run on a 2-core runner would replace the guess. A private fork or a `runs-on` change is Pierre's call
    and outside a read-only study.
- **CodeQL.**
  - On a private repository, code scanning needs GitHub Code Security and secret scanning needs GitHub Secret
    Protection. Both require a Team or Enterprise plan
    ([GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)).
  - They cost "$30" and "$19" per active committer a month ([GitHub security plans](https://github.com/security/plans)).
  - Without them, CodeQL's 48,600 runner-min ($292) go away and so do its alerts, which count like Codex findings
    (ANSWERS.md, 2026-11-08).
- **Self-hosted runners** are not charged per minute in GitHub's billing, according to the same page. Their cost would be the machine's.
  - The agents' shared 4-core machine is already at its load budget (W24), so it would have to be another one.
  - That is a matter of money and access: Pierre decides.

## 7. Questions for Pierre (not asked: after 17:30 Manila, Rule 0)

Each answer is recorded in [ANSWERS.md](../ANSWERS.md) and the rule it changes. The figures are per 30-day month at private
2-core prices.

**(a) Same-tree trains: reuse the PR's CI?** About $252.
- **The case.** When a train holds one PR and `main` has not moved since that PR's last CI, the train tests the same
  tree again.
- **Options.**
  1. Keep W26 as it is.
  2. `tools/train.py` merges without a new CI run when the train's tree equals the tree of the PR's green merge-ref run.
     It runs the train in full otherwise.
  3. As 2, but only for docs-only PRs.
- **Recommendation: 2.** No test is lost, because the identical tree passed the same workflows. The train's sheet
  check (`--main`) stays in `tools/train.py`'s own build of the train. It also cuts
  about 5:00 from those merges.

**(b) Docs-only changes: lighter checks?** About $117 for trains, $45 for PRs.
- **Options.**
  1. Keep: Checks in full on the PR, Checks and Smokes on the train.
  2. Docs-only trains skip Smokes; Checks stays.
  3. As 2, and docs-only PRs run only the `checks` job and `tests/docs.test.js`.
- **Recommendation: 2.** The smokes read no file under `docs/` (comments only), the same reasoning Q305 (d) accepted
  for PRs. The cost: a Publish or Candidate photos commit on `main` waits for the next code train for its smoke check,
  as it does now between trains.

**(c) CodeQL's scope?** About $82, more with cancels.
- **Options.**
  1. Keep GitHub's default setup: every PR push, every `main` push, weekly.
  2. An advanced setup with the same languages and queries, skipping docs-only and data-only commits and cancelling
     superseded PR runs.
  3. Weekly and on trains only.
- **Recommendation: 2** while the repository is public. Option 3 is the one to reconsider if it becomes private and the
  Code Security licence is not taken.

**(d) Smokes once per train instead of on every PR push?** About $1,190 net.
- **Options.**
  1. Keep smokes on every PR push.
  2. Smokes on the train only, and on a PR on demand (a label or a dispatch, for a UI change).
  3. Decide when the repository goes private.
- **Recommendation: 3, with 1 until then.** It is the largest lever: half of today's compute.
- **What it would cost.** It moves smoke failures to the train, after Codex's review: a new head, a new review and a
  new train each time. Up to 106 failures a week would stop a one-at-a-time queue. That works against REE-121's first
  axis, latency, while the repository is free.

**(e) Before going private: a budget and a runner choice.**
- **Options.**
  1. A GitHub spending limit or budget alert on Actions first, then a one-week measured run on 2-core runners.
  2. 4-core larger runners, with today's speed at twice the price.
  3. A self-hosted runner on a separate machine.
- **Recommendation: 1.** The 2-core slowdown is the largest unknown in section 6.

**Integrator's calls, no question needed** (easy to correct; recorded in Decisions when built): G1, the four short
smokes on one runner; E, the pip cache; H, Analyses every three hours.

## 8. Coordination

- **REE-220 and `codex/ree121-pinned-queue`.** The branch's only commit, `9cf7bb51`, is #1470, already merged as
  `07f46d2`. REE-220 is about moving the grouped FIFO script into `tools/queue/`. This study changes no file there.
- **Overlaps with that work.**
  - Option D would live in `tools/train.py`.
  - Grouping ready PRs into one train (W26, REE-220) cuts the train count: 459 of 499 trains in the week held one PR.
  - Any change to either belongs with the Codex session, or after it.
- **Open PRs touching workflows.** #1540 (`smokes.yml`, one more job, section 5), #1545 (`approved-photos.yml`) and #1547
  (`pages.yml`, `health.yml`). This PR touches none of them.

## 9. Reproduce

The scripts in [2026-11-24-ci-compute-cost/](2026-11-24-ci-compute-cost/) send only GET requests through `gh api`, and
git reads on a blobless clone. Run them by name:

- `fetch.py DATADIR FIRST_DAY LAST_DAY`: the runs. `jobs.py DATADIR`: their jobs, resumable, pausing at the API's rate
  limit; about 14,000 requests for the month. `gh api 'repos/ppericard/coral-id-imr/pulls?state=all&per_page=100'
  --paginate` written as `DATADIR/pulls.jsonl`, one `{n, ref, created, closed}` object a line, for `dup.py`.
- `analyze.py DATADIR`: billed and raw minutes by workflow, trigger, job, runner, conclusion, attempt and day.
- `recent.py DATADIR 2026-11-17 2026-11-23`: the 7-day basis, rounding loss, and per-run medians.
- `dup.py DATADIR MIRROR [FIRST LAST]`: heads per PR and what each was, superseded-run minutes, trains (docs-only,
  same tree, red).
  - `MIRROR` is `git clone --bare --filter=blob:none` of the repository, plus `refs/pull/*/head` and the `train/*`
    branches.
  - `DATADIR/pulls.jsonl` maps a run to its PR by branch and open window, because one session branch carried many PRs
    in turn.
- `codeql.py DATADIR MIRROR FIRST LAST`: CodeQL, Checks and Deploy minutes by what the commit changed.
- `codexfix.py DATADIR MIRROR FIRST LAST`: the fix heads after a Codex inline finding, after red CI, or neither. It
  sends one GET request for each PR.
- `pack.py DATADIR FIRST LAST [SETUP_S] [short]`: the matrix packings replayed on real job times.
- `steps.py smokes.yml 30`: setup and test time per job.
- `runsum.py DATADIR`: run counts by workflow, event and actor.

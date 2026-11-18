# Infrastructure health: an hourly check and the numbers to watch before the free tiers run out

Date: 2026-11-18 (Manila). PR: #1101. Docs touched: [PAGES.md](../PAGES.md) "Infrastructure health",
[SECURITY.md](../SECURITY.md), [BACKUP.md](../BACKUP.md), ARCHITECTURE.md (sheet v180).

## Context

The app runs on free tiers (GitHub Pages, a Google Sheet behind an Apps Script web app, Cloudflare R2 for the photos) and
nothing watched them: an outage or a limit getting close would be found by the players first. Pierre asked for
infrastructure changes that are easy, quick and of high impact; the integrator proposed four, among them a health check
and a limits dashboard.

## Decision

Pierre, 2026-11-18: "Sur la partie infrastructure, est-ce qu'il y aurait des évolutions faciles, rapides et avec un gros
impact?", then, on the four proposals, "ok, lance 1, 2, 3 et 4".

Carried out here (the details were the integrator's call, easy to change):

- An hourly GitHub Actions check that the site, its data and the sync script answer; a failure fails the job, which
  GitHub e-mails, and opens one `health` issue. A number past a limit is a warning, never a failure.
- The numbers to watch, each with its limit and the same 70% warning everywhere (`health.py`, `brief.py`, the admin card):
  Pages site size, R2 storage, sheet cells, the Answers tab, sheet response times.
- R2 is measured by hand (`tools/infra.json`): no read-only key exists in CI, and a key that can write is not given to an
  hourly job.
- The backup's age is shown only in the admin (it needs the admin token); the public check says so and passes.
- The admin card needs sheet v180 (`INFRA_SHEET`); before it, the card shows only the repository's numbers, silently
  (rule D4).

## Consequences

- New: `.github/workflows/health.yml`, `tools/health.py`, `tools/infra.json`, `brief.py`'s infrastructure line, the
  sheet's `readInfra_` and the admin's Infrastructure card.
- The sheet cell limit is written as 10 million (this was 20 million in SECURITY.md before), to confirm against Google's
  limits page.
- Rules out: any secret in the check's public log; a write-capable R2 key in an hourly job.
- Where it is specified now: PAGES.md "Infrastructure health".

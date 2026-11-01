# Handover: picking up IMR Coral ID in a new Claude account

Written 2026-11-01 when Pierre moved development to another Claude Code account. Until then the project ran in a Claude "project" with a shared memory, many parallel threads and private claude.ai docs. **None of that is reachable from the new account.** Everything that mattered has been copied into this repository; this file is the map.

## Read in this order (15 minutes)

1. [`AGENTS.md`](../AGENTS.md): who the app is for, Pierre's standing rules (do not break them), how to ship a change.
2. This file: state of play, what Pierre still has to do, how to work with him, where external things live.
3. [`ROADMAP.md`](ROADMAP.md): the prioritised backlog, open questions, declined ideas.
4. [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DESIGN.md`](DESIGN.md) when you touch code or UI.
5. [`reviews/`](reviews/README.md): the last expert reviews (code, admin, first-time RA, design) with what is still open.

## State of play (2026-11-01)

- Live app: <https://ppericard.github.io/coral-id-imr/> (GitHub Pages from `main`). Admin: <https://ppericard.github.io/coral-id-imr/admin.html>.
- About 287 pull requests merged in two days (2026-10-31 and 11-01). Every PR description explains a decision; `git log --oneline` is a good index (squash merges titled `… (#N)`).
- No open pull requests at handover time.
- Tests: `node --test tests/*.test.js`, `node tests/pages.smoke.js` and `node tests/draw.smoke.js` (Playwright). CI: `.github/workflows/checks.yml`.
- Progress sync script `tools/sync/Code.gs`: **v10 is live** (deployed by Pierre and verified 2026-11-01 08:10 UTC).
- Users: Pierre, and soon beta testers: last month's Research Assistants (RAs) and his next 6 RAs. Most use phones.
- A full docs-vs-code pass was done for this handover (previous one at PR #245).

### Last features before the handover

- **Confusion scores** (PR #286, merged 2026-11-01): every quiz answer logs the choices offered (Code.gs v10, deployed and verified 2026-11-01); a confusion score per genus pair corrected for how often the pair was offered (official IMR / Coral Finder look-alikes only seed it; real player answers then decide); quiz traps picked by confusion score; admin "Confusions" view. Confusion data starts filling as soon as signed-in players answer; until there is enough, traps use the declared look-alikes.
- **Personalised path** (approved by Pierre, built 2026-11-01 after the handover): each player's own mix-ups bring those traps and duels back more often; My progress "Often mixed up" ranks them. A suggestion on the Practice page is still open (ROADMAP).

## Pending actions for Pierre (things only he can do)

| What | Where / how |
|---|---|
| **Redeploy the sync script v11** (user management page, admin Users tab). Steps below ("Code.gs and how to redeploy"); no new permission needed. | Admin > Users says "Sheet script v11 not deployed" until then. |
| Review the debatable lecture points and the Stylophora wording (he planned to review the course on Mon 2026-11-02). | ROADMAP "Waiting on Pierre". Any change becomes a discreet note, never a correction. |
| Confirm Merulina's placement (shown with Hydnophora, lecture group 7; alternative group 5). | ROADMAP. |
| Say which Lab tools he marked Keep / Trim (votes live only in his browser). | ROADMAP. |
| Send the app to the beta RAs; renew the admin GitHub token before it expires (fine-grained, 90-day expiry, created around 2026-10-31, so about late January 2027). | Admin lock screen has the token link. |
| Optional: delete the 87 old `claude/*` branches on GitHub. All belong to merged PRs (checked 2026-11-01); nothing unmerged is left on them. | GitHub > Branches, or Settings > "Automatically delete head branches". |

## Questions for an IMR trainer

Kept in ROADMAP "Questions for an IMR trainer". Never settle them in the app; keep the lecture's version.

## Setting up to work, and what lives outside GitHub

Nothing needs rebuilding: the site is served by GitHub Pages from `main` through `pages.yml`, so a merged PR triggers deployment. The Pages source must be GitHub Actions; see [PAGES.md](PAGES.md) for migration and recovery. There is no build step and no package manager. What a new agent needs is a working copy; the only pieces outside GitHub are the Google Sheet + Apps Script (progress sync) and Pierre's admin token, recreated only if they are ever lost.

**Working copy (any machine or cloud container):**
1. Clone `https://github.com/ppericard/coral-id-imr` (public). Python 3, Node 18+ and Chromium/Playwright are all you need.
2. Serve: `python3 -m http.server 8000`, open <http://localhost:8000> (app) and <http://localhost:8000/admin.html?readonly> (admin without a token). Sync and photo Elo talk to the live Apps Script even locally (read-only unless you sign in).
3. Check: `node --test tests/*.test.js`, `node tests/pages.smoke.js`, `node tests/draw.smoke.js` (Playwright; never add a `package.json`), `python3 tools/check_versions.py --base origin/main`.
4. Network: iNaturalist hosts (listed under "External resources") for photo scripts; GitHub for PRs. Python scripts need `pillow` (`pip install pillow`) for photo work.

**Hosting settings (already in place; only if the repo ever moves):**
1. GitHub Pages: Settings > Pages > Source **GitHub Actions**, with `pages.yml` as the single deployer. This replaces the original branch `main` / root source; verify the migration in [PAGES.md](PAGES.md), since the setting is outside git. `.nojekyll` remains committed. If the site stops updating with "Please cancel <sha> first" (a known GitHub Pages glitch, hit several times on 2026-11-01), follow PAGES.md > Manual recovery.
2. Actions: `.github/workflows/pages.yml` (push to `main`, manual dispatch, and Candidate photos completion), `.github/workflows/checks.yml` (PR checks) and `approved-photos.yml` (after each `curation.json` push; needs Settings > Actions > Workflow permissions "Read and write").
3. Admin writes: a fine-grained GitHub token, this repository only, Contents read and write, 90-day expiry; the admin lock screen links to the token page and stores it encrypted with a password of Pierre's choice. Changing the repo name or owner means updating `REPO` in `admin.js` and in `tools/sync/Code.gs` (the admins' token check), then redeploying the script.

**Progress sync (outside GitHub; only if the Sheet or script is ever lost):**
1. New Google Sheet > Extensions > Apps Script > paste [`tools/sync/Code.gs`](../tools/sync/Code.gs) > save.
2. Project Settings > Script Properties: add `ANON_SALT` = any long random string (keeps anonymous player ids unguessable; never commit it).
3. Deploy > New deployment > type **Web app**, Execute as **Me**, Who has access **Anyone** > Deploy, accept the permissions. Run once in the editor a function that calls `UrlFetchApp` (see "Code.gs" below) so the admins' GitHub token check works.
4. Put the `/exec` URL in `SYNC_URL` in `app.js` (and bump versions with `tools/check_versions.py --fix`). The tabs (`RAs`, `Answers`, `Activity`, `By genus`, `Reports`, `Progress data`, `Removed`) are created on first use. Old progress lives in the old Sheet only.

**Content (`data.json`):** the original build scripts read a scratchpad that no longer exists (`tools/archive/`). `data.json` is the source of truth: edit it directly or through a small re-runnable `tools/apply_*.py` script, and write it with `tools/datajson.py` (one genus per line; the PR check fails on any other layout). The lecture text came from the Google Slides copy of Lecture 6 (Slides API, incl. presenter notes); photos from the lecture deck media, Pierre's iNaturalist and other iNaturalist observers (see ARCHITECTURE.md "Photos" and "Tools").

## Working with Pierre

Pierre Pericard (GitHub `ppericard`), Research Fellow at IMR (Institute for Marine Research, Dauin, Philippines) since early October 2026. He builds this to learn the IMR genera himself and to train the RAs.

- **Language**: he writes in French (often dictated, so expect speech-to-text typos). Reply to him in French. Everything you produce (code, UI, docs, commits, PRs) is in English, because IMR is an English-speaking workplace.
- **Autonomy**: work on your own, branch, open PRs and **merge them yourself** once checks pass and you have looked at the result. Ask first only before destructive or irreversible steps (history rewrite, deleting data, bulk changes to his curation, anything sent outside the project).
- **Fix by default**: when a review finds problems, fix everything you can without asking ("fais corriger tout ce que tu peux faire corriger", 2026-11-01). Bring him only real choices, or actions that need his hands (Apps Script redeploy, admin curation, decisions about IMR content).
- **Questions**: ask each one once, short, with your recommendation. He likes one-line questions he can answer quickly. Never re-ask something he already answered: check ROADMAP and PR descriptions first.
- **How he judges UX**: taps or clicks, scrolls, and what is on screen versus what must be fetched elsewhere. He uses the app on his phone a lot. He prefers visuals to text, and judges new things in use ("à voir à l'usage"): ship, then iterate on his feedback.
- **Many prototypes first, trim later**, but Lab tools graduate into the app only with his explicit OK.
- **Docs in every PR** (his rule): AGENTS / ARCHITECTURE / ROADMAP / DESIGN / README / admin help updated in the same PR, or "Docs: none needed" in the description. A full docs pass every ~20 PRs.
- **No hardcoded genus count** in user-facing text ("39"): it changes (bonus genera).
- His Google interface is in **French**: give Apps Script steps with the French menu names (below).

## Code.gs (progress sync) and how to redeploy

- Code: [`tools/sync/Code.gs`](../tools/sync/Code.gs); details and version history in ARCHITECTURE.md "Progress sync". Bump `VERSION` (header comment + constant) on every change; keep changes backward compatible, because the app must keep working with the deployed version until Pierre redeploys.
- Live version check without writing: open `SYNC_URL?name=x&pin=ab` (`SYNC_URL` constant in `app.js`); the JSON reply carries `v`.
- **Agents cannot deploy Apps Script.** Give Pierre this raw link to copy: <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/Code.gs>. His steps (French UI): open the Google Sheet "IMR Coral ID – RA progress" > **Extensions > Apps Script** > select all of `Code.gs` and paste the new code > save (disk icon) > **Déployer > Gérer les déploiements** > pencil icon (**Modifier**) on the existing deployment > **Version : Nouvelle version** > **Déployer**. The URL stays the same. Then check `v` with the link above.
- A redeploy does **not** grant new permissions. If a new version uses a new Google service, Pierre must run, once in the editor, a function that calls it and accept the prompt (this is how `UrlFetchApp` was granted for v8: `function autoriser(){ UrlFetchApp.fetch("https://api.github.com"); }`).
- Never change the column layout of the `RAs` tab (positional); add tabs instead.
- Sheet id `1R-L_JqKz9eFF8jvnmPy2g12Zrpn__uWm1Y32kkMfQUE` (Pierre's Drive). Secret Script Property `ANON_SALT` (never in the repo).

## Admin workflow (what Pierre does, what you must not break)

- Pierre curates photos in `admin.html`; every click is a browser draft; **Publish** merges the draft key by key onto the latest `curation.json` and commits it to `main` (commit "Photo curation: … (by ppericard)"). The GitHub Action `approved-photos.yml` then downloads approved candidates and refills candidate lists (commit "Candidate photos: …"). So `main` moves without PRs: rebase right before merging, never overwrite `curation.json` in a PR.
- His curation is never changed automatically; no bulk reset; Undo only. Everyday per-photo actions (× exclude, Reject) are one click with no confirmation: Undo is his safety net.
- Admin pages carry no explanatory text: help sits behind "?" (tabs "This page" / "Start here").

## External resources

| What | Where |
|---|---|
| IMR reference material (Lecture 6 PPTX, slate photo) | Pierre's Google Drive, IMR folder `1gt0sv2YN4Og7-O_YCb3cVgvW94-CK6oG` (needs his Google sign-in). |
| Lecture 6 as Google Slides (read with the Slides API, incl. presenter notes) | Slides id `13msDDkJzPN6fRam-ezX_vl93osAd0Cw4rJ1aINOzveI`. Full-resolution deck media: Drive folder `1FDXDg3XvjXwML0KGxxtjMjVq2fU3jP8i`. |
| Lecture text in the app | `data.json` `gen[g].imr` (verbatim slide text, review slides, presenter notes), `mn` mnemonics, `sl`/`rsl` slide numbers, `tools/lecture_more.tsv`, `tools/course_views.txt`. |
| MCP decks "Substrate monitoring 2023", "Intro to substrate" | Marine Conservation Philippines, not IMR. Pierre: don't mine them yet. |
| Coral Finder 2022 (R. Kelley, BYOGUIDES; copyrighted) | PDF on Pierre's Google Drive, in the IMR / coral folder (85 scanned pages, no text layer; PDF page = book page + 5). Never commit it or its page images (copyright). Page mapping already in `data.json` (`pages`, `key`, `x`). |
| Pierre's iNaturalist | user `ppericard`, coral taxon 47532; covers 36 of the 39 slate genera (missing Anacropora, Astrea, Duncanopsammia at the time). |
| ReefRecall | Pierre's separate mobile app (`ppericard/reefrecall`). The coral tools stay standalone; the data may be reused there later. |

The cloud environment needs network access to `api.inaturalist.org`, `www.inaturalist.org`, `inaturalist-open-data.s3.amazonaws.com` and `static.inaturalist.org` for photo work; Google Drive downloads need Pierre's sign-in (use a Drive / Slides connector if the new account has one).

## Context worth knowing (history in brief)

- 2026-10-31: first standalone artifacts (Coral Finder key, quiz, mind map, genus doc, now in `reference/`), then one web app on GitHub Pages, the Lab of prototypes, the admin back-office, photo curation rules, the Coral Finder rebuilt as a tolerant clue ranking, responsive system, adaptive difficulty.
- 2026-11-01: expert reviews (code, admin, RA, design) and their fixes, Code.gs v6-v9, players' reports, bonus genera, welcome tour for beta testers, graded answer choices, confusion scores.
- An incident on 2026-11-01 (a stale admin draft published as a whole copy wiped curation) led to the key-by-key Publish merge (PR #240): never go back to whole-copy publishing.
- A git history rewrite to shrink the repo was discussed and declined for now (`.git` ~277 MB on 2026-11-01). Raise it only if size becomes a problem.

## First prompt for the new account

Paste this into the new Claude Code session (repository `ppericard/coral-id-imr` attached):

```
You are taking over development of ppericard/coral-id-imr, a static web app (GitHub Pages)
that teaches the IMR coral genera to Research Assistants at the Institute for Marine Research,
Dauin, Philippines. Previous work happened in another Claude account; you have no access to its
memory or chats. Everything you need is in the repo.

1. Read AGENTS.md, then docs/HANDOVER.md, then docs/ROADMAP.md. Skim docs/ARCHITECTURE.md and
   docs/DESIGN.md. Follow the standing rules in AGENTS.md strictly.
2. Run the tests (node --test tests/*.test.js) and serve the app locally (python3 -m http.server)
   to check that main works.
3. Reply to me in French with: (a) a 5-line summary of where the project stands, (b) what I
   still have to do myself (from HANDOVER "Pending actions"), (c) the top 3 backlog items you
   propose to start with. Do not start coding until I answer.

Working rules: answer me in French, write everything else in English; work autonomously,
open PRs and merge them yourself once checks pass; fix review findings without asking; ask me
only real choices, one short question each, with your recommendation; update the docs in every
PR. Save any new lasting rule I give you in AGENTS.md, not only in your memory.
```

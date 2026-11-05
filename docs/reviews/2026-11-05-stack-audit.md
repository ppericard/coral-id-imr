# IMR Reef ID: technology stack audit (2026-11-05)

Read-only audit of `ppericard/coral-id-imr` at `origin/main` 46a8e7cb (5 Nov 2026, 15:49 Manila). Each "latest" value was looked up today on an official page: a registry, a release index, a changelog or the vendor's docs (links in Sources). Nothing was taken from memory. "Container" means this Claude Code cloud machine; "CI" means GitHub-hosted `ubuntu-latest`.

**Short version.** The JavaScript tooling is current: Node 26 LTS, Prettier 3.9.10 and Playwright 1.64.1 in `checks.yml` are the latest stable releases, so rule 27b holds there. The outdated or drifting parts are in the photo pipeline and in the parts nobody pins:
- **rclone 1.60.1**: Ubuntu's apt package, from Nov 2022, four years behind 1.75.2.
- **Python 3.12** in `approved-photos.yml`. 3.12 gets security fixes only; 3.15 is the latest stable.
- **System Python and the apt rclone change silently**: `ubuntu-latest` is moving to Ubuntu 26.04 between 19 Oct and 19 Nov 2026, which changes the system `python3` used by the Checks job and the apt rclone, with no commit in this repository.
- **Pillow is not pinned**: `pip install pillow` already moved to 13.0.0 on 16 Oct. I checked that 13.0.0 writes byte-identical WebP files.
- **Five workflows still use v4/v5 actions** (another agent is handling these).
- **The photo address is r2.dev**, which Cloudflare rate-limits and documents as "development only".

## 1. Summary table

Gap and risk scale: none / low / medium / high. Recommendations: **now** (next routine PR), **later** (when touched or at a trigger), **keep**.

| # | Item | Pinned / used in repo | Container | Latest stable (date) | Gap | Risk of staying | Effort / breaking | Recommendation |
|---|---|---|---|---|---|---|---|---|
| 1 | Node.js (CI) | `node-version: '26'` (checks.yml, analyses.yml) | 22.23.4 (also 24.22.1 in /opt) | 26.13.0, Active LTS "Lithium" since 2026-10-28 | none in CI; container is 2 majors behind | low (unit tests pass on 22 too) | none | **keep** CI; ask for Node 26 in the cloud environment (Pierre's hands, low priority); fix HANDOVER "Node 18+" **now** |
| 2 | Python (Candidate photos job) | `python-version: '3.12'` (approved-photos.yml) | 3.13.18 | 3.15.2 (2026-10-25); 3.14.10 same day | 3 minors; 3.12 has been security-only since Apr 2025 | low today, grows | trivial: every package has cp315 wheels; tools compile on 3.14 and 3.15 | **now**: 3.15 (rule 27b) |
| 3 | Python (Checks job, unit tests) | none: the runner's system `python3` | — | — | 3.12.3 on 24.04, **3.14.4 on 26.04** | medium: changes with no commit (runner migration this month) | add `setup-python` with the same pin as #2 | **now** |
| 4 | Runner image | `runs-on: ubuntu-latest` (all 7 workflows) | Ubuntu 24.04.5 | `ubuntu-26.04` GA; `ubuntu-latest` moves to it between 2026-10-19 and 11-19 | moving now | medium: silent changes (Python, apt rclone) | none, or pin the label | **now**: pin `ubuntu-26.04` so the change is deliberate, and let the stack check flag the next one |
| 5 | Prettier | `prettier@3.9.10` via `npx --yes` (checks.yml; AGENTS.md; tools/rename_app.py) | 3.8.1 global (agents use `npx prettier@3.9.10`) | 3.9.10 (2026-10-10); `next` = 4.0.0-alpha.13 | none | none | 4.0 will reformat code (big diff, add to `.git-blame-ignore-revs`) | **keep**; **later**: 4.0 once stable |
| 6 | Playwright + Chromium | `playwright@1.64.1`, cache key `ms-playwright-…-1.64.1` (checks.yml) | 1.63.0 global / Chromium 153 (what local smokes resolve via NODE_PATH) | 1.64.1 (2026-10-14), bundles Chromium 156.0.8078.4; Chrome stable 157.0.8103.38; 1.65 in beta | none in CI; container 1 minor behind | low (local vs CI browser differ) | none | **keep**; pin in one place (see section 4) |
| 7 | node:test, node --check | built in (Node 26) | Node 22 | — | — | none | — | **keep** |
| 8 | Pillow | `pip install pillow` **unpinned** (approved-photos.yml) | 12.3.0 | 13.0.0 (2026-10-16), bundles libwebp 1.6.0 | CI already gets 13 | medium: unreviewed majors arrive (13.0 did) | none: 13.0 writes byte-identical WebP (tested) | **now**: `tools/requirements.txt` with `pillow==13.0.0`, Dependabot pip |
| 9 | numpy / scipy / pyarrow (local-only tools) | unpinned imports (find_dups, photo_metrics, photo_quality, rtdecomp; pyarrow in fetch_fishbase, fish_common) | numpy 2.5.3, scipy 1.18.1, no pyarrow | numpy 2.5.4 (10-10), scipy 1.18.1 (08-21), pyarrow 26.0.1 (11-03) | patch | low | none | **now**: `tools/requirements-dev.txt` (not used by CI) |
| 10 | requests | not used (tools use urllib) | 2.34.2 | 2.34.2 | — | none | — | **keep** (no dependency) |
| 11 | rclone | apt `rclone` installed on each run (tools/r2_sync.sh) | not installed | **1.75.2 (2026-10-09)** | apt gives **1.60.1** (upstream 2022-11-17) on 24.04, 1.69.3 (2025-05) on 26.04 | medium: 4 years of S3/R2 fixes missed, and the version changes with the runner | small: download the official zip, check its SHA-256, cache it | **now** |
| 12 | Image tools | Pillow only (cwebp, ImageMagick, sharp not used) | ImageMagick 6.9.12 legacy (unused) | libwebp 1.6.0 (latest, inside Pillow) | — | none | — | **keep** |
| 13 | gh CLI | `gh api` in pages.yml, pages-cancel.yml, prune-branches.yml (runner copy) | 2.89.0 (2026-03-26) | 2.103.3 | runner 2.103.2: none | none | — | **keep** |
| 14 | curl | not used in CI or tools | 8.5.0 | — | — | none | — | **keep** |
| 15 | actionlint / linters | none (only Prettier and `node --check`) | ESLint 10.1.0 global (unused) | actionlint 1.7.12 (2026-03-30) | — | low: workflow typos only show up when a run fails | small | **later**: actionlint step in Checks (optional) |
| 16 | Apps Script runtime | `runtimeVersion: V8`, no libraries, no advanced services (appsscript.json) | — | V8 is the only runtime (Rhino stopped 2026-01-31) | none | none | — | **keep** |
| 17 | Apps Script services | SpreadsheetApp, CacheService, LockService, PropertiesService, UrlFetchApp, ScriptApp triggers, ContentService, Utilities | — | none on the sunset list | none | none | — | **keep** |
| 18 | Apps Script self-update | Apps Script API v1 (`script.googleapis.com/v1/projects/{id}/content`, `/versions`, `/deployments`), 15-min trigger, raw.githubusercontent.com | — | v1 is current, nothing deprecated | none | low | — | **keep** |
| 19 | GitHub REST API | no `X-GitHub-Api-Version` header (admin.js, Code.gs `isAdmin_`), so the default 2022-11-28 applies | — | 2026-03-10 (first version with breaking changes); 2022-11-28 supported until **2028-03-10** | 1 version | low (2+ years left) | trivial; none of the endpoints used are touched by the breaking changes | **later**: send the header explicitly (on the next Code.gs bump) |
| 20 | iNaturalist API | **v1** in 14 tools (taxonomy, build_fish, fetch_local, presence, commonness…); **v2** in fetch_fish.py | — | v2 is "the preferred API going forward"; v1 not deprecated, shutdown "at least a year" away (staff, 2026-04-03) | 1 major | low now, high once a date is announced | medium: v2 needs `fields=`, outputs must be checked to be identical | **later**: move tools to v2 one by one, as each is touched |
| 21 | FishBase | rfishbase parquet snapshot **v25.04** on Hugging Face (fetch_fishbase.py, fish_common.py); images from www.fishbase.de | — | v25.04 is still the latest snapshot | none | none | — | **keep**; the stack check watches for a new snapshot |
| 22 | WoRMS | REST `/rest/AphiaRecordsByName(s)`, `ByMatchNames`, `ByAphiaID`, `Classification`, `Synonyms`, `Children` | — | same endpoints, no deprecation found | none | low | — | **keep** |
| 23 | Cloudflare R2 (S3 API) | rclone `provider=Cloudflare` on `<account>.r2.cloudflarestorage.com` | — | current | none (apart from #11) | none | — | **keep** |
| 24 | R2 public address | `PHOTO_BASE = https://pub-….r2.dev/` (core.js, CSP, sw.js) | — | Cloudflare: r2.dev "rate limited and should only be used for development"; production should use a custom domain | design gap | medium: 429 throttling would send players to the iNat fallback | needs a domain on Cloudflare (money/account: Pierre) | **Pierre**: decide with the domain rename (ROADMAP) |
| 25 | Front-end libraries | **none** (no CDN, no framework, so no SRI needed) | — | — | — | none | — | **keep** |
| 26 | Fonts | self-hosted woff2: Source Sans 3 v3.052, Barlow Condensed v1.408 | — | same (upstream / Google Fonts builds) | none | none | — | **keep**; **later**: `tools/og/og.html` loads Google Fonts, switch it to `fonts/` |
| 27 | Web APIs | service worker, Web Worker (admin analyses), Cache API, `crypto.subtle`, `<dialog>`, `:has`, container queries, `color-mix`, dvh/svh, `content-visibility` (all Baseline); **`object-view-box`** (Chromium only), `navigator.connection` (Chromium only, diagnostics) | — | object-view-box: still not in Safari 27.x or Firefox (bug 1773791 open) | — | low: only the R2-failure fallback crop and the admin previews depend on it | — | **keep**; note that iPhones show the fallback photo uncropped |
| 28 | CSP / manifest | meta CSP with script hashes (`rename_app.py` keeps them in sync); manifest with one SVG icon | — | — | — | low | — | **keep** (no version item) |
| 29 | GitHub Actions | checkout v7/**v4**, setup-node v7/**v4**, setup-python **v5**, cache v6, configure-pages v5, upload-pages-artifact v4, deploy-pages v5 | — | checkout 7.0.1, setup-node 7.1.0, setup-python 7.1.0, cache 6.1.0 | v4/v5 run on Node 20, which runners dropped on 2026-09-16 | — | — | **another agent** (bumps and Dependabot) |

## 2. Findings that matter

1. **rclone 1.60.1 (Nov 2022) uploads every photo.** `tools/r2_sync.sh` runs `sudo apt-get install rclone` when rclone is missing, and it is never preinstalled on the runner. Ubuntu 24.04 ships 1.60.1+dfsg (Debian security patches only). Upstream is at 1.75.2, with 4 years of S3/R2 fixes (for example "Fix server-side copy and move failing with Cloudflare 520 error"). The runner move to 26.04 will jump it to 1.69.3 with no commit. Fix: install a pinned official release in the script (download `rclone-v1.75.2-linux-amd64.zip`, check it against `SHA256SUMS`), with the version in the pin file. The flags used (`copy --checksum --fast-list --header-upload`, `check --one-way`, `lsf`, `size --json`) are unchanged in 1.75, so this is not a breaking change. To test: run "Photos to R2" by hand after the merge. It only copies and checks, it never deletes.
2. **Two Python versions, one of them not pinned.** Candidate photos uses 3.12 through setup-python. Checks (and the unit tests that call `python3`) use whatever the runner image ships: 3.12.3 today, 3.14.4 once `ubuntu-latest` is 26.04, which is happening this month. I ran every Python check of the Checks job (`py_compile` on `tools/*.py`, `datajson.py --check`, `photos.py --check`, `sync_core.py --check`, `rename_app.py --check`, `check_versions.py`) under **3.14.6 and 3.15.0b4**, with SyntaxWarning and DeprecationWarning turned into errors: all clean. Pillow 13.0.0, numpy 2.5.4, scipy 1.18.1 and pyarrow 26.0.1 all publish cp315 manylinux wheels. Recommendation: pin `python-version: '3.15'` in both jobs, in one place.
3. **Pillow is not pinned.** `pip install pillow` already moved CI from 12.x to 13.0.0 (16 Oct) without review. I tested it: `tools/photos.py save()` writes byte-identical WebP with Pillow 13.0.0 and 12.3.0 (both bundle libwebp 1.6.0). None of the 13.0 removals (`get_child_images`, `Image._show`, `ExifTags.IFD.Makernote`, ImageCms product fields) is used in `tools/`. Pin it in `tools/requirements.txt` so Dependabot proposes the next major as a PR.
4. **`ubuntu-latest` is moving under us.** runner-images issue #14748: the label moves to Ubuntu 26.04 over several weeks from 19 Oct, to be done by 19 Nov 2026. The runner's toolcache has no Node 26 (setup-node downloads it, which is fine), but the system Python and the apt rclone change. Writing `ubuntu-26.04` explicitly makes this move, and the next one, a reviewed one-line PR.
5. **r2.dev is a development address.** Cloudflare documents public `r2.dev` access as rate-limited (429 when throttled) and for development only. Production should use a custom domain, which also gives caching rules and WAF. The app copes (core.js `photoAway` falls back to the iNaturalist originals), but at the cost of slower loads and uncropped photos on Safari (object-view-box, item 27). This needs a domain on a Cloudflare zone, which means money and an account: Pierre's decision. It fits with the ROADMAP row "Domain and repository rename".
6. **iNaturalist v1 is in most tools.** It is not deprecated, but v2 is preferred and v1 will be switched off "at least a year" away, with notice. Move a tool to v2 whenever someone touches it (fetch_fish.py already shows the pattern: `fields=`, ~1 request/s, User-Agent), and check that its output files stay identical.
7. **The local stack differs from CI.** The container has Node 22.23.4, Playwright 1.63.0 with Chromium 153 (local smokes pick it up through `NODE_PATH=/usr/local/lib/node_modules_global`) and global Prettier 3.8.1. CI has Node 26, Playwright 1.64.1 with Chromium 156, and Prettier 3.9.10. The unit tests pass on Node 22 here (562/562, 50 s). Agents already call `npx prettier@3.9.10`. Optional: Pierre's cloud environment setup could install Node 26 and `playwright@1.64.1` (claude.ai environment settings).
8. **Stale docs.** HANDOVER "Working copy" says "Node 18+", and the governance review (2026-11-05) already flagged it. The Prettier pin is written in three places (checks.yml, AGENTS.md, tools/rename_app.py, plus `docs/rules/ship.md` on the governance branch) and the Playwright pin in two places in checks.yml (install line and cache key).

## 3. Details by area

### Runtimes
- **Node.** nodejs.org/dist/index.json: v26.13.0 (2026-10-28, LTS Lithium), v24.22.2 (Maintenance LTS, end of life 2028-04-30), v22.23.4 (Maintenance, end of life 2027-04-30). CI follows the newest `26.x` automatically, which is the right setting.
- **Python.** python.org and endoflife.date: 3.15.2 and 3.14.10 (both 2026-10-25). 3.12 is security-only, end of life 2028-10. Runner toolcache: 3.11 to 3.15.1. `setup-python` with `'3.15'` resolves to the latest 3.15.x.
- **Browsers.** Playwright 1.64.1 bundles Chromium 156.0.8078.4. Chrome stable is 157.0.8103.38 and Playwright 1.65 (beta) will follow. The smokes use Chromium only. Safari/WebKit is not tested, although some players are on iPhones. WebKit smokes are a possible later addition (out of scope here).
- **Apps Script.** V8 (Rhino stopped 2026-01-31). Manifest scopes: `spreadsheets.currentonly`, `script.external_request`, `script.scriptapp`, `script.projects`, `script.deployments`. No libraries, no advanced services. Code.gs (core.js embedded) uses at most ES2019 syntax (`flatMap`, `Object.fromEntries`; no `?.`, `??`, `structuredClone`), which is safe for Apps Script V8. Small gap: tests/gas.js runs Code.gs under Node 26, which accepts newer syntax than Apps Script may. A later guard could parse Code.gs with an `ecmaVersion` cap. The 2026 release notes add nothing that affects this script (data regions, Gemini side panel, GA as a Workspace service).
- **Apps Script self-update** (Code.gs `installAutoUpdate`/`autoUpdate`). A 15-minute trigger fetches `raw.githubusercontent.com/…/tools/sync/Code.gs`, then PUTs `/v1/projects/{id}/content`, POSTs `/versions` and PUTs `/deployments/{id}`, using the script's own OAuth token. Apps Script API v1 is current. Nothing to change.

### Tooling
- **Prettier.** Run by `npx --yes prettier@3.9.10 --check` in CI, config in `.prettierrc.json` / `.prettierignore`. It is the latest stable. 4.0 is in alpha (alpha.13). When 4.0 is stable it will be one large reformat commit (add it to `.git-blame-ignore-revs`).
- **Linters.** None besides Prettier and `node --check`. actionlint (1.7.12) would catch workflow mistakes before they reach main. Optional.
- **Tests.** `node:test` (built in), 8 Playwright smoke jobs, Python `--check` scripts. Nothing to version.
- **gh CLI.** The runner's 2.103.2 is used for `gh api` calls with `GITHUB_TOKEN`. Nothing pinned, nothing needed.
- **rclone.** See finding 1.
- **Images.** All through Pillow (WebP `quality` 70 to 78, `method=5`; `thumbnail`; ImageDraw/ImageFont for judging sheets). Pillow bundles libwebp 1.6.0, the latest. cwebp, ImageMagick and sharp are not used. og.jpg is a Playwright screenshot (`tools/og/make_og.js`).
- **Python packages.** Third-party: Pillow (CI and local), numpy and scipy (local analysis tools), pyarrow (local, FishBase parquet). Everything else is the standard library (urllib, not requests). There is no requirements file.

### Front end
- No third-party script, stylesheet or font at runtime. The CSP `script-src 'self'` plus hashes enforces this. Fonts come from `fonts/`, the latin subset under SIL OFL.
- `object-view-box`: Chrome/Edge 104+. Not in Safari (including 27.x) or Firefox (bug 1773791 open). It is used only when a photo comes from its online original (R2 failure) and in admin previews. Safari players would see the uncropped photo in that fallback. Keep it, and remember it when deciding item 24.
- `navigator.connection` (Chromium only) is used for load diagnostics only. Everything else is Baseline.
- Manifest: one SVG icon (`sizes: any`). Fine for Chrome. iOS home-screen icons need an `apple-touch-icon` PNG, which `index.html` does not have. That is a UI choice, not a version item.
- CSP is set in a meta tag. `frame-ancestors` cannot be set that way, and GitHub Pages sets no headers. That is a known limit of the platform.

### External APIs
- **iNaturalist.** `api.inaturalist.org/v1/{taxa,observations,observations/observers,observations/species_counts}` and `v2/{observations,taxa}`. Photos come from `inaturalist-open-data.s3.amazonaws.com` and `static.inaturalist.org`. Both API versions answered 200 today.
- **FishBase.** No live API: the rfishbase parquet snapshot v25.04 (Hugging Face `cboettig/fishbase`, still the newest folder). Images are hotlinked from `www.fishbase.de/images/species/` (200 today). The old ropensci FishBase REST API is not used, which is good.
- **WoRMS.** REST at `www.marinespecies.org/rest/`, answered 200 today. No deprecation notice found.
- **Cloudflare R2.** S3 API via rclone (current). Public reads through r2.dev (item 24).
- **Google.** The web app at `script.google.com/macros/s/…/exec` redirects to `script.googleusercontent.com`, and both are in the CSP. The Apps Script API is v1.
- **GitHub.** REST for the admin (`/user`, `/repos/{repo}`, contents) and for Code.gs `isAdmin_` (`/repos/{repo}`). No version header, so 2022-11-28 applies (supported to 2028-03-10). The 2026-03-10 breaking changes (`rate` removed from `/rate_limit`, team `permission`, `pre_receive_hook_id`, SARIF content type, `use_squash_pr_title_as_default`) touch none of these calls. Sending `X-GitHub-Api-Version: 2026-03-10` is a safe one-line change, best made at the next Code.gs version bump. Side notes outside the version scope: admin.js still offers a classic-token link with the `repo` scope beside the fine-grained one, and the token vault uses PBKDF2-SHA-256 with 250,000 iterations, where OWASP's current figure is 600,000.

### GitHub Actions (for completeness; the other agent's track)
checkout v7 (checks, prune) and v4 (analyses, approved-photos ×2, pages, photos-r2); setup-node v7 (checks) and v4 (analyses); setup-python v5 (approved-photos); cache v6; configure-pages v5; upload-pages-artifact v4; deploy-pages v5. Latest per each repository's package.json: checkout 7.0.1, setup-node 7.1.0, setup-python 7.1.0, cache 6.1.0. Runners moved JavaScript actions to Node 24 on 2026-06-02 and removed Node 20 on 2026-09-16, so the v4/v5 actions run on a runtime that is no longer supported. There is no `.github/dependabot.yml` yet.

## 4. Keeping the stack current

1. **One pin file, `tools/stack.json`.** It holds every version the repository chooses but no package manager tracks: `node` "26", `python` "3.15", `runner` "ubuntu-26.04", `prettier` "3.9.10", `playwright` "1.64.1", `rclone` "1.75.2", `fishbase_snapshot` "v25.04", `github_api` "2022-11-28", `inat_api` {"v1": [tools…], "v2": [tools…]}, each with a one-line reason, as rule 27b asks for exceptions. The workflows keep their literal values, because Actions cannot read a file before `runs-on`. A consistency check (`tools/stack_check.py --check` in Checks, like `check_versions.py`) fails when checks.yml, the cache key, AGENTS.md / ship.md, `rename_app.py` or `r2_sync.sh` disagree with the file.
2. **Dependabot ecosystems that fit a repository with no build and no package manager.**
   - `github-actions`: in flight with the other agent.
   - `pip`: with `directory: /tools`, reading `tools/requirements.txt` (pillow, used by CI) and `tools/requirements-dev.txt` (numpy, scipy, pyarrow, local only). Weekly, grouped into one PR.
   - `npm`: works only with a package.json. Pierre's rule says "never add a package.json" (HANDOVER), so the recommendation is no; `stack_check.py` covers Prettier and Playwright instead.
   - `docker`, `uv` and `pre-commit` do not apply.
   - Renovate's regex managers could bump the inline pins too, but it is a GitHub App to install (account access: Pierre). Not recommended.
3. **`tools/stack_check.py`, the periodic check.** Standard library only, offline-safe (a failed request prints "unknown", never fails). It compares `tools/stack.json` with:
   - nodejs.org/dist/index.json (newest LTS major)
   - endoflife.date/api/python.json (newest stable cycle)
   - registry.npmjs.org (prettier and playwright `latest`; flags a `next` major)
   - pypi.org/pypi/<pkg>/json
   - downloads.rclone.org/version.txt
   - the actions/runner-images README (what `ubuntu-latest` is, and announcements)
   - the Hugging Face tree of `cboettig/fishbase` (a new snapshot)
   - docs.github.com api-versions (a new REST version, the sunset of the pinned one)
   - the Apps Script sunset page (a new row)
   - informational only: Chrome stable from versionhistory.googleapis.com, and whether iNaturalist has announced a v1 date.

   It prints one table of current, latest and gap, and exits 1 with `--strict`. **Where it runs:** `tools/brief.py` calls it at most once a day (result cached in `tools/.cache/stack.json`, gitignored) and prints one line such as "stack: 2 outdated (rclone, python)" in the session brief. That way the integrator sees it, rather than Pierre, who does not browse GitHub. A weekly scheduled workflow writing to the step summary is optional.
4. **A rule in `docs/rules/ship.md`** (or AGENTS.md 27b until the governance PR lands): "Every pinned version lives in `tools/stack.json` or names it. Run `python3 tools/stack_check.py` before touching CI or a tool's dependencies. When the brief says something is outdated, open a stack PR. A patch or minor bump, or an action or runtime major with green checks and byte-identical outputs, is an integrator's call. A bump that changes what players see, how photos are produced, or what Pierre does (Prettier major reformat, a photo encoder change visible in output, R2 address, any new account or service) goes to Pierre."

## 5. Proposed PRs

Routine: players and Pierre notice nothing; integrator's call under the merge contract.
- **PR 1 "CI runtimes pinned and current"**: `python-version: '3.15'` in approved-photos.yml, plus `setup-python` in the Checks job with the same pin; `tools/requirements.txt` (`pillow==13.0.0`) and `pip install -r tools/requirements.txt`; `runs-on: ubuntu-26.04` in the 7 workflows; HANDOVER "Node 18+" changed to "Node 26 (CI), Python 3.15". Coordinate with the actions-bump PR: same files, setup-python v7. It can also be folded into that PR.
- **PR 2 "rclone pinned"**: `tools/r2_sync.sh` downloads rclone v1.75.2 from downloads.rclone.org, checks the SHA-256 and caches it. Test with a manual "Photos to R2" run after the merge (copy-only).
- **PR 3 "Stack check"**: `tools/stack.json`, `tools/stack_check.py` (+ `--check` in Checks, + a unit test with offline fixtures), the brief line, Dependabot `pip` (in the other agent's `dependabot.yml`), `tools/requirements-dev.txt`, and the Prettier/Playwright pins in one place. The tool is an integrator's call. The ship.md rule text is a process change: one nod from Pierre (one question).
- **Later, routine**: `X-GitHub-Api-Version` header in admin.js and Code.gs (with the next sheet-script version, which self-deploys); move tools from iNaturalist v1 to v2 as each is touched, with identical outputs checked; actionlint in Checks; `tools/og/og.html` on local fonts; Prettier 4 once stable (one reformat commit).

Changes Pierre would notice: his decision.
- **Q: custom domain for the photos instead of r2.dev** (a Cloudflare zone, so money and an account; ties with the domain rename). Recommendation: yes, together with the rename. Without it, heavy traffic could be throttled (429) and players fall back to slower, uncropped iNaturalist originals.
- **Q: a package.json just so Dependabot can bump Prettier and Playwright?** Recommendation: no. Keep his rule and let `stack_check.py` cover them.
- **Q (optional): Node 26 and Playwright 1.64.1 in the cloud environment's setup** (his claude.ai environment settings), so local runs match CI. Recommendation: yes, low priority.

## Sources (consulted 2026-11-05)

- Node releases: https://nodejs.org/dist/index.json ; lifecycle: https://endoflife.date/nodejs
- Python: https://www.python.org/downloads/ ; https://endoflife.date/python
- Prettier: https://registry.npmjs.org/prettier (latest 3.9.10, 2026-10-10; next 4.0.0-alpha.13) ; https://www.npmjs.com/package/prettier
- Playwright: https://registry.npmjs.org/playwright (1.64.1, 2026-10-14) ; bundled browsers: https://unpkg.com/playwright-core@1.64.1/browsers.json
- Chrome stable: https://versionhistory.googleapis.com/v1/chrome/platforms/linux/channels/stable/versions
- Pillow 13.0.0 notes: https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html ; https://pypi.org/project/pillow/
- numpy / scipy / pyarrow / requests: https://pypi.org/project/numpy/ , https://pypi.org/project/scipy/ , https://pypi.org/project/pyarrow/ , https://pypi.org/project/requests/
- rclone: https://rclone.org/changelog/ ; https://downloads.rclone.org/version.txt ; Ubuntu packages: https://packages.ubuntu.com/search?keywords=rclone&searchon=names&exact=1&suite=all&section=all
- Runner images: https://github.com/actions/runner-images ; https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md ; https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md ; ubuntu-latest move: https://github.com/actions/runner-images/issues/14748
- Node 20 actions runtime deprecation: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners
- Action versions: https://github.com/actions/checkout , https://github.com/actions/setup-node , https://github.com/actions/setup-python , https://github.com/actions/cache (package.json on the default branch)
- gh CLI: https://formulae.brew.sh/formula/gh ; libwebp: https://formulae.brew.sh/formula/webp ; actionlint: https://github.com/rhysd/actionlint/blob/main/CHANGELOG.md
- Apps Script: https://developers.google.com/apps-script/releases ; https://developers.google.com/apps-script/guides/support/sunset ; V8: https://developers.google.com/apps-script/guides/v8-runtime
- GitHub REST API versions: https://docs.github.com/en/rest/about-the-rest-api/api-versions ; https://github.blog/changelog/2026-03-12-rest-api-version-2026-03-10-is-now-available ; https://docs.github.com/en/rest/about-the-rest-api/breaking-changes
- iNaturalist v1/v2: https://forum.inaturalist.org/t/is-v2-the-official-api-now/77258 (staff reply 2026-04-03)
- FishBase snapshots: https://huggingface.co/datasets/cboettig/fishbase/tree/main/data/fb ; rfishbase: https://github.com/ropensci/rfishbase
- WoRMS web services: https://www.marinespecies.org/aphia.php?p=webservice
- Cloudflare R2 public buckets and limits: https://developers.cloudflare.com/r2/buckets/public-buckets/ ; https://developers.cloudflare.com/r2/platform/limits/
- object-view-box support: https://caniuse.com/mdn-css_properties_object-view-box ; https://bugzilla.mozilla.org/show_bug.cgi?id=1773791

### Checks run for this audit (read-only, nothing committed)
- `node --test tests/*.test.js` on the container's Node 22.23.4: 562/562 pass.
- CI Python checks under Python 3.14.6 and 3.15.0b4 (uv-managed, in the scratchpad), warnings as errors: all pass.
- `photos.save()` with Pillow 13.0.0 and 12.3.0 on `img/acropora-cf-2-00.webp`: the four output files are byte-identical.
- Live probes (HTTP 200): iNaturalist v1 and v2, WoRMS REST, fishbase.de images, the R2 public address.

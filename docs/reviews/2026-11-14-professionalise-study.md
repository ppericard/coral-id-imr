# Professionalise the platform (study, 2026-11-14)

Read-only study for the ROADMAP row "Professionalise the platform". It changes nothing in the app, the sheet or any
account. Pierre, 2026-11-08: "own hosting, a test (staging) environment before production, a modern CI/CD for a web and
a mobile app, a real database at some point?, and the questions he does not think of. A real study first: what to set
up and how, at least cost first, staying simple."

**Constraints from his later answers:**
- He pays nothing today. A monthly cost would need settling with IMR (Q353).
- The answer log moves to Cloudflare D1 behind a Worker only when a measured threshold is crossed (Q352). The `Timings`
  tab (#867) measures it.
- The sheet script runs under his personal Google account, so consumer quotas apply.
- The expected scale is 4-8 RAs a month, with no second organisation planned yet.
- The domain and repository rename is due before December 2026.
- ReefRecall will be rebuilt as Flutter + Supabase; a shared backend is a later question.

**How it was checked.**
- The repository at `main` (230f992e): docs, workflows, `tools/sync/Code.gs`.
- The sync sheet's tab sizes and its `Timings` tab, read once through the Sheets connector (read-only, no player data).
- The official pricing and limits pages listed under "Sources", each read on 2026-11-14.
- Every figure is labelled. **Measured** means read from the sheet or the repository. **Computed** means arithmetic on
  measured or published figures. **Guess** means a judgement (rule W11).
- Prices are in US dollars, as the pages give them.

## Headline

1. **Nothing has to be paid for, today or in the recommended path, except a domain name.** A domain costs about
   US$10-12 a year (third-party figures; Cloudflare sells at cost and shows its own price only at checkout).
   Everything else fits free tiers at 4-8 RAs a month, with wide margins:
   - GitHub Actions is free on a public repository;
   - Cloudflare gives R2, Workers, D1, DNS, and Access for up to 50 people for free;
   - Apps Script is free, within its quotas.
2. **The domain is the one structural step, and the rename is the moment for it.** Every change of host without our
   own domain is a new origin. On a new origin players lose their local progress, settings and offline caches.
   - With our own domain, later moves are invisible to players: from GitHub Pages to Cloudflare, or from the sheet to D1.
   - The same domain lets the photos leave `r2.dev`. Cloudflare calls that address "rate-limited and should only be used
     for development purposes", and it has no caching. It is the weakest production part today.
3. **What breaks first, in order:**
   - **Now:** the `r2.dev` photo address.
   - **Around December:** the photo stats cache's 100 KB limit (the storage study; Q123 j fixes it).
   - **Not dated, and the first to watch:** the consumer Apps Script trigger quota of 90 minutes a day.
   - **Mid-2027 at today's pace:** the whole-tab read of `Answers` on every save (the storage study). D1 at the measured
     threshold (Q352) answers it.
   - The sheet's cell limit, R2's 10 GB and GitHub Pages' limits are years away.
4. **The biggest risks are not technical capacity.** They are the bus factor of one and the platform living in Pierre's
   personal accounts:
   - one Google account holds every player's data and the sync;
   - one GitHub account can push code that the sheet script installs by itself;
   - one Cloudflare account holds the photos.

   The cheap fixes are organisational and free: recovery set up on each account, a second person able to recover,
   a backup outside Google, and an agreement with IMR on who owns the data.
5. **Staging, previews and a new host are not needed yet.** Pierre, 2026-11-05: previews are "not needed in alpha /
   early beta". When they are, Cloudflare is the free path, sharing the account that already holds R2 and later D1:
   - Workers static assets with a preview URL per branch;
   - previews closed to the team with Access, free for up to 50 users.

   `tests/gas.js`, the in-memory sheet, stays the script's staging.
6. **Mobile: IMR Reef ID stays a web app (PWA), with no store fee.**
   - ReefRecall's CI fits free tiers:
     - GitHub Actions for Android, free on a public repository, about 2,000 Linux minutes a month on a private one;
     - Codemagic's 500 free macOS minutes a month for iOS.
   - Its store fees are its own budget: Google Play US$25 once, Apple US$99 a year.
   - Apple's fee waiver is only for nonprofit, educational or government entities that sell nothing, so not for
     ReefRecall.
7. **Six questions for Pierre** (end of the file), all about money, ownership or access:
   - the domain;
   - who owns the platform's accounts;
   - where the sheet lives;
   - an agreement with IMR;
   - a second person for recovery;
   - a backup outside Google.

## 1. Where things run today

| Part | Service | Account | Cost | The limit that matters | State on 2026-11-14 |
|---|---|---|---|---|---|
| The app (`index.html`, JS, CSS, `data.json`, `curation.json`, the 124 photos with no other copy) | GitHub Pages, deployed by `pages.yml` | Pierre's GitHub | $0 | 1 GB site, 100 GB a month soft bandwidth; "not ... to run your online business" or SaaS | Small (photos left for R2). The origin `ppericard.github.io` is shared with every Pages site of the account, so its storage is too (docs/ARCHITECTURE.md "Security model") |
| Photos with an online original | Cloudflare R2, public `r2.dev` address | Pierre's Cloudflare | $0 | 10 GB-month free; `r2.dev` is "for development", rate-limited, not cached | ~2 GB expected with the fish in play, 5-10 GB at the caps (ROADMAP "Hosting capacity (watch)") |
| Accounts, answers, reports, events, the leaderboard, replays | Google Sheet + Apps Script web app, self-updating from `main` every 15 min | Pierre's personal Google account and its Cloud project | $0 | Consumer quotas: 6 min a run, **90 min of triggers a day**, 20,000 URL fetches a day; 20 million cells a spreadsheet | **Measured**: `Answers` 5,668 rows. Grid allocated across the 17 tabs about 0.6 million cells (computed from the tab sizes). See section 2 |
| CI and automation | GitHub Actions: Checks, Smokes, Deploy Pages, Candidate photos, Photos to R2, Analyses report (hourly), Learning check, Clean, Cancel stuck Pages | Pierre's GitHub; secrets: the R2 token, the Analyses token | $0 (public repository: "standard GitHub-hosted runners in public repositories" are free) | None near | docs/PAGES.md lists every workflow |
| Admin writes | GitHub Contents API with a fine-grained token, 90-day expiry, kept encrypted in Pierre's browser | Pierre's GitHub | $0 | The token's expiry | One admin |

Monitoring today is first-party, and nothing pages anyone:
- the sheet's `Events` (errors, failed saves), `Alerts` (caps), `Deploy log` and `Timings` tabs;
- the Actions run status;
- `tools/brief.py` at each session start.

## 2. What breaks first, and when

| # | What | Trigger | When | Evidence | Fix | Cost |
|---|---|---|---|---|---|---|
| 1 | Photos on `r2.dev` | Cloudflare's development address is rate-limited, uncached, "intended for non-production traffic" | **Now**; worse with more players | Cloudflare's R2 docs (Sources) | A custom domain on the bucket. It needs a domain whose zone is in the same Cloudflare account | Domain only |
| 2 | The photo stats cache | One value over Apps Script's 100 KB cache limit | **Around December** | The storage study (ROADMAP "Fish confusion at several ranks") | Q123 j, pooled stats built incrementally (in the queue) | $0 |
| 3 | The rename | A new origin: local progress, settings and caches do not follow | **Before December** (decided) | ROADMAP "Domain and repository rename" | Section 3.1 and step 6 of the path | Domain only |
| 4 | **Trigger quota, 90 min a day** (consumer account) | The 15-minute trigger (`autoUpdate`) runs the leaderboard's replays (`boardWarm_`) each time: 96 runs a day | **Not dated; watch it** | **Measured** (4 rows, 2026-11-14): the board-warm runs that were logged took 5.1, 5.3, 5.5 and 13.0 s. Only runs of 5 s or more, or 1 in 16, are logged (`TIM`), so most runs are shorter. **Computed**: 96 runs at 5-13 s would be 8-21 min a day, an upper estimate for today. One run may last up to `BOARD_WARM_MS` = 150 s, so a rules change that leaves many players behind could ask for up to 240 min a day: over the quota | `tools/timings.js` on the `Timings` tab, weekly. Fixes: fewer replays a run, or the script under a Google Workspace account (6 h a day; question c) | $0 |
| 5 | Every save reads the whole `Answers` tab | Slow somewhere between 20k and 100k rows | Mid-2027 at today's pace, early 2027 with full cohorts (the storage study) | **Measured**: one sampled read of 5,668 rows × 18 columns took 805 ms (2026-11-14) | D1 behind a Worker at the measured threshold (Q352, decided) | $0 (D1 free tier) |
| 6 | Sheet size | 20 million cells a spreadsheet (Google's page, read 2026-11-14) | Years | **Computed**: about 0.6 million cells allocated today. docs/SECURITY.md still says 10 million: the integrator corrects that line in its own PR | Archive or D1 (Q352) | $0 |
| 7 | R2 storage | 10 GB-month free | Months to years (fish caps) | ROADMAP "Hosting capacity (watch)" | Pay beyond: $0.015 per GB-month, so about $0.15 a month for 10 GB more (computed) | Cents; needs IMR (Q353) |
| 8 | Admin token | 90-day expiry | Every 90 days | docs/HANDOVER.md | A credentials calendar (section 5) | $0 |
| 9 | Pierre's accounts | A lost, locked or compromised account | Any day; not a matter of scale | Section 5 | Recovery, a second person, a backup outside Google | $0 |
| 10 | GitHub Pages limits | 1 GB site, 100 GB a month | Years (the photos are on R2) | GitHub Pages limits page | None needed | $0 |

## 3. The options, item by item

Each table lists the options cheapest first. "Fit" says how each sits with:
- the rename;
- the roles and instances plan (ROADMAP "Roles, instances and cohorts", "The app as a generic product licensed to
  organisations");
- a possible shared backend with ReefRecall, without committing to it.

### 3.1 Hosting and domain

| Option | Price and free tier (read 2026-11-14) | Fit: rename | Fit: roles and instances | Fit: ReefRecall |
|---|---|---|---|---|
| **A. GitHub Pages as today, no domain** | $0. 1 GB site, 100 GB a month soft, 10-minute deploys | The rename moves to another `github.io` path: a new origin again at the next move | GitHub's terms exclude "your online business" or SaaS: a licensed product would have to leave | None |
| **B. GitHub Pages + our own domain** | $0 hosting + the domain. HTTPS enforcement available; GitHub recommends verifying the domain against takeover | **The last address change**: later host moves are DNS only | Same terms limit as A. One domain can carry instance subdomains later | A shared domain could carry the ReefRecall API later (`api.<domain>`) |
| **C. Cloudflare Workers static assets (or Pages) + our own domain** | $0. Static asset requests "free and unlimited"; 20,000 files and 25 MiB a file per version; Workers 100,000 requests a day (only for code, not static files). Cloudflare's Pages docs say "Start new projects with Workers" | Same as B, plus real HTTP headers (CSP with `frame-ancestors`, HSTS), which a `<meta>` CSP cannot set | One account for the site, photos, D1, Access and per-instance subdomains | A Worker API can serve a Flutter app as well as the web app |
| D. Netlify, Vercel | Netlify Free: 300 credits, 20 credits a GB. Vercel Hobby: 100 GB a month | As C | No gain over C; a new vendor | None |
| E. Firebase Hosting | Spark: 10 GB stored, 360 MB a day transfer | As C | Tight with photos | Pulls towards Google's stack, away from Supabase |

**Domain.**
- Cloudflare Registrar sells at the registry's price with no markup, includes WHOIS redaction, and supports 430+
  endings. The page gives no figures.
- Third-party figures for 2026 put `.org` at about $11.20 a year to renew and `.com` at about $10.46.
- One source says the `.com` registry price rose on 2026-11-01, so `.com` is perhaps about $11 now.
- Plan for **US$10-12 a year**.
- Registering at Cloudflare puts the zone in the same account as the R2 bucket, which R2's custom domain requires.

**Recommendation.**
- B at the rename: the smallest change, since the deploy workflow stays.
- C later, when previews are wanted (3.2). The move is then DNS only and players see nothing.
- Two traps for the rename PR:
  1. A repository rename or transfer does **not** redirect a project's Pages site (GitHub's docs on renaming and
     transferring). The old address stops serving.
  2. If GitHub answers the old `github.io` path with a redirect once a custom domain is set (behaviour not stated on the
     pages read), the old origin can no longer run a hand-over page. Players not signed in would then lose their local
     progress, which only a page on the old origin can read.

  So the hand-over release on the old origin ships and runs first. A tiny repository can keep serving a hand-over
  page there after the move: every page of `ppericard.github.io` reads the same storage.
- The sheet script fetches its own updates from `raw.githubusercontent.com/<REPO>`. Whether that address follows a
  renamed repository is not stated on the pages read. The rename plan keeps Pierre's manual redeploy
  (docs/HANDOVER.md) as the fallback, and checks the self-update right after the move.

### 3.2 Staging and PR previews

Decided: previews are "not needed in alpha / early beta"; they are needed "once many players use the app every day";
a preview never writes to the real sheet (rule D1) (Pierre, 2026-11-05). This section prepares that day.

| Option | Price | What it gives | Fit |
|---|---|---|---|
| **A. Today: no staging site.** The tests are the staging: Playwright smokes and `tests/gas.js` (Code.gs on an in-memory sheet); `admin.html?demo` | $0 | A bad `Code.gs` reaches every player within 15 min; a revert reaches them as fast | Enough at 4-8 RAs |
| **B. Cloudflare preview URLs** (Workers: a preview per branch; Pages: one per PR, unlimited) on their own origin, closed with Access | $0. Access free plan: "teams under 50 users" | Pierre taps a PR before players do. The previews' sync points at a demo backend (the `admin-demo.js` pattern) or reads only | Needs C of 3.1 for the app. Access can also guard trainer and editor pages later (roles) |
| C. A staging sheet + script | $0, but a second script under the **same** Google account shares its 90-minute trigger quota; under another account it is one more credential | A real backend to test `Code.gs` against | Disappears with D1: a second D1 database is free (10 on the free plan) |
| D. A second GitHub Pages site | $0 | Not recommended: it shares the `ppericard.github.io` origin, so it shares players' progress and the admin token's storage (ROADMAP "PR preview links") | None |

**Recommendation**: A now. B when Pierre says previews are wanted; it is free. C only after D1, as a second database.

### 3.3 CI/CD, web and mobile

| Option | Price (read 2026-11-14) | Fit |
|---|---|---|
| **Web: GitHub Actions as today** | $0 on a public repository. A private repository on GitHub Free: $12 of compute a month (about 2,000 Linux minutes), 500 MB of artifacts, 10 GB of cache | Deploys to Cloudflare later with `wrangler deploy` from the same workflow, keeping the stamp step (rule W15), with a token scoped to that one Worker |
| Web: Cloudflare Workers Builds | $0: 3,000 build minutes a month, 1 build at a time, 20 minutes each | Would move the stamp step out of Actions; no gain |
| **Mobile, Android (ReefRecall)** | GitHub Actions Linux: free on a public repository; within the $12 a month on a private one | Flutter builds on Linux |
| **Mobile, iOS (ReefRecall)** | Codemagic: 500 free macOS M2 minutes a month (individuals), then $0.095 a minute. GitHub Actions macOS on a private repository: $0.062 a minute | Codemagic's free tier first |
| Stores | Google Play: US$25 once. New personal accounts must run a closed test with 12 testers opted in for 14 days. Apple: US$99 a year; fee waiver only for a nonprofit, accredited educational or government legal entity that sells no paid app or in-app purchase | ReefRecall's own budget. IMR Reef ID stays a PWA, already installable, with no store fee |

**Gaps in today's CI, all free and in the queue already:**
- split the photo workflow's push job;
- `pip install --require-hashes` (docs/SECURITY.md, ROADMAP).

Required checks on `main` stay off on purpose: Publish and the photo workflow push to `main`
(docs/HANDOVER.md "Protect main").

### 3.4 The database

Decided (Q352): the answer log moves to D1 behind a small Worker, with Code.gs staying the API, only when the measured
threshold is crossed. Decided (Q343): one shared sheet for now, one per organisation in the medium term. This section
compares what that decision chose against the alternatives, so it can be reopened on facts. It is not a new question.

| Option | Free tier (read 2026-11-14) | Paid | Fit: rename | Fit: roles and instances | Fit: ReefRecall |
|---|---|---|---|---|---|
| **Google Sheet (today)** | 20 million cells; Apps Script consumer quotas | Workspace accounts: 6 h of triggers a day, 100,000 URL fetches | None | One sheet per organisation (Q343) multiplies quota and copies | None |
| **Cloudflare D1 (decided at the threshold)** | 10 databases, **500 MB each**, 5 GB in all; 5 million rows read and 100,000 rows written a day (over: blocked until 00:00 UTC, never billed); Time Travel 7 days | Workers Paid **$5 a month minimum**: 10 GB a database, 25 billion rows read and 50 million written a month, Time Travel 30 days | The API moves to `api.<domain>`; players see nothing | One database per instance is free (10) | A Worker API is client-neutral; Flutter can call it |
| Supabase (Postgres) | 500 MB database, 50,000 auth MAU, 5 GB egress, 2 active projects; **free projects pause after 1 week of inactivity**; no backups | Pro **$25 a month**: 8 GB, daily backups for 7 days; point-in-time recovery $100 a month | As D1 | Postgres row-level security fits scoped roles | ReefRecall's chosen stack, so the shared backend becomes possible |
| Firebase Firestore | 1 GiB, 50,000 reads and 20,000 writes a day | Blaze, pay as you go | As D1 | Rules-based | Another stack than ReefRecall's |
| Neon (Postgres) | 1 GB a project, 100 compute-hours, history 6 h | From about $15 a month (their figure) | As D1 | As Supabase | Postgres, but not Supabase |

**Computed**:
- At about 200-300 bytes an answer row (a guess from the `Answers` columns), D1's free 500 MB holds 1.5-2.5 million
  answers. That is centuries at today's few thousand a month.
- The binding D1 limit is rows **read**: one full scan of a 100,000-row table spends 100,000 of the 5 million a day.
  Pooled stats built incrementally (Q123 j) matter on D1 as much as on the sheet.

**Supabase's pause** after a week without activity matters for IMR: cohorts come with gaps. A paused free project
breaks sign-in and saves until someone resumes it. Staying on Supabase without the pause means Pro at $25 a month,
which needs IMR (Q353).

**Recommendation**: keep Q352 as decided. Reopen the backend choice only if ReefRecall's shared backend is wanted and
someone pays for Supabase Pro.

### 3.5 Auth and accounts

Decided (Q349): name + 4-digit code during the pilot, then "a proper account and password manager, possibly with
Google or Meta sign-in", with no secret role links. Decided (Q348): editors publish through a relay in the sheet
script, and no editor or trainer ever gets a push-capable GitHub token. This section prepares the "better sign-in"
step of the roles row.

| Option | Price (read 2026-11-14) | Notes | Fit |
|---|---|---|---|
| **A. Name + 4-digit code (today)** | $0 | Prevents accidental overwrites only (docs/SECURITY.md) | Pilot only (Q349) |
| **B. Own OAuth in the Worker** (Google and Meta as OpenID providers, redirect flow, sessions in D1) | $0 | No third-party script on our pages (rule U5: Google's sign-in button script is a third-party script; the redirect flow needs none). Google: an OAuth consent screen and brand verification; whether an app using only `openid email profile` is exempt is not stated on the page read. Meta: `public_profile` and `email` need no app review; a data deletion callback is required | Lives next to D1; one account across instances |
| C. Supabase Auth | $0: 50,000 MAU, Google, Facebook and Apple included; pauses after a week of inactivity (3.4) | Pro $25 a month to avoid the pause | Natural if ReefRecall shares the backend |
| D. Firebase Auth | $0: 50,000 MAU | A Google stack | Away from ReefRecall's Supabase |
| E. Cloudflare Access | $0 up to 50 users, then $7 a user a month | For staff (admin, editors, trainers), not players: a second lock in front of the trainer and editor pages | Fits the roles plan's server-side checks as an extra layer |

Two rules to know before choosing:
- **Apple's guideline 4.8**: a native iOS app that offers Google or Meta sign-in for the primary account must also offer
  an equivalent login that limits data to name and email and lets users hide their email. There is an exemption for an
  education app that requires an existing education account. This binds ReefRecall on iOS, not the web app.
- **The admin's GitHub token** stays Pierre's alone. Editors go through the relay (Q348).

**Recommendation**: decide at the "better sign-in" step, not now. B by default (free, no third-party script, next to
D1). C if, by then, ReefRecall shares the backend and Supabase Pro is paid.

### 3.6 Backups

| What | Today | Gap | Option, cheapest first |
|---|---|---|---|
| Code, `data.json`, `curation.json`, the 124 photos with no other copy | Git on GitHub plus local clones | None serious | Keep |
| Photos with an online original | R2, nothing ever deleted; each has its online original as a fallback | None serious | Keep |
| **The sheet: accounts, answers, reports, events** | One copy, in Pierre's Google Drive; Sheets' version history undoes bad writes | **Account loss loses everything**, and progress is replayed from the answer log (rule D9), so the log is the irreplaceable part | **A weekly backup outside Google** into a private R2 bucket: free within 10 GB; an Action with a token scoped to that bucket. The Analyses Action already reads the answer log hourly with the admin token. Never an Actions artifact or a commit (the repository is public, and artifact downloads need only read access) |
| D1, later | Time Travel: 7 days free, 30 days paid | Beyond 7 days | Export to the same private R2 bucket (Cloudflare documents an export to R2) |
| Supabase, if ever | Free plan: no backups ("regularly export their data", Supabase) | Everything | `supabase db dump` from an Action, or Pro |

**Recommendation**: the weekly backup, with one restore drill written down (question f: it sends player data to a
second provider).

### 3.7 Monitoring

| Option | Price | Fit with our rules |
|---|---|---|
| **A. A scheduled health-check workflow, hourly** | $0 (public repository) | First-party. It checks: the site answers with the deployed build; one photo answers from R2; the sync script answers (`?answers=1` returns `{ok: false, error: 'token'}` before any sheet read, so it costs no quota beyond one request); the live script version equals `main`'s 30 min after a merge; the trigger minutes a day from the `Timings` tab against 90; the credentials' expiry dates. `tools/brief.py` shows the last result, and the agents fix a failure (Rule 0: production broken for players is ours to fix) |
| B. UptimeRobot | $0: 50 monitors every 5 minutes, commercial use allowed | An outside view that still works if GitHub is down. Alerts go by email; Rule 0 decides whether Pierre gets them in the evening |
| Not recommended: Sentry, Cloudflare Web Analytics | Sentry free: 1 user, 5,000 errors. Web Analytics: free | Both run a third-party script in the page (rule U5) and send data to a third party, against privacy.html's "no third-party analytics or tracking scripts". `Events` and `Pages` already cover errors and use, first-party |

**Recommendation**: A now. B optional.

## 4. The recommended path

Each step is one PR or one setup action, with its cost. The order is the order of risk; steps 1-4 need no money.

| Step | What | Kind | Cost |
|---|---|---|---|
| 1 | **Credentials and recovery table** in docs/HANDOVER.md, without any value: each account (GitHub, Google, Cloudflare, later the domain), its owner, two-factor method, recovery codes kept offline (where, not what), the tokens and their expiry dates, how to rotate each | Docs PR | Free |
| 2 | **Two-factor authentication with a passkey or security key, and printed recovery codes**, on the GitHub, Google and Cloudflare accounts; expiry dates in a calendar | Setup, Pierre, about 15 min | Free |
| 3 | **The health-check workflow** (3.7 A) and its line in `tools/brief.py` | PR | Free |
| 4 | **The weekly backup** to a private R2 bucket, and one restore drill (3.6), after question f | PR + a scoped R2 token (Pierre, about 5 min) | Free |
| 5 | **The domain**, after question a: registered at Cloudflare Registrar, auto-renew on, the zone on Cloudflare's free plan; domain verification on GitHub against takeover | Setup, Pierre | **About US$10-12 a year** (needs IMR or Pierre, Q353) |
| 6 | **Photos on `photos.<domain>`**: the R2 custom domain (cached, no `r2.dev` rate limit); `PHOTO_BASE`, the CSP and the service worker's photo host. It can ship before the app moves | Setup + PR | Free |
| 7 | **The rename** as ROADMAP "Domain and repository rename" plans it: the hand-over release on the old origin first, then the app on the domain (3.1 B), `REPO` in `admin.js` and `Code.gs`, the self-update checked; a move of the repository to an organisation (question b) in the same window | PR series + setup | Free |
| 8 | **When previews are wanted**: the app on Cloudflare Workers static assets (3.1 C), a preview URL per branch, previews behind Access, the previews' sync on a demo backend | PR + setup | Free |
| 9 | **At the measured threshold (Q352)**: the answer log on D1 behind a Worker; Time Travel and the weekly export to R2 | PR series | Free (D1 free tier) |
| 10 | **The better sign-in step** of the roles row: B or C of 3.5 | PR series | Free (B), or $25 a month (C on Supabase Pro, needs IMR) |
| 11 | **ReefRecall's CI**: GitHub Actions for Android, Codemagic for iOS | Its own repository | Free CI; store fees its own |

Nothing in the path needs Workers Paid ($5 a month), Supabase Pro ($25 a month) or any other subscription at 4-8 RAs a
month. The triggers that would change that:
- D1's free daily row limits reached: the health check reports it, and on the free plan the queries stop rather than
  being billed;
- a shared backend with ReefRecall on Supabase without the pause;
- more than 50 staff behind Access.

## 5. The questions he does not think of

### Security
- **Whoever can push to `main` controls the sheet script.** It installs itself from `main` with Pierre's Google
  authorisation.
  - So the GitHub account's two-factor method is the key to every player's data: a passkey or a hardware key is better
    than an authenticator app, which is better than SMS.
  - The `main` ruleset and push protection are in place (docs/HANDOVER.md).
  - The photo workflow's push job is the one known gap (docs/SECURITY.md).
- **The shared origin.** Every Pages site of the account shares `ppericard.github.io`'s storage, the admin token's
  encrypted vault included. The own domain (step 7) isolates it for free.
- **The domain becomes a new asset to protect.** A domain that lapses can be registered by anyone, who would then serve
  their own page at the players' address. The protection is auto-renew, a card that does not expire unnoticed, and
  registration for several years once the name is settled.
- **The R2 subscription** needs Cloudflare's checkout even for the free tier (Cloudflare's R2 "get started" page).
  Whose card it is matters once anything is billed (Q353).

### Credentials and account recovery
The platform today rests on:
- **GitHub**: the repository owner; the admin's fine-grained token (90 days); the Analyses token (up to a year); the
  repository secrets (the R2 token, the Analyses token).
- **Google**: the sheet; the script and its secret salt; the Cloud project with its OAuth consent screen.
- **Cloudflare**: R2, and later DNS, the domain, D1 and Access.

Each needs:
- a two-factor method;
- recovery codes kept offline;
- an expiry date in a calendar.

None of these values belongs in the repository or a chat. A lost Google account takes the data and the sync with it;
consumer accounts can also be suspended by automated checks (a general fact of consumer accounts, not something
observed here).

### Bus factor
One person, Pierre, holds every account; the agents work through his. If he is unreachable for a month, nobody can:
- renew a token or the domain;
- unlock the sheet;
- pay a bill.

The free fix is a second person who can recover, not operate, plus a written break-glass note (question e). The
GitHub side:
- a free GitHub organisation allows a second owner;
- fine-grained tokens scoped to the organisation's repository, which a collaborator on a personal repository cannot get
  (ROADMAP "The app as a generic product licensed to organisations");
- moving the repository there costs nothing extra at the rename, since the Pages URL changes anyway.

### Data ownership with IMR
- The RAs are IMR's trainees. Their answers measure IMR's training, and part of the content is IMR's (the lecture).
- Yet the data lives in Pierre's personal Google Drive, under his personal account, and privacy.html names him.
- Unsettled today:
  - who decides about the data;
  - what IMR may ask for;
  - what happens to the app, the accounts and the data if Pierre leaves IMR;
  - who pays a future cost.
- The roles plan makes this sharper: trainers will see each answer of their cohort (Q344).

A one-page agreement settles it (question d).

### Privacy law: the basics, not legal advice
- **Philippine Data Privacy Act (RA 10173).** It applies to personal information about Philippine citizens or
  residents, even when processed from abroad (Section 6). It gives the data subject the rights to be informed, to
  access, to correct, to erasure or blocking, and to damages (Section 16). It asks for "reasonable and appropriate
  organizational, physical and technical measures" (Section 20), and for a person accountable for compliance
  (Section 21).
  - Already done: the app has a privacy notice, self-service deletion and no sensitive personal information.
  - Registration with the National Privacy Commission (NPC Circular 2022-04, as summarised by law firms; the official
    page could not be read) is mandatory from 250 employees, from 1,000 individuals' sensitive personal information, or
    for "automated decision-making or profiling".
  - The adaptive engine models each learner. Once trainers use that model to judge trainees, IMR's data protection
    officer should say whether it counts.
- **GDPR.** It applies to a controller outside the EU for "data subjects who are in the Union" when goods or services
  are offered to them (Article 3(2)).
  - Today's RAs use the app in the Philippines, so it does not apply today.
  - It would with the generic public instance open to people in Europe, or with an organisation in the EU.
- **Where the data is.** Google's and Cloudflare's servers are outside the Philippines. The Act keeps the controller
  accountable for the data in its custody (Section 21). Where D1 places a database was not read for this study; the D1
  PR checks it.

## 6. Already decided, and what would reopen it

| Decision | Reopened when |
|---|---|
| Q352: the answer log on D1 behind a Worker, Code.gs the API, at a measured threshold | The `Timings` tab shows saves too slow, or the trigger quota close to 90 minutes a day |
| Q353: no paid tier; a monthly cost settled with IMR | A step in section 4 needs money: only the domain does |
| Q343: one shared sheet now, one per organisation in the medium term | A second organisation |
| Q348: editors through a relay in the sheet script | Editors outside IMR, or a content repository |
| Q349: name + 4-digit code during the pilot | The roles row's "better sign-in" step |
| Previews later (Pierre, 2026-11-05) | Many players using the app every day |
| ReefRecall's shared backend later (Pierre, 2026-11-14) | His call when ReefRecall is rebuilt |

## 7. Sources

All read on 2026-11-14. "Read" means the official page was read for the figures quoted. Other statuses say what was
missing.

| Topic | URL | Status |
|---|---|---|
| Cloudflare Pages limits | <https://developers.cloudflare.com/pages/platform/limits/> | Read |
| Cloudflare Pages ("Start new projects with Workers") | <https://developers.cloudflare.com/pages/> | Read |
| Pages preview deployments, access policy | <https://developers.cloudflare.com/pages/configuration/preview-deployments/> | Read; whether the access policy is free is not stated there |
| Workers pricing (and D1, KV included usage) | <https://developers.cloudflare.com/workers/platform/pricing/> | Read |
| Workers limits | <https://developers.cloudflare.com/workers/platform/limits/> | Read |
| Workers Builds limits | <https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/> | Read |
| Migrating Pages to Workers (preview URLs) | <https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/> | Read |
| D1 pricing | <https://developers.cloudflare.com/d1/platform/pricing/> | Read |
| D1 limits | <https://developers.cloudflare.com/d1/platform/limits/> | Read |
| D1 Time Travel | <https://developers.cloudflare.com/d1/reference/time-travel/> | Read |
| R2 pricing | <https://developers.cloudflare.com/r2/pricing/> | Read |
| R2 public buckets, `r2.dev`, custom domains | <https://developers.cloudflare.com/r2/buckets/public-buckets/> | Read |
| R2 get started (subscription) | <https://developers.cloudflare.com/r2/get-started/> | Read; a payment method is not named, the checkout is |
| Cloudflare Registrar | <https://www.cloudflare.com/products/registrar/> | Read; **no prices on the page** |
| Domain prices (third party) | <https://costgoat.com/compare/domains/org>, <https://domaindetails.com/registrars/cheapest> | Found by search, not official; the `.com` figure is disputed |
| Zero Trust (Access) plans | <https://www.cloudflare.com/plans/sase-zero-trust.md> | Read ("Teams under 50 users"; $7 a user a month) |
| Cloudflare Web Analytics | <https://developers.cloudflare.com/web-analytics/about/> | Read |
| GitHub Pages limits | <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits> | Read |
| GitHub Pages custom domains | <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site> | Read; **a redirect from `github.io` to the custom domain is not stated** |
| Renaming a repository | <https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository> | Read |
| Transferring a repository | <https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository> | Read |
| GitHub Actions billing | <https://docs.github.com/en/billing/concepts/product-billing/github-actions> | Read |
| Downloading workflow artifacts | <https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts> | Read: "read access to the repository is required" |
| GitHub plans | <https://github.com/pricing> | Read |
| Apps Script quotas | <https://developers.google.com/apps-script/guides/services/quotas> | Read |
| Google Sheets size limits | <https://support.google.com/drive/answer/37603> | Read (20 million cells; docs/SECURITY.md says 10 million) |
| Google Workspace for Nonprofits | <https://www.google.com/nonprofits/offerings/workspace/>, <https://support.google.com/nonprofits/answer/3215869> | Read; the Philippines is listed; eligibility details not on the pages read |
| Google OAuth verification | <https://support.google.com/cloud/answer/13464321> | Read; **the exemptions for basic scopes are not on the page read** |
| Supabase pricing | <https://supabase.com/pricing> | Read |
| Supabase backups | <https://supabase.com/docs/guides/platform/backups> | Read |
| Supabase social login | <https://supabase.com/docs/guides/auth/social-login> | Read; Flutter not covered on that page |
| Firebase pricing | <https://firebase.google.com/pricing> | Read |
| Neon pricing | <https://neon.com/pricing> | Read |
| Netlify pricing | <https://www.netlify.com/pricing/> | Read; **the free plan's monthly reset and build minutes not stated** |
| Vercel pricing, fair use | <https://vercel.com/pricing>, <https://vercel.com/docs/limits/fair-use-guidelines> | Read; **a non-commercial rule for Hobby not stated on these pages** |
| Codemagic pricing | <https://codemagic.io/pricing/> | Read |
| Apple Developer fee and fee waivers | <https://developer.apple.com/help/account/membership/fee-waivers> | Read |
| Apple App Review Guidelines 4.8 | <https://developer.apple.com/app-store/review/guidelines/> | Read |
| Google Play registration | <https://support.google.com/googleplay/android-developer/answer/6112435> | Read |
| Google Play testing for personal accounts | <https://support.google.com/googleplay/android-developer/answer/14151465> | Read |
| Facebook Login | <https://developers.facebook.com/docs/facebook-login/overview> | Read |
| Sentry pricing | <https://sentry.io/pricing/> | Read |
| UptimeRobot pricing | <https://uptimerobot.com/pricing/> | Read |
| Philippine Data Privacy Act, official | <https://privacy.gov.ph/data-privacy-act/> | **Could not be read** (HTTP 403) |
| Data Privacy Act, text | <https://lawphil.net/statutes/repacts/ra2012/ra_10173_2012.html> | Read; an unofficial copy (Lawphil) |
| NPC Circular 2022-04 (registration), official | <https://privacy.gov.ph/wp-content/uploads/2023/05/Circular-2022-04.pdf> | **Could not be read** (HTTP 403); thresholds from law-firm summaries found by search, e.g. <https://insightplus.bakermckenzie.com/bm/data-technology/philippines-new-npc-circular-on-registration-of-data-protection-officers-and-data-processing-systems-takes-effect_1> |
| GDPR, official | <https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng> | **Could not be read** (the article text did not come through) |
| GDPR Article 3 | <https://gdpr-info.eu/art-3-gdpr/> | Read; an unofficial copy |

## Questions for Pierre

Only the choices that cost money or are costly to undo: who owns what, who can get in, what leaves the project. Each
has a recommendation; the integrator numbers them.

**(a) A domain for the rename.** About US$10-12 a year, the one cost in the whole path. It makes the rename the last
address change for players, and it takes the photos off Cloudflare's development address. Who pays: you, or IMR as Q353
says for a recurring cost? The name is already yours to choose.
*Recommendation*: yes, at Cloudflare Registrar (at cost, WHOIS hidden), auto-renew on; ask IMR to pay. If that takes
long, it is the one cost worth carrying before December.

**(b) Who owns the platform's accounts.** Options:
1. your personal GitHub, Google and Cloudflare accounts, as today;
2. a free GitHub organisation and a project e-mail address for Cloudflare, with you as owner;
3. accounts owned by IMR.

*Recommendation*: 2, set up at the rename. The repository moves into the organisation in the same window, since the
address changes then anyway. IMR can be added as a second owner later without moving anything again.

**(c) Where the sheet and its script live.** Options:
1. your personal Google account, with its quotas of 90 minutes of triggers a day and 20,000 URL fetches;
2. an IMR Google Workspace account, if IMR has one: 6 hours and 100,000, and IMR is the owner. Google Workspace for
   Nonprofits is free where IMR qualifies; the Philippines is listed.

*Recommendation*: ask IMR whether it has Workspace. Move only once (d) is settled; until then stay, with the backup of
(f) and the second person of (e).

**(d) An agreement with IMR on the players' data.** One page:
- IMR decides about its RAs' training data, and you run the app for it;
- the contact of IMR's data protection officer goes on privacy.html;
- what happens to the app, the accounts and the data if you leave IMR;
- who pays a future cost.

*Recommendation*: yes, before the trainer views of the roles plan ship, since they show each answer to a trainer.

**(e) A second person who can recover the platform.** Not daily access: recovery only, with a sealed break-glass note
(where the recovery codes are, how to renew the domain and the tokens).
*Recommendation*: one person at IMR, named by you.

**(f) A weekly backup of the answer log and the accounts, outside your Google account.** Into a private Cloudflare R2
bucket in the platform's account. Free within 10 GB. It means player data (names, answers) also sits at a second
provider, which privacy.html would say.
*Recommendation*: yes. Today a lost Google account loses every player's progress, and the answer log is what progress
is rebuilt from.

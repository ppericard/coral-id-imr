# Architecture

How the app is put together. Rules and workflow are in [`../AGENTS.md`](../AGENTS.md); deferred ideas in [`ROADMAP.md`](ROADMAP.md).

## Overview

```
data.json (genus data + photo lists) ──┐
forms.json / quality.json / picks.json ├─> app.js (applyCuration, applyForms, applySlots) ─> pages
curation.json (Pierre's choices) ──────┘                                    │
                                                                            └─> progress in localStorage ─> Apps Script ─> Google Sheet
admin.html ──(GitHub Contents API, Pierre's token)──> curation.json on main ──> GitHub Action fetches approved photos
```

- Static site served by GitHub Pages from `main` (root). No framework, no bundler, no npm.
- A service worker (`sw.js`) caches the app shell for offline use (versioned cache `V`, replaced on each deploy) and photos as they are viewed, in a separate cache `imr-photos-v1` that deploys never delete (capped at 2,500 entries, only good replies kept). `curation.json` is part of the shell, so the first offline launch after a deploy still has Pierre's choices; the app also keeps the last curation it read in `localStorage` (`imr-curation-last`) as a fallback. App files are revalidated with the server, but a file already cached is served after 4 s (`SLOW`) on a slow link while the network refreshes the cache in the background.
- Everything runs in the browser. The only backend is a Google Apps Script web app that stores RA progress in a Google Sheet.

## Front end

### Pages and routing (`app.js`)
Hash routing in `route()`. Sections and their tabs are declared once in `MODES`:

| Section | Hash | What |
|---|---|---|
| Home | (clean URL) | Two doors (`home.js`). |
| Learn | `#genera` | Genera grid (lecture-group order by default, slate order toggle), Photos or ID tips view. `#g-<Genus>` = genus sheet. |
| Learn | `#cmp` | Look-alikes: deck of ~20 classic pair montages (`classics()`, `montage()`); `#cmp-A|B` = pair comparison. |
| Practice | `#quiz` | Photo → genus, adaptive. |
| Practice | `#quiz-duel` | Look-alike duels. |
| Practice | `#pairs` | Memory (colony ↔ corallites), from `proto/pairs.js`. |
| Identify | `#finder` | Coral Finder (`proto/finder.js`): tolerant ranking by clues; state in the hash (`#finder|form=…;box=…`). |
| My progress | `#progress` | One screen: Photos / Slate / Groups views. |
| Tools (Lab) | `#lab`, `#lab-<id>` | Prototypes (`proto/lab.js` hub). Hidden on phones except via the header hammer icon. |

Old hashes (`#key`, `#k-…`, `#l-…`, `#key-imr`, `#tips`, `#quiz-course`) redirect to their current home.

Key shared helpers (search for them in `app.js`):
- `build()`: `structuredClone(RAW)` then `applyCuration()`, `applyForms()`, `applySlots()` into `DATA` (also for the extra genera `x`).
- `applyCuration()`: applies `curation.json` on top of `data.json` (cover, featured order, hide, move, add candidates, not-this-genus, exclude, crop, 2-level genera, book switch, `single`).
- `applySlots()`: photos per context into `g.sl[view]` (see "Photos per context" below); first 3 = featured. The admin mirrors it (`autoOrder`).
- `curRefresh()`: a tab left open re-reads `curation.json` when it comes back into view (if the last check is > 5 min old) and every 30 min while visible; a change is applied at the next screen (`route()`), never mid-game. Skipped with `?draft`.
- `pageHelp()`: moves intros into the "?" help box on every render (MutationObserver on `#view`).
- `shownGroup()`: places starred genera in the lecture group of their look-alikes (display only).
- `GX(n)`: genus lookup in both IMR genera (`DATA.gen`) and the 27 extra Dauin genera (`DATA.x.gen`: Coral Finder, their sheets, and the bonus genera in games).
- `MQ`, `isPhone()`, `isStacked()`, `tabH()`: the 3 size classes and phone tab bar height.
- `fitStage()`, `fitTiles()`: size games to one screen. On phone/tablet, with one row of photos, `fitStage` makes the quiz stage a 4:3 box at most, sized before the photos load (no layout shift); a photo close to the box shape fills it (class `.cov`, object-fit cover), others are shown whole; answers follow the photo. `fitTiles` honours `data-minw` (the phone progress wall: names stay readable, the wall may scroll).
- `IS_ADMIN`: true in Pierre's admin browser (token vault present); gates Pierre-only controls. ⚙ has a View: Admin | User switch.

### Settings (⚙, `index.html` + `app.js`)
Theme Light | Dark segmented switch (`imr-coral-theme`, light default) · Colour-blind On/Off (`imr-coral-cvd` → `:root[data-cvd]`, blue/orange instead of green/red; the right answer is also filled and the wrong one dashed, since dark blue is close to the accent) · Colours: Lagoon / Ocean / Seagrass / Twilight / Depth, swatches named under each (`imr-coral-palette` → `:root[data-palette]`, **Depth default**; the old `reef` value falls back to Depth) · View Admin | User (only in the browser holding the admin token). A small inline script in `index.html` applies theme, palette and cvd before first paint. The Coral Finder has its own switch for the 27 extra Dauin genera (`imr-finder-x`, on by default). Photo size S/M/L sits on each page. The "Photos from Dauin / PH / All" setting was removed in PR #230 (don't bring it back).

### Learning model (`app.js`)
- Per-genus state in `localStorage` `imr-coral-progress` (`P[genus]`: `ok`, `ko`, `h` recent results string, `L` BKT, `th` ability, `ps` photos seen `{f: [seen, right]}`, `ro` recent colonies, `cor`/`du` milestones).
- **Learned** = Bayesian Knowledge Tracing (`BKT`, `bktStep`, `knownP(n)`) ≥ 0.95 plus two milestones: once right with the corallites in view, once right in a look-alike duel (if the genus has look-alikes). Guess and slip depend on the photo's difficulty, so right answers on hard photos count most. **Review** = 2+ misses in the last 5 results. **No time criteria anywhere** (rule).
- A wrong answer is a failed observation for the genus shown **and** the genus given (rule).
- **Progress scale**: `genScore` = 0.75 × BKT progress towards 0.95 + 0.25 × milestones; `lvStep` = 6 steps (0 not seen, 1-4 quarters of `genScore`, 5 learned) coloured by the palette's learning-level ramp; tiles on My progress (Photos / Slate / Groups views) show a mini ring + %; review = red border and "!" (dashed in colour-blind mode). `progPct` drives the header ring.
- **Which genus next**: `weight()` favours unseen (10), review and unsure genera, learned 0.25, and holds back the last 4 genera asked.
- **Continuous difficulty** (Elo as in Pelánek 2016; PRs #197, #200): per-genus ability `P[n].th` on the photo-difficulty scale, updated by `abilityStep()` with P(right) = g + (1-g)·sigmoid(ability − difficulty), g = 1/choices, K shrinking with answers but ≥ 0.25 (`ELO`). `photoSet()` draws photos weighted around the target `ability − 1.0` (~80% right in a 4-choice question, `PICKD`), with a bonus for never-seen photos (IMR and Pierre's first), photos answered right twice down-weighted, the last colonies held back and ≥ 3 colonies in rotation (`VARIETY`).
- **One colony per question** (PR #207, rule 14b): photos are grouped by observation (`p.o`); a question shows the views of one colony only, never topped up from another. Beginners favour colonies shot at several zooms; `singleP()` raises the share of single-view questions (up to 85%) as ability rises; a single view counts as +0.5 harder (`SINGLE`). Other views show after the answer.
- **Bonus genera** (Pierre, 2026-11-01; `BONUS`, `BONUS_AT`, `bonusOpen()`, `isBonus()`): 6 extra Dauin genera (`DATA.x.gen`) join the photo quiz and the duels as the player progresses: Millepora, Isopora, Leptoseris, Heliopora, Sandalolitha, Pleuractis, in that order. Chosen as: 4+ Research Grade iNat observations within 40 km of Dauin, and a slate look-alike named by the Coral Finder (`look`/`lsrc`), or not a hard coral (Heliopora). The first unlocks at 10% slate progress (`progPct`), then one more per 5%; unlocked stays unlocked (`imr-coral-quiz` `Q.bu`; `Q.ba` = how many were announced in the quiz feedback). They are choices and distractors like slate genera (`distractors()` matches look-alikes both ways), duel with their slate look-alike, have their own `P[n]` (synced), and count as "wrongly given" (rule 13); they never count in the slate progress (`progPct`, the 39 tiles, the sync summary). My progress shows them after the slate genera in all three views (photo wall: tiles tagged "Bonus"; Slate: a strip under the slate; Groups: a "+" row), locked ones as ONE "+N bonus genera · next at X%" tile (designer re-review 2026-11-01). Each unlock opens an animated card once (`unlockShow()`: a "?" tile turns over to the cover photo, name and Coral Finder tips; no motion with `prefers-reduced-motion`). ID tips are labelled "ID tips (Coral Finder p. …)", never IMR. `#cmp-A|B` accepts bonus genera (with a slate genus or each other). A two-level bonus genus counts its `medium` photos as close-ups in games (Sandalolitha). Game photos: Research Grade only (`p.gid` = not Research Grade, set by `tools/apply_bonus.py`), Pierre's own always, never multi-coral. Memory (Lab `pairs`) does not use them.
- **Photo difficulty** `photoDiff()`: the sheet's photo Elo (`?stats=1`, all players, cached in `imr-photo-stats`) shrunk towards a prior from the photo's game set (Easy −1, Medium 0, Hard +1) when it has few answers. The admin "Without me" switch recomputes it without Pierre's answers for Stats only; the games still use everyone's.

### Lab prototypes (`proto/`)
`lab.js` holds the hub, `LAB.files`, `LAB_V` (cache version), `GRADUATED` (tools promoted into a section, currently `finder` and `pairs`) and `PLANNED` (target section of each prototype, shown on the learning path). One file per tool: `anatomy` (Corallite anatomy), `map` (mind map), `web` (look-alike web), `zoom`, `size`, `elim`, `matrix`, `spot`, `reveal` (Blur reveal), `gallery`, `pairs`, `finder`.

## Data files

### `data.json` (served source of truth)
- `gen{Genus}`: `n` slate number, `fam`, `ig` IMR lecture group, `imr` lecture cues (verbatim), `qt` short ID tips, `sum` short description, `mn` mnemonic, `crit` Coral Finder criteria, `tr` trait ids, `look` look-alikes + `lsrc` source per pair, `pages` CF pages, `sl`/`rsl` slide numbers, `info` dated "Other sources" notes, `check` points to check with a trainer, `levels` (2 or 3 views), `views{wide,medium,macro}` photo lists, `more` extra photos, `book` Coral Finder book crops, `cover`.
- Photo object: `f` file stem in `img/`, `a` attribution, `lic`, `o` original URL, `t` taxon, `own` (Pierre's), `loc` (dauin/ph/world), `src` remote URL when not downloaded (`r: 1`), `gid: 1` when the iNat observation is not Research Grade (candidates; bonus genera, kept out of games).
- `key` Coral Finder front-page key (growth form → boxes), `imrg` the 11 IMR lecture groups, `traits` corallite clues with sources, `terms` glossary `[term, definition, source]`, `tips` the lecture's observation questions, `course` lecture photos, `cmp` lecture comparison images, `cand{Genus}` candidate photos for the admin, `x` extra Dauin genera for the Coral Finder and the bonus genera (built by `tools/build_extra.py`; `tools/apply_bonus.py` re-checks Research Grade and moves multi-coral photos of the bonus genera to `more`).

### `curation.json` (Pierre-owned; never overwrite in a PR)
`genera{Genus}`: `cover`, `feat{view:[f]}`, `hide`, `move`, `add{f:view}`, `out` (not this genus), `ok` (validated), `lv` (2/3 levels); top level: `book: false` (Coral Finder book photos off site-wide; absent = on), `mont{"A|B":{v,a,b,hide}}` Look-alikes overrides (`v` may be `all`), `quality{f:1-3}`, `gf` growth forms, `exclude{f:reason}`, `flag`, `seen` (dismissed suggestions, reviewed candidates `cand:f`, players' reports marked Done `rep:id`), `use{f:'ref'|'game'}` (sheet only / games only), `single{f:1}` (photo wrongly marked "several corals"), `crop{f:[l,t,r,b]}`.

Written only by the admin's Publish, which merges key by key onto the latest published file (see Admin).

### Suggestion files (machine-written, Pierre confirms in admin)
- `forms.json`: `forms` (the 7 IMR growth form definitions, single source), `cf` (CF box → IMR forms), `gf` guesses, `gunsure`, legacy `form`.
- `quality.json`: automatic quality 3/2/1 from `tools/photo_quality.py`.
- `picks.json`: suggested featured photos.
- `dups.json`: near-duplicates from `tools/find_dups.py`.
- `suggest.json`: imported results of the outside judging agent (`tools/judging_import.py`).

Precedence: `curation.json` > suggestion files > `data.json` defaults.

## Photos per context (`applySlots`, `CAP`)

Per genus and view, from field photos + IMR lecture photos (`data.json` `course`), never multi-coral ones:
- **Order**: Pierre's pins (`feat`), then Claude's suggestions (`picks.json`), then IMR photos, Pierre's own, other observers, each by quality; Poor last (but an IMR photo is never auto-rated Poor).
- **Sheet**: the 3 featured + the next ones, 6 in all. Coral Finder book photos only when pinned, or after every field photo to fill a gap.
- **Games** (`easy`, `medium`, `hard`, levels adding up): field + IMR lecture photos, never book photos, never `use: 'ref'`; Poor photos go to Hard. `gamePics()` reads them.
- **Coral Finder** (`finder`): featured + 2 other-observer photos + up to 3 approved book photos (variety on purpose). Once a growth form is picked (Coral Finder box or IMR form), each genus card in Mix leads with a photo tagged with that form (`formCover()` in `proto/finder.js`: `formPhotos`/`imrFormPhotos`, IMR lecture first, then Pierre's own); the cover stays when it already shows the form, and a genus with no photo of that form keeps its cover (first-time RA review, 2026-11-01).

## Photos

- WebP, 1600 px long side + 480 px `img/<f>-s.webp`. ~2 300 files, ~185 MB. No Git LFS.
- Sources: IMR Lecture 6 deck (internal use at IMR only), Pierre's iNaturalist observations, other iNaturalist observers (open licences, Research Grade or genus-level community ID), Coral Finder 2022 book crops (copyright R. Kelley/BYOGUIDES, candidates only, never in games).
- New candidates are not stored: they are shown from iNaturalist until Pierre adds them. `.github/workflows/approved-photos.yml` runs on every `curation.json` push: `tools/fetch_approved.py` downloads added photos (applying Pierre's crop), `tools/fetch_local.py` refills candidate lists (caps per genus), then commits `data.json` + `img/`.
- `tools/excluded.py` makes every import skip excluded photos (by file name and iNat photo id).

## Admin back-office (`admin.html`)

For Pierre only (not linked except from ⚙ for token holders). Modes by hash: genus pages (default), `#~cand` Candidates swiper (default on phones), `#~triage` (players' reports with who sent them, flags, suggestions, duplicates), `#~form` growth forms, `#~quality`, `#~excluded`, `#~look` Look-alikes (`#~mont` = old address), `#~stats` with sub-views Players `#~stats`, Photos `#~stats-photos`, Photo list `#~diff` (`STAT_TABS`), and the to-do tab **Needs** with Where to look `#~stats-needs`, Game coverage `#~cov`, Sheet & Finder coverage `#~fcov` (`NEED_TABS`; split out of Stats on 2026-11-01). The "?" help has two tabs: this page, and **Start here** (`HELP.start`: workflow, what reaches the site, what is permanent, who to ask), shown first until a browser has opened it once. Publish commit messages end with `(by <GitHub login>)`. Publish first shows a summary (`pubSummary()`: counts per kind of change, genera touched) and asks to confirm; "Validate N" (Forms) and the CF book switch ask too. `?readonly` keeps no draft (clicks live in the tab only). Excluded photos gone from `data.json` show an iNat thumbnail from the photo id in their name. Choices naming a missing photo can be dropped per genus with "Forget them" (one Undo step); excluded photos never count as missing.

- Every click is a local draft (`imr-curation-draft`, with its base `imr-curation-base`; Undo/Redo, Ctrl+Z). The Undo steps (last 60) are kept in `sessionStorage` `imr-admin-undo` with the draft they lead to, so they survive a reload of the tab (re-based like the draft) and are dropped if another tab changed the draft. **Publish** commits `curation.json` to `main` through the GitHub Contents API with a fine-grained token (this repo only, Contents read/write), stored encrypted in the browser with the admin password (`imr-admin-vault`). Once unlocked, the plain token is kept only in `sessionStorage` (this tab, until the browser closes), never in `localStorage`; the token link asks for a 90-day expiry. Publish re-reads `curation.json` (never from the HTTP cache), merges with `merge3`, retries once by itself on a 409, and names in its toast any published choice the draft replaced. `admin.html?readonly` works without a token (download JSON); the lock screen links to it. Collaborators who cannot scope a fine-grained token to this personal repo are pointed to a classic token (`repo` scope). `index.html?draft` previews unpublished choices.
- **Key-by-key merge** (PR #240): Publish first re-reads the published file; if it changed, `rebase()` applies `merge3(base, draft, published)`: a key Pierre changed since the base keeps his value, every other key takes the published one; objects merge recursively, lists and plain values are single choices (same key changed on both sides: the draft wins). The draft is also merged onto the published file on page load. Old drafts without a base go through `mergeOld()` (adds, never removes). Never go back to publishing a whole copy.
- **Look-alikes** (`renderMont`): one row per classic pair (same list and automatic pick as `app.js` `classics()` / `montage()`). Per pair: View Colony / Close-up / Corallites / **All** (photos of every zoom, the automatic pick prefers the nearest zooms), **Auto | Manual** (clicking a photo makes it Manual; Auto drops his view and photo picks but keeps a hide), **Shown | Hidden** (Hidden keeps the comparison off the public Look-alikes page until good examples exist). Stored in `curation.json` `mont`.
- Genus status: `needs()` lists what is missing (3 featured per view, non-macro cover…); ✓ Validated is Pierre's button.
- Needs (PR #198): per genus × view, why the game pool falls short (few colonies, few good ones, too easy for players' level, repeated photos, mix-ups), ranked.
- **Game coverage** `#~cov` (`renderCov`, `covOf`, `gamePool`): game-usable photos per genus × view (field + IMR lecture photos; no book, multi-coral, hidden or sheet-only photos; Poor ones count), coloured by distinct colonies (0 / 1-2 / 3-4 / 5-7 / 8+), with an "excl." line and tooltip listing what was left out and why. `covOf` is shared with the Candidates swiper.
- **Sheet & Finder coverage** `#~fcov` (`renderFcov`): what sheets and the Coral Finder can draw from, IMR genera plus the extra Dauin genera; every photo not hidden or multi-coral, approved book photos included; colour = distinct colonies with a non-Poor photo; plus growth forms and species seen.
- Both coverage views sort Thinnest / Thickest / A-Z, or by a view column (click again to reverse).
- **"Without me"** (Photos, Photo list, Needs): drops this browser's own answers (`MEID` = the anonymous id the sheet derives from the signed-in sync name) and replays the Elo in the browser (`eloOf()`, a copy of `stats_` in `Code.gs`: keep them in step). Nothing is stored or reset.

## Progress sync (Google Sheet)

- `app.js` `SYNC_URL` points to an Apps Script web app; code in [`tools/sync/Code.gs`](../tools/sync/Code.gs). RAs sign in on My progress with a name + 4-digit code (no Google account; the code only prevents accidental overwrites).
- Sheet "IMR Coral ID – RA progress" (Pierre's Drive). Tabs: `RAs` (one row per RA; hidden code hash + data JSON; **column layout is positional, never change it, add tabs instead**), `By genus`, `Answers` (one row per answer), `Activity` (QUERY per RA), `Reports` (v7/v8: one row per report or feedback: time, reporter, verified, reason, expected, answered, suggested genus, note, mode (game, photo, sheet or page), photos, where (v8), id), `Progress data` (v6: name, revision, progress JSON in 45,000-character chunks, because a cell holds at most 50,000; `RAs` column H keeps the JSON when it fits, else `@Progress data`).
- Devices on one account: every change triggers pull, three-way merge (against `SYNC.base`), then send. The app also pulls and merges (no write) on start-up, when it comes back to the screen (30 s throttle) and when back online, so progress made on another device shows up without answering a question first. Since v6 each send carries `at`, the sheet revision it merged against; if another device wrote in between, the sheet answers `stale` (answers still logged) and the app pulls, merges and sends again (at most twice).
- Endpoints: `POST` progress + answer log; `GET ?name=&pin=` load (reply carries `v`, the script version); `GET ?stats=1` photo Elo; `GET ?answers=1` anonymous answers for admin Stats (v6: with `&name=&pin=` the reply's `me` is the caller's own anonymous id; the salt is secret, in Script Properties `ANON_SALT`). `POST {reports, rname, rpin}` (v7) players' reports, logged once per id; the reporter goes in `rname`/`rpin`, never `name`/`pin`, so an older script refuses it (`input`) instead of taking it for an empty progress write; `Verified` = 1 when the code matches the sync account. `POST {readReports: 1, token}` (v8) the reports with names, newest first, for admins only: the script checks the admin page's GitHub token with GitHub (`UrlFetchApp`, write access to the repo), remembers a valid one 10 minutes by its hash, never stores it. Redeploying v8 asks Pierre once for the "connect to an external service" permission. Hardening (v6): user strings never become formulas (`safe_`), answer fields are pattern-checked, 5 wrong codes for a name block it for 10 minutes (`wait`), answers are logged before the progress write.
- **Versioning**: bump `VERSION` (header comment + constant) on every change. Agents cannot deploy: Pierre copies <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/Code.gs> into Extensions > Apps Script, then Deploy > Manage deployments > Edit > New version (same URL).
- `Answers` columns: Name, Time, Genus shown, Answered, Right, Mode, Photos (space-separated file stems), Id, Expected, Ability, New photos.
- Version history: v2 Answers/Activity tabs; v3 `?stats=1` photo difficulty; v4 `?answers=1` anonymous ids (PR #195); v5 answers carry expected success, ability, new photos, single-view answers count +0.5 harder (PRs #197, #201). v6 progress of any size, stale-write check, input hardening, PIN throttle, secret anonymous-id salt (code review, 2026-11-01). v7 players' reports (`Reports` tab). v8 reports readable by every admin (GitHub token check). **v5 is deployed and verified (2026-11-01); v8 (includes v6 and v7) redeploy pending.** The app and admin work with v5 to v8; reports wait in the player's browser until v7 or later is live, and admin Triage needs v8 to read them. Every reply carries `v`, so the app and admin can tell which script is live.
- The app keeps unsent answers (max 2,000) until the server confirms `log: true`.
- Tests: `node --test tests/*.test.js` runs `tools/sync/Code.gs` against an in-memory sheet (`tests/gas.js`), and checks `core.js` (`merge3`, `mergeProgress`, and `eloOf` against `stats_`).

## Security model

What is public, what protects what (code review, 2026-11-01).
- **Everything in the repo is public**, including the admin page code and the sync URL. The admin password only unlocks the token stored in that browser; it protects nothing on its own.
- **The GitHub token is the real key**: fine-grained, this repo only, Contents read/write, 90-day expiry. Kept encrypted in `localStorage` (`imr-admin-vault`); the unlocked token lives in `sessionStorage` only. `ppericard.github.io` is shared by every Pages site of the account, so never add third-party scripts: the CSP (`<meta http-equiv="Content-Security-Policy">` in `index.html` and `admin.html`) allows scripts from this site only, inline scripts by hash (`tests/csp.test.js` fails if a hash is stale). Add a host to `img-src` / `connect-src` there when a new external source is needed.
- **Templates**: every data string goes through `esc()` (escapes `& < > " '`); links from data go through `safeUrl()` (https only).
- **Sync sheet**: anyone can call the Apps Script URL. A name + 4-digit code only prevents accidental overwrites; v6 throttles wrong codes, never writes a user string as a formula, and keeps anonymous ids unguessable (secret salt). RA data is low-sensitivity (first names and quiz answers).
- **GitHub Action** (`approved-photos.yml`, `contents: write`): downloads photos only from iNaturalist hosts (`tools/fetch_approved.py` `HOSTS`).

## Tools (`tools/`)

Python 3 scripts, run from the repo root. Many were one-off steps of the original build and read a scratchpad that no longer exists (`make_site.py`, `build_photos.py`, `apply_levels.py`, `build_lecture_more.py`, `coral_finder_book/*`): they now live in `tools/archive/` (kept for reference, cannot be re-run); edit `data.json` directly instead.

Still useful / re-runnable:
| Script | Purpose |
|---|---|
| `fetch_approved.py`, `fetch_local.py` | Candidate download/refill (run by the GitHub Action; `fetch_local.py <Genus…>` to limit). |
| `photo_quality.py` | Automatic quality → `quality.json`. |
| `find_dups.py` | Near-duplicates → `dups.json` (re-run after adding photos). |
| `tag_origin.py` | `loc` tag (dauin/ph/world) on iNat photos. |
| `judging_manifest.py`, `judging_import.py` | Outside photo-judging agent package (`judging/`); `--check` validates. |
| `apply_id_tips.py` | `tools/id_tips.txt` → `gen[g].qt`. |
| `apply_imr_forms.py` | IMR growth form definitions into `forms.json`. |
| `build_extra.py` | Extra Dauin genera for the Coral Finder (`data.json` `x`). |
| `apply_bonus.py` | Bonus genera in games: marks photos of non-Research-Grade observations `gid: 1` (asks iNat) and moves their multi-coral photos to `more`. Keep its `BONUS` list equal to `app.js`; re-run after `build_extra.py`. |
| `apply_covers.py`, `apply_look_sources.py`, `apply_sources.py`, `apply_review_slides.py`, `apply_cmp.py`, `apply_multi.py` | One-time content passes, idempotent; document how fields were built. |
| `excluded.py` | Shared helper: excluded photos. |

## Reference material (outside the repo)

- IMR Lecture 6 (2026_L6_CoralID.pptx) and a Google Slides copy, plus the Coral Finder 2022 PDF, are on Pierre's Google Drive (IMR folder). Slide text and presenter notes were extracted into `data.json` (`imr`, `mn`, `sl`).
- Pierre's iNaturalist: user `ppericard`, coral taxon 47532.

## Run and deploy

- Run: `python3 -m http.server 8000` at the repo root, open <http://localhost:8000> (`admin.html` for the back-office; without a token use `admin.html?readonly`). Sync and photo Elo talk to the live Apps Script even locally.
- Deploy: GitHub Pages from `main` (root, `.nojekyll`); a merge to `main` is live within a minute or two. The service worker serves the cached shell, so bump the `?v=` numbers and `sw.js` `V` (see AGENTS.md) or users keep the old files. `curation.json` is always fetched with `no-cache`.
- Pierre's Publish triggers `.github/workflows/approved-photos.yml`, which commits to `main` on its own.

## Players' reports (2026-11-01)

In every game (Photo → genus, Look-alike duels, Memory, Reveal), once the answer is out, the feedback shows a discreet "⚑ Report a problem" (`repBtn()` in `app.js`; Lab games call it if present). It opens a small dialog (`reportDialog()`): Wrong answer (with a "Right genus, if you know" field, suggestions from the 39 genera), Several corals, Bad photo, Other, an optional note, and "Your name" when the player is not signed in to the sync. A report carries the photos of the question (one observation), the expected genus, the answer given and the game. Reports queue in `localStorage` `imr-reports` and are sent by `sendReports()` (on send, start-up and when back online) to `Code.gs` v7; an older script leaves them queued. Admin Triage (script v8) lists them first ("Reported by players", `renderTriage` `repCard`), with the reporter's name (a `?` after it = not verified by a sync code), each photo with every tool of its genus page, and ✓ Done per report (`seen['rep:id']`). Since v8 the same dialog also opens from "⚑ Report" in the caption of any enlarged photo (lightbox, not while a game hides the genus; reasons Wrong genus, Several corals, Bad photo, Other), "⚑ Report a problem with this sheet" at the bottom of a genus sheet (Wrong information, Bad photo, Other) and "Send feedback" in the footer of every page (Wrong information, Bug, Suggestion, Other); `REP_WHY[kind]`, and every report carries the page it came from (`w`, sheet column `Where`). Nothing is ever changed automatically from a report. Pierre's own ⚑ flag (`flag.js`) is separate and stays admin-only.

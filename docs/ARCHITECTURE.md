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
- A service worker (`sw.js`) caches the app shell for offline use; photos are lazy-loaded.
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
- `applyCuration()`: applies `curation.json` on top of `data.json` (cover, featured order, hide, move, add candidates, not-this-genus, exclude, crop, 2-level genera).
- `applySlots()`: orders each view's photos (Pierre's picks, then IMR, Pierre, others by quality) into `g.sl[view]`; first 3 = featured. The admin mirrors it (`autoOrder`).
- `pageHelp()`: moves intros into the "?" help box on every render (MutationObserver on `#view`).
- `shownGroup()`: places starred genera in the lecture group of their look-alikes (display only).
- `GX(n)`: genus lookup in both IMR genera (`DATA.gen`) and the 27 extra Dauin genera (`DATA.x.gen`, Coral Finder only).
- `MQ`, `isPhone()`, `isStacked()`, `tabH()`: the 3 size classes and phone tab bar height.
- `fitStage()`, `fitTiles()`: size games to one screen.
- `IS_ADMIN`: true in Pierre's admin browser (token vault present); gates Pierre-only controls. ⚙ has a View: Admin | User switch.

### Learning model (`app.js`)
- Per-genus state in `localStorage` `imr-coral` (`P[genus]`).
- **Learned** = Bayesian Knowledge Tracing probability `knownP(n)` ≥ 0.95 plus corallite and duel milestones; guess/slip depend on photo difficulty (`photoDiff`). `genScore` = 0.75 × BKT progress + 0.25 × milestones (header ring, My progress).
- A wrong answer is a failed observation for the genus shown **and** the genus given.
- **Continuous difficulty** (PR #197): per-genus ability `P[n].th` on the photo-Elo scale; photos drawn by weight around a target difficulty (~80% expected success, `PICKD`, `ELO` constants, `photoSet()`, `abilityStep()`), with a novelty bonus, memorised photos down-weighted, recent colonies held back and ≥ 3 colonies in rotation.
- Photo Elo comes from all players' answers via the sync script (`?stats=1`), cached locally.
- No time-based criteria anywhere (rule).

### Lab prototypes (`proto/`)
`lab.js` holds the hub, `LAB.files`, `LAB_V` (cache version), `GRADUATED` (tools promoted into a section, currently `finder` and `pairs`) and `PLANNED` (target section of each prototype, shown on the learning path). One file per tool: `anatomy` (Corallite anatomy), `map` (mind map), `web` (look-alike web), `zoom`, `size`, `elim`, `matrix`, `spot`, `reveal` (Blur reveal), `gallery`, `pairs`, `finder`.

## Data files

### `data.json` (served source of truth)
- `gen{Genus}`: `n` slate number, `fam`, `ig` IMR lecture group, `imr` lecture cues (verbatim), `qt` short ID tips, `sum` short description, `mn` mnemonic, `crit` Coral Finder criteria, `tr` trait ids, `look` look-alikes + `lsrc` source per pair, `pages` CF pages, `sl`/`rsl` slide numbers, `info` dated "Other sources" notes, `check` points to check with a trainer, `levels` (2 or 3 views), `views{wide,medium,macro}` photo lists, `more` extra photos, `book` Coral Finder book crops, `cover`.
- Photo object: `f` file stem in `img/`, `a` attribution, `lic`, `o` original URL, `t` taxon, `own` (Pierre's), `loc` (dauin/ph/world), `src` remote URL when not downloaded (`r: 1`).
- `key` Coral Finder front-page key (growth form → boxes), `imrg` the 11 IMR lecture groups, `traits` corallite clues with sources, `terms` glossary `[term, definition, source]`, `tips` the lecture's observation questions, `course` lecture photos, `cmp` lecture comparison images, `cand{Genus}` candidate photos for the admin, `x` extra Dauin genera for the Coral Finder (built by `tools/build_extra.py`).

### `curation.json` (Pierre-owned; never overwrite in a PR)
`genera{Genus}`: `cover`, `feat{view:[f]}`, `hide`, `move`, `add{f:view}`, `out` (not this genus), `ok` (validated), `lv` (2/3 levels); top level: `mont{"A|B":{v,a,b}}` look-alike montage overrides, `quality{f:1-3}`, `gf` growth forms, `exclude{f:reason}`, `flag`, `seen` (dismissed suggestions, reviewed candidates `cand:f`), `use`, `crop{f:[l,t,r,b]}`.

### Suggestion files (machine-written, Pierre confirms in admin)
- `forms.json`: `forms` (the 7 IMR growth form definitions, single source), `cf` (CF box → IMR forms), `gf` guesses, `gunsure`, legacy `form`.
- `quality.json`: automatic quality 3/2/1 from `tools/photo_quality.py`.
- `picks.json`: suggested featured photos.
- `dups.json`: near-duplicates from `tools/find_dups.py`.
- `suggest.json`: imported results of the outside judging agent (`tools/judging_import.py`).

Precedence: `curation.json` > suggestion files > `data.json` defaults.

## Photos

- WebP, 1600 px long side + 480 px `img/<f>-s.webp`. ~2 300 files, ~185 MB. No Git LFS.
- Sources: IMR Lecture 6 deck (internal use at IMR only), Pierre's iNaturalist observations, other iNaturalist observers (open licences, Research Grade or genus-level community ID), Coral Finder 2022 book crops (copyright R. Kelley/BYOGUIDES, candidates only, never in games).
- New candidates are not stored: they are shown from iNaturalist until Pierre adds them. `.github/workflows/approved-photos.yml` runs on every `curation.json` push: `tools/fetch_approved.py` downloads added photos (applying Pierre's crop), `tools/fetch_local.py` refills candidate lists (caps per genus), then commits `data.json` + `img/`.
- `tools/excluded.py` makes every import skip excluded photos (by file name and iNat photo id).

## Admin back-office (`admin.html`)

For Pierre only (not linked except from ⚙ for token holders). Modes by hash: genus pages (default), `#~cand` Candidates swiper (default on phones), `#~triage` (flags, suggestions, duplicates), `#~form` growth forms, `#~quality`, `#~excluded`, `#~mont` look-alike montages, `#~stats` (Players / Photos / Photo list / Coverage; `#~cov`, `#~diff` are sub-views).

- Every click is a local draft (Undo/Redo, Ctrl+Z). **Publish** commits `curation.json` to `main` through the GitHub Contents API with a fine-grained token (this repo only, Contents read/write), stored encrypted in the browser with the admin password. `admin.html?readonly` works without a token (download JSON). `index.html?draft` previews unpublished choices.
- Genus status: `needs()` lists what is missing (3 featured per view, non-macro cover…); ✓ Validated is Pierre's button.
- Coverage (`renderCov`, `covOf`, `gamePool`): game-usable photos per genus × view, coloured by distinct colonies (0 / 1-2 / 3-4 / 5-7 / 8+).

## Progress sync (Google Sheet)

- `app.js` `SYNC_URL` points to an Apps Script web app; code in [`tools/sync/Code.gs`](../tools/sync/Code.gs). RAs sign in on My progress with a name + 4-digit code (no Google account; the code only prevents accidental overwrites).
- Sheet "IMR Coral ID – RA progress" (Pierre's Drive). Tabs: `RAs` (one row per RA; hidden code hash + data JSON; **column layout is positional, never change it, add tabs instead**), `By genus`, `Answers` (one row per answer), `Activity` (QUERY per RA).
- Endpoints: `POST` progress + answer log; `GET ?name=&pin=` load (reply carries `v`, the script version); `GET ?stats=1` photo Elo; `GET ?answers=1` anonymous answers for admin Stats.
- **Versioning**: bump `VERSION` (header comment + constant) on every change. Agents cannot deploy: Pierre copies <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/Code.gs> into Extensions > Apps Script, then Deploy > Manage deployments > Edit > New version (same URL).
- Version history: v2 Answers/Activity tabs (deployed 2026-10-31); v3 `?stats=1` photo difficulty (deployed); v4 `?answers=1` anonymous ids (PR #195); v5 answers carry expected success, ability, new photos (PR #197). **v4/v5 redeploy pending as of 2026-11-01** (see ROADMAP).
- The app keeps unsent answers (max 500) until the server confirms `log: true`.

## Tools (`tools/`)

Python 3 scripts, run from the repo root. Many were one-off steps of the original build and read a scratchpad that no longer exists (`make_site.py`, `build_photos.py`, `apply_levels.py`, `build_lecture_more.py`, `tools/coral_finder_book/*`): kept for reference, edit `data.json` directly instead.

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
| `apply_covers.py`, `apply_look_sources.py`, `apply_sources.py`, `apply_review_slides.py`, `apply_cmp.py`, `apply_multi.py` | One-time content passes, idempotent; document how fields were built. |
| `excluded.py` | Shared helper: excluded photos. |

## Reference material (outside the repo)

- IMR Lecture 6 (2026_L6_CoralID.pptx) and a Google Slides copy, plus the Coral Finder 2022 PDF, are on Pierre's Google Drive (IMR folder). Slide text and presenter notes were extracted into `data.json` (`imr`, `mn`, `sl`).
- Pierre's iNaturalist: user `ppericard`, coral taxon 47532.
- Deploy: GitHub Pages from `main`; a merge to `main` is live within a minute or two (the service worker updates on the next visit).

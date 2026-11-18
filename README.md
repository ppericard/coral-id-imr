# IMR Reef ID

A free identification trainer for the Research Assistants (RAs) of the Institute for Marine Research (IMR) in Dauin,
Philippines, and for anyone learning reef identification. It teaches **corals** (the genera of IMR's survey slate),
**reef fish** and, in beta, **sea slugs**, with real photos and a quiz that adapts to each player. Most players are on
phones, often on a slow line.

**Live: <https://ppericard.github.io/coral-id-imr/>** (no account needed).

## What it does

- **Subjects.** Corals, fish, sea slugs (beta). One engine teaches all three; each keeps its own progress.
- **Quiz.** Practice that adapts to you: it picks the next photo and the answer choices from your answers, and opens new
  things as you master the old. Questions come as photo to name (choices, or typed), "Again: A or B?", look-alike
  duels and, for fish, "Find the X" (name to photos). A silent exam decides when something is learned. No level selector.
- **Learn.** Corals: Coral basics, the Genera page, a sheet per genus (three photo views, IMR lecture notes,
  look-alikes), Look-alikes; fish and sea slugs: a list and a sheet for each unit, from family down. Corals also have a custom quiz,
  look-alike duels and a memory game.
- **Identify.** The Coral ID Key: tap the clues you see, get a ranked shortlist. (A fish key is not built yet.)
- **Live mode.** A trainer and a class answer the same photo questions together (`#live`).
- **Progress and boards.** My progress per unit, achievements, a leaderboard per subject, and staff and cohort boards.
  Signing in (a name and a 4-digit code) saves progress across devices; leaderboards can be switched off.
- **Offline.** A service worker keeps the app and the photos you viewed; it installs to a home screen.
- **Admin** (`admin.html`, Pierre only): photo curation, content, players, reports, analyses. `admin.html?demo` shows it
  on made-up data.

## How it is built

```
phone / browser  ── static site on GitHub Pages (plain HTML, CSS, JS; scripts minified at deploy)
   │   ├── photos ──────────────> Cloudflare R2 (falls back to the photo's online original)
   │   └── answers, progress ───> Google Apps Script (tools/sync/Code.gs) ──> Google Sheet
admin.html ── Pierre's choices ──> curation.json on main ──> GitHub Actions fetch the approved photos
```

No framework, no package manager, no build step while developing: the repository's files are what a local server
shows. The deploy (`pages.yml`) stamps version numbers and minifies the staged copy. Content is JSON (`data.json` for
corals, `fish.json` and `seaslug.json` with their photo files). The Apps Script updates itself from `main`.
Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PAGES.md](docs/PAGES.md).

## Run it locally

```sh
python3 -m http.server 8000     # app: http://localhost:8000   admin on made-up data: http://localhost:8000/admin.html?demo
```

A local copy reads the live photos (R2) and the read-only photo statistics, but never signs in, saves or sends answers:
`app.js` `LOCAL` turns the sheet off (the error "local copy: the sheet is off"), so tests answer it with `window.SHEET_STUB`.

## Test

CI ([checks.yml](.github/workflows/checks.yml), [smokes.yml](.github/workflows/smokes.yml); Node 26, Python 3.15,
Playwright 1.65.1; no `package.json`) runs what you can run by hand:

```sh
node tests/run.js                 # all unit tests (tests/*.test.js), through the machine slot
node tests/pages.smoke.js         # Playwright smokes, one file each: pages, draw, fish, seaslug, admin, live, net, profiles, staged
python3 tools/check_versions.py   # also: tools/datajson.py --check, tools/sync_core.py --check
npx --yes prettier@3.10.1 --check "*.js" "*.css" "proto/*.js" "proto/*.css" "tests/*.js"
```

Every heavy run (a Playwright smoke, a full unit run) first takes a slot from `tests/slot.js`, so several agents can share
one machine; wrap any other heavy command as `node tests/slot.js -- <command>`. A docs-only PR skips the smokes.

## How the project is worked on

Pierre Pericard owns it and works with AI coding agents. One **integrator** (the main agent of a session) starts
subagents, each on its own branch and PR, and merges them through a green **merge train** (`tools/train.py`) under a
written contract. Pierre's standing rules have stable IDs. Start with [AGENTS.md](AGENTS.md) (the constitution), then
[docs/INTEGRATOR.md](docs/INTEGRATOR.md) for the integrator, and the [docs/rules/](docs/rules/README.md) file your task
touches. Where things stand: [docs/STATUS.md](docs/STATUS.md).

## Documentation map

| Document | What it is |
|---|---|
| [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md) | The constitution (Rule 0, the merge contract, the index of rules); the entry point for Claude Code |
| [docs/rules/](docs/rules/README.md) | Pierre's standing rules, one file per theme |
| [docs/STATUS.md](docs/STATUS.md) | Where things stand now (the integrator's only) |
| [docs/INTEGRATOR.md](docs/INTEGRATOR.md), [docs/HANDOVER.md](docs/HANDOVER.md) | Running the work day to day; where things are and what lives outside GitHub |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Files, data, admin, sync, photos, deploy |
| [docs/LEARNING.md](docs/LEARNING.md) | The learning model and the research behind it |
| [docs/FISH_PATH.md](docs/FISH_PATH.md), [docs/FORMATS.md](docs/FORMATS.md) | The fish naming path; question formats and why |
| [docs/DESIGN.md](docs/DESIGN.md) | Design tokens and components |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Ideas not built yet, open questions, declined ideas |
| [docs/PAGES.md](docs/PAGES.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/BACKUP.md](docs/BACKUP.md) | Deploy and recovery; what is exposed and protected; the sheet's backup |
| [docs/reviews/](docs/reviews/README.md), [docs/reference/](docs/reference/), [docs/archive/](docs/archive/) | Dated studies and reviews, literature notes, frozen history |
| [judging/](judging/BRIEF.md) | Briefs for an outside agent that judges photos |
| [privacy.html](privacy.html) | The privacy notice players see |

## Content and rights

**Code and compiled data.** © 2026 Pierre Pericard, all rights reserved for now ([LICENSE](LICENSE)). No open-source licence is
granted; the repository is public so the app can be served and its source read. Much of the code was written with AI
coding assistants under his direction.

**Photos.** Every photo keeps its author and licence, shown in the app (enlarge a photo, and About and credits) and
recorded in the data files (`a` credit, `lic` licence, `o` source page).
- **Pierre Pericard's own photos** (iNaturalist user `ppericard`): © Pierre Pericard.
- **Other iNaturalist observers**: © their authors, under the licence each chose: CC0, CC BY or CC BY-NC. No share-alike
  or no-derivatives photos are used. Some photos are cropped.
- **FishBase** (fish): © their authors, CC BY-NC 4.0 as FishBase states it.
- **IMR Lecture 6 photos** (corals): used for IMR's internal training; their rights are uncertain, as many were not taken
  by IMR. Some come from [Corals of the World](https://www.coralsoftheworld.org/), credited to their photographers under
  its [terms](https://www.coralsoftheworld.org/page/terms-of-use/) (personal, non-commercial or academic use with
  citation; all other rights reserved). Not for reuse. Fish and sea slugs use no IMR lecture photos.
- **Coral Finder 2022** (© Russell Kelley / BYOGUIDES): no photo of the book is used. It stays a cited source (its pages,
  criteria and look-alikes); the Coral ID Key's boxes are our own drawings.

**Text and data.** The coral genus list, ID tips and lecture notes come from IMR Lecture 6; the fish cues, look-alikes
and IMR names from IMR's fish presentation and reference list (© IMR, used in the app for IMR's training, not for
reuse). The fish families follow *Reef Fish Identification: Tropical Pacific* (Allen, Steene, Humann and DeLoach).
Taxonomy follows the World Register of Marine Species (WoRMS). Size and depth facts come from Reef Life Survey and
FishBase, cited per species. Fonts: Source Sans 3 and Barlow Condensed (SIL Open Font License).

**Reuse.** Nothing here is offered for reuse. A Creative Commons photo can be reused under its own licence from its
original source, not from this repository. Rights holders: open an issue to change a credit or have a photo removed.

*This notice is not legal advice.*

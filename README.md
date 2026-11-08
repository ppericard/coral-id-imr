# IMR Reef ID

A web app that teaches the **coral genera and reef fish of Dauin, Philippines** to the Research Assistants (RAs) of the
Institute for Marine Research (IMR), who label survey photos in ReefCloud (corals) and survey videos in EventMeasure
(fish). Live: <https://ppericard.github.io/coral-id-imr/>. Alpha; fish in beta, open to every player since 2026-11-06.

**Players**: just open the live site. **Developers and AI agents**: read [AGENTS.md](AGENTS.md) first (the rules, who
merges, how a change ships), then [docs/HANDOVER.md](docs/HANDOVER.md).

## What's inside

One path for both subjects (corals, fish), switched at the top of Home:

- **Learn**: corals: Coral basics, the Genera page, a sheet per genus (three photo views, IMR lecture notes, look-alikes),
  Look-alikes; fish: the families, a sheet per family, genus and species.
- **Practice**: an adaptive photo quiz with typed answers slipped in; corals also Custom quiz, Look-alike duels, Memory.
- **Identify**: the Coral ID Key (tap the clues you see, get a ranked shortlist); the Fish ID Key is coming.
- **Progress**: My progress per unit, the public leaderboard (🏆, one per subject, opt-out) and achievements.
- **Admin** (`admin.html`, Pierre only): photo curation, players, reports, analyses, for every subject.

## How it works

Plain HTML, CSS and JavaScript: no build step, no package manager. The content is JSON (`data.json` for corals,
`fish.json` and its photo files for fish). Photos are served from Cloudflare R2 (`core.js` `PHOTO_BASE`); when R2 fails,
a photo falls back to its online original (iNaturalist, FishBase) or to `img/`. A service worker (`sw.js`) keeps the app
working offline. Signed-in progress syncs to a Google Sheet through an Apps Script, [`tools/sync/Code.gs`](tools/sync/Code.gs),
which updates itself from `main`. Pierre's choices are made in the admin; **Publish** commits `curation.json` to `main`,
and the Candidate photos workflow then fetches the approved photos. The deploy stamps the version numbers (`?v=`, the
Lab's `LAB_V`, `sw.js` `V`): never edit them. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run locally

```sh
python3 -m http.server 8000
# app: http://localhost:8000 · admin on made-up data: http://localhost:8000/admin.html?demo
```

## Test

As CI runs them ([checks.yml](.github/workflows/checks.yml): Node 26, Python 3.15, Playwright 1.64.1; no `package.json`):

```sh
npx --yes prettier@3.9.10 --check "*.js" "*.css" "proto/*.js" "proto/*.css" "tests/*.js"
node tests/run.js                        # the unit tests, in the machine slot
node tests/pages.smoke.js                # Playwright smokes: pages, draw, fish, admin, profiles, net
python3 tools/check_versions.py
python3 tools/stack_check.py --check
python3 tools/datajson.py --check
```

## Repository layout

| Path | What |
|---|---|
| `index.html`, `app.js`, `core.js`, `*.js`, `*.css` | The app; `core.js` holds the pure functions shared with the admin and the sheet script |
| `admin.html`, `admin*.js` | Pierre's back-office |
| `*.json` | Content, Pierre's curation (`curation.json`) and machine suggestions |
| `img/`, `fonts/` | The photos with no other backup; the self-hosted fonts |
| `proto/` | Lab prototypes and graduated tools (the Coral ID Key) |
| `tools/` | Build, import and analysis scripts; `tools/sync/` the sheet script |
| `tests/` | Unit tests (`*.test.js`) and Playwright smokes (`*.smoke.js`) |
| `judging/` | The photo-judging package for an outside agent |
| `docs/` | The documentation below |

## Docs

- [AGENTS.md](AGENTS.md): the constitution: Rule 0, the merge contract, the index of the rules.
- [docs/HANDOVER.md](docs/HANDOVER.md): where things are, what lives outside GitHub, the one-time setups.
- [docs/INTEGRATOR.md](docs/INTEGRATOR.md): how the integrator runs the work day to day.
- [docs/STATUS.md](docs/STATUS.md): where things stand now.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): files, data, admin, sync, photos, deploy.
- [docs/LEARNING.md](docs/LEARNING.md): the learning model and the research behind it.
- [docs/FISH_PATH.md](docs/FISH_PATH.md): the fish naming path.
- [docs/ROADMAP.md](docs/ROADMAP.md): deferred ideas, open questions, declined ideas.
- [docs/PAGES.md](docs/PAGES.md): GitHub Pages setup and recovery.
- [docs/SECURITY.md](docs/SECURITY.md): what is exposed and what protects it.
- [docs/FORMATS.md](docs/FORMATS.md): the question formats adopted, and why.
- [docs/DESIGN.md](docs/DESIGN.md): design tokens and components.
- [docs/rules/](docs/rules/README.md): Pierre's standing rules, one file per theme.
- [judging/FISH.md](judging/FISH.md): the fish photo-judging rubric.

## Content and rights

**Code and compiled data.** © 2026 Pierre Pericard, all rights reserved (see [LICENSE](LICENSE)). No open-source
licence is granted. Much of the code was written with AI coding assistants under his direction.

**Photos.** Every photo keeps its author and licence, shown in the app (enlarge a photo) and recorded in the data files
(`a` credit, `lic` licence, `o` source page).
- **Pierre Pericard's own photos** (iNaturalist user `ppericard`): © Pierre Pericard.
- **Other iNaturalist observers**: © their authors, under the licence each chose: CC0, CC BY or CC BY-NC. No share-alike
  or no-derivatives photos are used. Some photos are cropped.
- **FishBase** (fish only): © their authors, CC BY-NC 4.0 as FishBase states it.
- **IMR Lecture 6 photos** (corals only): used for IMR's internal training. Their rights are uncertain, as many were
  not taken by IMR; they are being traced to their original sources and will be credited or replaced. Not for reuse.
  The fish side uses no IMR lecture photos.
- **Coral Finder 2022** (© Russell Kelley / BYOGUIDES): the use of its crops is under review.

**Text and data.** The coral genus list, ID tips and lecture notes come from IMR Lecture 6; the fish cues, look-alikes
and IMR names from IMR's fish presentation and reference list (© IMR, used in the app for IMR's training, not for
reuse). The fish families follow *Reef Fish Identification: Tropical Pacific* (Allen, Steene, Humann and DeLoach, cited).
Taxonomy follows the World Register of Marine Species (WoRMS, cited). Size and depth facts come from Reef Life Survey
and FishBase, cited per species. Fonts: Source Sans 3 and Barlow Condensed (SIL Open Font License).

**Reuse.** Nothing here is offered for reuse. A Creative Commons photo can be reused under its own licence from its
original source, not from this repository. Rights holders: open an issue to change a credit or have a photo removed.

*This notice is not legal advice.*

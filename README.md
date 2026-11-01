# IMR Coral ID

A static web app for learning the 39 coral genera on the IMR (Institute for Marine Research, Dauin, Philippines) survey slate: 34 surveyed genera plus 5 starred look-alikes.

Live: <https://ppericard.github.io/coral-id-imr/> · Built for the Research Assistants trained at IMR, whose first task is genus-level labelling of benthic photos in ReefCloud.

**Docs:** [AGENTS.md](AGENTS.md) (standing rules for any agent or developer) · [docs/HANDOVER.md](docs/HANDOVER.md) (state of play and how to take over) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (files, data, admin, sync, deploy) · [docs/ROADMAP.md](docs/ROADMAP.md) (prioritised backlog, open questions) · [docs/DESIGN.md](docs/DESIGN.md) (design tokens and components) · [docs/reviews/](docs/reviews/README.md) (expert reviews).

## What's inside

- **Learn**: the Genera page (photos or short ID tips, in IMR lecture-group or slate order); a genus sheet per genus with three photo views (colony, close-up, corallites), the IMR lecture notes, a mnemonic, Coral Finder features and "Don't confuse with"; Look-alikes, a deck of classic pair montages.
- **Practice**: Photo → genus (adaptive difficulty), look-alike duels and Memory (colony ↔ corallites). From 10% progress, bonus genera off the slate that are common at Dauin (fire coral *Millepora* first) join the quiz and duels, outside the slate score.
- **Identify**: the Coral Finder, a clue-based ranking that follows the Coral Finder 2022 book (growth form, then box, then corallite clues), also listing 27 non-IMR genera seen at Dauin.
- **My progress**: learned / learning / review per genus on a 6-step colour scale, synced to a Google Sheet when an RA signs in.
- **Settings** (⚙): light/dark theme, five colour palettes (Depth by default), colour-blind mode (blue/orange instead of green/red).
- **Tools**: prototypes (mind map, corallite anatomy, look-alike web…) that graduate to the main app only once Pierre approves.

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

The app is plain HTML/CSS/JS with no build step. `data.json` holds all genus data; photos are in `img/` as WebP (1600 px, plus a 480 px `-s` version for thumbnails).

## Photos

- IMR Lecture 6 photos, used with IMR permission for internal training. Do not reuse outside IMR. They come first everywhere and are used in games.
- Pierre's own iNaturalist photos (user `ppericard`), then other iNaturalist observers (CC licences), credited in the enlarged view and, in games, after the answer.
- Coral Finder 2022 book crops (© R. Kelley / BYOGUIDES): never in games; on a genus sheet only when pinned or to fill a gap after the field photos; a few in the Coral Finder. Switchable off site-wide from the admin.

`tools/` holds the build and import scripts; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for which ones are still re-runnable.

## Photo curation

`admin.html` (not linked from the app) is a back-office to pick, per genus, the cover photo, the featured photos of each view (up to 3, in order), photos to hide everywhere (games included) and photos to move to another view, and new candidate photos (`data.json` `cand`) to add to a view (`add`). Each photo is tagged by origin (IMR lecture, Pierre, iNaturalist Dauin / Philippines / elsewhere, from `p.loc`) with a filter. It writes `curation.json`, which `app.js` applies on top of `data.json` (`applyCuration`), so rebuilding `data.json` never loses these choices.

Every click is kept as a draft in the browser; Publish merges the draft key by key onto the latest published `curation.json` (so choices published from another device are kept) and commits it to `main` through the GitHub API with a fine-grained token (this repository only, Contents read and write). The token is stored in the browser, encrypted with the admin password; the password only unlocks the token, the token is what allows writing. Without a token, `admin.html?readonly` opens the page to download the JSON. `index.html?draft` previews unsaved choices in the same browser.

Photo quality: `quality.json` holds a first automatic rating per photo (3 good, 2 fair, 1 poor) from `tools/photo_quality.py` (sharpness of the best-focused area, contrast, colour cast, pixel size). Pierre's corrections are in `curation.json` under `quality` (`{f: level}`); the effective level is the correction, else the automatic one. The admin has a second entry point, "By quality", listing every photo by level across genera. Poor photos (identifiable but low quality, like ReefCloud images) are used at the hard end of games.

Exclusion: `curation.json` `exclude` (`{f: reason}`) removes a photo for good (a person in frame, a drawing, an AI image…): `applyCuration` drops it from every list, and the build scripts skip it (`tools/excluded.py`). Hide, by contrast, is a per-genus choice that can be undone with Show again.

## Photo judging by an outside agent

The photo judgement work (growth form, quality, view, wrong genus, several corals, near-duplicates, featured picks, candidates worth adding) can be handed to another AI agent, e.g. Codex. The package lives in `judging/`: `AGENTS.md` (rules and categories), `PROMPT.md` (what to paste into the agent), `schema.json` (output format, one file per genus in `judging/out/`) and `manifest.json` (every photo to judge, built by `tools/judging_manifest.py`). `tools/judging_import.py --check` validates the agent's files; without `--check` it imports them as suggestions only: `suggest.json` (listed in the admin Triage, one Accept or Dismiss at a time; dismissals are kept in `curation.json` `seen`, "keep off games" in `use`), plus IMR growth forms in `forms.json` `gf` (letters defined in `forms.json` `forms`), quality in `quality.json` and Featured picks in `picks.json`. Pierre's own choices in `curation.json` always win and are never written by the import.

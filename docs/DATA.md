# Data files

What each data file holds, who writes it and who reads it. The root of the repository serves the app as it is, so its
JSON files are the data the site loads. The long description of each is in [ARCHITECTURE.md](ARCHITECTURE.md) "Data files".

Three writers exist besides a pull request:

- **The admin's Publish** (Pierre, through `admin.html`) commits `curation.json` and nothing else (rule A1).
- **The Candidate photos workflow** ([approved-photos.yml](../.github/workflows/approved-photos.yml)) runs after a
  Publish and on demand. It commits `data.json`, `cand.json`, `excluded.json`, the fish and sea-slug photo files,
  `tools/fish_refs.json`, `tools/fish_refill.json` and `img/`.
- **The merge train** moves the `release` branch (the sheet script's source); it writes no data.

Everything else is written by a tool that a pull request runs and commits. A tool never writes `curation.json`.

## Root data files

| File | Holds | Written by | Read by |
|---|---|---|---|
| `curation.json` | Pierre's choices: cover and featured photos, hidden, moved and excluded photos, crops, rotations, growth forms, ratings, look-alike overrides, the fish and sea-slug parts, the content editor's edits, the state of each point and report | The admin's Publish only | The app (through `curation-play.json`), the admin, the sheet script |
| `curation-play.json` | `curation.json` without what the app never reads. Not in git | `tools/curplay.py`, at deploy | The app, the service worker |
| `data.json` | The coral content: one record per genus (`gen`), the lecture photos (`course`), the Coral ID Key (`key`), glossary, traits, the extra Dauin genera (`x`) and the few candidates `curation.json` names | `tools/datajson.py` (the one writer, rule W16), through the `tools/apply_*.py` scripts and the fetch scripts | The app, the admin, the sheet script, the service worker |
| `cand.json` | The coral candidate photos still waiting (same layout, top key `cand`) | The fetch scripts (`tools/fetch_local.py`, `tools/fetch_approved.py`), through `datajson.dump_all()` | The admin, the app's `?draft` preview |
| `excluded.json` | Photos Pierre excluded, kept so Restore can put them back | `tools/excluded.py` | The admin, the fetch scripts |
| `forms.json` | The growth-form definitions and a first guess of each photo's form | `tools/judging_import.py`, `tools/game_forms.js`, `tools/apply_imr_forms.py` | The app, the admin |
| `quality.json` | The automatic quality rating of each photo | `tools/photo_quality.py`, `tools/judging_import.py` | The app, the admin |
| `picks.json` | Suggested featured photos per genus and view | `tools/judging_import.py` | The app, the admin |
| `dups.json` | Near-duplicate photos | `tools/find_dups.py` | The admin |
| `metrics.json` | Objective photo metrics (sharpness, size, colour cast) | `tools/photo_metrics.py` | The admin |
| `suggest.json` | The outside judging agent's results, per subject, imported as suggestions | `tools/judging_import.py`, `tools/judging_cand.py`, `tools/judging_fish.py` | The admin; `tools/fish_game.py` |
| `presence.json` | Per coral photo species, whether the presence rule (C8) holds | `tools/coral_presence.py` | The admin |
| `names.json` | Former names and spellings, one section per subject: an extract of `tools/taxonomy.json` | `tools/taxonomy.py` | The admin |
| `points.json` | Points to settle: disagreements between sources, questions for the trainers (rule C5) | By hand, in a pull request | The admin (Pierre's state of each point is in `curation.json`) |
| `reports-handled.json` | Players' reports fixed in a pull request, by report id | By hand, by the integrator | The app, the admin |
| `fish.json` | The fish content: families, genera, species, circles, look-alikes, names | `tools/build_fish.py`, from `tools/fish_source.json` and the instance's layer | The app, the admin, the sheet script, the service worker |
| `fish-cand.json` | Fish candidate photos | `tools/fetch_fish.py`, `tools/fetch_fishbase.py` | The admin |
| `fish-game.json` | The fish photos in play, hosted on R2 | `tools/fish_game.py` | The app, the admin, the sheet script, the service worker |
| `fish-photos.json` | A few photos per fish entry, and the photos used on a sheet only | `tools/fish_game.py`, `tools/fish_photos.py` | The app, the admin, the sheet script, the service worker |
| `fish-holdout.json` | The fish observations held out of practice, per species | `tools/holdout.py` | The app, the service worker |
| `seaslug.json` | The sea-slug content: tree, genera, species, names | `tools/seaslug_game.py`, from `tools/seaslugs.json` | The app, the admin, the sheet script |
| `seaslug-game.json` | The sea-slug photos in play | `tools/seaslug_game.py` | The app, the admin, the sheet script |
| `seaslug-cand.json` | Sea-slug candidate photos | `tools/fetch_seaslugs.py` | The admin |

The sheet script (`tools/sync/Code.gs`) reads the data files from `main` on GitHub, never from a branch. The app and
the admin read the same files from the site. `core.js` `SUBJECTS` lists, per subject, the files its pool and its admin
read (`pool`, `files`).

## Formats that matter

- **One record per line.** `data.json` and `cand.json` keep one genus per line so that two edits to different genera
  merge. Write them only through `tools/datajson.py`; `python3 tools/datajson.py --check` is the PR check.
- **`curation.json` is merged key by key** by Publish. A pull request never edits it.
- **Names are short.** The fields most often met:
  - a genus record in `data.json` (`gen`): `n` the slate number (0 for a starred look-alike), `fam` family, `ig` IMR
    lecture group, `imr` lecture notes, `qt` ID tips, `sum` short description, `plain` plain sentence, `mn`
    mnemonic, `crit` Coral Finder criteria, `tr` and `trs` trait ids (`trs`: only some species), `look` look-alikes,
    `lsrc` source of each pair, `ap` and `apsrc` the pairs' tell-apart lines and their sources, `sl` slide numbers,
    `info` other sources, `views` and `more` photo lists, `cover`, `cm` how common near Dauin, `root` the name's roots;
  - a photo: `f` file stem in `img/`, `ar` width over height, `a` author credit, `lic` licence, `o` page of the
    original, `src` online original, `r: 1` not downloaded yet, `t` species, `own` Pierre's own photo, `loc`
    (`dauin`, `ph`, `world`), `gid: 1` not Research Grade, `skel: 1` a skeleton photo (never shown, rule P6).
- **A photo has four sizes** in `img/` and on R2 (`<f>.webp`, `-m`, `-s`, `-t`; `tools/photos.py`).

## Other data in the repository

| Where | Holds | Written by | Read by |
|---|---|---|---|
| `img/` | Photos git keeps: IMR lecture photos and page art. The other photos live on Cloudflare R2 under the same paths | `tools/fetch_approved.py`, `tools/photos.py`; copied to R2 by `tools/r2_sync.sh` | The app (R2 first), the tools |
| `judging/` | The brief and rubrics for the outside photo-judging agent, the manifest of its work, and its per-genus and per-species judgements | `tools/judging_manifest.py`, `tools/judging_import.py`, `tools/judging_cand.py`, `tools/judging_fish.py` | The judging agent; the import tools |
| `tools/*.json` and `tools/*.txt` | Build inputs and caches of the tools: the fish and sea-slug sources, names, cues, commonness, presence checklists, the taxonomy reference (`taxonomy.json`), the stack pins (`stack.json`), the infrastructure numbers (`infra.json`) | The tools named in [tools/README.md](../tools/README.md), or by hand | Those tools. The app never loads them |
| `tools/instance.json`, `tools/instances/` | The instance (the organisation the content is built for) and its content layer | By hand | `tools/instance.py`, `tools/build_fish.py`, `tools/datajson.py` |
| `tools/sync/` | The sheet script `Code.gs`, its manifest and its version history | `Code.gs` by hand, the history by `tools/sheet_version.py` | Google Apps Script, which installs it from the `release` branch |
| `manifest.webmanifest` | The install manifest of the app | By hand | The browser |

## Outside the repository

- **The sync sheet** (a Google Sheet): players, answers, events, reports, timings and the script's deploy log, one
  tab each. The sheet script reads and writes it; the app and the admin go through the script. Rule D2 keeps real
  names out of the repository, and rule D1 keeps tests away from it.
- **Cloudflare R2**: the photo files.
- **iNaturalist, WoRMS, FishBase**: the sources the fetch and build tools ask, paced (rule C7).

See [HANDOVER.md](HANDOVER.md) for what lives outside GitHub and [SECURITY.md](SECURITY.md) for what is exposed.

# Tools

Scripts that build, check and analyse the data, the site and the work around them. Run them from the repository root
(`python3 tools/<name>.py`, `node tools/<name>.js`). The header of each file says its usage, what it reads and what it
writes. [docs/spec/tools.md](../docs/spec/tools.md) holds the long descriptions (inputs, outputs, options, tests),
[docs/DATA.md](../docs/DATA.md) says which tool writes which data file.

Conventions that hold across them:

- A tool that writes `data.json` goes through `datajson.py` (rule W16). No tool writes `curation.json` (rule A1): only the
  admin's Publish does.
- A tool that asks iNaturalist or WoRMS goes through `inat.py` (rule C7: paced, a User-Agent, paced retries).
- A heavy tool takes a machine slot (rule W24): `node tests/slot.js -- <command>` for one that does not do it itself.
- `--check` means "change nothing, exit 1 if the repository disagrees". Those marked **CI** run on every PR.
- A tool that ran once to change content and can run again without harm is idempotent; its header says what it changed.
  Those named `apply_*` are of that kind.
- Many tools cache network replies in `tools/.cache/` (not in git), so a second run can be offline.

## Checks and the build

| Tool | What it does |
|---|---|
| `check_json.py` | Every JSON file git tracks parses. **CI**, and before each deploy |
| `check_versions.py` | Cache-busting consistency (`?v=`, the service worker's lists) and the sheet script's version rules; `--dir` checks a built copy. **CI** |
| `datajson.py` | The one writer of `data.json` and `cand.json` (one genus per line); `--check` is the layout check. **CI** |
| `sync_core.py` | Copies `core.js` into `sync/Code.gs`; `--check` fails when the copy is stale, `--fix` rewrites it. **CI** |
| `sheet_version.py` | The sheet script's version rules; `--assign` gives the next version at merge (the integrator) |
| `stack.json`, `stack_check.py` | The pins of the whole stack (runtimes, tools, APIs); `--check` offline is **CI**, `--latest` lists what is behind |
| `requirements.txt` | The Python packages CI installs, pinned by hash |
| `rename_app.py` | Applies the app's names (from `core.js` `ORG`) to the static files; `--check` is **CI** |
| `photos.py` | The four photo sizes and where a photo lives; fills missing sizes; `--check` is **CI** |
| `build_site.py` | The deploy's build of its staged copy: `curplay.py`, `stamp_versions.py`, `minify.js`, the checks |
| `curplay.py` | Writes `curation-play.json`, the players' copy of the curation |
| `stamp_versions.py` | Stamps version numbers and the build number at deploy (a PR never edits them, rule W15) |
| `minify.js` | Minifies the scripts of a staged copy, with source maps |
| `unminify.js` | Maps an error report's file, line and column back to the source |
| `og/` | `make_og.js` renders `og.html` into `og.jpg`, the link preview image |

## Working with the repository

| Tool | What it does |
|---|---|
| `brief.py` | The session brief: Manila time and the Rule 0 window, open PRs, questions for Pierre. The session hooks run it (`--short`, `--time`) |
| `train.py` | The merge train (rule W26): builds `main` plus the ready PRs, waits for the checks, merges them, moves `release` |
| `guard_bash.py` | The Bash guard (a PreToolUse hook): refuses at once, with the way out, a shell command carrying code or editing in place |
| `agent_guard.py` | The same on Agent: refuses a launch without `model` and `effort`; logs each |
| `instr_log.py` | Session hooks log which instruction files reached which agent, and why |
| `night.py` | The night report: what the agents did from 17:30 to 04:00 Manila (PRs merged with their agent time, trains, PRs left open, the night queue) |
| `effort.py` | Measures the agent time of merged PRs, so an estimate cites comparable ones; `--check FILE.md` checks a study |
| `asked.py` | Searches the answers ledger, the rules and the decision records before any question to Pierre |
| `answers_check.py` | Every ledger answer names its doc; nothing answered is cited as waiting (the docs test) |
| `decisions_index.py` | Writes the decisions index from the records (`--fix`, `--check`) |
| `slot.py` | The machine-slot guard for heavy Python tools (`tests/slot.js` is the lock) |
| `health.py`, `infra.json` | The hourly Health workflow: the live site, the sheet script, the infrastructure numbers against their free-tier limits |

## The sheet script

| Tool | What it does |
|---|---|
| `sync/Code.gs` | The Google Apps Script behind the sheet. Never edit `VERSION`, its first line or `HISTORY.md` in a PR (rule D3) |
| `sync/HISTORY.md`, `sync/changes/` | The script's version history, and the entry a PR adds for its change ([README](sync/changes/README.md)) |
| `sync/appsscript.json` | The script's manifest and its scopes |
| `analyses.js` | The admin's Analyses report on the answer log, stored in the sheet; run by the Analyses workflow |
| `timings.js` | Sums up the sheet's `Timings` tab: median, slowest, trend, quotas |
| `syncperf.js` | Bytes and round trips per answer of the progress sync, on slow lines |

## Coral content

| Tool | What it does |
|---|---|
| `build_extra.py` | The extra Dauin genera and the bonus genera (`data.json` `x`) |
| `apply_bonus.py` | Marks bonus-genus photos that are not Research Grade, moves multi-coral photos to `more` |
| `commonness.py` | How common each game genus is near Dauin (`cm`) |
| `genera.py` | Shared helper: the game genera and the Coral ID Key-only ones, from `core.js` |
| `coral_presence.py`, `presence.py`, `presence_checklists.json` | The presence rule (C8) defined once, and its result per coral photo species (`presence.json`) |
| `taxonomy.py`, `taxonomy.json` | The build-time reference of names (WoRMS, iNaturalist); writes `names.json`; reports, never renames |
| `game_forms.js` | Lists game photos with no growth form; `--apply` writes a judging pass's guesses into `forms.json` |
| `apply_plain_sheets.py`, `plain_sources.json` | The plain sentence of each genus |
| `apply_plain_terms.py` | The glossary's plain first sentences |
| `apply_name_roots.py` | The sourced roots of genus names |
| `apply_id_tips.py`, `id_tips.txt` | Writes the short ID tips into `data.json` |
| `apply_coral_apart.py`, `coral_apart.json` | The slate pairs' tell-apart lines with their sources, into `data.json` `ap` / `apsrc`; `--check` for a test |
| `apply_imr_corrections.py`, `apply_review_slides.py`, `apply_favites.py`, `apply_some_species.py` | One-time content passes on the lecture notes and the traits of some genera |
| `apply_imr_forms.py` | The IMR growth-form definitions into `forms.json` |
| `apply_imr_sources.py`, `imr_sources.json` | Credits the IMR lecture photos traced to their original source |
| `apply_book_rewrite.py`, `book_rewrite.json` | Rewords the texts that followed a book too closely; `--check` for a test |
| `apply_no_book.py` | Takes the book's crops out of `data.json` and `cand.json` |
| `apply_skeletons.py` | Marks skeleton photos from `judging/skeletons.json` (rule P6) |
| `apply_covers.py`, `covers.txt`, `apply_cmp.py`, `lecture_cmp.tsv`, `apply_multi.py`, `recrop.txt`, `multi.txt`, `apply_look_sources.py`, `apply_sources.py` | One-time passes that record how covers, comparison images, multi-coral photos and sources were set |
| `apply_loc_fix.py` | Hand corrections of a photo's `loc` |
| `apply_no_share_alike.py` | Takes share-alike coral candidates out of `cand.json` |
| `views.txt`, `summaries.txt`, `course_views.txt`, `lecture_more.tsv` | Inputs of the passes above and of the archived first build |

## Photos

| Tool | What it does |
|---|---|
| `fetch_local.py` | Coral candidate photos from iNaturalist, near Dauin first; `--plan` shows offline what it would fetch |
| `fetch_approved.py` | Downloads the candidates Pierre added, in four sizes, for R2; run by the Candidate photos workflow |
| `cand_gaps.py` | Game genera short of candidates (rule W20) |
| `r2_sync.sh` | Copies photos to the Cloudflare R2 bucket; never deletes. Run by workflows |
| `r2_move.py` | Lists what leaves `img/` for R2 and verifies the bucket |
| `photo_quality.py`, `quality_eye.json` | Automatic quality rating into `quality.json` |
| `photo_metrics.py` | Objective metrics into `metrics.json` |
| `find_dups.py` | Near-duplicate photos into `dups.json` |
| `tag_origin.py` | Tags each iNaturalist photo `dauin`, `ph` or `world` |
| `excluded.py`, `excluded.json`, `apply_excluded_archive.py` | Excluded photos and their archive, so Restore works |
| `apply_ratios.py` | Writes each photo's shape (`ar`) into `data.json` |
| `licences.py` | Re-reads licences and credits from iNaturalist and updates the stored ones |
| `rights.py` | The rights class and tie-break of a photo (the copy of `core.js`) |
| `judging_manifest.py`, `judging_import.py`, `judging_cand.py`, `judging_fish.py` | The outside judging agent's package: build the manifest and contact sheets, check and import its results ([judging/BRIEF.md](../judging/BRIEF.md)) |
| `inat.py` | The one HTTP client for iNaturalist and WoRMS |

## Fish

| Tool | What it does |
|---|---|
| `build_fish.py`, `fish_source.json`, `fish_sheets.json`, `fish_facts.json`, `fish_genus_names.json`, `fish_wink_photos.json` | Builds `fish.json` from the sources and the instance's layer |
| `fish_common.py`, `fish_common.json`, `fish_common_src.json` | The curated common names |
| `fish_commonness.py`, `fish_commonness.json`, `fish_commonness_inat.json` | The commonness index that orders species |
| `fish_names.py` | The kind words of common names, written into `fish.json` |
| `fish_facts.py` | Size and depth facts for species sheets, with their sources |
| `fish_genus_roots.json`, `fish_genus_marks.json` | Name roots and ID marks of fish genera, read by `build_fish.py` |
| `fish_lookalikes.json` | Species look-alike pairs and regional species, quoted from their sources; `build_fish.py` `lookalikes` writes `fish.json` `lookalikes` and `region` |
| `fetch_fish.py`, `fish_refill.json` | Fish candidate photos into `fish-cand.json`; `--refill` for short species |
| `fetch_fishbase.py`, `fishbase_src.json` | Fish candidates from FishBase |
| `fish_refs.py`, `fish_refs.json` | Reference photos of the fish units |
| `fish_judge.py`, `fish_judge.json` | The fish photo rubric's code and judgements |
| `fish_inforce.py` | The fish circles in force (the content editor's moves laid over `fish.json`) |
| `fish_game.py`, `fish_short.py` | Write `fish-game.json` and its short form |
| `fish_photos.py` | Writes the sheet-only photos into `fish-photos.json` |
| `fish_draw_sim.js` | Measures the easy share of the fish draw in the real app |

## Sea slugs

| Tool | What it does |
|---|---|
| `build_seaslugs.py`, `seaslug_source.json`, `seaslugs.json` | The species list, circles and photo targets |
| `seaslug_game.py` | Builds `seaslug.json`, `seaslug-game.json` from the list and the judged candidates |
| `fetch_seaslugs.py`, `seaslug_informal.json` | Candidate photos into `seaslug-cand.json`; species with no published name |
| `seaslug_names.py`, `seaslug_names_src.json`, `seaslug_names.json` | English common names with their sources |
| `seaslug_cues.py`, `seaslug_cues.json` | Sourced ID marks per genus and family, and the declared genus pairs' tell-apart lines |
| `seaslug_lookalikes.py`, `seaslug_lookalikes_source.json`, `seaslug_lookalikes_pull.json`, `seaslug_lookalikes_cand.json` | Look-alike candidates from iNaturalist and the literature |
| `seaslug_worms.py`, `seaslug_worms.json`, `seaslug_groups.json` | The reference taxonomy from WoRMS and the hand-kept taxonomic groups |
| `seaslug_lit.py`, `seaslug_lit_source.json`, `seaslug_lit.json` | The literature watch: new names and revisions, read by people only |

## The instance

| Tool | What it does |
|---|---|
| `instance.py`, `instance.json`, `instances/` | The organisation the content is built for, and its content layer |

## Learning checks and analyses

All offline, read files, send nothing to the sheet (rule D1). See [docs/LEARNING.md](../docs/LEARNING.md) "Validating a
learning change" (rule L11).

| Tool | What it does |
|---|---|
| `learnsim.js` | Simulates players in the real app; the base of every learning check. `memstorage.js` is its in-memory storage |
| `learnprof.js` | The simulated players' profiles |
| `ratedworld.js` | The rated synthetic world the app's engine also runs on |
| `learncmp.js` | Compares two `learnsim.js` runs: the guardrails and the declared primary measure. The Learning check workflow runs it |
| `abilityeval.js`, `fieldeval.js`, `fallbackeval.js`, `barjudge.js` | Score a rule against simulated runs or the answer log |
| `realcheck.js`, `memreplay.js` | Check the model's estimates against the real answer log (rule L12) |
| `rtprep.js`, `rtdecomp.py` | Response time: prepare the log, decompose the time |
| `perf.js` | Speed from a player's side: cold and warm start, throttled phone and network |
| `studies/q351/` | The scripts of one batch-model study |

## Archive

[archive/](archive/README.md) holds the first build's scripts. They read files that no longer exist and cannot be re-run.

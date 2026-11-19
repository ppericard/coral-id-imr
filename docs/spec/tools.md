# Tools: what each script does

The details behind the one-line rows of [tools/README.md](../../tools/README.md): what each script in `tools/` reads,
writes and checks, its options and its tests. Read the README first (its groups, the conventions every tool follows:
`datajson.py` writes `data.json`, `inat.py` asks iNaturalist and WoRMS, `--check` changes nothing, caches in
`tools/.cache/`); each file's header gives its usage. This is the specification of what the code does now; why each
tool was made is in [docs/decisions/](../decisions/README.md) and the PRs. Which tool writes which data file:
[DATA.md](../DATA.md).

Python 3 scripts, run from the repository root. The first build's scripts (`make_site.py`, `build_photos.py`,
`apply_levels.py`, `build_lecture_more.py`, with their inputs) read a scratchpad that no longer exists: they are in
`tools/archive/`, kept for reference, and cannot run again. `data.json` is edited directly and written with
`tools/datajson.py`.

## Checks and the build

- **`datajson.py`**: the one writer of `data.json` (`load()`, `dump(d, path)`, one genus per line:
  [data.md › Layout](data.md#layout)). Every script that writes `data.json` uses it. Run alone it rewrites the file in
  that layout with the instance's coral layer laid on; `--check` is the PR check (the layout and the layers).
- **`sync_core.py`**: copies `core.js` into `tools/sync/Code.gs` between its BEGIN / END markers (`--fix`), or checks
  that the copy is current (`--check`, CI): the sheet script replays progress with the app's own engine
  ([sync.md › Full replay](sync.md#full-replay)). After a `--fix`, add the sheet changes file
  (`tools/sheet_version.py`), never a `VERSION` bump.
- **`photos.py`**: the four photo sizes (`SIZES`, `save()`, `remove()`) and where a photo lives (`online()`: on R2 only;
  `gitonly()`: in git; `every()`; `path()`: a local file, copied from R2 when need be; `url()`); run alone it fills the
  missing smaller files of `img/`; `--check` (CI), `--r2-list` (for `r2_sync.sh`).
  [photos.md](photos.md#where-the-files-are).
- **`build_site.py`**: the deploy's build of its staged copy (`pages.yml`; the staged smoke `tests/staged.smoke.js` runs
  it too): `curplay.py`, `stamp_versions.py`, `minify.js`, `stamp_versions.py` again on the minified bytes with the build
  number, `check_versions.py --dir` ([PAGES.md › The build at deploy](../PAGES.md#the-build-at-deploy)).
- **`curplay.py`**: the players' copy of the curation, `curation-play.json`, written at deploy (`pages.yml`, on the
  staged copy, before the stamps) and by the smokes (`tests/calm.js`): `curation.json` without what the app never reads
  ([loading.md › The players' curation](loading.md#the-players-copy-of-the-curation)).
- **`minify.js`**: the scripts of a staged copy minified by terser (pinned: `TERSER`, installed outside the repository,
  found through `NODE_PATH`), a source map beside each; never `sw.js`, `proto/lab.js`, the pages or the CSS; it fails when
  a file's `?v=` references change.
- **`unminify.js`**: an error report's `file:line:column` (or a pasted stack) mapped back to the original file and line
  through the `.map` files of the live site, of a built copy (`--dir`) or of a commit rebuilt here (`--commit`); the
  report's `av` hash must match the maps' `app.js`, else exit 2 ([PAGES.md](../PAGES.md#the-build-at-deploy);
  `tests/unminify.test.js`, `tests/staged.smoke.js`).
- **`stamp_versions.py`**: the version numbers stamped at deploy (`pages.yml`, on the staged copy): every `?v=` a content
  hash, `LAB_V` and the `sw.js` Lab list one hash of the Lab files, `sw.js` `V` a hash of its `SHELL`, the build number in
  the pages. Pull requests never edit them (rule W15).
- **`check_versions.py`**: cache-busting consistency, in the source and in a stamped copy (`--dir`): one `?v=` per file
  everywhere, `sw.js` `SHELL` lists what `index.html` and `app.js` load, the Lab list matches `LAB.files` and `LAB_V`. No
  bumps: the deploy stamps the numbers. In the source it also runs `sheet_version.py`'s check (`--sheet-base REF` on a
  pull request, CI passing the merge ref's `HEAD^1`; `--main` on `main` or a merge train).
- **`sheet_version.py`**: the sheet script's `VERSION`, given at merge (rule D3). `--check`: a pull request waiting for
  its version carries one `tools/sync/changes/<branch>.md` and leaves `VERSION`, line 1 and `tools/sync/HISTORY.md` as on
  its base; an assigned one is the base plus one entry on top of HISTORY.md, line 1 short; HISTORY.md has one entry per
  version, no duplicate, no gap; with `--main`, no changes file left, no gate above `VERSION`, no bare `vNEXT`; a pull
  request never changes a gate `main` has. `--assign` (the integrator, at merge, on a branch that holds `origin/main`,
  the merge committed or stopped on a resolved conflict): `VERSION` + 1, the entry at the top of HISTORY.md under the
  Manila date, line 1 short, every gate the pull request adds against `origin/main` and every bare `vNEXT` set to it,
  `main`'s gates left alone, the changes file removed; `--dry-run`. `tests/sheetversion.test.js`.
- **`stack.json`, `stack_check.py`**: the pins of the technology stack (rule W9): one item per runtime, tool, runner
  image, data snapshot or external API whose version the repository chooses and no package manager tracks (Node,
  Python, the runner label, Prettier, Playwright, Pillow, rclone, the FishBase snapshot, the iNaturalist and GitHub REST
  API versions, the Apps Script runtime), with where each is written and where its latest stable is looked up.
  `--check` (offline, the PR check) fails when a pin in the repository differs from `stack.json`; `--latest` looks every
  item up at its source and prints what is behind (informational, exit 0; `--all`, `--json`). `tools/brief.py` shows the
  `--latest` count once a Manila day (`main`'s copy, 3 s at most, cached in `tools/.cache/`). GitHub Actions are
  Dependabot's (`.github/dependabot.yml`).

## Working with the repository

- **`train.py`**: the merge train (rule W26). `python3 tools/train.py [--dry-run] N…` checks each pull request (open, on
  `main`, no draft, no `needs-pierre`, green on its head, no sheet changes file; from `BODY_FROM` on, its description:
  "Choices I made" None, and each item of "Players see" quoting Pierre with a date or marked "integrator's call",
  AGENTS.md "What players will see comes from Pierre"), builds `main` plus their heads in a
  temporary worktree (the sheet rules checked by `main`'s copy of `sheet_version.py`: no pull request's code runs),
  pushes `train/<UTC time>`, waits for Checks and Smokes on it, squash-merges each pull request at its tested head in
  order (stopping if `main` moved) and compares `main`'s tree with the train's. `gh api` GET and PUT only, no
  force-push; `tests/train.test.js` (a stand-in `gh`, a bare origin).
- **`guard_bash.py`**: the Bash guard, a PreToolUse hook (`.claude/settings.json`, main's copy given with `python3 -I -c`
  so the hook's JSON stays on stdin): refuses at once, with the way out, a shell command carrying code or editing in
  place (heredoc, `python -c`, `node -e`, `perl -e`, `sed -i`, `bash -c`, code piped into an interpreter), for the
  integrator and every subagent (AGENTS.md "No permission prompts for Pierre"). Quoted text is not read as a command; a
  command substitution is (the shell runs it inside double quotes), and so is the body of a `cat <<EOF` heredoc with a
  bare delimiter, which the shell expands; `git show origin/main:tools/X.py | python3 -I -` stays allowed; any error lets
  the command through. `--check 'CMD'` for a try by hand; `tests/guard_bash.test.js`.
- **`night.py`**: the night report (Pierre, 2026-11-18; the night is Rule 0's, 17:30 to his first message after 04:00,
  Manila): PRs merged in it with their agent time (`effort.py`'s measure) and total, trains run and red, PRs opened and
  still open with what holds them, and STATUS "## Night queue" items (one naming no `#N` did not start); "⚠ Nothing
  merged" when the night was empty. `brief.py --time --night-due` (the UserPromptSubmit hook) says once a Manila day, at
  the first prompt between 04:00 and 17:30, that it is due (marker `tools/.cache/night-report-day`: once per checkout).
  `--json FILE` reports a saved snapshot; `tests/night.test.js`.
- **`effort.py`**: the measured agent effort of the last ~300 merged pull requests: agent time is the branch's first
  commit to the head's checks going green, open-to-merge apart; commits, Codex rounds (the "@codex review" asks), files
  and lines; a type (fix, feature, study, content, engine, sheet, admin, docs, tooling; `a+b` for one touching both) and
  a size band (XS up to 20 lines, S up to 100, M up to 400, L up to 1500, XL above). `--table` (medians and the 25-75%
  range per type and band), `--like 1084,1082` (the pull requests cited), `--estimate TYPE SIZE` (the median, the range
  and the 5 closest pull requests to cite: "comparable to #A, #B, #C: median X (range Y-Z)"), `--check FILE.md` (fails on
  an effort figure with no `#NNN` on its line or bullet; `<!-- effort-ok: why -->` marks a figure that is no estimate; run
  by `tests/docs.test.js` on the studies of 2026-11-19 on). It reads GitHub through `gh api` (REST), cached under
  `$XDG_CACHE_HOME/coral-id-imr/effort` (never in the repository). Long sheet pull requests include the waits for the
  `VERSION` and for Pierre's answers: read the median and the range, not the mean.
- **`health.py`, `infra.json`**: the hourly Health workflow's script (`.github/workflows/health.yml`;
  [PAGES.md › Infrastructure health](../PAGES.md#infrastructure-health)): the live site (`index.html` and `data.json` with
  their stamps), the sheet script's public read-only request and its `v`, the weekly backup's age (only with the admin
  token), and the infrastructure numbers against their free-tier limits (Pages 1 GB from `main`'s tree, R2 10 GB from
  `infra.json`, measured by hand; the sheet's cells and slowest operation through `readInfra` with the token), a
  warning past 70%. Standard library only, every request injectable; `tests/infra.test.js` on `tests/infra.fixtures.py`.
  `brief.py` shows the numbers as one `Infra:` line, read from the run's annotation; the admin's To do › Alerts card reads
  the sheet live (`Code.gs` `readInfra_`).

## The sheet script

- **`timings.js`**: the sheet's `Timings` tab summed up ([sync.md › The Timings tab](sync.md#the-timings-tab)): read the
  tab read-only through the Google Sheets connector (range `Timings!A1:G`, saved as the JSON it returns) or as a CSV,
  then `node tools/timings.js <file>` (`--json`, `--day` / `--week`): per operation the weighted count, median, p90, max
  ms and most rows read, the trend over time, and the quota lines (6 min an execution, 90 min of triggers a day). Pure
  functions exported for `tests/timings.test.js`.
- **`analyses.js`**: the admin's Analyses report ([analyses.md › Where it computes](analyses.md#where-it-computes)).

## Coral content

- **`build_extra.py`**: the extra Dauin genera for the Coral ID Key and the bonus genera (`data.json` `x`); it keeps the
  plain sentence on a rebuild and holds the reworded texts of the bonus genera (`apply_book_rewrite.py` below).
- **`apply_bonus.py`**: the bonus genera in games: marks the photos of observations that are not Research Grade
  `gid: 1` (it asks iNaturalist) and moves their multi-coral photos to `more`. Its list is `core.js` `BENTHIC` + `BONUS`
  (`tools/genera.py`; Millepora's photos follow the same rule); run it again after `build_extra.py`.
- **`genera.py`**: shared helper: the game genera and the Key-only ones (`game_genera`, `key_only`, as `core.js`
  `gameOf`), read from `core.js` `BENTHIC` / `BONUS`, and `cap_sheet()` (`CAP.sheet`).
- **`commonness.py`**: how common each game genus is near Dauin (iNaturalist, read only: verifiable observations and
  distinct observers within 40 km, plus the old name of a genus whose `crit` / `imr` lines say "formerly X") → `cm` on its
  `data.json` record (their geometric mean). It prints the table; `--dry` writes nothing. Run it again to update.
- **`presence.py`, `presence_checklists.json`**: the presence rule, defined once (rule C8): `near_dauin`,
  `ph_confirmed`, the checklists (FishBase Table 1 for the Philippines, Corals of the World's Philippine ecoregions, the
  derived name lists), `species_presence` / `confirmed_species` per genus, and `label_confirmed` for a species with no
  published name (3 observers with its label in the Philippines). Read by `build_fish.py`, `fetch_local.py`,
  `coral_presence.py` and the sea-slug tools. Checklist names are matched through the species rows of `taxonomy.json`
  (`taxonomy.py` `aliases`: the name WoRMS accepts now and iNaturalist's spelling), for the subjects the file holds
  (corals and fish). A Corals of the World name mapped by decision rather than by WoRMS carries its reason in the
  checklists' `cotw` `decided` (*Plesiastrea versipora* of the Philippine lists is *P. peroni*, Juszkiewicz et al. 2022;
  `presence.json` picks it up at the next `coral_presence.py` run).
- **`coral_presence.py`**: `presence.json`, the presence rule per coral photo species, for the admin's "out of rule"
  flag (`presence.js`; [data.md › Presence](data.md#presence-of-coral-species-presencejson)).
- **`taxonomy.py`, `taxonomy.json`**: the build-time reference of names
  ([taxonomy study](../reviews/2026-11-05-coral-taxonomy-study.md) section 5, small form). **The app never loads it.**
  One section per subject (`SUBJECTS` in the tool, by `unit`), one record per line.
  - **The corals**: for every `data.json` genus, its role, the app's own wording copied verbatim (`app`: family, the IMR
    lecture's "formerly…" lines; never corrected, rule C1), WoRMS (id, status, family, accepted species) and iNaturalist
    (id, family, the species it lacks or spells otherwise); the former genus names (listed by hand, plus WoRMS's genus
    synonyms still met on iNaturalist or in a checklist or photo name); species rows where they pay (WoRMS moves into an
    app genus whose old name iNaturalist knows, Corals of the World names and photo names, served or candidates, waiting
    ones included, WoRMS writing otherwise); the watch list (the Favites revision and *F. irregularis*, the unnamed genus
    inside *Fungia fungites*, Tubipora's lineages, *Cyphastrea agassizi*: reported when WoRMS or iNaturalist moves,
    never applied); a dated log of the changes each refresh found.
  - **The fish** (`build_species`, `python3 tools/taxonomy.py --subject fish`): every `fish.json` genus (role its
    circle, `app` its teaching family's scientific names) and every species, in the game or out (`species`: WoRMS's
    record of the name as written, else of the AphiaID `fish.json` gives it, `exact: false` for a spelling WoRMS does not
    know; the accepted name and AphiaID; the iNaturalist taxon `fish.json` gives it, its name when it differs, the taxa
    an inactive one points to; flags for a former combination, a moved genus, a spelling, iNaturalist differing from
    WoRMS and `fish.json` behind WoRMS); species rows for the names met that resolve to a fish species (`fish.json`'s own,
    the photo names of `fish-cand.json` and `fish-game.json`, FishBase's checklist); the genera of those names WoRMS no
    longer accepts. The WoRMS synonyms stay in `fish.json` `ref`. WoRMS by name and by AphiaID
    (`AphiaRecordsByAphiaIDs`), 50 a call; iNaturalist details, 30 ids a call.
  - A report, never a change: the game's names are Pierre's (rule C5). WoRMS batched (50 names a call), iNaturalist in
    bulk (the Scleractinia genera and species, 500 a page) and paced (~1 request/s, a User-Agent, 429 / 5xx retries);
    the replies cached in `tools/.cache/taxonomy.json`, so a rerun is offline and identical (`--offline`, `--refresh`,
    `--dry`); `--check` (offline, `tests/taxonomy.test.js`) checks the layout, `names.json` in step and the copied wording
    against `data.json`. Run it monthly, and before a content pull request that touches names or families.
  - **Its readers**: `inat_taxon(genus)`, the iNaturalist taxon `fetch_local.py`, `cand_gaps.py` and `coral_presence.py`
    search for a genus (`gen.<genus>.inat.id`: no search by name, no homonym guard; a genus the file does not hold, or
    with an inactive taxon, is skipped and said so; another taxon only by Pierre's decision); `aliases(name)`, through
    which `presence.py` matches checklist names.
  - **`names.json`**, written with the file (and alone, offline, by `--names`): the admin's extract,
    `{v, doc, coral: {date, sp: {name: {now, iname?, inat?}}, gen: {former genus: genus now}, worms: {genus: {id, fam}}}}`
    (the species rows, the former genus names that are no longer a genus of their own, and each genus's WoRMS AphiaID
    and family, for the corals' Photos › Tree WoRMS view; `fish: {date, sp, gen}`, no `worms`: the fish Tree reads
    `fish.json` `ref`). The admin loads every subject's section (`NAMEJ`, by subject id; `NAMES` the first subject's, for
    the corals' Tree), never `taxonomy.json`, and `presence.js` `nameFlag(p, nm)` puts a neutral **WoRMS: <name>** tag
    next to the source of a photo or candidate whose name (`t`) is a former name, a former genus or iNaturalist's
    spelling of a name WoRMS writes otherwise (`admin.js` `nameTag(p, S)`: in `srcTag` for the corals, the fish photo
    tiles, the fish Candidates card `admin-fish.js` `fishSrcTag` and Photo review's tiles; its tooltip says which).
    Information only: nothing is renamed (rule C1). A candidate fetched after the last refresh gets its row at the next.
- **`game_forms.js`**: the game photos with no growth form (`node tools/game_forms.js`), and `--apply FILE` writes a
  growth-form pass's guesses into `forms.json` `gf` / `gunsure` (never over Pierre's curation `gf`).
- **`apply_plain_sheets.py`**: the plain sentence of every genus (`gen` and `x.gen`) → `plain` (re-runnable;
  `build_extra.py` keeps it on a rebuild); its sources per genus in `tools/plain_sources.json`.
- **`apply_name_roots.py`**: the sourced roots of the coral genus names → `root` (re-runnable); the slate genera left
  without one, each with its reason (`SKIP`). The fish genus roots are `tools/fish_genus_roots.json`, read by
  `build_fish.py`.
- **`apply_id_tips.py`**: `tools/id_tips.txt` → `gen[g].qt`.
- **`apply_coral_apart.py`**: the coral slate pairs' tell-apart lines. It checks the hand-kept `tools/coral_apart.json`
  (every declared slate pair, Millepora's included, in `pairs` or in `none` with a reason; each side its own genus's
  words with its sources) and writes `data.json` `ap` / `apsrc` (`--check`: exit 1 when they differ,
  `tests/tellapart.test.js`; `--list`: the pairs with what the data says of each genus). Shown in the feedback sheet:
  [quiz.md › The feedback sheet](quiz.md#the-feedback-sheet).
- **`apply_imr_corrections.py`**: four IMR wordings Pierre corrected after the plain sentences' sources: Seriatopora,
  Lobactis, Heliofungia, Herpolitha (lecture notes, review slides, mnemonic, `sum`, `check` → `info`; the ID tips in
  `id_tips.txt`).
- **`apply_some_species.py`**: the traits of some species only (`gen[g].trs`): Favites `pali`, Goniastrea `plo` (species
  present in the Philippines by rule C6; its header gives the sources and why Dipsastraea gets none).
- **`apply_favites.py`**: Favites and its neighbours: sourced "Other sources" notes on Favites and Goniastrea (species
  recorded in the Philippines only, rule C6), Favites `sum` and size class `s3`, *F. magnistellata* in the slide 65 line,
  `spell` for Diploastreidae. Its header lists what was checked (iNaturalist counts, Corals of the World, WoRMS).
- **`apply_imr_forms.py`**: the IMR growth-form definitions into `forms.json`.
- **`imr_sources.json`**: where each IMR lecture photo in `img/` was found online
  ([study](../reviews/2026-11-15-imr-lecture-photo-sources-study.md)): per photo the deck's file name, `found`
  (`original`, `copy-only`, `none`), the source page and picture, the species and place it is captioned with, the
  photographer and the site's terms, the copies; `searched` says what was searched.
  `apply_imr_sources.py` reads it and credits each photo found as an original on its course record in `data.json` and
  `excluded.json` (`a` the credit, `pg` the page that states it; `--check`); the admin shows the traced sites' terms
  from its own copy of the file's `terms` (`admin.js` `LECT_TERMS`) (`tests/imrsources.test.js`).
- **`apply_book_rewrite.py`, `book_rewrite.json`**: the Coral Finder texts (criteria, summaries, look-alike sources, Coral
  ID Key box labels) that followed the book too closely, reworded in our own words (found by comparing each text with an
  OCR of its cited pages, outside the repository: a 6-word run shared, or 80% of its words in the book's order). The map
  keeps only hashes of the old wording and of its 5-word runs, never book text; `tests/booktext.test.js` fails when any of
  these fields shares a 5-word run with the old wording again (`--check`: exit 1 when a listed text has its old
  wording). `build_extra.py` holds the same new wording for the bonus genera.
- **`apply_no_book.py`**: takes every Coral Finder book crop record out of `data.json` and `cand.json` (`gen` `book`,
  the key boxes' `ph`); re-runnable, guarded by `tests/nobook.test.js`.
- **`apply_skeletons.py`**: the coral skeleton photos (rule P6): `skel: 1` on every record `judging/skeletons.json`
  lists, in `data.json` and `cand.json`, and on no other (`--check`: exit 1 when they disagree); `core.js`
  `applyCuration` drops them, the admin (`own`, `rawCands`) and `fetch_local.py` (`colonies`, the waiting count) skip them
  (`tests/skeletons.test.js`). Run it again after editing the list or rebuilding records (`build_extra.py`).
- **The one-time content passes**, `apply_covers.py`, `apply_look_sources.py`, `apply_sources.py`,
  `apply_review_slides.py`, `apply_cmp.py`, `apply_multi.py`: idempotent; they record how those fields were built.
- **`apply_loc_fix.py`**: hand corrections of a photo's `loc` (five Anacropora photos from Sabah labelled `ph` → `world`).
- **`calibset.js`** → `calibration-set.json`: the coral calibration set
  ([data.md](data.md#the-calibration-set-calibration-setjson), [LEARNING.md](../LEARNING.md) "The calibration set"):
  writes the file from `data.json`, `curation.json`, `quality.json`, `forms.json` and the file itself (sticky);
  `--check` (exit 1 when a run would change it: a member out of play, a genus short; by hand, not in CI, since Pierre's
  Publish can take a member out of play), `--progress STATS` (each member's answers from a saved `?stats=1` reply, the
  members at 20, the difficulty spread, what it can conclude); `tests/calibset.test.js`.

## Photos

- **`fetch_approved.py`, `fetch_local.py`**: the candidates' download and refill, run by the Candidate photos workflow
  ([photos.md › The Candidate photos workflow](photos.md#the-candidate-photos-workflow)). `fetch_local.py <Genus…>`
  limits a run, `--plan` shows offline what it would refill, `--tidy` runs the tidy step alone; it searches the
  iNaturalist taxon `taxonomy.json` gives each genus (`taxonomy.py` `inat_taxon`). `fetch_approved.py --games` (the
  workflow passes it) also downloads any photo of Millepora and the bonus genera still remote (`r: 1`, as
  `build_extra.py` imports them), so every game photo is hosted like the others; the other extra Dauin genera (Coral ID
  Key only) stay on iNaturalist.
- **`cand_gaps.py`**: the game genera short of candidates waiting (rule W20); Key-only genera are left out. It asks
  iNaturalist as `fetch_local.py` does (its `get`, paced with retries; the genus taxon from `taxonomy.json`).
- **`r2_move.py`**: lists what leaves `img/` (a photo with an online original) and what stays, by kind, owner and genus,
  with sizes; `--verify` checks each file on R2 byte for byte (R2's ETag is the file's MD5); `--apply` removes from `img/`
  the files R2 holds identically.
- **`photo_quality.py`**: the automatic quality rating → `quality.json`.
- **`photo_metrics.py`**: objective metrics (sharpness, size, colour cast) of live photos and iNaturalist candidates →
  `metrics.json`, the auto-sort's tie-breakers and sanity flags (`--live`, `--cand`, `--calib` against Pierre's ratings).
- **`find_dups.py`**: near-duplicates → `dups.json` (run it again after adding photos).
- **`tag_origin.py`**: the `loc` tag (`dauin` / `ph` / `world`) on iNaturalist photos.
- **`judging_manifest.py`, `judging_import.py`, `judging_cand.py`**: the outside photo-judging agent's package
  (`judging/`); `--check` validates.
- **`excluded.py`, `excluded.json`**: shared helper for the excluded photos: imports skip them, `drop_excluded` keeps
  what it removes in `excluded.json`, `restore_unexcluded` puts back what Pierre restored
  ([photos.md › Excluded photos](photos.md#excluded-photos)). `apply_excluded_archive.py` seeds `excluded.json` from git
  history; `--files` takes a restored lecture photo's file back from it.
- **`apply_ratios.py`**: the photo shape `ar` into `data.json` (the quiz's layout before the photos load); run it after
  adding photos (the workflow runs it too).
- **`inat.py`**: the one HTTP client of every tool that asks iNaturalist (rule C7; also WoRMS for `build_fish.py` and
  `taxonomy.py`). `get(url)` waits `PACE` after the last request to that host (1 s iNaturalist, 0.3 s WoRMS), sends the
  project's User-Agent (`UA`: `coral-id-imr/1.0 (IMR Reef ID)`, no personal address or account), retries a 429, a 5xx, a
  network error or a cut reply after `WAITS` (5, 15, 30, 60, 120 s; Retry-After when given, at most 300 s), never another
  4xx; `missing=True` reads a 204 / 404 as None. The batched counts: `leaf_counts` (`species_counts` for many taxa, exact
  where iNaturalist's leaf counting allows, else None to ask alone) and `observer_counts` (the distinct observers of the
  taxa with few observations counted from their observations read together, `observations/observers` for the others),
  used by `presence.py`, `build_fish.py`, `fish_commonness.py`; `chunks` for `id=` / `taxon_id=` lists.
  `tests/inat.test.js` runs it against a made-up iNaturalist (`tests/inatstub.py`).

## Fish

The fish content and photos themselves: [fish.md](fish.md), [fish-photos.md](fish-photos.md).

- **`build_fish.py`**: the fish content: `tools/fish_source.json` with the instance's layer, WoRMS and iNaturalist
  (cached in `tools/.cache/`) → `fish.json` ([fish.md](fish.md)); `--commonness` applies the species order again, offline.
- **`fish_common.py`**: the curated common names per fish species (1 to 3, written into `fish.json` `cn` by the build;
  `tools/fish_common.json`, its inputs `tools/fish_common_src.json`): `--inat` (batched, ~1 request/s), `--fishbase DIR`
  (the rfishbase parquet tables, pyarrow), then offline; `--check`. [FISH_PATH.md](../FISH_PATH.md) "Common names".
- **`fish_commonness.py`**: the fish species' commonness index within their entry (field counts near Dauin, IMR 24,
  iNaturalist observers in three rings; inputs `tools/fish_commonness.json`, `tools/fish_commonness_inat.json`), applied
  to `fish.json` by `build_fish.py`. `--fetch` asks iNaturalist (batched, ~1 request/s, cached); given entry ids, it
  prints each species' raw values. [FISH_PATH.md](../FISH_PATH.md) "Species order: the commonness index".
- **`fetch_fish.py`**: fish candidate photos from iNaturalist → `fish-cand.json`
  ([fish-photos.md › Candidates](fish-photos.md#candidates-from-inaturalist-toolsfetch_fishpy); `--plan` offline,
  `--only`, `--circle`, `--cap`; `--rep` tags the candidates that are their taxon's iNaturalist cover, 30 taxa a
  request; `--refill` refills the short species only and remembers the ones searched to the end in
  `tools/fish_refill.json`, run by the Candidate photos workflow).
- **`fetch_fishbase.py`**: fish candidate photos from FishBase → `fish-cand.json`, after `fetch_fish.py`:
  `--fishbase DIR` reads the rfishbase parquet snapshot (pyarrow) into `tools/fishbase_src.json`, then runs offline
  (`--plan`, `--only`, `--circle`, `--cap`); also the FishBase source of the sheet-only photos (`fish_photos.py --sheet`).
- **`fish_refs.py`**: the fish units' reference photos (iNaturalist covers and every taxon-page photo passing the game
  photo rules, FishBase's photos) → `tools/fish_refs.json`, by species, and `away`: the taxon-page photos outside the
  Indo-West Pacific, listed only with their rough region (`region()`; `--relabel` labels the list again after a change
  to it, offline); for every game species, every genus the game has (`game_genera`, the game's genus units as `app.js`
  `treeGenera` has them: every circle's, a surprise card's family excepted) and every entry's family; `--genera` asks
  only the genera with no reference photo yet and adds theirs, the rest kept (`add_genera`). Judged ones join the game
  photos ([fish-photos.md › Reference photos](fish-photos.md#candidates-from-inaturalist-toolsfetch_fishpy)).
- **`judging_fish.py`**: the fish candidate pass on the fish rubric (`judging/FISH.md` "Candidates"): contact sheets,
  `--check`, the import into `suggest.json` `fish`. `--subject seaslug` runs the same pass on the sea slugs' candidates
  (`seaslug-cand.json`) and rubric (`judging/SEASLUG.md`; `fish_judge.py` `RUBRICS`), files
  `judging/seaslug/<taxon id>.json`, imported into `suggest.json` `seaslug`.
- **`holdout.py`** → `fish-holdout.json`: the fish held-out set
  ([fish-photos.md](fish-photos.md#the-held-out-set-fish-holdoutjson-toolsholdoutpy)): writes the file from
  `fish-game.json`, `fish.json` and the file itself (sticky); `--check` (CI: the file is what a run writes), `--stats`
  (the exam units, families and scientific genera, that reach 15 held out, hold fewer, hold none; the
  species under 8 in practice); `FLOOR`, `RATIO`, `GENUS_KEEP` the variants' parameters, `--fresh` (a draw from nothing,
  never once the wiring ships). Run by the photo workflow after `fetch_approved.py`; `tests/holdout.test.js`.
- **`fish_draw_sim.js`**: the fish draw's easy share in the real app: `model.js` `photoSet` drawn per entry and stage of
  a player's level, the share of photos under ease 4 (`--photos FILE`, `--calib JSON`, `--entries`, `--draws`;
  Playwright, in the machine slot); [LEARNING.md](../LEARNING.md) "The fish draw in big pools".

## Sea slugs

The subject in the app: [seaslugs.md](seaslugs.md).

- **`build_seaslugs.py`, `seaslug_source.json`, `seaslugs.json`**: the subject's species list, app-free: the species
  rule C8 confirms in the Philippines (iNaturalist Research Grade over the subject's own area, WoRMS names), their
  commonness (distinct observers), "seen near Dauin", the popularity signals (English Wikipedia pageviews, mentions on
  the public pages the source lists), the stars set, the circles and the photo supply → `tools/seaslugs.json`, which the
  app does not read (`seaslug_game.py` writes the app's own files from it). Pierre's stars edits, the look-alike pairs
  and the photo target are in the source. Cached in `tools/.cache/`; `--check` derives the stars and circles again
  offline and fails when the copied look-alikes or photo target are not the source's; `--target` copies them in again,
  offline, nothing else changed (the cache is not needed). [Note](../reviews/2026-11-15-seaslug-list.md).
- **`seaslug_game.py`** → `seaslug.json`, `seaslug-game.json`: the subject's game data, from `tools/seaslugs.json`
  circles 1 to 3 (`CIRCLES`) and the judged candidates (`suggest.json` "seaslug"):
  - **The tree** in `fish.json`'s shape: a family or genus takes its best species' circle; the families' taxonomic
    groups come from the hand-kept `tools/seaslug_groups.json` (WoRMS's classification: `taxa` and each family's
    `tgroup`; a family in no group fails the build); the reference taxonomy `ref` and each genus's `ref`, its WoRMS
    genus, from `tools/seaslug_worms.json` (`seaslug_worms.py` below). The names: `en`, `ensrc` from
    `tools/seaslug_names.json`; the ID marks and tell-apart lines from `seaslug_cues.py`.
  - **The photos in play** in `fish-game.json`'s record shape: sure judgements only, the photo target's start and cap
    for every circle, `ph` "juvenile" as a fish record's phase.
  - **Pierre's curation** (`curation.json` `seaslug`, the sea slugs' part, `core.js` `SUBJECTS` `admin.cur`; written by
    the admin only, rule A1) reaches the file as the fish part reaches `fish-game.json` (`tools/fish_game.py` `in_play`,
    `record`, `gone_ids` with the part's key): a photo he removed, excluded (his part's or the top-level `exclude`, by
    photo id too) or moved with Not this is not in play, and the next sure photo takes its place under the cap; his adds
    (`add`, a species or a genus id) are in play whatever their judgement and never trimmed by the cap (no `auto`; named
    after the species he moved them to); his ease and tags are the record's, a count of other species one could take
    for the subject keeping a photo out (rule P3); his crop (the whole photo `[0, 0, 1, 1]` included) replaces the
    judge's and his rotation turns the files (`ro`), both made at the next `--r2` run (a photo on R2 whose crop or
    rotation changed is listed with its old files, `iv` bumped).
  - **The genus look-alikes** (`genus_looks`, from `tools/seaslug_lookalikes_cand.json`): a genus's `look`, the genera a
    literature set of the survey names with it (the Sea Slug Forum, Nudi Pixel's look-alike index, the papers; the
    set's members rule C6 keeps), are **declared**: `app.js` `treeGenera` adds them to its `look` (the family's other
    genera, `core.js` `treeGenUnits`) and its `decl` (the confusion groups), `UNITS.seaslug` `pairs` makes them the duels,
    and they stay look-alikes whatever the players answer. Its `dlook`, the genera across families only iNaturalist's
    identifications show (the file's genus pairs, not `genusOnly`), are **data** look-alikes: `treeGenera` `dl`;
    `model.js` `dataSeed` gives the pair the declared prior (`confPrior`, `CONF.LOOK`), so it is a trap and a data
    look-alike (`isDataLook`, `dataLooks`: duels, sheets) from the start, until the pooled answers bring its score under
    `CONF.TRAP`. `lsrc` holds each one's sources `[{t, u}]`, said on the sheets (`learn.js` `treeGenusLooks`,
    `treeGenusLookCard`: a genus's page, or the family's or the species' sheet it opens, `treeGenusLooksOn`). A pair
    inside one family adds nothing (the siblings already are look-alikes); the species pairs wait for the species level.
    A species judged later enters at the next build.
  - **The sea slugs without a species name**: a species of `tools/seaslug_informal.json` (*Goniobranchus* sp. 5 of Soong
    et al. 2020) joins the tree as a species of its genus when its label passes the presence rule beside C8
    (`tools/presence.py` `label_confirmed`) and its genus is in the tree: id `x:<key>`, no `inat` or WoRMS `ref`,
    `inf: 1`, `src` (its source, shown in small type beside its name: `learn.js` `spNameH`, `app.js` `taxonLine`; never a
    guide's number), `cite`, `doi`, `field` (the iNaturalist observation field, linked from its sheet: `learn.js`
    `spLinks`), its genus's circle, `present` from its label's counts; while the species are not units it is a species
    sheet, and its photos in play play for its genus.
  - **Genus-level photos**: the sure judgements of a genus's genus-level candidates are in play with `sp` the genus's id
    and `gl: 1`, at most the cap, once the genus's photos in play reach the start; `core.js` `treeGen` sends them to the
    genus's family and `treeGenUnits` (`treeGlOf`) to that genus unit only, never to a species (`app.js` `treeGenera`,
    `treeCurate` alike; `treeTaxon` names no species for them).
  - **R2**: `--r2 [--out DIR] [--max N]` downloads the photos in play that R2 lacks with the fish's pipeline
    (`tools/fish_game.py` `download`: an iNaturalist photo host only, Pierre's crop else the judge's, his rotation, the
    four sizes) into `r2-upload/`, and lists them without `r` (`ar`, `cr`, `iv`), the original kept as the fallback; a
    photo not downloaded yet, or whose download failed, stays remote (`r: 1`); a photo whose crop changed keeps its files
    until the next run makes them again (`iv` bumped). The offline build (the default, `--check`) keeps what the
    committed file has on R2, so it writes the same file. `--plan`: what `--r2` would download, by circle, and the R2
    volume. The Candidate photos workflow runs `--r2` while its `SEASLUG_R2` is `on`; `tools/photos.py` `DATA` lists
    `seaslug-game.json`, so `tools/r2_sync.sh` checks the bucket holds the sea slugs' files once they are on R2.
    `tests/seaslug-game.test.js` (the R2 step on a fixture, the host stubbed).
- **`fetch_seaslugs.py`** → `seaslug-cand.json`: the sea slugs' candidate photos, data only (nothing downloaded, judged
  or uploaded here):
  - per species of `tools/seaslugs.json` circles 1, 2 and 3 (`--circle`), the photo target's 20 candidates (+5 Life
    Stage: Juvenile places for a documented juvenile form, `photoTarget.juvenile`: *Hexabranchus lacer*), one photo per
    observation (rule P4), Research Grade, CC0 / CC BY / CC BY-NC (rule P1), observations annotated Egg dropped
    (`photoTarget.exclude`), the Philippines as one pool, then the fish's Indo-West Pacific box when short;
  - **Pierre's own observations: the fish's rule** (rule P1's fish exception, rule S2): identified to the species
    they are usable even when Needs ID (`ni`), his photos whatever their licence, read by `fetch_fish.usable_obs`
    itself; asked on his own search (`--own`: that search only, every species together) and taken first, so none is left
    out: in the target on a new list, on top of a list already full up to `max` (30); never boosted, judged on the rubric
    like any candidate;
  - it reuses `fetch_fish.py`'s searches, cache and pacing (~1 request/s, cached in
    `tools/.cache/seaslug_photos.json`). The file has `fish-cand.json`'s shape and record fields, keyed by the species'
    iNaturalist taxon id, `f` = `seaslug-<taxon id>-cand-<photo id>` (the docstring lists the differences);
  - **The sea slugs without a species name** ([study](../reviews/2026-11-17-seaslug-undescribed-species-study.md)):
    `--informal` measures the presence of each species of `tools/seaslug_informal.json` (its label's observations and
    distinct observers in the Philippines and near Dauin, `v1` counts, written into its `presence`) and, when
    `presence.py` `label_confirmed` passes, takes its candidates as a species' (20, keyed by its `key`) from the
    observations in the Philippines carrying its label at its genus, agreed;
  - `--genus-level` takes, for each genus unit (the genera of circles 1-3), observations in the Philippines identified
    at that genus and **agreed** (`agreed`: Research Grade at the genus, or 2 current identifications at the genus or
    below it and none off its line; a coarser one on its line does not disagree), 20 a genus (the photo target's
    `candidates`, never above `max`), keyed by the genus's name, each record `gl: 1` (a photo of the genus, never a
    species'); eggs, Dead, share-alike and ND out, one photo per observation, never an observation twice (`--informal`
    first). The genus ids come from one species of each genus (`v2/taxa`, its ancestors, 30 a request); the genus-level
    searches are batched, 30 genera a search read to its end (`id_below`). Both wait in
    `tools/judging_fish.py --subject seaslug todo` (by key and by genus name);
  - **The very variable genera's ceiling**: a species of a genus in `photoTarget.maxGenera` (*Chromodoris*, *Phyllidia*)
    has `max` (30) as its target (`target`), never above it; a very variable genus's genus-level list takes the 30 too,
    any other keeps 20;
  - **Egg masses and rule P4**: the target counts the candidates still usable, as the fish's cap does: one judged an egg
    mass (`suggest.json` `"seaslug"` `{egg: 1}`, the egg rule's filter 2) counts nothing (`held`), and an observation
    whose every candidate is one brings its next usable photo first (`eggs_back`: asked again by id, every observation
    with an egg-mass candidate in the run's lists in one request, under a new candidate's rules; for a species with no
    name, still its label, its observation fields read), the egg-mass record kept beside it (its judgement keeps it out
    of play); `--suggest` names the judgements read.
- **`seaslug_names.py`, `seaslug_names_src.json`** → `seaslug_names.json`: the English common names and nicknames, for
  every family, genus and species of circles 1 to 3, as information (never a choice), each name with its sources (rule
  C2): iNaturalist (its preferred English name and its English lexicon, Latin script only; `/v1/taxa`, 30 a request
  through `tools/inat.py`), WoRMS (English vernaculars; the genera's and families' AphiaIDs by
  `AphiaRecordsByMatchNames`), English Wikipedia (the article's own English title, the intro's "known as" / "nicknamed"
  names, the redirects that are no scientific name; 20 titles a request), the guides of the hand-kept source (an index
  page's links named by a scientific name: Florent's Guide; one page per species, its heading: SEASLUG.WORLD), and the
  names read by hand on public pages (`web`: the page, its words, the date). About one request a second to each API, 2 s
  between two pages; a page that refuses is recorded, never worked around. A name is a nickname when its source says so.
  A name given to two taxa (`shared`) goes to `points.json` (rule C5). Cached in `tools/.cache/`; `--check` derives the
  merge again offline from the committed raw replies and fails when a taxon of the game is missing. `seaslug_game.py`
  copies the names into `seaslug.json` (`en`, `ensrc`). `tests/seaslug-names.test.js`.
- **`seaslug_cues.py`, `seaslug_cues.json`**: the sourced ID marks: `seaslug_cues.json` holds, by genus and by family, 1
  to 3 short visible features in our words (`marks`, each line with its sources: `src` {t, u} and where in it), and
  `none`, a circle-1 genus left without marks and why. `seaslug_cues.py` (`apply`, run by `tools/seaslug_game.py`
  `build`) checks them (a source on every line, https, at most 80 characters, no number, a species named only among the
  genus's game species, rule C6; every circle-1 genus in marks or none; every source used) and puts `marks`, `msrc`,
  `mby` on `seaslug.json`'s genera and families, as on a fish genus (`tools/fish_genus_marks.json`), so the fish engine
  shows them unchanged: `learn.js` `genMarks` and `fishMarks` on the sheets, `app.js` `treeGenera` in the quiz feedback
  ("ID marks (Sea Slug Forum, …)"); `python3 tools/seaslug_cues.py` prints what it covers. Its `apart` holds the
  declared genus pairs' tell-apart lines (`apart_of`, the same checks, on a declared pair only, one side or both) and
  `apartNone` the pairs left without one, with why; every declared pair is in one of them
  ([quiz.md › The feedback sheet](quiz.md#the-feedback-sheet)). The sheets speak the sea slugs' words through `app.js`
  `UNITS` `words` (`learn.js` `sheetWord`); the fish keep their own words by default. Sources consulted:
  [2026-11-18-seaslug-cues-sources](../reviews/2026-11-18-seaslug-cues-sources.md). `tests/seaslug-cues.test.js`.
- **`seaslug_lookalikes.py`, `seaslug_lookalikes_source.json`** → `seaslug_lookalikes_cand.json`: the look-alike
  candidates ([survey](../reviews/2026-11-17-seaslug-lookalikes-survey.md)); the app does not read the file:
  `seaslug_game.py` `genus_looks` takes its genus pairs into `seaslug.json`, the species pairs wait for the species
  level, and the decided pair stays in `tools/seaslugs.json` `lookalikes`. It gathers iNaturalist's similar species for
  each species and genus of `seaslug.json`, in the Philippines and worldwide, with their observations (`--pull`,
  ~1 request/s through `tools/inat.py`), the references WoRMS cites, the comparing sentences of English Wikipedia and of
  GBIF's descriptions, and the hand-kept literature sets (Sea Slug Forum, Nudi Pixel, papers; each with its source and
  quote), into pairs and groups whose members are in the subject or confirmed in the Philippines (rules C6, C8), the
  others apart with why; the raw replies in `tools/seaslug_lookalikes_pull.json` (`--pull PARTS` asks one part again);
  `--check`. A species of the tree with no iNaturalist taxon (no name yet: the `x:` ids) is left out of its iNaturalist
  parts. `tests/seaslug-lookalikes.test.js`.
- **`seaslug_worms.py`** → `seaslug_worms.json`: the reference taxonomy from WoRMS, for Photos › Tree's Key | WoRMS
  views: `AphiaClassificationByAphiaID` for every species of `seaslugs.json` and every family of `seaslug_groups.json`
  (and `AphiaRecordsByName` for a genus no species' classification names), one request a second through `inat.py`,
  cached in `tools/.cache/seaslug_worms.json`; it writes `nodes` {AphiaID: {name, rank, parent}} from the class
  (Gastropoda) down and `genera` {name: AphiaID}, which `seaslug_game.py` puts into `seaslug.json` `ref` and each genus's
  `ref`. `--check` offline (the shape and the coverage of `seaslugs.json`; equal to what the cache gives when it is
  here), `--report` the game's grouping against WoRMS (rule C5: listed, never settled). `tests/seaslug-worms.test.js`.
- **`seaslug_lit.py`, `seaslug_lit_source.json`, `seaslug_lit.json`**: the literature watch (new names come from the
  literature; [scan](../reviews/2026-11-17-seaslug-literature-scan.md)), read by people, never by the app or a build: it
  compares `tools/seaslugs.json` with WoRMS today (our species' status, family, genus and their 2018+ sources; every
  species of our genera, and of the source's `extraGenera`, described since `since`, with its original description) and
  iNaturalist's Philippine counts (rule C8 through `tools/presence.py`), into `look` lists: `rename`, `placement`,
  `genus`, `add`, `watch`, `inList`, `revised`, `named` (the hand-kept links from an informal "sp. N" label or an old name
  to a published name, each with its paper), `unnamed` (the informal labels still without one). Network replies cached
  in `tools/.cache/seaslug_lit.json` (WoRMS 0.3 s, iNaturalist through `tools/inat.py`, rule C7); `--derive` rewrites
  `look` from the committed `raw` and the current species list, offline; `--check` (offline) fails when `look` is not
  what `raw` gives (`raw.list`: the species list of the pull), and only reports a later change to `tools/seaslugs.json`.
  It changes no game data: a proposed change goes to a pull request of its own, a discrepancy to `points.json` (rule C5).
  `tests/seaslug-lit.test.js`.

## The instance

- **`instance.py`, `instance.json`, `instances/`**: the instance (id, name, centre) and its layer files, laid on the
  sources at build (`fish_source`, `coral_compose`; [data.md › The instance](data.md#the-instance)); `--check`: the layer
  files in their layout.

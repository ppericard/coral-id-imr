# Photos: which photo where, the files and R2, the coral candidates

Which coral photos each context shows, where every photo file lives (Cloudflare R2, the repository's `img/`), how the
app falls back when R2 fails, the coral photo sources, and the Candidate photos workflow that downloads Pierre's choices
and refills the candidate lists. This is the specification of what the code does now; why each part was decided is in
[docs/decisions/](../decisions/README.md) and the PRs. The photo rules are P1-P6 ([rules/photos.md](../rules/photos.md));
the coral records, the curation and the photo rights in [data.md](data.md); the fish photos in
[fish-photos.md](fish-photos.md); the sizes the app picks and a photo that fails in [loading.md](loading.md).

## Photos per context (`applySlots`, `CAP`)

Per genus and view, from the field photos and the IMR lecture photos (`data.json` `course`), never a photo with several
corals, never a coral skeleton (`skel`, rule P6: `applyCuration` has dropped it from every list before):

- **Order**: Pierre's pins (`feat`), then Claude's suggestions (`picks.json`), then the IMR photos, Pierre's own, the other
  observers', each by quality; at equal quality an open licence before CC BY-NC for the featured, sheet and Key photos
  (`rightsRank`, [data.md › Photo rights](data.md#photo-rights); the game list keeps the quality order alone); Poor last
  (an IMR photo is never rated Poor automatically).
- **Sheet**: the 3 featured and the next ones, 6 in all (`CAP.feat`, `CAP.sheet`).
- **Games** (`game`, one list per view): every field and IMR lecture photo kept, never `use: 'ref'`; the featured game
  photos first, then the IMR and Pierre's own before the other observers', each by quality, Poor last. No cap: newly
  validated candidates come into the games. The players' answers rate every photo (`photoDiff`, the online calibration
  `CAL`); a new photo starts with no prior difficulty. `gamePics()` reads the list.
- **Coral ID Key** (`idkey`): the featured photos and up to 5 other observers' photos (`core.js` `CAP.inat`), variety on
  purpose. The book path's box tiles show a drawing of each box's criterion, never photos (`proto/idkey.js` `BOXART`;
  [DESIGN.md](../DESIGN.md) "Lab drawings"); a box with no drawing whose genera are in no other box (the non-hard-coral
  group, the elongate free-living discs) shows those genera's covers. Once a growth form is picked (a Coral Finder box or
  an IMR form), each genus card in Mix leads with a photo tagged with that form (`formCover()` in `proto/idkey.js`:
  `formPhotos` / `imrFormPhotos`, IMR lecture first, then Pierre's own); the cover stays when it already shows the form,
  and a genus with no photo of that form keeps its cover.

## Served from Cloudflare R2

Every address of a site photo is `PHOTO_BASE` + `img/<f>…webp`, `PHOTO_BASE` in `core.js` (the bucket
`https://pub-934250f83b884a4f890497f2027ce251.r2.dev/` that `tools/r2_sync.sh` copies `img/` to, same paths,
`Cache-Control: public, max-age=604800`). It is the one switch: `''` sends the app, the admin and the Coral ID Key to the
site's `img/` for the photos with no online original and to their online original for the others, crops drawn (`AWAY`
true from the start in `app.js` and `admin.js`: the site has no copy of those). The addresses are built by `app.js`
`photoUrl()` / `loc()` (also `srcset`, `thumb`, Home's ReefCloud art) and `admin.js` `img()`; `ownPhoto()` tells a site
photo (on R2 or the site) from an iNaturalist one, and `resized()` keeps the base.

**Fallback**: an `<img>` whose R2 file fails is asked from R2 once more 800 ms later (`core.js` `photoRetry`, for a
passing error; under the service worker the worker does that retry), then moves to the photo's **online original** when
it has one (`src` in `data.json` / `cand.json` / `fish-photos.json` / `fish-game.json`: iNaturalist, Pierre's own
iNaturalist photos, FishBase), at a light size, never the original file: iNaturalist `small` (240 px) for our 240 px
file, `medium` (500 px) for 480 px, `large` (1024 px) for 960 and 1600 px, FishBase's one file as it is (`core.js`
`photoOnline`). A photo with none (the IMR lecture photos, the page art) moves to the same file on the site's `img/`.
`photoFallback` rewrites `src`, `srcset`, `data-lo` and the game backdrop's inline style through `photoAway`, which finds
the photo's record by the file name in the address (`photoFileOf`) in an index of every photo record (`photoIndex`).
Both act only on an R2 address, told by parsing it as a URL (`photoOnR2`: its origin is `PHOTO_BASE`'s, compared
whole; `photoHasR2` tests each address of a `srcset` or style so): an address that only names R2 in its path, query or
user part, or a look-alike host, is left alone. `photoFail` in `app.js` is a capture listener on `document`, before
every other; the admin has the same.

- Without a service worker, `R2` then turns false and `AWAY` true for the rest of the visit, so the next photos go there
  directly (`loc()`, `resized()`; the quiz preloads, which are no page elements, do the same in `pump()`).
- Under the service worker both stay as they are: the worker keeps photos offline under their R2 address and fails at
  once while R2 is out, each photo falls back on its own, and its 480 px step (`data-lo`) and backdrop stay on R2, where
  an offline copy may be.
- The usual retries ([loading.md › A photo that fails](loading.md#a-photo-that-fails)) then apply to the new address.

**Crops**: the site's files have Pierre's crop baked in (`cr`, `tools/fetch_approved.py`); the original has not. Once a
photo falls back, every `<img>` added or given a new `src` is watched (`cropWatch`, a `MutationObserver`, only from the
first fallback on), and a cropped photo shown from its original gets the crop drawn with `object-view-box` (`core.js`
`photoCropOf`, as the admin's crop preview); a browser without `object-view-box` (Safari, Firefox) shows the whole photo.

**Rotations**: the files have Pierre's rotation baked in too (`ro`, "Photo rotation" in the admin); the original has
not, so the app makes the file's picture itself. From the first fallback on, the same watch finds every element using a
turned photo's original (`app.js` `turnSet`: an `<img>`'s `src`, `srcset` and `data-lo`, an inline style's `url()`, so
the game's backdrop `--qbg` and the lightbox's placeholder) and gives it the original cut and turned in a canvas as the
workflow does (`turnPlan`, `turnJob`: a `blob:` address, one per address for the visit, the crop baked in, so no
`object-view-box`); every page then shows it at its file's shape with no layout of its own (the quiz's fit, the lightbox
at actual size and its labels, the sheet tiles). Meanwhile the element shows none of the original. A picture that cannot
be made (FishBase sends no CORS header, so its canvas is tainted; a failed download) is given up at once: a game photo or
a card's becomes the "photo missing" tile through the usual error listeners, another photo is hidden; never a photo the
wrong way up. The admin's fallback draws it: its error handler gives the photo its published rotation (`admin.js`
`photoRoOf`, the record found as `photoCropOf` finds its crop) as `data-rot`, which `rotFit` turns once the original has
loaded.

The CSP of `index.html` allows the originals' hosts (`tests/csp.test.js` checks every host in the data;
[site.md › Security model](site.md#security-model)).

## Where the files are

- **On R2 only**: every downloaded photo with an online original (`src` and no `r`: `tools/photos.py` `online()`), its
  fallback being that original.
- **In git** (`img/`): only the photos with no other backup: the IMR lecture photos, the page art and the old candidate
  files that only `curation.json` names. No Coral Finder book crop (copyrighted).
- **What keeps it so**: `tools/fetch_approved.py` writes the photos it downloads to `r2-upload/` (gitignored, never
  `img/`) and sets their `ar`, and `approved-photos.yml` uploads that folder (`tools/r2_sync.sh r2-upload`) before it
  commits `data.json`, so `data.json` never marks downloaded a photo R2 lacks. `tools/photos.py --check` (CI) fails on a
  photo with an online original back in `img/` and on a missing file of a photo with none. `tools/r2_move.py` moves files
  out of `img/` once each is found on R2 byte for byte (R2's ETag is the file's MD5).
- **A tool that reads a photo's pixels** opens `photos.path(f, size)` (the file in `img/`, else a copy from R2 kept in
  `tools/.cache/r2/`: `photo_quality.py`, `photo_metrics.py`, `find_dups.py`, `apply_multi.py`; `judging_manifest.py`
  gives the R2 address). The smokes answer R2 and iNaturalist from the local files, an R2-only photo with a stand-in of
  the same size (`tests/photostub.js`).
- **Sizes**: WebP, four sizes on the long side: 1600 px `img/<f>.webp`, 960 px `img/<f>-m.webp`, 480 px
  `img/<f>-s.webp`, 240 px `img/<f>-t.webp` (`tools/photos.py`: `save()` for every tool that writes photos;
  `python3 tools/photos.py` fills the missing smaller files; `--check` in CI). No Git LFS. Typical sizes: 1600 px about
  140 KB, 960 px about 70 KB, 480 px about 30 KB, 240 px about 10 KB.
- The old copies of the files that left `img/` stay in `.git` until the history rewrite ([HANDOVER.md](../HANDOVER.md)
  "Photos out of the repo, step 3").

## Uploading to R2

`photos-r2.yml` (a push to `main` changing `img/`) and the `r2` job of `approved-photos.yml`, in the concurrency group
`photos-r2`, copy `img/` to the bucket (its public address above, CORS for the site and localhost) with
`tools/r2_sync.sh`: rclone, the official release pinned to one version in the script and checked against its SHA-256
before it runs (never the runner's apt package), and an R2 API token limited to that bucket (Object Read & Write), from
the repository's secrets; files are compared by checksum. **Nothing is ever deleted from the bucket** (`rclone copy`: a
sync from `img/` would wipe the R2-only photos), and the run then checks the bucket holds the four files of every
R2-only photo (`photos.py --r2-list`), failing otherwise. The `photos` job of `approved-photos.yml` uploads the photos
`tools/fetch_approved.py` downloaded (`tools/r2_sync.sh r2-upload`, which fails without the secrets) before it makes its
commit (pushed by `photos-push`).

## Coral photo sources

- **The IMR Lecture 6 deck** (internal use at IMR only): cut from the full-resolution PowerPoint media
  (`2026_L6_CoralID.pptx`, its `ppt/media`, on Pierre's Drive: [HANDOVER.md](../HANDOVER.md) "External resources"), never
  from the Google Slides copy, which is compressed. A slide's picture is found in the media through the slide's
  relationships file (`ppt/slides/_rels/slideN.xml.rels`), then matched by content. Each file keeps the framing the slide
  shows; a picture stretched on its slide (`imrl-p8_i6`, `imrl-p9_i7`, `imrl-p45_i3`, about 15 % wider than the
  original) takes the slide's region at the original's true proportions, without the stretch. Many originals are browser
  screenshots.
- **Pierre's iNaturalist observations**.
- **Other iNaturalist observers**: CC0, CC BY or CC BY-NC, never share-alike; Research Grade, a genus-level community ID,
  or, in the Philippines only, a current identification at the genus or below by the trusted expert `thamnasteroid`
  (by far the top identifier of stony corals in the Philippines) that no other current identification disagrees with
  (`tools/fetch_local.py` `EXPERTS`, `expert_ok`). An identification on the same line of descent agrees, so an observer's
  coarse "Stony corals" refined by him to the genus is accepted (iNaturalist then has no genus-level community taxon),
  while another genus or a taxon off that line refuses; withdrawn identifications do not count, and an expert
  identification above the genus is refused. Abroad: Research Grade only, and the presence rule.
- **No Coral Finder 2022 book photo** (copyright R. Kelley / BYOGUIDES).

## The Candidate photos workflow

New candidates are not stored: they are shown from iNaturalist until Pierre adds them.
`.github/workflows/approved-photos.yml` runs on every `curation.json` push (its other triggers: [PAGES.md](../PAGES.md)
"Workflow inventory and triggers"). It checks out the latest `main` (a run queued behind another starts from that one's
commit, so no Publish is lost), then:

1. `tools/fetch_approved.py` downloads the added photos (Pierre's crop applied, then his rotation) into `r2-upload/`,
   uploaded to R2 before the commit (they have an online original, so they never go to `img/`).
2. `tools/fetch_local.py` refills the candidate lists. The caps per genus are counted in observations waiting: 15 near
   Dauin, 6 elsewhere in the Philippines while a genus has fewer than 15 Dauin photos.
   - **A Key-only genus** keeps at most as many observations waiting, over all sources, as the colonies it still lacks
     (`key_need`: `CAP.sheet` = 6 per Colony and Close-up view, Close-up = macro for a 2-level genus, minus the distinct
     observations of its curated photos there). They are counted as the admin's `gamePool` counts them, one rule mirrored
     in `colonies()`: the `data.json` views with the curation's `move`, `hide`, `add` and `out`, views as `viewOf` (medium
     joins Colony only for a genus switched to 2 levels by the curation), no sheet-only (`use: 'ref'`), extra,
     multi-coral, book or excluded photo, and in Colony no photo whose growth form is not visible unless the genus has
     one form. `tests/pages.smoke.js` checks that the admin and the script agree on the real data, genus by genus. Needs
     ID colonies count, as in the admin's `gamePool` for a genus that is not played; a waiting candidate counts only when
     its guessed view is one of those two and still lacks colonies, as the admin's swiper shows it, so a full view's
     candidates never hold the room another view needs. A genus that lacks none is not refilled (no iNaturalist
     request).
   - `--plan` prints offline, as JSON, what a run would refill (`tests/genera.test.js`).
   - Each observation brings all its photos (up to 12, a guard only): Pierre takes at least the colony, a closer view and
     a macro, a game question shows the views of one colony, and the order of an observation's photos says nothing about
     their zoom, so sorting by view, quality and near-duplicates is the judging pass's job.
3. `tools/fetch_local.py --tidy` runs last (below), then the workflow commits `data.json` and `cand.json` (and `img/`,
   only for a missing smaller size of a photo git keeps) (`tests/coralcand.test.js`).

## Excluded photos

`tools/excluded.py` makes every import skip excluded photos (by file name and iNaturalist photo id); `drop_excluded`
(run by `tools/fetch_local.py` after each publish) takes them out of every photo list, except a candidate the auto-sort
excluded (`exclude[f] = 'auto'`), whose entry stays in `cand.json` so that its Undo can bring it back; excluded, it is
neither shown nor counted as waiting.

Each record Pierre's exclusion removes is kept in **`excluded.json`** (`{photos: {f: {in, g, k, v, i, p}}}`: which list,
genus, views or more, view, position and the record; one photo per line, written through `datajson.py`; seeded from git
history by `tools/apply_excluded_archive.py` for the photos removed before it existed), so that his **Restore** (admin
Genera › Excluded) brings the photo back by itself at the next run, at its place (`restore_unexcluded`). A candidate comes
back marked `restored: 1`, which the share-alike drop spares (a share-alike one he restores stays a candidate he can
add). A photo with no online original (an IMR lecture photo, whose file left `img/` with its exclusion) is held in
`excluded.json` until its file is back: the workflow (whole history, `fetch-depth: 0`, `filter: blob:none`) runs
`python tools/apply_excluded_archive.py --files` before `tools/photos.py`, which takes the file back from git history,
so it returns with its files; one whose file is nowhere in the history stays held, said in the run's log.

Both run in `fetch_local.py` `tidy()`, which ends every refill and runs alone, offline, as
`python3 tools/fetch_local.py --tidy`: restored photos back, excluded ones out (into `excluded.json`), then the waiting
share-alike candidates dropped, and `dump_all` splits `data.json` / `cand.json` again; `datajson.curated()` (the
candidates `curation.json` uses) leaves out any excluded id.

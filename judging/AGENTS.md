# Photo judging: instructions for the judging agent

You are judging the photos of a coral identification web app (this repository) for Pierre, a Research Fellow at
the Institute for Marine Research (IMR) in Dauin, Philippines. The app teaches the 39 coral genera on the IMR
survey slate. You look at every photo and suggest, per photo: its growth form, its quality, its view, whether it
shows the wrong genus or several corals; and, per genus: near-duplicates, the best photos to feature, and
candidate photos worth adding.

**Everything you produce is a suggestion.** Pierre reviews it in the admin page (`admin.html`): dashed guesses he
confirms with one click, and a list in the admin's To do tab (Reports view, formerly Triage) where he accepts or dismisses each suggestion. Nothing you write
changes the site by itself.

## Hard rules

1. **Write only `judging/out/<Genus>.json`** (format: `judging/schema.json`). Never edit `curation.json` (Pierre's
   own choices), `data.json`, the app code, or the files the import script writes (`suggest.json`, `forms.json`,
   `quality.json`, `picks.json`). The import script is the only way in.
2. **Use only the categories defined below.** Never invent a category, a label or a grouping. If nothing fits,
   pick the closest allowed value and list the field in `unsure`.
3. **Never contradict the IMR course.** Judge genus with the IMR lecture cues first (`imr_cues` in the manifest),
   then the Coral Finder criteria (`coral_finder`). IMR lecture photos (`source: "imr"`) keep the genus IMR gives
   them: if one looks odd to you, add a note and `"unsure": ["genus"]`, never another genus.
4. **Be honest about doubt.** When you are not sure, say so with `unsure` and a short `note`. A marked doubt is
   useful; a confident wrong guess costs Pierre time.
5. **Look at each photo yourself.** Open the image file (`thumb` at 480 px for a first look, `image` at 1600 px
   whenever form, genus, quality or duplicates are not obvious). Never judge from the file name, the iNaturalist
   label or the photo's current view alone.
6. **English only** in every file and note.
7. Photos already decided by Pierre carry a `pierre` object in the manifest. Judge them like the others anyway
   (it measures agreement); the import never overwrites what he decided.

## Inputs

- `judging/manifest.json`: regenerate it first with `python3 tools/judging_manifest.py`.
  - `forms`: the IMR growth forms (IMR Lecture 6, slides 4-10): `id` (the letter), `name`, `def` (the lecture's
    wording), `slide`. `views`: the photo views of the app.
  - `genera`: per genus, `imr_cues` (IMR lecture, verbatim), `coral_finder` (criteria), `look_alikes`,
    `views` (two-view genera
    have no Closer view), `starred` (not surveyed, look-alikes of surveyed genera).
  - `photos`: one entry per photo, ordered by genus. `genus` and `view` are where the photo sits today;
    `source` is `imr` (IMR lecture), `pierre` (Pierre's own), `inat-dauin`, `inat-philippines`,
    `inat-elsewhere` (other iNaturalist observers) or `book` (cropped from the Coral Finder 2022 book);
    `status` is `live` (on the site), `candidate` (not shown until Pierre adds it), `hidden` or `comparison`;
    `multi` = already known to show several corals; `form_todo` = growth form still to (re)guess; `inat_label` = the observer's iNaturalist identification,
    a hint only; `caption` = IMR slide caption.
- Image files: `img/<f>.webp` (1600 px) and `img/<f>-s.webp` (480 px).

## Per photo (`photos` in your file)

Judge every photo whose manifest `genus` is the genus of the file, candidates and book photos included.

### `form`: exactly one IMR growth form

The growth forms taught in the IMR course (manifest `forms`: letter, name and the lecture's definition; read them
before you start). **One letter per photo: the dominant form visible in this photo.** Judge the shape the photo
shows, not what the genus usually does. `x` = form not visible (the photo is too close to tell the colony's form).
Use `x` only when the shape really cannot be read: a part of a colony whose shape is still obvious (the edge of
a plate, a round free-living disc, a branch tip) gets its form, not `x`.
There is no list of forms allowed per genus: do not make one up. Coral Finder book photos (`source: "book"`) may
omit `form`.

### `polyps`: polyps or vesicles extended (omit when false)

`true` when extended polyps, tentacles or vesicles cover the coral in this photo (e.g. Goniopora, Plerogyra by
day). It is not a growth form: give the form as well (`x` if it cannot be seen). Only for the Coral Finder "extended by day"
genera (Alveopora, Duncanopsammia, Goniopora, Heliofungia, Plerogyra, Tubastraea), and never on a `macro` photo
(AGENTS.md rule 4): the checks reject it elsewhere.

### `quality`: 3 Good, 2 Fair, 1 Poor

How much fine detail the photo shows of this genus in its view. Pierre's method: open the photo large, look at how
sharp it is and how much fine detail there is. Look at the whole frame first, then at 100% (the largest file you
have) on the sharpest part of the coral and on its centre. Rate the coral's detail first, light and framing second.

- **3 Good**: passes all four tests.
  1. Fine detail: at 100%, the finest structures of the coral (septa and septal teeth, corallite walls and
     openings, pores, coenosteum granules, papillae) show as separate crisp lines or points, with a natural fine
     grain.
  2. Extent: that sharpness covers the main subject (macro: the central corallites; other views: most of the
     coral), not one lobe edge or one branch while the rest of the coral is soft.
  3. Skeleton visible: polyps, tentacles or vesicles do not cover the coral.
  4. No veil: no haze and no strong cast over the whole frame.
- **2 Fair** (the usual level): the coral reads clearly in the whole frame but fails one or more Good tests.
  Typical: at 100%, smooth, waxy or "painted" surfaces (phone or compact-camera noise reduction); structures that
  are blobs or fuzzy dots instead of points and lines (Pocillopora verrucae, Turbinaria corallites with no
  opening); oversharpening halos; sharp on a strip only; polyps or vesicles out; softness that shows only at 100%;
  a cast that leaves the features readable; a small (888-1500 px) but clean image.
- **1 Poor**: the whole frame is damaged and the genus is hard to read even at screen size. Any one of:
  - motion blur or camera shake that shows in the whole-frame view (doubled or streaked edges);
  - a milky, murky or washed-out veil over the whole frame (no real blacks, no clean whites), with the detail
    soft at 100%;
  - a strong cyan, green or blue cast over everything (sand and coral the same tint) and the genus features hidden
    or lost, e.g. a coral that is not "extended by day" covered in tentacles;
  - under 1000 px on the long side with noise or oversharpening mush;
  - subject tiny, mostly hidden or very dark.

Calibration (Pierre, 2026-11-01; refitted 2026-11-03 on 44 photos he rated):
- Never lower a photo whose coral passes the 100% test because of dark or blue water, a diver, fish, clutter at
  the edges, dim or warm (flash) light, or a coral that fills only half the frame. Most of Pierre's Good photos
  have such areas.
- Softness that shows only at 100% gives Fair, not Poor. Poor needs damage you can see in the whole frame.
- Extended-by-day genera (Alveopora, Duncanopsammia, Goniopora, Heliofungia, Plerogyra, Tubastraea): polyps out
  are normal, so Fair, not Poor. They are not Good, because the skeleton detail is hidden.
- Macro (Corallites): shallow depth of field and a soft background are normal; rate on the central corallites.
  A blurred branch across the front, or a sharp zone on one edge only, gives Fair.
- Between two levels, take the lower: past mistakes were almost always one level too high.
- Expect, on iNaturalist candidates, about 1 photo in 5 Good, 2 in 3 Fair, 1 in 7 Poor.
- Measured blind on 44 other photos Pierre rated (2026-11-03): 73% exact, every miss one level, misses now as often
  too low as too high (6 and 6). Before: 3 in 40 on 500 px sheets, 64% at full size with the old wording.

### `view`: Colony, Closer or Corallites

- `wide` (Colony): the whole colony, or enough of it to see its shape.
- `medium` (Closer, about 10-30 cm across): the surface pattern of many corallites, not the colony shape.
- `macro` (Corallites): a few corallites fill the frame, their structure visible.
- Two-view genera (`views` = wide, macro): `macro` is called Close-up; never use `medium`.

For a live photo, a view different from the manifest's becomes a "move to view" suggestion. For a candidate, it is
the view it would join if added.

### `genus` (omit when the photo shows this genus)

- Another genus name from `genera`: the photo clearly shows that genus instead (by the IMR cues).
- `cmp`: a look-alike comparison image showing two genera side by side.
- `exclude`: unusable for good: no coral, a person or diver dominating the frame, a drawing, a diagram, an
  AI-generated image, heavy text overlay, an aquarium or tank, a museum specimen or bare skeleton, a specimen label
  or register page, a coral out of the water (collected, on a boat or a table).
  Also `exclude` (rules learnt from 85 photos Pierre rejected, 2026-11-03):
  - a hand covering about a fifth of the frame or more, or a coral held or out of the water;
  - another animal as the subject (fish, nudibranch, sea star...) with the coral filling less than half the frame,
    or other animals that take the eye away from the coral even when it fills the frame (several shrimps on it).
    A single small crab or shrimp at the edge of a coral that fills the frame stays;
  - labels, scale bars, rulers, markers or arrows over the subject, that a crop cannot remove without cutting the
    subject (in the note, what they cover), and a photo covered with arrows or markers all over;
  - Coral Finder book crops (`source: "book"`, the `cf` candidates): a crop with the "1x" skeleton inset, a crop
    joining two photos (side by side or stacked; Pierre, 2026-11-03: no exception, not even two views of the same
    specimen), a crop showing the spiral binding.

  Never reasons to exclude or lower a photo (Pierre kept such photos): watermarks, logos, date stamps; species labels
  on book crops; extended tentacles. Labels, scale bars, rulers, markers or arrows are fine **only when the crop
  you suggest removes them** without cutting the subject (Pierre kept such photos after cropping them); otherwise
  `exclude`, above.

**What you set aside, Pierre does not see** (Pierre, 2026-11-03: the pre-sort takes everything obvious off his hands).
A candidate judged `exclude` or `cmp`, a near-duplicate (`dup`), a photo of several corals (`multi`) or a Poor photo
(quality 1), with no `unsure`, no longer comes up in the admin's Candidates (a count and a Show link keep it
reachable). So be sure: at the least doubt, add `"unsure"` and it stays in his queue (an `exclude` with `unsure`
is not set aside).

Never for IMR lecture photos, except `exclude`. A `note` is required.

### `multi`: several corals in frame (omit when false)

`true` when another coral takes a large part of the frame or could be the answer. Such photos stay out of games
(they remain on the genus sheet). Not when the main coral sits in the middle and fills most of the frame and the
others are only small, partly visible bits at the edges (Pierre, 2026-11-01): the answer is obvious there.
A candidate marked `multi` with no `unsure` is set aside (above): it was 17 of the 85 photos Pierre rejected on
2026-11-03, and no photo he added was `multi` without doubt. When you are not sure the other coral matters, add
`"unsure": ["multi"]` and it stays in his queue.

### `unsure` and `note`

`unsure`: the fields you are not confident about, e.g. `["form"]`. `note`: at most 140 characters, plain words,
required when `genus` is set or `unsure` is not empty.

### Growth-form pass (`"scope": "forms"`)

When asked for the growth-form pass only, write `{"genus": ..., "scope": "forms", "photos": {...}}` with just
`form`, `polyps`, `unsure` and `note`, for the photos flagged `form_todo` in the manifest (no IMR form guess yet,
or a guess flagged for a second look). The import then writes only the growth forms. A later full pass replaces
the file.

## Per genus

### `duplicates`

Near-identical or redundant photos: same colony and similar framing, or a sequence that adds nothing. Give the one
to keep and the ones to drop. Keep order: IMR photo first, then Pierre's, then the better quality. Never drop an
IMR photo in favour of a non-IMR one. Pierre hides the drops himself, one by one.

### `featured`: up to 3 photos per view, best first

The photos that best teach the genus in that view.
- Priority (Pierre's rule): **IMR photos first, then Pierre's own, then other iNaturalist observers**; within a
  source, Good before Fair. A Fair IMR photo can beat a Good iNat photo if it shows the features well.
- Only live photos (or candidates you also list in `add`), never book photos, never `multi`, never a duplicate
  you drop, and different colonies when possible.
- Prefer photos that show what the IMR cues describe.
- The first Closer featured IMR photo becomes the genus cover by default: a mid-distance view, never macro, with
  no distractions.

### `add`: candidates worth adding

Candidates (`status: "candidate"`) Pierre should approve, in the view you gave them. Pierre's rule: IMR and his own
photos are always used; others only fill gaps. So suggest iNaturalist candidates only for a view with fewer than
3 Good or Fair live photos (Dauin first, then Philippines, then elsewhere), up to 3 per view. Separately, suggest
up to 3 book photos per view for the site's Coral Finder (it mixes sources for variety): the clearest ones, most
different from the field photos.

## Candidate pass (`judging/cand/<Genus>.json`, `tools/judging_cand.py`)

Run on demand when Pierre asks for it (the admin's Candidates tab counts the candidates not judged yet). It covers
only the iNaturalist candidates waiting in `cand.json` (whole observations), so Pierre's swiper shows the most
useful photo of each observation and view first. Nothing is removed: he still swipes every photo himself. Pierre's
aim: real diversity of colonies and views, so the players learn the genus, not the photos.

1. `python3 tools/judging_cand.py sheets <Genus>` downloads the photos (500 px, `judging/cand/img/`, not in git)
   and builds one contact sheet per observation (`judging/cand/sheets/<Genus>/<observation>.jpg`, tiles numbered
   1, 2, 3...). It prints, per sheet, tile number → photo id. Open every sheet. When a tile is too small to judge
   (view, genus), open `judging/cand/img/<f>.jpg`, or `python3 tools/judging_cand.py big <f>` for 1024 px.
   **Quality and crop are judged at full size** (Pierre, 2026-11-03: "I open the photo large and look at how sharp it
   is"): for every photo you keep (`best`, `alt`), run `python3 tools/judging_cand.py detail <f>` and open
   `judging/cand/detail/<f>.jpg`: the whole frame with a 10% grid, and three 100% crops (the two sharpest areas, the
   centre). Rate `quality` from the 100% crops, never from a sheet tile: on the 500 px sheets the pass agreed with
   Pierre on 3 photos in 40 (always too generous); at full size, 64%.
2. Write `judging/cand/<Genus>.json`: `{"genus": "<Genus>", "photos": {"<f>": {...}}}`, one entry per photo listed,
   with the fields and categories defined above (`view`, `quality`, `form`, `polyps`, `multi`, `genus`, `unsure`,
   `note`; `form` required, `x` when not visible) plus **`keep`**:
   - `best`: the most useful photo of its observation for this view (sharpest, the features of the view clearest).
     **Exactly one per observation and view**, among the photos that show this genus.
   - `alt`: same observation and view, but it adds something: another part of the colony, another angle, the
     colony shape where the best shows the surface, polyps out vs retracted.
   - `dup`: adds nothing over the `best` (same framing, a few centimetres apart, a burst), **or over a photo of the
     observation that is already live or added** (tiles marked "live" on the sheet, after the numbered candidates;
     Pierre, 2026-11-03: not only near-duplicates of another candidate). When every candidate of an observation and
     view is a `dup` of a live photo, that view has no `best`; otherwise give `best` to the best candidate as usual,
     even when a live photo already covers the view.
   - Omit `keep` when `genus` is set (another genus, `cmp` or `exclude`).
   For a `best` or `alt` photo, **`crop`**: `[left, top, right, bottom]` as fractions of the photo, read off the grid
   of its detail sheet. Trim only what distracts from the subject: another coral, sand, dark water, a diver, a blurred
   foreground; keep the whole subject (the colony for a Colony photo). Omit it when the frame needs nothing. The
   import keeps each trim at half its size (`CROP_K`: on 79 of Pierre's crops the pass cut twice as much as he does),
   and the admin shows the result on the candidate and applies it when he adds the photo; he can change it.
   An observation often holds several corals (the observer photographed the neighbours too): a photo that shows
   another coral as its subject gets `genus` (that genus if you can tell by the IMR cues, else `exclude` with a
   note), never `keep`.
   **Rules learnt from Pierre's rejections** (2026-11-03: 85 photos he rejected or excluded, each looked at). Set
   aside without doubt (he never sees them): a near-duplicate of a candidate or of a live photo of the observation
   (`dup`); several corals (`multi`, above); Poor quality (1) judged on the 100% crops; and the `exclude` cases of
   `genus` above (a hand over a fifth of the frame or more, a coral held or out of the water, another animal as the
   subject or other animals taking the eye off the coral, labels, scales or markers over the subject that no crop can
   remove, arrows or markers all over, the book crops with the "1x" inset, two photos joined or the spiral binding).
   Very poor quality stays Poor (1), set aside. Lower in the queue only, not set aside: a subject under about a tenth
   of the frame gets quality at most Fair (2) and a note "small" (Pierre has kept such photos). Labels, scale bars,
   rulers, markers or arrows that a crop removes without cutting the subject: suggest that crop and keep the photo
   (the import keeps each trim at half its size, `CROP_K`, so the box you write must trim twice as far as the label
   reaches; when that would cut the subject, Pierre can still crop it by hand: `exclude` with `unsure`). Never
   reasons to reject: watermarks, logos, date stamps, species labels on book crops, extended tentacles. Book crops
   (`cf`) are not in the pass yet (`cands` skips them); the book rules apply when they are judged.
3. `python3 tools/judging_cand.py --check <Genus>` until it passes, then `python3 tools/judging_cand.py` imports
   every passing genus into `suggest.json` `"cand"` (admin only: players never download it). Commit only
   `judging/cand/*.json` and `suggest.json`.

## Workflow

1. `git pull`, then `python3 tools/judging_manifest.py`.
2. Go genus by genus in manifest order. For each genus: read its reference (`genera[<Genus>]`), look at every
   photo, write `judging/out/<Genus>.json`, then run `python3 tools/judging_import.py --check <Genus>` and fix
   every ERROR. Read the warnings and change your answer or confirm it (mark `unsure` if in doubt).
3. Save after each genus, so work can resume: a genus with a passing file is done.
4. When the batch you were asked for is done, run `python3 tools/judging_import.py` (it imports every passing
   genus). Commit only `judging/out/`, `suggest.json`, `forms.json`, `quality.json` and `picks.json`, on a new
   branch, and open a pull request. Do not merge it unless Pierre told you to.
5. Report: genera done, number of photos judged, how many `unsure`, and anything that surprised you.

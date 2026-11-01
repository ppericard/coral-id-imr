# Photo judging: instructions for the judging agent

You are judging the photos of a coral identification web app (this repository) for Pierre, a Research Fellow at
the Institute for Marine Research (IMR) in Dauin, Philippines. The app teaches the 39 coral genera on the IMR
survey slate. You look at every photo and suggest, per photo: its growth form, its quality, its view, whether it
shows the wrong genus or several corals; and, per genus: near-duplicates, the best photos to feature, and
candidate photos worth adding.

**Everything you produce is a suggestion.** Pierre reviews it in the admin page (`admin.html`): dashed guesses he
confirms with one click, and a Triage list where he accepts or dismisses each suggestion. Nothing you write
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

How well the photo teaches the genus in its view.
- **3 Good**: sharp where it matters, well exposed, natural enough colour; the features of this view (colony
  shape, or corallite pattern, or corallite detail) are clearly visible; the coral fills the frame.
- **2 Fair**: usable but with one real weakness: soft focus, strong blue/green cast, small or partly hidden
  subject, cluttered frame.
- **1 Poor**: hard to learn from: blurred, very dark or washed out, subject tiny or mostly hidden.

Calibration (Pierre, 2026-11-01; tools/quality_eye.json holds Claude's by-eye ratings of every field photo as
examples): judge each photo against what is normal for its view, never against the other views. A macro
(Corallites) photo is sharp on a small part of the frame by nature: shallow depth of field, a soft background or
soft edges are normal and do not lower the rating; rate it on the corallites in focus. Warm flash colours are fine.
Poor is rare (about 1 photo in 20): blurred everywhere, very dark, heavy haze or cast, or the subject too small.

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
  AI-generated image, heavy text overlay.

Never for IMR lecture photos, except `exclude`. A `note` is required.

### `multi`: several corals in frame (omit when false)

`true` when another coral takes a large part of the frame or could be the answer. Such photos stay out of games
(they remain on the genus sheet). Not when the main coral sits in the middle and fills most of the frame and the
others are only small, partly visible bits at the edges (Pierre, 2026-11-01): the answer is obvious there.

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
   (view, quality, genus), open `judging/cand/img/<f>.jpg`, or `python3 tools/judging_cand.py big <f>` for 1024 px.
2. Write `judging/cand/<Genus>.json`: `{"genus": "<Genus>", "photos": {"<f>": {...}}}`, one entry per photo listed,
   with the fields and categories defined above (`view`, `quality`, `form`, `polyps`, `multi`, `genus`, `unsure`,
   `note`; `form` required, `x` when not visible) plus **`keep`**:
   - `best`: the most useful photo of its observation for this view (sharpest, the features of the view clearest).
     **Exactly one per observation and view**, among the photos that show this genus.
   - `alt`: same observation and view, but it adds something: another part of the colony, another angle, the
     colony shape where the best shows the surface, polyps out vs retracted.
   - `dup`: adds nothing over the `best` (same framing, a few centimetres apart, a burst).
   - Omit `keep` when `genus` is set (another genus, `cmp` or `exclude`).
   An observation often holds several corals (the observer photographed the neighbours too): a photo that shows
   another coral as its subject gets `genus` (that genus if you can tell by the IMR cues, else `exclude` with a
   note), never `keep`.
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

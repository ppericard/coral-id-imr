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
  - `forms`, `views`: the allowed categories (from the Coral Finder key and the app).
  - `genera`: per genus, `imr_cues` (IMR lecture, verbatim), `coral_finder` (criteria), `look_alikes`,
    `coral_finder_forms` (the forms under which the Coral Finder key lists the genus), `views` (two-view genera
    have no Closer view), `starred` (not surveyed, look-alikes of surveyed genera).
  - `photos`: one entry per photo, ordered by genus. `genus` and `view` are where the photo sits today;
    `source` is `imr` (IMR lecture), `pierre` (Pierre's own), `inat-dauin`, `inat-philippines`,
    `inat-elsewhere` (other iNaturalist observers) or `book` (cropped from the Coral Finder 2022 book);
    `status` is `live` (on the site), `candidate` (not shown until Pierre adds it), `hidden` or `comparison`;
    `multi` = already known to show several corals; `inat_label` = the observer's iNaturalist identification,
    a hint only; `caption` = IMR slide caption.
- Image files: `img/<f>.webp` (1600 px) and `img/<f>-s.webp` (480 px).

## Per photo (`photos` in your file)

Judge every photo whose manifest `genus` is the genus of the file, candidates and book photos included.

### `form`: exactly one growth form

The Coral Finder front-page growth forms. **One letter per photo: the dominant form visible in this photo.**
Judge the shape the photo shows, not where the Coral Finder key places the genus. Pierre's call: tables and
plates are `P`, tabular Acropora included, even though the key's Branching sub-title mentions plates of branchlets.

| Letter | Coral Finder form | Sub-title in the key |
|---|---|---|
| `B` | Branching | Branches or plates of branchlets |
| `M` | Meandering | Meandering ridges and valleys |
| `S` | Massive or thick | Excluding meandering corallites |
| `P` | Thin plates and crusts | Vases, tiers, fronds, leafy, encrusting |
| `F` | Solitary or free-living | Mushroom corals and isolated polyps |
| `L` | Large daytime polyps | Tentacles or vesicles extended by day |
| `C` | Columns | Colonies of upright pillars |
| `x` | Form not visible | The photo is too close to tell the colony's form |

When the form you see is not in the genus's
`coral_finder_forms`, look again; if you keep it, the check script will ask you to confirm (or mark it unsure).
Coral Finder book photos (`source: "book"`) may omit `form`.

### `quality`: 3 Good, 2 Fair, 1 Poor

How well the photo teaches the genus in its view.
- **3 Good**: sharp where it matters, well exposed, natural enough colour; the features of this view (colony
  shape, or corallite pattern, or corallite detail) are clearly visible; the coral fills the frame.
- **2 Fair**: usable but with one real weakness: soft focus, strong blue/green cast, small or partly hidden
  subject, cluttered frame.
- **1 Poor**: hard to learn from: blurred, very dark or washed out, subject tiny or mostly hidden.

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
(they remain on the genus sheet).

### `unsure` and `note`

`unsure`: the fields you are not confident about, e.g. `["form"]`. `note`: at most 140 characters, plain words,
required when `genus` is set or `unsure` is not empty.

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

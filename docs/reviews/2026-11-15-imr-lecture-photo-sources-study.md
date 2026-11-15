# IMR lecture photos: where they come from

IMR Reef ID, 2026-11-15. A study of the ROADMAP row "Trace IMR lecture photos to their original source" (Pierre,
2026-11-04, rule P1). It changes no photo, credit or licence. The data is in
[`tools/imr_sources.json`](../../tools/imr_sources.json): one record per photo, with how it was searched and how sure each
finding is. Written for Pierre. The questions at the end wait for his morning.

Labels: **[measured]** = counted by a script today; **[looked]** = I opened the pictures side by side (rule W11);
**[read]** = taken from a page or a file; **[guess]** = my judgement, not checked.

## 1. Summary

- **120 lecture photos** are in `img/`: 118 play in the games (`data.json` `course`), 1 is the Acropora / Stylophora
  comparison picture (`cmp`) and 1 is excluded by Pierre (`imrl-p55_i2`) **[measured]**.
- **86 of the 118 game photos (73 %) come from Corals of the World** (coralsoftheworld.org, J.E.N. Veron and
  co-authors). Each one is the same picture as a species page's gallery picture, which names its photographer
  **[measured]**, and I looked at every pair side by side **[looked]**. Alchetron's copies of 8 of them point to an older
  image store of the site (`aimscoral`); the deck's screenshots date from 2018 to 2020. So the lecture most likely took
  them from that site's earlier version **[guess]**.
  None was found anywhere that gives it an open licence.
- **2 photos were found only as copies** on pages that name no photographer (aquarium sites, a YouTube thumbnail).
  **32 were not found** in what was searched, including the comparison picture and the excluded photo. Tubastraea
  accounts for 5 of them: Corals of the World has no Tubastraea pages.
- **None was found among the iNaturalist photos compared**: 2,104 in a first pass, then 5,863 in a second; the second
  repeats some of the first (§2). Pierre found some there on 2026-11-04. Those observations may lie outside what was
  searched (outside the Philippines, for example), or may be later reposts of these pictures **[guess]**.
- **No photo was found with an open licence.** Corals of the World's terms allow "personal, non-commercial use" and
  "academic and research purposes provided the appropriate citation, crediting Corals of the World". A photograph owned by
  a third party stays that party's ("The intellectual property rights remain with the third party"), and "all other
  intellectual property rights are reserved" **[read]**, [terms of use](https://www.coralsoftheworld.org/page/terms-of-use/).
  What to do with them is Pierre's decision: questions (a) to (e) in §6.

## 2. What was searched, and how a match was decided

| Where | What | Result |
|---|---|---|
| The deck (Google Slides copy of Lecture 6) | Title, description and link of each picture | Only file names. 64 of the 120 pictures are named "Screen Shot <day> at <time>", taken 2018-11-21 to 2020-10-26. No link, credit or source **[read]** |
| The files in `img/` | EXIF and XMP metadata | None **[measured]** |
| Yandex reverse image search | Each photo by its public R2 address. The first 60 pictures returned for each were downloaded and compared | 22 photos matched pictures online, mostly copies (Pinterest, aquarium shops, Alchetron). No captcha **[measured]** |
| Alchetron's copies | Each copy's `data-tronimagesrc` (where Alchetron took the picture from) | All 8 point to `commondatastorage.googleapis.com/aimscoral/…`, the old Corals of the World image store **[read]** |
| Corals of the World | Every species page of each genus under its current name and its former names (*Favia*, *Fungia*, *Symphyllia*, *Montastrea*, *Phymastrea*… from `tools/taxonomy.json`). 1,172 page addresses tried, 5,705 gallery pictures compared | 86 photos matched **[measured]** |
| iNaturalist (through `tools/inat.py`, rule C7) | First pass: taxon photos of each genus and its species, plus every photo of Philippine observations created up to 2020-10-31 (the deck's last screenshot is dated 2020-10-26), 2,104 photos. Second pass, for the 21 genera with a photo still untraced: every photo of their Philippine observations, any date and grade (Dauin included), 5,863 photos | No match **[measured]** |
| Wikimedia Commons | The first 40 pictures of a file search on the genus name, for the genera that still had untraced photos | No match in the genera it reached. Wikimedia throttled this session's requests, so the pass is partial: the genera covered are listed in `tools/imr_sources.json` `searched.commons` **[measured]** |

**A match** means the same picture, cropped or resized. Each IMR file was compared with each candidate using ORB features
and a RANSAC homography, which counts the points that agree on one geometric transform. Same-picture pairs scored 126 to
over 2,000 consistent points; every Corals of the World match scored 172 or more. Different photos of similar corals
scored at most 35; one such pair was an annotated *Dipsastraea* photo against a similar annotated figure. A thumbnail
about 100 px wide of the same picture scored 28 to 87, so Corals of the World was searched on its full gallery
pictures. The threshold is 100. Every Corals of the World pair at or above it was then looked at side by side, and so
were the copies of the two copy-only photos **[looked]**. The other copies listed for traced photos were not all
opened. No author or licence was guessed: a record carries one only when the page holding
the picture states it.

## 3. What was found

**By photographer** (Corals of the World's caption "Photograph: …", 86 photos) **[read]**: Charlie Veron 35;
Emre Turak and Lyndon DeVantier 15; Ed Lovell 5; Roger Steene 5; Russell Kelley, Rachel Pears and Phil Woodhead 5;
Neville Coleman 4; Valerie Taylor 3; Mary Stafford-Smith 3; Lyndon DeVantier 2; Len Zell 2; Russell Kelley 2;
Gerry Allen 2; Jim Maragos 1; Clay Bryce 1; Tamal Mondal 1. Eight of them were taken in the Philippines (all by Charlie
Veron) **[read]**.

**By how the deck holds them** **[measured]**: of the 64 pictures saved as screenshots, 55 are Corals of the World
pages, 1 is a copy-only and 8 were not found. Of the 56 pictures inserted as files, 31 are Corals of the World,
1 is a copy-only and 24 were not found.

**Names.** Corals of the World still uses the older names in several cases (*Fungia scutaria* for *Lobactis*,
*Favia* for *Dipsastraea*, *Symphyllia* for *Lobophyllia*, *Phymastrea* for *Favites*). Each record keeps the species
named by the source. Each is a synonym of the IMR genus (`tools/taxonomy.json` `spp`), so nothing contradicts the
lecture (rule C1) and no point goes to `points.json` **[read]**.

**The two copy-only photos** **[read]**:
- `imrl-p10_i2` (Stylophora): found only on two Russian aquarium sites. The earliest dated copy is a 2aqua.com forum
  thread whose first post is dated 2014-08-25; no author or source is named.
- `imrl-p19_i8` (Tubastraea): the same picture is the thumbnail of a YouTube video, "Sun Coral (Tubastrea) - Care and why
  I am giving mine up" (channel "Inappropriate Reefer"). The video's date could not be read from here, so I could not
  confirm whether the channel is the origin.

**Not found (32)** **[looked]**: 5 Tubastraea; 3 pictures that carry IMR's own labels or arrows (`imrl-p54_i6`,
`imrl-p55_i2`, the comparison picture `imrl-p8_i2`); and close-ups and colonies of Pocillopora, Stylophora,
Seriatopora, Echinopora, Galaxea, Turbinaria, Mycedium, Lobophyllia, Pavona, Pachyseris, Pectinia, Montipora,
Hydnophora, Danafungia, Lobactis, Dipsastraea, Diploastrea, Favites, Astrea and Acropora. They could be IMR's own,
from a book, or from a site not searched **[guess]**. Only someone who made the deck can say.

## 4. What the records say

For each photo, `tools/imr_sources.json` gives:

- the genus, slide and view;
- the deck's file name;
- `found`, and for an original the source: site, species page, picture address, the species and place it is captioned
  with, photographer, `licence: null` (the site states none per picture) and `terms: "cotw"` (the terms quoted in the
  file);
- the match score;
- for a copy-only photo, its copies and a note.

`tests/imrsources.test.js` checks that each record names a lecture photo the data files know (a Publish that excludes or
restores one keeps it valid), and fails on an author or a licence given without the page that states it.

The search scripts were one-off and are not committed: Yandex scraping and picture downloads by the thousand. This
section and `searched` in the file describe them closely enough to run the search again.

## 5. What this changes

Nothing in the app, its credits or the README's rights notice: that notice's wording is Pierre's, and it stays true ("being
traced to their original sources"). The ROADMAP row stays open, since credit or replace is Pierre's decision.

## 6. Questions for Pierre

**(a) The 86 Corals of the World photos: what do we do with them?** They are about three quarters of the corals' lecture
photos in the games. The app shows them publicly (GitHub Pages, R2) with an "IMR lecture" credit. The site's terms allow
non-commercial and academic use with a citation, and photographs owned by third parties stay theirs. Options:
- **A**: credit each one now, as "<photographer> / Corals of the World" with a link to its species page, and write to
  Corals of the World asking whether this free training app may keep using them. Writing to them is yours to send: it is
  sent outside the project.
- **B**: replace them with open-licence candidates as Pierre approves them (the admin's Candidates).
- **C**: keep them only in an IMR edition (ROADMAP "IMR lecture photos, second pass").

*Recommendation: A now. The credit is accurate and easy to change. Then B for any photo Corals of the World or a
photographer does not allow. C only if the IMR edition gets built anyway.*

**(b) Rule P1's priority for "IMR lecture photos first" (corals).** That priority assumed these were IMR's photos;
86 are not. Keep it for them, or let them rank like other observers' photos? *Recommendation: keep the slight priority
until (a) is settled. They are curated and of good quality, and ranking them down would bring forward photos Pierre has
not seen in those places.*

**(c) Russell Kelley's 7 photos** (5 with Rachel Pears and Phil Woodhead): `imr-p49_i7`, `imr-p61_i8`, `imrl-p44_i9`,
`imrl-p46_i7`, `imrl-p46_i8`, `imrl-p56_i11`, `imrl-p56_i13`. Pierre removed the Coral Finder book crops (© R. Kelley /
BYOGUIDES) on 2026-11-08. These pictures come from Corals of the World, not from the book. Treat them like the other 86,
or remove them now for consistency? *Recommendation: treat them like the others, under (a). They are a different
publication, credited by Corals of the World.*

**(d) The 34 photos with no source found** (32 not found, 2 found only as copies). *Recommendation: keep them as they
are, and ask the IMR trainer who made Lecture 6 which pictures are IMR's own. 24 of the 32 were inserted as files rather
than screenshots, which may mean own photos* **[guess]**. Replace any that turn out to be someone else's.

**(e) Where the credits go once (a) is answered.** *Recommendation: a small `tools/apply_imr_sources.py` writes the
credit `a` and source page `o` into each traced `course` record of `data.json`, from `tools/imr_sources.json`. It keeps
`imr: true` (so rule P1 and the rights class stay as they are until (b) changes them) and writes no `lic`, since none is
stated. The lightbox and the answer pill (rule P5) then show the photographer and link to the page. This is a data change
across 86 records, so it waits for (a).*

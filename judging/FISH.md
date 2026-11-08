# Fish photo judging: how easy is each game photo for a beginner

Pierre, 2026-11-04, after trying the fish beta: the first photos were too hard. Fish answers are not logged to the sheet
yet (`core.js` `SUBJECTS` fish `log: false`), so no player answer says how hard a fish photo is. Until they do, an agent
looks at every fish game photo and judges it on explicit criteria. The judgement gives each photo an **ease** from 1 to
5, which becomes its difficulty prior (`model.js` `photoDiff`): at the start the draw strongly favours the easy photos
through it (no wall since 2026-11-06). This file is the rubric, so the pass can be repeated by another agent or a person
and give the same kind of result.

Files: the judgements are `tools/fish_judge.json` (hand- or agent-made, like `tools/fish_source.json`);
`python3 tools/fish_judge.py` writes them into `fish-photos.json` (`e`, `jt` and a proposed crop `c` on each photo) and
prints the summary;
`tools/fish_photos.py` re-applies them whenever it rebuilds the photo list. `tests/fish.test.js` checks that every
game photo is judged (every circle and the winks), that every code is valid and that the caps below hold.

## How to look

1. `python3 tools/fish_judge.py --sheets <dir>` downloads every game photo at iNaturalist's `medium` size (500 px)
   into `<dir>/img` and draws contact sheets of 12 (4 x 3, each photo in a 300 x 225 cell, its number and the
   observer's species name above it, a 5 x 5 grid over it for the crops) into `<dir>/sheets`. Keep `<dir>` outside the
   repository; delete it after. `--only t28,t29` limits the sheets to some entries, `--todo` to the photos not judged
   yet (a new photo after a rebuild, a new entry).
2. Open every sheet and judge every photo on it. Open a photo on its own (`<dir>/img/<f>.jpg`) whenever the sheet does
   not settle a tag.
3. Judge what the photo shows, not the species: the same species can be easy on one photo and hopeless on another.
   The species name is a hint for the juvenile tag only (a juvenile is told by its colours against the adult's).
4. Never invent: when a tag cannot be read, take the value that makes the photo harder (between two levels, take the
   lower ease; the coral judging lesson: past mistakes were almost always one level too generous).

## Tags (one code per photo)

**Visual criteria only** (Pierre, 2026-11-04): the judge reads what it sees (how the fish is shown: view, whole, light, colour loss, clarity, size in the frame, whether the subject is obvious) and never the species. The species is the iNaturalist identification by human experts (Research Grade, or Pierre's own), taken as given: the judge does not say whether a photo shows the right species or whether its species is recognisable.

A code is seven characters, then the flags, then the ease digit: `p1g0sm14`, `p1g1sm1j2`. In order:

| Position | Tag | Values |
| --- | --- | --- |
| 1 | **view** | `p` profile (side view: the fish roughly parallel to the picture, its outline readable); `o` oblique (turned 20-60 degrees, or diagonal across the frame, the shape still readable); `h` head-on; `t` tail or rear view; `d` from above (dorsal) |
| 2 | **whole** | `1` the whole fish is in the frame and visible; `0` partial: cut by the frame (a heavy crop, a head close-up) or hidden by reef, coral or another fish so its shape cannot be read whole |
| 3 | **light** | `g` good (the fish well lit); `d` dim or dark (low light, the fish in shade); `n` night or flash on black (dark background, night colours) |
| 4 | **colour loss** | how much of the fish's colours the water took (Pierre, 2026-11-04: not a "cast", whose blue or green only follows the water and the light): `0` none; `1` slight (reds and yellows still visible); `2` strong (the warm colours mostly gone); `3` monochrome (only blue or green: deep water, low light) |
| 5 | **clarity** | `s` sharp; `m` soft (some blur, haze, noise, the fish still clear); `b` blurred or murky (backscatter, milky water, motion blur that hides the pattern) |
| 6 | **size** | `l` large (the fish spans a third of the frame width or more); `m` medium (a sixth to a third); `s` small (under a sixth) |
| 7 | **count** | `1` one fish (others, if any, tiny and far); `s` several of the same kind, the subject obvious (a pair, a school); `m` other kinds of fish too, the subject obvious; `x` the subject is not obvious (which fish is asked about?) |
| flags | `j` | a **juvenile**: the colours or shape of a young fish (e.g. the yellow-and-black stripes of a young *Scolopsis*, the white-blotched brown of a young *Plectorhinchus chaetodonoides*, a young batfish's long fins) |
| | `c` | **camouflage**: the fish blends into its background, its outline hard to pick out at a glance |
| | `a` | **out of water** (a fish on a net, in a hand, dead) |
| | `p` | **phase**: added by the tool, never typed: every photo of an entry marked `dimorph` in `tools/fish_source.json` (the presentation's phase lines say the sexes or colour phases differ: Parrotfish, Anthias) |
| | `r` | **reference photo**: added by the tool, never typed: the photo carries `rep` (below, "Reference photos") |
| last | **ease** | 1 to 5, below |

## Ease: how easy for a beginner who has just seen the family's card

Pierre's criteria (2026-11-04). Very easy first: good light, colourful, the fish clearly visible, in profile, the whole
fish in the frame, one fish (or the subject obvious), an easy species (that last one is the entry's order, not the
photo's: `fish.json` `start` and the opening rule). Avoid at the very start: juveniles; species whose sexes or colour
phases differ (Parrotfish); night shots, partial fish, head-on or tail views, heavy crops, murky water, camouflage,
several species in the frame.

- **5 very easy**: profile, whole, good light, sharp, large or medium, one fish (or a school of it); colourful or with
  its family's shape and pattern plain to see. A field-guide photo.
- **4 easy**: as 5 with one mild shortfall: a slight oblique, dim light, a slight colour loss,
  a busy background, the fish medium-small, another kind of fish in the frame far from the subject.
- **3 medium**: two mild shortfalls, or one strong one: a marked oblique, a head-on, tail or top view, part of the fish
  cut or hidden, a night or flash shot, a strong colour loss, the fish small, camouflage the eye still sees through.
- **2 hard**: the shape or the colours are hard to read: several strong shortfalls, murky water, camouflage, a tiny
  fish, a juvenile, a school in the blue.
- **1 very hard**: the fish is hard to find or to see at all: tiny, hidden, very dark, blurred, or the subject unclear.

**Caps** (the tool applies them, so a typed ease can never break them): a juvenile (`j`), an unclear subject (`x`) or a
monochrome photo (colour loss `3`) is at most 2 (a juvenile: unless its entry or genus shows its juveniles early, below); camouflage (`c`), out of water (`a`), a night shot (`n`), a strong
colour loss (`2`), a head-on, tail or top view (`h`, `t`, `d`) or a partial fish (`0`) is at most 3. So a photo at 4 or
5 ("very easy", the first questions' photos) is never one Pierre wants kept from the start.

**The phase flag caps nothing** (rubric 3, Pierre, 2026-11-04): a sex or colour phase is a species-level difficulty. An
Anthias is easy to call an Anthias whatever its sex, a parrotfish easy to call a parrotfish (its family-level difficulty
is telling it from a wrasse, a look-alike pair); it gets hard only when the species is asked. The flag stays on the
photos for the species questions and the explanation cards.

**The juvenile cap follows the juvenile classes** (rubric 5, 2026-11-04: a research note on the 27 IMR entries, classes
and rules approved by Pierre; data in `tools/fish_source.json` `juv`, per entry and, for mixed entries, per genus or
species, each with its sources). A juvenile photo is judged on the other criteria only (no cap) when its entry is class A
or its species is in the entry's `early` list; every other juvenile keeps the cap (`tools/fish_judge.py` `juv_early`):

- **Class A** (juveniles distinctive and recognisable: they help learn the family early): Spadefish (very tall fins:
  greatly elongated dorsal and anal fins; and, Pierre's observation, they look much bigger than they are: very long fins on
  a tiny body, the body growing while the overall height hardly changes), Sweetlips (head-down, wriggling swimming with
  exaggerated fin movements, bold creamy blotches), Boxfish (*Ostracion cubicus*: bright yellow with black spots, the same
  box shape). Pierre is a source for Spadefish and Sweetlips too.
- **Show-early genera or species** of the mixed entries: *Dascyllus* (Damselfish), *Pomacanthus* (Angelfish), *Macolor*
  (Snapper), *Coris gaimard* and *Novaculichthys* (Wrasse), *Arothron stellatus* (Pufferfish).
- **Class B** (nondescript, confusing, or resembling another family: taught later, with their explanation card): Parrotfish,
  Emperor; and the look-alike juveniles of mixed entries: *Acanthurus pyroferus* (resembles *Centropyge* pygmy angelfish),
  *Scolopsis bilineata* (resembles a fangblenny), *Plectropomus laevis* (resembles a toby), *Halichoeres* and *Thalassoma*
  (alike across species).
- **Class C** (broadly like the adults) and **no source found** (Fusilier, Triggerfish, Soldierfish, Cardinalfish,
  Squirrelfish, Lizardfish, Sandperch: to ask an IMR trainer): the cap stays, provisionally.
- Mimicry is a hypothesis in every case: written as "resembles" or "has been suggested", never as a fact (Pierre).

The B and look-alike caps stay after the bootstrap (those juveniles come late, with an explanation card); the C and
no-source caps go with it (ROADMAP). The juvenile tag stays on every photo.

## Reference photos

Pierre, 2026-11-05: a photo that a reference source uses to represent the species (FishBase's main picture of the
species, iNaturalist's taxon cover) represents it well: such photos are easy to identify, so they should come early in
the quiz for a beginner, and they suit the sheets. The data tags them (`rep`: `"fishbase"` or `"inaturalist"`, on
`fish-cand.json` candidates and `fish-photos.json` sheet photos; `tools/fetch_fishbase.py`, `tools/fetch_fish.py --rep`).
The judge never types anything for it and still judges the photo on what it shows; the tool adds the flag `r` and
**one ease point** (`tools/fish_judge.py` `REP_BONUS`, at most 5), **before the caps**: a juvenile reference photo stays
at most 2, a head-on one at most 3. So a medium reference photo (3) joins an entry's very easy photos (4-5) and a very
easy one is more often the card's cover. `python3 tools/judging_fish.py rep` re-applies the flag to the judged
candidates after a new tag. Where the source is FishBase, the photo page (`o`) gives the author and the licence.

**The units' reference photos in play** (Pierre, 2026-11-06: the covers and first photos of the families, genera and
species must be reference photos, whoever took them; 14:02: "reference" means every photo of reference quality, and
FishBase enters automatically when its licence allows: "a maximum of good photos to complement the weaker ones on
iNaturalist"). `python3 tools/fish_refs.py` asks iNaturalist, for every game species, every circle-1 genus and every
entry's family, for the photos it shows to represent the taxon (its cover, then the other photos of its taxon page: up to
3 for a species, the first for a genus or a family) that pass the game photo rules on their observation (Research Grade,
CC0 / CC BY / CC BY-NC, the Indo-West Pacific box, not captive or dead; for a genus or a family, a photo of a game species
of the entry), and adds FishBase's photos of each species that pass its rules (its main picture first, up to 3):
`tools/fish_refs.json`, kept by species. Judge them like any photo: `python3 tools/fish_judge.py --sheets <dir> --refs
--todo`, codes under their entry in `tools/fish_judge.json` `photos`. Once judged, each joins its entry's game photos
(`tools/fish_judge.py` `add_refs`; never in place of a game photo: one of an observation already in the game stays out), the iNaturalist ones and
FishBase's main picture with `rep`. **On R2, like a candidate** (Pierre, 2026-11-08, Q212: "we bring them in like
candidates"): every reference photo judged sure on the candidates' rubric (one kind of fish, count `1` or `s`; in the
water, no `a`) is in play by itself, whatever its level (`tools/fish_game.py` `ref_play`, `judged_sure`); the stopgap list
(`fish-photos.json`) still takes only the reference-level ones.

**Reference level** (`core.js` `refLevel`): a photo with `rep` judged very easy (4-5), or any photo judged 5 whose tags
read the reference look (`p1g0s` then size `l` or `m`, count `1` or `s`, no `j`, `c` or `a`), whoever took it; in both cases
one kind of fish only (count `1` or `s`: never other kinds of fish nor an unclear subject, rule P3). A
reference-level photo comes before every other photo (`easyRank`: the card's cover and each list's first photos) and a
never-seen one weighs 3 times more in the draw (fish `SUBJECTS` `calib.ref`, `model.js` `photoSet`), never exclusively.

## A proposed crop

When the fish is small in the frame, or the margins distract (another fish, a diver, empty water), the pass proposes a
crop: `tools/fish_judge.json` `crops`, `[left, top, right, bottom]` as fractions of the photo, the format of
`curation.json` `crop` and of a coral candidate's suggested crop (`suggest.json` `c`). Judged on a 5 x 5 grid over the
photo, so to about a tenth of its side; the crop keeps the whole fish with a margin. **A proposal only** (Pierre,
2026-11-04): written into `fish-photos.json` as `c`, never applied by the app or by a script; the admin will show it for
Pierre to accept or change, as for coral candidates (ROADMAP).

## What the app does with it (docs/LEARNING.md "Fish photos judged")

- **Prior difficulty** (`model.js` `photoDiff`): a photo's own difficulty starts at (3 − ease) x the subject's `calib.ease` (0.5
  logit an ease point: one standard deviation of a photo's own difficulty around its genus, the hierarchical photo Elo
  study's measure), so ease 5 starts at −1, ease 1 at +1, on top of its unit's offset; it fades as real answers come
  (`PDIFF.W`, as every prior). A photo nobody judged starts at 0, as before.
- **The first questions on an entry**: no wall (Pierre, 2026-11-06 14:17). Every photo can be drawn from the first
  question; the prior above, the draw's aim at the player's level and the start's lean (fish `SUBJECTS` `calib.early`:
  the aim 1.5 logits lower on an entry with no answer, fading with its answers) make the easy ones far likelier at the
  start, a harder one comes rarely (until then, `model.js` `easyFirst` showed only the ease 4-5 photos before Open Water).
- **The order photos are met in** (`core.js` `easyRank`, Pierre, 2026-11-06): the card's photo, the first photo of each
  list and the auto-sort's order are the easiest first, then the most reference-like by these tags (`refScore`: `r`,
  then profile, whole, good light, no colour loss, sharp, large, one fish), never by who took the photo.
- **The order the entries open**: the starter core first (`fish.json` `start`), then the existing rule, easiest and
  most common first (`openPick`): an entry's difficulty is the mean of its photos' difficulty, so the judged ease
  orders it too.

## Candidates (`fish-cand.json`): the same code, plus three fields

One fish judging vocabulary (Pierre, 2026-11-04): the candidate photos waiting in `fish-cand.json` (`tools/fetch_fish.py`)
are judged with the code above, its caps and its crop rule, **visual criteria only**, so a photo keeps its tags when it
moves from the candidates to the game. The species is the iNaturalist identification by human experts (Research Grade,
or Pierre's own), taken as given: no field says whether a photo shows the right species.

1. `python3 tools/judging_fish.py sheets <id>` (a species `s091` or a whole entry `t01`) downloads the candidates still
   waiting (500 px, `judging/fish/img/`, not in git) and draws contact sheets observation by observation
   (`judging/fish/sheets/<species>/`, 12 tiles each); it prints tile number → photo, observation, source, licence and
   the observer's iNaturalist annotation (`iNat: juvenile`...: a hint for the `j` flag, checked on the photo).
   `python3 tools/judging_fish.py big <f>` gives the 1024 px photo, for a tag the tile does not settle and for a crop.
2. Write `judging/fish/<species id>.json`: `{"photos": {"<f>": {...}}}`, every candidate waiting listed (a candidate Pierre
   has decided on since its judgement stays in the file as judged: not checked again, imported unchanged, its `best`
   still the best of its observation, so a new candidate there is an `alt` or a `dup`):
   - `code`: the code of "Tags" above, ease included (`p1g0sm14`). The tool adds the phase flag `p` and applies the caps.
   - `keep`: `best` (exactly one per observation: its most useful photo), `alt` (the same fish, adding something:
     another side, another phase or pose, other light), `dup` (adds nothing over the best: a burst, the same framing).
   - `phase` (optional): the sex or colour phase the IMR fish presentation names for the entry (`fish.json`
     `teach[].phase`) when the photo shows which: `subadult`, `intermediate`, `terminal`, `female` or `male`. A juvenile
     is the code's `j` flag; an adult needs no tag.
   - `crop` (optional): as "A proposed crop" above.
   - `unsure` (the fields you doubt: `code`, `keep`, `phase`, `crop`) and `note` (140 characters at most; required with
     `unsure`).
3. `python3 tools/judging_fish.py --check <id>` until it passes, then `python3 tools/judging_fish.py` imports every
   passing species into `suggest.json` `"fish"`: `{jt, e, k, ph, c, u, n}`, `jt` and `e` after the caps as in
   `fish-photos.json`. Commit only `judging/fish/*.json` and `suggest.json`.

**What a sure judgement does** (no `unsure`; `autosort.js` `fishSure`): `best` or `alt` → **in play at once**, with its
tags, ease, phase and crop, whatever its ease (hard photos stand in for SVS video frames; the judged ease is the photo's
prior difficulty, the players' answers refine it); `dup`, an unclear subject (count `x`), other kinds of fish (count `m`:
rule P3, as for the reference photos) or a fish out of the water (flag `a`) → stays out. Pierre, 2026-11-06 15:16 and
16:20 (Q180, Q199): a judged candidate enters the game by itself, treated exactly like a photo he adds in the admin and
hosted on R2 like it (`tools/fish_game.py` `in_play`, the Candidate photos workflow), each judged batch as soon as it
is ready, without waiting for his swipe; his curation only removes or corrects (a photo he rejects, excludes or moves
with Not this leaves the game at once, `core.js` `fishIn`). The admin's auto-sort still puts the same sure judgements
into his draft (admin plan PR 4), and about 1 candidate in 20 goes to him as a Check, his answers measuring the
agreement. So add `unsure` at the least doubt: an unsure candidate stays out of the game until a fresh look settles it,
while a wrong sure decision costs the players.

## Agreement with other sources

- iNaturalist's Life Stage annotations could check the juvenile flag, but on the 648 circle-1 photos no observer gave
  one (21 of the 1,145 fish photos have any, all in circles 2 and 3).
- Colour loss: a machine estimate (the share of the photo's saturated pixels whose hue is warm, red to yellow) was shown
  beside each photo as a hint and corrected by eye; they agreed exactly on 58% of the photos and within one level on 98%.
  The tag is the eye's.

## How the first pass went (2026-11-04)

Circle 1 (648 photos) first: circles 2 and 3 and the winks are opt-in, met after the IMR entries, and were judged
next (below). The first look gave view, whole, light (with a "cast" letter), clarity, size, count, flags and ease;
Pierre then asked for colour loss in place of the cast and for crop proposals, so every photo was looked at a second
time for those two and the light letter (rubric 2). Then (rubric 3) the phase flag stopped capping the ease, and the 11
circle-1 entries under 5 very easy photos got more: 214 research-grade candidates of `fish-cand.json` (PR #463) looked at
and judged the same way, 37 very easy ones added (`tools/fish_judge.json` `add`; the tool appends them to
`fish-photos.json`, once per observation).

Circles 2 and 3 and the winks (2026-11-04, later; ROADMAP "Fish photo judging, next"): the 475 photos of the 20
entries out of circle 1 (Barracuda; the 17 circle-3 entries; the Whale shark and Thresher sharks winks) judged the same
way on rubric 5, the small fish looked at again on a 10 x 10 grid for 48 crops. No juvenile class exists for these entries
(`juv` covers circle 1), so every juvenile there keeps the cap. Many of these families are rarely shown as the rubric's
very easy photo: the morays, snake eels, garden eels and jawfishes live with most of their body in a hole (partial, at
most 3), the frogfishes, scorpionfishes, stonefishes and seamoths are camouflaged, the rays and seamoths are mostly seen
from above, the sharks in blue water; seven entries have no photo at 4 or 5 (they took their 3 easiest at the start
under the `easyFirst` gate, gone since 2026-11-06). The rubric was applied as written (no family exception): a question for Pierre, put to
him on the morning of 2026-11-05 (open questions now live in docs/STATUS.md).

## A temporary use

The judged ease is a bootstrap prior: once fish answers are logged, the players' answers rate the photos and replace it
(`PDIFF.W`; Pierre, 2026-11-04; ROADMAP). The very-easy-first gate (`model.js` `easyFirst`) went on 2026-11-06 (Pierre:
"NO WALL").

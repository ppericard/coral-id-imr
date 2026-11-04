# Fish photo judging: how easy is each game photo for a beginner

Pierre, 2026-11-04, after trying the fish beta: the first photos were too hard. Fish answers are not logged to the sheet
yet (`core.js` `SUBJECTS` fish `log: false`), so no player answer says how hard a fish photo is. Until they do, an agent
looks at every fish game photo and judges it on explicit criteria. The judgement gives each photo an **ease** from 1 to
5, which becomes its difficulty prior (`model.js` `photoDiff`) and decides which photos the first questions on an entry
may show (`model.js` `easyFirst`). This file is the rubric, so the pass can be repeated by another agent or a person
and give the same kind of result.

Files: the judgements are `tools/fish_judge.json` (hand- or agent-made, like `tools/fish_source.json`);
`python3 tools/fish_judge.py` writes them into `fish-photos.json` (`e`, `jt` and a proposed crop `c` on each photo) and
prints the summary;
`tools/fish_photos.py` re-applies them whenever it rebuilds the photo list. `tests/fish.test.js` checks that every
circle-1 game photo is judged, that every code is valid and that the caps below hold.

## How to look

1. `python3 tools/fish_judge.py --sheets <dir>` downloads every game photo at iNaturalist's `medium` size (500 px)
   into `<dir>/img` and draws contact sheets of 12 (4 x 3, each photo in a 300 x 225 cell, its number and the
   observer's species name above it) into `<dir>/sheets`. Keep `<dir>` outside the repository; delete it after.
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

## A proposed crop

When the fish is small in the frame, or the margins distract (another fish, a diver, empty water), the pass proposes a
crop: `tools/fish_judge.json` `crops`, `[left, top, right, bottom]` as fractions of the photo, the format of
`curation.json` `crop` and of a coral candidate's suggested crop (`suggest.json` `c`). Judged on a 5 x 5 grid over the
photo, so to about a tenth of its side; the crop keeps the whole fish with a margin. **A proposal only** (Pierre,
2026-11-04): written into `fish-photos.json` as `c`, never applied by the app or by a script; the admin will show it for
Pierre to accept or change, as for coral candidates (ROADMAP).

## What the app does with it (docs/LEARNING.md "Fish photos judged")

- **Prior difficulty** (`model.js` `photoDiff`): a photo's own difficulty starts at (3 − ease) x `PDIFF.EASE` (0.5
  logit an ease point: one standard deviation of a photo's own difficulty around its genus, the hierarchical photo Elo
  study's measure), so ease 5 starts at −1, ease 1 at +1, on top of its unit's offset; it fades as real answers come
  (`PDIFF.W`, as every prior). A photo nobody judged starts at 0, as before.
- **The first questions on an entry** (`model.js` `easyFirst`): until the entry reaches Open Water (50%, the first
  level earned), its questions show only its very easy photos (ease 4-5); an entry with fewer than `PICKD.VARIETY` (3)
  of them shows its 3 easiest instead. A unit without judged photos (the corals) is not touched.
- **The order the entries open**: the starter core first (`fish.json` `start`), then the existing rule, easiest and
  most common first (`openPick`): an entry's difficulty is the mean of its photos' difficulty, so the judged ease
  orders it too.

## Agreement with other sources

- iNaturalist's Life Stage annotations could check the juvenile flag, but on the 648 circle-1 photos no observer gave
  one (21 of the 1,145 fish photos have any, all in circles 2 and 3).
- Colour loss: a machine estimate (the share of the photo's saturated pixels whose hue is warm, red to yellow) was shown
  beside each photo as a hint and corrected by eye; they agreed exactly on 58% of the photos and within one level on 98%.
  The tag is the eye's.

## How the first pass went (2026-11-04)

Circle 1 (648 photos) only: circles 2 and 3 and the winks are opt-in, met after the IMR entries, and not judged yet (no
`e`, so as before). The first look gave view, whole, light (with a "cast" letter), clarity, size, count, flags and ease;
Pierre then asked for colour loss in place of the cast and for crop proposals, so every photo was looked at a second
time for those two and the light letter (rubric 2). Then (rubric 3) the phase flag stopped capping the ease, and the 11
circle-1 entries under 5 very easy photos got more: 214 research-grade candidates of `fish-cand.json` (PR #463) looked at
and judged the same way, 37 very easy ones added (`tools/fish_judge.json` `add`; the tool appends them to
`fish-photos.json`, once per observation).

## A temporary use

The very-easy-first rule (`model.js` `easyFirst`) is a bootstrap: once fish answers are logged, the players' answers
rate the photos and the rule goes (Pierre, 2026-11-04; ROADMAP).

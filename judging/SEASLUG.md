# Sea slug photo judging: how easy is each candidate photo for a beginner

The sea slugs' rubric, adapted from the fish's ([FISH.md](FISH.md)) for the sea-slug subject (Pierre, 2026-11-15, Q369:
one "sea slugs" subject, the Philippines as its area, scientific names only; Q377: circle 1 of 45 species, the photo
target). It judges the candidate photos of `data/seaslug-cand.json` (`tools/fetch_seaslugs.py`), so the pass can be repeated
by another agent or a person and give the same kind of result. The subject's game reads it through
`tools/seaslug_game.py` (`seaslug-game.json`: the sure judgements are in play, as a fish candidate judged sure; run it
again after a re-judge); its admin pages and auto-sort come later (ROADMAP "More subjects").

Files: the judgements are `judging/seaslug/<taxon id>.json` (one per species, the key of `data/seaslug-cand.json`: its
iNaturalist taxon id); `python3 tools/judging_fish.py --subject seaslug` draws the sheets, checks the files and imports
them into `data/suggest.json` `"seaslug"`; the code and its caps are `tools/fish_judge.py` `RUBRICS` `"seaslug"` (one tool for
both subjects, `--subject` choosing). Tests: `tests/seaslugjudge.test.js`.

## Genus-level candidates and the species with no name yet

Two more kinds of list in `data/seaslug-cand.json` (Pierre, 2026-11-17, Q389; `tools/fetch_seaslugs.py` `--genus-level`,
`--informal`), judged **on this same rubric, the same way**, each list its own judging file:

- **Genus-level candidates** (Q389 (1)): observations identified at the genus only, agreed there by 2 current
  identifications (or Research Grade at the genus). Keyed by the **genus's name** (`judging/seaslug/Goniobranchus.json`;
  `... sheets Goniobranchus`), each record `gl: 1`. Once judged sure they play for the genus unit, never for a species.
  Many show a species with no name yet (the *Goniobranchus* ones mostly the red-reticulate *Goniobranchus* sp. 5): as for
  any candidate, judge how the animal is shown, never which species it is.
- **A species with no name yet** (Q389 (2), `tools/seaslug_informal.json`: *Goniobranchus* sp. 5 of Soong et al. 2020):
  observations carrying its label (the iNaturalist observation field its identifiers keep), at its genus and agreed
  there. Keyed by its **key** (`judging/seaslug/goniobranchus-sp5.json`; `... sheets "Goniobranchus sp. 5"`). The label
  is taken as given, as a Research Grade identification is (rule C5: a doubt goes to `data/points.json`).

`todo` lists them with the species (a genus-level list as "<genus> (genus level)").

## How to look

1. `python3 tools/judging_fish.py --subject seaslug sheets <id or name> ...` downloads the candidates still waiting at
   iNaturalist's `medium` size (500 px, `judging/seaslug/img/`, not in git) and draws contact sheets of 12
   (`judging/seaslug/sheets/<taxon id>/`, tick marks every tenth on the edges for a crop), observation by observation; it
   prints tile number → photo, observation, place, licence and the observer's iNaturalist Life Stage annotation
   (`iNat: juvenile`: a hint for the `j` flag, checked on the photo). `... big <photo>` gives the 1024 px version, for a
   tag the tile does not settle. With no id, every species with candidates; `todo` lists the species not judged yet.
2. Open every sheet and judge every photo on it, as the fish's "How to look" says: what the photo shows, never the species;
   when a tag cannot be read, the value that makes the photo harder (between two levels, the lower ease).

## Tags (one code per photo)

**Visual criteria only** (as the fish, Pierre, 2026-11-04): the judge reads how the animal is shown and never the species.
The species is the iNaturalist identification (Research Grade, or Pierre's own observation identified to the species even
when Needs ID, marked `ni`: the fish's rule, Q386; `tools/fetch_seaslugs.py`), taken as given: the judge does
not say whether a photo shows the right species or whether its species is recognisable (rule C5 holds for the labels: a
doubt goes to `data/points.json`, never settled here).

The code has the fish's shape: seven characters, then the flags, then the ease digit: `d1g0sl15`, `p1g0sm1j2`. The same
positions read the same thing as a fish's code, so whatever reads a fish's tags reads a sea slug's. In order:

| Position | Tag | Values |
| --- | --- | --- |
| 1 | **view** | `d` dorsal (from above: the back, the mantle's pattern and rim); `p` lateral (from the side, the animal roughly parallel to the picture); `o` oblique (dorso-lateral: the back and one side together, or the animal diagonal across the frame); `h` head-on; `t` from behind; `v` ventral (the foot: the animal on its back, or seen through glass) |
| 2 | **whole** | `1` the whole animal is in the frame and visible; `0` partial: cut by the frame, hidden by the substrate or another animal, or curled up so its shape cannot be read whole |
| 3 | **light** | `g` good: the animal well lit, its true colours visible, **whatever the background** (a macro flash on a black background is good light, as for the fish, rubric 6); `d` dim: the animal itself poorly lit. No night livery (`n` is the fish's) |
| 4 | **colour loss** | as the fish's: `0` none; `1` slight; `2` strong (the warm colours mostly gone); `3` monochrome |
| 5 | **clarity** | `s` sharp where the characters are (the head end with the rhinophores, the pattern); `m` soft, or sharp on a part only (macro's shallow depth of field: the tail sharp, the rhinophores blurred); `b` blurred or murky |
| 6 | **size** | as the fish's: `l` the animal spans a third of the frame's width or more; `m` a sixth to a third; `s` under a sixth |
| 7 | **count** | `1` one sea slug; `s` several of the same kind, the subject obvious (a mating pair, a group); `o` another sea slug species in view, no risk of taking it for the subject; `k` another sea slug species in view that could be taken for the subject (two chromodorids side by side); `x` the subject is not obvious. **Only sea slugs count**: the sponge, hydroid, soft coral or alga it sits on or feeds on is the background (when it hides the animal: `0` or `c`) |
| flags | `j` | a **juvenile**: the colours or shape of a young animal (below, "Juveniles") |
| | `c` | **camouflage**: the animal blends into its host or background, its outline hard to pick out at a glance |
| | `a` | **out of water** (in a hand, on a tray, in a dish, on the shore) |
| | `w` | **watermark**: a visible watermark or text on the photo, as the fish's (Q373): caps nothing |
| | `f` | **features hidden**: the photo shows the rhinophores or the gills withdrawn, or hidden by the frame, the substrate or another animal (below, "Rhinophores and gills"); caps nothing |
| last | **ease** | 1 to 5, below |

The flags are typed in that order (`j c a w f`). The fish's tool flags (`p` phase, `r` reference) are never added: no
presentation names a sea slug phase, and `data/seaslug-cand.json` carries no `rep`.

## The views that matter

The brief for this rubric (2026-11-15) names the views that matter for nudibranchs: dorsal, lateral, the rhinophores and
the gills visible. The study of 2026-11-15 ([nudibranch mode study](../docs/reviews/2026-11-15-nudibranch-mode-study.md)
§5.2) had proposed the same, labelled a **[guess]** to check against a guide: the dorids (*Chromodoris*, *Hypselodoris*,
*Phyllidia*) from above or dorso-laterally, showing the rhinophores, the gill plume and the mantle's pattern and rim; the
aeolids (*Pteraeolidia*, *Phyllodesmium*, *Coryphellina*) from the side, showing the cerata and the oral tentacles; an
animal on its back, a ventral view through glass, a curled-up or swimming animal hiding them. Only the phyllidiids'
tubercles are read from a source there (Stoffels et al. 2016: "Structure and pattern of the notal tubercles are important
characters for identification"). So, until a guide is checked (the first judging pass may say more):

- **dorsal (`d`), lateral (`p`) and dorso-lateral (`o`) are the sea slugs' good views**: any of them can be very easy.
  Unlike the fish, a view from above is a reference view and caps nothing.
- **head-on (`h`), from behind (`t`) and ventral (`v`)** hide the pattern and the outline: head-on and from behind at
  most 4, as the fish's head-on and tail views; ventral at most 3 (Caps).

## Rhinophores and gills

The rhinophores and the gills are among the characters the brief asks to see. The flag `f` records what the photo shows:
they are there but **withdrawn** (the photo shows them drawn in, or only the place they come out of) or **hidden** (cut by
the frame, under the substrate, behind another animal). The judge reads the photo, not the body plan: circle 1 holds 39 nudibranchs, 3 sacoglossans, 2 headshield slugs and 1 sidegill slug (the
[species list](../docs/reviews/2026-11-15-seaslug-list.md) §4.1), and a photo that shows no plume and no sign of one
withdrawn or hidden gets no `f`. It caps nothing: a very easy photo (5) has no `f`; with it, a photo is at most easy (4) by
the ease scale.

## Macro framing

Many sea slugs are small, so their good photos are macro shots (the study §5.2, a **[guess]** there; the brief asks for
macro framing). The very easy sea-slug photo is a macro: the whole animal large in the frame (`l`), sharp on its head
end and its pattern, in a good view, its rhinophores and gills showing. So size `m` is a mild shortfall here (the fish's 5
accepts `m`) and `s` a strong one; a photo where the animal is a speck on the reef is hard (2) or very hard (1). A crop is
proposed when the animal is small in the frame or the margins distract (below, Candidates).

## Ease: how easy for a beginner who has just seen the species' card

The fish's scale, the same five levels:

- **5 very easy**: a dorsal, lateral or dorso-lateral view, whole, good light (a flash on a dark background included),
  sharp, large, one sea slug (or a pair or group of it), no `f`. A field-guide photo.
- **4 easy**: as 5 with one mild shortfall: the animal medium-sized in the frame, dim light, a slight colour loss, sharp
  on a part only, a busy background, `f` (rhinophores or gills withdrawn or hidden), another sea slug far from the subject,
  a head-on or rear view, part of the animal cut or hidden (these two since 2026-11-24, "Caps" below).
- **3 medium**: two mild shortfalls, or one strong one: a ventral view, curled up, a strong colour loss, the animal small,
  camouflage the eye still sees through.
- **2 hard**: the shape or the colours are hard to read: several strong shortfalls, murky water, camouflage, a tiny
  animal.
- **1 very hard**: the animal is hard to find or to see at all: tiny, hidden, very dark, blurred, or the subject unclear.

**Caps** (the tool applies them, so a typed ease can never break them: `tools/fish_judge.py` `cap`): an unclear subject
(`x`) or a monochrome photo (colour loss `3`) is at most 2; camouflage (`c`), out of water (`a`), a strong colour loss
(`2`) or a ventral view (`v`) is at most 3; a head-on or rear view (`h`, `t`) or a partial animal (`0`) is at most 4.
`j`, `w` and `f` cap nothing. These are the fish's caps (judging/FISH.md "Caps"), with the same softened step
(Q458 step 1: a partial animal and a head-on or rear view one step, not a ceiling), applied to the sea slugs on
2026-11-24 ([the decision](../docs/decisions/2026-11-24-sea-slug-caps-as-the-fish.md); Pierre, 06:35, Linear
REE-267: «il faut toujours généraliser»). The differences that remain (rule S1):

- **A dorsal view caps nothing**: it is one of the sea slugs' field-guide views ("5 very easy" above: a dorsal,
  lateral or dorso-lateral view), where the fish's is the profile.
- **A ventral view (`v`) is at most 3**: the sea slugs' own code (the foot), which the fish have no equivalent of.
- **Strong blur (`b`) caps nothing**: unchanged here. The fish's blur cap came from Pierre's review of the fish gold set
  (2026-11-19, judging/FISH.md "Strong blur"), so its only recorded reason is that the review was of fish; it is not a
  justified difference yet, only one this change leaves as it was.

**The typical look** (Q456) is shared: in a group whose usual look is buried or camouflaged, a partial animal (`0`) and
camouflage (`c`) cap nothing (`RUBRICS` `typical`). No sea slug genus is declared typical-look today: the declared rule
(`tools/fish_judge.py` `typical_look`) reads the fish's teaching entries only, and the sea slugs' judging passes no
entry (`tools/judging_fish.py` `entry`).

A cap only lowers the ease a judge typed, so the softened caps raise no stored ease by themselves: on 2026-11-24, 563
sea slug photos tagged `0`, `h` or `t` are at ease 3, and 562 of them were typed 3 under the old scale (the other is
held at 3 by another cap). They keep their 3 until judged again, which is a pass under rule P7 (Linear REE-257).

## Juveniles

Juveniles stay (#970's egg rule, `photos.exclude`: "Juveniles stay in"; Q377: +5 candidates where a source documents a
different-looking juvenile, *Hexabranchus lacer*, `tools/seaslug_source.json` `photos.juvenile`) and are tagged `j`, on
what the photo shows: the young animal's colours or shape. The observer's Life Stage annotation is a hint only (the
sources note §1.2 checked all 97 circle-1 "Juvenile" annotations: every one shows the animal). *H. lacer*'s juvenile is
the documented case (a translucent white to pale pink body, a violet-blue edge, magenta or purple spots, orange
rhinophores and gills: the sources note §1.2 and §1.5); a juvenile that looks like a small adult is tagged all the same.
A juvenile is judged on the photo and caps nothing, as the fish's (Q435; one rule for every subject, S1:
[the decision](../docs/decisions/2026-11-19-fish-juvenile-no-cap.md)). The `j` tag stays on every photo.

## Egg masses (the egg rule, #970's filter 2)

Pierre, 2026-11-15: egg ribbons and egg masses are never candidates (`tools/seaslug_source.json` `photos.exclude`;
[sources note](../docs/reviews/2026-11-15-seaslug-sources.md) §1.4). Filter 1 (`tools/fetch_seaslugs.py`) drops the
observations annotated Life Stage: Egg or Evidence of Presence: Egg. Filter 2 is the judging's, for the egg masses nobody
annotated:

- **Excluded**: a photo whose subject is an egg mass (a ribbon, a coil, a rosette, a cluster of capsules) with no whole
  animal recognisable, **and a photo that cannot be told apart from one** (an egg mass or a small animal): no doubt is
  left open, the photo goes. Its judgement is `{"egg": true}` (a note at most), never a code.
- **Kept, judged as an animal photo**: the recognisable animal with its eggs beside it. The eggs are background; the count
  reads the sea slugs only.
- Rule P4: the egg-only photo goes, not the observation's other photos. `tools/fetch_seaslugs.py` takes one photo per
  observation; at its next run, an observation whose every candidate is judged an egg mass brings its next usable photo
  as a new candidate (`eggs_back`), judged like any other, and the egg-mass one counts nothing against the target.

## Watermark

As the fish's (Pierre, 2026-11-15, Q373; FISH.md "Watermark"): `w` marks a visible watermark or text on the photo (a
photographer's name, a logo, a copyright line). It caps nothing and leaves the photo's place in the games as it is; what
the fish's Home and default covers do with it, the sea slugs' will do once the subject has them.

## Other species (rule P3)

As the fish's split (Q323), on sea slugs: `o` when the other sea slug cannot be taken for the subject (much smaller, far,
blurred, cut, or plainly another shape), `k` when it is about as large, sharp and central and could be named instead.
When in doubt, `k` with `unsure` and a note.

## Look-alike hints from the literature (the species a photo may really show)

From the [literature scan](../docs/reviews/2026-11-17-seaslug-literature-scan.md) §5.5. They change no code, keep or
ease: the label stays the iNaturalist identification (rule C5). A photo that fits one gets a `note` (no `unsure`), for a
later species level to check; the cues are the sources', never shown to players (rule C6):

- ***T. pacifica***: black spots all over the body and plain black tips are *T. pikachu* (*T. pacifica*: no body spots,
  blue-white tips with a black band below; seaslug.world after Pola et al. 2026, doi:10.11646/zootaxa.5793.1.9).
- ***C. dianae***: before 2021 every *C. alcalai* was identified *C. dianae*, so an older photo may show either
  (seaslug.world after Gosliner 2021); no photo cue is cited.
- ***P. picta***, ***P. coelestis***: a white animal with one oval black area and yellow-tipped tubercles fits
  *P. ovata* (Wägele et al. 2025, doi:10.3897/zookeys.1245.153046), not confirmed in the Philippines (rule C8): a note
  only.
- **One name, several species** (*Pteraeolidia semperi*, *Coryphellina exoptata*, *Samla bicolor*, *Phyllidiella
  pustulosa*, *Thuridilla gracilis*, *Costasiella kuroshimae*, *Jorunna funebris*, *Plakobranchus ocellatus*): a
  species-level photo is a photo of the complex, sure at the genus level. Nothing to add.

## The animal's box (Find the X, Pierre, 2026-11-19, Q437)

"Find the X" shows a photo as a small square tile, so the tile must show almost only the animal, tight, whole.
`tools/seaslug_game.py` cuts it from the animal's **box** with the fish's own cut ([FISH.md](FISH.md) "The fish's box":
`tools/fish_game.py` `tile_crop`).

- **Which photos**: those whose tags pass `tools/seaslug_game.py` `tile_tags`: the fish's rule (profile or oblique, whole,
  good light, colour loss 0 or 1, sharp, large or medium, one animal, no `j`, `c` or `a`) with the dorsal view added.
  Any other photo gets no box.
- **The box**: `bb` = `[left, top, right, bottom]` as fractions of the original photo (the crop's format), the tightest
  rectangle around the **whole** animal to its tips: body and mantle, foot and tail, rhinophores, gill plume, oral
  tentacles or veil, cerata, parapodia, the mantle's rim and papillae; long thin parts count. Never the host or
  substrate it sits on, its shadow, its egg ribbon or another slug; no margin (the tile adds its own).
- **No box** (leave `bb` out; the first that applies): no sea slug in the frame; the animal cut by the frame; two animals
  overlapping or touching, so that no rectangle holds one without a part of the other; more than a fifth hidden; an outline
  that cannot be traced (camouflage alone is not a reason: trace it if you can). In doubt, no box.
- **The tile must not show another slug**: if any part of another sea slug lies inside the square cut around the box
  (1.2 x the box's longer side, centred on it), the photo gets no `bb` either (a box is always cut into a tile).
- **A bulk pass**: pixel boxes `[x, y, w, h]` judged on 1,600 px images are converted to these fractions, rounded outward,
  and imported as `bb` (the measurement, [decision record](../docs/decisions/2026-11-20-seaslug-box-model.md)).
  `unsure` may name `bb`, which withholds the tile only.
- **Checked on import**: `python3 tools/judging_fish.py --subject seaslug --check` refuses a box that is not four fractions
  with `0 <= left < right <= 1` and `0 <= top < bottom <= 1`, one narrower or shorter than 2% of the photo, or one the
  proposed `crop` cuts.

## Candidates: the judging files

`judging/seaslug/<taxon id>.json`: `{"photos": {"<f>": {...}}}`, every candidate waiting listed:

- `code`: the code of "Tags" above, ease included (`d1g0sl15`). The tool applies the caps.
- `keep` (optional): `best` (exactly one per observation: its most useful photo), `alt` or `dup`, by the definition
  shared by every subject (Pierre, 2026-11-24, «ok»; [the decision](../docs/decisions/2026-11-24-what-a-duplicate-is.md)):
  `alt`: another zoom, framing, angle or pose of the same animal or colony; `dup`: a burst or the same framing, with
  nothing new to see. Another side or other light is an `alt` too. The fetch takes one photo per observation today
  (`tools/fetch_seaslugs.py`; every photo, as the other subjects, is Linear REE-252), so a judgement without `keep`
  reads `best`.
- `crop` (optional): `[left, top, right, bottom]` fractions of the photo, as FISH.md "A proposed crop", Q430 aside.
- `unsure` (the fields you doubt: `code`, `keep`, `crop`, `bb`) and `note` (140 characters at most; required with `unsure`).
- An egg-mass photo: `{"egg": true}` and nothing else but a `note`.

- `bb` (optional, for a photo whose code passes the tile rule): the animal's box, "The animal's box" above.

No `phase` (no presentation names a sea-slug phase; rule C2).

`python3 tools/judging_fish.py --subject seaslug --check [id ...]` until it passes, then `python3 tools/judging_fish.py
--subject seaslug [id ...]` imports every passing species into `data/suggest.json` `"seaslug"`: `{jt, e, k, c, u, n}` (`jt`
and `e` after the caps), or `{egg: 1, n}` for an egg-mass photo; `"by"` `{taxon id: {seaslug: {by, at, n}}}`.
`... --subject seaslug codes` re-applies a re-judge of some photos (codes, keep, unsure, notes, the egg rule) to the ones
already imported. Commit only `judging/seaslug/*.json` and `data/suggest.json` for species judged for the first time: the
Candidate photos workflow builds them into `seaslug-game.json` after the merge (`tools/seaslug_game.py --check` lets them
wait). A re-judge of a species already in play also commits `python3 tools/seaslug_game.py`'s two files.

**What a judgement does**: `tools/seaslug_game.py` puts a sure `best` or `alt` in play by itself (no unsure field, never
an egg mass, a count of `1`, `s` or `o`, never out of the water), the easiest first up to the game cap, as for the fish,
in every circle (1 to 3); a proposed crop is applied when the photo is downloaded for R2 (`--r2`, study §9 step 6: off in
the workflow until Pierre's go, `SEASLUG_R2`). Its auto-sort comes later. Add `unsure` at the least doubt.

# Sea slug photo judging: how easy is each candidate photo for a beginner

The sea slugs' rubric, adapted from the fish's ([FISH.md](FISH.md)) for the sea-slug subject (Pierre, 2026-11-15, Q369:
one "sea slugs" subject, the Philippines as its area, scientific names only; Q377: circle 1 of 45 species, the photo
target). It judges the candidate photos of `seaslug-cand.json` (`tools/fetch_seaslugs.py`), so the pass can be repeated
by another agent or a person and give the same kind of result. Nothing reads its output in the app yet: the subject's game,
its draw and its auto-sort come later (ROADMAP "More subjects"), as the fish's did.

Files: the judgements are `judging/seaslug/<taxon id>.json` (one per species, the key of `seaslug-cand.json`: its
iNaturalist taxon id); `python3 tools/judging_fish.py --subject seaslug` draws the sheets, checks the files and imports
them into `suggest.json` `"seaslug"`; the code and its caps are `tools/fish_judge.py` `RUBRICS` `"seaslug"` (one tool for
both subjects, `--subject` choosing). Tests: `tests/seaslugjudge.test.js`.

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
The species is the iNaturalist identification (Research Grade, `tools/fetch_seaslugs.py`), taken as given: the judge does
not say whether a photo shows the right species or whether its species is recognisable (rule C5 holds for the labels: a
doubt goes to `points.json`, never settled here).

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
presentation names a sea slug phase, and `seaslug-cand.json` carries no `rep`.

## The views that matter

The study of 2026-11-15 ([nudibranch mode study](../docs/reviews/2026-11-15-nudibranch-mode-study.md) §5.2) read where a
sea slug's characters show: the dorids (*Chromodoris*, *Hypselodoris*, *Phyllidia*) from above or dorso-laterally,
showing the rhinophores, the gill plume and the mantle's pattern and rim (the phyllidiids' dorsal tubercles too: Stoffels
et al. 2016); the aeolids (*Pteraeolidia*, *Phyllodesmium*, *Coryphellina*) from the side, showing the cerata and the oral
tentacles; an animal on its back, a ventral view through glass, a curled-up or swimming animal hides them. So:

- **dorsal (`d`), lateral (`p`) and dorso-lateral (`o`) are the sea slugs' good views**: any of them can be very easy.
  Unlike the fish, a view from above is a reference view and caps nothing.
- **head-on (`h`), from behind (`t`) and ventral (`v`)** hide the pattern and the outline: at most 3 (Caps).

## Rhinophores and gills

The rhinophores (the paired sensory tentacles on the head) and the gills (a dorid's plume on the back) are among the
characters the views above show. The flag `f` records what the photo shows: they are there but **withdrawn** (pulled into
their pockets) or **hidden** (cut by the frame, under the substrate, behind another animal). The judge reads the photo, not
the body plan: circle 1 holds 39 nudibranchs, 3 sacoglossans, 2 headshield slugs and 1 sidegill slug (the
[species list](../docs/reviews/2026-11-15-seaslug-list.md) §4.1), and a photo that shows no plume and no sign of one
withdrawn or hidden gets no `f`. It caps nothing: a very easy photo (5) has no `f`; with it, a photo is at most easy (4) by
the ease scale.

## Macro framing

Most sea slugs are a few millimetres to a few centimetres long, so their good photos are macro shots (the study §5.2). The
very easy sea-slug photo is the macro the field guides show: the whole animal large in the frame (`l`), sharp on its head
end and its pattern, in a good view, its rhinophores and gills showing. So size `m` is a mild shortfall here (the fish's 5
accepts `m`) and `s` a strong one; a photo where the animal is a speck on the reef is hard (2) or very hard (1). A crop is
proposed when the animal is small in the frame or the margins distract (below, Candidates).

## Ease: how easy for a beginner who has just seen the species' card

The fish's scale, the same five levels:

- **5 very easy**: a dorsal, lateral or dorso-lateral view, whole, good light (a flash on a dark background included),
  sharp, large, one sea slug (or a pair or group of it), no `f`. A field-guide photo.
- **4 easy**: as 5 with one mild shortfall: the animal medium-sized in the frame, dim light, a slight colour loss, sharp
  on a part only, a busy background, `f` (rhinophores or gills withdrawn or hidden), another sea slug far from the subject.
- **3 medium**: two mild shortfalls, or one strong one: a head-on, rear or ventral view, part of the animal cut or hidden,
  curled up, a strong colour loss, the animal small, camouflage the eye still sees through.
- **2 hard**: the shape or the colours are hard to read: several strong shortfalls, murky water, camouflage, a tiny
  animal, a juvenile.
- **1 very hard**: the animal is hard to find or to see at all: tiny, hidden, very dark, blurred, or the subject unclear.

**Caps** (the tool applies them, so a typed ease can never break them: `tools/fish_judge.py` `cap`): a juvenile (`j`), an
unclear subject (`x`) or a monochrome photo (colour loss `3`) is at most 2; camouflage (`c`), out of water (`a`), a strong
colour loss (`2`), a head-on, rear or ventral view (`h`, `t`, `v`) or a partial animal (`0`) is at most 3. The fish's caps,
with two differences: a dorsal view caps nothing, and `v` is the sea slugs' own. `w` and `f` cap nothing.

## Juveniles

Juveniles stay (#970's egg rule, `photos.exclude`: "Juveniles stay in"; Q377: +5 candidates where a source documents a
different-looking juvenile, *Hexabranchus lacer*, `tools/seaslug_source.json` `photos.juvenile`) and are tagged `j`, on
what the photo shows: the young animal's colours or shape. The observer's Life Stage annotation is a hint only (the
sources note §1.2 checked all 97 circle-1 "Juvenile" annotations: every one shows the animal). *H. lacer*'s juvenile is
the documented case (a translucent white to pale pink body, a violet-blue edge, magenta or purple spots, orange
rhinophores and gills: the sources note §1.2 and §1.5); a juvenile that looks like a small adult is tagged all the same.
The juvenile cap holds for every sea slug juvenile (at most 2), as for a fish juvenile of no early class: no juvenile class
exists for sea slugs yet. The `j` tag stays on every photo.

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
  observation and never takes an observation twice, so its other photos do not come in by themselves (ROADMAP).

## Watermark

As the fish's (Pierre, 2026-11-15, Q373; FISH.md "Watermark"): `w` marks a visible watermark or text on the photo (a
photographer's name, a logo, a copyright line). It caps nothing and leaves the photo's place in the games as it is; what
the fish's Home and default covers do with it, the sea slugs' will do once the subject has them.

## Other species (rule P3)

As the fish's split (Q323), on sea slugs: `o` when the other sea slug cannot be taken for the subject (much smaller, far,
blurred, cut, or plainly another shape), `k` when it is about as large, sharp and central and could be named instead.
When in doubt, `k` with `unsure` and a note.

## Candidates: the judging files

`judging/seaslug/<taxon id>.json`: `{"photos": {"<f>": {...}}}`, every candidate waiting listed:

- `code`: the code of "Tags" above, ease included (`d1g0sl15`). The tool applies the caps.
- `keep` (optional): `best`, `alt` or `dup`, as the fish's. A sea-slug candidate is one observation (one photo each,
  `tools/fetch_seaslugs.py`), so a judgement without `keep` reads `best`; exactly one `best` per observation still holds.
- `crop` (optional): `[left, top, right, bottom]` fractions of the photo, as FISH.md "A proposed crop": a proposal only.
- `unsure` (the fields you doubt: `code`, `keep`, `crop`) and `note` (140 characters at most; required with `unsure`).
- An egg-mass photo: `{"egg": true}` and nothing else but a `note`.

No `phase` (no presentation names a sea-slug phase; rule C2) and no `bb` (the fish's box is for the fish games' tiles).

`python3 tools/judging_fish.py --subject seaslug --check [id ...]` until it passes, then `python3 tools/judging_fish.py
--subject seaslug [id ...]` imports every passing species into `suggest.json` `"seaslug"`: `{jt, e, k, c, u, n}` (`jt`
and `e` after the caps), or `{egg: 1, n}` for an egg-mass photo; `"by"` `{taxon id: {seaslug: {by, at, n}}}`.
`... --subject seaslug codes` re-applies a re-judge of some photos (codes, keep, unsure, notes, the egg rule) to the ones
already imported. Commit only `judging/seaslug/*.json` and `suggest.json`.

**What a judgement will do** is the subject's game's to decide when it exists (its auto-sort, its R2 photos): nothing
reads `suggest.json` `"seaslug"` today. Judge as for the fish, where a sure `best` or `alt` enters play by itself: add
`unsure` at the least doubt.

# Model measure: fish photo judging (study, 2026-11-19)

**Status: done (2026-11-19).** No configuration passes, the Opus 5.5 high control included: the committed reference
does not reproduce itself. No cheaper model can be validated against it; fish photo judging stays on Opus 5.5 high for
now, with a drift check, and the next step is a gold set (below, "What it implies").

Why: AGENTS.md "Model choice by measurement" (Pierre, 2026-11-18: "A valider en comparant avec un modèle fort sur un
échantillon"), and Pierre, 2026-11-19 10:08: "Du coup il faut peut-être monter dans les efforts ou les modèles et faire
de nouveaux tests au lieu de default sur Opus high...". Fish photo judging (judging/FISH.md, the candidate pass) is a
recurring task with a written rubric and 33,635 past judgements to measure against.

## Protocol (written before any judge call)

**Task measured.** The candidate pass of [judging/FISH.md](../../judging/FISH.md): per photo the code (view, whole,
light, colour loss, clarity, size, count), the typed flags `j c a w`, the ease, `keep` within the observation, and
`unsure`. Not measured: `phase`, `crop`, `bb` (optional, no effect on whether a photo plays).

**Sample.** 76 judged candidates of `judging/fish/s*.json` at `origin/main` 2d8a8d19f, drawn with seed 20261119,
stratified (each photo in the first stratum it matches; the legacy count `m` left out):

| Stratum | Rule | Population | Drawn |
| --- | --- | --- | --- |
| G Pierre's gold | he rejected (`curation.json` `fish.seen` / `exclude`) a photo the auto-sort put in or nobody logged | 16 | 16 |
| R rejected | reference count `k` or `x`, or flag `a` | 3,580 | 12 + 3 (below) |
| U unsure | reference `unsure` | 42 | 8 |
| J juvenile | flag `j` | 3,754 | 9 |
| S several fish | count `s` or `o` | 4,162 | 8 |
| W watermark | flag `w` | 216 | 4 |
| K keep | 3 whole observations of 2-4 photos, judged together | (any) | 8 |
| P plain | the rest | 21,530 | 8 |

**Reference.** The committed judgements, made by strong models (mostly Opus) and re-judged where the 2026-11-15
"one judgement per photo" pass found divergences. Pierre's recorded decisions are gold: 16 rejections, 3 adds over an
auto set-aside. The 1,721 auto-sort Checks have no answer recorded, so they are not gold. (The draw first counted 3 more photos as his adds;
checked before the run, they are in `add` and `seen` alike, auto decisions out of play: they stay in the sample as
rejected photos, scored on their code.) Pierre's 16: 3 auto-adds he rejected, 4 excluded, 9 rejected by hand. No judged candidate carries
Not this (`out`): the reference holds no recorded wrong-species case. Its own noise (FISH.md, 2,058 photos judged twice
by strong models): identical code 37%, may-play disagreement 1.6%, juvenile flag 4.1%, ease off by 2 or more 5.1%; so no
exact-code bar.

**Blindness.** Each judge reads only its batch packet: a rubric excerpt copied from FISH.md, and per photo an opaque id,
the photo downloaded once beforehand from its public iNaturalist URL (500 and 1,024 px, about one a second), the
species' scientific name, the observer's life-stage annotation when there is one, and its observation group. Never the
photo id, the URL or the reference. Same batches and order for every configuration.

**Metrics.** In play (both sides): no `unsure`, `keep` best or alt (a lone photo is its own best), count `1`, `s` or
`o`, no flag `a`; Pierre's gold overrides the reference on G.

1. In-play agreement with the committed reference on the 52 photos it is sure about, G and U excluded; G scored apart
   as agreement with Pierre (the reference itself put his 16 rejections in play), U apart too (a judge sure on the 8
   reference-unsure photos would otherwise top out at 86%: both found by the scorer's self-test, before the run).
2. Serious errors: the judge puts in play a photo the reference keeps out for a reason that misleads players: count `k`
   (another species one could take for the subject), `x` (subject unclear), flag `a` (not a fish in water). A watermark
   never takes a photo out of play (FISH.md "Watermark", Q373), so a missed `w` is reported as `w` recall, not as a
   serious error. Pierre's other rejections put in play are listed apart (his reason is not recorded).
3. Field agreement: each tag, the flags, ease after the caps (exact and within 1), the count's in-play class, `keep` on K.
4. Unsure on photos the reference is sure about.
5. Calls, wall time and tokens where shown.

**Thresholds** (a configuration passes only if all hold): in-play agreement ≥ 90% and at most 5 points under the Opus
high control; serious errors ≤ 1 per 50 photos (≤ 1 here); Pierre-rejected photos put in play no more than the control;
juvenile flag ≥ 90%; ease after caps within 1 ≥ 85%; count class ≥ 90%; extra unsure ≤ 15%; every photo answered with
a valid code. Where the Opus high control itself misses an absolute bar (in-play, juvenile, ease, count class), that
bar is read as the control's figure minus 5 points and the results say so; the serious-error bar stays absolute.

The judges' brief asks for `unsure` "at the least doubt", as the rubric does, so the measured unsure rate is the one the
bulk pass would have.

**Candidates.** The Agent tool's `model` and `effort`: Haiku 5.5 low and medium, Sonnet 5.5 medium and high, Opus 5.5
medium and high (the control). 6 batches of 11-14 photos: 36 judge calls, launched by the integrator from the packets.

**Recommendation rule.** The cheapest configuration that meets every threshold does the bulk; a random share of each
bulk batch is re-judged by Opus 5.5 high to catch drift, sized from the results.

## Results

36 judge calls (6 configurations × 6 batches), launched by the integrator with the Agent tool's `model` and `effort`,
each from its brief verbatim; scored by the protocol's scorer. Every photo was answered; Haiku low and Sonnet medium
each gave one invalid code (a failed bar by itself).

### The protocol's measures

"In play" is agreement with the committed reference on the 52 photos it is sure about (Pierre's rejections and the
reference-unsure photos apart); "weighted" is the same figure with each stratum weighed by its share of the 33,635
judged candidates (the plain photos, 65% of the population, weigh most). "Pierre's rejections in play": of his 16.

| Configuration | In play | Weighted | Serious errors | Pierre's rejections in play | Juvenile flag | Ease ±1 (capped) | Count class | Unsure (extra) | Keep (K) | Pass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 low | 39/52 (75%) | 72% | 3 | 5 | 71/75 (95%) | 68/75 (91%) | 64/75 (85%) | 37/76 (32) | 5/8 | no |
| Haiku 5.5 medium | 42/52 (81%) | 80% | 1 | 5 | 74/76 (97%) | 68/76 (89%) | 58/76 (76%) | 36/76 (30) | 7/8 | no |
| Sonnet 5.5 medium | 40/52 (77%) | 84% | 6 | 7 | 73/75 (97%) | 73/75 (97%) | 63/75 (84%) | 25/76 (21) | 7/8 | no |
| Sonnet 5.5 high | 45/52 (87%) | 94% | 4 | 11 | 73/76 (96%) | 72/76 (95%) | 67/76 (88%) | 21/76 (17) | 7/8 | no |
| Opus 5.5 medium | 39/52 (75%) | 78% | 6 | 7 | 72/76 (95%) | 70/76 (92%) | 63/76 (83%) | 26/76 (22) | 6/8 | no |
| Opus 5.5 high (control) | 40/52 (77%) | 89% | 5 | 7 | 72/76 (95%) | 72/76 (95%) | 60/76 (79%) | 26/76 (22) | 6/8 | no |

The fallback rule (amendment 4) applies: the control missed the in-play bar (77% < 90%) and the count-class bar (79% <
90%), so both read as the control's figure minus 5 points (72% and 74%). Even so nothing passes. The serious-error bar
(≤ 1) stays absolute and only Haiku medium meets it, which then fails on unsure (30 extra of 76, 39%, against ≤ 15%):
it keeps photos out by doubting, not by judging. The watermark recall is 4/4 for every configuration.

Field agreement with the reference (exact unless marked):

| Configuration | View | Whole | Light | Colour loss | Loss ±1 | Clarity | Size | Count | `c` flag | `a` flag | Ease exact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 low | 57% | 84% | 67% | 55% | 93% | 53% | 56% | 75% | 88% | 97% | 44% |
| Haiku 5.5 medium | 58% | 82% | 76% | 57% | 99% | 62% | 55% | 64% | 89% | 99% | 43% |
| Sonnet 5.5 medium | 63% | 93% | 56% | 61% | 97% | 64% | 60% | 75% | 83% | 97% | 44% |
| Sonnet 5.5 high | 63% | 86% | 68% | 74% | 97% | 55% | 61% | 74% | 83% | 97% | 50% |
| Opus 5.5 medium | 62% | 88% | 80% | 70% | 99% | 54% | 62% | 67% | 99% | 97% | 45% |
| Opus 5.5 high | 61% | 91% | 75% | 66% | 99% | 55% | 54% | 66% | 96% | 99% | 51% |

### Serious errors (photo put in play, reference out for a misleading reason)

| Photo | Reference | Put in play by | Their code (Opus high's where it is one) |
| --- | --- | --- | --- |
| [s177 727792906](https://inaturalist-open-data.s3.amazonaws.com/photos/727792906/medium.jpg) | `d1g3bsx1` (subject unclear) | Sonnet medium, Sonnet high, Opus medium, Opus high | `o1d3ml12` |
| [s523 545241348](https://inaturalist-open-data.s3.amazonaws.com/photos/545241348/medium.jpg) | `o1g1slk3` (confusion possible) | Haiku low, Sonnet medium, Sonnet high, Opus medium, Opus high | `o1g1slo3` |
| [s151 78472361](https://inaturalist-open-data.s3.amazonaws.com/photos/78472361/medium.jpeg) | `p1g2msx1` (subject unclear) | Haiku low, Sonnet medium, Sonnet high, Opus medium, Opus high | `p1d1mms2` |
| [s484 429004438](https://inaturalist-open-data.s3.amazonaws.com/photos/429004438/medium.jpeg) | `p1g1msx1` (subject unclear) | Sonnet medium, Sonnet high, Opus high | `o1d1mmo2` |
| [s281 413930590](https://inaturalist-open-data.s3.amazonaws.com/photos/413930590/medium.jpeg) | `p0g1smk2` (confusion possible) | Opus medium, Opus high | `p1g1smo3` |
| [s342 160680754](https://inaturalist-open-data.s3.amazonaws.com/photos/160680754/medium.jpg) | `o1g0slk3` (confusion possible) | Haiku medium, Sonnet medium | `o1g0sms4` (Haiku medium) |
| [s531 329534569](https://inaturalist-open-data.s3.amazonaws.com/photos/329534569/medium.jpeg) | `p1d2msx1` (subject unclear) | Sonnet medium | `p1d3bss1` |
| [s465 682749121](https://inaturalist-open-data.s3.amazonaws.com/photos/682749121/medium.jpg) | `p1g3msx1` (subject unclear) | Opus medium | `o1d3mss1` |
| [s440 612626739](https://inaturalist-open-data.s3.amazonaws.com/photos/612626739/medium.jpg) | `d0g1smk1` (confusion possible) | Opus medium | `d1d2mmo2` |
| [s361 699495529](https://inaturalist-open-data.s3.amazonaws.com/photos/699495529/medium.jpg) | `d1g0sm1a2` (out of water) | Haiku low | `p1d3ml12` |

No configuration put in play a photo out of water except Haiku low, once. The first four photos carry most of the
errors and were put in play by four or five configurations each, the control among them. The study's author looked at
those four after scoring (not blind, so as a note, not a measure): s177 is one large grouper in blue water, the subject
plain (the reference's `x` and size `s` look wrong); s151 is a school of one kind of fish in the blue (`s` by the rubric,
"a school in the blue" is ease 2); s484 shows two or three fish of one kind (`s`); s523 is a bannerfish with a
butterflyfish behind it, both Chaetodontidae, where `k` or `o` depends on the level the game asks for that species
(FISH.md "Other species: the split"), which the packets did not give.

### Pierre's 16 rejections

The reference put all 16 in play. Blind, the judges kept out between 5 (Sonnet high) and 11 (both Haiku) of them, Opus
high 9; three of them (s356 238271011, s057 614420723, s008 680457203) were kept out by all six configurations (out of
water, or another species one could take for the subject). Three he rejected were put in play by all six (s463
726258560, s506 624479889, s204 333030518): photos that pass the rubric, rejected for a reason it does not hold. Much
of the Haiku "agreement" with him is unsure, not a verdict.

### Judges against each other

| Pair | In play (52) | View | Light | Colour loss | Clarity | Size | Count | Ease ±1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Opus medium vs Opus high | 43/52 (83%) | 84% | 92% | 91% | 89% | 86% | 87% | 100% |
| Sonnet high vs Opus high | 47/52 (90%) | 75% | 83% | 72% | 82% | 88% | 86% | 99% |
| Sonnet medium vs Sonnet high | 45/52 (87%) | 75% | 84% | 83% | 84% | 76% | 89% | 100% |
| Haiku medium vs Opus high | 40/52 (77%) | 64% | 80% | 67% | 71% | 82% | 71% | 97% |
| Reference vs Opus high | 40/52 (77%) | 61% | 75% | 66% | 55% | 54% | 66% | 95% |

The judges agree with one another more than with the reference: Sonnet high and Opus high 90% on whether a photo
plays, Opus high and the reference 77%. On the 52, Opus high's 12 disagreements with the reference are 5 photos it put
in play that the reference keeps out, 4 it kept out only by being unsure and 3 it kept out by its code.

### Cost and time

Not recorded per call. The Agent results showed about 95,000-120,000 subagent tokens per call (11-14 photos, so about
7,000-9,000 per photo) and 45-240 s per call, Haiku and Sonnet faster
than Opus.

## What it implies

1. **The bottleneck is the reference and the rubric's determinacy, not the model's size.** A strong model re-judging
   blind disagrees with the strong-model reference on about a quarter of the in-play calls (Opus high 77%), while two
   fresh judges agree with each other at 83-90%. The 2026-11-15 figure (1.6% may-play disagreement over 2,058 photos
   judged twice) covers every kind of photo, mostly plain ones; this sample is enriched with hard cases, and weighted
   by the population Opus high's agreement is 89%, so about one bulk photo in ten would change its in-play call. Light, colour loss, clarity, size and view
   agree at 54-75% even between Opus high and the reference; ease within one point (95%), the juvenile flag (95%) and
   the watermark (4/4) hold.
2. **No cheaper configuration can be validated against this reference.** Its thresholds fail for the control itself; a
   lighter model that "matched" it would only match its noise.
3. **The fields where judges diverge most** are where the rubric could be tightened: the count at the `x` / `s` line
   (a school of one kind, two fish of one kind: the reference says "subject unclear", the judges a school) and at the
   `k` / `o` line (it needs the level the game asks for the species: give the judge the family and the circle); then
   size (54-62%), clarity (53-64%), view (57-63%), colour loss (55-74%) and light (56-80%), whose levels are not
   anchored by examples.
4. **Unsure is far more frequent blind** (21-37 of 76, against 94 of 33,635 in the reference): "at the least doubt" on
   a fresh look keeps a quarter to a half of the photos out, each a look for Pierre.
5. **Pierre's 16 rejections are the only gold**, and the blind judges catch more of them than the reference did (Opus
   high 9, the reference 0): a fresh look is worth something even where it disagrees with the old one.

## Recommendation

- **Fish photo judging stays on Opus 5.5 at high effort** (the strongest measured, the one AGENTS.md puts in doubt
  cases): no lighter configuration is validated, and Haiku 5.5 is not validated for it.
- **A drift check on the bulk**: a random 5% of each judging batch, at least 30 photos, re-judged blind by a fresh Opus
  5.5 high pass on the same packets, its in-play agreement reported in the PR. With the 83-90% judge-to-judge agreement
  measured here, about 125 pooled photos estimate a disagreement rate of 15-20% to within ±7 points; 150 photos with no
  serious error bound that rate under 2% (rule of three). A batch whose drift sample falls under 80% is re-looked.
- **Before any new measure, a gold set**: Pierre's 16 rejections plus the photos where three or more configurations
  differ from the reference on the in-play call (here 5) and on count, decided once by Pierre as a Check batch
  in the admin; and the rubric's count line written with examples (school of one kind = `s`; the family and circle on
  the packet for `k` / `o`). Then the sample test is run again against the gold set, and a lighter model gets its chance
  there.

**Proposed docs/INTEGRATOR.md model-table line** (for the integrator; not changed in this PR):

| Task | Model | Effort |
| --- | --- | --- |
| Fish photo judging (the candidate pass, judging/FISH.md) | Opus 5.5: no lighter model validated (sample test 2026-11-19, docs/reviews/2026-11-19-model-measure-fish-judging.md: the reference does not reproduce itself; re-measure on a gold set); a 5% drift sample, at least 30 per batch, re-judged blind | high |

and the "Mechanical, repetitive work" row's "sorting photos" then reads "sorting photos (not fish photo judging, row
above)".

## Limits

- 76 photos: one disagreement moves a rate by about 2 points; the strata were enriched with hard cases.
- The packets gave the species name but not the family or circle the `k` / `o` split depends on, nor the observation's
  earlier photos Pierre had added (context the judging sheets show).
- Each judge saw single photos at 500 px with a 1,024 px copy, not the 12-tile contact sheets of the real pass.
- The reference spans many passes and rubric versions (light re-judge, the count split, the one-judgement pass).

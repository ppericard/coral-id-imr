# Model measure: fish photo judging (study, 2026-11-19)

**Status: protocol written and frozen, judge run pending.** The results, the recommendation and the proposed
docs/INTEGRATOR.md model-table line are added to this file once the 36 judge calls are scored.

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

Pending.

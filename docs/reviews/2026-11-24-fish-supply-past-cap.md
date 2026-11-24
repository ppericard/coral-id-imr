# Fish supply past the candidate cap (2026-11-24)

Status: measure, read-only, docs only (Linear REE-272, question Q-c of the
[photo capacity study](2026-11-24-photo-capacity.md), PR #1535). Nothing was written to a data file, a curation file, the sheet or
R2, no photo was judged (rule P7), and no code was changed. iNaturalist was read only through `tools/inat.py` (rule C7:
paced at one request a second, batched, the project's User-Agent). Written on `origin/main` at dd98f6fc, the counts
read on 2026-11-24 about 14:50 to 15:00 Manila.

Labels (rule W11): **[measured]** counted by a script on iNaturalist or on the files of `main`; **[read]** read in a file,
a rule or Linear; **[computed]** arithmetic on measured figures; **[guess]** a judgement or an extrapolation.

## Why

Pierre, 2026-11-24 14:47 Manila, answering Q-c of the capacity study («ok»): measure what the fish would find beyond their
candidate cap, for the species where the study could not tell, with one batched iNaturalist read and no judging.

## 1. Answer first

**Supply is not what stops the fish at their caps: for 222 of the 223 species measured, iNaturalist holds more usable
observations than the candidates hold, and enough to fill a raise of 10 on `BASE_CAP` for 197 of the 200 species
that raise reaches.**

| Observations beyond what the candidates hold | Philippines | Abroad (Indo-West Pacific) | Philippines and abroad |
| --- | ---: | ---: | ---: |
| None | 10 | 1 | **1** |
| 1 to 9 | 40 | 5 | 3 |
| 10 to 29 | 61 | 25 | 16 |
| 30 to 99 | 77 | 27 | 34 |
| 100 or more | 35 | 165 | 169 |
| Species | 223 | 223 | 223 |
| Observations in all | 12,168 | 104,866 | 117,034 |

[measured] The 223 species are the 91 whose open room is only a juvenile's or a sex's and the 132 not short (the study said
130 [guess: it subtracted from the 662 species in play; the lists today hold 664 species on 663 taxa]). The one species with
nothing more is *Amblyeleotris ogasawarensis*. Ten species have nothing more in the Philippines; nine of them have
observations abroad.

So the caps are what binds, as Pierre suspected («peut-être que les seuils eux-même ont besoin d'être relevés»):

- **Raising `BASE_CAP` from 30 to 40 (`MAX_CAP` stays 60) adds about 2,220 candidates** [computed, section 4]: 1,585
  observations, 199 species gain and 197 fill the whole raise. About 1,980 of them could come from the Philippines alone.
  Storage if all entered play: +0.53 GB (at 237 kB a photo). **Judging, rule P7: 2,220 photos, six to seventeen agent
  sessions** at the 130 to 390 photos a session of the earlier fish batches [read: REE-243's P7 request].
- A raise of 20 (`BASE_CAP` 50, `MAX_CAP` 80) adds about 4,840 candidates (+1.15 GB, 12 to 37 sessions).
- **This corrects the capacity study on one point** (section 5): the 421 species it called "searched to the end" also hold
  more than their candidates, so they can be refilled under today's caps without raising anything.

## 2. What was measured, and how

**The predicates are the fetcher's own** [read: `tools/fetch_fish.py` `queries`, `usable_obs`, `tier_of`]: Research Grade,
`captive=false`, with photos, a licence in `OK` (CC0, CC BY, CC BY-NC: asked as `photo_license=cc0,cc-by,cc-by-nc`, not the
fetcher's wider search licences, which add the share-alike ones that `lic_ok` then drops), the observation's own
`photo_taxon` (the species, or its `photoTaxon`) with the subspecies below it, and the two places of the fetcher:

- **Philippines** = `place_id=6873`, the fetcher's `ph` search (it contains its `dauin` and `region` searches);
- **Abroad** = `not_in_place=6873` inside the Indo-West Pacific box (30 S - 30 N, 90 E - 170 E), the fetcher's `world`
  search. All 223 species are confirmed in the Philippines (`present.ph`), so abroad is open to them, and all 223 are
  confirmed near Dauin (`present.near`), so the fetcher draws from anywhere, not nearest first (`select` `anywhere`).

Dead fish are left out as the fetcher leaves them out (annotation Alive or Dead = Dead, 17/19): counted positively and
subtracted, 20 observations in the Philippines and 245 abroad of 14,196 and 111,899. Pierre's own Needs ID
observations are not Research Grade, so they are not in the count (the fetcher takes them first anyway).

**Beyond what the candidates hold.** Supply = usable observations of the place, less the Research Grade observations of
that place the species already holds [measured: `data/fish-cand.json`, all states (an observation Pierre rejected or the
pre-sort set aside is held too: the fetcher never takes it again), and the observations of its photos in
`fish-game.json`]. Counts are observations, not photos: the fetcher's cap counts weighted photos (`obs_cost`: the first
photo of an observation 1, each further one 0.5) and the candidates of these species hold 1.40 photos an observation
(room 1.2 an observation) [measured], which converts them in section 4.

**The read** [measured]. `observations/species_counts`, 100 taxa a request, through `inat.leaf_counts`: counts only, no
observation downloaded. 2 places × 2 queries (usable; Dead) × 3 requests for the 243 taxa of the three groups (the 223, the
18 species at their cap short of easy adults, and the 2 wink species) = 12 requests; 2 × 2 × 5 = 20 more for the other 420
taxa (a check, section 3). **32 requests planned, 32 asked, then 9 for a spot check: 41 in all** (limit 60, no retry:
`inat.calls` counted 41 attempts for 41 distinct URLs). No taxon needed asking on its own (no observed subspecies row
below a species).

## 3. Does the subtraction hold? (method check)

[measured] On three species (*Amphiprion clarkii*, *A. ocellaris*, *Pomacentrus moluccensis*) I asked, for the
observations the candidates hold, how many match the same count query (`observations?id=<held ids>&<query>&per_page=0`).
The held Research Grade observations of the subtraction agree in five of the six counts and differ by one in the sixth.
The fetcher's own first page of the Philippine search for each (one request each, `usable_obs` on 200, 200 and 181
observations): 200 of 200 pass and 190 are not held; 200 of 200 and 193 not held; 175 of 181 pass (the count query says 175)
and 157 not held, the supply the subtraction gives. So the supply is real observations the fetcher would take today.

## 4. Which caps would bind, and what raising them adds

**What sets the cap of the 223** [read: `cap_of`, `family_cap`; measured]:

| What sets the cap | Species | Philippines: none | 1 to 9 | 10 or more | Median in the Philippines | Median, Philippines and abroad |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Own cap 30 (no extra phase) | 63 | 7 | 15 | 41 | 17 | 140 |
| Own cap 40 (one extra phase) | 118 | 2 | 17 | 99 | 39.5 | 501 |
| Own cap 50 (two extra phases) | 19 | 0 | 5 | 14 | 43 | 387 |
| Own cap 60 (three extra phases, `MAX_CAP`) | 20 | 1 | 3 | 16 | 46.5 | 404.5 |
| Family floor (`FAMILY_FLOOR` 90 shared) | 3 | 0 | 0 | 3 | 68 | 292 |

Every kind of cap binds: only one species (*Amblyeleotris ogasawarensis*) is held at its cap by a lack of supply. The
species with the thinnest Philippine supply are the cap-30 ones (22 of 63 have under 10 more in the Philippines), which is where
abroad photos would fill a raise.

**What a raise adds** [computed from the table above and the measured counts]. Raising a cap by Δ adds room Δ; an
observation costs 1.2 of it (1.40 photos); a species adds min(Δ ÷ 1.2, its supply) observations; its photos are 1.40 an
observation. The species drawing from anywhere (all 223) take Philippine and foreign observations in proportion to what
each holds [guess: the order within a pool is variety, then licence, then a hash, no distance]; the right-hand column
takes Philippine observations only.

| Raise | Room added | Species that gain | Fill the whole raise | Candidates, both places | Candidates, Philippines only (species gaining, filling) | If all in play | Judging (P7) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `BASE_CAP` 30 to 40, `MAX_CAP` stays 60 | 2,000 | 199 | 197 | **2,223** | 1,979 (191, 162) | +0.53 GB | 2,223 photos, 6 to 17 sessions |
| `BASE_CAP` 30 to 40 and `MAX_CAP` 60 to 70 | 2,200 | 219 | 217 | 2,448 | 2,183 (210, 179) | +0.58 GB | 2,448 photos, 6 to 19 sessions |
| `BASE_CAP` 30 to 50 and `MAX_CAP` 60 to 80 | 4,405 | 220 | 211 | 4,842 | 3,964 (211, 143) | +1.15 GB | 4,842 photos, 12 to 37 sessions |

The 18 species at their cap and short of easy adults (the faved route's, REE-243; the 2 wink species at 5 are left out,
their cap is `WINK_CAP`) hold 12,467 observations more (1,351 in the Philippines; 17 of 18 have 10 or more in the two
places): the first
row would add 129 candidates for them, the second 140, the third 275.

Two readings of these figures:

- The capacity study's bound for the 221 species (at most 2,210 photos, +0.52 GB) was right and is now measured: supply
  fills it. [computed]
- Sessions and storage are upper bounds: 66.5% of judged fish candidates reached play [read: the capacity study, under the
  old `dup` reading], so about 1,480 of the 2,223 would [guess]. The judging is the cost, not the storage: P7 asks
  Pierre's OK for the pass above 100 photos, and what can be scripted from recorded codes is scripted first.

The ceiling, for scale: with no cap at all the 223 species would hold 117,034 more observations (about 164,000 photos,
38.9 GB [computed]). Supply never binds at any cap Pierre could choose.

## 5. What this changes in the capacity study

The capacity study (section 3.1) says the 421 species with general room left had their general searches "found nothing
more", so their supply under the source rules is exhausted below their cap. I measured the same count for them (the 20
requests of section 2) as a check, and it says otherwise [measured]:

- 271 of the 421 have 10 or more usable Philippine observations they do not hold, 357 have 10 or more with abroad;
  only 53 have under 3 (47 have none). The Philippine supply beyond what they hold is 19,566 observations; abroad 152,385.
- Their open room is 1,771 general units [measured, as the study]. 310 species have enough Philippine supply to fill their
  own room, 364 with abroad.
- The refill skips them because `tools/fish_refill.json` says their open parts were "searched to the end" on dates from
  2026-11-07 to 2026-11-23 (fresh for `RECHECK_DAYS`, 30), not because iNaturalist is short [read].
- Why a species with 665 usable Philippine observations (*Amphiprion clarkii*) was recorded as exhausted with room still
  open is not established here [guess: the room opened after the recorded search, when the judging pass set photos aside
  (9,284 `dup`), and the record stays fresh for `RECHECK_DAYS`; or `exhausted` marks a part that "got nothing" without reading
  its search to the end]. Reading `exhausted` against a run's log would settle it.

So **refilling the existing room needs no cap change and no new rule**, only a recheck of those species (the record
voided or its day moved): the room is 1,771 units, about 2,000 candidates at 1.11 photos a unit [computed from the
first row of section 4], with a P7 pass of its own. The 91 species whose open room is a phase's
(82 juvenile, 11 female, 10 male) have a phase room of 673 units that this read did not count: a juvenile or a sex
annotation is a different query (see section 6).

## 6. What is not measured

- **Phase supply** (juveniles, females, males annotated on iNaturalist) for the 91 species with a phase room: not asked;
  it is a Life Stage or Sex query per phase (about six more requests for the same 100 taxa a request) if wanted.
- **The abroad boundary and reading depth.** The count takes every observation in the box; the fetcher's search reads at
  most five pages of 200 newest first, so past 1,000 it sees the newest. No raise here needs more than about 50 from a
  species, so the depth never binds [computed].
- **Photos, not observations.** The conversion uses a mean of 1.40 photos an observation from the candidates held; a
  species' own mean differs [guess: about 1 to 2].
- **Observations by licence per photo.** The query counts an observation with at least one photo under CC0, CC BY or
  CC BY-NC; `usable_obs` also needs that photo to be unused, which holds for any observation not held (the spot check agrees).
- **How many of the new candidates would pass the judging.** Not judged, as asked.

## 7. For Pierre

Q-c is answered: the supply past the cap is large, so the caps are the lever. Nothing here changes a cap; Q36 and P7 are
his. Options, with a recommendation (all in agent time and quota, nothing built):

1. **Fill the room that is already open first** (421 species, 1,771 units; section 5): no cap change; P7 for the judging
   of up to about 2,000 candidates, scripted triage first. Recommended first, because it needs no decision about the caps.
2. **Raise `BASE_CAP` 30 to 40** (`MAX_CAP` stays 60): about 2,220 candidates, +0.53 GB at most, 6 to 17 sessions of
   judging under P7. Recommended after (1) if the judged photos are not enough.
3. **Leave the caps** and rely on the faved route (REE-243) and the `dup` extras (REE-257).

Each of the first two fits under 10 GB alone (at most about +0.5 GB on today's 7.5 GB [computed]); together with the
other pending intake they matter for Q-b (capacity study, section 4), not before.

## 8. Sources

- Counts: `observations/species_counts` through `tools/inat.py` (`leaf_counts`), 2026-11-24, 32 requests, and a spot
  check of 9 more; Linear REE-272.
- Code: `tools/fetch_fish.py` (`queries`, `usable_obs`, `cap_of`, `family_cap`, `species_room`, `shortness`, `pick_short`,
  `exhausted`), `tools/inat.py`, `tools/fish_refill.json`; data: `data/fish-cand.json`, `fish-game.json`, `fish.json`.
- Rules and decisions: C7, P7, W11; Q36; REE-243, REE-257; the capacity study ([2026-11-24-photo-capacity.md](2026-11-24-photo-capacity.md)).

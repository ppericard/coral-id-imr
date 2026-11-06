# Content rules: the IMR course, sources, presence

Pierre's standing rules on what the app teaches and where it comes from. Each rule: the imperative line, its details,
*Why*, *Source* (Pierre and the date; "by 2026-11-01" for the rules written before the handover). The index of every
rule is in [AGENTS.md](../../AGENTS.md#the-rules). Fish-only content rules are in [subjects.md](subjects.md).

### C1

**Never contradict or "correct" the IMR course or its lecturers in the app.** Keep the IMR wording (families, lecture
lines, mnemonics, spellings). Where another source differs, add at most a discreet, dated, sourced note ("Source X
(year) says…", shown as "Other sources" from `gen[g].info`), never "the lecture is wrong/outdated". Obvious slide slips
are silently not reproduced and mentioned to Pierre only. When a source is old, trust IMR unless a very reliable
*recent* source says otherwise: IMR trainers may be more up to date than the literature.
*Why:* Pierre is new at IMR and the app is used there; visibly correcting the trainers would hurt his relationships.
*Source:* Pierre, by 2026-11-01.

### C2

**Never invent categories or information.** Groupings come only from existing references: IMR Lecture 6 groups (1-11),
Coral Finder 2022 categories/boxes, the 7 IMR growth forms, or a mix. Every clue, label or pair carries its source
(slide number, CF page/box).
*Why:* Claude-made look-alike "families" were rejected. *Source:* Pierre, by 2026-11-01.

### C3

**An ID tip is short, simple and understandable by everyone, whatever its source** (IMR or another one): one tip or
a few essentials. The tips are what the app puts forward: the **ID tip** (`gen[g].qt`; corals: from
`tools/id_tips.txt`) is shown everywhere (quiz feedback, cards, ID tips view, comparisons) in a highlighted box. The
technical, descriptive detail of what separates a unit from another goes on its sheet (corals: the full lecture cues,
`gen[g].imr`, incl. review slides and presenter notes, appear there under "IMR lecture notes").
*Why:* tips had once turned into scientific manuals; a tip must work at a glance for anyone.
*Source:* Pierre, by 2026-11-01; what a tip is, 2026-11-05; subject-neutral wording, 2026-11-06.

### C4

**Corals: growth form is an entry point only**: never genus-specific, never a strict filter (rank, don't filter), and never a
way to group or pick genera: a list of genera is A-Z, the slate order or the IMR lecture groups. Photos use the 7 IMR
(AIMS lifeform) forms: Branching, Tabulate, Encrusting, Foliose/Plating, Massive, Submassive, Mushroom (+ "x" too close
to tell, + a separate "polyps extended" flag); one form per photo, the dominant visible one. The polyps flag ✿ only for
polyps visibly extended at colony scale, only for the Coral Finder "extended by day" genera (Alveopora, Duncanopsammia,
Goniopora, Heliofungia, Plerogyra, Tubastraea), never on macro photos.
*Why:* many genera take 3-4 forms or more; only the solitary mushroom corals keep one.
*Source:* Pierre, by 2026-11-01; grouping by form, 2026-11-03 (the custom quiz's selection screen); subject-neutral
wording, 2026-11-06.

### C5

**Leave open discrepancies between sources to Pierre and the IMR trainers.** List them (questions for an IMR
trainer, nomenclature points, content questions) in `points.json`, which Pierre settles in the admin (Inbox › To do ›
Points), in neutral wording (rule C1); don't settle them yourself. The slide text is not the whole course: some points are only said in class or
only shown in an uncaptioned photo, so a criterion missing from the slides is "check with an IMR trainer", never "not
taught".
*Why:* see C1; Pierre never reads a text list, he settles the points in the admin. *Source:* Pierre, by 2026-11-01; the
admin's points list, 2026-11-05 (#571).

### C6

**ID cues and their doubts are for the place we learn.** Evidence and examples in ID content (notes, tips, look-alikes,
the reasons a cue may fail) come only from species found around Dauin, at most in the Philippines. Never add doubt to a
cue with a species from elsewhere (the Caribbean, the Red Sea…). A species is present in the Philippines by rule C8
(Needs ID alone, Pierre's included, never confirms). Check it before citing a species, with observers and not only
Research Grade counts (batched, rule C7; `tools/presence.py` `species_presence` does it per taxon), and say in the PR
which test each species passes. Example: the Favites notes (`tools/apply_favites.py` lists them).
*Why:* the app teaches recognising the corals where the RAs dive. *Source:* Pierre, 2026-11-04; subject-neutral wording, 2026-11-06.

### C7

**Respect the iNaturalist API's terms.** About one request per second at most (sleep between calls; never parallel);
batch many ids or taxa into one request instead of many small ones (`id=1,2,3`, `taxon_id=a,b`,
`observations/species_counts` on a family rather than one call per species); always send a User-Agent naming the app.
Retry a 429 or a 5xx after a pause, never in a tight loop: `tools/fetch_local.py` paces and retries (#481); a new tool
does the same. A review of every iNaturalist tool for batching is in ROADMAP.
*Why:* the app depends on iNaturalist's goodwill and open data. *Source:* Pierre, 2026-11-04.

### C8

**Presence: one rule for every species, fish and corals.** **Confirmed in the Philippines** = any of: (1) Research
Grade iNaturalist observations in the country (place 6873) by **at least 3 distinct observers**; (2) **at least 1**
Research Grade observation in the country **and** an independent checklist that lists the species for the Philippines
(fish: FishBase country checklist, Table 1 "present"; corals: Corals of the World, a Philippine ecoregion;
`tools/presence_checklists.json`): a checklist alone never brings in a species nobody observed; (3) **confirmed near
Dauin**: Research Grade observations within 40 km of Dauin by at least 2 distinct observers, or the IMR reference list
(fish: the EventMeasure PDF). Pierre (`ppericard`) is one observer like anyone else: his Research Grade observations
count, his Needs ID ones confirm nothing, here or near Dauin (his species-level photos stay usable, rule S2). Defined
once in `tools/presence.py` and used everywhere presence is decided: `tools/build_fish.py` (`fish.json` `present`: in
the game or out), `tools/fetch_fish.py` and `tools/fetch_local.py` (photos from abroad only of confirmed species),
`tools/coral_presence.py` (`presence.json`: a coral photo taken abroad of a species not confirmed is flagged "out of
rule" in the admin, never removed automatically: Pierre decides). Change the rule there, not in a tool.
*Why:* one standard of evidence for every species and every observer, Pierre included. *Source:* Pierre, 2026-11-04.

# Roadmap: deferred ideas, open questions, pending actions

Ideas that were discussed with Pierre but not built (yet), with where they came from and where they stand. **Any agent: when an idea is discussed and not implemented right away, add it here** (one line is enough: what, source, status). When something ships, move it to "Done recently" with the PR number, or delete it.

Status words: **Waiting on Pierre** (needs his action or decision), **Next** (agreed, not started), **Parked** (agreed idea, deliberately later), **Open question** (undecided), **Declined** (kept so nobody proposes it again).

Sources: "thread X" = a Claude project thread with Pierre; dates are 2026. Design docs on claude.ai are private to Pierre.

## Waiting on Pierre

| Item | Source | Status |
|---|---|---|
| **Redeploy Code.gs v7** (v6, PR #250: progress of any size, stale-write check, PIN throttle, secret anonymous-id salt; v7: players' reports, `Reports` tab). App and admin work with v5 meanwhile; players' reports wait in their browsers until v7 is live. After redeploying, open admin Triage once from the browser signed in to the sync with Pierre's name, so that name becomes the reports owner (Script property `OWNER`). | thread "Review the code as an expert developer" | Waiting on Pierre |
| Review ~10 debatable lecture points (left verbatim): Pocillopora "verrucae purely ornamental", Goniastrea "paliform lobes on the oral disc", Montipora "smallest corallites of all", Tubastraea "dark green to black", Mycedium "no tentacles", Plerogyra "looks solitary", Herpolitha "solitary"; better mnemonics proposed (Acropora = pore at the tip, Pavona = peacock). Any change becomes a discreet note, never a correction. | thread "Fact-check all coral content on the site", PR #22 | Waiting on Pierre |
| Stylophora wording: Pierre remembered "like Pocillopora but fuzzy"; presenter notes say "smooth from afar, unlike Pocillopora" and "chicken popcorn" (Pierre remembered "chicken nuggets" for Pocillopora). App keeps the written wording. Pierre reviews the course on Mon 2026-11-02 and corrects it himself. | project chat, 2026-10-31 | Waiting on Pierre |
| Merulina placement: shown with Hydnophora (lecture group 7); group 5 is the alternative. | thread "Declutter the UI across the app", PR #66 | Waiting on Pierre |
| Look-alikes page: Pierre will judge the montage deck in use; if it doesn't convince, drop the tab (pairs stay on sheets, Home, duels). | thread "Review the site as a new RA"; PR #159 | Open question |
| Lab "Keep / Trim" votes are stored in Pierre's browser only; ask him which tools he marked before trimming the Lab. | thread "Prototype visual coral ID tabs" | Waiting on Pierre |
| IMR benthic deck (may cover fire coral / Millepora): Pierre will look for it. The "Substrate monitoring 2023" and "Intro to substrate" decks are MCP (Marine Conservation Philippines), not IMR; Pierre said not to mine them yet. | thread "Add Dauin genera to the Coral Finder" | Waiting on Pierre |

## Questions for an IMR trainer

Never settle these in the app; keep the lecture's version.

- Slide 16 right half: Pierre ~90% sure it is Stylophora (captioned "likely").
- Lecture doesn't cover Merulina, Cyphastrea, Halomitra (starred genera): no lecture group of their own.
- Plerogyra family: lecture says Euphylliidae; WoRMS lists Plerogyridae (shown as an "Other sources" note).
- Herpolitha described as "solitary"; Duncanopsammia at Dauin = D. peltata plates; Favites with shared + separate walls.
- Corallite arrangement placements to check: Mycedium, Diploastrea, Pectinia (Corallite anatomy tool).

## Next (agreed, not started)

| Item | Source | Status |
|---|---|---|
| **Code formatting + modules** (code review L1, accepted by Pierre): one Prettier pass (printWidth 140, `npx`, no package.json, listed in `.git-blame-ignore-revs`), then split `app.js` into `<script type="module">` files page by page. The formatting commit touches every line, so do it only when no other thread has an open branch. | thread "Review the code as an expert developer" | Next, when other threads are idle |
| **Repo size watch** (code review L6): `.git` ~194 MB, `img/` ~185 MB; above ~600 MB move `img/` to a separate photo repo (same origin, no code change for reading). | same | Watch |
| **Calibrated, medium-size game photo sets**: draw game photos by Elo band per genus × view rather than at random; maybe cap set size while keeping a real difficulty spread and enough photos to learn the genus, not the photos. Never shrink sets automatically: suggest, Pierre confirms. Needs enough answers first. Whether to cap at all is still open. | thread "Analyse player levels and photo Elo" | Next / Open question |
| Growth form + quality guesses for auto-refilled candidates (they arrive without guesses; Claude classified PR #181's batch by eye in PR #182). Do it when Pierre asks. | thread "Review photo candidates on phone" | Next (on request) |
| Near-duplicate / redundancy suggestions among IMR + Pierre photos in Triage, and a visual pre-pick of Featured into `picks.json`. Partly done (`find_dups.py`, PR #149); re-run after adding photos. | thread "Design photo usage per context" | Next |
| Admin toggle for `curation.json` `use` (`ref` / `game`): the field exists, no button yet. | PR #96 | Next |
| **Photo Elo without Pierre's answers in the games**: admin Stats can now show photo Elo "Without me" (replayed in the browser, PR for thread "Exclude my answers from photo Elo"), but the games still use the sheet's `?stats=1` over everyone. Plan: once most game photos have ~10 RA answers, Code.gs v6 skips the author's answers (or weighs them less) in `stats_`; needs a redeploy by Pierre. Until then his answers act as a cold-start prior (all 97 answers so far, 2026-11-01, are his). Nothing to reset: Elo is replayed from the Answers log each time. | thread "Exclude my answers from photo Elo" | Next (when RAs have played) |
| **Branching Cyphastrea photos** for the Acropora / Cyphastrea comparison (Coral Finder p. 8 puts Cyphastrea among branching corals; ramose forms such as *C. decadia*). None of ours is branching (2026-11-01); iNat has *C. decadia* at Sumilon (obs 269721269, CC BY-NC). Pierre can hide the pair in admin Look-alikes until then. | thread "Add a hide button for weak comparisons" | Next (needs photos) |
| Paliform-lobe photos in Corallite anatomy have no ring yet. | thread "Rethink the corallite anatomy explorer" | Next |

## Parked (medium term)

Pierre's short-term goal is ID on ideal photos, or on dives with time to examine each colony. These come after.

| Idea | Source | Status |
|---|---|---|
| Bonus genera: more of them (Euphyllia / Fimbriaphyllia are the most observed at Dauin but only look like each other, not a slate genus), in Memory too, and an admin control of the list (now `BONUS` in `app.js` + `tools/apply_bonus.py`). | thread "Add bonus genera like Millepora to games" | Parked |
| **ReefCloud point drills**: practice mode on top-down 50 cm benthic photos, label the coral under a point (like ReefCloud's 5 points per image), ideally from real IMR ReefCloud images + label export. | threads "Brainstorm better ways to learn coral ID", "Build one coral ID web app"; study <https://claude.ai/artifact/7wiyZLjhcoiRrDVL5xa9e6> | Parked. Pierre declined to provide ReefCloud images for now: don't ask again unless he brings it up. |
| 4th "ReefCloud" view per genus, from crops of annotated points. | thread "Make the app usable on mobile" | Parked (same reason) |
| **Realistic / degraded mode**: transect-like images (top-down, blue/green cast, blur, low resolution), as an advanced level after ideal photos. Poor-quality photos already feed the hard end of games. | threads "Build one coral ID web app", "Brainstorm…" | Parked |
| **RealityScan** (3D models of 50 × 50 cm plots) and **Metashape** (orthomosaics of 3 × 50 m transects, the hardest level) crops as exercise material. | IMR survey method, 2026-10-31 | Parked |
| Calibrate exercises against trainer annotations of the same frames. | thread "Brainstorm…" | Parked |
| **Response-time signal**: use answer speed (fluency) as an extra mastery or difficulty signal, without making mastery time-based. | thread "Make game difficulty more progressive" | Parked / Open question |
| Short-term study ideas not built: "decisive criterion" feedback (right genus for a wrong reason = warning), contrast sheets per look-alike group, evening check after each dive with close-ups of doubtful colonies, an underwater slate with the observation routine, a dive with a trainer. Some are outside the app. | study "Learning coral ID faster" <https://claude.ai/artifact/7wiyZLjhcoiRrDVL5xa9e6> | Parked |
| Learning-path study leftovers: bigger photo bank (~20 per genus), misses shown as photos side by side, Compare candidates (Coral Finder workflow), speed round, one shared module registry instead of `MODES` / `GRADUATED` / `PLANNED`, a final check (~85%). Note: "quiz limited to one IMR group" conflicts with the later rule "never split practice by lecture groups". | study <https://claude.ai/artifact/WYPyipdDb12tDidMR7Wezx> | Parked |
| Corallite anatomy next steps: genus hotspots on photos, compare views. Tool stays in the Lab until Pierre promotes it. | study <https://claude.ai/artifact/6jmegiDTYGsP5Xvd3d2Zhk> | Parked |
| Zoom ladder and Size ruler use horizontal sliders, which breaks the "no horizontal sliders" rule: rework before any promotion. | learning-path study | Parked |
| Coral Finder book crops for the 27 extra Dauin genera (they only have iNat photos). | PR #184 | Parked |
| Group index / side panel on Genera. Pierre asked twice about a global left sidebar; advised against (width goes to photos), he didn't insist. | thread "Declutter the UI across the app" | Open question |
| A probabilistic model beyond BKT + Elo (IRT-style) if the current adaptive rule isn't enough. | thread "Review the site as a new RA" | Parked |
| **A second admin**, if one ever joins: set up their access (add them as a GitHub collaborator, or Pierre prepares the device), because the admin lock screen expects a GitHub token with write access; possibly a restricted role (Candidates, Forms and Quality only), since Genera, Look-alikes and Excluded change Pierre's own choices. The Publish commit message already names who published (token login). | Pierre, 2026-11-01, admin review <https://claude.ai/artifact/L928mKB9zC43yEKbyQbswy> ("note it for the future, if the situation comes up") | Parked |
| Reuse the data (genera, criteria, photos) in ReefRecall, Pierre's separate app. The coral tools stay standalone, not part of ReefRecall. | 2026-10-31 | Parked |
| First-time RA review leftovers: My progress Photos view on phones cuts genus names ("Acrop…": 6 tiles per row); the ⚙ colour swatches have no visible names on touch screens; "what it still needs" per genus is only a hover tooltip (nothing on phones, could go on the genus sheet); the phone hammer icon (Tools) has no label. ("Closer" renamed "Close-up" everywhere, Pierre 2026-11-01.) | thread "Review the site as a first-time RA", review doc https://claude.ai/artifact/7qdJQqd3xZfsHmdrQm2KmS | Parked |

## Declined (don't propose again)

- Anki deck.
- A daily-habit / Duolingo-style app (units, streaks, spaced days, decay).
- Look-alike "families" invented by Claude; any invented grouping.
- "Reset this genus" or any bulk wipe in admin.
- Swipe gesture in the Candidates swiper (misfired when zooming; buttons only).
- Manual Easy/Medium/Hard level selector and the "Lecture photos" set in the quiz.
- The 4 static welcome cards (replaced by the guided tour).
- Git history rewrite to shrink the repo (~97 of 253 MB): Pierre chose to wait; raise again only if size becomes a problem.
- Asking for ReefCloud images (see Parked).
- The public "Photos from Dauin / Philippines / All" filter (removed in PR #230: redundant with the IMR/own-first photo rule).
- The Reef colour theme (dropped in PR #219); Lagoon as default (Depth chosen, PR #218).
- Coral Finder book photos in games (never), or as featured/sheet photos ahead of field photos.
- Publishing `curation.json` as a whole copy from the admin (lost curation on 2026-11-01; Publish merges key by key since PR #240).

## Done recently (for context)

- 2026-11-01: players report a wrong answer (with the right genus), several corals, a bad photo or other from every game; reports with the reporter's name in admin Triage (Code.gs v7).
- 2026-11-01: bonus genera in the photo quiz and duels (Millepora first, unlocked from 10% slate progress, outside the slate score).

- 2026-11-01: #244 explain empty "Without me" views; #242/#243 admin "Game coverage" + "Sheet & Finder coverage", sortable by view; #241 Thickest order; #240 Publish merges key by key (and restored lost curation); #233/#236/#238 admin Look-alikes Hide / All / Auto|Manual, `#~look`; #231 curation re-read in long-open tabs; #230 "Photos from" setting removed; #229/#209 "Without me" photo Elo; #227 IMR lecture photos in games; #225/#222/#208 progress scale (6 steps, mini ring); #224/#220 book photos on sheets only when pinned or to fill gaps; #219/#226 colour-blind mode; #214/#218 colour themes, Depth default; #207 one colony per question; #203 sync pulls other devices on start-up; #201/#202 Code.gs v5 deployed; #200 single-view questions.
- PR #198 admin Stats "Needs" tab (where to look for more photos); #197 continuous difficulty; #195 admin Stats; #194 Coverage; #193 Candidates order; #184/#188 extra Dauin genera in the Coral Finder; #159 look-alike montage deck; #150 two-door Home; #168/#172 responsive system, mobile-first; #132 guided tour.

# Roadmap: deferred ideas, open questions, pending actions

Ideas that were discussed with Pierre but not built (yet), with where they came from and where they stand. **Any agent: when an idea is discussed and not implemented right away, add it here** (one line is enough: what, source, status). When something ships, move it to "Done recently" with the PR number, or delete it.

Status words: **Waiting on Pierre** (needs his action or decision), **Next** (agreed, not started), **Parked** (agreed idea, deliberately later), **Open question** (undecided), **Declined** (kept so nobody proposes it again).

Sources: "thread X" = a Claude project thread with Pierre; dates are 2026. Design docs on claude.ai are private to Pierre.

## Waiting on Pierre

| Item | Source | Status |
|---|---|---|
| Redeploy the sheet script as **VERSION 5** (includes v4): copy `tools/sync/Code.gs`, Manage deployments > Edit > New version. Without it, admin Stats "Players" and "Calibration" stay empty. | PRs #195, #197 (2026-11-01) | Waiting on Pierre |
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
| **Coverage "Needs" section** in admin: per genus × view, recommend where more photos are needed from game signals (ability ceiling/floor, photo repetition, mix-ups). | thread "Make game difficulty more progressive", after PR #197 | Next (in progress there) |
| **Calibrated, medium-size game photo sets**: draw game photos by Elo band per genus × view rather than at random; maybe cap set size while keeping a real difficulty spread and enough photos to learn the genus, not the photos. Never shrink sets automatically: suggest, Pierre confirms. Needs enough answers first. Whether to cap at all is still open. | thread "Analyse player levels and photo Elo" | Next / Open question |
| Growth form + quality guesses for auto-refilled candidates (they arrive without guesses; Claude classified PR #181's batch by eye in PR #182). Do it when Pierre asks. | thread "Review photo candidates on phone" | Next (on request) |
| Near-duplicate / redundancy suggestions among IMR + Pierre photos in Triage, and a visual pre-pick of Featured into `picks.json`. Partly done (`find_dups.py`, PR #149); re-run after adding photos. | thread "Design photo usage per context" | Next |
| Admin toggle for `curation.json` `use` (`ref` / `game`): the field exists, no button yet. | PR #96 | Next |
| Paliform-lobe photos in Corallite anatomy have no ring yet. | thread "Rethink the corallite anatomy explorer" | Next |

## Parked (medium term)

Pierre's short-term goal is ID on ideal photos, or on dives with time to examine each colony. These come after.

| Idea | Source | Status |
|---|---|---|
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
| Reuse the data (genera, criteria, photos) in ReefRecall, Pierre's separate app. The coral tools stay standalone, not part of ReefRecall. | 2026-10-31 | Parked |

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

## Done recently (for context)

- PR #197 continuous difficulty; #195 admin Stats; #194 Coverage; #193 Candidates order; #184/#188 extra Dauin genera in the Coral Finder; #159 look-alike montage deck; #150 two-door Home; #168/#172 responsive system, mobile-first; #132 guided tour.

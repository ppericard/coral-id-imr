# Roadmap: deferred ideas, open questions, pending actions

Ideas that were discussed with Pierre but not built (yet), with where they came from and where they stand. **Any agent: when an idea is discussed and not implemented right away, add it here** (one line is enough: what, source, status). When something ships, move it to "Done recently" with the PR number, or delete it.

Status words: **Waiting on Pierre** (needs his action or decision), **Next** (agreed, not started), **Parked** (agreed idea, deliberately later), **Open question** (undecided), **Declined** (kept so nobody proposes it again).

Sources: "thread X" = a Claude project thread with Pierre (in the original Claude account); dates are 2026. Design docs on claude.ai are private to Pierre and **not reachable from the new account** (handover 2026-11-01): the latest reviews are copied in [`reviews/`](reviews/README.md), and the decisions of the others are in AGENTS.md and below.

## Backlog in priority order (handover, 2026-11-01)

The order the previous agents would follow; Pierre may reorder. Details of each item are in the sections below.

1. **Code.gs v10 live**: confusion scores shipped in PR #286; Pierre must redeploy v10 ("Waiting on Pierre"), then check that the Answers tab fills its Choices column and that `?stats=1` returns `conf`. Until then quiz traps fall back to the declared look-alikes.
2. **Personal learning path from confusions** (approved by Pierre 2026-11-01, not started): see "Next".
3. **Beta testers' feedback**: Pierre is sending the app to last month's RAs and his next 6 RAs. Watch admin Triage ("Reported by players") and the Answers tab; fix what they hit first.
4. **Two phone leftovers from the first-time RA reviews**: the phone hammer icon (Tools) has no label; "what it still needs" per genus is only a hover tooltip (nothing on touch screens; could go on the genus sheet). Also check the red "!" on "Review 0" and a long genus name cut on the tablet progress wall.
5. **Design re-review leftovers to verify** ([review](reviews/2026-11-01-design-re-review.md)): p2 Next pinned at the bottom of the feedback column, p9 unexplained dot at the end of the Progress pill, p10 font sizes outside the scale (Memory size labels 11.7 px; 13.3, 28, 38.4 px), m5 low-resolution lecture photos shown upscaled, m11 hex colour literals left in `app.css`.
6. **Test the question draw** (`photoSet`, `distractors`) and **`data.json` one genus per line**.
7. **Code formatting + modules** (L1). The handover is a good moment: a single agent, no parallel branches.
8. Game photo sets by Elo band, photo Elo without Pierre's answers: once RAs have played (~10 answers per game photo).
9. Content and curation helpers: growth-form/quality guesses for new candidates (on request), near-duplicates re-run, admin toggle for `use`, branching *Cyphastrea* photos, paliform-lobe rings in Corallite anatomy.
10. Everything under "Parked" stays parked until Pierre brings it up.

## Waiting on Pierre

| Item | Source | Status |
|---|---|---|
| **Redeploy Code.gs v10** (choices logged with each answer, pair confusion counts): paste <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/Code.gs> into Extensions > Apps Script, then Deploy > Manage deployments > Edit > New version. No new permission. Check: `GET SYNC_URL?name=x&pin=ab` replies `v: 10`. Until then traps use the declared look-alikes only. | confusion scores PR, 2026-11-01 | Waiting on Pierre |
| Review ~10 debatable lecture points (left verbatim): Pocillopora "verrucae purely ornamental", Goniastrea "paliform lobes on the oral disc", Montipora "smallest corallites of all", Tubastraea "dark green to black", Mycedium "no tentacles", Plerogyra "looks solitary", Herpolitha "solitary"; better mnemonics proposed (Acropora = pore at the tip, Pavona = peacock). Any change becomes a discreet note, never a correction. | thread "Fact-check all coral content on the site", PR #22 | Waiting on Pierre |
| Stylophora wording: Pierre remembered "like Pocillopora but fuzzy"; presenter notes say "smooth from afar, unlike Pocillopora" and "chicken popcorn" (Pierre remembered "chicken nuggets" for Pocillopora). App keeps the written wording. Pierre reviews the course on Mon 2026-11-02 and corrects it himself. | project chat, 2026-10-31 | Waiting on Pierre |
| Merulina placement: shown with Hydnophora (lecture group 7); group 5 is the alternative. | thread "Declutter the UI across the app", PR #66 | Waiting on Pierre |
| Look-alikes page: Pierre will judge the montage deck in use; if it doesn't convince, drop the tab (pairs stay on sheets, Home, duels). | thread "Review the site as a new RA"; PR #159 | Open question |
| Lab "Keep / Trim" votes are stored in Pierre's browser only; ask him which tools he marked before trimming the Lab. | thread "Prototype visual coral ID tabs" | Waiting on Pierre |
| Pick the lead photo(s) of the Branching tile on the Coral Finder start (the automatic first one is mostly sand): admin > Growth form > View Colony > 📌 (PR #283). | design re-review p3 | Waiting on Pierre |
| Goniastrea cover is a corallite close-up (cover must be a mid-distance view): change it in admin. | design re-review p6 | Waiting on Pierre |
| Renew the admin GitHub token before its 90-day expiry (created ~2026-10-31). | security model | Waiting on Pierre (~late Jan 2027) |
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
| **Repo size watch** (code review L6): `.git` ~277 MB (2026-11-01), `img/` ~185 MB; above ~600 MB move `img/` to a separate photo repo (same origin, no code change for reading). | same | Watch |
| **Calibrated, medium-size game photo sets**: draw game photos by Elo band per genus × view rather than at random; maybe cap set size while keeping a real difficulty spread and enough photos to learn the genus, not the photos. Never shrink sets automatically: suggest, Pierre confirms. Needs enough answers first. Whether to cap at all is still open. | thread "Analyse player levels and photo Elo" | Next / Open question |
| Growth form + quality guesses for auto-refilled candidates (they arrive without guesses; Claude classified PR #181's batch by eye in PR #182). Do it when Pierre asks. | thread "Review photo candidates on phone" | Next (on request) |
| Near-duplicate / redundancy suggestions among IMR + Pierre photos in Triage, and a visual pre-pick of Featured into `picks.json`. Partly done (`find_dups.py`, PR #149); re-run after adding photos. | thread "Design photo usage per context" | Next |
| **`data.json` one genus per line** (code re-review M5): the file is one 548 KB line, so any two edits conflict in full. Every writer (`tools/*.py`, the Action) must switch to the same layout in one PR. | code re-review 2026-11-01 | Next |
| **Test the question draw** (`photoSet`, `distractors` in `app.js`): one observation per question, bonus genera Research Grade only. Needs them freed from app globals (`P`, `PSTAT`) first, like `applySlots` was. | code re-review 2026-11-01 | Next |
| Admin toggle for `curation.json` `use` (`ref` / `game`): the field exists, no button yet. | PR #96 | Next |
| **Photo Elo without Pierre's answers in the games**: admin Stats can now show photo Elo "Without me" (replayed in the browser, PR for thread "Exclude my answers from photo Elo"), but the games still use the sheet's `?stats=1` over everyone. Plan: once most game photos have ~10 RA answers, Code.gs v6 skips the author's answers (or weighs them less) in `stats_`; needs a redeploy by Pierre. Until then his answers act as a cold-start prior (all 97 answers so far, 2026-11-01, are his). Nothing to reset: Elo is replayed from the Answers log each time. | thread "Exclude my answers from photo Elo" | Next (when RAs have played) |
| **Branching Cyphastrea photos** for the Acropora / Cyphastrea comparison (Coral Finder p. 8 puts Cyphastrea among branching corals; ramose forms such as *C. decadia*). None of ours is branching (2026-11-01); iNat has *C. decadia* at Sumilon (obs 269721269, CC BY-NC). Pierre can hide the pair in admin Look-alikes until then. | thread "Add a hide button for weak comparisons" | Next (needs photos) |
| **Personal learning path from confusions** (Pierre approved 2026-11-01, not started: handover first). Photo Elo keeps choosing WHICH photo to show; confusions choose WHICH distractors and duel pairs. Two levels: (1) pooled confusions (done: `confOf`, Code.gs v10) gradually replace the declared look-alikes; (2) each player's own mix-ups (`P[n].conf`, already counted per player in `app.js`, used by `mixedUp()` for duels) raise those pairs as traps and duels for that player, blended with the pooled score until the player has enough answers on the pair (e.g. player weight = offers / (offers + 8)), plus suggestions such as "Review Favites vs Dipsastraea" on My progress / Practice. Performance only, never time-based. Needs per-player offered counts (log `ch` locally too). | thread "Review the app as a new RA" (confusion scores) | Next |
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
| **A second admin**, if one ever joins: set up their access (add them as a GitHub collaborator, or Pierre prepares the device), because the admin lock screen expects a GitHub token with write access. A collaborator on Pierre's personal repo cannot scope a fine-grained token to it, so the lock screen now points them to a classic token (`repo` scope, broader); moving the repo to a GitHub organisation would allow fine-grained tokens. Untested with a real second account (admin re-review <https://claude.ai/artifact/9NUZVCNNTaSVqL2e71izVC>); possibly a restricted role (Candidates, Forms and Quality only), since Genera, Look-alikes and Excluded change Pierre's own choices. The Publish commit message already names who published (token login). | Pierre, 2026-11-01, admin review <https://claude.ai/artifact/L928mKB9zC43yEKbyQbswy> ("note it for the future, if the situation comes up") | Parked |
| Reuse the data (genera, criteria, photos) in ReefRecall, Pierre's separate app. The coral tools stay standalone, not part of ReefRecall. | 2026-10-31 | Parked |
| First-time RA review leftovers (rounds 1 and 2): "what it still needs" per genus is only a hover tooltip (nothing on phones, could go on the genus sheet); the phone hammer icon (Tools) has no label; check the red "!" on "Review 0"; one long name cut on the tablet progress wall; some wrong-answer comparisons are not like for like (live close-up vs bleached skeleton). Fixed since: phone progress names (#262), named colour swatches, "Closer" renamed "Close-up". | [reviews/2026-11-01-ra-re-review.md](reviews/2026-11-01-ra-re-review.md) | Next (backlog item 4) |
| Low items from the second admin review: hover + key shortcuts in Forms/Quality can fire by accident; Sign out keeps the draft on a shared device; page titles uneven across admin tabs. | [reviews/2026-11-01-admin-re-review.md](reviews/2026-11-01-admin-re-review.md) | Parked (low) |
| Rate-limit unverified player reports (per-day cap) if they are ever abused. | code re-review L4 | Parked |

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
- 2026-11-01: tour step 3 has big arrows pointing at both the game tabs and Practice in the menu (Pierre: the highlighted menu drew the eye away from the games).
- 2026-11-01: confusion scores (Pierre): every answer logs the choices offered (Code.gs v10, **redeploy pending**); quiz traps = the genera players actually mix up with the target, starting from the declared look-alikes (IMR lecture, Coral Finder) as a prior; admin Stats > Confusions lists pairs (offered, mixed up, rate, score), photos, colonies and species most often missed. Also fixed: wide admin Stats cards (Players, Pairs) were hidden on phones by the site's `.wide` class.
- 2026-11-01: admin > Growth form: 📌 on a photo makes it a lead photo of that form's tile on the Coral Finder start (curation.json `tile`; up to 3 per form, the rest stays automatic). Pierre asked where to choose the Branching tile photo: there was no control.
- 2026-11-01: welcome tour never covers what it describes (Pierre's phone feedback): each step scrolls its target clear of the bubble, the bubble takes the free side (wider and shorter on wide screens when needed); step 3 also spotlights Practice in the menu; no hardcoded genus count ("39") in the app text; Home no longer opens as Learn when the data loads before the page's scripts.
- 2026-11-01: first-time RA re-review: Coral Finder cards lead with a photo of the growth form picked (#269); quiz answer choices start easy (other growth forms) and bring in look-alikes as the genus's Elo ability rises, scored with the matching guess rate (Code.gs v9, deployed 2026-11-01).
- 2026-11-01: Coral Finder suggested questions redesigned (Pierre: tiny hit areas, unclear what to tap, empty space): big full-width Yes / No buttons with the genera's photos on each side, a "No" that ranks (not clue), "Can't tell"; Start over shares the clue chips' first line on phones.
- 2026-11-01: My progress decluttered (Pierre's phone feedback): board first on phones/tablets, no "Practise now"; sign-in is a filled "Sign in" button in the header while signed out ("Not saved" if saving fails), and once signed in the account line, Sign out and Backup/reset sit in ⚙.
- 2026-11-01: page smoke test in CI (`tests/pages.smoke.js`, job `pages` in `checks.yml`): main routes, two malformed links and `admin.html?readonly` at 390 and 1280 px, fails on any page error (code re-review M5; Playwright installed with npm in a temporary folder, Pierre's OK).
- 2026-11-01: Pierre deployed Code.gs v8 and granted it the external-request permission (needed for the admins' GitHub token check).
- 2026-11-01: beta testers: welcome tour cut to 5 steps (doors, sign-in form in the bubble, the 3 games, progress, help, then "Start playing"); one sign-in card after 10 unsigned answers, and right away when the tour is skipped; answers played before signing in reach the Answers tab; signing in to an existing name merges the device's anonymous play instead of wiping it; sign out clears the device.
- 2026-11-01: designer re-review, quiz: on desktop the views go side by side or stacked from each photo's real shape (data.json `ar`, tools/apply_ratios.py), whichever shows more photo. Learn > Look-alikes: big arrows on the photos, swipe anywhere on the pair, one-time swipe hint (Pierre: the small arrows were easy to miss on a phone). Memory: controls in one compact row on phones and tablets so the grid gets the screen; photo credit moved off the genus name. Shrinking the stage to remove the blurred bands was tried and dropped: two landscape views then sit above an empty half screen (Pierre dislikes that). The bleed overhang on wide screens and the Coral Finder "Show all" button stay as approved in the first review.
- 2026-11-01: designer re-review (https://claude.ai/artifact/XcHq5wGMomDXoByE1hGcQB), first PR: feedback colours only on Yes/No, colour-blind "correct" no longer a solid fill, full ID tips on Genera cards, 2-line group titles, pair page with boxed tips and a stable header, quieter Memory with one segmented look, one bonus tile on My progress, Look-alikes rail fix, phone Filter chip, shorter lecture credits.
- 2026-11-01: two admin tabs in one browser merge each other's drafts instead of overwriting them (code re-review M4).
- 2026-11-01: `applyCuration` / `applySlots` moved to `core.js`; `tests/photos.test.js` checks Pierre's photo rules on the real data (code re-review M2).
- 2026-11-01: code re-review fixes: `curation.json` kept offline after a deploy (it was lost with the old shell cache), 4 s cache fallback on slow links, malformed links no longer crash pages, "too many wrong codes" said plainly in the sync line, small escaping and listener fixes.
- 2026-11-01: design review (lots 1-3): #254 fonts with real italics, muted group colours, 12 px floor, Coral Finder prompt, Light/Dark switch; #256 type/radius tokens, shared controls, one SVG icon set, docs/DESIGN.md; lot 3 (this PR) quiz stage fits the photo on phone/tablet, games aligned with the header, Progress pill with mini ring, phone tab bar icons, readable names on the phone progress wall.
- 2026-11-01: players report a wrong answer (with the right genus), several corals, a bad photo or other from every game; reports and feedback also from enlarged photos, genus sheets and every page footer; the reporter's name in admin Triage for every admin (Code.gs v7, v8; PRs #260, #263).
- 2026-11-01: admin re-review fixes: Undo steps survive a reload of the tab, "Which no?" and Remove explained in the Genera help, Start here says Candidates never need emptying, lock screen offers a classic-token fallback for collaborators and a read-only link, phone coverage tables fit the screen, excluded IMR lecture photos show their genus and slide.
- 2026-11-01: bonus genera in the photo quiz and duels (Millepora first, unlocked from 10% slate progress, outside the slate score, #261); "?" tiles on My progress and an unlock card.

- 2026-11-01: #244 explain empty "Without me" views; #242/#243 admin "Game coverage" + "Sheet & Finder coverage", sortable by view; #241 Thickest order; #240 Publish merges key by key (and restored lost curation); #233/#236/#238 admin Look-alikes Hide / All / Auto|Manual, `#~look`; #231 curation re-read in long-open tabs; #230 "Photos from" setting removed; #229/#209 "Without me" photo Elo; #227 IMR lecture photos in games; #225/#222/#208 progress scale (6 steps, mini ring); #224/#220 book photos on sheets only when pinned or to fill gaps; #219/#226 colour-blind mode; #214/#218 colour themes, Depth default; #207 one colony per question; #203 sync pulls other devices on start-up; #201/#202 Code.gs v5 deployed; #200 single-view questions.
- PR #198 admin Stats "Needs" tab (where to look for more photos); #197 continuous difficulty; #195 admin Stats; #194 Coverage; #193 Candidates order; #184/#188 extra Dauin genera in the Coral Finder; #159 look-alike montage deck; #150 two-door Home; #168/#172 responsive system, mobile-first; #132 guided tour.

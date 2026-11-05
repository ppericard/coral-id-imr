# Public fish release: plan (by Sunday 2026-11-08)

Planning only, nothing changed in the repo. Written Thu 2026-11-05, about 17:00 to 17:30 Manila (Rule 0: Pierre's
day ends at 17:30. Every question below waits for his Friday morning; agents work tonight only on decided items).
Read from `origin/main` at `4ef43b16`. The local checkout is 10 commits behind, so read STATUS / ROADMAP from origin.

Sources: AGENTS.md (13b, 21, 6a-6g, 7a, 12, 14f/14g, merge contract), docs/STATUS.md (16:30 version), docs/ROADMAP.md
(Fish rows in "Next", "Admin for every subject"), docs/FISH_PATH.md, docs/reviews/2026-11-05-fish-sheets-study.md,
docs/ARCHITECTURE.md ("Subjects", "Beta", "The beta group", "Fish content", "Fish candidates"), `core.js` `SUBJECTS` /
`fishGen`, `app.js` `subjOpen` (l.1191-1197), `fish.json`, `fish-photos.json`, `curation.json` `fish`, `fish-cand.json`,
the open PRs, the `claude/*fish*` branches.

---

## 1. What exists and works today

### Players' side (only the admin and the beta group see it)
- **Gate**: `core.js` `SUBJECTS[1].beta` = `{kick, line}`. `app.js` `subjOpen(S) = !S.beta || IS_ADMIN || subjGroups().includes(S.id)`.
  A player who is not admin and not in the group always opens on corals (`subjAt`). Their saved choice and fish progress are kept.
  The `beta` field is the gate **and** the label: it puts the small "beta" tag on the switch buttons (`app.js` l.642).
- **Beta group** (#540, sheet v48): Groups tab in the sheet. Admin Fish › Players has Add / Remove / "Add all K".
  The app keeps `groups` from every signed-in load or save (`reefid-groups`). **Signed-out players are in no group, and new
  sign-ups are not added automatically.** Pierre's words (2026-11-04): "a group I pick in the admin, for now everyone; not one
  site-wide switch". How many players are in it now: admin Fish › Players shows "Fish beta: N of M". Not checked here.
- **Subject switch**: a Corals | Fish row on Home plus the header chip. Shown once `subjMine()` has two subjects or more (rule 21 relaxation).
- **Level 1 game**: the photo quiz on the 27 IMR entries, with:
  - starter core first (`fish.json` `start`: Butterflyfish, Angelfish, Damselfish, Surgeonfish & Unicornfish);
  - first-meeting cards and one-at-a-time opening;
  - other identification groups as wrong choices first, then IMR look-alikes;
  - Again, look-alike duels, typed answers that accept every name, the silent mastery exam;
  - `easyFirst`: easy photos only until Open Water;
  - winks (surprise cards);
  - circle 2 (barracuda) and circle 3 (19 diver families, 101 species) as opt-ins;
  - "Scientific names" opt-in genus step (#526).
- **Fish welcome question** (#538): uses the coral values for now. Fish values wait for learnsim fish profiles.
- **Learn**: the fish families page (`viewFishList`, by the book's 20 groups, key credited).
- **My progress**: photo wall, levels, review, mix-ups.
- **In-app help** already says "leaderboard and achievements count the corals only, for now".
- **Identify in fish mode**: "Fish ID Key, coming soon" door (decided 2026-11-04).
- **Not for fish**: sheets, Look-alikes, Duel, Memory (their hashes fall back to the fish page of the section), Fish basics,
  leaderboard, achievements, species level.
- **Sync**: fish progress travels in the Data column and merges three-way (`fbase`). Not logged: `log: false`, no replay, no `RVS`.
  Reports from a fish question carry the teaching id.

### Data
- `fish.json`: 47 teaching nodes (27 circle 1, 1 circle 2, 19 circle 3) and 467 species (340 circle 1, 1 circle 2,
  101 circle 3, 25 out). The regional key is in force (rule 6c). The presence rule is 6g.
- `fish-photos.json` (**stopgap**, built 2026-11-03):
  - 1,160 remote iNaturalist photos for 47 nodes, 24 to 30 per circle-1 entry;
  - at least 5 judged easy photos (ease 4 or more) per entry, Pierre's own first;
  - plus 2 sheet-only photos.
- `fish-cand.json`: 12,308 candidates for 438 species (iNaturalist and FishBase), all judged (`suggest.json` `fish`).
- `curation.json` `fish` (**published by Pierre**, latest commit 7566e1ce):
  - 3,822 adds over all 438 species (the auto-sort's proposals), 3,466 rejected, 4 crops;
  - **the game does not read it yet.** That is admin plan PR 7.
- Still open (Pierre or IMR, not blocking): common names proposal (`tools/fish_common.json`), key label points (Grunters,
  Basslets, Flounders, circle 3 only), fish trainer and name points in `points.json` (4 fish items).

### Admin side
- `SUBJECTS.fish.admin.pages = ['~triage', '~events', '~users', '~journey/', '~anon/']`: reports, events, Players with the
  Beta column, Journey, anonymous visitors.
- The fish curation namespace and the fish auto-sort run into the draft (PR 4, #479). Publish works (Pierre published fish today).
- **No fish Candidates page** (PR 5a/5b), **no entry page** (6), **no game photos from curation** (7), **no Coverage /
  Photo review / Look-alikes** (8-10), **no fish answer logging** (11).
- The ROADMAP plan table is partly stale. PR 2 still says "In review #492", but the `fish/` admin hash is live. Fix it in the next docs pass.

### Open PRs and branches touching fish
- **Open PRs**: none is about fish. #572 (governance C, needs-pierre) changes `docs/FISH_PATH.md`, `app.js` and `core.js`.
  #579 and #581 change `app.js` and `core.js`. All three can conflict with the release PRs.
- **Branches**:
  - `claude/admiring-ramanujan-nw3mxr-fishphotos` (2026-11-03): already salvaged in #463. Pierre deletes it after PR 5.
  - `…-fishprog` (Lab mock-ups of fish My progress): to archive-tag (STATUS, Pierre's hands).
  - `…-fishq`: PR #530 closed unmerged. A docs-only question about 5 species with no candidate photo; its recommendation was
    "leave them as they are".
- **URL refonte** (decided Q53-Q56, starts after #572): reworks routing in `app.js`, so a conflict with the release PR.
  It also gives fish its first shareable link (`#fish/...`). Today "Fish has no route of its own".

---

## 2. What a public release needs

Legend: state = done / partly / not started; size S/M/L; "decided" cites where; "needs Pierre" refers to section 3's letters.

### Minimum (blocks the release)

| # | Item | State | Size | Depends on | Decided / needs Pierre |
|---|------|-------|------|------------|------------------------|
| M1 | Separate the gate from the label: `SUBJECTS` gets an opening field (e.g. `open: 'group' \| 'all'`) next to `beta` (which keeps the label). `subjOpen` reads it. No behaviour change while it says `'group'` | not started | S | – | Integrator's call (code structure, rule 13b: "a subject differs only by a field of SUBJECTS"). Who it opens to is (a) |
| M2 | The flip itself: fish opens to the chosen audience (one field) | not started | S | M1, M3, M4, (a) (b) (i) | **needs Pierre (a), (b), (i)**. Rule 13b / 21 and ARCHITECTURE "Beta" say "until fish opens to players": the opening was foreseen, its form was not |
| M3 | Smoke tests for the open state: non-admin signed-out and signed-in players see the switch, play a fish quiz and switch back; reload keeps the subject; the admin's Beta column / Add all hide when `open: 'all'`; sign-in merges fish progress made while signed out (`mergeProgress({}, here, sheet)`) | partly (fish.smoke 6b covers the group) | S-M | M1 | Decided (AGENTS "How to make a change", smoke tiers) |
| M4 | Bug sweep of the fish beta: read the sheet's Reports (teaching ids) and Events (`err`, save failed) since #540; fix what players hit | not started | S-M (unknown until read) | – | Decided (fixing what is plainly broken is the integrator's call) |
| M5 | Release docs in the flip PR: AGENTS 13b and 21, ARCHITECTURE "Beta" and "The beta group", DESIGN "Subject switch", FISH_PATH "Both subjects in one app", ROADMAP rows (Fish mode, Open fish to a group) | not started | S | M2 | Decided (docs travel with the change) |
| M6 | Pierre has seen the open state: screenshots at 390 px and 1280 px of Home with the switch, the fish quiz, the welcome question, the families page, My progress, Identify "coming soon", as a non-admin | not started | S | M1, M3 | **needs Pierre**: merge contract, players see something he has not approved as a whole |

### Should have (strongly recommended; each is small)

| # | Item | State | Size | Depends on | Decided / needs Pierre |
|---|------|-------|------|------------|------------------------|
| S1 | Corals-only copy audit and minimal edits now that fish is public: `index.html` meta and og description ("Learn to identify the coral genera…"), Home credit line (`home.js` l.109 "to name coral genera"), welcome tour, About, the fish `beta.line` ("iNaturalist photos for now. Feedback welcome."), manifest | not started | S-M | – | **needs Pierre (d)** (wording players read) |
| S2 | Release note: one discreet card "Fish is here" (rule 12: discreet notes for new features), once per device, only to players for whom fish is open | not started | S | M1 | **needs Pierre (c)** (text, and yes / no) |
| S3 | Check the stopgap photos still load: HEAD each of the 1,160 photo URLs (static files, paced). List dead ones. Refill only those, from the same `tools/fish_photos.py` rules | not started | S | – | Integrator's call to detect and replace broken photos by the rules already applied (rule 6a/7 order). Anything beyond a like-for-like refill → Pierre |
| S4 | Watch plan after the flip: an Events / Reports check at +2 h, +24 h, +48 h. A fish line in the integrator's morning report | not started | S | M2 | Decided (AGENTS "Reports and events, at every session start and every morning") |

### Nice to have (not needed for Sunday; ordered)

| # | Item | State | Size | Depends on | Decided / needs Pierre |
|---|------|-------|------|------------|------------------------|
| N1 | learnsim fish profile, level 1 (beginner, "I'm at IMR", expert; 5 seeds): checks the beginner holds the success target on the starter core. Report only: no value changes without Pierre (14f/14g) | not started (learnsim is coral-shaped) | M-L | – | Decided as a release check in FISH_PATH "Checks before release" (written for the species level). Whether it gates *this* release: **(g)** |
| N2 | Admin plan PR 5a (fish Candidates swiper with the proposals, Checks) then 5b (tags, **Not this → species**, which must precede any fish photo in the game) | not started | L (5a M-L, 5b M) | PR 4 (done) | Decided (ROADMAP "Admin for every subject", order 2026-11-04) |
| N3 | PR 7 Fish curated photos into the game: download the 3,822 adds to R2 in four sizes; the app reads the curated list; stopgap kept for thin entries | not started | M-L | **N2 (5b)** (rule: "Not this… before any fish photo reaches the game in PR 7") | Decided |
| N4 | PR 11 Log fish answers: subject column, sheet version, coral stats ignore fish rows | not started | L | N3 ("right after PR 7") | Decided (Pierre 2026-11-04: "from the start, as soon as curated photos enter the game") |
| N5 | Shareable fish link (`#fish/…`) through the URL refonte | not started | L (the refonte) | #572 | Decided (Q53-Q56) |
| N6 | Fish basics, fish achievements, fish leaderboard, Fish ID Key, species level, fish sheets | not started | L each | N4 for board / achievements; curated species photos for the species level | Decided in principle (ROADMAP rows). None by Sunday |
| N7 | Held-out photo set (fish first) | not started | M | N3 | Decided as a "Next" row. Meaningless for level 1 on stopgap photos. **(g)** |
| N8 | Fish values for the welcome question (from N1) | not started | S after N1 | N1 | A learning value: Pierre |

**Release scope in one line:** level 1 as it is (27 entries, stopgap iNaturalist photos, circles 2 and 3 opt-in, scientific
genera opt-in), opened to everyone with the "beta" tag kept. Curated photos (N2→N3) and logging (N4) follow next week; they
cannot be done safely by Sunday, because the 5b → 7 → 11 chain is about three L-sized PRs in a row.

---

## 3. Parallel work plan

### Tonight (Thu evening / night, agents alone, decided items only; about 3 heavy agents at once, one smoke at a time)

Critical path: **A → (Pierre's Friday morning) → F**. B, C, D are independent of A and of each other.

**A. Gate separated from the label (M1 + M3)**: branch `claude/fish-open-field`, PR the same night (rule 26b)
- Goal: an opening field in `SUBJECTS` (`open: 'group'` for fish now; `'all'` supported), read by `subjOpen`, `sync.js` `groupsSeen`
  (it filters on `S.beta`), `admin.js` `groupOn`, `admin-demo.js`. `beta` stays the label only. No player-visible change on merge.
- Files: `core.js` (SUBJECTS plus its doc comment), `app.js` (`subjOpen`), `sync.js` (l.1021), `admin.js` (`groupOn`, `gLine`),
  `admin-demo.js` (l.718), `tests/subjects.test.js`, `tests/fish.smoke.js` (a new case with `open: 'all'` forced through a test
  hook or stub: non-admin signed-out sees the switch and plays; signed-in too; switch back; reload), `tests/admin.smoke.js`
  (the Beta column hidden when `'all'`), `tests/sync.test.js` if `groups` filtering changes. Docs: ARCHITECTURE "Beta" / "The beta group".
- Done when:
  - all tests pass and the smoke tiers are green (fish, pages, admin at 1280 and 390, net, draw);
  - the coral and admin behaviour is identical with `'group'`;
  - the PR shows before/after screenshots of the forced `'all'` state, which are M6's material for Pierre.
- Merges under the contract (no visible change, only decided things); rebase before merge. **Conflicts**: #579, #581, #572
  (`app.js` / `core.js`). Merge A before the URL refonte starts.

**B. Fish beta bug sweep (M4)**: read first, then one fix PR per bug
- Goal: read the sheet's Reports tab (rows from fish questions: a teaching id `t..`) and Events (`err` with a `fish.` page,
  "save failed", old versions) since 2026-11-04. Reading is read-only and any agent may do it (AGENTS "Data access"); names never go
  into anything committed.
- Fix each real bug in its own PR with a test.
- Files: depends. Likely `quiz.js`, `app.js`, `learn.js` (`viewFishList`), `progress.js`.
- Done when: a list of fish reports and errors (handled / fixed / for Pierre) is in the subagent's report, and each fix PR is green.
  Content points (names, cues) go to `points.json` or to Pierre, never fixed silently.

**C. Corals-only copy audit with drafts (S1) and the release card (S2)**: branch `claude/fish-public-copy`, **draft PR, needs-pierre**
- Goal:
  - list every player-facing text that assumes corals only once fish is public: meta and og descriptions, Home credit line, welcome
    tour, About, manifest, help, Identify, `beta.line`;
  - draft the smallest edits;
  - draft one discreet "Fish is here" card through the new-mode card mechanism (`progress.js` around l.770), shown once, only when
    fish is open to the player.
- Screenshots at 390 px for Pierre's morning.
- Files: `index.html`, `home.js`, `core.js` (`beta.line`), `progress.js`, `manifest*`, `tools/rename_app.py` if names are involved
  (rule 15: names from `core.js` `ORG`).
- Done when: the draft PR has the text list, before/after screenshots and the card. It merges only after (c) and (d).

**D. Stopgap photo health (S3)**: tool run; a PR only if something is dead
- Goal: HEAD every `fish-photos.json` photo URL (1,160), paced, with a User-Agent (rule 6f spirit). Report dead links per entry.
  Refill a dead one only like-for-like with `tools/fish_photos.py`'s rules. Check every circle-1 entry still has 5 or more easy photos
  (`python3 tools/fish_judge.py`).
- Files: `fish-photos.json` (only if refilled), no code.
- Done when: a report "N dead, refilled / none", tests green (`tests/fish.test.js`, `tests/photos.test.js`).

**E. (optional, parallel, not release-blocking) Admin plan PR 5a, fish Candidates swiper**: branch `claude/admin-fish-cand`
- Decided order (ROADMAP): starts the N2 → N3 → N4 chain toward curated photos and logging. Touches `admin*.js` / `admin.css` only.
  Coral admin unchanged (admin.smoke at both widths).
- Done when: the swiper lists the thinnest species first, shows the auto-sort's proposals and Checks, stops at target, and
  Undo / Publish work in the `fish` namespace. Screenshots go to Pierre (new screen).
- Run it only if the slot allows (A, B, D first). It is next week's critical path, not Sunday's.

**N1 (learnsim fish profile)** may start tomorrow if Pierre says it gates the release (g). Otherwise next week.

### Friday (Pierre's morning batch, then build)
- The integrator puts (a)-(i) below into STATUS as **Q82 onwards** (global numbering; last was Q81). Each comes with A's and C's
  screenshots and asks for his answers in one word each.
- After his answers: merge A (if not merged at night), rework and merge C, and open **F** right away.

**F. The flip (M2 + M5)**: branch `claude/fish-public`, small
- Goal: fish `open: 'all'` (or Pierre's answer to (a)), `beta` kept or dropped per (b), docs per M5, the ROADMAP rows updated.
- Files: `core.js` (one field), docs (AGENTS 13b, 21; ARCHITECTURE; DESIGN; FISH_PATH; ROADMAP).
- Done when: full smoke green and screenshots as a non-admin. **Merged at the time chosen in (i)**, within Pierre's hours.

### Saturday / Sunday
- Saturday: buffer for B's fixes and Codex findings. Flip on Saturday if everything is green and Pierre agrees. Sunday is the reserve.
- Sunday at the latest, **before 16:30 Manila** (Rule 0: something players see, so it needs his eye and an afternoon to roll back).
  "Sunday evening" in Rule 0 terms means "by Sunday's end of day".

### Blocked on Pierre: his decisions (local letters; the integrator numbers them Q82+)

- **(a) Who sees fish.**
  - (1) Everyone, signed-out included (`open: 'all'`).
  - (2) Signed-in players only: "Add all" plus automatic adding of new sign-ups.
  - (3) As today, the group only.
  - His 2026-11-04 words: "a group I pick, for now everyone; not one site-wide switch".
  - **Recommendation (1)**: "public" means signed-out visitors too. Today they can never see fish, and new sign-ups are left out
    until he adds them. The group stays in the code for the next beta subject (benthos).
- **(b) The "beta" tag after opening.** **Recommendation: keep** the small "beta" tag (and an updated `beta.line`) until curated photos
  and answer logging are in (N3, N4). It sets expectations and invites reports.
- **(c) Release card.** One discreet "Fish is here" card, once per device. Yes / no, plus the text (draft in C).
  **Recommendation: yes**, short, without promises of dates.
- **(d) Copy edits** (meta description, Home credit line, tour, About, `beta.line`): approve C's drafts.
  **Recommendation: approve the minimal ones.** No Home layout change (rule 21).
- **(e) Release scope.** Level 1 on the stopgap iNaturalist photos now; curated photos (PR 5a/5b → 7) and fish answer logging (PR 11)
  next week. **Recommendation: yes.** This keeps his rule that logging starts "as soon as curated photos enter the game", and the
  5b → 7 → 11 chain cannot land safely by Sunday.
- **(f) Fish answers not logged at release.** The admin will see fish play only through the visit log, Events and Reports, not in
  Answers / Difficulty. **Recommendation: accept for one week** (follows from (e)).
- **(g) Checks before release.** FISH_PATH lists learnsim fish profiles, a held-out set and the real-log replay, all written for the
  species level. **Recommendation:** for this level-1 release, the smoke tiers plus the bug sweep. learnsim fish (N1) runs next week
  and informs the welcome question's fish values. The held-out set and replay do not apply until photos are curated and answers are logged.
- **(h) Default subject for a new player stays Corals**, with fish through the switch. That is today's behaviour, so nothing to build.
  **Recommendation: keep.**
- **(i) When.** **Recommendation: Saturday 2026-11-07 around 10:00 Manila if all is green, Sunday morning as the reserve, never
  after 16:30** (Rule 0), so he can check it live and a rollback stays within his day.

Already decided, no need to ask again: Identify shows "Fish ID Key, coming soon" in fish mode (2026-11-04); leaderboard and
achievements stay coral (13b); winks for every fish player; circles 2 and 3 and the scientific genera stay opt-in as built (#526 yes).

### The 13 fish-sheet questions: none block the public release
Fish sheets are not in the release scope (players get the families page, as in the beta). All 13 can wait until Pierre picks the
sheets project (STATUS: "parked until he picks that project"):
- Q1 to Q12: can wait (sheet content, layout and process).
- Q13 (ask IMR whether frames from its own SVS videos may be used): can wait, but it is the only one with a long lead time
  (an outside party). Pierre may ask IMR any time; it blocks nothing now.

---

## 4. How the release happens

**The switch.** One field in `core.js` `SUBJECTS` (fish), once A has landed: `open: 'group'` → `open: 'all'` (or the answer to (a)).
`subjOpen` then returns true for everyone. `subjMine()` has two subjects, so the Corals | Fish row appears on Home and the chip in the
header for every player. The "beta" tag stays if (b) says so. Nothing on the sheet side changes: no script version, no rules
version, no replay. Fish progress is already synced, and the group tab simply stops mattering. The deploy stamps the cache versions
(`tools/stamp_versions.py`; never edit a `?v=`). Open pages pick up the new version (#565 behaviour), and `fish.json` /
`fish-photos.json` are already in the `sw.js` shell.

**Checks before merging F:**
1. CI green: `node --test tests/*.test.js`; `tests/fish.smoke.js` (with A's open-state case); `pages.smoke.js`; `net.smoke.js`
   (remote photos failing → camera fallback, #569); `draw.smoke.js`; `admin.smoke.js` at 1280 and 390; `profiles.smoke.js`. Codex review clean.
2. B's bug list closed, or each item explicitly left for later with Pierre's OK.
3. D: no dead stopgap photos; every circle-1 entry has 5 or more easy photos.
4. Manual pass on a phone width as a non-admin (admin ⚙ View: User, and a private window signed out):
   - first switch to Fish → welcome question → starter core → first-meeting card → quiz → typed question;
   - families page, My progress, Identify "coming soon";
   - Duel / Memory fall back to the fish page;
   - switch back to Corals;
   - sign in with fish progress made signed out → kept;
   - offline reload.
5. Pierre's eye on the screenshots (M6), then his yes to (a)-(i), pasted into the PR's Decisions.
6. Rebase on `origin/main` right before merging (Pierre's Publish commits land without PRs); squash title `… (#N)`.

**After the merge:** one line to Pierre on what went live (merge contract). Watch at about +2 h, +24 h and +48 h (S4):
- Events `err` on `fish.` pages and save failures;
- Reports with teaching ids;
- Journey, for fish visits by non-admins.
The morning reports carry a fish line for the first week.

**Rollback** (minutes, nothing lost):
- Revert F (or set `open` back to `'group'`) and deploy.
- Players currently on Fish reload onto Corals (`subjAt`). Their saved subject choice and fish progress are kept in the device and the
  sheet's Data, exactly as for a player removed from the group today (ARCHITECTURE "The beta group").
- Group members keep fish. The sheet is untouched: no answers were logged, no rules version.
- A partial rollback is possible (back to group only).
- **Triggers:** a fish error affecting players (Events), save failures linked to fish data, or a "production broken" case. Rule 0's one
  exception: if production breaks, fix or roll back first, then tell Pierre once it is fixed.
- If the release card (S2) shipped, it has already been shown once per device and is not re-shown. Its text should not promise anything a
  rollback would contradict.

**What not to merge between the flip and +48 h:** the URL refonte (routing in `app.js`) and any sheet-script change. That keeps a revert of
F clean.

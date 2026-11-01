# Admin re-review as a new admin

> **Copied into the repo for the handover (2026-11-01).** Original: a private Claude doc on claude.ai (not reachable from another account).
>
> **Status since:** findings 1-6 fixed in PR #271 (classic-token fallback + read-only link on the lock screen, Undo survives a reload, "Which no?" help, Candidates never need emptying, phone coverage tables fit, excluded lecture photos show genus and slide); finding 2 fixed by #263 (Code.gs v8, deployed). Still open: testing the token steps with a real collaborator account (ROADMAP "A second admin"); from "Smaller things", hover+key shortcuts in Forms/Quality, Sign out keeping the draft on a shared device, and uneven page titles were not addressed (low).

Nov 1, 2026 · Pierre Pericard

## Verdict

Much better than the first pass. Nine of the ten earlier recommendations shipped and hold up: a newcomer now finds the workflow (Start here), knows what Publish will send, and bulk actions ask first. What still stops a second admin is mostly **around** the page, not on it: getting write access at all, and player reports that cannot reach Triage until Code.gs v7 is live. On the page itself, the two traps left are the **Remove** button (two meanings) and **Undo silently ending at a reload**.

## Method

I played a new IMR colleague asked to help with photo curation, starting from the link, the in-page ? help, AGENTS.md and docs/ARCHITECTURE.md. Live site, Chromium, 1440 px and 412/360 px, `?readonly` (no token). Every tab and sub-tab, the help of each, then the code of admin.js for what the screens could not show. Nothing was published, nothing written to curation.json or the sheet. I formed my own view first and only then read the previous review.

## Ranked findings

### 1. Access is likely a dead end for a collaborator (high)

The lock screen asks for a **fine-grained** token, "Only select repositories, then coral-id-imr". As far as I know, a fine-grained token can only reach repositories owned by its creator or by an organisation they belong to, so a person added as a collaborator on Pierre's personal repository cannot pick coral-id-imr there. The three on-screen steps would end at an empty list. Ways out: a classic token (repo scope, broader than needed), moving the repo to a GitHub organisation, or Pierre setting the device up himself. The ROADMAP line on a second admin says "add them as a GitHub collaborator", which may not be enough. Worth testing with a spare account before it matters. Also, the lock screen offers no way to just look (`?readonly` is only known from the docs).

### 2. Player reports cannot reach Triage today (high)

The live sync script answers `v: 5` (checked today), so reports stay queued in players' browsers until v7 is redeployed (already in ROADMAP). Two things a newcomer cannot tell: Triage says "Sign in to the sync on the site", because that check runs before the version check, so the real cause is hidden; and even with v7, only the sheet owner can read reports, so a second admin will never see them. Suggest: redeploy v7, check the version before the sign-in in `loadReports()`, and say in the Triage help that reports are owner-only.

### 3. Remove means two things, and there are five ways to say no (medium)

On a genus card, **Remove** un-adds a photo you added from the candidates (it goes back to Candidates), but on any other photo it **hides** it everywhere, games included. The Genera help talks of "hidden photos" while no button says Hide. Add Reject, Skip, Not this and × and a newcomer has five ways to get rid of a photo, one of them permanent. Suggest one short line per action in the Genera help ("Which no?"), keeping the page itself free of text.

*Correction after reading more code: both cases end the same way for the user (the photo leaves the site and is listed with the candidates on the genus page, as Pierre asked in PR #169). The real gap was the help, which spoke of "hidden photos". Fixed in PR #271 with the "Which no?" line.*

### 4. Undo stops at a reload, but the help implies otherwise (medium)

The draft survives a reload, its Undo steps do not (they live in memory only). Start here says "Undo (Ctrl+Z) before Publish", which is false the day after. With no bulk discard (by Pierre's rule, rightly), a newcomer who made a mess yesterday can only undo it by hand, photo by photo. Suggest keeping the Undo history with the draft (sessionStorage or localStorage, capped), or at least one sentence in Start here.

### 5. The candidate backlog has no end in sight (medium)

1,092 candidates are waiting (Dauin 337, PH 238, CF book 517) and every one of the 66 genera shows "N waiting", so the count is no signal. Start here sends a newcomer to Candidates first, so the first job looks endless. Suggest one line in Start here: you never need to empty it; the queue already serves the thinnest genus and view first; stop when Needs looks better.

### 6. Phone: the coverage tables scroll sideways (low)

Game coverage is 437 px wide at 412 px, Sheet & Finder coverage 462 px at 360 px; the sources bar and the + column are cut off. Other tabs fit.

### 7. Smaller things (low)

- Forms and Quality change a photo on hover + key (B E T…, 1 2 3). Handy for Pierre, easy to trigger by accident for someone typing elsewhere; Undo covers it until a reload (see 4).
- Sign out keeps the draft in this browser. On a shared device, the next admin inherits it and could publish it.
- Excluded: the excluded IMR lecture photo `imrl-p10_i7` shows "no preview" (the thumbnail fallback only knows iNat ids), so Restore is a guess for exactly the photos that matter most.
- The × on the candidate photo still sits where "close" usually is. Pierre chose to keep it (PR #265); noted, not reopened.
- Stats › Players: the Photos number sits far right, next to Learned. With one player (Pierre) the stats are expected to be thin.
- Page titles are uneven: Forms, Quality, Excluded, Needs and Stats have one, Genera and Candidates do not.

## What works well

- **Start here** gives the order of work, what reaches the site and what is permanent, in one screen.
- **Publish** lists what it will send and asks first (code check; not clickable in read-only).
- **Needs** is now a top-level tab: the to-do list a newcomer looks for.
- Candidates swiper, coverage heatmaps and Look-alikes are readable without help.
- Read-only is honest: the button says Read-only and no draft is kept.
- No console errors; every tab loads in 3 to 5 s.

## Compared with the previous review

| Previous recommendation | Now |
| --- | --- |
| 1. Start here page | Shipped, opens first until seen. Works. |
| 2. Summary before Publish | Shipped (pubSummary + confirm). |
| 3. Protect bulk or permanent actions | Validate N and CF book ask first. Moving the swiper × was declined by Pierre (PR #265). |
| 4. Two false alerts | Pocillopora ⚠ check gone; no stray book photo in Triage. |
| 5. Outdated help | "Easy level", "game set" and "tell Claude to remap" gone (now "Forget them"). |
| 6. Navigation by task | Needs is top-level, Stats keeps Players / Photos / Photo list. |
| 7. One word, one meaning | "new" became "N waiting" / "added", "3 levels" became "3 zooms", "CF only" became "Not IMR". Remove is still double (finding 3). |
| 8. Symbols legend | In the Genera help. |
| 9. Readable Excluded | iNat thumbnails shown; IMR lecture photos still blank (finding 7). |
| 10. Read-only really read-only | Done. |
| Second admin: author in the commit | Done ("by login"). Access and a restricted role are parked in ROADMAP; access is likely harder than noted (finding 1). |

New in this pass: findings 1, 2, 4, 5 and 6, and the double meaning of Remove.

## Suggested next steps

1. Redeploy Code.gs v7, and make Triage name the real cause (version before sign-in).
2. Add a "Which no?" line to the Genera help (Remove, Reject, Skip, Not this, ×).
3. Keep the Undo history across reloads, or say in Start here that it ends.
4. One line in Start here: Candidates never need emptying.
5. Fix the sideways scroll of the two coverage tables on phones.
6. Before a second admin joins: test the token steps with a collaborator account, and update the ROADMAP line.

## Follow-up

Pierre asked to fix everything possible. PR #271: Undo steps survive a reload, "Which no?" help, Start here note on Candidates, classic-token fallback and read-only link on the lock screen, phone coverage tables fit, excluded lecture photos show genus and slide, Players column aligned. Finding 2 was already fixed on main by #263 (Code.gs v8, reports readable by every admin with their token; the redeploy is Pierre's).

# AGENTS.md: handover for any coding agent

Read this first if you are an AI agent (Claude Code, Codex, other) or a new developer picking up this repository. It holds what you cannot guess from the code: who the app is for, the owner's standing rules, how the pieces fit together and how to ship a change.

Companion docs:
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): files, data model, build tools, admin, progress sync, deploy.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): ideas discussed but not built yet, open questions, items waiting on someone. **Add to it whenever an idea is discussed and not implemented right away.**
- [`judging/AGENTS.md`](judging/AGENTS.md): a separate brief for an agent that only judges photos (growth form, quality, view...). Not this file's job.

## The project in five lines

- **IMR Coral ID** is a static web app (plain HTML/CSS/JS, no build step, GitHub Pages) live at <https://ppericard.github.io/coral-id-imr/>.
- It teaches the **39 coral genera on the IMR slate** (Institute for Marine Research, Dauin, Philippines): 34 numbered genera that IMR surveys track, plus 5 starred look-alikes (Duncanopsammia, Alveopora, Merulina, Cyphastrea, Halomitra) that are not tracked but must be told apart.
- Owner: **Pierre Pericard** (GitHub `ppericard`), Research Fellow at IMR since October 2026. Users: Pierre and the Research Assistants (RAs) he trains, most of them on phones.
- RAs' first job is genus-level labelling of top-down benthic photos in **ReefCloud**, so growth form alone is never enough: the app must teach genus recognition.
- Path in the app = **Learn → Practice → Identify** (the order RAs work in), plus **My progress** and a Pierre-only **admin** back-office (`admin.html`).

## Standing rules from Pierre (do not break these)

These came from Pierre's explicit feedback. When in doubt, follow them over your own taste, and ask him rather than guessing.

### Content and sources
1. **Never contradict or "correct" the IMR course or its lecturers** in the app. Keep the IMR wording (families, lecture lines, mnemonics, spellings). Where another source differs, add at most a discreet, dated, sourced note ("Source X (year) says…", shown as "Other sources" from `gen[g].info`), never "the lecture is wrong/outdated". Obvious slide slips are silently not reproduced and mentioned to Pierre only.
2. **Never invent categories or information.** Groupings come only from existing references: IMR Lecture 6 groups (1-11), Coral Finder 2022 categories/boxes, the 7 IMR growth forms, or a mix. Every clue, label or pair carries its source (slide number, CF page/box). Claude-made look-alike "families" were rejected.
3. **IMR lecture cues are the most important content.** Two levels: the **ID tip** (`gen[g].qt`, from `tools/id_tips.txt`) is SHORT, 2-3 essentials, shown everywhere (quiz feedback, cards, ID tips view, comparisons) in a highlighted box; the full lecture cues (`gen[g].imr`, incl. review slides and presenter notes) appear only on the genus sheet under "IMR lecture notes".
4. **Growth form is an entry point only**, never genus-specific and never a strict filter (rank, don't filter). Photos use the 7 IMR (AIMS lifeform) forms: Branching, Tabulate, Encrusting, Foliose/Plating, Massive, Submassive, Mushroom (+ "x" too close to tell, + separate "polyps extended" flag). One form per photo, the dominant visible one.
5. **Everything produced is in English** (UI, docs, data, commit messages, artifact titles). Pierre chats in French; only chat may be French.
6. Open discrepancies between sources are listed in `docs/ROADMAP.md` ("Questions for an IMR trainer"). Don't settle them yourself.

### Photos
7. **Photo priority in every context: IMR lecture photos first, then Pierre's own (iNat user `ppericard`), then other iNaturalist observers and Coral Finder book photos only to fill gaps.** Covers and the first 3 ("featured") photos per view: IMR before Pierre's. IMR photos are never auto-rated Poor and never auto-excluded. Exception: the Coral Finder mixes sources on purpose for variety.
8. **Pierre's curation choices (`curation.json`) are never changed automatically**: no script, rebuild or import may overwrite them. Only step-by-step Undo of his own actions; **no bulk reset/wipe button of any kind** (he refused it twice). Never overwrite `curation.json` in a PR: Pierre publishes it straight to `main` from the admin; rebase and keep `main`'s copy. The admin's Publish never writes a whole copy: it re-reads the published file and merges the draft onto it key by key (`merge3()`, PR #240, after a whole-copy publish from a stale tab lost curation on 2026-11-01). Keep it that way if you touch `save()` in `admin.js`.
9. Three views per genus: **colony**, **close-up** (10-30 cm part of a colony; code name `medium`, labelled "Closer" before 2026-11-01) and **corallites** (macro). A genus may have 2 levels: colony + close-up (its macro photos, also labelled "Close-up", Pierre 2026-11-01), never duplicate a photo to fill a view. Cover = mid-distance view, never macro.
10. Never use photos showing several corals in games (`p.multi`; Pierre can clear a wrong mark with curation `single`). **Coral Finder book photos** (© R. Kelley / BYOGUIDES, `gen[g].book`) are **never in games**; on a genus sheet they appear only when Pierre pins one, or to fill a gap after every field photo; the Coral Finder adds up to 3 approved ones for variety. Pierre can switch them off site-wide (admin, curation `book: false`). **IMR lecture photos are game photos** (since PR #227) and count in admin Game coverage. "Poor" means identifiable but low visual quality (ReefCloud-like): Poor photos are used at the hard end of games; unidentifiable photos are excluded, not rated Poor.
11. Provenance tags never on thumbnails; credit in the lightbox. Games: once the answer is out, every photo shows a small clickable source pill (`photoSrc()` in `app.js`: observer + iNat link, or IMR lecture / Coral Finder label), never before the answer (it would give the genus away); hidden on phones, where the enlarged view carries the clickable source (Pierre, 2026-11-01).

11b. **Players can report a problem from every game** once the answer is out (wrong answer + the right genus, several corals, bad photo, other, note). Pierre sees who sent each report in admin Triage, because he trusts some players more than others (2026-11-01). Reports never change anything by themselves.

### Learning logic
12. **Mastery never depends on time** (no spaced-repetition days, no decay, no "refresh"). It is a practical tool, not a retention or daily-habit app (no streaks, lessons, Duolingo-style units). Someone should be able to master everything in a few hours.
13. **A wrong answer counts against both genera**: the correct one and the one wrongly given.
14. Difficulty is adaptive and continuous: per-genus player ability vs photo difficulty on one Elo scale (Pelánek 2016), ~80% target success, guaranteed variety and new photos, more single-view questions as the level rises (details in ARCHITECTURE.md). No manual Easy/Medium/Hard selector. Pierre's own answers bias photo difficulty (he knows the photos): admin Stats has a "Without me" switch; the games still use everyone's answers until RAs have played (ROADMAP). Starred genera are always included in Practice. Never split practice by lecture group.
14b. **All photos of one game question come from ONE observation (same colony)** (Pierre, 2026-11-01). Never top up a missing zoom level with another colony: a colony with one view becomes a single-view question.
15. Visual recognition and fast side-by-side comparison beat theory. The 5-question observation routine is only for the very first contact.

### UI and layout
16. **Declutter**: only essentials on a page. No page titles or intro paragraphs; explanations go behind the shared "?" help button (`pageHelp()` moves any top-level `h2`, `.lede`, `.tips`, `.gloss`, `h3.label` there automatically). One shared mechanism for everything; no per-page exceptions; code homogeneous.
17. **Every game/exercise fits ONE screen in every state** (including feedback after a wrong answer); controls and answers in a side column on wide screens; games may bleed up to 1680 px (`.bleed`).
18. Fixed page width 1280 px; the header never changes size. Light theme default (⚙ Theme). One colour palette site-wide, chosen in ⚙ Colours: Lagoon, Ocean, Seagrass, Twilight, **Depth (default, Pierre's pick)**; ⚙ Colour-blind On/Off swaps green/red for blue/orange (right/wrong, review). Any new colour must come from the palette tokens (`:root[data-palette]`, `[data-cvd]` in `app.css`), in light and dark. Strong colour belongs to the learning-level scale; IMR group colours are muted tints with dark text (number + title carry the group), so one hue never means two things on a screen (design review, 2026-11-01). Genus names are true italics: the Google Fonts URL loads Source Sans 3 italic 400/600 and Barlow Condensed italic 600/700; never rely on faux italics. Readable text is at least 12 px (0.75rem). Photo sizes S/M/L (default M), remembered per page (`SIZE_PAGES`, `pageKey()`).
19. **Responsive**: one code base, mobile-first CSS, exactly 3 size classes: phone < 600 px, tablet 600-1023 px (also a half-screen desktop window), desktop ≥ 1024 px. Same values in CSS and `app.js` `MQ` (`isPhone()`, `isStacked()`). Touch vs mouse by `hover`/`pointer` media, never width. No other breakpoints. Test at 360, 412, 768, 960, 1280, 1440, 1920 px wide.
19b. **No third-party scripts** (the origin `ppericard.github.io` is shared and the admin token lives on it). A new external image or API host must be added to the CSP meta in `index.html`/`admin.html` (see ARCHITECTURE.md "Security model").
20. No horizontal sliders. Visual and dynamic beats text. New features must not degrade the look.
20b. Settings that were removed on purpose (don't bring them back): the "Photos from Dauin / Philippines / All" filter (PR #230; the IMR/own-first rule already does that job), the Reef theme, the quiz level selector.
21. Home = two big doors only ("Learn & practise", "Identify a coral"). Phones: bottom tab bar, no Tools/Lab tab (hammer icon in header).
22. **Lab/Tools prototypes graduate into the main app only with Pierre's explicit approval.** Propose; never promote yourself.
23. **Admin is for Pierre only**: minimal, no explanatory text on the page (tooltips = bare names; help behind the admin "?"), one-click segmented controls, header on one line.

### Working with Pierre
24. Pierre wants agents to work autonomously on this repo, **including merging their own PRs**. Ask first only before destructive or irreversible actions (history rewrite, deleting data, bulk changes to his curation).
25. Pierre prefers many prototypes first and trims later. He judges UX by taps/clicks, scrolls, and what is on screen versus elsewhere.
26. Record every idea that is discussed but not implemented in `docs/ROADMAP.md`, with its source and status.

## Repository map (short)

| Path | What |
|---|---|
| `index.html`, `app.js`, `app.css` | The public app (router, all main pages, games, progress, sync). |
| `core.js` | Pure functions shared by app and admin, tested in `tests/`: curation merge (`merge3`, `mergeOld`), two-device progress merge (`mergeProgress`), photo Elo replay (`eloOf`, same rules as `Code.gs` `stats_`). |
| `tests/` | `node --test tests/*.test.js`: `core.js` and the sync script against an in-memory sheet (`gas.js`). |
| `home.js`, `home-art.js`, `home.css` | Home page and its SVG schematics. |
| `tour.js` | First-visit guided tour (`?tour` forces it). |
| `flag.js` | ⚑ "bad photo" button, only in Pierre's admin browser (players report problems with `repBtn()`/`reportDialog()` in `app.js`, read in admin Triage). |
| `proto/` | Lab/Tools prototypes (`lab.js` hub + one file per tool); `finder.js` is the graduated Coral Finder. |
| `admin.html`, `admin.js`, `admin.css` | Pierre's photo curation back-office. |
| `data.json` | All genus data and photo lists (the served source of truth). |
| `curation.json` | Pierre's choices, applied on top of `data.json` at load. Pierre-owned. |
| `forms.json`, `quality.json`, `picks.json`, `dups.json`, `suggest.json` | Machine suggestions (growth forms, quality, featured picks, duplicates, judging results). |
| `img/` | WebP photos, 1600 px + 480 px `-s` thumbnails. No Git LFS. |
| `tools/` | Python build/import scripts; `tools/sync/Code.gs` is the Google Apps Script for progress sync. |
| `judging/` | Package for an outside photo-judging agent. |
| `.github/workflows/approved-photos.yml` | After each `curation.json` push: download approved candidates, refill candidate lists. |

Details in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## How to make a change

1. Branch from `main` (fetch first: `main` moves often, see below). Run locally: `python3 -m http.server 8000` and open <http://localhost:8000>. There is no build step. Tests: `node --test tests/*.test.js` (Node only, no npm); add one when you change logic they cover. Pure logic shared by app and admin (curation merge, progress merge, photo Elo) lives in `core.js` so it can be tested. Every PR runs `.github/workflows/checks.yml` (JS syntax, tests, JSON, Python, versions).
2. **Cache busting (easy to forget):** when you change a shell file, bump its `?v=N` in `index.html` (and in `app.js` for `data.json`/`forms.json` fetches), the same entry in `sw.js` `SHELL`, and the `sw.js` cache name `V`. For a Lab file, bump `LAB_V` in `proto/lab.js` and `proto/lab.*?v=` in `index.html` and `sw.js`. Other parallel branches bump these too: on rebase, take a number above `main`'s. **`python3 tools/check_versions.py --base origin/main --fix` does all of this for you** (run it after rebasing, before pushing); the PR check fails when a changed file kept its old number.
3. Editing `data.json` by hand is normal (the original build script reads a scratchpad that no longer exists). Write it with `json.dumps(d, ensure_ascii=False, separators=(',', ':'))` to keep the compact format. Prefer a small, re-runnable `tools/apply_*.py` script that documents the change.
4. Check visually with Playwright (Chromium) at the widths in rule 19, light and dark, phone and desktop; check that games fit one screen. Open the browser console: no errors.
5. Open a PR with a short English description (what changed, why, screenshots for UI). Merge it yourself once checked, as a **squash merge** whose title ends with ` (#N)` (that is how `git log` reads). Never force-push `main`; never rewrite history without Pierre's go-ahead (a history rewrite to shrink `.git` was discussed and declined for now).
   - Two kinds of commits land on `main` without a PR: Pierre's admin **Publish** ("Photo curation: …", writes `curation.json` only) and the GitHub Action that follows it ("Candidate photos: …", writes `data.json` and `img/`). So rebase on `origin/main` right before merging; on a `data.json` conflict, take `main`'s copy and re-run your `tools/apply_*.py` script rather than hand-merging.
   - A merge to `main` is live on GitHub Pages within a minute or two; open tabs pick up the new shell on the next visit (service worker) and a new `curation.json` within 30 min or when the tab comes back into view.
6. If you changed `tools/sync/Code.gs`: bump `VERSION` (header comment and constant) and tell Pierre he must redeploy (see ARCHITECTURE.md). Agents cannot deploy Apps Script. The deployed version is **v5** (verified 2026-11-01; v6 and v7 written 2026-11-01, redeploy pending); the app keeps working with an older script, so a change must stay backward compatible until Pierre redeploys. If you change the Elo in `stats_`, change its copy `eloOf()` in `admin.js` too.
7. If you discussed an idea and did not build it: add it to `docs/ROADMAP.md`.
8. **Keep the docs current in the same PR (Pierre, 2026-11-01).** A change is not done until the docs say what the code now does. Before merging, check and update as needed: this file (a new lasting rule from Pierre, a changed workflow), `docs/ARCHITECTURE.md` (a new page, hash, setting, data key, `curation.json` key, admin mode, sync endpoint or Code.gs version, model constant), `docs/ROADMAP.md` (ship = move to "Done recently" with the PR number; deferred = add a line; new "don't do X" = Declined) and `README.md` (anything a newcomer sees). Say "Docs: none needed" in the PR description when nothing applies. The goal: another agent (Codex, a Claude Project, a new developer) can take over from the repo alone, with no chat history or memory.
9. Every ~20 merged PRs, or when Pierre asks, do a full documentation pass: re-check each doc against the code (not against memory) and fix what drifted.

## Where decisions live

- **This file**: the standing rules. Keep it current when Pierre states a new lasting rule.
- **`docs/ROADMAP.md`**: deferred ideas, open questions, pending actions.
- **Pull requests** (#1-#244 by 2026-11-01): each PR description explains a decision; `git log` titles are a good index.
- **Code comments**: most non-obvious behaviours are explained in a comment right above the code, often with the date and "Pierre" when it was his call.
- Claude project memory and design docs on claude.ai (linked in ROADMAP.md) hold the conversation history, but they are not reachable by every agent: anything that matters must also be in this repo.

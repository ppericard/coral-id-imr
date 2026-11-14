# Workflow and shipping rules

How agents work with Pierre (W1-W11) and how a change ships and merges (W12-W27). Who merges, and when: only AGENTS.md "Working
mode" (the merge contract). The index of every rule is in [AGENTS.md](../../AGENTS.md#the-rules).

## Working with Pierre

### W1

**Everything produced is in English** (UI, docs, data, code, commit messages, PRs, artifact titles); **only the chat with
Pierre is in French**: he writes in French, often dictated (expect speech-to-text slips), so reply in French.
*Why:* IMR is an English-speaking workplace. *Source:* Pierre, by 2026-11-01.

### W2

**Work autonomously**: branch, build, test, open PRs and fix review findings without asking. Merging follows the merge
contract (AGENTS.md "Working mode"); ask first before destructive or irreversible actions (history rewrite, deleting
data, bulk changes to his curation).
*Source:* Pierre, by 2026-11-01; merge contract, 2026-11-05.

### W3

**Alpha phase: no backward compatibility for old URLs, old keys or old app versions.** Rename cleanly, everywhere (code
must say what things are). Where real data would be lost (a player's saved data under a renamed key, logged rows under
an old page name), migrate the data once, in the data itself (the app moves its own stored keys at start-up, e.g.
`core.js` `migrateIdKey`; the sheet script moves its own rows once after its install, `Code.gs` `ONCE_`, logged in the
Deploy log), then forget the old name: no redirect, no permanent dual read. Old app versions may break; players update.
The deploy-order rule D4 still holds (the app never relies on a sheet feature before the sheet has it).
*Source:* Pierre, 2026-11-04.

### W4

**Many prototypes first, trim later.** Pierre judges UX by taps/clicks, scrolls, and what is on screen versus
elsewhere; he uses the app on his phone a lot, prefers visuals to text and judges new things in use: ship, then iterate on his feedback.
*Source:* Pierre, by 2026-11-01.

### W5

**Record every idea discussed but not built in `docs/ROADMAP.md`**, with its source and status, inside its section next
to related rows. Development ideas only (rule W10).
*Source:* Pierre, by 2026-11-01.

### W6

**No work sleeps on a branch.** A branch with work worth keeping gets a PR the same day (a draft PR only while an agent is still building it; a PR that waits only for
Pierre's decision is opened ready, with the `needs-pierre` label, never as a draft: the integrator may not mark a draft
ready, so a draft would wait for Pierre's click, Pierre 2026-11-06), and an
active line of work (a "track": the fish mode, the analyses…) is named in `docs/ROADMAP.md` with its branch or PR and its
next step, so a reader of `main` alone sees it. Before ending a session or a night, list the branches with commits not
in `main` and no PR (`python3 tools/brief.py` lists them), and open or close each one.
*Why:* the fish mode, built on branches that never got a PR, went silent for a day although beta players had been
promised it. *Source:* Pierre, 2026-11-04.

### W7

**Fix by default**: after a review, fix every finding you can without asking. Ask Pierre only real choices (one short
question each, with a recommendation) or actions that need his hands (Apps Script redeploy, admin curation, IMR
content). Never re-ask something already answered: check ROADMAP and PR descriptions.
*Source:* Pierre, 2026-11-01.

### W8

**Independent reviews: an open mission, and question our choices.** Give the reviewer a profile, access to the repo and
the app, and a mission as open as possible: no checklist, no fixed scope, no imposed form for the proposals. The mission
says to keep an open mind, to explore what we did not think of, and to **question the choices already made** rather than
take them as given (would we have done it differently, is something better possible), up to proposing a complete
redesign. Then fix by default (rule W7). Reviews are copied in
[`docs/reviews/`](../reviews/README.md).
*Source:* Pierre, 2026-11-04 (a general rule for every independent review).

### W9

**Always the latest stable version of every tool and dependency** (Prettier, Playwright, Node in CI, GitHub Actions,
Python packages…). Look the version up (`npm view <pkg> version`, <https://nodejs.org/dist/index.json> for the Node LTS)
instead of picking one from memory, and when you touch a pinned version, bring it to the latest stable. An exception
needs a written reason next to the pin.

**Keeping the stack current:**
- Every version the repo pins that no package manager tracks lives in `tools/stack.json` (Node and Python in CI, through
  `actions/setup-node` and `actions/setup-python`, never the image's own; Prettier, Playwright, the runner image by its
  name, `runs-on: ubuntu-26.04`, never `ubuntu-latest`); a bump updates `stack.json` in the same PR, the same value in
  every workflow; `python3 tools/stack_check.py --check` runs in CI. Run `--latest` at least weekly (the brief shows its
  count daily).
- Dependabot (`.github/dependabot.yml`) proposes the GitHub Actions and `tools/requirements.txt` bumps, one grouped PR a
  week at most per ecosystem. The integrator merges them once every check is green, rebased and squash-merged, with no
  Codex loop for a pure version bump, after reading the release notes of any new major (renamed inputs, permissions,
  the Pages artifact) and adapting the workflows in the same PR; for pip it bumps `stack.json` too. The PR runs only
  `checks.yml` and `smokes.yml`: after the merge, watch the next run of each workflow that runs on `main` only (Deploy Pages at once;
  Candidate photos, Photos to R2, Analyses report at their next run) and fix forward.
- Patch and minor bumps, and runtime or action majors, with green checks and identical outputs are the integrator's
  call; a bump that changes what players see, how photos are produced, or what Pierre does goes to Pierre.

*Source:* Pierre, 2026-11-01; the whole stack on the latest stable, 2026-11-05 (#584, #587).

### W10

**Never list Pierre's curation choices item by item** (which photo, which candidate, which pair, content choices): not
in status messages, not in ROADMAP. **Reminders of what only he can do live where he reads them when he wants**: STATUS
"Pierre's hands" (later the admin's To do › Points). In the chat, a reminder is given once, when it is useful and
related to the work at hand (e.g. "these units are short of photos", "these 31 photos are out of the presence rule"),
never repeated or nagged. The points to settle (rule C5: IMR trainer questions, content questions, in `points.json`)
stay: he asked for that list.
*Why:* an agent reminded him every few minutes, in the chat, of things unrelated to its own work.
*Source:* Pierre, 2026-11-01; scope restored, 2026-11-05; subject-neutral wording, 2026-11-06.

### W11

**Say what you checked and how**: never describe a photo (growth form, quality, what it shows) without having looked at
it; otherwise say where the claim comes from (a species name, an old ROADMAP note, a data field). A guess is labelled as
a guess.
*Source:* Pierre, 2026-11-01.

## How to ship a change

### W12

**Branch from a fresh `main`; run it locally; add a test with the logic.** Fetch first (`main` moves often). Serve with
`python3 -m http.server 8000` and open <http://localhost:8000>; the admin without a token at
<http://localhost:8000/admin.html?demo>: every page works on made-up players, answers and reports (`admin-demo.js`
answers the sync script and GitHub calls in memory; nothing is sent, Publish is kept in memory, its storage keys are
prefixed `demo:`). Use it for screenshots and to test an admin change; when you change a sync reply or an admin call,
keep `admin-demo.js` in step. No build step. Tests: `node tests/run.js` (every `tests/*.test.js` under `node --test`, in the
machine slot: rule W24; Node only, no npm) and the Playwright
smokes (`tests/*.smoke.js`; CI installs Playwright in a temporary folder: never add a `package.json`); add a case when
you change logic they cover (a photo rule: `tests/photos.test.js`; the question draw: `tests/draw.smoke.js`). **A smoke
waits for and answers a quiz question only through `tests/answer.js`** (`qa.ready(p)`, then `smokeAnswer(right | unit)`
in the page): it answers whatever format is shown (the choices, a typed question, a fish surprise) and fails at once
with what is on screen, never as a bare timeout; a check of one format asserts the `fmt` it returns. `tests/answer.test.js`
fails on a smoke line that names a quiz answer control or answers with a number key itself (a deliberate one, a read of
the choices or a check of one format, says `answer.js: <why>` on or above its line) and on an answer control in `app.js`
`qAnswers` the helper does not know. Pure logic
shared by app and admin (curation merge, progress merge, photo Elo) lives in `core.js` so it can be tested. Every PR runs
`.github/workflows/checks.yml` (JS syntax, tests, JSON, `data.json` layout, Python, versions) and
`.github/workflows/smokes.yml`, each Playwright smoke in its own parallel job `smoke (<name>)` (pages in four groups and
fish in two, `SMOKE_PART`, each group in a job of its own or `tests/smokeparts.test.js` fails; admin whole at 390 px and
in two groups at 1280, `SMOKE_W` / `SMOKE_PART`), `fail-fast: false` so every failing smoke reports. **A PR that changes
only docs skips the smokes** (every file under `docs/`, a `*.md` at the root, the PR template or `LICENSE`); `checks`
still runs on it, `tests/docs.test.js` included. A merge train's push runs both workflows in full (rule W26). A new push
cancels the run still going on the PR. **Session hooks**
(`.claude/settings.json`) print the Manila time and the Rule 0 window at each session start and prompt
(`tools/brief.py --short`, `--time`), running main's reviewed copy of the script
(`git show origin/main:tools/brief.py | python3 -I -`), never the checked-out branch's (a branch could put any code
there): a change to `tools/brief.py` reaches the hooks once merged.
*Source:* repository practice, by 2026-11-01; hooks, 2026-11-05; docs-only PRs skip the smokes, Pierre, 2026-11-08
(Q305); one answerer for the smokes, Pierre, 2026-11-13 (fix the structure, not the one spot: a typed question hung the
overlays smoke on #855).

### W13

**Format JS and CSS with Prettier 3.9.10** and `.prettierrc.json` (print width 140): app, admin, Lab, tests; not
`tools/`, HTML or JSON. Before pushing: `npx --yes prettier@3.9.10 --write "*.js" "*.css" "proto/*.js" "proto/*.css"
"tests/*.js"` (no package.json); the PR check fails otherwise. After a formatter upgrade, compare the syntax trees before
and after, and run it until the files stop changing (Prettier 3.3.3, picked from memory, dropped array elements inside
a template literal in `proto/anatomy.js`, found by an AST comparison on 2026-11-01). `.git-blame-ignore-revs` lists the
reformatting commits (`git config blame.ignoreRevsFile .git-blame-ignore-revs` once for local blame).
*Source:* 2026-11-01.

### W14

**The fast tier before each push, the full tier on CI.** Several agent sessions share one machine, and running every
smoke on every push loaded it until fixed timeouts failed; CI runs everything on each PR, each smoke on its own runner,
and reports every failing one. Locally, run what your change can break, once:
- **Fast tier, before each push** (about 1-2 min): `npx --yes prettier@3.9.10 --check` on the changed `.js`/`.css`;
  `node --check` on the changed JS; `python3 tools/check_versions.py` (consistency, and the sheet's changes file: never
  bump a number, rules W15 and D3);
  `python3 tools/datajson.py --check`; `python3 tools/sync_core.py --check`; `node tests/run.js` (rule W24); then **the
  one smoke part your change touches** (below). Docs-only changes: no smoke.
- **Full tier**: CI on the PR (no smoke for a docs-only PR, rule W12) and on the merge train (rule W26). Run every smoke
  locally only when CI is down. After a big interface change, the
  brand-new-player replay of rule W17 stays a separate manual step.
- **Which smoke part**: `admin*.js`, `admin.css`, `admin.html`, `autosort.js`, `analysis.js` →
  `SMOKE_W=1280 node tests/admin.smoke.js` (`SMOKE_W=390` for a layout change). The question draw (`model.js`, the draw
  in `quiz.js`, `core.js` `photoSet`/`distractors`/the path) → `node tests/draw.smoke.js`, and
  `node tests/profiles.smoke.js` when the learning path changes (rule L11). Fish, `SUBJECTS`, `UNITS` →
  `node tests/fish.smoke.js`. `sw.js`, the loader in `index.html`, photo sizes and fallbacks, R2 →
  `node tests/net.smoke.js`. In `tests/pages.smoke.js`, `SMOKE_ONLY=<part>[,<part>]` runs some of its parts: `tips`
  (`tips.js`), `relief` (the Duel tab's relief card, `quiz.js` `reliefShow`), `start` (the first-launch question, its
  fallback cards: `startSmoke`), `subjtour` (the subject to start with in the tour: `subjTour`), `install` (the offer to install the app: `installCheck`), `signin` (sign-in, the `sync.js` UI), `replay` (the sheet's replay
  adopted), `overlays` (cards, prompts, the one-tap question, the tour), `credits` (Home, credits, header fit), `basics`
  (Coral basics), `visit` (the pages-opened summary), `main` (routes, sheets, lightbox, history: anything else in
  `app.js`, `app.css`, `index.html`; with `SMOKE_W=390` for one width). `SMOKE_PART=main|overlays|rest|more` is the group CI runs
  on one runner (`fish.smoke.js`: `main|fresh`, `fresh` the brand-new fish players). Default (no variable): everything. `PAGES_ONLY=` (the older name) still works.
- **One Playwright run at a time per 2 cores**: every smoke and every Playwright tool (`tools/learnsim.js`,
  `tools/perf.js`, `tools/rtprep.js`, `tools/og/make_og.js`) takes a slot from `tests/slot.js` before it starts
  Chromium, waits while the machine's load is above twice its core count (rule W24), and gives the slot back when it ends
  (a crashed holder's slot is taken back). A new Playwright script calls `await require('./slot.js')(name)` (from `tests/`) the same
  way. A smoke loads Playwright's `chromium` through `tests/calm.js`, which opens every context in reduced motion (no
  entrance animation to wait for) unless the context asks otherwise (a check about motion, the brand-new player). Never
  run two smokes at once from one session; `SMOKE_SLOTS=n` changes the cap, CI ignores it.

*Source:* test-suite review, 2026-11-04, approved by Pierre; the docs-only and train runs, Pierre, 2026-11-08 (Q305).

### W15

**Never edit a version number: the deploy stamps them.** `.github/workflows/pages.yml` runs `tools/stamp_versions.py`
on its staged copy: every `?v=` becomes a hash of the file it names, `LAB_V` and the `sw.js` Lab list one hash of the
Lab files, the `sw.js` cache name `V` a hash of everything its `SHELL` keeps, and the pages get the deploy's build number
(`<meta name="build">`, `sync.js` `appVer` reports `<build>-<hash>`). So a PR **never edits `?v=N`, `LAB_V` or `sw.js`
`V`**, even after changing a file, and a merge never conflicts on them. The numbers in the source are frozen; a **new**
versioned reference takes any number (`?v=1`), the same at every place it appears (`index.html` or `admin.html`, `sw.js`
`SHELL` when the app loads it, `app.js` for a fetch). `python3 tools/check_versions.py` checks that consistency
(one value per file everywhere, `SHELL` lists what `index.html` and `app.js` load, the Lab list matches `LAB.files` and
`LAB_V`) and, in the source, the sheet's `VERSION` rules (rule D3: `--sheet-base REF` on a PR, `--main` on `main` or a
merge train); it has no `--fix`. Locally the browser may keep an old copy of a file you changed (no
service worker on http): reload with the cache disabled. The sheet's `VERSION` is not stamped: the integrator assigns
it at merge (rule D3).
*Why:* five open PRs carried the same `sw.js` V, so each merge forced the others to bump again. *Source:* Pierre,
2026-11-04.

### W16

**Corals: write `data.json` only with `tools/datajson.py`.** Editing it by hand is normal (the original build script reads a
scratchpad that no longer exists), but write it with `from datajson import dump` then `dump(d, path)`, never
`json.dump`: one top-level key per line and one genus per line in `gen`, `course`, `cand`, `x` and `x.gen`, compact
within a line, so two edits to different genera merge cleanly. Candidates waiting live in `cand.json`, admin only: read
both with `load_all()`, write with `dump_all()`, which keeps in `data.json` only the candidates `curation.json` names.
After a hand edit, `python3 tools/datajson.py` puts the file back in that layout; the PR check (`--check`) fails
otherwise. Prefer a small, re-runnable `tools/apply_*.py` script that documents the change.
*Source:* repository practice, by 2026-11-01; subject-neutral wording, 2026-11-06.

### W17

**Check visually with Playwright (Chromium), light and dark**: a small change at one phone and one desktop width, **a big
interface change or redesign at every width of rule U4** (surprises hide in the other sizes); check that games fit one
screen; open the browser console: no errors. **After a big change to the interface or the flow, replay the whole app as
a brand-new player**: an empty browser, phone and desktop, light and dark, from the first load through the tour, the
first cards, a few dozen questions (Again, duels, the offer, achievements), My progress, the other games, Identify,
Tools, help and settings; screenshots at each step, every overlay alone on screen and closable. Not needed for internal
code or small fixes.
*Why:* an RA found the tour and the first genus card on screen together: the tests pre-set "tour seen" or "cards seen",
so no test met both. *Source:* Pierre, 2026-11-02; every width, 2026-11-05.

### W18

**Open a PR with a short English description** following `.github/pull_request_template.md` (what changed, why, the
Decisions, screenshots for UI). The integrator merges it under the merge contract (AGENTS.md "Working mode") as a
**squash merge** whose title ends with ` (#N)` (that is how `git log` reads).
- Two kinds of commits land on `main` without a PR: Pierre's admin **Publish** ("Photo curation: …", writes
  `curation.json` only) and the GitHub Action that follows it ("Candidate photos: …", writes `data.json` and `img/`). So
  rebase on `origin/main` right before merging, or merge through a green merge train (rule W26). With one coral genus per line in `data.json`, edits to different genera
  merge by themselves;
  on a real `data.json` conflict, take `main`'s copy and re-run your `tools/apply_*.py` script rather than hand-merging.
- Never force-push `main` (GitHub blocks it too once Pierre's ruleset is on, HANDOVER.md "Protect main"); never rewrite history without
  Pierre's explicit go-ahead. On a PR branch, after the rebase on `origin/main`, `git push --force-with-lease` to your
  own PR branch (or, for the integrator, to the PR branch it is about to merge) is allowed; never a plain `--force`.
- A history rewrite to shrink `.git` is planned, not declined (Pierre, 2026-11-02): first the photos to Cloudflare R2,
  then remove from `img/` every photo with an online source (git keeps only those with no other backup; the fallback
  becomes the original source), then rewrite history so the old photos leave `.git`; ask Pierre for the go before the
  force-push and keep a backup clone (ROADMAP "Photos out of the repo").
- A merge to `main` is live on GitHub Pages within a minute or two; open tabs pick up the new shell on the next visit
  (service worker) and a new `curation.json` within 30 min or when the tab comes back into view.

*Source:* Pierre, by 2026-11-01; merge contract, 2026-11-05; subject-neutral wording, 2026-11-06; merge train,
2026-11-08 (Q305).

### W19

**Keep the docs current in the same PR**: a change is not done until the docs say what the code now does. Before
merging, check and update as needed: `AGENTS.md` and `docs/rules/` (a new lasting rule from Pierre, a changed workflow),
`docs/ARCHITECTURE.md` (a new page, hash, setting, data key, `curation.json` key, admin mode, sync endpoint or Code.gs
version, model constant), `docs/ROADMAP.md` (ship = delete the row it ships, or update its status; deferred = add a row
inside its section, next to related rows; new "don't do X" = Declined), `README.md` (anything a newcomer sees), the
admin help. Say "Docs: none needed" in the PR description when nothing applies. **No "done" list in any doc**: the squash
title ` (#N)` and the PR description are the record of what shipped, the docs say what the code does now; a shared list
that every PR appends to made every two open PRs conflict, so never start one again (ROADMAP's old list is frozen in
`docs/archive/`). `tests/docs.test.js` holds the rest: AGENTS.md's size budget, every rule ID cited resolving to one
rule, no reference to the retired rule numbers, the living docs' relative links and anchors resolving, every
ARCHITECTURE section cited by its name existing, `docs/PAGES.md` naming every workflow.
*Why:* another agent (Codex, a Claude Project, a new developer) must be able to take over from the repo alone, with no
chat history or memory. *Source:* Pierre, 2026-11-01; no done list, 2026-11-04; docs tests, 2026-11-05.

### W20

**When a unit runs short of candidate photos, the tools fetch more automatically; when none are left, they note it and
stop.** After each Publish the "Candidate photos" workflow refills the lists: coral genera up to their caps
(`tools/fetch_local.py`), and the short fish species (`tools/fetch_fish.py --refill`: under the cap of Q36 net of what
Pierre rejected, excluded or sent elsewhere, or short of easy photos; a few dozen a run, the shortest first). "No more
candidates is no more candidates": a fish species whose search found nothing more is noted with the day
(`tools/fish_refill.json`) and searched again only a month later; for corals, `python3 tools/cand_gaps.py` lists the
game genera with fewer than 5 candidate photos waiting only when iNaturalist still has something the search would take,
never one with nothing better. Each search keeps its subject's area and rules (ARCHITECTURE "Photos", "Fish
candidates"): abroad only for species confirmed in the Philippines (rule C8), never what Pierre rejected or excluded.
The choice of photos stays his (rule W10).
*Why:* a unit short of photos should not wait for someone to notice, and a search with nothing left should not keep
asking iNaturalist (rule C7).
*Source:* Pierre, 2026-11-02; the search area, 2026-11-03; subject-neutral, automatic, 2026-11-06 (Q171).

### W21

**One consistent naming.** The app is IMR Reef ID; the organisation and app names come from `core.js` `ORG` (JS-built
text reads it; static files are written from it by `tools/rename_app.py`), never typed again in JS. A new storage key is
`reefid-<name>` (stays on the device, the default) or `reefid-sync-<name>` (travels with the player: progress files, the
sheet, other devices), with the group of organisms in it when it belongs to one (`reefid-sync-coral-progress`, later
`reefid-sync-fish-progress`): `core.js` `KEYS`. Never a key named after the organisation (a fork must not migrate keys).
Code that must name an old key on purpose carries `rename-app: keep`.
*Why:* a developer reading the code finds one consistent naming. *Source:* Pierre, 2026-11-03.

### W22

**Several agents at once: a worktree each, one smoke at a time.** The integrator launches decided work at once (AGENTS.md
"Working mode"), within rule W27's cap of three agents at a time; the shared machine is protected by `tests/slot.js`. Each agent works in a
**worktree of its own** (`.claude/worktrees/<name>`), sparse when it does not need the photos (`git sparse-checkout set --no-cone '/*' '!/img/'`: the disk is small): link `img` to
the main checkout only to run a test, never stage it, stage files by name, and remove the worktree when the work is
merged. **One Playwright smoke at a time on the machine** (`tests/slot.js`; `SMOKE_SLOTS=1` while several agents run),
only the part your change touches (rule W14), one unit-test run at a time (`node tests/run.js`, rule W24), CI for the full
runs. At most two open PRs per
agent. The stash is shared by every worktree: never `git stash pop` blindly (push with a unique message, apply by SHA).
Who merges: AGENTS.md "Working mode" (the integrator, never a subagent). A thread in its own container (claude.ai
Projects mode) still keeps at most two open PRs and runs only the smoke part its change touches.
*Source:* 2026-11-04; launch at once, Pierre, 2026-11-05; capped at three agents by rule W27, Pierre, 2026-11-09.

### W23

**The review loop on every PR.** After each push, comment `@codex review` on the PR (the Codex bot reviews the new head).
Each finding: fix it with a test that fails first, or answer with the reason it does not apply; then reply on its thread
and resolve it (`gh api -X POST repos/{owner}/{repo}/pulls/N/ccr/comments/ID/resolve`). **Never re-run a failed CI job to
get green**: find why it failed (a known flake is no root cause), fix it or say so. GitHub's GraphQL API is unavailable
from Claude Code sessions: use the REST API (`gh api repos/...`; open a PR with `gh api repos/{owner}/{repo}/pulls -f
title=… -f head=… -f base=main -F body=@file`; ready for review: `.../pulls/N/ccr/ready_for_review`).
*Source:* 2026-11-04.

### W24

**Every heavy run takes the machine slot; the load budget is twice the cores; keep 5 GB free and clean up behind you.**
Many agents share one 4-core machine with a small disk: a load near 16 brought it down and killed every agent on it.
`tests/slot.js` is the one lock, automatic and a no-op on CI (`CI` set):
- **A full unit-test run: `node tests/run.js`** (`node --test` options pass through, e.g. `--test-name-pattern=merge`;
  files given replace the default), never a bare `node --test tests/*.test.js`. One file stays unlocked, for the fast
  loop: `node --test tests/x.test.js`.
- **Playwright**: every launch takes a slot first: a smoke through `tests/calm.js` (its `chromium.launch` takes it) or
  `await require('./slot.js')(name)`, a Playwright tool the same way (`tools/learnsim.js`, `tools/perf.js`,
  `tools/rtprep.js`, `tools/og/make_og.js`). `tests/slot.test.js` fails on a launch in `tests/` or `tools/` without it.
- **Heavy tools** call the guard at the top of their heavy path, after the usage check: Node
  `require('../tests/slot.js').guard('tools/x.js')`, Python `import slot; slot.guard('tools/x.py')` (`tools/slot.py`); it
  re-runs the tool in a slot and exits with its code. Guarded: `tools/analyses.js`, `abilityeval.js`, `fallbackeval.js`,
  `realcheck.js`, `memreplay.js`; `photo_metrics.py`, `photo_quality.py`, `find_dups.py`, `photos.py`
  (when it writes), `judging_cand.py` (sheets, detail), `judging_fish.py` (sheets), `fish_judge.py` (`--sheets`),
  `fetch_approved.py`. A new heavy tool gets the guard (`tests/slot.test.js` lists them); any other heavy command runs as
  `node tests/slot.js -- cmd args`.
- **Load budget**: a slot is given while the 1-minute load average is at most twice the cores (`tests/slot.js` `LOAD`: 8
  on 4 cores); above, the run waits. At most `SMOKE_SLOTS` heavy runs at once (default one per 2 cores; `SMOKE_SLOTS=1`
  while several agents run). A holder's children run in its slot (`REEFID_SLOT`): a full run or a smoke that starts a
  guarded tool never waits for itself.
- **Disk**: a heavy run refuses to start with less than 5 GB free on the repository's disk (`tests/slot.js` `diskOk()`,
  `MIN_FREE_GB`), and says what to clean. **Every agent cleans up behind itself**: its worktree once its PR is merged
  (`git worktree remove`), temporary downloads, venvs, screenshots it no longer needs.

*Why:* an agent that forgets the rule must not be able to overload the machine. *Source:* Pierre, 2026-11-05 ("the
automatic lock of the unit tests"; the load budget of twice the cores and the disk rule the same day).

### W25

**Use the quota with care, never at the cost of the result.** Precise briefs, query instead of reading, no subagent for a
small task, stop agents when done, one wake-up per wait, local checks before each push. A lighter model only for
mechanical work a test verifies; never for a judgment (photo judging included).

*Why:* the Claude quota is shared by every agent and runs out for days; the result comes first. *Source:* Pierre,
2026-11-08.

### W26

**Several ready PRs merge through one green merge train.** When two or more PRs each meet the merge contract on their
own head, the integrator runs `python3 tools/train.py N1 N2 …` (`--dry-run` first): a new branch `train/<time>` holds
`main` plus their heads, Checks and Smokes run once on it, and if it is green each PR is squash-merged through the API in
order at the head the train tested, with no update-branch (no new head, so no new Codex wait); then `main`'s tree must
equal the train's, and the train stops if a Publish, an Action or another merge lands in between. A red train merges
nothing: leave out the PR the failing job points to and build a new train, never re-run it (rule W23). A PR that changes
`Code.gs` rides a train only once its `VERSION` is assigned on its branch (rule D3), one such PR per train (two would
conflict on the header line). Any other new head (a fix, a catch-up merge of `main`, the `VERSION` assign) waits for
Codex as always. A train branch gets no PR (rule W6 skips it; the weekly "Clean branches and Actions" workflow deletes it after two
days, docs/HANDOVER.md); `tools/train.py` sends only GET and PUT to GitHub and
never force-pushes.
*Why:* each merge left the other ready PRs behind, and each catch-up cost a CI run and a Codex wait, about 4 min per PR
in a burst. *Source:* Pierre, 2026-11-08 (Q305).

### W27

**Bounded cost, no conflicts: few agents, small PRs, two Codex rounds, then cut.** The integrator holds to these, each
checked before it launches or relaunches an agent:
- **At most three agents at a time**, each on one PR with one subject. A finished agent is stopped, not kept waiting.
- **Every branch starts from `origin/main`**, never from another PR's branch: no stacked PRs. A PR that would contain
  another is the same PR.
- **No two open PRs on the same sensitive file at once** (`Code.gs`, `core.js`, `sync.js`, `model.js`): the second waits
  until the first is merged, then starts from `main`. Before launching, the integrator checks the files of the open PRs.
- **Two Codex rounds at most per PR.** If Codex still finds something after the second round's fixes, the integrator
  cuts the PR's scope (the part that keeps failing moves to a branch of its own) and tells Pierre, instead of a third
  round. Findings that keep coming on the same part point to a structural problem: that part restarts from a short
  design note (the need, the model that removes the whole class of cases, e.g. one writer instead of locks around many),
  not from a fix of the latest case. Spotting the structural problem and choosing the model is the agents' and the
  integrator's job, not Pierre's (Pierre, 2026-11-09: "c'est pas à moi de trouver les solutions"; "ça reste vous, les
  designers"). When the choice changes what he or the players see, he gets the options, each with its benefits and
  risks, and the one recommended.
- **A simulation reads only what is declared**: answers capped at the largest count a guardrail or the primary reads,
  and an unclear cell's second look on that cell alone. A check longer than 30 minutes is a tooling bug to fix.
- **One train at a time** (`tools/train.py` through a queue, never two in parallel).
- **A short or ambiguous request from Pierre is asked back before any work starts** (one question in the chat).
- **Agents' scratch files carry the PR or topic in their name** (`pr-<N>-<topic>.md`): the scratchpad is shared.

*Why:* on 2026-11-09 about a dozen agents ran at once with very large contexts, stacked PRs and parallel trains caused
conflicts and red trains, one PR (#798) went through six Codex rounds in a day, a three-hour simulation read 10,000
answers where the guardrails read 3,000, and misread requests were built twice; more than half of a week's quota went
on a handful of PRs. *Source:* Pierre, 2026-11-09 ("si tu ne les écris pas quelque part, ça sera jamais fait").

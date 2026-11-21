# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version, whether the local `origin/main` is
the remote's) is printed by `python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.
**Pierre's answers live in [ANSWERS.md](ANSWERS.md)** (append-only historical evidence: a hit is checked for its scope,
later amendments and whether it still applies, AGENTS.md "Every answer reaches its doc"). This file only cites answers.

**Start here: the [Project Home](https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc)** (Linear) and
[INTEGRATOR "Linear"](INTEGRATOR.md#linear): where each kind of information lives. Tasks and questions are in Linear
(team REE; views Now, Next, Decisions for Pierre, Waiting and blockers); substantial studies in the Drive folder
[Reef_ID](https://drive.google.com/drive/folders/1EHqtC9iINaYrb0zalE7FpX1F01DrskIp); code, specs and code-coupled
studies here. Nothing lives only in the integrator's chat (Pierre, 2026-11-22 06:20: the work must be readable by other
collaborators, humans or AI agents such as ChatGPT / Codex Desktop).

Written 2026-11-22, about 08:00 Manila, by the integrator, at **a pause of the Claude Code side** (Pierre, 07:27: stop
opening tasks, close what is in flight, hand over cleanly so that Codex can review how we work). **A new integrator
starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-22 ~06:00 Manila (nothing new since 2026-11-21 18:20; no errors).

## The pause and the review by Codex

- **Handover and review brief for Codex** (Drive, 2026-11-22):
  [How the Reef ID team works](https://docs.google.com/document/d/1agtmEbHc6f3QD1qdFWMxkCts9QciYT1FEdRuHah3kWM/edit):
  how we work, figures of 21-22 Nov, what worked, what went wrong, open items, four questions for Codex.
- **Process issues for Codex first:** REE-230 (the integrator lost the adopted Linear + Drive arrangement after several
  compactions; (a) and (b) fixed by #1455, (c) a rule for adopted studies is Pierre's call), REE-219 (GitHub closes a
  Linear issue on any linked PR's merge; workaround "Part of REE-N" in partial PRs), REE-218 (scheduled tasks: a
  better mechanism than the Scheduled label?), REE-229 (open the project to more collaborators), REE-220 (the
  integrator's FIFO grouped-train queue script is still in its scratchpad).
- **Quota:** Pierre reported about 60% of a Claude Ultra quota used since 2026-11-21; he asked to wind down. Before
  resuming, ask him the pace.

## Now

Main: sheet script **v220** (#1449). No agent runs, except the last in-flight PR: **#1390** (REE-29 step 3, the admin's
auto-sort named `tree*`, a scripted rename re-applied on current main), to train when green and Codex-clean.
Open and waiting for Pierre: **#1391** (REE-197, the draw's rotation floor) and **#1409** (REE-51, a calmer About rights
text). About 125 PRs merged on 21-22 Nov (`git log`, `python3 tools/night.py`).

Went live since 04:00 (one line each for Pierre, information only): the "Did you know?" tips (d) Coral basics, (e)
Identify and (f) typed answers; Remove + Undo and the Removed list for fish and sea slugs in the admin; the fish species
sheets' "Males and females / Colour phases" section (97 species); the sea slugs' About lists their 35 cited sources;
the fish box pass done (1,685 boxes; tiles cut by the Candidate photos runs); 261 judged fish photos; the Lab's Life
stages game; one admin tile, montage and coverage page for every subject; the Crop on IMR lecture photos; Analyses:
forgetting by genus, player trajectories, the common-name modifier. Internal: `core.js` split into 22 parts in
`core/` (byte-identical, REE-29 step 4 done), two `core.js` comment passes, every game photo measured, net-smoke
flakes fixed (#1447; REE-208 open until the cause is confirmed).

## Next

When the Claude Code side resumes, at Pierre's pace: Linear view Next, High first. Most ready High items touch `core.js` / `core/*.js` / `Code.gs` (rule W27: one PR at a
time): REE-43, 34, 32, 42, 27, 30, 28, 38, 39, 35, 31, 37, 65, 40. Also REE-13 tips (g) and (h), REE-221 to REE-223
(small fixes), REE-217 (more fish boxes, when quota allows). Not started on purpose: REE-229 (left for Codex).

## Questions for Pierre

All in Linear with the label Decision for Pierre (context and a recommendation in each), view
[Decisions for Pierre](https://linear.app/reef-id/view/cc08634e-681a-4f23-bad9-44505f52118d). Blocking ready work:
REE-26 (fish: another family's species against both families; recommend (b)), REE-197 / #1391 (recommend option 2),
REE-55 (fish offsets; recommend option A), REE-192 (Q453, recommend A), REE-52 (25 held species), REE-225 (juvenile
mimicry tiles; recommend one named exception), REE-194 (his curation: photos to exclude or move). Lighter: REE-198,
REE-6 (R2: delete the 2 unused tiles), REE-112, #1409 / REE-51, REE-41 (a Device column in the Answers tab), REE-226,
REE-70, REE-49 (b), REE-227 (rule W24), REE-228, REE-230 (c). When he has time: REE-7 (Q439), REE-71. One choice to
confirm with #1354: "Delete, keep answers" also deletes the account's report images.

Last question number: Q452

## Pierre's hands

In Linear: REE-8 (gold set 2, 42 photos), REE-72 (a `release` ruleset and the stray branch), REE-74 (his curation
waiting in the admin), REE-194 (photos in the admin). Scheduled (out of the lists until due): REE-75 (admin token, back
2027-01-01), REE-73 (trainer role, back when he hosts a live game).

## Parked after hours

- Nothing (the morning's questions are in Linear, above).

## Last stop

2026-11-22 ~08:00 Manila, at Pierre's request (07:27). Queue tooling: `tools/queue/` (README there); the grouped FIFO
queue script is REE-220. No real names.

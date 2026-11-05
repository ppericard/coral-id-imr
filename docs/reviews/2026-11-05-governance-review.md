# IMR Reef ID: review of the governance documents

Reviewer profile: a senior engineering lead who sets up working agreements for teams made of one human owner and several AI coding agents. I had never seen the project before this review. I worked read-only on `main` @ `322e1bc` (#555), on 2026-11-05 at about 09:20 Manila time.

---

## 0. The verdict in one paragraph

The project's rules are good. The way they are packaged is wrong for the people who read them. Almost every individual rule is sensible, many are clever (rules backed by tests, "say what you checked", "fix by default", one decided process counting as decided, the Codex loop, no "done" list). The CI discipline holds: the last 60 merged PRs were all fully green.

The packaging has stopped working, for four reasons:
- **The start-up read is too long.** An agent is told to read about 33,000 words (≈50k tokens) before it does anything. HANDOVER calls this "15 minutes"; for a human it is closer to two hours.
- **Merge rights are stated six times, in three different ways.** None of the six matches the working mode the owner has just chosen.
- **"Where things stand" lives in four places.** Each is partly stale, and each is written through PRs that conflict with one another.
- **The owner cannot check his own rules.** It is 80 KB of dense English with 72 inline "(Pierre, date: …)" asides, and he reads on a phone, in French.

I recommend a **redesign of the structure, not of the content**:
- a short constitution that every agent reads, and that Pierre himself can read;
- topic rule files, read only when they apply;
- one status board with a single writer: the integrator;
- a written merge contract for the integrator mode;
- Rule 0 and the start-of-session routine turned into a script and a hook, instead of prose that agents must remember.

Details and a migration plan follow.

---

## 1. What I checked, and how

- **Read in full:** `CLAUDE.md`, `AGENTS.md`, `docs/HANDOVER.md`, `docs/EVENING.md`, `docs/reviews/README.md`, `README.md`, `tests/docs.test.js`, `tests/rule13b.test.js` (head), `.github/workflows/checks.yml` and `pages.yml`, `judging/AGENTS.md` (outline and first 40 lines), `judging/PROMPT.md` (head).
- **`docs/ROADMAP.md`:** read the top 70 lines, the Admin plan and Declined sections, and per-section row counts and statuses (by script). Rows were truncated by script because some are up to 7,138 characters long.
- **`ARCHITECTURE.md`, `LEARNING.md`, `FISH_PATH.md`, `DESIGN.md`:** outlines and sizes only.
- **Sizes:** `wc -c` and `wc -w`, and maximum line length per doc.
- **Docs against code (script):** I extracted every backticked identifier and path from `AGENTS.md`, `HANDOVER.md`, `README.md` and `CLAUDE.md`, and grepped the code for each one. **Every identifier exists** (202 in AGENTS.md alone); the only "missing" paths are globs. So the drift is not in code names. It is in policy and state.
- **GitHub, REST only:**
  - all 555 PRs: merge times converted to Manila time;
  - check runs on the head commit of the last 60 merged PRs (all `success:9`);
  - review and issue comments on 15 PRs (the Codex loop is followed on each);
  - bodies of #504, #512, #515, #530, #537, #538, #550 and #555, and the diff of #550;
  - branches, tags, labels and repo settings; branch protection on `main` (none).
- **Compared** the live `Code.gs` `VERSION` (48) with what HANDOVER says ("45 live, 46-48 reserved by open PRs").
- **Measured** where a 32 KiB cut falls in `AGENTS.md`. See finding F4. The 32 KiB limit itself is my recollection of Codex's default `project_doc_max_bytes`. Treat it as a guess to verify.
- **Not done:** I did not run the app or the smoke tests. Docs-against-behaviour was not my focus, and the name check above was cheaper and conclusive for code references.

---

## 2. Findings, most important first

### F1. The merge rule contradicts itself, and none of its versions is the mode Pierre just chose (urgent)

Statements about who may merge, and when:

| Where | What it says |
|---|---|
| AGENTS.md standing rule 24 | "work autonomously … **including merging their own PRs**. Ask first only before destructive or irreversible actions." |
| AGENTS.md Rule 0, "Agents without Pierre" | Merge alone only when green, Codex-clean, no open thread, and **every choice already decided with him**. This is the right rule, but it is written as a *night* rule. |
| AGENTS.md How-to 6 | "Merge it yourself once checked." |
| AGENTS.md How-to 16 (#555, merged **this morning** 00:18 UTC) | Two modes. #555's description says "development is back in a claude.ai Project, where **threads merge their own PRs**." |
| HANDOVER "Working with Pierre" | "open PRs and **merge them yourself** once checks pass". |
| HANDOVER "First prompt for the new account" | "open PRs and merge them yourself once checks pass". |

In 24 hours the documented mode changed from "coordinator merges" (#504) to "threads merge their own" (#555). The owner's new decision (one integrator, subagents never merge, merge only what was decided, otherwise ask) is on neither list. By *day*, an agent that reads rule 24 or the first prompt will merge choices Pierre never made. Merging is the one action that reaches production, so this is the most expensive ambiguity in the repo.

**Proposal:**
- One "Merge contract" section, the only place that speaks about merge rights, written for the integrator mode (§3.3 below).
- Every other mention becomes a link to it.
- Rule 24, How-to 6, the HANDOVER bullets and the first prompt are rewritten in the same PR.
- Mode 2 (Projects threads) becomes a short appendix, "if Pierre switches back", or is dropped.

### F2. The start-up read costs about 50k tokens and two hours, and every subagent pays it again

| Mandatory or early read | Words | ≈ tokens |
|---|---|---|
| AGENTS.md (CLAUDE.md says read it first) | 12,425 | ~20k |
| HANDOVER.md (CLAUDE.md says read it next) | 4,178 | ~7k |
| EVENING.md (Rule 0: read it first each morning) | 1,120 | ~2k |
| ROADMAP.md (HANDOVER read order, step 3) | 14,997 | ~23k |
| **Subtotal before touching code** | **~32,700** | **~50k** |
| ARCHITECTURE.md + DESIGN.md (step 4, "when you touch code") | 48,258 | ~75k |

HANDOVER calls this "15 minutes". At 250 words a minute, the subtotal alone is about 2 h 10 for a human.

For an agent, the cost is quota and attention:
- The night of 2026-11-04 ended because Pierre's quota was at 6% (EVENING, "Where the night stopped"). Quota is the binding constraint, and the docs spend it.
- In the integrator mode, each subagent starts cold. My belief, not verified: Claude Code subagents also receive CLAUDE.md, which sends them to AGENTS.md and HANDOVER. Ten subagents a day would then spend about 270k tokens reading the same rules, most of which do not apply to their task. A subagent fixing a CSS class does not need the iNaturalist presence rule or the Apps Script consent-screen steps.
- Long instructions also dilute compliance. The rule an agent most needs (who merges, when to stop asking Pierre) sits among 70 others of equal visual weight.

**Proposal:** a constitution of about 3k tokens that every agent reads, plus files read on demand (§3.1). Add a size budget to `tests/docs.test.js` so it cannot grow back.

### F3. "Where things stand" lives in four places, is stale in each, and is written through conflicting PRs

| Place | What it holds | Stale examples I verified |
|---|---|---|
| HANDOVER "State of play (2026-11-04, evening)" | tracks, sheet version, PRs | "VERSION 45 live; open PRs reserve v46-v48": Code.gs is at 48 and all three PRs merged. "#535 open": merged. "Clean merged branches" is still a pending action for Pierre, but `delete_branch_on_merge` is on and only 8 branches remain. |
| HANDOVER "State of play at the account switch (2026-11-01)" | four-day-old state | "v10 is live", "No open pull requests at handover time". |
| EVENING "Where the day stopped" / "Where the night stopped" | last stop and next steps | "lab.css dead classes not done": merged in #516 the same evening. The night section says both "Open PRs: none" and "Still open: #520 …". It says the night stopped "at about 19:00", but #550 merged at 20:31 Manila. |
| ROADMAP "Backlog in priority order (handover, 2026-11-01)" plus statuses | priorities | Items struck through with "done". "Waiting on Pierre" holds rows whose status is "Done", "In the quiz", "Promoted to Learn". The admin plan says "#492 In review"; it is merged. ROADMAP's own rule says delete a row when it ships. |
| AGENTS.md itself | state inside rules | How-to 7: "Deployed: **v11** verified live 2026-11-01; v12 … deploys itself". "Where decisions live": "PRs #1-#285+ by 2026-11-01". |

"Waiting on Pierre" is also kept in three lists (HANDOVER, ROADMAP, EVENING) that do not agree.

**State written in a file that many agents edit through PRs is the same anti-pattern as the "Done" list that #512 removed.** The project already discovered this once. On 2026-11-04 the coordinator closed #530 unmerged ("no EVENING.md edits on branches tonight: each PR appending to the same section conflicts"). The question that PR carried (five circle-1 fish species with no candidate photo, recommendation "leave them as they are") **does not appear in #550's EVENING diff, in today's EVENING, or in ROADMAP**. It may have been raised in chat; I cannot tell. From the repository alone it looks lost. Its branch `…-fishq` is still on GitHub with no PR, and so is `…-nightq`: two quiet breaches of rule 26b.

**Proposal:** one `docs/STATUS.md`, **overwritten (never appended) and written only by the integrator** (§3.2). Subagents never touch it, so no conflicts. The parts that can be computed (open PRs, sheet version, stray branches) are printed by a script instead of being written by hand (§3.4).

### F4. Codex probably sees only the first 40% of AGENTS.md (to verify)

To my knowledge, Codex's default limit for project docs is 32 KiB. AGENTS.md is 79.8 KB. The 32 KiB cut falls right after standing rule 15b. If the limit applies, Codex (as a coding agent, and possibly as the PR reviewer) never sees:
- the UI and admin rules;
- "Working with Pierre";
- the repository map;
- all of "How to make a change" (tests, cache busting, the Code.gs procedure, the review loop, merging).

This alone justifies a short root AGENTS.md.

Separately, `judging/AGENTS.md` is a brief for a *photo-judging* agent ("Write only `judging/out/<Genus>.json`"), but it uses the filename that Codex loads automatically for any work under `judging/`. A coding agent editing `judging/FISH.md` or the schema would be told it is a judge. Rename it, for example to `judging/BRIEF.md`, and update `PROMPT.md`.

Codex's GitHub review also reads a "Review guidelines" section from AGENTS.md if one exists. There is none. A short one, listing the rules that are cheap to miss in review, would make the Codex loop sharper: never edit `?v=`, never touch `curation.json`, no subject name in the engine, no real player names, sheet gate (7a), rules version (14).

### F5. Rule numbering is ambiguous, and references are already wrong-looking

There are two numbered lists in one file: standing rules 1-28 (with 6a-6g, 11b, 14a-14i, 20b-20g, 24b, 26b, 27a-27d) and How-to 1-17 (with 2b, 7a, 13b).
- "Rule 13b" in `tests/rule13b.test.js` and HANDOVER means How-to 13b ("Subjects"). Standing rule 13 is "a wrong answer counts against both genera".
- Rule 24b says "the deploy-order rule 7a" (How-to), while standing rule 7 is about photos.
- Step 2b says "never bump a number, rule 3", meaning How-to 3.
- #504 had to fix two rules both numbered "14g".

Letter suffixes show append-only growth. Each new rule is squeezed in next to a related one, so nothing ever gets merged or removed.

**Proposal:** stable, prefixed IDs per topic file (`PHOTO-7`, `LEARN-12`, `SHIP-7a`… or short slugs). Add a docs test that every "rule X" or ID cited in the docs, code comments and tests resolves to exactly one rule. The renaming is one mechanical PR with an old→new table, in the alpha spirit of rule 24b.

### F6. AGENTS.md mixes four kinds of text with four different readers and lifetimes

1. **Owner's standing rules:** stable, short, for every agent and for Pierre (rules 1, 2, 8, 12, 20f…).
2. **Product specifications:** these belong in ARCHITECTURE, LEARNING or DESIGN. Examples:
   - rule 14h's fallback thresholds ("one-sided 80% … 95% with 10 genera met");
   - rule 23's full list of the Analyses tabs and views;
   - rule 6c's citation mechanics;
   - rule 13b's beta-group details.
   They are copied into AGENTS.md *and* into ARCHITECTURE or LEARNING, so they drift twice.
3. **Procedures:** Code.gs release, rules version, cache stamping, which smoke to run, slots, stash. These are for whoever is doing that task, at that moment.
4. **State:** v11 live, PR counts, "Pierre's Cloud project set up on…".

Provenance is inline everywhere: 72 "(Pierre, 2026-11-0x: '…')" in AGENTS.md alone. Provenance matters, and Pierre's quotes carry intent. But inside the rule sentence it doubles the length and buries the imperative.

**Proposal:** each rule written as "imperative line. *Why:* one line. *Source:* #PR (date)". The quote lives in the PR.

### F7. The owner cannot audit his own rules

These are *Pierre's* rules, and agents transcribe them from French dictation into dense English. Nothing lets him check that a transcription says what he meant. He would have to read 80 KB on a phone. Two incidents in the record show transcription drift that he had to correct afterwards:
- #512: agents prepared the end of the day from 15:15;
- #515: Rule 0 was first written as stopping the agents, not him.

**Proposal:** the constitution (§3.1) fits on a few phone screens, so Pierre can actually read it. Any PR that changes it carries, in its description, the old and new wording side by side, plus Pierre's original French sentence. Optionally, a French rendering of the constitution for his eyes only, generated, never the source.

### F8. Several rules can only work if an agent remembers them. Make the machine do it.

- **Rule 0 relies on remembering to run `TZ=Asia/Manila date`** at every session and task. That is precisely the kind of instruction that drops out of a long context. A Claude Code `SessionStart` hook and a `UserPromptSubmit` hook (in `.claude/settings.json`) can inject "Manila 16:42, closing window: start nothing new that needs Pierre" on every turn. The rule then never depends on memory. This works for the integrator mode, which is a Claude Code session. A claude.ai chat coordinator would not run hooks.
- **Session-start rituals:**
  - How-to 11: run `cand_gaps.py` and remind Pierre;
  - rule 26b: list branches with commits and no PR;
  - How-to 7a: read the sheet's Deploy log after a Code.gs merge;
  - checking open PRs.
  All of these belong in one script (`tools/brief.py`, §3.4) that the hook runs.
- **How-to 10, "a full documentation pass every ~20 merged PRs":** at ~100 merges a day that is five passes a day, and it is not happening (passes at #245, #288, #504). Replace it with:
  - the identifier-existence check I ran (it passes today), as a test;
  - a size budget;
  - the rule-ID check;
  - the integrator rewriting STATUS daily.
- **Merge preconditions are enforced by nobody.** `main` has no protection: no required checks; merge commits and rebase merges are allowed although How-to 6 says squash only; force-push is not blocked by GitHub. Discipline has held (60/60 green), but it is one confused agent away from a red deploy.
  - **Pierre, one-time:** a branch ruleset on `main` with the `Checks` jobs required, squash only, and no force push or deletion.
- **Rule 27b ("latest version of every tool") is not followed:** `pages.yml` pins `actions/checkout@v4` and `configure-pages@v5`, while `checks.yml` uses `@v7`. A small sign that prose rules without a check drift.

### F9. "Leave it open for Pierre with screenshots": the screenshots are out of his reach

#538 (and, I expect, other night PRs) lists its screenshots as "kept outside the repo, this session's scratchpad `night/`". Pierre cannot open a container's scratchpad from his phone, and the next session cannot either.

**Proposal:** the merge contract requires *viewable* evidence. Options:
- commit the screenshots to a dedicated orphan branch (`screens`) and link the raw URLs in the PR;
- or publish a private artifact page and link it.
Either way, Pierre opens one link.

### F10. The questions to Pierre work well in content but not in delivery

The *format* in #538 is excellent: numbered questions, context, recommendation. But:
- **Questions are spread out.** They sit in PR bodies, in EVENING (which conflicts, F3), and in chat.
- **Nothing limits how often he is interrupted.** In the new mode the integrator will produce questions all day.
- **Evidence worth weighing:** on 2026-11-05 Pierre answered **all seven** night PRs "yes … as recommended". Many "choices" were low-stakes and reversible (the one-line subtitle under a fish answer; starting values that learnsim will retune).

**Proposal:**
- Questions live in one queue, STATUS "Questions for Pierre", numbered Q1, Q2… for good. Each question is also linked from its PR and labelled `needs-pierre`.
- They are delivered in **windows** (for example at session start, around 11:00 and around 14:30; never from 16:30), at most about 5 per batch, in French, each answerable in one word ("Q12 oui, Q13 B, Q14 non").
- The answer is pasted into the PR (French original plus English) before the merge. That paste *is* the decision record (see F11).
- **Decision for Pierre, not for me:** consider a "default with veto" class for reversible choices that are not visible to players (copy that is not shown to players yet, tuning a learnsim-validated value): the integrator states the default in the batch and merges it at the next window unless he says no. I flag it because his answers suggest it would save him time. His new rule says "ask first", so it stays his call.

### F11. Provenance of "decided" is not checkable from the repository

- **Agents act on GitHub as `ppericard`.** Every PR, comment and merge in the sample is Pierre's account. GitHub cannot tell Pierre's approval from an agent's action.
- **PR bodies point to `claude.ai/code/project/…` thread links**, which do not open from the other account he switches to. HANDOVER says so about the older links.

So "every choice was already decided with him", the heart of the new merge rule, cannot be checked later by anyone, including the integrator after a context reset.

**Proposal:** a PR template (none exists today) with a mandatory **Decisions** section. Each choice in the PR is listed with its source, *quoted*:
- a rule ID;
- a ROADMAP "Next" row with its spec;
- Pierre's words, pasted with the date;
- or "a decided process: <name>".
Next to it, a **Choices I made (need Pierre)** section. If that second section is non-empty, the PR is not merged. Add labels `needs-pierre` and `decided`.

### F12. Smaller items

- **`docs/reviews/README.md`:** the "Open items" column is stale. "data.json one genus per line", "Prettier", "tests for photoSet/distractors" are all done. It also has no slot for the rule-27a reviews now under way (this one included).
- **HANDOVER "Working copy":** says "Node 18+", while CI runs Node 26.
- **HANDOVER, public repository:** it publishes the sheet id, Drive and Slides ids and a GCP project number. These are not secrets, but they are reconnaissance material in a public repository, served on Pages too. Low risk. Consider moving them to an owner-only note, or keep them knowingly.
- **Every docs-only merge redeploys production:** `pages.yml` has no `paths-ignore`. At the current cadence of status PRs that is a lot of deploys. It becomes moot once status no longer lives in PRs (§3.2).
- **`LEARNING.md` (386 KB, 70k words) and `ARCHITECTURE.md` (277 KB, lines up to 18,416 characters, about 10 KB per heading):** neither can be read, only grepped. Split each into "what the code does now", short, by topic, and an append-only lab notebook (studies and measurements, one file per study).
- **Rule 0 says "the morning report before 08:00"**, and nights end when the quota does. If a run dies mid-night, the report is never written. With `tools/brief.py` the morning state can be reconstructed from GitHub, so the report becomes a convenience, not a dependency.

---

## 3. What I would do instead: the proposed design

### 3.0 Principles

1. **Separate by reader and lifetime.** Constitution (everyone, stable), topic rules (whoever touches the topic), procedures (whoever does the task, as scripts or skills), status (the integrator, overwritten daily), decision record (PRs), reference (on demand).
2. **Machines over memory.** A rule that can be a test, a hook, a script or a GitHub setting becomes one. Prose remains for what only judgement can do. The project already does this well (`rule13b.test.js`, `photos.test.js`, `docs.test.js`); make it the default.
3. **One writer per mutable file.** State that several agents write through PRs will conflict. Give each mutable file one owner.
4. **Budgets.** Every-agent context ≤ ~12 KB (≈3k tokens). Status ≤ 80 lines. ROADMAP rows ≤ 3 lines (details in linked specs or PRs). All enforced by `tests/docs.test.js`.
5. **Pierre's attention is the scarcest resource.** Batch it, schedule it, record each answer once.

### 3.1 Files

```
CLAUDE.md            3 lines: "@AGENTS.md" import (Claude Code loads it, no tool call), plus "run tools/brief.py if the hook didn't"
AGENTS.md            ≤ 12 KB, the constitution (read by every agent, Codex and Claude, and by Pierre)
  1. The project in 5 lines
  2. Rule 0 (≤ 12 lines; the hook prints the current window)
  3. The merge contract (the only place merge rights are stated)
  4. Asking Pierre (format, windows, queue in STATUS)
  5. The ~15 "never" rules, one line each, with ID and link
     (never contradict IMR; never invent categories; never write curation.json; no real names in the repo;
      never edit ?v=; tests never reach the real sheet; no decay with time; English everywhere but chat …)
  6. Read-on-demand table: "touching X → read docs/rules/X.md and ARCHITECTURE § Y"
  7. Ship checklist (≤ 12 lines; details in docs/rules/ship.md)
  8. Review guidelines (for Codex's GitHub review)
docs/rules/          today's standing rules, moved by topic, IDs stable:
  content.md (IMR, sources, presence, iNat API)   photos.md      learning.md
  ui.md          admin.md        subjects-fish.md    sheet.md (Code.gs, 7a, rules versions)
  ship.md (tests tiers, smoke slots, cache stamping, data.json writer, worktrees)
docs/STATUS.md       single writer: the integrator. Overwritten. ≤ 80 lines. (replaces EVENING, HANDOVER state of play,
                     ROADMAP "Backlog in priority order", the three "Waiting on Pierre" lists)
docs/ROADMAP.md      backlog only: Next (ordered), Parked, Declined, Questions for an IMR trainer. No status of shipped work.
docs/SETUP.md        today's HANDOVER minus state: working copy, external resources, Apps Script steps (French menus),
                     analyses token, first prompt (rewritten for the integrator mode)
docs/ARCHITECTURE/   split by today's headings; current behaviour only
docs/LEARNING.md     the current model (short) + docs/learning-notebook/<date>-<study>.md (append-only)
.github/pull_request_template.md   What / Why / Decisions (quoted sources) / Choices I made (need Pierre) /
                     Player-visible? / Evidence (viewable links) / Sheet version / Tests run / Docs
.claude/settings.json              SessionStart + UserPromptSubmit hooks → tools/brief.py --short
.claude/agents/worker.md           the subagent brief (below)
judging/BRIEF.md     renamed from judging/AGENTS.md
```

Nothing of substance is deleted in the move. Every sentence of today's AGENTS.md lands in a topic file, in ARCHITECTURE, or on a "dropped" list (state, duplicates) that Pierre approves (§4).

### 3.2 `docs/STATUS.md` (the one place for "where things stand")

```
# Status: 2026-11-05 15:10 Manila (integrator)
## Now        tracks in flight: track · PR/branch · state · next step          (≤ 8 lines)
## Next       the integrator's queue, in order (top 5 from ROADMAP Next)
## Questions for Pierre   Q14 … (context, recommendation, default; PR link) · answered ones move into their PR, then off
## Pierre's hands         actions only he can do (token, tags, settings), with the exact steps link
## Parked after hours     Rule 0 ideas, verbatim + context (cleared each morning)
## Last stop              who stopped, when, why (quota, end of day), what was mid-flight
```

Subagents never edit it. They report to the integrator, who writes STATUS once at each stop (end of day, quota, or before 08:00). A crashed night loses nothing important, because the GitHub state is recomputed by `brief.py`.

### 3.3 The merge contract (integrator mode)

> **Subagents never merge.** They open a PR (draft until green) and report: PR number, the Decisions list, the Choices-I-made list, and questions.
>
> **The integrator merges a PR when all of these hold:**
> 1. every check is green, and no failed job was re-run to get green (SHIP-17);
> 2. every Codex thread is answered and resolved;
> 3. "Choices I made" is empty: every choice is traced, quoted, to a rule ID, a ROADMAP Next row with its spec, Pierre's pasted words, or a decided process;
> 4. it is not in the **always-ask** list: anything players see that Pierre has not approved (new screen, wording, game rule), editorial or curation content, money, accounts or access, anything destructive or irreversible (data deletion, history rewrite, sheet column layout), a change to a decided process itself;
> 5. it was rebased on `origin/main` just before the merge (Publish commits land without PRs), and it is a squash merge titled `… (#N)`.
>
> **Otherwise:** label `needs-pierre`, add Qn to STATUS, deliver at the next question window. When Pierre answers, paste his answer (French plus English) into the PR, then merge.
>
> **Night and weekend:** the same contract. Rule 0 changes when Pierre is asked, not what may merge.

This is today's night rule made universal, which is what Pierre has just decided. It replaces rule 24, How-to 6, How-to 16's merge sentences and the three HANDOVER statements.

### 3.4 `tools/brief.py` (the session start, computed)

Fast, read-only, and fails softly with no network. It prints:
- Manila time and the Rule 0 window (day / closing / after hours), with the one-line instruction for that window;
- open PRs: checks state, unresolved Codex threads, labels (`needs-pierre`, `decided`), age;
- branches with commits not in `main` and no PR (rule 26b). Today it would list `…-fishq` and `…-nightq`;
- `Code.gs` `VERSION` on `main` against the live `v` (the read-only URL HANDOVER already documents), and the last Deploy log line if readable;
- open Questions for Pierre (count, oldest);
- `cand_gaps.py` summary (How-to 11).

The hook runs `--short` (a 5-line summary of the window, PRs needing action and questions) on every session start. The integrator runs the full version at each stop. This replaces How-to 10 and 11, and half of Rule 0's bullet list.

### 3.5 The subagent brief (`.claude/agents/worker.md`, or a template the integrator fills in)

What the integrator hands each subagent:
- the task;
- the decision sources (quoted);
- the scope (the files it may touch);
- which `docs/rules/*.md` files to read;
- which smoke part to run (SHIP-2b);
- the report format.

Fixed instructions: worktree of its own; at most 2 PRs; never merge; never edit STATUS; never solicit Pierre (questions go into the report).

A subagent then reads about 3k tokens of constitution, plus about 3k of the one or two topic files it needs, instead of 50k.

### 3.6 Rule 0, kept and made cheaper to obey

Keep Pierre's intent and the "insist" behaviour verbatim in spirit; that part works and he wants it. Shrink the text to about 12 lines:
- the three windows;
- what each window allows *for Pierre*;
- the after-hours script (park the idea, confirm, encourage him to stop);
- the only exceptions (his conscious confirmation for one named task, or a production incident).

The hook makes the time check automatic. The end-of-day protocol becomes "write STATUS › Last stop". The question windows of §3.3 inherit the cutoff: no batch from 16:30.

---

## 4. How to migrate without breaking trust (the integrator alone, in a quiet window)

1. **PR A (today, small, urgent):** the merge contract (§3.3) written into AGENTS.md. Rule 24, How-to 6, How-to 16, HANDOVER "Working with Pierre" and the first prompt point to it. The PR template and the labels come with it. This fixes F1 before anything else.
2. **PR B:** `tools/brief.py` and the hooks; STATUS.md created from EVENING plus HANDOVER state plus the three "Waiting on Pierre" lists. EVENING becomes a one-line pointer, then is removed. Done items in ROADMAP "Waiting on Pierre" and "Backlog" are deleted per its own rule. The stray branches and the lost #530 question go to Pierre as Q items.
3. **PR C (mechanical):** split AGENTS.md into the constitution and `docs/rules/*.md` with stable IDs; a script rewrites every reference in code comments, tests and docs; a docs test resolves IDs. **Content check:** a script shows that every sentence of the old AGENTS.md is present in the new files, or on an explicit "dropped" list (state, duplicates of ARCHITECTURE) **that Pierre approves as a Q item**. Rename `judging/AGENTS.md`. Add Review guidelines.
4. **PR D:** size budgets and the identifier-existence check in `tests/docs.test.js`; remove How-to 10.
5. **Pierre's hands (Q items):** the `main` ruleset (required checks, squash only, no force push); the archive tags already pending in EVENING.
6. **Later, no rush:** split ARCHITECTURE and LEARNING into current-behaviour and notebook.

Risk and mitigation: a restructure can lose a nuance Pierre cares about. The sentence-level content check, and his approval of the dropped list, are what make it safe. Do it while few PRs are open, so the move does not conflict with work in flight.

---

## 5. What to keep exactly as it is

- **Rules backed by tests** (`rule13b.test.js` with its "an exception never outlives its ROADMAP row", `photos.test.js`, the frozen archive hash). This is the best idea in the repository; extend it.
- **"Fix by default", "say what you checked and how", "never re-ask what was answered"**: short, behavioural, effective.
- **The Codex loop and "never re-run a failed job to get green".** Followed in every PR I sampled; 60/60 merges green.
- **The "decided process counts as decided" concept.** It is what lets the fish judging run at night without Pierre.
- **No running "done" list; the PR description is the record.** Right; extend the same logic to status (F3).
- **The question format of #538:** context, recommendation, numbered.
- **Rule 0's purpose and its firmness.** Change only its delivery: a hook and less text.
- **The ROADMAP sections "Declined" and "Questions for an IMR trainer".** Both clearly earn their place.

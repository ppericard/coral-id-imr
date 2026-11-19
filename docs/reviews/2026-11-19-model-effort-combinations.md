# Model and effort combinations per task (study, 2026-11-19)

**Status: proposal (2026-11-19), docs only.** Nothing in AGENTS.md or docs/INTEGRATOR.md changes in this PR. Section 4
proposes a replacement for INTEGRATOR's table, for the integrator to apply, and a new wording for the AGENTS.md bullet,
for Pierre to read in the morning.

Why: Pierre, 2026-11-19 20:40 Manila: «C'est pas forcément un écart à la règle de mettre Opus Medium sur des tâches.
C'est toi en fait qui s'est mis toute seule hein, la règle. Moi j'ai jamais dit que Opus c'était forcément en high.
C'est toi qui t'es mis trois niveaux et qui a fixé ces niveaux là avec ces modèles et ces efforts. Il y a clairement
d'autres combinaisons possibles. Il faut voir ce que Anthropic recommande, mais à mon avis, effectivement, il y a
d'autres moyens, il y a d'autres possibilités en termes de combinaison modèle et effort.»

The table of 2026-11-18 has three tiers, each one model at one effort: Opus 5.5 high, Sonnet 5.5 medium to high, Haiku
5.5 low. The integrator chose those tiers. Pierre approved the idea of a table and "ok, applique ce tableau"; the tiers
themselves were not his. This study takes the model and the effort as two separate settings. It asks which combination
fits each kind of task this project runs, from Anthropic's current guidance (section 1) and our own measurement
(section 2).

Every Anthropic claim below cites its page; every page was read on 2026-11-19. Each row of section 3 says what it rests
on: our measurement, Anthropic's benchmarks (their tasks, not ours), or the integrator's judgement (rule W11).

## 1. What Anthropic recommends today

### The four models

From the models overview ([models/overview][ov]) and the pricing page ([pricing][pr]):

| Model | Anthropic's description | Price per MTok (input / output) | Latency | Default effort, API | Default effort, Claude Code |
| --- | --- | --- | --- | --- | --- |
| Fable 5.2 | "For demanding reasoning and long-horizon agentic work" | $8 / $40 | Moderate | `high` | `medium` |
| Opus 5.5 | "For long-running agentic coding and knowledge work" | $4 / $20 | Moderate | `medium` | `medium` |
| Sonnet 5.5 | "The best combination of speed and intelligence" | $2 / $10 | Fast | `high` | `medium` |
| Haiku 5.5 | "For high-volume, latency-sensitive tasks such as classification, extraction, and routing" | $0.10 / $0.50 (prompts up to 100,000 tokens) | Fastest | `medium` | `medium` |

The overview's starting point: "If you're unsure which model to use, start with Claude Opus 5.5 for most workloads. Use
Claude Fable 5.2 for demanding reasoning and long-horizon agentic work, or when your evals on Claude Opus 5.5 at higher
effort still fall short." The Claude Code defaults come from [model-config][mc]: "Fable 5.2, Opus 5.5, Sonnet 5.5, and
Haiku 5.5 default to `medium`". So in Claude Code a launch without an explicit effort does not run at the API default
for Sonnet 5.5 or Fable 5.2. And "on another model", a subagent does not take the session's level: "To pick a
subagent's level, set `effort` in its definition" ([model-config][mc]). Our guard already refuses a launch without
`effort`; the table must still name one level, never a range.

### What effort changes

From the effort page ([effort][ef]):

- Effort "affects **all tokens** in the response": text, tool calls and their arguments, and thinking. "Lower effort
  also means fewer and terser tool calls." It is "a behavioral signal, not a strict token budget".
- The five levels, as the page describes them: `low`, "Simpler tasks that need the best speed and lowest costs, such as
  subagents"; `medium`, "Agentic tasks that require a balance of speed, cost, and performance"; `high`, "Complex
  reasoning, difficult coding problems, agentic tasks"; `xhigh`, "Long-running agentic and coding tasks (over 30
  minutes) with token budgets in the millions"; `max`, "Tasks requiring the deepest possible reasoning".
- Per model: Opus 5.5 "Run an effort sweep on your own evals rather than carrying settings over"; Sonnet 5.5 "For agentic
  coding and multistep tool use, start with `medium` for well-specified tasks and move to `high` for harder or longer
  ones"; Haiku 5.5 "Start with `medium` for most work, including agentic coding", `high` "for knowledge work, longer
  agent tasks, and strict instruction following"; Fable 5.2 "Start with `high`. Most of the gain in capability is
  already present at `high`, and above it, gains are uneven".
- Claude Code's own reading of the levels ([model-config][mc]): `low` for "Quick exchanges where you review each
  result"; `medium` on Opus 5.5 and Sonnet 5.5 "fits day-to-day engineering work with a clear scope, such as
  implementing a new feature"; `high` for "Work where verification matters or edge cases are likely, such as fixing a
  bug in an existing codebase"; `max` "may show diminishing returns and is prone to overthinking".

What a low level costs in behaviour, besides score:

- Sonnet 5.5: "At `low`, it keeps its thinking short and can skip verifying a change. [...] At `low` and `medium`, on
  long agentic tasks, it's more likely to stop and check in with the user before it completes its work"
  ([prompting Sonnet 5.5][ps]).
- Haiku 5.5: "In long agent prompts, the model is more likely to skip a search, stop early, or skip a check at this
  level" (`low`); "At `low` and `medium` effort, Claude Haiku 5.5 sometimes reports a code change as done without
  running a check" ([prompting Haiku 5.5][ph]).
- Opus 5.5: an unattended agent can end a turn with a progress report while work remains ([prompting Opus 5.5][po],
  "Unattended agentic runs").

### Cost and quality: measured by Anthropic

All from [optimizing for cost and intelligence][co] unless marked. These are Anthropic's benchmarks (mostly coding and
web research), not our tasks.

| Benchmark | Configuration | Score | Cost |
| --- | --- | --- | --- |
| SWE-bench Pro subset | Sonnet 5.5 `high` (its default) | 87.6% solved | $0.11 per solved task |
| SWE-bench Pro subset | Opus 5.5 `low` | 87.4% solved | $0.12 per solved task |
| SWE-bench Pro subset | Opus 5.5 `medium` (default) | 92.8% solved | $0.22 per solved task |
| SWE-bench Pro subset | Opus 5.5 `high` | 95.3% solved | $0.29 per task |
| SWE-bench Pro subset | Opus 5.5 `xhigh` | 96.7% (one run) | $0.74 per task |
| SWE-bench Pro subset | Fable 5.1 `high` | 92.3% (one run) | $1.19 per solved task |
| Internal agentic coding (370 tasks) | Opus 5.5 `medium` | 86.6% | $0.84 per attempt |
| Internal agentic coding | Sonnet 5.5 `high` | 77.8% | $0.33 per attempt |
| Internal agentic coding | Sonnet 5.5 `medium` | 62.7% | $0.16 per attempt |
| Internal agentic coding | Fable 5.2 `medium` | 88.9% (one run) | $1.34 per attempt |
| DeepResearch Bench II | Fable 5.2 `low` / `medium` / `high` | 54.5% / 55.0% / 57.7% | $1.49 / $2.16 / $4.82 per task |

And in words:

- **A lighter model at higher effort against a heavier one at lower effort.** "On the SWE-bench Pro subset Opus 5.5 at
  `low` solved about the same share of tasks as Sonnet 5.5 at its default, inside run-to-run noise, for about 7% more
  per solved task." On research: "Claude Opus 5.5 scored 2.4 points above Claude Sonnet 5.5 for 1.5 times the cost per
  task. Claude Fable 5.2 cost 4.3 times as much as Claude Sonnet 5.5 for no measurable gain in score."
- **Effort is not free to lower everywhere.** "On an internal defect-search benchmark (10 runs per setting), Claude Opus
  5.5 scored 34 points lower at `low` than at `medium`, for about a fifth of the cost." Sonnet 5.5 at `medium` scored
  about 7 points under `high` on SWE-bench Pro (59% of the cost), and about 15 points under on the internal agentic
  coding benchmark (48% of the cost).
- **The order to tune in.** "Tune one model before you add a second: sweep effort on your current model first, because
  most workloads end there, and if the sweep shows a gap, price the stronger model alone at low effort." "Compare models
  on cost per completed task, not per token". "Price the tail of your workload, not the median: compare models on the
  hardest tenth of your tasks". "The bill is decided by the tasks the cheaper model fails, because a failed task still
  bills its tokens, then the retry, then whatever the failure costs downstream."
- **Re-running failures at higher effort.** Opus 5.5 at `low` with its failures re-run at `high`: about 97% solved for
  about $0.17 a task, against 95.3% for $0.29 with everything at `high`. "Use this policy for the saving, not the
  lift."
- **Haiku 5.5**: "suits high-volume and latency-sensitive work with checkable outputs."
- **Vision.** Opus 5.5 "even at its lowest effort setting [...] read values off dense charts more accurately than
  Claude Opus 5 did at its highest" ([prompting Opus 5.5][po]); on a chart benchmark "Claude Opus 5.5 at `low` scored
  68.7 for about $0.03 USD a chart, against 62.5 for $0.15 USD from Claude Fable 5.1 at `low`" ([co][co]). Image tools
  help more than effort: "Without tools, raising effort improves its reading of technical drawings but does little for
  charts" ([po][po]). Photographs of fish are neither charts nor drawings: no Anthropic figure covers them.

### Orchestrated work

- "Claude Opus 5.5 with Claude Sonnet 5.5 subagents cost about a third less than one Claude Opus 5.5 session per part at
  its default effort, and scored about the same. Claude Fable 5.2 as the orchestrator in Claude Opus 5.5's place cost
  19% more and scored about the same" (defect search, work larger than one context window) ([co][co]).
- "Delegation came out ahead in only two situations": routine work with a long cost tail, and work larger than one
  context window. "When the work is one dependent chain, or fits in a single context without a long cost tail, the
  orchestrator's model alone at lower effort came out ahead in every case measured on earlier models" ([co][co]).
- Haiku 5.5 subagents under Opus 5.5 `medium` on coding: "cut cost per attempt by 32% and the pass rate by about 4
  percentage points [...], about what a mix of `low` and `medium` without subagents would give at that cost" ([co][co]).
- Sonnet 5.5 at `xhigh` and `max` "can start its own rounds of review and verification, sometimes with subagents"
  ([ps][ps]); Fable 5.2 at `xhigh` and `max` used "subagents in an agentic coding product to review its own work"
  ([prompting Fable 5.2][pf]).

### The diagnostic

The Claude Code team's article (Lydia Hallie, 2026-07-07, before the 5.5 models; used here for its principle only)
([blog][bl]): "did it not _try_ hard enough, or did it not _know_ enough?" "Pick a higher effort level if Claude got it
wrong by skipping a file"; "If Claude has all the pertinent context and clearly tried and still got it wrong, that's a
signal to pick a larger model." This replaces our single "one step up" with two moves: one effort level up, or one
model up.

## 2. What we measured

One task type only: the fish photo candidate pass (judging/FISH.md). Nothing here bears on the other nine task types.

**The model measure** ([2026-11-19-model-measure-fish-judging.md](2026-11-19-model-measure-fish-judging.md), #1211). 76
past candidates, six configurations (Haiku 5.5 low and medium, Sonnet 5.5 medium and high, Opus 5.5 medium and high),
blind, scored against the committed reference. No configuration passed, the Opus 5.5 high control included: the
reference did not reproduce itself (Opus high 77% in-play agreement with it).

**Gold set 1** (Pierre, 2026-11-19 11:28-11:43; scores in the integrator's scratchpad). It is not a second experiment:
30 of the same 76 photos, picked by hand where the judges disagreed, with the same judge outputs re-scored against
Pierre's dictated verdicts. He dictated against Opus 5.5 high's tags, so every field figure leans toward Opus high
(anchoring). The rubric was then corrected on these 30 photos (#1218).

| Configuration | In play against Pierre (n=26) | 95% interval | Serious errors against Pierre | Field agreement, explicit (anchored to Opus high) | Unsure on 28 blind photos | Against the reference (#1211): in play, serious |
| --- | --- | --- | --- | --- | --- | --- |
| Haiku 5.5 low | 19/26 (73%) | 54-86% | 3 | 72% | 15 | 75%, 3 |
| Haiku 5.5 medium | 17/26 (65%) | 46-81% | 4 | 71% | 17 | 81%, 1 |
| Sonnet 5.5 medium | 21/26 (81%) | 62-91% | 5 | 77% | 9 | 77%, 6 |
| Sonnet 5.5 high | 23/26 (88%) | 71-96% | 2 | 74% | 10 | 87%, 4 |
| Opus 5.5 medium | 20/26 (77%) | 58-89% | 2 | 81% | 8 | 75%, 6 |
| Opus 5.5 high | 19/26 (73%) | 54-86% | 1 | 84% | 11 | 77%, 5 |

**What these data can conclude (rule A5):**

- Haiku 5.5, at low or medium, does not fit blind photo judging under a rubric that asks for `unsure` "at the least
  doubt": it keeps photos out by doubting (30-37 extra unsure of 76; 15-17 of 28), and its agreement with Pierre on
  whether a photo plays is the lowest.
- The rubric, not the model, was the bottleneck (#1211 "What it implies"): two fresh judges agreed with each other more
  (83-90%) than any judge with the reference.

**What they cannot conclude:**

- **No ranking of Opus 5.5 high, Opus 5.5 medium and Sonnet 5.5 high.** The intervals overlap by most of their width
  (n=26: about ±15-20 points). The order flips with the measure: Sonnet 5.5 high is best on in play against Pierre
  (88%) and on the population-weighted agreement with the reference (94%), yet it put 11 of Pierre's 16 rejections in
  play, the most of any configuration; Opus 5.5 high has the fewest serious errors against Pierre (1) and the best field
  agreement, but that agreement is anchored to it.
- **No effect of effort, separate from noise.** Each configuration ran once. Opus medium and Opus high agreed on 83% of
  the in-play calls, less than Sonnet high and Opus high (90%), but without a repeat of one configuration we cannot tell
  how much of that 17% is effort and how much is a second draw. Anthropic saw identical runs differ "by up to 5 tasks in
  57" on one benchmark ([co][co]).
- **No cost per configuration.** Tokens were not recorded per configuration (about 95,000-120,000 subagent tokens per
  call of 11-14 photos, all configurations together); only list prices compare them: Sonnet 5.5 costs half of Opus 5.5
  per token. Whether Sonnet 5.5 high used more tokens than Opus 5.5 high on these calls is unknown.
- **A sample of 50-100 separates only large differences.** An estimate (normal approximation, two configurations judged
  on the same photos, about 15% of photos called differently): 76 photos give a 95% interval of about ±9 points on the
  difference, 50 about ±11, 200 about ±5. The AGENTS.md sample test can catch a lighter model 10 points worse, not one
  5 points worse.

**Gold set 2** (42 new photos, each shown to Pierre with one judge's view drawn at random among the six; his answers are
not in yet). It is what can settle the open question above: the same six configurations on new photos, under the
rubric as #1218 corrected it, scored against Pierre, with the anchoring measured (the shown judge against the other five
on each photo). Its scorer (`score2.py`) exists; this study does not score it.

## 3. This project's task types

For each: the combination proposed, what it rests on, and the measurement still needed (AGENTS.md "Model choice by
measurement") or the check that stands in for one. "Judgement" marks the integrator's reasoning where neither Anthropic
nor we measured the task.

1. **Judging photos** (the fish candidate pass; sea slugs and corals until they are measured too): **Opus 5.5 high**,
   unchanged. Rests on: our measurement, which validated nothing lighter and cannot rank the strong three. Still
   needed: gold set 2, with **Sonnet 5.5 high** and **Opus 5.5 medium** as the candidates; Haiku 5.5 is out for blind
   judging (section 2). If one of them matches Opus 5.5 high on gold set 2 within the threshold set before scoring, it
   takes the bulk with the drift sample of #1211 (5%, at least 30 photos per batch, re-judged by Opus 5.5 high). The
   cheaper candidate per token is Sonnet 5.5 high; which is cheaper per photo needs its tokens recorded.
2. **Sourcing research with verbatim quotes** (ID marks, presence, names, juveniles): **Opus 5.5 medium**. Rests on:
   Anthropic (Opus 5.5 is "much less likely to state an incorrect figure or cite the wrong source" ([po][po]); on
   research, Opus 5.5 scored 2.4 points above Sonnet 5.5 for 1.5 times the cost and Fable 5.2 bought nothing for 2.9
   times; on Fable 5 research benchmarks `medium` "matched the default's accuracy at about 70% to 87% of its cost").
   The cost of an error is high here (rule C2: a quote that is not in its source is an invented clue). Check that stands
   in for a measurement: every quote searched for, word for word, in the fetched page by a script, on every claim of a
   batch or a sample of 30; a batch with a quote not found is redone at **Opus 5.5 high**. Candidate for large shards
   (hundreds of species): **Sonnet 5.5 high**, after the sample test on 50 species scored by that quote check.
3. **Learning-engine code** (the draw, progress, `core.js`, `Code.gs` sync, rules versions): **Opus 5.5 high**. Rests
   on: Anthropic (`high` for "work where verification matters or edge cases are likely" ([mc][mc]); Opus 5.5 at `low`
   lost 34 points on defect search) and judgement (a mistake moves players' progress, costly to undo). `xhigh` only
   where a `high` run measurably falls short; **Fable 5.2 high** where Opus 5.5 at higher effort still falls short (the
   overview's own rule). No measurement planned: the tests, the simulation tiers and Codex are the check.
4. **Design, architecture, security, independent reviews (rule W8)**: **Opus 5.5 high**, as today. Rests on: Anthropic
   (of Fable: "Hand it ambiguous problems: root-cause investigations, outage debugging, and architecture decisions are
   where the extra investigation and verification pay off" ([mc][mc]); Opus 5.5 is the overview's start) and
   judgement. **Fable 5.2 high** where Opus 5.5 high
   measurably falls short.
5. **UI prototypes** (Lab variants, Pierre judges by taps, rule W4): **Sonnet 5.5 high**. Rests on: Anthropic (Sonnet
   5.5 `high` ≈ Opus 5.5 `low` on SWE-bench Pro at about the same cost; Sonnet 5.5 `medium` 7-15 points lower on coding) and
   judgement (a prototype is easy to correct; Pierre's taps are the check). **Opus 5.5 medium** when the prototype
   defines a new game format or touches the shared engine.
6. **CI or test fixes**: **Sonnet 5.5 high**. Rests on: Anthropic (`high` for "fixing a bug in an existing codebase"
   ([mc][mc]); Sonnet 5.5 at `low` can skip verifying a change). A flake whose cause one run did not find is a
   root-cause investigation: **Opus 5.5 high**.
7. **Bringing PRs up to date** (merging `origin/main`, conflicts, the fast tier again): **Sonnet 5.5 medium**. Rests on:
   judgement (a well-specified task, checked by the fast tier, the train and Codex). **Opus 5.5 medium** when a conflict
   is in the engine, `core.js` or `Code.gs`. A merge without conflict is one command for the integrator, not an agent.
8. **Docs** (updating the docs that describe a change, rule W19): **Sonnet 5.5 medium**. Rests on: Anthropic (`medium`
   for well-specified work) and judgement (`tests/docs.test.js` and Codex check them). Docs Pierre reads as prose go
   with studies (row 10).
9. **Rule wording**: **Opus 5.5 high**. Rests on: judgement (AGENTS.md "Writing a rule down": keep Pierre's scope,
   never generalise nor harden; Rule 0 was misapplied until its wording was cut to one sentence). Pierre's OK is the
   check; no measurement.
10. **Studies** (read-only research and analysis): **Opus 5.5 medium**; **Opus 5.5 high** when the study decides the
    engine, a data format or the architecture. Rests on: Anthropic (the research figures of row 2; Opus 5.5 at its
    default `medium` "matched or beat Claude Opus 5 at `high` effort" on multistep coding ([po][po]), and the overview
    starts "most workloads" there) and judgement.
11. **Mechanical data conversion**: **a script** wherever the conversion can be written as a rule (written by **Sonnet
    5.5 medium**, run by name), so no model reads item by item; **Haiku 5.5 medium** only for item-by-item reading a
    script cannot do, after the sample test (50-100 items against Opus 5.5 high, threshold set before). Rests on:
    Anthropic (Haiku 5.5 for "checkable outputs"; at `low` it skips checks and stops early in long prompts) and our
    measurement (Haiku kept judged photos out by doubt). `low` only for short, simple items where the sample test
    passes at `low` too.

No row uses `xhigh` or `max` by default: Anthropic reserves them for measured gains (Opus 5.5 `xhigh`: 96.7% against
95.3% at `high`, for 2.6 times the cost per task, one run).

## 4. Proposal

### A replacement for INTEGRATOR's table

For docs/INTEGRATOR.md "Working with Pierre" (the integrator applies it; not changed here):

| Task | Model | Effort | Rests on |
| --- | --- | --- | --- |
| Photo judging (fish candidate pass; slugs and corals until measured) | Opus 5.5 | high | Measured (#1211): nothing lighter validated; gold set 2 tests Sonnet 5.5 high and Opus 5.5 medium; Haiku 5.5 out; 5% drift sample per batch |
| Learning engine, design, architecture, security, independent reviews | Opus 5.5 (Fable 5.2 where Opus at higher effort measurably falls short) | high | Anthropic + judgement: verification and edge cases; costly to undo |
| Rule wording | Opus 5.5 | high | Judgement: Pierre's scope kept; his OK is the check |
| Sourcing research with verbatim quotes | Opus 5.5 | medium (high for a batch where a quote is not found word for word in its source) | Anthropic: research, fewer wrong citations; quote check by script |
| Studies | Opus 5.5 | medium (high when it decides the engine, a data format or the architecture) | Anthropic: research figures |
| UI prototypes | Sonnet 5.5 (Opus 5.5 medium for a new format or the shared engine) | high | Anthropic: coding figures; Pierre's taps |
| CI or test fixes | Sonnet 5.5 (Opus 5.5 high for a flake one run did not explain) | high | Anthropic: bug fixes in existing code want `high` |
| Ordinary code (game formats, admin pages) | Sonnet 5.5 | high (medium for a small, fully specified change) | Anthropic: `medium` 7-15 points lower on coding |
| Bringing PRs up to date, docs | Sonnet 5.5 (Opus 5.5 medium for a conflict in the engine, `core.js`, `Code.gs`) | medium | Judgement: well specified, checked by tests and Codex |
| Mechanical data conversion | A script where a rule can be written; else Haiku 5.5 after the sample test | medium | Anthropic: Haiku for checkable outputs, skips checks at `low` |

Under the table, replacing "In doubt, the stronger one; a task that turns out harder is relaunched one step up, never
pushed through":

> Each launch names one level, never a range (in Claude Code a launch without one runs at the model's own default,
> `medium` for all four). Where no row fits: Opus 5.5 at medium, Anthropic's starting point. A task that failed for
> want of thoroughness (stopped early, skipped a check, missed a file) is relaunched one effort level up; one that had
> its context, tried, and was still wrong, one model up. `xhigh` and `max` only where a gain is measured.

The other places the integrator would update with it: the paragraph "Anthropic's guidance (checked 2026-11-18)" (its
date and sources: this study's); "The quota in practice", whose sentence "the intermediate model for ordinary code [...]
the strongest model for anything judged" would point to the table instead; and #1211's proposed fish-judging row, which
the first row above takes in.

### The AGENTS.md bullet

Pierre's words say the three tiers were the integrator's, so the always-loaded bullet need not name combinations: the
table does. Current text (AGENTS.md "Working mode"):

> **The right model and effort for each task**, at every agent launch (`model`, `effort`; table in INTEGRATOR):
> design, architecture, the learning engine, security and rule wording with consequences: Opus 5.5, high (Fable 5.2
> only where Opus at high effort measurably falls short); ordinary code (game formats, admin pages, fixes, docs):
> Sonnet 5.5, medium to high; mechanical, repetitive work: Haiku 5.5, low, after the sample test. In doubt, the
> stronger one; a task that turns out harder is relaunched one step up. Opus 5.5 is the integrator's model.
> `tools/agent_guard.py` refuses a launch without both.

Proposed (for Pierre's OK in the morning; same scope, no new obligation):

> **The right model and effort for each task**, at every agent launch (`model`, `effort`; the table in INTEGRATOR, one
> row per kind of task): the model is how capable, the effort how thorough, and any combination may fit. Where no row
> fits, Opus 5.5 at medium. A task that failed for want of thoroughness is relaunched one effort level up; one that had
> its context and was still wrong, one model up. A row changes on a measurement or on Anthropic's current guidance,
> cited. Opus 5.5 is the integrator's model. `tools/agent_guard.py` refuses a launch without both.

## 5. Limits

- Anthropic's figures come from coding and web-research benchmarks; none covers judging photographs of animals, and
  their order between configurations need not hold on our tasks.
- Our only measurement is one task, one run per configuration, 76 photos, against a reference that did not reproduce
  itself; gold set 1 re-scores 30 of the same photos and leans toward Opus 5.5 high.
- Prices are API list prices. This project runs on a Claude subscription, whose quota (rule W25) counts usage in its
  own way; the ratios between models are the useful part.
- The Claude Code defaults and the Agent tool's behaviour are those of the docs read on 2026-11-19 (Claude Code 2.1.327
  in this session); they change with releases.

## Sources (all read 2026-11-19)

- ov, Models overview: <https://platform.claude.com/docs/en/models/overview>
- pr, Pricing: <https://platform.claude.com/docs/en/about-claude/pricing>
- ef, Effort: <https://platform.claude.com/docs/en/build-with-claude/effort>
- co, Optimizing for cost and intelligence: <https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence>
- po, Prompting Claude Opus 5.5: <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5>
- ps, Prompting Claude Sonnet 5.5: <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5>
- ph, Prompting Claude Haiku 5.5: <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5>
- pf, Prompting Claude Fable 5.2: <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2>
- mc, Claude Code model configuration: <https://code.claude.com/docs/en/model-config>
- Claude Code subagents: <https://code.claude.com/docs/en/sub-agents> (the `model` and `effort` fields and their precedence)
- bl, Choosing a Claude model and effort level in Claude Code (Lydia Hallie, 2026-07-07):
  <https://www.claude.com/blog/claude-model-and-effort-level-in-claude-code>

[ov]: https://platform.claude.com/docs/en/models/overview
[pr]: https://platform.claude.com/docs/en/about-claude/pricing
[ef]: https://platform.claude.com/docs/en/build-with-claude/effort
[co]: https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence
[po]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5
[ps]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5
[ph]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5
[pf]: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2
[mc]: https://code.claude.com/docs/en/model-config
[bl]: https://www.claude.com/blog/claude-model-and-effort-level-in-claude-code

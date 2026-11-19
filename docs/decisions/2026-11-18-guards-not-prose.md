# Guards rather than prose: what players see, the Bash guard, the night report

Date: 2026-11-18 (Manila, evening). PR: #1117. Rules or docs touched: AGENTS.md
"Working mode" (a new bullet, and "No permission prompts for Pierre"), `.github/pull_request_template.md`,
`.claude/settings.json`, `tools/train.py`, `tools/brief.py`, `tools/night.py`, `tools/guard_bash.py`, `tools/README.md`,
`docs/spec/tools.md`.

## Context

A review of Pierre's 177 messages to the integrator from 2026-11-16 to 11-18 found the same frictions coming back after
rules had been written against them. Summaries built what he had not asked: the exam probes, slipped into the quiz when
he meant photos kept for the end, and a group setting ("Apart") he never asked for. Meanwhile he was asked
implementation details, such as a progress key. Agents kept writing files through heredocs and `sed -i`, so he got
permission prompts he could not judge (one agent waited two hours on one). And a night's work went unnoticed until he
asked what had been done.

## Decision

Pierre approved four changes on 2026-11-18. His words: "ok, lance les quatre". He also said: "Ma journée elle démarre
généralement à 5h du mat".

1. **What players will see comes from Pierre; how it is built is the agents'.** Each change players will see is stated
   in the PR with his words quoted and dated, or marked "integrator's call" when it is easy to correct. Otherwise he
   gets one question before the change is built. `tools/train.py` checks this on every PR from `BODY_FROM` on.
2. **Guards, not text, against code in the shell.** A PreToolUse hook (`tools/guard_bash.py`) refuses those commands at
   once and gives the way out. A read-only allowlist covers the commands that recur.
3. **An audit of the rules.** It sorts each rule into keep, replace by a guard, merge or delete, and its decisions went
   to Pierre: `docs/reviews/2026-11-18-rules-audit.md`, a study in this PR; none of its proposals is applied here. His
   answers, the same evening: points 1 to 5 and 8 ok; 6 and 7 dropped ("the docs describe a coherent model in our
   words; no new manual step for Pierre"); 9 parked. The study records them.
4. **A night report** (`tools/night.py`). The night is Rule 0's: 17:30 Manila to Pierre's first message after 04:00
   (he said on 2026-11-18: "Ma journée elle démarre généralement à 5h du mat"; on 2026-11-19 he set the end of
   Rule 0 as "La journée démarre à partir de mon premier message après 4h du mat", AGENTS.md Rule 0, #1191, which this
   record follows without changing Rule 0's text). The report covers 17:30 to 04:00, and the UserPromptSubmit hook says
   it is due at the first prompt of a Manila day between 04:00 and 17:30 (once a day per checkout).

## Consequences

- PRs opened before `BODY_FROM` keep the older template. Later ones need the two sections filled in, or the train
  refuses them with the reason.
- The hooks run main's copy of the guard, as they do for `tools/brief.py`. The guard only takes effect once this PR is
  on `main` and a session has fetched it.
- The integrator writes STATUS "## Night queue" at 17:30, in place of "Parked after hours". An item gets its PR
  number once started.

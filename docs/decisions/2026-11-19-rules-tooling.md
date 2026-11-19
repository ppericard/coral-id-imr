# Rules tooling: a search before any question, the answers ledger checked, the decisions index generated

Date: 2026-11-19. PR: #1199. Rules or docs touched: docs/spec/tools.md, docs/INTEGRATOR.md, docs/decisions/README.md,
tests/docs.test.js.

## Context

Answers Pierre had already given were asked again on 2026-11-19, and some approved decisions had not reached the docs
([the agentic practices study](../reviews/2026-11-19-agentic-practices-study.md), §3.6-§3.7, options b2, b3, e1, e2
and f1). The decisions index and the ledger are shared files every parallel PR appends to, so they conflict.

## Decision

- Pierre, 2026-11-19 08:53, Q425: B, apply what is decided, then a short core, topic files and guards, step by step:
  "ok". The answers ledger as checked data (a test that each answer reached its doc): "ok".
- Pierre, 2026-11-19 09:04, on the rules overhaul: «ça c'est une priorité. Parce qu'en attendant on continue de
  développer avec les anciennes règles».
- The search before any question is the integrator's proposal approved that morning; it is a tool and a habit in
  docs/INTEGRATOR.md, not a new rule.
- The integrator's calls (the study, §7, lists them as not asked): the union merge and the generated index.

## Consequences

- `tools/asked.py` searches the ledger, AGENTS.md, the rules and the records; its last line goes under a question.
- `tools/answers_check.py --check` runs in `tests/docs.test.js`: each ledger entry from 2026-11-19 names where it is
  applied or says "no doc change", or a later "Applied in #N:" entry names its Q or its time and first words; the entries
  written before the check are listed in its `KNOWN`, which only shrinks.
  A docs/ROADMAP.md or docs/reviews/README.md status that waits on an answered question fails; studies and STATUS
  are reported only.
- The decisions index is written by `tools/decisions_index.py --fix`, sorted by date then file name, so a new row lands
  at its topic's place; `--check` runs in the docs test. A conflict in it is resolved by merging `main` and `--fix`.
- No `merge=union` for the ledger: a local merge honours it (`tools/train.py` builds trains that way), but GitHub's own
  merge is not known to (a scratch repository showed a bare `git merge-tree` honours it only when it reads the
  attributes from a commit that holds them), and a train that builds clean locally would then be refused by GitHub
  halfway. It can come back once a probe on GitHub shows its merges honour it.

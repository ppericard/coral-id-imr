# The ROADMAP holds every decision: the backlog recount applied, the row details back in the rows, the check reads ROADMAP items

Date: 2026-11-19. PR: #1264. Rules or docs touched: ROADMAP.md; ANSWERS.md; reviews/2026-11-18-backlog-inventory.md;
reviews/2026-11-18-roadmap-row-details.md (removed); tools/answers_check.py; tests/docs.test.js (ROADMAP's marks).

## Context

The backlog inventory of 2026-11-18 (151 rows) listed many rows as waiting for Pierre or as ideas. Pierre had answered
or decided a good part of them the same day, in answers, comments and direct messages, but the answers reached STATUS
lines or the ledger with "ROADMAP (to update)", and the next agents read the inventory. Pierre, 2026-11-19 20:45: «Et
t'es sûr que sur les 151 […] j'ai pas donné moi des réponses justement pour les débloquer»; 20:48: «c'était pas que des
réponses à des questions, hein, c'était aussi des commentaires, c'était aussi des messages directs». And 20:34: «il ne
faut pas que les infos qui sont censées dans la roadmap soient ailleurs».

## Decision

- A recount against his words (every past STATUS, the ROADMAP's versions, the PR bodies, the ledger, the chat) found 35
  open rows answered or decided: 18 of the 28 "Waiting for Pierre", 11 "Idea only", 6 "Waiting". Each decision found
  goes into its ROADMAP row with his words and what is left; a done item gets no row (the ROADMAP's own rule).
- The inventory stays as a dated snapshot, superseded by the ROADMAP as the one list.
- The detail cut out of the ROADMAP's rows on 2026-11-18 goes back into each row; only pure built history stays in git
  (rule W19); the details file is retired and ROADMAP's size marks raised.
- `tools/answers_check.py` fails a ledger entry from 2026-11-19 21:00 on that names a ROADMAP item (a row title of three
  words or more, or "inventory <ID>") unless "Applied:" names the ROADMAP or a PR, never "(to update)". Earlier entries
  are not read: they were written before the check.

## Consequences

An answer that changes a ROADMAP item is not recorded until its row is changed. Left for Pierre: what option B of
inventory P2 said (never recorded), the `TYPED` tuning, the Trainer's set.

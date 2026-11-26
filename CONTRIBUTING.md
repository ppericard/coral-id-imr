# Contributing

How a change is made in this repository. It is written for a person and for an AI coding agent alike: both follow the
same steps. What the project is, how to run it and how to test it is in [README.md](README.md); the code is all rights
reserved ([LICENSE](LICENSE)).

## Read first

1. [AGENTS.md](AGENTS.md): the constitution. Rule 0 (Pierre's working hours), the merge contract (who merges, and
   when), the rules every task holds; the index of every rule is [docs/rules/README.md](docs/rules/README.md).
2. The file of [docs/rules/](docs/rules/README.md) that your change touches. AGENTS.md's "Read on demand" table says
   which. A rule has a stable ID (`C3`, `D4`, `W19`…), a *Why* and a *Source*; follow it over your own taste.
3. Read the issue, its recent comments and linked evidence. For a handoff, follow your role's path in AGENTS.md.
4. [docs/GLOSSARY.md](docs/GLOSSARY.md), [docs/DATA.md](docs/DATA.md) and [tools/README.md](tools/README.md) when a
   word, a data file or a script is unfamiliar.

## Make a change

1. **Start from a fresh `origin/main`**, in a worktree of your own, on a branch that holds one change. Never start from
   another PR's branch (rule W22).
2. **Write a test with the logic you change** (rule W12). Unit tests are `tests/*.test.js`, run with
   `node tests/run.js`; the Playwright smokes are `tests/*.smoke.js`. The commands are in README "Test".
3. **Before each push, run the fast tier** (rule W14): Prettier on the JS and CSS you changed (rule W13),
   `node --check`, `python3 tools/check_versions.py`, `python3 tools/datajson.py --check`,
   `python3 tools/sync_core.py --check`, `node tests/run.js` (without the slow statistical tests, which carry
   `// @slow: <why>` after their first line; `node tests/run.js --all` runs them, as CI and the merge train do), and the
   one smoke part your change touches. A heavy run takes a machine slot (rule W24). A test you add that takes more than
   about 10 s of CPU alone gets the `// @slow` line.
4. **Leave the generated and the owned things alone**:
   - never edit `?v=N`, `LAB_V` or the service worker's `V`: the deploy stamps them (rule W15);
   - write `data.json` only with `tools/datajson.py` (rule W16);
   - never change `curation.json` (rule A1): only the admin's Publish writes it;
   - a change to `tools/sync/Code.gs` or `core.js` adds one file under `tools/sync/changes/` and never touches
     `VERSION` (rules D3 to D5);
   - tests never reach the real sheet (rule D1).
5. **Look at it** if players see it: light and dark, phone and desktop (rule W17).
6. **Keep real names out**: no real player or staff name anywhere in the repository (rule D2). Everything produced is in
   English (rule W1).
7. **Update the docs in the same PR** (rule W19): the doc that describes what you changed, the README if a newcomer
   would notice, Linear (team REE) for a problem or idea discussed and not solved. When the PR carries out a decision,
   add a [decision record](docs/decisions/README.md). History stays in git and the PRs, never in the docs.
8. **Open a PR** from `origin/main` with the [template](.github/pull_request_template.md): what and why, where each
   choice was decided, the choices that still need Pierre, what changes for players, the tests, the sheet script, the
   docs. When bringing a PR up to date, merge `origin/main`. Never rebase a pushed branch or force-push (rule W18).

## Review and merge

- After each push, comment `@codex review`. Fix each finding with a test that fails first, or answer with the reason it
  does not apply, then resolve the thread. Never re-run a failed job to get green; find why it failed (rule W23). Codex
  findings are fixed while they are new and small; when they keep coming back on the same part, that part leaves the PR
  and restarts from a short design note (rule W27).
- The **integrator** merges; a subagent never does. A PR merges only when the merge contract holds
  (AGENTS.md "Working mode"): checks green on its head, every finding answered, every choice either decided with Pierre
  or small and easy to correct.
- Every PR merges through a green **merge train** (`tools/train.py`, rule W26) as a squash merge titled `… (#N)`.
- A choice that is costly to undo (a data format, a migration, content IMR owns, anything about money, accounts or
  access) waits for Pierre; put it under "Choices I made" in the PR.

## Contributing from outside the integrator session

For a person, Codex, ChatGPT or any agent that reads GitHub, Drive and Linear but not the integrator's chat. Everything
you need is in those three places; if it is not, say so on the issue.

1. Read [AGENTS.md](AGENTS.md), then [the agent brief](tools/agent-brief.md): the lines every launched agent is told.
2. Find who integrates now in [docs/STATUS.md](docs/STATUS.md) "Now", with what is in flight and any area another team
   is working in. Only the integrator merges.
3. Find work from [Project Home](https://linear.app/reef-id/document/project-home-reef-id-d5a0fef1ecbc) (the Next view),
   or take the issue you were given. Read its description and every comment, and reconcile them with the code and the
   open PRs.
4. Claim it with a Linear comment "Executor: <team>, branch <prefix>/<name>", using your team's branch prefix. Before
   building, check the open PRs and the other teams' branches for the same sensitive files (rule W27).
5. Build as "Make a change" above. Open the PR ready, not draft, with "Part of REE-N" when it is partial, and leave the
   draft and ready toggling to the queue (rule W6).
6. Hand back as the brief's report says, in a signed Linear comment: the PR, the figures with links, the limits, what
   remains. Never merge and never write to the sheet.
7. The integrator reviews and merges, then answers on the issue. Notes for you arrive there as comments addressed to
   your team; nobody asks Pierre to relay them.

## Decisions

A decision is written down where it is taken: a short record in [docs/decisions/](docs/decisions/README.md) (context,
the decision with Pierre's words and date, consequences). The rule that came from it keeps a *Source* line. Do not
retell a decision in another document; link it.

## Reporting problems

- A wrong credit, or a photo that should be removed: use the "Rights holder" issue form.
- A bug or an idea: open an issue; the integrator tracks the problems and ideas discussed and not solved in Linear
  (team REE).
- A security problem: report it privately through GitHub's "Report a vulnerability" on the repository's Security tab,
  not in a public issue. [docs/SECURITY.md](docs/SECURITY.md) says what is exposed and what protects it.

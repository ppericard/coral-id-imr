# Rules not followed: the joint reading (review note, 2026-11-25)

**Status: review note, docs only.** Nothing in AGENTS.md, the rules, INTEGRATOR.md, `tools/checkin.md` or Linear is
changed here. The [decision record](../decisions/2026-11-23-rule-not-followed-issue.md) says the "Rule not followed"
issues are read together for common causes, and a change of rule is weighed from that reading. This is that reading.

**What was checked (rule W11).** All 13 issues with the label (Done and archived included), their descriptions and
comments, read on 2026-11-25 between 20:20 and 21:00 Manila. The PRs' state on GitHub. AGENTS.md, INTEGRATOR.md,
`docs/rules/`, ANSWERS.md, `tools/checkin.md` and the hooks in `.claude/settings.json` on main at 313d26e. The
integrator's chat was not readable. Where a state depends on the chat, the table says so. A cause marked *guess* is
this note's reading, not a finding.

## 1. The issues

| Issue | Rule not followed | What happened | Repair on main | Still open |
| --- | --- | --- | --- | --- |
| REE-244 | INTEGRATOR "Linear": drain decided work | Night check-ins carried the integrator's own short list, later the Todo column only; the Backlog was never read | #1480 (fixed check-in text), #1562 (every open issue is done unless it has a reason; the sweep) | Its completion test: one night observed |
| REE-251 | Search before opening an issue or stating what exists | A duplicate issue opened; a decided placement test said not to exist | #1507 (`tools/issue_guard.py`) | Nothing. The answered question still heads the description |
| REE-258 | INTEGRATOR "Linear": questions live in the Decisions view | Questions kept in STATUS, notes and PR bodies dropped out after a rewrite | Inventory of 2026-11-23 (labels in Linear); #1517 (STATUS points to Linear) | Nothing checks it |
| REE-266 | INTEGRATOR model and effort table | A study launched at effort `max` where the table says `high` | Relaunched at `high` (comment); the description still says "kept running" | `agent_guard.py` checks that an effort is set, not which |
| REE-267 | S1 | The ease weight changed for the fish only; the sea slugs kept 0.5 | #1519, #1524, #1532 | Nothing |
| REE-268 | AGENTS "The rules": the scope of his words | A correction widened into a ban on per-subject values; his objection left unanswered | #1519 (a declared per-subject value stays possible); ANSWERS 2026-11-24 06:33-06:38 | Whether the reply to Pierre was sent: not in Linear or the repo |
| REE-269 | AGENTS "Working with Pierre": no re-asking | The settled Q455 value offered again as a choice | #1519; its Decisions hold his 13:50 OK on the simulation's cost | Nothing |
| REE-270 | S1; a rule (P4) cited for more than it says | Sea slug intake took one photo per observation | #1525 (every photo, as the fish), #1534 | Nothing here; judging the extras is REE-252's |
| REE-271 | W22, W24 | Study measures ran without `SMOKE_SLOTS=1`; the brief left it out | None needed (no harm known) | Nothing |
| REE-273 | A change of substance needs his OK; digest his words | A guiding aim rewritten with his chat answer verbatim and queued | #1500, merged with the digested sentence he approved on 2026-11-24 14:06 (ANSWERS) | Nothing |
| REE-274 (Done) | S1 | The speed target and budget set on the fish only | #1540, #1572, #1576, #1583, #1591 | Nothing |
| REE-276 | C7, W22 | One iNaturalist `curl` outside `tools/inat.py`; worktrees outside `.claude/worktrees/`; a refused `sed -i` | None needed (no harm known) | Nothing. One more instance: this note's agent first made its worktree outside `.claude/worktrees/`, moved before any work |
| REE-277 | AGENTS "Start here": the durable stores | Gold set 2 and its key lived only in a scratchpad and were lost | #1543 (a review committed before his answers), #1550 (the page kept) | The key search is REE-282. Whether to rebuild the set has no issue |

## 2. Common causes

- **A. A choice kept to the subject of the example.** REE-267, REE-270, REE-274. The first issue, measure or title
  named one subject ("Fish ease prior"), the brief copied it, and "decided on the fish" was read as "for the fish only".
- **B. Words or rules read wider or narrower than they go.** Wider: REE-266 (a request for depth read as `max`),
  REE-268 (a default read as a ban), REE-270 (P4). Narrower: REE-244 ("all decided work" became "the Todo column").
  Copied without digesting: REE-273.
- **C. A rule held in what was read, not in what acts.** REE-244 (check-ins wrote their own list), REE-251 (the search
  habit tied to questions only), REE-258 (nothing checks the Decisions view), REE-271 (the brief left the slot out),
  REE-276 (the brief carried the rule and it was still missed). Where a guard existed it held: the Bash guard refused
  the `sed -i` (REE-276).
- **D. Speed in a live exchange.** REE-251 (claim and issue within minutes), REE-269 (asked before reading #1519's
  Decisions), REE-273 (answer to brief in two minutes). *Guess:* keeping the queue moving wins over the search.
- **E. A compaction just before the lapse.** REE-244, REE-251, REE-268. REE-230 owns this mechanism.
- **F. Work or questions kept where they are lost.** REE-258 (STATUS, notes), REE-277 (a scratchpad), REE-244 (a list
  inside a prompt), REE-276's comment (agents overwrite each other's scratch files).

## 3. What is addressed, and proposals

Proposals marked "needs Pierre's OK" add a requirement or a new hook (#1507 waited for his OK). Each needs a home in
Linear labelled Decision for Pierre before it is asked (REE-258); this note is not that home.

- **A. Partly.** S1 says one engine and declared exceptions. His reading of 2026-11-24 06:35 (a decision found on one
  subject holds for every subject by default; a justified, declared per-subject value is allowed) is in ANSWERS and
  REE-267's comment, not in S1's text. **A1, integrator's call** (applies an answer already given): add that reading,
  digested, to S1. **A2, integrator's call:** "Writing a rule" also guides issue titles and briefs: name the object
  (the ease weight), not the subject of the first example.
- **B. Written, still missed.** AGENTS "The rules" and INTEGRATOR "Habits" already say it. One tension may feed
  REE-273 (*guess*): "Habits" says a rule credited to Pierre quotes his words, while "Writing a rule" wants the rule in
  our words and his words in the PR and the *Source*. **B1, needs Pierre's OK:** the habit points to "Writing a rule":
  his words go to the ledger and the PR, the text carries a digested reading he approves.
- **C. Addressed for check-ins (#1480, #1562) and new issues (#1507).** #1480's two hook proposals (a reminder after
  compaction, `--checkin` in quiet hours) are not built. "Writing a rule" says a friction first gets a guard.
  **C1, needs Pierre's OK:** the Bash guard refuses `git worktree add` outside `.claude/worktrees/` and a direct
  `curl` to iNaturalist (W22, C7). **C2, needs Pierre's OK:** `agent_guard.py` asks for a reason with effort `max`.
  **C3, needs Pierre's OK:** `tests/slot.js` defaults to one slot instead of one per two cores (W22's `SMOKE_SLOTS=1`).
  **C4, needs Pierre's OK:** a check-in step that gives any question found outside Linear its issue (REE-258).
- **D. No proposal.** `tools/asked.py` already covers the search before a question. Whether it ran before REE-269's
  question is not recorded.
- **E. Left to REE-230**, with #1480's unbuilt hook proposals.
- **F. Partly.** REE-258's inventory, #1543 and #1550, and W27's named scratch files. **F1, integrator's call**
  (applies AGENTS "Start here"): INTEGRATOR's line "The integrator's chat: never the only copy" also names the
  scratchpad. **F2:** the question of rebuilding gold set 2 gets a Linear home (REE-8 or its own issue).

## 4. Which issues can close

- **Repair on main, only this reading was missing:** REE-251, REE-258, REE-266, REE-267, REE-269, REE-270, REE-271,
  REE-273, REE-276. REE-274 is already Done. REE-269 and REE-273 need no new word from Pierre: his OKs are in the
  ledger and the PRs.
- **Not yet:** REE-244 (one night observed); REE-268 (the integrator confirms from the chat that the reply was sent;
  no word from Pierre is needed for the repair); REE-277 (once F2 gives the rebuild question a home).

# Check-in

What every `send_later` check-in of the integrator does, in order (REE-244). The check-in's prompt is the one line
"Check-in: run `python3 tools/brief.py --checkin` and follow it", never a list of items: the source of work is
Linear, so a list written into a prompt runs out while decided work remains. `--checkin` prints this text under the
live signals.

1. **Agents.** Count the running agents and their state. Resume or finish one that was cut off
   ([Merge mechanics](../docs/INTEGRATOR.md#the-merge-mechanics-what-bites): a crowded machine).
2. **Queue.** Read the queue log (`~/.cache/reefid-queue/nightq.log`, its last line above). Merge only through
   `tools/queue/nightq.sh` ([tools/queue](queue/README.md)); start several waves with `tools/queue/fifoq.sh`, which
   runs them one at a time through `nightq.sh`. Restart whatever stopped.
3. **Work comes from Linear, never from this prompt.** Every open issue is to be done unless it carries one of the
   five reasons of [INTEGRATOR "Linear"](../docs/INTEGRATOR.md#linear). List every open issue, whatever its column,
   and give an agent to each one that has no valid reason and is not already in progress, High first, as far as the
   machine slots allow (rule W24). Sensitive files go one PR at a time (rule W27); a held lane is no reason to idle:
   launch the other lanes in parallel. When a PR on a sensitive file merges, look at once for the issues that waited
   on that lane. A list of your own that is exhausted is not an empty queue. The brief's other signals are work too:
   branches with work and no PR (rule W6), docs past their size mark, outdated stack items. A judging or re-judging
   pass over more than 100 photos waits for Pierre's explicit OK ([rule P7](../docs/rules/photos.md#p7)).
4. **Sweep, about every 90 minutes,** from its own `send_later` ("Sweep: follow step 4 of tools/checkin.md"), day
   and night. One Sonnet agent re-checks every open issue that carries a reason, against what merged, what closed and
   what Pierre answered since the last sweep. A label is a claim, not a reason: the sweep checks that the condition
   behind it still holds today: a blocked-by relation to an open issue or PR, a Scheduled date not passed, or a Waits
   on label whose stated condition is still unmet (Data: the gate measured again today; Pierre (action) and External:
   the named action or event not done). A free-text condition is turned into one of these, or the issue moves to
   Todo. It moves to Todo each issue whose reason no longer holds, with one line naming
   what unblocked it, and reports the newly ready issues. It launches nothing, merges nothing and settles no open question. The integrator then launches the ready
   issues.
5. **Upkeep.** Linear states for what moved. STATUS is refreshed with each sweep, right after its result, so both
   keep the same rhythm of about 90 minutes ([Habits](../docs/INTEGRATOR.md#habits)).
6. **Recovery incidents.** If recovery exposed a new failure, record the evidence on its current open owning issue.
   A routine compaction needs no entry.
7. **Rule 0.** Read the time line above. In quiet hours ask Pierre nothing; questions wait in Linear's Decisions for Pierre
   view. Work goes on.
8. **Re-arm.** End the turn with the next `send_later` carrying the same one line.

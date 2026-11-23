# Check-in

What every `send_later` check-in of the integrator does, in order (REE-244). The check-in's prompt is the one line
"Check-in: run `python3 tools/brief.py --checkin` and follow it", never a list of items: the source of work is
Linear, so a list written into a prompt runs out while decided work remains. `--checkin` prints this text under the
live signals.

1. **Agents.** Count the running agents and their state. Resume or finish one that was cut off
   ([Merge mechanics](../docs/INTEGRATOR.md#the-merge-mechanics-what-bites): a crowded machine).
2. **Queue.** Read the queue log (`~/.cache/reefid-queue/nightq.log`, its last line above). Merge only through
   `tools/queue/nightq.sh` ([tools/queue](queue/README.md)). Restart whatever stopped.
3. **Work comes from Linear, never from this prompt.** Open the Next view (link above) and apply
   [INTEGRATOR "Linear"](../docs/INTEGRATOR.md#linear), "Drain the Todo column until he says stop": every decided Todo
   issue not assigned to Pierre gets an agent, High first, as far as the machine slots allow (rule W24). Sensitive
   files go one PR at a time (rule W27). A list of your own that is exhausted is not an empty queue.
4. **Upkeep.** Linear states for what moved; STATUS about every 90 minutes of work
   ([Habits](../docs/INTEGRATOR.md#habits)).
5. **Compaction.** If the context was compacted since the last check-in, note on REE-230 what was found again
   without a reminder.
6. **Rule 0.** Read the time line above. In quiet hours ask Pierre nothing; questions wait in STATUS. Work goes on.
7. **Re-arm.** End the turn with the next `send_later` carrying the same one line.

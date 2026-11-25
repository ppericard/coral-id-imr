# Scheduled tasks: the mechanism that keeps a task out of the lists until its date or trigger

Date: 2026-11-25. Linear: REE-218 (Pierre asked 2026-11-22 06:06, [ANSWERS](../ANSWERS.md)). Docs only: it changes no
rule. The wording it proposes for [INTEGRATOR "Linear"](../INTEGRATOR.md#linear) is governance text and waits for
Pierre's OK. Context since the question was asked: Linear is organised for the agents; Pierre does not read it; every
open issue is to be done unless it carries one of the five reasons; the unblock sweep (several passes a day)
re-checks the reasons and moves unblocked issues to Todo; "Scheduled" is one of the reasons.

## Recommendation, in three lines

1. Keep the **Scheduled label with the Backlog status**, and make the issue's **due date field the date it comes
   back** (not the deadline). The deadline, if any, goes in the description.
2. The **sweep does the check**: a Backlog issue labelled Scheduled whose due date is today or earlier goes to Todo,
   with one comment. It reads the structured `dueDate` field, never free text.
3. A **named trigger is not Scheduled**: it becomes a blocked-by relation to the issue or PR that is the trigger
   (reason 2), or Parked / Idea when the trigger is Pierre's wish (reasons 3, 4). Free text such as "Comes back:
   when ..." goes away.

## What Linear offers (public documentation, read 2026-11-25)

| Feature | What the documentation says | Fit |
| --- | --- | --- |
| Due date | Filters: Overdue, relative dates "from now", a custom date or timeframe, no due date; sort by due date; an optional notification when the date is near or past ([Due dates](https://linear.app/docs/due-dates)). | A structured field the API returns: the sweep can compare it with today. It hides nothing by itself. |
| Remind me | A reminder on an issue is a notification to the Inbox at the chosen time; "reminders do not hide an issue" ([Inbox](https://linear.app/docs/inbox)). | Wakes a person, hides nothing. Pierre does not read Linear. Set in the UI only (the MCP tools have no reminder). |
| Snooze | Hides a notification, or a Triage issue "from the triage queue" until a time or new activity ([Inbox](https://linear.app/docs/inbox), [Triage](https://linear.app/docs/triage)). | Not for backlog issues. Triage snooze needs the issue to sit in Triage, which the team does not use for its work. |
| Cycles | Repeating team periods; an issue in a cycle is moved from Backlog to active ([Cycles](https://linear.app/docs/use-cycles), [Team pages](https://linear.app/docs/default-team-pages)). | The opposite effect: planning an issue into a future cycle makes it active. A cycle is a date range, not a hold. |
| Custom views and filters | AND/OR advanced filters; relative date filters; a view hides what its filter excludes ([Filters](https://linear.app/docs/filters)). The MCP tools list views and read them (`customView`) but cannot create or edit them. | Hides from one view only, and only if every agent lists through that view. The agents list by status and label. The view's filter is set once in the UI, by hand. |
| Recurring issues | A new issue is created when the previous one's due date passes ([Issues](https://linear.app/docs/creating-issues)). Created in the UI. | Good for the monthly taxonomy refresh (REE-107) and the yearly token, if wanted; not for a one-off date. |
| Triage rules, auto-close | Rules act when an issue enters Triage ([Triage](https://linear.app/docs/triage)); the automations page covers auto-close and auto-archive ([Teams](https://linear.app/docs/teams)). | Nothing brings an issue back from Backlog on a date. |
| Loops (Linear Agent) | Scheduled or event-triggered agent runs, hourly to yearly; they use the workspace's AI credits ([Loops](https://linear.app/docs/loops)). | Could move issues on a date, but spends credits and duplicates what the sweep already does for free. |

No native feature both hides a backlog issue until a date and returns it by itself. The documentation names no
"start date" or "snooze until" for issues (checked 2026-11-25; Linear's search over its documentation returned
nothing more).

## The options against the four tests

| | Sweep sees it without free text | Stays out of the agents' lists until due | Comes back by itself | Cost |
| --- | --- | --- | --- | --- |
| A. Linear native only (due date, Remind me, a view hiding dated issues) | Yes for `dueDate`; a reminder is invisible to the API | Only in the one hand-built view; not in `list_issues` by status | A reminder reaches Pierre's Inbox, not an agent | A view to maintain by hand; Pierre's attention (against his 2026-11-22 request) |
| B. Today: Scheduled label, Backlog, due date = the deadline, "Comes back" line in the description | No: the return date is in free text (REE-75: due 2027-01-15, back 2027-01-01; REE-73 and REE-247: a trigger sentence) | Yes (Backlog) | The integrator remembers at session start | A fragile reading of prose; the two-week lead is arithmetic on a field with another meaning |
| C. Sweep does the check (recommended): label + Backlog + `dueDate` = the day it comes back | Yes: label and date are fields | Yes (Backlog) | Yes: the sweep's next pass after the date moves it to Todo and comments | None beyond the sweep's existing pass; one filter on an existing call |

Option C is B with one meaning fixed and the check handed to the sweep. A cycle, a view or a loop adds a second
system to keep in step with it.

## The exact Linear setup

- The team label **Scheduled** stays, in the "reasons" group as today. No new label, status, view, cycle or loop.
- A Scheduled issue: status **Backlog**, label **Scheduled**, **due date = the day it returns to Todo**. Nothing in
  the description names the return. A real deadline is written in the description's Current understanding.
- The sweep's check, each pass: `list_issues` for team Reef ID, state Backlog, label Scheduled, fields `dueDate`;
  every issue with `dueDate` on or before today (Manila) goes to Todo, with the sweep comment ("Scheduled date
  reached: <date>"), and the integrator tells Pierre once if it concerns him. A Scheduled issue without a due date is
  a rule not followed: the sweep gives it one or moves it to a better reason.
- The sweep's day count is Manila time; a due date is a date, not a time, so the issue returns on the morning pass.
- Triggers are never dated. They become a blocked-by relation (reason 2, checkable) to the issue or PR that is the
  trigger, which the sweep already re-checks, or Parked or Idea when the trigger is Pierre's wish.

## Proposed wording for INTEGRATOR "Linear"

Replace the **Scheduled** sentence in the Labels bullet (from "**Scheduled** (Pierre, 2026-11-22; ..." to "...or the
trigger happens.") with:

> **Scheduled** (Pierre, 2026-11-22; [decision](decisions/2026-11-22-scheduled-tasks.md); mechanism
> [2026-11-25](reviews/2026-11-25-scheduled-tasks-mechanism.md)): a task that can only be done from a date goes to
> Backlog with this label and its **due date set to the day it comes back** (a real deadline goes in the
> description). It stays out of every list, report, STATUS and question to Pierre until then. The unblock sweep reads
> the due date, never the description, and moves the issue to Todo on that day, with a comment; the integrator tells
> Pierre once when it concerns him. A named trigger is not Scheduled: it is a blocked-by relation to the issue or PR
> that is the trigger (reason 2), or Parked or Idea when the trigger is Pierre's wish. A Scheduled issue without a
> due date is a rule not followed.

and in the reason 2 line, replace "or a Scheduled date. A free-text "after X" is not one;" with "or a Scheduled date
(the due date field). A free-text "after X", "from X" or "when X" is not one;". Replace in the decision file's
Decision paragraph "brings it back to Todo ... two weeks before its due date" with a one-line amendment dated
2026-11-25: the return date is the due date and the sweep brings it back (an integrator's call, easy to correct; the
two-week lead is dropped because the due date now is the return date).

## Issues the mechanism would convert (checked in Linear 2026-11-25, team Reef ID, Backlog and Todo)

Date written as free text, to become Scheduled with a due date:

| Issue | Today | Becomes |
| --- | --- | --- |
| REE-107 Taxonomy reference: the monthly refresh | Label Waiting; "Next due about 2026-12-18" | Scheduled, due 2026-12-18; a recurring Linear issue (monthly) is an option to propose to Pierre, not applied |
| REE-117 Admin sign-out: the draft clean-up | Label Waiting; "a date he set, from 2026-12-18" (Q334) | Scheduled, due 2026-12-18 |
| REE-75 Renew the admin GitHub token | Scheduled; due 2027-01-15, "Comes back 2027-01-01" in the description | due date 2027-01-01; deadline 2027-01-15 in the description |

Trigger as free text (not dates; the mechanism says what each is instead):

| Issue | Today | Becomes |
| --- | --- | --- |
| REE-247 About: a credits page once the IMR lecture photos are out | Scheduled, no due date | blocked-by REE-93 (IMR lecture photos: second pass), drop the label |
| REE-73 Grant yourself the trainer role to host a live game | Scheduled, "back when he wants to host one" | Parked (reason 4), or Idea |
| REE-80, 83, 86, 87, 88, 94, 95, 120 | Waiting; "once there are more players", "once the confusion data shows them" | not dates; a count of players or answers is a measurable trigger the sweep cannot read as a field. Keep Waiting, or give each a blocked-by on one "data threshold" issue (the integrator's call). |

Waiting is not among the five reasons; those rows, and REE-107 and REE-117 above, hold their place in Backlog today
only because of it. The label group is the integrator's to retire or keep; this note does not decide that.

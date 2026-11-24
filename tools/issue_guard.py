#!/usr/bin/env python3
"""The issue guard: a PreToolUse hook on the Linear MCP tool that saves issues (.claude/settings.json) that refuses to
open a new issue whose description does not say what was searched first (docs/INTEGRATOR.md "Questions and
corrections"; REE-251: an issue opened without a search duplicated one already there).

A call creates an issue when its tool_input has no `id`; an update (with `id`) passes. A new issue passes when its
`description` holds a line starting `Searched:` (any case; a list marker or bold around the word allowed) that names
what was searched, then a dash, then what was found, e.g.
`Searched: Linear "expert" (incl. Backlog, Done), ANSWERS.md, ROADMAP, Drive — REE-191, REE-112 found`.
The same shape as the last line of `tools/asked.py` before a question to Pierre.

The tool is `mcp__<server>__save_issue` where the server's name holds "linear" (`mcp__Linear__save_issue` here; a
claude.ai connector or a plugin names its server differently). The hook's matcher selects these names; the script
checks the name again and leaves every other tool alone.

  python3 tools/issue_guard.py --check '{"team": "REE", "title": "x", "description": "y"}'   the reason (exit 1), or nothing (exit 0)

The hook runs main's reviewed copy (`git show origin/main:tools/issue_guard.py` given with `python3 -I -c`, the JSON on
stdin; fetched where the ref is missing, the call refused if it cannot be: tests/hooks.test.js), so this file uses the
standard library only. Inside the script, any error lets the call through: it never blocks work by failing.
"""

import json
import re
import sys

TOOL = re.compile(r'^mcp__[\w-]*linear[\w-]*__save_issue$', re.IGNORECASE)
# `Searched:` at the start of a line (after spaces, a list or quote marker, or bold/italic marks), then what was
# searched, a dash or an arrow, and what was found.
SEARCHED = re.compile(r'^[ \t]*(?:[-*+>][ \t]*)?[*_]{0,2}searched:[*_]{0,2}[ \t]*(?P<rest>.*)$',
                      re.IGNORECASE | re.MULTILINE)
SPLIT = re.compile(r'\s*[—–→]\s*|\s(?:-{1,2}|->)\s')  # a hyphen inside a word (REE-191) is not one

WHY = ('Refused by the project\'s issue guard (tools/issue_guard.py; docs/INTEGRATOR.md "Questions and corrections"): '
       '%s. Before opening a Linear issue, search for the topic: Linear issues including Backlog, Done and Duplicate '
       '(list_issues with a query, every page); docs/ANSWERS.md (python3 tools/asked.py <terms>); docs/ROADMAP.md; '
       'docs/reviews/; and the Drive Reef_ID folder when the topic is a study. When an existing issue covers the '
       'topic, fold this into it (a comment, or an update with its `id`) instead of opening a new one. Otherwise add '
       'one line to the description saying what you searched, a dash, then what you found, e.g. '
       '`Searched: Linear "expert" (incl. Backlog, Done), ANSWERS.md, ROADMAP, Drive — REE-191, REE-112 found` '
       '(or `— nothing found`), and save again.')


def is_issue_tool(name):
    return isinstance(name, str) and bool(TOOL.match(name))


def reason(ti):
    """The refusal for a save_issue tool_input, or None when the call may go."""
    if not isinstance(ti, dict):
        return None
    if ti.get('id'):
        return None  # an update
    desc = ti.get('description')
    if not isinstance(desc, str) or not desc.strip():
        return WHY % 'this new issue has no description, so no `Searched:` line'
    lines = [m.group('rest').strip() for m in SEARCHED.finditer(desc)]
    if not lines:
        return WHY % 'this new issue\'s description has no line starting `Searched:`'
    for rest in lines:
        parts = SPLIT.split(rest, maxsplit=1)
        if len(parts) == 2 and parts[0].strip() and parts[1].strip():
            return None
    return WHY % ('its `Searched:` line does not say both what was searched and, after a dash, what was found '
                  '(it reads: `Searched: %s`)' % lines[0][:120])


def main(argv):
    if len(argv) == 2 and argv[0] == '--check':
        why = reason(json.loads(argv[1]))
        if why:
            print(why)
        return 1 if why else 0
    if argv and argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    try:
        ev = json.loads(sys.stdin.read())
        if not is_issue_tool(ev.get('tool_name')):
            return 0
        why = reason(ev.get('tool_input'))
    except Exception:  # never block work because the guard failed
        return 0
    if why:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny',
                                                 'permissionDecisionReason': why}}))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

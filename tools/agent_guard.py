#!/usr/bin/env python3
"""The agent-launch guard: a PreToolUse hook on the Agent tool (.claude/settings.json) that refuses a launch setting no
`model` or no `effort`, and logs every launch. The integrator applies the table in docs/INTEGRATOR.md "Working with
Pierre" at every launch (the rules core proposal's guard G5, with a log).

A launch with `subagent_type: "fork"` passes: a fork always runs on its parent's model and effort, both parameters are
ignored there. Claude Code 2.1.327's Agent tool takes both as optional parameters; the refusal names the keys the
launch carried, so a tool_input without `effort` shows at once.

The log is <git common dir>/claude-agent-launches.jsonl (one file for the checkout and every worktree, never committed,
append-only; AGENT_LOG names another file, for tests): the UTC time, the session, the launching agent (its agent_id,
none for the main agent) and its own effort, tool_input's key names, model, effort, subagent_type, the description (the
prompt is never logged), and whether it was allowed. `tools/brief.py` prints today's distribution in one line.

  python3 tools/agent_guard.py --check '{"description": "x", "prompt": "y"}'   the reason (exit 1), or nothing (exit 0)
  python3 tools/agent_guard.py --report [YYYY-MM-DD]   that Manila day's launches (today by default)

The hook runs main's reviewed copy (`git show origin/main:tools/agent_guard.py` given with `python3 -I -c`, the JSON on
stdin; fetched where the ref is missing, every launch refused if it cannot be: tests/hooks.test.js), so this file uses
the standard library only. Inside the script, any error lets the launch through: it never blocks work by failing.
"""

import json
import os
import subprocess
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone

MANILA = timezone(timedelta(hours=8))  # Asia/Manila, UTC+8 all year
LOG_NAME = 'claude-agent-launches.jsonl'
TOOLS = ('Agent', 'Task')  # Task: the Agent tool's earlier name

WHY = ('Refused by the project\'s agent-launch guard (tools/agent_guard.py): this launch sets no %s. '
       'Set both `model` and `effort` using the table in docs/INTEGRATOR.md "Working with Pierre", then launch again. '
       'Keys this launch carried: %s.')


def reason(ti):
    """The refusal for a tool_input, or None when the launch may go."""
    if not isinstance(ti, dict):
        return None
    if ti.get('subagent_type') == 'fork':
        return None
    missing = [k for k in ('model', 'effort') if not ti.get(k)]
    if not missing:
        return None
    return WHY % (' nor '.join('`%s`' % k for k in missing), ', '.join(sorted(ti)) or 'none')


def log_path(cwd):
    if os.environ.get('AGENT_LOG'):
        return os.environ['AGENT_LOG']
    r = subprocess.run(['git', '-C', cwd, 'rev-parse', '--git-common-dir'], capture_output=True, text=True, timeout=3)
    if r.returncode != 0:
        return None
    return os.path.join(os.path.abspath(os.path.join(cwd, r.stdout.strip())), LOG_NAME)


def entry(ev, why):
    ti = ev.get('tool_input') or {}
    eff = ev.get('effort')
    r = {'t': datetime.now(timezone.utc).replace(microsecond=0).isoformat(), 'sid': ev.get('session_id'),
         'by': ev.get('agent_id'), 'by_effort': eff.get('level') if isinstance(eff, dict) else eff,
         'keys': sorted(ti), 'model': ti.get('model'), 'effort': ti.get('effort'), 'type': ti.get('subagent_type'),
         'desc': (ti.get('description') or '')[:120], 'ok': why is None}
    return {k: v for k, v in r.items() if v not in (None, '')}


def read_log(path):
    out = []
    try:
        with open(path, encoding='utf-8') as f:
            for line in f:
                try:
                    out.append(json.loads(line))
                except ValueError:
                    pass
    except OSError:
        pass
    return out


def day_of(r):
    try:
        return datetime.fromisoformat(r['t']).astimezone(MANILA).date().isoformat()
    except (KeyError, ValueError, TypeError):
        return None


def summary(rows, day):
    """One line: the day's launches by model and effort, and the refusals. None when there were none."""
    rows = [r for r in rows if day_of(r) == day]
    if not rows:
        return None
    ok = [r for r in rows if r.get('ok')]
    c = Counter('%s/%s' % (r.get('model') or ('fork' if r.get('type') == 'fork' else '?'), r.get('effort') or '-')
                for r in ok)
    dist = ', '.join('%s %d' % kv for kv in sorted(c.items(), key=lambda kv: (-kv[1], kv[0])))
    refused = len(rows) - len(ok)
    return 'Agent launches today: %d (%s)%s' % (len(ok), dist or 'none', '; %d refused' % refused if refused else '')


def main(argv):
    root = os.environ.get('CLAUDE_PROJECT_DIR') or os.getcwd()
    if len(argv) == 2 and argv[0] == '--check':
        why = reason(json.loads(argv[1]))
        if why:
            print(why)
        return 1 if why else 0
    if argv and argv[0] == '--report':
        day = argv[1] if len(argv) > 1 else datetime.now(MANILA).date().isoformat()
        path = log_path(root)
        rows = [r for r in read_log(path) if day_of(r) == day] if path else []
        print('Log: %s' % path)
        print(summary(rows, day) or 'No agent launch logged on %s (Manila).' % day)
        for r in rows:
            print('  %s %s %s/%s%s%s %s' % (datetime.fromisoformat(r['t']).astimezone(MANILA).strftime('%H:%M'),
                                         'ok' if r.get('ok') else 'REFUSED', r.get('model') or '-',
                                         r.get('effort') or '-', ' ' + r['type'] if r.get('type') else '',
                                         ' (by ' + r['by'][:12] + ')' if r.get('by') else '', r.get('desc', '')))
        return 0
    if argv and argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    try:
        ev = json.loads(sys.stdin.read())
        if ev.get('tool_name') not in TOOLS:
            return 0
        why = reason(ev.get('tool_input'))
    except Exception:  # never block work because the guard failed
        return 0
    try:
        path = log_path(root) or log_path(ev.get('cwd') or '.')
        if path:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry(ev, why), ensure_ascii=False) + '\n')
    except Exception:  # a log that cannot be written never changes the decision
        pass
    if why:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny',
                                                 'permissionDecisionReason': why}}))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

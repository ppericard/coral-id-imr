#!/usr/bin/env python3
"""The Bash guard: a PreToolUse hook (.claude/settings.json) that refuses, at once and with the way out, a shell command
that carries code or edits files in place (AGENTS.md "No permission prompts for Pierre"; Pierre, 2026-11-18).

Such commands (heredocs, `python -c`, `node -e`, `sed -i`, `bash -c`, code piped into an interpreter) trip the session's
safety checks: Pierre was then asked to approve a command he cannot judge, and an agent once waited two hours on one.
A written rule did not stop them; this hook does: the agent gets the refusal and the right tool in the same second, and
Pierre never sees a prompt for them. It applies to the integrator and to every subagent of the session.

Input: the hook's JSON on stdin (tool_name, tool_input.command). Output: nothing (allowed), or the PreToolUse "deny"
decision with its reason. Text inside quotes is not read as a command (a commit message, a grep for "sed -i"), and
running main's reviewed copy of a project tool through `git show origin/main:tools/X.py | python3 -I -` stays allowed.
The hooks run main's copy of this file (`git show origin/main:tools/guard_bash.py | python3 -I -`), so it must also
work fed on stdin. Any error lets the command through: the guard never blocks work by failing.

  python3 tools/guard_bash.py --check 'python3 -c "print(1)"'   # prints the reason, exit 1; allowed: nothing, exit 0
"""
import json
import re
import sys

# Quoted text is blanked before matching: a heredoc marker or a pattern inside quotes is data, not a command.
QUOTED = re.compile(r'"(?:\\.|[^"\\])*"|\'[^\']*\'')
# Opt is one option word of an interpreter before its code flag (python3 -I -c, node --no-warnings -e).
OPT = r'(?:-[\w-]+\s+)*'
PATTERNS = [
    (re.compile(r'(?<!<)<<(?!<)-?\s*\w'), 'a heredoc'),
    (re.compile(r'\bpython[\d.]*\s+' + OPT + r'-[A-Za-z]*c\b'), '`python -c`'),
    (re.compile(r'\b(?:node|deno|bun)\s+' + OPT + r'(?:-e|-p|--eval|--print)\b'), '`node -e`'),
    (re.compile(r'\b(?:perl|ruby)\s+' + OPT + r'-[A-Za-z]*e\b'), '`perl -e` / `ruby -e`'),
    (re.compile(r'\bsed\s+(?:-[\w-]+\s+)*(?:-[A-Za-z]*i|--in-place)'), '`sed -i`'),
    (re.compile(r'(?<![\w-])(?:ba|z|da|k)?sh\s+' + OPT + r'-[A-Za-z]*c\b'), '`bash -c`'),
    # An interpreter at the end of a pipe with no script named reads its code from the pipe (`| python3 -`, `| bash`).
    (re.compile(r'\|\s*(?:python[\d.]*|node|perl|ruby|(?:ba|z|da|k)?sh)(?:[ \t]+-[\w-]*)*[ \t]*(?=$|\n|;|&|\||\))'), 'code piped into an interpreter'),
]
# Main's reviewed copy of a project tool, run as the hooks run it: not inline code.
REVIEWED = re.compile(r'\bgit\s+(?:-C\s+\S+\s+)?show\s+\S+:tools/[\w/.-]+\.py\s*\|\s*python[\d.]*\s+-I\s+-(?=\s|$)')

WAY_OUT = (
    "Refused by the project's Bash guard (tools/guard_bash.py; AGENTS.md \"No permission prompts for Pierre\"): %s in a "
    'shell command makes Pierre approve a prompt he cannot judge. Create or change files with the Write and Edit tools; '
    'search with Grep and Glob, read with Read; for a script, write it to a file (your scratchpad) with Write and run it '
    'by name (python3 path/to/script.py). Do not work around this refusal with another shell form, wrapper or tool: '
    'if none of these fits, say so in your report.'
)


def reason(command):
    """Why the command is refused, or None."""
    text = REVIEWED.sub(' ', QUOTED.sub(' Q ', command or ''))
    for pat, what in PATTERNS:
        if pat.search(text):
            return WAY_OUT % what
    return None


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--check':
        why = reason(sys.argv[2])
        if why:
            print(why)
        return 1 if why else 0
    try:
        data = json.load(sys.stdin)
        if data.get('tool_name') != 'Bash':
            return 0
        why = reason((data.get('tool_input') or {}).get('command', ''))
    except Exception:  # never block work because the guard failed
        return 0
    if why:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny', 'permissionDecisionReason': why}}))
    return 0


if __name__ == '__main__':
    sys.exit(main())

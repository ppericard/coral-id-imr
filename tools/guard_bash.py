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
The hook gives main's copy of this file with `python3 -I -c` (no file: it must work so), fetching main where the
checkout has no origin/main ref and refusing every command if it cannot (tests/hooks.test.js). Inside the script, any
error lets the command through: the guard never blocks work by failing.

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
    (re.compile(r'(?<!<)<<(?!<)-?\s*[A-Za-z_]'), 'a heredoc'),  # a marker is a word; $((1<<3)) is arithmetic
    (re.compile(r'\bpython[\d.]*\s+' + OPT + r'-[A-Za-z]*c\b'), '`python -c`'),
    (re.compile(r'\b(?:node|deno|bun)\s+' + OPT + r'(?:-e|-p|--eval|--print)\b'), '`node -e`'),
    (re.compile(r'\b(?:perl|ruby)\s+' + OPT + r'-[A-Za-z]*e\b'), '`perl -e` / `ruby -e`'),
    (re.compile(r'\bsed\s+(?:-[\w-]+\s+)*(?:-[A-Za-z]*i|--in-place)'), '`sed -i`'),
    (re.compile(r'(?<![\w.-])(?:ba|z|da|k)?sh\s+' + OPT + r'-[A-Za-z]*c\b'), '`bash -c`'),  # not `x.sh -c`
    # An interpreter at the end of a pipe with no script named reads its code from the pipe (`| python3 -`, `| bash`).
    (re.compile(r'\|\s*(?:python[\d.]*|node|perl|ruby|(?:ba|z|da|k)?sh)(?:[ \t]+-[\w-]*)*[ \t]*(?=$|\n|;|&|\||\))'), 'code piped into an interpreter'),
    # A here-string feeds its text to the interpreter's stdin, as a heredoc does (`python3 <<< 'print(1)'`).
    (re.compile(r'(?<![\w.-])(?:python[\d.]*|node|perl|ruby|(?:ba|z|da|k)?sh)\b[^|;&\n]*<<<'), 'a here-string into an interpreter'),
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


HEREDOC_MARK = re.compile(r'<<-?[ \t]*([\'"]?)([A-Za-z_]\w*)\1')


def skip_single(s, j):
    """The index after the single-quoted span opening at s[j]."""
    k = s.find("'", j + 1)
    return len(s) if k < 0 else k + 1


def skip_backtick(s, j):
    """The index after the backtick span opening at s[j]."""
    k = s.find('`', j + 1)
    return len(s) if k < 0 else k + 1


def skip_double(s, j):
    """The index after the double-quoted span whose opening quote is just before s[j]: an apostrophe is a character
    there, a `$(…)` or a backtick still runs."""
    n = len(s)
    while j < n:
        c = s[j]
        if c == '\\':
            j += 2
        elif c == '"':
            return j + 1
        elif s.startswith('$(', j):
            j = skip_command(s, j + 2)
        elif c == '`':
            j = skip_backtick(s, j)
        else:
            j += 1
    return n


def skip_command(s, j):
    """The index after the `)` that closes a `$(` whose body starts at s[j]. Inside it the shell quotes normally again
    (also when the `$(` sits in the body of a bare heredoc). The body of a heredoc opened inside is skipped, so an
    apostrophe or a bracket in a commit message does not derail the scan."""
    n, depth, skip = len(s), 1, None  # skip: (newline, end) of the body of a heredoc opened on this line
    while j < n and depth:
        c = s[j]
        if skip and j == skip[0]:
            j, skip = skip[1], None
        elif c == '\\':
            j += 2
        elif c == "'":
            j = skip_single(s, j)
        elif c == '"':
            j = skip_double(s, j + 1)
        elif c == '`':
            j = skip_backtick(s, j)
        else:
            mark = HEREDOC_MARK.match(s, j) if c == '<' and s[j - 1] != '<' else None
            if mark and not skip:
                nl = s.find('\n', mark.end())
                end = re.compile(r'\n[ \t]*' + re.escape(mark.group(2)) + r'[ \t]*(?=\n|\Z)').search(s, mark.end())
                if nl >= 0 and end:
                    skip = (nl, end.end())
            depth += {'(': 1, ')': -1}.get(c, 0)
            j += 1
    return j


def substitutions(command, quotes=True):
    """The commands inside $(…) and `…` that the shell runs: outside single quotes, and inside double quotes (where an
    apostrophe is only a character). `quotes=False` for the body of an unquoted heredoc, where no quote means anything."""
    out, i, n, double = [], 0, len(command), False
    while i < n:
        c = command[i]
        if quotes and c == '\\':
            i += 2
        elif quotes and c == "'" and not double:
            i = skip_single(command, i)  # a single-quoted span: no substitution inside
        elif quotes and c == '"':
            double, i = not double, i + 1
        elif command.startswith('$(', i):
            j = skip_command(command, i + 2)
            out.append(command[i + 2:j - 1 if command[j - 1] == ')' else j])
            i = j
        elif c == '`':
            j = skip_backtick(command, i)
            out.append(command[i + 1:j - 1 if j - 1 > i and command[j - 1] == '`' else j])
            i = j
        else:
            i += 1
    return out


# `$(cat <<'EOF' … EOF)` only turns the heredoc's text into an argument (a commit message): text, not code. With a quoted
# delimiter the body is literal; with a bare one (`<<EOF`) the shell still runs the `$(…)` and backticks inside it, so
# those are read as commands too (Codex, #1117).
TEXT_HEREDOC = re.compile(r'\s*cat\s+<<-?\s*([\'"]?)([A-Za-z_]\w*)\1[ \t]*\n(.*?)\n\s*\2\s*$', re.S)


def inner_reason(inner):
    """Why a command substitution is refused, or None."""
    m = TEXT_HEREDOC.fullmatch(inner)
    if not m:
        return reason(inner)
    if m.group(1):  # quoted delimiter: the body is literal text
        return None
    for body_inner in substitutions(m.group(3), quotes=False):
        why = inner_reason(body_inner)
        if why:
            return why
    return None


def reason(command):
    """Why the command is refused, or None."""
    for inner in substitutions(command or ''):
        why = inner_reason(inner)
        if why:
            return why
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

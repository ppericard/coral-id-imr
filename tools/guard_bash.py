#!/usr/bin/env python3
"""The Bash guard: a PreToolUse hook (.claude/settings.json) that refuses, at once and with the way out, a shell command
that carries code or edits files in place (docs/INTEGRATOR.md "Habits"; Pierre, 2026-11-18).

Such commands (heredocs, `python -c`, `node -e`, `sed -i`, `bash -c`, code piped into an interpreter) trip the session's
safety checks: Pierre was then asked to approve a command he cannot judge, and an agent once waited two hours on one.
A written rule did not stop them; this hook does: the agent gets the refusal and the right tool in the same second, and
Pierre never sees a prompt for them. It applies to the integrator and to every subagent of the session.

Input: the hook's JSON on stdin (tool_name, tool_input.command). Output: nothing (allowed), or the PreToolUse "deny"
decision with its reason. Text inside quotes is not read as a command (a commit message, a grep for "sed -i"), and
running main's reviewed copy of a project tool through `git show origin/main:tools/X.py | python3 -I -` stays allowed.
The hook gives main's copy of this file with `python3 -I -c` (no file: it must work so), fetching main where the
checkout has no origin/main ref and refusing every command if it cannot (tests/hooks.test.js). Inside the script, any
error lets the command through: the guard never blocks work by failing. One exception, the push rule below, fails closed.

It also refuses a command line with a `git push` unless the whole line is one of three literal forms pushing a claude/*,
codex/*, train/* or ccr-* branch (REE-346, REE-345; the integrator, 2026-11-27): see "A push" below. A seat belt: main and
release are protected server-side.

  python3 tools/guard_bash.py --check 'python3 -c "print(1)"'   # prints the reason, exit 1; allowed: nothing, exit 0
"""
import json
import os
import re
import subprocess
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
    "Refused by the project's Bash guard (tools/guard_bash.py; docs/INTEGRATOR.md \"Habits\"): %s in a "
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


# --- A push (REE-346 mitigation (a)5, REE-345; the integrator, 2026-11-27) --------------------------------------------------
# main and release feed the sheet script's auto-update, the hourly Analyses job and the Pages deploy, so a push credential
# that reaches them reaches player data (REE-346). Only the merge train moves them, and tools/train.py pushes from its own
# process (`git push` through subprocess, never through this shell): a `python3 tools/train.py ...` command contains no push
# and needs no exception.
#
# The rule is a strict allowlist, not a reading of the destination (round 2 of the Codex review of #1631: every attempt to
# resolve where a push goes -- refspecs, tracking, remote.*.push, remote.*.mirror, --repo, aliases, what an earlier command
# of the line did, quoted options, a push in an `if` -- left another way round; the integrator cut that part, W27). A
# command line that has `push` or `send-pack` as a word anywhere (any position, wrapper, conditional or quoting: it is
# fine to over-refuse) is refused unless the whole line is exactly
#   [cd <literal path> && ]git push [-q] [-u] origin <branch>
#   [cd <literal path> && ]git push [-q] [-u] origin HEAD:refs/heads/<branch>
#   [cd <literal path> && ]git push [-q] [-u] origin <branch>:refs/heads/<branch>
# with <branch> a literal claude/*, codex/*, train/* or ccr-* name, and the repository's configuration holds no
# remote.origin.push, remote.origin.mirror or (local) push.default. A configuration that cannot be read refuses.
# This is a seat belt: the protection of main and release is server-side (REE-72's release ruleset, REE-345's deny rules).
BRANCH = r'(?:(?:claude|codex|train)/[A-Za-z0-9._/-]+|ccr-[A-Za-z0-9-]+)'
ALLOWED_PUSH = re.compile(
    r'(?:cd (?P<dir>[A-Za-z0-9._/-]+) && )?git push(?: -q)?(?: -u)? origin '
    r'(?:(?P<a>' + BRANCH + r')|HEAD:refs/heads/(?P<b>' + BRANCH + r')|(?P<c>' + BRANCH + r'):refs/heads/(?P<d>' + BRANCH + r'))'
)
PUSH_WAY_OUT = (
    "Refused by the project's Bash guard (tools/guard_bash.py; REE-346, REE-345): %s. A command line with a git push is "
    'allowed only as exactly `git push [-q] [-u] origin <branch>`, `git push [-q] [-u] origin HEAD:refs/heads/<branch>` or '
    '`git push [-q] [-u] origin <branch>:refs/heads/<branch>`, alone or after `cd <path> && `, with <branch> a literal '
    'claude/..., codex/..., train/... or ccr-... name; write the git command literally, with no variable, substitution, '
    'glob or brace in it. main and release are moved only by the merge train '
    '(python3 tools/train.py), which pushes from its own process. Do not work around this refusal with another shell form, '
    'wrapper or tool: if you need another push, say so in your report.'
)
PUSH_WORD = re.compile(r'(?<![\w-])(?:push|send-pack)(?![\w-])')


class Word(tuple):
    """One shell word: (text with its quotes removed, dynamic, quoted). Dynamic: a `$` or a backtick outside single quotes,
    so the value is not in the text."""
    __slots__ = ()
    text = property(lambda w: w[0])
    dynamic = property(lambda w: w[1])
    quoted = property(lambda w: w[2])


class Unreadable(Exception):
    """A configuration this guard cannot read: the push is refused."""


def shell_commands(s):
    """The simple commands of a shell line as lists of Words: split on ; & | newline and brackets outside quotes."""
    cmds, words, buf = [], [], None  # buf: [text pieces, dynamic, quoted] of the word being read
    i, n = 0, len(s)

    def flush():
        nonlocal buf
        if buf is not None:
            words.append(Word((''.join(buf[0]), buf[1], buf[2])))
            buf = None

    def endcmd():
        nonlocal words
        flush()
        if words:
            cmds.append(words)
            words = []

    while i < n:
        c = s[i]
        if c in ' \t':
            flush()
            i += 1
        elif c in ';&|\n()':
            endcmd()
            i += 1
        elif c == '#' and buf is None:
            j = s.find('\n', i)
            i = n if j < 0 else j
        else:
            if buf is None:
                buf = [[], False, False]
            if c == '\\':
                if s[i + 1:i + 2] != '\n':
                    buf[0].append(s[i + 1:i + 2])
                    buf[2] = True
                i += 2
            elif c == "'":
                j = skip_single(s, i)
                buf[0].append(s[i + 1:j - 1])
                buf[2] = True
                i = j
            elif c == '"':
                j = skip_double(s, i + 1)
                body = s[i + 1:j - 1]
                buf[0].append(re.sub(r'\\([\\"$`])', r'\1', body))
                buf[1] = buf[1] or '$' in body or '`' in body
                buf[2] = True
                i = j
            elif s.startswith('$(', i):
                j = skip_command(s, i + 2)
                buf[0].append(s[i:j])
                buf[1] = True
                i = j
            elif c == '`':
                j = skip_backtick(s, i)
                buf[0].append(s[i:j])
                buf[1] = True
                i = j
            else:
                buf[0].append(c)
                buf[1] = buf[1] or c == '$'
                i += 1
    endcmd()
    return cmds


def push_aliases(cwd):
    """The names of the git aliases whose value mentions a push (none when the configuration cannot be read)."""
    try:
        r = subprocess.run(['git', 'config', '--get-regexp', r'^alias\.'], cwd=cwd, capture_output=True, text=True, timeout=5)
    except Exception:
        return set()
    names = set()
    for line in r.stdout.split('\n'):
        key, _, value = line.partition(' ')
        if PUSH_WORD.search(value):
            names.add(key.lower()[len('alias.'):])
    return names


MESSAGE_FLAG = re.compile(r'-[A-Za-z]*m|--message|-F|--file')  # its value is text: `git commit -m "$(cat <<EOF ...)"`


def expands_in_git(cmd):
    """True when a simple command that runs git has a word the shell expands, wherever it stands: a `$` expansion, a
    backtick, `$(`, or an unquoted glob or brace. It may name the subcommand (`SUB=push; git "$SUB" ...`), so the line is
    read as a push. Not: the value of -m or -F, and a commit message that is a text-only heredoc (`$(cat <<'EOF' ...)`)."""
    for k, w in enumerate(cmd):
        if w.dynamic:
            subs = substitutions(w.text)
            text_only = len(subs) == 1 and w.text == '$(%s)' % subs[0] and TEXT_HEREDOC.fullmatch(subs[0]) is not None
            if not text_only and not (k and MESSAGE_FLAG.fullmatch(cmd[k - 1].text)):
                return True
        elif not w.quoted and re.search(r'[*?\[{]', w.text):
            return True
    return False


def mentions_push(command, cwd=None):
    """True when the line may run a git push: `push` or `send-pack` is a word (quotes removed) of any simple command,
    beside a `git` word or a word the shell expands; or a git alias for a push, or a git command with a word the shell
    expands anywhere in it. Text inside one quoted word (a commit message, a grep pattern) is not. Generous: an `eval` or
    an alias definition in the line counts a push named inside a quoted word too."""
    cmds = shell_commands(command)
    words = [w for cmd in cmds for w in cmd]
    texts = [w.text for w in words]
    isgit = lambda w: w.text.rsplit('/', 1)[-1] == 'git'  # noqa: E731
    joined = ' '.join(texts)
    if not (any(isgit(w) for w in words) or any(w.dynamic for w in words) or ('eval' in texts and re.search(r'\bgit\b', joined))):
        return False
    if any(t in ('push', 'send-pack') for t in texts):
        return True
    if any(expands_in_git(cmd) for cmd in cmds if any(isgit(w) for w in cmd)):  # `git -C . "$SUB" origin HEAD:main`
        return True
    if PUSH_WORD.search(joined) and ('eval' in texts or re.search(r'(?<![\w-])alias\.', joined) is not None):
        return True
    return any(isgit(w) for w in words) and bool(push_aliases(cwd or os.getcwd()) & set(texts))


def repo_config_reason(cwd):
    """Why the repository's configuration forbids the allowed push forms, or None. Unreadable: refused."""
    if cwd is None:
        raise Unreadable('the directory is not known')
    try:
        r = subprocess.run(['git', 'config', '--list', '--show-scope'], cwd=cwd, capture_output=True, text=True, timeout=5)
    except Exception as e:
        raise Unreadable('git could not be queried (%s)' % type(e).__name__)
    if r.returncode:
        raise Unreadable('git could not be queried (exit %d)' % r.returncode)
    for line in r.stdout.split('\n'):
        scope, _, rest = line.partition('\t')
        key = rest.partition('=')[0].lower()
        if key in ('remote.origin.push', 'remote.origin.mirror'):
            return 'the repository configures %s, which can send a push elsewhere' % key
        if key == 'push.default' and scope in ('local', 'worktree'):
            return 'the repository sets push.default'
    return None


def push_reason(command, cwd=None):
    """Why the command line is refused for a git push, or None."""
    try:
        if not mentions_push(command, cwd):
            return None
        m = ALLOWED_PUSH.fullmatch(command.strip())
        if not m:
            return PUSH_WAY_OUT % 'this line is not one of the allowed push forms'
        for g in 'abcd':
            ref = m.group(g)
            if ref and (re.search(r'\.\.|//|\.lock(?:/|$)', ref) or ref.endswith(('/', '.'))):
                return PUSH_WAY_OUT % ('%r is not a plain branch name' % ref)
        if m.group('dir'):
            cwd = os.path.normpath(os.path.join(cwd or os.getcwd(), m.group('dir')))
        why = repo_config_reason(cwd or os.getcwd())
        return PUSH_WAY_OUT % why if why else None
    except Unreadable as e:
        return PUSH_WAY_OUT % ('the repository configuration cannot be checked here: %s' % e)
    except Exception:  # a bug in this rule: refuse what mentions a push
        return PUSH_WAY_OUT % 'this command could not be read and mentions a push' if PUSH_WORD.search(command) else None


CWD = None  # the directory the hooked command runs in (the event's `cwd`); None: this process's


def reason(command):
    """Why the command is refused, or None."""
    for inner in substitutions(command or ''):
        why = inner_reason(inner)
        if why:
            return why
    why = push_reason(command or '', CWD or os.getcwd())
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
        global CWD
        CWD = data.get('cwd') if isinstance(data.get('cwd'), str) else None
        why = reason((data.get('tool_input') or {}).get('command', ''))
    except Exception:  # never block work because the guard failed (push_reason fails closed inside reason)
        return 0
    if why:
        print(json.dumps({'hookSpecificOutput': {'hookEventName': 'PreToolUse', 'permissionDecision': 'deny', 'permissionDecisionReason': why}}))
    return 0


if __name__ == '__main__':
    sys.exit(main())

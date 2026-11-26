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

It also refuses a `git push` whose destination is `main` or `release`, in any form (REE-346, REE-345; the integrator,
2026-11-27): see "A push to main or release" below.

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


# --- A push to main or release (REE-346 mitigation (a)5, REE-345; the integrator, 2026-11-27) -------------------------------
# main and release feed the sheet script's auto-update, the hourly Analyses job and the Pages deploy, so a push credential
# that reaches them reaches player data (REE-346). Only the merge train moves them, and tools/train.py pushes from its own
# process (`git push` through subprocess, never through this shell): a `python3 tools/train.py ...` command contains no
# push, so it needs no exception here, and a push chained after it is still read as a push. The rule fails closed: a
# destination this guard cannot read (a variable, a pattern, an alias, a git it cannot query) is refused.
PROTECTED = ('main', 'release')
PUSH_WAY_OUT = (
    "Refused by the project's Bash guard (tools/guard_bash.py; REE-346, REE-345): %s. main and release are moved only by "
    'the merge train (python3 tools/train.py), which pushes from its own process. Push your own branch with its name '
    'written out (git push -u origin HEAD, or git push origin HEAD:claude/<name>), never through a variable, a pattern or '
    'an alias. Do not work around this refusal with another shell form, wrapper or tool: if main or release must move, '
    'say so in your report.'
)
WRAPPERS = {'env', 'command', 'exec', 'time', 'sudo', 'nohup', 'nice', 'builtin', 'xargs', 'then', 'do', 'else', '{', '!'}
WRAPPER_ARG = {'-u', '-n', '-C', '-g', '-I', '-P', '-L', '-s', '-E', '-d', '-S', '-a'}  # wrapper options that take a value
GIT_ARG = {'-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env', '--super-prefix', '--attr-source'}
PUSH_ARG = {'-o', '--push-option', '--repo', '--receive-pack', '--exec'}
REDIRECT = re.compile(r'\d*(?:&>>?|>>?&?|<<?<?)')
# Subcommands git runs itself: an alias cannot shadow them, so the configuration is read for any other word only.
GIT_BUILTINS = set(
    'add am apply archive bisect blame branch bundle cat-file check-ref-format checkout cherry cherry-pick clean clone commit '
    'commit-tree config count-objects describe diff diff-tree difftool fetch for-each-ref format-patch fsck gc grep hash-object '
    'help init log ls-files ls-remote ls-tree maintenance merge merge-base mergetool mktree mv name-rev notes pull range-diff '
    'read-tree rebase reflog remote repack reset restore rev-list rev-parse revert rm shortlog show show-ref sparse-checkout '
    'stash status submodule switch symbolic-ref tag update-ref var verify-commit version whatchanged worktree write-tree'.split()
)


class Word(tuple):
    """One shell word: (text with its quotes removed, dynamic, quoted). Dynamic: a `$` or a backtick outside single quotes,
    so the value is not in the text."""
    __slots__ = ()
    text = property(lambda w: w[0])
    dynamic = property(lambda w: w[1])
    quoted = property(lambda w: w[2])


class Unreadable(Exception):
    """A push whose destination this guard cannot establish: refused."""


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


def branch_of(ref):
    """The branch a destination names: `refs/heads/main`, `heads/main` and `main` are one."""
    r = re.sub(r'/+', '/', ref)
    r = r[5:] if r.startswith('refs/') else r
    return r[6:] if r.startswith('heads/') else r


def run_git(gitopts, cwd, *args):
    """Stdout of a git query in the command's own repository; Unreadable when it fails."""
    if cwd is None:
        raise Unreadable('the directory the push runs in is not known here (a `cd` to a variable)')
    try:
        r = subprocess.run(['git'] + gitopts + list(args), cwd=cwd, capture_output=True, text=True, timeout=5)
    except Exception as e:
        raise Unreadable('git could not be queried (%s)' % type(e).__name__)
    if r.returncode not in (0, 1):
        raise Unreadable('git could not be queried (exit %d)' % r.returncode)
    return r.stdout if r.returncode == 0 else ''


UNKNOWN = object()  # State.cur after a command that may have switched, renamed or re-pointed the current branch


class State:
    """What the commands run so far in this line may have changed. The hook reads git before the line runs, so an answer
    about the branch or the configuration holds only until one of those commands runs: after it, the destination is
    refused unless it is written out in full (the push rule fails closed)."""

    def __init__(self):
        self.cur = None  # None: ask git; a name: `checkout -b NAME` made it current; UNKNOWN: it may have changed
        self.cfg = False  # remotes, push.default, aliases may have changed
        self.bcfg = False  # the current branch's upstream (branch.<name>.*) may have changed

    def taint(self, cur=True, cfg=True, bcfg=True):
        self.cur = UNKNOWN if cur else self.cur
        self.cfg = self.cfg or cfg
        self.bcfg = self.bcfg or bcfg


def read_config(gitopts, cwd, st=None):
    if st and st.cfg:
        raise Unreadable('an earlier command in this line may have changed the git configuration')
    out = []
    for line in run_git(gitopts, cwd, 'config', '--list').split('\n'):
        k, eq, v = line.partition('=')
        if eq:
            out.append((k.lower(), v))
    return out


def last(cfg, key):
    vals = [v for k, v in cfg if k == key]
    return vals[-1] if vals else None


def current_branch(gitopts, cwd, st=None):
    if st and st.cur is UNKNOWN:
        raise Unreadable('an earlier command in this line may have switched branch')
    if st and st.cur:
        return st.cur
    return run_git(gitopts, cwd, 'symbolic-ref', '--short', '-q', 'HEAD').strip() or None


def refspec_reason(spec, gitopts, cwd, st=None):
    """Why a refspec's destination is refused, or None."""
    spec = spec.lstrip('+')
    if spec == ':':
        return 'a bare `:` refspec pushes every branch that exists on both sides, main and release included'
    dst = spec.partition(':')[2] if ':' in spec else spec
    if re.search(r'[$`*?\[{\\]', dst):
        raise Unreadable('the destination %r is a variable, a substitution or a pattern, so it may be main or release' % dst)
    if dst in ('HEAD', '@'):
        dst = current_branch(gitopts, cwd, st) or ''
    b = branch_of(dst)
    return 'it pushes to %s' % b if b in PROTECTED else None


def effective_remote(remote, cfg, cur):
    if not remote and cur:
        remote = last(cfg, 'branch.%s.pushremote' % cur.lower()) or last(cfg, 'branch.%s.remote' % cur.lower())
    return remote or last(cfg, 'remote.pushdefault') or 'origin'


def bare_push_reason(remote, gitopts, cwd, st):
    """A push with no refspec goes where the configuration says: the current branch, the branch it tracks, a remote's
    configured refspecs, or every matching branch."""
    cur = current_branch(gitopts, cwd, st)
    if cur in PROTECTED:
        return 'the current branch is %s' % cur
    if st.bcfg:
        raise Unreadable('an earlier command in this line may have changed the branch\'s upstream')
    cfg = read_config(gitopts, cwd, st)
    default = (last(cfg, 'push.default') or 'simple').lower()
    if default == 'matching':
        return 'push.default=matching pushes every branch that exists on both sides, main and release included'
    merge = last(cfg, 'branch.%s.merge' % cur.lower()) if cur else None
    if merge and default in ('simple', 'upstream', 'tracking') and branch_of(merge) in PROTECTED:
        return 'branch %s tracks %s, and a push with no destination goes there (git push -u origin HEAD names its own)' % (
            cur, branch_of(merge))
    remote = effective_remote(remote, cfg, cur)
    for k, v in cfg:
        if k == 'remote.%s.push' % remote.lower():
            why = refspec_reason(v, gitopts, cwd, st)
            if why:
                return 'the remote %s is configured to push there (%s)' % (remote, why)
    return None


def mapped_push_reason(remote, names, gitopts, cwd, st):
    """A refspec with no colon (`x`, `HEAD`) is also looked up in remote.<name>.push, which can map it to main or release."""
    cfg = read_config(gitopts, cwd, st)
    remote = effective_remote(remote, cfg, None if remote else current_branch(gitopts, cwd, st))
    names = {branch_of(n) for n in names}
    if names & {'HEAD', '@'}:
        names.add(current_branch(gitopts, cwd, st) or '')
    for k, v in cfg:
        if k == 'remote.%s.push' % remote.lower():
            src = v.lstrip('+').partition(':')[0]
            if branch_of(src) in names or src in ('', 'HEAD', '@') or re.search(r'[*?\[{]', src):
                why = refspec_reason(v, gitopts, cwd, st)
                if why:
                    return 'the remote %s maps what is pushed to a protected branch (%s)' % (remote, why)
    return None


def push_args_reason(args, gitopts, cwd, via_xargs, st):
    """Why `git push ARGS` (the words after `push`) is refused, or None. A push that sets the upstream (-u) is noted in st."""
    why = push_args_check(args, gitopts, cwd, via_xargs, st)
    if not why and any(
        (a.text.startswith('--') and len(a.text.split('=')[0]) >= 5 and '--set-upstream'.startswith(a.text.split('=')[0]))
        or (re.fullmatch(r'-[A-Za-z]*u[A-Za-z]*', a.text) is not None)
        for a in args
    ):
        st.bcfg = True
    return why


def push_args_check(args, gitopts, cwd, via_xargs, st):
    positional, repo_opt, tags_only, k = [], False, False, 0
    while k < len(args):
        a = args[k].text
        name = a.split('=')[0]
        if a == '--':
            positional += args[k + 1:]
            break
        if a.startswith('--'):
            if (
                (len(name) >= 3 and '--mirror'.startswith(name))
                or (len(name) >= 4 and '--all'.startswith(name))
                or (len(name) >= 3 and '--branches'.startswith(name))  # --branches is git's alias of --all
            ):
                return '--all, --branches and --mirror push every branch, main and release included'
            tags_only = tags_only or name == '--tags'
            if name in PUSH_ARG:
                repo_opt = repo_opt or name == '--repo'
                k += 0 if '=' in a else 1
        elif a.startswith('-') and len(a) > 1:
            k += 1 if a[1:].endswith('o') else 0  # -o <push-option>
        else:
            positional.append(args[k])
        k += 1
    if via_xargs:
        return 'a push run through xargs takes its destination from standard input'
    remote, specs = (None, positional) if repo_opt else ((positional[0].text if positional else None), positional[1:])
    if not specs:
        return None if tags_only else bare_push_reason(remote, gitopts, cwd, st)
    k, colonless = 0, []
    while k < len(specs):
        if specs[k].text == 'tag' and k + 1 < len(specs):  # `git push origin tag v1`: a tag, not a branch
            k += 2
            continue
        spec = specs[k].text.lstrip('+')
        why = refspec_reason(spec, gitopts, cwd, st)
        if why:
            return why
        if ':' not in spec:
            colonless.append(spec)
        k += 1
    return mapped_push_reason(remote, colonless, gitopts, cwd, st) if colonless else None


def without_redirects(words):
    out, skip = [], False
    for w in words:
        m = None if w.quoted else REDIRECT.match(w.text)
        if skip:
            skip = False
        elif m:
            skip = m.end() == len(w.text)  # `>` `file` are two words; `>file` is one
        else:
            out.append(w)
    return out


# Git commands that change neither the branch HEAD names nor the configuration (so an answer read before the line runs
# still holds after them); any other subcommand, an alias or an unknown one is recorded in State by git_effects.
SAFE_GIT = set(
    'add am apply archive blame bundle cat-file check-ref-format cherry cherry-pick clean clone commit commit-tree '
    'count-objects describe diff diff-tree difftool fetch for-each-ref format-patch fsck gc grep hash-object help log '
    'ls-files ls-remote ls-tree maintenance merge merge-base mergetool mktree mv name-rev notes pull range-diff read-tree '
    'rebase reflog repack reset restore rev-list rev-parse revert rm shortlog show show-ref sparse-checkout stash status '
    'submodule tag var verify-commit version whatchanged write-tree'.split()
)
CREATE_FLAGS = {'-b', '-B', '-c', '-C', '--create', '--force-create', '--orphan'}
BRANCH_LIST = {'--show-current', '-l', '--list', '-a', '--all', '-r', '--remotes', '--contains', '--merged', '--no-merged', '--points-at'}
BRANCH_EDIT = {'-d', '-D', '-m', '-M', '-c', '-C', '-f', '--force', '-u', '--set-upstream-to', '--unset-upstream', '-t', '--track',
               '--delete', '--move', '--copy', '--edit-description'}
CONFIG_READ = {'--get', '--get-all', '--get-regexp', '--get-urlmatch', '--list', '-l', '--show-origin', '--show-scope'}


def git_effects(sub, args, st, gitopts, cwd):
    """Records in st what a git command other than push may change."""
    if sub in SAFE_GIT:
        return
    pos = [a.text for a in args if not a.text.startswith('-')]
    flags = {a.text.split('=')[0] for a in args if a.text.startswith('-')}
    if sub in ('switch', 'checkout'):
        for k, a in enumerate(args):
            if a.text in CREATE_FLAGS and k + 1 < len(args) and not args[k + 1].dynamic and not args[k + 1].text.startswith('-'):
                # A new branch of a known name. A start point or --track may set an upstream; so may -B/-C (it resets
                # an existing branch) and branch.autoSetupMerge.
                rest = [x for x in args[k + 2:] if not x.text.startswith('-')]
                tracked = rest or any(x.text in ('-t', '--no-track') or x.text.split('=')[0] == '--track' for x in args)
                try:
                    auto = any(key == 'branch.autosetupmerge' for key, _ in read_config(gitopts, cwd, st))
                except Unreadable:
                    auto = True
                st.cur = args[k + 1].text
                st.bcfg = st.bcfg or bool(tracked) or auto or a.text in ('-B', '-C', '--force-create')
                return
        st.taint(cur=True, cfg=False, bcfg=True)
    elif sub == 'branch':
        if (not pos and not flags) or (flags & BRANCH_LIST and not flags & BRANCH_EDIT):
            return
        st.taint(cur=True, cfg=False, bcfg=True)
    elif sub == 'config':
        if not flags & CONFIG_READ:
            st.taint(cur=False, cfg=True, bcfg=True)
    elif sub == 'remote':
        if pos[:1] not in ([], ['show'], ['get-url']):
            st.taint(cur=False, cfg=True, bcfg=True)
    elif sub == 'symbolic-ref':
        if len(pos) > 1 or flags & {'-d', '--delete', '-m'}:
            st.taint(cur=True, cfg=False, bcfg=False)
    elif sub in ('update-ref', 'worktree'):
        st.taint(cur=True, cfg=False, bcfg=False)
    else:  # init, bisect, an alias, an unknown subcommand: anything
        st.taint()


def push_in(words, cwd, depth, st):
    """Why one simple command is a refused push, or None; with the directory the next command runs in. Records in st
    what the command may change."""
    words = without_redirects(words)
    for w in words:  # a substitution runs before the command: what it does counts too
        if w.dynamic and ('$(' in w.text or '`' in w.text):
            try:
                if depth >= 4:
                    raise Unreadable('too deep')
                for inner in substitutions(w.text):
                    if not TEXT_HEREDOC.fullmatch(inner):
                        for cmd in shell_commands(inner):
                            push_in(cmd, cwd, depth + 1, st)
            except Unreadable:
                st.taint()
    i, via_xargs = 0, False
    while i < len(words):
        t, base = words[i].text, words[i].text.rsplit('/', 1)[-1]
        if re.fullmatch(r'[A-Za-z_]\w*=.*', t):
            i += 1
        elif t in ('cd', 'pushd'):
            rest = [w for w in words[i + 1:] if w.quoted or not w.text.startswith('-')]
            if rest and not rest[0].dynamic and rest[0].text:
                cwd = os.path.normpath(os.path.join(cwd, os.path.expanduser(rest[0].text))) if cwd else None
            else:
                cwd = None
            return None, cwd
        elif t == 'eval' and depth < 4:
            return push_reason(' '.join(w.text for w in words[i + 1:]), cwd, depth + 1, st), cwd
        elif base in WRAPPERS:
            via_xargs = via_xargs or base == 'xargs'
            i += 1
            while i < len(words) and words[i].text.startswith('-') and not words[i].quoted:
                i += 2 if words[i].text in WRAPPER_ARG else 1
        else:
            break
    if i >= len(words):
        return None, cwd
    head = words[i]
    if head.dynamic:
        pushes = any(w.text in ('push', 'send-pack') for w in words[i + 1:])
        return ('a command named by a variable or a substitution may be a push to main or release' if pushes else None), cwd
    if head.text.rsplit('/', 1)[-1] != 'git':
        return None, cwd
    gitopts, run_cwd, j = [], cwd, i + 1
    while j < len(words) and words[j].text.startswith('-') and not words[j].quoted:
        o = words[j].text
        if o in GIT_ARG and j + 1 < len(words):
            if o == '-C':
                run_cwd = None if words[j + 1].dynamic or run_cwd is None else os.path.normpath(os.path.join(run_cwd, words[j + 1].text))
            elif o in ('-c', '--git-dir', '--work-tree'):
                gitopts += [o, words[j + 1].text]
            j += 2
        else:
            if o.startswith(('--git-dir=', '--work-tree=')):
                gitopts.append(o)
            j += 1
    if j >= len(words):
        return None, cwd
    sub = words[j].text
    if sub in ('push', 'send-pack'):
        return push_args_reason(words[j + 1:], gitopts, run_cwd, via_xargs, st), cwd
    if words[j].dynamic:
        return 'a git subcommand named by a variable or a substitution may be a push to main or release', cwd
    if sub not in GIT_BUILTINS:
        if st.cfg:
            return 'the git command %r may be an alias, defined earlier in this line, for a push' % sub, cwd
        try:
            alias = last(read_config(gitopts, run_cwd, st), 'alias.' + sub.lower())
        except Unreadable:  # not a push as far as is known: the line goes on, its later pushes lose their cached answers
            st.taint()
            return None, cwd
        if alias and re.search(r'push|send-pack', alias):
            return 'the git alias %r runs a push' % sub, cwd
    git_effects(sub, words[j + 1:], st, gitopts, run_cwd)
    return None, cwd


def push_reason(command, cwd, depth=0, st=None):
    """Why the command contains a push to main or release (any form), or None."""
    st = st or State()
    try:
        for words in shell_commands(command):
            why, cwd = push_in(words, cwd, depth, st)
            if why:
                return PUSH_WAY_OUT % why
    except Unreadable as e:
        return PUSH_WAY_OUT % ('this push cannot be checked here: %s' % e)
    except Exception:  # a bug in this rule: refuse only what mentions a push
        if re.search(r'push|send-pack', command):
            return PUSH_WAY_OUT % 'this command could not be read and mentions a push'
    return None


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

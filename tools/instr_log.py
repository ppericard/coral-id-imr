#!/usr/bin/env python3
"""The instructions log: which instruction files reached each agent of a session, when and why (the rules core trial,
docs/reviews/2026-11-19-rules-core-proposal.md §3, Q425 B).

Hook mode (the hook's JSON on stdin, no argument), for three events in .claude/settings.json:
- InstructionsLoaded: one record per file loaded (CLAUDE.md, an import such as AGENTS.md, a `.claude/rules/` file),
  with its load_reason (session_start, include, path_glob_match, nested_traversal, compact), globs, trigger and parent
  file, and the file as it was on disk at that moment: a short hash and its core version ("Core v1"), if any.
- SessionStart: one record (source, model, the checkout's HEAD and origin/main), so a report tells "the harness did not
  run" from "nothing loaded". It prints nothing: SessionStart's output would go into the session's context.
- SubagentStart: one record, and one line of context for the subagent: the Manila time and the core's version line
  from origin/main's AGENTS.md (Explore and Plan load no CLAUDE.md: this line is what reaches them).

  python3 tools/instr_log.py --report [--since 10:30|2026-11-19T02:30] [--session ID]   per session and agent
  python3 tools/instr_log.py --expect [REF]   the canary texts the trial's agents quote, from REF (origin/main)

The log is <git common dir>/claude-instructions.jsonl: one file for the checkout and every worktree, never committed,
append-only. INSTR_LOG names another file (tests). The hooks run main's reviewed copy (`git show
origin/main:tools/instr_log.py` given with `python3 -I -c`, the JSON on stdin, after a bounded refresh in each event;
tests/hooks.test.js), so this file uses the standard library only. A recording error is a diagnostic on stderr with
exit 1. The hook is observational and cannot block the session. A subagent's inherited startup files fire no
InstructionsLoaded events (LAZY_ONLY).
"""

import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

MANILA = timezone(timedelta(hours=8))  # Asia/Manila, UTC+8 all year
LOG_NAME = 'claude-instructions.jsonl'
CORE = re.compile(r'Core v\d+\b[^.\n]*')  # the core's version line, the trial's canary (proposal §3)
RULE0 = re.compile(r'^> \*\*(After 17:30.*?)\*\*$', re.S | re.M)
# Claude Code (2.1.327, probed 2026-11-19) gives a general-purpose subagent the CLAUDE.md files and imports the session
# loaded without firing InstructionsLoaded for them; a file the subagent loads later (a nested CLAUDE.md, a path rule)
# fires it with the subagent's agent_id. So a subagent's count is its lazy loads; its quotes show what it started with.
LAZY_ONLY = ' (lazy loads only: its startup CLAUDE.md and imports are not logged)'


def git(cwd, *args, timeout=3):
    r = subprocess.run(['git', '-C', cwd] + list(args), capture_output=True, text=True, timeout=timeout)
    return r.stdout if r.returncode == 0 else None


def log_path(cwd):
    """The shared log: INSTR_LOG, else the git common dir of cwd (the main .git, from any worktree). None outside git."""
    if os.environ.get('INSTR_LOG'):
        return os.environ['INSTR_LOG']
    d = git(cwd, 'rev-parse', '--git-common-dir')
    return os.path.join(os.path.abspath(os.path.join(cwd, d.strip())), LOG_NAME) if d else None


def now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0)


def core_line(text):
    m = CORE.search(text or '')
    return m.group(0).strip() if m else None


def file_facts(p):
    """A short hash of the file as it is now and its core version line: which copy loaded, not only which path."""
    try:
        with open(p, 'rb') as f:
            b = f.read()
    except OSError:
        return {}
    return {'sha': hashlib.sha1(b).hexdigest()[:12], 'core': core_line(b.decode('utf-8', 'replace'))}


def record(ev):
    name = ev.get('hook_event_name')
    r = {'t': now_utc().isoformat(), 'ev': name, 'sid': ev.get('session_id'), 'aid': ev.get('agent_id'),
         'atype': ev.get('agent_type'), 'cwd': ev.get('cwd')}
    if name == 'InstructionsLoaded':
        r.update({k: ev.get(k) for k in ('file_path', 'load_reason', 'memory_type', 'globs', 'trigger_file_path',
                                          'parent_file_path')})
        r.update(file_facts(ev.get('file_path') or ''))
    elif name == 'SessionStart':
        cwd = ev.get('cwd') or '.'
        main = os.environ.get('REEF_HOOK_MAIN', '')[:9] or (git(cwd, 'rev-parse', '--short=9', 'origin/main') or '').strip()
        r.update({'source': ev.get('source'), 'model': ev.get('model'),
                  'head': (git(cwd, 'rev-parse', '--short=9', 'HEAD') or '').strip() or None,
                  'main': main or None})
    return {k: v for k, v in r.items() if v not in (None, '', [])}


def subagent_context(root):
    """The SubagentStart line: the Manila time and origin/main's core version (or that it has none yet)."""
    t = datetime.now(MANILA).strftime('%a %d %b %H:%M')
    ref = os.environ.get('REEF_HOOK_MAIN') or 'origin/main'
    core = core_line(git(root, 'show', ref + ':AGENTS.md') or '')
    c = '«%s»' % core if core else 'none yet (AGENTS.md before the core)'
    return ('Session hook (tools/instr_log.py): Manila time %s (Rule 0: AGENTS.md); the rules core on origin/main: %s.'
            % (t, c))


def hook(stdin, root):
    ev = json.loads(stdin)
    path = log_path(root) or log_path(ev.get('cwd') or '.')
    if not path:
        raise OSError('no log path')
    with open(path, 'a', encoding='utf-8') as f:
        f.write(json.dumps(record(ev), ensure_ascii=False) + '\n')
    if ev.get('hook_event_name') == 'SubagentStart':
        return json.dumps({'hookSpecificOutput': {'hookEventName': 'SubagentStart',
                                                  'additionalContext': subagent_context(root)}})
    return ''


# --- Reading the log -----------------------------------------------------------------------------------------------------


def since_utc(s, today=None):
    """--since: an ISO time (UTC unless it carries an offset), or HH:MM Manila today."""
    if re.fullmatch(r'\d{1,2}:\d\d', s):
        h, m = (int(x) for x in s.split(':'))
        d = (today or datetime.now(MANILA)).astimezone(MANILA)
        return d.replace(hour=h, minute=m, second=0, microsecond=0).astimezone(timezone.utc)
    t = datetime.fromisoformat(s)
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def read_log(path):
    out = []
    try:
        with open(path, encoding='utf-8') as f:
            for line in f:
                try:
                    out.append(json.loads(line))
                except ValueError:
                    pass
    except FileNotFoundError:
        pass
    return out


def short(p, cwd):
    if not p:
        return '?'
    m = re.search(r'/\.claude/worktrees/([^/]+)/(.*)$', p)
    if m:
        return 'worktree %s: %s' % m.groups()
    if cwd and p.startswith(cwd.rstrip('/') + '/'):
        return p[len(cwd.rstrip('/')) + 1:]
    return p


def report(rows, since=None, session=None):
    rows = [r for r in rows if (not since or datetime.fromisoformat(r['t']) >= since) and (not session or r.get('sid') == session)]
    if not rows:
        return ['No record%s. Check Claude hook diagnostics for a failed refresh or log write. The hooks may not have '
                'run here.' % (' since then' if since else '')]
    out, sessions = [], {}
    for r in rows:
        sessions.setdefault(r.get('sid') or '?', []).append(r)
    for sid, rs in sessions.items():
        starts = [r for r in rs if r['ev'] == 'SessionStart']
        s = starts[0] if starts else {}
        out.append('Session %s%s' % (sid[:8], ' (%s, %s, HEAD %s, origin/main %s)' % (
            s.get('source', '?'), s.get('t', '?')[:19], s.get('head', '?'), s.get('main', '?')) if s else
            ' (no SessionStart record)'))
        agents = {}
        for r in rs:
            agents.setdefault((r.get('aid') or '', r.get('atype') or ''), []).append(r)
        for (aid, atype), ars in agents.items():
            who = 'main agent' if not aid else '%s %s' % (atype or 'subagent', aid[:12])
            started = any(r['ev'] == 'SubagentStart' for r in ars)
            loads = [r for r in ars if r['ev'] == 'InstructionsLoaded']
            # A subagent's startup files (CLAUDE.md and its imports) fire no InstructionsLoaded: only its lazy loads do.
            out.append('  %s%s: %d file%s loaded%s' % (who, ' (SubagentStart given)' if started else '', len(loads),
                                                      '' if len(loads) == 1 else 's', LAZY_ONLY if aid else ''))
            for r in loads:
                bits = [r.get('load_reason', '?')]
                if r.get('trigger_file_path'):
                    bits.append('on ' + short(r['trigger_file_path'], r.get('cwd')))
                if r.get('globs'):
                    bits.append('globs ' + ','.join(r['globs']))
                if r.get('core'):
                    bits.append(r['core'])
                if r.get('sha'):
                    bits.append(r['sha'])
                out.append('    %s %s (%s)' % (r['t'][11:19], short(r.get('file_path'), r.get('cwd')), '; '.join(bits)))
    return out


def bullets(text):
    """Each top-level bullet of a Markdown text, its wrapped lines joined."""
    out = []
    for ln in text.split('\n'):
        if ln.startswith('- '):
            out.append(ln.strip())
        elif out and ln.startswith('  ') and ln.strip():
            out[-1] += ' ' + ln.strip()
        elif not ln.strip() or ln.startswith('#'):
            out.append('')  # a blank line or a heading ends the bullet
    return [b for b in out if b]


def expect(root, ref):
    """The texts the trial's agents must quote exactly (proposal §3, T1-T3), read from ref."""
    agents = git(root, 'show', ref + ':AGENTS.md')
    if agents is None:
        return ['%s:AGENTS.md not found' % ref]
    m = RULE0.search(agents)
    w27 = next((b for b in bullets(agents) if b.startswith('- **W27**') or re.search(r'\brules? W27\b', b)), None)
    return ['Rule 0: ' + (' '.join(x.lstrip('> ').strip() for x in m.group(1).split('\n')) if m else '(not found)'),
            'Core line: ' + (core_line(agents) or '(none: AGENTS.md before the core)'),
            'W27 line: ' + (w27.strip() if w27 else '(not found)')]


def main(argv):
    root = os.environ.get('CLAUDE_PROJECT_DIR') or os.getcwd()
    if argv and argv[0] in ('--report', '--expect', '-h', '--help'):
        if argv[0] in ('-h', '--help'):
            print(__doc__)
            return 0
        if argv[0] == '--expect':
            print('\n'.join(expect(root, argv[1] if len(argv) > 1 else 'origin/main')))
            return 0
        opts = dict(zip(argv[1::2], argv[2::2]))
        try:
            path = log_path(root)
            rows = read_log(path) if path else []
        except (OSError, subprocess.TimeoutExpired) as e:
            print('Instructions log: could not read the log (%s).' % type(e).__name__, file=sys.stderr)
            return 1
        since = since_utc(opts['--since']) if '--since' in opts else None
        print('Log: %s' % path)
        print('\n'.join(report(rows, since, opts.get('--session'))))
        return 0
    try:
        out = hook(sys.stdin.read(), root)
        if out:
            print(out)
    except Exception as e:
        print('Instructions log: could not record hook event (%s).' % type(e).__name__, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

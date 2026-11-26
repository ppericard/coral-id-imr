#!/usr/bin/env python3
"""Same-tree reuse of a PR's CI on its merge train (Pierre, 2026-11-26, REE-121 (a): «ok»; rule W26). A helper of
tools/train.py, which imports it from the integrator's checkout of main: nothing of a PR runs here.

A train of one PR whose tree is the very tree the PR's own CI tested (GitHub's merge of the reviewed head into the same
`main` commit) need not run that CI again. For each obligation of the train this proves equivalent evidence from the
PR's run or says why not; whatever it cannot prove runs on the train as before (the fallback is the ordinary train).

The obligations it may reuse, each whole or not at all:
- **Checks**: `checks` and both unit shards (the names tools/train.py reads from the train's checks.yml), from the
  PR head's latest Checks run. The one step whose work depends on the event is the versions check: a PR runs
  `check_versions.py --sheet-base HEAD^1`, a train `--main`. Its cache-busting part reads the tree only (same tree, same
  answer). Its `--main` sheet rules are what tools/train.py's build already runs on every train, with main's
  tools/sheet_version.py: `--check --main --base <base>`, which also checks against the base (the train's Checks run
  has no origin/main, so no base). So Checks is reused only when that ran, and when the train does not change
  tools/check_versions.py or tools/sheet_version.py (their train mode would then never have run).
- **answer cost**, the performance budget in smokes.yml: from the PR head's latest Smokes run (a code PR runs it on its
  merge commit; a docs-only PR has no Smokes run, so its train runs it).
- Never `browser scope` or a `smoke (…)` job: the browser matrix runs once on the train (REE-121 (d)).

Evidence for one obligation, all of it or the train runs the obligation:
- one PR in the train; the train changes no non-doc file that reads the event (GITHUB_REF, github.event…);
- the obligation's workflow file identical on the train and on its base (main's reviewed definition, so the PR run
  executed the very jobs the train would), its job blocks free of event-dependent input apart from the versions step
  and the reuse condition below, which each reused job carries;
- the latest run of that workflow file on the PR head: event pull_request, this repository for the run and its head,
  head SHA the pinned head, completed, success, attempt 1 (a re-run is never evidence, rule W23), at most MAX_AGE_H old;
- every required job in it exactly once, success, attempt 1, on the head, with the "tested commit" annotation its
  workflow step writes (the commit actions/checkout checked out and its tree), the same commit for every job;
- that commit read back from GitHub (never trusted from the annotation): parents exactly [base, head] (a stale head or
  base is refused) and its tree the train's tree. A synthetic merge commit GitHub no longer has: the train runs.

Modes (TRAIN_REUSE, default DEFAULT): `off` evaluates nothing; `shadow` evaluates and logs what it would reuse, and the
train runs everything (to measure it against ordinary trains first); `on` names the train branch
train/<time>-reuse-checks and/or -reuse-cost, and the workflows' job `if:` lines skip the reused jobs on that branch
only. ROLLBACK: TRAIN_REUSE=off, or DEFAULT = 'off' below: plain train/<time> branches, every job runs again.
After the merges, tools/train.py still compares main's tree with the train's and moves release only then; the Codex
reviews are never replaced by any of this.
"""
import json, os, re, subprocess
from datetime import datetime, timezone

import smoke_scope

DEFAULT = 'shadow'
MODE = os.environ.get('TRAIN_REUSE', DEFAULT)
MAX_AGE_H = 24  # a PR run older than this is stale: Node, Python and the runner image float within their pins
TITLE = 'tested commit'  # the annotation each reusable job writes (checks.yml, smokes.yml)
NOTE = re.compile(r'commit=([0-9a-f]{40}) tree=([0-9a-f]{40})')
# What a job could read of its event: on a PR and on a train these differ.
EVENT = re.compile(r'GITHUB_(?:EVENT_NAME|EVENT_PATH|REF|REF_NAME|REF_TYPE|HEAD_REF|BASE_REF|SHA)\b'
                   r'|github\.(?:event|event_name|ref|ref_name|ref_type|head_ref|base_ref|sha)\b')
# The job-level condition that skips a reused job on a reuse train, and only there.
IF_LINE = "    if: ${{ !(startsWith(github.ref, 'refs/heads/train/') && contains(github.ref, '-%s')) }}"
VERSION_TOOLS = ('tools/check_versions.py', 'tools/sheet_version.py')
# name, workflow (as the train waits for it), its file, its job keys, the branch token
OBLIGATIONS = (
    ('Checks', 'Checks', '.github/workflows/checks.yml', ('checks', 'unit'), 'reuse-checks'),
    ('answer cost', 'Smokes', '.github/workflows/smokes.yml', ('answercost',), 'reuse-cost'),
)


class No(Exception):
    """Why an obligation cannot be reused: it runs on the train."""


def job_block(src, key):
    m = re.search(r'^  %s:\n(.*?)(?=^  [\w-]+:\n|\Z)' % re.escape(key), src, re.M | re.S)
    return m.group(1) if m else None


def event_inputs(src, keys, token):
    """The job blocks' event-dependent text, after the declared exceptions: the versions step (its train mode is the
    build's sheet check) and the reuse `if:` line, which every block must carry. Raises No."""
    for key in keys:
        block = job_block(src, key)
        if block is None:
            raise No('no job %s in its workflow' % key)
        lines = block.split('\n')
        if (IF_LINE % token) not in lines:
            raise No('job %s has no reuse condition' % key)
        rest = '\n'.join(l for l in lines if l != IF_LINE % token)
        rest = ''.join(s for s in re.split(r'(?=\n      - )', rest) if 'tools/check_versions.py' not in s)
        hit = EVENT.search(rest)
        if hit:
            raise No('job %s reads its event (%s)' % (key, hit.group(0)))


def event_reads(top, train, paths):
    """The first of these paths whose text on the train reads its event, '' for none (a deleted path or a binary file
    reads nothing); an unreadable answer counts as a read."""
    if not paths:
        return ''
    r = subprocess.run(['git', 'cat-file', '--batch'], cwd=top, capture_output=True,
                       input=''.join('%s:%s\n' % (train, p) for p in paths).encode())
    if r.returncode:
        return 'unreadable'
    out, i = r.stdout, 0
    for p in paths:
        nl = out.index(b'\n', i)
        head = out[i:nl].split()
        if head[-1] == b'missing':
            i = nl + 1
            continue
        size = int(head[2])
        body = out[nl + 1:nl + 1 + size]
        i = nl + 1 + size + 1
        if b'\0' not in body and EVENT.search(body.decode('utf-8', 'replace')):
            return p
    return ''


def _age_h(stamp, now):
    try:
        return (now - datetime.strptime(stamp, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)).total_seconds() / 3600
    except (TypeError, ValueError):
        raise No('no completion time on the PR run')


class Plan:
    """The decision for one train: records (one per obligation), the branch suffix, the jobs left to wait for."""

    def __init__(self, mode, n, tree, records):
        self.mode, self.n, self.tree, self.records = mode, n, tree, records

    def reused(self):
        return [r for r in self.records if r['decision'] == 'reuse']

    def suffix(self):
        return ''.join('-' + r['token'] for r in self.reused()) if self.mode == 'on' else ''

    def want(self, want):
        """The expected jobs minus those reused (mode on only)."""
        out = {w: list(js) for w, js in want.items()}
        if self.mode == 'on':
            for r in self.reused():
                out[r['workflow']] = [j for j in out[r['workflow']] if j not in r['required']]
        return out

    def audit(self):
        """One line for the queue log."""
        if self.mode == 'off':
            return 'Reuse audit (off): every job runs on the train.'
        verb = 'reused' if self.mode == 'on' else 'would reuse'
        parts = []
        for r in self.records:
            if r['decision'] == 'reuse':
                parts.append('%s %s (PR run %s attempt %s, %d/%d jobs, merge %s = main %s + head %s%s)' % (
                    r['obligation'], verb, r['run'], r['attempt'], len(r['jobs']), len(r['required']), r['tested_commit'][:7],
                    r['base'][:7], r['head'][:7], '; sheet --main run here' if r['obligation'] == 'Checks' else ''))
            else:
                parts.append('%s runs (%s)' % (r['obligation'], r['why']))
        return 'Reuse audit (%s) #%s tree %s: %s; browser scope and matrix on the train%s.' % (
            self.mode, self.n, self.tree[:7], '; '.join(parts), '' if self.mode != 'shadow' else ', every job runs (shadow)')

    def shadow_check(self, bad):
        """Shadow mode, once the train has run: did it agree with what would have been reused? A line, or None."""
        if self.mode != 'shadow' or not self.reused():
            return None
        hit = [b for b in bad for r in self.reused() if any(b.startswith('%s › %s:' % (r['workflow'], j)) for j in r['required'])]
        if hit:
            return 'Reuse shadow DISAGREES: the train failed a job it would have reused: ' + '; '.join(hit)
        return 'Reuse shadow agrees: the train passed every job it would have reused (%s).' % ', '.join(r['obligation'] for r in self.reused())

    def write(self, path, **more):
        if path:
            with open(path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({'mode': self.mode, 'pr': self.n, 'tree': self.tree, 'obligations': self.records, **more}) + '\n')


def decide(api, git, *, repo, top, prs, base, train, tree, want, sheet_checked, mode=None, now=None):
    """The Plan for this train. api(path) and git(*args, cwd=) are tools/train.py's; prs [(n, head, title)]."""
    mode = mode or MODE
    if mode not in ('off', 'shadow', 'on'):
        mode = 'off'
    now = now or datetime.now(timezone.utc)
    n = prs[0][0] if len(prs) == 1 else '+'.join(p[0] for p in prs)
    if mode == 'off':
        return Plan(mode, n, tree, [])
    common = None
    if len(prs) != 1:
        common = '%d PRs in the train (single-PR trains only)' % len(prs)
    head = prs[0][1]
    try:
        changed = smoke_scope.changed(base, train, top)
    except smoke_scope.Unknown as e:
        changed, common = [], common or 'the train diff is unreadable (%s)' % e
    if not common:
        try:
            hit = event_reads(top, train, [p for p in changed if not smoke_scope.is_doc(p) and not p.startswith('.github/workflows/')])
        except Exception:
            hit = 'unreadable'
        if hit:
            common = 'the train changes code that reads its event (%s)' % hit
    runs = None
    records = []
    for name, workflow, wf, keys, token in OBLIGATIONS:
        required = list(want.get(workflow, [])) if name == 'Checks' else ['answer cost']
        rec = {'obligation': name, 'decision': 'run', 'why': '', 'token': token, 'workflow': workflow, 'required': required,
               'repository': repo, 'workflow_path': wf, 'base': base, 'head': head, 'train': train, 'train_tree': tree,
               'run': None, 'attempt': None, 'run_url': None, 'event': None, 'ref': None, 'tested_commit': '', 'jobs': [],
               'inputs': None, 'base_mode': ('PR --sheet-base HEAD^1; train --main by main\'s sheet_version.py --check --main --base %s'
                                             % base[:12]) if name == 'Checks' else 'none'}
        try:
            if common:
                raise No(common)
            if not required:
                raise No('no required job read for it')
            try:
                blob = git('rev-parse', '%s:%s' % (train, wf), cwd=top)
                same = blob == git('rev-parse', '%s:%s' % (base, wf), cwd=top)
            except Exception:
                raise No('%s unreadable on the train or its base' % wf)
            rec['workflow_blob'] = blob
            if not same:
                raise No('the PR changes %s' % wf)
            event_inputs(git('show', '%s:%s' % (train, wf), cwd=top), keys, token)
            rec['inputs'] = 'no event-dependent input outside the declared versions step'
            if name == 'Checks':
                if not sheet_checked:
                    raise No("main's tools/sheet_version.py did not run on the train")
                touched = [p for p in VERSION_TOOLS if p in changed]
                if touched:
                    raise No('the train changes %s: its --main mode never ran' % touched[0])
            if runs is None:
                runs = api('actions/runs?head_sha=%s&event=pull_request&per_page=100' % head).get('workflow_runs', [])
            mine = [r for r in runs if r.get('path') == wf]
            if not mine:
                raise No('no %s run on the PR head' % workflow)
            run = max(mine, key=lambda r: r['id'])
            rec.update(run=run['id'], attempt=run.get('run_attempt'), run_url=run.get('html_url'), event=run.get('event'),
                       ref=run.get('head_branch'), run_created=run.get('created_at'), run_updated=run.get('updated_at'))
            if run.get('event') != 'pull_request':
                raise No('its run is a %s event' % run.get('event'))
            if run.get('head_sha') != head:
                raise No('its run is on another head')
            if (run.get('repository') or {}).get('full_name') != repo or (run.get('head_repository') or {}).get('full_name') != repo:
                raise No('its run is not this repository\'s own')
            if run.get('status') != 'completed':
                raise No('its PR run is %s' % run.get('status'))
            if run.get('conclusion') != 'success':
                raise No('its PR run is %s' % run.get('conclusion'))
            if run.get('run_attempt') != 1:
                raise No('its PR run is attempt %s (a re-run is no evidence)' % run.get('run_attempt'))
            age = _age_h(run.get('updated_at'), now)
            if age > MAX_AGE_H:
                raise No('its PR run is stale (%.0f h old)' % age)
            jobs = api('actions/runs/%s/jobs?per_page=100' % run['id']).get('jobs', [])
            commit = None
            for j in required:
                got = [x for x in jobs if x.get('name') == j]
                if len(got) != 1:
                    raise No('%s %s in the PR run' % (j, 'missing' if not got else 'there %d times' % len(got)))
                x = got[0]
                rec['jobs'].append({'name': j, 'id': x.get('id'), 'attempt': x.get('run_attempt'), 'conclusion': x.get('conclusion'),
                                    'url': x.get('html_url'), 'labels': x.get('labels')})
                if x.get('conclusion') != 'success':
                    raise No('%s is %s in the PR run' % (j, x.get('conclusion') or x.get('status')))
                if x.get('run_attempt') != 1:
                    raise No('%s has no attempt 1 in the PR run' % j)
                if x.get('head_sha') != head:
                    raise No('%s ran on another head' % j)
                notes = [m for a in api('check-runs/%s/annotations?per_page=100' % x['id']) if isinstance(a, dict) and a.get('title') == TITLE
                         for m in [NOTE.fullmatch((a.get('message') or '').strip())] if m]
                if len(notes) != 1:
                    raise No('%s has no tested-commit record' % j)
                if commit not in (None, notes[0].groups()):
                    raise No('the PR jobs tested different commits')
                commit = notes[0].groups()
            rec['tested_commit'] = commit[0]
            try:
                c = api('git/commits/%s' % commit[0])
            except Exception:
                raise No('its tested merge commit %s is gone' % commit[0][:7])
            parents = [p.get('sha') for p in c.get('parents', [])]
            rec.update(tested_tree=(c.get('tree') or {}).get('sha'), tested_parents=parents)
            if len(parents) != 2 or parents[1] != head:
                raise No('stale head: its PR run tested %s' % (parents[1][:7] if len(parents) == 2 else 'no merge'))
            if parents[0] != base:
                raise No('stale base: its PR run tested on main %s, the train is on %s' % (parents[0][:7], base[:7]))
            if rec['tested_tree'] != tree or commit[1] != tree:
                raise No('its PR run tested tree %s, the train is %s' % ((rec['tested_tree'] or '?')[:7], tree[:7]))
            rec['decision'] = 'reuse'
        except No as e:
            rec['why'] = str(e)
        except Exception as e:  # an API or git answer it cannot read: never a reason to reuse
            rec['why'] = 'evidence unreadable (%s)' % (str(e).splitlines() or ['?'])[0][:80]
        records.append(rec)
    return Plan(mode, n, tree, records)

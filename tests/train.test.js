require('./slot.js').testGuard();
// The merge train (Pierre, 2026-11-08, Q305 b; rule W26; tools/train.py), on throwaway repositories: a bare "origin" with
// main and the PRs' heads under refs/pull/N/head, the integrator's clone, and a stand-in for gh on PATH that answers the
// REST calls from a state file, logs each one, and squash-merges in the bare repository as GitHub would.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync, execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  TRAIN = path.join(ROOT, 'tools', 'train.py');

// The stand-in for gh: only `gh api repos/R/<path> [-X PUT -f k=v…]`.
const FAKE_GH = String.raw`#!/usr/bin/env python3
import json, os, re, subprocess, sys
st_path, origin = os.environ['FAKE_GH_STATE'], os.environ['FAKE_GH_ORIGIN']
st = json.load(open(st_path))
a = sys.argv[1:]
assert a[0] == 'api', a
path = re.sub(r'^repos/[^/]+/[^/]+/', '', a[1])
method = a[a.index('-X') + 1] if '-X' in a else 'GET'
fields = dict(a[i + 1].split('=', 1) for i, x in enumerate(a) if x == '-f')
open(os.environ['FAKE_GH_LOG'], 'a').write(method + ' ' + path + '\n')
g = lambda *c: subprocess.run(['git', '-C', origin, *c], capture_output=True, text=True, check=True).stdout.strip()
def out(o):
    print(json.dumps(o))
    sys.exit(0)
m = re.match(r'pulls/(\d+)$', path)
if m and method == 'GET':
    p = st['prs'][m.group(1)]
    out({'state': p.get('state', 'open'), 'base': {'ref': 'main'}, 'draft': p.get('draft', False), 'title': p['title'], 'body': p.get('body'), 'user': {'login': p.get('user', 'claude')},
         'labels': [{'name': l} for l in p.get('labels', [])],
         'head': {'sha': g('rev-parse', 'refs/pull/%s/head' % m.group(1)), 'repo': {'full_name': 'o/r'}}})
m = re.match(r'commits/(\w+)/check-runs', path)
if m:
    out({'check_runs': st.get('checks', {}).get(m.group(1), [{'name': 'checks', 'status': 'completed', 'conclusion': 'success'}])})
# The PR head's own runs (REE-121 (a)): the state's pr_runs on that head, their jobs under jobs, their annotations.
if path.startswith('actions/runs?') and 'event=pull_request' in path:
    h = re.search(r'head_sha=(\w+)', path).group(1)
    out({'workflow_runs': [r for r in st.get('pr_runs', []) if r.get('head_sha') == h]})
m = re.match(r'check-runs/(\d+)/annotations', path)
if m:
    out(st.get('annotations', {}).get(m.group(1), []))
if path.startswith('actions/runs?'):
    for ref, sha in st.get('move_during_ci', {}).items():
        g('update-ref', ref, sha)
    st['train_sha'] = re.search(r'head_sha=(\w+)', path).group(1)
    json.dump(st, open(st_path, 'w'))
    out({'workflow_runs': st.get('train_runs', [])})
m = re.match(r'actions/runs/(\d+)/jobs', path)
if m:
    if m.group(1) in st.get('jobs', {}):
        out({'jobs': st['jobs'][m.group(1)]})
    sha = st['train_sha']
    ref = g('for-each-ref', '--points-at', sha, '--format=%(refname)', 'refs/heads/train/').split('\n')[0]
    # A job's own if: on this push, as the train's workflow file writes it (only the reuse condition has one here).
    def skipped(wf, key):
        src = g('show', '%s:.github/workflows/%s' % (sha, wf))
        blk = re.search(r'^  %s:\n(.*?)(?=^  [\w-]+:\n|\Z)' % key, src, re.M | re.S).group(1)
        c = re.search(r"^    if: \x24\{\{ !\(startsWith\(github\.ref, 'refs/heads/train/'\) && contains\(github\.ref, '([\w-]+)'\)\) \}\}$", blk, re.M)
        return bool(c) and ref.startswith('refs/heads/train/') and c.group(1) in ref
    if m.group(1) == '11':
        if skipped('checks.yml', 'checks') and skipped('checks.yml', 'unit'):
            out({'jobs': [{'name': 'checks', 'conclusion': 'skipped'}, {'name': 'unit tests (\x24{{ matrix.shard }}/2)', 'conclusion': 'skipped'}]})
        out({'jobs': [{'name': n, 'conclusion': 'success'} for n in st['checks_jobs']]})
    # Smokes: the scope job's answer on the pushed train (scope.py runs the workflow's own steps), unless the state forces one.
    said = subprocess.run([sys.executable, os.environ['FAKE_SCOPE'], origin, sha, ref], capture_output=True, text=True).stdout.split()[0]
    open(os.environ['FAKE_GH_LOG'] + '.scope', 'a').write(said + '\n')
    browser = st.get('scope_says', said) == 'browser=true'
    smoke = [{'name': 'smoke (%s)' % n, 'conclusion': 'success'} for n in st['smoke_names']] if browser else [{'name': 'smoke (\x24{{ matrix.name }})', 'conclusion': 'skipped'}]
    cost = 'skipped' if skipped('smokes.yml', 'answercost') else 'success'
    out({'jobs': [{'name': 'browser scope', 'conclusion': 'success'}, {'name': 'answer cost', 'conclusion': cost}] + smoke})
if path == 'git/ref/heads/main':
    if st.get('main_moved_during_build'):
        g('update-ref', 'refs/heads/main', st['main_moved_during_build'])
    out({'object': {'sha': g('rev-parse', 'refs/heads/main')}})
m = re.match(r'git/commits/(\w+)$', path)
if m:
    c = m.group(1)
    if subprocess.run(['git', '-C', origin, 'cat-file', '-e', c + '^{commit}'], capture_output=True).returncode:
        print(json.dumps({'message': 'Not Found'}))
        sys.exit(1)
    # tree_override: main's commits only (the tree check after the merges), never a PR's tested merge commit
    on_main = not subprocess.run(['git', '-C', origin, 'merge-base', '--is-ancestor', c, 'refs/heads/main'], capture_output=True).returncode
    out({'tree': {'sha': (on_main and st.get('tree_override')) or g('rev-parse', c + '^{tree}')},
         'parents': [{'sha': p} for p in g('log', '-1', '--format=%P', c).split()]})
m = re.match(r'pulls/(\d+)/merge$', path)
if m and method == 'PUT':
    head = g('rev-parse', 'refs/pull/%s/head' % m.group(1))
    assert fields['sha'] == head and fields['merge_method'] == 'squash', fields
    tree = g('merge-tree', '--write-tree', 'refs/heads/main', head).split()[0]
    c = g('-c', 'user.name=GitHub', '-c', 'user.email=gh@example.com', 'commit-tree', tree, '-p', 'refs/heads/main', '-m', fields['commit_title'])
    g('update-ref', 'refs/heads/main', c)
    if st.get('publish_after_merge'):  # a Publish lands right after the first merge
        st.pop('publish_after_merge')
        json.dump(st, open(st_path, 'w'))
        t = g('rev-parse', 'refs/heads/main^{tree}')
        p = g('-c', 'user.name=Pierre', '-c', 'user.email=p@example.com', 'commit-tree', t, '-p', c, '-m', 'Photo curation: x')
        g('update-ref', 'refs/heads/main', p)
    out({'sha': c, 'merged': True})
print(json.dumps({'message': 'Not Found: ' + method + ' ' + path}))
sys.exit(1)
`;

// The Smokes workflow's "browser scope" job on the throwaway origin: what actions/checkout fetches (the run's commit, 50
// generations, no file contents), the job's own fetch line read from smokes.yml, then tools/smoke_scope.py with the
// push event's variables. Prints "browser=true|false" (what it wrote to GITHUB_OUTPUT, "none" without it), then its line.
const SCOPE_PY = String.raw`#!/usr/bin/env python3
import os, re, subprocess, sys, tempfile
origin, sha, ref = sys.argv[1:4]
yml, script = os.environ['FAKE_SCOPE_YML'], os.environ['FAKE_SCOPE_SCRIPT']
fetch = re.search(r'\n {8}run: (git fetch .*)\n', open(yml).read()).group(1)
with tempfile.TemporaryDirectory() as d:
    run = lambda *c, env=None: subprocess.run(c, cwd=d, capture_output=True, text=True, env=env)
    run('git', 'init', '-q')
    run('git', 'remote', 'add', 'origin', 'file://' + origin)
    run('git', 'fetch', '-q', '--no-tags', '--filter=blob:none', '--depth=50', 'origin', '+%s:refs/remotes/origin/run' % sha)
    run('bash', '-c', fetch)
    out = os.path.join(d, 'out')
    r = run(sys.executable, script, env={**os.environ, 'GITHUB_EVENT_NAME': 'push', 'GITHUB_REF': ref, 'GITHUB_SHA': sha, 'GITHUB_OUTPUT': out})
    print(open(out).read().strip() if os.path.exists(out) else 'none', r.stdout.strip())
`;
// The jobs the real workflow files name: the smoke matrix's names, and the unit shards.
const WF = f => fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');
const SMOKE_NAMES = [
  ...WF('smokes.yml')
    .split('\n  smoke:\n')[1]
    .split('\n    steps:')[0]
    .matchAll(/\n\s+- name: (.+)/g)
].map(m => m[1]);
const CHECKS_JOBS = [
  'checks',
  .../\n\s+shard: \[([\d, ]+)\]\n/
    .exec(WF('checks.yml'))[1]
    .split(',')
    .map((k, _, a) => `unit tests (${k.trim()}/${a.length})`)
];

// origin with main and PRs 1-6: 1 and 2 touch b.txt and c.txt, 3 conflicts with 1, 4 still holds a sheet changes file,
// 6 brings its own tools/sheet_version.py (which must never run); extra: some of PRs 7-10 (below).
const fixture = (...extra) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'train-')),
    origin = path.join(d, 'origin.git'),
    work = path.join(d, 'work'),
    clone = path.join(d, 'clone'),
    bin = path.join(d, 'bin');
  const git = (cwd, ...a) =>
    execFileSync('git', ['-C', cwd, '-c', 'user.name=T', '-c', 'user.email=t@example.com', ...a], {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
  const put = (f, s) => {
    fs.mkdirSync(path.dirname(path.join(work, f)), {recursive: true});
    fs.writeFileSync(path.join(work, f), s);
  };
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  execFileSync('git', ['init', '-q', '-b', 'main', work]);
  put('a.txt', 'a\n');
  put('b.txt', 'b\n');
  put('tools/sync/changes/README.md', '# Changes\n');
  put('docs/old.md', '# Old\n');
  // main's sheet validator, a stand-in that says how it was run (the train-mode check tools/train_reuse.py counts on).
  put(
    'tools/sheet_version.py',
    `import sys\nopen(${JSON.stringify(path.join(d, 'sheet-ran'))}, 'a').write(' '.join(sys.argv[1:]) + '\\n')\n`
  );
  // The real workflow files: tools/train.py reads the jobs a train must run from the train's own copies.
  for (const f of ['smokes.yml', 'checks.yml']) put('.github/workflows/' + f, WF(f));
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'main');
  git(work, 'push', '-q', origin, 'main');
  // A PR: files to write ({path: text}) and to delete (git rm), or a rename [from, to].
  const pr = (n, files, rm = [], mv = null) => {
    git(work, 'checkout', '-q', '-B', 'pr' + n, 'main');
    for (const [f, s] of Object.entries(files)) put(f, s);
    for (const f of rm) git(work, 'rm', '-q', f);
    if (mv) {
      fs.mkdirSync(path.dirname(path.join(work, mv[1])), {recursive: true});
      git(work, 'mv', mv[0], mv[1]);
    }
    git(work, 'add', '-A');
    git(work, 'commit', '-q', '-m', 'pr ' + n);
    git(work, 'push', '-q', origin, `HEAD:refs/pull/${n}/head`);
    return git(work, 'rev-parse', 'HEAD');
  };
  const heads = {
    1: pr(1, {'b.txt': 'b one\n'}),
    2: pr(2, {'c.txt': 'c\n'}),
    3: pr(3, {'b.txt': 'b three\n'}),
    4: pr(4, {'tools/sync/changes/claude-x.md': 'an entry\n'}),
    5: pr(5, {'d.txt': 'd\n'}),
    6: pr(6, {'tools/sheet_version.py': `open(${JSON.stringify(path.join(d, 'ran'))}, 'w').write('pr code ran')\nraise SystemExit(1)\n`})
  };
  // Rule W12 (REE-121 (b), (d)), only for the tests that ask (each PR costs a few git calls): docs only (a doc under
  // docs/, a *.md at the root, the PR template, LICENSE); a doc renamed out of docs/ (mixed); a code file deleted; a
  // README.md that is not at the root (code to GitHub).
  const more = {
    7: () =>
      pr(7, {
        'docs/old.md': '# Old, edited\n',
        'docs/new/n.md': 'n\n',
        'NOTES.md': 'x\n',
        '.github/pull_request_template.md': 't\n',
        LICENSE: 'l\n'
      }),
    8: () => pr(8, {}, [], ['docs/old.md', 'tools/old.md']),
    9: () => pr(9, {}, ['a.txt']),
    10: () => pr(10, {'tools/README.md': '# Tools\n'}),
    // REE-121 (a): a PR that changes the Checks workflow, one whose test reads its event, one that changes a versions tool.
    11: () => pr(11, {'.github/workflows/checks.yml': WF('checks.yml') + '# changed\n'}),
    12: () => pr(12, {'tests/x.test.js': 'if (process.env.GITHUB_REF) {}\n'}),
    13: () => pr(13, {'tools/check_versions.py': 'print(1)\n'})
  };
  for (const n of extra) heads[n] = more[n]();
  execFileSync('git', ['clone', '-q', origin, clone], {stdio: 'pipe'});
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gh'), FAKE_GH, {mode: 0o755});
  fs.writeFileSync(path.join(d, 'scope.py'), SCOPE_PY);
  const state = path.join(d, 'state.json'),
    log = path.join(d, 'gh.log');
  const runs = c => [
    {id: 11, name: 'Checks', status: 'completed', conclusion: 'success'},
    {id: 12, name: 'Smokes', status: 'completed', conclusion: c}
  ];
  const setState = (o = {}) =>
    fs.writeFileSync(
      state,
      JSON.stringify({
        prs: Object.fromEntries(Object.keys(heads).map(n => [n, {title: 'PR ' + n}])),
        train_runs: runs('success'),
        smoke_names: SMOKE_NAMES,
        checks_jobs: CHECKS_JOBS,
        ...o
      })
    );
  setState();
  const trainEnv = (more, ...a) =>
    spawnSync('python3', [TRAIN, ...a], {
      cwd: clone,
      encoding: 'utf-8',
      env: {
        ...process.env,
        PATH: bin + path.delimiter + process.env.PATH,
        FAKE_GH_STATE: state,
        FAKE_GH_ORIGIN: origin,
        FAKE_GH_LOG: log,
        FAKE_SCOPE: path.join(d, 'scope.py'),
        FAKE_SCOPE_YML: path.join(ROOT, '.github', 'workflows', 'smokes.yml'),
        FAKE_SCOPE_SCRIPT: path.join(ROOT, 'tools', 'smoke_scope.py'),
        TRAIN_REPO: 'o/r',
        TRAIN_POLL: '0',
        GIT_AUTHOR_NAME: 'T',
        GIT_AUTHOR_EMAIL: 't@example.com',
        GIT_COMMITTER_NAME: 'T',
        GIT_COMMITTER_EMAIL: 't@example.com',
        ...more
      }
    });
  const train = (...a) => trainEnv({}, ...a);
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').trim().split('\n') : []);
  // What the scope job said on each look at the train's Smokes jobs.
  const scopes = () =>
    fs.existsSync(log + '.scope')
      ? fs
          .readFileSync(log + '.scope', 'utf-8')
          .trim()
          .split('\n')
      : [];
  // The scope job on a commit pushed to origin under ref: [what it wrote, its line].
  const scopeOn = (sha, ref) => {
    const r = spawnSync('python3', [path.join(d, 'scope.py'), origin, sha, ref], {
      encoding: 'utf-8',
      env: {
        ...process.env,
        FAKE_SCOPE_YML: path.join(ROOT, '.github', 'workflows', 'smokes.yml'),
        FAKE_SCOPE_SCRIPT: path.join(ROOT, 'tools', 'smoke_scope.py')
      }
    });
    const [said, ...why] = r.stdout.trim().split(' ');
    return [said, why.join(' ')];
  };
  const og = (...a) => execFileSync('git', ['-C', origin, ...a], {encoding: 'utf-8'}).trim();
  const trains = () => og('for-each-ref', '--format=%(refname)', 'refs/heads/train/').split('\n').filter(Boolean);
  // The release branch in origin: its commit, or '' when there is none.
  const release = () => {
    try {
      return og('rev-parse', '--verify', '-q', 'refs/heads/release');
    } catch (e) {
      return '';
    }
  };
  // A commit on top of the given one, made in origin itself (to put a release branch somewhere).
  const commitOn = (parent, msg) =>
    execFileSync('git', ['-C', origin, 'commit-tree', parent + '^{tree}', '-p', parent, '-m', msg], {
      encoding: 'utf-8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'T',
        GIT_AUTHOR_EMAIL: 't@example.com',
        GIT_COMMITTER_NAME: 'T',
        GIT_COMMITTER_EMAIL: 't@example.com'
      }
    }).trim();
  // GitHub's synthetic merge of a PR head into a main commit (what a PR run checks out), made in origin; tree: another one.
  const prMerge = (head, base = og('rev-parse', 'main'), tree = og('merge-tree', '--write-tree', base, head).split('\n')[0]) =>
    execFileSync('git', ['-C', origin, 'commit-tree', tree, '-p', base, '-p', head, '-m', 'Merge into main'], {
      encoding: 'utf-8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'GitHub',
        GIT_AUTHOR_EMAIL: 'gh@example.com',
        GIT_COMMITTER_NAME: 'GitHub',
        GIT_COMMITTER_EMAIL: 'gh@example.com'
      }
    }).trim();
  return {
    d,
    clone,
    heads,
    prMerge,
    setState,
    runs,
    train,
    trainEnv,
    calls,
    scopes,
    scopeOn,
    origin,
    og,
    trains,
    release,
    commitOn,
    done: () => fs.rmSync(d, {recursive: true, force: true})
  };
};
const noWorktreeLeft = f =>
  assert.deepStrictEqual(fs.readdirSync(path.join(f.clone, '.claude', 'worktrees')), [], 'the train worktree is removed');

test('--dry-run checks the PRs and builds the train, pushes and merges nothing', () => {
  const f = fixture();
  try {
    const main = f.og('rev-parse', 'main');
    const r = f.train('--dry-run', '1', '2');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`Train on main ${main.slice(0, 7)}: #1 ${f.heads[1].slice(0, 7)}, #2 ${f.heads[2].slice(0, 7)}`));
    assert.match(
      r.stdout,
      /Dry run: would push train\/\d{8}-\d{6}, wait for Checks and Smokes on it, then squash-merge #1, #2 in this order/
    );
    assert.deepStrictEqual(f.trains(), []);
    assert.strictEqual(f.og('rev-parse', 'main'), main);
    assert.strictEqual(f.release(), '', 'a dry run creates no release branch');
    assert.match(r.stdout, /move release to the commit main ends on/);
    assert.ok(
      f.calls().every(c => c.startsWith('GET ')),
      f.calls().join('\n')
    );
    noWorktreeLeft(f);
  } finally {
    f.done();
  }
});

test('a reviewed head behind main can train without moving its PR branch', () => {
  const f = fixture();
  try {
    const sha = f.heads[1];
    const dry = f.train('--dry-run', '--sha', sha, '1');
    assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
    f.og('update-ref', 'refs/heads/main', f.heads[2]); // main advances between the two invocations
    const r = f.train('--sha', sha, '1');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const [branch] = f.trains();
    assert.deepStrictEqual(f.og('show', '-s', '--format=%P', branch).split(' '), [f.heads[2], sha]);
    assert.strictEqual(f.og('show', 'main:b.txt'), 'b one');
    assert.strictEqual(f.og('show', 'main:c.txt'), 'c');
    assert.strictEqual(f.og('rev-parse', 'refs/pull/1/head'), sha);
    assert.strictEqual(f.og('rev-parse', 'main^{tree}'), f.og('rev-parse', branch + '^{tree}'));
    assert.deepStrictEqual(
      f.calls().filter(call => call.startsWith('PUT ')),
      ['PUT pulls/1/merge']
    );
  } finally {
    f.done();
  }
});

test('a conflicting reviewed head behind main is left for the integrator', () => {
  const f = fixture();
  try {
    f.og('update-ref', 'refs/heads/main', f.heads[3]); // main and #1 both change b.txt
    const r = f.train('--dry-run', '--sha', f.heads[1], '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /#1 conflicts with main/);
    assert.deepStrictEqual(f.trains(), []);
    assert.strictEqual(f.og('rev-parse', 'refs/pull/1/head'), f.heads[1]);
    assert.strictEqual(f.og('rev-parse', 'main'), f.heads[3]);
    noWorktreeLeft(f);
  } finally {
    f.done();
  }
});

test('the train refuses to substitute a new head after the pinned dry run', () => {
  const f = fixture();
  try {
    const sha = f.heads[1];
    const dry = f.train('--dry-run', '--sha', sha, '1');
    assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
    f.og('update-ref', 'refs/pull/1/head', f.heads[2]);
    const callCount = f.calls().length;
    const r = f.train('--sha', sha, '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /#1 head moved since its gates passed/);
    assert.deepStrictEqual(f.calls().slice(callCount), ['GET pulls/1']);
    assert.deepStrictEqual(f.trains(), []);
  } finally {
    f.done();
  }
});

test('main moving during the build stops the train before pushing', () => {
  const f = fixture();
  try {
    f.setState({main_moved_during_build: f.heads[2]});
    const r = f.train('--sha', f.heads[1], '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /main moved to \w+ while building the train: nothing pushed/);
    assert.deepStrictEqual(f.trains(), []);
    assert.strictEqual(f.release(), '');
    noWorktreeLeft(f);
  } finally {
    f.done();
  }
});

test('main or the pinned head moving during CI stops the train before any merge', () => {
  for (const [ref, message] of [
    ['refs/heads/main', /main moved to \w+ before #1/],
    ['refs/pull/1/head', /#1 got a new head since the train was built/]
  ]) {
    const f = fixture();
    try {
      f.setState({move_during_ci: {[ref]: f.heads[2]}});
      const r = f.train('--sha', f.heads[1], '1');
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, message);
      assert.strictEqual(f.trains().length, 1);
      assert.ok(!f.calls().some(call => call.startsWith('PUT ')));
      assert.strictEqual(f.release(), '');
    } finally {
      f.done();
    }
  }
});

test("the sheet check runs main's validator, never one a PR's head brings (Codex security review #757)", () => {
  const f = fixture();
  try {
    const r = f.train('--dry-run', '6');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.ok(!fs.existsSync(path.join(f.d, 'ran')), "the PR's tools/sheet_version.py ran");
  } finally {
    f.done();
  }
});

test('a PR not ready (needs-pierre, a draft, red checks, a sheet changes file) stops it before anything is built', () => {
  const f = fixture();
  try {
    f.setState({
      prs: {1: {title: 'PR 1', labels: ['needs-pierre']}, 2: {title: 'PR 2', draft: true}, 4: {title: 'PR 4'}, 5: {title: 'PR 5'}},
      checks: {[f.heads[5]]: [{name: 'smoke (fish)', status: 'completed', conclusion: 'failure'}]}
    });
    const r = f.train('1', '2', '4', '5');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /#1: labelled needs-pierre/);
    assert.match(r.stdout, /#2: a draft/);
    assert.match(r.stdout, /#4: still holds tools\/sync\/changes\/claude-x\.md: assign its sheet VERSION first/);
    assert.match(r.stdout, /#5: not green on its head \w+ \(smoke \(fish\): failure\)/);
    assert.deepStrictEqual(f.trains(), []);
  } finally {
    f.done();
  }
});

// AGENTS.md "Working mode", "Easy to correct" (Pierre, 2026-11-18): from TRAIN_BODY_FROM on, the description is
// part of the contract. PRs 1-6 stand for PRs past that number here.
const BODY = (players, choices = 'None') =>
  `## What and why\n\nX.\n\n## Choices I made (need Pierre)\n\n<!-- a comment -->\n\n${choices}\n\n` +
  `## Players see or play differently?\n\n<!-- No / Yes -->\n\n${players}\n\n## Tests\n\nRan.\n`;

test('the description: "Choices I made" None, and each change players see quoted from Pierre with its date or marked integrator\'s call', () => {
  const f = fixture();
  try {
    f.setState({
      prs: {
        1: {title: 'PR 1', body: BODY('No.')},
        2: {
          title: 'PR 2',
          body: BODY(
            "Yes:\n- The exam keeps photos for the end (Pierre, 2026-11-17: «Je pensais qu'on gardait des photos pour la fin»).\n- The button turns grey while saving (integrator's call, easy to correct)."
          )
        },
        3: {title: 'PR 3', body: BODY('Yes:\n- Probes slipped into the quiz, as Pierre wanted.')},
        4: {title: 'PR 4', body: BODY('No', 'The order of the tabs.')},
        5: {title: 'PR 5', body: BODY('')},
        6: {title: 'PR 6', body: BODY('Yes:')}
      }
    });
    const env = {TRAIN_BODY_FROM: '1'};
    const r = f.trainEnv(env, '--dry-run', '1', '2', '3', '4', '5', '6');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /#1:/);
    assert.doesNotMatch(r.stdout, /#2:/);
    assert.match(
      r.stdout,
      /#3: "Players see" names a change with neither Pierre's words quoted and dated nor "integrator's call": "Probes slipped/
    );
    assert.match(r.stdout, /#4: "Choices I made" is not None/);
    assert.match(r.stdout, /#5: "Players see or play differently\?" is empty/);
    assert.match(r.stdout, /#6: "Players see" says Yes but names no change/);
    const good = f.trainEnv(env, '--dry-run', '1', '2');
    assert.strictEqual(good.status, 0, good.stdout + good.stderr);
    assert.deepStrictEqual(f.trains(), []);
  } finally {
    f.done();
  }
});

test('a PR before TRAIN_BODY_FROM keeps the older template: its description is not checked', () => {
  const f = fixture();
  try {
    f.setState({prs: {1: {title: 'PR 1', body: 'An old description, no sections.'}}});
    const r = f.trainEnv({TRAIN_BODY_FROM: '2'}, '--dry-run', '1');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  } finally {
    f.done();
  }
});

// Integrator review of #1117: "None" followed by an explanation is None; a STATUS handover and Dependabot's PRs carry no
// template sections and still ride trains (rules W26, W9).
// Codex review #1117: a numbered list is one item per entry, so a source on one change does not cover the next.
test('the description check reads numbered lists item by item', () => {
  const f = fixture();
  try {
    f.setState({
      prs: {
        1: {title: 'PR 1', body: BODY("Yes:\n1. The button turns grey (integrator's call).\n2. Replace the progression model.")},
        2: {title: 'PR 2', body: BODY("Yes:\n1) The button turns grey (integrator's call).\n2) Pierre, 2026-11-18: «ok pour la liste».")}
      }
    });
    const r = f.trainEnv({TRAIN_BODY_FROM: '1'}, '--dry-run', '1', '2');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /#1: "Players see" names a change .*"Replace the progression model\./);
    assert.doesNotMatch(r.stdout, /#2:/);
  } finally {
    f.done();
  }
});

test('the description check accepts "None. …", a STATUS handover and a Dependabot PR', () => {
  const f = fixture();
  try {
    f.setState({
      prs: {
        1: {title: 'PR 1', body: BODY('No.', 'None. Every product choice is a question in STATUS.')},
        2: {title: 'STATUS: handover (2026-11-18 ~19:30)', body: '## Summary\n\nWhere things stand.\n'},
        5: {title: 'Bump actions/checkout from 4 to 5', body: 'Bumps actions/checkout.', user: 'dependabot[bot]'}
      }
    });
    const r = f.trainEnv({TRAIN_BODY_FROM: '1'}, '--dry-run', '1', '2', '5');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  } finally {
    f.done();
  }
});

test('a conflict between two PRs of the train stops it, nothing pushed', () => {
  const f = fixture();
  try {
    const r = f.train('1', '3');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /#3 conflicts with main and the PRs before it in the train/);
    assert.deepStrictEqual(f.trains(), []);
    noWorktreeLeft(f);
  } finally {
    f.done();
  }
});

test("green: one train pushed, each PR squash-merged in order at its tested head, main ends on the train's tree", () => {
  const f = fixture();
  try {
    const r = f.train('2', '1', '5');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const [branch] = f.trains();
    assert.match(branch, /^refs\/heads\/train\/\d{8}-\d{6}$/);
    assert.strictEqual(f.og('rev-parse', 'main^{tree}'), f.og('rev-parse', branch + '^{tree}'));
    assert.deepStrictEqual(f.og('log', '--format=%s', 'main').split('\n'), ['PR 5 (#5)', 'PR 1 (#1)', 'PR 2 (#2)', 'main']);
    assert.match(r.stdout, /its tree is the train's, what was tested is what went live/);
    const calls = f.calls();
    assert.ok(
      calls.every(c => /^(GET|PUT) /.test(c)),
      calls.join('\n')
    );
    assert.deepStrictEqual(
      calls.filter(c => c.startsWith('PUT')),
      ['PUT pulls/2/merge', 'PUT pulls/1/merge', 'PUT pulls/5/merge']
    );
    assert.ok(!calls.some(c => /update-branch/.test(c)), 'no update-branch');
    assert.strictEqual(f.og('rev-parse', 'release'), f.og('rev-parse', 'main'), 'release is created on the commit main ends on');
    assert.match(r.stdout, /release created at \w{7}: the sheet script takes its code from here/);
    noWorktreeLeft(f);
  } finally {
    f.done();
  }
});

test('red: nothing merged, the failing job named', () => {
  const f = fixture();
  try {
    const main = f.og('rev-parse', 'main');
    f.setState({
      train_runs: f.runs('failure'),
      jobs: {
        12: [
          {name: 'smoke (pages rest)', conclusion: 'failure'},
          {name: 'smoke (fish)', conclusion: 'success'}
        ]
      }
    });
    const r = f.train('1', '2');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /the train is red or incomplete, nothing merged[\s\S]*Smokes › smoke \(pages rest\): failure/);
    assert.ok(!/smoke \(fish\)/.test(r.stdout));
    assert.strictEqual(f.og('rev-parse', 'main'), main);
    assert.ok(!f.calls().some(c => c.startsWith('PUT')));
    assert.strictEqual(f.release(), '', 'a red train never creates release');
  } finally {
    f.done();
  }
});

test('main moved after a merge (a Publish landed): it stops, the rest waits for a new train', () => {
  const f = fixture();
  try {
    f.setState({publish_after_merge: true});
    const r = f.train('1', '2');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /main moved to \w+ before #2 \(a Publish, an Action or another merge landed\)/);
    assert.match(r.stdout, /merged: #1; not merged: #2/);
    assert.deepStrictEqual(f.og('log', '--format=%s', 'main').split('\n'), ['Photo curation: x', 'PR 1 (#1)', 'main']);
    assert.strictEqual(f.release(), '', 'a train stopped half way leaves release alone');
  } finally {
    f.done();
  }
});

// The release branch (Pierre, 2026-11-18, review R5 question h): the sheet script installs from it, only this train moves it.
test('release: a second train fast-forwards it to the commit main ends on, and a Publish after it is not on release', () => {
  const f = fixture();
  try {
    assert.strictEqual(f.train('1').status, 0);
    const first = f.og('rev-parse', 'release');
    assert.strictEqual(first, f.og('rev-parse', 'main'));
    // A train branch is named after the second it started in: two trains in one second (a fast runner) would share it.
    // Real trains are minutes apart, so the test removes the first one's branch.
    for (const b of f.trains()) f.og('update-ref', '-d', b);
    // A Publish lands on main after the train: main moves on, release does not.
    const publish = f.commitOn('refs/heads/main', 'Photo curation: y');
    f.og('update-ref', 'refs/heads/main', publish);
    assert.strictEqual(f.og('rev-parse', 'release'), first);
    const r = f.train('5');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const second = f.og('rev-parse', 'release');
    assert.notStrictEqual(second, first);
    assert.strictEqual(f.og('rev-parse', 'main'), second, 'release is where the train left main');
    f.og('merge-base', '--is-ancestor', first, second); // throws unless it was a fast-forward
    assert.match(r.stdout, new RegExp(`release moved ${first.slice(0, 7)} -> ${second.slice(0, 7)}`));
    // The Publish commit is in release's history too (main moved first, the train then merged on top of it).
    assert.ok(f.og('log', '--format=%s', 'release').split('\n').includes('Photo curation: y'));
  } finally {
    f.done();
  }
});

test("release: the train's own last merge commit, not a Publish that landed on main right after it", () => {
  const f = fixture();
  try {
    // The fake gh lands a Publish right after the first merge, which here is the last one: main is one commit past it.
    f.setState({publish_after_merge: true});
    const r = f.train('1');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.strictEqual(f.og('log', '-1', '--format=%s', 'main'), 'Photo curation: x');
    assert.strictEqual(f.og('log', '-1', '--format=%s', 'release'), 'PR 1 (#1)');
    assert.strictEqual(f.og('rev-parse', 'release'), f.og('rev-parse', 'main~1'));
  } finally {
    f.done();
  }
});

test("release: left alone when main's tree is not the train's (exit 2) and when it is not a fast-forward (exit 3, never forced)", () => {
  const f = fixture();
  try {
    f.setState({tree_override: '0'.repeat(40)});
    const r = f.train('1');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.strictEqual(f.release(), '');
  } finally {
    f.done();
  }
  const g = fixture();
  try {
    // Someone pushed a commit main does not have: release is not an ancestor of what the train ends on.
    const stray = g.commitOn('refs/heads/main', 'stray');
    g.og('update-ref', 'refs/heads/release', stray);
    const r = g.train('1');
    assert.strictEqual(r.status, 3, r.stdout + r.stderr);
    assert.match(r.stdout, /release not moved/);
    assert.match(r.stdout, /main is merged and fine/);
    assert.strictEqual(g.release(), stray, 'never forced');
    assert.deepStrictEqual(g.og('log', '--format=%s', 'main').split('\n'), ['PR 1 (#1)', 'main']);
    assert.ok(g.calls().every(c => /^(GET|PUT) /.test(c)));
  } finally {
    g.done();
  }
});

// Where the browser matrix runs on a train (rule W12; Pierre, 2026-11-26, REE-121 (b) and (d)). The decision (the
// Smokes workflow's scope job, run here on the pushed train with the workflow's own fetch line) and the waiter
// (tools/train.py, which lists the jobs that must succeed) are tested together: the fake gh builds the Smokes jobs
// from what the scope job said.
const N_SMOKES = SMOKE_NAMES.length;

test('a docs-only train: no browser smoke, Checks (both shards) and answer cost green, merged', () => {
  const f = fixture(7);
  try {
    const dry = f.train('--dry-run', '7');
    assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
    assert.match(dry.stdout, /Docs-only train \(rule W12\): no browser smoke runs on tree \w{7}; Checks and answer cost do\./);
    const r = f.train('7');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.deepStrictEqual([...new Set(f.scopes())], ['browser=false'], 'the scope job skipped the browser matrix');
    assert.match(r.stdout, /Train green\.[\s\S]*Merged #7/);
    assert.strictEqual(f.og('show', 'main:NOTES.md'), 'x');
    assert.strictEqual(f.og('rev-parse', 'main^{tree}'), f.og('rev-parse', f.trains()[0] + '^{tree}'));
  } finally {
    f.done();
  }
});

test('code, mixed and unknown trains run the whole browser matrix: a rename out of docs/, a deletion, a nested README, docs with code', () => {
  for (const [prs, kind] of [
    [['8'], 'Mixed'],
    [['9'], 'Code'],
    [['10'], 'Code'],
    [['7', '1'], 'Mixed']
  ]) {
    const f = fixture(...prs.filter(n => +n > 6));
    try {
      const r = f.train(...prs);
      assert.strictEqual(r.status, 0, prs + ': ' + r.stdout + r.stderr);
      assert.match(r.stdout, new RegExp(`${kind} train: the whole browser matrix \\(${N_SMOKES} jobs\\) runs on it\\.`), prs.join());
      assert.deepStrictEqual([...new Set(f.scopes())], ['browser=true'], prs.join());
      assert.match(r.stdout, /its tree is the train's/);
    } finally {
      f.done();
    }
  }
});

test('a code train whose browser jobs were skipped, or with a job missing, merges nothing', () => {
  for (const [state, missing] of [
    [{scope_says: 'browser=false'}, /Smokes › smoke \(pages main\): did not run/],
    [
      {
        jobs: {
          11: [
            {name: 'checks', conclusion: 'success'},
            {name: 'unit tests (1/2)', conclusion: 'success'}
          ]
        }
      },
      /Checks › unit tests \(2\/2\): did not run/
    ],
    [
      {
        jobs: {
          12: [
            {name: 'browser scope', conclusion: 'success'},
            {name: 'answer cost', conclusion: 'skipped'},
            ...SMOKE_NAMES.map(n => ({name: `smoke (${n})`, conclusion: 'success'}))
          ]
        }
      },
      /Smokes › answer cost: skipped/
    ]
  ]) {
    const f = fixture();
    try {
      f.setState(state);
      const r = f.train('1');
      assert.strictEqual(r.status, 1, r.stdout + r.stderr);
      assert.match(r.stdout, /the train is red or incomplete, nothing merged/);
      assert.match(r.stdout, missing);
      assert.ok(!f.calls().some(c => c.startsWith('PUT')), 'nothing merged');
      assert.strictEqual(f.release(), '');
    } finally {
      f.done();
    }
  }
  // A docs-only train still needs answer cost (its coverage before REE-121) and its scope job.
  const g = fixture(7);
  try {
    g.setState({jobs: {12: [{name: 'smoke (${{ matrix.name }})', conclusion: 'skipped'}]}});
    const r = g.train('7');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /Smokes › browser scope: did not run\n\s+Smokes › answer cost: did not run/);
    assert.ok(!g.calls().some(c => c.startsWith('PUT')));
  } finally {
    g.done();
  }
});

test('a failing smoke on a docs-only train, or no Smokes run at all, merges nothing', () => {
  const f = fixture(7);
  try {
    f.setState({train_runs: f.runs('failure'), jobs: {12: [{name: 'answer cost', conclusion: 'failure'}]}});
    const r = f.train('7');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /Smokes › answer cost: failure/);
    assert.ok(!f.calls().some(c => c.startsWith('PUT')));
  } finally {
    f.done();
  }
  const g = fixture(7);
  try {
    // A whole-workflow skip would leave no Smokes run: the train waits for it, then gives up, never green.
    g.setState({train_runs: [{id: 11, name: 'Checks', status: 'completed', conclusion: 'success'}]});
    const r = g.trainEnv({TRAIN_WAIT: '0'}, '7');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /CI on the train is not finished after 0 min \(Checks completed, Smokes not started\): nothing merged/);
    assert.ok(!g.calls().some(c => c.startsWith('PUT')));
  } finally {
    g.done();
  }
});

test('the scope job runs the matrix on anything it cannot prove docs-only: not a train, a base not on main, an empty diff', () => {
  const f = fixture(7, 10);
  try {
    // A docs-only commit pushed to train/* by hand: no "Train: …" merge on top.
    f.og('update-ref', 'refs/heads/train/manual', f.heads[7]);
    let [said, why] = f.scopeOn(f.heads[7], 'refs/heads/train/manual');
    assert.strictEqual(said, 'browser=true');
    assert.match(why, /unknown \(\w{7} is not a train/);
    // A "Train: …" merge whose base is not on main (main's own history does not hold it).
    const work = path.join(f.d, 'work'),
      git = (...a) =>
        execFileSync('git', ['-C', work, '-c', 'user.name=T', '-c', 'user.email=t@example.com', ...a], {encoding: 'utf-8'}).trim();
    git('checkout', '-q', '--detach', f.heads[10]);
    git('merge', '-q', '--no-ff', '--no-edit', '-m', 'Train: PR 7 (#7)', f.heads[7]);
    git('push', '-q', f.origin, 'HEAD:refs/heads/train/offmain');
    [said, why] = f.scopeOn(git('rev-parse', 'HEAD'), 'refs/heads/train/offmain');
    assert.strictEqual(said, 'browser=true');
    assert.match(why, /unknown \(its base \w{7} is not on main/);
    // A "Train: …" merge that changes nothing (two parents, main's tree), made in origin itself.
    const same = f.commitOn('refs/heads/main', 'no change');
    const empty = execFileSync(
      'git',
      ['-C', f.origin, 'commit-tree', 'main^{tree}', '-p', 'main', '-p', same, '-m', 'Train: nothing (#0)'],
      {
        encoding: 'utf-8',
        env: {...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@e', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@e'}
      }
    ).trim();
    f.og('update-ref', 'refs/heads/train/empty', empty);
    [said, why] = f.scopeOn(empty, 'refs/heads/train/empty');
    assert.strictEqual(said, 'browser=true');
    assert.match(why, /no change from main \w{7}: unknown/);
  } finally {
    f.done();
  }
});

// ---- REE-121 (a): a one-PR train reuses its PR's CI on the identical tree (tools/train_reuse.py) ----
// The PR head's own CI as GitHub reports it: a Checks run (21: checks and both shards) and a Smokes run (22: answer cost,
// the browser jobs skipped on a PR head), each reusable job with the "tested commit" annotation of its checkout, GitHub's
// synthetic merge of the head into main. Options change one piece: the merge commit (and the tree it claims), the runs'
// fields, every job's fields, jobs dropped, the annotations, no Smokes run.
const NOW = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const prCI = (f, n, {merge, tree, run = {}, job = {}, drop = [], note, cost = true} = {}) => {
  const head = f.heads[n];
  merge = merge || f.prMerge(head);
  tree = tree || f.og('rev-parse', merge + '^{tree}');
  const mk = (id, name, file) => ({
    id,
    name,
    path: `.github/workflows/${file}`,
    event: 'pull_request',
    status: 'completed',
    conclusion: 'success',
    run_attempt: 1,
    head_sha: head,
    head_branch: 'pr' + n,
    html_url: `https://github.com/o/r/actions/runs/${id}`,
    repository: {full_name: 'o/r'},
    head_repository: {full_name: 'o/r'},
    created_at: NOW(),
    updated_at: NOW(),
    ...run
  });
  const jobs = (from, names) =>
    names
      .filter(j => !drop.includes(j))
      .map((name, i) => ({
        id: from + i,
        name,
        status: 'completed',
        conclusion: 'success',
        run_attempt: 1,
        head_sha: head,
        html_url: `https://github.com/o/r/actions/runs/0/job/${from + i}`,
        // a check-run id that is not the job's own (Codex #1634: annotations hang on the check run)
        check_run_url: `https://api.github.com/repos/o/r/check-runs/${from + i + 70000}`,
        labels: ['ubuntu-26.04'],
        ...job
      }));
  const cj = jobs(2100, CHECKS_JOBS),
    sj = cost ? [...jobs(2200, ['answer cost']), {id: 2290, name: 'browser scope', conclusion: 'skipped'}] : [];
  const annotations = Object.fromEntries(
    [...cj, ...sj.filter(j => j.name === 'answer cost')].map(j => [
      j.id + 70000,
      note || [{title: 'tested commit', message: `commit=${merge} tree=${tree}`, annotation_level: 'notice'}]
    ])
  );
  return {
    pr_runs: [mk(21, 'Checks', 'checks.yml'), ...(cost ? [mk(22, 'Smokes', 'smokes.yml')] : [])],
    jobs: {21: cj, 22: sj},
    annotations,
    merge
  };
};
const ON = {TRAIN_REUSE: 'on'};
const audit = r => (r.stdout.match(/^Reuse audit .*$/m) || [''])[0];

test('(a) a one-PR train on the tree its PR run tested reuses Checks and answer cost, runs the browser matrix, merges', () => {
  const f = fixture();
  try {
    const base = f.og('rev-parse', 'main'),
      head = f.heads[1],
      ev = path.join(f.d, 'evidence.jsonl');
    const ci = prCI(f, 1);
    f.setState(ci);
    const dry = f.trainEnv(ON, '--dry-run', '--sha', head, '1');
    assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
    assert.match(dry.stdout, /Dry run: would push train\/\d{8}-\d{6}-reuse-checks-reuse-cost, /);
    const r = f.trainEnv({...ON, TRAIN_EVIDENCE: ev}, '--sha', head, '1');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(
      audit(r),
      new RegExp(
        `^Reuse audit \\(on\\) #1 tree \\w{7}: Checks reused \\(PR run 21 attempt 1, 3/3 jobs, merge ${ci.merge.slice(0, 7)} = main ` +
          `${base.slice(0, 7)} \\+ head ${head.slice(0, 7)}; sheet --main run here\\); answer cost reused \\(PR run 22 attempt 1, 1/1 jobs, ` +
          `merge ${ci.merge.slice(0, 7)} = main ${base.slice(0, 7)} \\+ head ${head.slice(0, 7)}\\); browser scope and matrix on the train\\.$`
      )
    );
    const [branch] = f.trains();
    assert.match(branch, /^refs\/heads\/train\/\d{8}-\d{6}-reuse-checks-reuse-cost$/);
    // the browser matrix still ran once on the train (d), and main's sheet check ran in its train mode
    assert.deepStrictEqual([...new Set(f.scopes())], ['browser=true']);
    assert.ok(fs.readFileSync(path.join(f.d, 'sheet-ran'), 'utf-8').includes(`--check --main --base ${base}`));
    assert.match(r.stdout, /Train green\.[\s\S]*Merged #1[\s\S]*its tree is the train's/);
    assert.strictEqual(f.og('rev-parse', 'main^{tree}'), f.og('rev-parse', branch + '^{tree}'));
    assert.strictEqual(
      f.og('rev-parse', 'main^{tree}'),
      f.og('rev-parse', ci.merge + '^{tree}'),
      'what went live is what the PR run tested'
    );
    assert.strictEqual(f.release(), f.og('rev-parse', 'main'));
    assert.ok(
      f.calls().every(c => /^(GET|PUT) /.test(c)),
      f.calls().join('\n')
    );
    // the per-obligation evidence, one JSON line per pushed train
    const lines = fs.readFileSync(ev, 'utf-8').trim().split('\n');
    assert.strictEqual(lines.length, 1);
    const rec = JSON.parse(lines[0]);
    assert.strictEqual(rec.branch, branch.replace('refs/heads/', ''));
    assert.deepStrictEqual(
      rec.obligations.map(o => [o.obligation, o.decision]),
      [
        ['Checks', 'reuse'],
        ['answer cost', 'reuse']
      ]
    );
    const [chk, cost] = rec.obligations;
    assert.deepStrictEqual(chk.required, CHECKS_JOBS);
    assert.deepStrictEqual(cost.required, ['answer cost']);
    for (const [o, wf, run] of [
      [chk, 'checks.yml', 21],
      [cost, 'smokes.yml', 22]
    ]) {
      assert.strictEqual(o.repository, 'o/r');
      assert.strictEqual(o.workflow_path, '.github/workflows/' + wf);
      assert.strictEqual(o.workflow_blob, f.og('rev-parse', `${branch}:.github/workflows/${wf}`));
      assert.deepStrictEqual([o.event, o.ref, o.run, o.attempt], ['pull_request', 'pr1', run, 1]);
      assert.strictEqual(o.run_url, `https://github.com/o/r/actions/runs/${run}`);
      assert.deepStrictEqual([o.tested_commit, o.tested_tree, o.tested_parents], [ci.merge, rec.tree, [base, head]]);
      assert.deepStrictEqual([o.base, o.head], [base, head]);
      assert.ok(
        o.jobs.length === o.required.length &&
          o.jobs.every(j => j.id && j.check_run === j.id + 70000 && j.attempt === 1 && j.conclusion === 'success' && j.url)
      );
      assert.match(o.inputs, /no event-dependent input/);
    }
    assert.match(chk.base_mode, /PR --sheet-base HEAD\^1; train --main by main's sheet_version\.py --check --main --base/);
  } finally {
    f.done();
  }
});

test('(a) shadow, the default: it says what it would reuse, runs every job, and says whether the train agreed', () => {
  const f = fixture();
  try {
    f.setState(prCI(f, 1));
    const r = f.train('--sha', f.heads[1], '1');
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(
      audit(r),
      /^Reuse audit \(shadow\) #1 tree \w{7}: Checks would reuse \(PR run 21 [^)]*\); answer cost would reuse \(PR run 22 .*every job runs \(shadow\)\.$/
    );
    assert.match(f.trains()[0], /^refs\/heads\/train\/\d{8}-\d{6}$/, 'a plain train branch: nothing is skipped');
    assert.match(r.stdout, /^Reuse shadow agrees: the train passed every job it would have reused \(Checks, answer cost\)\.$/m);
    assert.match(r.stdout, /Merged #1/);
  } finally {
    f.done();
  }
  const g = fixture();
  try {
    const ci = prCI(g, 1);
    g.setState({
      ...ci,
      train_runs: [
        {id: 11, name: 'Checks', status: 'completed', conclusion: 'failure'},
        {id: 12, name: 'Smokes', status: 'completed', conclusion: 'success'}
      ],
      jobs: {...ci.jobs, 11: [{name: 'unit tests (2/2)', conclusion: 'failure'}]}
    });
    const r = g.train('--sha', g.heads[1], '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^Reuse shadow DISAGREES: the train failed a job it would have reused: Checks › unit tests \(2\/2\): failure$/m);
    assert.ok(!g.calls().some(c => c.startsWith('PUT')), 'nothing merged');
  } finally {
    g.done();
  }
  // A train workflow that failed without any job (Codex #1634): its reused jobs never ran, so no verdict either way.
  const k = fixture();
  try {
    const ci = prCI(k, 1);
    k.setState({
      ...ci,
      train_runs: [
        {id: 11, name: 'Checks', status: 'completed', conclusion: 'failure'},
        {id: 12, name: 'Smokes', status: 'completed', conclusion: 'success'}
      ],
      jobs: {...ci.jobs, 11: []}
    });
    const r = k.train('--sha', k.heads[1], '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(
      r.stdout,
      /^Reuse shadow inconclusive: the train did not show the jobs it would have reused \(Checks: Checks: failure\)\.$/m
    );
    assert.doesNotMatch(r.stdout, /Reuse shadow (agrees|DISAGREES)/);
    assert.ok(!k.calls().some(c => c.startsWith('PUT')), 'nothing merged');
  } finally {
    k.done();
  }
});

test('(a) TRAIN_REUSE=off, the rollback: nothing looked up, a plain branch, every job required', () => {
  const f = fixture();
  try {
    f.setState({...prCI(f, 1), jobs: {...prCI(f, 1).jobs, 11: [{name: 'checks', conclusion: 'success'}]}});
    const r = f.trainEnv({TRAIN_REUSE: 'off'}, '--sha', f.heads[1], '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.strictEqual(audit(r), 'Reuse audit (off): every job runs on the train.');
    assert.ok(!f.calls().some(c => /event=pull_request|annotations/.test(c)), f.calls().join('\n'));
    assert.match(f.trains()[0], /^refs\/heads\/train\/\d{8}-\d{6}$/);
    assert.match(r.stdout, /Checks › unit tests \(1\/2\): did not run/, 'the shards are required again');
  } finally {
    f.done();
  }
});

test('(a) anything not proven runs on the train: per obligation, with its reason', () => {
  const f = fixture(7, 11, 12, 13);
  try {
    const main = f.og('rev-parse', 'main'),
      h = f.heads;
    const older = f.commitOn(main, 'an older main');
    for (const [name, prs, ci, checks, cost, suffix] of [
      [
        'unequal tree',
        ['1'],
        () => prCI(f, 1, {merge: f.prMerge(h[1], main, f.og('rev-parse', h[2] + '^{tree}'))}),
        /its PR run tested tree \w{7}, the train is \w{7}/,
        null,
        ''
      ],
      [
        'stale base',
        ['1'],
        () => prCI(f, 1, {merge: f.prMerge(h[1], older)}),
        /stale base: its PR run tested on main \w{7}, the train is on \w{7}/,
        null,
        ''
      ],
      [
        'stale head',
        ['1'],
        () => prCI(f, 1, {merge: f.prMerge(h[5])}),
        new RegExp(`stale head: its PR run tested ${h[5].slice(0, 7)}`),
        null,
        ''
      ],
      [
        'missing shard',
        ['1'],
        () => prCI(f, 1, {drop: ['unit tests (2/2)']}),
        /unit tests \(2\/2\) missing in the PR run/,
        'reuse',
        '-reuse-cost'
      ],
      [
        'missing attempt',
        ['1'],
        () => prCI(f, 1, {job: {run_attempt: undefined}}),
        /checks has no attempt 1 in the PR run/,
        /answer cost has no attempt 1/,
        ''
      ],
      ['re-run', ['1'], () => prCI(f, 1, {run: {run_attempt: 2}}), /its PR run is attempt 2 \(a re-run is no evidence\)/, null, ''],
      ['wrong event', ['1'], () => prCI(f, 1, {run: {event: 'push'}}), /its run is a push event/, null, ''],
      ['cancelled', ['1'], () => prCI(f, 1, {run: {conclusion: 'cancelled'}}), /its PR run is cancelled/, null, ''],
      ['partial', ['1'], () => prCI(f, 1, {run: {status: 'in_progress', conclusion: null}}), /its PR run is in_progress/, null, ''],
      ['skipped job', ['1'], () => prCI(f, 1, {job: {conclusion: 'skipped'}}), /is skipped in the PR run/, null, ''],
      ['untrusted', ['1'], () => prCI(f, 1, {run: {head_repository: {full_name: 'fork/r'}}}), /not this repository's own/, null, ''],
      ['stale age', ['1'], () => prCI(f, 1, {run: {updated_at: '2026-01-01T00:00:00Z'}}), /its PR run is stale \(\d+ h old\)/, null, ''],
      ['no annotation', ['1'], () => prCI(f, 1, {note: [{title: 'other', message: 'x'}]}), /has no tested-commit record/, null, ''],
      [
        'check run elsewhere',
        ['1'],
        () => prCI(f, 1, {job: {check_run_url: 'https://api.github.com/repos/fork/r/check-runs/1'}}),
        /has no check run of this repository/,
        null,
        ''
      ],
      [
        'missing merge ref',
        ['1'],
        () => prCI(f, 1, {merge: '1234567890abcdef1234567890abcdef12345678', tree: '0'.repeat(40)}),
        /its tested merge commit 1234567 is gone/,
        null,
        ''
      ],
      ['no PR run', ['1'], () => ({}), /no Checks run on the PR head/, /no Smokes run on the PR head/, ''],
      ['several PRs', ['1', '2'], () => prCI(f, 1), /2 PRs in the train \(single-PR trains only\)/, null, ''],
      ['changed workflow', ['11'], () => prCI(f, 11), /the PR changes \.github\/workflows\/checks\.yml/, 'reuse', '-reuse-cost'],
      ['event read', ['12'], () => prCI(f, 12), /the train changes code that reads its event \(tests\/x\.test\.js\)/, null, ''],
      [
        'versions tool',
        ['13'],
        () => prCI(f, 13),
        /the train changes tools\/check_versions\.py: its --main mode never ran/,
        'reuse',
        '-reuse-cost'
      ],
      ['docs-only PR', ['7'], () => prCI(f, 7, {cost: false}), 'reuse', /no Smokes run on the PR head/, '-reuse-checks']
    ]) {
      f.setState(ci());
      const r = f.trainEnv(ON, '--dry-run', ...prs);
      assert.strictEqual(r.status, 0, name + ': ' + r.stdout + r.stderr);
      const line = audit(r);
      for (const [ob, want] of [
        ['Checks', checks],
        ['answer cost', cost || checks]
      ])
        if (want === 'reuse') assert.match(line, new RegExp(`${ob} reused \\(PR run`), `${name}: ${line}`);
        else assert.match(line, new RegExp(`${ob} runs \\([^)]*${want.source}`), `${name}: ${ob}: ${line}`);
      assert.match(r.stdout, new RegExp(`would push train/\\d{8}-\\d{6}${suffix}, `), `${name}: ${r.stdout}`);
    }
  } finally {
    f.done();
  }
});

test('(a) a train that runs Checks after a fallback still needs both shards; one that reuses them still checks the tree after merging', () => {
  const f = fixture();
  try {
    // answer cost proven, Checks not (a shard missing on the PR run): the train runs Checks and needs all three jobs.
    const ci = prCI(f, 1, {drop: ['unit tests (2/2)']});
    f.setState({...ci, jobs: {...ci.jobs, 11: [{name: 'checks', conclusion: 'success'}]}});
    const r = f.trainEnv(ON, '--sha', f.heads[1], '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(f.trains()[0], /^refs\/heads\/train\/\d{8}-\d{6}-reuse-cost$/);
    assert.match(r.stdout, /Checks › unit tests \(1\/2\): did not run\n\s+Checks › unit tests \(2\/2\): did not run/);
    assert.ok(!f.calls().some(c => c.startsWith('PUT')));
  } finally {
    f.done();
  }
  const g = fixture();
  try {
    // everything reused, then main's tree is not the train's: exit 2, release not moved
    g.setState({...prCI(g, 1), tree_override: '0'.repeat(40)});
    const r = g.trainEnv(ON, '--sha', g.heads[1], '1');
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    assert.match(g.trains()[0], /-reuse-checks-reuse-cost$/);
    assert.match(r.stdout, /✗ main \w{7} has tree 0000000, the train tested \w{7}: test main now and fix forward\./);
    assert.strictEqual(g.release(), '');
  } finally {
    g.done();
  }
  const k = fixture();
  try {
    // a reused job that ran and failed on the train anyway (its condition lost): red, nothing merged
    const ci = prCI(k, 1);
    k.setState({
      ...ci,
      train_runs: [
        {id: 11, name: 'Checks', status: 'completed', conclusion: 'failure'},
        {id: 12, name: 'Smokes', status: 'completed', conclusion: 'success'}
      ],
      jobs: {...ci.jobs, 11: [{name: 'checks', conclusion: 'failure'}]}
    });
    const r = k.trainEnv(ON, '--sha', k.heads[1], '1');
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /Checks › checks: failure/);
    assert.ok(!k.calls().some(c => c.startsWith('PUT')));
  } finally {
    k.done();
  }
});

test('(a) the workflows: each reusable job records its tested commit and is skipped only on its reuse branch', () => {
  const py = code => JSON.parse(execFileSync('python3', ['-c', code], {cwd: path.join(ROOT, 'tools'), encoding: 'utf-8'}).trim());
  const [ifLine, obligations, title] = py(
    'import json, train_reuse as t; print(json.dumps([t.IF_LINE, [[o[2], o[3], o[4]] for o in t.OBLIGATIONS], t.TITLE]))'
  );
  const block = (src, key) => new RegExp(`^  ${key}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|$(?![\\s\\S]))`, 'm').exec(src)[1];
  const step =
    '      - name: Tested commit\n' +
    `        run: echo "::notice title=${title}::commit=$(git rev-parse HEAD) tree=$(git rev-parse 'HEAD^{tree}')"\n`;
  const reusable = [];
  for (const [file, keys, token] of obligations) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf-8');
    for (const k of keys) {
      const b = block(src, k);
      reusable.push(k);
      assert.deepStrictEqual(b.match(/^ {4}if: .*$/gm), [ifLine.replace('%s', token)], `${file} ${k}`);
      assert.match(b, /- uses: actions\/checkout@v7\n(?: {8}.*\n)*/, `${file} ${k}: checkout`);
      assert.ok(b.includes(step), `${file} ${k}: the "Tested commit" step`);
      assert.ok(b.indexOf(step) > b.indexOf('actions/checkout@v7'), `${file} ${k}: after the checkout`);
    }
  }
  assert.deepStrictEqual(reusable, ['checks', 'unit', 'answercost']);
  // the browser jobs are never reused (d): no reuse condition there
  for (const k of ['scope', 'smoke']) assert.doesNotMatch(block(WF('smokes.yml'), k), /^ {4}if: .*-reuse-/m, k);
});

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
    out({'state': p.get('state', 'open'), 'base': {'ref': 'main'}, 'draft': p.get('draft', False), 'title': p['title'],
         'labels': [{'name': l} for l in p.get('labels', [])],
         'head': {'sha': g('rev-parse', 'refs/pull/%s/head' % m.group(1)), 'repo': {'full_name': 'o/r'}}})
m = re.match(r'commits/(\w+)/check-runs', path)
if m:
    out({'check_runs': st.get('checks', {}).get(m.group(1), [{'name': 'checks', 'status': 'completed', 'conclusion': 'success'}])})
if path.startswith('actions/runs?'):
    out({'workflow_runs': st.get('train_runs', [])})
m = re.match(r'actions/runs/(\d+)/jobs', path)
if m:
    out({'jobs': st.get('jobs', {}).get(m.group(1), [])})
if path == 'git/ref/heads/main':
    out({'object': {'sha': g('rev-parse', 'refs/heads/main')}})
m = re.match(r'git/commits/(\w+)$', path)
if m:
    out({'tree': {'sha': g('rev-parse', m.group(1) + '^{tree}')}})
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

// origin with main and PRs 1-6: 1 and 2 touch b.txt and c.txt, 3 conflicts with 1, 4 still holds a sheet changes file,
// 6 brings its own tools/sheet_version.py (which must never run).
const fixture = () => {
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
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'main');
  git(work, 'push', '-q', origin, 'main');
  const pr = (n, f, s) => {
    git(work, 'checkout', '-q', '-B', 'pr' + n, 'main');
    put(f, s);
    git(work, 'add', '-A');
    git(work, 'commit', '-q', '-m', 'pr ' + n);
    git(work, 'push', '-q', origin, `HEAD:refs/pull/${n}/head`);
    return git(work, 'rev-parse', 'HEAD');
  };
  const heads = {
    1: pr(1, 'b.txt', 'b one\n'),
    2: pr(2, 'c.txt', 'c\n'),
    3: pr(3, 'b.txt', 'b three\n'),
    4: pr(4, 'tools/sync/changes/claude-x.md', 'an entry\n'),
    5: pr(5, 'd.txt', 'd\n'),
    6: pr(6, 'tools/sheet_version.py', `open(${JSON.stringify(path.join(d, 'ran'))}, 'w').write('pr code ran')\nraise SystemExit(1)\n`)
  };
  execFileSync('git', ['clone', '-q', origin, clone], {stdio: 'pipe'});
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'gh'), FAKE_GH, {mode: 0o755});
  const state = path.join(d, 'state.json'),
    log = path.join(d, 'gh.log');
  const runs = c => [
    {id: 11, name: 'Checks', status: 'completed', conclusion: 'success'},
    {id: 12, name: 'Smokes', status: 'completed', conclusion: c}
  ];
  const setState = (o = {}) =>
    fs.writeFileSync(
      state,
      JSON.stringify({prs: Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [n, {title: 'PR ' + n}])), train_runs: runs('success'), ...o})
    );
  setState();
  const train = (...a) =>
    spawnSync('python3', [TRAIN, ...a], {
      cwd: clone,
      encoding: 'utf-8',
      env: {
        ...process.env,
        PATH: bin + path.delimiter + process.env.PATH,
        FAKE_GH_STATE: state,
        FAKE_GH_ORIGIN: origin,
        FAKE_GH_LOG: log,
        TRAIN_REPO: 'o/r',
        TRAIN_POLL: '0',
        GIT_AUTHOR_NAME: 'T',
        GIT_AUTHOR_EMAIL: 't@example.com',
        GIT_COMMITTER_NAME: 'T',
        GIT_COMMITTER_EMAIL: 't@example.com'
      }
    });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf-8').trim().split('\n') : []);
  const og = (...a) => execFileSync('git', ['-C', origin, ...a], {encoding: 'utf-8'}).trim();
  const trains = () => og('for-each-ref', '--format=%(refname)', 'refs/heads/train/').split('\n').filter(Boolean);
  return {d, clone, heads, setState, runs, train, calls, og, trains, done: () => fs.rmSync(d, {recursive: true, force: true})};
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
    assert.ok(
      f.calls().every(c => c.startsWith('GET ')),
      f.calls().join('\n')
    );
    noWorktreeLeft(f);
  } finally {
    f.done();
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
    assert.match(r.stdout, /the train is red, nothing merged[\s\S]*Smokes › smoke \(pages rest\): failure/);
    assert.ok(!/smoke \(fish\)/.test(r.stdout));
    assert.strictEqual(f.og('rev-parse', 'main'), main);
    assert.ok(!f.calls().some(c => c.startsWith('PUT')));
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
  } finally {
    f.done();
  }
});

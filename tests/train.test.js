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
    if m.group(1) == '11':
        out({'jobs': [{'name': n, 'conclusion': 'success'} for n in st['checks_jobs']]})
    # Smokes: the scope job's answer on the pushed train (scope.py runs the workflow's own steps), unless the state forces one.
    sha = st['train_sha']
    ref = g('for-each-ref', '--points-at', sha, '--format=%(refname)', 'refs/heads/train/').split('\n')[0]
    said = subprocess.run([sys.executable, os.environ['FAKE_SCOPE'], origin, sha, ref], capture_output=True, text=True).stdout.split()[0]
    open(os.environ['FAKE_GH_LOG'] + '.scope', 'a').write(said + '\n')
    browser = st.get('scope_says', said) == 'browser=true'
    smoke = [{'name': 'smoke (%s)' % n, 'conclusion': 'success'} for n in st['smoke_names']] if browser else [{'name': 'smoke (\x24{{ matrix.name }})', 'conclusion': 'skipped'}]
    out({'jobs': [{'name': 'browser scope', 'conclusion': 'success'}, {'name': 'answer cost', 'conclusion': 'success'}] + smoke})
if path == 'git/ref/heads/main':
    if st.get('main_moved_during_build'):
        g('update-ref', 'refs/heads/main', st['main_moved_during_build'])
    out({'object': {'sha': g('rev-parse', 'refs/heads/main')}})
m = re.match(r'git/commits/(\w+)$', path)
if m:
    out({'tree': {'sha': st.get('tree_override') or g('rev-parse', m.group(1) + '^{tree}')}})
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
    10: () => pr(10, {'tools/README.md': '# Tools\n'})
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
  return {
    d,
    clone,
    heads,
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

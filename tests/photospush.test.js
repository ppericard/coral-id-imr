// The Candidate photos workflow's push (.github/workflows/approved-photos.yml; docs/SECURITY.md): the jobs that download
// and decode photos and JSON (photos, fish) are read-only and hand a patch to a push job (photos-push, fish-push) that
// runs no repository code, checks the patch and pushes it. Here the push jobs' own shell, taken from the workflow, runs
// against a throwaway repository and a local bare "origin" on patches made by the build jobs' own step and on crafted
// ones (another file, a rename, a symlink, an executable, a base off main); and the workflows' static rules: who holds
// write, persist-credentials, pip --require-hashes. Needs bash and git.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const WF = fs.readFileSync(path.join(ROOT, '.github/workflows/approved-photos.yml'), 'utf8');

// One job's text: from its key (two spaces) to the next job's key.
function job(name) {
  const lines = WF.split('\n'),
    i = lines.indexOf(`  ${name}:`);
  assert.ok(i > 0, `job ${name}`);
  let j = i + 1;
  while (j < lines.length && !/^ {2}[a-z][\w-]*:$/.test(lines[j])) j++;
  return lines.slice(i, j).join('\n');
}
const JOBS = (() => {
  const s = WF.slice(WF.indexOf('\njobs:\n'));
  return [...s.matchAll(/^ {2}([a-z][\w-]*):$/gm)].map(m => m[1]);
})();
// A step's `run: |` block (dedented) and its env, by the step's name.
function step(jobName, name) {
  const lines = job(jobName).split('\n'),
    i = lines.findIndex(l => l.trim() === `- name: ${name}`);
  assert.ok(i > 0, `${jobName}: step ${name}`);
  const ind = lines[i].indexOf('-');
  let j = i + 1;
  const env = {};
  let run = null;
  for (; j < lines.length; j++) {
    const l = lines[j];
    if (l.trim() && l.search(/\S/) <= ind) break;
    const e = l.match(/^\s+([A-Z_]+): '(.*)'$/);
    if (e) env[e[1]] = e[2].replace(/''/g, "'");
    if (/^\s+run: \|$/.test(l)) {
      const rind = l.search(/\S/),
        body = [];
      for (j++; j < lines.length && (!lines[j].trim() || lines[j].search(/\S/) > rind); j++) body.push(lines[j]);
      const pad = Math.min(...body.filter(b => b.trim()).map(b => b.search(/\S/)));
      run = body.map(b => b.slice(pad)).join('\n');
      break;
    }
  }
  assert.ok(run, `${jobName}: ${name} has a run block`);
  return {run, env};
}

// The throwaway world: HOME and git config isolated, every commit dated and named.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'photospush-'));
test.after(() => fs.rmSync(TMP, {recursive: true, force: true}));
const ENV = {
  PATH: process.env.PATH,
  HOME: TMP,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'T',
  GIT_AUTHOR_EMAIL: 't@example.org',
  GIT_COMMITTER_NAME: 'T',
  GIT_COMMITTER_EMAIL: 't@example.org'
};
const git = (cwd, ...a) => execFileSync('git', a, {cwd, env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const write = (dir, f, data) => {
  fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
  fs.writeFileSync(path.join(dir, f), data);
};
const ORIGIN = path.join(TMP, 'origin.git');
const BIN = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 1, 2, 3, 0, 0xff, 0xfe, 10, 0]);
let n = 0;
const fresh = () => path.join(TMP, `w${++n}`);
{
  const seed = fresh();
  git(TMP, 'init', '-q', '--bare', '-b', 'main', ORIGIN);
  git(TMP, 'init', '-q', '-b', 'main', seed);
  for (const f of ['data.json', 'cand.json', 'excluded.json', 'fish-game.json', 'fish-cand.json', 'tools/fish_refill.json'])
    write(seed, f, '{"a": 1}\n');
  write(seed, 'img/a.webp', BIN);
  write(seed, 'tools/x.py', 'print(1)\n');
  write(seed, '.github/workflows/w.yml', 'name: w\n');
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '-m', 'seed');
  git(seed, 'remote', 'add', 'origin', ORIGIN);
  git(seed, 'push', '-q', 'origin', 'main');
}
const head = () => git(ORIGIN, 'rev-parse', 'main');

// A build job's result: a clone of today's main changed by `change`, then either the job's own Prepare step, or a crafted
// patch (every change staged, `diff` the diff options) with `base` (default: the clone's HEAD).
function build(change, {jobName = 'photos', crafted = false, diff = ['--no-renames'], base} = {}) {
  const dir = fresh(),
    rt = fresh();
  git(TMP, 'clone', '-q', ORIGIN, dir);
  fs.mkdirSync(rt);
  change(dir);
  if (crafted) {
    git(dir, 'add', '-A');
    fs.mkdirSync(path.join(rt, 'change'));
    fs.writeFileSync(path.join(rt, 'change/base'), (base || git(dir, 'rev-parse', 'HEAD')) + '\n');
    fs.writeFileSync(
      path.join(rt, 'change/change.patch'),
      execFileSync('git', ['diff', '--cached', '--binary', ...diff], {cwd: dir, env: ENV})
    );
  } else {
    const r = spawnSync('bash', ['-eo', 'pipefail', '-c', step(jobName, 'Prepare the commit').run], {
      cwd: dir,
      env: {...ENV, RUNNER_TEMP: rt}
    });
    assert.strictEqual(r.status, 0, String(r.stderr));
  }
  return path.join(rt, 'change');
}
// The push job on that change: a full clone of today's main, its check step, then (if it passed) its Commit step.
function push(change, jobName = 'photos-push') {
  const dir = fresh(),
    rt = fresh();
  git(TMP, 'clone', '-q', ORIGIN, dir);
  fs.mkdirSync(rt);
  const ck = step(jobName, 'Apply and check the change'),
    a = spawnSync('bash', ['-eo', 'pipefail', '-c', ck.run], {
      cwd: dir,
      env: {...ENV, ...ck.env, CHANGE: change, RUNNER_TEMP: rt},
      encoding: 'utf8'
    });
  if (a.status !== 0) return {ok: false, out: a.stdout + a.stderr};
  // The Commit step names the bot itself: no identity from the environment.
  const bare = Object.fromEntries(Object.entries(ENV).filter(([k]) => !/^GIT_(AUTHOR|COMMITTER)_/.test(k))),
    c = spawnSync('bash', ['-e', '-c', step(jobName, 'Commit').run], {cwd: dir, env: {...bare, GH_TOKEN: 'not-a-token'}, encoding: 'utf8'});
  assert.strictEqual(c.status, 0, c.stdout + c.stderr);
  return {ok: true, out: a.stdout + c.stdout};
}
// Refused before anything is written or pushed, for the reason `reason` (the step's ::error:: line).
const refused = (change, jobName, why, reason) => {
  const before = head(),
    r = push(change, jobName);
  assert.strictEqual(r.ok, false, `${why}: refused`);
  assert.match(r.out, new RegExp('::error::' + reason), why);
  assert.strictEqual(head(), before, `${why}: nothing pushed`);
};

test("photos-push commits the photos job's change on top of a main that moved, same message and files", () => {
  const change = build(d => {
    write(d, 'data.json', '{"a": 2}\n');
    write(d, 'img/b.webp', Buffer.concat([BIN, BIN]));
    fs.rmSync(path.join(d, 'img/a.webp'));
    write(d, 'tools/x.py', 'print(2)\n'); // not this job's file: the job's own git add leaves it out
  });
  // A Publish lands meanwhile.
  const other = fresh();
  git(TMP, 'clone', '-q', ORIGIN, other);
  write(other, 'curation.json', '{}\n');
  git(other, 'add', 'curation.json');
  git(other, 'commit', '-q', '-m', 'Photo curation: x');
  git(other, 'push', '-q', 'origin', 'main');
  const moved = head();
  assert.ok(push(change).ok);
  assert.strictEqual(git(ORIGIN, 'rev-parse', 'main~1'), moved, 'rebased on the main that moved');
  assert.strictEqual(
    git(ORIGIN, 'log', '-1', '--format=%s|%an|%ae', 'main'),
    'Candidate photos: download added ones, refill the lists|github-actions[bot]|41898282+github-actions[bot]@users.noreply.github.com'
  );
  assert.deepStrictEqual(git(ORIGIN, 'diff', '--name-status', '--no-renames', 'main~1', 'main').split('\n').sort(), [
    'A\timg/b.webp',
    'D\timg/a.webp',
    'M\tdata.json'
  ]);
  assert.deepStrictEqual(
    execFileSync('git', ['show', 'main:img/b.webp'], {cwd: ORIGIN, env: ENV}),
    Buffer.concat([BIN, BIN]),
    'binary intact'
  );
});

test('no change: nothing committed, nothing pushed', () => {
  const before = head(),
    change = build(() => {});
  assert.strictEqual(fs.statSync(path.join(change, 'change.patch')).size, 0);
  assert.ok(push(change).ok);
  assert.strictEqual(head(), before);
});

test("photos-push refuses a patch outside the photos job's files, a rename, a symlink, an executable, a base off main", () => {
  refused(
    build(d => write(d, 'tools/x.py', 'evil\n'), {crafted: true}),
    'photos-push',
    'a tool',
    'the patch touches tools/x.py'
  );
  refused(
    build(d => write(d, '.github/workflows/w.yml', 'evil\n'), {crafted: true}),
    'photos-push',
    'a workflow',
    'the patch touches .github/'
  );
  refused(
    build(d => write(d, 'img/.hidden', 'x'), {crafted: true}),
    'photos-push',
    'a hidden file',
    'the patch touches img/.hidden'
  );
  refused(
    build(d => git(d, 'mv', 'tools/x.py', 'img/x.py'), {crafted: true, diff: ['-M']}),
    'photos-push',
    'a rename',
    'not a plain file change:  rename '
  );
  refused(
    build(d => fs.symlinkSync('../tools/x.py', path.join(d, 'img/l.webp')), {crafted: true}),
    'photos-push',
    'a symlink',
    'not a plain file change:  create mode 120000 '
  );
  refused(
    build(d => fs.chmodSync(path.join(d, 'data.json'), 0o755), {crafted: true}),
    'photos-push',
    'an executable',
    'not a plain file change:  mode change '
  );
  // A commit that is not on main (a branch of origin): the rebase would carry it onto main.
  const side = fresh();
  git(TMP, 'clone', '-q', ORIGIN, side);
  write(side, 'tools/x.py', 'evil\n');
  git(side, 'commit', '-q', '-am', 'evil');
  git(side, 'push', '-q', 'origin', 'HEAD:refs/heads/side');
  const sha = git(side, 'rev-parse', 'HEAD');
  refused(
    build(d => write(d, 'data.json', '{"a": 3}\n'), {crafted: true, base: sha}),
    'photos-push',
    'a base off main',
    'the base [0-9a-f]{40} is not a commit of main'
  );
  refused(
    build(d => write(d, 'data.json', '{"a": 3}\n'), {crafted: true, base: 'side'}),
    'photos-push',
    'a base that is not a commit id',
    'the base is not a commit id'
  );
  // A patch whose paths say img/ but whose text was edited to reach a tool.
  const change = build(d => write(d, 'img/z.webp', 'x\n'), {crafted: true}),
    p = path.join(change, 'change.patch');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/img\/z\.webp/g, 'img/../tools/z.py'));
  refused(change, 'photos-push', 'a path edited to leave img/', 'the patch touches img/\\.\\./tools');
});

test("fish-push commits only the fish job's two files", () => {
  refused(
    build(d => write(d, 'data.json', '{"a": 9}\n'), {crafted: true}),
    'fish-push',
    'a photos file',
    'the patch touches data.json'
  );
  const change = build(
    d => {
      write(d, 'fish-cand.json', '{"a": 5}\n');
      write(d, 'tools/fish_refill.json', '{"a": 6}\n');
      write(d, 'data.json', '{"a": 7}\n'); // left out by the job's own git add
    },
    {jobName: 'fish'}
  );
  assert.ok(push(change, 'fish-push').ok);
  assert.strictEqual(git(ORIGIN, 'log', '-1', '--format=%s', 'main'), 'Candidate photos: refill the short fish species');
  assert.deepStrictEqual(git(ORIGIN, 'diff', '--name-only', 'main~1', 'main').split('\n').sort(), [
    'fish-cand.json',
    'tools/fish_refill.json'
  ]);
});

test("the push jobs share one check, the job's files only differ", () => {
  const a = step('photos-push', 'Apply and check the change'),
    b = step('fish-push', 'Apply and check the change');
  assert.strictEqual(a.run, b.run);
  assert.notStrictEqual(a.env.ALLOWED, b.env.ALLOWED);
  // The job's own git add and the push job's allowed paths name the same files.
  const added = j =>
    step(j, 'Prepare the commit')
      .run.match(/^git add (.+)$/m)[1]
      .split(' ');
  added('photos').forEach(f => assert.match(f === 'img' ? 'img/a.webp' : f, new RegExp(a.env.ALLOWED), f));
  added('fish').forEach(f => assert.match(f, new RegExp(b.env.ALLOWED), f));
});

test('only the push jobs hold write, and they run nothing downloaded; no checkout keeps credentials', () => {
  assert.match(WF, /\npermissions:\n {2}contents: read\n/, 'read-only by default');
  const writers = JOBS.filter(j => /\n {6}contents: write\n/.test(job(j)));
  assert.deepStrictEqual(writers.sort(), ['fish-push', 'photos-push']);
  assert.deepStrictEqual([...JOBS].sort(), ['fish', 'fish-push', 'photos', 'photos-push', 'r2']);
  for (const j of writers) {
    const t = job(j)
      .split('\n')
      .filter(l => !/^\s*#/.test(l) && !/^\s+ALLOWED: /.test(l))
      .join('\n');
    assert.doesNotMatch(t, /\bpython|\bpip\b|\bnode\b|\.sh\b|\btools\/|secrets\./, `${j} runs only its own shell`);
    assert.deepStrictEqual([...new Set([...t.matchAll(/uses: (\S+)/g)].map(m => m[1].replace(/@.*/, '')))].sort(), [
      'actions/checkout',
      'actions/download-artifact'
    ]);
  }
  // The token only in the Commit steps of the push jobs.
  assert.strictEqual((WF.match(/github\.token/g) || []).length, 2);
  writers.forEach(j => assert.match(job(j), /- name: Commit\n\s+env:\n\s+GH_TOKEN: \$\{\{ github\.token \}\}\n/, j));
  // Every checkout without credentials kept.
  const checkouts = WF.split('uses: actions/checkout@').slice(1);
  assert.strictEqual(checkouts.length, JOBS.length);
  checkouts.forEach(c => assert.match(c.split('- ')[0], /persist-credentials: false/));
});

test('pip installs only hashed packages', () => {
  const dir = path.join(ROOT, '.github/workflows');
  let installs = 0;
  for (const f of fs.readdirSync(dir)) {
    for (const l of fs
      .readFileSync(path.join(dir, f), 'utf8')
      .split('\n')
      .filter(l => /\bpip3? install\b/.test(l) && !/^\s*#/.test(l))) {
      installs++;
      assert.match(l, /pip install --require-hashes -r tools\/requirements\.txt$/, `${f}: ${l.trim()}`);
    }
  }
  assert.ok(installs >= 2);
  // Each requirement pinned (==) with at least one hash; nothing unhashed.
  const reqs = fs
    .readFileSync(path.join(ROOT, 'tools/requirements.txt'), 'utf8')
    .replace(/\\\n/g, ' ')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'));
  assert.ok(reqs.length >= 1);
  reqs.forEach(r => assert.match(r, /^[a-z0-9._-]+==[\w.]+( +--hash=sha256:[0-9a-f]{64})+\s*$/i, r.slice(0, 60)));
});

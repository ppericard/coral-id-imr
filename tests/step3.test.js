// The history rewrite's push (docs/reviews/step3/rewrite.sh, the plan in docs/reviews/2026-11-05-photos-step3-plan.md)
// on local repositories: the optional canary's branch is left as it is by the atomic push that follows (Codex review
// #605: the push compared every ref with the backup and always aborted after a canary), and anything else that moved
// since the backup still aborts it with nothing pushed.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'docs', 'reviews', 'step3', 'rewrite.sh');
const ENV = Object.assign({}, process.env, {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null'
});
const git = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], {env: ENV, encoding: 'utf8'}).trim();
const heads = dir => git(dir, 'for-each-ref', '--format=%(objectname) %(refname)', 'refs/heads', 'refs/tags');
const run = (work, origin, ...a) =>
  spawnSync('bash', [SCRIPT, ...a], {env: Object.assign({}, ENV, {GO: 'yes', WORK: work, URL: origin}), encoding: 'utf8'});

// origin.git (GitHub) with main, a and b; WORK as prepare leaves it: old-heads.txt, rewrite.git with every branch
// rewritten (new commits), new-heads.txt
function setup() {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'step3-')),
    origin = path.join(T, 'origin.git'),
    work = path.join(T, 'work'),
    rw = path.join(work, 'rewrite.git');
  git(T, 'init', '-q', '--bare', '-b', 'main', origin);
  const tree = git(origin, 'hash-object', '-t', 'tree', '-w', '/dev/null'); // the empty tree
  for (const b of ['main', 'a', 'b']) git(origin, 'update-ref', `refs/heads/${b}`, git(origin, 'commit-tree', tree, '-m', `old ${b}`));
  fs.mkdirSync(work);
  fs.writeFileSync(path.join(work, 'old-heads.txt'), heads(origin) + '\n');
  git(T, 'clone', '-q', '--bare', origin, rw);
  for (const b of ['main', 'a', 'b']) git(rw, 'update-ref', `refs/heads/${b}`, git(rw, 'commit-tree', tree, '-m', `new ${b}`));
  fs.writeFileSync(path.join(work, 'new-heads.txt'), heads(rw) + '\n');
  return {T, origin, work, rw};
}

test('step3 rewrite.sh: a canary, then the atomic push of the other branches', () => {
  const {T, origin, work, rw} = setup();
  try {
    const c = run(work, origin, 'canary', 'a');
    assert.strictEqual(c.status, 0, c.stdout + c.stderr);
    assert.strictEqual(git(origin, 'rev-parse', 'refs/heads/a'), git(rw, 'rev-parse', 'refs/heads/a'), 'the canary pushed a');
    assert.notStrictEqual(git(origin, 'rev-parse', 'refs/heads/b'), git(rw, 'rev-parse', 'refs/heads/b'), 'b not yet');
    const p = run(work, origin, 'push');
    assert.strictEqual(p.status, 0, p.stdout + p.stderr);
    assert.match(p.stdout, /1 ref\(s\) already rewritten/);
    assert.strictEqual(heads(origin), heads(rw), 'GitHub = the rewrite');
    const again = run(work, origin, 'push');
    assert.strictEqual(again.status, 0, again.stdout + again.stderr);
    assert.match(again.stdout, /nothing left to push/);
  } finally {
    fs.rmSync(T, {recursive: true, force: true});
  }
});

test('step3 rewrite.sh: a branch moved since the backup aborts the push, nothing pushed', () => {
  const {T, origin, work} = setup();
  try {
    assert.strictEqual(run(work, origin, 'canary', 'a').status, 0);
    const tree = git(origin, 'rev-parse', 'refs/heads/b^{tree}');
    git(origin, 'update-ref', 'refs/heads/b', git(origin, 'commit-tree', tree, '-p', 'refs/heads/b', '-m', 'pushed meanwhile'));
    const before = heads(origin),
      p = run(work, origin, 'push');
    assert.notStrictEqual(p.status, 0, 'the push aborts');
    assert.match(p.stderr, /GitHub moved since the backup/);
    assert.match(p.stdout, /MOVED refs\/heads\/b/);
    assert.strictEqual(heads(origin), before, 'nothing pushed');
    git(origin, 'update-ref', 'refs/heads/c', git(origin, 'rev-parse', 'refs/heads/main'));
    assert.match(run(work, origin, 'push').stdout, /MOVED refs\/heads\/c new on GitHub/);
  } finally {
    fs.rmSync(T, {recursive: true, force: true});
  }
});

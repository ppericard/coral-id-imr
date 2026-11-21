require('./slot.js').testGuard();
// The shareFree arm's study scripts (tools/studies/sharefree/, REE-11): arm.js refuses before running anything without
// --out or beyond level 2 (rule L11, tools/checkbudget.js level3Reason); report.js reads a partial results file (a run
// cut at the budget or failed) without crashing. Made-up runs only; nothing is simulated here.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const DIR = path.join(__dirname, '..', 'tools', 'studies', 'sharefree'),
  run = (f, args) =>
    spawnSync(process.execPath, [path.join(DIR, f), ...args], {encoding: 'utf8', timeout: 20000, env: {...process.env, CI: '1'}});

test('arm.js refuses without --out and beyond level 2, before any run', () => {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sharefree-')), 'out.json');
  let r = run('arm.js', ['--seeds', '1', '--questions', '10']);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /--out FILE is required/);
  r = run('arm.js', ['--seeds', '21', '--questions', '10', '--out', tmp]);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /Level 3 \(21 seeds/);
  r = run('arm.js', ['--seeds', '1', '--questions', '10001', '--out', tmp]);
  assert.strictEqual(r.status, 2, r.stderr);
  assert.match(r.stderr, /Level 3 \(10001 answers/);
  assert.ok(!fs.existsSync(tmp), 'nothing written');
});

test('report.js prints "insufficient data" for a profile without a complete pair and reports the others', () => {
  const rows = [{q: 10, right: 50, met: 4, score: 1, fam: 0}],
    one = (arm, profile, seed) => ({arm, profile, seed, N: 10, freeMax: 0, seq: 'ffffffffff', advAt: {}, owAt: {}, kinds: {A: 'f'}, rows}),
    file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sharefree-')), 'partial.json');
  fs.writeFileSync(
    file,
    JSON.stringify({
      commit: 'test',
      seeds: 1,
      questions: 10,
      profiles: ['beginner', 'lectureRA', 'expert'],
      seconds: 1,
      cut: true,
      // beginner: a complete pair; lectureRA: one arm only (the other failed); expert: no run at all
      runs: [
        one('free', 'beginner', 1),
        one('empty', 'beginner', 1),
        one('free', 'lectureRA', 1),
        {arm: 'empty', profile: 'lectureRA', seed: 1, error: 'made-up failure'}
      ]
    })
  );
  const r = run('report.js', [file]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /== beginner: 1 paired seeds/);
  assert.match(r.stdout, /== lectureRA: insufficient data \(1 successful runs/);
  assert.match(r.stdout, /== expert: insufficient data \(0 successful runs/);
});

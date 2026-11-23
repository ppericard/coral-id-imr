'use strict';
require('./slot.js').testGuard();
// The night report (Pierre, 2026-11-18: "un bilan chiffré le matin"; Rule 0: the night ends with his first message after 04:00): tools/night.py on
// saved snapshots (no network), and the advisory compatibility flag for older UserPromptSubmit hooks.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..');

const py = body =>
  execFileSync('python3', ['-B', '-c', 'import json,sys; sys.path.insert(0, "tools"); import night\n' + body], {cwd: ROOT, timeout: 10000})
    .toString()
    .trim();

test('the night: yesterday 17:30 to today 04:00 Manila, or to now before 04:00', () => {
  const w = utc =>
    JSON.parse(
      py(
        `from datetime import datetime; print(json.dumps([t.isoformat() for t in night.window(datetime.fromisoformat(${JSON.stringify(utc)}))]))`
      )
    );
  // 2026-11-18 08:00 Manila
  assert.deepStrictEqual(w('2026-11-18T00:00:00+00:00'), ['2026-11-17T17:30:00+08:00', '2026-11-18T04:00:00+08:00']);
  // 2026-11-18 03:00 Manila: the night so far
  assert.deepStrictEqual(w('2026-11-17T19:00:00+00:00'), ['2026-11-17T17:30:00+08:00', '2026-11-18T03:00:00+08:00']);
  // 2026-11-18 04:00 Manila: the night is over
  assert.deepStrictEqual(w('2026-11-17T20:00:00+00:00'), ['2026-11-17T17:30:00+08:00', '2026-11-18T04:00:00+08:00']);
  // 2026-11-18 19:00 Manila: still last night, the coming one is not over
  assert.deepStrictEqual(w('2026-11-18T11:00:00+00:00'), ['2026-11-17T17:30:00+08:00', '2026-11-18T04:00:00+08:00']);
});

const report = snap => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'night-')), 'snap.json');
  fs.writeFileSync(f, JSON.stringify(snap));
  const r = spawnSync('python3', [path.join(ROOT, 'tools/night.py'), '--json', f], {encoding: 'utf-8', timeout: 10000});
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout;
};
const NIGHT = {start: '2026-11-17T17:30:00+08:00', end: '2026-11-18T04:00:00+08:00'};

test('a night with work: merged PRs and their agent time, red trains, what is still open and why, the queue', () => {
  const out = report({
    ...NIGHT,
    merged: [
      {n: 1053, title: 'Staff and cohort boards', agent_min: 50},
      {n: 1057, title: 'Exam reserve', agent_min: 100},
      {n: 1060, title: 'Docs', agent_min: null}
    ],
    trains: [
      {branch: 'train/20261117-1200', conclusion: 'success', failed: []},
      {branch: 'train/20261117-1300', conclusion: 'failure', failed: ['Smokes: failure']}
    ],
    opened: [{n: 1061, title: 'Sea slug editor', why: 'needs-pierre, green'}],
    queue: ['Fish basics (#1108)', 'Sea slug achievements 60-100%'],
    prs: {1108: 'open, checks running'}
  });
  assert.match(out, /^Night Tue 17 Nov 17:30 → Wed 18 Nov 04:00 \(Manila\)/);
  assert.match(out, /Merged: 3 PRs, 2\.5 h of agent time/);
  assert.match(out, /#1053 Staff and cohort boards \(50 min\)/);
  assert.match(out, /#1060 Docs \(agent time not measured\)/);
  assert.match(out, /Trains: 2 run, 1 red\n {2}train\/20261117-1300: Smokes: failure/);
  assert.match(out, /Opened and still open: 1\n {2}#1061 Sea slug editor: needs-pierre, green/);
  assert.match(out, /Night queue: 2 items, 1 started/);
  assert.match(out, /Fish basics \(#1108\) \[#1108 open, checks running\]/);
  assert.match(out, /Sea slug achievements 60-100% \[NOT STARTED\]/);
  assert.doesNotMatch(out, /Nothing merged/);
});

test('an empty night says so, and a missing queue is named', () => {
  const out = report({...NIGHT, merged: [], trains: [], opened: [], queue: null, prs: {}});
  assert.match(out, /Merged: 0 PRs\n/);
  assert.match(out, /Night queue: none written in docs\/STATUS\.md/);
  assert.match(out, /⚠ Nothing merged and no PR opened during the night\./);
});

// Codex review #1117: a busy night has more than 100 workflow runs; every page is read.
test('lists are read page by page until a short page, or until the stop item', () => {
  const out = py(`
pages = {1: [{'i': i} for i in range(100)], 2: [{'i': 100 + i} for i in range(100)], 3: [{'i': 200}]}
calls = []
def fake(path):
    calls.append(path)
    return {'workflow_runs': pages[int(path.rsplit('=', 1)[1])]}
night.gh = fake
all_runs = night.gh_all('x?per_page=100', key='workflow_runs')
calls_all = len(calls)
night.gh = lambda path: pages[int(path.rsplit('=', 1)[1])]
early = night.gh_all('x?per_page=100', stop=lambda p: p['i'] >= 99)
print(json.dumps([len(all_runs), calls_all, len(early)]))`);
  assert.deepStrictEqual(JSON.parse(out), [201, 3, 100]);
});

test('the queue is read from STATUS "## Night queue", "None" meaning empty', () => {
  const q = s => JSON.parse(py(`print(json.dumps(night.queue(${JSON.stringify(s)})))`));
  assert.deepStrictEqual(q('# Status\n\n## Night queue\n\n- Fish basics (#1108)\n- Sea slug\n  achievements\n\n## Last stop\n\nx\n'), [
    'Fish basics (#1108)',
    'Sea slug achievements'
  ]);
  assert.deepStrictEqual(q('## Night queue\n\n- None\n'), []);
  assert.strictEqual(q('## Now\n\nx\n'), null);
});

test('legacy --night-due reports uncertainty without touching a marker or demanding the report', t => {
  const mark = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mark-')), 'day');
  t.after(() => fs.rmSync(path.dirname(mark), {recursive: true, force: true}));
  const env = {...process.env, BRIEF_NIGHT_MARK: mark, HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', GH_TOKEN: ''};
  const run = (...a) =>
    execFileSync('python3', [path.join(ROOT, 'tools/brief.py'), '--time', ...a], {env, timeout: 5000})
      .toString()
      .trim()
      .split('\n');
  assert.strictEqual(run('--night-due', '--at', '03:59').length, 1, 'before 04:00: the night is not over');
  for (const time of ['04:01', '09:00', '15:02', '17:29']) {
    const result = run('--night-due', '--at', time);
    assert.strictEqual(result.length, 2);
    assert.match(result[1], /first message and today's delivery status are unknown/);
  }
  assert.ok(!fs.existsSync(mark));
  fs.writeFileSync(mark, 'legacy marker\n');
  assert.match(run('--night-due', '--at', '15:02')[1], /unknown/);
  assert.strictEqual(fs.readFileSync(mark, 'utf8'), 'legacy marker\n');
  fs.rmSync(mark);
  assert.strictEqual(run('--night-due', '--at', '17:30').length, 1, 'Rule 0 is quiet from 17:30: no morning line then');
  assert.strictEqual(run('--night-due', '--at', '19:26').length, 1, 'not in the evening, even in a fresh checkout');
  assert.strictEqual(run('--at', '04:01').length, 1, 'without --night-due: the one time line');
});

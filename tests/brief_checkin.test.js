'use strict';
require('./slot.js').testGuard();
// tools/brief.py --checkin is what every send_later check-in of the integrator runs (REE-244): the live signals, then the
// reviewed text of tools/checkin.md, so the check-in's prompt is one fixed line and never a list of items. The work's
// source is Linear's Next view: the brief has no Linear access, so it prints the view's link and says the count is
// unknown, never a number. Offline: no gh on PATH, a proxy that never answers, a temporary checkout and queue log
// (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf-8');

// A checkout with INTEGRATOR.md and (unless told otherwise) tools/checkin.md, and a queue directory with a log.
function setup({checkin = true, log = '17:35 #12 open abc1234 merge=clean\n18:02 #12 trained abc1234\n'} = {}) {
  const top = fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-')),
    root = path.join(top, 'root'),
    queue = path.join(top, 'queue');
  fs.mkdirSync(path.join(root, 'docs'), {recursive: true});
  fs.mkdirSync(path.join(root, 'tools'));
  fs.mkdirSync(queue);
  fs.copyFileSync(path.join(ROOT, 'docs/INTEGRATOR.md'), path.join(root, 'docs/INTEGRATOR.md'));
  if (checkin) fs.copyFileSync(path.join(ROOT, 'tools/checkin.md'), path.join(root, 'tools/checkin.md'));
  if (log !== null) fs.writeFileSync(path.join(queue, 'nightq.log'), log);
  // A PATH with python3, git and pgrep only: gh is never found, wherever the machine keeps it (CI has it in /usr/bin).
  const bin = path.join(top, 'bin');
  fs.mkdirSync(bin);
  for (const t of ['python3', 'git', 'pgrep']) {
    const at = spawnSync('which', [t], {encoding: 'utf-8'}).stdout.trim();
    if (at) fs.symlinkSync(at, path.join(bin, t));
  }
  return {root, queue, bin};
}

// The way a check-in may run it: the script on stdin, the checkout in CLAUDE_PROJECT_DIR, no gh, no network.
const run = (s, ...a) => {
  const r = spawnSync(path.join(s.bin, 'python3'), ['-I', '-', '--checkin', ...a], {
    input: read('tools/brief.py'),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: s.root,
      QUEUE_DIR: s.queue,
      AGENT_LOG: path.join(s.queue, 'none.jsonl'),
      HTTPS_PROXY: 'http://127.0.0.1:9',
      https_proxy: 'http://127.0.0.1:9',
      GH_TOKEN: '',
      PATH: s.bin
    },
    cwd: '/',
    encoding: 'utf-8',
    timeout: 20000
  });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout;
};

test('--checkin: the time line, the Next view link with an unknown count, PRs, queue, launches, then tools/checkin.md', () => {
  const s = setup();
  const out = run(s, '--at', '22:10');
  const [head, text] = out.split('\n\n# Check-in\n\n');
  const lines = head.split('\n');
  assert.match(lines[0], /^Manila \w{3} \d\d \w{3} 22:10 · quiet: after 17:30 \(Rule 0\)/);
  const sec = read('docs/INTEGRATOR.md').split('\n## Linear\n')[1];
  const next = sec.match(/\[Next \(ready to start\)\]\((https:\/\/linear\.app\/reef-id\/view\/[0-9a-f-]{36})\)/)[1];
  assert.strictEqual(lines[1], `Linear Next view: ${next} · Todo count unknown: open the view (the brief has no Linear access)`);
  assert.strictEqual(lines[2], 'PRs: not listed (gh not found)');
  // The processes are the machine's: only their form is checked here; the log is the fixture's.
  assert.match(
    lines[3],
    /^Queue: nightq\.sh (on #\d+(, #\d+)*|not running|unknown) · train\.py (on #\d+(, #\d+)*|not running|unknown) · log \d+m ago: 18:02 #12 trained abc1234$/
  );
  assert.strictEqual(lines[4], 'Agent launches today: none logged · running agents: your task list (not visible here)');
  assert.strictEqual(lines.length, 5, head);
  assert.strictEqual('# Check-in\n\n' + text.trim(), read('tools/checkin.md').trim(), 'the reviewed text, verbatim');
  // REE-318: the rendered body no longer sends agents to the closed REE-230 trial.
  assert.doesNotMatch(text, /\bREE-230\b/);
  assert.match(run(s, '--at', '09:00').split('\n')[0], / · day: working day \(Rule 0\)/);
});

test('--checkin never invents: no log, no checkin.md, each said in its line', () => {
  const s = setup({checkin: false, log: null});
  const out = run(s);
  assert.match(out, /^Queue: .* · no log at .*nightq\.log$/m);
  assert.match(out, /tools\/checkin\.md not found: follow docs\/INTEGRATOR\.md "Habits" and "Linear"/);
  assert.ok(!/Todo count: \d|\d+ Todo/.test(out), 'a count of Todo issues the brief cannot know');
  fs.writeFileSync(path.join(s.queue, 'nightq.log'), '');
  assert.match(run(s), /^Queue: .* · log empty$/m);
});

test('the queue processes: the scripts themselves, never a shell whose command merely names them', () => {
  const PROBE = [
    'import json, sys',
    'sys.path.insert(0, "tools")',
    'import brief',
    'lines = json.loads(sys.argv[1])',
    'print(json.dumps({n: [m.group(1).split() if m else None for m in map(rx.match, lines)] for n, rx in brief.QUEUE_PROCS}))'
  ].join('\n');
  const lines = [
    'bash tools/queue/nightq.sh 1391',
    'bash /home/u/repo/tools/queue/nightq.sh 1474 1478',
    "/bin/bash -c source x && eval 'bash tools/queue/nightq.sh 1471 > /dev/null; grep x'",
    'python3 tools/train.py --sha 7d43367af7169f8e751c4fc53762441c4b9f29fc 1478',
    'python3 tools/train.py --dry-run --sha fa1e136 1391 1400',
    'grep train.py notes.txt'
  ];
  const r = spawnSync('python3', ['-B', '-c', PROBE, JSON.stringify(lines)], {cwd: ROOT, encoding: 'utf-8'});
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout), {
    'nightq.sh': [['1391'], ['1474', '1478'], null, null, null, null],
    'train.py': [null, null, null, ['1478'], ['1391', '1400'], null]
  });
});

test('the check-in text names its source of work and the one-line prompt; INTEGRATOR "Habits" uses that line', () => {
  const t = read('tools/checkin.md');
  assert.ok(t.includes('Check-in: run `python3 tools/brief.py --checkin` and follow it'), 'the one-line prompt');
  assert.match(t, /every open issue, whatever its column/);
  assert.match(t, /Sweep, about every 90 minutes/);
  assert.match(t, /INTEGRATOR "Linear"\]\(\.\.\/docs\/INTEGRATOR\.md#linear\)/);
  assert.match(t, /nightq\.sh/);
  // REE-318: the closed REE-230 trial is no longer a destination; a new recovery failure goes to its open owning issue.
  assert.doesNotMatch(t, /\bREE-230\b/);
  assert.match(
    t,
    /6\. \*\*Recovery incidents\.\*\* If recovery exposed a new failure, record the evidence on its current open owning issue\./
  );
  assert.match(t, /send_later/);
  const habits = read('docs/INTEGRATOR.md').split('\n## Habits\n')[1].split('\n## ')[0];
  assert.ok(habits.includes('"Check-in: run `python3 tools/brief.py --checkin` and follow it"'), 'Habits names the one-line prompt');
});

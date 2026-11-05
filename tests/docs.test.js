'use strict';
// Docs that every PR touches must not conflict between open PRs (Pierre, 2026-11-04: "we lose a huge amount of time
// resolving conflicts"): no running "done" list that every PR appends to (AGENTS.md "How to ship a change", rule 9).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('no running "done" list in the living docs', () => {
  for (const f of ['docs/ROADMAP.md', 'docs/ARCHITECTURE.md', 'AGENTS.md', 'README.md'])
    assert.ok(!/^#+ .*\b(Done|Shipped|Changelog)\b/im.test(read(f)), f + ': a done / shipped / changelog section');
});

test('the archived done list stays frozen', () => {
  const h = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, 'docs/archive/DONE-until-2026-11-04.md')))
    .digest('hex');
  assert.strictEqual(
    h,
    '375cfea3cce712f5fe16a183d6e9b693c941b40fe758693077b12c6f1132c87e',
    'docs/archive/DONE-until-2026-11-04.md is frozen: never add to or edit it'
  );
});

// Codex review #502: since #499 the deploy stamps the version numbers; no doc may tell a PR to bump them by hand or to
// run the retired check_versions.py flags (--fix, --base, --no-base).
test('the docs never tell a PR to bump version numbers by hand', () => {
  for (const f of ['docs/ARCHITECTURE.md', 'AGENTS.md', 'README.md', 'docs/HANDOVER.md'])
    assert.ok(!/check_versions\.py --fix|--no-base|`--fix` bumps|so bump `\?v=`/.test(read(f)), f + ': a manual version bump');
});

// Governance refonte PR B (Pierre, 2026-11-05): docs/STATUS.md is the one place for where things stand, written by the
// integrator only and overwritten, never appended, so it must stay short; it replaced the evening log, whose name must not
// come back anywhere (the archive and the copied reviews are history and keep their words).
const STATUS = read('docs/STATUS.md');

test('docs/STATUS.md exists, has its sections and stays within its budget', () => {
  const lines = STATUS.split('\n').length;
  assert.ok(lines <= 100, 'docs/STATUS.md has ' + lines + ' lines: at most about 100 (overwrite it, never append)');
  for (const h of ['Now', 'Next', 'Questions for Pierre', "Pierre's hands", 'Parked after hours', 'Last stop'])
    assert.ok(new RegExp('^## ' + h + '$', 'm').test(STATUS), 'docs/STATUS.md: section "## ' + h + '" missing');
});

test('question numbers never go back: the last number covers every open question', () => {
  const m = /Last question number: Q(\d+)/.exec(STATUS);
  assert.ok(m, 'docs/STATUS.md: the line "Last question number: Qn" is missing');
  const sec = /^## Questions for Pierre\n([\s\S]*?)(?=^## )/m.exec(STATUS)[1];
  for (const q of sec.matchAll(/^- \*\*Q(\d+)/gm))
    assert.ok(Number(q[1]) <= Number(m[1]), 'Q' + q[1] + ' is above the last question number Q' + m[1]);
});

test('no reference to the retired evening log', () => {
  const name = 'EVENING' + '.md';
  assert.ok(!fs.existsSync(path.join(ROOT, 'docs', name)), 'docs/' + name + ' was retired: docs/STATUS.md replaces it');
  const skip = new Set(['.git', 'img', 'node_modules', 'worktrees', 'archive', 'reviews']);
  const bad = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|js|py|gs|html|css|yml|sh|txt)$/.test(e.name) || p.endsWith(path.join('.claude', 'settings.json')))
        if (fs.readFileSync(p, 'utf8').includes(name)) bad.push(path.relative(ROOT, p));
    }
  };
  walk(ROOT);
  assert.deepStrictEqual(bad, [], 'files still naming the evening log (now docs/STATUS.md)');
});

// tools/brief.py --time is the UserPromptSubmit hook: it must answer at once and never need the network.
test('tools/brief.py --time runs offline and names the Rule 0 window', () => {
  const {execFileSync} = require('child_process');
  const env = {...process.env, HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', GH_TOKEN: ''};
  const run = (...a) => execFileSync('python3', [path.join(ROOT, 'tools/brief.py'), '--time', ...a], {env, timeout: 5000}).toString();
  const out = run();
  assert.match(out, /^Manila \w{3} \d\d \w{3} \d\d:\d\d · (night|day|closing|quiet): .+\n$/, out);
  const at = t => / · (\w+):/.exec(run('--at', t))[1];
  assert.deepStrictEqual(['07:59', '08:00', '16:29', '16:30', '17:29', '17:30', '23:59'].map(at), [
    'night',
    'day',
    'day',
    'closing',
    'closing',
    'quiet',
    'quiet'
  ]);
});

// Codex review #561: a cancelled or stale check never succeeded, so the brief must not call the PR green.
test('tools/brief.py calls a PR green only when every check succeeded', () => {
  const {execFileSync} = require('child_process');
  const sum = runs =>
    execFileSync(
      'python3',
      [
        '-B',
        '-c',
        'import json,sys; sys.path.insert(0, "tools"); import brief; print(brief.summarise(json.loads(sys.argv[1])))',
        JSON.stringify(runs)
      ],
      {cwd: ROOT}
    )
      .toString()
      .trim();
  const done = c => ({status: 'completed', conclusion: c});
  assert.strictEqual(sum([done('success'), done('skipped'), done('neutral')]), 'green');
  assert.strictEqual(sum([]), 'no checks');
  assert.match(sum([done('success'), done('failure')]), /^FAILING 1\/2/);
  assert.match(sum([done('success'), {status: 'in_progress', conclusion: null}]), /^running 1\/2/);
  assert.match(sum([done('success'), done('cancelled')]), /^NOT GREEN 1\/2/);
  assert.match(sum([done('success'), done('stale')]), /^NOT GREEN 1\/2/);
});

test('the session hooks run tools/brief.py', () => {
  const hooks = JSON.parse(read('.claude/settings.json')).hooks;
  const cmd = ev => hooks[ev].flatMap(h => h.hooks.map(x => x.command)).join(' ');
  assert.match(cmd('SessionStart'), /tools\/brief\.py" --short/);
  assert.match(cmd('UserPromptSubmit'), /tools\/brief\.py" --time/);
});

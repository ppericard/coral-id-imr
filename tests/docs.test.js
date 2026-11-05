'use strict';
// Docs that every PR touches must not conflict between open PRs (Pierre, 2026-11-04: "we lose a huge amount of time
// resolving conflicts"): no running "done" list that every PR appends to (rule W19).
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
  assert.match(STATUS, /^Last checked: reports and events: .+$/m, 'docs/STATUS.md: the "Last checked: reports and events" line');
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
  assert.deepStrictEqual(['04:59', '05:00', '16:29', '16:30', '17:29', '17:30', '23:59'].map(at), [
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

// Codex security review #561: a hook runs at every session start and prompt, so it must not run code from whatever
// branch is checked out: it runs main's reviewed copy (git show origin/main:tools/brief.py), in isolated mode (-I: no
// module planted in the checkout is imported), with the checkout's path from CLAUDE_PROJECT_DIR.
// Codex review #561: the brief's version probe is a read-only GET like the app's; without an app version (av) the sync
// script takes it for an app before 2026-11-03 and writes an "old" row in Events. It must leave Events untouched.
test("the brief's live-version probe writes nothing to the sheet", () => {
  const {execFileSync} = require('child_process');
  const q = execFileSync('python3', ['-B', '-c', 'import sys; sys.path.insert(0, "tools"); import brief; print(brief.STATS_QUERY)'], {
    cwd: ROOT
  })
    .toString()
    .trim();
  const params = Object.fromEntries(new URLSearchParams(q.replace(/^\?/, '')));
  assert.ok(params.stats, q + ': the probe asks for the photo stats');
  const s = require('./gas.js').loadCodeGs();
  const r = s.get(params);
  assert.ok(r.v, 'the reply carries v');
  const ev = s.sheets.Events ? s.sheets.Events.rows : [];
  assert.deepStrictEqual(ev, [], 'the probe wrote to Events');
});

test("the session hooks run main's tools/brief.py, never the checked-out copy", () => {
  const hooks = JSON.parse(read('.claude/settings.json')).hooks;
  const cmd = ev => hooks[ev].flatMap(h => h.hooks.map(x => x.command)).join(' ');
  for (const [ev, flag] of [
    ['SessionStart', '--short'],
    ['UserPromptSubmit', '--time']
  ]) {
    assert.match(cmd(ev), new RegExp('git show origin/main:tools/brief\\.py 2>/dev/null \\| python3 -I - ' + flag), ev);
    assert.ok(!/python3 [^|]*tools\/brief\.py/.test(cmd(ev)), ev + ' runs the checked-out tools/brief.py');
  }
});

test('tools/brief.py fed on stdin finds the checkout through CLAUDE_PROJECT_DIR', () => {
  const {execFileSync} = require('child_process');
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: ROOT,
    HTTPS_PROXY: 'http://127.0.0.1:9',
    https_proxy: 'http://127.0.0.1:9',
    PATH: '/usr/bin:/bin'
  };
  const out = execFileSync('python3', ['-I', '-', '--short'], {input: read('tools/brief.py'), env, cwd: '/', timeout: 10000}).toString();
  assert.match(out, /^Manila /);
  assert.match(out, /Questions for Pierre: \d+ open, last number Q\d+/);
  // brief.py cannot read the sheet (the connector is the agent's): it reminds of the reports and events check.
  assert.match(out, /reports and events last checked .+: read them/);
  assert.ok(out.trim().split('\n').length <= 5, '--short: 5 lines at most');
});

// Governance refonte PR C (Pierre, 2026-11-05): AGENTS.md is the short constitution every agent reads (Codex reads only
// its first 32 KiB by default), and every standing rule has one stable ID by theme, defined once in docs/rules/<topic>.md
// as a "### <ID>" heading. The two numbered lists it replaced (the standing rules and the steps of "how to make a
// change") are gone: no compatibility with the old numbers (alpha, rule W3).
const AGENTS = read('AGENTS.md');
const RULE_FILES = {C: 'content', P: 'photos', L: 'learning', U: 'ui', A: 'admin', S: 'subjects', D: 'sheet', W: 'ship'};
const RULES = new Map(); // id -> file
const DUPES = [];
for (const [letter, name] of Object.entries(RULE_FILES)) {
  const f = 'docs/rules/' + name + '.md';
  for (const m of read(f).matchAll(/^### ([A-Z]\d+)$/gm)) {
    if (RULES.has(m[1])) DUPES.push(m[1] + ' in ' + f + ' and ' + RULES.get(m[1]));
    RULES.set(m[1], f);
  }
}
// Every text file a rule may be cited in. The copied reviews and the archive are history: they keep their words.
const TEXT_FILES = (() => {
  const skip = new Set(['.git', 'img', 'node_modules', 'worktrees', 'archive', 'fonts']);
  const out = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name),
        rel = path.relative(ROOT, p);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|js|py|gs|html|css|yml|yaml|sh|txt|json|tsv)$/.test(e.name) || rel === '.prettierignore')
        if (!rel.startsWith(path.join('docs', 'reviews') + path.sep) || rel === path.join('docs', 'reviews', 'README.md')) out.push(rel);
    }
  };
  walk(ROOT);
  return out;
})();

test('AGENTS.md stays within its size budget', t => {
  const kb = Buffer.byteLength(AGENTS) / 1024;
  assert.ok(kb <= 30, 'AGENTS.md is ' + kb.toFixed(1) + ' KB: 30 KB at most (target 20 KB; move details to docs/rules/)');
  if (kb > 20) t.diagnostic('AGENTS.md is ' + kb.toFixed(1) + ' KB, above its 20 KB target: move details to docs/rules/');
});

test('every rule ID is defined once, in the file of its theme, with its source, and listed in AGENTS.md', () => {
  assert.deepStrictEqual(DUPES, [], 'duplicate rule IDs');
  assert.ok(RULES.size >= 70, 'only ' + RULES.size + ' rules found in docs/rules/');
  for (const [id, f] of RULES) assert.strictEqual(f, 'docs/rules/' + RULE_FILES[id[0]] + '.md', id + ' is not in the file of its letter');
  for (const f of new Set(RULES.values())) {
    for (const block of read(f).split(/^### /m).slice(1))
      assert.match(block, /\*Source:\*/, f + ': rule ' + block.split('\n')[0] + ' has no *Source:* line');
  }
  const listed = [...AGENTS.matchAll(/^- \*\*([A-Z]\d+)\*\* /gm)].map(m => m[1]);
  const missing = [...RULES.keys()].filter(id => !listed.includes(id) && !/^W(1[2-9]|2\d)$/.test(id)); // W12+: the ship checklist
  assert.deepStrictEqual(missing, [], 'rules not listed in AGENTS.md "The rules"');
  for (const id of listed) assert.ok(RULES.has(id), 'AGENTS.md lists ' + id + ', defined in no docs/rules/ file');
});

test('every rule ID cited anywhere resolves to exactly one rule', () => {
  const bad = [];
  const ID = '[CPLUASDW]\\d{1,2}';
  const cite = new RegExp(`\\b[Rr]ules? (${ID}(?:(?:\\s*(?:,|and|or|/|-)\\s*)${ID})*)\\b`, 'g');
  for (const f of TEXT_FILES) {
    const src = read(f);
    for (const m of src.matchAll(cite)) {
      const ids = m[1].match(new RegExp(ID, 'g'));
      const range = /-/.test(m[1]) && ids.length === 2 ? ids : null;
      const all = range
        ? Array.from({length: +range[1].slice(1) - +range[0].slice(1) + 1}, (_, k) => range[0][0] + (+range[0].slice(1) + k))
        : ids;
      for (const id of all) if (!RULES.has(id)) bad.push(f + ': ' + m[0]);
    }
    for (const m of src.matchAll(/\brules\/([a-z]+)\.md#([a-z]\d+)\b/g)) {
      const id = m[2].toUpperCase();
      if (RULES.get(id) !== 'docs/rules/' + m[1] + '.md') bad.push(f + ': link ' + m[0]);
    }
  }
  assert.deepStrictEqual(bad, [], 'citations of rule IDs that do not exist');
});

test('no reference to the retired rule numbers or to the judging brief under its old name remains', () => {
  const old = [
    /\b(?:standing |workflow )?[Rr]ules? (?!0\b)\d{1,2}[a-z]?\b/, // a rule by its old number (Rule 0 stays)
    /\bAGENTS(?:\.md)? (?:rule )?\d/, // the file name and an old number
    /How to make a change"?\W{0,3}\d/, // an old step number
    /\bHow-to \d/
  ];
  const bad = [];
  for (const f of TEXT_FILES) {
    const src = read(f);
    for (const re of old) {
      const m = re.exec(src);
      if (m) bad.push(f + ': ' + m[0]);
    }
    if (src.includes('judging/' + 'AGENTS.md')) bad.push(f + ': judging/' + 'AGENTS.md (now judging/BRIEF.md)');
  }
  assert.deepStrictEqual(bad, [], 'references to the old numbered rules (rewrite them with the new IDs)');
  assert.ok(
    !fs.existsSync(path.join(ROOT, 'judging', 'AGENTS.md')),
    'judging/' + 'AGENTS.md is judging/BRIEF.md: Codex would load an AGENTS.md for any work under judging/'
  );
});

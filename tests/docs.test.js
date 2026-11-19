'use strict';
require('./slot.js').testGuard();
// Docs that every PR touches must not conflict between open PRs (resolving conflicts costs a lot of time): no running
// "done" list that every PR appends to (rule W19).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// The specification files ARCHITECTURE.md's map sections point to (docs restructuring of 2026-11-18, PR 4).
const SPECS = fs
  .readdirSync(path.join(ROOT, 'docs', 'spec'))
  .filter(f => /\.md$/.test(f))
  .map(f => 'docs/spec/' + f);

test('no running "done" list in the living docs', () => {
  for (const f of ['docs/ROADMAP.md', 'docs/ARCHITECTURE.md', 'AGENTS.md', 'README.md', ...SPECS])
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

// The deploy stamps the version numbers: no doc may tell a PR to bump them by hand or to run the retired
// check_versions.py flags (--fix, --base, --no-base).
test('the docs never tell a PR to bump version numbers by hand', () => {
  for (const f of ['docs/ARCHITECTURE.md', 'AGENTS.md', 'README.md', 'docs/HANDOVER.md', ...SPECS])
    assert.ok(!/check_versions\.py --fix|--no-base|`--fix` bumps|so bump `\?v=`/.test(read(f)), f + ': a manual version bump');
});

// docs/STATUS.md is the one place for where things stand, written by the integrator only and overwritten, never
// appended, so it must stay short; the retired evening log's name must not come back anywhere (the archive and the
// copied reviews are history and keep their words).
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
  assert.deepStrictEqual(['03:59', '04:00', '16:29', '16:30', '17:29', '17:30', '23:59'].map(at), [
    'quiet',
    'day',
    'day',
    'day',
    'day',
    'quiet',
    'quiet'
  ]);
});

// A cancelled or stale check never succeeded, so the brief must not call the PR green.
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

// A hook runs at every session start and prompt, so it must not run code from whatever branch is checked out: it runs
// main's reviewed copy (git show origin/main:tools/brief.py), in isolated mode (-I: no module planted in the checkout is
// imported), with the checkout's path from CLAUDE_PROJECT_DIR.
// The brief's version probe is a read-only GET like the app's; without an app version (av) the sync script would take
// it for an old app and write an "old" row in Events. It must leave Events untouched.
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
    // Without origin/main the hook fetches it, or says so with the Manila time: tests/hooks.test.js.
    assert.match(cmd(ev), new RegExp('F=tools/brief\\.py; .*git show "origin/main:\\$F".*\\| python3 -I - ' + flag), ev);
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

// AGENTS.md is the short constitution every agent reads (Codex reads only its first 32 KiB by default), and every
// standing rule has one stable ID by theme, defined once in docs/rules/<topic>.md as a "### <ID>" heading. The old
// numbered lists (the standing rules and the steps of "how to make a change") are never cited: no compatibility with
// the old numbers (alpha, rule W3).
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

// The living docs' relative links and anchors resolve, every ARCHITECTURE.md "X" cited
// anywhere names a section or a lead-in that exists, and docs/PAGES.md lists every workflow. Offline: files only. The
// copied reviews and the frozen archive are history and keep their links.
const LIVING_DOCS = TEXT_FILES.filter(
  f => /\.md$/.test(f) && !f.startsWith('docs' + path.sep + 'reviews' + path.sep) && !f.startsWith('.github' + path.sep)
);
// Fenced blocks and code spans hold examples, not links.
const fenceless = src => src.replace(/^(```|~~~)[\s\S]*?^\1/gm, ''),
  prose = src => fenceless(src).replace(/`[^`\n]*`/g, '');
// GitHub's heading anchors: lower case, punctuation dropped, each space a hyphen, a repeated heading suffixed -1, -2…
const anchorsOf = (() => {
  const memo = new Map();
  return f => {
    if (memo.has(f)) return memo.get(f);
    const src = fenceless(read(f)), // a heading's code keeps its text in GitHub's anchors
      seen = new Map(),
      out = new Set();
    for (const m of src.matchAll(/^#{1,6}[ \t]+(.*)$/gm)) {
      // Punctuation (HTML marks included) goes below; a link keeps its text.
      const s = m[1]
        .replace(/[ \t#]+$/, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s/g, '-');
      const n = seen.get(s) || 0;
      seen.set(s, n + 1);
      out.add(n ? s + '-' + n : s);
    }
    for (const m of src.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) out.add(m[1]);
    memo.set(f, out);
    return out;
  };
})();

test("heading anchors follow GitHub's: code in a heading keeps its text", () => {
  const a = anchorsOf(path.join('docs', 'spec', 'service-worker.md'));
  // # Service worker (`sw.js`), and docs/spec/fish-photos.md's ## Where fish photos come from (the sources and the area rule).
  assert.ok(a.has('service-worker-swjs'), 'the anchor of a heading with inline code');
  assert.ok(!a.has('service-worker-'), 'inline code dropped from a heading anchor');
  assert.ok(anchorsOf(path.join('docs', 'spec', 'fish-photos.md')).has('where-fish-photos-come-from-the-sources-and-the-area-rule'));
});

test('the living docs: every relative link and anchor resolves', () => {
  const bad = [];
  for (const f of LIVING_DOCS)
    for (const m of prose(read(f)).matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g)) {
      const u = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(u)) continue; // https:, mailto:: not checked offline
      const [p, a] = u.split('#'),
        target = p ? path.relative(ROOT, path.resolve(ROOT, path.dirname(f), decodeURIComponent(p))) : f;
      // A sparse checkout without img/ (rule W22) cannot see the photos: CI has them.
      if (target.split(path.sep)[0] === 'img' && !fs.existsSync(path.join(ROOT, 'img'))) continue;
      if (!fs.existsSync(path.join(ROOT, target))) bad.push(f + ': ' + u + ' (no such file)');
      else if (a && /\.md$/.test(target) && !anchorsOf(target).has(decodeURIComponent(a).toLowerCase()))
        bad.push(f + ': ' + u + ' (no such heading)');
    }
  assert.deepStrictEqual(bad, [], 'broken relative links in the living docs (point them at what exists, or say "PR #N")');
});

test('every ARCHITECTURE.md "X" cited in the repo names a section or a lead-in of docs/ARCHITECTURE.md', () => {
  // A citation is the start of a heading ("Photos" for "## Photos", "Fish content" for "### Fish content (`fish.json`…"),
  // or of a bullet or a paragraph's bold lead-in ("Photos, stopgap" for "- **Photos, stopgap** (…"); quotes, bold and
  // code marks are ignored on both sides.
  const flat = s => s.replace(/[*"`“”]/g, '').trim();
  const starts = read('docs/ARCHITECTURE.md')
    .split('\n')
    .map(l => flat(l.replace(/^\s*(?:#{1,6}\s+|[-*]\s+|\d+\.\s+)?/, '')));
  const bold = [...read('docs/ARCHITECTURE.md').matchAll(/\*\*([^*\n]+)\*\*/g)].map(m => flat(m[1]));
  const found = x => {
    const t = flat(x);
    return starts.some(s => s.startsWith(t) && !/[\p{L}\p{N}]/u.test(s[t.length] || '')) || bold.some(b => b.startsWith(t));
  };
  const bad = [];
  // The quoted names after the file's name, on its line or the next one (a comment or a wrapped paragraph).
  const cite =
    /ARCHITECTURE(?:\.md)?[ \t]*(?:\n[ \t]*(?:(?:\/\/|#|\*)[ \t]*)?)?((?:["“][^"”\n]+["”](?:,?[ \t]*(?:and[ \t]+|or[ \t]+)?)?)+)/g;
  for (const f of TEXT_FILES) {
    if (f.startsWith('docs' + path.sep + 'archive' + path.sep) || f === path.join('tests', 'docs.test.js')) continue; // history; this file's own examples
    for (const m of read(f).matchAll(cite))
      for (const q of m[1].matchAll(/["“]([^"”\n]+)["”]/g)) if (!found(q[1])) bad.push(f + ': ARCHITECTURE "' + q[1] + '"');
  }
  assert.deepStrictEqual(bad, [], 'citations of ARCHITECTURE.md sections that do not exist (add the section or fix the name)');
});

// ARCHITECTURE.md is a map: each docs/spec/ file is reached from it, so no specification is orphaned.
test('every docs/spec/ file is linked from docs/ARCHITECTURE.md', () => {
  const arch = read('docs/ARCHITECTURE.md');
  assert.ok(SPECS.length > 0, 'docs/spec/ holds no specification');
  assert.deepStrictEqual(
    SPECS.filter(f => !arch.includes('](' + f.replace(/^docs\//, ''))),
    [],
    'docs/spec/ files no ARCHITECTURE.md section links to'
  );
});

test('docs/PAGES.md lists every workflow, and only workflows that exist', () => {
  const dir = path.join(ROOT, '.github', 'workflows'),
    files = fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f)),
    sec = /^## Workflow inventory and triggers\n([\s\S]*?)(?=^## )/m.exec(read('docs/PAGES.md'));
  assert.ok(sec, 'docs/PAGES.md: the section "## Workflow inventory and triggers" is missing');
  const named = new Set([...sec[1].matchAll(/^\| `([\w.-]+\.ya?ml)`/gm)].map(m => m[1]));
  assert.deepStrictEqual(
    files.filter(f => !named.has(f)),
    [],
    'workflows missing from docs/PAGES.md "Workflow inventory and triggers" (a row each: trigger, commits, publishes?)'
  );
  assert.deepStrictEqual(
    [...named].filter(f => !files.includes(f)),
    [],
    'docs/PAGES.md lists workflows that are not in .github/workflows/'
  );
});

// The identifier-existence check: the code identifiers the governing docs cite in
// backticks still exist. Scope: AGENTS.md, docs/rules/*.md, ARCHITECTURE and its docs/spec/ files, HANDOVER, INTEGRATOR and LEARNING, the docs an agent
// follows or takes over from. ROADMAP and STATUS name work to come and are overwritten daily, README / PAGES / FORMATS / DESIGN
// have no habit of naming code, and the archive and the copied reviews are history. Offline: files only. Two forms count:
//   - a backticked path (`tools/x.py`, `tests/y.test.js`, `admin.js`, `tools/` ...) exists: from the root, from the doc's own
//     folder, or (a bare file name) anywhere in the repo; a folder only when its first segment is a folder of the repo;
//   - a backticked file followed by a backticked name (`core.js` `faOf`, `learn.js` `classics()`) finds the name, as a word, in
//     that file. A bare name with no file is out of scope (a name alone is too often a word, a key or a path's part).
// Fix the doc when a reference is simply stale. The list below is only for what a doc names on purpose though it is not (or no
// longer) in the repo; each entry says why, and an entry that matches nothing any more fails, so the list cannot rot.
const ID_DOCS = [
  'AGENTS.md',
  ...fs
    .readdirSync(path.join(ROOT, 'docs', 'rules'))
    .filter(f => /\.md$/.test(f))
    .map(f => 'docs/rules/' + f),
  'docs/ARCHITECTURE.md',
  ...SPECS,
  'docs/HANDOVER.md',
  'docs/INTEGRATOR.md',
  'docs/LEARNING.md'
];
// A path is the span as written; a pair is "<file> <name>" as written; prefix: every path starting with the key.
const ID_ALLOW = [
  {key: 'package.json', why: 'named to say it must never exist (rule W12)'},
  {key: 'curation-play.json', why: 'written at deploy and by the smokes, git-ignored (tools/curplay.py)'},
  {key: 'tools/.cache/', prefix: true, why: 'git-ignored: what the tools cache on the machine that ran them'},
  {key: 'docs/reviews/2026-11-09-admin-signout-seal.md', why: 'the note lives on the branch claude/admin-signout-seal only (INTEGRATOR)'},
  {key: 'tools/fish_photos.py his_ok', why: 'the stopgap\'s function, retired 2026-11-15 (rule P1 says "until 2026-11-15")'}
];
const ID_TREE = (() => {
  const skip = new Set(['.git', 'node_modules', 'worktrees']),
    files = new Set(),
    names = new Map();
  const walk = dir => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else {
        files.add(path.relative(ROOT, p).split(path.sep).join('/'));
        names.set(e.name, [...(names.get(e.name) || []), path.relative(ROOT, p).split(path.sep).join('/')]);
      }
    }
  };
  walk(ROOT);
  return {files, names};
})();
const ID_EXT = 'js|py|gs|html|css|md|json|yml|yaml|sh|tsv|txt';
// The files a cited file name may mean: exact path, relative to the doc's folder, or a bare name anywhere in the repo.
const idFiles = (doc, s) => {
  const rel = path.posix.join(path.posix.dirname(doc), s);
  return ID_TREE.files.has(s) ? [s] : ID_TREE.files.has(rel) ? [rel] : s.includes('/') ? [] : ID_TREE.names.get(s) || [];
};

test('the code identifiers the docs cite in backticks still exist', () => {
  const used = new Set(),
    bad = [];
  // Asked first, whether or not the file exists (git-ignored ones come and go with the smokes), so an entry is "used" by its mention.
  const allowed = key => {
    const a = ID_ALLOW.find(x => (x.prefix ? key.startsWith(x.key) : key === x.key));
    if (a) used.add(a.key);
    return !!a;
  };
  for (const doc of ID_DOCS) {
    const src = fenceless(read(doc));
    const seen = new Set();
    for (const m of src.matchAll(/`([^`\n]+)`/g)) {
      const s = m[1];
      if (new RegExp('^[\\w.\\/-]+\\.(' + ID_EXT + ')$').test(s)) {
        if (!allowed(s) && !idFiles(doc, s).length) seen.add('path `' + s + '`');
      } else if (/^[\w.-]+(\/[\w.-]+)*\/$/.test(s)) {
        const top = s.split('/')[0];
        const here = p => [...ID_TREE.files].some(f => f.startsWith(p));
        if (!allowed(s) && here(top + '/') && !here(s) && !here(path.posix.join(path.posix.dirname(doc), s)))
          seen.add('folder `' + s + '`');
      }
    }
    for (const m of src.matchAll(/`([\w./-]+\.(?:js|py|gs|html|css|yml))`\s+`([A-Za-z_$][\w$]*)(?:[.(\[][^`\n]*)?`/g)) {
      const files = idFiles(doc, m[1]);
      if (!files.length) continue; // the missing file is the path check's finding
      const word = new RegExp('(^|[^\\w$])' + m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w$])');
      if (!allowed(m[1] + ' ' + m[2]) && !files.some(f => word.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))))
        seen.add('`' + m[1] + '` has no `' + m[2] + '`');
    }
    for (const s of seen) bad.push(doc + ': ' + s);
  }
  assert.deepStrictEqual(
    bad,
    [],
    'identifiers the docs cite that are gone: fix the doc (or, for a history on purpose, ID_ALLOW with its reason)'
  );
  assert.deepStrictEqual(
    ID_ALLOW.filter(a => !used.has(a.key)).map(a => a.key),
    [],
    'ID_ALLOW entries no doc needs any more: delete them'
  );
});

// LEARNING.md describes the learning rules in force; the studies behind them live in docs/archive/learning-notebook.md.
// Every LEARNING.md "X" cited in the repo names a heading, or the start of a bullet, a paragraph or a bold lead-in, of
// LEARNING.md (as ARCHITECTURE.md's citations above); a citation of a study names the notebook instead. The archive and
// this file's own examples are left out.
test('every LEARNING.md "X" cited in the repo names a section or a lead-in of docs/LEARNING.md', () => {
  const doc = read('docs/LEARNING.md'),
    flat = s => s.replace(/[*"`“”]/g, '').trim(),
    starts = doc.split('\n').map(l => flat(l.replace(/^\s*(?:#{1,6}\s+|[-*]\s+|\d+\.\s+)?/, ''))),
    bold = [...doc.matchAll(/\*\*([^*\n]+)\*\*/g)].map(m => flat(m[1]));
  const found = x => {
    const t = flat(x);
    return starts.some(s => s.startsWith(t) && !/[\p{L}\p{N}]/u.test(s[t.length] || '')) || bold.some(b => b.startsWith(t));
  };
  const cite = /LEARNING(?:\.md)?[ \t]*(?:\n[ \t]*(?:(?:\/\/|#|\*)[ \t]*)?)?((?:["“][^"”\n]+["”](?:,?[ \t]*(?:and[ \t]+|or[ \t]+)?)?)+)/g;
  const bad = [];
  for (const f of TEXT_FILES) {
    if (f.startsWith('docs' + path.sep + 'archive' + path.sep) || f === path.join('tests', 'docs.test.js')) continue;
    for (const m of read(f).matchAll(cite))
      for (const q of m[1].matchAll(/["“]([^"”\n]+)["”]/g)) if (!found(q[1])) bad.push(f + ': LEARNING "' + q[1] + '"');
  }
  assert.deepStrictEqual(
    bad,
    [],
    'citations of LEARNING.md sections that do not exist (add the section, fix the name, or cite docs/archive/learning-notebook.md)'
  );
});

// Studies written from 2026-11-19 cite the measured PRs behind every effort figure (estimates alone prove wrong):
// tools/effort.py --check fails on a figure ("3 h", "2-4 agent hours", "days") with no
// #NNN on its line or bullet. Older studies are history and keep their words.
test('studies dated 2026-11-19 or later cite PRs for every effort figure (tools/effort.py --check)', () => {
  const {spawnSync} = require('child_process');
  const dir = path.join(ROOT, 'docs', 'reviews');
  const studies = fs.readdirSync(dir).filter(f => /^(\d{4}-\d\d-\d\d)-.*\.md$/.test(f) && f.slice(0, 10) >= '2026-11-19');
  for (const f of studies) {
    const r = spawnSync('python3', ['-B', path.join(ROOT, 'tools', 'effort.py'), '--check', path.join(dir, f)], {
      encoding: 'utf8',
      timeout: 20000
    });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  }
});

// Decision records (rule W19; docs/decisions/README.md): each is named YYYY-MM-DD-topic.md, says its date (the name's) and
// the PR that carried it out, holds a decision, links to files that exist and has a row in the index.
test('every decision record has its date, its PR, a decision, working links and a row in the index', () => {
  const dir = path.join(ROOT, 'docs', 'decisions');
  const index = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  const records = fs.readdirSync(dir).filter(f => f !== 'README.md');
  assert.ok(records.length > 0, 'docs/decisions/ holds no record');
  for (const f of records) {
    assert.match(f, /^\d{4}-\d\d-\d\d-[a-z0-9]+(-[a-z0-9]+)*\.md$/, f + ': named YYYY-MM-DD-topic.md (lowercase, hyphens)');
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.match(text, /^# \S/, f + ': no title on the first line');
    const head = /^Date: (\d{4}-\d\d-\d\d)\b.*?\bPR: #(\d+)/ms.exec(text);
    assert.ok(head, f + ': no "Date: YYYY-MM-DD. PR: #N." line');
    assert.strictEqual(head[1], f.slice(0, 10), f + ': its Date is not the date in its name');
    assert.match(text, /^(## Decisions?\b|.*\bDecisions?\b:)/m, f + ': no Decision section');
    for (const m of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(m[1])) continue;
      assert.ok(fs.existsSync(path.resolve(dir, m[1])), f + ': the link ' + m[1] + ' does not resolve');
    }
    const row = index.split('\n').find(l => l.startsWith('|') && l.includes('](' + f + ')'));
    assert.ok(row, f + ': no row in docs/decisions/README.md "Index"');
    assert.ok(row.startsWith('| ' + f.slice(0, 10) + ' |'), f + ': its index row does not start with its date');
    assert.ok(row.includes('| #' + head[2] + ' |'), f + ': its index row does not name PR #' + head[2]);
  }
  for (const m of index.matchAll(/^\|[^|]*\|[^|]*\]\(([^)]+)\)/gm))
    assert.ok(fs.existsSync(path.join(dir, m[1])), 'docs/decisions/README.md: the index names ' + m[1] + ', which does not exist');
});

// The index is written from the records (tools/decisions_index.py), sorted by date then file name, so parallel PRs add
// their rows at different places; a conflict there is resolved by --fix, never by hand.
test('the decisions index is what tools/decisions_index.py writes from the records', () => {
  const {spawnSync} = require('child_process');
  const r = spawnSync('python3', ['-B', path.join(ROOT, 'tools', 'decisions_index.py'), '--check'], {encoding: 'utf8', timeout: 10000});
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});

// Every answer reaches its doc (AGENTS.md "Every answer reaches its doc, and the answers ledger"): each ledger entry from
// 2026-11-19 names where it is applied, and no ROADMAP or reviews index status waits on an answered question.
test('every answer in the ledger names its doc, and nothing answered is cited as waiting (tools/answers_check.py)', () => {
  const {spawnSync} = require('child_process');
  const r = spawnSync('python3', ['-B', path.join(ROOT, 'tools', 'answers_check.py'), '--check'], {encoding: 'utf8', timeout: 10000});
  assert.strictEqual(
    r.status,
    0,
    r.stdout
      .split('\n')
      .filter(l => /^FAIL/.test(l))
      .join('\n') + r.stderr
  );
});

// Size and line-length budgets: every living doc is bounded in bytes and in its longest line, so a doc cannot grow back
// without a PR saying so. Each budget is the doc's size a little above its size on main when the budget was set (about 5 %
// in bytes, rounded up to the KB; about 5 % in the longest line, rounded up to ten), so today's docs pass and growth is
// caught. A budget is lowered when a doc is cut, never raised without a reason in the PR. [KB, longest line in characters];
// a null KB leaves the size to the doc's own test above (AGENTS.md).
const DOC_BUDGET = {
  'AGENTS.md': [null, 980],
  'CLAUDE.md': [2, 240],
  'CONTRIBUTING.md': [5, 130],
  'README.md': [10, 350],
  'docs/ARCHITECTURE.md': [37, 240],
  'docs/LEARNING.md': [152, 320], // lowered from 175 KB when the analyses methods moved out to docs/spec/analyses-method.md
  'docs/ROADMAP.md': [117, 1360],
  'docs/HANDOVER.md': [23, 3140],
  'docs/INTEGRATOR.md': [22, 210],
  'docs/ANSWERS.md': [200, 200], // append-only ledger: it grows by an entry per answer, never cut
  'docs/BACKUP.md': [13, 150],
  'docs/DATA.md': [10, 410],
  'docs/DESIGN.md': [45, 4030],
  'docs/FISH_PATH.md': [87, 2760],
  'docs/FORMATS.md': [20, 680],
  'docs/GLOSSARY.md': [8, 130],
  'docs/PAGES.md': [25, 1280],
  'docs/SECURITY.md': [32, 1370],
  'docs/STATUS.md': [8, 130],
  'docs/spec/admin.md': [32, 380],
  'docs/spec/admin-photos.md': [35, 140],
  'docs/spec/admin-players.md': [48, 190],
  'docs/spec/admin-tree.md': [22, 210],
  'docs/spec/achievements.md': [18, 130],
  'docs/spec/basics.md': [14, 130],
  'docs/spec/front-end.md': [21, 130],
  'docs/spec/model.md': [23, 130],
  'docs/spec/quiz.md': [20, 130],
  'docs/spec/service-worker.md': [7, 130],
  'docs/spec/cards.md': [33, 180],
  'docs/spec/sync.md': [82, 220],
  'docs/spec/content.md': [16, 130],
  'docs/spec/data.md': [34, 140],
  'docs/spec/fish-photos.md': [54, 180],
  'docs/spec/fish.md': [38, 150],
  'docs/spec/subjects.md': [26, 130],
  'docs/spec/fish-game.md': [12, 130],
  'docs/spec/fish-sheets.md': [10, 130],
  'docs/spec/seaslugs.md': [12, 130],
  'docs/spec/tools.md': [47, 130],
  'docs/spec/analyses.md': [26, 130],
  'docs/spec/analyses-method.md': [34, 130], // moved from LEARNING.md, 2026-11-19
  'docs/spec/loading.md': [16, 130],
  'docs/spec/site.md': [7, 130],
  'docs/spec/storage.md': [11, 240],
  'docs/spec/photos.md': [17, 130],
  'docs/spec/player-reports.md': [8, 130],
  'docs/spec/deploy.md': [6, 130],
  'docs/decisions/README.md': [12, 200], // the index grows by a row per record (about 150 bytes): 12 KB from #1199
  'docs/rules/README.md': [1, 150],
  'docs/rules/admin.md': [5, 230],
  'docs/rules/content.md': [9, 220],
  'docs/rules/learning.md': [22, 400],
  'docs/rules/photos.md': [11, 280],
  'docs/rules/sheet.md': [15, 160],
  'docs/rules/ship.md': [36, 480],
  'docs/rules/subjects.md': [5, 130],
  'docs/rules/ui.md': [8, 150],
  'docs/reference/genus-overview-2026-10-31.md': [16, 650],
  'docs/reference/lit-componential-difficulty.md': [36, 700],
  'docs/reference/lit-photo-memory.md': [30, 470],
  'docs/reference/lit-response-time.md': [37, 870],
  'judging/BRIEF.md': [24, 190],
  'judging/FISH.md': [47, 520],
  'judging/PROMPT.md': [3, 160],
  'judging/SEASLUG.md': [17, 500],
  'tools/README.md': [13, 280],
  'tools/sync/changes/README.md': [2, 130]
};
// A record has no entry of its own (every decision PR would add one): the same budget for each. A sheet script change
// waiting for its version (tools/sync/changes/<branch>.md, one paragraph, removed at merge) likewise.
const RECORD_BUDGET = [8, 200];
const CHANGE_BUDGET = [8, 4000];
// Not budgeted on purpose: the sheet script's version history only grows (tools/sheet_version.py appends to it).
const DOC_UNBUDGETED = new Set([path.join('tools', 'sync', 'HISTORY.md')]);
const budgetOf = f => {
  const key = f.split(path.sep).join('/');
  if (DOC_BUDGET[key]) return DOC_BUDGET[key];
  if (/^tools\/sync\/changes\/[^/]+\.md$/.test(key)) return CHANGE_BUDGET;
  return /^docs\/decisions\/[^/]+\.md$/.test(key) ? RECORD_BUDGET : null;
};

test('every living doc has a size and line-length budget, and no budget names a doc that is gone', () => {
  const living = LIVING_DOCS.filter(f => !DOC_UNBUDGETED.has(f));
  assert.deepStrictEqual(
    living.filter(f => !budgetOf(f)),
    [],
    "living docs with no budget in DOC_BUDGET (add one a little above the doc's size)"
  );
  assert.deepStrictEqual(
    Object.keys(DOC_BUDGET).filter(f => !living.map(x => x.split(path.sep).join('/')).includes(f)),
    [],
    'DOC_BUDGET entries for docs that are not living docs any more: delete them'
  );
});

test('every living doc stays within its size and line-length budget', () => {
  const over = [];
  for (const f of LIVING_DOCS) {
    const b = budgetOf(f);
    if (!b) continue; // the test above names it
    const src = read(f),
      kb = Buffer.byteLength(src) / 1024,
      longest = Math.max(...src.split('\n').map(l => [...l].length));
    if (b[0] !== null && kb > b[0]) over.push(f + ': ' + kb.toFixed(1) + ' KB, budget ' + b[0] + ' KB');
    if (longest > b[1]) over.push(f + ': a line of ' + longest + ' characters, budget ' + b[1]);
  }
  assert.deepStrictEqual(over, [], 'docs over their budget: shorten or move history to a decision record, never raise the budget by habit');
});

// README.md and privacy.html name the subjects the app teaches and say which are in beta; both must follow core.js
// SUBJECTS (its names and its beta flag), so a subject opened, closed or taken out of beta shows up here.
const SUBJECT_DOCS = ['README.md', 'privacy.html'];
// A doc known to be behind SUBJECTS, with why: its check must fail until it is fixed, and an entry that now passes fails
// so it is deleted.
const SUBJECT_DOCS_BEHIND = {};
const subjectProblems = f => {
  const text = read(f).replace(/\s+/g, ' ').toLowerCase();
  const bad = [];
  for (const s of require('../core.js').SUBJECTS) {
    const name = s.name.toLowerCase();
    if (!text.includes(name)) {
      bad.push('does not name ' + s.name);
      continue;
    }
    const marked = new RegExp(name + '\\W{0,3}(?:\\(?beta\\b|in beta\\b)|\\bin beta\\W{0,6}' + name).test(text);
    if (!!s.beta !== marked)
      bad.push(s.name + (s.beta ? ' is in beta in core.js SUBJECTS, not here' : ' is out of beta in core.js SUBJECTS, in beta here'));
  }
  return bad;
};

test("README.md's and privacy.html's subject lists match core.js SUBJECTS", () => {
  for (const f of SUBJECT_DOCS) {
    const bad = subjectProblems(f);
    if (SUBJECT_DOCS_BEHIND[f]) assert.ok(bad.length > 0, f + ' now matches SUBJECTS: delete its SUBJECT_DOCS_BEHIND entry');
    else assert.deepStrictEqual(bad, [], f + ': the subjects differ from core.js SUBJECTS (names and beta flags)');
  }
});

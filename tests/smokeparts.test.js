require('./slot.js').testGuard();
// Every smoke runs on CI (.github/workflows/smokes.yml, the smoke matrix): a smoke split into groups (tests/slot.js parts,
// SMOKE_PART) runs each of its groups at each width its jobs run (SMOKE_W; none: every width): a job without a group
// runs them all, otherwise a job per group. No job names a group the smoke does not have. tests/slot.js parts
// already fails when a part is in no group; this is the other half: a group in no job would run on no runner, and the
// PR would go green without it. The same holds for the unit tests' shards in checks.yml (below).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'smokes.yml'), 'utf8');

// The matrix entries: [{name, smoke, part}], from the include list of the smoke job.
function jobs(src) {
  const inc = (src.slice(src.indexOf('\n  smoke:\n')).split(/\n\s+include:\n/)[1] || '').split(/\n {4}steps:/)[0];
  assert.ok(inc, 'smokes.yml: no smoke matrix include list');
  return ('\n' + inc)
    .split(/\n\s+- name: /)
    .slice(1)
    .map(e => {
      const f = k => ((new RegExp(`\\n\\s+${k}: *'?([^'\\n]+)'?`).exec('\n' + e) || [])[1] || '').trim();
      return {name: e.split('\n')[0].trim(), smoke: f('smoke'), part: f('part'), w: f('w')};
    });
}
// The groups a smoke passes to slot.parts, by name ([] when it has none).
function groups(src) {
  const i = src.indexOf('slot.parts(PARTS, {');
  if (i < 0) return [];
  const body = src.slice(i, src.indexOf('})', i));
  return [...body.matchAll(/(\w+): \[/g)].map(m => m[1]);
}

const J = jobs(yml),
  SMOKES = fs
    .readdirSync(__dirname)
    .filter(f => f.endsWith('.smoke.js'))
    .map(f => f.replace('.smoke.js', ''));

test('smokes.yml: every smoke has a job, every group of a split smoke a job at each width', () => {
  assert.ok(J.length >= SMOKES.length, JSON.stringify(J));
  for (const s of SMOKES) {
    const G = groups(fs.readFileSync(path.join(__dirname, s + '.smoke.js'), 'utf8')),
      mine = J.filter(j => j.smoke === s);
    assert.ok(mine.length, `${s}.smoke.js runs in no job of smokes.yml`);
    for (const j of mine)
      assert.ok(!j.part || G.includes(j.part), `${s}.smoke.js: job "${j.name}" names no group of the smoke (${G.join(', ') || 'none'})`);
    for (const w of new Set(mine.map(j => j.w)))
      for (const g of G)
        assert.ok(
          mine.some(j => j.w === w && (!j.part || j.part === g)),
          `${s}.smoke.js: group ${g} is in no job of smokes.yml${w ? ` at SMOKE_W=${w}` : ''}`
        );
  }
  for (const j of J) assert.ok(SMOKES.includes(j.smoke), `job "${j.name}": no tests/${j.smoke}.smoke.js`);
});

test('the guard reads what it guards: groups and jobs as written', () => {
  assert.deepStrictEqual(groups("const run = slot.parts(PARTS, {main: ['main'], fresh: ['fresh']});"), ['main', 'fresh']);
  const y = `jobs:\n  smoke:\n    strategy:\n      matrix:\n        include:\n          - name: a b\n            smoke: a\n            part: b\n          - name: c\n            smoke: c\n            w: '390'\n    steps:\n`;
  assert.deepStrictEqual(jobs(y), [
    {name: 'a b', smoke: 'a', part: 'b', w: ''},
    {name: 'c', smoke: 'c', part: '', w: '390'}
  ]);
});

test('the fish jobs dispatch every scenario exactly once, as does the full local run', async t => {
  const {fishParts, runFishScenarios} = require('./fish.smoke.js');
  const env = process.env;
  t.after(() => {
    process.env = env;
  });
  process.env = {...env};
  delete process.env.SMOKE_ONLY;
  delete process.env.PAGES_ONLY;

  const calls = async part => {
    if (part) process.env.SMOKE_PART = part;
    else delete process.env.SMOKE_PART;
    const seen = [];
    await runFishScenarios(fishParts(), async (name, scenario) => {
      seen.push([name, scenario.name]);
    });
    return seen;
  };
  const expected = [
    ['access', 'uiAndAccess'],
    ['fresh', 'freshPlayers'],
    ['main', 'mainScenarios'],
    ['memory', 'memoryGame'],
    ['quiz', 'quizAndProgress']
  ];
  const fishJobs = J.filter(j => j.smoke === 'fish');
  assert.deepStrictEqual(fishJobs.map(j => j.part).sort(), ['fresh', 'main']);
  const ci = [];
  for (const j of fishJobs) {
    const scenarios = await calls(j.part);
    assert.ok(scenarios.length, `fish ${j.part} runs no scenarios`);
    ci.push(...scenarios);
  }
  assert.deepStrictEqual(ci.sort(), expected);
  assert.deepStrictEqual((await calls()).sort(), expected);
});

// The smokes are their own workflow, which a docs-only PR skips, so none may slip back into
// checks.yml (it would run them on docs PRs again), and the skip lists docs only (never tools/, tests/ or data).
// Where the browser matrix runs (rule W12; Pierre, 2026-11-26, REE-121 (b) and (d)): never on a PR head, on every code,
// mixed or unknown train, on no docs-only train; answer cost on every run of the workflow, a docs-only train's included.
const DOCS = ['docs/**', '*.md', '.github/pull_request_template.md', 'LICENSE'];
// A job's block in a workflow file: from "\n  <id>:\n" to the next job.
const jobBlock = (src, id) => {
  const at = src.indexOf(`\n  ${id}:\n`);
  if (at < 0) return '';
  const rest = src.slice(at + 1),
    next = rest.slice(1).search(/\n {2}[\w-]+:\n/);
  return next < 0 ? rest : rest.slice(0, next + 2); // with its last newline
};
test('the smokes live in smokes.yml only, skipped for docs-only PRs, run on a merge train', () => {
  const checks = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'checks.yml'), 'utf8');
  assert.ok(!/\n  smoke:\n/.test(checks) && !/\.smoke\.js/.test(checks), 'checks.yml runs a smoke');
  const ignore = /\n  pull_request:\n    paths-ignore:\n((?: {6}- .+\n)+)/.exec(yml);
  assert.ok(ignore, 'smokes.yml: pull_request paths-ignore');
  assert.deepStrictEqual(
    ignore[1]
      .trim()
      .split('\n')
      .map(l => l.replace(/^\s*- '?|'?$/g, '')),
    DOCS
  );
  assert.match(yml, /\n  push:\n    branches: \['train\/\*'\]\n/, 'smokes.yml: the smokes on a train push');
  assert.match(yml, /\n  workflow_dispatch:\n/, 'smokes.yml: the manual full validation');
  assert.match(checks, /\n  push:\n    branches: \['train\/\*'\]\n/, 'checks.yml: the checks on a train push');
});
test('smokes.yml: the browser matrix off PR heads by one line, on trains unless docs-only; answer cost on every run', () => {
  const scope = jobBlock(yml, 'scope'),
    smoke = jobBlock(yml, 'smoke'),
    cost = jobBlock(yml, 'answercost');
  assert.match(scope, /\n {4}name: browser scope\n/, 'the scope job is "browser scope" (tools/train.py waits for it)');
  // The rollback of (d) is deleting this one line (this test passes without it): nothing else keeps the matrix off a PR
  // head, and the scope job has no other condition.
  assert.ok((yml.match(/pull_request'/g) || []).length <= 1, "smokes.yml: one condition on pull_request at most, the scope job's");
  assert.deepStrictEqual(
    scope.match(/\n {4}if: .*/g) || [],
    /pull_request'/.test(yml) ? ["\n    if: github.event_name != 'pull_request'"] : []
  );
  assert.match(scope, /\n {6}browser: \$\{\{ steps\.scope\.outputs\.browser \}\}\n/);
  assert.match(scope, /\n {8}id: scope\n {8}run: python3 tools\/smoke_scope\.py\n/);
  assert.match(scope, /\n {10}sparse-checkout: tools\/smoke_scope\.py\n/);
  // An empty answer runs the matrix: only an explicit false skips it.
  assert.match(smoke, /\n {4}name: smoke \(\$\{\{ matrix\.name \}\}\)\n {4}needs: scope\n/);
  assert.match(smoke, /\n {4}if: needs\.scope\.outputs\.browser != 'false'\n/);
  assert.match(cost, /\n {4}name: answer cost\n/);
  assert.doesNotMatch(cost, /\n {4}(?:needs|if):/, 'answer cost depends on nothing: it runs on every run of the workflow');
  const checks = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'checks.yml'), 'utf8');
  assert.doesNotMatch(jobBlock(checks, 'checks'), /\n {4}name:/, 'the checks job keeps the name "checks" (tools/train.py)');
});
// tools/smoke_scope.py (the scope job and tools/train.py) reads the same list with GitHub's pattern rules: `*` stops at
// `/`, `**` does not (docs.github.com, "Workflow syntax", filter pattern cheat sheet: '*.js' "all .js files at the root").
test('tools/smoke_scope.py: the docs list is paths-ignore, read as GitHub reads it', () => {
  const py = (code, input) =>
    JSON.parse(execFileSync('python3', ['-B', '-c', code], {cwd: path.join(ROOT, 'tools'), input, encoding: 'utf8'}));
  assert.deepStrictEqual(py('import json, smoke_scope; print(json.dumps(smoke_scope.DOCS))'), DOCS);
  const cases = {
    'docs/rules/ship.md': true,
    'docs/a/b/c.png': true,
    'README.md': true,
    'AGENTS.md': true,
    '.github/pull_request_template.md': true,
    LICENSE: true,
    'tools/README.md': false,
    'tools/queue/README.md': false,
    'tests/x.md': false,
    'img/LICENSE': false,
    'LICENSE.txt': false,
    'a.md/x.js': false,
    'docsx/a.md': false,
    '.github/workflows/smokes.yml': false,
    'data.json': false,
    'tests/docs.test.js': false
  };
  const got = py(
    'import json, sys, smoke_scope; print(json.dumps({p: smoke_scope.is_doc(p) for p in json.load(sys.stdin)}))',
    JSON.stringify(Object.keys(cases))
  );
  assert.deepStrictEqual(got, cases);
  assert.deepStrictEqual(
    py(
      'import json, smoke_scope as s; print(json.dumps([s.classify([]), s.classify(["docs/a.md", "README.md"]), s.classify(["docs/a.md", "app.js"]), s.classify(["app.js"])]))'
    ),
    [
      ['unknown', []],
      ['docs', []],
      ['mixed', ['app.js']],
      ['code', ['app.js']]
    ]
  );
});

// The unit tests run in shards (checks.yml, the unit job): its matrix lists the shards k, its command runs k/n over every
// tests/*.test.js. The shards cover every file only when the list is 1 to n: a shard left out would run its files on no
// runner, and the PR would go green without them. {ks, n, name, shard, runs}: the list, n, the job's name, whether SHARD
// is the matrix's shard, and the count of node --test runs in the whole file.
function shards(src) {
  const at = src.indexOf('\n  unit:\n'),
    u = at < 0 ? '' : src.slice(at),
    list = /\n\s+shard: \[([\d, ]+)\]\n/.exec(u),
    cmd = /\n\s+node --test --test-shard="\$SHARD\/(\d+)" tests\/\*\.test\.js\n/.exec(u + '\n');
  return {
    ks: list ? list[1].split(',').map(Number) : [],
    n: cmd ? +cmd[1] : 0,
    name: (/\n {4}name: (.+)\n/.exec(u) || [])[1] || '',
    shard: /\n\s+SHARD: \$\{\{ matrix\.shard \}\}\n/.test(u),
    runs: (src.match(/^\s*(?:- )?(?:run: *)?node --test\b/gm) || []).length // a command, not a comment
  };
}
test('checks.yml: the unit-test shards cover every test file, and nothing else runs them', () => {
  const s = shards(fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'checks.yml'), 'utf8'));
  assert.ok(s.n >= 1, 'checks.yml: no unit job running node --test --test-shard="$SHARD/n" tests/*.test.js');
  assert.deepStrictEqual(
    s.ks,
    Array.from({length: s.n}, (_, i) => i + 1),
    `checks.yml: the shards ${s.ks} are not 1 to ${s.n}`
  );
  assert.ok(s.shard, 'checks.yml: SHARD is not the matrix shard');
  assert.strictEqual(s.name, `unit tests (\${{ matrix.shard }}/${s.n})`, 'checks.yml: the unit job names its shard out of n');
  assert.strictEqual(s.runs, 1, 'checks.yml: one node --test run, the shards');
});
test('the shard guard reads what it guards', () => {
  const y = n =>
    `jobs:\n  checks:\n    steps:\n  unit:\n    name: unit tests (\${{ matrix.shard }}/${n})\n    strategy:\n      matrix:\n        shard: [1, 2]\n    steps:\n      - name: Unit tests\n        env:\n          SHARD: \${{ matrix.shard }}\n        run: |\n          node --test --test-shard="$SHARD/${n}" tests/*.test.js\n`;
  assert.deepStrictEqual(shards(y(2)), {ks: [1, 2], n: 2, name: 'unit tests (${{ matrix.shard }}/2)', shard: true, runs: 1});
  assert.deepStrictEqual(shards(y(3)).n, 3);
  assert.deepStrictEqual(shards('jobs:\n  checks:\n    steps:\n      - run: node --test tests/*.test.js\n'), {
    ks: [],
    n: 0,
    name: '',
    shard: false,
    runs: 1
  });
});

require('./slot.js').testGuard();
// Every smoke runs on CI (.github/workflows/smokes.yml, the smoke matrix): a smoke split into groups (tests/slot.js parts,
// SMOKE_PART) runs each of its groups at each width its jobs run (SMOKE_W; none: every width): a job without a group
// runs them all, otherwise a job per group. No job names a group the smoke does not have. tests/slot.js parts
// already fails when a part is in no group; this is the other half: a group in no job would run on no runner, and the
// PR would go green without it. The same holds for the unit tests' shards in checks.yml (below).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

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

// The smokes are their own workflow, which a docs-only PR skips, so none may slip back into
// checks.yml (it would run them on docs PRs again), and the skip lists docs only (never tools/, tests/ or data).
test('the smokes live in smokes.yml only, skipped for docs-only PRs, always run on a merge train', () => {
  const checks = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'checks.yml'), 'utf8');
  assert.ok(!/\n  smoke:\n/.test(checks) && !/\.smoke\.js/.test(checks), 'checks.yml runs a smoke');
  const ignore = /\n  pull_request:\n    paths-ignore:\n((?: {6}- .+\n)+)/.exec(yml);
  assert.ok(ignore, 'smokes.yml: pull_request paths-ignore');
  assert.deepStrictEqual(
    ignore[1]
      .trim()
      .split('\n')
      .map(l => l.replace(/^\s*- '?|'?$/g, '')),
    ['docs/**', '*.md', '.github/pull_request_template.md', 'LICENSE']
  );
  assert.match(yml, /\n  push:\n    branches: \['train\/\*'\]\n/, 'smokes.yml: every smoke on a train push');
  assert.match(checks, /\n  push:\n    branches: \['train\/\*'\]\n/, 'checks.yml: the checks on a train push');
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

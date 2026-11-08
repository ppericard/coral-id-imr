// Every smoke runs on CI (.github/workflows/checks.yml, the smoke matrix): a smoke split into groups (tests/slot.js parts,
// SMOKE_PART) has a job for each of its groups, and no job names a group the smoke does not have. tests/slot.js parts
// already fails when a part is in no group; this is the other half: a group in no job would run on no runner, and the
// PR would go green without it.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const ROOT = path.join(__dirname, '..'),
  yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'checks.yml'), 'utf8');

// The matrix entries: [{name, smoke, part}], from the include list of the smoke job.
function jobs(src) {
  const inc = (src.slice(src.indexOf('\n  smoke:\n')).split(/\n\s+include:\n/)[1] || '').split(/\n {4}steps:/)[0];
  assert.ok(inc, 'checks.yml: no smoke matrix include list');
  return ('\n' + inc)
    .split(/\n\s+- name: /)
    .slice(1)
    .map(e => {
      const f = k => ((new RegExp(`\\n\\s+${k}: *'?([^'\\n]+)'?`).exec('\n' + e) || [])[1] || '').trim();
      return {name: e.split('\n')[0].trim(), smoke: f('smoke'), part: f('part')};
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

test('checks.yml: every smoke has a job, every group of a split smoke its own job', () => {
  assert.ok(J.length >= SMOKES.length, JSON.stringify(J));
  for (const s of SMOKES) {
    const G = groups(fs.readFileSync(path.join(__dirname, s + '.smoke.js'), 'utf8')),
      mine = J.filter(j => j.smoke === s);
    assert.ok(mine.length, `${s}.smoke.js runs in no job of checks.yml`);
    if (!G.length) {
      assert.ok(
        mine.every(j => !j.part),
        `${s}.smoke.js has no groups, a job names one: ${JSON.stringify(mine)}`
      );
      continue;
    }
    for (const g of G)
      assert.ok(
        mine.some(j => j.part === g),
        `${s}.smoke.js: group ${g} is in no job of checks.yml`
      );
    for (const j of mine) assert.ok(G.includes(j.part), `${s}.smoke.js: job "${j.name}" names no group of the smoke (${G.join(', ')})`);
  }
  for (const j of J) assert.ok(SMOKES.includes(j.smoke), `job "${j.name}": no tests/${j.smoke}.smoke.js`);
});

test('the guard reads what it guards: groups and jobs as written', () => {
  assert.deepStrictEqual(groups("const run = slot.parts(PARTS, {main: ['main'], fresh: ['fresh']});"), ['main', 'fresh']);
  const y = `jobs:\n  smoke:\n    strategy:\n      matrix:\n        include:\n          - name: a b\n            smoke: a\n            part: b\n          - name: c\n            smoke: c\n            w: '390'\n    steps:\n`;
  assert.deepStrictEqual(jobs(y), [
    {name: 'a b', smoke: 'a', part: 'b'},
    {name: 'c', smoke: 'c', part: ''}
  ]);
});

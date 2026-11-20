// Every source disagreement the fish colour phases list records reaches the admin's Points (rule C5): a species with a
// `conflict` verdict, or a note that says it found a conflict, has a point in data/points.json whose id names the species,
// so Pierre can see it in the admin's Points list (admin.js renderPoints) and nothing stays in a file nobody reads.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const phases = JSON.parse(fs.readFileSync(path.join(root, 'tools/fish_phases.json'), 'utf8'));
const points = JSON.parse(fs.readFileSync(path.join(root, 'data/points.json'), 'utf8'));
const ids = [];
(function walk(x) {
  if (Array.isArray(x)) return x.forEach(walk);
  if (x && typeof x === 'object') {
    if (typeof x.id === 'string') ids.push(x.id);
    Object.values(x).forEach(walk);
  }
})(points);

const slug = name => name.toLowerCase().replace(/[^a-z]+/g, '-');

test('every disagreement in the fish colour phases list is a point for Pierre', () => {
  const missing = [];
  for (const [name, e] of Object.entries(phases)) {
    if (name.startsWith('_')) continue;
    const found = ['juv', 'sub', 'ip_tp', 'sex'].filter(k => e[k] === 'conflict' || /\bconflict\b/i.test((e.note || {})[k] || ''));
    if (found.length && !ids.some(id => id.includes(slug(name)))) missing.push(`${name} (${found.join(', ')})`);
  }
  assert.deepStrictEqual(missing, [], `no entry in data/points.json names: ${missing.join('; ')}`);
});

// The presence rule (Pierre, 2026-11-04; AGENTS.md rule 6g: "the same scientific rigour for everyone, me included"),
// defined once in tools/presence.py, applied by tools/build_fish.py (fish.json present), tools/fetch_local.py and
// tools/coral_presence.py (presence.json), read by the admin through presence.js (the "out of rule" photo flag).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const {outOfRule} = require('../presence.js');
const py = code =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\nfrom presence import *\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8'
    })
  );

test('rule: the three branches confirm, and nothing else does', () => {
  const R = py(`print(json.dumps([
    ph_confirmed(3, 3, False, []),     # (1) 3 distinct Research Grade observers
    ph_confirmed(5, 2, False, []),     # 2 observers only, no checklist, not near Dauin: not confirmed
    ph_confirmed(1, None, True, []),   # (2) 1 Research Grade observation + the checklist
    ph_confirmed(0, None, True, []),   # the checklist alone never brings in a species nobody observed
    ph_confirmed(0, None, False, ['imr']),  # (3) confirmed near Dauin (here the IMR list): so in the Philippines
    ph_confirmed(0, None, False, []),
    near_dauin(2), near_dauin(1), near_dauin(0, True), near_dauin(1, False)]))`);
  assert.deepStrictEqual(R, [['observers'], [], ['checklist'], [], ['near'], [], ['observers'], [], ['imr'], []]);
});

test('rule: species_presence counts Pierre as one observer, Research Grade only, and batches by genus', () => {
  // A stubbed iNaturalist: species 1 has one Research Grade observation and the checklist; 2 has 4 by 3 observers; 3 has
  // 4 by 2 observers (one of them Pierre); 4 has 2 near Dauin by 2 observers; 5 has Needs ID only (absent from the RG
  // counts, so absent from the result: not confirmed, whoever observed it).
  const R = py(`
calls = []
def get(u):
    calls.append(u)
    if 'species_counts' in u and 'place_id=6873' in u:
        return {"results": [{"taxon": {"id": i, "name": n, "rank": "species"}, "count": c} for i, n, c in
            [(1, "Favites pentagona", 1), (2, "Xus three", 4), (3, "Xus two", 4), (4, "Xus near", 2)]]}
    if 'species_counts' in u:
        return {"results": [{"taxon": {"id": 4, "name": "Xus near", "rank": "species"}, "count": 2}, {"taxon": {"id": 3}, "count": 1}]}
    if 'observers' in u:
        t = int(u.split('taxon_id=')[1].split('&')[0])
        return {"total_results": {2: 3, 3: 2, 4: 2}[t]}
    raise AssertionError(u)
r = species_presence(get, 999, "coral")
print(json.dumps({"by": {k: v["by"] for k, v in r.items()}, "calls": len(calls), "ok": sorted(confirmed_species(get, 999))}))`);
  assert.deepStrictEqual(R.by, {'Favites pentagona': ['checklist'], 'Xus three': ['observers'], 'Xus two': [], 'Xus near': ['near']});
  assert.ok(R.calls <= 6, `${R.calls} requests for one genus`);
  assert.deepStrictEqual(R.ok, [1, 2, 4]);
});

test('fish.json: every species confirmed by the rule from its own fields; near Dauin implies the Philippines', () => {
  const F = read('fish.json');
  F.species.forEach(s => {
    const p = s.present;
    if (!p || p.rg === undefined) return;
    const why = [];
    if ((p.phU || 0) >= 3) why.push('observers');
    if (p.rg >= 1 && p.chk) why.push('checklist');
    if (p.near) why.push('near');
    assert.deepStrictEqual(p.phBy, why, `${s.name}: phBy`);
    assert.strictEqual(p.ph, why.length > 0, `${s.name}: ph`);
    if (p.near) assert.strictEqual(p.ph, true, `${s.name}: confirmed near Dauin but not in the Philippines`);
    assert.ok(!(p.nearBy || []).includes('own'), `${s.name}: Pierre's own observation confirms nothing alone`);
    // Pierre alone (his observations, no Research Grade anywhere in the country, not on the IMR list) confirms nothing.
    if (p.own && p.rg === 0 && !p.near) assert.strictEqual(p.ph, false, `${s.name}: confirmed by Pierre alone`);
  });
  assert.ok(
    F.species.every(s => !s.present || s.present.rg !== undefined || !s.inat),
    'fish.json built with the rule'
  );
});

test('outOfRule: a photo taken abroad of a species the rule does not confirm', () => {
  const sp = {'Astrea curta': {ok: false, by: [], rg: 0, chk: true}, 'Favites pentagona': {ok: true, by: ['checklist'], rg: 6, chk: true}};
  assert.strictEqual(outOfRule({loc: 'world', t: 'Astrea curta'}, sp), true);
  assert.strictEqual(outOfRule({loc: 'world', t: 'Astrea curta curta'}, sp), true);
  assert.strictEqual(outOfRule({loc: 'ph', t: 'Astrea curta'}, sp), false, 'taken in the Philippines');
  assert.strictEqual(outOfRule({loc: 'dauin', t: 'Astrea curta'}, sp), false);
  assert.strictEqual(outOfRule({loc: 'world', t: 'Favites pentagona'}, sp), false, 'confirmed');
  assert.strictEqual(outOfRule({loc: 'world', t: 'Astrea'}, sp), false, 'genus only');
  assert.strictEqual(outOfRule({loc: 'world', t: 'Xus ignotus'}, sp), false, 'unknown to presence.json');
  assert.strictEqual(outOfRule({loc: 'world', t: 'Astrea curta', imr: 1}, sp), false, 'IMR lecture photo');
  assert.strictEqual(outOfRule({loc: 'world', t: 'Astrea curta'}, null), false, 'presence.json not loaded');
});

test('presence.json: the rule per photo species, and the photos it flags in data.json', () => {
  const P = read('presence.json'),
    D = read('data.json');
  Object.entries(P.sp).forEach(([n, v]) => {
    assert.strictEqual(v.ok, v.by.length > 0, n);
    if (v.by.includes('checklist')) assert.ok(v.rg >= 1 && v.chk, `${n}: checklist without an observation`);
    if (v.by.includes('observers')) assert.ok(v.rg >= 3, `${n}: 3 observers need 3 observations`);
  });
  const gen = {...D.gen, ...((D.x || {}).gen || {})};
  const photos = Object.values(gen).flatMap(g => [...Object.values(g.views || {}), ...Object.values(g.more || {})].flat());
  const named = photos.filter(p => /^\S+ [a-z]/.test(p.t || ''));
  named.forEach(p => assert.ok(P.sp[p.t.split(' ').slice(0, 2).join(' ')], `${p.f}: ${p.t} missing from presence.json`));
  const flagged = photos.filter(p => outOfRule(p, P.sp));
  assert.ok(flagged.length > 0, 'no photo out of the rule');
  flagged.forEach(p => assert.strictEqual(p.loc, 'world', p.f));
  // The five Anacropora photos from Sabah (tools/apply_loc_fix.py) are labelled abroad.
  ['149984703', '149988595', '149999806', '149999809', '150013033'].forEach(o =>
    photos.filter(p => (p.o || '').endsWith('/' + o)).forEach(p => assert.strictEqual(p.loc, 'world', p.f))
  );
});

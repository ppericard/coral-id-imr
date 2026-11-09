// The curated common names of the fish species (Pierre, 2026-11-04: 1 to 3 per species, never more; published as
// selected, Pierre, 2026-11-08, Q313; docs/FISH_PATH.md "Common names"): tools/fish_common.py selects them into
// tools/fish_common.json (every name with its sources), tools/build_fish.py writes them into fish.json (species cn), and
// the species level reads them through app.js cnList, cnShow (multiple choice: one listed name at a time, rotating) and
// cnTypeNames (typed: only the listed names and their spellings). The blocks of app.js run in a vm on core.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  {matcher} = require('./typenear.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  F = read('fish.json'),
  P = read('tools/fish_common.json').species,
  SRCN = read('tools/fish_common_src.json').species,
  GAME = F.species.filter(s => s.circle),
  norm = C.typeNormAll;

const ctx = {typeNormAll: C.typeNormAll};
vm.createContext(ctx);
vm.runInContext(
  block(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), '// The curated common names of a fish species', '\n  return out;\n}\n', {
    file: 'app.js',
    through: 1
  }) + '\nthis.M = {cnList, cnShow, cnTypeNames};',
  ctx
);
const {cnList, cnShow, cnTypeNames} = ctx.M;
// match: typeMatchIn over every typed name, read on the names near the text only (tests/typenear.js: the same answer,
// without an edit distance to each of the 1,300 names; the sweep below took 80 s). The last test checks the two agree.
const TN = cnTypeNames(GAME),
  full = text => C.typeMatchIn(TN, text, norm),
  match = matcher(TN, norm);

test('every game species has 1 to 3 listed names, each with a source, the PDF name first, none listed twice; none only when no reference names it (Q247)', () => {
  const n = {0: 0, 1: 0, 2: 0, 3: 0};
  GAME.forEach(s => {
    const p = P[s.id],
      L = s.cn || [];
    assert.ok(p, `${s.id} ${s.name}: not in tools/fish_common.json`);
    n[L.length]++;
    assert.ok(L.length <= 3, `${s.name}: ${L.length} names`);
    if (!L.length) {
      const r = SRCN[s.id] || {};
      assert.ok(
        !s.common && [r.fb, r.inat].every(x => !x || (!x.main && !(x.names || []).length)),
        `${s.name}: no listed name although a reference names it`
      );
    }
    // fish.json holds the selection as it is: the name shown, then its other spellings.
    assert.deepStrictEqual(
      L,
      p.names.map(x => [x.name, ...(x.alt || [])]),
      `${s.name}: fish.json cn is not tools/fish_common.json`
    );
    p.names.forEach(x => assert.ok(x.from.length, `${s.name}: ${x.name} has no source`));
    assert.strictEqual(p.sp, s.name);
    // The PDF name first, as written; a PDF name flagged as a likely slip (check) shows FishBase's spelling, the PDF form
    // still accepted when typed (Pierre, 2026-11-05).
    if (s.common && !(s.check && (p.names[0].alt || []).includes(s.common)))
      assert.strictEqual(p.names[0].name, s.common, `${s.name}: the PDF name first, as written`);
    else if (s.common) assert.ok(p.names[0].alt.includes(s.common), `${s.name}: the PDF form accepted when typed`);
    // No two spellings of one name listed apart.
    const keys = p.names.map(x => x.name.toLowerCase().replace(/[\s\-‐‑'’`]/g, ''));
    assert.strictEqual(new Set(keys).size, keys.length, `${s.name}: a name listed twice`);
  });
  F.species.filter(s => !s.circle).forEach(s => assert.ok(!s.cn, `${s.name}: out of the game, no list`));
  assert.ok(n[1] && n[2] && n[3] && n[0] <= 5, JSON.stringify(n));
  // The file is what the selection gives (tools/fish_common.py --check).
  const r = require('child_process').spawnSync('python3', [path.join(ROOT, 'tools', 'fish_common.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

test('the order: the species’ own (PDF) name first, then the most shared (in the most references)', () => {
  const refs = x => (x.from.some(f => f === 'fbMain' || /^fb\d/.test(f)) ? 1 : 0) + (x.from.some(f => /^inat/.test(f)) ? 1 : 0);
  GAME.forEach(s => {
    const L = P[s.id].names,
      rest = L.filter((x, i) => !(i === 0 && x.from.some(f => ['pdf', 'slides', 'dauin', 'wink'].includes(f))));
    rest.forEach((x, i) => i && assert.ok(refs(rest[i - 1]) >= refs(x), `${s.name}: ${x.name} before a less shared name`));
  });
  assert.deepStrictEqual(cnList(F.species.find(s => s.id === 's086')), ['Reticulated dascyllus', 'Reticulated damselfish']);
});

test('multiple choice: one listed name at a time, rotating, the least asked first, the list’s order on a tie', () => {
  const s = F.species.find(x => x.id === 's086'),
    seen = [0, 0],
    shown = [];
  for (let k = 0; k < 6; k++) {
    const n = cnShow(s, i => seen[i]);
    shown.push(n);
    seen[cnList(s).indexOf(n)]++;
  }
  assert.deepStrictEqual(shown, [
    'Reticulated dascyllus',
    'Reticulated damselfish',
    'Reticulated dascyllus',
    'Reticulated damselfish',
    'Reticulated dascyllus',
    'Reticulated damselfish'
  ]);
  assert.strictEqual(
    cnShow(s, i => [3, 1][i]),
    'Reticulated damselfish',
    'the least asked'
  );
  assert.strictEqual(cnShow(s), 'Reticulated dascyllus', 'nothing asked yet: the first, the most shared');
  assert.strictEqual(
    cnShow({cn: [['Lemon damsel', 'Lemon damselfish']]}, () => 9),
    'Lemon damsel',
    'one name: always it'
  );
  assert.strictEqual(cnShow({}), '', 'no listed name (Q247)');
  // Over enough questions every listed name of every species is shown.
  GAME.filter(x => x.cn).forEach(x => {
    const c = x.cn.map(() => 0);
    for (let k = 0; k < x.cn.length; k++) c[cnList(x).indexOf(cnShow(x, i => c[i]))]++;
    assert.ok(
      c.every(v => v === 1),
      x.name
    );
  });
});

test('typed: the listed names and their spellings are accepted, as their species; no other reference name is', () => {
  const owners = new Map();
  GAME.forEach(s => (s.cn || []).flat().forEach(x => owners.set(norm(x), [...(owners.get(norm(x)) || []), s.id])));
  GAME.forEach(s =>
    (s.cn || []).flat().forEach(x => {
      const m = match(x),
        own = owners.get(norm(x));
      // A name two species list (flagged shared in tools/fish_common.json: "Twospot wrasse") is right for both (Pierre,
      // 2026-11-09, Q319: typeMatchIn shared).
      if (new Set(own).size > 1)
        return assert.ok(m && m.shared && m.shared.includes(s.id) && C.typeVerdict(m, s.id) === 'exact', `${x}: both species`);
      assert.ok(m && m.g === s.id && m.exact, `${s.name}: ${x} not accepted`);
      assert.strictEqual(C.typeVerdict(m, s.id), 'exact');
    })
  );
  // Every other English name FishBase or iNaturalist gives a species is no exact answer for it: only the listed ones.
  let other = 0;
  GAME.forEach(s => {
    const r = SRCN[s.id] || {},
      mine = new Set((s.cn || []).flat().map(norm)),
      all = [...((r.inat || {}).names || []), ...((r.fb || {}).names || []).map(x => x[0]), (r.fb || {}).main, (r.inat || {}).main];
    all
      .filter(x => x && !mine.has(norm(x)))
      .forEach(x => {
        other++;
        const m = match(x);
        assert.ok(!(m && m.g === s.id && m.exact), `${s.name}: ${x} is not listed, yet accepted`);
      });
  });
  assert.ok(other > 500, `${other} unlisted reference names checked`);
  // Examples: Lemon damsel's other names (Yellow damsel), Reticulated dascyllus' (Headband humbug) are no answer.
  assert.strictEqual(C.typeVerdict(match('Yellow damsel'), 's119'), 'none');
  assert.strictEqual(C.typeVerdict(match('Headband humbug'), 's086'), 'none');
  assert.strictEqual(C.typeVerdict(match('Lemon damselfish'), 's119'), 'exact', 'a recorded spelling of a listed name');
  assert.strictEqual(C.typeVerdict(match('Reticulated damselfsh'), 's086'), 'close', 'a slip: the spelling step, as everywhere');
  assert.strictEqual(C.typeVerdict(match('Lemon'), 's119'), 'none', 'no short form');
});

test('match reads as typeMatchIn on every name: exact, close, shared, other and no answers alike (tests/typenear.js)', () => {
  // Every 100th listed name and every 250th reference name, with four slips each (a letter dropped, two neighbours swapped, one changed,
  // one added), the names the sweep above names, and texts too short or near nothing.
  const listed = GAME.flatMap(s => (s.cn || []).flat()),
    refs = GAME.flatMap(s => ((SRCN[s.id] || {}).inat || {}).names || []),
    base = [...listed.filter((x, i) => i % 100 === 0), ...refs.filter((x, i) => i % 250 === 0)],
    slips = base.flatMap(x => [
      x.slice(0, 3) + x.slice(4),
      x.slice(0, 2) + x[3] + x[2] + x.slice(4),
      x.slice(0, -2) + (x.at(-2) === 'q' ? 'z' : 'q') + x.at(-1),
      x + 'e'
    ]),
    texts = [
      ...base,
      ...slips,
      'Twospot wrasse',
      'Yellow damsel',
      'Headband humbug',
      'Lemon damselfish',
      'Reticulated damselfsh',
      'Lemon',
      'ab',
      'qqqqqq'
    ];
  const kinds = new Set();
  texts.forEach(t => {
    const m = full(t);
    assert.deepStrictEqual(match(t), m, t);
    kinds.add(!m ? 'none' : m.near ? 'near' : m.shared ? 'shared' : m.exact ? 'exact' : 'close');
  });
  assert.ok(
    ['close', 'exact', 'none', 'shared'].every(k => kinds.has(k)),
    'every kind of answer compared: ' + [...kinds]
  );
  assert.ok(texts.length > 100, String(texts.length));
});

// The species level's reading (Pierre, 2026-11-09, Q319): a name two species list is right for each of them; a kind word
// of the name index (fish.json vn: razorfish, toby) is known, never a slip of a species' name.
test('typed at species level: a shared listed name is right for each species, a kind word is known (fish.json vn)', () => {
  const N = cnTypeNames(GAME, F.vn),
    m = t => C.typeMatchIn(N, t, norm),
    id = n => GAME.find(s => s.name === n).id;
  const tw = m('Twospot wrasse');
  assert.deepStrictEqual([...tw.shared].sort(), [id('Halichoeres biocellatus'), id('Oxycheilinus bimaculatus')].sort());
  assert.strictEqual(C.typeVerdict(tw, id('Oxycheilinus bimaculatus')), 'exact');
  ['razorfish', 'toby', 'spinefoot', 'tuskfish'].forEach(t => assert.strictEqual(m(t).known, 1, t));
  assert.strictEqual(m('Peacock razorfish').g, id('Iniistius pavo'));
});

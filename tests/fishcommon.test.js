require('./slot.js').testGuard();
// The curated common names of the fish species (1 to 3 per species, never more; published as selected; which name comes
// first; docs/FISH_PATH.md "Common names"):
// tools/fish_common.py selects them into tools/fish_common.json (every name with its sources), tools/build_fish.py writes
// them into fish.json (species cn, the main name first; cni, the IMR name's place; cnr, the regional names), and the app
// reads them through app.js cnList, cnFirst (the player's first name: the IMR name for a player at IMR, the main name for
// the others), cnShow (multiple choice: the player's first name) and cnTypeNames (typed: every listed and regional name
// and their spellings). The blocks of app.js run in a vm on core.js.
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
  norm = C.typeNormAll,
  key = n => n.toLowerCase().replace(/[\s\-‐‑'’`]/g, ''),
  IMR = s => s.common && ['pdf', 'slides'].includes(s.src || 'pdf'),
  byName = n => F.species.find(s => s.name === n);

const ctx = {typeNormAll: C.typeNormAll};
vm.createContext(ctx);
vm.runInContext(
  block(
    fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    '// The curated common names of a fish species',
    '\n    .filter(([, L]) => L.length);\n}\n',
    {
      file: 'app.js',
      through: 1
    }
  ) + '\nthis.M = {cnList, cnFirst, cnShow, cnTypeNames, cnAlso};',
  ctx
);
const {cnList, cnFirst, cnShow, cnTypeNames, cnAlso} = ctx.M;
// match: typeMatchIn over every typed name, read on the names near the text only (tests/typenear.js: the same answer,
// without an edit distance to each of the 1,300 names; the sweep below took 80 s). The last test checks the two agree.
const TN = cnTypeNames(GAME),
  full = text => C.typeMatchIn(TN, text, norm),
  match = matcher(TN, norm);

test('every game species has 1 to 3 listed names, each with a source, none listed twice; none only when no reference names it (Q247)', () => {
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
    // fish.json holds the selection as it is: the name shown, then its other spellings; the IMR name's place; the
    // regional names.
    assert.deepStrictEqual(
      L,
      p.names.map(x => [x.name, ...(x.alt || [])]),
      `${s.name}: fish.json cn is not tools/fish_common.json`
    );
    assert.strictEqual(s.cni, p.imr, `${s.name}: fish.json cni`);
    assert.deepStrictEqual(s.cnr, p.regional && p.regional.map(x => [x.name, ...(x.alt || [])]), `${s.name}: fish.json cnr`);
    p.names.forEach(x => assert.ok(x.from.length, `${s.name}: ${x.name} has no source`));
    assert.strictEqual(p.sp, s.name);
    // No two spellings of one name listed apart, nor a regional name that is a listed one.
    const keys = [...p.names, ...(p.regional || [])].map(x => key(x.name));
    assert.strictEqual(new Set(keys).size, keys.length, `${s.name}: a name listed twice`);
  });
  F.species.filter(s => !s.circle).forEach(s => assert.ok(!s.cn && s.cni === undefined && !s.cnr, `${s.name}: out of the game, no list`));
  assert.ok(n[1] && n[2] && n[3] && n[0] <= 5, JSON.stringify(n));
  // The file is what the selection gives (tools/fish_common.py --check).
  const r = require('child_process').spawnSync('python3', [path.join(ROOT, 'tools', 'fish_common.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

// iNaturalist's default English name first (FishBase's main name where iNaturalist has
// none), for every player but an IMR one; the IMR name always listed, marked (cni).
test('the main name first: iNaturalist’s default, else FishBase’s main name; the IMR name listed and marked, as written', () => {
  let inat = 0,
    fbm = 0,
    imrNotMain = 0;
  GAME.forEach(s => {
    const p = P[s.id];
    if (!p.names.length) return;
    const f = p.names[0].from,
      r = SRCN[s.id] || {},
      im = r.inat && r.inat.main,
      fm = r.fb && r.fb.main;
    if (f.includes('inatMain')) inat++;
    // iNaturalist's default is first whenever it exists, even when it is another species' name (the base name is the
    // right one for everyone outside IMR; no name belongs to one species only).
    else assert.ok(!im, `${s.name}: iNaturalist's default ${im} not first`);
    assert.ok(!(p.dropped || []).some(d => !d.regional), `${s.name}: a listed name dropped (Q381: nothing is dropped as shared)`);
    if (!f.includes('inatMain') && f.includes('fbMain')) fbm++;
    if (!f.includes('inatMain') && !f.includes('fbMain'))
      assert.ok(f.some(t => ['pdf', 'slides', 'dauin', 'wink'].includes(t)) || p.single, `${s.name}: the main name from no reference`);
    if (!im && fm) assert.ok(f.includes('fbMain'), `${s.name}: no iNaturalist name, FishBase's main name first`);
    // The IMR name: listed, marked, as written (a PDF slip shows FishBase's spelling, the PDF form accepted when typed).
    if (IMR(s)) {
      assert.ok(Number.isInteger(s.cni), `${s.name}: the IMR name not marked`);
      const x = p.names[s.cni];
      assert.ok(
        x.from.some(t => t === 'pdf' || t === 'slides'),
        `${s.name}: cni is not its IMR name`
      );
      if (!(s.check && (x.alt || []).includes(s.common))) assert.strictEqual(x.name, s.common, `${s.name}: the IMR name as written`);
      if (s.cni) imrNotMain++;
    } else assert.strictEqual(s.cni, undefined, `${s.name}: marked IMR without an IMR name`);
  });
  // The study's count (docs/reviews/2026-11-15-common-name-sources-study.md §7.1: 107 of the 367 IMR-named species).
  assert.strictEqual(imrNotMain, 107);
  assert.ok(inat > 600 && fbm >= 2, JSON.stringify({inat, fbm}));
  // Examples (the study's): Crescent wrasse → Moon wrasse, Brushtail tang → Brown tang; IMR = main: one name.
  assert.deepStrictEqual(cnList(byName('Thalassoma lunare')), ['Moon wrasse', 'Crescent wrasse']);
  assert.strictEqual(byName('Thalassoma lunare').cni, 1);
  assert.strictEqual(cnList(byName('Zebrasoma scopas'))[0], 'Brown tang');
  assert.deepStrictEqual(cnList(byName('Pomacentrus moluccensis')), ['Lemon damsel']);
  assert.strictEqual(byName('Pomacentrus moluccensis').cni, 0);
  // A Dauin source's name is no IMR name: listed, never marked.
  assert.strictEqual(byName('Novaculoides macrolepidotus').cni, undefined);
});

test('the order: the main name, then the species’ own, then the most shared (in the most references)', () => {
  const refs = x => (x.from.some(f => f === 'fbMain' || /^fb\d/.test(f)) ? 1 : 0) + (x.from.some(f => /^inat/.test(f)) ? 1 : 0),
    own = x => x.from.some(f => ['pdf', 'slides', 'dauin', 'wink'].includes(f));
  GAME.forEach(s => {
    const L = P[s.id].names.slice(1);
    // the species' own name next, when it is not the main name
    if (L.some(own)) assert.ok(own(L[0]), `${s.name}: its own name right after the main name`);
    const rest = L.filter(x => !own(x));
    rest.forEach((x, i) => i && assert.ok(refs(rest[i - 1]) >= refs(x), `${s.name}: ${x.name} before a less shared name`));
  });
  assert.deepStrictEqual(cnList(byName('Dascyllus reticulatus')), ['Reticulated damselfish', 'Reticulated dascyllus']);
});

// The player's first name: the IMR name for a player at IMR (model.js imrSaid), the main name for
// the others; a multiple-choice question shows it, always the same one (no rotation: the main name fills the unit).
test('the name a player sees first and multiple choice shows: the IMR name at IMR, the main name for the others', () => {
  const s = byName('Dascyllus reticulatus');
  assert.strictEqual(cnFirst(s, false), 'Reticulated damselfish');
  assert.strictEqual(cnFirst(s, true), 'Reticulated dascyllus');
  for (let k = 0; k < 4; k++) {
    assert.strictEqual(cnShow(s, false), 'Reticulated damselfish', 'always the same one');
    assert.strictEqual(cnShow(s, true), 'Reticulated dascyllus');
  }
  // IMR name = main name: the same for both; a Dauin species (no IMR name): the main name for both.
  const lemon = byName('Pomacentrus moluccensis');
  assert.strictEqual(cnFirst(lemon, true), cnFirst(lemon, false));
  const dauin = byName('Novaculoides macrolepidotus');
  assert.strictEqual(cnFirst(dauin, true), cnList(dauin)[0]);
  assert.strictEqual(cnFirst({}, true), '', 'no listed name (Q247)');
  assert.strictEqual(cnFirst(null, true), '');
  assert.strictEqual(cnFirst({cn: [['A']], cni: 4}, true), 'A', 'a mark out of the list: the main name');
  // Every game species: the IMR player's first is its IMR name, the others' its main name.
  GAME.filter(x => x.cn).forEach(x => {
    assert.strictEqual(cnFirst(x, false), x.cn[0][0], x.name);
    assert.strictEqual(cnFirst(x, true), IMR(x) ? x.cn[x.cni][0] : x.cn[0][0], x.name);
  });
  // Old app versions read cn[0][0] alone (an older treeTaxon): the main name, never a regional one.
  GAME.filter(x => x.cnr).forEach(x => assert.ok(!x.cnr.flat().includes(x.cn[0][0]), x.name));
});

test('typed: every listed and regional name and their spellings are accepted, as their species; no other reference name is', () => {
  const owners = new Map(),
    all = s => [...(s.cn || []), ...(s.cnr || [])].flat();
  GAME.forEach(s => all(s).forEach(x => owners.set(norm(x), [...(owners.get(norm(x)) || []), s.id])));
  GAME.forEach(s =>
    all(s).forEach(x => {
      const m = match(x),
        own = owners.get(norm(x));
      // A name two species list (flagged shared in tools/fish_common.json: "Twospot wrasse") is right for both
      // (typeMatchIn shared).
      if (new Set(own).size > 1)
        return assert.ok(m && m.shared && m.shared.includes(s.id) && C.typeVerdict(m, s.id) === 'exact', `${x}: both species`);
      assert.ok(m && m.g === s.id && m.exact, `${s.name}: ${x} not accepted`);
      assert.strictEqual(C.typeVerdict(m, s.id), 'exact');
    })
  );
  // Every other English name FishBase or iNaturalist gives a species is no exact answer for it: only the listed and
  // regional ones.
  let other = 0;
  GAME.forEach(s => {
    const r = SRCN[s.id] || {},
      mine = new Set(all(s).map(norm)),
      refs = [...((r.inat || {}).names || []), ...((r.fb || {}).names || []).map(x => x[0]), (r.fb || {}).main, (r.inat || {}).main];
    refs
      .filter(x => x && !mine.has(norm(x)))
      .forEach(x => {
        other++;
        const m = match(x);
        assert.ok(!(m && m.g === s.id && m.exact), `${s.name}: ${x} is not listed, yet accepted`);
      });
  });
  assert.ok(other > 500, `${other} unlisted reference names checked`);
  // Examples: the IMR name and the main name are both right; Lemon damsel's other name (Yellow damsel) is no answer.
  assert.strictEqual(C.typeVerdict(match('Crescent wrasse'), 's256'), 'exact', 'the IMR name');
  assert.strictEqual(C.typeVerdict(match('Moon wrasse'), 's256'), 'exact', 'the main name');
  assert.strictEqual(C.typeVerdict(match('Yellow damsel'), 's119'), 'none');
  assert.strictEqual(C.typeVerdict(match('Lemon damselfish'), 's119'), 'exact', 'a recorded spelling of a listed name');
  assert.strictEqual(C.typeVerdict(match('Reticulated damselfsh'), 's086'), 'close', 'a slip: the spelling step, as everywhere');
  assert.strictEqual(C.typeVerdict(match('Lemon'), 's119'), 'none', 'no short form');
});

// The regional standard names (iNaturalist's name under the Australia place: AS 5300 / Fishes of Australia)
// are accepted when typed, never shown: not in cn, so no page and no older app shows them.
test('regional names: accepted when typed, never listed, never another species’ name', () => {
  const s = byName('Chromis ternatensis'),
    d = byName('Dascyllus reticulatus');
  assert.deepStrictEqual(cnList(s), ['Ternate chromis']);
  assert.strictEqual(s.cnr[0][0], 'Swallowtail puller', 'the region’s own form first');
  assert.strictEqual(C.typeVerdict(match('Swallowtail puller'), s.id), 'exact');
  assert.strictEqual(C.typeVerdict(match('Headband humbug'), d.id), 'exact');
  assert.ok(!cnList(d).includes('Headband humbug'));
  assert.strictEqual(C.typeVerdict(match('Western clown anemonefish'), byName('Amphiprion ocellaris').id), 'exact');
  // Every regional name is iNaturalist's under a region, never the species' main name.
  let n = 0;
  GAME.filter(x => x.cnr).forEach(x =>
    P[x.id].regional.forEach(r => {
      n++;
      assert.ok(r.from.includes('inat:Australia'), `${x.name}: ${r.name}`);
    })
  );
  assert.ok(n > 100, String(n));
  // Dropped where another game species has it, or a spelling of it: Painted sweetlips is Diagramma pictum's own.
  const pic = P[byName('Plectorhinchus picus').id];
  assert.ok(pic.dropped.some(x => x.regional && x.name === 'Painted sweetlips' && x.sharedWith.includes('Diagramma pictum')));
  assert.strictEqual(C.typeVerdict(match('Painted sweetlips'), byName('Diagramma pictum').id), 'exact');
  // The family's typed answers read them too (core.js treeNameIndex: 'sp', a species of that family).
  const idx = C.treeNameIndex(F, {});
  assert.ok(idx.some(x => x.x === 'Swallowtail puller' && x.g === s.family && x.vr === 'sp'));
});

// Two species may carry the same common name: the base name
// is iNaturalist's default for everyone outside IMR, even when it is another species' IMR name; a player at IMR keeps the
// IMR name first; nothing is dropped; tools/fish_common.json lists every shared name, the app's cnAlso reads the same.
const PAIRS = [
  // [species whose iNaturalist default it is, the name as it lists it, the species whose IMR name it is]
  ['Forcipiger longirostris', 'Longnose butterflyfish', 'Forcipiger flavissimus'],
  ['Pomacentrus armillatus', 'Brown damsel', 'Pomacentrus opisthostigma'],
  ['Lutjanus fulviflamma', 'Blackspot snapper', 'Lutjanus ehrenbergii'],
  ['Diproctacanthus xanthurus', 'Yellow-tail wrasse', 'Anampses meleagrides']
];
test('Q381: the four names #954 kept with their IMR species are back as the base names, listed by both species', () => {
  PAIRS.forEach(([a, nm, b]) => {
    const A = byName(a),
      B = byName(b);
    assert.strictEqual(A.cn[0][0], nm, `${a}: iNaturalist's default first`);
    assert.ok(P[A.id].names[0].from.includes('inatMain'), `${a}: its main name is iNaturalist's default`);
    assert.strictEqual(cnFirst(A, false), nm, `${a}: shown first outside IMR`);
    assert.strictEqual(key(cnFirst(B, true)), key(nm), `${b}: its IMR name first at IMR`);
    assert.strictEqual(cnFirst(A, true), A.cn[A.cni][0], `${a}: its own IMR name first at IMR`);
    assert.notStrictEqual(key(cnFirst(A, true)), key(nm), `${a}: at IMR, its own name, not ${b}'s`);
    assert.ok(B.cn.flat().map(key).includes(key(nm)), `${b}: keeps ${nm}`);
    assert.ok(P[A.id].names[0].shared.includes(b), `${a}: ${nm} flagged shared with ${b}`);
    // Typed, the name is right for the species asked, either of them (typeMatchIn shared).
    const m = match(nm);
    assert.ok(m && m.shared, `${nm}: both species`);
    [A, B].forEach(X => assert.strictEqual(C.typeVerdict(m, X.id), 'exact', `${nm} typed on ${X.name}`));
    // The sheet: each says "Also used for" the other.
    assert.deepStrictEqual(
      cnAlso(A, GAME).map(([n, L]) => [n, L.map(x => x.name)]),
      [[A.cn[0][0], [b]]],
      `${a}: also used for ${b}`
    );
    assert.ok(
      cnAlso(B, GAME).some(([n, L]) => key(n) === key(nm) && L.some(x => x.name === a)),
      `${b}: also used for ${a}`
    );
  });
  // F. flavissimus: iNaturalist's Forceps butterflyfish first, its IMR name second.
  assert.deepStrictEqual(cnList(byName('Forcipiger flavissimus')).slice(0, 2), ['Forceps butterflyfish', 'Longnose butterflyfish']);
});

test('Q381: every shared name listed (tools/fish_common.json shared), the app reading the same; the same first names', () => {
  const S = read('tools/fish_common.json').shared;
  // The file's list: name -> species ids, each a name two game species or more list (any spelling).
  Object.entries(S).forEach(([n, ids]) => {
    assert.ok(ids.length >= 2, n);
    assert.ok(
      ids.some(id => P[id].names.some(x => x.name === n)),
      `${n}: a name one of them shows`
    );
    ids.forEach(id =>
      assert.ok(
        P[id].names.some(x => x.shared),
        `${n}: ${id} lists a shared name`
      )
    );
  });
  // The app's cnAlso, over every game species, gives the same pairs as the file.
  const app = new Map(),
    file = new Map();
  GAME.forEach(s =>
    cnAlso(s, GAME).forEach(([n, L]) =>
      app.set(
        s.id + '|' + key(n),
        L.map(x => x.id)
          .sort()
          .join(',')
      )
    )
  );
  GAME.forEach(s =>
    P[s.id].names
      .filter(x => x.shared)
      .forEach(x => {
        const ids = x.shared.map(n => byName(n).id).sort();
        file.set(s.id + '|' + key(x.name), ids.join(','));
        // the file's top-level list holds the pair under the name the species shows
        assert.deepStrictEqual(S[x.name], [s.id, ...ids].sort(), `${x.name}: ${s.name}`);
      })
  );
  assert.deepStrictEqual([...app].sort(), [...file].sort());
  // 11 names (Twotone / Two-tone wrasse one name), each on two species.
  const groups = new Set([...file].map(([k, v]) => [k.split('|')[0], ...v.split(',')].sort().join(',')));
  assert.strictEqual(groups.size, 11, [...groups].join(' '));
  // Players who see the same first name for two species (the multiple choice keeps them apart: model.js choiceApart).
  [false, true].forEach(imr => {
    const seen = new Map();
    GAME.filter(x => x.cn).forEach(x => {
      const k = key(cnFirst(x, imr));
      seen.set(k, [...(seen.get(k) || []), x.name]);
    });
    const twice = [...seen.values()].filter(v => v.length > 1).map(v => v.sort().join(' / '));
    assert.deepStrictEqual(
      twice.sort(),
      [
        'Halichoeres biocellatus / Oxycheilinus bimaculatus',
        'Halichoeres papilionaceus / Novaculoides macrolepidotus',
        ...(imr
          ? ['Halichoeres prosopeion / Thalassoma amblycephalum']
          : ['Pomacentrus armillatus / Pomacentrus opisthostigma', 'Anampses meleagrides / Diproctacanthus xanthurus'])
      ].sort(),
      imr ? 'IMR players' : 'other players'
    );
  });
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

// The species level's reading: a name two species list is right for each of them; a kind word
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

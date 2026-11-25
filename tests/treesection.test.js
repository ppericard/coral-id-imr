require('./slot.js').testGuard();
// The builds' generic tree section (tools/tree_section.py: data/<subject id>-tree.json; docs/ROADMAP.md "The Tree tab"; Pierre,
// 2026-11-13, Q339-Q341: each subject builds its own tree from its own references). The Python build is held to the shared
// JS functions on the real data (autosort.js treeUnitsOf, taxtree.js ttFromRef, ttBuild), the files to their sources (a section
// out of date fails here: run `python3 tools/tree_section.py`), and the admin's reader (admin.js fuTreeOf, fuWormsOf) is run on
// made-up sections: the units' records and the IMR tag laid back on the nodes, the genus-level leaves added from the photos.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync, execFileSync} = require('child_process'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  {SUBJECTS, ORG} = require('../core.js'),
  {treeUnitsOf} = require('../autosort.js'),
  {ttBuild, ttFromRef, ttSection} = require('../taxtree.js'),
  PY = path.join(ROOT, 'tools/tree_section.py'),
  TREE_SUBJECTS = SUBJECTS.filter(S => !S.flat);

test('every subject has its section file, in its sources’ words: the build is up to date', () => {
  const r = spawnSync('python3', [PY, '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr || 'run python3 tools/tree_section.py');
  SUBJECTS.forEach(S => {
    const sec = read(`data/${S.id}-tree.json`);
    assert.strictEqual(sec.v, 1, S.id);
    assert.deepStrictEqual(Object.keys(sec.views), ['key', 'worms'], S.id);
    // one node per line, every node with an id and a name: a section is taxtree.js's own nodes
    ['key', 'worms'].forEach(v => sec.views[v].nodes.forEach(n => assert.ok(n.id && n.name, `${S.id} ${v} ${JSON.stringify(n)}`)));
  });
});

test('a section out of date with its sources is found: the check bites', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'treesection-')),
    F = read('fish.json');
  try {
    F.species.find(x => !x.out).out = 'planted';
    fs.writeFileSync(path.join(dir, 'fish.json'), JSON.stringify(F));
    const planted = execFileSync('python3', [PY, '--print', 'fish', path.join(dir, 'fish.json')], {encoding: 'utf8', maxBuffer: 1 << 26});
    assert.notStrictEqual(planted, fs.readFileSync(path.join(ROOT, 'data/fish-tree.json'), 'utf8'));
  } finally {
    fs.rmSync(dir, {recursive: true});
  }
});

// The units as admin.js fishLoad lays them out (the taxonomic group a tree puts a family in when the key has none).
const unitsOf = F => {
  const tg = Object.fromEntries((F.families || []).filter(f => f.tgroup != null).map(f => [f.id, f.tgroup]));
  return treeUnitsOf(F)
    .map(u => (u.group == null && u.id in tg ? {...u, group: tg[u.id]} : u))
    .sort((a, b) => (a.group == null ? 99 : a.group) - (b.group == null ? 99 : b.group));
};
// The WoRMS node of a genus of the tree (admin.js fuGenusRef as it was): its own reference, else the WoRMS genus above the
// first of its species with a reference; '' for none.
const genusRef = (F, gid) => {
  const g = (F.genera || []).find(x => x.id === gid) || {},
    R = F.ref || {},
    sp = Object.fromEntries(F.species.map(x => [x.id, x]));
  if (g.ref != null) return g.ref;
  for (const s of g.species || [])
    for (let x = (sp[s] || {}).ref; x != null && R[x]; x = R[x].parent) if (String(R[x].rank).toLowerCase() === 'genus') return x;
  return '';
};

TREE_SUBJECTS.forEach(S => {
  test(`${S.id}: the Key is the key groups, families, genera and species in the game of the file, in its order`, () => {
    const F = read(S.admin.files.f),
      sec = read(`data/${S.id}-tree.json`),
      K = ttBuild(sec.views.key.nodes),
      sp = Object.fromEntries(F.species.map(x => [x.id, x])),
      ok = s => sp[s] && !sp[s].out,
      R = Object.keys(S.sheets),
      groups = Object.fromEntries(((F.key || F.taxa || {}).groups || []).map(g => [g.n, g.title]));
    assert.deepStrictEqual(K.problems, []);
    // the ranks of the subject's sheets, broadest first
    assert.deepStrictEqual(R, ['family', 'genus', 'species']);
    const U = unitsOf(F),
      fam = K.roots.flatMap(r => K.kids.get(r));
    assert.deepStrictEqual(
      fam,
      U.map(u => u.id),
      'the families in the book’s order'
    );
    // the key groups: one root per group the families sit in, in the families' order
    assert.deepStrictEqual(K.roots, [...new Set(U.map(u => (u.group == null ? 'k:none' : 'k:' + u.group)))], 'the key groups');
    K.roots.forEach(r => {
      const n = K.node.get(r);
      assert.strictEqual(n.rank, r === 'k:none' ? undefined : 'group');
      assert.strictEqual(n.name, r === 'k:none' ? 'No key group' : `${r.slice(2)} · ${groups[r.slice(2)] || ''}`);
    });
    U.forEach(u => {
      const n = K.node.get(u.id);
      assert.strictEqual(n.rank, R[0]);
      assert.strictEqual(n.unit, true);
      assert.strictEqual(n.name, u.name);
      assert.strictEqual(n.sci, u.sci.join(', '));
      assert.strictEqual(n.imr || '', u.imr);
      assert.strictEqual(n.imrWith || '', u.imrWith);
      assert.deepStrictEqual(
        K.kids.get(u.id),
        u.genera.filter(g => g.species.some(ok)).map(g => g.id)
      );
      u.genera.forEach(g => {
        const S1 = g.species.filter(ok);
        if (!S1.length) return assert.ok(!K.node.has(g.id) || K.up.get(g.id) !== u.id, g.id);
        const gn = K.node.get(g.id);
        assert.strictEqual(gn.rank, R[1]);
        assert.strictEqual(gn.it, true);
        assert.strictEqual(gn.imr || '', g.imr);
        assert.deepStrictEqual(K.kids.get(g.id), S1);
        S1.forEach(s => {
          const x = K.node.get(s),
            c = sp[s].common;
          assert.deepStrictEqual([x.name, x.sci, x.it, x.rank, x.sid], [c || sp[s].name, c ? sp[s].name : '', !c, R[2], s], s);
        });
      });
    });
    // every species in the game of a family is a leaf, and nothing else is
    const inGame = U.flatMap(u => u.genera.flatMap(g => g.species.filter(ok)));
    assert.deepStrictEqual(
      [...K.node.values()].filter(n => n.sid).map(n => n.id),
      inGame
    );
  });

  test(`${S.id}: the WoRMS view is ttFromRef on the file’s reference table above the Key’s leaves, in the Key’s order`, () => {
    const F = read(S.admin.files.f),
      sec = read(`data/${S.id}-tree.json`),
      key = sec.views.key.nodes,
      W = sec.views.worms,
      sp = Object.fromEntries(F.species.map(x => [x.id, x])),
      leaves = key
        .filter(n => n.sid)
        .map(n => ({
          id: n.id,
          name: n.name,
          sci: n.sci,
          rank: n.rank,
          it: !!n.it,
          sid: n.sid,
          ref: sp[n.sid].ref,
          ...(sp[n.sid].ref == null || sp[n.sid].ref === '' ? {at: genusRef(F, sp[n.sid].genus)} : {})
        })),
      {nodes, problems} = ttFromRef(leaves, F.ref || {}, {id: k => 'w:' + k, rank: r => String(r).toLowerCase()});
    nodes.forEach(n => n.ref && !n.sid && n.rank === 'genus' && (n.it = true));
    const norm = L => JSON.parse(JSON.stringify(L));
    assert.deepStrictEqual(W.nodes, norm(nodes));
    assert.deepStrictEqual(W.problems, norm(problems));
    const T = ttBuild(W.nodes);
    assert.deepStrictEqual(T.problems, [], 'the reference table is a tree');
    // one node per leaf of the Key in both views: a species is the same node
    assert.deepStrictEqual(
      [...T.node.values()].filter(n => n.sid).map(n => n.id),
      key.filter(n => n.sid).map(n => n.id)
    );
    // at: where a genus's genus-level leaf of its own hangs (admin.js adds those leaves): its WoRMS node, when the view has it
    const ids = new Set(W.nodes.map(n => n.id)),
      genera = key.filter(n => n.rank === 'genus' && !n.sid && !n.unit);
    genera.forEach(g => {
      const r = genusRef(F, g.id);
      assert.strictEqual((W.at || {})[g.id], r !== '' && ids.has('w:' + r) ? 'w:' + r : undefined, g.id);
    });
  });
});

// The admin's reader on made-up sections: the units' records, the IMR tag and the genus-level leaves laid on the section's nodes.
const ADMIN = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
  CHUNK =
    block(ADMIN, 'const fuImr = u =>', '// A fish photo with its crop', {file: 'admin.js'}) +
    block(ADMIN, 'let TT = null;', 'const tvKeep = h =>', {file: 'admin.js'}) +
    '\nthis.fuTreeOf = fuTreeOf; this.fuWormsOf = fuWormsOf; this.TSEC = TSEC; this.glId = glId;';
const plain = x => JSON.parse(JSON.stringify(x)); // what a vm context built, in this realm's words
const reader = (sec, FISHC, S = {id: 'x'}) => {
  const c = vm.createContext({FISHC, FISHS: S, ASUBJ: S, ORG, ttBuild, ttSection, esc: s => String(s)});
  vm.runInContext(CHUNK, c);
  c.TSEC.x = sec;
  return c;
};
const section = {
  v: 1,
  views: {
    key: {
      nodes: [
        {id: 'k:1', name: '1 · A', rank: 'group'},
        {id: 'f:F1', name: 'Fam', sci: 'Famidae', rank: 'family', up: 'k:1', unit: true, imr: 'Course name'},
        {id: 'g:G1', name: 'Gen', it: true, rank: 'genus', up: 'f:F1', imrWith: 'x'},
        {id: 's1', name: 'One', sci: '', it: true, rank: 'species', up: 'g:G1', sid: 's1'},
        {id: 's2', name: 'Two', sci: '', it: true, rank: 'species', up: 'g:G1', sid: 's2'},
        {id: 'g:G2', name: 'Gen2', it: true, rank: 'genus', up: 'f:F1'},
        {id: 's3', name: 'Three', sci: '', it: true, rank: 'species', up: 'g:G2', sid: 's3'}
      ]
    },
    worms: {
      nodes: [
        {id: 'w:1', name: 'Order', ref: '1', rank: 'order'},
        {id: 'w:2', name: 'Gen', ref: '2', rank: 'genus', up: 'w:1', it: true},
        {id: 's1', name: 'One', sci: '', rank: 'species', it: true, sid: 's1', ref: 11, up: 'w:2'},
        {id: 's2', name: 'Two', sci: '', rank: 'species', it: true, sid: 's2', ref: 12, up: 'w:2'},
        {id: 'w:3', name: 'Gen2', ref: '3', rank: 'genus', up: 'w:1', it: true},
        {id: 's3', name: 'Three', sci: '', rank: 'species', it: true, sid: 's3', ref: 13, up: 'w:3'}
      ],
      problems: [{id: 'sX', why: 'no reference'}],
      at: {'g:G1': 'w:2', 'g:G2': 'w:3'}
    }
  }
};
const units = [
  {
    id: 'f:F1',
    name: 'Fam',
    imr: 'Course name',
    genera: [
      {id: 'g:G1', name: 'Gen', imr: '', species: ['s1', 's2']},
      {id: 'g:G2', name: 'Gen2', imr: '', species: ['s3']}
    ]
  }
];

test('the admin’s reader: the units’ records and the IMR tag laid on the section’s nodes, the section kept whole', () => {
  const sealed = JSON.stringify(section),
    c = reader(section, {units, plays: [], cand: {}, genera: {}}),
    T = c.fuTreeOf(units);
  assert.deepStrictEqual(T.problems, []);
  assert.deepStrictEqual(T.roots, ['k:1']);
  assert.strictEqual(T.node.get('f:F1').u, units[0]);
  assert.strictEqual(T.node.get('g:G1').g, units[0].genera[0]);
  assert.strictEqual(T.node.get('g:G2').g, units[0].genera[1]);
  assert.strictEqual(T.node.get('s1').u, undefined);
  assert.match(T.node.get('f:F1').tag, /adm-imrt.*IMR course: Course name/);
  assert.match(T.node.get('g:G1').tag, /taught with the x/);
  assert.strictEqual(T.node.get('g:G2').tag, '');
  assert.strictEqual(T.node.get('s1').tag, undefined);
  assert.strictEqual(JSON.stringify(section), sealed, 'the section as read stays whole (the nodes are copies)');
  assert.strictEqual(c.fuTreeOf(units), T, 'built once per units');
});

test('the admin’s reader: a genus-level leaf from the photos goes after its genus’s species, in both views', () => {
  const FISHC = {units, plays: [{gl: 1, sp: 'g:G1'}, {f: 'x'}], cand: {'g:G2': []}, genera: {'g:G2': {id: 'g:G2'}}},
    c = reader(section, FISHC),
    K = c.fuTreeOf(units),
    W = c.fuWormsOf(units);
  // the genera with genus-level photos: in play (gl, sp the genus) or candidates (a genus's own list)
  assert.deepStrictEqual(K.kids.get('g:G1'), ['s1', 's2', 'gl:g:G1']);
  assert.deepStrictEqual(K.kids.get('g:G2'), ['s3', 'gl:g:G2']);
  const gl = K.node.get('gl:g:G1');
  assert.deepStrictEqual(
    {...gl},
    {id: 'gl:g:G1', name: 'Gen sp.', sci: '', it: true, rank: 'genus level', up: 'g:G1', sid: 'g:G1', gl: true}
  );
  assert.strictEqual(c.glId('g:G1'), 'gl:g:G1');
  // WoRMS: under the genus's WoRMS node (the section's at), after its species; the build's problems kept
  assert.deepStrictEqual(W.kids.get('w:2'), ['s1', 's2', 'gl:g:G1']);
  assert.deepStrictEqual(W.kids.get('w:3'), ['s3', 'gl:g:G2']);
  assert.strictEqual(W.node.get('gl:g:G1').sid, 'g:G1');
  assert.strictEqual(W.node.get('gl:g:G1').gl, true);
  assert.deepStrictEqual(plain(W.problems), [{id: 'sX', why: 'no reference'}]);
});

test('the admin’s reader: a genus-level leaf the section cannot place is a problem of the tree, a missing section an empty tree', () => {
  const noAt = JSON.parse(JSON.stringify(section));
  delete noAt.views.worms.at;
  const c = reader(noAt, {units, plays: [{gl: 1, sp: 'g:G1'}], cand: {}, genera: {}}),
    W = c.fuWormsOf(units);
  assert.ok(W.roots.includes('gl:g:G1'), 'a root: never placed by a guess');
  assert.deepStrictEqual(plain(W.problems), [
    {id: 'sX', why: 'no reference'},
    {id: 'gl:g:G1', why: 'no reference'}
  ]);
  const none = reader({}, {units, plays: [], cand: {}, genera: {}});
  assert.strictEqual(none.fuTreeOf(units).node.size, 0);
  assert.strictEqual(none.fuWormsOf(units).node.size, 0);
});

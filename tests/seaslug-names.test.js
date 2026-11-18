require('./slot.js').testGuard();
// The sea slugs' English common names and nicknames (at the family, genus and species level, nicknames too;
// information only, never an answer choice): tools/seaslug_names.py reads the sources (made-up replies here, nothing leaves the machine) and merges them,
// each name with its sources (rule C2), a name on two taxa listed (rule C5); tools/seaslug_game.py copies them into
// seaslug.json; app.js gives them through UNITS vern, the photo's taxon line after the answer and the typed-name nudge.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync} = require('child_process'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const py = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_names as N\nimport seaslug_game as G\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('the sources read: iNaturalist English lexicon (Latin script only), WoRMS English vernaculars', () => {
  const o = py(`
t = {'preferred_common_name': "Anna's Chromodoris", 'names': [
  {'name': 'Chromodorids', 'lexicon': 'English', 'position': 3}, {'name': 'ארנב ימיים', 'lexicon': 'English', 'position': 4},
  {'name': 'Nudibranquios', 'lexicon': 'Spanish', 'position': 1}, {'name': "Anna's Chromodoris", 'lexicon': 'English', 'position': 0}]}
v = [{'vernacular': 'Rainbow dorid', 'language_code': 'eng'}, {'vernacular': 'Doris', 'language_code': 'fra'}]
print(json.dumps([N.inat_names(t), N.worms_names(v), N.clean('  "Sea bunny" '), N.clean('x1')]))
`);
  assert.deepStrictEqual(
    o[0],
    {pref: "Anna's Chromodoris", en: ["Anna's Chromodoris", 'Chromodorids']},
    'a name in another script filed as English is left out'
  );
  assert.deepStrictEqual(o[1], ['Rainbow dorid']);
  assert.strictEqual(o[2], 'Sea bunny');
  assert.strictEqual(o[3], '');
});

test("Wikipedia: the intro's names, a nickname when it says so; redirects that are no scientific name; the article's kind", () => {
  const o = py(`
s1 = N.said("Costasiella kuroshimae (also known as a leaf slug, sea sheep, or leaf sheep) is a species of sea slug.", ['Costasiella kuroshimae'])
s2 = N.said("It is sometimes also nicknamed the Pikachu nudibranch due to its resemblance to Pikachu.")
s3 = N.said("Jorunna parva, commonly known as the sea bunny, is a species of nudibranch.", ['Jorunna parva'])
s6 = N.said("Elysia pusilla are part of Sacoglossa, also known as the solar powered sea slugs.", ['Elysia pusilla'])
r = N.redirect_names(['Leaf sheep', 'Costasiella kuroshimai', 'Doris kuroshimae', 'Pikachu nudibranch', 'Spurilla major', 'Facelininae',
                      'Leafsheep', 'Chromodorids', "Gardiner's philinopsis"], ['Costasiella kuroshimae', 'Doris kuroshimae'], ['Costasiella', 'Doris'])
s4 = N.said("Chromodorididae, or chromodorids, are a taxonomic family of colourful sea slugs.", ['Chromodorididae'])
s5 = N.said("Tambja morosa, also known as Tambja kushimotoensis or the gloomy nudibranch, or Noumea, is a sea slug.", ['Tambja morosa'], ['Tambja'])
k = [N.kind('Hexabranchus sanguineus', 'Spanish dancer', [], {'Hexabranchus'}), N.kind('Aa bb', 'Aa bb', [], set()),
     N.kind('Tenellia puti', 'Tenellia', [], {'Tenellia'}), N.kind('Aa bb', 'Cc bb', ['Cc bb'], set())]
print(json.dumps([[x[:2] for x in s1], [x[:2] for x in s2], [x[:2] for x in s3], r, k, [x[0] for x in s4], [x[0] for x in s5], s6]))
`);
  assert.deepStrictEqual(
    o[0],
    [
      ['Leaf slug', 0],
      ['Sea sheep', 0],
      ['Leaf sheep', 0]
    ].map(([n, k]) => [n.toLowerCase(), k])
  );
  assert.deepStrictEqual(o[1], [['Pikachu nudibranch', 1]], '"nicknamed": a nickname');
  assert.deepStrictEqual(o[2], [['sea bunny', 0]]);
  assert.deepStrictEqual(
    o[3],
    ['Leaf sheep', 'Pikachu nudibranch', 'Chromodorids', "Gardiner's philinopsis"],
    'a misspelt or older binomial, a synonym, a subfamily, a spelling run together are no English name'
  );
  assert.deepStrictEqual(o[4], ['named', 'own', 'other', 'other']);
  assert.deepStrictEqual(o[5], ['chromodorids'], 'the title\'s ", or …,"');
  assert.deepStrictEqual(o[6], ['gloomy nudibranch'], 'a binomial of a genus of the subject and a capitalised word are scientific');
  assert.deepStrictEqual(o[7], [], 'a name the sentence gives another subject (Sacoglossa) is not the taxon’s');
});

test("the guides: an index's links to pages named by the scientific name, a species page's heading", () => {
  const o = py(`
h = '<a href="chromodorisannae.html">Anna&#039;s Chromodoris</a> <a href="noumeacrocea.html">Saffron Noumea</a> <a href="x.html">X</a>'
L = N.anchors(h, 'https://g.example/indopac/')
g = [{'t': 'Guide', 'links': L}, {'t': 'Site', 'links': [['diversidoriscrocea', 'Saffron Chromodorid', 'https://s.example/d']]}]
t = {'rank': 'species', 'name': 'Diversidoris crocea', 'sci': ['Noumea crocea']}
H = [N.heading('<h1 class="page-header">Anna&#039;s Chromodoris <small><em>Chromodoris annae</em> Bergh</small></h1>'),
     N.heading('<h1><em>Hypselodoris krakatoa</em> <small>Gosliner</small></h1>'), N.heading('<p>none</p>')]
print(json.dumps([L[:2], N.guide_names(t, g), H]))
`);
  assert.deepStrictEqual(o[0], [
    ['chromodorisannae', "Anna's Chromodoris", 'https://g.example/indopac/chromodorisannae.html'],
    ['noumeacrocea', 'Saffron Noumea', 'https://g.example/indopac/noumeacrocea.html']
  ]);
  assert.deepStrictEqual(
    o[1].map(x => x[0]),
    ['Saffron Noumea', 'Saffron Chromodorid'],
    "a page named by a synonym of the taxon gives it the link's name"
  );
  assert.deepStrictEqual(o[2], [["Anna's Chromodoris", 'Chromodoris annae'], ['', 'Hypselodoris krakatoa'], null]);
});

test('derive: one name per spelling with all its sources, most sources first, nicknames marked, a name on two taxa listed', () => {
  const o = py(`
taxa = [
 {'rank': 'species', 'name': 'Costasiella kuroshimae', 'raw': {'inat': {'pref': 'Leaf Slug', 'en': ['Leaf Slug', 'Leaf Sheep']}, 'worms': [],
  'wiki': {'title': 'Costasiella kuroshimae', 'kind': 'own', 'said': [['leaf sheep', 0, 's'], ['sea sheep', 0, 's']], 'names': ['Leaf-sheep']}}},
 {'rank': 'species', 'name': 'Hexabranchus sanguineus', 'raw': {'inat': {'pref': '', 'en': []}, 'worms': ['Spanish Dancer'],
  'wiki': {'title': 'Spanish dancer', 'kind': 'named', 'said': [], 'names': []}}},
 {'rank': 'species', 'name': 'Hexabranchus lacer', 'raw': {'inat': None, 'worms': None, 'wiki': None}},
 {'rank': 'genus', 'name': 'Aplysia', 'raw': {'inat': {'pref': 'Aplysia', 'en': []}, 'worms': [], 'wiki': None}}]
web = [{'taxon': 'Hexabranchus lacer', 'rank': 'species', 'name': 'Spanish dancer', 'nick': True, 't': 'Site, a page', 'u': 'https://s.example/p'},
       {'taxon': 'Costasiella kuroshimae', 'rank': 'species', 'name': 'Shaun the Sheep', 't': 'Mag', 'u': 'https://m.example/'}]
names, shared = N.derive(taxa, web)
print(json.dumps([names, shared]))
`);
  const [names, shared] = o;
  assert.deepStrictEqual(names[0], [
    {n: 'Leaf Sheep', src: ['inat', 'wiki']},
    {n: 'Leaf Slug', src: ['inat']},
    {n: 'sea sheep', src: ['wiki']},
    {n: 'Shaun the Sheep', src: ['web'], web: [{t: 'Mag', u: 'https://m.example/'}]}
  ]);
  assert.deepStrictEqual(names[1], [{n: 'Spanish Dancer', src: ['worms', 'wiki']}], "the article's own English title counts");
  assert.deepStrictEqual(names[2], [{n: 'Spanish dancer', src: ['web'], nick: 1, web: [{t: 'Site, a page', u: 'https://s.example/p'}]}]);
  assert.deepStrictEqual(names[3], [], 'a scientific name is never kept as an English name');
  assert.deepStrictEqual(shared, [
    {
      n: 'Spanish Dancer',
      taxa: [
        ['species', 'Hexabranchus sanguineus', ['worms', 'wiki']],
        ['species', 'Hexabranchus lacer', ['web']]
      ]
    }
  ]);
});

test('tools/seaslug_names.json derives as written and holds every family, genus and species of the game', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'seaslug_names.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const d = read('tools/seaslug_names.json');
  d.taxa.forEach(t =>
    t.names.forEach(x => {
      assert.ok(x.src.length, `${t.name}: ${x.n} has a source`);
      (x.web || []).forEach(w => assert.match(w.u, /^https:\/\//, `${t.name}: ${x.n}'s page`));
    })
  );
  // A name on two taxa is a point for the admin (rule C5): each in points.json.
  const P = read('points.json').points.filter(p => p.subj === 'seaslug'),
    said = P.map(p => p.title + ' ' + p.q + ' ' + (p.ctx || []).join(' '))
      .join(' ')
      .toLowerCase();
  d.shared.forEach(s => assert.ok(said.includes(s.n.toLowerCase()), `"${s.n}" on two taxa is in points.json`));
});

test('seaslug.json carries the names (en) and their sources (ensrc) on families, genera and species; no choice changes', () => {
  const o = py(`
N_ = {'pulled': {'inat': ['2026-11-17', '2026-11-17']}, 'guides': [], 'taxa': [
 {'rank': 'genus', 'name': 'Hexabranchus', 'inat': 51, 'worms': 7, 'raw': {'wiki': {'title': 'Hexabranchus', 'kind': 'own'}}, 'names': [{'n': 'Spanish Dancers', 'src': ['inat']}]},
 {'rank': 'species', 'name': 'Hexabranchus lacer', 'inat': 5, 'raw': {}, 'names': []}]}
print(json.dumps([[list(k), v] for k, v in G.names_of(N_).items()]))
`);
  assert.deepStrictEqual(
    o.map(x => x[0]),
    [['genus', 'Hexabranchus']],
    'a taxon no source names carries nothing'
  );
  assert.deepStrictEqual(
    o.map(x => x[1]),
    [{en: [{n: 'Spanish Dancers', src: ['inat']}], ensrc: {inat: 51, worms: 7, wiki: 'Hexabranchus'}}]
  );
  const F = read('seaslug.json'),
    N = read('tools/seaslug_names.json'),
    named = r => N.taxa.find(t => t.rank === r[0] && t.name === r[1]);
  [
    ...F.families.map(f => ['family', f.name, f]),
    ...F.genera.map(g => ['genus', g.name, g]),
    ...F.species.map(s => ['species', s.name, s])
  ].forEach(r => assert.deepStrictEqual(r[2].en || [], (named(r) || {}).names || [], `${r[0]} ${r[1]}`));
  assert.ok(F.ensrc && F.ensrc.inat, "the tree says when the names' sources were read");
});

// app.js as the sea slugs read it: UNITS vern, the taxon line after the answer, the typed-name nudge's common names.
const APP = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const ctx = {
  esc: s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]),
  safeUrl: u => u
};
vm.createContext(ctx);
vm.runInContext(
  block(APP, 'const cnList = s =>', '\n};\n', {file: 'app.js', through: 1}) +
    block(APP, "// The photo's own taxon, said in one short line", '// Every unit of a rank in', {file: 'app.js'}) +
    block(APP, 'function treeTypeOther(rk) {', '\n}\n', {file: 'app.js', through: 1}) +
    '\nvar TREERAW = null, TREEU = null, SUBJ = {id: "s"};\n' +
    'var UNITS = {s: {vern: id => treeVern(id), taxon: p => { const t = treeTaxon(TREEU && TREEU.sps, p, false); return t ? {...t, common: vernFirst(t.id)} : t; }}, f: {}};\n' +
    'this.M = {vernOf, vernFirst, vernSrcs, photoTaxon, taxonLine, treeTypeOther};\n' +
    'this.set = (F, k) => { TREERAW = {f: F}; TREEU = {sps: Object.fromEntries(F.species.map(s => [s.id, s]))}; SUBJ = {id: k}; };',
  ctx
);

test('app.js: the names of a unit or taxon by its tree id, the first capitalised; none for a subject without them', () => {
  const F = {
    families: [{id: 'f:A', name: 'Aidae', en: [{n: 'polyceras', src: ['worms']}]}],
    genera: [{id: 'g:Aa', name: 'Aa', family: 'f:A', species: ['s1']}],
    species: [
      {
        id: 's1',
        name: 'Aa bb',
        family: 'f:A',
        genus: 'g:Aa',
        en: [{n: 'Sea bunny', src: ['wiki'], nick: 1, web: [{t: 'Site, page', u: 'https://s.example/'}]}]
      }
    ]
  };
  ctx.set(F, 's');
  const {vernOf, vernFirst, vernSrcs, photoTaxon, taxonLine, treeTypeOther} = ctx.M;
  assert.strictEqual(vernFirst('f:A'), 'Polyceras');
  assert.strictEqual(vernFirst('g:Aa'), '');
  assert.strictEqual(vernOf('s1').length, 1);
  assert.strictEqual(
    vernSrcs('s1', vernOf('s1')[0]),
    '<a href="https://s.example/" target="_blank" rel="noopener" title="Site, page">Site</a>'
  );
  // after the answer: the photo's species, its first English name before its scientific name
  assert.strictEqual(taxonLine(photoTaxon([{f: 'x', sp: 's1'}], 'g:Aa')), '<p class="fbsp">This photo: Sea bunny · <i>Aa bb</i></p>');
  // typed on a genus question: an English name is a common name (the nudge), never a genus
  const T = treeTypeOther('genus');
  assert.ok(T.common.includes('Sea bunny') && T.common.includes('polyceras'));
  assert.ok(!T.sci.includes('Sea bunny'));
  // core.js typeElse (quiz.js typeKind) reads it so: "“Sea bunny” is a common name: this question needs a genus's
  // scientific name", the genus names themselves being no common name
  const C = require('../core.js'),
    G = [{k: C.typeNormAll('Aa'), g: 'g:Aa', old: '', alt: 0}];
  assert.strictEqual(C.typeElse('sea bunny', [], {...T, rank: () => 'genus'}, C.typeNormAll), 'common');
  assert.strictEqual(C.typeElse('Aa', G, {...T, rank: () => 'genus'}, C.typeNormAll), '');
  // a subject whose UNITS has no vern (the fish keep their own names): nothing
  ctx.set(F, 'f');
  assert.deepStrictEqual([...ctx.M.vernOf('s1')], []);
  assert.strictEqual(ctx.M.vernFirst('f:A'), '');
});

test('the choices stay scientific names: the quiz and the Learn page read the English names after the answer or as information only', () => {
  const Q = fs.readFileSync(path.join(ROOT, 'quiz.js'), 'utf8'),
    fb = block(Q, 'function fbBody(', '\n}\n', {file: 'quiz.js', through: 1});
  assert.match(fb, /vernFirst\(target\)/, 'the verdict, after the answer, names the unit with its English name');
  // vernFirst is read nowhere else in the quiz (never in a choice, a card or a question before the answer)
  assert.strictEqual(Q.split('vernFirst(').length - 1, 1);
});

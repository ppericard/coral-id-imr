// The subject registry (core.js SUBJECTS, the taxon model: corals and fish on one engine) and the fish adapter
// (fishGen, fishTypeNames) on the real fish.json and fish-photos.json; each subject's progress kept apart when two
// accounts merge (mergeUsers).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const F = read('fish.json'),
  PH = read('fish-photos.json');

test('registry: one id per subject, keys reefid-sync-<id>-<name>, device keys unchanged for the corals', () => {
  const ids = C.SUBJECTS.map(s => s.id);
  assert.deepStrictEqual(ids, ['coral', 'fish']);
  assert.strictEqual(C.subjectOf('fish').id, 'fish');
  assert.strictEqual(C.subjectOf('nope'), C.SUBJECTS[0]); // an unknown choice falls back on the first subject
  // the report dialog's "Several …" reason in each subject's words (sync.js REP_WHY)
  assert.strictEqual(C.subjectOf('coral').several, 'corals');
  assert.strictEqual(C.subjectOf('fish').several, 'fish species');
  assert.strictEqual(C.subjKey('coral', 'progress'), 'reefid-sync-coral-progress');
  assert.strictEqual(C.subjKey('fish', 'progress'), 'reefid-sync-fish-progress');
  assert.strictEqual(C.subjKey('coral', 'intro-offer'), 'reefid-sync-coral-intro-offer');
  assert.strictEqual(C.subjDev('coral', 'hold'), 'reefid-hold'); // as before subjects
  assert.strictEqual(C.subjDev('fish', 'comeback'), 'reefid-fish-comeback');
  assert.ok(C.SUBJECT_KEY.startsWith(C.KEYS.SYNC), 'the choice travels with the player');
  C.SUBJECTS.forEach(s => {
    ['id', 'dev', 'name', 'one', 'many', 'what', 'several', 'lecture'].forEach(k =>
      assert.strictEqual(typeof s[k], 'string', `${s.id}.${k}`)
    );
    assert.ok(Array.isArray(s.views) && s.views.length, s.id);
    assert.ok(Array.isArray(s.optin) && Array.isArray(s.pages) && s.pages.includes('quiz'), s.id);
    assert.ok(Array.isArray(s.progress) && s.progress.length, s.id);
    assert.strictEqual(s.base.length, 2, s.id);
    // Its icon in the switches, the app's and the admin's: SVG elements only, no wrapper (the 24 px viewBox is theirs).
    assert.match(s.icon, /^<(path|circle) [^<>]*\/>(<(path|circle) [^<>]*\/>)*$/, `${s.id}.icon`);
  });
  assert.strictEqual(new Set(C.SUBJECTS.map(s => s.icon)).size, C.SUBJECTS.length);
  // Distinct keys and sign-in record fields: no subject can overwrite another's.
  assert.strictEqual(new Set(C.SUBJECTS.flatMap(s => s.base)).size, 2 * C.SUBJECTS.length);
  assert.strictEqual(new Set(C.SUBJECTS.map(s => s.dev)).size, C.SUBJECTS.length);
  // A leaderboard per subject (Pierre, 2026-11-04: separate per subject, no merged ranking; sheet v95); achievements
  // per subject too (Pierre, 2026-11-04), each its own list in the one record.
  assert.ok(
    C.SUBJECTS.every(s => s.board === true),
    'every subject has its leaderboard'
  );
  assert.ok(
    C.SUBJECTS.every(s => s.ach === true && typeof s.achs === 'function'),
    'every subject has its achievements'
  );
  assert.strictEqual(C.SUBJECTS.filter(s => s.achFeats).length, 1, "one subject's answers keep the record's feats");
});

// The admin's one filter bar (admin plan PR 3, admin.js FB) is filled from each subject's admin part: its photo origins
// ([key, name, short name], keys among those admin.js origin(p) gives) and its Candidates sources (among its origins).
test('admin descriptor: origins and Candidates sources for the one filter bar', () => {
  const KEYS = ['imr', 'own', 'dauin', 'ph', 'world'];
  C.SUBJECTS.forEach(s => {
    const O = s.admin.origins;
    assert.ok(Array.isArray(O) && O.length, s.id);
    O.forEach(o => {
      assert.strictEqual(o.length, 3, `${s.id} ${o}`);
      assert.ok(KEYS.includes(o[0]), `${s.id}: unknown origin ${o[0]}`);
      o.forEach(x => assert.ok(typeof x === 'string' && x, `${s.id} ${o}`));
    });
    assert.strictEqual(new Set(O.map(o => o[0])).size, O.length, s.id);
    (s.admin.csrc || []).forEach(k =>
      assert.ok(
        O.some(o => o[0] === k),
        `${s.id}: source ${k} is not one of its origins`
      )
    );
  });
  // The corals' chips and sources, as before the bar (their order is the order on screen).
  const coral = C.subjectOf('coral').admin;
  assert.deepStrictEqual(
    coral.origins.map(o => o[0]),
    KEYS
  );
  assert.deepStrictEqual(coral.csrc, ['own', 'dauin', 'ph']);
  // No IMR photos for fish (Pierre, 2026-11-04).
  assert.ok(!C.subjectOf('fish').admin.origins.some(o => o[0] === 'imr'));
});

test('opening (subjGroup): the beta label and who sees a subject are two fields; fish opens to all, its beta label kept (Q158)', () => {
  const fish = C.subjectOf('fish'),
    coral = C.subjectOf('coral');
  assert.ok(fish.beta && fish.beta.kick && fish.beta.line, 'fish keeps its beta label');
  assert.strictEqual(fish.open, 'all', 'fish opens to every player (Pierre, 2026-11-06, Q158)');
  assert.strictEqual(C.subjGroup(fish), false);
  assert.strictEqual(C.subjGroup({...fish, open: 'group'}), true, "'group': the admin and its group only");
  assert.strictEqual(C.subjGroup(coral), false, 'the corals open to all (no field)');
  assert.strictEqual(C.subjGroup({id: 'x', beta: {kick: 'k', line: 'l'}}), false, 'a beta label alone opens to all');
  assert.strictEqual(C.subjGroup(null), false);
  C.SUBJECTS.forEach(S => assert.ok(S.open === undefined || ['group', 'all'].includes(S.open), `${S.id}.open`));
});

test('fishGen: the book’s families as engine records, circle 1 = 28 families, winks apart', () => {
  const X = C.fishGen(F, PH.photos);
  assert.strictEqual(X.c1.length, 28);
  assert.deepStrictEqual(
    X.c1,
    F.families.filter(f => f.circle === 1 && !f.wink).map(f => f.id)
  );
  assert.ok(X.c2.length >= 1 && X.c3.length >= 10);
  assert.deepStrictEqual(
    X.winks.sort(),
    F.families
      .filter(f => f.wink)
      .map(f => f.id)
      .sort()
  );
  [...X.c1, ...X.c2, ...X.c3].forEach(n => assert.ok(!X.gen[n].wink, n));
  Object.values(X.gen).forEach(g => {
    assert.ok(g.name && g.fam && Array.isArray(g.look) && Array.isArray(g.forms), g.id);
    g.look.forEach(o => assert.ok(X.gen[o] && o !== g.id, `${g.id} look ${o}`));
    assert.ok(Array.isArray(g.views.wide), g.id);
    g.views.wide.forEach(p => assert.ok(p.f && p.src && p.r === 1 && p.o, g.id));
    // every game photo shows a species of its family (Diploprion's photos are the Soapfishes', not the Groupers')
    const own = new Set(F.families.find(f => f.id === g.id).species);
    g.views.wide.forEach(p => assert.ok(own.has(p.sp), `${g.id}: ${p.f} ${p.sp}`));
  });
  // The group in the identification key in force plays the part of the coral growth forms (easy wrong choices first);
  assert.deepStrictEqual(X.gen['f:Damselfishes'].forms, ['g3']);
  assert.deepStrictEqual(X.gen['f:Frogfishes'].forms, ['g16']);
  assert.strictEqual(X.key.short, F.key.short);
  assert.deepStrictEqual(
    X.groups.map(g => g.n),
    Array.from({length: 20}, (_, i) => i + 1)
  );
  // The line under the name: the scientific names, then IMR's name (the IMR tag).
  assert.strictEqual(X.gen['f:Damselfishes'].fam, 'Pomacentridae · IMR: Damselfish');
  assert.strictEqual(X.gen['f:Lizardfishes'].fam, 'Synodontidae, Harpadontidae · IMR: Lizardfish');
  assert.strictEqual(X.gen['f:Soapfishes'].fam, 'Grammistidae, Diploprioninae · IMR course: with the Groupers'); // the book's one family (Q248)
  assert.strictEqual(X.gen['f:Soapfishes'].imrName, '');
  assert.strictEqual(X.gen['f:Groupers'].imrName, 'Groupers');
  assert.deepStrictEqual(X.gen['f:Damselfishes'].sub, ['Dascyllus', 'Pomacentrus', 'Chromis', 'Anemonefish']);
  // The starter core: the same four, now families.
  assert.deepStrictEqual(
    Object.values(X.gen)
      .filter(g => g.first)
      .map(g => g.id)
      .sort(),
    ['f:Angelfishes', 'f:Butterflyfishes', 'f:Damselfishes', 'f:Surgeonfishes']
  );
  assert.ok(X.gen['f:Butterflyfishes'].look.includes('f:Angelfishes'), 'IMR’s look-alikes as families');
  // Each look-alike line's source is the family's own (fish.json lsrc: Pierre's declared groups, #662), else IMR's slides.
  assert.strictEqual(X.gen['f:Butterflyfishes'].lsrc['f:Angelfishes'], 'IMR fish presentation, slide 10 and Pierre, 2026-11-06');
  const noSrc = F.families.find(t => !t.lsrc && (t.look || []).length);
  if (noSrc) assert.match(X.gen[noSrc.id].lsrc[noSrc.look[0][0]], /^IMR fish presentation/);
});

test('fish-photos.json: the stopgap list, remote iNaturalist photos, one per observation (Pierre’s own: every compatible photo), accepted licences', () => {
  const ok = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa']);
  assert.ok(PH.stopgap, 'says it is a stopgap');
  Object.entries(PH.photos).forEach(([id, L]) => {
    assert.ok(
      F.teach.some(t => t.id === id && t.level === 1),
      id
    ); // listed by old entry id; fishGen gives each photo to its species' family
    // One photo per observation, Pierre's own aside: every compatible photo of his observations is in (Q148, 2026-11-06).
    const obs = L.filter(p => !p.own).map(p => p.o),
      fs = L.map(p => p.f);
    assert.strictEqual(new Set(obs).size, obs.length, `${id}: one photo per observation`);
    assert.strictEqual(new Set(fs).size, fs.length, `${id}: each photo once`);
    L.forEach(p => {
      // FishBase's own photos (tools/fish_refs.py; Pierre, 2026-11-06: in automatically when the licence allows) come
      // from its www.fishbase.se mirror.
      if (p.via === 'fishbase') assert.match(p.src, /^https:\/\/www\.fishbase\.se\/images\/species\/[^/]+$/, p.f);
      else
        assert.match(
          p.src,
          /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\/\d+\/original\./,
          p.f
        );
      assert.ok(p.own || ok.has(p.lic), `${p.f} licence ${p.lic}`); // Pierre's own whatever their licence (rule S2)
      // A species that leaves the game (e.g. circle 3 needs "confirmed near Dauin", 2026-11-03) leaves these photos too.
      const s = F.species.find(x => x.id === p.sp);
      assert.ok(s && !s.out && s.circle, `${p.f}: ${p.t} (${p.sp}) is not in the game`);
    });
  });
  const X = C.fishGen(F, PH.photos);
  X.c1.forEach(n => assert.ok(X.gen[n].views.wide.length, `${n} has photos`));
});

test('typed fish names: the IMR name, its parts, the family names, the sub-entries', () => {
  const X = C.fishGen(F, PH.photos),
    N = C.fishTypeNames(X.gen),
    m = t => C.typeMatchIn(N, t, C.typeNormAll);
  assert.strictEqual(m('Damselfishes').g, 'f:Damselfishes');
  assert.ok(m('Damselfishes').exact);
  const imr = m('Damselfish'); // IMR's name (the IMR tag), or a spelling of the book's
  assert.strictEqual(imr.g, 'f:Damselfishes');
  assert.strictEqual(m('damsel fishes').g, 'f:Damselfishes'); // spelling tolerance on the whole name
  assert.strictEqual(m('Moorish idol').g, 'f:MoorishIdol');
  assert.strictEqual(m('Unicornfish').g, 'f:Surgeonfishes'); // a part of IMR's "Surgeonfish & Unicornfish"
  const fam = m('Pomacentridae');
  assert.strictEqual(fam.g, 'f:Damselfishes');
  assert.strictEqual(fam.alt, 1);
  assert.strictEqual(m('Chromis').g, 'f:Damselfishes'); // a name IMR uses inside the Damselfishes: finer, still right
  assert.strictEqual(m('Anemonefish').g, 'f:Damselfishes');
  assert.strictEqual(m('Bannerfish').g, 'f:Butterflyfishes');
  assert.strictEqual(m('Epinephelidae').g, 'f:Groupers'); // the scientific name of the Groupers
  assert.strictEqual(m('Soapfishes').g, 'f:Soapfishes');
  assert.strictEqual(m('Bream').g, 'f:CoralBreams'); // IMR's name of the Coral Breams
  assert.strictEqual(m('Acropora'), null);
  // The genus reading is unchanged: the first word only, no alt field.
  assert.deepStrictEqual(C.typeMatchIn([{k: 'acropora', g: 'Acropora', old: ''}], 'Acropora sp.'), {g: 'Acropora', old: '', exact: true});
});

test('typed fish names: "fish" optional (suffix, word, plural) when unambiguous, the curated other names (aka)', () => {
  const S = C.subjectOf('fish'),
    X = C.fishGen(F, PH.photos),
    N = C.fishTypeNames(X.gen, S.typeDrop),
    m = t => C.typeMatchIn(N, t, C.typeNormAll);
  assert.strictEqual(S.typeDrop, 'fish');
  assert.strictEqual(C.subjectOf('coral').typeDrop, undefined);
  // the fish beta QA's refusals (2026-11-06) and Pierre's examples: all read as the entry, exactly (no spelling step)
  [
    ['clownfish', 'f:Damselfishes'], // aka of the Anemonefish sub-entry
    ['clown', 'f:Damselfishes'],
    ['damsel', 'f:Damselfishes'],
    ['damsels', 'f:Damselfishes'],
    ['damsel fish', 'f:Damselfishes'],
    ['trigger', 'f:Triggerfishes'],
    ['trigger fish', 'f:Triggerfishes'],
    ['triggerfishes', 'f:Triggerfishes'],
    ['triggers', 'f:Triggerfishes'],
    ['frogfish', 'f:Frogfishes'], // the singular of Frogfishes
    ['butterfly', 'f:Butterflyfishes'],
    ['unicorn', 'f:Surgeonfishes'],
    ['tang', 'f:Surgeonfishes'],
    ['cowfish', 'f:Boxfishes'],
    ['moray eel', 'f:Morays']
  ].forEach(([t, g]) => assert.deepStrictEqual([t, m(t).g, m(t).exact], [t, g, true]));
  assert.strictEqual(m('Chaetodontidae').g, 'f:Butterflyfishes'); // as before
  // a name in common use (often): right, and carries the usual name for the gentle correction (Pierre, 2026-11-06, Q164)
  ['clownfish', 'clown', 'clown fish', 'clowns', 'clownfishes'].forEach(t =>
    assert.deepStrictEqual([t, m(t).oft], [t, ['Anemonefish', 'Clownfish']])
  );
  assert.strictEqual(m('clownfsh').oft[0], 'Anemonefish'); // a typo of it too (the spelling step comes first)
  ['anemonefish', 'damsel', 'tang', 'Pomacentridae'].forEach(t => assert.strictEqual(m(t).oft, undefined, t));
  assert.deepStrictEqual(X.gen['f:Damselfishes'].oft, [['Anemonefish', 'Clownfish']]);
  // ambiguous: "fish" alone names nothing
  assert.strictEqual(m('fish'), null);
  // Filefishes is the book's own name of a family now (units plan PR 4): read exactly, no longer asked again.
  assert.strictEqual(m('filefishes').g, 'f:Filefishes');
  // a short form within the tolerance of another entry's name or short form is left out (no answer, as before)
  const G = {a: {id: 'a', names: ['Ratfish']}, b: {id: 'b', names: ['Batfish']}, c: {id: 'c', names: ['Goatfish']}},
    M = C.fishTypeNames(G, 'fish'),
    g = t => C.typeMatchIn(M, t, C.typeNormAll);
  assert.strictEqual(g('rat'), null);
  assert.strictEqual(g('bat'), null);
  assert.strictEqual(g('goat').g, 'c');
  assert.strictEqual(g('rat fish').g, 'a');
  // without the word to drop (the corals, or an older call), only the names themselves
  assert.strictEqual(C.typeMatchIn(C.fishTypeNames(X.gen), 'trigger', C.typeNormAll), null);
});

// The three plain fixes of the names study (Pierre, 2026-11-09): a name and its other number are one name; a name typed
// exactly is never read as a slip of another (the name index, fishNameIndex); a name several
// families share (a family the book splits) is all of them, never "which one? check the spelling" (Q319).
test('typed fish names: singular and plural are one name, a known name is never a slip of another, a shared one is all of them', () => {
  const S = C.subjectOf('fish'),
    X = C.fishGen(F, PH.photos),
    N = C.fishTypeNames(X.gen, S.typeDrop, C.fishNameIndex(F)),
    m = t => C.typeMatchIn(N, t, C.typeNormAll);
  // the singulars of the book's labels, read exactly as the family (no spelling step, no "which one?")
  [
    ['seahorse', 'f:Seahorses'],
    ['moray', 'f:Morays'],
    ['grouper', 'f:Groupers'],
    ['blenny', 'f:Blennies'],
    ['convict blenny', 'f:ConvictBlennies'],
    ['pipefish', 'f:Pipefishes'],
    ['jawfish', 'f:Jawfishes'],
    ['soapfish', 'f:Soapfishes'],
    ['sweetlip', 'f:Sweetlips'],
    ['hawkfish', 'f:Hawkfishes'],
    ['wrasses', 'f:Wrasses'], // and the plural of IMR's singular
    ['snappers', 'f:Snappers']
  ].forEach(([t, g]) => assert.deepStrictEqual([t, m(t).g, m(t).exact, C.typeVerdict(m(t), g)], [t, g, true, 'exact']));
  assert.strictEqual(m('grouper').alt, undefined); // the family's own name in the other number: no "read as" line
  // goby: the Gobies' singular, and a word two of the three dartfishes carry: both (Q319)
  assert.deepStrictEqual([...m('goby').shared].sort(), ['f:Dartfishes', 'f:Gobies']);
  assert.deepStrictEqual(m('goby').by['f:Dartfishes'], {
    vr: 'k',
    n: 2,
    of: 3,
    sc: F.vn.find(([x]) => x === 'goby')[1].find(([f]) => f === 'f:Dartfishes')[4]
  });
  // never another family by the spelling tolerance (anglerfish, tuskfish, firefish, goldie were the Angelfishes, the
  // Boxfishes, the Filefishes, the Soldierfishes): a name of the family whose species carry it (the name index, Q320), or
  // a word known to be no family's (one species' only: tuskfish, goldie)
  [
    ['anglerfish', 'f:Frogfishes'],
    ['firefish', 'f:Lionfishes'],
    ['batfish', 'f:Spadefishes'],
    ['hogfish', 'f:Wrasses']
  ].forEach(([t, g]) => assert.deepStrictEqual([t, m(t).g, m(t).exact, C.typeVerdict(m(t), g)], [t, g, true, 'exact']));
  // tuskfish, goldie: one species' words, that species' family's names on a photo of it (Q333)
  assert.deepStrictEqual([m('tuskfish').g, m('tuskfish').sc.length, m('goldie').g], ['f:Wrasses', 1, 'f:Anthias']);
  assert.strictEqual(m('anglerfsh').g, 'f:Frogfishes'); // a slip of it: the spelling step, as everywhere
  assert.strictEqual(m('anglerfsh').exact, false);
  // "dart": the Dartfishes' own short form, and a jack's word ("Smallspotted dart"): both (Q319), each as the photo shows it (Q333)
  assert.deepStrictEqual([...m('dart').shared].sort(), ['f:Dartfishes', 'f:Jacks']);
  // the IMR entries' scientific families the book splits: typed exactly, all of their families (Q319), never one of
  // them by spelling (Holocentridae read as Holocentrinae, Syngnathidae as the Pipefishes only)
  [
    ['Holocentridae', ['f:Soldierfishes', 'f:Squirrelfishes']],
    ['Syngnathidae', ['f:Seahorses', 'f:Pipefishes']],
    ['Scorpaenidae', ['f:Lionfishes', 'f:Scorpionfishes']],
    ['Serranidae', ['f:Groupers', 'f:Soapfishes', 'f:Anthias']]
  ].forEach(([t, L]) => {
    assert.deepStrictEqual([t, [...m(t).shared].sort(), m(t).exact], [t, [...L].sort(), true]);
    L.forEach(g => assert.strictEqual(C.typeVerdict(m(t), g), 'exact', t + ' ' + g));
    assert.strictEqual(C.typeVerdict(m(t), 'f:Wrasses'), 'other', t);
  });
  assert.strictEqual(m('Haemulidae').g, 'f:Sweetlips'); // an IMR family name of one book family: that family
  // a slip between two names stays "which one?" (a spelling tie)
  assert.ok(m('pipefishes') && m('pipefishes').g === 'f:Pipefishes');
  assert.ok(m('pilefishes').near);
  // the name index: the species' listed names and scientific names, the genera's, the kind words (fish.json vn), each
  // with the family it lifts to and its role; a word of a "False ..." name is none
  const I = C.fishNameIndex(F),
    has = (x, g, vr) => I.some(e => e.x.toLowerCase() === x && e.g === g && e.vr === vr);
  assert.ok(has('peacock razorfish', 'f:Wrasses', 'sp'));
  assert.ok(has('iniistius pavo', 'f:Wrasses', 'ss'));
  assert.ok(has('iniistius', 'f:Wrasses', 'gs'));
  assert.ok(has('hogfishes', 'f:Wrasses', 'gc'));
  assert.ok(has('razorfish', 'f:Wrasses', 'k') && has('razorfish', 'f:Shrimpfishes', 'k'));
  assert.ok(I.some(e => e.x === 'tuskfish' && e.g === 'f:Wrasses' && e.sc.length === 1));
  assert.ok(
    !I.some(e => /^(puffer|moorish ?idol|stonefish)$/i.test(e.x) && e.vr === 'k' && e.g !== 'f:Puffers'),
    'no word of a False name'
  );
  assert.deepStrictEqual(C.typeForms('Gobies'), ['Goby']);
  assert.deepStrictEqual(C.typeForms('Grouper'), ['Groupers']);
  assert.deepStrictEqual(C.typeForms('Pipefishes'), ['Pipefish']);
  assert.deepStrictEqual(C.typeForms('Seahorses & pipefishes'), ['Seahorses & pipefish']);
  assert.deepStrictEqual([C.typeForms('Anthias'), C.typeForms('Chromis'), C.typeForms('Pomacentridae')], [[], [], []]);
  // the corals' reading is unchanged: no known names, no other number
  assert.deepStrictEqual(C.typeMatchIn([{k: 'acropora', g: 'Acropora', old: ''}], 'acropra'), {g: 'Acropora', old: '', exact: false});
});

test('mergeUsers: each subject on its own, a subject neither account played stays out, fish opt-ins kept', () => {
  const coral = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 2, ko: 0, h: '11'}})};
  const only = C.mergeUsers(coral, {});
  assert.ok(!('reefid-sync-fish-progress' in only));
  const A = {
      ...coral,
      'reefid-sync-fish-progress': JSON.stringify({t01: {ok: 3, ko: 1, h: '1101'}}),
      'reefid-sync-fish-quiz': JSON.stringify({sci: true})
    },
    B = {'reefid-sync-fish-progress': JSON.stringify({t01: {ok: 1, ko: 0, h: '1'}, t02: {ok: 1, ko: 0, h: '1'}})},
    M = C.mergeUsers(A, B),
    f = JSON.parse(M['reefid-sync-fish-progress']),
    c = JSON.parse(M['reefid-sync-coral-progress']);
  assert.strictEqual(f.t01.ok, 4);
  assert.strictEqual(f.t02.ok, 1);
  assert.ok(!('Acropora' in f) && !('t01' in c), 'kept apart');
  assert.strictEqual(c.Acropora.ok, 2);
  assert.strictEqual(JSON.parse(M['reefid-sync-fish-quiz']).sci, true);
});

test('fish circles on the path (Pierre, 2026-11-06, Q175): no circle opt-in set, no ⚙ row, every circle in the slate', () => {
  const S = C.SUBJECTS.find(x => x.id === 'fish'),
    html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'),
    app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // beyond: circle 3 opened by choice (Pierre, 2026-11-07), offered by a card and My progress, never a ⚙ row.
  assert.deepStrictEqual(S.optin, ['sci', 'beyond']);
  assert.ok(!/data-optin="(c[23]|beyond)"/.test(html) && !/SVS video extras|Beyond IMR/.test(html), 'no circle row in ⚙');
  assert.ok(app.includes('slate: () => (FISH ? [...FISH.c1, ...FISH.c2, ...FISH.c3] : [])'), 'the fish slate holds every circle');
  // A stored c3 choice is no longer an opt-in: a merge does not force it on.
  const M = C.mergeUsers({'reefid-sync-fish-quiz': JSON.stringify({c3: true})}, {'reefid-sync-fish-quiz': JSON.stringify({c3: false})});
  assert.strictEqual(JSON.parse(M['reefid-sync-fish-quiz']).c3, false);
});

test('fishGen order and cover: the easiest, most reference-like photo first, whoever took it (Pierre, 2026-11-06)', () => {
  const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8')),
    PH = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish-photos.json'), 'utf8')).photos,
    X = C.fishGen(F, PH);
  let checked = 0;
  Object.values(X.gen).forEach(g => {
    const L = g.views.wide;
    if (!L.length) return;
    // The cover: the list's first, an open licence breaking ties (core.js easyCover, Q270); the list keeps no licence.
    assert.strictEqual(g.cover, C.easyCover(L).f, `${g.id}: the cover is the list's first, the licence breaking ties`);
    assert.strictEqual(C.easyRank(L, undefined, false)[0].f, L[0].f, `${g.id}: the list in easyRank order without licence`);
    L.slice(1).forEach((p, i) => {
      const a = L[i];
      // A very easy reference photo (rep) first (core.js refFirst, Pierre 2026-11-06), then the ease, then refScore.
      assert.ok(
        C.refFirst(a) < C.refFirst(p) ||
          (C.refFirst(a) === C.refFirst(p) &&
            ((a.e || 3) > (p.e || 3) || ((a.e || 3) === (p.e || 3) && C.refScore(a.jt) >= C.refScore(p.jt)))),
        `${g.id}: ${p.f} out of order`
      );
    });
    checked++;
  });
  assert.ok(checked > 27, `${checked} entries checked`);
  // Synthetic: another observer's photo at ease 5 beats Pierre's at 3; among equals, the reference photo, then the one
  // with more field-guide traits (profile, whole, good light...), then the list's order; the source never counts.
  const T = {families: [{id: 'f:X', name: 'X', sci: ['Xidae'], circle: 1, species: ['s1']}]},
    Y = C.fishGen(T, {
      t99: [
        {f: 'own3', src: 'x', sp: 's1', own: true, e: 3, jt: 'p1g0sl1'},
        {f: 'own5', src: 'x', sp: 's1', own: true, e: 5, jt: 'o1g1sm1'},
        {f: 'a5', src: 'x', sp: 's1', e: 5, jt: 'p1g0sl1'},
        {f: 'b5', src: 'x', sp: 's1', e: 5, jt: 'o1g0sm1r'},
        {f: 'none', src: 'x', sp: 's1'}
      ]
    });
  assert.deepStrictEqual(
    Y.gen['f:X'].views.wide.map(p => p.f),
    // a5 reads the reference look (core.js refLevel: ease 5, profile, whole, good light, true colours, sharp): first.
    ['a5', 'b5', 'own5', 'own3', 'none']
  );
  assert.strictEqual(Y.gen['f:X'].cover, 'a5');
  // Equal photos: the list's order (Pierre's first in tools/fish_photos.py) never decides; the same cover either way.
  const eq = [
      {f: 'fiA', src: 'x', sp: 's1', own: true, e: 5, jt: 'p1g0sl1'},
      {f: 'fiB', src: 'x', sp: 's1', e: 5, jt: 'p1g0sl1'}
    ],
    c1 = C.fishGen(T, {t99: eq}).gen['f:X'].cover,
    c2 = C.fishGen(T, {t99: eq.slice().reverse()}).gen['f:X'].cover;
  assert.strictEqual(c1, c2, 'the list order decides nothing');
  // Reference level first (core.js refLevel): a source's reference photo (rep) judged very easy comes before an ease-5
  // photo without the reference look; one under ease 4 does not; an ease-5 photo with the look is reference level
  // whoever took it (Pierre's own here).
  const R = C.fishGen(T, {
    t99: [
      {f: 'ownref', src: 'x', sp: 's1', own: true, e: 5, jt: 'p1g0sl1'},
      {f: 'own5', src: 'x', sp: 's1', own: true, e: 5, jt: 'o1g1sm1'},
      {f: 'rep3', src: 'x', sp: 's1', e: 3, jt: 'p1g0sl1r', rep: 'inaturalist'},
      {f: 'rep4', src: 'x', sp: 's1', e: 4, jt: 'o1g0sm1r', rep: 'inaturalist'}
    ]
  });
  assert.deepStrictEqual(
    R.gen['f:X'].views.wide.map(p => p.f),
    ['ownref', 'rep4', 'own5', 'rep3']
  );
  // Pierre's photo comes first when it is itself the easiest.
  const Z = C.fishGen(T, {
    t99: [
      {f: 'a', src: 'x', sp: 's1', e: 4},
      {f: 'own', src: 'x', sp: 's1', own: true, e: 5}
    ]
  });
  assert.strictEqual(Z.gen['f:X'].cover, 'own');
});

test("easyRank: a difficulty function (the players' ratings) ranks first; refScore reads the tags", () => {
  const L = [
    {f: 'a', e: 5},
    {f: 'b', e: 3},
    {f: 'c', e: 4}
  ];
  assert.deepStrictEqual(
    C.easyRank(L).map(p => p.f),
    ['a', 'c', 'b']
  );
  const rated = {a: 0.8, b: -1, c: 0};
  assert.deepStrictEqual(
    C.easyRank(L, p => rated[p.f]).map(p => p.f),
    ['b', 'c', 'a']
  );
  assert.strictEqual(C.refScore('p1g0sl1'), 7);
  assert.strictEqual(C.refScore('p1g0sl1r'), 15);
  assert.strictEqual(C.refScore('o1g2mm1j'), 2);
  assert.strictEqual(C.refScore(''), 0);
  assert.strictEqual(C.refScore(undefined), 0);
  // The subjects whose photo sources rank (rule P1): the corals only.
  assert.deepStrictEqual(
    C.SUBJECTS.filter(s => s.tiers).map(s => s.id),
    ['coral']
  );
});

// Sheet-only fish photos (Pierre, 2026-11-05: a species with no game photo may keep one for its sheet, never in the
// quiz or any game; tools/fish_photos.py SHEET, fish-photos.json "sheet"). Every game draw reads an entry's
// views.wide (model.js photoSet; app.js fishGenera builds the genus units from it), so a photo marked use: 'ref' never
// reaching views.wide is what keeps it out of every game.
test('sheet-only fish photos: never in an entry’s game photos nor its cover, listed by species in fishGen sheet', () => {
  const T = {families: [{id: 'f:X', name: 'X', sci: ['Xidae'], circle: 1, species: ['s1', 's2']}]},
    ref = {f: 'fiR', src: 'x', sp: 's2', use: 'ref', e: 5},
    Y = C.fishGen(T, {t99: [{f: 'fiA', src: 'x', sp: 's1', e: 2}, ref]}, {s3: [{f: 'fiS', src: 'x', sp: 's3'}]});
  assert.deepStrictEqual(
    Y.gen['f:X'].views.wide.map(p => p.f),
    ['fiA'],
    'a sheet-only photo listed among the game photos stays out'
  );
  assert.strictEqual(Y.gen['f:X'].cover, 'fiA', 'never the cover, even the easiest');
  assert.deepStrictEqual(Object.keys(Y.sheet).sort(), ['s2', 's3']);
  assert.ok(
    Object.values(Y.sheet)
      .flat()
      .every(p => p.use === 'ref'),
    'marked sheet only'
  );
  // An entry whose only photo is sheet-only has no game photo (so no question: no photo, no question).
  const Z = C.fishGen(T, {t99: [ref]});
  assert.strictEqual(Z.gen['f:X'].views.wide.length, 0);
  assert.deepStrictEqual(C.fishGen(T, {t99: []}).sheet, {});
});

test('fish-photos.json sheet: the game photo rules, credited, never among the game photos', () => {
  const SP = new Map(F.species.map(s => [s.id, s])),
    S = PH.sheet || {},
    ok = new Set(['cc0', 'cc-by', 'cc-by-nc']), // Pierre, 2026-11-05: never share-alike, ND or all rights reserved
    game = new Set(Object.values(PH.photos).flatMap(L => L.map(p => p.f)));
  // Pomacentrus armillatus: the cover of P. opisthostigma, which passes every game photo rule. The covers of Chromis
  // agilis (the Maldives), Siganus margaritiferus (Needs ID) and a photo of Halichoeres marginatus (the Red Sea) failed
  // them: Pierre, 2026-11-05, "if they don't pass the game rules, we don't keep them".
  assert.ok((S.s105 || []).length, 's105 has its sheet photo');
  ['fi421637283', 'fi542118088', 'fi11896335'].forEach(f =>
    assert.ok(!Object.values(S).some(L => L.some(p => p.f === f)), `${f} failed the game photo rules`)
  );
  Object.entries(S).forEach(([id, L]) => {
    const s = SP.get(id);
    assert.ok(s && s.circle, `${id}: a species in the game`);
    L.forEach(p => {
      assert.strictEqual(p.use, 'ref', `${p.f}: sheet only`);
      assert.strictEqual(p.sp, id);
      assert.ok(p.own || ok.has(p.lic), `${p.f} licence ${p.lic}`);
      assert.ok(p.a && /^\(c\)/.test(p.a), `${p.f}: the observer's credit`);
      assert.ok(!game.has(p.f), `${p.f} is also a game photo`);
      // iNaturalist, or FishBase (tools/fetch_fishbase.py, Pierre 2026-11-05: the same rules; tests/fishbase.test.js).
      if (p.via === 'fishbase') {
        assert.match(p.o, /^https:\/\/www\.fishbase\.se\/photos\/PicturesSummary\.php\?ID=\d+&what=species&pic=[\w-]+\.jpg$/);
        assert.match(p.src, /^https:\/\/www\.fishbase\.se\/images\/species\/[\w-]+\.jpg$/);
        assert.match(p.a, /via FishBase/);
        return;
      }
      assert.match(p.o, /^https:\/\/www\.inaturalist\.org\/(observations|photos)\/\d+$/);
      assert.match(p.src, /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\/\d+\/original\./);
    });
  });
  // Pomacentrus armillatus: the photo is filed under P. opisthostigma on iNaturalist; the name shown stays the PDF's (rule S2).
  assert.strictEqual(SP.get('s105').name, 'Pomacentrus armillatus');
  assert.match(S.s105[0].note, /Pomacentrus opisthostigma/);
  const X = C.fishGen(F, PH.photos, PH.sheet);
  assert.deepStrictEqual(Object.keys(X.sheet).sort(), Object.keys(S).sort());
  Object.values(X.gen).forEach(g => assert.ok(!g.views.wide.some(p => p.use === 'ref' || !!S[p.sp]?.some(q => q.f === p.f)), g.id));
});

// Every subject's answers logged (Pierre, 2026-11-06; sheet v60): each subject says its rank and whether the sheet replays
// it; the answer log's readers keep one subject's rows (subjRows, index LOG_SUBJ in readAnswers rows and tab rows alike).
test('answer log by subject: replay, rank, ansSubject, subjRows, subjEntries, logOk', () => {
  assert.deepStrictEqual(
    C.SUBJECTS.map(S => [S.id, S.rank, S.replay]),
    [
      ['coral', 'genus', true],
      ['fish', 'family', false]
    ]
  );
  assert.ok(
    C.SUBJECTS.every(S => !('log' in S)),
    'the old log field is gone (renamed replay)'
  );
  assert.strictEqual(C.replaySubject(), 'coral');
  assert.strictEqual(C.LOG_SUBJ, 17); // after v59's Typed and Retyped right (15-16)
  assert.strictEqual(C.ansSubject({}), 'coral', 'an entry from before the subject field is a coral one');
  assert.strictEqual(C.ansSubject({s: 'fish'}), 'fish');
  const row = (id, s) => Object.assign(Array(17).fill(''), {0: id}).concat(s === undefined ? [] : [s]);
  const rows = [row('a'), row('b', ''), row('c', 'coral'), row('d', 'fish'), row('e', 'benthos')];
  assert.deepStrictEqual(
    C.subjRows(rows).map(r => r[0]),
    ['a', 'b', 'c']
  );
  assert.deepStrictEqual(
    C.subjRows(rows, 'fish').map(r => r[0]),
    ['d']
  );
  assert.deepStrictEqual(C.subjRows(null), []);
  // A tab export's header row is never a coral row.
  assert.deepStrictEqual(C.subjRows([Object.assign(Array(17).fill('h'), {0: 'Name'}).concat(['Subject'])]), []);
  const log = [{id: 1}, {id: 2, s: 'fish'}, {id: 3, s: 'coral'}];
  assert.deepStrictEqual(
    C.subjEntries(log).map(a => a.id),
    [1, 3]
  );
  assert.deepStrictEqual(
    C.subjEntries(log, 'fish').map(a => a.id),
    [2]
  );
  // A fish answer waits for the script that files it under its subject (rule D4); a coral one never waits.
  assert.strictEqual(C.logOk({s: 'fish'}, C.LOG_SHEET - 1), false);
  assert.strictEqual(C.logOk({s: 'fish'}, C.LOG_SHEET), true);
  assert.strictEqual(C.logOk({s: 'fish'}, undefined), false);
  assert.strictEqual(C.logOk({}, 0), true);
  assert.strictEqual(C.logOk({s: 'coral'}, 0), true);
});

// One engine, a calibration per subject (Pierre, 2026-11-06 14:18; SUBJECTS calib): the corals keep the defaults (no
// draw bonus, the measured ease spread), fish favour reference-level photos in the draw.
test('calibOf: the corals keep the defaults, fish set their own', () => {
  assert.deepStrictEqual(C.calibOf(C.subjectOf('coral')), C.CALIB);
  assert.deepStrictEqual(C.CALIB, {ease: 0.5, ref: 1, early: 0, pool: Infinity});
  // Q186 (Pierre, 2026-11-06 15:33): the fish draw in big pools (tests/drawcalib.test.js).
  assert.strictEqual(C.calibOf(C.subjectOf('fish')).u, 0.25);
  assert.strictEqual(C.calibOf(C.subjectOf('fish')).pool, 30);
  assert.strictEqual(C.calibOf(C.subjectOf('fish')).ref, 3);
  assert.strictEqual(C.calibOf(C.subjectOf('fish')).early, 1.5);
  assert.strictEqual(C.calibOf(C.subjectOf('fish')).ease, 0.5);
  assert.ok(!C.refLevel({f: 'x'}) && !C.refLevel({f: 'x', q: 3}), 'a photo with no judged ease is never reference level');
  assert.ok(!C.refLevel({f: 'x', e: 5, jt: 'p1g0slm', rep: 'inaturalist'}), 'never one with other kinds of fish (rule P3)');
  assert.ok(C.refLevel({f: 'x', e: 4, jt: 'o1g0sms', rep: 'inaturalist'}) && C.refLevel({f: 'x', e: 5, jt: 'p1g0sl1'}));
});

test('circle 3 by choice (Pierre, 2026-11-07 08:50; Q204): openState, the card once and once more after OPEN_AGAIN answers', () => {
  const st = (q, o) => C.openState(q, 'beyond', o),
    due = {due: true, left: true, at: 500};
  // Under the threshold: nothing, closed.
  assert.deepStrictEqual(st({}, {due: false, left: true, at: 500}), {on: false, row: false, ask: false});
  // At the threshold, never asked: the card, and My progress's button.
  assert.deepStrictEqual(st({}, due), {on: false, row: true, ask: true});
  // Open them: on, nothing offered.
  assert.deepStrictEqual(st({beyond: true}, due), {on: true, row: false, ask: false});
  // Not now: closed, the button stays, the card waits OPEN_AGAIN answers, then once more, then never.
  assert.strictEqual(C.OPEN_AGAIN, 200);
  const no1 = {beyond: false, beyondN: 1, beyondA: 500};
  assert.deepStrictEqual(st(no1, due), {on: false, row: true, ask: false});
  assert.strictEqual(st(no1, {...due, at: 699}).ask, false);
  assert.strictEqual(st(no1, {...due, at: 700}).ask, true);
  assert.deepStrictEqual(st({beyond: false, beyondN: 2, beyondA: 700}, {...due, at: 5000}), {on: false, row: true, ask: false});
  // A "no" synced without its count counts as one.
  assert.strictEqual(st({beyond: false}, {...due, at: 5000}).ask, true);
  // Never asked, a unit already open (circle 3 opened by itself before the choice existed): on, no card.
  assert.deepStrictEqual(st({}, {...due, met: true}), {on: true, row: false, ask: false});
  // ...but a "Not now" stays a "Not now".
  assert.strictEqual(st({beyond: false, beyondN: 1, beyondA: 0}, {...due, met: true}).on, false);
  // Every unit open already: no card, no button.
  assert.deepStrictEqual(st({}, {...due, left: false}), {on: false, row: false, ask: false});
  // Two accounts merged: on if either said yes; the larger "Not now" count.
  const q = (a, b) =>
    JSON.parse(
      C.mergeUsers({'reefid-sync-fish-quiz': JSON.stringify(a)}, {'reefid-sync-fish-quiz': JSON.stringify(b)})['reefid-sync-fish-quiz']
    );
  assert.strictEqual(q({beyond: true}, {beyond: false, beyondN: 1}).beyond, true);
  assert.strictEqual(q({beyond: false, beyondN: 2}, {beyond: false, beyondN: 1}).beyondN, 2);
});

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
  assert.strictEqual(C.subjKey('coral', 'progress'), 'reefid-sync-coral-progress');
  assert.strictEqual(C.subjKey('fish', 'progress'), 'reefid-sync-fish-progress');
  assert.strictEqual(C.subjKey('coral', 'intro-offer'), 'reefid-sync-coral-intro-offer');
  assert.strictEqual(C.subjDev('coral', 'hold'), 'reefid-hold'); // as before subjects
  assert.strictEqual(C.subjDev('fish', 'comeback'), 'reefid-fish-comeback');
  assert.ok(C.SUBJECT_KEY.startsWith(C.KEYS.SYNC), 'the choice travels with the player');
  C.SUBJECTS.forEach(s => {
    ['id', 'dev', 'name', 'one', 'many', 'what', 'lecture'].forEach(k => assert.strictEqual(typeof s[k], 'string', `${s.id}.${k}`));
    assert.ok(Array.isArray(s.views) && s.views.length, s.id);
    assert.ok(Array.isArray(s.optin) && Array.isArray(s.pages) && s.pages.includes('quiz'), s.id);
    assert.ok(Array.isArray(s.progress) && s.progress.length, s.id);
    assert.strictEqual(s.base.length, 2, s.id);
  });
  // Distinct keys and sign-in record fields: no subject can overwrite another's.
  assert.strictEqual(new Set(C.SUBJECTS.flatMap(s => s.base)).size, 2 * C.SUBJECTS.length);
  assert.strictEqual(new Set(C.SUBJECTS.map(s => s.dev)).size, C.SUBJECTS.length);
  // The leaderboard and the achievements count one subject.
  assert.strictEqual(C.SUBJECTS.filter(s => s.board).length, 1);
  assert.strictEqual(C.SUBJECTS.filter(s => s.ach).length, 1);
});

test('opening (subjGroup): the beta label and who sees a subject are two fields; fish opens to its group for now', () => {
  const fish = C.subjectOf('fish'),
    coral = C.subjectOf('coral');
  assert.ok(fish.beta && fish.beta.kick && fish.beta.line, 'fish keeps its beta label');
  assert.strictEqual(fish.open, 'group', 'fish opens to the admin and its group (no change for players)');
  assert.strictEqual(C.subjGroup(fish), true);
  assert.strictEqual(C.subjGroup(coral), false, 'the corals open to all (no field)');
  assert.strictEqual(C.subjGroup({...fish, open: 'all'}), false, "'all': no group, the beta label kept");
  assert.strictEqual(C.subjGroup({id: 'x', beta: {kick: 'k', line: 'l'}}), false, 'a beta label alone opens to all');
  assert.strictEqual(C.subjGroup(null), false);
  C.SUBJECTS.forEach(S => assert.ok(S.open === undefined || ['group', 'all'].includes(S.open), `${S.id}.open`));
});

test('fishGen: level-1 entries as engine records, circle 1 = the 27 IMR entries, winks apart', () => {
  const X = C.fishGen(F, PH.photos);
  assert.strictEqual(X.c1.length, 27);
  assert.deepStrictEqual(
    X.c1,
    F.teach.filter(t => t.level === 1 && t.circle === 1).map(t => t.id)
  );
  assert.ok(X.c2.length >= 1 && X.c3.length >= 10);
  assert.deepStrictEqual(
    X.winks.sort(),
    F.teach
      .filter(t => t.wink)
      .map(t => t.id)
      .sort()
  );
  [...X.c1, ...X.c2, ...X.c3].forEach(n => assert.ok(!X.gen[n].wink, n));
  Object.values(X.gen).forEach(g => {
    assert.ok(g.name && g.fam && Array.isArray(g.look) && Array.isArray(g.forms), g.id);
    g.look.forEach(o => assert.ok(X.gen[o] && o !== g.id, `${g.id} look ${o}`)); // sub-entries folded into their entry
    assert.ok(Array.isArray(g.views.wide), g.id);
    g.views.wide.forEach(p => assert.ok(p.f && p.src && p.r === 1 && p.o, g.id));
  });
  // The group in the identification key in force plays the part of the coral growth forms (easy wrong choices first);
  assert.deepStrictEqual(X.gen.t01.forms, ['g3']);
  assert.deepStrictEqual(X.gen.t47.forms, ['g16']);
  assert.strictEqual(X.key.short, F.key.short);
  assert.deepStrictEqual(
    X.groups.map(g => g.n),
    Array.from({length: 20}, (_, i) => i + 1)
  );
  assert.ok(X.gen.t05.look.includes('t02'), 'Moorish Idol vs Bannerfish (inside Butterflyfish)');
});

test('fish-photos.json: the stopgap list, remote iNaturalist photos, one per observation, accepted licences', () => {
  const ok = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa']);
  assert.ok(PH.stopgap, 'says it is a stopgap');
  Object.entries(PH.photos).forEach(([id, L]) => {
    assert.ok(
      F.teach.some(t => t.id === id && t.level === 1),
      id
    );
    const obs = L.map(p => p.o);
    assert.strictEqual(new Set(obs).size, obs.length, `${id}: one photo per observation`);
    L.forEach(p => {
      assert.match(p.src, /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\/\d+\/original\./, p.f);
      assert.ok(p.own || ok.has(p.lic), `${p.f} licence ${p.lic}`); // Pierre's own whatever their licence (rule S2)
      const s = F.species.find(x => x.id === p.sp);
      assert.ok(s && !s.out, `${p.f}: a species in the game`);
    });
  });
  C.fishGen(F, PH.photos).c1.forEach(n => assert.ok((PH.photos[n] || []).length, `${n} has photos`));
});

test('typed fish names: the IMR name, its parts, the family names, the sub-entries; a shared family is "which one?"', () => {
  const X = C.fishGen(F, PH.photos),
    N = C.fishTypeNames(X.gen),
    m = t => C.typeMatchIn(N, t, C.typeNormAll);
  assert.strictEqual(m('Damselfish').g, 't01');
  assert.ok(m('Damselfish').exact);
  assert.strictEqual(m('damsel fishes').g, 't01'); // spelling tolerance on the whole name
  assert.strictEqual(m('Moorish idol').g, 't05');
  assert.strictEqual(m('Unicornfish').g, 't06'); // a part of "Surgeonfish & Unicornfish"
  const fam = m('Pomacentridae');
  assert.strictEqual(fam.g, 't01');
  assert.strictEqual(fam.alt, 1);
  assert.strictEqual(m('Chromis').g, 't01'); // a sub-entry IMR names inside Damselfish
  assert.strictEqual(m('Bannerfish').g, 't02');
  assert.strictEqual(m('Epinephelidae').g, 't13'); // the WoRMS family of Groupers
  assert.deepStrictEqual(m('Holocentridae').near.sort(), ['t23', 't25']); // Soldierfish and Squirrelfish
  assert.strictEqual(m('Acropora'), null);
  // The genus reading is unchanged: the first word only, no alt field.
  assert.deepStrictEqual(C.typeMatchIn([{k: 'acropora', g: 'Acropora', old: ''}], 'Acropora sp.'), {g: 'Acropora', old: '', exact: true});
});

test('mergeUsers: each subject on its own, a subject neither account played stays out, fish opt-ins kept', () => {
  const coral = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 2, ko: 0, h: '11'}})};
  const only = C.mergeUsers(coral, {});
  assert.ok(!('reefid-sync-fish-progress' in only));
  const A = {
      ...coral,
      'reefid-sync-fish-progress': JSON.stringify({t01: {ok: 3, ko: 1, h: '1101'}}),
      'reefid-sync-fish-quiz': JSON.stringify({c3: true})
    },
    B = {'reefid-sync-fish-progress': JSON.stringify({t01: {ok: 1, ko: 0, h: '1'}, t02: {ok: 1, ko: 0, h: '1'}})},
    M = C.mergeUsers(A, B),
    f = JSON.parse(M['reefid-sync-fish-progress']),
    c = JSON.parse(M['reefid-sync-coral-progress']);
  assert.strictEqual(f.t01.ok, 4);
  assert.strictEqual(f.t02.ok, 1);
  assert.ok(!('Acropora' in f) && !('t01' in c), 'kept apart');
  assert.strictEqual(c.Acropora.ok, 2);
  assert.strictEqual(JSON.parse(M['reefid-sync-fish-quiz']).c3, true);
});

test('fishGen cover: the easiest judged photo within the highest source tier (Pierre’s own first, rule P1)', () => {
  const F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8')),
    PH = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish-photos.json'), 'utf8')).photos,
    X = C.fishGen(F, PH);
  let checked = 0;
  Object.values(X.gen).forEach(g => {
    const L = g.views.wide;
    if (!L.some(p => p.e)) return;
    const c = L.find(p => p.f === g.cover),
      own = L.filter(p => p.own);
    if (own.length) {
      assert.ok(c.own, `${g.id}: the cover is another observer's while Pierre has ${own.length}`);
      assert.strictEqual(c.e || 0, Math.max(...own.map(p => p.e || 0)), `${g.id}: not the easiest of Pierre's`);
      checked++;
    } else assert.strictEqual(c.e || 0, Math.max(...L.map(p => p.e || 0)), `${g.id}: not the easiest`);
  });
  assert.ok(checked > 10, `${checked} entries with Pierre's photos checked`);
  // A synthetic case: Pierre's photo at ease 2 beats another observer's at 5.
  const T = {teach: [{id: 't99', name: 'X', level: 1, circle: 1, species: []}]},
    Y = C.fishGen(T, {
      t99: [
        {f: 'a', src: 'x', e: 5},
        {f: 'b', src: 'x', own: true, e: 2},
        {f: 'c', src: 'x', own: true, e: 3}
      ]
    });
  assert.strictEqual(Y.gen.t99.cover, 'c');
});

// Sheet-only fish photos (Pierre, 2026-11-05: a species with no game photo may keep one for its sheet, never in the
// quiz or any game; tools/fish_photos.py SHEET, fish-photos.json "sheet"). Every game draw reads an entry's
// views.wide (model.js photoSet; app.js fishGenera builds the genus units from it), so a photo marked use: 'ref' never
// reaching views.wide is what keeps it out of every game.
test('sheet-only fish photos: never in an entry’s game photos nor its cover, listed by species in fishGen sheet', () => {
  const T = {teach: [{id: 't99', name: 'X', level: 1, circle: 1, species: ['s1', 's2']}]},
    ref = {f: 'fiR', src: 'x', sp: 's2', use: 'ref', e: 5},
    Y = C.fishGen(T, {t99: [{f: 'fiA', src: 'x', sp: 's1', e: 2}, ref]}, {s3: [{f: 'fiS', src: 'x', sp: 's3'}]});
  assert.deepStrictEqual(
    Y.gen.t99.views.wide.map(p => p.f),
    ['fiA'],
    'a sheet-only photo listed among the game photos stays out'
  );
  assert.strictEqual(Y.gen.t99.cover, 'fiA', 'never the cover, even the easiest');
  assert.deepStrictEqual(Object.keys(Y.sheet).sort(), ['s2', 's3']);
  assert.ok(
    Object.values(Y.sheet)
      .flat()
      .every(p => p.use === 'ref'),
    'marked sheet only'
  );
  // An entry whose only photo is sheet-only has no game photo (so no question: no photo, no question).
  const Z = C.fishGen(T, {t99: [ref]});
  assert.strictEqual(Z.gen.t99.views.wide.length, 0);
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
  assert.strictEqual(C.LOG_SUBJ, 15);
  assert.strictEqual(C.ansSubject({}), 'coral', 'an entry from before the subject field is a coral one');
  assert.strictEqual(C.ansSubject({s: 'fish'}), 'fish');
  const row = (id, s) => Object.assign(Array(15).fill(''), {0: id}).concat(s === undefined ? [] : [s]);
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
  assert.deepStrictEqual(C.subjRows([Object.assign(Array(15).fill('h'), {0: 'Name'}).concat(['Subject'])]), []);
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

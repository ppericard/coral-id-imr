require('./slot.js').testGuard();
// The players' reports in the admin: a report's status (Done thanks the player through
// curation seen 'rep:<id>'; Stand-by and Dismissed live in curation reps and never thank), the list's order, and what a
// report is about whatever it was sent from (reports.js repCtx, shared with admin.js).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const {
  REP_STATUS,
  repStatus,
  repStatusSet,
  repsReconcile,
  repsOrder,
  unitSubj,
  repCtx,
  repOn,
  REP_WHY,
  repWhyText,
  repReg
} = require('../reports.js');
const {SUBJECTS, merge3} = require('../core.js');
const CORAL = SUBJECTS.find(s => !s.hash),
  TREEU = SUBJECTS.find(s => s.hash);
// A sheet row: [id, time, reporter, verified, reason, expected, answered, suggested, note, mode, photos, where].
const row = (o = {}) => [
  o.id || 'r1',
  o.t || 1,
  o.who || 'P1',
  o.ok == null ? 1 : o.ok,
  o.why || 'other',
  o.g || '',
  o.a || '',
  o.fix || '',
  o.note || '',
  o.m || '',
  o.ph || '',
  o.w || ''
];

test('REP_STATUS: open, stand-by, done, dismissed, in the list order', () => {
  assert.deepStrictEqual(
    REP_STATUS.map(x => x[0]),
    ['open', 'wait', 'done', 'drop']
  );
  assert.deepStrictEqual(
    REP_STATUS.map(x => x[2]),
    ['Reopen', 'Stand-by', 'Done', 'Dismiss']
  );
});

test('repStatus: Done is seen rep:<id>, Stand-by and Dismissed are reps, anything else open', () => {
  assert.strictEqual(repStatus({}, 'a'), 'open');
  assert.strictEqual(repStatus(null, 'a'), 'open');
  assert.strictEqual(repStatus({seen: {'rep:a': 1}}, 'a'), 'done');
  assert.strictEqual(repStatus({reps: {a: 'wait'}}, 'a'), 'wait');
  assert.strictEqual(repStatus({reps: {a: 'drop'}}, 'a'), 'drop');
  assert.strictEqual(repStatus({reps: {a: 'what'}}, 'a'), 'open');
  assert.strictEqual(repStatus({seen: {'rep:b': 1}, reps: {b: 'wait'}}, 'a'), 'open');
  // an id named like an object's own property is still a report id
  assert.strictEqual(repStatus({reps: {}}, 'constructor'), 'open');
});

test('repStatusSet: Done thanks (seen), Stand-by and Dismiss never do, Reopen clears both; other keys kept', () => {
  const C = {seen: {'cand:x': 1}, reps: {z: 'wait'}};
  const done = repStatusSet(C, 'a', 'done');
  assert.deepStrictEqual(done, {seen: {'cand:x': 1, 'rep:a': 1}, reps: {z: 'wait'}});
  const wait = repStatusSet({...C, ...done}, 'a', 'wait');
  assert.deepStrictEqual(wait, {seen: {'cand:x': 1}, reps: {z: 'wait', a: 'wait'}});
  assert.ok(!('rep:a' in wait.seen), 'Stand-by never in seen');
  const drop = repStatusSet({...C, ...wait}, 'a', 'drop');
  assert.deepStrictEqual(drop.reps, {z: 'wait', a: 'drop'});
  assert.ok(!('rep:a' in drop.seen), 'Dismiss never in seen');
  const open = repStatusSet({...C, ...drop}, 'a', 'open');
  assert.deepStrictEqual(open, {seen: {'cand:x': 1}, reps: {z: 'wait'}});
  // emptied maps leave the curation
  assert.deepStrictEqual(repStatusSet({reps: {a: 'drop'}}, 'a', 'open'), {seen: undefined, reps: undefined});
  // the input is never changed
  assert.deepStrictEqual(C, {seen: {'cand:x': 1}, reps: {z: 'wait'}});
});

test('repsOrder: by status, each in the rows order', () => {
  const R = ['a', 'b', 'c', 'd', 'e'].map(id => row({id}));
  const o = repsOrder(R, {seen: {'rep:b': 1}, reps: {c: 'wait', d: 'drop', a: 'wait'}});
  assert.deepStrictEqual(Object.fromEntries(Object.entries(o).map(([k, L]) => [k, L.map(r => r[0])])), {
    open: ['e'],
    wait: ['a', 'c'],
    done: ['b'],
    drop: ['d']
  });
});

test('merge3 carries the new reps key: both sides changes kept, a conflict mine', () => {
  const base = {genera: {}, reps: {a: 'wait'}},
    mine = {genera: {}, reps: {a: 'wait', b: 'drop'}},
    theirs = {genera: {}, reps: {a: 'drop'}, seen: {'rep:c': 1}};
  assert.deepStrictEqual(merge3(base, mine, theirs), {genera: {}, reps: {a: 'drop', b: 'drop'}, seen: {'rep:c': 1}});
  // every report reopened: the emptied key leaves
  assert.deepStrictEqual(merge3(base, {genera: {}}, base), {genera: {}});
});

test('repsReconcile: a status merged from two sides stays whole, the draft winning (Codex review #785)', () => {
  const base = {genera: {}},
    theirsDone = {genera: {}, seen: {'rep:a': 1}},
    mineWait = {genera: {}, reps: {a: 'wait'}};
  // merge3 alone keeps both places: Done would win and the player be thanked despite the draft's Stand-by
  const raw = merge3(base, mineWait, theirsDone);
  assert.strictEqual(repStatus(raw, 'a'), 'done');
  const m = repsReconcile(base, mineWait, raw);
  assert.strictEqual(repStatus(m, 'a'), 'wait');
  assert.ok(!(m.seen || {})['rep:a'], 'no thanks for a report the draft set on Stand-by');
  // the draft's Done over a Dismiss published from elsewhere
  const m2 = repsReconcile(base, theirsDone, merge3(base, theirsDone, {genera: {}, reps: {a: 'drop'}}));
  assert.deepStrictEqual([repStatus(m2, 'a'), m2.reps], ['done', undefined]);
  // the draft's Reopen over a Done published from elsewhere, from a Stand-by base
  const b3 = {genera: {}, reps: {a: 'wait'}},
    m3 = repsReconcile(b3, {genera: {}}, merge3(b3, {genera: {}}, {genera: {}, seen: {'rep:a': 1}}));
  assert.strictEqual(repStatus(m3, 'a'), 'open');
  // a report the draft did not touch takes the published status as it is
  const m4 = repsReconcile(base, {genera: {}}, merge3(base, {genera: {}}, theirsDone));
  assert.deepStrictEqual(m4, {genera: {}, seen: {'rep:a': 1}});
  // nothing to do: the same object back
  const same = merge3(base, mineWait, base);
  assert.strictEqual(repsReconcile(base, mineWait, same), same);
});

test('unitSubj: prefixed and renamed ids are the fish, any other id the corals', () => {
  assert.strictEqual(unitSubj('Acropora'), CORAL);
  assert.strictEqual(unitSubj('f:Damselfishes'), TREEU);
  assert.strictEqual(unitSubj('g:Chromis'), TREEU);
  assert.strictEqual(unitSubj('s:Chromis ternatensis'), TREEU);
  const old = Object.keys(TREEU.renamed.ids)[0];
  assert.strictEqual(unitSubj(old), TREEU);
  assert.strictEqual(unitSubj(''), null);
});

test('repCtx: a game report (quiz, duel): the expected unit, the answer, its photos, its page', () => {
  const c = repCtx(row({why: 'wrong', g: 'Acropora', a: 'Montipora', fix: 'Montipora', m: 'quiz', ph: 'a-1 a-2', w: 'practice/quiz'}));
  assert.deepStrictEqual(
    {src: c.src, game: c.game, unit: c.unit, ans: c.ans, photos: c.photos, page: c.page, subj: c.subj},
    {src: 'game', game: true, unit: 'Acropora', ans: 'Montipora', photos: ['a-1', 'a-2'], page: 'practice/quiz', subj: 'coral'}
  );
  const d = repCtx(row({g: 'Porites', a: 'Goniopora', m: 'quiz-duel', ph: 'p-1', w: 'practice/duels/Porites/Goniopora'}));
  assert.strictEqual(d.src, 'game');
  assert.strictEqual(d.subj, 'coral');
  const f = repCtx(row({g: 'f:Damselfishes', a: 'f:MoorishIdol', m: 'quiz', ph: 'fi464458713', w: 'fish/practice/quiz'}));
  assert.deepStrictEqual([f.unit, f.ans, f.subj, f.src], ['f:Damselfishes', 'f:MoorishIdol', 'fish', 'game']);
  // the sea slugs share the fish's sheet prefixes: their page says whose unit it is
  const s = repCtx(row({g: 'f:Chromodorididae', a: 'f:Polyceridae', m: 'quiz', w: 'seaslug/practice/quiz'}));
  assert.deepStrictEqual([s.unit, s.subj], ['f:Chromodorididae', 'seaslug']);
  assert.strictEqual(repCtx(row({g: 'f:Chromodorididae', m: 'quiz', w: 'seaslug/learn/families'})).subj, 'seaslug');
  // an old fish entry id is read as the family it was renamed into
  const old = Object.keys(TREEU.renamed.ids)[0];
  assert.strictEqual(repCtx(row({g: old, m: 'quiz', w: 'fish/practice/quiz'})).unit, TREEU.renamed.ids[old]);
});

test('repCtx: an enlarged photo, a sheet, the ID marks: not games', () => {
  const p = repCtx(row({why: 'photo', g: 'Acropora', m: 'photo', ph: 'a-9', w: 'learn/genus/Acropora'}));
  assert.deepStrictEqual([p.src, p.game, p.unit, p.photos.join(), p.subj], ['photo', false, 'Acropora', 'a-9', 'coral']);
  const s = repCtx(row({why: 'info', g: 'Acropora', m: 'sheet', w: 'learn/genus/Acropora'}));
  assert.deepStrictEqual([s.src, s.game, s.unit, s.photos.length, s.subj], ['sheet', false, 'Acropora', 0, 'coral']);
  // the fish ID marks' "Report or correct a line" (learn.js treeMarks, mode marks): a sheet's, never a game
  const m = repCtx(row({why: 'info', g: 'f:Damselfishes', m: 'marks', w: 'fish/learn/family/Damselfishes'}));
  assert.deepStrictEqual([m.src, m.game, m.unit, m.subj], ['marks', false, 'f:Damselfishes', 'fish']);
  // a fish genus sheet keeps its id
  const g = repCtx(row({why: 'info', g: 'g:Chromis', m: 'sheet', w: 'fish/learn/genus/Chromis'}));
  assert.deepStrictEqual([g.unit, g.subj], ['g:Chromis', 'fish']);
  // a species sheet: the script keeps no s: id (Code.gs logReports_), the unit comes from its page
  const sp = repCtx(row({why: 'info', g: '', m: 'sheet', w: 'fish/learn/species/Chromis%20ternatensis'}));
  assert.deepStrictEqual([sp.unit, sp.subj], ['s:Chromis ternatensis', 'fish']);
});

test('repCtx: Send feedback, from anywhere', () => {
  // from Home: about no unit and no subject, shown on every side
  const h = repCtx(row({why: 'idea', m: 'page', w: 'home'}));
  assert.deepStrictEqual([h.src, h.game, h.unit, h.photos.length, h.subj], ['page', false, '', 0, '']);
  assert.ok(repOn(h, CORAL) && repOn(h, TREEU));
  assert.strictEqual(repCtx(row({m: 'page', w: 'about'})).subj, '');
  assert.strictEqual(repCtx(row({m: 'page', w: 'leaderboard'})).subj, '');
  assert.strictEqual(repCtx(row({m: 'page', w: ''})).subj, '');
  // from a game, with the question's unit and photos (app.js helpEnd, quiz.js qNow)
  const q = repCtx(row({why: 'bug', g: 'Acropora', m: 'page', ph: 'a-3', w: 'practice/quiz'}));
  assert.deepStrictEqual([q.src, q.unit, q.photos.join(), q.subj], ['page', 'Acropora', 'a-3', 'coral']);
  assert.ok(repOn(q, CORAL) && !repOn(q, TREEU));
  // from a game, sent by an app that did not carry them: the game's subject, no unit
  const f = repCtx(row({why: 'bug', m: 'page', w: 'fish/practice/quiz'}));
  assert.deepStrictEqual([f.unit, f.subj], ['', 'fish']);
  assert.ok(!repOn(f, CORAL) && repOn(f, TREEU));
  // from a sheet: the sheet's unit
  const s = repCtx(row({why: 'info', m: 'page', w: 'learn/genus/Pocillopora'}));
  assert.deepStrictEqual([s.unit, s.subj], ['Pocillopora', 'coral']);
  const fs2 = repCtx(row({why: 'info', m: 'page', w: 'fish/learn/family/Damselfishes'}));
  assert.deepStrictEqual([fs2.unit, fs2.subj], ['f:Damselfishes', 'fish']);
  // a page of the corals' sections without a prefix is the corals'
  assert.strictEqual(repCtx(row({m: 'page', w: 'learn/genera'})).subj, 'coral');
  assert.strictEqual(repCtx(row({m: 'page', w: 'fish/learn/families'})).subj, 'fish');
});

test('repCtx: a photo tells the subject when nothing else does', () => {
  const ps = f => (/^fi\d/.test(f) ? 'fish' : '');
  assert.strictEqual(repCtx(row({m: 'photo', ph: 'fi123', w: 'home'}), ps).subj, 'fish');
  assert.strictEqual(repCtx(row({m: 'photo', ph: 'x-1', w: 'home'}), ps).subj, '');
  // the unit first
  assert.strictEqual(repCtx(row({m: 'photo', g: 'Acropora', ph: 'fi123', w: 'home'}), ps).subj, 'coral');
});

test('repCtx: the fields as they are, whatever the row', () => {
  const c = repCtx(row({id: 'x9', t: 5, who: 'P2', ok: 0, why: 'multi', note: 'n', fix: 'F'}));
  assert.deepStrictEqual([c.id, c.t, c.who, c.ok, c.why, c.note, c.fix], ['x9', 5, 'P2', 0, 'multi', 'n', 'F']);
  assert.deepStrictEqual(repCtx(null).photos, []);
  assert.strictEqual(repCtx([]).subj, '');
});

// A reason names the organism in its subject's words, never "Several corals" on a fish report (core.js
// SUBJECTS several, one), as the player's dialog put it (sync.js REP_WHY); the sheet keeps the key, so old reports too.
test('repWhyText: a reason in its subject words, every key the dialog sends', () => {
  const fish = repCtx(row({why: 'multi', g: 'f:Wrasses', m: 'quiz'})),
    coral = repCtx(row({why: 'multi', g: 'Acropora', m: 'quiz'}));
  assert.strictEqual(repWhyText(fish, TREEU), 'Several fish species');
  assert.strictEqual(repWhyText(coral, CORAL), 'Several corals');
  assert.strictEqual(repWhyText(repCtx(row({why: 'wrong', g: 'f:Wrasses', m: 'photo'})), TREEU), 'Wrong family');
  assert.strictEqual(repWhyText(repCtx(row({why: 'wrong', g: 'Acropora', m: 'quiz'})), CORAL), 'Wrong answer');
  assert.strictEqual(repWhyText(repCtx(row({why: 'nope'})), CORAL), 'nope');
  assert.strictEqual(repWhyText(repCtx(row({why: '__proto__'})), CORAL), '__proto__');
  // every reason the player's dialog offers has its words here, none naming the corals outright
  const SY = fs.readFileSync(path.join(ROOT, 'sync.js'), 'utf8'),
    keys = new Set(
      [
        ...SY.slice(SY.indexOf('const REP_WHY = {'))
          .split('};')[0]
          .matchAll(/\['(\w+)', '/g)
      ].map(m => m[1])
    );
  assert.ok(keys.size >= 6);
  keys.forEach(k => assert.ok(REP_WHY[k], k));
  Object.values(REP_WHY).forEach(t => assert.doesNotMatch(t, /coral|fish/i));
});

test('admin.html loads reports.js after core.js and before admin.js', () => {
  const H = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'),
    at = f => H.search(new RegExp(`<script src="${f}\\?v=\\d+"></script>`));
  assert.ok(at('core\\.js') > 0 && at('core\\.js') < at('reports\\.js'), 'core.js before reports.js');
  assert.ok(at('reports\\.js') > 0 && at('reports\\.js') < at('admin\\.js'), 'reports.js before admin.js');
});

// A reported photo of any subject, not only the fish, is found on the admin's Reports page, never "missing". Every
// subject whose SUBJECTS admin files name its tree and game photos gets a registry from them
// (reports.js repReg, admin.js unitRead): each photo of its game file in it, with its credits, the identification it
// carries, the unit showing it and its source as the file has it (a remote original stays remote), and a report on it
// goes to that subject's side by its photo alone.
test('repReg: every subject with files: its game photos, their credits, identification, unit and source', () => {
  const {treeGameRead} = require('../core.js'),
    json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
    withFiles = SUBJECTS.filter(S => S.admin.files);
  assert.ok(withFiles.length >= 2, 'the subjects with sheets at several ranks name their files');
  withFiles.forEach(S => {
    const W = S.admin.files;
    assert.ok(S.sheets && W.f && W.gm, `${S.id}: a tree and a game file`);
    const f = json(W.f),
      gm = json(W.gm),
      R = repReg(f, W.ph ? json(W.ph) : null, gm),
      fam = new Map((f.species || []).map(x => [x.id, x.family])),
      inGame = Object.values(treeGameRead(gm).photos).flat();
    assert.ok(R && inGame.length, `${S.id}: a registry and game photos`);
    let n = 0;
    inGame
      .filter(p => p && p.f && p.src && fam.get(p.sp) && R.gen[fam.get(p.sp)] && p.use !== 'ref')
      .forEach(p => {
        const q = R.ph[p.f];
        assert.ok(q, `${S.id}: ${p.f} in the registry`);
        assert.strictEqual(q.entry, fam.get(p.sp), `${S.id}: ${p.f} under its species' family`);
        assert.strictEqual(q.src, p.src, `${S.id}: ${p.f} keeps its source`);
        assert.strictEqual(!!q.r, !!p.r, `${S.id}: ${p.f} remote as in its file`);
        assert.strictEqual(q.a, p.a, `${S.id}: ${p.f} keeps its credits`);
        assert.strictEqual(q.t, p.t, `${S.id}: ${p.f} keeps the identification it carries`);
        n++;
      });
    assert.ok(n > 0, `${S.id}: some game photos checked`);
    // a report naming one of its photos only (no unit, no page) goes to its side by that photo
    const f0 = Object.keys(R.ph)[0],
      c = repCtx(row({why: 'photo', m: 'photo', ph: f0}), x => (R.ph[x] ? S.id : ''));
    assert.strictEqual(c.subj, S.id);
    assert.ok(repOn(c, S) && !repOn(c, CORAL));
    // its unit ids lead to their family, its species sheet ids to their species
    (f.species || []).slice(0, 3).forEach(x => {
      assert.strictEqual(R.fam['s:' + x.name], x.family);
      assert.strictEqual(R.spid['s:' + x.name], x.id);
    });
  });
  // a subject's photos stay in its own registry: no photo in two
  const regs = withFiles.map(S => {
      const W = S.admin.files,
        json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
      return repReg(json(W.f), W.ph ? json(W.ph) : null, json(W.gm));
    }),
    seen = new Map();
  regs.forEach((R, i) => Object.keys(R.ph).forEach(f => assert.ok(!seen.has(f), `${f} in two subjects`) || seen.set(f, i)));
  assert.strictEqual(repReg(null, null, null), null);
});

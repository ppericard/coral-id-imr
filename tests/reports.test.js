// The players' reports in the admin (Pierre, 2026-11-08, Q309): a report's status (Done thanks the player through
// curation seen 'rep:<id>'; Stand-by and Dismissed live in curation reps and never thank), the list's order, and what a
// report is about whatever it was sent from (reports.js repCtx, shared with admin.js).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const {REP_STATUS, repStatus, repStatusSet, repsReconcile, repsOrder, unitSubj, repCtx, repOn} = require('../reports.js');
const {SUBJECTS, merge3} = require('../core.js');
const CORAL = SUBJECTS.find(s => !s.hash),
  FISH = SUBJECTS.find(s => s.hash);
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
  assert.strictEqual(unitSubj('f:Damselfishes'), FISH);
  assert.strictEqual(unitSubj('g:Chromis'), FISH);
  assert.strictEqual(unitSubj('s:Chromis ternatensis'), FISH);
  const old = Object.keys(FISH.renamed.ids)[0];
  assert.strictEqual(unitSubj(old), FISH);
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
  // an old fish entry id is read as the family it was renamed into
  const old = Object.keys(FISH.renamed.ids)[0];
  assert.strictEqual(repCtx(row({g: old, m: 'quiz', w: 'fish/practice/quiz'})).unit, FISH.renamed.ids[old]);
});

test('repCtx: an enlarged photo, a sheet, the ID marks: not games', () => {
  const p = repCtx(row({why: 'photo', g: 'Acropora', m: 'photo', ph: 'a-9', w: 'learn/genus/Acropora'}));
  assert.deepStrictEqual([p.src, p.game, p.unit, p.photos.join(), p.subj], ['photo', false, 'Acropora', 'a-9', 'coral']);
  const s = repCtx(row({why: 'info', g: 'Acropora', m: 'sheet', w: 'learn/genus/Acropora'}));
  assert.deepStrictEqual([s.src, s.game, s.unit, s.photos.length, s.subj], ['sheet', false, 'Acropora', 0, 'coral']);
  // the fish ID marks' "Report or correct a line" (learn.js fishMarks, mode marks): a sheet's, never a game
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
  assert.ok(repOn(h, CORAL) && repOn(h, FISH));
  assert.strictEqual(repCtx(row({m: 'page', w: 'about'})).subj, '');
  assert.strictEqual(repCtx(row({m: 'page', w: 'leaderboard'})).subj, '');
  assert.strictEqual(repCtx(row({m: 'page', w: ''})).subj, '');
  // from a game, with the question's unit and photos (app.js helpEnd, quiz.js qNow)
  const q = repCtx(row({why: 'bug', g: 'Acropora', m: 'page', ph: 'a-3', w: 'practice/quiz'}));
  assert.deepStrictEqual([q.src, q.unit, q.photos.join(), q.subj], ['page', 'Acropora', 'a-3', 'coral']);
  assert.ok(repOn(q, CORAL) && !repOn(q, FISH));
  // from a game, sent by an app that did not carry them: the game's subject, no unit
  const f = repCtx(row({why: 'bug', m: 'page', w: 'fish/practice/quiz'}));
  assert.deepStrictEqual([f.unit, f.subj], ['', 'fish']);
  assert.ok(!repOn(f, CORAL) && repOn(f, FISH));
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

test('admin.html loads reports.js after core.js and before admin.js', () => {
  const H = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'),
    at = f => H.search(new RegExp(`<script src="${f}\\?v=\\d+"></script>`));
  assert.ok(at('core\\.js') > 0 && at('core\\.js') < at('reports\\.js'), 'core.js before reports.js');
  assert.ok(at('reports\\.js') > 0 && at('reports\\.js') < at('admin\\.js'), 'reports.js before admin.js');
});

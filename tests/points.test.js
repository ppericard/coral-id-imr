// The points to handle (Pierre, 2026-11-05): points.json's shape (written by agents, read by the admin's To do › Points)
// and the list's order (points.js, shared with admin.js).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const {PT_STATUS, ptStatus, pointsOrder, pointAge, pointsProblems, photoKey} = require('../points.js');
const J = read('points.json'),
  SUBJ = require('../core.js').SUBJECTS.map(s => s.id);

test('points.json: every point has the right shape, ids unique', () => {
  assert.deepStrictEqual(pointsProblems(J, SUBJ), []);
  assert.ok(J.points.length >= 20);
});

test('points.json: the Astrea question first, with its 7 photos to show, each in the app', () => {
  const p = J.points[0];
  assert.strictEqual(p.id, 'astrea-reefcloud');
  assert.strictEqual(p.kind, 'trainer');
  assert.strictEqual(p.photos.length, 7);
  const D = read('data.json'),
    C = read('cand.json'),
    F = new Set();
  const walk = o =>
    Array.isArray(o) ? o.forEach(walk) : o && typeof o === 'object' ? (o.f && F.add(o.f), Object.values(o).forEach(walk)) : 0;
  walk(D);
  walk(C);
  assert.deepStrictEqual(
    p.photos.map(x => x.t),
    // 5-7: the photos Pierre flagged in his reports of 2026-11-05 (two "?", one "Astrea?").
    ['Astrea curta', 'Favites colemani', 'Plesiastrea peroni', 'Favites colemani', 'Astrea curta', 'Astrea curta', 'Favites valenciennesi']
  );
  p.photos.forEach(x => assert.ok(F.has(x.f), `${x.f} is not a photo of data.json or cand.json`));
  // Pierre's own F. colemani observation (iNaturalist 406194912) is the fourth.
  assert.match(p.photos[3].o, /observations\/406194912$/);
});

test('points.json: a photo in points.json names a photo id or an https copy, with its credit', () => {
  J.points
    .flatMap(p => p.photos || [])
    .forEach(x => {
      if (x.none) return;
      assert.ok(x.a, 'credit');
      // admin.html CSP img-src: iNaturalist's photo hosts, and FishBase's for a fish reference or stopgap photo
      if (x.src)
        assert.match(x.src, /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org|www\.fishbase\.(de|se))\//);
    });
});

test('pointsProblems: names what is wrong', () => {
  const kinds = {trainer: 'Trainer'},
    ok = {id: 'a-b', kind: 'trainer', subj: 'coral', at: '2026-11-05', title: 'T', q: 'Q?', src: [{t: 'S'}]};
  assert.deepStrictEqual(pointsProblems({kinds, points: [ok]}), []);
  const bad = (p, re) => assert.match(pointsProblems({kinds, points: [{...ok, ...p}]}, SUBJ).join(' | '), re);
  bad({id: 'A b'}, /id must be/);
  bad({kind: 'other'}, /kind other not in kinds/);
  bad({subj: 'algae'}, /subj/);
  bad({at: '5 Nov'}, /at must be/);
  bad({q: ''}, /no q/);
  bad({src: []}, /src must/);
  bad({photos: [{f: 'x', a: 'c'}]}, /ask/);
  bad({photos: [{f: 'x'}], ask: 'Label'}, /no credit/);
  bad({photos: [{src: 'http://x', a: 'c'}], ask: 'Label'}, /https/);
  bad({photos: [{}], ask: 'Label'}, /needs f, src or none/);
  assert.match(pointsProblems({kinds, points: [ok, ok]}).join(), /used twice/);
  assert.deepStrictEqual(pointsProblems({kinds, points: [{...ok, photos: [{none: 'No photo from Dauin'}], ask: 'Label'}]}), []);
});

test('pointsOrder: open first, then stand-by, resolved, dismissed, each in the file order', () => {
  const L = ['a', 'b', 'c', 'd', 'e'].map(id => ({id}));
  const st = {a: {s: 'wait'}, c: {s: 'done', n: 'x'}, d: {s: 'drop'}, e: {n: 'note only'}, zz: {s: 'done'}};
  const o = pointsOrder(L, st);
  assert.deepStrictEqual(
    Object.keys(o),
    PT_STATUS.map(x => x[0])
  );
  assert.deepStrictEqual(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.map(x => x.id)])), {
    open: ['b', 'e'],
    wait: ['a'],
    done: ['c'],
    drop: ['d']
  });
  assert.deepStrictEqual(pointsOrder(L, undefined).open.length, 5);
  assert.strictEqual(ptStatus({a: {s: 'odd'}}, 'a'), 'open');
  // Reopening (the status removed) brings a point back to its place among the open ones.
  assert.deepStrictEqual(
    pointsOrder(L, {...st, a: {}}).open.map(x => x.id),
    ['a', 'b', 'e']
  );
});

test('pointAge: days, then weeks, then months', () => {
  const now = new Date(2026, 10, 5, 15).getTime();
  assert.strictEqual(pointAge('2026-11-05', now), 'today');
  assert.strictEqual(pointAge('2026-11-02', now), '3 d');
  assert.strictEqual(pointAge('2026-10-01', now), '5 wk');
  assert.strictEqual(pointAge('2026-06-01', now), '5 mo');
  assert.strictEqual(pointAge('soon', now), '');
});

test('photoKey: the photo id, else its place', () => {
  assert.strictEqual(photoKey({f: 'x-1'}, 0), 'x-1');
  assert.strictEqual(photoKey({none: 'n'}, 2), 'p2');
});

test('the trainer questions and content questions left ROADMAP for points.json', () => {
  const R = fs.readFileSync(path.join(ROOT, 'docs/ROADMAP.md'), 'utf8');
  ['Slide 16 right half', 'exclusively extra-tentacular', 'Stylophora wording', 'Merulina placement'].forEach(s =>
    assert.ok(!R.includes(s), `ROADMAP still lists "${s}"`)
  );
  assert.match(R, /points\.json/);
  const H = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'),
    at = f => H.search(new RegExp(`<script src="${f}\\?v=\\d+"></script>`));
  assert.ok(at('points\\.js') > 0 && at('points\\.js') < at('admin\\.js'), 'admin.html loads points.js before admin.js');
});

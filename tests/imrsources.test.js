// tools/imr_sources.json records where each IMR lecture photo was found online (ROADMAP "Trace IMR lecture photos to
// their original source"; study docs/reviews/2026-11-15-imr-lecture-photo-sources-study.md). Each record must name a
// lecture photo the data files know, and never give an author or a licence without the page that states it.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const S = read('tools/imr_sources.json'),
  D = read('data.json'),
  X = read('excluded.json');
const FOUND = new Set(['original', 'copy-only', 'none']);

// Pierre's Publish can exclude a lecture photo (it leaves data.json course for excluded.json) or restore one: a record
// stays valid either way, so the test only asks that each record names a lecture photo the data files know.
test('every record names a known IMR lecture photo, and the 120 of the study are there', () => {
  const known = new Set([...Object.values(D.course).flatMap(L => L.map(p => p.f)), ...D.cmp.map(p => p.f), ...Object.keys(X.photos)]);
  for (const f of Object.keys(S.photos)) assert.ok(/^imrl?-p\d+_[gi]\d+$/.test(f) && known.has(f), f);
  assert.strictEqual(Object.keys(S.photos).length, 120);
});

test('an author or a licence only comes with the page that states it', () => {
  for (const [f, r] of Object.entries(S.photos)) {
    assert.ok(FOUND.has(r.found), f + ': found ' + r.found);
    if (r.found === 'original') {
      const s = r.source;
      assert.ok(s && /^https:\/\//.test(s.page) && /^https:\/\//.test(s.image), f + ': an original names its page and picture');
      assert.ok(typeof s.author === 'string' && s.author.length > 0, f + ': an original names its photographer');
      assert.ok(s.licence === null || typeof s.licence === 'string', f);
      assert.ok(s.licence !== null || S.terms[s.terms], f + ': no licence stated, so the site terms are cited');
      assert.ok(s.inliers >= 100, f + ': a match has at least 100 consistent points');
    } else {
      assert.strictEqual(r.source, null, f + ': no author or licence without a source page');
    }
    if (r.found === 'copy-only') assert.ok(r.copies && r.copies.length > 0, f + ': copy-only lists its copies');
    if (r.found === 'none') assert.ok(!r.copies, f + ': none has no copies');
  }
});

// The credits (Pierre, 2026-11-15, #925: "credit the photos now with their original sources"): each lecture photo traced
// to its original carries on its course record its credit a ("<photographer> / <site>") and pg (the page that states it,
// the credit's link), as tools/apply_imr_sources.py writes them; one not traced carries neither. Never o (the draw's
// observation and the photo memory's key: two photos of one species page are two colonies) nor src (an online original).
// The course records are data.json course and the ones Pierre's exclusions archived in excluded.json (tools/excluded.py:
// a Publish may move one there at any time, so every traced photo is in one or the other; Codex review #939).
test('course records: a traced lecture photo credits its photographer and links its page; never o or src', () => {
  const C = require('../core.js'),
    archived = Object.values(X.photos)
      .filter(x => x.in === 'course' && x.p)
      .map(x => x.p),
    by = Object.fromEntries([...Object.values(D.course).flat(), ...archived].map(p => [p.f, p]));
  const want = Object.entries(S.photos).filter(([, r]) => r.found === 'original').length;
  let n = 0;
  for (const [f, r] of Object.entries(S.photos)) {
    const p = by[f];
    if (!p) continue; // the comparison picture (data.json cmp)
    assert.ok(p.imr && !('o' in p) && !('src' in p), f + ': no o or src on a lecture photo');
    if (r.found === 'original') {
      n++;
      assert.strictEqual(p.a, `${r.source.author} / ${r.source.site}`, f);
      assert.strictEqual(p.pg, r.source.page, f);
      assert.strictEqual(C.rightsClass(p), 'nc', f + ': its site terms, non-commercial');
      assert.strictEqual(C.licOf(p), null, f + ': no licence invented');
    } else {
      assert.ok(!('a' in p) && !('pg' in p), f + ': no credit without a source');
      assert.strictEqual(C.rightsClass(p), 'imr', f);
    }
  }
  assert.strictEqual(n, want, 'every traced photo credited, in play or archived');
  // the file as the tool writes it
  require('child_process').execFileSync('python3', ['tools/apply_imr_sources.py', '--check'], {cwd: ROOT});
});

// A traced photo Pierre excludes (its record archived in excluded.json by tools/excluded.py) keeps its credit, so a
// Restore brings it back credited; the tool credits it there and does not call it missing (Codex review #939).
test('apply_imr_sources: a traced photo archived by an exclusion is credited there, not missing', () => {
  const out = JSON.parse(
    require('child_process').execFileSync(
      'python3',
      [
        '-c',
        `import sys, json; sys.path.insert(0, 'tools')
import apply_imr_sources as A
S = {'photos': {'imr-p1_i1': {'found': 'original', 'source': {'author': 'X Y', 'site': 'Corals of the World', 'page': 'https://www.coralsoftheworld.org/a/'}},
                'imr-p1_i2': {'found': 'original', 'source': {'author': 'Z', 'site': 'Corals of the World', 'page': 'https://www.coralsoftheworld.org/b/'}},
                'imr-p1_i3': {'found': 'none', 'source': None}}}
d = {'course': {'G': [{'f': 'imr-p1_i1', 'imr': True}, {'f': 'imr-p1_i3', 'imr': True}]}}
X = {'photos': {'imr-p1_i2': {'in': 'course', 'g': 'G', 'i': 1, 'p': {'f': 'imr-p1_i2', 'imr': True}}}}
done = A.apply(d, X, S)
print(json.dumps([sorted(done), d['course']['G'], X['photos']['imr-p1_i2']['p']]))`
      ],
      {cwd: ROOT, encoding: 'utf8'}
    )
  );
  assert.deepStrictEqual(out, [
    ['imr-p1_i1', 'imr-p1_i2'],
    [
      {f: 'imr-p1_i1', imr: true, a: 'X Y / Corals of the World', pg: 'https://www.coralsoftheworld.org/a/'},
      {f: 'imr-p1_i3', imr: true}
    ],
    {f: 'imr-p1_i2', imr: true, a: 'Z / Corals of the World', pg: 'https://www.coralsoftheworld.org/b/'}
  ]);
});

// The app's credit (app.js credit, blindCredit, photoSrc): the slide, then the photographer linked to the page after the
// answer; before it the photographer by name only, no link (rule P5: the page's address names the species).
test('app.js credits a traced lecture photo after the answer with its link, before it by name only', () => {
  const vm = require('vm'),
    block = require('./block'),
    src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    ctx = {esc: s => String(s), safeUrl: u => u};
  vm.runInNewContext(
    [
      block(src, 'const author = p =>', '\nconst photoSrc', {file: 'app.js'}),
      block(src, 'const photoSrc = p =>', '\n// One colour per IMR', {file: 'app.js'}),
      block(src, 'const lectCredit = p =>', '\nconst allPhotos', {file: 'app.js'}),
      `const P = {imr: true, slide: 20, a: 'Jim Maragos / Corals of the World', pg: 'https://www.coralsoftheworld.org/s/stylophora-pistillata/'},
        Q = {imr: true, slide: 21};
      this.r = [credit(P), blindCredit(P), photoSrc(P), credit(Q), blindCredit(Q), photoSrc(Q)];`
    ].join('\n'),
    ctx
  );
  const [c, b, s, c0, b0, s0] = ctx.r;
  assert.match(
    c,
    /^IMR Lecture 6, slide 20 · <a href="https:\/\/www\.coralsoftheworld\.org\/s\/stylophora-pistillata\/"[^>]*>Jim Maragos \/ Corals of the World<\/a>$/
  );
  assert.strictEqual(b, ' · IMR lecture · © Jim Maragos / Corals of the World');
  assert.match(s, /^<a class="psrc" href="https:\/\/www\.coralsoftheworld\.org\/s\/stylophora-pistillata\/"/);
  assert.strictEqual(c0, 'IMR Lecture 6, slide 21');
  assert.strictEqual(b0, ' · IMR lecture');
  assert.match(s0, /^<span class="psrc"[^>]*>IMR lecture<\/span>$/);
});

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
// to its original carries in data.json course its credit a ("<photographer> / <site>") and pg (the page that states it,
// the credit's link), as tools/apply_imr_sources.py writes them; one not traced carries neither. Never o (the draw's
// observation and the photo memory's key: two photos of one species page are two colonies) nor src (an online original).
test('data.json course: a traced lecture photo credits its photographer and links its page; never o or src', () => {
  const C = require('../core.js'),
    course = Object.values(D.course).flat(),
    by = Object.fromEntries(course.map(p => [p.f, p]));
  let n = 0;
  for (const [f, r] of Object.entries(S.photos)) {
    const p = by[f];
    if (!p) continue; // the comparison picture, the excluded photo
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
  assert.strictEqual(n, 86);
  // the file as the tool writes it
  require('child_process').execFileSync('python3', ['tools/apply_imr_sources.py', '--check'], {cwd: ROOT});
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

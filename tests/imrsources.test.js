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

// The Coral Finder texts in the app's own words (Pierre, 2026-11-08): the criteria, summaries, ID tips, look-alike
// sources and Coral ID Key box labels that followed the book too closely were reworded (tools/apply_book_rewrite.py).
// tools/book_rewrite.json keeps only hashes: of each old wording, and of its 5-word runs ("old5"). No text of these
// fields may share a 5-word run with the old wording again; tests/plain.test.js does the same for the plain lines.
const test = require('node:test'),
  assert = require('node:assert'),
  crypto = require('crypto'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'book_rewrite.json'), 'utf8'));
// Same as tools/apply_book_rewrite.py h(): the first 16 hex digits of the text's SHA-256.
const h = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
// A look-alike source starts with its page ("Coral Finder p. 57: "), which is a citation, not wording.
const CITE = /^Coral Finder p\. [^:]*: /;
const grams = s => {
  const t =
    s
      .replace(CITE, '')
      .toLowerCase()
      .match(/[a-z0-9]+/g) || [];
  return t.slice(0, Math.max(0, t.length - 4)).map((_, i) => t.slice(i, i + 5).join(' '));
};
const at = p => p.reduce((o, k) => o[k], DATA);

// Every text of the fields the book could reach, with where it is.
function texts() {
  const out = [];
  for (const [src, G] of [
    ['gen', DATA.gen],
    ['x.gen', DATA.x.gen]
  ])
    for (const [n, g] of Object.entries(G)) {
      for (const f of ['crit', 'qt']) (g[f] || []).forEach((c, i) => out.push([`${src}.${n}.${f}.${i}`, c]));
      if (g.sum) out.push([`${src}.${n}.sum`, g.sum]);
      for (const [k, v] of Object.entries(g.lsrc || {})) out.push([`${src}.${n}.lsrc.${k}`, v]);
    }
  for (const grp of [...DATA.key, ...DATA.x.groups]) {
    out.push([`key.${grp.id}.name`, grp.name]);
    if (grp.sub) out.push([`key.${grp.id}.sub`, grp.sub]);
    for (const l of grp.leaves) {
      out.push([`key.${l.id}.t`, l.t]);
      if (l.s) out.push([`key.${l.id}.s`, l.s]);
    }
  }
  return out;
}

test('every listed text has its new wording (tools/apply_book_rewrite.py --check)', () => {
  assert.ok(MAP.rewrites.length >= 60);
  for (const e of MAP.rewrites) {
    const cur = at(e.at);
    assert.notStrictEqual(h(cur), e.old, `${e.at.join('/')}: still the old wording`);
    assert.strictEqual(cur, e.new, `${e.at.join('/')}: changed since the rewrite, check it against the book by hand`);
  }
});

test('no Coral Finder text shares a 5-word run with the old near-book wording', () => {
  const old = new Set(MAP.old5);
  assert.ok(old.size >= 300);
  const all = texts();
  assert.ok(all.length >= 500, `${all.length} texts`);
  const bad = all.filter(([, t]) => grams(t).some(g => old.has(h(g)))).map(([w]) => w);
  assert.deepStrictEqual(bad, []);
});

test('the check catches a hashed run anywhere in a text, and skips the page citation', () => {
  const hits = (set, t) => grams(t).some(g => set.has(h(g)));
  const planted = new Set([h('thin plates with ragged edges')]);
  assert.ok(hits(planted, 'Colony of thin plates with ragged edges, often tiered.'));
  assert.ok(hits(planted, 'Thin plates, with ragged edges!'), 'case and punctuation do not hide a run');
  assert.ok(!hits(planted, 'Thin plates with edges ragged.'));
  assert.deepStrictEqual(grams('Coral Finder p. 64: a b c d e f'), ['a b c d e', 'b c d e f']);
  const old = new Set(MAP.old5);
  for (const e of MAP.rewrites) assert.ok(!hits(old, e.new), `${e.at.join('/')}: the new wording keeps an old run`);
});

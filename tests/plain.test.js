// "In plain words" (Pierre, 2026-11-03: genus sheets for complete beginners): one everyday-words line per genus,
// data.json `plain` (tools/apply_plain_sheets.py), shown by app.js plainLine on the genus sheet and the first card.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {slateOf, gameOf, starRefs} = require('../core.js');
const ROOT = path.join(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const G = {...DATA.gen, ...DATA.x.gen};
const MAX_WORDS = 30; // tools/apply_plain_sheets.py MAX_WORDS
const words = s => (s.match(/[\w'-]+/g) || []).length;
const sentences = s => s.split(/[.!?](?:\s|$)/).filter(x => x.trim()).length;

test('every slate genus, and every other genus with a sheet, has a plain line of 1-2 sentences within the limit', () => {
  const slate = slateOf(DATA);
  assert.ok(slate.length >= 40 && slate.includes('Millepora'));
  for (const n of [...slate, ...gameOf(DATA), ...Object.keys(G)]) {
    const t = G[n].plain;
    assert.ok(typeof t === 'string' && t.trim(), `${n}: no plain line`);
    assert.ok(words(t) <= MAX_WORDS, `${n}: ${words(t)} words`);
    assert.ok(sentences(t) >= 1 && sentences(t) <= 2, `${n}: ${sentences(t)} sentences`);
    assert.ok(/[.!?]$/.test(t), `${n}: ends without a full stop`);
  }
});

test("the plain lines are the app's own words: no run of 5 words taken from the Coral Finder features", () => {
  const grams = s => {
    const t = s.toLowerCase().match(/[a-z0-9'-]+/g) || [];
    return new Set(t.slice(0, Math.max(0, t.length - 4)).map((_, i) => t.slice(i, i + 5).join(' ')));
  };
  for (const [n, g] of Object.entries(G)) {
    const cf = new Set([...(g.crit || []), g.sum || ''].flatMap(x => [...grams(x)]));
    const shared = [...grams(g.plain)].filter(x => cf.has(x));
    assert.deepStrictEqual(shared, [], n);
  }
});

test('every plain line has at least 2 recorded sources (tools/plain_sources.json)', () => {
  const S = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'plain_sources.json'), 'utf8'));
  for (const n of Object.keys(G)) {
    const L = S[n] || [];
    assert.ok(L.length >= 2, `${n}: ${L.length} sources`);
    L.forEach(s => assert.ok(s.title && /^https:\/\//.test(s.url), `${n}: ${JSON.stringify(s)}`));
  }
});

test("a slate genus's line names another genus only when its first card comes after that genus's (core.js starRefs)", () => {
  const names = Object.keys(G);
  for (const n of slateOf(DATA)) {
    const named = names.filter(m => m !== n && new RegExp(`\\b${m}\\b`).test(G[n].plain));
    named.forEach(m => assert.ok(starRefs(DATA, n).includes(m), `${n} names ${m}, which a beginner may not have met`));
  }
});

test('plainLine: the line, escaped, under its label; nothing for a genus without one', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    line = a => src.slice(src.indexOf(a), src.indexOf('\n', src.indexOf(a))),
    ctx = {};
  vm.createContext(ctx);
  vm.runInContext(`${line('const esc = ')}\n${line('const plainLine = ')}\nthis.plainLine = plainLine;`, ctx);
  const h = ctx.plainLine(G.Acropora);
  assert.ok(h.startsWith('<p class="plainw"><b>In plain words</b> ') && h.includes(G.Acropora.plain.slice(0, 30)));
  assert.strictEqual(ctx.plainLine({plain: 'a <b> & c'}), '<p class="plainw"><b>In plain words</b> a &lt;b&gt; &amp; c</p>');
  assert.strictEqual(ctx.plainLine({}), '');
});

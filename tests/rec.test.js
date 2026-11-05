'use strict';
// Difficulty in words in the admin (Pierre, 2026-11-05, Q19 and Q26): a photo or genus reads as "recognised by N%", the
// share of starting players who recognise it without guessing, 1 / (1 + e^d), in five colour bands; a player reads as
// their Elo, 1000 + 200 × level. One helper for every admin page: admin.js, between "// recognised: begin" and "end".
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
const R = new Function(
  block(src, '// recognised: begin', '// recognised: end', {file: 'admin.js'}) +
    '\nreturn {recognised, recOf, recPct, REC, recBand, rawNum, recBadge, recCut, recScale, eloNum, eloMargin, eloText};'
)();
// The difficulty at which a share p of starting players recognise the photo.
const dAt = p => Math.log(1 / p - 1);

test('the reading: 1 / (1 + e^d), rounded to a whole %', () => {
  assert.strictEqual(R.recognised(0), 0.5);
  assert.deepStrictEqual([R.recPct(0), R.recPct(1.44), R.recPct(-1), R.recPct(1), R.recPct(3)], ['50%', '19%', '73%', '27%', '5%']);
  assert.strictEqual(R.recOf(dAt(0.7451)), 75);
  assert.strictEqual(R.recOf(dAt(0.7449)), 74);
});

test('five bands on the whole % shown: ≥75 very easy, 60-75 easy, 40-60 middle, 25-40 hard, <25 very hard', () => {
  const band = p => R.recBand(dAt(p))[1];
  assert.deepStrictEqual([0.99, 0.75, 0.7449, 0.6, 0.5949, 0.5, 0.4, 0.3949, 0.25, 0.2449, 0.01].map(band), [
    'veasy',
    'veasy',
    'easy',
    'easy',
    'mid',
    'mid',
    'mid',
    'hard',
    'hard',
    'vhard',
    'vhard'
  ]);
  // The colour never disagrees with the number: 74.6% shows as 75% and is very easy.
  assert.strictEqual(R.recPct(dAt(0.746)), '75%');
  assert.strictEqual(band(0.746), 'veasy');
  assert.deepStrictEqual(
    R.REC.map(b => b[2]),
    ['very easy', 'easy', 'middle', 'hard', 'very hard']
  );
});

test('sorting by difficulty: harder photo, lower %', () => {
  const D = [0.3, -1.2, 2.1, 0, -0.4, 1.1];
  const hardFirst = D.slice()
    .sort((a, b) => b - a)
    .map(R.recOf);
  assert.deepStrictEqual(
    hardFirst,
    hardFirst.slice().sort((a, b) => a - b),
    'hardest first = lowest % first'
  );
  for (let d = -4; d < 4; d += 0.05) assert.ok(R.recognised(d + 0.05) < R.recognised(d));
});

test('the badge: text, band class, the raw value in its title', () => {
  const b = R.recBadge(1.44);
  assert.match(b, /^<span class="adm-rec rec-vhard" data-d="1\.44" title="[^"]+">recognised by 19%<\/span>$/);
  assert.match(b, /title="[^"]*19% \(very hard\)[^"]*difficulty \+1\.44 \(\+ = harder\)/);
  assert.strictEqual(
    R.recBadge(-1.2, {short: 1}).replace(/ title="[^"]*"/, ''),
    '<span class="adm-rec rec-veasy" data-d="-1.20">77%</span>'
  );
  assert.match(
    R.recBadge(0.1, {of: 'a typical photo of the genus', raw: 'genus offset', more: 'x < "y"'}),
    /title="Starting players who recognise a typical photo of the genus without guessing: 48% \(middle\) · genus offset \+0\.10 \(\+ = harder\) · x &lt; &quot;y&quot;"/
  );
  assert.strictEqual(R.recBadge(null), '–');
  assert.strictEqual(R.recBadge(NaN, {none: ''}), '');
  assert.deepStrictEqual([R.rawNum(0.8), R.rawNum(-0.8), R.rawNum(0), R.rawNum(-0.001)], ['+0.80', '−0.80', '0.00', '0.00']);
});

test('the band scale under a chart axis: segments in order, as wide as their stretch of the axis', () => {
  const s = R.recScale(-2, 2),
    W = [...s.matchAll(/class="rec-(\w+)" style="width:([\d.]+)%"/g)];
  assert.deepStrictEqual(
    W.map(m => m[1]),
    ['veasy', 'easy', 'mid', 'hard', 'vhard']
  );
  assert.ok(Math.abs(W.reduce((t, m) => t + Number(m[2]), 0) - 100) < 0.05);
  // Each cut is where the % shown drops under its floor.
  R.REC.slice(0, -1).forEach(([f]) => {
    assert.strictEqual(R.recOf(R.recCut(f) - 1e-9), f);
    assert.strictEqual(R.recOf(R.recCut(f) + 1e-9), f - 1);
  });
  assert.deepStrictEqual(
    [...R.recScale(0.5, 3).matchAll(/rec-(\w+)/g)].map(m => m[1]),
    ['hard', 'vhard'],
    'only the bands the axis covers'
  );
});

test('a player: the Elo players see, ± its 95% margin, the level in the title', () => {
  assert.strictEqual(R.eloNum(0.79), 1158);
  assert.strictEqual(R.eloNum(-3.04), 392);
  assert.strictEqual(R.eloMargin(0.44), 90);
  assert.strictEqual(R.eloMargin(Infinity), null);
  assert.strictEqual(
    R.eloText(0.79, 0.44),
    '<span class="adm-elo" title="Elo 1158 ± 90 (95% margin) · level +0.79 (Elo = 1000 + 200 × level)">1158 <small>±90</small></span>'
  );
  assert.strictEqual(R.eloText(0, null), '<span class="adm-elo" title="Elo 1000 · level 0.00 (Elo = 1000 + 200 × level)">1000</span>');
  assert.strictEqual(R.eloText(null), '–');
});

// Photo memory (sheet v26, docs/LEARNING.md "Photo memory"): replays the real answer log under the old rule (sheet v25,
// app before 2026-11-03) and the new one, to see what the change does to the current players. Offline, reads a file:
//
//   node tools/memreplay.js answers.json [--player <anonymous id>] [--min 5] [--mem 0,-0.44,-1.1,-1.7]
//
// answers.json: the admin's answer log, as the sheet's readAnswers (POST {readAnswers: 1, token}) or GET ?answers=1
// (older scripts) returns it: {rows: [[id, time ms, genus shown, answered, right 0|1, mode, photos, expected, ability,
// new photos, choices, anonymous, seconds, enlarged]]}, or the rows array alone. Nothing is sent anywhere.
//
// Prints:
// - the sheet side: the photo memory offsets the new rule estimates from these answers (core.js photoMemOf, as ?stats=1
//   mem will serve them), and how far the photo ratings move from the old rule (v25, copied below) to the new one;
// - per player (anonymous id), replayed in time order with the app's rules by core.js replayProgress (the full replay the
//   admin shows, docs/LEARNING.md "Full replay"): the progress of each genus (s.pg, the bar %), the overall % over the
//   genera answered, and the opening hold (the CUSUM of the expectations), old rule (before the photo memory) -> new.
//   Each question's difficulty d is recovered from what the app logged then (expected e, ability th, k choices):
//   e = 1/k + (1 - 1/k) sig(th - d) (core.js MEM_LOGGED: since the photo memory the logged e includes it). The new rule
//   adds the player's memory of the photos (fam, from their own history in the log) to d: the right answer weighs
//   x pgMemW, the miss pgMissW at d + fam, the expectation e at d + fam. Beside it, "silent recalculation": what the
//   app's one-time recalculation of saved progress (core.js memRecalc, from the genus's photos [shown, right] alone, as a
//   device holds them) makes of the old-rule bar.
//
// Approximations (the replay is a what-if, not the app): listed with core.js replayProgress (the ability and the photos
// are those the app logged, a comeback answer's recall is taken as 1, the look-alike prior without the growth forms, the
// genus wrongly given weighed at the chance on the genus shown); the pooled confusions are those of this log
// (core.js confusionOf); the mastery exam is not replayed, so a genus learned shows at most 95%. Answers logged without
// expected/ability (before sheet v5) are not replayed.
const fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2),
  opt = (k, d) => {
    const i = args.indexOf('--' + k);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
  },
  file = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
if (!file) {
  console.error('usage: node tools/memreplay.js answers.json [--player <id>] [--min 5] [--mem 0,-0.44,-1.1,-1.7]');
  process.exit(1);
}
const J = JSON.parse(fs.readFileSync(file, 'utf8')),
  rows = (Array.isArray(J) ? J : J.rows || []).filter(r => r && r[0]),
  ONLY = opt('player', null),
  MIN = Number(opt('min', 5));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8')),
  GEN = {...(DATA.gen || {}), ...((DATA.x || {}).gen || {})}; // Millepora and the bonus genera too, as the app's GX
const sig = x => 1 / (1 + Math.exp(-x));

// The sheet before v26 (Code.gs stats_ v25, core.js eloReplay before 2026-11-03): fixed memory rule for the photo's
// step only (new +0.5, right twice -1), the player's level without it.
function eloOld(rows) {
  const P = {},
    R = {},
    H = {},
    trust = C.trustOf(rows);
  rows
    .slice()
    .sort((a, b) => a[1] - b[1])
    .forEach(r => {
      const fs = String(r[6] || '')
        .split(/\s+/)
        .filter(Boolean);
      if (!fs.length) return;
      const ok = r[4] ? 1 : 0,
        k = /\|k(\d)$/.exec(r[5]),
        n0 = String(r[10] || '')
          .split(/\s+/)
          .filter(Boolean).length,
        g = k ? 1 / Number(k[1]) : r[5].indexOf('quiz-duel') === 0 ? 0.5 : n0 >= 2 && n0 < 4 ? 1 / n0 : 0.25,
        ra = (R[r[0]] = R[r[0]] || [C.PLAYER0, 0]);
      const ph = fs.map(f => (P[f] = P[f] || [0, 0])),
        b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0),
        d = ok - (g + (1 - g) * sig(ra[0] - b)),
        n = ra[1],
        hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0]));
      if (trust[r[0]]) {
        const fam = hs.reduce((t, h) => t + (!h[0] ? C.PHOTO_W.NEW : h[1] >= 2 ? C.PHOTO_W.KNOWN : 0), 0) / hs.length,
          dp = ok - (g + (1 - g) * sig(ra[0] - b - fam)),
          w = n / (n + C.PHOTO_W.N);
        ph.forEach(p => {
          p[0] -= (0.8 / (1 + p[1] / 10) / ph.length) * dp * w;
          p[1] += w;
        });
      }
      ra[0] += (0.6 / (1 + n / 40)) * d;
      ra[1]++;
      hs.forEach(h => {
        h[0]++;
        h[1] += ok;
      });
    });
  return P;
}

// Sheet side.
const est = C.photoMemOf(rows),
  MEMV = opt('mem', null) ? opt('mem').split(',').map(Number) : est.mem,
  oldP = eloOld(rows),
  newP = C.eloOf(rows),
  dif = Object.keys(newP)
    .filter(f => oldP[f] && newP[f][1] > 0)
    .map(f => newP[f][0] - oldP[f][0]);
console.log(`${rows.length} answers, ${new Set(rows.map(r => r[0])).size} players`);
console.log(
  `Photo memory offsets (new, shown never right, right once, right twice or more): estimated ${est.mem.join(' / ')} from ${est.memn.join(' / ')} trusted answers; prior ${C.MEM.PRIOR.join(' / ')}${opt('mem', null) ? `; replay uses ${MEMV.join(' / ')}` : ''}`
);
if (dif.length) {
  const m = dif.reduce((a, x) => a + x, 0) / dif.length,
    ma = dif.reduce((a, x) => a + Math.abs(x), 0) / dif.length,
    big = dif.filter(x => Math.abs(x) >= 0.3).length;
  console.log(
    `Photo ratings, new - old, over ${dif.length} rated photos: mean ${m.toFixed(2)} (a photo is now rated for a player meeting it first), mean |change| ${ma.toFixed(2)}, ${big} move 0.3 or more`
  );
}

// App side, per player: core.js replayProgress, the full replay the admin shows (docs/LEARNING.md "Full replay"), under
// the rule before the photo memory (memory: false) and today's. The opening hold (model.js holdNext, INTRO.SLACK 0.1) on
// each rule's expectation, from the difficulty the replay recovers.
const opts = {gen: GEN, mem: MEMV, conf: C.confusionOf(rows).pair},
  hold = {},
  run = memory =>
    C.replayProgress(rows, {
      ...opts,
      memory,
      onAnswer: (r, {d, fam, k}) => {
        const h = (hold[r[0]] = hold[r[0]] || {old: 0, new: 0}),
          e = 1 / k + (1 - 1 / k) * sig(r[8] - d - fam);
        h[memory ? 'new' : 'old'] = Math.max(0, h[memory ? 'new' : 'old'] + e - (r[4] ? 1 : 0) - 0.1);
      }
    }),
  OLD = run(false),
  NEW = run(true);
const bar = pg => Math.round(95 * Math.min(1, pg / C.PROG.M));
for (const [id, pl] of Object.entries(NEW)) {
  if ((ONLY && id !== ONLY) || pl.used < MIN) continue;
  const gs = Object.entries(pl.P)
    .filter(([name]) => name !== C.LEVEL)
    .map(([name, g]) => {
      const o = OLD[id].P[name];
      // What the app's silent recalculation (core.js memRecalc) makes of the old-rule progress, from the genus's photos alone.
      const rc = (x => (C.memRecalc(x, MEMV), x.pg))({pg: o.pg, ps: JSON.parse(JSON.stringify(o.ps))});
      return [name, {n: g.ok + g.ko, old: o.pg, new: g.pg, rc}];
    }),
    pct = k => Math.round(gs.reduce((a, [, g]) => a + bar(g[k]), 0) / Math.max(1, gs.length)),
    h = hold[id] || {old: 0, new: 0};
  console.log(
    `\n${id}: ${pl.n} answers (${pl.used} replayed), ${Math.round((100 * pl.rep) / pl.n)}% on a photo already shown; mean bar over the ${gs.length} genera answered ${pct('old')}% -> ${pct('new')}% (silent recalculation ${pct('rc')}%); opening hold ${h.old.toFixed(2)} -> ${h.new.toFixed(2)} (holds at 1.5)`
  );
  gs.filter(([, g]) => g.n >= MIN)
    .sort((a, b) => b[1].n - a[1].n)
    .forEach(([name, g]) => console.log(`  ${name.padEnd(16)} ${String(g.n).padStart(3)} answers  bar ${bar(g.old)}% -> ${bar(g.new)}% (silent recalculation ${bar(g.rc)}%)`));
}

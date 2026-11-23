// REE-191: what the game served each player in answers 51-300 (read from the scoring record, Answers column W):
// the photo's difficulty against its unit's offset (d - m, logits; d includes +0.5 for one photo alone), by format,
// with the share right; and the share of misses that named a unit (a false alarm on it). Aggregates per P id.
//   node served.js answers.json <main worktree>
const fs = require('fs'),
  path = require('path');
const C = require(path.join(path.resolve(process.argv[3]), 'core.js'));
const V = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).values.slice(1);
const mean = a => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : NaN);
for (const sid of ['coral', 'fish']) {
  const by = {};
  C.subjRows(V, sid).forEach(r => r[0] && (by[r[0]] = by[r[0]] || []).push(r));
  for (const [p, rs] of Object.entries(by)) {
    if (rs.length < 100) continue;
    const w = rs.slice(50, 300),
      cell = {};
    w.forEach(r => {
      const sc = C.scoreRec(r[22]),
        m = String(r[5]),
        k = C.kOf(m, r[11]),
        f = /duel/.test(m) ? 'duel' : k === Infinity ? 'typed' : k <= 2 ? 'k2' : k === 3 ? 'k3' : 'k4';
      const c = (cell[f] = cell[f] || {n: 0, ok: 0, dm: []});
      c.n++;
      c.ok += Number(r[4]) ? 1 : 0;
      if (sc && typeof sc.m === 'number') c.dm.push(sc.d - sc.m);
    });
    const line = Object.entries(cell)
      .map(([f, c]) => `${f} ${c.n} (${Math.round((100 * c.ok) / c.n)}% right, d-m ${isNaN(mean(c.dm)) ? '-' : mean(c.dm).toFixed(2)})`)
      .join('; ');
    console.log(sid, p, 'answers 51-300:', line);
  }
}

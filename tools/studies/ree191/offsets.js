// The format offsets the game logged (scoring record o, t, s) on typed and on 4-plausible coral rows: medians.
const fs = require('fs'),
  path = require('path');
const C = require(path.join(path.resolve(process.argv[3]), 'core.js'));
const V = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).values.slice(1);
for (const sid of ['coral', 'fish']) {
  const g = {};
  C.subjRows(V, sid).forEach(r => {
    const sc = C.scoreRec(r[22]);
    if (!sc) return;
    const k = C.kOf(r[5], r[11]),
      f = k === Infinity ? 'typed' : k >= 4 ? 'k4' : 'k' + k;
    const x = (g[f] = g[f] || {o: [], t: [], s: [], n: 0, ok: 0});
    x.o.push(sc.o || 0);
    x.t.push(sc.t || 0);
    x.s.push(sc.s || 1);
    x.n++;
    x.ok += Number(r[4]) ? 1 : 0;
  });
  const med = a => a.sort((p, q) => p - q)[Math.floor(a.length / 2)];
  Object.entries(g).forEach(([f, x]) => console.log(sid, f, 'n', x.n, 'right', Math.round((100 * x.ok) / x.n) + '%', 'o', med(x.o), 't', med(x.t), 's', med(x.s)));
}

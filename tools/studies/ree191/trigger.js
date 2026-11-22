// REE-191: would a typed share keyed on the unit's ability (threshold T) fire for the "others", and early for the strong?
// From the Answers tab's logged Ability (the unit's Elo when asked) on the player's answers while the unit has had at most
// 7 own answers before (its bar mostly under 50%: Open Water took a median 5.5-8). Per player: in the first 50, 100 and
// 200 answers of the subject, the share of answers with ability >= T on such a young unit; and the own-answer index at
// which a unit first reaches T (median over units). Groups as summary.js (pace-out.json). Aggregates only.
//   node trigger.js answers.json <main> [T]
const fs = require('fs'),
  path = require('path');
const [AF, MAIN, TS] = process.argv.slice(2);
const T = Number(TS || 1.5);
const C = require(path.join(path.resolve(MAIN), 'core.js'));
const V = JSON.parse(fs.readFileSync(AF, 'utf8')).values.slice(1);
const O = JSON.parse(fs.readFileSync(path.join(__dirname, 'pace-out.json'), 'utf8')).filter(o => !o.small);
const med = a => {
  const s = a.slice().sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
for (const sid of ['coral', 'fish']) {
  const P = O.filter(o => o.sid === sid),
    strong = new Set(P.filter(o => o.acc50 >= 0.94 && o.sec50 != null && o.sec50 <= 2.6).map(o => o.p)),
    others = new Set(P.filter(o => !strong.has(o.p) && o.n >= 100).map(o => o.p));
  const by = {};
  C.subjRows(V, sid).forEach(r => r[0] && (by[r[0]] = by[r[0]] || []).push(r));
  const res = {strong: [], others: []};
  for (const [p, rs] of Object.entries(by)) {
    const g = strong.has(p) ? 'strong' : others.has(p) ? 'others' : null;
    if (!g) continue;
    const own = {},
      reach = {},
      hit = [];
    rs.forEach((r, i) => {
      const u = r[2],
        k = (own[u] = (own[u] || 0) + 1) - 1,
        th = r[9] === '' ? null : Number(r[9]);
      const young = k <= 7,
        fire = young && th != null && th >= T;
      hit.push(fire ? 1 : 0);
      if (th != null && th >= T && reach[u] == null) reach[u] = k + 1;
    });
    const sh = n => (rs.length >= n ? Math.round((100 * hit.slice(0, n).reduce((a, b) => a + b, 0)) / n) : null);
    res[g].push({s50: sh(50), s100: sh(100), s200: sh(200), reachMed: med(Object.values(reach)), reached: Object.keys(reach).length, units: Object.keys(own).length});
  }
  for (const [g, L] of Object.entries(res)) {
    const f = k => {
      const v = L.map(x => x[k]).filter(x => x != null);
      return v.length ? `${med(v)} (${Math.min(...v)}-${Math.max(...v)}, ${v.length} players)` : '-';
    };
    console.log(`${sid} ${g} T ${T}: share of answers firing in first 50: ${f('s50')}; 100: ${f('s100')}; 200: ${f('s200')}; own answer at which a unit first reaches T, median: ${f('reachMed')}`);
  }
}

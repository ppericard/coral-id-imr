// REE-191 check: this study's replay (pace.js's: replayProgress with the units' look-alikes only) against the sheet's own
// replay (the Replayed / Replayed Fish tabs, which pass the first-launch answers, the stats' offsets, memory, confusions
// and the fish structure in force), on the same rows: the % each gives. Names are read in memory only to join the tabs;
// the output names P ids only (the same order as combine.js).
//   node validate.js <main> replayed.txt replayedfish.txt progress.txt chunk1 chunk2 ...
const fs = require('fs'),
  path = require('path');
const [MAIN, RP, RPF, PD, ...chunks] = process.argv.slice(2);
const C = require(path.join(path.resolve(MAIN), 'core.js'));
let raw = [];
for (const f of chunks) raw = raw.concat(JSON.parse(fs.readFileSync(f, 'utf8')).values);
raw = raw.slice(1);
const map = new Map();
raw.forEach(r => {
  const n = String(r[0] || '');
  if (n && !map.has(n)) map.set(n, 'P' + (map.size + 1));
});
const num = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));
const rowOf = (r, i) => [r[0], Date.parse(String(r[1]).replace(' ', 'T') + ':00+08:00') + i, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6]), num(r[8]), num(r[9]), num(r[10]), String(r[11] || ''), null, num(r[12]), ...new Array(C.LOG_SC - 13).fill(null), C.scoreRec(r[22])];
const J = f => JSON.parse(fs.readFileSync(path.join(MAIN, f), 'utf8'));
const data = J('data.json'),
  F = J('fish.json');
const slate = C.slateOf(data),
  tree = C.treeBoardTree(F),
  K = C.subjectOf('fish').score;
const S = {
  coral: {gen: C.genLooks(data), pct: P => C.pctOf(P, slate), tab: RP},
  fish: {gen: C.treeReplayGen(F), pct: P => C.treeScore(P, tree, K).pct, tab: RPF}
};
// first-launch answers, where the Progress data tab holds them
const starts = {};
JSON.parse(fs.readFileSync(PD, 'utf8'))
  .values.slice(1)
  .forEach(r => {
    let d;
    try {
      d = JSON.parse(r[2]);
    } catch (e) {
      return;
    }
    for (const s of ['coral', 'fish']) {
      const v = d['reefid-sync-' + s + '-start'];
      if (v && map.has(String(r[0]))) (starts[s] = starts[s] || {})[String(r[0])] = JSON.parse(v);
    }
  });
for (const sid of ['coral', 'fish']) {
  const by = {};
  C.subjRows(raw, sid).forEach((r, i) => r[0] && (by[r[0]] = by[r[0]] || []).push(rowOf(r, i)));
  const T = JSON.parse(fs.readFileSync(S[sid].tab, 'utf8')).values.slice(1);
  for (const r of T) {
    const name = String(r[0]),
      n = Number(r[2]);
    if (!map.has(name) || !n || !by[name]) continue;
    let rec;
    try {
      rec = JSON.parse(r.slice(5).join(''));
    } catch (e) {
      continue;
    }
    const rs = by[name].slice().sort((a, b) => a[1] - b[1]).slice(0, n);
    const st = (starts[sid] || {})[name];
    const mine = C.replayProgress(rs, {gen: S[sid].gen})[name].P,
      withStart = st ? C.replayProgress(rs, {gen: S[sid].gen, starts: {[name]: st}})[name].P : null;
    const lv = P => (P[C.LEVEL] ? P[C.LEVEL].th.toFixed(2) : '-');
    console.log(
      `${sid} ${map.get(name)} rows ${n}/${by[name].length}: sheet ${S[sid].pct(rec)}% lv ${lv(rec)} | this study ${S[sid].pct(mine)}% lv ${lv(mine)}` +
        (withStart ? ` | with the first-launch answer (${st.c}) ${S[sid].pct(withStart)}% lv ${lv(withStart)}` : '')
    );
  }
}

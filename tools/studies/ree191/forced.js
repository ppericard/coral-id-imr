// REE-191: what limits a player's %: the questions the game served, or their misses? Each player's own rows replayed
// as they were, then with every answer forced right (the unit shown given), the questions unchanged (same units, photos,
// formats, order). Per checkpoint: actual % / forced-right %.
//   node forced.js answers.json <main>
const fs = require('fs'),
  path = require('path');
const [AF, MAIN] = process.argv.slice(2);
const C = require(path.join(path.resolve(MAIN), 'core.js'));
const V = JSON.parse(fs.readFileSync(AF, 'utf8')).values.slice(1);
const num = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));
const rowOf = (r, i) => [r[0], Date.parse(String(r[1]).replace(' ', 'T') + ':00+08:00') + i, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6]), num(r[8]), num(r[9]), num(r[10]), String(r[11] || ''), null, num(r[12]), ...new Array(C.LOG_SC - 13).fill(null), C.scoreRec(r[22])];
const J = f => JSON.parse(fs.readFileSync(path.join(MAIN, f), 'utf8'));
const data = J('data.json'),
  F = J('fish.json');
const slate = C.slateOf(data),
  tree = C.treeBoardTree(F),
  K = C.subjectOf('fish').score;
const S = {coral: {gen: C.genLooks(data), pct: P => C.pctOf(P, slate)}, fish: {gen: C.treeReplayGen(F), pct: P => C.treeScore(P, tree, K).pct}};
for (const sid of ['coral', 'fish']) {
  const by = {};
  C.subjRows(V, sid).forEach((r, i) => r[0] && (by[r[0]] = by[r[0]] || []).push(rowOf(r, i)));
  for (const [p, rs0] of Object.entries(by)) {
    const rs = rs0.slice().sort((a, b) => a[1] - b[1]);
    if (rs.length < 200) continue;
    // forced right: answered = shown, right; a logged expectation kept (the question's difficulty is recovered from it)
    const fr = rs.map(r => {
      const x = r.slice();
      x[3] = x[2];
      x[4] = 1;
      return x;
    });
    const cell = k => {
      if (rs.length < k) return '-';
      const a = S[sid].pct(C.replayProgress(rs.slice(0, k), {gen: S[sid].gen})[p].P),
        b = S[sid].pct(C.replayProgress(fr.slice(0, k), {gen: S[sid].gen})[p].P);
      return `${a}/${b}`;
    };
    const right = Math.round((100 * rs.slice(0, 300).reduce((t, r) => t + r[4], 0)) / Math.min(300, rs.length));
    console.log(sid, p, `right in first 300: ${right}%`, [100, 200, 300, 500].map(k => `${k}: ${cell(k)}`).join(' | '));
  }
}

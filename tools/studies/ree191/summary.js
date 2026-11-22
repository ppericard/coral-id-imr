// REE-191: group summaries of pace-out.json. Strong = first 50 answers of the subject >= 94% right and median seconds
// <= 2.6 (declared from Pierre's words "fast and right from the first answers"); others = every other player with 100+
// answers in the subject. Per checkpoint: number of players, median and range of the shown %, units met, units at
// Open Water (50%) and Advanced (80%).
const fs = require('fs'),
  path = require('path');
const O = JSON.parse(fs.readFileSync(path.join(__dirname, 'pace-out.json'), 'utf8')).filter(o => !o.small);
const med = a => {
  const s = a.slice().sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
for (const sid of ['coral', 'fish']) {
  const P = O.filter(o => o.sid === sid);
  const strong = P.filter(o => o.acc50 >= 0.94 && o.sec50 != null && o.sec50 <= 2.6);
  const others = P.filter(o => !strong.includes(o) && o.n >= 100);
  console.log(`\n${sid}: strong ${strong.length} (acc50 ${strong.map(o => o.acc50.toFixed(2)).join(',')}; sec50 ${strong.map(o => o.sec50).join(',')}), others ${others.length}`);
  for (const [g, L] of [['strong', strong], ['others', others]]) {
    for (const k of [50, 100, 200, 300, 400, 500]) {
      const c = L.map(o => o.cps.find(x => x.k === k)).filter(Boolean);
      if (!c.length) continue;
      const f = key => {
        const v = c.map(x => x[key]);
        return `${med(v)} (${Math.min(...v)}-${Math.max(...v)})`;
      };
      console.log(`| ${g} | ${k} | ${c.length} | ${f('score')} | ${f('met')} | ${f('ow')} | ${f('adv')} |`);
    }
    const x = L.map(o => o.adv_own_med).filter(v => v != null),
      y = L.map(o => o.ow_own_med).filter(v => v != null);
    console.log(`  ${g}: own answers on a unit when it first reached 50%: median over players ${med(y)} (${Math.min(...y)}-${Math.max(...y)}); 80%: ${x.length ? med(x) + ' (' + Math.min(...x) + '-' + Math.max(...x) + ', ' + x.length + ' players)' : 'none'}`);
    const ty = L.map(o => o.fmt.typed),
      k2 = L.map(o => o.fmt.k2),
      du = L.map(o => o.fmt.duel);
    console.log(`  ${g}: first 300 answers, typed ${med(ty)}% (${Math.min(...ty)}-${Math.max(...ty)}), 2 plausible ${med(k2)}% (${Math.min(...k2)}-${Math.max(...k2)}), duels ${med(du)}%`);
  }
}

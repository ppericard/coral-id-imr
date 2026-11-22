// REE-191: the pulse answers (Events kind pulse; core.js PULSEQ), by the level the game held when asked (Detail lv):
// 1.5 or more (the aim's floor, 75%) against under 1.5. Aggregates only; the answers' words as logged.
//   node pulse.js events.txt
const fs = require('fs');
const E = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).values.slice(1);
const tab = {};
E.forEach(r => {
  if (r[2] !== 'pulse' || /^(shown|show|skip)$/.test(r[3])) return;
  let d = {};
  try {
    d = JSON.parse(r[6] || '{}');
  } catch (e) {}
  const lv = typeof d.lv === 'number' ? d.lv : null;
  const band = lv == null ? 'no level' : lv >= 1.5 ? 'level 1.5+' : 'level < 1.5';
  const q = r[4] || '?';
  const k = q + ' | ' + band;
  (tab[k] = tab[k] || {})[r[3]] = ((tab[k] || {})[r[3]] || 0) + 1;
});
Object.keys(tab)
  .sort()
  .forEach(k => console.log(k, JSON.stringify(tab[k])));

// Events kinds, and the pace-related events per pseudonymous player (device -> P via the Answers' Device column).
// node events.js answers.json events.txt   — prints aggregates only (P ids, kinds, counts, short details)
const fs = require('fs');
const A = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).values;
const E = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).values;
const dev = {};
A.slice(1).forEach(r => r[24] && (dev[r[24]] = r[0]));
const kinds = {};
E.slice(1).forEach(r => (kinds[r[2]] = (kinds[r[2]] || 0) + 1));
console.log('kinds', kinds);
const want = /start|all|open|pulse|intro|fallback|choice|back|basics/i;
const out = {};
E.slice(1).forEach(r => {
  const k = String(r[2] || '');
  if (!want.test(k)) return;
  const p = dev[r[1]] || '?';
  const msg = String(r[3] || '').slice(0, 90);
  const key = p + ' | ' + k + ' | ' + msg;
  out[key] = (out[key] || 0) + 1;
});
Object.keys(out).sort().forEach(k => console.log(out[k], k));

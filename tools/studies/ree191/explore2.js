// Structure of the Replayed record and of the Progress data JSON (keys only, no values, no names).
const fs = require('fs');
const [rp, pd] = process.argv.slice(2);
const R = JSON.parse(fs.readFileSync(rp, 'utf8')).values;
console.log('Replayed header', R[0]);
const r = R.find((x, i) => i && x[2] > 100);
const rec = JSON.parse(r.slice(5).join(''));
console.log('record keys', Object.keys(rec).slice(0, 20), typeof rec);
for (const k of Object.keys(rec).slice(0, 3)) console.log(k, JSON.stringify(rec[k]).slice(0, 300));
const D = JSON.parse(fs.readFileSync(pd, 'utf8')).values;
console.log('Progress header', D[0]);
const d = JSON.parse(D.find((x, i) => i && String(x[2]).length > 1000)[2]);
console.log('data keys', Object.keys(d));
for (const k of Object.keys(d).filter(k => /start|intro/.test(k))) console.log(k, String(d[k]).slice(0, 400));

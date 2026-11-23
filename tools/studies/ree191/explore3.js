// Union of Progress data keys (no values) and one start / intro record's shape.
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).values.slice(1);
const keys = {};
let ex = {};
D.forEach(r => {
  let d;
  try {
    d = JSON.parse(r[2]);
  } catch (e) {
    return;
  }
  Object.keys(d).forEach(k => {
    keys[k] = (keys[k] || 0) + 1;
    if (/start|intro|all/.test(k) && !ex[k]) ex[k] = String(d[k]).slice(0, 300);
  });
});
console.log(keys);
console.log(ex);

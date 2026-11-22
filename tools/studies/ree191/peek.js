// Peek at an answers extract: row count, column count histogram, first/last row.
const fs = require('fs');
const f = process.argv[2];
let d = JSON.parse(fs.readFileSync(f, 'utf8'));
if (d.values) d = d.values;
if (d.rows) d = d.rows;
console.log('rows', d.length);
const h = {};
for (const r of d) h[r.length] = (h[r.length] || 0) + 1;
console.log('cols', h);
console.log(JSON.stringify(d[0]).slice(0, 400));
console.log(JSON.stringify(d[d.length - 1]).slice(0, 600));

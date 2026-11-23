// Combine the Answers tab chunks (read-only MCP reads, in tab order) into one pseudonymised extract.
// node combine.js out.json chunk1 chunk2 ...   (chunk 1 holds the header)
// Names become P1, P2... by first appearance; nothing else changes. The name map is never written.
const fs = require('fs');
const [out, ...files] = process.argv.slice(2);
let rows = [];
for (const f of files) rows = rows.concat(JSON.parse(fs.readFileSync(f, 'utf8')).values);
const H = rows[0];
if (H[0] !== 'Name') throw new Error('first chunk must start with the header');
const map = new Map();
const body = rows.slice(1).map(r => {
  const n = String(r[0] || '');
  if (n && !map.has(n)) map.set(n, 'P' + (map.size + 1));
  return [n ? map.get(n) : '', ...r.slice(1)];
});
fs.writeFileSync(out, JSON.stringify({values: [H, ...body]}));
console.log('rows', body.length, 'players', map.size, 'first', body[0][1], 'last', body[body.length - 1][1]);

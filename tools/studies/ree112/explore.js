// Orientation: coral rows as Code.gs builds them, core eloOf against the served ratings, counts.
const fs = require('fs');
const C = require('/home/user/coral-id-imr/.claude/worktrees/placement-shrinkage/core.js');
const RAW = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ST = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const atOf = t => Date.parse(String(t).replace(' ', 'T') + ':00+08:00');
const num = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));
// tab row r (q351 format): [idx, label, Time(2), shown(3), answered(4), right(5), mode(6), photos(7), id(8), e(9), th(10),
// new(11), choices(12), sec(13), zoom(14), utc(15), typed(16), retyped(17), subject(18), rank(19)]
const coral = RAW.filter(r => (r[18] || '') === '' || r[18] === 'coral').filter(r => String(r[6] || '') !== C.WINK_MODE);
const rows = coral
  .map(r => {
    const a = [r[1], atOf(r[2]), String(r[3]), String(r[4]), Number(r[5]) ? 1 : 0, String(r[6]), String(r[7]), num(r[9]), num(r[10]), num(r[11]), String(r[12] || ''), null, num(r[13]), r[14] === '' ? null : num(r[14])];
    while (a.length < 18) a.push(null);
    a.push(String(r[19] || ''));
    a.idx = r[0];
    return a;
  })
  .sort((a, b) => a[1] - b[1] || a.idx - b.idx);
console.log('coral rows', rows.length, 'from', new Date(rows[0][1]).toISOString(), 'to', new Date(rows[rows.length - 1][1]).toISOString());
const E = C.eloOf(rows);
let n = 0,
  same = 0,
  maxd = 0;
Object.keys(ST.photos).forEach(f => {
  if (!E[f]) return;
  n++;
  const d = Math.abs(E[f][0] - ST.photos[f][0]);
  maxd = Math.max(maxd, d);
  if (d < 0.011 && E[f][3] === ST.photos[f][3]) same++;
});
console.log('served photos', Object.keys(ST.photos).length, 'replayed', Object.keys(E).length, 'both', n, 'same within 0.01 and count', same, 'max diff', maxd.toFixed(3));
// photos per question, items, first sight
const npc = {};
const items = {};
const seen = {};
let first = 0;
rows.forEach(r => {
  const fsx = r[6].split(/\s+/).filter(Boolean);
  npc[fsx.length] = (npc[fsx.length] || 0) + 1;
  const key = fsx.slice().sort().join(' ');
  items[key] = (items[key] || 0) + 1;
  const nw = fsx.every(f => !seen[r[0] + '|' + f]);
  if (nw && fsx.length) first++;
  fsx.forEach(f => (seen[r[0] + '|' + f] = 1));
});
console.log('photos per question', npc, 'distinct photo sets', Object.keys(items).length, 'first-sight answers', first);
const ic = Object.values(items).sort((a, b) => a - b);
console.log('answers per photo set: median', ic[ic.length >> 1], 'max', ic[ic.length - 1], '>=5', ic.filter(x => x >= 5).length, '>=10', ic.filter(x => x >= 10).length);
// how many photo sets share a photo with another set
const byPhoto = {};
Object.keys(items).forEach(k => k.split(' ').forEach(f => (byPhoto[f] = (byPhoto[f] || 0) + 1)));
console.log('photos in more than one set', Object.values(byPhoto).filter(x => x > 1).length, 'of', Object.keys(byPhoto).length);
// answers by date
const day = {};
rows.forEach(r => {
  const d = new Date(r[1] + 8 * 3600e3).toISOString().slice(0, 10);
  day[d] = (day[d] || 0) + 1;
});
console.log(JSON.stringify(day));
const tr = C.trustOf(rows);
console.log('players', new Set(rows.map(r => r[0])).size, 'trusted', Object.values(tr).filter(Boolean).length);

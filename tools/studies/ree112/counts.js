// Design counts only (never the Right column): held-out sets of two candidate splits, by fit-count bucket.
const fs = require('fs');
const C = require('/home/user/coral-id-imr/.claude/worktrees/placement-shrinkage/core.js');
const RAW = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const atOf = t => Date.parse(String(t).replace(' ', 'T') + ':00+08:00');
const coral = RAW.filter(r => ((r[18] || '') === '' || r[18] === 'coral') && String(r[6] || '') !== C.WINK_MODE).map(r => ({p: r[1], at: atOf(r[2]), i: r[0], g: String(r[3]), fs: String(r[7]).split(/\s+/).filter(Boolean)}));
coral.sort((a, b) => a.at - b.at || a.i - b.i);
const seen = {},
  nth = {};
coral.forEach(a => {
  a.n = nth[a.p] = (nth[a.p] || 0) + 1;
  a.first = a.fs.length > 0 && a.fs.every(f => !seen[a.p + '|' + f]);
  a.fs.forEach(f => (seen[a.p + '|' + f] = 1));
});
const B = n => (n === 0 ? '0' : n <= 2 ? '1-2' : n <= 4 ? '3-4' : n <= 9 ? '5-9' : '10+');
function tab(name, held, fitCount) {
  const by = {},
    ph = {};
  held.forEach(a => {
    const f = a.fs[0],
      b = B(fitCount(a));
    by[b] = by[b] || {ans: 0, photos: new Set()};
    by[b].ans++;
    by[b].photos.add(f);
    (ph[f] = ph[f] || new Set()).add(a.p);
  });
  const multi = Object.values(ph).filter(s => s.size >= 2).length;
  console.log(name, 'held-out answers', held.length, 'photos', Object.keys(ph).length, 'photos with 2+ players', multi);
  ['0', '1-2', '3-4', '5-9', '10+'].forEach(b => by[b] && console.log('  fit count', b, 'answers', by[b].ans, 'photos', by[b].photos.size));
}
const base = a => a.first && a.fs.length === 1 && a.n > 20;
// leave one player out: fit count = other players' answers on the photo (any question showing it)
const cnt = {};
coral.forEach(a => a.fs.forEach(f => ((cnt[f] = cnt[f] || {}), (cnt[f][a.p] = (cnt[f][a.p] || 0) + 1))));
const others = a => Object.entries(cnt[a.fs[0]]).reduce((t, [p, n]) => t + (p === a.p ? 0 : n), 0);
tab('LOPO (after answer 20)', coral.filter(base), others);
tab('LOPO (all)', coral.filter(a => a.first && a.fs.length === 1), others);
const T = atOf('2026-11-05 23:59') + 60e3;
const before = {};
coral.filter(a => a.at < T).forEach(a => a.fs.forEach(f => (before[f] = (before[f] || 0) + 1)));
tab('date cut 5 Nov (after answer 20)', coral.filter(a => a.at >= T && base(a)), a => before[a.fs[0]] || 0);
// today's counts of the calibration members and all photos
const cs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const mem = Object.values(cs.coral).flat();
const tot = f => Object.values(cnt[f] || {}).reduce((t, n) => t + n, 0);
const hist = L => ['0', '1-2', '3-4', '5-9', '10+'].map(b => b + ':' + L.filter(n => B(n) === b).length).join(' ');
console.log('calibration members today', hist(mem.map(tot)));
console.log('all photos today', hist(Object.keys(cnt).map(tot)));

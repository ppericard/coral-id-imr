// REE-191: how fast progress moves in a player's first answers, per subject, replayed with today's engine.
// Read-only: reads the pseudonymised extract and the repo's core.js / data files (origin/main worktree), writes
// pace-out.json in this folder. Players are P1, P2... only.
//   node pace.js answers.json <main worktree> [maxN]
const fs = require('fs'),
  path = require('path');
const [, , AF, MAIN, MAXS] = process.argv;
const MAXN = Number(MAXS) || 600,
  STEP = 10;
const C = require(path.join(path.resolve(MAIN), 'core.js'));
const V = JSON.parse(fs.readFileSync(AF, 'utf8')).values;
const body = V.slice(1);
const num = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));
// The sheet's rowOf_ (Code.gs), the time from the tab's minute; ties keep the tab's order (+i ms).
const rowOf = (r, i) => [
  r[0],
  Date.parse(String(r[1]).replace(' ', 'T') + ':00+08:00') + i,
  String(r[2]),
  String(r[3]),
  Number(r[4]) ? 1 : 0,
  String(r[5]),
  String(r[6]),
  num(r[8]),
  num(r[9]),
  num(r[10]),
  String(r[11] || ''),
  null,
  num(r[12]),
  ...new Array(C.LOG_SC - 13).fill(null),
  C.scoreRec(r[22])
];
const median = a => {
  const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
const mean = a => {
  const s = a.filter(x => x != null && isFinite(x));
  return s.length ? s.reduce((t, x) => t + x, 0) / s.length : null;
};
const J = f => JSON.parse(fs.readFileSync(path.join(MAIN, f), 'utf8'));
const data = J('data.json'),
  F = J('fish.json');
const SUBJ = {
  coral: {
    gen: C.genLooks(data),
    main: new Set(C.slateOf(data)),
    score: P => C.pctOf(P, C.slateOf(data))
  },
  fish: (() => {
    const tree = C.treeBoardTree(F),
      K = C.subjectOf('fish').score;
    return {
      gen: C.treeReplayGen(F),
      main: null, // families: keys f:
      isMain: u => /^f:/.test(u),
      score: P => C.treeScore(P, tree, K).pct,
      entries: P => C.treeScore(P, tree, K).entries
    };
  })()
};
SUBJ.coral.isMain = u => SUBJ.coral.main.has(u);
const out = [];
for (const sid of ['coral', 'fish']) {
  const S = SUBJ[sid];
  const rowsAll = C.subjRows(body, sid).filter(r => r[0] && r[2]);
  const by = {};
  rowsAll.forEach((r, i) => (by[r[0]] = by[r[0]] || []).push(rowOf(r, i)));
  for (const [p, rs0] of Object.entries(by)) {
    const rs = rs0.slice().sort((a, b) => a[1] - b[1]);
    const n = rs.length;
    if (n < 50) {
      out.push({sid, p, n, small: true});
      continue;
    }
    const first = k => rs.slice(0, k);
    const acc = k => mean(first(k).map(r => r[4]));
    const sec = k => median(first(k).map(r => r[12]));
    const surp = k => mean(first(k).filter(r => r[7] != null).map(r => r[4] - r[7]));
    const days = new Set(rs.map(r => new Date(r[1] + 8 * 3600e3).toISOString().slice(0, 10))).size;
    const cps = [];
    const cross = {}; // unit -> {ow: own answers when first >= .5, adv: >= .8}
    const seen = new Set();
    let si = 0;
    const top = Math.min(n, MAXN),
      ks = [];
    for (let k = STEP; k < top; k += STEP) ks.push(k);
    ks.push(top);
    for (const kk of ks) {
      while (si < kk) seen.add(rs[si++][2]);
      const res = C.replayProgress(rs.slice(0, kk), {gen: S.gen})[p];
      const P = res.P;
      const units = Object.keys(P).filter(u => S.isMain(u));
      let ow = 0,
        adv = 0,
        dm = 0,
        mx = 0;
      units.forEach(u => {
        const b = C.scoreOf(P[u], P, u),
          own = (P[u].ok || 0) + (P[u].ko || 0);
        if (b >= 0.5) ow++;
        if (b >= 0.8) adv++;
        if (b >= C.DOM.EX) dm++;
        if (P[u].mx) mx++;
        const c = (cross[u] = cross[u] || {});
        if (b >= 0.5 && c.ow == null) c.ow = own;
        if (b >= 0.8 && c.adv == null) c.adv = own;
      });
      const met = [...seen].filter(u => S.isMain(u)).length;
      // the false alarms' cost: the mean over the main units answered of (domain score capped at 95%) - bar, in points
      const fa = units.map(u => Math.min(0.95, P[u].ds || 0) - C.barOf(P[u], P, u));
      const faPts = fa.length ? (100 * fa.reduce((t, x) => t + x, 0)) / fa.length : 0;
      // own answers per main unit answered: median
      const ownMed = (a => (a.length ? a.sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0))(units.map(u => (P[u].ok || 0) + (P[u].ko || 0)));
      cps.push({
        k: kk,
        score: S.score(P),
        entries: S.entries ? Math.round(100 * S.entries(P)) : undefined,
        met,
        ow,
        adv,
        dm,
        mx,
        lv: P[C.LEVEL] ? P[C.LEVEL].th : null,
        faPts: Math.round(faPts * 10) / 10,
        ownMed
      });
    }
    const cr = Object.values(cross);
    // Formats in the first 300 answers (core.js kOf: k plausible choices; typed Infinity; duel 2 by its mode).
    const f300 = rs.slice(0, 300),
      fmt = {k2: 0, k3: 0, k4: 0, typed: 0, duel: 0};
    f300.forEach(r => {
      const m = String(r[5]),
        k = C.kOf(m, r[10]);
      if (/duel/.test(m)) fmt.duel++;
      else if (k === Infinity) fmt.typed++;
      else if (k <= 2) fmt.k2++;
      else if (k === 3) fmt.k3++;
      else fmt.k4++;
    });
    Object.keys(fmt).forEach(k => (fmt[k] = Math.round((100 * fmt[k]) / f300.length)));
    // Pace: answers among the first 300 where the last 15 answers already met OPEN.MAX (3) main units new to the player
    // (first answered: the proxy of an opening), so the pace cap would refuse another one.
    const firstAt = {};
    rs.forEach((r, i) => S.isMain(r[2]) && firstAt[r[2]] == null && (firstAt[r[2]] = i));
    const newAt = new Array(rs.length).fill(0);
    Object.values(firstAt).forEach(i => newAt[i]++);
    let sat = 0,
      cnt = 0;
    for (let i = 15; i < Math.min(300, rs.length); i++) {
      cnt++;
      if (newAt.slice(i - 15, i).reduce((a, b) => a + b, 0) >= 3) sat++;
    }
    const kinds = {};
    rs.slice(0, Math.min(n, MAXN)).forEach(r => {
      const k = /^(\w+):/.exec(r[2]);
      kinds[k ? k[1] : 'genus'] = (kinds[k ? k[1] : 'genus'] || 0) + 1;
    });
    out.push({
      fmt,
      paceSat: cnt ? Math.round((100 * sat) / cnt) : null,
      kinds,
      sid,
      p,
      n,
      days,
      acc50: acc(50),
      acc100: acc(Math.min(100, n)),
      sec50: sec(50),
      sec100: sec(Math.min(100, n)),
      surp100: surp(Math.min(100, n)),
      ow_own_med: median(cr.map(c => c.ow)),
      adv_own_med: median(cr.map(c => c.adv)),
      ow_units: cr.filter(c => c.ow != null).length,
      adv_units: cr.filter(c => c.adv != null).length,
      cps
    });
  }
}
fs.writeFileSync(path.join(__dirname, 'pace-out.json'), JSON.stringify(out, null, 1));
for (const o of out) {
  if (o.small) {
    console.log(o.sid, o.p, 'n', o.n, '(under 50)');
    continue;
  }
  const at = k => o.cps.find(c => c.k === k) || {};
  const f = (x, d = 2) => (x == null ? '-' : typeof x === 'number' ? x.toFixed(d) : x);
  console.log(
    [o.sid, o.p, 'n', o.n, 'days', o.days, 'acc50', f(o.acc50), 'sec50', f(o.sec50, 1), 'surp100', f(o.surp100), 'ow/adv own', f(o.ow_own_med, 0), f(o.adv_own_med, 0), 'paceSat', o.paceSat, 'fmt', JSON.stringify(o.fmt), 'kinds', JSON.stringify(o.kinds)].join(' '),
    '\n   ',
    [50, 100, 200, 300, 400, 500, 600].map(k => `${k}: ${f(at(k).score, 0)}%${at(k).entries != null ? ' (e' + at(k).entries + ')' : ''} met ${f(at(k).met, 0)} ow ${f(at(k).ow, 0)} adv ${f(at(k).adv, 0)} dm ${f(at(k).dm, 0)} lv ${f(at(k).lv)} fa ${f(at(k).faPts, 1)} own ${f(at(k).ownMed, 0)}`).join(' | ')
  );
}

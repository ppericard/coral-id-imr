// The first-launch question's fallback rule (core.js startCheck, model.js startStep; docs/LEARNING.md "The fallback test,
// redesigned"), scored on the traces of tools/learnsim.js and on the real answer log. Read-only: it never talks to the
// sheet; it prints aggregates only, the players numbered, never named.
//   node tools/learnsim.js --seeds 5 --questions 300 --choice new --fallback keep --out <dir>/t-new.json   (and imr, know)
//   node tools/fallbackeval.js <dir> [answers.json]        (the fish: learnsim --subject fish, the same way)
//   node tools/fallbackeval.js <run.json>                    one --out file, each run under its own answer (--choice auto)
// <dir>/t-new.json, t-imr.json, t-know.json: every profile under each answer, the card kept (learnsim records each run's
// first 80 answers: e, th, mode, first answer on its genus, the global level, the opening hold, the genera met after it;
// the window runs to the last checkpoint, core.js CHOICE.AT).
// Either subject: the runs' profiles, in tools/learnprof.js order, each with its truthful answer there (choiceOf: the
// beginner and the casual diver new, the lecture RA IMR course, the strong RA and the expert know well).
// The confusion matrix: per profile and declared answer, the cards ("lower", "higher"), the answer of the verdict, the
// share in the right direction and the true knowledge at q100 / q300 (or the runs' last checkpoint before) against the
// truthful answer's. Then the fit of each answer's prior: per profile and declared answer, the first 20 answers' mean
// surprise (right - e) and the global level at answers 20, 40 and 60 against the declared answer's band (core.js
// startBand). A card the subject never shows (UNITS startFb false: the fish, the sea slugs) is still scored: the verdict
// says whether the answers fit the band. answers.json: the sheet's Answers tab
// ({values: [[header], ...rows]}), each player's first 60 answers replayed under each answer (core.js replayProgress
// with the answer's prior), the genera met counted as the genera answered so far, the hold recomputed from the logged e.
// Players with fewer answers than the first checkpoint get no verdict.
const path = require('path'),
  fs = require('fs');
const W = path.join(__dirname, '..');
const C = require(path.join(W, 'core.js'));
const LP = require('./learnprof.js');
const ORDER = ['new', 'imr', 'know'],
  END = Math.max(...C.CHOICE.AT);
const gOf = m => (/\|t/.test(m) ? 0 : /\|k(\d+)/.test(m) ? 1 / Number(/\|k(\d+)/.exec(m)[1]) : /^quiz-duel/.test(m) ? 0.5 : 0.25);
const dOf = (e, th, g) => {
  const q = Math.min(0.995, Math.max(0.005, (e - g) / (1 - g)));
  return th - Math.log(q / (1 - q));
};
// The first verdict over a trace [{ok, e, th, m, first, lv, held, met}] for answer c, as the app's startStep keeps it.
function verdict(tr, c) {
  const w = [];
  let hd = 0;
  for (const a of tr) {
    if (w.length >= END) break;
    if (typeof a.e !== 'number' || typeof a.th !== 'number') continue;
    const g = gOf(a.m);
    w.push([Math.round(dOf(a.e, a.th, g) * 100) / 100, g, a.ok, a.first]);
    hd = hd || a.held;
    const v = C.startCheck(w, c, a.lv, a.met, hd);
    if (v && (v === 'lo' ? C.startNext(c, 'lo').length : C.startNext(c, 'hi').length)) return [v, w.length];
  }
  return null;
}
const mean = v => v.reduce((a, x) => a + x, 0) / v.length;

const sd = v => Math.sqrt(v.reduce((a, x) => a + (x - mean(v)) ** 2, 0) / Math.max(1, v.length - 1));
// The truthful answer of a profile (tools/learnprof.js choiceOf), 'new' for one run by name without any.
const truthOf = prof => LP.choiceOf(prof) || 'new';

// 1. Simulation. The runs of one learnsim --out file under answer c (a run's own answer first: --choice auto):
// {prof, c, tr, k100, k300}, the knowledge at the checkpoint, or at the last one before it in a shorter run.
function simRuns(d, c) {
  return d.runs.map(r => {
    const at = q => (r.rows.filter(x => x.q <= q).pop() || r.rows[0] || {}).knowSlate;
    return {prof: r.profile, c: r.choice || c, tr: r.early.tr, k100: at(100), k300: at(300)};
  });
}
// The tables (markdown lines) over runs R (simRuns of every answer).
function simTables(R) {
  const out = [],
    names = Object.keys(LP.PROFILES).filter(p => R.some(r => r.prof === p)).concat([...new Set(R.map(r => r.prof))].filter(p => !LP.PROFILES[p]));
  out.push('| profile (truthful) | declared | "lower" card | "higher" card | at answer | right direction | true knowledge q100 / q300 (truthful answer) |');
  out.push('|---|---|---|---|---|---|---|');
  let hit = 0,
    nhit = 0,
    fa = 0,
    nfa = 0;
  for (const prof of names)
    for (const c of ORDER) {
      const X = R.filter(r => r.prof === prof && r.c === c),
        T = R.filter(r => r.prof === prof && r.c === truthOf(prof));
      if (!X.length) continue;
      const res = X.map(r => verdict(r.tr, c)),
        lo = res.filter(x => x && x[0] === 'lo').length,
        hi = res.filter(x => x && x[0] === 'hi').length,
        want = c === truthOf(prof) ? null : ORDER.indexOf(c) > ORDER.indexOf(truthOf(prof)) ? 'lo' : 'hi',
        right = want ? res.filter(x => x && x[0] === want).length : 0,
        k = (A, f) => (A.length ? mean(A.map(f)).toFixed(2) : '-');
      if (want) ((hit += right), (nhit += X.length));
      else ((fa += lo + hi), (nfa += X.length));
      out.push(
        `| ${prof} (${truthOf(prof)}) | ${c}${want ? '' : ' (truthful)'} | ${lo}/${X.length} | ${hi}/${X.length} | ${res.filter(Boolean).map(x => x[1]).sort((a, b) => a - b).join(', ') || '–'} | ${want ? `${right}/${X.length} ${want === 'lo' ? 'lower' : 'higher'}` : '–'} | ${k(X, r => r.k100)} / ${k(X, r => r.k300)} (${k(T, r => r.k100)} / ${k(T, r => r.k300)}) |`
      );
    }
  out.push(`Wrong answers caught in the right direction: ${hit}/${nhit}; cards to truthful answers: ${fa}/${nfa}`);
  // The fit of each answer's prior: the first 20 answers' surprise (right - e; 0 when the prior fits) and the global
  // level at answers 20, 40, 60 (mean ± sd over the runs), and the share of runs inside the declared answer's band.
  const AT = [20, ...C.CHOICE.AT],
    fmt = (b, x) => (isFinite(x) ? x.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') : b);
  out.push('');
  out.push(`| profile (truthful) | declared (band) | surprise, first 20 | ${AT.map(n => `level at ${n}`).join(' | ')} | in the band at ${AT.join(' / ')} |`);
  out.push(`|---|---|---|${AT.map(() => '---').join('|')}|---|`);
  for (const prof of names)
    for (const c of ORDER) {
      const X = R.filter(r => r.prof === prof && r.c === c);
      if (!X.length) continue;
      const [f, ceil] = C.startBand(c),
        s = X.map(r => {
          const A = r.tr.slice(0, 20).filter(a => typeof a.e === 'number');
          return A.length ? mean(A.map(a => a.ok - a.e)) : 0;
        }),
        lv = n => X.map(r => (r.tr[n - 1] || r.tr[r.tr.length - 1] || {}).lv).filter(x => typeof x === 'number'),
        ms = v => (v.length ? `${mean(v).toFixed(2)} ± ${sd(v).toFixed(2)}` : '-'),
        inb = n => `${lv(n).filter(x => x >= f && x < ceil).length}/${lv(n).length}`;
      out.push(
        `| ${prof} (${truthOf(prof)}) | ${c}${c === truthOf(prof) ? ' (truthful)' : ''} (${fmt('−∞', f)} to ${fmt('∞', ceil)}) | ${ms(s)} | ${AT.map(n => ms(lv(n))).join(' | ')} | ${AT.map(inb).join(' / ')} |`
      );
    }
  return out;
}
module.exports = {verdict, simRuns, simTables, truthOf};
if (require.main === module) main();

// The command: the simulation's tables, then the real log's (answers.json).
function main() {
const [S, LOGF] = process.argv.slice(2);
if (!S) throw new Error('usage: node tools/fallbackeval.js <dir with t-new.json, t-imr.json, t-know.json> [answers.json] | <run.json>');
require('../tests/slot.js').guard('tools/fallbackeval.js'); // one heavy run at a time on the machine (tests/slot.js, rule W24)
// <dir> the three files, or one learnsim --out file (its runs' own answers: --choice auto).
const R = /\.json$/.test(S)
  ? simRuns(JSON.parse(fs.readFileSync(S, 'utf8')), 'new')
  : ORDER.flatMap(c => simRuns(JSON.parse(fs.readFileSync(path.join(S, `t-${c}.json`), 'utf8')), c));
console.log(simTables(R).join('\n'));

// 2. The real log (corals): each player's first END answers, replayed under each answer (the global level with its prior, as the
// sheet's replay steps it), the genera met as answered so far, the opening hold recomputed from the logged e (the sheet's
// hold_, the app's holdNext), the first answer on each genus.
if (LOGF) {
  const v = JSON.parse(fs.readFileSync(LOGF, 'utf8')).values,
    H = v[0],
    ix = Object.fromEntries(H.map((k, i) => [k, i]));
  const data = JSON.parse(fs.readFileSync(path.join(W, 'data.json'), 'utf8')),
    gen = {};
  [data.gen, data.x.gen].forEach(G => Object.keys(G).forEach(n => gen[n] || (gen[n] = {look: G[n].look || [], fam: String(G[n].fam || '')})));
  const by = {};
  C.subjRows(v.slice(1)).forEach(r => (by[r[0]] = by[r[0]] || []).push(r)); // the corals' rows (the Subject column)
  const players = Object.values(by)
    .map(rs => rs.sort((a, b) => String(a[ix.Time]).localeCompare(String(b[ix.Time]))))
    .filter(rs => rs.length >= C.CHOICE.AT[0] && rs.slice(0, END).every(r => r[ix.Expected] !== '' && r[ix.Expected] !== undefined))
    .sort((a, b) => b.length - a.length);
  console.log(`\nReal log: ${players.length} players with ${C.CHOICE.AT[0]} answers or more, their first ${END} logged with the expectation (aggregates only).`);
  console.log(`| player | answers | first-answer right (first ${END}) | under "new" | under "IMR course" | under "know well" |`);
  console.log('|---|---|---|---|---|---|');
  players.forEach((rs, pi) => {
    const id = 'p',
      rows = rs.slice(0, END).map(r => [
        id,
        Date.parse(String(r[ix.Time]).replace(' ', 'T') + ':00Z') + (r.__i = 0),
        r[ix['Genus shown']],
        r[ix.Answered],
        Number(r[ix.Right]) ? 1 : 0,
        r[ix.Mode] || 'quiz',
        r[ix.Photos] || '',
        r[ix.Expected] === '' ? null : Number(r[ix.Expected]),
        r[ix.Ability] === '' ? null : Number(r[ix.Ability]),
        null,
        r[ix.Choices] || ''
      ]);
    // Same-minute rows keep their order: a millisecond apart.
    rows.forEach((r, i) => (r[1] += i));
    const seen = new Set(),
      firsts = [];
    let h = 0;
    const base = rows.map(r => {
      const first = !seen.has(r[2]);
      seen.add(r[2]);
      if (first) firsts.push(r[4]);
      h = Math.max(0, Math.round((h + (r[7] || 0) - r[4] - 0.1) * 1000) / 1000);
      return {ok: r[4], e: r[7], th: r[8], m: r[5], first: first ? 1 : 0, held: h >= 1.5 ? 1 : 0, met: seen.size};
    });
    const cells = ORDER.map(c => {
      const start = {c, t: 0, h: [[c, 0, 0, 'tour']]},
        tr = base.map((a, i) => ({...a, lv: C.replayProgress(rows.slice(0, i + 1), {gen, starts: {[id]: start}})[id].P[C.LEVEL].th}));
      const x = verdict(tr, c);
      return x ? `${x[0] === 'lo' ? 'lower' : 'higher'} at ${x[1]}` : 'none';
    });
    console.log(`| ${pi + 1} | ${rs.length} | ${firsts.reduce((a, x) => a + x, 0)}/${firsts.length} | ${cells.join(' | ')} |`);
  });
}
}

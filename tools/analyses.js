// The admin's Analyses report (Pierre, 2026-11-04: "every 1000 new answers", computed once; rule L13 "compute
// once"): runs every analysis of analysis.js on the answer log, at each milestone (the first 1000, 2000, 3000, …
// answers: round thousands only, Pierre 2026-11-05), and stores the report in the sync sheet, where the admin reads it:
// the primary source. The admin's "Recompute here" runs the same code in its own tab, on any device (Pierre,
// 2026-11-05), and keeps its result there.
//   node tools/analyses.js --sheet [--force]   the GitHub Action (.github/workflows/analyses.yml): one report per
//                                             subject (core.js SUBJECTS analyses: the corals, then the fish; Pierre,
//                                             2026-11-08), each from its own answers (core.js subjRows): reads the log
//                                             with readAnswers and stores the report with analysesPut (sheet v35; one
//                                             stored report per subject from v113, AN_SUBJ_SHEET), both with the admin
//                                             token in ANALYSES_ADMIN_TOKEN; does nothing for a subject until the log
//                                             reaches a round thousand of that subject's answers (counted apart by the
//                                             sheet's head from v105; Pierre, 2026-11-08) its stored report does not
//                                             hold (or the code changed, or an account was removed since: sheet v55
//                                             stale), unless --force (plan)
//   node tools/analyses.js --in answers.json [--subject fish] --out report.json   a saved readAnswers reply (kept
//                                             outside the repo), one subject's answers (the corals' by default)
//   node tools/analyses.js --demo --out report.json              the admin demo's made-up answers, no network
// --boot N: bootstrap draws for the latest milestone (default 999, analysis.js BOOT); --boot-history N: for the earlier
// ones (default 199, until their answers add up to 60,000; none beyond: analysis.js report). Seeded: the same answers
// give the same report. With 999 draws the latest milestone takes about 1.7 minutes per 1000 answers (docs/LEARNING.md
// "Multifactor analyses", Runtimes); the job's limit is 2 hours. It prints counts only, never an id, a name
// or a player's number: the Actions
// log of a public repository is public. The report itself holds per-player results (anonymous ids): it goes to the
// sheet (private), never to the repo, an artifact or the log.
const fs = require('fs'),
  path = require('path');
const A = require('../analysis.js'),
  C = require('../core.js');
const ROOT = path.join(__dirname, '..');
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const MAX = 2400000; // under the sheet's 2.5 MB cap (Code.gs AN_MAX)
const SHEET_V = 35; // analysesGet / analysesPut

// The photos' features from the public files of this checkout, for a subject whose analyses read them (core.js SUBJECTS
// analyses photos: the corals'); none for another (the fish: What makes a photo hard is not among its pages).
const metaOf = (subject = C.replaySubject()) =>
  (C.subjectOf(subject).analyses || {}).photos
    ? {ph: A.photoMeta(rd('data.json'), rd('curation.json'), rd('quality.json'), rd('metrics.json'))}
    : {ph: {}};
// The subjects with an Analyses report (core.js SUBJECTS analyses), the replayed one (the corals) first: one report per
// subject (Pierre, 2026-11-08: each subject's analyses refitted every 1000 of its answers, "fish when the fish analyses
// exist").
const subjects = () => {
  const L = C.SUBJECTS.filter(S => S.analyses).map(S => S.id),
    r = C.replaySubject();
  return L.includes(r) ? [r, ...L.filter(x => x !== r)] : L;
};
const syncUrl = () => /const SYNC_URL = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'))[1];

// The newest milestone of n answers of the analysed subject (0: none yet; Pierre, 2026-11-08: every 1000 answers of
// that subject, the corals' never moved by the fish answers). A stored report holds every round thousand up to its
// answer count (analysis.js report), so this is also the newest milestone of the stored report, read from the sheet's
// cheap head.
const lastOf = n => Math.floor((Number(n) || 0) / A.STEP) * A.STEP;
// What the hourly run does with the sheet's head (answers: the analysed subject's answers; st: the stored report's meta or null): compute
// when the log reaches a round thousand the stored report does not hold (or fell below its newest: answers deleted),
// when the analysis code changed (AV), when an account left normal operation since the stored report (removed: sheet
// v55 head stale), or by hand (force); never before the first 1000 answers. Pure, tested.
// Returns {go, why: 'none' | 'wait' | 'first' | 'new' | 'code' | 'removed' | 'force', last: the stored report's newest milestone,
// now: the log's, next: the one after it}.
function plan(answers, st, force, removed) {
  const now = lastOf(answers),
    last = st ? lastOf(st.answers) : 0,
    next = now + A.STEP;
  // removed with no milestone left (answers deleted below the first): the stored report is replaced by an empty one
  const why = !now ? (st && removed ? 'removed' : 'none') : !st ? 'first' : now !== last ? 'new' : st.av !== A.AV ? 'code' : removed ? 'removed' : force ? 'force' : 'wait';
  return {go: why !== 'none' && why !== 'wait', why, last, now, next};
}
// The subject's name first (Corals: …): the log counts that subject's answers only.
const planText = (answers, p, subject = C.replaySubject()) =>
  `${C.subjectOf(subject).name}: ` +
  (p.now ? `${answers} answers, newest milestone ${p.now}: the next one at ${p.next}.` : `${answers} answers, no milestone yet: the first one at ${A.STEP}.`);
// The analysed subject's answers in the sheet's head: its own count from sheet v105 (counts), else every row of every
// subject (an older script: an upper bound, so the run read the whole log every hour to count the subject's, below).
const headCount = (head, subject) => (head.counts && typeof head.counts[subject] === 'number' ? head.counts[subject] : Number(head.answers) || 0);

// io: {post(body) -> reply, log(text)}; o: {force, B, Bh, subject: the analysed subject, the replayed one (the corals) by
// default}. Returns what happened, in a word.
async function sheetRun(io, token, o = {}) {
  const post = b => io.post({...b, token}),
    subject = o.subject || C.replaySubject();
  const head = await post({analysesGet: 1, head: 1, subject});
  if (!head || !head.ok) {
    if (head && head.error === 'input') {
      io.log(`The sync script answers as v${head.v || '?'}: the Analyses report needs v${SHEET_V}. Nothing done.`);
      return 'old';
    }
    io.log(`The sync script refused the admin token (${(head && head.error) || 'no reply'}). Nothing done.`);
    return 'refused';
  }
  // Another subject's report only from the script that stores one per subject (rule D4): an older one would answer with
  // the corals' stored report and store this one in its place.
  if (subject !== C.replaySubject() && (!(Number(head.v) >= A.AN_SUBJ_SHEET) || head.subject !== subject)) {
    io.log(`${C.subjectOf(subject).name}: the sync script answers as v${head.v || '?'}: one report per subject needs v${A.AN_SUBJ_SHEET}. Nothing done.`);
    return 'old';
  }
  const st = head.stored,
    // sheet v55: head.stale, an account deleted, merged or archived since the stored report: refit at once, from scratch
    // (no milestone reused), so no per-player result of a removed account stays in the report.
    stale = st && (st.av !== A.AV || !!head.stale),
    n = headCount(head, subject),
    p = plan(n, st, o.force, !!head.stale);
  if (!p.go) {
    io.log(planText(n, p, subject));
    return 'wait';
  }
  const prev = st && !stale ? await post({analysesGet: 1, subject}) : null;
  let old = null;
  try {
    old = prev && prev.report ? JSON.parse(prev.report) : null;
  } catch (e) {
    old = null;
  }
  const ans = await post({readAnswers: 1});
  if (!ans || !ans.ok || !Array.isArray(ans.rows)) {
    io.log(`Could not read the answer log (${(ans && ans.error) || 'no reply'}). Nothing done.`);
    return 'refused';
  }
  // The analyses are one subject's (the corals'): sheet v60 logs every subject's answers (core.js subjRows), counted as the
  // head counts them (subjCounts).
  const count = C.subjCounts(ans.rows)[subject] || 0;
  ans.rows = C.subjRows(ans.rows, subject);
  // Judged again on the log read: a script before v105 counted every subject's rows in its head.
  const q = plan(count, st, o.force, !!head.stale);
  if (!q.go) {
    io.log(planText(count, q, subject));
    return 'wait';
  }
  const t0 = Date.now(),
    rep = {...A.compact(A.report(ans.rows, metaOf(subject), old, {B: o.B, Bh: o.Bh, seed: 1}), MAX), subject},
    text = JSON.stringify(rep);
  if (text.length > MAX) {
    io.log(`The report is still ${Math.round(text.length / 1000)} kB after compaction, over the sheet's cap: not stored.`);
    return 'refused';
  }
  // sheet v55: the roster as the answers were read, so a removal during this run leaves the report stale (Codex #600)
  const put = await post({analysesPut: 1, report: text, ...(typeof ans.roster === 'number' ? {roster: ans.roster} : {})});
  if (!put || !put.ok) {
    io.log(`The sheet did not store the report (${(put && put.error) || 'no reply'}).`);
    return 'refused';
  }
  const kept = rep.M.filter(M => old && old.R && old.R[M] && old.R[M].fp === rep.R[M].fp).length;
  const last = rep.R[rep.M[rep.M.length - 1]];
  io.log(
    `Stored: ${C.subjectOf(subject).name}, ${rep.answers} answers, ${rep.M.length} milestones (${kept} reused), ${last ? last.B : 0} bootstrap draws for the latest, ${Math.round(text.length / 1000)} kB, ${Math.round((Date.now() - t0) / 1000)} s.`
  );
  return 'stored';
}
// Every subject's report in turn (subjects: the corals first), each judged on its own answers (sheetRun). Returns
// {subject: what happened}; a refused one (the token, the log, the sheet) makes the job fail, an older script's 'old' not.
async function sheetRunAll(io, token, o = {}) {
  const out = {};
  for (const subject of subjects()) {
    out[subject] = await sheetRun(io, token, {...o, subject});
    // the token refused or the script too old for the corals' report: the same for every other subject
    if (subject === C.replaySubject() && out[subject] !== 'wait' && out[subject] !== 'stored') break;
  }
  return out;
}

if (require.main === module) {
  const argv = process.argv.slice(2),
    arg = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null),
    B = arg('--boot') != null ? Number(arg('--boot')) : A.BOOT,
    Bh = arg('--boot-history') != null ? Number(arg('--boot-history')) : undefined,
    log = t => console.log(t),
    // --in: the subject whose answers are analysed (the replayed one by default; --demo: the corals' made-up answers)
    subject = argv.includes('--demo') || !arg('--subject') ? C.replaySubject() : C.subjectOf(arg('--subject')).id;
  require('../tests/slot.js').guard('tools/analyses.js');  // one heavy run at a time on the machine (tests/slot.js, rule W24)
  (async () => {
    if (argv.includes('--sheet')) {
      const token = process.env.ANALYSES_ADMIN_TOKEN;
      if (!token) {
        log('ANALYSES_ADMIN_TOKEN is not set: skipped (docs/HANDOVER.md, "Analyses report").');
        return;
      }
      const url = syncUrl();
      const io = {
        // Apps Script answers a POST with a redirect to its reply (fetch follows it as a GET, as the admin page does).
        post: b =>
          fetch(url, {method: 'POST', body: JSON.stringify(b)})
            .then(r => r.json())
            .catch(() => null),
        log
      };
      const r = await sheetRunAll(io, token, {force: argv.includes('--force'), B, Bh});
      if (Object.values(r).includes('refused')) process.exitCode = 1;
      return;
    }
    let rows;
    if (argv.includes('--demo')) rows = A.demoLog(rd('data.json'), Date.now() - 3 * 864e5, {cur: rd('curation.json'), qual: rd('quality.json'), met: rd('metrics.json')});
    else if (arg('--in')) {
      const J = JSON.parse(fs.readFileSync(arg('--in'), 'utf8'));
      rows = C.subjRows(Array.isArray(J) ? J : J.rows, subject);
    } else
      throw new Error(
        'usage: node tools/analyses.js --sheet [--force] | --in answers.json [--subject fish] --out report.json | --demo --out report.json'
      );
    const rep = {...A.compact(A.report(rows, metaOf(subject), null, {B, Bh, seed: 1}), MAX), subject},
      out = arg('--out');
    if (out) fs.writeFileSync(out, JSON.stringify(rep));
    log(`${rep.answers} answers, ${rep.M.length} milestones${out ? ', written to ' + out : ''}.`);
  })();
}
module.exports = {sheetRun, sheetRunAll, subjects, metaOf, plan, lastOf, planText, headCount};

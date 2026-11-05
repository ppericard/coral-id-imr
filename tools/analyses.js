// The admin's Analyses report (Pierre, 2026-11-04: "every 1000 new answers", computed once; rule L13 "compute
// once"): runs every analysis of analysis.js on the answer log, at each milestone (the first 1000, 2000, 3000, …
// answers: round thousands only, Pierre 2026-11-05), and stores the report in the sync sheet, where the admin reads it:
// the primary source. The admin's "Recompute here" runs the same code in its own tab, on any device (Pierre,
// 2026-11-05), and keeps its result there.
//   node tools/analyses.js --sheet [--force]   the GitHub Action (.github/workflows/analyses.yml): reads the log with
//                                             readAnswers and stores the report with analysesPut (sheet v35), both
//                                             with the admin token in ANALYSES_ADMIN_TOKEN; does nothing until the
//                                             log reaches a round thousand the stored report does not hold (or the
//                                             code changed, or an account was removed since: sheet v55
//                                             stale), unless --force (plan)
//   node tools/analyses.js --in answers.json --out report.json   a saved readAnswers reply (kept outside the repo)
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
const A = require('../analysis.js');
const ROOT = path.join(__dirname, '..');
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const MAX = 2400000; // under the sheet's 2.5 MB cap (Code.gs AN_MAX)
const SHEET_V = 35; // analysesGet / analysesPut

// The photos' features from the public files of this checkout.
const metaOf = () => ({ph: A.photoMeta(rd('data.json'), rd('curation.json'), rd('quality.json'), rd('metrics.json'))});
const syncUrl = () => /const SYNC_URL = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'))[1];

// The newest milestone of n answers (0: none yet). A stored report holds every round thousand up to its answer count
// (analysis.js report), so this is also the newest milestone of the stored report, read from the sheet's cheap head.
const lastOf = n => Math.floor((Number(n) || 0) / A.STEP) * A.STEP;
// What the hourly run does with the sheet's head (answers: the log's rows; st: the stored report's meta or null): compute
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
const planText = (answers, p) =>
  p.now ? `${answers} answers, newest milestone ${p.now}: the next one at ${p.next}.` : `${answers} answers, no milestone yet: the first one at ${A.STEP}.`;

// io: {post(body) -> reply, log(text)}; o: {force, B, Bh}. Returns what happened, in a word.
async function sheetRun(io, token, o = {}) {
  const post = b => io.post({...b, token});
  const head = await post({analysesGet: 1, head: 1});
  if (!head || !head.ok) {
    if (head && head.error === 'input') {
      io.log(`The sync script answers as v${head.v || '?'}: the Analyses report needs v${SHEET_V}. Nothing done.`);
      return 'old';
    }
    io.log(`The sync script refused the admin token (${(head && head.error) || 'no reply'}). Nothing done.`);
    return 'refused';
  }
  const st = head.stored,
    // sheet v55: head.stale, an account deleted, merged or archived since the stored report: refit at once, from scratch
    // (no milestone reused), so no per-player result of a removed account stays in the report.
    stale = st && (st.av !== A.AV || !!head.stale),
    p = plan(head.answers, st, o.force, !!head.stale);
  if (!p.go) {
    io.log(planText(head.answers, p));
    return 'wait';
  }
  const prev = st && !stale ? await post({analysesGet: 1}) : null;
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
  // The head counts the Answers tab's rows; the log read may hold fewer (rows without a player): judge again on it.
  const q = plan(ans.rows.length, st, o.force, !!head.stale);
  if (!q.go) {
    io.log(planText(ans.rows.length, q));
    return 'wait';
  }
  const t0 = Date.now(),
    rep = A.compact(A.report(ans.rows, metaOf(), old, {B: o.B, Bh: o.Bh, seed: 1}), MAX),
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
    `Stored: ${rep.answers} answers, ${rep.M.length} milestones (${kept} reused), ${last ? last.B : 0} bootstrap draws for the latest, ${Math.round(text.length / 1000)} kB, ${Math.round((Date.now() - t0) / 1000)} s.`
  );
  return 'stored';
}

if (require.main === module) {
  const argv = process.argv.slice(2),
    arg = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null),
    B = arg('--boot') != null ? Number(arg('--boot')) : A.BOOT,
    Bh = arg('--boot-history') != null ? Number(arg('--boot-history')) : undefined,
    log = t => console.log(t);
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
      const r = await sheetRun(io, token, {force: argv.includes('--force'), B, Bh});
      if (r === 'refused') process.exitCode = 1;
      return;
    }
    let rows;
    if (argv.includes('--demo')) rows = A.demoLog(rd('data.json'), Date.now() - 3 * 864e5, {cur: rd('curation.json'), qual: rd('quality.json'), met: rd('metrics.json')});
    else if (arg('--in')) {
      const J = JSON.parse(fs.readFileSync(arg('--in'), 'utf8'));
      rows = Array.isArray(J) ? J : J.rows;
    } else throw new Error('usage: node tools/analyses.js --sheet [--force] | --in answers.json --out report.json | --demo --out report.json');
    const rep = A.compact(A.report(rows, metaOf(), null, {B, Bh, seed: 1}), MAX),
      out = arg('--out');
    if (out) fs.writeFileSync(out, JSON.stringify(rep));
    log(`${rep.answers} answers, ${rep.M.length} milestones${out ? ', written to ' + out : ''}.`);
  })();
}
module.exports = {sheetRun, metaOf, plan, lastOf};

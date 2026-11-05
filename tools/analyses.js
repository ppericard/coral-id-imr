// The admin's Analyses report (Pierre, 2026-11-04: "every 1000 new answers", computed once; AGENTS.md rule 14i "compute
// once"): runs every analysis of analysis.js on the answer log, at each milestone (the first 1000, 2000, … answers and
// all of them), and stores the report in the sync sheet, where the admin reads it: the primary source. The admin's
// "Recompute here" runs the same code in its own tab, on any device (Pierre, 2026-11-05), and keeps its result there.
//   node tools/analyses.js --sheet [--force]   the GitHub Action (.github/workflows/analyses.yml): reads the log with
//                                             readAnswers and stores the report with analysesPut (sheet v35), both
//                                             with the admin token in ANALYSES_ADMIN_TOKEN; does nothing until 1000
//                                             new answers since the stored report (or the code changed), unless --force
//   node tools/analyses.js --in answers.json --out report.json   a saved readAnswers reply (kept outside the repo)
//   node tools/analyses.js --demo --out report.json              the admin demo's made-up answers, no network
// --boot N: bootstrap draws (default 40). It prints counts only, never an id, a name or a player's number: the Actions
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

// io: {post(body) -> reply, log(text)}; o: {force, B}. Returns what happened, in a word.
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
    since = head.answers - (st ? st.answers : 0),
    stale = st && st.av !== A.AV;
  if (!o.force && st && !stale && since < A.STEP) {
    io.log(`${head.answers} answers, ${since} since the stored report: the next one at ${st.answers + A.STEP}.`);
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
  const t0 = Date.now(),
    rep = A.compact(A.report(ans.rows, metaOf(), old, {B: o.B, seed: 1}), MAX),
    text = JSON.stringify(rep);
  if (text.length > MAX) {
    io.log(`The report is still ${Math.round(text.length / 1000)} kB after compaction, over the sheet's cap: not stored.`);
    return 'refused';
  }
  const put = await post({analysesPut: 1, report: text});
  if (!put || !put.ok) {
    io.log(`The sheet did not store the report (${(put && put.error) || 'no reply'}).`);
    return 'refused';
  }
  const kept = rep.M.filter(M => old && old.R && old.R[M] && old.R[M].fp === rep.R[M].fp).length;
  io.log(`Stored: ${rep.answers} answers, ${rep.M.length} milestones (${kept} reused), ${Math.round(text.length / 1000)} kB, ${Math.round((Date.now() - t0) / 1000)} s.`);
  return 'stored';
}

if (require.main === module) {
  const argv = process.argv.slice(2),
    arg = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null),
    B = arg('--boot') != null ? Number(arg('--boot')) : 40,
    log = t => console.log(t);
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
      const r = await sheetRun(io, token, {force: argv.includes('--force'), B});
      if (r === 'refused') process.exitCode = 1;
      return;
    }
    let rows;
    if (argv.includes('--demo')) rows = A.demoLog(rd('data.json'), Date.now() - 3 * 864e5, {cur: rd('curation.json'), qual: rd('quality.json'), met: rd('metrics.json')});
    else if (arg('--in')) {
      const J = JSON.parse(fs.readFileSync(arg('--in'), 'utf8'));
      rows = Array.isArray(J) ? J : J.rows;
    } else throw new Error('usage: node tools/analyses.js --sheet [--force] | --in answers.json --out report.json | --demo --out report.json');
    const rep = A.compact(A.report(rows, metaOf(), null, {B, seed: 1}), MAX),
      out = arg('--out');
    if (out) fs.writeFileSync(out, JSON.stringify(rep));
    log(`${rep.answers} answers, ${rep.M.length} milestones${out ? ', written to ' + out : ''}.`);
  })();
}
module.exports = {sheetRun, metaOf};

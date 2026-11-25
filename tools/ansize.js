#!/usr/bin/env node
// The admin's answer-log read measured, plain against lean (REE-39; docs/spec/sync.md "The lean answer log"): the reply's
// bytes, raw and gzipped, the time to write it, and the admin's time to read it (JSON.parse, then core.js rowsUnpack for
// the lean one); the rows read back are checked equal to the plain reply's.
//
//   node tools/ansize.js                       made-up logs (tests/anslog.js) of 7,700 and 23,100 answers, through the
//                                              sheet script on the tests' stub (tests/gas.js): never the real sheet (rule D1)
//   node tools/ansize.js --n 5000 --n 40000    other sizes
//   node tools/ansize.js --in answers.json     a saved readAnswers reply (its rows: the plain one, as tools/analyses.js
//                                              --in reads it), packed here as the script packs it
//
// Times are this computer's (Node), medians of 7 runs: the phone's are a few times slower and the script's (Apps Script)
// are read in the sheet's Timings tab (op "admin answers", tools/timings.js).
const fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  zlib = require('zlib');
const C = require('../core.js');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2),
  opt = k => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const med = f => {
  const T = [];
  let out;
  for (let k = 0; k < 7; k++) {
    const t = process.hrtime.bigint();
    out = f();
    T.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  return [T.sort((a, b) => a - b)[3], out];
};
const MB = b => (b / 1e6).toFixed(3) + ' MB';

// The two replies' texts for a log: {plain, lean} as the sheet script writes them.
function fromSheet(n) {
  const {loadCodeGs} = require(path.join(ROOT, 'tests/gas.js')),
    {synthLog, synthPlayers} = require(path.join(ROOT, 'tests/anslog.js'));
  let text = null;
  const s = loadCodeGs({extend: ctx => (ctx.ContentService.createTextOutput = t => ({setMimeType: () => ((text = t), JSON.parse(t))}))}),
    ss = s.ctx.SpreadsheetApp.getActiveSpreadsheet(),
    rows = synthLog(n, 7);
  ss.insertSheet('Answers').rows.push(vm.runInContext('LOG', s.ctx).slice(), ...rows);
  ss.insertSheet('RAs').rows.push(vm.runInContext('HEAD', s.ctx).slice(), ...synthPlayers(rows));
  const tok = 'ghp_write000000000000000000';
  s.post({readAnswers: 1, token: tok});
  const plain = text;
  s.post({readAnswers: 1, token: tok, lean: 1});
  return {plain, lean: text};
}
function fromFile(f) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(j.rows)) throw new Error(`${f}: no rows (a plain readAnswers reply is needed)`);
  const {rows, ...rest} = j;
  return {plain: JSON.stringify(j), lean: JSON.stringify({...rest, lean: C.rowsPack(rows)})};
}

function report(name, {plain, lean}) {
  const gz = t => zlib.gzipSync(t).length,
    rows = JSON.parse(plain).rows,
    [tPack, L] = med(() => C.rowsPack(rows)),
    [tWriteP] = med(() => JSON.stringify(rows)),
    [tWriteL] = med(() => JSON.stringify(L)),
    [tPlain] = med(() => JSON.parse(plain).rows.length),
    [tLean, back] = med(() => C.rowsUnpack(JSON.parse(lean).lean));
  if (JSON.stringify(back) !== JSON.stringify(rows)) throw new Error(`${name}: the lean rows differ from the plain ones`);
  console.log(`${name}: ${rows.length} rows`);
  console.log(`  plain  ${MB(plain.length)}, gzipped ${MB(gz(plain))}; written ${tWriteP.toFixed(0)} ms; read ${tPlain.toFixed(0)} ms`);
  console.log(
    `  lean   ${MB(lean.length)}, gzipped ${MB(gz(lean))}; packed ${tPack.toFixed(0)} ms + written ${tWriteL.toFixed(0)} ms; read and unpacked ${tLean.toFixed(0)} ms`
  );
  console.log(`  lean/plain: ${((100 * lean.length) / plain.length).toFixed(0)}% raw, ${((100 * gz(lean)) / gz(plain)).toFixed(0)}% gzipped; rows equal`);
}

const files = opt('--in');
if (files.length) files.forEach(f => report(f, fromFile(f)));
else (opt('--n').length ? opt('--n').map(Number) : [7700, 23100]).forEach(n => report(`made-up log of ${n}`, fromSheet(n)));

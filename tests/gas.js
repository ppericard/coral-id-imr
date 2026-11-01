// A small in-memory stand-in for the Google Apps Script services used by tools/sync/Code.gs, so the sync script can be
// tested with `node --test` (no npm). Cells behave like Sheets for what the script relies on: a leading ' is a hidden
// quote prefix (not read back), a written string starting with = becomes a formula (kept as {formula}), and a
// value longer than 50,000 characters throws like Sheets does.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');

function makeSheet(name){
  const rows = [];
  const cell = (r, c) => ((rows[r - 1] || [])[c - 1] ?? '');
  const sheet = {
    name, rows, frozen: 0,
    getLastRow: () => { let n = rows.length; while (n && !(rows[n - 1] || []).some(v => v !== '' && v !== undefined)) n--; return n; },
    getLastColumn: () => Math.max(0, ...rows.map(r => { let n = (r || []).length; while (n && (r[n - 1] === '' || r[n - 1] === undefined)) n--; return n; })),
    getMaxRows: () => Math.max(1000, rows.length),
    appendRow(vals){ rows[sheet.getLastRow()] = vals.slice(); },
    insertRowsAfter(){}, setFrozenRows(){}, setFrozenColumns(){}, hideColumns(){},
    getRange(r, c, nr = 1, nc = 1){
      if (nr < 1 || nc < 1) throw new Error('The number of rows in the range must be at least 1.');
      const range = {
        getValues: () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => { const v = cell(r + i, c + j); return v && v.formula ? '#FORMULA' : v; })),
        getValue: () => range.getValues()[0][0],
        setValues(vals){
          if (vals.length !== nr || vals.some(x => x.length !== nc)) throw new Error('The number of columns in the data does not match the range.');
          vals.forEach((row, i) => row.forEach((v, j) => {
            if (typeof v === 'string' && v.length > 50000) throw new Error('Your input contains more than the maximum of 50000 characters in a single cell.');
            rows[r - 1 + i] = rows[r - 1 + i] || [];
            rows[r - 1 + i][c - 1 + j] = typeof v === 'string' && v[0] === "'" ? v.slice(1) : typeof v === 'string' && /^[=+]/.test(v) ? {formula: v} : v;
          }));
          return range;
        },
        setFormula(f){ rows[r - 1] = rows[r - 1] || []; rows[r - 1][c - 1] = {formula: f}; return range; },
        setFontWeight: () => range, setBackgrounds: () => range
      };
      return range;
    }
  };
  return sheet;
}

// Loads Code.gs in a fresh context with fresh services; returns the script's globals and the fake spreadsheet.
function loadCodeGs(){
  const sheets = {}, cache = {}, props = {}, fetched = [];
  const ss = {getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet(n))};
  const ctx = {
    SpreadsheetApp: {getActiveSpreadsheet: () => ss},
    Utilities: {
      DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'},
      computeDigest: (alg, s) => [...crypto.createHash('sha256').update(String(s), 'utf8').digest()],
      base64Encode: bytes => Buffer.from(bytes.map(b => b & 255)).toString('base64'),
      getUuid: () => crypto.randomUUID()
    },
    CacheService: {getScriptCache: () => ({get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }})},
    PropertiesService: {getScriptProperties: () => ({getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; }})},
    UrlFetchApp: {fetch: (url, o) => { const t = (o.headers.Authorization || '').slice(7), w = t.startsWith('ghp_write'); fetched.push(url);
      return {getResponseCode: () => t.startsWith('ghp_') ? 200 : 401, getContentText: () => JSON.stringify({permissions: {pull: true, push: w}})}; }},
    LockService: {getScriptLock: () => ({waitLock(){}, releaseLock(){}})},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: t => ({setMimeType: () => JSON.parse(t)})},
    console
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8') + '\n;this.doGet = doGet; this.doPost = doPost;', ctx);
  const get = q => ctx.doGet({parameter: q});
  const post = body => ctx.doPost({postData: {contents: JSON.stringify(body)}});
  return {ctx, sheets, cache, props, fetched, get, post};
}
module.exports = {loadCodeGs, makeSheet};

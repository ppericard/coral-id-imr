// A small in-memory stand-in for the Google Apps Script services used by tools/sync/Code.gs, so the sync script can be
// tested with `node --test` (no npm). Cells behave like Sheets for what the script relies on: a leading ' is a hidden
// quote prefix (not read back), a written string starting with = becomes a formula (kept as {formula}), and a
// value longer than 50,000 characters throws like Sheets does.
const fs = require('fs'),
  path = require('path'),
  crypto = require('crypto'),
  vm = require('vm');

function makeSheet(name) {
  const rows = [];
  const cell = (r, c) => (rows[r - 1] || [])[c - 1] ?? '';
  const sheet = {
    name,
    rows,
    frozen: 0,
    getLastRow: () => {
      let n = rows.length;
      while (n && !(rows[n - 1] || []).some(v => v !== '' && v !== undefined)) n--;
      return n;
    },
    getLastColumn: () =>
      Math.max(
        0,
        // Array.from: a row never written (a hole, row 2 when only row 3 was) counts as empty, as in Sheets.
        ...Array.from(rows, r => {
          let n = (r || []).length;
          while (n && (r[n - 1] === '' || r[n - 1] === undefined)) n--;
          return n;
        })
      ),
    getMaxRows: () => Math.max(1000, rows.length),
    appendRow(vals) {
      rows[sheet.getLastRow()] = vals.slice();
    },
    insertRowsAfter() {},
    deleteRow(r) {
      rows.splice(r - 1, 1);
    },
    deleteRows(r, n) {
      if (n < 1) throw new Error('Those rows are out of bounds.');
      rows.splice(r - 1, n);
    },
    setFrozenRows() {},
    setFrozenColumns() {},
    hideColumns() {},
    getRange(r, c, nr = 1, nc = 1) {
      if (nr < 1 || nc < 1) throw new Error('The number of rows in the range must be at least 1.');
      const range = {
        getValues: () =>
          Array.from({length: nr}, (_, i) =>
            Array.from({length: nc}, (_, j) => {
              const v = cell(r + i, c + j);
              return v && v.formula ? '#FORMULA' : v;
            })
          ),
        getValue: () => range.getValues()[0][0],
        getFormula: () => {
          const v = cell(r, c);
          return v && v.formula ? v.formula : '';
        },
        setValue: v => range.setValues([[v]]),
        setValues(vals) {
          if (vals.length !== nr || vals.some(x => x.length !== nc))
            throw new Error('The number of columns in the data does not match the range.');
          vals.forEach((row, i) =>
            row.forEach((v, j) => {
              if (typeof v === 'string' && v.length > 50000)
                throw new Error('Your input contains more than the maximum of 50000 characters in a single cell.');
              rows[r - 1 + i] = rows[r - 1 + i] || [];
              rows[r - 1 + i][c - 1 + j] =
                typeof v === 'string' && v[0] === "'" ? v.slice(1) : typeof v === 'string' && /^[=+]/.test(v) ? {formula: v} : v;
            })
          );
          return range;
        },
        setFormula(f) {
          rows[r - 1] = rows[r - 1] || [];
          rows[r - 1][c - 1] = {formula: f};
          return range;
        },
        setFontWeight: () => range,
        setBackgrounds: () => range
      };
      return range;
    }
  };
  return sheet;
}

// Loads Code.gs in a fresh context with fresh services; returns the script's globals and the fake spreadsheet.
function loadCodeGs(opts = {}) {
  const sheets = {},
    cache = {},
    props = {},
    fetched = [],
    lock = opts.lock || {busy: false};
  const ss = {getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet(n))};
  const cacheFits = v => {
    if (opts.cacheMax && Buffer.byteLength(String(v), 'utf8') > opts.cacheMax) throw new Error('Argument too large: value');
  };
  const ctx = {
    SpreadsheetApp: {getActiveSpreadsheet: () => ss},
    Utilities: {
      DigestAlgorithm: {SHA_256: 'sha256'},
      Charset: {UTF_8: 'utf8'},
      computeDigest: (alg, s) => [...crypto.createHash('sha256').update(String(s), 'utf8').digest()],
      base64Encode: bytes => Buffer.from(bytes.map(b => b & 255)).toString('base64'),
      // Byte[] as Apps Script gives them (signed); a blob of them, and its gunzip (Utilities.ungzip: a blob not in gzip
      // throws, as there).
      base64Decode: t => [...Buffer.from(String(t), 'base64')].map(b => (b > 127 ? b - 256 : b)),
      newBlob: (bytes, type) => ({bytes, type, getBytes: () => bytes}),
      ungzip: blob => {
        const out = require('zlib').gunzipSync(Buffer.from(blob.bytes.map(b => b & 255)));
        return {getBytes: () => [...out], getDataAsString: () => out.toString('utf8')};
      },
      getUuid: () => crypto.randomUUID()
    },
    // opts.cacheMax: the largest value in bytes (Apps Script: 100 KB), over which put and putAll throw as Apps Script
    // does ("Argument too large"); none by default.
    CacheService: {
      getScriptCache: () => ({
        get: k => cache[k] ?? null,
        getAll: keys => Object.fromEntries(keys.filter(k => k in cache).map(k => [k, cache[k]])),
        put: (k, v) => {
          cacheFits(v);
          cache[k] = v;
        },
        putAll: o => {
          Object.values(o).forEach(cacheFits);
          Object.assign(cache, o);
        },
        remove: k => {
          delete cache[k];
        }
      })
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => props[k] ?? null,
        setProperty: (k, v) => {
          props[k] = v;
        },
        deleteProperty: k => {
          delete props[k];
        }
      })
    },
    UrlFetchApp: {
      fetch: (url, o = {}) => {
        if (opts.fetch) {
          const r = opts.fetch(url, o);
          if (r) {
            fetched.push(url);
            return r;
          }
        }
        const t = (o.headers.Authorization || '').slice(7),
          w = t.startsWith('ghp_write');
        fetched.push(url);
        return {
          getResponseCode: () => (t.startsWith('ghp_') ? 200 : 401),
          getContentText: () => JSON.stringify({permissions: {pull: true, push: w}})
        };
      }
    },
    ScriptApp: {
      getScriptId: () => 'SCRIPT_ID',
      getOAuthToken: () => 'ya29.test',
      getProjectTriggers: () => [],
      deleteTrigger() {},
      newTrigger: () => ({timeBased: () => ({everyMinutes: () => ({create() {}})})})
    },
    // opts.lock = {busy: true}: the script lock is held by another request, as Apps Script then answers: waitLock throws
    // its "Lock timeout" exception, tryLock gives false. Set lock.busy back to false to free it. lock.onRelease runs at each
    // releaseLock.
    LockService: {
      getScriptLock: () => ({
        waitLock() {
          if (lock.busy) throw new Error('Lock timeout: another process was holding the lock for too long.');
        },
        tryLock: () => !lock.busy,
        // lock.onRelease: what another request does the moment this one lets the lock go (a test's race).
        releaseLock() {
          if (lock.onRelease) lock.onRelease();
        }
      })
    },
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: t => ({setMimeType: () => JSON.parse(t)})},
    console
  };
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8') +
      '\n;this.doGet = doGet; this.doPost = doPost; this.autoUpdate = autoUpdate;',
    ctx
  );
  // The Timings tab (Code.gs TIM) stays off unless a test asks for it (opts.timings), so no other test meets a tab that
  // sampling made at random; a test that turns it on sets TIM.EVERY, TIM.SLOW… itself.
  if (!opts.timings) vm.runInContext('TIM.ON = false', ctx);
  // The pooled stats' snapshot (Code.gs STATS, sheet vNEXT) likewise: off unless a test asks for it (opts.stats), so ?stats=1
  // makes stats_ and the trigger folds nothing (it would fetch the game pools) in every other test.
  if (!opts.stats) vm.runInContext('STATS.ON = false', ctx);
  const get = q => ctx.doGet({parameter: q});
  const post = body => ctx.doPost({postData: {contents: JSON.stringify(body)}});
  return {ctx, sheets, cache, props, fetched, lock, get, post};
}
// A request body as the sync script reads it (Code.gs doPost_): a light save (sync.js lightBody, sheet v116) unwrapped,
// its gzip read (z) or as it came (lt); anything else as it is. Tests that look at what the app sent read it this way.
function bodyOf(t) {
  const o = typeof t === 'string' ? JSON.parse(t) : t;
  if (o && typeof o.z === 'string') return JSON.parse(require('zlib').gunzipSync(Buffer.from(o.z, 'base64')).toString('utf8'));
  return o && o.lt && typeof o.lt === 'object' ? o.lt : o;
}
// Accounts made before the sheet refused reserved names (Code.gs doPost_, core.js reservedName; Pierre, 2026-11-09): f
// runs with the script's check switched off (a test's players named constructor or __proto__), then it is on again.
function madeBefore(s, f) {
  vm.runInContext('CORE_.__rn = CORE_.reservedName; CORE_.reservedName = () => false', s.ctx);
  try {
    return f();
  } finally {
    vm.runInContext('CORE_.reservedName = CORE_.__rn; delete CORE_.__rn', s.ctx);
  }
}
module.exports = {loadCodeGs, makeSheet, bodyOf, madeBefore};

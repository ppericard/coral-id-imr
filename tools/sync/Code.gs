// IMR Coral ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 3 (2026-10-31: photo difficulty stats, ?stats=1)
// Setup: Extensions > Apps Script, paste this file, Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Put the /exec URL in SYNC_URL in app.js.
// Each RA picks a name and a 4-digit code in the app; the code only stops accidental overwrites.

const SALT = 'imr-coral-id';
const HEAD = ['Name', 'Updated', 'Learned', 'Seen', 'Total', 'Review first', 'Code hash', 'Data'];
const COLORS = {ok: '#dcefd9', mid: '#e3f1f3', weak: '#f7dcd6', new: '#f2f2f2'};
const LABELS = {ok: 'Learned', mid: 'Learning', weak: 'Review', new: ''};
// One row per quiz answer: the history behind each RA's progress. Activity sums it up per RA.
const LOG = ['Name', 'Time', 'Genus shown', 'Answered', 'Right', 'Mode', 'Photos', 'Id'];
const ACTIVITY = '=QUERY(Answers!A:E, "select A, count(E), sum(E), max(B) where A is not null group by A order by max(B) desc label count(E) \'Answers\', sum(E) \'Right\', max(B) \'Last answer\'", 1)';

function sheet_(name, head){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (head) { sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); if (head === HEAD) sh.hideColumns(7, 2); } }
  return sh;
}
function hash_(name, pin){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + '|' + name.toLowerCase() + '|' + pin));
}
const VERSION = 3;  // bump with the header line on every change; every reply carries it as v
function json_(o){ o.v = VERSION; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function find_(sh, name){
  const names = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0]).toLowerCase());
  const i = names.indexOf(name.toLowerCase());
  return i > 0 ? i + 1 : 0;
}
function clean_(p){ return {name: String(p.name || '').trim().slice(0, 40), pin: String(p.pin || '').trim()}; }

// GET ?stats=1 → photo difficulty learned from every answer (Elo, see stats_), cached 10 minutes.
// GET ?name=…&pin=… → the saved progress for that RA, if the code matches.
function doGet(e){
  if (e.parameter.stats) return json_(stats_());
  const {name, pin} = clean_(e.parameter);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const sh = sheet_('RAs', HEAD), r = find_(sh, name);
  if (!r) return json_({ok: true, found: false});
  const row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  if (row[6] !== hash_(name, pin)) return json_({ok: false, error: 'pin'});
  return json_({ok: true, found: true, updated: row[1], data: JSON.parse(row[7] || '{}')});
}

// POST {name, pin, data, summary: {learned, seen, total, review: [], genera: {Genus: 'ok'|'mid'|'weak'|'new'}},
//   answers: [{id, t, g, a, ok, m, ph}]} → {ok, log: true}; log tells the app its answers are saved.
function doPost(e){
  const p = JSON.parse(e.postData.contents), {name, pin} = clean_(p);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_('RAs', HEAD), h = hash_(name, pin), s = p.summary || {};
    let r = find_(sh, name);
    if (r && sh.getRange(r, 7).getValue() !== h) return json_({ok: false, error: 'pin'});
    if (!r) { r = sh.getLastRow() + 1; }
    sh.getRange(r, 1, 1, HEAD.length).setValues([[name, new Date(), s.learned || 0, s.seen || 0, s.total || 0, (s.review || []).join(', '), h, JSON.stringify(p.data || {})]]);
    // One row per RA, one column per genus, coloured by status: the class at a glance.
    const genera = Object.keys(s.genera || {});
    if (genera.length) {
      const g = sheet_('By genus'), head = ['Name', 'Learned'].concat(genera);
      g.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); g.setFrozenRows(1); g.setFrozenColumns(2);
      const gr = find_(g, name) || g.getLastRow() + 1;
      g.getRange(gr, 1, 1, head.length).setValues([[name, (s.learned || 0) + '/' + (s.total || 0)].concat(genera.map(n => LABELS[s.genera[n]] || ''))])
        .setBackgrounds([['#ffffff', '#ffffff'].concat(genera.map(n => COLORS[s.genera[n]] || '#ffffff'))]);
    }
    logAnswers_(name, p.answers);
    return json_({ok: true, log: true});
  } finally { lock.releaseLock(); }
}

// Appends new answers to the Answers tab, skipping ids already anywhere in it (a resend after a lost reply).
function logAnswers_(name, answers){
  if (!Array.isArray(answers) || !answers.length) return;
  const sh = sheet_('Answers', LOG);
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activity')) sheet_('Activity').getRange(1, 1).setFormula(ACTIVITY);
  const n = sh.getLastRow() - 1;
  const seen = new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
  const rows = answers.filter(a => a && a.id && !seen.has(String(a.id))).slice(0, 500)
    .map(a => [name, new Date(a.t), String(a.g || ''), String(a.a || ''), a.ok ? 1 : 0, String(a.m || ''), String(a.ph || ''), String(a.id)]);
  if (!rows.length) return;
  const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
  sh.getRange(at, 1, rows.length, LOG.length).setValues(rows);
}

// Elo over the Answers tab, oldest first. Each answer: P(right) = g + (1 - g) * sigmoid(ability - difficulty), with
// g = 1/choices (4 in the quiz, 2 in a duel), ability = the RA's, difficulty = mean of the photos shown. Ratings move
// by K * (result - P(right)), K shrinking as a photo or an RA gathers answers. Returns {ok, photos: {file: [difficulty,
// answers, right]}, ras: {name: [ability, answers]}}. Difficulty 0 = average photo; +1 = clearly harder.
function stats_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('stats3');
  if (hit) return JSON.parse(hit);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), out = {ok: true, photos: {}, ras: {}};
  if (!sh || sh.getLastRow() < 2) return out;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues().sort((a, b) => new Date(a[1]) - new Date(b[1]));
  const P = {}, R = {}, sig = x => 1 / (1 + Math.exp(-x));
  rows.forEach(r => {
    const who = String(r[0]), ok = Number(r[4]) ? 1 : 0, mode = String(r[5]), fs = String(r[6]).split(/\s+/).filter(Boolean);
    if (!who || !fs.length) return;
    const g = mode.indexOf('quiz-duel') === 0 ? 0.5 : 0.25, ra = R[who] = R[who] || [0, 0];
    const ph = fs.map(f => P[f] = P[f] || [0, 0, 0]), b = ph.reduce((t, p) => t + p[0], 0) / ph.length;
    const e = g + (1 - g) * sig(ra[0] - b), d = ok - e;
    ra[0] += 0.6 / (1 + ra[1] / 40) * d; ra[1]++;
    ph.forEach(p => { p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d; p[2]++; p[1] += ok; });
  });
  Object.keys(P).forEach(f => out.photos[f] = [Math.round(P[f][0] * 100) / 100, P[f][2], P[f][1]]);
  Object.keys(R).forEach(n => out.ras[n] = [Math.round(R[n][0] * 100) / 100, R[n][1]]);
  try { cache.put('stats3', JSON.stringify(out), 600); } catch (err) {}  // too big for the cache: computed each time
  return out;
}

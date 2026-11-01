// IMR Coral ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 7 (2026-11-01: players report a wrong answer or a bad photo (Reports tab, read by admins with their GitHub token); v6: code review fixes: progress of any size (Progress data tab), stale-write check, input sanitised, PIN throttle, secret salt for anonymous ids; earlier: v5 continuous difficulty)
// Setup: Extensions > Apps Script, paste this file, Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Put the /exec URL in SYNC_URL in app.js.
// Each RA picks a name and a 4-digit code in the app; the code only stops accidental overwrites.

const SALT = 'imr-coral-id';
const HEAD = ['Name', 'Updated', 'Learned', 'Seen', 'Total', 'Review first', 'Code hash', 'Data'];
const COLORS = {ok: '#dcefd9', mid: '#e3f1f3', weak: '#f7dcd6', new: '#f2f2f2'};
const LABELS = {ok: 'Learned', mid: 'Learning', weak: 'Review', new: ''};
// One row per quiz answer: the history behind each RA's progress. Activity sums it up per RA.
const LOG = ['Name', 'Time', 'Genus shown', 'Answered', 'Right', 'Mode', 'Photos', 'Id', 'Expected', 'Ability', 'New photos'];
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
const VERSION = 7;  // bump with the header line on every change; every reply carries it as v
function json_(o){ o.v = VERSION; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function find_(sh, name){
  const names = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0]).toLowerCase());
  const i = names.indexOf(name.toLowerCase());
  return i > 0 ? i + 1 : 0;
}
function clean_(p){ return {name: String(p.name || '').trim().slice(0, 40), pin: String(p.pin || '').trim()}; }
// A user string never becomes a formula: a leading = + - @ gets Sheets' quote prefix (hidden, not part of the value read back).
// Also used for the code hash, whose base64 can start with +.
const safe_ = x => { const t = String(x == null ? '' : x); return /^[=+\-@]/.test(t) ? "'" + t : t; };
// Answer fields keep only the characters they can have; anything else is dropped.
const word_ = (x, re, n) => { const t = String(x == null ? '' : x).slice(0, n); return re.test(t) ? t : ''; };
// Wrong codes: after 5 for one name within 10 minutes, every attempt for that name waits 10 minutes (10,000 codes can't be tried).
const failKey_ = name => 'pinfail:' + name.toLowerCase();
const blocked_ = name => Number(CacheService.getScriptCache().get(failKey_(name)) || 0) >= 5;
function failed_(name){ const c = CacheService.getScriptCache(), k = failKey_(name); c.put(k, String(Number(c.get(k) || 0) + 1), 600); }

// Progress of any size: a Sheets cell holds at most 50,000 characters, so the progress JSON lives in the "Progress data" tab,
// one row per RA: name, revision, then the JSON in chunks of 45,000 characters. RAs column H keeps the JSON when it fits
// (readable, and what older script versions read), else '@Progress data'. The revision counts writes (stale-write check).
const DATA_TAB = 'Progress data', CHUNK = 45000;
function dataRow_(name){ const sh = sheet_(DATA_TAB, ['Name', 'Revision', 'Data']), r = find_(sh, name); return {sh: sh, r: r}; }
function readData_(name, h){
  const d = dataRow_(name);
  if (!d.r) return {rev: 0, json: h && h !== '@' + DATA_TAB ? h : '{}'};
  const row = d.sh.getRange(d.r, 1, 1, d.sh.getLastColumn()).getValues()[0];
  return {rev: Number(row[1]) || 0, json: row.slice(2).map(String).join('') || '{}'};
}
function writeData_(name, json, rev){
  const d = dataRow_(name), r = d.r || d.sh.getLastRow() + 1, parts = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(safe_(json.slice(i, i + CHUNK)));
  const old = d.r ? d.sh.getLastColumn() : 0, row = [safe_(name), rev].concat(parts);
  while (row.length < old) row.push('');  // clear chunks left over from a longer copy
  d.sh.getRange(r, 1, 1, row.length).setValues([row]);
}

// GET ?stats=1 → photo difficulty learned from every answer (Elo, see stats_), cached 10 minutes.
// GET ?answers=1 → every answer with the RA replaced by an anonymous id (see answers_), for the admin Stats page.
// GET ?name=…&pin=… → the saved progress for that RA, if the code matches.
function doGet(e){
  if (e.parameter.stats) return json_(stats_());
  if (e.parameter.answers) return json_(answers_(e.parameter));
  const {name, pin} = clean_(e.parameter);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const sh = sheet_('RAs', HEAD), r = find_(sh, name);
  if (!r) return json_({ok: true, found: false});
  if (blocked_(name)) return json_({ok: false, error: 'wait'});
  const row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  if (row[6] !== hash_(name, pin)) { failed_(name); return json_({ok: false, error: 'pin'}); }
  const d = readData_(name, String(row[7] || ''));
  return json_({ok: true, found: true, updated: row[1], rev: d.rev, data: JSON.parse(d.json)});
}

// POST {name, pin, data, summary: {learned, seen, total, review: [], genera: {Genus: 'ok'|'mid'|'weak'|'new'}},
//   answers: [{id, t, g, a, ok, m, ph, e, th, nw}], at: revision merged against (optional)} → {ok, log: true, rev}.
// log tells the app its answers are saved; they are logged first, so they are kept even if the progress write fails.
// at ≠ the saved revision → {ok: false, error: 'stale', log: true}: another device wrote meanwhile; the app pulls, merges, resends.
// POST {reports: [...], rname, rpin} → {ok, rep: true}: players' reports (logReports_, v7). The reporter goes in rname/rpin,
// never name/pin, so an older script answers 'input' and never mistakes a report for an empty progress write.
function doPost(e){
  const p = JSON.parse(e.postData.contents);
  if (Array.isArray(p.reports)) return json_(logReports_(p));
  if (p.readReports) return json_(reports_(p.token));  // admin: POST {readReports: 1, token} (see reports_)
  const {name, pin} = clean_(p);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_('RAs', HEAD), h = hash_(name, pin), s = p.summary || {};
    let r = find_(sh, name);
    if (r && blocked_(name)) return json_({ok: false, error: 'wait'});
    if (r && sh.getRange(r, 7).getValue() !== h) { failed_(name); return json_({ok: false, error: 'pin'}); }
    logAnswers_(name, p.answers);
    const rev = r ? readData_(name, String(sh.getRange(r, 8).getValue() || '')).rev : 0;
    if (typeof p.at === 'number' && p.at !== rev) return json_({ok: false, error: 'stale', log: true, rev: rev});
    const json = JSON.stringify(p.data || {});
    try {
      writeData_(name, json, rev + 1);
      if (!r) { r = sh.getLastRow() + 1; }
      sh.getRange(r, 1, 1, HEAD.length).setValues([[safe_(name), new Date(), s.learned || 0, s.seen || 0, s.total || 0, (s.review || []).map(safe_).join(', '), safe_(h), json.length < CHUNK ? json : '@' + DATA_TAB]]);
    } catch (err) { return json_({ok: false, error: 'save', log: true}); }
    // One row per RA, one column per genus, coloured by status: the class at a glance.
    const genera = Object.keys(s.genera || {});
    if (genera.length) {
      const g = sheet_('By genus'), head = ['Name', 'Learned'].concat(genera.map(safe_));
      g.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); g.setFrozenRows(1); g.setFrozenColumns(2);
      const gr = find_(g, name) || g.getLastRow() + 1;
      g.getRange(gr, 1, 1, head.length).setValues([[safe_(name), (s.learned || 0) + '/' + (s.total || 0)].concat(genera.map(n => LABELS[s.genera[n]] || ''))])
        .setBackgrounds([['#ffffff', '#ffffff'].concat(genera.map(n => COLORS[s.genera[n]] || '#ffffff'))]);
    }
    return json_({ok: true, log: true, rev: rev + 1});
  } finally { lock.releaseLock(); }
}

// Appends new answers to the Answers tab, skipping ids already anywhere in it (a resend after a lost reply).
function logAnswers_(name, answers){
  if (!Array.isArray(answers) || !answers.length) return;
  const sh = sheet_('Answers', LOG);
  if (sh.getRange(1, LOG.length).getValue() !== LOG[LOG.length - 1]) sh.getRange(1, 1, 1, LOG.length).setValues([LOG]).setFontWeight('bold');  // tab made before v5
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activity')) sheet_('Activity').getRange(1, 1).setFormula(ACTIVITY);
  const n = sh.getLastRow() - 1;
  const seen = new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
  const G = /^[A-Za-z][A-Za-z -]*$/, M = /^[a-z0-9|-]*$/, PH = /^[A-Za-z0-9_. -]*$/, ID = /^[a-z0-9]+$/;
  const rows = answers.filter(a => a && a.id && ID.test(String(a.id)) && !seen.has(String(a.id))).slice(0, 2000)
    .map(a => [safe_(name), new Date(a.t), word_(a.g, G, 40), word_(a.a, G, 40), a.ok ? 1 : 0, word_(a.m, M, 40), word_(a.ph, PH, 400), String(a.id).slice(0, 20), num_(a.e), num_(a.th), num_(a.nw)]);
  if (!rows.length) return;
  const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
  sh.getRange(at, 1, rows.length, LOG.length).setValues(rows);
}
const num_ = x => typeof x === 'number' && isFinite(x) ? x : '';

// Anonymous id of an RA: the same for the same name, no name in it. Its salt is secret (Script Properties, made on first
// use), so nobody can rebuild ids from a list of names; the admin learns its own id with ?answers=1&name=…&pin=… (v6).
function anonSalt_(){
  const pr = PropertiesService.getScriptProperties(); let s = pr.getProperty('ANON_SALT');
  if (!s) { s = Utilities.getUuid(); pr.setProperty('ANON_SALT', s); }
  return s;
}
function aid_(name, salt){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (salt || anonSalt_()) + '|anon|' + String(name).trim().toLowerCase(), Utilities.Charset.UTF_8)).slice(0, 8);
}

// {ok, rows: [[id, time ms, genus shown, answered, right 0|1, mode, photos, expected, ability, new photos]],
//   players: {id: [learned, seen, total, {genus: ability}]}}. Expected/ability/new photos are null on answers before v5.
function answers_(q){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Answers'), ra = ss.getSheetByName('RAs'), out = {ok: true, rows: [], players: {}};
  const salt = anonSalt_(), ids = {}, id = n => ids[n] = ids[n] || aid_(n, salt);
  // me: the caller's own id, only with its name and right code (the admin page marks "you").
  const {name, pin} = clean_(q || {});
  if (name && /^\d{4}$/.test(pin) && ra && !blocked_(name)) { const r = find_(ra, name); if (r && ra.getRange(r, 7).getValue() === hash_(name, pin)) out.me = id(name); else if (r) failed_(name); }
  const big = {}; const dt = ss.getSheetByName(DATA_TAB);
  if (dt && dt.getLastRow() > 1) dt.getRange(2, 1, dt.getLastRow() - 1, dt.getLastColumn()).getValues().forEach(r => { big[String(r[0]).toLowerCase()] = r.slice(2).map(String).join(''); });
  if (sh && sh.getLastRow() > 1) out.rows = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues().filter(r => r[0])
    .map(r => [id(r[0]), new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6])]
      .concat([8, 9, 10].map(i => r[i] === '' ? null : Number(r[i]))));
  if (ra && ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, 8).getValues().filter(r => r[0])
    .forEach(r => out.players[id(r[0])] = [Number(r[2]) || 0, Number(r[3]) || 0, Number(r[4]) || 0, abilities_(big[String(r[0]).toLowerCase()] || r[7])]);
  return out;
}
// Per-genus ability (th) from an RA's saved progress, nothing else from it.
function abilities_(data){
  const out = {};
  try { const P = JSON.parse(JSON.parse(data || '{}')['imr-coral-progress'] || '{}'); Object.keys(P).forEach(g => { if (typeof P[g].th === 'number') out[g] = P[g].th; }); } catch (e) {}
  return out;
}

// Elo over the Answers tab, oldest first. Each answer: P(right) = g + (1 - g) * sigmoid(ability - difficulty), with
// g = 1/choices (4 in the quiz, 2 in a duel), ability = the RA's, difficulty = mean of the photos shown, +0.5 when a
// single view was shown alone (harder than the same photo with the other views). Ratings move
// by K * (result - P(right)), K shrinking as a photo or an RA gathers answers. Returns {ok, photos: {file: [difficulty,
// answers, right]}, ras: {anonymous id: [ability, answers]}}. Difficulty 0 = average photo; +1 = clearly harder.
// admin.js eloOf replays the same rules in the browser (photo Elo with or without the author's answers): keep both in step.
function stats_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('stats6');
  if (hit) return JSON.parse(hit);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), out = {ok: true, photos: {}, ras: {}};
  if (!sh || sh.getLastRow() < 2) return out;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues().sort((a, b) => new Date(a[1]) - new Date(b[1]));
  const P = {}, R = {}, sig = x => 1 / (1 + Math.exp(-x));
  rows.forEach(r => {
    const who = String(r[0]), ok = Number(r[4]) ? 1 : 0, mode = String(r[5]), fs = String(r[6]).split(/\s+/).filter(Boolean);
    if (!who || !fs.length) return;
    const g = mode.indexOf('quiz-duel') === 0 ? 0.5 : 0.25, ra = R[who] = R[who] || [0, 0];
    const ph = fs.map(f => P[f] = P[f] || [0, 0, 0]), b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);  // one view alone is harder (app.js PICKD.SINGLE)
    const e = g + (1 - g) * sig(ra[0] - b), d = ok - e;
    ra[0] += 0.6 / (1 + ra[1] / 40) * d; ra[1]++;
    ph.forEach(p => { p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d; p[2]++; p[1] += ok; });
  });
  Object.keys(P).forEach(f => out.photos[f] = [Math.round(P[f][0] * 100) / 100, P[f][2], P[f][1]]);
  const salt = anonSalt_();
  Object.keys(R).forEach(n => out.ras[aid_(n, salt)] = [Math.round(R[n][0] * 100) / 100, R[n][1]]);
  try { cache.put('stats6', JSON.stringify(out), 600); } catch (err) {}  // too big for the cache: computed each time
  return out;
}

// Players' reports (v7): from a game, after the answer, a player says the expected genus is probably wrong (and may say
// which genus it is), the photo shows several corals, the photo is bad, or something else, with an optional note.
// One row per report in the "Reports" tab. The reporter is the sync name when its code matches ("Verified" 1),
// else the name typed or nothing ("Verified" 0). Nothing here changes the photos: Pierre decides in the admin Triage.
const REP = ['Time', 'Reporter', 'Verified', 'Reason', 'Expected', 'Answered', 'Suggested genus', 'Note', 'Mode', 'Photos', 'Id'];
const WHY = {wrong: 'Wrong answer', multi: 'Several corals', photo: 'Bad photo', other: 'Other'};
const text_ = (x, n) => safe_(String(x == null ? '' : x).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n));
function logReports_(p){
  const L = p.reports.filter(r => r && /^[a-z0-9]{1,20}$/.test(String(r.id)) && WHY[r.why]).slice(0, 50);
  if (!L.length) return {ok: true, rep: true};
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const name = String(p.rname || '').trim().slice(0, 40), pin = String(p.rpin || '').trim();
    let ok = 0;
    if (name && /^\d{4}$/.test(pin) && !blocked_(name)) { const ra = sheet_('RAs', HEAD), r = find_(ra, name);
      if (r && ra.getRange(r, 7).getValue() === hash_(name, pin)) ok = 1; else if (r) failed_(name); }
    const sh = sheet_('Reports', REP), n = sh.getLastRow() - 1;
    const seen = new Set(n > 0 ? sh.getRange(2, REP.length, n, 1).getValues().map(r => String(r[0])) : []);
    const G = /^[A-Za-z][A-Za-z -]*$/, M = /^[a-z0-9|-]*$/, PH = /^[A-Za-z0-9_. -]*$/;
    const rows = L.filter(r => !seen.has(String(r.id))).map(r => [new Date(r.t || Date.now()), safe_(name), ok, WHY[r.why], word_(r.g, G, 40), word_(r.a, G, 40),
      text_(r.fix, 60), text_(r.note, 500), word_(r.m, M, 40), word_(r.ph, PH, 400), String(r.id)]);
    if (rows.length) { const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
      if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
      sh.getRange(at, 1, rows.length, REP.length).setValues(rows); }
    return {ok: true, rep: true};
  } finally { lock.releaseLock(); }
}
// POST {readReports: 1, token} → {ok, rows: [[id, time ms, reporter, verified 0|1, reason key, expected, answered,
// suggested genus, note, mode, photos]]}, newest first. Names are shown, so only the app's admins get them: anyone whose
// GitHub token can write to the repository (the admin page's token; Pierre, 2026-11-01: "all admins"). The token is
// checked with GitHub once and remembered 10 minutes by its hash only; it is never stored. Sent by POST, so it stays
// out of URLs and logs. Needs the script's "connect to an external service" permission (asked once on redeploy).
const REPO = 'ppericard/coral-id-imr';
function isAdmin_(token){
  if (!/^[A-Za-z0-9_]{20,255}$/.test(token)) return false;
  const cache = CacheService.getScriptCache(), key = 'gh:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  if (cache.get(key) === '1') return true;
  const r = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO, {headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json'}, muteHttpExceptions: true});
  let ok = false; try { const p = r.getResponseCode() === 200 && JSON.parse(r.getContentText()).permissions; ok = !!(p && (p.push || p.maintain || p.admin)); } catch (e) {}
  if (ok) cache.put(key, '1', 600);
  return ok;
}
function reports_(token){
  if (!isAdmin_(String(token || ''))) return {ok: false, error: 'token'};
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reports'), key = {}; Object.keys(WHY).forEach(k => key[WHY[k]] = k);
  if (!sh || sh.getLastRow() < 2) return {ok: true, rows: []};
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, REP.length).getValues().filter(x => x[10])
    .map(x => [String(x[10]), new Date(x[0]).getTime() || 0, String(x[1]), Number(x[2]) ? 1 : 0, key[x[3]] || 'other', String(x[4]), String(x[5]), String(x[6]), String(x[7]), String(x[8]), String(x[9])]);
  return {ok: true, rows: rows.reverse()};
}

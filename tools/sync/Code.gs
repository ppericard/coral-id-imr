// IMR Coral ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 17 (2026-11-02: v17: photo difficulty and confusions count only signed-in players whose answers are clearly above chance (10 answers or more), and a player's first answer on each photo; answers of a device that never signed in count once it signs in; readAnswers rows carry an anonymous flag; admin anonDelete removes the answers of chosen anonymous ids (test runs); v16: the leaderboard computes each player's progress % itself from their saved progress (same formula as the app), so it is up to date for everyone without waiting for their next sync; v15: the leaderboard shows a player's level only from 200 answers (it moves too much before); GET ?achs=1 gives how many signed-in players hold each achievement; v14: public leaderboard (GET ?board=1: name, progress %, level of every signed-in player who did not opt out), the progress % and the opt-out are saved with each sync (Progress, Board columns); per-player answers and abilities are admin-only (POST readAnswers / readStats with the token), so leaderboard names can't be matched to an answer history; v13: the admin player list gives each player's anonymous id, so the admin can show names beside the anonymous answer stats (admin token only, like the names); v12: answers of players who never sign in arrive under a random device id (~anon <id>), moved to the name at sign-in; caps against floods (per anonymous id, per name, new accounts, reports) with an Alerts tab; v11: updates itself from GitHub (autoUpdate, every 15 min, once installAutoUpdate has run: no more copy and paste); admin user management: list players with their stats, delete a player, merge two names of one person (admin token only); a removed name+code gets error 'gone' instead of a new account; the mode of a duel on a chosen pair (quiz-duel|A|B) is kept (it was dropped, so it was rated as a 4-choice answer); v10: each answer logs the choices offered (Choices column), and ?stats=1 adds how often each pair of genera was offered together and mixed up (confusion scores); v9: quiz questions with easy wrong choices are logged "quiz|kN" (N plausible choices) and rated with a 1/N guess; v8: reports read by every admin with their GitHub token (v7 had a single owner), reports and feedback from anywhere in the app (photos, sheets, pages); v7: players report a wrong answer or a bad photo (Reports tab); v6: code review fixes: progress of any size (Progress data tab), stale-write check, input sanitised, PIN throttle, secret salt for anonymous ids; earlier: v5 continuous difficulty)
// Setup: Extensions > Apps Script, paste this file, Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Put the /exec URL in SYNC_URL in app.js.
// Each RA picks a name and a 4-digit code in the app; the code only stops accidental overwrites.

const SALT = 'imr-coral-id';
// Progress and Board (v14): the player's progress % (as the app shows it) and 0 when they chose to stay off the public
// leaderboard (blank or 1 = shown).
const HEAD = ['Name', 'Updated', 'Learned', 'Seen', 'Total', 'Review first', 'Code hash', 'Data', 'Progress', 'Board'];
const COLORS = {ok: '#dcefd9', mid: '#e3f1f3', weak: '#f7dcd6', new: '#f2f2f2'};
const LABELS = {ok: 'Learned', mid: 'Learning', weak: 'Review', new: ''};
// One row per quiz answer: the history behind each RA's progress. Activity sums it up per RA.
const LOG = ['Name', 'Time', 'Genus shown', 'Answered', 'Right', 'Mode', 'Photos', 'Id', 'Expected', 'Ability', 'New photos', 'Choices'];
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
const VERSION = 17;  // bump with the header line on every change; every reply carries it as v
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

// GET ?stats=1 → photo difficulty learned from every answer (Elo, see stats_), cached 10 minutes: photos and conf only.
// Per-player numbers are admin-only from v14 (the public leaderboard names players: a public per-id ability or answer log
// could be matched to a name): POST {readStats: 1, token} → stats_ with ras; POST {readAnswers: 1, token, aname, apin}
// → answers_ (aname/apin, never name/pin: an older script must not take it for a progress write). GET ?answers=1 → 'token'.
// GET ?name=…&pin=… → the saved progress for that RA, if the code matches.
function doGet(e){
  if (e.parameter.stats) { const st = stats_(); return json_({ok: st.ok, photos: st.photos, conf: st.conf}); }
  if (e.parameter.answers) return json_({ok: false, error: 'token'});
  if (e.parameter.board) return json_(board_());
  if (e.parameter.achs) return json_(achs_());
  const {name, pin} = clean_(e.parameter);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const sh = sheet_('RAs', HEAD), r = find_(sh, name);
  if (!r) { const g = gone_(name, hash_(name, pin)); return json_(g ? {ok: false, error: 'gone', into: g.into} : {ok: true, found: false}); }
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
  if (Array.isArray(p.anonAnswers)) return json_(anon_(p));  // v12: players not signed in (see anon_)
  if (Array.isArray(p.reports)) return json_(logReports_(p));
  if (p.readReports) return json_(reports_(p.token));  // admin: POST {readReports: 1, token} (see reports_)
  if (p.readStats || p.readAnswers) {  // admin (v14): per-player numbers, see doGet
    if (!isAdmin_(String(p.token || ''))) return json_({ok: false, error: 'token'});
    return json_(p.readStats ? stats_() : answers_({name: p.aname, pin: p.apin}));
  }
  if (p.users || p.userData || p.userDelete || p.userMerge || p.anonDelete) return json_(users_(p));  // admin user management (v11, see users_)
  const {name, pin} = clean_(p);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_('RAs', HEAD), h = hash_(name, pin), s = p.summary || {};
    let r = find_(sh, name);
    if (r && blocked_(name)) return json_({ok: false, error: 'wait'});
    // The code is checked before anything is written (v12 review: a wrong code must not move anonymous answers).
    if (r && sh.getRange(r, 7).getValue() !== h) { failed_(name); return json_({ok: false, error: 'pin'}); }
    // A name the admin removed or merged, with its old code: no new account. Answers of a merged name go to the name it
    // joined; the app then asks the player to sign out (and to sign in under the other name).
    const g = r ? null : gone_(name, h);
    if (g) { if (g.into) logAnswers_(g.into, p.answers); return json_({ok: false, error: 'gone', into: g.into, log: !!g.into}); }
    // Caps (v12): at most 40 new accounts and 3000 answers per name every 6 hours; over that, nothing is written and the
    // app keeps its answers to send later. A real class of RAs stays far below both.
    if (!r && over_('newacct', 40)) return json_({ok: false, error: 'busy'});
    if (Array.isArray(p.answers) && p.answers.length && over_('n:' + name.toLowerCase(), 3000, p.answers.length)) return json_({ok: false, error: 'busy'});
    // The first send after signing in carries the device's anonymous id: its anonymous answers become this name's, for an
    // existing account (code checked above) as for a new one (before logAnswers_, which skips the resent ids).
    if (/^[a-z0-9]{8,16}$/.test(String(p.anon || ''))) relabel_('Answers', 1, '~anon ' + p.anon, name);
    logAnswers_(name, p.answers);
    const rev = r ? readData_(name, String(sh.getRange(r, 8).getValue() || '')).rev : 0;
    if (typeof p.at === 'number' && p.at !== rev) return json_({ok: false, error: 'stale', log: true, rev: rev});
    const json = JSON.stringify(p.data || {});
    try {
      writeData_(name, json, rev + 1);
      if (!r) { r = sh.getLastRow() + 1; }
      if (sh.getRange(1, 9).getValue() !== HEAD[8]) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');  // tab made before v14
      const pct = typeof s.pct === 'number' && isFinite(s.pct) ? Math.max(0, Math.min(100, Math.round(s.pct))) : '';
      // Board: the player's choice when the app sends it, else the one saved (an older app must not undo an opt-out).
      const board = typeof s.board === 'number' ? (s.board ? 1 : 0) : r && sh.getRange(r, 10).getValue() === 0 ? 0 : 1;
      sh.getRange(r, 1, 1, HEAD.length).setValues([[safe_(name), new Date(), s.learned || 0, s.seen || 0, s.total || 0, (s.review || []).map(safe_).join(', '), safe_(h), json.length < CHUNK ? json : '@' + DATA_TAB, pct, board]]);
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
  const G = /^[A-Za-z][A-Za-z -]*$/, M = /^[A-Za-z0-9|-]*$/, PH = /^[A-Za-z0-9_. -]*$/, ID = /^[a-z0-9]+$/, CH = /^[A-Za-z ]*$/;
  const rows = answers.filter(a => a && a.id && ID.test(String(a.id)) && !seen.has(String(a.id))).slice(0, 2000)
    .map(a => [safe_(name), new Date(a.t), word_(a.g, G, 40), word_(a.a, G, 40), a.ok ? 1 : 0, word_(a.m, M, 40), word_(a.ph, PH, 400), String(a.id).slice(0, 20), num_(a.e), num_(a.th), num_(a.nw), word_(a.ch, CH, 200)]);
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

// {ok, rows: [[id, time ms, genus shown, answered, right 0|1, mode, photos, expected, ability, new photos, choices, anonymous 0|1]],
//   players: {id: [learned, seen, total, {genus: ability}]}}. Expected/ability/new photos are null on answers before v5;
//   choices (the genera offered, space-separated) is '' on answers before v10.
function answers_(q){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Answers'), ra = ss.getSheetByName('RAs'), out = {ok: true, rows: [], players: {}};
  const salt = anonSalt_(), ids = {}, id = n => ids[n] = ids[n] || aid_(n, salt);
  // me: the caller's own id, only with its name and right code (the admin page marks "you").
  const {name, pin} = clean_(q || {});
  if (name && /^\d{4}$/.test(pin) && ra && !blocked_(name)) { const r = find_(ra, name); if (r && ra.getRange(r, 7).getValue() === hash_(name, pin)) out.me = id(name); else if (r) failed_(name); }
  const big = {}; const dt = ss.getSheetByName(DATA_TAB);
  if (dt && dt.getLastRow() > 1) dt.getRange(2, 1, dt.getLastRow() - 1, dt.getLastColumn()).getValues().forEach(r => { big[String(r[0]).toLowerCase()] = r.slice(2).map(String).join(''); });
  if (sh && sh.getLastRow() > 1) out.rows = sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues().filter(r => r[0])
    .map(r => [id(r[0]), new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6])]
      .concat([8, 9, 10].map(i => r[i] === '' ? null : Number(r[i])), [String(r[11] || ''), String(r[0]).indexOf('~anon ') === 0 ? 1 : 0]));
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
// answers, right]}, ras: {anonymous id: [ability, answers]}, conf: {"A|B": [offered, mixed up]}}. Difficulty 0 = average
// photo; +1 = clearly harder. conf (v10): per pair of genera (A before B alphabetically), how often one was shown with the
// other among the choices, and how often the other was answered; only answers that logged their choices (v10) count.
// The app turns it into confusion scores (core.js confScore) to pick the look-alike traps; core.js confusionOf counts the same.
// admin.js eloOf replays the same rules in the browser (photo Elo with or without the author's answers): keep both in step.
// Who rates the photos and the confusions (v17, Pierre 2026-11-02, after 17 anonymous "players" turned out to be test
// runs): signed-in players only (a device that never signed in counts once it does: its answers move to the name), and
// only once their answers show they really play: TRUST.N answers or more, right clearly above chance (one-sided z of at
// least TRUST.Z against each question's guess rate). Bots and random clicking stay out; nobody's own progress, level or
// leaderboard place changes. core.js trustOf replays the same rule for the admin: keep both in step.
const TRUST = {N: 10, Z: 1.645};
const guess_ = mode => { const kq = /\|k(\d)$/.exec(mode); return kq ? 1 / Number(kq[1]) : mode.indexOf('quiz-duel') === 0 ? 0.5 : 0.25; };
function trusted_(rows){  // rows: [who, right 0|1, mode, anonymous]
  const T = {}, out = {};
  rows.forEach(([w, ok, m, an]) => { const t = T[w] = T[w] || [0, 0, 0, 0, an], g = guess_(m); t[0]++; t[1] += ok; t[2] += g; t[3] += g * (1 - g); });
  Object.keys(T).forEach(w => { const t = T[w]; out[w] = !t[4] && t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z; });
  return out;
}
function stats_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('stats9');
  if (hit) return JSON.parse(hit);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), out = {ok: true, photos: {}, ras: {}, conf: {}};
  if (!sh || sh.getLastRow() < 2) return out;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues().filter(r => r[0]).sort((a, b) => new Date(a[1]) - new Date(b[1]));
  const P = {}, R = {}, seen = {}, sig = x => 1 / (1 + Math.exp(-x));
  const trust = trusted_(rows.map(r => [String(r[0]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[0]).indexOf('~anon ') === 0]));
  rows.forEach(r => {
    const who = String(r[0]), ok = Number(r[4]) ? 1 : 0, mode = String(r[5]), fs = String(r[6]).split(/\s+/).filter(Boolean);
    const sg = String(r[2]), sa = String(r[3]);
    if (trust[who]) String(r[11] || '').split(/\s+/).filter(x => x && x !== sg).forEach(x => { const k = sg < x ? sg + '|' + x : x + '|' + sg, c = out.conf[k] = out.conf[k] || [0, 0]; c[0]++; if (!ok && sa === x) c[1]++; });
    if (!fs.length) return;
    const g = guess_(mode), ra = R[who] = R[who] || [0, 0];
    const ph = fs.map(f => P[f] = P[f] || [0, 0, 0]), b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);  // one view alone is harder (app.js PICKD.SINGLE)
    const e = g + (1 - g) * sig(ra[0] - b), d = ok - e;
    ra[0] += 0.6 / (1 + ra[1] / 40) * d; ra[1]++;
    // A photo moves only on a trusted player's first answer on it (one player can't weigh much; a photo seen again may be remembered).
    if (trust[who]) fs.forEach((f, i) => { const k = who + '|' + f; if (seen[k]) return; seen[k] = 1; const p = ph[i]; p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d; p[2]++; p[1] += ok; });
  });
  Object.keys(P).forEach(f => out.photos[f] = [Math.round(P[f][0] * 100) / 100, P[f][2], P[f][1]]);
  const salt = anonSalt_();
  Object.keys(R).forEach(n => out.ras[aid_(n, salt)] = [Math.round(R[n][0] * 100) / 100, R[n][1]]);
  try { cache.put('stats9', JSON.stringify(out), 600); } catch (err) {}  // too big for the cache: computed each time
  return out;
}

// Players' reports (v7): from a game, after the answer, a player says the expected genus is probably wrong (and may say
// which genus it is), the photo shows several corals, the photo is bad, or something else, with an optional note.
// One row per report in the "Reports" tab. The reporter is the sync name when its code matches ("Verified" 1),
// else the name typed or nothing ("Verified" 0). Nothing here changes the photos: Pierre decides in the admin Triage.
// v8: also from an enlarged photo, a genus sheet or any page (feedback): Mode = game, photo, sheet or page; Where = the page.
const REP = ['Time', 'Reporter', 'Verified', 'Reason', 'Expected', 'Answered', 'Suggested genus', 'Note', 'Mode', 'Photos', 'Where', 'Id'];
const WHY = {wrong: 'Wrong answer', multi: 'Several corals', photo: 'Bad photo', info: 'Wrong information', bug: 'Bug', idea: 'Suggestion', other: 'Other'};
const text_ = (x, n) => safe_(String(x == null ? '' : x).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n));
function logReports_(p){
  const L = p.reports.filter(r => r && /^[a-z0-9]{1,20}$/.test(String(r.id)) && WHY[r.why]).slice(0, 50);
  if (!L.length) return {ok: true, rep: true};
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (over_('reports', 300)) return {ok: false, error: 'busy'};  // v12 flood cap, checked under the lock
    const name = String(p.rname || '').trim().slice(0, 40), pin = String(p.rpin || '').trim();
    let ok = 0;
    if (name && /^\d{4}$/.test(pin) && !blocked_(name)) { const ra = sheet_('RAs', HEAD), r = find_(ra, name);
      if (r && ra.getRange(r, 7).getValue() === hash_(name, pin)) ok = 1; else if (r) failed_(name); }
    const sh = sheet_('Reports', REP), n = sh.getLastRow() - 1;
    const seen = new Set(n > 0 ? sh.getRange(2, REP.length, n, 1).getValues().map(r => String(r[0])) : []);
    const G = /^[A-Za-z][A-Za-z -]*$/, M = /^[A-Za-z0-9|-]*$/, PH = /^[A-Za-z0-9_. -]*$/;
    const rows = L.filter(r => !seen.has(String(r.id))).map(r => [new Date(r.t || Date.now()), safe_(name), ok, WHY[r.why], word_(r.g, G, 40), word_(r.a, G, 40),
      text_(r.fix, 60), text_(r.note, 1000), word_(r.m, M, 40), word_(r.ph, PH, 400), text_(r.w, 120), String(r.id)]);
    if (rows.length) { const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
      if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
      sh.getRange(at, 1, rows.length, REP.length).setValues(rows); }
    return {ok: true, rep: true};
  } finally { lock.releaseLock(); }
}
// POST {readReports: 1, token} (v8) → {ok, rows: [[id, time ms, reporter, verified 0|1, reason key, expected, answered,
// suggested genus, note, mode, photos, where]]}, newest first. Names are shown, so only the app's admins get them: anyone whose
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
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, REP.length).getValues().filter(x => x[11])
    .map(x => [String(x[11]), new Date(x[0]).getTime() || 0, String(x[1]), Number(x[2]) ? 1 : 0, key[x[3]] || 'other', String(x[4]), String(x[5]), String(x[6]), String(x[7]), String(x[8]), String(x[9]), String(x[10])]);
  return {ok: true, rows: rows.reverse()};
}

// Progress % of a saved progress over a list of genera: a copy of core.js pctOf (keep the two in step; tests/sync.test.js
// compares them). Per genus: the knowledge probability L fills 95% from 0.1 to 0.95, each mastery-exam question passed
// adds 1%, a passed exam (mx) makes it 100%.
function pctOf_(P, list){
  const L0 = 0.1, T = 0.08, M = 0.95, sig = x => 1 / (1 + Math.exp(-x));
  const step = (L, good) => { const g = 0.25 + 0.75 * sig(-1), sl = 0.1 + 0.9 * sig(-3),
    post = good ? (L * (1 - sl)) / (L * (1 - sl) + (1 - L) * g) : (L * sl) / (L * sl + (1 - L) * (1 - g)); return post + (1 - post) * T; };
  const known = s => typeof s.L === 'number' ? s.L : String(s.h || '').split('').reduce((L, x) => step(L, x === '1'), L0);
  const score = s => { if (!s) return 0; if (s.mx) return 1; const part = Math.min(1, Math.max(0, (known(s) - L0) / (M - L0)));
    return 0.95 * part + (part >= 1 && s.ex ? 0.05 * (s.ex.k || 0) / 5 : 0); };
  return list && list.length ? Math.round(100 * list.reduce((t, n) => t + score((P || {})[n]), 0) / list.length) : 0;
}
const ELO_MIN = 200;
// Public leaderboard (v14; Pierre, 2026-11-01: "a small leaderboard to keep a little competition going"): GET ?board=1 →
// {ok, rows: [[name, progress %, level]]}, every signed-in player with answers who did not opt out (Board 0), ranked by
// progress then level. Level = the player's ability from the photo Elo over every answer (stats_ ras: same scale as photo
// difficulty), so players at 100% still rank by skill. Names are public here by design: the app says so and lets each
// player opt out in its settings (privacy.html). Nothing else of the player leaves the sheet. Cached 5 minutes.
function board_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('board14');
  if (hit) return JSON.parse(hit);
  const ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs'), out = {ok: true, rows: []};
  if (ra && ra.getLastRow() > 1) {
    const ras = stats_().ras || {}, salt = anonSalt_();
    // v16: the % from the saved progress, over the genera of the list (the "By genus" tab's columns, written from each
    // sync's summary), with the app's formula (pctOf_); the app-sent Progress column only when that can't be read.
    const bg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('By genus'),
      list = bg && bg.getLastColumn() > 2 ? bg.getRange(1, 3, 1, bg.getLastColumn() - 2).getValues()[0].map(String).filter(Boolean) : [];
    const pctFrom = r => {
      if (!list.length) return null;
      try { return pctOf_(JSON.parse(JSON.parse(readData_(String(r[0]), String(r[7] || '')).json || '{}')['imr-coral-progress'] || '{}'), list); } catch (e) { return null; }
    };
    out.rows = ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues()
      .filter(r => r[0] && r[9] !== 0 && String(r[9]) !== '0')
      // Progress saved before v14 (blank): learned / total until the player's next sync writes it.
      // Level only from ELO_MIN answers (v15, Pierre: "even 50 is not enough to settle the score"): null before.
      .map(r => { const x = ras[aid_(String(r[0]), salt)], own = pctFrom(r), pct = own != null ? own : r[8] === '' ? (Number(r[4]) ? Math.round(100 * Number(r[2]) / Number(r[4])) : null) : Number(r[8]);
        return x || pct ? [String(r[0]), pct, x && x[1] >= ELO_MIN ? x[0] : null] : null; })
      .filter(Boolean)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0) || (b[2] == null ? -99 : b[2]) - (a[2] == null ? -99 : a[2]))
      .slice(0, 200);
  }
  cache.put('board14', JSON.stringify(out), 300);
  return out;
}

// Achievements, as on Steam (v15; Pierre, 2026-11-01): GET ?achs=1 → {ok, n: signed-in players with an achievement
// record, counts: {achievement id: players holding it}}, from each player's saved progress (its imr-coral-ach key, app.js).
// Counts only, no name. Cached 10 minutes.
function achs_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('achs15');
  if (hit) return JSON.parse(hit);
  const ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs'), out = {ok: true, n: 0, counts: {}};
  if (ra && ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues().filter(r => r[0]).forEach(r => {
    let A = null;
    try { A = JSON.parse(JSON.parse(readData_(String(r[0]), String(r[7] || '')).json || '{}')['imr-coral-ach'] || 'null'); } catch (e) {}
    if (!A || typeof A !== 'object') return;
    out.n++;
    Object.keys(A).forEach(k => { if (k[0] !== '_' && /^[a-z0-9]{1,20}$/.test(k)) out.counts[k] = (out.counts[k] || 0) + 1; });
  });
  cache.put('achs15', JSON.stringify(out), 600);
  return out;
}

// Admin user management (v11, Pierre 2026-11-01: "a page in the admin to manage the users, now that beta testers come").
// Every call needs the admin token (isAdmin_), like reading reports. POST bodies:
//   {users: 1, token} → {ok, users: [{name, updated, learned, seen, total, review, answers, right, first, last, days,
//     modes: {mode: [answers, right]}, recent: [answers, right] (last 50), mix: [[shown, answered, times]] (top 5),
//     reports, size}], removed: [{name, into, time}]}
//   {userData: name, token} → {ok, rev, data}: that player's saved progress (the admin merges two players in the browser,
//     with core.js mergeUsers, then sends the result back with userMerge).
//   {userDelete: name, answers: true|false, token} → deletes the player's rows (RAs, Progress data, By genus). Their
//     answers are deleted too when answers is true (test accounts), else kept for photo difficulty under "~deleted <id>".
//   {userMerge: {from, into, data, at}, token} → into gets data (the merged progress; at = into's revision when the admin
//     read it, else 'stale'), every answer and report of from is relabelled into, and from's rows are deleted.
// Both leave a line in the "Removed" tab (name, code hash, into, time): a device still signed in with that name and code
// gets error 'gone' (with into) instead of silently re-creating the account. Someone new may still pick the name with
// another code. Reports keep their text; nothing else changes.
const REMOVED = ['Name', 'Code hash', 'Into', 'Time'];
function gone_(name, h){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Removed');
  if (!sh || sh.getLastRow() < 2) return null;
  const k = name.toLowerCase(), rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][0]).toLowerCase() === k && rows[i][1] === h) return {into: String(rows[i][2] || '')};
  return null;
}
const lc_ = x => String(x == null ? '' : x).trim().toLowerCase();
// Deletes every row of tab `tab` whose column `col` (1-based) is the name (bottom up, so row numbers stay valid).
function dropRows_(tab, name, col){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return 0;
  const v = sh.getRange(2, col || 1, sh.getLastRow() - 1, 1).getValues(), k = lc_(name); let n = 0;
  for (let i = v.length - 1; i >= 0; i--) if (lc_(v[i][0]) === k) { sh.deleteRow(i + 2); n++; }
  return n;
}
// Renames the name in column `col` of tab `tab` (answers, reports): one write of the whole column.
function relabel_(tab, col, from, into){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return 0;
  const rg = sh.getRange(2, col, sh.getLastRow() - 1, 1), v = rg.getValues(), k = lc_(from); let n = 0;
  v.forEach(r => { if (lc_(r[0]) === k) { r[0] = safe_(into); n++; } });
  if (n) rg.setValues(v);
  return n;
}
function users_(p){
  if (!isAdmin_(String(p.token || ''))) return {ok: false, error: 'token'};
  const ss = SpreadsheetApp.getActiveSpreadsheet(), ra = sheet_('RAs', HEAD);
  const row_ = name => { const r = find_(ra, name); return r ? {r: r, v: ra.getRange(r, 1, 1, HEAD.length).getValues()[0]} : null; };
  const removed_ = (name, h, into) => sheet_('Removed', REMOVED).appendRow([safe_(name), h, safe_(into || ''), new Date()]);
  if (p.userData) {
    const u = row_(String(p.userData)); if (!u) return {ok: false, error: 'user'};
    const d = readData_(String(u.v[0]), String(u.v[7] || ''));
    return {ok: true, rev: d.rev, data: JSON.parse(d.json)};
  }
  // v17: {anonDelete: [anonymous ids], token} deletes every answer of those ids among the rows without a name (devices
  // that never signed in, accounts deleted with their answers kept): test runs and junk (Pierre, 2026-11-02). Never a
  // named player's answers.
  if (Array.isArray(p.anonDelete)) {
    const ids = new Set(p.anonDelete.map(String).slice(0, 500)), salt = anonSalt_();
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const sh = ss.getSheetByName('Answers'); if (!sh || sh.getLastRow() < 2) return {ok: true, answers: 0};
      const v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(), hit = {};
      let n = 0;
      for (let i = v.length - 1; i >= 0; i--) {
        const w = String(v[i][0]);
        if (!/^~(anon|deleted) /.test(w)) continue;
        if (!(w in hit)) hit[w] = ids.has(aid_(w, salt));
        if (hit[w]) { sh.deleteRow(i + 2); n++; }
      }
      try { CacheService.getScriptCache().remove('stats9'); } catch (e) {}
      return {ok: true, answers: n};
    } finally { lock.releaseLock(); }
  }
  if (p.userDelete || p.userMerge) {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      if (p.userDelete) {
        const u = row_(String(p.userDelete)); if (!u) return {ok: false, error: 'user'};
        const name = String(u.v[0]);
        const answers = p.answers ? dropRows_('Answers', name) : relabel_('Answers', 1, name, '~deleted ' + aid_(name));
        ['RAs', DATA_TAB, 'By genus'].forEach(t => dropRows_(t, name));
        removed_(name, u.v[6], '');
        return {ok: true, answers: answers};
      }
      const m = p.userMerge || {}, a = row_(String(m.from || '')), b = row_(String(m.into || ''));
      if (!a || !b || a.r === b.r || !m.data || typeof m.data !== 'object') return {ok: false, error: 'user'};
      const from = String(a.v[0]), into = String(b.v[0]), cur = readData_(into, String(b.v[7] || ''));
      if (typeof m.at === 'number' && m.at !== cur.rev) return {ok: false, error: 'stale', rev: cur.rev};
      const json = JSON.stringify(m.data);
      writeData_(into, json, cur.rev + 1);
      ra.getRange(b.r, 2).setValue(new Date()); ra.getRange(b.r, 8).setValue(json.length < CHUNK ? json : '@' + DATA_TAB);
      const answers = relabel_('Answers', 1, from, into), reports = relabel_('Reports', 2, from, into);
      ['RAs', DATA_TAB, 'By genus'].forEach(t => dropRows_(t, from));
      removed_(from, a.v[6], into);
      return {ok: true, rev: cur.rev + 1, answers: answers, reports: reports};
    } finally { lock.releaseLock(); }
  }
  // The list, with each player's numbers from the Answers and Reports tabs.
  // id (v13): the player's anonymous id, the one ?answers=1 and ?stats=1 use, so the admin's player list can join the two.
  const out = {ok: true, users: [], removed: []}, by = {}, salt = anonSalt_();
  if (ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues().filter(r => r[0]).forEach(r => {
    const u = {name: String(r[0]), id: aid_(String(r[0]), salt), updated: new Date(r[1]).getTime() || 0, learned: Number(r[2]) || 0, seen: Number(r[3]) || 0, total: Number(r[4]) || 0,
      review: String(r[5] || ''), answers: 0, right: 0, first: 0, last: 0, days: 0, modes: {}, recent: [0, 0], mix: [], reports: 0, size: String(r[7] || '').length};
    out.users.push(u); by[lc_(u.name)] = u;
  });
  const an = ss.getSheetByName('Answers'), days = {}, mixes = {}, last50 = {};
  if (an && an.getLastRow() > 1) an.getRange(2, 1, an.getLastRow() - 1, 6).getValues().forEach(r => {
    const u = by[lc_(r[0])]; if (!u) return;
    const t = new Date(r[1]).getTime() || 0, ok = Number(r[4]) ? 1 : 0, mode = String(r[5]).split('|')[0] || '?', k = lc_(u.name);
    u.answers++; u.right += ok; if (t && (!u.first || t < u.first)) u.first = t; if (t > u.last) u.last = t;
    (days[k] = days[k] || {})[Utilities.formatDate ? Utilities.formatDate(new Date(t), 'GMT+8', 'yyyy-MM-dd') : new Date(t + 8 * 36e5).toISOString().slice(0, 10)] = 1;
    const md = u.modes[mode] = u.modes[mode] || [0, 0]; md[0]++; md[1] += ok;
    (last50[k] = last50[k] || []).push([t, ok]);
    if (!ok && r[3] && r[3] !== r[2]) { const x = (mixes[k] = mixes[k] || {}), key = r[2] + '|' + r[3]; x[key] = (x[key] || 0) + 1; }
  });
  Object.keys(by).forEach(k => { const u = by[k];
    u.days = Object.keys(days[k] || {}).length;
    const L = (last50[k] || []).sort((a, b) => a[0] - b[0]).slice(-50); u.recent = [L.length, L.reduce((t, x) => t + x[1], 0)];
    u.mix = Object.keys(mixes[k] || {}).map(x => x.split('|').concat([mixes[k][x]])).sort((a, b) => b[2] - a[2]).slice(0, 5); });
  const rp = ss.getSheetByName('Reports');
  if (rp && rp.getLastRow() > 1) rp.getRange(2, 2, rp.getLastRow() - 1, 1).getValues().forEach(r => { const u = by[lc_(r[0])]; if (u) u.reports++; });
  const rm = ss.getSheetByName('Removed');
  if (rm && rm.getLastRow() > 1) out.removed = rm.getRange(2, 1, rm.getLastRow() - 1, 4).getValues().filter(r => r[0]).map(r => ({name: String(r[0]), into: String(r[2] || ''), time: new Date(r[3]).getTime() || 0})).reverse();
  return out;
}

// Self-update from GitHub (v11; Pierre, 2026-11-01: "find a way to redeploy the script without me"). A time trigger
// (installAutoUpdate, run once by hand in the editor) calls autoUpdate every 15 minutes: when tools/sync/Code.gs on main
// carries a higher VERSION, the script replaces its own code with it (and its manifest with tools/sync/appsscript.json),
// saves a new version and points the existing web app deployment(s) at it, through the Apps Script API with the
// script's own OAuth token. The /exec URL never changes. Needs, once: the Apps Script API switched on in
// https://script.google.com/home/usersettings, the manifest's scopes accepted (running installAutoUpdate asks), and a
// first manual deploy of this version. A newer file without autoUpdate is never installed (it would end the updates);
// every attempt that does something is written to the "Deploy log" tab. Anyone who can push to main can change this
// script, exactly as they can change the site.
const SELF_RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/tools/sync/';
// Run once by hand: makes the trigger, then checks right away that the Apps Script API answers this script (a project
// whose hidden Cloud project can't use the API fails here, with what to do, instead of at the first real update).
function installAutoUpdate(){
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'autoUpdate').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoUpdate').timeBased().everyMinutes(15).create();
  const r = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + '/content', {headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true});
  const msg = r.getResponseCode() === 200 ? 'Self-update ready: the Apps Script API answers. ' + autoUpdate()
    : 'Self-update NOT ready: the Apps Script API answered ' + r.getResponseCode() + ' (' + r.getContentText().slice(0, 200) + '). Check that the API is on in script.google.com/home/usersettings, else link a Google Cloud project with the Apps Script API enabled (see HANDOVER).';
  sheet_('Deploy log', ['Time', 'Event']).appendRow([new Date(), msg.slice(0, 500)]);
  Logger.log(msg);
  return msg;
}
function autoUpdate(){
  const log = m => sheet_('Deploy log', ['Time', 'Event']).appendRow([new Date(), String(m).slice(0, 500)]);
  try {
    const get = f => UrlFetchApp.fetch(SELF_RAW + f + '?t=' + Date.now(), {muteHttpExceptions: true});
    const src = get('Code.gs'); if (src.getResponseCode() !== 200) return 'github ' + src.getResponseCode();
    const code = src.getContentText(), m = /const VERSION = (\d+);/.exec(code), v = m ? Number(m[1]) : 0;
    // AUTO_PENDING: a version whose code is already in place but whose deployment did not finish (a failed /versions or
    // /deployments call). The code running now is then that version, so it must finish the deployment, not skip it.
    const props = PropertiesService.getScriptProperties(), pending = Number(props.getProperty('AUTO_PENDING') || 0);
    if (v <= VERSION && !pending) return 'up to date (v' + VERSION + ')';
    if (v > VERSION && code.indexOf('function autoUpdate(') < 0) { log('v' + v + ' not installed: it has no autoUpdate'); return 'skipped'; }
    const man = get('appsscript.json'), id = ScriptApp.getScriptId(), auth = {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()};
    const api = (method, path, body) => { const o = {method: method, headers: auth, muteHttpExceptions: true}; if (body) { o.contentType = 'application/json'; o.payload = JSON.stringify(body); }
      const r = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + id + path, o);
      if (r.getResponseCode() >= 300) throw new Error(method.toUpperCase() + ' ' + path + ' ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
      return JSON.parse(r.getContentText() || '{}'); };
    if (v > VERSION) {
      const files = api('get', '/content').files || [], js = files.filter(f => f.type === 'SERVER_JS');
      if (js.length !== 1) { log('v' + v + ' not installed: expected one script file, found ' + js.length); return 'skipped'; }
      props.setProperty('AUTO_PENDING', String(v));
      api('put', '/content', {files: files.map(f => ({name: f.name, type: f.type,
        source: f.type === 'SERVER_JS' ? code : f.name === 'appsscript' && man.getResponseCode() === 200 ? man.getContentText() : f.source}))});
    }
    const dv = Math.max(v, pending), ver = api('post', '/versions', {description: 'v' + dv + ' from GitHub main'});
    const deps = (api('get', '/deployments').deployments || []).filter(d => d.deploymentConfig && d.deploymentConfig.versionNumber && (d.entryPoints || []).some(e => e.entryPointType === 'WEB_APP'));
    deps.forEach(d => api('put', '/deployments/' + d.deploymentId, {deploymentConfig: {versionNumber: ver.versionNumber, manifestFileName: 'appsscript', description: 'v' + dv + ' (auto)'}}));
    props.deleteProperty('AUTO_PENDING');
    log('deployed v' + dv + ' as version ' + ver.versionNumber + ' (' + deps.length + ' web app deployment' + (deps.length === 1 ? '' : 's') + ')' + (v > VERSION ? '' : ', finishing an interrupted update'));
    return 'deployed v' + dv;
  } catch (e) { log('error: ' + e.message); return 'error'; }
}

// Players who never sign in (v12, Pierre 2026-11-01: their answers should still improve the photo ratings and the
// confusions). POST {anon: random device id, anonAnswers: [...]}: logged like a signed-in player's, under the name
// "~anon <id>" (no name, no code). Signing in later moves them to the name (doPost, p.anon). Caps: 100 answers per
// request, 600 per id and 6000 for all anonymous players every 6 hours; over that: {ok: false, error: 'busy'}.
function anon_(p){
  const id = String(p.anon || '');
  if (!/^[a-z0-9]{8,16}$/.test(id)) return {ok: false, error: 'input'};
  const L = p.anonAnswers.slice(0, 100);
  // Counters are read and written under the script lock, so concurrent requests cannot both pass a cap.
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (over_('a:' + id, 600, L.length) || over_('anon', 6000, L.length)) return {ok: false, error: 'busy'};
    logAnswers_('~anon ' + id, L);
  } finally { lock.releaseLock(); }
  return {ok: true, log: true};
}
// Flood guard: a counter per key in the script cache for a 6-hour window. Call it under the script lock (doPost, anon_,
// logReports_ hold it), so a read and the write that follows are not interleaved with another request. Returns true (and counts nothing) when adding
// n would pass the limit; the first refusal of a window is written to the "Alerts" tab, so Pierre and agents see it.
function over_(key, limit, n){
  n = n || 1;
  const c = CacheService.getScriptCache(), w = Math.floor(Date.now() / 216e5), k = 'cap:' + key + ':' + w, v = Number(c.get(k) || 0);
  if (v + n > limit) {
    if (!c.get(k + ':alert')) { c.put(k + ':alert', '1', 21600); try { sheet_('Alerts', ['Time', 'Event']).appendRow([new Date(), safe_('limit reached: ' + key + ' (' + limit + ' per 6 h)')]); } catch (e) {} }
    return true;
  }
  c.put(k, String(v + n), 21600);
  return false;
}

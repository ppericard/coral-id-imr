// IMR Coral ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 29 (2026-11-04: v29: the embedded core.js gains the admin's quantile and distOf helpers (Photo stats Overview), unused by the script; v28: progress replayed from the whole answer log by this script: the app's own progress engine (core.js, embedded at the end of this file by tools/sync_core.py) replays a player's answers in the reply to a sign-in, load or save (or to a device's anonymous answers) when their app applied an older rules version, the result kept in a new Replayed tab and sent as replay: {rv, n, rec, ids}; the app adopts it, the player's saved copy is never rewritten here; the hold's ids, like the replay's, cover every answer from the request's pt (the oldest answer the device still queues); v27: typed answers (mode |t, the player types the genus instead of picking one of the choices) are rated with no guess rate (guess_ 0), stats cache stats14; v26: photo memory estimated from the answers: an answer on a photo is expected easier by an offset that depends on the player's own history with it (new 0; shown never right, right once, right twice or more: estimated in the same replay as the photos and the players, shrunk to the old fixed rule as prior), one expectation for the photos and the player's level (until v25 the level ignored memory), ?stats=1 serves the offsets as mem and the answers behind them as memn (stats cache stats13); v25: a request from an app version before 2026-11-03 (no av) is logged in Events as kind 'old', with the name or anonymous id when it carries one, at most once an hour per sender; v24: the flood caps count only answers the sheet does not have yet, so a device sending again what it already sent (the app's one-time catch-up of anonymous answers, a resend after a lost reply) never uses up its quota; v23: the opening hold synced: each load of a player's progress carries hold, the app's CUSUM (model.js holdStep) over their logged answers since their last progress reset, the gentle restart's answers (mode |w) left out; Answers gets two columns at the end, Seconds (time to answer) and Enlarged (a photo enlarged before answering, 0/1), logged only; v22: the leaderboard % follows the app's new progress per genus, a moving average of the answers weighed by what each one proves (s.pg, core.js PROG, pgOf); progress saved before it replays its last 10 results; v21: Events tab: one 'load' event a visit with the load times (first page, quiz, first quiz photo), the line measured, the bytes downloaded and the CDN server, so the loading order is set from the players' real lines; v20: the admin can hide a player from the public leaderboard (Board -1, userBoard), which the player's own syncs never undo (a test account); 2-choice questions logged as plain quiz are rated as 2-choice (from the Choices column; stats cache stats12); the admin can rename a player to keep their record apart (userRename: answers, reports, progress follow, hidden from the leaderboard; the old name is free again, so the person can start over under it); v19: Events tab: anonymous error reports from the players' devices (app errors, photos that fail, saves that fail) and their answers to the occasional one-tap question (too easy / about right / too hard); admin readEvents; v18: devices that never signed in count for photo difficulty and confusions under the same rule as signed-in players (10 answers, clearly above chance, weighed by experience n / (n + 10)); plain answer count per photo; v17: photo difficulty and confusions count only signed-in players whose answers are clearly above chance (10 answers or more); every player starts as a beginner (level -1); a player's answers move the photos more as their level settles (n / (n + 30)), and repeats count against what the player remembers of the photo; answers of a device that never signed in count once it signs in; readAnswers rows carry an anonymous flag; admin anonDelete removes the answers of chosen anonymous ids (test runs); v16: the leaderboard computes each player's progress % itself from their saved progress (same formula as the app), so it is up to date for everyone without waiting for their next sync; v15: the leaderboard shows a player's level only from 200 answers (it moves too much before); GET ?achs=1 gives how many signed-in players hold each achievement; v14: public leaderboard (GET ?board=1: name, progress %, level of every signed-in player who did not opt out), the progress % and the opt-out are saved with each sync (Progress, Board columns); per-player answers and abilities are admin-only (POST readAnswers / readStats with the token), so leaderboard names can't be matched to an answer history; v13: the admin player list gives each player's anonymous id, so the admin can show names beside the anonymous answer stats (admin token only, like the names); v12: answers of players who never sign in arrive under a random device id (~anon <id>), moved to the name at sign-in; caps against floods (per anonymous id, per name, new accounts, reports) with an Alerts tab; v11: updates itself from GitHub (autoUpdate, every 15 min, once installAutoUpdate has run: no more copy and paste); admin user management: list players with their stats, delete a player, merge two names of one person (admin token only); a removed name+code gets error 'gone' instead of a new account; the mode of a duel on a chosen pair (quiz-duel|A|B) is kept (it was dropped, so it was rated as a 4-choice answer); v10: each answer logs the choices offered (Choices column), and ?stats=1 adds how often each pair of genera was offered together and mixed up (confusion scores); v9: quiz questions with easy wrong choices are logged "quiz|kN" (N plausible choices) and rated with a 1/N guess; v8: reports read by every admin with their GitHub token (v7 had a single owner), reports and feedback from anywhere in the app (photos, sheets, pages); v7: players report a wrong answer or a bad photo (Reports tab); v6: code review fixes: progress of any size (Progress data tab), stale-write check, input sanitised, PIN throttle, secret salt for anonymous ids; earlier: v5 continuous difficulty)
// Setup: Extensions > Apps Script, paste this file, Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Put the /exec URL in SYNC_URL in app.js.
// Each RA picks a name and a 4-digit code in the app; the code only stops accidental overwrites.

const SALT = 'imr-coral-id';
// Progress and Board (v14): the player's progress % (as the app shows it) and 0 when they chose to stay off the public
// leaderboard (blank or 1 = shown); -1 (v20) = hidden by an admin (userBoard), kept whatever the player's app sends.
const HEAD = ['Name', 'Updated', 'Learned', 'Seen', 'Total', 'Review first', 'Code hash', 'Data', 'Progress', 'Board'];
const COLORS = {ok: '#dcefd9', mid: '#e3f1f3', weak: '#f7dcd6', new: '#f2f2f2'};
const LABELS = {ok: 'Learned', mid: 'Learning', weak: 'Review', new: ''};
// One row per quiz answer: the history behind each RA's progress. Activity sums it up per RA.
// Seconds and Enlarged (v23, Pierre 2026-11-02: a right answer that needed a long look or an enlarged photo says the photo
// was harder; logged to be analysed later, nothing uses them yet): seconds from the question's photos in view to the
// answer (0-600, 0.1 s), and 1 when a photo of the question was enlarged before answering. Added at the end: every reader
// takes the columns by position (answers_, stats_, users_, the Activity QUERY), so the first twelve never move.
const LOG = ['Name', 'Time', 'Genus shown', 'Answered', 'Right', 'Mode', 'Photos', 'Id', 'Expected', 'Ability', 'New photos', 'Choices', 'Seconds', 'Enlarged'];
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
const VERSION = 29;  // bump with the header line on every change; every reply carries it as v
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

// GET ?stats=1 → photo difficulty learned from every answer (Elo, see stats_), cached 10 minutes: photos, conf and the
// photo memory offsets (mem, memn, v26) only.
// Per-player numbers are admin-only from v14 (the public leaderboard names players: a public per-id ability or answer log
// could be matched to a name): POST {readStats: 1, token} → stats_ with ras; POST {readAnswers: 1, token, aname, apin}
// → answers_ (aname/apin, never name/pin: an older script must not take it for a progress write). GET ?answers=1 → 'token'.
// GET ?name=…&pin=… → the saved progress for that RA, if the code matches, and (v23) their opening hold (hold_).
function doGet(e){
  ROWS_ = null;
  if (e.parameter.stats && !e.parameter.av) oldApp_('photo stats');
  if (e.parameter.stats) { const st = stats_(); return json_({ok: st.ok, photos: st.photos, conf: st.conf, mem: st.mem, memn: st.memn}); }
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
  if (!e.parameter.av) oldApp_('load', name);  // only for a real account with its code (Codex review #373)
  const d = readData_(name, String(row[7] || '')), data = JSON.parse(d.json), out = {ok: true, found: true, updated: row[1], rev: d.rev, data: data};
  // v23: the player's opening hold from their answers (hold_). An app before v23 ignores it; a failure leaves it out
  // (the app keeps its own).
  try { const o = hold_(name, resetOf_(data), Number(e.parameter.pt)); out.hold = o.h; out.holdIds = o.ids; } catch (err) {}
  // v28: the full replay of the player's log, when their app applied an older rules version (replay_). A failure leaves
  // it out (the app keeps its own progress and asks again next time).
  if (e.parameter.rv !== undefined) {
    const lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) try { const rp = replay_(name, resetOf_(data), Number(e.parameter.rv), Number(e.parameter.pt)); if (rp) out.replay = rp; } catch (err) {} finally { lock.releaseLock(); }
  }
  return json_(out);
}

// POST {name, pin, data, summary: {learned, seen, total, review: [], genera: {Genus: 'ok'|'mid'|'weak'|'new'}},
//   answers: [{id, t, g, a, ok, m, ph, e, th, nw, ch, rt, zm}], at: revision merged against (optional)} → {ok, log: true, rev}.
// log tells the app its answers are saved; they are logged first, so they are kept even if the progress write fails.
// at ≠ the saved revision → {ok: false, error: 'stale', log: true}: another device wrote meanwhile; the app pulls, merges, resends.
// POST {reports: [...], rname, rpin} → {ok, rep: true}: players' reports (logReports_, v7). The reporter goes in rname/rpin,
// never name/pin, so an older script answers 'input' and never mistakes a report for an empty progress write.
function doPost(e){
  ROWS_ = null;
  const p = JSON.parse(e.postData.contents);
  if (Array.isArray(p.anonAnswers) && !p.av) oldApp_('anonymous answers', '~anon ' + String(p.anon || '').slice(0, 16));
  if (Array.isArray(p.anonAnswers)) return json_(anon_(p));  // v12: players not signed in (see anon_)
  if (Array.isArray(p.reports)) return json_(logReports_(p));
  if (p.readReports) return json_(reports_(p.token));  // admin: POST {readReports: 1, token} (see reports_)
  if (Array.isArray(p.events)) return json_(events_(p));  // v19: error reports and one-tap answers (see events_)
  if (p.readEvents) return json_(readEvents_(p.token));  // admin: POST {readEvents: 1, token}
  if (p.readStats || p.readAnswers) {  // admin (v14): per-player numbers, see doGet
    if (!isAdmin_(String(p.token || ''))) return json_({ok: false, error: 'token'});
    return json_(p.readStats ? stats_() : answers_({name: p.aname, pin: p.apin}));
  }
  if (p.users || p.userData || p.userDelete || p.userMerge || p.anonDelete || p.userBoard || p.userRename) return json_(users_(p));  // admin user management (v11, see users_)
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
    // Only the answers the sheet does not have yet count (v24): a resend after a lost reply uses up nothing.
    const f = freshAnswers_(p.answers);
    if (f.fresh.length && over_('n:' + name.toLowerCase(), 3000, f.fresh.length)) return json_({ok: false, error: 'busy'});
    // The first send after signing in carries the device's anonymous id: its anonymous answers become this name's, for an
    // existing account (code checked above) as for a new one (before logAnswers_, which skips the resent ids).
    if (/^[a-z0-9]{8,16}$/.test(String(p.anon || ''))) relabel_('Answers', 1, '~anon ' + p.anon, name);
    logAnswers_(name, f.fresh, f.seen);
    if (!p.av) oldApp_('save', name);  // after the code check (Codex review #373)
    const rev = r ? readData_(name, String(sh.getRange(r, 8).getValue() || '')).rev : 0;
    if (typeof p.at === 'number' && p.at !== rev) return json_({ok: false, error: 'stale', log: true, rev: rev});
    const json = JSON.stringify(p.data || {});
    try {
      writeData_(name, json, rev + 1);
      if (!r) { r = sh.getLastRow() + 1; }
      if (sh.getRange(1, 9).getValue() !== HEAD[8]) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');  // tab made before v14
      const pct = typeof s.pct === 'number' && isFinite(s.pct) ? Math.max(0, Math.min(100, Math.round(s.pct))) : '';
      // Board: the player's choice when the app sends it, else the one saved (an older app must not undo an opt-out).
      // An admin's hide (-1, v20) stays: the player's app never sends it back to 1.
      const saved = r ? sh.getRange(r, 10).getValue() : '',
        board = Number(saved) === -1 && saved !== '' ? -1 : typeof s.board === 'number' ? (s.board ? 1 : 0) : saved === 0 ? 0 : 1;
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
    // The hold over every answer now logged, in time order (Codex review #370: a device that sent answers older than
    // another device's must not keep the order it replayed them in): the app takes it after a send.
    const out = {ok: true, log: true, rev: rev + 1};
    try { const o = hold_(name, resetOf_(p.data), p.pt); out.hold = o.h; out.holdIds = o.ids; } catch (err) {}
    // v28: the full replay, over every answer now logged (replay_).
    try { const rp = replay_(name, resetOf_(p.data), typeof p.rv === 'number' ? p.rv : NaN, p.pt); if (rp) out.replay = rp; } catch (err) {}
    return json_(out);
  } finally { lock.releaseLock(); }
}

// Appends new answers to the Answers tab, skipping ids already anywhere in it (a resend after a lost reply).
// The answers of a send the Answers tab does not have yet (by id): what the flood caps count (v24, Codex review #372: a
// device sending again what it already sent must not use up its quota). The ids read once are handed to logAnswers_.
function freshAnswers_(answers){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), n = sh ? sh.getLastRow() - 1 : 0;
  const seen = new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
  return {seen: seen, fresh: (Array.isArray(answers) ? answers : []).filter(a => a && a.id && !seen.has(String(a.id)))};
}
function logAnswers_(name, answers, seen0){
  if (!Array.isArray(answers) || !answers.length) return;
  const sh = sheet_('Answers', LOG);
  if (sh.getRange(1, LOG.length).getValue() !== LOG[LOG.length - 1]) sh.getRange(1, 1, 1, LOG.length).setValues([LOG]).setFontWeight('bold');  // tab made before v5 (or v10, v23: the new columns get their header)
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activity')) sheet_('Activity').getRange(1, 1).setFormula(ACTIVITY);
  const n = sh.getLastRow() - 1;
  const seen = seen0 || new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
  const G = /^[A-Za-z][A-Za-z -]*$/, M = /^[A-Za-z0-9|-]*$/, PH = /^[A-Za-z0-9_. -]*$/, ID = /^[a-z0-9]+$/, CH = /^[A-Za-z ]*$/;
  const rows = answers.filter(a => a && a.id && ID.test(String(a.id)) && !seen.has(String(a.id))).slice(0, 2000)
    .map(a => [safe_(name), new Date(a.t), word_(a.g, G, 40), word_(a.a, G, 40), a.ok ? 1 : 0, word_(a.m, M, 40), word_(a.ph, PH, 400), String(a.id).slice(0, 20), num_(a.e), num_(a.th), num_(a.nw), word_(a.ch, CH, 200), secs_(a.rt), flag_(a.zm)]);
  if (!rows.length) return;
  const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
  if (sh.getMaxColumns && sh.getMaxColumns() < LOG.length) sh.insertColumnsAfter(sh.getMaxColumns(), LOG.length - sh.getMaxColumns());
  sh.getRange(at, 1, rows.length, LOG.length).setValues(rows);
  dropHold_(name);
}
const num_ = x => typeof x === 'number' && isFinite(x) ? x : '';
// v23: seconds to answer, 0-600 to the tenth (blank when the app sent none: before v23, or photos never loaded); and a
// 0/1 flag (blank when not sent).
const secs_ = x => typeof x === 'number' && isFinite(x) ? Math.round(Math.max(0, Math.min(600, x)) * 10) / 10 : '';
const flag_ = x => x === 1 || x === true ? 1 : x === 0 || x === false ? 0 : '';

// The opening hold (v23, Pierre 2026-11-02: it follows the player from one device to another, and is rebuilt from the
// answers they gave before it existed: an RA who left on a run of misses had no hold on his device). The app's rule
// (model.js holdStep, docs/LEARNING.md "Held while the player falls behind"): over the answers in time order, h = max(0,
// h + expected - right - SLACK), rounded to 1/1000 at each step as the app does; no new genus card while h is 1.5 or
// more (the app decides that). Answers of the gentle restart (mode with |w, from v23) do not count, older rows do; only
// the answers since the player's last progress reset count (imr-coral-reset, as the app starts the hold over then).
// HOLD.SLACK is model.js INTRO.SLACK: keep both in step (tests/sync.test.js replays model.js on the same answers).
// The app takes it and adds its own answers the sheet has not confirmed yet (model.js holdSync). Cached per player
// until their next answers are logged or moved (logAnswers_, relabel_, dropRows_).
const HOLD = {SLACK: 0.1, IDS: 500};
const holdKey_ = name => 'hold:' + lc_(name);
function dropHold_(name){ ROWS_ = null; try { CacheService.getScriptCache().remove(holdKey_(name)); } catch (e) {} }
function resetOf_(data){
  try { return resetAt_(JSON.parse((data || {})['imr-coral-reset'] || '""')); } catch (e) { return 0; }
}
// A progress reset time as the app keeps it (an ISO string) in ms, 0 when there is none.
const resetAt_ = t => typeof t === 'string' && t ? new Date(t).getTime() || 0 : 0;
// Returns {h, ids}: ids = the answer ids of the player's last HOLD.IDS rows counted, so the app does not add again the
// answers of a send whose reply was lost (they are already in h; Codex review #370), and every row from pt on (the time
// of the oldest answer the device still queues, as replay_ reads it: a lost reply can leave up to 2,000 answers already
// logged in the queue; Codex review #399). The cache keeps the last HOLD.IDS and the time of the first of them (t): a
// pt before it reads the rows again.
function hold_(name, since, pt){
  const c = CacheService.getScriptCache(), k = holdKey_(name), hit = c.get(k),
    from = typeof pt === 'number' && isFinite(pt) ? pt - 1000 : Infinity;
  if (hit) { const o = JSON.parse(hit); if (o.s === since && o.ids && typeof o.t === 'number' && from > o.t) return {h: o.h, ids: o.ids}; }
  const who = lc_(name);
  let h = 0;
  const rows = answerRows_()
    .filter(r => lc_(r[0]) === who && !/\|w(\||$)/.test(String(r[5])))
    .map(r => [new Date(r[1]).getTime() || 0, Number(r[4]) ? 1 : 0, Number(r[8]) || 0, String(r[7])])
    .filter(r => r[0] > since)
    .sort((a, b) => a[0] - b[0]);  // stable: answers logged with the same time keep the sheet's order
  rows.forEach(([, ok, e]) => { h = Math.max(0, Math.round((h + e - ok - HOLD.SLACK) * 1000) / 1000); });
  const last = rows.slice(-HOLD.IDS), ids = rows.filter((r, i) => i >= rows.length - HOLD.IDS || r[0] >= from).map(r => r[3]);
  try { c.put(k, JSON.stringify({s: since, h: h, ids: last.map(r => r[3]), t: last.length ? last[0][0] : 0}), 21600); } catch (e) {}
  return {h: h, ids: ids};
}

// The Answers tab read once per request (columns A-L): hold_ and replay_ both go through it. Dropped whenever answers
// are logged or moved (dropHold_), and at the start of each request.
let ROWS_ = null;
function answerRows_(){
  if (ROWS_) return ROWS_;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers');
  return ROWS_ = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 12).getValues() : [];
}

// Full replay of a player's progress (v28, Pierre 2026-11-03: progress is recalculated from the whole answer log,
// automatically, never by a human click, now and whenever the progress engine changes). The engine is core.js, embedded
// at the end of this file (CORE_, kept identical by tools/sync_core.py): replayProgress over the player's rows of the
// Answers tab since their last progress reset, with the photo memory offsets and the pooled confusions of stats_ (cached)
// and the genera's look-alikes and families from data.json (gen_). RV (core.js RVS) is the rules version: every change to
// a progress rule appends one. Done in the reply to a sign-in, a load or a save whose app says it applied an older
// version (rv below CORE_.RV; an app that sends no rv cannot adopt a replay and gets none), and for a device that never
// signed in in the reply to its anonymous answers. The result is kept in the "Replayed" tab, one row per player (name,
// or "~anon <id>"): Name, Rules (rv), Rows (n, the player's rows replayed), Since (the reset time, ms), Updated, then
// the record JSON in 45,000-character chunks; it is reused while the rules, the row count and the reset are the same,
// computed again otherwise. The player's own saved copy (Progress data, RAs Data) is never rewritten here (no race
// with a device's save): the app adopts the replay and saves it itself (sync.js replayAdopt). The reply carries
// replay: {rv, n, rec, ids}: rec the replayed record per genus and '~level' (core.js replayProgress's P), ids the ids of
// the rows replayed that the app may still hold in its queue, so it does not replay again an answer the sheet already
// counted: every row from pt on (the time of the oldest answer queued on the device, sent with the request; a second of
// margin for the sheet's dates), at least the last HOLD.IDS rows (an app that sends no pt). Until Codex review #399 only
// the last HOLD.IDS, while a lost reply can leave up to 2,000 answers already logged in the device's queue.
// Cost per player: the Answers tab is read once per request anyway (hold_), the replay of a few hundred rows takes
// milliseconds, data.json is fetched once every 6 hours (cached), stats_ is the cached ?stats=1 computation.
const RPL = {TAB: 'Replayed', HEAD: ['Name', 'Rules', 'Rows', 'Since', 'Updated', 'Record']};
// The genera's look-alikes and families (data.json gen and x.gen, as the app's GX), what the replay's look-alike test
// needs: from GitHub main, cached 6 hours. null when it cannot be read (no replay then; the app keeps its own).
function gen_(){
  const c = CacheService.getScriptCache(), hit = c.get('gen1');
  if (hit) return JSON.parse(hit);
  const r = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + REPO + '/main/data.json', {muteHttpExceptions: true});
  if (r.getResponseCode() !== 200) return null;
  const d = JSON.parse(r.getContentText()), out = {};
  [d.gen || {}, (d.x || {}).gen || {}].forEach(G => Object.keys(G).forEach(n => {
    if (!out[n]) out[n] = {look: (G[n].look || []).filter(x => typeof x === 'string'), fam: String(G[n].fam || '')};
  }));
  if (!Object.keys(out).length) return null;
  try { c.put('gen1', JSON.stringify(out), 21600); } catch (e) {}
  return out;
}
// An Answers row as a replay row (core.js replayProgress): [player, time ms, shown, answered, right, mode, photos, e, th,
// new photos, choices]; blank numbers are null (answers before v5).
const numOrNull_ = x => x === '' || x == null || !isFinite(Number(x)) ? null : Number(x);
const rowOf_ = (who, r) => [who, new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6]), numOrNull_(r[8]), numOrNull_(r[9]), numOrNull_(r[10]), String(r[11] || '')];
function replay_(key, since, appRv, pt){
  if (typeof appRv !== 'number' || !isFinite(appRv) || appRv >= CORE_.RV) return null;
  const who = lc_(key), mine = answerRows_().filter(r => lc_(r[0]) === who && (new Date(r[1]).getTime() || 0) > since);
  const rows = mine.map(r => rowOf_(who, r)), n = rows.length;
  const byTime = mine.map(r => [new Date(r[1]).getTime() || 0, String(r[7])]).sort((a, b) => a[0] - b[0]);
  const from = typeof pt === 'number' && isFinite(pt) ? pt - 1000 : Infinity;
  const ids = byTime.filter((r, i) => i >= byTime.length - HOLD.IDS || r[0] >= from).map(r => r[1]);
  const sh = sheet_(RPL.TAB, RPL.HEAD), at = find_(sh, key);
  if (at) {
    const row = sh.getRange(at, 1, 1, sh.getLastColumn()).getValues()[0];
    if (Number(row[1]) === CORE_.RV && Number(row[2]) === n && Number(row[3]) === since) {
      try { return {rv: CORE_.RV, n: n, rec: JSON.parse(row.slice(5).map(String).join('') || '{}'), ids: ids}; } catch (e) {}
    }
  }
  const gen = gen_();
  if (!gen) return null;
  const st = stats_(), rep = CORE_.replayProgress(rows, {gen: gen, mem: st.mem, conf: st.conf})[who], rec = rep ? rep.P : {};
  const json = JSON.stringify(rec), parts = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(safe_(json.slice(i, i + CHUNK)));
  const r = at || sh.getLastRow() + 1, old = at ? sh.getLastColumn() : 0, out = [safe_(key), CORE_.RV, n, since, new Date()].concat(parts);
  while (out.length < old) out.push('');  // chunks left over from a longer record
  sh.getRange(r, 1, 1, out.length).setValues([out]);
  return {rv: CORE_.RV, n: n, rec: rec, ids: ids};
}

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

// {ok, rows: [[id, time ms, genus shown, answered, right 0|1, mode, photos, expected, ability, new photos, choices, anonymous 0|1,
//   seconds, enlarged 0|1]], players: {id: [learned, seen, total, {genus: ability}]}}. Expected/ability/new photos are null
//   on answers before v5; choices (the genera offered, space-separated) is '' on answers before v10; seconds and enlarged
//   (v23, at the end so the indexes before them never move) are null on answers before v23.
function answers_(q){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Answers'), ra = ss.getSheetByName('RAs'), out = {ok: true, rows: [], players: {}};
  const salt = anonSalt_(), ids = {}, id = n => ids[n] = ids[n] || aid_(n, salt);
  // me: the caller's own id, only with its name and right code (the admin page marks "you").
  const {name, pin} = clean_(q || {});
  if (name && /^\d{4}$/.test(pin) && ra && !blocked_(name)) { const r = find_(ra, name); if (r && ra.getRange(r, 7).getValue() === hash_(name, pin)) out.me = id(name); else if (r) failed_(name); }
  const big = {}; const dt = ss.getSheetByName(DATA_TAB);
  if (dt && dt.getLastRow() > 1) dt.getRange(2, 1, dt.getLastRow() - 1, dt.getLastColumn()).getValues().forEach(r => { big[String(r[0]).toLowerCase()] = r.slice(2).map(String).join(''); });
  if (sh && sh.getLastRow() > 1) out.rows = sh.getRange(2, 1, sh.getLastRow() - 1, 14).getValues().filter(r => r[0])
    .map(r => [id(r[0]), new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6])]
      .concat([8, 9, 10].map(i => r[i] === '' ? null : Number(r[i])), [String(r[11] || ''), String(r[0]).indexOf('~anon ') === 0 ? 1 : 0],
        [12, 13].map(i => r[i] === '' || r[i] == null ? null : Number(r[i]))));
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
// single view was shown alone (harder than the same photo with the other views), minus the player's photo memory (MEM,
// v26). Ratings move by K * (result - P(right)), K shrinking as a photo or an RA gathers answers. Returns {ok, photos:
// {file: [difficulty, answers, right]}, ras: {anonymous id: [ability, answers]}, conf: {"A|B": [offered, mixed up]},
// mem: [offsets by memory bucket], memn: [trusted answers in each]}. Difficulty 0 = average photo, met for the first
// time; +1 = clearly harder. conf (v10): per pair of genera (A before B alphabetically), how often one was shown with the
// other among the choices, and how often the other was answered; only answers that logged their choices (v10) count.
// The app turns it into confusion scores (core.js confScore) to pick the look-alike traps; core.js confusionOf counts the same.
// admin.js eloOf replays the same rules in the browser (photo Elo with or without the author's answers): keep both in step.
// Who rates the photos and the confusions (v17, Pierre 2026-11-02, after 17 anonymous "players" turned out to be test
// runs; v18: devices that never signed in too, under the same rule, now that it tells real players from bots and random
// clicking, Pierre): players whose answers show they really play: TRUST.N answers or more, right clearly above chance (one-sided z of at
// least TRUST.Z against each question's guess rate). Bots and random clicking stay out; nobody's own progress, level or
// leaderboard place changes. core.js trustOf replays the same rule for the admin: keep both in step.
// N is per player, not per photo: a photo counts from its first answer (Pierre kept 10, 2026-11-02).
const TRUST = {N: 10, Z: 1.645};
// How much one answer moves the photos (v17, Pierre 2026-11-02): a player's answers weigh n / (n + PHOTO_W.N) after n
// answers (Glicko's idea: a player whose level is still uncertain moves the items little; a beginner answering at
// random at first counts more and more as their level settles). Every answer counts, repeats too, but against what the
// player is expected to remember of that photo (Duolingo half-life regression and PFA: the item's difficulty is fitted
// beside the player's own history with it): v17-v25 a fixed rule, a photo new to the player PHOTO_W.NEW harder, one
// they already got right twice PHOTO_W.KNOWN easier; from v26 the prior of the estimated photo memory (MEM).
// N 10 (was 30; v18, Pierre, same reason): the 10th answer weighs 0.5, the 30th 0.75 (were 0.25 and 0.5).
const PHOTO_W = {N: 10, NEW: 0.5, KNOWN: -1};
// Photo memory (v26, Pierre 2026-11-03: in a genus with few photos the same ones come back, players learn the photos
// rather than the genus, and that skewed the photo difficulty and the player's progress). An answer on a photo is
// expected easier by an offset (logits off its difficulty) from the player's own history with that photo, [shown,
// right]: bucket 0 new (the reference, 0: a photo's rating is what a player meets on it the first time), 1 shown never
// right, 2 right once, 3 right twice or more; a question with several photos takes the mean of its photos' offsets.
// Buckets 1-3 are rated in the replay itself, on the trusted answers weighed as for the photos: after each answer each
// one its photos fall in moves by the surprise over the information gathered so far plus the prior's (a Newton step on
// the log-likelihood, as Glicko moves a rating by what it learns over how sure it is). Prior: the old rule as offsets
// from a new photo (0, -0.5, -0.5, -1.5), weighing MEM.N answers at the game's usual chance (80%, 4 choices). Served by
// ?stats=1 (mem; memn the answers behind each bucket); the app (model.js) expects every question with them.
// core.js MEM, memBucket, memFam and eloReplay are the same: keep them in step (tests/core.test.js compares them).
const MEM = {N: 10, PRIOR: [0, -PHOTO_W.NEW, -PHOTO_W.NEW, PHOTO_W.KNOWN - PHOTO_W.NEW]};
const memBucket_ = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3);
const memFam_ = (hs, mem) => (hs.length ? hs.reduce((t, h) => t + mem[memBucket_(h)], 0) / hs.length : 0);
// Fisher information of one answer at ability - difficulty x with k choices (the prior's weight: MEM.N at x 1, k 4).
function infoAt_(x, k){ const s = 1 / (1 + Math.exp(-x)), p = 1 / k + (1 - 1 / k) * s; return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p)); }
// Every player starts as a beginner, not an average player (Pierre, 2026-11-02: the RAs play from the first day of
// their course, others know even less): level PLAYER0 = -1, i.e. about 45% right on a photo of average difficulty with
// 4 choices. Starting at 0 (average), a beginner's misses made the photos look harder than they are.
const PLAYER0 = -1;
// v20: a photo-quiz question logged without its number of choices but with fewer than 4 in the Choices column (the
// "Again: A or B?" question after a mix-up, logged plain "quiz" until 2026-11-02) is rated with its real guess rate,
// 1 / choices (Pierre: correct the existing data too; nothing in the sheet is rewritten). core.js guessOf in step.
// v27: a typed answer (|t: the player types the genus, nothing to pick from) has no guess rate, 0 (core.js guessOf).
const guess_ = (mode, choices) => {
  if (/\|t(\||$)/.test(mode)) return 0;
  const kq = /\|k(\d)$/.exec(mode); if (kq) return 1 / Number(kq[1]);
  if (mode.indexOf('quiz-duel') === 0) return 0.5;
  const n = String(choices || '').split(/\s+/).filter(Boolean).length;
  return n >= 2 && n < 4 ? 1 / n : 0.25;
};
function trusted_(rows){  // rows: [who, right 0|1, mode, anonymous, choices]
  const T = {}, out = {};
  rows.forEach(([w, ok, m, an, ch]) => { const t = T[w] = T[w] || [0, 0, 0, 0, an], g = guess_(m, ch); t[0]++; t[1] += ok; t[2] += g; t[3] += g * (1 - g); });
  Object.keys(T).forEach(w => { const t = T[w]; out[w] = t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z; });
  return out;
}
function stats_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('stats14');
  if (hit) return JSON.parse(hit);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), out = {ok: true, photos: {}, ras: {}, conf: {}, mem: MEM.PRIOR.slice(), memn: [0, 0, 0, 0]};
  if (!sh || sh.getLastRow() < 2) return out;
  const rows = answerRows_().filter(r => r[0]).sort((a, b) => new Date(a[1]) - new Date(b[1]));
  const P = {}, R = {}, H = {}, sig = x => 1 / (1 + Math.exp(-x));
  const mem = MEM.PRIOR.slice(), I = [0, 0, 0, 0], N = [0, 0, 0, 0], tau = MEM.N * infoAt_(1, 4);
  // One player whatever the capitalisation of the name (find_ and hash_ match names case-blind; aid_ lowercases too).
  const trust = trusted_(rows.map(r => [lc_(r[0]), Number(r[4]) ? 1 : 0, String(r[5]), lc_(r[0]).indexOf('~anon ') === 0, String(r[11] || '')]));
  rows.forEach(r => {
    const who = lc_(r[0]), ok = Number(r[4]) ? 1 : 0, mode = String(r[5]), fs = String(r[6]).split(/\s+/).filter(Boolean);
    const sg = String(r[2]), sa = String(r[3]);
    if (trust[who]) String(r[11] || '').split(/\s+/).filter(x => x && x !== sg).forEach(x => { const k = sg < x ? sg + '|' + x : x + '|' + sg, c = out.conf[k] = out.conf[k] || [0, 0]; c[0]++; if (!ok && sa === x) c[1]++; });
    if (!fs.length) return;
    const g = guess_(mode, r[11]), ra = R[who] = R[who] || [PLAYER0, 0];
    const ph = fs.map(f => P[f] = P[f] || [0, 0, 0, 0]), b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);  // one view alone is harder (app.js PICKD.SINGLE)
    // One expectation for the photos and the player, with the player's memory of these photos (v26).
    const hs = fs.map(f => H[who + '|' + f] = H[who + '|' + f] || [0, 0]);
    const s = sig(ra[0] - b - memFam_(hs, mem)), e = g + (1 - g) * s, d = ok - e, n = ra[1];
    // The photos and the memory offsets move on trusted players' answers, weighed by their experience.
    if (trust[who]) {
      const w = n / (n + PHOTO_W.N), D = (1 - g) * s * (1 - s), v = Math.max(1e-6, e * (1 - e)), A = [0, 0, 0, 0];
      // Counts are weighed too: they damp later steps and tell the app how sure the rating is (photoDiff).
      ph.forEach(p => { p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d * w; p[2] += w; p[1] += ok * w; p[3]++; });
      hs.forEach(h => A[memBucket_(h)] += 1 / hs.length);
      for (let j = 1; j < 4; j++) if (A[j]) { I[j] += w * (D * A[j]) ** 2 / v; mem[j] -= w * d * D * A[j] / v / (tau + I[j]); N[j] += A[j]; }
      N[0] += A[0];
    }
    ra[0] += 0.6 / (1 + n / 40) * d; ra[1]++;
    hs.forEach(h => { h[0]++; h[1] += ok; });
  });
  // [difficulty, weighed answers, weighed right, answers]: the 4th (v18) is the plain count of the answers that rated the
  // photo, for the admin's filters (Pierre, 2026-11-02: a photo answered once weighs under 1 and "≥1" hid it).
  Object.keys(P).forEach(f => out.photos[f] = [Math.round(P[f][0] * 100) / 100, Math.round(P[f][2] * 10) / 10, Math.round(P[f][1] * 10) / 10, P[f][3]]);
  const salt = anonSalt_();
  Object.keys(R).forEach(n => out.ras[aid_(n, salt)] = [Math.round(R[n][0] * 100) / 100, R[n][1]]);
  out.mem = mem.map(x => Math.round(x * 100) / 100);
  out.memn = N.map(x => Math.round(x * 10) / 10);
  try { cache.put('stats14', JSON.stringify(out), 600); } catch (err) {}  // too big for the cache: computed each time
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

// Events (v19, Pierre 2026-11-02: most RAs will not report problems, so the app reports what it can by itself). POST
// {dev: random device id (never a name), events: [{id, t, k, ...}]} → {ok, ev: true}. Kinds: 'err' (an app error: msg,
// src = file:line, pg = page), 'photo' (a photo that did not load after its retries: f, pg), 'sync' (a save that failed
// while online: msg = the error code), 'pulse' (the occasional one-tap question: r = easy | ok | hard, m = game mode,
// n = answers this visit, rr = right % of the last 10, lv = overall level, met = genera met), 'load' (v21, once a visit:
// pop = the CDN server that sent data.json; p0 / t0 = first page and seconds to draw it, qo / q1 = seconds to the quiz
// and to its first photo, nx = next page, bps = line in kbit/s, kb = KB downloaded, sw = served by the offline copy,
// sv = Saver, th = theme, w = window width, st = installed as an app rather than in a browser tab). Every event also carries
// the app version (av) and a short browser name (ua). One row each in the "Events" tab, text cut short and never run as
// a formula. Caps: 50 events per request, 200 per device and 3000 in all every 6 hours; an id already logged is skipped.
const EVH = ['Time', 'Device', 'Kind', 'Message', 'Where', 'Page', 'Detail', 'App', 'Browser', 'Id'];
// v25 (Pierre, 2026-11-03: find the devices still running one of the first versions of the app): the app sends its
// version (av) with every request; one without it comes from a version before 2026-11-03. Logged in Events as kind
// 'old' with what it asked and, when the request carries one, the player's name or anonymous id; at most once an hour
// per sender and request. The new service worker reloads such pages onto the current version (sw.js activate).
function oldApp_(what, who){
  try {
    const c = CacheService.getScriptCache(), k = 'old:' + what + ':' + lc_(who || '');
    if (c.get(k)) return;
    c.put(k, '1', 3600);
    // A global cap too (Codex review #373: names or ids made up by the thousand must not fill the tab): 300 per 6 hours.
    if (over_('old', 300, 1)) return;
    sheet_('Events', EVH).appendRow([new Date(), '', 'old', safe_('app before 2026-11-03: ' + what + (who ? ' (' + who + ')' : '')), '', '', '', '', '', 'old' + Date.now().toString(36)]);
  } catch (e) {}
}
const EVK = {err: 1, photo: 1, sync: 1, pulse: 1, load: 1};
function events_(p){
  const dev = String(p.dev || '');
  if (!/^[a-z0-9]{8,16}$/.test(dev)) return {ok: false, error: 'input'};
  const L = p.events.filter(x => x && EVK[x.k] && /^[a-z0-9]{1,20}$/.test(String(x.id))).slice(0, 50);
  if (!L.length) return {ok: true, ev: true};
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (over_('ev:' + dev, 200, L.length) || over_('events', 3000, L.length)) return {ok: false, error: 'busy'};
    const sh = sheet_('Events', EVH), n = sh.getLastRow() - 1;
    const seen = new Set(n > 0 ? sh.getRange(Math.max(2, n - 1998), EVH.length, Math.min(n, 2000), 1).getValues().map(r => String(r[0])) : []);
    const num = (x, lo, hi) => { const v = Number(x); return isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v * 100) / 100)) : ''; };
    const rows = L.filter(x => !seen.has(String(x.id))).map(x => {
      const pg = v => word_(v, /^[a-zA-Z0-9~|_.-]*$/, 40);
      const det = x.k === 'pulse'
        ? JSON.stringify({r: ['easy', 'ok', 'hard'].indexOf(x.r) >= 0 ? x.r : '', m: word_(x.m, /^[a-z-]*$/, 20), n: num(x.n, 0, 10000), rr: num(x.rr, 0, 100), lv: num(x.lv, -5, 5), met: num(x.met, 0, 100)})
        : x.k === 'load'
          ? JSON.stringify({p0: pg(x.p0), t0: num(x.t0, 0, 3600), qo: num(x.qo, 0, 86400), q1: num(x.q1, 0, 86400), nx: pg(x.nx), bps: num(x.bps, 0, 1e7), kb: num(x.kb, 0, 1e7), sw: x.sw ? 1 : 0, sv: x.sv ? 1 : 0, th: word_(x.th, /^(dark|light)$/, 5), w: num(x.w, 0, 10000), st: x.st ? 1 : 0})
          : '';
      return [new Date(x.t || Date.now()), dev, x.k, text_(x.k === 'pulse' ? x.r : x.k === 'photo' ? x.f : x.k === 'load' ? word_(x.pop, /^[a-zA-Z0-9, -]*$/, 60) : x.msg, 300), text_(x.src, 160), text_(x.pg, 80), det, text_(x.av, 20), text_(x.ua, 40), String(x.id)];
    });
    if (rows.length) { const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
      if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);
      sh.getRange(at, 1, rows.length, EVH.length).setValues(rows); }
    return {ok: true, ev: true};
  } finally { lock.releaseLock(); }
}
// POST {readEvents: 1, token} (v19) → {ok, rows: [[id, time ms, device, kind, message, where, page, detail, app, browser]]},
// newest first, the last 3000. Admins only (isAdmin_), like the reports.
function readEvents_(token){
  if (!isAdmin_(String(token || ''))) return {ok: false, error: 'token'};
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Events');
  if (!sh || sh.getLastRow() < 2) return {ok: true, rows: []};
  const n = sh.getLastRow() - 1, from = Math.max(2, n - 2998);
  const rows = sh.getRange(from, 1, n - from + 2, EVH.length).getValues().filter(x => x[9])
    .map(x => [String(x[9]), new Date(x[0]).getTime() || 0, String(x[1]), String(x[2]), String(x[3]), String(x[4]), String(x[5]), String(x[6]), String(x[7]), String(x[8])]);
  return {ok: true, rows: rows.reverse()};
}

// Progress % of a saved progress over a list of genera: a copy of core.js pctOf (keep the two in step; tests/sync.test.js
// compares them). Per genus (v22): the moving average s.pg fills 95% on its way to 0.8 (the mastery exam's entry), each
// mastery-exam question passed adds 1%, a passed exam (mx) makes it 100%; progress saved before s.pg replays its last
// 10 results (h) from 0, a right answer weighed 0.67, a miss in full (core.js PROG, pgOf).
function pctOf_(P, list){
  const A = 0.15, M = 0.8, OLD = 0.67;
  const pg = s => { if (typeof s.pg === 'number') return s.pg;
    const g = String(s.h || '').split('').reduce((x, c) => x + A * (c === '1' ? OLD : 1) * ((c === '1' ? 1 : 0) - x), 0);
    return s.mx ? Math.max(g, M) : g; };
  const score = s => { if (!s) return 0; if (s.mx) return 1; const g = pg(s);
    return 0.95 * Math.min(1, g / M) + (g >= M && s.ex ? 0.05 * Math.min(4, s.ex.k || 0) / 5 : 0); }; // never 100% before the exam is passed (core.js scoreOf)
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
      .filter(r => r[0] && !(r[9] !== '' && Number(r[9]) <= 0))  // 0 the player's opt-out, -1 hidden by an admin (v20)
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
//   {userRename: {from, into}, token} → {ok, answers, reports}: the record moves to a new name, hidden from the
//     leaderboard; 'exists' when the new name is taken (v20).
//   {userBoard: name, hide, token} → {ok, board}: hidden from the leaderboard by an admin (-1) or shown again (1) (v20).
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
  if (tab === 'Answers') dropHold_(name);
  return n;
}
// Renames the name in column `col` of tab `tab` (answers, reports): one write of the whole column.
function relabel_(tab, col, from, into){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return 0;
  const rg = sh.getRange(2, col, sh.getLastRow() - 1, 1), v = rg.getValues(), k = lc_(from); let n = 0;
  v.forEach(r => { if (lc_(r[0]) === k) { r[0] = safe_(into); n++; } });
  if (n) rg.setValues(v);
  if (n && tab === 'Answers') { dropHold_(from); dropHold_(into); }  // their opening hold (hold_) is computed again
  return n;
}
function users_(p){
  if (!isAdmin_(String(p.token || ''))) return {ok: false, error: 'token'};
  const ss = SpreadsheetApp.getActiveSpreadsheet(), ra = sheet_('RAs', HEAD);
  const row_ = name => { const r = find_(ra, name); return r ? {r: r, v: ra.getRange(r, 1, 1, HEAD.length).getValues()[0]} : null; };
  const removed_ = (name, h, into) => sheet_('Removed', REMOVED).appendRow([safe_(name), h, safe_(into || ''), new Date()]);
  // v20: {userBoard: name, hide: true|false, token} hides the player from the public leaderboard (Board -1, which their
  // own syncs keep) or shows them again (1). Pierre, 2026-11-02: a renamed test account must not be on the leaderboard.
  // Under the script lock, as progress saves (Codex review #352): a sync between the read and the write could otherwise
  // put back the Board value it read.
  if (p.userBoard) {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const u = row_(String(p.userBoard)); if (!u) return {ok: false, error: 'user'};
      const b = p.hide ? -1 : 1;
      ra.getRange(u.r, 10).setValue(b);
      CacheService.getScriptCache().remove('board14');
      return {ok: true, board: b};
    } finally { lock.releaseLock(); }
  }
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
      try { CacheService.getScriptCache().remove('stats14'); } catch (e) {}
      return {ok: true, answers: n};
    } finally { lock.releaseLock(); }
  }
  if (p.userDelete || p.userMerge || p.userRename) {
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      // v20: {userRename: {from, into}, token} → the player's record moves to a new name (Pierre, 2026-11-02: keep his
      // account played with the old algorithms apart, as "Pierre-test", and start over as "Pierre"): RAs row, saved
      // progress, By genus, answers and reports; hidden from the leaderboard (-1). An archive, read in the admin: the code
      // hash is tied to the name (hash_), so the app no longer opens it. The
      // old name is not marked removed: a device still signed in with it, or a new sign-in, starts a new account there.
      if (p.userRename) {
        const m = p.userRename || {}, a = row_(String(m.from || '')), into = String(m.into || '').trim().slice(0, 40);
        if (!a || !into) return {ok: false, error: 'user'};
        if (row_(into)) return {ok: false, error: 'exists'};
        const from = String(a.v[0]);
        ra.getRange(a.r, 1).setValue(safe_(into));
        ra.getRange(a.r, 10).setValue(-1);
        relabel_(DATA_TAB, 1, from, into);
        relabel_('By genus', 1, from, into);
        const answers = relabel_('Answers', 1, from, into), reports = relabel_('Reports', 2, from, into);
        // Names merged into it before point to the archive too (Removed's Into): a device still signed in with one of
        // them must not log into the new account under the old name (Codex review #352).
        relabel_('Removed', 3, from, into);
        dropRows_(RPL.TAB, from);  // the replay (v28) is made again under the new name when asked
        ['board14', 'stats14'].forEach(k => { try { CacheService.getScriptCache().remove(k); } catch (e) {} });
        return {ok: true, answers: answers, reports: reports};
      }
      if (p.userDelete) {
        const u = row_(String(p.userDelete)); if (!u) return {ok: false, error: 'user'};
        const name = String(u.v[0]);
        const answers = p.answers ? dropRows_('Answers', name) : relabel_('Answers', 1, name, '~deleted ' + aid_(name));
        ['RAs', DATA_TAB, 'By genus', RPL.TAB].forEach(t => dropRows_(t, name));
        removed_(name, u.v[6], '');
        return {ok: true, answers: answers};
      }
      const m = p.userMerge || {}, a = row_(String(m.from || '')), b = row_(String(m.into || ''));
      if (!a || !b || a.r === b.r || !m.data || typeof m.data !== 'object') return {ok: false, error: 'user'};
      const from = String(a.v[0]), into = String(b.v[0]), cur = readData_(into, String(b.v[7] || ''));
      if (typeof m.at === 'number' && m.at !== cur.rev) return {ok: false, error: 'stale', rev: cur.rev};
      // The merged progress is no replay of both logs (core.js mergeUsers drops it too): no rules version, so the
      // account's devices ask for the replay of the whole merged history (replay_).
      delete m.data['imr-coral-rv'];
      const json = JSON.stringify(m.data);
      writeData_(into, json, cur.rev + 1);
      ra.getRange(b.r, 2).setValue(new Date()); ra.getRange(b.r, 8).setValue(json.length < CHUNK ? json : '@' + DATA_TAB);
      const answers = relabel_('Answers', 1, from, into), reports = relabel_('Reports', 2, from, into);
      ['RAs', DATA_TAB, 'By genus', RPL.TAB].forEach(t => dropRows_(t, from));
      removed_(from, a.v[6], into);
      return {ok: true, rev: cur.rev + 1, answers: answers, reports: reports};
    } finally { lock.releaseLock(); }
  }
  // The list, with each player's numbers from the Answers and Reports tabs.
  // id (v13): the player's anonymous id, the one ?answers=1 and ?stats=1 use, so the admin's player list can join the two.
  const out = {ok: true, users: [], removed: []}, by = {}, salt = anonSalt_();
  if (ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues().filter(r => r[0]).forEach(r => {
    const u = {name: String(r[0]), id: aid_(String(r[0]), salt), updated: new Date(r[1]).getTime() || 0, learned: Number(r[2]) || 0, seen: Number(r[3]) || 0, total: Number(r[4]) || 0,
      review: String(r[5] || ''), board: r[9] === '' ? 1 : Number(r[9]), answers: 0, right: 0, first: 0, last: 0, days: 0, modes: {}, recent: [0, 0], mix: [], reports: 0, size: String(r[7] || '').length};
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
function anon_(p){  // also p.pt (replay_) and p.reset: the device's progress reset, the replay's cutoff (v28)
  const id = String(p.anon || '');
  if (!/^[a-z0-9]{8,16}$/.test(id)) return {ok: false, error: 'input'};
  const L = p.anonAnswers.slice(0, 100);
  // Counters are read and written under the script lock, so concurrent requests cannot both pass a cap.
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const f = freshAnswers_(L);
    if (f.fresh.length && (over_('a:' + id, 600, f.fresh.length) || over_('anon', 6000, f.fresh.length))) return {ok: false, error: 'busy'};
    logAnswers_('~anon ' + id, f.fresh, f.seen);
    // v28: a device that never signed in gets its full replay too, under its anonymous id (replay_), when its app
    // applied an older rules version.
    const out = {ok: true, log: true};
    // Only the answers after the device's progress reset (p.reset, as resetOf_ reads a signed-in player's; Codex review #399).
    try { const rp = replay_('~anon ' + id, resetAt_(p.reset), typeof p.rv === 'number' ? p.rv : NaN, p.pt); if (rp) out.replay = rp; } catch (err) {}
    return out;
  } finally { lock.releaseLock(); }
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

// The app's core.js (progress engine, replayProgress), embedded by tools/sync_core.py: Code.gs reaches it as CORE_.
// Its own module object keeps its names out of this script's globals (TRUST, MEM... are Code.gs's own).
const CORE_ = (function () { const module = {exports: {}};
// BEGIN core.js (generated by tools/sync_core.py, do not edit)
// Pure functions shared by the app (app.js), the admin (admin.js) and the tests (node --test tests/*.test.js).
// No DOM, no globals of the app: in the browser they become globals (classic script), in Node module.exports.
(function (root) {
  // The draft is never published as a whole copy: it is merged, key by key, onto the latest published curation.
  // merge3(base, mine, theirs): base = the published curation this draft started from; a key I changed since base
  // keeps my value, every other key takes the published one (so choices published from another browser or device
  // are never lost). Objects merge key by key; lists and plain values are single choices. Same choice on both sides = conflict, mine wins.
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o),
    eq = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  // conf (optional): collects the paths where both sides changed the same choice differently, so Publish can say which
  // published choices this draft replaced (the rule stays the same: mine wins).
  function merge3(base, mine, theirs, conf, path = []) {
    const b = isObj(base) ? base : {},
      m = isObj(mine) ? mine : {},
      t = isObj(theirs) ? theirs : {},
      out = {};
    new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]).forEach(k => {
      const both = isObj(m[k]) && isObj(t[k]);
      if (conf && !both && !eq(m[k], b[k]) && !eq(t[k], b[k]) && !eq(m[k], t[k])) conf.push([...path, k]);
      const v = eq(m[k], b[k]) ? t[k] : eq(t[k], b[k]) ? m[k] : both ? merge3(b[k], m[k], t[k], conf, [...path, k]) : m[k];
      // A copy, never a shared object: setQ & co. edit DRAFT's maps in place, and a map shared with SAVED would change
      // both, hiding the edit from Publish (code review 2026-11-01).
      if (v !== undefined && !(isObj(v) && !Object.keys(v).length && k !== 'genera'))
        out[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    });
    return out;
  }
  // An old draft saved before drafts kept their base: add what it has on top of the published curation, never remove.
  function mergeOld(mine, theirs) {
    const m = isObj(mine) ? mine : {},
      t = isObj(theirs) ? theirs : {},
      out = {...t};
    Object.keys(m).forEach(k => {
      out[k] = isObj(m[k]) && isObj(t[k]) ? mergeOld(m[k], t[k]) : m[k] === undefined ? t[k] : m[k];
    });
    return out;
  }

  // Two admin tabs in one browser (code re-review 2026-11-01, M4): each keeps its draft in memory and writes all of it to
  // localStorage on every click, so the last tab clicked used to erase the other tab's clicks. When another tab writes its
  // draft, this tab merges it onto its own: shared = the draft both tabs last agreed on (what this tab last wrote or took),
  // mine = this tab's draft, other = the one just written. Returns the merged draft and whether this tab must write it back
  // (it holds clicks the other tab lacks). Compared without key order, so two tabs never bounce the same draft back and forth.
  const canon = o =>
    JSON.stringify(o, (k, v) =>
      isObj(v)
        ? Object.keys(v)
            .sort()
            .reduce((a, x) => ((a[x] = v[x]), a), {})
        : v
    );
  function mergeTabs(shared, mine, other) {
    const draft = merge3(shared, mine, other);
    draft.genera = draft.genera || {};
    return {draft, share: canon(draft) !== canon(other), changed: canon(draft) !== canon(mine)};
  }

  // Two devices on one account (app.js mergeSaved): three-way merge of the per-genus progress. B = the record as last
  // sent or received, P = this device, R = the record just pulled. Counts add up (R + P - B), so neither side's answers
  // are lost or counted twice; the latest local state wins for the per-genus model when this device answered since B.
  function mergeProgress(B, P, R) {
    const Z = {ok: 0, ko: 0, streak: 0},
      out0 = {};
    B = B || {};
    P = P || {};
    R = R || {};
    new Set([...Object.keys(R), ...Object.keys(P)]).forEach(g => {
      const b = B[g] || Z,
        l = P[g] || Z,
        r = R[g] || Z,
        out = {...r};
      out.ok = Math.max(0, (r.ok || 0) + (l.ok || 0) - (b.ok || 0));
      out.ko = Math.max(0, (r.ko || 0) + (l.ko || 0) - (b.ko || 0));
      // A record recalculated here for the photo memory (pm, memRecalc) with no answer of its own counts as this device's
      // model only while the other side has not moved since B: answers saved from another device win over a mere
      // recalculation (Codex review #387: an old copy reopened must not undo a passed exam), and the recalculation is
      // applied to them after the merge (model.js memRecalcAll).
      // The same for a record this device adopted from the sheet's full replay (rv, the rules version: sync.js
      // replayAdopt): it replaces the copy of the same answers, unless the other side has answered since.
      const moved = x => (x.ok || 0) + (x.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (x.h || '') !== (b.h || ''),
        mine = moved(l) || (((l.pm || 0) !== (b.pm || 0) || (l.rv || 0) !== (b.rv || 0)) && !moved(r));
      out.streak = mine ? l.streak || 0 : r.streak || 0;
      if (mine && l.h) out.h = l.h;
      if (mine)
        // vr: the Elo step's volatility (app.js abilityStep), part of the model the device that played updated; lt: the
        // global level at the genus's last own step (core.js levelMove), which goes with its th.
        ['lv', 'run', 'L', 'pg', 'pm', 'rv', 'th', 'lt', 'vr', 'ro', 'ex', 'mx'].forEach(k => {
          if (l[k] !== undefined) out[k] = l[k];
          else delete out[k];
        });
      // Times for the comeback after a break (model.js): the latest answer (at) and the latest day answered right (dl) of
      // either device; days answered right (dd) the larger count (two devices on different days count one less: safe side).
      ['at', 'dl', 'dd'].forEach(k => {
        const v = Math.max(Number(l[k]) || 0, Number(r[k]) || 0);
        if (v) out[k] = v;
        else delete out[k];
      });
      if (l.cor || r.cor) out.cor = 1;
      if (l.du || r.du) out.du = 1;
      // Mix-ups (conf: genus answered instead) and offers (off: genus offered as a wrong choice) add up across devices.
      ['conf', 'off'].forEach(f => {
        const c = {...(r[f] || {})};
        Object.keys(l[f] || {}).forEach(k => {
          const v = (c[k] || 0) + l[f][k] - ((b[f] || {})[k] || 0);
          if (v > 0) c[k] = v;
          else delete c[k];
        });
        if (Object.keys(c).length) out[f] = c;
        else delete out[f];
      });
      // Photos seen [shown, right]: added up like the mix-ups, so two devices never lose or double-count a photo.
      const ps = {...(r.ps || {})};
      Object.keys(l.ps || {}).forEach(f => {
        const x = ps[f] || [0, 0],
          y = l.ps[f],
          z = (b.ps || {})[f] || [0, 0];
        ps[f] = [0, 1].map(i => Math.max(0, x[i] + y[i] - z[i]));
      });
      if (Object.keys(ps).length) out.ps = ps;
      else delete out.ps;
      if (out.ok + out.ko || out.h) out0[g] = out;
    });
    return out0;
  }

  // Two accounts of one person merged in the admin (user management, Code.gs v11): A = the name that goes away, B = the
  // name kept, both as saved by the app (progData: localStorage key -> string). Their answers are different answers, so
  // counts add up (ok, ko, mix-ups, offers, photos seen), milestones are kept if either has them, and the per-genus model
  // (ability th, knowledge L, recent results h...) comes from whichever account answered that genus more. Settings are
  // B's; bonus genera unlocked or on (bon) on either stay so. Returns B's data with the merged progress.
  function mergeUsers(A, B) {
    A = A || {};
    B = B || {};
    const J = (d, k) => {
      try {
        return JSON.parse(d[k] || 'null');
      } catch (e) {
        return null;
      }
    };
    const a = J(A, 'imr-coral-progress') || {},
      b = J(B, 'imr-coral-progress') || {},
      P = {};
    const n = s => (s.ok || 0) + (s.ko || 0),
      add = (x, y) => {
        const o = {...(x || {})};
        Object.keys(y || {}).forEach(k => {
          o[k] = (o[k] || 0) + y[k];
        });
        return o;
      };
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(g => {
      const x = a[g] || {},
        y = b[g] || {},
        main = n(x) > n(y) ? x : y,
        o = {...(main === x ? y : x), ...main};
      // The progress comes from the same account as the rest of the model, recomputed if it was saved before s.pg
      // (Codex review #367: an old main record let the other account's pg through).
      if (typeof main.pg === 'number' || main.h || typeof main.L === 'number') o.pg = pgOf(main);
      // The photo memory mark goes with that progress (memRecalc): the other account's would leave it uncorrected.
      if (main.pm) o.pm = main.pm;
      else delete o.pm;
      // The level a genus's ability was last stepped against (lt, model.js levelRise) is the old account's: the merged
      // account's level is another, so the level's rise counts again from the genus's next own answer.
      delete o.lt;
      o.ok = (x.ok || 0) + (y.ok || 0);
      o.ko = (x.ko || 0) + (y.ko || 0);
      o.streak = main.streak || 0;
      ['conf', 'off'].forEach(f => {
        const c = add(x[f], y[f]);
        if (Object.keys(c).length) o[f] = c;
        else delete o[f];
      });
      const ps = {...(x.ps || {})};
      Object.keys(y.ps || {}).forEach(f => {
        const p = ps[f] || [0, 0];
        ps[f] = [p[0] + y.ps[f][0], p[1] + y.ps[f][1]];
      });
      if (Object.keys(ps).length) o.ps = ps;
      else delete o.ps;
      if (x.cor || y.cor) o.cor = 1;
      if (x.du || y.du) o.du = 1;
      if (o.ok + o.ko || o.h) P[g] = o;
    });
    const out = {...A, ...B, 'imr-coral-progress': JSON.stringify(P)},
      qa = J(A, 'imr-coral-quiz'),
      qb = J(B, 'imr-coral-quiz');
    // The rules version the progress was replayed with (sync.js RVK): the merged record is no replay of the two logs
    // together, so it has none, and every device of the account asks for the replay of both histories in time order
    // (the sheet relabels the answers; Codex review #399: the merged model of 20 older right answers and 10 newer misses
    // kept pg 0.96 for good).
    delete out['imr-coral-rv'];
    if (qa || qb) {
      const q = {...(qa || {}), ...(qb || {}), bu: Math.max((qa || {}).bu || 0, (qb || {}).bu || 0)};
      if ((qa || {}).bon || (qb || {}).bon) q.bon = true;
      out['imr-coral-quiz'] = JSON.stringify(q);
    }
    return out;
  }

  // Who rates the photos and the confusions, as tools/sync/Code.gs trusted_ (v17; v18: devices that never signed in too,
  // under the same rule, Pierre 2026-11-02): players with TRUST.N answers or more and a right rate clearly above chance (one-sided z of at least TRUST.Z against each question's guess rate).
  const TRUST = {N: 10, Z: 1.645}; // answers per player, not per photo
  // As Code.gs guess_ (v20): without |kN, a photo-quiz question with 2 or 3 genera in its choices (readAnswers row
  // index 10) is rated with 1 / choices ("Again: A or B?", logged plain "quiz" until 2026-11-02).
  // A typed answer (|t, 2026-11-03: the player types the genus instead of picking one of the choices) has no guess rate:
  // nothing to pick from, so the expected success has no 1/k floor (Code.gs guess_ v27; model.js TYPED.k).
  const TYPED_RE = /\|t(\||$)/;
  const guessOf = (mode, choices) => {
    if (TYPED_RE.test(mode)) return 0;
    const kq = /\|k(\d)$/.exec(mode);
    if (kq) return 1 / Number(kq[1]);
    if (mode.indexOf('quiz-duel') === 0) return 0.5;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? 1 / n : 0.25;
  };
  // How sure a player's level is (Pierre, 2026-11-03: a level from 35 answers at 97% right sat above one from 245):
  // {player id: 95% margin, in level units}, 1.96 / sqrt(Fisher information) gathered on the same replay as the level
  // itself (eloReplay, Code.gs stats_ ras; Codex review #375): an answer that was a near-sure success tells little, so a
  // run of easy right answers keeps the margin wide.
  // A player's right rate in the photo quiz apart from the Duel tab (Pierre, 2026-11-03: a new player's 31 duels on one
  // chosen pair, 2 choices each, made 89% in the quiz read as 95%): per anonymous id, [answers, right] in the quiz (mode
  // quiz or quiz|…, duels slipped into the quiz included), in its last 50, and in the Duel tab (quiz-duel…). Other
  // games are in neither. rows: readAnswers rows [id, t, shown, answered, ok, mode, …].
  function playSplit(rows) {
    const out = {};
    (rows || [])
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const m = String(r[5] || ''),
          o = (out[r[0]] = out[r[0]] || {q: [0, 0], d: [0, 0], L: []});
        if (m.startsWith('quiz-duel')) (o.d[0]++, (o.d[1] += r[4] ? 1 : 0));
        else if (m === 'quiz' || m.startsWith('quiz|')) (o.q[0]++, (o.q[1] += r[4] ? 1 : 0), o.L.push(r[4] ? 1 : 0));
      });
    Object.values(out).forEach(o => {
      const L = o.L.slice(-50);
      o.q50 = [L.length, L.reduce((t, x) => t + x, 0)];
      delete o.L;
    });
    return out;
  }
  function levelMargin(rows) {
    const {R} = eloReplay(rows || []);
    return Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r[2] > 0 ? 1.96 / Math.sqrt(r[2]) : Infinity]));
  }
  function trustOf(rows) {
    const T = {},
      out = {};
    rows.forEach(r => {
      if (!r[0]) return;
      const t = (T[r[0]] = T[r[0]] || [0, 0, 0, 0, 0]),
        g = guessOf(r[5], r[10]);
      t[0]++;
      t[1] += r[4] ? 1 : 0;
      t[2] += g;
      t[3] += g * (1 - g);
      if (r[11]) t[4] = 1;
    });
    Object.keys(T).forEach(w => {
      const t = T[w];
      out[w] = t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z;
    });
    return out;
  }

  // How much one answer moves the photos, as Code.gs PHOTO_W (v17): weight n / (n + N) after n answers of the player.
  // NEW and KNOWN: the fixed memory rule of v17-v25 (a photo new to the player 0.5 harder, one right twice before 1
  // easier), now only the prior of the estimated photo memory below (MEM).
  const PHOTO_W = {N: 10, NEW: 0.5, KNOWN: -1}; // v18: 10, was 30 (same reason)
  // Every player starts as a beginner (Code.gs PLAYER0): about 45% right on an average photo with 4 choices.
  const PLAYER0 = -1;
  // Photo memory (Pierre, 2026-11-03: in a genus with few photos the same ones come back, players learn the photos
  // rather than the genus, and that skews the photo difficulty and the player's progress). One rule for the sheet, the
  // admin and the app: an answer on a photo is expected easier by an offset (logits subtracted from its difficulty) that
  // depends on the player's own history with that photo, [times shown, times right] (H in the replay, s.ps in the app):
  // bucket 0 new, 1 shown but never right, 2 right once, 3 right twice or more (memBucket). A question with several
  // photos takes the mean offset of its photos (memFam). New is the reference, 0: a photo's rating is what a player meets
  // on it the first time. The other three are estimated from the trusted answers, rated in the same replay as the photos
  // and the players (eloReplay, Code.gs stats_, v26): after each answer, each offset its photos fall in moves by its
  // surprise (right - expected) over the information gathered so far plus the prior's (a step of Newton's method on the
  // log-likelihood, as Glicko moves a rating by what it learns over how sure it already is), the prior MEM.PRIOR weighing
  // as much as MEM.N answers at the game's usual chance (80%, 4 choices). The prior is the old fixed rule (PHOTO_W) as
  // offsets from a new photo: 0, -0.5, -0.5, -1.5; a bucket with few answers stays close to it. N 10: answers on a
  // remembered photo are 90% right or more, where each tells little, so the 64 "right once" answers of the first 550
  // move it about two thirds of the way to what they show (30: half way). ?stats=1 serves the estimate as mem (memn:
  // answers behind each bucket); the app falls back to the prior with an older sheet (memOf). docs/LEARNING.md "Photo
  // memory".
  const MEM = {N: 10, PRIOR: [0, -PHOTO_W.NEW, -PHOTO_W.NEW, PHOTO_W.KNOWN - PHOTO_W.NEW]};
  const memBucket = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3);
  const memFam = (hs, mem) => (hs.length ? hs.reduce((t, h) => t + mem[memBucket(h)], 0) / hs.length : 0);
  // The offsets of a ?stats=1 reply (mem, sheet v26), or the prior from an older sheet.
  const memOf = m =>
    Array.isArray(m) && m.length === 4 && m.every(x => typeof x === 'number' && isFinite(x)) ? m.slice() : MEM.PRIOR.slice();
  // Fisher information of one answer at ability - difficulty x with k choices; the prior's weight is MEM.N of them at
  // x = 1 with 4 choices (about 80% right), 0.135 each.
  const infoAt = (x, k) => {
    const s = 1 / (1 + Math.exp(-x)),
      p = 1 / k + (1 - 1 / k) * s;
    return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p));
  };
  // Photo Elo replayed over the answer log (rows [id, time ms, genus shown, answered, right 0|1, mode, photos…]), as
  // tools/sync/Code.gs stats_ does in the sheet: keep the two in step (tests/core.test.js compares them). Every answer
  // moves the player's level; the photos and the memory offsets move on trusted players' answers only (trustOf, v17),
  // weighed as above. All against the same expectation, photo memory included (until v25 the level ignored memory
  // and the photos used the fixed rule, so the two pulled apart).
  // Returns the photo ratings P, the player levels R ([level, answers, information]), the memory offsets mem (rounded
  // as served) and memn, the trusted answers behind each bucket (a question with several photos shares its answer
  // between their buckets).
  function eloReplay(rows) {
    const P = {},
      R = {},
      H = {},
      trust = trustOf(rows),
      mem = MEM.PRIOR.slice(),
      I = [0, 0, 0, 0],
      N = [0, 0, 0, 0],
      tau = MEM.N * infoAt(1, 4),
      sig = x => 1 / (1 + Math.exp(-x));
    rows
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const fs = r[6].split(/\s+/).filter(Boolean);
        if (!r[0] || !fs.length) return;
        const ok = r[4] ? 1 : 0,
          g = guessOf(r[5], r[10]),
          ra = (R[r[0]] = R[r[0]] || [PLAYER0, 0]);
        const ph = fs.map(f => (P[f] = P[f] || [0, 0, 0, 0])),
          b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
        const hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0])),
          s = sig(ra[0] - b - memFam(hs, mem)),
          e = g + (1 - g) * s,
          d = ok - e,
          n = ra[1];
        if (trust[r[0]]) {
          const w = n / (n + PHOTO_W.N),
            D = (1 - g) * s * (1 - s),
            v = Math.max(1e-6, e * (1 - e)),
            A = [0, 0, 0, 0];
          ph.forEach(p => {
            p[0] -= (0.8 / (1 + p[2] / 10) / ph.length) * d * w;
            p[2] += w;
            p[1] += ok * w;
            p[3]++;
          });
          hs.forEach(h => (A[memBucket(h)] += 1 / hs.length));
          for (let j = 1; j < 4; j++)
            if (A[j]) {
              I[j] += (w * (D * A[j]) ** 2) / v;
              mem[j] -= (w * d * D * A[j]) / v / (tau + I[j]);
              N[j] += A[j];
            }
          N[0] += A[0];
        }
        // Fisher information about the level from this answer, on the same model as the level's step (levelMargin).
        ra[2] = (ra[2] || 0) + ((1 - g) * s * (1 - s)) ** 2 / Math.max(1e-6, e * (1 - e));
        ra[0] += (0.6 / (1 + n / 40)) * d;
        ra[1]++;
        hs.forEach(h => {
          h[0]++;
          h[1] += ok;
        });
      });
    return {P, R, mem: mem.map(x => Math.round(x * 100) / 100), memn: N.map(x => Math.round(x * 10) / 10)};
  }
  // The photo memory offsets estimated from the answer log, as Code.gs ?stats=1 mem and memn.
  function photoMemOf(rows) {
    const {mem, memn} = eloReplay(rows);
    return {mem, memn};
  }
  // Progress saved before the photo memory, recalculated once and silently (Pierre, 2026-11-03: the replay of the real
  // answer log moved the bars down 1-3 points, so no pop-up). Every answer since the change weighs a right answer on a
  // known photo x pgMemW (model.js); the answers before it counted in full. The device keeps no answer log for a
  // signed-in player (the sheet has it), only each genus's record: its photos [shown, right] (s.ps). A uniform factor f
  // on the right answers' weights multiplies the moving average's balance odds by f (pg = p w / (p w + (1 - p) m) for a
  // success rate p, right weight w, miss weight m), so pg' = f pg / (f pg + 1 - pg), f the mean weight of the genus's
  // right answers: of a photo's r right answers in n shows, r / n count as its first show (weight 1, a share as if right
  // answers fell evenly on its shows) and the rest as repeats, at the weight of the bucket the photo has now, at the
  // game's target (ability 1 above the photo, 4 choices). Approximate (no order is kept, misses on known photos are not
  // redone): tools/memreplay.js prints it beside the full replay of the sheet's log. Never raises a bar. A learned genus is
  // left alone (its exam showed photos never seen). Once per record: s.pm marks it (also set on a record that needed no
  // change) and travels with s.pg between devices (mergeProgress, mergeUsers), so no device corrects a record twice; a
  // record made after the change is marked at its first answer (quiz.js answer) and never corrected. Returns true when
  // it marked the record now or dropped a former learned mark (below).
  // Learned under the former model (Pierre, 2026-11-03: "I find it hard to believe that the two genera marked as learned
  // really are"): a genus learned on a record without s.pg passed its exam under BKT (before 2026-11-02), whose
  // estimate reached 95% after about 4 right answers, so the exam came at once, mostly against easy choices; replayed
  // with today's rules (tools/memreplay.js) those genera stand at 78-83%, under the exam's entry. Their learned mark
  // (and any exam in course) is dropped at every call (load, pull, answer: a copy from another device that still has it
  // loses it too); the genus keeps its bar from its record (pgOf, s.h) and takes the exam again. An exam passed since
  // (s.pg kept beside s.mx) is left alone. Not silent (Pierre, 2026-11-03: players know they test an early beta): the
  // app sees the mark go (model.js mxRecalc), tells the player once with a card (progress.js mxLostNotice) and takes back the
  // learned-based achievements the progress no longer meets (achRevoke, progress.js achRecheck).
  // Since the sheet's full replay (replayProgress, RVS; 2026-11-03) this is only the fallback for a device that never
  // reaches the sheet: a record adopted from the replay carries pm 1, so it is never corrected here.
  function memRecalc(s, mem) {
    if (!s || typeof s !== 'object') return false;
    let old = false;
    if (s.mx && typeof s.pg !== 'number') {
      delete s.mx;
      delete s.ex;
      old = true;
    }
    if (s.pm) return old;
    s.pm = 1;
    if (s.mx || typeof s.pg !== 'number' || !(s.pg > 0)) return true;
    const e = x => 0.25 + 0.75 / (1 + Math.exp(-x));
    let r = 0,
      w = 0;
    Object.values(s.ps || {}).forEach(h => {
      if (!Array.isArray(h) || !(h[0] > 0) || !(h[1] > 0)) return;
      const first = h[1] / h[0];
      r += h[1];
      w += first + (h[1] - first) * Math.min(1, e(1) / e(1 - mem[memBucket(h)]));
    });
    if (r && w < r) {
      const f = w / r;
      s.pg = Math.round(((f * s.pg) / (f * s.pg + 1 - s.pg)) * 1e4) / 1e4;
    }
    return true;
  }
  function eloOf(rows) {
    const {P} = eloReplay(rows);
    const out = {};
    Object.keys(P).forEach(
      f => (out[f] = [Math.round(P[f][0] * 100) / 100, Math.round(P[f][2] * 10) / 10, Math.round(P[f][1] * 10) / 10, P[f][3]])
    );
    return out;
  }

  // Confusions between genera (Pierre, 2026-11-01): from the answer log rows (as eloOf; row[10] = the genera offered,
  // space-separated, logged since sheet script v10). pair["A|B"] (A before B alphabetically) = [offered together, mixed up]:
  // one was shown with the other among the choices, and the other was answered. Same counts as Code.gs stats_ conf (tests
  // check it). dir["shown|other"] = [offered, answered] keeps the direction. old["shown|answered"] = mix-ups logged without
  // their choices (before v10): they can't be turned into a rate, only counted.
  function confusionOf(rows) {
    const trust = trustOf(rows);
    rows = rows.filter(r => trust[r[0]]); // trusted players only, as Code.gs stats_ (v17)
    const pair = {},
      dir = {},
      old = {},
      inc = (O, k, took) => {
        const c = (O[k] = O[k] || [0, 0]);
        c[0]++;
        if (took) c[1]++;
      };
    rows.forEach(r => {
      const g = r[2],
        a = r[3],
        ok = r[4],
        ch = String(r[10] || '')
          .split(/\s+/)
          .filter(x => x && x !== g);
      if (!g) return;
      if (!ch.length) {
        if (!ok && a && a !== g) old[g + '|' + a] = (old[g + '|' + a] || 0) + 1;
        return;
      }
      ch.forEach(x => {
        const took = !ok && a === x;
        inc(pair, g < x ? g + '|' + x : x + '|' + g, took);
        inc(dir, g + '|' + x, took);
      });
    });
    return {pair, dir, old};
  }
  // Confusion score of a pair: its mix-up rate when offered together, starting from a prior rate worth CONF.W offers (the
  // declared look-alikes of the IMR lecture and the Coral Finder start high), then following the players' real answers.
  // N (2026-11-04): the offers a pair needs before the data can make it a look-alike (dataLook, below).
  const CONF = {W: 8, LOOK: 0.3, FAM: 0.12, FORM: 0.08, BASE: 0.03, TRAP: 0.2, N: 20};
  const confScore = (c, prior) => ((c ? c[1] : 0) + CONF.W * prior) / ((c ? c[0] : 0) + CONF.W);
  // A look-alike from the data (Pierre, 2026-11-04: "if the data says people constantly confuse two genera, they become
  // look-alikes by force; that was the point of the confusion data: to find look-alikes the courses never named"): a
  // pair offered together CONF.N times or more (c, the pooled [offered, mixed up]) whose pooled score (score, confScore
  // on the pair's own prior: same family, a shared growth form or neither) reaches CONF.TRAP. The prior's weight (CONF.W
  // offers at a low rate) is what makes it clear: at 20 offers a pair of unrelated genera needs 6 mix-ups (30%), when
  // the declared look-alikes were mixed up 13% of the time they were offered (the real answers of 2026-11-03).
  const dataLook = (c, score) => !!c && c[0] >= CONF.N && score >= CONF.TRAP;
  // How much harder a question is for a player who mixes up its genus with one of its choices more than everyone does
  // (2026-11-04, docs/LEARNING.md "Known mix-ups"): the player's own score of the pair (own, pairConf, shrunk toward the
  // pooled score as confOf does) against the pooled score, in logits, when higher; 0 for a pair the player mixes up no
  // more than everyone. The pooled score already shows in the photos' difficulty (every player's answers); this is the
  // player's own excess, so it is never counted twice. No constant: confScore's own prior weight sets how fast it grows.
  const logitOf = p => Math.log(p / (1 - p));
  const confGap = (own, pooled) => {
    const q = Math.min(0.99, Math.max(0.01, pooled));
    return Math.max(0, logitOf(Math.min(0.99, confScore(own, q))) - logitOf(q));
  };
  // One player's own record on a pair (progress P): [times the two were offered together, times mixed up], both directions.
  // Offers are counted since 2026-11-01 (P[g].off); mix-ups logged before that count as offered at least once each.
  function pairConf(P, a, b) {
    const x = P[a] || {},
      y = P[b] || {},
      mix = ((x.conf || {})[b] || 0) + ((y.conf || {})[a] || 0);
    return [Math.max(mix, ((x.off || {})[b] || 0) + ((y.off || {})[a] || 0)), mix];
  }

  // An apology, once (Pierre, 2026-11-04): from the opening rule of #408 (merged FROM) to this fix, the app opened too
  // many genera at once to strong players and did not ease the questions after misses. Only to the players who really
  // felt it (Pierre: "a player who answered a single question then must not get it"), read from the device's own data
  // when this version first runs on it (progress.js sorryNotice keeps it, so later play changes nothing):
  // - n: their answers in the window, at least SORRY.N (20). Exact from the answers the device still keeps (signed out:
  //   all of them); else the answers since the last card shown before FROM (the cards keep the answers count and time).
  // - h: the opening hold's sum then (model.js holdStep: a CUSUM of the shortfall against each answer's expected
  //   success e, 0.1 allowed per answer), so where their last run ended: SORRY.H (3, 2 x INTRO.HOLD, the evidence the
  //   back-to-one-at-a-time card asks for) or more; or half of it with SORRY.CARDS (4, one more than OPEN.MAX now allows)
  //   genera or more opened on cards within OPEN.WIN answers in the window (c, the most in any 15).
  // On the real answers (2026-11-03) it selects both collapsed runs (44 answers, h 3.22, 7 cards in 16 answers; 31
  // answers, h 4.31) and nobody else; a run at the expected success ends at 3 or more about 2-5% of the time
  // (simulated, 20-80 answers at e 0.7-0.9). Not after UNTIL: a player back weeks later would not know what it is about.
  const SORRY = {FROM: Date.parse('2026-11-03T11:34:11Z'), UNTIL: Date.parse('2026-11-17T00:00:00Z'), N: 20, H: 3, CARDS: 4, WIN: 15};
  const sorryFelt = ({n, h, c}) =>
    (Number(n) || 0) >= SORRY.N && ((Number(h) || 0) >= SORRY.H || ((Number(c) || 0) >= SORRY.CARDS && h >= SORRY.H / 2));
  // The inputs from the device's data at its first run (first: that time): log, the answers it keeps ({t ISO, ok, e});
  // cards, the intro map ({genus: [answers, ready, time, kind]}); total, the player's answers count; h, the hold's sum.
  const sorryOf = ({log, cards, total, h, first}) => {
    const inW = t => typeof t === 'number' && t >= SORRY.FROM && t < first,
      nLog = (log || []).filter(a => a && inW(Date.parse(a.t))).length,
      E = Object.values(cards || {}).filter(e => Array.isArray(e)),
      before = E.filter(e => typeof e[2] === 'number' && e[2] < SORRY.FROM).map(e => Number(e[0]) || 0), // cards with no time (older) say nothing
      win = E.filter(e => inW(e[2]) && (e[3] || 'c') === 'c').map(e => Number(e[0]) || 0),
      // Answers since the last card shown before the window; with no card before it, every answer was in it only when
      // the cards in it show the player started there.
      est = before.length ? total - Math.max(...before) : win.length ? total : 0;
    return {
      n: Math.max(nLog, est),
      h: Number(h) || 0,
      c: Math.max(0, ...win.map(x => win.filter(y => y >= x && y < x + SORRY.WIN).length))
    };
  };
  const sorryDue = ({felt, now, shown}) => !shown && now < SORRY.UNTIL && !!felt && sorryFelt(felt);
  // The first name to greet a player with, from their sign-in name (Pierre, 2026-11-04, for every personalised card,
  // AGENTS.md rule 20e): the first word ("Ana Lopez" -> "Ana", "Ana B." -> "Ana"), its first letter capitalised;
  // only the letters it starts with (an apostrophe or a hyphen inside kept: "O'Neil", "Jean-Luc"), so a name with no
  // letter first ("~a12", "123") gives '' and the card says a plain "Hi!".
  const firstName = name => {
    const m = /^\p{L}[\p{L}\p{M}'’-]*/u.exec(String(name || '').trim()),
      w = m ? m[0].replace(/['’-]+$/, '') : '';
    return w ? w[0].toUpperCase() + w.slice(1) : '';
  };
  const sorryHi = name => (firstName(name) ? `Hi ${firstName(name)}!` : 'Hi!');
  // When it happened, as the player's clock says it (tz: minutes behind UTC, Date's getTimezoneOffset): this evening,
  // yesterday evening (afternoon, morning), else the date.
  const sorryWhen = (now, tz = 0) => {
    const loc = t => new Date(t - tz * 60000),
      f = loc(SORRY.FROM),
      day = t => Math.floor((t - tz * 60000) / 864e5),
      h = f.getUTCHours(),
      part = h >= 17 ? 'evening' : h >= 12 ? 'afternoon' : 'morning',
      d = day(now) - day(SORRY.FROM);
    if (d <= 0) return `This ${part}`;
    if (d === 1) return `Yesterday ${part}`;
    return `On ${f.getUTCDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][f.getUTCMonth()]}`;
  };
  const sorryText = (name, now, tz) => ({
    t: `${sorryHi(name)} Sorry about your last run.`,
    p: `${sorryWhen(now, tz)} we adjusted how the app picks your questions, and some of it wasn't right yet: too many new genera came at once, and the questions didn't get easier after misses. It's fixed now. Sorry for the rough ride!`
  });

  // Two admin tabs in one browser share the stored draft. Each write carries _tab: {rev, seen}: its own revision and the
  // revision of the stored draft that tab had last seen. `revs` maps the revisions this tab wrote or took in to their drafts,
  // so the merge base is exactly the draft the other tab started from, even when both clicked before hearing of each other.
  // Returns null for a revision already taken in; an untagged draft (older admin page) merges against `saved`.
  function takeTab(revs, mine, saved, stored) {
    const t = stored._tab || {},
      other = Object.assign({}, stored);
    delete other._tab;
    if (t.rev && revs[t.rev]) return null;
    const m = mergeTabs(revs[t.seen] || saved, mine, other);
    if (t.rev) revs[t.rev] = other;
    return m;
  }

  // Pierre's curation and the photos per context (moved from app.js, code re-review 2026-11-01 M2, so the rules can be tested).
  const VIEWS = [
    ['wide', 'Colony'],
    ['medium', 'Close-up'],
    ['macro', 'Corallites']
  ];
  const allPhotos = g => VIEWS.flatMap(([v]) => (g.views[v] || []).map(p => ({...p, view: v})));
  // Editorial curation from curation.json (edited in admin.html): per genus, cover photo, featured photos
  // per view (in order), hidden photos and photos moved to another view. Hidden photos leave games too.
  // Candidates (data.json cand, not shown until approved) join a view when listed in add {photo: view}.
  function applyCuration(d, c) {
    // Coral Finder book photos (data: gen[].book, cropped from the 2022 book) can be switched off site-wide from the
    // admin (curation.json "book": false). Kept apart from the views so games and quizzes never use them (captions).
    if (c && c.book === false)
      Object.values(d.gen).forEach(g => {
        delete g.book;
      });
    // Book photos are candidates: only those Pierre approved in the admin (genera[n].add {f: view}) show, in that view.
    const X0 = (c && c.exclude) || {};
    // Book photos sent to another genus ("Not this", out) are kept here until the out step moves them, then filtered there.
    const G0 = (c && c.genera) || {};
    Object.entries(d.gen).forEach(([n, g]) => {
      if (!g.book) return;
      const A = (G0[n] || {}).add || {},
        O = (G0[n] || {}).out || {};
      g.book = g.book.filter(p => !X0[p.f] && (A[p.f] || O[p.f])).map(p => (A[p.f] && !O[p.f] ? {...p, view: A[p.f]} : p));
    });
    // Excluded photos (exclude: {f: reason}) leave every list first: genera, lecture photos, candidates, comparisons.
    const X = (c && c.exclude) || {},
      keep = L => (L || []).filter(p => !X[p.f]);
    if (Object.keys(X).length) {
      Object.values(d.gen).forEach(g =>
        ['views', 'more'].forEach(s =>
          Object.keys(g[s] || {}).forEach(v => {
            g[s][v] = keep(g[s][v]);
          })
        )
      );
      ['course', 'cand'].forEach(s =>
        Object.keys(d[s] || {}).forEach(n => {
          d[s][n] = keep(d[s][n]);
        })
      );
      if (d.cmp) d.cmp = keep(d.cmp);
    }
    // "Several corals" photos Pierre marked as one coral (single: {f: 1}) are normal photos again (games and sheet).
    const ONE = (c && c.single) || {};
    if (Object.keys(ONE).length)
      Object.entries(d.gen).forEach(([n, g]) => {
        VIEWS.forEach(([v]) => {
          const L = (g.more || {})[v];
          if (!L) return;
          L.filter(p => ONE[p.f]).forEach(p => (g.views[v] = g.views[v] || []).push(p));
          g.more[v] = L.filter(p => !ONE[p.f]);
        });
        (d.course[n] || []).forEach(p => {
          if (ONE[p.f]) delete p.multi;
        });
      });
    // "Not this genus" (out: {f: 'cmp' | genus}) runs first for every genus, so a photo given to another genus
    // can be featured or picked as cover there; 'cmp' sends it to the look-alike comparison images (d.cmp).
    Object.entries((c && c.genera) || {}).forEach(([n, k]) => {
      const g = d.gen[n];
      if (!g) return;
      Object.entries(k.out || {}).forEach(([f, to]) => {
        let p = null,
          at = null;
        VIEWS.forEach(([v]) =>
          ['views', 'more'].forEach(s => {
            const L = (g[s] || {})[v] || [],
              i = L.findIndex(x => x.f === f);
            if (i >= 0) {
              p = L.splice(i, 1)[0];
              at = [s, v];
            }
          })
        );
        const ci = (d.course[n] || []).findIndex(x => x.f === f);
        if (ci >= 0) {
          p = d.course[n].splice(ci, 1)[0];
          at = ['course'];
        }
        const bi = (g.book || []).findIndex(x => x.f === f);
        if (bi >= 0) {
          p = g.book.splice(bi, 1)[0];
          at = ['book'];
        }
        // A candidate sent to another genus becomes a candidate there (shown once added in that genus).
        const ki = ((d.cand || {})[n] || []).findIndex(x => x.f === f);
        if (ki >= 0) {
          p = d.cand[n].splice(ki, 1)[0];
          at = ['cand'];
        }
        if (!p) return;
        if (to === 'cmp') (d.cmp = d.cmp || []).push({...p, g: [n]});
        else if (d.gen[to] && at[0] === 'book') (d.gen[to].book = d.gen[to].book || []).push({...p, t: to});
        else if (d.gen[to] && at[0] === 'course') (d.course[to] = d.course[to] || []).push(p);
        else if (d.gen[to] && at[0] === 'cand') ((d.cand = d.cand || {})[to] = d.cand[to] || []).push(p);
        else if (d.gen[to]) {
          const G = d.gen[to],
            S = (G[at[0]] = G[at[0]] || {});
          (S[at[1]] = S[at[1]] || []).push(p);
        }
      });
    });
    // Book photos moved in from another genus show only once added here (add {f: view}).
    Object.entries(d.gen).forEach(([n, g]) => {
      if (!g.book) return;
      const A = (G0[n] || {}).add || {};
      g.book = g.book.filter(p => p.view || A[p.f]).map(p => (p.view ? p : {...p, view: A[p.f]}));
    });
    Object.entries((c && c.genera) || {}).forEach(([n, k]) => {
      const g = d.gen[n];
      if (!g) return;
      Object.entries(k.add || {}).forEach(([f, v]) => {
        const p = ((d.cand || {})[n] || []).find(x => x.f === f);
        if (p && VIEWS.some(([w]) => w === v)) (g.views[v] = g.views[v] || []).push(p);
      });
      const hide = new Set(k.hide || []),
        mv = k.move || {},
        feat = k.feat || {};
      const regroup = src => {
        const out = {};
        VIEWS.forEach(([v]) =>
          ((src || {})[v] || []).forEach(p => {
            if (hide.has(p.f)) return;
            const w = mv[p.f] || v;
            (out[w] = out[w] || []).push(p);
          })
        );
        return out;
      };
      const all = [...allPhotos(g), ...VIEWS.flatMap(([v]) => (g.more || {})[v] || []), ...(d.course[n] || []), ...(g.book || [])];
      // Book photos follow Hide and view moves too (they stay out of g.views, so out of games).
      if (g.book) g.book = g.book.filter(p => !hide.has(p.f)).map(p => (mv[p.f] ? {...p, view: mv[p.f]} : p));
      g.views = regroup(g.views);
      g.more = regroup(g.more);
      // Featured photos lead their view, so quick picks (comparisons, first photo of a view) use them too.
      Object.entries(g.views).forEach(([v, L]) => {
        const F = feat[v] || [];
        g.views[v] = [...F.map(f => L.find(p => p.f === f)).filter(Boolean), ...L.filter(p => !F.includes(p.f))];
      });
      if (d.course[n]) d.course[n] = d.course[n].filter(p => !hide.has(p.f)).map(p => (mv[p.f] ? {...p, v: mv[p.f]} : p));
      if (Object.keys(feat).length) g.feat = feat;
      const cv = k.cover && !hide.has(k.cover) && all.find(p => p.f === k.cover);
      if (cv) g.coverP = cv;
      // Zoom levels per genus (curation lv: 2 | 3, admin switch). 2 levels: the Closer photos join Colony, the Closer
      // view disappears; his Closer picks stay in curation.json, so switching back to 3 restores them.
      if (k.lv === 3) delete g.levels;
      if (k.lv === 2 && g.levels !== 2) {
        g.levels = 2;
        ['views', 'more'].forEach(s => {
          const S = g[s] || {};
          if ((S.medium || []).length) S.wide = [...(S.wide || []), ...S.medium];
          delete S.medium;
        });
        if (d.course[n]) d.course[n] = d.course[n].map(p => (p.v === 'medium' ? {...p, v: 'wide'} : p));
        if (g.book) g.book = g.book.map(p => (p.view === 'medium' ? {...p, view: 'wide'} : p));
      }
    });
  }
  // Photos per context (applySlots). Pierre's rule: every IMR photo and every photo of his own is used, with no cap;
  // photos from other iNat observers and approved Coral Finder book photos only fill a set that is short. Per genus
  // and view: sheet = 3 featured + the other IMR/own photos (filled up to 6 in all); games = Easy (the featured),
  // Medium (every other good photo), Hard (the poor ones), levels adding up: since 2026-11-02 (Pierre: new photos must
  // come into the games, the players' answers rate them) games take every photo kept, IMR/own first; they were capped
  // at 4 Medium and 4 Hard, other observers' photos only filling a short set, so newly validated candidates stayed out; Coral
  // Finder (needs variety) = featured + 2 photos from other iNat observers + 3 approved book photos. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions
  // (picks.json feat) come next, then quality. curation.json "use" {f: 'ref'|'game'} keeps a photo on the sheet only
  // or in games only. Nothing is written back: photos left out simply stay unused.
  const CAP = {feat: 3, sheet: 6, inat: 2, book: 3};
  // The automatic rating never calls an IMR lecture photo Poor (Pierre: it misjudges slide images); only his own rating can (autoQ).
  const isCore = p => !!(p.imr || p.own);
  // o.picks = picks.json (Claude's suggested featured photos), o.autoq = quality.json q (automatic rating).
  function applySlots(d, c, o = {}) {
    const AUTOQ = o.autoq || {},
      autoQ = f => {
        const a = AUTOQ[f] || 2;
        return a === 1 && /^imrl?-/.test(f) ? 2 : a;
      };
    const qualOf = (c, f) => ((c && c.quality) || {})[f] || autoQ(f);
    const use = (c && c.use) || {},
      sug = (o.picks || {}).feat || {};
    // k photos from L in order, a different observation each time when possible.
    const take = (L, k) => {
      const out = [],
        seen = new Set();
      [true, false].forEach(fresh =>
        L.forEach(p => {
          if (out.length < k && !out.includes(p) && (!fresh || !seen.has(p.o || p.f))) {
            out.push(p);
            seen.add(p.o || p.f);
          }
        })
      );
      return out;
    };
    const fill = (L, extra, k) =>
      L.length >= k
        ? L
        : [
            ...L,
            ...take(
              extra.filter(p => !L.includes(p)),
              k - L.length
            )
          ];
    Object.entries(d.gen).forEach(([n, g]) => {
      const course = (d.course[n] || []).map(p => ({...p, view: p.v === 'medium' && g.levels === 2 ? 'macro' : p.v}));
      g.sl = {};
      VIEWS.forEach(([v]) => {
        const field = (g.views[v] || []).filter(p => !p.multi),
          q = p => qualOf(c, p.f),
          byQ = L => L.slice().sort((a, b) => q(b) - q(a));
        const all = [...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'game');
        // Sheet order (Pierre): IMR photos first, then his own, then other observers, each by quality; Poor photos last.
        const rr = [...byQ(all.filter(p => p.imr)), ...byQ(all.filter(p => !p.imr && p.own))];
        const others = byQ(all.filter(p => !isCore(p)));
        const ranked = [...rr, ...others].sort((a, b) => (q(a) === 1) - (q(b) === 1));
        // Coral Finder book photos (Pierre 2026-11-01): on the sheet when pinned, or to fill a gap after every field photo; never in games.
        const bk = byQ((g.book || []).filter(p => p.view === v)),
          find = f => all.find(p => p.f === f) || bk.find(p => p.f === f);
        const pin = ((g.feat || {})[v] || []).map(find).filter(Boolean),
          hint = ((sug[n] || {})[v] || []).map(find).filter(p => p && !p.cf);
        // Never a Poor photo while better ones exist, except IMR lecture photos (Pierre).
        // Featured = always the first 3 (Pierre): his pinned photos, then the best remaining ones.
        const pool = [...hint, ...ranked].filter(p => !pin.includes(p)),
          k = CAP.feat - Math.min(pin.length, CAP.feat);
        const feat = [
          ...pin.slice(0, CAP.feat),
          ...fill(
            fill(
              take(
                pool.filter(p => p.imr || q(p) !== 1),
                k
              ),
              pool,
              k
            ),
            bk.filter(p => !pin.includes(p)),
            k
          )
        ];
        // Sheet (Pierre): strictly the first 6 per view in the admin order, the 3 featured then the next 3 (games still use them all).
        const more = [...ranked, ...bk].filter(p => !feat.includes(p)).slice(0, CAP.sheet - feat.length);
        // Games: field photos and IMR lecture photos (Pierre 2026-11-01), never multi-coral or book photos.
        const gm = byQ([...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'ref')),
          core = gm.filter(isCore),
          rest = gm.filter(p => !isCore(p));
        const easy = feat.filter(p => gm.includes(p)),
          left = p => !easy.includes(p);
        const medium = [...core, ...rest].filter(p => left(p) && q(p) >= 2);
        const hard = [...core, ...rest].filter(p => left(p) && !medium.includes(p));
        const book = bk.filter(p => !feat.includes(p)).slice(0, CAP.book);
        g.sl[v] = {
          feat,
          more,
          easy: easy.length ? easy : take(gm, 3),
          medium,
          hard,
          finder: [
            ...feat,
            ...take(
              others.filter(p => !feat.includes(p) && !p.imr),
              CAP.inat
            ),
            ...book
          ]
        };
        // Featured photos lead their view, so every "first photo of the view" (Look-alikes, Compare, Lab, home) uses them.
        if (g.views[v]) g.views[v] = [...feat.filter(p => g.views[v].includes(p)), ...g.views[v].filter(p => !feat.includes(p))];
      });
    });
  }

  // Global player level (Pierre, 2026-11-01: "good beta testers must not wait 100 questions for it to get harder"): the
  // starting ability of a genus the player has never answered. The player's global ability is an Elo over ALL their answers
  // (app.js keeps it in the progress as the pseudo-genus LEVEL, '~level': ok, ko and th like a genus, so it syncs and
  // merges like one); progress saved before it existed falls back on the mean ability of the genera answered. It is shrunk
  // towards 0 while answers are few (M / (M + N)) and only partly carried over (W: knowing Acropora well says something,
  // not everything, about Porites), then clamped to [LO, HI]: a strong player's first question on a new genus has traps
  // and harder photos but is never the hardest, a struggling player's starts a little easier. Taken once: the first answer
  // on the genus saves its own ability (s.th) from there.
  const LEVEL = '~level',
    START = {W: 0.8, N: 10, LO: -0.5, HI: 1.5};
  function playerStart(P, skip) {
    P = P || {};
    const n = s => ((s && s.ok) || 0) + ((s && s.ko) || 0),
      G = P[LEVEL];
    let m = 0,
      t = 0;
    if (G && typeof G.th === 'number' && n(G)) {
      m = n(G);
      t = m * G.th;
    } else
      Object.keys(P).forEach(g => {
        const s = P[g] || {};
        if (g === skip || g === LEVEL || typeof s.th !== 'number' || !n(s)) return;
        m += n(s);
        t += n(s) * s.th;
      });
    if (!m) return 0;
    const v = START.W * (t / m) * (m / (m + START.N));
    return Math.round(Math.min(START.HI, Math.max(START.LO, v)) * 100) / 100;
  }
  // The global record made at the first answer after this change: it starts from the player's history (every answer so
  // far, the answer-weighted mean ability of the genera), so their earlier answers keep counting (code review, #320).
  function levelSeed(P) {
    let ok = 0,
      ko = 0,
      m = 0,
      t = 0;
    Object.keys(P || {}).forEach(g => {
      const s = P[g] || {},
        n = (s.ok || 0) + (s.ko || 0);
      if (g === LEVEL) return;
      ok += s.ok || 0;
      ko += s.ko || 0;
      if (typeof s.th === 'number' && n) {
        m += n;
        t += n * s.th;
      }
    });
    return {ok, ko, th: m ? Math.round((t / m) * 100) / 100 : 0};
  }

  // Common first (Pierre, 2026-11-03: open the genera "easy and common first"): the opening weight of each genus not met
  // yet (model.js weighted) is multiplied by sqrt((1 + cm) / (1 + median cm of those genera)), cm = how common the genus
  // is near Dauin on iNaturalist (data.json, tools/commonness.py). No constant: the square root damps it, the median
  // makes it relative to the genera still to open. A genus without cm counts as the median (factor 1).
  // An existing account at sign-in (Pierre, 2026-11-03: players type only their first name, so two of them can pick the
  // same name and code; sync.js bindSync asks "Is it you?" before entering it): what its saved progress, as the sheet's
  // sign-in reply carries it (data, updated), says about it. n: answers (the LEVEL record's ok + ko; 0 for progress saved
  // before LEVEL existed), genera: genera answered, at: the last answer (LEVEL.at, else the latest genus s.at, else the
  // sheet's last save, then saved is true). A missing or broken field counts as nothing, never as an error.
  function accountOf(data, updated) {
    let R = {};
    try {
      R = JSON.parse((data && data['imr-coral-progress']) || '{}');
    } catch (e) {}
    if (!isObj(R)) R = {};
    const num = x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0),
      L = isObj(R[LEVEL]) ? R[LEVEL] : {},
      gs = Object.keys(R).filter(g => g !== LEVEL && isObj(R[g]) && num(R[g].ok) + num(R[g].ko) > 0);
    let at = num(L.at) || Math.max(0, ...gs.map(g => num(R[g].at))),
      saved = false;
    if (!at) {
      at = num(typeof updated === 'number' ? updated : Date.parse(String(updated || '')));
      saved = !!at;
    }
    return {n: num(L.ok) + num(L.ko), genera: gs.length, at, saved};
  }

  function commonFactor(cms) {
    const v = (cms || []).filter(x => typeof x === 'number' && x >= 0).sort((a, b) => a - b),
      h = v.length >> 1,
      med = v.length ? (v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2) : 0;
    return (cms || []).map(x => (typeof x === 'number' && x >= 0 ? Math.sqrt((1 + x) / (1 + med)) : 1));
  }

  // Achievements (Pierre, 2026-11-01: "unlocked as milestones are passed, with an animated pop-up, to keep the wish to play";
  // "well spread out": learning a whole genus takes ~300-430 questions, so most rungs are the quarters on the way there).
  // Learning milestones only, never time or days played (the learning model's rule). Each has a family, a tier
  // (1 bronze, 2 silver, 3 gold) and a test on a snapshot the app builds (app.js achSnap):
  //   {total, met, q: [genera at Open Water (>= 50%), Advanced (>= 80%), Divemaster (>= 95%) or above; model.js MASTERY,
  //   2026-11-03, were the quarters 25/50/75% before], learned (Instructor), pct, streak (best run of right answers), duel, cor,
  //    hard, elo (0 until 200 answers, app.js ELO_MIN: it moves a lot before), group (an IMR lecture group fully learned), bonus (bonus genera met)}.
  // Median questions to reach the old quarter rungs, simulated with the real game (2026-11-01, before the levels; 75% / 90% right): 5 at 25%
  // 76 / 57, 10 at 50% 231 / 137, 5 at 75% 363 / 203, first learned ~430 / ~300.
  // Descriptions say what the player can now do (Pierre, 2026-11-02: informational feedback motivates, Deci, Koestner &
  // Ryan 1999; counts stay counts: genera met, progress %, Elo).
  const ACH = [
    ['met10', 'Explorer', 'Met 10 genera', 1, '🧭', s => s.met >= 10],
    ['met20', 'Wide eyes', 'Met 20 genera', 1, '🧭', s => s.met >= 20],
    ['metall', 'Whole slate', 'Met every genus of the list', 2, '🧭', s => s.total && s.met >= s.total],
    ['q25a', 'Open Water: 5 genera', '5 genera at Open Water level or above (50%+)', 1, '🌱', s => s.q[0] >= 5],
    ['q25b', 'Open Water: 10 genera', '10 genera at Open Water level or above', 1, '🌱', s => s.q[0] >= 10],
    ['q25c', 'Open Water: 20 genera', '20 genera at Open Water level or above', 2, '🌱', s => s.q[0] >= 20],
    ['q50a', 'Advanced: 5 genera', '5 genera at Advanced level or above (80%+)', 1, '🌿', s => s.q[1] >= 5],
    ['q50b', 'Advanced: 10 genera', '10 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 10],
    ['q50c', 'Advanced: 20 genera', '20 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 20],
    ['q75a', 'Divemaster: 5 genera', '5 genera at Divemaster level or above (95%: their mastery exam is on)', 2, '🪸', s => s.q[2] >= 5],
    ['q75b', 'Divemaster: 10 genera', '10 genera at Divemaster level or above', 2, '🪸', s => s.q[2] >= 10],
    ['learn1', 'First Instructor', "You passed a genus's mastery exam: you could teach it", 2, '🎓', s => s.learned >= 1],
    ['learn5', 'Instructor: 5 genera', 'Mastery exam passed on 5 genera', 3, '🎓', s => s.learned >= 5],
    ['learn10', 'Instructor: 10 genera', 'Mastery exam passed on 10 genera', 3, '🎓', s => s.learned >= 10],
    ['learn20', 'Instructor: 20 genera', 'Mastery exam passed on 20 genera', 3, '🎓', s => s.learned >= 20],
    ['learnall', 'Coral master', 'You know every genus of the list for sure', 3, '👑', s => s.total && s.learned >= s.total],
    ['pct5', 'First steps', '5% progress', 1, '📈', s => s.pct >= 5],
    ['pct10', 'On the way', '10% progress', 1, '📈', s => s.pct >= 10],
    ['pct25', 'A quarter', '25% progress', 2, '📈', s => s.pct >= 25],
    ['pct50', 'Half the slate', '50% progress', 2, '📈', s => s.pct >= 50],
    ['pct75', 'Three quarters', '75% progress', 3, '📈', s => s.pct >= 75],
    ['pct100', 'Complete', '100% progress', 3, '📈', s => s.pct >= 100],
    ['run10', 'On a roll', '10 right in a row: your eye is getting sharp', 1, '🔥', s => s.streak >= 10],
    ['run25', 'Unstoppable', '25 right in a row: a sharp eye', 2, '🔥', s => s.streak >= 25],
    ['duel', 'Look-alike slayer', 'You told two look-alikes apart', 1, '⚔️', s => s.duel],
    ['cor', 'Corallite reader', 'You named a genus from its corallites alone', 1, '🔬', s => s.cor],
    ['hard', 'Sharp eye', 'You named a photo most players miss', 2, '🎯', s => s.hard],
    ['elo1100', 'Elo 1100', 'Reached an Elo of 1100', 1, '⭐', s => s.elo >= 1100],
    ['elo1200', 'Elo 1200', 'Reached an Elo of 1200', 2, '⭐', s => s.elo >= 1200],
    ['elo1300', 'Elo 1300', 'Reached an Elo of 1300', 3, '⭐', s => s.elo >= 1300],
    ['elo1400', 'Elo 1400', 'Reached an Elo of 1400', 3, '🌟', s => s.elo >= 1400],
    ['group', 'Group complete', 'You know a whole IMR lecture group', 3, '🧩', s => s.group],
    ['bonus', 'Off the list', 'You met a bonus genus, off the IMR list', 2, '🔓', s => s.bonus >= 1]
  ].map(([id, title, desc, tier, icon, test]) => ({id, title, desc, tier, icon, test}));
  // The achievements a snapshot meets that `have` ({id: time}) does not hold yet, in list order.
  const newAch = (snap, have) => ACH.filter(a => !(have || {})[a.id] && a.test(snap)).map(a => a.id);
  // Achievements taken back (Pierre, 2026-11-03): only those that rest on genera learned, and only when a recalculation
  // takes a learned mark away (model.js mxRecalc, progress.js achRecheck); anywhere else achievements are only added.
  // achRevoke removes from A ({id: time}) those of ACH_LEARN that the snapshot no longer meets, and dates in A._gone
  // {id: time} every one of them the snapshot does not meet, held here or not: the tombstone keeps a copy earned before
  // (the sheet's, another device's not merged yet) from coming back through a merge (mergeAch); earned again later, the
  // achievement carries a newer time and stays. Returns the ids removed.
  const ACH_LEARN = ['learn1', 'learn5', 'learn10', 'learn20', 'learnall', 'group'];
  function achRevoke(A, snap, t) {
    if (!A || typeof A !== 'object') return [];
    const off = ACH.filter(a => ACH_LEARN.includes(a.id) && !a.test(snap)).map(a => a.id),
      out = off.filter(id => A[id]);
    if (off.length) A._gone = {...(A._gone || {})};
    off.forEach(id => {
      delete A[id];
      A._gone[id] = Math.max(t, A._gone[id] || 0);
    });
    return out;
  }
  // Two achievement records of one player (progress.js achMerge: another device's, the sheet's, this device's before
  // signing in): every achievement with its earliest date, the best run kept; the current run (_run) stays A's. A record of
  // another version than v (progress.js ACH_V: counted on older rules) brings its feats (keys starting with _) but not its
  // achievements. Removals (_gone) join, the latest per id; an achievement dated at or before its removal, on either side,
  // is dropped (taken back, it must be earned again). Changes and returns A.
  function mergeAch(A, ra, v) {
    A = A && typeof A === 'object' ? A : {};
    if (!ra || typeof ra !== 'object') return A;
    const old = ra._v !== v,
      gone = {...(A._gone || {})};
    Object.entries(ra._gone || {}).forEach(([k, t]) => typeof t === 'number' && !(gone[k] >= t) && (gone[k] = t));
    const off = (k, t) => typeof gone[k] === 'number' && !(t > gone[k]);
    Object.keys(ra).forEach(k => {
      if (k === '_run' || k === '_v' || k === '_gone' || (old && k[0] !== '_') || off(k, ra[k])) return;
      A[k] = k === '_best' ? Math.max(A[k] || 0, ra[k] || 0) : A[k] && !off(k, A[k]) ? Math.min(A[k], ra[k]) : ra[k];
    });
    Object.keys(gone).forEach(k => off(k, A[k]) && delete A[k]);
    if (Object.keys(gone).length) A._gone = gone;
    return A;
  }

  // Progress of a genus (2026-11-02, Pierre: BKT climbed too fast, and a right answer among a few genera counted
  // almost as much as one against the genus's look-alikes; Pelánek & Řihák 2017 recommend a moving average as the
  // mastery criterion): s.pg, an exponential moving average of the answers on the genus, each weighed by what it proves
  // (w, 0 to 1): a right answer s.pg += PROG.A × w × (1 − s.pg), w from the choices (model.js pgWeight); a miss
  // s.pg −= PROG.A × w × s.pg, w from how hard the photo was for the player (model.js pgMissW: in full on a photo at
  // the player's level, less on a harder one; Pierre: a miss on a very hard photo does not mean the genus is badly
  // known, and a miss must not cost more than it proves). Each point
  // is harder to earn than the last, a run of right answers on easy choices tops out lower than one against look-alikes,
  // and the bar follows the recent answers. PROG.M = the mastery exam's entry, shown as 95%. docs/LEARNING.md
  // "Progress (moving average) and mastery" has the simulation behind A 0.15 and M 0.8.
  // OLD: progress saved before s.pg (BKT's L) is recomputed from what the record holds in order, its last 10 results
  // (s.h), from 0, a right answer weighed 2/3 (what it proved is not known: the middle weight, a 4-choice question
  // without look-alike or 2 choices with one). Simulated, that is close for a beginner and below the live value for a
  // strong player (never above it by much): 10 right answers in a row give 0.65, 77% on the bar, so no genus enters the
  // exam on old answers alone. A genus learned on such a record lost it (memRecalc, 2026-11-03: its exam was passed under
  // BKT); until that runs, it counts at the exam entry.
  const PROG = {A: 0.15, M: 0.8, LOOK: 0.5, OLD: 0.67};
  // A learned genus keeps its mark while its progress stays at PROG.M × (1 − PROG.A) or above after a miss (one miss from
  // PROG.M or above, not two): the game's rule (model.js mxKept, applied in quiz.js answer after each miss) and the
  // replay's (replayProgress lm, replayedOf).
  const mxKeeps = pg => pg >= PROG.M * (1 - PROG.A) - 1e-6;
  const pgStep = (g, good, w) => Math.round((g + PROG.A * w * ((good ? 1 : 0) - g)) * 1e4) / 1e4;
  // The fallback for a device that never reaches the sheet: once it does, the sheet's full replay of its log replaces
  // such a record (replayProgress, sync.js replayAdopt).
  function pgOf(s) {
    if (!s) return 0;
    if (typeof s.pg === 'number') return s.pg;
    const g = [...String(s.h || '')].reduce((x, c) => x + PROG.A * (c === '1' ? PROG.OLD : 1) * ((c === '1' ? 1 : 0) - x), 0);
    return s.mx ? Math.max(g, PROG.M) : g;
  }
  // The bar of a genus, 0 to 1: s.pg fills 95% on its way to PROG.M, each mastery-exam question passed adds 1%, the
  // passed exam makes it 100%.
  function scoreOf(s) {
    if (!s) return 0;
    if (s.mx) return 1;
    const g = pgOf(s);
    // At most 4 of the 5 exam steps before the exam is passed (Codex review #393): an exam begun before typed questions
    // can have 5 right answers still waiting for its typed ones, and only a passed exam (s.mx) makes 100%.
    return 0.95 * Math.min(1, g / PROG.M) + (g >= PROG.M && s.ex ? (0.05 * Math.min(4, s.ex.k || 0)) / 5 : 0);
  }
  // Progress % of a saved progress P over a list of genera, as the app shows it (genScore / progPct). The sync sheet
  // computes the leaderboard % with a copy (Code.gs pctOf_, v16; s.pg from v22): keep the two in step
  // (tests/sync.test.js compares them; tests/draw.smoke.js compares this with the app's progPct).
  function pctOf(P, list) {
    return list && list.length ? Math.round((100 * list.reduce((t, n) => t + scoreOf((P || {})[n]), 0)) / list.length) : 0;
  }

  // The genera the games play, defined once for the app, the admin and tools/fetch_local.py (tools/genera.py reads the
  // two lists below from this file). data.json "gen" is the IMR coral slate; data.json "x" holds the Coral Finder's extra
  // genera (in the book, present at Dauin, not on the IMR list), shown only in Identify > Coral Finder, except:
  // - BENTHIC (Pierre, 2026-11-02): Millepora, fire coral, not a hard coral nor on the IMR coral list but on the IMR
  //   benthic slate and everywhere at Dauin: a slate genus for the games and the progress (app.js isBenthic);
  // - BONUS (Pierre, 2026-11-01, opt-in since 2026-11-02): genera off the slate common at Dauin and easily taken for a
  //   slate genus (app.js bonusList, isBonus). Played once the player turns them on; never counted in the progress.
  // slateOf(d) = the slate as the games and the progress count it (app.js slateGenera); gameOf(d) = every genus a game
  // can ask (slate + BONUS), the "game genera" of the admin (candidate queue first, Game coverage, caps). The rest of
  // data.json "x" are the Finder-only genera. d = data.json as served ({gen, x: {gen}}), or the admin's copy, whose
  // DATA.gen also holds the "x" genera (admin.js): a genus of d.x.gen is never a slate genus by its key in d.gen.
  const BENTHIC = ['Millepora'],
    BONUS = ['Isopora', 'Leptoseris', 'Heliopora', 'Sandalolitha', 'Pleuractis'];
  const xGen = d => (d && d.x && d.x.gen) || {};
  function slateOf(d) {
    const X = xGen(d);
    return [...Object.keys((d && d.gen) || {}).filter(n => !X[n]), ...BENTHIC.filter(n => X[n])];
  }
  function gameOf(d) {
    const X = xGen(d);
    return [...slateOf(d), ...BONUS.filter(n => X[n])];
  }
  // The starred (★) genera: on the slate, not numbered (data.json gen[n].n 0, not surveyed by IMR), there because they
  // look like surveyed genera (AGENTS.md rule 6b). lectureGroup(d, n): the IMR lecture group a genus is shown in, its own
  // (ig), else, for a ★ genus the lecture doesn't group, the group most of its Coral Finder look-alikes belong to (ties:
  // the first listed); 0 for none (app learn.js shownGroup). starRefs(d, n): the surveyed look-alikes in that group, the
  // genera its card names ("★ look-alike of Turbinaria, Tubastraea", learn.js starNote); [] for any other genus.
  // starWaits(d, n, list, met) (Pierre, 2026-11-03: a ★ genus opens only once the genus its card compares it to has
  // been met; a beginner met Duncanopsammia, "Like Turbinaria, but corallites about 6 mm", before Turbinaria): true while
  // one of n's references is in list (the genera the draw can open) and not met. A reference is always a surveyed genus,
  // which never waits itself, and one not in the list never holds n back: no genus can wait for ever.
  function lectureGroup(d, n) {
    const G = (d && d.gen) || {},
      g = G[n];
    if (!g || xGen(d)[n]) return 0;
    if (g.ig) return g.ig;
    const L = (g.look || []).filter(b => G[b] && G[b].ig),
      c = {};
    L.forEach(b => (c[G[b].ig] = (c[G[b].ig] || 0) + 1));
    return L.reduce((best, b) => (c[G[b].ig] > c[best] ? G[b].ig : best), L.length ? G[L[0]].ig : 0) || 0;
  }
  function starRefs(d, n) {
    const G = (d && d.gen) || {},
      X = xGen(d),
      g = G[n];
    if (!g || g.n || X[n]) return [];
    const k = lectureGroup(d, n);
    return (g.look || []).filter(b => G[b] && G[b].n && !X[b] && G[b].ig === k);
  }
  const starWaits = (d, n, list, met) => starRefs(d, n).some(r => list.includes(r) && !met(r));

  // Photos out of the repo, step 2 (Pierre, 2026-11-03; docs/ROADMAP.md): the site's photos (img/<f>.webp and its -m, -s,
  // -t files) are read from the Cloudflare R2 bucket that tools/r2_sync.sh mirrors img/ to, same paths under this base;
  // the site's own img/ is the fallback (app.js / admin.js photoFail, sw.js photo). The one switch: '' here sends the
  // app, the admin and the Coral Finder back to img/ (sw.js only caches what it is asked for).
  const PHOTO_BASE = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev/';
  // The same files on the site: every R2 address in s (a URL, a srcset, an inline style) made relative again.
  const photoLocal = s => (PHOTO_BASE && typeof s === 'string' ? s.split(PHOTO_BASE).join('') : s);
  // An element whose R2 photo failed (an <img>, or the figure holding a game photo's backdrop): its src, srcset, data-lo
  // (the 480 px fallback) and inline style point at the site's copies. True when it had an R2 address. srcset before src:
  // each change starts a new load, and the browser picks from the srcset.
  function photoToSite(el) {
    let hit = false;
    if (PHOTO_BASE && el && el.getAttribute)
      for (const a of ['data-lo', 'style', 'srcset', 'src']) {
        const v = el.getAttribute(a);
        if (v && v.includes(PHOTO_BASE)) {
          el.setAttribute(a, photoLocal(v));
          hit = true;
        }
      }
    return hit;
  }

  // A photo that fails on R2 is asked from R2 once more after PHOTO_RETRY ms before any other source (Pierre,
  // 2026-11-03: in a 50-player load test 2 requests in 2000 failed, passing network errors a second try gets). An
  // element whose R2 photo fails for the first time: true, and a probe asks R2 again; if it loads, the element's src
  // and srcset are set again (the file now comes from the browser's cache), else fallback(el) runs (photoToSite).
  // The element keeps its attributes meanwhile. False otherwise: the caller falls back at once.
  const PHOTO_RETRY = 800;
  function photoRetry(el, fallback) {
    if (!PHOTO_BASE || !el || !el.getAttribute || !el.dataset || el.dataset.r2try) return false;
    const src = el.getAttribute('src') || '',
      set = el.getAttribute('srcset') || '',
      u = el.currentSrc || src;
    if (!u.includes(PHOTO_BASE)) return false;
    el.dataset.r2try = '1';
    setTimeout(() => {
      const t = new Image();
      t.onload = () => {
        if (set) el.setAttribute('srcset', set);
        if (src) el.setAttribute('src', src);
      };
      t.onerror = () => fallback(el);
      t.src = u;
    }, PHOTO_RETRY);
    return true;
  }

  // Typed answers (Pierre, 2026-11-03; first the Lab prototype proto/type.js, then the quiz, quiz.js): the player types
  // the genus instead of picking 1 of 4 (recall, not recognition). What Pierre agreed: light spelling tolerance (1 letter
  // on a short name, 2 on a long one), old names accepted ("formerly X" in the genus's own lines), no suggestions while
  // typing, the phone's autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after
  // the answer. A word that is no game genus, even with the tolerance, is no answer: the player is asked to check it.
  const TYPE = {
    // Edits allowed: one for a name of up to 6 letters, two beyond (Porites, Pocillopora).
    tol: n => (n <= 6 ? 1 : 2)
  };
  // Optimal string alignment distance (Levenshtein + a swap of two neighbouring letters, the commonest typo).
  function typeDist(a, b) {
    const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    return d[a.length][b.length];
  }
  const typeNorm = s =>
    String(s || '')
      .trim()
      .split(/\s+/)[0] // "Acropora sp." or a species: the genus is the first word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '');
  // Every name a player may type: the genera cur (every genus the app knows, the slate's and the extra ones) and the old
  // names of their own "formerly X" lines (gx(name): the genus's record, its crit and imr lines). An old name that is
  // itself a game genus is left out: Duncanopsammia peltata was "formerly Turbinaria peltata", Turbinaria is still valid.
  // Returns [{k: normalised name, g: genus, old: the old name or ''}].
  function typeNamesOf(cur, gx) {
    const out = cur.map(n => ({k: typeNorm(n), g: n, old: ''}));
    cur.forEach(n => {
      const g = gx(n) || {},
        txt = [...(g.crit || []), ...(g.imr || [])].join(' ');
      for (const m of txt.matchAll(/formerly ((?:[A-Z][a-z]+)(?:\s*\/\s*[A-Z][a-z]+)*)/g))
        m[1]
          .split('/')
          .map(x => x.trim())
          .forEach(o => {
            if (!gx(o) && !out.some(x => x.k === typeNorm(o))) out.push({k: typeNorm(o), g: n, old: o});
          });
    });
    return out;
  }
  // What the typed text names among names (typeNamesOf): {g, old, exact} for one genus within the tolerance, {near:
  // [genera]} when two are as close (the player is asked to check the spelling), null when nothing is close.
  function typeMatchIn(names, text) {
    const t = typeNorm(text);
    if (t.length < 3) return null;
    const all = names
      .map(x => ({...x, d: typeDist(t, x.k)}))
      .filter(x => x.d <= TYPE.tol(x.k.length))
      .sort((a, b) => a.d - b.d);
    if (!all.length) return null;
    const best = all.filter(x => x.d === all[0].d),
      gs = [...new Set(best.map(x => x.g))];
    if (gs.length > 1) return {near: gs};
    return {g: best[0].g, old: best[0].old, exact: best[0].d === 0};
  }
  // The share of a genus's questions asked as typed ones, from its progress x (0 to 1, the % shown): none below T.from,
  // then a straight line between the points T.at ([progress, share], in order), flat after the last (model.js TYPED).
  function typedShare(x, T) {
    const at = T.at || [];
    if (!(x >= T.from) || !at.length) return 0;
    if (x <= at[0][0]) return at[0][1];
    for (let i = 1; i < at.length; i++)
      if (x <= at[i][0]) {
        const [x0, y0] = at[i - 1],
          [x1, y1] = at[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    return at[at.length - 1][1];
  }

  // What one answer proves, the weights of pgStep (docs/LEARNING.md "Progress (moving average) and mastery"), shared by
  // the app (model.js pgWeight, quiz.js answer) and the full replay below, so both run the same rules.
  // TARGET_P: the chance every question aims for, whatever its format (model.js PICKD.P, the difficulty controller:
  // about 80% right; 2026-11-03, before it a photo TARGET_OFF 1.0 below the ability, 80% with 4 choices only).
  const TARGET_P = 0.8;
  // The success aimed for follows the player's global level (Pierre, 2026-11-03: strong players must find the app
  // challenging quickly, and beginners must not be overwhelmed): AIM, points [global level, success], 85% up to a level
  // of 0.5, 75% from 1.5, a straight line between, flat outside (no cliff); TARGET_P (0.8, the middle) stays the game's
  // reference. model.js aimP (the photos aimed at, the opening's shaky bar) and the miss weight (pgMissW, in the game
  // and in the full replay) take it from here. docs/LEARNING.md "Beginners and experts".
  const AIM = [
    [0.5, 0.85],
    [1.5, 0.75]
  ];
  function aimOf(L) {
    const [[l0, p0], [l1, p1]] = AIM;
    return p0 + (p1 - p0) * Math.min(1, Math.max(0, ((Number(L) || 0) - l0) / (l1 - l0)));
  }
  const sigm = x => 1 / (1 + Math.exp(-x));
  // A right answer, w from 0 to 1: the plausible choices k ((1 − 1/k) / (1 − 1/4): 4 weigh 1, 3 0.89, 2 0.67), in full
  // when a genus it gets confused with is among the choices (look), PROG.LOOK when none is. model.js pgWeight finds look.
  // A typed answer (k infinite, model.js TYPED.k) counts in full: every genus, its look-alikes included, was a possible
  // answer.
  const pgRightW = (k, look) => Math.min(1, Math.max(0, (1 - 1 / k) / (1 - 1 / 4))) * (look || !isFinite(k) ? 1 : PROG.LOOK);
  // What a miss proves (Pierre, 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly
  // known"; a miss must not cost more than it proves): the Elo chance the player had to get it right (ability th against
  // the photo's difficulty d, k choices, as abilityStep), over the chance the game aims for (aim: aimOf the player's global
  // level, 85% to 75%, whatever the format: model.js's difficulty controller, aimP; TARGET_P, 0.8, when not given). A photo at the player's level or easier: the miss counts in full; a harder one:
  // less (1 unit harder: 0.78; 2 units: 0.56). No new constant: the Elo and the photo targeting set it. The right answers
  // keep their weight (pgRightW): simulated, a photo factor on them only slowed everyone.
  // R: the recall expected after a break, for a comeback question (model.js comebackOf; 1 otherwise): the chance the
  // player had is then the recall-adjusted one, so a miss the rust explains costs less progress (Pierre, 2026-11-02).
  function pgMissW(th, d, k, R = 1, aim = TARGET_P) {
    const e = (x, r = 1) => 1 / k + (1 - 1 / k) * r * sigm(x);
    return Math.min(1, e(th - d, R) / aim);
  }
  // What a right answer on a photo the player knows proves (Pierre, 2026-11-03): only what memory does not explain. The
  // mirror of pgMissW (a ratio of chances, like it): the chance the player had on the same photos new over the chance
  // they had with their memory of them (fam, model.js famOf), at most 1: the share of such right answers that would have
  // come without the memory. A new photo (fam 0) keeps its full weight: simulated, a photo-difficulty factor on every
  // right answer only slowed everyone, so only the part memory explains is taken off. 4 choices, a photo at the game's
  // target (ability 1 above it): x 0.93 shown never right, x 0.87 right once, x 0.84 right twice or more with the
  // offsets of 2026-11-03. Tried first, the room for surprise left ((1 - chance with memory) / (1 - chance new): x 0.71
  // / 0.41 / 0.23): simulated, it took a third to a half of the genera learned by question 600 and put the progress
  // further below the truth than memory had put it above (docs/LEARNING.md "Photo memory").
  function pgMemW(th, d, fam, k, R = 1) {
    const e = x => 1 / k + (1 - 1 / k) * R * sigm(x);
    return fam >= 0 ? 1 : Math.min(1, e(th - d) / e(th - d - fam));
  }
  // Number of choices as the app scored an answer, from its log row: a typed answer (|t, quiz.js answer) none to guess
  // from (Infinity, model.js TYPED.k: no 1/k floor, as guessOf), |kN in the mode (the plausible choices, logged when
  // fewer than the buttons), a duel 2, else the genera offered (2-3), else 4.
  const kOf = (mode, choices) => {
    if (TYPED_RE.test(String(mode || ''))) return Infinity;
    const kq = /\|k(\d)/.exec(String(mode || ''));
    if (kq) return Number(kq[1]);
    if (/duel|\|d(\||$)/.test(String(mode || ''))) return 2;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? n : 4;
  };

  // Player ability per genus (s.th), on the same scale as photo difficulty (0 = average photo): an Elo step after each
  // answer, as in the sync sheet (Code.gs stats_): P(right) = g + (1 - g) * sigmoid(ability - difficulty), g = 1/choices;
  // ability moves by K * (result - P(right)), K shrinking as answers build up (Pelánek 2016) but never below kmin, so a
  // genus that starts going wrong eases off quickly. Learners change (Pierre, 2026-11-02): as Glicko-2's volatility
  // (Glickman 2012), s.vr follows the recent surprise (result - expected, moving average, rate vr); while answers keep
  // beating (or missing) the expectation, the step grows by up to vg x |s.vr|, within kmax. docs/LEARNING.md. Moved here
  // from model.js (2026-11-03) so the full replay (replayProgress) rebuilds the ability with the app's own step;
  // model.js ability / abilityStep call these on the app's P.
  // abilityOf(P, n): progress saved with the old Easy/Medium/Hard steps (s.lv) starts from the matching ability; a genus
  // never answered starts from the player's global level (playerStart); a genus already answered: its own estimate (s.th,
  // from its last own step) plus the global level's move since then (levelMove), so what the player shows on the other
  // genera moves it too while its own answers are few: the global + concept skill of Pelánek et al. (UMUAI 2017), as a
  // lazy update (2026-11-03, docs/LEARNING.md "Global level and genus").
  const ELO = {th0: 0, kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3, vr: 0.1, vg: 2};
  const abilityOf = (P, n) => {
    const s = (P || {})[n] || {};
    if (typeof s.th !== 'number') return s.lv ? ELO.th0 + Math.min(2, s.lv) : playerStart(P, n);
    return Math.min(ELO.hi, Math.max(ELO.lo, s.th + levelMove(P, n, s)));
  };
  // The global level's move since the genus's own last step (s.lt: the level then), weighed by the genus's own
  // uncertainty 1 / (1 + answers / ELO.n), the share its own Elo step gives a new answer: a genus with few answers leans
  // on the level, one with many on itself. Both ways (a one-way rise was tried: biased upward, it over-rated a simulated
  // beginner by 0.5-0.7). No new constant. Taken in at the genus's next own step (eloStep). Progress saved before (no
  // s.lt): nothing until that step.
  function levelMove(P, n, s) {
    const G = (P || {})[LEVEL];
    if (n === LEVEL || !s || typeof s.lt !== 'number' || !G || typeof G.th !== 'number') return 0;
    return Math.round(((G.th - s.lt) / (1 + ((s.ok || 0) + (s.ko || 0)) / ELO.n)) * 100) / 100;
  }
  function eloStep(P, n, s, good, d, k) {
    const th = abilityOf(P, n),
      g = 1 / k,
      e = g + (1 - g) * sigm(th - d),
      m = (s.ok || 0) + (s.ko || 0);
    s.vr = Math.round(((1 - ELO.vr) * (s.vr || 0) + ELO.vr * ((good ? 1 : 0) - e)) * 1000) / 1000;
    // The global level's step has no floor (ELO.kmin is for a genus, which must ease off quickly when it starts going
    // wrong): the level pools every answer and now moves every genus (levelMove), so it settles as answers build up
    // (Pelánek's uncertainty function), the volatility still letting it catch up with a lasting change. With the floor a
    // run of early misses sank it (one real player to -0.41 against a fit of 0.56) and dragged the genera with it.
    const K = Math.min(ELO.kmax, Math.max(n === LEVEL ? 0 : ELO.kmin, ELO.kmax / (1 + m / ELO.n)) * (1 + ELO.vg * Math.abs(s.vr)));
    // Kept to 4 decimals for the global level (2 for a genus): without the floor its steps fall under 0.005 after a few
    // hundred answers, and rounding them to 2 decimals lost every one (Codex review #415: 1000 right answers left it at 1).
    const r = n === LEVEL ? 1e4 : 100;
    s.th = Math.round(Math.min(ELO.hi, Math.max(ELO.lo, th + K * ((good ? 1 : 0) - e))) * r) / r;
    // The level this step was taken against (the level before this answer's own step on it, as quiz.js answer orders them).
    if (n !== LEVEL && P && P[LEVEL] && typeof P[LEVEL].th === 'number') s.lt = P[LEVEL].th;
    delete s.lv;
    delete s.run;
  }

  // Rules versions (Pierre, 2026-11-03: progress is recalculated from the whole answer log, by the sheet, automatically,
  // now and whenever the progress engine changes). Every change to a rule that moves the progress (what an answer
  // weighs, the moving average, the ability step, the photo memory, what the replay keeps from the device...) appends
  // an entry here: v (the next number), at (the date), why (one line for the docs), msg (null, or the announcement card
  // {t: title, p: paragraph, in plain words} that every device which skipped this version shows once, AGENTS.md "How to
  // make a change" 12; with only: 'changed', shown only when the adoption moved the player's progress % by min points or
  // more, {from} and {to} in p being the two %). Every version takes RV_CARD (Pierre, 2026-11-03, a standing rule: AGENTS.md
  // "How to make a change" 14); Pierre is asked only for a different text. The sync script, which embeds this file
  // (tools/sync_core.py), replays a player's log again when their stored replay is older than RV, and the app adopts a
  // replay newer than the one it applied (sync.js replayAdopt). docs/LEARNING.md "Full replay".
  // The standard recalculation card (Pierre, 2026-11-03: "only to the players whose progress the replay moves a lot; if
  // it moves everyone a lot, everyone gets it"): shown to a player whose progress % the adoption moved by 5 points or
  // more, either way (progress.js rvNoticeAdd), with the two %.
  const RV_CARD = {
    kind: 'update', // the card's kind (app.js cardShow, CARD_KINDS)
    t: 'Your progress was recalculated with the improved model',
    p: 'Your progress is now computed again from all your answers, with the rules the app uses today. It went from {from}% to {to}%. Every answer you gave is kept.',
    only: 'changed',
    min: 5
  };
  const RVS = [
    {
      v: 1,
      at: '2026-11-03',
      why: 'Full replay of each player by the sheet: moving average weighed by what each answer proves, photo memory, former-model learned marks dropped, no Elo step on the genus wrongly given, a genus ability moving with the global level and the miss weighed against the aim at that level (#415), a learned mark kept unless a miss logged after its exam takes it away as the game does',
      // Pierre, 2026-11-03: the standard card, only for the players whose progress % moves by 5 points or more (several
      // lose points: the former model's learned marks are dropped).
      msg: RV_CARD
    },
    {
      v: 2,
      at: '2026-11-04',
      why: 'The opening pace and known mix-ups (#425): a question whose choices hold a genus the player mixes up with the one shown more than everyone does (3 or more plausible choices) counts as that much harder, for the ability, the global level and the weight of a miss',
      msg: RV_CARD
    }
  ];
  const RV = RVS[RVS.length - 1].v;
  // The sync script version from which the sheet replays (Code.gs replay_, v28). The app never gets ahead of the sheet
  // script (AGENTS.md 7a, Pierre 2026-11-03): it adopts a replay (sync.js replayAdopt) and the admin shows replayed
  // values (admin.js progOf) only when the script's replies say v >= RV_SHEET; otherwise both do what they did before.
  const RV_SHEET = 28;
  // The messages a device that last applied version `from` shows once it applied version `to`: one per version that
  // has one, oldest first; the same message (RV_CARD) once, at the last version that has it, so a device that skips
  // several versions sees one recalculation card with its progress before and after the whole jump.
  const rvMsgs = (from, to) =>
    RVS.filter(x => x.v > (from || 0) && x.v <= to && x.msg).filter((x, i, L) => !L.slice(i + 1).some(y => y.msg === x.msg));

  // Full replay (Pierre, 2026-11-03: "why recalculate on the phones when the phone doesn't have the full log? Recalculate
  // from all the results"): every player's progress rebuilt from the sheet's answer log, in time order, with today's rules
  // (the weights above, pgStep, the photo memory, the ability step), as if every answer had been played under them. The
  // reference recalculation, done by the sync sheet itself (Code.gs replay_, in the reply to a sign-in, load or save
  // when the player's stored replay is older than RV or covers fewer rows than the log has) and adopted by the app
  // (sync.js replayAdopt). The device's own recalculations (memRecalc from s.ps, pgOf from the last 10 results s.h) only
  // approximate it from what a device keeps: they remain the fallback for a device that never reaches the sheet.
  // docs/LEARNING.md "Full replay".
  // rows: the answer log (sheet readAnswers rows, Code.gs rowsOf_, or the app's own log through logRow: [id, time ms,
  // genus shown, answered, right 0|1, mode, photos, expected e, ability th, new photos, choices, ...]). o: gen (data.json
  // genera, Millepora and the bonus genera included: look-alikes `look`, family `fam`), mem (photo memory offsets,
  // ?stats=1 mem; the prior without), conf (the pooled pairs, ?stats=1 conf, as the app's PCONF), since ({id: time ms}:
  // only the answers after a progress reset), memory (false: the rule before the photo memory, tools/memreplay.js),
  // start ({id: player}: a replay to go on from, as returned here, e.g. the sheet's, with this device's answers not in
  // the sheet yet on top; copied, never changed), onAnswer(row, {d, fam, cf, k, w, look}).
  // Returns {id: {P: {genus: {pg, ok, ko, h, ps, off, conf, u, th, lt, vr, streak, at, du, lx, lm}, '~level': {ok, ko, th, vr, at}},
  // n, used, rep}}: per genus the moving average pg (what the app keeps as s.pg), right / wrong answers, the last 10
  // results, the photos [shown, right], the choices offered beside it and the genera given instead (the app's s.off,
  // s.conf), u = answers that moved pg, the ability th and its volatility vr (eloStep, as quiz.js answer steps them: on
  // the genus shown only, never on the genus wrongly given),
  // the run of right answers (streak), the last answer (at), a look-alike duel won (du), the last miss on it, shown or
  // given (lx, a time: it ends an exam in course), the last one that took the progress below the learned mark's keep
  // rule (lm, a time: mxKeeps); the global level LEVEL as the
  // app keeps it (seeded at the first answer by levelSeed, then one step per answer); per player the rows read (n),
  // replayed (used: with e and th) and on a photo already shown (rep).
  // Each question's difficulty d (photo difficulty, + 0.5 for a photo shown alone) is recovered from what the app logged
  // then: e = 1/k + (1 - 1/k) sig(th - d), th the player's ability on the genus at that moment. A typed answer (|t,
  // 2026-11-03; kOf) has no guess rate (k infinite: e = sig(th - d)), counts in full when right (pgRightW) and was
  // logged with no choices, as quiz.js answer scores it. Since the photo memory
  // (MEM_LOGGED) the logged e includes the memory of the photos (fam), taken out again here with the replay's own fam;
  // since the known mix-ups (CF_LOGGED) it includes the app's mix-ups term too (cf, model.js confTerm), taken out the
  // same way, and the replay adds its own to every answer, older ones included (today's rule).
  // Approximations, explicit: the ability th and the photos are those the app logged (the game would have drawn others
  // under other rules; the weights use the logged th, the replayed th is the app's step over the recovered
  // difficulties); a comeback question's recall is taken as 1 (its e logged with it reads as a harder photo); the
  // look-alike test and the mix-ups term are the app's (declared look-alikes or confusions over CONF.TRAP, pooled and the
  // player's own; confGap) with a prior from the look-alikes and the family only (the app also gives CONF.FORM to genera
  // sharing an IMR growth form, which the sheet does not know: on such a pair the pooled score starts from 0.03 instead
  // of 0.08, so the replayed term is larger while the pair's pooled offers are few, the same once they are many);
  // a miss on the genus wrongly given weighs the chance the player had on it with its ability as replayed (the app's own
  // at that moment is not logged; the same when the replay goes on from the app's record, sync.js); every photo of a
  // right answer counts as recognised (the app does not count a corallites photo answered
  // without opening it, which the log leaves out anyway). Answers logged without e and th (before sheet v5) count in
  // ok/ko/h only, and move no ability. The mastery exam is not replayed: replayedOf takes it from the saved copy.
  const MEM_LOGGED = Date.UTC(2026, 10, 3, 4, 46); // PR #387 merged: the app's logged e includes the photo memory
  // From the known mix-ups (PR #425, live 2026-11-03 15:35 UTC: 23:35 Asia/Taipei, the instant of tools/abilityeval.js
  // CF_FROM, which reads the sheet's wall clock; #426): the app's logged e includes its mix-ups term (model.js confTerm),
  // taken out again here with the replay's own. An app not yet updated logs a few answers without it after that time.
  const CF_LOGGED = Date.UTC(2026, 10, 3, 15, 35);
  function replayProgress(rows, o = {}) {
    const gen = o.gen || {},
      mem = memOf(o.mem),
      conf = o.conf || {},
      since = o.since || {},
      memory = o.memory !== false,
      out = o.start ? JSON.parse(JSON.stringify(o.start)) : {};
    const prior = (t, n) => {
      const a = gen[t] || {},
        b = gen[n] || {};
      return (a.look || []).includes(n) || (b.look || []).includes(t) ? CONF.LOOK : a.fam && a.fam === b.fam ? CONF.FAM : CONF.BASE;
    };
    const pooledOf = (t, n) => confScore(conf[t < n ? t + '|' + n : n + '|' + t], prior(t, n));
    // Known mix-ups (model.js confTerm, #425): the most, over the choices, of the player's own score of the pair above
    // the pooled one (confGap), on the record before this answer, on a question with 3 or more plausible choices; it adds
    // to the question's difficulty for the ability, the level and a miss's weight, as quiz.js answer adds it to dm.
    const confTermOf = (P, t, chs, k) =>
      k >= 3 ? Math.max(0, ...chs.filter(n => n !== t && gen[n]).map(n => confGap(pairConf(P, t, n), pooledOf(t, n)))) : 0;
    // model.js pgWeight: a genus among the choices that the player gets confused with (pooled, then their own record).
    const lookOf = (P, t, n) => {
      if (n === t || !gen[n]) return false;
      const pooled = pooledOf(t, n);
      return pooled >= CONF.TRAP || confScore(pairConf(P, t, n), pooled) >= CONF.TRAP;
    };
    const split = x =>
      String(x || '')
        .split(/\s+/)
        .filter(Boolean);
    rows
      .filter(r => r && r[0] && r[2])
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const id = r[0];
        if (since[id] && !(r[1] > since[id])) return;
        const pl = (out[id] = out[id] || {P: {}, n: 0, used: 0, rep: 0}),
          rec = g => {
            const x = (pl.P[g] = pl.P[g] || {pg: 0, ok: 0, ko: 0, h: '', ps: {}, u: 0});
            if (!x.ps) x.ps = {};
            if (typeof x.pg !== 'number') x.pg = 0;
            x.h = x.h || '';
            x.u = x.u || 0;
            return x;
          },
          t = String(r[2]),
          c = String(r[3] || ''),
          ok = !!r[4],
          mode = String(r[5] || ''),
          fs = split(r[6]),
          e = r[7],
          th = r[8],
          chs = split(r[10]),
          k = kOf(mode, r[10]),
          s = rec(t),
          hs = fs.map(f => s.ps[f]),
          wrong = !ok && c && c !== t && gen[c];
        pl.n++;
        if (hs.some(h => h && h[0])) pl.rep++;
        // The mix-ups term, on the record before this answer (quiz.js answer scores it before the offers).
        const cf = confTermOf(pl.P, t, chs, k);
        // The choices offered and the genus given instead, before the weight (as quiz.js answer counts them).
        chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
        s[ok ? 'ok' : 'ko']++;
        s.streak = ok ? (s.streak || 0) + 1 : 0;
        if (!ok && c) (s.conf = s.conf || {})[c] = (s.conf[c] || 0) + 1;
        const replayable = typeof e === 'number' && typeof th === 'number' && fs.length && k > 1;
        let dm = 0,
          d0 = 0;
        if (replayable) {
          pl.used++;
          const fam = memFam(hs, mem),
            q = Math.min(0.995, Math.max(0.005, (e - 1 / k) / (1 - 1 / k))),
            dl = th - Math.log(q / (1 - q)), // the difficulty in the logged expectation
            // d: the photo's difficulty alone (quiz.js d0), without the memory and the mix-ups term the app logged in e.
            d = dl - (r[1] >= MEM_LOGGED ? fam : 0) - (r[1] >= CF_LOGGED ? cf : 0),
            fm = memory ? fam : 0,
            look = chs.some(x => lookOf(pl.P, t, x)),
            // The aim at the player's level before this answer's own step on it, as quiz.js answer weighs the miss.
            w = ok ? pgRightW(k, look) * pgMemW(th, d, fm, k) : pgMissW(th, d + fm + cf, k, 1, aimOf((pl.P[LEVEL] || {}).th));
          dm = d + fm + cf;
          d0 = d;
          s.pg = pgStep(s.pg, ok, w);
          s.u++;
          if (o.onAnswer) o.onAnswer(r, {d, fam: fm, cf, k, w, look});
          // The ability, as quiz.js answer steps it: the genus shown against the question's difficulty with the memory.
          eloStep(pl.P, t, s, ok, dm, k);
        }
        // The global level (quiz.js answer): made at the first answer from the player's history, then one step each.
        if (pl.P[LEVEL]) pl.P[LEVEL][ok ? 'ok' : 'ko']++;
        else pl.P[LEVEL] = levelSeed(pl.P);
        if (replayable) eloStep(pl.P, LEVEL, pl.P[LEVEL], ok, dm, k);
        pl.P[LEVEL].at = r[1];
        s.at = r[1];
        // The learned mark (not replayed: replayedOf takes it from the saved copy) is lost, in the game, at a miss that
        // leaves the progress below the keep rule (quiz.js answer, mxKept), on the genus shown as on the genus given: lm,
        // the time of the last such miss, takes away a mark passed before it.
        if (!ok) s.lx = r[1];
        if (!ok && !mxKeeps(s.pg)) s.lm = r[1];
        if (ok && (/^quiz-duel/.test(mode) || /\|d(\||$)/.test(mode))) s.du = 1;
        // Pierre's rule: a wrong answer counts against the genus given too, as quiz.js answer does it after the global
        // level: its progress by the chance the player had on it (its own ability, as replayed so far, against the
        // photo's difficulty without the photo memory: the memory is of the genus shown), a miss in its recent results,
        // its run reset. Not its ability (2026-11-03, docs/LEARNING.md "The genus wrongly given in the Elo"): the Elo
        // moves on the questions about the genus itself, as quiz.js answer does since then.
        if (wrong) {
          const x = rec(c);
          if (replayable) {
            x.pg = pgStep(x.pg, false, pgMissW(abilityOf(pl.P, c), d0, k, 1, aimOf(pl.P[LEVEL].th)));
            x.u++;
          }
          x.h = (x.h + '0').slice(-10);
          x.streak = 0;
          x.lx = r[1];
          if (!mxKeeps(x.pg)) x.lm = r[1];
        }
        s.h = (s.h + (ok ? 1 : 0)).slice(-10);
        fs.forEach(f => {
          const x = (s.ps[f] = s.ps[f] || [0, 0]);
          x[0]++;
          if (ok) x[1]++;
        });
      });
    return out;
  }
  // An answer of the app's own log (quiz.js answer: {id, t, g, a, ok, m, ph, e, th, nw, ch}) as a replay row for player
  // id: this device's answers the sheet has not confirmed yet, replayed on top of the sheet's replay (sync.js).
  const logRow = (a, id) => [
    id,
    Date.parse(a.t) || 0,
    String(a.g || ''),
    String(a.a || ''),
    a.ok ? 1 : 0,
    String(a.m || ''),
    String(a.ph || ''),
    typeof a.e === 'number' ? a.e : null,
    typeof a.th === 'number' ? a.th : null,
    typeof a.nw === 'number' ? a.nw : null,
    String(a.ch || '')
  ];
  // A player's progress as the app holds it after the replay (rep: replayProgress's player; saved: the player's
  // imr-coral-progress, the device's copy in the app, the sheet's copy in the admin). What comes from where:
  // - from the replay, for every genus the log has replayable answers on: pg, ok, ko, h, off, conf, th, lt, vr, streak,
  //   at (the later of the two), du (either), the photos seen ps per photo the larger [shown, right] of the two (the
  //   device also counts as shown a corallites hint revealed after the answer, which the log leaves out: a replay must
  //   not make it new again for the exam, model.js examSet), pm 1 (the record is under the photo memory rule: memRecalc must never
  //   correct it again), and rv when given (the rules version it was replayed with: mergeProgress then keeps it over
  //   an older copy of the same answers);
  // - from the saved copy, what the log cannot give: the mastery exam passed (mx) or in course (ex), dropped when passed
  //   under the former model (a record without s.pg, before 2026-11-02: that genus takes the exam again; memRecalc, commit
  //   of 2026-11-03), and the mark dropped too when the log has a miss after the exam that the game takes it away at
  //   (r.lm later than s.mx, the time it was passed; 1 before 2026-11-02, so any such miss): misses logged but never in
  //   the saved copy (a save refused, Codex review #399: 10 misses, pg 0.19, still learned) count as the game counts
  //   them, and a recalculation alone (no such miss after the exam) keeps the mark; likewise the exam in course ends at
  //   any miss on the genus, shown or given, later than its start (r.lx after s.ex.ts; an exam saved before it had its
  //   start time: after the genus's last answer, s.at), as quiz.js answer ends it (Codex review #399: a miss logged over
  //   a saved exam of 4 questions passed kept its 4); the days answered right (dd, dl: the device's calendar days, for the comeback after a break); the
  //   last observations shown (ro: the log keeps photo files, not observations); right with the corallites in view
  //   (cor: the log does not say which view a photo was shown in);
  // - the saved record as it is (the same mx rule) for a genus the log has no replayable answer on, or fewer answers on
  //   than the saved copy (answers that never reached the log: a replay must never lose progress);
  // - LEVEL: the replayed ability (th, vr), the larger answer count of the two (answersSoFar keys the exam's gaps, the
  //   cards met and the prompts, so it never goes back), the later at, rv when given.
  // The opening hold is not here: the sheet already replays it from the same log (Code.gs hold_, reply's hold).
  // The replay does not decide the exam: a genus learned keeps it here even if its replayed bar is lower, unless a miss
  // after the exam takes it away, as the game does (mxKeeps, lm).
  const REPLAYED = ['pg', 'ok', 'ko', 'h', 'ps', 'off', 'conf', 'th', 'lt', 'vr', 'streak'];
  function replayedOf(rep, saved, rv) {
    const S = isObj(saved) ? saved : {},
      R = (rep && rep.P) || {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x)),
      kept = s => {
        const o = dup(s);
        if (typeof o.pg !== 'number') {
          delete o.mx;
          delete o.ex;
        }
        return o;
      };
    new Set([...Object.keys(S), ...Object.keys(R)]).forEach(g => {
      const s = isObj(S[g]) ? S[g] : null,
        r = isObj(R[g]) ? R[g] : null;
      if (g === LEVEL) {
        const o = s ? dup(s) : {};
        if (r) {
          if (typeof r.th === 'number') o.th = r.th;
          if (typeof r.vr === 'number') o.vr = r.vr;
          if (!s || n(r) >= n(s)) [o.ok, o.ko] = [r.ok || 0, r.ko || 0];
          if (r.at) o.at = Math.max(r.at, Number(o.at) || 0);
          if (rv) o.rv = rv;
        }
        out[g] = o;
        return;
      }
      if (!r || !r.u || (s && n(s) > n(r))) {
        if (s) out[g] = kept(s);
        else if (r) out[g] = {pg: r.pg || 0, ok: r.ok || 0, ko: r.ko || 0, h: r.h || '', ...(rv ? {rv} : {})};
        return;
      }
      const o = {};
      REPLAYED.forEach(f => r[f] !== undefined && (o[f] = dup(r[f])));
      if (s && isObj(s.ps) && Object.keys(s.ps).length) {
        o.ps = o.ps || {};
        Object.keys(s.ps).forEach(f => {
          const x = o.ps[f] || [0, 0],
            y = Array.isArray(s.ps[f]) ? s.ps[f] : [];
          o.ps[f] = [0, 1].map(i => Math.max(Number(x[i]) || 0, Number(y[i]) || 0));
        });
      }
      const at = Math.max(Number(r.at) || 0, Number(s && s.at) || 0);
      if (at) o.at = at;
      if (r.du || (s && s.du)) o.du = 1;
      o.pm = 1;
      if (rv) o.rv = rv;
      if (s) {
        ['dd', 'dl', 'ro', 'cor'].forEach(f => s[f] !== undefined && (o[f] = dup(s[f])));
        if (typeof s.pg === 'number' && s.mx) {
          if (!(r.lm > s.mx)) o.mx = s.mx;
        } else if (typeof s.pg === 'number' && s.ex && !(r.lx > (s.ex.ts || s.at || 0))) o.ex = dup(s.ex);
      }
      out[g] = o;
    });
    return out;
  }
  // The merge baseline once a replay is adopted (sync.js replayAdopt, mergeProgress's B): the history every device of the
  // account shares, never mixed with this device's own answers not in the sheet yet, which stay the difference P - B and
  // so go on top in the next three-way merge (Codex review #399, three cases: two devices adopting the same log counted it
  // twice, an older app's answers were dropped, an unsent answer was taken into the baseline and lost). rec: the sheet's
  // replay (replay.rec), M: the record adopted (replayedOf), rv: its rules version, B: the baseline before (the shared
  // saved copy). Per genus:
  // - adopted from the replay (M[g].rv is rv): the replayed record as the app holds it without this device's copy
  //   (replayedOf of rec alone), its photos shown per photo the larger of the replay's and B's (exposure the log leaves
  //   out, a corallites hint revealed after the answer, that a device already synced: shared too);
  // - kept from this device's copy (the log has fewer answers on it): B's record, as before;
  // - the global level: the replay's, with B's answer count when larger (replayedOf keeps the larger count).
  function replayBase(rec, M, rv, B) {
    const R = replayedOf({P: rec}, {}, rv),
      B0 = isObj(B) ? B : {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x));
    Object.keys(M || {}).forEach(g => {
      const b = isObj(B0[g]) ? B0[g] : null,
        r = R[g];
      if (g === LEVEL) {
        if (!r) return b && (out[g] = dup(b));
        const o = dup(r);
        if (b && n(b) > n(r)) [o.ok, o.ko] = [b.ok || 0, b.ko || 0];
        out[g] = o;
      } else if (r && M[g] && M[g].rv === rv) {
        const o = dup(r);
        Object.keys((b && b.ps) || {}).forEach(f => {
          const x = (o.ps = o.ps || {})[f] || [0, 0],
            y = b.ps[f];
          if (Array.isArray(y)) o.ps[f] = [Math.max(x[0], Number(y[0]) || 0), Math.max(x[1], Number(y[1]) || 0)];
        });
        out[g] = o;
      } else if (b) out[g] = dup(b);
    });
    return out;
  }
  const learnedOf = (P, list) => list.filter(n => (P || {})[n] && P[n].mx).length;

  // The one-tap question's bank (Pierre, 2026-11-03: "ask slightly different questions about roughly the same
  // concept", so the players say as they go whether the difficulty suits their level; quiz.js pulseAsk, admin Errors).
  // Each item is answered in one tap; each answer sits on one or two common scales: d, felt difficulty (−1 too easy,
  // 0 right, +1 too hard) and f, how the play feels (−1 bad, 0 neutral, +1 good); null = says nothing on that scale.
  // A "no" to a one-sided item (frustrating? boring?) is 0 on both: not too hard, not too easy; asked as often as each
  // other, the two one-sided items shrink a mean towards 0 without tilting it. Codes easy / ok / hard keep their v19
  // meaning on the difficulty scale (the sheet's Detail keeps only those three); an item's other codes ride as they
  // come (Message column) and its id in the Where column: no new sheet version (v19 stores both as text).
  // Sources (docs/LEARNING.md "What the players say about the difficulty"): are, the app's question since v19 (the
  // Too Easy / Appropriate / Too Difficult rating of Papoušek, Stanislav & Pelánek 2016); zone, flow's three channels
  // (boredom, flow, anxiety: Csikszentmihalyi 1975), the balance the flow short scale's item 16 asks as demands too
  // little / just right / too high (Rheinberg, Vollmeyer & Engeser 2003); more, the same balance asked as a wish; fun,
  // frus, bored, the in-game GEQ's positive affect, tension and negative affect items (IJsselsteijn, de Kort & Poels 2013).
  // Besides the answers, every prompt logs its showing (PULSE_SHOWN) and, when it ends without an answer, a "Not now"
  // (PULSE_SKIP) or moving on without a tap (PULSE_NONE): the admin's response rates.
  const PULSE_SHOWN = 'shown',
    PULSE_SKIP = 'skip',
    PULSE_NONE = 'none';
  const PULSEQ = [
    {
      id: 'are',
      q: 'These questions are',
      a: [
        ['easy', 'Too easy', -1, null],
        ['ok', 'About right', 0, null],
        ['hard', 'Too hard', 1, null]
      ]
    },
    // The challenge-skill balance as the flow channels, said as states (Pierre, 2026-11-03: "the challenge is too low /
    // too high" left non-native speakers unsure whether low meant easy or hard).
    {
      id: 'zone',
      q: 'Right now I feel',
      a: [
        ['easy', 'Bored', -1, null],
        ['ok', 'In the zone', 0, null],
        ['hard', 'Struggling', 1, null]
      ]
    },
    {
      id: 'more',
      q: 'Want harder photos?',
      a: [
        ['easy', 'Yes', -1, null],
        ['ok', 'Keep it', 0, null],
        ['hard', 'Easier', 1, null]
      ]
    },
    {
      id: 'fun',
      q: 'Having fun?',
      a: [
        ['lo', 'Not really', null, -1],
        ['mid', "It's OK", null, 0],
        ['hi', 'Yes!', null, 1]
      ]
    },
    {
      id: 'frus',
      q: 'Frustrating?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', 0.5, -0.5],
        ['yes', 'Very', 1, -1]
      ]
    },
    {
      id: 'bored',
      q: 'Getting boring?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', -0.5, -0.5],
        ['yes', 'Yes', -1, -1]
      ]
    }
  ];
  // The first item ever asked, and the item of every answer logged before the bank (no item id: sheet rows until
  // 2026-11-03).
  const PULSE0 = 'are';
  const pulseItem = id => PULSEQ.find(x => x.id === (id || PULSE0)) || null;
  // An answer on the common scales: {d, f}, null where it says nothing (an unknown item or code: both null).
  function pulseScore(id, code) {
    const it = pulseItem(id),
      a = it && it.a.find(x => x[0] === code);
    return a ? {d: a[2], f: a[3]} : {d: null, f: null};
  }
  // Which item to ask next. Rounds: every item once in a shuffled order, then a new round, never starting with the item
  // just asked, so a player never meets the same wording twice in a row and meets each one as often. st is what the
  // device stored at the last ask ({q: item asked, left: the round's items still to ask}; before the bank, {at} alone,
  // which means PULSE0 was asked); rnd a random number generator in [0, 1). Returns {q, left}, to store.
  function pulsePick(st, rnd = Math.random) {
    const ids = PULSEQ.map(x => x.id),
      last = (st && st.q) || (st && typeof st.at === 'number' ? PULSE0 : ''),
      shuffle = L => {
        const o = L.slice();
        for (let i = o.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [o[i], o[j]] = [o[j], o[i]];
        }
        return o;
      };
    let left = (st && Array.isArray(st.left) ? st.left : []).filter((x, i, L) => ids.includes(x) && x !== last && L.indexOf(x) === i);
    if (!left.length) {
      if (!last) return {q: PULSE0, left: shuffle(ids.filter(x => x !== PULSE0))};
      left = shuffle(ids);
      if (left[0] === last) left.push(left.shift());
    }
    return {q: left[0], left: left.slice(1)};
  }

  // Quantile q (0-1) of a list sorted in ascending order, linear between neighbours (the usual "type 7": the median of
  // 1, 2, 3, 4 is 2.5, its first quartile 1.75). null for an empty list. Admin Photo stats.
  function quantile(a, q) {
    if (!a.length) return null;
    const i = (a.length - 1) * Math.min(1, Math.max(0, q)),
      k = Math.floor(i);
    return a[k] + (a[Math.min(k + 1, a.length - 1)] - a[k]) * (i - k);
  }
  // How a list of numbers spreads (admin Photo stats › Overview, Pierre 2026-11-03: "a median and a spread, not a box
  // plot"): count, sum, mean, min, max, the median and the middle half (p25 to p75). The list is not changed.
  function distOf(L) {
    const a = L.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y),
      sum = a.reduce((t, x) => t + x, 0);
    return {
      n: a.length,
      sum,
      mean: a.length ? sum / a.length : null,
      min: a.length ? a[0] : null,
      p25: quantile(a, 0.25),
      med: quantile(a, 0.5),
      p75: quantile(a, 0.75),
      max: a.length ? a[a.length - 1] : null
    };
  }

  const CORE = {
    quantile,
    distOf,
    BENTHIC,
    BONUS,
    slateOf,
    gameOf,
    lectureGroup,
    starRefs,
    starWaits,
    PHOTO_BASE,
    photoLocal,
    photoToSite,
    photoRetry,
    PHOTO_RETRY,
    TYPE,
    TYPED_RE,
    typeDist,
    typeNorm,
    typeNamesOf,
    typeMatchIn,
    typedShare,
    PROG,
    mxKeeps,
    pgStep,
    pgOf,
    scoreOf,
    pctOf,
    TARGET_P,
    AIM,
    aimOf,
    pgRightW,
    pgMissW,
    pgMemW,
    kOf,
    MEM_LOGGED,
    CF_LOGGED,
    replayProgress,
    replayedOf,
    replayBase,
    logRow,
    ELO,
    abilityOf,
    levelMove,
    eloStep,
    RV_CARD,
    RVS,
    RV,
    RV_SHEET,
    rvMsgs,
    learnedOf,
    ACH,
    newAch,
    ACH_LEARN,
    achRevoke,
    mergeAch,
    LEVEL,
    SORRY,
    firstName,
    sorryFelt,
    sorryOf,
    sorryDue,
    sorryHi,
    sorryText,
    START,
    playerStart,
    levelSeed,
    accountOf,
    commonFactor,
    applyCuration,
    applySlots,
    CAP,
    isObj,
    eq,
    canon,
    merge3,
    mergeTabs,
    takeTab,
    mergeOld,
    mergeProgress,
    eloOf,
    levelMargin,
    playSplit,
    trustOf,
    guessOf,
    TRUST,
    PHOTO_W,
    PLAYER0,
    MEM,
    memBucket,
    memFam,
    memOf,
    photoMemOf,
    memRecalc,
    confusionOf,
    CONF,
    confScore,
    confGap,
    dataLook,
    pairConf,
    mergeUsers,
    PULSEQ,
    PULSE0,
    PULSE_SHOWN,
    PULSE_SKIP,
    PULSE_NONE,
    pulseItem,
    pulseScore,
    pulsePick
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else Object.assign(root, CORE);
})(this);
// END core.js
return module.exports; })();

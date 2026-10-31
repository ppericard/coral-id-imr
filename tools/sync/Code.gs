// IMR Coral ID: progress sync for the RAs, stored in this Google Sheet.
// Setup: Extensions > Apps Script, paste this file, Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Put the /exec URL in SYNC_URL in app.js.
// Each RA picks a name and a 4-digit code in the app; the code only stops accidental overwrites.

const SALT = 'imr-coral-id';
const HEAD = ['Name', 'Updated', 'Learned', 'Seen', 'Total', 'Review first', 'Code hash', 'Data'];
const COLORS = {ok: '#dcefd9', mid: '#e3f1f3', weak: '#f7dcd6', new: '#f2f2f2'};
const LABELS = {ok: 'Learned', mid: 'Learning', weak: 'Review', new: ''};

function sheet_(name, head){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (head) { sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); if (head === HEAD) sh.hideColumns(7, 2); } }
  return sh;
}
function hash_(name, pin){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + '|' + name.toLowerCase() + '|' + pin));
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function find_(sh, name){
  const names = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0]).toLowerCase());
  const i = names.indexOf(name.toLowerCase());
  return i > 0 ? i + 1 : 0;
}
function clean_(p){ return {name: String(p.name || '').trim().slice(0, 40), pin: String(p.pin || '').trim()}; }

// GET ?name=…&pin=… → the saved progress for that RA, if the code matches.
function doGet(e){
  const {name, pin} = clean_(e.parameter);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const sh = sheet_('RAs', HEAD), r = find_(sh, name);
  if (!r) return json_({ok: true, found: false});
  const row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  if (row[6] !== hash_(name, pin)) return json_({ok: false, error: 'pin'});
  return json_({ok: true, found: true, updated: row[1], data: JSON.parse(row[7] || '{}')});
}

// POST {name, pin, data, summary: {learned, seen, total, review: [], genera: {Genus: 'ok'|'mid'|'weak'|'new'}}}
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
    return json_({ok: true});
  } finally { lock.releaseLock(); }
}

#!/usr/bin/env node
// Reads the images players attach to their reports (docs/spec/sync.md "Report images"; Pierre, 2026-11-21, Q446). The
// sheet script keeps each in its "Report images" tab: one row a report, Id, Time, Player (anonymous id), Type, Bytes,
// then the JPEG as base64 in chunks of at most 45,000 characters, one chunk a cell. This tool works on the rows as the
// Google Sheets connector's get_values returns them (a file holding the array of rows, or {"values": [...]}), read-only:
// it never reaches the sheet.
//
//   node tools/report_image.js list   rows.json              the images held: id, time, player, bytes
//   node tools/report_image.js decode rows.json <id> out.jpg the JPEG of one report, checked (its size, its JPEG header)
//   node tools/report_image.js clear  rows.json <id>         the A1 ranges to clear once the report is handled
//
// Clearing is the integrator's, with the connector's batch_clear_values on the range `clear` prints (the report's row in
// the Report images tab; the Reports tab's Image cell keeps the id, as the record that the report had a picture). Never
// clear another row.
'use strict';
const fs = require('fs');

const TAB = 'Report images',
  FIRST_CHUNK = 5, // column F: the chunks follow Id, Time, Player, Type, Bytes
  HEAD = 'Id';

// The rows of a connector reply or a bare array, the header row kept (row numbers are the sheet's).
function rowsOf(json) {
  const v = Array.isArray(json) ? json : json && Array.isArray(json.values) ? json.values : null;
  if (!v) throw new Error('rows.json holds no array of rows (get_values of the "Report images" tab)');
  return v;
}
// An id as the sheet may hand it back: a number when it is all digits (1e5 would be one too: such an id is never made,
// ids are base 36 of the time and random letters).
const idOf = x => String(x == null ? '' : x).trim();

// One entry per image row: {id, row (1-based, as in the sheet), time, player, type, bytes, b64}.
function images(rows) {
  const out = [];
  rows.forEach((r, i) => {
    if (!r || !idOf(r[0]) || (i === 0 && idOf(r[0]) === HEAD)) return;
    out.push({
      id: idOf(r[0]),
      row: i + 1,
      time: String(r[1] == null ? '' : r[1]),
      player: String(r[2] == null ? '' : r[2]),
      type: String(r[3] == null ? '' : r[3]),
      bytes: Number(r[4]) || 0,
      b64: r.slice(FIRST_CHUNK).map(c => String(c == null ? '' : c)).join('')
    });
  });
  return out;
}
// The JPEG of a report: its bytes, or an Error saying what is wrong (never a half image).
function decode(rows, id) {
  const e = images(rows).find(x => x.id === idOf(id));
  if (!e) throw new Error(`no image for the report ${id}`);
  const b = Buffer.from(e.b64, 'base64');
  if (!b.length) throw new Error(`the image of ${id} is empty`);
  if (e.bytes && b.length !== e.bytes) throw new Error(`the image of ${id} is ${b.length} bytes, the sheet says ${e.bytes}: a chunk is missing`);
  if (!(b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)) throw new Error(`the image of ${id} is not a JPEG`);
  return b;
}
// The range to clear: the row of the image (A to its last chunk column), in A1 notation.
function clearRanges(rows, id) {
  const e = images(rows).find(x => x.id === idOf(id));
  if (!e) throw new Error(`no image for the report ${id}`);
  const n = Math.max(rows[e.row - 1].length, FIRST_CHUNK + 1),
    col = k => {
      let s = '';
      for (k++; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
      return s;
    };
  return [`'${TAB}'!A${e.row}:${col(n - 1)}${e.row}`];
}

if (require.main === module) {
  const [cmd, file, id, out] = process.argv.slice(2);
  try {
    const rows = rowsOf(JSON.parse(fs.readFileSync(file, 'utf8')));
    if (cmd === 'list') images(rows).forEach(x => console.log([x.id, x.time, x.player, x.bytes].join('\t')));
    else if (cmd === 'decode' && id && out) {
      const b = decode(rows, id);
      fs.writeFileSync(out, b);
      console.log(`${out}: ${b.length} bytes`);
    } else if (cmd === 'clear' && id) console.log(clearRanges(rows, id).join('\n'));
    else throw new Error('usage: report_image.js list|decode|clear rows.json [id] [out.jpg]');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
module.exports = {rowsOf, images, decode, clearRanges};

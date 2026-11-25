// REE-193's refit (tools/studies/q316/refit/README.md): the Answers tab, as the Sheets connector saved it, with each
// player's name replaced by an anonymous key at once (rule D2). Read-only on the sheet: it reads the connector's saved
// replies, writes one log in the tab form prep.js reads, and can delete the raw replies it read.
//
//   node tools/studies/q316/refit/pseudonymise.js <out log.json> <reply1.txt> [reply2.txt...] [--delete-input]
//
// Each reply is the connector's {range, values} JSON, in the tab's row order; the first one starts with the header row
// (Name ... Scoring, prep.js HEAD). Column A (Name) becomes K1, K2... by first appearance; a name that starts with
// "~anon " or "~deleted " keeps that prefix (prep.js reads it). The keys are case-sensitive, as prep.js's players are.
// No mapping is written and no name is printed: the counts, the subjects and the first and last answer times only.
// --delete-input: each reply file is removed once the log is written. The out file must be outside the repository.
const fs = require('fs'),
  path = require('path');
const {HEAD, inRepo, timeOf} = require('../prep.js');

function pseudonymise(replies) {
  const V = [];
  replies.forEach((R, i) => {
    const vals = Array.isArray(R) ? R : R && Array.isArray(R.values) ? R.values : null;
    if (!vals) throw new Error(`reply ${i + 1} is not a {values} reply`);
    if (i === 0) {
      const head = (vals[0] || []).map(x => String(x).trim()),
        bad = HEAD.findIndex((h, j) => head[j] !== h);
      if (bad >= 0) throw new Error(`the first reply does not start with the Answers tab's header (column ${bad + 1})`);
      V.push(head.slice(0, HEAD.length));
      vals.slice(1).forEach(r => V.push(r));
    } else vals.forEach(r => V.push(r));
  });
  const key = new Map();
  const keyOf = w => {
    const pre = w.startsWith('~anon ') ? '~anon ' : w.startsWith('~deleted ') ? '~deleted ' : '';
    if (!key.has(w)) key.set(w, pre + 'K' + (key.size + 1));
    return key.get(w);
  };
  const out = V.map((r, i) => {
    if (i === 0) return r;
    const w = String((r && r[0]) || '').trim();
    return [w ? keyOf(w) : '', ...r.slice(1, HEAD.length)];
  });
  return {values: out, players: key.size};
}

function summary(L) {
  const rows = L.values.slice(1).filter(r => r[0]),
    times = rows.map(r => timeOf(r[1])).filter(isFinite),
    subj = rows.reduce((m, r) => ((m[r[17] || 'coral'] = (m[r[17] || 'coral'] || 0) + 1), m), {}),
    iso = t => new Date(t + 8 * 36e5).toISOString().slice(0, 16).replace('T', ' ');
  return {
    rows: rows.length,
    players: L.players,
    subjects: subj,
    first: times.length ? iso(Math.min(...times)) + ' Manila' : null,
    last: times.length ? iso(Math.max(...times)) + ' Manila' : null
  };
}

module.exports = {pseudonymise, summary};

if (require.main === module) {
  const argv = process.argv.slice(2),
    del = argv.includes('--delete-input'),
    pos = argv.filter(a => !a.startsWith('--'));
  const [OUT, ...IN] = pos;
  if (!OUT || !IN.length) {
    console.error('usage: node tools/studies/q316/refit/pseudonymise.js <out log.json> <reply.txt>... [--delete-input]');
    process.exit(2);
  }
  if (inRepo(OUT)) {
    console.error('pseudonymise.js: the log holds per-player rows: write it outside the repository (rule D2).');
    process.exit(2);
  }
  let L;
  try {
    L = pseudonymise(IN.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
  } catch (e) {
    console.error('pseudonymise.js: ' + e.message);
    process.exit(1);
  }
  fs.writeFileSync(OUT, JSON.stringify({values: L.values}));
  if (del) IN.forEach(f => fs.unlinkSync(f));
  console.log(JSON.stringify({...summary(L), out: path.basename(OUT), inputDeleted: del}));
}

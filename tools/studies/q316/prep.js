// Q316's offline fit, step 1 (tools/studies/q316/README.md): reads the answer log, keeps one subject's answers, puts a
// label on each player (P1, P2... by answer count, never a name) and writes the rows the fit (fit.py) and the side checks
// (checks.js) read. Read-only: it reads files, writes only its output (outside the repository) and sends nothing.
//
//   node tools/studies/q316/prep.js <log.json> <coral|fish> <export.json> [--exclude names.txt] [--map labels.json]
//
// log.json, either form (the study, section 3):
//   - a saved readAnswers reply ({ok, rows, excluded, ...}: the admin's anonymous ids; its excluded list is applied,
//     analysis.js leftOut);
//   - the Answers tab as the Sheets connector returns it ({values: [[header], [row]...]} or the bare list of rows), the
//     header row first, every column from Name to Scoring at least in the tab's order (Code.gs LOG): any other header
//     stops the run. Real names may be in it: they are replaced by the labels at load and never printed or written,
//     except into --map (outside the repository), so the integrator can put them back for Pierre (rule D2). The tab's
//     times are read as Manila time (the sheet's clock, +08:00).
// --exclude: the players the admin left out of the statistics, one name per line (the Answers tab form only; the
//   readAnswers form carries its own list).
// Each answer gets: its player's label and half (A or B: the players in order of answers, A B B A A B B A..., the
//   replay's split), the unit, rank, and the family, genus and species of what was shown (fish: the photos' species
//   through fish-game.json and fish-photos.json, its family and genus in fish.json; corals: the genus shown, its family
//   from tools/taxonomy.json), its photos with their judged ease (fish, fish-game.json e, as analysis.js photoMetaFish),
//   the guess rate (core.js guessOf), the engine's own terms as one offset (off: the photo memory and the mix-ups term
//   from its scoring record, else the memory prior by the player's history with the photo, core.js MEM; minus the format
//   offset logged, else the latest one logged for that format; plus core.js DOM.SINGLE for one photo alone), the player's
//   earlier answers in the subject and on the unit, trusted (core.js trustOf on the subject's rows, as the sheet's pass),
//   use (trusted, with photos and a known taxon: the fit's rows), and what the replay of checks.js needs.
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const C = require(path.join(ROOT, 'core.js')),
  A = require(path.join(ROOT, 'analysis.js'));

// The Answers tab's columns from Name to Scoring (Code.gs LOG), the least a tab export must have, in this order.
const HEAD = [
  'Name',
  'Time',
  'Genus shown',
  'Answered',
  'Right',
  'Mode',
  'Photos',
  'Id',
  'Expected',
  'Ability',
  'New photos',
  'Choices',
  'Seconds',
  'Enlarged',
  'UTC offset',
  'Typed',
  'Retyped right',
  'Subject',
  'Rank',
  'Taxon shown',
  'Taxon answered',
  'Species shown',
  'Scoring'
];
const split = x =>
  String(x == null ? '' : x)
    .split(/\s+/)
    .filter(Boolean);
const numOrNull = x => (x === '' || x == null || !isFinite(Number(x)) ? null : Number(x));

// The tab's time: "YYYY-MM-DD HH:MM[:SS]" (or with a T) in Manila time, a date serial (an unformatted read), or ms.
function timeOf(x) {
  if (typeof x === 'number') return x > 1e11 ? x : Math.round((x - 25569) * 864e5 - 8 * 36e5);
  const s = String(x || '').trim(),
    m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) return Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}+08:00`);
  const t = Date.parse(s);
  return isFinite(t) ? t : NaN;
}

// A tab row as readAnswers serves it (Code.gs answerOut_): [player, time ms, shown, answered, right, mode, photos,
// expected, ability, new photos, choices, anonymous, seconds, enlarged, UTC offset, typed, retyped right, subject, rank,
// taxon shown, taxon answered, species shown, scoring record].
function fromTab(r) {
  const w = String(r[0] || ''),
    sj = String(r[17] || '') || C.SUBJECTS[0].id,
    S = C.SUBJECTS.find(x => x.id === sj) || {};
  return [
    w,
    timeOf(r[1]),
    String(r[2] == null ? '' : r[2]),
    String(r[3] == null ? '' : r[3]),
    Number(r[4]) ? 1 : 0,
    String(r[5] || ''),
    String(r[6] || ''),
    numOrNull(r[8]),
    numOrNull(r[9]),
    numOrNull(r[10]),
    String(r[11] || ''),
    w.indexOf('~anon ') === 0 ? 1 : w.indexOf('~deleted ') === 0 ? 2 : 0,
    numOrNull(r[12]),
    numOrNull(r[13]),
    numOrNull(r[14]),
    String(r[15] || ''),
    numOrNull(r[16]),
    sj,
    String(r[18] || '') || S.rank || '',
    String(r[19] || ''),
    String(r[20] || ''),
    String(r[21] || ''),
    C.scoreRec(r[22])
  ];
}

// The log, either form, as readAnswers rows of every subject, the left-out players already out. Throws on a header
// that is not the Answers tab's.
function load(raw, excludeNames = []) {
  if (raw && Array.isArray(raw.rows) && !raw.values) {
    const rows = raw.rows.map(r => (r && r[22] && typeof r[22] !== 'object' ? [...r.slice(0, 22), C.scoreRec(r[22])] : r));
    return {form: 'readAnswers', rows: A.leftOut(rows, raw.excluded), left: (raw.excluded || []).length};
  }
  const V = Array.isArray(raw) ? raw : raw && Array.isArray(raw.values) ? raw.values : null;
  if (!V || !V.length) throw new Error('not an answer log: neither a readAnswers reply nor the Answers tab with its header');
  const head = V[0].map(x => String(x).trim()),
    bad = HEAD.findIndex((h, i) => head[i] !== h);
  if (bad >= 0) throw new Error(`the header is not the Answers tab's: column ${bad + 1} is "${head[bad] || ''}", expected "${HEAD[bad]}"`);
  const out = new Set(excludeNames.map(s => s.trim().toLowerCase()).filter(Boolean));
  const rows = V.slice(1)
    .filter(r => r && String(r[0] || '').trim() && !out.has(String(r[0]).trim().toLowerCase()))
    .map(fromTab);
  const bt = rows.filter(r => !isFinite(r[1])).length;
  if (bt > rows.length * 0.01) throw new Error(`${bt} of ${rows.length} times could not be read`);
  return {form: 'tab', rows: rows.filter(r => isFinite(r[1])), left: out.size, badTime: bt};
}

// The fish taxonomy: photo file -> species id (fish-game.json, fish-photos.json), species id -> family and genus
// (fish.json families and genera; a species in no genus record takes its scientific name's first word), species name
// -> id (for a photo found in neither file: the Species shown column).
function fishTax(root = ROOT) {
  const rd = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  const F = rd('fish.json'),
    game = rd('fish-game.json'),
    first = rd('fish-photos.json');
  const sp = {},
    byName = {},
    fam = {},
    gen = {};
  (F.species || []).forEach(s => ((sp[s.id] = s), (byName[s.name] = s.id)));
  (F.families || []).forEach(f => (f.species || []).forEach(id => (fam[id] = fam[id] || f.id)));
  (F.genera || []).forEach(g => (g.species || []).forEach(id => (gen[id] = gen[id] || g.id)));
  const photo = {},
    ease = {};
  [first, game].forEach(file =>
    Object.values(file.photos || {}).forEach(L => (Array.isArray(L) ? L : []).forEach(p => p && p.f && p.sp && (photo[p.f] = p.sp)))
  );
  Object.entries(A.photoMetaFish(game)).forEach(([f, m]) => (ease[f] = m[0]));
  const of = id => (sp[id] ? {S: id, F: fam[id] || null, G: gen[id] || 'g~' + String(sp[id].name).split(' ')[0]} : null);
  return {photo, ease, byName, of};
}

// The coral taxonomy: genus -> family (tools/taxonomy.json coral.gen, the app's family app.fam).
function coralTax(root = ROOT) {
  const T = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'taxonomy.json'), 'utf8'));
  const fam = {};
  Object.entries((T.coral && T.coral.gen) || {}).forEach(([g, x]) => (fam[g] = (x && x.app && x.app.fam) || null));
  return fam;
}

const MID = 3; // model.js PDIFF.MID: a judged fish photo's prior is (3 - ease) x the subject's calibration ease

// The export: rows of one subject with labels, taxa and offsets (see the head of this file).
function prepare(all, subject, opts = {}) {
  const rows = C.subjRows(all, subject)
    .map((r, i) => ({r, i}))
    .sort((a, b) => a.r[1] - b.r[1] || a.i - b.i)
    .map(x => x.r);
  const trust = C.trustOf(rows);
  // labels: P1 the player with the most answers in the subject; ties by the first answer
  const cnt = new Map();
  rows.forEach(r => cnt.set(r[0], (cnt.get(r[0]) || 0) + 1));
  const order = [...cnt.keys()].sort((a, b) => cnt.get(b) - cnt.get(a)),
    label = new Map(order.map((w, i) => [w, 'P' + (i + 1)])),
    half = new Map(order.map((w, i) => [w, i % 4 === 0 || i % 4 === 3 ? 'A' : 'B']));
  const fish = subject !== 'coral',
    FT = fish ? (opts.fishTax || fishTax)() : null,
    CF = fish ? null : (opts.coralTax || coralTax)(),
    ezK = C.calibOf(C.SUBJECTS.find(S => S.id === subject)).ease;
  // the latest format offset logged per format, for the rows logged before the scoring record had one
  const FMT = {};
  rows.forEach(r => r[22] && (FMT[C.fmtOf(r[5], split(r[10]).length)] = r[22].o || 0));
  const seenS = {},
    seenU = {},
    H = {},
    drop = {photos: 0, taxon: 0, untrusted: 0};
  let noSc = 0;
  const out = rows.map(r => {
    const w = r[0],
      u = r[2],
      ph = split(r[6]),
      chs = split(r[10]),
      sc = r[22] || null,
      g = C.guessOf(r[5], r[10]),
      k = C.kOf(r[5], r[10]),
      hs = ph.map(f => (H[w + '|' + f] = H[w + '|' + f] || [0, 0]));
    let tax = null;
    if (fish) {
      const ids = ph.map(f => FT.photo[f]).filter(Boolean),
        id = ids[0] || FT.byName[r[21]] || (String(u).startsWith('s:') ? u.slice(2) : null);
      tax = id ? FT.of(id) : null;
    } else tax = {F: CF[u] || null, G: u, S: null};
    const mem = sc ? sc.f || 0 : C.memFam(hs, C.MEM.PRIOR),
      cf = sc ? sc.c || 0 : 0,
      df = sc ? sc.o || 0 : FMT[C.fmtOf(r[5], chs.length)] || 0,
      solo = ph.length === 1 ? C.DOM.SINGLE : 0;
    if (!sc) noSc++;
    const row = {
      p: label.get(w),
      half: half.get(w),
      t: r[1],
      u,
      rk: String(r[18] || (fish ? '' : 'genus')),
      F: tax ? tax.F : null,
      G: tax ? tax.G : null,
      S: tax ? tax.S : null,
      ph,
      ez: ph.map(f => (fish && FT.ease[f] ? MID - FT.ease[f] : 0)),
      ezK,
      g,
      k: isFinite(k) ? k : null,
      y: r[4] ? 1 : 0,
      c: r[3],
      chs,
      mode: r[5],
      fmt: C.fmtOf(r[5], chs.length),
      off: mem + cf - df + solo,
      mem,
      cf,
      df,
      solo,
      R: sc && typeof sc.r === 'number' ? sc.r : 1,
      Sl: sc && sc.s ? sc.s : 1,
      d0: sc ? sc.d : null,
      z: sc && sc.z ? sc.z : null, // a smaller fault's kind (core.js PART): the replay weighs the miss by it
      e: r[7],
      th: r[8],
      sec: r[12],
      sc: !!sc,
      np: seenS[w] || 0,
      nu: seenU[w + '|' + u] || 0,
      tr: !!trust[w],
      // a photo's earlier trusted answers, the replay's primary measure (photos with fewer than 3)
      pn: null
    };
    row.use = row.tr && ph.length > 0 && !!tax && !!row.G;
    if (!ph.length) drop.photos++;
    else if (!tax || !row.G) drop.taxon++;
    else if (!row.tr) drop.untrusted++;
    seenS[w] = row.np + 1;
    seenU[w + '|' + u] = row.nu + 1;
    hs.forEach(h => ((h[0] += 1), (h[1] += row.y)));
    return row;
  });
  // each answer's photos: the most earlier trusted answers any of them has (every player's), so pn < 3 means every
  // photo of the question had fewer than 3
  const pn = {};
  out.forEach(x => {
    x.pn = x.ph.length ? Math.max(...x.ph.map(f => pn[f] || 0)) : 0;
    if (x.tr) x.ph.forEach(f => (pn[f] = (pn[f] || 0) + 1));
  });
  const counts = {
    answers: out.length,
    players: order.length,
    trusted: order.filter(w => trust[w]).length,
    used: out.filter(x => x.use).length,
    noScoring: noSc,
    dropped: drop,
    ranks: out.reduce((m, x) => ((m[x.rk] = (m[x.rk] || 0) + 1), m), {})
  };
  return {subject, rows: out, counts, map: Object.fromEntries(order.map(w => [label.get(w), w]))};
}

// A path inside this repository: a refused output (rule D2: the export holds per-player rows).
const inRepo = p => {
  const root = fs.realpathSync(ROOT),
    abs = path.resolve(p),
    dir = fs.existsSync(path.dirname(abs)) ? fs.realpathSync(path.dirname(abs)) : path.dirname(abs),
    full = path.join(dir, path.basename(abs));
  return full === root || full.startsWith(root + path.sep);
};

module.exports = {HEAD, timeOf, fromTab, load, prepare, fishTax, coralTax, inRepo};

if (require.main === module) {
  const argv = process.argv.slice(2),
    opt = n => {
      const i = argv.indexOf('--' + n);
      return i < 0 ? null : argv[i + 1];
    },
    pos = argv.filter((a, i) => !a.startsWith('--') && !['--exclude', '--map'].includes(argv[i - 1]));
  const [IN, SUBJ, OUT] = pos;
  if (!IN || !['coral', 'fish'].includes(SUBJ) || !OUT) {
    console.error('usage: node tools/studies/q316/prep.js <log.json> <coral|fish> <export.json> [--exclude names.txt] [--map labels.json]');
    process.exit(2);
  }
  for (const f of [OUT, opt('map')].filter(Boolean))
    if (inRepo(f)) {
      console.error(`prep.js: ${path.basename(f)} would hold per-player rows or names: write it outside the repository (rule D2).`);
      process.exit(2);
    }
  let L;
  try {
    const ex = opt('exclude') ? fs.readFileSync(opt('exclude'), 'utf8').split('\n') : [];
    L = load(JSON.parse(fs.readFileSync(IN, 'utf8')), ex);
  } catch (e) {
    console.error('prep.js: ' + e.message);
    process.exit(1);
  }
  const X = prepare(L.rows, SUBJ);
  const {map, ...ex} = X;
  fs.writeFileSync(OUT, JSON.stringify({...ex, made: new Date().toISOString(), form: L.form}));
  if (opt('map')) fs.writeFileSync(opt('map'), JSON.stringify(map, null, 1));
  const c = X.counts;
  console.log(
    `${SUBJ}: read ${L.rows.length} answers (${L.form}${L.left ? `, ${L.left} left out of the statistics` : ''}); ` +
      `${c.answers} of the subject, ${c.players} players (${c.trusted} trusted); ${c.used} in the fit ` +
      `(left: ${c.dropped.photos} without photos, ${c.dropped.taxon} without a known taxon, ${c.dropped.untrusted} untrusted); ` +
      `${c.noScoring} without a scoring record; ranks ${JSON.stringify(c.ranks)}`
  );
}

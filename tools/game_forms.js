#!/usr/bin/env node
// Game photos with no growth form, and the guesses that fill them (AGENTS.md rule 4). learn.js photoPair matches photos
// by growth form (the quiz's mix-up montage "Your answer, same view", the Look-alikes montages): a photo with no form
// matches nothing. A player's report (2026-11-04): a plate Turbinaria with no form recorded, answered Echinopora, was shown
// a branching Echinopora. Photos added after the first form pass (mostly approved candidates) had none.
//
//   node tools/game_forms.js               lists the game photos with no growth form: neither Pierre's (curation.json
//                                          "gf") nor a guess (forms.json "gf"). tests/photos.test.js fails while one is left.
//   node tools/game_forms.js --apply FILE  writes the guesses of FILE into forms.json "gf" (and "gunsure" for the unsure
//                                          ones), for game photos with no form of Pierre's; FILE is in the format of the
//                                          judging brief's growth-form pass (judging/AGENTS.md, "scope": "forms"):
//                                          {"photos": {f: {"form": letter, "polyps": true, "unsure": ["form"], "note": "…"}}}.
//
// To fill a new gap: list the photos, look at each one (rule 27d), write FILE by the judging brief (one of the 7 IMR forms
// or "x", the dominant visible one; polyps only for the genera of rule 4, never on a macro photo), then --apply it.
// The guesses show dashed in the admin (Photo review › Growth form) until Pierre confirms or changes them; his
// curation.json "gf" always wins and is only read here (rule 8). forms.json keeps the layout tools/judging_import.py
// writes (dumpForms; tests/gameforms.test.js checks the two agree on the file as it is).
const fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');
const {applyCuration, applySlots, gameOf} = require(path.join(ROOT, 'core.js'));
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

// AGENTS.md rule 4 (as tools/judging_import.py POLYPS): the polyps flag only for the Coral Finder "extended by day" genera.
const POLYPS = new Set(['Alveopora', 'Duncanopsammia', 'Goniopora', 'Heliofungia', 'Plerogyra', 'Tubastraea']);
const VIEWS = ['wide', 'medium', 'macro'];
const letter = v => (v || '').replace(/[pn]/g, '');

// data.json with Pierre's curation and the photos per context applied, as the app and tests/photos.test.js do.
function built(raw = read('data.json'), cur = read('curation.json')) {
  const d = structuredClone(raw),
    o = {picks: read('picks.json'), autoq: read('quality.json').q || {}};
  applyCuration(d, cur);
  applySlots(d, cur, o);
  if (d.x) {
    const x = {gen: d.x.gen, course: {}, cand: d.cand};
    applyCuration(x, cur);
    applySlots(x, cur, o);
  }
  return d;
}
// Every photo a game can show (core.js gameOf: the slate, Millepora and the bonus genera), {f: {f, genus, view}}.
function gamePhotos(d, raw) {
  const out = {};
  gameOf(raw).forEach(n => {
    const g = d.gen[n] || ((d.x || {}).gen || {})[n];
    VIEWS.forEach(v => ((((g || {}).sl || {})[v] || {}).game || []).forEach(p => (out[p.f] = out[p.f] || {f: p.f, genus: n, view: v})));
  });
  return out;
}
// The game photos with no growth form letter: neither Pierre's nor a guess ("p" alone is the polyps flag, not a form).
const formless = (games, cur, forms) =>
  Object.values(games).filter(p => !letter((cur.gf || {})[p.f]) && !letter((forms.gf || {})[p.f]));

// forms.json as tools/judging_import.py writes it: one key per line, Python's json.dumps spacing; the big {photo: value}
// maps (more than 20 string values) one entry per line.
function py(v) {
  if (Array.isArray(v)) return '[' + v.map(py).join(', ') + ']';
  if (v && typeof v === 'object')
    return (
      '{' +
      Object.entries(v)
        .map(([k, x]) => JSON.stringify(k) + ': ' + py(x))
        .join(', ') +
      '}'
    );
  return JSON.stringify(v);
}
const big = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 20 && Object.values(v).every(x => typeof x === 'string');
const ascii = s => s.replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
function dumpForms(F) {
  const line = ([k, v]) =>
    JSON.stringify(k) +
    ':' +
    (big(v)
      ? '{\n' +
        Object.entries(v)
          .map(([a, b]) => ascii(JSON.stringify(a)) + ':' + ascii(JSON.stringify(b)))
          .join(',\n') +
        '\n}'
      : py(v));
  return '{' + Object.entries(F).map(line).join(',\n') + '}\n';
}

// Checks FILE's guesses and returns {errors, gf, gunsure, wrote} (forms.json's two keys after the change).
function apply(J, games, cur, forms) {
  const E = [],
    gf = {...(forms.gf || {})},
    uns = new Set(forms.gunsure || []),
    letters = (forms.forms || []).map(x => x.id).concat('x');
  let wrote = 0;
  Object.entries((J && J.photos) || {}).forEach(([f, x]) => {
    const p = games[f];
    if (!p) return E.push(`${f}: not a game photo (tools/game_forms.js lists them)`);
    if (letter((cur.gf || {})[f])) return E.push(`${f}: Pierre gave its growth form (curation.json gf): leave it`);
    if (!x || typeof x !== 'object') return E.push(`${f}: must be an object`);
    const bad = Object.keys(x).filter(k => !['form', 'polyps', 'unsure', 'note'].includes(k));
    if (bad.length) E.push(`${f}: unknown fields ${bad.join(', ')}`);
    if (!letters.includes(x.form)) E.push(`${f}: form must be ONE of ${letters.join(' ')}, not ${JSON.stringify(x.form)}`);
    if ('polyps' in x && x.polyps !== true) E.push(`${f}: polyps is true or omitted`);
    if (x.polyps && (!POLYPS.has(p.genus) || p.view === 'macro'))
      E.push(`${f}: polyps only for ${[...POLYPS].join(', ')}, never on a macro photo (AGENTS.md rule 4)`);
    const u = x.unsure || [];
    if (!Array.isArray(u) || u.some(k => !['form', 'polyps'].includes(k))) E.push(`${f}: unsure is a list of "form", "polyps"`);
    if (u.length && !x.note) E.push(`${f}: note required when unsure is not empty`);
    if ((x.note || '').length > 140) E.push(`${f}: note longer than 140 characters`);
    gf[f] = x.form + (x.polyps ? 'p' : '');
    (u.length ? uns.add : uns.delete).call(uns, f);
    wrote++;
  });
  // Entries already there keep their place (a small diff); new ones come after them, in FILE's order.
  return {errors: E, gf, gunsure: [...uns].sort(), wrote};
}

function main(argv) {
  const raw = read('data.json'),
    cur = read('curation.json'),
    forms = read('forms.json'),
    games = gamePhotos(built(raw, cur), raw);
  const i = argv.indexOf('--apply');
  if (i < 0) {
    const left = formless(games, cur, forms);
    left.forEach(p => console.log(`${p.genus}\t${p.view}\t${p.f}`));
    console.log(`${left.length} of ${Object.keys(games).length} game photos have no growth form.`);
    return 0;
  }
  const file = argv[i + 1];
  if (!file) return console.error('--apply FILE'), 2;
  const r = apply(JSON.parse(fs.readFileSync(file, 'utf8')), games, cur, forms);
  r.errors.forEach(e => console.error('ERROR:', e));
  if (r.errors.length) return console.error(`${r.errors.length} error(s): forms.json not written.`), 1;
  const F = {...forms, gunsure: r.gunsure, gf: r.gf};
  fs.writeFileSync(path.join(ROOT, 'forms.json'), dumpForms(F));
  console.log(`${r.wrote} growth-form guesses written to forms.json; ${formless(games, cur, F).length} game photos left with no growth form.`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = {built, gamePhotos, formless, dumpForms, apply, POLYPS};

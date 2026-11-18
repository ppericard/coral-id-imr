'use strict';
require('./slot.js').testGuard();
// Journey (admin-journey.js): the Cards list in time order, the untimed ones after; the start rows say "inferred" once
// and "Answered again" for the same answer given again; and the word beside a unit outside the slate is the subject's
// own (the fish genera are the scientific-names step of the game, never "bonus", a coral word). The blocks are cut
// with tests/block.js, which fails by name when a marker moves.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin-journey.js'), 'utf8'),
  cut = (from, to, o = {}) => block(src, from, to, {file: 'admin-journey.js', ...o});
const jOrder = new Function(cut('// jorder: begin', '// jorder: end') + '\nreturn jOrder;')();
const jOffSlate = new Function(cut('// joffslate: begin', '// joffslate: end') + '\nreturn jOffSlate;')();

test('jOrder: timed rows oldest first, untimed rows after in their own order', () => {
  const out = jOrder([
    [400, 'start-nov4'],
    [null, 'one-at-a-time'],
    [100, 'first-nov2'],
    [300, 'fallback'],
    [null, 'not-used'],
    [200, 'declined-nov2']
  ]);
  assert.strictEqual(out, 'first-nov2declined-nov2fallbackstart-nov4one-at-a-timenot-used');
});

test('start rows: inferred said once; the same answer again reads "Answered again"', () => {
  const body = cut('const jStart', '\n};\n');
  assert.ok(/'Answered again'/.test(body), 'the same answer given again');
  assert.ok(!/<b>inferred<\/b>[^`]*`\} · \$\{JSTART\[via\]/.test(body), 'inferred is not followed by JSTART.inferred');
});

test('a fish genus beside a slate of families reads "genus"', () => {
  assert.strictEqual(jOffSlate('g:Abudefduf', new Set(['f:Damselfishes', 'f:Wrasses'])), 'genus');
});
test('a coral bonus genus beside a slate of genera stays "bonus"', () => {
  assert.strictEqual(jOffSlate('Physogyra', new Set(['Acropora', 'Porites'])), 'bonus');
});
test('a family outside the slate of families (another circle) stays "bonus"', () => {
  assert.strictEqual(jOffSlate('f:Batfishes', new Set(['f:Damselfishes'])), 'bonus');
});

// Journey details for every subject (the fish admin at parity with the corals'): the steps of a player's path (jSteps)
// and the Games card by format (jGames), on the real SUBJECTS and made-up rows [id, time, shown, answered, right, mode, photos,
// expected, ability, new photos, choices].
const C = require('../core.js'),
  CORAL = C.SUBJECTS.find(S => !S.sheets),
  TREEU = C.SUBJECTS.find(S => S.sheets);
const {jSteps, jStepWords} = new Function(cut('// jsteps: begin', '// jsteps: end') + '\nreturn {jSteps, jStepWords};')();
const {logConds} = new Function(
  'fmtOf',
  'trustOf',
  'CONF',
  block(fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'), '// answerlog: begin', '// answerlog: end', {file: 'admin.js'}) +
    '\nreturn {logConds};'
)(C.fmtOf, C.trustOf, C.CONF);
const jGames = new Function(cut('// jgames: begin', '// jgames: end') + '\nreturn jGames;')();
let tt = 0;
const jr = (shown, ok = 1, mode = 'quiz', choices = 'a b c d') => ['p1', ++tt, shown, ok ? shown : 'x', ok, mode, 'p', 0.6, 0, 0, choices];

test('jSteps: the first genus question and the first family of each later circle, once each, in answer order', () => {
  const rec = {'f:A': {circle: 1}, 'f:B': {circle: 2}, 'f:C': {circle: 3}, 'f:D': {circle: 2}},
    R = [jr('f:A'), jr('f:B'), jr('f:A'), jr('g:Chromis'), jr('f:D'), jr('f:C'), jr('g:Naso')],
    S = jSteps(R, n => rec[n] || null, TREEU);
  assert.deepStrictEqual(
    S.map(([i, k, w, g]) => [i, k, w, g]),
    [
      [1, 'circle', 2, 'f:B'],
      [3, 'rank', 'genus', 'g:Chromis'],
      [5, 'circle', 3, 'f:C']
    ]
  );
  assert.strictEqual(S[0][4], R[1][1], 'the step keeps its answer time');
  assert.deepStrictEqual(S.map(jStepWords), [
    ['Circle 2', 'Circle 2'],
    ['Genus questions', 'Genus'],
    ['Circle 3', 'Circle 3']
  ]);
});
test("jSteps: the subject's own rank and the first circle are no step; the corals have none", () => {
  assert.deepStrictEqual(
    jSteps([jr('f:A'), jr('f:E')], () => ({circle: 1}), TREEU),
    []
  );
  assert.deepStrictEqual(
    jSteps([jr('Acropora'), jr('Porites')], () => ({look: []}), CORAL),
    []
  );
  assert.strictEqual(jSteps([jr('g:Chromis')], () => null, TREEU).length, 1, 'a unit with no record still counts its rank');
});

test('jGames: the fish formats (Find the X too), the questions on each rank, no Custom quiz or Duel tab row', () => {
  const R = [
      jr('f:A'),
      jr('f:A', 0),
      jr('f:B', 1, 'quiz', 'f:B f:A'), // Again: A or B?
      jr('g:Chromis', 1, 'quiz|t', ''),
      jr('g:Chromis', 0, 'quiz|d|k2'),
      jr('f:A', 1, 'quiz|x'),
      jr('f:B', 0, 'quiz|f', 'f:B f:A f:C f:D')
    ],
    G = jGames(R, TREEU, logConds(R, TREEU));
  assert.deepStrictEqual(G, [
    ['Quiz', 2, 1],
    ['Again: A or B? (after a mix-up)', 1, 1],
    ['Look-alike duel in the quiz', 1, 0],
    ['Typed (recall)', 1, 1],
    ['Find the X', 1, 0],
    ['Mastery exam', 1, 1],
    ['Family questions', 5, 3],
    ['Genus questions', 2, 1]
  ]);
});
test('jGames: the corals keep their rows, the Duel tab shown at 0, no rank rows', () => {
  const R = [jr('Acropora'), jr('Porites', 0), jr('Porites', 1, 'quiz|s'), jr('Acropora', 1, 'quiz|t', '')],
    G = jGames(R, CORAL, logConds(R, CORAL));
  assert.deepStrictEqual(G, [
    ['Quiz', 3, 2],
    ['Typed (recall)', 1, 1],
    ['Custom quiz (genera picked)', 1, 1],
    ['Look-alike duels (tab)', 0, 0]
  ]);
});

// jlocal: the Cards list in the player's own local time: the offset of the answer nearest in time (readAnswers index
// 14, minutes east of UTC), and the time written at
// that offset whatever the admin's own zone. Expected texts come from Intl in the real IANA zone, never typed by hand.
const jlocalSrc = cut('// jlocal: begin', '// jlocal: end');
const {jOffAt, jAtText, jUtcText} = new Function(jlocalSrc + '\nreturn {jOffAt, jAtText, jUtcText};')();
const UTC = s => Date.parse(s + 'Z');
// The offset of zone z at instant t, minutes east of UTC (as the app logs it: -getTimezoneOffset()).
const offOf = (z, t) => {
  const s = new Intl.DateTimeFormat('en-US', {timeZone: z, timeZoneName: 'longOffset'})
      .formatToParts(new Date(t))
      .find(p => p.type === 'timeZoneName').value,
    m = /GMT(?:([+-])(\d\d):(\d\d))?/.exec(s);
  return m[1] ? (m[1] === '-' ? -1 : 1) * (60 * Number(m[2]) + Number(m[3])) : 0;
};
// The text the admin would show in zone z (admin.js dateText 'dmhm': the browser's language, 24 h).
const inZone = (z, t) =>
  new Intl.DateTimeFormat([], {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: z}).format(
    new Date(t)
  );

test('jAtText: the time at the logged offset reads as in the player’s zone, across daylight saving changes', () => {
  const cases = [
    ['Asia/Manila', '2026-11-05T10:40:00'],
    // Paris: summer time from 2026-03-29 01:00 UTC to 2026-10-25 01:00 UTC; both sides of each change.
    ['Europe/Paris', '2026-03-29T00:59:00'],
    ['Europe/Paris', '2026-03-29T01:00:00'],
    ['Europe/Paris', '2026-10-25T00:59:00'],
    ['Europe/Paris', '2026-10-25T01:00:00'],
    // New York: 2026-03-08 07:00 UTC and 2026-11-01 06:00 UTC.
    ['America/New_York', '2026-03-08T06:59:00'],
    ['America/New_York', '2026-03-08T07:00:00'],
    ['America/New_York', '2026-11-01T05:59:00'],
    ['America/New_York', '2026-11-01T06:00:00'],
    // Odd offsets: +5:45, −3:30 (and −2:30 in summer), +14, −12.
    ['Asia/Kathmandu', '2026-06-01T20:20:00'],
    ['America/St_Johns', '2026-01-10T02:10:00'],
    ['America/St_Johns', '2026-07-10T02:10:00'],
    ['Pacific/Kiritimati', '2026-04-01T09:59:00'],
    ['Etc/GMT+12', '2026-04-01T11:59:00'],
    // The day, month and year roll over both ways.
    ['Asia/Manila', '2026-12-31T16:30:00'],
    ['America/New_York', '2027-01-01T03:00:00'],
    ['Pacific/Kiritimati', '2026-02-28T10:00:00'],
    ['Etc/GMT+12', '2026-03-01T06:00:00']
  ];
  for (const [z, s] of cases) {
    const t = UTC(s),
      o = offOf(z, t);
    assert.strictEqual(jAtText(t, o), inZone(z, t), `${z} at ${s} (offset ${o})`);
  }
  assert.strictEqual(offOf('Europe/Paris', UTC('2026-03-29T00:59:00')), 60);
  assert.strictEqual(offOf('Europe/Paris', UTC('2026-03-29T01:00:00')), 120);
  assert.strictEqual(offOf('America/St_Johns', UTC('2026-01-10T02:10:00')), -210);
});

test('jAtText: ±14 h is the limit (Code.gs tz_), and a time or an offset that is not one gives null', () => {
  const t = UTC('2026-05-01T12:00:00');
  assert.strictEqual(jAtText(t, 840), jAtText(t + 840 * 60000, 0));
  assert.strictEqual(jAtText(t, -840), jAtText(t - 840 * 60000, 0));
  for (const o of [841, -841, 1.5, '480', null, undefined, NaN]) assert.strictEqual(jAtText(t, o), null, String(o));
  for (const x of [NaN, undefined, null, Infinity, '1700000000000']) assert.strictEqual(jAtText(x, 480), null, String(x));
});

test('jOffAt: the offset of the answer nearest in time, the earlier of two as near; rows without a valid one skipped', () => {
  const r = (t, tz) => ['p1', t, 'Acropora', 'Acropora', 1, 'quiz', '', null, null, null, '', 0, 4, 0, tz];
  const R = [
    r(1000, 480),
    r(2000, 'x'),
    r(3000, 60),
    r(4000, 1.5),
    r(5000, 900),
    r(6000, null),
    ['p1', 6500],
    null,
    r(NaN, 120),
    r(9000, -300)
  ];
  assert.strictEqual(jOffAt(R, 0), 480);
  assert.strictEqual(jOffAt(R, 1900), 480);
  assert.strictEqual(jOffAt(R, 2000), 480, 'tie between 1000 and 3000: the earlier');
  assert.strictEqual(jOffAt(R, 2001), 60);
  assert.strictEqual(jOffAt(R, 6000), 60, '4000-6500 hold no valid offset');
  assert.strictEqual(jOffAt(R, 6001), -300);
  assert.strictEqual(jOffAt(R, 1e12), -300);
  assert.strictEqual(jOffAt([], 1000), null);
  assert.strictEqual(jOffAt(undefined, 1000), null);
  assert.strictEqual(jOffAt([r(1000, null), r(2000, 841)], 1000), null);
  assert.strictEqual(jOffAt(R, NaN), null);
  assert.strictEqual(jOffAt([r(1000, 0)], 5), 0, 'UTC itself is an offset');
});

test('jOffAt + jAtText: a card between two answers that straddle a daylight saving change takes the nearer one', () => {
  // A Paris player answers at 01:30 (summer time starts at 02:00 local, 01:00 UTC) and again at 04:00 local.
  const r = (s, tz) => ['p1', UTC(s), 'Acropora', 'Acropora', 1, 'quiz', '', null, null, null, '', 0, 4, 0, tz],
    R = [r('2026-03-29T00:30:00', 60), r('2026-03-29T02:00:00', 120)];
  const at = s => jAtText(UTC(s), jOffAt(R, UTC(s)));
  // Nearer the second answer: summer time, right.
  assert.strictEqual(at('2026-03-29T01:20:00'), inZone('Europe/Paris', UTC('2026-03-29T01:20:00')));
  // Nearer the first: still winter time. Right before the change; after it (01:05 UTC), an hour behind: the limit of an
  // offset logged per answer (the device's zone itself is not logged).
  assert.strictEqual(at('2026-03-29T00:50:00'), inZone('Europe/Paris', UTC('2026-03-29T00:50:00')));
  assert.strictEqual(at('2026-03-29T01:05:00'), inZone('Etc/GMT-1', UTC('2026-03-29T01:05:00')));
  assert.notStrictEqual(at('2026-03-29T01:05:00'), inZone('Europe/Paris', UTC('2026-03-29T01:05:00')));
  // Exactly between (01:15 UTC): the earlier answer's offset.
  assert.strictEqual(jOffAt(R, UTC('2026-03-29T01:15:00')), 60);
});

test('jAtText: the admin’s own zone never enters (run under four TZ, one instant in a daylight saving gap)', () => {
  const {spawnSync} = require('child_process');
  // 2026-03-29 02:30 at the shifted instant: a wall time that does not exist in Paris (the gap 02:00-03:00).
  const cases = [
      [UTC('2026-03-29T00:30:00'), 120],
      [UTC('2026-11-01T06:30:00'), -300],
      [UTC('2026-12-31T23:50:00'), 545]
    ],
    code = `const f = new Function(process.env.JLOCAL + '\\nreturn jAtText;')();
      console.log(JSON.stringify(${JSON.stringify(cases)}.map(([t, o]) => f(t, o))));`;
  const outs = ['UTC', 'Europe/Paris', 'America/New_York', 'Asia/Manila'].map(TZ => {
    const p = spawnSync(process.execPath, ['-e', code], {env: {...process.env, TZ, JLOCAL: jlocalSrc}, encoding: 'utf8'});
    assert.strictEqual(p.status, 0, p.stderr);
    return p.stdout.trim();
  });
  assert.deepStrictEqual(
    JSON.parse(outs[0]),
    cases.map(([t, o]) => jAtText(t, o))
  );
  outs.forEach((o, i) => assert.strictEqual(o, outs[0], `TZ #${i}`));
  assert.ok(/02:30/.test(JSON.parse(outs[0])[0]), outs[0]);
});

test('jUtcText: the offset in words', () => {
  assert.deepStrictEqual([480, 60, 0, -300, -210, 345, 840, -720].map(jUtcText), [
    'UTC+8',
    'UTC+1',
    'UTC+0',
    'UTC−5',
    'UTC−3:30',
    'UTC+5:45',
    'UTC+14',
    'UTC−12'
  ]);
});

// The opt-in choices in a player's saved quiz settings (app.js bonusSet, openNo), as the Journey lists them.
const {jOptin} = new Function(cut('// joptin: begin', '// joptin: end') + '\nreturn {jOptin};')();

test('jOptin: the fish opt-in choices of a saved copy: on, declined, never offered', () => {
  const FISH = C.subjectOf('fish'),
    q = {sci: true, sciT: 5000, sciH: true, beyond: false, beyondT: 9000, beyondN: 2, beyondA: 140};
  assert.deepStrictEqual(jOptin(q, FISH), [
    [5000, 'Scientific names', 'on, by hand before it was due'],
    [9000, 'Families beyond the IMR course', 'offer declined 2 times, the last after answer 140']
  ]);
  // on after an offer declined once, off by hand, an offer declined and never answered, nothing saved
  assert.deepStrictEqual(jOptin({sci: true, sciT: 7, sciN: 1, sciA: 30}, FISH), [
    [7, 'Scientific names', 'on (the offer was declined once before)']
  ]);
  assert.deepStrictEqual(jOptin({sci: false, sciT: 7}, FISH), [[7, 'Scientific names', 'off']]);
  assert.deepStrictEqual(jOptin({beyondN: 1, beyondA: 12}, FISH), [
    [null, 'Families beyond the IMR course', 'offer declined once, the last after answer 12']
  ]);
  assert.deepStrictEqual(jOptin({}, FISH), []);
  assert.deepStrictEqual(jOptin(null, FISH), []);
  // the sets of the subject only: the corals' bonus genera, nothing of the fish's
  assert.deepStrictEqual(jOptin(q, CORAL), []);
  assert.deepStrictEqual(jOptin({bon: true, bonT: 1}, CORAL), [[1, 'Bonus genera', 'on']]);
});

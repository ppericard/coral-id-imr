require('./slot.js').testGuard();
// Pierre's curation names photos by id and is never rewritten (rule A1). The lecture's photo references are the IMR instance's
// course layer (tools/instances/imr/course.json): an edition without it has no lecture photo, and every choice that names one
// has nothing to apply to. Every path of core/curation.js (applyCuration, applySlots) must skip an id it does not know, never
// stop on it and never let it stand in a list. The admin lists such choices apart (admin.js missing(), KNOWN) and keeps them.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {applyCuration, applySlots} = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  clone = o => JSON.parse(JSON.stringify(o));
const RAW = read('data.json'),
  CUR = read('curation.json'),
  OPT = {picks: read('picks.json'), autoq: read('quality.json').q || {}};
const LECTURE = new Set([...Object.values(RAW.course).flat(), ...RAW.cmp.filter(r => r.imr === true)].map(p => p.f));
// data.json and curation c, curation applied, the photos per context chosen: what the app does at load.
const run = (data, c) => {
  const d = clone(data);
  applyCuration(d, c);
  applySlots(d, c, OPT);
  return d;
};
// Every id of a curation, wherever it sits.
const named = c => {
  const out = new Set();
  const walk = v => {
    if (typeof v === 'string') out.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object')
      Object.entries(v).forEach(([k, x]) => {
        out.add(k);
        walk(x);
      });
  };
  walk(c);
  return out;
};

test('an id the curation names and no photo has is skipped by every path, whatever the field', () => {
  const ghosts = c => {
    c = clone(c);
    c.genera = c.genera || {};
    ['Acropora', 'Porites', 'Fungia'].forEach((n, i) => {
      const k = (c.genera[n] = c.genera[n] || {});
      ['wide', 'medium', 'macro'].forEach(v => ((k.feat = k.feat || {})[v] = [...((k.feat || {})[v] || []), `zz-feat-${i}-${v}`]));
      k.hide = [...(k.hide || []), `zz-hide-${i}`];
      (k.move = k.move || {})[`zz-move-${i}`] = 'macro';
      (k.add = k.add || {})[`zz-add-${i}`] = 'wide';
      (k.out = k.out || {})[`zz-out-cmp-${i}`] = 'cmp';
      k.out[`zz-out-genus-${i}`] = 'Pavona';
      if (!k.cover) k.cover = `zz-cover-${i}`;
    });
    // A genus data.json does not hold.
    c.genera.Nogenus = {
      cover: 'zz-cover',
      feat: {wide: ['zz-a']},
      hide: ['zz-b'],
      move: {'zz-c': 'wide'},
      add: {'zz-d': 'wide'},
      out: {'zz-e': 'cmp', 'zz-f': 'Acropora'}
    };
    c.single = {...(c.single || {}), 'zz-single': 1};
    c.exclude = {...(c.exclude || {}), 'zz-excluded': 'not a photo'};
    c.use = {...(c.use || {}), 'zz-use': 'game'};
    c.quality = {...(c.quality || {}), 'zz-quality': 3};
    return c;
  };
  const withGhosts = ghosts(CUR);
  assert.notDeepStrictEqual(withGhosts, CUR, 'the ghosts are there');
  const known = new Set(
    [
      ...Object.values(RAW.gen).flatMap(g => [...Object.values(g.views || {}), ...Object.values(g.more || {})].flat()),
      ...LECTURE,
      ...Object.values(RAW.cand || {}).flat()
    ].map(p => p.f || p)
  );
  const ids = [...named(withGhosts)].filter(f => /^zz-/.test(f));
  assert.ok(ids.length > 30 && !ids.some(f => known.has(f)), 'ids no photo has');
  // The same photos in the same lists (what the games and the sheets read) with the ghosts as without them. g.feat, the
  // curation's own copy of its pins, is the one thing that keeps a ghost's name.
  const seen = d => ({
    gen: Object.fromEntries(
      Object.entries(d.gen).map(([n, g]) => [n, {views: g.views, more: g.more, sl: g.sl, coverP: g.coverP, levels: g.levels}])
    ),
    course: d.course,
    cmp: d.cmp,
    cand: d.cand
  });
  assert.strictEqual(JSON.stringify(seen(run(RAW, withGhosts))), JSON.stringify(seen(run(RAW, CUR))));
  // A ghost in a list is dropped, never shown: no ghost id anywhere in the lists a player reads.
  const text = JSON.stringify(seen(run(RAW, withGhosts)));
  assert.ok(!/zz-/.test(text), 'a ghost id stands in a list');
});

test('an edition without the lecture’s photos plays the real curation: its choices naming a lecture photo have nothing to apply to', () => {
  const mine = [...named(CUR)].filter(f => LECTURE.has(f));
  assert.ok(mine.length > 0, 'curation.json names lecture photos');
  // What an edition has with no course layer: no lecture photo, no lecture comparison (tools/instance.py course_compose).
  const bare = clone(RAW);
  bare.course = {};
  bare.cmp = bare.cmp.filter(r => r.imr !== true);
  // The pass of the curation alone (before the photos per context): the field photos keep their lists and order.
  const a = clone(RAW),
    b = clone(bare);
  applyCuration(a, CUR);
  applyCuration(b, CUR);
  Object.keys(a.gen).forEach(n => {
    ['views', 'more'].forEach(s =>
      assert.strictEqual(JSON.stringify(b.gen[n][s]), JSON.stringify(a.gen[n][s]), `${n} ${s}: the field photos are the same`)
    );
  });
  // The whole pass: it runs, and no lecture photo is left in any list.
  const d = run(bare, CUR);
  const left = [];
  const walk = (v, at) => {
    if (Array.isArray(v)) v.forEach(x => walk(x, at));
    else if (v && typeof v === 'object') {
      if (typeof v.f === 'string' && LECTURE.has(v.f)) left.push(`${at}: ${v.f}`);
      Object.entries(v).forEach(([k, x]) => walk(x, `${at}.${k}`));
    }
  };
  walk(d.gen, 'gen');
  walk(d.course, 'course');
  walk(d.cmp, 'cmp');
  assert.deepStrictEqual(left, [], 'no lecture photo anywhere');
  // A cover or a pin naming a lecture photo gives none, and every genus still has its lists.
  Object.entries(d.gen).forEach(([n, g]) => {
    assert.ok(!g.coverP || !LECTURE.has(g.coverP.f), `${n}: no lecture cover`);
    ['wide', 'medium', 'macro'].forEach(v => assert.ok(g.sl[v] && Array.isArray(g.sl[v].game), `${n} ${v}: its lists`));
  });
});

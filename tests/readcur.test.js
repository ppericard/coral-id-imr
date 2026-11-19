require('./slot.js').testGuard();
// The curation as the fish game's build reads it (tools/fish_game.py read_cur; Pierre, 2026-11-19 20:57 and 20:59): what
// the auto-sort proposed and he only let through (its log letters) reads the newer judgement, his own decisions stand, and
// curation.json itself is never written (rule A1). The players' copy reads it the same way (tools/curplay.py), and the
// admin's route back (autosort.js sortBack) brings back the same photos. Made-up data; needs python3.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const A = require('../autosort.js');
const ROOT = path.join(__dirname, '..');
const py = (code, arg) =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'tools'))})\n${code}`, arg], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 1 << 26
    })
  );
const readCur = (cur, cand, sug, by) =>
  py(
    `import fish_game as G
a = json.loads(sys.argv[1])
print(json.dumps(G.read_cur(a['cur'], a['cand'], a['sug'], a['by'])))`,
    JSON.stringify({cur, cand, sug, by})
  );

const old = '2026-11-12',
  rec = (f, st) => ({f, o: 'o-' + f, src: 'x', ...(st ? {st} : {})}),
  cand = {cand: {s1: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'].map(f => rec(f)).concat([rec('fj', 'juvenile')])}},
  by = at => ({s1: {fish: {by: 'claude', at, n: 9}}});

test('read_cur: the fields the auto-sort copied read the newer judgement; his own values stand', () => {
  const cur = {
      fish: {
        add: {f1: 's1', f2: 's1', fj: 's1'},
        tags: {f1: 'p1d1sl1', f2: 'p1g1sl1', fj: 'p1g1sl1j'},
        ease: {f1: 2, f2: 2, fj: 2},
        crop: {f1: [0.1, 0.1, 0.9, 0.9]},
        auto: {[old]: {f1: 'atec', f2: 'a', fj: 'ate'}}
      }
    },
    sug = {
      f1: {jt: 'p1g1sl1', e: 4, k: 'best'},
      f2: {jt: 'p1g0sl1', e: 5, k: 'best'},
      fj: {jt: 'p1g1sl1', e: 4, k: 'best'}
    },
    out = readCur(cur, cand, sug, by('2026-11-19')).fish;
  // f1: the auto-sort's copy of tags, ease and crop: the pass's now (no crop any more: the copy's leaves)
  assert.deepStrictEqual([out.tags.f1, out.ease.f1, 'f1' in out.crop], ['p1g1sl1', 4, false]);
  // f2: an add whose tags and ease were already his (the run wrote none of them): his stand
  assert.deepStrictEqual([out.tags.f2, out.ease.f2], ['p1g1sl1', 2]);
  // fj: a juvenile by its source: the copy keeps the j flag as the auto-sort writes it (autosort.js fishCopy)
  assert.deepStrictEqual([out.tags.fj, out.ease.fj], ['p1g1sl1j', 4]);
  // He moved f1 with Not this and added it to its new species: the first species' judgement no longer reads on it.
  const moved = A.fishAdd(A.fishNotThis(cur.fish, 'f1', 's2', 's1'), 'f1', 's2', null),
    mv = readCur({fish: moved}, cand, {...sug, f1: {jt: 'p1g1slk', e: 4, k: 'best'}}, by('2026-11-19')).fish;
  assert.deepStrictEqual([mv.add.f1, mv.tags.f1, mv.ease.f1, 'f1' in (mv.seen || {})], ['s2', 'p1d1sl1', 2, false]);
  // An edit of his takes the letter off (autosort.js fishOwn): his value stands.
  const mine = {
    fish: {
      ...cur.fish,
      ease: {...cur.fish.ease, f1: 1},
      auto: {[old]: {...cur.fish.auto[old], f1: A.fishOwn(cur.fish, 'f1', 'ease').auto[old].f1}}
    }
  };
  assert.strictEqual(mine.fish.auto[old].f1, 'atc');
  assert.strictEqual(readCur(mine, cand, sug, by('2026-11-19')).fish.ease.f1, 1);
  // Nothing of the auto-sort's to read anew: the curation itself.
  const none = {fish: {add: {f1: 's1'}, ease: {f1: 2}}};
  assert.deepStrictEqual(readCur(none, cand, sug, by('2026-11-19')), none);
});

test('read_cur and the admin route back: a reject of the auto-sort a newer sure judgement saves plays; his never', () => {
  const saved = {jt: 'p1g0sl1', e: 4, k: 'best', c: [0.2, 0.1, 0.8, 0.9]},
    F = {
      seen: {f1: 1, f2: 1, f3: 1, f4: 1, f5: 1, f6: 1, f7: 1, f8: 1},
      tags: {f6: 'p1g0slk'},
      exclude: {f7: 'blurred'},
      auto: {[old]: {f1: 'r', f2: 'r', f3: '?r', f4: '-r', f5: 'r@t5a1kq', f6: 'r', f7: 'r'}}
    },
    sug = {f1: saved, f2: {...saved, jt: 'p1g0slk'}, f3: saved, f4: saved, f5: saved, f6: saved, f7: saved, f8: saved},
    out = readCur({fish: F}, cand, sug, by('2026-11-19')).fish;
  // f1 only: the auto-sort's plain reject, a sure add judged since. f2 still k; f3 a Check, f4 undone, f5 corrected by
  // him; f6 his tags; f7 his exclusion; f8 his own reject (no log).
  assert.deepStrictEqual(Object.keys(out.seen).sort(), ['f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']);
  assert.deepStrictEqual(readCur({fish: F}, cand, sug, by('2026-11-10')), {fish: F}, 'judged before the reject: nothing');
  // The admin's route back brings back the same photo, in his draft.
  const R = A.fishRun({s1: cand.cand.s1}, sug, {}, F, '2026-11-20', true, () => '2026-11-19');
  assert.deepStrictEqual(Object.keys(R.F.auto['2026-11-20']), ['f1']);
  assert.ok(!('f1' in R.F.seen));
});

test('read_cur: an add of the auto-sort a newer sure judgement sets aside leaves play; his own add stays', () => {
  const k = {jt: 'p1g0slk', e: 4, k: 'best'},
    T = {f1: 'p1g0sl1', f3: 'p1g0sl1', f4: 'p1g0sl1', f5: 'p1g0sl1'},
    F0 = {add: {f1: 's1', f2: 's1', f3: 's1', f4: 's1', f5: 's1'}, tags: T, auto: {[old]: {f1: 'at', f3: 'at@t5a1kq', f4: 'at', f5: 'at'}}},
    // f4: his Keep in play (Count: other species, no risk): the tags become his (autosort.js fishOwn), the add stays the run's
    F = {...A.fishOwn(F0, 'f4', 'tags'), tags: {...T, f4: 'p1g0slo'}},
    sug = {f1: k, f2: k, f3: {jt: 'p1g0sl1', e: 4, k: 'dup'}, f4: k, f5: {...k, u: ['code'], n: 'doubtful'}},
    out = readCur({fish: F}, cand, sug, by('2026-11-19')).fish;
  assert.strictEqual(F.auto[old].f4, 'a');
  // f1 only: f2 his own add, f3 corrected by him, f4 his Keep in play, f5 an unsure judgement (it waits for him)
  assert.deepStrictEqual(out.seen, {f1: 1});
  assert.deepStrictEqual(out.add, F.add, 'the add itself is never taken off: set aside, as his Reject would');
  assert.deepStrictEqual([out.tags.f1, out.tags.f4, out.tags.f5], ['p1g0slk', 'p1g0slo', 'p1g0sl1']);
});

test('read_cur: no field read anew from a judgement that is not sure, nor on a photo he answered Keep mine', () => {
  const F = {
      add: {f1: 's1', f2: 's1', f3: 's1'},
      tags: {f1: 'p1g0sl1', f2: 'p1g0sl1', f3: 'p1g0sl1'},
      ease: {f1: 2, f2: 2, f3: 2},
      kept: {f3: 'q308'},
      auto: {[old]: {f1: 'ate', f2: 'ate', f3: 'ate'}}
    },
    sug = {
      f1: {jt: 'p1g0slm', e: 4, k: 'best'}, // other species not sorted yet (m): not sure
      f2: {jt: 'p1g1sl1', e: 4, k: 'best', u: ['code'], n: 'light?'},
      f3: {jt: 'p1g1sl1', e: 4, k: 'best'}
    };
  assert.deepStrictEqual(readCur({fish: F}, cand, sug, by('2026-11-19')), {fish: F});
});

test('read_cur: tags read anew bring the judge crop when the photo has none; his phase choice stops the source juvenile flag', () => {
  const c = [0.2, 0.1, 0.8, 0.9],
    F = {
      add: {f1: 's1', f2: 's1', fj: 's1'},
      tags: {f1: 'p1g0sl1', f2: 'p1g0sl1', fj: 'p1g1sl1'},
      ease: {f1: 2, f2: 2, fj: 2},
      crop: {f2: [0, 0, 1, 1]}, // his Full photo
      phase: {fj: ''}, // his No phase
      auto: {[old]: {f1: 'ate', f2: 'ate', fj: 'ate'}}
    },
    sug = {f1: {jt: 'p1g0sl1', e: 4, k: 'best', c}, f2: {jt: 'p1g0sl1', e: 4, k: 'best', c}, fj: {jt: 'p1g1sl1', e: 3, k: 'best'}},
    out = readCur({fish: F}, cand, sug, by('2026-11-19')).fish;
  assert.deepStrictEqual([out.crop.f1, out.crop.f2], [c, [0, 0, 1, 1]]);
  assert.deepStrictEqual([out.tags.fj, out.ease.fj, out.phase.fj], ['p1g1sl1', 3, '']);
  // the surprise-card trimmer reads a photo brought back as the auto-sort's, as an add of its own (wink_trim)
  assert.deepStrictEqual(
    py(
      `import fish_game as G\nprint(json.dumps([bool(G.AUTO_ADD.match(c)) for c in json.loads(sys.argv[1])]))`,
      '["bte", "a", "-b", "?a", "r"]'
    ),
    [true, true, false, false, false]
  );
});

test("curplay: the players' copy reads the curation as the build does", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'readcur-'));
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('curation.json', {fish: {seen: {f1: 1, f8: 1}, auto: {[old]: {f1: 'r'}}}});
  w('suggest.json', {fish: {f1: {jt: 'p1g0sl1', e: 4, k: 'best'}}, by: by('2026-11-19')});
  w('fish-cand.json', cand);
  execFileSync('python3', [path.join(ROOT, 'tools', 'curplay.py'), dir], {stdio: 'ignore'});
  const P = JSON.parse(fs.readFileSync(path.join(dir, 'curation-play.json'), 'utf8'));
  assert.deepStrictEqual(P.fish.seen, {f8: 1});
  assert.deepStrictEqual(
    JSON.parse(fs.readFileSync(path.join(dir, 'curation.json'), 'utf8')).fish.seen,
    {f1: 1, f8: 1},
    'curation.json unchanged'
  );
  fs.rmSync(dir, {recursive: true, force: true});
});

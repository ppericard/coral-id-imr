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

test('read_cur: a newer sure rejection of an auto add stays a proposal: in play, its copy as it was, Keep mine or not', () => {
  const k = {jt: 'p1g0slk', e: 4, k: 'best'},
    T = {f1: 'p1g0sl1', f2: 'p1g0sl1', f3: 'p1g0sl1'},
    F = {
      add: {f1: 's1', f2: 's1', f3: 's1'},
      tags: T,
      ease: {f1: 4, f2: 4, f3: 4},
      kept: {f3: 'q308'},
      auto: {[old]: {f1: 'ate', f2: 'ate', f3: 'ate'}}
    },
    sug = {f1: k, f2: {jt: 'p1g0sl1', e: 2, k: 'dup'}, f3: k};
  assert.deepStrictEqual(readCur({fish: F}, cand, sug, by('2026-11-19')), {fish: F});
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
  const dir = mkTmp('readcur-');
  const w = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
  w('curation.json', {fish: {seen: {f1: 1, f8: 1}, auto: {[old]: {f1: 'r'}}}});
  w('data/suggest.json', {fish: {f1: {jt: 'p1g0sl1', e: 4, k: 'best'}}, by: by('2026-11-19')});
  w('data/fish-cand.json', cand);
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

// A temporary tree as the repository has it: the tools' and the admin's data live in data/.
function mkTmp(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(d, 'data'));
  return d;
}

// The admin's pages read the auto-sort's proposals as the build does (autosort.js sortReads, sortView; Pierre, 2026-11-19
// 20:57): the same photos and the same fields as tools/fish_game.py read_cur, shown as the pass's value. Every pass value
// below differs from its copy, so what the build changes is exactly what the pages read anew.
const reads = (F, sug) => {
  const built = readCur({fish: F}, cand, sug, by('2026-11-19')).fish,
    asBuilt = {};
  ['tags', 'ease', 'phase', 'crop'].forEach(k =>
    Object.keys({...F[k], ...built[k]}).forEach(f => {
      if (JSON.stringify((F[k] || {})[f]) !== JSON.stringify((built[k] || {})[f])) (asBuilt[f] = asBuilt[f] || []).push(k);
    })
  );
  const pages = {};
  Object.keys(sug).forEach(f => {
    const w = A.sortReads(F, f, sug[f]);
    if (w.length) pages[f] = w.sort();
  });
  Object.keys(asBuilt).forEach(f => asBuilt[f].sort());
  return {asBuilt, pages};
};

test('the pages read the proposals anew as the build does: the same photos, the same fields', () => {
  const c = [0.2, 0.1, 0.8, 0.9],
    copy = 'p1d1sl1',
    pass = {jt: 'p1g1sl1', e: 4, k: 'best', c, ph: 'female'},
    fs9 = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'],
    F = {
      add: Object.fromEntries(fs9.map(f => [f, 's1'])),
      tags: Object.fromEntries(fs9.map(f => [f, copy])),
      ease: Object.fromEntries(fs9.map(f => [f, 2])),
      phase: {f1: 'male'},
      crop: {f1: [0.1, 0.1, 0.9, 0.9]},
      kept: {f5: 'q308'},
      out: {f6: 's2'},
      auto: {
        [old]: {
          f1: 'atepc', // every field the run wrote
          f2: 'ate', // tags and ease (the judge's crop comes with the tags: no crop of his)
          f3: 'a', // his own tags and ease (the run wrote none)
          f4: '?a', // a Check
          f5: 'ate', // Keep mine
          f6: 'ate', // moved with Not this
          f7: '-ate', // undone
          f8: 'ate@t5a1kq', // corrected by him: the fields still read
          f9: 'ate' // a newer sure rejection: a proposal, nothing read anew
        }
      }
    },
    sug = {f1: pass, f2: pass, f3: pass, f4: pass, f5: pass, f6: pass, f7: pass, f8: pass, f9: {...pass, jt: 'p1g1slk'}},
    {asBuilt, pages} = reads(F, sug);
  assert.deepStrictEqual(asBuilt, {
    f1: ['crop', 'ease', 'phase', 'tags'],
    f2: ['crop', 'ease', 'tags'],
    f8: ['crop', 'ease', 'tags']
  });
  assert.deepStrictEqual(pages, asBuilt);
  // His own crop stands beside the tags read anew.
  const his = {...F, crop: {...F.crop, f2: [0, 0, 1, 1]}},
    r = reads(his, sug);
  assert.deepStrictEqual(r.pages.f2, ['ease', 'tags']);
  assert.deepStrictEqual(r.asBuilt, r.pages);
});

test('sortView: the same part with the fields read anew left out; the draft itself never changes (rule A1)', () => {
  const pass = {jt: 'p1g1sl1', e: 4, k: 'best'},
    F = {
      add: {f1: 's1', f2: 's1'},
      tags: {f1: 'p1d1sl1', f2: 'p1d1sl1'},
      ease: {f1: 2, f2: 2},
      auto: {[old]: {f1: 'ate', f2: 'a'}}
    },
    snap = JSON.stringify(F),
    sug = {f1: pass, f2: pass},
    V = A.sortView(F, sug);
  assert.deepStrictEqual([V.tags, V.ease, V.add], [{f2: 'p1d1sl1'}, {f2: 2}, F.add]);
  assert.strictEqual(JSON.stringify(F), snap, 'the draft is untouched');
  assert.strictEqual(A.sortView(F, sug), V, 'one view per draft and pass');
  assert.strictEqual(A.sortView(F, undefined), F, 'no pass loaded: the draft');
  assert.strictEqual(A.sortView({...F, kept: {f1: 'q308'}}, sug).tags.f1, 'p1d1sl1', 'Keep mine: his copy stands');
  const none = {add: {f1: 's1'}, tags: {f1: 'p1d1sl1'}};
  assert.strictEqual(A.sortView(none, sug), none, 'nothing of the auto-sort: the draft itself');
});

test('sortJudge: a phase the newer judgement no longer gives is gone, not the game record old one (review #1313)', () => {
  const g = {e: 3, jt: 'p1d0sl1', ph: 'male'},
    j = {jt: 'p1g0sl1', e: 4, k: 'best'},
    F = {add: {f1: 's1'}, tags: {f1: 'p1d0sl1'}, phase: {f1: 'male'}, auto: {[old]: {f1: 'atep'}}};
  assert.strictEqual('ph' in A.sortJudge(F, 'f1', g, j), false, 'read anew: no phase');
  assert.strictEqual(A.sortJudge(F, 'f1', g, {...j, ph: 'female'}).ph, 'female');
  assert.strictEqual(A.sortJudge({...F, auto: {[old]: {f1: 'ate'}}}, 'f1', g, j).ph, 'male', 'phase not written by the run: kept');
  assert.strictEqual(A.sortJudge(F, 'f1', undefined, j), j);
  assert.strictEqual(A.sortJudge(F, 'f1', g, undefined), g);
});

test('sortView with the candidates: the source juvenile flag stays, as the build copies it (review #1313)', () => {
  const pass = {jt: 'p1g0sl1', e: 4, k: 'best'},
    F = {
      add: {f1: 's1', fj: 's1'},
      tags: {f1: 'p1d0sl1', fj: 'p1d0sl1'},
      ease: {f1: 2, fj: 2},
      auto: {[old]: {f1: 'ate', fj: 'ate'}}
    },
    sug = {f1: pass, fj: pass},
    recs = {f1: rec('f1'), fj: rec('fj', 'juvenile')},
    built = readCur({fish: F}, cand, sug, by('2026-11-19')).fish,
    V = A.sortView(F, sug, recs);
  assert.strictEqual(built.tags.fj, 'p1g0sl1j', 'the build keeps the juvenile flag');
  // What the pages show: the stored tags when left out fall back to the pass's, the juvenile one is the build's copy.
  assert.strictEqual(V.tags.fj, built.tags.fj);
  assert.strictEqual('f1' in V.tags, false, 'no source stage: the pass value shows');
  assert.strictEqual(A.sortView(F, sug, recs), V, 'one view per draft, pass and candidates');
  assert.notStrictEqual(A.sortView(F, sug, {}), V, 'other candidates, other view');
  assert.strictEqual(F.tags.fj, 'p1d0sl1', 'the draft is untouched');
});

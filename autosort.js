// Auto-sort of the candidate photos: the judging pass's sure decisions applied as the admin's clicks would be, so he
// rarely validates candidates by hand. Pure functions, no DOM: loaded by admin.html only, tested in Node
// (tests/autosort.test.js). admin.js applies the plan to the curation draft (autoRun), which Publish sends like any click.
// Rules and thresholds: docs/ARCHITECTURE.md "Auto-sort", judging/BRIEF.md "What happens to a sure judgment".
//
// The log lives in curation.json "auto" {day: {photo: code}} (one map per day decided, so the newest checks count most,
// AUTO.win) and "retest" {photo: {q: [before, again], fm: [before, again]}} (the admin's blind second answers). A code is
// one short string, so the log stays small in the file every player downloads:
//   [flag] kind [view quality form] [#]
//   flag     ? a Check: not applied, shown to the admin blind in Candidates; his answer is compared with it
//            - undone by the admin (Undo on the auto decision): never applied again, his own decision stands
//   kind     a added, r rejected (a "reviewed" mark, as his ✕ Reject), x excluded (as his ×)
//   view     w Colony, m Close-up, c Corallites (the view it was added to)
//   quality  1-3, or . when the quality field was off (left as the dashed first guess)
//   form     the growth form as curation.json gf writes it (B, Mp, x...), or . when the form field was off
//   #        a suggested crop was written with the add
//   @t       when the admin last answered (a Check) or corrected (an applied or undone decision) this photo: Unix seconds
//            in base 36 (autoStamp); the agreement window is in that order (autoCompare)
// Examples: "aw2B" added to Colony, Fair, Branching; "am.Mp#" added to Close-up, quality left to the admin, Massive with
// polyps out, cropped; "r" rejected; "?aw3T" a Check of a sure add; "-r" an undone rejection; "?aw3T@t5a1kq" a Check
// answered at that time.
(function (root) {
  // core.js (a global in admin.html, loaded before this file): the look-alike pair key (contentPairKey).
  const C = typeof module !== 'undefined' && module.exports ? require('./core.js') : root;
  const AUTO = {
    // One sure candidate in `every` is a Check (deterministic per photo, autoCheck).
    every: 20,
    fields: ['keep', 'view', 'quality', 'form'],
    // A field's auto is off while its agreement with the admin, over its last `win` comparisons, is under `min`; it needs
    // `n0` comparisons first (the 95% interval of 10 answers is +-28 points).
    // keep 0.90: a wrong add puts a photo in the games (measured 98.5% on the sure adds swiped by hand, not blind); a
    //   wrong reject loses one candidate among many, and the Checks and Undo bring it back.
    // view 0.85: measured 90% on the same photos; a wrong view is a one-click move, and a question of the wrong zoom.
    // quality 0.73: the blind test of the calibrated pass, enough since the players' answers (Elo) set the photo's
    //   difficulty and quality only sets where it starts (docs/decisions/2026-11-18-decisions-from-comments-3.md).
    // form 0.80: growth form ranks, never filters (rule C4): an error costs less than a wrong view; no measure yet.
    min: {keep: 0.9, view: 0.85, quality: 0.73, form: 0.8},
    n0: 10,
    win: 40,
    // Blind self-rating (test-retest): one photo the admin already rated comes back, blind, once every `retest`
    // candidates he decides in the swiper (rare on purpose).
    retest: 25
  };
  const V1 = {wide: 'w', medium: 'm', macro: 'c'},
    V1R = {w: 'wide', m: 'medium', c: 'macro'};
  // FNV-1a, 32 bits: the same answer for a photo on every device and every load.
  const fnv = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  const autoCheck = f => fnv('check|' + f) % AUTO.every === 0;
  const fL = v => (v || '').replace(/[pn]/g, '');

  // What the judging pass is sure of for one candidate (suggest.json "cand" entry j), or null when it is the admin's:
  // - any field in `u` (unsure): his;
  // - `exclude` (unusable): excluded, as his ×;
  // - another genus or a comparison image: his call (a sure comparison image stays set aside, admin.js aside);
  // - a near-duplicate, several corals or Poor: rejected, as his ✕ Reject (judging/BRIEF.md);
  // - the best photo of its observation in its view, Fair or Good, with a view and a growth form: added to that view
  //   with that quality, form and suggested crop;
  // - another angle (alt): his (an extra angle of a colony already offered is an editorial choice).
  function autoSure(j) {
    if (!j || (j.u && j.u.length)) return null;
    if (j.g === 'exclude') return {keep: 'exclude'};
    if (j.g) return null;
    if (j.k === 'dup' || j.m || j.q === 1) return {keep: 'reject', why: j.k === 'dup' ? 'dup' : j.m ? 'multi' : 'poor'};
    if (j.k === 'best' && V1[j.v] && (j.q === 2 || j.q === 3) && j.fm)
      return {keep: 'add', view: j.v, quality: j.q, form: j.fm, crop: j.c || null};
    return null;
  }

  // The fish candidate pre-sort's sure decision (suggest.json "fish" entry j, tools/judging_fish.py), or null when it is
  // the admin's. Same shape as autoSure, so the fish candidates go the same path (autoRun, the "auto" log, Checks).
  // j.jt is the rubric's visual code (judging/FISH.md: view, whole, light, colour loss, clarity, size, count, flags; the
  // same tags as fish-photos.json jt), j.e the ease 1-5, j.k best / alt / dup within the observation, j.ph an IMR sex or
  // colour phase, j.c a crop. Visual criteria only: the species is the iNaturalist experts' identification.
  // - any field in `u` (unsure): the admin's;
  // - a near-duplicate: rejected;
  // - the subject not obvious (count x), other species one could take for it at the game's rank (count k: rule P3) or
  //   out of the water, a photo of a screen or a video capture (flag a, judging/FISH.md): rejected;
  // - other species in view, not sorted yet (count m): his, never added; other species with no risk of confusion (count
  //   o): added like one fish. The counts it may add are core.js TREE_COUNT.play, as tools/fish_game.py judged_sure.
  // - best or alt with its tags and ease: added (Poor-looking photos too: they stand in for SVS video frames).
  // tools/fetch_fish.py sure_out mirrors the rejects. Flags after the seven tags: j c a w typed by the judge (w: a
  // watermark or text, which only Home skips), p (phase) and r (a reference photo) added by the tool. The sea slugs'
  // rubric (judging/SEASLUG.md) adds the view v (ventral) and the flag f (rhinophores or gills hidden), accepted too.
  const FISH_TAGS = /^[pohtdv][01][gdn][0-3][smb][lms][1smxok][jcawprf]*$/;
  // The doubts that weigh on the photo itself: every unsure field but the fish's box (bb), whose doubt only withholds the
  // photo's tile (tools/fish_game.py unsure, box_of).
  const fishUnsure = j => ((j && j.u) || []).filter(x => x !== 'bb');
  function fishSure(j) {
    if (!j || fishUnsure(j).length) return null;
    // An egg mass (the sea slugs' egg rule, judging/SEASLUG.md: {egg: 1}, never a code): never a candidate, set aside as
    // a near-duplicate is (tools/seaslug_game.py sure never puts one in play). The fish's judgements carry no egg.
    if (j.egg) return {keep: 'reject', why: 'egg'};
    if (j.k === 'dup') return {keep: 'reject', why: 'dup'};
    if (!FISH_TAGS.test(j.jt || '') || !(j.e >= 1 && j.e <= 5)) return null;
    if (j.jt[6] === 'x') return {keep: 'reject', why: 'unclear'};
    if (j.jt[6] === 'k') return {keep: 'reject', why: 'other species'};
    if (j.jt.slice(7).includes('a')) return {keep: 'reject', why: 'out of water'};
    if (!TREE_COUNT.play.includes(j.jt[6])) return null;
    if (j.k === 'best' || j.k === 'alt') return {keep: 'add', tags: j.jt, ease: j.e, phase: j.ph || null, crop: j.c || null};
    return null;
  }

  // ---- Fish curation (curation.json "fish") ----
  // The fish choices live under one key, with the coral key names inside: add {f: species id} (in play for that species),
  // seen {f: 1} (rejected, as ✕ Reject), exclude {f: reason} (×), out {f: species id | 'x'} (the admin's "Not this": the
  // iNaturalist experts got the species wrong; only his click writes it, never an agent or the auto-sort, and such a
  // photo is never proposed again), tags {f: jt}, ease {f: 1-5}, phase {f}, crop {f: [l, t, r, b]} (judging/FISH.md),
  // auto {day: {f: code}} (the fish auto-sort's log). Coral keys are never touched.
  // Fish log codes: [?|-] a|b|r [tepc] [@t]: a proposed in, r set aside, b brought back (its own r taken back into play
  // after a newer sure judgement: sortBack); ? a Check (not applied, shown blind; never a b), - undone (never applied
  // again); after an a or a b, the fields the run wrote (t tags, e ease, p phase, c crop: a value the admin had already
  // given is not written, so not listed, and an Undo leaves it alone); @t when he answered or corrected it.
  const FISHW = {tags: 't', ease: 'e', phase: 'p', crop: 'c'};
  // Observations in play per species: 8 per circle-1 species, 12 for the cheatsheet's 24 most sighted (fish.json cs), at
  // most 20. The auto-sort proposes up to the target; the admin adds beyond it. A species met only on the surprise cards
  // (fishSpecies wink) keeps a few really good photos (docs/ROADMAP.md "Surprise-only species"): its target is
  // FISHT.wink, and the admin's Tree shows that many in play, the rest on demand (fishWinkFold).
  const FISHT = {obs: 8, top: 12, cap: 20, wink: 5};
  // A subject with a target of its own (core.js SUBJECTS admin target: the sea slugs' game cap) has it on every species
  // record the admin reads (fishSpecies tgt).
  const fishTarget = sp => (sp && sp.tgt > 0 ? sp.tgt : sp && sp.wink ? FISHT.wink : sp && sp.cs ? FISHT.top : FISHT.obs);
  function fishParse(code) {
    const m = /^([?-]?)([abr])([tepc]*)(?:@([0-9a-z]+))?$/.exec(code || '');
    if (!m || (m[3] && (m[2] === 'r' || m[1] === '?')) || (m[2] === 'b' && m[1] === '?')) return null;
    const w = Object.keys(FISHW).filter(k => m[3].includes(FISHW[k]));
    return {check: m[1] === '?', undone: m[1] === '-', kind: m[2], ...(w.length ? {w} : {}), ...(m[4] ? {t: parseInt(m[4], 36)} : {})};
  }
  // Every logged fish photo: {f: {day, code, d}} (the latest day wins, as autoIdx).
  function fishIdx(F) {
    const out = {};
    Object.keys((F && F.auto) || {})
      .sort()
      .forEach(day =>
        Object.entries(F.auto[day] || {}).forEach(([f, code]) => {
          const d = fishParse(code);
          if (d) out[f] = {day, code, d};
        })
      );
    return out;
  }
  // The admin's keep on a fish photo: 'reject' (Not this, excluded, rejected: these win over an add), 'add', or null.
  function fishMine(F, f) {
    F = F || {};
    if ((F.out || {})[f] || (F.exclude || {})[f] || (F.seen || {})[f]) return 'reject';
    return (F.add || {})[f] ? 'add' : null;
  }
  // A flag (curation.json flag: To do › Flagged on the site) whose photo has left play in the curation C: removed (hide,
  // or Remove), excluded (×) or sent away (Not this) for the corals; out, excluded or rejected (seen) in a subject's own
  // part (P: that part; the curation C itself for the corals). Such a flag is no task: the admin clears it by itself
  // (Pierre, 2026-11-20). key: the flag's key; fl: the flag (fl.file: the photo's own id when the key is another's).
  function flagGone(C, P, key, fl) {
    C = C || {};
    const f = (fl && fl.file) || key;
    if (P && P !== C)
      // a Not this that names the species it was added under keeps the photo in play (core.js treePhotoOn)
      return [f, key].some(n => !!(P.exclude || {})[n] || !!(P.seen || {})[n] || (!!(P.out || {})[n] && P.out[n] !== (P.add || {})[n]));
    if ((C.exclude || {})[key]) return true;
    return Object.values(C.genera || {}).some(k => (k.hide || []).includes(key) || !!(k.out || {})[key]);
  }
  // Comparisons for the agreement (field keep, as autoCompare): every answered Check, and every later correction of an
  // applied decision (a disagreement; a decision left alone says nothing), oldest answer first.
  function fishCompare(F) {
    const I = fishIdx(F),
      out = [];
    Object.keys(I)
      .sort()
      .forEach(f => {
        const {day, d} = I[f],
          p = fishMine(F, f),
          a = d.kind === 'r' ? 'reject' : 'add';
        if (!p || d.undone) return;
        const ok = a === p,
          t = d.t == null ? null : d.t;
        if (d.check) out.push({f, day, field: 'keep', a, p, ok, how: 'check', t});
        else if (!ok) out.push({f, day, field: 'keep', a, p, ok, how: 'fix', t});
      });
    return out.sort((x, y) => (x.t == null ? -1 : x.t) - (y.t == null ? -1 : y.t));
  }
  // The fish auto-sort's run (pure): from the candidates {species id: [photo]}, the pass's judgments (suggest.json
  // "fish"), the species records ({id: fish.json species}) and the curation's fish part, a new fish part with the sure
  // decisions written as the admin's clicks would write them, and the counts. A photo already decided (added, rejected,
  // excluded, Not this, logged) is never touched; a tag, ease, phase or crop he gave stays his. Adds fill each species up
  // to its target, one observation counting once (an alt joins its observation for free): the easiest first (the first
  // questions need easy photos), then the most reference-like (core.js refScore), then an open licence before CC BY-NC
  // (core.js rightsRank, a tie-break only: docs/rules/photos.md), then a fixed order, whoever took the photo (his own are
  // never forced). The rest wait as candidates. Off (keepOn false): nothing applied, Checks still drawn.
  const {refScore, refLevel, easyRank, rightsRank, treePhotoOn, treePhotoIn, treeGone, treePid, TREE_COUNT, treeOther} =
    typeof module !== 'undefined' && module.exports ? require('./core.js') : root;
  // The one route back (Pierre, 2026-11-19, Q438): a photo the run set aside comes back into play when a newer judgement
  // is a sure add (a crop that saves it, judging/FISH.md "A crop that saves a photo"). Its sure add, or null, when all
  // of these hold:
  // - its log code is the run's own plain reject, exactly 'r': a Check ('?r'), an Undo ('-r'), or a time (@t: he answered
  //   or corrected it) means he touched it, and his own Reject of a photo the run had set aside marks it '-r' (fishReject);
  // - it is still set aside only (seen 1), not added, excluded or moved with Not this, and he gave it no tags nor crop
  //   (the new code is read on the judge's crop: one of his would describe another photo);
  // - its judgement was made on or after the day of the reject (at(f): its pass's date, suggest.json "by" {key: {fish:
  //   {at}}}; with none, never), and is a sure add now (fishSure). A reject is logged only from a sure reject, so a sure
  //   add judged since is a new judgement, never a rule read anew.
  function sortBack(F, x, f, j, at) {
    if (!x || x.code !== 'r' || (F.seen || {})[f] !== 1 || (F.add || {})[f] || (F.exclude || {})[f] || (F.out || {})[f]) return null;
    if ((F.tags || {})[f] != null || (F.crop || {})[f] != null) return null;
    const d = typeof at === 'function' ? at(f) : null;
    if (!d || d < x.day) return null;
    const s = fishSure(j);
    return s && s.keep === 'add' ? s : null;
  }
  // at(f): the date (YYYY-MM-DD) photo f's judgement was made, for the route back (sortBack); without it, no photo comes
  // back. A photo it brings back is no longer set aside: it is added like an add (code b and the fields written) while its
  // species has room, else it waits as a candidate (code b alone), which the game plays as any sure candidate.
  function fishRun(cands, sug, species, F, day, keepOn = true, at = null) {
    F = F || {};
    const I = fishIdx(F),
      busy = f => fishMine(F, f) || I[f],
      plan = [];
    Object.entries(cands || {}).forEach(([sid, L]) =>
      (L || []).forEach(p => {
        if (!p || !p.f) return;
        if (busy(p.f)) {
          const s = sortBack(F, I[p.f], p.f, (sug || {})[p.f], at);
          if (s) plan.push({sid, p, s, check: false, back: true});
          return;
        }
        const s = fishSure((sug || {})[p.f]);
        if (s) plan.push({sid, p, s, check: autoCheck(p.f)});
      })
    );
    const R = {add: 0, back: 0, reject: 0, check: 0, full: 0, off: 0};
    if (!plan.length) return {F, R};
    plan.sort(
      (a, b) =>
        (b.s.keep === 'add') - (a.s.keep === 'add') ||
        (b.s.ease || 0) - (a.s.ease || 0) ||
        refScore(b.s.tags) - refScore(a.s.tags) ||
        rightsRank(a.p) - rightsRank(b.p) ||
        (a.p.f < b.p.f ? -1 : 1)
    );
    const obsOf = {};
    Object.values(cands || {}).forEach(L => (L || []).forEach(p => p && (obsOf[p.f] = p.o || p.f)));
    const room = {};
    // In play as the swiper counts it (treePhotoOn): a photo moved with Not this and added to its new species counts there
    // (fishMine reads its first species, where it is a reject). An add with other species one could take for its subject
    // (core.js treeOther) is out of play, so it holds no room.
    Object.entries(F.add || {}).forEach(([f, sid]) => {
      if (!treePhotoOn(F, f, sid) || treeOther((F.tags || {})[f], ((sug || {})[f] || {}).jt)) return;
      (room[sid] = room[sid] || new Set()).add(obsOf[f] || f);
    });
    const N = {...F, add: {...(F.add || {})}, seen: {...(F.seen || {})}},
      L = {...((F.auto || {})[day] || {})},
      put = (k, f, v) => {
        if (v == null || (F[k] || {})[f] != null) return '';
        N[k] = {...(N[k] || {}), [f]: v};
        return FISHW[k];
      };
    plan.forEach(({sid, p, s, check, back}) => {
      const f = p.f;
      if (check) {
        L[f] = s.keep === 'add' ? '?a' : '?r';
        return R.check++;
      }
      if (!keepOn) return R.off++;
      if (s.keep === 'add') {
        const r = (room[sid] = room[sid] || new Set()),
          o = p.o || f,
          fit = r.has(o) || r.size < Math.min(fishTarget((species || {})[sid]), FISHT.cap);
        if (!fit && !back) return R.full++;
        if (back) {
          delete N.seen[f];
          R.back++;
        } else R.add++;
        if (!fit) return (L[f] = 'b');
        r.add(o);
        N.add[f] = sid;
        const c = fishCopy({...p, f}, {jt: s.tags, ph: s.phase}, F);
        L[f] = (back ? 'b' : 'a') + put('tags', f, c.tags) + put('ease', f, s.ease) + put('phase', f, c.phase) + put('crop', f, s.crop);
      } else {
        N.seen[f] = 1;
        L[f] = 'r';
        R.reject++;
      }
    });
    // A map the run created and left empty goes; one that was there stays (as {}: merge3 reads a missing map as removed).
    if (!F.add && !Object.keys(N.add).length) delete N.add;
    if (!F.seen && !Object.keys(N.seen).length) delete N.seen;
    const n = R.add + R.back + R.reject + R.check;
    if (n) N.auto = {...(F.auto || {}), [day]: L};
    return {F: n ? N : F, R};
  }

  // One fish auto decision taken back (the admin's Undo in the Auto details, as the coral autoUndo; rule A1: every auto
  // decision undoable one by one). sid: the candidate's species (its fish-cand.json list). What the run wrote leaves the
  // fish part, and only that: the add while it still names that species, and the fields its code lists (fishOwn takes
  // off those he set since). Never compared with the pass's judgment, which a new pass may have replaced. The log marks
  // the decision undone ('-'): never applied again, the photo waits as a candidate, or, brought back (b), is set aside
  // again (seen). Emptied maps stay as {} (fishOut leaves them out of the file), so the Publish merge (merge3) removes
  // these entries only.
  function fishUndo(F, f, sid) {
    const x = fishIdx(F)[f];
    if (!x || x.d.check || x.d.undone) return F;
    const N = {...F},
      drop = (k, ok = () => true) => {
        if (!N[k] || !(f in N[k]) || !ok(N[k][f])) return;
        N[k] = {...N[k]};
        delete N[k][f];
      };
    if (x.d.kind === 'r') drop('seen', v => v === 1);
    else {
      drop('add', v => v === sid);
      (x.d.w || []).forEach(k => drop(k));
    }
    // A photo it brought back (b) is set aside again, as its own reject had left it, unless the admin moved it to another
    // species since (Not this): that choice, and an add there, stay his.
    if (x.d.kind === 'b' && !(N.out || {})[f]) N.seen = {...(N.seen || {}), [f]: 1};
    N.auto = {...N.auto, [x.day]: {...N.auto[x.day], [f]: '-' + x.code}};
    return N;
  }
  // A fish field the admin sets on a photo the auto-sort decided (tags, ease, phase or crop) becomes his: its letter
  // leaves the photo's log code, so an Undo never takes his value away. Every admin action writing these fields calls it.
  function fishOwn(F, f, field) {
    const x = fishIdx(F)[f],
      c = FISHW[field];
    if (!x || !c || !(x.d.w || []).includes(field)) return F;
    return {...F, auto: {...F.auto, [x.day]: {...F.auto[x.day], [f]: x.code.replace(new RegExp(`^([?-]?[abr][tepc]*?)${c}`), '$1')}}};
  }
  // When the admin answers a fish Check or corrects a fish auto decision, the time goes into its log code (@t), so the
  // agreement window follows the order he answered in, as autoStamp does for the corals. fishSigs: his keep on each
  // compared photo; fishStamp: the new fish "auto" map with the time t (seconds) on every photo whose keep changed since
  // `before` (fishSigs of the previous draft), or null when nothing changed.
  function fishSigs(F) {
    const S = {};
    fishCompare(F).forEach(c => (S[c.f] = c.p));
    return S;
  }
  function fishStamp(F, before, t) {
    const I = fishIdx(F);
    let A = null;
    Object.entries(fishSigs(F)).forEach(([f, s]) => {
      if ((before || {})[f] === s || !I[f]) return;
      const {day, code} = I[f];
      A = A || {...F.auto};
      A[day] = {...A[day], [f]: withT(code, t)};
    });
    return A;
  }

  // ---- Fish Candidates ----
  // The species' observations in play: {species id: Set of observations}, one observation counting once (a question shows
  // one observation). game: fishGameIn's records, counted beside the adds. sug: the pass's judgments (suggest.json
  // "fish"): an add held out for other species one could take for its subject (core.js treeOther) counts nowhere.
  function fishPlay(cands, F, game, sug) {
    F = F || {};
    const obsOf = {},
      out = {};
    Object.values(cands || {}).forEach(L => (L || []).forEach(p => p && p.f && (obsOf[p.f] = p.o || p.f)));
    Object.entries(F.add || {}).forEach(([f, sid]) => {
      if (treePhotoOn(F, f, sid) && !treeOther((F.tags || {})[f], ((sug || {})[f] || {}).jt))
        (out[sid] = out[sid] || new Set()).add(obsOf[f] || f);
    });
    (game || []).forEach(p => p && p.sp && (out[p.sp] = out[p.sp] || new Set()).add(p.o || p.f));
    return out;
  }
  // The photos the game plays (fish-game.json records, the published state) that are in play in the draft cur
  // (curation.json): the admin's adds and the photos that entered by themselves (auto "cand" and "ref": docs/rules/photos.md)
  // that he has not rejected, excluded or moved (core.js treePhotoIn, as tools/fish_game.py in_play). The admin counts these,
  // not the adds alone; the auto-sort's own target (fishRun) is apart.
  function fishGameIn(game, cur) {
    const F = (cur && cur.fish) || {},
      gone = treeGone(cur || {}, F);
    return (game || []).filter(p => p && p.f && p.sp && treePhotoIn(F, p, gone, (F.tags || {})[p.f])).map(p => ({...p, sid: p.sp}));
  }
  // The pass's tags and phase as Add and the auto-sort copy them beside an add (j: the judgment, or the auto-sort's sure
  // values {jt, ph}), with the source's phase (p.st) when the pass gives none: the j flag for a juvenile, else the phase
  // word, so a juvenile by its source never counts as an adult once added (fishPhase reads the draft's word first). F:
  // the curation before the add: tags the admin already gave the photo are the ones read, never the source's phase.
  function fishCopy(p, j, F) {
    const own = F && p && p.f ? ((F.tags || {})[p.f] ?? null) : null,
      // The admin described the photo already (his tags, or a phase, No phase included): the source's phase never
      // overrides it (as fishPhase reads his values).
      mine = own != null || !!(F && p && p.f && p.f in (F.phase || {}));
    let tags = own != null ? own : j && j.jt,
      phase = (j && j.ph) || null;
    if (mine || FPHW[phase] || !FISH_TAGS.test(tags || '') || tags.slice(7).includes('j')) return {tags, phase};
    const src = fishPhase({f: '', st: (p || {}).st}, null, {});
    if (src === 'juvenile') tags = fishTag(tags, 'j');
    else if (src) phase = src;
    return {tags, phase};
  }
  // The swiper's queue (pure): every candidate not decided in its species now (fishState; one sent elsewhere with Not
  // this waits as that species' candidate, marked from), with its species (sid), observations in play (n), target
  // (fishTarget), phase (ph) and four marks:
  // - chk: a Check waiting for the admin's answer (shown blind; never full nor set aside);
  // - full: its species is at its target and the photo would add an observation: the swiper stops there (docs/ROADMAP.md
  //   "stop at target"), shown on demand;
  // - aside: the pass is sure it goes (fishSure reject) and the auto-sort did not apply it (keep off): shown on demand;
  // - nph: it shows a phase none of its species' photos in play shows.
  // Order: the thinnest species first (in play / target, then the fewest in play), its photos together; within a
  // species the missing phases, then best, alt, not judged, dup, then the easiest, then a reference photo (flag r), then
  // an open licence before CC BY-NC (core.js rightsRank), then a fixed order, whoever took the photo.
  const FISHK = {best: 0, alt: 1, dup: 3};
  function fishQueue(cands, sug, species, F, game) {
    F = F || {};
    sug = sug || {};
    const I = fishIdx(F),
      play = fishPlay(cands, F, game, sug),
      byF = {},
      out = [];
    Object.entries(cands || {}).forEach(([sid, L]) => (L || []).forEach(p => p && p.f && (byF[p.f] = p)));
    // The phases each species' photos in play show (an add held out for other species shows none: treeOther).
    const shows = {};
    Object.entries(F.add || {}).forEach(([f, sid]) => {
      if (!treePhotoOn(F, f, sid) || treeOther((F.tags || {})[f], (sug[f] || {}).jt)) return;
      const ph = fishPhase(byF[f] || {f}, sug[f], F);
      if (ph) (shows[sid] = shows[sid] || new Set()).add(ph);
    });
    // Photos the game already plays by itself (the sure candidates) are not offered again, but for a blind Check.
    const playing = new Set((game || []).map(p => treePid(p.f)));
    Object.entries(cands || {}).forEach(([orig, L]) =>
      (L || []).forEach(p => {
        if (!p || !p.f) return;
        const {sid, st} = fishState(F, p.f, orig);
        if (st) return;
        if (playing.has(treePid(p.f)) && !(I[p.f] && I[p.f].d.check && !fishMine(F, p.f))) return;
        const inP = play[sid] || new Set(),
          target = fishTarget((species || {})[sid]),
          x = I[p.f],
          chk = !!(x && x.d.check && !fishMine(F, p.f)),
          und = !!(x && x.d.undone),
          j = sug[p.f] || null,
          s = fishSure(j),
          ph = fishPhase(p, j, F);
        out.push({
          sid,
          p,
          j,
          n: inP.size,
          target,
          chk,
          ph,
          ...(sid !== orig ? {from: orig} : {}),
          nph: !!ph && !(shows[sid] || new Set()).has(ph),
          full: !chk && inP.size >= target && !inP.has(p.o || p.f),
          aside: !chk && !und && !!s && s.keep === 'reject'
        });
      })
    );
    const k = x => (x.j && x.j.k in FISHK ? FISHK[x.j.k] : 2),
      ref = x =>
        x.j &&
        String(x.j.jt || '')
          .slice(7)
          .includes('r')
          ? 1
          : 0;
    return out.sort(
      (a, b) =>
        a.n / a.target - b.n / b.target ||
        a.n - b.n ||
        (a.sid < b.sid ? -1 : a.sid > b.sid ? 1 : 0) ||
        b.nph - a.nph ||
        k(a) - k(b) ||
        ((b.j && b.j.e) || 0) - ((a.j && a.j.e) || 0) ||
        ref(b) - ref(a) ||
        rightsRank(a.p) - rightsRank(b.p) ||
        (a.p.f < b.p.f ? -1 : 1)
    );
  }
  // The admin's tag, ease, phase or crop on a fish photo (pure): field one of tags, ease, phase, crop; v null takes his
  // value off (the pass's shows again). A field the auto-sort wrote becomes his (fishOwn), so an Undo of its decision
  // never takes his value away.
  function fishSet(F, f, field, v) {
    F = fishOwn(F || {}, f, field);
    const M = {...(F[field] || {})};
    if (v == null) delete M[f];
    else M[f] = v;
    return {...F, [field]: M};
  }
  // One tag of a rubric code changed (pos 0-6: view, whole, light, colour loss, clarity, size, count), or a flag toggled
  // (pos 'j' juvenile, 'c' camouflage, 'w' watermark; the sea slugs' 'f' features hidden, judging/SEASLUG.md), on the
  // admin's code, else the pass's, else a plain profile one; the tool-made flags (p phase entry, r reference photo) kept as they
  // were, in the rubrics' order (the fish's j c a w p r, the sea slugs' j c a w f: one order holds both).
  const FFLAGORD = 'jcawfpr';
  function fishTag(code, pos, v) {
    const c = FISH_TAGS.test(code || '') ? code : 'p1g0sm1';
    if (typeof pos === 'number') return c.slice(0, pos) + v + c.slice(pos + 1);
    const fl = new Set(c.slice(7));
    if (fl.has(pos)) fl.delete(pos);
    else fl.add(pos);
    return c.slice(0, 7) + [...FFLAGORD].filter(x => fl.has(x)).join('');
  }
  // The watermark flag (w: a visible watermark or text on the photo) of a photo whose tags in the curation are the
  // auto-sort's copy of the pass's (its log code still lists t): the pass's w is added, as a judgement made after the
  // copy. Tags the admin set himself stand as they are. mine: the curation's tags; pass: the pass's jt; auto: the tags
  // are the auto-sort's copy. tools/fish_game.py marked mirrors it.
  function fishMarked(mine, pass, auto) {
    if (
      !auto ||
      !FISH_TAGS.test(mine || '') ||
      !String(pass || '')
        .slice(7)
        .includes('w') ||
      mine.slice(7).includes('w')
    )
      return mine;
    return fishTag(mine, 'w');
  }
  // Whether photo f's tags in curation F are the auto-sort's copy (its log code lists t; fishIdx, fishParse).
  const fishTagsAuto = (F, f) => {
    const x = fishIdx(F || {})[f];
    return !!(x && (x.d.w || []).includes('tags'));
  };
  // The admin's tags of photo f in curation F as the game reads them (fishMarked; pass: the pass's jt), or undefined with
  // none. The log is read only when the pass's code carries w.
  function fishTagsMine(F, f, pass) {
    const own = ((F || {}).tags || {})[f];
    return own &&
      String(pass || '')
        .slice(7)
        .includes('w')
      ? fishMarked(own, pass, fishTagsAuto(F, f))
      : own;
  }
  // The admin's Add from the swiper (pure): the photo in play for its species, with the pass's tags, ease, phase and crop
  // written beside it where he has none yet (as the auto-sort writes its adds, so every photo in play carries its tags
  // and ease for the game), and its "seen" mark taken off. Not logged as auto: his own decision. A Check he answers this
  // way keeps its log code, which fishCompare reads against his keep.
  function fishAdd(F, f, sid, j, p) {
    F = F || {};
    const N = {...F, add: {...(F.add || {}), [f]: sid}},
      put = (k, v) => {
        if (v == null || (F[k] || {})[f] != null) return;
        N[k] = {...(N[k] || {}), [f]: v};
      };
    if (N.seen && f in N.seen) {
      N.seen = {...N.seen};
      delete N.seen[f];
    }
    // An unsure judgment too (u: the judge doubted its code or its keep): the best description of the photo there is
    // until the admin's own tags.
    if (j) {
      const c = fishCopy({...(p || {}), f}, j, F);
      put('tags', c.tags);
      put('ease', j.e);
      put('phase', c.phase);
      put('crop', j.c);
    }
    return N;
  }
  // ---- Fish photos in play, Not this, Remove ----
  // Not this: out {f: species id} = the iNaturalist experts got the species wrong, the photo is that species' candidate
  // now; out {f: 'x'} = no game species (or unknown): gone. Only the admin's click writes it (fishNotThis). A photo is in
  // play for a species when add names it, it is neither rejected nor excluded, and its out, if any, names that same
  // species (core.js treePhotoOn, as the game reads it). fishMine stays the keep on its first species, for the agreement.
  // A photo's species now (orig: its fish-cand.json species) and its state there: 'play', 'rej' (rejected), 'gone'
  // (excluded, or Not this with no game species), or null (a candidate waiting).
  function fishState(F, f, orig) {
    F = F || {};
    const o = (F.out || {})[f];
    if ((F.exclude || {})[f] || o === 'x') return {sid: orig, st: 'gone'};
    const sid = o || orig;
    return {sid, st: (F.seen || {})[f] ? 'rej' : (F.add || {})[f] === sid ? 'play' : null};
  }
  // The extra phase a photo shows (as tools/fetch_fish.py photo_phase: juvenile, intermediate, male, female), or '' (adult
  // or not known): the admin's phase and tags when he set any (then the source's annotation is not read), else the pass's
  // phase tag, its juvenile flag, else the source's life stage or sex (st), juvenile first.
  const FPHW = {
    juvenile: 'juvenile',
    subadult: 'intermediate',
    intermediate: 'intermediate',
    initial: 'intermediate',
    'initial phase': 'intermediate',
    terminal: 'male',
    'terminal phase': 'male',
    male: 'male',
    female: 'female'
  };
  const FPHASES = ['juvenile', 'intermediate', 'male', 'female'];
  // Tags or a phase the fish auto-sort wrote (its log code lists them) are the pass's, not the admin's: the source's life
  // stage still shows. The log index is cached per fish part (a new object at every edit).
  const IDXC = new WeakMap(),
    idxOf = F => {
      if (!IDXC.has(F)) IDXC.set(F, fishIdx(F));
      return IDXC.get(F);
    };
  function fishPhase(p, j, F) {
    F = F || {};
    const w = ((idxOf(F)[p.f] || {}).d || {}).w || [],
      mine = (p.f in (F.phase || {}) && !w.includes('phase')) || (p.f in (F.tags || {}) && !w.includes('tags')),
      ph = p.f in (F.phase || {}) ? F.phase[p.f] : (j || {}).ph,
      jt = (F.tags || {})[p.f] || (j || {}).jt || '';
    if (FPHW[ph]) return FPHW[ph];
    if (jt.slice(7).includes('j')) return 'juvenile';
    if (mine) return '';
    const got = new Set(
      String(p.st || '')
        .split('/')
        .map(w => FPHW[w])
        .filter(Boolean)
    );
    return FPHASES.find(x => got.has(x)) || '';
  }
  // The admin's Not this (pure): the photo goes to species `to` as its candidate (out {f: to}), or out of every game
  // species ('x'); its add and its rejection go with it (it waits in its new species). Back to its first species (orig)
  // takes the mark off. The auto-sort never calls it: overruling the experts is the admin's call alone.
  function fishNotThis(F, f, to, orig) {
    F = F || {};
    const N = {...F, out: {...(F.out || {})}},
      drop = k => {
        if (N[k] && f in N[k]) {
          N[k] = {...N[k]};
          delete N[k][f];
        }
      };
    if (!to || to === orig) delete N.out[f];
    else {
      N.out[f] = to;
      drop('add');
      drop('seen');
    }
    return N;
  }
  // The admin's Reject (✕), from the swiper or on a photo in play (pure): "seen", and the add taken off when it was in play.
  // On a photo the auto-sort had set aside (its log code a plain 'r': a Not this taken back left it waiting), the reject is
  // his own from then on: the code is marked '-r', so the route back (sortBack) never takes his decision for the run's.
  function fishReject(F, f) {
    F = F || {};
    const N = {...F, seen: {...(F.seen || {}), [f]: 1}},
      x = fishIdx(F)[f];
    if (N.add && f in N.add) {
      N.add = {...N.add};
      delete N.add[f];
    }
    if (x && x.code === 'r') N.auto = {...N.auto, [x.day]: {...N.auto[x.day], [f]: '-r'}};
    return N;
  }
  // The admin's × (excluded for good, imports skip it): "exclude", and the add taken off.
  function fishExclude(F, f) {
    F = F || {};
    const N = {...F, exclude: {...(F.exclude || {}), [f]: 'excluded'}};
    if (N.add && f in N.add) {
      N.add = {...N.add};
      delete N.add[f];
    }
    return N;
  }

  // ---- The fish units page (docs/reviews/2026-11-06-fish-units-plan.md) ----
  // A family's own choices live in curation.json fish genera {family id: {cover: f, feat: {species id: [f]}, ok: true}}:
  // the coral key names, species in place of views, keyed by family id (f:Damselfishes). FISHFEAT photos featured per
  // species at most, as the corals' 3 per view. A genus's and a species' covers sit in the same map under their
  // fish.json ids, {cover: f} only ('g:Chromis', 's091'; docs/ARCHITECTURE.md): fishPick and fishCover take any unit id.
  const FISHFEAT = 3;
  // A family's choices changed by fn (on a copy); an emptied feat list, feat map or family is left out.
  function fishPick(F, tid, fn) {
    F = F || {};
    const G = {...(F.genera || {})},
      k = JSON.parse(JSON.stringify(G[tid] || {}));
    fn(k);
    if (k.feat) {
      Object.keys(k.feat).forEach(s => !(k.feat[s] || []).length && delete k.feat[s]);
      if (!Object.keys(k.feat).length) delete k.feat;
    }
    if (Object.keys(k).length) G[tid] = k;
    else delete G[tid];
    return {...F, genera: G};
  }
  // A photo featured or not (one click); at FISHFEAT already, nothing changes (full: true, the admin says so).
  // Only the featured photos still in play count towards FISHFEAT (one that left play elsewhere frees its slot); a click
  // on one cleans the list of the others.
  function fishFeat(F, tid, sid, f) {
    const L = (((((F || {}).genera || {})[tid] || {}).feat || {})[sid] || []).filter(x => x === f || treePhotoOn(F || {}, x, sid));
    if (!L.includes(f) && L.length >= FISHFEAT) return {F, full: true};
    return {
      F: fishPick(F, tid, k => {
        k.feat = k.feat || {};
        k.feat[sid] = L.includes(f) ? L.filter(x => x !== f) : [...L, f];
      }),
      full: false
    };
  }
  // Photo f among the photos L: under its name, else the same photo under another name (core.js treePid: a reference
  // photo fi<id> and its candidate copy fish-<species>-cand-<id> are one photo, and the game plays one copy), as the app
  // finds his picks (app.js treeCurate); null when it is not there.
  const fishAt = (L, f) => (f && ((L || []).find(p => p.f === f) || (L || []).find(p => treePid(p.f) === treePid(f)))) || null;
  // The family's cover: this photo, or none again (his pick taken off, under either of its names). Either way a
  // confirmation of a juvenile cover (coverJ, below) or of a watermarked one (coverW) goes with the old pick: a new pick on
  // a juvenile asks again.
  const fishCover = (F, tid, f) =>
    fishPick(F, tid, k => {
      delete k.coverJ;
      delete k.coverW;
      if (k.cover && treePid(k.cover) === treePid(f)) delete k.cover;
      else k.cover = f;
    });
  // A juvenile is never a cover, but for the admin's own ★ cover on one, once he confirmed it (docs/ARCHITECTURE.md;
  // admin-covers.js JUV_Q). The confirmation sits next to the cover: curation.json fish genera {node id: {cover: f,
  // coverJ: f}}, through the draft and Publish (rule A1). It holds while it names the cover's photo (core.js treePid),
  // whatever the photo's tags say since. The default cover rule never takes a juvenile. fishCoverJ: tid's ★ cover is
  // this photo, confirmed; fishCoverYes: photo f as tid's cover, confirmed; fishCoverJOk: the confirmation alone, on the
  // cover already there (the Tree page's one click).
  const fishCoverJ = (F, tid, p) => {
    const k = ((F || {}).genera || {})[tid] || {},
      f = p && (p.f || p);
    return !!(f && k.cover && k.coverJ && treePid(k.coverJ) === treePid(k.cover) && treePid(f) === treePid(k.cover));
  };
  const fishCoverYes = (F, tid, f) =>
    fishPick(F, tid, k => {
      k.cover = f;
      k.coverJ = f;
    });
  const fishCoverJOk = (F, tid) =>
    fishPick(F, tid, k => {
      if (k.cover) k.coverJ = k.cover;
    });
  // A watermarked photo (fishWm) is never a default cover (docs/ARCHITECTURE.md), but the admin's ★ cover on one stays in
  // force (rule A1) while the Tree page asks whether to keep it (admin-covers.js WM_ASK) and Cover proposals offer one
  // without. His Keep sits next to the cover as coverJ does ({cover: f, coverW: f}); it holds while it names the cover's
  // photo, and a new pick drops it (fishCover). Home still skips the photo (home.js homeOk), and a node's default never
  // takes a kept ★ cover of a leaf under it. fishCoverW: tid's ★ cover is this photo, kept; fishCoverWOk: the Keep, on
  // the cover already there.
  const fishCoverW = (F, tid, p) => {
    const k = ((F || {}).genera || {})[tid] || {},
      f = p && (p.f || p);
    return !!(f && k.cover && k.coverW && treePid(k.coverW) === treePid(k.cover) && treePid(f) === treePid(k.cover));
  };
  const fishCoverWOk = (F, tid) =>
    fishPick(F, tid, k => {
      if (k.cover) k.coverW = k.cover;
    });
  // Validated, or not.
  const fishOk = (F, tid) =>
    fishPick(F, tid, k => {
      if (k.ok) delete k.ok;
      else k.ok = true;
    });
  // A photo leaving play (Remove, ×, Not this) leaves the family's featured photos and cover too, and any other unit's
  // cover it was: a genus ('g:<Genus>') or a species (its fish.json id), whose covers are picked on the same page: one
  // Undo step for all.
  const fishDrop = (F, tid, f) => {
    const out = k => {
      if (k.cover === f) delete k.cover;
      if (k.coverJ === f) delete k.coverJ;
      if (k.coverW === f) delete k.coverW;
      Object.keys(k.feat || {}).forEach(s => (k.feat[s] = k.feat[s].filter(x => x !== f)));
    };
    let N = fishPick(F, tid, out);
    Object.entries(N.genera || {}).forEach(([id, k]) => {
      if (id !== tid && k && (k.cover === f || Object.values(k.feat || {}).some(L => (L || []).includes(f)))) N = fishPick(N, id, out);
    });
    return N;
  };
  // The photos of one species in play, in the page's order (L: the photo objects, j(f): the pass's judgment): the featured
  // ones first, in the admin's order; then the game's order (core.js easyRank): reference-level photos first (read from
  // the photo's ease and tags, never from its source), the easiest, the most reference-like (refScore), an open licence
  // before CC BY-NC (rightsRank), then a fixed hash. Never by who took them (docs/rules/photos.md).
  // A photo as core.js easyRank and refLevel read it: the admin's ease and tags, else the pass's (j).
  const fishEase = (p, F, j) => ((F || {}).ease || {})[p.f] || (j(p.f) || {}).e || 0;
  function fishRec(p, F, j) {
    const jt = ((F || {}).tags || {})[p.f] || (j(p.f) || {}).jt || '';
    return {
      f: p.f,
      jt,
      e: fishEase(p, F, j) || undefined,
      lic: p.lic,
      own: p.own,
      a: p.a,
      p
    };
  }
  function fishOrder(L, F, tid, sid, j = () => null) {
    F = F || {};
    const fe = ((((F.genera || {})[tid] || {}).feat || {})[sid] || []).filter(f => L.some(p => p.f === f)),
      R = L.filter(p => !fe.includes(p.f));
    return {
      feat: fe.map(f => L.find(p => p.f === f)),
      rest: easyRank(
        R.map(p => fishRec(p, F, j)),
        x => -(fishEase(x.p, F, j) || 3)
      ).map(x => x.p)
    };
  }
  // A family's cover: the admin's pick while it is in play (L: the family's photos in play), else its first photo in the
  // game's order across all its species (fishOrder, core.js easyRank, as the game's card cover), else null.
  // A juvenile is never a cover, at any rank (docs/ARCHITECTURE.md): a pick on one is ignored unless confirmed
  // (fishCoverJ), the order's first non-juvenile is taken, and a unit whose photos are all juveniles keeps its first.
  // Juvenile: its phase word (fishPhase), or a game record's ph, which tools/fish_game.py writes the same way. A phase or
  // tags the auto-sort copied (its log code lists them) are no choice of the admin's: the game record's phase, which the
  // build reads from the newer judgement (tools/fish_game.py read_cur; Pierre, 2026-11-19 20:57), is the one in force.
  const FJUV = FPHASES[0];
  function fishJuv(p, j, F) {
    if (!p) return false;
    const w = ((idxOf(F || {})[p.f] || {}).d || {}).w || [],
      own = k => p.f in ((F || {})[k] || {}) && !w.includes(k),
      mine = own('phase') || own('tags');
    // a game record (its species sp) carries the build's phase: ph, or none for an adult
    if (!mine && w.length && p.sp != null) return p.ph === FJUV;
    return fishPhase(p, j, F) === FJUV || (!mine && p.ph === FJUV);
  }
  // A photo with a visible watermark or text (its flag w), its tags as the game reads them: the admin's, with the pass's
  // w where they are the auto-sort's copy (fishTagsMine), else the pass's (j). The app's copy: app.js wmP.
  function fishWm(p, j, F) {
    if (!p) return false;
    const pass = (j || {}).jt || '';
    return String(fishTagsMine(F, p.f, pass) || pass)
      .slice(7)
      .includes('w');
  }
  // Without the admin's pick, the default cover of a node with leaves (docs/rules/photos.md): among its leaves with a
  // non-juvenile reference-level photo (core.js refLevel), the one most seen around the instance's centre by distinct
  // observers (ties: observations, then the game's order); then his ★ cover of that leaf while in play and not a
  // juvenile, else that leaf's first such photo. With no reference photo under the node, the same on adult photos; a
  // node with no presence keeps the order's first. seen(leaf id): [observers, observations] (fishNear), by default from
  // the species records admin-fish.js registers (fishSeenFrom). A photo's leaf: its curation add (F.add), else its game
  // record's sp, else its candidate's sid. The app's copy: app.js seenCover (tests/fishcovers.test.js holds them together).
  function fishCoverOf(L, F, tid, j = () => null, seen = sid => fishNear(fishSeenOf(sid))) {
    const k = (((F || {}).genera || {})[tid] || {}).cover,
      c = fishAt(L, k);
    if (c && (!fishJuv(c, j(c.f), F) || fishCoverJ(F, tid, c))) return c;
    return (fishCoverRule(L, F, tid, j, seen) || {}).p || null;
  }
  // A leaf's (a species') cover, as the app's sheets show it (learn.js treeSpPhotos, spPhoto): the admin's ★ pick while in
  // play and not a juvenile (or confirmed: fishCoverJ), else its first non-juvenile photo in the page's order (fishOrder),
  // else its first; null for no photo. The default takes a watermarked photo only when the leaf has no adult photo
  // without one (fishWm, as app.js coverFirst); his pick on one holds.
  function fishLeafCover(L, F, tid, j = () => null) {
    const k = (((F || {}).genera || {})[tid] || {}).cover,
      adult = p => !fishJuv(p, j(p.f), F),
      c = fishAt(L, k);
    L = L || [];
    return (
      (c && (adult(c) || fishCoverJ(F, tid, c)) ? c : null) ||
      L.find(p => adult(p) && !fishWm(p, j(p.f), F)) ||
      L.find(adult) ||
      L[0] ||
      null
    );
  }
  // The default alone, whatever his pick on the node (fishCoverOf without it; the admin's Cover proposals, admin-covers.js,
  // set it beside his): {p: the photo, leaf: the leaf it was chosen for, seen: that leaf's [observers, observations], ref:
  // whether the leaves competed on a reference photo, mine: p is his ★ cover of that leaf}; null for no photo.
  // Never a watermarked photo while the node has an adult photo without one (fishWm): the leaves then compete on those,
  // and his ★ cover of the leaf chosen is taken only without one (kept with coverW or not).
  function fishCoverRule(L, F, tid, j = () => null, seen = sid => fishNear(fishSeenOf(sid))) {
    const juv = p => fishJuv(p, j(p.f), F),
      wm = p => fishWm(p, j(p.f), F),
      R = fishOrder(L, F, tid, '', j).rest,
      A0 = R.filter(p => !juv(p)),
      A1 = A0.filter(p => !wm(p)),
      A = A1.length ? A1 : A0,
      Ref = A.filter(p => refLevel(fishRec(p, F, j))),
      leaf = p => ((F || {}).add || {})[p.f] || p.sp || p.sid;
    let best = null;
    (Ref.length ? Ref : A).forEach(p => {
      const s = seen(leaf(p)) || [0, 0];
      if (!best || s[0] > best.s[0] || (s[0] === best.s[0] && s[1] > best.s[1])) best = {p, s};
    });
    if (!best) {
      const q = R.find(p => !wm(p)) || R[0];
      return q ? {p: q, leaf: leaf(q), seen: [0, 0], ref: false, mine: false} : null;
    }
    // his ★ cover of that leaf: an adult one, or a juvenile he confirmed (fishCoverJ); the leaves still compete on adults;
    // without a watermark while the node has an adult photo without one (A)
    const lf = leaf(best.p),
      sk = (((F || {}).genera || {})[lf] || {}).cover,
      sj = fishAt(R, sk),
      m = fishAt(A, sk) || (fishCoverJ(F, lf, sj) && !(A1.length && wm(sj)) ? sj : null);
    return {p: m || best.p, leaf: lf, seen: best.s, ref: Ref.length > 0, mine: !!m};
  }
  // A leaf's presence around the instance's centre (tools/instance.json, fish.json centre): [distinct Research Grade
  // observers, observations] from its record's present, nearU and nearN, else their older names (dauinU, dauin:
  // tools/build_fish.py); [0, 0] with none. The app's copy: app.js nearSeen.
  const fishNear = r => {
    const p = (r && r.present) || {};
    return [p.nearU ?? p.dauinU ?? 0, p.nearN ?? p.dauin ?? 0];
  };
  // Where fishCoverOf finds a species' record by id (the admin's fish.json species, FISHC: admin-fish.js registers it);
  // none until then, so every default keeps the game's order.
  let fishSeenOf = () => null;
  const fishSeenFrom = get => (fishSeenOf = typeof get === 'function' ? get : () => null);
  // The IMR phases of a family (fish.json families phase: the phase lines of the IMR entries that cover it; dimorph: its
  // sexes differ), as the phase words of fishPhase: juveniles, intermediate (sub-adult, initial) and terminal phases,
  // males and females.
  function fishUnitPhases(t) {
    const s = ((t && t.phase) || []).join(' ').toLowerCase(),
      out = [];
    if (/juvenile/.test(s)) out.push('juvenile');
    if (/intermediate|sub-?adult|initial/.test(s)) out.push('intermediate');
    if (/\bmales?\b|terminal/.test(s) || (t && t.dimorph)) out.push('male');
    if (/females?\b/.test(s) || (t && t.dimorph)) out.push('female');
    return out;
  }
  // What a family still needs before the admin's ✓ Validated (docs/ARCHITECTURE.md "Admin for every subject"): each
  // species' observations in play up to its target (fishTarget), 5 easy photos per family (ease 4 or 5, judging/FISH.md)
  // and every IMR phase at least once. play: {species id: [photo]} in play, species: {id: fish.json species} (the
  // family's game species), j(f): the pass's judgment.
  const FISHEASY = 5;
  function fishNeeds(t, play, species, F, j = () => null) {
    F = F || {};
    const out = [],
      sids = ((t && t.species) || []).filter(s => species[s] && !species[s].out),
      all = sids.flatMap(s => play[s] || []),
      under = sids.filter(s => new Set((play[s] || []).map(p => p.o || p.f)).size < fishTarget(species[s])).length,
      easy = all.filter(p => ((F.ease || {})[p.f] || (j(p.f) || {}).e || 0) >= 4).length,
      shown = new Set(all.map(p => fishPhase(p, j(p.f), F)));
    if (!all.length) out.push('No photo in play');
    if (under) out.push(`${under} species under target`);
    if (easy < FISHEASY) out.push(`Easy ${easy}/${FISHEASY}`);
    fishUnitPhases(t)
      .filter(x => !shown.has(x))
      .forEach(x => out.push(`No ${x}`));
    return out;
  }

  // The fish units as the admin reads them (fish.json families, genera, species), whatever detail fish.json gives:
  // [{id: 'f:Damselfishes', name (the book's English label), sci: [scientific names], group (key group n), circle, imr
  // (the IMR course's name for it, a tag: docs/ARCHITECTURE.md), imrWith (taught by IMR with another family), phase,
  // dimorph, wink, look (IMR's look-alike lines: [other family id, words]), species: [ids], genera: [{id: 'g:Chromis',
  // name, imr, species: [ids]}]}] in the book's order (key group, then fish.json's order). A genus's species come from
  // its genus list, else each species' genus, else the species name's first word. [] when fish.json has no families.
  function fishUnits(J) {
    J = J || {};
    const sp = Object.fromEntries((J.species || []).map(x => [x.id, x])),
      tag = x => (x == null || x === false ? '' : typeof x === 'string' ? x : x === true ? 'IMR' : x.name || 'IMR'),
      GL = Array.isArray(J.genera) ? J.genera : Object.entries(J.genera || {}).map(([id, g]) => ({id, ...g})),
      G = Object.fromEntries(GL.map(g => [g.id, g])),
      gOf = s => (sp[s] && (sp[s].genus || 'g:' + String(sp[s].name || '').split(' ')[0])) || 'g:?',
      F = (J.families || []).map((f, i) => {
        const sids = (f.species || []).filter(s => sp[s]),
          gids = [...new Set([...(f.genera || []), ...sids.map(gOf)])].filter(g => sids.some(s => gOf(s) === g) || (G[g] && G[g].species));
        return {
          id: f.id,
          name: f.name || String(f.id).replace(/^f:/, ''),
          sci: [].concat(f.sci || []),
          group: f.group == null ? null : f.group,
          circle: f.circle || Math.min(...sids.map(s => sp[s].circle || 9), 9),
          imr: tag(f.imr),
          imrWith: f.imrWith || '',
          phase: f.phase || [],
          dimorph: !!f.dimorph,
          wink: f.wink || null,
          look: f.look || [],
          lsrc: f.lsrc || {},
          species: sids,
          genera: gids.map(g => ({
            id: g,
            name: (G[g] && G[g].name) || g.replace(/^g:/, ''),
            imr: tag(G[g] && G[g].imr),
            species: ((G[g] && G[g].species) || sids.filter(s => gOf(s) === g)).filter(s => sids.includes(s))
          })),
          i
        };
      });
    return F.sort((a, b) => (a.group == null ? 99 : a.group) - (b.group == null ? 99 : b.group) || a.i - b.i).map(({i, ...f}) => f);
  }
  // The species records the admin reads ({id: fish.json species}), each species of a wink family (fish.json families
  // wink: met only on the surprise cards) marked wink: true, so fishTarget gives it FISHT.wink; with tgt (its subject's
  // own target, core.js SUBJECTS admin target), every record marked tgt. Read only, never stored.
  function fishSpecies(J, tgt) {
    J = J || {};
    const wk = new Set((J.families || []).filter(f => f && f.wink).flatMap(f => f.species || []));
    return Object.fromEntries(
      (J.species || []).map(x => [
        x.id,
        wk.has(x.id) || tgt > 0 ? {...x, ...(wk.has(x.id) ? {wink: true} : {}), ...(tgt > 0 ? {tgt} : {})} : x
      ])
    );
  }
  // A wink species' photos in play on the admin's Tree (docs/ROADMAP.md "Surprise-only species"): only n (FISHT.wink) shown,
  // the rest folded. Its featured photos (the admin's Feature) always shown, then the surprise card's own photos (fish.json
  // wink.photos, by photo id as quiz.js winkPhoto reads them, in their order), then the page's order (fishOrder: reference
  // level first, then the easiest). row: fishOrder's {feat, rest}; returns {feat, show (rest shown), fold (rest folded)}.
  // Display only: every photo stays in play and counted.
  function fishWinkFold(row, photos, n = FISHT.wink) {
    const feat = (row && row.feat) || [],
      rest = (row && row.rest) || [],
      want = (photos || []).map(treePid),
      at = p => want.indexOf(treePid(p.f)),
      card = rest.filter(p => at(p) >= 0).sort((a, b) => at(a) - at(b)),
      ord = [...card, ...rest.filter(p => at(p) < 0)],
      k = Math.max(0, n - feat.length);
    return {feat, show: ord.slice(0, k), fold: ord.slice(k)};
  }

  // Fish Coverage (fishCov): per family, genus and species, the photos in play, the observations against the target, the
  // easy photos (ease 4-5), the reference-level photos (core.js refLevel), the phases shown and what is missing; and the candidates still
  // waiting. U: fishUnits; play: {species id: [photo]} in play; species: {id: fish.json species}; cand: fish-cand.json
  // cand; F: the draft's fish part; j(f): the pass's judgment. Returns {fam, gen, sp}: rows {id, name, fam, n (photos),
  // obs, tgt (a species' target; a genus or family: ok of its species at target), easy, ref, ph, wait (a species also
  // waitObs, the new observations they hold), need (fishNeeds words), imr}.
  // fishWaiting: the candidates waiting, by the species they wait in now (one sent elsewhere with Not this waits there:
  // fishState); one in play (play, by photo id: core.js treePid, a blind Check included), rejected or gone does not wait.
  // Read by Coverage and the Tree's node pages.
  function fishWaiting(cand, F, play) {
    const waiting = {},
      inPlay = new Set(
        Object.values(play || {})
          .flat()
          .map(p => p && p.f && treePid(p.f))
      );
    Object.entries(cand || {}).forEach(([orig, L]) =>
      (L || []).forEach(p => {
        const x = fishState(F || {}, p.f, orig);
        if (x.st === null && !inPlay.has(treePid(p.f))) (waiting[x.sid] = waiting[x.sid] || []).push(p);
      })
    );
    return waiting;
  }
  function fishCov(U, play, species, cand, F, j = () => null) {
    F = F || {};
    const waiting = fishWaiting(cand, F, play);
    const ease = p => fishEase(p, F, j),
      // The reference level as the game reads it (core.js refLevel, rule P1): the photo's ease (4-5) and look, read from the
      // admin's ease and tags else the pass's, never from the route it came in by (rep, the flag r).
      isRef = p => refLevel(fishRec(p, F, j)),
      spRow = (sid, fam) => {
        const L = play[sid] || [],
          s = species[sid] || {},
          obs = new Set(L.map(p => p.o || p.f)).size,
          tgt = fishTarget(s),
          W = waiting[sid] || [],
          seen = new Set(L.map(p => p.o || p.f)),
          need = [];
        if (!L.length) need.push('No photo in play');
        else if (obs < tgt) need.push(`${tgt - obs} observations under target`);
        return {
          id: sid,
          name: s.common || s.name || sid,
          sci: s.name || '',
          fam,
          circle: s.circle,
          cs: !!s.cs,
          n: L.length,
          obs,
          tgt,
          easy: L.filter(p => ease(p) >= 4).length,
          ref: L.filter(isRef).length,
          ph: [...new Set(L.map(p => fishPhase(p, j(p.f), F)).filter(Boolean))],
          wait: W.length,
          // the observations the waiting candidates would add (one observation counts once)
          waitObs: new Set(W.map(p => p.o || p.f).filter(o => !seen.has(o))).size,
          need
        };
      },
      sum = (rows, base) => ({
        ...base,
        n: rows.reduce((a, r) => a + r.n, 0),
        obs: rows.reduce((a, r) => a + r.obs, 0),
        ok: rows.filter(r => r.obs >= r.tgt).length,
        of: rows.length,
        easy: rows.reduce((a, r) => a + r.easy, 0),
        ref: rows.reduce((a, r) => a + r.ref, 0),
        ph: [...new Set(rows.flatMap(r => r.ph))],
        wait: rows.reduce((a, r) => a + r.wait, 0)
      }),
      out = {fam: [], gen: [], sp: []},
      // A genus's genus-level photos (gl: in play under its own id, the sea slugs' observations agreed at the genus only;
      // docs/rules/content.md): counted in its genus's and its family's photos, observations, easy and reference photos,
      // phases and candidates waiting (gl, their number), never as a species (of, ok: its species alone).
      withGl = (r, G) =>
        G.reduce(
          (a, g) => ({
            ...a,
            n: a.n + g.n,
            obs: a.obs + g.obs,
            easy: a.easy + g.easy,
            ref: a.ref + g.ref,
            ph: [...new Set([...a.ph, ...g.ph])],
            wait: a.wait + g.wait,
            gl: (a.gl || 0) + g.n
          }),
          r
        );
    U.forEach(u => {
      const S = u.species.filter(s => species[s] && !species[s].out).map(s => spRow(s, u.id)),
        by = Object.fromEntries(S.map(r => [r.id, r])),
        GL = Object.fromEntries(
          u.genera.filter(g => (play[g.id] || []).length || (waiting[g.id] || []).length).map(g => [g.id, spRow(g.id, u.id)])
        );
      out.sp.push(...S);
      u.genera.forEach(g => {
        const R = g.species.map(s => by[s]).filter(Boolean);
        if (!R.length && !GL[g.id]) return;
        const r = withGl(sum(R, {id: g.id, name: g.name, fam: u.id, imr: g.imr}), GL[g.id] ? [GL[g.id]] : []);
        r.need = [...(r.of - r.ok ? [`${r.of - r.ok} species under target`] : []), ...(r.n ? [] : ['No photo in play'])];
        out.gen.push(r);
      });
      const r = withGl(
        sum(S, {id: u.id, name: u.name, fam: u.id, imr: u.imr || (u.imrWith ? 'with ' + u.imrWith : ''), circle: u.circle}),
        Object.values(GL)
      );
      r.want = fishUnitPhases(u);
      r.need = fishNeeds(u, play, species, F, j);
      out.fam.push(r);
    });
    return out;
  }
  // Coverage's To do (fish): what to act on, each [key, level of fishCov's rows, words, row test]; F: curation.json fish.
  // Inbox › Coverage › Games shows each as a chip over its rows, To do › All its counts (admin.js renderFishCov,
  // fishTodoLines).
  const FISHCOV_TODO = [
    ['spwait', 'sp', 'species under target with candidates waiting', r => r.obs < r.tgt && r.wait],
    ['spnone', 'sp', 'species with no photo in play', r => !r.n],
    ['famv', 'fam', 'families validated but incomplete', (r, F) => !!(((F && F.genera) || {})[r.id] || {}).ok && r.need.length],
    ['famnr', 'fam', 'families not ready to validate', r => r.need.length]
  ];
  // Its counts over fishCov's rows C, those keep(row) lets through (the IMR filter): [[key, level, words, n]], n > 0 only.
  const fishCovTodo = (C, F, keep = () => true) =>
    FISHCOV_TODO.map(([k, l, t, fn]) => [k, l, t, C[l].filter(r => keep(r) && fn(r, F)).length]).filter(x => x[3]);
  // The fish candidates To do counts (fishQueue): those the swiper shows by default, never the auto-sort's Checks (they
  // have their own count in Candidates: docs/decisions/2026-11-18-decisions-from-comments-3.md), nor the ones of a
  // species at its target or set aside.
  const fishCandTodo = Q => (Q || []).filter(x => !x.chk && !x.full && !x.aside).length;
  // Where to look (fish): the species most worth a candidate search, those under target whose waiting candidates cannot
  // fill the gap; the IMR course's (circle 1) first, then the PDF's most sighted (cs), then the largest gap. [{...species
  // row, gap}], best first.
  const fishLook = C =>
    C.sp
      .map(r => ({...r, gap: Math.max(0, r.tgt - r.obs - r.waitObs)}))
      .filter(r => r.gap > 0)
      .sort((a, b) => (a.circle || 9) - (b.circle || 9) || b.cs - a.cs || b.gap - a.gap || (a.id < b.id ? -1 : 1));

  // ---- Fish Photo review: the admin's ease, phase and view on photos in play ----
  // His value of one field on a photo: fishSet and fishTag (above).
  // The agreement line of a review view: over the photos fs where the admin gave his value and the pass gave one, how
  // often they agree. field: 'ease' (exact, and within one point), 'phase' (fishPhase's words, juvenile included), 'view' (the
  // tags' first letter). {n: his values, both, same, near (ease only)}.
  function fishAgree(F, fs, field, j = () => null) {
    F = F || {};
    const mine = f =>
        field === 'ease'
          ? (F.ease || {})[f]
          : field === 'view'
            ? ((F.tags || {})[f] || '')[0]
            : f in (F.phase || {}) || f in (F.tags || {})
              ? fishPhase({f}, null, {phase: F.phase, tags: F.tags})
              : undefined,
      pass = f =>
        field === 'ease' ? (j(f) || {}).e : field === 'view' ? ((j(f) || {}).jt || '')[0] : j(f) ? fishPhase({f}, j(f), {}) : undefined;
    let n = 0,
      both = 0,
      same = 0,
      near = 0;
    fs.forEach(f => {
      const m = mine(f),
        p = pass(f);
      if (m == null || (m === '' && field !== 'phase')) return;
      n++;
      if (p == null || (p === '' && field !== 'phase')) return;
      both++;
      if (m === p) same++;
      if (field === 'ease' && Math.abs(m - p) <= 1) near++;
    });
    return {n, both, same, near};
  }

  // ---- Fish Look-alikes ----
  // The pairs: two families the IMR course compares (fish.json families look: [other family id, IMR's words]), once each,
  // in the book's order, with every IMR line about them and its own source (fish.json families lsrc; "IMR course" when
  // none is recorded; rule C2). [{k: 'f:A|f:B' (core.js contentPairKey, the content editor's pair key too), A, B (ids, in
  // the book's order), cues: [[family id the line is on, words, source]]}]. The pairs in force (the editor's withdrawn
  // and added ones): admin-content.js montPairs.
  function fishPairs(U) {
    const at = Object.fromEntries((U || []).map((u, i) => [u.id, i])),
      P = {};
    (U || []).forEach(u =>
      (u.look || []).forEach(([b, w]) => {
        if (!(b in at) || b === u.id) return;
        const k = C.contentPairKey(u.id, b);
        P[k] = P[k] || {k, A: at[u.id] <= at[b] ? u.id : b, B: at[u.id] <= at[b] ? b : u.id, cues: []};
        if (w && !P[k].cues.some(c => c[1] === w)) P[k].cues.push([u.id, w, (u.lsrc || {})[b] || 'IMR course']);
      })
    );
    return Object.values(P).sort((x, y) => at[x.A] - at[y.A] || at[x.B] - at[y.B]);
  }
  // A pair's two photos (phase-matched, as the coral pairs match the view): e, his entry {v: phase, a, b, hide} in
  // curation.json fish mont (the coral key names); LA / LB each family's photos in play in the page's order, ph(p) a
  // photo's phase ('' adult). The phase: his while both families have photos of it, else adult, juvenile, then all; the
  // photos: his while in that phase's list, else the first of each. {v, a, b, LA, LB (that phase's lists), set, hide}.
  // A phase: adult = every photo not of a juvenile.
  const FMONT_V = ['adult', 'juvenile', 'all'];
  function fishMontPick(e, LA, LB, ph) {
    e = e || {};
    // adult: every photo not of a juvenile (males, females and intermediate phases included); juvenile; all.
    const of = (L, v) => (v === 'all' ? L : L.filter(p => (ph(p) === 'juvenile') === (v === 'juvenile'))),
      ok = v => v && of(LA, v).length && of(LB, v).length,
      v = ok(e.v) ? e.v : FMONT_V.find(ok);
    if (!v) return {v: null, hide: !!e.hide, set: !!e.v};
    const A = of(LA, v),
      B = of(LB, v),
      mine = e.v === v;
    return {
      v,
      a: (mine && A.find(p => p.f === e.a)) || A[0],
      b: (mine && B.find(p => p.f === e.b)) || B[0],
      LA: A,
      LB: B,
      set: !!e.v,
      hide: !!e.hide
    };
  }
  // One pair's entry written (empty fields dropped; an empty entry removed: the pair is automatic again), on a copy.
  function fishMontSet(F, k, e) {
    F = F || {};
    const out = {};
    Object.entries(e || {}).forEach(([x, y]) => {
      if (y) out[x] = y;
    });
    const M = {...(F.mont || {})};
    if (Object.keys(out).length) M[k] = out;
    else delete M[k];
    return {...F, mont: M};
  }

  // Photo rotation (pure, tests/rotate.test.js): curation.json rot {f: 90 | 180 | 270} for the corals,
  // fish.rot for the fish, degrees clockwise, set in the crop editor (admin.js cropEditor) and applied to the files at
  // Publish by the photo workflow (tools/photos.py turn: the crop, in fractions of the original, cut first, then the cut
  // turned; so the crop box turns with the photo and a crop never changes when the photo is turned).
  const ROTS = [90, 180, 270];
  // A rotation as stored, 0 for none (any multiple of 90, negative included; anything else is none).
  const rotNorm = v => (v === null || v === '' || !Number.isFinite(+v) || +v % 90 ? 0 : ((+v % 360) + 360) % 360 || 0);
  // One step left (d -90) or right (d 90) from r.
  const rotStep = (r, d) => rotNorm((rotNorm(r) + d + 360) % 360);
  // The rotation map M with photo f turned by r: none takes f out (the published key stays small).
  function rotSet(M, f, r) {
    const o = {...(M || {})};
    if (rotNorm(r)) o[f] = rotNorm(r);
    else delete o[f];
    return o;
  }
  // Where a point of the original photo (x, y in fractions) lands in the file the workflow makes with crop c ([l, t, r, b],
  // null for none) and rotation r (tools/photos.py turn), in fractions of that file; null when the crop cut it off.
  function photoAt(x, y, c, r) {
    const [l, t, R, b] = c || [0, 0, 1, 1];
    if (x < l || x > R || y < t || y > b) return null;
    const u = (x - l) / (R - l),
      v = (y - t) / (b - t);
    return {90: [1 - v, u], 180: [1 - u, 1 - v], 270: [v, 1 - u]}[rotNorm(r)] || [u, v];
  }
  // The file's size in px from an original of w x h px with crop c and rotation r (the crop rounded as the workflow does).
  function turnedSize(w, h, c, r) {
    const [l, t, R, b] = c || [0, 0, 1, 1],
      cw = Math.round(R * w) - Math.round(l * w),
      ch = Math.round(b * h) - Math.round(t * h);
    return rotNorm(r) % 180 ? [ch, cw] : [cw, ch];
  }
  // A drag on screen (dx, dy px) over a box turned r degrees clockwise (CSS rotate), in the box's own axes: the crop
  // editor's frame stays in fractions of the original photo while the photo is shown turned.
  function rotDelta(dx, dy, r) {
    return {90: [dy, -dx], 180: [-dx, -dy], 270: [-dy, dx]}[rotNorm(r)] || [dx, dy];
  }
  // The scale that keeps a preview fitted whole (object-fit contain, or sized to the photo: the lightbox, the swiper),
  // of aspect ia (width / height as shown, its crop included), whole inside its box (bw x bh px) once turned r degrees:
  // the turned file fitted whole in that box.
  function rotScale(bw, bh, r, ia) {
    if (!(rotNorm(r) % 180) || !(bw > 0 && bh > 0)) return 1;
    const a = ia > 0 ? ia : bw / bh,
      cw = Math.min(bw, bh * a),
      ch = cw / a;
    return Math.min(bw / ch, bh / cw);
  }
  // A tile's photo (object-fit cover in a bw x bh box) turned a quarter: the image box swapped to bh x bw, its cover cut
  // made there, then turned, so it covers the tile exactly as the turned file will (scaling the tile's own cover cut
  // would cut the photo twice); the margins keep the tile's own size. Upright or half a turn: nothing to change.
  function rotCover(bw, bh, r) {
    if (!(rotNorm(r) % 180) || !(bw > 0 && bh > 0)) return null;
    return {w: bh, h: bw, mv: (bh - bw) / 2, mh: (bw - bh) / 2};
  }

  // The code of a decision (see the top of the file). on = which fields were applied ({quality, form}); a Check records
  // the whole judgment.
  function autoCode(s, on = {quality: true, form: true}, check = false, crop = false) {
    const k = s.keep === 'add' ? 'a' : s.keep === 'exclude' ? 'x' : 'r';
    const body =
      k === 'a' ? `a${V1[s.view]}${check || on.quality ? s.quality : '.'}${check || on.form ? s.form : '.'}${crop ? '#' : ''}` : k;
    return (check ? '?' : '') + body;
  }
  function autoParse(code) {
    const m = /^([?-]?)([arx])(?:([wmc])([1-3.])([A-Za-z.]+)(#?))?(?:@([0-9a-z]+))?$/.exec(code || '');
    if (!m || (m[2] === 'a') !== !!m[3]) return null;
    return {
      check: m[1] === '?',
      undone: m[1] === '-',
      kind: m[2],
      view: m[3] ? V1R[m[3]] : undefined,
      q: m[4] && m[4] !== '.' ? Number(m[4]) : undefined,
      fm: m[5] && m[5] !== '.' ? m[5] : undefined,
      crop: m[6] === '#',
      ...(m[7] ? {t: parseInt(m[7], 36)} : {})
    };
  }
  // A code with its time set to t (seconds), replacing the one it had.
  const withT = (code, t) => code.replace(/@[0-9a-z]+$/, '') + '@' + Math.floor(t).toString(36);
  // Every logged photo: {f: {day, code, d}} (a photo is logged once; the latest day wins if two tabs ever logged it).
  function autoIdx(cur) {
    const out = {};
    Object.keys((cur && cur.auto) || {})
      .sort()
      .forEach(day =>
        Object.entries(cur.auto[day] || {}).forEach(([f, code]) => {
          const d = autoParse(code);
          if (d) out[f] = {day, code, d};
        })
      );
    return out;
  }

  // The admin's decision on a photo, read from the curation: keep (add / reject, null = not decided), view, quality,
  // form. Removed (hide, or Remove: admin.js ACT.hide), excluded, rejected (seen cand:) and "not this genus" all count as
  // not kept. "Not this genus" wins over an add: the auto-sort only decides a candidate in its own genus, so a photo sent
  // out of it was not kept there, even when then added in the genus it went to.
  function curIdx(cur) {
    const add = {},
      out = {};
    Object.entries((cur && cur.genera) || {}).forEach(([n, k]) => {
      Object.entries(k.add || {}).forEach(([f, v]) => (add[f] = {n, v: (k.move || {})[f] || v, hid: (k.hide || []).includes(f)}));
      Object.keys(k.out || {}).forEach(f => (out[f] = n));
    });
    return {add, out};
  }
  function pierreOf(cur, ci, f) {
    const a = ci.add[f],
      keep = ci.out[f] || (a && a.hid) ? 'reject' : a ? 'add' : (cur.exclude || {})[f] || (cur.seen || {})['cand:' + f] ? 'reject' : null;
    return {
      keep,
      view: keep === 'add' ? a.v : undefined,
      quality: (cur.quality || {})[f],
      form: fL((cur.gf || {})[f]) || undefined
    };
  }

  // Comparisons between the auto-sort and the admin, field by field: every answered Check (agree or not), and every later
  // correction of an applied or undone auto decision (a disagreement; a decision left alone says nothing). Fields
  // compared only where both sides gave one: view, quality and form only when both added the photo, quality only when he
  // rated it, a field the auto left to him (".") never. In the order he answered or corrected (the code's @t,
  // autoStamp), not the order the auto decided; entries without a time keep the log's order (day, then photo), first.
  // One entry per photo, the one autoIdx keeps: two drafts that logged the same photo on different days are both kept
  // by the Publish merge (merge3), and must count once.
  function autoCompare(cur) {
    const ci = curIdx(cur),
      I = autoIdx(cur),
      out = [];
    Object.keys(I)
      .sort((x, y) => (I[x].day === I[y].day ? (x < y ? -1 : 1) : I[x].day < I[y].day ? -1 : 1))
      .forEach(f => {
        const {day, d} = I[f],
          P = pierreOf(cur, ci, f);
        if (!P.keep) return;
        const A = {keep: d.kind === 'a' ? 'add' : 'reject', view: d.view, quality: d.q, form: d.fm && fL(d.fm)},
          L = [['keep', A.keep, P.keep]];
        if (A.keep === 'add' && P.keep === 'add')
          L.push(['view', A.view, P.view], ['quality', A.quality, P.quality], ['form', A.form, P.form]);
        L.forEach(([field, a, p]) => {
          if (a == null || p == null) return;
          const ok = a === p,
            t = d.t == null ? null : d.t;
          if (d.check) out.push({f, day, field, a, p, ok, how: 'check', t});
          else if (!ok) out.push({f, day, field, a, p, ok, how: 'fix', t});
        });
      });
    // A stable sort: untimed first in the log's order, then by time.
    return out.sort((x, y) => (x.t == null ? -1 : x.t) - (y.t == null ? -1 : y.t));
  }
  // The admin's answer on each compared photo, as a string per photo ({f: sig}): when it changes, he has just answered
  // or corrected that photo (autoStamp).
  function autoSigs(cur) {
    const S = {};
    autoCompare(cur).forEach(c => (S[c.f] = (S[c.f] ? S[c.f] + ' ' : '') + `${c.field}=${c.p}`));
    return S;
  }
  // The comparison time: every photo whose comparisons changed since `before` (autoSigs of the previous draft) gets the
  // time t (seconds) in its log code. Returns the new "auto" map, or null when nothing changed. A photo whose
  // comparisons went away (his answer undone) keeps its code as it is.
  function autoStamp(cur, before, t) {
    const now = autoSigs(cur),
      I = autoIdx(cur);
    let A = null;
    Object.entries(now).forEach(([f, s]) => {
      if (before[f] === s || !I[f]) return;
      const {day, code} = I[f];
      A = A || {...cur.auto};
      A[day] = {...A[day], [f]: withT(code, t)};
    });
    return A;
  }
  // Agreement per field over its last AUTO.win comparisons, and whether its auto is on.
  function autoState(cmp) {
    const S = {};
    AUTO.fields.forEach(k => {
      const L = cmp.filter(x => x.field === k).slice(-AUTO.win),
        ok = L.filter(x => x.ok).length,
        rate = L.length ? ok / L.length : null;
      S[k] = {n: L.length, ok, rate, min: AUTO.min[k], on: L.length < AUTO.n0 || rate >= AUTO.min[k]};
    });
    return S;
  }
  // The admin against himself (blind retests): agreement per field, the ceiling the agent is compared with.
  function retestStats(cur) {
    const S = {quality: {n: 0, ok: 0}, form: {n: 0, ok: 0}};
    Object.values((cur && cur.retest) || {}).forEach(r => {
      [
        ['quality', r.q],
        ['form', r.fm && r.fm.map(fL)]
      ].forEach(([k, v]) => {
        if (!Array.isArray(v) || v.length !== 2 || v[0] == null || v[1] == null) return;
        S[k].n++;
        if (v[0] === v[1]) S[k].ok++;
      });
    });
    Object.values(S).forEach(s => (s.rate = s.n ? s.ok / s.n : null));
    return S;
  }

  // Objective metrics as a sanity flag (tools/photo_metrics.py, metrics.json [sharp, peak, px, cast]): a sure judgment
  // they contradict goes to the admin instead of being applied. Never a decision on their own: they only ever stop one.
  // Measured on 133 photos he rated: size tells Poor apart (AUC 0.90), sharpness at 960 px hardly does (AUC 0.4-0.6), so
  // only the extremes count. ref = {lo, hi}: 5th and 95th percentiles of sharp over the candidates measured.
  function metFlag(s, j, m, ref) {
    if (!s || !Array.isArray(m)) return null;
    const [sharp, , px] = m;
    if (s.keep === 'add' && j.q === 3 && px < 1000) return `small for Good (${px} px)`;
    if (s.keep === 'add' && j.q === 3 && ref && sharp < ref.lo) return 'soft for Good';
    if (s.why === 'poor' && ref && sharp > ref.hi && px >= 1000) return 'sharp for Poor';
    return null;
  }
  // Percentile of a value in a sorted list (0-100), for the evidence line.
  const rankPct = (L, v) => {
    if (!L.length) return null;
    let i = 0;
    while (i < L.length && L[i] < v) i++;
    return Math.round((100 * i) / L.length);
  };

  const API = {
    ROTS,
    rotNorm,
    rotStep,
    rotSet,
    photoAt,
    turnedSize,
    rotDelta,
    rotScale,
    rotCover,
    AUTO,
    fnv,
    autoCheck,
    autoSure,
    fishSure,
    FISHT,
    fishTarget,
    fishParse,
    fishIdx,
    fishMine,
    flagGone,
    fishCompare,
    sortBack,
    fishRun,
    fishUndo,
    fishOwn,
    fishSigs,
    fishStamp,
    treePhotoOn,
    fishState,
    fishPlay,
    fishGameIn,
    fishPhase,
    fishQueue,
    fishNotThis,
    fishSet,
    fishTag,
    fishMarked,
    fishTagsAuto,
    fishTagsMine,
    fishAdd,
    fishReject,
    fishExclude,
    FISHFEAT,
    fishPick,
    fishFeat,
    fishAt,
    fishCover,
    fishCoverJ,
    fishCoverYes,
    fishCoverJOk,
    fishCoverW,
    fishCoverWOk,
    fishOk,
    fishDrop,
    fishOrder,
    fishCoverOf,
    fishCoverRule,
    fishLeafCover,
    fishNear,
    fishRec,
    fishSeenFrom,
    fishJuv,
    fishWm,
    fishUnitPhases,
    FISHEASY,
    fishNeeds,
    fishUnits,
    fishSpecies,
    fishWinkFold,
    fishCov,
    fishWaiting,
    fishLook,
    FISHCOV_TODO,
    fishCovTodo,
    fishCandTodo,
    fishAgree,
    fishPairs,
    FMONT_V,
    fishMontPick,
    fishMontSet,
    autoCode,
    autoParse,
    autoIdx,
    curIdx,
    pierreOf,
    autoCompare,
    autoSigs,
    autoStamp,
    autoState,
    retestStats,
    metFlag,
    rankPct
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

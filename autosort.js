// Auto-sort of the candidate photos (Pierre, 2026-11-03: "take the obvious off my hands, so I almost never validate
// candidates by hand"). Pure functions, no DOM: loaded by admin.html only (players never download it), tested in Node
// (tests/autosort.test.js). admin.js applies the plan to the curation draft (autoRun), which Pierre's Publish sends like
// any of his clicks. Rules and thresholds: docs/ARCHITECTURE.md "Auto-sort", judging/BRIEF.md "What happens to a sure
// judgment".
//
// The log lives in curation.json "auto" {day: {photo: code}} (one map per day the admin decided, so the newest checks
// count most, AUTO.win) and "retest" {photo: {q: [before, again], fm: [before, again]}} (Pierre's blind second answers).
// A code is one short string, so the log stays small in the file every player downloads:
//   [flag] kind [view quality form] [#]
//   flag     ? a Check: not applied, shown to Pierre blind in Candidates; his answer is compared with it
//            - undone by Pierre (Undo on the auto decision): never applied again, his own decision stands
//   kind     a added, r rejected (a "reviewed" mark, as his ✕ Reject), x excluded (as his ×)
//   view     w Colony, m Close-up, c Corallites (the view it was added to)
//   quality  1-3, or . when the quality field was off (left as the dashed first guess)
//   form     the growth form as curation.json gf writes it (B, Mp, x...), or . when the form field was off
//   #        a suggested crop was written with the add
//   @t       when Pierre last answered (a Check) or corrected (an applied or undone decision) this photo: Unix seconds in
//            base 36, written by the admin as he clicks (autoStamp); the agreement window is in that order (autoCompare)
// Examples: "aw2B" added to Colony, Fair, Branching; "am.Mp#" added to Close-up, quality left to Pierre, Massive with
// polyps out, cropped; "r" rejected; "?aw3T" a Check of a sure add; "-r" a rejection Pierre undid; "?aw3T@t5a1kq" a
// Check he answered at that time.
(function (root) {
  const AUTO = {
    // One sure candidate in `every` is a Check (deterministic per photo, autoCheck): about 1 in 20 (Pierre).
    every: 20,
    fields: ['keep', 'view', 'quality', 'form'],
    // A field's auto is off while its agreement with Pierre, over its last `win` comparisons, is under `min`; it needs
    // `n0` comparisons first (with fewer, 7 of 10 or 10 of 10 says little: the 95% interval of 10 answers is +-28 points).
    // keep 0.90: a wrong add puts a photo in the games; measured 133 of 135 (98.5%) on the sure adds Pierre swiped
    //   before the auto-sort (pass of 2026-11-01, not blind). A wrong reject loses one candidate among many, and the
    //   1-in-20 checks and his Undo bring it back.
    // view 0.85: 120 of 133 (90%) on the same photos; a wrong view is a one-click move, and a question of the wrong zoom.
    // quality 0.73: Pierre's own figure (2026-11-03): the blind test of the calibrated pass gave 73%, "good enough since
    //   Elo takes over" (the photo's difficulty comes from players' answers; quality only sets where it starts).
    // form 0.80: growth form is an entry point that ranks, never filters (rule C4), so an error costs less
    //   than a wrong view, more than a quality level; no measure yet.
    min: {keep: 0.9, view: 0.85, quality: 0.73, form: 0.8},
    n0: 10,
    win: 40,
    // Blind self-rating (test-retest): one photo Pierre already rated comes back, blind, once every `retest` candidates
    // he decides in the swiper (rare on purpose).
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

  // What the judging pass is sure of for one candidate (suggest.json "cand" entry j), or null when it is Pierre's:
  // - any field in `u` (unsure): Pierre's;
  // - `exclude` (unusable): excluded, as his ×;
  // - another genus or a comparison image: Pierre's (sending a photo to another genus or to the look-alike comparisons
  //   is his call; a sure comparison image stays set aside as before, admin.js aside);
  // - a near-duplicate, several corals or Poor: rejected, as his ✕ Reject (the pre-sort's rules, judging/BRIEF.md);
  // - the best photo of its observation in its view, Fair or Good, with a view and a growth form: added to that view
  //   with that quality, form and suggested crop;
  // - another angle (alt): Pierre's (an extra angle of a colony already offered is an editorial choice).
  function autoSure(j) {
    if (!j || (j.u && j.u.length)) return null;
    if (j.g === 'exclude') return {keep: 'exclude'};
    if (j.g) return null;
    if (j.k === 'dup' || j.m || j.q === 1) return {keep: 'reject', why: j.k === 'dup' ? 'dup' : j.m ? 'multi' : 'poor'};
    if (j.k === 'best' && V1[j.v] && (j.q === 2 || j.q === 3) && j.fm)
      return {keep: 'add', view: j.v, quality: j.q, form: j.fm, crop: j.c || null};
    return null;
  }

  // The fish candidate pre-sort's sure decision (suggest.json "fish" entry j, tools/judging_fish.py), the fish
  // counterpart of autoSure, or null when it is Pierre's. Same shape as autoSure, so the fish candidates go through the
  // same path (autoRun, the "auto" log, Checks with autoCheck, agreement per field; admin plan PR 4-5).
  // One fish judging vocabulary (Pierre, 2026-11-04, judging/FISH.md): j.jt is the rubric's visual code after its caps
  // (view, whole, light, colour loss, clarity, size, count, flags; the same tags as the game photos' fish-photos.json jt),
  // j.e the ease 1-5, j.k best / alt / dup within the observation, j.ph an IMR sex or colour phase, j.c a crop. Visual
  // criteria only: the species is the iNaturalist experts' identification, never judged here.
  // - any field in `u` (unsure): Pierre's;
  // - a near-duplicate: rejected;
  // - the subject not obvious (count x: which fish is asked about?), other species one could take for the subject at the
  //   game's rank (count k: rule P3) or out of the water (flag a): rejected, as several corals are for corals;
  // - other species in view, not sorted yet (count m, the code before Pierre's split, 2026-11-09, Q323): his, never
  //   added (as k until sorted); other species in view with no risk of confusion (count o): added like one fish.
  //   The counts it may add are core.js FISH_COUNT.play, the same as tools/fish_game.py judged_sure (tests/autosort.test.js).
  // - best or alt with its tags and ease: added (Poor-looking photos too: they stand in for SVS video frames; the ease
  //   says how hard, it is never a reason to set one aside).
  // tools/fetch_fish.py sure_out mirrors the rejects (they free room for the next fetch).
  // The flags after the seven tags: j c a typed by the judge, p (phase) and r (a reference photo, its `rep`) added by the tool.
  const FISH_TAGS = /^[pohtd][01][gdn][0-3][smb][lms][1smxok][jcapr]*$/;
  // The doubts that weigh on the photo itself: every unsure field but the fish's box (bb), whose doubt only withholds the
  // photo's tile (tools/fish_game.py unsure, box_of; Codex review #826).
  const fishUnsure = j => ((j && j.u) || []).filter(x => x !== 'bb');
  function fishSure(j) {
    if (!j || fishUnsure(j).length) return null;
    if (j.k === 'dup') return {keep: 'reject', why: 'dup'};
    if (!FISH_TAGS.test(j.jt || '') || !(j.e >= 1 && j.e <= 5)) return null;
    if (j.jt[6] === 'x') return {keep: 'reject', why: 'unclear'};
    if (j.jt[6] === 'k') return {keep: 'reject', why: 'other species'};
    if (j.jt.slice(7).includes('a')) return {keep: 'reject', why: 'out of water'};
    if (!FISH_COUNT.play.includes(j.jt[6])) return null;
    if (j.k === 'best' || j.k === 'alt') return {keep: 'add', tags: j.jt, ease: j.e, phase: j.ph || null, crop: j.c || null};
    return null;
  }

  // ---- Fish curation (curation.json "fish", admin plan PR 4; Pierre, 2026-11-04) ----
  // The fish choices live under one key, with the coral key names inside: add {f: species id} (in play for that species),
  // seen {f: 1} (rejected, as ✕ Reject), exclude {f: reason} (×), out {f: species id | 'x'} (**Pierre's "Not this"**: the
  // iNaturalist experts got the species wrong; only his click writes it, never an agent or the auto-sort, and a photo he
  // marked so is never proposed again), tags {f: jt}, ease {f: 1-5}, phase {f}, crop {f: [l, t, r, b]} (the judging
  // rubric's fields, judging/FISH.md), auto {day: {f: code}} (the fish auto-sort's log). Coral keys are never touched.
  // Fish log codes: [?|-] a|r [tepc] [@t]: a proposed in, r set aside; ? a Check (not applied, shown to Pierre blind), -
  // undone by Pierre (never applied again); after an a, the fields the run wrote (t tags, e ease, p phase, c crop: a value
  // Pierre had already given is not written, so not listed, and an Undo leaves it alone; Codex review #479); @t when he
  // answered or corrected it (Unix seconds in base 36, as the coral codes).
  const FISHW = {tags: 't', ease: 'e', phase: 'p', crop: 'c'};
  // Observations in play per species (Pierre, 2026-11-04): 8 per circle-1 species, 12 for the PDF's 24 most sighted
  // (fish.json cs, the cheatsheet), at most 20 for now. The auto-sort proposes up to the target; Pierre adds beyond it.
  const FISHT = {obs: 8, top: 12, cap: 20};
  const fishTarget = sp => (sp && sp.cs ? FISHT.top : FISHT.obs);
  function fishParse(code) {
    const m = /^([?-]?)([ar])([tepc]*)(?:@([0-9a-z]+))?$/.exec(code || '');
    if (!m || (m[3] && (m[2] !== 'a' || m[1] === '?'))) return null;
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
  // Pierre's keep on a fish photo: 'reject' (Not this, excluded, rejected: these win over an add), 'add', or null.
  function fishMine(F, f) {
    F = F || {};
    if ((F.out || {})[f] || (F.exclude || {})[f] || (F.seen || {})[f]) return 'reject';
    return (F.add || {})[f] ? 'add' : null;
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
          a = d.kind === 'a' ? 'add' : 'reject';
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
  // decisions written as Pierre's clicks would write them, and the counts. A photo Pierre or the auto-sort decided
  // (added, rejected, excluded, Not this, logged) is never touched; a tag, ease, phase or crop he gave stays his. Adds
  // fill each species up to its target, one observation counting once (an alt joins its observation for free): the
  // easiest first (the first questions need easy photos), then the most reference-like (core.js refScore), then an open
  // licence or Pierre's own before CC BY-NC (core.js rightsRank, a tie-break only: Pierre, 2026-11-08, Q270), then a fixed
  // order, whoever took the photo (Pierre, 2026-11-06: his own photos are never forced; before, they came first); the
  // rest wait as candidates. Off (keepOn false): nothing applied, Checks still drawn.
  const {refScore, refLevel, easyRank, rightsRank, fishOn, fishIn, fishGone, fishPid, FISH_COUNT, fishOther} =
    typeof module !== 'undefined' && module.exports ? require('./core.js') : root;
  function fishRun(cands, sug, species, F, day, keepOn = true) {
    F = F || {};
    const I = fishIdx(F),
      busy = f => fishMine(F, f) || I[f],
      plan = [];
    Object.entries(cands || {}).forEach(([sid, L]) =>
      (L || []).forEach(p => {
        if (!p || !p.f || busy(p.f)) return;
        const s = fishSure((sug || {})[p.f]);
        if (s) plan.push({sid, p, s, check: autoCheck(p.f)});
      })
    );
    const R = {add: 0, reject: 0, check: 0, full: 0, off: 0};
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
    // In play as the swiper counts it (fishOn): a photo Pierre moved with Not this and added to its new species counts
    // there (Codex review #602: fishMine reads its first species, where it is a reject). An add with other species one
    // could take for its subject (core.js fishOther: his tag, his legacy m refined by the pass's; Q323) is out of play,
    // so it holds no room.
    Object.entries(F.add || {}).forEach(([f, sid]) => {
      if (!fishOn(F, f, sid) || fishOther((F.tags || {})[f], ((sug || {})[f] || {}).jt)) return;
      (room[sid] = room[sid] || new Set()).add(obsOf[f] || f);
    });
    const N = {...F, add: {...(F.add || {})}, seen: {...(F.seen || {})}},
      L = {...((F.auto || {})[day] || {})},
      put = (k, f, v) => {
        if (v == null || (F[k] || {})[f] != null) return '';
        N[k] = {...(N[k] || {}), [f]: v};
        return FISHW[k];
      };
    plan.forEach(({sid, p, s, check}) => {
      const f = p.f;
      if (check) {
        L[f] = s.keep === 'add' ? '?a' : '?r';
        return R.check++;
      }
      if (!keepOn) return R.off++;
      if (s.keep === 'add') {
        const r = (room[sid] = room[sid] || new Set()),
          o = p.o || f;
        if (!r.has(o)) {
          if (r.size >= Math.min(fishTarget((species || {})[sid]), FISHT.cap)) return R.full++;
          r.add(o);
        }
        N.add[f] = sid;
        const c = fishCopy({...p, f}, {jt: s.tags, ph: s.phase}, F);
        L[f] = 'a' + put('tags', f, c.tags) + put('ease', f, s.ease) + put('phase', f, c.phase) + put('crop', f, s.crop);
        R.add++;
      } else {
        N.seen[f] = 1;
        L[f] = 'r';
        R.reject++;
      }
    });
    // A map the run created and left empty goes; one that was there stays (as {}: merge3 reads a missing map as removed).
    if (!F.add && !Object.keys(N.add).length) delete N.add;
    if (!F.seen && !Object.keys(N.seen).length) delete N.seen;
    if (R.add + R.reject + R.check) N.auto = {...(F.auto || {}), [day]: L};
    return {F: R.add + R.reject + R.check ? N : F, R};
  }

  // One fish auto decision taken back (Pierre's Undo on it in the Auto details; the coral autoUndo's counterpart; Codex
  // review #479: rule A1, every auto decision undoable one by one). sid: the species of the candidate (its
  // fish-cand.json list). What the run wrote leaves the fish part, and only that: the add while it still names that
  // species, and the fields its code lists (a value Pierre gave before the run was never written, so never listed; a
  // value he sets since takes its field off the list, fishOwn). Nothing is compared with the pass's judgment, which a new
  // judging pass may have replaced (Codex review #479). The log keeps the decision marked undone ('-'): never applied
  // again, the photo waits for him as a candidate. Emptied maps stay as {} (fishOut leaves them out of the file): the
  // Publish merge (merge3) then removes these entries only, never what another device published in the same map.
  function fishUndo(F, f, sid) {
    const x = fishIdx(F)[f];
    if (!x || x.d.check || x.d.undone) return F;
    const N = {...F},
      drop = (k, ok = () => true) => {
        if (!N[k] || !(f in N[k]) || !ok(N[k][f])) return;
        N[k] = {...N[k]};
        delete N[k][f];
      };
    if (x.d.kind === 'a') {
      drop('add', v => v === sid);
      (x.d.w || []).forEach(k => drop(k));
    } else drop('seen', v => v === 1);
    N.auto = {...N.auto, [x.day]: {...N.auto[x.day], [f]: '-' + x.code}};
    return N;
  }
  // A fish field Pierre sets on a photo the auto-sort decided (his tags, ease, phase or crop, admin plan PR 5b) becomes
  // his: its letter leaves the photo's log code, so an Undo of the decision never takes his value away. Every admin action
  // that writes one of these fields goes through it.
  function fishOwn(F, f, field) {
    const x = fishIdx(F)[f],
      c = FISHW[field];
    if (!x || !c || !(x.d.w || []).includes(field)) return F;
    return {...F, auto: {...F.auto, [x.day]: {...F.auto[x.day], [f]: x.code.replace(new RegExp(`^([?-]?[ar][tepc]*?)${c}`), '$1')}}};
  }
  // When Pierre answers a fish Check or corrects a fish auto decision, the time goes into its log code (@t), so the fish
  // agreement window follows the order he answered in, as autoStamp does for the corals (Codex review #400). fishSigs:
  // his keep on each compared photo; fishStamp: the new fish "auto" map with the time t (seconds) on every photo whose keep
  // changed since `before` (fishSigs of the previous draft's fish part), or null when nothing changed.
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

  // ---- Fish Candidates (admin plan PR 5a and 5b; Pierre, 2026-11-04) ----
  // The species' observations in play: {species id: Set of observations}, one observation counting once (a question shows
  // one observation).
  // game: fishGameIn's records (the photos the game plays whatever their route), counted beside the adds. sug: the pass's
  // judgments (suggest.json "fish"): an add held out for other species one could take for its subject (core.js fishOther:
  // his tag, his legacy m refined by the pass's o or k; Q323) is not in play, so it counts nowhere (as fishRun's room).
  function fishPlay(cands, F, game, sug) {
    F = F || {};
    const obsOf = {},
      out = {};
    Object.values(cands || {}).forEach(L => (L || []).forEach(p => p && p.f && (obsOf[p.f] = p.o || p.f)));
    Object.entries(F.add || {}).forEach(([f, sid]) => {
      if (fishOn(F, f, sid) && !fishOther((F.tags || {})[f], ((sug || {})[f] || {}).jt))
        (out[sid] = out[sid] || new Set()).add(obsOf[f] || f);
    });
    (game || []).forEach(p => p && p.sp && (out[p.sp] = out[p.sp] || new Set()).add(p.o || p.f));
    return out;
  }
  // The photos the game plays (fish-game.json records, the published state) that are in play in the draft cur
  // (curation.json): Pierre's adds and the photos that entered by themselves (auto "cand" and "ref", Q180 and Q199) that he
  // has not rejected, excluded or moved (core.js fishIn, as tools/fish_game.py in_play). The admin counts these, not the
  // adds alone; the auto-sort's own target (fishRun) is unchanged.
  function fishGameIn(game, cur) {
    const F = (cur && cur.fish) || {},
      gone = fishGone(cur || {}, F);
    return (game || []).filter(p => p && p.f && p.sp && fishIn(F, p, gone, (F.tags || {})[p.f])).map(p => ({...p, sid: p.sp}));
  }
  // The pass's tags and phase as Add and the auto-sort copy them beside an add (j: the judgment, or the auto-sort's sure
  // values {jt, ph}), with the source's phase (p.st) when the pass gives none: the j flag for a juvenile, else the phase
  // word. Without it the copy would read as the draft's word over the source in fishPhase, and a juvenile by its source
  // would count as an adult once added (Codex review #602); his own edits then change it like any value. F: the curation
  // before the add: tags Pierre already gave the photo (a Juvenile set before Add) are the ones read, never the source's
  // phase over them (Codex review #602).
  function fishCopy(p, j, F) {
    const own = F && p && p.f ? ((F.tags || {})[p.f] ?? null) : null,
      // Pierre described the photo already (his tags, or a phase, No phase included): the source's phase never overrides
      // it (Codex review #602, as fishPhase reads his values).
      mine = own != null || !!(F && p && p.f && p.f in (F.phase || {}));
    let tags = own != null ? own : j && j.jt,
      phase = (j && j.ph) || null;
    if (mine || FPHW[phase] || !FISH_TAGS.test(tags || '') || tags.slice(7).includes('j')) return {tags, phase};
    const src = fishPhase({f: '', st: (p || {}).st}, null, {});
    if (src === 'juvenile') tags = fishTag(tags, 'j');
    else if (src) phase = src;
    return {tags, phase};
  }
  // The swiper's queue (pure): every candidate Pierre has not decided in its species now (fishState: added, rejected,
  // excluded, sent elsewhere with Not this, where it waits as that species' candidate, marked from), each with its species
  // (sid), its observations in play (n) and target (fishTarget), its phase (ph) and four marks:
  // - chk: a Check of the fish auto-sort waiting for his answer (shown blind; never full nor set aside: his to answer);
  // - full: its species is at its target and the photo would add an observation (another photo of an observation in play
  //   adds none, so it stays); the swiper stops there (Pierre, 2026-11-04: "stop at target"), shown on demand;
  // - aside: the pass is sure it goes (fishSure reject: a near-duplicate, the subject not obvious, out of the water) and
  //   the auto-sort did not apply it (its keep is off): shown on demand, as the coral pre-sort's set-aside ones;
  // - nph: it shows a phase none of its species' photos in play shows (5b: "missing phases first").
  // Order: the thinnest species first (in play / target, then the fewest in play), its photos together; within a species
  // the missing phases first, then the pass's best photo of an observation, another angle, not judged, a near-duplicate,
  // then the easiest (the first questions need easy photos), then a reference photo (the flag r: a reference source shows
  // it for the species), then an open licence or his own before CC BY-NC (core.js rightsRank, a tie-break only, Q270),
  // then a fixed order, whoever took the photo (Pierre, 2026-11-06: his own photos are never forced; they came first
  // before).
  const FISHK = {best: 0, alt: 1, dup: 3};
  function fishQueue(cands, sug, species, F, game) {
    F = F || {};
    sug = sug || {};
    const I = fishIdx(F),
      play = fishPlay(cands, F, game, sug),
      byF = {},
      out = [];
    Object.entries(cands || {}).forEach(([sid, L]) => (L || []).forEach(p => p && p.f && (byF[p.f] = p)));
    // The phases each species' photos in play show (an add held out for other species shows none: fishOther, Q323).
    const shows = {};
    Object.entries(F.add || {}).forEach(([f, sid]) => {
      if (!fishOn(F, f, sid) || fishOther((F.tags || {})[f], (sug[f] || {}).jt)) return;
      const ph = fishPhase(byF[f] || {f}, sug[f], F);
      if (ph) (shows[sid] = shows[sid] || new Set()).add(ph);
    });
    // Photos the game already plays by itself (the sure candidates) are not offered again, but for a blind Check.
    const playing = new Set((game || []).map(p => fishPid(p.f)));
    Object.entries(cands || {}).forEach(([orig, L]) =>
      (L || []).forEach(p => {
        if (!p || !p.f) return;
        const {sid, st} = fishState(F, p.f, orig);
        if (st) return;
        if (playing.has(fishPid(p.f)) && !(I[p.f] && I[p.f].d.check && !fishMine(F, p.f))) return;
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
  // Pierre's tag, ease, phase or crop on a fish photo (pure; 5b): field one of tags, ease, phase, crop; v null takes his
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
  // (pos 'j' juvenile, 'c' camouflage), on Pierre's code, else the pass's, else a plain profile one; the tool-made flags
  // (p phase entry, r reference photo) kept as they were, in the rubric's order.
  const FFLAGORD = 'jcapr';
  function fishTag(code, pos, v) {
    const c = /^[pohtd][01][gdn][0-3][smb][lms][1smxok][jcapr]*$/.test(code || '') ? code : 'p1g0sm1';
    if (typeof pos === 'number') return c.slice(0, pos) + v + c.slice(pos + 1);
    const fl = new Set(c.slice(7));
    if (fl.has(pos)) fl.delete(pos);
    else fl.add(pos);
    return c.slice(0, 7) + [...FFLAGORD].filter(x => fl.has(x)).join('');
  }
  // Pierre's Add from the swiper (pure): the photo in play for its species, with the pass's tags, ease, phase and crop
  // written beside it where he has none yet (the fish auto-sort writes its adds the same way, so every photo in play
  // carries its tags and ease for the game, admin plan PR 7), and its "seen" mark taken off (a photo he rejected
  // before and adds now). Not logged as auto: his own decision. A Check he answers this way keeps its log code, which
  // fishCompare reads against his keep.
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
    // until Pierre's own tags (admin plan PR 5b).
    if (j) {
      const c = fishCopy({...(p || {}), f}, j, F);
      put('tags', c.tags);
      put('ease', j.e);
      put('phase', c.phase);
      put('crop', j.c);
    }
    return N;
  }
  // ---- Fish photos in play, Not this, Remove (as in the fish Candidates of admin plan PR 5a and 5b) ----
  // Not this: out {f: species id} = the iNaturalist experts got the species wrong, the photo is that species' candidate
  // now; out {f: 'x'} = no game species (or unknown): gone. Only Pierre's click writes it (fishNotThis). A photo is in play
  // for a species when add names it, it is neither rejected nor excluded, and its out, if any, names that same species
  // (the convention the game reads, admin plan PR 7: core.js fishOn, read from there). fishMine stays the keep on its
  // first species, for the agreement.
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
  // or not known): Pierre's phase and tags when he set any (then the source's annotation is not read), else the pass's
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
  // Tags or a phase the fish auto-sort wrote (its log code lists them) are the pass's, not Pierre's: the source's life stage
  // still shows (Codex review #655). The log index is cached per fish part (a new object at every edit).
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
  // Pierre's Not this (pure): the photo goes to species `to` as its candidate (out {f: to}), or out of every game species
  // ('x'); its add and its rejection go with it (it waits in its new species). Back to its first species (orig) takes the
  // mark off. The fish auto-sort never calls it (Pierre, 2026-11-04: the experts can be wrong, he says so).
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
  // Pierre's Reject (✕), from the swiper or on a photo in play (pure): "seen", and the add taken off when it was in play.
  function fishReject(F, f) {
    F = F || {};
    const N = {...F, seen: {...(F.seen || {}), [f]: 1}};
    if (N.add && f in N.add) {
      N.add = {...N.add};
      delete N.add[f];
    }
    return N;
  }
  // Pierre's × (excluded for good, imports skip it): "exclude", and the add taken off.
  function fishExclude(F, f) {
    F = F || {};
    const N = {...F, exclude: {...(F.exclude || {}), [f]: 'excluded'}};
    if (N.add && f in N.add) {
      N.add = {...N.add};
      delete N.add[f];
    }
    return N;
  }

  // ---- The fish units page (admin plan PR 6, on the book's families: docs/reviews/2026-11-06-fish-units-plan.md §6;
  // Pierre, 2026-11-06: the game's units are the families, genera and species of the book) ----
  // A family's own choices live in curation.json fish genera {family id: {cover: f, feat: {species id: [f]}, ok: true}}:
  // the coral key names (genera, cover, feat, ok), species in place of views, keyed by family id (f:Damselfishes; the
  // plan §4). FISHFEAT photos featured per species at most, as the corals' 3 per view. A genus's and a species' covers
  // sit in the same map under their fish.json ids, {cover: f} only ('g:Chromis', 's091'; Pierre, 2026-11-13: "choisir
  // les couvertures des genres et les couvertures des espèces"): fishPick and fishCover take any unit id.
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
  // Only the featured photos still in play count towards FISHFEAT (one left play elsewhere, e.g. an auto decision undone
  // in Candidates, frees its slot: Codex review #655); a click on one cleans the list of the others.
  function fishFeat(F, tid, sid, f) {
    const L = (((((F || {}).genera || {})[tid] || {}).feat || {})[sid] || []).filter(x => x === f || fishOn(F || {}, x, sid));
    if (!L.includes(f) && L.length >= FISHFEAT) return {F, full: true};
    return {
      F: fishPick(F, tid, k => {
        k.feat = k.feat || {};
        k.feat[sid] = L.includes(f) ? L.filter(x => x !== f) : [...L, f];
      }),
      full: false
    };
  }
  // The family's cover: this photo, or none again (his pick taken off).
  const fishCover = (F, tid, f) =>
    fishPick(F, tid, k => {
      if (k.cover === f) delete k.cover;
      else k.cover = f;
    });
  // Validated, or not.
  const fishOk = (F, tid) =>
    fishPick(F, tid, k => {
      if (k.ok) delete k.ok;
      else k.ok = true;
    });
  // A photo leaving play (Remove, ×, Not this) leaves the family's featured photos and cover too, and any other unit's
  // cover it was: a genus ('g:<Genus>') or a species (its fish.json id), whose covers Pierre picks on the same page
  // (Pierre, 2026-11-13): one Undo step for all.
  const fishDrop = (F, tid, f) => {
    const out = k => {
      if (k.cover === f) delete k.cover;
      Object.keys(k.feat || {}).forEach(s => (k.feat[s] = k.feat[s].filter(x => x !== f)));
    };
    let N = fishPick(F, tid, out);
    Object.entries(N.genera || {}).forEach(([id, k]) => {
      if (id !== tid && k && (k.cover === f || Object.values(k.feat || {}).some(L => (L || []).includes(f)))) N = fishPick(N, id, out);
    });
    return N;
  };
  // The photos of one species in play, in the page's order (L: the photo objects, j(f): the pass's judgment): the featured
  // ones first, in his order; then the game's order (core.js easyRank, #635, #660): reference-level photos first (his
  // ease and tags, else the pass's; a reference source, rep or the flag r), the easiest, the most reference-like
  // (refScore), an open licence or his own before CC BY-NC (rightsRank, Q270), then a fixed hash. Never by who took them
  // (Pierre, 2026-11-06: his own photos are never boosted; the easy and reference photos come first, whoever took them).
  // A photo as core.js easyRank and refLevel read it: his ease and tags, else the pass's (j).
  const fishEase = (p, F, j) => ((F || {}).ease || {})[p.f] || (j(p.f) || {}).e || 0;
  function fishRec(p, F, j) {
    const jt = ((F || {}).tags || {})[p.f] || (j(p.f) || {}).jt || '';
    return {
      f: p.f,
      jt,
      e: fishEase(p, F, j) || undefined,
      rep: p.rep || jt.slice(7).includes('r') || undefined,
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
  // A family's cover: his pick while it is in play (L: the family's photos in play), else its first photo in the game's
  // order across all its species (fishOrder, core.js easyRank, as the game's card cover: reference-level first, whatever
  // the species; Codex review #655), else null.
  // A juvenile photo is never a cover, at any rank, picked or not (Pierre, 2026-11-13: "Un juvénile ne devrait probablement
  // jamais finir en couverture"): his pick on one is ignored, the order's first photo that is not one is taken, and a unit
  // whose photos are all juveniles keeps its first. Juvenile: its phase word (fishPhase, FPHASES: his phase and tags,
  // else the pass's, else the source's life stage; a game record's ph, which tools/fish_game.py writes the same way).
  const FJUV = FPHASES[0];
  function fishJuv(p, j, F) {
    if (!p) return false;
    const mine = p.f in ((F || {}).phase || {}) || p.f in ((F || {}).tags || {});
    return fishPhase(p, j, F) === FJUV || (!mine && p.ph === FJUV);
  }
  // Without his pick, the default cover of a node with leaves (Pierre, 2026-11-13, Q339 (b); 2026-11-14 on #864): among its
  // leaves (species) with a reference-level photo that is not a juvenile (core.js refLevel), the one most seen around the
  // instance's centre by distinct observers (ties: observations, then the game's order), then his ★ cover of that leaf
  // while in play and not a juvenile, else that leaf's first such reference photo in the game's order; with no reference
  // photo under the node, the most seen leaf with an adult photo, his ★ cover of it, else its first adult photo; a node
  // with no presence keeps the order's first.
  // seen(leaf id): [observers, observations] around the centre (fishNear); by default from the species records the admin
  // registers (fishSeenFrom, admin-fish.js). A photo's leaf: the species his curation adds it to (F.add: a photo sent
  // elsewhere with Not this and added there keeps its candidate's first species in sid), else its game record's (sp), else
  // its candidate's (sid). The app's copy: app.js seenCover (tests/fishcovers.test.js holds them together).
  function fishCoverOf(L, F, tid, j = () => null, seen = sid => fishNear(fishSeenOf(sid))) {
    const k = (((F || {}).genera || {})[tid] || {}).cover,
      c = k && L.find(p => p.f === k);
    if (c && !fishJuv(c, j(c.f), F)) return c;
    return (fishCoverRule(L, F, tid, j, seen) || {}).p || null;
  }
  // A leaf's (a species') cover, as the app's sheets show it (learn.js fishSpPhotos, spPhoto): his ★ pick while in play
  // and not a juvenile, else its first photo that is not a juvenile in the page's order (L: featured first, then the game's
  // order: fishOrder), else its first; null for no photo. A leaf has no default rule of its own (Q339 (b) picks among a
  // node's leaves).
  function fishLeafCover(L, F, tid, j = () => null) {
    const k = (((F || {}).genera || {})[tid] || {}).cover,
      adult = p => !fishJuv(p, j(p.f), F);
    L = L || [];
    return (k && L.find(p => p.f === k && adult(p))) || L.find(adult) || L[0] || null;
  }
  // The default alone, whatever his pick on the node (fishCoverOf without it; the admin's Cover proposals, admin-covers.js,
  // set it beside his): {p: the photo, leaf: the leaf it was chosen for, seen: that leaf's [observers, observations], ref:
  // whether the leaves competed on a reference photo, mine: p is his ★ cover of that leaf}; null for no photo.
  function fishCoverRule(L, F, tid, j = () => null, seen = sid => fishNear(fishSeenOf(sid))) {
    const juv = p => fishJuv(p, j(p.f), F),
      R = fishOrder(L, F, tid, '', j).rest,
      A = R.filter(p => !juv(p)),
      Ref = A.filter(p => refLevel(fishRec(p, F, j))),
      leaf = p => ((F || {}).add || {})[p.f] || p.sp || p.sid;
    let best = null;
    (Ref.length ? Ref : A).forEach(p => {
      const s = seen(leaf(p)) || [0, 0];
      if (!best || s[0] > best.s[0] || (s[0] === best.s[0] && s[1] > best.s[1])) best = {p, s};
    });
    if (!best) return R[0] ? {p: R[0], leaf: leaf(R[0]), seen: [0, 0], ref: false, mine: false} : null;
    const sk = (((F || {}).genera || {})[leaf(best.p)] || {}).cover,
      m = sk && A.find(p => p.f === sk);
    return {p: m || best.p, leaf: leaf(best.p), seen: best.s, ref: Ref.length > 0, mine: !!m};
  }
  // A leaf's presence around the instance's centre (Q339: "Il faudra rendre générique la localisation centrale de
  // l'instance"; the centre: tools/instance.json, fish.json centre): [distinct Research Grade observers, observations]
  // from its record's present, nearU and nearN, else their first names (dauinU, dauin: tools/build_fish.py); [0, 0] with
  // none. The app's copy: app.js nearSeen.
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
  // What a family still needs before Pierre's ✓ Validated (Pierre's targets, 2026-11-04, docs/ROADMAP.md "Admin for every
  // subject"): each species' observations in play up to its target (fishTarget: 8, 12 for the cheatsheet's), 5 easy photos
  // per family (ease 4 or 5, judging/FISH.md) and every IMR phase at least once. play: {species id: [photo]} in play,
  // species: {id: fish.json species} (the family's game species), j(f): the pass's judgment.
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

  // The fish units as the admin reads them (the plan §3: fish.json families, genera, species), whatever detail fish.json
  // gives: [{id: 'f:Damselfishes', name (the book's English label), sci: [scientific names], group (key group n), circle,
  // imr (the IMR course's name for it, a tag: Pierre, 2026-11-06 13:38, "the IMR course is a tag on the families and
  // genera in the course"), imrWith (taught by IMR with another family: the Soapfishes with the Groupers), phase,
  // dimorph, wink, look (IMR's look-alike lines: [other family id, words]), species: [ids], genera: [{id: 'g:Chromis',
  // name, imr, species: [ids]}]}]
  // in the book's order (key group, then fish.json's order). A genus's species come from its genus list, else each
  // species' genus, else the species name's first word. [] when fish.json has no families yet.
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

  // Fish Coverage (admin plan PR 8; docs/ROADMAP.md "Admin for every subject" row 8): per family, genus and species, the
  // photos in play, the observations against the target, the easy photos (ease 4-5), the reference photos, the phases shown
  // and what is missing; and the candidates still waiting. U: fishUnits; play: {species id: [photo]} in play; species:
  // {id: fish.json species}; cand: fish-cand.json cand {species id: [photo]}; F: the draft's fish part; j(f): the pass's
  // judgment. Returns {fam: [row], gen: [row], sp: [row]}; a row: {id, name, fam (family id), n (photos), obs, tgt (a
  // species' target; for a genus or family the species at target, ok, of all, of), easy, ref, ph (phases shown), wait
  // (candidates waiting; a species also waitObs, the new observations they hold), need (what is missing, as fishNeeds
  // words), imr}.
  // The candidates waiting (cand: fish-cand.json's, by their first species), by the species they wait in now: one Pierre
  // sent elsewhere with Not this waits there (fishState; Codex review #659); one in play, rejected or gone does not wait.
  // {species id: [photo]}. Read by Coverage and the Tree's node pages.
  function fishWaiting(cand, F) {
    const waiting = {};
    Object.entries(cand || {}).forEach(([orig, L]) =>
      (L || []).forEach(p => {
        const x = fishState(F || {}, p.f, orig);
        if (x.st === null) (waiting[x.sid] = waiting[x.sid] || []).push(p);
      })
    );
    return waiting;
  }
  function fishCov(U, play, species, cand, F, j = () => null) {
    F = F || {};
    const waiting = fishWaiting(cand, F);
    const ease = p => (F.ease || {})[p.f] || (j(p.f) || {}).e || 0,
      isRef = p => !!(p.rep || ((F.tags || {})[p.f] || (j(p.f) || {}).jt || '').slice(7).includes('r')),
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
          // the observations the waiting candidates would add (one observation counts once; Codex review #659)
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
      out = {fam: [], gen: [], sp: []};
    U.forEach(u => {
      const S = u.species.filter(s => species[s] && !species[s].out).map(s => spRow(s, u.id)),
        by = Object.fromEntries(S.map(r => [r.id, r]));
      out.sp.push(...S);
      u.genera.forEach(g => {
        const R = g.species.map(s => by[s]).filter(Boolean);
        if (!R.length) return;
        const r = sum(R, {id: g.id, name: g.name, fam: u.id, imr: g.imr});
        r.need = [...(r.of - r.ok ? [`${r.of - r.ok} species under target`] : []), ...(r.n ? [] : ['No photo in play'])];
        out.gen.push(r);
      });
      const r = sum(S, {id: u.id, name: u.name, fam: u.id, imr: u.imr || (u.imrWith ? 'with ' + u.imrWith : ''), circle: u.circle});
      r.want = fishUnitPhases(u);
      r.need = fishNeeds(u, play, species, F, j);
      out.fam.push(r);
    });
    return out;
  }
  // Where to look (fish): the species most worth a candidate search, those under target whose waiting candidates cannot
  // fill the gap; the IMR course's (circle 1) first, then the PDF's most sighted (cs), then the largest gap. [{...species
  // row, gap}], best first.
  const fishLook = C =>
    C.sp
      .map(r => ({...r, gap: Math.max(0, r.tgt - r.obs - r.waitObs)}))
      .filter(r => r.gap > 0)
      .sort((a, b) => (a.circle || 9) - (b.circle || 9) || b.cs - a.cs || b.gap - a.gap || (a.id < b.id ? -1 : 1));

  // ---- Fish Photo review (admin plan PR 9): Pierre's ease, phase and view on photos in play ----
  // Pierre's value of one field on a photo: fishSet and fishTag of the fish Candidates (#602, above).
  // The agreement line of a review view: over the photos fs where Pierre gave his value and the pass gave one, how often
  // they agree. field: 'ease' (exact, and within one point), 'phase' (fishPhase's words, juvenile included), 'view' (the
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

  // ---- Fish Look-alikes (admin plan PR 10; docs/ROADMAP.md "Admin for every subject" row 10) ----
  // The pairs: two families the IMR course compares (fish.json families look: [other family id, IMR's words]), once each,
  // in the book's order, with every IMR line about them, each with its own source (fish.json families lsrc: the slide,
  // and Pierre's additions; "IMR course" when none is recorded; rule C2, Codex review #667). [{k: 'f:A|f:B' (sorted), A,
  // B (ids, in the book's order), cues: [[family id the line is on, words, source]]}].
  function fishPairs(U) {
    const at = Object.fromEntries((U || []).map((u, i) => [u.id, i])),
      P = {};
    (U || []).forEach(u =>
      (u.look || []).forEach(([b, w]) => {
        if (!(b in at) || b === u.id) return;
        const k = [u.id, b].sort().join('|');
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

  // Photo rotation (Pierre, 2026-11-08; pure, tests/rotate.test.js): curation.json rot {f: 90 | 180 | 270} for the corals,
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
  // made there, then turned, so it covers the tile exactly as the turned file will (Codex review #793: scaling the tile's
  // own cover cut cut the photo twice); the margins keep the tile's own size. Upright or half a turn: nothing to change.
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

  // Pierre's decision on a photo, read from the curation: keep (add / reject, null = not decided), view, quality, form.
  // Removed (hide), excluded, rejected (seen cand:) and "not this genus" all count as not kept. A photo the auto-sort
  // added and Pierre removed with Remove on its genus page loses its add and gets a reject mark (admin.js ACT.hide), so
  // that removal counts as not kept too. "Not this genus" wins over an add: the auto-sort only decides a candidate in
  // its own genus, so a photo sent out of a genus was not kept there, even when Pierre then adds it in the genus it
  // went to (Codex review #400: that add read as an agreement with the wrong genus's add).
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

  // Comparisons between the auto-sort and Pierre, field by field, oldest first: every answered Check (agree or not), and
  // every later correction of an applied or undone auto decision (a disagreement; a decision he left alone says nothing,
  // so it is not counted as an agreement). Fields compared only where both sides gave one: view, quality and form only
  // when both added the photo, quality only when Pierre rated it, a field the auto left to him (".") never.
  // Oldest first = in the order Pierre answered or corrected (the code's @t, autoStamp), not the order the auto decided:
  // a Check from an older run he answers today is among the latest comparisons (Codex review #400). Entries logged
  // without a time (before the stamps) keep the log's order (day, then photo), before every timed one.
  // One entry per photo, the one autoIdx keeps (the latest day): two devices' drafts that logged the same photo on
  // different days are both kept by the Publish merge (merge3), and counting both counted that photo twice (Codex
  // review #400).
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
  // What Pierre's answer on each compared photo is, as a string per photo ({f: sig}): when it changes, he has just
  // answered or corrected that photo (autoStamp).
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
  // Pierre against himself (blind retests): agreement per field, the ceiling the agent is compared with.
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
  // they contradict goes to Pierre instead of being applied. Never a decision on their own: they only ever stop one.
  // Measured on the 133 photos Pierre rated: size tells Poor apart (AUC 0.90; his Poor photos are small), sharpness at
  // 960 px hardly does (AUC 0.4-0.6), so only the extremes count. ref = {lo, hi}: 5th and 95th percentiles of sharp over
  // the candidates measured.
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
    fishCompare,
    fishRun,
    fishUndo,
    fishOwn,
    fishSigs,
    fishStamp,
    fishOn,
    fishState,
    fishPlay,
    fishGameIn,
    fishPhase,
    fishQueue,
    fishNotThis,
    fishSet,
    fishTag,
    fishAdd,
    fishReject,
    fishExclude,
    FISHFEAT,
    fishPick,
    fishFeat,
    fishCover,
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
    fishUnitPhases,
    FISHEASY,
    fishNeeds,
    fishUnits,
    fishCov,
    fishWaiting,
    fishLook,
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

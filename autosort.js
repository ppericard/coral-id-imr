// Auto-sort of the candidate photos (Pierre, 2026-11-03: "take the obvious off my hands, so I almost never validate
// candidates by hand"). Pure functions, no DOM: loaded by admin.html only (players never download it), tested in Node
// (tests/autosort.test.js). admin.js applies the plan to the curation draft (autoRun), which Pierre's Publish sends like
// any of his clicks. Rules and thresholds: docs/ARCHITECTURE.md "Auto-sort", judging/AGENTS.md "What happens to a sure
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
    // form 0.80: growth form is an entry point that ranks, never filters (AGENTS.md rule 4), so an error costs less
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
  // - a near-duplicate, several corals or Poor: rejected, as his ✕ Reject (the pre-sort's rules, judging/AGENTS.md);
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
  // - the subject not obvious (count x: which fish is asked about?) or out of the water (flag a): rejected, as several
  //   corals are for corals;
  // - best or alt with its tags and ease: added (Poor-looking photos too: they stand in for SVS video frames; the ease
  //   says how hard, it is never a reason to set one aside).
  // tools/fetch_fish.py sure_out mirrors the rejects (they free room for the next fetch).
  const FISH_TAGS = /^[pohtd][01][gdn][0-3][smb][lms][1smx][jcap]*$/;
  function fishSure(j) {
    if (!j || (j.u && j.u.length)) return null;
    if (j.k === 'dup') return {keep: 'reject', why: 'dup'};
    if (!FISH_TAGS.test(j.jt || '') || !(j.e >= 1 && j.e <= 5)) return null;
    if (j.jt[6] === 'x') return {keep: 'reject', why: 'unclear'};
    if (j.jt.slice(7).includes('a')) return {keep: 'reject', why: 'out of water'};
    if (j.k === 'best' || j.k === 'alt') return {keep: 'add', tags: j.jt, ease: j.e, phase: j.ph || null, crop: j.c || null};
    return null;
  }

  // ---- Fish curation (curation.json "fish", admin plan PR 4; Pierre, 2026-11-04) ----
  // The fish choices live under one key, with the coral key names inside: add {f: species id} (in play for that species),
  // seen {f: 1} (rejected, as ✕ Reject), exclude {f: reason} (×), out {f: species id | 'x'} (**Pierre's "Not this"**: the
  // iNaturalist experts got the species wrong; only his click writes it, never an agent or the auto-sort, and a photo he
  // marked so is never proposed again), tags {f: jt}, ease {f: 1-5}, phase {f}, crop {f: [l, t, r, b]} (the judging
  // rubric's fields, judging/FISH.md), auto {day: {f: code}} (the fish auto-sort's log). Coral keys are never touched.
  // Fish log codes: [?|-] a|r [@t]: a proposed in, r set aside; ? a Check (not applied, shown to Pierre blind), - undone
  // by Pierre (never applied again), @t when he answered or corrected it (Unix seconds in base 36, as the coral codes).
  // Observations in play per species (Pierre, 2026-11-04): 8 per circle-1 species, 12 for the PDF's 24 most sighted
  // (fish.json cs, the cheatsheet), at most 20 for now. The auto-sort proposes up to the target; Pierre adds beyond it.
  const FISHT = {obs: 8, top: 12, cap: 20};
  const fishTarget = sp => (sp && sp.cs ? FISHT.top : FISHT.obs);
  function fishParse(code) {
    const m = /^([?-]?)([ar])(?:@([0-9a-z]+))?$/.exec(code || '');
    return m && {check: m[1] === '?', undone: m[1] === '-', kind: m[2], ...(m[3] ? {t: parseInt(m[3], 36)} : {})};
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
  // fill each species up to its target, one observation counting once (an alt joins its observation for free): Pierre's
  // own first (AGENTS.md rule 7), then the easiest (the first questions need easy photos), then a fixed order; the rest
  // wait as candidates. Off (keepOn false): nothing applied, Checks still drawn.
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
        !!b.p.own - !!a.p.own ||
        (b.s.ease || 0) - (a.s.ease || 0) ||
        (a.p.f < b.p.f ? -1 : 1)
    );
    const obsOf = {};
    Object.values(cands || {}).forEach(L => (L || []).forEach(p => p && (obsOf[p.f] = p.o || p.f)));
    const room = {};
    Object.entries(F.add || {}).forEach(([f, sid]) => {
      if (fishMine(F, f) !== 'add') return;
      (room[sid] = room[sid] || new Set()).add(obsOf[f] || f);
    });
    const N = {...F, add: {...(F.add || {})}, seen: {...(F.seen || {})}},
      L = {...((F.auto || {})[day] || {})},
      put = (k, f, v) => {
        if (v == null || (F[k] || {})[f] != null) return;
        N[k] = {...(N[k] || {}), [f]: v};
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
        put('tags', f, s.tags);
        put('ease', f, s.ease);
        put('phase', f, s.phase);
        put('crop', f, s.crop);
        L[f] = 'a';
        R.add++;
      } else {
        N.seen[f] = 1;
        L[f] = 'r';
        R.reject++;
      }
    });
    if (!Object.keys(N.add).length) delete N.add;
    if (!Object.keys(N.seen).length) delete N.seen;
    if (R.add + R.reject + R.check) N.auto = {...(F.auto || {}), [day]: L};
    return {F: R.add + R.reject + R.check ? N : F, R};
  }

  // One fish auto decision taken back (Pierre's Undo on it in the Auto details; the coral autoUndo's counterpart; Codex
  // review #479: AGENTS.md rule 8, every auto decision undoable one by one): what the run wrote leaves the fish part
  // unless Pierre changed it since (s: the decision as fishSure gives it, to compare the tags, ease, phase and crop), and
  // the log keeps it marked undone ('-'), so it is never applied again and the photo waits for him as a candidate.
  function fishUndo(F, f, s) {
    const x = fishIdx(F)[f];
    if (!x || x.d.check || x.d.undone) return F;
    const N = {...F},
      drop = (k, v) => {
        if (!N[k] || !(f in N[k]) || (v !== undefined && JSON.stringify(N[k][f]) !== JSON.stringify(v))) return;
        N[k] = {...N[k]};
        delete N[k][f];
        if (!Object.keys(N[k]).length) delete N[k];
      };
    if (x.d.kind === 'a') {
      drop('add');
      if (s && s.keep === 'add')
        ['tags', 'ease', 'phase', 'crop'].forEach(k => drop(k, {tags: s.tags, ease: s.ease, phase: s.phase, crop: s.crop}[k]));
    } else drop('seen', 1);
    N.auto = {...N.auto, [x.day]: {...N.auto[x.day], [f]: '-' + x.code}};
    return N;
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

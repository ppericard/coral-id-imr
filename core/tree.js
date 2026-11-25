  // Fish (fish.json, built by tools/build_fish.py; docs/spec/fish.md "The game's units: families, genera, species"):
  // treeGen(F, photos, sheet) makes each of the book's families a record the engine reads like a coral genus's (app.js
  // GX): {id (f:Damselfishes), name (the book's English name), fam (the line under it), imr, look (family ids), lk (how
  // to tell each apart, IMR's words), qt (the IMR cues), group and forms (its group in the identification key in force,
  // rule S3: the wrong choices start in other groups, as coral growth forms), ig, cm, views {wide} (easyRank order;
  // cover its first), levels 1, circle, wink, names (accepted when typed), first (the starter core)}. Returns {gen, c1
  // / c2 / c3 (each circle's families, all on the path and in the progress), winks (surprise cards, never questions),
  // key ({id, region, cite, short}, null for none), groups, sheet ({species id: [photo]}: a use: 'ref' photo never
  // joins a game, docs/spec/fish-photos.md "Sheet-only photos")}.
  const sheetOnly = p => !!p && p.use === 'ref';
  // The rights a photo comes with (docs/ARCHITECTURE.md "Photo rights tie-break"): 'imr' an IMR lecture photo, 'book' a
  // Coral Finder book photo, 'own' Pierre's own (whatever its licence), 'open' CC0 or CC BY, 'nc' the rest (CC BY-NC, or
  // no licence read). licOf: the photo's licence code, its lic, else read from its credit a ("(CC BY-NC-SA)" ->
  // cc-by-nc-sa, "no rights reserved" -> cc0), null when neither says; the admin's presence.js licence.
  // tools/rights.py is the Python copy of all three (tests/rights.test.js). rightsRank is the tie-break key, last of an
  // order between otherwise-equal photos and never above quality, ease or variety (rule P1): 0 own or open, 1 the rest.
  function licOf(p) {
    if (!p) return null;
    if (p.lic) return String(p.lic).toLowerCase();
    const m = /\((CC0|CC[ -][A-Z -]+?)\)/.exec(p.a || '');
    if (!m) return /no rights reserved/i.test(p.a || '') ? 'cc0' : null; // iNaturalist's CC0 credit
    return m[1] === 'CC0' ? 'cc0' : 'cc-' + m[1].slice(3).toLowerCase().trim().split(/\s+/).join('-');
  }
  // An IMR lecture photo traced to its original source (data.json course pg, the page that credits it) is 'nc', its
  // site's terms (Corals of the World: non-commercial or academic use with citation); one not traced stays 'imr'.
  function rightsClass(p) {
    if (!p) return 'nc';
    if (p.imr) return p.pg ? 'nc' : 'imr';
    if (p.cf) return 'book';
    if (p.own) return 'own';
    return /^(cc0|cc-by)$/.test(licOf(p) || '') ? 'open' : 'nc';
  }
  const rightsRank = p => (/^(own|open)$/.test(rightsClass(p)) ? 0 : 1);
  // How much a judged photo looks like a reference photo (judging/FISH.md, its tags jt): a point for each field-guide
  // trait (profile, whole fish, good light, no colour loss, sharp, large, one fish), a point off for a juvenile,
  // camouflage or out of the water. Read from what the photo shows, never from its route in: the flag r (a reference
  // source shows it for the species) weighs nothing (docs/decisions/2026-11-19-fish-reference-from-photo.md). 0 for a
  // photo with no tags. Ties only: the ease ranks first (easyRank).
  const REF = {good: ['p', '1', 'g', '0', 's', 'l', '1'], bad: 'jca'};
  function refScore(jt) {
    const c = String(jt || '');
    if (c.length < 7) return 0;
    const fl = c.slice(7).replace(/\d+$/, '');
    return REF.good.reduce((t, v, i) => t + (c[i] === v ? 1 : 0), 0) - [...REF.bad].filter(x => fl.includes(x)).length;
  }
  // The order a unit's photos are met in when the order matters (the card's photo, the list's first photos, the sheets):
  // the first photos a player sees are easy, near-reference ones, and the source never ranks (docs/LEARNING.md "Fish:
  // easy, reference-like photos first, whoever took them"). A reference-level photo (refLevel) comes first; then, within
  // each of the two groups, d(p), the photo's difficulty, lower = easier (by default its judged ease, a photo with none
  // as a middle one, 3; app.js passes model.js photoDiff, which blends in the players' answers); then the most
  // reference-like (refScore); then the rights (rightsRank); then a fixed hash of the file name, never the list's order,
  // which says who took a photo. fHash loops over the name's characters as [...f] reads them without building the array
  // (some 15,000 fish photos at each build).
  const fHash = f => {
    let h = 2166136261;
    for (const c of String(f)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return h;
  };
  // Reference level: every photo of reference quality, whoever took it, read from the photo alone (rule P1;
  // docs/decisions/2026-11-19-fish-reference-from-photo.md): a photo judged very easy (ease 4 or 5) whose tags read the
  // reference look (profile, whole, good light, true colours, sharp, large or medium, one fish or a school of it; no
  // juvenile, camouflage or out of water). The route it came in by (rep, the flag r) only lets it into the base first
  // (tools/fish_game.py tier), never places it.
  const REF_LOOK = /^p1g0s[lm][1s]$/;
  // The look's last letter is the count: one kind of fish (1 or s), never a photo with other species in view (o, k, the
  // legacy m) or an unclear subject (x), rule P3 (o is in play, never a reference).
  const refLevel = p => !!p && (p.e || 0) >= 4 && REF_LOOK.test(String(p.jt || '').slice(0, 7)) && !/[jca]/.test(String(p.jt).slice(7));
  const refFirst = p => (refLevel(p) ? 0 : 1);
  // A photo's judged phase (docs/LEARNING.md "Juveniles and colour phases on their unit's mastery"): its record's phase
  // word ph (juvenile, male, female, intermediate: tools/fish_game.py, as autosort.js fishPhase reads it), else 'juvenile' when its
  // tags carry the juvenile flag (judging/FISH.md "Tags": a flag after the code's 7 letters); '' for none, every coral
  // photo among them. The tags' phase flag p marks every photo of an entry whose sexes differ, not the photo's own phase.
  const PHASE_JUV = 'juvenile';
  const phaseOf = p => (!p ? '' : p.ph ? String(p.ph) : /j/.test(String(p.jt || '').slice(7)) ? PHASE_JUV : '');
  // The photo variants on their unit's mastery, one rule for every level (docs/LEARNING.md "Juveniles and colour phases
  // on their unit's mastery"). A variant is a slice of a unit's photos asking the same name (its juveniles, its sexes and
  // colour phases), with no progress of its own: it comes as the unit asked is mastered. Its kind (VAR_KINDS; '' none):
  // jE an early-class juvenile (its family's juvenile class A, or a genus or species in its early list: they help learn
  // the family early), jL a late-class one (class B, or in late), j any other juvenile, ph a sex or colour phase. juv:
  // the family's juvenile classes (fish.json juv: cls, early, late; without them every juvenile is j). A name in early or
  // late is a genus or a species: the photo's taxon t is that name or starts with it and a space.
  const VAR_KINDS = ['', 'jE', 'j', 'jL', 'ph'];
  const varKindOf = (p, juv) => {
    const w = phaseOf(p);
    if (!w) return '';
    if (w !== PHASE_JUV) return 'ph';
    const J = juv || {},
      t = String(p.t || ''),
      hit = L => (L || []).some(x => t === x || t.startsWith(x + ' '));
    return J.cls === 'A' || hit(J.early) ? 'jE' : J.cls === 'B' || hit(J.late) ? 'jL' : 'j';
  };
  // Each kind's thresholds [from, full] on the bar of the unit asked (model.js genScore): a variant photo weighs 0 below
  // from, then rises in a straight line to its full weight at full (a step when they are equal). The defaults, one table
  // for every subject: an early-class juvenile from the unit's first question; another juvenile and a sex or colour
  // phase from Open Water (0.5) to Advanced (0.8); a late-class juvenile at Advanced (0.8), so every variant group is in
  // before the mastery exam opens at 0.85. A family overrides any kind on its record (fish.json varAt, beside juv:
  // tools/fish_source.json), read for its own units and those hanging from it (model.js varAtOf).
  const VAR_AT = {jE: [0, 0], j: [0.5, 0.8], jL: [0.8, 0.8], ph: [0.5, 0.8]};
  const varRamp = (x, at) => {
    const [a, b] = at || [0, 0];
    return x + 1e-9 < a ? 0 : b > a ? Math.min(1, (x - a) / (b - a)) : 1;
  };
  // The variant group a kind belongs to ("Learned" asks a right answer on each group a unit has): its juveniles ('juv',
  // every class), its sexes and colour phases ('ph'); '' none.
  const VAR_GROUPS = ['juv', 'ph'];
  const varGroup = v => (!v ? '' : v === 'ph' ? 'ph' : 'juv');
  // The groups left, in one place for the app and the sync sheet (rules D8, D9: the sheet's replay takes a learned
  // mark away from the answer log for every player at once, the app's exam asks the same groups: model.js varLeft).
  // VAR_FULL: the observations at full weight under which nothing is held back (model.js PICKD.VARIETY; tests check they
  // agree). varUnit(L, juv, at): what the rule reads of a unit's exam photos L (model.js examPics), null when none is a
  // variant: n, the distinct observations of its photos with no variant; v, one [photo file, kind, observation] per
  // variant photo, its observation a small index, -1 when a photo with no variant shares it (counted in n already); at,
  // each kind's thresholds (at(kind): model.js varAtOf). The sheet keeps one per unit (treeVarTable), so its size stays
  // small: no address, no record.
  const VAR_FULL = 3;
  function varUnit(L, juv, at) {
    const plain = new Set(),
      vs = [];
    (L || []).forEach(p => {
      const k = varKindOf(p, juv),
        o = String(p.o || p.f);
      if (k) vs.push([p.f, k, o]);
      else plain.add(o);
    });
    if (!vs.length) return null;
    const ids = [...new Set(vs.filter(x => !plain.has(x[2])).map(x => x[2]))],
      A = {};
    vs.forEach(([, k]) => (A[k] = A[k] || (typeof at === 'function' ? at(k) : (at || {})[k]) || VAR_AT[k] || [0, 0]));
    return {n: plain.size, v: vs.map(([f, k, o]) => [f, k, plain.has(o) ? -1 : ids.indexOf(o)]), at: A};
  }
  // The variant groups of unit U (varUnit) released at bar x (each kind's ramp above 0; every one under the fallback:
  // fewer than VAR_FULL observations at full weight, as model.js varOf) with no photo answered right in ps (the unit's
  // photos {file: [shown, right]}); [] for none. A learned unit's bar is full (scoreOf: s.mx), so every group it has.
  function varLeftOf(U, x, ps) {
    if (!U || !Array.isArray(U.v) || !U.v.length) return [];
    const R = {},
      ramp = k => (k in R ? R[k] : (R[k] = varRamp(x, (U.at || {})[k] || VAR_AT[k]))),
      full = new Set(),
      rel = {},
      ok = {};
    let some = false;
    U.v.forEach(([, k, i]) => (ramp(k) < 1 ? (some = true) : i >= 0 && full.add(i)));
    const on = some && (Number(U.n) || 0) + full.size >= VAR_FULL;
    U.v.forEach(([f, k]) => {
      const g = varGroup(k),
        h = (ps || {})[f];
      if (!on || ramp(k) > 0) rel[g] = 1;
      if (Array.isArray(h) && Number(h[1]) > 0) ok[g] = 1;
    });
    return VAR_GROUPS.filter(g => rel[g] && !ok[g]);
  }
  // The mastery exam passed (model.js EXAM.n right answers, TYPED.exam of them typed; tests check they agree): what the
  // replay keeps of a learned mark it takes away for a variant group (replayedOf), as the app's exam leaves it.
  const MX_EXAM = {n: 5, typed: 2};
  // The variant table the sync sheet's replay reads (SUBJECTS replayed vars; Code.gs subjVar_): {unit id: varUnit} for
  // every unit that can be learned and has a variant photo, made from the subject's pool files as the app makes its units:
  // F, its first file with the structure in force laid over it (contentApply, as Code.gs subjRpl_); Fs, the pool
  // files [fish.json, fish-photos.json, fish-game.json, curation.json]; S, the subject. The families (treeGen over
  // treePhotos, as app.js treeBuild) and the genus units, each with its family's photos of its species (treeGenSets, as
  // app.js treeGenera: the scientific genera of every circle; played at the genus, the species of its unit); a species unit
  // has no exam (app.js noex). Each unit's juvenile classes and thresholds are its family's (model.js varHome, varAtOf).
  // tests/phasepath.test.js checks it is the app's (model.js varLeft over app.js units).
  function treeVarTable(F, Fs, S) {
    const [, ph, gm, cur] = Fs || [],
      X = treeGen(
        F || {},
        treePhotos((ph || {}).photos, (treeGameRead(gm) || {}).photos, treeCur(S, cur)),
        (ph || {}).sheet,
        unitRankOf(S)
      ),
      out = {},
      ok = p => p && p.f && !p.multi,
      put = (id, L, home, own) => {
        const U = varUnit(L.filter(ok), home.juv, k => ((own || {}).varAt || {})[k] || (home.varAt || {})[k] || VAR_AT[k]);
        if (U) out[id] = U;
      };
    Object.values(X.gen).forEach(g => {
      // the unit's photos whole (a player's reserve is split from the units only after this table's build: app.js
      // treeBuild, core.js reserveSplit), so the app's table is the sheet's (model.js examPics, varUnitOf)
      if (!g.wink && !g.rank && !g.parent) put(g.id, (g.views || {}).wide || [], g, g);
    });
    treeGenSets(F, X).forEach(({E, by}) =>
      by.forEach((L, id) => {
        if (!L.length) return;
        const set = new Set(L.map(s => s.id));
        put(
          id,
          ((E.views || {}).wide || []).filter(p => set.has(p.sp) || (!!p.gl && p.sp === id)),
          E
        );
      })
    );
    return out;
  }
  // The explanation card a phase photo brings (quiz.js phaseArm): 'juvenile', 'phase' for a sex or colour phase, '' none.
  // A sex or colour phase only on a photo whose tags carry the phase flag p: its entry is marked dimorph, the IMR
  // presentation saying its sexes or colour phases look different (judging/FISH.md "Tags"; the Parrotfishes, the Anthias),
  // so the card's "males and females can look very different" is sourced (rule C2); a male or a female judged elsewhere
  // (a stingray, a wrasse) brings none.
  const phaseKind = p => {
    const w = phaseOf(p);
    return !w ? '' : w === PHASE_JUV ? 'juvenile' : /p/.test(String(p.jt || '').slice(7)) ? 'phase' : '';
  };
  // The first photo of a question's photos L whose card has not been shown yet (seen(kind)), with its kind; null if none.
  const phaseCardOf = (L, seen) => {
    for (const p of L || []) {
      const k = phaseKind(p);
      if (k && !seen(k)) return {p, k};
    }
    return null;
  };
  // The photo shown beside phase photo p on its card (adult and juvenile, male and female, or the phases): among L, its
  // unit's photos in easyRank order, one of the same species (sp, else the taxon t) in the first phase of PHASE_PAIR that
  // has one ('' an adult with no phase judged); null when there is none.
  const PHASE_PAIR = {juvenile: ['', 'male', 'female'], male: ['female', ''], female: ['male', ''], intermediate: ['male', 'female', '']};
  function phasePair(p, L) {
    const w = phaseOf(p),
      S = (L || []).filter(q => q && q.f !== p.f && (p.sp ? q.sp === p.sp : !!p.t && q.t === p.t));
    for (const want of PHASE_PAIR[w] || ['']) {
      const q = S.find(x => phaseOf(x) === want);
      if (q) return q;
    }
    return null;
  }
  // lic false leaves the rights out: the order the game's draw reads (views.wide), whose ties decide model.js photoSet's
  // variety cut, so the draw never reads a licence; the card photo is the first of the order with them (easyCover).
  function easyRank(L, d = p => -(p.e || 3), lic = true) {
    return (L || [])
      .map(p => ({p, t: refFirst(p), d: d(p), r: refScore(p.jt), l: lic ? rightsRank(p) : 0, h: fHash(p.f)}))
      .sort((a, b) => a.t - b.t || a.d - b.d || b.r - a.r || a.l - b.l || a.h - b.h)
      .map(x => x.p);
  }
  // A unit's card photo: the first of its photos in easyRank order, the rights breaking ties; null with none.
  const easyCover = (L, d) => easyRank(L, d)[0] || null;
  // A family's look-alike lines' sources (treeGen lsrc), by the other family's id.
  const treeLookSrc = t => {
    const L = t.lsrc || Object.fromEntries((t.look || []).map(([id]) => [id, ORG.fishPres + (t.sl ? ', slide ' + t.sl.join(', ') : '')])),
      E = t.esrc || {};
    return Object.keys(E).some(k => k.startsWith('look/'))
      ? Object.fromEntries(Object.entries(L).map(([id, s]) => [id, E['look/' + id] ? `${s}; ${E['look/' + id].t}` : s]))
      : L;
  };
  // The genus a genus-level photo belongs to (gl: its observation agreed at the genus only, sp its genus id; the sea
  // slugs), '' for any other photo: a photo of the genus, never counted for a species.
  const treeGlOf = p => (p && p.gl && p.sp) || '';
  // The genera of a subject played at the genus from the start (treeGen unit 'genus'): [record] in F.genera's order, each
  // {id, name, rank 'genus', one, parent (its family), fam (its family's line), circle (its best species' in a circle),
  // species (those in a circle), look (its sibling genera of the list), views {wide: its family's photos of its species
  // and its own genus-level photos (gl, sp its id: treeGlOf)}, cover}. gen: treeGen's families by id; sp: F's species by
  // id. A genus whose family is not in gen, or a surprise card's, or with no species in a circle, is none.
  function treeGenUnits(F, gen, sp) {
    const inC = id => [1, 2, 3].includes((sp.get(id) || {}).circle),
      L = (F.genera || [])
        .map(G => [G, G && gen[G.family], ((G && G.species) || []).filter(inC)])
        .filter(([G, E, S]) => G && G.id && E && !E.wink && S.length);
    return L.map(([G, E, S]) => {
      const set = new Set(S),
        wide = E.views.wide.filter(p => set.has(p.sp) || treeGlOf(p) === G.id),
        g = {
          id: G.id,
          name: G.name,
          rank: 'genus',
          one: 'genus',
          parent: E.id,
          fam: E.name + (E.fam ? ' · ' + E.fam : ''),
          circle: Math.min(...S.map(id => sp.get(id).circle)),
          species: S,
          look: L.filter(([o, X]) => X === E && o !== G).map(([o]) => o.id),
          views: {wide}
        };
      if (wide.length) g.cover = easyCover(wide).f;
      return g;
    });
  }
  // The genera a subject's game has as genus units, family by family, as the app completes them (app.js treeGenera), the
  // sheet's replay reads them (treeReplayGen) and the variant table holds them (treeVarTable): [{f: the family's record,
  // E: its unit, by: Map(genus id → its species records)}], in F's families' order, each family's genera in its order. X:
  // treeGen's units. Played at the family (the fish): the scientific genera (docs/FISH_PATH.md "Levels"), every genus
  // holding species of the circles of a family in play (a unit of X, never a surprise card's), whatever its circle.
  // Played at the genus from the start (X.unit 'genus': the sea slugs): the genus units treeGen made (treeGenUnits),
  // each with the species of its unit.
  function treeGenSets(F, X) {
    const sp = new Map(((F && F.species) || []).map(s => [s.id, s])),
      gens = new Map(((F && F.genera) || []).map(g => [g.id, g])),
      atGenus = X.unit === 'genus',
      inC = s => !!s && [1, 2, 3].includes(s.circle);
    return ((F && F.families) || [])
      .filter(f => X.gen[f.id] && !X.gen[f.id].wink)
      .map(f => {
        const own = (f.genera || []).map(id => gens.get(id)).filter(Boolean),
          by = atGenus
            ? own
                .filter(G => X.gen[G.id] && X.gen[G.id].parent === f.id)
                .map(G => [G.id, (X.gen[G.id].species || []).map(id => sp.get(id)).filter(Boolean)])
            : own.map(G => [G.id, (G.species || []).map(id => sp.get(id)).filter(inC)]).filter(([, L]) => L.length);
        return {f, E: X.gen[f.id], by: new Map(by)};
      });
  }
  // unit: the rank of the game's units (SUBJECTS unitRank, unitRankOf): 'genus' plays the genera from the start
  // (treeGenUnits); anything else, the families (the fish).
  function treeGen(F, photos, sheet, unit) {
    const gen = {},
      sp = new Map((F.species || []).map(s => [s.id, s])),
      start = new Set((F.start || []).map(id => FISH_RENAMED.ids[id] || id)),
      gens = new Map((F.genera || []).map(g => [g.id, g]));
    // The game photos by family: a photo goes to its species' family (fish-photos.json lists them by old entry id).
    const famOf = new Map();
    (F.families || []).forEach(f => f.species.forEach(id => famOf.set(id, f.id)));
    // The IMR entries teaching each family's species: their other common names (aka) and names in common use (often,
    // corrected gently: Clownfish for Anemonefish) stay accepted when typed.
    const teachOf = new Map();
    (F.teach || [])
      .filter(x => x.level === 1)
      .forEach(x =>
        (x.species || []).forEach(id => {
          const fid = famOf.get(id);
          if (fid) teachOf.set(fid, new Set([...(teachOf.get(fid) || []), x]));
        })
      );
    const byFam = {};
    Object.entries(photos || {}).forEach(([tid, L]) =>
      (L || []).forEach(p => {
        // its entry's family only for a species fish.json does not know: a species out of the game (its family in no
        // circle by the content editor: treeStructure) never lends its photos to the other family of its entry.
        // A genus-level photo (gl, sp its genus id) goes to its genus's family, and plays for its genus unit only
        // (treeGenUnits), never for a species.
        const gl = p && p.gl && gens.get(p.sp),
          fid = gl ? gl.family : famOf.get(p && p.sp) || (sp.has(p && p.sp) ? null : FISH_RENAMED.ids[tid]);
        if (fid) (byFam[fid] = byFam[fid] || []).push(p);
      })
    );
    (F.families || []).forEach(t => {
      // how common its species are: near Dauin for the fish, over the subject's own area where its tree gives one
      // (present.area: the sea slugs' distinct observers in the Philippines)
      const dauin = (t.species || []).reduce((a, id) => {
          const p = (sp.get(id) || {}).present || {};
          return a + ((F.area ? p.area : p.dauin) || 0);
        }, 0),
        imrGen = (t.genera || []).map(id => gens.get(id)).filter(g => g && g.imr);
      gen[t.id] = {
        id: t.id,
        name: t.name,
        // The line under its name: the scientific name or names (the book's family is not always one taxonomic family),
        // then IMR's name when it differs (the IMR tag), or the IMR entry that teaches its species.
        fam: [
          (t.sci || []).join(', '),
          t.imr && t.imr !== t.name ? ORG.short + ': ' + t.imr : '',
          t.imrWith ? ORG.course + ': with the ' + t.imrWith : ''
        ]
          .filter(Boolean)
          .join(' · '),
        wfam: [],
        imrName: t.imr || '', // the IMR tag (IMR's name), read by the opening for "I'm at IMR" (model.js openPick)
        fish: 1,
        circle: t.circle,
        group: t.group || 0,
        ig: t.group || 0,
        forms: t.group ? ['g' + t.group] : [],
        look: [...new Set((t.look || []).map(([id]) => id).filter(id => id !== t.id))],
        lk: (t.look || []).map(([id, txt]) => [id, txt]),
        // Each look-alike line's source: the family's own (fish.json lsrc), else the slides; then the source the content
        // editor gave with a rewording (contentApply esrc).
        lsrc: treeLookSrc(t),
        qt: t.cues && t.cues.length ? t.cues : null,
        // The source given with an edit of its tips (contentApply esrc; rule C2), shown with them (idtips.js tipsList).
        ...(t.cues && t.cues.length && t.esrc && t.esrc.cues ? {qsrc: t.esrc.cues} : {}),
        sum: t.why || t.note || '',
        phase: t.phase || [],
        // The names IMR uses inside it (its sub-entries: Chromis, Anemonefish, Bannerfish...), each once.
        sub: [...new Set(imrGen.map(g => g.imr))],
        cm: Math.round(Math.sqrt(dauin)),
        levels: 1,
        // nd: one of Pierre's own photos taken outside Dauin (the credit's "Dauin" tag is for his Dauin photos).
        views: {
          wide: easyRank(
            (byFam[t.id] || [])
              .filter(p => p && p.f && p.src && !sheetOnly(p))
              .map(p => (p.own && p.loc && p.loc !== 'dauin' ? {...p, nd: 1} : p)),
            undefined,
            false
          )
        },
        ...(start.has(t.id) ? {first: 1} : {}),
        // its taxonomic group's number in the tree's taxa (the sea slugs': tools/seaslug_groups.json), the Learn page's
        // heading above its block (learn.js viewList); display only
        ...(t.tgroup ? {tg: t.tgroup} : {}),
        ...(t.wink ? {wink: t.wink, note: t.note || ''} : {}),
        // Its juvenile classes and its variant thresholds, when it has them (fish.json juv, varAt): the kind of each
        // variant photo of its units and when it comes in (varKindOf, VAR_AT; model.js varKind, varAtOf).
        ...(t.juv ? {juv: t.juv} : {}),
        ...(t.varAt ? {varAt: t.varAt} : {}),
        names: treeNames(t, imrGen, [...(teachOf.get(t.id) || [])]),
        // Its scientific names among them (its own, its IMR genera's, its IMR entries' families): never read in an English
        // plural or singular (treeTypeNames: never "Amphiprions").
        // scopes: the names among them that designate part of it only, an IMR genus or sub-entry (Chromis, Anemonefish,
        // Clownfish, Unicornfish), each with the species it designates (treeTypeNames sc).
        scopes: fishScopes(imrGen, [...(teachOf.get(t.id) || [])]),
        sciNames: [...new Set([...(t.sci || []), ...imrGen.map(g => g.name), ...[...(teachOf.get(t.id) || [])].map(x => x.fam)])].filter(
          Boolean
        ),
        ...([...(teachOf.get(t.id) || [])].flatMap(fishOften).length ? {oft: [...(teachOf.get(t.id) || [])].flatMap(fishOften)} : {})
      };
    });
    Object.values(gen).forEach(g => {
      if (g.views.wide.length) g.cover = easyCover(g.views.wide).f;
    });
    // A subject whose game units are its genera from the start (unit 'genus', SUBJECTS unitRank: the sea slugs): its
    // families stay in gen as structure (the sheets, the blocks, a genus's parent) and its genera are the units of its
    // circles (treeGenUnits); app.js treeGenera completes their records. Otherwise (the fish) the families are the units.
    const byGen = unit === 'genus' ? treeGenUnits(F, gen, sp) : null;
    if (byGen) byGen.forEach(g => (gen[g.id] = g));
    const ids = byGen ? byGen.map(g => g.id) : Object.keys(gen),
      play = n => !gen[n].wink,
      sh = {},
      shAdd = (id, p) => p && p.f && p.src && id && !(sh[id] = sh[id] || []).some(x => x.f === p.f) && sh[id].push({...p, use: 'ref'});
    Object.entries(sheet || {}).forEach(([id, L]) => (L || []).forEach(p => shAdd(id, p)));
    Object.values(photos || {}).forEach(L => (L || []).filter(sheetOnly).forEach(p => shAdd(p.sp, p)));
    return {
      gen,
      sheet: sh,
      c1: ids.filter(n => play(n) && gen[n].circle === 1),
      c2: ids.filter(n => play(n) && gen[n].circle === 2),
      c3: ids.filter(n => play(n) && gen[n].circle === 3),
      winks: Object.keys(gen).filter(n => !play(n)),
      key: F.key ? {id: F.key.id, region: F.key.region, cite: F.key.cite, short: F.key.short} : null,
      groups: (F.key && F.key.groups) || [],
      // the taxonomic groups its families sit in (the tree's taxa: {cite, short, groups [{n, title}]}), when it has them
      ...(F.taxa ? {taxa: F.taxa} : {}),
      ...(byGen ? {unit: 'genus'} : {})
    };
  }
  // The fish units as the full replay reads them (replayProgress gen: each unit's look-alikes and family line, for the
  // look-alike prior of a mix-up and the unit wrongly given): the families of treeGen, the scientific genera of app.js
  // treeGenera (treeGenSets: each with its sibling genera as look-alikes and its family's line) and the species units,
  // from fish.json alone (no photo changes them). The sync sheet builds it from fish.json (Code.gs subjGen_);
  // tests/fishreplay.test.js checks it against the app's units. unit 'genus' (the sea slugs): the genus units treeGen
  // plays from the start (treeGenUnits), and no scientific genera or common-name species units.
  // Both: the species by their scientific names (treeSpUnits 'sci', under their genus units), so the sheet replays an
  // answer on one as the game scores it (SCI_SHEET; docs/reviews/2026-11-18-species-step2-plan.md §2.6).
  function treeReplayGen(F, unit) {
    const X = treeGen(F || {}, {}, undefined, unit),
      out = {},
      gens = new Map(((F && F.genera) || []).map(g => [g.id, g])),
      sci = () => treeSpUnits(F || {}, X, 'sci').forEach(u => (out[u.id] = {look: u.look.slice(), fam: u.fam, from: u.from}));
    Object.values(X.gen).forEach(g => (out[g.id] = {look: g.look.slice(), fam: g.fam}));
    if (X.unit === 'genus') {
      // and the genera a specialist source names as its look-alikes (the tree's genus look, across families), as
      // app.js treeGenera adds them, so the sheet's replay reads the app's units
      Object.keys(out).forEach(id => {
        const G = gens.get(id);
        if (G && Array.isArray(G.look)) out[id].look = [...new Set([...out[id].look, ...G.look.filter(o => X.gen[o])])];
      });
      sci();
      return out;
    }
    treeGenSets(F, X).forEach(({E, by}) => {
      const ids = [...by.keys()];
      ids.forEach(id => (out[id] = {look: ids.filter(o => o !== id), fam: E.name + (E.fam ? ' · ' + E.fam : '')}));
    });
    // The species units (treeSpUnits, below), each with its look-alikes, its family line and the unit it starts from
    // (from: abilityOf), so the replay counts a species picked wrongly as the game does (rule L2) and starts a species
    // from its family's ability as the game does.
    treeSpUnits(F || {}, X).forEach(u => (out[u.id] = {look: u.look.slice(), fam: u.fam, from: u.from}));
    sci();
    return out;
  }
  // The levels of a tree subject's units (Q398, the integrator's call: docs/reviews/2026-11-18-species-step2-plan.md
  // §2.1), one table that every part building or reading a species unit reads (treeSpUnits, treeReplayGen,
  // treeScoreTree; Code.gs unitUp_), never a prefix of its own: pre, the prefix of its ids; rank, the rank it is logged
  // at; kind, the name a species level is asked by (cn its common names, sci its scientific name); parent, the level it
  // hangs from (the unit it starts from, abilityOf from, and opens after); plain, its ids keep letters and digits only
  // after the prefix (a key the log's and the board's patterns always pass: sci:xgoniobranchussp5).
  const LEVELS = {
    family: {pre: 'f:', rank: 'family', parent: null},
    genus: {pre: 'g:', rank: 'genus', parent: 'family'},
    cn: {pre: 's:', rank: 'species', kind: 'cn', parent: 'family'},
    sci: {pre: 'sci:', rank: 'species', kind: 'sci', parent: 'genus', plain: true}
  };
  // A species' unit id at a species level (LEVELS cn or sci): s:s091, sci:s091, sci:xgoniobranchussp5.
  const spUnitId = (lv, id) => LEVELS[lv].pre + (LEVELS[lv].plain ? String(id).replace(/[^A-Za-z0-9]/g, '') : String(id));
  // A unit's level (its LEVELS key), '' for a unit with no prefix (a coral genus).
  const levelOf = id => Object.keys(LEVELS).find(k => String(id || '').startsWith(LEVELS[k].pre)) || '';
  // The species units of a tree subject at species level lv (docs/spec/fish-game.md "Fish species, step 1: by common
  // name" and "Species by scientific name (step 2)"): 'cn' (the default), s:<species id>, by common name; 'sci',
  // sci:<the id in letters and digits> (spUnitId), by scientific name. Each with s (its fish.json record), family, fam,
  // look (the other species units of its family, rule L7), from (the unit a species never answered starts from,
  // abilityOf: its family at 'cn'; at 'sci' its genus unit, also its genus) and decl (its declared look-alikes,
  // spDecl). X: treeGen's units when built already (at 'sci', at the subject's unit rank). The app's units (app.js
  // treeGenera) and the sheet's replay (treeReplayGen) read this one list.
  function treeSpUnits(F, X, lv = 'cn') {
    const X0 = X || treeGen(F || {}, {}),
      G = X0.gen,
      sp = new Map(((F && F.species) || []).map(s => [s.id, s])),
      out = [];
    if (lv === 'sci') {
      treeGenSets(F || {}, X0).forEach(({f, E, by}) => {
        const gOf = new Map([...by].flatMap(([g, L]) => L.map(s => [s.id, g]))),
          L = [...new Set([...(f.species || []).filter(id => gOf.has(id)), ...gOf.keys()])].map(id => sp.get(id)).filter(Boolean),
          ids = L.map(s => spUnitId('sci', s.id)),
          fam = E.name + (E.fam ? ' · ' + E.fam : '');
        L.forEach((s, i) =>
          out.push({id: ids[i], s, family: f.id, genus: gOf.get(s.id), look: ids.filter(o => o !== ids[i]), fam, from: gOf.get(s.id)})
        );
      });
      return spDecl(out, lv);
    }
    ((F && F.families) || []).forEach(f => {
      const E = G[f.id];
      if (!E || E.wink) return;
      const L = (f.species || []).map(id => sp.get(id)).filter(s => s && (s.cn || []).length),
        ids = L.map(s => spUnitId('cn', s.id)),
        fam = E.name + (E.fam ? ' · ' + E.fam : '');
      L.forEach((s, i) => out.push({id: ids[i], s, family: f.id, look: ids.filter(o => o !== ids[i]), fam, from: f.id}));
    });
    return spDecl(out, lv);
  }
  // A species unit's declared look-alikes (decl; model.js declaredOf), as a genus unit's are (app.js treeGenera decl): the
  // species its record's look names (the decided species pairs a specialist source names, tools/seaslug_source.json
  // lookalikes: Q377, Q390 D; a row [id, words] or the id), at the same level, those with a unit of their own only. Its
  // look holds them too, after the other species of its family: the same set when the pair is inside one family, as every
  // decided pair is, so the sheet's replay (treeReplayGen, which reads look, never decl) is unchanged. No look: decl empty.
  function spDecl(out, lv) {
    const has = new Set(out.map(u => u.id));
    out.forEach(u => {
      u.decl = [...new Set(((u.s && u.s.look) || []).map(y => spUnitId(lv, pairIdOf(y))))].filter(o => o !== u.id && has.has(o));
      u.look = [...new Set([...u.look, ...u.decl])];
    });
    return out;
  }
  // The tree of the fish global score as the app makes it (app.js UNITS tree: treeScoreTree over treeGen's families and
  // the scientific genera), from fish.json alone. The sync sheet ranks the fish leaderboard by it, made with its replay's
  // units under the structure in force (SUBJECTS replayed tree; Code.gs subjRpl_, board_), so a circle Publish moves the
  // board's weights with the replays, whether a device saves or not. tests/structure.test.js checks it is the app's
  // tree, with and without a structure edit. With the species units (SPECIES_SHEET; app.js treeSp), a player with no
  // species unit gets the same % on either tree (the few species whose common and cn fields disagree move the raw score
  // by about 1e-6).
  // With the scientific species (SCI_SHEET; treeScoreTree sci): every species with a scientific unit has its own entry,
  // that unit in its scientific place; a player with no such unit answered gets the same % as on the tree without them.
  function treeBoardTree(F) {
    const X = treeGen(F || {}, {});
    return treeScoreTree({...X, gen: {...treeReplayGen(F), ...X.gen}}, F || {}, true, true);
  }
  // The fish structure in force (SUBJECTS fish structure apply; docs/spec/content.md "Structure: circles and look-alike
  // pairs", The fish): fish.json F with the content editor's circles and pairs X ({circle: Map family id -> 1, 2, 3 or
  // null, pairs: [{a, b, v: 1 or null, src}]}, each a change from F: structApply) written as the build writes them. An
  // added pair's line has no words and its source is the editor's, else EDITOR_PAIR. A new object sharing every record
  // it does not change; F itself when X changes nothing.
  const EDITOR_PAIR = 'Added by the content editor';
  function treeStructure(F, X) {
    const C = (X && X.circle) || new Map(),
      P = (X && X.pairs) || [],
      fams = F.families || [],
      base = new Map(fams.map(f => [f.id, f.circle])),
      now = id => (C.has(id) ? C.get(id) : base.get(id)),
      moved = new Set([...C.keys()].filter(id => base.has(id) && C.get(id) !== base.get(id))),
      gone = new Set([...base.keys()].filter(id => now(id) == null));
    if (!moved.size && !P.length) return F;
    const out = {...F},
      rows = f => (Array.isArray(f.look) ? f.look : []),
      has = (f, o) => rows(f).some(y => Array.isArray(y) && y[0] === o),
      add = new Map(),
      drop = new Map(),
      put = (m, k, v) => m.set(k, [...(m.get(k) || []), v]);
    P.forEach(x => {
      if (gone.has(x.a) || gone.has(x.b)) return;
      if (x.v === 1) (put(add, x.a, [x.b, x.src]), put(add, x.b, [x.a, x.src]));
      else (put(drop, x.a, x.b), put(drop, x.b, x.a));
    });
    out.families = fams
      .filter(f => !gone.has(f.id))
      .map(f => {
        const A = (add.get(f.id) || []).filter(([o]) => !has(f, o)),
          D = new Set([...(drop.get(f.id) || []), ...gone]),
          cut = rows(f).some(y => Array.isArray(y) && D.has(y[0]));
        if (!moved.has(f.id) && !A.length && !cut) return f;
        const r = {...f};
        if (moved.has(f.id)) r.circle = now(f.id);
        if (cut || A.length) r.look = [...rows(f).filter(y => !(Array.isArray(y) && D.has(y[0]))), ...A.map(([o]) => [o, ''])];
        if (A.length) r.lsrc = {...treeLookSrc({...f, esrc: null}), ...Object.fromEntries(A.map(([o, s]) => [o, s ? s.t : EDITOR_PAIR]))};
        return r;
      });
    if (!moved.size) return out;
    out.genera = (F.genera || []).filter(g => !gone.has(g.family)).map(g => (moved.has(g.family) ? {...g, circle: now(g.family)} : g));
    out.species = (F.species || []).map(s => {
      if (!moved.has(s.family)) return s;
      if (!gone.has(s.family)) return {...s, circle: now(s.family)};
      const r = {...s};
      ['circle', 'family', 'genus', 'cmi'].forEach(k => delete r[k]);
      return {...r, out: 'family in no circle'};
    });
    const famOf = new Map((F.species || []).filter(s => s.family).map(s => [s.id, s.family]));
    out.teach = (F.teach || []).map(t => {
      const fs = [...new Set((t.species || []).map(id => famOf.get(id)).filter(Boolean))];
      if (!fs.some(id => moved.has(id))) return t;
      const cs = fs.map(now).filter(c => c != null),
        r = {...t};
      if (cs.length) r.circle = Math.min(...cs);
      else delete r.circle;
      return r;
    });
    if (Array.isArray(F.start)) {
      const tc = new Map(out.teach.map(t => [t.id, t.circle]));
      out.start = F.start.filter(id => tc.get(id) === 1);
    }
    return out;
  }
  // ---- Genera by name: the structure of a subject whose units are data.json's genus records ----
  // Where its genus records sit: gen (the slate) and x.gen (Millepora, the bonus and Coral ID Key genera), by name.
  const GEN_AT = ['gen', 'x.gen'];
  // The units its replay reads (Code.gs dataJson_ and subjRpl_, replayProgress gen): each genus of d's gen and
  // x.gen (gen's first) with its look-alikes (look, names only) and its family (fam).
  function genLooks(d) {
    const out = {};
    GEN_AT.forEach(at => {
      const G = atPath(d || {}, at);
      Object.keys(isObj(G) ? G : {}).forEach(n => {
        if (!out[n] && isObj(G[n]))
          out[n] = {look: (Array.isArray(G[n].look) ? G[n].look : []).filter(x => typeof x === 'string'), fam: String(G[n].fam || '')};
      });
    });
    return out;
  }
  // The pairs in force written into data.json R (SUBJECTS structure apply), by lookStructure on the genus records: an
  // added pair's lsrc line is the source the editor gave, else EDITOR_PAIR (never IMR's or the Coral Finder's words).
  function genStructure(R, X) {
    return lookStructure(R, X, GEN_AT, (old, s) => old || (s ? s.t : EDITOR_PAIR));
  }
  // The look-alike pairs in force written into built file R (SUBJECTS structure apply; docs/spec/content.md "The
  // corals' structure" and "The sea slugs' structure"), for a subject whose pairs are node ids in each record's look
  // with their lines in its lsrc by the other id: the editor's pairs X ({pairs: [{a, b, v: 1 or null, src}]}, each a
  // change from R: structApply) on both records of each pair. at: where the records sit (paths of lists by id or of
  // maps by name, as contentRecs reads them); line(old, src): an added pair's lsrc line, from the record's line for
  // that other node (undefined: none) and the editor's source (null: none). A new object sharing every record it does
  // not change; R itself when X changes nothing.
  function lookStructure(R, X, at, line) {
    const P = (X && X.pairs) || [];
    if (!P.length) return R;
    const add = new Map(),
      drop = new Map(),
      put = (m, k, v) => m.set(k, [...(m.get(k) || []), v]);
    P.forEach(x => (x.v === 1 ? (put(add, x.a, [x.b, x.src]), put(add, x.b, [x.a, x.src])) : (put(drop, x.a, x.b), put(drop, x.b, x.a))));
    const made = new Map(),
      one = (id, g) => {
        if (made.has(g)) return made.get(g);
        const look = Array.isArray(g.look) ? g.look : [],
          ls = isObj(g.lsrc) ? g.lsrc : {},
          D = new Set(drop.get(id) || []),
          A = (add.get(id) || []).filter(([o], i, L) => !look.includes(o) && L.findIndex(y => y[0] === o) === i),
          now = new Set(A.map(([o]) => o));
        let r = g;
        if (A.length || look.some(o => D.has(o)) || Object.keys(ls).some(o => D.has(o))) {
          const l2 = Object.fromEntries(Object.entries(ls).filter(([o]) => !D.has(o)));
          A.forEach(([o, s]) => (l2[o] = line(l2[o], s || null)));
          r = {...g, look: [...look.filter(o => !D.has(o)), ...A.map(([o]) => o)], lsrc: l2};
          if (Array.isArray(g.dlook) && g.dlook.some(o => now.has(o))) {
            const dl = g.dlook.filter(o => !now.has(o));
            if (dl.length) r.dlook = dl;
            else delete r.dlook;
          }
        }
        made.set(g, r);
        return r;
      },
      out = {...R},
      done = new Set();
    (Array.isArray(at) ? at : [at]).forEach(a => {
      const G = atPath(R, a),
        L = Array.isArray(G)
          ? G.map((g, i) => [isObj(g) && g.id != null ? String(g.id) : null, i])
          : Object.keys(isObj(G) ? G : {}).map(n => [n, n]);
      L.forEach(([n, i]) => {
        if (n == null || !isObj(G[i]) || (!add.has(n) && !drop.has(n))) return;
        const r = one(n, G[i]);
        if (r !== G[i]) contentBox(out, R, a, done)[i] = r;
      });
    });
    return done.size ? out : R;
  }
  // The pairs of a subject whose lsrc lines are lists of sources [{t, u}] (the sea slugs' genera, seaslug.json genera,
  // tools/seaslug_game.py genus_looks; SUBJECTS structure apply): an added pair's line is the sources its record holds
  // already for it (a data look-alike's iNaturalist counts) with the editor's after them, else the editor's alone, else
  // EDITOR_PAIR's words as its one source.
  function srcsStructure(F, X) {
    return lookStructure(F, X, 'genera', (old, s) => {
      const L = Array.isArray(old) ? old : [];
      return s ? [...L, s] : L.length ? L : [{t: EDITOR_PAIR}];
    });
  }
  // The ★ rule under the content editor's pairs (rule L5): a starred genus is on the slate because
  // it looks like surveyed genera, and opens only after the ones its card names (starRefs: its own look-alikes that are
  // surveyed genera of the lecture group it is shown in). Every starred genus of the base has some; a withdrawn pair could
  // leave one with none (Alveopora and Halomitra have one look-alike each), and it would then open at any time and be
  // shown in no group. Of the pair changes P that apply ([{key, a, b, v}]: structEntries), the withdrawals refused: every
  // addition first (they only add references), then the withdrawals in key order, each refused when it leaves a starred
  // genus of either side with no reference, so two devices' withdrawals merged keep the first and hold the other,
  // whatever order they were made in. A Set of their keys (structEntries: orphaned, why hold; never applied).
  function starHold(R, P) {
    const held = new Set(),
      W = (P || []).filter(x => x.v !== 1).sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
    if (!W.length) return held;
    const G = (R && R.gen) || {},
      X = xGen(R),
      d = {gen: {}, x: {gen: {}}},
      copy = g => ({...g, look: Array.isArray(g.look) ? g.look.slice() : []});
    Object.keys(X).forEach(n => isObj(X[n]) && (d.x.gen[n] = copy(X[n])));
    Object.keys(G).forEach(n => isObj(G[n]) && (d.gen[n] = G[n] === X[n] ? d.x.gen[n] : copy(G[n])));
    const rec = n => d.gen[n] || d.x.gen[n],
      star = n => !!d.gen[n] && !d.gen[n].n && !d.x.gen[n] && starRefs(R, n).length > 0;
    (P || [])
      .filter(x => x.v === 1)
      .forEach(x => {
        const a = rec(x.a),
          b = rec(x.b);
        if (!a || !b) return;
        if (!a.look.includes(x.b)) a.look.push(x.b);
        if (!b.look.includes(x.a)) b.look.push(x.a);
      });
    W.forEach(x => {
      const a = rec(x.a),
        b = rec(x.b);
      if (!a || !b) return;
      const la = a.look,
        lb = b.look;
      a.look = la.filter(o => o !== x.b);
      b.look = lb.filter(o => o !== x.a);
      if ([x.a, x.b].some(n => star(n) && !starRefs(d, n).length)) {
        a.look = la;
        b.look = lb;
        held.add(x.key);
      }
    });
    return held;
  }
  // The fish game photos: the photos in play (Pierre's adds, the candidates and reference photos judged sure), downloaded
  // to R2 (fish-game.json, tools/fish_game.py, run by the Candidate photos workflow after each Publish). No fish photo is
  // shown straight from iNaturalist or FishBase.
  // treePhotoOn(F, f, sid): photo f is in play for species sid, F being curation.json fish: add names sid, the photo is neither
  // rejected (seen) nor excluded, and its Not this (out), if set, names that same species (tools/fish_game.py fish_on is
  // its copy).
  const treePhotoOn = (F, f, sid) => {
    const o = ((F && F.out) || {})[f];
    return ((F && F.add) || {})[f] === sid && !(F.seen || {})[f] && !(F.exclude || {})[f] && (!o || o === sid);
  };
  // The count tag (judging/FISH.md "Tags", the code's 7th letter) and play: 1 one fish, s several of its kind, o other
  // species in view with no risk of taking one for the subject at the game's rank (in play), k other species one could
  // take for the subject at that rank (never in play: rule P3), x the subject not obvious; m, the legacy code for other
  // species before o and k, reads as not sorted yet, so as k until it is sorted.
  // TREE_COUNT.play: the counts an automatic route may put in play (autosort.js fishSure, tools/fish_game.py
  // judged_sure); TREE_COUNT.other: the counts never in play, whatever the route, Pierre's adds included.
  const TREE_COUNT = {play: '1so', other: 'km'};
  // treeCount(mine, pass): the count in force on a photo, from Pierre's tags (mine, curation.json fish tags) first, else
  // the pass's or the game record's (pass, a jt); his legacy m is refined by the pass's o or k (the re-judge, which
  // tools/fish_game.py writes into the game record's jt). '' with no tag. tools/fish_game.py count_of is its copy.
  const treeCount = (mine, pass) => {
    const c = String(mine || '').charAt(6),
      q = String(pass || '').charAt(6);
    return c === 'm' && /^[ok]$/.test(q) ? q : c || q;
  };
  // A photo with other species one could take for its subject, or not sorted yet (k, m): never in play (rule P3).
  const treeOther = (mine, pass) => {
    const c = treeCount(mine, pass);
    return !!c && TREE_COUNT.other.includes(c);
  };
  // treePhotoIn(F, p, gone): game record p (fish-game.json) is in play, the one notion of "in play": Pierre's own add (treePhotoOn
  // on its species), or a photo that entered by itself (p.auto: a candidate judged sure, a reference photo judged at the
  // reference level; tools/fish_game.py in_play) whose photo id (treePid) he did not reject, exclude or move with Not
  // this (gone: treeGone; tools/fish_game.py fish_in is its copy). An auto-sort add he undid (log code '-a...',
  // autosort.js fishUndo) counts as decided against too. Never a photo whose count in force (treeCount) is other species
  // one could take for its subject (treeOther): the admin passes his tag (mine), so it applies at once there; the
  // players' curation leaves the tags out (tools/curplay.py), so the app reads the record's jt.
  const treeGone = (cur, F = (cur && cur.fish) || {}) =>
    new Set(
      [
        ...['seen', 'exclude', 'out'].flatMap(k => Object.keys(F[k] || {})),
        ...Object.values(F.auto || {}).flatMap(d => Object.keys(d || {}).filter(f => /^-a/.test(String(d[f])))),
        ...Object.keys((cur && cur.exclude) || {})
      ].map(f => treePid(f))
    );
  // mine: Pierre's tag on the photo (curation.json fish tags), passed by the admin only (autosort.js fishGameIn).
  const treePhotoIn = (F, p, gone, mine) =>
    !!p && (treePhotoOn(F, p.f, p.sp) || (!!p.auto && !gone.has(treePid(p.f)))) && !treeOther(mine, p.jt);
  // A photo's identity across the lists (tools/fish_game.py pid): i + its iNaturalist photo id (sheet photo fi<id>, candidate
  // fish-<species>-cand-<id>), b + its FishBase file stem (candidate fish-<species>-cand-fb-<stem>, reference or sheet
  // photo fb<stem>, so Pierre's curation of a FishBase candidate applies to its reference copy too),
  // else its name.
  function treePid(f) {
    const s = String(f),
      m = /^fi(\d+)$/.exec(s) || /-cand-(\d+)[cd]?$/.exec(s),
      b = /-cand-fb-(.+)$/.exec(s) || /^fb(.+)$/.exec(s);
    return m ? 'i' + m[1] : b ? 'b' + b[1] : s;
  }
  // fish-game.json's short form (docs/ARCHITECTURE.md "Fish content"; tools/fish_short.py writes it, this is its copy):
  // a record's o, an iNaturalist observation, as its id alone, and its src, the original on iNaturalist's open-data
  // bucket, as its extension alone when the photo is the record's own (the id in its name, treePid). treeGameRow gives a
  // record its addresses back, keys in their order; a record already whole is the same object. treeGameRead: the file,
  // every record whole. Every reader of fish-game.json reads it through treeGameRead: the app (fishLoad), the admin, the
  // sheet's photo pools (POOLS entries), the tools and the tests.
  const TREE_OBS = 'https://www.inaturalist.org/observations/',
    TREE_ORIG = 'https://inaturalist-open-data.s3.amazonaws.com/photos/';
  const treeGameRow = p => {
    if (!p || typeof p !== 'object') return p;
    const id = (/^i(\d+)$/.exec(treePid(p.f)) || [])[1],
      o = typeof p.o === 'string' && /^\d+$/.test(p.o),
      s = typeof p.src === 'string' && /^[a-z0-9]{2,5}$/.test(p.src) && !!id;
    if (!o && !s) return p;
    return {...p, ...(o ? {o: TREE_OBS + p.o} : {}), ...(s ? {src: TREE_ORIG + id + '/original.' + p.src} : {})};
  };
  const treeGameRead = G =>
    G && G.photos && typeof G.photos === 'object'
      ? {...G, photos: Object.fromEntries(Object.entries(G.photos).map(([t, L]) => [t, Array.isArray(L) ? L.map(treeGameRow) : L]))}
      : G;
  // treePhotos(first, game, cur): {teaching id: [photo]}, what treeGen takes (docs/spec/fish-photos.md "In the game"
  // and "First photos"). game: fish-game.json photos (each with sp, the species it is in play for); first:
  // fish-photos.json's first photos, read only while game is empty; cur: curation.json (or a draft), null when not
  // loaded (the lists as they are). A photo shows only while in play (treePhotoIn) and not excluded for good (curation
  // exclude, by name or photo id). treeCur(S, cur): the curation as the tree engine reads it for subject S: S's own
  // part (SUBJECTS admin.cur) under the fish's key, the rest as it is; a subject with no part gets none; null stays
  // null.
  const treeCur = (S, cur) => {
    const k = S && S.admin && S.admin.cur;
    return cur && k ? {...cur, fish: cur[k]} : cur;
  };
  function treePhotos(first, game, cur) {
    const F = cur && cur.fish,
      X = (cur && cur.exclude) || {},
      xid = new Set(Object.keys(X).map(treePid)),
      gone = F ? treeGone(cur) : xid,
      G = game && Object.keys(game).length ? game : first || {},
      out = {};
    Object.entries(G).forEach(([t, L]) => {
      out[t] = (L || []).filter(p => p && p.f && p.sp && (!F || treePhotoIn(F, p, gone)) && !X[p.f] && !xid.has(treePid(p.f)));
    });
    return out;
  }
  // treeObs(p): a photo's observation (a fish, a colony: rule P4, one question, one observation), an iNaturalist
  // observation by its id alone (fish-game.json's short o or a whole address), else its o as it is (a FishBase page),
  // else the photo's own name.
  const treeObs = p => {
    const o = p && p.o;
    if (!o) return String((p && p.f) || '');
    const s = String(o);
    return s.startsWith(TREE_OBS) ? s.slice(TREE_OBS.length) : s;
  };
  // The per-player reserve (docs/spec/reserve.md; docs/LEARNING.md "The reserve in the game"): per player and unit with
  // a mastery exam, a few observations that player never sees in practice and their exam asks first (model.js examSet),
  // logged |h. One rule for every subject (rule S1), stateless, on the units as built (reserveOf, reserveSplit): which
  // (resHash order), eligible (resOut, resCards: never Pierre's own, rule P1) and how many (RESERVE: target, keep,
  // floor) as the spec says. No replay reads it (rules D8, D9).
  const RESERVE = {target: 15, keep: 8, floor: 30};
  // A player's stable id for the reserve: an account's name (the sheet's Answers player, any case), else "~anon <id>",
  // the device's anonymous id as the sheet logs its answers (sync.js anonId).
  const reserveId = w =>
    String(w || '')
      .trim()
      .toLowerCase();
  // A 32-bit hash of a string (FNV-1a, then murmur3's finaliser so ids that share a prefix or a suffix spread), as a
  // fixed-width hex string: the same on every device and in the sheet.
  const resHash = s => {
    let h = 2166136261;
    for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  // The game photos of unit g in view v, as the games read them (app.js gamePics): its game list (applySlots sl: the
  // corals' IMR lecture photos in, a photo Pierre keeps on the sheet only out), else its view.
  const resGame = (g, v) => {
    const s = ((g && g.sl) || {})[v];
    return (s ? s.game : ((g && g.views) || {})[v]) || [];
  };
  // Every game photo of unit g, every view.
  const unitPics = g => [...new Set(Object.keys({...((g && g.views) || {}), ...((g && g.sl) || {})}).flatMap(v => resGame(g, v)))];
  // A photo that a card shows, or one the reserve never takes on its own: Pierre's own, or one of reference level (its
  // judged qualities, whatever its route or source).
  const resOut = (p, cards) => !!(p.own || refLevel(p) || (cards && (cards.has(p.f) || cards.has(treePid(p.f)))));
  // The files shown on the cards of the units X ({gen, covers}): each unit's cover and ★ pick (coverP), its featured photos
  // (featP, sl feat), and the covers of a species or genus with no unit (X.covers); by name and by treePid.
  const resCards = X => {
    const out = new Set(),
      add = f => f && (out.add(f), out.add(treePid(f)));
    Object.values((X && X.gen) || {}).forEach(g => {
      if (!g) return;
      add(g.cover);
      add(g.coverP && g.coverP.f);
      Object.values(g.featP || {}).forEach(L => (L || []).forEach(p => add(p && p.f)));
      Object.values(g.sl || {}).forEach(s => ((s && s.feat) || []).forEach(p => add(p && p.f)));
    });
    Object.values((X && X.covers) || {}).forEach(p => add(p && p.f));
    return out;
  };
  // reserveOf(X, id): the reserve of player id (reserveId) over the units X ({gen, covers}, as built: app.js build,
  // treeBuild), a Set of species + ' ' + observation. Empty without an id.
  function reserveOf(X, id) {
    const out = new Set(),
      who = reserveId(id);
    if (!who || !X || !X.gen) return out;
    const cards = resCards(X),
      P = new Map(), // species: Map(observation: eligible)
      U = []; // the units with an exam: [id, Set of species, observations in play]
    // a unit by its key in X.gen (a coral genus has no id field), a photo's species (none: the unit's)
    Object.entries(X.gen).forEach(([id, g]) => {
      if (!g || g.wink) return;
      const keys = new Set(),
        S = new Set();
      unitPics(g).forEach(p => {
        if (!p || !p.f) return;
        const s = String(p.sp || id),
          o = treeObs(p),
          M = P.get(s) || P.set(s, new Map()).get(s);
        M.set(o, (M.has(o) ? M.get(o) : true) && !resOut(p, cards));
        keys.add(s + ' ' + o);
        S.add(s);
      });
      if (!g.noex && keys.size) U.push([id, S, keys.size]);
    });
    // An observation any of whose photos, game photo or not, is a card's or one the reserve never takes stays practice:
    // a cover Pierre keeps on the sheet only still shows its colony. The counts above read the game photos alone.
    Object.entries(X.gen).forEach(([id, g]) => {
      if (!g || g.wink) return;
      [
        ...Object.values(g.views || {}).flat(),
        ...Object.values(g.sl || {}).flatMap(s => Object.values(s || {}).flatMap(L => (Array.isArray(L) ? L : []))),
        g.coverP
      ].forEach(p => {
        if (!p || !p.f || !resOut(p, cards)) return;
        const M = P.get(String(p.sp || id));
        if (M && M.has(treeObs(p))) M.set(treeObs(p), false);
      });
    });
    const E = new Map(), // species: its eligible observations in the player's order
      cap = new Map(), // species: the most it may reserve (RESERVE.keep left in practice)
      held = new Map(); // species: its reserved observations
    P.forEach((M, s) => {
      const L = [...M].filter(([, ok]) => ok).map(([o]) => [resHash(who + ' ' + s + ' ' + o), o]);
      L.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
      E.set(
        s,
        L.map(x => x[1])
      );
      cap.set(s, Math.max(0, Math.min(L.length, M.size - RESERVE.keep)));
      held.set(s, []);
    });
    // The most observations first (a family before its genera), then by id: one order everywhere.
    U.sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : 1));
    const room = U.map(([, , n]) => Math.max(0, n - RESERVE.floor)),
      has = U.map(() => 0), // each unit's reserved observations
      of = new Map(); // species: the indexes of its units
    U.forEach(([, S], i) => S.forEach(s => (of.get(s) || of.set(s, []).get(s)).push(i)));
    // Every unit holding species s stays under its floor (room) after one more.
    const fits = s => (of.get(s) || []).every(i => has[i] < room[i]);
    U.forEach(([, S], i) => {
      // its species, the most observations first, then by id
      const L = [...S].sort((a, b) => P.get(b).size - P.get(a).size || (a < b ? -1 : 1));
      let need = Math.min(RESERVE.target, room[i]) - has[i];
      while (need > 0) {
        let took = false;
        for (const s of L) {
          const H = held.get(s);
          if (need <= 0 || H.length >= cap.get(s) || !fits(s)) continue;
          H.push(E.get(s)[H.length]);
          (of.get(s) || []).forEach(j => has[j]++);
          need--;
          took = true;
        }
        if (!took) break;
      }
    });
    held.forEach((L, s) => L.forEach(o => out.add(s + ' ' + o)));
    return out;
  }
  // reserveSplit(X, R): the reserve R (reserveOf) out of every unit's views and game lists, into its held lists by view
  // (g.held {view: [photo]}, each a copy marked ho, one copy per photo across the units): no game, card, sheet or list
  // shows them (they read the views), the mastery exam asks them (model.js examPics). Each unit's views and game lists
  // that change are new objects (never a list another copy of the units shares: the rated world's); returns X.
  function reserveSplit(X, R) {
    if (!X || !X.gen) return X;
    const copy = new Map(),
      ho = p => copy.get(p) || copy.set(p, {...p, ho: 1}).get(p);
    Object.entries(X.gen).forEach(([id, g]) => {
      if (!g) return;
      delete g.held;
      if (!R || !R.size || !g.views) return;
      const out = p => !!p && !!p.f && R.has(String(p.sp || id) + ' ' + treeObs(p)),
        keep = L => L.filter(p => !out(p)),
        held = {},
        put = (v, L) => (held[v] = [...new Set([...(held[v] || []), ...L.filter(out).map(ho)])]);
      // held from the game photos only (resGame: with a game list, never a photo Pierre keeps on the sheet only); a
      // reserved colony's other photos leave the views all the same
      if (Object.values(g.views).some(L => Array.isArray(L) && L.some(out)))
        g.views = Object.fromEntries(
          Object.entries(g.views).map(([v, L]) => [v, Array.isArray(L) && L.some(out) ? (!(g.sl || {})[v] && put(v, L), keep(L)) : L])
        );
      if (Object.values(g.sl || {}).some(s => Object.values(s || {}).some(L => Array.isArray(L) && L.some(out))))
        g.sl = Object.fromEntries(
          Object.entries(g.sl).map(([v, s]) => [
            v,
            Object.fromEntries(
              Object.entries(s || {}).map(([k, L]) => [k, Array.isArray(L) && L.some(out) ? (k === 'game' && put(v, L), keep(L)) : L])
            )
          ])
        );
      if (Object.keys(held).length) g.held = held;
    });
    return X;
  }
  // A unit's reserved photos (reserveSplit): view v's, or every view's.
  const heldOf = (g, v) => (v ? ((g && g.held) || {})[v] || [] : Object.values((g && g.held) || {}).flat());
  // The names a family is known by, accepted when typed (rule S2): the book's name, IMR's (the IMR tag) and the parts of a
  // double one ("Surgeonfish & Unicornfish"), its scientific names, the names IMR uses inside it with their genera
  // (Chromis, Anemonefish, Amphiprion: a finer name, still right), and the other common names curated for the IMR entries
  // teaching its species or their sub-entries (T: aka, tools/fish_source.json, Tang; often: a name in common use that the
  // answer's feedback corrects gently, Clownfish for Anemonefish, fishOften), and the scientific families of those IMR
  // entries (fam: Holocentridae, Syngnathidae): one the book splits names each of its families, so typed it reads as all
  // of them (typeMatchIn shared), never as a slip of one of them (Holocentrinae). The first is the name shown.
  function treeNames(t, imrGen, T) {
    const parts = String(t.imr || '')
      .split(/\s*&\s*|\s+and\s+/)
      .filter(Boolean);
    return [
      ...new Set([
        t.name,
        t.imr,
        ...(parts.length > 1 ? parts : []),
        ...(t.sci || []),
        ...(imrGen || []).flatMap(g => [g.imr, g.name]),
        ...(T || []).flatMap(x => [
          x.fam,
          ...(x.aka || []),
          ...(x.often || []),
          ...(x.sub || []).flatMap(u => [...(u.aka || []), ...(u.often || [])])
        ])
      ])
    ].filter(Boolean);
  }
  // The names of part of a family (treeGen scopes): {name: [species ids]}, its IMR genera (their tag and scientific name:
  // the genus's species) and its IMR entries' sub-entries (their name and other names: the sub-entry's species).
  function fishScopes(imrGen, T) {
    const S = {},
      put = (x, L) => x && (L || []).length && (S[x] = [...new Set([...(S[x] || []), ...L])]);
    (imrGen || []).forEach(g => [g.imr, g.name].forEach(x => put(x, g.species)));
    (T || []).forEach(e => (e.sub || []).forEach(u => [u.name, ...(u.aka || []), ...(u.often || [])].forEach(x => put(x, u.species))));
    return S;
  }
  // The names in common use that a typed answer may give, accepted as right but corrected gently ("✓ Yes, Anemonefish
  // (often called clownfish)", docs/FISH_PATH.md): [[the usual name, the name often used]], from the node's and its
  // sub-entries' often (tools/fish_source.json).
  const fishOften = t => [t, ...(t.sub || [])].flatMap(u => (u.often || []).map(x => [u.name, x]));
  // A whole name, normalised for typing (fish names have several words: "Moorish Idol"): letters only, lower case.
  const typeNormAll = s =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '');
  // Every name a player may type for the fish entries gen (treeGen; docs/FISH_PATH.md "Typed family names",
  // docs/spec/fish.md "The name index"): [{k, g, old, alt}], old = the name typed when it is not the entry's own (read
  // as the entry), alt marks those as other names, not old ones; a name two entries share names both (typeMatchIn
  // shared); a name in common use carries oft: [usual name, the name often used] (fishOften). drop (SUBJECTS typeDrop):
  // a word a name may be typed without, its short form left out when within the spelling tolerance of another entry's
  // name or short form. Every name is also read in the other number (typeForms), exactly. known (treeNameIndex): the
  // names below the entries, read as the entry they lift to, and the words owned by none, read as such ({known}).
  function treeTypeNames(gen, drop = '', known = []) {
    const out = [],
      // sc: the species a name designates when it names part of the unit only; one key of a unit read by two
      // names takes the wider (no sc: the whole unit; "Surgeonfish", the label's singular, over the sub-entry)
      add = (k, g, x, i, oft, sc) => {
        if (!k) return;
        const o = out.find(y => y.k === k && y.g === g);
        if (o) return typeWiden(o, sc);
        out.push({k, g, old: i ? x : '', alt: i ? 1 : 0, nm: x, ...(oft ? {oft} : {}), ...(sc ? {sc} : {})});
      },
      scOf = (g, x) => (g.scopes || {})[x],
      oftOf = (g, k) => (g.oft || []).find(([, o]) => typeNormAll(o) === k);
    Object.values(gen || {}).forEach(g =>
      (g.names || [g.name]).forEach((x, i) => add(typeNormAll(x), g.id, x, i, oftOf(g, typeNormAll(x)), scOf(g, x)))
    );
    const d = typeNormAll(drop);
    if (!d) return out;
    const cut = new RegExp("^([A-Za-z][A-Za-z '-]*?)[ -]*" + d + '(?:es)?$', 'i'),
      short = out
        .map(o => {
          const x = typeNormAll(o.old) === o.k ? o.old : (gen[o.g].names || [gen[o.g].name])[0],
            m = String(x || '').match(cut),
            k = m ? typeNormAll(m[1]) : '';
          // the short form and its plural, and the name's own plural or singular ("Triggers", "Triggerfishes",
          // "Frogfish": plain right answers, not spellings to fix)
          const one = o.k.endsWith(d + 'es') ? [o.k.slice(0, -2), x.replace(/es$/i, '')] : o.k.endsWith(d) ? [o.k + 'es', x + 'es'] : null;
          return m && k.length >= 3 && k !== o.k
            ? [
                {k, g: o.g, x: m[1].trim(), oft: o.oft, sc: o.sc},
                {k: k + 's', g: o.g, x: m[1].trim() + 's', oft: o.oft, sc: o.sc},
                ...(one ? [{k: one[0], g: o.g, x: one[1].trim(), own: !o.old, oft: o.oft, sc: o.sc}] : [])
              ]
            : [];
        })
        .flat(),
      near = (a, b) => typeDist(a, b) <= TYPE.tol(Math.min(a.length, b.length));
    // A short form is kept unless it is within the tolerance of another unit's name or short form. The names are read by
    // length, each key once with the units it names (byLen: length → key → units): a distance is never less than the two
    // lengths' difference, so only the lengths within the tolerance of the short form's are read (tests/typefast.test.js).
    const byLen = new Map(),
      reach = new Map(),
      lensNear = n => {
        if (reach.has(n)) return reach.get(n);
        const ms = [...byLen.keys()].filter(m => Math.abs(m - n) <= TYPE.tol(Math.min(m, n)));
        reach.set(n, ms);
        return ms;
      },
      clash = s => {
        for (const m of lensNear(s.k.length))
          for (const [k, gs] of byLen.get(m)) if ((gs.size > 1 || !gs.has(s.g)) && near(s.k, k)) return true;
        return false;
      };
    [...out, ...short].forEach(o => {
      if (!byLen.has(o.k.length)) byLen.set(o.k.length, new Map());
      const L = byLen.get(o.k.length);
      if (!L.has(o.k)) L.set(o.k, new Set());
      L.get(o.k).add(o.g);
    });
    short.filter(s => !clash(s)).forEach(s => add(s.k, s.g, s.x, s.own ? 0 : 1, s.oft, s.sc));
    // The other number of every common name, as the name it comes from (its own name's: the unit's own, alt 0); never a
    // scientific name's (a unit of a scientific rank, a family's sciNames: "Zebrasomas" is no plural), which keeps its
    // spelling step.
    Object.values(gen || {})
      .filter(g => !g.rank)
      .forEach(g =>
        (g.names || [g.name]).forEach(
          (x, i) =>
            !(g.sciNames || []).includes(x) &&
            typeForms(x).forEach(y => add(typeNormAll(y), g.id, y, i, oftOf(g, typeNormAll(x)), scOf(g, x)))
        )
      );
    typeKnown(out, known);
    typeOff(out, known);
    return out;
  }
  // One key of a unit read by two names: the wider of the two (no sc: the whole unit; else the species of both).
  function typeWiden(o, sc) {
    if (!o.sc) return;
    if (!sc) delete o.sc;
    else o.sc = [...new Set([...o.sc, ...sc])];
  }
  // Pierre's 'off' (curation.json fish.names, treeNameIndex: {x, off: family id}), applied once every name is in: no name
  // of that family, in either number, reads x any more, whatever brought it (a genus's common name, the family's own,
  // Chromis); the name is known (another unit's names, at any rank, still read before it: typeMatchIn).
  function typeOff(out, known) {
    (known || [])
      .filter(e => e.off)
      .forEach(e => {
        const ks = new Set([e.x, ...typeForms(e.x)].map(typeNormAll));
        for (let i = out.length - 1; i >= 0; i--) if (out[i].g === e.off && ks.has(out[i].k)) out.splice(i, 1);
        ks.forEach(k => !out.some(o => o.k === k && o.known) && out.push({k, g: '', old: e.x, alt: 1, known: 1, w: 1}));
      });
  }
  // The name index (treeNameIndex) into the typed names: a name with an owner, read as that family ({k, g, old, alt: 1,
  // vr: its role, n, of: how many of the family's species carry it; oft for a name Pierre marks "often"), in both numbers
  // for a word; a name with none, known ({k, g: '', known: 1, w: 1 for a word}), only where it is no unit's name.
  function typeKnown(out, known) {
    const have = new Set(out.filter(o => !o.known).map(o => o.k)),
      seen = new Set(out.map(o => o.k + '|' + o.g));
    (known || [])
      .filter(e => e.g)
      .forEach(e =>
        [e.x, ...(['ss', 'gs'].includes(e.vr) ? [] : typeForms(e.x))].forEach(y => {
          const k = typeNormAll(y);
          if (k.length < 3) return;
          if (seen.has(k + '|' + e.g)) {
            // already a name of that unit (Tang, Chromis): Pierre's "often" still applies to it, and
            // the wider reading holds
            const o = out.find(x => x.k === k && x.g === e.g && !x.known);
            if (o && e.oft && !o.oft) o.oft = e.oft;
            if (o) typeWiden(o, e.sc);
            return;
          }
          seen.add(k + '|' + e.g);
          have.add(k);
          out.push({
            k,
            g: e.g,
            old: y,
            alt: 1,
            vr: e.vr,
            ...(e.n ? {n: e.n, of: e.of} : {}),
            ...(e.oft ? {oft: e.oft} : {}),
            ...(e.sc ? {sc: e.sc} : {})
          });
        })
      );
    (known || [])
      .filter(e => !e.g)
      .forEach(({x, w}) =>
        [x, ...typeForms(x)].forEach(y => {
          const k = typeNormAll(y);
          if (k.length >= 3 && !have.has(k)) (have.add(k), out.push({k, g: '', old: y, alt: 1, known: 1, ...(w ? {w: 1} : {})}));
        })
      );
  }
  // A name's last word in the other number, for typing (English: Groupers / Grouper, Gobies / Goby, Pipefishes /
  // Pipefish, Sweetlips / Sweetlip): [] for a scientific name (-idae, -inae) or a last word whose number is not plain
  // (Anthias, Chromis, Dascyllus: -as, -is, -us).
  function typeForms(x) {
    const m = String(x || '').match(/^(.*?)([A-Za-z]+)$/);
    if (!m || /i[dn]ae$/i.test(m[2])) return [];
    const [, a, w] = m,
      f = w.match(/fishes$/i)
        ? w.slice(0, -2)
        : w.match(/fish$/i)
          ? w + 'es'
          : w.match(/ies$/i)
            ? w.slice(0, -3) + 'y'
            : w.match(/(ch|sh|x|ss)es$/i)
              ? w.slice(0, -2)
              : w.match(/[^aeiou]y$/i)
                ? w.slice(0, -1) + 'ies'
                : w.match(/(ss|us|is|as)$/i)
                  ? ''
                  : w.match(/s$/i)
                    ? w.slice(0, -1)
                    : w.match(/(ch|sh|x)$/i)
                      ? w + 'es'
                      : w + 's';
    return f && f.length >= 3 ? [a + f] : [];
  }
  // The fish name index (docs/reviews/2026-11-09-shared-common-names.md), for typed answers (treeTypeNames known): each
  // name below the family with the family it lifts to and its role (vr): 'sp' a listed common name of a game species
  // (fish.json cn, every spelling) or a regional one (cnr, accepted when typed), 'ss' a species' scientific name (its PDF
  // name and WoRMS's), 'gs' a genus's scientific name, 'gc' a genus's common name, 'k' a kind word carried by at least 2 of
  // the family's species or all of them (fish.json vn, tools/fish_names.py: razorfish, toby), with n and of; a kind word
  // a family's species carry less than that ('w') is known, owned by none: never read as a slip of another family's
  // name. cur (curation.json fish.names, Pierre's exceptions, written only by the admin): {name: {family id: 'off' (not
  // that family's), 'on' (that family's, the name added or a known word given to it), 'often' (that family's, the
  // feedback naming the family gently)}}. [{x, g: family id or '', vr, n, of, oft, w}].
  function treeNameIndex(F, cur) {
    const out = [],
      fam = new Map(((F && F.families) || []).map(f => [f.id, f])),
      C = Object.fromEntries(Object.entries(cur || {}).map(([x, v]) => [typeNormAll(x), v || {}])),
      off = (x, g) => (C[typeNormAll(x)] || {})[g] === 'off',
      oft = (x, g) => ((C[typeNormAll(x)] || {})[g] === 'often' && fam.get(g) ? [fam.get(g).name, x] : null),
      put = (x, g, vr, n, of, sc) => {
        if (!x || !fam.has(g)) return;
        if (off(x, g)) return out.push({x, g: '', vr: 'w', w: 1, off: g});
        const o = oft(x, g),
          // Pierre's on or often gives the name to the whole family, whatever part it named
          whole = ['on', 'often'].includes((C[typeNormAll(x)] || {})[g]);
        out.push({x, g, vr, ...(n ? {n, of} : {}), ...(o ? {oft: o} : {}), ...(sc && sc.length && !whole ? {sc} : {})});
      };
    const game = ((F && F.species) || []).filter(s => s.circle && !s.out && s.family);
    game.forEach(s => {
      [...(s.cn || []), ...(s.cnr || [])].forEach(L => L.forEach(x => put(x, s.family, 'sp', 0, 0, [s.id])));
      [s.name, s.now].forEach(x => put(x, s.family, 'ss', 0, 0, [s.id]));
    });
    const inGame = new Set(game.map(s => s.genus));
    ((F && F.genera) || [])
      .filter(g => inGame.has(g.id))
      .forEach(g => (put(g.name, g.family, 'gs', 0, 0, g.species), put(g.common, g.family, 'gc', 0, 0, g.species)));
    // A kind word designates the species that carry it ("razorfish" on a cleaner wrasse is a mistake); Pierre's
    // on or often gives it to the whole family.
    ((F && F.vn) || []).forEach(([x, owners]) =>
      (owners || []).forEach(([g, r, n, of, sp]) => {
        const c = (C[typeNormAll(x)] || {})[g];
        put(x, g, 'k', n, of, c === 'on' || c === 'often' ? null : sp);
      })
    );
    // Pierre's own names (on), the index's or not.
    Object.entries(cur || {}).forEach(([x, v]) =>
      Object.entries(v || {}).forEach(([g, c]) => {
        if ((c === 'on' || c === 'often') && !out.some(e => e.g === g && typeNormAll(e.x) === typeNormAll(x))) put(x, g, 'cur');
      })
    );
    return out;
  }
  // A species' own list of common names, as the admin curates it (curation.json <subject's part> cn {species id: [1 to
  // CN_MAX names, the main name first]}, written only by the admin's draft and Publish): the same list for every tree
  // subject whose species carry a list of names (cn). treeCnClean: the list as a clean list of names (trimmed, each
  // with letters, none twice in the reading of typeNormAll), or null when it is not one (not 1 to CN_MAX names).
  const CN_MAX = 3;
  function treeCnClean(v) {
    if (!Array.isArray(v) || v.length < 1 || v.length > CN_MAX) return null;
    const L = v.map(x => (typeof x === 'string' ? x.trim().replace(/\s+/g, ' ') : '')),
      k = L.map(x => typeNormAll(x));
    return k.every(Boolean) && new Set(k).size === k.length ? L : null;
  }
  // Species record s (fish.json shape) with its list of names laid over its own: each name of list L (treeCnClean) that
  // the base lists in some spelling keeps its other spellings (the base's entry [name shown, other spellings]), a new name
  // has none; cni, the place of the IMR name, follows the IMR name's entry to its place in the list (whichever of its
  // spellings the list names) and goes when the list drops it; cnr, the regional names typed only, stay.
  function treeCnLay(s, L) {
    const was = Array.isArray(s.cn) ? s.cn : [],
      forms = n => (Array.isArray(n) ? n : [n]).filter(x => typeof x === 'string' && x),
      taken = new Set(),
      out = {...s};
    let at = -1;
    out.cn = L.map((x, i) => {
      const k = typeNormAll(x),
        j = was.findIndex((n, h) => !taken.has(h) && forms(n).some(y => typeNormAll(y) === k));
      if (j >= 0 && j === s.cni) at = i;
      if (j < 0) return [x];
      taken.add(j);
      return [x, ...forms(was[j]).filter(y => typeNormAll(y) !== k)];
    });
    if (at >= 0) out.cni = at;
    else delete out.cni;
    return out;
  }
  // The names of subject S's species in built file R (fish.json, seaslug.json) with the lists of curation cur laid over
  // them: a new file sharing every record it does not change, R itself when nothing applies. The base stands for a
  // species with no entry, an entry that is not a clean list (treeCnClean) and a species the file does not know. A
  // species with no list in the base is left alone, whatever the entry says: its list would give it a progress unit (the
  // species level, treeSpUnits, treeScore), a change of structure the admin does not make. Called by contentApply, so the
  // app, the admin and the sheet's replay read the same names.
  function treeCnApply(S, R, cur) {
    const k = S && S.admin && S.admin.cur,
      P = k && isObj(cur) ? cur[k] : null;
    return treeCnLists(R, isObj(P) ? P.cn : null);
  }
  // The same over the lists themselves, a subject's part's cn map M ({species id: [names]}), for a reader that holds the part.
  function treeCnLists(R, M) {
    if (!isObj(M) || !isObj(R) || !Array.isArray(R.species)) return R;
    let out = null;
    R.species.forEach((s, i) => {
      if (!isObj(s) || !Array.isArray(s.cn) || !s.cn.length || !Object.prototype.hasOwnProperty.call(M, s.id)) return;
      const L = treeCnClean(M[s.id]);
      if (!L) return;
      const r = treeCnLay(s, L);
      if (!eq(r, s)) (out = out || R.species.slice())[i] = r;
    });
    return out ? {...R, species: out} : R;
  }

  // A unit id the subject renamed (SUBJECTS renamed: a fish entry t01 → its family f:Damselfishes), else the id as it is.
  // sp: the species shown (a name, or names joined by ', '): the genus of the first one picks the family of an entry
  // that went to two (t13 with a Diploprion photo: the Soapfishes; any other: the Groupers).
  function renamedId(S, id, sp) {
    const R = S && S.renamed;
    if (!R || typeof id !== 'string' || !R.ids[id]) return id;
    const g = String(sp || '').split(/[\s,]+/)[0];
    return ((R.split || {})[id] || {})[g] || R.ids[id];
  }
  // The id of a sheet of subject S in its one spelling, or null when S has no such sheet. A subject without sheet ranks
  // (SUBJECTS sheets: the corals) takes any id as its unit's; one with them takes an id with one of their prefixes, an
  // old unit id renamed since first (renamedId: t01 → f:Damselfishes), so a link from a record written before the rename
  // still opens its sheet.
  function sheetIdOf(S, id) {
    const s = String(id == null ? '' : id);
    if (!S || !S.sheets) return s;
    // a species by its scientific name (sci:s091, LEVELS sci) is its species sheet's: s:sci:s091 (treeSheets spOf)
    const r0 = renamedId(S, s),
      r = levelOf(r0) === 'sci' && S.sheets.species && r0.length > LEVELS.sci.pre.length ? S.sheets.species + r0 : r0;
    return Object.values(S.sheets).some(p => r.startsWith(p) && r.length > p.length) ? r : null;
  }


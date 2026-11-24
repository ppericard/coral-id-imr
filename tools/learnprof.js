// The simulated players' profiles (rule L11; docs/LEARNING.md "Validating a learning change", "Profiles"), one list for
// both subjects and both worlds: tools/learnsim.js loads this file in Node (the list) and in the page (an init script:
// LEARNPROF.knownUnits on the app's own units); the rated world reads the same list. Knowledge goes by lecture group,
// family, circle, the IMR course's species or commonness, never by data order (except strongBack).
//
// Each profile has a part per subject it plays (a profile with none for a subject is refused there), rate, the
// learner's learning rate (learnsim LEARNER), and choice, its first-launch answer under learnsim --choice auto and in the
// rated world (new, imr, know; none for the profiles run by name: learnsim leaves it unset, the rated world says new).
// A part: hi, the know of the units it knows, lo of the others; by, which slate units it knows:
// - all: every one; lecture (corals): the genera numbered on the IMR slate (data.json n, the lecture's 34);
// - groups (corals): the IMR lecture groups in the course's order (model.js shownGroup: a starred genus in the group of
//   its look-alikes) until share of the slate is covered (0.6: groups 1 to 7, 26 genera of the 40 with their starred look-alikes);
// - circle1 (fish): the IMR course's families (circle 1); common (fish): the most common families near Dauin (their
//   weights in the global score's tree, core.js treeScoreTree) until they carry half of the weight;
// - grp: the lecture groups listed (spotty); m: slate unit i when i % 5 < m (data order: strongBack).
// gen, the units of the subject's opt-in sets (the fish scientific genera), by their family: lo (default); imr, the IMR
// genera (app.js imrg) of the families it knows; known, every genus of a family it knows; all. names: common declines
// the scientific names (the set's offer card, Not now: a diver who wants the common names only), else both (accepted).
// sp (fish), the species units (by common name, core.js treeSpUnits) it knows at sp.hi, the others at lo (none without
// sp): imr, the 24 most sighted of the IMR course PDF's cheatsheet (fish.json cs; all in circle-1 families); top n, the
// first n species of each family it knows, in the family's order (the commonness order, cmi: the order they open in);
// by all, every species. A profile that knows a family need not know its species: a species name is a step harder.
//
// The fish parts are assumptions (rule W11), not fits: the real fish log (2026-11-19) has no species answer yet, 5
// players with 200 fish answers or more (the fit waits for about 10: ROADMAP "Simulated profiles fitted to real
// players"), and its right rates are the adaptive draw's target more than the players' knowledge (docs/LEARNING.md
// "Profiles").
(function (root) {
  const PROFILES = {
    beginner: {rate: 0.12, choice: 'new', coral: {by: 'all', hi: 0.02, lo: 0.02}, fish: {by: 'all', hi: 0.02, lo: 0.02}},
    // A diver who knows the common fish by sight a little and wants their common names (fish only): the families met
    // most near Dauin, and the one species met most of each, as little.
    casualDiver: {rate: 0.12, choice: 'new', names: 'common', fish: {by: 'common', hi: 0.3, lo: 0.02, sp: {top: 1, hi: 0.3}}},
    // Has just had the IMR lecture: knows the course's names and groups, has practised little; of the species, the
    // cheatsheet's 24 most sighted, below its families.
    lectureRA: {
      rate: 0.12,
      choice: 'imr',
      coral: {by: 'lecture', hi: 0.55, lo: 0.1},
      fish: {by: 'circle1', hi: 0.5, lo: 0.1, gen: 'imr', sp: {imr: 1, hi: 0.4}}
    },
    // Practice behind the lecture: the cheatsheet's species and the 3 met most of each circle-1 family, below its families.
    strongRA: {
      rate: 0.12,
      choice: 'know',
      coral: {by: 'groups', share: 0.6, hi: 0.85, lo: 0.1},
      fish: {by: 'circle1', hi: 0.85, lo: 0.1, gen: 'known', sp: {imr: 1, top: 3, hi: 0.7}}
    },
    // Knows nearly everything.
    expert: {rate: 0.05, choice: 'know', coral: {by: 'all', hi: 0.93, lo: 0.93}, fish: {by: 'all', hi: 0.93, lo: 0.93, gen: 'all', sp: {by: 'all', hi: 0.93}}},
    // A strong player who knows 80% of the genera well and the rest hardly: few genera stay shaky, so the opening runs at
    // full speed, and a genus never answered starts from their high global level (a pace that can open 7 genera in 16
    // answers). Not in the default list: learnsim --profiles strongBack --questions 60 --breaks 8h --after 40.
    strongBack: {rate: 0.12, coral: {by: 'm', m: 4, hi: 0.9, lo: 0.1}},
    // A spotty player (a trainer who knows some coral families but not others): knows the genera of some IMR lecture
    // groups as an expert does and the others hardly, so a rule that borrows from the global level is checked on the
    // genera it does not know. Not in the default list.
    spotty: {rate: 0.08, coral: {by: 'grp', grp: [1, 2, 3, 4, 5], hi: 0.93, lo: 0.05}}
  };
  const EXTRA = ['strongBack', 'spotty'];
  // The default profiles of a subject: those with a part for it, the special ones left out (run them by name).
  const defaults = subj => Object.keys(PROFILES).filter(n => partOf(n, subj) && !EXTRA.includes(n));
  // The part of a profile that plays a subject: its own, else the part of the engine that subject runs on (the sea slugs
  // are a tree subject on the fish engine, core.js SUBJECTS seaslug: they take the fish part, rule S1: one engine, no
  // part of their own to keep in step; the fish's families and circles are the slugs' too).
  const ENGINE = {seaslug: 'fish'};
  const partOf = (n, subj) => (PROFILES[n] ? PROFILES[n][subj] || PROFILES[n][ENGINE[subj]] || null : null);
  // A profile as a run plays it on a subject: its part, the rate, the names; null if it has no part for the subject.
  const profOf = (n, subj) => {
    const part = partOf(n, subj);
    return part ? {rate: PROFILES[n].rate, names: PROFILES[n].names || 'both', gen: 'lo', ...part} : null;
  };
  // A profile's first-launch answer (learnsim --choice auto, the rated world); undefined for the profiles run by name.
  const choiceOf = n => (PROFILES[n] || {}).choice;
  // The slate units a profile (profOf) knows. U: SL the slate in order; group(g) its lecture group (0 for none);
  // numbered(g) on the IMR slate's numbered list; core the circle-1 units; tree [[unit, weight], ...] the score's trunk.
  function knownUnits(prof, U) {
    const SL = U.SL,
      by = prof.by;
    if (by === 'all') return new Set(SL);
    if (by === 'm') return new Set(SL.filter((g, i) => i % 5 < prof.m));
    if (by === 'grp') return new Set(SL.filter(g => prof.grp.includes(U.group(g))));
    if (by === 'lecture') return new Set(SL.filter(g => U.numbered(g)));
    if (by === 'groups') {
      const ks = [...new Set(SL.map(U.group))].filter(k => k > 0).sort((a, b) => a - b),
        out = new Set();
      for (const k of ks) {
        if (out.size >= prof.share * SL.length) break;
        SL.filter(g => U.group(g) === k).forEach(g => out.add(g));
      }
      return out;
    }
    if (by === 'circle1') return new Set(SL.filter(g => (U.core || []).includes(g)));
    if (by === 'common') {
      const F = (U.tree || []).filter(([u]) => SL.includes(u)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)),
        tot = F.reduce((t, x) => t + x[1], 0),
        out = new Set();
      let w = 0;
      for (const [u, x] of F) {
        if (w >= tot / 2) break;
        out.add(u);
        w += x;
      }
      return out;
    }
    throw new Error('unknown profile rule ' + by);
  }
  // Whether a profile knows a set's unit (a fish scientific genus) of family fam, IMR genus or not (gen, above).
  const genKnown = (prof, knows, fam, imrg) =>
    prof.gen === 'all' || (prof.gen === 'known' && knows.has(fam)) || (prof.gen === 'imr' && knows.has(fam) && !!imrg);
  // The species units a profile knows (sp, above). L: the species units in their families' order, [{id, family, cs}]
  // (cs the cheatsheet's rank, 0 or none for the others); knows: the families it knows (knownUnits).
  function knownSpecies(prof, knows, L) {
    const sp = prof.sp,
      out = new Set();
    if (!sp) return out;
    const at = {};
    L.forEach(s => {
      const i = (at[s.family] = (at[s.family] || 0) + 1);
      if (sp.by === 'all' || (sp.imr && s.cs > 0) || (knows.has(s.family) && i <= (sp.top || 0))) out.add(s.id);
    });
    return out;
  }
  // A species unit's know at the start (sp.hi when it knows it, else lo).
  const spKnow = (prof, known, id) => (prof.sp && known.has(id) ? prof.sp.hi : prof.lo);
  const X = {PROFILES, defaults, profOf, partOf, choiceOf, knownUnits, genKnown, knownSpecies, spKnow};
  if (typeof module === 'object' && module.exports) module.exports = X;
  else root.LEARNPROF = X;
})(this);

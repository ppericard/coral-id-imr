// The simulated players' profiles (2026-11-08, rule L11; docs/LEARNING.md "Validating a learning change", "Profiles"),
// one list for both subjects and both worlds: tools/learnsim.js loads this file in Node (the list) and in the page (an
// init script: LEARNPROF.knownUnits on the app's own units); the rated world reads the same list. Knowledge goes by
// lecture group, family, circle or commonness, never by data order (except strongBack, kept as it was).
//
// Each profile has a part per subject it plays (a profile with none for a subject is refused there) and rate, the
// learner's learning rate (learnsim LEARNER). A part: hi, the know of the units it knows, lo of the others; by, which
// slate units it knows:
// - all: every one; lecture (corals): the genera numbered on the IMR slate (data.json n, the lecture's 34);
// - groups (corals): the IMR lecture groups in the course's order (learn.js shownGroup: a starred genus in the group of
//   its look-alikes) until share of the slate is covered (0.6: groups 1 to 7, 26 genera of the 40 with their starred look-alikes);
// - circle1 (fish): the IMR course's families (circle 1); common (fish): the most common families near Dauin (their
//   weights in the global score's tree, core.js fishScoreTree) until they carry half of the weight;
// - grp: the lecture groups listed (spotty); m: slate unit i when i % 5 < m (data order: strongBack, as before).
// gen, the units of the subject's opt-in sets (the fish scientific genera), by their family: lo (default); imr, the IMR
// genera (app.js imrg) of the families it knows; known, every genus of a family it knows; all. names: common declines
// the scientific names (the set's offer card, Not now: a diver who wants the common names only), else both (accepted).
(function (root) {
  const PROFILES = {
    beginner: {rate: 0.12, coral: {by: 'all', hi: 0.02, lo: 0.02}, fish: {by: 'all', hi: 0.02, lo: 0.02}},
    // A diver who knows the common fish by sight a little and wants their common names (fish only).
    casualDiver: {rate: 0.12, names: 'common', fish: {by: 'common', hi: 0.3, lo: 0.02}},
    // Has just had the IMR lecture: knows the course's names and groups, has practised little.
    lectureRA: {rate: 0.12, coral: {by: 'lecture', hi: 0.55, lo: 0.1}, fish: {by: 'circle1', hi: 0.5, lo: 0.1, gen: 'imr'}},
    // Practice behind the lecture.
    strongRA: {rate: 0.12, coral: {by: 'groups', share: 0.6, hi: 0.85, lo: 0.1}, fish: {by: 'circle1', hi: 0.85, lo: 0.1, gen: 'known'}},
    // Knows nearly everything.
    expert: {rate: 0.05, coral: {by: 'all', hi: 0.93, lo: 0.93}, fish: {by: 'all', hi: 0.93, lo: 0.93, gen: 'all'}},
    // A strong player who knows 80% of the genera well and the rest hardly: few genera stay shaky, so the opening runs at
    // full speed, and a genus never answered starts from their high global level (2026-11-04, the run of 2026-11-03 that
    // fell from 83% to 50% right after 7 genera opened in 16 answers). Not in the default list: learnsim --profiles
    // strongBack --questions 60 --breaks 8h --after 40 (that player came back from an 8-hour break).
    strongBack: {rate: 0.12, coral: {by: 'm', m: 4, hi: 0.9, lo: 0.1}},
    // A spotty player (2026-11-06, Pierre on #611: "a trainer who knows the Acroporidae but not the Merulinidae"): knows
    // the genera of some IMR lecture groups as an expert does and the others hardly, so a rule that borrows from the
    // global level is checked on the genera it does not know. Not in the default list.
    spotty: {rate: 0.08, coral: {by: 'grp', grp: [1, 2, 3, 4, 5], hi: 0.93, lo: 0.05}}
  };
  const EXTRA = ['strongBack', 'spotty'];
  // The default profiles of a subject: those with a part for it, the special ones left out (run them by name).
  const defaults = subj => Object.keys(PROFILES).filter(n => PROFILES[n][subj] && !EXTRA.includes(n));
  // A profile as a run plays it on a subject: its part, the rate, the names; null if it has no part for the subject.
  const profOf = (n, subj) =>
    PROFILES[n] && PROFILES[n][subj] ? {rate: PROFILES[n].rate, names: PROFILES[n].names || 'both', gen: 'lo', ...PROFILES[n][subj]} : null;
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
  const X = {PROFILES, defaults, profOf, knownUnits, genKnown};
  if (typeof module === 'object' && module.exports) module.exports = X;
  else root.LEARNPROF = X;
})(this);

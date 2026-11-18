// The players' reports in the admin (Inbox › To do › Reports; docs/ARCHITECTURE.md "Players' reports": one action bar on every report):
// pure functions, no DOM, for admin.js (renderTriage) and the tests (tests/reports.test.js). Loaded by admin.html only,
// after core.js (SUBJECTS, routeIn, renamedId). A report is a row of the sheet's Reports tab (Code.gs reports_):
// [id, time ms, reporter, verified, reason, expected, answered, suggested, note, mode, photos, where].
// The admin's status per report is his curation: Done = curation.json seen 'rep:<id>' (the player who sent it is thanked);
// Stand-by and Dismissed = curation.json reps {id: 'wait'|'drop'} (never thanked); no mark = open.
(function (root) {
  const C = typeof module !== 'undefined' && module.exports ? require('./core.js') : root;
  // The statuses, in the list's order: open first, stand-by below it, done and dismissed folded at the bottom.
  // [key, the list's heading, the action's name in a report's bar].
  const REP_STATUS = [
    ['open', 'Open', 'Reopen'],
    ['wait', 'Stand-by', 'Stand-by'],
    ['done', 'Done', 'Done'],
    ['drop', 'Dismissed', 'Dismiss']
  ];
  const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  // A report's status in a curation (the draft or the published file).
  const repStatus = (cur, id) => {
    const c = cur || {};
    if (own(c.seen, 'rep:' + id) && c.seen['rep:' + id]) return 'done';
    const s = own(c.reps, id) ? c.reps[id] : '';
    return s === 'wait' || s === 'drop' ? s : 'open';
  };
  // The curation's seen and reps once report id has status s: {seen, reps}, each a new map, or undefined when empty.
  // Done sets seen 'rep:<id>' (the thanks) and takes it out of reps; any other status takes the thanks back.
  function repStatusSet(cur, id, s) {
    const seen = {...((cur || {}).seen || {})},
      reps = {...((cur || {}).reps || {})};
    delete seen['rep:' + id];
    delete reps[id];
    if (s === 'done') seen['rep:' + id] = 1;
    else if (s === 'wait' || s === 'drop') reps[id] = s;
    return {seen: Object.keys(seen).length ? seen : undefined, reps: Object.keys(reps).length ? reps : undefined};
  }
  // After a three-way merge (core.js merge3 of the draft onto a newer published curation, or of another tab's draft): a
  // report whose status the draft changed since base keeps the draft's status whole, never Done from one side and Stand-by
  // or Dismissed from the other (its two places merge key by key). Returns merged, or a copy.
  function repsReconcile(base, mine, merged) {
    const ids = c => [
      ...Object.keys((c && c.reps) || {}),
      ...Object.keys((c && c.seen) || {})
        .filter(k => k.startsWith('rep:'))
        .map(k => k.slice(4))
    ];
    let out = merged;
    new Set([...ids(base), ...ids(mine)]).forEach(id => {
      const s = repStatus(mine, id);
      if (s === repStatus(base, id) || (s === repStatus(out, id) && !(own((out || {}).reps, id) && own((out || {}).seen, 'rep:' + id))))
        return;
      const {seen, reps} = repStatusSet(out, id, s);
      out = {...out};
      if (seen) out.seen = seen;
      else delete out.seen;
      if (reps) out.reps = reps;
      else delete out.reps;
    });
    return out;
  }
  // The reports by status, each in the rows' order (the sheet's: newest first). {open, wait, done, drop}.
  const repsOrder = (rows, cur) => {
    const out = Object.fromEntries(REP_STATUS.map(([k]) => [k, []]));
    (rows || []).forEach(r => out[repStatus(cur, r[0])].push(r));
    return out;
  };
  // The modes that are not a game: an enlarged photo, a sheet, a sheet's ID marks (learn.js fishMarks), a page's feedback.
  const REP_NOGAME = ['photo', 'sheet', 'marks', 'page'];
  // The subject a unit id belongs to: a subject whose sheets have prefixes (core.js SUBJECTS sheets: f:, g:, s:) takes the
  // ids with one of them, or an old id it renamed (SUBJECTS renamed); the subject without sheet ranks takes any other.
  const unitSubj = id => {
    const s = String(id == null ? '' : id);
    if (!s) return null;
    const S = C.SUBJECTS.find(
      x => x.sheets && (Object.values(x.sheets).some(p => s.startsWith(p) && s.length > p.length) || !!(x.renamed && own(x.renamed.ids, s)))
    );
    return S || C.SUBJECTS.find(x => !x.sheets) || null;
  };
  const unitOf = id => {
    const S = unitSubj(id);
    return S ? C.renamedId(S, String(id)) : '';
  };
  // What a report is about and where it was sent from: its source (game, photo, sheet, marks or page), the unit
  // (the expected one; else the unit whose sheet the page shows: a sheet id the script did not keep, a feedback sent from a
  // sheet), the answer given, its photos, the page (its address in the app), and its subject: the unit's, else its photos'
  // (photoSubj(f): a subject id or ''), else its page's (an address with a subject's prefix, or a section that follows the
  // subject), else '' (not about one subject: Home, About, the leaderboard).
  function repCtx(r, photoSubj) {
    const [id, t, who, ok, why, g, a, fix, note, m, ph, w] = r || [],
      mode = String(m || ''),
      game = !REP_NOGAME.includes(mode),
      page = String(w || ''),
      R = page ? C.routeIn(page) : null,
      inSubj = !!R && (!R.bare || C.ROUTE_SUBJ.includes(R.sec)),
      fromPage = R && inSubj && R.key && R.key.startsWith('g-') && R.key.length > 2 ? R.key.slice(2) : '',
      unit = unitOf(g) || unitOf(fromPage),
      photos = String(ph || '')
        .split(/\s+/)
        .filter(Boolean),
      byPhoto = photoSubj ? photos.map(f => photoSubj(f) || '').find(Boolean) : '',
      // a unit id two subjects' sheet prefixes fit (the fish's and the sea slugs' f:, g:, s:) belongs to the page's subject
      // when the page's subject is one of them, else to the first that fits (unitSubj)
      own = S => !!S && !!S.sheets && Object.values(S.sheets).some(p => unit.startsWith(p) && unit.length > p.length),
      subj = (unit && (inSubj && own(R.S) ? R.S.id : unitSubj(unit).id)) || byPhoto || (inSubj ? R.S.id : '');
    return {
      id: String(id == null ? '' : id),
      t: Number(t) || 0,
      who: String(who || ''),
      ok: Number(ok) || 0,
      why: String(why || ''),
      unit,
      ans: unitOf(a),
      fix: String(fix || ''),
      note: String(note || ''),
      mode,
      src: game ? 'game' : mode,
      game,
      photos,
      page,
      subj
    };
  }
  // A report shown on subject S's side: its own, or one about no subject (on every side).
  const repOn = (ctx, S) => !ctx.subj || ctx.subj === S.id;
  // A report's reason in the admin, in the words of its subject S (core.js SUBJECTS several and one), as the player's
  // dialog put it (sync.js REP_WHY): "Several corals", "Several fish species"; a wrong answer outside a game is "Wrong
  // genus", "Wrong family". The sheet keeps the reason's key (multi, wrong…), so an old report reads the same way.
  const REP_WHY = {
    wrong: 'Wrong answer',
    multi: 'Several {things}',
    photo: 'Bad photo',
    info: 'Wrong information',
    bug: 'Bug',
    idea: 'Suggestion',
    other: 'Other'
  };
  const repWhyText = (ctx, S) =>
    ctx.why === 'wrong' && !ctx.game ? 'Wrong ' + S.one : own(REP_WHY, ctx.why) ? REP_WHY[ctx.why].replace('{things}', S.several) : ctx.why;
  // A subject's units and photos as the admin reads them for its reports (admin.js unitRead), from the
  // files its SUBJECTS admin files name: f, its tree (fish.json's form); first, its first photos' file (none for a subject
  // without); gm, its game photos' file (core.js treeGameRead: the short form read whole). Every photo either list holds (a
  // report may name a photo shown before a Publish), with the unit showing it (entry) and its source as the file has it (a
  // remote original stays remote: src, r). {gen: unit id -> record (core.js treeGen), ph: photo id -> its record, slate (the
  // app's UNITS slate), fam: each family, genus and species sheet id (s:<name>) to its family, spid: each species sheet id
  // to its species, spg: each species to its genus (a report's unit to its family's page, its photos for Attach),
  // imr: each genus the IMR course names otherwise to that name (Analyses › Learning › Answer log), groups: the groups of
  // its identification key in force, {n, title} (core.js treeGen; Analyses › Difficulty › Heatmap's family blocks), taxa:
  // where its tree has them, the taxonomic groups its families sit in (core.js treeGen taxa, each family's tg; the
  // Heatmap's column of the families' groups), spu: each species unit the game asks (core.js treeSpUnits, s:s091) to
  // {family, look: the other species units of its family (admin.js fishUnitRec: as the game starts its pairs), name: its
  // scientific name, genus: its genus unit (the Heatmap's block, admin-heatmap.js heatUp)}}; null
  // without a tree. unit: the rank of its game units (core.js unitRankOf): 'genus' makes its genera the slate (the sea
  // slugs), each photo then shown by its genus.
  function repReg(f, first, gm, unit) {
    if (!f || typeof f !== 'object') return null;
    const G = (C.treeGameRead(gm) || {}).photos || {},
      F0 = (first && first.photos) || {},
      all = {};
    new Set([...Object.keys(F0), ...Object.keys(G)]).forEach(t => (all[t] = [...(G[t] || []), ...(F0[t] || [])]));
    const F = C.treeGen(f, all, undefined, unit),
      ph = {},
      fam = Object.create(null),
      spid = Object.create(null),
      spg = Object.create(null),
      imr = Object.create(null);
    Object.values(F.gen).forEach(g => g.views.wide.forEach(x => (ph[x.f] = {...x, entry: g.id})));
    (f.families || []).forEach(x => {
      fam[x.id] = x.id;
      (x.genera || []).forEach(g => (fam[g] = fam[g] || x.id));
    });
    (f.species || []).forEach(x => {
      spid['s:' + x.name] = x.id;
      if (x.genus) spg[x.id] = x.genus;
      if (!x.family) return;
      fam['s:' + x.name] = x.family;
      if (x.genus) fam[x.genus] = fam[x.genus] || x.family;
    });
    (f.genera || []).forEach(x => x.imr && x.imr !== x.name && (imr[x.id] = x.imr));
    return {
      gen: F.gen,
      ph,
      slate: [...F.c1, ...F.c2, ...F.c3],
      fam,
      spid,
      spg,
      imr,
      groups: F.groups || [],
      spu: Object.fromEntries(
        C.treeSpUnits(f, F).map(u => [u.id, {family: u.family, look: u.look, name: u.s.name, genus: u.s.genus || ''}])
      ),
      ...(F.taxa ? {taxa: F.taxa} : {})
    };
  }
  const API = {
    REP_STATUS,
    repStatus,
    repStatusSet,
    repsReconcile,
    repsOrder,
    REP_NOGAME,
    unitSubj,
    repCtx,
    repOn,
    REP_WHY,
    repWhyText,
    repReg
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

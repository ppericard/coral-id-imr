  // ---- The content editor's edits (docs/ARCHITECTURE.md "The content editor's edits") ----
  // The built file (fish.json: the sources and the instance's layer, resolved at build) is the base; the edits sit in the
  // instance's curation, in the subject's part (SUBJECTS admin.cur: curation.json fish.content, the corals' content at the
  // top), as content {nodes: {node id: {slot: entry}}, pairs: {"a|b": entry}} (pairs: structure), each entry {v, was,
  // src, t, by}: v the value in force (null hides the slot), was the base when it was edited (null: the slot was empty),
  // src an optional source {t, u}, t when (ms), by who. Only the admin's draft and Publish write it (rule A1). A slot is
  // declared by the subject (SUBJECTS content); anything else is never applied and is listed by contentEntries as
  // orphaned, never dropped.
  const contentOf = (cur, S) => {
    const P = S && S.admin && S.admin.cur ? (cur || {})[S.admin.cur] : cur,
      c = P && P.content;
    return isObj(c) ? c : {};
  };
  // The admin's look-alike picks of subject S ({"a|b": {v, a, b, hide}}, curation.json mont: at the top for the corals,
  // under the subject's own key for the others: SUBJECTS admin.cur), {} with none: the Look-alikes deck reads them.
  const montOf = (cur, S) => {
    const P = S && S.admin && S.admin.cur ? (cur || {})[S.admin.cur] : cur;
    return (isObj(P) && isObj(P.mont) && P.mont) || {};
  };
  // A rank's records by id ({id: {rec, i, at}}: i its place in the list, or its key in a map; at the path of the list or
  // map), from its declaration D. D.at is a path (a.b: a field inside one) or a list of them, read in order: an id met
  // again in a later one is the first one's (the admin's coral data holds the x genera in gen too, the same records).
  const atPath = (R, at) =>
    String(at)
      .split('.')
      .reduce((o, k) => (isObj(o) ? o[k] : undefined), R);
  const contentRecs = (R, D) => {
    const out = new Map();
    (Array.isArray(D.at) ? D.at : [D.at]).forEach(at => {
      const L = atPath(R || {}, at);
      if (Array.isArray(L))
        L.forEach((r, i) => isObj(r) && r.id != null && !out.has(String(r.id)) && out.set(String(r.id), {rec: r, i, at}));
      else if (isObj(L)) Object.entries(L).forEach(([id, r]) => isObj(r) && !out.has(id) && out.set(id, {rec: r, i: id, at}));
    });
    return out;
  };
  // The list or map at path at of out (a copy of built file R, sharing what is not copied yet), copied from R's the first
  // time (each level of the path once: done, the paths copied), so a record can be put in it without touching R.
  function contentBox(out, R, at, done) {
    const P = String(at).split('.');
    let o = out,
      r = R;
    P.forEach((k, j) => {
      r = isObj(r) ? r[k] : undefined;
      const p = P.slice(0, j + 1).join('.');
      if (!done.has(p)) {
        o[k] = Array.isArray(r) ? r.slice() : {...(isObj(r) ? r : {})};
        done.add(p);
      }
      o = o[k];
    });
    return o;
  }
  // Every node a subject's slots reach in built file R: {id: {rank, rec, i, at}}.
  function contentNodes(S, R) {
    const out = new Map();
    Object.entries((S && S.content) || {}).forEach(([rank, D]) =>
      contentRecs(R, D).forEach((x, id) => !out.has(id) && out.set(id, {rank, ...x}))
    );
    return out;
  }
  // A slot's declaration at a rank by its stored name (cues, juv.note, look/f:Angelfishes), with the key of a keyed slot,
  // or null when the rank declares no such slot.
  function contentSlot(S, rank, name) {
    const L = ((((S && S.content) || {})[rank] || {}).slots || []).filter(Boolean),
      n = String(name),
      j = n.indexOf('/'),
      own = L.find(x => !x.rows && !x.map && x.k === n);
    if (own) return {sp: own, key: null};
    if (j < 1 || j === n.length - 1) return null;
    const sp = L.find(x => (x.rows || x.map) && x.k === n.slice(0, j));
    return sp ? {sp, key: n.slice(j + 1)} : null;
  }
  // A slot's types (SUBJECTS content slots t): text, one string; list, a list of strings replaced whole; srcs, a list of
  // sources [{t, u}] replaced whole, t its words and u its web address when it has one (the sea slugs' look-alike lines,
  // seaslug.json genera lsrc: the sources that name the pair, tools/seaslug_game.py genus_looks).
  const srcOk = x => isObj(x) && typeof x.t === 'string' && !!x.t.trim() && (x.u === undefined || typeof x.u === 'string');
  // A value of a slot's type, empty as null (an empty list or text is no value: the slot shows nothing).
  const contentVal = (sp, v) =>
    sp.t === 'list'
      ? Array.isArray(v) && v.length && v.every(x => typeof x === 'string')
        ? v
        : null
      : sp.t === 'srcs'
        ? Array.isArray(v) && v.length && v.every(srcOk)
          ? v
          : null
        : typeof v === 'string' && v.trim()
          ? v
          : null;
  // Whether v may stand in a slot: null (hidden), or a value of its type, every line with words in it.
  const contentOk = (sp, v) =>
    v === null ||
    (sp.t === 'list'
      ? Array.isArray(v) && !!v.length && v.every(x => typeof x === 'string' && !!x.trim())
      : sp.t === 'srcs'
        ? Array.isArray(v) && !!v.length && v.every(srcOk)
        : typeof v === 'string' && !!v.trim());
  // A slot's base value in record r (null: empty), or undefined when a keyed slot's key is not in the base (no such line).
  function contentBase(sp, r, key) {
    const f = sp.f || sp.k;
    if (sp.rows) {
      const x = (Array.isArray(r[f]) ? r[f] : []).find(y => Array.isArray(y) && y[0] === key);
      return x ? contentVal(sp, x[1]) : undefined;
    }
    if (sp.map) return isObj(r[f]) && Object.prototype.hasOwnProperty.call(r[f], key) ? contentVal(sp, r[f][key]) : undefined;
    return contentVal(
      sp,
      f.split('.').reduce((o, x) => (isObj(o) ? o[x] : undefined), r)
    );
  }
  // Writes v (null: hidden) into record r, a copy the caller owns. A keyed slot keeps its line and only changes its words
  // (blank when hidden): the line is the pair, and pairs are structure (treeGen look, treeReplayGen).
  function contentPut(sp, r, key, v) {
    const f = sp.f || sp.k,
      val = Array.isArray(v) ? v.slice() : v;
    // A list whose lines carry their sources' numbers (mby[f][i], the record's msrc indexes of line i: the fish's and the
    // sea slugs' ID marks): a line kept word for word keeps its numbers, a new or reworded one gets none (its source is the
    // edit's own, esrc), so no line shows a source it was not read from (rule C2).
    if (sp.t === 'list' && !sp.rows && !sp.map && isObj(r.mby) && Array.isArray(r.mby[f])) {
      const was = Array.isArray(r[f]) ? r[f] : [],
        by = r.mby[f];
      r.mby = {...r.mby, [f]: (Array.isArray(val) ? val : []).map(x => (was.indexOf(x) >= 0 ? by[was.indexOf(x)] || [] : []))};
    }
    if (sp.rows) r[f] = r[f].map(y => (Array.isArray(y) && y[0] === key ? [y[0], val == null ? '' : val, ...y.slice(2)] : y));
    // hidden, a line keeps its pair with no words: an empty text, or an empty list of sources (its readers map the list)
    else if (sp.map) r[f] = {...r[f], [key]: val == null ? (sp.t === 'srcs' ? [] : '') : val};
    else {
      const P = f.split('.'),
        last = P.pop();
      let o = r;
      P.forEach(x => (o = o[x] = isObj(o[x]) ? {...o[x]} : {}));
      // keep: a field every record holds and its readers read as such (a coral genus's crit, imr, sum): hidden, it stays,
      // empty ([] or ''), which reads as no value (contentVal) and shows nothing
      if (val == null && sp.keep) o[last] = sp.t === 'list' ? [] : '';
      else if (val == null) delete o[last];
      else o[last] = val;
    }
  }
  // An entry's state against the base value now: absorbed (the base now says what the editor wrote), fresh (the
  // base is the one he edited), else stale (the base changed since: the admin shows the three texts; players keep his).
  const contentState = (e, base) => (eq(base, e && e.v) ? 'absorbed' : eq(base, e && e.was) ? 'fresh' : 'stale');
  const contentSrc = s =>
    isObj(s) && typeof s.t === 'string' && s.t.trim() ? {t: s.t, ...(typeof s.u === 'string' && s.u ? {u: s.u} : {})} : null;
  // Every node entry of the subject's content C (contentOf) against built file R: {id (as stored), node (the id in force:
  // renamedId), slot, e, rank, sp, key, base, state}, state fresh, stale or absorbed when it applies, else orphan with why:
  // node (no node of that id), slot (not declared at its rank, or a line the base does not hold), value (not of its type),
  // shadow (an old id's entry for a slot its new id's own entry sets). Sorted by node id, then slot.
  function contentEntries(S, R, C) {
    const N = contentNodes(S, R),
      out = [],
      taken = new Set();
    const L = Object.entries(isObj(C && C.nodes) ? C.nodes : {})
      .flatMap(([id, m]) => Object.entries(isObj(m) ? m : {}).map(([slot, e]) => ({id, node: renamedId(S, id), slot, e})))
      // the circle slot is structure (structEntries), never a text slot
      .filter(x => !(x.slot === CIRCLE_SLOT && S && S.structure && S.structure.circle))
      // the new id's own entries first, so an old id's entry is the one shadowed
      .sort(
        (a, b) =>
          (a.id !== a.node) - (b.id !== b.node) ||
          (a.node < b.node ? -1 : a.node > b.node ? 1 : a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0)
      );
    L.forEach(x => {
      const n = N.get(x.node),
        d = n && contentSlot(S, n.rank, x.slot),
        base = d ? contentBase(d.sp, n.rec, d.key) : undefined,
        why = !n
          ? 'node'
          : !d || base === undefined
            ? 'slot'
            : !isObj(x.e) || !contentOk(d.sp, x.e.v)
              ? 'value'
              : taken.has(x.node + '\n' + x.slot)
                ? 'shadow'
                : '';
      if (!why) taken.add(x.node + '\n' + x.slot);
      out.push({
        ...x,
        rank: n ? n.rank : '',
        sp: d ? d.sp : null,
        key: d ? d.key : null,
        base: base === undefined ? null : base,
        state: why ? 'orphan' : contentState(x.e, base),
        ...(why ? {why} : {})
      });
    });
    return out.sort((a, b) => (a.node < b.node ? -1 : a.node > b.node ? 1 : a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0));
  }
  // Built file R with the edits of subject S in curation cur laid over it (the editor's text in force, a stale one
  // included, until he answers it): a new object sharing every record it does not change, R itself when nothing applies.
  // It reads v and src only (players get the curation without was, t and by: tools/curplay.py). An edited record carries
  // esrc {slot: {t, u}}, the sources given, shown with the slot. Called by the app before the units are made (app.js
  // treeBuild) and by the admin, to show what is in force.
  // The structure first (structApply: the circles and pairs, so the words of a pair added land on its line), unless o says
  // structure: false (the app before the sheet script that replays under it: rule D4, STRUCT_SHEET); the text slots are
  // then read against it (a pair withdrawn: its words' slot is orphaned, kept and not applied).
  function contentApply(S, R, cur, o) {
    if (!(o && o.structure === false)) R = structApply(S, R, cur);
    const Cm = contentOf(cur, S);
    if (!isObj(Cm.nodes) || !Object.keys(Cm.nodes).length) return R; // nothing edited: no node index to build
    const L = contentEntries(S, R, Cm).filter(x => x.state !== 'orphan');
    if (!L.length) return R;
    const N = contentNodes(S, R),
      out = {...R},
      done = new Set(),
      recs = new Map();
    L.forEach(x => {
      const n = N.get(x.node),
        at = S.content[n.rank].at;
      let r = recs.get(x.node);
      if (!r) {
        r = JSON.parse(JSON.stringify(n.rec));
        recs.set(x.node, r);
        // in its list or map, and in any other of its rank's that holds the same record (the admin's merged coral gen)
        (Array.isArray(at) ? at : [at]).forEach(a => {
          if (a === n.at || (atPath(R, a) || {})[n.i] === n.rec) contentBox(out, R, a, done)[n.i] = r;
        });
      }
      contentPut(x.sp, r, x.key, x.e.v);
      const s = contentSrc(x.e.src);
      if (s) r.esrc = {...(r.esrc || {}), [x.slot]: s};
    });
    return out;
  }

  // ---- The structure: circles and look-alike pairs ----
  // Stored in the same content map (contentOf): a node's circle slot {v: a circle of SUBJECTS structure circle of, or null
  // for in no circle, was, src, t, by} and pairs {"a|b": {v: 1 or null, was, src, t, by}}, a and b two node ids in
  // code-point order. Read under the ids as stored (an old id is not read through SUBJECTS renamed: the editor writes the
  // ids in force), so tools/fish_inforce.py reads them as this does.
  const CIRCLE_SLOT = 'circle';
  // Every structure entry of content map C against built file R: {circles: [{id, e, base, state}], pairs: [{key, a, b,
  // e, base, state}]}, state fresh, stale or absorbed (contentState) when it applies, else orphan with why: node (no node
  // of that id at the rank: an editor moves or removes a node of the base, never brings one in), value (not a declared
  // circle or null; a pair's not 1 or null), key (a pair key not two ids in code-point order). base: the record's circle
  // (null: none), a pair's 1 when either side's rows hold the other, else null. In id or key order.
  function structEntries(S, R, C) {
    const D = (S && S.structure) || {},
      at = rank => (S.content && S.content[rank] ? contentRecs(R, S.content[rank]) : new Map()),
      st = (e, base, why) => (why ? {state: 'orphan', why} : {state: contentState(e, base)}),
      out = {circles: [], pairs: []};
    if (D.circle) {
      const N = at(D.circle.rank);
      Object.keys(isObj(C && C.nodes) ? C.nodes : {})
        .sort()
        .forEach(id => {
          const m = C.nodes[id];
          if (!isObj(m) || !(CIRCLE_SLOT in m)) return;
          const e = m[CIRCLE_SLOT],
            n = N.get(id),
            base = n && n.rec.circle != null ? n.rec.circle : null,
            why = !n ? 'node' : !isObj(e) || !(e.v === null || D.circle.of.includes(e.v)) ? 'value' : '';
          out.circles.push({id, e, base, ...st(e, base, why)});
        });
    }
    if (D.pairs) {
      const N = at(D.pairs.rank),
        f = D.pairs.slot,
        has = (r, o) => (Array.isArray(r[f]) ? r[f] : []).some(y => pairIdOf(y) === o);
      Object.keys(isObj(C && C.pairs) ? C.pairs : {})
        .sort()
        .forEach(key => {
          const e = C.pairs[key],
            p = key.split('|'),
            [a, b] = p,
            x = N.get(a),
            y = N.get(b),
            base = x && y && (has(x.rec, b) || has(y.rec, a)) ? 1 : null,
            why =
              p.length !== 2 || !a || !b || !(a < b) ? 'key' : !x || !y ? 'node' : !isObj(e) || !(e.v === 1 || e.v === null) ? 'value' : '';
          out.pairs.push({key, a, b, e, base, ...st(e, base, why)});
        });
      // The subject's own guard (SUBJECTS structure pairs hold: the corals' ★ rule, starHold): the changes it refuses among
      // those that apply are never applied, orphaned with why hold, so the apply, the stamp, the admin and the sheet agree.
      if (typeof D.pairs.hold === 'function') {
        const H = D.pairs.hold(
          R,
          out.pairs.filter(x => x.state !== 'orphan' && x.e.v !== x.base).map(x => ({key: x.key, a: x.a, b: x.b, v: x.e.v}))
        );
        if (H && H.size)
          out.pairs = out.pairs.map(x =>
            H.has(x.key) ? {key: x.key, a: x.a, b: x.b, e: x.e, base: x.base, state: 'orphan', why: 'hold'} : x
          );
      }
    }
    return out;
  }
  // A look-alike row's other node id: a row [id, words] (fish.json look) or the id itself (data.json look: genus names).
  const pairIdOf = y => (Array.isArray(y) ? (y[0] == null ? '' : String(y[0])) : typeof y === 'string' ? y : '');
  // Whether content map Cm holds any structure entry (a circle slot, a pair).
  const structHas = Cm =>
    Object.values(isObj(Cm && Cm.nodes) ? Cm.nodes : {}).some(m => isObj(m) && CIRCLE_SLOT in m) ||
    (isObj(Cm && Cm.pairs) && Object.keys(Cm.pairs).length > 0);
  // Built file R with the structure in force (the editor's value, a stale one included, until he answers it): the
  // entries that apply and change the base, handed to the subject's own SUBJECTS structure apply ({circle: Map id → v,
  // pairs: [{a, b, v, src}]}); R itself when none does or the subject declares no structure.
  function structApply(S, R, cur) {
    const D = S && S.structure;
    if (!D || typeof D.apply !== 'function') return R;
    const Cm = contentOf(cur, S);
    if (!structHas(Cm)) return R;
    const E = structEntries(S, R, Cm),
      live = x => x.state !== 'orphan' && x.e.v !== x.base,
      circle = new Map(E.circles.filter(live).map(x => [x.id, x.e.v])),
      pairs = E.pairs.filter(live).map(x => {
        const s = contentSrc(x.e.src);
        return {a: x.a, b: x.b, v: x.e.v, ...(s ? {src: s} : {})};
      });
    return circle.size || pairs.length ? D.apply(R, {circle, pairs}) : R;
  }
  // The structure of built file R in a canonical text: every node of the circle rank with its circle (null: none), every
  // pair of the pair rank (either side's rows; a|b in code-point order), sorted.
  function structCanon(S, R) {
    const D = (S && S.structure) || {},
      c = [],
      p = new Set();
    if (D.circle) contentRecs(R, S.content[D.circle.rank]).forEach((x, id) => c.push([id, x.rec.circle != null ? x.rec.circle : null]));
    if (D.pairs)
      contentRecs(R, S.content[D.pairs.rank]).forEach((x, id) =>
        (Array.isArray(x.rec[D.pairs.slot]) ? x.rec[D.pairs.slot] : []).forEach(y => {
          const o = pairIdOf(y);
          if (o && o !== id) p.add(id < o ? id + '|' + o : o + '|' + id);
        })
      );
    c.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return JSON.stringify({c, p: [...p].sort()});
  }
  // The structure stamp: '' while the structure in force is the base's (no
  // structure edit, or none that changes anything: nothing to replay, so a device or a saved copy that never held one
  // agrees), else a short hash of the canonical structure in force (structCanon). Computed the same way by the app (its
  // players' copy of the curation), the admin and the sheet (curation.json on main); never stored in curation.json. When
  // the stamp a player's progress was replayed with differs from the sheet's, the sheet replays their log.
  function structStamp(S, R, cur) {
    const A = structApply(S, R, cur);
    if (A === R) return '';
    const a = structCanon(S, A);
    return a === structCanon(S, R) ? '' : hash53(a);
  }
  // The structure entries as stored, hashed ('' for none): the sheet's cache key for its replay units (Code.gs subjSt_),
  // so it reads fish.json again only when they change; never the stamp itself (a base rebuilt can change the stamp).
  function structFp(S, cur) {
    if (!(S && S.structure)) return '';
    const Cm = contentOf(cur, S),
      v = e => (isObj(e) ? (e.v === undefined ? '~' : e.v) : '~'),
      c = Object.keys(isObj(Cm.nodes) ? Cm.nodes : {})
        .sort()
        .filter(id => isObj(Cm.nodes[id]) && CIRCLE_SLOT in Cm.nodes[id])
        .map(id => [id, v(Cm.nodes[id][CIRCLE_SLOT])]),
      p = Object.keys(isObj(Cm.pairs) ? Cm.pairs : {})
        .sort()
        .map(k => [k, v(Cm.pairs[k])]);
    return c.length || p.length ? hash53(JSON.stringify({c, p})) : '';
  }
  // The content map as published (admin.js output, fishOut): node ids, slots and pair keys sorted, each entry's keys in the
  // format's order (v, was, src, t, by, then any other), empty maps left out; {} when nothing is left. The draft keeps its
  // empty maps (a restored slot leaves {}), so a merge never drops what another device published meanwhile (merge3).
  function contentOut(C) {
    const K = ['v', 'was', 'src', 't', 'by'],
      ent = e =>
        isObj(e)
          ? Object.fromEntries(
              [
                ...K.filter(k => k in e),
                ...Object.keys(e)
                  .filter(k => !K.includes(k))
                  .sort()
              ].map(k => [k, e[k]])
            )
          : e,
      sortMap = (m, f) => {
        const o = {};
        Object.keys(isObj(m) ? m : {})
          .sort()
          .forEach(k => {
            const v = f(m[k]);
            if (v != null && !(isObj(v) && !Object.keys(v).length)) o[k] = v;
          });
        return o;
      },
      out = {};
    Object.keys(isObj(C) ? C : {})
      .sort()
      .forEach(k => {
        const v = k === 'nodes' ? sortMap(C.nodes, m => sortMap(m, ent)) : k === 'pairs' ? sortMap(C.pairs, ent) : C[k];
        if (v != null && !(isObj(v) && !Object.keys(v).length)) out[k] = v;
      });
    return out;
  }
  // One edit, as the admin's draft writes it (one Save, one Undo step): content map C with node id's slot set to v (null:
  // hidden) over the base value now (was), with its source src when given and the time t; a value equal to the base
  // removes the entry (contentDrop: nothing of his to keep). A new map: the draft's maps are never changed in place.
  function contentSet(C, id, slot, v, base, src, t) {
    if (eq(v, base)) return contentDrop(C, id, slot);
    const s = contentSrc(src),
      c = isObj(C) ? C : {},
      nodes = isObj(c.nodes) ? c.nodes : {};
    return {
      ...c,
      nodes: {
        ...nodes,
        [id]: {...(isObj(nodes[id]) ? nodes[id] : {}), [slot]: {v, was: base == null ? null : base, ...(s ? {src: s} : {}), t}}
      }
    };
  }
  // The slot's entry removed (↺ Restore, Take the new): the base shows again. Its node's map stays, {} when emptied, and so
  // does nodes: a key gone would make the next merge drop what another device published in it meanwhile (merge3).
  function contentDrop(C, id, slot) {
    const c = isObj(C) ? C : {},
      nodes = isObj(c.nodes) ? c.nodes : {},
      m = {...(isObj(nodes[id]) ? nodes[id] : {})};
    delete m[slot];
    return {...c, nodes: {...nodes, [id]: m}};
  }
  // A pair's key: the two node ids in code-point order joined by |, as structEntries reads it.
  const contentPairKey = (a, b) => {
    const x = String(a),
      y = String(b);
    return x < y ? x + '|' + y : y + '|' + x;
  };
  // One pair edit, as the admin's draft writes it (one click, one Undo step): content map C with pair key k declared (v
  // 1) or withdrawn (v null) over the base now (1 when the base declares it, else null), with its source src when given
  // (asked when a pair is added, never required) and the time t; a value equal to the base removes the entry
  // (contentPairDrop). A new map.
  function contentPairSet(C, k, v, base, src, t) {
    if (eq(v, base)) return contentPairDrop(C, k);
    const s = contentSrc(src),
      c = isObj(C) ? C : {},
      pairs = isObj(c.pairs) ? c.pairs : {};
    return {...c, pairs: {...pairs, [k]: {v, was: base == null ? null : base, ...(s ? {src: s} : {}), t}}};
  }
  // The pair's entry removed (↺ Restore): the base's pair again. The pairs map stays, {} when emptied, for the merge, as a
  // node's map does (contentDrop).
  function contentPairDrop(C, k) {
    const c = isObj(C) ? C : {},
      pairs = {...(isObj(c.pairs) ? c.pairs : {})};
    delete pairs[k];
    return {...c, pairs};
  }
  // The fish sheets (docs/reviews/2026-11-05-fish-sheets-study.md, option B) read from fish.json alone: fam, gen and sp
  // by id (the species of the families only, none left out of the game), spOf (a species by its id or its sheet id
  // s:<name>) and order, the families in the key's order (its group numbers, then the file's order; no group last).
  // go(id): the sheet a family, genus or species id opens: a genus with one species opens that species' sheet; the only
  // genus of its family has no page of its own (the family sheet lists its species); any other genus opens its short
  // page. null for an id it does not know.
  function treeSheets(F) {
    const fam = {},
      gen = {},
      sp = {},
      byName = {},
      bySci = {};
    ((F && F.families) || []).forEach(f => (fam[f.id] = f));
    ((F && F.genera) || []).forEach(g => (gen[g.id] = g));
    ((F && F.species) || []).forEach(s => {
      if (!s.family || !fam[s.family]) return;
      sp[s.id] = s;
      byName[s.name] = s;
      bySci[spUnitId('sci', s.id)] = s;
    });
    const order = Object.values(fam)
      .map((f, i) => [f, i])
      .sort((a, b) => (a[0].group || 99) - (b[0].group || 99) || a[1] - b[1])
      .map(x => x[0].id);
    // a species by its id (s091), its sheet id (s:<name>) or its unit (s:s091, sci:s091: treeSpUnits)
    const spOf = id => {
      const x = String(id).startsWith('s:') ? String(id).slice(2) : null;
      return sp[id] || bySci[id] || (x !== null ? sp[x] || byName[x] || bySci[x] || null : null);
    };
    const go = id => {
      if (fam[id]) return id;
      const s = spOf(id);
      if (s) return 's:' + s.name;
      const g = gen[id];
      if (!g || !fam[g.family]) return null;
      const L = (g.species || []).filter(x => sp[x]);
      if (L.length === 1) return 's:' + sp[L[0]].name;
      return fam[g.family].genera.length === 1 ? g.family : id;
    };
    return {fam, gen, sp, order, spOf, go};
  }
  // An object keyed by units (a progress record, the first-meeting cards) with its old ids under the new ones, the
  // mix-up and offer maps inside each record too (conf, off). Both present (an old app saved again after the rename):
  // the record with more answers stays (a count map adds up). The object itself when nothing is renamed.
  function renameUnits(S, o) {
    const R = S && S.renamed;
    const old = m => isObj(m) && Object.keys(m).some(k => R.ids[k]);
    if (!R || !isObj(o) || !Object.keys(o).some(k => R.ids[k] || (isObj(o[k]) && (old(o[k].conf) || old(o[k].off))))) return o;
    const n = x => (isObj(x) ? (Number(x.ok) || 0) + (Number(x.ko) || 0) : -1),
      counts = m => {
        if (!isObj(m) || !Object.keys(m).some(k => R.ids[k])) return m;
        const c = {};
        Object.entries(m).forEach(([k, v]) => {
          const j = renamedId(S, k);
          c[j] = typeof v === 'number' && typeof c[j] === 'number' ? c[j] + v : c[j] === undefined ? v : c[j];
        });
        return c;
      },
      inner = v => {
        if (!isObj(v)) return v;
        const w = {...v};
        ['conf', 'off'].forEach(k => w[k] !== undefined && (w[k] = counts(w[k])));
        return w;
      },
      out = {};
    Object.keys(o).forEach(k => {
      if (R.ids[k]) return;
      out[k] = inner(o[k]);
    });
    Object.keys(o).forEach(k => {
      if (!R.ids[k]) return;
      const j = renamedId(S, k),
        v = inner(o[k]);
      if (!(j in out) || n(v) > n(out[j])) out[j] = v;
    });
    return out;
  }
  // One answer-log entry (the app's queue, a sheet row read back) with the subject's old unit ids renamed, the same map for
  // the whole row so it keeps what happened: an old id is the family of the photo shown when it was the unit shown (a
  // right answer stays right, the unit shown stays among the choices), else the family that took the entry over. g, a,
  // ch (ids joined by spaces), m (a duel's mode: quiz-duel|A|B), tn and ta (the names at that rank). The entry itself
  // when nothing is renamed.
  function renameLogEntry(S, a) {
    const R = S && S.renamed;
    if (!R || !a) return a;
    const one = x => (x === a.g ? renamedId(S, x, a.sp) : renamedId(S, x));
    const touched = [a.g, a.a, ...String(a.ch || '').split(' '), ...String(a.m || '').split('|')].some(x => R.ids[x]);
    if (!touched) return a;
    const out = {...a};
    if (a.g) out.g = one(a.g);
    if (a.a) out.a = one(a.a);
    if (a.ch) out.ch = String(a.ch).split(' ').map(one).join(' ');
    if (a.m) out.m = String(a.m).split('|').map(one).join('|');
    if (R.ids[a.g]) out.tn = R.names[out.g] || a.tn;
    if (R.ids[a.a]) out.ta = R.names[out.a] || a.ta;
    return out;
  }


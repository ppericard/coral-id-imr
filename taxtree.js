// A classification as a tree of any depth and any ranks (docs/ARCHITECTURE.md; docs/ROADMAP.md "The Tree tab"): pure
// functions, no DOM, no subject named
// (rule S1), for the admin's Photos › Tree (admin.js renderTree) and the tests (tests/taxtree.test.js). Loaded by
// admin.html; a subject's own adapter turns its references into nodes. A node: {id, name, rank (any word, or none), up
// (its parent's id in this classification, absent for a root), ...anything else the adapter keeps}. One classification =
// one parent per node; another classification (the key, WoRMS) is another tree built from its own nodes. Groups (the IMR
// entries, circles, look-alikes) are never extra parents: they are tags, read as filters (ttPass, ttReach).
(function (root) {
  // The tree, built once: node and kids by id (siblings in the order given), the roots, and what was wrong with the nodes
  // (reported, never fixed silently): a second node with the same id (left out), a parent not among the nodes or a cycle
  // (the node becomes a root).
  function ttBuild(nodes) {
    const node = new Map(),
      kids = new Map(),
      up = new Map(),
      roots = [],
      problems = [];
    (nodes || []).forEach(n => {
      if (!n || n.id == null || n.id === '') return problems.push({id: n && n.id, why: 'no id'});
      if (node.has(n.id)) return problems.push({id: n.id, why: 'duplicate id'});
      node.set(n.id, n);
      kids.set(n.id, []);
    });
    // A parent chain that comes back to the node itself: a cycle (a node that only hangs off a cycle is not in it: it
    // stays under its parent, the cycle being cut where it is).
    const loops = id => {
      const seen = new Set();
      // a node already placed goes by the parent it was given (a cycle already cut stays cut)
      const next = p => (up.has(p) ? up.get(p) : node.get(p).up);
      for (let p = node.get(id).up; p != null && node.has(p) && !seen.has(p); p = next(p)) {
        if (p === id) return true;
        seen.add(p);
      }
      return false;
    };
    node.forEach((n, id) => {
      let p = n.up == null || n.up === '' ? null : n.up;
      if (p !== null && !node.has(p)) {
        problems.push({id, why: 'parent not found: ' + p});
        p = null;
      } else if (p !== null && loops(id)) {
        problems.push({id, why: 'cycle'});
        p = null;
      }
      up.set(id, p);
      if (p === null) roots.push(id);
      else kids.get(p).push(id);
    });
    return {node, kids, up, roots, problems};
  }
  // The nodes of a classification read from a reference table (a parent-pointer table keyed by the reference's own ids:
  // {key: {name, rank, parent (a key, none for a root)}}, WoRMS's AphiaIDs for a marine subject), hung above the leaves
  // the subject plays: each leaf keeps its own id and fields (two leaves may share one reference: a synonym kept apart),
  // under the parent of its reference; each ancestor becomes one node, once, {id: o.id(key), name, rank: o.rank(rank),
  // up, ref: key}, so its id lives in the adapter's namespace and never meets a leaf's. Nodes come in the order the
  // leaves meet them (a parent before its children). Reported, never fixed silently ({id, why}): a leaf with no
  // reference, or one the table does not have, and a parent the table does not have (the node becomes a root); a cycle
  // in the table stops the walk, and ttBuild reports and cuts it. A leaf with no reference of its own but an `at` (the key
  // of the node it sits under: a genus-level leaf, a species with no published name, under its genus) hangs there, `at`
  // reported like a missing parent when the table lacks it. Returns {nodes, problems} for ttBuild.
  function ttFromRef(leaves, ref, o = {}) {
    const idOf = o.id || (k => String(k)),
      rankOf = o.rank || (r => r),
      R = ref || {},
      has = k => k != null && k !== '' && Object.prototype.hasOwnProperty.call(R, k),
      nodes = [],
      problems = [],
      made = new Set();
    // The ancestors from key k up, those not made yet, made root first; the id of k (null for none).
    const up = (k, from) => {
      if (k == null || k === '') return null;
      if (!has(k)) {
        problems.push({id: from, why: 'parent not found: ' + k});
        return null;
      }
      const walk = [];
      for (let x = k; has(x) && !made.has(String(x)); x = R[x].parent) {
        made.add(String(x));
        walk.push(x);
      }
      walk.reverse().forEach(x => {
        const r = R[x],
          p = r.parent,
          n = {id: idOf(x), name: r.name, ref: String(x)};
        if (r.rank != null && r.rank !== '') n.rank = rankOf(r.rank);
        if (has(p)) n.up = idOf(p);
        else if (p != null && p !== '') problems.push({id: n.id, why: 'parent not found: ' + p});
        nodes.push(n);
      });
      return idOf(k);
    };
    (leaves || []).forEach(l => {
      const n = {...l};
      delete n.up;
      delete n.at;
      if ((l.ref == null || l.ref === '') && l.at != null && l.at !== '') {
        const p = up(l.at, l.id);
        if (p !== null) n.up = p;
      } else if (l.ref == null || l.ref === '') problems.push({id: l.id, why: 'no reference'});
      else if (!has(l.ref)) problems.push({id: l.id, why: 'reference not found: ' + l.ref});
      else {
        const p = up(R[l.ref].parent, l.id);
        if (p !== null) n.up = p;
      }
      nodes.push(n);
    });
    return {nodes, problems};
  }
  // Its ancestors and itself, the root first ([] for an id not in the tree).
  const ttPath = (T, id) => {
    const out = [];
    for (let x = T.node.has(id) ? id : null; x !== null; x = T.up.get(x)) out.unshift(x);
    return out;
  };
  // Every node under id (itself included), depth first in the tree's order.
  const ttUnder = (T, id) => {
    const out = [],
      go = x => {
        out.push(x);
        T.kids.get(x).forEach(go);
      };
    if (T.node.has(id)) go(id);
    return out;
  };
  // Its leaves: the nodes under it with no child (the subject's playable rank: a fish species, a coral genus).
  const ttLeaves = (T, id) => ttUnder(T, id).filter(x => !T.kids.get(x).length);
  // f(leaf node) summed over the leaves of every node, computed once bottom-up: {id: sum}.
  function ttRoll(T, f) {
    const out = {},
      go = x => {
        const K = T.kids.get(x);
        out[x] = K.length ? K.reduce((s, k) => s + go(k), 0) : +f(T.node.get(x)) || 0;
        return out[x];
      };
    T.roots.forEach(go);
    return out;
  }
  // The first node under id (itself first, then depth first) that pred accepts, else null.
  const ttFirst = (T, id, pred) => ttUnder(T, id).find(x => pred(T.node.get(x))) || null;
  // The nearest node on the way up from id (itself first, then its parent, up to the root) that pred accepts, else null:
  // a node's unit (the page that holds its photos' choices), or null for a node above every unit.
  const ttNearest = (T, id, pred) =>
    ttPath(T, id)
      .reverse()
      .find(x => pred(T.node.get(x))) ?? null;
  // The leaves a set of filters lets through (the Tree's tags, combined: All | IMR and a circle, a look-alike pair, what
  // needs work…): each filter a test on a node (a tag, carried at any rank: a family, a genus, a leaf); a leaf passes one
  // when it or a node above it passes the test, and the set when it passes every filter (none: every leaf). A tag is read
  // through the leaves, so two tags at different ranks combine (a circle on the families, a need on the leaves), and the
  // leaves' ids carry the result to another classification of the same leaves (ttReach). A Set of leaf ids.
  function ttPass(T, preds = []) {
    const out = new Set(),
      ok = new Map(preds.map(f => [f, new Map()])),
      on = (f, x) => {
        const m = ok.get(f);
        if (!m.has(x)) m.set(x, !!f(T.node.get(x)));
        return m.get(x);
      };
    T.node.forEach((n, id) => {
      if (T.kids.get(id).length) return;
      const path = ttPath(T, id);
      if (preds.every(f => path.some(x => on(f, x)))) out.add(id);
    });
    return out;
  }
  // The nodes shown for a set of leaves (ttPass's, from this tree or another classification of the same leaves): each
  // leaf of this tree in it, and the nodes that lead to it; a node with none of them under it is not shown, even when a
  // filter accepted it in another branch. keep: ids always shown with their ancestors (the node on screen). A Set of ids.
  function ttReach(T, leaves, keep = []) {
    const out = new Set();
    leaves.forEach(id => ttPath(T, id).forEach(x => out.add(x)));
    keep.forEach(id => ttPath(T, id).forEach(x => out.add(x)));
    return out;
  }
  // The nodes one filter shows: those pred accepts (a tag: IMR, a circle), their ancestors (to reach them) and everything
  // under them (every node resolves to its leaves: ttPass and ttReach with that filter alone); keep as ttReach's.
  const ttShown = (T, pred, keep = []) => ttReach(T, ttPass(T, [pred]), keep);
  // The rows on screen: the nodes shown (all when shown is null) whose ancestors are all open, depth first, each with its
  // level (1 = a root), whether it has children shown, whether open, and its place among its siblings shown (the WAI-ARIA
  // tree's aria-level, aria-expanded, aria-posinset, aria-setsize).
  function ttRows(T, open, shown) {
    const rows = [],
      ok = x => !shown || shown.has(x),
      go = (L, level) =>
        L.forEach((x, i) => {
          const K = T.kids.get(x).filter(ok),
            o = !!K.length && open.has(x);
          rows.push({id: x, level, kids: K.length, open: o, pos: i + 1, size: L.length});
          if (o) go(K, level + 1);
        });
    go(T.roots.filter(ok), 1);
    return rows;
  }
  // A key on the row id of the tree (the WAI-ARIA tree pattern): what to do, or null for a key the tree leaves alone.
  // {focus: id} moves the focus, {open: id} / {close: id} unfolds or folds, {select: id} opens the node's page,
  // {openAll: [ids]} unfolds every sibling with children ('*').
  function ttKey(T, rows, id, key) {
    const i = rows.findIndex(r => r.id === id),
      r = rows[i];
    if (!r) return rows.length ? {focus: rows[0].id} : null;
    switch (key) {
      case 'ArrowDown':
        return i < rows.length - 1 ? {focus: rows[i + 1].id} : null;
      case 'ArrowUp':
        return i > 0 ? {focus: rows[i - 1].id} : null;
      case 'ArrowRight':
        return !r.kids ? null : r.open ? {focus: rows[i + 1].id} : {open: id};
      case 'ArrowLeft': {
        if (r.open) return {close: id};
        const p = T.up.get(id);
        return p !== null && p !== undefined && rows.some(x => x.id === p) ? {focus: p} : null;
      }
      case 'Home':
        return {focus: rows[0].id};
      case 'End':
        return {focus: rows[rows.length - 1].id};
      case 'Enter':
      case ' ':
        return {select: id};
      case '*': {
        const p = T.up.get(id),
          sib = p === null || p === undefined ? T.roots : T.kids.get(p);
        return {openAll: sib.filter(x => rows.some(y => y.id === x && y.kids))};
      }
      default:
        return null;
    }
  }
  const API = {ttBuild, ttFromRef, ttPath, ttUnder, ttLeaves, ttRoll, ttFirst, ttNearest, ttPass, ttReach, ttShown, ttRows, ttKey};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

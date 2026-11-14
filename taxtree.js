// A classification as a tree of any depth and any ranks (docs/ROADMAP.md "The Tree tab"; Pierre, 2026-11-13: "un système
// plus générique qui peut fonctionner quel que soit le nombre de niveaux"): pure functions, no DOM, no subject named
// (rule S1), for the admin's Photos › Tree (admin.js renderFishUnits) and the tests (tests/taxtree.test.js). Loaded by
// admin.html; a subject's own adapter turns its references into nodes. A node: {id, name, rank (any word, or none), up
// (its parent's id in this classification, absent for a root), ...anything else the adapter keeps}. One classification =
// one parent per node; another classification (the key, WoRMS) is another tree built from its own nodes. Groups (the IMR
// entries, circles, look-alikes) are never extra parents: they are tags, read as filters (ttShown).
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
  // The nodes a filter shows: those pred accepts (a tag: IMR, a circle), their ancestors (to reach them) and everything
  // under them; keep: ids always shown with their ancestors (the node on screen). A Set of ids.
  function ttShown(T, pred, keep = []) {
    const out = new Set();
    T.node.forEach((n, id) => {
      if (!pred(n)) return;
      ttPath(T, id).forEach(x => out.add(x));
      ttUnder(T, id).forEach(x => out.add(x));
    });
    keep.forEach(id => ttPath(T, id).forEach(x => out.add(x)));
    return out;
  }
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
  const API = {ttBuild, ttPath, ttUnder, ttLeaves, ttRoll, ttFirst, ttNearest, ttShown, ttRows, ttKey};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// The points to handle (Pierre, 2026-11-05: he settles most open points himself and never reads a text list): pure
// functions, no DOM, for the admin's Inbox › To do › Points (admin.js renderPoints) and the tests (tests/points.test.js).
// Loaded by admin.html only. The points are points.json (written by agents); Pierre's state per point is his curation,
// curation.json "points" {id: {s, n, a}}: s 'wait' (stand-by), 'done' (resolved) or 'drop' (dismissed), absent = open;
// n his notes; a the trainer's answers, one per photo (by photo id).
(function (root) {
  // The statuses, in the list's order: open first, stand-by after it (sunk, still shown), resolved and dismissed folded
  // at the bottom. [key, the list's heading, the action's name on a point's page].
  const PT_STATUS = [
    ['open', 'Open', 'Reopen'],
    ['wait', 'Stand-by', 'Stand-by'],
    ['done', 'Resolved', 'Resolved'],
    ['drop', 'Dismissed', 'Dismiss']
  ];
  const ptStatus = (state, id) => {
    const s = ((state || {})[id] || {}).s;
    return PT_STATUS.some(x => x[0] === s) ? s : 'open';
  };
  // The list, by status, each in the file's order (the file's order is the priority: agents put the most important
  // first). Returns {open: [...], wait: [...], done: [...], drop: [...]}.
  const pointsOrder = (points, state) => {
    const out = Object.fromEntries(PT_STATUS.map(([k]) => [k, []]));
    (points || []).forEach(p => out[ptStatus(state, p.id)].push(p));
    return out;
  };
  // A point's age from its date (YYYY-MM-DD, the day it was added): "today", "3 d", "5 wk", "4 mo".
  const pointAge = (at, now = Date.now()) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(at || '');
    if (!m) return '';
    const t0 = new Date(+m[1], m[2] - 1, +m[3]).getTime(),
      n = new Date(now),
      d = Math.max(0, Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() - t0) / 864e5));
    return d < 1 ? 'today' : d < 14 ? `${d} d` : d < 61 ? `${Math.floor(d / 7)} wk` : `${Math.floor(d / 30.44)} mo`;
  };
  // What is wrong with points.json (a list of messages, empty when its shape is right): the admin leaves out a point
  // with a problem, the unit test fails on any. subjects: the subject ids a point may name (core.js SUBJECTS).
  const pointsProblems = (J, subjects) => {
    const bad = [];
    if (!J || typeof J !== 'object') return ['not an object'];
    const kinds = J.kinds || {};
    if (!Object.keys(kinds).length) bad.push('no kinds');
    if (!Array.isArray(J.points)) return [...bad, 'points is not a list'];
    const ids = new Set();
    J.points.forEach((p, i) => bad.push(...pointProblems(p, kinds, subjects).map(x => `point ${i} (${(p && p.id) || '?'}): ${x}`)));
    J.points.forEach(p => {
      if (p && ids.has(p.id)) bad.push(`id ${p.id} used twice`);
      if (p) ids.add(p.id);
    });
    return bad;
  };
  const str = x => typeof x === 'string' && x.trim() !== '';
  const pointProblems = (p, kinds, subjects) => {
    const bad = [];
    if (!p || typeof p !== 'object') return ['not an object'];
    if (!str(p.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) bad.push('id must be lower-case words joined by -');
    if (!Object.prototype.hasOwnProperty.call(kinds, p.kind)) bad.push(`kind ${p.kind} not in kinds`);
    if (!str(p.subj) || (subjects && !subjects.includes(p.subj))) bad.push(`subj must be one of ${(subjects || []).join(', ')}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.at || '')) bad.push('at must be YYYY-MM-DD');
    ['title', 'q'].forEach(k => !str(p[k]) && bad.push(`no ${k}`));
    if (p.ctx !== undefined && !(Array.isArray(p.ctx) && p.ctx.every(str))) bad.push('ctx must be a list of texts');
    if (p.photos !== undefined) {
      if (!Array.isArray(p.photos) || !p.photos.length) bad.push('photos must be a non-empty list');
      else
        p.photos.forEach((x, i) => {
          if (!x || (!str(x.f) && !str(x.src) && !str(x.none))) bad.push(`photo ${i}: needs f, src or none`);
          else if (str(x.src) && !/^https:\/\//.test(x.src)) bad.push(`photo ${i}: src must be https`);
          else if ((str(x.f) || str(x.src)) && !str(x.a)) bad.push(`photo ${i}: no credit (a)`);
        });
      if (!str(p.ask)) bad.push('photos need ask (the answer field)');
    }
    if (!Array.isArray(p.src) || !p.src.length || !p.src.every(s => s && str(s.t))) bad.push('src must list sources with t');
    return bad;
  };
  // The key of a photo slot's answer in curation.json points.<id>.a: its photo id, else its place.
  const photoKey = (x, i) => (x && x.f) || 'p' + i;
  const API = {PT_STATUS, ptStatus, pointsOrder, pointAge, pointsProblems, photoKey};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// Pure functions shared by the app (app.js), the admin (admin.js) and the tests (node --test tests/*.test.js).
// No DOM, no globals of the app: in the browser they become globals (classic script), in Node module.exports.
(function(root){
// The draft is never published as a whole copy: it is merged, key by key, onto the latest published curation.
// merge3(base, mine, theirs): base = the published curation this draft started from; a key I changed since base
// keeps my value, every other key takes the published one (so choices published from another browser or device
// are never lost). Objects merge key by key; lists and plain values are single choices. Same choice on both sides = conflict, mine wins.
const isObj = o => o && typeof o === 'object' && !Array.isArray(o), eq = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
// conf (optional): collects the paths where both sides changed the same choice differently, so Publish can say which
// published choices this draft replaced (the rule stays the same: mine wins).
function merge3(base, mine, theirs, conf, path = []){
  const b = isObj(base) ? base : {}, m = isObj(mine) ? mine : {}, t = isObj(theirs) ? theirs : {}, out = {};
  new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]).forEach(k => {
    const both = isObj(m[k]) && isObj(t[k]);
    if (conf && !both && !eq(m[k], b[k]) && !eq(t[k], b[k]) && !eq(m[k], t[k])) conf.push([...path, k]);
    const v = eq(m[k], b[k]) ? t[k] : eq(t[k], b[k]) ? m[k] : both ? merge3(b[k], m[k], t[k], conf, [...path, k]) : m[k];
    // A copy, never a shared object: setQ & co. edit DRAFT's maps in place, and a map shared with SAVED would change
    // both, hiding the edit from Publish (code review 2026-11-01).
    if (v !== undefined && !(isObj(v) && !Object.keys(v).length && k !== 'genera')) out[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; });
  return out;
}
// An old draft saved before drafts kept their base: add what it has on top of the published curation, never remove.
function mergeOld(mine, theirs){
  const m = isObj(mine) ? mine : {}, t = isObj(theirs) ? theirs : {}, out = {...t};
  Object.keys(m).forEach(k => { out[k] = isObj(m[k]) && isObj(t[k]) ? mergeOld(m[k], t[k]) : m[k] === undefined ? t[k] : m[k]; });
  return out;
}

// Two devices on one account (app.js mergeSaved): three-way merge of the per-genus progress. B = the record as last
// sent or received, P = this device, R = the record just pulled. Counts add up (R + P - B), so neither side's answers
// are lost or counted twice; the latest local state wins for the per-genus model when this device answered since B.
function mergeProgress(B, P, R){
  const Z = {ok: 0, ko: 0, streak: 0}, out0 = {}; B = B || {}; P = P || {}; R = R || {};
  new Set([...Object.keys(R), ...Object.keys(P)]).forEach(g => {
    const b = B[g] || Z, l = P[g] || Z, r = R[g] || Z, out = {...r};
    out.ok = Math.max(0, (r.ok || 0) + (l.ok || 0) - (b.ok || 0));
    out.ko = Math.max(0, (r.ko || 0) + (l.ko || 0) - (b.ko || 0));
    const mine = (l.ok || 0) + (l.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (l.h || '') !== (b.h || '');
    out.streak = mine ? l.streak || 0 : r.streak || 0;
    if (mine && l.h) out.h = l.h;
    if (mine) ['lv', 'run', 'L', 'th', 'ro'].forEach(k => { if (l[k] !== undefined) out[k] = l[k]; else delete out[k]; });
    if (l.cor || r.cor) out.cor = 1; if (l.du || r.du) out.du = 1;
    const conf = {...(r.conf || {})};
    Object.keys(l.conf || {}).forEach(k => { const v = (conf[k] || 0) + l.conf[k] - ((b.conf || {})[k] || 0); if (v > 0) conf[k] = v; else delete conf[k]; });
    if (Object.keys(conf).length) out.conf = conf; else delete out.conf;
    // Photos seen [shown, right]: added up like the mix-ups, so two devices never lose or double-count a photo.
    const ps = {...(r.ps || {})};
    Object.keys(l.ps || {}).forEach(f => { const x = ps[f] || [0, 0], y = l.ps[f], z = (b.ps || {})[f] || [0, 0]; ps[f] = [0, 1].map(i => Math.max(0, x[i] + y[i] - z[i])); });
    if (Object.keys(ps).length) out.ps = ps; else delete out.ps;
    if (out.ok + out.ko || out.h) out0[g] = out;
  });
  return out0;
}

// Photo Elo replayed over the answer log (rows [id, time ms, genus shown, answered, right 0|1, mode, photos…]), as
// tools/sync/Code.gs stats_ does in the sheet: keep the two in step (tests/core.test.js compares them).
function eloOf(rows){
  const P = {}, R = {}, sig = x => 1 / (1 + Math.exp(-x));
  rows.slice().sort((a, b) => a[1] - b[1]).forEach(r => {
    const fs = r[6].split(/\s+/).filter(Boolean); if (!r[0] || !fs.length) return;
    const ok = r[4] ? 1 : 0, g = r[5].indexOf('quiz-duel') === 0 ? 0.5 : 0.25, ra = R[r[0]] = R[r[0]] || [0, 0];
    const ph = fs.map(f => P[f] = P[f] || [0, 0, 0]), b = ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
    const d = ok - (g + (1 - g) * sig(ra[0] - b));
    ra[0] += 0.6 / (1 + ra[1] / 40) * d; ra[1]++;
    ph.forEach(p => { p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d; p[2]++; p[1] += ok; });
  });
  const out = {}; Object.keys(P).forEach(f => out[f] = [Math.round(P[f][0] * 100) / 100, P[f][2], P[f][1]]);
  return out;
}

const CORE = {isObj, eq, merge3, mergeOld, mergeProgress, eloOf};
if (typeof module !== 'undefined' && module.exports) module.exports = CORE; else Object.assign(root, CORE);
})(this);

// The presence rule, as the admin applies it to photos (Pierre, 2026-11-04; AGENTS.md rule 6g). Pure functions, no DOM:
// loaded by admin.html only (players never download it), tested in Node (tests/presence.test.js). The rule itself is
// computed once in Python (tools/presence.py) into presence.json by tools/coral_presence.py; this file only reads it.
(function (root) {
  // A photo out of the rule: taken abroad (loc world) of a species the rule does not confirm in the Philippines.
  // sp = presence.json sp ({species name: {ok, by, rg, chk}}). Flagged in the admin, never removed automatically:
  // Pierre decides. A species presence.json does not know, or a photo named only to the genus, is not flagged.
  const outOfRule = (p, sp) => {
    if (!p || p.loc !== 'world' || p.imr || p.cf || !sp) return false;
    const w = String(p.t || '').split(/\s+/);
    const r = w.length >= 2 && /^[a-z]/.test(w[1]) ? sp[w[0] + ' ' + w[1]] : null;
    return !!r && !r.ok;
  };
  // The photos still needing Pierre's decision (To do): those a genus sheet shows now (photosOf(n): the curated list,
  // removed and "not this genus" photos gone, approved candidates in), not hidden, not off the games' slots (several
  // corals in the extra list, Coral Finder book), that are out of the rule. Codex review #496. A photo Pierre kept as an
  // exception (kept(f): his Keep in To do, Pierre 2026-11-05) leaves the queue for good.
  const ruleQueue = (genera, photosOf, isHidden, offSlot, sp, kept = () => false) =>
    genera.flatMap(n =>
      photosOf(n)
        .filter(p => !isHidden(n, p) && !offSlot(p) && !kept(p.f) && outOfRule(p, sp))
        .map(p => ({...p, genus: n, fv: p.base}))
    );
  const API = {outOfRule, ruleQueue};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

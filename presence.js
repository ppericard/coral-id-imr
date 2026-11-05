// The presence rule, as the admin applies it to photos (Pierre, 2026-11-04; AGENTS.md rule 6g), and the photo licences.
// Pure functions, no DOM: loaded by admin.html only (players never download it), tested in Node (tests/presence.test.js). The rule itself is
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
  // Licences (Pierre, 2026-11-05: no share-alike for corals any more, aligned with the fish rules; the candidate search
  // no longer takes them, tools/fetch_local.py LIC). A photo's licence: its lic, else read from its attribution text
  // ("(CC BY-NC-SA)", "no rights reserved" = CC0), as tools/fetch_local.py licence() does; null when neither says (IMR
  // lecture, Coral Finder book).
  const licence = p => {
    if (!p) return null;
    if (p.lic) return String(p.lic).toLowerCase();
    const m = /\((CC0|CC[ -][A-Z -]+?)\)/.exec(p.a || '');
    if (!m) return /no rights reserved/i.test(p.a || '') ? 'cc0' : null; // iNaturalist's CC0 credit
    return m[1] === 'CC0' ? 'cc0' : 'cc-' + m[1].slice(3).toLowerCase().trim().split(/\s+/).join('-');
  };
  const shareAlike = p => /-sa$/.test(licence(p) || '');
  // The share-alike photos on the site still needing Pierre's decision (To do › Share-alike): every photo a genus page
  // lists now (several-corals and book photos included: the site may show them), not removed, not kept (kept(f): his
  // Keep). Never removed automatically.
  const saQueue = (genera, photosOf, isHidden, kept = () => false) =>
    genera.flatMap(n =>
      photosOf(n)
        .filter(p => !isHidden(n, p) && !kept(p.f) && shareAlike(p))
        .map(p => ({...p, genus: n, fv: p.base}))
    );
  const API = {outOfRule, ruleQueue, licence, shareAlike, saQueue};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

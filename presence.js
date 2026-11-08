// The presence rule, as the admin applies it to photos (Pierre, 2026-11-04; rule C8), the photo licences and
// the photo names (nameFlag).
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
  // lecture, Coral Finder book). One reading for the app and the admin: core.js licOf.
  const {licOf} = typeof module !== 'undefined' && module.exports ? require('./core.js') : root;
  const licence = licOf;
  const shareAlike = p => /-sa$/.test(licence(p) || '');
  // The share-alike photos on the site still needing Pierre's decision (To do › Share-alike): every photo a genus page
  // lists now (several-corals photos included: the site may show them), not removed, not kept (kept(f): his
  // Keep). Never removed automatically.
  const saQueue = (genera, photosOf, isHidden, kept = () => false) =>
    genera.flatMap(n =>
      photosOf(n)
        .filter(p => !isHidden(n, p) && !kept(p.f) && shareAlike(p))
        .map(p => ({...p, genus: n, fv: p.base}))
    );
  // Names (ROADMAP "Taxonomy reference", Pierre 2026-11-05, Q49): a photo or candidate whose name (t, iNaturalist's at
  // fetch time) is a former combination or moved genus, or iNaturalist's spelling of a name WoRMS writes otherwise.
  // nm = names.json's section for the subject ({sp: {name: {now, iname?, inat?}}, gen: {former genus: genus now}}),
  // written by tools/taxonomy.py from its reference file, which the admin never loads. A flag only: nothing is renamed
  // (rule C1). null: nothing to say (a name the file does not know, a genus-only name of a current genus, an
  // IMR lecture or Coral Finder photo). kind: 'spelling' (t is iNaturalist's spelling of `now`), 'former' (t is a former
  // name of `now`; iname: iNaturalist's spelling of `now` when it differs, inat: false when iNaturalist has no taxon
  // for it), 'genus' (t's genus is a former genus, `now` the genus accepted now).
  const nameFlag = (p, nm) => {
    if (!p || p.imr || p.cf || !nm) return null;
    const w = String(p.t || '').split(/\s+/);
    const n = w.length >= 2 && /^[a-z]/.test(w[1]) ? w[0] + ' ' + w[1] : null;
    const r = n && nm.sp ? nm.sp[n] : null;
    if (r && r.now)
      return r.iname === n
        ? {kind: 'spelling', now: r.now}
        : {kind: 'former', now: r.now, ...(r.iname ? {iname: r.iname} : {}), ...(r.inat === false ? {inat: false} : {})};
    const g = w[0] && nm.gen ? nm.gen[w[0]] : null;
    return g ? {kind: 'genus', now: g} : null;
  };
  const API = {outOfRule, ruleQueue, licence, shareAlike, saQueue, nameFlag};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

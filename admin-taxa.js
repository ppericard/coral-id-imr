// Photos › Photo stats › Taxa (#photos/stats/taxa; docs/spec/admin-photos.md "Photo stats › Taxa"): for the subject on
// screen, every taxon that is out of play or not ready to be asked, and why, read from what the admin already holds:
// the fish and the sea slugs' species from their tree file (fish.json, seaslug.json: `out`, the reason the build wrote,
// and the family's circle in force, the draft's), the photos in play the family pages count (autosort.js fishCov), the
// corals' genera from data.json (core.js gameOf: the Key-only genera) and their photos in play (Coverage's covOf). No new
// sheet call, no file of its own. A reason is always a field somebody recorded; a taxon no field explains says "Reason
// not recorded", never a guess. Read-only: nothing here writes the draft or curation.json (rule A1).
//
// The reasons, in the order the page lists them:
//   out of the game (the game never asks it)
//     circle    the family is in no circle: fish.json `out` "family in no circle", or the draft's Structure › None
//     ph        fish.json `out` "not confirmed in the Philippines" (tools/build_fish.py, the presence rule C8)
//     dauin     fish.json `out` "not confirmed near Dauin" (circle 3 and species off the IMR list need `near`)
//     keyonly   a coral genus data.json holds for the Coral ID Key only: no game asks it (core.js gameOf)
//     recorded  any other `out` text: shown as written
//     unknown   nothing records why
//   in the game, but not ready
//     nophoto   no photo in play: nothing to ask it with yet (the candidates waiting counted)
//     under     fewer observations in play than its target (autosort.js fishTarget); it still plays
// A species `out` may carry several reasons, joined by "; " (tools/build_fish.py): each is listed.
//
// The pure part (taxaFish, taxaGenera, taxaCounts, TAXA_WHY) runs in Node too: tests/taxa.test.js.
(function (root) {
  const TAXA_WHY = [
    ['circle', 'Outside the circles', 1],
    ['ph', 'Not confirmed in the Philippines', 1],
    ['dauin', 'Not confirmed near Dauin', 1],
    ['keyonly', 'Key only', 1],
    ['recorded', 'Out as recorded', 1],
    ['unknown', 'Reason not recorded', 1],
    ['nophoto', 'No photo in play', 0],
    ['under', 'Under target', 0]
  ];
  const OUTS = new Set(TAXA_WHY.filter(x => x[2]).map(x => x[0])),
    KNOWN = {'family in no circle': 'circle', 'not confirmed in the philippines': 'ph', 'not confirmed near dauin': 'dauin'};
  // The reasons a taxon's `out` records: each part of "a; b", the known ones by their code, any other text as written.
  // No text (or a value that is not one): nothing says why.
  function outWhy(out) {
    const parts = (typeof out === 'string' ? out : '')
      .split(';')
      .map(x => x.trim())
      .filter(Boolean);
    return parts.length ? parts.map(t => ({code: KNOWN[t.toLowerCase()] || 'recorded', detail: t})) : [{code: 'unknown', detail: ''}];
  }
  // Each reason with its words (TAXA_WHY); a recorded text that says what the words already say is not repeated.
  const words = why =>
    why.map(w => {
      const text = TAXA_WHY.find(x => x[0] === w.code)[1];
      return {...w, text, detail: w.detail.toLowerCase() === text.toLowerCase() ? '' : w.detail};
    });
  const nameOf = (a, b) => String(a || '').localeCompare(String(b || ''));
  // Sorted by their first reason (the order above), then family, then name.
  const order = rows => {
    const at = r => TAXA_WHY.findIndex(x => x[0] === r.why[0].code);
    return rows.sort((a, b) => at(a) - at(b) || nameOf(a.unit, b.unit) || nameOf(a.name, b.name));
  };
  // The species of a tree subject (the fish, the sea slugs) that are out of play or not ready.
  //   species   the tree file's species [{id, name, common, out, circle}]
  //   unitOf    {species id: its family {id, name, circle}} (the family pages' units)
  //   circleOf  a family's circle in force (the draft's, admin.js fuCircle): null for in no circle
  //   rows      {species id: {n photos, obs observations, tgt target, wait candidates}} for the species in the game
  //             (autosort.js fishCov's species rows)
  //   link      (species, family) the address of its page, '' when it has none
  // Each row {id, name, common, unit, href, why: [{code, text, detail}], out (the game does not ask it), n, obs, tgt}.
  function taxaFish({species, unitOf = {}, circleOf = x => x.circle, rows = {}, link = () => ''}) {
    return order(
      (species || []).flatMap(s => {
        const u = unitOf[s.id] || null,
          r = rows[s.id] || null;
        let why;
        if (s.out) why = outWhy(s.out);
        else if (u && circleOf(u) == null) why = [{code: 'circle', detail: 'its family is in no circle in the draft'}];
        else if (!r) why = [{code: 'unknown', detail: ''}];
        else if (!r.n) why = [{code: 'nophoto', detail: r.wait ? `${r.wait} candidate${r.wait === 1 ? '' : 's'} waiting` : ''}];
        else if (r.obs < r.tgt) why = [{code: 'under', detail: `${r.obs} of ${r.tgt} observations`}];
        else return [];
        return [
          {
            id: s.id,
            name: s.name || s.id,
            common: s.common || s.en || '',
            unit: u ? u.name || u.id : '',
            href: link(s, u) || '',
            why: words(why),
            out: why.some(w => OUTS.has(w.code)),
            n: r ? r.n : 0,
            obs: r ? r.obs : 0,
            tgt: r ? r.tgt : 0
          }
        ];
      })
    );
  }
  // The coral genera the games do not ask (Key only: data.json holds them for the Coral ID Key; core.js gameOf) or
  // cannot ask yet (no photo in play). genera: [{name, fam, game (a genus the games can ask), n (its photos in play)}].
  function taxaGenera({genera, link = () => ''}) {
    return order(
      (genera || []).flatMap(g => {
        const why = !g.game ? [{code: 'keyonly', detail: 'no game asks it'}] : !g.n ? [{code: 'nophoto', detail: ''}] : null;
        return why
          ? [
              {
                id: g.name,
                name: g.name,
                common: '',
                unit: g.fam || '',
                href: link(g.name) || '',
                why: words(why),
                out: why.some(w => OUTS.has(w.code)),
                n: g.n || 0,
                obs: 0,
                tgt: 0
              }
            ]
          : [];
      })
    );
  }
  // How many taxa each reason lists, in the page's order, the reasons with none left out: [[code, words, taxa]].
  function taxaCounts(rows) {
    return TAXA_WHY.map(([code, text]) => [code, text, (rows || []).filter(r => r.why.some(w => w.code === code)).length]).filter(
      x => x[2]
    );
  }
  const API = {TAXA_WHY, taxaFish, taxaGenera, taxaCounts};
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else Object.assign(root, API);
})(this);

// ---- The admin view (browser only: admin.js state and helpers) ----
const TAXA_PAGE = 'photos/stats/taxa';
const TAXA_SEL = {}; // the reason on screen per subject (this tab only): '' = every reason
// The rows for the subject on screen, or null while the family pages' data are on their way (the page says Loading… and
// draws again once in, if still on screen on that side).
function taxaRows(S, here) {
  if (!S.sheets)
    return taxaGenera({
      genera: Object.keys(DATA.gen).map(n => ({
        name: n,
        fam: DATA.gen[n].fam,
        game: isGame(n),
        n: covViews(n).reduce((t, [v]) => t + covOf(n, v).n, 0)
      })),
      link: genusHref
    });
  if (!FISHC || !FISHC.plays || FISHS !== S) {
    fishLoad(true).then(() => here() && render());
    return null;
  }
  const D = fuDataM().D,
    C = fishCov(FISHC.units, D.play, FISHC.species, FISHC.cand, D.F, fuJ),
    unitOf = {};
  FISHC.units.forEach(u => u.species.forEach(s => (unitOf[s] = unitOf[s] || u)));
  return taxaFish({
    species: FISHC.raw.species || [],
    unitOf,
    circleOf: fuCircle,
    rows: Object.fromEntries(C.sp.map(r => [r.id, r])),
    // a page exists for a species of a family that is not out (the Tree lists those, fuFam)
    link: (s, u) => (u && !s.out ? fuHref(s.id) : '')
  });
}
function renderTaxa() {
  status();
  const S = ASUBJ,
    here = () => cur === TAXA_PAGE && ASUBJ === S,
    all = taxaRows(S, here);
  if (!all) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    return;
  }
  const C = taxaCounts(all),
    sel = C.some(x => x[0] === TAXA_SEL[S.id]) ? TAXA_SEL[S.id] : '',
    rows = sel ? all.filter(r => r.why.some(w => w.code === sel)) : all,
    chip = (k, t, n) =>
      `<button type="button" class="adm-fchip plain" data-taxa="${esc(k)}" aria-pressed="${sel === k}">${esc(t)} <b>${n}</b></button>`,
    name = r =>
      `${r.href ? `<a class="adm-gen" href="${esc(r.href)}">` : '<span class="adm-gen">'}<i>${esc(r.name)}</i>${r.href ? '</a>' : '</span>'}${
        r.common ? ` <small>${esc(r.common)}</small>` : ''
      }`,
    why = r => r.why.map(w => `<div>${esc(w.text)}${w.detail ? `<br><small>${esc(w.detail)}</small>` : ''}</div>`).join('');
  $v.innerHTML = `<section class="adm-taxa" data-taxa-n="${all.length}"><div class="adm-filter">${chip('', 'All', all.length)}${C.map(([k, t, n]) => chip(k, t, n)).join('')}</div>${
    rows.length
      ? `<div class="adm-tscroll tall"><table class="adm-tbl"><thead><tr><th>${S.sheets ? 'Species' : 'Genus'}</th><th>Family</th><th>Reason</th></tr></thead><tbody>${rows
          .map(
            r =>
              `<tr data-taxon="${esc(r.id)}"><td class="an-w">${name(r)}</td><td class="an-w">${esc(r.unit)}</td><td class="an-w">${why(r)}</td></tr>`
          )
          .join('')}</tbody></table></div>`
      : '<p class="note">None.</p>'
  }</section>`;
  $v.querySelectorAll('[data-taxa]').forEach(
    b =>
      (b.onclick = () => {
        TAXA_SEL[S.id] = b.dataset.taxa;
        render();
      })
  );
}
// "?": what the page lists and where each reason comes from (rule A2: no text on the page itself).
if (typeof HELP !== 'undefined')
  HELP.taxa = `<p>Every taxon that is out of play, or in the game but not ready to be asked, and why. A reason is always one somebody recorded; a taxon nothing explains says <b>Reason not recorded</b>.</p><p><b>Outside the circles</b>: its family is in no circle (the tree file's <code>out</code>, or your draft's Structure › None). <b>Not confirmed in the Philippines</b> and <b>Not confirmed near Dauin</b>: the presence rule (rule C8) found no confirmation when the file was built, which is not proof that it is absent. <b>Key only</b> (corals): the Coral ID Key holds the genus, no game asks it. <b>Out as recorded</b>: any other reason the file gives, as written. These are out of the game.</p><p><b>No photo in play</b>: nothing to ask it with yet, with the candidates waiting. <b>Under target</b>: fewer observations in play than its target; it still plays. A taxon that is in play and at its target is not listed. The name opens its page when it has one.</p>`;

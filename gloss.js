// The glossary words, moved out of app.js (REE-64, one piece at a time; behaviour unchanged). A classic script of tier
// 1, loaded right after app.js (index.html), so its names are globals like app.js's own and app.js's (esc, hr, DATA) are
// already declared. At load it only makes the definition's popup and listens to taps, keys and scrolls; gloss, glossAll,
// termDef, basicsHref and showGloss run when a page is drawn or a term tapped, after tier 1 is in.
// Glossary terms in tips, lecture notes, genus cards, quiz feedback and the Coral ID Key: tap (or focus + Enter) to see
// the definition and its source. Matching patterns per glossary term (Corallite and Polyp too, for players who never had
// the IMR lecture; "septal teeth" opens Septa):
const GLOSS_PAT = {
  'Septo-costae': 'septo-costae',
  'Septa': 'septa(?:l(?: teeth)?)?',
  'Costae': 'costae',
  'Coenosteum': 'coenosteum',
  'Paliform lobes': 'paliform lobes?',
  'Axial corallite': 'axial corallites?',
  'Verrucae': 'verrucae',
  'Hooded corallites': 'hooded(?: corallites?)?',
  'Extra-tentacular budding': 'extra-tentacular(?: budding)?',
  'Intra-tentacular budding': 'intra-tentacular(?: budding)?',
  'Monticules': 'monticules?',
  'Vesicles': 'vesicles?',
  'Corallite': 'corallites?',
  'Polyp': 'polyps?',
  // The most frequent words of the genus sheets (tools/apply_plain_terms.py MORE).
  'Free-living': 'free-living',
  'Solitary': 'solitary',
  'Separate walls': 'separate(?:[- ]walls?|-walled)|plocoid',
  'Shared walls': 'shared walls?|cerioid',
  'Phaceloid': 'phaceloid',
  'Radial corallites': 'radial corallites?',
  'Tentacular lobes': 'tentacular lobes?',
  'Axial furrow': 'axial furrow',
  'Spinules': 'spinules?',
  // The wall around each cup ("wall" links to Coral basics); "separate walls"
  // and "shared walls" keep their own entries (longer patterns win at the same place).
  'Wall': 'walls?'
};
let glossRe = null;
// Each term is underlined once per text block, at its first occurrence: a tip saying "corallites" three times gets one
// underline, not three. seen (a Set) carries that over several calls that make one block (the items of one tips list).
// btn: the text sits inside a button (a Coral ID Key box): the term is tappable but not a focus stop of its own.
function gloss(text, seen = new Set(), btn = false) {
  const t = esc(text);
  if (!DATA.terms) return t;
  if (!glossRe) {
    // Longer patterns first, so "axial corallite" wins over "corallite" at the same place.
    const keys = DATA.terms
      .map(x => x[0])
      .filter(k => GLOSS_PAT[k])
      .sort((a, b) => GLOSS_PAT[b].length - GLOSS_PAT[a].length);
    glossRe = keys.length
      ? {keys, re: new RegExp('\\b(?:' + keys.map(k => '(' + GLOSS_PAT[k] + ')').join('|') + ')\\b', 'gi')}
      : {re: null};
  }
  if (!glossRe.re) return t;
  return t.replace(glossRe.re, (m, ...g) => {
    const k = glossRe.keys[g.slice(0, glossRe.keys.length).findIndex(x => x !== undefined)];
    if (!k || seen.has(k)) return m;
    seen.add(k);
    return `<span class="gt"${btn ? '' : ' tabindex="0" role="button"'} data-gt="${esc(k)}">${m}</span>`;
  });
}
// The items of one list glossed as one block (each term underlined once in the list).
const glossAll = (L, btn) => {
  const seen = new Set();
  return L.map(x => gloss(x, seen, btn));
};
const $gpop = document.createElement('div');
$gpop.className = 'gpop';
$gpop.hidden = true;
$gpop.setAttribute('role', 'tooltip');
document.body.appendChild($gpop);
// A term's text: the plain-words sentence written for beginners (data.json terms[i][3], tools/apply_plain_terms.py), then
// the sourced definition with its source.
const termDef = ([, d, src, plain]) =>
  `${plain ? `${esc(plain)} <span class="gdef">${esc(d)}</span>` : esc(d)}${src ? ` <small class="src">${esc(src)}</small>` : ''}`;
// Coral basics' words (proto/basics.js, its Words list), each with the step that shows it ('<step>' or '<step>|<view>'), a
// card of Corallite anatomy ('@<card>') or none (''), and the plain line used when data.json terms has none. Here, in
// the first tier, so a glossary popup links the same way before and after the Tools tier is in.
const BASICS_WORDS = [
  ['Colony', 'colony', 'Many polyps living together on one skeleton.'],
  ['Polyp', 'polyp', 'One tiny coral animal: a soft tube, a mouth, a ring of tentacles.'],
  ['Mouth', 'polyp', 'In the middle of the polyp. IMR asks: is it raised or embedded?'],
  ['Corallite', 'corallite', 'The stony cup of one polyp.'],
  ['Septa', 'septa', 'Thin blades inside the cup, from the rim to the centre.'],
  ['Costae', 'septa', 'The same blades, carrying on outside the cup’s wall.'],
  ['Septal teeth', 'teeth', 'Teeth on the top edge of the septa: fine or large.'],
  ['Wall', 'walls', 'The rim around each cup: separate, shared, forming valleys, or not visible at all.'],
  ['Separate walls', 'walls|separate', 'Each cup has its own wall, with a gap between cups.'],
  ['Shared walls', 'walls|shared', 'Neighbouring cups share one wall, like a honeycomb.'],
  ['Coenosteum', 'walls|separate', 'The skeleton in the gap between cups with separate walls.'],
  ['Valleys', 'walls|valleys', 'Cups merged into long rows with several mouths (brain corals).'],
  ['Indistinguishable walls', 'walls|nowall', 'No wall to see: the lines run from one centre to the next.'],
  ['Septo-costae', 'walls|nowall', 'Those lines, running from one centre to the next when there is no wall.'],
  ['Growth form', 'forms', 'The colony’s shape: branching, massive, plating…'],
  ['Paliform lobes', '@con|pali', 'A crown of small knobs around the centre of the cup.'],
  ['Columella', '@con|columella', 'What fills the very centre of the cup.'],
  ['Axial corallite', '@con|axial', 'The cup at the tip of a branch, bigger than the others.'],
  ['Monticules', '@arr|hydno', 'Small cone-shaped mounds of wall between the cups.'],
  ['Verrucae', '', 'Bumps on the branches, bigger than one cup.'],
  ['Hooded corallites', '', 'Cups that face downwards, like a hood.'],
  ['Vesicles', '', 'Grape-like bubbles some corals inflate by day.']
];
const basicsWord = term => BASICS_WORDS.find(x => x[0].toLowerCase() === String(term).toLowerCase());
const basicsListed = term => !!basicsWord(term);
const basicsRoute = term => {
  const w = basicsWord(term);
  return !w || !w[1] ? '' : w[1][0] === '@' ? 'lab-anatomy|' + w[1].slice(1) : 'basics|' + w[1];
};
// Where a term is shown on a photo (the technical words of the genus sheets, first-meeting cards and quiz tips link to
// Coral basics): its step, else Corallite anatomy's card, else the Words list when it is there. A page
// key (app.js hr gives its link).
const basicsHref = term => basicsRoute(term) || (basicsListed(term) ? 'basics|words' : '');
// The term whose definition is open, and where it was when the definition was placed next to it (glossMoved).
let glossAt = null;
function showGloss(el) {
  const t = DATA.terms.find(x => x[0] === el.dataset.gt);
  if (!t) return;
  const bh = basicsHref(t[0]),
    to = !bh
      ? ''
      : bh.startsWith('lab-anatomy')
        ? 'Corallite anatomy'
        : bh === 'basics|words'
          ? 'Coral basics: all the words'
          : 'Coral basics: on a photo';
  $gpop.innerHTML = `<b>${esc(t[0])}</b> ${termDef(t)}${bh ? `<a class="gbx" href="${esc(hr(bh))}">${to} ›</a>` : ''}`;
  $gpop.hidden = false;
  const r = el.getBoundingClientRect(),
    w = Math.min(320, innerWidth - 24);
  glossAt = {el, x: r.left, y: r.top};
  $gpop.style.width = w + 'px';
  $gpop.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + 'px';
  const below = r.bottom + 8,
    h = $gpop.offsetHeight;
  // Below the term, else above it, and always inside the screen (a term high on a tall card, whose definition does not
  // fit above it, would go off the top).
  $gpop.style.top = Math.max(8, Math.min(below + h > innerHeight - 8 ? r.top - h - 8 : below, innerHeight - h - 8)) + 'px';
}
document.addEventListener(
  'click',
  e => {
    const g = e.target.closest && e.target.closest('.gt');
    if (g) {
      e.preventDefault();
      e.stopPropagation();
      showGloss(g);
    } else if (!e.target.closest('.gpop')) $gpop.hidden = true;
  },
  true
);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $gpop.hidden = true;
  else if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('gt')) showGloss(e.target);
});
// A scroll closes the definition, which stays put (fixed), once its term has moved away. Only then: a scroll event comes
// at the next frame, so a card scrolled to bring the term into view, then tapped, would close the definition it had just
// opened.
const glossMoved = () => {
  if (!glossAt || !glossAt.el.isConnected) return true;
  const r = glossAt.el.getBoundingClientRect();
  return r.left !== glossAt.x || r.top !== glossAt.y;
};
addEventListener(
  'scroll',
  () => {
    if (!$gpop.hidden && glossMoved()) $gpop.hidden = true;
  },
  true
);

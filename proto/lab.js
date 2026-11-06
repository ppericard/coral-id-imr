// Lab: a playground of visual, interactive prototypes. Each prototype lives in its own proto/<id>.js
// and registers itself with LAB.add(). Routes: #tools (hub), #tools/<id>, #tools/<id>/<arg>.
// A prototype that graduates moves to a site section (see GRADUATED) and gets its address there (core.js routeOut: its page
// key is its id, e.g. basics → #learn/basics).
// Stamped at deploy (tools/stamp_versions.py: one hash of the Lab files), never edited: browsers never mix new and old files.
const LAB_V = 84;
// One SVG icon set for the Tools hub (design review 2026-11-01: the old Unicode glyphs had mixed weights and sizes).
// 24 px grid, 1.75 stroke, currentColor; a tool without an entry falls back to its `icon` text.
const LAB_ICONS = {
  map: '<circle cx="12" cy="12" r="2.5"/><circle cx="4.5" cy="6" r="1.8"/><circle cx="19.5" cy="6" r="1.8"/><circle cx="4.5" cy="18" r="1.8"/><circle cx="19.5" cy="18" r="1.8"/><circle cx="12" cy="3" r="1.5"/><path d="M10 10.8 6 7.1M14 10.8l4-3.7M10 13.2l-4 3.7M14 13.2l4 3.7M12 9.5V4.5"/>',
  anatomy:
    '<path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z"/><circle cx="12" cy="12" r="3.2"/><path d="M12 5.5v3.3M12 15.2v3.3M6.4 8.8l2.8 1.6M14.8 13.6l2.8 1.6M6.4 15.2l2.8-1.6M14.8 10.4l2.8-1.6"/>',
  // A polyp on its cup: ring of tentacles over a stony cup.
  basics: BASICS_ICON, // app.js (the Learn path's step 0 card draws it too)
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5M11 8v6M8 11h6"/>',
  elim: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18M10.5 10.5l3 3M13.5 10.5l-3 3"/>',
  matrix:
    '<g fill="currentColor" stroke="none"><circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/></g><circle cx="19" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  web: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="m8.5 6.4 7 1.2M16.4 10l-4.8 6M6.8 8.4l2.4 7.2"/>',
  size: '<rect x="2" y="8" width="20" height="8" rx="1.5"/><path d="M6 8v3M10 8v4.5M14 8v3M18 8v4.5"/>',
  reveal: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  spot: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
  gallery:
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  idkey: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>',
  type: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  pairs: '<rect x="3" y="6" width="10" height="14" rx="2"/><path d="M9 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6"/>',
  // A card over a dimmed screen (the cards and pop-ups mock-up).
  cards:
    '<rect x="2.5" y="3.5" width="19" height="17" rx="2"/><rect x="6.5" y="7" width="11" height="10" rx="1.5"/><path d="M9 10.5h6M9 13.5h4"/>'
};
const labIcon = p =>
  LAB_ICONS[p.id]
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${LAB_ICONS[p.id]}</svg>`
    : p.icon || '';
const LAB = {
  list: [],
  files: [
    'idkey',
    'basics',
    'map',
    'anatomy',
    'zoom',
    'elim',
    'matrix',
    'web',
    'size',
    'reveal',
    'spot',
    'type',
    'pairs',
    'gallery',
    'cards'
  ],
  stop: null,
  pending: 0,
  add(p) {
    this.list.push(p);
  }
};
// Graduated prototypes and the section of MODES (app.js) they now live in.
const GRADUATED = {idkey: 'identify', pairs: 'practice', basics: 'learn'};
const SECTION_NAME = {learn: 'Learn', identify: 'Identify', practice: 'Practice'};
const isLabHash = h => h.startsWith('lab') || h.split('|')[0] in GRADUATED;
// Load every prototype; once all are in, redraw if the reader opened a Lab page directly. One that fails (unstable
// line) is tried again up to 3 times, 1, 2 then 3 s later (Pierre, 2026-11-01).
const labLoad = (f, n = 0) => {
  const s = document.createElement('script');
  s.src = `proto/${f}.js?v=${LAB_V}`;
  s.async = false;
  const done = () => {
    const h = hashNow();
    if (--LAB.pending === 0 && DATA && (isLabHash(h) || !h || h === 'home')) route();
  };
  s.onload = done;
  s.onerror = () => {
    s.remove();
    if (n < 3) setTimeout(() => labLoad(f, n + 1), 1000 * (n + 1));
    else done();
  };
  document.head.appendChild(s);
};
LAB.files.forEach(f => {
  LAB.pending++;
  labLoad(f);
});

/* ---------- helpers shared by the prototypes ---------- */
// Slate order (data.json key order).
const labNames = () => Object.keys(DATA.gen);
// The genera a Lab game asks about (rule L4, one progression path: Pierre, 2026-11-04, "any future game or
// mode, no exceptions"): those the player has unlocked on the quiz path (model.js unlocked), in the corals whatever the
// subject on screen (the Tools are the corals'). Wrong choices may name any genus, as the quiz's do (model.js
// distractors); the reference tools (map, matrix, gallery, key, board, sizes, explorer) keep every genus.
const labPlay = () => {
  if (typeof unlocked !== 'function') return labNames();
  const f = () => unlocked(labNames());
  return typeof inSubject === 'function' && typeof SUBJECTS !== 'undefined' ? inSubject(SUBJECTS[0].id, f) : f();
};
// Nothing unlocked yet (a new player): the game says where genera open instead of asking about one never met.
const labNone = el => {
  if (labPlay().length) return false;
  el.innerHTML = `<p class="note">This game asks about the genera you have met. Meet a few in the quiz first.</p><p><a class="next" href="${esc(hr('quiz'))}">Play the quiz</a></p>`;
  return true;
};
const genLink = n => hr('g-' + n);
const labFams = () => [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
// Mid-tone hues read on both light and dark backgrounds.
const famColor = f => `hsl(${Math.round((labFams().indexOf(f) * 360) / labFams().length + 190) % 360} 58% 50%)`;
const igColor = n => (n ? `hsl(${groupHue(n)} 55% 52%)` : 'hsl(0 0% 55%)'); // same colours as the rest of the app
const viewPhoto = (n, v) => {
  const g = DATA.gen[n];
  return (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g);
};
const thumbSrc = (n, v = 'macro', size = 's') => img(viewPhoto(n, v), size);
const trOpt = id => DATA.traits.flatMap(t => t.opts).find(o => o.id === id);
const trName = id => (trOpt(id) || {t: id}).t;
const trSet = c => DATA.traits.find(t => t.id === c).opts.map(o => o.id);
// A genus's corallite traits (data.json): `tr` the traits of the genus, `trs` traits found in some of its species only
// (Pierre, 2026-11-04: a clear crown of paliform lobes in a few Favites, say). Every tool reads them through these
// helpers and the same rule, never by genus name: 1 = the genus has it, 0.5 = some species, 0 = no. A some-species
// trait counts half a match in the Coral ID Key, never eliminates in the Elimination board, and is labelled so.
const trHas = (g, id) => (g.tr.includes(id) ? 1 : (g.trs || []).includes(id) ? 0.5 : 0);
const trAll = g => [...g.tr, ...(g.trs || []).filter(id => !g.tr.includes(id))];
const SOME_SP = 'some species';
const trLabel = (g, id) => trName(id) + (trHas(g, id) === 0.5 ? ` (${SOME_SP})` : '');
// The strict filter of one trait family: with nothing picked any genus fits; else it must be able to show one pick.
const trFits = (g, picked) => !picked.length || picked.some(id => trHas(g, id) > 0);
const tag = n => (DATA.gen[n].n ? 'No. ' + DATA.gen[n].n : '★ not surveyed');
// The corallite features that decide, as a short line (never the growth form).
const whyLine = n =>
  'Corallites: ' +
  trAll(DATA.gen[n])
    .map(id => trLabel(DATA.gen[n], id))
    .map(esc)
    .join(' · ');
const lookAlikes = n => DATA.gen[n].look.filter(b => DATA.gen[b]);
// Choices for a question: the target, its look-alikes first, then random genera.
function labChoices(t, k = 4) {
  const out = [t, ...shuffle(lookAlikes(t))].slice(0, k);
  shuffle(labNames()).forEach(n => {
    if (out.length < k && !out.includes(n)) out.push(n);
  });
  return shuffle(out);
}
const labHead = (title, lede) =>
  `<div class="crumbs"><a href="${esc(hr('lab'))}">Tools</a> › ${esc(title)}</div><h2>${esc(title)}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}`;
// Keep / trim votes, so Pierre can tell which prototypes to keep.
const labVotes = () => store.get('reefid-lab-votes', {}) || {};

function viewLab(h) {
  // Lab pages use the full window width (see lab.css).
  document.documentElement.dataset.page = 'lab';
  if (LAB.stop) {
    try {
      LAB.stop();
    } catch (e) {}
    LAB.stop = null;
  }
  if (LAB.pending) {
    $v.innerHTML = '<p class="note">Loading the Lab…</p>';
    return;
  }
  const [id, ...args] = h.slice(4).split('|');
  const p = LAB.list.find(x => x.id === id);
  // A Tools address of no tool here (a graduated one included: it lives in its section): the Tools page.
  if (id && (!p || GRADUATED[id])) {
    location.replace(hr('lab'));
    return;
  }
  if (p) {
    $v.innerHTML = `<div class="lab">${labHead(p.title, p.lede)}<div id="labroot"></div></div>`;
    const stop = p.render(document.getElementById('labroot'), ...args);
    if (typeof stop === 'function') LAB.stop = stop;
    return;
  }
  const votes = labVotes();
  // A prototype marked `admin` (a design mock-up for Pierre, e.g. cards) is listed in the admin's browser only; its
  // link works for anyone.
  const order = LAB.files.map(f => LAB.list.find(x => x.id === f)).filter(p => p && !GRADUATED[p.id] && (!p.admin || IS_ADMIN));
  const grad = LAB.files.map(f => LAB.list.find(x => x.id === f)).filter(p => p && GRADUATED[p.id]);
  $v.innerHTML = `<div class="lab"><h2>Tools</h2>
  <p class="lede">Optional extras, still being tested, to learn, remember and identify the genera through pictures and play. Learn, Practice and Identify are all you need; try these when you want another angle${IS_ADMIN ? ', then mark each one keep or trim: your marks stay in this browser and tell us what to develop further' : ''}.</p>
  <div class="labhub">${order
    .map(
      p => `<article class="labtile">
    <a class="labopen" href="${esc(hr('lab-' + p.id))}"><span class="labicon" aria-hidden="true">${labIcon(p)}</span><b>${esc(p.title)}</b><span>${esc(p.blurb)}</span></a>
    ${
      !IS_ADMIN
        ? ''
        : `<div class="labvote" role="group" aria-label="Keep or trim ${esc(p.title)}">
      <button type="button" data-vote="${p.id}|keep" aria-pressed="${votes[p.id] === 'keep'}">Keep</button>
      <button type="button" data-vote="${p.id}|trim" aria-pressed="${votes[p.id] === 'trim'}">Trim</button>
    </div>`
    }</article>`
    )
    .join('')}</div>
  <h3>Now in the main sections</h3>
  <div class="labgrad">${grad.map(p => `<a href="${esc(hr(p.id))}"><span class="labicon" aria-hidden="true">${labIcon(p)}</span><b>${esc(p.title)}</b><small>${SECTION_NAME[GRADUATED[p.id]]}</small></a>`).join('')}</div></div>`;
  $v.querySelectorAll('[data-vote]').forEach(
    b =>
      (b.onclick = () => {
        const [id, v] = b.dataset.vote.split('|'),
          all = labVotes();
        all[id] = all[id] === v ? undefined : v;
        store.set('reefid-lab-votes', all);
        b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.vote === id + '|' + all[id])));
      })
  );
}
// A graduated tool, shown as a page of its section: no Lab crumbs, the section's tab bar gives the context.
function labTool(h) {
  const [id, ...args] = h.split('|');
  if (!GRADUATED[id]) return false;
  document.documentElement.dataset.page = 'lab';
  if (LAB.stop) {
    try {
      LAB.stop();
    } catch (e) {}
    LAB.stop = null;
  }
  const p = LAB.list.find(x => x.id === id);
  if (!p) {
    $v.innerHTML = '<p class="note">Loading…</p>';
    return true;
  }
  $v.innerHTML = `<div class="lab"><h2>${esc(p.title)}</h2>${p.lede ? `<p class="lede">${p.lede}</p>` : ''}<div id="labroot"></div></div>`;
  const stop = p.render(document.getElementById('labroot'), ...args);
  if (typeof stop === 'function') LAB.stop = stop;
  return true;
}
// Leaving the Lab stops any running animation or timer.
addEventListener('hashchange', () => {
  const h = hashNow();
  if (isLabHash(h) || !h || h === 'home') return;
  delete document.documentElement.dataset.page;
  if (LAB.stop) {
    try {
      LAB.stop();
    } catch (e) {}
    LAB.stop = null;
  }
});

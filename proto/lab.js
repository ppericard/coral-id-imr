// Lab: a playground of visual, interactive prototypes. Each prototype lives in its own proto/<id>.js
// and registers itself with LAB.add(). Routes: #lab (hub), #lab-<id>, #lab-<id>|<arg>.
// A prototype that graduates moves to a site section (see GRADUATED) and gets a plain hash: #<id>, #<id>|<arg>.
// Bump with every Lab change so browsers never mix new and old files (same ?v scheme as app.js).
const LAB_V = 9;
const LAB = {
  list: [],
  files: ['map', 'anatomy', 'zoom', 'elim', 'matrix', 'web', 'size', 'reveal', 'spot', 'pairs', 'gallery'],
  stop: null,
  pending: 0,
  add(p){ this.list.push(p); }
};
// Graduated prototypes and the section of MODES (app.js) they now live in.
const GRADUATED = {pairs: 'practice', reveal: 'practice'};
// Where each Lab prototype is meant to go once it is ready; the home page already shows it there, marked Beta.
const PLANNED = {anatomy: 'learn', size: 'learn', gallery: 'learn', map: 'learn', web: 'learn', matrix: 'identify', elim: 'identify', zoom: 'practice', spot: 'practice'};
const SECTION_NAME = {learn: 'Learn', identify: 'Identify', practice: 'Practice'};
const isLabHash = h => h.startsWith('lab') || h.split('|')[0] in GRADUATED;
// Load every prototype; once all are in, redraw if the reader opened a Lab page directly.
LAB.files.forEach(f => {
  const s = document.createElement('script');
  s.src = `proto/${f}.js?v=${LAB_V}`; s.async = false; LAB.pending++;
  s.onload = s.onerror = () => { const h = decodeURIComponent(location.hash.slice(1)); if (--LAB.pending === 0 && DATA && (isLabHash(h) || !h || h === 'home')) route(); };
  document.head.appendChild(s);
});

/* ---------- helpers shared by the prototypes ---------- */
// Slate order (data.json key order).
const labNames = () => Object.keys(DATA.gen);
const genLink = n => `#g-${encodeURIComponent(n)}`;
const labFams = () => [...new Set(Object.values(DATA.gen).map(g => g.fam))].sort();
// Mid-tone hues read on both light and dark backgrounds.
const famColor = f => `hsl(${Math.round(labFams().indexOf(f) * 360 / labFams().length + 190) % 360} 58% 50%)`;
const igColor = n => n ? `hsl(${Math.round((n - 1) * 360 / 11 + 15) % 360} 60% 50%)` : 'hsl(0 0% 55%)';
const viewPhoto = (n, v) => { const g = DATA.gen[n]; return (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g); };
const thumbSrc = (n, v = 'macro', size = 's') => img(viewPhoto(n, v), size);
const trOpt = id => DATA.traits.flatMap(t => t.opts).find(o => o.id === id);
const trName = id => (trOpt(id) || {t: id}).t;
const trSet = c => DATA.traits.find(t => t.id === c).opts.map(o => o.id);
const tag = n => DATA.gen[n].n ? 'No. ' + DATA.gen[n].n : '★ not surveyed';
// The corallite features that decide, as a short line (never the growth form).
const whyLine = n => 'Corallites: ' + DATA.gen[n].tr.map(trName).map(esc).join(' · ');
const lookAlikes = n => DATA.gen[n].look.filter(b => DATA.gen[b]);
// Choices for a question: the target, its look-alikes first, then random genera.
function labChoices(t, k = 4){
  const out = [t, ...shuffle(lookAlikes(t))].slice(0, k);
  shuffle(labNames()).forEach(n => { if (out.length < k && !out.includes(n)) out.push(n); });
  return shuffle(out);
}
const labHead = (title, lede) => `<div class="crumbs"><a href="#lab">Lab</a> › ${esc(title)}</div><h2>${esc(title)}</h2>${lede ? `<p class="lede">${lede}</p>` : ''}`;
// Keep / trim votes, so Pierre can tell which prototypes to keep.
const labVotes = () => store.get('imr-lab-votes', {}) || {};

function viewLab(h){
  // Lab pages use the full window width (see lab.css).
  document.documentElement.dataset.page = 'lab';
  if (LAB.stop) { try { LAB.stop(); } catch (e) {} LAB.stop = null; }
  if (LAB.pending) { $v.innerHTML = '<p class="note">Loading the Lab…</p>'; return; }
  const [id, ...args] = h.slice(4).split('|');
  const p = LAB.list.find(x => x.id === id);
  // Old Lab links to a graduated tool go to its new home.
  if (p && GRADUATED[id]) { location.replace('#' + [id, ...args].join('|')); return; }
  if (p) {
    $v.innerHTML = `<div class="lab">${labHead(p.title, p.lede)}<div id="labroot"></div></div>`;
    const stop = p.render(document.getElementById('labroot'), ...args);
    if (typeof stop === 'function') LAB.stop = stop;
    return;
  }
  const votes = labVotes();
  const order = LAB.files.map(f => LAB.list.find(x => x.id === f)).filter(p => p && !GRADUATED[p.id]);
  const grad = LAB.files.map(f => LAB.list.find(x => x.id === f)).filter(p => p && GRADUATED[p.id]);
  $v.innerHTML = `<div class="lab"><h2>Lab</h2>
  <p class="lede">Experiments to learn, remember and identify the 39 genera through pictures and play. Try them, then mark each one keep or trim: your marks stay in this browser and tell us what to develop further.</p>
  <div class="labhub">${order.map(p => `<article class="labtile">
    <a class="labopen" href="#lab-${p.id}"><span class="labicon" aria-hidden="true">${p.icon || ''}</span><b>${esc(p.title)}</b><span>${esc(p.blurb)}</span></a>
    <div class="labvote" role="group" aria-label="Keep or trim ${esc(p.title)}">
      <button type="button" data-vote="${p.id}|keep" aria-pressed="${votes[p.id] === 'keep'}">Keep</button>
      <button type="button" data-vote="${p.id}|trim" aria-pressed="${votes[p.id] === 'trim'}">Trim</button>
    </div></article>`).join('')}</div>
  <h3>Graduated from the Lab</h3><p class="note">These experiments are now part of the site.</p>
  <div class="labgrad">${grad.map(p => `<a href="#${p.id}"><span class="labicon" aria-hidden="true">${p.icon || ''}</span><b>${esc(p.title)}</b><small>${SECTION_NAME[GRADUATED[p.id]]}</small></a>`).join('')}</div></div>`;
  $v.querySelectorAll('[data-vote]').forEach(b => b.onclick = () => {
    const [id, v] = b.dataset.vote.split('|'), all = labVotes();
    all[id] = all[id] === v ? undefined : v;
    store.set('imr-lab-votes', all);
    b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.vote === id + '|' + all[id])));
  });
}
// A graduated tool, shown as a page of its section: no Lab crumbs, the section's tab bar gives the context.
function labTool(h){
  const [id, ...args] = h.split('|');
  // A tool sent back to the Lab keeps working from its old link.
  if (!GRADUATED[id]) { if (LAB.files.includes(id)) { location.replace('#lab-' + h); return true; } return false; }
  document.documentElement.dataset.page = 'lab';
  if (LAB.stop) { try { LAB.stop(); } catch (e) {} LAB.stop = null; }
  const p = LAB.list.find(x => x.id === id);
  if (!p) { $v.innerHTML = '<p class="note">Loading…</p>'; return true; }
  $v.innerHTML = `<div class="lab"><h2>${esc(p.title)}</h2>${p.lede ? `<p class="lede">${p.lede}</p>` : ''}<div id="labroot"></div></div>`;
  const stop = p.render(document.getElementById('labroot'), ...args);
  if (typeof stop === 'function') LAB.stop = stop;
  return true;
}
// Leaving the Lab stops any running animation or timer.
addEventListener('hashchange', () => {
  const h = decodeURIComponent(location.hash.slice(1));
  if (isLabHash(h) || !h || h === 'home') return;
  delete document.documentElement.dataset.page;
  if (LAB.stop) { try { LAB.stop(); } catch (e) {} LAB.stop = null; }
});

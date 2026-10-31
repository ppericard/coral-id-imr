// Home page: a visual intro to the 39 genera and a showcase of the tools, grouped by section (MODES in app.js).
(function(){
  // Preview photo for each tool: [genus, view]; two entries make a split preview.
  const PREVIEW = {
    genera: [['Acropora', 'wide']], cmp: [['Favites', 'macro'], ['Dipsastraea', 'macro']], size: [['Porites', 'macro']], gallery: [['Stylophora', 'macro']],
    'key-imr': [['Galaxea', 'macro']], key: [['Pocillopora', 'wide']], 'key-tr': [['Goniastrea', 'macro']], elim: [['Montipora', 'macro'], ['Porites', 'macro']],
    quiz: [['Platygyra', 'wide']], 'quiz-duel': [['Leptoria', 'macro'], ['Platygyra', 'macro']], 'quiz-course': [['Lobophyllia', 'macro']], 'quiz-board': [['Pavona', 'macro']],
    pairs: [['Turbinaria', 'wide'], ['Turbinaria', 'macro']], reveal: [['Fungia', 'macro']], zoom: [['Echinopora', 'wide'], ['Echinopora', 'macro']], spot: [['Astreopora', 'macro']]
  };
  const SECTIONS = [
    ['learn', 'Learn', 'Get to know the genera and the features that separate them.'],
    ['identify', 'Identify', 'Work out the genus of the coral in front of you.'],
    ['practice', 'Practice', 'Train your eye until it becomes automatic.']
  ];
  const ph = (n, v) => { const g = DATA.gen[n]; if (!g) return ''; const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g); return p ? img(p, 's') : ''; };
  const tile = ([id, title, desc]) => {
    const pv = PREVIEW[id] || [];
    return `<a class="htool${id === 'reveal' ? ' blurpv' : ''}" href="#${id}"><span class="hpv${pv.length > 1 ? ' two' : ''}">${pv.map(([n, v]) => `<img src="${ph(n, v)}" alt="" loading="lazy">`).join('')}</span><b>${esc(title)}</b><small>${esc(desc)}</small></a>`;
  };
  window.viewHome = function(){
    document.documentElement.dataset.page = 'lab';  // full width, like the Lab (lab.css)
    const names = Object.keys(DATA.gen);
    // The hero mosaic: 42 tiles (39 genera + 3 repeats) fill a 14 × 3 grid, or 6 × 7 on phones.
    const nPhotos = names.reduce((a, n) => a + Object.values(DATA.gen[n].views).reduce((b, L) => b + L.length, 0), 0);
    const seen = names.filter(n => P[n] && (P[n].ok + P[n].ko)), solid = seen.filter(n => P[n].streak >= 3);
    const lab = (window.LAB && LAB.list.filter(p => !GRADUATED[p.id])) || [];
    $v.innerHTML = `<div class="home-page">
      <section class="hhero">
        <div class="hmosaic" aria-hidden="true">${(m => [...m, ...m.slice(0, 3)])(shuffle(names)).map((n, i) => `<a href="#g-${encodeURIComponent(n)}" tabindex="-1" style="--i:${i}"><img src="${ph(n, 'macro')}" alt="" loading="lazy"><span>${esc(n)}</span></a>`).join('')}</div>
        <div class="hintro">
          <h2>Learn the 39 coral genera of the IMR slate</h2>
          <p>From the colony to the corallites: genus sheets, keys and games built on IMR Lecture 6 and the Coral Finder, with photos from Dauin.</p>
          <p class="hstats"><span><b>${names.length}</b> genera</span><span><b>${DATA.imrg.length}</b> IMR groups</span><span><b>${nPhotos}</b> photos</span></p>
          <p class="hcta"><a class="next" href="#genera">Browse the genera</a> <a class="chip" href="#quiz">Test yourself</a></p>
        </div>
      </section>
      ${seen.length ? `<p class="hprog"><a href="#quiz-board">Your progress: <b>${seen.length}</b> of ${names.length} genera practised, <b>${solid.length}</b> solid (3 right in a row).</a></p>` : ''}
      <section class="hpath"><h3>A suggested path</h3><ol>
        <li><a href="#genera"><b>Meet the genera</b><span>Colony, closer view and corallites for each one.</span></a></li>
        <li><a href="#key-imr"><b>Identify step by step</b><span>Lecture groups, colony form or corallite details.</span></a></li>
        <li><a href="#quiz"><b>Practise</b><span>Quiz, duels and games until it sticks.</span></a></li>
      </ol></section>
      ${SECTIONS.map(([id, t, d]) => `<section class="hsec"><h3><a href="${'#' + MODES[id][0][0]}">${t}</a></h3><p class="note">${d}</p><div class="htools">${MODES[id].map(tile).join('')}</div></section>`).join('')}
      <section class="hsec hlab"><h3><a href="#lab">Lab</a></h3><p class="note">Experiments being tried out. The good ones graduate into the sections above.</p>
        <div class="labgrad">${lab.map(p => `<a href="#lab-${p.id}"><span class="labicon" aria-hidden="true">${p.icon || ''}</span><b>${esc(p.title)}</b></a>`).join('')}<a href="#lab"><b>All experiments ›</b></a></div></section>
    </div>`;
  };
})();

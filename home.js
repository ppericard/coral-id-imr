// Home page: a visual intro to the 39 genera and the whole learning path. Each section shows its tools (MODES in app.js)
// and the Lab prototypes planned for it (PLANNED in proto/lab.js), marked Beta, so the full journey is visible.
(function(){
  // Preview photo for each tool: [genus, view]; two entries make a split preview.
  const PREVIEW = {
    genera: [['Acropora', 'wide']], cmp: [['Favites', 'macro'], ['Dipsastraea', 'macro']], size: [['Porites', 'macro']], gallery: [['Stylophora', 'macro']],
    'key-imr': [['Galaxea', 'macro']], key: [['Pocillopora', 'wide']], 'key-tr': [['Goniastrea', 'macro']], elim: [['Montipora', 'macro'], ['Porites', 'macro']],
    quiz: [['Platygyra', 'wide']], 'quiz-duel': [['Leptoria', 'macro'], ['Platygyra', 'macro']], 'quiz-course': [['Lobophyllia', 'macro']], 'quiz-board': [['Pavona', 'macro']],
    pairs: [['Turbinaria', 'wide'], ['Turbinaria', 'macro']], anatomy: [['Favites', 'macro']], map: [['Lobophyllia', 'macro'], ['Pavona', 'macro']], web: [['Goniopora', 'macro'], ['Alveopora', 'macro']], matrix: [['Cyphastrea', 'macro'], ['Astrea', 'macro']], reveal: [['Fungia', 'macro']], zoom: [['Echinopora', 'wide'], ['Echinopora', 'macro']], spot: [['Astreopora', 'macro']]
  };
  const SECTIONS = [
    ['learn', 'Learn', 'Get to know the genera and the features that separate them.'],
    ['practice', 'Practice', 'Train your eye until it becomes automatic.'],
    ['identify', 'Identify', 'Work out the genus of the coral in front of you.']
  ];
  // Few entry points per step on the home page; the section tabs still list everything.
  const HOME = {learn: ['genera', 'cmp'], practice: ['quiz', 'quiz-duel', 'pairs', 'reveal'], identify: ['key-imr', 'key']};
  // Reference visualisations: useful on the side, not steps of the path.
  const TOOLS = ['map', 'web', 'size', 'gallery', 'matrix', 'elim', 'anatomy'];
  const ph = (n, v) => { const g = DATA.gen[n]; if (!g) return ''; const p = (g.views[v] || [])[0] || (g.views.macro || [])[0] || cover(g); return p ? img(p, 's') : ''; };
  // Lab prototypes not yet graduated, as [hash, title, description, beta] for the section they are planned for.
  const betas = sec => (typeof LAB !== 'undefined' ? LAB.list : []).filter(p => PLANNED[p.id] === sec && !GRADUATED[p.id]).map(p => ['lab-' + p.id, p.title, p.blurb.split(/[.:]/)[0], true]);
    const tile = ([id, title, desc, beta]) => {
    const pv = PREVIEW[id.replace(/^lab-/, '')] || [];
    return `<a class="htool${beta ? ' beta' : ''}" href="#${id}"${beta ? ' title="Still in the Lab"' : ''}>${(window.homeArt && homeArt(id.replace(/^lab-/, ''))) ? `<span class="hpv art">${homeArt(id.replace(/^lab-/, ''))}</span>` : `<span class="hpv${pv.length > 1 ? ' two' : ''}">${pv.map(([n, v]) => `<img src="${ph(n, v)}" alt="" loading="lazy">`).join('')}</span>`}<b>${esc(title)}${beta ? ' <em class="betatag">Beta</em>' : ''}</b><small>${esc(desc)}</small></a>`;
  };
  window.viewHome = function(){
    document.documentElement.dataset.page = 'lab';  // full width, like the Lab (lab.css)
    const names = Object.keys(DATA.gen);
    // The hero mosaic: 42 tiles (39 genera + 3 repeats) fill a 14 × 3 grid, or 6 × 7 on phones.
    const nPhotos = names.reduce((a, n) => a + Object.values(DATA.gen[n].views).reduce((b, L) => b + L.length, 0), 0);
    const seen = names.filter(n => P[n] && (P[n].ok + P[n].ko)), solid = seen.filter(n => P[n].streak >= 3);
    const lab = (typeof LAB !== 'undefined' && LAB.list.filter(p => !GRADUATED[p.id])) || [];
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
      ${seen.length ? `<p class="hprog"><a href="#progress">Your progress: <b>${seen.length}</b> of ${names.length} genera practised, <b>${solid.length}</b> solid (3 right in a row).</a></p>` : ''}
      <nav class="hpath" aria-label="How to use the app"><ol>${[['genera', 'Learn', 'Get to know the 39 genera', 'Acropora', 'medium'], ['quiz', 'Practice', 'Name the genus from photos until it comes without thinking', 'Platygyra', 'macro'], ['key-imr', 'Identify', 'Name a coral on a real photo: growth form first, then compare the candidates', 'Pocillopora', 'wide']]
        .map(([h, t, d, n, v]) => `<li><a href="#${h}"><img src="${ph(n, v)}" alt="" loading="lazy"><span><b>${t}</b><small>${d}</small></span></a></li>`).join('')}</ol></nav>
      ${SECTIONS.map(([id, t, d]) => `<section class="hsec"><h3><a href="${'#' + MODES[id][0][0]}">${t}</a></h3><p class="note">${d}</p><div class="htools">${MODES[id].filter(m => HOME[id].includes(m[0])).map(tile).join('')}</div></section>`).join('')}
      <section class="hsec"><h3>Tools</h3><p class="note">Visual references to explore the genera and their features.</p><div class="htools small">${TOOLS.map(t => (typeof LAB !== 'undefined' && LAB.list.find(p => p.id === t))).filter(Boolean).map(p => tile(['lab-' + p.id, p.title, '', !GRADUATED[p.id]])).join('')}</div></section>
      <section class="hsec hlab"><h3><a href="#lab">Lab</a></h3><p class="note">Where new ideas are tried out. Beta modules graduate into their section once they are ready.</p>
        <div class="labgrad">${lab.filter(p => !TOOLS.includes(p.id)).map(p => `<a href="#lab-${p.id}"><span class="labicon" aria-hidden="true">${p.icon || ''}</span><b>${esc(p.title)}</b></a>`).join('')}<a href="#lab"><b>All experiments ›</b></a></div></section>
    </div>`;
  };
})();

// Feature gallery: pick a feature and see it on every genus that has it, next to look-alikes that don't.
LAB.add({
  id: 'gallery', icon: '▤', title: 'Feature gallery',
  blurb: 'Pick a feature (hooded corallites, verrucae, paliform lobes…) and see it on every genus that has it, beside look-alikes that lack it.',
  lede: 'Train your eye on one feature at a time: the top row has it, the bottom row is look-alikes that don\'t. Tap a photo to enlarge.',
  render(root, start){
    const all = DATA.traits.flatMap(c => c.opts.map(o => ({...o, c: c.name})));
    let cur = all.find(o => o.id === start) || all.find(o => o.id === 'hood');
    root.innerHTML = `${DATA.traits.map(c => `<fieldset class="trset"><legend>${esc(c.name)}</legend><div class="chips">${c.opts.map(o => `<a class="chip" href="#lab-gallery|${o.id}" data-f="${o.id}">${esc(o.t)}</a>`).join('')}</div></fieldset>`).join('')}<div id="galbody"></div>`;
    root.querySelectorAll('[data-f]').forEach(a => a.setAttribute('aria-current', String(a.dataset.f === cur.id)));
    const yes = labNames().filter(n => DATA.gen[n].tr.includes(cur.id));
    const no = [...new Set(yes.flatMap(lookAlikes))].filter(n => !yes.includes(n));
    const list = [...yes, ...no].map(n => ({...viewPhoto(n, 'macro'), genus: n, view: 'macro'}));
    const tiles = (L, off) => L.map((n, i) => `<button type="button" data-z="${i + off}" class="galtile"><img src="${thumbSrc(n, 'macro', document.documentElement.dataset.size === 'l' ? 'l' : 's')}" alt="${esc(n)} corallites" loading="lazy"><i>${esc(n)}</i></button>`).join('');
    root.querySelector('#galbody').innerHTML = `<h3 class="galh yes">With ${esc(cur.t.toLowerCase())} <small>${yes.length}</small></h3><div class="galgrid">${tiles(yes, 0)}</div>
      ${no.length ? `<h3 class="galh no">Look-alikes without it <small>${no.length}</small></h3><div class="galgrid">${tiles(no, yes.length)}</div>` : ''}`;
    root.querySelectorAll('[data-z]').forEach(b => b.onclick = () => zoom(list, Number(b.dataset.z)));
  }
});

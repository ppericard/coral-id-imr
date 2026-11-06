// Feature gallery: pick a feature and see it on every genus that has it, next to look-alikes that don't.
LAB.add({
  id: 'gallery',
  icon: '▤',
  title: 'Feature gallery',
  blurb:
    'Pick a feature (hooded corallites, verrucae, paliform lobes…) and see it on every genus that has it, beside look-alikes that lack it.',
  lede: "Train your eye on one feature at a time: the top row has it, the bottom row is look-alikes that don't. Tap a photo to enlarge.",
  render(root, start) {
    const all = DATA.traits.flatMap(c => c.opts.map(o => ({...o, c: c.name})));
    let cur = all.find(o => o.id === start) || all.find(o => o.id === 'hood');
    root.innerHTML = `<div class="trcols">${DATA.traits.map(c => `<fieldset class="trset"><legend>${esc(c.name)}</legend><div class="chips">${c.opts.map(o => `<a class="chip" href="${esc(hr('lab-gallery|' + o.id))}" data-f="${o.id}"${o.src ? ` title="${esc(o.src)}"` : ''}>${esc(o.t)}</a>`).join('')}</div></fieldset>`).join('')}</div><div id="galbody"></div>`;
    root.querySelectorAll('[data-f]').forEach(a => a.setAttribute('aria-current', String(a.dataset.f === cur.id)));
    const yes = labNames().filter(n => trHas(DATA.gen[n], cur.id) === 1),
      some = labNames().filter(n => trHas(DATA.gen[n], cur.id) === 0.5);
    const no = [...new Set([...yes, ...some].flatMap(lookAlikes))].filter(n => !trHas(DATA.gen[n], cur.id));
    const list = [...yes, ...some, ...no].map(n => ({...viewPhoto(n, 'macro'), genus: n, view: 'macro'}));
    const tiles = (L, off) =>
      L.map(
        (n, i) =>
          `<button type="button" data-z="${i + off}" class="galtile"><img src="${thumbSrc(n, 'macro', document.documentElement.dataset.size === 'l' ? 'l' : 's')}" alt="${esc(n)} corallites" loading="lazy"><i>${esc(n)}</i></button>`
      ).join('');
    root.querySelector('#galbody').innerHTML =
      `${cur.src ? `<p class="note">Source: ${esc(cur.src)}</p>` : ''}<div class="galcols"><section><h3 class="galh yes">With ${esc(cur.t.toLowerCase())} <small>${yes.length}</small></h3><div class="galgrid">${tiles(yes, 0)}</div></section>
      ${some.length ? `<section><h3 class="galh some">In ${SOME_SP} <small>${some.length}</small></h3><div class="galgrid">${tiles(some, yes.length)}</div></section>` : ''}
      ${no.length ? `<section><h3 class="galh no">Look-alikes without it <small>${no.length}</small></h3><div class="galgrid">${tiles(no, yes.length + some.length)}</div></section>` : ''}</div>`;
    root.querySelectorAll('[data-z]').forEach(b => (b.onclick = () => zoom(list, Number(b.dataset.z))));
  }
});

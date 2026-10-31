// Radial mind map: the 39 genera grouped by family, IMR lecture group, wall type or corallite size.
LAB.add({
  id: 'map', icon: '✺', title: 'Mind map',
  blurb: 'A radial map of the 39 genera, regrouped live by family, IMR lecture group, wall type or corallite size.',
  lede: 'Switch the grouping and watch where each genus lands. A genus that shows up in several branches can take several forms of that feature.',
  render(root, mode = 'ig'){
    // [id, name, groups of a genus, long label, short label on the map, colour]
    const WALLSHORT = {plo: 'Separate walls', cer: 'Shared walls', mea: 'Valleys', none: 'No walls', solo: 'Solitary'};
    const MODES = [
      ['ig', 'IMR lecture group', n => [DATA.gen[n].ig || 0], k => k ? `${k}. ${DATA.imrg[k - 1].t}` : '★ Not in the lecture', k => k ? 'Group ' + k : '★', k => igColor(k)],
      ['fam', 'Family', n => [DATA.gen[n].fam], k => k, k => k, k => famColor(k)],
      ['wall', 'Wall type', n => DATA.gen[n].tr.filter(t => trSet('wall').includes(t)), k => trName(k), k => WALLSHORT[k], (k, i) => `hsl(${i * 72 + 20} 55% 50%)`],
      ['size', 'Corallite size', n => DATA.gen[n].tr.filter(t => trSet('size').includes(t)), k => 'Corallites ' + trName(k), k => trName(k), (k, i) => `hsl(${200 - i * 45} 55% 50%)`]
    ];
    let cur = MODES.find(m => m[0] === mode) || MODES[0], sel = null;
    root.innerHTML = `<div class="chips">${MODES.map(m => `<button class="chip" type="button" data-m="${m[0]}">${m[1]}</button>`).join('')}</div>
      <div class="mapwrap"><svg id="mapsvg" viewBox="-610 -610 1220 1220" role="img" aria-label="Radial mind map of the genera"></svg>
      <aside class="mapside" id="mapside"><p class="note">Tap a genus to see its corallites, or a branch to list its genera.</p></aside></div>
      <div class="chips maplegend" id="maplegend"></div>`;
    const svg = root.querySelector('#mapsvg'), side = root.querySelector('#mapside'), legend = root.querySelector('#maplegend');
    const draw = () => {
      root.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === cur[0])));
      const [, , keysOf, label, short, color] = cur;
      const groups = new Map();
      labNames().forEach(n => keysOf(n).forEach(k => { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); }));
      let keys = [...groups.keys()];
      if (cur[0] === 'ig') keys.sort((a, b) => (a || 99) - (b || 99));
      else if (cur[0] === 'fam') keys.sort((a, b) => groups.get(b).length - groups.get(a).length);
      else { const order = trSet(cur[0]); keys.sort((a, b) => order.indexOf(a) - order.indexOf(b)); }
      const leaves = keys.flatMap(k => groups.get(k).map(n => ({k, n})));
      // One empty slot between branches keeps them apart.
      const slots = leaves.length + keys.length, R1 = 230, R2 = 420;
      let i = 0; const ang = {}; const pos = [];
      keys.forEach(k => { groups.get(k).forEach(n => { pos.push({k, n, a: (i++ + 0.5) / slots * 2 * Math.PI - Math.PI / 2}); }); i++; });
      keys.forEach(k => { const L = pos.filter(p => p.k === k); ang[k] = (L[0].a + L[L.length - 1].a) / 2; });
      const xy = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
      const nodeR = Math.min(22, Math.PI * R2 / slots - 2);
      let h = `<defs>${pos.map((p, j) => { const [x, y] = xy(R2, p.a); return `<clipPath id="mc${j}"><circle r="${nodeR}" cx="${x}" cy="${y}"/></clipPath>`; }).join('')}</defs>`;
      h += `<g class="mlinks">${keys.map(k => { const [x, y] = xy(R1, ang[k]); return `<path d="M0 0 Q ${xy(R1 * .45, ang[k]).join(' ')} ${x} ${y}" stroke="${color(k, keys.indexOf(k))}" data-k="${esc(k)}"/>`; }).join('')}
        ${pos.map(p => { const [x1, y1] = xy(R1, ang[p.k]), [x2, y2] = xy(R2 - nodeR, p.a), [cx, cy] = xy((R1 + R2) / 2, p.a); return `<path d="M${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" stroke="${color(p.k, keys.indexOf(p.k))}" data-k="${esc(p.k)}" data-n="${esc(p.n)}"/>`; }).join('')}</g>`;
      h += `<circle class="mcenter" r="54"/><text class="mctext" y="-4">39 genera</text><text class="mctext sub" y="16">${esc(cur[1].toLowerCase())}</text>`;
      h += pos.map((p, j) => {
        const [x, y] = xy(R2, p.a), deg = p.a * 180 / Math.PI, flip = Math.cos(p.a) < 0;
        const [lx, ly] = xy(R2 + nodeR + 8, p.a);
        return `<g class="mleaf" data-n="${esc(p.n)}" data-k="${esc(p.k)}" style="--d:${j * 12}ms" tabindex="0" role="button" aria-label="${esc(p.n)}">
          <circle r="${nodeR + 3}" cx="${x}" cy="${y}" fill="${color(p.k, keys.indexOf(p.k))}"/>
          <image href="${thumbSrc(p.n)}" x="${x - nodeR}" y="${y - nodeR}" width="${nodeR * 2}" height="${nodeR * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#mc${j})"/>
          <text x="${lx}" y="${ly}" transform="rotate(${flip ? deg + 180 : deg} ${lx} ${ly})" text-anchor="${flip ? 'end' : 'start'}" dominant-baseline="middle">${esc(p.n)}${DATA.gen[p.n].n ? '' : ' ★'}</text></g>`;
      }).join('');
      h += keys.map(k => { const [x, y] = xy(R1, ang[k]), [tx, ty] = xy(R1 - 26, ang[k]);
        return `<g class="mgroup" data-k="${esc(k)}" tabindex="0" role="button" aria-label="${esc(label(k))}"><circle r="10" cx="${x}" cy="${y}" fill="${color(k, keys.indexOf(k))}"/><text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle">${esc(short(k))}</text></g>`; }).join('');
      legend.innerHTML = keys.map(k => `<button type="button" class="chip" data-lk="${esc(k)}"><i style="background:${color(k, keys.indexOf(k))}"></i>${esc(label(k))} <small>${groups.get(k).length}</small></button>`).join('');
      legend.querySelectorAll('[data-lk]').forEach(b => b.onclick = () => showGroup(keys.find(x => String(x) === b.dataset.lk)));
      svg.innerHTML = h;
      const focus = (n, k) => {
        const ks = n ? keysOf(n).map(String) : [String(k)];
        svg.classList.toggle('dim', !!(n || k !== undefined));
        svg.querySelectorAll('.mleaf, .mlinks path, .mgroup').forEach(e => {
          const inBranch = ks.includes(e.dataset.k);
          e.classList.toggle('on', n ? (e.dataset.n ? e.dataset.n === n : inBranch) : inBranch);
        });
      };
      const showGenus = n => {
        const g = DATA.gen[n]; sel = n; focus(n);
        side.innerHTML = `<img src="${thumbSrc(n, 'macro', 'l')}" alt="${esc(n)} corallites"><h3><i>${esc(n)}</i></h3><p class="note">${esc(tag(n))} · ${esc(g.fam)}${g.ig ? ' · IMR group ' + g.ig : ''}</p>
          <p>${whyLine(n)}</p><p class="note">In ${keysOf(n).length} branch${keysOf(n).length > 1 ? 'es' : ''} here.</p><a class="next" href="${genLink(n)}">Open the genus sheet</a>`;
      };
      const showGroup = k => {
        sel = null; focus(null, k);
        side.innerHTML = `<h3>${esc(label(k))}</h3><div class="mapthumbs">${groups.get(k).map(n => `<button type="button" data-g="${esc(n)}"><img src="${thumbSrc(n)}" alt="" loading="lazy"><i>${esc(n)}</i></button>`).join('')}</div>`;
        side.querySelectorAll('[data-g]').forEach(b => b.onclick = () => showGenus(b.dataset.g));
      };
      svg.querySelectorAll('.mleaf').forEach(e => { e.onclick = () => showGenus(e.dataset.n); e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); showGenus(e.dataset.n); } }; });
      svg.querySelectorAll('.mgroup').forEach(e => { const k = keys.find(x => String(x) === e.dataset.k); e.onclick = () => showGroup(k); e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); showGroup(k); } }; });
      svg.querySelector('.mcenter').onclick = () => { sel = null; svg.classList.remove('dim'); side.innerHTML = '<p class="note">Tap a genus to see its corallites, or a branch to list its genera.</p>'; };
      if (sel) showGenus(sel);
    };
    root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { cur = MODES.find(m => m[0] === b.dataset.m); draw(); });
    draw();
  }
});

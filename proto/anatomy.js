// Corallite anatomy: annotated top and side diagrams, a "name the part" drill, and the five wall types with real examples.
LAB.add({
  id: 'anatomy', icon: '◎', title: 'Corallite anatomy',
  blurb: 'Tap the parts of a corallite on a diagram, drill their names, then see the five wall types with real photos.',
  lede: 'Diagrams are schematic, not to scale. Tap a name or a part.',
  render(root){
    const def = t => (DATA.terms.find(x => x[0].startsWith(t)) || [t, ''])[1];
    const PARTS = [
      ['corallite', 'Corallite', def('Corallite')],
      ['wall', 'Wall (theca)', def('Wall')],
      ['septa', 'Septa', def('Septa')],
      ['costae', 'Costae', def('Costae')],
      ['col', 'Columella', 'Central skeletal structure at the bottom of the corallite, where the septa meet. Can be spongy, a rod or a plate.'],
      ['pali', 'Paliform lobes', def('Paliform')],
      ['coen', 'Coenosteum', def('Coenosteum')],
      ['tent', 'Tentacles', 'Ring of stinging tentacles around the oral disc. Out by day in a few genera (Goniopora, Alveopora, Heliofungia, Tubastraea…).'],
      ['disc', 'Oral disc', def('Oral disc')],
      ['mouth', 'Mouth', def('Mouth')]
    ];
    const c = 200, ray = (r1, r2, a) => `M${c + r1 * Math.cos(a)} ${c + r1 * Math.sin(a)} L${c + r2 * Math.cos(a)} ${c + r2 * Math.sin(a)}`;
    let septa = '', costae = '', pali = '';
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * 2 * Math.PI, prim = i % 2 === 0;
      septa += `<path d="${ray(92, prim ? 26 : 58, a)}"/>`;
      costae += `<path d="${ray(100, prim ? 138 : 126, a)}"/>`;
      if (prim) pali += `<ellipse cx="${c + 34 * Math.cos(a)}" cy="${c + 34 * Math.sin(a)}" rx="6" ry="4" transform="rotate(${a * 180 / Math.PI} ${c + 34 * Math.cos(a)} ${c + 34 * Math.sin(a)})"/>`;
    }
    const top = `<svg viewBox="0 0 400 400" class="anat" role="img" aria-label="Corallite seen from above">
      <defs><pattern id="pore" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.6"/></pattern></defs>
      <g data-p="coen" class="pt"><rect x="0" y="0" width="400" height="400" rx="14" class="coenbg"/><rect x="0" y="0" width="400" height="400" rx="14" fill="url(#pore)" class="coendots"/></g>
      <g data-p="corallite" class="pt"><circle cx="${c}" cy="${c}" r="146" class="outline"/></g>
      <g data-p="costae" class="pt lines">${costae}</g>
      <g data-p="wall" class="pt"><circle cx="${c}" cy="${c}" r="96" class="wall"/></g>
      <g data-p="septa" class="pt lines">${septa}</g>
      <g data-p="pali" class="pt blobs">${pali}</g>
      <g data-p="col" class="pt"><circle cx="${c}" cy="${c}" r="15" class="col"/><circle cx="${c - 5}" cy="${c - 4}" r="3" class="colh"/><circle cx="${c + 6}" cy="${c + 3}" r="3" class="colh"/><circle cx="${c - 1}" cy="${c + 7}" r="2.5" class="colh"/></g>
    </svg>`;
    let tent = '';
    for (let i = 0; i < 9; i++) { const x = 118 + i * 20.5; tent += `<path d="M${x} 78 C ${x - 10} 46, ${x + 12} 30, ${x + (i % 2 ? 6 : -6)} 14"/>`; }
    const side = `<svg viewBox="0 0 400 260" class="anat" role="img" aria-label="Corallite cut in half, seen from the side">
      <g data-p="coen" class="pt"><path d="M0 110 L80 110 L80 250 L0 250 Z M320 110 L400 110 L400 250 L320 250 Z" class="coenbg"/><path d="M0 110 L80 110 L80 250 L0 250 Z M320 110 L400 110 L400 250 L320 250 Z" fill="url(#pore)" class="coendots"/></g>
      <g data-p="corallite" class="pt"><path d="M60 100 L60 250 L340 250 L340 100" class="outline"/></g>
      <g data-p="costae" class="pt blobs"><path d="M64 110 L72 92 L80 110 Z M48 110 L56 98 L64 110 Z M320 110 L328 92 L336 110 Z M336 110 L344 98 L352 110 Z"/></g>
      <g data-p="wall" class="pt"><rect x="80" y="88" width="14" height="162" class="wallr"/><rect x="306" y="88" width="14" height="162" class="wallr"/></g>
      <g data-p="septa" class="pt lines"><path d="M94 96 Q 150 120 178 196 M306 96 Q 250 120 222 196 M94 130 Q 140 150 168 210 M306 130 Q 260 150 232 210"/></g>
      <g data-p="pali" class="pt blobs"><ellipse cx="176" cy="188" rx="5" ry="10"/><ellipse cx="224" cy="188" rx="5" ry="10"/></g>
      <g data-p="col" class="pt"><path d="M184 250 L184 206 Q200 188 216 206 L216 250 Z" class="col"/></g>
      <g class="polyp" style="display:none">
        <g data-p="tent" class="pt tent">${tent}</g>
        <g data-p="disc" class="pt"><path d="M96 84 Q200 64 304 84 L304 94 Q200 76 96 94 Z" class="disc"/></g>
        <g data-p="mouth" class="pt"><ellipse cx="200" cy="78" rx="14" ry="5" class="mouth"/></g>
      </g>
    </svg>`;
    const WALLS = [
      ['plo', 'Separate walls', 'Each corallite has its own wall, with coenosteum between them.'],
      ['cer', 'Shared walls', 'Neighbours share one wall: tight polygons, like a honeycomb.'],
      ['mea', 'Valleys / meanders', 'Several mouths share a valley; ridges (walls) run between valleys.'],
      ['none', 'No walls', 'No wall at all: septo-costae run continuously from one centre to the next.'],
      ['solo', 'Solitary / free-living', 'One big polyp, often free-living on sand (mushroom corals).']
    ];
    const wallSvg = id => {
      let s = '';
      if (id === 'plo') { [[34, 34], [100, 28], [64, 84], [132, 90], [20, 100]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="15" class="w"/>`; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += `<path d="M${x + 13 * Math.cos(a)} ${y + 13 * Math.sin(a)} L${x + 5 * Math.cos(a)} ${y + 5 * Math.sin(a)}"/>`; } }); return `<rect width="160" height="120" fill="url(#pore)" class="coendots"/>${s}`; }
      if (id === 'cer') { const hx = (x, y, r) => Array.from({length: 6}, (_, i) => { const a = Math.PI / 6 + i * Math.PI / 3; return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`; }).join(' ');
        for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) { const x = col * 26 + (row % 2) * 13, y = row * 22.5 + 8; s += `<polygon points="${hx(x, y, 15)}" class="w"/><circle cx="${x}" cy="${y}" r="2.5" class="dot"/>`; } return s; }
      if (id === 'mea') { for (let k = 0; k < 5; k++) { const y = 12 + k * 26; s += `<path class="w" d="M0 ${y} C 30 ${y - 14}, 50 ${y + 14}, 80 ${y} S 130 ${y - 14}, 160 ${y}"/>`; for (let x = 6; x < 160; x += 9) s += `<path d="M${x} ${y + 2} L${x} ${y + 10}"/>`; } return s; }
      if (id === 'none') {
        // Septo-costae run from one centre to the next with no wall between: bundles of parallel curves.
        const pts = [[28, 30], [88, 22], [140, 52], [52, 92], [118, 102]];
        pts.forEach(([x, y], i) => pts.forEach(([x2, y2], j) => { const d = Math.hypot(x2 - x, y2 - y); if (j <= i || d > 85) return; const nx = -(y2 - y) / d, ny = (x2 - x) / d;
          for (let o = -10; o <= 10; o += 4) s += `<path d="M${x + nx * o * .3} ${y + ny * o * .3} Q ${(x + x2) / 2 + nx * o} ${(y + y2) / 2 + ny * o} ${x2 + nx * o * .3} ${y2 + ny * o * .3}"/>`; }));
        pts.forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="4.5" class="dot"/>`; }); return s; }
      for (let i = 0; i < 48; i++) { const a = i / 48 * 2 * Math.PI; s += `<path d="M${80 + 52 * Math.cos(a)} ${60 + 52 * Math.sin(a) * .8} L${80 + (i % 2 ? 30 : 10) * Math.cos(a)} ${60 + (i % 2 ? 30 : 10) * Math.sin(a) * .8}"/>`; }
      return `<ellipse cx="80" cy="60" rx="56" ry="46" class="w"/>${s}<ellipse cx="80" cy="60" rx="9" ry="4" class="dot"/>`;
    };
    root.innerHTML = `<div class="anatgrid"><figure>${top}<figcaption>From above</figcaption></figure>
      <figure>${side}<figcaption>Cut in half, from the side · <label><input type="checkbox" id="polyp"> show the living polyp</label></figcaption></figure></div>
      <div class="chips" id="parts">${PARTS.map(p => `<button class="chip" type="button" data-part="${p[0]}">${esc(p[1])}</button>`).join('')}</div>
      <p class="anatdef" id="anatdef">Pick a part to highlight it.</p>
      <p><button type="button" class="next" id="anatq">Drill: name the highlighted part</button> <span class="note" id="anatscore"></span></p>
      <h3>The five wall types</h3><p class="note">The wall is the first thing to read on the corallites. Tap a type to see the genera that show it.</p>
      <div class="walls">${WALLS.map(([id, t, d]) => `<button type="button" class="wall" data-w="${id}"><svg viewBox="0 0 160 120" aria-hidden="true">${wallSvg(id)}</svg><b>${esc(t)}</b><span>${esc(d)}</span></button>`).join('')}</div>
      <div id="wallg"></div>`;
    const polypBox = root.querySelector('#polyp'), defEl = root.querySelector('#anatdef');
    polypBox.onchange = () => { root.querySelector('.polyp').style.display = polypBox.checked ? '' : 'none'; };
    const hl = id => {
      root.querySelectorAll('.anat').forEach(s => s.classList.toggle('dim', !!id));
      root.querySelectorAll('.pt').forEach(e => e.classList.toggle('on', e.dataset.p === id));
      root.querySelectorAll('[data-part]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === id)));
      if (['tent', 'disc', 'mouth'].includes(id) && !polypBox.checked) { polypBox.checked = true; polypBox.onchange(); }
    };
    let drill = null, lastDrill = null, score = {ok: 0, n: 0};
    const explain = id => { const p = PARTS.find(x => x[0] === id); hl(id); defEl.innerHTML = `<b>${esc(p[1])}</b>: ${esc(p[2])}`; };
    root.querySelectorAll('[data-part]').forEach(b => b.onclick = () => {
      if (!drill) return explain(b.dataset.part);
      const ok = b.dataset.part === drill; score.n++; if (ok) score.ok++;
      root.querySelector('#anatscore').textContent = `${score.ok} / ${score.n}`;
      defEl.innerHTML = `${ok ? '<b class="ok">Right.</b>' : `<b class="ko">No</b>, that was the <b>${esc(PARTS.find(x => x[0] === drill)[1])}</b>.`} ${esc(PARTS.find(x => x[0] === drill)[2])}`;
      drill = null; root.querySelector('#anatq').textContent = 'Next part';
    });
    root.querySelectorAll('.pt').forEach(e => e.onclick = ev => { ev.stopPropagation(); if (!drill) explain(e.dataset.p); });
    root.querySelector('#anatq').onclick = () => {
      drill = pick(PARTS.filter(p => p[0] !== lastDrill))[0]; lastDrill = drill;
      hl(drill); root.querySelectorAll('[data-part]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      defEl.textContent = 'Which part is highlighted?';
    };
    root.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-w]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const names = labNames().filter(n => DATA.gen[n].tr.includes(b.dataset.w)), list = names.map(n => ({...viewPhoto(n, 'macro'), genus: n, view: 'macro'}));
      root.querySelector('#wallg').innerHTML = `<p class="note">${names.length} genera. Tap a photo to enlarge.</p><div class="labstrip">${names.map((n, i) => `<button type="button" data-z="${i}"><img src="${thumbSrc(n)}" alt="${esc(n)} corallites" loading="lazy"><i>${esc(n)}</i></button>`).join('')}</div>`;
      root.querySelectorAll('#wallg [data-z]').forEach(x => x.onclick = () => zoom(list, Number(x.dataset.z)));
    });
  }
});

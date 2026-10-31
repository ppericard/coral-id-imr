// Look-alike web: a live force-directed graph of the look-alikes listed on each genus sheet.
LAB.add({
  id: 'web', icon: '⌘', title: 'Look-alike web',
  blurb: 'A living network of the look-alikes listed on the genus sheets. Drag the corals around.',
  lede: 'Each line joins two genera that are easily confused. Drag a node, tap one to see its look-alikes and jump to a side-by-side comparison.',
  render(root){
    const names = labNames(), W = 900, H = 640;
    const edges = [], seen = new Set();
    names.forEach(a => lookAlikes(a).forEach(b => { const k = [a, b].sort().join('|'); if (seen.has(k)) { edges.find(e => e.k === k).w = 2; return; } seen.add(k); edges.push({k, a, b, w: 1}); }));
    let colorBy = 'fam', sel = null, alpha = 1, raf = 0, drag = null;
    const N = names.map((n, i) => ({n, x: W / 2 + 260 * Math.cos(i * 2.4), y: H / 2 + 220 * Math.sin(i * 2.4), vx: 0, vy: 0}));
    const byName = Object.fromEntries(N.map(o => [o.n, o]));
    root.innerHTML = `<div class="chips"><button class="chip" type="button" data-c="fam">Colour by family</button><button class="chip" type="button" data-c="ig">Colour by IMR group</button><button class="chip" type="button" id="wshake">Shake</button></div>
      <div class="webwrap bleed"><svg id="websvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Network of look-alike genera">
        <defs><clipPath id="wclip"><circle r="20"/></clipPath></defs>
        <g class="wedges">${edges.map(e => `<line data-a="${esc(e.a)}" data-b="${esc(e.b)}" stroke-width="${e.w * 1.6}"/>`).join('')}</g>
        <g class="wnodes">${N.map(o => `<g class="wnode" data-n="${esc(o.n)}" tabindex="0" role="button" aria-label="${esc(o.n)}"><circle r="24" class="wring"/><image href="${thumbSrc(o.n)}" x="-20" y="-20" width="40" height="40" preserveAspectRatio="xMidYMid slice" clip-path="url(#wclip)"/><text y="38">${esc(o.n)}${DATA.gen[o.n].n ? '' : ' ★'}</text></g>`).join('')}</g>
      </svg><aside class="mapside" id="webside"><p class="note">Tap a coral.</p></aside></div><div class="weblegend" id="weblegend"></div>`;
    const svg = root.querySelector('#websvg'), side = root.querySelector('#webside');
    const lines = [...svg.querySelectorAll('.wedges line')], nodes = [...svg.querySelectorAll('.wnode')];
    const color = n => colorBy === 'fam' ? famColor(DATA.gen[n].fam) : igColor(DATA.gen[n].ig);
    const paintColors = () => {
      nodes.forEach(g => g.querySelector('.wring').setAttribute('fill', color(g.dataset.n)));
      root.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === colorBy)));
      const keys = colorBy === 'fam' ? labFams() : [...DATA.imrg.map(g => g.n), 0];
      root.querySelector('#weblegend').innerHTML = keys.map(k => `<span><i style="background:${colorBy === 'fam' ? famColor(k) : igColor(k)}"></i>${esc(colorBy === 'fam' ? k : k ? k + '. ' + DATA.imrg[k - 1].t : '★ not in the lecture')}</span>`).join('');
    };
    // Simple force layout: springs on edges, repulsion between all nodes, a weak pull to the centre.
    const tick = () => {
      for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
        const a = N[i], b = N[j]; let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy || 1; const d = Math.sqrt(d2);
        const f = Math.min(10, 9000 / d2); dx /= d; dy /= d; a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
      }
      edges.forEach(e => { const a = byName[e.a], b = byName[e.b]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const f = (d - 115) * 0.02 * e.w; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; });
      N.forEach(o => { o.vx += (W / 2 - o.x) * 0.002; o.vy += (H / 2 - o.y) * 0.003; if (o === drag) { o.vx = o.vy = 0; return; } o.x += o.vx * alpha; o.y += o.vy * alpha; o.vx *= 0.6; o.vy *= 0.6; o.x = Math.max(30, Math.min(W - 30, o.x)); o.y = Math.max(30, Math.min(H - 44, o.y)); });
    };
    const paint = () => {
      lines.forEach((l, i) => { const a = byName[edges[i].a], b = byName[edges[i].b]; l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); });
      nodes.forEach((g, i) => g.setAttribute('transform', `translate(${N[i].x} ${N[i].y})`));
    };
    const loop = () => { if (!svg.isConnected) return; tick(); paint(); alpha *= 0.992; if (alpha > 0.02 || drag) raf = requestAnimationFrame(loop); else raf = 0; };
    const kick = (a = 0.6) => { alpha = Math.max(alpha, a); if (!raf) raf = requestAnimationFrame(loop); };
    const select = n => {
      sel = n; const near = n ? lookAlikes(n).concat(names.filter(x => lookAlikes(x).includes(n))) : [];
      svg.classList.toggle('dim', !!n);
      nodes.forEach(g => g.classList.toggle('on', g.dataset.n === n || near.includes(g.dataset.n)));
      lines.forEach(l => l.classList.toggle('on', l.dataset.a === n || l.dataset.b === n));
      if (!n) { side.innerHTML = '<p class="note">Tap a coral.</p>'; return; }
      const g = DATA.gen[n];
      side.innerHTML = `<img src="${thumbSrc(n, 'macro', 'l')}" alt="${esc(n)} corallites"><h3><a href="${genLink(n)}"><i>${esc(n)}</i></a></h3><p class="note">${esc(tag(n))} · ${esc(g.fam)}</p><p>${whyLine(n)}</p>
        <p class="note">Compare with:</p><div class="mapthumbs">${[...new Set(near)].map(b => `<a href="#cmp-${encodeURIComponent(n + '|' + b)}"><img src="${thumbSrc(b)}" alt="" loading="lazy"><i>${esc(b)}</i></a>`).join('')}</div>`;
    };
    const pt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    let moved = false;
    nodes.forEach((g, i) => {
      g.onpointerdown = e => { drag = N[i]; moved = false; g.setPointerCapture(e.pointerId); kick(0.3); };
      g.onpointermove = e => { if (drag !== N[i]) return; const p = pt(e); if (Math.hypot(p.x - drag.x, p.y - drag.y) > 3) moved = true; drag.x = p.x; drag.y = p.y; kick(0.3); };
      g.onpointerup = () => { if (!moved) select(sel === N[i].n ? null : N[i].n); drag = null; };
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(sel === N[i].n ? null : N[i].n); } };
    });
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { colorBy = b.dataset.c; paintColors(); });
    root.querySelector('#wshake').onclick = () => { N.forEach(o => { o.vx += (Math.random() - .5) * 80; o.vy += (Math.random() - .5) * 80; }); kick(1); };
    paintColors(); paint(); kick(1);
    return () => cancelAnimationFrame(raf);
  }
});

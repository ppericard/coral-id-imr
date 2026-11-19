// Look-alike web: a live force-directed graph of the look-alikes of the subject on screen (rule S1; Q437, Pierre,
// 2026-11-19): its declared pairs (app.js UNITS pairs, as the duels read them, never the data's: model.js dataLooks), every
// unit of a pair a node. A reference tool, like the map and the gallery: it shows every unit, not only the unlocked ones
// (rule L4 is for the games). How the nodes are coloured is the subject's own declaration (app.js UNITS webBy).
LAB.add({
  id: 'web',
  icon: '⌘',
  title: 'Look-alike web',
  // Said with the subject's own words (SUBJ.what, SUBJ.one, SUBJ.many), at the time the page is drawn.
  get blurb() {
    return `A living network of the look-alikes listed on the ${SUBJ.one} sheets. Drag the ${SUBJ.what.toLowerCase()} units around.`;
  },
  get lede() {
    return `Each line joins two ${SUBJ.many} that are easily confused. Drag a node, tap one to see its look-alikes${SUBJ.pages.includes('cmp') ? ' and jump to a side-by-side comparison' : ''}.`;
  },
  render(root) {
    // The pairs of the subject, each once, between units of its slate (the units of its game: not the bonus genera, opt-in,
    // rule L6); a unit with no record is left out.
    const slate = new Set(slateGenera()),
      pairs = UNITS[SUBJ.id]
        .pairs()
        .filter(([a, b]) => a !== b && slate.has(a) && slate.has(b) && GX(a) && GX(b))
        .map(([a, b]) => (a < b ? [a, b] : [b, a])),
      names = [...new Set(pairs.flat())].sort(),
      W = 900,
      H = 640;
    const edges = [],
      seen = new Set();
    // The units each one looks like, from the same pairs (both ways).
    const near = Object.fromEntries(names.map(n => [n, []]));
    pairs.forEach(([a, b]) => {
      const k = a + '|' + b;
      if (seen.has(k)) return;
      seen.add(k);
      edges.push({k, a, b, w: 1});
      near[a].push(b);
      near[b].push(a);
    });
    // One photo of a unit: its cover, else the draw's own choice (lab.js labShots).
    const shots = labShots(),
      photoOf = n => cover(GX(n)) || shots.photo(n, null);
    const pics = {},
      nodePic = (n, s = 's') => {
        const k = n + s;
        if (!(k in pics)) {
          const p = photoOf(n);
          pics[k] = p ? img(p, s) : '';
        }
        return pics[k];
      };
    // The colourings the subject declares (UNITS webBy: chip, of(unit) → the unit's group key, name(key), optional
    // color(key)); a key of none (0, '') is the grey "not in a group".
    const by = UNITS[SUBJ.id].webBy();
    let colorBy = 0,
      sel = null,
      alpha = 1,
      raf = 0,
      drag = null;
    // A node drawn from its first position round a circle.
    const N = names.map((n, i) => ({n, x: W / 2 + 260 * Math.cos(i * 2.4), y: H / 2 + 220 * Math.sin(i * 2.4), vx: 0, vy: 0}));
    const byName = Object.fromEntries(N.map(o => [o.n, o]));
    const star = n => (GX(n).n === 0 ? ' ★' : ''); // a coral genus the IMR survey does not track
    const noun = SUBJ.what.toLowerCase();
    root.innerHTML = `<div class="chips">${by.length > 1 ? by.map((c, i) => `<button class="chip" type="button" data-c="${i}">${esc(c.chip)}</button>`).join('') : ''}<button class="chip" type="button" id="wshake">Shake</button></div>
      <div class="webwrap bleed"><svg id="websvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Network of look-alike ${esc(SUBJ.many)}">
        <defs><clipPath id="wclip"><circle r="20"/></clipPath></defs>
        <g class="wedges">${edges.map(e => `<line data-a="${esc(e.a)}" data-b="${esc(e.b)}" stroke-width="${e.w * 1.6}"/>`).join('')}</g>
        <g class="wnodes">${N.map(o => `<g class="wnode" data-n="${esc(o.n)}" tabindex="0" role="button" aria-label="${esc(unameT(o.n))}"><circle r="24" class="wring"/>${nodePic(o.n) ? `<image href="${nodePic(o.n)}" x="-20" y="-20" width="40" height="40" preserveAspectRatio="xMidYMid slice" clip-path="url(#wclip)"/>` : ''}<text y="38"${uplain(o.n) ? ' class="pl"' : ''}>${esc(unameT(o.n))}${star(o.n)}</text></g>`).join('')}</g>
      </svg><aside class="mapside" id="webside"><p class="note">Tap a ${esc(noun)} unit.</p></aside></div><div class="weblegend" id="weblegend"></div>`;
    const svg = root.querySelector('#websvg'),
      side = root.querySelector('#webside');
    const lines = [...svg.querySelectorAll('.wedges line')],
      nodes = [...svg.querySelectorAll('.wnode')];
    // The group keys of the colouring in force among the nodes (a key of none last), and a node's colour: the colouring's own,
    // else one hue each, spread round the wheel (mid-tones read on both light and dark backgrounds).
    const keysOf = () => {
      const c = by[colorBy],
        K = [...new Set(names.map(c.of))];
      return [
        ...K.filter(Boolean).sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)))),
        ...K.filter(k => !k)
      ];
    };
    const hue = k => {
      const c = by[colorBy],
        K = keysOf().filter(Boolean);
      return !k ? 'hsl(0 0% 55%)' : c.color ? c.color(k) : `hsl(${Math.round((K.indexOf(k) * 360) / K.length + 190) % 360} 58% 50%)`;
    };
    const color = n => hue(by[colorBy].of(n));
    const paintColors = () => {
      nodes.forEach(g => g.querySelector('.wring').setAttribute('fill', color(g.dataset.n)));
      root.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.c) === colorBy)));
      root.querySelector('#weblegend').innerHTML = keysOf()
        .map(k => `<span><i style="background:${hue(k)}"></i>${esc(by[colorBy].name(k))}</span>`)
        .join('');
    };
    // Simple force layout: springs on edges, repulsion between all nodes, a weak pull to the centre.
    const tick = () => {
      for (let i = 0; i < N.length; i++)
        for (let j = i + 1; j < N.length; j++) {
          const a = N[i],
            b = N[j];
          let dx = b.x - a.x,
            dy = b.y - a.y,
            d2 = dx * dx + dy * dy || 1;
          const d = Math.sqrt(d2);
          const f = Math.min(10, 9000 / d2);
          dx /= d;
          dy /= d;
          a.vx -= dx * f;
          a.vy -= dy * f;
          b.vx += dx * f;
          b.vy += dy * f;
        }
      edges.forEach(e => {
        const a = byName[e.a],
          b = byName[e.b];
        const dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy) || 1;
        const f = (d - 115) * 0.02 * e.w;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      });
      N.forEach(o => {
        o.vx += (W / 2 - o.x) * 0.002;
        o.vy += (H / 2 - o.y) * 0.003;
        if (o === drag) {
          o.vx = o.vy = 0;
          return;
        }
        o.x += o.vx * alpha;
        o.y += o.vy * alpha;
        o.vx *= 0.6;
        o.vy *= 0.6;
        o.x = Math.max(30, Math.min(W - 30, o.x));
        o.y = Math.max(30, Math.min(H - 44, o.y));
      });
    };
    const paint = () => {
      lines.forEach((l, i) => {
        const a = byName[edges[i].a],
          b = byName[edges[i].b];
        l.setAttribute('x1', a.x);
        l.setAttribute('y1', a.y);
        l.setAttribute('x2', b.x);
        l.setAttribute('y2', b.y);
      });
      nodes.forEach((g, i) => g.setAttribute('transform', `translate(${N[i].x} ${N[i].y})`));
    };
    const loop = () => {
      if (!svg.isConnected) return;
      tick();
      paint();
      alpha *= 0.992;
      if (alpha > 0.02 || drag) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const kick = (a = 0.6) => {
      alpha = Math.max(alpha, a);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const select = n => {
      sel = n;
      const nb = n ? near[n] : [];
      svg.classList.toggle('dim', !!n);
      nodes.forEach(g => g.classList.toggle('on', g.dataset.n === n || nb.includes(g.dataset.n)));
      lines.forEach(l => l.classList.toggle('on', l.dataset.a === n || l.dataset.b === n));
      if (!n) {
        side.innerHTML = `<p class="note">Tap a ${esc(noun)} unit.</p>`;
        return;
      }
      const g = GX(n),
        // the side panel's line: the IMR number or star (a coral genus), then the unit's family line
        sub = [g.n ? 'No. ' + g.n : g.n === 0 ? '★ not surveyed' : '', g.fam && altName(g.fam)].filter(Boolean).join(' · '),
        // Compare is a page of the subjects that have it (SUBJECTS pages); the others link to the unit's sheet
        cmp = SUBJ.pages.includes('cmp'),
        pic = nodePic(n, 'l');
      side.innerHTML = `${pic ? `<img src="${pic}" alt="${esc(unameT(n))}">` : ''}<h3><a href="${esc(genLink(n))}">${uname(n)}</a></h3>${sub ? `<p class="note">${esc(sub)}</p>` : ''}${g.tr ? `<p>${whyLine(n)}</p>` : ''}
        <p class="note">${cmp ? 'Compare with' : 'Looks like'}:</p><div class="mapthumbs">${nb
          .map(
            b =>
              `<a href="${esc(cmp ? hr('cmp-' + (n + '|' + b)) : genLink(b))}">${nodePic(b) ? `<img src="${nodePic(b)}" alt="" loading="lazy">` : ''}${uname(b)}</a>`
          )
          .join('')}</div>`;
    };
    const pt = e => {
      const p = svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    let moved = false;
    nodes.forEach((g, i) => {
      g.onpointerdown = e => {
        drag = N[i];
        moved = false;
        g.setPointerCapture(e.pointerId);
        kick(0.3);
      };
      g.onpointermove = e => {
        if (drag !== N[i]) return;
        const p = pt(e);
        if (Math.hypot(p.x - drag.x, p.y - drag.y) > 3) moved = true;
        drag.x = p.x;
        drag.y = p.y;
        kick(0.3);
      };
      g.onpointerup = () => {
        if (!moved) select(sel === N[i].n ? null : N[i].n);
        drag = null;
      };
      g.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(sel === N[i].n ? null : N[i].n);
        }
      };
    });
    root.querySelectorAll('[data-c]').forEach(
      b =>
        (b.onclick = () => {
          colorBy = Number(b.dataset.c);
          paintColors();
        })
    );
    root.querySelector('#wshake').onclick = () => {
      N.forEach(o => {
        o.vx += (Math.random() - 0.5) * 80;
        o.vy += (Math.random() - 0.5) * 80;
      });
      kick(1);
    };
    paintColors();
    paint();
    kick(1);
    return () => cancelAnimationFrame(raf);
  }
});

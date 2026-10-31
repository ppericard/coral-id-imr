// Anatomy v2: one arrangement or one concept at a time, each drawn on its own and ringed on real macro photos.
// Routes: #lab-anatomy2 (arrangements), #lab-anatomy2|arr|<id>, #lab-anatomy2|con|<id>, #lab-anatomy2|drill.
// Add |edit to any route to print photo coordinates on click (for placing rings).
(() => {
  // Deterministic jitter so the drawings are the same on every visit.
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;

  /* ---------- drawing pieces, in a 200 x 200 square ---------- */
  // One plocoid corallite: costae outside the wall, alternating septa inside, a columella dot.
  const cup = (cx, cy, r, hl = '', n = 12) => {
    let costae = '', septa = '';
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a), big = i % 2 === 0;
      septa += `M${P(cx + r * c, cy + r * s)}L${P(cx + r * (big ? .3 : .62) * c, cy + r * (big ? .3 : .62) * s)}`;
      costae += `M${P(cx + r * c, cy + r * s)}L${P(cx + r * (big ? 1.38 : 1.24) * c, cy + r * (big ? 1.38 : 1.24) * s)}`;
    }
    const k = p => hl === p ? ' hl' : '';
    return `<g class="cup${hl === 'corallite' ? ' hl' : ''}"><path class="costae${k('costae')}" d="${costae}"/><circle class="wallc${k('wall')}" cx="${cx}" cy="${cy}" r="${r}"/><path class="septa${k('septa')}" d="${septa}"/>${hl === 'pali' ? Array.from({length: n / 2}, (_, i) => { const a = i / (n / 2) * 2 * Math.PI; return `<circle class="pali hl" cx="${P(cx + r * .4 * Math.cos(a), cy + r * .4 * Math.sin(a)).replace(' ', '" cy="')}" r="${(r * .1).toFixed(1)}"/>`; }).join('') : ''}<circle class="colu${k('columella')}" cx="${cx}" cy="${cy}" r="${(r * .17).toFixed(1)}"/></g>`;
  };
  const PLO = [[42, 40, 20], [118, 32, 17], [178, 70, 18], [82, 104, 22], [160, 140, 20], [34, 158, 18], [104, 182, 16]];
  const plocoid = (hl = '') => `<rect class="coen${hl === 'coenosteum' ? ' hl' : ''}" width="200" height="200"/><rect class="pores" width="200" height="200"/>${PLO.map(([x, y, r], i) => cup(x, y, r, i === 3 || hl !== 'corallite' ? hl : '')).join('')}`;
  // Cerioid: an irregular honeycomb, every wall shared by two corallites.
  const cerioid = (hl = '') => {
    const s = 22, h = s * Math.sqrt(3), R = rnd(7), jit = {}, J = (x, y) => { const k = `${Math.round(x)},${Math.round(y)}`; if (!jit[k]) jit[k] = [x + (R() - .5) * 9, y + (R() - .5) * 9]; return jit[k]; };
    let walls = '', septa = '', cols = '';
    for (let i = -1; i < 8; i++) for (let j = -1; j < 7; j++) {
      const cx = i * s * 1.5, cy = j * h + (i % 2 ? h / 2 : 0);
      const v = Array.from({length: 6}, (_, k) => J(cx + s * Math.cos(k * Math.PI / 3), cy + s * Math.sin(k * Math.PI / 3)));
      walls += `M${v.map(p => P(...p)).join('L')}Z`;
      v.forEach((p, k) => { const q = v[(k + 1) % 6], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        [p, m].forEach(e => { septa += `M${P(e[0] * .85 + cx * .15, e[1] * .85 + cy * .15)}L${P(e[0] * .45 + cx * .55, e[1] * .45 + cy * .55)}`; }); });
      cols += `<circle class="colu" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.6"/>`;
    }
    return `<rect class="skel" width="200" height="200"/><path class="septa" d="${septa}"/>${cols}<path class="wallc${hl === 'wall' ? ' hl' : ''}" d="${walls}"/>`;
  };
  // Meandroid: valleys with several mouths, the walls are the ridges between them.
  const wave = (y0, A, ph) => u => y0 + A * Math.sin(u / 26 + ph) + A * .45 * Math.sin(u / 11 + ph * 2);
  const meandroid = (hl = '', flabello = false) => {
    const gap = flabello ? 50 : 38, ws = [];
    for (let k = -1; k * gap < 230; k++) ws.push(wave(k * gap, flabello ? 7 : 9, k * 1.7));
    let walls = '', septa = '', mouths = '', valley = '';
    ws.forEach((w, k) => {
      const line = off => `M${Array.from({length: 41}, (_, i) => P(i * 5, w(i * 5) + off)).join('L')}`;
      walls += flabello ? line(-3.5) + line(3.5) : line(0);
      const nx = ws[k + 1]; if (!nx) return;
      valley += `M${Array.from({length: 41}, (_, i) => P(i * 5, w(i * 5) + (flabello ? 4 : 1))).join('L')}L${Array.from({length: 41}, (_, i) => P(200 - i * 5, nx(200 - i * 5) - (flabello ? 4 : 1))).join('L')}Z`;
      for (let u = 2; u < 200; u += 5) { const a = w(u) + (flabello ? 4 : 1), b = nx(u) - (flabello ? 4 : 1), m = (a + b) / 2, big = Math.round(u / 5) % 2 === 0, l = (b - a) * (big ? .3 : .18);
        septa += `M${P(u, a)}L${P(u, a + l)}M${P(u, b)}L${P(u, b - l)}`; }
      for (let u = 18 + (k % 2) * 16; u < 200; u += 42) mouths += `<ellipse class="mouth${hl === 'mouth' ? ' hl' : ''}" cx="${u}" cy="${((w(u) + nx(u)) / 2).toFixed(1)}" rx="3.4" ry="2"/>`;
    });
    return `<rect class="skel" width="200" height="200"/><path class="valley${hl === 'valley' ? ' hl' : ''}" d="${valley}"/><path class="septa" d="${septa}"/>${mouths}<path class="wallc${hl === 'wall' ? ' hl' : ''}" d="${walls}"/>`;
  };
  // Hydnophoroid: cone-shaped monticules, corallite centres in the low ground between them.
  const MONTI = [[36, 34], [104, 22], [170, 40], [68, 92], [140, 100], [30, 150], [100, 160], [176, 168]];
  const hydno = (hl = '') => {
    let s = '';
    MONTI.forEach(([x, y]) => { let c = ''; for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * Math.PI; c += `M${P(x + 5 * Math.cos(a), y + 5 * Math.sin(a))}L${P(x + 24 * Math.cos(a), y + 24 * Math.sin(a))}`; }
      s += `<g class="monti${hl === 'monti' ? ' hl' : ''}"><circle class="cone" cx="${x}" cy="${y}" r="24"/><path class="septa" d="${c}"/><circle class="peak" cx="${x}" cy="${y}" r="5"/></g>`; });
    [[70, 40], [138, 62], [30, 92], [104, 124], [176, 124], [62, 186], [140, 192], [60, 132]].forEach(([x, y]) => { s += `<ellipse class="mouth" cx="${x}" cy="${y}" rx="3.4" ry="2"/>`; });
    return `<rect class="skel" width="200" height="200"/>${s}`;
  };
  // No walls: septo-costae run from one centre straight on to the next.
  const CEN = [[34, 30], [100, 18], [168, 34], [66, 84], [140, 92], [20, 138], [96, 150], [170, 160], [46, 196], [130, 204]];
  const nowall = (hl = '') => {
    let d = '';
    CEN.forEach(([x, y]) => { for (let i = 0; i < 22; i++) { const a = i / 22 * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a); let L = 70;
      CEN.forEach(([x2, y2]) => { const dx = x2 - x, dy = y2 - y, dot = dx * c + dy * s; if (dot > 0) L = Math.min(L, (dx * dx + dy * dy) / 2 / dot); });
      d += `M${P(x + 4 * c, y + 4 * s)}L${P(x + L * c, y + L * s)}`; } });
    return `<rect class="skel" width="200" height="200"/><path class="sc${hl === 'sc' ? ' hl' : ''}" d="${d}"/>${CEN.map(([x, y]) => `<circle class="colu" cx="${x}" cy="${y}" r="3.4"/>`).join('')}`;
  };
  // Solitary: one disc, septa from the edge to the central mouth.
  const solitary = (hl = '', several = false) => {
    let d = '';
    for (let i = 0; i < 72; i++) { const a = i / 72 * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a), lv = i % 4 === 0 ? .12 : i % 2 === 0 ? .4 : .7; d += `M${P(100 + 86 * c, 100 + 74 * s)}L${P(100 + 86 * lv * c, 100 + 74 * lv * s)}`; }
    return `<rect class="sand" width="200" height="200"/><ellipse class="disc" cx="100" cy="100" rx="88" ry="76"/><path class="septa${hl === 'septa' ? ' hl' : ''}" d="${d}"/>${several ? `<path class="furrow" d="M30 100L170 100"/>${[50, 80, 112, 146].map(x => `<ellipse class="mouth${hl === 'mouth' ? ' hl' : ''}" cx="${x}" cy="100" rx="5" ry="2.4"/>`).join('')}` : `<ellipse class="mouth${hl === 'mouth' ? ' hl' : ''}" cx="100" cy="100" rx="11" ry="3.4"/>`}`;
  };
  // Phaceloid: tubes on their own, so drawn standing up rather than as a surface.
  const TUBES = [[40, 30, 46], [110, 24, 40], [168, 44, 52], [70, 86, 50], [140, 100, 44], [24, 132, 40], [100, 150, 54], [170, 160, 42]];

  /* ---------- the block: surface seen at an angle, with a cut face in front ---------- */
  // Top face in (u, v) 0..200 is sheared to a parallelogram; the front face shows the profile along the cut.
  const TOP = 'matrix(1,0,.5,.42,12,14)', FY = 98;
  const PROF = {
    plocoid: () => { let d = 'M112 ' + FY; [[140, 12], [196, 16], [262, 12]].forEach(([x, w]) => { d += `L${x - w - 4} ${FY}C${x - w} ${FY - 2} ${x - w} ${FY - 12} ${x - w * .5} ${FY - 13}L${x - 3} ${FY - 5}L${x + 3} ${FY - 5}L${x + w * .5} ${FY - 13}C${x + w} ${FY - 12} ${x + w} ${FY - 2} ${x + w + 4} ${FY}`; }); return d + `L312 ${FY}`; },
    cerioid: () => { let d = `M112 ${FY - 6}`; for (let x = 112; x < 312; x += 25) d += `L${x + 12.5} ${FY + 6}L${x + 25} ${FY - 6}`; return d; },
    meandroid: () => { let d = `M112 ${FY}`; for (let x = 112; x < 312; x += 40) d += `C${x + 8} ${FY - 16} ${x + 12} ${FY - 16} ${x + 20} ${FY - 16}C${x + 28} ${FY - 16} ${x + 32} ${FY} ${x + 40} ${FY}`; return d; },
    flabello: () => { let d = `M112 ${FY}`; for (let x = 112; x < 312; x += 50) d += `C${x + 6} ${FY - 18} ${x + 14} ${FY - 18} ${x + 21} ${FY - 16}L${x + 25} ${FY - 9}L${x + 29} ${FY - 16}C${x + 36} ${FY - 18} ${x + 44} ${FY - 18} ${x + 50} ${FY}`; return d; },
    hydno: () => `M112 ${FY}L140 ${FY}L160 ${FY - 24}L180 ${FY}L222 ${FY}L242 ${FY - 24}L262 ${FY}L312 ${FY}`,
    nowall: () => `M112 ${FY}C150 ${FY - 4} 170 ${FY - 4} 212 ${FY}S275 ${FY - 4} 312 ${FY}`,
    solitary: () => `M112 ${FY}L122 ${FY}C150 ${FY - 34} 274 ${FY - 34} 302 ${FY}L312 ${FY}`
  };
  const block = (kind, top, label) => {
    const front = PROF[kind] ? PROF[kind]() : '';
    const tubes = kind === 'phaceloid' ? TUBES.slice().sort((a, b) => a[1] - b[1]).map(([u, v, h]) => {
      const x = 12 + u + .5 * v, y = 14 + .42 * v, r = 14;
      return `<g class="tube"><path class="tubeside" d="M${x - r} ${y}L${x - r} ${y - h}A${r} ${r * .42} 0 0 1 ${x + r} ${y - h}L${x + r} ${y}A${r} ${r * .42} 0 0 1 ${x - r} ${y}Z"/><ellipse class="tubetop" cx="${x}" cy="${y - h}" rx="${r}" ry="${(r * .42).toFixed(1)}"/>${Array.from({length: 12}, (_, i) => { const a = i / 12 * 2 * Math.PI; return `<path class="septa" d="M${P(x + r * Math.cos(a), y - h + r * .42 * Math.sin(a))}L${P(x + r * .35 * Math.cos(a), y - h + r * .42 * .35 * Math.sin(a))}"/>`; }).join('')}</g>`;
    }).join('') : '';
    const lift = kind === 'phaceloid' ? 56 : 4;
    return `<svg viewBox="0 ${-lift} 330 ${170 + lift}" class="blk" role="img" aria-label="${esc(label)}">
      <defs><clipPath id="c-${kind}"><rect width="200" height="200"/></clipPath></defs>
      <g transform="${TOP}"><g clip-path="url(#c-${kind})">${kind === 'phaceloid' ? '<rect class="base" width="200" height="200"/>' : top}</g><rect class="edge" width="200" height="200"/></g>
      <path class="cut" d="M112 ${FY}L312 ${FY}L312 ${FY + 44}L112 ${FY + 44}Z"/>
      ${front ? `<path class="cutskel" d="${front}L312 ${FY + 44}L112 ${FY + 44}Z"/><path class="cutline" d="${front}"/>` : ''}
      <path class="edge" d="M212 14L312 ${FY}L312 ${FY + 44}M112 ${FY}L112 ${FY + 44}L312 ${FY + 44}"/>
      ${tubes}</svg>`;
  };
  // Flat square view for concept cards: same patterns, one part in the accent colour.
  const flat = (svg, label, box = '0 0 200 200') => `<svg viewBox="${box}" class="mini" role="img" aria-label="${esc(label)}"><defs><clipPath id="m${label.length}${box.length}"><rect width="200" height="200"/></clipPath></defs>${svg}</svg>`;

  /* ---------- content ---------- */
  // Arrangements: how corallites sit together. A genus can show more than one.
  const ARR = [
    {id: 'plocoid', name: 'Separate walls', tech: 'plocoid', draw: () => plocoid(), see: ['Each corallite has its own round wall.', 'Coenosteum (plain or ornamented skeleton) between corallites.', 'Septa often cross the wall and continue as costae.'],
      small: ['Acropora', 'Anacropora', 'Pocillopora', 'Stylophora', 'Seriatopora', 'Montipora', 'Cyphastrea', 'Astreopora'], genera: ['Echinopora', 'Galaxea', 'Turbinaria', 'Mycedium', 'Dipsastraea', 'Astrea', 'Diploastrea', 'Favites'],
      notes: {Favites: 'mostly shared walls; some species separate', Mycedium: 'corallites lean towards the plate edge', Diploastrea: 'very thick walls, packed tight', Montipora: 'walls barely formed, tiny pits'}},
    {id: 'cerioid', name: 'Shared walls', tech: 'cerioid', draw: () => cerioid(), see: ['Neighbours share one wall: polygons, like a honeycomb.', 'No coenosteum between corallites.', 'No costae.'],
      genera: ['Porites', 'Goniopora', 'Alveopora', 'Favites', 'Goniastrea', 'Lobophyllia'], notes: {Goniastrea: 'also in valleys; look for paliform lobes', Lobophyllia: 'former Symphyllia: shared walls with a groove on top'}},
    {id: 'phaceloid', name: 'Tubes on stalks', tech: 'phaceloid / dendroid', see: ['Corallites are tall tubes, each standing free.', 'Tubes rise from a common base or branch.', 'Wall high and thin; septa at the tube mouth.'],
      genera: ['Tubastraea', 'Duncanopsammia', 'Lobophyllia'], notes: {Lobophyllia: 'stalks hidden under a fleshy dome', Tubastraea: 'no zooxanthellae: often orange or black, in shade'}},
    {id: 'meandroid', name: 'Valleys', tech: 'meandroid', draw: () => meandroid(), see: ['Several mouths share one valley.', 'Walls run as ridges (collines) between valleys.', 'Septa run across the valley, wall to wall.'],
      genera: ['Platygyra', 'Leptoria', 'Goniastrea', 'Merulina', 'Lobophyllia'], notes: {Platygyra: 'ragged, alternating septa, no paliform lobes', Leptoria: 'equal septa like a zipper', Goniastrea: 'neat, with paliform lobes', Merulina: 'short valleys fanning out to the edge'}},
    {id: 'flabello', name: 'Valleys with own walls', tech: 'flabello-meandroid', draw: () => meandroid('', true), see: ['Each valley has its own walls.', 'A groove separates neighbouring valleys.', 'Often big and fleshy.'],
      genera: ['Plerogyra', 'Lobophyllia'], notes: {Plerogyra: 'grape-like vesicles by day', Lobophyllia: 'big spiky septal teeth under the tissue'}},
    {id: 'hydno', name: 'Cones between centres', tech: 'hydnophoroid', draw: () => hydno(), see: ['Wall pieces form small cones (monticules).', 'Corallite centres sit in the low ground between cones.', 'Cones lined with costae.'],
      genera: ['Hydnophora'], notes: {}},
    {id: 'nowall', name: 'No walls', tech: 'septo-costae', draw: () => nowall(), see: ['No wall at all around the centres.', 'Septo-costae run from one centre on to the next.', 'Judge by ornament: ribs, ridges, rows.'],
      genera: ['Pavona', 'Pachyseris', 'Pectinia'], notes: {Pavona: 'star-like centres, ridges with a sharp top', Pachyseris: 'parallel ridges, fine ribs at right angles', Pectinia: 'large, sparse centres between steep flutes'}},
    {id: 'solitary', name: 'Solitary disc', tech: 'solitary / free-living', draw: () => solitary(), see: ['One large polyp, free on the bottom.', 'Septa from the disc edge to the mouth.', 'One central mouth, or a furrow with several.'],
      genera: ['Fungia', 'Lithophyllon', 'Danafungia', 'Lobactis', 'Heliofungia', 'Ctenactis', 'Herpolitha', 'Halomitra'], notes: {Ctenactis: 'several mouths in a long furrow', Herpolitha: 'several mouths in a long furrow', Halomitra: 'dome with many mouths', Heliofungia: 'long tentacles out by day'}}
  ];
  const PROFKIND = {flabello: 'flabello', hydno: 'hydno', nowall: 'nowall'};
  const arrOf = n => ARR.filter(a => a.genera.includes(n) || (a.small || []).includes(n));

  // Concepts: one idea each, a small drawing, rings on real macro photos [file, genus, [x %, y %, r % of width], note].
  const CON = [
    {id: 'corallite', name: 'Corallite', q: 'Where is one polyp?', def: 'The skeleton cup of one polyp. Find one before anything else: its size and shape start every ID.',
      minis: [[plocoid('corallite'), 'Separate walls']], shots: [
        ['dipsastraea-macro-746236818', 'Dipsastraea', [46, 58, 12], 'One oval corallite, about 1 cm.'],
        ['diploastrea-macro-745205009', 'Diploastrea', [50, 62, 10], 'Low cone with a broad wall.'],
        ['goniastrea-macro-746237401', 'Goniastrea', [40, 53, 8], 'Polygonal cup in a shared-wall colony.'],
        ['acropora-macro-745206072', 'Acropora', [46, 59, 5], 'A small radial corallite, about 2 mm.']]},
    {id: 'wall', name: 'Wall', q: 'Separate, shared, or none?', def: 'The rim around a corallite. It separates septa (inside) from costae (outside). Its arrangement is the first ID question.',
      minis: [[plocoid('wall'), 'Separate walls'], [cerioid('wall'), 'Shared walls'], [meandroid('wall'), 'Walls as ridges between valleys']], shots: [
        ['dipsastraea-macro-746236818', 'Dipsastraea', [46, 58, 12], 'The ring sits on its own wall; pale coenosteum outside.'],
        ['porites-macro-745675630', 'Porites', [44, 44, 5], 'Shared walls: one wall between two neighbours.'],
        ['platygyra-macro-745204310', 'Platygyra', [58, 45, 7], 'A wall running as a ridge between two valleys.']]},
    {id: 'septa', name: 'Septa', q: 'Equal or alternating? Plain or toothed?', def: 'Vertical blades inside the corallite, running from the wall to the centre. Count, size and teeth separate look-alikes.',
      minis: [[cup(100, 100, 70, 'septa'), 'Septa inside one corallite']], box: '0 0 200 200', shots: [
        ['galaxea-macro-100103379', 'Galaxea', [31, 45, 8], 'Tall blade-like septa, star-shaped.'],
        ['diploastrea-macro-745205009', 'Diploastrea', [50, 62, 10], 'Many even septa on a low cone.'],
        ['fungia-macro-746236363', 'Fungia', [50, 60, 10], 'Long septa of a solitary disc.']]},
    {id: 'costae', name: 'Costae', q: 'Do the septa continue outside the wall?', def: 'Septa that cross the wall and run on outside it. Present with separate walls, absent with shared walls.',
      minis: [[cup(100, 100, 52, 'costae'), 'Costae outside the wall']], shots: [
        ['dipsastraea-macro-746236818', 'Dipsastraea', [60, 68, 4.5], 'Septa running over the rim into the pale coenosteum.']]},
    {id: 'coenosteum', name: 'Coenosteum', q: 'What is between the corallites?', def: 'Skeleton between corallites with separate walls. Smooth, spiny, beaded or ridged: the ornament is often the clue.',
      minis: [[plocoid('coenosteum'), 'Coenosteum between corallites']], shots: [
        ['dipsastraea-macro-746236818', 'Dipsastraea', [47, 15, 5], 'Pale tissue over coenosteum between corallites.'],
        ['turbinaria-macro-745206251', 'Turbinaria', [55, 25, 8], 'Always smooth between the cups.'],
        ['montipora-macro-745674855', 'Montipora', [28, 45, 9], 'Covered in papillae: these bumps are not corallites.']]},
    {id: 'columella', name: 'Columella', q: 'What fills the centre?', def: 'The structure at the bottom centre, where the septa meet: spongy, a rod or a plate. Often hidden by tissue underwater.',
      minis: [[cup(100, 100, 70, 'columella'), 'Columella at the centre']], shots: [
        ['diploastrea-macro-745205009', 'Diploastrea', [50, 61, 4], 'Spongy tangle at the centre of the cone.']]},
    {id: 'pali', name: 'Paliform lobes', q: 'Is there a crown around the centre?', def: 'Upright lobes at the inner end of the septa, forming a crown around the centre. Goniastrea has them; Platygyra lacks them.',
      minis: [[cup(100, 100, 70, 'pali'), 'Crown of paliform lobes']], shots: [
        ['goniastrea-macro-746236750', 'Goniastrea', null, 'Look for the paler knobs in a ring near each centre. Ring not placed yet.'],
        ['goniastrea-macro-746236709', 'Goniastrea', null, 'Same genus, another colony.']]},
    {id: 'sc', name: 'Septo-costae', q: 'No wall: what do the ribs do?', def: 'With no wall, septa and costae are one: lines that flow from one centre straight on to the next.',
      minis: [[nowall('sc'), 'Septo-costae between centres']], shots: [
        ['pavona-macro-745204888', 'Pavona', [62, 83, 10], 'Star-like centre, lines flowing to the neighbours.'],
        ['pachyseris-macro-745204769', 'Pachyseris', [45, 50, 8], 'Ridge lined with fine ribs at right angles.']]},
    {id: 'teeth', name: 'Septal teeth', q: 'Fine saw, or big spikes?', def: 'Teeth on the upper edge of the septa. Their size splits the mushroom corals and marks Lobophyllia.',
      minis: [[`<rect class="skel" width="200" height="120"/><path class="blade" d="M10 110L10 70${Array.from({length: 9}, (_, i) => `L${20 + i * 20} 44L${30 + i * 20} 70`).join('')}L190 70L190 110Z"/><path class="teethline hl" d="M10 70${Array.from({length: 9}, (_, i) => `L${20 + i * 20} 44L${30 + i * 20} 70`).join('')}"/>`, 'One septum from the side, teeth on top']], box: '0 20 200 100', shots: [
        ['danafungia-macro-746236636', 'Danafungia', [40, 42, 10], 'Large, irregular teeth.'],
        ['fungia-macro-746236363', 'Fungia', [50, 60, 10], 'Fine, regular, saw-like teeth.']]},
    {id: 'axial', name: 'Axial and radial corallites', q: 'Is the branch tip different?', def: 'In Acropora the corallite at each branch tip (axial) is larger and different from those along the sides (radial).',
      minis: [[`<rect class="sand" width="200" height="200"/><path class="branch" d="M70 200L76 70C78 40 122 40 124 70L130 200Z"/><ellipse class="axial hl" cx="100" cy="52" rx="16" ry="7"/>${[[66, 92], [134, 108], [66, 128], [134, 146], [66, 166], [134, 184]].map(([x, y]) => `<path class="radial" d="M${x} ${y}l${x < 100 ? -16 : 16} -12l${x < 100 ? 4 : -4} 12z"/>`).join('')}`, 'Branch tip: axial on top, radials on the sides']], shots: [
        ['acropora-macro-745206072', 'Acropora', [37, 26, 8], 'Axial corallite: the tall tip.'],
        ['acropora-macro-745206072', 'Acropora', [46, 59, 5], 'A radial corallite on the side.']]},
    {id: 'valley', name: 'Valleys and collines', q: 'Are mouths lined up in valleys?', def: 'In valley corals, mouths share a valley; the ridges between valleys are collines (walls). Valley width and septa pattern split the brain corals.',
      minis: [[meandroid('valley'), 'Valleys between ridges']], shots: [
        ['platygyra-macro-745204310', 'Platygyra', [50, 28, 5], 'Valley floor between two ridges.'],
        ['pachyseris-macro-745204769', 'Pachyseris', [45, 50, 8], 'Colline (ridge) between two valleys.']]}
  ];

  /* ---------- views ---------- */
  const photoOf = (file, genus) => { const g = DATA.gen[genus]; return {...((g && allPhotos(g).find(p => p.f === file)) || {f: file}), genus}; };
  const ringed = (file, genus, ring, note, k, edit) => `<figure class="ringed"><button type="button" class="rphoto" data-k="${k}" aria-label="${esc(genus)}, enlarge photo"><img src="${img({f: file})}" alt="${esc(genus)} corallites${ring ? ', a ring marks the feature' : ''}" loading="lazy">${ring ? `<span class="ring" style="left:${ring[0]}%;top:${ring[1]}%;width:${ring[2] * 2}%" aria-hidden="true"></span>` : ''}</button>
    <figcaption><a href="${genLink(genus)}"><i>${esc(genus)}</i></a> · ${esc(note)}${edit ? `<br><code class="a2xy" data-xy="${k}">tap the photo for x, y</code>` : ''}</figcaption></figure>`;
  const gthumb = (n, list, note, here) => { list.push({...viewPhoto(n, 'macro'), genus: n, view: 'macro'}); return `<figure class="a2g"><button type="button" data-z="${list.length - 1}"><img src="${thumbSrc(n)}" alt="${esc(n)} corallites" loading="lazy"></button><figcaption><a href="${genLink(n)}"><i>${esc(n)}</i></a>${note ? `<small>${esc(note)}</small>` : ''}${arrOf(n).filter(a => a !== here).length ? `<small class="also">also: ${arrOf(n).filter(a => a !== here).map(a => `<a href="#lab-anatomy2|arr|${a.id}">${esc(a.name)}</a>`).join(', ')}</small>` : ''}</figcaption></figure>`; };

  LAB.add({
    id: 'anatomy2', icon: '⬡', title: 'Anatomy v2',
    blurb: 'One arrangement or one concept at a time: a clean drawing for each, ringed on real macro photos, then a photo drill.',
    lede: 'Learn how corallites sit together (arrangements) and what their parts are (concepts), always checked on real photos.',
    render(root, ...args){
      const edit = args.includes('edit'), a = args.filter(x => x !== 'edit'), mode = ['con', 'drill'].includes(a[0]) ? a[0] : 'arr', sfx = edit ? '|edit' : '';
      const tabs = `<nav class="a2tabs" aria-label="Anatomy views">${[['arr', 'Arrangements'], ['con', 'Concepts'], ['drill', 'Photo drill']].map(([k, t]) => `<a href="#lab-anatomy2|${k}${sfx}"${mode === k ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
      const list = [];
      if (mode === 'arr') {
        const cur = ARR.find(x => x.id === a[1]) || ARR[0];
        const kind = cur.id === 'phaceloid' ? 'phaceloid' : PROFKIND[cur.id] || cur.id;
        root.innerHTML = `${tabs}<p class="note">The first question on any corallite photo: how do the corallites sit together? Several genera show more than one arrangement.</p>
          <div class="a2arrs">${ARR.map(x => `<a href="#lab-anatomy2|arr|${x.id}${sfx}"${x === cur ? ' aria-current="true"' : ''}>${block(x.id === 'phaceloid' ? 'phaceloid' : PROFKIND[x.id] || x.id, x.draw ? x.draw() : '', x.name)}<b>${esc(x.name)}</b><small>${esc(x.tech)}</small></a>`).join('')}</div>
          <section class="a2detail"><div class="a2big">${block(kind, cur.draw ? cur.draw() : '', cur.name + ', seen at an angle with a cut face')}</div>
          <div><h3>${esc(cur.name)} <small>${esc(cur.tech)}</small></h3><ul>${cur.see.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
          <p class="note">Drawing not to scale. The front face is a cut through the colony surface.</p></div></section>
          ${cur.small ? `<h3>Small corallites, under 2 mm</h3><div class="a2gs">${cur.small.map(n => gthumb(n, list, cur.notes[n], cur)).join('')}</div><h3>Large corallites, 2 mm and up</h3>` : '<h3>IMR genera</h3>'}
          <div class="a2gs">${cur.genera.map(n => gthumb(n, list, cur.notes[n], cur)).join('')}</div>`;
      } else if (mode === 'con') {
        const cur = CON.find(x => x.id === a[1]) || CON[0];
        root.innerHTML = `${tabs}<div class="chips a2chips">${CON.map(x => `<a class="chip" href="#lab-anatomy2|con|${x.id}${sfx}"${x === cur ? ' aria-current="true"' : ''}>${esc(x.name)}</a>`).join('')}</div>
          <section class="a2con"><div class="a2minis">${cur.minis.map(([s, l]) => `<figure>${flat(s, l, cur.box)}<figcaption>${esc(l)}</figcaption></figure>`).join('')}</div>
          <div><h3>${esc(cur.name)}</h3><p class="a2q">${esc(cur.q)}</p><p>${esc(cur.def)}</p></div></section>
          <h3>On real corallites</h3><div class="a2shots">${cur.shots.map(([f, g, r, note], k) => { list.push(photoOf(f, g)); return ringed(f, g, r, note, k, edit); }).join('')}</div>`;
      } else {
        root.innerHTML = `${tabs}<div class="seg" role="group" aria-label="Drill type"><button type="button" data-t="con" aria-pressed="true">What is ringed?</button><button type="button" data-t="arr" aria-pressed="false">Which arrangement?</button></div>
          <div id="a2q"></div><p><button type="button" class="next" id="a2next">Next photo</button> <span class="note" id="a2score"></span></p>`;
        let type = 'con', score = {ok: 0, n: 0}, last = null;
        const pool = CON.flatMap(c => c.shots.filter(s => s[2]).map(s => ({c, s})));
        const ask = () => {
          const box = root.querySelector('#a2q');
          if (type === 'con') {
            let q; do q = pick(pool); while (pool.length > 1 && q === last); last = q;
            const opts = shuffle([q.c, ...shuffle(CON.filter(c => c !== q.c)).slice(0, 3)]);
            box.innerHTML = `<p class="a2q">What does the ring mark?</p><div class="a2drill">${ringed(q.s[0], q.s[1], q.s[2], 'genus shown after you answer', 0, false).replace(/<figcaption>[\s\S]*<\/figcaption>/, '')}</div>
              <div class="choices">${opts.map(c => `<button type="button" class="choice" data-c="${c.id}" style="font-style:normal">${esc(c.name)}</button>`).join('')}</div><p class="a2fb" aria-live="polite"></p>`;
            box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
              if (box.querySelector('.choice.right')) return;
              const ok = b.dataset.c === q.c.id; score.n++; if (ok) score.ok++;
              box.querySelectorAll('[data-c]').forEach(x => x.classList.add(x.dataset.c === q.c.id ? 'right' : x === b ? 'wrong' : 'off'));
              box.querySelector('.a2fb').innerHTML = `${ok ? '<b class="ok">Right.</b>' : `<b class="ko">No</b>, it is the <b>${esc(q.c.name)}</b>.`} <a href="${genLink(q.s[1])}"><i>${esc(q.s[1])}</i></a>: ${esc(q.s[3])} <a href="#lab-anatomy2|con|${q.c.id}">See the card</a>`;
              root.querySelector('#a2score').textContent = `${score.ok} / ${score.n}`;
            });
          } else {
            let n; do n = pick(labNames()); while (n === last); last = n;
            const right = arrOf(n), p = pick(DATA.gen[n].views.macro || [viewPhoto(n, 'macro')]);
            const opts = shuffle([pick(right), ...shuffle(ARR.filter(x => !right.includes(x))).slice(0, 3)]);
            box.innerHTML = `<p class="a2q">How do the corallites sit together?</p><div class="a2drill"><figure class="ringed"><button type="button" class="rphoto" data-k="0" aria-label="Enlarge photo"><img src="${img(p)}" alt="Corallites to classify"></button></figure></div>
              <div class="choices">${opts.map(x => `<button type="button" class="choice" data-a="${x.id}" style="font-style:normal">${esc(x.name)}</button>`).join('')}</div><p class="a2fb" aria-live="polite"></p>`;
            list.length = 0; list.push({...p, view: 'macro'});
            box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
              if (box.querySelector('.choice.right')) return;
              const ok = right.some(x => x.id === b.dataset.a); score.n++; if (ok) score.ok++;
              box.querySelectorAll('[data-a]').forEach(x => x.classList.add(right.some(r => r.id === x.dataset.a) ? 'right' : x === b ? 'wrong' : 'off'));
              box.querySelector('.a2fb').innerHTML = `${ok ? '<b class="ok">Right.</b>' : '<b class="ko">No.</b>'} <a href="${genLink(n)}"><i>${esc(n)}</i></a>: ${right.map(x => `<a href="#lab-anatomy2|arr|${x.id}">${esc(x.name)}</a>`).join(' or ')}${right.length > 1 ? ' (this genus shows both)' : ''}. ${esc(DATA.gen[n].sum || '')}`;
              list[0].genus = n;
              root.querySelector('#a2score').textContent = `${score.ok} / ${score.n}`;
            });
          }
          box.querySelectorAll('.rphoto').forEach(x => x.onclick = () => zoom(type === 'con' ? [{...photoOf(last.s[0], last.s[1]), genus: ''}] : list, 0, {blind: () => !box.querySelector('.choice.right')}));
        };
        root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { type = b.dataset.t; root.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); last = null; ask(); });
        root.querySelector('#a2next').onclick = ask;
        ask();
        return;
      }
      root.querySelectorAll('[data-z]').forEach(x => x.onclick = () => zoom(list, Number(x.dataset.z)));
      root.querySelectorAll('.rphoto').forEach(x => x.onclick = e => {
        if (!edit) return zoom(list, Number(x.dataset.k));
        const r = x.getBoundingClientRect(), out = root.querySelector(`[data-xy="${x.dataset.k}"]`);
        out.textContent = `[${Math.round((e.clientX - r.left) / r.width * 100)}, ${Math.round((e.clientY - r.top) / r.height * 100)}, r]`;
      });
    }
  });
})();

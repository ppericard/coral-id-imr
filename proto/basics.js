// Coral basics: a short guided path for complete beginners (no coral lecture), from the colony down to the corallite and
// back out to the growth forms. One step = one labelled photo (Pierre's own or an IMR lecture photo; another observer's
// only where none shows the point) or a drawing of ours, one plain sentence and an optional one-question check. Nothing
// is forced: every step can be skipped, the checks are optional, and nothing here is shown to a player who did not
// open it (IMR RAs stay the main audience, Pierre 2026-11-03).
// Routes: #basics (resume), #basics|<step id>, #basics|<glossary term> (e.g. |Septa), #basics|words. Graduated from the
// Lab into Learn (Pierre, 2026-11-03): the first step of the Learn path ("0 · Coral basics" before the genus sheets, the
// first Learn tab); the old #lab-basics links land here (proto/lab.js GRADUATED), and the Tools page keeps a link.
// Done (Pierre, 2026-11-03: completion recognised): every step seen (the walls step: its four wall types), the checks
// stay optional; kept in imr-basics (fin), and as the achievement "Coral basics" (feat _basics, synced with the
// achievements record, progress.js), which the Home line and the first-launch offers read (app.js basicsDone).
// Add |edit to print photo coordinates on a tap and show the tap targets (for placing labels).
(() => {
  /* ---------- photos: coordinates are pixels of the 960 px file (w 960, h given), crops are [x, y, w, h] ---------- */
  const PH = {
    colony: {g: 'Diploastrea', f: 'diploastrea-wide-746238202', h: 768},
    // Day-extended polyps: only an aside on the polyp step now (Pierre, 2026-11-03: too special to explain a polyp).
    polypsDay: {g: 'Goniopora', f: 'goniopora-medium-745205676', h: 768},
    // One polyp, wide open (Pierre, 2026-11-03: the Galaxea photo was too busy for a beginner): an IMR lecture photo.
    polyp: {g: 'Tubastraea', f: 'imrl-p19_g64', h: 720},
    nowall: {g: 'Pavona', f: 'pavona-macro-745204888', h: 768},
    cups: {g: 'Dipsastraea', f: 'dipsastraea-macro-746236818', h: 720},
    // Septa inside the rim, costae outside it, the mouth in the centre, all on one corallite seen from above (Pierre,
    // 2026-11-03: "if you define septa, you must define costae"; none of his or the IMR macro photos shows the two apart
    // as clearly, so an iNaturalist observer's photo, credited in the enlarged view, fills the gap, rule 7).
    septa: {g: 'Astrea', f: 'astrea-macro-102598933', h: 720},
    cupsMed: {g: 'Diploastrea', f: 'diploastrea-medium-746238185', h: 768},
    bigTeeth: {g: 'Danafungia', f: 'danafungia-macro-746236636', h: 720},
    fineTeeth: {g: 'Fungia', f: 'fungia-macro-746236363', h: 720},
    shared: {g: 'Goniastrea', f: 'goniastrea-macro-746237401', h: 768},
    valleys: {g: 'Platygyra', f: 'platygyra-macro-745204314', h: 768}
  };
  // The photo object of data.json (credit, observation) for the enlarged view.
  const pobj = s => {
    const g = DATA.gen[s.g];
    return {...((g && [...allPhotos(g), ...(DATA.course[s.g] || [])].find(p => p.f === s.f)) || {f: s.f}), genus: s.g};
  };
  const pctX = (x, b) => (((x - b[0]) / b[2]) * 100).toFixed(2) + '%';
  const pctY = (y, b) => (((y - b[1]) / b[3]) * 100).toFixed(2) + '%';

  // A photo cropped to box b, an SVG layer in the same pixels (marks) and HTML labels (constant text size on any screen).
  // marks: ['ell', cx, cy, rx, ry] (focus: the rest of the photo dims a little), ['rim', cx, cy, rx, ry] (a thin dashed
  // ring, no dimming), ['line', x1, y1, x2, y2], ['path', d], ['dot', x, y, r, colour class];
  // labels: [text, x, y, anchor 'c' | 'l' | 'r', colour class]. Colour classes: 'sep' (septa, --hl), 'cos' (costae).
  const layer = (b, marks, labels, k, extra = '') => {
    const focus = marks.filter(m => m[0] === 'ell');
    const draw = m =>
      m[0] === 'ell'
        ? `<ellipse class="bx-ring" cx="${m[1]}" cy="${m[2]}" rx="${m[3]}" ry="${m[4]}"/>`
        : m[0] === 'rim'
          ? `<ellipse class="bx-rim" cx="${m[1]}" cy="${m[2]}" rx="${m[3]}" ry="${m[4]}"/>`
          : m[0] === 'line'
            ? `<line class="bx-lead" x1="${m[1]}" y1="${m[2]}" x2="${m[3]}" y2="${m[4]}"/>`
            : m[0] === 'path'
              ? `<path class="bx-out" d="${m[1]}"/>`
              : `<circle class="bx-dot${m[4] ? ' ' + m[4] : ''}" cx="${m[1]}" cy="${m[2]}" r="${m[3] || 9}"/>`;
    const mask = focus.length
      ? `<mask id="bxm${k}"><rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" fill="#fff"/>${focus.map(m => `<ellipse cx="${m[1]}" cy="${m[2]}" rx="${m[3]}" ry="${m[4]}" fill="#000"/>`).join('')}</mask><rect class="bx-dim" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" mask="url(#bxm${k})"/>`
      : '';
    return `<svg viewBox="${b.join(' ')}" preserveAspectRatio="none" aria-hidden="true">${mask}${marks.map(draw).join('')}${extra}</svg>
      ${labels.map(([t, x, y, a = 'c', c = '']) => `<span class="bx-lab bx-${a}${c ? ' ' + c : ''}" style="left:${pctX(x, b)};top:${pctY(y, b)}">${esc(t)}</span>`).join('')}`;
  };
  // The labels of each teaching photo, kept for its enlarged view: the whole photo, labels on (app.js zoom opts.over).
  const ANN = {};
  const over = p => (ANN[p.f] ? layer([0, 0, 960, ANN[p.f].h], ANN[p.f].marks, ANN[p.f].labels, 'lb') : '');
  // zoom: the photo itself opens the enlarged view (Pierre, 2026-11-03: the small "Enlarge" link went unnoticed), with
  // the app's enlarge mark (ZOOMI) in its corner, like the quiz and genus sheet photos.
  const photo = (s, {box, marks = [], labels = [], cls = '', k = 0, edit = false, hits = [], zoom: z = false} = {}) => {
    const b = box || [0, 0, 960, s.h];
    if (z) ANN[s.f] = {h: s.h, marks, labels};
    const alt = `${esc(s.g)}${labels.length ? ', labelled: ' + esc(labels.map(l => l[0]).join(', ')) : ''}`;
    return `<div class="bx-ph${cls ? ' ' + cls : ''}${z ? ' bx-zoom' : ''}" data-k="${k}"${z ? ` role="button" tabindex="0" aria-label="Enlarge photo: ${alt}"` : ''} style="aspect-ratio:${b[2]} / ${b[3]};--ar:${(b[2] / b[3]).toFixed(4)}">
      <img src="${img({f: s.f}, fit((Math.min(innerWidth, 640) * 960) / b[2]))}" alt="${alt}" style="width:${((960 / b[2]) * 100).toFixed(2)}%;height:${((s.h / b[3]) * 100).toFixed(2)}%;left:${((-b[0] / b[2]) * 100).toFixed(2)}%;top:${((-b[1] / b[3]) * 100).toFixed(2)}%" draggable="false">
      ${layer(b, marks, labels, k, `${edit ? hits.map(([x, y]) => `<circle class="bx-hit" cx="${x}" cy="${y}" r="${HIT}"/>`).join('') : ''}<g class="bx-taps"></g>`)}${z ? ZOOMI : ''}</div>`;
  };
  const cap = (s, note = '') => `<figcaption><a href="${genLink(s.g)}"><i>${esc(s.g)}</i></a>${note ? ' · ' + note : ''}</figcaption>`;

  /* ---------- drawings (ours), 140 x 140, theme tokens only; the part being taught in --hl ---------- */
  const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  // One corallite from above: wall, septa (long and short in turn), costae outside the wall, the centre.
  const cupTop = (hl = '') => {
    let septa = '',
      costae = '';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 2 * Math.PI,
        c = Math.cos(a),
        s = Math.sin(a),
        long = i % 2 === 0;
      septa += `M${P(70 + 44 * c, 70 + 44 * s)}L${P(70 + (long ? 12 : 27) * c, 70 + (long ? 12 : 27) * s)}`;
      costae += `M${P(70 + 44 * c, 70 + 44 * s)}L${P(70 + (long ? 62 : 55) * c, 70 + (long ? 62 : 55) * s)}`;
    }
    // 'both': septa in --hl inside the wall, costae in the second colour outside it (step 4, with its key).
    const h = p => (hl === p || (hl === 'both' && p === 'septa') ? ' hl' : hl === 'both' && p === 'costae' ? ' cos' : '');
    const what = hl === 'both' ? ', septa inside the wall and costae outside it highlighted' : hl ? ', ' + hl + ' highlighted' : '';
    return `<svg viewBox="0 0 140 140" class="bxd" role="img" aria-label="One corallite seen from above${what}"><rect class="bg" width="140" height="140"/><path class="ln${h('costae')}" d="${costae}"/><circle class="sk${h('wall')}${hl === 'cup' ? ' hlf' : ''}${hl === 'both' ? ' wb' : ''}" cx="70" cy="70" r="44"/><path class="ln${h('septa')}" d="${septa}"/><circle class="ctr${h('centre')}" cx="70" cy="70" r="7"/></svg>`;
  };
  // The key under the step 4 drawing: the same two colours as the photo's labels.
  const sepKey = () =>
    `<span class="bx-key"><span><i class="sep"></i>septa: inside the wall</span><span><i class="cos"></i>costae: outside it</span></span>`;
  // A polyp in its cup, cut in half: tentacles, mouth, soft body, the stony cup under it.
  const polypSide = () => {
    const tent = [
      [46, 52, 24, 30],
      [56, 48, 42, 20],
      [70, 46, 70, 17],
      [84, 48, 98, 20],
      [94, 52, 116, 30]
    ]
      .map(
        ([x1, y1, x2, y2]) =>
          `<path class="tn" d="M${x1} ${y1}Q${(x1 + x2) / 2} ${y1 - 6} ${x2} ${y2}"/><circle class="tk" cx="${x2}" cy="${y2}" r="3.4"/>`
      )
      .join('');
    // labels sit clear of the tentacles: "tentacles" above the right-hand tips, "mouth" to the right with a leader
    const septa = [52, 61, 70, 79, 88].map(x => `<path class="ln" d="M${x} 124V96"/>`).join('');
    return `<svg viewBox="0 0 140 140" class="bxd" role="img" aria-label="A polyp sitting in its cup, cut in half: tentacles around the mouth, soft body, stony cup below"><rect class="bg" width="140" height="140"/>
      <path class="sk hlf hl" d="M8 136V86q0-8 8-8h22v46h64V78h22q8 0 8 8v50Z"/>${septa}
      <path class="ts" d="M40 124V60q0-10 10-12h40q10 2 10 12v64Z"/>${tent}<ellipse class="mo" cx="70" cy="50" rx="7" ry="3"/>
      <text class="lb" x="138" y="10" text-anchor="end">tentacles</text><text class="lb" x="136" y="72" text-anchor="end">mouth</text><path class="lt" d="M102 66L78 52"/>
      <text class="lb" x="70" y="96" text-anchor="middle">polyp</text><text class="lb hlt" x="70" y="134" text-anchor="middle">stony cup</text></svg>`;
  };
  // A dome colony, and a magnifier on its surface: many cups, one polyp each.
  const colonyZoom = () => {
    let dots = '';
    for (let y = 72; y < 124; y += 10)
      for (let x = 14 + ((y / 10) % 2) * 5; x < 92; x += 10)
        if ((x - 52) ** 2 / 40 ** 2 + (y - 124) ** 2 / 52 ** 2 < 0.9) dots += `<circle class="cr" cx="${x}" cy="${y}" r="2.6"/>`;
    let big = '';
    [
      [104, 32],
      [124, 40],
      [110, 54],
      [128, 62]
    ].forEach(([x, y]) => (big += `<circle class="sk" cx="${x}" cy="${y}" r="7"/><circle class="ctr" cx="${x}" cy="${y}" r="2"/>`));
    return `<svg viewBox="0 0 140 140" class="bxd" role="img" aria-label="A dome-shaped colony covered in small cups; a magnifier shows the cups bigger"><rect class="bg" width="140" height="140"/><path class="sk hlf hl" d="M10 126C10 70 94 70 94 126Z"/>${dots}<path class="lt" d="M70 92L98 66"/><circle class="mag" cx="116" cy="46" r="22"/>${big}<text class="lb" x="52" y="138" text-anchor="middle">one colony</text></svg>`;
  };
  // One septum seen from the side: large teeth on top, then fine saw-like teeth.
  const teethSide = () => {
    const big = Array.from({length: 4}, (_, i) => `L${16 + i * 30} 26L${31 + i * 30} 46`).join('');
    const fine = Array.from({length: 18}, (_, i) => `L${12 + i * 6.6} 94L${15.3 + i * 6.6} 100`).join('');
    return `<svg viewBox="0 0 140 140" class="bxd" role="img" aria-label="Two septa seen from the side: one with large teeth, one with fine saw-like teeth"><rect class="bg" width="140" height="140"/>
      <path class="sk" d="M6 62V46${big}L130 46V62Z"/><path class="ln hl" d="M6 46${big}L130 46"/><text class="lb" x="70" y="76" text-anchor="middle">large teeth</text>
      <path class="sk" d="M6 116V100${fine}L130 100V116Z"/><path class="ln hl" d="M6 100${fine}L130 100"/><text class="lb" x="70" y="132" text-anchor="middle">fine, saw-like</text></svg>`;
  };
  // How cups sit together: their own walls with a gap, one shared wall, or valleys.
  const wallsDraw = kind => {
    let s = '';
    if (kind === 'separate') {
      s += `<rect class="gap hl" width="140" height="140"/>`;
      [
        [30, 30],
        [80, 26],
        [124, 44],
        [52, 74],
        [102, 92],
        [24, 116],
        [70, 122]
      ].forEach(([x, y]) => (s += `<circle class="sk" cx="${x}" cy="${y}" r="17"/><circle class="ctr" cx="${x}" cy="${y}" r="3"/>`));
    } else if (kind === 'shared') {
      const r = 20,
        h = r * Math.sqrt(3);
      let d = '';
      for (let i = -1; i < 6; i++)
        for (let j = -1; j < 6; j++) {
          const cx = i * r * 1.5,
            cy = j * h + (i % 2 ? h / 2 : 0);
          d += `M${Array.from({length: 6}, (_, k) => P(cx + r * Math.cos((k * Math.PI) / 3), cy + r * Math.sin((k * Math.PI) / 3))).join('L')}Z`;
          s += `<circle class="ctr" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3"/>`;
        }
      s = `<rect class="cupf" width="140" height="140"/><path class="wl hl" d="${d}"/>` + s;
    } else if (kind === 'nowall') {
      // No wall: from each centre the lines run on until they meet the lines of the next centre.
      const C = [
        [26, 24],
        [84, 16],
        [130, 50],
        [56, 72],
        [108, 104],
        [18, 118],
        [70, 132]
      ];
      let d = '';
      C.forEach(([x, y]) => {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * 2 * Math.PI,
            c = Math.cos(a),
            sn = Math.sin(a);
          let L = 60;
          C.forEach(([x2, y2]) => {
            const dot = (x2 - x) * c + (y2 - y) * sn;
            if (dot > 0) L = Math.min(L, ((x2 - x) ** 2 + (y2 - y) ** 2) / 2 / dot);
          });
          d += `M${P(x + 4 * c, y + 4 * sn)}L${P(x + L * c, y + L * sn)}`;
        }
      });
      s = `<rect class="cupf" width="140" height="140"/><path class="wl hl" d="${d}"/>${C.map(([x, y]) => `<circle class="ctr" cx="${x}" cy="${y}" r="3"/>`).join('')}`;
    } else {
      let d = '',
        m = '';
      for (let k = 0; k < 5; k++) {
        const y0 = 6 + k * 32;
        d += `M-4 ${y0}C30 ${y0 - 14} 50 ${y0 + 14} 76 ${y0}S120 ${y0 - 14} 146 ${y0}`;
        if (k < 4)
          [24, 70, 116].forEach((x, i) => (m += `<ellipse class="ctr" cx="${x}" cy="${y0 + 16 + (i % 2 ? 3 : -3)}" rx="4" ry="2.4"/>`));
      }
      s = `<rect class="cupf" width="140" height="140"/><path class="wl hl" d="${d}"/>${m}`;
    }
    return `<svg viewBox="0 0 140 140" class="bxd" role="img" aria-label="${{separate: 'Cups with their own walls and a gap between them', shared: 'Cups sharing their walls, like a honeycomb', valleys: 'Walls as ridges between valleys with several mouths', nowall: 'No walls: lines run from one centre to the next'}[kind]}"><rect class="bg" width="140" height="140"/>${s}</svg>`;
  };

  // The 7 IMR growth forms as simple silhouettes of ours (Pierre, 2026-11-03: the photo thumbnails were too small to
  // read the forms; drawn from the IMR definitions, forms.json "forms", never copied from the lecture slides). 64 x 48,
  // seabed at y 44, in the app's icon style (round strokes, currentColor); the coral is filled with a soft tint.
  const FORM_ICON = {
    // Secondary branches off the first branches.
    B: '<path class="fi-l" d="M32 44V31M32 34 22 24M22 24l-5-10M22 24l5-12M32 31l10-9M42 22l-3-11M42 22l7-8M32 31V18M32 18l-4-9M32 18l4-10"/>',
    // A flat table on one stalk, branching sideways.
    T: '<path class="fi-l" d="M32 44V28"/><path class="fi-f" d="M7 25c8-4 42-4 50 0v3c-8-3-42-3-50 0z"/><path class="fi-l" d="M12 23v-3M19 22v-3M26 21v-3M33 21v-3M40 21v-3M47 22v-3M53 23v-3"/>',
    // A thin layer following the rock under it.
    E: '<path class="fi-r" d="M6 44c2-9 9-14 16-10 5-8 15-9 21-3 6-3 13 1 15 13z"/><path class="fi-t" d="M8 38.5c3-6 9-8 14-5 5-7 14-8 21-2.5 6-3 11 1 12.5 6"/>',
    // Thin leafy plates, upright like petals or lettuce.
    F: '<path class="fi-f" d="M14 44c-6-9-6-21 3-29 3 9 3 20 1 29z"/><path class="fi-f" d="M28 44c-3-12 1-25 12-32 1 11-3 23-7 32z"/><path class="fi-f" d="M40 44c3-8 9-15 18-17-2 8-8 14-12 17z"/>',
    // A dome, as wide as high: boulder or brain coral.
    M: '<path class="fi-f" d="M8 44C8 20 56 20 56 44z"/><path class="fi-d" d="M20 33h.01M28 28h.01M36 28h.01M44 33h.01M32 37h.01M24 39h.01M40 39h.01"/>',
    // Thick columns or lumps, no true branches.
    S: '<path class="fi-f" d="M10 44V30c0-6 9-6 9 0v14zM24 44V20c0-7 10-7 10 0v24zM39 44V27c0-6 9-6 9 0v17zM50 44v-9c0-5 7-5 7 0v9z"/>',
    // One single polyp, a free disc lying on the bottom.
    U: '<ellipse class="fi-f" cx="32" cy="37" rx="23" ry="7"/><path class="fi-l" d="M24 37h16M32 31.5v-.5M32 43v-.5M18 33.5l3 1M46 33.5l-3 1M18 40.5l3-1M46 40.5l-3-1M11 37h3M50 37h3"/>'
  };
  const formIcon = id =>
    `<svg viewBox="0 0 64 48" class="bx-fi" aria-hidden="true"><path class="fi-b" d="M3 44.5h58"/>${FORM_ICON[id] || ''}</svg>`;

  /* ---------- the steps ---------- */
  const HIT = 34; // tap tolerance, in photo pixels (a corallite here is ~90 px across)
  const WALLS = {
    separate: {
      t: 'Separate walls',
      b: 'Separate',
      say: 'Each cup keeps its own wall, with a gap of skeleton between neighbours: the coenosteum.',
      s: PH.cups,
      marks: [
        ['ell', 470, 420, 150, 128],
        ['line', 300, 230, 436, 270]
      ],
      labels: [
        ['own wall', 460, 560],
        ['gap between cups', 250, 214]
      ],
      term: 'Coenosteum'
    },
    shared: {
      t: 'Shared walls',
      b: 'Shared',
      say: 'Neighbouring cups share one wall, like the cells of a honeycomb.',
      s: PH.shared,
      marks: [
        ['dot', 445, 470, 11],
        ['dot', 525, 362, 11],
        ['line', 600, 300, 484, 388]
      ],
      labels: [['one wall, two cups', 640, 270]],
      term: 'Wall'
    },
    valleys: {
      t: 'Valleys',
      b: 'Valleys',
      say: 'Cups merge into long valleys with several mouths in a row, between ridges of wall: the brain corals.',
      s: PH.valleys,
      marks: [],
      labels: [
        ['valley', 562, 252],
        ['wall (ridge)', 300, 104]
      ]
    },
    // IMR's third wall type (Pierre, 2026-11-03): Pavona, whose IMR tip is "smooth, star-like septo-costae between corallites".
    nowall: {
      t: 'Indistinguishable walls',
      b: 'No wall',
      say: 'No wall to see: the lines run straight from one centre to the next (septo-costae).',
      s: PH.nowall,
      marks: [
        ['dot', 478, 578, 10],
        ['dot', 665, 435, 10]
      ],
      labels: [
        ['centre', 478, 625],
        ['centre', 665, 390],
        ['no wall between them', 572, 506]
      ],
      term: 'Septo-costae'
    }
  };
  // The polyp step's photo. Pierre (2026-11-03) first chose Galaxea, a standard coral with its polyps out of their cups,
  // then found it too busy for someone who knows nothing about corals: one large open polyp (Tubastraea, IMR Lecture 6)
  // now shows the mouth and the ring of tentacles at a glance, with no dimming; the cup is in the drawing beside it.
  const POLYP = {
    s: PH.polyp,
    box: [90, 30, 720, 600],
    marks: [
      ['line', 600, 470, 478, 396],
      ['line', 236, 140, 289, 300],
      ['line', 236, 126, 390, 134]
    ],
    labels: [
      ['mouth', 610, 482, 'l'],
      ['tentacles', 236, 126, 'r'],
      ['one polyp', 450, 610]
    ],
    note: 'One polyp, wide open: its mouth in the middle of a ring of tentacles.'
  };
  // The 7 IMR forms (id, name) and 2-3 example photos of each, larger (Pierre, 2026-11-03: "give 2-3 examples on real
  // photos, larger, beautiful photos"). Picked by eye among the game photos of that form (forms.json / curation.json
  // "gf"), IMR lecture and Pierre's own photos first (rule 7), different genera when the form has several; the clearest
  // leads, since it is shown largest. Tabulate has two: only Acropora is tabulate on the slate. A photo Pierre later
  // hides or excludes drops out (only photos still in data.json are shown). Never one of the check's photos (FORM_CHECK).
  const FORMS7 = [
    [
      'B',
      'Branching',
      [
        ['Anacropora', 'imrl-p11_i7'],
        ['Stylophora', 'stylophora-wide-745206151'],
        ['Seriatopora', 'seriatopora-wide-746236617']
      ]
    ],
    [
      'T',
      'Tabulate',
      [
        ['Acropora', 'imrl-p8_i7'],
        ['Acropora', 'acropora-wide-745675208']
      ]
    ],
    [
      'E',
      'Encrusting',
      [
        ['Favites', 'favites-wide-746235550'],
        ['Leptoria', 'imrl-p33_i2'],
        ['Cyphastrea', 'cyphastrea-wide-92102963']
      ]
    ],
    [
      'F',
      'Foliose/Plating',
      [
        ['Pectinia', 'imrl-p31_i6'],
        ['Turbinaria', 'turbinaria-wide-745206284'],
        ['Mycedium', 'mycedium-wide-745676611']
      ]
    ],
    [
      'M',
      'Massive',
      [
        ['Diploastrea', 'imrl-p57_i2'],
        ['Astreopora', 'imr-p26_i10'],
        ['Goniastrea', 'goniastrea-wide-746236767']
      ]
    ],
    [
      'S',
      'Submassive',
      [
        ['Pocillopora', 'imr-p12_i9'],
        ['Pavona', 'imrl-p29_i2'],
        ['Porites', 'porites-wide-745676218']
      ]
    ],
    [
      'U',
      'Mushroom',
      [
        ['Danafungia', 'danafungia-wide-746237986'],
        ['Herpolitha', 'imrl-p46_i7'],
        ['Fungia', 'fungia-medium-746236381']
      ]
    ]
  ];
  const known = (g, f) => !!DATA.gen[g] && [...allPhotos(DATA.gen[g]), ...(DATA.course[g] || [])].some(p => p.f === f);
  const FORM_CHECK = [
    ['B', 'Stylophora', 'stylophora-wide-746236515'],
    ['F', 'Montipora', 'montipora-wide-745675047'],
    ['M', 'Platygyra', 'platygyra-wide-745205204'],
    ['S', 'Porites', 'porites-wide-745676146'],
    ['U', 'Danafungia', 'danafungia-medium-746236703'],
    ['E', 'Echinopora', 'echinopora-wide-746236094c']
  ];
  const formDef = id => ((FORMS.forms || []).find(f => f.id === id) || {}).def || '';
  const formSlide = id => ((FORMS.forms || []).find(f => f.id === id) || {}).slide;

  const STEPS = [
    {
      id: 'colony',
      t: 'A coral is a colony',
      fig: () =>
        photo(PH.colony, {
          marks: [
            ['path', 'M165 330C190 230 300 100 430 90S690 150 760 290S850 560 790 600S640 640 560 670S390 680 360 600S170 470 165 330Z']
          ],
          labels: [
            ['one colony', 480, 330],
            ['other corals', 150, 610]
          ],
          zoom: true
        }) + cap(PH.colony),
      draw: colonyZoom,
      say: 'This dome is not a rock. It is one coral colony: thousands of tiny animals, the polyps, living side by side on a stony skeleton they build together.',
      check: {
        type: 'choice',
        q: 'A hard coral colony is…',
        opts: ['A rock covered in algae', 'A kind of plant', 'Many tiny animals living together'],
        a: 2,
        why: 'Each of those tiny animals is a polyp: next step.'
      }
    },
    {
      id: 'polyp',
      t: 'The polyp: one tiny animal',
      term: 'Polyp',
      fig: () =>
        `${photo(POLYP.s, {...POLYP, zoom: true})}${cap(POLYP.s, esc(POLYP.note))}
          <p class="bx-aside">Most corals have far smaller polyps, often pulled in by day; some keep long polyps out by day, like <i>Goniopora</i> (IMR Lecture 6). <button type="button" class="linkish" data-z="1">See it</button></p>`,
      photos: () => [POLYP.s, PH.polypsDay],
      draw: polypSide,
      say: 'A polyp is a soft tube with one mouth in the middle of a ring of tentacles, which catch food. It sits on the stony cup it builds. By day, many corals pull their tentacles in.',
      check: {
        type: 'choice',
        q: 'Where is the polyp’s mouth?',
        opts: ['At the tip of each tentacle', 'In the middle of the ring of tentacles', 'Under the skeleton'],
        a: 1,
        why: 'One mouth, ringed by tentacles.'
      }
    },
    {
      id: 'corallite',
      t: 'The corallite: the polyp’s cup',
      term: 'Corallite',
      fig: () =>
        photo(PH.cups, {
          marks: [['ell', 470, 420, 150, 128]],
          labels: [
            ['one corallite', 460, 262],
            ['= one polyp', 460, 570]
          ],
          zoom: true
        }) + cap(PH.cups),
      draw: () => cupTop('cup'),
      say: 'Under each polyp the coral builds a stony cup: the corallite. When the polyps pull in, these cups are what you see. One cup is one polyp. Check their size: millimetres or centimetres?',
      check: {
        type: 'tap',
        q: 'Tap the centre of one corallite.',
        s: PH.cupsMed,
        box: [250, 380, 460, 340],
        hits: [
          [340, 470],
          [420, 472],
          [495, 457],
          [585, 462],
          [660, 482],
          [340, 555],
          [440, 580],
          [520, 545],
          [597, 527],
          [660, 580],
          [575, 625],
          [485, 662],
          [370, 665]
        ],
        why: 'Each cup with its own ring of blades is one corallite, the home of one polyp.'
      }
    },
    {
      id: 'septa',
      t: 'Septa and costae: blades inside and outside the cup',
      term: 'Septa',
      // Pierre (2026-11-03): the centre label must sit on the centre, the septa label clearly inside the cup, and costae
      // need their own definition and pointer. Every point below was placed on the photo by eye (rule 27d): the mouth in
      // the middle of the cup, a white septum halfway between it and the rim, ridges in the yellow skeleton between two cups.
      fig: () =>
        photo(PH.septa, {
          box: [250, 190, 400, 330],
          marks: [
            ['rim', 431, 394, 108, 89],
            ['line', 300, 482, 426, 401],
            ['line', 560, 440, 482, 374],
            ['line', 610, 236, 566, 288],
            ['dot', 431, 397, 6, 'ctr'],
            ['dot', 480, 372, 7, 'sep'],
            ['dot', 566, 288, 7, 'cos']
          ],
          labels: [
            ['centre', 300, 492],
            ['septa (inside)', 646, 448, 'r', 'sep'],
            ['costae (outside)', 612, 222, 'r', 'cos']
          ],
          zoom: true
        }) + cap(PH.septa, 'the dashed ring is the rim (wall) of one cup'),
      draw: () => cupTop('both') + sepKey(),
      say: 'Inside each cup, thin upright blades run from the rim to the centre, like the spokes of a wheel: the septa.',
      // Costae as a term of its own (Pierre, 2026-11-03: "if you define septa, you must define costae").
      more: [
        [
          'Costae',
          'The same blades where they carry on outside the cup, over the rim and down its outer side. Septa are inside the wall, costae outside it.'
        ]
      ],
      also: ['Costae'],
      check: {
        type: 'draw',
        q: 'In which drawing are the septa highlighted?',
        opts: ['septa', 'costae', 'centre'],
        a: 0,
        why: 'The septa are the blades inside the cup, from the rim to the centre; outside the rim they are costae.'
      }
    },
    {
      id: 'teeth',
      t: 'Septal teeth: fine or large',
      fig: () =>
        `<div class="bx-two">${photo(PH.bigTeeth, {box: [400, 140, 320, 256], marks: [['ell', 560, 240, 44, 40]], labels: [['large teeth', 560, 172]], k: 0, zoom: true})}${photo(PH.fineTeeth, {box: [320, 280, 320, 256], marks: [['ell', 462, 410, 44, 40]], labels: [['fine, saw-like', 462, 330]], k: 1, zoom: true})}</div><figcaption><a href="${genLink('Danafungia')}"><i>Danafungia</i></a> · <a href="${genLink('Fungia')}"><i>Fungia</i></a></figcaption>`,
      draw: teethSide,
      say: 'Seen from the side, the top edge of a septum can carry teeth. Their size helps tell look-alikes apart: Danafungia has large septal teeth, Fungia regular, saw-like ones.',
      src: 'Danafungia “large septal teeth”, Fungia “regular, saw-like septal teeth” (IMR Lecture 6).',
      check: {
        type: 'pick',
        q: 'Which one has large septal teeth?',
        opts: [
          ['Danafungia', 'danafungia-macro-746237943'],
          ['Fungia', 'fungia-macro-746236326']
        ],
        a: 0,
        why: 'Large, jagged teeth on the septa: Danafungia. Fine, regular teeth: Fungia.'
      }
    },
    {
      id: 'walls',
      t: 'Walls: separate, shared, valleys or none',
      term: 'Wall',
      walls: true,
      say: 'Each cup has a wall. Neighbouring cups sit together in one of four ways: look at all four.',
      src: 'IMR Lecture 6: “Read the wall structure: shared, separate, or indistinguishable.”',
      also: ['Coenosteum', 'Septo-costae'],
      check: {
        type: 'photo',
        q: 'How do these cups sit together?',
        opts: ['Separate walls', 'Shared walls', 'Valleys', 'Indistinguishable walls'],
        pool: [
          [0, 'Astreopora', 'astreopora-macro-745206461'],
          [1, 'Porites', 'porites-macro-745675630'],
          [2, 'Platygyra', 'platygyra-macro-745204310'],
          [3, 'Pavona', 'pavona-macro-745206230']
        ],
        why: [
          'Astreopora: separate walls (IMR).',
          'Porites: shared walls in a honeycomb pattern (IMR).',
          'Platygyra: a classic brain coral, valleys between ridges (IMR).',
          'Pavona: smooth, star-like septo-costae between corallites, no clear wall (IMR).'
        ]
      }
    },
    {
      id: 'forms',
      t: 'Growth forms: the colony’s shape',
      forms: true,
      say: 'From a distance, start with the colony’s shape. The IMR course uses 7 growth forms: tap one to see examples. One genus can grow in several shapes, so the shape narrows the search but never decides on its own.',
      check: {
        type: 'form',
        q: 'Which growth form is this colony?'
      }
    }
  ];
  // Glossary words (data.json terms and plain words) → the step that shows them, or a card of Corallite anatomy.
  // The plain line here is used only for words the glossary has no plain sentence for (data.json terms[3] wins).
  const WORDS = [
    ['Colony', 'colony', 'Many polyps living together on one skeleton.'],
    ['Polyp', 'polyp', 'One tiny coral animal: a soft tube, a mouth, a ring of tentacles.'],
    ['Mouth', 'polyp', 'In the middle of the polyp. IMR asks: is it raised or embedded?'],
    ['Corallite', 'corallite', 'The stony cup of one polyp.'],
    ['Septa', 'septa', 'Thin blades inside the cup, from the rim to the centre.'],
    ['Costae', 'septa', 'The same blades, carrying on outside the cup’s wall.'],
    ['Septal teeth', 'teeth', 'Teeth on the top edge of the septa: fine or large.'],
    ['Wall', 'walls', 'The rim around each cup: separate, shared, forming valleys, or not visible at all.'],
    ['Separate walls', 'walls|separate', 'Each cup has its own wall, with a gap between cups.'],
    ['Shared walls', 'walls|shared', 'Neighbouring cups share one wall, like a honeycomb.'],
    ['Coenosteum', 'walls|separate', 'The skeleton in the gap between cups with separate walls.'],
    ['Valleys', 'walls|valleys', 'Cups merged into long rows with several mouths (brain corals).'],
    ['Indistinguishable walls', 'walls|nowall', 'No wall to see: the lines run from one centre to the next.'],
    ['Septo-costae', 'walls|nowall', 'Those lines, running from one centre to the next when there is no wall.'],
    ['Growth form', 'forms', 'The colony’s shape: branching, massive, plating…'],
    ['Paliform lobes', '@con|pali', 'A crown of small knobs around the centre of the cup.'],
    ['Columella', '@con|columella', 'What fills the very centre of the cup.'],
    ['Axial corallite', '@con|axial', 'The cup at the tip of a branch, bigger than the others.'],
    ['Monticules', '@arr|hydno', 'Small cone-shaped mounds of wall between the cups.'],
    ['Verrucae', '', 'Bumps on the branches, bigger than one cup.'],
    ['Hooded corallites', '', 'Cups that face downwards, like a hood.'],
    ['Vesicles', '', 'Grape-like bubbles some corals inflate by day.']
  ];
  // For a link from a glossary popup or quiz feedback: term → route (window.BASICS.route('Septa') = '#basics|septa').
  const routeOf = term => {
    const w = WORDS.find(x => x[0].toLowerCase() === String(term).toLowerCase());
    if (!w || !w[1]) return '';
    return w[1][0] === '@' ? '#lab-anatomy|' + w[1].slice(1) : '#basics|' + w[1];
  };
  // listed: the term is in the Words list (a link there when it has no step of its own).
  window.BASICS = {route: routeOf, listed: term => WORDS.some(x => x[0].toLowerCase() === String(term).toLowerCase())};
  const official = term => (DATA.terms || []).find(x => x[0] === term);
  const KEY = BASICS_KEY; // app.js: 'imr-basics'
  const s0 = id => STEPS.find(s => s.id === id) || {};
  // A step seen (the walls step once its four types are), and the module done once every step is.
  const seenStep = id => {
    const st = store.get(KEY, {}) || {},
      seen = {...(st.seen || {}), [id]: 1},
      fin = st.fin || (STEPS.every(s => seen[s.id]) ? Date.now() : 0);
    store.set(KEY, {...st, seen, ...(fin ? {fin} : {})});
    if (fin && !st.fin && typeof achBasics === 'function') achBasics();
  };

  LAB.add({
    id: 'basics',
    icon: '●',
    title: 'Coral basics',
    blurb: 'New to corals? Seven short steps, from the colony to the parts of a corallite, each on a real photo with one plain sentence.',
    lede: 'For anyone who never had the coral lecture: the words used in the ID tips, one at a time, on real photos (credited in the enlarged view: tap a photo) and simple drawings. Every step is optional; the little check under each one is too. Words lists every term and where it is shown.',
    render(root, ...args) {
      const edit = args.includes('edit'),
        rest = args.filter(x => x !== 'edit'),
        arg = rest[0] || '',
        sfx = edit ? '|edit' : '';
      const st = store.get(KEY, {}) || {},
        done = st.done || {};
      // A term opens its step, and its view of the step when it has one (Septo-costae → walls, No wall).
      const byTerm = WORDS.find(w => w[0].toLowerCase() === decodeURIComponent(arg).toLowerCase() && w[1] && w[1][0] !== '@');
      const [tId, tSub] = byTerm ? byTerm[1].split('|') : [];
      const id = arg === 'words' ? 'words' : STEPS.some(s => s.id === arg) ? arg : tId || st.last || STEPS[0].id;
      const sub = rest[1] || tSub || '';
      if (id !== 'words') {
        store.set(KEY, {...st, last: id});
        if (!s0(id).walls) seenStep(id);
      }
      const steps = `<nav class="bx-steps" aria-label="Steps">${STEPS.map(
        (s, i) =>
          `<a href="#basics|${s.id}${sfx}"${s.id === id ? ' aria-current="step"' : ''}${done[s.id] ? ' class="done"' : ''} title="${esc(s.t)}"><span>${i + 1}</span></a>`
      ).join('')}<a href="#basics|words${sfx}" class="bx-wl"${id === 'words' ? ' aria-current="page"' : ''}>Words</a></nav>`;
      const list = [];
      if (id === 'words') {
        root.innerHTML = `<div class="bx">${steps}<dl class="bx-words">${WORDS.map(([t, r, plain]) => {
          const o = official(t),
            href = routeOf(t);
          return `<div><dt>${href ? `<a href="${href}">${esc(t)}</a>` : esc(t)}${r && r[0] === '@' ? ' <small>Corallite anatomy</small>' : ''}</dt><dd>${esc((o && o[3]) || plain)}${o ? `<small class="bx-off">${esc(o[2])}: “${esc(o[1])}”</small>` : ''}</dd></div>`;
        }).join('')}</dl></div>`;
        return;
      }
      const i = STEPS.findIndex(s => s.id === id),
        s = STEPS[i],
        next = STEPS[i + 1];
      const o = s.term && official(s.term);
      const also = (s.also || [])
        .map(official)
        .filter(Boolean)
        .map(x => `<small class="bx-off"><b>${esc(x[0])}</b> · ${esc(x[2])}: “${esc(x[1])}”</small>`)
        .join('');
      const more = (s.more || []).map(([t, d]) => `<p class="bx-more"><b>${esc(t)}</b>: ${esc(d)}</p>`).join('');
      const nextA = next
        ? `<a class="next" href="#basics|${next.id}${sfx}">Next: ${esc(next.t.split(':')[0])} ›</a>`
        : `<a class="next" href="#basics|words${sfx}">All the words ›</a> <a class="next sec" href="#quiz">Practise ›</a>`;
      root.innerHTML = `<div class="bx">${steps}<div class="bx-lay">
        <figure class="bx-fig">${s.walls ? '' : s.forms ? '' : s.fig()}</figure>
        <div class="bx-side"><h3 class="bx-t"><small>Step ${i + 1} of ${STEPS.length}</small>${esc(s.t)}</h3>
          <div class="bx-say">${s.draw || s.walls ? `<span class="bx-draw">${s.draw ? s.draw() : ''}</span>` : ''}<div class="bx-txt"><p>${esc(s.say)}</p>${more}${s.walls ? '<p class="bx-wsay" aria-live="polite"></p>' : ''}</div></div>
          ${o ? `<small class="bx-off">${esc(o[2])}: “${esc(o[1])}”</small>` : ''}${also}${s.src ? `<small class="bx-off">${esc(s.src)}</small>` : ''}
          <details class="bx-check"${done[s.id] || (s.walls && Object.keys(st.walls || {}).length < Object.keys(WALLS).length) ? '' : ' open'}><summary>Check yourself${done[s.id] ? ' <span class="ok">✓</span>' : ''}</summary><div class="bx-q"></div></details>
          <p class="bx-nav">${nextA}</p></div></div></div>`;
      const fig = root.querySelector('.bx-fig'),
        nav = root.querySelector('.bx-nav');
      const markDone = () => {
        const cur = store.get(KEY, {}) || {};
        store.set(KEY, {...cur, done: {...(cur.done || {}), [s.id]: 1}});
        root.querySelector(`.bx-steps a[href^="#basics|${s.id}"]`).classList.add('done');
      };
      // A teaching photo opens the enlarged view when tapped (Enter or Space from the keyboard): the whole photo, with
      // the step's labels on it and a Labels switch to see it bare (app.js zoom opts.over).
      const wireZoom = () => {
        if (edit) return;
        fig.querySelectorAll('.bx-zoom').forEach(el => {
          el.onclick = e => {
            if (!e.target.closest('a')) zoom(list, Number(el.dataset.k), {over});
          };
          el.onkeydown = e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              el.click();
            }
          };
        });
      };
      // Walls (Pierre, 2026-11-03: "many will look at Separate and move on to step 7 without seeing the other wall
      // types"): the four types one after the other, one photo at a time (a phone keeps the photo, its pointer and the
      // drawing on one screen). Until all four are seen, the step's main button is "Next wall type: …", in the place of
      // "Next: Growth forms", which comes after the fourth; the numbered tabs above the photo show where the player is
      // and which types are seen (✓). Nothing is forced: the step numbers at the top still jump anywhere.
      if (s.walls) {
        const keys = Object.keys(WALLS),
          seen = new Set(Object.keys((store.get(KEY, {}) || {}).walls || {}));
        const show = (k, moved) => {
          const w = WALLS[k],
            j = keys.indexOf(k);
          seen.add(k);
          const cur = store.get(KEY, {}) || {};
          store.set(KEY, {...cur, walls: Object.fromEntries([...seen].map(x => [x, 1]))});
          if (keys.every(x => seen.has(x))) seenStep(s.id);
          fig.innerHTML = `<div class="seg bx-wtabs" role="group" aria-label="Wall types, ${keys.length} to see">${keys
            .map(
              (kk, n) =>
                `<button type="button" data-w="${kk}" aria-pressed="${kk === k}" title="${esc(WALLS[kk].t)}"><b>${n + 1}</b> ${esc(WALLS[kk].b)}${seen.has(kk) && kk !== k ? ' <span class="ok" aria-label="seen">✓</span>' : ''}</button>`
            )
            .join('')}</div>${photo(w.s, {marks: w.marks, labels: w.labels, zoom: true})}${cap(w.s)}`;
          root.querySelector('.bx-draw').innerHTML = wallsDraw(k);
          root.querySelector('.bx-wsay').innerHTML = `<b>${j + 1} of ${keys.length} · ${esc(w.t)}.</b> ${esc(w.say)}`;
          list.length = 0;
          list.push(pobj(w.s));
          fig.querySelectorAll('[data-w]').forEach(b => (b.onclick = () => show(b.dataset.w)));
          wireZoom();
          // The next type not seen yet (in order), else the next step.
          const todo = [...keys.slice(j + 1), ...keys.slice(0, j)].find(x => !seen.has(x));
          // The check (classify a photo into the four types) opens once the four have been seen; until then it stays
          // folded, so on a phone the "Next wall type" button sits right under the explanation.
          if (!todo && !done[s.id] && !fig.dataset.opened) {
            fig.dataset.opened = 1;
            root.querySelector('.bx-check').open = true;
          }
          nav.innerHTML = todo
            ? `<button type="button" class="next bx-wnext" data-wn="${todo}">Next wall type: ${esc(WALLS[todo].b)} ›</button>`
            : nextA;
          const wn = nav.querySelector('[data-wn]');
          if (wn)
            wn.onclick = () => {
              show(wn.dataset.wn, true);
              // From the bottom of a phone screen, back up to the new photo.
              const t = fig.getBoundingClientRect().top;
              if (t < 0 || t > innerHeight * 0.5) fig.scrollIntoView({block: 'start', behavior: 'smooth'});
            };
          if (moved) nav.querySelector('.next').focus({preventScroll: true});
        };
        show(WALLS[sub] ? sub : 'separate');
      } else if (s.forms) {
        // Growth forms (Pierre, 2026-11-03: the photo thumbnails were too small): drawn icons to pick a form, then 2-3
        // large photos of that form, each enlarged with a tap (genus, credit and report in the enlarged view, rule 11).
        const show = k => {
          const [fid, name, ex] = FORMS7[k],
            shown = ex.filter(([g, f]) => known(g, f));
          const L = shown.map(([g, f]) => pobj({g, f}));
          fig.innerHTML = `<div class="bx-forms" role="group" aria-label="The 7 IMR growth forms">${FORMS7.map(
            ([id, nm], j) => `<button type="button" data-f="${j}" aria-pressed="${j === k}">${formIcon(id)}<span>${esc(nm)}</span></button>`
          ).join(
            ''
          )}</div><p class="bx-fdef"><b>${esc(name)}</b> ${esc(formDef(fid))} <small>IMR Lecture 6${formSlide(fid) ? ', slide ' + formSlide(fid) : ''}</small></p>
            <div class="bx-fex n${shown.length}">${shown
              .map(
                ([g, f], j) =>
                  `<figure><button type="button" class="zoom bx-fx" data-x="${j}" aria-label="Enlarge photo: ${esc(g)}, ${esc(name.toLowerCase())}"><img src="${img({f}, j ? 's' : fit(Math.min(innerWidth, 640)))}" alt="${esc(g)}, ${esc(name.toLowerCase())} colony" loading="lazy">${ZOOMI}</button><figcaption><a href="${genLink(g)}"><i>${esc(g)}</i></a></figcaption></figure>`
              )
              .join('')}</div>`;
          fig.querySelectorAll('[data-f]').forEach(b => (b.onclick = () => show(Number(b.dataset.f))));
          fig.querySelectorAll('[data-x]').forEach(b => (b.onclick = () => zoom(L, Number(b.dataset.x))));
        };
        show(0);
      } else {
        if (s.id === 'teeth') list.push(pobj(PH.bigTeeth), pobj(PH.fineTeeth));
        else if (s.photos) list.push(...s.photos().map(pobj));
        else list.push(pobj({colony: PH.colony, corallite: PH.cups, septa: PH.septa}[s.id]));
        fig.querySelectorAll('[data-z]').forEach(b => (b.onclick = () => zoom(list, Number(b.dataset.z), {over})));
        wireZoom();
      }
      if (edit)
        fig.querySelectorAll('.bx-ph').forEach(
          ph =>
            (ph.onclick = e => {
              const r = ph.getBoundingClientRect(),
                vb = ph.querySelector('svg').viewBox.baseVal;
              console.log(
                'xy',
                Math.round(vb.x + ((e.clientX - r.left) / r.width) * vb.width),
                Math.round(vb.y + ((e.clientY - r.top) / r.height) * vb.height)
              );
            })
        );
      ask(root.querySelector('.bx-q'), s.check, markDone, edit, s.id);
    }
  });

  /* ---------- the optional check under each step ---------- */
  // Once answered, every check offers the app's report (rule 11b): the step, the answer given and the photos shown, and
  // its photos open in the enlarged view (with its own report and the credit).
  const rep = ctx => (typeof repBtn === 'function' ? ' ' + repBtn(ctx) : '');
  // Once answered, each check photo also gets the games' clickable source pill (rule 11: photoSrc, app.js; hidden on
  // phones, where the enlarged view carries the source). Never before the answer: it would give the genus away.
  const src = (el, p) => {
    if (el && !el.querySelector('.psrc') && typeof photoSrc === 'function') el.insertAdjacentHTML('beforeend', photoSrc(p));
  };
  const fb = (box, ok, text, ctx) => {
    box.querySelector('.bx-fb').innerHTML =
      `${ok ? '<b class="ok">✓ Yes.</b>' : '<b class="ko">✗ No.</b>'} ${text}${ctx ? `<span class="bx-rep">${rep(ctx)}</span>` : ''}`;
  };
  function ask(box, c, markDone, edit, sid) {
    const m = 'basics-' + sid,
      again = '<button type="button" class="linkish bx-again">Another one</button>';
    if (c.type === 'choice' || c.type === 'draw') {
      box.innerHTML = `<p class="bx-qt">${esc(c.q)}</p><div class="choices${c.type === 'draw' ? ' bx-dch' : ' col'}">${c.opts
        .map((t, j) => `<button type="button" class="choice" data-j="${j}">${c.type === 'draw' ? cupTop(t) : esc(t)}</button>`)
        .join('')}</div><p class="bx-fb" aria-live="polite"></p>`;
      box.querySelectorAll('[data-j]').forEach(
        b =>
          (b.onclick = () => {
            if (box.querySelector('.choice.right')) return;
            const j = Number(b.dataset.j),
              ok = j === c.a;
            box
              .querySelectorAll('[data-j]')
              .forEach(x => x.classList.add(Number(x.dataset.j) === c.a ? 'right' : x === b ? 'wrong' : 'off'));
            fb(box, ok, esc(c.why), {a: c.opts[j], m});
            if (ok) markDone();
          })
      );
    } else if (c.type === 'pick') {
      const opts = shuffle(c.opts.map((o, j) => [...o, j]));
      const shown = opts.map(([g, f]) => pobj({g, f}));
      box.innerHTML = `<p class="bx-qt">${esc(c.q)}</p><div class="bx-pick">${opts
        .map(
          ([g, f, j]) =>
            `<div class="bx-pk"><button type="button" class="choice" data-j="${j}"><img src="${img({f}, 's')}" alt="Septa, close up" loading="lazy"></button></div>`
        )
        .join('')}</div><p class="bx-fb" aria-live="polite"></p>`;
      box.querySelectorAll('[data-j]').forEach(
        (b, k) =>
          (b.onclick = () => {
            // Answered: a photo now opens in the enlarged view, genus and credit shown.
            if (box.querySelector('.choice.right')) return zoom(shown, k);
            const j = Number(b.dataset.j),
              ok = j === c.a;
            box
              .querySelectorAll('[data-j]')
              .forEach(x => x.classList.add(Number(x.dataset.j) === c.a ? 'right' : x === b ? 'wrong' : 'off'));
            box.querySelectorAll('.bx-pk').forEach((w, i) => src(w, shown[i]));
            fb(box, ok, esc(c.why) + ' <span class="note">Tap a photo to enlarge it.</span>', {
              g: c.opts[c.a][0],
              a: c.opts[j][0],
              ph: c.opts.map(o => o[1]),
              m
            });
            if (ok) markDone();
          })
      );
    } else if (c.type === 'tap') {
      box.innerHTML = `<p class="bx-qt">${esc(c.q)}</p>${photo(c.s, {box: c.box, cls: 'bx-tap', k: 9, edit, hits: c.hits})}<p class="bx-fb" aria-live="polite"></p>`;
      const ph = box.querySelector('.bx-ph'),
        taps = ph.querySelector('.bx-taps');
      let right = false;
      ph.onclick = e => {
        if (e.target.closest('.psrc')) return; // the source pill is a link, not a tap on the photo
        const r = ph.getBoundingClientRect(),
          x = c.box[0] + ((e.clientX - r.left) / r.width) * c.box[2],
          y = c.box[1] + ((e.clientY - r.top) / r.height) * c.box[3];
        const [best, d] = c.hits.map(h => [h, Math.hypot(h[0] - x, h[1] - y)]).sort((a, b) => a[1] - b[1])[0];
        if (edit) console.log('tap', Math.round(x), Math.round(y));
        if (d > HIT * 1.9) {
          box.querySelector('.bx-fb').textContent = 'Try nearer the middle of the photo.';
          return;
        }
        const ok = d <= HIT;
        taps.innerHTML = `<circle class="bx-tapm ${ok ? 'ok' : 'ko'}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="10"/>${ok ? '' : `<circle class="bx-ring" cx="${best[0]}" cy="${best[1]}" r="${HIT + 8}"/>`}`;
        if (right) return;
        const ctx = {g: c.s.g, a: `tap ${Math.round(x)},${Math.round(y)}`, ph: [c.s.f], m};
        src(ph, pobj(c.s));
        fb(box, ok, ok ? esc(c.why) : 'That is a wall between cups. The centre of the nearest cup is ringed: try again.', ctx);
        box.querySelector('.bx-fb').insertAdjacentHTML('beforeend', ' <button type="button" class="linkish bx-enl">Enlarge</button>');
        box.querySelector('.bx-enl').onclick = () => zoom([pobj(c.s)], 0);
        if (ok) {
          right = true;
          markDone();
        }
      };
    } else if (c.type === 'photo' || c.type === 'form') {
      const pool = c.type === 'form' ? FORM_CHECK.map(([id, g, f]) => [FORMS7.findIndex(x => x[0] === id), g, f]) : c.pool;
      const names = c.type === 'form' ? FORMS7.map(x => x[1]) : c.opts;
      const [a, g, f] = pick(pool);
      const opts =
        c.type === 'form' ? shuffle([a, ...shuffle(names.map((_, j) => j).filter(j => j !== a)).slice(0, 2)]) : names.map((_, j) => j);
      box.innerHTML = `<p class="bx-qt">${esc(c.q)}</p><div class="bx-cphw"><button type="button" class="bx-cph" aria-label="Enlarge photo"><img src="${img({f}, 'm')}" alt="Photo to classify" loading="lazy"></button></div><div class="choices col">${opts
        .map(j => `<button type="button" class="choice" data-j="${j}">${esc(names[j])}</button>`)
        .join('')}</div><p class="bx-fb" aria-live="polite"></p>`;
      // Before the answer the enlarged view hides the genus (blind), as in the games.
      box.querySelector('.bx-cph').onclick = () => zoom([pobj({g, f})], 0, {blind: () => !box.querySelector('.choice.right')});
      box.querySelectorAll('[data-j]').forEach(
        b =>
          (b.onclick = () => {
            if (box.querySelector('.choice.right')) return;
            const j = Number(b.dataset.j),
              ok = j === a;
            box.querySelectorAll('[data-j]').forEach(x => x.classList.add(Number(x.dataset.j) === a ? 'right' : x === b ? 'wrong' : 'off'));
            const why =
              c.type === 'form'
                ? `<a href="${genLink(g)}"><i>${esc(g)}</i></a>: ${esc(names[a])}. ${esc(formDef(FORMS7[a][0]))}`
                : esc(c.why[a]);
            src(box.querySelector('.bx-cphw'), pobj({g, f}));
            fb(box, ok, why + ' ' + again, {g, a: names[j], ph: [f], m});
            box.querySelector('.bx-again').onclick = () => ask(box, c, markDone, edit, sid);
            if (ok) markDone();
          })
      );
    }
  }
})();

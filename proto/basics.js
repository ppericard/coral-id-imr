// Coral basics: a short guided path for complete beginners (no coral lecture), from the colony down to the corallite and
// back out to the growth forms. One step = one labelled photo (Pierre's own, CC BY) or a drawing of ours, one plain
// sentence and an optional one-question check. Nothing is forced: every step can be skipped, the checks are optional,
// and nothing here is shown to a player who did not open it (IMR RAs stay the main audience, Pierre 2026-11-03).
// Routes: #lab-basics (resume), #lab-basics|<step id>, #lab-basics|<glossary term> (e.g. |Septa), #lab-basics|words.
// Add |edit to print photo coordinates on a tap and show the tap targets (for placing labels).
(() => {
  /* ---------- photos: coordinates are pixels of the 960 px file (w 960, h given), crops are [x, y, w, h] ---------- */
  const PH = {
    colony: {g: 'Diploastrea', f: 'diploastrea-wide-746238202', h: 768},
    // Day-extended polyps: only an aside on the polyp step now (Pierre, 2026-11-03: too special to explain a polyp).
    polypsDay: {g: 'Goniopora', f: 'goniopora-medium-745205676', h: 768},
    galaxea: {g: 'Galaxea', f: 'galaxea-medium-745206102', h: 768},
    nowall: {g: 'Pavona', f: 'pavona-macro-745204888', h: 768},
    cups: {g: 'Dipsastraea', f: 'dipsastraea-macro-746236818', h: 720},
    cupsMed: {g: 'Diploastrea', f: 'diploastrea-medium-746238185', h: 768},
    bigTeeth: {g: 'Danafungia', f: 'danafungia-macro-746236636', h: 720},
    fineTeeth: {g: 'Fungia', f: 'fungia-macro-746236363', h: 720},
    shared: {g: 'Goniastrea', f: 'goniastrea-macro-746237401', h: 768},
    valleys: {g: 'Platygyra', f: 'platygyra-macro-745204314', h: 768}
  };
  // The photo object of data.json (credit, observation) for the enlarged view.
  const pobj = s => {
    const g = DATA.gen[s.g];
    return {...((g && allPhotos(g).find(p => p.f === s.f)) || {f: s.f}), genus: s.g};
  };
  const pctX = (x, b) => (((x - b[0]) / b[2]) * 100).toFixed(2) + '%';
  const pctY = (y, b) => (((y - b[1]) / b[3]) * 100).toFixed(2) + '%';

  // A photo cropped to box b, an SVG layer in the same pixels (marks) and HTML labels (constant text size on any screen).
  // marks: ['ell', cx, cy, rx, ry] (focus: the rest of the photo dims), ['line', x1, y1, x2, y2], ['path', d],
  // ['dot', x, y]; labels: [text, x, y, anchor 'c' | 'l' | 'r'].
  const photo = (s, {box, marks = [], labels = [], cls = '', k = 0, edit = false, hits = []} = {}) => {
    const b = box || [0, 0, 960, s.h];
    const focus = marks.filter(m => m[0] === 'ell');
    const draw = m =>
      m[0] === 'ell'
        ? `<ellipse class="bx-ring" cx="${m[1]}" cy="${m[2]}" rx="${m[3]}" ry="${m[4]}"/>`
        : m[0] === 'line'
          ? `<line class="bx-lead" x1="${m[1]}" y1="${m[2]}" x2="${m[3]}" y2="${m[4]}"/>`
          : m[0] === 'path'
            ? `<path class="bx-out" d="${m[1]}"/>`
            : `<circle class="bx-dot" cx="${m[1]}" cy="${m[2]}" r="${m[3] || 9}"/>`;
    const mask = focus.length
      ? `<mask id="bxm${k}"><rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" fill="#fff"/>${focus.map(m => `<ellipse cx="${m[1]}" cy="${m[2]}" rx="${m[3]}" ry="${m[4]}" fill="#000"/>`).join('')}</mask><rect class="bx-dim" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}" mask="url(#bxm${k})"/>`
      : '';
    return `<div class="bx-ph${cls ? ' ' + cls : ''}" data-k="${k}" style="aspect-ratio:${b[2]} / ${b[3]};--ar:${(b[2] / b[3]).toFixed(4)}">
      <img src="${img({f: s.f}, fit((Math.min(innerWidth, 640) * 960) / b[2]))}" alt="${esc(s.g)}${labels.length ? ', labelled: ' + esc(labels.map(l => l[0]).join(', ')) : ''}" style="width:${((960 / b[2]) * 100).toFixed(2)}%;height:${((s.h / b[3]) * 100).toFixed(2)}%;left:${((-b[0] / b[2]) * 100).toFixed(2)}%;top:${((-b[1] / b[3]) * 100).toFixed(2)}%" draggable="false">
      <svg viewBox="${b.join(' ')}" preserveAspectRatio="none" aria-hidden="true">${mask}${marks.map(draw).join('')}${edit ? hits.map(([x, y]) => `<circle class="bx-hit" cx="${x}" cy="${y}" r="${HIT}"/>`).join('') : ''}<g class="bx-taps"></g></svg>
      ${labels.map(([t, x, y, a = 'c']) => `<span class="bx-lab bx-${a}" style="left:${pctX(x, b)};top:${pctY(y, b)}">${esc(t)}</span>`).join('')}</div>`;
  };
  const cap = (s, k) =>
    `<figcaption><a href="${genLink(s.g)}"><i>${esc(s.g)}</i></a> <button type="button" class="linkish" data-z="${k}">Enlarge</button></figcaption>`;

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
    const h = p => (hl === p ? ' hl' : '');
    return `<svg viewBox="0 0 140 140" class="bxd" role="img" aria-label="One corallite seen from above${hl ? ', ' + hl + ' highlighted' : ''}"><rect class="bg" width="140" height="140"/><path class="ln${h('costae')}" d="${costae}"/><circle class="sk${h('wall')}${hl === 'cup' ? ' hlf' : ''}" cx="70" cy="70" r="44"/><path class="ln${h('septa')}" d="${septa}"/><circle class="ctr${h('centre')}" cx="70" cy="70" r="7"/></svg>`;
  };
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

  /* ---------- the steps ---------- */
  const HIT = 34; // tap tolerance, in photo pixels (a corallite here is ~90 px across)
  const WALLS = {
    separate: {
      t: 'Separate walls',
      b: 'Separate',
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
  // The polyp step's photo (Pierre, 2026-11-03): a standard coral whose polyp clearly comes out of its cup, not a
  // day-extended one. He chose Galaxea among three candidates (Stylophora and a Dipsastraea disc were the others).
  const POLYP = {
    s: PH.galaxea,
    box: [450, 460, 300, 240],
    marks: [
      ['ell', 602, 600, 60, 88],
      ['line', 512, 568, 550, 592],
      ['line', 690, 532, 602, 592]
    ],
    labels: [
      ['one polyp', 602, 488],
      ['tentacles', 490, 560],
      ['mouth', 705, 522]
    ],
    note: 'Each polyp comes out of its own tall cup, tentacles out.'
  };
  const FORMS7 = [
    ['B', 'Branching', 'Acropora', 'acropora-wide-745206089'],
    ['T', 'Tabulate', 'Acropora', 'acropora-wide-745675208'],
    ['E', 'Encrusting', 'Favites', 'favites-wide-746235550'],
    ['F', 'Foliose/Plating', 'Turbinaria', 'turbinaria-wide-745206284'],
    ['M', 'Massive', 'Diploastrea', 'diploastrea-wide-746238202'],
    ['S', 'Submassive', 'Goniastrea', 'goniastrea-wide-746237440'],
    ['U', 'Mushroom', 'Fungia', 'fungia-medium-746236381']
  ];
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
          ]
        }) + cap(PH.colony, 0),
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
      fig: () => {
        const c = POLYP;
        return `${photo(c.s, c)}<figcaption><a href="${genLink(c.s.g)}"><i>${esc(c.s.g)}</i></a> · ${esc(c.note)} <button type="button" class="linkish" data-z="0">Enlarge</button></figcaption>
          <p class="bx-aside">Some corals keep long polyps out by day, like <i>Goniopora</i> (IMR Lecture 6). <button type="button" class="linkish" data-z="1">See it</button></p>`;
      },
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
          ]
        }) + cap(PH.cups, 0),
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
      t: 'Septa: the blades inside the cup',
      term: 'Septa',
      fig: () =>
        photo(PH.cups, {
          box: [280, 255, 380, 304],
          marks: [
            ['line', 610, 300, 562, 398],
            ['line', 340, 520, 486, 440]
          ],
          labels: [
            ['septa', 610, 286],
            ['centre', 330, 532]
          ]
        }) + cap(PH.cups, 0),
      draw: () => cupTop('septa'),
      say: 'Inside each cup, thin upright blades run from the rim to the centre, like the spokes of a wheel: the septa. Where they carry on over the rim, outside the cup, they are called costae.',
      also: ['Costae'],
      check: {
        type: 'draw',
        q: 'In which drawing are the septa highlighted?',
        opts: ['septa', 'wall', 'centre'],
        a: 0,
        why: 'The septa are the blades from the rim to the centre.'
      }
    },
    {
      id: 'teeth',
      t: 'Septal teeth: fine or large',
      fig: () =>
        `<div class="bx-two">${photo(PH.bigTeeth, {box: [400, 140, 320, 256], marks: [['ell', 560, 240, 44, 40]], labels: [['large teeth', 560, 330]], k: 0})}${photo(PH.fineTeeth, {box: [320, 280, 320, 256], marks: [['ell', 462, 410, 44, 40]], labels: [['fine, saw-like', 462, 500]], k: 1})}</div><figcaption><a href="${genLink('Danafungia')}"><i>Danafungia</i></a> · <a href="${genLink('Fungia')}"><i>Fungia</i></a> <button type="button" class="linkish" data-z="0">Enlarge</button></figcaption>`,
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
      say: 'Each cup has a wall. Neighbours keep their own walls with a gap between them, share one wall like a honeycomb, or merge into long valleys with several mouths in a row (brain corals). In some corals you cannot see any wall: the lines run straight from one centre to the next.',
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
      say: 'From a distance, start with the colony’s shape. The IMR course uses 7 growth forms. One genus can grow in several shapes, so the shape narrows the search but never decides on its own.',
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
  // For a link from a glossary popup or quiz feedback: term → route (window.BASICS.route('Septa') = '#lab-basics|septa').
  const routeOf = term => {
    const w = WORDS.find(x => x[0].toLowerCase() === String(term).toLowerCase());
    if (!w || !w[1]) return '';
    return w[1][0] === '@' ? '#lab-anatomy|' + w[1].slice(1) : '#lab-basics|' + w[1];
  };
  window.BASICS = {route: routeOf};
  const official = term => (DATA.terms || []).find(x => x[0] === term);
  const KEY = 'imr-basics';

  LAB.add({
    id: 'basics',
    icon: '●',
    title: 'Coral basics',
    blurb: 'New to corals? Seven short steps, from the colony to the parts of a corallite, each on a real photo with one plain sentence.',
    lede: 'For anyone who never had the coral lecture: the words used in the ID tips, one at a time, on real photos (Pierre Pericard, CC BY) and simple drawings. Every step is optional; the little check under each one is too. Words lists every term and where it is shown.',
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
      if (id !== 'words') store.set(KEY, {...st, last: id});
      const steps = `<nav class="bx-steps" aria-label="Steps">${STEPS.map(
        (s, i) =>
          `<a href="#lab-basics|${s.id}${sfx}"${s.id === id ? ' aria-current="step"' : ''}${done[s.id] ? ' class="done"' : ''} title="${esc(s.t)}"><span>${i + 1}</span></a>`
      ).join('')}<a href="#lab-basics|words${sfx}" class="bx-wl"${id === 'words' ? ' aria-current="page"' : ''}>Words</a></nav>`;
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
      root.innerHTML = `<div class="bx">${steps}<div class="bx-lay">
        <figure class="bx-fig">${s.walls ? '' : s.forms ? '' : s.fig()}</figure>
        <div class="bx-side"><h3 class="bx-t"><small>Step ${i + 1} of ${STEPS.length}</small>${esc(s.t)}</h3>
          <div class="bx-say">${s.draw || s.walls ? `<span class="bx-draw">${s.draw ? s.draw() : ''}</span>` : ''}<p>${esc(s.say)}</p></div>
          ${o ? `<small class="bx-off">${esc(o[2])}: “${esc(o[1])}”</small>` : ''}${also}${s.src ? `<small class="bx-off">${esc(s.src)}</small>` : ''}
          <details class="bx-check"${done[s.id] ? '' : ' open'}><summary>Check yourself${done[s.id] ? ' <span class="ok">✓</span>' : ''}</summary><div class="bx-q"></div></details>
          <p class="bx-nav">${next ? `<a class="next" href="#lab-basics|${next.id}${sfx}">Next: ${esc(next.t.split(':')[0])} ›</a>` : `<a class="next" href="#lab-basics|words${sfx}">All the words ›</a> <a class="next sec" href="#quiz">Practise ›</a>`}</p></div></div></div>`;
      const fig = root.querySelector('.bx-fig');
      const markDone = () => {
        const cur = store.get(KEY, {}) || {};
        store.set(KEY, {...cur, done: {...(cur.done || {}), [s.id]: 1}});
        root.querySelector(`.bx-steps a[href^="#lab-basics|${s.id}"]`).classList.add('done');
      };
      // Walls: one photo at a time behind a Separate | Shared | Valleys switch; the drawing follows.
      if (s.walls) {
        const show = k => {
          const w = WALLS[k];
          fig.innerHTML = `<div class="seg bx-seg" role="group" aria-label="Wall type">${Object.entries(WALLS)
            .map(([kk, x]) => `<button type="button" data-w="${kk}" aria-pressed="${kk === k}" title="${esc(x.t)}">${esc(x.b)}</button>`)
            .join('')}</div>${photo(w.s, {marks: w.marks, labels: w.labels})}${cap(w.s, 0)}`;
          root.querySelector('.bx-draw').innerHTML = wallsDraw(k);
          list.length = 0;
          list.push(pobj(w.s));
          fig.querySelectorAll('[data-w]').forEach(b => (b.onclick = () => show(b.dataset.w)));
          fig.querySelector('[data-z]').onclick = () => zoom(list, 0);
        };
        show(WALLS[sub] ? sub : 'separate');
      } else if (s.forms) {
        const show = k => {
          const f = FORMS7[k];
          fig.innerHTML = `<div class="bx-forms">${FORMS7.map(
            ([id, name, , file], j) =>
              `<button type="button" data-f="${j}" aria-pressed="${j === k}"><img src="${img({f: file}, 's')}" alt="${esc(name)} colony" loading="lazy"><span>${esc(name)}</span></button>`
          ).join(
            ''
          )}</div><p class="bx-fdef"><b>${esc(f[1])}</b> ${esc(formDef(f[0]))} <small>IMR Lecture 6${formSlide(f[0]) ? ', slide ' + formSlide(f[0]) : ''} · <a href="${genLink(f[2])}"><i>${esc(f[2])}</i></a></small></p>`;
          fig.querySelectorAll('[data-f]').forEach(b => (b.onclick = () => show(Number(b.dataset.f))));
        };
        show(0);
      } else {
        if (s.id === 'teeth') list.push(pobj(PH.bigTeeth), pobj(PH.fineTeeth));
        else if (s.photos) list.push(...s.photos().map(pobj));
        else list.push(pobj({colony: PH.colony, corallite: PH.cups, septa: PH.cups}[s.id]));
        fig.querySelectorAll('[data-z]').forEach(b => (b.onclick = () => zoom(list, Number(b.dataset.z))));
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

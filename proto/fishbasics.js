// Fish basics: the fish twin of Coral basics (proto/basics.js, the same engine and screens), a short guided path for
// complete beginners: what to look at first on a reef fish. Body shape first (identification always starts with it;
// docs/FISH_PATH.md), then the identification groups, then the vocabulary: fins (the dorsal fin
// is the second screen of the Fins step), tail shapes, markings and a few key features. One step = a drawing of ours (the part being taught in --hl,
// theme tokens only) or, for the groups, the app's own family photos with their credit; one plain sentence; an optional
// one-question check. Nothing is forced: every step can be skipped, the checks are optional.
// Content: the IMR fish presentation (Lecture 10, Fish Identification: anatomy, tail shapes, markings, the groups as it
// teaches them), its words kept (rule C1); where the slides only show a picture, and for the terms the slides use without
// defining, public references fill in, always named on screen (rule C2). No slide photo is used: none has a credit we can
// show (rule P5: a photo is shown with its credit); the drawings are ours, the photos come from the app's data (the families' covers) with their credit.
// Routes (core.js routeIn, app.js labTool): #fish/learn/basics (resumes at the last step), /<step>, /<step>/<view>,
// /<glossary term>, /words. Done = every step seen (reefid-basics-fish, SUBJECTS basics), which sets the feat _fbasics.
(() => {
  /* ---------- drawings (ours), theme tokens only; the part being taught in --hl ---------- */
  let uid = 0;
  const bgR = vb => {
    const [x, y, w, h] = vb.split(' ');
    return `<rect class="bg" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  };
  const svg = (vb, label, inner, cls = '') =>
    `<svg viewBox="${vb}" class="bxd bxf${cls ? ' ' + cls : ''}" role="img" aria-label="${esc(label)}">${bgR(vb)}${inner}</svg>`;
  // A generic reef fish seen from the side, facing left, in a 320 x 190 box: each part its own path, so one can be taught.
  const G = {
    body: 'M44 96C52 62 92 40 140 40C186 40 214 70 232 88L232 106C214 124 186 150 140 150C92 150 52 130 44 96Z',
    dorsal: 'M88 52C96 26 114 18 134 20C158 22 186 44 210 74Z',
    anal: 'M150 144C158 168 180 172 202 152C208 142 214 130 220 118Z',
    pelvic: 'M104 142C106 164 116 174 128 176C128 162 128 150 126 144Z',
    pectoral: 'M98 94C112 86 134 98 142 120C122 124 104 114 98 104Z',
    caudal: 'M226 86L286 52L268 97L286 142L226 108Z'
  };
  // The fish: hl lists the parts taught (dorsal, anal, pelvic, pectoral, caudal, peduncle); extra is drawn over it (inside
  // the fish's own box); lab the labels in the 360 x 200 frame: [text, x, y, anchor, [leader x1, y1, x2, y2]].
  const fish = ({hl = [], extra = '', lab = [], g = G, name = 'A reef fish', vb = '0 0 360 200'} = {}) => {
    const id = 'fcp' + ++uid,
      f = k => `fn${hl.includes(k) ? ' hl hlf' : ''}`;
    const parts = ['dorsal', 'anal', 'pelvic', 'caudal'].map(k => `<path class="${f(k)}" d="${g[k]}"/>`).join('');
    const ped = hl.includes('peduncle')
      ? `<clipPath id="${id}"><path d="${g.body}"/></clipPath><rect class="hlf" x="204" y="0" width="30" height="190" clip-path="url(#${id})"/><path class="ln hl" d="M204 70V122" stroke-dasharray="4 3"/>`
      : '';
    const labs = lab
      .map(
        ([t, x, y, a = 'middle', l]) =>
          `${l ? `<path class="lt" d="M${l[0]} ${l[1]}L${l[2]} ${l[3]}"/>` : ''}<text class="lb" x="${x}" y="${y}" text-anchor="${a}">${esc(t)}</text>`
      )
      .join('');
    return svg(
      vb,
      name + (hl.length ? ', ' + hl.join(', ') + ' highlighted' : ''),
      `<g transform="translate(14 6)">${parts}<path class="sk" d="${g.body}"/>${ped}<path class="fn${hl.includes('pectoral') ? ' hl hlf' : ''}" d="${g.pectoral}"/><path class="ln" d="M96 62C88 80 88 108 98 128"/><circle class="ey" cx="68" cy="82" r="5.5"/><path class="ln" d="M46 100L58 102"/>${extra}</g>${labs}`,
      vb === '0 0 360 200' ? '' : 'bxz'
    );
  };

  /* Fins: the six parts, then the dorsal fin (one or two) */
  const finsAll = () =>
    fish({
      name: 'A reef fish with its fins named',
      lab: [
        ['dorsal fin', 148, 13, 'middle', [148, 17, 150, 32]],
        ['caudal peduncle', 282, 16, 'middle', [268, 20, 238, 92]],
        ['caudal fin', 306, 44, 'start', [304, 48, 292, 66]],
        ['pectoral fin', 4, 150, 'start', [66, 146, 128, 114]],
        ['pelvic fin', 4, 186, 'start', [66, 182, 126, 176]],
        ['anal fin', 232, 190, 'start', [230, 184, 212, 166]]
      ]
    });
  const finOne = k => fish({hl: [k], name: 'A reef fish'});
  // One dorsal fin along the back, or two with a gap: two small fish.
  const dorsals = () => {
    const mini = (y, d) =>
      `<g transform="translate(-6 ${y}) scale(.58)"><path class="fn" d="${G.anal}"/><path class="fn" d="${G.pelvic}"/><path class="fn" d="${G.caudal}"/>${d.map(p => `<path class="fn hl hlf" d="${p}"/>`).join('')}<path class="sk" d="${G.body}"/><path class="fn" d="${G.pectoral}"/><circle class="ey" cx="68" cy="82" r="6"/></g>`;
    return svg(
      '0 0 360 200',
      'Two fish: one dorsal fin all along the back, and two dorsal fins with a gap between them',
      `${mini(-8, [G.dorsal])}<text class="lb" x="190" y="58" text-anchor="start">one continuous fin</text>${mini(92, [
        'M92 49C98 24 108 20 120 26L128 44Z',
        'M150 42C156 20 180 24 198 58Z'
      ])}<text class="lb" x="190" y="158" text-anchor="start">two fins, set apart</text>`
    );
  };

  /* Body shapes: seven silhouettes in a 160 x 100 box, seabed at y 92 */
  const SHAPE = {
    disc: '<path class="fn" d="M72 12C94 0 120 16 128 42L116 44C106 30 92 18 72 12Z"/><path class="fn" d="M72 88C94 100 120 84 128 58L116 56C106 70 92 82 72 88Z"/><path class="fn" d="M116 44L148 34L148 66L116 56Z"/><path class="sk" d="M14 50C14 26 38 10 66 10C94 10 116 28 118 46V54C116 72 94 90 66 90C38 90 14 74 14 50Z"/><circle class="ey" cx="30" cy="42" r="3.6"/><path class="ln" d="M14 52L9 55"/>',
    oval: '<path class="fn" d="M34 28C44 12 86 10 116 42L104 36C86 26 60 24 34 28Z"/><path class="fn" d="M66 78C78 90 98 88 114 62L102 66C92 76 80 78 66 78Z"/><path class="fn" d="M120 46L148 32L142 51L148 70L120 56Z"/><path class="sk" d="M10 52C12 32 36 22 66 22C92 22 112 36 122 46V56C112 68 92 80 66 80C36 80 12 72 10 52Z"/><circle class="ey" cx="28" cy="46" r="3.6"/>',
    tapered:
      '<path class="fn" d="M50 31C62 18 84 20 100 34Z"/><path class="fn" d="M86 70C94 78 104 76 112 64Z"/><path class="fn" d="M130 47L152 32L146 50L152 68L130 53Z"/><path class="sk" d="M8 50C20 38 50 28 82 28C106 28 120 40 132 48V52C120 60 106 72 82 72C50 72 20 62 8 50Z"/><circle class="ey" cx="26" cy="46" r="3.2"/>',
    heavy:
      '<path class="fn" d="M40 24C54 8 90 10 112 34Z"/><path class="fn" d="M70 82C84 94 106 88 120 66Z"/><path class="fn" d="M130 44C148 36 156 42 154 51C156 60 148 66 130 58Z"/><path class="sk" d="M6 56C6 36 30 20 66 20C100 20 122 36 132 46V56C122 70 100 84 66 84C30 84 6 76 6 56Z"/><path class="ln" d="M7 58C16 64 28 64 34 60"/><circle class="ey" cx="26" cy="42" r="4"/>',
    slender:
      '<path class="fn" d="M62 38C70 28 90 30 98 38Z"/><path class="fn" d="M84 63C92 72 102 70 110 60Z"/><path class="fn" d="M130 48L152 24L142 50L152 76L130 52Z"/><path class="sk" d="M8 50C22 40 54 36 84 36C110 36 124 44 132 48V52C124 56 110 64 84 64C54 64 22 60 8 50Z"/><circle class="ey" cx="24" cy="47" r="3"/>',
    elongate:
      '<path class="fn" d="M36 58C44 48 60 48 66 58Z"/><path class="fn" d="M88 58C96 48 112 49 118 59Z"/><path class="fn" d="M144 62C154 58 158 62 158 66C158 70 154 74 144 72Z"/><path class="sk" d="M4 66C18 58 60 56 100 58C122 59 138 62 146 64V70C138 72 122 74 100 74C60 76 18 74 4 66Z"/><circle class="ey" cx="16" cy="64" r="2.8"/><path class="ln" d="M2 86H158"/>',
    odd: '<path class="fn" d="M112 46L138 38L138 62L112 54Z"/><path class="fn" d="M58 36L64 24L74 36Z"/><path class="fn" d="M60 70L66 80L76 70Z"/><path class="sk" d="M22 36H98a14 14 0 0 1 14 14v8a14 14 0 0 1-14 14H36a14 14 0 0 1-14-14Z"/><circle class="ey" cx="36" cy="48" r="3.6"/><path class="ln" d="M22 56L28 58"/>'
  };
  const shapeSvg = (k, hl = false) =>
    svg('0 0 160 100', 'A ' + k + ' fish silhouette', `<g class="${hl ? 'fhl' : ''}">${SHAPE[k]}</g>`, 'bxs');

  /* Tail shapes: the end of the body and the tail, in a 120 x 100 box */
  const TAIL = {
    deep: 'M20 43L98 8L62 50L98 92L20 57Z',
    notch: 'M20 43L94 20L84 50L94 80L20 57Z',
    square: 'M20 43C60 32 80 30 92 30L92 70C80 70 60 68 20 57Z',
    round: 'M20 43C46 20 90 24 98 50C90 76 46 80 20 57Z',
    point: 'M20 43C50 40 80 45 106 50C80 55 50 60 20 57Z',
    heart: 'M20 43C40 22 70 12 90 16C102 20 102 34 90 44C86 47 82 49 80 50C82 51 86 53 90 56C102 66 102 80 90 84C70 88 40 78 20 57Z'
  };
  const TAIL_NAME = {
    deep: 'a deeply forked tail',
    notch: 'a forked tail with a notch',
    square: 'a square tail',
    round: 'a rounded tail',
    point: 'a pointed tail',
    heart: 'a heart-shaped tail'
  };
  const tailSvg = k =>
    svg(
      '0 0 120 100',
      'The end of a fish with ' + TAIL_NAME[k],
      `<path class="sk" d="M0 40L24 43V57L0 60Z"/><path class="sk hl hlf" d="${TAIL[k]}"/>`,
      'bxt'
    );

  /* Markings: a fish in a 160 x 100 box with the marking in --hl, clipped to the body */
  const MBODY = 'M20 50C24 28 48 18 74 18C100 18 120 34 130 46L130 54C120 66 100 82 74 82C48 82 24 72 20 50Z';
  const MARK = {
    bars: '<rect x="50" y="0" width="10" height="100"/><rect x="74" y="0" width="10" height="100"/><rect x="98" y="0" width="10" height="100"/>',
    stripes:
      '<rect x="0" y="32" width="160" height="6"/><rect x="0" y="47" width="160" height="6"/><rect x="0" y="62" width="160" height="6"/>',
    spots:
      '<circle cx="58" cy="36" r="4.5"/><circle cx="82" cy="34" r="4.5"/><circle cx="104" cy="46" r="4.5"/><circle cx="68" cy="56" r="4.5"/><circle cx="92" cy="62" r="4.5"/><circle cx="52" cy="66" r="4.5"/>',
    saddle: '<path d="M64 0H112L108 34C96 42 80 42 70 34Z"/>',
    eyeband: '<rect x="34" y="0" width="12" height="100"/>'
  };
  const markSvg = k => {
    const id = 'fcm' + ++uid,
      eye = '<circle class="ey" cx="40" cy="46" r="3.6"/>',
      base = `<path class="fn" d="M52 22C60 8 82 6 100 24Z"/><path class="fn" d="M126 44L150 32L144 50L150 68L126 56Z"/><path class="fn" d="M70 78C78 92 92 92 100 74Z"/><path class="sk" d="${MBODY}"/>`;
    if (k === 'false')
      return svg(
        '0 0 160 100',
        'A fish with a false eye near the rear of its dorsal fin, away from its real eye',
        `<path class="fn" d="M52 22C60 8 84 6 110 30Z"/><path class="fn" d="M126 44L150 32L144 50L150 68L126 56Z"/><path class="fn" d="M70 78C78 92 92 92 100 74Z"/><path class="sk" d="${MBODY}"/><circle class="ey" cx="40" cy="46" r="3.6"/><circle class="fl" cx="98" cy="25" r="6.5"/><circle class="ey" cx="98" cy="25" r="2.8"/><text class="lb" x="98" y="12" text-anchor="middle">false eye</text><text class="lb" x="40" y="68" text-anchor="middle">real eye</text><path class="lt" d="M40 62L40 52"/>`,
        'bxs'
      );
    return svg(
      '0 0 160 100',
      'A fish with ' +
        {bars: 'bars', stripes: 'stripes', spots: 'spots', saddle: 'a saddle on its back', eyeband: 'a band through its eye'}[k] +
        ' highlighted',
      `${base}<clipPath id="${id}"><path d="${MBODY}"/></clipPath><g class="mk" clip-path="url(#${id})">${MARK[k]}</g>${eye}`,
      'bxs'
    );
  };

  /* Key features: the generic fish with one detail in --hl */
  const FEAT = {
    scalpel1: () =>
      fish({
        vb: '120 20 240 180',
        name: 'A surgeonfish with one scalpel on the tail base',
        extra:
          '<path class="mk" d="M208 98L228 91L228 98Z"/><circle class="ln hl" cx="220" cy="97" r="17" fill="none" stroke-dasharray="4 3"/>',
        lab: [['one scalpel', 270, 186, 'middle', [268, 176, 236, 116]]]
      }),
    scalpel2: () =>
      fish({
        vb: '120 20 240 180',
        name: 'A unicornfish with two scalpels on the tail base',
        extra:
          '<path class="mk" d="M208 93L228 87L228 93Z"/><path class="mk" d="M208 104L228 98L228 104Z"/><circle class="ln hl" cx="220" cy="97" r="17" fill="none" stroke-dasharray="4 3"/>',
        lab: [['two scalpels', 270, 186, 'middle', [268, 176, 236, 116]]]
      }),
    cover: () =>
      fish({
        vb: '0 20 250 180',
        name: 'An angelfish with a spine on the lower edge of its gill cover',
        extra: '<path class="mk" d="M94 124L128 142L100 134Z"/>',
        lab: [['spine on the gill cover', 8, 190, 'start', [100, 184, 122, 152]]]
      }),
    barbels: () =>
      fish({
        vb: '0 20 250 180',
        name: 'A goatfish with two barbels under its chin',
        extra:
          '<path class="mk bar" d="M54 106C48 116 44 126 38 134M60 108C58 120 56 130 52 140"/><circle class="mk" cx="38" cy="134" r="2.6"/><circle class="mk" cx="52" cy="140" r="2.6"/>',
        lab: [['two barbels', 6, 176, 'start', [50, 172, 52, 150]]]
      }),
    trigger: () =>
      fish({
        name: 'A triggerfish with three spines on its back',
        extra: '<path class="mk bar" d="M96 50L86 18M110 46L108 20M124 44L130 26"/>',
        lab: [['three spines that lock', 150, 12, 'start', [148, 16, 132, 30]]]
      })
  };

  /* ---------- the steps ---------- */
  // The icons of the pickers: the same drawings, small.
  const bxi = (vb, inner) => `<svg viewBox="${vb}" class="bxd bx-pi" aria-hidden="true">${inner}</svg>`;
  const fishIcon = (hl = []) => {
    const f = p => `fn${hl.includes(p) ? ' hl hlf' : ''}`;
    return bxi(
      '0 0 320 190',
      `${['dorsal', 'anal', 'pelvic', 'caudal'].map(p => `<path class="${f(p)}" d="${G[p]}"/>`).join('')}<path class="sk" d="${G.body}"/><path class="${f('pectoral')}" d="${G.pectoral}"/><circle class="ey" cx="68" cy="82" r="7"/>`
    );
  };
  const shapeIcon = k => bxi('0 0 160 100', SHAPE[k]);
  const tailIcon = k => bxi('0 0 120 100', `<path class="sk" d="M0 40L24 43V57L0 60Z"/><path class="sk hl hlf" d="${TAIL[k]}"/>`);
  const markIcon = k => bxi('0 0 160 100', `<path class="sk" d="${MBODY}"/><circle class="ey" cx="40" cy="46" r="3.6"/>` + markIconMark(k));
  const markIconMark = k => {
    const id = 'fci' + ++uid;
    return k === 'false'
      ? '<circle class="fl" cx="98" cy="25" r="8"/><circle class="ey" cx="98" cy="25" r="3"/>'
      : `<clipPath id="${id}"><path d="${MBODY}"/></clipPath><g class="mk" clip-path="url(#${id})">${MARK[k]}</g>`;
  };
  const featIcon = k =>
    bxi(
      '0 0 320 190',
      `<path class="fn" d="${G.dorsal}"/><path class="fn" d="${G.caudal}"/><path class="sk" d="${G.body}"/><circle class="ey" cx="68" cy="82" r="7"/>` +
        {
          scalpel1: '<path class="mk" d="M208 98L238 88L238 98Z"/>',
          scalpel2: '<path class="mk" d="M208 92L238 84L238 92Z"/><path class="mk" d="M208 106L238 98L238 106Z"/>',
          cover: '<path class="mk" d="M92 122L132 146L98 136Z"/>',
          barbels: '<path class="mk bar" d="M54 106C48 120 44 134 36 146M62 110C60 126 56 140 50 152"/>',
          trigger: '<path class="mk bar" d="M96 50L84 14M112 46L110 14M128 44L136 22"/>'
        }[k]
    );

  // The fish's own families in their identification groups: the key's groups that hold families in the game (TREEU.groups,
  // never numbered here), each family with its cover photo, the way the families page shows them (learn.js viewList).
  const groupsShown = () =>
    ((TREEU && TREEU.groups) || []).map(gr => ({gr, units: slateGenera().filter(n => GX(n).group === gr.n)})).filter(x => x.units.length);
  // A group's view and check are the engine's (proto/basics.js BASICS_KIT), in the fish's words.
  const groupView = g =>
    BASICS_KIT.groupView(g, ({gr}) => ({
      name: `${gr.n}. ${gr.title}`,
      short: '',
      icon: `<span class="bx-gn" style="--g:${groupHue(gr.n)}">${gr.n}</span>`,
      say: 'The families the app teaches in this group.'
    }));

  const DECK = 'IMR fish presentation (Lecture 10)';
  // The public references that fill what the slides' text does not define, named on screen (rules C1, C2).
  const GLOS = 'fishIDER glossary (CSIRO, fishider.org/en/glossary)';
  const FINREF = 'Wikipedia, “Fish fin” (en.wikipedia.org)';
  const STEPS = [
    {
      id: 'shape',
      t: 'Start with the body shape',
      term: 'Body shape',
      all: true,
      pick: 'Seven body shapes',
      say: 'To work out the family, always start with the shape of the body. Everything here is a generalisation: nature has exceptions.',
      src: `${DECK}: “Body shape is most important to start to work out the FAMILY”; the names of its groups by shape: Disc-shaped, Small ovals, Large ovals, Sloping heads / tapered bodies, Heavy bodies / large lips, Slender schoolers, Odd-shaped swimmers, Bottom dwellers. The silhouettes are ours.`,
      views: [
        {
          id: 'disc',
          name: 'Disc-shaped',
          icon: shapeIcon('disc'),
          fig: () => shapeSvg('disc', true),
          say: 'Round and flat like a disc: the dorsal, tail and anal fins curve to complete the shape. Often colourful.',
          eg: 'Butterflyfish, angelfish, spadefish.'
        },
        {
          id: 'oval',
          name: 'Ovals',
          icon: shapeIcon('oval'),
          fig: () => shapeSvg('oval', true),
          say: 'An oval body, small or large. The small ovals are the damselfish; the large ovals include the Moorish idol, surgeonfish, unicornfish and rabbitfish.',
          eg: 'Damselfish, Moorish idol, surgeonfish, rabbitfish.'
        },
        {
          id: 'tapered',
          name: 'Tapered',
          icon: shapeIcon('tapered'),
          fig: () => shapeSvg('tapered', true),
          say: 'A bullet shape: thick in the middle, narrow at both ends, with a sloping head.',
          eg: 'Snapper, emperor, bream.'
        },
        {
          id: 'heavy',
          name: 'Heavy bodies',
          icon: shapeIcon('heavy'),
          fig: () => shapeSvg('heavy', true),
          say: 'A heavy body with thick, large lips.',
          eg: 'Groupers, sweetlips.'
        },
        {
          id: 'slender',
          name: 'Slender',
          icon: shapeIcon('slender'),
          fig: () => shapeSvg('slender', true),
          say: 'Slender, torpedo-shaped swimmers that form schools, with a deeply forked tail.',
          eg: 'Fusiliers, anthias.'
        },
        {
          id: 'elongate',
          name: 'Bottom dwellers',
          icon: shapeIcon('elongate'),
          fig: () => shapeSvg('elongate', true),
          say: 'A long body that lives on the bottom, sitting arched (lizardfish) or slouched (sandperch).',
          eg: 'Lizardfish, sandperch.'
        },
        {
          id: 'odd',
          name: 'Odd-shaped',
          icon: shapeIcon('odd'),
          fig: () => shapeSvg('odd', true),
          say: 'Odd-shaped swimmers: a boxy bony shell, a flattened body, feather-like fins. Look for the one feature that stands out.',
          eg: 'Boxfish, goatfish, triggerfish, pufferfish, filefish, lionfish.'
        }
      ],
      get check() {
        return drawCheck(
          'shape',
          'Which silhouette is a disc-shaped fish, like a butterflyfish?',
          ['disc', 'slender', 'elongate'],
          'disc',
          'Round and flat: a disc. Slender is the torpedo of the fusiliers; the bottom dwellers are long.'
        );
      }
    },
    {
      id: 'groups',
      t: 'The identification groups',
      term: 'Identification group',
      all: false,
      pick: 'The identification groups',
      get say() {
        const k = TREEU && TREEU.key;
        return `Fish books sort the reef fish into groups, mostly by body shape. These are the groups of ${k ? k.short : 'the identification key'}, the book the IMR course follows. Tap a group to see its families.`;
      },
      get src() {
        const k = TREEU && TREEU.key;
        return `${k ? 'Identification groups: ' + k.cite + '. ' : ''}${DECK}: the course teaches the families by shape groups.`;
      },
      get views() {
        return groupsShown().map(groupView);
      },
      check: {
        own: (box, E) => groupCheck(box, E)
      }
    },
    {
      id: 'fins',
      t: 'Fins: where they are',
      term: 'Dorsal fin',
      all: true,
      pick: 'Fins',
      say: 'Know the fins and where they sit: you will use them to describe every fish.',
      src: `${DECK}: the pectoral, dorsal, caudal, anal and pelvic fins and the caudal peduncle named on a fish. Where they sit: ${FINREF}; the caudal peduncle, “the posterior part of body between the rear parts of the dorsal and anal fins, and the caudal fin”: ${GLOS}.`,
      views: [
        {
          id: 'places',
          name: 'The fins',
          icon: fishIcon(),
          fig: finsAll,
          say: 'Pectoral fins behind the gills, pelvic fins under the belly, the anal fin behind them, the dorsal fin on the back, and the caudal fin, the tail, on the caudal peduncle, the narrow part of the body before it. Parrotfish and wrasses swim with their pectoral fins, flapping them like a bird.',
          src: `${DECK}: pectoral fins “(flap like a bird)”, parrotfish and wrasses.`
        },
        {
          id: 'dorsal',
          name: 'Dorsal fin',
          icon: fishIcon(['dorsal']),
          fig: dorsals,
          say: 'Look at the dorsal fin: one continuous fin along the back, as in the damselfish, angelfish and rabbitfish, or a first and a second dorsal fin, widely spaced, as the slide of cardinalfish, soldierfish and squirrelfish says.',
          src: `${DECK}: “Continuous dorsal fin”; “Widely spaced primary and secondary dorsal fin”.`
        }
      ],
      get check() {
        return drawCheck(
          'fins',
          'In which drawing is the anal fin highlighted?',
          ['anal', 'pelvic', 'dorsal'],
          'anal',
          'The anal fin is the one behind the belly, in front of the tail. The pelvic fins are under the belly, the dorsal on the back.'
        );
      }
    },
    {
      id: 'tails',
      t: 'Tail shapes',
      term: 'Caudal fin',
      all: true,
      pick: 'Six tail shapes',
      say: 'Tail shapes differ with function. Forked tails usually belong to fish that swim with the tail, up in the water; square or pointed tails to fish that swim mostly with their other fins.',
      src: `${DECK}. Square is “truncate” and a slight notch “emarginate” in other sources: Wikipedia, “Fish fin” and “Glossary of ichthyology” (en.wikipedia.org).`,
      views: [
        {
          id: 'deep',
          name: 'Deeply forked',
          icon: tailIcon('deep'),
          fig: () => tailSvg('deep'),
          say: 'The tail splits in two, deeply: fish that swim up in the water column, above the coral.',
          eg: 'Fusiliers, Chromis.'
        },
        {
          id: 'notch',
          name: 'Notched',
          icon: tailIcon('notch'),
          fig: () => tailSvg('notch'),
          say: 'A notch in the tail: shallow in the snappers, deeper in the emperors.',
          eg: 'Snapper, emperor.'
        },
        {
          id: 'square',
          name: 'Square',
          icon: tailIcon('square'),
          fig: () => tailSvg('square'),
          say: 'A square tail, cut straight across: usually on fish that swim mostly with their other fins.'
        },
        {
          id: 'round',
          name: 'Rounded',
          icon: tailIcon('round'),
          fig: () => tailSvg('round'),
          say: 'A rounded tail, as in Pomacentrus, damselfish that stay close to the bottom.',
          eg: 'Pomacentrus.'
        },
        {
          id: 'point',
          name: 'Pointed',
          icon: tailIcon('point'),
          fig: () => tailSvg('point'),
          say: 'A pointed tail, tapering to a tip: usually on fish that swim mostly with their other fins.'
        },
        {
          id: 'heart',
          name: 'Heart-shaped',
          icon: tailIcon('heart'),
          fig: () => tailSvg('heart'),
          say: 'The IMR course’s heart-shaped tail: two rounded lobes with a notch between them, a good clue to Dascyllus.',
          eg: 'Dascyllus.'
        }
      ],
      get check() {
        return drawCheck(
          'tails',
          'Which tail is heart-shaped?',
          ['heart', 'round', 'deep'],
          'heart',
          'Two rounded lobes with a notch between them: heart-shaped, as in Dascyllus.'
        );
      }
    },
    {
      id: 'marks',
      t: 'Markings and colours',
      term: 'Bar',
      all: true,
      pick: 'Markings',
      say: 'Once the shape and the fins point to a family, look at the markings and the colours. Some of these words overlap: bars may be called stripes.',
      src: `${DECK}: “Some words interchangeable, bars may be stripes”; false eyes “to confuse predators”.`,
      views: [
        {
          id: 'bars',
          name: 'Bars',
          icon: markIcon('bars'),
          fig: () => markSvg('bars'),
          say: 'A bar is a mark that runs up and down the body.',
          src: `${GLOS}: bar, “elongate vertical marking”.`
        },
        {
          id: 'stripes',
          name: 'Stripes',
          icon: markIcon('stripes'),
          fig: () => markSvg('stripes'),
          say: 'A stripe is a line that runs along the body, from head to tail.',
          eg: 'A horizontal line across the body is a clue in the breams.',
          src: `${GLOS}: stripe, “a contrasting longitudinal pattern in the form of a line”. ${DECK}: bream, “horizontal line across body”.`
        },
        {
          id: 'spots',
          name: 'Spots',
          icon: markIcon('spots'),
          fig: () => markSvg('spots'),
          say: 'A spot is a round area of a different colour.',
          src: `${GLOS}: spot, “a regularly shaped or rounded area of a colour different from adjacent areas”.`
        },
        {
          id: 'saddle',
          name: 'Saddle',
          icon: markIcon('saddle'),
          fig: () => markSvg('saddle'),
          say: 'A saddle is a patch across the back, from one side to the other, like the yellow saddle of the Moorish idol.',
          eg: 'Moorish idol.',
          src: `${GLOS}: saddle, “a blotch extending across the dorsal surface from one side to another”. ${DECK}: “Yellow saddle”.`
        },
        {
          id: 'eyeband',
          name: 'Eye band',
          icon: markIcon('eyeband'),
          fig: () => markSvg('eyeband'),
          say: 'A dark band across the eye.',
          eg: 'Butterflyfish, adult spadefish.',
          src: `${DECK}: “Black band covers eyes”.`
        },
        {
          id: 'false',
          name: 'False eye',
          icon: markIcon('false'),
          fig: () => markSvg('false'),
          say: 'A false eye: an eye-like spot, often at the rear of the dorsal fin or on the tail, to confuse predators.',
          src: `${DECK}: false eyes “may be located at rear of dorsal or on the caudal fin”. ${GLOS}: ocellus, “a round eye-like spot or marking with a marginal ring”.`
        }
      ],
      get check() {
        return drawCheck(
          'marks',
          'Which fish has a false eye?',
          ['false', 'eyeband', 'spots'],
          'false',
          'An eye-like spot at the back, away from the real eye: it can fool a predator about which end is the head.'
        );
      }
    },
    {
      id: 'features',
      t: 'One feature to look for',
      term: 'Scalpel',
      all: true,
      pick: 'Key features',
      say: 'Some families carry one feature that settles it. Five that the IMR course points to.',
      src: DECK,
      views: [
        {
          id: 'scalpel1',
          name: 'One scalpel',
          icon: featIcon('scalpel1'),
          fig: FEAT.scalpel1,
          say: 'A scalpel on the caudal peduncle, at the base of the tail. One scalpel: the surgeonfish.',
          eg: 'Surgeonfish.'
        },
        {
          id: 'scalpel2',
          name: 'Two scalpels',
          icon: featIcon('scalpel2'),
          fig: FEAT.scalpel2,
          say: 'Two scalpels on the caudal peduncle: the unicornfish.',
          eg: 'Unicornfish.'
        },
        {
          id: 'cover',
          name: 'Gill-cover spine',
          icon: featIcon('cover'),
          fig: FEAT.cover,
          say: 'A spine on the gill cover, the operculum: the angelfish. Its name, Pomacanthus, is Greek for “cover thorn”.',
          eg: 'Angelfish.',
          src: `${GLOS}: operculum, “the gill cover”.`
        },
        {
          id: 'barbels',
          name: 'Barbels',
          icon: featIcon('barbels'),
          fig: FEAT.barbels,
          say: 'Two barbels under the chin, which search for food.',
          eg: 'Goatfish.',
          src: `${DECK}: “Two chemosensory barbels to search for food”. ${GLOS}: barbel, “an elongate fleshy tentacle-like sensory projection, usually about the mouth”.`
        },
        {
          id: 'trigger',
          name: 'Locking spines',
          icon: featIcon('trigger'),
          fig: FEAT.trigger,
          say: 'Spines on the back that lock in place when the fish is threatened: three in the triggerfish, two in the filefish.',
          eg: 'Triggerfish, filefish.'
        }
      ],
      check: {
        type: 'choice',
        q: 'How many scalpels does a unicornfish have?',
        opts: ['None', 'One', 'Two'],
        a: 2,
        why: 'Two on the caudal peduncle; the surgeonfish has one.'
      }
    }
  ];

  // A check whose options are drawings (the engine's 'draw' type, BASICS_KIT.drawCheck): kind says which drawing
  // (C.drawOpt), the options in a new order each time it is drawn.
  const drawCheck = (...a) => BASICS_KIT.drawCheck(...a);

  /* ---------- the optional check of the groups: a family photo to place in its group ---------- */
  const groupCheck = (box, E) =>
    BASICS_KIT.groupCheck(box, E, {
      groups: groupsShown,
      name: g => `${g.n}. ${g.title}`,
      q: 'Which identification group is this fish in?',
      alt: 'A reef fish to place in its group',
      line: (u, gr) => `${unameT(u)}: group ${gr.n}, ${gr.title}.`
    });

  /* ---------- the words: [term, step or 'step|view', plain line]; the deck's own line where it has one ---------- */
  const WORDS = [
    ['Body shape', 'shape', 'The outline of the fish: the first thing to look at.'],
    ['Disc-shaped', 'shape|disc', 'Round and flat: butterflyfish, angelfish.'],
    ['Oval', 'shape|oval', 'An oval body, small (damselfish) or large (surgeonfish).'],
    ['Tapered', 'shape|tapered', 'Bullet-shaped: thick in the middle, narrow at both ends.'],
    ['Identification group', 'groups', 'A set of families that look alike, as the identification book sorts them.'],
    ['Pectoral fin', 'fins|places', 'The pair of fins behind the gills.'],
    ['Pelvic fin', 'fins|places', 'The pair of fins under the belly.'],
    ['Anal fin', 'fins|places', 'The fin behind the belly, in front of the tail.'],
    ['Dorsal fin', 'fins|dorsal', 'The fin on the back: one, or two set apart.'],
    ['Caudal fin', 'tails', 'The tail.'],
    ['Caudal peduncle', 'fins|places', 'The narrow part of the body just before the tail.'],
    ['Forked tail', 'tails|deep', 'A tail split in two lobes, deeply or with a shallow notch.'],
    ['Square tail', 'tails|square', 'A tail cut straight across (truncate).'],
    ['Rounded tail', 'tails|round', 'A tail with a rounded edge.'],
    ['Pointed tail', 'tails|point', 'A tail tapering to a point.'],
    ['Heart-shaped tail', 'tails|heart', 'Two rounded lobes with a notch between them.'],
    ['Bar', 'marks|bars', 'A band running up and down the body.'],
    ['Band', 'marks|bars', 'Another word for a bar or a stripe: sources differ, so the slides call some of them bars and some stripes.'],
    ['Stripe', 'marks|stripes', 'A band running along the body.'],
    ['Spot', 'marks|spots', 'A round mark.'],
    ['Saddle', 'marks|saddle', 'A patch of colour on the back.'],
    ['Eye band', 'marks|eyeband', 'A dark band across the eye.'],
    ['False eye', 'marks|false', 'An eye-like spot, to confuse predators.'],
    ['Operculum', 'features|cover', 'The gill cover.'],
    ['Scalpel', 'features|scalpel1', 'A sharp spine on the caudal peduncle.'],
    ['Barbels', 'features|barbels', 'Feelers under the chin.'],
    ['Locking spines', 'features|trigger', 'Spines on the back that lock in place.']
  ];
  // The IMR presentation's own lines (verbatim) for the words it uses.
  const OFFICIAL = {
    'Body shape': 'Body shape is most important to start to work out the FAMILY',
    Tapered: 'Tapered body = bullet shape (thick middle, narrow ends)',
    'Pectoral fin': 'Pectoral fins (flap like a bird)',
    'Dorsal fin': 'Continuous dorsal fin',
    'Caudal fin': 'Forked tails usually for fish that swim with their caudal fin & are up in the water column',
    'Heart-shaped tail': 'Heart shaped caudal fins',
    Bar: 'Some words interchangeable, bars may be stripes etc',
    'Eye band': 'Black band covers eyes',
    'False eye': 'False eyes are also common in coral reef fish – may be located at rear of dorsal or on the caudal fin',
    Operculum: '‘Pomacanthus’ is Greek for ‘cover thorn’ (spine on operculum)',
    Scalpel: 'Presence of scalpel on caudal peduncle',
    Barbels: 'Two chemosensory barbels to search for food',
    'Locking spines': '3 Dorsal spine (can lock into place when threatened)'
  };
  // The words the slides' text does not define, from a public reference, named as such (rules C1, C2): [line, source].
  const FISHIDER = 'fishIDER glossary (CSIRO)';
  Object.assign(OFFICIAL, {
    Stripe: ['a contrasting longitudinal pattern in the form of a line', FISHIDER],
    Spot: ['a regularly shaped or rounded area of a colour different from adjacent areas', FISHIDER],
    Saddle: ['a blotch extending across the dorsal surface from one side to another', FISHIDER],
    'Caudal peduncle': ['the posterior part of body between the rear parts of the dorsal and anal fins, and the caudal fin', FISHIDER]
  });
  const wordOf = term => WORDS.find(w => w[0].toLowerCase() === String(term).toLowerCase());
  const C = {
    id: 'fishbasics',
    name: 'Fish basics',
    hub: false,
    steps: STEPS,
    words: WORDS,
    route: term => {
      const w = wordOf(term);
      return w && w[1] ? 'basics|' + w[1] : '';
    },
    official: term => (OFFICIAL[term] ? [term, ...(Array.isArray(OFFICIAL[term]) ? OFFICIAL[term] : [OFFICIAL[term], DECK])] : null),
    key: () => basicsKey(),
    // A drawn option of a check: the silhouette, fin, tail or marking its key names (the step's check says which).
    drawOpt: (t, c) => (({shape: shapeSvg, fins: finOne, tails: tailSvg, marks: markSvg})[c.kind] || (() => ''))(t),
    blurb: 'New to reef fish? Six short steps: the body shape first, then the identification groups, the fins, the tail, the markings.',
    lede: 'For anyone who never had the fish lecture: what to look at first, one thing at a time, on simple drawings and the app’s own photos (credited in the enlarged view: tap a photo). Every step is optional; the little check under each one is too. Words lists every term and where it is shown.'
  };
  // Registered once the engine is there: proto/lab.js retries a failed download later, so the engine can arrive after
  // this file. Checked every 250 ms for up to 5 minutes; registered late, the Lab page on screen is
  // drawn again (lab.js redraws only when its last file is in, which may have been before this registration).
  (function reg(n) {
    if (typeof BASICS !== 'undefined' && BASICS && BASICS.add) {
      BASICS.add(C);
      if (n && LAB.pending === 0 && DATA && isLabHash(hashNow())) route();
    } else if (n < 1200) setTimeout(() => reg(n + 1), 250);
  })(0);
})();

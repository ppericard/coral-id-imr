// Sea slug basics: the sea slugs' twin of Coral basics and Fish basics (proto/basics.js, the same engine and screens), a
// short guided path for complete beginners: the few body parts that tell the sea slug groups apart on a photo. A dorid's
// parts first (rhinophores, gills, mantle, oral tentacles), then the aeolids' cerata, then the other sea slugs' flaps,
// shield and side gill, then the groups of the Learn page with a few of their genera.
// One view = a drawing of ours (the part taught in --hl, theme tokens only) and, under it, the covers of a few genera of
// the game that show it (the Learn tiles' photos, app.js cover, each enlarging with its credit; a genus not in the game
// drops out). One plain sentence each, with its source named on screen (rule C2): the Sea Slug Forum's fact sheets
// (Rudman, Australian Museum) and Wikipedia's "Nudibranch" at a fixed revision, read for this module (REF; the decision
// record lists what was read). Their old names (Notaspidea, Anaspidea) stay theirs: the groups' names are the Learn page's
// (WoRMS, seaslug.json taxa), and no difference is settled here (rule C5). The genera named are the game's (rule C6).
// Routes (core.js routeIn, proto/lab.js labTool): #seaslug/learn/basics (resumes at the last step), /<step>,
// /<step>/<view>, /<word>, /words. Done = every step seen (subjDev 'basics'), which sets the feat _sbasics.
(() => {
  /* ---------- the sources, each read for this module (rule C2) ---------- */
  // A Sea Slug Forum fact sheet: t its full name, s its name after the Forum's (cite groups several under one "Sea Slug
  // Forum"), title its own title.
  const SSF = (code, who, title) => ({
    t: `Sea Slug Forum, ${who}, “${title}”`,
    s: `${who}, “${title}”`,
    title,
    forum: true,
    u: 'https://www.seaslugforum.net/find/' + code
  });
  const REF = {
    rhinonud: SSF('rhinonud', 'Rudman 1999', 'Rhinophore in nudibranchs'),
    headeudo: SSF('headeudo', 'Rudman 1999', 'The nudibranch head'),
    torsion: SSF('torsion', 'Rudman 1998', 'Torsion and detorsion'),
    dorigut: SSF('dorigut', 'Rudman 2000', 'Digestive system of a dorid nudibranch'),
    hexasang: SSF('hexasang', 'Rudman 1999', 'Hexabranchus sanguineus'),
    locomotion: SSF('locomotion', 'Rudman 2001', 'How sea slugs crawl'),
    ceras: SSF('ceras', 'Rudman 1999', 'Cerata (ceras) in aeolids'),
    defcnid: SSF('defcnid', 'Rudman 1998', 'Aeolid cnidosac'),
    anaspidea: SSF('anaspidea', 'Rudman 2004', 'Anaspidea'),
    solarpow: SSF('solarpow', 'Rudman 1998', 'Solar-powered sea slugs'),
    thurline: SSF('thurline', 'Rudman 2001', 'Thuridilla lineolata'),
    chelamoe: SSF('chelamoe', 'Rudman 1998', 'Chelidonura amoena'),
    pleufors: SSF('pleufors', 'Rudman 1999', 'Pleurobranchus forskalii'),
    wpnudi: {
      t: 'Wikipedia, “Nudibranch” (revision 1384921128)',
      title: 'Nudibranch',
      u: 'https://en.wikipedia.org/w/index.php?title=Nudibranch&oldid=1384921128'
    }
  };
  // A source line on screen: the sources' names (the Forum's fact sheets under one "Sea Slug Forum"), then what they say,
  // in a few words or their own (quoted).
  const cite = (...keys) => {
    const F = keys.filter(k => REF[k].forum);
    return [
      ...(F.length ? ['Sea Slug Forum: ' + F.map(k => REF[k].s).join('; ')] : []),
      ...keys.filter(k => !REF[k].forum).map(k => REF[k].t)
    ].join('. ');
  };

  /* ---------- drawings (ours), theme tokens only; the part being taught in --hl ---------- */
  const svg = (vb, label, inner, cls = '') =>
    `<svg viewBox="${vb}" class="bxd bxf bxsl${cls ? ' ' + cls : ''}" role="img" aria-label="${esc(label)}"><rect class="bg" x="0" y="0" width="360" height="200"/>${inner}</svg>`;
  const hl = (on, base) => base + (on ? ' hl hlf' : '');
  const labs = L =>
    L.map(
      ([t, x, y, a = 'middle', l]) =>
        `${l ? `<path class="lt" d="M${l[0]} ${l[1]}L${l[2]} ${l[3]}"/>` : ''}<text class="lb" x="${x}" y="${y}" text-anchor="${a}">${esc(t)}</text>`
    ).join('');
  // A rhinophore: a stalk from its base (x, y) up to h, with its flaps (lamellae) as short lines.
  const rhino = (x, y, h, on, lam = true) =>
    `<path class="${hl(on, 'fn')}" d="M${x - 7} ${y}L${x - 5} ${y - h + 6}C${x - 5} ${y - h} ${x + 5} ${y - h} ${x + 5} ${y - h + 6}L${x + 7} ${y}Z"/>${
      lam
        ? `<path class="ln${on ? ' hl' : ''}" d="${[0.2, 0.32, 0.44, 0.56]
            .map(f => `M${x - 5} ${(y - h + 6 + f * h).toFixed(0)}H${x + 5}`)
            .join('')}"/>`
        : ''
    }`;

  // A dorid seen from the side, facing left: the foot, the mantle over the body, two rhinophores in their sheaths, the
  // gill circlet towards the rear of the back, an oral tentacle under the front. on: the parts taught; side: the gills
  // along the side under the mantle edge instead (Phyllidia).
  const DORID = {
    foot: 'M30 154C30 148 44 146 64 146L298 146C322 146 340 152 344 160C330 164 310 164 296 162L60 162C42 162 30 160 30 154Z',
    mantle: 'M26 148C24 112 60 80 122 72C172 66 232 68 272 82C306 94 326 118 326 146C300 152 60 154 26 148Z',
    oral: 'M34 150L10 156C7 158 9 161 12 161L38 156Z'
  };
  const GILL = [
    [236, 40],
    [250, 28],
    [266, 24],
    [282, 28],
    [296, 40]
  ];
  const doridInner = ({on = [], side = false} = {}) => {
    const has = k => on.includes(k);
    const gills = side
      ? `<path class="ln${has('gills') ? ' hl' : ''}" d="${[70, 100, 130, 160, 190, 220, 250, 280]
          .map(x => `M${x} 149L${x + 4} 145M${x + 6} 149L${x + 10} 145`)
          .join('')}"/>`
      : `<path class="br${has('gills') ? ' hl' : ''}" d="${GILL.map(([x, y]) => `M266 74C${(266 + x) / 2} ${(74 + y) / 2 + 8} ${x} ${y + 8} ${x} ${y}`).join('')}"/>`;
    return `<path class="${hl(has('oral'), 'fn')}" d="${DORID.oral}"/><path class="${hl(has('foot'), 'fn')}" d="${DORID.foot}"/>${side ? '' : gills}<path class="${hl(has('mantle'), 'sk')}" d="${DORID.mantle}"/>${side ? gills : ''}<path class="ln${has('rhino') ? ' hl' : ''}" d="M70 80C74 72 98 70 104 78M94 76C98 68 120 66 124 74"/>${rhino(87, 78, 46, has('rhino'))}${rhino(109, 74, 46, has('rhino'))}`;
  };
  const dorid = (on = [], {side = false, lab = [], name = 'A dorid seen from the side'} = {}) =>
    svg(
      '0 0 360 200',
      name + (on.length ? ', ' + on.map(k => PART[k]).join(', ') + ' highlighted' : ''),
      doridInner({on, side}) + labs(lab)
    );
  const PART = {rhino: 'the rhinophores', gills: 'the gills', mantle: 'the mantle', oral: 'an oral tentacle', foot: 'the foot'};
  const doridParts = () =>
    dorid([], {
      name: 'A dorid with its parts named',
      lab: [
        ['rhinophores', 60, 16, 'middle', [66, 20, 86, 34]],
        ['gills', 318, 16, 'middle', [312, 20, 292, 36]],
        ['mantle', 176, 116],
        ['foot', 236, 190, 'middle', [236, 180, 236, 160]],
        ['oral tentacle', 6, 190, 'start', [30, 180, 20, 160]]
      ]
    });

  // An aeolid seen from the side, facing left: the foot and body, two rhinophores, a long oral tentacle in front, rows of
  // cerata along the back, each with its tip (the cnidosac) as a small cap.
  const CERATA = [110, 128, 146, 164, 182, 200, 218, 236, 254, 272, 290].map((x, i) => [x, 80 + ((i * 7) % 18)]);
  const aeolidInner = ({on = []} = {}) => {
    const has = k => on.includes(k);
    const cer = CERATA.map(
      ([x, top]) =>
        `<path class="${hl(has('cerata'), 'fn')}" d="M${x - 6} 134C${x - 6} 112 ${x - 3} ${top + 10} ${x} ${top}C${x + 3} ${top + 10} ${x + 6} 112 ${x + 6} 134Z"/>`
    ).join('');
    const tips = CERATA.map(
      ([x, top]) => `<circle class="${has('tips') ? 'mk' : 'tp'}" cx="${x}" cy="${top + 4}" r="${has('tips') ? 4 : 3}"/>`
    ).join('');
    return `<path class="${hl(has('oral'), 'fn')}" d="M40 140C28 126 18 112 10 100C8 96 12 94 15 97C24 108 34 122 46 136Z"/>${cer}<path class="${hl(has('foot'), 'sk')}" d="M26 150C26 140 40 134 70 132L290 132C316 134 336 144 344 156C320 158 300 156 280 156L70 158C40 158 26 156 26 150Z"/>${tips}${rhino(64, 134, 50, has('rhino'), false)}${rhino(84, 134, 48, has('rhino'), false)}`;
  };
  const aeolid = (on = [], {lab = [], name = 'An aeolid seen from the side'} = {}) =>
    svg('0 0 360 200', name + (on.length ? ', ' + on.join(', ') + ' highlighted' : ''), aeolidInner({on}) + labs(lab));
  const aeolidParts = () =>
    aeolid([], {
      name: 'An aeolid with its parts named',
      lab: [
        ['rhinophores', 74, 70, 'middle', [74, 74, 72, 88]],
        ['oral tentacle', 6, 84, 'start', [12, 88, 14, 98]],
        ['cerata', 300, 56, 'middle', [292, 60, 282, 80]],
        ['foot', 200, 186, 'middle', [200, 176, 200, 156]]
      ]
    });

  // The other sea slugs, from the side: a sea hare (large flaps over the back, rolled rhinophores, flat oral tentacles), a
  // sacoglossan (flaps along the sides, long rhinophores), a headshield slug (a shield on the head, a second one behind,
  // flaps up the sides) and a side-gilled slug, drawn facing right so that its right side, where its gill is, is the one
  // seen.
  const OTHER = {
    seahare: on =>
      `<path class="${hl(on.includes('oral'), 'fn')}" d="M36 146C22 136 12 124 14 114C26 120 38 130 46 140Z"/><path class="sk" d="M30 152C30 122 70 94 130 86C200 76 280 90 320 122C334 134 340 148 336 158L40 160C32 160 30 156 30 152Z"/><path class="${hl(on.includes('para'), 'fn')}" d="M118 100C146 50 258 40 306 98C276 80 160 82 118 100Z"/><path class="${hl(on.includes('rhino'), 'fn')}" d="M76 94C68 72 74 54 90 46C94 62 92 78 86 96Z"/><path class="${hl(on.includes('rhino'), 'fn')}" d="M96 90C94 68 104 52 120 48C120 66 114 80 106 92Z"/>`,
    saco: on =>
      `<path class="sk" d="M24 150C26 138 50 132 80 132L300 134C324 136 340 146 342 154C320 158 80 158 40 158C28 158 24 156 24 150Z"/><path class="${hl(on.includes('para'), 'fn')}" d="M90 136C110 88 236 80 292 136C258 116 132 116 90 136Z"/><path class="${hl(on.includes('rhino'), 'fn')}" d="M48 134C42 112 36 96 30 84C29 80 34 78 36 82C44 96 52 112 58 132Z"/><path class="${hl(on.includes('rhino'), 'fn')}" d="M62 134C60 112 58 96 56 82C56 78 61 77 62 81C66 96 68 112 70 132Z"/>`,
    shield: on =>
      `<path class="sk" d="M24 152C24 142 40 136 70 134L300 136C320 138 332 146 332 154L40 160C30 160 24 158 24 152Z"/><path class="${hl(on.includes('para'), 'fn')}" d="M40 152C100 132 260 132 320 148C260 154 100 156 40 152Z"/><path class="${hl(on.includes('shield'), 'fn')}" d="M28 142C30 116 62 104 120 104L156 106C158 120 156 132 150 138L36 144Z"/><path class="${hl(on.includes('shield'), 'fn')}" d="M162 106C216 100 272 104 302 122L306 140L160 140Z"/><path class="fn" d="M300 124L346 106L326 134Z"/>`,
    side: on =>
      `<g transform="translate(360 0) scale(-1 1)"><path class="${hl(on.includes('foot'), 'fn')}" d="M36 152C36 146 56 144 76 144L300 144C320 144 336 150 340 156C320 162 60 162 40 158Z"/><path class="${hl(on.includes('gill'), 'fn')}" d="M140 146C160 128 220 128 244 146C220 152 160 152 140 146Z"/><path class="ln${on.includes('gill') ? ' hl' : ''}" d="M156 144L160 136M172 145L176 133M188 146L190 132M204 146L206 132M220 145L222 134M234 145L236 138"/><path class="${hl(on.includes('mantle'), 'sk')}" d="M30 142C30 98 90 70 180 70C270 70 330 98 330 140C300 132 260 130 244 140C220 128 160 128 140 140C100 132 50 136 30 142Z"/><path class="fn" d="M56 92C50 74 54 60 66 54C70 68 68 80 64 94Z"/><path class="fn" d="M72 88C70 70 78 58 90 54C90 68 86 80 80 90Z"/></g>`
  };
  const NAME = {
    seahare: 'A sea hare seen from the side',
    saco: 'A sacoglossan seen from the side',
    shield: 'A headshield slug seen from the side',
    side: 'A side-gilled slug seen from its right side'
  };
  // Their labels (never named LAB: that is proto/lab.js's registry, read by the registration below).
  const LABELS = {
    seahare: [
      ['parapodia', 230, 24, 'middle', [230, 28, 222, 54]],
      ['rhinophores', 72, 26, 'middle', [78, 30, 88, 50]],
      ['oral tentacle', 6, 186, 'start', [24, 176, 22, 130]]
    ],
    saco: [
      ['parapodia', 200, 76, 'middle', [200, 80, 196, 98]],
      ['rhinophores', 20, 66, 'start', [34, 70, 38, 86]]
    ],
    shield: [
      ['headshield', 70, 84, 'middle', [76, 88, 86, 106]],
      ['second shield', 236, 84, 'middle', [236, 88, 232, 106]],
      ['parapodia', 180, 186, 'middle', [180, 176, 180, 148]]
    ],
    side: [
      ['gill, right side', 186, 186, 'middle', [186, 176, 168, 150]],
      ['mantle', 180, 104],
      ['rhinophores', 300, 30, 'middle', [300, 34, 296, 54]]
    ]
  };
  const other = (k, on = [], lab = true) =>
    svg('0 0 360 200', NAME[k] + (on.length ? ', ' + on.join(', ') + ' highlighted' : ''), OTHER[k](on) + (lab ? labs(LABELS[k]) : ''));

  /* ---------- the pickers' icons: the same drawings, small ---------- */
  const bxi = inner => `<svg viewBox="0 0 360 200" class="bxd bx-pi" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    dorid: (on = []) => bxi(doridInner({on})),
    side: (on = []) => bxi(doridInner({on, side: true})),
    aeolid: (on = []) => bxi(aeolidInner({on})),
    other: (k, on = []) => bxi(OTHER[k](on))
  };

  /* ---------- a few genera of the game under a drawing: their covers, enlarging with their credit ---------- */
  // By their names: a genus the game does not hold (or not on this device yet) drops out.
  const unitsNamed = names => {
    const S = slateGenera();
    return names.map(nm => S.find(n => (GX(n) || {}).name === nm)).filter(Boolean);
  };
  // A view's figure: its drawing, then the covers of its genera (gen), in a row of three at most.
  const withPhotos = (draw, gen) => {
    let last = null;
    return {
      fig: () => {
        const U = unitsNamed(gen || []).slice(0, 3);
        last = U.length ? BASICS_KIT.unitFigs(U, 'bx-few') : null;
        return draw() + (last ? last.html : '');
      },
      bind: fig => last && last.bind(fig)
    };
  };
  // A view: its words (v), its drawing and its icon in the picker; the genera's names show under their photos.
  const view = (v, draw, icon) => ({...v, icon, ...withPhotos(draw, v.gen)});

  /* ---------- the groups: the Learn page's (seaslug.json taxa: WoRMS), each with a few of its genera ---------- */
  // Each group's line, matched on its name (data), with its sources; a group with no line here says only what it shows.
  const GROUP = [
    [
      /Doridina/,
      'dorid',
      'The dorids: a circlet of gills on the back. Phyllidia is an exception, its gills along the sides.',
      ['wpnudi', 'torsion']
    ],
    [/Cladobranchia/, 'aeolid', 'The aeolids are in this group: cerata on the back, no gill circlet.', ['torsion', 'ceras']],
    [
      /Sacoglossa/,
      'saco',
      'Sacoglossans suck the sap of the algae they feed on; Thuridilla carries flaps along its sides.',
      ['solarpow', 'thurline']
    ],
    [/Cephalaspidea/, 'shield', 'Chelidonura is here: a shield over its head and a second one behind.', ['chelamoe']],
    [
      /Aplysiida/,
      'seahare',
      'The sea hares: large flaps over the back, rolled rhinophores; they eat algae. The Forum calls them Anaspidea.',
      ['anaspidea']
    ],
    [
      /Pleurobranchida/,
      'side',
      'The side-gilled slugs: the gill on the right side, between the mantle and the foot. The Forum calls them Notaspidea.',
      ['pleufors', 'torsion']
    ]
  ];
  const groupOf = gr => GROUP.find(([re]) => re.test(gr.title));
  const groupIcon = gr => {
    const k = (groupOf(gr) || [])[1];
    return k === 'dorid' ? ICON.dorid() : k === 'aeolid' ? ICON.aeolid() : k ? ICON.other(k) : ICON.dorid();
  };
  const PER_GROUP = 6;
  // The groups of the classification that hold genera of the game, in its order, each with its first genera (the slate's
  // order: circle 1 first); a genus's group is its family's (tg).
  const groupsShown = () => {
    const tx = TREEU && TREEU.taxa;
    if (!tx) return [];
    const tgOf = n => {
      const p = (GX(n) || {}).parent;
      return (p && (GX(p) || {}).tg) || 0;
    };
    return tx.groups.map(gr => ({gr, units: slateGenera().filter(n => tgOf(n) === gr.n)})).filter(x => x.units.length);
  };
  const groupView = g =>
    BASICS_KIT.groupView({gr: g.gr, units: g.units.slice(0, PER_GROUP)}, ({gr}) => {
      const G = groupOf(gr);
      return {
        name: gr.title,
        short: gr.title.split(' · ').pop(),
        icon: groupIcon(gr),
        say: G ? G[2] : 'A few of the genera the app teaches in this group.',
        src: G ? cite(...G[3]) : ''
      };
    });

  /* ---------- the steps ---------- */
  const STEPS = [
    {
      id: 'dorid',
      t: 'A dorid, part by part',
      term: 'Rhinophores',
      all: true,
      pick: 'The parts of a dorid',
      say: 'Nudibranchs come in two main kinds, dorids and aeolids. Start with a dorid: its parts are the words of the ID marks.',
      src: `${cite('wpnudi')}: nudibranchs “commonly divided into two main kinds, dorid and aeolid”.`,
      views: [
        view(
          {
            id: 'parts',
            name: 'The parts',
            say: 'Two rhinophores on the head, the gill plume at the rear of the back, the mantle with its edge, the skirt, and the foot it crawls on.',
            src: `${cite('wpnudi')}: the gill plume “on the posterior part of the body”. ${cite('headeudo')}: the mantle skirt. ${cite('locomotion')}: the foot.`,
            gen: ['Chromodoris', 'Hypselodoris', 'Goniobranchus']
          },
          doridParts,
          ICON.dorid()
        ),
        view(
          {
            id: 'rhino',
            name: 'Rhinophores',
            say: 'The two rhinophores smell the water. Many carry flaps or papillae; most can pull back into a pocket, often ringed by a raised sheath.',
            src: cite('rhinonud'),
            gen: ['Hypselodoris', 'Chromodoris']
          },
          () => dorid(['rhino']),
          ICON.dorid(['rhino'])
        ),
        view(
          {
            id: 'gills',
            name: 'Gills',
            say: 'Dorids carry a circlet of gills on the back, around the anus. Hexabranchus, unusually, cannot pull its gills into a pouch.',
            src: `${cite('torsion', 'dorigut', 'hexasang')}: “the dorid gill circlet”; Hexabranchus: “its gills do not have a gill pouch”.`,
            gen: ['Hexabranchus', 'Hypselodoris']
          },
          () => dorid(['gills']),
          ICON.dorid(['gills'])
        ),
        view(
          {
            id: 'nogill',
            name: 'Gills on the sides',
            say: 'Phyllidia has no gill circlet on the back: its gills sit along each side, between the mantle edge and the foot.',
            src: `${cite('torsion')}: “In Phyllidia there are secondary gills along each side of the body”.`,
            gen: ['Phyllidia']
          },
          () => dorid(['gills'], {side: true, name: 'A dorid with its gills along the side'}),
          ICON.side(['gills'])
        ),
        view(
          {
            id: 'mantle',
            name: 'Mantle',
            say: 'Many dorids carry bumps or pockets on the mantle. Its edge, the mantle skirt, hides the mouth beneath it and partly the oral tentacles.',
            src: `${cite('wpnudi')}: “pockets, bumps, and/or mantle dermal formations”. ${cite('headeudo')}: the mouth “hidden beneath the mantle skirt”.`,
            gen: ['Goniobranchus', 'Chromodoris']
          },
          () => dorid(['mantle']),
          ICON.dorid(['mantle'])
        ),
        view(
          {
            id: 'oral',
            name: 'Oral tentacles',
            say: 'Two oral tentacles, beside the mouth, feel the way by touch. On a dorid the mantle mostly hides them.',
            src: cite('headeudo')
          },
          () => dorid(['oral']),
          ICON.dorid(['oral'])
        )
      ],
      get check() {
        return BASICS_KIT.drawCheck(
          'dorid',
          'In which drawing are the rhinophores highlighted?',
          ['rhino', 'gills', 'oral'],
          'rhino',
          'The rhinophores are the pair on the head. The gills are at the rear of the back; the oral tentacles under the front.'
        );
      }
    },
    {
      id: 'cerata',
      t: 'Cerata: the aeolids',
      term: 'Cerata',
      all: true,
      pick: 'An aeolid',
      say: 'Aeolids have no gill circlet: rows of cerata on the back and sides do the work of gills.',
      src: `${cite('torsion', 'ceras')}: “In aeolids and tritoniids the original gill is lost”; the ceras “has a major function as a gill”.`,
      views: [
        view(
          {
            id: 'aeolid',
            name: 'An aeolid',
            say: 'Rhinophores and head tentacles in front, cerata spread across the back, no mantle, and the foot underneath.',
            src: `${cite('wpnudi')}: aeolids “have cerata (spread across the back)”, “They lack a mantle”; the head tentacles “sensitive to touch, taste, and smell”.`,
            gen: ['Pteraeolidia', 'Phyllodesmium']
          },
          aeolidParts,
          ICON.aeolid()
        ),
        view(
          {
            id: 'cerata',
            name: 'Cerata',
            say: 'Each ceras holds a duct of the digestive gland. Through clear skin its colour shows, and it can change with the food.',
            src: cite('ceras'),
            gen: ['Phyllodesmium', 'Pteraeolidia']
          },
          () => aeolid(['cerata']),
          ICON.aeolid(['cerata'])
        ),
        view(
          {
            id: 'tips',
            name: 'Cnidosac',
            say: 'At the tip of most cerata, a sac keeps the stinging cells of the prey, for defence. Phyllodesmium, a soft-coral eater, has none.',
            src: cite('ceras', 'defcnid')
          },
          () => aeolid(['tips']),
          ICON.aeolid(['tips'])
        )
      ],
      get check() {
        return BASICS_KIT.drawCheck(
          'shape',
          'Which one is an aeolid?',
          ['aeolid', 'dorid', 'seahare'],
          'aeolid',
          'Rows of cerata on the back: an aeolid. The dorid has a gill circlet; the sea hare has large flaps.'
        );
      }
    },
    {
      id: 'others',
      t: 'Flaps, shields and a side gill',
      term: 'Parapodia',
      all: true,
      pick: 'The other sea slugs',
      say: 'Not every sea slug is a nudibranch. On the others, look at the sides, the head and under the mantle.',
      src: `${cite('wpnudi')}: many sea slugs belong to groups “not closely related to nudibranchs”.`,
      views: [
        view(
          {
            id: 'seahare',
            name: 'Sea hare',
            say: 'Two large flaps, the parapodia; a pair of rolled rhinophores; large, flat, rolled oral tentacles. Sea hares eat algae.',
            src: `${cite('anaspidea')}: “a pair of enrolled rhinophores, and large flattened, enrolled oral tentacles”.`,
            gen: ['Aplysia', 'Dolabella', 'Stylocheilus']
          },
          () => other('seahare', ['para']),
          ICON.other('seahare', ['para'])
        ),
        view(
          {
            id: 'saco',
            name: 'Sacoglossan',
            say: 'Sacoglossans suck the sap of algae; some keep its chloroplasts alive in their body. Thuridilla carries parapodia along its sides.',
            src: cite('solarpow', 'thurline'),
            gen: ['Thuridilla', 'Elysia', 'Plakobranchus']
          },
          () => other('saco', ['para']),
          ICON.other('saco', ['para'])
        ),
        view(
          {
            id: 'shield',
            name: 'Headshield',
            say: 'Chelidonura carries a shield over its head, a second shield behind it, and parapodia folding up its sides.',
            src: cite('chelamoe'),
            gen: ['Chelidonura']
          },
          () => other('shield', ['shield']),
          ICON.other('shield', ['shield'])
        ),
        view(
          {
            id: 'side',
            name: 'Side gill',
            say: 'Side-gilled slugs carry their gill on the right side, in the gap between the mantle and the foot.',
            src: `${cite('pleufors', 'torsion')}: the gill “on the right side of the body in the gap between the mantle and the foot”.`,
            gen: ['Pleurobranchus']
          },
          () => other('side', ['gill']),
          ICON.other('side', ['gill'])
        )
      ],
      get check() {
        return BASICS_KIT.drawCheck(
          'other',
          'Which one carries its gill on the side?',
          ['side', 'shield', 'seahare'],
          'side',
          'The side-gilled slug: its gill sits on the right side, under the mantle. The others show a headshield and large flaps.'
        );
      }
    },
    {
      id: 'groups',
      t: 'The groups',
      term: 'Nudibranch',
      all: false,
      pick: 'The groups',
      get say() {
        const tx = TREEU && TREEU.taxa;
        return `The Learn page sorts the genera into the groups of ${tx ? tx.short : 'their classification'}, the nudibranchs first. Tap a group to see a few of its genera.`;
      },
      get src() {
        const tx = TREEU && TREEU.taxa;
        return tx ? 'Groups: ' + tx.cite + '.' : '';
      },
      get views() {
        return groupsShown().map(groupView);
      },
      check: {
        own: (box, E) =>
          BASICS_KIT.groupCheck(box, E, {
            groups: groupsShown,
            name: g => g.title,
            q: 'Which group is this sea slug in?',
            alt: 'A sea slug to place in its group',
            line: (u, gr) => `${unameT(u)}: ${gr.title}.`
          })
      }
    }
  ];

  /* ---------- the words: [term, step or 'step|view', plain line] ---------- */
  const WORDS = [
    ['Nudibranch', 'groups', 'A sea slug of the Nudibranchia: dorids, aeolids and their kin.'],
    ['Dorid', 'dorid', 'A nudibranch with a circlet of gills on its back.'],
    ['Rhinophores', 'dorid|rhino', 'The pair of feelers on the head that smell the water.'],
    ['Sheath', 'dorid|rhino', 'The raised collar around a rhinophore’s pocket.'],
    ['Gill circlet', 'dorid|gills', 'A dorid’s ring of gills on the back, around the anus.'],
    ['Mantle', 'dorid|mantle', 'The top of a dorid, often with bumps; its edge is the skirt.'],
    ['Mantle skirt', 'dorid|mantle', 'The mantle’s edge, hiding the mouth beneath it.'],
    ['Oral tentacles', 'dorid|oral', 'Two feelers beside the mouth, for touch.'],
    ['Foot', 'dorid|parts', 'The muscular sole the slug crawls on.'],
    ['Aeolid', 'cerata', 'A nudibranch with cerata on its back and no gill circlet.'],
    ['Cerata', 'cerata|cerata', 'Outgrowths on an aeolid’s back and sides that work as gills.'],
    ['Cnidosac', 'cerata|tips', 'The sac at a ceras’ tip that keeps its prey’s stinging cells.'],
    ['Parapodia', 'others|seahare', 'Flaps along the sides; on Chelidonura they fold over the back.'],
    ['Sea hare', 'others|seahare', 'An algae eater with large flaps and rolled rhinophores.'],
    ['Sacoglossan', 'others|saco', 'A sea slug that sucks the sap of algae.'],
    ['Headshield', 'others|shield', 'A shield over the head, as on Chelidonura.'],
    ['Side gill', 'others|side', 'A gill on the right side, between the mantle and the foot.']
  ];
  // The sources' own words for a few of them (verbatim): [line, source].
  const OFFICIAL = {
    Nudibranch: ['from the Latin nudus ‘naked’ and the Ancient Greek βράγχια (bránkhia) ‘gills’', REF.wpnudi.t],
    'Gill circlet': ['In dorid nudibranchs, the anus is found in the centre of the gills.', REF.dorigut.t],
    'Oral tentacles': ['They are primarily concerned with touch', REF.headeudo.t],
    Cerata: ['All aeolids have these dorsal and lateral outgrowths of the body.', REF.ceras.t],
    'Side gill': ['as in all notaspids, is found on the right side of the body in the gap between the mantle and the foot', REF.pleufors.t]
  };
  const wordOf = term => WORDS.find(w => w[0].toLowerCase() === String(term).toLowerCase());
  const C = {
    id: 'seaslugbasics',
    name: 'Sea slug basics',
    hub: false,
    steps: STEPS,
    words: WORDS,
    refs: REF,
    route: term => {
      const w = wordOf(term);
      return w && w[1] ? 'basics|' + w[1] : '';
    },
    official: term => (OFFICIAL[term] ? [term, ...OFFICIAL[term]] : null),
    key: () => basicsKey(),
    // A drawn option of a check: a dorid with one part highlighted, a whole sea slug, or one of the other sea slugs.
    drawOpt: (t, c) =>
      c.kind === 'dorid'
        ? dorid([t])
        : c.kind === 'shape'
          ? t === 'aeolid'
            ? aeolid()
            : t === 'dorid'
              ? dorid()
              : other(t, [], false)
          : other(t, [], false),
    blurb: 'New to sea slugs? Four short steps: a dorid part by part, the aeolids’ cerata, the other sea slugs, then the groups.',
    lede: 'For anyone new to sea slugs: the parts their ID marks name, one at a time, on simple drawings and the game’s own photos (credited in the enlarged view: tap a photo). Every step is optional; the little check under each one is too. Words lists every term and where it is shown.'
  };
  // Registered once the engine is there (as Fish basics: proto/lab.js retries a failed download later).
  (function reg(n) {
    if (typeof BASICS !== 'undefined' && BASICS && BASICS.add) {
      BASICS.add(C);
      if (n && LAB.pending === 0 && DATA && isLabHash(hashNow())) route();
    } else if (n < 1200) setTimeout(() => reg(n + 1), 250);
  })(0);
})();

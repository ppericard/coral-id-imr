// Schematic previews for the home page cards: one small drawing per module showing what you do in it.
// 160 × 90 viewBox; colours come from CSS classes in home.css so they follow the light/dark theme.
(function () {
  const R = (x, y, w, h, c = 'l', r = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${c}"/>`;
  const C = (x, y, r, c = 'a') => `<circle cx="${x}" cy="${y}" r="${r}" class="${c}"/>`;
  const L = (x1, y1, x2, y2, c = 's') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;
  const T = (x, y, t, c = 'k', a = 'middle') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${a}">${t}</text>`;
  // A little "photo": a tile filled with corallite rings of a given size.
  const photo = (x, y, w, h, r = 4, c = 'f1') => {
    let s = R(x, y, w, h, c);
    for (let j = y + r + 2; j < y + h - r; j += r * 2.4)
      for (let i = x + r + 2 + (((j - y) / (r * 2.4)) % 2) * r * 1.2; i < x + w - r; i += r * 2.4)
        s += `<circle cx="${i.toFixed(1)}" cy="${j.toFixed(1)}" r="${r}" class="cr"/>`;
    return s;
  };
  const FILL = ['f1', 'f2', 'f3', 'f4', 'f5'];
  const tiles = (cols, rows, x0, y0, w, h, gap, dim = () => false) => {
    let s = '';
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++)
        s += `<g${dim(i, j) ? ' class="dim"' : ''}>${photo(x0 + i * (w + gap), y0 + j * (h + gap), w, h, 2.2, FILL[(i + j * 2) % 5])}</g>`;
    return s;
  };
  const pill = (x, y, w, t, on) => R(x, y, w, 11, on ? 'a' : 'w o', 5.5) + T(x + w / 2, y + 8, t, on ? 'ki' : 'k');
  const ART = {
    genera:
      tiles(5, 2, 8, 10, 26, 26, 4) +
      [0, 1, 2, 3, 4].map(i => R(8 + i * 30, 66, 22, 3, 'm', 1.5) + R(8 + i * 30, 72, 14, 3, 'l', 1.5)).join(''),
    tips: [0, 1, 2]
      .map(
        i =>
          photo(8, 6 + i * 27, 30, 23, 2.4, FILL[i]) +
          C(48, 13 + i * 27, 4, 'a') +
          R(56, 10 + i * 27, 70 - i * 12, 5, 'm', 2.5) +
          R(56, 19 + i * 27, 90 - i * 18, 4, 'l', 2)
      )
      .join(''),
    cmp: photo(10, 12, 60, 60, 6, 'f1') + photo(90, 12, 60, 60, 3, 'f3') + T(80, 47, '≠', 'big') + T(40, 84, 'A') + T(120, 84, 'B'),
    'key-imr':
      R(62, 6, 36, 14, 'a', 4) +
      T(80, 16, '?', 'ki') +
      [24, 80, 136]
        .map(
          (x, i) =>
            L(80, 20, x, 40) +
            R(x - 16, 40, 32, 12, 'w o', 4) +
            [-10, 0, 10].map(d => L(x, 52, x + d, 66) + C(x + d, 72, 5, FILL[(i * 3 + d / 10 + 1) % 5])).join('')
        )
        .join(''),
    key:
      `<path d="M18 70 L18 40 M18 52 L10 34 M18 48 L27 30 M18 60 L28 46" class="sw"/><path d="M48 70 Q62 30 76 70 Z" class="f2"/><path d="M90 66 Q110 58 130 66 L130 70 L90 70 Z" class="f3"/>` +
      C(146, 62, 7, 'f4') +
      L(4, 74, 156, 74) +
      T(80, 86, 'branching · massive · plate · free', 'k'),
    'key-tr':
      pill(6, 6, 34, '< 2 mm', 1) +
      pill(44, 6, 40, 'separate', 1) +
      pill(88, 6, 32, 'valleys', 0) +
      pill(124, 6, 30, 'tubes', 0) +
      tiles(6, 2, 6, 24, 22, 28, 3, (i, j) => (i + j * 3) % 3 !== 0),
    elim:
      [0, 1, 2, 3].map(j => pill(4, 8 + j * 15, 34, ['size', 'walls', 'septa', 'detail'][j], j < 2)).join('') +
      tiles(6, 4, 44, 6, 17, 17, 2, (i, j) => !((i === 1 && j === 0) || (i === 4 && j === 2) || (i === 2 && j === 3))),
    matrix: (() => {
      let s = '';
      for (let j = 0; j < 7; j++) {
        s += R(6, 10 + j * 11, 30, 4, j === 3 ? 'a' : 'm', 2);
        for (let i = 0; i < 11; i++)
          if ((i * 7 + j * 3) % 4 === 0 || (i + j) % 5 === 0) s += C(48 + i * 10, 12 + j * 11, 3, j === 3 ? 'a' : 'm');
      }
      return s + R(4, 41, 152, 9, 'hl', 3);
    })(),
    map: (() => {
      let s = C(80, 45, 11, 'a') + T(80, 48, '39', 'ki');
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2,
          g = Math.floor(i / 4),
          x = 80 + Math.cos(a) * 36,
          y = 45 + Math.sin(a) * 36 * 0.95;
        s = L(80, 45, x, y) + s + C(x, y, 5, FILL[g]);
      }
      return s;
    })(),
    web: (() => {
      const P = [
        [22, 20],
        [50, 14],
        [40, 42],
        [70, 36],
        [98, 18],
        [120, 34],
        [92, 58],
        [134, 64],
        [60, 70],
        [26, 66],
        [146, 16],
        [110, 80]
      ];
      const E = [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [3, 6],
        [6, 7],
        [5, 7],
        [2, 8],
        [8, 9],
        [2, 9],
        [4, 10],
        [5, 10],
        [6, 11],
        [7, 11]
      ];
      return (
        E.map(([a, b]) => L(...P[a], ...P[b])).join('') +
        P.map(([x, y], i) => C(x, y, 6, FILL[i % 5]) + `<circle cx="${x}" cy="${y}" r="6" class="cr"/>`).join('')
      );
    })(),
    size:
      L(10, 62, 150, 62, 'sw') +
      [0, 1, 2, 3, 4, 5, 6].map(i => L(10 + i * 23.3, 58, 10 + i * 23.3, 66)).join('') +
      [
        [22, 2],
        [40, 3],
        [62, 5],
        [88, 7],
        [120, 10]
      ]
        .map(([x, r], i) => C(x, 44 - r, r, FILL[i]))
        .join('') +
      L(74, 14, 74, 72, 'mark') +
      T(10, 80, '1 mm', 'k', 'start') +
      T(150, 80, '20 mm', 'k', 'end'),
    gallery:
      pill(52, 4, 56, 'hooded', 1) +
      [0, 1, 2, 3].map(i => photo(8 + i * 37, 22, 33, 28, 2.6, FILL[i]) + C(37 + i * 37, 26, 4, 'ok')).join('') +
      `<g class="dim">${[0, 1].map(i => photo(45 + i * 37, 58, 33, 28, 2.6, FILL[i + 3])).join('')}</g>` +
      T(22, 76, 'look-', 'k') +
      T(22, 84, 'alikes', 'k'),
    anatomy:
      C(62, 45, 32, 'f1') +
      C(62, 45, 32, 'wall') +
      Array.from({length: 16}, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return L(
          62 + Math.cos(a) * 31,
          45 + Math.sin(a) * 31,
          62 + Math.cos(a) * (i % 2 ? 20 : 10),
          45 + Math.sin(a) * (i % 2 ? 20 : 10),
          'sep'
        );
      }).join('') +
      C(62, 45, 6, 'a') +
      L(96, 18, 112, 18) +
      T(114, 21, 'wall', 'k', 'start') +
      L(86, 40, 112, 44) +
      T(114, 47, 'septa', 'k', 'start') +
      L(68, 46, 112, 70) +
      T(114, 73, 'columella', 'k', 'start'),
    quiz:
      photo(8, 8, 74, 74, 4, 'f2') +
      ['Favia', 'Favites', 'Goniastrea', 'Platygyra']
        .map((t, i) => R(90, 10 + i * 19, 62, 15, i === 1 ? 'okb' : 'w o', 4) + T(121, 20 + i * 19, t, 'k'))
        .join(''),
    'quiz-duel':
      photo(8, 8, 62, 56, 3.4, 'f1') +
      photo(90, 8, 62, 56, 5.5, 'f1') +
      T(80, 40, '?', 'big') +
      R(18, 70, 42, 14, 'w o', 4) +
      T(39, 80, 'A', 'k') +
      R(100, 70, 42, 14, 'a', 4) +
      T(121, 80, 'B', 'ki'),
    'quiz-course':
      R(14, 6, 132, 72, 'w o', 4) +
      R(20, 12, 54, 6, 'm', 2) +
      photo(20, 24, 70, 48, 3.5, 'f4') +
      [0, 1, 2].map(i => R(98, 28 + i * 10, 40 - i * 8, 4, 'l', 2)).join('') +
      L(80, 78, 80, 86) +
      L(64, 86, 96, 86),
    pairs: (() => {
      let s = '';
      for (let j = 0; j < 3; j++)
        for (let i = 0; i < 4; i++) {
          const x = 18 + i * 32,
            y = 6 + j * 27;
          s +=
            i === 0 && j === 0
              ? photo(x, y, 28, 23, 2, 'f2')
              : i === 2 && j === 1
                ? photo(x, y, 28, 23, 4, 'f2')
                : R(x, y, 28, 23, 'back', 3);
        }
      return s + `<path d="M46 18 Q90 10 96 34" class="link"/>`;
    })(),
    reveal:
      `<g filter="url(#hblur)">${photo(14, 8, 96, 74, 5, 'f3')}</g>` +
      C(134, 45, 16, 'w') +
      `<circle cx="134" cy="45" r="16" class="cr2"/><path d="M134 29 A16 16 0 0 1 150 45" class="arc"/>` +
      T(134, 49, '7', 'big2'),
    zoom:
      photo(6, 8, 64, 74, 7, 'f5') +
      R(52, 30, 18, 18, 'frame', 1) +
      L(70, 30, 92, 14, 's') +
      L(70, 48, 92, 82, 's') +
      photo(92, 14, 62, 68, 2.4, 'f5') +
      T(38, 88, 'colony', 'k') +
      T(123, 88, 'corallites', 'k'),
    spot:
      photo(8, 8, 90, 74, 4.5, 'f3') +
      C(60, 38, 11, 'target') +
      R(104, 14, 50, 14, 'w o', 4) +
      T(129, 24, 'walls?', 'k') +
      [0, 1, 2].map(i => R(104, 36 + i * 15, 50, 11, i === 0 ? 'a' : 'l', 4)).join('')
  };
  ART.finder = ART.key;
  window.homeArt = id =>
    ART[id]
      ? `<svg viewBox="0 0 160 90" role="img" aria-hidden="true"><defs><filter id="hblur"><feGaussianBlur stdDeviation="3"/></filter></defs>${ART[id]}</svg>`
      : '';
})();

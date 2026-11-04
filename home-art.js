// Schematic drawing of a corallite (wall, septa, columella) beside the "Coral anatomy terms" glossary link (app.js).
// 160 × 90 viewBox; colours come from CSS classes in home.css so they follow the light/dark theme.
// The drawings of the former Home cards were removed on 2026-11-04: nothing showed them any more.
(function () {
  const C = (x, y, r, c = 'a') => `<circle cx="${x}" cy="${y}" r="${r}" class="${c}"/>`;
  const L = (x1, y1, x2, y2, c = 's') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;
  const T = (x, y, t, c = 'k', a = 'middle') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${a}">${t}</text>`;
  const ART = {
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
      T(114, 73, 'columella', 'k', 'start')
  };
  window.homeArt = id => (ART[id] ? `<svg viewBox="0 0 160 90" role="img" aria-hidden="true">${ART[id]}</svg>` : '');
})();

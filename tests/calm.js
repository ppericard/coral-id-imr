// Playwright's chromium for the smoke tests, with every context opened under prefers-reduced-motion: reduce unless it asks
// for something else (test-suite review P10, 2026-11-04, approved by Pierre): no entrance animation to wait for or to finish
// by hand, fewer frames to draw on a machine several sessions share (a boot measured about 0.30 CPU-s instead of 0.43).
// A check about motion passes reducedMotion itself: the right-answer celebration in pages.smoke.js (both values), and the
// brand-new player (newPlayer), who plays as a phone with no setting does. Tools that measure (tools/perf.js...) keep
// Playwright as it is.
const pw = require('playwright');
const calm = b => {
  const nc = b.newContext.bind(b);
  b.newContext = (o = {}) => nc({reducedMotion: 'reduce', ...o});
  return b;
};
module.exports = {...pw, chromium: {launch: async (...a) => calm(await pw.chromium.launch(...a))}};

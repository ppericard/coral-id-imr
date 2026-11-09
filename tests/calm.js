// Playwright's chromium for the smoke tests, with every context opened under prefers-reduced-motion: reduce unless it asks
// for something else (test-suite review P10, 2026-11-04, approved by Pierre): no entrance animation to wait for or to finish
// by hand, fewer frames to draw on a machine several sessions share (a boot measured about 0.30 CPU-s instead of 0.43).
// A check about motion passes reducedMotion itself: the right-answer celebration in pages.smoke.js (both values), and the
// brand-new player (newPlayer), who plays as a phone with no setting does. Tools that measure (tools/perf.js...) keep
// Playwright as it is. Every launch takes the machine slot first (tests/slot.js, rule W24): a smoke that forgot to call
// slot() still waits its turn; one that did runs in its own slot at once.
const path = require('path'),
  fs = require('fs'),
  {execFileSync} = require('child_process'),
  pw = require('playwright'),
  slot = require('./slot.js');
// The players' copy of the curation (curation-play.json, which the deploy writes: tools/curplay.py), written here too
// when it is missing or older than curation.json, so every smoke plays the file the site serves.
const ROOT = path.join(__dirname, '..');
const curPlay = () => {
  const mt = f => {
    try {
      return fs.statSync(path.join(ROOT, f)).mtimeMs;
    } catch (e) {
      return -1;
    }
  };
  if (mt('curation-play.json') < mt('curation.json'))
    execFileSync('python3', [path.join(ROOT, 'tools', 'curplay.py'), ROOT], {stdio: 'ignore'});
};
const calm = b => {
  const nc = b.newContext.bind(b);
  b.newContext = (o = {}) => nc({reducedMotion: 'reduce', ...o});
  return b;
};
module.exports = {
  ...pw,
  chromium: {
    launch: async (...a) => {
      await slot(path.basename(process.argv[1] || 'smoke'));
      curPlay();
      return calm(await pw.chromium.launch(...a));
    }
  }
};

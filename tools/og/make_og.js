// Link preview image (Open Graph, og:image in index.html): what WhatsApp, Messenger, Slack... show when the link is
// shared (Pierre, 2026-11-01). Renders tools/og/og.html (six of Pierre's own photos, corals and reef fish, + the app
// name, in the site's fonts) to og.jpg at the repo root, 1200 x 630. Re-run after changing og.html: node tools/og/make_og.js
// (needs Playwright and network access to Google Fonts, to R2, where the coral photos live since step 2 of Photos out of
// the repo, and to iNaturalist's open data, where the fish photos are). Another layout of og.html and another file:
// node tools/og/make_og.js b /tmp/og-b.jpg. Keep it under ~300 KB: WhatsApp drops larger preview images. A photo that
// does not load stops it (never a preview with holes).
const path = require('path');
const { chromium } = require('playwright');
const [variant = 'a', out = path.join(__dirname, '..', '..', 'og.jpg')] = process.argv.slice(2);
(async () => {
  await require('../../tests/slot.js')('tools/og/make_og.js'); // one Playwright run per 2 cores on this machine (tests/slot.js)
  const b = await chromium.launch(), p = await b.newPage({viewport: {width: 1200, height: 630}});
  await p.goto('file://' + path.join(__dirname, 'og.html') + '#' + variant); await p.waitForLoadState('networkidle');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const bad = await p.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
  if (bad.length) { await b.close(); throw new Error('og.html: photo(s) not loaded, ' + out + ' left as it was: ' + bad.join(' ')); }
  await p.screenshot({path: out, type: 'jpeg', quality: 82});
  await b.close(); console.log(out + ' written');
})();

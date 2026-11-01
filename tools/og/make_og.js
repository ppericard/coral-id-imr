// Link preview image (Open Graph, og:image in index.html): what WhatsApp, Messenger, Slack... show when the link is
// shared (Pierre, 2026-11-01). Renders tools/og/og.html (six of Pierre's own photos + the app name, in the site's fonts)
// to og.jpg at the repo root, 1200 x 630. Re-run after changing og.html: node tools/og/make_og.js (needs Playwright and
// network access to Google Fonts). Keep it under ~300 KB: WhatsApp drops larger preview images.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({viewport: {width: 1200, height: 630}});
  await p.goto('file://' + path.join(__dirname, 'og.html')); await p.waitForLoadState('networkidle');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({path: path.join(__dirname, '..', '..', 'og.jpg'), type: 'jpeg', quality: 82});
  await b.close(); console.log('og.jpg written');
})();

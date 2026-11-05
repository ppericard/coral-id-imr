// The photos' outside hosts answered from the local files, for the smokes (no test reaches R2 or iNaturalist).
// Since step 2 of Photos out of the repo (Pierre's rule of 2026-11-05) the photos with an online original (src) live on
// R2 only: a checkout has no file for them, so this stub answers them with a stand-in, a photo of img/ at the same size
// (the test checks where a photo comes from, not what it shows). Any other name R2 lacks is a 404, as on R2.
//   const stub = require('./photostub.js')(ROOT);
//   await stub.r2(ctx)          R2 (core.js PHOTO_BASE) answering, with the bucket's CORS header
//   await stub.inat(ctx, log)   iNaturalist answering (small 240, medium 480, large 960 px, as core.js photoOnline asks)
//   stub.file('<f>-s.webp')     the local file that stands for a photo file, or null
const fs = require('fs'),
  path = require('path');
module.exports = ROOT => {
  const IMG = path.join(ROOT, 'img'),
    R2 = require(path.join(ROOT, 'core.js')).PHOTO_BASE;
  // Every photo record (f and src) of the data files: the R2-only photos (downloaded, no r) and iNaturalist's photo ids.
  const online = new Set(),
    byId = new Map();
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (typeof o.f === 'string' && typeof o.src === 'string') {
      if (!o.r) online.add(o.f);
      const id = (/\/photos\/(\d+)\//.exec(o.src) || [])[1];
      if (id && !byId.has(id)) byId.set(id, o.f);
    }
    Object.values(o).forEach(walk);
  };
  ['data.json', 'cand.json', 'fish-photos.json', 'fish-game.json'].forEach(f => {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) walk(JSON.parse(fs.readFileSync(p, 'utf8')));
  });
  const here = fs.existsSync(IMG) ? fs.readdirSync(IMG).sort() : [];
  const SUF = ['-t', '-s', '-m'];
  // A photo of img/ at each size: the first whose four files are there.
  const stand = {};
  for (const n of here) {
    const m = /^(.+?)(-[tsm])?\.webp$/.exec(n);
    if (m && !m[2] && SUF.every(s => here.includes(`${m[1]}${s}.webp`))) {
      ['', ...SUF].forEach(s => (stand[s] = path.join(IMG, `${m[1]}${s}.webp`)));
      break;
    }
  }
  const file = name => {
    const own = path.join(IMG, name);
    if (fs.existsSync(own)) return own;
    const m = /^(.+?)(-[tsm])?\.webp$/.exec(name);
    return m && online.has(m[1]) ? stand[m[2] || ''] : null;
  };
  const r2 = ctx =>
    ctx.route(
      u => u.href.startsWith(R2),
      r => {
        const u = new URL(r.request().url()),
          f = u.pathname.startsWith('/img/') && file(decodeURIComponent(u.pathname.slice(5)));
        return f
          ? r.fulfill({status: 200, contentType: 'image/webp', headers: {'Access-Control-Allow-Origin': '*'}, body: fs.readFileSync(f)})
          : r.fulfill({status: 404});
      }
    );
  // A photo with a record is served its own file (or its stand-in) at the size asked, any other a 480 px file.
  const inat = (ctx, log) =>
    ctx.route(/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/\d+\/(small|medium|large|original)\./, r => {
      const u = r.request().url(),
        [, id, sz] = /\/photos\/(\d+)\/(\w+)\./.exec(u),
        f = byId.get(id),
        suf = {small: '-t', medium: '-s', large: '-m'}[sz] || '';
      if (log) log.push(u);
      return r.fulfill({contentType: 'image/webp', body: fs.readFileSync((f && file(`${f}${suf}.webp`)) || stand['-s'])});
    });
  return {r2, inat, file, online, stand};
};

# The site: what is served, and what protects it

The static site as players and Pierre reach it: what it is made of, its static pages and assets (the privacy notice,
the link preview, the icon), and the security model of the site and the admin page. This is the specification of what
the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and the PRs. The abuse
side (bots, floods, the sheet script's protections, the Candidate photos workflow's push) is
[SECURITY.md](../SECURITY.md); the deploy is [PAGES.md](../PAGES.md) and [deploy.md](deploy.md).

## A static site

- Served by GitHub Pages from `main` through `pages.yml` (the Actions source; the workflows and the recovery in
  [PAGES.md](../PAGES.md)). No framework and no npm dependency in the app; development has no build step (the files are
  what a local server shows), and the deploy builds its own copy: it minifies the scripts and stamps the versions
  ([PAGES.md › The build at deploy](../PAGES.md#the-build-at-deploy)).
- Everything runs in the browser. The only backend is the Google Apps Script web app that stores the players' progress
  in a Google Sheet ([sync.md](sync.md)); the photos are served from a Cloudflare R2 bucket ([photos.md](photos.md)).
- A service worker (`sw.js`) keeps the app shell and the photos viewed for offline use and brings each new version in
  ([service-worker.md](service-worker.md), [loading.md › New versions](loading.md#new-versions)).

## Static pages and assets

- **`privacy.html`**: the privacy notice (static, no script, its own CSP), linked from the ? help of every page and from
  About and credits (`#about`); also the privacy policy link of the Google Cloud project behind the sync script's
  self-update. Keep it true when the data stored changes (a new sheet column, a new external host);
  `tests/docs.test.js` checks that its subject list matches `core.js` `SUBJECTS`.
- **Link preview**: `index.html` carries Open Graph / Twitter meta tags pointing at `og.jpg` (1200 × 630, six of Pierre's
  own photos, corals and reef fish, and the app's name), made by `node tools/og/make_og.js` from `tools/og/og.html` (the
  coral photos from R2, the fish photos from their iNaturalist original; `make_og.js b <out.jpg>` renders the other
  layout, `og.html#b`). The addresses are absolute (crawlers need them); WhatsApp caches a preview per address, so an old
  share keeps its old card.
- **App icon**: a loupe, dark glass with a white rim and glint, a coral fish and a green brain coral inside, a
  straight handle. `icon.svg` is the "any" icon, a rounded square (the favicon of every page, the header logo, the Lab's
  placeholder, `og.html`); `icon-192.png` and `icon-512.png` are the same as PNG; `icon-maskable-192.png` and
  `icon-maskable-512.png` are the full-bleed art (the motif inside the 80 % safe circle) for Android's masks;
  `apple-touch-icon.png` (180 px, full bleed, opaque) is the iOS home-screen icon (`index.html`, `admin.html`).
  `manifest.webmanifest` lists the SVG and the four PNGs. Only `icon.svg` is in `sw.js` `SHELL` (the system reads the
  PNGs when the app is installed: no download for players at each new version); the deploy's `V` hashes `icon.svg` and
  the manifest, so a new icon reaches installed apps with the next version.
- The app's names on these pages come from `core.js` `ORG` through `tools/rename_app.py`
  ([storage.md › The app's name](storage.md#the-apps-name)).

## Security model

What is public and what protects what.

- **Everything in the repository is public**, the admin page's code and the sync script's address included. The admin
  password only unlocks the token stored in that browser; it protects nothing on its own.
- **The GitHub token is the real key**: fine-grained, this repository only, Contents read / write, a 90-day expiry. It is
  kept encrypted in `localStorage` (`reefid-admin-vault`); the unlocked token lives in `sessionStorage` only. The admin's
  draft and its sealing at Sign out: [admin.md › The draft](admin.md#the-draft), [SECURITY.md](../SECURITY.md).
- **No third-party script**: `ppericard.github.io` is shared by every Pages site of the account, so the CSP
  (`<meta http-equiv="Content-Security-Policy">` in `index.html` and `admin.html`) allows scripts from this site only,
  inline scripts by hash (`tests/csp.test.js` fails when a hash is stale). A new external source needs its host in
  `img-src` / `connect-src` there (rule U5). `img-src` allows the photos' online originals: iNaturalist,
  `https://www.fishbase.se` and `https://www.fishbase.de` (the FishBase candidates and sheet photos, shown remote) and the
  R2 bucket (`https://pub-934250f83b884a4f890497f2027ce251.r2.dev`), which `connect-src` allows too (any `fetch()` of a
  photo; the service worker's own requests follow no page CSP). `tests/csp.test.js` checks every host in the data.
- **Templates**: every data string goes through `esc()` (it escapes `& < > " '`); links from data go through `safeUrl()`
  (https only).
- **Sync sheet**: anyone can call the Apps Script address. A name and a 4-digit code only prevent accidental overwrites;
  the script throttles wrong codes, never writes a user string as a formula, and keeps anonymous ids unguessable (a
  secret salt). The players' data is of low sensitivity (first names and quiz answers). The details:
  [SECURITY.md](../SECURITY.md) "Protections in the sync script".
- **The Candidate photos workflow** (`approved-photos.yml`): `contents: write` only in its two push jobs, which run no
  downloaded code and push only their job's files ([SECURITY.md](../SECURITY.md)); it downloads photos only from
  iNaturalist's photo hosts (`tools/fetch_approved.py` `HOSTS`) and, for the fish, FishBase's (`tools/fish_game.py`
  `HOSTS`); its `fish` job only reads the iNaturalist API (`tools/fetch_fish.py --refill`, the project's User-Agent of
  `tools/inat.py`, no personal address) and downloads no photo.
- **Photos to R2**: an R2 API token limited to the photo bucket, from the repository's secrets, and a pinned rclone
  ([photos.md › Uploading to R2](photos.md#uploading-to-r2)).

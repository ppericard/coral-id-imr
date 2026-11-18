#!/usr/bin/env node
// Minifies the deploy's staged copy of the site (architecture review of 2026-11-18, R4, migration step 1: phones
// downloaded the comments, about 474 KB of gzipped JavaScript where terser leaves about 180 KB, at the field's 86 kbit/s).
// Run by tools/build_site.py on the staged copy only, never on the source (development keeps no build step):
//
//   NODE_PATH=<folder>/node_modules node tools/minify.js DIR
//
// terser, pinned at TERSER below, is installed by the workflow into a temporary folder (npm install --no-save
// terser@<TERSER>), never into the repository (no package.json). Every script at DIR's root and in DIR/proto is minified
// in place with terser's default compress and mangle (never toplevel or module: the scripts are classic scripts that
// share their top-level names, and the pages and the smokes call them by name), the original quotes kept (quote_style 3:
// tools/check_versions.py reads app.js's fetches in single quotes), with a source map beside it (<file>.map, its source
// inside: the original is no longer served at that address). Left as they are:
// - sw.js and proto/lab.js: tools/stamp_versions.py and check_versions.py read them by their shape (sw.js V and SHELL,
//   LAB_V and LAB.files);
// - the HTML pages: their inline scripts are hashed in the CSP;
// - the CSS (minified, it changes how little it weighs: about 41 KB gzipped for app.css; see docs/PAGES.md).
// The deploy stamps the versions before and again after this step (tools/build_site.py): the first stamp turns every
// ?v=N into a 10-hex hash, so the second, on the minified bytes, swaps 10 hex for 10 hex and the source maps' columns stay
// exact. Fails (exit 1) when terser is missing or not the pinned version, or when a file's ?v= references differ after
// minifying (the stamps would miss one). Prints a Markdown table of the sizes, raw and gzipped, before and after.
const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');

const TERSER = '5.51.2';
// Read by shape by the version tools: never minified.
const KEEP = new Set(['sw.js', 'proto/lab.js']);
// A versioned reference, as tools/stamp_versions.py REF finds it.
const REF = /(?<![\w./-])([\w][\w./-]*\.(?:js|css|json))\?v=(?:\d+|[0-9a-f]{10})(?!\w)/g;
const refs = s => [...s.matchAll(REF)].map(m => m[0]).sort();
const OPTIONS = {compress: {}, mangle: true, format: {quote_style: 3}};

// The scripts minified in dir: the root's and the Lab's, but KEEP.
const scripts = dir =>
  ['.', 'proto']
    .flatMap(d =>
      fs.existsSync(path.join(dir, d))
        ? fs
            .readdirSync(path.join(dir, d))
            .filter(f => f.endsWith('.js'))
            .map(f => path.posix.join(d, f))
        : []
    )
    .filter(f => !KEEP.has(f))
    .sort();

const gz = b => zlib.gzipSync(b, {level: 9}).length;
const kb = n => (n / 1024).toFixed(1);

async function minify(dir, terser) {
  const rows = [],
    fails = [];
  for (const f of scripts(dir)) {
    const p = path.join(dir, f),
      src = fs.readFileSync(p, 'utf8'),
      base = path.basename(f);
    const out = await terser.minify(
      {[base]: src},
      {...OPTIONS, sourceMap: {filename: base, url: base + '.map', includeSources: true}}
    );
    const a = refs(src),
      b = refs(out.code);
    if (a.join() !== b.join()) {
      fails.push(`${f}: its ?v= references changed when minified (${a.length} before, ${b.length} after)`);
      continue;
    }
    fs.writeFileSync(p, out.code);
    fs.writeFileSync(p + '.map', out.map);
    rows.push([f, Buffer.byteLength(src), gz(src), Buffer.byteLength(out.code), gz(out.code)]);
  }
  return {rows, fails};
}

function table(rows) {
  const sum = i => rows.reduce((s, r) => s + r[i], 0),
    line = r => `| ${r[0]} | ${kb(r[1])} | ${kb(r[2])} | ${kb(r[3])} | ${kb(r[4])} |`;
  return [
    `Minified with terser ${TERSER} (KB):`,
    '',
    '| File | Raw | Gzip | Raw, minified | Gzip, minified |',
    '|---|---:|---:|---:|---:|',
    ...rows.map(line),
    line(['**All**', sum(1), sum(2), sum(3), sum(4)])
  ].join('\n');
}

async function main() {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(path.join(dir, 'index.html'))) {
    console.error('usage: NODE_PATH=<folder>/node_modules node tools/minify.js DIR   (DIR: a staged copy of the site)');
    return 2;
  }
  let terser;
  try {
    terser = require('terser');
  } catch (e) {
    console.error(`minify: terser not found; install it outside the repository: npm install --no-save terser@${TERSER}, then NODE_PATH`);
    return 1;
  }
  const v = require('terser/package.json').version;
  if (v !== TERSER) {
    console.error(`minify: terser ${v} found, ${TERSER} pinned (tools/minify.js TERSER and the workflows' install agree)`);
    return 1;
  }
  const {rows, fails} = await minify(dir, terser);
  if (fails.length) {
    console.error(fails.join('\n'));
    return 1;
  }
  console.log(table(rows));
  return 0;
}

module.exports = {TERSER, KEEP, REF, refs, scripts, OPTIONS};
if (require.main === module) main().then(c => process.exit(c));

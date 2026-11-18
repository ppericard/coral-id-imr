#!/usr/bin/env node
// Maps a reported error back to the original files and lines (architecture review of 2026-11-18, R4: the deploy minifies
// the scripts, tools/minify.js, so the `src` an error report carries, `app.js:1:23456`, points into a one-line file).
//
//   node tools/unminify.js [SOURCE] [--av AV] [--force] [--src TEXT | FILE | -]
//
// What to map (any of, repeatable text allowed, several frames at once):
//   --src 'app.js:1:23456'            the `src` of a report (the admin's Errors page, the sheet's Events tab), or
//   FILE | -                          a pasted stack, a file or stdin: V8 `at f (https://…/app.js?v=ab12cd34ef:1:2345)`,
//                                     Safari and Firefox `f@https://…/app.js:1:2345`, or bare `file.js:line:column`
//                                     (lines and columns as a browser reports them: from 1)
// Which build's maps (the `.map` files the deploy publishes beside each script, tools/build_site.py; `source` is one of):
//   (nothing)                         the live site, https://ppericard.github.io/coral-id-imr/ (SITE; only GETs of the
//                                     public files: nothing of the report leaves this machine); or --site URL
//   --dir DIR                         a built copy on disk (tools/build_site.py DIR)
//   --commit SHA                      rebuilds that commit here (git archive + tools/build_site.py with this checkout's
//                                     tools, a temporary folder removed afterwards; terser, the version tools/minify.js
//                                     pins, on NODE_PATH as there): the way back to a deploy that is no longer live
// The report's build, to check the maps are the ones of the build that failed:
//   --av '982-ab12cd34ef'             the `av` of the report: the deploy's number, then app.js's content hash. The hash
//                                     is compared with the hash of the app.js the maps belong to; another build is
//                                     refused (exit 2) unless --force. A frame with `?v=<hash>` is checked the same way
//                                     against its own file. The deploy's number alone proves nothing: every Publish
//                                     redeploys, and the scripts stay the same. The report holds the hash of app.js only:
//                                     a frame in another script is marked "[build not verified]" unless its own ?v=
//                                     matched, or the maps are the live site's and its <meta name="build"> is the
//                                     report's deploy number.
// Prints, per frame, `reported -> original (name)` and the original line. sw.js and proto/lab.js are never minified: a
// frame in them is the original position. Exit 0 when every frame was mapped, 1 when one was not, 2 on a wrong build or
// a wrong use. Node's own source map reader (node:module SourceMap) does the lookup; no dependency.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  crypto = require('crypto'),
  {execFileSync} = require('child_process');
const {SourceMap} = require('node:module');
const {KEEP} = require('./minify.js');

const SITE = 'https://ppericard.github.io/coral-id-imr/';
const ROOT = path.join(__dirname, '..');

// A frame in a report or a pasted stack: a script path (a URL's, or the bare name the report keeps), its ?v= when it has
// one, then line and column. `proto/` is kept (the report's `src` drops the folder; its basename is then looked up in the
// root and in proto/).
const FRAME = /([\w.\/-]+\.js)(?:\?([^\s:)\]]*))?:(\d+):(\d+)/g;

// The frames of a text, in order: {text, file, rel, hash, line, col}; file is what the text names, rel its folder-less
// candidates are tried against.
function frames(text) {
  const out = [];
  for (const m of String(text).matchAll(FRAME)) {
    const parts = m[1].split('/'),
      base = parts.pop(),
      proto = parts[parts.length - 1] === 'proto',
      v = /(?:^|&)v=([0-9a-f]{10})(?![\w])/.exec(m[2] || '');
    out.push({text: `${proto ? 'proto/' : ''}${base}:${m[3]}:${m[4]}`, base, proto, hash: v ? v[1] : null, line: +m[3], col: +m[4]});
  }
  return out;
}

// The files a name can be: proto/ when the text said so, else the root's and the Lab's.
const candidates = f => (f.proto ? ['proto/' + f.base] : [f.base, 'proto/' + f.base]);

const h10 = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 10);

// What a frame's ?v= is the hash of: its own file's bytes; but every Lab module (proto/*.js, but lab.js itself) is loaded
// with the one LAB_V, a hash of the names and hashes of all the Lab files (tools/stamp_versions.py, proto/lab.js `files`).
// Returns the hash the frame's file should carry in src's copy, or null when it cannot be computed.
async function versionOf(src, rel) {
  if (!rel.startsWith('proto/')) {
    const raw = await src.read(rel);
    return raw ? h10(raw) : null;
  }
  if (!(await src.read(rel))) return null;
  const lab = await src.read('proto/lab.js'),
    list = lab && /files: \[([^\]]*)\]/.exec(lab.toString('utf8'));
  if (!list) return null;
  let all = '';
  for (const n of [...list[1].matchAll(/'(\w+)'/g)].map(m => m[1])) {
    const raw = await src.read(`proto/${n}.js`);
    if (!raw) return null;
    all += n + h10(raw);
  }
  return h10(Buffer.from(all));
}

// A source of files, by path in the built copy: read(rel) -> Buffer, or null when there is none. dir: a folder; site: the
// published files (a plain GET; a 404 is none, anything else is an error).
const fromDir = dir => ({
  name: dir,
  read: rel => {
    const p = path.join(dir, rel);
    return fs.existsSync(p) ? fs.readFileSync(p) : null;
  }
});
const fromSite = base => ({
  name: base,
  site: true,
  read: async rel => {
    const r = await fetch(new URL(rel, base));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${new URL(rel, base)}: HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
});

// The report's av, '982-ab12cd34ef' (or the bare hash of a copy never deployed): {build, hash}, or null.
function parseAv(av) {
  const m = /^(?:(\d+)-)?([0-9a-f]{10})$/.exec(String(av || '').trim());
  return m ? {build: m[1] || null, hash: m[2]} : null;
}

// One frame mapped. maps: a cache {rel: SourceMap | null}. Returns {ok, text, why?}.
async function mapFrame(src, f, cache) {
  const found = [];
  for (const rel of candidates(f)) {
    if (KEEP.has(rel)) {
      if (await src.read(rel)) found.push({rel, kept: true});
      continue;
    }
    if (!(rel in cache)) {
      const raw = await src.read(rel + '.map');
      cache[rel] = raw ? {sm: new SourceMap(JSON.parse(raw.toString('utf8'))), payload: JSON.parse(raw.toString('utf8'))} : null;
    }
    if (cache[rel]) found.push({rel, map: cache[rel]});
  }
  if (!found.length) return {ok: false, text: `${f.text}: no map for ${f.base} (not a script of the app, or not in this build)`};
  const head = `${f.text} ->`,
    note = found.length > 1 ? `  (${found.map(x => x.rel).join(' and ')} both exist: the first shown)` : '';
  const x = found[0];
  if (x.kept) return {ok: true, kept: true, rel: x.rel, text: `${head} ${x.rel}:${f.line}:${f.col}  (never minified: the original position)`};
  const e = x.map.sm.findEntry(f.line - 1, f.col - 1); // the maps count from 0, the browsers from 1
  // A line the file does not have gets the last mapping of the map (findEntry takes the nearest): not a position.
  if (!e || e.originalLine === undefined || e.generatedLine !== f.line - 1) return {ok: false, text: `${head} no mapping at ${x.rel}:${f.line}:${f.col}`};
  const lines = (x.map.payload.sourcesContent || [])[0],
    code = lines ? String(lines).split('\n')[e.originalLine] : null,
    where = `${x.rel}:${e.originalLine + 1}:${e.originalColumn + 1}`;
  return {ok: true, rel: x.rel, text: `${head} ${where}${e.name ? `  (${e.name})` : ''}${note}${code == null ? '' : `\n    ${code.trim().slice(0, 200)}`}`};
}

// Maps text with the maps of src. Options: av, force. Returns {lines, code}: code 0, 1 (a frame not mapped), 2 (wrong
// build, or no frame in the text).
async function unminify(src, text, opts = {}) {
  const fs_ = frames(text);
  if (!fs_.length) return {lines: ['no frame (file.js:line:column) found in the text'], code: 2};
  const out = [],
    cache = {};
  const av = opts.av ? parseAv(opts.av) : null;
  if (opts.av && !av) return {lines: [`--av ${JSON.stringify(opts.av)}: not a report's av (build number, then 10 hex)`], code: 2};
  // The build: the report's hash against the app.js these maps belong to.
  let wrong = false;
  if (av) {
    const app = await src.read('app.js');
    if (!app) return {lines: [`app.js not found in ${src.name}: cannot check the build`], code: 2};
    const mine = h10(app);
    if (mine !== av.hash) {
      wrong = true;
      out.push(
        `these maps are not the report's build: its app.js is ${av.hash} (deploy ${av.build || '?'}), ${src.name} has ${mine}.`,
        `  Rebuild the deploy: find its commit (the deploy run ${av.build || 'N'}'s summary line "Published source: <sha>"; or`,
        `  gh api 'repos/ppericard/coral-id-imr/actions/workflows/pages.yml/runs?per_page=100' -q '.workflow_runs[] | select(.run_number==${av.build || 'N'}) | .head_sha'),`,
        `  then: node tools/unminify.js --commit <sha> --av ${opts.av} …   (more in docs/PAGES.md "The build at deploy")`
      );
      if (!opts.force) return {lines: out, code: 2};
      out.push('  --force: mapped anyway, the lines below may be wrong.', '');
    }
  }
  // What proves a frame is of the report's build. The report holds the deploy's number and app.js's hash, and nothing of
  // the other scripts (app.js names none of them with ?v=): so only a frame's own ?v=, app.js itself when its hash
  // matched, or the live site whose <meta name="build"> is the report's deploy (a number given with --commit or --dir
  // proves nothing: the caller chose that build). The others are mapped, and marked.
  const appOk = !!av && !wrong;
  let sameDeploy = false;
  if (av && av.build && src.site) {
    const m = /<meta name="build" content="(\d+)">/.exec(String((await src.read('index.html')) || ''));
    sameDeploy = !!m && m[1] === av.build;
  }
  let bad = false,
    unverified = false;
  for (const f of fs_) {
    let own = false;
    if (f.hash) {
      // The first candidate the copy has (a Lab module's ?v= is the Lab's: versionOf).
      let mine = null;
      for (const c of candidates(f)) {
        if (KEEP.has(c)) continue;
        mine = await versionOf(src, c);
        if (mine) break;
      }
      if (mine && mine !== f.hash && !opts.force) {
        out.push(`${f.text}: this frame is ${f.base} ${f.hash}, ${src.name} has ${mine}: another build (--force to map anyway)`);
        wrong = true;
        continue;
      }
      own = !!mine && mine === f.hash;
    }
    const r = await mapFrame(src, f, cache),
      lines = r.text.split('\n');
    if (r.ok && !r.kept && !(own || sameDeploy || (appOk && r.rel === 'app.js'))) {
      unverified = true;
      if (av) lines[0] += "  [build not verified: only app.js's hash is in the report]";
    }
    out.push(...lines);
    if (!r.ok) bad = true;
  }
  if (unverified && !av) out.push('', "no --av: the maps' build is not checked against the report");
  return {lines: out, code: wrong && !opts.force ? 2 : bad ? 1 : 0};
}

// A commit rebuilt as the deploy builds it (the staged smoke's stage(): git archive without the photos, then
// tools/build_site.py, this checkout's); the folder is removed by the caller.
function rebuild(sha, build) {
  if (!/^[0-9A-Za-z][\w./-]*$/.test(sha)) throw new Error(`--commit ${JSON.stringify(sha)}: not a commit or a branch name`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reefid-unminify-')),
    tar = path.join(dir, '.src.tar');
  try {
    execFileSync('git', ['archive', '--format=tar', '-o', tar, sha, '--', '.', ':(exclude)img'], {cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit']});
    execFileSync('tar', ['-x', '-f', tar, '-C', dir]);
    fs.rmSync(tar);
    execFileSync('python3', [path.join(__dirname, 'build_site.py'), dir, '--build', String(build || 0)], {stdio: ['ignore', 'ignore', 'inherit']});
  } catch (e) {
    fs.rmSync(dir, {recursive: true, force: true});
    throw e;
  }
  return dir;
}

function parse(argv) {
  const o = {texts: [], files: [], force: false};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i],
      val = () => {
        if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
        return argv[++i];
      };
    if (a === '--src') o.texts.push(val());
    else if (a === '--av') o.av = val();
    else if (a === '--dir') o.dir = val();
    else if (a === '--site') o.site = val();
    else if (a === '--commit') o.commit = val();
    else if (a === '--force') o.force = true;
    else if (a === '-' || !a.startsWith('-')) o.files.push(a);
    else throw new Error(`unknown option ${a}`);
  }
  if ([o.dir, o.site, o.commit].filter(Boolean).length > 1) throw new Error('--dir, --site and --commit are exclusive');
  return o;
}

const USAGE = `usage: node tools/unminify.js [--dir DIR | --commit SHA | --site URL] [--av AV] [--force] (--src TEXT | FILE | -)
  e.g.  node tools/unminify.js --src 'app.js:1:23456' --av 982-ab12cd34ef
  more: the top of tools/unminify.js, docs/PAGES.md "The build at deploy"`;

async function main(argv) {
  let o;
  try {
    o = parse(argv);
  } catch (e) {
    console.error(`unminify: ${e.message}\n${USAGE}`);
    return 2;
  }
  const texts = [...o.texts, ...o.files.map(f => fs.readFileSync(f === '-' ? 0 : f, 'utf8'))];
  if (!texts.length) {
    console.error(USAGE);
    return 2;
  }
  let dir = null;
  try {
    let src;
    if (o.commit) {
      const av = parseAv(o.av);
      dir = rebuild(o.commit, av && av.build);
      src = fromDir(dir);
    } else src = o.dir ? fromDir(o.dir) : fromSite(o.site || SITE);
    const r = await unminify(src, texts.join('\n'), {av: o.av, force: o.force});
    console.log(r.lines.join('\n'));
    return r.code;
  } catch (e) {
    console.error(`unminify: ${e.message}`);
    return 1;
  } finally {
    if (dir) fs.rmSync(dir, {recursive: true, force: true});
  }
}

module.exports = {SITE, frames, candidates, parseAv, unminify, fromDir, fromSite, h10, versionOf};
if (require.main === module) main(process.argv.slice(2)).then(c => process.exit(c));

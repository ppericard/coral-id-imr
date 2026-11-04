#!/usr/bin/env python3
"""The mechanical part of the app's rename (Pierre, 2026-11-03: IMR Coral ID became IMR Reef ID), re-runnable.

    python3 tools/rename_app.py            # rewrite the files in place, print what changed
    python3 tools/rename_app.py --check    # change nothing; exit 1 if a file still needs the rename (CI, after a rebase)
    python3 tools/rename_app.py --from "Old Name"   # a fork that renames the app again (see below)

Idempotent: a second run changes nothing. Other branches merged before this one keep adding the old names (a new
storage key, a page title...), so after a rebase run it again, and commit its result on its own. Hand-written changes (the migration of players' data, its tests, the docs
prose) are separate commits and never undone by this tool: it skips any line holding the marker "rename-app: keep" and
any block between "rename-app: keep-begin" and "rename-app: keep-end" (code that must name the old keys on purpose).

What it rewrites, in the tracked text files (.js .css .html .md .py .gs .yml .sh .webmanifest), outside img/,
docs/reviews/ and docs/reference/ (dated records), tools/archive/ and the JSON data files (photo ids such as
"imr-p12_i8" are data, never renamed):
1. The app's visible name: "IMR Coral ID" (and "Coral ID Admin") becomes core.js ORG.app ("IMR Reef ID",
   "IMR Reef ID Admin"); manifest.webmanifest name / short_name are written from ORG.app / ORG.appShort. Static files
   that carry the name, so a fork changes them through ORG and this tool: index.html (title, social tags, header),
   admin.html, privacy.html, manifest.webmanifest, tools/og/og.html (then `node tools/og/make_og.js` for og.jpg),
   README.md and the docs. Pages built by JS read ORG directly.
   Names of things that exist outside the repo and were not renamed stay: the Google Cloud project "IMR Coral ID sync"
   and the Google Sheet "IMR Coral ID – RA progress".
2. Storage keys (localStorage, sessionStorage): the old names become the new ones with the table core.js LEGACY_KEYS
   (the same table that moves a player's keys at start-up, so code and devices always agree): imr-coral-* (they travel
   with the progress) become reefid-sync-* (coral learning state: reefid-sync-coral-*), the other imr-* become reefid-*.
3. Other internal names: the service worker's shell cache imr-coral-id-vN becomes reefid-shell-vN, the progress file
   name imr-coral-progress-<date>.json becomes reefid-progress-<date>.json. Kept on purpose: the photo cache
   imr-photos-v1 (renaming it would throw away up to 2,500 offline photos per phone; it gets its new name with the
   domain move, whose new origin starts every cache afresh), and 'imr-coral-id' (the salt of the anonymous player ids,
   in tools/sync/Code.gs and admin.js: changing it would change every id). The repository and the URL (coral-id-imr)
   do not change now (docs/ROADMAP.md).
4. The CSP hashes of the inline scripts of index.html and admin.html (tests/csp.test.js), recomputed.
5. Prettier (AGENTS.md "How to make a change", the same pinned version) on the JS and CSS files it changed: longer key
   names move line breaks.

A fork run by another organisation: edit core.js ORG, then run this tool with --from "IMR Reef ID" (every earlier
name it should replace); the storage keys do not depend on the organisation, so nothing else moves.
"""
import argparse, base64, hashlib, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SELF = 'tools/rename_app.py'
PRETTIER = 'prettier@3.9.10'  # as AGENTS.md and .github/workflows/checks.yml
EXT = {'.js', '.css', '.html', '.md', '.py', '.gs', '.yml', '.sh', '.webmanifest'}
SKIP_DIRS = ('img/', 'docs/reviews/', 'docs/reference/', 'tools/archive/', 'judging/out/')
OLD_NAMES = ['IMR Coral ID']
OLD_ADMIN = 'Coral ID Admin'  # the admin page's title before the rename
# Outside the repo, named before the rename: kept as they are (renaming them here would point to things that do not exist).
KEEP_PHRASES = ['IMR Coral ID sync', 'IMR Coral ID – RA progress']
KEEP_TOKENS = {'imr-photos-v1', 'imr-coral-id'}
MARK, BEGIN, END = 'rename-app: keep', 'rename-app: keep-begin', 'rename-app: keep-end'


def org():
    """core.js ORG: {short, name, app, appShort}."""
    src = (ROOT / 'core.js').read_text(encoding='utf-8')
    m = re.search(r'const ORG = \{([^}]*)\}', src)
    if not m:
        sys.exit('core.js has no ORG')
    return dict(re.findall(r"(\w+): '([^']*)'", m.group(1)))


def legacy_keys():
    """core.js LEGACY_KEYS: [(old, new)], exact names first, then prefixes (ending in -)."""
    src = (ROOT / 'core.js').read_text(encoding='utf-8')
    m = re.search(r'const LEGACY_KEYS = \[(.*?)\n\s*\];', src, re.S)
    if not m:
        sys.exit('core.js has no LEGACY_KEYS')
    return re.findall(r"\['([\w-]+)', '([\w-]+)'\]", m.group(1))


def key_rename(k, table):
    for o, n in table:
        if o.endswith('-') and k.startswith(o):
            return n + k[len(o):]
        if k == o:
            return n
    return None


# A key-like token: imr- and the rest of a name (letters, digits, dashes); not inside a path, an id or a longer word.
TOKEN = re.compile(r'(?<![\w/.@-])imr-[a-z0-9-]*')


def rename_token(m, table):
    t, s, end = m.group(0), m.string, m.end()
    nxt = s[end:end + 1]
    if re.fullmatch(r'imr-p\d+', t) and nxt == '_':  # a photo id (IMR lecture photo), data
        return t
    if t in KEEP_TOKENS:
        return t
    if t.startswith('imr-coral-id-v'):  # the service worker's shell cache, and patterns for it (check_versions.py)
        return 'reefid-shell-v' + t[len('imr-coral-id-v'):]
    if t == 'imr-coral-id-':
        return 'reefid-shell-'
    if t == 'imr-coral-progress-' and nxt == '$':  # the progress file's name, imr-coral-progress-<date>.json
        return 'reefid-progress-'
    if t == 'imr-':  # a bare prefix: only in a key pattern such as /^imr-(curation|admin)/
        return 'reefid-' if nxt == '(' else t
    if t in ('imr-coral', 'imr-coral-'):  # the travelling keys as a family ("every imr-coral* key")
        return key_rename('imr-coral-', table)[:-1] + t[len('imr-coral'):]
    n = key_rename(t, table)
    return n if n else t


def rename_text(text, names, app, table):
    out, keep = [], False
    for line in text.splitlines(keepends=True):
        if BEGIN in line:
            keep = True
        if keep or MARK in line:
            out.append(line)
            if END in line:
                keep = False
            continue
        held = {}
        for i, p in enumerate(KEEP_PHRASES):
            if p in line:
                held[f'\0{i}\0'] = p
                line = line.replace(p, f'\0{i}\0')
        for n in names:
            if n != app:
                line = line.replace(n, app)
        line = line.replace(OLD_ADMIN, app + ' Admin')
        line = TOKEN.sub(lambda m: rename_token(m, table), line)
        line = re.sub(r'\b([Aa])n (`?reefid-)', r'\1 \2', line)  # "an imr-coral key" -> "a reefid-sync key"
        for k, p in held.items():
            line = line.replace(k, p)
        out.append(line)
    return ''.join(out)


def manifest(text, o):
    j = json.loads(text)
    j['name'], j['short_name'] = o['app'], o['appShort']
    return json.dumps(j, ensure_ascii=False, separators=(',', ':')) + ('\n' if text.endswith('\n') else '')


def csp(text):
    """Recompute the script-src hashes of the inline scripts (in page order)."""
    hashes = ["'sha256-%s'" % base64.b64encode(hashlib.sha256(m.encode()).digest()).decode()
              for m in re.findall(r'<script>([\s\S]*?)</script>', text)]

    def fix(m):
        src = re.sub(r"\s*'sha256-[^']+'", '', m.group(1))
        return src.replace("script-src 'self'", "script-src 'self' " + ' '.join(hashes) if hashes else "script-src 'self'", 1)

    return re.sub(r"(script-src [^;\"]*)", fix, text, count=1)


def files():
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
    return [f for f in out if f and Path(f).suffix in EXT and f != SELF and not f.startswith(SKIP_DIRS)]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--check', action='store_true', help='change nothing; exit 1 if a file needs the rename')
    ap.add_argument('--from', dest='old', action='append', default=[], help='an earlier app name to replace (repeatable)')
    a = ap.parse_args()
    o, table = org(), legacy_keys()
    names = sorted(set(OLD_NAMES + a.old), key=len, reverse=True)
    todo = []
    for f in files():
        p = ROOT / f
        s = p.read_text(encoding='utf-8')
        t = manifest(s, o) if f == 'manifest.webmanifest' else rename_text(s, names, o['app'], table)
        if f in ('index.html', 'admin.html'):
            t = csp(t)
        if t != s:
            todo.append(f)
            if not a.check:
                p.write_text(t, encoding='utf-8')
    if a.check:
        print('\n'.join(['Needs the rename: ' + f for f in todo]) or 'Rename: nothing left')
        return 1 if todo else 0
    pretty = [f for f in todo if re.fullmatch(r'(proto/)?[\w.-]+\.(js|css)|tests/[\w.-]+\.js', f)]
    if pretty:
        subprocess.run(['npx', '--yes', PRETTIER, '--write', *pretty], cwd=ROOT, check=True, capture_output=True)
    print(('Renamed in %d files:\n  ' % len(todo) + '\n  '.join(todo)) if todo else 'Rename: nothing to do')
    if 'tools/og/og.html' in todo:
        print('tools/og/og.html changed: run node tools/og/make_og.js to redraw og.jpg')
    return 0


if __name__ == '__main__':
    sys.exit(main())

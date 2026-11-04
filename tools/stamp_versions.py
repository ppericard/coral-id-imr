#!/usr/bin/env python3
"""Version numbers stamped at deploy (Pierre, 2026-11-04: five open PRs all carried sw.js V v340, so each merge forced
the others to bump again). Run by the Pages deploy on its staged copy, never on the source:

    python3 tools/stamp_versions.py DIR --build N     # stamps DIR in place, prints the manifest

- every versioned reference (`<file>.js|css|json?v=…` in the root pages and scripts, proto/*.js) gets ?v= + the first
  10 hex of the SHA-256 of the file it names, as stamped: app.js names data.json, so a new data.json changes app.js's
  hash too (stamped until nothing changes; the references never loop);
- proto/lab.js LAB_V and the sw.js Lab list get one hash of the Lab files (lab.js loads them all with one ?v);
- sw.js V becomes reefid-shell-v + a hash of every file its SHELL keeps (the unversioned ones too: index.html, the
  fonts, curation.json...), so it changes exactly when one of them does;
- index.html and admin.html get <meta name="build" content="N">, the deploy's run number, read with the hash by
  sync.js appVer ("higher is newer" on the admin's Errors page); left out of V, or every deploy would empty the shell.
A reference to no file fails the deploy. Stamping a stamped copy changes nothing. Nobody edits a version number by hand
(AGENTS.md rule 3); tools/check_versions.py checks the source and the stamped copy agree with themselves.
"""
import argparse, glob, hashlib, os, re, sys

VAL = r'(?:\d+|[0-9a-f]{10})'
REF = re.compile(r'(?<![\w./-])([\w][\w./-]*\.(?:js|css|json))\?v=' + VAL + r'(?![\w])')
LAB_V = re.compile(r"const LAB_V = " + r"(?:\d+|'[0-9a-f]{10}')" + ';')
LAB_T = re.compile(r'(`proto/\$\{f\}\.js\?v=)' + VAL + '`')
SHELL_V = re.compile(r"const V = 'reefid-shell-v[0-9a-z]+';")
BUILD = re.compile(r'<meta name="build" content="[^"]*">\n')
PAGES = ['index.html', 'admin.html']


def h(b):
    return hashlib.sha256(b).hexdigest()[:10]


def stamp(root, build=None):
    """Stamps root in place; returns the manifest {file: hash} (LAB_V and V under their own names)."""
    path = lambda p: os.path.join(root, p)
    read = lambda p: open(path(p), encoding='utf-8').read()
    texts = sorted({os.path.relpath(f, root) for g in ('*.html', '*.js', 'proto/*.js') for f in glob.glob(path(g))})
    lab = read('proto/lab.js')
    files = re.findall(r"'(\w+)'", re.search(r'files: \[([^\]]*)\]', lab).group(1))

    def of(p):
        if not os.path.isfile(path(p)):
            sys.exit(f'stamp_versions: a reference names no file: {p}')
        return h(open(path(p), 'rb').read())

    for _ in range(10):  # until nothing changes: a hash depends on the stamped content of the file it names
        labh = h(''.join(f + of(f'proto/{f}.js') for f in files).encode())
        moved = False
        for t in texts:
            s = read(t)
            n = REF.sub(lambda m: f'{m.group(1)}?v={of(m.group(1))}', s)
            n = LAB_V.sub(f"const LAB_V = '{labh}';", n) if t == 'proto/lab.js' else n
            n = LAB_T.sub(lambda m: f'{m.group(1)}{labh}`', n) if t == 'sw.js' else n
            if n != s:
                open(path(t), 'w', encoding='utf-8').write(n)
                moved = True
        if not moved:
            break
    else:
        sys.exit('stamp_versions: the references did not settle (a loop?)')
    for p in PAGES:  # the build: left out of every hash above (pages are never named with ?v=)
        s = BUILD.sub('', read(p))
        if build is not None:
            s = s.replace('<meta charset="utf-8">\n', f'<meta charset="utf-8">\n<meta name="build" content="{build}">\n', 1)
        open(path(p), 'w', encoding='utf-8').write(s)
    sw = read('sw.js')
    shell = sw[sw.index('const SHELL'):sw.index('];', sw.index('const SHELL'))]
    kept = sorted({'index.html' if x == './' else x.split('?')[0] for x in re.findall(r"'([^']+)'", shell) if not re.fullmatch(r'\w+', x)})
    kept += [f'proto/{f}.js' for f in files]
    nobuild = lambda p: BUILD.sub('', read(p)).encode() if p in PAGES else open(path(p), 'rb').read()
    for p in kept:
        if not os.path.isfile(path(p)):
            sys.exit(f'stamp_versions: sw.js SHELL keeps a file that is not there: {p}')
    V = h(''.join(p + h(nobuild(p)) for p in kept).encode())
    open(path('sw.js'), 'w', encoding='utf-8').write(SHELL_V.sub(f"const V = 'reefid-shell-v{V}';", sw))
    man = {p: of(p) for t in texts for p in REF.findall(read(t))}
    man.update({'LAB_V': labh, 'sw V': V})
    return man


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dir')
    ap.add_argument('--build', help="the deploy's run number (index.html and admin.html: <meta name=build>)")
    a = ap.parse_args()
    man = stamp(a.dir, a.build)
    for k in sorted(man):
        print(f'{k}\t{man[k]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Cache-busting check (code review 2026-11-01, M7). Run from the repo root.

    python3 tools/check_versions.py                    # consistency only
    python3 tools/check_versions.py --base origin/main # also: every changed file has a new ?v
    python3 tools/check_versions.py --base origin/main --fix   # bump what is missing, everywhere

Rules checked:
1. One file has one ?v=N everywhere: index.html, admin.html, sw.js SHELL and the fetches in app.js.
2. sw.js SHELL lists every versioned file index.html loads and every versioned fetch of app.js.
3. The Lab files in sw.js use LAB_V (proto/lab.js) and the same list as LAB.files.
4. With --base: a versioned file that changed has a ?v above the base's; a changed Lab prototype bumps LAB_V;
   any change to a shell file bumps the sw.js cache name V.
"""
import argparse, re, subprocess, sys

PAGES = ['index.html', 'admin.html']
REF = re.compile(r'''(?:src|href)="([\w./-]+)\?v=(\d+)"''')
FETCH = re.compile(r"""fetch\('([\w./-]+)\?v=(\d+)'\)|json\('([\w./-]+)\?v=(\d+)'\)""")
SHELL_ITEM = re.compile(r"'([\w./-]+)\?v=(\d+)'")


def read(path, rev=None):
    if rev is None:
        return open(path, encoding='utf-8').read()
    return subprocess.run(['git', 'show', f'{rev}:{path}'], capture_output=True, text=True).stdout


def state(rev=None):
    """Every versioned reference: {file: [(where, v)]}, plus LAB_V, LAB.files, sw V and the sw Lab list."""
    refs = {}
    add = lambda f, where, v: refs.setdefault(f, []).append((where, int(v)))
    for p in PAGES:
        for f, v in REF.findall(read(p, rev)):
            add(f, p, v)
    for m in FETCH.finditer(read('app.js', rev)):
        f, v = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
        add(f, 'app.js', v)
    sw = read('sw.js', rev)
    shell = sw[sw.index('const SHELL'):sw.index('];', sw.index('const SHELL'))]
    for f, v in SHELL_ITEM.findall(shell):
        add(f, 'sw.js', v)
    lab = read('proto/lab.js', rev)
    labv = int(re.search(r'const LAB_V = (\d+);', lab).group(1))
    files = re.findall(r"'(\w+)'", re.search(r'files: \[([^\]]*)\]', lab).group(1))
    m = re.search(r"\.\.\.\[([^\]]*)\]\.map\(f => `proto/\$\{f\}\.js\?v=(\d+)`\)", shell)
    swlab = (re.findall(r"'(\w+)'", m.group(1)), int(m.group(2))) if m else ([], None)
    V = int(re.search(r"const V = 'imr-coral-id-v(\d+)';", sw).group(1))
    return refs, labv, files, swlab, V


def changed(base, path):
    return subprocess.run(['git', 'diff', '--quiet', base, '--', path]).returncode != 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base')
    ap.add_argument('--fix', action='store_true')
    a = ap.parse_args()
    refs, labv, files, (swfiles, swlabv), V = state()
    errs, fixes = [], {}  # fixes: {file: new v}

    for f, uses in sorted(refs.items()):
        vs = {v for _, v in uses}
        if len(vs) > 1:
            errs.append(f'{f}: different ?v in ' + ', '.join(f'{w} v={v}' for w, v in uses))
            fixes[f] = max(vs)
    for f, uses in sorted(refs.items()):
        where = {w for w, _ in uses}
        if where & {'index.html', 'app.js'} and 'sw.js' not in where:
            errs.append(f'{f}: loaded by {"/".join(sorted(where))} but missing from sw.js SHELL')
    if swfiles != files:
        errs.append(f'sw.js Lab list {swfiles} differs from LAB.files {files}')
    if swlabv != labv:
        errs.append(f'sw.js Lab files use v={swlabv}, LAB_V is {labv}')

    newlab, newV = None, None
    if a.base:
        brefs, blabv, _, _, bV = state(a.base)
        shell_changed = False
        for f in sorted(refs):
            if not changed(a.base, f):
                continue
            shell_changed = True
            cur, old = max(v for _, v in refs[f]), max((v for _, v in brefs.get(f, [])), default=0)
            if cur <= old:
                errs.append(f'{f} changed but its ?v={cur} is not above {a.base} (v={old})')
                fixes[f] = old + 1
        protos = [f'proto/{x}.js' for x in files if x != 'lab'] + ['proto/lab.css']
        if any(changed(a.base, p) for p in protos):
            shell_changed = True
            if labv <= blabv:
                errs.append(f'a Lab prototype changed but LAB_V={labv} is not above {a.base} ({blabv})')
                newlab = blabv + 1
        if any(changed(a.base, p) for p in ['index.html', 'manifest.webmanifest', 'icon.svg']):
            shell_changed = True
        if shell_changed and V <= bV:
            errs.append(f'shell files changed but sw.js V=v{V} is not above {a.base} (v{bV})')
            newV = bV + 1

    if a.fix and (fixes or newlab or newV):
        for p in PAGES + ['app.js', 'sw.js']:
            s = read(p)  # read before open(p, 'w') truncates it
            for f, v in fixes.items():
                s = re.sub(re.escape(f) + r'\?v=\d+', f'{f}?v={v}', s)
            if p == 'sw.js' and newV:
                s = re.sub(r"imr-coral-id-v\d+", f'imr-coral-id-v{newV}', s, count=1)
            if p == 'sw.js' and newlab:
                s = re.sub(r"(`proto/\$\{f\}\.js\?v=)\d+", rf'\g<1>{newlab}', s)
            open(p, 'w', encoding='utf-8').write(s)
        if newlab:
            p = 'proto/lab.js'
            t = re.sub(r'const LAB_V = \d+;', f'const LAB_V = {newlab};', read(p))
            open(p, 'w', encoding='utf-8').write(t)
        print('Fixed:', ', '.join([f'{f} -> v{v}' for f, v in fixes.items()] + ([f'LAB_V -> {newlab}'] if newlab else []) + ([f'sw V -> v{newV}'] if newV else [])))
        return main_again()
    for e in errs:
        print('✗', e)
    if errs:
        print('\nRun: python3 tools/check_versions.py --base origin/main --fix')
        return 1
    print('Versions OK')
    return 0


RUNS = [0]


def main_again():
    # A bump can itself change a versioned file (LAB_V lives in proto/lab.js): fix again, then check, at most 3 rounds.
    RUNS[0] += 1
    if RUNS[0] >= 3:
        sys.argv = [sys.argv[0]] + [x for x in sys.argv[1:] if x != '--fix']
    return main()


if __name__ == '__main__':
    sys.exit(main())

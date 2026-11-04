#!/usr/bin/env python3
"""Cache-busting consistency check (code review 2026-11-01, M7). Run from the repo root.

    python3 tools/check_versions.py              # the source, as committed
    python3 tools/check_versions.py --dir DIR    # a stamped copy (the deploy, CI: tools/stamp_versions.py)

Since 2026-11-04 (Pierre's go: "version numbers stamped at deploy") nobody edits a version number: the deploy stamps
every ?v=, LAB_V and the sw.js cache name V from content hashes (tools/stamp_versions.py). The source keeps the numbers
it had then, frozen; a new versioned reference takes any number (?v=1), the same everywhere it appears. What is
checked, in the source and in the stamped copy alike:
1. One file has one ?v everywhere: index.html, admin.html, sw.js SHELL and the fetches in app.js.
2. sw.js SHELL lists every versioned file index.html loads and every versioned fetch of app.js.
3. The Lab files in sw.js use LAB_V (proto/lab.js) and the same list as LAB.files.
"""
import argparse, os, re, sys

PAGES = ['index.html', 'admin.html']
VAL = r'(\d+|[0-9a-f]{10})'  # a frozen number in the source, a content hash once stamped
REF = re.compile(r'''(?:src|href)="([\w./-]+)\?v=''' + VAL + '"')
FETCH = re.compile(r"""(?:fetch|json|getR)\('([\w./-]+)\?v=""" + VAL + r"'")
SHELL_ITEM = re.compile(r"'([\w./-]+)\?v=" + VAL + "'")


def state(root='.'):
    """Every versioned reference: {file: [(where, v)]}, plus LAB_V, LAB.files and the sw Lab list."""
    read = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
    refs = {}
    add = lambda f, where, v: refs.setdefault(f, []).append((where, v))
    for p in PAGES:
        for f, v in REF.findall(read(p)):
            add(f, p, v)
    for f, v in FETCH.findall(read('app.js')):
        add(f, 'app.js', v)
    sw = read('sw.js')
    shell = sw[sw.index('const SHELL'):sw.index('];', sw.index('const SHELL'))]
    for f, v in SHELL_ITEM.findall(shell):
        add(f, 'sw.js', v)
    lab = read('proto/lab.js')
    labv = re.search(r"const LAB_V = (\d+|'[0-9a-f]{10}');", lab).group(1).strip("'")
    files = re.findall(r"'(\w+)'", re.search(r'files: \[([^\]]*)\]', lab).group(1))
    m = re.search(r"\.\.\.\[([^\]]*)\]\.map\(\s*f => `proto/\$\{f\}\.js\?v=" + VAL + r"`\s*\)", shell)  # any line breaks (Prettier)
    swlab = (re.findall(r"'(\w+)'", m.group(1)), m.group(2)) if m else ([], None)
    return refs, labv, files, swlab


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default='.', help='the copy to check (default: the source here)')
    a = ap.parse_args()
    refs, labv, files, (swfiles, swlabv) = state(a.dir)
    errs = []
    for f, uses in sorted(refs.items()):
        if len({v for _, v in uses}) > 1:
            errs.append(f'{f}: different ?v in ' + ', '.join(f'{w} v={v}' for w, v in uses))
    for f, uses in sorted(refs.items()):
        where = {w for w, _ in uses}
        if where & {'index.html', 'app.js'} and 'sw.js' not in where:
            errs.append(f'{f}: loaded by {"/".join(sorted(where))} but missing from sw.js SHELL')
    if swfiles != files:
        errs.append(f'sw.js Lab list {swfiles} differs from LAB.files {files}')
    if swlabv != labv:
        errs.append(f'sw.js Lab files use v={swlabv}, LAB_V is {labv}')
    for e in errs:
        print('✗', e)
    if errs:
        print('\nNever edit a version number to fix this (the deploy stamps them): make the references agree.')
        return 1
    print('Versions OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())

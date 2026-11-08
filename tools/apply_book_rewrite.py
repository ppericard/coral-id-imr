"""Rewords the data.json texts that followed the Coral Finder 2022 book too closely (Pierre, 2026-11-08: "if some are
left, it has to be done"). tools/book_rewrite.json lists each one: where it is ("at", a key path), a hash of its old
wording ("old") and the new one ("new"); "old5" holds the hashes of the old wording's 5-word runs, which
tests/booktext.test.js keeps out of every Coral Finder text. Same facts, page citations kept, the app's own words.

How the texts were chosen (2026-11-08): the cited pages of Pierre's PDF of the book were read with OCR, outside the
repository, and each Coral Finder criterion, summary, ID tip, look-alike source and Coral ID Key box label compared
with them: a text was reworded when it shared a run of 6 or more words with its pages, or when 80% or more of its words
(8 words or more) came in the book's order within one passage. No book text is kept in the repository, here or in the PR.

Re-runnable: a text already reworded is left as it is; a text that is neither the old nor the new wording stops the run
(someone changed it since: check it by hand). tools/build_extra.py holds the same new wording for the bonus genera.

    python3 tools/apply_book_rewrite.py           # apply to data.json (written with tools/datajson.py)
    python3 tools/apply_book_rewrite.py --check   # exit 1 when a listed text still has its old wording
"""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MAP = os.path.join(HERE, 'book_rewrite.json')


def h(s):
    return hashlib.sha256(s.encode()).hexdigest()[:16]


def rewrite(d, entries=None, check=False):
    """Applies the map to data d in place; returns (changed, already). check: count only, change nothing."""
    entries = json.load(open(MAP))['rewrites'] if entries is None else entries
    changed = already = 0
    for e in entries:
        *path, last = e['at']
        o = d
        for k in path: o = o[k]
        cur = o[last]
        if cur == e['new']:
            already += 1
        elif h(cur) == e['old']:
            if not check: o[last] = e['new']
            changed += 1
        else:
            raise SystemExit(f"{'/'.join(map(str, e['at']))}: neither the old nor the new wording, check by hand: {cur!r}")
    return changed, already


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    from datajson import dump
    path = os.path.join(HERE, '..', 'data.json')
    d = json.load(open(path))
    n, done = rewrite(d, check='--check' in sys.argv)
    if '--check' in sys.argv:
        print(f'{n} texts still worded like the book, {done} reworded')
        sys.exit(1 if n else 0)
    dump(d, path)
    print(f'{n} texts reworded, {done} already')

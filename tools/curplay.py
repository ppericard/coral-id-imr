#!/usr/bin/env python3
"""The players' copy of Pierre's curation (Pierre, 2026-11-09: "a smaller curation file for players, built at deploy").

curation.json holds Pierre's choices for the app and his own admin's working state: the coral and fish auto-sort logs,
the fish judging tags and ease. The app reads only part of it (app.js curFetch), so the deploy (pages.yml) writes
curation-play.json beside it, from it, with what the app never reads left out; curation.json itself is never changed
(rule A1) and the admin keeps reading it whole. The smokes write it too (tests/calm.js), and tests/curplay.test.js
checks that the app builds the same games from both files and that no player script reads a field this drops.

Left out (none of them read by any script index.html loads, nor by the Lab):
- auto: the coral auto-sort's log (autosort.js, the admin's agreement window);
- fish.tags, fish.ease: the fish judging pass's tags and ease as Pierre corrected them (the admin's review pages; the
  game reads a photo's ease and tags from fish-game.json);
- fish.kept: the re-judge proposals Pierre answered Keep mine (admin-light.js, the admin's Light proposals);
- fish.auto, except its undone automatic adds (log code '-a…'), the one part the app reads (core.js fishGone).

  python3 tools/curplay.py [DIR]   reads DIR/curation.json, writes DIR/curation-play.json (DIR: the repository)
"""
import json
import os
import sys

DROP = ('auto',)
FISH_DROP = ('tags', 'ease', 'kept')


def slim(cur):
    out = {k: v for k, v in cur.items() if k not in DROP}
    fish = cur.get('fish')
    if isinstance(fish, dict):
        f = {k: v for k, v in fish.items() if k not in FISH_DROP and k != 'auto'}
        auto = {}
        for day, log in (fish.get('auto') or {}).items():
            undone = {p: c for p, c in (log or {}).items() if str(c).startswith('-a')}
            if undone:
                auto[day] = undone
        if auto:
            f['auto'] = auto
        out['fish'] = f
    return out


def main(argv):
    root = argv[1] if len(argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    with open(os.path.join(root, 'curation.json'), encoding='utf-8') as fh:
        cur = json.load(fh)
    s = slim(cur)
    text = json.dumps(s, ensure_ascii=False, separators=(',', ':'))
    tmp = os.path.join(root, 'curation-play.json.tmp')
    with open(tmp, 'w', encoding='utf-8') as fh:
        fh.write(text + '\n')
    os.replace(tmp, os.path.join(root, 'curation-play.json'))
    full = len(json.dumps(cur, ensure_ascii=False, separators=(',', ':')))
    print(f'curation-play.json: {len(text):,} characters ({full:,} in curation.json, compact)')


if __name__ == '__main__':
    main(sys.argv)

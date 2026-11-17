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
- fish.kept: the proposals Pierre answered Keep mine (the re-judge's, by photo: admin-light.js, the admin's Light
  proposals; the default cover rule's, by node: admin-covers.js, Cover proposals);
- fish.auto, except its undone automatic adds (log code '-a…'), the one part the app reads (core.js fishGone);
- the same in every tree subject's part (TREE_PARTS: seaslug.tags, seaslug.ease… as fish.tags, fish.ease…; the game
  reads them from seaslug-game.json, tools/seaslug_game.py);
- in each subject's content map (content at the top for the corals, fish.content; the content editor's edits, Pierre,
  2026-11-15, Q359, Q366), every entry's was, t and by: the app applies v and shows src (core.js contentApply), the
  admin alone compares was with the base.

  python3 tools/curplay.py [DIR]   reads DIR/curation.json, writes DIR/curation-play.json (DIR: the repository)
"""
import json
import os
import sys

DROP = ('auto',)
FISH_DROP = ('tags', 'ease', 'kept')
# Every tree subject's part of curation.json (core.js SUBJECTS admin.cur: the fish's, the sea slugs'), slimmed alike
# (tests/curplay.test.js holds the list to core.js).
TREE_PARTS = ('fish', 'seaslug')
ENTRY_KEEP = ('v', 'src')


def slim_entry(e):
    return {k: e[k] for k in ENTRY_KEEP if k in e} if isinstance(e, dict) else e


def slim_content(c):
    """A content map with each node and pair entry cut to v and src."""
    if not isinstance(c, dict):
        return c
    out = dict(c)
    if isinstance(c.get('nodes'), dict):
        out['nodes'] = {
            i: ({s: slim_entry(e) for s, e in m.items()} if isinstance(m, dict) else m) for i, m in c['nodes'].items()
        }
    if isinstance(c.get('pairs'), dict):
        out['pairs'] = {p: slim_entry(e) for p, e in c['pairs'].items()}
    return out


def slim(cur):
    out = {k: v for k, v in cur.items() if k not in DROP}
    if 'content' in out:
        out['content'] = slim_content(out['content'])
    for key in TREE_PARTS:
        fish = cur.get(key)
        if not isinstance(fish, dict):
            continue
        f = {k: v for k, v in fish.items() if k not in FISH_DROP and k != 'auto'}
        if 'content' in f:
            f['content'] = slim_content(f['content'])
        auto = {}
        for day, log in (fish.get('auto') or {}).items():
            undone = {p: c for p, c in (log or {}).items() if str(c).startswith('-a')}
            if undone:
                auto[day] = undone
        if auto:
            f['auto'] = auto
        out[key] = f
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

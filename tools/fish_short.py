"""fish-game.json's short form (Pierre, 2026-11-09: "observation id + extension instead of full URLs"), one place for
the tools (tools/fish_game.py writes it, tools/photos.py reads it); core.js fishGameRow is its copy for the app, the
admin and the sheet.

A record's o, an iNaturalist observation's address, is written as its id alone ("293039135"); its src, the original
photo on iNaturalist's open-data bucket, as its extension alone ("jpg") when the photo is the record's own (its id is
the one in the record's name: pid). Any other address (FishBase, or a photo filed under another id) stays whole. full()
gives a record its addresses back, key order kept, so full(short(p)) == p; a record already whole is left as it is.
"""
import re

OBS = 'https://www.inaturalist.org/observations/'
PHOTO = 'https://inaturalist-open-data.s3.amazonaws.com/photos/'
OBS_RE = re.compile(re.escape(OBS) + r'(\d+)')
PHOTO_RE = re.compile(re.escape(PHOTO) + r'(\d+)/original\.([a-z0-9]{2,5})')
ID_RE = re.compile(r'\d+')
EXT_RE = re.compile(r'[a-z0-9]{2,5}')


def pid_num(f):
    """The iNaturalist photo id in a record's name (core.js fishPid 'i<id>'), or None."""
    f = str(f)
    m = re.fullmatch(r'fi(\d+)', f) or re.search(r'-cand-(\d+)[cd]?$', f)
    return m.group(1) if m else None


def short(p):
    out = {}
    for k, v in p.items():
        if k == 'o' and isinstance(v, str) and OBS_RE.fullmatch(v):
            v = OBS_RE.fullmatch(v).group(1)
        elif k == 'src' and isinstance(v, str):
            m = PHOTO_RE.fullmatch(v)
            if m and m.group(1) == pid_num(p.get('f')):
                v = m.group(2)
        out[k] = v
    return out


def full(p):
    if not isinstance(p, dict):
        return p
    out = {}
    for k, v in p.items():
        if k == 'o' and isinstance(v, str) and ID_RE.fullmatch(v):
            v = OBS + v
        elif k == 'src' and isinstance(v, str) and EXT_RE.fullmatch(v) and pid_num(p.get('f')):
            v = PHOTO + pid_num(p.get('f')) + '/original.' + v
        out[k] = v
    return out


def full_doc(d):
    """fish-game.json as read, every record whole (either form)."""
    if not isinstance(d, dict) or not isinstance(d.get('photos'), dict):
        return d
    return {**d, 'photos': {t: [full(p) for p in (L or [])] for t, L in d['photos'].items()}}

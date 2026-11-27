"""REE-241 (Q457) study: the two true worlds of the app-world check (tools/learnsim.js --truth FILE), one per hypothesis.

    python3 tools/studies/ree241/truth.py ROOT SUBJECT STATS.json OUT_DIR

Each photo's true difficulty is its base unit's offset in the sheet's own ratings (STATS gd: the fish family, the sea
slug genus; 0 for a unit with none) plus 0.3 logit (core.js CALIB.ease, the measured slope within a family) for each
point of judged ease below a centre:
- cen (Q457 holds): the centre is the mean judged ease of the photo's family, so the ease ranks photos within a family
  only and the families differ by their offsets alone (the REE-85 study: between families the ease predicts nothing);
- unc (the app before Q457 holds): the centre is 3 for every photo, so a family whose photos are judged harder is harder.
A photo with no judged ease is its unit's offset. The family of a photo: its species' family (a genus-level photo, gl:
its genus's), as core.js treeGen; its base unit: the family (fish) or its genus (the sea slugs, SUBJECTS unitRank).
Writes OUT_DIR/truth-SUBJECT-cen.json and truth-SUBJECT-unc.json ({photos: {file: d}, gd: {unit: offset}}) and prints
each family's mean ease and the two worlds' mean difficulty. Read-only: the repo's files and a saved stats reply.
"""
import json
import statistics as st
import sys

root, subject, stats_path, out = sys.argv[1:5]
TREE = {'fish': ('fish.json', 'fish-game.json'), 'seaslug': ('seaslug.json', 'seaslug-game.json')}[subject]
SLOPE = 0.3  # core.js CALIB.ease
F = json.load(open(f'{root}/{TREE[0]}'))
G = json.load(open(f'{root}/{TREE[1]}'))['photos']
gd = {k: v[0] for k, v in (json.load(open(stats_path)).get('gd') or {}).items()}
fam_of, gen_of, gfam = {}, {}, {}
for f in F['families']:
    for s in f.get('species', []):
        fam_of[s] = f['id']
for g in F.get('genera', []):
    gfam[g['id']] = g.get('family')
    for s in g.get('species', []):
        gen_of[s] = g['id']
rows = {}
for L in G.values():
    for p in L:
        if p['f'] in rows:
            continue
        if p.get('gl'):
            fid, gid = gfam.get(p.get('sp')), p.get('sp')
        else:
            fid, gid = fam_of.get(p.get('sp')), gen_of.get(p.get('sp'))
        if not fid:
            continue
        base = fid if subject == 'fish' else gid
        rows[p['f']] = (fid, base, p.get('e'))
by_fam = {}
for fid, base, e in rows.values():
    if e:
        by_fam.setdefault(fid, []).append(e)
mid = {k: st.mean(v) for k, v in by_fam.items()}
for arm in ('cen', 'unc'):
    photos = {}
    for f, (fid, base, e) in rows.items():
        o = gd.get(base, 0)
        c = mid.get(fid, 3) if arm == 'cen' else 3
        photos[f] = round(o + (SLOPE * (c - e) if e else 0), 4)
    json.dump({'photos': photos, 'gd': gd}, open(f'{out}/truth-{subject}-{arm}.json', 'w'))
    print(arm, 'photos', len(photos), 'mean difficulty %.3f' % st.mean(photos.values()))
print('families', len(mid), 'photo-weighted mean ease %.3f' % st.mean([e for v in by_fam.values() for e in v]))

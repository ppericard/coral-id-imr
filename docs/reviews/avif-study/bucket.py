# Size today's R2 bucket from a random HEAD sample (coral and fish apart), plus the photos in img/.
import sys, os, json, random, urllib.request, concurrent.futures as cf
WT = sys.argv[1]; OUT = sys.argv[2]
sys.path.insert(0, os.path.join(WT, 'tools'))
os.chdir(WT)
import photos
recs = photos.records()
on = photos.online(recs); tiles = photos.tiles(recs)
fishset = set(photos.records(files=('fish-game.json',)))
coral = sorted(f for f in on if f not in fishset); fish = sorted(f for f in on if f in fishset)
random.seed(20261115)
cs = random.sample(coral, 300); fs = random.sample(fish, 400); ts = random.sample(sorted(tiles), 150)


def head(u):
    for k in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(u, method='HEAD', headers=photos.UA), timeout=30)
            return int(r.headers['Content-Length'])
        except Exception:
            pass
    return None


jobs = [(g, f, s) for g, L in (('coral', cs), ('fish', fs)) for f in L for s in photos.SUFFIXES] + [('tile', f, '-x') for f in ts]
res = {}
with cf.ThreadPoolExecutor(8) as ex:
    futs = {ex.submit(head, photos.url(f, s)): (g, f, s) for g, f, s in jobs}
    for fu in cf.as_completed(futs):
        g, f, s = futs[fu]
        res.setdefault(g, {}).setdefault(f, {})[s] = fu.result()
json.dump({'n': {'coral': len(coral), 'fish': len(fish), 'tiles': len(tiles)}, 'heads': res}, open(OUT, 'w'))
print({g: len(v) for g, v in res.items()}, 'missing', sum(1 for g in res for f in res[g] for s, b in res[g][f].items() if b is None))

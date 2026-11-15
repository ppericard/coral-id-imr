# Today's bucket from the HEAD sample: mean bytes per file per size, scaled to the real counts, with a bootstrap 95% range.
import sys, json, random, os
d = json.load(open(sys.argv[1])); IMG = sys.argv[2]
N = d['n']; H = d['heads']
SUF = ['', '-m', '-s', '-t']
random.seed(1)
tot = {}
for g in ('coral', 'fish'):
    F = list(H[g].values())
    per = {s: sum(x[s] for x in F) / len(F) for s in SUF}
    photo = sum(per.values())
    boots = []
    for _ in range(999):
        S = [random.choice(F) for _ in F]
        boots.append(sum(sum(x[s] for s in SUF) for x in S) / len(S) * N[g])
    boots.sort()
    tot[g] = photo * N[g]
    print(g, N[g], 'photos; mean KB per size', {s or '1600': round(per[s] / 1024, 1) for s in SUF}, 'per photo', round(photo / 1024, 1),
          'KB; total GB', round(photo * N[g] / 1e9, 2), '95%', round(boots[24] / 1e9, 2), round(boots[974] / 1e9, 2))
    print('   share of bytes per size', {s or '1600': round(per[s] / photo * 100, 1) for s in SUF})
T = list(H['tile'].values())
tm = sum(x['-x'] for x in T) / len(T)
print('tiles', N['tiles'], 'mean KB', round(tm / 1024, 1), 'total MB', round(tm * N['tiles'] / 1e6, 1))
git = sum(os.path.getsize(os.path.join(IMG, f)) for f in os.listdir(IMG) if f.endswith('.webp'))
print('img/ (also mirrored on R2):', round(git / 1e6, 1), 'MB')
print('TOTAL GB', round((tot['coral'] + tot['fish'] + tm * N['tiles'] + git) / 1e9, 2))

# Near-duplicate photos within each genus, crops included (same lecture photo on two slides, the same iNat photo
# imported twice...). Writes dups.json {"dup": [{genus, keep, f: [others], note}]}, listed in the admin Triage
# (Keep / Exclude). Only suggestions: nothing is hidden or excluded automatically (Pierre's rule).
# Keep = IMR first, then Pierre's own, then the larger image.
import json, os, sys
import numpy as np
from PIL import Image
from numpy.lib.stride_tricks import sliding_window_view as win
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, 'tools'))
from excluded import excluded
from datajson import load_all
d = load_all()  # data.json + the candidates waiting in cand.json

def photos(n):
    g = d['gen'][n]; out = {}
    for s in ('views', 'more'):
        for L in (g.get(s) or {}).values():
            for p in L: out[p['f']] = p
    for p in d['course'].get(n, []) + (d.get('cand') or {}).get(n, []): out[p['f']] = p
    return {f: p for f, p in out.items() if not excluded(f) and os.path.exists(f'{R}/img/{f}-s.webp')}

def load(f):
    im = Image.open(f'{R}/img/{f}-s.webp').convert('RGB')
    return im

def hist(im):
    a = np.asarray(im.resize((32, 32)).convert('HSV'), dtype=np.int32)
    h = np.histogram2d(a[..., 0].ravel() // 16, a[..., 1].ravel() // 32, bins=[16, 8], range=[[0, 16], [0, 8]])[0].ravel()
    return h / h.sum()

def gray(im, w):
    h = max(8, round(im.height * w / im.width))
    a = np.asarray(im.convert('L').resize((w, h), Image.BILINEAR), dtype=np.float32)
    return a

def ncc(big, tpl):
    """Best normalised cross-correlation of tpl anywhere inside big."""
    th, tw = tpl.shape
    if big.shape[0] < th or big.shape[1] < tw: return -1
    t = (tpl - tpl.mean()); tn = np.sqrt((t * t).sum()) + 1e-6
    W = win(big, (th, tw))
    m = W.mean(axis=(2, 3), keepdims=True); Z = W - m
    num = (Z * t).sum(axis=(2, 3)); den = np.sqrt((Z * Z).sum(axis=(2, 3))) * tn + 1e-6
    return float((num / den).max())

def same(a, b, base=40):
    """Best match of the centre of one photo inside the other, at a few zooms (crops of the same shot)."""
    best = -1
    for A, B in ((a, b), (b, a)):
        ta = gray(A, base); c = ta[ta.shape[0] // 5: -ta.shape[0] // 5 or None, ta.shape[1] // 5: -ta.shape[1] // 5 or None]
        for k in (1, 1.15, 1.35, 1.6):
            best = max(best, ncc(gray(B, round(base * k)), c))
            if best > TH: return best
    return best

TH = .93; TH2 = .93
def rank(p):
    return (0 if p.get('imr') else 1 if p.get('own') else 2)

out = []
for n in d['gen']:
    P = photos(n); fs = sorted(P); ims = {f: load(f) for f in fs}; H = {f: hist(ims[f]) for f in fs}
    groups = []
    for i, a in enumerate(fs):
        for b in fs[i + 1:]:
            if np.minimum(H[a], H[b]).sum() < .6: continue
            if same(ims[a], ims[b]) <= TH: continue
            s = same(ims[a], ims[b], 96)   # check again in finer detail
            if s > TH2: groups.append((a, b, s)); print('  ', n, a, b, round(s, 3), round(float(np.minimum(H[a], H[b]).sum()), 2), flush=True)
    # merge pairs into groups
    G = []
    for a, b, s in groups:
        hit = [x for x in G if a in x or b in x]; g = set([a, b]).union(*hit)
        G = [x for x in G if x not in hit] + [g]
    for g in G:
        L = sorted(g, key=lambda f: (rank(P[f]), -ims[f].width * ims[f].height, f))
        keep = L[0]
        note = 'near-identical' + (' (slides ' + ', '.join(str(P[f]['slide']) for f in L if P[f].get('slide')) + ')' if any(P[f].get('slide') for f in L) else '')
        out.append({'genus': n, 'keep': keep, 'f': L[1:], 'note': note})
        print(n, keep, L[1:], note, flush=True)
json.dump({'dup': out}, open(f'{R}/dups.json', 'w'), indent=1)
print(len(out), 'groups')

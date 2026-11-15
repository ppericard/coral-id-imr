# JPEG XL on a subsample at 480 and 240 px (ffmpeg's libjxl, effort 7), against the same WebP and AVIF numbers: bytes at
# the WebP's SSIMULACRA2 score. One line per photo and size into jxl.jsonl.
import sys, os, io, json, subprocess, tempfile, math
WT, DATA = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(WT, 'tools'))
import photos
from PIL import Image
from ssimulacra2 import compute_ssimulacra2 as s2
R = {json.loads(l)['f']: json.loads(l) for l in open(os.path.join(DATA, 'results.jsonl'))}
S = [x for x in json.load(open(os.path.join(DATA, 'sample.json'))) if x['group'] != 'coral-lecture' and x['f'] in R]
S = S[::2]
DIST = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0]
out = open(os.path.join(DATA, 'jxl.jsonl'), 'w')
tmp = tempfile.mkdtemp(dir=DATA)
for x in S:
    orig = Image.open(os.path.join(DATA, 'src', x['f'] + '.bin')).convert('RGB')
    base = photos.turn(orig, x.get('cr'), x.get('ro'))
    for w, suf in ((480, '-s'), (240, '-t')):
        ref = base.copy(); ref.thumbnail((w, w))
        rp = os.path.join(tmp, 'ref.png'); ref.save(rp)
        row = {'f': x['f'], 'size': suf, 'jxl': {}}
        for d in DIST:
            jp, dp = os.path.join(tmp, 'a.jxl'), os.path.join(tmp, 'a.png')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', rp, '-c:v', 'libjxl', '-distance', str(d), '-effort', '7', jp], check=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', jp, '-pix_fmt', 'rgb24', dp], check=True)
            row['jxl'][d] = {'bytes': os.path.getsize(jp), 's2': round(s2(rp, dp), 3)}
        out.write(json.dumps(row) + '\n'); out.flush()
print('done', len(S))

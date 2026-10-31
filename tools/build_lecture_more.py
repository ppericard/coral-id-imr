# Extra IMR Lecture 6 photos: tools/lecture_more.tsv (slide image id, genus, view) -> site/img/imrl-*.webp + lecture_more.json.
# Uses the full-res deck media when a perceptual match exists (imr2/fullmatch.json), else the Google Slides copy. Skips duplicates of course photos.
import json, os, re
from PIL import Image
B = '/tmp/claude-0/-home-user/e7a1fa5c-66fa-51e9-8745-ab3d5edc1938/scratchpad/'
OUT = B + 'v3/site/img/'
def ahash(im):
    px = list(im.convert('L').resize((16, 16)).getdata()); m = sum(px) / len(px); return [x > m for x in px]
slide = {m.group(2): int(m.group(1)) for m in re.finditer(r'## Slide (\d+) \((p\w+)\)', open(B + 'pptx/slides_text.md').read())}
full = json.load(open(B + 'imr2/fullmatch.json'))
have = [ahash(Image.open(OUT + f)) for f in os.listdir(OUT) if f.startswith('imr-') and f.endswith('-s.webp')]
out = {}
for line in open(B + 'v3/lecture_more.tsv'):
    if not line.strip() or line.startswith('#'): continue
    oid, g, v = line.split()
    m = full.get(oid)
    src = Image.open(B + 'media/' + m[0] if m and m[1] <= 30 else B + f'imr2/raw/{oid}.img').convert('RGB')
    hs = ahash(src)
    if any(sum(a != b for a, b in zip(hs, h)) <= 20 for h in have): continue
    have.append(hs)
    base = 'imrl-' + oid
    for w, suf in ((1600, ''), (480, '-s')):
        t = src.copy(); t.thumbnail((w, w)); t.save(OUT + f'{base}{suf}.webp', 'WEBP', quality=80)
    out.setdefault(g, []).append({'f': base, 'imr': True, 'slide': slide.get(oid.split('_')[0]), 'v': v})
json.dump(out, open(B + 'v3/lecture_more.json', 'w'), indent=0)
print(sum(map(len, out.values())), 'photos for', len(out), 'genera')

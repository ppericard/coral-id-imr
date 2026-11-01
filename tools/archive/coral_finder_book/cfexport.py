# Export the cropped Coral Finder book photos to img/ (WebP full + -s 480 px) and list them in data.json as g.book.
import json, cv2, os
R='/home/user/coral-id-imr/'
M=json.load(open('cfwork/meta.json')); d=json.load(open(R+'data.json'))
for g in d['gen'].values(): g.pop('book',None)
n=0
for m in M:
    gen=m['gen']
    if gen not in d['gen']: print('skip',gen); continue
    im=cv2.imread(m['f']); h,w=im.shape[:2]
    if min(h,w)<160: continue
    page=int(m['pg'][1:])-5
    f=f"{gen.lower()}-cf-{page}-{m['tag'].replace('_','')}"
    big=im if max(h,w)<=1600 else cv2.resize(im,None,fx=1600/max(h,w),fy=1600/max(h,w),interpolation=cv2.INTER_AREA)
    cv2.imwrite(R+f'img/{f}.webp',big,[cv2.IMWRITE_WEBP_QUALITY,72])
    s=480/max(h,w); sm=cv2.resize(im,None,fx=s,fy=s,interpolation=cv2.INTER_AREA) if s<1 else im
    cv2.imwrite(R+f'img/{f}-s.webp',sm,[cv2.IMWRITE_WEBP_QUALITY,70])
    d['gen'][gen].setdefault('book',[]).append({'f':f,'cf':1,'pg':page,'view':'wide' if m['col']==0 else 'medium','t':gen,'o':f'cf-{page}'})
    n+=1
json.dump(d,open(R+'data.json','w'),ensure_ascii=False,separators=(',',':'))
print(n)

# Builds site/data.json from the curated genus data, the photo views and the lecture photos.
import json, os
from PIL import Image
B='/tmp/claude-0/-home-user/e7a1fa5c-66fa-51e9-8745-ab3d5edc1938/scratchpad/'
d=json.load(open(B+'app/data.json'))
V=json.load(open(B+'v3/views2.json'))
CV=json.load(open(B+'v3/covers.json'))
course_src=json.load(open(B+'course.json'))
gen={}
for g,v in d['gen'].items():
    gen[g]={k:v[k] for k in ('fam','crit','look','pages','tr','n','ig','imr','mn')}
    gen[g]['views']={view:[{k:p[k] for k in ('f','a','lic','o','t','own','src')} for p in V[g][view]] for view in ('wide','medium','macro')}
FULL=json.load(open(B+'course_fullres.json'))
UNMATCHED={'p35_i9','p35_i12','p48_i9','p50_i8','p51_i7','p52_i8','p63_g188'}
course={}
for g,L in course_src.items():
    for p in L:
        base=os.path.basename(p['f'])[:-4]
        full=base[4:] not in UNMATCHED
        src=Image.open(B+('media/'+FULL[p['f']] if full else 'app/'+p['f'])).convert('RGB')
        for w,suf in ((1600,''),(480,'-s')):
            t=src.copy(); t.thumbnail((w,w)); t.save(B+f'v3/site/img/{base}{suf}.webp','WEBP',quality=80)
        course.setdefault(g,[]).append({'f':base,'imr':True,'slide':p['s']})
for f in os.listdir(B+'v3/site/img'):
    if f.endswith('.jpg'): os.remove(B+'v3/site/img/'+f)
terms=[['Septa','Radial skeletal plates projecting inward from the corallite wall towards its centre.'],['Costae','Radial skeletal ribs outside the corallite wall, often continuing the septa.'],['Wall (theca)','Skeletal boundary around a corallite; separate or shared with neighbouring corallites.'],['Coenosteum','Porous skeleton between corallites; in some taxa it also builds their walls.'],['Corallite','The skeleton produced by one polyp.'],['Oral disc','Soft tissue around the mouth, inside the ring of tentacles.'],['Paliform lobes','Upright projections from the inner edges of the septa; may form a crown around the columella (central skeletal structure).'],['Mouth','Opening at the centre of the oral disc, leading to the digestive cavity.']]
tips=['Find the polyp mouth: is it raised or embedded?','Read the wall structure: shared, separate, or indistinguishable.','No visible walls? Look at the skeletal ornament: beads, spines, parallel striations.','Check the scale: corallites in mm or in cm?']
# Points where the IMR lecture and Coral Finder disagree, or the lecture slides are silent: to check with an IMR instructor.
checks={'Plerogyra':'Family: the IMR lecture puts Plerogyra in Euphylliidae; Coral Finder lists it in Plerogyridae.',
 'Herpolitha':'The IMR lecture calls Herpolitha solitary; Coral Finder treats it as colonial (several mouths along the central furrow).',
 'Merulina':'Not on the lecture slides: the criteria here come from Coral Finder only. It may have been covered orally.',
 'Cyphastrea':'Not on the lecture slides: the criteria here come from Coral Finder only. It may have been covered orally.',
 'Halomitra':'Not on the lecture slides: the criteria here come from Coral Finder only. It may have been covered orally.'}
for g,t in checks.items(): gen[g]['check']=t
for g in gen:
    if g in CV['covers']: gen[g]['cover']=CV['covers'][g]
    if g in CV['levels']: gen[g]['levels']=2
out=dict(gen=gen,key=d['key'],imrg=d['imrg'],traits=d['traits'],course=course,terms=terms,tips=tips)
json.dump(out,open(B+'v3/site/data.json','w'),ensure_ascii=False,separators=(',',':'))
gaps={g:[v for v in ('wide','medium','macro') if len(gen[g]['views'][v])<2] for g in gen}
print({g:x for g,x in gaps.items() if x})

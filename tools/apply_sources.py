# Ties the corallite clues and the glossary to the IMR lecture and the Coral Finder (no invented classes).
# Run once on data.json: python3 tools/apply_sources.py
import json
P='data.json'
d=json.load(open(P))
# Corallite size: the thresholds used by the Coral Finder boxes (B2/B3 2 mm; S1/S2 and S4/S5 8 mm).
# Old classes were <2, 2-5, 5-10, >10 mm. Per genus, from the corallite sizes given on its Coral Finder page(s).
SIZE={'Acropora':'s1 s2','Pocillopora':'s1','Stylophora':'s1','Anacropora':'s1','Seriatopora':'s1','Porites':'s1',
 'Tubastraea':'s2 s3','Echinopora':'s2','Astreopora':'s1 s2','Galaxea':'s2 s3','Turbinaria':'s2','Mycedium':'s2',
 'Lobophyllia':'s3','Pavona':'s2','Pachyseris':'s2','Pectinia':'s3','Platygyra':'s2 s3','Leptoria':'s2',
 'Goniopora':'s1 s2','Plerogyra':'s3','Montipora':'s1','Hydnophora':'s2','Fungia':'s3','Lithophyllon':'s3',
 'Danafungia':'s3','Ctenactis':'s3','Lobactis':'s3','Herpolitha':'s3','Heliofungia':'s3','Dipsastraea':'s2 s3',
 'Astrea':'s2','Diploastrea':'s3','Goniastrea':'s2','Favites':'s2','Duncanopsammia':'s3','Alveopora':'s1 s2',
 'Merulina':'s2','Cyphastrea':'s1 s2','Halomitra':'s3'}
for g,v in d['gen'].items():
    v['tr']=SIZE[g].split()+[t for t in v['tr'] if t not in ('s1','s2','s3','s4')]
T={t['id']:t for t in d['traits']}
T['size'].update(name='Corallite size',note='Thresholds of the Coral Finder boxes (2 mm for branching, 8 mm for massive). IMR tip: is the corallite in mm or in cm?',
 opts=[{'id':'s1','t':'< 2 mm','src':'Coral Finder, box B2'},{'id':'s2','t':'2-8 mm','src':'Coral Finder, boxes B3, S1, S4'},{'id':'s3','t':'> 8 mm','src':'Coral Finder, boxes S2, S5, S6'}])
# Walls: the three wall structures of IMR Lecture 6 (slides 14-15), plus lecture groups 5 and 8.
T['wall'].update(name='Corallite walls',note='IMR Lecture 6: recognise the wall structure (shared, separate, indistinguishable).',
 opts=[{'id':'plo','t':'Separate walls','src':'IMR Lecture 6, slide 14: neighbouring corallites do not share a common wall'},
  {'id':'cer','t':'Shared walls','src':'IMR Lecture 6, slide 14: neighbouring corallites share a common wall'},
  {'id':'none','t':'Indistinguishable walls (septo-costae)','src':'IMR Lecture 6, slide 14: no clear wall structure, septo-costae'},
  {'id':'mea','t':'Meandering ridges / valleys','src':'IMR lecture group 5'},
  {'id':'solo','t':'Solitary','src':'IMR lecture group 8'}])
SRC={'axial':('Axial corallite at branch tips','IMR Lecture 6 (Acropora); Coral Finder p. 1-4'),
 'verruc':('Verrucae (skeletal bumps)','IMR Lecture 6 (Pocillopora); Coral Finder p. 6'),
 'hood':('Hooded corallites','IMR Lecture 6 (Stylophora); Coral Finder p. 5'),
 'monti':('Monticules (conical mounds)','IMR Lecture 6 (Hydnophora); Coral Finder p. 11'),
 'pali':('Paliform lobes','IMR Lecture 6 (Platygyra lacks them); Coral Finder p. 17-18, 23, 32'),
 'spines':('Beads or spines between corallites','IMR Lecture 6, ID tips (beads, spines); Coral Finder p. 9, 25'),
 'smooth':('Smooth surface between corallites','IMR Lecture 6 (Montipora); Coral Finder p. 45 (Turbinaria)'),
 'tube':('Tubular corallites','IMR Lecture 6 (Astreopora: cylindrical corallites); Coral Finder p. 9-11'),
 'teeth':('Large septal teeth','IMR Lecture 6 (Lobophyllia, Danafungia, Ctenactis); Coral Finder p. 14, 63'),
 'polyp':('Polyps extended by day','IMR lecture group 6'),
 'vesic':('Grape-like vesicles','IMR Lecture 6 (Plerogyra)'),
 'mouth':('Axial furrow with one or more mouths','IMR Lecture 6 (Ctenactis); Coral Finder p. 65'),
 'azoo':('Azooxanthellate (shade, overhangs)','Coral Finder p. 10, 73 (Tubastraea)')}
T['feat'].update(name='Other features',note='Features named in IMR Lecture 6 or the Coral Finder; each shows its source.')
for o in T['feat']['opts']: o['t'],o['src']=SRC[o['id']]
# Glossary: IMR Lecture 6 wording first (slides 13-14), then the Corals of the World glossary.
d['terms']=[['Septa','Vertical blades inside the coral’s cup-like corallite.','IMR Lecture 6, slide 13'],
 ['Costae','When septa cross the wall of the corallite they become costae.','IMR Lecture 6, slide 13'],
 ['Wall','The corallite wall separates septa from costae, and corallite from corallite.','IMR Lecture 6, slide 13'],
 ['Coenosteum','Space between separate walls.','IMR Lecture 6, slide 13'],
 ['Septo-costae','Where there is no clear wall structure; colonies are then identified by their skeletal ornaments.','IMR Lecture 6, slide 14'],
 ['Corallite','The skeleton of one polyp.','Corals of the World glossary'],
 ['Paliform lobes','Upright skeletal lobes at the inner margin of the septa.','Corals of the World glossary'],
 ['Mouth','Identify the mouth of the coral polyp: is it raised or embedded?','IMR Lecture 6, slide 15']]
json.dump(d,open(P,'w'),ensure_ascii=False,separators=(',',':'))

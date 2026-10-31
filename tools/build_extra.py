# Builds data.json "x": genera that are NOT on the IMR slate but are in the Coral Finder 2022 book AND present at Dauin
# (Pierre, 2026-10-31: the IMR list is not exhaustive; rare genera can turn up on dives or photos). Shown only in the
# Identify > Coral Finder (on by default, switch in ⚙), never in games, quizzes, progress or the Genera pages.
# Presence at Dauin (Pierre's rule): at least one iNaturalist observation within 40 km of Dauin that is Research Grade,
# or that 2+ people identified to this genus independently. Every text comes from the Coral Finder book page(s)
# cited in "pages"; boxes come from the book's A-Z index pages placed in the front-page key ranges.
# Photos: iNaturalist, open licences, Dauin first then the Philippines, shown straight from iNaturalist (r: 1).
# Run from the repo root: python3 tools/build_extra.py
import json, time, urllib.request
UA = {'User-Agent': 'coral-id-imr/1.0'}
LIC = 'cc-by,cc-by-nc,cc0,cc-by-sa,cc-by-nc-sa'
DAUIN, PH = 'lat=9.19&lng=123.26&radius=40', 'place_id=6873'
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))

# genus: (A-Z index pages, traits, criteria from the book, two short ID tips). Traits use the site's clue ids
# (sizes = Coral Finder box thresholds; walls = IMR slide 14 wording, set from the book's text).
X = {
 'Euphyllia': ([13, 70, 72], ['s3', 'plo', 'polyp'], ['Colony of stalked corallites (phaceloid) branching from a shared base, with separate walls.', 'Corallites 15-30 mm, septa clean and smooth, often hidden by tentacles.', 'Day tentacles are simple tubes (anemone-like); Fimbriaphyllia has more complex tentacle tips.'], ['Stalked corallites, separate walls', 'Simple tube tentacles by day']),
 'Fimbriaphyllia': ([13, 70, 72], ['s3', 'plo', 'mea', 'polyp'], ['Colonies flabello-meandroid or stalked (phaceloid); corallites with separate walls.', 'Tentacle tips complex: anchor / hammer shaped, or bubble-covered branchlets.', 'Euphyllia has simple tubular tentacles.'], ['Meandering or stalked, separate walls', 'Anchor, hammer or bubbly tentacle tips']),
 'Isopora': ([10, 45, 75], ['s1', 'axial'], ['Variable: columns, branches, ridges, encrusting skins with increasing wave action.', 'Distinctive cream-brown colour; small rounded corallites (1-2 mm) forming jumbles on the surface.', 'Often weakly developed axial corallites, sometimes in groups; close to Acropora.'], ['Cream-brown, jumbled 1-2 mm corallites', 'Weak axial corallites, sometimes several']),
 'Leptoseris': ([16, 44, 52, 57, 59], ['none'], ['Planar, dividing leafy fronds or contorted tangles or plates.', 'Corallites linked by smooth septo-costae on ONE side of the frond only (unifacial), often inclined towards the margin.', 'Pavona cactus has corallites on both sides; Leptoseris corallites are sparser.'], ['Leafy fronds, corallites on one side only', 'Sparser than Pavona']),
 'Zoopilus': ([66], ['s3', 'solo', 'mouth'], ['Colonial, free-living, irregular delicate thin sheets or domes (up to 70 cm).', 'Corallites obscure; septo-costae often meet at right angles; septal teeth tall.', 'Light, fragile skeleton, often found as piles of overlapping fragments.'], ['Thin free-living sheets, corallites obscure', 'Fragile, in overlapping fragments']),
 'Polyphyllia': ([65], ['s3', 'solo', 'mouth', 'polyp'], ['Colonial, free-living, strongly arched elongate or domed plates (up to 30 cm).', 'Daytime extended tentacles (1 cm) give a hairy / shaggy look.', 'Retracted: petal-like septa and regularly spaced mouths.'], ['Free-living, arched and hairy by day', 'Many regularly spaced mouths']),
 'Sandalolitha': ([66], ['s3', 'solo', 'mouth'], ['Colonial, free-living, circular, oval or irregular; heavy thick-walled skeleton (up to 40 cm), steeply or broadly domed.', 'Corallites 0.5-1 cm, close together, subtly inclined to the margin; septal teeth coarse and blunt.', 'Heavier than Halomitra, with closer corallites.'], ['Heavy free-living dome', 'Close corallites, coarse blunt teeth']),
 'Heliopora': ([77], ['s1'], ['Not a true hard coral: blue coral (soft coral with a skeleton).', 'Blades or slender clubs with white upper margins; a 1 mm central corallite surrounded by smaller pores.', 'Polyps clear or white with eight feathery tentacles; blue skeleton often masked by brown-grey surface colour.'], ['Blue coral: blue skeleton', 'Blades or clubs, white margins']),
 'Millepora': ([78], ['s1'], ['Not a true hard coral: fire coral (hydrozoan), it stings.', 'Massive with Porites-like nodules, or branching, plates, blades, pillars or crusts.', 'Smooth surface with extremely small pores (< 1 mm) and fine erect "hairs"; typically mustard yellow-brown with pale edges.'], ['Fire coral: mustard colour, pale edges', 'Smooth, pores barely visible, fine hairs']),
 'Tubipora': ([77], ['polyp'], ['Not a true hard coral: organ pipe coral (soft coral with a skeleton).', 'Massive or thick crusts of vertical tubes connected by horizontal plates; polyps with 8 feather-like tentacles.', 'Red skeleton, often hidden, can be seen when the tissue is retracted.'], ['Organ pipe: red tube skeleton', '8 feathery tentacles']),
 'Pleuractis': ([64], ['s3', 'solo'], ['Solitary mushroom coral with variable traits.', 'Small septal teeth; septa form wavy patterns on the surface.', 'Unattached oval with a central arch, or attached with distorted septa; Lobactis has more prominent tentacular lobes.'], ['Mushroom, wavy septa', 'Small septal teeth']),
 'Oxypora': ([46, 54, 58, 70], ['s2', 'none'], ['Thin wrinkled plates with ragged margins.', 'Corallites sparse (3-7 mm), poorly walled, not inclined, linked by coarse ornamented septo-costae.', 'Sparser, less regular than Echinopora; smaller than Echinophyllia.'], ['Thin ragged plates', 'Sparse corallites, coarse costae']),
 'Physogyra': ([21, 74], ['s3', 'cer', 'mea', 'vesic'], ['Massive or thick colonies with meandering valleys, shared walls and exsert blade-like septa.', 'Often obscured by small grape- or sock-like vesicles by day; feeding tentacles at night.', 'Plerogyra has separate walls and larger vesicles.'], ['Small vesicles over meanders', 'Shared walls, blade-like septa']),
 'Trachyphyllia': ([13, 68], ['s3', 'plo', 'mea', 'pali'], ['Small (5-15 cm) hourglass-shaped or larger convoluted colonies, giving the impression of separate walls.', 'Large paliform lobes; small septal teeth, less spiky than Lobophyllia.', 'Prefers soft sediment and inter-reef habitats.'], ['Hourglass shape on soft sediment', 'Large paliform lobes']),
 'Caulastraea': ([9, 13], ['s3', 'plo'], ['Compact or irregular branching colonies; corallites 8-15 mm on stalks, may form short meanders.', 'Bold septa / costae visible through the tissue; small septal teeth.', 'Less spiky than small Lobophyllia.'], ['Corallites on stalks, 8-15 mm', 'Bold septa, small teeth']),
 'Catalaphyllia': ([13, 68, 73], ['plo', 'mea', 'polyp'], ['Free-living (10-30 cm); meandering valleys with separate walls concealed by a fleshy mantle.', 'Anemone-like by day; colour of tentacle tips and mantle pattern distinctive.', 'Prefers soft sediment.'], ['Anemone-like, on soft sediment', 'Coloured tentacle tips']),
 'Cynarina': ([69], ['s3', 'solo', 'teeth', 'pali'], ['Solitary, attached or free-living (about 6 cm), round or nearly so.', 'Large, thick, lobed teeth visible through bubble-like translucent tissue; broad paliform lobes.', 'Colours usually distinctive; on walls, lower reef slopes and inter-reef patches.'], ['Solitary, translucent bubbly tissue', 'Large lobed teeth seen through']),
 'Cycloseris': ([67], ['s3', 'solo'], ['Solitary, free-living, circular or nearly so, typically 3-6 cm, with fine septal teeth.', 'Some domed with a concave underside, others with a strong central arch.', 'Small size and life on soft sediment are generally diagnostic.'], ['Small mushroom, 3-6 cm', 'On soft sediment']),
 'Gardineroseris': ([33], ['s2', 'cer'], ['Massive, sub-massive or thick colonies.', 'Corallites 3-7 mm in sharp-edged excavated depressions: a scalloped surface.', 'Septo-costae numerous, tightly spaced, fusing towards the mouths.'], ['Scalloped surface', 'Sharp-edged pits, 3-7 mm']),
 'Oulophyllia': ([22, 38], ['s3', 'cer', 'mea'], ['Massive, sub-massive or thick; valleys short or long, 10-20 mm wide.', 'Shared walls taper from a wide base to a narrow upper edge; regular septa with fine-medium teeth.', 'Valleys larger and wider than Platygyra; walls lower and more tapering than Pectinia.'], ['Wide valleys, walls taper to an edge', 'Wider than Platygyra']),
 'Plesiastrea': ([26], ['s2', 'plo', 'pali'], ['Massive, sub-massive or thick sheets.', 'Shallow round corallites (3-4 mm), costae may form distinct patterns; paliform lobes visible.', 'Corallites larger than Cyphastrea / Astreopora and lack their beads / spinules.'], ['Round 3-4 mm corallites, paliform lobes', 'No beads or spinules']),
 'Podabacia': ([52, 60], ['s2', 'none'], ['Encrusting, laminar or tiered.', 'Corallites 3-5 mm, weakly inclined to the margin; septo-costae with blunt teeth thicken near the centres.', 'Like Leptoseris but with more corallites and coarser textures.'], ['Plates, corallites inclined to margin', 'Coarser than Leptoseris']),
 'Echinophyllia': ([46, 55, 70], ['s2', 's3'], ['Thin plates or crusts, sometimes with a central mound.', 'Corallites 5-10 mm, round, oval or tubular, heavily ornamented costae: ragged / untidy look.', 'Corallites irregularly oriented, larger and taller than Oxypora and Echinopora; mottled colours common.'], ['Ragged plates, 5-10 mm corallites', 'Heavily ornamented costae']),
 'Leptastrea': ([26, 34], ['s2', 'plo', 'cer'], ['Massive or thick.', 'Corallites 3-5 mm, irregular in shape and size, separated by a groove and tubercles.', 'Wedge-shaped septa alternate strongly; usually pale cream / yellow.'], ['Irregular 3-5 mm corallites, grooves', 'Pale cream / yellow']),
 'Stylocoeniella': ([31], ['s1', 'spines'], ['Sub-massive, thick or thin crusts, sometimes knobbly.', 'Corallites about 1 mm, widely spaced, level with the surface; simple spines (styles) around some or all of them.', 'Like Porites but with spines; cryptic, on walls or shaded cave entrances.'], ['Tiny spaced corallites with spines', 'Shaded walls']),
 'Acanthastrea': ([14, 37], ['s3', 'plo', 'teeth'], ['Small isolated polyps, short stalks, through flabello-meandroid colonies.', 'Separate walls and large, blunt, lobed septal teeth.', 'Colour and large smooth teeth distinctive.'], ['Separate walls, big blunt teeth', 'Fleshy, often colourful']),
 'Psammocora': ([8, 15, 29, 60, 61, 76], ['s1', 'none'], ['Sub-massive, thick crusts, sheets, columns or nodules.', 'Shallow valleys of ornamental ridges hold groups of small corallites (1-4 mm) without walls.', 'Granular septo-costae form petaloid "flower" shapes; dimpled surface.'], ['Tiny wall-less corallites in groups', 'Petal-like granular septo-costae']),
}
NONSCL = {'Heliopora', 'Millepora', 'Tubipora'}

d = json.load(open('data.json'))
key = d['key']
def leaves_for(pages):
    out = []
    for p in pages:
        if p >= 77: out.append('N1'); continue
        for k in key:
            for l in k['leaves']:
                if l['a'] <= p <= l['b'] and l['id'] not in out: out.append(l['id'])
    return out

def taxon(g):
    T = [t for t in get(f'https://api.inaturalist.org/v1/taxa?q={g}&rank=genus&per_page=10')['results'] if t['name'] == g and t.get('iconic_taxon_name') == 'Animalia']
    return T[0] if T else None

def agree(o, tid):
    ids = [i for i in o.get('identifications', []) if i.get('current')]
    return len({i['user']['login'] for i in ids if i['taxon']['id'] == tid or tid in (i['taxon'].get('ancestor_ids') or [])})

out, leaf = {}, {}
for g, (pages, tr, crit, qt) in X.items():
    t = taxon(g); tid = t['id']
    fam = get(f'https://api.inaturalist.org/v1/taxa/{tid}')['results'][0]
    fam = next((a['name'] for a in fam['ancestors'] if a['rank'] == 'family'), '')
    pres = get(f'https://api.inaturalist.org/v1/observations?taxon_id={tid}&{DAUIN}&per_page=200')['results']
    rg = sum(o['quality_grade'] == 'research' for o in pres); two = sum(agree(o, tid) >= 2 for o in pres)
    if not rg and not two: print('NOT PRESENT', g); continue
    # Photos: accepted observations (Research Grade, or 2+ agreeing IDs), Dauin first, then the Philippines.
    views = {'wide': [], 'medium': [], 'macro': []}; seen = set(); n = 0
    for loc, where in (('dauin', DAUIN), ('ph', PH)):
        obs = get(f'https://api.inaturalist.org/v1/observations?taxon_id={tid}&{where}&photos=true&photo_license={LIC}&order_by=votes&per_page=100')['results']
        obs = [o for o in obs if o['quality_grade'] == 'research'] + [o for o in obs if o['quality_grade'] != 'research' and agree(o, tid) >= 2]
        for o in obs:
            if n >= 10 or o['id'] in seen: continue
            P = [p for p in o['photos'] if p.get('license_code')]
            if not P: continue
            seen.add(o['id']); n += 1
            url = f'https://www.inaturalist.org/observations/{o["id"]}'
            mk = (lambda p: dict(f=f'{g.lower()}-x-{p["id"]}', a=p['attribution'], lic=p['license_code'], o=url, t=o['taxon']['name'], own=o['user']['login'] == 'ppericard', loc=loc, src=p['url'].replace('square', 'original'), r=1))
            # An observation's first photo is usually the colony, its last a close-up (as in fetch_local.py).
            views['medium'].append(mk(P[0]))
            if len(P) > 1: views['macro'].append(mk(P[-1]))
        time.sleep(0.5)
    L = leaves_for(pages)
    for l in L: leaf.setdefault(l, []).append(g)
    out[g] = dict(fam=fam, pages=pages, tr=tr, crit=crit, qt=qt, sum=crit[0], look=[], views=views, x={'rg': rg, 'two': two, 'nonscl': g in NONSCL})
    print(g, fam, L, 'rg', rg, 'two', two, 'photos', sum(map(len, views.values())))
    time.sleep(0.5)
# Coral Finder front page: the last group (book p. 77-78) is not in the IMR key, so it is added here.
groups = [{'id': 'N', 'name': 'Blue, fire, organ pipe corals', 'sub': 'Not true hard corals: they build skeletons and look coral-like', 'color': 'other',
           'leaves': [{'id': 'N1', 't': 'Blue, fire, organ pipe, lace corals & spiculites', 's': None, 'a': 77, 'b': 78, 'g': []}]}]
d['x'] = {'gen': out, 'leaf': leaf, 'groups': groups}
json.dump(d, open('data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'genera')

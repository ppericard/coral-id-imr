# Favites and its neighbours (Pierre, 2026-11-04, after a research report on Favites): sourced "Other sources" notes,
# a corrected short description, the >8 mm size class, an IMR lecture line restored, and the WoRMS spelling of one
# family name shown beside the IMR one. The IMR lines are kept as they are (AGENTS.md rules 1-3); the notes cite only
# species recorded in the Philippines (AGENTS.md "ID cues are for the place we learn"). Re-runnable:
#   python3 tools/apply_favites.py
#
# What was checked, 2026-11-04:
# - Presence in the Philippines, by Pierre's rule (AGENTS.md rule 6e: (1) Research Grade by >= 3 distinct observers in
#   the country, (2) >= 1 Research Grade there and the Corals of the World Philippine ecoregions, (3) confirmed near
#   Dauin). iNaturalist Research Grade observations / distinct observers in the Philippines (place 6873), from the
#   presence study of 2026-11-04; every species below is in Corals of the World's Philippine ecoregions:
#   F. pentagona 6 / 3 (rule 1), F. rotundata 4 / 3 (rule 1), F. colemani 6 / 2, F. valenciennesi 2 / 2, F. vasta 2 / 2,
#   F. magnistellata 2 / 1, Paragoniastrea russelli 2 / 2, Goniastrea stelligera 2 / 2 (all rule 2). Not cited:
#   F. abdita (no Research Grade record), Dipsastraea matthaii (none). Also named in ROADMAP's IMR flags: Coelastrea
#   aspera 5 / 5 (rule 1), Paramontastraea salebrosa 1 / 1 and Dipsastraea pallida 1 / 1 (rule 2).
# - Corals of the World species factsheets (Veron; "Characters"): F. pentagona "Paliform lobes are well developed,
#   commonly forming a conspicuous crown ... Goniastrea-like"; Phymastrea colemani "A paliform crown is well developed",
#   5-8 mm; Phymastrea magnistellata 6-13 mm, "small paliform lobes are usually developed"; Phymastrea valenciennesi
#   8-15 mm; Favia rotundata 19-22 mm; F. vasta "Paliform lobes are usually present"; F. flexuosa "weakly developed";
#   Favites russelli "Paliform lobes are well developed"; G. pectinata and G. minuta "well developed"; Favia stelligera
#   "conical ... Costae ... of adjacent corallites do not join. A crown of paliform lobes is usually clearly visible".
# - WoRMS (World List of Scleractinia, 2026): Favites diagnosis (Huang et al. 2014) "Colonial, with intra- and
#   extracalicular budding ... Calice width medium (4-15 mm), but may be larger (>15 mm)", genus description "Paliform
#   lobes are often poorly developed"; Dipsastraea diagnosis "intracalicular budding only"; Favites valenciennesii and
#   F. irregularis accepted (new combination: Kishi, Johnson & Fukami 2025, Zoologica Scripta 55: 349-367); the family
#   Diploastraeidae Thiel, 1932 (no record "Diploastreidae").
# - IMR Lecture 6, slide 65 (Google Slides copy): "ambiguous wall structure ... (e.g. F. rotundata, F. magnistellata)".
import json, os
from datajson import dump  # the one data.json layout (one genus per line)

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data.json')

# genus -> field -> [(old, new)]; a pair whose old text is gone and new text is there is already applied.
FIX = {
    'Favites': {
        # Slide 65 names two species; the app had dropped the second (an omission, Pierre 2026-11-04).
        'imr': [('(shared and separate in one colony, e.g. F. rotundata);',
                 '(shared and separate in one colony, e.g. F. rotundata, F. magnistellata);')],
        # Claude-made (tools/summaries.txt), not IMR wording.
        'sum': [('Mostly shared walls (3-8 mm), sometimes separate with a shadow between; extra-tentacular budding, paliform lobes rare.',
                 'Mostly shared walls (usually 3-8 mm), sometimes separate with a shadow between; extra-tentacular budding; '
                 'paliform lobes usually weak or absent (a clear crown in a few species).')],
    },
}

INFO = {
    'Favites': [
        'Paliform lobes are often poorly developed in Favites (WoRMS genus description), but some species found in the '
        'Philippines have a clear crown: F. pentagona ("commonly forming a conspicuous crown", "Goniastrea-like") and '
        'F. colemani ("a paliform crown is well developed") (Corals of the World, Veron).',
        'Huang et al. (2014, Zoological Journal of the Linnean Society) describe Favites with both intra- and '
        'extra-tentacular budding ("intra- and extracalicular"), and Dipsastraea with intra-tentacular budding only.',
        'Corallite size of Favites species recorded in the Philippines (Corals of the World, Veron, which lists some of '
        'them under Phymastrea or Favia): 5-8 mm (F. colemani), 6-13 mm (F. magnistellata), 8-15 mm (F. valenciennesii), '
        '19-22 mm (F. rotundata). Huang et al. (2014) give 4-15 mm for the genus, sometimes more.',
        'Favites is under revision. WoRMS (2026) follows Huang et al. (2014): Favites now also takes species once placed '
        'in Montastraea / Phymastrea (F. colemani, F. valenciennesii, F. magnistellata), F. russelli moved to '
        'Paragoniastrea, and the genus is still not a natural group (also Quek et al. 2023, Molecular Phylogenetics and '
        'Evolution). In 2025 F. valenciennesii was found to hide several forms: one is now F. irregularis, others may '
        'belong to Dipsastraea (Kishi, Johnson & Fukami 2025, Zoologica Scripta).',
    ],
    'Goniastrea': [
        'Paliform lobes are well developed in Goniastrea, but a crown also forms in some look-alikes found in the '
        'Philippines: Favites pentagona, F. colemani and Paragoniastrea russelli (Corals of the World, Veron).',
        'Goniastrea stelligera (formerly Favia stelligera, moved by Huang et al. 2014), recorded in the Philippines, has '
        'conical corallites with separate walls: the costae of neighbouring corallites do not join (Corals of the World, '
        'Veron).',
    ],
}

# Size classes (data.json traits "size"): Favites species over 8 mm are recorded in the Philippines (above).
ADD_TR = {'Favites': ['s3']}

# Other spellings of a name, shown after the IMR one wherever the name is shown (app.js altName): name -> [spelling, source].
SPELL = {'Diploastreidae': ['Diploastraeidae', 'WoRMS']}


def main():
    d = json.load(open(P, encoding='utf-8'))
    G = d['gen']
    for g, fields in FIX.items():
        for f, pairs in fields.items():
            for old, new in pairs:
                v = G[g][f]
                if isinstance(v, list):
                    if any(new in x for x in v):
                        continue
                    hit = [i for i, x in enumerate(v) if old in x]
                    assert len(hit) == 1, (g, f, old)
                    v[hit[0]] = v[hit[0]].replace(old, new)
                else:
                    if new in v:
                        continue
                    assert old in v, (g, f, old)
                    G[g][f] = v.replace(old, new)
    for g, notes in INFO.items():
        info = G[g].get('info') or []
        G[g]['info'] = info + [n for n in notes if n not in info]
    sizes = [o['id'] for o in next(t for t in d['traits'] if t['id'] == 'size')['opts']]
    for g, add in ADD_TR.items():
        tr = G[g]['tr'] + [t for t in add if t not in G[g]['tr']]
        G[g]['tr'] = sorted([t for t in tr if t in sizes], key=sizes.index) + [t for t in tr if t not in sizes]
    d['spell'] = {**d.get('spell', {}), **SPELL}
    dump(d, P)


if __name__ == '__main__':
    main()

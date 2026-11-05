# The plain sentence of each genus (Pierre, 2026-11-03: genus sheets for complete beginners, divers who never had the
# IMR coral lecture). Each genus of data.json gen and x.gen gets `plain`: 1-2 short sentences (30 words at most) in
# everyday words, what you notice underwater (overall shape, texture, size, colour caveats, a comparison). It sits
# beside the scientific text and replaces nothing: the IMR lecture lines, ID tips and Coral Finder features stay as
# they are.
#
# How they were written: a synthesis, in the app's own words (no sentence copied from any source), of how field guides
# and references describe each genus for recognising it underwater, checked against at least two of them per genus
# (tools/plain_sources.json lists them: Corals of the World factsheets, Reef Corals of the Indo-Malayan Seas, the
# ReefCloud hard coral genera guide, Wikipedia, and a few others where those are thin), plus our IMR lecture notes and
# ID tips (gen[g].imr, qt, mn), and the genus's own photos, each looked at. Where a source differed from the IMR notes,
# the line followed the IMR notes (rule C1 of AGENTS.md), until Pierre approved four corrections to the IMR wording
# (2026-11-03: Seriatopora, Lobactis, Heliofungia, Herpolitha; tools/apply_imr_corrections.py). Never copied from the Coral Finder book (tests/plain.test.js
# checks no 5-word run is shared with the Coral Finder features). A slate genus's line names another genus only when
# its first card comes after that genus's (core.js starRefs). Shown right under the photo of the genus sheet and of the
# first-meeting card (app.js plainLine). Re-runnable: python3 tools/apply_plain_sheets.py
import json, os, re, sys
from datajson import dump  # the one data.json layout (one genus per line)

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data.json')
MAX_WORDS = 30  # tests/plain.test.js checks the same limit

PLAIN = {
    # The IMR slate, in slate order
    'Acropora': 'Branches, plates or tables in many shapes. Look at a branch tip: it ends in one bigger round cup, with smaller cups along the sides.',
    'Pocillopora': 'Bushy clumps of short, lumpy branches, all covered in little warts, like cauliflower or popcorn. Tiny pits sit on and between the warts.',
    'Stylophora': 'Stubby branches with blunt, rounded tips, as if squeezed. From a distance the surface looks smooth; up close it is covered in tiny scales.',
    'Anacropora': 'Slim branches ending in rounded or forked tips, with no bigger cup at the very tip. The tiny holes are spread out and look empty.',
    'Seriatopora': "A tight, tangled bush of very thin twigs, like a bird's nest. Up close, tiny holes run in neat lines along each twig.",
    'Porites': 'Lumpy boulders, domes or fat fingers with a smooth look. Up close the surface is covered in tiny pits packed together like a honeycomb.',
    'Tubastraea': 'Tubes with round open ends, as dark green-black little trees or bright orange clusters. Often in shade under overhangs: it has no algae inside, so needs no sunlight.',
    'Echinopora': 'Untidy tangles of branches, or plates, with a rough, beaded surface like sandpaper. No bigger cup marks the branch tips.',
    'Astreopora': 'Rounded boulders covered in small raised holes that stick out at different angles, like a pincushion of tiny tubes.',
    'Galaxea': 'Clusters of small spiky stars standing up from the surface, each star made of thin sharp blades. By day, tentacles may hide them.',
    'Turbinaria': 'Plates, bowls or vases, like big lettuce leaves. Small round cups are evenly spaced on a surface that is otherwise smooth.',
    'Mycedium': 'Frilly, leaf-like plates covered in big bumps that look like little noses, all pointing out towards the edge of the plate.',
    'Lobophyllia': 'Big fleshy colonies of fat, rounded lobes or winding ridges, often in two contrasting colours. The soft tissue hides large spiky teeth.',
    'Pavona': 'Lumps, columns or leafy plates whose surface shows tiny star patterns, with fine lines running smoothly from one star to the next.',
    'Pachyseris': 'Plates or leafy folds covered in ridges that run parallel to the edge, like a fingerprint or ripples in sand, with very fine lines crossing them.',
    'Pectinia': 'A maze of tall, thin, frilly walls standing up like hedges or lettuce leaves, with deep valleys between them.',
    'Platygyra': 'The classic brain coral: a dome covered in winding grooves and ridges, often in two colours. The ridges look slightly ragged rather than neat.',
    'Leptoria': 'A brain coral whose grooves are so narrow and tight that you mostly see the ridges. The fine lines across them are even, like a zipper.',
    'Goniopora': 'Looks furry, like a bed of flowers: long fleshy stalks stick out day and night, each ending in 24 tentacles that often sway or pulse.',
    'Plerogyra': 'Bubble coral: a cluster of big, smooth, see-through bubbles like grapes, puffed up by day and hiding the hard skeleton.',
    'Montipora': 'Plates, crusts or branches covered in tiny bumps and ridges. The real holes are the smallest of all, barely visible, and look empty.',
    'Hydnophora': 'Branches or lumps covered all over in small pointed cones, like a jackfruit skin. The tiny cups sit in the gaps between the cones.',
    'Fungia': 'A mushroom coral: one loose round disc lying on the bottom, like an upside-down mushroom cap, with fine saw-edged ridges running to a central slit.',
    'Lithophyllon': 'A loose round disc, flat or gently arched, whose radiating ridges have very fine, even teeth, so it looks neat and smooth.',
    'Danafungia': 'A loose round disc with a raised dome in the middle. Its radiating ridges carry big, uneven teeth, so it looks rough.',
    'Ctenactis': 'A loose oval disc shaped like a slipper or skateboard, with one long groove down the middle and big saw-like teeth on its ridges.',
    'Lobactis': 'A loose oval disc with a slit in the middle and tall lumps standing up along its radiating ridges, frequently green, blue or white.',
    'Herpolitha': 'A long loose disc, like a tongue or slipper, with a groove running its whole length and many small mouths along it. Some grow into X or Y shapes.',
    'Heliofungia': 'Looks like a sea anemone: a loose disc hidden under long tentacles, out during the day, their tips white or pink.',
    'Dipsastraea': 'Boulders covered in round or oval cups, each with its own rim and not crowded. Some cups are pinched in the middle as they split in two.',
    'Astrea': 'Boulders packed with round cups, each with its own rim, crowded together. Small new cups squeeze in between the big ones.',
    'Diploastrea': 'Big, smooth-looking domes covered in a very regular pattern of low, thick-rimmed cones, like a neat field of tiny volcanoes.',
    'Goniastrea': 'Lumpy boulders where neighbouring cups share thin, angular walls like a honeycomb, the wall tops often pale. A ring of small knobs sits inside each cup.',
    'Favites': 'Lumpy, uneven crusts or boulders of crowded cups, mostly sharing their walls like a honeycomb. Some cups have their own rims, with a shadow between.',
    # The starred look-alikes
    'Duncanopsammia': 'Plates like Turbinaria, but thicker and less regular, with fewer, bigger round cups (about 6 mm) standing up; their thick tentacles are often out by day.',
    'Alveopora': 'Like Goniopora: long fleshy stalks out day and night, but each ends in a flower of 12 tentacles, and the skeleton is lighter.',
    'Merulina': 'Thin plates in tiers, with frilly upgrowths. Short ridges split and spread towards the edge, like the ribs of a hand fan.',
    'Cyphastrea': 'Lumps or crusts dotted with small, neat round cups, each like a tiny volcano, with a grainy surface between them.',
    'Halomitra': 'A big loose dome lying on the bottom, like an upturned bowl, with ridges radiating out. The edge is often purple or pink.',
    # Millepora (IMR benthic slate), the bonus genera and the Key-only genera (data.json x.gen)
    'Euphyllia': 'A cluster of long, simple tube-shaped tentacles with rounded tips, out by day and hiding the stalked cups below.',
    'Fimbriaphyllia': 'Like Euphyllia, but the tentacle tips are shaped like hammers or anchors, or covered in little bubbles.',
    'Isopora': 'Stubby, thick branches, ridges or crusts, nearly always cream-brown, with jumbled cups. Unlike Acropora, no single bigger cup marks each tip.',
    'Leptoseris': 'Thin, frilly, leafy plates like lettuce, with cups on the top side only, and fewer of them than on Pavona.',
    'Zoopilus': 'A thin, fragile sheet or dome lying loose on the bottom, with fine ridges. It often breaks into overlapping pieces.',
    'Polyphyllia': 'A long loose slipper or sausage shape that looks hairy or furry by day, with tentacles out all over it.',
    'Sandalolitha': 'A heavy loose dome lying on the bottom, like a thick upturned bowl, covered in closely packed short ridges.',
    'Heliopora': 'Blue coral: brown-grey upright blades or columns with white tips; its skeleton is blue inside. Not one of the true hard corals.',
    'Millepora': "Fire coral: smooth mustard-yellow blades, branches or crusts with pale edges and no visible cups. It stings, so don't touch it.",
    'Tubipora': 'Organ pipe coral: a mound of small feathery flowers with 8 tentacles each, on a red skeleton of tiny tubes. Not one of the true hard corals.',
    'Pleuractis': 'A mushroom coral: a loose oval disc, often arched in the middle, with wavy radiating ridges and a slit in the centre.',
    'Oxypora': 'Thin plates, crinkled like paper, with torn-looking edges and a few scattered cups linked by rough lines.',
    'Physogyra': 'A mound covered by day in small bubbles, like a smaller bubble coral (Plerogyra), with winding valleys underneath.',
    'Trachyphyllia': 'A small, free coral folded into an hourglass or figure-of-eight shape, fleshy and often brightly coloured or striped, sitting on sand or mud.',
    'Caulastraea': 'A cluster of separate round cups, each on its own short stalk, like a bunch of flowers. Strong lines show through the tissue.',
    'Catalaphyllia': 'Looks like a big sea anemone on sand: fleshy, with long tentacles whose tips are often a different colour.',
    'Cynarina': 'A single round coral about the size of a palm, its swollen, see-through fleshy tissue showing big lobed ridges underneath.',
    'Cycloseris': 'A tiny mushroom coral, only a few centimetres across, lying loose on sand or mud.',
    'Gardineroseris': 'Lumps or boulders covered in sharp-edged pits, like a scalloped or hammered surface.',
    'Oulophyllia': 'A brain coral with wide grooves. The walls between them are thick at the base and narrow to a sharp top edge.',
    'Plesiastrea': 'Lumps or sheets covered in small, shallow round cups packed close, with no grainy texture between them.',
    'Podabacia': 'Broad, flat plates fixed to the reef, sometimes in tiers, with many small cups tilted towards the edge.',
    'Echinophyllia': 'Thin plates or sheets with big, untidy cups pointing different ways and a rough, ragged surface. Colours are often mottled.',
    'Leptastrea': 'Lumps or crusts of uneven cups of different shapes and sizes, separated by grooves. Usually pale cream or yellow.',
    'Stylocoeniella': 'Small knobbly crusts in shaded spots, covered in tiny, widely spaced holes with little spines around them: like Porites with spines.',
    'Acanthastrea': 'Fleshy, often colourful crusts or mounds of cups, each with its own rim and big blunt teeth.',
    'Psammocora': 'Lumps, columns or crusts with a dimpled surface. Tiny cups cluster in shallow hollows, framed by grainy, petal-like patterns.',
}


def words(s):
    return len(re.findall(r"[\w'-]+", s))


def main():
    d = json.load(open(P, encoding='utf-8'))
    G = {**d['gen'], **d['x']['gen']}
    missing = sorted(set(G) - set(PLAIN))
    extra = sorted(set(PLAIN) - set(G))
    long = [(n, words(t)) for n, t in PLAIN.items() if words(t) > MAX_WORDS]
    if missing or extra or long:
        sys.exit(f'missing {missing}, unknown {extra}, too long {long}')
    for n, g in G.items():
        g['plain'] = PLAIN[n]
    dump(d, P)
    print(len(PLAIN), 'plain lines, longest', max(words(t) for t in PLAIN.values()), 'words')


if __name__ == '__main__':
    main()

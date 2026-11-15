# The number of fish photos on R2 in a fish-game.json read from stdin (downloaded records with an online original).
import sys, json
sys.path.insert(0, sys.argv[1])
import fish_short
d = fish_short.full_doc(json.load(sys.stdin))
print(len({p['f'] for L in d['photos'].values() for p in L if p.get('src') and not p.get('r')}))

# Corals: no share-alike licences any more (Pierre, 2026-11-05, aligned with the fish rules). Takes the waiting
# share-alike coral candidates out of cand.json (tools/fetch_local.py drop_share_alike, which every candidate refill now
# runs too), never a candidate curation.json names (one Pierre added, moved or sent to another genus): those and the
# share-alike photos already on the site are his to keep or remove in the admin (To do › Share-alike). Re-runnable: a
# second run changes nothing. Run from the repo root: python3 tools/apply_no_share_alike.py
from datajson import load_all, dump_all, curated
from fetch_local import drop_share_alike

if __name__ == '__main__':
    d = load_all()
    gone = drop_share_alike(d, curated())
    dump_all(d)
    print(f'{len(gone)} share-alike candidate(s) dropped' + (': ' + ', '.join(gone) if gone else ''))

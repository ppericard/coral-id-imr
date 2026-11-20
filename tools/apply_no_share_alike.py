# Corals: no share-alike licences, as for the fish (docs/rules/photos.md). Takes the waiting share-alike coral
# candidates out of data/cand.json (tools/fetch_local.py drop_share_alike, which every candidate refill runs too), never a
# candidate curation.json names (one the admin added, moved or sent to another genus): those and the share-alike photos
# already on the site are the admin's to keep or remove (To do › Share-alike). Re-runnable: a
# second run changes nothing. Run from the repo root: python3 tools/apply_no_share_alike.py
from datajson import load_all, dump_all, curated
from fetch_local import drop_share_alike

if __name__ == '__main__':
    d = load_all()
    gone = drop_share_alike(d, curated())
    dump_all(d)
    print(f'{len(gone)} share-alike candidate(s) dropped' + (': ' + ', '.join(gone) if gone else ''))

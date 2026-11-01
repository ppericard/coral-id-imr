# Prompt to paste into the judging agent (e.g. Codex)

Open the agent on a clone of `ppericard/coral-id-imr` (repository root), then paste one of these.

## 0. Growth forms first (IMR forms, about 570 photos)

```text
Read judging/AGENTS.md and follow it exactly. Do the growth-form pass only ("scope": "forms"): for every genus
that has photos flagged form_todo in judging/manifest.json, look at each of those photos yourself and write
judging/out/<Genus>.json with "scope": "forms", then run python3 tools/judging_import.py --check <Genus> until
it passes. Then run python3 tools/judging_import.py, commit judging/out/, suggest.json and forms.json on a new
branch, open a pull request and report how many you marked unsure. Do not merge.
```

## 1. Test batch of the full judging

```text
Read judging/AGENTS.md and follow it exactly. Do a test batch only: Acropora, Porites, Fungia and Goniastrea.
Look at every photo of these genera yourself, write judging/out/<Genus>.json for each, and run
python3 tools/judging_import.py --check <Genus> until it passes. Then run python3 tools/judging_import.py,
commit judging/out/, suggest.json, forms.json, quality.json and picks.json on a new branch, open a pull request,
and report what you did and how many answers you marked unsure. Do not merge.
```

## 2. The rest (after Pierre has checked the test batch in the admin)

```text
Read judging/AGENTS.md and follow it exactly. Judge every genus that has no passing file in judging/out/ yet,
in manifest order, saving and checking each genus as you go. Every 8 genera, run the import, commit and push
to the same branch. At the end, open (or update) the pull request and report. Do not merge.
```

## Candidate pass (the candidates waiting, on demand)

```text
Read judging/AGENTS.md (hard rules, the categories, then "Candidate pass") and follow it exactly. Judge every
genus listed by python3 tools/judging_cand.py todo: build its sheets, look at every sheet yourself, write
judging/cand/<Genus>.json and run python3 tools/judging_cand.py --check <Genus> until it passes. Then run
python3 tools/judging_cand.py, commit judging/cand/*.json and suggest.json on a new branch, open a pull request
and report how many photos you judged, how many you marked unsure or another genus. Do not merge.
```

## After the agent's pull request is merged

Open `admin.html`: the growth forms (IMR forms, polyps flag) and quality ratings appear as dashed guesses (one click confirms or corrects), the
Featured suggestions fill the views you haven't picked, and **Triage** lists the rest (move to another view, not
this genus, several corals, near-duplicates, candidates to add), each with Accept or Dismiss.

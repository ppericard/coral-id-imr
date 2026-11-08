#!/usr/bin/env python3
"""Every JSON file git tracks parses (the root's data files, tools/, judging/, .claude/).

Run by the Checks workflow on every pull request and by Deploy Pages before it publishes (repo hygiene audit,
2026-11-08): the admin's Publish and the Candidate photos bot commit straight to main and never run Checks, so a broken
JSON file they wrote fails the deploy and the last good site stays live.
Usage: python3 tools/check_json.py   (exit 1 and the broken files listed, else a count)
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def tracked():
    out = subprocess.run(["git", "ls-files", "-z", "--", "*.json"], cwd=ROOT, capture_output=True, check=True).stdout
    return [f for f in out.decode("utf-8").split("\0") if f]


def bad_files(files):
    bad = []
    for f in files:
        try:
            with open(ROOT / f, encoding="utf-8") as fh:
                json.load(fh)
        except (OSError, ValueError) as e:
            bad.append(f"{f}: {e}")
    return bad


def main():
    files = tracked()
    # In a sparse checkout (rule W22) a file outside it is not on disk: only the files present are read.
    files = [f for f in files if (ROOT / f).exists()]
    bad = bad_files(files)
    for b in bad:
        print("Bad JSON: " + b)
    if not bad:
        print(f"{len(files)} JSON files parse")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

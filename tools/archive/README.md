# Archived build scripts

One-off steps of the original build. They read a scratchpad that no longer exists, so they cannot be re-run;
they are kept to document how `data.json` fields were first made. Edit `data.json` directly (or with a small
`tools/apply_*.py` script) instead. Moved here by the 2026-11-01 code review (L7).

- `make_site.py`, `build_photos.py`, `apply_levels.py`, `build_lecture_more.py`: first build of `data.json` and photos.
- `coral_finder_book/`: extraction of the Coral Finder 2022 book photos (crops, detection, export).

# IMR Coral ID

A static web app for learning the 39 coral genera on the IMR (Institute for Marine Research, Dauin, Philippines) survey slate: 34 surveyed genera plus 5 starred look-alikes.

## What's inside

- **Genera**: each genus with three photo views (colony, closer, corallites), IMR lecture photos and notes, a mnemonic, Coral Finder features and look-alikes.
- **Identify**: the IMR key, the Coral Finder key and a trait-based browser.
- **Look-alikes**: side-by-side comparison of confusable pairs, view by view.
- **Quiz**: photo to genus, look-alike duels, lecture photos, and a "to work on" board. Progress is saved in the browser.

Growth form is only an entry point. Identification relies on corallite and skeletal features.

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

The app is plain HTML/CSS/JS with no build step. `data.json` holds all genus data; photos are in `img/` as WebP (1600 px, plus a 480 px `-s` version for thumbnails).

## Photos

- iNaturalist photos (CC licences), credited on each photo. Observations from Dauin are flagged.
- IMR Lecture 6 photos, used with IMR permission for internal training. Do not reuse outside IMR.

`tools/` holds the scripts used to pick and convert photos (`views.txt` lists the chosen iNaturalist photos per genus and view). They use local paths and are kept for reference.

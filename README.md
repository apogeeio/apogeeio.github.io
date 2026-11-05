# Apogee

Personal website: [apogeeio.github.io](https://apogeeio.github.io/).

English and Chinese versions of the homepage and Blog. Unpublished biography and article templates are retained as HTML comments; they are not displayed. Edit the text in `content/en.json` and `content/zh.json`; illustrations and styles are in `assets/`.

## Preview

Requires Python 3.10 or newer. No third-party packages are needed.

```sh
python3 build.py
python3 -m http.server 8000 --directory _site
```

Open `http://localhost:8000/` or `http://localhost:8000/zh/`.

Pushes to `main` deploy through GitHub Pages. The generated `_site/` directory is not committed.

## Design

Visual reference: [Rikiya Takehi](https://rikiyat.github.io/), based on [AcademicPages](https://github.com/academicpages/academicpages.github.io) and [Minimal Mistakes](https://github.com/mmistakes/minimal-mistakes). Template license notices are retained in `THIRD_PARTY_LICENSES`.

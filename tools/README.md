# Editing the site's text

Every word on the CV lives in `cv/content.txt` in this repo. Each entry
is a header line and the text under it:

```
<!-- WORK | document_pipeline card / title -->
document_pipeline
```

Change the text, never the header line: the header is how the page finds the
spot the text belongs to. The notes at the top of `content.txt` cover lists
(`one per line`) and slots like `{name}`.

## On github.com

1. Open `cv/content.txt`, click the pencil, edit, commit.
2. GitHub Pages republishes in a minute or two; the CDN may take up to ten
   minutes to show it everywhere.
3. A **red ✗** next to the commit means the check found a problem, such as a
   header that no longer matches. Open it to see the line number and a
   suggested fix. Until it's fixed the site doesn't republish: visitors keep
   seeing the last good version.

## On your computer

Run it from the `fe_design_complete` folder (the CV and its `content.txt` live in `cv/`):

```bash
cd fe_design_complete
python3 tools/preview.py
```

From the `Portfolio` folder above it, `python3 fe_design_complete/tools/preview.py`
does the same.

This checks `content.txt`, builds the site, and opens the CV at
http://localhost:8000/cv/. Edit `content.txt`, refresh the browser, and the
change is there (the preview rebuilds whenever a source changes). Ctrl+C stops
it. Commit `cv/content.txt` **and** `cv/index.html` afterwards.

Other options: `--no-open`, `--port 9000`, `--no-serve` (check and build
only). `python3 tools/check_text.py` runs the check on its own;
`python3 tools/build.py` builds without serving.

## How it works

`cv/page.html` is the CV's source and carries a marker wherever text goes.
`tools/build.py` puts each entry's text into its markers, escaped for where it
lands, and writes `cv/index.html` — plain HTML that visitors and search
engines read directly. It also regenerates the site's other generated files.
On GitHub, `.github/workflows/deploy.yml` runs the same build on every push to
`main` and publishes the result, so an edit made on github.com goes live by
itself. A header that `content.txt` is missing stops the build, so a typo can
never publish raw markers.

| File | What it is |
|---|---|
| `textfile.py` | Reads `content.txt`, checks it, fills markers |
| `build.py` | Bakes the text into `cv/index.html` and regenerates the other generated files |
| `preview.py` | The local preview command |
| `check_text.py` | The check; GitHub runs it from `.github/workflows/check-text.yml` |
| `test_*.py` | Tests: `cd tools && python3 -m unittest` |

## Adding new text to the page

New text needs a marker in `cv/page.html`:

- in markup: `⟦TAB | Section / part⟧`
- inside a script string: `'⟦js:TAB | Section / part⟧'`; with live values,
  `fillSlots('⟦js{name}:TAB | Section / part⟧', { name: … })`

Then add the matching entry to `content.txt` and rebuild:

```bash
python3 tools/build.py
```

`./build/check.sh` (one folder up, outside this repo) runs the CV's behaviour
and real-browser suites.

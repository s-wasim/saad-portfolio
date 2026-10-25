# Editing the site's text

Every word on the site lives in `cv/content.txt` in this repo. Each entry
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
   suggested fix. Until it's fixed, that one spot shows its backup text; the
   rest of the site is unaffected.

## On your computer

Run it from the `fe_design_complete` folder (the CV and its `content.txt` live in `cv/`):

```bash
cd fe_design_complete
python3 tools/preview.py
```

From the `Portfolio` folder above it, `python3 fe_design_complete/tools/preview.py`
does the same.

This checks `content.txt`, refreshes the backup copy inside `index.html`, and
opens the site at http://localhost:8000. Edit `content.txt`, refresh the
browser, and the change is there. Ctrl+C stops it. Commit `cv/content.txt` **and**
`cv/index.html` afterwards (the backup copy changed).

Other options: `--no-open`, `--port 9000`, `--no-serve` (check and refresh the
backup only). `python3 tools/check_text.py` runs the check on its own.

Double-clicking `index.html` also works, but browsers block a file opened
that way from reading `content.txt`, so it shows the backup copy as of the last
preview.

## How it works

`index.html` carries a marker wherever text goes. When the page loads, it
downloads `content.txt` and puts each entry's text into its markers, escaped
for where it lands, before anything is drawn. A header that `content.txt` is
missing falls back to the backup copy stored in `index.html`, and so does the
whole page if `content.txt` can't be downloaded.

| File | What it is |
|---|---|
| `textfile.py` | Reads `content.txt`, checks it, fills markers (same rules as the page) |
| `preview.py` | The local preview command |
| `check_text.py` | The check; GitHub runs it from `.github/workflows/check-text.yml` |
| `test_*.py` | Tests: `cd tools && python3 -m unittest` |

## Adding new text to the page

New text needs a marker in the page template, which lives outside this repo in
`build/work/template.html`:

- in markup: `⟦TAB | Section / part⟧`
- inside a script string: `'⟦js:TAB | Section / part⟧'`; with live values,
  `fillSlots('⟦js{name}:TAB | Section / part⟧', { name: … })`

Then add the matching entry to `content.txt` and rebuild:

```bash
python3 build/bundle.py seal && python3 fe_design_complete/tools/preview.py --no-serve
```

`./build/check.sh` runs every test, including a real-browser pass over
`content.txt`.

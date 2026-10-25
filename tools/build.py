#!/usr/bin/env python3
"""Build the site's generated files from their sources.

  python3 tools/build.py                 bake the CV's text and regenerate every generated file
  python3 tools/build.py --out DIR       the same, then copy the publishable site into DIR
  python3 tools/build.py --allow-missing  bake even when content.txt lacks headers (preview only)

Sources → generated:
  cv/page.html + cv/content.txt  →  cv/index.html   (the CV, its text baked in so crawlers can read it)

Generated files are committed, so the site works straight from the branch; the
Pages workflow (.github/workflows/deploy.yml) runs this again on every push, so
an edit to content.txt made on github.com goes live with no local step.
Exits 1, writing nothing, if content.txt is missing a header the page needs.
"""
import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import textfile as tf  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CV = ROOT / 'cv'

# never published: sources, tooling and notes (cv/page.html is baked into cv/index.html)
PRIVATE = ['.git', '.github', '.gitignore', 'docs', 'tools', 'tests', 'data', 'cv/page.html',
           'cv/content.txt', 'Gemfile', 'Gemfile.lock', 'vendor', '_site', '.bundle', '_config.yml',
           '__pycache__', '.claude']


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    """Write only when the text changed, so a rebuild leaves untouched files alone."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and read(path) == text:
        return False
    path.write_text(text, encoding='utf-8')
    return True


def bake_cv():
    """(cv/index.html text, headers missing from content.txt)."""
    return tf.bake(read(CV / 'content.txt'), read(CV / 'page.html'))


def build(allow_missing=False):
    """Regenerate everything. Returns the list of problems that stop a publish."""
    html, missing = bake_cv()
    if missing and not allow_missing:
        return ['content.txt is missing header "%s"' % k for k in dict.fromkeys(missing)]
    write(CV / 'index.html', html)
    return []


def publish(out):
    """Copy the site, minus PRIVATE, into `out` (what GitHub Pages serves)."""
    out = Path(out)
    if out.exists():
        shutil.rmtree(out)
    skip = {ROOT / p for p in PRIVATE}

    def ignore(folder, names):
        return [n for n in names if Path(folder, n) in skip or n == '__pycache__']
    shutil.copytree(ROOT, out, ignore=ignore)


def main(argv=None):
    ap = argparse.ArgumentParser(description='Build the generated files of the site.')
    ap.add_argument('--out', help='also copy the publishable site into this folder')
    ap.add_argument('--allow-missing', action='store_true',
                    help='bake even if content.txt lacks headers (shows the header names instead)')
    a = ap.parse_args(argv)
    problems = build(a.allow_missing)
    for p in problems:
        print('error: ' + p)
    if problems:
        print('Nothing was written. Run python3 tools/check_text.py for details.')
        return 1
    if a.out:
        publish(a.out)
        print('Site built into %s' % a.out)
    else:
        print('Site built.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

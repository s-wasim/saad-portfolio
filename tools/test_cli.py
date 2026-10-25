"""Tests for check_text.py, build.py and preview.py — run from this folder:
   python3 -m unittest -v test_cli"""
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import textfile as tf

HERE = Path(__file__).resolve().parent
TEMPLATE = "<p>⟦HOME | intro⟧</p><a>⟦GLOBAL | repo link⟧</a> g='⟦js{name}:TWIN | greeting⟧'"
GOOD = ('<!-- GLOBAL | repo link -->\nsource →\n'
        '<!-- HOME | intro -->\nhello\n'
        '<!-- TWIN | greeting -->\nhi {name}\n')


def make_site(content):
    """A throwaway copy of the repo layout: cv/page.html, cv/content.txt, tools/."""
    d = Path(tempfile.mkdtemp())
    (d / 'cv').mkdir()
    (d / 'cv' / 'page.html').write_text('<html><body>' + TEMPLATE + '</body></html>\n', encoding='utf-8')
    (d / 'cv' / 'content.txt').write_text(content, encoding='utf-8')
    shutil.copytree(HERE, d / 'tools', ignore=shutil.ignore_patterns('__pycache__', 'test_*'))
    return d


def run(site, script, *args, env=None):
    e = dict(os.environ)
    e.pop('GITHUB_ACTIONS', None)
    e.pop('GITHUB_STEP_SUMMARY', None)
    e.update(env or {})
    return subprocess.run([sys.executable, str(site / 'tools' / script), *args],
                          cwd=site, capture_output=True, text=True, env=e)


class CheckText(unittest.TestCase):
    def test_good_file_exits_zero(self):
        r = run(make_site(GOOD), 'check_text.py')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('content.txt is OK', r.stdout)

    def test_runs_from_any_folder(self):
        site = make_site(GOOD)
        r = subprocess.run([sys.executable, str(site / 'tools' / 'check_text.py')],
                           cwd=tempfile.gettempdir(), capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_problem_exits_one_with_line_number(self):
        r = run(make_site(GOOD.replace('HOME | intro', 'HOME | intor')), 'check_text.py')
        self.assertEqual(r.returncode, 1)
        self.assertIn('line 3', r.stdout)
        self.assertIn('Did you mean "HOME | intro"', r.stdout)

    def test_github_annotations_and_summary(self):
        site = make_site(GOOD.replace('hi {name}', 'hi there'))
        summary = site / 'summary.md'
        r = run(site, 'check_text.py', env={'GITHUB_ACTIONS': 'true',
                                            'GITHUB_STEP_SUMMARY': str(summary)})
        self.assertEqual(r.returncode, 1)
        self.assertIn('::error file=cv/content.txt,line=5::', r.stdout)
        self.assertIn('{name}', summary.read_text(encoding='utf-8'))


class Build(unittest.TestCase):
    def test_build_bakes_text_into_index(self):
        site = make_site(GOOD)
        r = run(site, 'build.py')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        html = (site / 'cv' / 'index.html').read_text(encoding='utf-8')
        self.assertIn('<p>hello</p><a>source →</a>', html)
        self.assertIn("g='hi {name}'", html)
        self.assertNotIn('⟦', html)

    def test_build_missing_key_fails_and_writes_nothing(self):
        site = make_site(GOOD.replace('HOME | intro', 'HOME | intor'))
        r = run(site, 'build.py')
        self.assertEqual(r.returncode, 1)
        self.assertIn('HOME | intro', r.stdout)
        self.assertFalse((site / 'cv' / 'index.html').exists())

    def test_build_out_leaves_sources_behind(self):
        site = make_site(GOOD)
        out = site / '_site'
        r = run(site, 'build.py', '--out', str(out))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertTrue((out / 'cv' / 'index.html').is_file())
        for private in ('cv/page.html', 'cv/content.txt', 'tools'):
            self.assertFalse((out / private).exists(), private)


class Preview(unittest.TestCase):
    def test_no_serve_builds_and_reports(self):
        site = make_site(GOOD)
        r = run(site, 'preview.py', '--no-serve')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('<p>hello</p>', (site / 'cv' / 'index.html').read_text(encoding='utf-8'))
        self.assertIn('content.txt is OK', r.stdout)

    def test_no_serve_still_builds_when_there_are_problems(self):
        site = make_site(GOOD.replace('hello', 'new hello').replace('GLOBAL | repo link', 'GLOBAL | repo lnk'))
        r = run(site, 'preview.py', '--no-serve')
        self.assertIn('repo lnk', r.stdout)
        html = (site / 'cv' / 'index.html').read_text(encoding='utf-8')
        self.assertIn('<p>new hello</p>', html)
        self.assertIn('<a>GLOBAL | repo link</a>', html)   # the gap shows as the header's name


if __name__ == '__main__':
    unittest.main()

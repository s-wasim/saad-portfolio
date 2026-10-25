"""Tests for check_text.py and preview.py — run from this folder:
   python3 -m unittest -v test_cli"""
import json
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


def make_site(content, backup=None):
    """A throwaway copy of the repo layout: cv/index.html, cv/content.txt, tools/."""
    d = Path(tempfile.mkdtemp())
    (d / 'cv').mkdir()
    html = '<html><body>\n'
    if backup is not None:
        html += tf.backup_block(backup)
    html += ('  <script type="__bundler/template">\n'
             + json.dumps(TEMPLATE, ensure_ascii=False).replace('</', '<\\u002F')
             + '\n  </script>\n</body></html>\n')
    (d / 'cv' / 'index.html').write_text(html, encoding='utf-8')
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


class Preview(unittest.TestCase):
    def test_no_serve_refreshes_backup_and_reports(self):
        site = make_site(GOOD, backup={'HOME | intro': 'old'})
        r = run(site, 'preview.py', '--no-serve')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        _, backup = tf.read_bundle((site / 'cv' / 'index.html').read_text(encoding='utf-8'))
        self.assertEqual(backup['HOME | intro'], 'hello')
        self.assertIn('backup', r.stdout.lower())

    def test_no_serve_still_refreshes_when_there_are_problems(self):
        site = make_site(GOOD.replace('hello', 'new hello').replace('GLOBAL | repo link', 'GLOBAL | repo lnk'),
                         backup={'GLOBAL | repo link': 'source →', 'HOME | intro': 'old'})
        r = run(site, 'preview.py', '--no-serve')
        self.assertIn('repo lnk', r.stdout)
        _, backup = tf.read_bundle((site / 'cv' / 'index.html').read_text(encoding='utf-8'))
        self.assertEqual(backup['HOME | intro'], 'new hello')
        self.assertEqual(backup['GLOBAL | repo link'], 'source →')

    def test_unchanged_backup_leaves_index_untouched(self):
        site = make_site(GOOD, backup=tf.parse(GOOD).entries)
        before = (site / 'cv' / 'index.html').read_bytes()
        run(site, 'preview.py', '--no-serve')
        self.assertEqual((site / 'cv' / 'index.html').read_bytes(), before)


if __name__ == '__main__':
    unittest.main()

"""Static checks for the site's routes: CV at /cv, services at /services, landing at /."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


class Routes(unittest.TestCase):
    def test_cv_moved(self):
        self.assertTrue((ROOT / 'cv/index.html').is_file())
        self.assertTrue((ROOT / 'cv/content.txt').is_file())
        self.assertNotIn('__bundler_thumbnail', read('index.html'))

    def test_services_moved(self):
        self.assertTrue((ROOT / 'services/index.html').is_file())
        self.assertFalse((ROOT / 'sb').exists())

    def test_root_forwards_hash(self):
        html = read('index.html')
        self.assertRegex(html, r"location\.hash")
        self.assertRegex(html, r"['\"]/cv/['\"]\s*\+\s*location\.hash")


if __name__ == '__main__':
    unittest.main()

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


class Landing(unittest.TestCase):
    def doors(self):
        html = read('index.html')
        return re.findall(r'<a class="door"[^>]*data-door="(\w+)"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.S)

    def test_landing_links_without_js(self):
        self.assertEqual([(d, h) for d, h, _ in self.doors()], [('cv', '/cv/'), ('services', '/services/')])

    def test_landing_labels(self):
        text = {d: re.sub(r'<[^>]+>', ' ', body) for d, _, body in self.doors()}
        self.assertIn('CV', text['cv'])
        self.assertIn('AI/ML and data engineer · agents in production', text['cv'])
        self.assertIn('Services', text['services'])
        self.assertIn('Websites &amp; systems for small businesses', text['services'])

    def test_preview_assets_exist(self):
        from PIL import Image
        for name in ('cv', 'services'):
            with Image.open(ROOT / 'assets/landing' / (name + '.webp')) as im:
                self.assertGreaterEqual(im.width, 1600)

    def test_landing_assets_linked(self):
        html = read('index.html')
        self.assertIn('/assets/landing/landing.css', html)
        self.assertIn('/assets/landing/landing.js', html)
        self.assertTrue((ROOT / 'assets/landing/landing.css').is_file())
        self.assertTrue((ROOT / 'assets/landing/landing.js').is_file())


if __name__ == '__main__':
    unittest.main()

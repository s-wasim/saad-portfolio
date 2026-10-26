"""Checks on the generated site: what tools/build.py writes, and what the deploy publishes.
Run from the repo root:  python3 -m unittest discover -s tests"""
import json
import re
import sys
import tempfile
import unittest
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import build  # noqa: E402
import textfile as tf  # noqa: E402

SITE = json.loads((ROOT / 'data' / 'site.json').read_text(encoding='utf-8'))


def page(path):
    """The HTML served at a public path like /services/websites/."""
    return (ROOT / path.strip('/') / 'index.html' if path != '/' else ROOT / 'index.html').read_text(encoding='utf-8')


def ld_blocks(html):
    return [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]


class Generated(unittest.TestCase):
    def test_committed_files_are_current(self):
        text = tf.parse((ROOT / 'cv' / 'content.txt').read_text(encoding='utf-8')).entries
        for rel, want in build.generate(SITE, text).items():
            self.assertEqual((ROOT / rel).read_text(encoding='utf-8'), want,
                             '%s is stale: run python3 tools/build.py' % rel)

    def test_every_public_page_exists_with_head_tags(self):
        for path in build.public_paths(SITE):
            html = page(path)
            with self.subTest(path=path):
                self.assertRegex(html, r'<title>[^<]{10,}</title>')
                self.assertRegex(html, r'<meta name="description" content="[^"]{50,}">')
                self.assertIn('<link rel="canonical" href="%s%s">' % (SITE['origin'], path), html)
                img = re.search(r'<meta property="og:image" content="%s(/[^"]+)">' % re.escape(SITE['origin']), html)
                self.assertTrue(img and (ROOT / img.group(1).lstrip('/')).is_file(), 'og:image file missing')
                self.assertNotIn('⟦', html)
                self.assertNotIn('&amp;amp;', html)
                for block in ld_blocks(html):
                    self.assertIn('@type', block)

    def test_sitemap_lists_exactly_the_public_pages(self):
        xml = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
        locs = re.findall(r'<loc>(.*?)</loc>', xml)
        self.assertEqual(locs, [SITE['origin'] + p for p in build.public_paths(SITE)])
        self.assertIn('Sitemap: %s/sitemap.xml' % SITE['origin'], (ROOT / 'robots.txt').read_text())

    def test_prices_consistent(self):
        hub = page('/services/')
        for svc in SITE['services']:
            with self.subTest(svc=svc['slug']):
                html = page('/services/%s/' % svc['slug'])
                self.assertIn('<span>From</span> $%d' % svc['from_usd'], html)
                offers = [b['offers'] for b in ld_blocks(html) if b.get('@type') == 'Service']
                self.assertEqual(offers[0]['price'], svc['from_usd'])
                self.assertEqual(offers[0]['priceSpecification']['minPrice'], svc['from_usd'])
                # once per layout on /services (desk and phone)
                self.assertEqual(hub.count('href="/services/%s/"' % svc['slug']), 2)
                self.assertEqual(hub.count('FROM $%d <span' % svc['from_usd']), 2 * sum(
                    s['from_usd'] == svc['from_usd'] for s in SITE['services']))

    def test_case_pages_use_the_cv_wording(self):
        text = tf.parse((ROOT / 'cv' / 'content.txt').read_text(encoding='utf-8')).entries
        for case in SITE['cases']:
            with self.subTest(case=case['slug']):
                html = unescape(page('/cv/work/%s/' % case['slug']))
                self.assertIn(text['WORK | %s card / description' % case['repo']], html)
                self.assertIn(text['WORK | %s card / source link address' % case['repo']], html)

    def test_cv_head_is_readable_without_javascript(self):
        html = page('/cv/')
        head = html[:html.index('</head>')]
        text = tf.parse((ROOT / 'cv' / 'content.txt').read_text(encoding='utf-8')).entries
        self.assertIn('<title>%s</title>' % tf.esc_html(text['GLOBAL | Page / browser tab title']), head)
        self.assertNotIn('Bundled Page', html)
        self.assertNotRegex(html, r'<script[^>]+src="https?://')        # nothing loads from a CDN
        res = json.loads(re.search(r'window\.__resources = (\{.*?\});', head).group(1))
        for local in res.values():                                     # React comes from cv/vendor
            self.assertTrue((ROOT / 'cv' / local).is_file(), local)


class Publish(unittest.TestCase):
    def test_artifact_excludes_sources(self):
        out = Path(tempfile.mkdtemp()) / 'site'
        build.publish(out)
        for kept in ('index.html', 'CNAME', 'robots.txt', 'sitemap.xml', 'cv/index.html', 'cv/vendor/dc-runtime.js',
                     'services/index.html', 'services/websites/index.html', 'cv/work/document-pipeline/index.html'):
            self.assertTrue((out / kept).exists(), kept)
        for private in ('docs', 'tools', 'tests', 'data', 'cv/page.html', 'cv/content.txt', '.github', '.git'):
            self.assertFalse((out / private).exists(), private)


if __name__ == '__main__':
    unittest.main()


class AIVisibility(unittest.TestCase):
    def test_robots_allows_each_ai_crawler_by_name(self):
        robots = (ROOT / 'robots.txt').read_text()
        for bot in ('GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'):
            self.assertIn('User-agent: %s\nAllow: /\n' % bot, robots)
        self.assertNotIn('Disallow', robots)

    def test_llms_txt_covers_every_service_and_case(self):
        llms = (ROOT / 'llms.txt').read_text(encoding='utf-8')
        self.assertTrue(llms.startswith('# Saad Waseem\n\n> '))
        for svc in SITE['services']:
            self.assertIn('(%s/services/%s/): from $%d.' % (SITE['origin'], svc['slug'], svc['from_usd']), llms)
        for case in SITE['cases']:
            self.assertIn('%s/cv/work/%s/' % (SITE['origin'], case['slug']), llms)
        public = {SITE['origin'] + p for p in build.public_paths(SITE)}
        for link in re.findall(r'\]\((https://saad-dev\.com[^)]*)\)', llms):
            self.assertIn(link, public | {SITE['origin'] + '/llms-full.txt'})

    def test_llms_full_has_every_faq_and_price(self):
        full = (ROOT / 'llms-full.txt').read_text(encoding='utf-8')
        for q, a in SITE['faqs']:
            self.assertIn('Q: %s\nA: %s' % (q, a), full)
        for svc in SITE['services']:
            self.assertIn('### %s, from $%d' % (svc['name'], svc['from_usd']), full)

    def test_faq_markup_matches_visible_questions(self):
        for path in ['/services/faq/', '/cv/'] + ['/services/%s/' % s['slug'] for s in SITE['services']] \
                + ['/cv/work/%s/' % c['slug'] for c in SITE['cases']]:
            with self.subTest(path=path):
                html = page(path)
                faq = [b for b in ld_blocks(html) if b.get('@type') == 'FAQPage']
                self.assertEqual(len(faq), 1)
                visible = unescape(re.sub(r'<[^>]+>', ' ', html))
                for item in faq[0]['mainEntity']:
                    self.assertIn(item['name'], visible)
                    self.assertIn(item['acceptedAnswer']['text'], visible)

    def test_business_and_person_described_consistently(self):
        for path in ('/', '/services/'):
            types = {b['@type'] for b in ld_blocks(page(path))}
            self.assertIn('ProfessionalService', types)
        person = [b for b in ld_blocks(page('/')) if b['@type'] == 'Person'][0]
        self.assertEqual(person['sameAs'], ['https://github.com/s-wasim', 'https://linkedin.com/in/s-waseem'])
        self.assertEqual(person['description'], SITE['person']['positioning'])

#!/usr/bin/env python3
"""Build the site's generated files from their sources.

  python3 tools/build.py                 bake the CV's text and regenerate every generated file
  python3 tools/build.py --out DIR       the same, then copy the publishable site into DIR
  python3 tools/build.py --allow-missing  bake even when content.txt lacks headers (preview only)

Sources → generated:
  cv/page.html + cv/content.txt  →  cv/index.html            the CV, its text baked in so crawlers can read it
  data/site.json                 →  services/<slug>/index.html   one page per service, in the /services look
  data/site.json + content.txt   →  cv/work/index.html, cv/work/<slug>/index.html   case studies, in the CV look
  data/site.json                 →  regions <!--@seo-->…<!--/@seo--> and <!--@svc:slug-->…<!--/@svc-->
                                    inside index.html and services/index.html (the rest of those files is hand-written)
  all of the above               →  sitemap.xml, robots.txt

Generated files are committed, so the site works straight from the branch; the
Pages workflow (.github/workflows/deploy.yml) runs this again on every push, so
an edit to content.txt made on github.com goes live with no local step.
Exits 1, writing nothing, if content.txt is missing a header the page needs.
"""
import argparse
import html as htmllib
import json
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pages  # noqa: E402
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


def fill_region(html, name, content):
    """Replace what sits between <!--@name--> and <!--/@name--> (every occurrence)."""
    tag = name.split(':')[0]
    pat = re.compile(r'(<!--@%s-->).*?(<!--/@%s-->)' % (re.escape(name), re.escape(tag)), re.S)
    if not pat.search(html):
        raise ValueError('no <!--@%s--> region' % name)
    return pat.sub(lambda m: m.group(1) + content + m.group(2), html)


def head_text(page):
    """A hand-written page's own title and description, as plain text."""
    title = re.search(r'<title>(.*?)</title>', page).group(1)
    desc = re.search(r'<meta name="description" content="(.*?)">', page).group(1)
    return htmllib.unescape(title), htmllib.unescape(desc)


def person_ld(site):
    p = site['person']
    return {'@context': 'https://schema.org', '@type': 'Person', '@id': site['origin'] + '/#saad',
            'name': p['name'], 'jobTitle': p['job_title'], 'description': p['positioning'],
            'url': site['origin'] + '/', 'email': 'mailto:' + p['email'],
            'image': site['origin'] + '/cv/assets/og-card.png',
            'address': {'@type': 'PostalAddress', 'addressLocality': p['city'], 'addressCountry': p['country_code']},
            'sameAs': p['same_as'], 'knowsAbout': p['knows_about']}


def generate(site, text):
    """{path relative to ROOT: text} for every generated page except the CV."""
    out = {}
    cases = {c['slug']: c for c in site['cases']}
    for svc in site['services']:
        out['services/%s/index.html' % svc['slug']] = pages.service_page(site, svc, cases)
    out['cv/work/index.html'] = pages.work_index(site, text)
    for c in site['cases']:
        out['cv/work/%s/index.html' % c['slug']] = pages.case_page(site, c, text)
    return out


def public_paths(site):
    return (['/', '/cv/', '/cv/work/'] + ['/cv/work/%s/' % c['slug'] for c in site['cases']]
            + ['/services/'] + ['/services/%s/' % s['slug'] for s in site['services']])


def build(allow_missing=False):
    """Regenerate everything. Returns the list of problems that stop a publish."""
    html, missing = bake_cv()
    if missing and not allow_missing:
        return ['content.txt is missing header "%s"' % k for k in dict.fromkeys(missing)]
    data = ROOT / 'data' / 'site.json'
    if not data.exists():          # a bare checkout of the CV alone (the tools' own tests)
        write(CV / 'index.html', html)
        return []
    site = json.loads(read(data))
    text = tf.parse(read(CV / 'content.txt')).entries

    cv_ld = [{'@context': 'https://schema.org', '@type': 'ProfilePage', 'url': site['origin'] + '/cv/',
              'mainEntity': {'@id': site['origin'] + '/#saad'}}, person_ld(site)]
    html = html.replace('<!--@seo-->', pages.seo_head(site, '/cv/', text['GLOBAL | Page / browser tab title'],
                                                         text['GLOBAL | Page / search description'],
                                                         '/cv/assets/og-card.png', None, cv_ld), 1)
    write(CV / 'index.html', html)

    for rel, page in generate(site, text).items():
        write(ROOT / rel, page)

    landing = read(ROOT / 'index.html')
    title, desc = head_text(landing)
    site_ld = {'@context': 'https://schema.org', '@type': 'WebSite', 'url': site['origin'] + '/',
               'name': 'Saad Waseem', 'publisher': {'@id': site['origin'] + '/#saad'}}
    landing = fill_region(landing, 'seo', '\n' + pages.seo_head(site, '/', title, desc, '/assets/og.jpg',
                                                                'website', [site_ld, person_ld(site)]) + '\n')
    write(ROOT / 'index.html', landing)

    hub = read(ROOT / 'services' / 'index.html')
    title, desc = head_text(hub)
    catalog = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Services for small businesses',
               'itemListElement': [{'@type': 'ListItem', 'position': i, 'url': '%s/services/%s/' % (site['origin'], s['slug']),
                                    'name': s['name']} for i, s in enumerate(site['services'], 1)]}
    hub = fill_region(hub, 'seo', '\n' + pages.seo_head(site, '/services/', title, desc, '/services/assets/og.jpg',
                                                        'website', [catalog]) + '\n')
    for svc in site['services']:
        hub = fill_region(hub, 'svc:' + svc['slug'], pages.price_line(svc))
    write(ROOT / 'services' / 'index.html', hub)

    write(ROOT / 'sitemap.xml', pages.sitemap(site, public_paths(site)))
    write(ROOT / 'robots.txt', pages.robots(site))
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

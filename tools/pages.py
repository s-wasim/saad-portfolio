"""The generated pages: service pages, case studies, the work index, and the head
tags every page shares. Pure functions from data to HTML strings; tools/build.py
decides where they go.

  site   data/site.json, parsed
  text   cv/content.txt entries (dict), for the case studies' CV wording
"""
import json
from html import escape

FONTS_SERVICES = ('https://fonts.googleapis.com/css2?family=Audiowide&family=Hanken+Grotesk:wght@400;500;600;700'
                  '&family=IBM+Plex+Mono:wght@400;500&display=swap')


def esc(s):
    return escape(str(s), quote=True)


def url(site, path):
    return site['origin'] + path


def jsonld(obj):
    """A JSON-LD script; '</' is escaped so text can never close the tag."""
    return ('<script type="application/ld+json">%s</script>'
            % json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'))


def person_ref(site):
    return {'@type': 'Person', '@id': url(site, '/#saad'), 'name': site['person']['name']}


def breadcrumbs(site, trail):
    """trail: [(name, path), ...] from the home page down."""
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i, 'name': n, 'item': url(site, p)} for i, (n, p) in enumerate(trail, 1)]}


def seo_head(site, path, title, description, image, kind='website', ld=()):
    """canonical, Open Graph, Twitter card and JSON-LD for one page (title and
    description tags themselves stay in each page's own <head>)."""
    tags = [
        '<link rel="canonical" href="%s">' % esc(url(site, path)),
        '<meta property="og:site_name" content="Saad Waseem">',
        '<meta property="og:url" content="%s">' % esc(url(site, path)),
        '<meta property="og:image" content="%s">' % esc(url(site, image)),
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="%s">' % esc(title),
        '<meta name="twitter:description" content="%s">' % esc(description),
        '<meta name="twitter:image" content="%s">' % esc(url(site, image)),
    ]
    if kind:
        tags.insert(2, '<meta property="og:type" content="%s">' % kind)
    tags += [jsonld(x) for x in ld]
    return '\n'.join(tags)


# ---------------------------------------------------------------- FAQs

def faq_items(faqs):
    return ''.join('<details><summary>%s</summary><p>%s</p></details>' % (esc(q), esc(a)) for q, a in faqs)


def faq_html(faqs, title='Questions', label='FAQ'):
    """Visible questions and answers; the same pairs go into faq_ld()."""
    return ('<section class="block"><p class="label">%s</p><h2>%s</h2><div class="faq">%s</div></section>'
            % (esc(label), esc(title), faq_items(faqs)))


def faq_ld(faqs):
    return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]}


def business_ld(site):
    """The small-business practice: who runs it, where, and the offer catalogue with 'from' prices."""
    p = site['person']
    return {
        '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': url(site, '/services/#business'),
        'name': 'Saad Waseem: websites, systems and AI for small businesses', 'url': url(site, '/services/'),
        'description': ('Websites, business systems, AI assistants, AI automations, mobile control panels and '
                        'growth marketing for small businesses, at fixed prices after a free 20-minute audit.'),
        'founder': person_ref(site), 'email': p['email'], 'image': url(site, '/services/assets/og.jpg'),
        'address': {'@type': 'PostalAddress', 'addressLocality': p['city'], 'addressCountry': p['country_code']},
        'areaServed': ['United States', 'Pakistan', 'Worldwide'], 'priceRange': 'From $200',
        'sameAs': p['same_as'],
        'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'Services for small businesses', 'itemListElement': [
            {'@type': 'Offer', 'priceCurrency': 'USD', 'price': svc['from_usd'],
             'priceSpecification': {'@type': 'PriceSpecification', 'minPrice': svc['from_usd'], 'priceCurrency': 'USD'},
             'itemOffered': {'@type': 'Service', 'name': svc['name'], 'url': url(site, '/services/%s/' % svc['slug'])}}
            for svc in site['services']]},
    }


# ---------------------------------------------------------------- services

def service_ld(site, svc):
    path = '/services/%s/' % svc['slug']
    return {
        '@context': 'https://schema.org', '@type': 'Service', '@id': url(site, path) + '#service',
        'name': svc['name'], 'description': svc['description'], 'url': url(site, path),
        'serviceType': svc['name'], 'provider': person_ref(site),
        'areaServed': ['United States', 'Pakistan', 'Worldwide'],
        'audience': {'@type': 'BusinessAudience', 'name': 'Small businesses'},
        'offers': {'@type': 'Offer', 'url': url(site, path), 'priceCurrency': 'USD',
                   'price': svc['from_usd'],
                   'priceSpecification': {'@type': 'PriceSpecification', 'minPrice': svc['from_usd'],
                                          'priceCurrency': 'USD'},
                   'description': 'From $%d. Fixed quote after a free 20-minute audit.' % svc['from_usd']},
    }


def services_nav(site, here=None):
    return ''.join('<li><a href="/services/%s/"%s><span>%s</span>%s<em>from $%d</em></a></li>'
                   % (s['slug'], ' aria-current="page"' if s['slug'] == here else '', s['card'],
                      esc(s['name'].split(' (')[0]), s['from_usd'])
                   for s in site['services'])


def services_shell(site, title, description, path, body, ld, extra_head=''):
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(description)s">
<meta name="theme-color" content="#071233">
%(seo)s
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="%(fonts)s" rel="stylesheet">
<link rel="stylesheet" href="/services/pages.css">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
%(extra_head)s</head>
<body>
<header class="bar">
  <a class="mark" href="/services/" aria-label="All services">SW</a>
  <nav aria-label="Site"><a href="/services/">Services</a><a href="/cv/">CV</a></nav>
  <a class="cta" href="%(booking)s" target="_blank" rel="noopener">Book a free audit <span aria-hidden="true">&#8599;</span></a>
</header>
<main>
%(body)s
</main>
<footer class="foot">
  <p><strong>Saad Waseem</strong> · independent AI/ML and data engineer · Lahore, Pakistan · working with businesses in the US and worldwide</p>
  <p><a href="mailto:%(email)s">%(email)s</a> · <a href="https://github.com/s-wasim">GitHub</a> · <a href="https://linkedin.com/in/s-waseem">LinkedIn</a> · <a href="/cv/">CV</a> · <a href="/">saad-dev.com</a></p>
</footer>
</body>
</html>
''' % {'title': esc(title), 'description': esc(description), 'fonts': FONTS_SERVICES,
       'seo': seo_head(site, path, title, description, '/services/assets/og.jpg', 'website', ld),
       'body': body, 'booking': esc(site['booking_url']), 'email': esc(site['person']['email']),
       'extra_head': extra_head}


def process_html(site):
    steps = ''.join('<li><span class="n">%02d</span><h3>%s</h3><p>%s</p></li>' % (i, esc(a), esc(b))
                    for i, (a, b) in enumerate(site['process'], 1))
    return ('<section class="block"><p class="label">How it works</p><h2>Same four steps, every job</h2>'
            '<ol class="steps">%s</ol><p class="note">%s</p></section>' % (steps, esc(site['subscriptions_note'])))


def service_page(site, svc, cases_by_slug):
    path = '/services/%s/' % svc['slug']
    title = '%s | Saad Waseem' % svc['title_tag']
    included = ''.join('<li><h3>%s</h3><p>%s</p></li>' % (esc(a), esc(b)) for a, b in svc['included'])
    proof = ''
    if svc.get('proof'):
        items = ''.join('<li><a href="/cv/work/%s/"><strong>%s</strong><span>%s</span></a></li>'
                        % (c['slug'], esc(c['repo']), esc(c['kind'])) for c in (cases_by_slug[s] for s in svc['proof']))
        proof = ('<section class="block"><p class="label">See the pattern working</p>'
                 '<h2>Open-source demos you can run</h2><ul class="proof">%s</ul></section>' % items)
    body = '''<article class="svc">
<section class="hero">
  <p class="label">%(card)s / 06 · %(short)s</p>
  <h1>%(name)s <span>%(h1_sub)s</span></h1>
  <p class="display">%(headline)s</p>
  <p class="lead">%(summary)s</p>
  <p class="price"><span>From</span> $%(price)s</p>
  <p class="actions"><a class="cta big" href="%(booking)s" target="_blank" rel="noopener">Book a free 20-minute audit <span aria-hidden="true">&#8599;</span></a>
  <a class="ghost" href="mailto:%(email)s">or email %(email)s</a></p>
</section>
<section class="block"><p class="label">Who it's for</p><p class="who">%(who)s</p></section>
<section class="block"><p class="label">What's included</p><h2>Pick what fits; the quote is fixed</h2><ul class="cards">%(included)s</ul></section>
%(proof)s
%(process)s
%(faq)s
<p class="more"><a href="/services/faq/">All questions about prices, ownership and support &#8594;</a></p>
<section class="block"><p class="label">All services</p><ul class="others">%(nav)s</ul></section>
</article>''' % {'card': svc['card'], 'short': esc(svc['name'].split(' (')[0].upper()),
                 'name': esc(svc['name'].split(' (')[0]), 'h1_sub': esc(svc.get('h1_sub', 'for small businesses')),
                 'headline': esc(svc['headline']),
                 'summary': esc(svc['summary']), 'price': svc['from_usd'], 'booking': esc(site['booking_url']),
                 'email': esc(site['person']['email']), 'who': esc(svc['for_who']), 'included': included,
                 'proof': proof, 'process': process_html(site), 'nav': services_nav(site, svc['slug']),
                 'faq': faq_html(svc['faqs'], 'Common question')}
    ld = [service_ld(site, svc), faq_ld(svc['faqs']),
          breadcrumbs(site, [('Home', '/'), ('Services', '/services/'), (svc['name'], path)])]
    return services_shell(site, title, svc['description'], path, body, ld)


def services_faq_page(site):
    path = '/services/faq/'
    title = 'Small business websites, AI and automation: prices and questions | Saad Waseem'
    description = ('Straight answers on what websites, AI assistants and AI automations cost a small business, who owns '
                   'what, how payment and support work, and how to start with a free 20-minute audit.')
    body = '''<article class="svc">
<section class="hero">
  <p class="label">Questions</p>
  <h1>Prices, ownership and support <span>the questions small businesses ask first</span></h1>
  <p class="lead">Fixed quotes, from $200, after a free 20-minute audit. If your question is not here, ask it on the call.</p>
  <p class="actions"><a class="cta big" href="%(booking)s" target="_blank" rel="noopener">Book a free 20-minute audit <span aria-hidden="true">&#8599;</span></a></p>
</section>
%(faq)s
<section class="block"><p class="label">All services</p><ul class="others">%(nav)s</ul></section>
</article>''' % {'booking': esc(site['booking_url']), 'faq': faq_html(site['faqs'], 'Before you book'),
                 'nav': services_nav(site)}
    ld = [faq_ld(site['faqs']), business_ld(site),
          breadcrumbs(site, [('Home', '/'), ('Services', '/services/'), ('Questions', path)])]
    return services_shell(site, title, description, path, body, ld)


def price_line(svc):
    """The 'from $X · details' line added under each service frame on /services."""
    return ('<a data-svc-link="" data-nofont="" data-noobs="" href="/services/%s/" '
            'style="pointer-events:auto;align-self:flex-start;display:inline-flex;gap:10px;align-items:center;'
            'min-height:40px;padding:0 16px;border-radius:999px;border:1px solid rgba(57,230,255,.45);'
            "background:rgba(7,18,51,.55);color:#e9f6ff;font-family:'IBM Plex Mono',monospace;font-size:13px;"
            'letter-spacing:.08em;text-decoration:none">FROM $%d <span style="color:#39e6ff">· DETAILS &#8594;</span></a>'
            % (svc['slug'], svc['from_usd']))


# ---------------------------------------------------------------- case studies

def case_text(text, repo):
    """The CV's own wording for one WORK card, from content.txt."""
    get = lambda k: text.get('WORK | %s %s' % (repo, k), '')
    steps = []
    for i in range(1, 10):
        name = get('run trace / step %d name' % i)
        if not name:
            break
        steps.append((name, get('run trace / step %d text' % i), get('run trace / step %d time' % i)))
    return {'title': get('card / title') or repo, 'description': get('card / description'),
            'command': get('card / command'), 'source': get('card / source link address'),
            'steps': steps, 'final': get('run trace / final line')}


def cv_shell(site, title, description, path, body, ld, image='/cv/assets/og-card.png'):
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(description)s">
<meta name="theme-color" content="#0A0503">
%(seo)s
<link rel="stylesheet" href="/cv/work/work.css">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
</head>
<body>
<div class="crt">
<header class="bar">
  <a class="home" href="/cv/">SAAD-DEV</a>
  <nav aria-label="Site"><a href="/cv/work/">WORK</a><a href="/cv/#book">BOOK</a><a href="/services/">SERVICES</a></nav>
</header>
<main>
%(body)s
</main>
<footer class="foot">
  <p>Saad Waseem · AI/ML and data engineer · Lahore, Pakistan · <a href="mailto:%(email)s">%(email)s</a> · <a href="https://github.com/s-wasim">GitHub</a> · <a href="https://linkedin.com/in/s-waseem">LinkedIn</a></p>
</footer>
</div>
</body>
</html>
''' % {'title': esc(title), 'description': esc(description),
       'seo': seo_head(site, path, title, description, image, 'article', ld),
       'body': body, 'email': esc(site['person']['email'])}


def case_faqs(site, case, t):
    src = t['source'] or 'https://github.com/s-wasim/' + case['repo']
    return [
        ('Can I run %s myself?' % t['title'],
         'Yes. It is open source at %s, and the README walks through running it locally.' % src),
        ('Can Saad Waseem build something like %s for my team?' % t['title'],
         'Yes. He builds production AI agents and automations like this one, remotely from Lahore for teams in the '
         'US and EU, at $40/hr for build work. Book 20 minutes from the CV, or email %s.' % site['person']['email']),
    ]


def case_page(site, case, text):
    t = case_text(text, case['repo'])
    faqs = case_faqs(site, case, t)
    path = '/cv/work/%s/' % case['slug']
    title = '%s: %s | Saad Waseem' % (t['title'], case['kind'])
    description = case['summary'] if len(case['summary']) <= 300 else case['summary'][:297] + '…'
    trace = ''.join('<li><b>[%s]</b> %s%s</li>' % (esc(n), esc(x), (' <i>%s</i>' % esc(tm)) if tm else '')
                    for n, x, tm in t['steps'])
    if case.get('gate'):
        # the CV's console halts here for a person; the static page shows the approval it waited for
        approved = text.get('WORK | Shared labels / trace line once approved', '').split(']', 1)[-1].strip()
        trace += '<li><b>[human]</b> %s</li>' % esc(approved)
    final = '<li class="ok">%s</li>' % esc(t['final']) if t['final'] else ''
    extra = ''
    if case.get('extra_link'):
        extra = '<a href="%s">%s &#8599;</a>' % (esc(case['extra_link'][1]), esc(case['extra_link'][0]))
    body = '''<article class="case">
<p class="crumbs"><a href="/cv/">saad-dev.com</a> / <a href="/cv/work/">work</a> / %(slug)s</p>
<p class="label">%(kind)s</p>
<h1>%(title)s</h1>
<p class="lead">%(cvdesc)s</p>
<pre class="cmd"><code>%(command)s</code></pre>
<ol class="trace" aria-label="A sample run">%(trace)s%(final)s</ol>
<section><h2>What it does</h2><p>%(summary)s</p></section>
<section><h2>How it works</h2><ul class="how">%(how)s</ul></section>
<section><h2>By the numbers</h2><ul class="nums">%(nums)s</ul></section>
<section><h2>Stack</h2><ul class="chips">%(stack)s</ul></section>
<section><h2>Questions</h2><div class="faq">%(faq)s</div></section>
<p class="links"><a class="primary" href="%(source)s">Source on GitHub &#8599;</a>%(extra)s<a href="/cv/#work">Back to the CV</a><a href="/services/automations/">Want one built for you?</a></p>
</article>''' % {'slug': esc(case['repo']), 'kind': esc(case['kind']), 'title': esc(t['title']),
                 'cvdesc': esc(t['description']), 'command': esc(t['command']), 'trace': trace, 'final': final,
                 'summary': esc(case['summary']), 'how': ''.join('<li>%s</li>' % esc(h) for h in case['how']),
                 'nums': ''.join('<li>%s</li>' % esc(n) for n in case['numbers']),
                 'stack': ''.join('<li>%s</li>' % esc(s) for s in case['stack']),
                 'source': esc(t['source'] or 'https://github.com/s-wasim/' + case['repo']), 'extra': extra,
                 'faq': faq_items(faqs)}
    ld = [faq_ld(faqs), {'@context': 'https://schema.org', '@type': 'SoftwareSourceCode', '@id': url(site, path) + '#code',
           'name': t['title'], 'description': case['summary'], 'url': url(site, path),
           'codeRepository': t['source'] or 'https://github.com/s-wasim/' + case['repo'],
           'programmingLanguage': 'Python', 'keywords': case['stack'], 'author': person_ref(site)},
          breadcrumbs(site, [('Home', '/'), ('CV', '/cv/'), ('Work', '/cv/work/'), (t['title'], path)])]
    return cv_shell(site, title, description, path, body, ld)


def work_index(site, text):
    items = []
    for c in site['cases']:
        t = case_text(text, c['repo'])
        items.append('<li><a href="/cv/work/%s/"><span class="label">%s</span><strong>%s</strong><span>%s</span></a></li>'
                     % (c['slug'], esc(c['kind']), esc(t['title']), esc(t['description'])))
    intro = site['work_intro']  # the CV's own intro talks about its console, which this page doesn't have
    body = '''<article class="case">
<p class="crumbs"><a href="/cv/">saad-dev.com</a> / work</p>
<p class="label">ch 03 · work</p>
<h1>WORK</h1>
<p class="lead">%s</p>
<ul class="index">%s</ul>
</article>''' % (esc(intro), ''.join(items))
    title = 'Work: open-source AI agents and data pipelines | Saad Waseem'
    description = ('Six public repositories by Saad Waseem: document AI with human approval, an email lead agent, '
                   'an MCP data platform, cited RAG over codebases, face clustering and a guarded multi-agent system.')
    ld = [breadcrumbs(site, [('Home', '/'), ('CV', '/cv/'), ('Work', '/cv/work/')])]
    return cv_shell(site, title, description, '/cv/work/', body, ld)


# ---------------------------------------------------------------- crawl files

def sitemap(site, paths):
    rows = ''.join('  <url><loc>%s</loc></url>\n' % esc(url(site, p)) for p in paths)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % rows)


AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
               'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot']


def robots(site):
    """Everything is public. AI crawlers are named one by one: many sites block them,
    and an explicit Allow leaves no doubt this one wants to be read and cited."""
    ai = ''.join('User-agent: %s\nAllow: /\n\n' % bot for bot in AI_CRAWLERS)
    return ('# saad-dev.com: everything here is public and may be indexed, quoted and cited.\n'
            '# Plain-text summaries for language models: %s and %s\n\n'
            'User-agent: *\nAllow: /\n\n%sSitemap: %s\n'
            % (url(site, '/llms.txt'), url(site, '/llms-full.txt'), ai, url(site, '/sitemap.xml')))


# ---------------------------------------------------------------- llms.txt (https://llmstxt.org)

def cv_faqs(text):
    """The CV's FAQ, as content.txt holds it (shown in the CV's PLAIN view)."""
    out = []
    for i in range(1, 50):
        q = text.get('FAQ | %d question' % i)
        if not q:
            break
        out.append((q, text.get('FAQ | %d answer' % i, '')))
    return out


def llms_txt(site, text):
    """A short, linked index: who this is, what is on offer, where the detail lives."""
    p = site['person']
    lines = ['# Saad Waseem', '', '> ' + p['positioning'], '',
             'Based in %s, %s; works remotely with %s. Email: %s. %s.'
             % (p['city'], p['country'], p['works_with'], p['email'], p['role']), '',
             'Book a free 20-minute call: ' + site['booking_url'], '',
             '## Services for small businesses', '',
             'Fixed quotes after a free 20-minute audit; 50% up front, 50% on delivery; two months of support included.', '']
    for s in site['services']:
        lines.append('- [%s](%s): from $%d. %s' % (s['name'], url(site, '/services/%s/' % s['slug']),
                                                  s['from_usd'], s['summary']))
    lines += ['- [Prices and questions](%s): costs, ownership, payment and support' % url(site, '/services/faq/'), '',
              '## AI/ML engineering for tech teams', '',
              '- [CV](%s): %s' % (url(site, '/cv/'), text.get('GLOBAL | Page / search description', '')),
              '- [Work](%s): six public repositories, each with a case study and a sample run' % url(site, '/cv/work/')]
    for c in site['cases']:
        lines.append('- [%s](%s): %s. %s' % (case_text(text, c['repo'])['title'], url(site, '/cv/work/%s/' % c['slug']),
                                             c['kind'], case_text(text, c['repo'])['description']))
    lines += ['', '## Profiles', ''] + ['- %s' % u for u in p['same_as']]
    lines += ['', '## Optional', '',
              '- [Full text](%s): every service, price, question and project in one file' % url(site, '/llms-full.txt'), '']
    return '\n'.join(lines)


def llms_full_txt(site, text):
    """Everything an assistant needs to answer questions about Saad and his services, as plain text."""
    p = site['person']
    out = ['# Saad Waseem: profile, services and work', '', p['positioning'], '',
           '- Location: %s, %s (UTC+5). Works remotely with %s.' % (p['city'], p['country'], p['works_with']),
           '- Email: %s' % p['email'],
           '- Book a free 20-minute call: %s' % site['booking_url'],
           '- Website: %s' % site['origin'],
           '- Profiles: %s' % ', '.join(p['same_as']),
           '- Current role: %s' % p['role'],
           '- Rate for engineering work: %s' % p['rate'],
           '- Knows: %s' % ', '.join(p['knows_about']), '',
           '## About (from the CV)', '', text.get('HOME | Header / intro', ''), '',
           '%s: %s' % (text.get('WORK | Current role / title', ''), text.get('WORK | Current role / description', '')), '',
           '## Questions about Saad', '']
    out += ['Q: %s\nA: %s\n' % tuple(qa) for qa in cv_faqs(text)]
    out += ['## Services for small businesses', '',
            'How every job works: ' + ' '.join('%s: %s' % (a, b) for a, b in site['process']),
            site['subscriptions_note'], '']
    for s in site['services']:
        out += ['### %s, from $%d' % (s['name'], s['from_usd']), '', url(site, '/services/%s/' % s['slug']), '',
                s['description'], '', 'Who it is for: ' + s['for_who'], '', "What's included:"]
        out += ['- %s: %s' % tuple(item) for item in s['included']]
        out += [''] + ['Q: %s\nA: %s\n' % tuple(qa) for qa in s['faqs']]
    out += ['## Questions small businesses ask', ''] + ['Q: %s\nA: %s\n' % tuple(qa) for qa in site['faqs']]
    out += ['## Public work', '']
    for c in site['cases']:
        t = case_text(text, c['repo'])
        out += ['### %s: %s' % (t['title'], c['kind']), '',
                '%s (source: %s)' % (url(site, '/cv/work/%s/' % c['slug']), t['source']), '',
                t['description'], '', c['summary'], ''] + ['- ' + h for h in c['how']]
        out += ['', 'Stack: ' + ', '.join(c['stack']), 'By the numbers: ' + ', '.join(c['numbers']), '']
    return '\n'.join(out)

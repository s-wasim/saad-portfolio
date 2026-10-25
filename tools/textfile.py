"""content.txt <-> cv/page.html — parse, check and bake the site's text.

content.txt is a list of entries:

    <!-- TAB_NAME | HEADING/SECTION -->
    Actual text here.

The CV's source, cv/page.html, carries a marker wherever text goes:

    ⟦KEY⟧               text in the page markup     (filled HTML-escaped)
    ⟦js:KEY⟧            text inside a script string  (filled JS-escaped)
    ⟦js{a,b}:KEY⟧       the same, with {a} {b} slots the script fills in

tools/build.py bakes the text into cv/index.html, the page visitors and
crawlers get; tools/check_text.py and tools/preview.py use the same rules.

Standard library only, so it runs anywhere Python 3 does, GitHub's runners
included.
"""
import difflib
import re
from collections import namedtuple

HEADER = re.compile(r'^\s*<!--(.*?)-->\s*$')
MARKER = re.compile('⟦(?:(js)(?:\\{([^{}⟦⟧]*)\\})?:)?([^⟦⟧]+)⟧')
SLOT = re.compile(r'\{([A-Za-z_][A-Za-z0-9_]*)\}')


JS_ESC = {'\\': '\\\\', "'": "\\'", '"': '\\"', '`': '\\`', '$': '\\$', '\n': '\\n',
          '\r': '\\r', '\t': '\\t', '\u2028': '\\u2028', '\u2029': '\\u2029', '<': '\\x3C'}
HTML_ESC = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}

Parsed = namedtuple('Parsed', 'entries lines dups')
Marker = namedtuple('Marker', 'ctx slots count')
Problem = namedtuple('Problem', 'level line msg')


def norm(key):
    """A header's identity: whitespace runs collapsed, ends trimmed."""
    return ' '.join(key.split())


def _lines(text):
    return text.lstrip('\ufeff').replace('\r\n', '\n').replace('\r', '\n').split('\n')


def parse(text):
    """Entries in file order. Duplicate headers: the first one wins."""
    entries, lines, dups = {}, {}, []
    key, buf = None, []

    def close():
        if key is not None and key not in entries:
            entries[key] = '\n'.join(buf).strip()

    for n, line in enumerate(_lines(text), 1):
        m = HEADER.match(line)
        if not m:
            buf.append(line)
            continue
        close()
        key, buf = norm(m.group(1)), []
        if key in lines:
            dups.append((key, n))
        else:
            lines[key] = n
    close()
    return Parsed(entries, lines, dups)


def markers(template):
    """Every marker in the template: key -> contexts, declared slots, uses."""
    found = {}
    for m in MARKER.finditer(template):
        key = norm(m.group(3))
        ctx = 'js' if m.group(1) else 'html'
        slots = (frozenset(s.strip() for s in m.group(2).split(',') if s.strip())
                 if m.group(2) is not None else None)
        prev = found.get(key)
        if prev is None:
            found[key] = Marker({ctx}, slots, 1)
        else:
            found[key] = Marker(prev.ctx | {ctx}, prev.slots if slots is None else slots,
                                prev.count + 1)
    return found


def esc_html(s):
    return ''.join(HTML_ESC.get(c, c) for c in re.sub(r'\s*\n\s*', ' ', s))


def esc_js(s):
    return ''.join(JS_ESC.get(c, c) for c in s)


def fill(template, live, backup):
    """Put text into every marker. Returns (filled, keys found nowhere)."""
    missing = []

    def sub(m):
        key = norm(m.group(3))
        if key in live:
            v = live[key]
        elif key in backup:
            v = backup[key]
        else:
            v = key
            missing.append(key)
        return esc_js(v) if m.group(1) else esc_html(v)

    return MARKER.sub(sub, template), missing


def check(text, template):
    """Everything wrong with content.txt, in file order, then missing headers."""
    p = parse(text)
    want = markers(template)
    out = []
    for key, n in p.dups:
        out.append(Problem('error', n, 'Header used twice: "%s" (first at line %d). '
                           'Only the first one is used.' % (key, p.lines[key])))
    # a header that lost part of itself to a line break is not a header any
    # more: its pieces become text of the entry above, so point at them
    key = None
    for n, line in enumerate(_lines(text), 1):
        m = HEADER.match(line)
        if m:
            key = norm(m.group(1))
            continue
        bare = line.strip()
        if key is not None and (bare.startswith('<!--') or bare.endswith('-->')):
            out.append(Problem('error', n, 'This line looks like a broken header: a header must be '
                               'one whole line, <!-- like this -->. Until it is fixed, the line is '
                               'shown as part of the text of "%s".' % key))
    unknown = [k for k in p.entries if k not in want]
    missing = [k for k in want if k not in p.entries]
    for key in unknown:
        near = difflib.get_close_matches(key, missing, n=1, cutoff=0.6)
        hint = (' Did you mean "%s"?' % near[0]) if near else ''
        out.append(Problem('error', p.lines[key],
                           'No place on the page uses the header "%s". '
                           'Headers must match exactly.%s' % (key, hint)))
    for key, val in p.entries.items():
        if key not in want:
            continue
        if '{{' in val:
            out.append(Problem('error', p.lines[key],
                               'Text under "%s" contains "{{", which the page engine '
                               'reserves. Use a single brace.' % key))
        slots = want[key].slots
        if slots is not None:
            got = set(SLOT.findall(val))
            if got != set(slots):
                need = ' '.join('{%s}' % s for s in sorted(slots)) or 'no slots'
                have = ' '.join('{%s}' % s for s in sorted(got)) or 'none'
                out.append(Problem('error', p.lines[key],
                                   'Text under "%s" must contain exactly %s (found %s).'
                                   % (key, need, have)))
    out.sort(key=lambda q: q.line or 0)
    for key in missing:
        out.append(Problem('error', None,
                           'Missing header "%s". The site will not publish until it is back: '
                           'the page would show the header itself there.' % key))
    return out


def bake(text, template):
    """The page with every marker filled from content.txt.
    Returns (html, headers the page needs that content.txt lacks); a missing
    header is filled with its own name, so the gap is visible, never silent."""
    return fill(template, parse(text).entries, {})

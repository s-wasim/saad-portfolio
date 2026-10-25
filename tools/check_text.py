#!/usr/bin/env python3
"""Check content.txt against the page.

  python3 tools/check_text.py

Exits 0 when every header in content.txt matches a place on the page and
every place has a header; exits 1 and lists the problems otherwise. On GitHub
(.github/workflows/check-text.yml) each problem is also pinned to its line of
content.txt and written to the run's summary page.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import textfile as tf  # noqa: E402

SITE = Path(__file__).resolve().parent.parent / 'cv'


def problems(site=SITE):
    text = (site / 'content.txt').read_text(encoding='utf-8')
    template = (site / 'page.html').read_text(encoding='utf-8')
    return tf.check(text, template)


def lines(found):
    if not found:
        return ['content.txt is OK — every header matches a place on the page.']
    out = ['content.txt has %d problem(s):' % len(found)]
    for i, p in enumerate(found, 1):
        out.append('  %d. %s%s' % (i, ('line %d: ' % p.line) if p.line else '', p.msg))
    return out


def _gh(msg):
    return msg.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')


def main():
    found = problems()
    print('\n'.join(lines(found)))
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        for p in found:
            loc = (',line=%d' % p.line) if p.line else ''
            print('::%s file=cv/content.txt%s::%s' % (p.level, loc, _gh(p.msg)))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write('## content.txt check\n\n')
            if not found:
                f.write('All good: every header matches a place on the page.\n')
            for p in found:
                f.write('- %s%s\n' % (('**line %d** — ' % p.line) if p.line else '', p.msg))
    return 1 if any(p.level == 'error' for p in found) else 0


if __name__ == '__main__':
    sys.exit(main())

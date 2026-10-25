#!/usr/bin/env python3
"""Preview the site on your machine with the current content.txt.

  python3 tools/preview.py              check, build, serve, open the browser at /cv/
  python3 tools/preview.py --no-open    the same without opening a browser
  python3 tools/preview.py --no-serve   check and build, then stop
  python3 tools/preview.py --port 9000  serve on another port

Edit content.txt, refresh the browser tab, see the change: the server rebuilds
whenever content.txt or a page source has changed. Ctrl+C stops it.

The build bakes the text into cv/index.html (what visitors and search engines
get), so commit cv/index.html together with content.txt after previewing. If
you edit on github.com instead, the site's publish step does the same build.
"""
import argparse
import functools
import http.server
import sys
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
import check_text  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'cv'
_stamp = None


def sources_stamp():
    """Latest change time across the files a build reads."""
    files = [SITE / 'content.txt', SITE / 'page.html'] + list((ROOT / 'data').glob('*')) + \
        list((ROOT / 'tools').glob('*.py'))
    return max((f.stat().st_mtime for f in files if f.exists()), default=0)


def refresh(quiet=False):
    """Check content.txt and rebuild. Problems are reported, never fatal here:
    a missing header shows on the page as the header's own name."""
    global _stamp
    _stamp = sources_stamp()
    found = check_text.problems(SITE)
    if not quiet or found:
        print('\n'.join(check_text.lines(found)))
    build.build(allow_missing=True)
    if not quiet:
        print('Built cv/index.html — commit it together with content.txt.')


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if sources_stamp() != _stamp:
            refresh(quiet=True)
        super().do_GET()

    def log_message(self, fmt, *args):
        pass


def serve(port, open_browser):
    handler = functools.partial(NoCache, directory=str(ROOT))
    for p in range(port, port + 20):
        try:
            httpd = http.server.ThreadingHTTPServer(('127.0.0.1', p), handler)
            break
        except OSError:
            continue
    else:
        sys.exit('No free port between %d and %d.' % (port, port + 19))
    url = 'http://localhost:%d/cv/' % p
    print('\nPreviewing at %s — edit content.txt, then refresh the page. Ctrl+C to stop.' % url)
    if open_browser:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')


def main():
    ap = argparse.ArgumentParser(description='Preview the site with the current content.txt.')
    ap.add_argument('--port', type=int, default=8000)
    ap.add_argument('--no-open', action='store_true', help="don't open a browser")
    ap.add_argument('--no-serve', action='store_true', help='check and build only')
    a = ap.parse_args()
    refresh()
    if not a.no_serve:
        serve(a.port, not a.no_open)


if __name__ == '__main__':
    main()

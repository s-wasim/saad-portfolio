#!/usr/bin/env python3
"""Preview the site on your machine with the current content.txt.

  python3 tools/preview.py              check, refresh the backup, serve, open the browser
  python3 tools/preview.py --no-open    the same without opening a browser
  python3 tools/preview.py --no-serve   check and refresh the backup, then stop
  python3 tools/preview.py --port 9000  serve on another port

Edit content.txt, refresh the browser tab, see the change. Ctrl+C stops it.

Why a server: browsers will not let a page opened by double-click read another
file next to it, so a double-clicked index.html shows its backup copy of the
text instead of content.txt. Served from http://localhost it reads content.txt
exactly as GitHub Pages does.

The backup copy lives inside index.html and is what visitors see for any
header content.txt is missing. This command brings it up to date, so commit
index.html together with content.txt after previewing.
"""
import argparse
import functools
import http.server
import sys
import webbrowser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_text  # noqa: E402
import textfile as tf  # noqa: E402

SITE = Path(__file__).resolve().parent.parent / 'cv'


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def refresh():
    print('\n'.join(check_text.lines(check_text.problems(SITE))))
    index = SITE / 'index.html'
    html = index.read_text(encoding='utf-8')
    new, changed = tf.refresh_backup((SITE / 'content.txt').read_text(encoding='utf-8'), html)
    if changed:
        index.write_text(new, encoding='utf-8')
        print('Backup copy in index.html updated — commit index.html together with content.txt.')
    else:
        print('Backup copy in index.html is up to date.')


def serve(port, open_browser):
    handler = functools.partial(NoCache, directory=str(SITE.parent))
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
    ap.add_argument('--no-serve', action='store_true', help='check and refresh the backup only')
    a = ap.parse_args()
    refresh()
    if not a.no_serve:
        serve(a.port, not a.no_open)


if __name__ == '__main__':
    main()

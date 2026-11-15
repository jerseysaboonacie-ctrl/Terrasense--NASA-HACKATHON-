"""Serve the site locally, the way the demo needs it.

  python3 tools/serve.py            # http://localhost:8931
  python3 tools/serve.py 8000       # another port

Two differences from `python3 -m http.server`:

1. Every file is sent with "Cache-Control: no-cache", so the browser always checks for a newer
   version. (Without it, Chrome may keep running an old copy of the JavaScript after an update,
   without even asking the server.)
2. Terra's microphone log: on localhost only, the page reports what the speech recognizer does
   (switched on, sound, speech, how many words, errors, what Terra did with them; never the words
   themselves) to /__terra-log. Each line is printed here and saved to .terra-log.jsonl in the
   project folder (ignored by git), so a problem with the microphone can be seen afterwards.

Standard library only. Listens on 127.0.0.1 only.
"""
import http.server
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(ROOT, '.terra-log.jsonl')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8931


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_POST(self):
        if self.path != '/__terra-log':
            self.send_error(404)
            return
        size = int(self.headers.get('Content-Length') or 0)
        if size > 8192:
            self.send_error(413)
            return
        try:
            entry = json.loads(self.rfile.read(size) or b'{}')
        except ValueError:
            self.send_error(400)
            return
        entry['received'] = time.strftime('%Y-%m-%d %H:%M:%S')
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        sys.stderr.write('terra-log %s %s %s\n' % (entry['received'], entry.get('event', ''), json.dumps(entry.get('data', ''), ensure_ascii=False)[:200]))
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        # Page loads with the browser name, so it is clear which browser and copy of the site is used.
        line = fmt % args
        if '.html' in line or '" 404' in line or line.startswith('"GET / '):
            sys.stderr.write('%s %s | %s\n' % (time.strftime('%H:%M:%S'), line, (self.headers.get('User-Agent') or '')[:120]))


if __name__ == '__main__':
    print(f'Serving {ROOT} at http://localhost:{PORT} (no-cache; Terra log in .terra-log.jsonl)')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()

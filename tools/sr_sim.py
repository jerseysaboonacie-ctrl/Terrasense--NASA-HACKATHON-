"""Screen-reader simulation for TerraSense Jukebox.

Drives headless Chrome through the DevTools protocol and records what a screen
reader would get from the page:

  read()      the page in reading order (browse mode), from Chrome's
              accessibility tree, which is what VoiceOver, NVDA and JAWS use
  tab()       press Tab and report what the focused element would announce
  key()       press keys (arrow keys, letters) like a keyboard user
  heard()     every live-region announcement (polite and assertive) and every
              built-in speech utterance since the last call

This is an approximation: real screen readers add their own wording, shortcuts
and timing, and only a person can judge the experience. It does not replace
testing with VoiceOver, NVDA or TalkBack.

Usage: python3 tools/sr_sim.py [base_url]   (default http://127.0.0.1:8931)
Standard library only. Needs Google Chrome.
"""
import base64
import json
import os
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PORT = 9333

# Logs live-region changes and speech, so heard() can report them.
OBSERVER = r"""
(() => {
  const log = (kind, text) => console.log('SRSIM|' + kind + '|' + String(text).replace(/\s+/g, ' ').trim());
  const regionOf = (n) => n && n.nodeType === 1 ? n.closest('[aria-live], [role="status"], [role="alert"]') :
    n && n.parentElement ? n.parentElement.closest('[aria-live], [role="status"], [role="alert"]') : null;
  const kindOf = (r) => r.getAttribute('role') === 'alert' || r.getAttribute('aria-live') === 'assertive' ? 'assertive' : 'polite';
  const last = new WeakMap();
  const report = (r) => {
    if (!r || r.closest('[hidden]')) return;
    const t = r.textContent.replace(/\s+/g, ' ').trim();
    if (!t || last.get(r) === r.textContent) return;
    last.set(r, r.textContent);
    log(kindOf(r), t);
  };
  // Content present when the page loads is read by browsing, not announced: only count later changes.
  let ready = false;
  window.addEventListener('load', () => setTimeout(() => { ready = true; }, 300));
  new MutationObserver((muts) => {
    if (!ready) return;
    const seen = new Set();
    for (const m of muts) {
      const r = regionOf(m.target);
      if (r && !seen.has(r)) { seen.add(r); report(r); }
      for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches('[role="alert"]') && !seen.has(n)) { seen.add(n); report(n); }
    }
  }).observe(document, { subtree: true, childList: true, characterData: true });
  if (window.speechSynthesis) {
    const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u) => { log('speech', u.text); try { orig(u); } catch (e) {} };
  }
})();
"""


class CDP:
    """A minimal WebSocket client for the Chrome DevTools protocol."""

    def __init__(self, ws_url):
        host_port, path = ws_url[len('ws://'):].split('/', 1)
        host, port = host_port.split(':')
        self.sock = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f'GET /{path} HTTP/1.1\r\nHost: {host_port}\r\nUpgrade: websocket\r\n'
                           f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        resp = b''
        while b'\r\n\r\n' not in resp:
            resp += self.sock.recv(4096)
        self.buf = resp.split(b'\r\n\r\n', 1)[1]
        self.next_id = 0
        self.events = []

    def _recv_exact(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(1 << 20)
            if not chunk:
                raise ConnectionError('closed')
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def _recv_message(self):
        data = b''
        while True:
            b1, b2 = self._recv_exact(2)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack('>H', self._recv_exact(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._recv_exact(8))[0]
            data += self._recv_exact(n)
            if b1 & 0x80:
                return json.loads(data)

    def send(self, method, params=None, timeout=30):
        self.next_id += 1
        msg = json.dumps({'id': self.next_id, 'method': method, 'params': params or {}}).encode()
        header = bytes([0x81])
        n = len(msg)
        header += bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + struct.pack('>H', n) if n < 65536 else bytes([0x80 | 127]) + struct.pack('>Q', n)
        mask = os.urandom(4)
        self.sock.sendall(header + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(msg)))
        end = time.time() + timeout
        while time.time() < end:
            m = self._recv_message()
            if m.get('id') == self.next_id:
                if 'error' in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get('result', {})
            self.events.append(m)
        raise TimeoutError(method)

    def pump(self, seconds):
        """Collect events for a while (live announcements arrive as console messages)."""
        self.sock.settimeout(0.1)
        end = time.time() + seconds
        while time.time() < end:
            try:
                self.events.append(self._recv_message())
            except (socket.timeout, BlockingIOError):
                pass
        self.sock.settimeout(None)


# Roles a screen reader announces as structure; everything else is read as text.
SKIP_ROLES = {'generic', 'none', 'InlineTextBox', 'LineBreak', 'presentation', 'RootWebArea', 'paragraph',
              'ListMarker', 'group', 'Section', 'LayoutTable', 'LayoutTableRow', 'LayoutTableCell', 'strong', 'emphasis',
              'term', 'definition', 'DescriptionListTerm', 'DescriptionListDetail', 'listitem', 'cell', 'row', 'rowgroup',
              'Canvas', 'time', 'code', 'mark', 'superscript', 'subscript', 'blockquote', 'figure', 'caption', 'abbr'}


def prop(node, name):
    for p in node.get('properties', []):
        if p['name'] == name:
            return p['value'].get('value')
    return None


def describe(node):
    """One line as a screen reader would roughly say it."""
    role = node.get('role', {}).get('value', '')
    name = (node.get('name') or {}).get('value', '') or ''
    value = (node.get('value') or {}).get('value', '')
    desc = (node.get('description') or {}).get('value', '')
    parts = []
    if role == 'heading':
        parts.append(f'heading level {prop(node, "level")}')
    elif role == 'textField' or role == 'TextField':
        parts.append('edit text')
    elif role:
        parts.append(role.replace('RoleDescription', ''))
    rd = prop(node, 'roledescription')
    if rd:
        parts[-1] = rd
    if name:
        parts.append(name)
    if value not in ('', None):
        parts.append(f'value {value}')
    for state in ('checked', 'pressed', 'expanded', 'disabled', 'required', 'invalid', 'modal', 'selected'):
        v = prop(node, state)
        if v not in (None, False, 'false'):
            parts.append(state if v in (True, 'true') else f'{state} {v}')
    if desc:
        parts.append(f'(description: {desc})')
    return ', '.join(str(p) for p in parts)


class ScreenReaderSim:
    def __init__(self, base, extra_args=(), headless=True):
        self.base = base.rstrip('/')
        self.profile = tempfile.mkdtemp(prefix='srsim-')
        self.proc = subprocess.Popen([CHROME, *(['--headless=new'] if headless else []), f'--remote-debugging-port={PORT}', f'--user-data-dir={self.profile}',
                                      '--autoplay-policy=no-user-gesture-required', '--window-size=1280,1000', *extra_args, 'about:blank'],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list'))
                page = next(t for t in tabs if t['type'] == 'page')
                break
            except Exception:
                time.sleep(0.1)
        self.cdp = CDP(page['webSocketDebuggerUrl'])
        for d in ('Page', 'Runtime', 'DOM', 'Accessibility'):
            self.cdp.send(f'{d}.enable')
        self.cdp.send('Page.addScriptToEvaluateOnNewDocument', {'source': OBSERVER})
        self.transcript = []

    def say(self, line):
        self.transcript.append(line)
        print(line)

    def open(self, path, settle=2.0):
        self.say(f'\n=== Open {path} ===')
        self.cdp.send('Page.navigate', {'url': f'{self.base}/{path}'})
        self.cdp.pump(settle)
        title = self.eval('document.title')
        self.say(f'[page title read on load] {title}')
        self.heard()

    def eval(self, expr):
        r = self.cdp.send('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': True})
        return r.get('result', {}).get('value')

    def read(self, limit=400, start_selector=None):
        """The page in browse-mode order."""
        nodes = self.cdp.send('Accessibility.getFullAXTree')['nodes']
        by_id = {n['nodeId']: n for n in nodes}
        root = nodes[0]
        lines = []

        def walk(n, depth):
            if len(lines) >= limit:
                return
            role = n.get('role', {}).get('value', '')
            if not n.get('ignored'):
                if role == 'StaticText':
                    text = (n.get('name') or {}).get('value', '').strip()
                    if text:
                        lines.append(text)
                    return
                if role not in SKIP_ROLES:
                    line = describe(n)
                    if line:
                        lines.append(f'[{line}]')
                    if role in ('button', 'link', 'heading', 'checkbox', 'radio', 'textField', 'combobox', 'slider',
                                'MenuListPopup', 'option', 'image', 'img', 'switch', 'tab', 'menuitem', 'columnheader'):
                        return  # name already read; do not read its text twice
            for cid in n.get('childIds', []):
                if cid in by_id:
                    walk(by_id[cid], depth + 1)

        walk(root, 0)
        self.say('--- Reading the page (browse mode, top to bottom) ---')
        for line in lines:
            self.say('  ' + line)
        return lines

    def focused(self):
        r = self.cdp.send('Runtime.evaluate', {'expression': 'document.activeElement'})
        oid = r['result'].get('objectId')
        if not oid:
            return '(nothing)'
        backend = self.cdp.send('DOM.describeNode', {'objectId': oid})['node']['backendNodeId']
        nodes = self.cdp.send('Accessibility.getPartialAXTree', {'backendNodeId': backend, 'fetchRelatives': False})['nodes']
        node = next((n for n in nodes if not n.get('ignored')), nodes[0])
        return describe(node) or '(no name)'

    KEYCODES = {'Tab': 9, 'Enter': 13, 'Escape': 27, ' ': 32, 'ArrowLeft': 37, 'ArrowUp': 38, 'ArrowRight': 39, 'ArrowDown': 40,
                'Home': 36, 'End': 35}

    def key(self, k, shift=False, wait=0.6, report=True):
        code = self.KEYCODES.get(k, ord(k.upper()) if len(k) == 1 else 0)
        mods = 8 if shift else 0
        text = k if len(k) == 1 else ('\r' if k == 'Enter' else '')
        base = {'key': k, 'windowsVirtualKeyCode': code, 'nativeVirtualKeyCode': code, 'modifiers': mods,
                'code': {' ': 'Space'}.get(k, k if len(k) > 1 else f'Key{k.upper()}' if k.isalpha() else f'Digit{k}' if k.isdigit() else '')}
        self.cdp.send('Input.dispatchKeyEvent', {'type': 'keyDown' if not text else 'keyDown', **base, **({'text': text} if text else {})})
        self.cdp.send('Input.dispatchKeyEvent', {'type': 'keyUp', **base})
        self.cdp.pump(wait)
        if report:
            self.say(f'> press {"Shift+" if shift else ""}{k}')
            self.heard()

    def tab(self, n=1, shift=False):
        out = []
        for _ in range(n):
            self.key('Tab', shift=shift, wait=0.15, report=False)
            f = self.focused()
            out.append(f)
            self.say(f'> {"Shift+" if shift else ""}Tab → {f}')
        self.heard()
        return out

    def type_text(self, text, wait=1.0):
        self.cdp.send('Input.insertText', {'text': text})
        self.say(f'> type "{text}"')
        self.cdp.pump(0.1)

    def heard(self):
        out = []
        rest = []
        for e in self.cdp.events:
            if e.get('method') == 'Runtime.consoleAPICalled':
                args = e['params'].get('args', [])
                v = args[0].get('value', '') if args else ''
                if isinstance(v, str) and v.startswith('SRSIM|'):
                    _, kind, text = v.split('|', 2)
                    out.append((kind, text))
                    continue
                if e['params'].get('type') == 'error':
                    out.append(('console error', ' '.join(str(a.get('value', a.get('description', ''))) for a in args)))
                    continue
            if e.get('method') == 'Runtime.exceptionThrown':
                out.append(('SCRIPT ERROR', e['params']['exceptionDetails'].get('exception', {}).get('description', '')))
                continue
            rest.append(e)
        self.cdp.events = []
        for kind, text in out:
            self.say(f'    ♪ heard ({kind}): {text}')
        return out

    def close(self):
        self.proc.terminate()


if __name__ == '__main__':
    base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8931'
    sim = ScreenReaderSim(base)
    try:
        sim.open('index.html')
        sim.read(60)
        sim.tab(4)
    finally:
        sim.close()

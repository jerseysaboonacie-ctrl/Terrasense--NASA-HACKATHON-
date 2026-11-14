"""Download NASA's newest frames into the site.

Some SVS visualizations have a fixed address that always holds the latest
image (sea surface temperature "most recent", precipitation "now",
vegetation). For every frame in data/frames.json with an "updateUrl", this
tool downloads that file, checks it is the same kind and size of picture,
saves it as the frame's image, and records in frames.json when NASA last
changed it (HTTP Last-Modified) and when it was downloaded.

Frames without an "updateUrl" (the air temperature preview still) are left
as they are. Frames with a "dateImageUrl" (the precipitation date overlay)
also get that image, so a person can read the data time from it.

The site never downloads anything itself: run this before a demo, check the
pages, run the tests, and commit. Then the demo works offline with the
newest pictures.

Usage:  python3 tools/update_frames.py           (download and update)
        python3 tools/update_frames.py --check   (only show what is new)
Standard library only.
"""
import email.utils
import json
import os
import struct
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES_JSON = os.path.join(ROOT, 'data', 'frames.json')
UA = {'User-Agent': 'TerraSense-Jukebox-frame-updater'}


def to_json(value, indent=0):
    """Same layout as tools/build_legends.py: short objects stay on one line."""
    one_line = json.dumps(value, ensure_ascii=False)
    if len(one_line) <= 100 or not isinstance(value, (dict, list)):
        return one_line
    pad = '  ' * (indent + 1)
    if isinstance(value, dict):
        items = ['%s%s: %s' % (pad, json.dumps(k, ensure_ascii=False), to_json(v, indent + 1)) for k, v in value.items()]
        return '{\n' + ',\n'.join(items) + '\n' + '  ' * indent + '}'
    items = [pad + to_json(v, indent + 1) for v in value]
    return '[\n' + ',\n'.join(items) + '\n' + '  ' * indent + ']'


def image_size(data):
    """(kind, width, height) for PNG or JPEG bytes, or None."""
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        w, h = struct.unpack('>II', data[16:24])
        return 'png', w, h
    if data[:2] == b'\xff\xd8':
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2):
                h, w = struct.unpack('>HH', data[i + 5:i + 9])
                return 'jpeg', w, h
            seg = struct.unpack('>H', data[i + 2:i + 4])[0]
            i += 2 + seg
    return None


def fetch(url):
    """(bytes, Last-Modified as UTC datetime or None). Falls back to curl when this Python's SSL is too old
    for NASA's server (e.g. the macOS system Python)."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
            data = r.read()
            lm = r.headers.get('Last-Modified')
    except urllib.error.URLError as err:
        if 'SSL' not in str(err) and 'ssl' not in str(err):
            raise
        with tempfile.TemporaryDirectory() as tmp:
            body, head = os.path.join(tmp, 'body'), os.path.join(tmp, 'head')
            subprocess.run(['curl', '-sSfL', '-A', UA['User-Agent'], '-D', head, '-o', body, url], check=True, timeout=120)
            data = open(body, 'rb').read()
            lm = None
            for line in open(head, encoding='latin-1'):
                if line.lower().startswith('last-modified:'):
                    lm = line.split(':', 1)[1].strip()
    modified = email.utils.parsedate_to_datetime(lm).astimezone(timezone.utc) if lm else None
    return data, modified


def main():
    check_only = '--check' in sys.argv
    with open(FRAMES_JSON, encoding='utf-8') as f:
        doc = json.load(f)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    changed = False
    for fr in doc['frames']:
        url = fr.get('updateUrl')
        if not url:
            print(f"{fr['id']}: no latest-image address; kept ({fr['date']})")
            continue
        data, modified = fetch(url)
        path = os.path.join(ROOT, fr['image'])
        old = open(path, 'rb').read() if os.path.exists(path) else b''
        new_info, old_info = image_size(data), image_size(old)
        when = modified.strftime('%Y-%m-%d %H:%M UTC') if modified else 'unknown'
        if data == old:
            print(f"{fr['id']}: already the newest (NASA last changed it {when})")
            continue
        if not new_info or (old_info and new_info != old_info):
            print(f"{fr['id']}: NOT updated: the new file is {new_info}, expected {old_info}. Check the legend and masks by hand.")
            continue
        print(f"{fr['id']}: new image from NASA, last changed {when}")
        if check_only:
            continue
        with open(path, 'wb') as f:
            f.write(data)
        fr['imageUpdated'] = when
        fr['downloaded'] = today
        if fr.get('dateTemplate'):
            fr['date'] = fr['dateTemplate'].replace('{updated}', modified.strftime('%Y-%m-%d') if modified else 'unknown date')
        if fr.get('dateImageUrl') and fr.get('dateImage'):
            d, _ = fetch(fr['dateImageUrl'])
            with open(os.path.join(ROOT, fr['dateImage']), 'wb') as f:
                f.write(d)
            print(f"   also downloaded the date overlay to {fr['dateImage']}: read it to confirm the data time")
        changed = True
    if changed:
        with open(FRAMES_JSON, 'w', encoding='utf-8') as f:
            f.write(to_json(doc) + '\n')
        print('data/frames.json updated. Now open the Player for each frame, run the tests, and commit.')


if __name__ == '__main__':
    main()

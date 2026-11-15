"""Test Terra end to end with Chrome's real speech recognizer, without a microphone or a room.

Recordings of spoken requests ("Terra, are you still listening?", "Terra, take me to Japan.",
"Hey Terra, where am I?") are made with the Mac's own voices (`say`), then played to Terra
through a virtual microphone: an audio track that Chrome's recognizer listens to instead of
the real microphone, with a faint hiss like a real microphone's. Terra's own code then hears
what Google's recognizer makes of them and answers, exactly as with a person speaking.

  python3 tools/terra_voice_test.py                 # quiet room, nine voices, 27 requests
  python3 tools/terra_voice_test.py --talk 0.3      # with two people talking all the time underneath
  python3 tools/terra_voice_test.py Daniel Karen    # only these voices

Needs macOS (say, afconvert), Google Chrome, the site served at http://localhost:8931 and an
internet connection (Chrome's recognizer is Google's online service; only these synthetic
recordings are sent). Prints each request, what Terra heard, and whether it answered correctly.
Standard library only.
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sr_sim import ScreenReaderSim  # noqa: E402

VOICES = ['Samantha', 'Daniel', 'Fred', 'Eddy', 'Reed', 'Moira', 'Karen', 'Flo', 'Aman']
REQUESTS = ['Terra, are you still listening?', 'Terra, take me to Japan.', 'Hey Terra, where am I?']
TALK = [  # background conversation (made up), for --talk
    'So I was thinking we could finish the slides tonight and then practice the demo tomorrow morning before the '
    'judges come around. The poster still needs a title and somebody has to print it. Did anyone bring the charger?',
    'Honestly the food here is pretty good but the coffee ran out an hour ago. My team is still arguing about the '
    'colours for the website, and nobody wants to write the documentation. Maybe after lunch we can go for a walk.',
]

# The virtual microphone: every recognition session listens to this track instead of the real microphone.
VMIC = r"""(() => { const R = window.webkitSpeechRecognition; if (!R) return;
  let ac, dest;
  const setup = () => { if (ac) return; ac = new AudioContext(); dest = ac.createMediaStreamDestination();
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.003; // a real microphone's faint hiss
    const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true; ns.connect(dest); ns.start(); };
  const decode = async (b64) => ac.decodeAudioData(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer);
  window.__vmic = {
    async play(b64) { setup(); await ac.resume(); const s = ac.createBufferSource(); s.buffer = await decode(b64); s.connect(dest); s.start(); },
    async talk(list, gain) { setup(); for (const b64 of list) { const buf = await decode(b64), s = ac.createBufferSource(), g = ac.createGain();
      s.buffer = buf; s.loop = true; g.gain.value = gain; s.connect(g); g.connect(dest); s.start(0, Math.random() * buf.duration); } },
    track() { setup(); return dest.stream.getAudioTracks()[0]; } };
  const start = R.prototype.start;
  R.prototype.start = function () { return start.call(this, window.__vmic.track()); }; })();"""


def record(text, voice, folder, name):
    aiff, wav = os.path.join(folder, name + '.aiff'), os.path.join(folder, name + '.wav')
    subprocess.run(['say', '-v', voice, '-o', aiff, text], check=True)
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiff, wav], check=True)
    return base64.b64encode(open(wav, 'rb').read()).decode()


def answered(n, lines):
    terra = [line for line in lines if line.startswith('Terra:')]
    if n == 0:
        return any("I'm listening" in line for line in terra)
    if n == 1:
        return any('Japan' in line for line in terra)
    return any(line.startswith('Terra: You are here') for line in terra)


def main():
    args = sys.argv[1:]
    talk = 0.0
    if '--talk' in args:
        i = args.index('--talk')
        talk = float(args[i + 1])
        del args[i:i + 2]
    voices = args or VOICES
    folder = tempfile.mkdtemp(prefix='terra-voices-')
    print('Making recordings…')
    clips = {(v, n): record(REQUESTS[n], v, folder, f'{v}-{n}') for v in voices for n in range(len(REQUESTS))}
    talk_clips = [record(t, v, folder, f'talk{i}') for i, (t, v) in enumerate(zip(TALK, ['Albert', 'Kathy']))] if talk else []

    sim = ScreenReaderSim('http://localhost:8931', extra_args=('--use-fake-ui-for-media-stream',))
    sim.cdp.send('Page.addScriptToEvaluateOnNewDocument', {'source': VMIC})
    ok = total = 0
    try:
        sim.open('player.html?frame=sst', settle=3.0)
        sim.key('1', wait=1.0, report=False)   # the first question: built-in voice
        sim.eval('document.body.focus()')
        time.sleep(2.0)                        # choosing a voice switches Terra on by itself
        if sim.eval("document.getElementById('talk-btn').getAttribute('aria-pressed')") != 'true':
            sim.key('v', wait=3.0, report=False)   # Terra on
        if talk_clips:
            sim.eval(f'__vmic.talk({json.dumps(talk_clips)}, {talk})')
            print(f'Two people talking underneath, at {talk} of the request loudness')
        for v in voices:
            for n in range(len(REQUESTS)):
                for _ in range(40):  # like a person: wait until Terra has finished talking
                    if not sim.eval("import('/js/narrator.js').then((m) => m.isSpeaking())"):
                        break
                    time.sleep(0.25)
                sim.eval("document.getElementById('assistant-log').innerHTML = ''")
                sim.eval(f"__vmic.play('{clips[(v, n)]}')")
                time.sleep(6.5)
                lines = sim.eval("[...document.querySelectorAll('#assistant-log li')].map((li) => li.textContent)")
                good = answered(n, lines)
                ok += good
                total += 1
                you = next((line[5:] for line in lines if line.startswith('You:')), '(nothing)')
                print(f"{'OK  ' if good else 'MISS'} {v:9} {REQUESTS[n]!r:36} Terra heard: {you[:60]!r}")
                sim.eval('window.speechSynthesis && speechSynthesis.cancel()')
        on = sim.eval("document.getElementById('talk-btn').getAttribute('aria-pressed')")
        print(f'\n{ok}/{total} requests answered correctly; Terra still switched on: {on}')
    finally:
        sim.close()


if __name__ == '__main__':
    main()

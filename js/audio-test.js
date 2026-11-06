// audio-test.js: play the tone for any value in a frame's legend range.

import { loadFrameList, describeValue } from './decoder.js';
import { startAudio, isStarted, playTone, setVolume, setMuted, isMuted, frequencyFor, panFor } from './audio.js';
import { SETTINGS as S } from './settings.js';

const $ = (id) => document.getElementById(id);
const els = {
  msg: $('audio-msg'), start: $('start-btn'), mute: $('mute-btn'), select: $('frame-select'),
  slider: $('value-slider'), out: $('value-out'), volume: $('volume'), volumeOut: $('volume-out'),
  pan: $('pan-slider'), play: $('play-btn'),
};

let frames = [];

/** The legend entry nearest to slider position t (0..1). */
function entryAt(meta, t) {
  return meta.legend.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
}

function current() {
  const meta = frames.find((f) => f.id === els.select.value);
  const entry = entryAt(meta, els.slider.value / 1000);
  return { meta, entry };
}

function update(play) {
  const { meta, entry } = current();
  const f = Math.round(frequencyFor(entry.t));
  const pan = panFor(els.pan.value / 100).toFixed(2);
  els.out.textContent = `${describeValue(meta, entry)}: ${f} Hz, pan ${pan}`;
  els.slider.setAttribute('aria-valuetext', describeValue(meta, entry));
  if (play && isStarted()) {
    playTone({ t: entry.t, xFraction: els.pan.value / 100, family: entry.family, holdSeconds: S.keyToneSeconds });
  }
}

async function start() {
  if (await startAudio()) {
    els.msg.textContent = 'Sound is on. Start with your volume low.';
    els.start.hidden = true;
    return true;
  }
  els.msg.textContent = 'Sound could not start in this browser.';
  return false;
}

els.start.addEventListener('click', start);
els.play.addEventListener('click', async () => { if (isStarted() || (await start())) update(true); });
els.slider.addEventListener('input', () => update(true));
els.pan.addEventListener('input', () => update(true));
els.select.addEventListener('change', () => update(false));
els.volume.addEventListener('input', () => {
  setVolume(els.volume.value / 100);
  els.volumeOut.textContent = els.volume.value + '%';
});
els.mute.addEventListener('click', () => {
  setMuted(!isMuted());
  els.mute.setAttribute('aria-pressed', String(isMuted()));
  els.mute.textContent = isMuted() ? 'Unmute' : 'Mute';
});

try {
  frames = await loadFrameList();
  els.select.replaceChildren(...frames.map((f) => {
    const o = document.createElement('option'); o.value = f.id; o.textContent = f.title; return o;
  }));
  setVolume(els.volume.value / 100);
  update(false);
} catch (err) {
  els.msg.className = 'error';
  els.msg.textContent = 'The frame list could not be loaded. ' + err.message;
}

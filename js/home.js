// home.js: the Start audio button on the home page.
// Plays a short sound check (low, middle, high) so the listener can set the
// volume before opening the Player. (Browsers start sound fresh on each page,
// so the Player has its own Start audio button too.)

import { startAudio, playTone, stopTone, audioSupported } from './audio.js';
import { SETTINGS as S } from './settings.js';

const btn = document.getElementById('start-btn');
const msg = document.getElementById('audio-msg');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!audioSupported()) {
  btn.disabled = true;
  msg.textContent = 'Sound is not available in this browser.';
}

btn.addEventListener('click', async () => {
  if (!(await startAudio())) {
    msg.textContent = 'Sound could not start. Check that your device is not muted, then try again.';
    return;
  }
  btn.disabled = true;
  for (const [name, t] of [['Low', 0], ['Middle', 0.5], ['High', 1]]) {
    msg.textContent = `Sound check: ${name.toLowerCase()} note.`;
    playTone({ t, xFraction: 0.5 });
    await wait(S.referenceSeconds * 700);
    stopTone();
    await wait(250);
  }
  msg.textContent = 'Sound check done: low, middle and high. Now open the player.';
  btn.disabled = false;
  btn.textContent = 'Play the sound check again';
});

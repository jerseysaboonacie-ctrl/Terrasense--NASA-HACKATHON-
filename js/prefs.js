// prefs.js: the listener's settings, remembered in this browser between visits.
//
// Only conveniences live here (voice mode, detail, speed, volume). If the
// browser blocks storage (private window, blocked site data), the defaults
// are used and nothing breaks.

const KEY = 'terrasense-jukebox-prefs-v1';

export const DEFAULTS = Object.freeze({
  voiceMode: 'screenreader',  // 'screenreader' | 'voice' | 'off'
  detail: 'normal',           // 'short' | 'normal' | 'full'
  speechRate: 1,              // built-in voice speed
  volume: 30,                 // percent, 0..100 (the audio engine caps the output)
  announceMoving: false,      // read the value when the mouse stops moving
  soundCues: true,            // edge bump and error tone
  vibrate: true,
  highContrast: false,        // display settings, applied on every page by display.js
  largeText: false,
  reduceMotion: false,
});

const VALID = {
  voiceMode: ['screenreader', 'voice', 'off'],
  detail: ['short', 'normal', 'full'],
  speechRate: [0.8, 1, 1.3, 1.7],
};

/** Read saved settings; anything missing or invalid falls back to the default. */
export function loadPrefs() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch (e) { /* storage blocked or corrupt: use defaults */ }
  const out = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) {
    const v = saved[k];
    if (v === undefined) continue;
    if (VALID[k] && !VALID[k].includes(v)) continue;
    if (typeof v !== typeof DEFAULTS[k]) continue;
    if (k === 'volume' && !(v >= 0 && v <= 100)) continue;
    out[k] = v;
  }
  return out;
}

export function savePrefs(prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* not saved: fine */ }
}

export function clearPrefs() {
  try { localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
}

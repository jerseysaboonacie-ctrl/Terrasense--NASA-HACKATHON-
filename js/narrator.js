// narrator.js: the words for the info panel and the narration line.
//
// The panel and the narration are built from the same strings here, so the
// wording and numbers always match exactly (a rule in the plan).

import { describePlace } from './decoder.js';

/** A rough region name from latitude, so narration says where, not just numbers. */
export function regionName(lat) {
  const a = Math.abs(lat);
  const ns = lat >= 0 ? 'north' : 'south';
  if (a < 10) return 'near the equator';
  if (a < 30) return `${ns}ern tropics`;
  if (a < 60) return `${ns}ern mid-latitudes`;
  return `far ${ns}`;
}

/**
 * Describe a decode result.
 * Returns { value, place, narration } where narration is one short sentence
 * built only from value and place.
 */
export function describeResult(meta, r) {
  const value = r.status === 'value' ? r.text : `no data, ${r.reason}`;
  const place = `${regionName(r.lat)}, ${describePlace(r.lon, r.lat)}`;
  const narration = `${meta.spokenName}: ${value}, ${place}.`;
  return { value, place, narration };
}

// ---------------------------------------------------------------------------
// Speaking aloud (optional, for people not using a screen reader)
// ---------------------------------------------------------------------------

export function speechSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Speak a sentence, cutting off anything still being spoken. */
export function speak(text) {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

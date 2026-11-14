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
 * built only from value and place. `detail` sets how much is said:
 *   short   the value only ("about 28 °C")
 *   normal  variable, value and place (the default)
 *   full    normal, plus how far up the legend the value is
 *   compact value and place, no variable name (used for repeated arrow-key steps)
 */
export function describeResult(meta, r, detail = 'normal') {
  const value = r.status === 'value' ? r.text : `no data, ${r.reason}`;
  const place = `${regionName(r.lat)}, ${describePlace(r.lon, r.lat)}`;
  let narration = `${meta.spokenName}: ${value}, ${place}.`;
  // Short and compact sentences start with the value, so give it a capital (a sentence cue for screen readers).
  const capValue = value.charAt(0).toUpperCase() + value.slice(1);
  if (detail === 'short') narration = `${capValue}.`;
  else if (detail === 'compact') narration = `${capValue}, ${place}.`;
  else if (detail === 'full' && r.status === 'value') {
    narration += ` ${Math.round(r.t * 100)} percent of the way up the legend.`;
  }
  return { value, place, narration };
}

/**
 * How the map is laid out, in words, from the frame's own facts
 * (projection, map area and no-data labels in frames.json).
 */
export function describeLayout(meta) {
  const parts = [];
  if (meta.projection === 'equirectangular') {
    parts.push('The map shows the whole world, flat: west on the left, east on the right, ' +
      'north at the top, south at the bottom. The equator runs across the middle.');
  }
  const silent = [
    ...(meta.noDataColors || []).map((n) => n.label),
    ...(meta.transparent ? [meta.transparent.label] : []),
    ...(meta.masks || []).map((m) => m.label),
  ].filter(Boolean);
  if (silent.length) parts.push(`Silent, with one soft click: ${silent.join('; ')}.`);
  else parts.push('Every place on the map has a value.');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Speaking aloud (optional, for people not using a screen reader)
// ---------------------------------------------------------------------------

export function speechSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Speak a sentence, cutting off anything still being spoken. */
export function speak(text, rate = 1, onEnd) {
  if (!speechSupported()) { if (onEnd) onEnd(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = document.documentElement.lang || 'en';
  u.rate = rate;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

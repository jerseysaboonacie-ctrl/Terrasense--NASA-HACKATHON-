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

// Our own record of whether the built-in voice is talking. Chrome's
// speechSynthesis.speaking can stay true after speech ends (a known bug), so
// it is not trusted: we count from each utterance's start to its end, with a
// time limit in case an end event never arrives.
let speechGen = 0;        // bumps on every new speak() or stop, so old events are ignored
let active = 0;           // utterances of the current speak() still to finish
let speakingUntil = 0;    // time limit for `active`
const keep = [];          // references, so Chrome does not drop utterances (and their end events)
let voice = null;

/** A local English voice if there is one (works offline and avoids network voices). */
function pickVoice() {
  if (voice || !speechSupported()) return voice;
  const voices = window.speechSynthesis.getVoices();
  voice = voices.find((v) => v.lang === 'en-US' && v.localService) ||
    voices.find((v) => /^en/.test(v.lang) && v.localService) || voices.find((v) => /^en/.test(v.lang)) || null;
  return voice;
}
if (speechSupported()) window.speechSynthesis.addEventListener?.('voiceschanged', () => { voice = null; pickVoice(); });

/** Split long text into sentence groups of about 200 characters (Chrome cuts off long utterances). */
function chunksForSpeech(text) {
  const parts = [];
  let cur = '';
  for (const s of text.split(/(?<=[.!?…])\s+/)) {
    if (cur && (cur + ' ' + s).length > 200) { parts.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s;
  }
  if (cur) parts.push(cur);
  return parts;
}

/**
 * Browsers only let a page speak after the user has pressed a key, clicked or
 * tapped on it. False until then (window.__testUserActivation is for the tests).
 */
export function canSpeakNow() {
  if (window.__testUserActivation) return true;
  const ua = navigator.userActivation;
  return !ua || ua.hasBeenActive;
}

/** True while the built-in voice is reading something we asked it to read. */
export function isSpeaking() {
  return active > 0 && performance.now() < speakingUntil;
}

/** Speak text, cutting off anything still being spoken. onEnd runs when it has all been read. */
export function speak(text, rate = 1, onEnd) {
  if (!speechSupported() || !text) { if (onEnd) onEnd(); return; }
  const synth = window.speechSynthesis;
  const gen = ++speechGen;
  synth.cancel();
  keep.length = 0;
  const parts = chunksForSpeech(text);
  active = parts.length;
  // About 150 words a minute at rate 1, plus a margin.
  speakingUntil = performance.now() + (text.split(/\s+/).length / (2.5 * rate)) * 1000 + 3000;
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = 'en-US';
    u.rate = rate;
    const v = pickVoice();
    if (v) u.voice = v;
    const done = () => {
      if (gen !== speechGen) return;
      active = Math.max(0, active - 1);
      if (i === parts.length - 1) { active = 0; if (onEnd) onEnd(); }
    };
    u.onend = done;
    u.onerror = done;
    keep.push(u);
    synth.speak(u);
  });
}

export function stopSpeaking() {
  speechGen++;
  active = 0;
  if (speechSupported()) window.speechSynthesis.cancel();
}

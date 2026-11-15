// narrator.js: the words for the info panel and the narration line.
//
// The panel and the narration are built from the same strings here, so the
// wording and numbers always match exactly (a rule in the plan).

import { describePlace } from './decoder.js';

/** A rough region name from latitude, so narration says where, not just numbers. */
import { terraLog } from './terra-log.js';

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
let speakStarted = 0;     // when the current speak() began
const keep = [];          // references, so Chrome does not drop utterances (and their end events)
let voice = null;
let loggedStart = false;  // log the first time the voice really speaks on a page

/** A local English voice if there is one (works offline and avoids network voices). */
function pickVoice() {
  if (voice || !speechSupported()) return voice;
  const voices = window.speechSynthesis.getVoices();
  const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Grandma|Grandpa|Junior|Ralph|Rocko)\b/;
  const fine = voices.filter((v) => !NOVELTY.test(v.name));
  voice = fine.find((v) => v.lang === 'en-US' && v.localService && v.default) || fine.find((v) => v.lang === 'en-US' && v.localService) ||
    fine.find((v) => /^en/.test(v.lang) && v.localService) || fine.find((v) => /^en/.test(v.lang)) || null;
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
  if (queue.length || waitingNext) return true; // more to say: still "talking" (Terra's microphone stays paused)
  if (active <= 0 || performance.now() >= speakingUntil) return false;
  // Chrome's own flag can stay stuck at true, but when it says false (after a moment to start), speech is over.
  const synth = speechSupported() ? window.speechSynthesis : null;
  if (synth && !synth.speaking && !synth.pending && performance.now() - speakStarted > 700) { active = 0; return false; }
  return true;
}

/**
 * Speak text, cutting off anything still being spoken. onEnd runs when it has all been read.
 *
 * Chrome on a Mac can get its speech engine stuck: it says it is speaking, but no sound comes and no
 * "start" event arrives. So if speech has not started within a second, it is reset and tried again;
 * then with another voice (Google's own voices are played by Chrome itself, a different route); and
 * if nothing works, the page is told (speechTrouble), so it can ask the person to restart Chrome.
 */
export function speak(text, rate = 1, onEnd, { priority = 'high' } = {}) {
  if (!speechSupported() || !text) { if (onEnd) onEnd(); return; }
  // Terra never cuts herself off: while something important is being said, new speech waits its turn.
  // Low-priority speech (what is under the pointer) waits too, and only the newest one is kept.
  if (busyHigh()) {
    if (priority === 'low') { pendingLow = { text, rate, onEnd }; return; }
    if (queue.length < 4) queue.push({ text, rate, onEnd });
    return;
  }
  pendingLow = null;
  currentPriority = priority;
  window.dispatchEvent(new Event('terrasense-speech-start')); // Terra's microphone pauses at once (no echo)
  speakAttempt(text, rate, () => { currentPriority = null; if (onEnd) onEnd(); playNext(); }, 0);
}

let queue = [];            // important speech waiting for the current speech to finish
let pendingLow = null;     // the newest pointer reading waiting (older ones are dropped)
let currentPriority = null; // 'high' | 'low' while something is being said

function busyHigh() { return currentPriority === 'high' && isSpeaking(); }

function playNext() {
  let next = queue.shift(), priority = 'high';
  if (!next && pendingLow) { next = pendingLow; pendingLow = null; priority = 'low'; }
  if (!next) return;
  waitingNext = true;
  setTimeout(() => { waitingNext = false; speak(next.text, next.rate, next.onEnd, { priority }); }, 150);
}
let waitingNext = false;

let troubleShown = false;
/** True after speech failed to start even after the retries (shown once per page). */
export let speechTrouble = false;

function speakAttempt(text, rate, onEnd, attempt) {
  const synth = window.speechSynthesis;
  const gen = ++speechGen;
  synth.cancel();
  if (attempt > 0) { try { synth.resume(); } catch (e) { /* fine */ } }
  keep.length = 0;
  const parts = chunksForSpeech(text);
  active = parts.length;
  speakStarted = performance.now();
  // About 150 words a minute at rate 1, plus a margin.
  speakingUntil = performance.now() + (text.split(/\s+/).length / (2.5 * rate)) * 1000 + 3000;
  let started = false;
  const voiceFor = () => {
    if (attempt === 0) return pickVoice();
    const all = synth.getVoices();
    if (attempt === 1) return pickVoice();
    // Attempt 2: a different route: Google's voice (played by Chrome), else the system default voice.
    return all.find((v) => /^Google US English/.test(v.name)) || all.find((v) => /^Google/.test(v.name) && /^en/.test(v.lang)) || null;
  };
  const chosen = voiceFor();
  setTimeout(() => {
    if (gen !== speechGen || started) return;
    terraLog('speech did not start', { attempt, voice: chosen ? chosen.name : 'default', speaking: synth.speaking, pending: synth.pending, voices: synth.getVoices().length });
    if (attempt < 2) { speakAttempt(text, rate, onEnd, attempt + 1); return; }
    speechTrouble = true;
    if (!troubleShown) { troubleShown = true; window.dispatchEvent(new CustomEvent('terrasense-speech-trouble')); }
    active = 0;
    if (onEnd) onEnd();
  }, attempt === 0 ? 1200 : 1500);
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.onstart = () => {
      started = true;
      if (!loggedStart || attempt > 0) { loggedStart = true; terraLog(attempt ? 'speech recovered' : 'speech works', { attempt, voice: u.voice ? u.voice.name : 'default' }); }
      if (attempt === 2 && chosen) voice = chosen; // keep the voice that works
    };
    u.lang = 'en-US';
    u.rate = rate;
    if (chosen) u.voice = chosen;
    const done = () => {
      if (gen !== speechGen) return;
      active = Math.max(0, active - 1);
      if (i === parts.length - 1) { active = 0; if (onEnd) onEnd(); }
    };
    u.onend = done;
    u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled') terraLog('speech error', { error: e.error, voice: u.voice ? u.voice.name : 'default' }); done(); };
    keep.push(u);
    synth.speak(u);
  });
}

export function stopSpeaking() {
  speechGen++;
  active = 0;
  queue = []; pendingLow = null; currentPriority = null;
  if (speechSupported()) window.speechSynthesis.cancel();
}

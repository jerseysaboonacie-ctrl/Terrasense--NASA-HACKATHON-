// player.js: the Jukebox Player.
//
// Pointer (mouse, touch, pen), keyboard, scan, reference tones, narration and
// the Explain panel. Every value comes from decodeAt() (decoder.js), every
// sound from the single voice in audio.js, and every sentence from
// narrator.js, so the panel, the sound and the narration always agree.

import { loadFrameList, loadFrame, decodeAt } from './decoder.js';
import {
  startAudio, isStarted, audioSupported, playTone, stopTone, playClick,
  setVolume, setMuted, isMuted, frequencyFor, panFor, waveformFor, audioState, playCue,
} from './audio.js';
import { drawLegend, referenceTones } from './legend.js';
import { describeResult, describeLayout, speak, speechSupported, stopSpeaking } from './narrator.js';
import { analyseFrame, describePattern, describeDifference } from './analysis.js';
import { SETTINGS as S } from './settings.js';
import { loadPrefs, savePrefs, clearPrefs, DEFAULTS } from './prefs.js';

const $ = (id) => document.getElementById(id);
const els = {
  title: $('frame-title'), date: $('frame-date'), startBtn: $('start-btn'), muteBtn: $('mute-btn'),
  audioMsg: $('audio-msg'), status: $('status'), alert: $('alert'),
  intro: $('intro'), layoutText: $('layout-text'), tourBtn: $('tour-btn'), whereBtn: $('where-btn'),
  frameSelect: $('frame-select'), voiceRadios: [...document.querySelectorAll('input[name="voice-mode"]')],
  detailSelect: $('detail-select'), rateSelect: $('rate-select'), rateRow: $('rate-row'),
  movingToggle: $('moving-toggle'), cuesToggle: $('cues-toggle'), resetBtn: $('reset-btn'),
  wrap: $('frame-wrap'), canvas: $('frame-canvas'), cursor: $('cursor'),
  narration: $('narration-line'), infoVariable: $('info-variable'), infoValue: $('info-value'),
  infoPlace: $('info-place'), infoDate: $('info-date'), infoSwatch: $('info-swatch'),
  explainBtn: $('explain-btn'), explain: $('explain'), explainSteps: $('explain-steps'),
  scanBtn: $('scan-btn'), rowSelect: $('row-select'), overview: $('overview-toggle'),
  volume: $('volume'), volumeOut: $('volume-out'),
  vibrateLabel: $('vibrate-label'), vibrateToggle: $('vibrate-toggle'),
  helpBtn: $('help-btn'), helpDialog: $('help-dialog'),
  legendCanvas: $('legend-canvas'), legendEnds: $('legend-ends'), colorbars: $('colorbars'),
  refButtons: $('ref-buttons'), live: $('live'),
  summaryBtn: $('summary-btn'), highBtn: $('high-btn'), nextHighBtn: $('next-high-btn'), lowBtn: $('low-btn'),
  summaryBox: $('summary-box'), summaryText: $('summary-text'),
  markABtn: $('mark-a-btn'), markBBtn: $('mark-b-btn'), compareBtn: $('compare-btn'),
  compareA: $('compare-a'), compareB: $('compare-b'), compareResult: $('compare-result'),
  markerA: $('marker-a'), markerB: $('marker-b'),
};

let frame = null;          // { meta, width, height, data, bitmap }
let point = null;          // pointer position in image pixels
let last = null;           // last decode result
let lastStatus = null;     // 'value' / 'nodata': a click plays only when entering no data
let wasAboveThreshold = false;
let narrateTimer = null;
let scan = null;           // running scan: { start, row, overview, raf, lastNull }
let overviewCache = null;  // average legend position per column, for overview scans
let prefs = loadPrefs();   // voice mode, detail, speed, volume... (prefs.js)
let dragMoved = false;     // a touch or pen drag moved since it started

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

function swatch(rgb) {
  const s = el('span', null, 'swatch');
  s.style.background = css(rgb);
  s.setAttribute('aria-hidden', 'true');
  return s;
}

/**
 * An error: shown on screen and read at once (assertive role="alert"), with
 * an error tone. In built-in voice mode it is spoken instead, so a screen
 * reader and the voice never talk at the same time.
 */
function showError(message) {
  els.status.textContent = '';
  els.alert.textContent = message;
  if (prefs.soundCues) playCue('error');
  if (prefs.voiceMode === 'voice') speak(message, prefs.speechRate);
}

/** Horizontal position inside the map, 0 (left edge) to 1 (right edge). */
function xFraction(x) {
  const a = frame.meta.mapArea;
  return (x - a.x) / Math.max(1, a.width - 1);
}

/** Image row for a latitude (equirectangular map). */
function latToY(lat) {
  const a = frame.meta.mapArea;
  return Math.min(a.y + a.height - 1, Math.max(a.y, Math.round(a.y + ((90 - lat) / 180) * a.height - 0.5)));
}

// ---------------------------------------------------------------------------
// Narration: polite live region (screen readers) and optional speech
// ---------------------------------------------------------------------------

/** Put text in the live region. A changing invisible suffix makes repeats get read again. */
function setLive(text) {
  const same = els.live.textContent.replace(/ $/, '') === text;
  els.live.textContent = same && !els.live.textContent.endsWith(' ') ? text + ' ' : text;
}

/**
 * Every announcement goes through here. The same text is always written to
 * the info panel's "Last announcement" line, then, by Voice mode:
 *   screenreader  the polite live region (the screen reader reads it)
 *   voice         the browser's built-in voice (no live region)
 *   off           nowhere else
 * Only one of the two voices is ever used, so they never talk at once.
 */
let saidSomething = false; // anything announced yet (the opening message must not talk over it)

function say(text) {
  saidSomething = true;
  els.narration.textContent = text;
  if (prefs.voiceMode === 'screenreader') setLive(text);
  else if (prefs.voiceMode === 'voice') speak(text, prefs.speechRate);
}
const announce = say;
const announceStatus = say;

// ---------------------------------------------------------------------------
// Audio start, mute and volume
// ---------------------------------------------------------------------------

/** Start audio if needed. Call only from a click, tap or key press. */
async function ensureAudio() {
  if (isStarted()) return true;
  if (!audioSupported()) return false;
  const ok = await startAudio();
  if (ok) {
    els.startBtn.hidden = true;
    els.audioMsg.textContent = 'Sound is on. Start with your volume low.';
  } else {
    els.audioMsg.textContent = 'Sound is off.';
    showError('Sound could not start. Check that the device is not muted, then press Start audio again.');
  }
  return ok;
}

function toggleMute() {
  const m = !isMuted();
  setMuted(m);
  if (m) { stopScan(false); stopSpeaking(); }
  els.muteBtn.setAttribute('aria-pressed', String(m));
  els.muteBtn.textContent = m ? 'Unmute' : 'Mute';
  announceStatus(m ? 'Sound muted.' : 'Sound on.');
}

// ---------------------------------------------------------------------------
// The core: show and play one point
// ---------------------------------------------------------------------------

/**
 * Decode the point under the pointer, update the panel, legend and explain
 * panel, and play its sound.
 *   announce  'now' | 'later' (after the pointer rests) | false
 *   hold      seconds the tone lasts (keyboard); omitted = until the pointer leaves
 *   force     play the no-data click even if we were already in no data
 *   prefix    words before the narration, e.g. "Warmest ocean area, 1 of 5: "
 */
function showPoint({ announce: when = false, hold, force = false, prefix = '', detail = prefs.detail } = {}) {
  if (!frame || !point) return;
  const r = decodeAt(frame, point.x, point.y);
  last = r;

  // Pointer marker
  els.cursor.hidden = false;
  els.cursor.style.left = ((point.x + 0.5) / frame.width) * 100 + '%';
  els.cursor.style.top = ((point.y + 0.5) / frame.height) * 100 + '%';

  // Info panel: the same strings the narration is built from. The
  // "Last announcement" line changes only when something is announced.
  const d = describeResult(frame.meta, r, detail);
  els.infoValue.textContent = d.value;
  els.infoPlace.textContent = d.place;
  els.infoSwatch.replaceChildren();
  if (r.status === 'value') {
    els.infoSwatch.append(swatch(r.matchedColor), ' matched legend colour');
  } else {
    els.infoSwatch.textContent = 'No data';
  }

  drawLegend(els.legendCanvas, frame.meta, r);
  if (!els.explain.hidden) renderExplain(r);

  playPoint(r, { hold, force });
  vibrate(r);

  clearTimeout(narrateTimer);
  const sentence = prefix + d.narration;
  if (when === 'now') say(sentence);
  else if (when === 'later') narrateTimer = setTimeout(() => announce(sentence), S.narrationDelayMs);
}

/** Sound for one decode result: a tone for a value, silence plus one click for no data. */
function playPoint(r, { hold, force }) {
  if (isStarted() && !isMuted()) {
    if (r.status === 'value') {
      playTone({ t: r.t, xFraction: xFraction(r.x), family: r.entry.family, holdSeconds: hold });
    } else {
      stopTone();
      if (lastStatus !== 'nodata' || force) playClick(xFraction(r.x));
    }
  }
  lastStatus = r.status;
}

/** Optional: one short pulse when the value rises past the threshold (Android only). */
function vibrate(r) {
  const above = r.status === 'value' && r.t >= S.vibration.threshold;
  if (above && !wasAboveThreshold && prefs.vibrate && 'vibrate' in navigator) {
    try { navigator.vibrate(S.vibration.pulseMs); } catch (e) { /* not allowed: ignore */ }
  }
  wasAboveThreshold = above;
}

// ---------------------------------------------------------------------------
// Explain this sound
// ---------------------------------------------------------------------------

function renderExplain(r) {
  const meta = frame.meta;
  const steps = [];
  const step = (...parts) => { const li = el('li'); li.append(...parts); steps.push(li); };

  if (!r.rgb) {
    step(`The point x ${r.x}, y ${r.y} is not read: no data, ${r.reason}.`);
    step('Sound: silence, plus one soft click when you enter the area.');
    els.explainSteps.replaceChildren(...steps);
    return;
  }

  const how = meta.smoothRadius > 0 ? 'the middle colour of the 3 by 3 pixels around' : 'the colour of';
  step(`Pixel colour: `, swatch(r.rgb), ` red ${r.rgb[0]}, green ${r.rgb[1]}, blue ${r.rgb[2]} (${how} x ${r.x}, y ${r.y}).`);

  if (r.status === 'value') {
    step(`Closest legend colour: `, swatch(r.matchedColor),
      ` red ${r.matchedColor[0]}, green ${r.matchedColor[1]}, blue ${r.matchedColor[2]}. ` +
      `Colour distance ${r.distance.toFixed(1)}; anything over ${meta.maxColorDistance} would count as no data.`);
    step(`Value: ${r.text}, which is ${Math.round(r.t * 100)}% of the way up the legend.`);
    const f = frequencyFor(r.t);
    const pan = panFor(xFraction(r.x));
    const side = Math.abs(pan) < 0.05 ? 'centre' : pan < 0 ? 'left' : 'right';
    const ratio = S.maxFrequency / S.minFrequency;
    step(`Sound: ${Math.round(f)} Hz (${S.minFrequency} Hz × ${ratio} to the power ${r.t.toFixed(2)}), ` +
      `${waveformFor(r.entry.family)} wave, panned ${side} (${pan.toFixed(2)}).`);
  } else {
    if (r.matchedColor) step(`This is the colour used for: ${r.reason}.`);
    else if (r.distance != null) step(`No legend colour is close enough: the closest is ${r.distance.toFixed(1)} away, and the limit is ${meta.maxColorDistance}.`);
    else step(`No data: ${r.reason}.`);
    step('Value: none. The app never guesses.');
    step('Sound: silence, plus one soft click when you enter the area.');
  }
  els.explainSteps.replaceChildren(...steps);
}

els.explainBtn.addEventListener('click', () => {
  const open = els.explain.hidden;
  els.explain.hidden = !open;
  els.explainBtn.setAttribute('aria-expanded', String(open));
  if (open && last) renderExplain(last);
});

// ---------------------------------------------------------------------------
// Pointer: mouse, touch and pen share one code path (Pointer Events)
// ---------------------------------------------------------------------------

function eventToPixel(e) {
  const rect = els.canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * frame.width;
  const y = ((e.clientY - rect.top) / rect.height) * frame.height;
  return {
    x: Math.min(frame.width - 1, Math.max(0, Math.floor(x))),
    y: Math.min(frame.height - 1, Math.max(0, Math.floor(y))),
  };
}

els.wrap.addEventListener('pointerdown', (e) => {
  if (!frame) return;
  stopScan(false);
  try { els.wrap.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
  const p = eventToPixel(e);
  dragMoved = false;
  const go = () => { point = p; showPoint({ announce: 'now' }); };
  if (isStarted()) go(); else ensureAudio().then(go);
});

els.wrap.addEventListener('pointermove', (e) => {
  if (!frame || scan) return;
  // Touch and pen only explore while pressed; the mouse explores on hover.
  if (e.pointerType !== 'mouse' && !els.wrap.hasPointerCapture(e.pointerId)) return;
  point = eventToPixel(e);
  // Mouse: read the value when it stops, only if that setting is on.
  // Touch and pen: read it when the finger lifts (endPress).
  const mouse = e.pointerType === 'mouse';
  if (!mouse) dragMoved = true;
  showPoint({ announce: mouse && prefs.announceMoving ? 'later' : false });
});

function endPress(e) {
  if (e.pointerType !== 'mouse') {
    stopTone();
    if (dragMoved && e.type === 'pointerup' && frame && point) {
      say(describeResult(frame.meta, decodeAt(frame, point.x, point.y), prefs.detail).narration);
    }
    dragMoved = false;
  }
  try { els.wrap.releasePointerCapture(e.pointerId); } catch (err) { /* not captured */ }
}
els.wrap.addEventListener('pointerup', endPress);
els.wrap.addEventListener('pointercancel', endPress);
els.wrap.addEventListener('pointerleave', () => {
  if (!scan) stopTone();
  lastStatus = null;
});

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

const EDGE_NAMES = {
  ArrowLeft: 'left side, west', ArrowRight: 'right side, east',
  ArrowUp: 'top, far north', ArrowDown: 'bottom, far south',
};

els.wrap.addEventListener('keydown', (e) => {
  if (!frame || e.ctrlKey || e.metaKey || e.altKey) return;
  const step = Math.max(1, Math.round(frame.width / 100)) * (e.shiftKey ? 8 : 1);
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const move = moves[e.key];
  const replay = e.key === 'Enter' || e.key === ' ';
  if (!move && !replay) {
    if (!isStarted() && e.key.length === 1) ensureAudio(); // "press any key" starts sound
    return;
  }
  e.preventDefault();
  stopScan(false);
  const act = () => {
    let prefix = '';
    if (move) {
      const a = frame.meta.mapArea;
      const nx = Math.min(a.x + a.width - 1, Math.max(a.x, point.x + move[0]));
      const ny = Math.min(a.y + a.height - 1, Math.max(a.y, point.y + move[1]));
      // Already at the edge: say so, with a bump, instead of staying silent.
      if ((move[0] && nx === point.x) || (move[1] && ny === point.y)) {
        prefix = `Edge of the map, ${EDGE_NAMES[e.key]}. `;
        if (prefs.soundCues) playCue('edge', xFraction(nx));
      }
      point.x = nx;
      point.y = ny;
    }
    showPoint({ announce: 'now', hold: S.keyToneSeconds, force: replay || Boolean(prefix), prefix });
  };
  if (isStarted()) act(); else ensureAudio().then(act);
});

// Shortcuts that work anywhere on the page, except while typing in a field.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || els.helpDialog.open) return;
  const t = e.target;
  const typing = t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' ||
    (t.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button'].includes(t.type));
  if (typing) return;
  if (e.key === 'm' || e.key === 'M') { e.preventDefault(); toggleMute(); }
  else if (e.key === 't' || e.key === 'T') { e.preventDefault(); tourStep(); }
  else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); whereAmI(); }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); changeVolume(-10); }
  else if (e.key === '+' || e.key === '=') { e.preventDefault(); changeVolume(10); }
  else if (e.key === 's' || e.key === 'S') { e.preventDefault(); toggleScan(); }
  else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); mark('A'); }
  else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); mark('B'); }
  else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); compare(); }
  else if (e.key === '?') { e.preventDefault(); els.helpDialog.showModal(); }
  else if (e.key === 'Escape') { stopScan(true); stopTone(); stopSpeaking(); stopTour(true); }
});

// ---------------------------------------------------------------------------
// Scan: sweep left to right along a row (or play column averages)
// ---------------------------------------------------------------------------

/** Average legend position of each column (ignoring no data), in up to 512 bins. */
function computeOverview() {
  const a = frame.meta.mapArea;
  const bins = Math.min(512, a.width);
  const rowStep = Math.max(1, Math.floor(a.height / 128));
  const out = [];
  for (let b = 0; b < bins; b++) {
    const x = a.x + Math.floor(((b + 0.5) * a.width) / bins);
    let sum = 0, n = 0;
    for (let y = a.y; y < a.y + a.height; y += rowStep) {
      const r = decodeAt(frame, x, y);
      if (r.status === 'value') { sum += r.t; n++; }
    }
    out.push(n ? sum / n : null);
  }
  return out;
}

function toggleScan() {
  if (scan) stopScan(true); else startScan();
}

async function startScan() {
  if (!frame) return;
  if (!isStarted() && !(await ensureAudio())) return;
  if (isMuted()) { announceStatus('Sound is muted. Press M to unmute, then scan.'); return; }
  stopSpeaking();
  const a = frame.meta.mapArea;
  const overview = els.overview.checked;
  const row = els.rowSelect.value === 'pointer' ? point.y : latToY(Number(els.rowSelect.value));
  if (overview && !overviewCache) overviewCache = computeOverview();

  scan = { start: performance.now(), row, overview, raf: 0, lastNull: false };
  els.scanBtn.setAttribute('aria-pressed', 'true');
  els.scanBtn.textContent = 'Stop scan';
  lastStatus = null;
  const lat = 90 - ((row - a.y + 0.5) / a.height) * 180;
  announceStatus(overview
    ? 'Overview scan: the average of each column, left to right.'
    : `Scanning the row at ${Math.abs(lat).toFixed(0)} degrees ${lat >= 0 ? 'north' : 'south'}, left to right.`);

  const tick = (now) => {
    if (!scan) return;
    const f = (now - scan.start) / (S.scanSeconds * 1000);
    if (f >= 1) { stopScan(false); announceStatus('Scan finished.'); return; }
    const x = a.x + Math.min(a.width - 1, Math.floor(f * a.width));
    point = { x, y: scan.row };
    if (scan.overview) {
      const t = overviewCache[Math.min(overviewCache.length - 1, Math.floor(f * overviewCache.length))];
      els.cursor.hidden = false;
      els.cursor.style.left = ((x + 0.5) / frame.width) * 100 + '%';
      els.cursor.style.top = ((scan.row + 0.5) / frame.height) * 100 + '%';
      if (t == null) {
        stopTone();
        if (!scan.lastNull) playClick(f);
        scan.lastNull = true;
      } else {
        playTone({ t, xFraction: f });
        scan.lastNull = false;
      }
    } else {
      showPoint({});
    }
    scan.raf = requestAnimationFrame(tick);
  };
  scan.raf = requestAnimationFrame(tick);
}

function stopScan(announceIt) {
  if (!scan) return;
  cancelAnimationFrame(scan.raf);
  scan = null;
  stopTone();
  els.scanBtn.setAttribute('aria-pressed', 'false');
  els.scanBtn.textContent = 'Scan';
  if (announceIt) announceStatus('Scan stopped.');
}

els.scanBtn.addEventListener('click', toggleScan);
els.overview.addEventListener('change', () => { if (scan) stopScan(false); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { stopScan(false); stopTone(); stopSpeaking(); }
});

// ---------------------------------------------------------------------------
// Summary and "go to" the warmest / coolest areas
// (all computed from decoded values in analysis.js)
// ---------------------------------------------------------------------------

let analysis = null;       // computed once per frame, on first use
let highIndex = -1;        // which "warmest" area we are on, for Next warmest

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function getAnalysis() {
  if (!analysis) analysis = analyseFrame(frame);
  return analysis;
}

/** Value and place of a point, in exactly the words the info panel uses. */
function pointWords(p) {
  const d = describeResult(frame.meta, decodeAt(frame, p.x, p.y));
  return `${d.value}, ${d.place}`;
}

function buildSummary() {
  const meta = frame.meta;
  const T = meta.terms;
  const A = getAnalysis();
  // "Most recent frame on ..." reads better mid-sentence in lower case.
  const date = /^[A-Z][a-z]/.test(meta.date) ? meta.date.charAt(0).toLowerCase() + meta.date.slice(1) : meta.date;
  if (!A.high.length || !A.low.length) {
    return `Summary of ${meta.title}, ${date}: there is not enough decoded data to find areas.`;
  }
  return [
    `Summary of ${meta.title}, ${date}.`,
    `${cap(T.high)} ${T.area}: ${pointWords(A.high[0].rep)}.`,
    `${cap(T.low)} ${T.area}: ${pointWords(A.low[0].rep)}.`,
    describePattern(meta, A.bands),
    `Based on ${A.points.toLocaleString('en-US')} decoded points; values are approximate.`,
  ].join(' ');
}

els.summaryBtn.addEventListener('click', () => {
  if (!frame) return;
  stopScan(false);
  const text = buildSummary();
  els.summaryText.textContent = text;
  els.summaryBox.hidden = false;
  announceStatus(text);
});

/** Move to the i-th warmest ('high') or coolest ('low') area and announce it. */
async function goToArea(kind, i) {
  if (!frame) return;
  stopScan(false);
  await ensureAudio();
  const list = getAnalysis()[kind];
  const T = frame.meta.terms;
  if (!list.length) { announceStatus(`There is not enough decoded data to find the ${T[kind]} ${T.area}.`); return; }
  const area = list[i % list.length];
  point = { x: area.rep.x, y: area.rep.y };
  const rank = list.length > 1 ? `, ${(i % list.length) + 1} of ${list.length}` : '';
  showPoint({ announce: 'now', hold: S.referenceSeconds, prefix: `${cap(T[kind])} ${T.area}${rank}: `, detail: atLeastNormal() });
}

els.highBtn.addEventListener('click', () => { highIndex = 0; goToArea('high', 0); });
els.nextHighBtn.addEventListener('click', () => { highIndex += 1; goToArea('high', highIndex); });
els.lowBtn.addEventListener('click', () => goToArea('low', 0));

// ---------------------------------------------------------------------------
// Compare two points
// ---------------------------------------------------------------------------

const marks = { A: null, B: null };   // { result, words }
let compareTimers = [];

function placeMarker(el, r) {
  el.hidden = false;
  el.style.left = ((r.x + 0.5) / frame.width) * 100 + '%';
  el.style.top = ((r.y + 0.5) / frame.height) * 100 + '%';
}

function mark(which) {
  if (!frame || !point) return;
  const r = decodeAt(frame, point.x, point.y);
  const d = describeResult(frame.meta, r);
  const words = `${d.value}, ${d.place}`;
  marks[which] = { result: r, words };
  const dd = which === 'A' ? els.compareA : els.compareB;
  dd.replaceChildren();
  if (r.status === 'value') dd.append(swatch(r.matchedColor), ' ');
  dd.append(words);
  placeMarker(which === 'A' ? els.markerA : els.markerB, r);
  announceStatus(`Point ${which} marked: ${words}.`);
}

/** Play A's sound, then B's, then announce the difference. */
async function compare() {
  if (!frame) return;
  if (!marks.A || !marks.B) { announceStatus('Mark point A and point B first.'); return; }
  stopScan(false);
  await ensureAudio();
  compareTimers.forEach(clearTimeout);
  const { A, B } = marks;
  const play = (r) => {
    if (!isStarted() || isMuted()) return;
    if (r.status === 'value') playTone({ t: r.t, xFraction: xFraction(r.x), family: r.entry.family, holdSeconds: 0.8 });
    else { stopTone(); playClick(xFraction(r.x)); }
  };
  lastStatus = null;
  play(A.result);
  compareTimers = [
    setTimeout(() => play(B.result), 1100),
    setTimeout(() => {
      let ending;
      if (A.result.status !== 'value' || B.result.status !== 'value') {
        const which = A.result.status !== 'value' ? (B.result.status !== 'value' ? 'both points have' : 'point A has') : 'point B has';
        ending = `They cannot be compared, because ${which} no data.`;
      } else {
        ending = describeDifference(frame.meta, A.result, B.result);
      }
      const text = `Compare. A: ${A.words}. B: ${B.words}. ${ending}`;
      els.compareResult.textContent = text;
      announceStatus(text);
    }, 2100),
  ];
}

els.markABtn.addEventListener('click', () => mark('A'));
els.markBBtn.addEventListener('click', () => mark('B'));
els.compareBtn.addEventListener('click', compare);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

els.startBtn.addEventListener('click', async () => {
  if (await ensureAudio()) announceStatus('Sound is on.');
});
els.muteBtn.addEventListener('click', toggleMute);
els.volume.addEventListener('input', () => setVolumePercent(Number(els.volume.value)));
// A screen reader reads the slider itself; the built-in voice needs telling.
els.volume.addEventListener('change', () => { if (prefs.voiceMode === 'voice') say(`Volume ${els.volume.value} percent.`); });
els.helpBtn.addEventListener('click', () => els.helpDialog.showModal());
window.addEventListener('resize', () => { if (frame) drawLegend(els.legendCanvas, frame.meta, last); });

function buildRowOptions() {
  const opts = [['pointer', 'Row under the pointer']];
  for (const lat of [60, 40, 20, 0, -20, -40, -60]) {
    opts.push([String(lat), lat === 0 ? 'Equator' : `${Math.abs(lat)}° ${lat > 0 ? 'N' : 'S'}`]);
  }
  els.rowSelect.replaceChildren(...opts.map(([v, label]) => { const o = el('option', label); o.value = v; return o; }));
}

function buildReferenceButtons(meta) {
  els.refButtons.replaceChildren(...referenceTones(meta).map((ref) => {
    const b = el('button', `${ref.name}: ${ref.label}`, 'secondary');
    b.type = 'button';
    b.addEventListener('click', async () => {
      if (!(await ensureAudio())) return;
      stopScan(false);
      if (isMuted()) { announceStatus('Sound is muted. Press M to unmute.'); return; }
      playTone({ t: ref.t, xFraction: 0.5, family: ref.family, holdSeconds: S.referenceSeconds });
      lastStatus = null;
      announceStatus(`${ref.name} reference tone: ${ref.label}, ${Math.round(frequencyFor(ref.t))} hertz.`);
    });
    return b;
  }));
}

function buildLegendText(meta) {
  const info = meta.legendInfo;
  let text;
  if (info.kind === 'discrete') text = `Top row: rain. Bottom row: snow. From ${info.min} (left) to ${info.max} ${meta.units} or more (right).`;
  else if (info.scale === 'relative') text = 'From Low (left) to High (right). No numbers on this legend.';
  else text = `From ${String(info.min).replace('-', '−')} ${meta.units} (left) to ${info.max} ${meta.units} (right).`;
  els.legendEnds.textContent = text;
  els.colorbars.replaceChildren(...meta.colorbars.map((src) => {
    const im = el('img'); im.src = src; im.alt = meta.colorbarAlt; return im;
  }));
}

// ---------------------------------------------------------------------------
// Settings: voice mode, detail, speed, volume, cues (remembered, prefs.js)
// ---------------------------------------------------------------------------

/** Go-to and Where am I always say the place, even on Short. */
function atLeastNormal() {
  return prefs.detail === 'short' ? 'normal' : prefs.detail;
}

function setPref(key, value) {
  prefs[key] = value;
  savePrefs(prefs);
}

function setVolumePercent(v) {
  v = Math.max(0, Math.min(100, Math.round(v)));
  els.volume.value = String(v);
  els.volume.setAttribute('aria-valuetext', `${v} percent`);
  els.volumeOut.textContent = v + '%';
  setVolume(v / 100);
  setPref('volume', v);
}

/** Minus / plus keys: change the volume by `delta` percent and say the new level. */
function changeVolume(delta) {
  setVolumePercent(Number(els.volume.value) + delta);
  const v = Number(els.volume.value);
  say(v === 0 ? 'Volume 0 percent, silent.' : v === 100 ? 'Volume 100 percent, the highest.' : `Volume ${v} percent.`);
}

/** Put every control in the state `prefs` says. */
function applyPrefs() {
  els.voiceRadios.forEach((r) => { r.checked = r.value === prefs.voiceMode; });
  els.detailSelect.value = prefs.detail;
  els.rateSelect.value = String(prefs.speechRate);
  els.movingToggle.checked = prefs.announceMoving;
  els.cuesToggle.checked = prefs.soundCues;
  els.vibrateToggle.checked = prefs.vibrate;
  setVolumePercent(prefs.volume);
}

els.voiceRadios.forEach((r) => r.addEventListener('change', () => {
  if (!r.checked) return;
  const before = prefs.voiceMode;
  setPref('voiceMode', r.value);
  if (before === 'voice') stopSpeaking();
  if (before === 'screenreader') els.live.textContent = '';
  // A screen reader already reads the radio button; only the built-in voice needs to confirm.
  if (r.value === 'voice') say('Built-in voice on.');
}));
els.detailSelect.addEventListener('change', () => setPref('detail', els.detailSelect.value));
els.rateSelect.addEventListener('change', () => {
  setPref('speechRate', Number(els.rateSelect.value));
  if (prefs.voiceMode === 'voice') say('This is the new speed.');
});
els.movingToggle.addEventListener('change', () => setPref('announceMoving', els.movingToggle.checked));
els.cuesToggle.addEventListener('change', () => setPref('soundCues', els.cuesToggle.checked));
els.vibrateToggle.addEventListener('change', () => setPref('vibrate', els.vibrateToggle.checked));
els.resetBtn.addEventListener('click', () => {
  clearPrefs();
  stopSpeaking();
  prefs = { ...DEFAULTS };
  if (!speechSupported()) prefs.voiceMode = 'screenreader';
  applyPrefs();
  say(`Settings reset: voice for screen readers, normal detail, volume ${prefs.volume} percent.`);
});

// ---------------------------------------------------------------------------
// Where am I, and the tour
// ---------------------------------------------------------------------------

function whereAmI() {
  if (!frame || !point) return;
  stopScan(false);
  const go = () => showPoint({ announce: 'now', hold: S.keyToneSeconds, force: true, prefix: 'You are here. ', detail: 'full' });
  if (isStarted()) go(); else ensureAudio().then(go);
}

let tour = null;           // { i, timers } while the tour runs

function tourSteps() {
  const meta = frame.meta;
  const T = meta.terms;
  const refs = referenceTones(meta);
  const n = 6;
  const head = (i, name) => `Tour, step ${i} of ${n}${name ? ', ' + name : ''}.`;
  return [
    { text: `${head(1)} This is ${meta.title}, ${meta.date}. ${meta.listenFor} Press T for the next step, or Escape to stop.` },
    { text: `${head(2, 'the layout')} ${describeLayout(meta)}` },
    { text: `${head(3, 'the sound')} Higher values play higher notes, on the same scale for every frame. ` +
        refs.map((r) => `${r.name}: ${r.label}.`).join(' ') + ' You are hearing them now, low to high.', tones: refs },
    { text: `${head(4, 'exploring')} Press Tab until you reach the map, then use the arrow keys. Shift and an arrow moves faster. ` +
        'With headphones, the left of the map is in your left ear. Silent places give one soft click. ' +
        'At the edge of the map you hear a bump. W tells you where you are; Enter plays the point again.' },
    { text: `${head(5, 'finding')} Summary reads out the ${T.high} and ${T.low} ${T.area}s and the pattern from the equator to the poles. ` +
        `Go to ${T.high} jumps there. To compare two places, press A at one and B at the other, then C.` },
    { text: `${head(6, 'settings')} Under Controls you can change the voice, how much is said, and the volume; ` +
        'minus and plus also change the volume, and M mutes. Question mark lists every key. End of tour.' },
  ];
}

/** T: start the tour, or go to the next step (after the last step, start again). */
async function tourStep() {
  if (!frame) return;
  stopScan(false);
  await ensureAudio();
  const steps = tourSteps();
  const i = tour && tour.i + 1 < steps.length ? tour.i + 1 : 0;
  if (tour) tour.timers.forEach(clearTimeout);
  tour = { i, timers: [] };
  const step = steps[i];
  say(step.text);
  if (step.tones && isStarted() && !isMuted()) {
    step.tones.forEach((r, k) => tour.timers.push(setTimeout(() => {
      playTone({ t: r.t, xFraction: 0.5, family: r.family, holdSeconds: 0.8 });
    }, 300 + k * 1100)));
  }
  els.tourBtn.textContent = i === steps.length - 1 ? 'Tour again (T)' : `Next tour step, ${i + 2} of ${steps.length} (T)`;
}

/** Escape: stop the tour (says so only if it was not already finished). */
function stopTour(announceIt) {
  if (!tour) return;
  tour.timers.forEach(clearTimeout);
  const finished = tour.i === tourSteps().length - 1;
  tour = null;
  els.tourBtn.textContent = 'Tour (T)';
  if (announceIt && !finished) say('Tour stopped.');
}

els.tourBtn.addEventListener('click', tourStep);
els.whereBtn.addEventListener('click', whereAmI);
els.frameSelect.addEventListener('change', () => {
  location.href = 'player.html?frame=' + encodeURIComponent(els.frameSelect.value);
});

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------

async function init() {
  buildRowOptions();
  if (!speechSupported()) {
    // No built-in voice in this browser: offer only the other two modes.
    const r = els.voiceRadios.find((x) => x.value === 'voice');
    r.disabled = true;
    r.closest('label').append(' (not available in this browser)');
    els.rateRow.hidden = true;
    if (prefs.voiceMode === 'voice') prefs.voiceMode = 'screenreader';
  }
  applyPrefs();
  if ('vibrate' in navigator) els.vibrateLabel.hidden = false;
  if (!audioSupported()) {
    els.startBtn.hidden = true;
    els.audioMsg.textContent = 'Sound is not available in this browser. The readout and narration still work.';
  }

  let frames;
  try {
    frames = await loadFrameList();
  } catch (err) {
    showError('The frame list could not be loaded. ' + err.message + '. If you opened this file directly, run a local server (see README).');
    return;
  }
  const id = new URLSearchParams(location.search).get('frame') || frames[0].id;
  const meta = frames.find((f) => f.id === id);
  if (!meta) {
    showError(`There is no frame called "${id}". Choose one from the gallery.`);
    els.intro.textContent = 'No frame is open.';
    return;
  }

  els.frameSelect.replaceChildren(...frames.map((f) => {
    const o = el('option', f.title); o.value = f.id; o.selected = f.id === meta.id; return o;
  }));
  const layout = describeLayout(meta);
  els.layoutText.textContent = layout;
  els.intro.textContent = `${meta.title}, ${meta.date}. ${meta.listenFor} ` +
    'Press T for a short guided tour, or go to the map and use the arrow keys. Question mark lists every key.';

  els.title.textContent = meta.title;
  els.date.textContent = meta.date;
  document.title = meta.title + ' – Jukebox Player';
  els.wrap.setAttribute('aria-label', `Map: ${meta.title}, ${meta.date}. Arrow keys explore.`);
  els.infoVariable.textContent = `${meta.variable} (${meta.units})`;
  els.infoDate.textContent = meta.date;
  buildLegendText(meta);
  buildReferenceButtons(meta);
  // Button labels use the frame's own words (warmest / greenest / heaviest...).
  els.highBtn.textContent = `Go to ${meta.terms.high}`;
  els.nextHighBtn.textContent = `Next ${meta.terms.high}`;
  els.lowBtn.textContent = `Go to ${meta.terms.low}`;

  els.status.textContent = 'Loading the frame…';
  try {
    frame = await loadFrame(meta);
  } catch (err) {
    showError('This frame could not be loaded. ' + err.message);
    return;
  }
  els.status.textContent = '';
  // Opening message, once the page has settled (a screen reader reads the
  // page title first; this polite message follows it).
  setTimeout(() => saidSomething || say(`Player ready: ${meta.title}. Press T for a tour, or Tab to the map and use the arrow keys.`), 1000);

  els.canvas.width = frame.width;
  els.canvas.height = frame.height;
  els.canvas.getContext('2d').drawImage(frame.bitmap, 0, 0);
  const a = meta.mapArea;
  point = { x: Math.round(a.x + a.width / 2), y: Math.round(a.y + a.height / 2) };
  drawLegend(els.legendCanvas, meta, null);

  // Read-only hooks for the automated tests in tests/player-test.html.
  window.__jukebox = {
    ready: true,
    size: () => [frame.width, frame.height],
    moveTo(x, y) { point = { x, y }; showPoint({ announce: 'now' }); },
    getState: () => ({
      point: { ...point },
      result: last && {
        status: last.status, t: last.t ?? null, text: last.text, reason: last.reason ?? null,
        x: last.x, y: last.y, lat: last.lat, lon: last.lon, value: last.entry ? last.entry.value : null,
      },
      summaryText: els.summaryBox.hidden ? null : els.summaryText.textContent,
      compareText: els.compareResult.textContent,
      areas: analysis && {
        points: analysis.points,
        high: analysis.high.map((c) => ({ x: c.rep.x, y: c.rep.y, t: c.rep.t, latC: c.latC, lonC: c.lonC, meanT: c.meanT })),
        low: analysis.low.map((c) => ({ x: c.rep.x, y: c.rep.y, t: c.rep.t, latC: c.latC, lonC: c.lonC, meanT: c.meanT })),
      },
      narrationLine: els.narration.textContent,
      infoValue: els.infoValue.textContent,
      infoPlace: els.infoPlace.textContent,
      live: els.live.textContent,
      scanning: Boolean(scan),
      prefs: { ...prefs },
      tourStep: tour ? tour.i : null,
      alert: els.alert.textContent,
      audio: audioState(),
    }),
  };
}

init();

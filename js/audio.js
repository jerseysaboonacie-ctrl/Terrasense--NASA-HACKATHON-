// audio.js: the Web Audio engine.
//
// One voice only: an oscillator -> its own gain -> a stereo panner -> the
// master gain -> a compressor -> the speakers. Because there is one voice,
// two tones can never overlap. Every change uses a short ramp
// (setTargetAtTime) so there are no clicks while dragging.
//
// Browsers block sound until the user clicks, taps or presses a key, so
// startAudio() must be called from one of those events.

import { SETTINGS as S } from './settings.js';

let ctx = null;
let master, compressor, osc, voiceGain, panner;
let muted = false;
let volume = S.startVolume;
let toneOn = false;
let stopTimer = null;

// Last values we asked for, kept for the Explain panel and the tests.
const state = { frequency: null, pan: 0, waveform: S.waveforms.default, clicks: 0, cues: {} };

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const timeConstant = () => S.rampSeconds / 3; // reaches ~95% of the target in rampSeconds

/** Legend position t (0..1) -> frequency in Hz, on one exponential scale. */
export function frequencyFor(t) {
  return S.minFrequency * Math.pow(S.maxFrequency / S.minFrequency, clamp01(t));
}

/** Horizontal position (0 = left edge, 1 = right edge) -> stereo pan. */
export function panFor(xFraction) {
  return (clamp01(xFraction) * 2 - 1) * S.panRange;
}

export function waveformFor(family) {
  return S.waveforms[family] || S.waveforms.default;
}

/** Is Web Audio available at all in this browser? */
export function audioSupported() {
  return Boolean(window.AudioContext || window.webkitAudioContext);
}

/**
 * Create (first time) and resume the audio engine. Call from a click, tap or
 * key press. Returns true if sound is running.
 */
export async function startAudio() {
  if (!audioSupported()) return false;
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = S.compressor.threshold;
    compressor.knee.value = S.compressor.knee;
    compressor.ratio.value = S.compressor.ratio;
    compressor.attack.value = S.compressor.attack;
    compressor.release.value = S.compressor.release;

    master = ctx.createGain();
    master.gain.value = 0; // start silent, then ramp up to the chosen volume
    master.connect(compressor).connect(ctx.destination);

    voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    // Very old Safari has no StereoPannerNode; then we simply skip panning.
    panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) voiceGain.connect(panner).connect(master);
    else voiceGain.connect(master);

    osc = ctx.createOscillator();
    osc.type = S.waveforms.default;
    osc.frequency.value = S.minFrequency;
    osc.connect(voiceGain);
    osc.start();

    // If the browser suspends audio (e.g. tab in the background), resume on return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && ctx.state === 'suspended') ctx.resume();
    });
  }
  if (ctx.state === 'suspended') {
    // Without a click or key press first, the browser keeps it suspended (and resume() may never settle).
    try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))]); } catch (e) { /* stays suspended */ }
  }
  applyMasterGain();
  return ctx.state === 'running';
}

export function isStarted() {
  return Boolean(ctx) && ctx.state === 'running';
}

function applyMasterGain() {
  if (!ctx) return;
  const target = muted ? 0 : clamp01(volume) * S.maxGain;
  master.gain.setTargetAtTime(target, ctx.currentTime, timeConstant());
  state.masterTarget = target;
}

/** Volume from 0 to 1 (the slider). Never above S.maxGain at the output. */
export function setVolume(v) {
  volume = clamp01(v);
  applyMasterGain();
}

export function setMuted(m) {
  muted = Boolean(m);
  if (muted) stopTone();
  applyMasterGain();
}

export function isMuted() {
  return muted;
}

/**
 * Play (or move) the single tone.
 *   t          legend position 0..1 -> pitch
 *   xFraction  horizontal position 0..1 -> stereo pan
 *   family     'rain' / 'frozen' / undefined -> waveform
 *   holdSeconds  stop by itself after this long (keyboard, reference tones)
 */
export function playTone({ t, xFraction = 0.5, family, holdSeconds }) {
  if (!isStarted()) return false;
  const now = ctx.currentTime;
  const tc = timeConstant();
  const freq = frequencyFor(t);
  const pan = panFor(xFraction);
  const wave = waveformFor(family);

  if (osc.type !== wave) osc.type = wave;
  if (!toneOn) {
    // Coming from silence: jump straight to the new pitch (the volume ramp
    // hides the change) instead of sliding from the last point.
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setValueAtTime(freq, now);
  } else {
    osc.frequency.setTargetAtTime(freq, now, tc);
  }
  if (panner) panner.pan.setTargetAtTime(pan, now, tc);
  voiceGain.gain.setTargetAtTime(S.toneLevel, now, tc);
  toneOn = true;
  Object.assign(state, { frequency: freq, pan, waveform: wave });

  clearTimeout(stopTimer);
  if (holdSeconds) stopTimer = setTimeout(stopTone, holdSeconds * 1000);
  return true;
}

/** Fade the tone out (about 30 ms). */
export function stopTone() {
  clearTimeout(stopTimer);
  if (!ctx) return;
  voiceGain.gain.setTargetAtTime(0, ctx.currentTime, timeConstant());
  toneOn = false;
}

/**
 * One short blip through the master gain and compressor (so it obeys the
 * volume cap and mute). Used for the no-data click and the sound cues.
 */
function blip({ frequency, seconds, level, type = 'triangle' }, xFraction = 0.5, delay = 0) {
  const now = ctx.currentTime + delay;
  const c = ctx.createOscillator();
  const g = ctx.createGain();
  c.type = type;
  c.frequency.value = frequency;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(level, now + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  let out = g;
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = panFor(xFraction);
    g.connect(p);
    out = p;
  }
  c.connect(g);
  out.connect(master);
  c.start(now);
  c.stop(now + seconds + 0.02);
}

/** One short, soft click: the "no data" sound. */
export function playClick(xFraction = 0.5) {
  if (!isStarted() || muted) return;
  blip(S.click, xFraction);
  state.clicks++;
}

/**
 * A short sound cue (see S.cues): 'edge' when the pointer hits the edge of
 * the map, 'error' when something fails. Each cue is a list of notes.
 */
export function playCue(kind, xFraction = 0.5) {
  const cue = S.cues[kind];
  if (!cue || !isStarted() || muted) return;
  cue.notes.forEach((n) => blip(n, xFraction, n.delay || 0));
  state.cues[kind] = (state.cues[kind] || 0) + 1;
}

/** Snapshot for the Explain panel and automated tests. */
export function audioState() {
  return {
    started: isStarted(),
    muted,
    volume,
    toneOn,
    masterTarget: state.masterTarget ?? 0,
    maxGain: S.maxGain,
    frequency: state.frequency,
    pan: state.pan,
    waveform: state.waveform,
    clicks: state.clicks,
    cues: { ...state.cues },
    hasCompressor: Boolean(compressor),
  };
}

// settings.js: every sound setting in one place.
// These are the starting values from the website plan. Tune them by ear and
// with testers, and note any change (and why) in the README.

export const SETTINGS = {
  // Pitch: lowest legend value -> minFrequency, highest -> maxFrequency.
  // Exponential, so equal steps in value sound like equal steps in pitch.
  // Same range for every frame, so frames stay comparable.
  minFrequency: 220,        // Hz (A3)
  maxFrequency: 880,        // Hz (A5), two octaves up

  // Waveform per variable family. 'frozen' is snow on the precipitation frame.
  waveforms: { default: 'sine', frozen: 'triangle' },

  // Stereo: left edge of the map -> -panRange, right edge -> +panRange.
  panRange: 0.8,

  // Volume. The slider goes 0..1; at 1 the master gain is maxGain.
  // A compressor on the master output catches anything sudden.
  startVolume: 0.3,
  maxGain: 0.35,
  toneLevel: 0.8,           // level of the exploring tone before the master gain
  compressor: { threshold: -24, knee: 12, ratio: 8, attack: 0.003, release: 0.25 },

  // Smoothing: about 30 ms ramps on every change, so dragging never clicks.
  rampSeconds: 0.03,

  // No data: silence plus one short, soft click.
  click: { frequency: 1400, seconds: 0.015, level: 0.25 },

  // Sound cues (short, soft, below the tone level; they obey mute and the cap).
  // Each is a list of notes; `delay` is seconds after the first note.
  //   edge:      a low bump when the arrow keys reach the edge of the map
  //   error:     two falling notes when something fails
  //   scanStart: two rising notes;  scanEnd: the same two, falling
  //   jump:      one short high note when Go to moves the pointer
  //   markA:     one tick;  markB: two ticks (so A and B sound different)
  cues: {
    edge: { notes: [{ frequency: 140, seconds: 0.09, level: 0.5, type: 'triangle' }] },
    error: { notes: [
      { frequency: 330, seconds: 0.12, level: 0.3, type: 'triangle' },
      { frequency: 247, seconds: 0.16, level: 0.3, type: 'triangle', delay: 0.15 },
    ] },
    scanStart: { notes: [
      { frequency: 523, seconds: 0.08, level: 0.25, type: 'sine' },
      { frequency: 784, seconds: 0.1, level: 0.25, type: 'sine', delay: 0.1 },
    ] },
    scanEnd: { notes: [
      { frequency: 784, seconds: 0.08, level: 0.25, type: 'sine' },
      { frequency: 523, seconds: 0.12, level: 0.25, type: 'sine', delay: 0.1 },
    ] },
    jump: { notes: [{ frequency: 1046, seconds: 0.06, level: 0.2, type: 'sine' }] },
    markA: { notes: [{ frequency: 1800, seconds: 0.03, level: 0.25, type: 'triangle' }] },
    markB: { notes: [
      { frequency: 1800, seconds: 0.03, level: 0.25, type: 'triangle' },
      { frequency: 1800, seconds: 0.03, level: 0.25, type: 'triangle', delay: 0.09 },
    ] },
  },

  // A tone played by hovering or touching fades out after the pointer has
  // been still this long, so a resting hand does not leave a tone droning.
  stillFadeSeconds: 1,

  // Timing.
  scanSeconds: 8,           // one sweep across the frame
  demoSeconds: 60,          // length of the Demo
  referenceSeconds: 1,      // low / middle / high reference tones
  keyToneSeconds: 0.6,      // how long a tone plays after a key press
  narrationDelayMs: 600,    // wait this long after the pointer stops before announcing

  // Optional vibration (Android browsers; not iPhone).
  vibration: { threshold: 0.9, pulseMs: 40 },
};

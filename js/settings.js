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

  // Timing.
  scanSeconds: 8,           // one sweep across the frame
  referenceSeconds: 1,      // low / middle / high reference tones
  keyToneSeconds: 0.6,      // how long a tone plays after a key press
  narrationDelayMs: 600,    // wait this long after the pointer stops before announcing

  // Optional vibration (Android browsers; not iPhone).
  vibration: { threshold: 0.9, pulseMs: 40 },
};

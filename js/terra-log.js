// terra-log.js: Terra's microphone log, for finding out why Terra does not hear someone.
//
// Only when the site runs on this computer (localhost) and tools/serve.py is the server: each
// event (switched on, sound, speech, number of words, errors, what Terra did) is sent to
// /__terra-log, which saves it in .terra-log.jsonl. Never the words themselves, so nothing said
// in the room is stored. On any other address (for example a public website) nothing is sent.

export const TERRA_VERSION = '2026-11-15d';

const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
let off = !LOCAL;
const t0 = Date.now();

export function terraLog(event, data = {}) {
  if (off) return;
  try {
    const body = JSON.stringify({ event, data, page: location.pathname + location.search, t: ((Date.now() - t0) / 1000).toFixed(1), v: TERRA_VERSION });
    fetch('/__terra-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
      .then((r) => { if (r.status === 501 || r.status === 404) off = true; }) // a plain server without the log: stop trying
      .catch(() => { off = true; });
  } catch (e) { off = true; }
}

/** Facts about this browser that decide whether speech recognition can work. */
export function browserFacts() {
  const ua = navigator.userAgent;
  return {
    ua: ua.slice(0, 160),
    secure: window.isSecureContext,
    recognition: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    synthesis: 'speechSynthesis' in window,
    mediaDevices: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    lang: navigator.language,
    brave: Boolean(navigator.brave),
    editorPreview: /Electron|\bCode\//.test(ua),
  };
}

/**
 * Why speech recognition cannot work here, in plain words, or '' if it should.
 * (Each of these looks like "Terra does not hear anything".)
 */
export function recognitionBlocker() {
  const f = browserFacts();
  if (location.protocol === 'file:') return 'This page was opened as a file. Terra can only hear you when the site is served, for example at http://localhost:8931 (run python3 tools/serve.py).';
  if (f.editorPreview) return 'This looks like a preview window inside a code editor, which cannot use the microphone for speech. Open http://localhost:8931 in Google Chrome.';
  if (!f.recognition) return 'This browser has no speech recognition (Firefox, for example). Open the site in Google Chrome, Edge or Safari to talk to Terra, or type your request.';
  if (f.brave) return 'Brave turns off the speech recognition service, so Terra cannot hear you here. Open the site in Google Chrome, or type your request.';
  if (!f.secure) return 'The microphone only works on a secure page: open the site at http://localhost:8931 or an https address.';
  return '';
}

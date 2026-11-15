// welcome.js: the first visit, on any page. Terra introduces itself and the site, says how to
// tell it what to do, then asks: "How would you like to hear this site?" Built-in voice, screen
// reader, or text only.
//
// The dialog is a native modal <dialog>, so a screen reader reads its title and introduction,
// and focus starts on the first choice. Keys 1, 2 and 3 choose. Browsers only allow a page to
// speak after a key press or tap, so Terra's voice starts on the first key press or tap: any key
// other than 1, 2, 3 (and the keys that move between the buttons) reads the introduction aloud.
// The answer is saved with the other settings (prefs.js); it is asked once per browser.
// Open it again with ?welcome in the address, or by asking Terra "introduce yourself".

import { loadPrefs, savePrefs } from './prefs.js';
import { speak, speechSupported, stopSpeaking } from './narrator.js';

const ASKED_KEY = 'terrasense-jukebox-welcomed-v1';

export function alreadyAsked() {
  try { return localStorage.getItem(ASKED_KEY) === '1'; } catch (e) { return true; } // no storage: don't nag
}

function markAsked() {
  try { localStorage.setItem(ASKED_KEY, '1'); } catch (e) { /* fine */ }
}

/** Tell the page (e.g. the Player) that saved settings changed. */
export function announcePrefsChanged() {
  window.dispatchEvent(new CustomEvent('terrasense-prefs-changed'));
}

/** Terra's introduction: what the site is and how to tell Terra what to do (also used by "introduce yourself"). */
export const TERRA_INTRO =
  'Hi, I am Terra, the voice assistant for TerraSense Jukebox. This site turns NASA maps of the Earth into sound: ' +
  'sea temperature, air temperature, vegetation, and rain and snow. Higher pitch means a higher value. ' +
  'You can tell me what to do. Press V to switch me on, then just talk, for example: ' +
  '"take me to Japan", "open the vegetation map", "where is the warmest place", "where am I", ' +
  '"what is today\'s date", or "help". You can also type your request. ' +
  'To explore a map yourself, use the arrow keys, or drag a finger across it.';

const QUESTION = 'First, how would you like to hear this site? ' +
  'Press 1 for my built-in voice: I read the site aloud to you. ' +
  'Press 2 if you already use a screen reader. ' +
  'Press 3 for no voice, text only.';

let open = null; // the dialog while it is shown
let introHeard = false; // Terra read the introduction aloud in the dialog

/**
 * Show Terra's introduction and the question if it has not been asked in this browser
 * (or always, with force: true, or when the address contains ?welcome).
 * onChosen(mode) runs after a choice ('voice' | 'screenreader' | 'off').
 * Returns true if the dialog was shown.
 */
export function askVoiceModeIfNeeded(onChosen = () => {}, { force = false } = {}) {
  const asked = /[?&]welcome\b/.test(location.search) ? false : alreadyAsked();
  if ((asked && !force) || !window.HTMLDialogElement || open) return false;

  const dlg = document.createElement('dialog');
  dlg.className = 'welcome-dialog';
  dlg.setAttribute('aria-labelledby', 'welcome-title');
  dlg.setAttribute('aria-describedby', 'welcome-desc welcome-question');
  const voiceOk = speechSupported();
  dlg.innerHTML = `
    <h2 id="welcome-title">Hi, I'm Terra</h2>
    <div id="welcome-desc">
      <p>I'm the voice assistant for TerraSense Jukebox. This site turns NASA maps of the Earth into sound: sea temperature, air temperature, vegetation, and rain and snow. Higher pitch means a higher value.</p>
      <p><strong>You can tell me what to do.</strong> Press <kbd>V</kbd> to switch me on, then just talk, for example:</p>
      <ul class="welcome-examples">
        <li>"Take me to Japan"</li>
        <li>"Open the vegetation map"</li>
        <li>"Where is the warmest place?"</li>
        <li>"Where am I?"</li>
        <li>"What is today's date?"</li>
        <li>"Help"</li>
      </ul>
      <p>You can also type to me. To explore a map yourself, use the arrow keys, or drag a finger across it.</p>
    </div>
    <p id="welcome-question" class="welcome-question"><strong>First, how would you like to hear this site?</strong></p>
    <div class="welcome-choices">
      <button type="button" data-mode="voice" class="big-button"${voiceOk ? '' : ' disabled'}>1. Read it aloud to me (Terra's built-in voice)${voiceOk ? '' : ' – not available in this browser'}</button>
      <button type="button" data-mode="screenreader" class="big-button">2. I already use a screen reader</button>
      <button type="button" data-mode="off" class="big-button">3. No voice, text only</button>
    </div>
    <p class="muted small">Keys: 1, 2 or 3. ${voiceOk ? 'Press any other key, or tap outside the buttons, to hear me read this aloud (browsers only let a page speak after a key press or tap). ' : ''}You can change this later under Voice in the Player, or by asking me.</p>`;
  document.body.append(dlg);
  open = dlg;
  window.__welcomeOpen = true;

  const choose = (mode) => {
    if (mode === 'voice' && !voiceOk) return;
    const prefs = loadPrefs();
    prefs.voiceMode = mode;
    savePrefs(prefs);
    markAsked();
    window.__welcomeOpen = false;
    open = null;
    dlg.close();
    dlg.remove();
    stopSpeaking();
    announcePrefsChanged();
    // Put focus somewhere useful: the page's main heading, so reading continues from the content.
    const h1 = document.querySelector('main h1');
    if (h1) { h1.tabIndex = -1; h1.focus(); }
    onChosen(mode);
  };

  const readAloud = () => { if (voiceOk) { introHeard = true; speak(`${TERRA_INTRO} ${QUESTION}`, loadPrefs().speechRate || 1); } };
  dlg.querySelectorAll('button[data-mode]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.mode)));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === '1') { e.preventDefault(); choose('voice'); }
    else if (e.key === '2') { e.preventDefault(); choose('screenreader'); }
    else if (e.key === '3') { e.preventDefault(); choose('off'); }
    else if (!['Tab', 'Shift', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) readAloud();
  });
  dlg.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('button')) readAloud();
  });
  // Escape: keep the default (screen reader) and do not ask again.
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); choose('screenreader'); });

  dlg.showModal();
  return true;
}

/** What Terra says right after a choice, so the person knows it worked and what to do next. */
export function afterChoice(mode, where) {
  // Chose the built-in voice without hearing the introduction (e.g. pressed Enter at once): say it now.
  if (mode === 'voice') return `${introHeard ? '' : TERRA_INTRO + ' '}Built-in voice is on: I will read the site aloud. ${where} Press V any time to talk to me, or say help.`;
  if (mode === 'screenreader') return `Screen reader mode: your screen reader reads the site, and my answers. ${where} Press V any time to talk to me.`;
  return '';
}

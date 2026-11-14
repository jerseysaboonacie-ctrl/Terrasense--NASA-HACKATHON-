// welcome.js: the first question on a first visit, on any page:
// "How would you like to hear this site?" Built-in voice, screen reader, or off.
//
// The dialog is a native modal <dialog>, so a screen reader reads its title and
// question, and focus starts on the first choice. Keys 1, 2 and 3 choose.
// Someone with no screen reader cannot read it, and browsers only allow speech
// after a key press or tap, so any other key or tap reads the question aloud.
// The answer is saved with the other settings (prefs.js); it is asked once.

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

const QUESTION = 'Welcome to TerraSense Jukebox. How would you like to hear this site? ' +
  'Press 1, or the top button, for the built-in voice: the page reads itself aloud. ' +
  'Press 2, or the middle button, if you already use a screen reader. ' +
  'Press 3, or the bottom button, for no voice, text only.';

/**
 * Show the question if it has not been asked in this browser.
 * onChosen(mode) runs after a choice ('voice' | 'screenreader' | 'off').
 * Returns true if the dialog was shown.
 */
export function askVoiceModeIfNeeded(onChosen = () => {}) {
  if (alreadyAsked() || !window.HTMLDialogElement) return false;

  const dlg = document.createElement('dialog');
  dlg.className = 'welcome-dialog';
  dlg.setAttribute('aria-labelledby', 'welcome-title');
  dlg.setAttribute('aria-describedby', 'welcome-desc');
  const voiceOk = speechSupported();
  dlg.innerHTML = `
    <h2 id="welcome-title">Welcome. How would you like to hear this site?</h2>
    <p id="welcome-desc">Choose one. You can change it later under Voice in the Player, or by asking the assistant.</p>
    <div class="welcome-choices">
      <button type="button" data-mode="voice" class="big-button"${voiceOk ? '' : ' disabled'}>1. Read it aloud to me (built-in voice)${voiceOk ? '' : ' – not available in this browser'}</button>
      <button type="button" data-mode="screenreader" class="big-button">2. I already use a screen reader</button>
      <button type="button" data-mode="off" class="big-button">3. No voice, text only</button>
    </div>
    <p class="muted small">Keys: 1, 2 or 3. Press any other key, or tap outside the buttons, to hear this question read aloud.</p>`;
  document.body.append(dlg);
  window.__welcomeOpen = true;

  const choose = (mode) => {
    if (mode === 'voice' && !voiceOk) return;
    const prefs = loadPrefs();
    prefs.voiceMode = mode;
    savePrefs(prefs);
    markAsked();
    window.__welcomeOpen = false;
    dlg.close();
    dlg.remove();
    stopSpeaking();
    announcePrefsChanged();
    // Put focus somewhere useful: the page's main heading, so reading continues from the content.
    const h1 = document.querySelector('main h1');
    if (h1) { h1.tabIndex = -1; h1.focus(); }
    onChosen(mode);
  };

  dlg.querySelectorAll('button[data-mode]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.mode)));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === '1') { e.preventDefault(); choose('voice'); }
    else if (e.key === '2') { e.preventDefault(); choose('screenreader'); }
    else if (e.key === '3') { e.preventDefault(); choose('off'); }
    else if (!['Tab', 'Shift', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key) && voiceOk) speak(QUESTION, 1);
  });
  dlg.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('button') && voiceOk) speak(QUESTION, 1);
  });
  // Escape: keep the default (screen reader) and do not ask again.
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); choose('screenreader'); });

  dlg.showModal();
  return true;
}

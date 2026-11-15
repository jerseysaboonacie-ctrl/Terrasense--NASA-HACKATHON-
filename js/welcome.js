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
export function afterChoice(mode, where, listening = false) {
  const talk = listening ? 'I am listening now: just talk to me. Press V to switch me off.' : 'Press V any time to talk to me, or say help.';
  // Chose the built-in voice without hearing the introduction (e.g. pressed Enter at once): say it now.
  if (mode === 'voice') return `${introHeard ? '' : TERRA_INTRO + ' '}Built-in voice is on: I will read the site aloud. ${where} ${talk}`;
  if (mode === 'screenreader') return `Screen reader mode: your screen reader reads the site, and my answers. ${where} ${talk}`;
  return '';
}

// ---------------------------------------------------------------------------
// The greeting on the Gallery: where the site starts when opened from a link
// ---------------------------------------------------------------------------

const GREETED_KEY = 'terrasense-greeted-v1'; // sessionStorage: greeted in this tab already
let greetingPick = () => false;
let greetingAsking = () => false;
/** True while Terra's "which map?" question is open. */
export function greetingOpen() { return greetingAsking(); }
/** A number said while the map question is open: open that map (true), or false if no question is open. */
export function pickFromGreeting(n) { return greetingPick(n); }

const MAP_CHOICES = [
  { id: 'sst', label: 'Sea surface temperature', what: 'how warm the ocean is' },
  { id: 't2m', label: 'Air temperature', what: 'how warm the air is' },
  { id: 'ndvi', label: 'Vegetation', what: 'how green the land is' },
  { id: 'precip', label: 'Precipitation', what: 'where rain and snow are falling' },
];

/**
 * Terra's greeting on the Gallery, once per visit (tab), or with ?welcome:
 *   1. Terra introduces itself and how to tell it what to do, then asks how to hear the site
 *      (the earlier answer is marked).
 *   2. "What would you like to explore?" Sea surface temperature, air temperature, vegetation or
 *      precipitation (keys 1 to 4, the buttons, or by voice: Terra switches the microphone on
 *      here, so saying "vegetation" opens it), or 5 / Escape to look around the Gallery first.
 *   listen()       switch Terra on quietly; resolves true if it is listening
 *   say(text)      speak or announce in the chosen voice mode
 *   frames         the frame list (to check the four maps exist)
 * Returns true if the greeting was shown.
 */
export function greetOnGallery({ listen, say, frames = [] }) {
  let greeted = false;
  try { greeted = sessionStorage.getItem(GREETED_KEY) === '1'; } catch (e) { /* fine */ }
  if ((greeted && !/[?&]welcome\b/.test(location.search)) || !window.HTMLDialogElement || open) return false;
  try { sessionStorage.setItem(GREETED_KEY, '1'); } catch (e) { /* fine */ }

  const voiceOk = speechSupported();
  const before = alreadyAsked() ? loadPrefs().voiceMode : null;
  const choices = MAP_CHOICES.filter((c) => !frames.length || frames.some((f) => f.id === c.id));
  const dlg = document.createElement('dialog');
  dlg.className = 'welcome-dialog';
  dlg.setAttribute('aria-labelledby', 'welcome-title');
  document.body.append(dlg);
  open = dlg;
  window.__welcomeOpen = true;
  let step = 1, mode = before || 'screenreader', listening = false;
  const mark = (m) => (before === m ? ' (your choice last time)' : '');

  const finish = () => {
    window.__welcomeOpen = false;
    open = null;
    dlg.close();
    dlg.remove();
  };

  // Step 1: the introduction and the voice question
  dlg.setAttribute('aria-describedby', 'welcome-desc welcome-question');
  dlg.innerHTML = `
    <h2 id="welcome-title">Hi, I'm Terra</h2>
    <div id="welcome-desc">
      <p>I'm the voice assistant for TerraSense Jukebox. This site turns NASA maps of the Earth into sound: sea temperature, air temperature, vegetation, and rain and snow. Higher pitch means a higher value.</p>
      <p><strong>You can tell me what to do.</strong> Just talk to me, for example:</p>
      <ul class="welcome-examples">
        <li>"Take me to Japan"</li>
        <li>"Open the vegetation map"</li>
        <li>"Where is the warmest place?"</li>
        <li>"What is today's date?"</li>
        <li>"Help"</li>
      </ul>
      <p>V switches my listening on and off. You can also type to me, or explore a map yourself with the arrow keys or a finger.</p>
    </div>
    <p id="welcome-question" class="welcome-question"><strong>First, how would you like to hear this site?</strong></p>
    <div class="welcome-choices">
      <button type="button" data-mode="voice" class="big-button"${voiceOk ? '' : ' disabled'}>1. Read it aloud to me (Terra's built-in voice)${voiceOk ? mark('voice') : ' – not available in this browser'}</button>
      <button type="button" data-mode="screenreader" class="big-button">2. I already use a screen reader${mark('screenreader')}</button>
      <button type="button" data-mode="off" class="big-button">3. No voice, text only${mark('off')}</button>
    </div>
    <p class="muted small">Keys: 1, 2 or 3. ${voiceOk ? 'Press any other key, or tap outside the buttons, to hear me read this aloud (browsers only let a page speak after a key press or tap).' : ''}</p>`;

  const mapQuestion = () =>
    `What would you like to explore? ${choices.map((c, i) => `${i + 1}: ${c.label}, ${c.what}.`).join(' ')} ` +
    `Or 5 to look around the gallery first.${listening ? ' You can also just say it, for example: vegetation.' : ''}`;

  const openMap = (id) => {
    finish();
    say(`Opening ${MAP_CHOICES.find((c) => c.id === id).label}.`);
    setTimeout(() => { location.href = 'player.html?frame=' + encodeURIComponent(id); }, 600);
  };

  const showMaps = async () => {
    step = 2;
    dlg.setAttribute('aria-describedby', 'welcome-maps-q');
    dlg.innerHTML = `
      <h2 id="welcome-title">What would you like to explore?</h2>
      <p id="welcome-maps-q">Choose a map. ${choices.length} NASA maps of the Earth, each turned into sound.</p>
      <div class="welcome-choices">
        ${choices.map((c, i) => `<button type="button" data-frame="${c.id}" class="big-button">${i + 1}. ${c.label} <span class="choice-what">– ${c.what}</span></button>`).join('')}
        <button type="button" data-frame="" class="big-button secondary">5. Show me the gallery first</button>
      </div>
      <p id="welcome-listen" class="mic-status small">${mode === 'off' ? 'Keys: 1 to 5.' : 'Switching on the microphone so you can just say it…'}</p>`;
    dlg.querySelectorAll('button[data-frame]').forEach((b) => b.addEventListener('click', () => (b.dataset.frame ? openMap(b.dataset.frame) : leave())));
    dlg.querySelector('button[data-frame]').focus();
    const status = dlg.querySelector('#welcome-listen');
    if (mode !== 'off') {
      listening = await listen();
      if (!dlg.isConnected) return;
      status.textContent = listening ? 'Terra is listening: say the name of a map, for example "vegetation", or press 1 to 5.'
        : 'Terra cannot hear you here (see the Microphone line on the page). Press 1 to 5.';
      status.dataset.kind = listening ? 'on' : 'warn';
    }
    if (mode === 'voice' && voiceOk) speak(mapQuestion(), loadPrefs().speechRate || 1);
    else if (mode === 'screenreader') say(mapQuestion());
  };

  const leave = () => {
    finish();
    const h1 = document.querySelector('main h1');
    if (h1) { h1.tabIndex = -1; h1.focus(); }
    say(`Here is the gallery: ${choices.length} maps.${listening ? ' Say the name of one to open it, or press Tab to go through them.' : ' Press Tab to go through them.'}`);
  };

  const chooseMode = (m) => {
    if (m === 'voice' && !voiceOk) return;
    const prefs = loadPrefs();
    prefs.voiceMode = m;
    savePrefs(prefs);
    markAsked();
    mode = m;
    stopSpeaking();
    announcePrefsChanged();
    showMaps();
  };

  const readAloud = () => {
    if (!voiceOk) return;
    introHeard = true;
    speak(step === 1 ? `${TERRA_INTRO} ${QUESTION}` : mapQuestion(), loadPrefs().speechRate || 1);
  };
  dlg.querySelectorAll('button[data-mode]').forEach((b) => b.addEventListener('click', () => chooseMode(b.dataset.mode)));
  dlg.addEventListener('keydown', (e) => {
    const n = Number(e.key);
    if (step === 1 && n >= 1 && n <= 3) { e.preventDefault(); chooseMode(['voice', 'screenreader', 'off'][n - 1]); }
    else if (step === 2 && n >= 1 && n <= choices.length) { e.preventDefault(); openMap(choices[n - 1].id); }
    else if (step === 2 && n === 5) { e.preventDefault(); leave(); }
    else if (!['Tab', 'Shift', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) readAloud();
  });
  dlg.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) readAloud(); });
  // Escape: keep the current voice mode (screen reader on a first visit), then the Gallery.
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (step === 1) chooseMode(mode); else leave(); });

  greetingAsking = () => step === 2 && dlg.isConnected;
  // Spoken "one", "number three", "five" while the map question is open (see site.js).
  greetingPick = (n) => {
    if (step !== 2 || !dlg.isConnected) return false;
    if (n >= 1 && n <= choices.length) { openMap(choices[n - 1].id); return true; }
    if (n === choices.length + 1) { leave(); return true; }
    return false;
  };

  dlg.showModal();
  const firstChoice = dlg.querySelector(`button[data-mode="${before || 'voice'}"]:not([disabled])`) || dlg.querySelector('button[data-mode]:not([disabled])');
  if (firstChoice) firstChoice.focus();
  return true;
}

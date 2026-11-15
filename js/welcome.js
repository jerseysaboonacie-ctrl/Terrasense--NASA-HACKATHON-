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
import { speak, speechSupported, stopSpeaking, canSpeakNow } from './narrator.js';

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
export const PITCH_GUIDE =
  'How to listen: every place on a map plays a note. The higher the note, the higher the value: on the temperature maps, ' +
  'a high note is warm and a low note is cold; on the rain map, a higher note is heavier rain; on the vegetation map, greener land. ' +
  'Silence with one soft click means no data. Left and right in your headphones are west and east. ' +
  'Each map starts by playing its low, middle and high notes with their values, so you can tell the values without the color key.';

export const TERRA_INTRO =
  'Hi, I am Terra, the voice assistant for TerraSense Jukebox. This site turns NASA maps of the Earth into sound: ' +
  'sea temperature, air temperature, vegetation, and rain and snow. ' + PITCH_GUIDE + ' ' +
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
      <p>I'm the voice assistant for TerraSense Jukebox. This site turns NASA maps of the Earth into sound: sea temperature, air temperature, vegetation, and rain and snow.</p>
      <p class="pitch-guide"><strong>How to listen:</strong> every place on a map plays a note. <strong>The higher the note, the higher the value</strong>: on the temperature maps a high note is warm and a low note is cold; on the rain map a higher note is heavier rain; on the vegetation map, greener land. Silence with one soft click means no data. Left and right in your headphones are west and east. Each map starts by playing its low, middle and high notes with their values, so you can tell the values without the color key.</p>
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
 * Terra's greeting on the Gallery, once per visit (tab), or with ?welcome. It asks straight away:
 * "Which map would you like to explore?" Sea surface temperature, air temperature, vegetation or
 * precipitation (keys 1 to 4, the buttons, or by voice: Terra switches the microphone on here), or 5 /
 * Escape to look around the Gallery first. How Terra talks (built-in voice, screen reader, text only) is
 * a smaller choice underneath, set to the built-in voice unless chosen before.
 * Browsers only allow speech after a key press or click, so Terra speaks the question on the first one
 * (a number key both answers and starts the sound).
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
  // Never asked before: the built-in voice (the page reads aloud); a screen reader user picks 2 below.
  let mode = alreadyAsked() ? loadPrefs().voiceMode : (voiceOk ? 'voice' : 'screenreader');
  const choices = MAP_CHOICES.filter((c) => !frames.length || frames.some((f) => f.id === c.id));
  const dlg = document.createElement('dialog');
  dlg.className = 'welcome-dialog';
  dlg.setAttribute('aria-labelledby', 'welcome-title');
  dlg.setAttribute('aria-describedby', 'welcome-desc');
  document.body.append(dlg);
  open = dlg;
  window.__welcomeOpen = true;
  let listening = false, spokeQuestion = false;
  const MODES = [['voice', "Terra's built-in voice"], ['screenreader', 'My screen reader'], ['off', 'Text only']];

  dlg.innerHTML = `
    <h2 id="welcome-title">Hi, I'm Terra. Which map would you like to explore?</h2>
    <p id="welcome-desc">Each one is a NASA map of the Earth turned into sound. Press 1 to 4, click one, or just say it, for example "vegetation".</p>
    <div class="welcome-choices">
      ${choices.map((c, i) => `<button type="button" data-frame="${c.id}" class="big-button">${i + 1}. ${c.label} <span class="choice-what">– ${c.what}</span></button>`).join('')}
      <button type="button" data-frame="" class="big-button secondary">5. Show me the gallery first</button>
    </div>
    <p id="welcome-listen" class="mic-status small">Switching on the microphone so you can just say it…</p>
    <p class="pitch-guide small"><strong>How to listen:</strong> every place on a map plays a note. <strong>The higher the note, the higher the value</strong>: on the temperature maps a high note is warm and a low note is cold. Each map starts by telling you where you are and playing its low, middle and high notes with their values.</p>
    <fieldset class="welcome-voice">
      <legend>How should I talk to you?</legend>
      ${MODES.map(([m, label]) => `<label class="check"><input type="radio" name="welcome-voice" value="${m}"${m === mode ? ' checked' : ''}${m === 'voice' && !voiceOk ? ' disabled' : ''}> ${label}</label>`).join('')}
    </fieldset>`;

  const mapQuestion = () => `Hi, I'm Terra. Which map would you like to explore? ${choices.map((c, i) => `${i + 1}: ${c.label}, ${c.what}.`).join(' ')} ` +
    `Or 5 to look around the gallery first. Press the number${listening ? ', or just say it, when I finish' : ''}.`;

  const finish = () => {
    window.__welcomeOpen = false;
    open = null;
    dlg.close();
    dlg.remove();
  };
  const saveMode = () => {
    const prefs = loadPrefs();
    prefs.voiceMode = mode;
    savePrefs(prefs);
    markAsked();
    announcePrefsChanged();
  };
  const openMap = (id) => {
    saveMode();
    finish();
    // No "Opening …" here: the map itself starts by saying what is open and where you are.
    location.href = 'player.html?frame=' + encodeURIComponent(id);
  };
  const leave = () => {
    saveMode();
    finish();
    const h1 = document.querySelector('main h1');
    if (h1) { h1.tabIndex = -1; h1.focus(); }
    say(`Here is the gallery: ${choices.length} maps.${listening ? ' Say the name of one to open it, or press Tab to go through them.' : ' Press Tab to go through them.'}`);
  };
  const askAloud = () => {
    if (spokeQuestion) return;
    spokeQuestion = true;
    if (mode === 'voice' && voiceOk) { introHeard = true; speak(mapQuestion(), loadPrefs().speechRate || 1); }
    else if (mode === 'screenreader') say(mapQuestion());
  };

  dlg.querySelectorAll('button[data-frame]').forEach((b) => b.addEventListener('click', () => (b.dataset.frame ? openMap(b.dataset.frame) : leave())));
  dlg.querySelectorAll('input[name="welcome-voice"]').forEach((r) => r.addEventListener('change', () => {
    mode = r.value; saveMode();
    if (mode === 'voice' && voiceOk) { stopSpeaking(); spokeQuestion = false; askAloud(); }
  }));
  dlg.addEventListener('keydown', (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= choices.length) { e.preventDefault(); openMap(choices[n - 1].id); }
    else if (n === choices.length + 1) { e.preventDefault(); leave(); }
    else if (!['Tab', 'Shift', 'Enter', ' ', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) askAloud();
  });
  // The first click anywhere (outside the map buttons) starts Terra's voice: she asks the question.
  dlg.addEventListener('pointerdown', (e) => { if (!e.target.closest('button[data-frame]')) askAloud(); });
  document.addEventListener('keydown', function first(e) { if (dlg.isConnected && !/^[1-5]$/.test(e.key)) askAloud(); document.removeEventListener('keydown', first, true); }, true);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); leave(); });

  greetingAsking = () => dlg.isConnected;
  // Spoken "one", "number three", "five" (see site.js).
  greetingPick = (n) => {
    if (!dlg.isConnected) return false;
    if (n >= 1 && n <= choices.length) { openMap(choices[n - 1].id); return true; }
    if (n === choices.length + 1) { leave(); return true; }
    return false;
  };

  dlg.showModal();
  dlg.querySelector('button[data-frame]').focus();
  // The page may already speak (arrived after a click on this site): ask at once.
  if (canSpeakNow()) askAloud();
  // Terra listens, so the answer can be spoken (her microphone pauses while she talks: no echo).
  listen().then((on) => {
    listening = on;
    if (!dlg.isConnected) return;
    const status = dlg.querySelector('#welcome-listen');
    status.textContent = on ? 'Terra is listening: say the name of a map when she finishes, or press 1 to 5.'
      : 'Terra cannot hear you here (see the Microphone line on the page). Press 1 to 5.';
    status.dataset.kind = on ? 'on' : 'warn';
  });
  return true;
}

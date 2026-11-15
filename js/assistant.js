// assistant.js: Terra, the voice assistant.
//
// Say (or type) what you want: "where am I", "take me to Japan", "compare
// here with the coolest", "open the precipitation map". Terra answers in the
// chosen voice (screen reader, built-in voice, or text) and can ask a follow-up
// question ("Would you like me to take you there?").
//
// Terra is switched on and off (V, or the "Terra listening" button). While it
// is on, it keeps listening and answers every request, until you switch it off
// or say "stop listening". It pauses while the built-in voice is talking and
// ignores what sounds like its own last answers, so it does not answer itself;
// an optional wake word ("Terra, ...") helps in noisy rooms or with a screen
// reader on speakers. It stays on when it opens another page of the site.
//
// Terra is not a general AI. It understands a fixed set of requests (see the
// commands below and in player-assistant.js), runs the same functions as the
// buttons, and so never says a value the Player would not say.
//
// Speech recognition uses the browser's Web Speech API. In Chrome and Edge it
// needs an internet connection; typing always works.

import { speak, stopSpeaking, speechSupported, isSpeaking, canSpeakNow } from './narrator.js';
import { loadPrefs, savePrefs } from './prefs.js';
import { startAudio, isStarted, playCue, stopTone } from './audio.js';
import { loadFrameList } from './decoder.js';
import { normalise } from './places.js';
import { announcePrefsChanged, askVoiceModeIfNeeded, afterChoice, TERRA_INTRO } from './welcome.js';
import { SETTINGS as S } from './settings.js';
import { terraLog, browserFacts, recognitionBlocker, TERRA_VERSION } from './terra-log.js';

/** The browser's speech recognition, looked up when needed (tests can supply one). */
const getRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition;

export function recognitionSupported() {
  return Boolean(getRecognition());
}

const ON_KEY = 'terrasense-terra-on'; // sessionStorage: Terra stays on across pages in this tab
// Terra's name, and how Chrome's recognizer often writes it. Measured by feeding recordings of
// "Terra, ..." in nine voices to Chrome's recognizer: its first guess was often "Tara", "Sarah" or "Terror".
const NAMES = ['terra', 'tera', 'tara', 'tarah', 'terah', 'tarra', 'tierra', 'tiara', 'thera', 'sarah', 'sara', 'terror', 'cara', 'kara', 'dara'];
const WAKE = new RegExp(`^ (?:hey |hi |ok |okay )?(?:${NAMES.join('|')})\\b,? ?(.*)$`);
const NAME_WORD = new RegExp(`^(?:${NAMES.join('|')})$`);
const plain = (w) => w.toLowerCase().replace(/[^a-z']/g, '');
const splitWords = (text) => text.trim().split(/\s+/).filter(Boolean);
/** Where Terra's name starts in a list of words (with a "hey" or "OK" before it), or -1. */
function nameIndex(words) {
  const i = words.findIndex((w) => NAME_WORD.test(plain(w)));
  if (i > 0 && /^(hey|hi|ok|okay)$/.test(plain(words[i - 1]))) return i - 1;
  return i;
}
/** Where someone starts talking to Terra: its name, or "are you (still) listening", "can you hear me", "are you there". */
const CHECKING = /^(are|can|do)$/;
function attentionIndex(words) {
  const n = nameIndex(words);
  if (n >= 0) return n;
  const p = words.map(plain);
  for (let i = 0; i < p.length - 2; i++) {
    if (!CHECKING.test(p[i]) || p[i + 1] !== 'you') continue;
    const next = p[i + 2] === 'still' ? p[i + 3] : p[i + 2];
    if (/^(listening|listen|there|hear|awake)$/.test(next || '')) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Speaking on pages without the Player (the Player passes its own say())
// ---------------------------------------------------------------------------

let pageLive = null;

/**
 * Say text in the saved voice mode: polite live region, built-in voice, or
 * nothing. With { aloud: true } (Terra answering out loud) the built-in voice
 * is used instead, and not the live region, so there is still only one voice.
 */
export function pageSay(text, { aloud = false } = {}) {
  const mode = aloud ? 'voice' : loadPrefs().voiceMode;
  if (mode === 'screenreader') {
    if (!pageLive) {
      pageLive = document.createElement('div');
      pageLive.className = 'sr-only';
      pageLive.setAttribute('aria-live', 'polite');
      pageLive.setAttribute('aria-atomic', 'true');
      document.body.append(pageLive);
    }
    pageLive.textContent = pageLive.textContent === text ? text + ' ' : text;
  } else if (mode === 'voice') {
    speak(text, loadPrefs().speechRate);
  }
}

/** Terra answers out loud (built-in voice) when you talk to it: the "Terra answers out loud" setting. */
export function terraAloudSetting() {
  return loadPrefs().terraAloud !== false && speechSupported();
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/** True if the normalised text contains any of the words or phrases. */
export function has(t, ...words) {
  return words.some((w) => t.includes(` ${w} `));
}

const YES = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please', 'go ahead', 'do it', 'alright', 'all right', 'of course'];
const NO = ['no', 'nope', 'not now', 'no thanks', 'no thank you', 'never mind', 'nevermind', 'dont'];

// ---------------------------------------------------------------------------
// The assistant
// ---------------------------------------------------------------------------

/**
 * Build Terra's panel inside `container` and wire it up.
 *   say          how to speak a reply (the Player's say(), or pageSay)
 *   commands     page-specific commands, tried before the common ones:
 *                [{ name, match(t, text, ctx) -> truthy, run(ctx, match) -> reply? }]
 *   help         one sentence of example requests for this page
 *   headingLevel 2 or 3
 *   sayCallsHeard true if say() reports back through heard() (the Player), so replies are logged once
 *   toggles      extra buttons that switch Terra on and off too (the Player's top bar)
 *   openFrame    the Player switches frame in the page instead of loading a new page
 *   currentFrame the Player: () => the open frame's meta (for "is already open" and today's date)
 */
export function createAssistant({ container, say, commands = [], help = '', headingLevel = 2, sayCallsHeard = false, toggles = [], openFrame = null, currentFrame = () => null }) {
  const h = `h${headingLevel}`;
  container.classList.add('assistant');
  container.setAttribute('aria-labelledby', 'assistant-heading');
  container.innerHTML = `
    <${h} id="assistant-heading">Ask Terra, the assistant</${h}>
    <p class="muted small" id="assistant-help">Switch Terra on (V) and just talk: it keeps listening and answers until you switch it off or say "stop listening". Or type. Say "help" for examples.</p>
    <div class="button-row">
      <button type="button" id="talk-btn" class="terra-toggle" aria-pressed="false" accesskey="v">Terra listening (V)<span class="terra-state" aria-hidden="true">Off</span></button>
    </div>
    <p id="mic-status" class="mic-status small">Microphone: off. Press V or the switch above so Terra can hear you.</p>
    <div class="control-row mic-row">
      <label for="mic-select">Microphone</label>
      <select id="mic-select"><option value="">Automatic (this computer's microphone)</option></select>
      <span class="mic-meter" aria-hidden="true"><span id="mic-live"></span></span>
    </div>
    <div class="control-row">
      <label for="narrator-select">Narrator</label>
      <select id="narrator-select">
        <option value="voice">Built-in voice: the page reads aloud</option>
        <option value="screenreader">My screen reader reads it (the page stays silent)</option>
        <option value="off">Text only</option>
      </select>
      <button type="button" id="voice-test-btn" class="secondary">Test the voice</button>
    </div>
    <p id="assistant-heard" class="muted small" aria-hidden="true"></p>
    <div class="button-row">
      <button type="button" id="mic-check-btn" class="secondary">Check the microphone</button>
      <meter id="mic-level" min="0" max="1" value="0" aria-hidden="true" hidden></meter>
    </div>
    <label class="check"><input type="checkbox" id="aloud-toggle"> Terra answers out loud (built-in voice) when I talk to it. Untick to hear Terra through your screen reader instead.</label>
    <label class="check"><input type="checkbox" id="wake-toggle"> Only answer when I start with "Terra" (for noisy rooms, or a screen reader on speakers)</label>
    <form id="ask-form" class="control-row">
      <label for="ask-input">Or type a request</label>
      <input id="ask-input" type="text" autocomplete="off" enterkeyhint="send">
      <button type="submit" class="secondary">Ask</button>
    </form>
    <p id="assistant-status" class="muted small" role="status"></p>
    <ol id="assistant-log" class="assistant-log" aria-label="Conversation with Terra"></ol>
    <p class="muted small terra-version">Terra version ${TERRA_VERSION}</p>`;

  const $ = (id) => container.querySelector('#' + id);
  const talkBtn = $('talk-btn'), form = $('ask-form'), input = $('ask-input'), wakeBox = $('wake-toggle');
  const aloudBox = $('aloud-toggle'), heardEl = $('assistant-heard'), micEl = $('mic-status');
  const micSelect = $('mic-select'), micLive = $('mic-live'), narratorSelect = $('narrator-select'), voiceTestBtn = $('voice-test-btn');
  /** The visible "Microphone: ..." line: where listening has got to, so a problem can be seen. */
  const micState = (text, kind = '') => { micEl.textContent = 'Microphone: ' + text; micEl.dataset.kind = kind; };
  const checkBtn = $('mic-check-btn'), levelEl = $('mic-level');
  const allToggles = [talkBtn, ...toggles];
  const statusEl = $('assistant-status'), logEl = $('assistant-log');

  const ctx = {
    say: (text) => reply(text),
    pending: null,          // { yes(), no(), question }
    last: '',               // Terra's last reply, for "repeat"
    more: [],               // the rest of a long text, for "continue"
    ask(question, yes, no) { this.pending = { question, yes, no }; return question; },
  };

  let listeningOn = false;  // Terra switched on: keep listening
  let rec = null;           // the running recognition session (restarted as needed)
  let retryAt = 0;          // do not restart before this time
  let wakeUntil = 0;        // after "Terra" alone: the next request needs no wake word until then
  const recent = [];        // Terra's recent words, to ignore them if the microphone hears them
  let requestSpoken = false; // the request being answered came from the microphone
  let skipRemember = false;  // reply() already decided whether to remember this text
  let forceUS = false;       // the browser's English variant was not supported: use en-US
  let errorsInARow = 0;      // unexplained recognition errors since the last result
  let acceptWhileTalking = () => false; // set by a page: short answers to a question Terra is still reading out
  let capturing = false;    // log what the page says while a request runs
  let captureTimer = 0;

  function log(who, text) {
    const li = document.createElement('li');
    li.className = who === 'You' ? 'you' : 'terra';
    const b = document.createElement('strong');
    b.textContent = who + ': ';
    li.append(b, text);
    logEl.append(li);
    while (logEl.children.length > 30) logEl.firstChild.remove();
  }

  /** Remember what Terra (or the page) said, so the microphone hearing it is ignored. */
  function remember(text, echo = true) {
    if (!echo) return;
    recent.push({ text: normalise(text), time: performance.now() });
    while (recent.length > 8) recent.shift();
  }

  /** Answer out loud now? Yes when you talk to Terra (or it is switched on) and the setting allows it. */
  function aloud() {
    return terraAloudSetting() && canSpeakNow() && (listeningOn || requestSpoken);
  }

  const SPEAK_HINT = 'Terra is listening, but this page may only speak after you press a key or tap it once. Do that, and Terra will answer out loud.';

  /**
   * Say a reply and log it (once). echo: false for replies that list example
   * requests (help). aloud: speak with the built-in voice (see aloud()).
   */
  function reply(text, { echo = true, aloud: out = aloud() } = {}) {
    if (!text) return;
    ctx.last = text;
    remember(text, echo);
    if (sayCallsHeard) {
      const was = capturing;
      capturing = true; skipRemember = true; // remembered above (or deliberately not)
      say(text, { aloud: out });
      capturing = was; skipRemember = false;
    }
    else { say(text, { aloud: out }); log('Terra', text); }
  }

  /** For the Player: should what it announces now be spoken out loud as Terra's answer? */
  function answersAloud() {
    return capturing && aloud();
  }

  /** The Player announced something; log it while a request runs. */
  function heard(text) {
    if (!skipRemember) remember(text);
    if (capturing) { log('Terra', text); ctx.last = text; }
  }

  // --- Common commands (every page) --------------------------------------

  const PAGES = [
    { words: ['home page', 'home', 'start page', 'main page'], href: 'index.html', name: 'the Home page' },
    { words: ['gallery', 'list of maps', 'all maps', 'all the maps'], href: 'gallery.html', name: 'the Gallery' },
    { words: ['player'], href: 'player.html', name: 'the Player' },
    { words: ['how it works'], href: 'how-it-works.html', name: 'How it works' },
    { words: ['accessibility page', 'accessibility'], href: 'accessibility.html', name: 'the Accessibility page' },
    { words: ['credits', 'credit page'], href: 'credits.html', name: 'the Credits page' },
  ];

  const go = (href) => setTimeout(() => { location.href = href; }, 900);

  const common = [
    { name: 'stop listening', match: (t) => has(t, 'goodbye', 'bye', 'stop listening', 'thats all', 'that is all', 'im done', 'i am done', 'go to sleep', 'turn off terra', 'terra off', 'switch off'),
      run: () => { setOn(false); return 'Okay, I stopped listening. Press V when you need me.'; } },
    { name: 'check the microphone', match: (t) => has(t, 'check the microphone', 'test the microphone', 'microphone check', 'mic check', 'check the mic', 'test the mic'),
      run: () => { setTimeout(checkMicrophone, 0); } },
    { name: 'start listening', match: (t) => has(t, 'start listening', 'listen to me', 'turn on terra', 'terra on', 'keep listening'),
      run: () => { startListening(); } },
    { name: 'stop talking', match: (t) => /^ (stop|cancel|quiet|be quiet|shush|shut up|silence|enough|pause)( please)? $/.test(t),
      run: () => { stopSpeaking(); stopTone(); return 'Okay.'; } },
    { name: 'repeat', match: (t) => has(t, 'repeat', 'say that again', 'say again', 'what did you say', 'pardon', 'come again', 'one more time'),
      run: () => ctx.last || 'I have not said anything yet.' },
    { name: 'continue', match: (t) => ctx.more.length && has(t, 'continue', 'more', 'keep going', 'go on', 'next part', 'read more'),
      run: () => readMore() },
    { name: 'greeting', match: (t) => /^ (hello|hi|hey|hiya|good (morning|afternoon|evening))( terra| there)? $/.test(t),
      run: () => 'Hello, I am Terra. What would you like to do? You can say help to hear what I can do.' },
    { name: 'thanks', match: (t) => has(t, 'thank you', 'thanks', 'cheers', 'great job', 'well done'),
      run: () => 'You are welcome.' },
    { name: 'who', match: (t) => has(t, 'who are you', 'what are you', 'your name', 'are you an ai', 'are you a robot'),
      run: () => 'I am Terra, the voice assistant for TerraSense Jukebox. I follow a set of spoken requests about this site and its maps. ' +
        'I am not a general AI: I only report what the map says, and values are approximate.' },
    { name: 'introduce', match: (t) => has(t, 'introduce yourself', 'introduction', 'tell me about yourself', 'what are your features', 'what features', 'how do i use you', 'how does this site work', 'how does this work'),
      run: () => ({ text: TERRA_INTRO, echo: false }) },
    { name: 'welcome again', match: (t) => has(t, 'welcome again', 'first question', 'start again', 'start over', 'ask me again', 'change how i hear', 'change the voice setting'),
      run: () => {
        const shown = askVoiceModeIfNeeded((mode) => { if (mode !== 'off') reply(afterChoice(mode, ''), { echo: false }); }, { force: true });
        return shown ? 'Here is my introduction and the first question again. Press 1, 2 or 3.' : 'It is already open.';
      } },
    { name: 'how are you', match: (t) => has(t, 'how are you', 'how are you doing', 'hows it going', 'how is it going', 'are you ok', 'are you okay'),
      run: () => 'I am doing well, thank you. What would you like to explore?' },
    { name: 'what is a map', match: (t) => has(t, 'what is', 'what does', 'whats', 'what are', 'tell me about', 'explain', 'meaning of', 'mean') && frameList.find((f) => (f.keywords || []).some((w) => has(t, normalise(w).trim()))),
      run: (c, f) => `${f.about || f.title + '.'} This site's ${f.title} map: ${f.date}, from ${f.dataset}. Values are approximate, read from the map's colors.` },
    { name: 'data source', match: (t) => has(t, 'where does the data come from', 'where is the data from', 'data source', 'source of the data', 'who made the map', 'is this nasa', 'is this from nasa', 'what is nasa', 'who is nasa'),
      run: () => {
        const cur = currentFrame();
        return 'The maps are images from NASA\'s Scientific Visualization Studio, downloaded and served by this site. NASA is the United States space agency. ' +
          (cur ? `This map: ${cur.dataset}. ` : '') + 'TerraSense Jukebox is a hackathon project, not endorsed by NASA.';
      } },
    { name: 'outside knowledge', match: (t) => has(t, 'weather', 'forecast', 'news', 'stock', 'score', 'search the web', 'search for', 'google', 'look up', 'wikipedia', 'who won', 'play music', 'play a song', 'set a timer', 'set an alarm', 'remind me'),
      run: () => 'I cannot do that: I am not connected to the internet or to an AI service. I know this site, its NASA maps, places on them, and the date and time. Say help for examples.' },
    { name: 'joke', match: (t) => has(t, 'joke', 'make me laugh', 'something funny'),
      run: () => 'Why is the ocean so friendly? Because it always waves.' },
    { name: 'help', match: (t) => has(t, 'help', 'what can you do', 'what can i say', 'what do i say', 'commands', 'options'),
      run: () => ({ text: `${help} You can also say: open the gallery, read this page, use the built-in voice, repeat, or stop listening.`, echo: false }) },
    { name: 'voice mode', match: (t) => voiceModeFrom(t),
      run: (c, mode) => {
        const p = loadPrefs(); p.voiceMode = mode; savePrefs(p); announcePrefsChanged();
        if (mode === 'off') return 'Voice off. I will write my answers on screen.';
        return mode === 'voice' ? 'Built-in voice on. I will read my answers aloud.' : 'Screen reader mode. Your screen reader will read my answers.';
      } },
    { name: 'open a page', match: (t) => (has(t, 'open', 'go to', 'take me to', 'show me', 'show', 'back to', 'switch to') || /^ \w+( page)? $/.test(t)) && PAGES.find((p) => has(t, ...p.words)),
      run: (c, page) => { go(page.href); return `Opening ${page.name}.`; } },
    { name: 'open a frame', match: (t) => frameFrom(t),
      run: (c, f) => {
        const cur = currentFrame();
        if (cur && cur.id === f.id) return `${f.title} is already open. Say "what maps are there" to hear the others.`;
        if (openFrame) { openFrame(f); return; } // the Player: switch in the page, it says so itself
        go('player.html?frame=' + encodeURIComponent(f.id));
        return `Opening ${f.title} in the Player.`;
      } },
    { name: 'read page', match: (t) => has(t, 'read this page', 'read the page', 'read page', 'read it', 'whats on this page', 'what is on this page', 'read everything'),
      run: () => readPage() },
    { name: 'where (page)', match: (t) => has(t, 'where am i', 'what page', 'which page'),
      run: () => `You are on the ${document.title} page. Say open the player to explore a map, or help for more.` },
  ];

  function voiceModeFrom(t) {
    if (has(t, 'voice off', 'turn off the voice', 'turn the voice off', 'text only', 'no voice', 'stop speaking to me')) return 'off';
    if (has(t, 'screen reader')) return 'screenreader';
    if (has(t, 'built in voice', 'built-in voice', 'builtin voice', 'built in', 'built-in', 'read aloud', 'read it aloud', 'speak to me', 'talk to me', 'voice on', 'turn on the voice')) return 'voice';
    return null;
  }

  let frameList = [];
  loadFrameList().then((f) => { frameList = f; }).catch(() => {});

  /**
   * A frame (map) someone asks for: with a verb ("open / go to / move me to / switch to the vegetation"),
   * as "the X map" (or data, view, page, interface), or just its name ("precipitation").
   */
  const FRAME_NOUNS = '(?: map| frame| data| dataset| view| page| interface| layer| screen| section| one| please)*';
  function frameFrom(t) {
    const verb = has(t, 'open', 'show', 'show me', 'switch', 'switch to', 'change', 'change to', 'load', 'use', 'play', 'go to', 'take me to',
      'listen to', 'move to', 'move me to', 'bring me to', 'bring up', 'i want', 'i would like', 'id like', 'lets', 'let me', 'can i', 'could i',
      'can you', 'could you', 'look at', 'hear the', 'see the', 'explore', 'try the', 'navigate to', 'jump to', 'head to', 'over to',
      'analyze', 'analyse', 'study', 'check out', 'learn about');
    for (const f of frameList) {
      const words = (f.keywords || []).map((w) => normalise(w).trim());
      if (words.some((w) => new RegExp(` ${w}${FRAME_NOUNS.replace('*', '+')} `).test(t) || (verb && t.includes(` ${w} `)) ||
        new RegExp(`^ (?:the )?${w}${FRAME_NOUNS} $`).test(t))) return f;
    }
    return null;
  }

  /** "There are 4 maps: ..." */
  function listFrames() {
    if (!frameList.length) return 'I could not load the list of maps.';
    const names = frameList.map((f) => f.title);
    const cur = currentFrame();
    return `There are ${names.length} maps: ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}. ` +
      `${cur ? cur.title + ' is open now. ' : ''}Say open and a name, for example "open the vegetation map".`;
  }

  /** Today's date and time from this device's clock (the maps have their own dates). */
  function clockAnswer(t) {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const wantsTime = has(t, 'time', 'clock', 'oclock', 'hour');
    const wantsDate = has(t, 'date', 'day', 'today', 'todays', 'year', 'month');
    const cur = currentFrame();
    const map = cur ? ` This map's data is from ${cur.date}.` : '';
    if (wantsTime && !wantsDate) return `It is ${time}, by this device's clock.`;
    if (wantsDate && !wantsTime) return `Today is ${date}, by this device's clock.${map}`;
    return `Today is ${date}, and the time is ${time}, by this device's clock.${map}`;
  }

  const asksClock = (t) => !has(t, 'map', 'frame', 'data', 'image', 'picture', 'measured', 'measurement', 'taken', 'made') &&
    (has(t, 'today', 'todays', 'what time', 'the time', 'time is it', 'what day', 'which day', 'day is it', 'day of the week', 'what year',
      'which year', 'what month', 'which month', 'current date', 'current time', 'date today', 'what date is it', 'whats the date', 'what is the date',
      'tell me the date', 'tell me the time', 'the date please', 'time now', 'date and time') || /^ (the )?(date|time|day)( please)? $/.test(t));

  // Asked before the page's own commands: the clock, and switching to another map.
  const first = [
    { name: 'today', match: (t) => asksClock(t), run: (c, m, t) => clockAnswer(t) },
    { name: 'switch map', match: (t) => {
        // "What is NDVI?" / "tell me about the rain map" asks about a map; it does not switch (see 'what is a map').
        if (has(t, 'what is', 'whats', 'what does', 'what are', 'tell me about', 'explain', 'mean', 'meaning') &&
          !has(t, 'open', 'switch', 'go to', 'take me', 'move', 'bring', 'show me')) return null;
        const f = frameFrom(t), cur = currentFrame();
        return f && !(cur && cur.id === f.id) ? f : null;
      },
      run: (c, f) => {
        if (openFrame) { openFrame(f); return; } // the Player: switch in the page, it says so itself
        go('player.html?frame=' + encodeURIComponent(f.id));
        return `Opening ${f.title} in the Player.`;
      } },
    { name: 'list maps', match: (t) => has(t, 'what maps', 'which maps', 'list the maps', 'list maps', 'other maps', 'all maps', 'what other', 'available maps',
        'how many maps', 'what can i explore', 'what data do you have', 'which data', 'what frames', 'which frames', 'what interfaces', 'other interfaces', 'what else is there'),
      run: () => listFrames() },
  ];

  function chunks(text, size = 600) {
    const parts = [];
    let cur = '';
    for (const s of text.split(/(?<=[.!?])\s+/)) {
      if ((cur + ' ' + s).length > size && cur) { parts.push(cur.trim()); cur = ''; }
      cur += ' ' + s;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function readPage() {
    const main = document.querySelector('main');
    const clone = main.cloneNode(true);
    clone.querySelectorAll('.assistant, dialog, script, [hidden], canvas').forEach((n) => n.remove());
    ctx.more = chunks(clone.innerText || clone.textContent);
    return readMore();
  }

  function readMore() {
    const part = ctx.more.shift();
    if (!part) return 'That is the end of the page.';
    return ctx.more.length ? `${part} … Say continue to hear more.` : part;
  }

  // --- Understanding a request --------------------------------------------

  async function handle(text, { spoken = false } = {}) {
    let t = normalise(text);
    if (!t.trim()) return;
    const original = text.trim();
    const addressed = WAKE.test(t);
    // Heard from the room without "Terra" and not a request Terra knows: say nothing (it may be people talking).
    const wordCount = t.trim().split(' ').length;
    // Long sentences without "Terra" are conversation in the room, not requests (requests are short).
    // Short phrases it does not understand still get a short answer (silence felt like Terra was not listening);
    // only longer ones without "Terra" count as people talking in the room.
    if (spoken && !addressed && (wordCount > 6 || (wordCount > 0 && !(await understands(t, text)) && looksLikeChatter(t)))) {
      heardEl.textContent = `Heard "${original}": not a request I know, so I stayed quiet. Start with "Terra" to ask me anything.`;
      micState(`heard ${wordCount} words, but not a request I know, so I stayed quiet. Start with "Terra", for example "Terra, where am I?"`, 'quiet');
      terraLog('quiet', { words: wordCount, reason: wordCount > 8 ? 'long, no name' : 'not a known request, no name' });
      return;
    }
    if (spoken) micState(`heard you (${wordCount} words). Answering…`, 'ok');
    log('You', original);
    requestSpoken = spoken;
    capturing = true;
    clearTimeout(captureTimer);
    let answer;
    // Its name: "Terra, ...", "hey Terra ...", "OK Terra ..." (and "Terra" alone).
    const named = t.match(WAKE);
    if (named) {
      const rest = named[1].trim();
      if (!rest) {
        reply(listeningOn ? "Yes? I'm listening." : 'Yes? Type your request, or press V so I can hear you.', { echo: false });
        captureTimer = setTimeout(() => { capturing = false; requestSpoken = false; }, 3000);
        return;
      }
      text = rest;
      t = ` ${rest} `;
    }
    try {
      // A pending yes/no question comes first.
      const presence = PRESENCE.find((c) => c.match(t));
      if (presence) {
        if (spoken) terraLog('answer', { command: 'are you listening' });
        answer = presence.run();
      } else if (ctx.pending && (has(t, ...YES) || has(t, ...NO))) {
        const p = ctx.pending;
        ctx.pending = null;
        answer = has(t, ...NO) && !has(t, ...YES) ? (p.no ? await p.no() : 'Okay.') : await p.yes();
      } else {
        ctx.pending = null;
        let done = false;
        for (const cmd of [...first, ...commands, ...common]) {
          const m = await cmd.match(t, text, ctx);
          if (m) { if (spoken) terraLog('answer', { command: cmd.name, words: wordCount }); answer = await cmd.run(ctx, m, t, text); done = true; break; }
        }
        if (!done) {
          // Spoken: keep it short (it may have been a stray remark in the room).
          answer = spoken ? { text: `Sorry, I did not catch "${text.trim()}". I can answer questions about these maps, places on them, and the date and time. Say help for examples.`, echo: false }
            : { text: `Sorry, I did not understand "${text.trim()}". ${help ? 'Try: ' + help : ''} Or say help.`, echo: false };
        }
      }
    } catch (err) {
      answer = 'Sorry, something went wrong with that request: ' + err.message;
    }
    if (answer) typeof answer === 'string' ? reply(answer) : reply(answer.text, { echo: answer.echo });
    // Keep logging for a moment: some replies arrive later (a comparison speaks after its tones).
    captureTimer = setTimeout(() => { capturing = false; requestSpoken = false; }, 3000);
  }

  /** A short phrase that is probably not meant for Terra: one or two filler words ("yeah", "okay so", "um"). */
  function looksLikeChatter(t) {
    return /^ (yeah|yes|no|ok|okay|um+|uh+|hmm+|so|and|but|right|oh|ah|well|like|i mean|you know|okay so|yeah yeah|mm+)( (so|yeah|okay|and|um))? $/.test(t) || t.trim().length < 3;
  }

  /** Would some command answer this? (Used to stay quiet about room chatter.) */
  async function understands(t, text) {
    if (PRESENCE.some((c) => c.match(t))) return true;
    if (ctx.pending && (has(t, ...YES) || has(t, ...NO))) return true;
    for (const cmd of [...first, ...commands, ...common]) if (await cmd.match(t, text, ctx)) return true;
    return false;
  }

  // Asked before anything else, whatever page this is.
  const PRESENCE = [
    { match: (t) => has(t, 'are you listening', 'are you still listening', 'still listening', 'can you hear me', 'do you hear me',
        'are you there', 'are you still there', 'you there', 'are you on', 'are you awake', 'is terra on', 'is terra listening', 'hello are you there')
        || /^ (are )?(you )?(still )?listen(ing)?( to me)? $/.test(t) || / (are you|you still|still) listen /.test(t),
      run: () => (listeningOn ? "Yes, I'm listening. What would you like to do?" : "I'm here, but I'm not listening to the microphone right now. Press V to switch me on.") },
  ];

  // --- Listening: Terra on / off --------------------------------------------

  async function cue(kind) {
    try { if (!isStarted()) await startAudio(); playCue(kind); } catch (e) { /* no sound: fine */ }
  }

  // Our own record of the built-in voice talking (narrator.js), not Chrome's, which can get stuck.
  const speaking = () => isSpeaking();

  /** Mostly the words Terra is saying right now? (Looser test, used only while Terra talks.) */
  function echoOfLast(text) {
    const last = recent[recent.length - 1];
    if (!last) return false;
    const words = normalise(text).trim().split(' ').filter((w) => w && !NAME_WORD.test(w) && !/^(hey|hi|ok|okay)$/.test(w));
    if (!words.length) return true;
    const said = new Set(last.text.trim().split(' '));
    return words.filter((w) => said.has(w)).length / words.length >= 0.5;
  }

  /** True if a transcript looks like Terra's own recent words coming back through the microphone. */
  function isEcho(text) {
    const words = normalise(text).trim().split(' ').filter(Boolean);
    if (words.length < 6) return false; // short requests are never treated as echoes
    const now = performance.now();
    return recent.some((r) => {
      if (now - r.time > 15000) return false;
      const said = new Set(r.text.trim().split(' '));
      return words.filter((w) => said.has(w)).length / words.length >= 0.7;
    });
  }

  function showState() {
    for (const b of allToggles) {
      b.setAttribute('aria-pressed', String(listeningOn));
      b.classList.toggle('on', listeningOn);
      const st = b.querySelector('.terra-state');
      if (st) st.textContent = listeningOn ? 'On' : 'Off';
    }
    statusEl.textContent = listeningOn ? 'Terra is listening. Speak at any time; say "stop listening" or press V to switch it off.' : '';
  }

  // --- Which microphone: Terra opens it itself and hands it to the recognizer ---------------------
  // Chrome's recognizer otherwise uses Chrome's own preferred microphone, which can be a virtual device
  // (screen casting, meeting or recording apps) that sends silence: then Terra hears nothing at all.
  const VIRTUAL = /virtual|airgo|blackhole|soundflower|loopback|zoom|teams|parrot|krisp|obs |cast|aggregate|vb-audio|voicemeeter/i;
  let micStream = null, micTrack = null, micDevice = null, meter = null, lastLoud = 0;

  async function inputs() {
    try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput'); } catch (e) { return []; }
  }
  /** The chosen microphone, or automatically: the system's default, the built-in one, any real one. Never a virtual one. */
  function chooseInput(list) {
    const saved = loadPrefs().terraMic;
    const real = list.filter((d) => !VIRTUAL.test(d.label));
    return (saved && list.find((d) => d.deviceId === saved)) ||
      real.find((d) => d.deviceId === 'default') || real.find((d) => /built-in|internal|macbook|microphone array/i.test(d.label)) ||
      real[0] || list[0] || null;
  }
  const deviceName = (d) => (d && d.label ? d.label.replace(/^Default - /, '').replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, '') : 'the microphone');
  function fillMicMenu(list, chosen) {
    const saved = loadPrefs().terraMic;
    micSelect.replaceChildren(new Option(`Automatic${chosen && !saved ? ': ' + deviceName(chosen) : ''}`, ''));
    for (const d of list) {
      if (d.deviceId === 'default' || d.deviceId === 'communications') continue;
      micSelect.append(new Option(deviceName(d) + (VIRTUAL.test(d.label) ? ' (virtual, usually silent)' : ''), d.deviceId));
    }
    micSelect.value = saved && list.some((d) => d.deviceId === saved) ? saved : '';
  }
  function closeMic() {
    if (meter) { meter.stop(); meter = null; }
    if (micStream) micStream.getTracks().forEach((t) => t.stop());
    micStream = null; micTrack = null;
    micLive.style.width = '0%';
  }
  /** A live level bar, so you can see the microphone hearing you. */
  function startMeter(stream) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    ac.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    let alive = true, frame = 0, timer = 0;
    const resume = () => ac.state === 'suspended' && ac.resume().catch(() => {});
    document.addEventListener('pointerdown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
    resume();
    // Measured on a timer, not on screen redraws (Chrome pauses those when the window is behind others,
    // which made the microphone look silent).
    timer = setInterval(() => {
      if (!alive) return;
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      if (rms > 0.0025) lastLoud = performance.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { micLive.style.width = Math.min(100, Math.round(rms * 600)) + '%'; });
    }, 100);
    meter = { stop() { alive = false; clearInterval(timer); cancelAnimationFrame(frame); ac.close().catch(() => {}); }, state: () => ac.state };
  }
  /** Open the chosen microphone (asking permission first if needed). Returns the audio track. */
  async function openMic() {
    closeMic();
    let list = await inputs();
    if (!list.some((d) => d.label)) { // no names before permission: ask once, then look again
      const s0 = await navigator.mediaDevices.getUserMedia({ audio: true });
      s0.getTracks().forEach((t) => t.stop());
      list = await inputs();
    }
    micDevice = chooseInput(list);
    micStream = await navigator.mediaDevices.getUserMedia({ audio: micDevice ? { deviceId: { exact: micDevice.deviceId } } : true });
    micTrack = micStream.getAudioTracks ? micStream.getAudioTracks()[0] : null;
    fillMicMenu(list, micDevice);
    lastLoud = performance.now();
    if (micStream.getAudioTracks) startMeter(micStream);
    terraLog('microphone chosen', { device: deviceName(micDevice).slice(0, 60), virtual: VIRTUAL.test((micDevice && micDevice.label) || ''),
      inputs: list.map((d) => deviceName(d).slice(0, 40) + (VIRTUAL.test(d.label) ? ' [virtual]' : '')).slice(0, 8), saved: Boolean(loadPrefs().terraMic) });
    return micTrack;
  }
  micSelect.addEventListener('change', async () => {
    const p = loadPrefs(); p.terraMic = micSelect.value; savePrefs(p);
    if (!listeningOn) return;
    try {
      await openMic();
      if (rec) { const r = rec; rec = null; retryAt = performance.now() + 50; try { r.abort(); } catch (e) { /* ended */ } }
      micState(`switched to ${deviceName(micDevice)}. Speak, and watch the bar move.`, 'on');
    } catch (err) { micState(`could not open that microphone (${err.name}). Choose another one.`, 'error'); }
  });

  /** Switch Terra on or off (no announcement; see startListening for the full start). */
  function setOn(on) {
    listeningOn = on;
    try { on ? sessionStorage.setItem(ON_KEY, '1') : sessionStorage.removeItem(ON_KEY); } catch (e) { /* fine */ }
    if (!on && rec) { const r = rec; rec = null; try { r.abort(); } catch (e) { /* already stopped */ } }
    if (!on) closeMic();
    if (!on) { cue('listenEnd'); if (micEl.dataset.kind !== 'error') micState('off. Press V or the switch above so Terra can hear you.'); }
    showState();
  }

  /** Make sure the microphone can be used, with a clear message if not. */
  async function microphoneOk() {
    if (!getRecognition()) {
      reply('Voice input is not available in this browser. Open the site in Chrome, Edge or Safari to talk to Terra, or type your request in the box.', { aloud: terraAloudSetting() });
      return false;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!window.isSecureContext) { reply('The microphone only works on a secure page: open the site from localhost or an https address.', { aloud: terraAloudSetting() }); return false; }
      return true; // let the recognition ask for permission itself
    }
    // Tell the user about the browser's permission question: it is easy to miss without sight.
    let state = 'unknown';
    try { state = (await navigator.permissions.query({ name: 'microphone' })).state; } catch (e) { /* not supported */ }
    terraLog('permission', { state });
    if (state === 'denied') {
      reply('The microphone is blocked for this site. Allow it in the browser\'s site settings, then press V again. Or type your request in the box.', { aloud: terraAloudSetting() });
      return false;
    }
    if (state !== 'granted') reply('Your browser is asking to use the microphone. Choose Allow.', { echo: false, aloud: terraAloudSetting() });
    try {
      await openMic();
      terraLog('microphone', { ok: true, muted: micTrack ? micTrack.muted : null });
      return true;
    } catch (err) {
      terraLog('microphone', { ok: false, error: err.name });
      micState(err.name === 'NotFoundError' ? 'no microphone found.' : 'blocked by the browser. Click the microphone or lock icon in the address bar, allow the microphone, then press V.', 'error');
      if (err.name === 'NotFoundError') reply('No microphone was found. Connect one, or type your request in the box.', { aloud: terraAloudSetting() });
      else reply('The microphone is blocked. Allow microphone access for this site in the browser, then press V again. Or type your request in the box.', { aloud: terraAloudSetting() });
      return false;
    }
  }

  /** Switch Terra on and say so. */
  async function startListening({ resume = false, quiet = false } = {}) {
    if (listeningOn) return true;
    const blocker = recognitionBlocker();
    terraLog('switch on', { resume, quiet, blocker: blocker || null });
    if (blocker) { micState(blocker, 'error'); reply(blocker, { aloud: terraAloudSetting() }); setOn(false); return false; }
    micState('asking the browser for the microphone…');
    if (!(await microphoneOk())) { setOn(false); return false; }
    stopTone();
    setOn(true);
    micState('starting…');
    await cue('listenStart');
    // On a new page Terra stays on without talking over the page's own start (the Player's listening guide).
    if (resume) statusEl.textContent = 'Terra is still listening.';
    else if (!quiet) reply('Terra is listening. Say what you want, at any time. Say stop listening, or press V, to switch me off.', { echo: false });
    if (resume && terraAloudSetting() && !canSpeakNow()) statusEl.textContent = SPEAK_HINT;
    retryAt = performance.now() + 300;
    return true;
  }

  /** Start one recognition session (Terra restarts it whenever it ends). */
  function begin() {
    const Rec = getRecognition();
    if (!listeningOn || rec || !Rec) return;
    const r = new Rec();
    // English variants Chrome's recognizer knows; anything else (e.g. "en-TH") uses US English.
    const SUPPORTED = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-NZ', 'en-ZA', 'en-IE', 'en-PH', 'en-SG'];
    r.lang = !forceUS && SUPPORTED.includes(navigator.language) ? navigator.language : 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;
    // Chrome only marks a phrase "final" after it hears silence. With people talking nearby, or with some
    // microphones and audio sources, that can take very long or never happen, and Terra would never answer.
    // So Terra also acts on words that have stopped changing (STILL_MS), or, once it has heard its name,
    // on the request after its name a moment later even if the room keeps talking (AFTER_NAME_MS).
    let finalsDone = 0;   // results of this session already handled as final
    let used = 0;         // words of the unfinished result already handled
    let lastTaken = [];   // the words handled last from it (so the final version is not handled twice)
    let current = [];     // all words of the unfinished result
    let nameSeenAt = 0, stillTimer = 0;
    let phraseSince = 0;  // when the unfinished result began
    // A fresh session: Chrome forgets the unfinished phrase. (With voices around all the time, Chrome can keep one
    // phrase open for ever and then stop sending anything, while still looking switched on.)
    const restart = () => {
      clearTimeout(stillTimer);
      if (rec !== r) return;
      rec = null;
      retryAt = performance.now() + 50;
      try { r.abort(); } catch (err) { /* already ended */ }
    };
    r.lastEvent = performance.now();
    // Speech in progress: from Chrome's "speechstart", or words still arriving, until "speechend" or a final phrase.
    // (Restarting in a quiet moment would cut off the first words of someone who starts talking just then.)
    r.speechActive = false;
    r.restartIfStuck = () => {
      const now = performance.now();
      if (phraseSince && now - phraseSince > S.longestPhraseMs) {
        // Handle a request waiting in the long phrase first ("..., Terra, where am I"), then start afresh.
        if (attentionIndex(current.slice(used)) >= 0) take(true);
        restart();
      } else if ((r.speechActive && now - r.lastEvent > S.stalledMs) || now - r.lastEvent > S.idleSessionMs) restart();
    };
    const take = (fromName) => {
      let ws = current.slice(used);
      if (fromName) {
        const i = attentionIndex(ws);
        if (i < 0) return;
        ws = ws.slice(i, i + 12);
        used += i + ws.length;
      } else used = current.length;
      nameSeenAt = 0;
      if (!ws.length) return;
      lastTaken = ws.map(plain);
      restart(); // what came before is handled; start clean so nothing is handled twice
      onHeard(ws.join(' '));
    };
    r.onresult = (e) => {
      errorsInARow = 0;
      r.lastEvent = performance.now();
      r.speechActive = !e.results[e.results.length - 1].isFinal;
      if (rec !== r) return; // a session Terra already replaced
      if (e.results.length <= finalsDone) finalsDone = Math.min(finalsDone, e.resultIndex); // a browser that starts the list again
      for (; finalsDone < e.results.length && e.results[finalsDone].isFinal; finalsDone++) {
        const res = e.results[finalsDone];
        const alts = [...Array(res.length).keys()].map((k) => res[k].transcript);
        // Prefer a guess that has Terra's name in it (the first guess often has "Sarah" or misses it).
        const best = (used ? null : alts.find((a) => nameIndex(splitWords(a)) >= 0)) || alts[0];
        const rest = splitWords(best).slice(used);
        const repeat = used && rest.every((w) => lastTaken.includes(plain(w)));
        used = 0; lastTaken = []; current = []; nameSeenAt = 0; phraseSince = 0;
        if (rest.length && !repeat) onHeard(rest.join(' '));
      }
      clearTimeout(stillTimer);
      current = splitWords([...e.results].slice(finalsDone).map((x) => x[0].transcript).join(' '));
      const fresh = current.slice(used);
      input.value = fresh.join(' '); // shows what Terra is hearing (not announced)
      if (!fresh.length) return;
      if (!phraseSince) phraseSince = performance.now();
      heardEl.textContent = `Hearing: "${fresh.join(' ')}"`;
      if (attentionIndex(fresh) >= 0) {
        if (!nameSeenAt) nameSeenAt = performance.now();
        else if (performance.now() - nameSeenAt > S.afterNameMs) { take(true); return; }
      }
      stillTimer = setTimeout(() => take(false), S.stillMs);
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // just restart
      if (e.error === 'language-not-supported' || e.error === 'bad-grammar') { forceUS = true; retryAt = performance.now() + 300; return; }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setOn(false);
        reply('The microphone is blocked. Allow microphone access for this site in the browser, then press V again. Or type your request in the box.', { aloud: terraAloudSetting() });
      } else if (e.error === 'audio-capture') {
        setOn(false);
        reply('No microphone was found. Connect one, or type your request in the box.', { aloud: terraAloudSetting() });
      } else if (e.error === 'network') {
        setOn(false);
        reply('Voice input needs an internet connection in this browser. Terra is off; you can still type your request in the box.', { aloud: terraAloudSetting() });
      } else {
        retryAt = performance.now() + 1500;
        // Do not fail silently: after a few unexplained errors in a row, say so once.
        if (++errorsInARow === 3) reply(`Voice input keeps failing (${e.error}). Check the microphone, or type your request in the box.`, { aloud: terraAloudSetting() });
      }
    };
    r.onend = () => { if (rec === r) rec = null; retryAt = Math.max(retryAt, performance.now() + 100); terraLog('session end'); };
    // What Chrome's recognizer is doing, on the visible line and in the log (never the words).
    let heardSound = false;
    const on = (type, fn) => { if (r.addEventListener) r.addEventListener(type, fn); };
    on('start', () => terraLog('session start', { lang: r.lang }));
    on('audiostart', () => {
      if (rec === r) micState(`on (${deviceName(micDevice)}). Listening: speak whenever you like; the bar moves when it hears you.`, 'on');
      setTimeout(() => {
        if (rec !== r || !listeningOn || speaking()) return;
        const silent = meter && meter.state() === 'running' ? performance.now() - lastLoud > 9000 && !heardSound : false;
        if (silent) {
          micState(`on, but no sound from ${deviceName(micDevice)} for 10 seconds. Choose another microphone in the menu below, or check it is not muted.`, 'warn');
          terraLog('silent microphone', { device: deviceName(micDevice).slice(0, 60), meterState: meter ? meter.state() : 'none' });
        }
      }, 10000);
    });
    on('soundstart', () => { heardSound = true; if (rec === r) micState('hearing sound…', 'on'); terraLog('sound'); });
    on('speechend', () => { r.speechActive = false; });
    on('speechstart', () => { r.speechActive = true; r.lastEvent = Math.max(r.lastEvent, performance.now()); if (rec === r) micState('hearing speech…', 'on'); terraLog('speech'); });
    on('error', (e) => {
      terraLog('error', { error: e.error, message: e.message || '' });
      if (!['no-speech', 'aborted'].includes(e.error)) micState(`error from Chrome's speech recognition: ${e.error}. ${ERROR_HELP[e.error] || ''}`, 'error');
    });
    on('result', (e) => {
      const last = e.results[e.results.length - 1];
      const words = splitWords(last[0].transcript);
      terraLog('words', { count: words.length, final: last.isFinal, name: nameIndex(words) >= 0 });
    });
    rec = r;
    try {
      // The chosen microphone (Chrome 13x+ accepts an audio track); otherwise Chrome's own choice.
      if (micTrack && micTrack.readyState === 'live') r.start(micTrack); else r.start();
    } catch (err) {
      try { r.start(); } catch (err2) { rec = null; retryAt = performance.now() + 1000; terraLog('start failed', { error: err2.name }); }
    }
  }

  const ERROR_HELP = {
    'not-allowed': 'The microphone is blocked: click the microphone or lock icon in the address bar and allow it.',
    'service-not-allowed': 'Chrome\'s speech service is turned off for this page.',
    'network': 'Chrome needs an internet connection for speech recognition.',
    'audio-capture': 'No microphone could be opened.',
  };

  /** One finished phrase from the microphone. */
  function onHeard(said) {
    input.value = '';
    let text = said.trim();
    if (!listeningOn || text.length < 2) return;
    // Terra's name after other words (people talking just before): start from the name.
    const words = splitWords(text), at = attentionIndex(words);
    if (at > 0) text = words.slice(at).join(' ');
    const addressed = WAKE.test(normalise(text));
    if (speaking() && acceptWhileTalking(text)) {
      // An answer to the question Terra is reading out (e.g. "vegetation" to "which map?"): interrupt it.
      stopSpeaking();
    } else if (speaking()) {
      // While Terra talks the microphone hears Terra too: only a request that starts with "Terra"
      // (and is not Terra's own words) gets through, and it interrupts Terra.
      if (!addressed || echoOfLast(text)) { heardEl.textContent = `Heard "${text}" while I was talking (ignored). Wait for me to finish, or start with "Terra".`; return; }
      stopSpeaking();
    } else if (isEcho(text)) { heardEl.textContent = `Heard "${text}" (ignored: it sounded like Terra itself).`; return; }
    heardEl.textContent = `Heard: "${text}"`;
    if (terraAloudSetting() && !canSpeakNow()) statusEl.textContent = SPEAK_HINT;
    if (loadPrefs().terraWakeWord && performance.now() > wakeUntil) {
      const m = normalise(text).match(WAKE);
      if (!m) { heardEl.textContent = `Heard "${text}" (ignored: it did not start with "Terra").`; return; }
      text = m[1].trim();
      if (!text) { wakeUntil = performance.now() + 8000; reply('Yes?', { echo: false }); return; }
    }
    wakeUntil = 0;
    handle(text, { spoken: true });
  }

  // Keep listening while Terra is on: restart whenever the browser ends a session.
  // (Terra no longer stops listening while it talks: restarting took seconds and lost what you said.
  // Instead, what is heard while Terra talks is ignored unless it starts with "Terra"; see onHeard.)
  setInterval(() => {
    if (listeningOn && !rec && performance.now() >= retryAt) begin();
    else if (rec && rec.restartIfStuck) rec.restartIfStuck();
  }, 250);

  // --- Check the microphone: is there sound, and does speech recognition turn it into words? ---

  async function checkMicrophone() {
    const wasOn = listeningOn;
    if (wasOn) setOn(false);
    checkBtn.disabled = true;
    const results = [];
    const say2 = (t) => reply(t, { echo: false, aloud: terraAloudSetting() });
    try {
      const Rec = getRecognition();
      if (!Rec) { say2('Microphone check: this browser has no speech recognition. Use Chrome, Edge or Safari.'); return; }
      if (!(await microphoneOk())) return;
      say2('Microphone check. After the tone, say something, for example: Terra, where am I?');
      await new Promise((r) => setTimeout(r, 300));
      while (isSpeaking()) await new Promise((r) => setTimeout(r, 200));
      await cue('listenStart');

      // 1. Sound level for 4 seconds
      let peak = 0;
      try {
        const track = await openMic(); // the same microphone Terra listens to
        const stream = micStream;
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const an = ac.createAnalyser();
        an.fftSize = 1024;
        ac.createMediaStreamSource(stream).connect(an);
        const buf = new Float32Array(an.fftSize);
        levelEl.hidden = false;
        const t0 = performance.now();
        while (performance.now() - t0 < 3000) {
          an.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
          peak = Math.max(peak, rms);
          levelEl.value = Math.min(1, rms * 8);
          await new Promise((r) => setTimeout(r, 50));
        }
        ac.close();
        levelEl.hidden = true;
        const name = deviceName(micDevice);
        results.push(peak > 0.01 ? `Sound: yes, I can hear ${name}.` : `Sound: no. ${name} is silent: choose another microphone in the Microphone menu, or check it is not muted.`);
        terraLog('microphone check', { device: name.slice(0, 60), peak: Number(peak.toFixed(4)) });
        // 2. Then (not at the same time: on a Mac they can compete for the microphone) one round of speech recognition.
        say2('Now say something again.');
        await new Promise((r) => setTimeout(r, 300));
        while (isSpeaking()) await new Promise((r) => setTimeout(r, 200));
        await cue('listenStart');
        const words = await new Promise((resolve) => {
          const r = new Rec();
          r.lang = 'en-US'; r.continuous = true; r.interimResults = true;
          let finalText = '', interim = '';
          r.onresult = (e) => {
            interim = '';
            for (let k = e.resultIndex; k < e.results.length; k++) {
              if (e.results[k].isFinal) finalText += e.results[k][0].transcript; else interim += e.results[k][0].transcript;
            }
            if (finalText) { try { r.stop(); } catch (er) { /* ended */ } }
          };
          r.onerror = (e) => resolve({ error: e.error, text: finalText || interim });
          r.onend = () => resolve({ text: finalText || interim });
          try { if (track && track.readyState === 'live') r.start(track); else r.start(); } catch (err) { try { r.start(); } catch (err2) { resolve({ error: err2.name }); } }
          setTimeout(() => { try { r.stop(); } catch (e) { /* ended */ } }, 7000);
        });
        const w = words;
        if (w.error === 'network') results.push('Speech recognition: it needs an internet connection in this browser, and there is none.');
        else if (w.error === 'not-allowed' || w.error === 'service-not-allowed') results.push('Speech recognition: blocked. Allow the microphone for this site.');
        else if (w.error && w.error !== 'no-speech' && w.error !== 'aborted') results.push(`Speech recognition: error ${w.error}.`);
        else if (w.text && w.text.trim()) results.push(`Speech recognition: works. I heard: "${w.text.trim()}".`);
        else results.push('Speech recognition: I heard no words. Speak a little louder or closer, and try again.');
        terraLog('microphone check words', { error: w.error || null, words: w.text ? splitWords(w.text).length : 0 });
        closeMic();
      } catch (err) {
        results.push('The microphone could not be opened: ' + err.message);
      }
      say2('Microphone check done. ' + results.join(' '));
    } finally {
      checkBtn.disabled = false;
      levelEl.hidden = true;
      if (wasOn) startListening({ resume: true });
    }
  }
  checkBtn.addEventListener('click', checkMicrophone);

  function toggle() { if (listeningOn) { setOn(false); reply('Terra stopped listening.', { echo: false, aloud: terraAloudSetting() }); } else startListening(); }

  allToggles.forEach((b) => b.addEventListener('click', toggle));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    handle(text);
  });

  // Chrome's voice did not start even after the retries (narrator.js): say what to do, visibly.
  window.addEventListener('terrasense-speech-trouble', () => {
    statusEl.textContent = 'The built-in voice is not working in this Chrome window. Quit Chrome completely (Cmd+Q on a Mac), open it again, and reload this page.';
    micState('heard you, but Chrome\'s voice is not working, so my answers are only written here. Quit Chrome (Cmd+Q) and open it again.', 'error');
  });

  // Narrator (the voice mode), on every page, so it is clear whether the page reads aloud.
  narratorSelect.value = loadPrefs().voiceMode;
  narratorSelect.addEventListener('change', () => {
    const p = loadPrefs(); p.voiceMode = narratorSelect.value; savePrefs(p); announcePrefsChanged();
    terraLog('narrator', { mode: p.voiceMode });
    if (p.voiceMode === 'voice') speak('Built-in voice on. I will read the page aloud.', p.speechRate);
  });
  voiceTestBtn.addEventListener('click', () => {
    if (!speechSupported()) { micState('this browser has no built-in voice.', 'error'); return; }
    let started = false;
    speak('This is Terra\'s voice. If you can hear me, the sound works.', loadPrefs().speechRate, () => terraLog('voice test end', { started }));
    const u = window.speechSynthesis;
    setTimeout(() => {
      started = u.speaking;
      terraLog('voice test', { speaking: u.speaking, pending: u.pending, voices: u.getVoices().length });
      if (!u.speaking && !u.pending) statusEl.textContent = 'Chrome did not start speaking. Check the volume, and that the Mac\'s sound output is the speakers or headphones you are using. If it stays silent, quit Chrome completely and open it again.';
      else statusEl.textContent = 'Terra is speaking now. If you hear nothing, check the volume and the sound output (Mac: System Settings, Sound, Output).';
    }, 900);
  });
  aloudBox.checked = terraAloudSetting();
  aloudBox.disabled = !speechSupported();
  aloudBox.addEventListener('change', () => {
    const p = loadPrefs(); p.terraAloud = aloudBox.checked; savePrefs(p); announcePrefsChanged();
  });
  wakeBox.checked = loadPrefs().terraWakeWord;
  wakeBox.addEventListener('change', () => {
    const p = loadPrefs(); p.terraWakeWord = wakeBox.checked; savePrefs(p); announcePrefsChanged();
  });
  window.addEventListener('terrasense-prefs-changed', () => { wakeBox.checked = loadPrefs().terraWakeWord; aloudBox.checked = terraAloudSetting(); narratorSelect.value = loadPrefs().voiceMode; });

  // V anywhere on the page (except while typing in a field or a dialog is open): Terra on / off.
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'v' && e.key !== 'V')) return;
    const tag = e.target.tagName;
    const typing = tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && !['checkbox', 'radio', 'range', 'button'].includes(e.target.type));
    if (typing || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    toggle();
  });

  terraLog('page', { ...browserFacts(), version: TERRA_VERSION, narrator: loadPrefs().voiceMode, terraAloud: loadPrefs().terraAloud, canSpeak: canSpeakNow() });
  {
    const blocker = recognitionBlocker();
    if (blocker) { micState(blocker, 'error'); statusEl.textContent = blocker; }
  }
  micEl.title = 'Terra version ' + TERRA_VERSION;

  // Terra was on when this tab opened this page (e.g. "open the rain map"): stay on.
  let wasOn = false;
  try { wasOn = sessionStorage.getItem(ON_KEY) === '1'; } catch (e) { /* fine */ }
  if (wasOn && getRecognition()) {
    const resume = () => (window.__welcomeOpen ? setTimeout(resume, 500) : startListening({ resume: true }));
    setTimeout(resume, 1200);
  }

  return {
    handle, heard, toggle, startListening, ctx, answersAloud,
    get on() { return listeningOn; },
    set acceptWhileTalking(fn) { acceptWhileTalking = fn || (() => false); },
    stop: () => setOn(false),
  };
}

// assistant.js: Terra, the voice assistant.
//
// Say (or type) what you want: "where am I", "take me to Japan", "compare
// here with the coolest", "open the precipitation map". Terra answers in the
// chosen voice (screen reader, built-in voice, or text), can ask a follow-up
// question ("Would you like me to take you there?"), and in built-in voice
// mode keeps listening for your answer, so you can go back and forth.
//
// Terra is not a general AI. It understands a fixed set of requests (see the
// commands below and in player-assistant.js), runs the same functions as the
// buttons, and so never says a value the Player would not say.
//
// Speech recognition uses the browser's Web Speech API. In Chrome and Edge it
// needs an internet connection; typing always works.

import { speak, stopSpeaking, speechSupported } from './narrator.js';
import { loadPrefs, savePrefs } from './prefs.js';
import { startAudio, isStarted, playCue, stopTone } from './audio.js';
import { loadFrameList } from './decoder.js';
import { normalise } from './places.js';
import { announcePrefsChanged } from './welcome.js';

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function recognitionSupported() {
  return Boolean(Recognition);
}

// ---------------------------------------------------------------------------
// Speaking on pages without the Player (the Player passes its own say())
// ---------------------------------------------------------------------------

let pageLive = null;

/** Say text in the saved voice mode: polite live region, built-in voice, or nothing. */
export function pageSay(text) {
  const mode = loadPrefs().voiceMode;
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
 *   isBusy       () => true while a reply is still being played (e.g. a comparison)
 *   sayCallsHeard true if say() reports back through heard() (the Player), so replies are logged once
 */
export function createAssistant({ container, say, commands = [], help = '', headingLevel = 2, isBusy = () => false, sayCallsHeard = false }) {
  const h = `h${headingLevel}`;
  container.classList.add('assistant');
  container.setAttribute('aria-labelledby', 'assistant-heading');
  container.innerHTML = `
    <${h} id="assistant-heading">Ask Terra, the assistant</${h}>
    <p class="muted small" id="assistant-help">Press V, or Talk, and say what you want, or type it. Say "help" for examples.</p>
    <div class="button-row">
      <button type="button" id="talk-btn" aria-pressed="false" accesskey="v">Talk to Terra (V)</button>
    </div>
    <form id="ask-form" class="control-row">
      <label for="ask-input">Or type a request</label>
      <input id="ask-input" type="text" autocomplete="off" enterkeyhint="send">
      <button type="submit" class="secondary">Ask</button>
    </form>
    <p id="assistant-status" class="muted small" role="status"></p>
    <ol id="assistant-log" class="assistant-log" aria-label="Conversation with Terra"></ol>`;

  const $ = (id) => container.querySelector('#' + id);
  const talkBtn = $('talk-btn'), form = $('ask-form'), input = $('ask-input');
  const statusEl = $('assistant-status'), logEl = $('assistant-log');

  const ctx = {
    say: (text) => reply(text),
    pending: null,          // { yes(), no(), question }
    last: '',               // Terra's last reply, for "repeat"
    more: [],               // the rest of a long text, for "continue"
    ask(question, yes, no) { this.pending = { question, yes, no }; return question; },
  };

  let conversation = false; // keep listening after each reply (built-in voice only)
  let rec = null;
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

  /** Say a reply and log it (once). */
  function reply(text) {
    if (!text) return;
    ctx.last = text;
    if (sayCallsHeard) { const was = capturing; capturing = true; say(text); capturing = was; }
    else { say(text); log('Terra', text); }
  }

  /** The Player announced something; log it while a request runs. */
  function heard(text) {
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
    { name: 'end conversation', match: (t) => has(t, 'goodbye', 'bye', 'stop listening', 'thats all', 'that is all', 'im done', 'i am done', 'go to sleep'),
      run: () => { conversation = false; return 'Goodbye. Press V whenever you need me.'; } },
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
    { name: 'help', match: (t) => has(t, 'help', 'what can you do', 'what can i say', 'what do i say', 'commands', 'options'),
      run: () => `${help} You can also say: open the gallery, read this page, use the built-in voice, repeat, or goodbye.` },
    { name: 'voice mode', match: (t) => voiceModeFrom(t),
      run: (c, mode) => {
        const p = loadPrefs(); p.voiceMode = mode; savePrefs(p); announcePrefsChanged();
        if (mode === 'off') { conversation = false; return 'Voice off. I will write my answers on screen.'; }
        return mode === 'voice' ? 'Built-in voice on. I will read my answers aloud.' : 'Screen reader mode. Your screen reader will read my answers.';
      } },
    { name: 'open a page', match: (t) => (has(t, 'open', 'go to', 'take me to', 'show me', 'show', 'back to', 'switch to') || /^ \w+( page)? $/.test(t)) && PAGES.find((p) => has(t, ...p.words)),
      run: (c, page) => { go(page.href); return `Opening ${page.name}.`; } },
    { name: 'open a frame', match: (t) => frameFrom(t),
      run: (c, f) => { go('player.html?frame=' + encodeURIComponent(f.id)); return `Opening ${f.title} in the Player.`; } },
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

  /** A frame named with an "open" verb, or as "the X map". */
  function frameFrom(t) {
    const verb = has(t, 'open', 'show', 'show me', 'switch to', 'change to', 'load', 'use', 'play', 'go to', 'take me to', 'listen to');
    for (const f of frameList) {
      const words = (f.keywords || []).map((w) => normalise(w).trim());
      if (words.some((w) => t.includes(` ${w} map `) || t.includes(` ${w} frame `) || (verb && t.includes(` ${w} `)))) return f;
    }
    return null;
  }

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

  async function handle(text) {
    const t = normalise(text);
    if (!t.trim()) return;
    log('You', text.trim());
    capturing = true;
    clearTimeout(captureTimer);
    let answer;
    try {
      // A pending yes/no question comes first.
      if (ctx.pending && (has(t, ...YES) || has(t, ...NO))) {
        const p = ctx.pending;
        ctx.pending = null;
        answer = has(t, ...NO) && !has(t, ...YES) ? (p.no ? await p.no() : 'Okay.') : await p.yes();
      } else {
        ctx.pending = null;
        let done = false;
        for (const cmd of [...commands, ...common]) {
          const m = await cmd.match(t, text, ctx);
          if (m) { answer = await cmd.run(ctx, m, t, text); done = true; break; }
        }
        if (!done) {
          answer = `Sorry, I did not understand "${text.trim()}". ${help ? 'Try: ' + help : ''} Or say help.`;
        }
      }
    } catch (err) {
      answer = 'Sorry, something went wrong with that request: ' + err.message;
    }
    if (answer) reply(answer);
    // Keep logging for a moment: some replies arrive later (a comparison speaks after its tones).
    captureTimer = setTimeout(() => { capturing = false; }, 3000);
    if (conversation) listenAgainWhenQuiet();
  }

  // --- Listening ----------------------------------------------------------

  function setListening(on) {
    talkBtn.setAttribute('aria-pressed', String(on));
    talkBtn.textContent = on ? 'Listening… (V to stop)' : 'Talk to Terra (V)';
    statusEl.textContent = on ? 'Listening. Say what you want.' : '';
  }

  async function cue(kind) {
    if (!isStarted()) await startAudio();
    playCue(kind);
  }

  /** In built-in voice mode, listen again once Terra has finished talking. */
  function listenAgainWhenQuiet() {
    if (loadPrefs().voiceMode !== 'voice' || !Recognition) { conversation = false; return; }
    const started = performance.now();
    const check = () => {
      if (!conversation) return;
      const speaking = speechSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
      if ((speaking || isBusy() || performance.now() - started < 800) && performance.now() - started < 60000) {
        setTimeout(check, 250);
      } else {
        listen();
      }
    };
    setTimeout(check, 400);
  }

  async function listen() {
    if (rec) { rec.abort(); return; }
    if (!Recognition) {
      input.focus();
      reply('Voice input is not available in this browser. Type your request in the box and press Enter.');
      return;
    }
    stopSpeaking();
    stopTone();
    if (loadPrefs().voiceMode === 'voice') conversation = true;
    await cue('listenStart');
    rec = new Recognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      input.value = finalText || interim;
    };
    rec.onerror = (e) => {
      conversation = false;
      if (e.error === 'no-speech') reply('I did not hear anything. Press V to try again.');
      else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') reply('The microphone is blocked. Allow microphone access for this site, or type your request in the box.');
      else if (e.error === 'network') reply('Voice input needs an internet connection in this browser. You can type your request in the box instead.');
      else if (e.error !== 'aborted') reply('Voice input stopped: ' + e.error + '. You can type your request instead.');
    };
    rec.onend = () => {
      rec = null;
      setListening(false);
      cue('listenEnd');
      if (finalText.trim()) { input.value = ''; handle(finalText); }
    };
    setListening(true);
    try { rec.start(); } catch (err) { rec = null; setListening(false); }
  }

  talkBtn.addEventListener('click', listen);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    conversation = false;
    const text = input.value;
    input.value = '';
    handle(text);
  });

  // V anywhere on the page (except while typing in a field or a dialog is open).
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'v' && e.key !== 'V')) return;
    const tag = e.target.tagName;
    const typing = tag === 'TEXTAREA' || tag === 'SELECT' || (tag === 'INPUT' && !['checkbox', 'radio', 'range', 'button'].includes(e.target.type));
    if (typing || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    listen();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && rec) { conversation = false; rec.abort(); } });

  if (!Recognition) {
    talkBtn.textContent = 'Talk to Terra (V): type below in this browser';
    statusEl.textContent = 'Voice input is not available in this browser; type your request below.';
  }

  return { handle, heard, listen, ctx, get conversation() { return conversation; } };
}

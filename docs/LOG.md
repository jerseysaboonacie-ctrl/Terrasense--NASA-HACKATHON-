# TerraSense Jukebox: project log

One place to see what is done, what is left, and who is doing it.
Claude updates this file after every change it makes. Add your own entries in the
same format (newest first under **History**) and tick your tasks in **Your tasks**.

Status words: **Done** (built and tested), **Partly done** (some of it exists, see notes),
**Not started**, **Yours** (only a person can do it).

Last updated: 2026-11-15 16:20 (+07), session 13 finished.

---

## Heartbeat

Live progress, newest session first, newest line at the bottom of each session. Times are the
laptop's clock (+07). Each phase has an estimate; the heartbeat says when it actually started and finished.

### Session 13: 2026-11-15 late afternoon (finished)

**Report and request (from you):** Terra hears what she said herself (e.g. "the temperature near the Sea of Japan
is 29 °C") and that ruins the conversation. Ask straight away which data to explore and give the options; say the
starting point; read the summary when the cursor moves; never let Terra interrupt herself.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Read the log | 10 min | Done (15:14 to 15:20) |
| 2 | Microphone off while Terra talks; queued speech; map question first; starting point | 45 min | Done (15:20 to 15:50) |
| 3 | Tests (including two bugs they found), real echo test, docs, commit | 30 min | Done (15:50 to 16:20) |

- 15:14: Your log: after restarting Chrome the voice worked. Terra's own speech came back through the microphone
  (hundreds of word updates while she talked).
- 15:50: Now the microphone signal is switched off while Terra talks and for 0.9 s after; nothing heard then is
  taken. Speech waits its turn instead of cutting her off; the pointer reading waits too. The Gallery asks at
  once "Which map would you like to explore?"; each map opens with where you start, then a shorter guide.
- 16:05: Tests found two real bugs (a microphone opened mid-sentence was not paused; the status line could say
  "listening" while paused); fixed. Real speakers and microphone, Chrome set up like yours: 45 s of Terra
  talking, not one word reached the recognizer.
- 16:20: 375 of 375 Player checks, 85 of 85 page checks. Version 2026-11-15e.
- Not tested: your Chrome.

### Session 12: 2026-11-15 afternoon (finished)

**Report and request (from you):** Terra heard you but did not answer; no audio at all; bring back the voice and
narrate everything, including the panel on hover. When the site opens, explain first that a higher pitch means a
higher value (a guide to tell the values without the color key).

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Read the log; test Chrome's voice with the microphone open | 25 min | Done (13:58 to 14:15) |
| 2 | Voice recovery; sound unlock; listening guide; hover reads the panel; short replies | 45 min | Done (14:15 to 14:40) |
| 3 | Tests, run like your setup, docs, commit | 30 min | Done (14:40 to 15:10) |

- 13:58: Your log: Terra heard you (MacBook microphone) and answered "are you listening" twice, but the voice never
  started (no speech event at all). Six short phrases got no reply. The "no sound" warnings were false.
- 14:10: On this Mac, Chrome's voice works with the microphone open and after leaving a page mid-sentence. So your
  Chrome's voice was most likely stuck. It is the same voice as before (Samantha); nothing was changed in it.
- 14:40: Voice: reset and retry, then Google's voice, then "quit and reopen Chrome". Sound starts at once when
  arriving from the Gallery; otherwise a "Click anywhere or press any key" button. Each map opens with the
  listening guide (pitch rule, then the low, middle and high notes with values); G replays it. Hover narration is
  on by default and reads the panel: value, place, nearest country, continent. Short unknown phrases get a reply.
- 15:05: 374 of 374 Player checks, 85 of 85 page checks. Run in a visible Chrome set up like yours: voice spoke,
  guide started, sound on, hover read the country and continent. Version 2026-11-15d.
- Not tested: your Chrome. If it stays silent, quit Chrome (Cmd+Q) and reopen it.

### Session 11: 2026-11-15 afternoon (finished)

**Report (from you):** No narrator, and Terra cannot be heard, so you cannot tell whether the microphone works.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Read Terra's microphone log from your test; find the cause | 20 min | Done (13:24 to 13:35) |
| 2 | Terra chooses the microphone itself; level bar; narrator menu; voice test; speech in the log | 40 min | Done (13:35 to 13:50) |
| 3 | Reproduce your setup, test, docs, commit | 20 min | Done (13:50 to 14:00) |

- 13:24: Your log (13:22, your Chrome, version 2026-11-15b): microphone allowed and opened, recognition running,
  but only "no-speech" for over a minute: Chrome received no sound at all.
- 13:30: Cause: Chrome's microphone preference ranks "AirgoCast Audio (Virtual)" first (a screen-casting
  driver, installed in /Library/Audio/Plug-Ins/HAL). It sends silence. The Mac itself uses the built-in
  microphone (input volume 50) and speakers (56, not muted). Read only Chrome's microphone settings.
- 13:35: Built-in voice works in a normal Chrome on this Mac (Samantha). Your silent narrator is not
  explained yet: the saved setting may be "screen reader" (silent page), or Chrome's voice did not start.
- 13:50: Terra now opens the real microphone itself (never a virtual one) and gives it to the recognizer;
  Microphone menu and level bar; Narrator menu and "Test the voice" on every page; the log records whether
  speech starts. Reproduced your setup in a fresh profile: before, level 0 and no sound; now the built-in
  microphone, the bar moves, sound and speech reach the recognizer.
- 14:00: 370 of 370 Player checks, 85 of 85 page checks, recorded voices 11 of 12. Version 2026-11-15c.
- Not tested: your own Chrome after the fix.

### Session 10: 2026-11-15 midday (finished)

**Report and request (from you):** Terra still cannot hear anything. Opening the project from a link should go
to the Gallery, where Terra introduces itself and asks which of the four maps you want to explore.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Find out which copy of the site you run; make listening visible (status line, log) | 30 min | Done (11:36 to 11:45) |
| 2 | Start at the Gallery: introduction, voice question, map question, answer by voice | 40 min | Done (11:45 to 12:00) |
| 3 | Real microphone and recorded-voice runs; fix what they show; tests | 30 min | Done (12:00 to 12:25) |
| 4 | Docs, log, commit | 10 min | Done (12:30) |

- 11:36: You confirmed: http://localhost:8931 in Google Chrome. But the server logged no visits from you
  since 21:30 yesterday. It sent no cache rule, so Chrome could run an old copy of the JavaScript without
  asking. New `tools/serve.py` (same address) sends "no-cache"; the page shows "Terra version 2026-11-15b".
- 11:45: A "Microphone:" line under Terra's switch shows where listening has got to (off, listening, hearing
  sound, hearing speech, heard you, or the exact problem). The page also reports these events to
  `.terra-log.jsonl` via `tools/serve.py` (localhost only, counts only, never words), so I can read
  what happened on your machine afterwards.
- 12:00: Gallery start: `index.html` forwards link visits to the Gallery; Terra introduces itself, asks how to
  hear the site, then which map (1 to 4, or say "vegetation" / "number three"; works while Terra is still
  reading). Choosing a voice switches Terra's listening on, here and in the Player's first question.
- 12:10: Real microphone, visible Chrome: listening works (sound and speech reported). But the log showed a
  restart every 6 s in a quiet room, from yesterday's stall fix: someone starting to talk at that moment
  lost their first words. Now restarts happen only when Chrome hears speech but sends no words for 8 s.
- 12:25: Tests: 369 of 369 Player checks, 85 of 85 page checks (5 new for the Gallery start). Recorded voices
  through Google's recognizer: 25 of 27 in quiet; 9 of 18 with people talking underneath.
- Not tested: you speaking to Terra. Please try it; then I can read the microphone log.

### Session 9: 2026-11-15 morning (finished)

**Request (from you):** (1) Under the pointer, show the nearby country and the continent, not only latitude
and longitude. (2) Terra answers more questions, such as today's date, and moves you to another map
("the vegetation", "precipitation"). (3) On opening the site, Terra introduces itself and its features,
then asks: built-in voice, screen reader, or text only.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Continent per country (Natural Earth), panel rows "Nearest country" and "Continent" | 30 min | Done (11:00 to 11:12) |
| 2 | Terra: clock, map switching in many phrasings, list maps, explain a map, honest about the rest | 30 min | Done (11:12 to 11:17) |
| 3 | First visit: Terra's introduction, spoken on the first key press or tap | 25 min | Done (11:10 to 11:17) |
| 4 | Tests, screenshots, docs, log, commit | 30 min | Done (11:17 to 11:40) |

- 11:00: Started. Natural Earth has a continent per country; added it to `data/countries.json`
  (`tools/build_countries.py`). It files all of Russia under Europe, so Russia, Turkey, Egypt and
  Kazakhstan are split roughly by longitude (Siberia: Asia). Remote ocean territories get none.
- 11:12: Panel rows "Nearest country" ("In North Korea, near China.") and "Continent" ("Asia"; at sea the
  nearest land's, marked "(nearest land)"; far out "Open ocean"). Lookup 0.27 ms, once per screen frame.
- 11:16: Terra: "what's today's date" / "what time is it" (device clock; adds the map's own data date),
  "move me to the vegetation", "go to precipitation", "switch to air temperature", "rain", "what maps are
  there", "what is NDVI" (from a new `about` sentence per frame in `data/frames.json`), "introduce
  yourself", "start again", "how are you", and an honest answer for weather, news and other outside
  questions (no internet or AI service). Asked before the Player's own commands, so "go to the vegetation"
  is not mistaken for a place.
- 11:17: First visit: "Hi, I'm Terra" dialog with what the site does, how to tell Terra what to do (V, then
  examples), then the question. Browsers block speech until a key press or tap, so Terra speaks on the
  first key press or tap (1, 2, 3 still choose at once); choosing the built-in voice straight away makes
  Terra give the introduction then. `?welcome` shows it again (you already answered it in this browser).
- 11:35: Tests: 369 of 369 Player checks (new: panel places, clock, map list and explanation, honest
  answer, introduction, switching from five phrasings, the dialog's introduction and `?welcome`),
  80 of 80 page checks, 20 of 20 decoder self-tests. Screenshots at desktop and phone width.
- Not tested: hearing the spoken introduction yourself (speech is stubbed in the tests).

### Session 8: 2026-11-14 night (finished)

**Report (from you):** "It still doesn't listen."

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Find out what happens with a real button press, the real microphone and Chrome's real recognizer | 40 min | Done (20:01 to 20:15) |
| 2 | Feed Google's real recognizer recordings through a virtual microphone; run Terra's own code on it; fix | 45 min | Done (20:15 to 20:55) |
| 3 | The same with people talking underneath; fix; tests | 40 min | Done (20:40 to 21:22) |
| 4 | Voice test tool, docs, log, commit | 20 min | Done (21:30) |

- 20:01: Started. Your browser loaded the newest code at 19:59 (server log), so the fixes did reach you.
- 20:04: A visible Chrome with Terra talking through the speakers: the recognizer refused with "not-allowed".
  Traced to a test flag (`--use-fake-ui-for-media-stream`); with a normal "Allow" for the microphone it works.
- 20:10: Test phrases played through the speakers never reach recognition while room speech does: the Mac
  cancels its own speaker sound from the microphone. (Also why Terra does not hear itself.) So speaker
  playback cannot test Terra; a person's voice or a virtual microphone can. One printed line contained a
  few words of room speech; not kept, and the scripts now print only labels and word positions.
- 20:14: Chrome can listen to an audio track instead of the microphone. Fed 36 recordings ("Terra, …" in
  nine Mac voices) to Google's real recognizer: its first guess for "Terra" was usually "Tara", often
  "Sarah" or "Terror", sometimes "Jenna" or "a timer"; "Terra" was nearly always among the other guesses.
- 20:20: Terra's own code on that virtual microphone: 0 of 9. Chrome kept one growing "Hearing: …"
  phrase and never marked it final; Terra only acted on final phrases. Fix: Terra acts when the words stop
  changing, finds its name anywhere and as Chrome writes it, looks in all of Chrome's guesses.
- 20:28: 25 of 27 (the 2 misses: Google garbled the recording). With a realistic microphone hiss Chrome
  does finish phrases itself (~0.8 s after you stop), so in a quiet room the old code also answered.
- 20:45: With two people talking underneath (made-up text, Mac voices): old code 0 of 12. Chrome never ends
  the phrase while voices continue, and after ~25 s it stops sending anything while still looking on.
  This is the likely reason Terra "doesn't listen" in your room. Fixes: after its name (or "are you
  listening") Terra takes the request about 3 s later even if the room keeps talking; a fresh listening
  session after each request; restart when a phrase runs past 10 s or nothing arrives for 6 s.
- 21:05: With people talking underneath: 8 to 11 of 18 per run. Every miss was Google losing or garbling
  the request under the voices, not Terra ignoring words that arrived.
- 21:22: Tests: the test's stand-in recognizer now keeps a session's results like Chrome does (it used to
  send each phrase alone, which hid this). 5 new checks. 346 of 346 Player checks, 77 of 77 page checks.
- 21:30: `tools/terra_voice_test.py` (quiet: 27 of 27; `--talk 0.3` for people talking). Docs, commit.
- Not tested: a person speaking to Terra at the real microphone (needs you), Safari, Edge.

### Session 7: 2026-11-14 night (finished)

**Report (from you):** Terra still does not respond with a real microphone. Also: make sure the images are
updated with the latest data.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Real-microphone test: Chrome's real speech recognition, fed with real recorded speech through a fake microphone device (macOS "say" makes the recordings) | 40 min | Done (19:01 to 19:14) |
| 2 | Fix what it shows; a "Check the microphone" button that shows the sound level and each step, so any remaining problem is visible | 45 min | Done (19:14) |
| 3 | Latest data: an update tool that downloads NASA's newest frames, then refresh the frames and re-check them | 45 min | Done |
| 4 | Tests, docs, log, commit | 30 min | Done (19:34, commit 27b407d) |

- 19:01: Started. The earlier tests used a stand-in for speech recognition, which cannot show what goes wrong
  with a real microphone. This time the real recognizer is used.
- 19:14: What the real-microphone tests showed (Chrome's real speech recognition, your Mac's real microphone):
  - Chrome's recognition works on this Mac: it turns speech into text within a second or two.
  - Note: Chrome ignores the "fake microphone" sound file for speech recognition and uses the real
    microphone, so the first probe picked up people talking in the room. Nothing of it was kept or used.
    Later runs only counted what Terra heard and printed nothing of the room.
  - The real bug: the room is noisy, and Terra answered every bit of conversation it heard with a spoken
    "Sorry, I did not catch …". While saying that, it stopped listening, and restarting the listener took
    up to 4 s, so the actual question was lost. A casual "right" or "up" in someone's sentence also moved
    the map. Exactly what you saw: Terra seemed not to respond.
  - Fixes: (1) Terra stays quiet about anything that is not a request it knows (unless you start with
    "Terra"), and sentences over 8 words without "Terra" are treated as conversation; (2) Terra keeps
    listening while it talks, ignores its own voice, and a request starting with "Terra" interrupts it;
    (3) "move", "next" and "what is the value" need short, clear phrases; (4) a supported English variant
    for recognition (your browser's variant, e.g. en-TH, might not be), falling back to en-US; (5) after
    repeated unexplained errors Terra says so instead of failing silently; (6) "is Terra speaking" also
    trusts Chrome when it says speech has ended.
  - After the fixes, a 50 s real-microphone run in the noisy room: about 100 phrases of conversation heard,
    none answered, nothing moved, no errors. My test phrases played from the speakers were drowned out by
    the people near the microphone, so the last step (Terra answering a recognised request) could not be
    shown with real audio here; it is the same code the stand-in tests check, which pass (112 of 112).
  - New: "Check the microphone" button (and "Terra, check the microphone"): measures the sound level, then
    runs one recognition, and says and shows the result. Run on this Mac: "Sound: yes … Speech recognition:
    works. I heard: …".
- 19:34: Latest data done:
  - New `tools/update_frames.py` (with a curl fallback: the Mac's built-in Python is too old for NASA's
    server). Sea surface temperature: NASA's image of 2026-11-13, and for the first time a real data date,
    12 Nov 2026, read from NASA's dated copy of the same image (map pixels match). Precipitation: image of
    2026-11-14, data time 06:30 from NASA's date overlay (time zone not stated). Vegetation: NASA's file is
    unchanged. Air temperature: NASA has no newer version of this preview.
  - The new sea temperature image checked against the real data for 12 Nov: median error 0.70 °C, worst
    2.83 °C, all 335 points within one legend step. The How it works table keeps the 5 Nov image it was
    checked on (frames/sst/frame-2026-11-05.jpg).
  - The new precipitation data showed that "Go to lightest" could land on a middling value; Go to now stands
    near the top (warmest) or bottom (coolest) of the area. Every frame: nothing decodes beyond it.
  - Tests: 341 of 341 Player checks, 77 of 77 page checks, 20 of 20 decoder self-tests. Committed 27b407d.

### Session 6: 2026-11-14 evening (finished)

**Report (from you):** Terra still does not listen and respond, e.g. asking "are you still listening?" or calling
its name to ask a question gets no answer.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Find the causes | 15 min | Done |
| 2 | Fix: Terra always answers out loud; its own speaking state; long answers; its name; "are you listening?"; show what it heard | 50 min | Done |
| 3 | Tests (stand-in microphone and speech), docs, log, commit | 35 min | Done (18:47) |

- 18:27: Causes found in the code:
  1. Terra's answers follow the Voice setting. On "Screen reader" (the default, or answer 2 to the first
     question) they go only to the hidden screen-reader region: without a screen reader running, nothing is
     heard. This alone makes Terra seem deaf. Fix: Terra answers out loud with the built-in voice whenever
     you talk to it, or while it is switched on (a setting, on by default; screen reader users can turn it off).
  2. Terra pauses listening while Chrome reports "speaking". Chrome can get stuck reporting that (a known
     bug), and then Terra never listens again and drops everything it hears without a word. Fix: Terra keeps
     its own record of when it is talking, from the start and end of each sentence, with a time limit.
  3. Chrome stops built-in speech after about 15 s (another known bug), cutting off long answers such as the
     Summary. Fix: long answers are spoken sentence by sentence.
  4. Its name: "Terra, are you still listening?" did not match any request, and a leading "Terra" was only
     removed when the wake word setting was on. Fix: "Terra", "hey Terra" and "OK Terra" at the start are
     always understood; "Terra" alone answers "Yes? I'm listening."; "are you (still) listening", "can you
     hear me", "are you there" get "Yes, I'm listening."
  Also: a line under the switch shows what Terra heard, so you can see whether the microphone works.
- 18:47: All fixed and committed (54c51c5). Found two more on the way:
  5. Switching frame reloaded the Player, and a freshly loaded page may not speak until a key press or tap
     (browser rule), so after "open the rain map" Terra listened but could not answer out loud. Fix: frames
     now switch inside the Player page (Frame menu and Terra). From other pages a reload cannot be avoided,
     so Terra says (through the screen reader channel and a note) to press a key or tap once.
  6. Your exact example, "Terra, are you still listening?", was thrown away as an echo: Terra's own
     "Terra is listening ... say stop listening" message was remembered as its words (by mistake), and the
     echo rule was too eager. Fix: that message is no longer remembered, and an echo now needs 6+ words
     with 70% overlap.
  Tests (stand-in microphone and voice): 338 of 338 Player checks, 77 of 77 page checks. Not tested: a real
  microphone and real speech recognition.

### Session 5: 2026-11-14 evening (finished)

**Task (from you):** Terra listens through the microphone, works in the Player, and can be switched on and off,
so that while it is on it hears you and answers whenever you speak.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Terra on/off switch: continuous listening while on, restarts by itself, answers every request | 45 min | Done |
| 2 | Safety: Terra must not answer its own voice or the screen reader; optional wake word "Terra"; clear microphone errors | 30 min | Done |
| 3 | Player: the switch is always visible in the Player's top bar; stays on when Terra opens another page | 20 min | Done |
| 4 | Tests with a simulated microphone, docs, log, commit | 40 min | Done |

Total estimate: about 2 hours 15 minutes. Actual: finished 18:14 (laptop clock).

- 18:01: Started. Today V listens for one request only; the change makes V (and a button) a switch.
- 18:14: Done and committed (b20781f).
  - V, or the "Terra listening" switch (in Start here and in the Player's top bar), turns Terra on and off.
    While on, Terra keeps listening and answers every request; it restarts by itself when the browser
    ends a listening session; "stop listening" or V switches it off.
  - Terra must not answer itself: it pauses while the built-in voice talks and ignores what sounds like its
    own last answers. Optional wake word ("Only answer when I start with Terra") for noisy rooms or a
    screen reader on speakers.
  - Stays on when it opens another page in the same tab.
  - Found by the screen-reader simulation: when Chrome asked for microphone permission, Terra said
    nothing, and the permission bubble is easy to miss without sight. Now it says "Your browser is asking
    to use the microphone. Choose Allow." and, if blocked, how to allow it.
  - Tests use a stand-in microphone (headless Chrome has none): 10 new checks; 330 of 330 Player checks,
    77 of 77 page checks.
  - Not tested: a real microphone, recognition accuracy, room noise.

### Session 4: 2026-11-14 evening (finished)

**Task (from you):** simulate a screen reader as well as possible, find problems, fix them, and explain the
intended solution for each.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Build a screen-reader simulator: Chrome's accessibility tree (what VoiceOver and NVDA read), Tab order, and every live announcement | 40 min | Done (17:15 to 17:20) |
| 2 | Use every page as a blind user would and record what is heard | 30 min | Done (17:20) |
| 3 | List the problems and the intended solution for each | 20 min | Done (17:20) |
| 4 | Fix them | 40 min | Done (17:20 to 17:30) |
| 5 | Re-run the simulation and all tests, docs, log, commit | 40 min | Done (17:30 to 17:40) |

Total estimate: about 2 hours 50 minutes. Actual: finished 17:40 (laptop clock).

- 17:15: Started.
- 17:20: Simulator built (`tools/sr_sim.py`) and run on all six pages (first visit, browse mode, Tab, map keys,
  Terra by typing, errors). What works: one h1 per page, landmarks, the skip link, the first question is a
  proper modal dialog (only its 3 choices are reachable), every map key gives a polite announcement that
  matches the panel, the help dialog returns focus to the map, Terra's typed answers are announced.
  Problems found, each with the intended solution:
  1. Holding an arrow key (or pressing it quickly) queues one announcement per step; the user hears places
     they already left, for seconds. Solution: the tone still follows every step instantly, but speech
     waits until the keys stop (about 0.35 s), then says only where you ended up.
  2. Every step repeats "Sea surface temperature:". Solution: while you keep moving with the keys, steps say
     only value and place; the variable name comes back after a 5 s pause (Normal detail only).
  3. Pressing an arrow at the edge again repeats the whole edge sentence. Solution: the first time says
     "Edge of the map, left side, west. …"; further presses at the same edge say just "Edge." with the bump.
  4. Tabbing onto the map reads about 90 words (label plus two paragraphs) every time. Solution: short name
     "Map: Sea Surface Temperature" and short description "Arrow keys explore. W says where you are.
     Question mark lists every key." The layout text stays on screen, in the intro and in the tour.
  5. After answering the first question, focus goes nowhere (to the page body), so a screen reader user is
     lost. Solution: move focus to the page's main heading, so reading continues from the top of the content.
  6. The volume number is an <output>, which browsers treat as a live region, so changing the volume would
     be announced twice ("40%" and "Volume 40 percent"). Solution: hide the visual number from screen
     readers; the slider itself says "40 percent".
  7. A wrong frame address shows the error as an alert during page load, when screen readers are busy reading
     the page and may skip it; the title still says "Jukebox Player". Solution: the title and heading become
     "Frame not found", and the alert is set half a second after load.
  8. Letter keys (V, T, D, M, S, B, C) are also screen-reader quick-navigation keys in browse mode (NVDA:
     T table, D landmark, B button, V visited link...), so outside the map they may never reach the page.
     Solution: keep them on the map (it passes keys through), and give Talk to Terra and Where am I access
     keys (Alt+Shift+V, Alt+Shift+W in Chrome on Windows), which work in browse mode. Documented.
  9. The opening message says "Tab to the map", but the map is 20 Tab stops down. Solution: say "use the
     Skip to the map link at the top", which is one step.
  10. Announcements stay in the hidden live region, so browsing to the end of the page reads a stale message.
     Solution: clear the live region 6 s after each announcement.
  11. "LAST ANNOUNCEMENT" is uppercase by CSS, which some screen readers spell out. Solution: normal case.
  12. Terra's instructions (35 words) are read before every page's content. Solution: shorten to one line.
  Phase 4 (fixes) started.
- 17:30: All 12 fixed. Re-running the simulation found two more, both fixed:
  13. Short and compact sentences started in lower case after a full stop ("west. about 31 °C").
      Solution: they start with a capital ("west. About 31 °C"), a sentence cue for screen readers.
  14. My fix for problem 3 remembered the edge when the key was pressed, so after fast presses into the
      edge the first thing said was "Edge." and the full sentence was never heard. Solution: remember the
      edge only when its sentence is actually spoken. Added a test for it.
  After the fixes, the simulation hears: 14 fast presses give 2 announcements (was 14); "Edge of the map,
  left side, west." once, then "Edge."; the map announces as "Map: Sea Surface Temperature" with a 12-word
  description (was about 90 words); focus lands on the main heading after the first question; the error page
  title is "Frame not found" and the alert is heard; nothing stale at the end of the page.
  Phase 5 started: full test run.
- 17:40: One check compared the Value field ("about 27 °C") with the narration, which now starts with a capital
  ("About 27 °C"); made that comparison ignore case. Final: 320 of 320 Player checks, 77 of 77 page checks.
  Committed. Docs: README (simulator), Accessibility page (access keys, fast arrow keys), verification.md
  section 11. Still needs a person: VoiceOver, NVDA and TalkBack, which the simulator cannot reproduce
  (browse-mode keys, speech timing, verbosity).

### Session 3: 2026-11-14 afternoon (finished)

**Task (from you):** (1) "Where am I" by tapping the map 5 times on a phone, listed with the keys;
"you are here" also names a nearby country, e.g. "south-west of Israel". (2) When the site opens, first ask:
built-in voice, off, or "I already have a screen reader". (3) A voice assistant, like Jarvis, that a blind
person can simply tell what they want, with back-and-forth conversation.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Country borders (offline, public domain) and "near a country" wording in Where am I | 40 min | Done (16:26 to 16:30; tested in phase 6) |
| 2 | Five taps on the map = Where am I; added to the key tables | 15 min | Done (16:30; tested in phase 6) |
| 3 | First-visit question on every page: built-in voice / screen reader / off | 30 min | Done (code; tested in phase 6) |
| 4 | Assistant core: talk (speech recognition) or type, conversation log, back-and-forth | 60 min | Done (code; tested in phase 6) |
| 5 | Assistant commands: Player (where, go to a country, warmest, compare, scan, volume, frames...) and other pages | 60 min | Done (code; tested in phase 6) |
| 6 | Tests, docs, log, commit | 45 min | Done (16:34 to 16:46) |

Total estimate: about 4 hours 10 minutes, finishing around 20:40. Actual: finished 16:46 (laptop clock).

- 16:26: Started. Downloaded Natural Earth 1:50m country borders (public domain) for the
  country names; checking how to make them small enough to load quickly and work offline.
- 16:30: Phases 1 and 2 written. `tools/build_countries.py` keeps 242 countries with borders rounded to
  about 1 km: `data/countries.json`, 1.1 MB (427 KB compressed), loaded only the first time it is needed.
  Where am I now ends with e.g. "In Egypt.", "In Egypt, near Israel.", "About 60 km west of Israel." or
  "Just off the coast of Israel." Five quick taps in one spot on a touch screen = Where am I; added to
  both key tables. Phase 3 started.
- 16:34: Phases 3 to 5 written.
  - First visit, on any page: a dialog asks "How would you like to hear this site?" with three big buttons
    (1 built-in voice, 2 I already use a screen reader, 3 text only). A screen reader reads it; anyone else
    can press any key or tap to hear it read aloud (browsers only allow speech after a key or tap).
    Asked once; Escape keeps screen reader mode.
  - Terra, the assistant, on every page (V key or "Talk to Terra"; typing works too). In the Player:
    where am I, take me to a country, sea or coordinates, the temperature in a place, warmest, next,
    coolest, compare two places, summary (then asks "Would you like me to take you to the warmest?"),
    scan, move north a bit, volume, mute, detail, speed, tour, demo, explain, what am I looking at.
    Everywhere: open a page or a map, read this page (with "continue"), change voice, repeat, help, goodbye.
    In built-in voice mode it listens again after each answer, so you can go back and forth.
  - Decision: Terra understands a fixed set of requests (no AI service). A real AI model would need an
    API key and a server, which this static site does not have; the brief forbids keys in the code.
  Phase 6 (tests) started.
- 16:46: Tests. First full run: everything passed except Terra's tests, which could not start (my test loaded the
  place code from the wrong folder). Fixed in the site code: `places.js` now finds its data relative to itself.
  Then 2 real problems on all four maps: "use the built-in voice" did nothing (typed and spoken text says
  "built-in" with a hyphen; Terra only knew "built in"), fixed; and a test that looked for a log line that had
  already scrolled out of the 30-line log, fixed in the test.
  Final: 302 of 302 Player checks, 77 of 77 page checks. Your Israel example: "About 100 km west of Israel."
  Committed as 458e64d. Docs: Accessibility page (first question, Terra, five taps and the screen-reader
  caveat on phones), README, Credits (Natural Earth), verification.md section 10.
  Not tested by me: talking to Terra with a real microphone, the back-and-forth listening, accents,
  real screen readers and phones.

### Session 2: 2026-11-14 morning (finished)

**Task (from you):** apply the remaining changes: sound cues, display settings, Demo mode,
the 10-point table on How it works, and the wording fixes.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Wording: one spelling of "color", legend readout shows the matched range, honest SST date | 25 min | Done (10:06 to 10:08) |
| 2 | Sound cues: scan start and end chimes, jump chime, A/B ticks, tone fades after about 1 s of stillness | 40 min | Done (code; tested in phase 6) |
| 3 | Display settings: high contrast, large text, reduced motion (remembered, in Reset) | 30 min | Done (code; tested in phase 6) |
| 4 | Demo mode: 60-second guided run with Stop | 40 min | Done (code; tested in phase 6) |
| 5 | 10-point accuracy table on How it works | 20 min | Done (code; tested in phase 6) |
| 6 | Tests for everything new, all tests re-run, docs, log, commit | 35 min | Done (10:11 to 10:51) |

Total estimate: about 3 hours 10 minutes, finishing around 13:15. Actual: finished 10:51, well inside the estimate.

- 10:06: Started. Plan and estimates written above.
- 10:08: Phase 1 done. "color" is now the only spelling (175 replacements in pages, code, tools and docs;
  code names renamed with them). The readout's legend line now says where the color sits on NASA's bar,
  e.g. "between the 25 and 30 °C marks" (it said "matched legend color"). The sea temperature date now reads
  "Data date not stated (image updated 2026-11-05)" everywhere. Phase 2 started.
- 10:11: Phases 2 to 5 written:
  - Sound cues: two rising notes when a scan starts, falling when it ends or is stopped; a short high note on
    Go to; one tick for A, two for B. A hovered or touched tone now fades after 1 s of stillness.
  - Display: High contrast, Large text, Reduce motion. They apply on every page (`js/display.js`), are
    remembered, are in Reset, and are on both the Player and the Accessibility page.
  - Demo (D key or button): one minute of tones, an equator scan, Go to warmest, Go to coolest, Compare
    and Summary, using the same functions as the buttons. Escape or Stop demo ends it.
  - How it works: the ten-point table. Each pixel is decoded live by the Player's own code and compared with
    the real MUR value stored with its source in `data/accuracy.json`.
  Phase 6 (tests) started.
- 10:22: Page tests: 73 of 73 pass (new: the ten-point table builds live, 10 of 10 within one legend step,
  2 correctly no data; a display switch on the Accessibility page applies on Home too). Screenshot of
  How it works checked; added a line explaining why its largest difference (2.0 °C) differs from the
  336-point check (1.8 °C). First Player run hit the runner's 590 s limit with no results, so I made the
  test page record a thrown error as a failure and always post, and re-ran it with 1100 s.
- 10:49: The re-run timed out too, with no checks recorded at all. Chrome's console showed why: a mistake in
  my new test code (a variable named twice), so the test page never started. The site itself was not at
  fault. Fixed; the test page now also posts its progress after every check. Re-running.
- 10:51: All tests pass: 214 of 214 Player checks (29 new), 73 of 73 page checks, 20 of 20 decoder self-tests.
  The full one-minute demo ran to the end (60.5 s). Committed as fdd5c0d. Docs updated: README,
  Accessibility page, How it works, verification.md section 9.
  Not tested by me (needs you): how the cues and the demo sound to a person, high contrast for a
  low-vision user, a real screen reader, a real phone.

### Session 1: 2026-11-13 evening (finished)

**Task (2026-11-13, from you):** make sure every feature works as expected and that the site is
easy to navigate for a blind person.

| Phase | What | Estimate | Status |
|---|---|---|---|
| 1 | Audit: run all automated tests, check every page for headings, landmarks, labels, focus order and live regions; list problems | 20 min | Done (21:08 to 21:10) |
| 2 | Player navigation for blind users: Voice mode switch, reading order, opening message, Where am I, edges, volume announcements, error announcements, settings remembered | 60 min | Done (21:10 to 22:08) |
| 3 | Tour (T key) and "how this map is laid out" message | 30 min | Done (written during phase 2, tested in phase 4) |
| 4 | Tests for everything new, re-run all tests, fix failures | 30 min | Done (22:08 to 22:55) |
| 5 | Update docs, this log, commit | 15 min | Done (22:55 to 23:08) |

Total estimate: about 2.5 hours, finishing around 23:45. Actual: 2 hours, finished 23:08.

- 21:08: Started. Plan and estimates written above.
- 21:10: Phase 1 done. Baseline: 109 of 109 Player checks pass, 20 of 20 decoder self-tests pass.
  Every page has one h1, a main landmark, a skip link and labelled navigation. Problems found
  for a blind user, all on the Player:
  1. Two narration checkboxes can both be on, so a screen reader and the built-in voice talk at once.
  2. The map comes first; the Summary and voice settings are far down the page.
  3. Nothing tells you the page is ready or how the map is laid out.
  4. No way to ask "where am I?" without moving.
  5. At the map edge the arrow keys silently stop; you can't tell you hit the edge.
  6. Volume changes are read as a bare number; no volume keys while on the map.
  7. Errors (frame failed to load, sound failed) go to a polite status, not an alert.
  8. Moving the mouse announces after every 0.6 s pause (the plan wants this off by default); lifting a finger after a drag says nothing.
  9. Settings are forgotten on reload; no Reset.
  10. No way to change frame without going back to the gallery.
  11. No guided tour.
  Phase 2 started.
- 22:08: Phase 2 code written: Voice mode switch (Screen reader / Built-in voice / Off, only one voice at a time),
  "Start here" section before the map, opening message, Where am I (W), edge announcement with a bump,
  volume keys (minus, plus) that say the level, errors in an alert region with an error tone, detail levels,
  mouse movement not announced by default (touch reads the value when the finger lifts), frame menu,
  settings remembered with a Reset button. Tour (T) also written (phase 3, started early). Writing tests (phase 4).
- 22:08: Phase 4: first full run, 185 checks, 1 failed. Real bug: on a slow first load the
  "Player ready" message arrived after the user's first key press and replaced the value they asked for.
  Fixed: the opening message is skipped if anything was already announced.
- 22:47: Re-run: 185 of 185 Player checks pass. New page test (`tests/pages-test.html`): 70 of 70 pass
  on all six pages. Read the evidence for each new check to be sure they test something real.
- 22:55: Screenshots at laptop and phone width look right. Measured every page at 390 px: no sideways scrolling.
- 23:07: Committed as 3c29d96. Docs updated: README, Accessibility page, verification.md section 8.
- 23:08: Session finished. Not tested by me (needs you): a real screen reader, real speech, touch on a real phone.

---

## Status board (Upgrade plan, 13 Nov)

### Tier 1: must do

| Item | Owner | Status | Notes |
|---|---|---|---|
| Narration for every action, with a Voice mode switch | Claude | Done (simulated) | 2026-11-13, commit 3c29d96. Voice switch (Screen reader / Built-in voice / Off, one voice at a time), opening message, Where am I (W), edges, volume keys, errors in an alert region, detail levels, mouse moves not announced by default, touch reads on lift. Not done: announcing a frame change inside the page (changing frame reloads the page, which then gives the opening message). Needs a real screen reader test. |
| Summary, Go to warmest, Go to coolest, Next warmest, Compare | Claude | Done | 2026-11-13. All facts computed from decoded values. 109 automated checks pass. SST summary checked against real MUR data (docs/verification.md, section 7). Still to do by a person: check the Summary against the picture by eye. |
| First-time guide read aloud (Tour, T key) | Claude | Done (simulated) | 2026-11-13, commit 3c29d96. Six steps; layout text built from frames.json and shown under the map. Wording not yet checked by a blind listener. |
| Sound cues for land, edges and no data | Claude | Done (simulated) | 2026-11-14, commit fdd5c0d. Click for no data, edge bump, error tone, scan start/end chimes, jump note, A/B ticks, fade after 1 s of stillness, Sound cues on/off. Cue sounds were counted by the tests, not judged by ear. |
| Accuracy check shown on How it works | Claude + you | Done for SST; by eye is yours | 2026-11-14: ten-point table decoded live and compared with MUR (10 of 10 within one legend step, worst 2.0 °C), plus 2 no-data rows. The "by eye" column still needs a person (see Your tasks). |
| Test with a real screen reader | Yours | Not started | See Your tasks. Nothing has been tried with VoiceOver, NVDA or TalkBack yet. |

### Tier 2: do next

| Item | Owner | Status | Notes |
|---|---|---|---|
| Settings panel (speech speed, detail level, high contrast, large text, reduced motion), remembered, Reset button | Claude | Done (simulated) | Voice, speech speed, detail, volume, sound cues, mouse announcements (2026-11-13); high contrast, large text, reduced motion on every page (2026-11-14). All remembered; Reset clears them. |
| 60-second Demo mode with Stop | Claude | Done (simulated) | 2026-11-14: D key or button. Tones, equator scan, warmest, coolest, compare, summary; Escape or Stop demo. Full run tested on SST; start and stop on all four frames. |
| Two more frames with checked legends | Claude + you | Not started | Candidates found on 2026-11-05, both from the same SVS gallery: SST Anomaly (SVS 5176) and GEOS-FP Near-Surface Wind Speed (SVS 5148). The wind legend is transparent below about 4 m/s, which needs care. Each needs its 10-point check. |
| Wording: one spelling of color | Claude | Done | 2026-11-14: "color" everywhere (pages, code, tools, docs). |
| Wording: legend readout shows the matched range | Claude | Done | 2026-11-14: "On the legend: between the 25 and 30 °C marks" (printed tick marks); a class for precipitation; percent from Low to High for NDVI. |
| Quotes from blind or low-vision testers, with consent | Yours | Not started | |

### Tier 3: only if ahead

| Item | Owner | Status | Notes |
|---|---|---|---|
| Date stepping | Claude | Not started | Blocked: SVS does not list its daily frames, so we have one date per frame. |
| Thai language option | Claude + you | Not started | Needs a Thai speaker to check wording, and a Thai voice on the demo laptop. |
| Teacher mode | Claude | Not started | |

### Always

| Item | Owner | Status | Notes |
|---|---|---|---|
| Demo runs with no internet | Claude + you | Partly done | All frames, scripts and styles are local; no CDN, fonts or API calls. It still needs a local server (`python3 -m http.server 8931`). Not yet tried with Wi-Fi switched off. |
| Backup screen recording | Yours | Not started | |

### Other open issues found while reviewing the plan

| Issue | Owner | Status | Notes |
|---|---|---|---|
| SST date is the image's update date, not the data date | Claude | Fixed | The site says "Most recent frame on 2026-11-05". The image has no data date. It fits the MUR analysis for 2026-11-04 slightly better, but we cannot claim that. Fixed 2026-11-14: "Data date not stated (image updated 2026-11-05)". |
| Player reading order differs from the plan | Claude | Fixed | 2026-11-13: title, Start here (voice, tour, summary, where am I, frame), map, readout, find and compare, controls, legends. Controls stay after the map, so the map is reached sooner. |
| Navigation on a coarse grid with row/column, and two sliders for phones | Claude | Not started | Today the arrow keys move 1% of the map width per press. |
| Feedback contact on the Accessibility page | Yours | Open | Needs an email address or form link. |
| Official challenge text | Yours | Open | Could not be found online; read it at the event and tell Claude what differs. |

---

## Your tasks

Tick these as you go and add a line under History with what you found.

- [ ] Screen reader test (about 20 min): VoiceOver (Mac: Cmd + F5), NVDA (Windows) or TalkBack (Android). Eyes closed: open the Player, take the tour (T), get the summary, jump to the warmest area, press W, walk into an edge, compare two places, change volume with minus and plus, mute, change frame. Try each Voice setting once. Note where you got lost, heard nothing, or heard two voices, and whether the letter keys reached the page.
- [ ] By-eye check: open `decoder-test.html?frame=sst&fill=1` (then `t2m`, `ndvi`, `precip`), type the value you read from the colorbar for each row, and paste the Markdown export into `docs/accuracy-check.md`.
- [ ] Check the Summary against the picture for each frame (does the "warmest" place look warmest?).
- [ ] After session 13 (2 min): reload (Cmd+Shift+R), version 2026-11-15e; answer the map question; wait for Terra to finish, then ask "where am I"; hover; tell Claude "check the log".
- [ ] After session 12 (2 min): quit Chrome completely (Cmd+Q) and reopen it, open http://localhost:8931, press 1, then 3: you should hear the vegetation guide. Hover over the map. Then tell Claude "check the log".
- [ ] After session 11 (2 min): reload with Cmd+Shift+R, check Terra's panel says version 2026-11-15c, set Narrator to Built-in voice, press Test the voice, switch Terra on and watch the level bar while you talk, then tell Claude "check the log".
- [ ] Talk to Terra after session 10 (2 min): reload http://localhost:8931 in Chrome (Cmd+Shift+R), answer the two questions, say "vegetation". Then tell Claude "check the log": the microphone log shows what Terra heard (counts only).
- [ ] Hear Terra's introduction (1 min): open http://localhost:8931/?welcome in Chrome, press any letter key, listen, then press 1, 2 or 3. Tell Claude if it is too long.
- [ ] Press "Check the microphone" in the Player (Chrome) and tell Claude exactly what it says.
- [ ] Talk to Terra (about 2 min, Chrome at http://localhost:8931/player.html): press V, wait for "Terra is listening", then say "Terra, are you still listening?" and pause. If nothing happens, read Claude the line under the switch ("Hearing: …" or "Heard: …").
- [ ] Before the demo: run `python3 tools/update_frames.py`, read the two date images it mentions, run the tests, commit.
- [ ] Talk to Terra with a real microphone in Chrome (press V once to switch it on, then just talk; with headphones, and once without): try "where am I", "take me to Japan", "compare Brazil and Norway", "summary" then "yes", "open the rain map". Note what it misheard or did not understand, and send me the exact words so I can add them.
- [ ] On a phone with TalkBack or VoiceOver on: does the first question read well, and can you reach "Talk to Terra" and "Where am I?"
- [ ] Listen to the Demo (press D) and the sound cues with headphones: are the chimes and ticks clear, not annoying? Try High contrast and Large text.
- [ ] Test on a real phone with headphones: drag on the map, sound start, volume.
- [ ] Test in a second browser (Safari or Firefox).
- [ ] Try the demo with Wi-Fi off on the demo laptop.
- [ ] Record a backup screen recording of the demo.
- [ ] Test with a blind or low-vision person or a teacher (10 to 15 min); ask which voice mode and detail level they prefer; ask permission for a quote.
- [ ] Give Claude a feedback email or form link for the Accessibility page.
- [ ] Read the official challenge page and its resources.

---

## History

Newest first. Claude's entries name the commit so you can see exactly what changed.

### 2026-11-15: No echo, no interrupting, map question first (Claude, commit 1fa2504)
- Microphone off while Terra talks; speech queued, never cut off; Gallery asks which map at once; the map opens
  with the starting point. 375 of 375 Player checks, 85 of 85 page checks.

### 2026-11-15: Listening guide, sound unlock, hover reads the panel, voice recovery (Claude, commit 2696a03)
- Each map opens with the pitch guide and its low, middle and high notes; hover reads value, place, country,
  continent; Terra answers short phrases; voice retries. 374 of 374 Player checks, 85 of 85 page checks.

### 2026-11-15: Terra listens to the real microphone, not a silent virtual one (Claude, commit 257a7f1)
- Chrome preferred "AirgoCast Audio (Virtual)"; Terra now picks the microphone itself. Level bar, Microphone
  and Narrator menus, Test the voice, speech in the log. 370 of 370 Player checks, 85 of 85 page checks.

### 2026-11-15: Start at the Gallery; Terra's microphone made visible (Claude, commit 96b3e4b)
- Link visits go to the Gallery: Terra introduces itself, asks how to hear the site and which map; answer
  by voice. `tools/serve.py` (no-cache, microphone log); "Microphone:" status line; no restarts in quiet moments.
- Tests: 369 of 369 Player checks, 85 of 85 page checks.

### 2026-11-15: Country and continent under the pointer; Terra's date, map switching, introduction (Claude, commit b70c526)
- Panel: "Nearest country" and "Continent". Terra: today's date and time, "move me to the vegetation",
  "what maps are there", "what is NDVI", honest about outside questions. First visit: Terra introduces itself.
- Tests: 369 of 369 Player checks, 80 of 80 page checks, 20 of 20 decoder self-tests.

### 2026-11-14: Terra answers with people talking nearby (Claude, commit 35d2919)
- Found with Google's real recognizer on recorded requests: Terra waited for Chrome to finish a phrase,
  which with people talking never happens, and Chrome's recognizer then stalls. Now Terra answers when the
  words stop, or shortly after its name; restarts stalled sessions; knows "Tara", "Sarah", "Terror".
- `tools/terra_voice_test.py`. Tests: 346 of 346 Player checks, 77 of 77 page checks.

### 2026-11-14: Terra with a real microphone; newest NASA frames (Claude, commit 27b407d)
- Real-microphone tests found why Terra seemed deaf in a busy room; fixed. New "Check the microphone".
- `tools/update_frames.py`; SST now data for 12 Nov 2026, precipitation 2026-11-14 06:30.
- Tests: 341 of 341 Player checks, 77 of 77 page checks.

### 2026-11-14: Terra answers out loud and understands its name (Claude, commit 54c51c5)
- Fixes your report that Terra did not listen or respond; six causes found and fixed (see session 6).
- Tests: 338 of 338 Player checks, 77 of 77 page checks.

### 2026-11-14: Terra on/off with continuous listening (Claude, commit b20781f)
- V or the "Terra listening" switch turns Terra on and off; while on it answers whenever you speak.
- Tests: 330 of 330 Player checks, 77 of 77 page checks (with a stand-in microphone).

### 2026-11-14: Screen-reader simulation and fixes (Claude, commit 98a17b6)
- New `tools/sr_sim.py`. It found 14 problems; all fixed (see session 4 above for each problem and solution).
- Tests: 320 of 320 Player checks, 77 of 77 page checks.

### 2026-11-14: Terra, first-visit question, countries in Where am I (Claude, commit 458e64d)
- Terra, the voice assistant (V, on every page; speak or type), with follow-up questions and back-and-forth
  listening in built-in voice mode. A fixed set of requests, not an AI service (no API key or server).
- First visit: "How would you like to hear this site?" (built-in voice, screen reader, text only).
- Where am I names the nearest country; five quick taps on the map = Where am I.
- Tests: 302 of 302 Player checks, 77 of 77 page checks.
- Not tested: real microphone and speech recognition, real screen readers, phones, people.

### 2026-11-14: Sound cues, display, demo, accuracy table, wording (Claude, commit fdd5c0d)
- Sound cues (scan chimes, jump, A/B ticks, still-fade), High contrast / Large text / Reduce motion on every page,
  one-minute Demo (D), live ten-point table on How it works, "color" spelling, legend line, honest SST date.
- Tests: 214 of 214 Player checks, 73 of 73 page checks, 20 of 20 decoder self-tests.
- A mistake in my own test code stopped the test page from starting; found from Chrome's console and fixed.
- Not tested: real screen readers, phones, other browsers, people; how the cues sound to a listener.

### 2026-11-13: Navigation for blind users (Claude, commit 3c29d96)
- Voice switch, Start here section before the map, opening message, Where am I, tour, edge bump and announcement,
  volume keys, alert region for errors, detail levels, settings remembered with Reset, frame menu.
- Tests: 185 of 185 Player checks (76 new), 70 of 70 page checks (new `tests/pages-test.html`), 20 of 20 decoder self-tests.
- Bug found and fixed by the tests: the opening message could replace the user's first announcement.
- Not tested: real screen readers, real speech, touch on a real phone, other browsers, people.

### 2026-11-13: Upgrade plan received (Claude)
- Created this log and filled in the status board against the upgrade plan.
- Nothing in the site changed in this step.

### 2026-11-13: Summary, Go to, Compare (Claude, commit 776988e)
- Added Summary, Go to warmest, Next warmest, Go to coolest and Compare (keys A, B, C).
- Every announcement now goes through one function: the same text appears in the panel's "Last announcement" line and the polite live region.
- Tests: 109 automated Player checks pass (32 new). SST summary against MUR: warmest point decoded about 32 °C vs MUR 31.45 °C; coolest about −2 °C vs −1.8 °C.
- Not tested: real screen readers, phones, other browsers, people.

### 2026-11-12: Local server restarted (Claude)
- The site would not open because the local server had stopped with the previous session. Restarted it on port 8931.

### 2026-11-06: Player with sound (Claude, commit c3e875f)
- Built the audio engine, the Player (pointer, keyboard, scan, reference tones, Explain this sound), narration, Home sound check, audio test page, How it works and Accessibility pages.
- Tests: 77 automated Player checks pass.

### 2026-11-05: Decoder and validation (Claude, commits ce05d93 and 110fa39)
- Chose four frames from the SVS Daily Visualizations gallery and measured their legends from NASA's colorbars.
- Built the six-page skeleton, the gallery and credits from `data/frames.json`, and the decoder with its test page.
- Validated SST against real MUR data: median error 0.7 °C, worst 1.8 °C over 336 points; ten-point table in `docs/accuracy-check.md`.

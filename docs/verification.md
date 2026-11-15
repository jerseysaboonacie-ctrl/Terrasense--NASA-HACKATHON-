# Verification report

The plan's verification prompt, run on 2026-11-06 against the code in this repository,
run again on 2026-11-13 after adding Summary, Go to and Compare (section 7), and again on
2026-11-13 after the navigation work for blind users (section 8).
Each check is PASS, FAIL or NOT TESTED, with the evidence. "Simulated" means automated
tests in headless Chrome on macOS using synthetic key and pointer events
(`tests/player-test.html`, 341 checks, 0 failed; `tests/pages-test.html`, 77 checks, 0 failed;
`decoder-test.html?auto=1`, 20 self-tests, 0 failed; all on 2026-11-14).

## Results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1.1 | Ten pixels per frame decode within one legend step | PASS for SST; by-eye part NOT TESTED | SST: all ten within 2.0 °C of the real MUR value (one step = 5 °C); 336-point grid: median error 0.7 °C, worst 1.8 °C. Other frames: self-tests pass (round trip, ±8 noise never more than one step off). The by-eye column in docs/accuracy-check.md still needs a person. |
| 1.2 | No hardcoded or invented values; no extra precision | PASS | Every value comes from the legend tables built from NASA's colorbars by `tools/build_legends.py`. Temperatures shown to 1 °C (table has 0.25–0.5 °C entries), NDVI to 10%, precipitation as class ranges. Ends of a legend say "or lower" / "or higher". |
| 1.3 | Units, variable names, dates, credits match the source | PASS, with gaps listed below | Copied from the SVS pages and API on 2026-11-05 into `data/frames.json`; gallery, Player and Credits read only that file. |
| 1.4 | Missing or masked pixels give no data, not a low value | PASS | Simulated: land, water, logo and transparent pixels give "no data", silence and one click on all four frames. Self-test: every mask and no-data color decodes to no data. |
| 2.1 | Higher value always higher pitch, same scale, 10 points per frame | PASS | Simulated, all four frames. SST: −2 °C → 240 Hz … 32 °C → 800 Hz; T2M: −39 °C → 222 Hz … 40 °C or higher → 880 Hz; every frequency = 220 × 4^t within 0.5 Hz. |
| 2.2 | Stereo pan follows horizontal position | PASS | Simulated: pan = −0.8 … +0.8 from left to right edge, within 0.01, on all frames. |
| 2.3 | Nothing exceeds the safe volume limit | PASS | Simulated: slider at 100% gives master gain 0.35 (the cap); compressor present on the output. |
| 2.4 | Audio starts only after a click, tap or key press | PASS | Simulated: audio not started after load on any frame; started after the first key press. The AudioContext is only created inside `startAudio()`, which is only called from click, tap and key handlers. |
| 3.1 | Every claim on every page has a source | PASS | Numbers on How it works (0.7 °C, 1.8 °C, 336 points) come from docs/accuracy-check.md. "Works with screen reader" was reworded to "Designed for" because no real screen reader has been tested. No "endorsed by" or "tested with users" claims; the not-endorsed notice is on every page. |
| 3.2 | Approximate values labelled approximate | PASS | Every value text says "about", is a class range, or (at a legend end) says "or lower" / "or higher"; the approximate-values note is on Home, the Player and How it works. |
| 4.1 | Keyboard-only use | PASS (simulated), partly | Tested: arrow keys, Shift + arrow, S, M, ?. Built but not tested: Enter/Space replay, Escape, Tab out of the map, the visible focus outline. Not yet tried by a person using only a keyboard. |
| 4.2 | Screen-reader announcements | PASS (simulated); real screen readers NOT TESTED | Polite live region text equals the panel's narration line exactly on all four frames. VoiceOver, NVDA, JAWS and TalkBack not tried. |
| 4.3 | Mute button | PASS | Simulated: M and the button set gain to 0, stop the tone and the scan, `aria-pressed` updates; M again restores the volume. |
| 4.4 | Mobile touch drag without page scrolling | PARTLY TESTED | `touch-action: none` on the map (simulated check); layout checked at 390 px width in screenshots. Not tested on a real phone. |
| 5.1 | Pairs Earth Information Center frames with sound | PASS | Four frames from the SVS Daily Visualizations gallery for the Earth Information Center, self-hosted in `frames/`. |
| 5.2 | Sound generated in real time | PASS | Web Audio oscillators only (`js/audio.js`); there are no audio files in the repository. |
| 5.3 | Accessible and multi-sensory | PASS (by design), partly tested | Sound, on-screen text, live-region narration, optional speech, optional vibration (vibration not tried on a device). |
| 5.4 | Matches the official challenge text | NOT TESTED | The official challenge page could not be found online on 2026-11-05. Read it and its resource links and correct anything that differs. |
| 6.1 | Runs without console errors | PASS for the Player | Simulated: no script errors or unhandled rejections on the Player for all four frames. Home, Gallery, Credits, How it works, Accessibility and Audio test render fully with no error messages (headless DOM check). |
| 6.2 | Broken links, missing files | PASS | Script check: every local `href` and `src` in all 9 HTML pages, and every image in `frames.json`, exists. |
| 6.3 | API keys in the code | PASS | `git grep` for key, secret, token and password: none. The site uses no API keys. |

## 7. Summary, Go to and Compare (added 2026-11-13)

All computed in `js/analysis.js` from decoded values only; the wording ("warmest", "ocean area")
is the only per-frame text, stored as `terms` in `frames.json`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 7.1 | Summary shown and announced with identical text | PASS (simulated, 4 frames) | Summary box text = "Last announcement" line = live region text. |
| 7.2 | Warmest / coolest really are extreme (independent check) | PASS (simulated, 4 frames) | On a separate 32 × 16 grid, no point decodes higher than the "warmest" point and none lower than the "coolest" on SST and T2M; at most 6% lower on precipitation and 1% on NDVI (ties at the bottom of the legend). |
| 7.3 | SST summary against real data (MUR 2026-11-04) | PASS | Warmest area point (28.3° N, 50.4° E, Persian Gulf): decoded about 32 °C, MUR 31.45 °C. Coolest (79.6° N, 140.4° E): decoded about −2 °C, MUR −1.8 °C. Pattern, on MUR's own 342-point ocean grid: highest MUR value 31.6 °C, lowest −1.8 °C; equator band (10° S–10° N) average 29.1 °C (app: about 30 °C); 80°–90° N average −1.8 °C (app: about −2 °C); 70°–80° S average −1.8 °C (app: about −2 °C). The app's "steadily fall toward both poles" agrees; its equator average is about 1 °C warmer than MUR's coarse grid. |
| 7.4 | Go to warmest / Next warmest / Go to coolest move, play and announce | PASS (simulated, 4 frames) | Pointer moves to the area's point, the tone plays at 220 × 4^t Hz, the announcement starts "Warmest ocean area, 1 of 5:" (frame's own words) and matches the panel; Next goes to an area at least 10° away with a lower area average. |
| 7.5 | Compare plays A then B and announces the difference | PASS (simulated, 4 frames) | Tone A at 0.4 s and tone B at 1.5 s match their expected frequencies; e.g. SST: "B is about 34 °C cooler than A" for about 32 °C and about −2 °C. The difference uses the rounded values that are announced, so the numbers add up; a legend end gives "at least" (T2M: "at least about 79 °C colder"); precipitation gives a range from the class edges. |
| 7.6 | All announcements through the polite live region, matching the panel | PASS (simulated) | Every announcement is written by one function to both the panel's "Last announcement" line and the `aria-live="polite"` region; checked after every action above. |

Known limits of these features: an "area" is a 5° box, so a small warm sea (the Persian Gulf, the
Red Sea) can rank as the warmest area; the summary says "ocean area" from the frame's wording, and
the decoded value is approximate like every other value. On the precipitation frame, rain and snow
classes are ranked by legend position together.

## 8. Navigation for blind users (added 2026-11-13)

Every row is simulated in headless Chrome on all four frames unless it says otherwise.

| # | Check | Result | Evidence |
|---|---|---|---|
| 8.1 | Only one voice at a time | PASS (simulated) | Screen reader mode: live region updated, built-in voice not called. Built-in voice mode: spoken once, live region empty. Off: panel only. (The browser's speech was replaced by a counter; real speech not heard.) |
| 8.2 | Reading order | PASS | Title, then "Start here" (Voice, Tour, Summary, Where am I, Frame), then the map, then the readout, Find and compare, Controls, legends. DOM order equals visual order. |
| 8.3 | Opening message | PASS (simulated) | "Player ready: Sea Surface Temperature. Press T for a tour, or Tab to the map and use the arrow keys." Skipped if something was already announced (a bug found by the tests: on a slow load it talked over the user's first key press). |
| 8.4 | Detail levels | PASS (simulated) | Short: "about 0.2 to 0.3 mm/hour, snow (frozen)." Full adds "14 percent of the way up the legend." Go to and Where am I never drop the place. |
| 8.5 | Edges | PASS (simulated) | Arrow key at the left edge: "Edge of the map, left side, west. …" and a low bump (edge cue count +1 per edge); moving away is announced normally. |
| 8.6 | Where am I (W) | PASS (simulated) | "You are here. …" in full detail, with the tone. |
| 8.7 | Tour (T) | PASS (simulated) | Six steps; step 3 plays low, middle and high tones; Escape says "Tour stopped." |
| 8.8 | Volume keys | PASS (simulated) | Plus: 40%, "Volume 40 percent."; minus back to 30%; slider `aria-valuetext` "30 percent"; output still capped. |
| 8.9 | Mouse movement not announced by default | PASS (simulated) | No announcement 0.8 s after a mouse move. Touch "read on lift" is built but NOT TESTED (synthetic touch events cannot capture the pointer). |
| 8.10 | Errors announced at once | PASS (simulated) | Unknown frame: message in the `role="alert"` region. Error tone not checked (audio has not started on that page). |
| 8.11 | Settings remembered, Reset | PASS (simulated) | Detail "full" survives a reload; Reset restores screen reader, normal, 30%. |
| 8.12 | Every page: one h1, no skipped heading levels, main and labelled nav, skip link first with a real target, current page marked, image alt, every control named, unique ids, no click-only fake buttons, no script errors | PASS (6 pages) | `tests/pages-test.html`. Also: gallery has one heading link per frame; credits list every frame; the Accessibility key table lists every key; Home sound check plays low, middle, high and says so. |

Not tested: any of this with VoiceOver, NVDA, JAWS or TalkBack; real speech output; touch on a real phone;
whether blind users find the tour and wording clear. Single-letter keys may be taken by a screen reader
in browse mode outside the map; the help and the Accessibility page say so.

## 9. Sound cues, display, demo, wording, accuracy table (added 2026-11-14)

| # | Check | Result | Evidence |
|---|---|---|---|
| 9.1 | Sound cues | PASS (simulated, 4 frames) | One scan gives one start and one end chime; Go to gives one jump note; A one tick, B two. With Sound cues off, Go to plays its tone but no chime. Cue sounds were counted, not listened to. |
| 9.2 | Tone fades when the pointer is still | PASS (simulated, 4 frames) | Tone on after a move, off 1.3 s later. |
| 9.3 | Display settings | PASS (simulated) | High contrast: page background black; Large text: root font 20 px; both survive a reload and are cleared by Reset. Switch on the Accessibility page also applies on Home. Reduce motion: during a scan the marker stays put while the sound moves. Not checked: how high contrast looks to a low-vision user. |
| 9.4 | Demo | PASS (simulated) | Full run on SST: tones, equator scan, warmest, coolest, compare and summary all happen and it ends with "Demo finished." D then Escape on all four frames stops it and restores the row menu. |
| 9.5 | Legend line | PASS (simulated, 4 frames) | e.g. "between the 25 and 30 °C marks"; the decoded table value lies between the two marks, which are one printed tick apart. |
| 9.6 | Ten-point table on How it works | PASS | 12 rows decoded live by the Player's code; 10 compared with MUR 2026-11-04, all within one legend step (5 °C); 2 correctly give no value. |
| 9.7 | One spelling | PASS | The British spelling no longer appears in any page, script, tool, data file or document (searched with `git grep`), except in the project log's history. |
| 9.8 | SST date | PASS | Reads "Data date not stated (image updated 2026-11-05)" in the Player, gallery, credits and README. |

## 10. Where am I with countries, five taps, first-visit question, Terra (added 2026-11-14)

Simulated in headless Chrome. Terra was tested with typed requests: the microphone and speech
recognition cannot be tested headless.

| # | Check | Result | Evidence |
|---|---|---|---|
| 10.1 | Nearest country wording | PASS | "About 100 km west of Israel." (33.5° E, 32.3° N); "In Egypt."; "In Israel, near Palestine."; "In Japan."; mid-Atlantic: "About 850 km north-east of Brazil." Borders: Natural Earth 1:50m, simplified to about 1 km. |
| 10.2 | Where am I includes the country | PASS (4 frames) | Button, W and Terra all end with the country sentence. |
| 10.3 | Five quick taps = Where am I | PASS (4 frames) | Five synthetic touch taps in one spot give "You are here…"; three do not. Not tried on a real phone, or with VoiceOver or TalkBack (which take taps for themselves). |
| 10.4 | Named seas, oceans, continents | PASS | All 33 named points fall in water (seas) or on land (continents), checked against the borders. |
| 10.5 | First-visit question | PASS | On the first visit the Player and Home open a modal dialog with three choices, focus inside it, before the opening message. Key 3 saves "off", key 2 saves "screen reader"; not asked again. Speaking the question aloud after a key or tap was not heard (headless). |
| 10.6 | Terra in the Player | PASS (4 frames) | Typed: take me to Japan (with "no value right here… nearest value…", then "go there" on SST and precipitation), where am I, temperature in Spain, go to the warmest, next, summary then "yes", compare here with the coolest, compare Brazil and Norway, move east 10 degrees, louder and quieter, scan the equator and stop, what am I looking at, help, not understood, repeat, change voice mode. The conversation log shows both sides. |
| 10.7 | Terra on other pages | PASS | Gallery: Terra right after the heading; "help" answered; "open the rain map" opens the Player on precipitation. |

Not tested: speech recognition with a real microphone; the back-and-forth listening in built-in voice mode;
how well spoken requests are recognised for different accents; Terra with a real screen reader; the
first-visit question read aloud.

## 11. Screen-reader simulation (added 2026-11-14)

`tools/sr_sim.py` reads Chrome's accessibility tree (what screen readers use), presses Tab and keys, and
records every live announcement. Problems it found and how each was solved are listed in docs/LOG.md
(session 4). After the fixes:

| # | Check | Result | Evidence |
|---|---|---|---|
| 11.1 | Holding or quickly pressing arrow keys | PASS (simulated, 4 frames) | 6 fast presses: 2 announcements (the first step and where you stop); the tone changes on every step. |
| 11.2 | Repeated steps are shorter | PASS | "About 31 °C, near the equator, 0°, 176° W." while moving; the variable name returns after 5 s. |
| 11.3 | Edge | PASS | First time "Edge of the map, left side, west. …", then "Edge. …"; fast presses into the edge still name it once. |
| 11.4 | Map name on focus | PASS | "Map: Sea Surface Temperature", description "Arrow keys explore. W says where you are. Question mark lists every key." |
| 11.5 | Focus after the first question | PASS | Main heading (h1). |
| 11.6 | Error page | PASS | Title and heading "Frame not found"; alert heard (assertive). |
| 11.7 | No double announcement of the volume | PASS (by design) | The visual percentage is hidden from screen readers; the slider says "40 percent". |
| 11.8 | No stale live text when browsing | PASS | The live region empties 6 s after each announcement. |

Not tested: the same with VoiceOver, NVDA, JAWS or TalkBack. The simulator cannot reproduce a screen
reader's own key handling (browse mode, quick navigation), speech timing, or verbosity settings.

## 12. Terra on and off, listening continuously (added 2026-11-14)

Tested with a stand-in speech recognizer and microphone inside headless Chrome (no real microphone there).

| # | Check | Result | Evidence |
|---|---|---|---|
| 12.1 | V switches Terra on | PASS | Both switches (Start here and the Player's top bar) pressed; continuous listening; "Terra is listening. …" |
| 12.2 | Answers every request while on | PASS | "take me to Japan", then "where am I", in the same listening session, without pressing anything. |
| 12.3 | Restarts by itself | PASS | When the browser ends a session, a new one starts within a second. |
| 12.4 | Does not answer itself | PASS | Its own last answer, heard back, is ignored; listening pauses while the built-in voice talks and resumes after. |
| 12.5 | Wake word | PASS | With "Only answer when I start with Terra": "summary" ignored, "Terra, where am I" answered, "Terra" alone gives "Yes?" and the next request needs no wake word. |
| 12.6 | Switching off | PASS | "stop listening", V, or either switch; listening stops. |
| 12.7 | Stays on across pages | PASS | "open the rain map": the Player opens on precipitation and says "Terra is still listening." |
| 12.8 | Microphone permission | PASS (simulated) | Says "Your browser is asking to use the microphone. Choose Allow." before the browser's question; if blocked, says how to allow it. |
| 12.9 | Answers out loud in screen reader mode (2026-11-14, after your report) | PASS | Voice set to "screen reader", no screen reader running: Terra's answers are spoken by the built-in voice, once (not also in the live region). Unticking "Terra answers out loud" sends them to the screen reader. |
| 12.10 | Its name and "are you listening?" | PASS | "Terra, are you still listening?" → "Yes, I'm listening. What would you like to do?"; "Terra" → "Yes? I'm listening."; "can you hear me" → "Yes, I'm listening."; "hey Terra where am I" answered without the wake-word setting. |
| 12.11 | Long answers | PASS | The summary is spoken in 4 parts of at most 149 characters. |
| 12.12 | Frame change keeps Terra | PASS | "open the rain map" switches frame in the same page; Terra keeps listening and speaking. |
| 12.13 | New page without a key press | PASS | Terra keeps listening, says "Terra is still listening." through the screen reader channel, and shows a note to press a key or tap once so it can speak. |

Not tested: a real microphone, real speech recognition accuracy, and how often room noise or a screen reader
on speakers is heard as a request.

## 13. Real microphone, and the newest NASA frames (added 2026-11-14)

| # | Check | Result | Evidence |
|---|---|---|---|
| 13.1 | Chrome's real speech recognition on this Mac | PASS | Real microphone, real recognizer: text within 1 to 2 s. |
| 13.2 | Terra in a noisy room (real microphone) | PASS after fixes | Before: Terra answered room conversation with spoken "Sorry…", stopped listening while saying it, and lost the real request; a casual "right" moved the map. After: about 100 phrases of conversation in 50 s, none answered, nothing moved, no errors. |
| 13.3 | Terra answering a recognised spoken request with real audio | NOT SHOWN with real audio | Test phrases played from the speakers were drowned out by people near the microphone. The same code path passes with the stand-in recognizer (section 12). |
| 13.4 | Check the microphone | PASS (real microphone) | "Sound: yes, I can hear your microphone. Speech recognition: works. I heard: …" |
| 13.5 | Newest frames | PASS | Sea surface temperature: NASA's image of 2026-11-13, data for 12 Nov 2026 (date from NASA's dated copy; map pixels match, mean difference 0.02 of 255). Precipitation: image of 2026-11-14 11:50 UTC, data time 2026-11-14 06:30 from NASA's date overlay. Vegetation: unchanged at NASA. Air temperature: no newer version exists. |
| 13.6 | New sea temperature image against real data (MUR 2026-11-12) | PASS | 335 points: median error 0.70 °C, worst 2.83 °C, all within one legend step. |
| 13.7 | Decoder and Player with the new frames | PASS | 20 of 20 self-tests; 341 of 341 Player checks. Go to warmest and coolest now stand near the top or bottom of the area (90th or 10th percentile): on every frame, no independent grid point decodes beyond them. |

## 14. Terra with Chrome's real recognizer, in quiet and with people talking (added 2026-11-14)

Method: `tools/terra_voice_test.py`. Recordings of three requests in nine Mac voices are played to Terra
through a virtual microphone (an audio track Chrome's recognizer listens to, with a faint hiss like a real
microphone). Terra's own code and Google's real recognizer; only the microphone is replaced. Real speaker
playback could not be used: the Mac cancels its own speaker sound from the microphone (13.3).

| # | Check | Result | Evidence |
|---|---|---|---|
| 14.1 | How Chrome writes "Terra" | MEASURED | First guess: usually "Tara", often "Sarah" or "Terror", sometimes "Jenna", "Cara", "a timer", "hey there". "Terra" was nearly always among the other guesses. "Terra" said alone often gives nothing. |
| 14.2 | Old code, two people talking underneath | FAIL, 0 of 12 | Chrome kept one phrase open ("Hearing: … Tara are you still listening …") and never marked it final; Terra waited for "final" and never answered, then the recognizer stalled. This matches "it does not respond". |
| 14.3 | New code, quiet | PASS, 27 of 27 | Answers its name as "Tara"/"Sarah", "are you still listening", "take me to Japan", "where am I". |
| 14.4 | New code, two people talking underneath | PARTLY, 8 to 11 of 18 per run | Misses: Google lost the request or garbled the name and words under the voices. No miss where the words reached Terra intact. |
| 14.5 | Visible Chrome with a normal "Allow" for the microphone | PASS | Recognition starts and hears speech. (With the test flag `--use-fake-ui-for-media-stream` a visible Chrome refuses recognition with "not-allowed"; that is the flag, not the site.) |
| 14.6 | Automated checks | PASS | 346 of 346 Player checks (new: answers when words stop changing; "Sarah" and the name after other words; name in Chrome's other guesses; people talking non-stop; restart after a stall). 77 of 77 page checks. The stand-in recognizer now keeps a session's results like Chrome. |
| 14.7 | A person speaking to Terra at a real microphone | NOT TESTED by us | Needs a person at the Mac. |

## 15. Pointer panel places, Terra's new answers, Terra's introduction (added 2026-11-15)

| # | Check | Result | Evidence |
|---|---|---|---|
| 15.1 | Under the pointer: nearest country and continent | PASS (all 4 frames) | Japan: "In Japan." / Asia. Atlantic (30° W, 0°): "About … km … of …" / "… (nearest land)". Siberia (100° E, 60° N): Asia, not Europe. Lookup 0.27 ms, at most once per screen frame. |
| 15.2 | Continents of countries on two continents | PASS (spot checks) | Moscow Europe, Siberia Asia; Istanbul's European side Europe, Ankara area Asia; Sinai Asia, Cairo Africa. Approximate (split by longitude). |
| 15.3 | Today's date and time | PASS | "Today is Sunday, 15 November 2026, by this device's clock. This map's data is from 12 Nov 2026." "What date is this map" still gives the map's date. |
| 15.4 | Moving to another map | PASS | "move me to the vegetation", "go to precipitation", "switch to air temperature", "open the sea temperature interface", "rain": each opens that map in the page; "precipitation" on the precipitation map says it is already open. On the Gallery, "go to the vegetation" opens the Player on it. |
| 15.5 | Other questions | PASS | Lists the maps; explains NDVI without switching; "what's the weather" gets the honest "not connected" answer; introduces itself. |
| 15.6 | First visit: Terra's introduction, then the question | PASS | Dialog "Hi, I'm Terra" with examples; any other key speaks the introduction then the question; 1/2/3 still choose; `?welcome` shows it again. Desktop and 390 px phone screenshots: fits, scrolls on the phone. |
| 15.7 | Automated checks | PASS | 369 of 369 Player checks, 80 of 80 page checks, 20 of 20 decoder self-tests. |
| 15.8 | Spoken introduction heard by a person | NOT TESTED by us | Speech stubbed in tests. |

## 16. Hearing: what reaches Terra, and starting at the Gallery (added 2026-11-15)

| # | Check | Result | Evidence |
|---|---|---|---|
| 16.1 | Which copy of the site the browser runs | FOUND A RISK, FIXED | The old server (`python3 -m http.server`) sent no cache rule; from 21:30 to 11:36 it logged no visits at all, so a browser could have kept running older JavaScript. `tools/serve.py` sends `Cache-Control: no-cache`; the page shows "Terra version …". |
| 16.2 | Restarts in quiet moments | FOUND A BUG, FIXED | A real-microphone run in visible Chrome showed the session restarting every 6 s in a quiet room (the stall rule from section 14). Someone starting to talk just then lost their first words. Now a restart only when Chrome hears speech but sends no words for 8 s, or after 60 s with no event. Test: quiet session kept, stalled one restarted. |
| 16.3 | Real microphone, visible Chrome, normal "Allow", new Gallery flow | PASS | Landed on the Gallery from the bare address; after the voice choice Terra switched on; Chrome reported sound and speech; no errors. No words in that quiet minute. |
| 16.4 | Saying the map's name or number at the Gallery question (real recognizer, virtual microphone) | PASS | "Vegetation" → Player on vegetation; "Number four" → precipitation; both said while Terra was still reading the choices. Terra stays on in the Player. |
| 16.5 | Voice test after the changes | PASS / PARTLY | 25 of 27 in quiet; 9 of 18 with two people talking underneath (as before). |
| 16.6 | Gallery greeting and landing | PASS | Link (no referrer) → Gallery; introduction, voice question (earlier answer marked), map question with four maps and "gallery first"; key 3 → vegetation; "number two" → air temperature; not repeated in the same visit; Home from inside stays Home. |
| 16.7 | Microphone log | PASS | Events and counts only; checked: no transcript text in the file. |
| 16.8 | Automated checks | PASS | 369 of 369 Player checks, 85 of 85 page checks. |
| 16.9 | A person speaking to Terra | NOT TESTED by us | Needs you; the microphone log will show what happened. |

## 17. Silent microphone: a virtual device chosen by Chrome (added 2026-11-15)

| # | Check | Result | Evidence |
|---|---|---|---|
| 17.1 | Your Chrome, from Terra's microphone log | FOUND | Version 2026-11-15b, microphone allowed and opened, recognition sessions running, but for over a minute only "no-speech": not one sound or speech event. |
| 17.2 | Cause | FOUND | Chrome's microphone preference on this Mac ranks "AirgoCast Audio (Virtual)" (a screen-casting driver) above the MacBook Air Microphone. The system default is the built-in microphone, input volume 50. |
| 17.3 | Reproduced | PASS | Fresh Chrome profile with the same ranking: Chrome's default microphone is AirgoCast, level 0.0000, recognizer hears no sound. |
| 17.4 | Fixed | PASS | Same profile, new code: Terra opens the MacBook Air Microphone, level bar moves (up to 38 %), recognizer reports sound and speech, voice speaks (Samantha). Test: with a virtual default device, Terra opens the built-in one; the menu marks the virtual one. |
| 17.5 | Built-in voice on this Mac | PASS | Picked voice Samantha speaks (3.8 s for a test sentence). Novelty voices are never picked. Your own Chrome's voice: now logged ("speech works" / "did not start" / errors). |
| 17.6 | Automated checks | PASS | 370 of 370 Player checks, 85 of 85 page checks; recorded voices 11 of 12. |

## 18. Your second test: heard, but silent (added 2026-11-15)

| # | Check | Result | Evidence |
|---|---|---|---|
| 18.1 | Your log (13:53 to 13:57) | FOUND | The new microphone choice worked (MacBook Air Microphone); Terra heard you and answered "are you listening" twice. But no speech event at all: the voice never started. Six short phrases got no reply ("not a known request, no name"). The "no sound for 10 s" warnings were wrong (the level was measured on screen redraws, which Chrome pauses for hidden windows). |
| 18.2 | Chrome's voice with the microphone open, on this Mac | PASS | Samantha starts and finishes with no microphone, with the microphone open (echo cancellation on and off), and with recognition running. Leaving a page mid-sentence did not break it either. Your Chrome's silent voice is not reproduced: most likely Chrome's speech engine was stuck. Now: reset and retry, then Google's voice, then a message to quit and reopen Chrome; every step is logged. |
| 18.3 | Full flow in a visible Chrome set up like yours (AirgoCast first) | PASS | Gallery greeting, voice spoken (Samantha), key 3 → vegetation map; sound on at once; the listening guide starts by itself; hover reads "Vegetation: … 40° N, 132° E. About 200 km south-east of North Korea; nearest land Asia."; Terra on with the MacBook microphone. |
| 18.4 | Listening guide | PASS | "The higher the note, the warmer it is" then "Low note: about −5 °C, the coolest end", "Middle note: about 15 °C", "High note: about 35 °C, the warmest end", each followed by its note. Replay with G or "play the guide"; moving stops it. Without a click yet: the prompt; the first key press starts the guide. |
| 18.5 | Short phrases | PASS | "What do you say" gets "Sorry, I did not catch …"; long sentences and "okay so" stay unanswered; nothing moves. "What's the temperature" now reads the value. |
| 18.6 | Automated checks | PASS | 374 of 374 Player checks, 85 of 85 page checks. |
| 18.7 | Hearing the voice in your Chrome | NOT TESTED by us | Needs you. |

## 19. Echo, no interrupting, map question first (added 2026-11-15)

| # | Check | Result | Evidence |
|---|---|---|---|
| 19.1 | Your log (15:05 to 15:14) | FOUND | After restarting Chrome the voice worked. Terra heard her own speech: hundreds of word updates while she talked, phrases of 16 and 21 words treated as room talk. |
| 19.2 | Fix: microphone off while Terra talks | PASS | Visible Chrome set up like yours, real speakers and microphone: during about 45 s of Terra talking (Gallery question, vegetation opening) the microphone was paused every second, and not one word reached the recognizer. Test: the microphone signal is off while she talks and on again after. |
| 19.3 | Two bugs found on the way | FIXED | A microphone opened while Terra was already talking was not paused; the status line could say "listening" while paused. |
| 19.4 | Never interrupts herself | PASS | Nothing heard while she talks is taken, not even "Terra, …"; afterwards it is. Speech is queued; the pointer reading waits for the current sentence. |
| 19.5 | Map question first; starting point | PASS | Gallery dialog: "Hi, I'm Terra. Which map would you like to explore?" with the four maps (and the voice choice underneath). The map opens with "… is open, date. You start in the middle of the map. Sea surface temperature: about 29 °C, near the equator, 0°, 0°. About 600 km south-east of Ghana; nearest land Africa.", then the shorter listening guide. |
| 19.6 | Automated checks | PASS | 375 of 375 Player checks, 85 of 85 page checks; recorded voices 11 of 12. |

## Could not verify

- The official challenge text and its resource links (5.4).
- The SST frame's data date: the image has no date. It matches the 2026-11-04 MUR analysis slightly better than 2026-11-03, but we do not claim a date.
- The precipitation frame's time zone, and the dataset behind the NDVI frame (neither is stated by SVS).
- Real screen readers, real phones, browsers other than Chrome, and vibration on a device.
- Anything about use by blind and low-vision people: no user testing has happened yet.

## Top 5 next steps

1. Test with real screen readers (VoiceOver on Mac and iPhone, NVDA on Windows, TalkBack on Android) and fix what they reveal.
2. Test on a real phone with headphones: dragging, sound start, volume, vibration.
3. Fill in the by-eye column of the ten-point checks in docs/accuracy-check.md.
4. Run the plan's user tests with blind and low-vision people or their teachers, and update the Accessibility page with exactly what was tested.
5. Read the official challenge page; add a feedback contact to the Accessibility page; look for dated frames so time stepping can be added.

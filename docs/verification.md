# Verification report

The plan's verification prompt, run on 2026-11-06 against the code in this repository,
run again on 2026-11-13 after adding Summary, Go to and Compare (section 7), and again on
2026-11-13 after the navigation work for blind users (section 8).
Each check is PASS, FAIL or NOT TESTED, with the evidence. "Simulated" means automated
tests in headless Chrome on macOS using synthetic key and pointer events
(`tests/player-test.html`, 214 checks, 0 failed; `tests/pages-test.html`, 73 checks, 0 failed;
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

# Verification report

The plan's verification prompt, run on 2026-11-06 against the code in this repository.
Each check is PASS, FAIL or NOT TESTED, with the evidence. "Simulated" means automated
tests in headless Chrome on macOS using synthetic key and pointer events
(`tests/player-test.html`, 77 checks, 0 failed; `decoder-test.html?auto=1`, 20 self-tests, 0 failed).

## Results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1.1 | Ten pixels per frame decode within one legend step | PASS for SST; by-eye part NOT TESTED | SST: all ten within 2.0 °C of the real MUR value (one step = 5 °C); 336-point grid: median error 0.7 °C, worst 1.8 °C. Other frames: self-tests pass (round trip, ±8 noise never more than one step off). The by-eye column in docs/accuracy-check.md still needs a person. |
| 1.2 | No hardcoded or invented values; no extra precision | PASS | Every value comes from the legend tables built from NASA's colourbars by `tools/build_legends.py`. Temperatures shown to 1 °C (table has 0.25–0.5 °C entries), NDVI to 10%, precipitation as class ranges. Ends of a legend say "or lower" / "or higher". |
| 1.3 | Units, variable names, dates, credits match the source | PASS, with gaps listed below | Copied from the SVS pages and API on 2026-11-05 into `data/frames.json`; gallery, Player and Credits read only that file. |
| 1.4 | Missing or masked pixels give no data, not a low value | PASS | Simulated: land, water, logo and transparent pixels give "no data", silence and one click on all four frames. Self-test: every mask and no-data colour decodes to no data. |
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

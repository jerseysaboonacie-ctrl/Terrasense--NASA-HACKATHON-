# TerraSense Jukebox: project log

One place to see what is done, what is left, and who is doing it.
Claude updates this file after every change it makes. Add your own entries in the
same format (newest first under **History**) and tick your tasks in **Your tasks**.

Status words: **Done** (built and tested), **Partly done** (some of it exists, see notes),
**Not started**, **Yours** (only a person can do it).

Last updated: 2026-11-14 16:34 (+07), session 3 in progress.

---

## Heartbeat

Live progress, newest session first, newest line at the bottom of each session. Times are the
laptop's clock (+07). Each phase has an estimate; the heartbeat says when it actually started and finished.

### Session 3: 2026-11-14 afternoon (in progress)

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
| 6 | Tests, docs, log, commit | 45 min | In progress |

Total estimate: about 4 hours 10 minutes, finishing around 20:40.

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

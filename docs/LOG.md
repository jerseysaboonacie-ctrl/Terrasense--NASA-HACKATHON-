# TerraSense Jukebox: project log

One place to see what is done, what is left, and who is doing it.
Claude updates this file after every change it makes. Add your own entries in the
same format (newest first under **History**) and tick your tasks in **Your tasks**.

Status words: **Done** (built and tested), **Partly done** (some of it exists, see notes),
**Not started**, **Yours** (only a person can do it).

Last updated: 2026-11-13, after the upgrade plan was received.

---

## Status board (Upgrade plan, 13 Nov)

### Tier 1: must do

| Item | Owner | Status | Notes |
|---|---|---|---|
| Narration for every action, with a Voice mode switch | Claude | Partly done | Already announced: points, mute/unmute, scan start/stop/finish, summary, jumps, compare, marking A/B. Missing: the 3-way Voice mode switch (today there are two separate checkboxes, and both can be on at once, which the plan forbids), Player-opens message, Where am I, map edges, volume changes, frame change, assertive region for errors, detail levels, "Announce while moving" (today it announces after a 0.6 s pause by default; the plan wants this off by default). |
| Summary, Go to warmest, Go to coolest, Next warmest, Compare | Claude | Done | 2026-11-13. All facts computed from decoded values. 109 automated checks pass. SST summary checked against real MUR data (docs/verification.md, section 7). Still to do by a person: check the Summary against the picture by eye. |
| First-time guide read aloud (Tour, T key) | Claude | Not started | Plus the per-frame "how the map is laid out" message on load. |
| Sound cues for land, edges and no data | Claude | Partly done | Done: soft click for no data/land. Missing: edge bump, scan start/end chimes, jump chime, A/B ticks, error tone, Sound cues on/off, fade after about 1 s of stillness. |
| Accuracy check shown on How it works | Claude + you | Partly done | The page states the MUR comparison (0.7 °C typical, 1.8 °C worst). Missing: the table of 10 points. The "by eye" column needs a person (see Your tasks). |
| Test with a real screen reader | Yours | Not started | See Your tasks. Nothing has been tried with VoiceOver, NVDA or TalkBack yet. |

### Tier 2: do next

| Item | Owner | Status | Notes |
|---|---|---|---|
| Settings panel (speech speed, detail level, high contrast, large text, reduced motion), remembered, Reset button | Claude | Not started | Volume and the narration checkboxes exist on the Player but are not remembered between visits. |
| 60-second Demo mode with Stop | Claude | Not started | |
| Two more frames with checked legends | Claude + you | Not started | Candidates found on 2026-11-05, both from the same SVS gallery: SST Anomaly (SVS 5176) and GEOS-FP Near-Surface Wind Speed (SVS 5148). The wind legend is transparent below about 4 m/s, which needs care. Each needs its 10-point check. |
| Wording: one spelling of color | Claude | Not started | Headings say "colour"; the approximate-values note says "colors". |
| Wording: legend readout shows the matched range | Claude | Not started | Today: "Legend colour: matched legend colour". Plan: e.g. "Legend range: 28 to 30 °C". |
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
| SST date is the image's update date, not the data date | Claude | Open | The site says "Most recent frame on 2026-11-05". The image has no data date. It fits the MUR analysis for 2026-11-04 slightly better, but we cannot claim that. Fix: say "data date not stated; image updated 2026-11-05". |
| Player reading order differs from the plan | Claude | Open | Plan: title, voice mode, Summary and Tour, controls, frame, readout, legend. Today: title, map, readout, find and compare, controls, legends. |
| Navigation on a coarse grid with row/column, and two sliders for phones | Claude | Not started | Today the arrow keys move 1% of the map width per press. |
| Feedback contact on the Accessibility page | Yours | Open | Needs an email address or form link. |
| Official challenge text | Yours | Open | Could not be found online; read it at the event and tell Claude what differs. |

---

## Your tasks

Tick these as you go and add a line under History with what you found.

- [ ] Screen reader test (about 20 min): VoiceOver (Mac: Cmd + F5), NVDA (Windows) or TalkBack (Android). Eyes closed: open the Player, get the summary, jump to the warmest area, compare two places, mute, go back to the gallery. Note where you got lost, heard nothing, or heard two voices.
- [ ] By-eye check: open `decoder-test.html?frame=sst&fill=1` (then `t2m`, `ndvi`, `precip`), type the value you read from the colourbar for each row, and paste the Markdown export into `docs/accuracy-check.md`.
- [ ] Check the Summary against the picture for each frame (does the "warmest" place look warmest?).
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
- Chose four frames from the SVS Daily Visualizations gallery and measured their legends from NASA's colourbars.
- Built the six-page skeleton, the gallery and credits from `data/frames.json`, and the decoder with its test page.
- Validated SST against real MUR data: median error 0.7 °C, worst 1.8 °C over 336 points; ten-point table in `docs/accuracy-check.md`.

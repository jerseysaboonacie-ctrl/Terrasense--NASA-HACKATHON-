# TerraSense Jukebox

Hear NASA's Earth Information Center visualizations. Pick a frame, move a finger,
cursor or the arrow keys across it, and hear the data under the pointer.
Built for the NASA Space Apps Challenge 2026 challenge "The Earth Information Jukebox".

TerraSense Jukebox is a hackathon project. It is not endorsed by NASA.

## Status

All ten build steps in the website plan are built. Time stepping (step 9) is not
offered because none of our frames has dated versions yet; see Known limitations.

| Plan step | State |
|---|---|
| 2. Skeleton: six pages, navigation, skip link, mobile layout | Done |
| 3. Data and gallery from `data/frames.json` | Done |
| 4. Decoder and test page | Done, validated against real data ([docs/accuracy-check.md](docs/accuracy-check.md)) |
| 5. Audio engine and audio test page | Done |
| 6. Player: canvas, pointer events, info panel | Done |
| 7. Keyboard and narration | Done |
| 8. Color legend, reference tones, Explain this sound | Done |
| 9. Scan (row and overview) | Done. Time stepping: not applicable yet |
| 10. Pages, README, verification | Done ([docs/verification.md](docs/verification.md)) |

## Scientific foundation and accessibility

### Why NASA Earth data matters

NASA Earth observation data helps us understand changes in our planet's environment, including
ocean temperatures, atmospheric conditions, vegetation health, and precipitation patterns.
TerraSense makes these environmental visualizations more accessible through interactive audio
experiences.

### NASA data and visualizations

TerraSense uses NASA Earth Information Center visualizations covering:

- Sea Surface Temperature (SST)
- Air Temperature
- Vegetation Health (NDVI)
- Precipitation

Where each one comes from is listed under [Data sources](#data-sources).

### Data sonification

TerraSense translates environmental data values into sound using audio mappings:

- **Pitch:** represents variations in environmental values.
- **Stereo positioning:** helps users perceive spatial differences.
- **Audio scanning:** allows users to explore geographic patterns through sound.

These mappings provide an alternative way to explore environmental information; they are not a
replacement for scientific measurements or visualizations.

### Accessibility impact

TerraSense is designed to make Earth science exploration more inclusive, particularly for blind
and low-vision users. By combining sonification, voice narration, keyboard navigation,
screen-reader support, and interactive exploration, the project offers an alternative sensory
experience for understanding NASA Earth data.

## Navigating without sight (Player)

- **Start here** is the first section after the title, before the map: the Voice switch, Tour (T),
  Summary, Where am I? (W) and a menu to change frame.
- **Voice** has three modes, and only one voice is ever used: Screen reader (polite live region),
  Built-in voice (the browser's speech, no live region), Off (text on screen only).
- **How much to say**: Short (value only), Normal (variable, value, place), Full (also the legend position).
  Go to and Where am I always say the place.
- **Edges**: an arrow key at the edge of the map says "Edge of the map, left side, west" and plays a low bump.
- **Volume keys**: minus and plus, with the new level announced. The slider reads "30 percent".
- **Errors** go to a `role="alert"` region with a short falling tone.
- **Mouse movement** plays sound but is not announced unless "Read the value when the mouse stops moving"
  is on; on touch screens the value is read when the finger lifts.
- **Opening message** ("Player ready: …") once the frame has loaded, skipped if you have already started.
- **Settings are remembered** in this browser (`js/prefs.js`, `localStorage`, safe if storage is blocked);
  Reset settings restores the defaults.
- **Tour**: six short steps (what the frame is, the layout, the sound with low/middle/high tones,
  exploring, finding, settings). T goes forward, Escape stops. The layout text is built from
  `frames.json` (projection, no-data labels, masks), not written per frame.

- **Sound cues** (switch: Sound cues): low bump at an edge; two rising notes when a scan starts and
  two falling when it ends; a short high note when Go to jumps; one tick for A, two for B; a falling tone
  on errors. All in `js/settings.js` (`cues`). A hovered or touched tone fades after 1 s of stillness.
- **Display** (Player Controls, and the Accessibility page): High contrast, Large text, Reduce motion.
  `js/display.js` applies them on every page from the same saved settings; the system's dark mode and
  reduced-motion settings are followed too.
- **Demo** (D, or the button): one minute that plays the reference tones, scans the equator, goes to the
  warmest and coolest areas, compares them and reads the Summary, using the same functions as the buttons.
  Escape or Stop demo ends it and restores the controls.

- **First visit**: every page first asks how to hear the site (built-in voice, screen reader, or text only),
  in a native modal dialog; keys 1, 2, 3; any other key or tap reads the question aloud (`js/welcome.js`).
- **Where am I** (W, the button, or five quick taps in one spot on a touch screen) ends with the nearest
  country: "In Egypt.", "In Egypt, near Israel.", "About 60 km west of Israel." (`js/places.js`, borders from
  Natural Earth 1:50m, public domain, built into `data/countries.json` by `tools/build_countries.py`).
- **Terra, the assistant** (V or the "Terra listening" switch on every page, also in the Player's top bar;
  typing works too). While switched on it keeps listening (continuous Web Speech recognition, restarted
  whenever the browser ends a session) and answers each request. It does not wait for Chrome to mark a
  phrase "final" (with people talking nearby Chrome may never do so): it answers when the words stop
  changing, or, after hearing its name or "are you listening", a moment later even if the room keeps
  talking; it starts a fresh session after each request and whenever the recognizer stalls. Its name is
  matched as Chrome often writes it ("Tara", "Sarah", "Terror", …) anywhere in a phrase and in all of
  Chrome's guesses. While the built-in voice talks it only accepts "Terra, …" (which interrupts it),
  ignores what sounds like its own recent answers, has an optional wake word ("Terra, ..."), and stays on
  across pages in the same tab (sessionStorage). When you talk to it, it answers out loud with the
  built-in voice whatever the Voice setting ("Terra answers out loud", on by default), in sentence-sized
  parts (Chrome cuts off long speech), and tracks its own speaking from utterance start/end events rather
  than `speechSynthesis.speaking` (which Chrome can leave stuck). Its name ("Terra, …", "hey Terra …") and
  "are you still listening?" are always understood. Spoken or typed requests
  such as "take me to Japan", "compare Brazil and Norway", "summary" (then a yes/no follow-up), "scan the
  equator", "open the rain map", "move me to the vegetation", "go to precipitation", "what maps are there",
  "what is today's date" (device clock), "what is NDVI" (from each frame's `about` in `data/frames.json`),
  "introduce yourself", "read this page", "stop listening". Questions outside the site (weather, news) get
  an honest "I am not connected to the internet or to an AI service".
- **First visit**: see "Where it starts" above (`greetOnGallery` in `js/welcome.js`). On other pages a first
  visit gets Terra's introduction and the voice question. Choosing a voice switches Terra's listening on.
- **Listening guide** (Player): when a map opens, Terra says how to listen ("the higher the note, the warmer it
  is") and plays the low, middle and high notes with their approximate values (from the legend), so values can
  be told by ear without the color key. G or "Terra, play the guide" repeats it; moving or any key stops it.
  The same rule is in Terra's introduction on the Gallery, spoken on the first click or key press.
- **Sound unlock**: browsers allow sound only after a click or key press. Arriving from another page of the
  site usually counts (sound starts at once); otherwise a large "Click anywhere or press any key" button.
- **Hover** reads the panel when the mouse rests (on by default): value, place, nearest country, continent.
- **Voice that does not start** (Chrome on a Mac can get stuck): reset and retry, then Google's voice, then
  a message to quit and reopen Chrome. Novelty voices are never picked.
- **No echo, no interrupting**: while Terra talks, and for 0.9 s after, her microphone signal is switched off
  (`track.enabled = false`), so her own voice from the speakers never comes back as a request; nothing heard
  then is taken. Speech is queued, never cut off: a new answer waits for the current one; what is under the
  pointer waits too (only the newest reading is kept). Escape or "stop" still stops everything.
- **Short phrases Terra does not know** get a short "Sorry, I did not catch …"; only long sentences and fillers
  ("okay so") without "Terra" are treated as people talking.
- **Which microphone**: Terra opens the microphone itself and hands it to Chrome's recognizer
  (`recognition.start(track)`), because Chrome's own preferred microphone can be a virtual device
  (screen-casting or meeting apps, e.g. "AirgoCast Audio (Virtual)") that sends silence. Automatic picks the
  system default, the built-in or any real microphone, never a virtual one; the Microphone menu chooses
  another (saved). A level bar shows the microphone hearing you. The Narrator menu (built-in voice / screen
  reader / text only) and "Test the voice" are in Terra's panel on every page; novelty Mac voices are skipped.
- **Microphone line** under Terra's switch: "off", "on. Listening", "hearing sound", "hearing speech",
  "heard you (5 words)", or the exact problem (blocked, no sound for 10 s, Chrome error, editor preview,
  Brave, Firefox, a `file://` page), so it is visible where listening stops. Version shown below it.
- **Under the pointer** shows the nearest country ("In Japan." / "About 300 km west of Chile.") and the
  continent (on land; at sea the nearest land's, marked "nearest land"). Continents from Natural Earth;
  Russia, Turkey, Egypt and Kazakhstan split roughly by longitude (`continentOf` in `js/places.js`).
  A fixed set of requests (`js/assistant.js`, `js/player-assistant.js`), not an AI service: a real AI model
  would need an API key and a server, which a static site cannot keep secret. Speech recognition is the
  browser's Web Speech API (online in Chrome and Edge; not in Firefox); typing works everywhere.

## Find and compare (Player)

- **Summary** reads out and shows the warmest and coolest areas (with approximate value and
  latitude/longitude) and the pattern from the equator to the poles.
- **Go to warmest / Next warmest / Go to coolest** move the pointer to those areas, play the
  tone and announce them. Labels follow the frame: greenest for NDVI, heaviest for precipitation.
- **Compare**: mark point A and point B (buttons or keys A, B), then Compare (key C) plays both
  tones in order and announces the approximate difference in the frame's units.

How it is computed (`js/analysis.js`): the frame is decoded on a grid of about 512 × 256 points.
Points are grouped into 5° × 5° areas; an area counts if at least 25% of its points have a value.
Areas are ranked by their average legend position; Go to stands on a point near the top of the area's
values (90th percentile) for "warmest" and near the bottom (10th percentile) for "coolest", so it lands
on a high or low value without chasing a single stray pixel; "next" areas must be at least 15° away. The
equator-to-pole pattern compares 10° latitude bands (average value; for precipitation, the share
of the area with precipitation). Differences are computed from the rounded values that are
announced, so the spoken numbers add up; a value at the end of a legend makes the difference
"at least". Wording only ("warmest", "ocean area") is stored per frame in `frames.json` as `terms`.

## Run it

No build step and no internet needed once the files are on your computer.

```sh
cd "Terrasense (NASA HACKATHON)"
python3 tools/serve.py          # http://localhost:8931
```

Then open <http://localhost:8931> in Google Chrome. The site must be served, not opened as a file:
browsers block pixel reading on `file://` pages. `tools/serve.py` is like `python3 -m http.server`, but sends
`Cache-Control: no-cache` (so Chrome never keeps running an old copy of the JavaScript after an update) and
keeps **Terra's microphone log**: on localhost only, the page reports what the speech recognizer does
(switched on, permission, sound, speech, word counts, errors, which request Terra answered; never the words)
to `.terra-log.jsonl` (ignored by git). Any static server works for everything else, including GitHub Pages.

**Where it starts:** opened from a link, a bookmark or the address bar, the site goes to the Gallery
(`index.html` forwards there; Home from inside the site stays on Home). There Terra asks straight away which
map to explore: sea surface temperature, air temperature, vegetation or precipitation (keys 1 to 4, the
buttons, or by voice when she has finished: "vegetation", "number three"). How Terra talks (built-in voice,
screen reader, text only) is a smaller choice in the same dialog. The map then opens with where you start
(value, place, nearest country, continent) and the listening guide. Once per visit (tab); `?welcome` again.

Open a frame directly with `player.html?frame=sst` (or `t2m`, `ndvi`, `precip`).

Pages for the team (not linked from the site menu):

- `decoder-test.html`: explore any frame, see every decoding step, run the ten-point check
- `decoder-test.html?frame=t2m&fill=1`: open a frame with the ten-point table filled in
- `decoder-test.html?auto=1`: run every frame's decoder self-tests and print the results as JSON
- `audio-test.html`: a slider that plays the tone for any value in a legend range
- `tests/player-test.html`: automated checks of the Player (see below)
- `tests/pages-test.html`: structure and accessibility checks of all six pages

## Tests

`tests/player-test.html` loads the Player for every frame and checks it with simulated
key and pointer events: audio waits for a gesture, arrow keys and Shift, narration identical
to the panel, higher value always higher pitch on one scale, stereo pan, no-data click,
tone stops on leaving the map, volume limit and compressor, M, S, ?, reference tones,
Explain this sound, Summary, Go to warmest / Next warmest / Go to coolest, Compare,
`touch-action: none`, no script errors, and a clear message for an unknown frame. Simulated events do not count as user gestures, so run Chrome with
`--autoplay-policy=no-user-gesture-required`, or click the test page once as it starts:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --autoplay-policy=no-user-gesture-required http://localhost:8000/tests/player-test.html
```

`tools/sr_sim.py` is a screen-reader simulation: it drives Chrome through the DevTools protocol and prints
what a screen reader would get: the page in reading order from Chrome's accessibility tree (what VoiceOver,
NVDA and JAWS read), what each Tab stop announces, and every live announcement while keys are pressed.
Standard library only; run it with the site served on port 8931:

```sh
python3 tools/sr_sim.py            # Home page: reading order and the first Tab stops
```

`tools/terra_voice_test.py` tests Terra end to end with Chrome's real (online) speech recognizer: it makes
recordings of "Terra, are you still listening?", "Terra, take me to Japan." and "Hey Terra, where am I?" in
nine Mac voices and plays them to Terra through a virtual microphone (an audio track the recognizer listens
to), so Terra hears what Google makes of them, as with a person speaking. `--talk 0.3` adds two people
talking all the time underneath. On 2026-11-14: 27/27 answered in quiet; with constant talk underneath about
half (the misses: Google lost or garbled the request under the voices).

```sh
python3 tools/terra_voice_test.py              # quiet room
python3 tools/terra_voice_test.py --talk 0.3   # people talking nearby
```

Import `ScreenReaderSim` from it to script longer walks (open, read, tab, key, type_text, heard).

These tests check our code. They do not replace testing with real screen readers, real
phones, and blind and low-vision people.

## How it works

1. Each frame is a NASA visualization with a color legend.
2. The app reads the color of the pixel under the pointer (median of a 3×3 square for JPEG frames).
3. It finds the closest color in the frame's legend table. If nothing is close enough
   (color distance over `maxColorDistance`), or the color is a known no-data color
   (land, water) or the point is under a logo or date label, it reports **no data**.
4. The matched legend entry gives an approximate value and a position `t` from 0 (lowest)
   to 1 (highest). Pitch = 220 Hz × 4^t (220 to 880 Hz, the same for every frame);
   stereo pan = −0.8 at the left edge to +0.8 at the right. No data = silence plus one click.

## Sound settings

All in `js/settings.js`, starting from the plan's values: 220–880 Hz exponential, sine
wave (triangle for snow), pan ±0.8, volume starts at 30% with a hard cap on the master
gain and a compressor, 30 ms ramps, 8-second scan, 1-second reference tones. None have
been changed after user testing yet; record any change and the reason here.

## Files

```
index.html  gallery.html  player.html  how-it-works.html  accessibility.html  credits.html
decoder-test.html  audio-test.html  tests/player-test.html   team test pages
css/styles.css           all styles; light and dark, high contrast
js/settings.js           every sound setting in one place (including the sound cues)
js/prefs.js              the listener's settings, remembered in this browser
js/display.js            high contrast, large text, reduced motion on every page
js/accuracy.js           the ten-point table on How it works, decoded live
js/places.js             country names, "about 60 km west of Israel", finding named places
js/welcome.js            the first-visit voice question
js/assistant.js          Terra: listening, typing, conversation, commands for every page
js/player-assistant.js   Terra's Player commands
js/site.js               welcome question and Terra on pages other than the Player
js/decoder.js            pixel color -> legend value (the core)
js/audio.js              Web Audio engine: one voice, ramps, pan, compressor, mute, click
js/player.js             the Player: pointer, keyboard, scan, reference tones, Explain panel
js/narrator.js           info panel and narration text (same strings), optional speech
js/analysis.js           whole-frame facts from decoded values: areas, pattern, differences
js/legend.js             draws legends, builds low/middle/high reference tones
js/home.js               Home page sound check
js/gallery.js            gallery cards from data/frames.json
js/credits.js            credits from data/frames.json
js/decoder-test.js       decoder test page
js/audio-test.js         audio test page
data/frames.json         one entry per frame: facts, legend table, no-data colors, masks
data/accuracy.json       real MUR values at the ten-point pixels, with source and date
data/countries.json      country names and simplified borders (Natural Earth, public domain)
tools/build_countries.py builds data/countries.json from Natural Earth
tools/sr_sim.py          screen-reader simulation (accessibility tree, Tab order, live announcements)
tools/terra_voice_test.py Terra end to end with Chrome's real recognizer, fed recorded requests (macOS)
frames/<id>/             self-hosted frame images and NASA colorbars
tools/build_legends.py   rebuilds the legend tables from NASA's colorbars (needs Pillow)
tools/legend_report.py   finds colors that could be confused
tools/compare_sst_with_mur.py  checks decoded SST against the real MUR data
tools/sources/           full-resolution colorbars used for measuring
docs/legends.md          how every legend number was measured
docs/accuracy-check.md   ten-point checks and the comparison with real data
docs/LOG.md              project log: status board, your tasks, history
```

`data/frames.json` follows the plan's format (`legend: [{color, value}]`,
`noDataColors`, `maxColorDistance`, `mapArea`) with a few additions:
`t` on each legend entry (position on the legend, used for pitch), `legendInfo`
(units, range, legend step, display rounding), `masks` (logo and date boxes),
labels on `noDataColors` (so the app can say "land" instead of just "no data"),
`smoothRadius`, `transparent`, `dateNote`, `listenFor`, `spokenName` (the short
name used at the start of each narration line) and `terms` (words such as "warmest").

To rebuild the legends after changing a colorbar measurement:

```sh
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/build_legends.py
python3 tools/legend_report.py
```

## Updating the frames to NASA's latest data

```sh
python3 tools/update_frames.py --check   # what is new at NASA
python3 tools/update_frames.py           # download it into frames/ and update data/frames.json
```

Frames with a fixed "latest" address at NASA (`updateUrl` in frames.json: sea surface temperature, precipitation,
vegetation) are downloaded, checked to be the same kind and size of picture, and their `imageUpdated`,
`downloaded` and `date` are updated. The tool also downloads the date image NASA publishes with them
(`frames/sst/frame-dated.jpg`, `frames/precip/date-stamp.png`): read it and put the data date in `date`.
The air temperature frame is a 2023 preview still with no latest version, so it is left alone. The site
itself never downloads anything, so the demo still works offline. After updating: open each frame in the
Player, run the tests, and commit.

## Data sources

All frames come from the [Daily Visualizations gallery](https://svs.gsfc.nasa.gov/gallery/daily-visualizations)
of NASA's Scientific Visualization Studio, made for NASA's Earth Information Center.
They were downloaded on 2026-11-05.

| Frame | Source | Date | Data |
|---|---|---|---|
| Sea Surface Temperature | [SVS 5101](https://svs.gsfc.nasa.gov/5101/) | Data date not stated; image updated 2026-11-05 | MUR SST (JPL PO.DAAC) |
| Near-Surface Air Temperature | [SVS 5147](https://svs.gsfc.nasa.gov/5147/) | 15 Aug 2023, 09:00 EDT | GEOS-FP (NASA GMAO) |
| Land Vegetation (NDVI) | [SVS 5544](https://svs.gsfc.nasa.gov/5544/) | 13 Jun 2026 | NRT NDVI (dataset not named on the page) |
| Precipitation | [SVS 4285](https://svs.gsfc.nasa.gov/4285/) | 2026-11-05 09:30 (time zone not stated) | IMERG (GPM) |

Full credit text for each frame is in `data/frames.json` and on the Credits page.
The accuracy check also uses JPL MUR SST v4.1 read from NOAA CoastWatch's public
ERDDAP server (dataset `jplMURSST41`); it is not used by the website itself.

## Known limitations

- **Values are approximate.** They are decoded from the colors of the visualization,
  not from the underlying measurements.
- **JPEG noise.** Three frames are JPEGs, so colors are slightly noisy. The decoder takes
  the median of a 3×3 square. Against the real MUR data, decoded SST had a median error
  of 0.7 °C and a worst error of 1.8 °C (336 points).
- **Similar colors.** On the air temperature frame, dark blue (about −38 °C) and
  purple-blue (about −11 °C) are closer in color than we would like. Tests found no
  mix-ups, but a surprising reading on that frame deserves a second look.
- **NASA colorbar typo.** The air temperature colorbar prints "−10" where −30 belongs.
  We use −30 (see docs/legends.md).
- **Ends of the scale.** A color at either end of a legend is reported as "or lower" /
  "or higher", because the bar cannot show anything beyond it.
- **Relative frame.** The NDVI legend has no numbers, so its values are relative.
- **Dates.** The air temperature (2023) and NDVI (June 2026) frames are the preview stills
  SVS publishes, not today's data. The SST image has no printed date.
- **Time stepping.** SVS does not list the individual daily frames, so we do not yet have
  several dates of one frame. The Player therefore shows no date controls, as the plan says
  for frames without dated versions.
- **Home page sound check.** Browsers start sound fresh on every page, so the Player has its
  own Start audio button. Tapping the map or pressing a key on it also starts sound.
- **Vibration** works only in browsers that support it (mostly Android); not on iPhone.
- **Nothing has been tested with blind or low-vision users yet.**

## Credits

Visualizations: NASA's Scientific Visualization Studio (full credits in `data/frames.json`
and on the Credits page). No third-party libraries or fonts are used.

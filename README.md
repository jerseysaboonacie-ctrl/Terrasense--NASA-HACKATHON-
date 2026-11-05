# TerraSense Jukebox

Hear NASA's Earth Information Center visualizations. Pick a frame, move a finger,
cursor or the arrow keys across it, and hear the data under the pointer.
Built for the NASA Space Apps Challenge 2026 challenge "The Earth Information Jukebox".

TerraSense Jukebox is a hackathon project. It is not endorsed by NASA.

## Status

| Plan step | State |
|---|---|
| 2. Skeleton: six pages, navigation, skip link, mobile layout | Done |
| 3. Data and gallery: `data/frames.json`, gallery and credits read from it | Done |
| 4. Decoder and test page | Done, validated (see [docs/accuracy-check.md](docs/accuracy-check.md)) |
| 5. Audio engine | Next |
| 6–10. Player, keyboard and narration, legends, scan and time, polish | Not started |

## Run it

No build step and no internet needed once the files are on your computer.

```sh
cd "Terrasense (NASA HACKATHON)"
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The site must be served, not opened as a file:
browsers block pixel reading on `file://` pages.

Useful pages while building:

- `decoder-test.html`: explore any frame, see every decoding step, run the ten-point check
- `decoder-test.html?frame=t2m&fill=1`: open a frame with the ten-point table filled in
- `decoder-test.html?auto=1`: run every frame's self-tests and print the results as JSON

## How it works

1. Each frame is a NASA visualization with a colour legend.
2. The app reads the colour of the pixel under the pointer (median of a 3×3 square for JPEG frames).
3. It finds the closest colour in the frame's legend table. If nothing is close enough
   (colour distance over `maxColorDistance`), or the colour is a known no-data colour
   (land, water) or the point is under a logo or date label, it reports **no data**.
4. The matched legend entry gives an approximate value and a position `t` from 0 (lowest)
   to 1 (highest). From step 5, `t` sets the pitch.

## Files

```
index.html  gallery.html  player.html  how-it-works.html  accessibility.html  credits.html
decoder-test.html        decoder test page (step 4)
css/styles.css           all styles; light and dark, high contrast
js/decoder.js            pixel colour -> legend value (the core)
js/gallery.js            gallery cards from data/frames.json
js/credits.js            credits from data/frames.json
js/decoder-test.js       decoder test page
data/frames.json         one entry per frame: facts, legend table, no-data colours, masks
frames/<id>/             self-hosted frame images and NASA colourbars
tools/build_legends.py   rebuilds the legend tables from NASA's colourbars (needs Pillow)
tools/legend_report.py   finds colours that could be confused
tools/compare_sst_with_mur.py  checks decoded SST against the real MUR data
tools/sources/           full-resolution colourbars used for measuring
docs/legends.md          how every legend number was measured
docs/accuracy-check.md   ten-point checks and the comparison with real data
```

`data/frames.json` follows the plan's format (`legend: [{color, value}]`,
`noDataColors`, `maxColorDistance`, `mapArea`) with a few additions:
`t` on each legend entry (position on the legend, used for pitch), `legendInfo`
(units, range, legend step, display rounding), `masks` (logo and date boxes),
labels on `noDataColors` (so the app can say "land" instead of just "no data"),
`smoothRadius`, `transparent`, `dateNote` and `listenFor`.

To rebuild the legends after changing a colourbar measurement:

```sh
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
.venv/bin/python tools/build_legends.py
python3 tools/legend_report.py
```

## Data sources

All frames come from the [Daily Visualizations gallery](https://svs.gsfc.nasa.gov/gallery/daily-visualizations)
of NASA's Scientific Visualization Studio, made for NASA's Earth Information Center.
They were downloaded on 2026-11-05.

| Frame | Source | Date | Data |
|---|---|---|---|
| Sea Surface Temperature | [SVS 5101](https://svs.gsfc.nasa.gov/5101/) | Most recent on 2026-11-05 (not printed on the image) | MUR SST (JPL PO.DAAC) |
| Near-Surface Air Temperature | [SVS 5147](https://svs.gsfc.nasa.gov/5147/) | 15 Aug 2023, 09:00 EDT | GEOS-FP (NASA GMAO) |
| Land Vegetation (NDVI) | [SVS 5544](https://svs.gsfc.nasa.gov/5544/) | 13 Jun 2026 | NRT NDVI (dataset not named on the page) |
| Precipitation | [SVS 4285](https://svs.gsfc.nasa.gov/4285/) | 2026-11-05 09:30 (time zone not stated) | IMERG (GPM) |

Full credit text for each frame is in `data/frames.json` and on the Credits page.
The accuracy check also uses JPL MUR SST v4.1 read from NOAA CoastWatch's public
ERDDAP server (dataset `jplMURSST41`); it is not used by the website itself.

## Known limitations

- **Values are approximate.** They are decoded from the colours of the visualization,
  not from the underlying measurements.
- **JPEG noise.** Three frames are JPEGs, so colours are slightly noisy. The decoder takes
  the median of a 3×3 square. Against the real MUR data, decoded SST had a median error
  of 0.7 °C and a worst error of 1.8 °C (336 points).
- **Similar colours.** On the air temperature frame, dark blue (about −38 °C) and
  purple-blue (about −11 °C) are closer in colour than we would like. Tests found no
  mix-ups, but a surprising reading on that frame deserves a second look.
- **NASA colourbar typo.** The air temperature colourbar prints "−10" where −30 belongs.
  We use −30 (see docs/legends.md).
- **Ends of the scale.** A colour at either end of a legend is reported as "or lower" /
  "or higher", because the bar cannot show anything beyond it.
- **Relative frame.** The NDVI legend has no numbers, so its values are relative.
- **Dates.** The air temperature (2023) and NDVI (June 2026) frames are the preview stills
  SVS publishes, not today's data. The SST image has no printed date.
- **Time stepping.** SVS does not list the individual daily frames, so we do not yet have
  several dates of one frame. Time stepping is not built.
- **Nothing has been tested with blind or low-vision users yet.**

## Credits

Visualizations: NASA's Scientific Visualization Studio (full credits in `data/frames.json`
and on the Credits page). No third-party libraries or fonts are used.

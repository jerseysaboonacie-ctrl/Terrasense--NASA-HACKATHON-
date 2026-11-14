# How the legends were measured

The decoder only knows what `data/frames.json` tells it. This page records how
every number in that file was found, so anyone can repeat or challenge it.
All measurements were made on 2026-11-05.

## Where the frames come from

All four frames come from the NASA SVS
[Daily Visualizations gallery](https://svs.gsfc.nasa.gov/gallery/daily-visualizations),
which collects the visualizations NASA's Earth Information Center updates daily.
Each frame's source page, source file and credit are in `data/frames.json`.

| Frame | SVS page | File used | Why this file |
|---|---|---|---|
| Sea surface temperature | [5101](https://svs.gsfc.nasa.gov/5101/) | `sst_mur_no-dates_most_recent_print.jpg` (1024×512) | Latest frame, no text overlays |
| Near-surface air temperature | [5147](https://svs.gsfc.nasa.gov/5147/) | `MC01_..._en.00001_print.jpg` (1024×512) | Only still image published; dated 15 Aug 2023 |
| Vegetation (NDVI) | [5544](https://svs.gsfc.nasa.gov/5544/) | `nrtndvi_equi_print.jpg` (1024×512) | Only still image published; dated 13 Jun 2026 |
| Precipitation | [4285](https://svs.gsfc.nasa.gov/4285/) | `imergert_alpha.now.png` (3600×1800) | Lossless PNG, precipitation only (no background map) |

The individual daily frames inside SVS "Frames" folders are not listed by the
server, so we used the still images each page publishes. Time stepping
(several dates of one frame) therefore needs more work; see the README.

## Continuous colorbars

For each bar we found the pixel position of the first and last value, using the
white tick marks and bar borders, and read colors in between along a
straight line. `tools/build_legends.py` holds the numbers; run it to rebuild
the tables.

### Sea surface temperature (`tools/sources/sst_mur_colorbar.png`, 3840×2160)

- Ticks for 0, 5, 10, 15, 20, 25, 30 °C are at x = 837, 1198, 1559, 1920, 2280, 2641, 3002.
  That is a steady 72.17 px per °C, so −5 °C is at x = 476.2 and 35 °C at x = 3362.8.
- Colors are the median of rows 1050–1150, below the tick marks.
- 161 entries, one every 0.25 °C. Values are shown rounded to 1 °C.

### Near-surface air temperature (`tools/sources/NearSurfaceTemperature_colorbar_plain.png`, 528×165)

- Bar borders at x = 71–72 and 463–464. Seven inner ticks every ~48.9 px, so the bar
  has 8 equal intervals: −40 °C at x = 72.5 and 40 °C at x = 463.5.
- **NASA's colorbar labels its second tick "−10".** By position it must be −30 °C
  (the labels read −40, −10, −20, −10, 0, 10, 20, 30, 40, with even spacing).
  We use −30. This is the only place we depart from the printed text.
- Colors are the median of rows 84–103. 161 entries, one every 0.5 °C.
- The hot end of this color scale fades to grey. Grey areas such as the Sahara
  therefore decode as "40 °C or higher", which is what the legend says.

### Vegetation, NDVI (`frames/ndvi/colorbar.png`, 1000×250)

- Bar borders at x = 99–100 and 799–800. The bar has **no numbers**, only "Low" and
  "High", so values are stored as 0 (Low) to 1 (High) and always described as relative.
- Colors are the median of rows 106–146. 101 entries, one every 1% of the bar.

## Precipitation (discrete classes)

- Two bars, liquid (`colorbar-rain.png`) and frozen (`colorbar-snow.png`), each with ten
  solid blocks between the labels 0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5, 10, 20 and 50 mm/hour,
  plus a "more than 50" arrow.
- Colors are read at row 33 in the middle of each block.
- On the frozen bar, the 20–50 block and the arrow are the same color, so they are
  merged into one class, "20 mm/hour or more".
- The frame uses exactly 21 colors, and every one of them is a legend color. So
  this frame decodes exactly, with no compression noise. Transparent pixels mean
  no precipitation is shown (below 0.1 mm/hour, or no data); the image does not
  tell those two apart.

## No-data colors and masks

These were measured from the frame images by sampling pixels in known places.

| Frame | Color or area | Meaning | How we know |
|---|---|---|---|
| SST | grey ≈ (103, 103, 103) | land | sampled over the Sahara, Asia, Antarctica |
| NDVI | blue ≈ (8, 123, 177) | water | sampled over the open ocean |
| NDVI | white (255, 255, 255) | not on the legend (Greenland ice) | sampled over Greenland |
| NDVI | pale pink (255, 236, 232) | not on the legend (Antarctica) | sampled over Antarctica. It is close to the legend's "Low" end, so it is listed explicitly to stop Antarctica decoding as "low vegetation" |
| T2M | x 0–178, y 0–39 | NASA and GMAO logo box | measured on an enlarged crop |
| T2M | x 0–252, y 460–511 | date label | measured on an enlarged crop |
| NDVI | x 0–171, y 461–511 | date label | measured on an enlarged crop |

## Ambiguity check

`python3 tools/legend_report.py` finds the most similar pair of legend colors that
are more than one legend step apart. Results on 2026-11-05:

| Frame | Closest pair more than one step apart | Color distance |
|---|---|---|
| SST | 1.5 °C vs 6.75 °C | 70.8 |
| T2M | −38.5 °C vs −11.5 °C | 40.5 |
| NDVI | 0.88 vs 0.99 | 15.8 (only just over one step apart, so harmless) |
| Precipitation | non-neighbouring classes | 52.0 |

The decoder accepts a match only if the color distance is 30 or less (3 for the
lossless precipitation frame). T2M is the frame to watch: a very noisy dark-blue
pixel could in theory be read as about −11 °C instead of about −38 °C. The noise
self-test (±8 per color channel) found no such error.

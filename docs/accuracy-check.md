# Accuracy check

The plan's gate for the decoder: ten pixels per frame, spread across the legend
range, decode to within one legend step of what the legend says. This file
records what has been checked, how, and what is still open.

Last run: 2026-11-05.

## 1. Comparison with the real data (sea surface temperature)

For the SST frame the underlying data is public, so we can check the decoder with
numbers instead of by eye. `tools/compare_sst_with_mur.py` takes a regular 32 × 16 grid
of decoded points (from `decoder-test.html?auto=1`) and compares every ocean point with
JPL MUR SST v4.1 (NOAA CoastWatch ERDDAP, dataset `jplMURSST41`).

| MUR day | Ocean points | Mean error | Median error | 95th percentile | Worst | Within one legend step (5 °C) |
|---|---|---|---|---|---|---|
| 2026-11-04 | 336 | +0.03 °C | 0.70 °C | 1.25 °C | 1.84 °C | 100% |
| 2026-11-03 | 336 | +0.00 °C | 0.70 °C | 1.31 °C | 2.58 °C | 100% |

The frame matches the 2026-11-04 analysis slightly better, but the frame itself carries
no date, so we do not claim one.

## 2. Automatic self-tests (all frames)

Run in Chrome by `decoder-test.html?auto=1`. All passed.

| Test | SST | T2M | NDVI | Precipitation |
|---|---|---|---|---|
| Round trip: every legend color decodes to itself | PASS (0.00 steps) | PASS (0.05 steps) | PASS (0.00 steps) | PASS (exact) |
| Noise ±8 per channel, worst error | PASS (0.25 steps) | PASS (0.25 steps) | PASS (0.80 steps) | PASS (exact) |
| Higher value always higher legend position | PASS | PASS | PASS | PASS |
| Masks and no-data colors never give a value | PASS | PASS | PASS | PASS |

Coverage (share of the frame that decodes to a value): SST 65% (land 33%, off-legend 2%,
mostly coastlines); T2M 96% (logo and date boxes 4%); NDVI 21% (water 64%, ice 10%,
off-legend 4%, date box 2%); precipitation 6% (the rest shows no precipitation).

## 3. Ten-point checks

Points chosen automatically by the decoder test page ("Fill with 10 points"), spread from
the lowest to the highest value found on each frame, plus two no-data examples.

**Still to do by the team:** open `decoder-test.html?frame=<id>&fill=1`, compare each zoomed
pixel with NASA's colorbar, type your reading in the "By eye" column, and paste the
Markdown export here. The plan asks for this to be done by people, not only by the code.

### Sea surface temperature

| # | Place | Pixel x, y | Pixel color | Legend color | Distance | Decoded | Real (MUR 2026-11-04) | By eye | Within one step? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 83° N, 79° W | 286, 18 | 2, 52, 94 | 0, 51, 93 | 2.4 | about −3 °C | −1.8 °C |  |  |
| 2 | 78° N, 1° W | 510, 34 | 0, 96, 170 | 0, 99, 167 | 4.2 | about 1 °C | 1.5 °C |  |  |
| 3 | 72° N, 21° E | 570, 50 | 10, 142, 207 | 0, 140, 210 | 10.6 | about 5 °C | 6.5 °C |  |  |
| 4 | 65° N, 7° E | 530, 70 | 106, 177, 228 | 102, 181, 230 | 6 | about 9 °C | 9.8 °C |  |  |
| 5 | 54° N, 4° E | 522, 102 | 178, 212, 242 | 178, 216, 246 | 5.7 | about 13 °C | 14.0 °C |  |  |
| 6 | 50° N, 1° W | 510, 114 | 246, 223, 180 | 254, 221, 176 | 9.2 | about 17 °C | 15.7 °C |  |  |
| 7 | 44° N, 39° E | 622, 130 | 212, 178, 120 | 226, 172, 119 | 15.3 | about 21 °C | 19.0 °C |  |  |
| 8 | 37° N, 65° W | 326, 150 | 191, 117, 79 | 194, 116, 81 | 3.7 | about 25 °C | 24.6 °C |  |  |
| 9 | 27° N, 72° W | 306, 178 | 151, 54, 44 | 152, 54, 48 | 4.1 | about 29 °C | 28.3 °C |  |  |
| 10 | 26° N, 53° E | 662, 182 | 99, 35, 38 | 98, 34, 38 | 1.4 | about 33 °C | 32.1 °C |  |  |
| 11 | 83° N, 75° W | 298, 18 | 35, 62, 99 |  | 35.7 | no data (color is not on the legend) | n/a |  |  |
| 12 | 83° N, 37° W | 406, 18 | 88, 91, 97 | 103, 103, 103 | 20.1 | no data (Land, no sea temperature data) | n/a |  |  |

The "Real" column is the MUR SST analysis at the same point (NOAA CoastWatch ERDDAP, `jplMURSST41`). All ten decoded values are within 2.0 °C of it; one legend step is 5 °C.

### Near-surface air temperature

| # | Place | Pixel x, y | Pixel color | Legend color | Distance | Decoded | By eye | Within one step? |
|---|---|---|---|---|---|---|---|---|
| 1 | 70° S, 63° E | 690, 454 | 41, 50, 93 | 43, 51, 90 | 3.7 | −40 °C or lower |  |  |
| 2 | 68° S, 56° E | 670, 450 | 155, 181, 218 | 153, 177, 215 | 5.4 | about −31 °C |  |  |
| 3 | 64° S, 15° W | 470, 438 | 199, 162, 193 | 198, 157, 193 | 5.1 | about −22 °C |  |  |
| 4 | 76° N, 50° W | 370, 38 | 79, 31, 132 | 79, 31, 132 | 0 | about −13 °C |  |  |
| 5 | 79° N, 37° W | 406, 30 | 28, 68, 226 | 27, 67, 225 | 1.7 | about −4 °C |  |  |
| 6 | 83° N, 43° W | 390, 18 | 151, 233, 185 | 150, 237, 187 | 4.6 | about 5 °C |  |  |
| 7 | 72° N, 109° E | 822, 50 | 224, 199, 57 | 228, 200, 65 | 9 | about 14 °C |  |  |
| 8 | 67° N, 54° E | 666, 66 | 199, 54, 26 | 195, 51, 27 | 5.1 | about 22 °C |  |  |
| 9 | 54° N, 23° E | 578, 102 | 69, 10, 3 | 68, 12, 4 | 2.4 | about 31 °C |  |  |
| 10 | 40° N, 32° E | 602, 142 | 119, 119, 119 | 119, 121, 118 | 2.2 | 40 °C or higher |  |  |
| 11 | 89° N, 179° W | 2, 2 |  |  |  | no data (covered by the NASA and GMAO logo) |  |  |
| 12 | 76° N, 62° W | 334, 38 | 110, 184, 199 |  | 35.3 | no data (color is not on the legend) |  |  |

### Vegetation (NDVI)

| # | Place | Pixel x, y | Pixel color | Legend color | Distance | Decoded | By eye | Within one step? |
|---|---|---|---|---|---|---|---|---|
| 1 | 79° N, 85° W | 270, 30 | 211, 212, 207 | 222, 210, 207 | 11.2 | lowest on the legend (relative) |  |  |
| 2 | 71° N, 97° E | 786, 54 | 210, 213, 175 | 225, 202, 172 | 18.8 | about 10% of the way from low to high (relative) |  |  |
| 3 | 68° N, 81° E | 742, 62 | 174, 189, 140 | 199, 186, 125 | 29.3 | about 20% of the way from low to high (relative) |  |  |
| 4 | 69° N, 105° E | 810, 58 | 160, 170, 101 | 165, 178, 89 | 15.3 | about 30% of the way from low to high (relative) |  |  |
| 5 | 69° N, 154° E | 950, 58 | 127, 145, 56 | 118, 159, 78 | 27.6 | about 40% of the way from low to high (relative) |  |  |
| 6 | 68° N, 127° W | 150, 62 | 98, 135, 43 | 84, 132, 65 | 26.2 | about 60% of the way from low to high (relative) |  |  |
| 7 | 68° N, 28° E | 590, 62 | 64, 114, 40 | 70, 105, 50 | 14.7 | about 70% of the way from low to high (relative) |  |  |
| 8 | 67° N, 159° W | 58, 66 | 42, 81, 27 | 39, 87, 39 | 13.7 | about 80% of the way from low to high (relative) |  |  |
| 9 | 62° N, 50° E | 654, 78 | 28, 60, 18 | 16, 79, 33 | 27 | about 90% of the way from low to high (relative) |  |  |
| 10 | 64° N, 47° E | 646, 74 | 25, 58, 15 | 2, 69, 28 | 28.6 | highest on the legend (relative) |  |  |
| 11 | 89° N, 179° W | 2, 2 | 8, 123, 177 | 8, 123, 177 | 0 | no data (Water, no vegetation value) |  |  |
| 12 | 83° N, 40° W | 398, 18 | 73, 152, 193 |  | 121.3 | no data (color is not on the legend) |  |  |

### Precipitation

| # | Place | Pixel x, y | Pixel color | Legend color | Distance | Decoded | By eye | Within one step? |
|---|---|---|---|---|---|---|---|---|
| 1 | 82° N, 48° E | 2281, 84 | 69, 255, 255 | 69, 255, 255 | 0 | about 0.1 to 0.2 mm/hour, snow (frozen) |  |  |
| 2 | 82° N, 49° E | 2294, 84 | 73, 221, 255 | 73, 221, 255 | 0 | about 0.2 to 0.3 mm/hour, snow (frozen) |  |  |
| 3 | 80° N, 47° E | 2268, 97 | 77, 187, 255 | 77, 187, 255 | 0 | about 0.3 to 0.5 mm/hour, snow (frozen) |  |  |
| 4 | 80° N, 48° E | 2281, 97 | 79, 154, 255 | 79, 154, 255 | 0 | about 0.5 to 1 mm/hour, snow (frozen) |  |  |
| 5 | 70° N, 35° W | 1449, 201 | 81, 122, 255 | 81, 122, 255 | 0 | about 1 to 2 mm/hour, snow (frozen) |  |  |
| 6 | 69° N, 35° W | 1449, 214 | 83, 70, 255 | 83, 70, 255 | 0 | about 3 to 5 mm/hour, snow (frozen) |  |  |
| 7 | 69° N, 34° W | 1462, 214 | 90, 47, 217 | 90, 47, 217 | 0 | about 5 to 10 mm/hour, snow (frozen) |  |  |
| 8 | 69° N, 31° W | 1488, 214 | 115, 33, 187 | 115, 33, 187 | 0 | about 10 to 20 mm/hour, snow (frozen) |  |  |
| 9 | 37° N, 147° E | 3269, 526 | 200, 0, 0 | 200, 0, 0 | 0 | about 20 to 50 mm/hour, rain |  |  |
| 10 | 26° N, 57° W | 1228, 643 | 145, 0, 0 | 145, 0, 0 | 0 | about 50 mm/hour or more, rain |  |  |
| 11 | 89° N, 179° W | 6, 6 | 0, 0, 0 |  |  | no data (No precipitation shown (below 0.1 mm/hour, or no data)) |  |  |


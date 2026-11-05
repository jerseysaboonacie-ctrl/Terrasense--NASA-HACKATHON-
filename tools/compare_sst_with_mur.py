"""
Compare decoded sea surface temperature with the real MUR SST data.

This answers "is the decoder right?" with numbers instead of by eye, for the
one frame where the underlying data is publicly available point by point.

Steps
1. Serve the site (python3 -m http.server 8000) and open
   http://localhost:8000/decoder-test.html?auto=1
   When the page title says AUTO DONE, copy the JSON shown at the bottom of
   the page into a file, e.g. auto.json.
2. Run:  python3 tools/compare_sst_with_mur.py auto.json 2026-11-04
   (the date is the MUR analysis day to compare with).

Data: JPL MUR SST v4.1 (dataset jplMURSST41), read from NOAA CoastWatch's
public ERDDAP server. Standard library only, no API key needed.
"""

import csv
import io
import json
import statistics
import sys
import urllib.parse
import urllib.request

ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.csv"


def fetch_mur(date):
    # The decoder test grid is 32 x 16 points at pixel centres; on a 1024 x 512
    # equirectangular frame that is every 11.25 degrees, i.e. every 1125 MUR
    # cells (MUR is 0.01 degree). One request returns the whole grid.
    query = "?analysed_sst[(%sT09:00:00Z)][(-84.551):1125:(84.2)][(-174.2):1125:(174.551)]" % date
    url = ERDDAP + urllib.parse.quote(query, safe="?=:(),")
    with urllib.request.urlopen(url, timeout=120) as res:
        rows = list(csv.reader(io.StringIO(res.read().decode("utf-8"))))[2:]
    return {(float(r[1]), float(r[2])): (None if r[3] == "NaN" else float(r[3])) for r in rows}


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    auto = json.load(open(sys.argv[1], encoding="utf-8"))
    grid = next(f for f in auto if f["id"] == "sst")["grid"]
    mur = fetch_mur(sys.argv[2])

    errors, flagged, missing = [], [], 0
    for p in grid:
        key = min(mur, key=lambda k: abs(k[0] - p["lat"]) + abs(k[1] - p["lon"]))
        real = mur[key]
        if real is None:
            missing += 1
            continue
        err = p["value"] - real
        errors.append(err)
        if abs(err) > 5:  # more than one legend step (5 °C)
            flagged.append((round(p["lat"], 2), round(p["lon"], 2), p["value"], round(real, 2)))

    abs_err = sorted(abs(e) for e in errors)
    print("MUR date %s: %d ocean points compared, %d with no MUR value" % (sys.argv[2], len(errors), missing))
    print("mean error %+.2f °C, median |error| %.2f °C, 95th percentile %.2f °C, max %.2f °C"
          % (statistics.mean(errors), statistics.median(abs_err), abs_err[int(0.95 * len(abs_err))], abs_err[-1]))
    print("within 1 °C: %.0f%%, within one legend step (5 °C): %.0f%%"
          % (100 * sum(a <= 1 for a in abs_err) / len(abs_err), 100 * sum(a <= 5 for a in abs_err) / len(abs_err)))
    print("more than one legend step off:", flagged or "none")


if __name__ == "__main__":
    main()

"""
Ambiguity report for the legend tables.

Run:   python3 tools/legend_report.py      (standard library only)

Why: the decoder picks the legend colour closest to the pixel colour. If two
parts of a colourbar that mean very different values have similar colours,
a slightly noisy pixel (JPEG compression) could be decoded to the wrong one.
This script finds, for every legend, the most similar pair of colours that are
more than one legend step (tickStep) apart in value. If that colour distance is
not comfortably bigger than the decoder's match limit, the legend is risky.
"""

import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES_JSON = os.path.join(ROOT, "data", "frames.json")


def entries_of(frame):
    if frame["legendInfo"]["kind"] == "continuous":
        return [(e["value"], e["t"], e["color"]) for e in frame["legend"]]
    # discrete: compare classes by their position t; one class = one step
    return [(c["t"], c["t"], c["color"]) for c in frame["legend"]]


def main():
    for frame in json.load(open(FRAMES_JSON, encoding="utf-8"))["frames"]:
        items = entries_of(frame)
        if frame["legendInfo"]["kind"] == "continuous":
            step = frame["legendInfo"]["tickStep"]
        else:
            # classes are spread evenly on t; skip neighbouring classes
            ts = sorted({t for _, t, _ in items})
            step = (ts[1] - ts[0]) * 1.01
        worst = None
        for i, (vi, ti, ci) in enumerate(items):
            for vj, tj, cj in items[i + 1:]:
                if abs(vi - vj) <= step + 1e-9:
                    continue
                d = math.dist(ci, cj)
                if worst is None or d < worst[0]:
                    worst = (d, vi, ci, vj, cj)
        d, vi, ci, vj, cj = worst
        print("%-7s closest colours more than one step apart: distance %.1f  (%s at %g  vs  %s at %g)"
              % (frame["id"], d, ci, vi, cj, vj))


if __name__ == "__main__":
    main()

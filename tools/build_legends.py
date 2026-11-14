"""
Build the legend tables (color -> value) that the decoder uses.

Run:   python3 tools/build_legends.py          (needs Pillow: pip install -r tools/requirements.txt)
Output: fills the "legend" and "legendInfo" fields of each frame in
        data/frames.json (all other fields are left exactly as they are).

The legend table is the single source of truth for what a color means.
Nothing in here is invented: every color is read from NASA's own colorbar
image, and every value comes from the tick labels printed on that colorbar.

How a continuous colorbar is read
----------------------------------
1. We measured, once, the pixel x-position of the first and last tick on
   each colorbar (see the numbers in LEGENDS below, and docs/legends.md for
   how they were measured).
2. Between those two ticks the bar is linear, so value v sits at
       x = x_min + (v - v_min) / (v_max - v_min) * (x_max - x_min)
3. At that x we take the median color of a band of rows in the middle of the
   bar (median ignores anti-aliasing and tick marks).

Discrete colorbars (precipitation) are read class by class: each solid block
of color between two ticks becomes one class with a low and high value.
"""

import json
import os
import statistics
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is missing. Run: pip install -r tools/requirements.txt")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAMES_JSON = os.path.join(ROOT, "data", "frames.json")

# ---------------------------------------------------------------------------
# Continuous legends. Pixel positions were measured from the colorbar images
# (white tick marks / bar borders). See docs/legends.md.
# ---------------------------------------------------------------------------
LEGENDS = [
    {
        "id": "sst",
        "title": "Sea Surface Temperature",
        "units": "°C",
        "scale": "linear",
        "image": "tools/sources/sst_mur_colorbar.png",  # 3840x2160 original
        # Ticks at 0,5,...,30 are at x = 837,1198,1559,1920,2280,2641,3002
        # (72.17 px per °C), so -5 is at 476.2 and 35 at 3362.8.
        "v_min": -5.0, "x_min": 476.2,
        "v_max": 35.0, "x_max": 3362.8,
        "rows": (1050, 1150),      # middle of the bar, below the tick marks
        "x_clamp": (481, 3358),    # stay inside the bar, off the end borders
        "sample_step": 0.25,       # one table entry every 0.25 °C
        "tick_step": 5,            # labelled tick spacing = "one legend step"
        "display_step": 1,         # show values rounded to 1 °C
    },
    {
        "id": "t2m",
        "title": "Near-Surface Temperature (T2M)",
        "units": "°C",
        "scale": "linear",
        "image": "tools/sources/NearSurfaceTemperature_colorbar_plain.png",
        # Bar border at x=71-72 and 463-464, 7 inner ticks every ~48.9 px,
        # i.e. 8 equal intervals. Labels read -40 ... 40 in steps of 10.
        # NOTE: NASA's colorbar prints the 2nd label as "-10"; by position it
        # is -30 (evenly spaced ticks). See docs/legends.md.
        "v_min": -40.0, "x_min": 72.5,
        "v_max": 40.0, "x_max": 463.5,
        "rows": (84, 103),
        "x_clamp": (73, 462),
        "sample_step": 0.5,
        "tick_step": 10,
        "display_step": 1,
    },
    {
        "id": "ndvi",
        "title": "Land Vegetation (NDVI)",
        "units": "relative (Low to High)",
        "scale": "relative",       # colorbar has no numbers, only Low / High
        "image": "frames/ndvi/colorbar.png",
        # Bar border at x=99-100 and 799-800.
        "v_min": 0.0, "x_min": 100.5,
        "v_max": 1.0, "x_max": 799.5,
        "rows": (106, 146),
        "x_clamp": (101, 798),
        "sample_step": 0.01,
        "tick_step": 0.1,          # no ticks: we use tenths of the bar
        "display_step": 0.1,
    },
]

# ---------------------------------------------------------------------------
# Discrete legend: IMERG precipitation (two colorbars: rain and frozen).
# Class edges are the tick labels printed under the bars, in mm/hour:
#   0.1 0.2 0.3 0.5 1.0 2.0 3.0 5.0 10 20 50   plus a ">50" arrow on the right.
# Colors are read from row 33 of each colorbar at the middle of each block.
# ---------------------------------------------------------------------------
PRECIP_EDGES = [0.1, 0.2, 0.3, 0.5, 1.0, 2.0, 3.0, 5.0, 10, 20, 50]
PRECIP_BLOCK_X = [58, 94, 130, 166, 202, 238, 274, 310, 346, 382]  # block centres
PRECIP_ARROW_X = 406                                               # ">50" arrow
PRECIP_ROW = 33


def median_rgb(px, x, rows):
    """Median R, G and B over a vertical band of rows at column x."""
    r, g, b = [], [], []
    for y in range(rows[0], rows[1] + 1):
        p = px[x, y]
        r.append(p[0]); g.append(p[1]); b.append(p[2])
    return [int(statistics.median(r)), int(statistics.median(g)), int(statistics.median(b))]


def build_continuous(cfg):
    im = Image.open(os.path.join(ROOT, cfg["image"])).convert("RGB")
    px = im.load()
    entries = []
    n = round((cfg["v_max"] - cfg["v_min"]) / cfg["sample_step"])
    span = cfg["v_max"] - cfg["v_min"]
    for i in range(n + 1):
        v = cfg["v_min"] + i * cfg["sample_step"]
        t = (v - cfg["v_min"]) / span          # 0 = bottom of legend, 1 = top
        x = cfg["x_min"] + t * (cfg["x_max"] - cfg["x_min"])
        x = int(round(min(max(x, cfg["x_clamp"][0]), cfg["x_clamp"][1])))
        entries.append({"color": median_rgb(px, x, cfg["rows"]), "value": round(v, 4), "t": round(t, 4)})
    info = {
        "kind": "continuous",
        "title": cfg["title"],
        "units": cfg["units"],
        "scale": cfg["scale"],
        "min": cfg["v_min"],
        "max": cfg["v_max"],
        "tickStep": cfg["tick_step"],
        "displayStep": cfg["display_step"],
        "source": {
            "image": cfg["image"],
            "method": "median color of rows %d-%d, linear between x=%.1f (%g) and x=%.1f (%g)"
            % (cfg["rows"][0], cfg["rows"][1], cfg["x_min"], cfg["v_min"], cfg["x_max"], cfg["v_max"]),
        },
    }
    return cfg["id"], info, entries


def build_precip():
    classes = []
    n_classes = len(PRECIP_EDGES)  # 10 blocks + 1 arrow = 11 classes
    for family, image in (("rain", "frames/precip/colorbar-rain.png"),
                          ("frozen", "frames/precip/colorbar-snow.png")):
        px = Image.open(os.path.join(ROOT, image)).convert("RGB").load()
        for i, x in enumerate(PRECIP_BLOCK_X + [PRECIP_ARROW_X]):
            low = PRECIP_EDGES[i]
            high = PRECIP_EDGES[i + 1] if i + 1 < len(PRECIP_EDGES) else None
            rgb = list(px[x, PRECIP_ROW])
            prev = classes[-1] if classes else None
            if prev and prev["family"] == family and prev["color"] == rgb:
                # Same color as the class before it (the frozen bar uses one
                # color for 20-50 and >50), so the color cannot tell them
                # apart: merge them into one wider class ("20 or more").
                prev["high"] = high
                continue
            classes.append({
                "color": rgb,
                "value": low,       # lower edge of the class
                "high": high,       # upper edge (None = "or more")
                "family": family,
                # Pitch position: class index spread evenly 0..1 (the bar is
                # drawn with equal-width blocks, so this follows the legend).
                "t": round((i + 0.5) / n_classes, 4),
            })
    info = {
        "kind": "discrete",
        "title": "Precipitation Rate (liquid and frozen)",
        "units": "mm/hour",
        "scale": "classes",
        "min": PRECIP_EDGES[0],
        "max": PRECIP_EDGES[-1],
        "tickStep": 1,      # one class
        "displayStep": None,
        "source": {
            "image": "frames/precip/colorbar-rain.png + colorbar-snow.png",
            "method": "color at row %d in the middle of each class block; edges from tick labels" % PRECIP_ROW,
        },
    }
    return "precip", info, classes


def to_json(value, indent=0):
    """Pretty JSON that keeps short objects and lists (like legend entries)
    on one line, so frames.json stays readable."""
    one_line = json.dumps(value, ensure_ascii=False)
    if len(one_line) <= 100 or not isinstance(value, (dict, list)):
        return one_line
    pad = "  " * (indent + 1)
    if isinstance(value, dict):
        items = ['%s%s: %s' % (pad, json.dumps(k, ensure_ascii=False), to_json(v, indent + 1))
                 for k, v in value.items()]
        return "{\n" + ",\n".join(items) + "\n" + "  " * indent + "}"
    items = [pad + to_json(v, indent + 1) for v in value]
    return "[\n" + ",\n".join(items) + "\n" + "  " * indent + "]"


def main():
    with open(FRAMES_JSON, encoding="utf-8") as f:
        doc = json.load(f)
    frames = {fr["id"]: fr for fr in doc["frames"]}
    built = [build_continuous(c) for c in LEGENDS] + [build_precip()]
    for frame_id, info, entries in built:
        if frame_id not in frames:
            print("skipped %s: no frame with that id in data/frames.json" % frame_id)
            continue
        frames[frame_id]["legendInfo"] = info
        frames[frame_id]["legend"] = entries
        print("%s: %d legend entries" % (frame_id, len(entries)))
    with open(FRAMES_JSON, "w", encoding="utf-8") as f:
        f.write(to_json(doc) + "\n")
    print("updated data/frames.json")


if __name__ == "__main__":
    main()

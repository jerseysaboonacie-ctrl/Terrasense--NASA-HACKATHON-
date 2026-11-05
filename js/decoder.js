// decoder.js
// Turns the colour of a pixel into an approximate value, using the frame's
// legend table in data/frames.json.
//
// The legend table is the single source of truth for what a colour means.
// The decoder never guesses: if the pixel colour is not close to any legend
// colour, it reports "no data".
//
// Everything that plays a sound or shows a value goes through decodeAt().

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** Load the list of frames from data/frames.json. */
export async function loadFrameList() {
  const res = await fetch('data/frames.json');
  if (!res.ok) throw new Error('Could not load data/frames.json (' + res.status + ')');
  return (await res.json()).frames;
}

/**
 * Load one frame's raw pixels. Returns the object decodeAt() works on:
 *   { meta, width, height, data }   (data = RGBA bytes, 4 per pixel)
 */
export async function loadFrame(meta) {
  const pixels = await loadPixels(meta.image);
  return { meta, ...pixels };
}

/**
 * Read the raw RGBA pixels of an image served from this site.
 * (Images on other websites cannot be read: the browser blocks it. That is
 * why the frames are downloaded into frames/ and served from here.)
 * colorSpaceConversion 'none' keeps the colours exactly as stored in the file,
 * so they match the colours we measured from NASA's colourbars.
 */
async function loadPixels(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load image ' + url + ' (' + res.status + ')');
  const blob = await res.blob();
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  } catch (e) {
    bitmap = await createImageBitmap(blob); // older browsers: options not supported
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { width: bitmap.width, height: bitmap.height, data };
}

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/** Straight-line distance between two colours in RGB space (0 = identical). */
export function colourDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Colour at (x, y). For JPEG frames (smoothRadius 1) we take the median of the
 * 3x3 square around the pixel: this removes compression noise without
 * blending two different regions together. PNG frames use the pixel itself.
 */
export function sampleColour(frame, x, y) {
  const r = frame.meta.smoothRadius;
  const R = [], G = [], B = [], A = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const px = Math.min(frame.width - 1, Math.max(0, x + dx));
      const py = Math.min(frame.height - 1, Math.max(0, y + dy));
      const i = (py * frame.width + px) * 4;
      R.push(frame.data[i]); G.push(frame.data[i + 1]); B.push(frame.data[i + 2]); A.push(frame.data[i + 3]);
    }
  }
  return { rgb: [median(R), median(G), median(B)], alpha: median(A) };
}

function median(list) {
  const s = list.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Find the legend entry whose colour is closest to rgb. */
export function nearestLegendEntry(legend, rgb) {
  let best = null;
  let bestDistance = Infinity;
  for (const entry of legend) {
    const d = colourDistance(rgb, entry.color);
    if (d < bestDistance) { best = entry; bestDistance = d; }
  }
  return { entry: best, distance: bestDistance };
}

function inRect(r, x, y) {
  return x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
}

/** Longitude and latitude of a pixel (all our frames are equirectangular). */
export function pixelToLonLat(frame, x, y) {
  const a = frame.meta.mapArea;
  const lon = -180 + ((x - a.x + 0.5) / a.width) * 360;
  const lat = 90 - ((y - a.y + 0.5) / a.height) * 180;
  return { lon, lat };
}

/**
 * Decode the pixel at image coordinates (x, y).
 *
 * Returns an object with:
 *   status     'value'  a legend colour matched; value is approximate
 *              'nodata' anything else: outside the map, under a logo or date
 *                       label, a known no-data colour (land, water...), a
 *                       transparent pixel, or a colour not on the legend
 *   reason     why it is no data (shown to the user)
 *   t          0..1 position on the legend (0 = lowest value), for pitch
 *   entry      the matched legend entry
 *   text       short plain-language value, e.g. "about 28 °C"
 *   rgb        sampled colour; matchedColor = legend colour it matched
 *   distance   colour distance between the two (smaller = better match)
 *   lon, lat   position on the globe
 */
export function decodeAt(frame, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  const meta = frame.meta;
  const result = { x, y, ...pixelToLonLat(frame, x, y) };
  const noData = (reason) => ({ ...result, status: 'nodata', reason, text: 'no data' });

  if (!inRect(meta.mapArea, x, y)) return noData('outside the map');

  const mask = meta.masks.find((m) => inRect(m, x, y));
  if (mask) return noData('covered by the ' + mask.label);

  const { rgb, alpha } = sampleColour(frame, x, y);
  return { ...result, rgb, ...classifyColour(meta, rgb, alpha) };
}

/**
 * The core decision: what does this colour mean on this frame's legend?
 * Separate from decodeAt() so it can be tested with any colour.
 */
export function classifyColour(meta, rgb, alpha = 255) {
  const noData = (reason, extra) => ({ ...extra, status: 'nodata', reason, text: 'no data' });

  if (alpha < 128) {
    return noData(meta.transparent ? meta.transparent.label : 'transparent pixel');
  }

  const { entry, distance } = nearestLegendEntry(meta.legend, rgb);

  // Known no-data colours (e.g. grey land on the sea temperature map).
  // They win only if they are a closer match than the best legend colour.
  let nd = null;
  let ndDistance = Infinity;
  for (const c of meta.noDataColors) {
    const d = colourDistance(rgb, c.color);
    if (d <= c.maxDistance && d < ndDistance) { nd = c; ndDistance = d; }
  }
  if (nd && ndDistance < distance) {
    return noData(nd.label, { matchedColor: nd.color, distance: ndDistance });
  }

  if (distance > meta.maxColorDistance) {
    return noData('colour is not on the legend', { distance });
  }

  return {
    status: 'value',
    t: entry.t,
    entry,
    text: describeValue(meta, entry),
    matchedColor: entry.color,
    distance,
  };
}

// ---------------------------------------------------------------------------
// Describing values (never more precise than the legend allows)
// ---------------------------------------------------------------------------

/** Round to the legend's display step, e.g. 1 °C. */
function roundTo(v, step) {
  const r = Math.round(v / step) * step;
  const decimals = step < 1 ? String(step).split('.')[1].length : 0;
  return Number(r.toFixed(decimals));
}

/** Format a number with a real minus sign, as screen readers say "minus". */
function fmt(n) {
  return String(n).replace('-', '−');
}

/**
 * Short value text, always marked approximate ("about").
 * Values at the very ends of the legend say "or lower" / "or higher",
 * because the colourbar cannot show anything beyond its ends.
 */
export function describeValue(meta, entry) {
  const info = meta.legendInfo;

  if (info.kind === 'discrete') {
    const kind = entry.family === 'frozen' ? 'snow (frozen)' : 'rain';
    if (entry.high == null) return `about ${fmt(entry.value)} ${meta.units} or more, ${kind}`;
    return `about ${fmt(entry.value)} to ${fmt(entry.high)} ${meta.units}, ${kind}`;
  }

  const atBottom = entry.t <= 0;
  const atTop = entry.t >= 1;

  if (info.scale === 'relative') {
    if (atBottom) return 'lowest on the legend (relative)';
    if (atTop) return 'highest on the legend (relative)';
    const pct = Math.round(roundTo(entry.value, info.displayStep) * 100);
    return `about ${pct}% of the way from low to high (relative)`;
  }

  const v = fmt(roundTo(entry.value, info.displayStep));
  if (atBottom) return `${v} ${meta.units} or lower`;
  if (atTop) return `${v} ${meta.units} or higher`;
  return `about ${v} ${meta.units}`;
}

/** "12° N, 46° W" style text for a position. */
export function describePlace(lon, lat) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(0)}° ${ns}, ${Math.abs(lon).toFixed(0)}° ${ew}`;
}

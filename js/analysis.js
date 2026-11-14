// analysis.js: facts about a whole frame, computed from decoded values only.
//
// Used by the Summary, "Go to warmest / coolest" and Compare features.
// Nothing here is typed in by hand: every number comes from decodeAt(), and
// every value sentence from describeValue(), so it is approximate in exactly
// the same way as the rest of the app.

import { decodeAt, describeValue } from './decoder.js';

const CELL_DEG = 5;          // areas are 5° × 5° boxes of latitude and longitude
const MIN_COVERAGE = 0.25;   // an area counts only if ≥ 25% of its points have a value
const MIN_POINTS = 4;        // ... and at least 4 points
const DISTINCT_DEG = 15;     // "next" areas must be at least 15° away from earlier ones
const MAX_AREAS = 5;         // how many warmest / coolest areas to keep

function fmt(n) {
  return String(n).replace('-', '−');
}

/**
 * Decode a regular grid over the map (about 512 × 256 points) and summarise it.
 * Returns { points, total, cells, high, low, bands, grid } where
 *   high / low  distinct areas, most extreme first, each with a representative point
 *   bands       10° latitude bands with their average value and coverage
 */
export function analyseFrame(frame) {
  const meta = frame.meta;
  const a = meta.mapArea;
  const cols = Math.min(512, a.width);
  const rows = Math.min(256, a.height);
  const points = [];
  let total = 0;

  // Cells keyed by "row,col" of the 5° grid.
  const cells = new Map();
  const cellOf = (lat, lon) => {
    const r = Math.min(179 / CELL_DEG, Math.floor((90 - lat) / CELL_DEG));
    const c = Math.min(359 / CELL_DEG, Math.floor((lon + 180) / CELL_DEG));
    const key = r + ',' + c;
    if (!cells.has(key)) {
      cells.set(key, {
        key, total: 0, n: 0, sumT: 0, sumV: 0, points: [],
        latC: 90 - (r + 0.5) * CELL_DEG, lonC: -180 + (c + 0.5) * CELL_DEG,
      });
    }
    return cells.get(key);
  };

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = a.x + Math.floor(((i + 0.5) * a.width) / cols);
      const y = a.y + Math.floor(((j + 0.5) * a.height) / rows);
      const r = decodeAt(frame, x, y);
      const cell = cellOf(r.lat, r.lon);
      cell.total++;
      total++;
      if (r.status !== 'value') continue;
      const p = { x, y, lat: r.lat, lon: r.lon, t: r.t, entry: r.entry };
      points.push(p);
      cell.n++;
      cell.sumT += r.t;
      cell.sumV += r.entry.value;
      cell.points.push(p);
    }
  }

  // Areas with enough data, each with the point closest to its average
  // (a typical point for the area, not a single noisy pixel).
  const valid = [];
  for (const c of cells.values()) {
    if (c.n < MIN_POINTS || c.n / c.total < MIN_COVERAGE) continue;
    c.meanT = c.sumT / c.n;
    c.meanV = c.sumV / c.n;
    c.rep = c.points.reduce((best, p) => (Math.abs(p.t - c.meanT) < Math.abs(best.t - c.meanT) ? p : best));
    valid.push(c);
  }

  return {
    points: points.length,
    total,
    grid: [cols, rows],
    high: distinctAreas(valid.slice().sort((p, q) => q.meanT - p.meanT)),
    low: distinctAreas(valid.slice().sort((p, q) => p.meanT - q.meanT)),
    bands: latitudeBands(meta, points, frame),
  };
}

/** Keep the first areas in ranked order that are at least DISTINCT_DEG apart. */
function distinctAreas(ranked) {
  const picked = [];
  for (const c of ranked) {
    const far = picked.every((p) => {
      const dLat = Math.abs(p.latC - c.latC);
      const dLonRaw = Math.abs(p.lonC - c.lonC);
      const dLon = Math.min(dLonRaw, 360 - dLonRaw);
      return dLat >= DISTINCT_DEG || dLon >= DISTINCT_DEG;
    });
    if (far) picked.push(c);
    if (picked.length === MAX_AREAS) break;
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Pattern from the equator to the poles
// ---------------------------------------------------------------------------

/**
 * Latitude bands: the equator band (10° S to 10° N), then 10° bands toward
 * each pole. For each: average decoded value and share of points with a value.
 */
function latitudeBands(meta, points, frame) {
  const a = meta.mapArea;
  // How many grid points fall in each band (with or without a value), from the grid size.
  const rows = Math.min(256, a.height);
  const cols = Math.min(512, a.width);
  const bandDefs = [{ id: 'eq', min: -10, max: 10 }];
  for (let lo = 10; lo < 90; lo += 10) {
    bandDefs.push({ id: 'N' + lo, hemi: 'N', min: lo, max: lo + 10 });
    bandDefs.push({ id: 'S' + lo, hemi: 'S', min: -(lo + 10), max: -lo });
  }
  const bands = bandDefs.map((b) => ({ ...b, n: 0, total: 0, sumV: 0, sumT: 0 }));
  const bandFor = (lat) => bands.find((b) => lat >= b.min && lat < b.max) || bands.find((b) => lat >= b.min && lat <= b.max);

  // Count all grid rows (value or not) per band.
  for (let j = 0; j < rows; j++) {
    const y = a.y + Math.floor(((j + 0.5) * a.height) / rows);
    const lat = 90 - ((y - a.y + 0.5) / a.height) * 180;
    const b = bandFor(lat);
    if (b) b.total += cols;
  }
  for (const p of points) {
    const b = bandFor(p.lat);
    if (!b) continue;
    b.n++;
    b.sumV += p.entry.value;
    b.sumT += p.t;
  }
  for (const b of bands) {
    b.coverage = b.total ? b.n / b.total : 0;
    b.meanV = b.n ? b.sumV / b.n : null;
    b.meanT = b.n ? b.sumT / b.n : null;
    b.usable = b.n >= 20 && b.coverage >= 0.05;
  }
  return bands;
}

/** "10° to 20° N" style label for a band. */
function bandLabel(b) {
  if (b.id === 'eq') return '10° S to 10° N';
  const lo = Math.min(Math.abs(b.min), Math.abs(b.max));
  const hi = Math.max(Math.abs(b.min), Math.abs(b.max));
  return `${lo}° to ${hi}° ${b.hemi}`;
}

/** Average value of a band as legend text, e.g. "about 27 °C". */
function bandValueText(meta, b) {
  const info = meta.legendInfo;
  if (info.kind === 'discrete') return `${Math.round(b.coverage * 100)}% of the area`;
  const t = (b.meanV - info.min) / (info.max - info.min);
  // Average of decoded values; describeValue rounds it to the legend's display step.
  return describeValue(meta, { value: b.meanV, t: Math.min(0.999, Math.max(0.001, t)) });
}

/**
 * One plain statement of the pattern from the equator to each pole,
 * built only from the band averages.
 */
export function describePattern(meta, bands) {
  const info = meta.legendInfo;
  const discrete = info.kind === 'discrete';
  const metric = (b) => (discrete ? b.coverage : b.meanV);
  // Smallest change that counts as "rising" or "falling": half a legend step,
  // or 2 percentage points of coverage for the precipitation classes.
  const threshold = discrete ? 0.02 : info.tickStep / 2;
  const eq = bands.find((b) => b.id === 'eq');
  if (!eq || !eq.usable) return 'Pattern: there is not enough data near the equator to describe a pattern.';

  const subject = discrete ? `${meta.spokenName.toLowerCase()} is shown on` : 'values average';
  const parts = [`Pattern: near the equator (${bandLabel(eq)}), ${subject} ${bandValueText(meta, eq)}.`];
  // "they fall" (values) or "the share falls" (precipitation coverage).
  const verbForm = (v) => (discrete ? { 'stay about the same': 'stays about the same', fall: 'falls', rise: 'rises' }[v] : v);

  for (const hemi of ['N', 'S']) {
    const seq = [eq, ...bands.filter((b) => b.hemi === hemi && b.usable).sort((p, q) => Math.abs(p.min + p.max) - Math.abs(q.min + q.max))];
    const pole = hemi === 'N' ? 'north' : 'south';
    if (seq.length < 2) {
      parts.push(`Toward the ${pole} pole there is not enough data to say.`);
      continue;
    }
    const last = seq[seq.length - 1];
    const change = metric(last) - metric(eq);
    let verb = 'stay about the same';
    if (change <= -threshold) verb = 'fall';
    else if (change >= threshold) verb = 'rise';
    // "steadily" only if every band moves the same way (allowing tiny wobbles).
    let steady = verb !== 'stay about the same';
    for (let i = 1; i < seq.length && steady; i++) {
      const d = metric(seq[i]) - metric(seq[i - 1]);
      if ((verb === 'fall' && d > threshold) || (verb === 'rise' && d < -threshold)) steady = false;
    }
    const what = discrete ? 'the share' : 'they';
    const tail = verb === 'stay about the same'
      ? `${verbForm(verb)}, ${bandValueText(meta, last)} at ${bandLabel(last)}`
      : `${steady ? 'steadily ' : ''}${verbForm(verb)} to ${bandValueText(meta, last)} at ${bandLabel(last)}`;
    parts.push(`Toward the ${pole} pole ${what} ${tail}.`);
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Compare two decoded points
// ---------------------------------------------------------------------------

/**
 * The approximate difference from A to B, in the frame's units, as a sentence.
 * Both results must have status 'value'.
 */
export function describeDifference(meta, A, B) {
  const info = meta.legendInfo;
  const terms = meta.terms;

  if (info.kind === 'discrete') {
    const a = A.entry, b = B.entry;
    const familyNote = a.family !== b.family ? ` (A is ${a.family}, B is ${b.family})` : '';
    if (a === b) {
      const width = b.high == null ? null : Math.round((b.high - b.value) * 100) / 100;
      return width == null
        ? `A and B are in the same legend class, ${fmt(b.value)} ${meta.units} or more, so the difference cannot be measured from the colors.`
        : `A and B are in the same legend class, so they differ by less than ${fmt(width)} ${meta.units}.`;
    }
    // Possible difference range from the class edges.
    const higher = b.value > a.value;
    const [lo, hi] = higher ? [a, b] : [b, a];
    const minDiff = Math.round(Math.max(0, hi.value - (lo.high ?? lo.value)) * 100) / 100;
    const maxDiff = hi.high == null ? null : Math.round((hi.high - lo.value) * 100) / 100;
    const word = higher ? terms.higher : terms.lower;
    const range = maxDiff == null
      ? `at least about ${fmt(minDiff)} ${meta.units}`
      : minDiff === 0 ? `up to about ${fmt(maxDiff)} ${meta.units}` : `about ${fmt(minDiff)} to ${fmt(maxDiff)} ${meta.units}`;
    return `B is ${range} ${word} than A${familyNote}.`;
  }

  // Subtract the rounded values people hear ("about 32 °C" and "about -2 °C"
  // give "about 34 °C"), so the spoken numbers always add up.
  const shownValue = (e) => (info.scale === 'relative' ? e.value : Math.round(e.value / info.displayStep) * info.displayStep);
  const est = shownValue(B.entry) - shownValue(A.entry);
  // A value at either end of the legend means "this or more / less", so the
  // estimate is then only a lower limit on the size of the difference.
  const atEnd = [A.entry, B.entry].some((e) => e.t <= 0 || e.t >= 1) && A.entry !== B.entry;
  if (info.scale === 'relative') {
    const pts = Math.round(Math.abs(est) * 100 / (info.displayStep * 100)) * info.displayStep * 100;
    if (pts === 0) return 'A and B are about the same on this relative legend.';
    // No "at least" here: a relative legend has nothing beyond Low and High.
    return `B is about ${pts} percentage points of the legend ${est > 0 ? terms.higher : terms.lower} than A (relative, not a measurement).`;
  }
  const step = info.displayStep;
  const rounded = Math.round(Math.abs(est) / step) * step;
  const shown = fmt(Number(rounded.toFixed(step < 1 ? String(step).split('.')[1].length : 0)));
  if (rounded === 0) return `A and B are about the same, within ${fmt(step)} ${meta.units}.`;
  return `B is ${atEnd ? 'at least ' : ''}about ${shown} ${meta.units} ${est > 0 ? terms.higher : terms.lower} than A.`;
}


// decoder-test.js: the decoder test page.
// Lets the team check, by eye, that decoded values match NASA's colourbar,
// and runs automatic self-tests on every legend table.
// Open decoder-test.html?auto=1 to run every frame and print JSON results
// (used for headless checks).

import {
  loadFrameList, loadFrame, decodeAt, classifyColour, nearestLegendEntry, describePlace,
} from './decoder.js';
import { drawLegend } from './legend.js';

const $ = (id) => document.getElementById(id);
const els = {
  select: $('frame-select'), status: $('status'), meta: $('frame-meta'),
  wrap: $('frame-wrap'), img: $('frame-img'), cursor: $('cursor'),
  readout: $('readout'), detail: $('readout-detail'), zoom: $('zoom'), live: $('live'),
  strip: $('legend-strip'), colorbars: $('colorbars'),
  table: $('check-table'), fill: $('fill-btn'), clear: $('clear-btn'),
  exportBtn: $('export-btn'), exportBox: $('export'), selftests: $('selftests'), auto: $('auto-results'),
};

let frames = [];
let frame = null;        // loaded frame: { meta, width, height, data }
let point = null;        // current cursor position in image pixels
let rows = [];           // ten-point check rows: { result, eye }

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

function swatch(rgb) {
  const s = el('span', null, 'swatch');
  if (rgb) s.style.background = css(rgb);
  s.setAttribute('aria-hidden', 'true');
  return s;
}

/** One-line description of a decode result, used in the readout and table. */
function resultText(r) {
  return r.status === 'value' ? r.text : 'no data (' + r.reason + ')';
}

/** Legend step for comparing an eye reading with the decoded value. */
function legendStep(meta) {
  return meta.legendInfo.kind === 'discrete' ? 1 : meta.legendInfo.tickStep;
}

// ---------------------------------------------------------------------------
// Loading a frame
// ---------------------------------------------------------------------------

async function selectFrame(id) {
  const meta = frames.find((f) => f.id === id) || frames[0];
  els.status.className = '';
  els.status.textContent = 'Loading ' + meta.title + '…';
  try {
    frame = await loadFrame(meta);
  } catch (err) {
    frame = null;
    els.status.className = 'error';
    els.status.textContent = 'This frame could not be loaded. ' + err.message;
    return;
  }
  els.status.textContent = '';
  els.img.src = meta.image;
  els.img.alt = meta.title + ' frame, ' + meta.date;
  els.meta.textContent = `${meta.variable}. Units: ${meta.units}. Date: ${meta.date}. ` +
    `Legend: ${meta.legend.length} entries. Image ${frame.width} × ${frame.height} px.`;

  els.colorbars.replaceChildren(...meta.colorbars.map((src) => {
    const im = el('img'); im.src = src; im.alt = meta.colorbarAlt; return im;
  }));

  point = { x: Math.round(frame.width / 2), y: Math.round(frame.height / 2) };
  els.cursor.hidden = true;
  rows = [];
  renderTable();
  drawLegendStrip(null);
  runSelfTests(frame).forEach((t) => {
    const li = el('li');
    li.append(el('span', t.pass ? 'PASS ' : 'CHECK ', t.pass ? 'flag-good' : 'flag-bad'), t.name + ': ' + t.detail);
    els.selftests.append(li);
  });
}

// ---------------------------------------------------------------------------
// Exploring: pointer and keyboard
// ---------------------------------------------------------------------------

/** Convert a pointer event to image pixel coordinates. */
function eventToPixel(e) {
  const rect = els.img.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * frame.width;
  const y = ((e.clientY - rect.top) / rect.height) * frame.height;
  return {
    x: Math.min(frame.width - 1, Math.max(0, Math.floor(x))),
    y: Math.min(frame.height - 1, Math.max(0, Math.floor(y))),
  };
}

function showPoint(announce) {
  if (!frame) return;
  const r = decodeAt(frame, point.x, point.y);
  els.cursor.hidden = false;
  els.cursor.style.left = ((point.x + 0.5) / frame.width) * 100 + '%';
  els.cursor.style.top = ((point.y + 0.5) / frame.height) * 100 + '%';

  const line = `${frame.meta.variable}: ${resultText(r)}, ${describePlace(r.lon, r.lat)}`;
  els.readout.textContent = line;
  if (announce) els.live.textContent = line;

  const items = [
    ['Pixel', `x ${r.x}, y ${r.y}`],
    ['Place', describePlace(r.lon, r.lat)],
    ['Pixel colour', r.rgb ? r.rgb.join(', ') : 'n/a', r.rgb],
    ['Matched', r.matchedColor ? r.matchedColor.join(', ') : 'none', r.matchedColor],
    ['Distance', r.distance != null ? r.distance.toFixed(1) + ' (limit ' + frame.meta.maxColorDistance + ')' : 'n/a'],
    ['Legend position', r.t != null ? Math.round(r.t * 100) + '%' : 'n/a'],
  ];
  els.detail.replaceChildren(...items.flatMap(([k, v, rgb]) => {
    const dd = el('dd');
    if (rgb) dd.append(swatch(rgb), ' ');
    dd.append(v);
    return [el('dt', k), dd];
  }));
  drawZoom(els.zoom, point.x, point.y, 21);
  drawLegendStrip(r);
}

els.wrap.addEventListener('pointermove', (e) => {
  if (!frame) return;
  point = eventToPixel(e);
  showPoint(false);
});
els.wrap.addEventListener('pointerdown', (e) => {
  if (!frame) return;
  point = eventToPixel(e);
  showPoint(true);
  addRow(decodeAt(frame, point.x, point.y));
});
els.wrap.addEventListener('keydown', (e) => {
  if (!frame) return;
  const step = Math.max(1, Math.round(frame.width / 100)) * (e.shiftKey ? 8 : 1);
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (moves[e.key]) {
    e.preventDefault();
    point.x = Math.min(frame.width - 1, Math.max(0, point.x + moves[e.key][0]));
    point.y = Math.min(frame.height - 1, Math.max(0, point.y + moves[e.key][1]));
    showPoint(true);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    addRow(decodeAt(frame, point.x, point.y));
    els.live.textContent = 'Point ' + rows.length + ' added to the check.';
  }
});
els.wrap.addEventListener('focus', () => showPoint(true));

// ---------------------------------------------------------------------------
// Drawing: zoom and legend strip
// ---------------------------------------------------------------------------

/** Draw a size×size pixel square around (cx, cy), enlarged, with the 3×3 sample box. */
function drawZoom(canvas, cx, cy, size) {
  const half = Math.floor(size / 2);
  const img = new ImageData(size, size);
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const sx = Math.min(frame.width - 1, Math.max(0, cx - half + dx));
      const sy = Math.min(frame.height - 1, Math.max(0, cy - half + dy));
      const si = (sy * frame.width + sx) * 4;
      const di = (dy * size + dx) * 4;
      img.data[di] = frame.data[si];
      img.data[di + 1] = frame.data[si + 1];
      img.data[di + 2] = frame.data[si + 2];
      img.data[di + 3] = 255; // show transparent pixels as black
    }
  }
  const tmp = document.createElement('canvas');
  tmp.width = size; tmp.height = size;
  tmp.getContext('2d').putImageData(img, 0, 0);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  const cell = canvas.width / size;
  const r = frame.meta.smoothRadius;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.strokeRect((half - r) * cell, (half - r) * cell, (2 * r + 1) * cell, (2 * r + 1) * cell);
  ctx.strokeStyle = '#000';
  ctx.strokeRect((half - r) * cell - 2, (half - r) * cell - 2, (2 * r + 1) * cell + 4, (2 * r + 1) * cell + 4);
}

/** Draw the legend table (shared code in legend.js) with a marker at the decoded value. */
function drawLegendStrip(result) {
  if (frame) drawLegend(els.strip, frame.meta, result);
}

// ---------------------------------------------------------------------------
// Ten-point check table
// ---------------------------------------------------------------------------

function addRow(result) {
  rows.push({ result, eye: '' });
  renderTable();
}

/**
 * Compare the value typed by eye with the decoded value.
 * Returns { ok, text } or null if nothing typed yet.
 */
function compareEye(meta, r, eyeText) {
  const s = eyeText.trim().toLowerCase();
  if (!s) return null;
  const saysNoData = /^(no ?data|nodata|n\/a|-)$/.test(s);
  if (r.status !== 'value') {
    return saysNoData ? { ok: true, text: 'Both say no data' } : { ok: false, text: 'Decoder says no data' };
  }
  if (saysNoData) return { ok: false, text: 'You read no data; decoder found a value' };
  const eye = Number(s.replace('−', '-').replace('%', ''));
  if (Number.isNaN(eye)) return { ok: false, text: 'Type a number or "no data"' };

  const info = meta.legendInfo;
  if (info.kind === 'discrete') {
    // Find the class (same family) that contains the eye value; compare class positions.
    const fam = meta.legend.filter((c) => c.family === r.entry.family);
    const idx = fam.findIndex((c) => eye >= c.value && (c.high == null || eye < c.high));
    const mine = fam.indexOf(r.entry);
    if (idx < 0) return { ok: false, text: 'Outside the legend range' };
    const diff = Math.abs(idx - mine);
    return { ok: diff <= 1, text: diff === 0 ? 'Same class' : diff + ' class(es) apart' };
  }
  // Relative legend: eye reading typed as a percentage of the bar.
  const eyeValue = info.scale === 'relative' ? eye / 100 : eye;
  const diff = Math.abs(eyeValue - r.entry.value);
  const steps = diff / info.tickStep;
  const unit = info.scale === 'relative' ? '% of bar' : ' ' + meta.units;
  const shown = info.scale === 'relative' ? Math.round(diff * 100) : Math.round(diff * 10) / 10;
  return { ok: steps <= 1, text: `${shown}${unit} apart (${steps.toFixed(2)} legend steps)` };
}

function renderTable() {
  const meta = frame ? frame.meta : null;
  const head = el('tr');
  const eyeHint = meta && meta.legendInfo.scale === 'relative' ? 'Your reading by eye (% of bar)' : `Your reading by eye${meta ? ' (' + meta.units + ')' : ''}`;
  ['#', 'Place', 'Pixel x, y', 'Zoom', 'Pixel colour', 'Legend colour', 'Distance', 'Decoded', eyeHint, 'Result']
    .forEach((h) => { const th = el('th', h); th.scope = 'col'; head.append(th); });
  const thead = el('thead'); thead.append(head);
  const tbody = el('tbody');

  rows.forEach((row, i) => {
    const r = row.result;
    const tr = el('tr');
    const zoomCell = el('td');
    const zc = el('canvas', null, 'zoom-cell'); zc.width = 63; zc.height = 63;
    zc.setAttribute('aria-hidden', 'true');
    zoomCell.append(zc);
    const pixelCell = el('td'); if (r.rgb) pixelCell.append(swatch(r.rgb), ' ' + r.rgb.join(', '));
    const legendCell = el('td'); if (r.matchedColor) legendCell.append(swatch(r.matchedColor), ' ' + r.matchedColor.join(', '));
    const eyeCell = el('td');
    const input = el('input', null, 'check-eye');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = row.eye;
    input.placeholder = r.status === 'value' ? 'value' : 'no data?';
    input.setAttribute('aria-label', `Point ${i + 1}: your reading by eye`);
    eyeCell.append(input);
    const resultCell = el('td');
    const updateResult = () => {
      const cmp = compareEye(meta, r, input.value);
      resultCell.textContent = cmp ? cmp.text : '';
      resultCell.className = cmp ? (cmp.ok ? 'flag-good' : 'flag-bad') : '';
    };
    input.addEventListener('input', () => { row.eye = input.value; updateResult(); });
    updateResult();

    tr.append(
      el('td', String(i + 1)),
      el('td', describePlace(r.lon, r.lat)),
      el('td', `${r.x}, ${r.y}`),
      zoomCell, pixelCell, legendCell,
      el('td', r.distance != null ? r.distance.toFixed(1) : 'n/a'),
      el('td', resultText(r)),
      eyeCell, resultCell,
    );
    tbody.append(tr);
    drawZoom(zc, r.x, r.y, 9);
  });
  els.table.replaceChildren(thead, tbody);
  if (!rows.length) {
    const cap = el('caption', 'No points yet. Click the frame or use the Fill button.');
    els.table.prepend(cap);
  }
}

/**
 * Pick ten points spread across the legend range (lowest to highest value that
 * actually appears on this frame), plus up to two no-data examples.
 * Deterministic: scans the frame on a regular grid.
 */
export function pickCheckPoints(f) {
  const stride = Math.max(1, Math.ceil(Math.sqrt((f.width * f.height) / 40000)));
  const values = [];
  const noData = new Map(); // reason -> first result
  for (let y = Math.floor(stride / 2); y < f.height; y += stride) {
    for (let x = Math.floor(stride / 2); x < f.width; x += stride) {
      const r = decodeAt(f, x, y);
      if (r.status === 'value') values.push(r);
      else if (!noData.has(r.reason)) noData.set(r.reason, r);
    }
  }
  const picked = [];
  if (values.length) {
    let lo = Infinity, hi = -Infinity;
    values.forEach((r) => { lo = Math.min(lo, r.t); hi = Math.max(hi, r.t); });
    for (let k = 0; k < 10; k++) {
      const target = lo + ((hi - lo) * k) / 9;
      let best = null;
      for (const r of values) {
        if (picked.includes(r)) continue;
        if (!best || Math.abs(r.t - target) < Math.abs(best.t - target)) best = r;
      }
      if (best) picked.push(best);
    }
  }
  return { points: picked, noData: [...noData.values()].slice(0, 2), sampled: values.length, stride };
}

els.fill.addEventListener('click', () => {
  if (!frame) return;
  const { points, noData } = pickCheckPoints(frame);
  rows = [...points, ...noData].map((result) => ({ result, eye: '' }));
  renderTable();
});
els.clear.addEventListener('click', () => { rows = []; renderTable(); els.exportBox.hidden = true; });

els.exportBtn.addEventListener('click', () => {
  if (!frame) return;
  const m = frame.meta;
  const lines = [
    `### ${m.title} (${m.date})`, '',
    '| # | Place | Pixel x, y | Pixel colour | Legend colour | Distance | Decoded | By eye | Result |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((row, i) => {
      const r = row.result;
      const cmp = compareEye(m, r, row.eye);
      return `| ${i + 1} | ${describePlace(r.lon, r.lat)} | ${r.x}, ${r.y} | ${r.rgb ? r.rgb.join(', ') : ''} | ` +
        `${r.matchedColor ? r.matchedColor.join(', ') : ''} | ${r.distance != null ? r.distance.toFixed(1) : ''} | ` +
        `${resultText(r)} | ${row.eye} | ${cmp ? cmp.text : ''} |`;
    }),
  ];
  els.exportBox.value = lines.join('\n');
  els.exportBox.hidden = false;
  els.exportBox.focus();
  els.exportBox.select();
});

// ---------------------------------------------------------------------------
// Automatic self-tests
// ---------------------------------------------------------------------------

/** Small repeatable random generator, so test results are the same every run. */
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/** Position of an entry in legend steps (classes for discrete legends). */
function stepPosition(meta, entry) {
  if (meta.legendInfo.kind === 'discrete') {
    return meta.legend.filter((c) => c.family === entry.family).indexOf(entry);
  }
  return entry.value / meta.legendInfo.tickStep;
}

export function runSelfTests(f) {
  const m = f.meta;
  const tests = [];
  const sameFamily = (a, b) => m.legendInfo.kind !== 'discrete' || a.family === b.family;

  // 1. Every legend colour decodes back to (nearly) its own value.
  let worst = 0;
  for (const e of m.legend) {
    const { entry } = nearestLegendEntry(m.legend, e.color);
    const d = sameFamily(e, entry) ? Math.abs(stepPosition(m, e) - stepPosition(m, entry)) : Infinity;
    worst = Math.max(worst, d);
  }
  tests.push({ name: 'Round trip', pass: worst <= 1,
    detail: `each legend colour decodes to within ${worst.toFixed(2)} legend steps of itself` });

  // 2. Noise: add up to ±8 per colour channel (like JPEG noise) and decode again.
  const rand = rng(42);
  let maxErr = 0, beyond = 0, total = 0;
  for (const e of m.legend) {
    for (let k = 0; k < 20; k++) {
      const noisy = e.color.map((c) => Math.min(255, Math.max(0, Math.round(c + (rand() * 16 - 8)))));
      const { entry, distance } = nearestLegendEntry(m.legend, noisy);
      if (distance > m.maxColorDistance) continue;
      const err = sameFamily(e, entry) ? Math.abs(stepPosition(m, e) - stepPosition(m, entry)) : Infinity;
      maxErr = Math.max(maxErr, err);
      if (err > 1) beyond++;
      total++;
    }
  }
  tests.push({ name: 'Noise ±8 per channel', pass: beyond === 0,
    detail: `${total} noisy colours, worst error ${maxErr.toFixed(2)} legend steps, ${beyond} more than one step off` });

  // 3. Higher value always means higher legend position t (pitch depends on it).
  let ordered = true;
  const groups = m.legendInfo.kind === 'discrete' ? [...new Set(m.legend.map((c) => c.family))] : [null];
  for (const g of groups) {
    const list = m.legend.filter((c) => g == null || c.family === g);
    for (let i = 1; i < list.length; i++) {
      if (!(list[i].value > list[i - 1].value && list[i].t > list[i - 1].t)) ordered = false;
    }
  }
  tests.push({ name: 'Order', pass: ordered, detail: 'higher legend values always have a higher position (t)' });

  // 4. Masks and no-data colours never return a value.
  let maskOk = true;
  for (const mk of m.masks) {
    const r = decodeAt(f, mk.x + Math.floor(mk.width / 2), mk.y + Math.floor(mk.height / 2));
    if (r.status !== 'nodata') maskOk = false;
  }
  for (const c of m.noDataColors) {
    if (classifyColour(m, c.color).status !== 'nodata') maskOk = false;
  }
  tests.push({ name: 'No-data areas', pass: maskOk,
    detail: `${m.masks.length} masked area(s) and ${m.noDataColors.length} no-data colour(s) give no data` });

  // 5. Coverage: how the map's pixels decode (for information).
  const counts = { value: 0 };
  const stride = Math.max(1, Math.ceil(Math.sqrt((f.width * f.height) / 40000)));
  let n = 0;
  for (let y = 0; y < f.height; y += stride) {
    for (let x = 0; x < f.width; x += stride) {
      const r = decodeAt(f, x, y);
      const key = r.status === 'value' ? 'value' : r.reason;
      counts[key] = (counts[key] || 0) + 1;
      n++;
    }
  }
  const parts = Object.entries(counts).map(([k, c]) => `${k}: ${Math.round((c / n) * 1000) / 10}%`);
  tests.push({ name: 'Coverage', pass: true, detail: parts.join('; '), counts, n });
  return tests;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function autoRun() {
  const out = [];
  for (const meta of frames) {
    try {
      const f = await loadFrame(meta);
      const { points, noData, sampled, stride } = pickCheckPoints(f);
      // A regular 32 x 16 grid of decoded points, for comparing with real data.
      const grid = [];
      for (let j = 0; j < 16; j++) {
        for (let i = 0; i < 32; i++) {
          const r = decodeAt(f, Math.floor(((i + 0.5) * f.width) / 32), Math.floor(((j + 0.5) * f.height) / 16));
          if (r.status === 'value') grid.push({ x: r.x, y: r.y, lon: r.lon, lat: r.lat, value: r.entry.value, t: r.t });
        }
      }
      out.push({
        id: meta.id,
        size: [f.width, f.height],
        sampled, stride, grid,
        tests: runSelfTests(f).map(({ name, pass, detail }) => ({ name, pass, detail })),
        points: [...points, ...noData].map((r) => ({
          x: r.x, y: r.y, place: describePlace(r.lon, r.lat), rgb: r.rgb, matched: r.matchedColor,
          distance: r.distance != null ? Math.round(r.distance * 10) / 10 : null,
          status: r.status, value: r.entry ? r.entry.value : null, t: r.t ?? null, text: resultText(r),
        })),
      });
    } catch (err) {
      out.push({ id: meta.id, error: String(err) });
    }
  }
  els.auto.hidden = false;
  els.auto.textContent = JSON.stringify(out);
  document.title = 'AUTO DONE';
  // Headless test runs can collect the results with a POST (ignored otherwise).
  const postTo = new URLSearchParams(location.search).get('post');
  if (postTo) fetch(postTo, { method: 'POST', body: JSON.stringify(out) }).catch(() => {});
}

try {
  frames = await loadFrameList();
  els.select.replaceChildren(...frames.map((f) => { const o = el('option', f.title); o.value = f.id; return o; }));
  const params = new URLSearchParams(location.search);
  if (params.get('auto') === '1') {
    await autoRun();
  } else {
    const id = params.get('frame') || frames[0].id;
    els.select.value = id;
    els.select.addEventListener('change', () => {
      els.selftests.replaceChildren();
      selectFrame(els.select.value);
    });
    await selectFrame(id);
    if (params.get('fill') === '1') els.fill.click(); // open with the table filled
  }
} catch (err) {
  els.status.className = 'error';
  els.status.textContent = 'The frame list could not be loaded. ' + err.message +
    '. If you opened this file directly, run a local server (see README).';
}

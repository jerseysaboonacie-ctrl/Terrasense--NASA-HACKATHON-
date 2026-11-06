// legend.js: draws a frame's legend table and builds its reference tones.
// Used by the Player, the decoder test page and the audio test page.

const css = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

function fmt(n) {
  return String(n).replace('-', '−');
}

/** The variable families on a legend ([null] for one-family legends). */
function families(meta) {
  return meta.legendInfo.kind === 'discrete' ? [...new Set(meta.legend.map((c) => c.family))] : [null];
}

/**
 * Draw the legend table as a strip. If result has a value, highlight it with
 * a marker. Discrete legends get one row per family (rain on top, snow below).
 */
export function drawLegend(canvas, meta, result) {
  const dpr = window.devicePixelRatio || 1;
  const cssHeight = canvas.clientHeight || 44;
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const legend = meta.legend;
  const fams = families(meta);
  const rowH = H / fams.length;

  if (meta.legendInfo.kind !== 'discrete') {
    // Continuous: each column shows the entry nearest to that position.
    for (let x = 0; x < W; x++) {
      const i = Math.round((x / (W - 1)) * (legend.length - 1));
      ctx.fillStyle = css(legend[i].color);
      ctx.fillRect(x, 0, 1, H);
    }
  } else {
    fams.forEach((fam, fi) => {
      const classes = legend.filter((c) => c.family === fam);
      const n = Math.round(1 / (2 * classes[0].t)); // t = (i + 0.5) / n
      classes.forEach((c, k) => {
        const i = Math.round(c.t * n - 0.5);
        // The last class may cover several blocks (snow: "20 or more").
        const span = k === classes.length - 1 ? n - i : 1;
        ctx.fillStyle = css(c.color);
        ctx.fillRect((i / n) * W, fi * rowH, (span / n) * W + 1, rowH);
      });
    });
  }

  if (result && result.status === 'value') {
    const x = result.t * W;
    const fi = Math.max(0, fams.indexOf(result.entry.family ?? null));
    const y0 = fi * rowH + 2;
    const h = rowH - 4;
    const w = 12 * dpr;
    ctx.lineWidth = 4 * dpr;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x - w / 2, y0, w, h);
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x - w / 2, y0, w, h);
  }
}

/**
 * Low, middle and high reference tones for a frame, with labels taken from
 * its legend (never invented): t = 0, 0.5 and 1 on the legend.
 */
export function referenceTones(meta) {
  const info = meta.legendInfo;
  if (info.kind === 'discrete') {
    const rain = meta.legend.filter((c) => c.family === 'rain');
    const pick = (t) => rain.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
    const label = (c) => (c.high == null ? `${fmt(c.value)} ${meta.units} or more` : `${fmt(c.value)} to ${fmt(c.high)} ${meta.units}`);
    return [['Low', 0], ['Middle', 0.5], ['High', 1]].map(([name, t]) => {
      const c = pick(t);
      return { name, t: c.t, family: 'rain', label: label(c) + ', rain' };
    });
  }
  if (info.scale === 'relative') {
    return [
      { name: 'Low', t: 0, label: 'Low end of the legend' },
      { name: 'Middle', t: 0.5, label: 'Middle of the legend' },
      { name: 'High', t: 1, label: 'High end of the legend' },
    ];
  }
  const mid = (info.min + info.max) / 2;
  return [
    { name: 'Low', t: 0, label: `${fmt(info.min)} ${meta.units}` },
    { name: 'Middle', t: 0.5, label: `${fmt(mid)} ${meta.units}` },
    { name: 'High', t: 1, label: `${fmt(info.max)} ${meta.units}` },
  ];
}

// accuracy.js: the ten-point table on How it works.
//
// Each pixel is decoded live by the same decoder the Player uses, and compared
// with the real measurement stored in data/accuracy.json (with its source and
// date). So the table always shows what the Player would say today.

import { loadFrameList, loadFrame, decodeAt, describePlace } from './decoder.js';
import { describeResult } from './narrator.js';

const status = document.getElementById('acc-status');
const tbody = document.querySelector('#acc-table tbody');
const note = document.getElementById('acc-note');

const fmt = (n) => String(n).replace('-', '−');

function cell(tr, text) {
  const td = document.createElement('td');
  td.textContent = text;
  tr.append(td);
}

try {
  const acc = await (await fetch('data/accuracy.json', { cache: 'no-cache' })).json();
  const meta = (await loadFrameList()).find((f) => f.id === acc.frame);
  const frame = await loadFrame(meta);
  const info = meta.legendInfo;
  const ref = acc.reference;
  document.getElementById('acc-real-head').textContent = `Real (${ref.name}, ${ref.date})`;

  const diffs = [];
  acc.points.forEach((p, i) => {
    const r = decodeAt(frame, p.x, p.y);
    const d = describeResult(meta, r);
    const tr = document.createElement('tr');
    cell(tr, String(i + 1));
    cell(tr, describePlace(r.lon, r.lat));
    cell(tr, d.value);
    cell(tr, p.real == null ? 'n/a (no data)' : `${fmt(p.real)} ${ref.units}`);
    if (r.status === 'value' && p.real != null) {
      // Compare the value as the Player says it (rounded), not the raw table entry.
      const shown = Math.round(r.entry.value / info.displayStep) * info.displayStep;
      const diff = Math.abs(shown - p.real);
      diffs.push(diff);
      cell(tr, `${diff.toFixed(1)} ${ref.units}`);
      cell(tr, diff <= acc.legendStep ? 'Yes' : 'No');
    } else {
      cell(tr, r.status === 'value' ? 'value given, but no real data here' : 'correctly no value');
      cell(tr, '–');
    }
    tbody.append(tr);
  });

  const within = diffs.filter((x) => x <= acc.legendStep).length;
  const worst = Math.max(...diffs);
  note.textContent = `Within one legend step (${acc.legendStep} ${ref.units}): ${within} of ${diffs.length} points. ` +
    `Largest difference: ${worst.toFixed(1)} ${ref.units}. The real values come from ${ref.source}.`;
  status.textContent = '';
} catch (err) {
  status.className = 'error';
  status.textContent = 'The accuracy table could not be built. ' + err.message + '. If you opened this file directly, run a local server (see README).';
}

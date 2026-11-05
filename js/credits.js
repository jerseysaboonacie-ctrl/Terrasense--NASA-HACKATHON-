// credits.js: lists each frame's source and credit from data/frames.json,
// so credits are never typed twice.

import { loadFrameList } from './decoder.js';

const status = document.getElementById('status');
const list = document.getElementById('credit-list');

function el(tag, text) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  return node;
}

try {
  const frames = await loadFrameList();
  for (const f of frames) {
    const li = el('li');
    const h3 = el('h3', f.title);
    const source = el('p', 'Source: ');
    const a = el('a', f.sourceTitle);
    a.href = f.sourceUrl;
    source.append(a);
    li.append(
      h3,
      source,
      el('p', 'Date: ' + f.date + '. ' + f.dateNote),
      el('p', 'Data: ' + f.dataset + '.'),
      el('p', 'Credit: ' + f.credit),
    );
    list.append(li);
  }
  status.textContent = '';
} catch (err) {
  status.className = 'error';
  status.textContent = 'The credits could not be loaded. ' + err.message;
}

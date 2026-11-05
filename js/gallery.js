// gallery.js: builds the frame cards from data/frames.json,
// so the gallery, player and credits all read the same source of truth.

import { loadFrameList } from './decoder.js';

const status = document.getElementById('status');
const cards = document.getElementById('cards');

/** Small helper: create an element with text. */
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function card(frame) {
  const li = el('li', null, 'card');

  const img = el('img');
  img.src = frame.image;
  img.alt = ''; // decorative here: the title and details below say what it is
  img.loading = 'lazy';
  img.addEventListener('error', () => img.replaceWith(el('p', 'Image could not be loaded.', 'error')));
  li.append(img);

  const body = el('div', null, 'card-body');
  const h2 = el('h2');
  const link = el('a', frame.title);
  link.href = 'player.html?frame=' + encodeURIComponent(frame.id);
  h2.append(link);
  body.append(h2);

  const dl = el('dl');
  for (const [term, value] of [['Variable', frame.variable], ['Units', frame.units], ['Date', frame.date]]) {
    dl.append(el('dt', term), el('dd', value));
  }
  body.append(dl);
  body.append(el('p', frame.listenFor, 'listen'));
  li.append(body);
  return li;
}

try {
  const frames = await loadFrameList();
  frames.forEach((f) => cards.append(card(f)));
  status.textContent = frames.length + ' frames.';
} catch (err) {
  status.className = 'error';
  status.textContent = 'The frame list could not be loaded. ' + err.message +
    '. If you opened this file directly, run a local server (see README).';
}

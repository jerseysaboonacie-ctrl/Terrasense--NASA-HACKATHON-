// site.js: on every page except the Player (which does this itself):
// the first-visit voice question (welcome.js) and Terra, the assistant
// (assistant.js), placed right after the page's main heading.

import { askVoiceModeIfNeeded, afterChoice } from './welcome.js';
import { createAssistant, pageSay } from './assistant.js';

const main = document.querySelector('main');
const h1 = main && main.querySelector('h1');
if (main && h1) {
  const box = document.createElement('section');
  box.id = 'assistant';
  box.className = 'controls';
  // Right after the heading; after the whole intro block if the heading is inside one (Home).
  if (h1.parentElement === main) h1.after(box); else h1.parentElement.after(box);
  const assistant = createAssistant({
    container: box, say: pageSay, headingLevel: 2,
    help: 'Open the player. Open the vegetation map. Go to precipitation. What maps are there. What is today\'s date. Read this page. Go to the gallery.',
  });
  window.__assistant = assistant; // for the automated page tests
}

askVoiceModeIfNeeded((mode) => {
  if (mode === 'off') return;
  pageSay(afterChoice(mode, `This is the ${document.title} page.`));
});

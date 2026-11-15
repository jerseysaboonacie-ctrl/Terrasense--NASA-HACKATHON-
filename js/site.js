// site.js: on every page except the Player (which does this itself): Terra, the assistant
// (assistant.js), placed right after the page's main heading, and the first-visit question
// (welcome.js). On the Gallery, where the site starts when opened from a link, Terra greets you,
// asks how to hear the site and which map to explore, and switches on the microphone.

import { askVoiceModeIfNeeded, afterChoice, greetOnGallery, pickFromGreeting } from './welcome.js';
import { createAssistant, pageSay, recognitionSupported } from './assistant.js';
import { loadFrameList } from './decoder.js';

const NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };

let assistant = null;
const main = document.querySelector('main');
const h1 = main && main.querySelector('h1');
if (main && h1) {
  const box = document.createElement('section');
  box.id = 'assistant';
  box.className = 'controls';
  // Right after the heading; after the whole intro block if the heading is inside one (Home).
  if (h1.parentElement === main) h1.after(box); else h1.parentElement.after(box);
  assistant = createAssistant({
    container: box, say: pageSay, headingLevel: 2,
    help: 'Open the player. Open the vegetation map. Go to precipitation. What maps are there. What is today\'s date. Read this page. Go to the gallery.',
    commands: [
      // "Three", "number two", "the first one" while Terra's map question is open (Gallery greeting).
      { name: 'greeting choice', match: (t) => { const m = t.match(/^ (?:number |option |the )?(one|two|three|four|five|first|second|third|fourth|fifth|[1-5])(?: one)?(?: please)? $/); return m ? NUMBERS[m[1]] : null; },
        run: (c, n) => (pickFromGreeting(n) ? undefined : 'Say the name of a map, for example "open the vegetation map".') },
    ],
  });
  window.__assistant = assistant; // for the automated page tests
}

const listen = async () => (assistant && recognitionSupported() ? assistant.startListening({ quiet: true }) : false);

if (/gallery\.html$/.test(location.pathname) && assistant) {
  loadFrameList().catch(() => []).then((frames) => {
    greetOnGallery({ listen, say: pageSay, frames });
  });
} else {
  askVoiceModeIfNeeded(async (mode) => {
    if (mode === 'off') return;
    const on = await listen();
    pageSay(afterChoice(mode, `This is the ${document.title} page.`, on));
  });
}

// player-assistant.js: what Terra can do in the Player.
//
// Each command calls the same Player functions as the buttons and keys (passed
// in as `api` by player.js), so every value Terra says comes from the decoder,
// worded exactly as the info panel words it.

import { has } from './assistant.js';
import { loadCountries, findPlace, describeNearby, distanceAndDirection } from './places.js';

/**
 * api (from player.js):
 *   meta()                         the frame's facts from frames.json
 *   point()                        { x, y } current pointer (image pixels)
 *   lonLat(x, y), toPixel(lon, lat)
 *   decode(x, y)                   decoder result at a pixel
 *   words(r)                       { value, place, narration } for a result
 *   show(x, y, { prefix, suffix }) move there, play, announce (full detail)
 *   whereAmI(), summaryText(), goTo(kind, i), highIndex()
 *   markAt(which, x, y), compare(), compareBusy()
 *   moveBy(dLon, dLat)
 *   scan(row | 'pointer' | 'overview'), stopAll()
 *   tour(), tourActive(), demo(), demoActive()
 *   volumeBy(delta), volumeSet(v), mute(on)
 *   setDetail(d), rateBy(dir)
 *   referenceTones(), explainText()
 *   describeFrame()
 *   nearestValue(x, y)             nearest pixel with a value, or null
 *   areas()                        the frame analysis (warmest / coolest areas)
 */
export function playerCommands(api) {
  let countries = [];
  let pendingNearest = null; // a nearby point with a value, offered after "no value right here"
  const ready = loadCountries().then((c) => { countries = c; }).catch(() => {});

  const T = () => api.meta().terms;
  const HIGH = () => ['warmest', 'hottest', 'highest', 'maximum', 'greenest', 'heaviest', 'wettest', 'most', T().high];
  const LOW = () => ['coolest', 'coldest', 'lowest', 'minimum', 'least green', 'lightest', 'driest', 'least', T().low];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const asksValue = (t) => has(t, 'what', 'how', 'whats', 'temperature', 'value', 'warm', 'cold', 'hot', 'rain', 'raining', 'green', 'reading', 'tell me');

  /**
   * Move to a named place and say what is there. If the map has no value at
   * that exact spot (land on the sea map), also give the nearest value.
   */
  async function goToPlace(place) {
    await ready;
    const { x, y } = api.toPixel(place.lon, place.lat);
    const r = api.decode(x, y);
    let suffix = '';
    if (r.status !== 'value') {
      const n = api.nearestValue(x, y);
      if (n) {
        const nr = api.decode(n.x, n.y);
        const { km, dir } = distanceAndDirection(r.lon, r.lat, nr.lon, nr.lat);
        suffix = `There is no value right here. The nearest value, about ${km} km ${dir}, is ${api.words(nr).value}. Say "go there" to move to it.`;
        pendingNearest = n;
      }
    }
    const near = countries.length && place.kind !== 'country' ? ' ' + describeNearby(countries, r.lon, r.lat) : '';
    api.show(x, y, { prefix: `${cap(place.name)}. `, suffix: (near + ' ' + suffix).trim() });
  }

  /** Turn one side of a comparison into a pixel: here, warmest, coolest, A, B, or a place. */
  async function resolve(part) {
    const t = ` ${part.trim()} `;
    if (has(t, 'here', 'this', 'it', 'current', 'where i am', 'this point', 'the pointer')) return { ...api.point(), name: 'here' };
    if (has(t, ...LOW())) { const a = api.areas().low[0]; return a && { x: a.rep.x, y: a.rep.y, name: `the ${T().low} ${T().area}` }; }
    if (has(t, ...HIGH())) { const a = api.areas().high[0]; return a && { x: a.rep.x, y: a.rep.y, name: `the ${T().high} ${T().area}` }; }
    await ready;
    const place = findPlace(countries, part);
    if (!place) return null;
    let { x, y } = api.toPixel(place.lon, place.lat);
    if (api.decode(x, y).status !== 'value') { const n = api.nearestValue(x, y); if (n) ({ x, y } = n); }
    return { x, y, name: place.name };
  }

  /** "17 north", "the equator", "here" -> a scan row (latitude), 'pointer' or 'overview'. */
  function scanRow(t) {
    if (has(t, 'overview', 'average', 'averages', 'columns')) return 'overview';
    if (has(t, 'equator')) return 0;
    const m = t.match(/ (\d+)\s*(?:degrees?\s*)?(north|south|n|s) /);
    if (m) return Math.min(85, Number(m[1])) * (m[2].startsWith('s') ? -1 : 1);
    return 'pointer';
  }

  function amount(t) {
    const m = t.match(/ (\d+)\s*degrees? /);
    if (m) return Number(m[1]);
    if (has(t, 'a bit', 'a little', 'slightly', 'a touch', 'little')) return 2;
    if (has(t, 'a lot', 'far', 'much', 'way')) return 20;
    return 5;
  }

  const DIRS = { north: [0, 1], up: [0, 1], south: [0, -1], down: [0, -1], east: [1, 0], right: [1, 0], west: [-1, 0], left: [-1, 0] };

  return [
    { name: 'tour next', match: (t) => api.tourActive() && has(t, 'next', 'continue', 'go on', 'next step', 'carry on'),
      run: () => { api.tour(); } },
    { name: 'stop', match: (t) => /^ (stop|cancel|quiet|be quiet|shush|silence|enough|pause)( (it|that|the scan|scanning|the scan please|the demo|the tour|please))? $/.test(t) ||
        has(t, 'stop the scan', 'stop scanning', 'stop the demo', 'stop the tour', 'stop the sound', 'stop playing'),
      run: () => { api.stopAll(); return 'Stopped.'; } },
    { name: 'go there (nearest value)', match: (t) => pendingNearest && has(t, 'go there', 'move there', 'take me there', 'go to it'),
      run: () => { const n = pendingNearest; pendingNearest = null; api.show(n.x, n.y, { prefix: 'Nearest value. ' }); } },
    { name: 'where am I', match: (t) => has(t, 'where am i', 'where is this', 'where are we', 'what country', 'which country', 'what is here', 'whats here', 'where is the pointer', 'my location', 'where i am'),
      run: () => { api.whereAmI(); } },
    { name: 'compare', match: (t) => has(t, 'compare', 'difference between', 'how different'),
      run: async (ctx, m, t, text) => {
        const body = normalise2(text).replace(/^.*?(compare|difference between|how different (is|are))\s*/, '');
        if (!body || /^(a and b|them|the two|points?|a with b|b and a)\b/.test(body)) { api.compare(); return; }
        let parts = body.split(/\s+(?:and|with|to|against|versus|vs)\s+/);
        if (parts.length === 1) parts = ['here', parts[0]];
        const [A, B] = [await resolve(parts[0]), await resolve(parts.slice(1).join(' '))];
        if (!A || !B) return `I could not find ${!A ? `"${parts[0]}"` : `"${parts.slice(1).join(' ')}"`} on the map. Try a country, a sea, here, or the ${T().high}.`;
        api.markAt('A', A.x, A.y);
        api.markAt('B', B.x, B.y);
        api.compare();
      } },
    { name: 'mark', match: (t) => t.match(/ mark (?:this |here |it )?(?:as )?(?:point )?(a|b) /),
      run: (ctx, m) => { const p = api.point(); api.markAt(m[1].toUpperCase(), p.x, p.y); } },
    { name: 'next warmest', match: (t) => has(t, 'next', 'another', 'another one', 'the next one', 'one more'),
      run: () => { api.goTo('high', api.highIndex() + 1); } },
    { name: 'coolest', match: (t) => has(t, ...LOW()) && !has(t, 'summary'),
      run: () => { api.goTo('low', 0); } },
    { name: 'warmest', match: (t) => has(t, ...HIGH()) && !has(t, 'summary'),
      run: () => { api.goTo('high', 0); } },
    { name: 'summary', match: (t) => has(t, 'summary', 'summarise', 'summarize', 'overview of', 'tell me about the map', 'tell me about this map', 'describe the pattern', 'what does the map show', 'what does this map show', 'the pattern', 'big picture'),
      run: (ctx) => {
        const text = api.summaryText();
        if (!api.areas().high.length) return text;
        return text + ' ' + ctx.ask(`Would you like me to take you to the ${T().high} ${T().area}?`, () => { api.goTo('high', 0); });
      } },
    { name: 'describe frame', match: (t) => has(t, 'what am i looking at', 'what am i listening to', 'what is this map', 'which map', 'what map', 'what is this', 'what is on the map', 'whats on the map', 'describe the map', 'describe this map'),
      run: () => api.describeFrame() },
    { name: 'date', match: (t) => has(t, 'what date', 'which date', 'what day', 'when is this', 'when was this', 'how old', 'what time'),
      run: () => { const m = api.meta(); return `This frame: ${m.date}. ${m.dateNote}`; } },
    { name: 'sound legend', match: (t) => has(t, 'what does the sound mean', 'what do the sounds mean', 'what does the pitch mean', 'reference tones', 'reference tone', 'sound scale', 'how does the sound work', 'legend', 'the range', 'what is the range', 'low and high'),
      run: () => { api.referenceTones(); } },
    { name: 'explain', match: (t) => has(t, 'explain', 'why this sound', 'how did you get'),
      run: () => api.explainText() },
    { name: 'tour', match: (t) => has(t, 'tour', 'guide me', 'how do i use', 'tutorial', 'teach me', 'get started', 'getting started'),
      run: () => { api.tour(); } },
    { name: 'demo', match: (t) => has(t, 'demo', 'demonstration', 'show me what you can do', 'show what it can do'),
      run: () => { api.demo(); } },
    { name: 'scan', match: (t) => has(t, 'scan', 'sweep', 'play the row', 'play this row', 'play across'),
      run: (ctx, m, t) => { api.scan(scanRow(t)); } },
    { name: 'mute', match: (t) => has(t, 'unmute', 'sound on', 'turn the sound on', 'turn on the sound') ? 'off' : has(t, 'mute', 'sound off', 'turn the sound off', 'turn off the sound') ? 'on' : null,
      run: (ctx, m) => { api.mute(m === 'on'); } },
    { name: 'volume', match: (t) => has(t, 'louder', 'quieter', 'softer', 'volume', 'turn it up', 'turn it down'),
      run: (ctx, m, t) => {
        const n = t.match(/ (\d+)\s*(percent|%)? /);
        if (n && has(t, 'volume', 'to', 'set')) api.volumeSet(Number(n[1]));
        else api.volumeBy(has(t, 'quieter', 'softer', 'down', 'lower', 'turn it down') ? -10 : 10);
      } },
    { name: 'detail', match: (t) => has(t, 'more detail', 'full detail', 'tell me more', 'less detail', 'shorter', 'short answers', 'just the value', 'normal detail'),
      run: (ctx, m, t) => {
        const d = has(t, 'less detail', 'shorter', 'short answers', 'just the value') ? 'short' : has(t, 'normal detail') ? 'normal' : 'full';
        api.setDetail(d);
        return { short: 'Short answers: just the value.', normal: 'Normal detail: the variable, the value and the place.', full: 'Full detail: I will also say the position on the legend.' }[d];
      } },
    { name: 'speech rate', match: (t) => has(t, 'faster', 'slower', 'speed up', 'slow down'),
      run: (ctx, m, t) => api.rateBy(has(t, 'slower', 'slow down') ? -1 : 1) },
    { name: 'go to a place', match: async (t, text) => { await ready; return findPlace(countries, text, api.lonLat(api.point().x, api.point().y).lon); },
      run: (ctx, place) => goToPlace(place) },
    { name: 'move', match: (t) => Object.keys(DIRS).find((d) => has(t, d)),
      run: (ctx, dir, t) => { const [dx, dy] = DIRS[dir]; const n = amount(t); api.moveBy(dx * n, dy * n); } },
    { name: 'value here', match: (t) => asksValue(t) && has(t, 'here', 'there', 'now', 'it', 'this') ,
      run: () => { const p = api.point(); api.show(p.x, p.y, { prefix: '' }); } },
  ];
}

/** Lower case, letters and digits only (keeps word order for splitting "X and Y"). */
function normalise2(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export const PLAYER_HELP = 'Where am I. Take me to Japan. What is the temperature in Spain. Go to the warmest. Next. ' +
  'Compare here with the coolest. Compare Brazil and Norway. Summary. Scan the equator. Move north a bit. Louder. Tour. Demo.';

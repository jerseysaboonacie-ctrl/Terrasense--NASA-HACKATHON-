// places.js: names for places on the map.
//
// "In Egypt", "about 60 km west of Israel", and finding a place someone asks
// for ("take me to Japan"). Country borders come from Natural Earth
// (public domain), built into data/countries.json by tools/build_countries.py.
// Loaded only when first needed. Distances and directions are approximate.

let countriesPromise = null;

/** Load the country borders once. Resolves to the list of countries. */
export function loadCountries() {
  if (!countriesPromise) {
    // Relative to this file, so it works from any page.
    countriesPromise = fetch(new URL('../data/countries.json', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => d.countries)
      .catch((err) => { countriesPromise = null; throw err; });
  }
  return countriesPromise;
}

// ---------------------------------------------------------------------------
// Geometry (borders are stored as degrees x 100)
// ---------------------------------------------------------------------------

/** Even-odd point-in-ring test; ring is a flat [x0, y0, x1, y1, ...] array. */
function inRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inCountry(c, x, y) {
  const b = c.bbox;
  if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
  // Each polygon: outer ring, then holes.
  return c.polys.some((rings) => inRing(rings[0], x, y) && !rings.slice(1).some((h) => inRing(h, x, y)));
}

const R = 6371; // km
const rad = (d) => (d * Math.PI) / 180;

function haversineKm(lon1, lat1, lon2, lat2) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Compass direction (8 points) of travel from (lon1, lat1) to (lon2, lat2). */
function compass(lon1, lat1, lon2, lat2) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];
}

/**
 * The nearest border point of any country (except `skip`), by a fast flat
 * distance first, then measured properly. Returns { country, lon, lat, km }.
 */
function nearestBorder(countries, lon, lat, skip) {
  const x = lon * 100, y = lat * 100, k = Math.cos(rad(lat)) ** 2;
  let best = null, bestD = Infinity;
  for (const c of countries) {
    if (c === skip) continue;
    for (const rings of c.polys) {
      const r = rings[0];
      for (let i = 0; i < r.length; i += 2) {
        let dx = Math.abs(r[i] - x);
        if (dx > 18000) dx = 36000 - dx; // across the date line
        const dy = r[i + 1] - y;
        const d = dx * dx * k + dy * dy;
        if (d < bestD) { bestD = d; best = { country: c, lon: r[i] / 100, lat: r[i + 1] / 100 }; }
      }
    }
  }
  if (best) best.km = haversineKm(lon, lat, best.lon, best.lat);
  return best;
}

/** Approximate distance (rounded, as text) and compass direction from one point to another. */
export function distanceAndDirection(lon1, lat1, lon2, lat2) {
  return { km: roundKm(haversineKm(lon1, lat1, lon2, lat2)), dir: compass(lon1, lat1, lon2, lat2) };
}

function roundKm(km) {
  const step = km < 100 ? 10 : km < 1000 ? 50 : 100;
  return Math.max(step, Math.round(km / step) * step).toLocaleString('en-US');
}

/** The country a point is in, or null (sea, or outside every border). */
export function countryAt(countries, lon, lat) {
  return countries.find((c) => inCountry(c, lon * 100, lat * 100)) || null;
}

/**
 * One sentence naming where a point is, relative to countries, e.g.
 *   "In Egypt."  "In Egypt, near the border with Israel."
 *   "Just off the coast of Israel."  "About 60 km west of Israel."
 *   "Far from land: about 1,800 km west of Chile, the nearest country."
 */
export function describeNearby(countries, lon, lat) {
  const here = countryAt(countries, lon, lat);
  if (here) {
    const other = nearestBorder(countries, lon, lat, here);
    if (other && other.km < 60) return `In ${here.spoken}, near ${other.country.spoken}.`;
    return `In ${here.spoken}.`;
  }
  const n = nearestBorder(countries, lon, lat, null);
  if (!n) return '';
  const dir = compass(n.lon, n.lat, lon, lat);
  if (n.km < 25) return `Just off the coast of ${n.country.spoken}.`;
  if (n.km < 1200) return `About ${roundKm(n.km)} km ${dir} of ${n.country.spoken}.`;
  return `Far from land: about ${roundKm(n.km)} km ${dir} of ${n.country.spoken}, the nearest country.`;
}

// ---------------------------------------------------------------------------
// Finding a place someone names
// ---------------------------------------------------------------------------

// Seas, oceans and continents: one representative point each (approximate,
// chosen to be in the water for seas and oceans; checked by the tests).
export const NAMED_AREAS = [
  { name: 'the Pacific Ocean', words: ['pacific ocean', 'pacific'], lon: -140, lat: 0 },
  { name: 'the North Pacific', words: ['north pacific'], lon: -150, lat: 30 },
  { name: 'the South Pacific', words: ['south pacific'], lon: -120, lat: -30 },
  { name: 'the Atlantic Ocean', words: ['atlantic ocean', 'atlantic'], lon: -25, lat: 0 },
  { name: 'the North Atlantic', words: ['north atlantic'], lon: -40, lat: 35 },
  { name: 'the South Atlantic', words: ['south atlantic'], lon: -15, lat: -30 },
  { name: 'the Indian Ocean', words: ['indian ocean'], lon: 75, lat: -15 },
  { name: 'the Arctic Ocean', words: ['arctic ocean', 'arctic'], lon: 0, lat: 86 },
  { name: 'the Southern Ocean', words: ['southern ocean'], lon: 0, lat: -60 },
  { name: 'the Mediterranean Sea', words: ['mediterranean sea', 'mediterranean'], lon: 18, lat: 34 },
  { name: 'the Caribbean Sea', words: ['caribbean sea', 'caribbean'], lon: -75, lat: 15 },
  { name: 'the Gulf of Mexico', words: ['gulf of mexico'], lon: -90, lat: 25 },
  { name: 'the Red Sea', words: ['red sea'], lon: 38.5, lat: 20 },
  { name: 'the Persian Gulf', words: ['persian gulf', 'arabian gulf'], lon: 51.5, lat: 27 },
  { name: 'the Arabian Sea', words: ['arabian sea'], lon: 64, lat: 15 },
  { name: 'the Bay of Bengal', words: ['bay of bengal'], lon: 88, lat: 15 },
  { name: 'the South China Sea', words: ['south china sea'], lon: 114, lat: 12 },
  { name: 'the Sea of Japan', words: ['sea of japan', 'east sea'], lon: 135, lat: 40 },
  { name: 'the Bering Sea', words: ['bering sea'], lon: -178, lat: 58 },
  { name: 'the Gulf of Guinea', words: ['gulf of guinea'], lon: 3, lat: 2 },
  { name: 'the Coral Sea', words: ['coral sea'], lon: 155, lat: -18 },
  { name: 'the Tasman Sea', words: ['tasman sea'], lon: 160, lat: -38 },
  { name: 'the Black Sea', words: ['black sea'], lon: 35, lat: 43 },
  { name: 'the Baltic Sea', words: ['baltic sea', 'baltic'], lon: 19, lat: 57 },
  { name: 'the North Sea', words: ['north sea'], lon: 3, lat: 56 },
  { name: 'Hudson Bay', words: ['hudson bay'], lon: -85, lat: 60 },
  { name: 'Africa', words: ['africa'], lon: 20, lat: 5, land: true },
  { name: 'Europe', words: ['europe'], lon: 15, lat: 50, land: true },
  { name: 'Asia', words: ['asia'], lon: 90, lat: 45, land: true },
  { name: 'North America', words: ['north america'], lon: -100, lat: 45, land: true },
  { name: 'South America', words: ['south america'], lon: -60, lat: -15, land: true },
  { name: 'the North Pole', words: ['north pole'], lon: 0, lat: 89 },
  { name: 'the South Pole', words: ['south pole'], lon: 0, lat: -89, land: true },
];

/** Lower case, no accents or punctuation, single spaces. */
export function normalise(text) {
  return ` ${text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.\- ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** "30 north 40 west", "30 degrees south, 120 degrees east", "-30, 120". */
export function parseCoordinates(text) {
  const t = normalise(text);
  const m = t.match(/(-?\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(north|south|n|s)\b[ ,and]*(-?\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(east|west|e|w)\b/);
  if (m) {
    const lat = Number(m[1]) * (m[2].startsWith('s') ? -1 : 1);
    const lon = Number(m[3]) * (m[4].startsWith('w') ? -1 : 1);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
  }
  return null;
}

/**
 * Find a place named in `text`: coordinates, a sea or ocean, the equator, or
 * a country. Longest name wins ("south sudan" over "sudan").
 * Returns { name, lon, lat, kind } or null.
 */
export function findPlace(countries, text, currentLon = 0) {
  const t = normalise(text);
  const c = parseCoordinates(text);
  if (c) return { name: `${Math.abs(c.lat)}° ${c.lat >= 0 ? 'N' : 'S'}, ${Math.abs(c.lon)}° ${c.lon >= 0 ? 'E' : 'W'}`, ...c, kind: 'coordinates' };

  let best = null;
  const consider = (word, place) => {
    if (word && t.includes(` ${word} `) && (!best || word.length > best.len)) best = { len: word.length, place };
  };
  for (const a of NAMED_AREAS) for (const w of a.words) consider(w, { name: a.name, lon: a.lon, lat: a.lat, kind: 'area' });
  if (t.includes(' equator ')) consider('equator', { name: 'the equator', lon: currentLon, lat: 0, kind: 'line' });
  for (const k of countries || []) {
    const place = { name: k.spoken, lon: k.label[0], lat: k.label[1], kind: 'country' };
    for (const w of [k.name, k.spoken, ...k.aliases]) consider(normalise(w).trim(), place);
  }
  return best ? best.place : null;
}

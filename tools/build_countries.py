"""Build data/countries.json from Natural Earth admin-0 countries (public domain).

Keeps only what the site needs to name places: the country name, a label point
inside the country, a bounding box, and the borders rounded to 0.01 degrees
(about 1 km), stored as whole numbers (degrees x 100) to keep the file small.

Source: Natural Earth 1:50m Admin 0 Countries, v5.1.2
https://github.com/nvkelso/natural-earth-vector (geojson/ne_50m_admin_0_countries.geojson)

Usage: python3 tools/build_countries.py <path to ne_50m_admin_0_countries.geojson>
Standard library only.
"""
import json
import sys

SRC = sys.argv[1]
OUT = 'data/countries.json'

# Extra names people say, mapped to the Natural Earth NAME.
ALIASES = {
    'United States of America': ['usa', 'america', 'united states', 'the states'],
    'United Kingdom': ['uk', 'britain', 'great britain', 'england', 'scotland', 'wales'],
    'Russia': ['russian federation'],
    'Dem. Rep. Congo': ['democratic republic of the congo', 'drc', 'congo kinshasa'],
    'Congo': ['republic of the congo', 'congo brazzaville'],
    'Central African Rep.': ['central african republic'],
    "Côte d'Ivoire": ['ivory coast', 'cote divoire'],
    'Czechia': ['czech republic'],
    'Dominican Rep.': ['dominican republic'],
    'Eq. Guinea': ['equatorial guinea'],
    'S. Sudan': ['south sudan'],
    'Bosnia and Herz.': ['bosnia', 'bosnia and herzegovina'],
    'Solomon Is.': ['solomon islands'],
    'Falkland Is.': ['falkland islands', 'falklands'],
    'Fr. S. Antarctic Lands': ['french southern lands'],
    'N. Cyprus': ['northern cyprus'],
    'W. Sahara': ['western sahara'],
    'Myanmar': ['burma'],
    'eSwatini': ['eswatini', 'swaziland'],
    'Macedonia': ['north macedonia'],
    'Timor-Leste': ['east timor'],
    'South Korea': ['korea', 'republic of korea'],
    'North Korea': ['dprk'],
    'Taiwan': [],
    'Antarctica': ['the south pole continent'],
}

# Spoken form of Natural Earth's abbreviated names.
SPOKEN = {
    'Dem. Rep. Congo': 'the Democratic Republic of the Congo',
    'Central African Rep.': 'the Central African Republic',
    'Dominican Rep.': 'the Dominican Republic',
    'Eq. Guinea': 'Equatorial Guinea',
    'S. Sudan': 'South Sudan',
    'Bosnia and Herz.': 'Bosnia and Herzegovina',
    'Solomon Is.': 'the Solomon Islands',
    'Falkland Is.': 'the Falkland Islands',
    'Fr. S. Antarctic Lands': 'the French Southern and Antarctic Lands',
    'N. Cyprus': 'Northern Cyprus',
    'W. Sahara': 'Western Sahara',
    'United States of America': 'the United States',
    'United Kingdom': 'the United Kingdom',
    'Netherlands': 'the Netherlands',
    'Philippines': 'the Philippines',
    'Bahamas': 'the Bahamas',
    'United Arab Emirates': 'the United Arab Emirates',
    'Czechia': 'Czechia',
    'Marshall Is.': 'the Marshall Islands',
    'Cayman Is.': 'the Cayman Islands',
    'Faeroe Is.': 'the Faroe Islands',
    'Br. Indian Ocean Ter.': 'the British Indian Ocean Territory',
    'Heard I. and McDonald Is.': 'Heard and McDonald Islands',
    'S. Geo. and the Is.': 'South Georgia',
    'St. Pierre and Miquelon': 'Saint Pierre and Miquelon',
    'U.S. Virgin Is.': 'the US Virgin Islands',
    'British Virgin Is.': 'the British Virgin Islands',
    'N. Mariana Is.': 'the Northern Mariana Islands',
    'Cook Is.': 'the Cook Islands',
    'Turks and Caicos Is.': 'the Turks and Caicos Islands',
    'Fr. Polynesia': 'French Polynesia',
    'Wallis and Futuna Is.': 'Wallis and Futuna',
    'Pitcairn Is.': 'the Pitcairn Islands',
    'Ashmore and Cartier Is.': 'the Ashmore and Cartier Islands',
    'Indian Ocean Ter.': 'the Australian Indian Ocean Territories',
    'Siachen Glacier': 'the Siachen Glacier',
}


def ring_ints(ring):
    out, last = [], None
    for lon, lat in ring:
        p = (round(lon * 100), round(lat * 100))
        if p != last:
            out += [p[0], p[1]]
            last = p
    return out if len(out) >= 8 else None



def continent(pr):
    """Natural Earth's continent. Islands it files under "Seven seas (open ocean)" get their UN region
    (Seychelles: Africa, Maldives: Asia), except remote ocean territories, which get none."""
    c = pr.get('CONTINENT') or ''
    if not c.startswith('Seven seas'):
        return c
    if (pr.get('SUBREGION') or '').startswith('Seven seas'):
        return None
    return pr.get('REGION_UN') or None

def main():
    src = json.load(open(SRC, encoding='utf-8'))
    countries = []
    for f in src['features']:
        pr = f['properties']
        geom = f['geometry']
        if not geom:
            continue
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        rings = []  # each polygon: outer ring first, then holes
        xs, ys = [], []
        for poly in polys:
            rr = [r for r in (ring_ints(r) for r in poly) if r]
            if not rr:
                continue
            rings.append(rr)
            xs += rr[0][0::2]
            ys += rr[0][1::2]
        if not rings:
            continue
        name = pr['NAME']
        countries.append({
            'name': name,
            'spoken': SPOKEN.get(name, name),
            'aliases': sorted({a.lower() for a in ALIASES.get(name, []) + [pr.get('NAME_LONG') or '', pr.get('ADMIN') or '']
                               if a and a.lower() != name.lower()}),
            'continent': continent(pr),
            'label': [round(pr['LABEL_X'], 2), round(pr['LABEL_Y'], 2)],
            'bbox': [min(xs), min(ys), max(xs), max(ys)],
            'polys': rings,
        })
    countries.sort(key=lambda c: c['name'])
    out = {
        'about': 'Country names and borders for naming places in the Player. Borders rounded to 0.01 degrees '
                 '(about 1 km) and stored as degrees x 100. Built by tools/build_countries.py.',
        'source': 'Natural Earth 1:50m Admin 0 Countries v5.1.2 (public domain), naturalearthdata.com',
        'countries': countries,
    }
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    print(len(countries), 'countries written to', OUT)


main()

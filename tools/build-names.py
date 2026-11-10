#!/usr/bin/env python3
"""
Regenerates js/names-big.js from public datasets.

Sources (downloaded into tools/.cache/ on first run):
  - US Social Security Administration baby names, top 1000 per year 1880-2008
    (public domain; mirror: github.com/hadley/data-baby-names)
  - @stdlib/datasets-female-first-names-en and -male-first-names-en (Apache-2.0)
  - US Census Bureau 2010 surnames (public domain)
  - SCOWL word lists via the wordlist-english npm package (MIT/BSD-style)

Usage: python3 tools/build-names.py
"""
import csv, io, json, os, tarfile, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.cache')
OUT = os.path.join(ROOT, 'js', 'names-big.js')

SOURCES = {
    'ssa.csv': 'https://raw.githubusercontent.com/hadley/data-baby-names/master/baby-names.csv',
    'census.zip': 'https://www2.census.gov/topics/genealogy/2010surnames/names.zip',
    'female.tgz': 'https://registry.npmjs.org/@stdlib/datasets-female-first-names-en/-/datasets-female-first-names-en-0.2.3.tgz',
    'male.tgz': 'https://registry.npmjs.org/@stdlib/datasets-male-first-names-en/-/datasets-male-first-names-en-0.2.3.tgz',
    'words.tgz': 'https://registry.npmjs.org/wordlist-english/-/wordlist-english-1.2.1.tgz',
}

# Popular names from 2009-2023 that the SSA mirror (ends 2008) may miss.
MODERN = """
aaliyah adalynn adalyn adelyn ailani aitana alaia amayah amora arya aurelia avianna azariah bellamy blaire brantley
brynlee capri collins dahlia ellianna elliana emberly emersyn emery everleigh evelynn freya hallie harlow haven
itzayana ivory jaycee journee kaisley kehlani kenna khaleesi kinslee kinsley kylo lainey laurel leighton lennon lia
liliana londyn lylah lyla madelynn magnolia maisie marlee meadow milani myla navy nayeli novah oaklee oaklyn oaklynn
oakley palmer paislee paisley persephone presley raelyn rosalie royalty saylor scarlet sloan sutton tinsley wrenley
zara zuri amari arlo atlas axton azariah banks beckett bodhi brantlee brixton callum cannon colt crew cyrus dash
ezra ford gunner hendrix huxley jaxton jaxtyn kairo kaison kash kingston knox koa lennox legend maddox mateo memphis
milo nash nico oakley otto rhett ronan rowan ryker santiago stetson thatcher tatum theo wilder zaiden zayden zyaire
""".split()

# Places and things that are also first names: only flag them, never assume.
GEO = """
america asia africa europe india china egypt israel jordan kenya london paris berlin rome sydney vienna florence
georgia carolina virginia dakota montana nevada arizona tennessee alabama indiana kansas austin dallas houston
denver phoenix memphis brooklyn chelsea camden lincoln madison jackson washington franklin cleveland orlando
savannah sierra eden zion canyon river ocean ireland scotland holland england france italy spain sahara aspen
""".split()

# Famous people who show up in student essays — offered as "maybe", unchecked.
FAMOUS = """
abraham lincoln|george washington|martin luther king|rosa parks|harriet tubman|frederick douglass|thomas jefferson|
benjamin franklin|john adams|alexander hamilton|theodore roosevelt|franklin roosevelt|eleanor roosevelt|john kennedy|
barack obama|donald trump|joe biden|ronald reagan|bill clinton|george bush|richard nixon|andrew jackson|james madison|
albert einstein|isaac newton|marie curie|charles darwin|galileo galilei|nikola tesla|thomas edison|stephen hawking|
william shakespeare|mark twain|edgar allan poe|emily dickinson|langston hughes|maya angelou|robert frost|
harper lee|john steinbeck|ernest hemingway|jane austen|charles dickens|george orwell|anne frank|helen keller|
amelia earhart|neil armstrong|sally ride|jackie robinson|babe ruth|michael jordan|lebron james|serena williams|
taylor swift|walt disney|steve jobs|bill gates|elon musk|leonardo da vinci|vincent van gogh|pablo picasso|
christopher columbus|cesar chavez|malala yousafzai|nelson mandela|mahatma gandhi|winston churchill|adolf hitler|
joseph stalin|napoleon bonaparte|julius caesar|cleopatra|queen elizabeth|king george|susan anthony|sojourner truth|
booker washington|george carver|katherine johnson|jane goodall|rachel carson|ruby bridges|malcolm x|john lewis|
harry potter|hermione granger|ron weasley|atticus finch|scout finch|holden caulfield|jay gatsby|romeo|juliet|
hamlet|macbeth|tom sawyer|huckleberry finn|percy jackson|katniss everdeen|charlie brown|peter pan|alice
""".replace('\n', '').split('|')


def fetch(name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print('downloading', SOURCES[name])
        urllib.request.urlretrieve(SOURCES[name], path)
    return path


def tar_json(name, member_suffix):
    with tarfile.open(fetch(name)) as t:
        for m in t.getmembers():
            if m.name.endswith(member_suffix):
                return json.load(t.extractfile(m))
    raise SystemExit('missing ' + member_suffix + ' in ' + name)


def main():
    first = set()
    peak = {}  # highest share of babies given this name in any year since 1970
    with open(fetch('ssa.csv'), newline='') as f:
        for r in csv.DictReader(f):
            name = r['name'].lower()
            if int(r['year']) >= 1940:
                first.add(name)
            if int(r['year']) >= 1970:
                peak[name] = max(peak.get(name, 0), float(r['percent']))
    first |= set(MODERN)
    stdlib = {n.lower() for n in tar_json('female.tgz', 'data/names.json') + tar_json('male.tgz', 'data/names.json')}

    with zipfile.ZipFile(fetch('census.zip')) as z:
        member = next(n for n in z.namelist() if n.endswith('.csv'))
        rows = csv.DictReader(io.TextIOWrapper(z.open(member), 'utf-8'))
        count = {r['name'].lower(): int(r['count']) for r in rows if r['count'].isdigit() and r['name'].isalpha()}
    surnames = {n for n, c in count.items() if c >= 1000}

    words = set()
    for tier in ('10', '20', '35'):
        words |= {w for w in tar_json('words.tgz', 'english-words-%s.json' % tier) if w.isalpha() and w.islower()}

    # The stdlib lists include some plain words ("any", "bald"); only trust them for non-words.
    # They also include plenty of surnames ("Smith", "Moore"): leave those to the surname list.
    first |= {n for n in stdlib if n not in words and n not in surnames}
    first = {n for n in first if n.isalpha() and len(n) >= 2}

    # "Johnson", "Williams", "Davis": technically given names once, but today a lone "Johnson" is a
    # last name. Common surname + rarely used as a first name since 1970 => treat as a surname only.
    lastish = {n for n in first if count.get(n, 0) >= 5000 and peak.get(n, 0) < 0.0004 and n not in MODERN}
    first -= lastish
    first.difference_update({'unknown', 'unnamed', 'infant', 'baby', 'male', 'female', 'boy', 'girl', 'twin'})

    careful = sorted((first & words) | (first & set(GEO)))
    # Everyday words that are neither first names nor surnames: never a last name.
    frequent = set()
    for tier in ('10', '20'):
        frequent |= {w for w in tar_json('words.tgz', 'english-words-%s.json' % tier) if w.isalpha() and w.islower()}
    common = sorted(w for w in frequent if w not in first and w not in surnames and len(w) > 2)
    # Surnames that are also dictionary words ("Park", "Long", "Young"): fine after a first name,
    # but never guessed to be a name when they stand alone.
    wordsur = sorted(surnames & words)
    # ...except the very common ones ("Smith", "Brown", "King"), which get a little more trust.
    bigsur = sorted(n for n in wordsur if count[n] >= 50000)
    first.difference_update({'the', 'and', 'for', 'you', 'her', 'his', 'she', 'him', 'unknown', 'unnamed', 'infant', 'baby', 'male', 'female', 'boy', 'girl', 'twin'})

    js = [
        '/* GENERATED by tools/build-names.py — do not edit by hand. Sources: SSA baby names (public domain),',
        ' * @stdlib first-name datasets (Apache-2.0), US Census 2010 surnames (public domain), SCOWL (MIT/BSD). */',
        '(function (g) {',
        "  'use strict';",
        '  g.FNamesBig = {',
        '    first: %s,' % json.dumps(' '.join(sorted(first))),
        '    surnames: %s,' % json.dumps(' '.join(sorted(surnames))),
        '    lastish: %s,' % json.dumps(' '.join(sorted(lastish))),
        '    wordsur: %s,' % json.dumps(' '.join(wordsur)),
        '    bigsur: %s,' % json.dumps(' '.join(bigsur)),
        '    careful: %s,' % json.dumps(' '.join(careful)),
        '    common: %s,' % json.dumps(' '.join(common)),
        '    famous: %s,' % json.dumps('|'.join(n.strip() for n in FAMOUS if n.strip())),
        '  };',
        "})(typeof window !== 'undefined' ? window : globalThis);",
        '',
    ]
    with open(OUT, 'w') as f:
        f.write('\n'.join(js))
    print('surname-only (removed from first names): %d, e.g. %s' % (len(lastish), ' '.join(sorted(lastish, key=lambda n: -count[n])[:40])))
    print('surnames that are also words: %d' % len(wordsur))
    print('first names: %d, surnames: %d, careful: %d, common words: %d -> %s (%d KB)' % (
        len(first), len(surnames), len(careful), len(common), os.path.relpath(OUT, ROOT), os.path.getsize(OUT) // 1024))


if __name__ == '__main__':
    main()

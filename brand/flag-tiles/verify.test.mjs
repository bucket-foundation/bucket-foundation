import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(root, path));
const json = (path) => JSON.parse(read(path).toString('utf8'));
const catalog = json('catalog.json');
const names = json('countries.json');
const crafts = json('crafts.json');
const labels = json('cultural-labels.json');
const imagery = json('research_notes/Flag tile craft references/imagery.json');
const countries = new Map(catalog.countries.map((country) => [country.code, country]));
const digest = (value) => createHash('sha256').update(value).digest('hex');
const expectedCraftCodes = 'BR FI FR GH ID IN IT JP KR MA MX NL NZ PE PT TR'.split(' ');
const expectedLabels = {
  PT: ['Portugal', 'pt-PT', 'ltr', 'Flag Latin'],
  JP: ['日本', 'ja-JP', 'ltr', 'Flag Japanese'],
  MX: ['México', 'es-MX', 'ltr', 'Flag Latin'],
  IN: ['भारत', 'hi-IN', 'ltr', 'Flag Devanagari'],
  GH: ['Ghana', 'en-GH', 'ltr', 'Flag Latin'],
  MA: ['المغرب', 'ar-MA', 'rtl', 'Flag Arabic'],
  TR: ['Türkiye', 'tr-TR', 'ltr', 'Flag Latin'],
  IT: ['Italia', 'it-IT', 'ltr', 'Flag Latin'],
  FR: ['France', 'fr-FR', 'ltr', 'Flag Latin'],
  NL: ['Nederland', 'nl-NL', 'ltr', 'Flag Latin'],
  FI: ['Suomi', 'fi-FI', 'ltr', 'Flag Latin'],
  PE: ['Perú', 'es-PE', 'ltr', 'Flag Latin'],
  KR: ['대한민국', 'ko-KR', 'ltr', 'Flag Korean'],
  BR: ['Brasil', 'pt-BR', 'ltr', 'Flag Latin'],
  ID: ['Indonesia', 'id-ID', 'ltr', 'Flag Latin'],
  NZ: ['New Zealand', 'en-NZ', 'ltr', 'Flag Latin'],
};

function decodeDataUri(value, mime, label) {
  assert.equal(typeof value, 'string', label);
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(value);
  assert.ok(match, `${label}: valid data URI`);
  assert.equal(match[1], mime, `${label}: media type`);
  return match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]), 'utf8');
}

function attributes(tag) {
  return new Map([...tag.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]]));
}

function viewBox(svg, label) {
  const tag = /<svg\b[^>]*>/i.exec(svg);
  assert.ok(tag, `${label}: SVG root`);
  const value = attributes(tag[0]).get('viewbox');
  assert.ok(value, `${label}: viewBox`);
  const dimensions = value.trim().split(/[\s,]+/).map(Number);
  assert.equal(dimensions.length, 4, `${label}: four viewBox values`);
  assert.ok(dimensions.every(Number.isFinite), `${label}: finite viewBox`);
  assert.ok(dimensions[2] > 0 && dimensions[3] > 0, `${label}: positive dimensions`);
  return dimensions;
}

function assertSafeSvg(svg, label) {
  assert.doesNotMatch(svg, /<!\s*(?:DOCTYPE|ENTITY)\b/i, `${label}: entity declaration`);
  assert.doesNotMatch(svg, /@import\b/i, `${label}: stylesheet import`);
  for (const tag of svg.matchAll(/<\s*([\w:.-]+)\b[^>]*>/g)) {
    const name = tag[1].split(':').at(-1).toLowerCase();
    assert.ok(!['script', 'foreignobject', 'iframe', 'image', 'object', 'embed'].includes(name), `${label}: ${name}`);
    for (const [key, value] of attributes(tag[0])) {
      assert.ok(!key.startsWith('on'), `${label}: event attribute ${key}`);
      if (key === 'href' || key.endsWith(':href') || key === 'src') {
        assert.match(value, /^#[\w:.-]+$/, `${label}: local reference ${key}`);
      }
      for (const resource of value.matchAll(/url\(([^)]+)\)/gi)) {
        assert.match(resource[1].trim().replace(/^['"]|['"]$/g, ''), /^#[\w:.-]+$/, `${label}: local paint reference`);
      }
    }
  }
}

function httpsUrl(value, label) {
  const parsed = new URL(value);
  assert.equal(parsed.protocol, 'https:', label);
  assert.ok(parsed.hostname.includes('.'), `${label}: hostname`);
}

function linePolygons(svg) {
  const polygons = [];
  for (const tag of svg.matchAll(/<path\b[^>]*>/g)) {
    const attrs = attributes(tag[0]);
    const tokens = attrs.get('d').match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi);
    let cursor = [0, 0];
    let start = cursor;
    let points = [];
    let command;
    let index = 0;
    const finish = () => {
      if (points.length) polygons.push({ points, fill: (attrs.get('fill') ?? '#000').toLowerCase() });
      points = [];
    };
    while (index < tokens.length) {
      if (/^[A-Za-z]$/.test(tokens[index])) command = tokens[index++];
      assert.match(command, /^[MmLlHhVvZz]$/, 'Syrian source uses supported line geometry');
      if (command.toLowerCase() === 'z') {
        cursor = [...start];
        finish();
        command = undefined;
        continue;
      }
      const relative = command === command.toLowerCase();
      const action = command.toLowerCase();
      if (action === 'm' || action === 'l') {
        if (action === 'm') finish();
        cursor = [Number(tokens[index++]) + (relative ? cursor[0] : 0), Number(tokens[index++]) + (relative ? cursor[1] : 0)];
        if (action === 'm') {
          start = [...cursor];
          command = relative ? 'l' : 'L';
        }
      } else if (action === 'h') {
        cursor = [Number(tokens[index++]) + (relative ? cursor[0] : 0), cursor[1]];
      } else {
        cursor = [cursor[0], Number(tokens[index++]) + (relative ? cursor[1] : 0)];
      }
      points.push([...cursor]);
    }
    finish();
  }
  return polygons;
}

function contains(points, x, y) {
  let winding = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [ax, ay] = points[index];
    const [bx, by] = points[(index + 1) % points.length];
    const cross = (bx - ax) * (y - ay) - (x - ax) * (by - ay);
    if (ay <= y && by > y && cross > 0) winding += 1;
    if (ay > y && by <= y && cross < 0) winding -= 1;
  }
  return winding !== 0;
}

test('catalog covers 249 unique ISO2 entries and the vendored country list', () => {
  assert.equal(catalog.countries.length, 249);
  assert.equal(countries.size, 249);
  assert.deepEqual([...countries.keys()].sort(), Object.keys(names).sort());
  assert.deepEqual(readdirSync(join(root, 'flags')).filter((name) => name.endsWith('.svg')).sort(), Object.keys(names).map((code) => `${code.toLowerCase()}.svg`).sort());
  for (const country of catalog.countries) {
    assert.match(country.code, /^[A-Z]{2}$/);
    assert.equal(country.name, names[country.code], country.code);
  }
});

test('browser catalog omits image bytes and static asset maps preserve country identity', () => {
  const client = json('client-catalog.json');
  const source = read('../../src/components/flags/assets.ts').toString('utf8');
  const imports = new Map([...source.matchAll(/import (\w+) from "(\.\.\/\.\.\/\.\.\/brand\/flag-tiles\/([^"\n]+))";/g)].map((match) => [match[1], match[3]]));
  assert.deepEqual(client.source, catalog.source);
  assert.deepEqual(client.countries, catalog.countries.map(({ svgDataUri, craft, ...country }) => {
    if (!craft) return country;
    const { imageDataUri, iconDataUri, ...clientCraft } = craft;
    return { ...country, craft: clientCraft };
  }));
  const clientText = JSON.stringify(client);
  assert.doesNotMatch(clientText, /data:|"(?:svgDataUri|imageDataUri|iconDataUri)"/);
  assert.ok(Buffer.byteLength(clientText) < 150_000, 'browser metadata remains under 150 KB');
  const groups = [
    ['flagAssets', 'flags', 'svg', Object.keys(names)],
    ['iconAssets', 'icons', 'svg', expectedCraftCodes],
    ['illustrationAssets', 'illustrations', 'svg', expectedCraftCodes],
    ['photoAssets', 'imagery', 'jpg', imagery.map(({ code }) => code)],
  ];
  let mapped = 0;
  for (const [name, directory, extension, expected] of groups) {
    const block = new RegExp(`export const ${name}[^=]*= \\{([\\s\\S]*?)\\n\\};`).exec(source);
    assert.ok(block, `${name}: generated map`);
    const entries = [...block[1].matchAll(/"([A-Z]{2})": (\w+),/g)];
    assert.deepEqual(entries.map((match) => match[1]).sort(), [...expected].sort(), `${name}: country coverage`);
    for (const [, code, identifier] of entries) {
      const expectedPath = `${directory}/${code.toLowerCase()}.${extension}`;
      assert.equal(imports.get(identifier), expectedPath, `${name}: ${code} points to its source asset`);
      assert.ok(read(expectedPath).length > 0, `${name}: ${code} has source bytes`);
      mapped += 1;
    }
  }
  assert.equal(imports.size, mapped, 'every static import belongs to one country map');
});

test('embedded flag bytes and hashes preserve every native SVG', () => {
  for (const country of catalog.countries) {
    const source = read(`flags/${country.code.toLowerCase()}.svg`);
    assert.deepEqual(decodeDataUri(country.svgDataUri, 'image/svg+xml', country.code), source, country.code);
    assert.equal(country.sha256, digest(source), `${country.code}: SHA-256`);
  }
  assert.equal(catalog.source.sha256, digest(catalog.countries.map(({ code, sha256 }) => `${code}:${sha256}`).join('\n')));
});

test('flag aspect ratios retain native geometry and square exceptions', () => {
  for (const country of catalog.countries) {
    const dimensions = viewBox(read(`flags/${country.code.toLowerCase()}.svg`).toString('utf8'), country.code);
    assert.deepEqual(country.viewBox, dimensions, country.code);
    assert.equal(country.aspectRatio, dimensions[2] / dimensions[3], country.code);
  }
  assert.ok(countries.get('NP').aspectRatio < 1);
  assert.equal(countries.get('CH').aspectRatio, 1);
  assert.equal(countries.get('VA').aspectRatio, 1);
  assert.equal(countries.get('FR').aspectRatio, 1.5);
  const nepal = read('flags/np.svg').toString('utf8');
  assert.doesNotMatch(nepal, /<rect\b/i, 'Nepal retains its nonrectangular outline');
  assert.match(nepal, /<path\b[^>]*\bid="b"[^>]*\bd="[^"]*\bL\s*-15,0\s+v\s*80/i);
});

test('Syrian artwork has green, white and black bands with three red stars', () => {
  const polygons = linePolygons(read('flags/sy.svg').toString('utf8'));
  const stars = polygons.filter(({ fill }) => fill === '#ce1126');
  assert.equal(stars.length, 3, 'three red star polygons');
  assert.ok(stars.every(({ points }) => points.length === 5), 'five-point star paths');
  const colorAt = (x, y) => polygons.filter(({ points }) => contains(points, x, y)).at(-1)?.fill;
  assert.equal(colorAt(450, 100), '#007a3d', 'green upper band');
  assert.equal(colorAt(450, 500), '#000', 'black lower band');
  for (const x of [225, 450, 675]) assert.equal(colorAt(x, 300), '#ce1126', `red star at ${x}`);
  for (const x of [112.5, 337.5, 562.5, 787.5]) assert.equal(colorAt(x, 300), '#fff', `white gap at ${x}`);
});

test('flag representation caveats survive catalog generation', () => {
  assert.match(countries.get('AF').flagNote, /Islamic Republic.*tricolou?r/i);
  assert.match(countries.get('AF').flagNote, /authorit/i);
  assert.match(countries.get('AQ').flagNote, /Antarctic.*proposal/i);
});

test('vendored flags contain no active content or external references', () => {
  for (const country of catalog.countries) assertSafeSvg(read(`flags/${country.code.toLowerCase()}.svg`).toString('utf8'), country.code);
});

test('sixteen craft studies preserve regional attribution and HTTPS sources', () => {
  assert.deepEqual(crafts.map(({ code }) => code).sort(), expectedCraftCodes);
  assert.deepEqual(catalog.countries.filter(({ craft }) => craft).map(({ code }) => code).sort(), expectedCraftCodes);
  for (const craft of crafts) {
    const actual = countries.get(craft.code).craft;
    for (const key of ['title', 'region', 'summary']) assert.ok(craft[key]?.trim().length > 3, `${craft.code}: ${key}`);
    httpsUrl(craft.sourceUrl, `${craft.code}: craft source`);
    for (const [key, value] of Object.entries(craft)) if (key !== 'code') assert.equal(actual[key], value, `${craft.code}: ${key}`);
  }
  assert.match(countries.get('NZ').craft.summary, /no Māori motif adaptation/i);
});

test('native labels retain language, script font and text direction', () => {
  assert.deepEqual(labels.map(({ code }) => code).sort(), expectedCraftCodes);
  for (const label of labels) {
    const { code, nativeLabel, lang, direction, fontFamily } = label;
    assert.deepEqual([nativeLabel, lang, direction, fontFamily], expectedLabels[code], code);
    assert.deepEqual(Intl.getCanonicalLocales(lang), [lang], `${code}: canonical BCP47 tag`);
    assert.ok(label.languageLabel.trim().length > 4, `${code}: language description`);
    httpsUrl(label.sourceUrl, `${code}: naming source`);
    const actual = countries.get(code).craft;
    for (const key of ['nativeLabel', 'languageLabel', 'lang', 'direction', 'fontFamily']) assert.equal(actual[key], label[key], `${code}: ${key}`);
    assert.equal(actual.labelSourceUrl, label.sourceUrl, `${code}: naming attribution`);
  }
});

test('each craft has an embedded icon and a local original illustration', () => {
  const photoCodes = new Set(imagery.map(({ code }) => code));
  for (const code of expectedCraftCodes) {
    const craft = countries.get(code).craft;
    const icon = read(`icons/${code.toLowerCase()}.svg`);
    const illustration = read(`illustrations/${code.toLowerCase()}.svg`);
    for (const [kind, bytes] of [['icon', icon], ['illustration', illustration]]) {
      viewBox(bytes.toString('utf8'), `${code}: ${kind}`);
      assertSafeSvg(bytes.toString('utf8'), `${code}: ${kind}`);
    }
    assert.deepEqual(decodeDataUri(craft.iconDataUri, 'image/svg+xml', `${code}: icon`), icon);
    if (!photoCodes.has(code)) {
      assert.deepEqual(decodeDataUri(craft.imageDataUri, 'image/svg+xml', `${code}: illustration`), illustration);
      assert.equal(craft.imageLicense, 'MIT', `${code}: original illustration license`);
      assert.ok(craft.imageAlt?.trim(), `${code}: original illustration description`);
    }
  }
});

test('six museum photographs retain image bytes and public-domain credits', () => {
  assert.deepEqual(imagery.map(({ code }) => code).sort(), ['IN', 'IT', 'JP', 'KR', 'NL', 'PE']);
  for (const photo of imagery) {
    const craft = countries.get(photo.code).craft;
    const bytes = read(`imagery/${photo.code.toLowerCase()}.jpg`);
    assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff', `${photo.code}: JPEG header`);
    assert.deepEqual(decodeDataUri(craft.imageDataUri, 'image/jpeg', `${photo.code}: photograph`), bytes);
    assert.match(photo.license, /CC0.*Public Domain/i, `${photo.code}: cleared license`);
    assert.match(photo.credit, /Metropolitan Museum of Art/, `${photo.code}: museum credit`);
    httpsUrl(photo.sourceUrl, `${photo.code}: museum source`);
    assert.equal(craft.imageAlt, photo.alt, `${photo.code}: photograph description`);
    assert.equal(craft.imageCredit, photo.credit, `${photo.code}: photograph credit`);
    assert.equal(craft.imageLicense, photo.license, `${photo.code}: photograph license`);
    assert.equal(craft.imageSourceUrl, photo.sourceUrl, `${photo.code}: photograph source`);
  }
});

test('five local fonts contain SFNT tables and their OFL licenses', () => {
  const expected = ['arabic', 'devanagari', 'japanese', 'korean', 'latin'];
  assert.deepEqual(readdirSync(join(root, 'fonts')).filter((name) => name.endsWith('.ttf')).sort(), expected.map((name) => `${name}.ttf`));
  for (const name of expected) {
    const font = read(`fonts/${name}.ttf`);
    assert.ok(['00010000', '4f54544f'].includes(font.subarray(0, 4).toString('hex')), `${name}: SFNT signature`);
    const count = font.readUInt16BE(4);
    assert.ok(count > 0 && 12 + count * 16 <= font.length, `${name}: SFNT directory`);
    const tables = new Set();
    for (let index = 0; index < count; index += 1) {
      const offset = 12 + index * 16;
      const tag = font.subarray(offset, offset + 4).toString('ascii');
      tables.add(tag);
      assert.ok(font.readUInt32BE(offset + 8) + font.readUInt32BE(offset + 12) <= font.length, `${name}: ${tag} bounds`);
    }
    for (const table of ['cmap', 'head', 'name']) assert.ok(tables.has(table), `${name}: ${table} table`);
    assert.match(read(`fonts/${name}-OFL.txt`).toString('utf8'), /SIL OPEN FONT LICENSE\s*,?\s*Version 1\.1/i, `${name}: OFL license`);
  }
});

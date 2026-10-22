import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const names = read('countries.json');
const crafts = new Map(read('crafts.json').map((craft) => [craft.code, craft]));
const labels = existsSync(join(root, 'cultural-labels.json')) ? new Map(read('cultural-labels.json').map((entry) => [entry.code, entry])) : new Map();
const photos = new Map(read('research_notes/Flag tile craft references/imagery.json').map((entry) => [entry.code, entry]));
const digest = (value) => createHash('sha256').update(value).digest('hex');
const uri = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
const notes = {
  AF: 'Source artwork uses the Islamic Republic tricolour. Flag representation varies by authority; check the intended context before reuse.',
  AQ: 'Source artwork uses an Antarctic flag proposal.',
};
const countries = Object.entries(names).map(([code, name]) => {
  if (!/^[A-Z]{2}$/.test(code)) throw new Error(`Invalid country code: ${code}`);
  const svg = readFileSync(join(root, 'flags', `${code.toLowerCase()}.svg`), 'utf8');
  if (/<(?:script|foreignObject|iframe|image)\b|\bon[a-z]+\s*=|(?:href|xlink:href)=["'](?!#)|<!ENTITY|<!DOCTYPE/i.test(svg)) throw new Error(`Unsafe SVG: ${code}`);
  const dimensions = svg.match(/viewBox="([^"]+)"/);
  if (!dimensions) throw new Error(`Missing viewBox: ${code}`);
  const values = dimensions[1].trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value)) || values[2] <= 0 || values[3] <= 0) throw new Error(`Invalid viewBox: ${code}`);
  const country = { code, name, aspectRatio: values[2] / values[3], viewBox: values, sha256: digest(svg), svgDataUri: uri(svg) };
  if (notes[code]) country.flagNote = notes[code];
  if (crafts.has(code)) {
    const { code: omitted, ...craft } = crafts.get(code);
    const { code: ignored, sourceUrl: labelSourceUrl, ...label } = labels.get(code) ?? {};
    country.craft = { ...craft, ...label, labelSourceUrl };
    const illustration = join(root, 'illustrations', `${code.toLowerCase()}.svg`);
    const icon = join(root, 'icons', `${code.toLowerCase()}.svg`);
    if (existsSync(illustration)) Object.assign(country.craft, { imageDataUri: uri(readFileSync(illustration, 'utf8')), imageAlt: `Original material study for ${craft.title}`, imageCredit: 'Bucket studio, original vector study', imageLicense: 'MIT', imageSourceUrl: craft.sourceUrl });
    if (existsSync(icon)) country.craft.iconDataUri = uri(readFileSync(icon, 'utf8'));
    if (photos.has(code)) {
      const photo = photos.get(code);
      Object.assign(country.craft, { imageDataUri: `data:image/jpeg;base64,${readFileSync(join(root, 'imagery', `${code.toLowerCase()}.jpg`)).toString('base64')}`, imageAlt: photo.alt, imageCredit: photo.credit, imageLicense: photo.license, imageSourceUrl: photo.sourceUrl });
    }
  }
  return country;
});
if (countries.length !== 249 || crafts.size !== 16) throw new Error('Catalog coverage changed; review the scope');
const catalog = {
  version: '1.0.0',
  source: { name: 'country-flags', url: 'https://github.com/hampusborgos/country-flags/tree/c09927e63705529bbf59ca6684cd9b23225dddad', license: 'Public domain per source', revision: 'c09927e63705529bbf59ca6684cd9b23225dddad', retrieved: '2026-10-22', coverage: '249 ISO 3166-1 countries and territories', sha256: digest(countries.map((country) => `${country.code}:${country.sha256}`).join('\n')) },
  countries,
};
writeFileSync(join(root, 'catalog.json'), JSON.stringify(catalog) + '\n');
const clientCountries = countries.map(({ svgDataUri, craft, ...country }) => {
  if (!craft) return country;
  const { imageDataUri, iconDataUri, ...clientCraft } = craft;
  return { ...country, craft: clientCraft };
});
writeFileSync(join(root, 'client-catalog.json'), JSON.stringify({ ...catalog, countries: clientCountries }) + '\n');
const assetGroups = [
  ['flagAssets', 'flag', 'flags', 'svg', countries.map(({ code }) => code)],
  ['iconAssets', 'icon', 'icons', 'svg', [...crafts.keys()]],
  ['illustrationAssets', 'illustration', 'illustrations', 'svg', [...crafts.keys()]],
  ['photoAssets', 'photo', 'imagery', 'jpg', [...photos.keys()]],
];
const assetImports = assetGroups.flatMap(([, prefix, directory, extension, codes]) => codes.map((code) => `import ${prefix}_${code} from "../../../brand/flag-tiles/${directory}/${code.toLowerCase()}.${extension}";`));
const assetMaps = assetGroups.map(([name, prefix, , , codes]) => `export const ${name}: Record<string, { src: string }> = {\n${codes.map((code) => `  "${code}": ${prefix}_${code},`).join('\n')}\n};`);
writeFileSync(join(root, '../../src/components/flags/assets.ts'), `${assetImports.join('\n')}\n\n${assetMaps.join('\n\n')}\n`);
const fontFamilies = { latin: 'Flag Latin', japanese: 'Flag Japanese', korean: 'Flag Korean', devanagari: 'Flag Devanagari', arabic: 'Flag Arabic' };
const fontCss = Object.entries(fontFamilies).map(([file, family]) => `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: 600;\n  font-display: swap;\n  src: url(data:font/ttf;base64,${readFileSync(join(root, 'fonts', `${file}.ttf`)).toString('base64')}) format('truetype');\n}`).join('\n\n');
writeFileSync(join(root, '../../src/components/flags/fonts.css'), fontCss + '\n');
process.stdout.write(`Built ${countries.length} flags and ${crafts.size} craft studies\n`);

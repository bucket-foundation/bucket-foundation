import { mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import * as THREE from 'three';
import { modeById, type DesktopLayout } from '../src/explore/modesV2';
import { chromium } from 'playwright';

const bin = process.argv[2] ?? resolve(import.meta.dirname, '../../bkt/dist/bkt');
const run = mkdtempSync(join(tmpdir(), `explore-theme-${new Date().toISOString().replace(/[:.]/g, '-')}-`));
const env = { ...process.env, BKT_HOME: join(run, 'data'), XDG_RUNTIME_DIR: join(run, 'runtime'), BKT_UI_DIR: resolve(import.meta.dirname, '../dist'), BKT_KEYRING: 'passphrase' };
mkdirSync(env.XDG_RUNTIME_DIR, { recursive: true, mode: 0o700 });
const pass = new TextEncoder().encode('explore preview test\n');
const init = Bun.spawnSync([bin, 'init', '--keyring', 'passphrase', '--passphrase-fd', '0'], { env, stdin: pass, stdout: 'pipe', stderr: 'pipe' });
if (init.exitCode) throw new Error(init.stderr.toString());
const server = Bun.spawn([bin, 'serve', '--passphrase-fd', '0'], { env, stdin: pass, stdout: 'pipe', stderr: 'inherit' });
const startup = setTimeout(() => server.kill(), 30_000);
const reader = server.stdout.getReader();
let output = '';
let url = '';
while (!url) {
  const chunk = await reader.read();
  if (chunk.done) throw new Error('Server exited');
  output += new TextDecoder().decode(chunk.value);
  url = output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0] ?? '';
}
clearTimeout(startup);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, colorScheme: 'light', reducedMotion: 'reduce' });
const problems: string[] = [];
page.on('pageerror', e => problems.push(e.stack ?? e.message));
const evidence: unknown[] = [];
try {
  await page.goto(url + '#/explore');
  await page.waitForSelector('[data-testid="explore-scene"] canvas');
  await page.waitForSelector('[data-testid="explore-result"]');
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const mode of ['globe', 'helix', 'atom', 'particle', 'molecule', 'reaction', 'dna', 'graph', 'timeline', 'earth', 'map', 'protein']) {
      console.log('theme check', theme, mode);
      await page.getByTestId('mode-' + mode).click();
      await page.waitForSelector(["atom", "particle", "molecule", "reaction"].includes(mode) ? '[data-testid="explore-scene"] svg' : '[data-testid="explore-scene"] canvas');
      if (mode === 'protein') await page.waitForFunction(() => document.querySelector('[data-testid="protein-canvas"]')?.parentElement?.parentElement?.textContent?.includes('residues'));
      await page.waitForTimeout(350);
      const styles = await page.evaluate(() => {
        const scene = document.querySelector('[data-testid="explore-scene"]')!;
        const tab = document.querySelector('[role="tab"][aria-selected="true"]')!;
        const root = getComputedStyle(document.documentElement);
        return { paper: getComputedStyle(document.body).backgroundColor, stage: getComputedStyle(scene).backgroundColor, tabColor: getComputedStyle(tab).color, tabBackground: getComputedStyle(tab).backgroundColor, accent: root.getPropertyValue('--accent').trim(), overflow: document.documentElement.scrollWidth > window.innerWidth };
      });
      if (styles.paper !== styles.stage || styles.overflow) throw new Error(JSON.stringify({ theme, mode, styles }));
      evidence.push({ theme, mode, ...styles });
      if (['globe', 'helix', 'dna', 'atom', 'particle', 'molecule', 'reaction', 'protein'].includes(mode)) await page.screenshot({ path: join(run, theme + '-' + mode + '.png') });
    }
  }
  console.log('atom interactions');
  await page.getByTestId('mode-atom').click();
  if (await page.locator('[data-particle]').count() !== 18) throw new Error('Carbon-12 count');
  await page.getByLabel('Isotope', { exact: true }).selectOption('13');
  if (await page.locator('[data-particle="neutron"]').count() !== 7) throw new Error('Carbon-13 neutrons');
  await page.getByTestId('atom-view-elements').click();
  await page.getByTestId('circle-element-8').focus();
  await page.keyboard.press('Enter');
  if (await page.getByTestId('atom-element').inputValue() !== '8') throw new Error('Element menu lost circle selection');
  await page.getByTestId('atom-view-shells').click();
  if (await page.locator('[data-particle="electron"]').count() !== 8) throw new Error('Oxygen shell count');
  for (const mode of ['particle', 'molecule', 'reaction']) {
    await page.getByTestId('mode-' + mode).click();
    const target = mode === 'molecule' ? page.locator('[data-circle-node][aria-label^="H ·"]').first() : page.locator('[data-circle-node]').first();
    await target.focus();
    await page.keyboard.press('Enter');
    const label = await target.getAttribute('aria-label');
    if (!(await page.getByTestId('explore-panel').textContent())?.includes(label!)) throw new Error(mode + ' selection lost');
    if (mode === 'particle') {
      const resultText = await page.getByTestId('explore-results').innerText();
      const sources = page.locator('.atom-related button');
      await sources.first().waitFor();
      let checked = false;
      for (let index = 0; index < await sources.count(); index++) {
        const title = await sources.nth(index).innerText();
        if (resultText.includes(title)) continue;
        await sources.nth(index).click();
        if (!(await page.getByTestId('explore-panel').innerText()).includes(title)) throw new Error('Related source lost');
        await page.getByTestId('explore-panel').getByTestId('save-button').waitFor();
        checked = true;
        break;
      }
      if (!checked) throw new Error('No auxiliary source checked');
    }
    if (mode === 'reaction') {
      await page.getByRole('button', { name: 'Products', exact: true }).click();
      await page.waitForSelector('[data-circle-node^="product:"]');
      await page.getByRole('button', { name: 'Reactants', exact: true }).click();
      await page.waitForSelector('[data-circle-node^="reactant:"]');
    }
  }
  console.log('protein styles');
  await page.getByTestId('mode-protein').click();
  for (const style of ['backbone', 'surface', 'cartoon']) {
    await page.getByTestId('protein-style-' + style).click();
    if (await page.getByTestId('protein-style-' + style).getAttribute('aria-pressed') !== 'true') throw new Error('Protein style lost');
    if (style === 'surface') await page.waitForSelector('[data-protein-style="surface"][data-surface-ready="true"]');
    await page.waitForTimeout(250);
  }
  await page.emulateMedia({ colorScheme: 'light' });
  console.log('DNA marker');
  await page.getByTestId('mode-dna').click();
  await page.waitForSelector('[data-surface="helicoid"] canvas');
  await page.getByTestId('explore-scene').getByText('chr7', { exact: true }).waitFor();
  await page.waitForTimeout(500);
  const stage = await page.getByTestId('explore-scene').boundingBox();
  if (!stage) throw new Error('DNA stage is missing');
  const layout = modeById('dna').layout([], { selected: null, scroll: 0 }) as DesktopLayout;
  const camera = new THREE.PerspectiveCamera(45, stage.width / stage.height, 0.1, 1000);
  camera.position.set(0, 0, Math.max(5.5, layout.axisLength! / 2 / camera.aspect / Math.tan(camera.fov * Math.PI / 360)));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const marker = layout.nodes.find(node => node.position[2] > 0 && Math.abs(node.position[0]) < 4)!;
  const screen = new THREE.Vector3(...marker.position).project(camera);
  await page.mouse.click(stage.x + (screen.x + 1) * stage.width / 2, stage.y + (1 - screen.y) * stage.height / 2);
  await page.waitForFunction(label => document.querySelector('[data-testid="explore-panel"]')?.textContent?.includes(label), marker.label!);
  await page.emulateMedia({ colorScheme: 'dark' });
  if (!(await page.getByTestId('explore-panel').textContent())?.includes(marker.label!)) throw new Error('DNA selection lost');
  console.log('DNA sample');
  await page.getByTestId('dna-sample').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="dna-status"]')?.textContent?.includes('variants'));
  await page.getByTestId('dna-clear').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="dna-status"]')?.textContent?.includes('Cleared'));
  console.log('search and save');
  await page.getByTestId('mode-helix').click();
  await page.getByTestId('explore-query').fill('mathematical theory of communication');
  await page.getByTestId('explore-query').press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-testid="explore-results"]')?.textContent?.includes('A Mathematical Theory of Communication'));
  await page.getByTestId('explore-result').first().locator('button').first().click();
  const selected = await page.getByTestId('explore-panel').textContent();
  await page.emulateMedia({ colorScheme: 'dark' });
  if (await page.getByTestId('explore-panel').textContent() !== selected) throw new Error('Selection lost on theme change');
  await page.getByTestId('save-button').first().click();
  const saved = await page.getByTestId('saved-panel').locator('li').count();
  if (!saved) throw new Error('Saved list empty');
  await page.getByTestId('explore-query').focus();
  const focus = await page.getByTestId('explore-query').evaluate(el => getComputedStyle(el).outlineWidth);
  if (focus === '0px') throw new Error('Focus outline missing');
  await page.screenshot({ path: join(run, 'dark-results.png'), fullPage: true });
  for (const width of [900, 600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) { console.log(await page.evaluate(() => [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > window.innerWidth).slice(0, 12).map(el => ({tag: el.tagName, cls: el.className, right: el.getBoundingClientRect().right})))); throw new Error('Overflow at ' + width); }
  }
  await page.screenshot({ path: join(run, 'narrow.png'), fullPage: true });
  if (problems.length) throw new Error(JSON.stringify(problems));
  console.log(JSON.stringify({ screenshots: run, modesChecked: evidence.length, saved, focus, problems, markerSelected: marker.id }));
} catch (error) {
  await page.screenshot({ path: join(run, 'failure.png'), fullPage: true });
  console.error(JSON.stringify({ screenshots: run, text: await page.locator('main').first().innerText() }));
  throw error;
} finally {
  await browser.close();
  server.kill();
  await server.exited;
}

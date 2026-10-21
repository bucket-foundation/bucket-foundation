const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

const root = process.env.BUCKET_DIRECTIONS || path.resolve(__dirname, '..');
const reportPath = process.env.BUCKET_MOTION_REPORT || path.join(root, '.critic/eight/motion-focus.json');
const evidence = path.join(root, '.critic/eight/motion-focus');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function run() {
  const report = { createdAt: new Date().toISOString(), root, scriptHash: hash(await fs.readFile(__filename)), motion: [], layout: [], focus: [], failures: [] };
  await fs.mkdir(evidence, { recursive: true });
  const server = http.createServer(async (req, res) => {
    try {
      const target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const content = await fs.readFile(target);
      res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(content);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || '/usr/bin/chromium-browser', chromiumSandbox: true });
    for (let n = 1; n <= 7; n++) {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const context = await browser.newContext({ reducedMotion, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        const relative = `screens/d${n}-mm.html`;
        try {
          await page.goto(`${base}/${relative}`, { waitUntil: 'load', timeout: 60000 });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(() => document.querySelectorAll('.eq-compact .katex').length === 6);
          await page.waitForTimeout(300);
          const snapshot = () => page.evaluate(() => Object.fromEntries(['ent', 'wave', 'sym'].map(id => [id, document.getElementById(id).outerHTML])));
          const first = await snapshot();
          await page.waitForTimeout(650);
          const second = await snapshot();
          const changed = Object.keys(first).filter(id => first[id] !== second[id]);
          report.motion.push({ page: relative, pageHash: hash(await fs.readFile(path.join(root, relative))), reducedMotion, intervalMs: 650, first: hash(JSON.stringify(first)), second: hash(JSON.stringify(second)), changed });
          assert(reducedMotion === 'reduce' ? changed.length === 0 : changed.length > 0, `${relative}: ${reducedMotion} SVG motion mismatch`);
          if (reducedMotion === 'reduce') {
            const layout = await page.evaluate(() => ({
              width: innerWidth,
              scrollWidth: document.documentElement.scrollWidth,
              rows: [...document.querySelectorAll('.tex')].map(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, mathWidth: el.querySelector('.eq-compact .katex-html').getBoundingClientRect().width })),
              ornament: getComputedStyle(document.querySelector('.row'), '::before').display
            }));
            report.layout.push({ page: relative, ...layout });
            assert(layout.scrollWidth <= layout.width + 1, `${relative}: document overflows`);
            assert(layout.rows.every(row => row.scrollWidth <= row.width + 1 && row.mathWidth <= row.width + 1), `${relative}: mobile formula overflows`);
            if (n === 5) assert(layout.ornament === 'none', `${relative}: mobile ornament remains`);
            await page.screenshot({ path: path.join(evidence, `d${n}-mm-mobile.png`), fullPage: true });
          }
        } catch (error) { report.failures.push(error.message); }
        await context.close();
      }
    }
    const representatives = [];
    for (let n = 1; n <= 7; n++) {
      representatives.push({ page: `screens/d${n}-search.html`, selectors: ['.btn.go', '#q', '.mode[aria-selected="true"]'] });
      representatives.push({ page: `screens/d${n}-mm.html`, selectors: ['.brand'] });
    }
    for (const n of [1, 4, 7]) representatives.push({ page: `pages/d${n}/landing.html`, selectors: ['.btn'] });
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const representative of representatives) {
      try {
        await page.goto(`${base}/${representative.page}`, { waitUntil: 'load', timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        for (let index = 0; index < representative.selectors.length; index++) {
          const selector = representative.selectors[index];
          const target = page.locator(selector).first();
          await target.scrollIntoViewIfNeeded();
          await page.evaluate(() => document.activeElement.blur());
          const before = await page.screenshot();
          await page.keyboard.press('Tab');
          await target.focus();
          await page.waitForTimeout(60);
          const state = await target.evaluate(el => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d');
            const rgba = value => {
              ctx.clearRect(0, 0, 1, 1);
              ctx.fillStyle = value;
              ctx.fillRect(0, 0, 1, 1);
              const p = ctx.getImageData(0, 0, 1, 1).data;
              return [p[0], p[1], p[2], p[3] / 255];
            };
            const composite = (foreground, background) => foreground.slice(0, 3).map((v, i) => v * foreground[3] + background[i] * (1 - foreground[3])).concat(1);
            const backdrop = element => {
              const layers = [];
              for (let node = element; node; node = node.parentElement) layers.push(rgba(getComputedStyle(node).backgroundColor));
              return layers.reverse().reduce((background, foreground) => composite(foreground, background), [255, 255, 255, 1]);
            };
            const lum = rgb => rgb.slice(0, 3).map(x => x / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
            const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
            let ring = null;
            for (let node = el; node; node = node.parentElement) {
              const css = getComputedStyle(node), width = parseFloat(css.outlineWidth), offset = parseFloat(css.outlineOffset), rect = node.getBoundingClientRect();
              if (width < 2 || ['none', 'hidden'].includes(css.outlineStyle) || rgba(css.outlineColor)[3] === 0) continue;
              const background = backdrop(offset >= 0 ? node.parentElement : node);
              const color = composite(rgba(css.outlineColor), background);
              const margin = width + Math.max(offset, 0);
              ring = { element: node.tagName, width, offset, clippedByShape: css.clipPath !== 'none', contrast: contrast(color, background), color, background, visible: rect.width > 0 && rect.height > 0 && rect.left - margin >= 0 && rect.right + margin <= innerWidth && rect.top - margin >= 0 && rect.bottom + margin <= innerHeight };
              break;
            }
            return { active: document.activeElement === el, focusVisible: el.matches(':focus-visible'), ring };
          });
          const after = await page.screenshot();
          const result = { page: representative.page, pageHash: hash(await fs.readFile(path.join(root, representative.page))), selector, ...state, pixelsChanged: !before.equals(after) };
          report.focus.push(result);
          assert(state.active && state.focusVisible, `${representative.page} ${selector}: keyboard focus is absent`);
          assert(state.ring && state.ring.visible && !state.ring.clippedByShape, `${representative.page} ${selector}: visible focus ring absent or clipped`);
          assert(state.ring.contrast >= 3, `${representative.page} ${selector}: focus contrast ${state.ring.contrast.toFixed(2)} below 3:1`);
          assert(result.pixelsChanged, `${representative.page} ${selector}: focus produced no painted change`);
          await fs.writeFile(path.join(evidence, `${representative.page.replaceAll('/', '-')}-${index}-focus.png`), after);
        }
      } catch (error) { report.failures.push(error.message); }
    }
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ motion: report.motion.length, layout: report.layout.length, focus: report.focus.length, failures: report.failures, report: reportPath }) + '\n');
    if (report.failures.length) process.exitCode = 1;
  }
}
run().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });

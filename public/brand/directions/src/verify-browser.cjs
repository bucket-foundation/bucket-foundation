const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const evidence = path.join(root, '.critic', 'eight');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.mp4': 'video/mp4' };
const inspected = new Set(['landing', 'polingual-landing', 'app-learn', 'app-study-card', 'app-language-picker', 'signin', 'logo-in-context', 'math', 'game-badges', 'app-settings']);

async function files(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !['.critic', '__pycache__', 'thumbs'].includes(entry.name)) result.push(...await files(target));
    else if (entry.isFile()) result.push(target);
  }
  return result;
}

async function run() {
  await fs.mkdir(evidence, { recursive: true });
  const sourceFiles = [...await files(__dirname), ...await files(path.join(root, 'made'))].filter(f => /\.(py|js|cjs|css|json)$/.test(f)).sort();
  const hash = crypto.createHash('sha256');
  for (const file of sourceFiles) hash.update(path.relative(root, file)).update(await fs.readFile(file));
  const sourceHash = hash.digest('hex');
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
  const results = [];
  const queue = [...await files(path.join(root, 'pages')), ...await files(path.join(root, 'screens'))].filter(f => f.endsWith('.html')).sort().flatMap(file => [{ file, width: 1440, height: 900 }, { file, width: 390, height: 844 }]);
  const selected = process.env.REVIEW_FILTER;
  if (selected) for (let i = queue.length - 1; i >= 0; i--) if (!new RegExp(selected).test(queue[i].file)) queue.splice(i, 1);
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || '/usr/bin/chromium-browser', chromiumSandbox: true });
    async function worker() {
      const context = await browser.newContext({ deviceScaleFactor: 1 });
      const page = await context.newPage();
      while (queue.length) {
        const job = queue.shift();
        const relative = path.relative(root, job.file).replaceAll(path.sep, '/');
        const result = { page: relative, width: job.width, sourceHash, errors: [] };
        const failed = [];
        const onResponse = response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); };
        page.on('response', onResponse);
        try {
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.setViewportSize({ width: job.width, height: job.height });
          await page.goto(`${base}/${relative}`, { waitUntil: 'load', timeout: 60000 });
          await page.evaluate(async () => {
            document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
            await document.fonts.ready;
            await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
          });
          await page.waitForTimeout(1100);
          Object.assign(result, await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            viewport: innerWidth,
            loadedFonts: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family),
            failedFonts: [...document.fonts].filter(font => font.status === 'error').map(font => font.family),
            brokenImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.getAttribute('src')),
            bodyText: document.body.innerText.length,
            overflowing: [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 6).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right }))
          })));
          if (result.scrollWidth > job.width + 1) result.errors.push('document overflow');
          if (result.failedFonts.length) result.errors.push('font load failed');
          if (result.brokenImages.length) result.errors.push('image load failed');
          if (failed.length) result.errors.push(...failed);
          const name = path.basename(job.file, '.html');
          const isPage = relative.startsWith('pages/');
          const out = path.join(path.dirname(job.file), 'thumbs', `${name}${isPage ? '-' + job.width : job.width === 390 ? '-390' : ''}.png`);
          await fs.mkdir(path.dirname(out), { recursive: true });
          await page.screenshot({ path: out, fullPage: false });
          result.screenshot = path.relative(root, out);
          result.screenshotHash = crypto.createHash('sha256').update(await fs.readFile(out)).digest('hex');
          result.capturedAt = new Date().toISOString();
          if (inspected.has(name) || /-search$|-mm$/.test(name)) {
            result.focus = [];
            for (let n = 0; n < 6; n++) {
              await page.keyboard.press('Tab');
              result.focus.push(await page.evaluate(() => {
                const el = document.activeElement, css = getComputedStyle(el), r = el.getBoundingClientRect();
                return { tag: el.tagName, label: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').slice(0, 80), visible: r.width > 0 && r.height > 0, outline: css.outlineStyle + ' ' + css.outlineWidth, shadow: css.boxShadow };
              }));
            }
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.reload({ waitUntil: 'load' });
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(350);
            result.reducedMotion = await page.evaluate(() => ({ running: document.getAnimations().filter(a => a.playState === 'running').map(a => ({ name: a.animationName || '', duration: a.effect.getTiming().duration })), text: document.body.innerText.length }));
            if (result.reducedMotion.running.some(a => a.duration > 1)) result.errors.push('animation runs with reduced motion');
          }
        } catch (error) { result.errors.push(error.message); }
        page.off('response', onResponse);
        results.push(result);
        if (result.errors.length) process.stdout.write(JSON.stringify({ page: relative, width: job.width, errors: result.errors }) + '\n');
        if (results.length % 35 === 0) process.stdout.write(`${results.length} captures, ${queue.length} remaining\n`);
      }
      await context.close();
    }
    await Promise.all(Array.from({ length: Number(process.env.REVIEW_WORKERS || 4) }, worker));
    const deck = [];
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      const result = { width, errors: [], directions: 0 };
      try {
        await page.goto(`${base}/index.html#top`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) result.errors.push('deck document overflow');
        for (let n = 1; n <= 7; n++) {
          await page.locator(`.rd[data-d="d${n}"] summary`).click();
          await page.waitForFunction(id => !document.getElementById(id).hidden, `d${n}`);
          result.directions++;
        }
        await page.locator('.rh').click();
        await page.locator('#slot').selectOption('app-learn');
        await page.locator('#cmpg a.cm').first().click();
        await page.locator('#lb').waitFor({ state: 'visible' });
        await page.locator('#lb [data-dev="m"]').click();
        await page.keyboard.press('Escape');
        await page.locator('#lb').waitFor({ state: 'hidden' });
        if (!await page.locator('#cmpg a.cm').first().evaluate(el => document.activeElement === el)) result.errors.push('preview focus was not restored');
        await page.locator('.rh').click();
        await page.screenshot({ path: path.join(evidence, `deck-${width}.png`) });
      } catch (error) { result.errors.push(error.message); }
      deck.push(result);
      await context.close();
    }
    const report = { sourceHash, createdAt: new Date().toISOString(), deck, results: results.sort((a, b) => a.page.localeCompare(b.page) || a.width - b.width) };
    const reportFile = path.join(evidence, selected ? 'runtime-filtered.json' : 'runtime.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
    const failures = [...results, ...deck].filter(r => r.errors.length);
    process.stdout.write(JSON.stringify({ captures: results.length, failures: failures.length, sourceHash, report: reportFile }) + '\n');
    if (failures.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });

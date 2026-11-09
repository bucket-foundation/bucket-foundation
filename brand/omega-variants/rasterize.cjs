const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg') && /-v[01]\.svg$/.test(f));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  for (const f of files) {
    const o = path.join(out, f.replace('.svg', '.png'));
    if (fs.existsSync(o)) continue;
    await p.goto('file://' + path.resolve(dir, f));
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(60);
    await p.screenshot({ path: o });
  }
  await b.close(); console.log(files.length);
})();

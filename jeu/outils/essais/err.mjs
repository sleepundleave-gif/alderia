import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 400)); }); p.on('pageerror', (e) => console.log('PAGEERROR', e.message, (e.stack || '').slice(0, 500)));
await p.goto('http://localhost:8000/index.html?graphismes=rapide'); await p.waitForTimeout(9000);
console.log(await p.evaluate(() => (document.getElementById('err') || {}).textContent || 'pas de message')); await b.close();

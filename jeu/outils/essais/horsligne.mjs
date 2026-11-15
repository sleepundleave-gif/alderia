import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 800, height: 450 } })).newPage(), logs = [];
p.on('console', (m) => { if (m.type() === 'error') logs.push('error: ' + m.text()); }); p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('file:///home/user/JeuRPG/Alderia-hors-ligne.html?graphismes=rapide');
await p.waitForFunction(() => !document.getElementById('loading') && !document.getElementById('title').classList.contains('hidden'), null, { timeout: 150000 });
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => { const g = window.__game; return 'titre affiché · niveau ' + g.Q.nom + ' · allégés ' + g.BILAN.pieces + ' pièces, ' + Math.round(g.BILAN.avant / 1000) + ' k → ' + Math.round(g.BILAN.apres / 1000) + ' k · ' + document.getElementById('titleVersion').textContent; }));
console.log(logs.join('\n') || 'no console errors'); await b.close();

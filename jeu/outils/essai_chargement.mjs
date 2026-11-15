// node charge.mjs <port> [recharger] [bac]   → temps jusqu'à l'écran titre, demandes de morceaux, messages
import { chromium } from 'playwright';
const port = process.argv[2] || '8000', again = process.argv.includes('recharger'), bac = process.argv.includes('bac'), jouer = process.argv.includes('jouer');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
const p = await ctx.newPage(); p.setDefaultTimeout(240000);
const errs = []; let parts = 0, failed = 0, notes = new Set();
p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
p.on('request', r => { if (r.url().includes('/paquet/p-')) parts++; });
p.on('requestfailed', r => { failed++; }); p.on('response', r => { if (r.status() >= 400) failed++; });
await p.addInitScript(() => { window.__sansImage = true; });
const url = 'http://localhost:' + port + (bac ? '/bac.html' : '/index.html');
const fr = () => bac ? p.frames()[1] : p.mainFrame();
const run = async (label) => {
  parts = 0; failed = 0; const t0 = Date.now();
  await p.goto(url); await p.waitForTimeout(300);
  const poll = setInterval(async () => { try { const t = await fr().evaluate(() => (document.getElementById('loadNote') || {}).textContent || ''); if (t) notes.add(t.replace(/\(.*$/, '').trim()); } catch (e) {} }, 400);
  await fr().waitForFunction(() => !document.getElementById('loading') && !document.getElementById('title').classList.contains('hidden'));
  clearInterval(poll);
  const urls = await fr().evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /main\.js|style\.css/.test(n)).map(n => n.replace(/^https?:\/\/[^/]+/, '')));
  console.log(label, 'titre après', ((Date.now() - t0) / 1000).toFixed(1), 's ; morceaux demandés', parts, '; demandes ratées', failed, '; boutons', await fr().evaluate(() => [...document.querySelectorAll('#titleBtns button, #titleBtns .btn, #titleBtns > *')].map(x => x.textContent).join(' / ')), urls.join(' '));
};
await run('1er chargement :');
if (again) await run('2e chargement  :');
if (jouer) {
  await fr().evaluate(() => { try { localStorage.clear(); } catch (e) {} window.__game.setFastText(true); });
  if (bac) await fr().click('#titleBtns > *'); else await p.keyboard.press('Enter');
  await fr().waitForFunction(() => { const g = window.__game; return g.E.enabled && g.E.busy === 0 && g.E.stage; }, null, { timeout: 200000 });
  console.log('  partie lancée, joueur importé :', await fr().evaluate(() => !!window.__game.E.player.userData.imported));
}
console.log('  messages affichés :', [...notes].join(' ; ') || 'aucun', '| erreurs page', errs.length, errs.slice(0, 3));
await b.close();

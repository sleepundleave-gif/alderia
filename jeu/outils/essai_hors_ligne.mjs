// Essai de la version hors ligne : ouverte comme un fichier, réseau coupé.
import { chromium } from 'playwright';
const fichier = process.argv[2] || '/home/user/JeuRPG/Alderia-hors-ligne.html';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 900, height: 520 }, offline: true });
const p = await ctx.newPage(); setTimeout(async () => { console.log('TROP LONG', await Promise.race([p.evaluate(() => { const g = window.__game; return JSON.stringify({ stage: g.E.stage && g.E.stage.name, en: g.E.enabled, busy: g.E.busy, titre: document.getElementById('title').className, dlg: document.getElementById('dialog') && document.getElementById('dialog').innerText.slice(0, 80), err: document.getElementById('err').textContent.slice(0, 200) }); }), new Promise(r => setTimeout(() => r('page bloquée'), 4000))])); console.log(logs.join(' / ')); process.exit(2); }, 70000); const logs = [], reseau = [];
p.on('console', m => { if (m.type() === 'error') logs.push('error: ' + m.text().slice(0, 300)); }); p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
p.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) reseau.push(r.url().slice(0, 120)); });
const t0 = Date.now();
await p.goto('file://' + fichier);
await p.waitForFunction(() => !document.getElementById('loading') && !document.getElementById('title').classList.contains('hidden'), null, { timeout: 120000 });
console.log('titre affiché en', ((Date.now() - t0) / 1000).toFixed(1), 's');
await p.waitForTimeout(1500); await p.screenshot({ path: '/home/user/.cache/tmpimg/hl_titre.png' });
await p.evaluate(() => { window.__sansCreation = true; window.__game.setFastText(true); });
await p.keyboard.press('Enter');
await p.waitForFunction(() => window.__game.E.stage && document.getElementById('title').classList.contains('hidden'), null, { timeout: 60000 });
for (let i = 0; i < 40; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(250); if (await p.evaluate(() => window.__game.E.enabled && window.__game.E.busy === 0)) break; }
await p.waitForTimeout(2500); await p.screenshot({ path: '/home/user/.cache/tmpimg/hl_jeu.png' });
const etat = await p.evaluate(() => { const g = window.__game; g.G.flags.essai = 1; const ok = (window.__game.sauver || (() => null))(); return { lieu: g.E.stage.name, phase: g.G.phase, sauvegarde: !!localStorage.getItem('alderia_save_v1') }; });
console.log(JSON.stringify(etat));
console.log('demandes au réseau :', reseau.length, reseau.slice(0, 5).join(' '));
console.log(logs.join('\n') || 'aucune erreur');
await b.close();

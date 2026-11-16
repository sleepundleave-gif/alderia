// menu_carte.mjs phase préfixe : ouvre le menu, puis « Carte du lieu », et prend l'écran
import { start } from './lib.mjs';
const T = await start('state4.json'), { p, ev } = T, [nom, pref] = process.argv.slice(2);
await ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom); await p.waitForTimeout(4200); await T.idle(60000, 'arrivée');
await ev(() => { window.__sansImage = false; }); await p.waitForTimeout(600);
await ev(() => document.getElementById('btnMenu').click()); await p.waitForTimeout(700);
await p.screenshot({ path: `shots/${pref}_menu.jpg`, type: 'jpeg', quality: 82 });
const ok = await ev(() => { const b = [...document.querySelectorAll('#mList button, #mList .opt, #mList > *')].find((e) => /Carte du lieu/.test(e.textContent)); if (!b) return document.getElementById('mList').innerHTML.slice(0, 300); b.click(); return 'clic'; });
console.log(ok); await p.waitForTimeout(1500);
await p.screenshot({ path: `shots/${pref}_carte.jpg`, type: 'jpeg', quality: 86 });
console.log(await ev(() => { const c = document.querySelector('.carteImage'); return c ? c.width + '×' + c.height + ' affichée ' + Math.round(c.getBoundingClientRect().width) + '×' + Math.round(c.getBoundingClientRect().height) : 'pas de carte'; }));
await ev(() => { const b = [...document.querySelectorAll('#mList button, #mList > *')].find((e) => /Retour/.test(e.textContent)); b && b.click(); }); await p.waitForTimeout(500);
await ev(() => { const b = [...document.querySelectorAll('#mList button, #mList > *')].find((e) => /Reprendre/.test(e.textContent)); b && b.click(); }); await p.waitForTimeout(900);
await p.screenshot({ path: `shots/${pref}_apres.jpg`, type: 'jpeg', quality: 82 });
console.log(T.logs.join('\n') || 'aucune erreur'); process.exit(0);

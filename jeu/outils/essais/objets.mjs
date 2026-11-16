// objets.mjs phase : ouvre le menu puis « Objets » avec un sac contenant des équipements (dagues de rechange) ; dit si une erreur sort
import { start } from './lib.mjs';
const T = await start('state4.json'), { p, ev } = T, nom = process.argv[2] || 'ch5_brasegarde';
const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
await ev(() => window.addEventListener('unhandledrejection', (e) => { (window.__rej = window.__rej || []).push(String(e.reason && e.reason.message || e.reason)); }));
await ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom); await p.waitForTimeout(4200); await T.idle(60000, 'arrivée');
console.log('sac :', await ev((plus) => { const G = window.__game.G; if (plus) { G.inv.dagues_nyssa = 1; G.inv.objet_inconnu = 2; } return JSON.stringify(G.inv); }, !!process.env.PLUS));
await ev(() => { window.__sansImage = false; document.getElementById('btnMenu').click(); }); await p.waitForTimeout(700);
const clic = (re) => ev((re) => { const b = [...document.querySelectorAll('#mList button, #mList > *')].find((e) => new RegExp(re).test(e.textContent)); if (!b) return 'absent : ' + re; b.click(); return 'clic ' + re; }, re);
console.log(await clic('^Objets')); await p.waitForTimeout(900);
console.log('écran :', await ev(() => document.getElementById('menuBox').innerText.replace(/\n+/g, ' | ').slice(0, 700)));
await p.screenshot({ path: 'shots/objets.jpg', type: 'jpeg', quality: 84 });
console.log(await clic('Potion|Herbe|potion')); await p.waitForTimeout(700);
console.log('écran :', await ev(() => document.getElementById('menuBox').innerText.replace(/\n+/g, ' | ').slice(0, 300)));
console.log('rejets :', JSON.stringify(await ev(() => window.__rej || [])), errs.join(' ; ') || '');
console.log(T.logs.join('\n') || 'aucune erreur console'); process.exit(0);

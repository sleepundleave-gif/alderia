// objets_combat.mjs phase : lance un combat et ouvre « Objets » dans le menu de combat (sac avec équipements de rechange)
import { start } from './lib.mjs';
const T = await start('state4.json'), { p, ev } = T, nom = process.argv[2] || 'ch5_col';
await ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom); await p.waitForTimeout(4200); await T.idle(60000, 'arrivée');
console.log('sac :', await ev(() => { const G = window.__game.G; G.inv.dagues_nyssa = 1; G.inv.objet_inconnu = 2; return JSON.stringify(G.inv); }));
const id = await ev(() => { const m = window.__game.E.stage.mobs.find((m) => !m.dead); return m && m.id; }); console.log('monstre', id);
await ev(() => { window.__game.BattleCfg.auto = false; }); await T.mobTo(id); console.log('combat', await T.waitBattle()); await ev(() => { window.__sansImage = false; });
let vu = false;
for (let i = 0; i < 40 && !vu; i++) { await p.waitForTimeout(500); vu = await ev(() => { const b = [...document.querySelectorAll('#bMenu button, #bMenu > *')].find((e) => /^Objets/.test(e.textContent.trim())); if (!b) return false; b.click(); return true; }); }
console.log('clic Objets', vu); await p.waitForTimeout(900);
console.log('menu :', await ev(() => document.getElementById('bMenu').innerText.replace(/\n+/g, ' | ').slice(0, 500)));
await p.screenshot({ path: 'shots/objets_combat.jpg', type: 'jpeg', quality: 84 });
console.log(T.logs.join('\n') || 'aucune erreur console'); process.exit(0);

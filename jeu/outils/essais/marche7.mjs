// marche7.mjs : chapitre 7, Kael va à pied de Morgane à l'orphelinat (les compagnons ne sont pas déplacés à la main) ; images de la scène
import { start } from './lib.mjs';
const T = await start('state4.json'); const { p, tp, log, E_, choisir, idle, fin, ev } = T;
await ev(() => { const g = window.__game; g.setFastText(true); g.debugPhase('ch7_port'); });
await p.waitForTimeout(4500); await idle(60000, 'arrivée'); await ev(() => { window.__sansImage = false; });
const ou = () => ev(() => { const E = window.__game.E, f = (o) => `${o.position.x.toFixed(1)},${o.position.y.toFixed(2)},${o.position.z.toFixed(1)}${o.visible ? '' : ' (caché)'}${o.userData.stay ? ' (attend)' : ''}`;
  return 'héros ' + f(E.player) + ' | ' + E.followers.map((o) => (o.userData.key || '?') + ' ' + f(o)).join(' | '); });
await tp(2.4, -10.6); await p.waitForTimeout(600); await E_('morgane', 60000); await p.waitForTimeout(1200); console.log('après Morgane :', await ou());
const aller = async (x1, z1) => { for (let i = 0; i < 400; i++) { const fini = await ev(([x1, z1]) => { const P = window.__game.E.player.position, dx = x1 - P.x, dz = z1 - P.z, d = Math.hypot(dx, dz); if (d < 0.3) return true; P.x += dx / d * 0.3; P.z += dz / d * 0.3; return false; }, [x1, z1]); if (fini) break; await p.waitForTimeout(60); } };
await ev(() => { window.__sansImage = false; }); await aller(-4, 2); console.log('à mi-chemin  :', await ou()); await p.screenshot({ path: 'shots/w0.jpg', type: 'jpeg', quality: 80 });
await aller(-13.6, 4); console.log('près orphelinat:', await ou());
await ev(() => window.__game.setFastText(false));
await aller(-15.5, 4);
let n = 1;
for (let i = 0; i < 40; i++) { await ev(() => { window.__sansImage = false; }); await p.waitForTimeout(900); const s = await T.state(); if (s.choice) break; if (i % 2 === 0) await p.screenshot({ path: `shots/w${n++}.jpg`, type: 'jpeg', quality: 80 }); await p.keyboard.press('Space'); }
console.log('au choix     :', await ou()); await p.screenshot({ path: `shots/w${n++}.jpg`, type: 'jpeg', quality: 80 });
await choisir(0);
for (let i = 0; i < 60; i++) { await ev(() => { window.__sansImage = false; }); await p.waitForTimeout(900); const s = await T.state(); if (!s.busy && s.en) break; if (i % 2 === 0) await p.screenshot({ path: `shots/w${n++}.jpg`, type: 'jpeg', quality: 80 }); await p.keyboard.press('Space'); }
await ev(() => { window.__sansImage = false; }); await p.waitForTimeout(3500); console.log('après        :', await ou()); await p.screenshot({ path: `shots/w${n++}.jpg`, type: 'jpeg', quality: 80 });
console.log('images', n); await log('fin');
await fin(0);

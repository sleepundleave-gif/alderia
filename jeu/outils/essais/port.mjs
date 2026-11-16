// port.mjs : joue tout le chapitre 7 (Morgane, Nyssa à l'orphelinat, le messager, l'entrepôt, Varek, le départ) ; images des moments clés avec SHOTS=*
import { start } from './lib.mjs';
const T = await start('state4.json'); const { p, tp, log, E_, choisir, idle, F, fin, state, ev, shot, potions } = T;
const RUSE = process.env.RUSE ? 1 : 0;
await ev(() => { const g = window.__game; g.setFastText(true); g.debugPhase('ch7_port'); });
await p.waitForTimeout(4500); await idle(60000, 'arrivée'); await log('port');
const ou = () => ev(() => { const E = window.__game.E, f = (o) => `${o.position.x.toFixed(1)},${o.position.y.toFixed(2)},${o.position.z.toFixed(1)}${o.visible ? '' : ' (caché)'}${o.userData.stay ? ' (attend)' : ''}`;
  return 'héros ' + f(E.player) + ' | ' + E.followers.map((o) => (o.userData.key || '?') + ' ' + f(o)).join(' | '); });
await tp(2.4, -10.6); await p.waitForTimeout(600); await E_('morgane', 60000); await log('morgane'); await p.waitForTimeout(1500); console.log('  ', await ou());
await tp(-8, 4); await p.waitForTimeout(1500); console.log('   Kael parti vers l\'ouest :', await ou()); await shot('c1_seul');
await tp(-13.6, 4); await p.waitForTimeout(300); await tp(-15.5, 4); await p.waitForTimeout(2500); await choisir(RUSE); await p.waitForTimeout(1000); await idle(90000, 'choix'); await log('choix ' + (await F('p7_choix')));
await p.waitForTimeout(2500); console.log('  ', await ou()); await shot('c2_apres');
await tp(20, 1); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await choisir(0); await p.waitForTimeout(2500); await idle(120000, 'entrepot'); await log('entrepôt');
await potions();
await tp(0, -46.4); await p.waitForTimeout(300); await tp(0, -50.6); await p.waitForTimeout(2000); await idle(600000, 'varek'); await log('varek'); await shot('c3_varek');
await tp(0, -62.6); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(3000); await idle(120000, 'matin'); await log('matin'); console.log('  ', await ou());
await tp(2.4, -10.6); await p.waitForTimeout(400); await E_('départ', 120000); await log('fin ch7'); console.log('  ', await ou()); await shot('c4_fin');
console.log('drapeaux', await T.flags('^p7_|^e7_|^ch7'));
await fin(0);

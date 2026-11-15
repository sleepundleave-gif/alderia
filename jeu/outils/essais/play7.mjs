import { start } from './lib.mjs';
const T = await start('state6.json'); const { p, ctx, tp, log, mob, E_, choisir, idle, shot, F, fin, potions, state, ev } = T;
const RUSE = process.env.RUSE ? 1 : 0;
await log('départ');
let s = await state();
if (s.phase === 'ch5_brasegarde') { await tp(0, 10); await p.waitForTimeout(300); await tp(0, 12.6); await p.waitForTimeout(1500); await choisir(0); await p.waitForTimeout(2500); await idle(120000, 'vers port'); await log('port'); await shot('b0_port'); }
s = await state();
if (s.phase === 'ch7_port' && !(await F('p7_varek'))) {
  if (!(await F('p7_morgane'))) { await tp(-9, 2.2); await shot('b1_etal'); await tp(2.4, -10.6); await shot('b2_quai'); await E_('morgane', 60000); await log('morgane'); }
  if (!(await F('p7_tim'))) { await tp(-13.6, 4); await p.waitForTimeout(300); await tp(-15.5, 4); await p.waitForTimeout(3000); await shot('b3_orphelinat'); await choisir(RUSE); await p.waitForTimeout(1000); await idle(90000, 'choix'); await log('choix ' + (await F('p7_choix'))); }
  await tp(20, 1); await shot('b4_porte'); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await choisir(0); await p.waitForTimeout(2500); await idle(120000, 'entrepot'); await log('entrepôt');
}
s = await state();
if (s.phase === 'ch7_entrepot') {
  await potions();
  await shot('b5_entrepot');
  if (!(await F('e7_varek'))) {
    // un tour dans le cône d'un garde : alerte et combat
    const g = await ev(() => { const st = window.__game.E.stage; return st.spots.rondes.map(r => r.a); });
    await tp(0, -3.4); await p.waitForTimeout(600); await shot('b6_ronde');
    for (let i = 0; i < 80 && !(await state()).battle && !(await state()).busy; i++) await p.waitForTimeout(250);
    await p.waitForTimeout(1500); await idle(180000, 'alerte'); await log('après alerte ' + (await T.flags('^e7_')));
    await tp(-14, -45.6); await p.waitForTimeout(400); await tp(14.4, -44.6); await E_('coffre b');
    await ctx.storageState({ path: 'state7a.json' });
    await tp(0, -46.4); await p.waitForTimeout(300); await tp(0, -50.6); await p.waitForTimeout(2000); await shot('b7_varek'); await idle(600000, 'varek'); await log('varek');
  }
  await tp(0, -62.6); await shot('b8_gouvernail'); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(3000); await idle(120000, 'matin'); await log('matin');
}
s = await state();
if (s.phase === 'ch7_port' && !(await F('ch7_fin'))) { await tp(2.4, -10.6); await E_('départ', 120000); await log('fin ch7'); await shot('b9_fin'); }
console.log('drapeaux', await T.flags('^p7_|^e7_|^ch7'));
console.log(await ev(() => { const g = window.__game; return JSON.stringify(g.G.inv) + ' nyssa L' + g.G.party.find(h => h.id === 'nyssa').level; }));
await ctx.storageState({ path: 'state7.json' });
await fin(0);

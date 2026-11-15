import { start } from './lib.mjs';
const T = await start('state7.json'); const { p, ctx, tp, log, mob, E_, choisir, idle, shot, F, fin, potions, state, ev } = T;
await log('départ');
let s = await state();
if (s.phase === 'ch7_port') { await tp(0, -17.4); await shot('c0_jetee'); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await choisir(0); await p.waitForTimeout(3000); await idle(240000, 'traversée'); await log('spectres'); }
s = await state();
if (s.phase === 'ch8_traversee') {
  await shot('c1_pont');
  if (!(await F('t8_borin'))) { await tp(-0.6, -8.6); await shot('c2_proue'); await E_('borin', 60000); await log('borin'); }
  await tp(1.8, 7.4); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await choisir(0); await p.waitForTimeout(3000); await idle(120000, 'temple'); await log('temple');
}
s = await state();
if (s.phase === 'ch8_temple') {
  await potions(); await shot('c3_temple');
  if (!(await F('t8_ondine'))) {
    await mob('t8a'); await tp(-9.4, -16.4); await E_('coffre a');
    await tp(0, -19.6); await shot('c4_bassin');
    await tp(7.4, -17.6); await E_('vanne 1', 40000); await shot('c4b_vide'); await mob('t8b');
    if (process.env.ERREUR) { await tp(7.4, -43.6); await E_('vanne 3 trop tôt', 60000); await log('emporté'); }
    await tp(-7.4, -43.6); await E_('vanne 2', 40000); await mob('t8c'); await tp(3.2, -43.2); await E_('stèle');
    await tp(7.4, -43.6); await E_('vanne 3', 40000); await shot('c5_gue'); await log('vannes ' + (await T.flags('^t8_v')));
    await mob('t8d'); await tp(9.4, -64); await E_('coffre b');
    await ctx.storageState({ path: 'state8a.json' });
    await tp(0, -72); await p.waitForTimeout(300); await tp(0, -77.6); await p.waitForTimeout(2500); await shot('c6_ondine'); await idle(600000, 'ondine'); await log('ondine');
  }
  await tp(0, -93.4); await shot('c7_autel'); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(9000); await shot('c8_glace'); await idle(240000, 'vexia'); await log('fin ch8');
}
console.log('drapeaux', await T.flags('^t8_|^ch8'));
console.log(await ev(() => JSON.stringify(window.__game.G.inv)));
await ctx.storageState({ path: 'state8.json' });
await fin(0);

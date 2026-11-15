import { start } from './lib.mjs';
const T = await start('state4.json'); const { p, ctx, tp, log, mob, E_, choisir, idle, shot, F, fin, potions, state, ev } = T;
await log('départ');
let s = await state();
if (s.phase === 'ch3_ville') { await tp(0, 62); await p.waitForTimeout(300); await tp(0, 64.5); await p.waitForTimeout(2500); await idle(120000, 'vers le col'); await p.waitForTimeout(800); await log('col'); await shot('90_col'); }
s = await state();
if (s.phase === 'ch5_col') {
  await potions();
  for (const id of ['c5a']) await mob(id);
  await tp(0, -19.4); await shot('91_glace'); await E_('glace 0', 40000);
  await mob('c5b'); await tp(8.2, -31); await E_('coffre a');
  await tp(0, -43.4); await E_('glace 1', 40000); await mob('c5c'); await tp(-8.4, -58); await E_('coffre b');
  await tp(0, -65.4); await E_('glace 2', 40000); await mob('c5d'); await log('glaces');
  await tp(0, -80); await shot('92_portes'); await tp(0, -84); await p.waitForTimeout(1500); await idle(90000, 'durgana'); await log('durgana'); await shot('93_durgana');
  await tp(-6.2, -86.6); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(3000); await shot('94_forge'); await idle(180000, 'forge'); await p.waitForTimeout(1000); await idle(60000, 'brasegarde'); await log('brasegarde');
  await ctx.storageState({ path: 'state5a.json' });
}
s = await state();
if (s.phase === 'ch5_brasegarde' && !(await F('b5_mission'))) {
  await shot('95_brasegarde'); await tp(0, -4); await shot('95b_pont');
  await tp(0, -34.6); await shot('96_reine'); await E_('reine', 60000); await log('mission');
  await tp(-21, -27); await p.waitForTimeout(300); await tp(-23.4, -27); await p.waitForTimeout(1500); await idle(60000, 'vers mines'); await log('mines');
}
s = await state();
if (s.phase === 'ch5_mines') {
  await potions();
  await shot('97_mines'); await tp(0, -6.4); await p.keyboard.press('KeyE'); await choisir(0); await idle(60000, 'chariot ouest'); await log('galerie ouest'); await shot('97b_galerie');
  await mob('m5a'); await tp(-17.4, -36.2); await E_('cage 1', 40000); await tp(-12, -39); await E_('coffre a');
  await tp(-16, -19); await E_('retour hall', 30000);
  await tp(0, -6.4); await p.keyboard.press('KeyE'); await choisir(1); await idle(60000, 'chariot est'); await mob('m5b');
  await tp(13.6, -36); await E_('cage 2', 40000); await tp(18.6, -37.6); await E_('levier', 40000); await log('levier');
  await tp(16, -19); await E_('retour hall 2', 30000);
  await tp(0, -20); await mob('m5c'); await mob('m5d'); await tp(-5.4, -48.4); await E_('cage 3', 40000); await tp(7.6, -33.4); await E_('coffre b'); await log('chantier');
  await ctx.storageState({ path: 'state5b.json' });
  await tp(0, -57); await shot('98_taraude'); await tp(0, -60); await p.waitForTimeout(1500); await idle(600000, 'taraude'); await log('taraude'); await shot('98b_epave');
  await tp(0, -71.4); await E_('débris', 120000); await p.waitForTimeout(1500); await idle(120000, 'retour reine'); await log('fin ch5');
}
console.log('drapeaux', await T.flags('^c5_|^b5_|^m5_|^ch5'));
console.log('équipement', await ev(() => window.__game.G.party.map(h => h.id + ':' + [h.weapon, h.armor, h.ring].join('/')).join(' ')), await ev(() => JSON.stringify(window.__game.G.inv)));
await ctx.storageState({ path: 'state5.json' });
await fin(0);

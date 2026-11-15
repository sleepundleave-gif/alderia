import { start } from './lib.mjs';
const T = await start('state5.json'); const { p, ctx, tp, log, mob, E_, choisir, idle, shot, F, fin, potions, state, ev } = T;
await log('départ');
let s = await state();
if (s.phase === 'ch5_brasegarde' && !(await F('ch6_fin'))) { await tp(21, -27); await p.waitForTimeout(300); await tp(23.4, -27); await p.waitForTimeout(2500); await idle(120000, 'vers volcan'); await p.waitForTimeout(800); await log('volcan'); await shot('a0_volcan'); }
s = await state();
if (s.phase === 'ch6_volcan') {
  await potions();
  if (!(await F('v6_ignis'))) {
    await mob('v6a'); await p.waitForTimeout(6000); await log('après 6 s de chaleur');
    await tp(0, -18.6); await shot('a1_coulee'); await E_('coulée 0', 60000); await log('capes'); await shot('a2_pont');
    await mob('v6b'); await mob('v6c'); await tp(-6.2, -40); await E_('coffre a');
    await tp(-4.5, -43.6); await E_('coulée 1', 40000); await mob('v6d'); await tp(6.4, -64); await E_('coffre b');
    await tp(4.5, -68.6); await E_('coulée 2', 40000); await mob('v6e'); await log('coulées');
    await ctx.storageState({ path: 'state6a.json' });
    await tp(0, -84); await shot('a3_ignis'); await tp(0, -88); await p.waitForTimeout(1500); await idle(600000, 'ignis'); await log('ignis'); await shot('a4_flamme');
  }
  await tp(0, -102.6); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(6000); await shot('a5_grom'); await idle(600000, 'grom'); await p.waitForTimeout(1500); await idle(60000, 'fuite'); await log('fuite');
}
s = await state();
if (s.phase === 'ch6_fuite') {
  await shot('a6_fuite'); await p.waitForTimeout(3000); console.log('objectif', await ev(() => document.getElementById('objective') ? document.getElementById('objective').textContent : '?'));
  if (process.env.ECHEC) { await p.waitForTimeout(78000); await idle(60000, 'échec'); await log('après échec'); }
  await tp(0, 3); await p.waitForTimeout(300); await tp(0, 6); await p.waitForTimeout(2500); await idle(180000, 'banquet'); await p.waitForTimeout(1500); await idle(120000, 'après banquet'); await log('fin ch6');
}
s = await state();
if (s.phase === 'ch5_brasegarde') { await shot('a7_apres'); }
console.log('drapeaux', await T.flags('^v6_|^ch6|^serment'));
await ctx.storageState({ path: 'state6.json' });
await fin(0);

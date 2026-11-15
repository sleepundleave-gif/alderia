import { start } from './lib.mjs';
const T = await start('state8.json'); const { p, ctx, tp, log, mob, E_, choisir, idle, shot, F, fin, potions, state, ev } = T;
await log('départ');
const phase = async () => (await state()).phase;
if (await phase() === 'ch9_plaine') {
  await shot('d0_colline');
  if (!(await F('s9_vue'))) { await tp(0, -7); await p.waitForTimeout(300); await tp(0, -9); await p.waitForTimeout(2500); await shot('d1_siege'); await idle(60000, 'vue'); }
  await tp(-6.6, -9.6); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(2500); await idle(60000, 'egouts'); await log('égouts');
}
if (await phase() === 'ch9_egouts') {
  await potions(); await shot('d2_egouts');
  const B = [[-7.4, -14], [7.4, -24], [-4.6, -40]], ids = ['s9a', 's9b', 's9c'];
  for (let i = 0; i < 3; i++) { await mob(ids[i]); await tp(B[i][0] + 1.6, B[i][1] + 1.4); await E_('mèche ' + i); }
  await log('mèches ' + (await T.flags('^s9_b')));
  await tp(0, -49); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(4000); await shot('d3_conseil');
  for (let i = 0; i < 400 && (await phase()) !== 'ch9_remparts'; i++) await p.waitForTimeout(300);
  await log('remparts');
}
if (await phase() === 'ch9_remparts') {
  await potions(14);
  await p.waitForTimeout(3000); await shot('d4_remparts');
  // trois vagues ; à la première pause on demande au sergent, à la seconde on laisse courir le chrono
  let vu = false;
  for (let i = 0; i < 1500 && (await phase()) === 'ch9_remparts'; i++) {
    const s = await state();
    if (s.err) { console.log('ERR', s.err); await fin(2); }
    if (s.en && s.busy === 0 && !s.battle && !vu && (await F('r9_vague')) === 1) { vu = true; await log('pause 1'); await shot('d5_pause'); await tp(-3, 1.2); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await choisir(0); }
    await p.waitForTimeout(400);
  }
  await log('catapultes');
}
if (await phase() === 'ch9_catapultes') {
  await idle(60000, 'sortie'); await potions(14); await shot('d6_camp');
  if (process.env.ECHEC) { await p.waitForTimeout(155000); await idle(60000, 'échec'); await log('après échec'); }
  const M = [[-18, -18], [18, -20], [0, -35]], ids = ['k9a', 'k9b', 'k9c'];
  for (let i = 0; i < 3; i++) { await mob(ids[i]); await tp(M[i][0] + 2.6, M[i][1]); if (i === 1) await shot('d7_machine'); await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(1500); if (i < 2) await idle(30000, 'machine ' + i); }
  console.log('objectif', await ev(() => document.getElementById('objective').textContent));
  for (let i = 0; i < 600 && !['ch9_aube', 'ch10_rues'].includes(await phase()); i++) { const s = await state(); if (s.err) { console.log('ERR', s.err); await fin(2); } if (i === 30) await shot('d8_belier'); await p.waitForTimeout(400); }
  await log('après bélier');
}
if (await phase() === 'ch9_aube') { await p.waitForTimeout(2500); await shot('d9_aube'); for (let i = 0; i < 300 && (await phase()) !== 'ch10_rues'; i++) await p.waitForTimeout(300); }
await p.waitForTimeout(1500);
const s = await state(); console.log('phase finale', s.phase, s.err || '');
await log('fin ch9');
console.log('drapeaux', await T.flags('^s9_|^r9_|^k9_|^p9_|^ch9'));
console.log(await ev(() => { const g = window.__game; return JSON.stringify(g.G.inv) + ' | ' + g.G.party.map(h => h.id + ':' + h.armor + '/' + h.ring).join(' '); }));
await ctx.storageState({ path: 'state9.json' });
await fin(0);

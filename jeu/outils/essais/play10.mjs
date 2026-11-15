import { start } from './lib.mjs';
const T = await start('state9.json'); const { p, ctx, tp, log, E_, choisir, idle, shot, F, fin, potions, state, ev } = T;
await log('départ');
const phase = async () => (await state()).phase;
const attendre = async (label, t = 240000) => { await p.waitForTimeout(1500); await idle(t, label); };
if (await phase() === 'ch10_rues') {
  await potions(16); await shot('e0_rues');
  const B = [-10, -34, -56], C = [[-1, -14], [1, -38], [-1, -60]];
  const N = process.env.CIVILS == null ? 3 : +process.env.CIVILS;
  for (let i = 0; i < 3; i++) {
    if (!(await F('c10_b' + i))) { await tp(0, B[i] + 3); await p.waitForTimeout(300); if (i === 1) await shot('e1_barrage'); await tp(0, B[i] + 0.6); await attendre('barrage ' + i); }
    if (i < N && !(await F('c10_s' + i))) { await tp(C[i][0] * 7, C[i][1]); await p.waitForTimeout(300); if (i === 0) await shot('e2_ruelle'); await tp(C[i][0] * 9.6, C[i][1]); await attendre('civil ' + i); }
  }
  await log('rues ' + (await T.flags('^c10_')));
  await ctx.storageState({ path: 'state10a.json' });
  if (!(await F('c10_alinor'))) { await tp(0, -69); await p.waitForTimeout(300); await tp(0, -71.4); await p.waitForTimeout(2500); await shot('e3_alinor'); await idle(90000, 'alinor'); }
  await tp(0, -76.4); await shot('e4_chateau'); await p.waitForTimeout(350); await p.keyboard.press('KeyE');
  if (N < 3) await choisir(0);
  await p.waitForTimeout(6000); await shot('e5_trone');
}
// la salle du trône puis la fin : on suit le déroulement en prenant des images
const noms = ['e6_darian', 'e7_combat', 'e8_pendentif', 'e9_fin'];
let k = 0, t0 = Date.now(), vuCombat = false;
while (Date.now() - t0 < 400000) {
  const s = await state();
  if (s.err) { console.log('ERR', s.err); await fin(2); }
  if (s.battle && !vuCombat) { vuCombat = true; console.log('combat Darian commencé'); await shot('e7_combat'); }
  if (vuCombat && !s.battle && k === 0) { k = 1; console.log('combat terminé, pv', s.party); await p.waitForTimeout(2500); await shot('e8_pendentif'); }
  if (s.phase === 'ch10_fin' && s.choice) break;
  await p.waitForTimeout(400);
}
const s = await state(); console.log('phase', s.phase, 'choix ouvert', !!s.choice);
await shot('e9_fin');
console.log('question', await ev(() => (document.getElementById('choiceQ') || {}).textContent));
console.log('drapeaux', await T.flags('^c10_|^ch10|^acte1|^civils|^bilan'), '| civils', await F('civils_sauves'));
await ctx.storageState({ path: 'state10.json' });
await fin(0);

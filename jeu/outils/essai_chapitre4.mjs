import { chromium } from 'playwright';
const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx = await b.newContext({ viewport: { width: 800, height: 450 }, storageState: process.env.STATE || 'state3.json' });
const p = await ctx.newPage();
const logs = [];
p.on('console', m => { if (m.type() === 'error') logs.push('error: ' + m.text()); });
p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'')));
const SHOTS = new Set((process.env.SHOTS || '').split(',')); const shot = async (n) => { if (!SHOTS.has('*') && ![...SHOTS].some(k => k && n.includes(k))) return; await p.evaluate(() => { window.__sansImage = false; }); await p.waitForTimeout(2600); await p.screenshot({ path: `shots/${n}.png` }); await p.evaluate(() => { window.__sansImage = true; }); };
const ev = (f, a) => p.evaluate(f, a);
const state = () => ev(() => { const g = window.__game; return { busy: g.E.busy, en: g.E.enabled, stage: g.E.stage && g.E.stage.name, phase: g.G.phase, battle: !document.getElementById('battle').classList.contains('hidden'), err: document.getElementById('err').textContent, party: g.G.party.map(h => `${h.id} L${h.level} ${h.hp}pv ${h.mp}pm`).join(' | '), gold: g.G.gold, inv: JSON.stringify(g.G.inv), pos: g.E.player ? [Math.round(g.E.player.position.x*10)/10, Math.round(g.E.player.position.z*10)/10] : null, choice: !document.getElementById('choice').classList.contains('hidden') }; });
async function idle(timeout = 240000, label = '') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await state();
    if (s.err) { console.log('ERR BOX', label, s.err); await shot('error_' + label); throw new Error('err box'); }
    if (s.en && s.busy === 0 && !s.battle) return s;
    await p.waitForTimeout(200);
  }
  const s = await state(); console.log('TIMEOUT', label, JSON.stringify(s)); await shot('timeout_' + label); throw new Error('timeout ' + label);
}
const tp = (x, z) => ev(([x, z]) => { const g = window.__game; g.E.player.position.set(x, 0, z); g.E.followers.forEach(f => f.position.set(x + 0.8, 0, z - 0.8)); g.E.snapCamera(); }, [x, z]);
const log = async (l) => { const s = await state(); console.log(l, '→', s.stage, s.phase, '|', s.party, '| or', s.gold, s.inv, '| pos', s.pos); };
const mobTo = async (id) => { const r = await ev((id) => { const g = window.__game; const m = g.E.stage.mobs.find(m => m.id === id && !m.dead); if (!m) return false; g.E.player.position.set(m.obj.position.x + 0.5, 0, m.obj.position.z); g.E.snapCamera(); return true; }, id); if (!r) console.log('mob absent', id); await p.waitForTimeout(600); };
const waitBattle = async () => { for (let i = 0; i < 100; i++) { if ((await state()).battle) return true; await p.waitForTimeout(100); } return false; };
const E_ = async (label, t = 20000) => { await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(500); await idle(t, label); };
const waitChoice = async () => { for (let i = 0; i < 60; i++) { if ((await state()).choice) return true; await p.waitForTimeout(200); } return false; };
const mob = async (id, t = 90000) => { await mobTo(id); if (!(await waitBattle())) console.log('pas de combat', id); await idle(t, id); await log(id); };
const tpK = (x, z) => ev(([x, z]) => { const g = window.__game; g.E.player.position.set(x, 0, z); g.E.snapCamera(); }, [x, z]);
const flags = () => ev(() => Object.keys(window.__game.G.flags).filter(k => /^s4_|^ch4|^m_(col|san)|^c_(col|san)/.test(k)).join(','));
const ETAPE = process.env.ETAPE || '';
await p.goto('http://localhost:8000/index.html');
await p.evaluate(() => { window.__sansImage = true; });
await p.waitForFunction(() => !document.getElementById('loading') && !document.getElementById('title').classList.contains('hidden'), null, { timeout: 90000 }); await p.waitForTimeout(800);
await ev(() => { const g = window.__game; g.setFastText(true); g.BattleCfg.speed = 25; g.BattleCfg.auto = true; });
await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
await idle(60000, 'continue'); await log('continue');
let s = await state();
if (s.phase === 'ch3_ville') { await tp(0, 62); await p.waitForTimeout(300); await tp(0, 64.5); await p.waitForTimeout(2500); await idle(120000, 'vers collines'); await p.waitForTimeout(800); await log('collines'); await shot('70_collines'); }
s = await state();
if (s.phase === 'ch4_route') {
  for (const id of ['col1', 'col2', 'col3', 'col4', 'col5']) await mob(id);
  await tp(-2.4, -45); await E_('bivouac', 30000); await log('bivouac'); await shot('71_bivouac');
  await tp(-4.2, -49.2); await E_('coffre camp'); await tp(14.2, -77); await E_('coffre cache');
  await tp(0, -106); await shot('72_porte'); await tp(0, -109.6); await E_('porte', 90000); await p.waitForTimeout(800); await log('sanctuaire'); await shot('73_entree');
  await ctx.storageState({ path: 'state4a.json' });
}
s = await state();
if (s.phase === 'ch4_sanctuaire') {
  const f = await flags();
  if (!f.includes('s4_blocs')) {
    await tp(0, -1.5); await p.waitForTimeout(600); await idle(20000, 'tuto blocs'); await mob('san1'); await shot('74_blocs');
    const pousse = async (x, z, l) => { await tpK(x, z); await E_(l); };
    await pousse(-5.7, -6, 'b1 est');
    for (const z of [-6, -8, -10, -12]) await pousse(-2, z + 1.7, 'b1 nord');
    await pousse(-0.3, -14, 'b1 ouest');
    for (const z of [-12, -10, -8]) await pousse(4, z - 1.7, 'b2 sud');
    await shot('75_blocs_presque');
    await pousse(2.3, -6, 'b2 est'); await idle(30000, 'porte1'); await log('blocs'); console.log('  flags', await flags());
  }
  if (!(await flags()).includes('s4_dalles')) {
    await tp(0, -20); await mob('san2');
    await tp(0, -22);
    for (const [x, z] of [[-6, -28], [0, -23], [6, -28]]) { await tpK(x, z); await E_('dalle', 30000); }
    await shot('76_dalles'); await tpK(0, -34); await p.waitForTimeout(400); await tpK(3.4, -37.3); await E_('levier', 30000); await log('dalles'); console.log('  flags', await flags());
    await tp(2, -38);
  }
  if (!(await flags()).includes('s4_pont')) {
    await tp(3.2, -39.2); await E_('stele');
    await tp(-5, -44); await E_('etoile'); await tp(-5, -39.5); await E_('lune'); await tp(5, -39.5); await E_('soleil'); await shot('77_braseros'); await tp(5, -44); await E_('montagne', 40000); await log('pont'); console.log('  flags', await flags()); await tp(0, -44); await shot('78_pont');
  }
  await tp(0, -54); await mob('san3'); await tp(-6.4, -57.6); await E_('coffre braseros'); await tp(-7.8, -21.2); await E_('coffre dalles'); await log('coffres');
  if (!(await flags()).includes('s4_ecl')) { await tp(0, -61); await shot('79_eclaireurs'); await tp(0, -63.5); await p.waitForTimeout(1500); await idle(300000, 'eclaireurs'); await log('eclaireurs'); }
  await ctx.storageState({ path: 'state4b.json' });
  if (ETAPE === 'avant_boss') { console.log(logs.join('\n') || 'no console errors'); await b.close(); process.exit(0); }
  if (!(await flags()).includes('s4_golem')) {
    await tp(0, -73.5); await shot('80_salle_gardien'); await tp(0, -77.5); await p.waitForTimeout(1500);
    if (process.env.MANUEL) { await ev(() => { window.__game.BattleCfg.speed = 5; }); await waitBattle(); await p.waitForTimeout(7000); await shot('81_combat_golem'); await ev(() => { window.__game.BattleCfg.speed = 25; }); }
    await idle(500000, 'golem'); await log('golem'); await shot('82_apres_golem');
  }
  await tp(0, -94.5); await shot('83_eclat'); await E_('eclat', 240000); await p.waitForTimeout(1500); await idle(240000, 'retour'); await log('fin ch4'); await shot('84_fin');
}
await tp(0, 62); await p.waitForTimeout(300); await tp(0, 64.5); await p.waitForTimeout(1500); await idle(60000, 'porte sud apres ch4'); await log('porte sud');
console.log('flags', await flags());
console.log('equip', await ev(() => window.__game.G.party.map(h => h.id + ':' + [h.weapon, h.armor, h.ring].join('/')).join(' ')));
console.log(logs.join('\n') || 'no console errors');
await ctx.storageState({ path: 'state4.json' });
await b.close();

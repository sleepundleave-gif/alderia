// Aides communes aux essais des chapitres 5 à 10
import { chromium } from 'playwright';
export async function start(defaut) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // VUE=640x360 : taille de l'écran ; TACTILE=1 : téléphone (doigt, pas de souris) ; APP=1 : imite l'application Android ; ENCOCHES=g,h,d,b
  const [vl, vh] = (process.env.VUE || '800x450').split('x').map(Number), tactile = !!process.env.TACTILE;
  const ctx = await b.newContext({ viewport: { width: vl, height: vh }, storageState: process.env.STATE || defaut, hasTouch: tactile, isMobile: tactile, deviceScaleFactor: +(process.env.DPR || 1) });
  const p = await ctx.newPage();
  if (process.env.ENCOCHES) await p.addInitScript((e) => { window.__encochesEssai = e; }, process.env.ENCOCHES.split(',').map(Number));
  if (process.env.APP) await p.addInitScript(() => {
    const dire = (...a) => setTimeout(() => window.__maj && window.__maj(...a), 60);
    window.AlderiaApp = { infos: () => JSON.stringify({ app: '1.0', code: 1, jeu: 10, nom: 'Chapitres 1 à 10', base: 10, maj: false, adresse: '' }), encoches: () => '0,0,0,0',
      chercher: (a) => { window.__appels = (window.__appels || []).concat('chercher ' + a); dire('cours', 'Téléchargement…', 0.4); }, choisirFichier: () => { window.__appels = (window.__appels || []).concat('fichier'); dire('echec', 'Ce fichier n\'est pas une mise à jour d\'Aldéria.', -1); }, retablir: () => {}, quitter: () => {} };
  });
  const logs = [];
  p.on('console', m => { if (m.type() === 'error') logs.push('error: ' + m.text()); });
  p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '')));
  const SHOTS = new Set((process.env.SHOTS || '').split(','));
  const ev = (f, a) => p.evaluate(f, a);
  const shot = async (n) => {
    if (!SHOTS.has('*') && ![...SHOTS].some(k => k && n.includes(k))) return;
    try { await ev(() => { window.__sansImage = false; }); await p.waitForTimeout(2600); await p.screenshot({ path: 'shots/' + n + '.jpg', type: 'jpeg', quality: 82, timeout: 45000 }); } catch (e) { console.log("capture ratée", n); }
    await ev(() => { window.__sansImage = true; });
  };
  const state = () => ev(() => { const g = window.__game; return { busy: g.E.busy, en: g.E.enabled, stage: g.E.stage && g.E.stage.name, phase: g.G.phase, battle: !document.getElementById('battle').classList.contains('hidden'), err: document.getElementById('err').textContent, party: g.G.party.map(h => `${h.id} L${h.level} ${h.hp}pv`).join(' | '), gold: g.G.gold, inv: JSON.stringify(g.G.inv), pos: g.E.player ? [Math.round(g.E.player.position.x * 10) / 10, Math.round(g.E.player.position.z * 10) / 10] : null, choice: !document.getElementById('choice').classList.contains('hidden') }; });
  const fin = async (code = 0) => { console.log(logs.join('\n') || 'no console errors'); await b.close(); process.exit(code); };
  async function idle(timeout = 240000, label = '') {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const s = await state();
      if (s.err) { console.log('ERR BOX', label, s.err); await fin(2); }
      if (s.en && s.busy === 0 && !s.battle) return s;
      await p.waitForTimeout(200);
    }
    const s = await state(); console.log('TIMEOUT', label, JSON.stringify(s)); await shot('timeout_' + label); await fin(3);
  }
  const tp = (x, z) => ev(([x, z]) => { const g = window.__game; g.E.player.position.set(x, 0, z); g.E.followers.forEach(f => f.position.set(x + 0.8, 0, z + 0.8)); g.E.snapCamera(); }, [x, z]);
  const log = async (l) => { const s = await state(); console.log(l, '→', s.stage, s.phase, '|', s.party, '| or', s.gold, '| pos', s.pos); };
  const waitBattle = async () => { for (let i = 0; i < 100; i++) { if ((await state()).battle) return true; await p.waitForTimeout(100); } return false; };
  const mobTo = (id) => ev((id) => { const g = window.__game; const m = g.E.stage.mobs.find(m => m.id === id && !m.dead); if (!m) return false; g.E.player.position.set(m.obj.position.x + 0.5, 0, m.obj.position.z); g.E.snapCamera(); return true; }, id);
  const mob = async (id, t = 120000) => { if (!(await mobTo(id))) { console.log('  monstre absent', id); return; } if (!(await waitBattle())) console.log('  pas de combat', id); await idle(t, id); };
  const E_ = async (label, t = 30000) => { await p.waitForTimeout(350); await p.keyboard.press('KeyE'); await p.waitForTimeout(500); await idle(t, label); };
  // appuie sur E puis répond au choix qui s'ouvre (n = rang de l'option, 0 = la première)
  const waitChoice = async (ms = 12000) => { for (let i = 0; i < ms / 200; i++) { if ((await state()).choice) return true; await p.waitForTimeout(200); } return false; };
  const choisir = async (n = 0) => { if (!(await waitChoice())) { console.log('  pas de choix'); return false; } await p.waitForTimeout(250); for (let i = 0; i < n; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(120); } await p.keyboard.press('Enter'); await p.waitForTimeout(400); return true; };
  const flags = (re) => ev((re) => Object.keys(window.__game.G.flags).filter(k => new RegExp(re).test(k)).join(','), re);
  const F = (k) => ev((k) => window.__game.G.flags[k], k);
  await p.goto((process.env.ADRESSE || 'http://localhost:8000/') + 'index.html' + (process.env.GRAPH ? '?graphismes=' + process.env.GRAPH : ''));
  await ev(() => { window.__sansImage = true; });
  await p.waitForFunction(() => !document.getElementById('loading') && !document.getElementById('title').classList.contains('hidden'), null, { timeout: 90000 }); await p.waitForTimeout(800);
  await ev(() => { const g = window.__game; g.setFastText(true); g.BattleCfg.speed = 25; g.BattleCfg.auto = true; });
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
  await idle(90000, 'continue');
  const potions = (n = 12) => ev((n) => { const g = window.__game; g.G.inv.potion_plus = Math.max(g.G.inv.potion_plus || 0, n); }, n);
  return { b, ctx, p, ev, shot, state, idle, tp, log, mob, mobTo, waitBattle, E_, waitChoice, choisir, flags, F, fin, potions, logs };
}

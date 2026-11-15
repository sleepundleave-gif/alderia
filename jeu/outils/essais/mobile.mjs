// mobile.mjs [prefixe] : passe les écrans du jeu sur un téléphone imité (VUE=640x360 TACTILE=1 APP=1 ENCOCHES=g,h,d,b)
// et cherche tout ce qui déborde de l'écran ou passe sous l'encoche. Une image par écran (shots/<prefixe>_<écran>.jpg).
import { start } from './lib.mjs';
process.env.SHOTS = '*'; process.env.TACTILE = process.env.TACTILE || '1'; process.env.VUE = process.env.VUE || '640x360';
const pre = process.argv[2] || 'm', T = await start('state4.json'), { p, ev } = T;
let fautes = 0;
const verifier = async (nom) => {
  const r = await ev(() => {
    const W = innerWidth, H = innerHeight, E = window.__ecran, out = [], defile = [], vu = new Set();
    const fonds = new Set(['fade', 'card', 'title', 'menu', 'narr', 'bTint', 'bFlash', 'majEcran', 'battle', 'touch', 'dmg', 'perso', 'voileBlanc']);
    for (const el of document.querySelectorAll('#ui *')) {
      if (el.closest('.hidden')) continue;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) defile.push((el.id || el.className) + ' défile (' + el.scrollHeight + ' > ' + el.clientHeight + ')');
      if (/auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2) out.push((el.id || el.className) + ' défile en largeur');
      if (fonds.has(el.id)) continue;
      let a = el.parentElement, coupe = false; while (a && a.id !== 'ui') { if (/auto|scroll|hidden/.test(getComputedStyle(a).overflow)) { coupe = true; break; } a = a.parentElement; }
      if (coupe) continue;
      const nomEl = el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0];
      if (vu.has(nomEl)) continue;
      const g = E.g, d = W - E.d, h = E.h, b = H - E.b;
      if (r.left < g - 1 || r.right > d + 1 || r.top < h - 1 || r.bottom > b + 1) { vu.add(nomEl); out.push(nomEl + ' déborde [' + [r.left, r.top, r.right, r.bottom].map(Math.round) + '] zone [' + [g, h, d, b] + ']'); }
    }
    // texte trop petit pour être lu : moins de 9 points réels
    let petit = 0; for (const el of document.querySelectorAll('#ui *')) { if (el.closest('.hidden') || !el.firstChild || el.firstChild.nodeType !== 3 || !el.textContent.trim()) continue; const r = el.getBoundingClientRect(); if (r.width < 1) continue; if (parseFloat(getComputedStyle(el).fontSize) * E.k < 8.9) petit++; }
    return { out, defile, petit, k: +E.k.toFixed(3), ui: [Math.round(E.l), Math.round(E.t)], cls: document.body.className, err: document.getElementById('err').textContent.slice(0, 200) };
  });
  console.log(`${nom} · k=${r.k} interface ${r.ui.join('×')} · ${r.cls}${r.petit ? ' · ' + r.petit + ' textes de moins de 9 points' : ''}${r.err ? ' · ERREUR ' + r.err : ''}`);
  for (const l of r.out) { console.log('    DÉBORDE ' + l); fautes++; }
  for (const l of r.defile) console.log('    (défile) ' + l);
  await T.shot(pre + '_' + nom);
};
const phase = async (n, ms = 4500) => { await ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, n); await p.waitForTimeout(ms); };
const etape = async (nom, f) => { try { await f(); } catch (e) { console.log(nom + ' : essai impossible (' + String(e.message).split('\n')[0] + ')'); } };

await etape('exploration', async () => { await phase('ch1_forge'); await verifier('exploration'); });
await etape('menu', async () => { await ev(() => { window.__game.Input.menuFlag = true; }); await p.waitForTimeout(900); await verifier('menu'); await p.keyboard.press('Escape'); await p.waitForTimeout(500); });
await etape('dialogue', async () => { await ev(() => window.__game.setFastText(false)); await T.tp(-0.2, 26.6); await p.waitForTimeout(500); await p.keyboard.press('KeyE'); await p.waitForTimeout(1500); await verifier('dialogue'); await ev(() => window.__game.setFastText(true)); for (let i = 0; i < 12; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(150); } });
await etape('boutique', async () => { await phase('ch7_port'); await T.tp(-9, 6.2); await p.waitForTimeout(600); await p.keyboard.press('KeyE'); await p.waitForTimeout(1500); await verifier('boutique'); await p.keyboard.press('Enter'); await p.waitForTimeout(900); await verifier('boutique2'); for (let i = 0; i < 4; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } });
await etape('combat', async () => {
  await phase('ch2_bois'); await ev(() => { const g = window.__game; g.BattleCfg.auto = false; g.BattleCfg.speed = 3; const m = g.E.stage.mobs.find((m) => !m.dead); if (m) { g.E.player.position.set(m.obj.position.x + 0.4, 0, m.obj.position.z); g.E.snapCamera(); } });
  for (let i = 0; i < 80; i++) { if (await ev(() => !document.getElementById('battle').classList.contains('hidden') && document.getElementById('bMenu').children.length > 0)) break; await p.waitForTimeout(250); }
  await p.waitForTimeout(600); await verifier('combat');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(700); await verifier('combat_sorts');
});
console.log(fautes ? fautes + ' débordements' : 'aucun débordement');
await T.fin(0);

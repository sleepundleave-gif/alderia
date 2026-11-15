// mobile2.mjs [prefixe] : le combat sur un téléphone imité (menu d'action, sorts, cible)
import { start } from './lib.mjs';
process.env.SHOTS = '*'; process.env.TACTILE = process.env.TACTILE || '1'; process.env.VUE = process.env.VUE || '640x360';
const pre = process.argv[2] || 'c', T = await start('state4.json'), { p, ev } = T;
let fautes = 0;
const verifier = async (nom) => {
  const r = await ev(() => { const W = innerWidth, H = innerHeight, E = window.__ecran, out = [], vu = new Set(), fonds = new Set(['fade', 'card', 'title', 'menu', 'narr', 'bTint', 'bFlash', 'majEcran', 'battle', 'touch', 'dmg', 'perso']);
    for (const el of document.querySelectorAll('#ui *')) { if (el.closest('.hidden')) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || fonds.has(el.id) || el.closest('#dmg')) continue;
      if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) out.push('(défile) ' + (el.id || el.className) + ' ' + el.scrollHeight + ' > ' + el.clientHeight);
      let a = el.parentElement, coupe = false; while (a && a.id !== 'ui') { if (/auto|scroll|hidden/.test(getComputedStyle(a).overflow)) { coupe = true; break; } a = a.parentElement; } if (coupe) continue;
      const n = el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]; if (vu.has(n)) continue;
      if (r.left < E.g - 1 || r.right > W - E.d + 1 || r.top < E.h - 1 || r.bottom > H - E.b + 1) { vu.add(n); out.push('DÉBORDE ' + n + ' [' + [r.left, r.top, r.right, r.bottom].map(Math.round) + ']'); } }
    const m = document.getElementById('bMenu');
    return { out, k: +E.k.toFixed(3), ui: [Math.round(E.l), Math.round(E.t)], menu: m ? [...m.children].map((c) => c.textContent.trim().slice(0, 14)).join(' | ') : '' }; });
  console.log(`${nom} · k=${r.k} interface ${r.ui.join('×')} · menu : ${r.menu}`); for (const l of r.out) { console.log('    ' + l); if (/^DÉBORDE/.test(l)) fautes++; }
  await T.shot(pre + '_' + nom);
};
await ev(() => { const g = window.__game; g.setFastText(true); g.debugPhase('ch5_col'); }); await p.waitForTimeout(6000);
await verifier('exploration');
await ev(() => { const g = window.__game; g.BattleCfg.auto = false; g.BattleCfg.speed = 4; g.G.party.forEach((h) => { h.hp = Math.max(h.hp, 1); }); });
console.log('monstres :', await ev(() => window.__game.E.stage.mobs.map((m) => m.id).join(' ')), await T.mobTo('c5a'));
console.log('combat lancé :', await T.waitBattle());
for (let i = 0; i < 120; i++) { if (await ev(() => { const m = document.getElementById('bMenu'); return m && !m.closest('.hidden') && m.children.length > 2 && getComputedStyle(m).display !== 'none'; })) break; await p.waitForTimeout(250); }
await p.waitForTimeout(700); await verifier('combat');
await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(800); await verifier('combat_2');
await p.keyboard.press('Enter'); await p.waitForTimeout(800); await verifier('combat_3');
console.log(fautes ? fautes + ' débordements' : 'aucun débordement');
await T.fin(0);

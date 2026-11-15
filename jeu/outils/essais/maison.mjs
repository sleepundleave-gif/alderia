// maison.mjs ETAT phase prefixe i[,j,k…] [x,z] : entre dans la maison n° i du lieu (dans l'ordre des portes), prend une image, ressort ; liste les portes.
// x,z : place le héros à cet endroit de la pièce avant l'image (la caméra le suit).
import { start } from './lib.mjs';
const [etat, nom, pre, lesquels = '0', ou] = process.argv.slice(2);
process.env.SHOTS = '*';
const T = await start(etat);
await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
await T.p.waitForTimeout(4500);
const portes = await T.ev(() => window.__game.E.stage.inter.filter((e) => /^Entrer/.test(e.label || '')).map((e) => e.label + ' @' + e.x.toFixed(1) + ',' + e.z.toFixed(1)));
console.log(portes.length + ' portes : ' + portes.join(' | '));
for (const i of lesquels.split(',').map(Number)) {
  const dehors = await T.ev(() => window.__game.E.stage.name);
  await T.ev((i) => { const l = window.__game.E.stage.inter.filter((e) => /^Entrer/.test(e.label || '')); l[i].action(); }, i);
  await T.p.waitForTimeout(2600);
  if (ou) { const [x, z] = ou.split(',').map(Number); await T.tp(x, z); await T.p.waitForTimeout(900); }
  const info = await T.ev(() => { const E = window.__game.E, st = E.stage; return { lieu: st.name, acteurs: Object.entries(st.actors).map(([k, o]) => k + '@' + o.position.x.toFixed(1) + ',' + o.position.z.toFixed(1) + ',y' + o.position.y.toFixed(2)), inter: st.inter.map((e) => e.label), joueur: [E.player.position.x.toFixed(1), E.player.position.z.toFixed(1)] }; });
  console.log(i, JSON.stringify(info));
  await T.shot(pre + i);
  const s = await T.state(); if (s.err) console.log('ERR', s.err);
  // ressortir : marcher dans la porte
  await T.ev(() => { const E = window.__game.E, s = E.stage.interieur; if (s) E.player.position.set((s.sortie.x1 + s.sortie.x2) / 2, 0, s.sortie.z1 + 0.3); });
  await T.p.waitForTimeout(2600);
  const apres = await T.ev(() => window.__game.E.stage.name); if (apres !== dehors) console.log('PAS RESSORTI : ' + apres);
}
await T.fin(0);

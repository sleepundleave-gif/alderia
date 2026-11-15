// decor.mjs ETAT prefixe phase[@x,z[,yaw]] ... : lance chaque phase et prend une image (après s'être déplacé si demandé)
import { start } from './lib.mjs';
const [etat, pre, ...phases] = process.argv.slice(2);
process.env.SHOTS = '*';
const T = await start(etat);
console.log((await T.ev(() => window.__game.PHASE_NAMES)).join(' '));
let i = 0;
for (const ph of phases) {
  const [nom, pos] = ph.split('@');
  if (nom !== '-') await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
  await T.p.waitForTimeout(4500);
  if (pos) { let [x, z, yaw] = pos.replace('+', '').split(',').map(Number); if (pos[0] === '+') { const s0 = await T.state(); x += s0.pos[0]; z += s0.pos[1]; console.log('pos', s0.pos, '→', x, z); } await T.tp(x, z); if (yaw != null && !isNaN(yaw)) await T.ev((y) => { const g = window.__game; g.E.camYaw = y; g.E.snapCamera(); }, yaw); await T.p.waitForTimeout(800); }
  const s = await T.state(); if (s.err) console.log('ERR', s.err);
  const fps = '', info = '';
  await T.shot(pre + (i++)); console.log(nom, s.phase, 'images/s', fps, info);
}
await T.fin(0);

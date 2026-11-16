import { start } from './lib.mjs';
const T = await start('state4.json');
const r = await T.ev(() => { const g = window.__game, E = g.E, u = E.player.userData; const out = { cles: Object.keys(u).join(' ') };
  // noms des clips : cherchés dans le mixeur du héros
  let m = null; E.player.traverse((o) => { if (o.animations && o.animations.length) m = o.animations; }); out.anim = m ? m.map((c) => c.name) : null;
  out.bones = []; E.player.traverse((o) => { if (o.isBone) out.bones.push(o.name); }); out.bones = out.bones.join(' ');
  return out; });
console.log(JSON.stringify(r).slice(0, 3000)); process.exit(0);

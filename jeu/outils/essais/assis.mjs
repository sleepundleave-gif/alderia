import { start } from './lib.mjs';
const T = await start('state4.json');
await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, process.argv[2] || 'ch3_trone'); await T.p.waitForTimeout(4000);
const r = await T.ev((cle) => { const g = window.__game, THREE = g.THREE, o = g.E.stage.actors[cle], out = [`${cle} pos ${o.position.x.toFixed(2)},${o.position.y.toFixed(2)},${o.position.z.toFixed(2)} ry ${o.rotation.y.toFixed(2)} taille ${o.userData.height}`];
  o.updateMatrixWorld(true); const v = new THREE.Vector3(); const vus = new Set();
  o.traverse((b) => { if (b.isBone && /hips|pelvis|upleg|thigh|^leg|calf|shin|foot|toe|head$|spine$|lowerleg|upperleg/i.test(b.name) && !vus.has(b.name)) { vus.add(b.name); b.getWorldPosition(v); out.push(`  ${b.name} : dx ${(v.x - o.position.x).toFixed(2)}  dy ${(v.y - o.position.y).toFixed(2)}  dz ${(v.z - o.position.z).toFixed(2)}`); } });
  const b = new THREE.Box3().setFromObject(o, true); out.push(`  boîte y ${(b.min.y - o.position.y).toFixed(2)}..${(b.max.y - o.position.y).toFixed(2)} z ${(b.min.z - o.position.z).toFixed(2)}..${(b.max.z - o.position.z).toFixed(2)}`);
  return out; }, process.argv[3] || 'roi');
console.log(r.join('\n')); process.exit(0);

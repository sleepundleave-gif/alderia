import { start } from './lib.mjs';
const T = await start('state4.json');
const r = await T.ev(async (noms) => { const u = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /decor\.js/.test(n)); const D = await import(u), THREE = window.__game.THREE, out = [u];
  if (!noms.length) return Object.keys(D);
  for (const n of noms) { if (!D.hasPiece(n)) { out.push(n + ' : absent'); continue; } const p = D.piece(n); p.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(p); const f = (v) => v.toFixed(2);
    const mats = new Set(); p.traverse((m) => { if (m.isMesh) [].concat(m.material).forEach((x) => mats.add((x.name || '?') + (x.transparent ? '(transp ' + x.opacity + ')' : '') + (x.side === 2 ? '(2 faces)' : ''))); });
    out.push(`${n} : x ${f(b.min.x)}..${f(b.max.x)}  y ${f(b.min.y)}..${f(b.max.y)}  z ${f(b.min.z)}..${f(b.max.z)}  ${[...mats].join(', ')}`); }
  return out; }, process.argv.slice(2));
console.log(r.join('\n')); process.exit(0);

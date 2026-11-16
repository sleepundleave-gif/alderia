import { start } from './lib.mjs';
const T = await start('state4.json');
const r = await T.ev(async (noms) => { const u = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /decor\.js/.test(n)); const D = await import(u), THREE = window.__game.THREE, out = [];
  for (const n of noms) { const p = D.piece(n); p.updateMatrixWorld(true); const ms = []; p.traverse((m) => { if (m.isMesh) { [].concat(m.material).forEach((x) => { x.side = 2; }); ms.push(m); } });
    const ray = new THREE.Raycaster(); let x1 = 9, x2 = -9, y1 = 9, y2 = -9;
    for (let x = -1.2; x <= 1.2; x += 0.02) for (let y = 0.02; y < 3; y += 0.02) { ray.set(new THREE.Vector3(x, y, 3), new THREE.Vector3(0, 0, -1)); if (!ray.intersectObjects(ms, false).length && Math.abs(x) < 0.99) { x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); } }
    out.push(`${n} : trou x ${x1.toFixed(2)}..${x2.toFixed(2)}  y ${y1.toFixed(2)}..${y2.toFixed(2)}`); }
  return out; }, process.argv.slice(2));
console.log(r.join('\n')); process.exit(0);

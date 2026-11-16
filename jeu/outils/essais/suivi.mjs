// suivi.mjs phase [secondes] : laisse la scène se jouer (textes passés) et relève, 8 fois par seconde, l'écart entre les pieds de chaque personnage et le sol réel
import { start } from './lib.mjs';
const T = await start('state4.json'), nom = process.argv[2], duree = +(process.argv[3] || 40);
if (process.env.DRAPEAUX) await T.ev((d) => { Object.assign(window.__game.G.flags, JSON.parse(d)); }, process.env.DRAPEAUX);
await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
await T.p.waitForTimeout(2500);
await T.ev(() => { const g = window.__game, E = g.E, THREE = g.THREE; const R = window.__suivi = { pire: {}, n: 0, traces: {} };
  const ray = new THREE.Raycaster(), bas = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3(); let cibles = null, lieu = null;
  setInterval(() => { const st = E.stage; if (!st) return;
    const persos = [['HÉROS', E.player], ...E.followers.map((x, i) => ['compagnon ' + (i + 1), x]), ...Object.entries(st.actors).filter(([, x]) => x.parent)].filter(([, x]) => x && x.visible);
    st.group.children.forEach((c) => { if (c.userData && c.userData.P && !persos.some(([, x]) => x === c) && c.visible) persos.push(['figurant ' + (c.userData.key || c.userData.id || c.uuid.slice(0, 4)), c]); });
    if (lieu !== st) { lieu = st; cibles = []; const ex = new Set(persos.map(([, x]) => x)); st.group.traverse((m) => { if (!m.isMesh || m.isSkinnedMesh || !m.visible) return; const x = [].concat(m.material)[0]; if (x.transparent || x.isShaderMaterial) return; for (let a = m; a; a = a.parent) if (ex.has(a) || a.userData.P || a.userData.corps) return; cibles.push(m); }); }
    R.n++;
    for (const [k, p] of persos) { const u = p.userData, q = p.position; if (u.vol || u.couche) continue;
      const hs = []; for (const [dx, dz] of [[0, 0], [0.16, 0], [-0.16, 0], [0, 0.16], [0, -0.16]]) { o.set(q.x + dx, q.y + 0.95, q.z + dz); ray.set(o, bas); ray.far = 40; const h = ray.intersectObjects(cibles, false); if (h.length) hs.push(h[0].point.y); }
      if (!hs.length) continue; const lo = Math.min(...hs), hi = Math.max(...hs), d = q.y < lo ? q.y - lo : q.y > hi ? q.y - hi : 0;      // entre deux marches : n'importe laquelle des deux convient
      const cle = st.name + ' · ' + k; if (!R.pire[cle] || Math.abs(d) > Math.abs(R.pire[cle].d)) R.pire[cle] = { d, x: q.x, y: q.y, z: q.z, pose: !!u.pose }; }
  }, 125); });
for (let i = 0; i < duree * 2; i++) { await T.p.waitForTimeout(500); const s = await T.state(); if (s.err) { console.log('ERREUR', s.err); break; }
  if (s.choice) { await T.p.keyboard.press('Enter'); } else if (s.busy) await T.p.keyboard.press('Enter');
  if (process.env.FIN && s.en && s.busy === 0 && i > 8) break; }
const r = await T.ev(() => window.__suivi);
console.log(nom, '·', r.n, 'relevés');
let n = 0; for (const [k, v] of Object.entries(r.pire)) if (Math.abs(v.d) > 0.06) { n++; console.log(`    ${k} : ${v.d > 0 ? 'EN L\'AIR' : 'ENFONCÉ'} de ${Math.abs(v.d).toFixed(2)} m en (${v.x.toFixed(1)}, ${v.z.toFixed(1)}) y=${v.y.toFixed(2)}${v.pose ? ' (pose)' : ''}`); }
if (!n) console.log('    personne en l\'air, personne enfoncé');
console.log(T.logs.join('\n') || 'aucune erreur'); process.exit(0);

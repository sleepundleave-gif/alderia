// carte.mjs [phases…] : pour chaque lieu, une CARTE vue de dessus (personnages, points d'action, obstacles) et la
// vérification des PIEDS : un rayon tiré vers le bas sous chaque personnage dit à quelle hauteur est vraiment le sol.
//   CARTES=dossier : où ranger les images (défaut shots/) ; TOUT=1 : une carte par phase (sinon une par lieu)
import { start } from './lib.mjs';
import fs from 'fs';
const T = await start('state4.json'), dossier = process.env.CARTES || 'shots';
T.p.on('crash', () => { console.log('PAGE PLANTÉE'); process.exit(4); });
let phases = process.argv.slice(2); if (!phases.length) phases = await T.ev(() => window.__game.PHASE_NAMES);
const vus = new Set(); let fautes = 0;
for (const nom of phases) {
  await T.ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, nom);
  await T.p.waitForTimeout(3600);
  const r = await T.ev((avecImage) => {
    const g = window.__game, E = g.E, THREE = g.THREE, st = E.stage, b = st.bounds, f = (v) => v.toFixed(2);
    // ----- les personnages
    const persos = [['HÉROS', E.player], ...E.followers.map((o, i) => ['compagnon ' + (i + 1), o]), ...Object.entries(st.actors).filter(([, o]) => o.parent)].filter(([, o]) => o && o.visible);
    const deja = new Set(persos.map(([, o]) => o));
    const mobs = st.mobs.filter((m) => !m.dead && m.obj && m.obj.visible).map((m) => ['monstre ' + m.id, m.obj]);
    // ----- le sol réel : tout le décor sauf les personnages, les ombres et ce qui est transparent
    const cibles = []; const exclus = new Set([...deja, ...mobs.map(([, o]) => o)]);
    st.group.traverse((m) => { if (!m.isMesh || m.isSkinnedMesh || !m.visible || m.userData.shadow) return; const x = [].concat(m.material)[0]; if (x.transparent || x.isShaderMaterial || x.opacity < 1 || x.userData.sansSol) return;
      for (let a = m; a; a = a.parent) { if (exclus.has(a) || a.userData.corps || a.userData.anim || !a.visible) return; } cibles.push(m); });
    const ray = new THREE.Raycaster(), bas = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3();
    const solSous = (x, y, z) => { o.set(x, y + 0.95, z); ray.set(o, bas); ray.far = 40; const h = ray.intersectObjects(cibles, false); return h.length ? h[0].point.y : null; };
    const pieds = [];
    for (const [k, p] of [...persos, ...mobs]) {
      const u = p.userData, q = p.position; if (u.vol) continue;
      const hs = [[0, 0], [0.16, 0], [-0.16, 0], [0, 0.16], [0, -0.16]].map(([dx, dz]) => solSous(q.x + dx, q.y, q.z + dz)).filter((h) => h != null);
      if (!hs.length) { pieds.push(k + ' : aucun sol dessous (' + f(q.x) + ',' + f(q.z) + ') y=' + f(q.y)); continue; }
      const h = hs.sort((a, c) => a - c)[Math.floor(hs.length / 2)], d = q.y - h;
      if (Math.abs(d) > 0.045) pieds.push(k + (d < 0 ? ' ENFONCÉ de ' : ' EN L\'AIR de ') + f(Math.abs(d)) + ' m (' + f(q.x) + ',' + f(q.z) + ') y=' + f(q.y) + ' sol=' + f(h));
    }
    // dans un mur / dans un objet
    for (const [k, p] of persos) { const q = p.position; if (p.userData.col && p.userData.col.off) continue; for (const c of st.colliders) { if (c.off || c.ghost || c.follow === p) continue;
      if (c.box) { if (q.x > c.x1 + 0.05 && q.x < c.x2 - 0.05 && q.z > c.z1 + 0.05 && q.z < c.z2 - 0.05) pieds.push(k + ' dans un mur (' + f(q.x) + ',' + f(q.z) + ')'); }
      else if (!c.follow && Math.hypot(q.x - c.x, q.z - c.z) < c.r - 0.05) pieds.push(k + ' dans un objet (' + f(q.x) + ',' + f(q.z) + ') rond ' + f(c.x) + ',' + f(c.z) + ' r' + f(c.r)); } }
    if (!avecImage) return { lieu: st.name, pieds, n: persos.length };
    // ----- la carte : vue de dessus, le nord (z négatif) en haut
    const M = 4, x1 = b[0] - M, x2 = b[1] + M, z1 = b[2] - M, z2 = b[3] + M, L = x2 - x1, H = z2 - z1, k = Math.min(1500 / L, 1500 / H, 40), W = Math.round(L * k), Hh = Math.round(H * k);
    const cam = new THREE.OrthographicCamera(-L / 2, L / 2, H / 2, -H / 2, 0.1, 400); cam.position.set((x1 + x2) / 2, 150, (z1 + z2) / 2); cam.up.set(0, 0, -1); cam.lookAt((x1 + x2) / 2, 0, (z1 + z2) / 2); cam.updateMatrixWorld();
    const R = E.renderer, taille = new THREE.Vector2(); R.getSize(taille); const pr = R.getPixelRatio(), fog = E.scene.fog; E.scene.fog = null;
    const caches = []; E.scene.traverse((m) => { if (m.isMesh && m.visible && (m.material.isShaderMaterial && m.geometry.boundingSphere && m.geometry.boundingSphere.radius > 300 || m.userData.ciel)) { m.visible = false; caches.push(m); } });
    for (const c of st.roofs || []) if (c.visible !== undefined && c.isObject3D) { /* les toits restent : c'est une carte */ }
    R.setPixelRatio(1); R.setSize(W, Hh, false); R.render(E.scene, cam);
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = Hh + 46; const x = c2.getContext('2d');
    x.fillStyle = '#10131c'; x.fillRect(0, 0, W, Hh + 46); x.drawImage(R.domElement, 0, 46, W, Hh);
    R.setPixelRatio(pr); R.setSize(taille.x, taille.y, false); E.scene.fog = fog; for (const m of caches) m.visible = true;
    const X = (v) => (v - x1) * k, Z = (v) => 46 + (v - z1) * k;
    // limites où l'on peut marcher
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.setLineDash([8, 6]); x.lineWidth = 2; x.strokeRect(X(b[0]), Z(b[2]), (b[1] - b[0]) * k, (b[3] - b[2]) * k); x.setLineDash([]);
    // obstacles
    x.lineWidth = 1.5; for (const c of st.colliders) { if (c.off || c.follow) continue; x.strokeStyle = c.ghost ? 'rgba(120,200,255,.5)' : 'rgba(255,90,90,.75)';
      if (c.box) x.strokeRect(X(c.x1), Z(c.z1), (c.x2 - c.x1) * k, (c.z2 - c.z1) * k); else { x.beginPath(); x.arc(X(c.x), Z(c.z), c.r * k, 0, 7); x.stroke(); } }
    const etiq = (t, px, pz, coul, rond = 5) => { x.fillStyle = coul; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(px, pz, rond, 0, 7); x.fill(); x.stroke();
      x.font = 'bold 13px sans-serif'; const w = x.measureText(t).width; x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(px + 7, pz - 9, w + 6, 17); x.fillStyle = coul; x.fillText(t, px + 10, pz + 4); };
    for (const i of st.inter) { const px = i.obj ? i.obj.position.x : i.x, pz = i.obj ? i.obj.position.z : i.z; if (px == null) continue; if (i.obj && deja.has(i.obj)) continue; const t = typeof i.label === 'function' ? '' : String(i.label || ''); etiq('▸ ' + t.slice(0, 34), X(px), Z(pz), '#8fe0ff', 4); }
    for (const t of st.triggers) { if (t.x1 == null) continue; x.strokeStyle = 'rgba(255,220,90,.8)'; x.setLineDash([4, 4]); x.strokeRect(X(t.x1), Z(t.z1), (t.x2 - t.x1) * k, (t.z2 - t.z1) * k); x.setLineDash([]); }
    for (const [n, p] of mobs) etiq(n.replace('monstre ', '☠ '), X(p.position.x), Z(p.position.z), '#ff8a7a');
    for (const [n, p] of persos) etiq(n + (Math.abs(p.position.y) > 0.03 ? ' ↑' + p.position.y.toFixed(2) : ''), X(p.position.x), Z(p.position.z), n === 'HÉROS' ? '#ffe36a' : n.startsWith('compagnon') ? '#ffd0a0' : '#b6ff9a', n === 'HÉROS' ? 7 : 5);
    // titre, échelle, nord
    x.fillStyle = '#ffe9a8'; x.font = 'bold 20px serif'; x.fillText('Lieu : ' + st.name, 12, 28);
    x.font = '13px sans-serif'; x.fillStyle = '#cfd6e6'; x.fillText('nord ↑   ·   pointillé blanc : limite   ·   rouge : obstacles   ·   bleu : actions   ·   vert : habitants   ·   jaune : le héros', 12 + x.measureText('Lieu : ' + st.name + '    ').width * 1.6, 27);
    const e = 10 * k; x.fillStyle = '#fff'; x.fillRect(W - e - 16, Hh + 46 - 22, e, 4); x.font = 'bold 13px sans-serif'; x.fillText('10 m', W - e - 16, Hh + 46 - 28);
    return { lieu: st.name, pieds, n: persos.length, image: c2.toDataURL('image/jpeg', 0.86), taille: W + '×' + Hh };
  }, process.env.TOUT ? true : !vus.has('?'));
  const premier = !vus.has(r.lieu); vus.add(r.lieu);
  console.log(nom, '·', r.lieu, '·', r.n, 'personnages', r.pieds.length ? '' : '· tout le monde est bien posé'); for (const l of r.pieds) { console.log('    ' + l); fautes++; }
  if (r.image && (premier || process.env.TOUT)) fs.writeFileSync(`${dossier}/${process.env.TOUT ? nom : r.lieu}.jpg`, Buffer.from(r.image.split(',')[1], 'base64'));
}
console.log(fautes ? fautes + ' défauts' : 'aucun défaut');
await T.fin(0);

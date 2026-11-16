// ============================================================
//  LA CARTE DU LIEU  (menu ☰ → « Carte du lieu »)
//  Le lieu où l'on se trouve, vu du dessus, nord en haut : où est Kael, où sont les gens à qui parler,
//  les marchands, les portes où l'on peut entrer, les statues, l'échelle, la sortie…
//  La carte est une vraie image du décor (le même décor que le jeu, regardé d'en haut), prise au moment
//  où on l'ouvre : elle est donc toujours juste, y compris après une mise à jour qui déplace une maison.
//  Elle ne coûte rien pendant le jeu : une seule image est calculée, à l'ouverture.
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { E } from './engine.js';
import { $, pick, menuExtras } from './ui.js';

const NOMS = {
  brumeval: 'Brumeval', bois: 'Le bois de Brumeval', brumeval_feu: 'Brumeval en flammes', murmures: 'La forêt des Murmures', relais: 'Le relais',
  solmeria: 'Solméria, la Cité Blanche', toits: 'Les toits de Solméria', egouts: 'Les égouts de Solméria', trone: 'La salle du trône',
  collines: 'Les collines', sanctuaire: 'Le sanctuaire de la Terre', col: 'Le col', brasegarde: 'Brasegarde', mines: 'Les mines', volcan: 'Le volcan', fuite: 'La galerie qui s\'effondre',
  port: 'Port-Azur', entrepot: 'L\'entrepôt des Mouettes Noires', navire: 'La Vouivre', temple_eau: 'Le temple englouti',
  plaine: 'La plaine', egouts9: 'Les égouts', remparts: 'Les remparts', catapultes: 'Les catapultes', porte_ouest: 'La porte Ouest', rues_feu: 'Les rues en feu',
};
export const nomDuLieu = (st) => (st && (st.titre || NOMS[st.name])) || 'Ce lieu';

// Dessine la carte du lieu courant dans un canevas neuf. « cote » : plus grand côté de l'image, en points.
export function dessinerCarte(cote = 1200, largeurAffichee = 640) {
  const st = E.stage, R = E.renderer; if (!st || !R) return null;
  const b = st.bounds, M = 3, x1 = b[0] - M, x2 = b[1] + M, z1 = b[2] - M, z2 = b[3] + M, L = x2 - x1, H = z2 - z1;
  const k = Math.min(cote / L, cote / H, 48), W = Math.round(L * k), Hh = Math.round(H * k);
  const cam = new THREE.OrthographicCamera(-L / 2, L / 2, H / 2, -H / 2, 0.1, 500);
  cam.position.set((x1 + x2) / 2, 200, (z1 + z2) / 2); cam.up.set(0, 0, -1); cam.lookAt((x1 + x2) / 2, 0, (z1 + z2) / 2); cam.updateMatrixWorld();
  // le ciel et le brouillard ne se regardent pas d'en haut ; les habitants sont remis en vue le temps de l'image
  const taille = new THREE.Vector2(); R.getSize(taille); const pr = R.getPixelRatio(), fog = E.scene.fog, fond = E.scene.background, remis = [];
  E.scene.traverse((m) => {
    if (m.isMesh && m.visible && m.material && m.material.isShaderMaterial && m.geometry.boundingSphere && m.geometry.boundingSphere.radius > 300) { m.visible = false; remis.push([m, true]); }
    else if (m.userData && m.userData.corps && !m.userData.corps.visible && m.visible) { m.userData.corps.visible = true; remis.push([m.userData.corps, false]); }
  });
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
  try {
    E.scene.fog = null; R.setPixelRatio(1); R.setSize(W, Hh, false); R.render(E.scene, cam);
    x.fillStyle = '#141a26'; x.fillRect(0, 0, W, Hh); x.drawImage(R.domElement, 0, 0, W, Hh);
  } finally {
    R.setPixelRatio(pr); R.setSize(taille.x, taille.y, false); E.scene.fog = fog; E.scene.background = fond;
    for (const [m, v] of remis) m.visible = v;
    if (E.camera) R.render(E.scene, E.camera);                 // l'image du jeu est remise tout de suite (pas d'éclair derrière le menu)
  }
  const part = Math.min(1, 1.2 * W / Hh);                     // une carte en hauteur est affichée moins large, pour ne pas faire trois écrans de haut
  c.style.width = Math.round(part * 100) + '%';
  const X = (v) => (v - x1) * k, Z = (v) => (v - z1) * k, f = Math.max(1, W / (largeurAffichee * part));          // f : traits et lettres gardent la même taille à l'écran, quelle que soit la carte
  // la limite du lieu
  x.strokeStyle = 'rgba(255,255,255,.5)'; x.setLineDash([7 * f, 5 * f]); x.lineWidth = 1.6 * f; x.strokeRect(X(b[0]), Z(b[2]), (b[1] - b[0]) * k, (b[3] - b[2]) * k); x.setLineDash([]);
  // étiquettes : on évite qu'elles se recouvrent en descendant celle qui gêne
  const prises = [];
  const etiq = (t, px, pz, coul, rond) => {
    x.fillStyle = coul; x.strokeStyle = '#000'; x.lineWidth = 1.6 * f; x.beginPath(); x.arc(px, pz, rond * f, 0, 7); x.fill(); x.stroke();
    if (!t) return;
    x.font = `bold ${Math.round(10.5 * f)}px sans-serif`; const w = x.measureText(t).width + 8 * f, h = 14 * f;
    let ex = px + (rond + 3) * f, ey = pz - h / 2; if (ex + w > W - 2) ex = px - (rond + 3) * f - w;
    for (let n = 0; n < 6 && prises.some((q) => ex < q[0] + q[2] && ex + w > q[0] && ey < q[1] + q[3] && ey + h > q[1]); n++) ey += h + 1;
    prises.push([ex, ey, w, h]);
    x.fillStyle = 'rgba(8,10,18,.78)'; x.fillRect(ex, ey, w, h); x.fillStyle = coul; x.fillText(t, ex + 4 * f, ey + h - 3.6 * f);
  };
  const court = (t) => { t = String(t).replace(/<[^>]+>/g, ''); return t.length > 30 ? t.slice(0, 29) + '…' : t; };
  const pl = E.player, vus = new Set();
  // les portes où l'on entre : un simple point (il y en a trop pour les nommer), sauf celles qui ont un nom
  for (const i of st.inter) {
    if (i.off || (i.cond && !i.cond()) || typeof i.label !== 'string') continue;
    const px = i.obj ? i.obj.position.x : i.x, pz = i.obj ? i.obj.position.z : i.z; if (px == null || (i.obj && !i.obj.visible)) continue;
    if (i.obj) vus.add(i.obj);
    if (i.label === 'Entrer') etiq('', X(px), Z(pz), '#d9b98a', 2.6);
    else if (/^Parler /.test(i.label)) etiq(court(i.label.replace(/^Parler (à la |à l'|au |aux |à )/, '').replace(/^./, (l) => l.toUpperCase())), X(px), Z(pz), '#b6ff9a', 3.4);
    else etiq(court(i.label), X(px), Z(pz), '#8fe0ff', 3.2);
  }
  for (const m of st.mobs) if (!m.dead && m.obj && m.obj.visible) etiq('', X(m.obj.position.x), Z(m.obj.position.z), '#ff7a6a', 3);
  for (const fo of E.followers) if (fo.visible) etiq('', X(fo.position.x), Z(fo.position.z), '#ffd0a0', 3);
  if (pl) {                                                   // Kael : un point jaune et une flèche dans le sens où il regarde
    const px = X(pl.position.x), pz = Z(pl.position.z), a = pl.rotation.y;
    x.fillStyle = '#ffe36a'; x.strokeStyle = '#000'; x.lineWidth = 1.6 * f; x.beginPath();
    x.moveTo(px + Math.sin(a) * 11 * f, pz + Math.cos(a) * 11 * f); x.lineTo(px + Math.sin(a + 2.5) * 7 * f, pz + Math.cos(a + 2.5) * 7 * f); x.lineTo(px + Math.sin(a - 2.5) * 7 * f, pz + Math.cos(a - 2.5) * 7 * f); x.closePath(); x.fill(); x.stroke();
    etiq('Kael (vous êtes ici)', px, pz, '#ffe36a', 4.4);
  }
  // le nord et l'échelle
  x.fillStyle = 'rgba(8,10,18,.72)'; x.fillRect(6 * f, 6 * f, 46 * f, 20 * f); x.fillStyle = '#fff'; x.font = `bold ${Math.round(11 * f)}px sans-serif`; x.fillText('Nord ↑', 10 * f, 20 * f);
  const e = (L > 60 ? 10 : 5) * k; x.fillStyle = 'rgba(8,10,18,.72)'; x.fillRect(W - e - 14 * f, Hh - 26 * f, e + 8 * f, 20 * f);
  x.fillStyle = '#fff'; x.fillRect(W - e - 10 * f, Hh - 11 * f, e, 2.4 * f); x.fillText((L > 60 ? '10' : '5') + ' m', W - e - 10 * f, Hh - 14 * f);
  return c;
}

async function ouvrirCarte() {
  const box = $('menuBox'), st = E.stage;
  box.innerHTML = `<h3>Carte — ${nomDuLieu(st)}</h3><div id="carteVue"></div>
    <p class="carteLegende"><span style="color:#ffe36a">▲ Kael</span> · <span style="color:#ffd0a0">● compagnons</span> · <span style="color:#b6ff9a">● à qui parler</span> · <span style="color:#8fe0ff">● à faire</span> · <span style="color:#d9b98a">● porte où entrer</span> · <span style="color:#ff7a6a">● monstre</span></p><div id="mList"></div>`;
  let c = null; try { c = dessinerCarte(1300, $('carteVue').clientWidth || 640); } catch (_) { c = null; }
  if (c) { c.className = 'carteImage'; $('carteVue').appendChild(c); } else $('carteVue').textContent = 'La carte de ce lieu ne peut pas être dessinée.';
  await pick($('mList'), [], { cancel: true, cancelLabel: '← Retour' });
}
menuExtras.unshift({ label: 'Carte du lieu', sub: 'Où je suis, à qui parler, où entrer', action: ouvrirCarte });

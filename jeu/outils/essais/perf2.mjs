// perf2.mjs phase : d'où viennent les objets dessinés (par famille), détail des pièces importées et des personnages
import { start } from './lib.mjs';
const T = await start('state4.json'), { p, ev } = T;
const ph = process.argv[2];
await ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, ph); await p.waitForTimeout(5000);
const r = await ev(() => {
  const g = window.__game, E = g.E, R = E.renderer, sc = E.scene, cam = E.camera;
  window.__sansImage = true;
  const dessine = { perso: 0, instances: 0, fusion: 0, autre: 0 }, triD = { perso: 0, instances: 0, fusion: 0, autre: 0 }, autres = {};
  const fam = (o) => o.isSkinnedMesh ? 'perso' : o.isInstancedMesh ? 'instances' : (o.parent === E.stage.staticGroup ? 'fusion' : 'autre');
  sc.traverse((o) => { if (o.isMesh) o.onBeforeRender = () => { const f = fam(o); dessine[f]++; const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); triD[f] += n;
    if (f === 'autre') { let a = o; while (a.parent && a.parent !== E.stage.group && a.parent !== sc) a = a.parent; const k = (a.name || (a.userData.creature ? 'bête' : a.userData.imported ? 'perso(arme…)' : a.type)) + ''; autres[k] = (autres[k] || 0) + 1; } }; });
  R.setPixelRatio(1); R.setSize(2, 2, false); R.render(sc, cam);
  // pièces importées : par matière
  const kits = new Map(); let fusionMats = { lambertSimple: 0, autres: 0 };
  for (const o of E.stage.staticGroup.children) {
    if (o.isInstancedMesh) { const k = o.material.uuid; let e = kits.get(k); if (!e) kits.set(k, e = { nom: o.material.name, geos: new Set(), series: 0, n: 0, tri: 0, alpha: o.material.alphaTest > 0 }); e.geos.add(o.geometry.uuid); e.series++; e.n += o.count; e.tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * o.count; }
    else if (o.isMesh) { const m = o.material; if (m.isMeshLambertMaterial && !m.map && !m.transparent && !m.alphaTest && m.emissive.getHex() === 0 && !m.vertexColors) fusionMats.lambertSimple++; else fusionMats.autres++; }
  }
  const lk = [...kits.values()].map((e) => ({ nom: e.nom, geos: e.geos.size, series: e.series, n: e.n, tri: Math.round(e.tri), alpha: e.alpha })).sort((a, b) => b.series - a.series);
  // tailles des pièces
  const tailles = { '<300': [0, 0], '<1500': [0, 0], '<6000': [0, 0], 'plus': [0, 0] };
  const parGeo = new Map(); for (const o of E.stage.staticGroup.children) if (o.isInstancedMesh) { const k = o.geometry.uuid + o.material.uuid; let e = parGeo.get(k); if (!e) parGeo.set(k, e = { t: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, n: 0 }); e.n += o.count; }
  for (const e of parGeo.values()) { const c = e.t < 300 ? '<300' : e.t < 1500 ? '<1500' : e.t < 6000 ? '<6000' : 'plus'; tailles[c][0]++; tailles[c][1] += e.t * e.n; }
  // un personnage
  const persos = []; for (const o of [E.player, ...E.followers, ...E.stage.anims]) { if (!o || !o.userData.corps) continue; const ms = []; o.userData.corps.traverse((m) => { if (m.isSkinnedMesh && m.visible) ms.push(m); }); persos.push({ pieces: ms.length, mats: new Set(ms.map((m) => [].concat(m.material).map((x) => x.uuid).join('+'))).size, sq: new Set(ms.map((m) => m.skeleton.uuid)).size, tri: Math.round(ms.reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0)), multi: ms.filter((m) => Array.isArray(m.material)).length, noms: ms.map((m) => m.name + ':' + [].concat(m.material)[0].name + ':' + Math.round((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3)).join(' ') }); }
  return { dessine, triD, autres, fusionMats, nbMats: kits.size, lk: lk.slice(0, 40), tailles, persos: persos.slice(0, 4), nPersos: persos.length, series: E.stage.series };
});
console.log('dessinés :', JSON.stringify(r.dessine), '· triangles :', JSON.stringify(Object.fromEntries(Object.entries(r.triD).map(([k, v]) => [k, Math.round(v / 1000) + ' k']))));
console.log('« autre » :', JSON.stringify(r.autres));
console.log('décor fusionné :', JSON.stringify(r.fusionMats), '· séries de pièces :', r.series, '· matières de pièces :', r.nbMats);
console.log('pièces par taille [nombre de (pièce, matière), triangles] :', JSON.stringify(r.tailles));
for (const e of r.lk) console.log('   ', e.nom.padEnd(28), 'pièces', String(e.geos).padStart(3), 'séries', String(e.series).padStart(3), 'copies', String(e.n).padStart(4), 'tri', String(e.tri).padStart(7), e.alpha ? 'découpé' : '');
console.log(r.nPersos + ' personnages ; exemples :'); for (const q of r.persos) console.log('   ', JSON.stringify(q).slice(0, 900));
await T.fin(0);

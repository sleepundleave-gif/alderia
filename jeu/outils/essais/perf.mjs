// perf.mjs phase… : ce que chaque scène coûte au téléphone (objets à dessiner, triangles, calculs par image)
import { start } from './lib.mjs';
const T = await start('state4.json'), { p, ev } = T;
for (const ph of process.argv.slice(2)) {
  await ev((n) => { const g = window.__game; g.setFastText(true); g.debugPhase(n); }, ph); await p.waitForTimeout(5000);
  const r = await ev(() => {
    const g = window.__game, E = g.E, R = E.renderer, sc = E.scene, cam = E.camera;
    const t = { mesh: 0, skinned: 0, os: 0, inst: 0, instN: 0, transp: 0, alpha: 0, visibles: 0, points: 0, sprites: 0, lights: 0, tri: 0, triSkin: 0 }, mats = {}, tex = new Map(), geos = new Set(), gros = [];
    sc.traverse((o) => {
      if (o.isLight) t.lights++;
      if (o.isSprite) t.sprites++; if (o.isPoints) t.points++;
      if (!o.isMesh) return; t.mesh++;
      const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      t.tri += n; geos.add(o.geometry.uuid);
      if (o.isSkinnedMesh) { t.skinned++; t.os += o.skeleton.bones.length; t.triSkin += n; }
      if (o.isInstancedMesh) { t.inst++; t.instN += o.count; }
      for (const m of [].concat(o.material)) { mats[m.type] = (mats[m.type] || 0) + 1; if (m.transparent) t.transp++; if (m.alphaTest > 0) t.alpha++; for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) if (m[k] && m[k].image) tex.set(m[k].uuid, (m[k].image.width || 0) + 'x' + (m[k].image.height || 0) + ' ' + k); }
      gros.push([Math.round(n), o.name || o.parent && o.parent.name || '?', o.isInstancedMesh ? 'x' + o.count : '', [].concat(o.material)[0].type.replace('Mesh', '').replace('Material', '')]);
    });
    gros.sort((a, b) => b[0] - a[0]);
    // par famille
    const fam = { perso: [0, 0], instances: [0, 0], fusion: [0, 0], autre: [0, 0] }, sq = new Set(), persos = new Set(), horsChamp = { n: 0, tri: 0 };
    sc.traverse((o) => { if (!o.isMesh || !o.visible) return; let vis = true; for (let a = o.parent; a; a = a.parent) if (!a.visible) vis = false; if (!vis) return;
      const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
      const f = o.isSkinnedMesh ? 'perso' : o.isInstancedMesh ? 'instances' : n > 3000 ? 'fusion' : 'autre'; fam[f][0]++; fam[f][1] += n;
      if (o.isSkinnedMesh) { sq.add(o.skeleton.uuid); let a = o; while (a.parent && !a.userData.mixer) a = a.parent; persos.add(a.uuid);
        const w = new cam.position.constructor(); o.getWorldPosition(w); const d = w.clone().sub(cam.position), fwd = new cam.position.constructor(); cam.getWorldDirection(fwd); const dist = d.length(); if (d.normalize().dot(fwd) < 0.55 || dist > 70) { horsChamp.n++; horsChamp.tri += n; } } });
    t.fam = Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, v[0] + ' obj ' + Math.round(v[1] / 1000) + ' k'])); t.sq = sq.size; t.persos = persos.size; t.hors = horsChamp.n + ' pièces ' + Math.round(horsChamp.tri / 1000) + ' k tri'; t.frustum = [0, 0]; sc.traverse((o) => { if (o.isMesh) t.frustum[o.frustumCulled ? 0 : 1]++; });
    const mesure = (f, n = 40) => { const t0 = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - t0) / n; };
    // coût des calculs seuls (image de 2×2 points : le dessin lui-même ne compte presque plus)
    const w = R.domElement.width, h = R.domElement.height, pr = R.getPixelRatio();
    window.__sansImage = true;
    const maj = mesure(() => E.update(1 / 60));
    R.setPixelRatio(1); R.setSize(2, 2, false);
    R.info.autoReset = true; R.render(sc, cam);
    const info = { calls: R.info.render.calls, tri: R.info.render.triangles, prog: R.info.programs.length, geo: R.info.memory.geometries, tex: R.info.memory.textures };
    const rendu = mesure(() => R.render(sc, cam), 30);
    const mat = mesure(() => sc.updateMatrixWorld(true), 30);
    R.setPixelRatio(pr); E.resize();
    const tl = {}; for (const v of tex.values()) tl[v] = (tl[v] || 0) + 1;
    return { bilan: g.BILAN, niveau: g.Q.nom, t, mats, tl, info, maj: +maj.toFixed(2), rendu: +rendu.toFixed(2), mat: +mat.toFixed(2), toile: w + 'x' + h + ' pr ' + pr, gros: gros.slice(0, 14), mixers: (E.stage.anims || []).length, aa: R.getContextAttributes().antialias, fog: !!sc.fog };
  });
  console.log(`graphismes ${r.niveau} · modèles allégés : ${r.bilan.pieces} pièces, ${Math.round(r.bilan.avant / 1000)} k → ${Math.round(r.bilan.apres / 1000)} k triangles`);
  console.log(`\n== ${ph} · toile ${r.toile} · antialias ${r.aa}`);
  console.log(`  dessinés par image : ${r.info.calls} objets, ${Math.round(r.info.tri / 1000)} k triangles · programmes ${r.info.prog} · géométries ${r.info.geo} · textures ${r.info.tex}`);
  console.log(`  scène : ${r.t.mesh} maillages (${Math.round(r.t.tri / 1000)} k tri), dont ${r.t.skinned} animés à squelette (${r.t.os} os, ${Math.round(r.t.triSkin / 1000)} k tri), ${r.t.inst} groupes d'instances (${r.t.instN}), transparents ${r.t.transp}, découpés ${r.t.alpha}, lumières ${r.t.lights}`);
  console.log(`  familles : ${JSON.stringify(r.t.fam)} · ${r.t.persos} personnages, ${r.t.sq} squelettes · personnages hors du champ ou loin : ${r.t.hors} · tri par le champ : ${r.t.frustum[0]} oui / ${r.t.frustum[1]} non`);
  console.log(`  calculs par image (ordinateur) : logique ${r.maj} ms · préparation du dessin ${r.rendu} ms (dont matrices ${r.mat} ms)`);
  console.log('  matières : ' + JSON.stringify(r.mats) + ' · textures : ' + JSON.stringify(r.tl));
  console.log('  plus gros : ' + r.gros.map((g) => g.join(' ')).join(' | '));
}
await T.fin(0);

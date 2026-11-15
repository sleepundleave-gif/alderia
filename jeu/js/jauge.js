// ============================================================
//  JAUGE D'ADRESSE (mini-jeu de la forge, chapitre 5)
//  Un curseur va et vient sur une barre ; il faut l'arrêter dans la zone colorée.
//  Touche Espace, Entrée ou E, ou un appui sur la barre. Renvoie true si le curseur est dans la zone.
// ============================================================
import { BattleCfg } from './battle.js';

export function jauge({ titre, aide, zone = [0.4, 0.6], vitesse = 0.9, couleur = '#ff8a2a' }) {
  return new Promise((fin) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;pointer-events:auto;left:50%;bottom:16%;transform:translateX(-50%);width:min(440px,86%);padding:14px 16px 16px;background:rgba(18,14,12,.92);border:2px solid #c8a060;border-radius:12px;color:#f4ead8;font:16px/1.35 Georgia,serif;z-index:60;text-align:center;touch-action:none;user-select:none';
    d.innerHTML = `<div style="font-weight:bold;font-size:18px;margin-bottom:4px">${titre}</div><div style="opacity:.85;margin-bottom:10px">${aide}</div>`
      + `<div style="position:relative;height:26px;background:#3a302a;border-radius:6px;overflow:hidden">`
      + `<div style="position:absolute;top:0;bottom:0;left:${zone[0] * 100}%;width:${(zone[1] - zone[0]) * 100}%;background:${couleur}"></div>`
      + `<div id="jaugeCurseur" style="position:absolute;top:-2px;bottom:-2px;width:6px;margin-left:-3px;background:#fff;box-shadow:0 0 6px #fff"></div></div>`
      + `<div style="margin-top:10px;opacity:.75;font-size:14px">Espace ou appui : arrêter le curseur</div>`;
    (document.getElementById('ui') || document.body).appendChild(d);      // dans l'interface : mise à l'échelle de l'écran avec elle
    const cur = d.querySelector('#jaugeCurseur');
    const t0 = performance.now(); let pos = 0, fini = false, arme = false;
    const stop = (force) => {
      if (fini || (!arme && force == null)) return; fini = true;
      const ok = force != null ? force : (pos >= zone[0] && pos <= zone[1]);
      cur.style.background = ok ? '#8aff8a' : '#ff5a4a';
      window.removeEventListener('keydown', touche, true);
      setTimeout(() => { d.remove(); fin(ok); }, 450);
    };
    const touche = (e) => { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); stop(); } };
    window.addEventListener('keydown', touche, true);
    d.addEventListener('pointerdown', (e) => { e.preventDefault(); stop(); });
    setTimeout(() => { arme = true; }, 350);                    // l'appui qui a fermé le dialogue ne compte pas
    if (BattleCfg.auto) setTimeout(() => { pos = (zone[0] + zone[1]) / 2; cur.style.left = pos * 100 + '%'; stop(true); }, 500);     // essais automatiques
    (function pas() {
      if (fini) return;
      const t = (performance.now() - t0) / 1000 * vitesse, k = t % 2;
      pos = k < 1 ? k : 2 - k; cur.style.left = pos * 100 + '%';
      requestAnimationFrame(pas);
    })();
  });
}

// ============================================================
//  INTERFACE : dialogues, choix, messages, menu, écrans pleins
// ============================================================
import { Input, waitOk, pressOk } from './input.js';
import { sfx, toggleMute, initAudio } from './audio.js';
import { G, heroStats, knownSkills, xpForNext, removeItem, countItem, healHero } from './state.js';
import { HEROES, SKILLS, ITEMS, EQUIP, STAT_LABELS } from './data.js';

export const $ = (id) => document.getElementById(id);
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const show = (el, on = true) => el.classList.toggle('hidden', !on);

// Couleur du nom de chaque personnage dans la boîte de dialogue
const NAME_COLORS = {
  KAEL: '#8fc0ff', HAGEN: '#e0b080', MIRA: '#ffe08a', LYRA: '#ff9a5a', DARIAN: '#b08ae0',
  NYSSA: '#f07a7a', BORIN: '#7aa0f0', ALDRIC: '#c8c8e0', 'ROI ALDEMAR': '#f0d060', 'PRINCESSE ALINOR': '#a0c8ff', RENAUD: '#9ab0e0', GARDE: '#9ab0e0',
  'SERGENT KRALL': '#e06a6a', SOLDAT: '#c0c0c8', ODILE: '#d0a0e0', BERTHE: '#f0b0a0',
};

let fastText = false;
export function setFastText(v) { fastText = v; }

// ---------- Dialogue ----------
let hideTimer = null;
export async function say(name, text) {
  clearTimeout(hideTimer);
  const dlg = $('dlg'), nm = $('dlgName'), tx = $('dlgText'), nx = $('dlgNext');
  document.body.classList.add('dialog');
  show(dlg);
  nm.textContent = name || '';
  nm.style.background = NAME_COLORS[name] || '#d9b866';
  const plain = text.replace(/\*/g, '');
  const html = text.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  let done = false;
  nx.style.visibility = 'hidden';
  if (fastText) { tx.innerHTML = html; done = true; }
  else {
    tx.textContent = '';
    (async () => {
      for (let i = 1; i <= plain.length && !done; i++) {
        tx.textContent = plain.slice(0, i);
        if (i % 3 === 0) sfx('text');
        await sleep(18);
      }
      done = true; tx.innerHTML = html; nx.style.visibility = 'visible';
    })();
    await waitOk();
    if (!done) { done = true; tx.innerHTML = html; nx.style.visibility = 'visible'; await waitOk(); }
    sfx('move');
    hideTimer = setTimeout(() => { show(dlg, false); document.body.classList.remove('dialog'); }, 80);
    return;
  }
  nx.style.visibility = 'visible';
  await (fastText ? sleep(1) : waitOk());
  hideTimer = setTimeout(() => { show(dlg, false); document.body.classList.remove('dialog'); }, 80);
}

// Plusieurs répliques d'affilée : [['NOM','texte'], ...]
export async function talk(lines) { for (const [n, t] of lines) await say(n, t); }

// ---------- Menu générique (clavier, souris, tactile) ----------
export function pick(container, options, cfg = {}) {
  return new Promise((res) => {
    container.innerHTML = cfg.header || '';
    let idx = options.findIndex(o => !o.disabled); if (idx < 0) idx = 0;
    const all = options.slice();
    if (cfg.cancel) all.push({ label: cfg.cancelLabel || '← Retour', back: true });
    const btns = all.map((o, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = (o.right ? `<span class="r">${o.right}</span>` : '') + o.label + (o.sub ? `<small>${o.sub}</small>` : '');
      b.disabled = !!o.disabled;
      b.addEventListener('click', () => { initAudio(); if (!o.disabled) done(i); });
      b.addEventListener('pointerenter', () => { if (!o.disabled && idx !== i) { idx = i; hl(); } });
      container.appendChild(b);
      return b;
    });
    function hl() { btns.forEach((b, i) => b.classList.toggle('sel', i === idx)); if (cfg.onHover) cfg.onHover(all[idx].back ? -1 : idx); }
    function done(i) { Input.nav = null; sfx(all[i].back ? 'cancel' : 'ok'); res(all[i].back ? -1 : i); }
    Input.nav = (a) => {
      if (a === 'up' || a === 'down') {
        const d = a === 'up' ? -1 : 1;
        for (let k = 0; k < all.length; k++) { idx = (idx + d + all.length) % all.length; if (!all[idx].disabled) break; }
        sfx('move'); hl(); btns[idx].scrollIntoView({ block: 'nearest' });
      } else if (a === 'ok') { if (!all[idx].disabled) done(idx); }
      else if (a === 'cancel' && cfg.cancel) { done(all.length - 1); }
    };
    hl();
  });
}

// Question avec choix ; renvoie l'indice choisi (ou -1 si annulé)
export async function choose(question, options, cfg = {}) {
  const box = $('choice');
  document.body.classList.add('dialog');
  show(box);
  $('choiceQ').innerHTML = question || '';
  const opts = options.map(o => typeof o === 'string' ? { label: o } : o);
  const r = await pick($('choiceList'), opts, cfg);
  show(box, false);
  document.body.classList.remove('dialog');
  return r;
}

// ---------- Messages ----------
export function toast(text) {
  const d = document.createElement('div');
  d.className = 'toast'; d.innerHTML = text;
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

export function setObjective(text) {
  showHud(true);
  $('objective').innerHTML = text ? `<b>Objectif :</b> ${text}` : '';
  $('objective').style.visibility = text ? 'visible' : 'hidden';
  updateGold();
}
export function updateGold() { $('gold').textContent = `${G.gold} or`; }
export function showHud(on) { document.body.classList.toggle('nohud', !on); show($('hud'), on); if (!on) { show($('hint'), false); show($('prompt'), false); } }
export function hint(text) { const h = $('hint'); if (text) { h.innerHTML = text; show(h); } else show(h, false); }
export function prompt(text) { const p = $('prompt'); if (text) { p.textContent = text; show(p); } else show(p, false); }

// ---------- Écrans pleins ----------
export async function fade(toBlack, ms = 600) {
  const f = $('fade');
  f.style.transitionDuration = ms + 'ms';
  f.style.opacity = toBlack ? 1 : 0;
  await sleep(fastText ? 1 : ms + 30);
}
export function setFade(v) { const f = $('fade'); f.style.transitionDuration = '0ms'; f.style.opacity = v; }

// Texte au centre d'un écran noir (l'écran doit déjà être noir)
export async function narrate(lines) {
  const n = $('narr');
  document.body.classList.add('dialog');
  show(n);
  for (const line of lines) {
    n.style.opacity = 0; n.textContent = line;
    n.style.transition = 'opacity .5s'; await sleep(30); n.style.opacity = 1;
    if (fastText) await sleep(1); else { await sleep(350); await waitOk(); }
    n.style.opacity = 0; await sleep(fastText ? 1 : 350);
  }
  show(n, false);
  document.body.classList.remove('dialog');
}

export async function chapterCard(num, title) {
  $('cardNum').textContent = num; $('cardTitle').textContent = title;
  show($('card'));
  sfx('save');
  if (fastText) await sleep(1); else await Promise.race([sleep(3200), sleep(700).then(waitOk)]);
  Input.waiters.length = 0;
  show($('card'), false);
}

// ---------- Menu pause ----------
function bar(v, max, cls = '') { const p = Math.max(0, Math.min(100, (v / max) * 100)); return `<div class="bar ${cls} ${p < 30 && cls !== 'mp' ? 'low' : ''}"><i style="width:${p}%"></i></div>`; }

function heroCard(h) {
  const s = heroStats(h), d = HEROES[h.id];
  const sk = knownSkills(h).map(id => `${SKILLS[id].name} (${SKILLS[id].pm} PM)`).join(' · ');
  const eq = [h.weapon, h.armor, h.ring].filter(Boolean).map(id => EQUIP[id].name).join(' · ') || 'aucun';
  return `<div class="heroCard"><div class="pName" style="color:${d.color}">${d.name} — ${d.title}<span>Niveau ${h.level}</span></div>
    <div class="pBars"><span>PV</span>${bar(h.hp, s.maxHp)}<span>${h.hp}/${s.maxHp}</span><span>PM</span>${bar(h.mp, s.maxMp, 'mp')}<span>${h.mp}/${s.maxMp}</span></div>
    <div class="stats">${['atk', 'def', 'mag', 'res', 'vit', 'cha'].map(k => `<span>${STAT_LABELS[k]} ${s[k]}</span>`).join('')}<span style="grid-column:span 2">Exp. ${h.xp}/${xpForNext(h.level)}</span></div>
    <div class="sk"><b>Équipement :</b> ${eq}<br><b>Compétences :</b> ${sk}</div></div>`;
}

// Entrées ajoutées au menu par d'autres fichiers : { label, sub, action, ferme } (ferme : le menu se referme pendant l'action)
export const menuExtras = [];
export async function openMenu(extra = {}) {
  const m = $('menu'), box = $('menuBox');
  document.body.classList.add('dialog');
  show(m);
  let run = true;
  while (run) {
    box.innerHTML = `<h3>Équipe — ${G.gold} pièces d'or</h3>${G.party.map(heroCard).join('')}<div id="mList"></div>`;
    const base = [
      { label: 'Objets', sub: "Utiliser une potion, voir l'inventaire" },
      ...menuExtras.map((x) => ({ label: x.label, sub: x.sub, extra: x })),
      { label: 'Commandes', sub: 'Rappel des touches' },
      { label: 'Son', sub: 'Activer ou couper le son' },
      { label: "Retour à l'écran titre", sub: 'La progression non sauvegardée sera perdue' },
    ];
    const r = await pick($('mList'), base, { cancel: true, cancelLabel: '← Reprendre le jeu' });
    const n = menuExtras.length, k = r <= 0 ? r : r <= n ? -2 : r - n;      // -2 : entrée ajoutée
    if (k === -1) run = false;
    else if (k === 0) await itemMenu(box);
    else if (k === -2) {
      const x = base[r].extra;
      if (x.ferme) { show(m, false); document.body.classList.remove('dialog'); }
      await x.action();
      if (x.ferme) { document.body.classList.add('dialog'); show(m); }
    }
    else if (k === 1) {
      box.innerHTML = `<h3>Commandes</h3><p style="line-height:1.7"><b>Marcher :</b> ZQSD / WASD ou flèches — manette tactile à gauche<br><b>Parler, ouvrir, valider :</b> E, Espace ou Entrée — bouton A<br><b>Entrer dans une maison :</b> s'approcher de la porte, puis E<br><b>Tourner la caméra :</b> glisser la souris ou le doigt sur l'écran<br><b>Menu :</b> M ou Échap — bouton ☰<br><b>En combat :</b> flèches + Entrée, ou cliquer / toucher les boutons<br><br>Les ennemis sont visibles : les toucher lance le combat.<br>Les <b>statues d'Aube</b> sauvegardent la partie. Le jeu sauvegarde aussi tout seul à chaque étape de l'histoire.</p><div id="mList"></div>`;
      await pick($('mList'), [], { cancel: true });
    } else if (k === 2) { const off = toggleMute(); $('btnSound').classList.toggle('off', off); }
    else if (k === 3) {
      box.innerHTML = `<h3>Retour à l'écran titre ?</h3><div id="mList"></div>`;
      const c = await pick($('mList'), [{ label: 'Oui, quitter' }], { cancel: true, cancelLabel: '← Non' });
      if (c === 0) { location.reload(); return; }
    }
  }
  show(m, false);
  document.body.classList.remove('dialog');
}

async function itemMenu(box) {
  while (true) {
    const ids = Object.keys(G.inv);
    box.innerHTML = `<h3>Objets</h3>${ids.length ? '' : '<p>Le sac est vide.</p>'}<div id="mList"></div>`;
    const r = await pick($('mList'), ids.map(id => ({ label: ITEMS[id].name, right: '×' + G.inv[id], sub: ITEMS[id].desc, disabled: !ITEMS[id].field })), { cancel: true });
    if (r === -1) return;
    const id = ids[r], it = ITEMS[id];
    box.innerHTML = `<h3>${it.name} — pour qui ?</h3><div id="mList"></div>`;
    const t = await pick($('mList'), G.party.map(h => { const s = heroStats(h); return { label: HEROES[h.id].name, right: `PV ${h.hp}/${s.maxHp} · PM ${h.mp}/${s.maxMp}` }; }), { cancel: true });
    if (t === -1) continue;
    const h = G.party[t], s = heroStats(h);
    if (it.use === 'heal') { if (h.hp >= s.maxHp) { toast('PV déjà au maximum.'); continue; } h.hp = Math.min(s.maxHp, h.hp + it.value); }
    if (it.use === 'mp') { if (h.mp >= s.maxMp) { toast('PM déjà au maximum.'); continue; } h.mp = Math.min(s.maxMp, h.mp + it.value); }
    removeItem(id); sfx('heal');
  }
}

// ---------- Boutique ----------
export async function shop(title, stock, discount = 1) {
  // stock : liste d'identifiants d'objets ou d'équipements
  while (true) {
    const opts = stock.map(id => {
      const it = ITEMS[id] || EQUIP[id];
      const price = Math.max(1, Math.round(it.price * discount));
      const isEq = !!EQUIP[id];
      const owned = isEq && G.party.some(h => h[it.slot] === id);
      const usable = !isEq || G.party.some(h => it.who.includes(h.id));
      const desc = isEq ? `${it.slot === 'armor' ? 'Armure' : 'Arme'} pour ${it.who.map(w => HEROES[w].name).join(', ')}${it.def ? ' · DEF +' + it.def : ''}${it.res ? ' · RES +' + it.res : ''}${it.atk ? ' · ATK +' + it.atk : ''}${it.mag ? ' · MAG +' + it.mag : ''}` : it.desc;
      return { label: it.name, right: owned ? 'Équipé' : price + ' or', sub: desc + (isEq ? '' : ` · en sac : ${countItem(id)}`), disabled: owned || !usable || G.gold < price, id, price, isEq };
    });
    const r = await choose(`<b>${title}</b> — vous avez ${G.gold} pièces d'or`, opts, { cancel: true, cancelLabel: '← Partir' });
    if (r === -1) return;
    const o = opts[r];
    G.gold -= o.price;
    if (o.isEq) { const it = EQUIP[o.id]; const h = G.party.find(x => it.who.includes(x.id)); h[it.slot] = o.id; toast(`${HEROES[h.id].name} s'équipe : ${it.name}`); }
    else { G.inv[o.id] = (G.inv[o.id] || 0) + 1; toast(`Acheté : ${ITEMS[o.id].name}`); }
    sfx('item'); updateGold();
  }
}

// ---------- Divers ----------
export function initUI() {
  // Toucher ou cliquer la boîte de dialogue ou l'écran de narration pour avancer
  for (const id of ['dlg', 'narr']) $(id).addEventListener('pointerup', (e) => { e.stopPropagation(); pressOk(); });
  // Pendant un dialogue, toucher n'importe où sur l'image fait aussi avancer
  $('c').addEventListener('pointerup', () => { if (document.body.classList.contains('dialog') && !Input.nav) pressOk(); });
  $('btnSound').addEventListener('click', () => { initAudio(); const off = toggleMute(); $('btnSound').classList.toggle('off', off); });
  window.addEventListener('touchmode', () => show($('touch'), true));
  if (Input.isTouch) show($('touch'), true);
}

export { bar };
export function healAllMessage() { G.party.forEach(healHero); }

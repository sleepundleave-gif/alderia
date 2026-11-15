// ============================================================
//  TÉLÉCHARGEMENT DES MODÈLES
//  Tous les modèles sont rangés dans un « paquet » découpé en petits morceaux de 256 Ko
//  (modeles/paquet/, fabriqué par outils/paquet.py). Ce fichier les télécharge, trois à la fois.
//    - Un morceau coupé, incomplet ou refusé est simplement redemandé, sans limite d'essais :
//      le chargement ne peut plus « échouer », il attend que la connexion revienne et reprend.
//    - Chaque morceau reçu est vérifié (taille et somme de contrôle) puis gardé dans la mémoire
//      du navigateur (IndexedDB) : au lancement suivant, rien n'est retéléchargé.
//    - Une fois tout arrivé, les fichiers sont reconstitués en mémoire. Les modèles et les images
//      sont alors lus directement dans cette mémoire par « gltf(adresse) » et « texture(adresse) » :
//      aucune adresse « blob: » ni « data: », aucune demande de plus. (Certains hébergements
//      interdisent ces adresses : c'était la cause de « TypeError: Failed to fetch ».)
// ============================================================
import * as THREE from '../lib/three.module.min.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';
import { Q, reduireImage, imagesInutiles, preparerModele } from './qualite.js';

const ROOT = new URL('../modeles/', import.meta.url).href;
// Version hors ligne (un seul fichier HTML, fait par outils/hors_ligne.py) : les morceaux du paquet sont écrits dans la page
// elle-même ; window.__HORS_LIGNE(nom) rend les octets d'un morceau. Aucun appel au réseau n'est alors fait.
const HORS_LIGNE = typeof window !== 'undefined' && typeof window.__HORS_LIGNE === 'function' ? window.__HORS_LIGNE : null;
export const horsLigne = () => !!HORS_LIGNE;
const FICHIERS = new Map();                                 // adresse du fichier -> { data (octets), type }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const listeners = new Set();
export const etat = { recu: 0, total: 0, essaisRates: 0, message: '', fini: false, depuisMemoire: 0 };
const publish = () => { for (const f of listeners) { try { f(etat); } catch (e) { /* un afficheur en panne ne bloque pas le téléchargement */ } } };

// Message au serveur (outils/journal.txt) : sert à comprendre une panne chez un joueur. Jamais bloquant.
export function journal(text) {
  if (HORS_LIGNE) return;                                    // version hors ligne : personne à qui écrire
  try { fetch(new URL('../journal', import.meta.url).href, { method: 'POST', body: String(text).slice(0, 2000), keepalive: true }).catch(() => {}); } catch (e) { /* sans importance */ }
}

// ---------- Somme de contrôle (CRC-32), la même que celle calculée par outils/paquet.py ----------
const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// ---------- Mémoire du navigateur (IndexedDB). Si elle est indisponible, on s'en passe. ----------
function openDb() {
  return new Promise((res) => {
    const giveUp = setTimeout(() => res(null), 3000);
    try {
      const rq = indexedDB.open('alderia-modeles', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('morceaux');
      rq.onsuccess = () => { clearTimeout(giveUp); res(rq.result); };
      rq.onerror = rq.onblocked = () => { clearTimeout(giveUp); res(null); };
    } catch (e) { clearTimeout(giveUp); res(null); }
  });
}
function dbCall(db, mode, fn) {
  return new Promise((res) => {
    if (!db) return res(null);
    try { const tx = db.transaction('morceaux', mode), rq = fn(tx.objectStore('morceaux')); tx.oncomplete = () => res(rq ? rq.result : null); tx.onerror = tx.onabort = () => res(null); }
    catch (e) { res(null); }
  });
}

// ---------- Un téléchargement, avec abandon si plus rien n'arrive pendant 20 secondes ----------
async function fetchBytes(url, onBytes) {
  if (HORS_LIGNE) { const b = HORS_LIGNE(url.split('/paquet/')[1]); if (!b) throw new Error('fichier absent de la version hors ligne : ' + url); onBytes(b.length); return b; }
  const ctl = new AbortController(); let timer = setTimeout(() => ctl.abort(), 20000), got = 0;
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) { let t = ''; try { t = (await r.text()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90); } catch (e) { /* rien */ } throw new Error('réponse ' + r.status + (t ? ' « ' + t + ' »' : '')); }
    if (!r.body || !r.body.getReader) { const b = new Uint8Array(await r.arrayBuffer()); onBytes(b.length); return b; }
    const parts = []; const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      parts.push(value); got += value.length; onBytes(value.length);
      clearTimeout(timer); timer = setTimeout(() => ctl.abort(), 20000);
    }
    const out = new Uint8Array(got); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  } catch (e) { onBytes(-got); throw (e && e.name === 'AbortError') ? new Error('plus rien ne vient depuis 20 s') : e; }
  finally { clearTimeout(timer); }
}
// Redemande jusqu'à obtenir une copie juste. Le « ?essai=n » évite qu'une mauvaise copie gardée quelque part soit resservie.
async function fetchUntilGood(url, check, onBytes, what) {
  for (let n = 0; ; n++) {
    try {
      const b = await fetchBytes(url + (n ? '?essai=' + n : ''), onBytes), bad = check(b);
      if (!bad) { if (etat.message) { etat.message = ''; publish(); } return b; }
      onBytes(-b.length); throw new Error(bad);
    } catch (e) {
      etat.essaisRates++; const why = String((e && e.message) || e);
      etat.message = 'Connexion instable : nouvel essai en cours… (' + what + ' : ' + why + ')'; publish();
      if (etat.essaisRates === 1 || etat.essaisRates % 10 === 0) journal('echec ' + etat.essaisRates + ' ' + what + ' essai ' + (n + 1) + ' : ' + why + ' | ' + (navigator.onLine ? 'en ligne' : 'hors ligne'));
      await wait(Math.min(6000, 500 + n * 700));
    }
  }
}

// ---------- Décompression des fichiers compressés du paquet ----------
async function inflate(u8) {
  if (typeof DecompressionStream === 'function') {
    try { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); }
    catch (e) { /* on essaie l'autre méthode */ }
  }
  const { unzlibSync } = await import('../lib/fflate.module.js');   // navigateurs plus anciens
  return unzlibSync(u8);
}

// ---------- Le téléchargement complet (lancé une seule fois, même si plusieurs le demandent) ----------
let job = null;
export function telecharger(onChange) {
  if (onChange) { listeners.add(onChange); onChange(etat); }
  return job || (job = (async () => {
    const t0 = performance.now();
    const idxBytes = await fetchUntilGood(ROOT + 'paquet/index.json', (b) => { try { const j = JSON.parse(new TextDecoder().decode(b)); return j && j.morceaux && j.fichiers ? '' : 'index illisible'; } catch (e) { return 'index illisible'; } }, () => {}, 'index');
    const idx = JSON.parse(new TextDecoder().decode(idxBytes)), parts = idx.morceaux;
    etat.total = idx.taille; publish();

    // 1. ce qui est déjà dans la mémoire du navigateur
    const db = HORS_LIGNE ? null : await openDb(), have = new Map();      // hors ligne : tout est déjà dans la page, inutile d'en garder une copie
    const keys = (await dbCall(db, 'readonly', (s) => s.getAllKeys())) || [];
    const wanted = new Set(parts.map((p) => p[0]));
    const stale = keys.filter((k) => !wanted.has(k));
    if (stale.length) await dbCall(db, 'readwrite', (s) => { for (const k of stale) s.delete(k); });
    for (const [name, size, crc] of parts) {
      if (!keys.includes(name)) continue;
      const v = await dbCall(db, 'readonly', (s) => s.get(name)), u8 = v && new Uint8Array(v);
      if (u8 && u8.length === size && crc32(u8) === crc) { have.set(name, u8); etat.recu += size; etat.depuisMemoire += size; publish(); }
    }

    // 2. le reste, trois morceaux à la fois
    const queue = parts.filter((p) => !have.has(p[0]));
    const lane = async () => {
      for (;;) {
        const p = queue.shift(); if (!p) return;
        const [name, size, crc] = p;
        const u8 = await fetchUntilGood(ROOT + 'paquet/' + name, (b) => (b.length !== size ? 'morceau incomplet (' + b.length + ' sur ' + size + ' octets)' : crc32(b) !== crc ? 'morceau abîmé' : ''), (n) => { etat.recu += n; publish(); }, name);
        have.set(name, u8);
        dbCall(db, 'readwrite', (s) => { s.put(u8.buffer, name); });      // gardé pour la prochaine fois (sans attendre)
      }
    };
    await Promise.all([lane(), lane(), lane()]);

    // 3. on recolle les morceaux et on reconstitue chaque fichier
    etat.recu = etat.total; etat.message = ''; publish();
    const all = new Uint8Array(idx.taille); let o = 0;
    for (const [name] of parts) { all.set(have.get(name), o); o += have.get(name).length; }
    have.clear();
    for (const [path, [off, len, raw, z, type]] of Object.entries(idx.fichiers)) {
      let data = all.subarray(off, off + len);
      if (z) { data = await inflate(data); if (data.length !== raw) throw new Error('Fichier abîmé dans le paquet : ' + path); }
      FICHIERS.set(ROOT + path, { data, type });
    }
    etat.fini = true; publish();
    journal('ok ' + parts.length + ' morceaux, ' + Math.round(etat.depuisMemoire / 1024) + ' Ko deja en memoire, ' + etat.essaisRates + ' essais rates, ' + Math.round((performance.now() - t0) / 100) / 10 + ' s' + (db ? '' : ', sans IndexedDB'));
  })());
}

// ---------- Lecture des fichiers reçus, directement depuis la mémoire ----------
function fichier(url) {
  const k = new URL(url, document.baseURI).href; let f = FICHIERS.get(k);
  if (!f) { try { f = FICHIERS.get(decodeURI(k)); } catch (e) { /* adresse inhabituelle */ } }
  if (!f) throw new Error('Fichier absent du paquet de modèles : ' + k.split('/').slice(-2).join('/'));
  return f;
}
const copie = (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const typeDe = (nom) => TYPES[String(nom || '').split('.').pop().toLowerCase()] || 'image/png';

// Décode une image (JPEG, PNG) à partir de ses octets. « retourner » : image retournée de haut en bas.
async function decoder(data, type, retourner) {
  const img = await decoderBrut(data, type, retourner);
  if (Math.max(img.width || 0, img.height || 0) <= Q.tex) return img;
  // niveau « rapide » ou « moyen » : la texture est réduite avant d'aller à la carte graphique (4 fois moins de mémoire)
  const bitmap = typeof ImageBitmap === 'function' && img instanceof ImageBitmap, r = await reduireImage(img);
  if (bitmap && !(r instanceof ImageBitmap)) r.__bitmap = true;            // déjà dans le bon sens : ne pas la retourner une seconde fois
  return r;
}
async function decoderBrut(data, type, retourner) {
  const blob = new Blob([data], { type });
  if (typeof createImageBitmap === 'function') {
    const o = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }; if (retourner) o.imageOrientation = 'flipY';
    try { return await createImageBitmap(blob, o); } catch (e) { /* options refusées : on essaie sans */ }
    try { return await createImageBitmap(blob); } catch (e) { /* on essaie l'ancienne méthode */ }
  }
  return new Promise((res, rej) => {                        // très vieux navigateurs
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Image illisible dans le paquet de modèles')); im.src = fr.result; };
    fr.onerror = () => rej(new Error('Image illisible dans le paquet de modèles'));
    fr.readAsDataURL(blob);
  });
}

// Une image du paquet, sous forme de texture. retourner = true : même sens qu'une image chargée normalement.
export async function texture(url, retourner = true) {
  const f = fichier(url), img = await decoder(f.data, f.type || typeDe(url), retourner);
  const t = new THREE.Texture(img); t.flipY = !((typeof ImageBitmap === 'function' && img instanceof ImageBitmap) || img.__bitmap) && retourner; t.needsUpdate = true;
  return t;
}

// Un modèle glTF du paquet. Ses fichiers annexes (géométrie .bin, images) sont pris eux aussi dans la mémoire.
function depuisMemoire(parser) {
  parser.fileLoader = { load(url, ok, progres, ko) { try { ok(copie(fichier(url).data)); } catch (e) { if (ko) ko(e); } } };
  parser.loadImageSource = function (i) {
    if (this.sourceCache[i] !== undefined) return this.sourceCache[i].then((t) => t.clone());
    const def = this.json.images[i];
    // image de relief ou de métal, inutile au niveau de graphismes choisi : on ne la décode même pas
    if (!this.__inutiles) this.__inutiles = imagesInutiles(this.json);
    if (this.__inutiles.has(i)) { const t = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); t.needsUpdate = true; return (this.sourceCache[i] = Promise.resolve(t)); }
    const src = def.bufferView !== undefined
      ? this.getDependency('bufferView', def.bufferView).then((b) => ({ data: b, type: def.mimeType }))
      : Promise.resolve().then(() => fichier(THREE.LoaderUtils.resolveURL(def.uri, this.options.path)));
    const p = src.then((f) => decoder(f.data, def.mimeType || f.type || typeDe(def.uri), false)).then((img) => {
      const t = new THREE.Texture(img); t.needsUpdate = true; t.userData.mimeType = def.mimeType || typeDe(def.uri); return t;
    });
    this.sourceCache[i] = p; return p;
  };
  return { name: 'ALDERIA_memoire' };
}
export function gltf(url) {
  return new Promise((res, rej) => {
    try { new GLTFLoader().register(depuisMemoire).parse(copie(fichier(url).data), new URL(url, document.baseURI).href.replace(/[^/]*$/, ''), (g) => preparerModele(g).then(res, rej), rej); }
    catch (e) { rej(e); }
  });
}

// Compatibilité avec pack.js et decor.js : « prefetch » attend que tout le paquet soit là. onProgress reçoit une valeur de 0 à 1.
export function prefetch(part, onProgress) { return telecharger(onProgress ? (e) => onProgress(e.total ? e.recu / e.total : 0) : null); }
// Une fois les modèles lus par le jeu, les copies en mémoire ne servent plus
export function release(part) { const p = ROOT + part + '/'; for (const url of [...FICHIERS.keys()]) if (url.startsWith(p)) FICHIERS.delete(url); }

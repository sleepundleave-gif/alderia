// Allège les modèles de nature : troncs simplifiés (meshoptimizer), une partie des cartes de feuilles retirée
// (les cartes restantes sont agrandies), puis réécriture compacte du fichier. Usage : node simplify.mjs <dossier> <nom>
import fs from 'fs';
import { MeshoptSimplifier } from 'meshoptimizer';
await MeshoptSimplifier.ready;
const [dir, name] = process.argv.slice(2), j = JSON.parse(fs.readFileSync(`${dir}/${name}.gltf`)), bin = fs.readFileSync(`${dir}/${name}.bin`);
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }, TA = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array, 5121: Uint8Array };
const read = (ai) => { const a = j.accessors[ai], bv = j.bufferViews[a.bufferView], n = NC[a.type], T = TA[a.componentType], st = bv.byteStride || n * T.BYTES_PER_ELEMENT, off = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0), out = new T(a.count * n), dv = new DataView(bin.buffer, off);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = T === Float32Array ? dv.getFloat32(i * st + k * 4, true) : T === Uint16Array ? dv.getUint16(i * st + k * 2, true) : T === Uint32Array ? dv.getUint32(i * st + k * 4, true) : dv.getUint8(i * st + k);
  return out; };
const chunks = []; let size = 0; const accs = [], views = [];
const write = (arr, type, target) => { while (size % 4) { chunks.push(Buffer.alloc(1)); size++; } const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); views.push({ buffer: 0, byteOffset: size, byteLength: b.length, target }); chunks.push(b); size += b.length;
  const a = { bufferView: views.length - 1, componentType: arr instanceof Float32Array ? 5126 : arr instanceof Uint32Array ? 5125 : 5123, count: arr.length / NC[type], type };
  if (type === 'VEC3' && arr instanceof Float32Array) { a.min = [1e9, 1e9, 1e9]; a.max = [-1e9, -1e9, -1e9]; for (let i = 0; i < arr.length; i++) { a.min[i % 3] = Math.min(a.min[i % 3], arr[i]); a.max[i % 3] = Math.max(a.max[i % 3], arr[i]); } }
  accs.push(a); return accs.length - 1; };
const mats = j.materials.map((m) => m.name); let before = 0, after = 0; const log = [];
for (const me of j.meshes) for (const p of me.primitives) {
  let idx = Uint32Array.from(read(p.indices)); const pos = Float32Array.from(read(p.attributes.POSITION)), nor = read(p.attributes.NORMAL), uv = read(p.attributes.TEXCOORD_0), mat = mats[p.material], tris = idx.length / 3; before += tris;
  let limit = 0;
  if (/Bark_Dead/.test(mat)) limit = 1100; else if (/Bark_Twisted/.test(mat)) limit = 1500; else if (/Bark/.test(mat)) limit = 320; else if (/Mushrooms/.test(mat)) limit = 160; else if (/^(MI_)?(Leaves|Grass)$/.test(mat)) limit = 180;
  if (limit && tris > limit) {
    // les sommets dédoublés le long des coutures de texture sont d'abord soudés, sinon la simplification reste bloquée
    const seen = new Map(), rep = [], w = new Uint32Array(pos.length / 3);
    for (let v = 0; v < w.length; v++) { const k = Math.round(pos[v * 3] * 2000) + ',' + Math.round(pos[v * 3 + 1] * 2000) + ',' + Math.round(pos[v * 3 + 2] * 2000); let id = seen.get(k); if (id === undefined) { id = rep.length; seen.set(k, id); rep.push(v); } w[v] = id; }
    const wp = new Float32Array(rep.length * 3); rep.forEach((v, i) => { wp[i * 3] = pos[v * 3]; wp[i * 3 + 1] = pos[v * 3 + 1]; wp[i * 3 + 2] = pos[v * 3 + 2]; });
    const [ni] = MeshoptSimplifier.simplify(Uint32Array.from(idx, (i) => w[i]), wp, 3, limit * 3, 0.2); idx = Uint32Array.from(ni, (i) => rep[i]);
  }
  let keep = 0;
  if (/Leaves_NormalTree|Leaves_TwistedTree|Leaves_Pine/.test(mat) && tris > 800) keep = (tris > 1000 && /Twisted/.test(mat) ? 1000 : 760) / tris; else if (/Flowers/.test(mat) && tris > 500) keep = 420 / tris;
  if (keep) {
    // composantes connexes = cartes de feuilles ; on en garde une fraction, agrandies pour remplir le houppier
    const par = new Int32Array(pos.length / 3).map((_, i) => i), find = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
    for (let i = 0; i < idx.length; i += 3) { const a = find(idx[i]); par[find(idx[i + 1])] = a; par[find(idx[i + 2])] = a; }
    const comp = new Map(); for (let v = 0; v < par.length; v++) { const r = find(v); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(v); }
    const roots = [...comp.keys()], kept = new Set(); let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const r of roots) if (rnd() < keep) kept.add(r);
    const s = Math.min(1.45, Math.sqrt(1 / keep));
    for (const r of kept) { const vs = comp.get(r), c = [0, 0, 0]; for (const v of vs) for (let k = 0; k < 3; k++) c[k] += pos[v * 3 + k] / vs.length; for (const v of vs) for (let k = 0; k < 3; k++) pos[v * 3 + k] = c[k] + (pos[v * 3 + k] - c[k]) * s; }
    const ni = []; for (let i = 0; i < idx.length; i += 3) if (kept.has(find(idx[i]))) ni.push(idx[i], idx[i + 1], idx[i + 2]); idx = Uint32Array.from(ni);
  }
  // compactage : seuls les sommets encore utilisés sont réécrits
  const map = new Int32Array(pos.length / 3).fill(-1); let n = 0; for (const i of idx) if (map[i] < 0) map[i] = n++;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
  map.forEach((to, from) => { if (to < 0) return; for (let k = 0; k < 3; k++) { P[to * 3 + k] = pos[from * 3 + k]; N[to * 3 + k] = nor[from * 3 + k]; } U[to * 2] = uv[from * 2]; U[to * 2 + 1] = uv[from * 2 + 1]; });
  const I = n < 65536 ? Uint16Array.from(idx, (i) => map[i]) : Uint32Array.from(idx, (i) => map[i]);
  p.attributes = { POSITION: write(P, 'VEC3', 34962), NORMAL: write(N, 'VEC3', 34962), TEXCOORD_0: write(U, 'VEC2', 34962) }; p.indices = write(I, 'SCALAR', 34963);
  after += I.length / 3; if (I.length / 3 !== tris) log.push(`${me.name}/${mat.replace('MI_', '')} ${tris}→${I.length / 3}`);
}
j.accessors = accs; j.bufferViews = views; const out = Buffer.concat(chunks); j.buffers = [{ uri: name + '.bin', byteLength: out.length }];
fs.writeFileSync(`${dir}/${name}.bin`, out); fs.writeFileSync(`${dir}/${name}.gltf`, JSON.stringify(j));
console.log(name, before, '→', after, 'triangles,', (out.length / 1e6).toFixed(2), 'Mo'); console.log(log.join(' | '));

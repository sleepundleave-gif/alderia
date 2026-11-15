// ============================================================
//  SON : petits effets et musiques générés par le navigateur
// ============================================================
let ctx = null, master = null, musicGain = null, muted = false;
let track = null, trackName = '', step = 0, nextTime = 0, timer = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    if (trackName) { const n = trackName; trackName = ''; music(n); }
  } catch (e) { ctx = null; }
}

function tone(freq, dur, type = 'square', vol = 0.2, when = 0, dest = master, slide = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.03);
}

function noise(dur, vol = 0.2, when = 0, freq = 1200) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}

export function sfx(name) {
  if (!ctx || muted) return;
  switch (name) {
    case 'text': tone(520 + Math.random() * 60, 0.03, 'square', 0.035); break;
    case 'ok': tone(660, 0.07, 'triangle', 0.18); tone(880, 0.09, 'triangle', 0.16, 0.06); break;
    case 'move': tone(440, 0.04, 'triangle', 0.1); break;
    case 'cancel': tone(330, 0.1, 'triangle', 0.15, 0, master, 220); break;
    case 'hit': noise(0.14, 0.4, 0, 1800); tone(160, 0.12, 'sawtooth', 0.2, 0, master, 60); break;
    case 'crit': noise(0.22, 0.55, 0, 2600); tone(220, 0.2, 'sawtooth', 0.28, 0, master, 50); break;
    case 'miss': tone(300, 0.12, 'sine', 0.1, 0, master, 500); break;
    case 'fire': noise(0.4, 0.4, 0, 900); tone(200, 0.35, 'sawtooth', 0.14, 0, master, 500); break;
    case 'ice': tone(1400, 0.25, 'sine', 0.16, 0, master, 2400); tone(1900, 0.2, 'sine', 0.1, 0.08); break;
    case 'heal': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.16, i * 0.07)); break;
    case 'item': tone(784, 0.08, 'triangle', 0.18); tone(1047, 0.14, 'triangle', 0.18, 0.08); break;
    case 'chest': [392, 523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.18, i * 0.08)); break;
    case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.12, i * 0.09)); break;
    case 'victory': [523, 523, 523, 659, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.13, 'square', 0.13, [0, 0.14, 0.28, 0.42, 0.6, 0.78][i])); break;
    case 'lose': [392, 349, 311, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.26)); break;
    case 'encounter': [300, 400, 300, 400, 600].forEach((f, i) => tone(f, 0.07, 'square', 0.13, i * 0.07)); break;
    case 'windup': tone(120, 0.5, 'sawtooth', 0.2, 0, master, 400); break;
    case 'boom': noise(0.7, 0.6, 0, 500); tone(80, 0.6, 'sine', 0.4, 0, master, 30); break;
    case 'save': [659, 784, 988].forEach((f, i) => tone(f, 0.2, 'sine', 0.15, i * 0.1)); break;
    case 'step': noise(0.04, 0.05, 0, 500); break;
    // --- combats : sorts et compétences ---
    case 'slash': noise(0.12, 0.3, 0, 5200); tone(1300, 0.13, 'sawtooth', 0.07, 0, master, 240); break;
    case 'whoosh': noise(0.24, 0.2, 0, 2400); tone(420, 0.2, 'sine', 0.05, 0, master, 900); break;
    case 'charge': tone(180, 0.4, 'triangle', 0.14, 0, master, 760); tone(360, 0.4, 'sine', 0.07, 0, master, 1520); break;
    case 'explosion': noise(0.6, 0.6, 0, 700); noise(0.18, 0.35, 0, 3200); tone(110, 0.5, 'sine', 0.4, 0, master, 32); break;
    case 'shatter': noise(0.1, 0.28, 0, 7000); [2300, 3100, 1800, 2700, 3600].forEach((f, i) => tone(f, 0.11, 'sine', 0.09, i * 0.035, master, f * 1.4)); break;
    case 'wind': noise(0.9, 0.24, 0, 1500); tone(300, 0.8, 'sine', 0.05, 0, master, 620); tone(460, 0.6, 'sine', 0.04, 0.2, master, 280); break;
    case 'quake': noise(0.9, 0.6, 0, 260); tone(55, 0.8, 'sine', 0.45, 0, master, 28); break;
    case 'poison': [240, 320, 200, 380].forEach((f, i) => tone(f, 0.09, 'sine', 0.13, i * 0.07, master, f * 1.9)); noise(0.3, 0.1, 0, 800); break;
    case 'sleep': [880, 784, 659, 523].forEach((f, i) => tone(f, 0.3, 'sine', 0.11, i * 0.14)); break;
    case 'stun': [1200, 1500, 1200, 1500].forEach((f, i) => tone(f, 0.06, 'triangle', 0.1, i * 0.07)); break;
    case 'cri': tone(170, 0.5, 'sawtooth', 0.2, 0, master, 340); tone(255, 0.5, 'sawtooth', 0.11, 0.03, master, 500); noise(0.4, 0.14, 0, 1400); break;
    case 'sonic': tone(1500, 0.5, 'sawtooth', 0.11, 0, master, 2700); tone(1560, 0.5, 'square', 0.05, 0, master, 2500); break;
    case 'shield': tone(740, 0.3, 'triangle', 0.16, 0, master, 760); tone(1110, 0.4, 'sine', 0.1, 0.02); noise(0.06, 0.2, 0, 4200); break;
    case 'buff': [392, 523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, i * 0.06)); break;
    case 'steal': [1047, 1319, 1568].forEach((f, i) => tone(f, 0.07, 'triangle', 0.14, i * 0.05)); break;
    case 'vanish': tone(520, 0.4, 'sine', 0.1, 0, master, 110); noise(0.3, 0.1, 0, 900); break;
  }
}

// ---------- Musique : petit séquenceur (mélodie + basse) ----------
const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TRACKS = {
  title:   { bpm: 76,  wave: 'triangle', mel: [69,0,72,76, 81,0,79,76, 74,0,77,81, 79,0,76,0, 69,0,72,76, 84,0,83,79, 77,0,76,74, 76,0,0,0], bass: [45,0,0,0, 45,0,0,0, 50,0,0,0, 48,0,0,0, 45,0,0,0, 43,0,0,0, 41,0,0,0, 40,0,0,0] },
  village: { bpm: 116, wave: 'triangle', mel: [72,76,79,76, 77,81,79,0, 76,79,84,79, 77,76,74,0, 72,76,79,76, 81,84,83,0, 79,77,76,74, 72,0,0,0], bass: [48,0,55,0, 53,0,55,0, 48,0,55,0, 53,0,55,0, 48,0,55,0, 53,0,55,0, 50,0,55,0, 48,0,48,0] },
  forest:  { bpm: 88,  wave: 'sine',     mel: [64,0,67,0, 71,0,69,0, 67,0,64,0, 62,0,0,0, 64,0,67,0, 72,0,71,0, 69,0,67,0, 64,0,0,0], bass: [40,0,0,0, 47,0,0,0, 45,0,0,0, 43,0,0,0, 40,0,0,0, 48,0,0,0, 45,0,0,0, 40,0,0,0] },
  danger:  { bpm: 132, wave: 'sawtooth', mel: [57,0,57,60, 0,57,0,63, 62,0,60,0, 57,0,0,0, 57,0,57,60, 0,64,0,63, 62,0,60,0, 59,0,0,0], bass: [33,33,0,33, 33,0,33,0, 33,33,0,33, 36,0,35,0, 33,33,0,33, 33,0,33,0, 38,38,0,38, 35,0,35,0] },
  battle:  { bpm: 150, wave: 'square',   mel: [69,72,76,72, 69,72,76,81, 79,76,72,76, 79,76,74,0, 67,71,74,71, 67,71,74,79, 77,74,71,74, 76,0,0,0], bass: [45,0,45,45, 0,45,45,0, 48,0,48,48, 0,48,43,0, 43,0,43,43, 0,43,43,0, 41,0,41,41, 40,0,40,0] },
  boss:    { bpm: 160, wave: 'sawtooth', mel: [64,0,64,67, 64,0,70,69, 64,0,64,67, 72,0,71,0, 64,0,64,67, 64,0,70,69, 76,75,72,70, 69,0,0,0], bass: [40,40,0,40, 40,40,0,40, 40,40,0,40, 43,43,42,42, 40,40,0,40, 40,40,0,40, 36,36,0,36, 35,35,35,35] },
  sad:     { bpm: 64,  wave: 'sine',     mel: [69,0,0,72, 0,0,71,0, 67,0,0,64, 0,0,0,0, 65,0,0,69, 0,0,67,0, 64,0,0,0, 0,0,0,0], bass: [45,0,0,0, 0,0,0,0, 43,0,0,0, 0,0,0,0, 41,0,0,0, 0,0,0,0, 40,0,0,0, 0,0,0,0] },
  cite:    { bpm: 104, wave: 'triangle', mel: [72,0,76,79, 84,0,83,79, 81,0,77,81, 79,0,76,0, 74,0,77,81, 86,0,84,81, 79,83,86,83, 84,0,0,0], bass: [48,0,55,0, 52,0,55,0, 53,0,57,0, 48,0,55,0, 50,0,57,0, 53,0,57,0, 55,0,59,0, 48,0,48,0] },
  egouts:  { bpm: 70,  wave: 'sine',     mel: [57,0,0,60, 0,0,56,0, 57,0,0,63, 0,62,0,0, 57,0,0,60, 0,0,65,0, 64,0,0,56, 0,0,0,0], bass: [33,0,0,0, 0,0,32,0, 33,0,0,0, 0,0,38,0, 33,0,0,0, 0,0,29,0, 28,0,0,0, 32,0,0,0] },
  camp:    { bpm: 80,  wave: 'triangle', mel: [67,0,71,74, 0,72,71,0, 69,0,72,76, 0,74,72,0, 67,0,71,74, 79,0,78,74, 72,0,71,69, 67,0,0,0], bass: [43,0,0,50, 0,0,0,0, 45,0,0,52, 0,0,0,0, 43,0,0,50, 0,0,0,0, 48,0,0,50, 43,0,0,0] },
};

function schedule() {
  if (!ctx || !track) return;
  const spb = 60 / track.bpm / 2; // croches
  while (nextTime < ctx.currentTime + 0.25) {
    const when = Math.max(0, nextTime - ctx.currentTime);
    const m = track.mel[step % track.mel.length], b = track.bass[step % track.bass.length];
    if (m) tone(N(m), spb * 1.7, track.wave, track.wave === 'sawtooth' || track.wave === 'square' ? 0.28 : 0.5, when, musicGain);
    if (b) tone(N(b), spb * 1.9, 'triangle', 0.55, when, musicGain);
    step++; nextTime += spb;
  }
}

export function music(name) {
  if (name === trackName) return;
  trackName = name || '';
  track = TRACKS[name] || null;
  step = 0;
  if (!ctx) return;
  nextTime = ctx.currentTime + 0.15;
  if (!timer) timer = setInterval(schedule, 80);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
export function isMuted() { return muted; }
// Jeu en arrière-plan (téléphone verrouillé, autre application) : le son s'arrête ; il reprend au retour
export function pauseAudio(p) { if (!ctx) return; try { if (p) ctx.suspend(); else ctx.resume(); } catch (_) {} }

// ============================================================
//  ENTRÉES : clavier, souris, écran tactile
// ============================================================
import { initAudio } from './audio.js';

export const Input = {
  keys: new Set(),
  joy: { x: 0, y: 0 },      // manette tactile (-1..1)
  okFlag: false,            // « valider » pressé (consommé par le moteur)
  menuFlag: false,
  waiters: [],              // promesses en attente d'un « valider »
  nav: null,                // fonction du menu actif : nav('up'|'down'|'left'|'right'|'ok'|'cancel')
  onDrag: null,             // rotation caméra
  isTouch: false,
};

const OK_KEYS = new Set(['KeyE', 'Space', 'Enter', 'NumpadEnter']);
const UP = new Set(['ArrowUp', 'KeyW']), DOWN = new Set(['ArrowDown', 'KeyS']);
const CANCEL = new Set(['Escape', 'Backspace']);
const LEFT = new Set(['ArrowLeft', 'KeyA']), RIGHT = new Set(['ArrowRight', 'KeyD']);

export function pressOk() {
  initAudio();
  if (Input.nav) { Input.nav('ok'); return; }
  if (Input.waiters.length) { const w = Input.waiters.pop(); w(); return; }
  Input.okFlag = true;
}

export function waitOk() { return new Promise(res => Input.waiters.push(res)); }

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat && (OK_KEYS.has(e.code) || CANCEL.has(e.code))) { e.preventDefault(); return; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (Input.nav) {
      if (UP.has(e.code)) Input.nav('up');
      else if (DOWN.has(e.code)) Input.nav('down');
      else if (OK_KEYS.has(e.code)) Input.nav('ok');
      else if (CANCEL.has(e.code)) Input.nav('cancel');
      else if (LEFT.has(e.code)) Input.nav('left');
      else if (RIGHT.has(e.code)) Input.nav('right');
      return;
    }
    if (OK_KEYS.has(e.code)) { pressOk(); return; }
    if (e.code === 'KeyM' || e.code === 'Escape' || e.code === 'Tab') { Input.menuFlag = true; return; }
    Input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => Input.keys.delete(e.code));
  window.addEventListener('blur', () => Input.keys.clear());

  // Rotation de la caméra en glissant sur l'écran
  let dragId = null, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', (e) => { initAudio(); dragId = e.pointerId; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    if (Input.onDrag) Input.onDrag(dx, dy);
  });
  const endDrag = (e) => { if (e.pointerId === dragId) dragId = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Manette tactile
  const joy = document.getElementById('joy'), knob = document.getElementById('joyKnob');
  let joyId = null;
  const setJoy = (e) => {
    const r = joy.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    Input.joy.x = x; Input.joy.y = y;
    knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  joy.addEventListener('pointerdown', (e) => { initAudio(); joyId = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (_) {} setJoy(e); e.preventDefault(); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) setJoy(e); });
  const endJoy = (e) => { if (e.pointerId !== joyId) return; joyId = null; Input.joy.x = Input.joy.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerup', endJoy);
  joy.addEventListener('pointercancel', endJoy);

  document.getElementById('btnA').addEventListener('pointerdown', (e) => { e.preventDefault(); pressOk(); });
  document.getElementById('btnMenu').addEventListener('click', () => { initAudio(); Input.menuFlag = true; });

  // Détection du tactile : on affiche la manette dès le premier toucher
  const showTouch = () => { Input.isTouch = true; document.body.classList.add('touch'); window.dispatchEvent(new Event('touchmode')); };
  window.addEventListener('touchstart', showTouch, { once: true, passive: true });
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) showTouch();
}

// Vecteur de déplacement demandé par le joueur (x : droite, y : avant)
export function moveVector() {
  let x = Input.joy.x, y = -Input.joy.y;
  const k = Input.keys;
  if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  return { x, y, l: Math.min(1, l) };
}

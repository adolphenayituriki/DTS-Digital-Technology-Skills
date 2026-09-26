// Tiny Web Audio feedback helper. Tones are synthesised at runtime, so there
// are no audio files to ship and nothing to preload.
//
// Deliberately restrained: sound is tied to the outcome of an action the user
// just performed (submit / save / delete / sign-in), never to hover, scroll,
// or routine navigation.

let ctx = null;

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// Browsers block audio until the user interacts with the page, so the context
// is created (and resumed) on the first real gesture.
function unlock() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) {
    try { ctx = new AudioCtor(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

if (typeof window !== 'undefined') {
  const kick = () => unlock();
  window.addEventListener('pointerdown', kick, { once: true });
  window.addEventListener('keydown', kick, { once: true });
  window.addEventListener('touchstart', kick, { once: true, passive: true });
}

function tone(frequency, { start = 0, duration = 0.12, gain = 0.06, type = 'sine' } = {}) {
  const audio = unlock();
  if (!audio) return;
  const t0 = audio.currentTime + start;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  // Short attack, exponential decay - reads as a clean "blip" rather than a beep.
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// A gentle rising three-note chime for a completed action.
function playSuccess() {
  tone(660, { duration: 0.1, gain: 0.05 });
  tone(880, { start: 0.08, duration: 0.12, gain: 0.05 });
  tone(1175, { start: 0.17, duration: 0.2, gain: 0.045 });
}

// A fuller fanfare for milestone moments (application sent, account created).
function playFanfare() {
  [523, 659, 784, 1047].forEach((f, i) => {
    tone(f, { start: i * 0.09, duration: i === 3 ? 0.34 : 0.14, gain: 0.05 });
  });
}

// A low, short double-blip that reads as "that didn't work" without being harsh.
function playError() {
  tone(300, { duration: 0.1, gain: 0.05, type: 'triangle' });
  tone(220, { start: 0.1, duration: 0.16, gain: 0.05, type: 'triangle' });
}

function playInfo() {
  tone(560, { duration: 0.09, gain: 0.035 });
}

export function playSound(kind) {
  // Users who ask for less motion get the ceremony without the audio.
  if (prefersReducedMotion()) return;
  try {
    if (kind === 'success') playSuccess();
    else if (kind === 'fanfare') playFanfare();
    else if (kind === 'error') playError();
    else if (kind === 'info') playInfo();
  } catch { /* never let audio break the UI */ }
}

export function playCelebration(grand) {
  playSound(grand ? 'fanfare' : 'success');
}

export default playSound;

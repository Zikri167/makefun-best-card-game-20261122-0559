// Ember Pact — tiny WebAudio synth, no sound files.
// Every effect is a few oscillators: a soft pluck for drawing, a thunk
// for playing a card, a low thud for damage, a rising arpeggio for a win.
// Nothing is created until the first gesture, so browsers never complain.
let ctx = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/** Arm the synth on the first user gesture; silent until then. */
export function initAudio(state) {
  const ac = ensure();
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  if (state) muted = state.muted;
}

/** Flip the mute flag; returns the new value for the state to keep. */
export function toggleMute(state) {
  muted = !muted;
  if (state) state.muted = muted;
  return muted;
}

function tone(freq, dur, type, vol, when, slideTo) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + (when || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // A blocked context is not a game error.
  }
}

export function playDrawSound() {
  tone(620, 0.09, 'triangle', 0.07, 0, 880);
}

export function playCardSound() {
  tone(240, 0.12, 'square', 0.08, 0, 160);
  tone(480, 0.1, 'triangle', 0.07, 0.03, 640);
}

export function playHitSound() {
  tone(140, 0.22, 'sawtooth', 0.12, 0, 70);
}

export function playHealSound() {
  tone(520, 0.16, 'sine', 0.08, 0, 780);
  tone(780, 0.2, 'sine', 0.06, 0.08, 1040);
}

export function playWinSound() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.1, i * 0.11));
}

export function playLoseSound() {
  [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.09, i * 0.13));
}

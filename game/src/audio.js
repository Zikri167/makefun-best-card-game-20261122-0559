// Ember Pact — tiny WebAudio synth. No audio files, no network: short
// oscillator blips for draw, play, hit, charge, win and lose. The context
// is created lazily on the first user gesture so browsers never complain,
// and every call is a no-op when muted or when audio is unavailable.

let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = !!m;
}

export function isMuted() {
  return muted;
}

function ac() {
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq, dur, type, vol, when) {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + (when || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    // Audio is decoration; a failure must never break the game.
  }
}

export const sfx = {
  click() { blip(660, 0.07, 'triangle', 0.08); },
  draw() { blip(520, 0.09, 'sine', 0.09); blip(780, 0.09, 'sine', 0.07, 0.06); },
  play() { blip(392, 0.12, 'triangle', 0.12); blip(523, 0.14, 'triangle', 0.1, 0.08); },
  hit() { blip(180, 0.18, 'sawtooth', 0.14); blip(90, 0.22, 'square', 0.1, 0.05); },
  charge() { blip(880, 0.1, 'sine', 0.1); blip(1174, 0.16, 'sine', 0.1, 0.09); },
  ward() { blip(1046, 0.2, 'sine', 0.09); blip(784, 0.24, 'sine', 0.08, 0.1); },
  resonance() { blip(523, 0.1, 'triangle', 0.1); blip(659, 0.1, 'triangle', 0.1, 0.07); blip(784, 0.18, 'triangle', 0.12, 0.14); },
  win() { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'triangle', 0.12, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => blip(f, 0.26, 'sine', 0.11, i * 0.14)); },
};

// Ember Pact — mouse and keyboard.
// Click a hand card to play it, click END TURN (or Space) to pass, keys
// 1-5 play from the hand, R restarts, M mutes, P pauses. Every gesture
// also wakes the synth, so the first click is what arms the sound.
import { VIEW_H, VIEW_W } from './config.js';
import { endTurn, playCard, startMatch } from './world.js';
import { hitTest, hoverTest } from './render.js';
import { initAudio, toggleMute } from './audio.js';

function toCanvas(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

/** Wire the canvas and the keyboard to one match state. */
export function attachInput(canvas, state) {
  canvas.addEventListener('pointermove', (event) => {
    const p = toCanvas(canvas, event);
    state.hover = hoverTest(state, p.x, p.y);
  });
  canvas.addEventListener('pointerleave', () => {
    state.hover = -1;
  });
  canvas.addEventListener('pointerdown', (event) => {
    initAudio(state);
    const p = toCanvas(canvas, event);
    const hit = hitTest(state, p.x, p.y);
    if (!hit) return;
    if (hit.kind === 'start' || hit.kind === 'again') {
      startMatch(state, state.seed);
    } else if (hit.kind === 'end-turn') {
      endTurn(state);
    } else if (hit.kind === 'card') {
      playCard(state, state.you, hit.index);
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    initAudio(state);
    const key = event.key;
    if (key === 'm' || key === 'M') {
      state.muted = toggleMute(state);
      return;
    }
    if (key === 'p' || key === 'P') {
      if (state.screen === 'play') state.paused = !state.paused;
      return;
    }
    if (key === 'r' || key === 'R') {
      if (state.screen !== 'title') startMatch(state, state.seed);
      return;
    }
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      if (state.screen === 'title') startMatch(state, state.seed);
      else if (state.screen === 'win' || state.screen === 'loss') startMatch(state, state.seed);
      else if (state.screen === 'play' && state.turn === 'player') endTurn(state);
      return;
    }
    if (key >= '1' && key <= '5') {
      const index = Number(key) - 1;
      if (state.screen === 'play' && state.turn === 'player') {
        playCard(state, state.you, index);
      }
    }
  });
}

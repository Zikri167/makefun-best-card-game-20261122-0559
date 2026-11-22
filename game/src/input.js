// Ember Pact — mouse + keyboard input. Clicks are mapped through the same
// rect helpers the renderer uses, so a button is clickable exactly where
// it is drawn. Keys: 1-5 play a hand card, Q POWER, W WARD, Space end turn,
// R restart, M mute, P pause, Enter start / play again.

import { W, H, LAYOUT } from './config.js';
import {
  handCardRect, rookGuardianRect, playerGuardianRect,
  rookLifeRect, playerLifeRect,
} from './render.js';

function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function attachInput(canvas, world) {
  function toGame(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  canvas.addEventListener('click', (e) => {
    const { x, y } = toGame(e);
    const s = world.state;
    if (s.phase === 'title') {
      if (inside(x, y, LAYOUT.startBtn)) world.startGame();
      return;
    }
    if (s.phase === 'win' || s.phase === 'loss') {
      if (inside(x, y, LAYOUT.againBtn)) world.startGame();
      return;
    }
    if (s.phase !== 'play' || s.paused) return;

    // A pending strike needs a target first: a Rook guardian, or Rook life.
    if (s.pendingStrike) {
      for (let i = 0; i < s.rook.guardians.length; i++) {
        if (inside(x, y, rookGuardianRect(i, s.rook.guardians.length))) {
          world.resolveStrike('guardian', i);
          return;
        }
      }
      if (inside(x, y, rookLifeRect())) {
        world.resolveStrike('life', 0);
        return;
      }
      return;
    }

    if (inside(x, y, LAYOUT.endTurn)) { world.endTurn(); return; }
    if (inside(x, y, LAYOUT.powerBtn)) { world.usePower(); return; }
    if (inside(x, y, LAYOUT.wardBtn)) { world.useWard(); return; }

    for (let i = 0; i < s.player.hand.length; i++) {
      if (inside(x, y, handCardRect(i, s.player.hand.length))) {
        world.playCard(i);
        return;
      }
    }
    // Clicking a player guardian does nothing; it is only a shield.
    void playerGuardianRect;
    void playerLifeRect;
  });

  window.addEventListener('keydown', (e) => {
    const s = world.state;
    if (e.code === 'KeyM') { world.toggleMute(); return; }
    if (e.code === 'KeyP') { world.togglePause(); return; }
    if (s.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) { world.startGame(); return; }
    if ((s.phase === 'win' || s.phase === 'loss') && (e.code === 'Enter' || e.code === 'KeyR')) { world.startGame(); return; }
    if (s.phase !== 'play' || s.paused) return;
    if (e.code === 'KeyR') { world.startGame(); return; }
    if (e.code === 'Space') { e.preventDefault(); world.endTurn(); return; }
    if (e.code === 'KeyQ') { world.usePower(); return; }
    if (e.code === 'KeyW') { world.useWard(); return; }
    const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);
    if (digit >= 0 && digit < s.player.hand.length) world.playCard(digit);
  });
}

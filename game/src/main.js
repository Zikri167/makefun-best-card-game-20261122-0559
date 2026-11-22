// Ember Pact — boot, frame loop and ?shot= mode.
// The canvas is a fixed 1280x720 stage scaled by CSS. In normal play the
// loop runs on requestAnimationFrame; with ?shot= the scene is staged,
// settled with fixed 16 ms steps (so the image is deterministic), one
// frame is drawn and window.__shotReady is set for the screenshot tool.
// window.__ember exposes the live state for playtesting.
import { VIEW_H, VIEW_W } from './config.js';
import { createMatch, update } from './world.js';
import { draw } from './render.js';
import { attachInput } from './input.js';
import { stageShot, stageTest } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '7') || 7;
const shot = params.get('shot');
const test = params.get('test');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const state = createMatch(seed);
if (shot) {
  stageShot(state, shot, seed);
} else if (test) {
  stageTest(state, test, seed);
}
attachInput(canvas, state);

const statusEl = document.getElementById('status');
let lastStatus = '';
let lastTime = performance.now();

function refreshDebug() {
  window.__ember = {
    screen: state.screen,
    turn: state.turn,
    turnCount: state.turnCount,
    youLife: state.you.life,
    rookLife: state.rook.life,
    youEmber: state.you.ember,
    youMaxEmber: state.you.maxEmber,
    rookEmber: state.rook.ember,
    youHand: state.you.hand.map((c) => c.id),
    rookHand: state.rook.hand.length,
    youGuardians: state.you.guardians.map((g) => `${g.id}:${g.health}`),
    rookGuardians: state.rook.guardians.map((g) => `${g.id}:${g.health}`),
    score: state.score,
    best: state.best,
    log: state.log.slice(-3),
  };
  const status =
    state.screen === 'title'
      ? 'Ember Pact title screen. Press Enter or click Start Duel.'
      : state.screen === 'play'
        ? `Turn ${state.turnCount}. Your life ${state.you.life}, Rook life ${state.rook.life}. Ember ${state.you.ember} of ${state.you.maxEmber}.`
        : state.screen === 'win'
          ? `Victory. Score ${state.score}.`
          : `Defeat. Score ${state.score}.`;
  if (status !== lastStatus) {
    lastStatus = status;
    if (statusEl) statusEl.textContent = status;
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(state, dt);
  draw(ctx, state, now, { x: -1, y: -1 });
  refreshDebug();
  requestAnimationFrame(frame);
}

if (shot) {
  // Settle every slide, aim and confetti burst with fixed steps, then
  // draw once and announce the shot. The live loop keeps running after.
  for (let i = 0; i < 24; i++) update(state, 0.016);
  draw(ctx, state, performance.now(), { x: -1, y: -1 });
  refreshDebug();
  window.__shotReady = true;
}
requestAnimationFrame(frame);

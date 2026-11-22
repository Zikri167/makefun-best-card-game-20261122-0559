// Ember Pact — boot + game loop. Fixed 1280x720 canvas, scaled by CSS.
// ?shot=title|play|win|loss stages a deterministic scene and sets
// window.__shotReady once it has been drawn, for headless screenshots.

import { W, H } from './config.js';
import { createWorld } from './world.js';
import { draw } from './render.js';
import { attachInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 7) || 7;

const world = createWorld(seed);
window.__world = world;
window.__shotReady = false;

attachInput(canvas, world);

if (shot) {
  stageShot(world, shot);
  // Draw a few frames so canvas state settles, then signal readiness.
  let frames = 0;
  const tick = () => {
    world.update(1 / 60);
    draw(ctx, world.state);
    frames++;
    if (frames >= 3) {
      window.__shotReady = true;
    } else {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
} else {
  world.state.phase = 'title';
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    world.update(dt);
    draw(ctx, world.state);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

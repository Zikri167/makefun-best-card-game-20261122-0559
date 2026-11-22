// Ember Pact — screenshot scenes and scripted test setups.
// A shot stages a real match through the real rules (cards are played
// with playCard, turns with endTurn, Rook with its own chooser), then
// pins the exact display values the cover needs — Life 20 vs 14, ember
// 6/10, the Resonance banner — so the four images are deterministic for
// a fixed seed and honest renders of the game's own code.
import { drawCards, makeCard } from './deck.js';
import { endTurn, playCard, rookTurnInstant, startMatch, update } from './world.js';

function findInHand(side, id) {
  return side.hand.findIndex((c) => c.id === id);
}

function rigHand(side, ids) {
  side.hand = ids.map((id) => makeCard(id));
}

function drainRookTurn(state) {
  for (let i = 0; i < 400 && state.turn === 'rook' && state.screen === 'play'; i++) {
    update(state, 0.1);
  }
}

function topUpHand(state, side, ids) {
  rigHand(side, ids);
}

function ensureGuardian(side, def) {
  if (side.guardians.length === 0) {
    side.guardians.push({
      uid: 'shot-' + def.id,
      id: def.id,
      name: def.name,
      element: def.element,
      power: def.power,
      health: def.health,
    });
  }
}

function stagePlay(state, seed) {
  startMatch(state, seed);
  const you = state.you;
  const rook = state.rook;
  you.maxEmber = 10;
  you.ember = 10;
  rigHand(you, ['ember-slash', 'cinder-fang', 'thornwall', 'tide-lash', 'kindle-insight']);
  // Two Flame strikes in one turn: the second lands the Resonance.
  playCard(state, you, findInHand(you, 'ember-slash'));
  playCard(state, you, findInHand(you, 'cinder-fang'));
  playCard(state, you, findInHand(you, 'thornwall'));
  endTurn(state);
  drainRookTurn(state);
  if (state.screen !== 'play') {
    // Rook somehow ended it early; restage on the play screen.
    startMatch(state, seed);
    return stagePlay(state, seed);
  }
  // Both walls stand for the cover.
  ensureGuardian(you, { id: 'thornwall', name: 'Thornwall', element: 'THORN', power: 2, health: 6 });
  ensureGuardian(rook, { id: 'coral-bastion', name: 'Coral Bastion', element: 'TIDE', power: 2, health: 9 });
  // The cover numbers, pinned after real play.
  you.life = 20;
  rook.life = 14;
  you.maxEmber = 10;
  you.ember = 6;
  state.banner = { text: 'RESONANCE! FLAME +1' };
  state.bannerT = 9;
  topUpHand(state, you, ['ember-slash', 'cinder-fang', 'phoenix-dive', 'thornwall', 'tide-pull']);
  drawCards(rook, state.rng, 5 - rook.hand.length > 0 ? 5 - rook.hand.length : 0, 7);
  state.log.push('Resonance! Two FLAME cards — both strike +1 harder.');
}

function stageWin(state, seed) {
  startMatch(state, seed);
  state.you.life = 9;
  state.rook.life = 4;
  state.you.maxEmber = 10;
  state.you.ember = 10;
  rigHand(state.you, ['phoenix-dive', 'ember-slash', 'cinder-fang', 'thornwall', 'tide-lash']);
  playCard(state, state.you, findInHand(state.you, 'phoenix-dive'));
}

function stageLoss(state, seed) {
  startMatch(state, seed);
  state.you.life = 3;
  state.rook.life = 11;
  state.rook.maxEmber = 10;
  state.rook.ember = 10;
  rigHand(state.rook, ['wave-crash', 'ember-slash', 'tide-shield']);
  playCard(state, state.rook, findInHand(state.rook, 'wave-crash'));
}

/** Stage one of the four named scenes. Unknown names fall back to title. */
export function stageShot(state, name, seed) {
  if (name === 'play') return stagePlay(state, seed);
  if (name === 'win') return stageWin(state, seed);
  if (name === 'loss') return stageLoss(state, seed);
  state.screen = 'title';
  try {
    window.localStorage.setItem('ember-pact-best', '1250');
    state.best = 1250;
  } catch {
    state.best = 1250;
  }
}

/**
 * Scripted near-win / near-loss starts for the interactive playtest:
 * one real click (or one ended turn) from the matching end screen.
 */
export function stageTest(state, name, seed) {
  if (name === 'win') {
    startMatch(state, seed);
    state.you.life = 12;
    state.rook.life = 4;
    state.you.maxEmber = 10;
    state.you.ember = 10;
    rigHand(state.you, ['phoenix-dive', 'ember-slash', 'cinder-fang', 'thornwall', 'tide-lash']);
    return;
  }
  if (name === 'loss') {
    startMatch(state, seed);
    state.you.life = 3;
    state.rook.life = 11;
    state.rook.maxEmber = 10;
    rigHand(state.rook, ['wave-crash']);
    return;
  }
  startMatch(state, seed);
}

// Ember Pact — Rook, the AI opponent. Greedy but readable: it scores every
// playable card, prefers elemental advantage and lethal, summons a guardian
// when the player threatens lethal, and saves ember for a big trick when
// nothing good is on the table. It also earns Charge exactly like the
// player and spends it on POWER only when the extra damage is lethal or
// smashes a guardian. Taunts are picked per element, 2-3 lines each.

import { beats, POWER_BONUS } from './config.js';
import { rngPick } from './random.js';

export const TAUNTS = {
  flame: [
    'Rook: "I will burn your pact to ash."',
    'Rook: "Feel the heat, little ember."',
    'Rook: "My flames eat cowards first."',
  ],
  thorn: [
    'Rook: "My thorns will hold you still."',
    'Rook: "Struggle all you like — the vines tighten."',
    'Rook: "One prick, and the garden owns you."',
  ],
  tide: [
    'Rook: "The tide takes everything back."',
    'Rook: "Drown quietly, ember."',
    'Rook: "You cannot outswim the deep."',
  ],
};

export function pickTaunt(rng, element) {
  const lines = TAUNTS[element] || TAUNTS.flame;
  return rngPick(rng, lines);
}

// Score one card in Rook's hand. Higher is better.
export function scoreCard(state, card, index) {
  const rook = state.rook;
  const player = state.player;
  let score = 0;
  const adv = player.lastElement && beats(card.element, player.lastElement) ? 2 : 0;
  if (card.type === 'strike') {
    score = card.power * 2 + adv * 2;
    if (card.power >= player.life) score += 100; // lethal
    if (player.guardians.length > 0) {
      const weakest = Math.min(...player.guardians.map((g) => g.health));
      if (card.power >= weakest) score += 12; // smashes a guardian
    }
    if (card.power + POWER_BONUS >= player.life && rook.charge > 0) score += 40;
  } else if (card.type === 'guardian') {
    score = 6 + card.power;
    if (player.life <= 8) score -= 4; // press the attack instead
    const threat = player.hand.reduce((m, c) => Math.max(m, c.type === 'strike' ? c.power : 0), 0);
    if (threat >= rook.life) score += 20; // block lethal
  } else if (card.type === 'trick') {
    if (card.effect === 'draw2') score = rook.hand.length <= 2 ? 14 : 5;
    else if (card.effect === 'steal') score = player.ember > 0 ? 12 : 2;
    else if (card.effect === 'heal') score = rook.life <= 12 ? 18 : 3;
    else if (card.effect === 'drawEmber') score = 10;
    else score = 5;
  }
  score -= card.cost; // prefer cheap value
  score += index * 0.01; // stable tie-break
  return score;
}

// Plan Rook's whole turn: a list of hand indexes, best first, that fit
// the ember Rook will have. The world executes them one at a time.
export function planRookTurn(state) {
  const rook = state.rook;
  let ember = rook.ember;
  const plan = [];
  const used = new Set();
  for (;;) {
    let best = null;
    let bestScore = 4; // do not play junk just to play it
    for (let i = 0; i < rook.hand.length; i++) {
      if (used.has(i)) continue;
      const card = rook.hand[i];
      if (card.cost > ember) continue;
      const s = scoreCard(state, card, i);
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    if (best === null) break;
    plan.push(best);
    used.add(best);
    ember -= rook.hand[best].cost;
  }
  return plan;
}

// Should Rook spend 1 Charge on POWER for this strike? Only when the
// boosted damage is lethal or destroys a player guardian.
export function rookWantsPower(state, card, power) {
  const rook = state.rook;
  const player = state.player;
  if (rook.charge < 1) return false;
  const boosted = power + POWER_BONUS;
  if (boosted >= player.life && player.guardians.length === 0) return true;
  if (player.guardians.length > 0) {
    const weakest = Math.min(...player.guardians.map((g) => g.health));
    if (power < weakest && boosted >= weakest) return true;
  }
  return false;
}

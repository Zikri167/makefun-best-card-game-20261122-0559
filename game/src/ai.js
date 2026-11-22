// Ember Pact — the mind of Rook, the AI duelist.
// Rook is greedy and readable on purpose: it scores every card it could
// play, takes the best one, and its strike target is telegraphed before it
// lands, so the player can answer with a Guardian. It also sometimes banks
// its ember for a big Trick instead of spending it all at once.
import { ADVANTAGE_BONUS, beatsElement } from './config.js';
import { cardDef } from './cards.js';

/** The guardian a Strike would hit: the weakest one, or null for open Life. */
export function strikeTarget(state, defender) {
  if (defender.guardians.length === 0) return null;
  let weakest = defender.guardians[0];
  for (const g of defender.guardians) {
    if (g.health < weakest.health) weakest = g;
  }
  return weakest;
}

/** Damage a strike of `card` would deal to `defender` right now. */
export function strikeDamage(card, defender) {
  const target = strikeTarget(null, defender);
  let dmg = card.power;
  if (target && beatsElement(card.element, target.element)) dmg += ADVANTAGE_BONUS;
  return { damage: dmg, target };
}

/** Score one playable card for Rook; higher means Rook wants it more. */
function scoreCard(state, card, index) {
  const rook = state.rook;
  const you = state.you;
  if (card.type === 'strike') {
    const target = strikeTarget(state, you);
    let dmg = card.power;
    if (target && beatsElement(card.element, target.element)) dmg += ADVANTAGE_BONUS;
    let score = dmg * 2;
    if (target) {
      if (dmg >= target.health) score += 9; // breaks the wall
      score += 2; // a strike that must chew a guardian is still progress
    }
    if (dmg >= you.life) score += 1000; // lethal is everything
    if (rook.life <= 6 && dmg >= you.life - 4) score += 6; // press a close game
    return score;
  }
  if (card.type === 'guardian') {
    let score = card.health * 1.2 + card.power;
    if (rook.guardians.length === 0) score += 4; // an empty wall begs for one
    if (you.life <= 6) score += 3; // protect a lead
    if (rook.life <= 8) score += 5; // hide behind something when hurt
    return score;
  }
  // Tricks.
  if (card.effect === 'draw2') return rook.hand.length <= 3 ? 7 : 4;
  if (card.effect === 'steal') return you.ember >= 4 ? 8 : 3;
  if (card.effect === 'heal3') return (20 - rook.life) * 0.9 + 1;
  if (card.effect === 'draw-ember') return rook.hand.length <= 2 ? 8 : 5;
  return 3;
}

/**
 * Rook's next move: { action: 'play', index } or { action: 'end' }.
 * Plays the best affordable card, or banks ember when a Trick it cannot
 * yet afford is worth waiting for (a seeded coin-flip, so replays agree).
 */
export function rookChoose(state) {
  const rook = state.rook;
  let best = null;
  let bestScore = -1;
  for (let i = 0; i < rook.hand.length; i++) {
    const card = cardDef(rook.hand[i].id);
    if (!card || card.cost > rook.ember) continue;
    const score = scoreCard(state, card, i);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best !== null && bestScore > 0) {
    // Banking: a fat Trick sits in hand, unaffordable this turn, and Rook
    // would rather save than spend on something small.
    const bigTrick = rook.hand.some((c) => {
      const d = cardDef(c.id);
      return d && d.type === 'trick' && d.cost > rook.ember && d.cost <= 4;
    });
    if (bigTrick && bestScore < 6 && state.rng() < 0.35) return { action: 'end' };
    return { action: 'play', index: best };
  }
  return { action: 'end' };
}

/** What Rook is about to do, in words the table can show while it aims. */
export function rookIntentText(state, card) {
  if (!card) return '';
  if (card.type === 'strike') {
    const target = strikeTarget(state, state.you);
    return target ? `ROOK AIMS AT ${target.name.toUpperCase()}` : 'ROOK AIMS AT YOUR LIFE';
  }
  if (card.type === 'guardian') return `ROOK SUMMONS ${card.name.toUpperCase()}`;
  return `ROOK CASTS ${card.name.toUpperCase()}`;
}

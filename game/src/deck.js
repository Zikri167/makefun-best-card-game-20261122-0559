// Ember Pact — deck pile: shuffle, draw, discard, reshuffle when empty.
// Drawing from an empty deck reshuffles the discard pile back in, so a
// long match never dead-ends; the legend on the table shows the count.

import { shuffle } from './random.js';
import { buildDeck } from './cards.js';

export function newPile(rng) {
  return {
    drawPile: shuffle(rng, buildDeck()),
    discardPile: [],
  };
}

export function pileCounts(pile) {
  return { deck: pile.drawPile.length, discard: pile.discardPile.length };
}

// Draw up to n cards; reshuffles discard into deck when the pile runs dry.
export function drawFrom(pile, rng, n) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (pile.drawPile.length === 0) {
      if (pile.discardPile.length === 0) break;
      pile.drawPile = shuffle(rng, pile.discardPile);
      pile.discardPile = [];
    }
    drawn.push(pile.drawPile.pop());
  }
  return drawn;
}

export function discardTo(pile, card) {
  if (card) pile.discardPile.push(card);
}

export function reshuffled(pile, rng) {
  if (pile.drawPile.length === 0 && pile.discardPile.length > 0) {
    pile.drawPile = shuffle(rng, pile.discardPile);
    pile.discardPile = [];
    return true;
  }
  return false;
}

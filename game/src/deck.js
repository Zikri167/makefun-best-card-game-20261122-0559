// Ember Pact — decks, drawing and discarding.
// A deck is a shuffled pile of card instances (each carries a unique id so
// the renderer can slide the same card around the table). Drawing past the
// end reshuffles the discard pile, so a long duel never runs dry.
import { deckCardIds } from './cards.js';
import { shuffle } from './random.js';

let nextUid = 1;

/** A fresh shuffled 30-card deck for one duelist. */
export function makeDeck(rng) {
  const ids = shuffle(rng, deckCardIds());
  return ids.map((id) => ({ uid: nextUid++, id }));
}

/** A card instance built straight from a catalogue id (screenshot staging). */
export function makeCard(id) {
  return { uid: nextUid++, id };
}

/**
 * Draw up to n cards from side.deck into side.hand (hand caps at HAND_MAX).
 * Reshuffles the discard pile when the deck runs out. Returns how many
 * were actually drawn.
 */
export function drawCards(side, rng, n, handMax) {
  let drawn = 0;
  for (let k = 0; k < n; k++) {
    if (side.hand.length >= handMax) break;
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(rng, side.discard.splice(0));
    }
    side.hand.push(side.deck.pop());
    drawn++;
  }
  return drawn;
}

/** Move a card instance to its owner's discard pile. */
export function discardCard(side, card) {
  side.discard.push(card);
}

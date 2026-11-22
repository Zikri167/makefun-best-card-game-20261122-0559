// Ember Pact — the deck. Fifteen original designs, two copies each, for a
// 30-card deck. Three elements, three card types:
//   strike   — hits the enemy (guardians block first)
//   guardian — stays on the table with Health, soaks strikes
//   trick    — one-shot effect: draw, steal ember, heal, or draw + ember
// Power is the strike damage / guardian strength; guardian Health is
// power + 3, shown on the card.

import { ELEMENTS } from './config.js';

export const CARD_DEFS = [
  { name: 'Ember Spark', element: 'flame', type: 'strike', cost: 1, power: 2, text: 'Deal 2 damage.' },
  { name: 'Flame Lash', element: 'flame', type: 'strike', cost: 2, power: 4, text: 'Deal 4 damage.' },
  { name: 'Pyre Hound', element: 'flame', type: 'guardian', cost: 2, power: 3, text: 'Guardian. Health 6.' },
  { name: 'Ash Draw', element: 'flame', type: 'trick', cost: 2, power: 0, effect: 'draw2', text: 'Draw 2 cards.' },
  { name: 'Inferno Blast', element: 'flame', type: 'strike', cost: 4, power: 6, text: 'Deal 6 damage.' },
  { name: 'Thorn Whip', element: 'thorn', type: 'strike', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { name: 'Bramble Wall', element: 'thorn', type: 'guardian', cost: 2, power: 3, text: 'Guardian. Health 6.' },
  { name: 'Vine Snare', element: 'thorn', type: 'trick', cost: 2, power: 0, effect: 'steal', text: 'Steal 1 ember.' },
  { name: 'Thorn Barrage', element: 'thorn', type: 'strike', cost: 3, power: 5, text: 'Deal 5 damage.' },
  { name: 'Bloom Mend', element: 'thorn', type: 'trick', cost: 2, power: 0, effect: 'heal', text: 'Heal 3 Life.' },
  { name: 'Tide Splash', element: 'tide', type: 'strike', cost: 1, power: 2, text: 'Deal 2 damage.' },
  { name: 'Wave Guard', element: 'tide', type: 'guardian', cost: 3, power: 4, text: 'Guardian. Health 7.' },
  { name: 'Deep Draw', element: 'tide', type: 'trick', cost: 1, power: 0, effect: 'drawEmber', text: 'Draw 1 card, +1 ember.' },
  { name: 'Tidal Surge', element: 'tide', type: 'strike', cost: 3, power: 5, text: 'Deal 5 damage.' },
  { name: 'Coral Bastion', element: 'tide', type: 'guardian', cost: 3, power: 5, text: 'Guardian. Health 8.' },
];

let uidCounter = 1;

export function makeCard(def) {
  return {
    uid: uidCounter++,
    name: def.name,
    element: def.element,
    type: def.type,
    cost: def.cost,
    power: def.power,
    effect: def.effect || null,
    text: def.text,
  };
}

export function makeGuardian(card) {
  return {
    uid: card.uid,
    name: card.name,
    element: card.element,
    power: card.power,
    health: card.power + 3,
    maxHealth: card.power + 3,
  };
}

// A fresh 30-card deck: every design twice, in definition order.
export function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) {
    deck.push(makeCard(def));
    deck.push(makeCard(def));
  }
  return deck;
}

export function elementOf(card) {
  return card.element;
}

export function elements() {
  return ELEMENTS.slice();
}

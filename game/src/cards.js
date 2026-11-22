// Ember Pact — the card catalogue.
// Fifteen original designs, two copies each, make the 30-card deck both
// duelists draw from. A card is one plain object: its element, its kind
// (Strike hits, Guardian stands on the table, Trick does something at
// once), its ember cost, and the numbers its kind needs.
export const CARDS = [
  { id: 'ember-slash', name: 'Ember Slash', element: 'FLAME', type: 'strike', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'cinder-fang', name: 'Cinder Fang', element: 'FLAME', type: 'strike', cost: 2, power: 5, text: 'Deal 5 damage.' },
  { id: 'phoenix-dive', name: 'Phoenix Dive', element: 'FLAME', type: 'strike', cost: 4, power: 8, text: 'Deal 8 damage.' },
  { id: 'thorn-whip', name: 'Thorn Whip', element: 'THORN', type: 'strike', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'bramble-shot', name: 'Bramble Shot', element: 'THORN', type: 'strike', cost: 2, power: 5, text: 'Deal 5 damage.' },
  { id: 'tide-lash', name: 'Tide Lash', element: 'TIDE', type: 'strike', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'wave-crash', name: 'Wave Crash', element: 'TIDE', type: 'strike', cost: 2, power: 5, text: 'Deal 5 damage.' },
  { id: 'cinder-bulwark', name: 'Cinder Bulwark', element: 'FLAME', type: 'guardian', cost: 2, power: 2, health: 5, text: 'Guardian 5. Hits back for 2.' },
  { id: 'thornwall', name: 'Thornwall', element: 'THORN', type: 'guardian', cost: 2, power: 2, health: 6, text: 'Guardian 6. Hits back for 2.' },
  { id: 'tide-shield', name: 'Tide Shield', element: 'TIDE', type: 'guardian', cost: 2, power: 2, health: 5, text: 'Guardian 5. Hits back for 2.' },
  { id: 'coral-bastion', name: 'Coral Bastion', element: 'TIDE', type: 'guardian', cost: 4, power: 2, health: 9, text: 'Guardian 9. Hits back for 2.' },
  { id: 'kindle-insight', name: 'Kindle Insight', element: 'FLAME', type: 'trick', cost: 2, power: 0, effect: 'draw2', text: 'Draw 2 cards.' },
  { id: 'spark-siphon', name: 'Spark Siphon', element: 'FLAME', type: 'trick', cost: 3, power: 0, effect: 'steal', text: 'Steal 1 ember from Rook.' },
  { id: 'bloom-mend', name: 'Bloom Mend', element: 'THORN', type: 'trick', cost: 2, power: 0, effect: 'heal3', text: 'Restore 3 Life.' },
  { id: 'tide-pull', name: 'Tide Pull', element: 'TIDE', type: 'trick', cost: 2, power: 0, effect: 'draw-ember', text: 'Draw 1 card. Gain 1 ember.' },
];

export const CARDS_BY_ID = {};
for (const c of CARDS) CARDS_BY_ID[c.id] = c;

/** The 30 ids of one deck: every design twice, in catalogue order. */
export function deckCardIds() {
  const ids = [];
  for (const c of CARDS) {
    ids.push(c.id, c.id);
  }
  return ids;
}

/** Look a card definition up by id; null for an unknown id. */
export function cardDef(id) {
  return CARDS_BY_ID[id] || null;
}

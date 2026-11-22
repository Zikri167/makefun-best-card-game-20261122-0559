// Ember Pact — shared constants: table size, rules, elements, layout.
// No network, no outside assets; every number the game needs lives here.

export const W = 1280;
export const H = 720;

export const START_LIFE = 20;
export const DECK_SIZE = 30;
export const HAND_SIZE = 5;
export const MAX_EMBER = 10;
export const MAX_CHARGE = 3;
export const RESONANCE_BONUS = 1;
export const POWER_BONUS = 2;

// Element cycle: Flame beats Thorn, Thorn beats Tide, Tide beats Flame.
export const ELEMENTS = ['flame', 'thorn', 'tide'];
export const BEATS = { flame: 'thorn', thorn: 'tide', tide: 'flame' };
export const BEATEN_BY = { flame: 'tide', thorn: 'flame', tide: 'thorn' };

export const ELEMENT_COLOR = {
  flame: '#e2482a',
  thorn: '#3f9e4d',
  tide: '#2f7fd0',
};
export const ELEMENT_DARK = {
  flame: '#8f1f10',
  thorn: '#1d5c28',
  tide: '#123f6e',
};
export const ELEMENT_GLYPH = { flame: '▲', thorn: '✦', tide: '●' };
export const ELEMENT_NAME = { flame: 'Flame', thorn: 'Thorn', tide: 'Tide' };

export const CARD_TYPES = ['strike', 'guardian', 'trick'];

// Fixed layout so render and input agree on every clickable rect.
export const LAYOUT = {
  handCardW: 112,
  handCardH: 148,
  handY: 556,
  handGap: 8,
  rookHandW: 62,
  rookHandH: 92,
  rookHandY: 14,
  guardW: 104,
  guardH: 118,
  rookGuardY: 178,
  playerGuardY: 424,
  endTurn: { x: 1096, y: 586, w: 160, h: 44 },
  powerBtn: { x: 24, y: 656, w: 104, h: 34 },
  wardBtn: { x: 136, y: 656, w: 104, h: 34 },
  startBtn: { x: 540, y: 516, w: 200, h: 56 },
  againBtn: { x: 540, y: 536, w: 200, h: 56 },
  legend: { x: 1064, y: 150, w: 196, h: 292 },
  log: { x: 24, y: 296, w: 268 },
};

// Returns true when attacker element beats defender element.
export function beats(a, b) {
  return BEATS[a] === b;
}

// Returns true when card element loses to the given last-played element.
export function losesTo(cardElement, lastElement) {
  if (!lastElement) return false;
  return BEATS[lastElement] === cardElement;
}

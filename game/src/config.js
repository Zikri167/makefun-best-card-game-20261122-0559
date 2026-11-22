// Ember Pact — shared constants and table geometry.
// One place owns every number the rest of the game reads: lives, deck and
// hand sizes, ember rules, element colours and the card-table layout, so a
// balance tweak never means hunting through the renderer.
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const START_LIFE = 20;
export const DECK_SIZE = 30;
export const HAND_START = 5;
export const HAND_MAX = 7;
export const EMBER_START = 1;
export const EMBER_MAX = 10;
export const RESONANCE_BONUS = 1;
export const ADVANTAGE_BONUS = 2;

export const ELEMENTS = {
  FLAME: { key: 'FLAME', name: 'Flame', color: '#e2483d', dark: '#7d1a12', light: '#ff9a8a', beats: 'THORN' },
  THORN: { key: 'THORN', name: 'Thorn', color: '#58a34b', dark: '#2a5a22', light: '#a5d894', beats: 'TIDE' },
  TIDE: { key: 'TIDE', name: 'Tide', color: '#3d7de2', dark: '#173f86', light: '#93b9f2', beats: 'FLAME' },
};
export const ELEMENT_ORDER = ['FLAME', 'THORN', 'TIDE'];

/** True when element `a` beats element `b` on the Flame > Thorn > Tide > Flame cycle. */
export function beatsElement(a, b) {
  return ELEMENTS[a] && ELEMENTS[a].beats === b;
}

// Card sizes: table cards a little smaller than hand cards so the two rows
// read as different zones at a glance.
export const CARD_W = 116;
export const CARD_H = 150;
export const HAND_W = 128;
export const HAND_H = 160;
export const BACK_W = 76;
export const BACK_H = 104;

// The table lives left of the battle log; its centre is the anchor for
// every row of cards.
export const TABLE_CENTER_X = 520;
export const LOG_PANEL = { x: 1056, y: 64, w: 212, h: 496 };
export const END_TURN_BUTTON = { x: 1080, y: 636, w: 184, h: 64 };
export const START_BUTTON = { x: 520, y: 486, w: 240, h: 64 };
export const AGAIN_BUTTON = { x: 520, y: 520, w: 240, h: 64 };
export const ROOK_ROW_Y = 180;
export const YOU_ROW_Y = 392;
export const HAND_Y = 556;

/** Rect of the i-th card in a hand of n (hover lift applied by the renderer). */
export function handRect(i, n) {
  const total = n * HAND_W + (n - 1) * 12;
  const x0 = TABLE_CENTER_X - total / 2;
  return { x: x0 + i * (HAND_W + 12), y: HAND_Y, w: HAND_W, h: HAND_H };
}

/** Rect of the i-th card in a guardian row of n at height y. */
export function tableRowRect(i, n, y) {
  const total = n * CARD_W + (n - 1) * 16;
  const x0 = TABLE_CENTER_X - total / 2;
  return { x: x0 + i * (CARD_W + 16), y, w: CARD_W, h: CARD_H };
}

/** Rect of the i-th face-down card in the opponent's hand of n. */
export function backRect(i, n) {
  const total = n * BACK_W + (n - 1) * 10;
  const x0 = TABLE_CENTER_X - total / 2;
  return { x: x0 + i * (BACK_W + 10), y: 66, w: BACK_W, h: BACK_H };
}

/** True when point (px, py) falls inside rect r. */
export function insideRect(r, px, py) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

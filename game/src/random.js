// Ember Pact — seeded random numbers.
// One tiny generator (mulberry32) drives every shuffle, AI coin-flip and
// confetti burst, so a match started from a seed plays the same way every
// time and the screenshot scenes are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, max) from rng. */
export function randInt(rng, max) {
  return Math.floor(rng() * max);
}

/** Fisher-Yates shuffle in place, driven by rng. Returns the same array. */
export function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

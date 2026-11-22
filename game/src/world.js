// Ember Pact — the match state machine.
// Owns the whole duel: screens (title / play / win / loss), turns, ember,
// combat, the Resonance combo, Rook's telegraphed turn, floating numbers
// and the win confetti. The renderer only reads this state; it never
// changes a rule.
import {
  ADVANTAGE_BONUS, beatsElement, EMBER_MAX, EMBER_START, HAND_MAX,
  HAND_START, RESONANCE_BONUS, START_LIFE,
} from './config.js';
import { cardDef } from './cards.js';
import { discardCard, drawCards, makeDeck } from './deck.js';
import { mulberry32, randInt } from './random.js';
import { rookChoose, rookIntentText, strikeTarget } from './ai.js';

function newSide(name, rng) {
  const side = {
    name,
    life: START_LIFE,
    deck: makeDeck(rng),
    discard: [],
    hand: [],
    guardians: [],
    ember: EMBER_START,
    maxEmber: EMBER_START,
    playsThisTurn: [],
    playedThisTurn: [],
  };
  drawCards(side, rng, HAND_START, HAND_MAX);
  return side;
}

/** A fresh match in the title screen. Nothing has been played yet. */
export function createMatch(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    screen: 'title',
    turn: 'player',
    turnCount: 1,
    you: newSide('YOU', rng),
    rook: newSide('ROOK', rng),
    log: ['Welcome to Ember Pact. Sealed in flame, thorn and tide.'],
    banner: null,
    bannerT: 0,
    aim: null,
    aimT: 0,
    aimText: '',
    fx: [],
    particles: [],
    winner: null,
    score: 0,
    best: loadBest(),
    paused: false,
    muted: false,
    hover: -1,
    aiQueue: [],
    aiTimer: 0,
    stats: { plays: 0, resonance: 0 },
    anim: {},
  };
  return state;
}

function loadBest() {
  try {
    return Number(window.localStorage.getItem('ember-pact-best') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem('ember-pact-best', String(score));
  } catch {
    // Private mode or no storage: the score still shows this session.
  }
}

/** Start (or restart) a match from the title screen. */
export function startMatch(state, seed) {
  const fresh = createMatch(seed === undefined ? state.seed : seed);
  fresh.screen = 'play';
  fresh.log = ['The pact is sealed. Your move — play a card, then end your turn.'];
  Object.assign(state, fresh);
  return state;
}

/** Add a line to the battle log, newest last, capped at eight. */
export function addLog(state, line) {
  state.log.push(line);
  while (state.log.length > 8) state.log.shift();
}

/** A floating damage/heal number over the table. */
function addFx(state, x, y, text, color) {
  state.fx.push({ x, y, text, color, t: 0, life: 1.1 });
  if (state.fx.length > 24) state.fx.shift();
}

/** Refill a side's ember to its (grown) maximum and draw a card. */
function beginTurn(state, side) {
  side.maxEmber = Math.min(EMBER_MAX, side.maxEmber + 1);
  side.ember = side.maxEmber;
  side.playsThisTurn = [];
  side.playedThisTurn = [];
  drawCards(side, state.rng, 1, HAND_MAX);
}

/** End the current turn and hand the table to the other duelist. */
export function endTurn(state) {
  if (state.screen !== 'play' || state.paused) return false;
  if (state.turn === 'player') {
    state.turn = 'rook';
    beginTurn(state, state.rook);
    addLog(state, 'Rook takes the table…');
    queueRookTurn(state);
  } else {
    state.turn = 'player';
    state.turnCount++;
    beginTurn(state, state.you);
    addLog(state, `Turn ${state.turnCount} — your ember grows to ${state.you.maxEmber}.`);
  }
  return true;
}

/** Plan Rook's whole turn as steps the updater plays out with pauses. */
function queueRookTurn(state) {
  const rook = state.rook;
  const realHand = rook.hand;
  const realEmber = rook.ember;
  const scratchHand = realHand.map((c) => ({ uid: c.uid, id: c.id }));
  let scratchEmber = realEmber;
  const plan = [];
  for (let guard = 0; guard < 8; guard++) {
    rook.hand = scratchHand;
    rook.ember = scratchEmber;
    const choice = rookChoose(state);
    if (choice.action === 'end') break;
    const inst = scratchHand[choice.index];
    if (!inst) break;
    const card = cardDef(inst.id);
    if (!card) break;
    if (card.type === 'strike') {
      plan.push({ kind: 'aim', cardId: card.id, text: rookIntentText(state, card) });
    }
    plan.push({ kind: 'play', cardId: card.id });
    scratchEmber -= card.cost;
    scratchHand.splice(choice.index, 1);
  }
  rook.hand = realHand;
  rook.ember = realEmber;
  state.aiQueue = plan;
  state.aiTimer = 0.55;
}

function rookPlanHand(state) {
  // Play Rook's turn instantly (screenshot autopilot): choose, play and
  // end with no timers, using the same chooser the live game uses.
  let guard = 0;
  while (guard++ < 8) {
    const choice = rookChoose(state);
    if (choice.action === 'end') break;
    playCard(state, state.rook, choice.index);
    if (state.screen !== 'play') break;
  }
  if (state.screen === 'play' && state.turn === 'rook') endTurn(state);
}

/** Rook's whole turn, instantly, for screenshots and scripted tests. */
export function rookTurnInstant(state) {
  rookPlanHand(state);
}

/**
 * Play the hand card at `index` for `side`. Returns true when the card
 * was played. Handles cost, Resonance and the win check.
 */
export function playCard(state, side, index) {
  if (state.screen !== 'play' || state.paused) return false;
  const inst = side.hand[index];
  if (!inst) return false;
  const card = cardDef(inst.id);
  if (!card || card.cost > side.ember) return false;
  side.hand.splice(index, 1);
  side.ember -= card.cost;
  state.stats.plays++;

  const resonance = side.playsThisTurn.includes(card.element);
  side.playsThisTurn.push(card.element);
  const played = { card, resonance, target: null };
  side.playedThisTurn.push(played);

  if (card.type === 'strike') applyStrike(state, side, card, played);
  else if (card.type === 'guardian') applyGuardian(state, side, card, played);
  else applyTrick(state, side, card, played);

  if (resonance) {
    state.stats.resonance++;
    state.banner = { text: `RESONANCE! ${card.element} +1` };
    state.bannerT = 2.2;
    addLog(state, `Resonance! Two ${card.element} cards — both strike +1 harder.`);
    retroResonance(state, side, played);
  }
  discardCard(side, inst);
  checkEnd(state);
  return true;
}

/** The second same-element card also strengthens the first one played. */
function retroResonance(state, side, played) {
  const earlier = side.playedThisTurn.find((p) => p !== played && p.card.element === played.card.element);
  if (!earlier) return;
  const foe = side === state.you ? state.rook : state.you;
  if (earlier.card.type === 'strike') {
    dealDamage(state, foe, RESONANCE_BONUS, earlier.target);
    addLog(state, `Resonance echoes: ${earlier.card.name} deals +1.`);
  } else if (earlier.card.type === 'guardian') {
    const g = side.guardians.find((x) => x.uid === earlier.guardianUid);
    if (g) {
      g.health += RESONANCE_BONUS;
      addLog(state, `Resonance echoes: ${earlier.card.name} gains +1 health.`);
    }
  } else {
    applyTrickBonus(state, side, earlier.card);
  }
}

function applyStrike(state, side, card, played) {
  const foe = side === state.you ? state.rook : state.you;
  const target = strikeTarget(state, foe);
  let dmg = card.power + (played.resonance ? RESONANCE_BONUS : 0);
  if (target && beatsElement(card.element, target.element)) dmg += ADVANTAGE_BONUS;
  played.target = target ? 'guardian' : 'life';
  const who = side === state.you ? 'You' : 'Rook';
  if (target) {
    target.health -= dmg;
    addFx(state, 520, side === state.you ? 250 : 470, `-${dmg}`, '#ffd34d');
    addLog(state, `${who} strike ${card.name} for ${dmg} on ${target.name} (${target.health} left).`);
    if (target.health <= 0) {
      foe.guardians = foe.guardians.filter((g) => g !== target);
      addLog(state, `${target.name} shatters!`);
    } else if (target.power > 0) {
      // A standing guardian hits back for its power.
      side.life -= target.power;
      addFx(state, 520, side === state.you ? 470 : 250, `-${target.power}`, '#ff6a5e');
      addLog(state, `${target.name} hits back for ${target.power}.`);
    }
  } else {
    foe.life -= dmg;
    addFx(state, 520, side === state.you ? 250 : 470, `-${dmg}`, '#ff6a5e');
    addLog(state, `${who} strike ${card.name} for ${dmg} to the Life.`);
  }
}

function applyGuardian(state, side, card, played) {
  const guardian = {
    uid: card.id + '-' + side.guardians.length + '-' + state.stats.plays,
    id: card.id,
    name: card.name,
    element: card.element,
    power: card.power,
    health: card.health + (played.resonance ? RESONANCE_BONUS : 0),
  };
  played.guardianUid = guardian.uid;
  side.guardians.push(guardian);
  const who = side === state.you ? 'You summon' : 'Rook summons';
  addLog(state, `${who} ${card.name} (${guardian.health} health).`);
}

function applyTrick(state, side, card, played) {
  const foe = side === state.you ? state.rook : state.you;
  const who = side === state.you ? 'You cast' : 'Rook casts';
  const bonus = played.resonance ? RESONANCE_BONUS : 0;
  if (card.effect === 'draw2') {
    const n = drawCards(side, state.rng, 2 + bonus, HAND_MAX);
    addLog(state, `${who} ${card.name} — draw ${n}.`);
  } else if (card.effect === 'steal') {
    const stolen = Math.min(1 + bonus, foe.ember);
    foe.ember -= stolen;
    side.ember = Math.min(side.maxEmber, side.ember + stolen);
    addLog(state, `${who} ${card.name} — steal ${stolen} ember.`);
  } else if (card.effect === 'heal3') {
    side.life = Math.min(START_LIFE, side.life + 3 + bonus);
    addLog(state, `${who} ${card.name} — restore ${3 + bonus} Life.`);
  } else if (card.effect === 'draw-ember') {
    drawCards(side, state.rng, 1 + bonus, HAND_MAX);
    side.ember = Math.min(side.maxEmber, side.ember + 1 + bonus);
    addLog(state, `${who} ${card.name} — draw 1, gain ${1 + bonus} ember.`);
  }
}

/** A Trick's +1 when it is the earlier card of a Resonance pair. */
function applyTrickBonus(state, side, card) {
  if (card.effect === 'heal3') {
    side.life = Math.min(START_LIFE, side.life + 1);
    addLog(state, `Resonance echoes: ${card.name} heals +1.`);
  } else if (card.effect === 'draw2' || card.effect === 'draw-ember') {
    drawCards(side, state.rng, 1, HAND_MAX);
    addLog(state, `Resonance echoes: ${card.name} draws +1.`);
  }
}

/** Deal plain damage to a side's guardians-first target (resonance echo). */
function dealDamage(state, foe, amount, targetKind) {
  if (targetKind === 'guardian' && foe.guardians.length > 0) {
    const target = strikeTarget(state, foe);
    target.health -= amount;
    if (target.health <= 0) foe.guardians = foe.guardians.filter((g) => g !== target);
  } else {
    foe.life -= amount;
  }
}

/** Score a finished duel: surviving Life, speed and Resonance all count. */
function computeScore(state) {
  return (
    state.you.life * 100 +
    Math.max(0, 25 - state.turnCount) * 20 +
    state.stats.resonance * 75 +
    state.stats.plays * 5
  );
}

/** Spawn the victory confetti from the seeded rng (deterministic shots). */
function spawnConfetti(state) {
  const colors = ['#e2483d', '#58a34b', '#3d7de2', '#ffd34d', '#ff9a8a', '#ffffff'];
  state.particles = [];
  for (let i = 0; i < 90; i++) {
    state.particles.push({
      x: 120 + state.rng() * 1040,
      y: -20 - state.rng() * 160,
      vx: (state.rng() - 0.5) * 60,
      vy: 90 + state.rng() * 120,
      size: 5 + state.rng() * 7,
      color: colors[randInt(state.rng, colors.length)],
      rot: state.rng() * Math.PI,
      vr: (state.rng() - 0.5) * 6,
    });
  }
}

/** Decide whether the duel is over and settle the screen and score. */
function checkEnd(state) {
  if (state.screen !== 'play') return;
  if (state.rook.life <= 0 && state.you.life <= 0) {
    state.rook.life = 0;
    state.you.life = 0;
    state.winner = 'draw';
    state.screen = 'win';
    state.score = computeScore(state);
  } else if (state.rook.life <= 0) {
    state.rook.life = 0;
    state.winner = 'you';
    state.screen = 'win';
    state.score = computeScore(state);
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.score);
    }
    spawnConfetti(state);
    addLog(state, 'Victory! The pact is yours.');
  } else if (state.you.life <= 0) {
    state.you.life = 0;
    state.winner = 'rook';
    state.screen = 'loss';
    state.score = computeScore(state);
    addLog(state, 'Defeat. Rook keeps the embers.');
  }
}

/**
 * Advance timers, floating numbers, confetti and Rook's queued steps.
 * Called with real frame time in play and with fixed 16 ms steps by the
 * screenshot stager, which is what keeps the shots deterministic.
 */
export function update(state, dt) {
  if (state.bannerT > 0) {
    state.bannerT -= dt;
    if (state.bannerT <= 0) state.banner = null;
  }
  for (const f of state.fx) f.t += dt;
  state.fx = state.fx.filter((f) => f.t < f.life);
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.y > 740) {
      p.y = -20;
      p.x = 120 + state.rng() * 1040;
    }
  }
  if (state.screen !== 'play' || state.paused || state.turn !== 'rook') return;
  if (state.aim) {
    state.aimT -= dt;
    if (state.aimT <= 0) state.aim = null;
    return;
  }
  if (state.aiQueue.length === 0) {
    endTurn(state);
    return;
  }
  state.aiTimer -= dt;
  if (state.aiTimer > 0) return;
  const step = state.aiQueue.shift();
  if (step.kind === 'aim') {
    state.aim = { index: step.index, text: step.text };
    state.aimT = 1.0;
    state.aiTimer = 0;
    return;
  }
  // Play the planned card by id: the live hand may have shifted since
  // planning, so find it rather than trusting the old index.
  const idx = state.rook.hand.findIndex((c) => c.id === step.cardId);
  if (idx >= 0) playCard(state, state.rook, idx);
  state.aiTimer = 0.55;
}

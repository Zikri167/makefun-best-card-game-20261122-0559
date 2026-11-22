// Ember Pact — match state machine: title / play / win / loss, turns,
// ember, combat, Resonance, and the v2 Elemental Charge rule. Rook's
// turn runs on timers inside update() so the table stays readable: a
// thinking beat, a taunt, a telegraph, then the hit (or a Ward fizzle).

import {
  START_LIFE, HAND_SIZE, MAX_EMBER, MAX_CHARGE, RESONANCE_BONUS,
  POWER_BONUS, losesTo, beats,
} from './config.js';
import { makeRng } from './random.js';
import { makeGuardian } from './cards.js';
import { newPile, drawFrom, discardTo } from './deck.js';
import { planRookTurn, pickTaunt, rookWantsPower } from './ai.js';
import { sfx, setMuted } from './audio.js';

function newSide(rng) {
  return {
    life: START_LIFE,
    ember: 1,
    maxEmber: 1,
    hand: [],
    guardians: [],
    charge: 0,
    lastElement: null,
    powerArmed: false,
    wardArmed: false,
    pile: newPile(rng),
  };
}

export function createWorld(seed) {
  const state = {
    phase: 'title',
    seed: seed || 7,
    rng: makeRng(seed || 7),
    turn: 'player',
    turnNum: 1,
    player: null,
    rook: null,
    played: { player: {}, rook: {} },
    resonance: { player: false, rook: false },
    log: [],
    floaters: [],
    message: '',
    messageTtl: 0,
    rookThinking: 0,
    rookTaunt: null,
    rookAim: null,
    pendingStrike: null,
    pendingRookStrike: null,
    rookQueue: [],
    rookTimer: 0,
    paused: false,
    muted: false,
    winner: null,
    score: 0,
    best: 0,
    confetti: [],
    cardsPlayed: 0,
    damageDealt: 0,
    reshuffles: 0,
  };
  try {
    state.best = Number(window.localStorage.getItem('ember-pact-best') || 0) || 0;
  } catch { state.best = 0; }

  function log(line) {
    state.log.unshift(line);
    if (state.log.length > 6) state.log.length = 6;
  }

  function floater(text, x, y) {
    state.floaters.push({ text, x, y, ttl: 1.6 });
  }

  function announce(text) {
    state.message = text;
    state.messageTtl = 2.2;
  }

  function startGame(newSeed) {
    const sd = newSeed || state.seed;
    state.seed = sd;
    state.rng = makeRng(sd);
    state.phase = 'play';
    state.turn = 'player';
    state.turnNum = 1;
    state.player = newSide(state.rng);
    state.rook = newSide(state.rng);
    state.played = { player: {}, rook: {} };
    state.resonance = { player: false, rook: false };
    state.log = [];
    state.floaters = [];
    state.message = '';
    state.messageTtl = 0;
    state.rookThinking = 0;
    state.rookTaunt = null;
    state.rookAim = null;
    state.pendingStrike = null;
    state.pendingRookStrike = null;
    state.rookQueue = [];
    state.rookTimer = 0;
    state.paused = false;
    state.winner = null;
    state.score = 0;
    state.confetti = [];
    state.cardsPlayed = 0;
    state.damageDealt = 0;
    state.reshuffles = 0;
    state.player.hand = drawFrom(state.player.pile, state.rng, HAND_SIZE);
    state.rook.hand = drawFrom(state.rook.pile, state.rng, HAND_SIZE);
    log('The pact is sealed. Your move, ember-bearer.');
  }

  function drawFor(side, n) {
    const s = side === 'player' ? state.player : state.rook;
    const before = s.pile.drawPile.length;
    const drawn = drawFrom(s.pile, state.rng, n);
    if (s.pile.drawPile.length === 0 && s.pile.discardPile.length > 0) state.reshuffles++;
    s.hand.push(...drawn);
    return drawn;
  }

  function checkEnd() {
    if (state.phase !== 'play') return true;
    if (state.rook.life <= 0) {
      state.rook.life = 0;
      state.phase = 'win';
      state.winner = 'player';
      state.score = state.player.life * 100 + state.cardsPlayed * 15 + state.turnNum * 10;
      if (state.score > state.best) {
        state.best = state.score;
        try { window.localStorage.setItem('ember-pact-best', String(state.best)); } catch { /* ignore */ }
      }
      state.confetti = Array.from({ length: 90 }, () => ({
        x: state.rng() * 1280, y: -20 - state.rng() * 200,
        v: 60 + state.rng() * 140, c: ['#e2482a', '#3f9e4d', '#2f7fd0', '#f2c14e'][Math.floor(state.rng() * 4)],
        s: 5 + state.rng() * 7, r: state.rng() * Math.PI,
      }));
      log('Victory! Rook is broken.');
      sfx.win();
      return true;
    }
    if (state.player.life <= 0) {
      state.player.life = 0;
      state.phase = 'loss';
      state.winner = 'rook';
      state.score = state.cardsPlayed * 15 + state.turnNum * 10;
      log('Defeat. Rook takes the pact.');
      sfx.lose();
      return true;
    }
    return false;
  }

  // Deal damage to a side: guardians soak first when no explicit target.
  function dealDamage(targetSide, amount, source) {
    const target = targetSide === 'player' ? state.player : state.rook;
    if (target.guardians.length > 0) {
      let gi = 0;
      for (let i = 1; i < target.guardians.length; i++) {
        if (target.guardians[i].health < target.guardians[gi].health) gi = i;
      }
      const g = target.guardians[gi];
      g.health -= amount;
      log(`${source} hits ${g.name} for ${amount}.`);
      if (g.health <= 0) {
        target.guardians.splice(gi, 1);
        log(`${g.name} shatters!`);
      }
      sfx.hit();
      return { hit: 'guardian', killed: g.health <= 0 };
    }
    target.life = Math.max(0, target.life - amount);
    if (targetSide === 'rook') state.damageDealt += amount;
    log(`${source} hits ${targetSide === 'rook' ? 'Rook' : 'you'} for ${amount}.`);
    sfx.hit();
    return { hit: 'life', killed: target.life <= 0 };
  }

  // Deal damage to one chosen target (player strikes only).
  function dealDamageTo(targetSide, kind, index, amount, source) {
    const target = targetSide === 'player' ? state.player : state.rook;
    if (kind === 'guardian') {
      const g = target.guardians[index];
      if (!g) return false;
      g.health -= amount;
      log(`${source} hits ${g.name} for ${amount}.`);
      if (g.health <= 0) {
        target.guardians.splice(index, 1);
        log(`${g.name} shatters!`);
      }
      sfx.hit();
      return true;
    }
    target.life = Math.max(0, target.life - amount);
    if (targetSide === 'rook') state.damageDealt += amount;
    log(`${source} hits ${targetSide === 'rook' ? 'Rook' : 'you'} for ${amount}.`);
    sfx.hit();
    return true;
  }

  function applyTrick(side, card) {
    const me = side === 'player' ? state.player : state.rook;
    const foe = side === 'player' ? state.rook : state.player;
    const who = side === 'player' ? 'You' : 'Rook';
    if (card.effect === 'draw2') {
      drawFor(side, 2);
      log(`${who} draw 2 cards.`);
    } else if (card.effect === 'steal') {
      if (foe.ember > 0) { foe.ember--; me.ember = Math.min(me.maxEmber, me.ember + 1); }
      log(`${who} steal 1 ember.`);
    } else if (card.effect === 'heal') {
      me.life = Math.min(START_LIFE, me.life + 3);
      log(`${who} heal 3 Life.`);
    } else if (card.effect === 'drawEmber') {
      drawFor(side, 1);
      me.ember = Math.min(me.maxEmber, me.ember + 1);
      log(`${who} draw 1 card, +1 ember.`);
    }
  }

  function strikePower(side, card) {
    const me = side === 'player' ? state.player : state.rook;
    let power = card.power;
    if (state.resonance[side]) power += RESONANCE_BONUS;
    const foe = side === 'player' ? state.rook : state.player;
    if (foe.lastElement && beats(card.element, foe.lastElement)) power += 2; // elemental advantage
    return power;
  }

  function playCardInternal(side, handIndex) {
    const me = side === 'player' ? state.player : state.rook;
    const foe = side === 'player' ? state.rook : state.player;
    const card = me.hand[handIndex];
    if (!card || card.cost > me.ember) return null;
    me.hand.splice(handIndex, 1);
    me.ember -= card.cost;
    state.cardsPlayed++;

    // Elemental Charge: playing into the wind (your element loses to the
    // foe's last played element) earns +1 Charge, max 3.
    if (losesTo(card.element, foe.lastElement)) {
      if (me.charge < MAX_CHARGE) {
        me.charge++;
        const msg = side === 'player'
          ? 'CHARGE +1 — played into the wind!'
          : 'Rook gains Charge — played into the wind!';
        announce(msg);
        floater('CHARGE +1', side === 'player' ? 640 : 640, side === 'player' ? 500 : 160);
        log(msg);
        sfx.charge();
      }
    }
    me.lastElement = card.element;

    // Resonance: second card of one element in a turn powers the turn up.
    const counts = state.played[side];
    counts[card.element] = (counts[card.element] || 0) + 1;
    if (counts[card.element] >= 2 && !state.resonance[side]) {
      state.resonance[side] = true;
      log(`${side === 'player' ? 'You' : 'Rook'} trigger RESONANCE! +1 power.`);
      sfx.resonance();
    }

    if (card.type === 'guardian') {
      me.guardians.push(makeGuardian(card));
      log(`${side === 'player' ? 'You summon' : 'Rook summons'} ${card.name}.`);
      discardTo(me.pile, card);
      sfx.play();
      return { card, kind: 'guardian' };
    }
    if (card.type === 'trick') {
      applyTrick(side, card);
      discardTo(me.pile, card);
      sfx.play();
      return { card, kind: 'trick' };
    }
    // Strike: compute power, spend POWER if armed / if Rook wants it.
    let power = strikePower(side, card);
    if (side === 'player' && me.powerArmed) {
      power += POWER_BONUS;
      me.powerArmed = false;
      log('POWER spent: +2 on this strike.');
    }
    if (side === 'rook' && rookWantsPower(state, card, power)) {
      power += POWER_BONUS;
      me.charge--;
      log('Rook spends Charge: +2 POWER!');
    }
    discardTo(me.pile, card);
    sfx.play();
    return { card, kind: 'strike', power };
  }

  // Player plays a hand card. Strikes wait for a target click.
  function playCard(handIndex) {
    if (state.phase !== 'play' || state.turn !== 'player' || state.paused) return false;
    if (state.pendingStrike) return false;
    const result = playCardInternal('player', handIndex);
    if (!result) return false;
    if (result.kind === 'strike') {
      state.pendingStrike = { card: result.card, power: result.power };
      announce('Choose a target — click a Guardian or Rook.');
    }
    checkEnd();
    return true;
  }

  function resolveStrike(kind, index) {
    if (!state.pendingStrike) return false;
    const { card, power } = state.pendingStrike;
    if (kind === 'life' && state.rook.guardians.length > 0) {
      log('A Guardian blocks the way — strike it first!');
      announce('Guardian blocks! Strike a Guardian.');
      return false;
    }
    state.pendingStrike = null;
    dealDamageTo('rook', kind, index, power, card.name);
    checkEnd();
    return true;
  }

  function usePower() {
    if (state.phase !== 'play' || state.turn !== 'player' || state.paused) return false;
    const me = state.player;
    if (me.charge < 1 || me.powerArmed) return false;
    me.charge--;
    me.powerArmed = true;
    log('POWER armed: your next card gets +2.');
    announce('POWER armed — next card +2!');
    sfx.charge();
    return true;
  }

  function useWard() {
    if (state.phase !== 'play' || state.turn !== 'player' || state.paused) return false;
    const me = state.player;
    if (me.charge < 1 || me.wardArmed) return false;
    me.charge--;
    me.wardArmed = true;
    log('WARD armed: Rook\u2019s next telegraphed strike will fizzle.');
    announce('WARD armed — next Rook strike fizzles!');
    sfx.ward();
    return true;
  }

  function endTurn() {
    if (state.phase !== 'play' || state.turn !== 'player' || state.paused) return false;
    if (state.pendingStrike) return false;
    state.player.powerArmed = false;
    state.turn = 'rook';
    state.played.rook = {};
    state.resonance.rook = false;
    const rook = state.rook;
    rook.maxEmber = Math.min(MAX_EMBER, rook.maxEmber + 1);
    rook.ember = rook.maxEmber;
    drawFor('rook', 1);
    log('Rook takes the turn...');
    state.rookThinking = 0.8; // thinking beat before Rook acts
    state.rookQueue = [];
    state.rookTimer = 0;
    return true;
  }

  function startPlayerTurn() {
    state.turn = 'player';
    state.turnNum++;
    state.played.player = {};
    state.resonance.player = false;
    const p = state.player;
    p.maxEmber = Math.min(MAX_EMBER, p.maxEmber + 1);
    p.ember = p.maxEmber;
    drawFor('player', 1);
    log(`Turn ${state.turnNum} — your move. Ember ${p.ember}/${p.maxEmber}.`);
  }

  function rookPlayNext() {
    if (state.rookQueue.length === 0) {
      startPlayerTurn();
      return;
    }
    const uid = state.rookQueue.shift();
    const idx = state.rook.hand.findIndex((c) => c.uid === uid);
    if (idx === -1) { state.rookTimer = 0.3; return; }
    const card = state.rook.hand[idx];
    // Thinking beat + taunt + charging glow before the card lands.
    state.rookThinking = 0.45;
    state.rookTaunt = { text: pickTaunt(state.rng, card.element), ttl: 1.5 };
    const result = playCardInternal('rook', idx);
    if (!result) { state.rookTimer = 0.3; return; }
    if (result.kind === 'strike') {
      // Telegraph: show the aim for a full second before it lands.
      const target = state.player.guardians.length > 0 ? 'guardian' : 'life';
      state.pendingRookStrike = { card: result.card, power: result.power };
      state.rookAim = { kind: target, index: 0, ttl: 1.0, damage: result.power };
      log(`Rook aims ${result.card.name} (${result.power})...`);
    } else {
      state.rookTimer = 0.9;
    }
    checkEnd();
  }

  function resolveRookStrike() {
    const strike = state.pendingRookStrike;
    const aim = state.rookAim;
    state.pendingRookStrike = null;
    state.rookAim = null;
    if (!strike) return;
    if (state.player.wardArmed) {
      state.player.wardArmed = false;
      log(`WARD! Rook\u2019s ${strike.card.name} fizzles — no damage.`);
      announce('WARD! Rook\u2019s strike fizzles!');
      sfx.ward();
    } else if (aim && aim.kind === 'guardian') {
      dealDamageTo('player', 'guardian', 0, strike.power, strike.card.name);
    } else {
      dealDamageTo('player', 'life', 0, strike.power, strike.card.name);
    }
    state.rookTimer = 0.9;
    checkEnd();
  }

  function update(dt) {
    if (state.paused) return;
    if (state.messageTtl > 0) state.messageTtl -= dt;
    if (state.rookTaunt) {
      state.rookTaunt.ttl -= dt;
      if (state.rookTaunt.ttl <= 0) state.rookTaunt = null;
    }
    for (const f of state.floaters) { f.ttl -= dt; f.y -= dt * 24; }
    state.floaters = state.floaters.filter((f) => f.ttl > 0);
    if (state.phase === 'win') {
      for (const c of state.confetti) {
        c.y += c.v * dt;
        c.r += dt * 2;
        if (c.y > 740) { c.y = -20; c.x = state.rng() * 1280; }
      }
    }
    if (state.phase !== 'play' || state.turn !== 'rook') return;
    if (state.rookAim) {
      state.rookAim.ttl -= dt;
      if (state.rookAim.ttl <= 0) resolveRookStrike();
      return;
    }
    if (state.rookThinking > 0) {
      state.rookThinking -= dt;
      if (state.rookThinking <= 0) {
        if (state.rookQueue.length === 0 && state.rookTimer === 0) {
          state.rookQueue = planRookTurn(state).map((i) => state.rook.hand[i].uid);
          state.rookTimer = 0.2;
        } else if (state.rookQueue.length === 0) {
          startPlayerTurn();
        }
      }
      return;
    }
    if (state.rookTimer > 0) {
      state.rookTimer -= dt;
      if (state.rookTimer <= 0) rookPlayNext();
    }
  }

  function togglePause() {
    if (state.phase === 'play') state.paused = !state.paused;
  }

  function toggleMute() {
    state.muted = !state.muted;
    setMuted(state.muted);
  }

  startGame(state.seed);

  return {
    state,
    startGame,
    playCard,
    resolveStrike,
    endTurn,
    usePower,
    useWard,
    update,
    togglePause,
    toggleMute,
    log,
  };
}

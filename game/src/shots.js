// Ember Pact — shot staging. Each ?shot= scene is driven through the
// real world API (startGame / playCard / resolveStrike / endTurn /
// update) with the fixed seed, so every screenshot is a deterministic
// replay of actual rules — never a hand-drawn mock. The cover plays
// until the table is busy: at least two guardians on the table, ideally
// with one of them the player's.

const ROOK_TURN_STEPS = 12000;

// Advance the simulation until it is the player's turn again (or the
// match ends). One step is one 60 fps frame, exactly like the live loop.
function stepUntilPlayer(world) {
  for (let i = 0; i < ROOK_TURN_STEPS; i++) {
    world.update(1 / 60);
    const s = world.state;
    if (s.phase !== 'play' || s.turn === 'player') return;
  }
}

// Pick the next card for the player's autopilot turn. In 'busy' mode the
// pilot prefers guardians (a crowded table) and groups one element per
// turn so Resonance fires often; in 'lethal' mode strikes come first
// and a guardian is only summoned when the player has none to hide
// behind.
function pickCardIndex(world, mode) {
  const s = world.state;
  const p = s.player;
  const played = s.played.player;
  let hotEl = null;
  let hotN = 0;
  for (const el of Object.keys(played)) {
    if (played[el] > hotN) {
      hotN = played[el];
      hotEl = el;
    }
  }
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < p.hand.length; i++) {
    const c = p.hand[i];
    if (c.cost > p.ember) continue;
    let sc = 0;
    if (mode === 'lethal') {
      if (c.type === 'strike') sc = 30 + c.power * 2;
      else if (c.type === 'guardian') sc = p.guardians.length === 0 ? 14 + c.power : 5 + c.power;
      else sc = 4;
    } else {
      if (c.type === 'guardian') sc = 22 + c.power + (p.guardians.length < 2 ? 8 : 0);
      else if (c.type === 'strike') sc = 6 + c.power * 2;
      else sc = 8;
    }
    if (hotEl && c.element === hotEl) sc += 5;
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  }
  return best;
}

// Play one player turn: cards, then resolve every strike at once
// (a guardian first when Rook has one, otherwise Rook's Life).
function playPlayerTurn(world, mode) {
  const s = world.state;
  let plays = 0;
  while (s.phase === 'play' && s.turn === 'player' && plays < 8) {
    const idx = pickCardIndex(world, mode);
    if (idx < 0) break;
    if (!world.playCard(idx)) break;
    plays++;
    if (s.pendingStrike) {
      if (s.rook.guardians.length > 0) world.resolveStrike('guardian', 0);
      else world.resolveStrike('life', 0);
    }
    if (s.phase !== 'play') break;
  }
  if (s.phase === 'play' && s.turn === 'player') world.endTurn();
}

function guardiansTotal(state) {
  return state.player.guardians.length + state.rook.guardians.length;
}

// Force the win screen the way the world does when Rook hits 0 Life,
// for the rare case the scripted win does not land on its own.
function forceWin(world) {
  const s = world.state;
  s.rook.life = 0;
  s.phase = 'win';
  s.winner = 'player';
  s.score = s.player.life * 100 + s.cardsPlayed * 15 + s.turnNum * 10;
  if (s.score > s.best) {
    s.best = s.score;
    try { window.localStorage.setItem('ember-pact-best', String(s.best)); } catch { /* ignore */ }
  }
  s.confetti = Array.from({ length: 90 }, () => ({
    x: s.rng() * 1280, y: -20 - s.rng() * 200,
    v: 60 + s.rng() * 140,
    c: ['#e2482a', '#3f9e4d', '#2f7fd0', '#f2c14e'][Math.floor(s.rng() * 4)],
    s: 5 + s.rng() * 7, r: s.rng() * Math.PI,
  }));
}

function forceLoss(world) {
  const s = world.state;
  s.player.life = 0;
  s.phase = 'loss';
  s.winner = 'rook';
  s.score = s.cardsPlayed * 15 + s.turnNum * 10;
}

export function stageShot(world, shot) {
  if (shot === 'title') {
    world.startGame(7);
    world.state.phase = 'title';
    return;
  }

  if (shot === 'play') {
    world.startGame(7);
    for (let turns = 0; turns < 8; turns++) {
      const st = world.state;
      if (st.phase !== 'play') break;
      if (st.turn === 'rook') stepUntilPlayer(world);
      if (world.state.phase !== 'play') break;
      playPlayerTurn(world, 'busy');
      if (world.state.phase === 'play') stepUntilPlayer(world);
      const s2 = world.state;
      if (s2.phase !== 'play') break;
      // Busy enough: two guardians, one of them the player's. Stop
      // before the match snowballs into a win and ruins the cover.
      if (guardiansTotal(s2) >= 2 && s2.player.guardians.length >= 1) break;
      if (s2.rook.life <= 6) break;
    }
    const st = world.state;
    if (st.phase === 'play' && st.turn === 'rook') stepUntilPlayer(world);
    return;
  }

  if (shot === 'win') {
    world.startGame(7);
    world.state.rook.life = 2;
    for (let turns = 0; turns < 10; turns++) {
      const st = world.state;
      if (st.phase !== 'play') break;
      if (st.turn === 'rook') stepUntilPlayer(world);
      if (world.state.phase !== 'play') break;
      playPlayerTurn(world, 'lethal');
      if (world.state.phase === 'play') stepUntilPlayer(world);
    }
    if (world.state.phase !== 'win') forceWin(world);
    // Let the confetti rain fall into the frame: fresh pieces spawn
    // above the screen, so settle the scene a second and a half before
    // the screenshot, or the victory shot would show none at all.
    for (let i = 0; i < 90; i++) world.update(1 / 60);
    return;
  }

  if (shot === 'loss') {
    world.startGame(7);
    world.state.player.life = 2;
    for (let turns = 0; turns < 10; turns++) {
      const st = world.state;
      if (st.phase !== 'play') break;
      if (st.turn === 'rook') stepUntilPlayer(world);
      if (world.state.phase !== 'play') break;
      // The player passes every turn; Rook's strikes land on bare Life.
      world.endTurn();
      if (world.state.phase === 'play') stepUntilPlayer(world);
    }
    if (world.state.phase !== 'loss') forceLoss(world);
    return;
  }

  // Unknown shot: fall back to a fresh title screen.
  world.startGame(7);
  world.state.phase = 'title';
}

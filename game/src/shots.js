// Ember Pact — deterministic screenshot staging. Each shot builds its
// scene from the real rules (real cards, real state fields) with a fixed
// seed, so the four screenshots are reproducible and show the actual game,
// never a composite. The cover shot is a rich mid-game table: Charge pips,
// the legend, and the compact Resonance badge all visible.

import { CARD_DEFS, makeCard, makeGuardian } from './cards.js';

function defByName(name) {
  return CARD_DEFS.find((d) => d.name === name);
}

function handOf(names) {
  return names.map((n) => makeCard(defByName(n)));
}

// Stage one named scene on a live world. Called before the first frame.
export function stageShot(world, name) {
  const s = world.state;
  if (name === 'title') {
    s.phase = 'title';
    return;
  }
  if (name === 'win') {
    world.startGame(11);
    s.phase = 'win';
    s.winner = 'player';
    s.rook.life = 0;
    s.player.life = 12;
    s.score = 12 * 100 + 14 * 15 + 9 * 10;
    s.cardsPlayed = 14;
    s.turnNum = 9;
    s.confetti = Array.from({ length: 90 }, (_, i) => ({
      x: (i * 137) % 1280, y: (i * 53) % 500,
      v: 80, c: ['#e2482a', '#3f9e4d', '#2f7fd0', '#f2c14e'][i % 4],
      s: 6 + (i % 5), r: i * 0.7,
    }));
    return;
  }
  if (name === 'loss') {
    world.startGame(13);
    s.phase = 'loss';
    s.winner = 'rook';
    s.player.life = 0;
    s.rook.life = 9;
    s.score = 11 * 15 + 8 * 10;
    s.cardsPlayed = 11;
    s.turnNum = 8;
    return;
  }
  // Default: 'play' — the cover. A busy mid-game table.
  world.startGame(7);
  s.player.life = 20;
  s.rook.life = 14;
  s.player.ember = 6;
  s.player.maxEmber = 6;
  s.rook.ember = 3;
  s.rook.maxEmber = 6;
  s.turnNum = 6;
  s.player.hand = handOf(['Flame Lash', 'Tide Splash', 'Thorn Whip', 'Deep Draw', 'Pyre Hound']);
  s.rook.hand = handOf(['Ember Spark', 'Thorn Whip', 'Tide Splash', 'Ash Draw', 'Bramble Wall']);
  s.player.guardians = [makeGuardian(makeCard(defByName('Bramble Wall')))];
  s.rook.guardians = [makeGuardian(makeCard(defByName('Wave Guard')))];
  s.player.charge = 2;
  s.rook.charge = 1;
  s.player.lastElement = 'thorn';
  s.rook.lastElement = 'flame';
  s.played.player = { thorn: 2 };
  s.played.rook = { flame: 1 };
  s.resonance.player = true;
  s.message = 'CHARGE +1 — played into the wind!';
  s.messageTtl = 99;
  s.rookTaunt = { text: 'Rook: "My flames eat cowards first."', ttl: 99 };
  s.log = [
    'CHARGE +1 — played into the wind!',
    'You trigger RESONANCE! +1 power.',
    'Rook summons Wave Guard.',
    'Flame Lash hits Wave Guard for 4.',
    'Turn 6 — your move. Ember 6/6.',
  ];
}

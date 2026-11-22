// Ember Pact — all canvas drawing: the wooden table, both hands, guardians,
// life bars, Charge pips, POWER/WARD buttons, the always-on legend, the
// compact Resonance badge, taunts, telegraphs, and the title/win/loss
// screens. Rect helpers are exported so input clicks land on what is drawn.

import {
  W, H, LAYOUT, ELEMENT_COLOR, ELEMENT_DARK, ELEMENT_GLYPH, ELEMENT_NAME,
  START_LIFE, MAX_CHARGE,
} from './config.js';

export function handCardRect(i, n) {
  const total = n * LAYOUT.handCardW + (n - 1) * LAYOUT.handGap;
  const x = (W - total) / 2 + i * (LAYOUT.handCardW + LAYOUT.handGap);
  return { x, y: LAYOUT.handY, w: LAYOUT.handCardW, h: LAYOUT.handCardH };
}

export function rookGuardianRect(i, n) {
  const total = n * LAYOUT.guardW + (n - 1) * 10;
  const x = (W - total) / 2 + i * (LAYOUT.guardW + 10);
  return { x, y: LAYOUT.rookGuardY, w: LAYOUT.guardW, h: LAYOUT.guardH };
}

export function playerGuardianRect(i, n) {
  const total = n * LAYOUT.guardW + (n - 1) * 10;
  const x = (W - total) / 2 + i * (LAYOUT.guardW + 10);
  return { x, y: LAYOUT.playerGuardY, w: LAYOUT.guardW, h: LAYOUT.guardH };
}

export function rookLifeRect() {
  return { x: 24, y: 52, w: 220, h: 22 };
}

export function playerLifeRect() {
  return { x: 24, y: 586, w: 220, h: 22 };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align, weight) {
  ctx.fillStyle = color || '#fff';
  ctx.font = `${weight || 'bold'} ${size}px sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function drawTable(ctx) {
  ctx.fillStyle = '#3a2417';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1e5c38';
  rr(ctx, 14, 14, W - 28, H - 28, 26);
  ctx.fill();
  ctx.strokeStyle = '#c9a35c';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(201,163,92,0.35)';
  ctx.lineWidth = 1;
  rr(ctx, 30, 30, W - 60, H - 60, 18);
  ctx.stroke();
}

function drawCardFace(ctx, x, y, w, h, card, opts) {
  const o = opts || {};
  const col = ELEMENT_COLOR[card.element];
  const dark = ELEMENT_DARK[card.element];
  ctx.save();
  if (o.glow) {
    ctx.shadowColor = '#ffd94e';
    ctx.shadowBlur = 22;
  }
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#f7f0dd';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = o.selected ? 4 : 2;
  ctx.strokeStyle = o.selected ? '#ffd94e' : dark;
  ctx.stroke();
  // Element header band.
  rr(ctx, x + 4, y + 4, w - 8, 30, 7);
  ctx.fillStyle = col;
  ctx.fill();
  text(ctx, ELEMENT_NAME[card.element].toUpperCase(), x + w / 2, y + 20, 13, '#fff', 'center');
  // Cost orb.
  ctx.beginPath();
  ctx.arc(x + 20, y + 52, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#2b4a8f';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, String(card.cost), x + 20, y + 53, 15, '#fff', 'center');
  // Big element glyph.
  text(ctx, ELEMENT_GLYPH[card.element], x + w / 2, y + 78, 40, col, 'center');
  // Name + type.
  text(ctx, card.name, x + w / 2, y + 108, 12, '#241a12', 'center');
  text(ctx, card.type.toUpperCase(), x + w / 2, y + 124, 10, '#7a6a55', 'center');
  ctx.restore();
}

function drawHandCard(ctx, card, rect, opts) {
  drawCardFace(ctx, rect.x, rect.y, rect.w, rect.h, card, opts);
  const o = opts || {};
  if (card.type === 'strike') {
    text(ctx, `⚔ ${card.power}`, rect.x + rect.w - 10, rect.y + rect.h - 12, 15, '#a11f10', 'right');
  } else if (card.type === 'guardian') {
    text(ctx, `♥ ${card.power + 3}`, rect.x + rect.w - 10, rect.y + rect.h - 12, 15, '#1d5c28', 'right');
  } else {
    text(ctx, card.text, rect.x + 8, rect.y + rect.h - 12, 9, '#5a4a35', 'left');
  }
  if (o.dim) {
    ctx.fillStyle = 'rgba(20,20,20,0.45)';
    rr(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();
  }
}

function drawCardBack(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#5c2a1a';
  ctx.fill();
  ctx.strokeStyle = '#c9a35c';
  ctx.lineWidth = 2;
  ctx.stroke();
  rr(ctx, x + 6, y + 6, w - 12, h - 12, 5);
  ctx.strokeStyle = '#e2482a';
  ctx.stroke();
  text(ctx, '✦', x + w / 2, y + h / 2, 26, '#f2c14e', 'center');
}

function drawLifeBar(ctx, x, y, w, h, life, label) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  const frac = Math.max(0, life / START_LIFE);
  if (frac > 0) {
    rr(ctx, x + 2, y + 2, (w - 4) * frac, h - 4, 6);
    ctx.fillStyle = frac > 0.5 ? '#e2482a' : frac > 0.25 ? '#e07b2a' : '#c0392b';
    ctx.fill();
  }
  text(ctx, `${label}  ♥ ${life}`, x + w / 2, y + h / 2, 13, '#fff', 'center');
}

function drawChargePips(ctx, x, y, charge, label) {
  text(ctx, label, x, y, 12, '#f2c14e', 'left');
  for (let i = 0; i < MAX_CHARGE; i++) {
    ctx.beginPath();
    ctx.arc(x + 62 + i * 22, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < charge ? '#f2c14e' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#c9a35c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (i < charge) text(ctx, '⚡', x + 62 + i * 22, y + 0.5, 11, '#5c2a1a', 'center');
  }
}

function drawButton(ctx, rect, label, enabled, active) {
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fillStyle = active ? '#f2c14e' : enabled ? '#2b4a8f' : 'rgba(120,120,120,0.55)';
  ctx.fill();
  ctx.strokeStyle = active ? '#fff' : '#c9a35c';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, 14, active ? '#3a2417' : '#fff', 'center');
}

function drawGuardian(ctx, g, rect, aimed) {
  const col = ELEMENT_COLOR[g.element];
  const dark = ELEMENT_DARK[g.element];
  ctx.save();
  if (aimed) {
    ctx.shadowColor = '#ffd94e';
    ctx.shadowBlur = 24;
  }
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fillStyle = '#f7f0dd';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = aimed ? 4 : 2;
  ctx.strokeStyle = aimed ? '#ffd94e' : dark;
  ctx.stroke();
  rr(ctx, rect.x + 4, rect.y + 4, rect.w - 8, 26, 6);
  ctx.fillStyle = col;
  ctx.fill();
  text(ctx, 'GUARDIAN', rect.x + rect.w / 2, rect.y + 18, 11, '#fff', 'center');
  text(ctx, ELEMENT_GLYPH[g.element], rect.x + rect.w / 2, rect.y + 58, 34, col, 'center');
  text(ctx, g.name, rect.x + rect.w / 2, rect.y + 86, 11, '#241a12', 'center');
  rr(ctx, rect.x + 8, rect.y + rect.h - 20, rect.w - 16, 12, 5);
  ctx.fillStyle = '#ddd';
  ctx.fill();
  rr(ctx, rect.x + 8, rect.y + rect.h - 20, (rect.w - 16) * Math.max(0, g.health / g.maxHealth), 12, 5);
  ctx.fillStyle = '#3f9e4d';
  ctx.fill();
  text(ctx, `♥ ${g.health}/${g.maxHealth}`, rect.x + rect.w / 2, rect.y + rect.h - 13, 10, '#12351a', 'center');
  ctx.restore();
  if (aimed) {
    rr(ctx, rect.x - 6, rect.y - 30, rect.w + 12, 24, 6);
    ctx.fillStyle = '#ffd94e';
    ctx.fill();
    text(ctx, 'ROOK AIMS HERE', rect.x + rect.w / 2, rect.y - 17, 11, '#3a2417', 'center');
  }
}

function drawLegend(ctx, state) {
  const L = LAYOUT.legend;
  rr(ctx, L.x, L.y, L.w, L.h, 10);
  ctx.fillStyle = 'rgba(10,20,12,0.72)';
  ctx.fill();
  ctx.strokeStyle = '#c9a35c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  let y = L.y + 16;
  text(ctx, 'LEGEND', L.x + 12, y, 13, '#f2c14e', 'left');
  y += 22;
  const cycle = [['flame', 'beats'], ['thorn', 'beats'], ['tide', 'beats']];
  for (let i = 0; i < cycle.length; i++) {
    const el = cycle[i][0];
    const next = el === 'flame' ? 'thorn' : el === 'thorn' ? 'tide' : 'flame';
    text(ctx, `${ELEMENT_GLYPH[el]} ${ELEMENT_NAME[el]}`, L.x + 12, y, 13, ELEMENT_COLOR[el], 'left');
    text(ctx, '>', L.x + 92, y, 13, '#fff', 'left');
    text(ctx, ELEMENT_NAME[next], L.x + 108, y, 13, '#fff', 'left');
    y += 20;
  }
  y += 2;
  text(ctx, 'TRICKS', L.x + 12, y, 12, '#f2c14e', 'left');
  y += 18;
  const tricks = ['Draw 2 cards', 'Steal 1 ember', 'Heal 3 Life', 'Draw 1 + ember 1'];
  for (const t of tricks) {
    text(ctx, '• ' + t, L.x + 12, y, 11, '#e8e0cc', 'left');
    y += 16;
  }
  y += 2;
  text(ctx, 'CHARGE', L.x + 12, y, 12, '#f2c14e', 'left');
  y += 18;
  text(ctx, 'Play into the wind:', L.x + 12, y, 11, '#e8e0cc', 'left');
  y += 15;
  text(ctx, '+1 Charge. Spend on', L.x + 12, y, 11, '#e8e0cc', 'left');
  y += 15;
  text(ctx, 'POWER (+2) or WARD.', L.x + 12, y, 11, '#e8e0cc', 'left');
  y += 12;
  const deckN = state.player ? state.player.pile.drawPile.length : 30;
  text(ctx, `Deck: ${deckN} cards`, L.x + 12, y, 11, '#fff', 'left');
  y += 15;
  text(ctx, 'Reshuffles when empty.', L.x + 12, y, 11, '#9fb8a5', 'left');
}

function drawPlay(ctx, s) {
  const p = s.player;
  const r = s.rook;

  // Rook portrait + life + charge.
  ctx.beginPath();
  ctx.arc(64, 46, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#2c2c34';
  ctx.fill();
  ctx.strokeStyle = '#c9a35c';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, '♜', 64, 48, 30, '#f2c14e', 'center');
  text(ctx, 'ROOK', 110, 30, 16, '#fff', 'left');
  const rl = rookLifeRect();
  drawLifeBar(ctx, rl.x, rl.y, rl.w, rl.h, r.life, 'ROOK');
  drawChargePips(ctx, 110, 88, r.charge, 'CHARGE');
  if (s.rookThinking > 0 && s.turn === 'rook') {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 130);
    ctx.globalAlpha = pulse;
    text(ctx, 'Rook is thinking...', 330, 46, 15, '#ffd94e', 'left');
    ctx.globalAlpha = 1;
  }
  // Rook hand, face down.
  for (let i = 0; i < r.hand.length; i++) {
    const total = r.hand.length * LAYOUT.rookHandW + (r.hand.length - 1) * 8;
    const x = (W - total) / 2 + i * (LAYOUT.rookHandW + 8);
    drawCardBack(ctx, x, LAYOUT.rookHandY, LAYOUT.rookHandW, LAYOUT.rookHandH);
  }
  text(ctx, `Ember ${r.ember}/${r.maxEmber}`, 1080, 40, 13, '#cfe3ff', 'right');
  text(ctx, `Turn ${s.turnNum}`, 1080, 62, 13, '#cfe3ff', 'right');

  // Taunt bubble near Rook.
  if (s.rookTaunt) {
    const msg = s.rookTaunt.text;
    ctx.font = 'bold 13px sans-serif';
    const tw = ctx.measureText(msg).width + 24;
    const bx = Math.min(1020, Math.max(560, 640 - tw / 2));
    rr(ctx, bx, 122, tw, 34, 16);
    ctx.fillStyle = 'rgba(20,16,10,0.92)';
    ctx.fill();
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, msg, bx + tw / 2, 140, 13, '#ffe9a8', 'center');
  }

  // Compact Resonance badge, top-right of the table — never a big banner.
  if (s.resonance.player) {
    rr(ctx, 1064, 96, 196, 30, 15);
    ctx.fillStyle = '#f2c14e';
    ctx.fill();
    text(ctx, '✦ RESONANCE +1', 1162, 112, 13, '#3a2417', 'center');
  }

  // Guardians.
  for (let i = 0; i < r.guardians.length; i++) {
    drawGuardian(ctx, r.guardians[i], rookGuardianRect(i, r.guardians.length), false);
  }
  for (let i = 0; i < p.guardians.length; i++) {
    const aimed = !!(s.rookAim && s.rookAim.kind === 'guardian' && s.rookAim.index === i);
    drawGuardian(ctx, p.guardians[i], playerGuardianRect(i, p.guardians.length), aimed);
  }

  // Center divider + turn banner line.
  text(ctx, s.turn === 'player' ? '— YOUR TURN —' : '— ROOK\u2019S TURN —', 640, 340, 13, 'rgba(255,255,255,0.65)', 'center');
  if (s.rookAim && s.rookAim.kind === 'life') {
    const pl = playerLifeRect();
    rr(ctx, pl.x - 6, pl.y - 30, 240, 24, 6);
    ctx.fillStyle = '#ffd94e';
    ctx.fill();
    text(ctx, 'ROOK AIMS HERE', pl.x + 114, pl.y - 17, 11, '#3a2417', 'center');
  }

  // Player portrait + life + charge + buttons.
  ctx.beginPath();
  ctx.arc(64, 610, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#5c2a1a';
  ctx.fill();
  ctx.strokeStyle = '#c9a35c';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, '♥', 64, 612, 26, '#f2c14e', 'center');
  text(ctx, 'YOU', 110, 572, 16, '#fff', 'left');
  const pl = playerLifeRect();
  drawLifeBar(ctx, pl.x, pl.y, pl.w, pl.h, p.life, 'YOU');
  drawChargePips(ctx, 110, 624, p.charge, 'CHARGE');
  drawButton(ctx, LAYOUT.powerBtn, `POWER${p.powerArmed ? ' ✓' : ''} (Q)`, p.charge >= 1 && !p.powerArmed, p.powerArmed);
  drawButton(ctx, LAYOUT.wardBtn, `WARD${p.wardArmed ? ' ✓' : ''} (W)`, p.charge >= 1 && !p.wardArmed, p.wardArmed);
  if (p.charge >= 1 && !p.powerArmed && !p.wardArmed) {
    text(ctx, 'Charge ready!', 248, 674, 11, '#f2c14e', 'left');
  }
  text(ctx, `Ember ${p.ember}/${p.maxEmber}`, 260, 600, 14, '#cfe3ff', 'left');
  text(ctx, `Deck ${p.pile.drawPile.length}`, 260, 624, 12, '#cfe3ff', 'left');

  // Player hand.
  for (let i = 0; i < p.hand.length; i++) {
    const card = p.hand[i];
    const rect = handCardRect(i, p.hand.length);
    const afford = card.cost <= p.ember && s.turn === 'player';
    drawHandCard(ctx, card, rect, { dim: !afford, selected: !!(s.pendingStrike && false) });
    text(ctx, String(i + 1), rect.x + rect.w / 2, rect.y - 10, 11, '#cfe3ff', 'center');
  }

  // End turn.
  drawButton(ctx, LAYOUT.endTurn, 'END TURN ⏎', s.turn === 'player' && !s.pendingStrike, false);

  // Pending strike prompt.
  if (s.pendingStrike) {
    rr(ctx, 420, 522, 440, 26, 13);
    ctx.fillStyle = 'rgba(20,16,10,0.9)';
    ctx.fill();
    ctx.strokeStyle = '#ffd94e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, `${s.pendingStrike.card.name} (${s.pendingStrike.power}) — click a Guardian or Rook`, 640, 536, 13, '#ffe9a8', 'center');
  }

  // Message line under the table center.
  if (s.message && s.messageTtl > 0) {
    text(ctx, s.message, 640, 372, 15, '#ffe9a8', 'center');
  }

  // Floaters.
  for (const f of s.floaters) {
    ctx.globalAlpha = Math.min(1, f.ttl);
    text(ctx, f.text, f.x, f.y, 16, '#f2c14e', 'center');
    ctx.globalAlpha = 1;
  }

  // Log, left edge.
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  s.log.slice(0, 6).forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#ffe9a8' : 'rgba(232,224,204,0.75)';
    ctx.fillText(line.slice(0, 44), LAYOUT.log.x, LAYOUT.log.y + i * 18);
  });

  drawLegend(ctx, s);

  if (s.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED — press P to resume', 640, 360, 28, '#fff', 'center');
  }
}

function drawTitle(ctx, s) {
  drawTable(ctx);
  text(ctx, 'EMBER PACT', 640, 150, 72, '#f2c14e', 'center');
  text(ctx, 'An elemental card duel against Rook', 640, 205, 20, '#e8e0cc', 'center');
  const lines = [
    'Flame beats Thorn · Thorn beats Tide · Tide beats Flame  —  advantage +2',
    'Play 2 cards of one element in a turn: RESONANCE +1 power.',
    'Charge: play a card that loses to Rook\u2019s last element to earn +1 Charge (max 3).',
    'Spend Charge on POWER (+2 next card) or WARD (fizzle Rook\u2019s next strike).',
    '20 Life · 30-card deck · ember grows each turn · Space ends turn · R restarts',
  ];
  lines.forEach((l, i) => text(ctx, l, 640, 268 + i * 28, 16, '#fff', 'center'));
  drawButton(ctx, LAYOUT.startBtn, '▶  START DUEL', true, false);
  text(ctx, 'Click Start or press Enter', 640, 596, 14, '#cfe3ff', 'center');
  if (s.best > 0) text(ctx, `Best score: ${s.best}`, 640, 626, 15, '#f2c14e', 'center');
  text(ctx, 'No accounts. No ads. Just cards.', 640, 668, 12, 'rgba(232,224,204,0.6)', 'center');
}

function drawEnd(ctx, s, won) {
  drawTable(ctx);
  if (won) {
    for (const c of s.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillStyle = c.c;
      ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.6);
      ctx.restore();
    }
    text(ctx, 'VICTORY!', 640, 220, 68, '#f2c14e', 'center');
    text(ctx, 'Rook is broken. The pact is yours.', 640, 285, 20, '#fff', 'center');
  } else {
    rr(ctx, 340, 150, 600, 92, 14);
    ctx.fillStyle = '#8f1f10';
    ctx.fill();
    ctx.strokeStyle = '#ffd94e';
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, 'ROOK WINS', 640, 186, 52, '#fff', 'center');
    text(ctx, 'DEFEAT — your Life reached 0', 640, 222, 18, '#ffd9c9', 'center');
    text(ctx, 'The embers gutter out... for now.', 640, 300, 20, '#fff', 'center');
  }
  text(ctx, `Score: ${s.score}`, 640, won ? 340 : 352, 26, '#fff', 'center');
  text(ctx, `Life left: ${s.player ? s.player.life : 0}  ·  Turns: ${s.turnNum}  ·  Cards played: ${s.cardsPlayed}`, 640, won ? 385 : 397, 16, '#cfe3ff', 'center');
  if (s.best > 0) text(ctx, `Best score: ${s.best}`, 640, won ? 420 : 432, 15, '#f2c14e', 'center');
  drawButton(ctx, LAYOUT.againBtn, won ? '↻  PLAY AGAIN' : '↻  RETRY', true, false);
}

export function draw(ctx, s) {
  ctx.clearRect(0, 0, W, H);
  if (s.phase === 'title') drawTitle(ctx, s);
  else if (s.phase === 'win') drawEnd(ctx, s, true);
  else if (s.phase === 'loss') drawEnd(ctx, s, false);
  else drawPlay(ctx, s);
}

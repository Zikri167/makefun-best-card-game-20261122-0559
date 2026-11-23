// Ember Pact — renderer. Draws the table, cards, panels, legend, banners
// and end screens on a fixed 1280x720 canvas. Pure drawing: it never
// changes game state, it only reads world.state. The rect helpers below
// are the single source of truth for clickable areas (input.js imports
// them), so a button is clickable exactly where it is drawn.

import {
  W, H, LAYOUT, ELEMENT_COLOR, ELEMENT_DARK, ELEMENT_GLYPH,
  ELEMENT_NAME, MAX_CHARGE,
} from './config.js';
import { CARD_DEFS } from './cards.js';
import { makeRng } from './random.js';

// ---------------------------------------------------------------- rects --
// Hand cards are centred on the table; guardians likewise.
export function handCardRect(i, count) {
  const total = count * LAYOUT.handCardW + (count - 1) * LAYOUT.handGap;
  const x0 = (W - total) / 2;
  return {
    x: x0 + i * (LAYOUT.handCardW + LAYOUT.handGap),
    y: LAYOUT.handY,
    w: LAYOUT.handCardW,
    h: LAYOUT.handCardH,
  };
}

export function rookGuardianRect(i, count) {
  const total = count * LAYOUT.guardW + (count - 1) * 10;
  const x0 = (W - total) / 2;
  return { x: x0 + i * (LAYOUT.guardW + 10), y: LAYOUT.rookGuardY, w: LAYOUT.guardW, h: LAYOUT.guardH };
}

export function playerGuardianRect(i, count) {
  const total = count * LAYOUT.guardW + (count - 1) * 10;
  const x0 = (W - total) / 2;
  return { x: x0 + i * (LAYOUT.guardW + 10), y: LAYOUT.playerGuardY, w: LAYOUT.guardW, h: LAYOUT.guardH };
}

export function rookLifeRect() {
  return { x: 24, y: 40, w: 220, h: 18 };
}

export function playerLifeRect() {
  return { x: 24, y: 476, w: 220, h: 18 };
}

// ------------------------------------------------------------- helpers --
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function wrapText(ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function text(ctx, str, x, y, font, color, align) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

// ------------------------------------------------------- card drawing --
function drawCardFace(ctx, card, x, y, w, h, opts) {
  const o = opts || {};
  const col = ELEMENT_COLOR[card.element];
  const dark = ELEMENT_DARK[card.element];
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.dim) ctx.globalAlpha *= 0.55;
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#f6efdc';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = col;
  ctx.stroke();
  // Element header band.
  rr(ctx, x + 2, y + 2, w - 4, 22, 6);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(ELEMENT_GLYPH[card.element], x + 8, y + 18);
  ctx.textAlign = 'right';
  ctx.font = '11px Georgia, serif';
  ctx.fillText(ELEMENT_NAME[card.element], x + w - 8, y + 18);
  // Cost orb, top-left overlapping the band.
  circle(ctx, x + 15, y + 15, 12);
  ctx.fillStyle = '#f2c14e';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#7a5a12';
  ctx.stroke();
  text(ctx, String(card.cost), x + 15, y + 20, 'bold 14px Georgia, serif', '#3a2a08', 'center');
  // Name + type.
  const nameSize = w >= 100 ? 13 : w >= 70 ? 11 : 9;
  text(ctx, card.name, x + w / 2, y + 46, 'bold ' + nameSize + 'px Georgia, serif', '#2a1c10', 'center');
  if (w >= 70) {
    text(ctx, card.type.toUpperCase(), x + w / 2, y + 62, '10px sans-serif', '#6b543a', 'center');
  }
  // Big element glyph.
  const glyphSize = w >= 100 ? 30 : w >= 70 ? 22 : 15;
  text(ctx, ELEMENT_GLYPH[card.element], x + w / 2, y + (w >= 100 ? 96 : 88), glyphSize + 'px Georgia, serif', col, 'center');
  // Effect text (full-size cards only).
  if (w >= 100 && card.text) {
    ctx.font = '10px sans-serif';
    const lines = wrapText(ctx, card.text, w - 16);
    lines.forEach((ln, i) => {
      text(ctx, ln, x + w / 2, y + 116 + i * 13, '10px sans-serif', '#4a3a28', 'center');
    });
  }
  // Power orb (strike / guardian) or a star for tricks.
  if (card.type === 'strike' || card.type === 'guardian') {
    circle(ctx, x + w - 17, y + h - 17, 12);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = dark;
    ctx.stroke();
    text(ctx, String(card.power), x + w - 17, y + h - 12, 'bold 14px Georgia, serif', '#fff', 'center');
  } else if (w >= 70) {
    text(ctx, '✦', x + w - 17, y + h - 12, '16px Georgia, serif', '#b98a1d', 'center');
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 7);
  ctx.fillStyle = '#6e1f1f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c9a35c';
  ctx.stroke();
  rr(ctx, x + 5, y + 5, w - 10, h - 10, 5);
  ctx.strokeStyle = 'rgba(201,163,92,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#c9a35c';
  ctx.lineWidth = 2;
  ctx.strokeRect(-11, -11, 22, 22);
  ctx.restore();
  text(ctx, '✦', x + w / 2, y + h / 2 + 5, '15px Georgia, serif', '#f2c14e', 'center');
}

function drawGuardian(ctx, g, x, y, w, h, ghost) {
  const col = ELEMENT_COLOR[g.element];
  const dark = ELEMENT_DARK[g.element];
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.9;
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#f6efdc';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = col;
  ctx.stroke();
  text(ctx, g.name, x + w / 2, y + 20, 'bold 12px Georgia, serif', '#2a1c10', 'center');
  text(ctx, ELEMENT_GLYPH[g.element] + ' GUARDIAN', x + w / 2, y + 38, '10px sans-serif', '#6b543a', 'center');
  text(ctx, ELEMENT_GLYPH[g.element], x + w / 2, y + 72, '26px Georgia, serif', col, 'center');
  // Health bar.
  const bw = w - 24;
  rr(ctx, x + 12, y + h - 30, bw, 10, 5);
  ctx.fillStyle = '#2a1c10';
  ctx.fill();
  const frac = Math.max(0, g.health / g.maxHealth);
  if (frac > 0) {
    rr(ctx, x + 12, y + h - 30, bw * frac, 10, 5);
    ctx.fillStyle = frac > 0.5 ? '#3f9e4d' : '#e2482a';
    ctx.fill();
  }
  text(ctx, 'HP ' + g.health + '/' + g.maxHealth, x + w / 2, y + h - 8, '11px sans-serif', '#2a1c10', 'center');
  text(ctx, 'PWR ' + g.power, x + w / 2, y + h - 44, 'bold 12px Georgia, serif', dark, 'center');
  ctx.restore();
}

// ------------------------------------------------- centre table dressing --
// The pact circle, drifting ember sparks and the last-play slot live in
// the empty band between the two guardian rows. All three stay quiet:
// thin dim gold, tiny lights, one small ghost card — never louder than
// the hand, the guardians or the buttons.
let frame = 0;
let sparkCache = { seed: null, sparks: [] };

function getSparks(seed) {
  if (sparkCache.seed === seed) return sparkCache.sparks;
  const rng = makeRng((seed * 1013 + 7) >>> 0);
  const sparks = [];
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2;
    const r = 46 + rng() * 150;
    sparks.push({
      dx: Math.cos(a) * r,
      dy: Math.sin(a) * r * 0.62,
      s: 1.5 + rng() * 2,
      ph: rng() * Math.PI * 2,
      sp: 0.6 + rng() * 1.1,
    });
  }
  sparkCache = { seed, sparks };
  return sparks;
}

function drawPactCircle(ctx, cx, cy) {
  ctx.save();
  circle(ctx, cx, cy, 82);
  ctx.strokeStyle = 'rgba(201,163,92,0.30)';
  ctx.lineWidth = 2;
  ctx.stroke();
  circle(ctx, cx, cy, 70);
  ctx.strokeStyle = 'rgba(201,163,92,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Three faint element glyphs riding the ring.
  const glyphs = ['▲', '✦', '●'];
  const cols = [ELEMENT_COLOR.flame, ELEMENT_COLOR.thorn, ELEMENT_COLOR.tide];
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    ctx.globalAlpha = 0.28;
    text(ctx, glyphs[i], cx + Math.cos(a) * 76, cy + Math.sin(a) * 76 + 5,
      '14px Georgia, serif', cols[i], 'center');
  }
  ctx.restore();
}

function drawSparks(ctx, seed, cx, cy) {
  const sparks = getSparks(seed);
  ctx.save();
  for (const sp of sparks) {
    const bob = Math.sin(frame * 0.02 * sp.sp + sp.ph) * 6;
    const tw = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(frame * 0.03 * sp.sp + sp.ph * 2));
    circle(ctx, cx + sp.dx, cy + sp.dy + bob, sp.s);
    ctx.fillStyle = 'rgba(242,150,60,' + tw.toFixed(2) + ')';
    ctx.fill();
  }
  ctx.restore();
}

// The most recently played card, remembered across draws (the discard
// piles only grow, and the turn counters say whose play was last).
let lastPlayed = null;

function currentLastPlay(state) {
  const p = state.player;
  const r = state.rook;
  if (!p || !r) return null;
  const pLast = p.pile.discardPile[p.pile.discardPile.length - 1] || null;
  const rLast = r.pile.discardPile[r.pile.discardPile.length - 1] || null;
  const pPlayed = Object.values(state.played.player).reduce((a, b) => a + b, 0);
  if (state.turn === 'rook') return rLast || pLast;
  if (pPlayed > 0) return pLast || rLast;
  return rLast || pLast;
}

function drawLastPlaySlot(ctx, state) {
  const cx = 640;
  const cy = 360;
  if (state.turnNum === 1 && state.cardsPlayed === 0) lastPlayed = null;
  const cur = currentLastPlay(state);
  if (cur) lastPlayed = { name: cur.name, element: cur.element, type: cur.type, cost: cur.cost, power: cur.power, text: cur.text, effect: cur.effect || null };
  drawPactCircle(ctx, cx, cy);
  drawSparks(ctx, state.seed, cx, cy);
  const w = 56;
  const h = 74;
  const x = cx - w / 2;
  const y = cy - h / 2;
  if (lastPlayed) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    drawCardFace(ctx, lastPlayed, x, y, w, h, { alpha: 0.88 });
    ctx.restore();
    rr(ctx, x - 2, y - 2, w + 4, h + 4, 9);
    ctx.strokeStyle = 'rgba(242,193,78,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.save();
    ctx.setLineDash([4, 4]);
    rr(ctx, x, y, w, h, 8);
    ctx.strokeStyle = 'rgba(201,163,92,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  text(ctx, 'LAST PLAY', cx, cy + h / 2 + 15, '9px sans-serif', 'rgba(216,207,174,0.75)', 'center');
}

// ------------------------------------------------------------- panels --
function drawLifeBar(ctx, x, y, life, maxLife) {
  rr(ctx, x, y, 220, 18, 9);
  ctx.fillStyle = '#1c130c';
  ctx.fill();
  const frac = Math.max(0, life / maxLife);
  if (frac > 0) {
    rr(ctx, x, y, 220 * frac, 18, 9);
    ctx.fillStyle = frac > 0.5 ? '#c0392b' : '#e2482a';
    ctx.fill();
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#c9a35c';
  rr(ctx, x, y, 220, 18, 9);
  ctx.stroke();
  text(ctx, '♥ ' + life + '/' + maxLife, x + 228, y + 14, 'bold 13px Georgia, serif', '#f2c14e', 'left');
}

function drawEmberPips(ctx, x, y, ember, maxEmber) {
  for (let i = 0; i < maxEmber; i++) {
    const px = x + i * 16;
    ctx.save();
    ctx.translate(px + 6, y + 6);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < ember ? '#f2963c' : 'rgba(120,90,40,0.5)';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  text(ctx, ember + '/' + maxEmber, x + maxEmber * 16 + 6, y + 11, '12px sans-serif', '#e8dcc0', 'left');
}

function drawChargePips(ctx, x, y, charge) {
  for (let i = 0; i < MAX_CHARGE; i++) {
    circle(ctx, x + i * 24, y + 7, 7);
    ctx.fillStyle = i < charge ? '#f2c14e' : 'rgba(120,90,40,0.4)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#c9a35c';
    ctx.stroke();
  }
  text(ctx, charge + '/' + MAX_CHARGE, x + MAX_CHARGE * 24 + 6, y + 11, '12px sans-serif', '#e8dcc0', 'left');
}

function drawSidePanel(ctx, side, label, yTop) {
  text(ctx, label, 24, yTop, 'bold 16px Georgia, serif', '#f2c14e', 'left');
  drawLifeBar(ctx, 24, yTop + 8, side.life, 20);
  text(ctx, 'EMBER', 24, yTop + 48, '11px sans-serif', '#c9a35c', 'left');
  drawEmberPips(ctx, 76, yTop + 36, side.ember, side.maxEmber);
  text(ctx, 'CHARGE', 24, yTop + 72, '11px sans-serif', '#c9a35c', 'left');
  drawChargePips(ctx, 80, yTop + 60, side.charge);
}

function drawButton(ctx, r, label, enabled, lit) {
  rr(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fillStyle = lit ? '#f2c14e' : enabled ? '#3a6b46' : '#3a3a34';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = lit ? '#7a5a12' : '#c9a35c';
  ctx.stroke();
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 5, 'bold 14px Georgia, serif', lit ? '#3a2a08' : '#f6efdc', 'center');
}

function drawLegend(ctx, state) {
  const L = LAYOUT.legend;
  rr(ctx, L.x, L.y, L.w, L.h, 10);
  ctx.fillStyle = 'rgba(10,28,17,0.88)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#c9a35c';
  ctx.stroke();
  const x = L.x + 14;
  text(ctx, 'LEGEND', x, L.y + 22, 'bold 14px Georgia, serif', '#f2c14e', 'left');
  ctx.beginPath();
  ctx.moveTo(x, L.y + 30);
  ctx.lineTo(L.x + L.w - 14, L.y + 30);
  ctx.strokeStyle = 'rgba(201,163,92,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Element cycle, glyph by glyph so each keeps its own colour.
  const cycle = [
    [['▲ ', ELEMENT_COLOR.flame], ['Flame ', '#e8dcc0'], ['> ', '#f2c14e'], ['✦ ', ELEMENT_COLOR.thorn], ['Thorn', '#e8dcc0']],
    [['✦ ', ELEMENT_COLOR.thorn], ['Thorn ', '#e8dcc0'], ['> ', '#f2c14e'], ['● ', ELEMENT_COLOR.tide], ['Tide', '#e8dcc0']],
    [['● ', ELEMENT_COLOR.tide], ['Tide ', '#e8dcc0'], ['> ', '#f2c14e'], ['▲ ', ELEMENT_COLOR.flame], ['Flame', '#e8dcc0']],
  ];
  ctx.font = '12px sans-serif';
  cycle.forEach((segs, i) => {
    let cx = x;
    const cy = L.y + 52 + i * 18;
    for (const [t, c] of segs) {
      ctx.fillStyle = c;
      ctx.fillText(t, cx, cy);
      cx += ctx.measureText(t).width;
    }
  });
  text(ctx, 'TRICKS', x, L.y + 126, 'bold 12px Georgia, serif', '#f2c14e', 'left');
  const tricks = ['Draw 2 cards', 'Steal 1 ember', 'Heal 3 Life', 'Draw 1 + 1 ember'];
  tricks.forEach((t, i) => {
    text(ctx, '· ' + t, x, L.y + 146 + i * 18, '12px sans-serif', '#e8dcc0', 'left');
  });
  ctx.beginPath();
  ctx.moveTo(x, L.y + 228);
  ctx.lineTo(L.x + L.w - 14, L.y + 228);
  ctx.strokeStyle = 'rgba(201,163,92,0.5)';
  ctx.stroke();
  const deckN = state.player ? state.player.pile.drawPile.length : 0;
  text(ctx, 'Deck: ' + deckN + ' cards', x, L.y + 250, '12px sans-serif', '#e8dcc0', 'left');
  text(ctx, 'Reshuffle when empty', x, L.y + 268, '12px sans-serif', '#c9a35c', 'left');
  text(ctx, 'Reshuffles: ' + state.reshuffles, x, L.y + 286, '12px sans-serif', '#c9a35c', 'left');
}

// --------------------------------------------------------------- scenes --
function drawTable(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d5a37');
  g.addColorStop(0.5, '#1a5232');
  g.addColorStop(1, '#123f27');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Wood frame + gold inner line.
  ctx.fillStyle = '#3a2417';
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 10, W, 10);
  ctx.fillRect(0, 0, 10, H);
  ctx.fillRect(W - 10, 0, 10, H);
  ctx.strokeStyle = 'rgba(201,163,92,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(14.5, 14.5, W - 29, H - 29);
}

function drawPlay(ctx, state) {
  drawTable(ctx);
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.15);

  // Rook hand (face down).
  const rn = state.rook.hand.length;
  const rTotal = rn * LAYOUT.rookHandW + (rn - 1) * 8;
  const rx0 = (W - rTotal) / 2;
  for (let i = 0; i < rn; i++) {
    drawCardBack(ctx, rx0 + i * (LAYOUT.rookHandW + 8), LAYOUT.rookHandY, LAYOUT.rookHandW, LAYOUT.rookHandH);
  }
  // Rook thinking pulse + dots.
  if (state.rookThinking > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.35 * pulse;
    rr(ctx, rx0 - 8, LAYOUT.rookHandY - 6, rTotal + 16, LAYOUT.rookHandH + 12, 10);
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    text(ctx, '...', rx0 + rTotal + 14, LAYOUT.rookHandY + 58, 'bold 30px Georgia, serif', '#f2c14e', 'left');
  }
  // Rook taunt bubble.
  if (state.rookTaunt) {
    rr(ctx, 830, 20, 426, 48, 10);
    ctx.fillStyle = 'rgba(20,10,8,0.88)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#c9a35c';
    ctx.stroke();
    ctx.font = '13px sans-serif';
    const lines = wrapText(ctx, state.rookTaunt.text, 400);
    lines.forEach((ln, i) => {
      text(ctx, ln, 844, 40 + i * 16, '13px sans-serif', '#f6efdc', 'left');
    });
  }
  if (state.muted) {
    text(ctx, 'MUTED', W - 24, 14, '11px sans-serif', '#c9a35c', 'right');
  }

  // Side panels.
  drawSidePanel(ctx, state.rook, 'ROOK', 24);
  drawSidePanel(ctx, state.player, 'YOU', 468);
  text(ctx, 'Turn ' + state.turnNum + ' · ' + (state.turn === 'player' ? 'Your move' : "Rook's move"),
    24, 592, '13px sans-serif', '#e8dcc0', 'left');
  text(ctx, 'Q POWER · W WARD', 24, 614, '11px sans-serif', '#c9a35c', 'left');

  // Guardians.
  state.rook.guardians.forEach((g, i) => {
    const r = rookGuardianRect(i, state.rook.guardians.length);
    drawGuardian(ctx, g, r.x, r.y, r.w, r.h);
  });
  state.player.guardians.forEach((g, i) => {
    const r = playerGuardianRect(i, state.player.guardians.length);
    drawGuardian(ctx, g, r.x, r.y, r.w, r.h);
  });

  // Centre dressing: pact circle, sparks, last-play slot.
  drawLastPlaySlot(ctx, state);

  // Log.
  text(ctx, 'LOG', 24, 308, 'bold 12px Georgia, serif', '#c9a35c', 'left');
  ctx.font = '12px sans-serif';
  state.log.forEach((line, i) => {
    ctx.globalAlpha = Math.max(0.35, 1 - i * 0.13);
    ctx.fillStyle = '#d8cfae';
    ctx.fillText(line.slice(0, 44), 24, 326 + i * 17);
  });
  ctx.globalAlpha = 1;

  // Legend.
  drawLegend(ctx, state);

  // Player hand.
  state.player.hand.forEach((card, i) => {
    const r = handCardRect(i, state.player.hand.length);
    const dim = card.cost > state.player.ember;
    drawCardFace(ctx, card, r.x, r.y, r.w, r.h, { dim });
    if (state.player.powerArmed && card.type === 'strike') {
      rr(ctx, r.x + r.w - 44, r.y + 30, 34, 18, 6);
      ctx.fillStyle = '#f2c14e';
      ctx.fill();
      text(ctx, '+2', r.x + r.w - 27, r.y + 43, 'bold 11px Georgia, serif', '#3a2a08', 'center');
    }
  });

  // Buttons.
  const endLit = state.turn === 'player' && !state.pendingStrike;
  drawButton(ctx, LAYOUT.endTurn, 'END TURN', endLit, false);
  drawButton(ctx, LAYOUT.powerBtn, 'POWER (Q)', state.player.charge >= 1, state.player.powerArmed);
  drawButton(ctx, LAYOUT.wardBtn, 'WARD (W)', state.player.charge >= 1, state.player.wardArmed);

  // Resonance badge, compact, top-right of the table.
  const res = state.resonance.player ? 'player' : state.resonance.rook ? 'rook' : null;
  if (res) {
    const label = res === 'player' ? '✦ RESONANCE +1' : 'ROOK RESONANCE +1';
    rr(ctx, 1070, 112, 186, 28, 14);
    ctx.fillStyle = res === 'player' ? 'rgba(242,193,78,0.92)' : 'rgba(63,158,77,0.92)';
    ctx.fill();
    text(ctx, label, 1163, 131, 'bold 13px Georgia, serif', '#1c130c', 'center');
  }

  // Announce message pill.
  if (state.messageTtl > 0 && state.message) {
    ctx.font = '15px sans-serif';
    const tw = ctx.measureText(state.message).width;
    const bw = tw + 36;
    rr(ctx, 640 - bw / 2, 111, bw, 30, 15);
    ctx.fillStyle = 'rgba(10,10,8,0.72)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#c9a35c';
    ctx.stroke();
    text(ctx, state.message, 640, 131, '15px sans-serif', '#f6efdc', 'center');
  }

  // Pending strike: invite a target.
  if (state.pendingStrike) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd94a';
    state.rook.guardians.forEach((g, i) => {
      const r = rookGuardianRect(i, state.rook.guardians.length);
      rr(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 10);
      ctx.stroke();
    });
    const lr = rookLifeRect();
    rr(ctx, lr.x - 3, lr.y - 3, lr.w + 6, lr.h + 6, 10);
    ctx.stroke();
    ctx.restore();
  }

  // Rook telegraph: the aim is readable before the hit lands.
  if (state.rookAim) {
    const aim = state.rookAim;
    const r = aim.kind === 'guardian'
      ? playerGuardianRect(aim.index, state.player.guardians.length)
      : playerLifeRect();
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd94a';
    rr(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10);
    ctx.stroke();
    ctx.restore();
    const label = 'ROOK AIMS HERE · ' + aim.damage;
    ctx.font = 'bold 13px Georgia, serif';
    const lw = ctx.measureText(label).width + 20;
    const lx = r.x + r.w / 2 - lw / 2;
    const ly = r.y - 26;
    rr(ctx, lx, ly, lw, 20, 10);
    ctx.fillStyle = 'rgba(20,10,8,0.85)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffd94a';
    ctx.stroke();
    text(ctx, label, r.x + r.w / 2, ly + 14, 'bold 13px Georgia, serif', '#ffd94a', 'center');
  }

  // Floaters.
  for (const f of state.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, f.ttl / 1.6));
    text(ctx, f.text, f.x, f.y, 'bold 16px Georgia, serif', '#f2c14e', 'center');
    ctx.restore();
  }

  if (state.paused) {
    ctx.fillStyle = 'rgba(8,10,8,0.6)';
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'PAUSED', 640, 340, 'bold 48px Georgia, serif', '#f2c14e', 'center');
    text(ctx, 'Press P to resume', 640, 380, '16px sans-serif', '#e8dcc0', 'center');
  }
}

function sampleCards() {
  const want = ['Flame Lash', 'Bramble Wall', 'Deep Draw'];
  return want.map((name) => {
    const def = CARD_DEFS.find((d) => d.name === name);
    return { name: def.name, element: def.element, type: def.type, cost: def.cost, power: def.power, text: def.text, effect: def.effect || null };
  });
}

function drawTitle(ctx, state) {
  drawTable(ctx);
  // Dressing behind the title: pact ring + drifting sparks.
  drawPactCircle(ctx, 640, 132);
  drawSparks(ctx, state.seed, 640, 132);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  text(ctx, 'EMBER PACT', 640, 158, 'bold 84px Georgia, serif', '#f2c14e', 'center');
  ctx.restore();
  text(ctx, 'An elemental card duel — you vs Rook', 640, 196, '20px Georgia, serif', '#d8cfae', 'center');

  // Rules panel.
  rr(ctx, 380, 226, 520, 226, 12);
  ctx.fillStyle = 'rgba(10,30,18,0.72)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#c9a35c';
  ctx.stroke();
  text(ctx, 'HOW TO PLAY', 640, 256, 'bold 16px Georgia, serif', '#f2c14e', 'center');
  text(ctx, '▲ Flame  >  ✦ Thorn  >  ● Tide  >  ▲ Flame', 640, 290, '15px sans-serif', '#e8dcc0', 'center');
  text(ctx, 'Play the element that beats the foe’s last card: +2 power.', 640, 316, '13px sans-serif', '#c9a35c', 'center');
  text(ctx, 'RESONANCE — 2 cards of one element in a turn: both +1 power.', 640, 344, '13px sans-serif', '#e8dcc0', 'center');
  text(ctx, 'CHARGE — play into the wind (your element loses): +1 Charge.', 640, 370, '13px sans-serif', '#e8dcc0', 'center');
  text(ctx, 'Spend Charge on POWER (+2) or WARD (Rook’s strike fizzles).', 640, 394, '13px sans-serif', '#c9a35c', 'center');
  text(ctx, 'Tricks: Draw 2 · Steal 1 ember · Heal 3 · Draw 1 + 1 ember.', 640, 420, '13px sans-serif', '#e8dcc0', 'center');
  text(ctx, 'Click a card to play · 1–5 · Space end turn · R restart', 640, 442, '12px sans-serif', '#c9a35c', 'center');

  // Divider ornament between rules and the button.
  ctx.beginPath();
  ctx.moveTo(560, 484);
  ctx.lineTo(720, 484);
  ctx.strokeStyle = 'rgba(201,163,92,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  text(ctx, '✦', 640, 489, '14px Georgia, serif', '#c9a35c', 'center');

  drawButton(ctx, LAYOUT.startBtn, 'START DUEL', true, true);

  // Best score, or a neutral line when nothing is stored yet.
  if (state.best > 0) {
    text(ctx, 'Best score: ' + state.best, 640, 592, '15px Georgia, serif', '#f2c14e', 'center');
  } else {
    text(ctx, 'No score yet — seal your first pact!', 640, 592, '15px Georgia, serif', '#c9a35c', 'center');
  }

  // Three sample cards, fanned under the button.
  const cards = sampleCards();
  const centres = [520, 640, 760];
  const tilts = [-0.16, 0, 0.16];
  cards.forEach((card, i) => {
    ctx.save();
    ctx.translate(centres[i], 655);
    ctx.rotate(tilts[i]);
    drawCardFace(ctx, card, -42, -55, 84, 110, {});
    ctx.restore();
  });
}

function drawEnd(ctx, state, won) {
  drawTable(ctx);
  ctx.fillStyle = won ? 'rgba(8,14,8,0.55)' : 'rgba(14,6,6,0.62)';
  ctx.fillRect(0, 0, W, H);
  // Confetti goes over the dimming veil, not under it, so the pieces
  // read as bright paper instead of faint dust behind glass.
  if (won) {
    for (const c of state.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillStyle = c.c;
      ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.6);
      ctx.restore();
    }
  }
  if (won) {
    text(ctx, 'VICTORY', 640, 230, 'bold 76px Georgia, serif', '#f2c14e', 'center');
    text(ctx, 'Rook is broken. The pact is yours.', 640, 272, '20px Georgia, serif', '#e8dcc0', 'center');
  } else {
    text(ctx, 'DEFEAT', 640, 220, 'bold 76px Georgia, serif', '#e2482a', 'center');
    rr(ctx, 520, 248, 240, 40, 20);
    ctx.fillStyle = 'rgba(20,10,8,0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f2c14e';
    ctx.stroke();
    text(ctx, 'ROOK WINS', 640, 275, 'bold 24px Georgia, serif', '#f2c14e', 'center');
    text(ctx, 'The embers go cold. Try again.', 640, 316, '18px Georgia, serif', '#e8dcc0', 'center');
  }
  const baseY = won ? 330 : 360;
  text(ctx, 'Score: ' + state.score, 640, baseY, 'bold 28px Georgia, serif', '#f6efdc', 'center');
  if (won) {
    text(ctx, 'Life left: ' + state.player.life + ' / 20', 640, baseY + 36, '18px sans-serif', '#e8dcc0', 'center');
  }
  text(ctx, 'Cards played: ' + state.cardsPlayed, 640, baseY + 66, '18px sans-serif', '#e8dcc0', 'center');
  text(ctx, 'Best score: ' + state.best, 640, baseY + 96, '18px sans-serif', '#f2c14e', 'center');
  drawButton(ctx, LAYOUT.againBtn, won ? 'PLAY AGAIN' : 'RETRY', true, true);
  text(ctx, 'Enter or R to play again', 640, LAYOUT.againBtn.y + 84, '13px sans-serif', '#c9a35c', 'center');
}

export function draw(ctx, state) {
  frame++;
  if (state.phase === 'title') {
    drawTitle(ctx, state);
  } else if (state.phase === 'win') {
    drawEnd(ctx, state, true);
  } else if (state.phase === 'loss') {
    drawEnd(ctx, state, false);
  } else {
    drawPlay(ctx, state);
  }
}

// Ember Pact — everything the eye sees.
// One canvas, one fixed 1280x720 stage: the wooden table and green felt,
// the two hands, the guardian rows, life bars, ember gems, the battle
// log, the Resonance banner, Rook's yellow aim telegraph, floating
// damage numbers and the win confetti. Cards slide toward their slots
// (lerped positions), so a played card visibly travels.
import {
  BACK_H, BACK_W, CARD_H, CARD_W, ELEMENTS, END_TURN_BUTTON, HAND_H,
  HAND_W, HAND_Y, LOG_PANEL, ROOK_ROW_Y, TABLE_CENTER_X, VIEW_H, VIEW_W,
  YOU_ROW_Y, backRect, handRect, insideRect, tableRowRect,
} from './config.js';
import { cardDef } from './cards.js';

export const LAYOUT = { END_TURN_BUTTON, LOG_PANEL };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Element icon drawn as a shape, never text alone: flame, leaf, drop. */
export function drawElementIcon(ctx, element, cx, cy, r) {
  const el = ELEMENTS[element] || ELEMENTS.FLAME;
  ctx.save();
  ctx.fillStyle = el.color;
  ctx.strokeStyle = el.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (element === 'FLAME') {
    ctx.moveTo(cx, cy - r);
    ctx.bezierCurveTo(cx + r * 0.9, cy - r * 0.2, cx + r * 0.7, cy + r * 0.6, cx, cy + r);
    ctx.bezierCurveTo(cx - r * 0.7, cy + r * 0.6, cx - r * 0.9, cy - r * 0.2, cx, cy - r);
  } else if (element === 'THORN') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.75, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.75, cy);
    ctx.closePath();
  } else {
    ctx.moveTo(cx, cy - r);
    ctx.bezierCurveTo(cx + r * 0.85, cy + r * 0.1, cx + r * 0.6, cy + r, cx, cy + r);
    ctx.bezierCurveTo(cx - r * 0.6, cy + r, cx - r * 0.85, cy + r * 0.1, cx, cy - r);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, cx, cy, s, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.8);
  ctx.bezierCurveTo(cx - s * 1.2, cy, cx - s * 0.6, cy - s, cx, cy - s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.6, cy - s, cx + s * 1.2, cy, cx, cy + s * 0.8);
  ctx.fill();
  ctx.restore();
}

/** Slide a card toward its slot; snap the first time it is seen. */
function animPos(state, uid, target) {
  const a = state.anim[uid];
  if (!a) {
    state.anim[uid] = { x: target.x, y: target.y };
    return target;
  }
  a.x += (target.x - a.x) * 0.22;
  a.y += (target.y - a.y) * 0.22;
  return { x: a.x, y: a.y };
}

function drawCardFace(ctx, state, card, x, y, w, h, opts) {
  const el = ELEMENTS[card.element];
  const o = opts || {};
  ctx.save();
  if (o.dimmed) ctx.globalAlpha = 0.55;
  if (o.hovered) {
    ctx.shadowColor = 'rgba(255, 211, 77, 0.9)';
    ctx.shadowBlur = 22;
  } else if (o.affordable) {
    ctx.shadowColor = 'rgba(120, 220, 120, 0.55)';
    ctx.shadowBlur = 10;
  }
  rr(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#f5e9cf';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = o.hovered ? '#ffd34d' : el.dark;
  ctx.stroke();
  // Element band.
  ctx.save();
  rr(ctx, x + 3, y + 3, w - 6, 30, 8);
  ctx.fillStyle = el.color;
  ctx.fill();
  ctx.restore();
  // Cost gem.
  ctx.beginPath();
  ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#2b1d12';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd34d';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 20, y + 21);
  // Element icon, top right.
  drawElementIcon(ctx, card.element, x + w - 24, y + 19, 12);
  // Name.
  ctx.fillStyle = '#2b1d12';
  ctx.font = `bold ${w > 120 ? 15 : 13}px Georgia, serif`;
  ctx.fillText(card.name, x + w / 2, y + 52);
  // Big art icon.
  drawElementIcon(ctx, card.element, x + w / 2, y + 92, 30);
  // Power / health line.
  ctx.font = `bold ${w > 120 ? 26 : 22}px Georgia, serif`;
  if (card.type === 'guardian') {
    ctx.fillStyle = '#173f86';
    ctx.fillText(`♥ ${card.health}`, x + w / 2, y + h - 44);
    ctx.fillStyle = '#7d1a12';
    ctx.font = `bold ${w > 120 ? 16 : 14}px Georgia, serif`;
    ctx.fillText(`hits back ${card.power}`, x + w / 2, y + h - 20);
  } else if (card.type === 'strike') {
    ctx.fillStyle = '#7d1a12';
    ctx.fillText(`ATK ${card.power}`, x + w / 2, y + h - 38);
    ctx.fillStyle = '#5a4632';
    ctx.font = '12px Georgia, serif';
    ctx.fillText(el.name + ' Strike', x + w / 2, y + h - 18);
  } else {
    ctx.fillStyle = '#2a5a22';
    ctx.font = `bold ${w > 120 ? 16 : 14}px Georgia, serif`;
    ctx.fillText('TRICK', x + w / 2, y + h - 40);
    ctx.fillStyle = '#5a4632';
    ctx.font = '10px Georgia, serif';
    const words = card.text.split(' ');
    const mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(' '), x + w / 2, y + h - 22);
    ctx.fillText(words.slice(mid).join(' '), x + w / 2, y + h - 9);
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  ctx.save();
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#3a1f3f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd34d';
  ctx.stroke();
  rr(ctx, x + 6, y + 6, w - 12, h - 12, 6);
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.5)';
  ctx.stroke();
  drawElementIcon(ctx, 'FLAME', x + w / 2, y + h / 2 - 6, 16);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 9px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('EMBER', x + w / 2, y + h - 14);
  ctx.restore();
}

function drawLife(ctx, x, y, label, life, maxLife, flip) {
  ctx.save();
  ctx.textAlign = flip ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  drawHeart(ctx, x + (flip ? -14 : 14), y, 11, life <= 5 ? '#ff5a4e' : '#e2483d');
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText(`${label}  ${life}`, x + (flip ? -32 : 32), y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(ctx, x + (flip ? -232 : 32), y + 16, 200, 10, 5);
  ctx.fill();
  ctx.fillStyle = life <= 5 ? '#ff5a4e' : '#58a34b';
  rr(ctx, x + (flip ? -232 : 32), y + 16, Math.max(4, 200 * (life / maxLife)), 10, 5);
  ctx.fill();
  ctx.restore();
}

function drawEmberGems(ctx, x, y, ember, maxEmber) {
  ctx.save();
  for (let i = 0; i < maxEmber; i++) {
    const gx = x + i * 20;
    ctx.beginPath();
    ctx.moveTo(gx + 7, y);
    ctx.lineTo(gx + 14, y + 7);
    ctx.lineTo(gx + 7, y + 14);
    ctx.lineTo(gx, y + 7);
    ctx.closePath();
    ctx.fillStyle = i < ember ? '#ff9a3d' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = i < ember ? '#ffd34d' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawButton(ctx, rect, label, enabled, sub) {
  ctx.save();
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = enabled ? '#c98a2b' : '#5a5348';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = enabled ? '#ffd34d' : '#8a8378';
  ctx.stroke();
  ctx.fillStyle = enabled ? '#241708' : '#cfc8bb';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - (sub ? 8 : 0));
  if (sub) {
    ctx.font = '12px Georgia, serif';
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 16);
  }
  ctx.restore();
}

function drawTable(ctx) {
  const wood = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  wood.addColorStop(0, '#4a2c17');
  wood.addColorStop(1, '#2e1a0c');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let y = 60; y < VIEW_H; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }
  const felt = ctx.createRadialGradient(520, 360, 60, 520, 360, 560);
  felt.addColorStop(0, '#1f6b3f');
  felt.addColorStop(1, '#123f24');
  ctx.fillStyle = felt;
  ctx.beginPath();
  ctx.ellipse(520, 360, 500, 300, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawLog(ctx, state) {
  const p = LOG_PANEL;
  ctx.save();
  rr(ctx, p.x, p.y, p.w, p.h, 10);
  ctx.fillStyle = 'rgba(10, 16, 10, 0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('BATTLE LOG', p.x + 12, p.y + 24);
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = '#e8e0c8';
  let y = p.y + 48;
  for (const line of state.log.slice(-12)) {
    wrapLine(ctx, line, p.x + 12, y, p.w - 24, 15);
    y += 30;
  }
  ctx.restore();
}

function wrapLine(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

function drawBanner(ctx, state, now) {
  if (!state.banner) return;
  const pulse = 1 + 0.06 * Math.sin(now / 90);
  ctx.save();
  ctx.translate(520, 362);
  ctx.scale(pulse, pulse);
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd34d';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#fff3c4';
  ctx.fillText(state.banner.text, 0, 0);
  ctx.restore();
}

function drawAim(ctx, state, now) {
  if (!state.aim) return;
  const blink = 0.55 + 0.45 * Math.sin(now / 130);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 211, 77, ${blink})`;
  ctx.lineWidth = 5;
  ctx.shadowColor = '#ffd34d';
  ctx.shadowBlur = 18;
  const foe = state.you;
  let rect = null;
  let label = state.aimText || 'ROOK AIMS HERE';
  if (foe.guardians.length > 0) {
    let weakest = foe.guardians[0];
    let wi = 0;
    foe.guardians.forEach((g, i) => {
      if (g.health < weakest.health) {
        weakest = g;
        wi = i;
      }
    });
    rect = tableRowRect(wi, foe.guardians.length, YOU_ROW_Y);
    label = state.aimText || 'ROOK AIMS HERE';
  } else {
    rect = { x: 1020, y: 6, w: 210, h: 48 };
    label = 'ROOK AIMS AT YOUR LIFE';
  }
  rr(ctx, rect.x - 6, rect.y - 6, rect.w + 12, rect.h + 12, 12);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  const labelY = foe.guardians.length > 0 ? rect.y - 18 : rect.y + rect.h + 22;
  ctx.fillText(label, rect.x + rect.w / 2, labelY);
  ctx.restore();
}

function drawFx(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px Georgia, serif';
  for (const f of state.fx) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - f.t * 46);
  }
  ctx.restore();
}

function drawConfetti(ctx, state) {
  ctx.save();
  for (const p of state.particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
    ctx.restore();
  }
  ctx.restore();
}

function drawPlay(ctx, state, now, mouse) {
  drawTable(ctx);
  // Top HUD bar.
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, VIEW_W, 56);
  drawLife(ctx, 24, 20, 'ROOK', state.rook.life, 20, false);
  drawEmberGems(ctx, 280, 34, state.rook.ember, state.rook.maxEmber);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('EMBER', 280, 26);
  ctx.textAlign = 'right';
  drawLife(ctx, 1256, 20, 'YOU', state.you.life, 20, true);
  drawEmberGems(ctx, 780, 34, state.you.ember, state.you.maxEmber);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('EMBER', 780, 26);
  // Turn pill.
  ctx.fillStyle = state.turn === 'player' ? '#2a5a22' : '#7d1a12';
  rr(ctx, 560, 10, 200, 36, 18);
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.turn === 'player' ? `YOUR TURN — ${state.turnCount}` : `ROOK'S TURN — ${state.turnCount}`, 660, 29);
  ctx.restore();

  // Rook's face-down hand.
  state.rook.hand.forEach((c, i) => {
    const r = backRect(i, state.rook.hand.length);
    drawCardBack(ctx, r.x, r.y, r.w, r.h);
  });
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ROOK DECK ${state.rook.deck.length}`, 900, 116);

  // Guardian rows.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  if (state.rook.guardians.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillText('ROOK’S', 24, ROOK_ROW_Y + 68);
    ctx.fillText('GUARDIANS', 24, ROOK_ROW_Y + 86);
    ctx.textAlign = 'center';
    state.rook.guardians.forEach((g, i) => {
      const r = tableRowRect(i, state.rook.guardians.length, ROOK_ROW_Y);
      const pos = animPos(state, g.uid, r);
      drawCardFace(ctx, state, cardDef(g.id), pos.x, pos.y, CARD_W, CARD_H, {});
    });
  } else {
    ctx.fillText('ROOK HAS NO GUARDIAN — STRIKES HIT LIFE', TABLE_CENTER_X, ROOK_ROW_Y + 60);
  }
  if (state.you.guardians.length > 0) {
    ctx.textAlign = 'left';
    ctx.fillText('YOUR', 24, YOU_ROW_Y + 68);
    ctx.fillText('GUARDIANS', 24, YOU_ROW_Y + 86);
    ctx.textAlign = 'center';
    state.you.guardians.forEach((g, i) => {
      const r = tableRowRect(i, state.you.guardians.length, YOU_ROW_Y);
      const pos = animPos(state, g.uid, r);
      drawCardFace(ctx, state, cardDef(g.id), pos.x, pos.y, CARD_W, CARD_H, {});
    });
  }

  // Player hand.
  state.you.hand.forEach((inst, i) => {
    const card = cardDef(inst.id);
    const r = handRect(i, state.you.hand.length);
    const hovered = state.hover === i && state.turn === 'player';
    const target = { x: r.x, y: hovered ? r.y - 24 : r.y };
    const pos = animPos(state, inst.uid, target);
    drawCardFace(ctx, state, card, pos.x, pos.y, HAND_W, HAND_H, {
      hovered,
      affordable: state.turn === 'player' && card.cost <= state.you.ember,
      dimmed: state.turn === 'player' && card.cost > state.you.ember,
    });
    ctx.fillStyle = '#e8e0c8';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), pos.x + HAND_W / 2, pos.y + HAND_H + 14);
  });

  drawLog(ctx, state);
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`YOUR DECK ${state.you.deck.length}  •  DISCARD ${state.you.discard.length}`, LOG_PANEL.x, 584);
  ctx.fillText('1-5 play  •  SPACE end turn  •  R restart', LOG_PANEL.x, 606);
  ctx.fillText('M mute  •  P pause', LOG_PANEL.x, 628);

  drawButton(ctx, END_TURN_BUTTON, 'END TURN', state.turn === 'player', 'SPACE');
  drawBanner(ctx, state, now);
  drawAim(ctx, state, now);
  drawFx(ctx, state);

  if (state.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.font = '18px Georgia, serif';
    ctx.fillText('Press P to resume', VIEW_W / 2, VIEW_H / 2 + 30);
  }
}

function drawTitle(ctx, state, now) {
  drawTable(ctx);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Ember trio emblem.
  drawElementIcon(ctx, 'FLAME', 560, 130, 34);
  drawElementIcon(ctx, 'THORN', 640, 130, 34);
  drawElementIcon(ctx, 'TIDE', 720, 130, 34);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.shadowColor = '#e2483d';
  ctx.shadowBlur = 30;
  ctx.fillText('EMBER PACT', 640, 240);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('A duel of flame, thorn and tide — seal the pact, break Rook.', 640, 282);
  // Rules box.
  rr(ctx, 340, 310, 600, 150, 14);
  ctx.fillStyle = 'rgba(10, 16, 10, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 211, 77, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('Flame beats Thorn beats Tide beats Flame  •  +2 power on advantage', 640, 342);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#e8e0c8';
  ctx.fillText('Play 2 cards of one element in a turn for RESONANCE (+1 power).', 640, 372);
  ctx.fillText('Guardians block strikes and hit back. First to 0 Life loses.', 640, 400);
  ctx.fillText('Rook telegraphs every strike in yellow — answer with a Guardian.', 640, 428);
  drawButton(ctx, { x: 520, y: 486, w: 240, h: 64 }, 'START DUEL', true, 'CLICK OR PRESS ENTER');
  ctx.fillStyle = '#e8e0c8';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(`BEST SCORE  ${state.best > 0 ? state.best : '—'}`, 640, 592);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = 'rgba(232,224,200,0.75)';
  ctx.fillText('Click a card to play it  •  1-5 play  •  SPACE end turn  •  R restart  •  M mute  •  P pause', 640, 622);
  ctx.restore();
}

function drawEnd(ctx, state, won) {
  drawTable(ctx);
  if (won) drawConfetti(ctx, state);
  ctx.save();
  ctx.fillStyle = won ? 'rgba(20, 40, 16, 0.55)' : 'rgba(40, 10, 10, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffd34d' : '#ff6a5e';
  ctx.font = 'bold 76px Georgia, serif';
  ctx.shadowColor = won ? '#ffd34d' : '#ff0000';
  ctx.shadowBlur = 30;
  ctx.fillText(won ? (state.winner === 'draw' ? 'DRAW' : 'VICTORY!') : 'DEFEAT', 640, 220);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = '22px Georgia, serif';
  ctx.fillText(
    won
      ? state.winner === 'draw'
        ? 'Both embers gutter out together.'
        : 'Rook’s embers are yours. The pact is sealed in your name.'
      : 'Rook keeps the embers this time. Shuffle up and go again.',
    640,
    268,
  );
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(`SCORE  ${state.score}`, 640, 340);
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = '#e8e0c8';
  ctx.fillText(`Life left ${state.you.life}  •  Turns ${state.turnCount}  •  Resonance ${state.stats.resonance}  •  Cards played ${state.stats.plays}`, 640, 380);
  ctx.fillText(`BEST  ${state.best}`, 640, 412);
  drawButton(ctx, { x: 520, y: 520, w: 240, h: 64 }, 'PLAY AGAIN', true, 'PRESS R');
  ctx.restore();
}

/** Draw the whole stage for this frame. `mouse` is unused by the canvas
 *  (hover lives in state) but kept for the input contract. */
export function draw(ctx, state, now, mouse) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.screen === 'title') drawTitle(ctx, state, now);
  else if (state.screen === 'play') drawPlay(ctx, state, now, mouse);
  else if (state.screen === 'win') drawEnd(ctx, state, true);
  else if (state.screen === 'loss') drawEnd(ctx, state, false);
}

/** Hit-test a canvas point; returns what lives there, or null. */
export function hitTest(state, px, py) {
  if (state.screen === 'title') {
    if (insideRect({ x: 520, y: 486, w: 240, h: 64 }, px, py)) return { kind: 'start' };
    return null;
  }
  if (state.screen === 'win' || state.screen === 'loss') {
    if (insideRect({ x: 520, y: 520, w: 240, h: 64 }, px, py)) return { kind: 'again' };
    return null;
  }
  if (state.screen !== 'play') return null;
  if (state.turn === 'player' && insideRect(END_TURN_BUTTON, px, py)) return { kind: 'end-turn' };
  if (state.turn === 'player') {
    for (let i = state.you.hand.length - 1; i >= 0; i--) {
      const r = handRect(i, state.you.hand.length);
      const lifted = { x: r.x, y: r.y - 24, w: r.w, h: r.h + 24 };
      if (insideRect(lifted, px, py)) return { kind: 'card', index: i };
    }
  }
  return null;
}

/** Which hand card the mouse hovers, or -1. */
export function hoverTest(state, px, py) {
  if (state.screen !== 'play' || state.turn !== 'player') return -1;
  for (let i = state.you.hand.length - 1; i >= 0; i--) {
    const r = handRect(i, state.you.hand.length);
    if (insideRect({ x: r.x, y: r.y - 24, w: r.w, h: r.h + 24 }, px, py)) return i;
  }
  return -1;
}

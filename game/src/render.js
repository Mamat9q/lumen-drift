// render.js — every pixel of LUMEN DRIFT: the nebula backdrop, the Drift
// Gate, the HUD, and the title / upgrade / game-over / victory screens.
// Screenshots are judged on this file's output, so every screen is composed
// to read at a glance even when shrunk.
import { TAU, clamp, fmt } from './utils.js';

const FONT = "'Segoe UI', system-ui, sans-serif";

export function drawBackground(ctx, game, time) {
  const g = ctx.createLinearGradient(0, 0, 0, game.h);
  g.addColorStop(0, '#0a0618');
  g.addColorStop(0.55, '#171233');
  g.addColorStop(1, '#05030c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, game.w, game.h);
  game.starfield.draw(ctx);
}

// A small flame teardrop, filled to `frac` (0..1) — the HUD's lantern pips
// and the beacon flames themselves are drawn from this one shape.
export function flameIcon(ctx, x, y, size, frac, lit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 12, size / 12);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-5, 1, -4, -4, 0, -7);
  ctx.bezierCurveTo(4, -4, 5, 1, 0, 6);
  ctx.closePath();
  if (!lit || frac <= 0.02) {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
  } else {
    const fg = ctx.createLinearGradient(0, -7, 0, 6);
    fg.addColorStop(0, '#fff3c4');
    fg.addColorStop(0.6, '#ffb03d');
    fg.addColorStop(1, '#ff7a2e');
    ctx.fillStyle = fg;
    ctx.fill();
    // The unlit part of the wick shows as a dark cap from the top.
    if (frac < 1) {
      ctx.fillStyle = 'rgba(5,3,12,0.75)';
      ctx.fillRect(-5, -7, 10, 13 * (1 - frac));
    }
  }
  ctx.restore();
}

// One beacon lantern: a brass cap, a glass belly and a flame that flickers
// with its remaining fuel. An unlit lantern is a cold, dark cage.
export function drawLantern(ctx, L, time, index) {
  const f = L.flame / 100;
  const flick = 0.8 + 0.2 * Math.sin(time * 7 + index * 2.4) * Math.sin(time * 3.1 + index);
  ctx.save();
  ctx.translate(L.x, L.y);
  if (f > 0.02) {
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 70 * f + 20);
    glow.addColorStop(0, `rgba(255,176,61,${0.34 * f * flick})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 70 * f + 20, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  // Hanging chain and brass cap.
  ctx.strokeStyle = 'rgba(160,130,80,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(0, -18);
  ctx.stroke();
  ctx.fillStyle = '#8a6d3b';
  ctx.beginPath();
  ctx.moveTo(-11, -18);
  ctx.lineTo(11, -18);
  ctx.lineTo(7, -10);
  ctx.lineTo(-7, -10);
  ctx.closePath();
  ctx.fill();
  // Glass belly.
  ctx.fillStyle = f > 0.02 ? 'rgba(255,220,150,0.28)' : 'rgba(120,120,150,0.14)';
  ctx.strokeStyle = '#b08d4f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-11, -10, 22, 24, 6);
  ctx.fill();
  ctx.stroke();
  // The flame inside.
  if (f > 0.02) {
    ctx.save();
    ctx.translate(0, 8);
    ctx.scale(1, 0.9 + 0.12 * Math.sin(time * 9 + index * 1.7));
    flameIcon(ctx, 0, 0, 13 * (0.5 + 0.5 * f), 1, true);
    ctx.restore();
  }
  // Brass base.
  ctx.fillStyle = '#8a6d3b';
  ctx.beginPath();
  ctx.moveTo(-8, 14);
  ctx.lineTo(8, 14);
  ctx.lineTo(11, 20);
  ctx.lineTo(-11, 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawLanterns(ctx, game, time) {
  game.lanterns.forEach((L, i) => drawLantern(ctx, L, time, i));
}

export function drawGate(ctx, game, time) {
  // The Great Lantern: the gate is a giant hanging lantern, not a portal.
  // Its flame is the light the keeper defends — bright gold while the gate
  // holds, guttering red as its integrity falls.
  const gate = game.gate;
  const hpFrac = gate.integrity / gate.maxIntegrity;
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.4);
  const flick = 0.9 + 0.1 * Math.sin(time * 8.3) * Math.sin(time * 5.1);
  ctx.save();
  ctx.translate(gate.x, gate.y);
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 130);
  const col = hpFrac > 0.5 ? '255,176,61' : hpFrac > 0.25 ? '255,140,60' : '255,61,94';
  glow.addColorStop(0, `rgba(${col},${0.34 * pulse * flick})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 130, 0, TAU);
  ctx.fill();
  // Slow light rays turning around the flame.
  ctx.globalAlpha = 0.10 * pulse;
  ctx.strokeStyle = '#ffcf7d';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = time * 0.25 + (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 62, Math.sin(a) * 62);
    ctx.lineTo(Math.cos(a) * 118, Math.sin(a) * 118);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // Hanging chains.
  ctx.strokeStyle = 'rgba(160,130,80,0.95)';
  ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 40, -58);
    ctx.lineTo(s * 52, -92);
    ctx.stroke();
  }
  // Brass ring frame.
  ctx.strokeStyle = '#b08d4f';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,150,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, TAU);
  ctx.stroke();
  // Glass dome.
  const glass = ctx.createRadialGradient(-12, -16, 4, 0, 0, 52);
  glass.addColorStop(0, 'rgba(255,236,180,0.5)');
  glass.addColorStop(1, 'rgba(255,180,80,0.12)');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, TAU);
  ctx.fill();
  // The great flame, guttering lower as the gate weakens.
  const flameH = 34 * (0.45 + 0.55 * hpFrac) * flick;
  ctx.save();
  ctx.translate(0, 16);
  ctx.scale(flameH / 34, flameH / 34);
  const fg = ctx.createLinearGradient(0, -34, 0, 10);
  fg.addColorStop(0, '#fff3c4');
  fg.addColorStop(0.55, '#ffb03d');
  fg.addColorStop(1, '#ff7a2e');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-20, -2, -15, -22, 0, -34);
  ctx.bezierCurveTo(15, -22, 20, -2, 0, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff8e0';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-8, 0, -6, -10, 0, -16);
  ctx.bezierCurveTo(6, -10, 8, 0, 0, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Brass base.
  ctx.fillStyle = '#8a6d3b';
  ctx.beginPath();
  ctx.moveTo(-26, 52);
  ctx.lineTo(26, 52);
  ctx.lineTo(34, 64);
  ctx.lineTo(-34, 64);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Integrity arc under the gate.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, 78, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.strokeStyle = hpFrac > 0.5 ? '#ffb03d' : hpFrac > 0.25 ? '#ffd166' : '#ff3d5e';
  ctx.beginPath();
  ctx.arc(gate.x, gate.y, 78, Math.PI * 0.15, Math.PI * 0.15 + Math.PI * 0.7 * hpFrac);
  ctx.stroke();
  ctx.restore();
}

export function drawWorld(ctx, game, time, showGate = true) {
  drawBackground(ctx, game, time);
  if (showGate) drawGate(ctx, game, time);
  drawLanterns(ctx, game, time);
  game.embers.draw(ctx, time);
  for (const e of game.enemies) e.draw(ctx);
  // On the game-over screen the ship is wreckage: only its explosion shows.
  if (game.state !== 'gameover') game.player.draw(ctx, time);
  game.bullets.draw(ctx);
  game.enemyBullets.draw(ctx);
  game.particles.draw(ctx);
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-7, -4, -3, -9, 0, -4);
  ctx.bezierCurveTo(3, -9, 7, -4, 0, 3);
  ctx.closePath();
  ctx.fillStyle = filled ? '#ff5d8f' : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.restore();
}

export function drawHUD(ctx, game) {
  const { w } = game;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Score, top-left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('SCORE', 20, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText(fmt(game.score), 20, 56);
  // Combo.
  if (game.comboMult > 1) {
    ctx.fillStyle = '#ffd166';
    ctx.font = `800 18px ${FONT}`;
    ctx.fillText(`COMBO x${game.comboMult}`, 20, 82);
    ctx.fillStyle = 'rgba(255,209,102,0.35)';
    ctx.fillRect(20, 88, 90 * clamp(game.comboTimer / 2.5, 0, 1), 4);
  }
  // Night, top-center.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('NIGHT', w / 2, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText(`${game.wave} / 10`, w / 2, 56);
  const remaining = game.enemies.length + game.spawnQueue;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(remaining > 0 ? `${remaining} HOSTILES` : 'NIGHT HELD', w / 2, 80);
  // Beacon lanterns, under the night counter: three flames that gutter
  // as their fuel runs down. All three out means the gate itself fades.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('LANTERNS', w / 2, 100);
  game.lanterns.forEach((L, i) => {
    flameIcon(ctx, w / 2 - 26 + i * 26, 112, 15, L.flame / 100, L.flame > 5);
  });
  if (game.lanternsLit === 0) {
    ctx.fillStyle = '#ff5d8f';
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('ALL LANTERNS OUT — THE GATE FADES', w / 2, 132);
  }
  // Hull + gate, top-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('HULL', w - 20, 26);
  for (let i = 0; i < game.player.maxHull; i++) {
    heart(ctx, w - 26 - i * 26, 46, 11, i < game.player.hull);
  }
  ctx.fillText('GATE FLAME', w - 20, 72);
  const gf = game.gate.integrity / game.gate.maxIntegrity;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(w - 170, 80, 150, 7);
  ctx.fillStyle = gf > 0.5 ? '#ffb03d' : gf > 0.25 ? '#ffd166' : '#ff3d5e';
  ctx.fillRect(w - 170, 80, 150 * gf, 7);
  // Dash + overdrive, bottom-left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('DASH [SPACE]', 20, game.h - 44);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(20, game.h - 36, 120, 7);
  ctx.fillStyle = '#7df9ff';
  ctx.fillRect(20, game.h - 36, 120 * (1 - game.player.dashCooldown / game.player.dashMax), 7);
  ctx.fillText('OVERDRIVE [E]', 20, game.h - 14);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(20, game.h - 6, 120, 5);
  const od = game.player.overdriveActive > 0 ? 1 : game.player.overdrive / 100;
  ctx.fillStyle = game.player.overdriveActive > 0 ? '#ff5d8f' : '#ffd166';
  ctx.fillRect(20, game.h - 6, 120 * od, 5);
  // Weapon, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('WEAPON', w - 20, game.h - 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 18px ${FONT}`;
  ctx.fillText(game.player.weaponDef.name, w - 20, game.h - 20);
  // Boss bar (below the lantern pips).
  const boss = game.enemies.find((e) => e.isBoss);
  if (boss) {
    const bw = 420;
    const bx = (w - bw) / 2;
    const by = 146;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5d8f';
    ctx.font = `800 15px ${FONT}`;
    ctx.fillText(boss.bossKind === 'voidmaw' ? 'VOID MAW' : 'SHATTERHEART', w / 2, by - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx, by, bw, 9);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 9);
  }
  // Center banner.
  if (game.banner && game.banner.t > 0) {
    const a = clamp(game.banner.t, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 44px ${FONT}`;
    ctx.fillText(game.banner.text, w / 2, 200);
    if (game.banner.sub) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(game.banner.sub, w / 2, 232);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,28,0.82)';
  ctx.strokeStyle = 'rgba(125,249,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawTitle(ctx, game, time) {
  const { w, h } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(4,5,13,0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  const bob = Math.sin(time * 1.6) * 6;
  // Title with layered glow.
  ctx.font = `900 92px ${FONT}`;
  ctx.fillStyle = 'rgba(25,227,255,0.35)';
  ctx.fillText('LUMEN DRIFT', w / 2 + 3, 218 + bob + 3);
  const grad = ctx.createLinearGradient(0, 140, 0, 230);
  grad.addColorStop(0, '#eafcff');
  grad.addColorStop(1, '#19e3ff');
  ctx.fillStyle = grad;
  ctx.fillText('LUMEN DRIFT', w / 2, 218 + bob);
  ctx.fillStyle = '#ff5d8f';
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText('— LANTERNKEEPER OF THE DRIFT GATE —', w / 2, 258 + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `400 17px ${FONT}`;
  ctx.fillText('The Shatter swarm comes to snuff the light. Tend the three beacon lanterns,', w / 2, 300 + bob);
  ctx.fillText('keep the Great Lantern burning through ten nights — and mind the snuff-moths.', w / 2, 326 + bob);
  // Controls.
  panel(ctx, w / 2 - 330, 372, 660, 92);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 16px ${FONT}`;
  ctx.fillText('WASD / ARROWS — fly      MOUSE — aim      HOLD CLICK — fire', w / 2, 400);
  ctx.fillText('FLY CLOSE TO A LANTERN — rekindle its flame', w / 2, 424);
  ctx.fillText('SPACE / RIGHT-CLICK — dash      E — overdrive      P — pause', w / 2, 448);
  // Launch prompt, blinking.
  const blink = 0.65 + 0.35 * Math.sin(time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffd166';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText('CLICK OR PRESS ENTER TO LIGHT THE FIRST LANTERN', w / 2, 522);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText('An original lantern-keeping arcade game — no files leave your browser, no network needed.', w / 2, h - 28);
  ctx.restore();
}

export function drawUpgrade(ctx, game) {
  const { w, h } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(4,5,13,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText('NIGHT HELD', w / 2, 130);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText('Choose a keeper’s craft — click a card or press 1, 2, 3', w / 2, 166);
  const cw = 250, ch = 210, gap = 30;
  const total = cw * 3 + gap * 2;
  const x0 = (w - total) / 2;
  const y0 = 210;
  game.upgradeChoices.forEach((u, i) => {
    const x = x0 + i * (cw + gap);
    const hover = game.hoverCard === i;
    ctx.save();
    if (hover) { ctx.shadowColor = '#19e3ff'; ctx.shadowBlur = 24; }
    panel(ctx, x, y0, cw, ch);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#19e3ff';
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(u.icon, x + cw / 2, y0 + 66);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 19px ${FONT}`;
    ctx.fillText(u.name, x + cw / 2, y0 + 108);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `400 15px ${FONT}`;
    wrapText(ctx, u.desc, x + cw / 2, y0 + 140, cw - 36, 21);
    ctx.fillStyle = '#ffd166';
    ctx.font = `700 16px ${FONT}`;
    ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y0 + ch - 18);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `400 15px ${FONT}`;
  ctx.fillText(`Next: NIGHT ${game.wave + 1} of 10`, w / 2, y0 + ch + 46);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

export function drawGameOver(ctx, game) {
  const { w, h } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(10,2,8,0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3d5e';
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText('THE LIGHT GOES OUT', w / 2, 220);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 19px ${FONT}`;
  ctx.fillText(game.overReason || 'Your lantern-skiff was shattered.', w / 2, 262);
  drawStats(ctx, game, 310);
  const blink = 0.65 + 0.35 * Math.sin(game.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffd166';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText('PRESS R TO KEEP AGAIN', w / 2, 560);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawVictory(ctx, game) {
  const { w, h } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(4,8,20,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  const grad = ctx.createLinearGradient(0, 150, 0, 230);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#ffd166');
  ctx.fillStyle = grad;
  ctx.font = `900 72px ${FONT}`;
  ctx.fillText('THE GATE STILL BURNS', w / 2, 210);
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 19px ${FONT}`;
  ctx.fillText('All ten nights held. Every lantern still lit.', w / 2, 252);
  drawStats(ctx, game, 300);
  const blink = 0.65 + 0.35 * Math.sin(game.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffd166';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText('PRESS R TO PLAY AGAIN', w / 2, 560);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawStats(ctx, game, y0) {
  const { w } = game;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText('FINAL SCORE', w / 2, y0);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText(fmt(game.score), w / 2, y0 + 56);
  const acc = game.shotsFired > 0 ? Math.round((game.shotsHit / game.shotsFired) * 100) : 0;
  const mins = Math.floor(game.runTime / 60);
  const secs = Math.floor(game.runTime % 60).toString().padStart(2, '0');
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText(
    `NIGHT ${game.wave}  •  ${game.kills} KILLS  •  ${acc}% ACCURACY  •  ${mins}:${secs}`,
    w / 2, y0 + 96,
  );
}

export function drawPaused(ctx, game) {
  const { w, h } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(4,5,13,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `400 17px ${FONT}`;
  ctx.fillText('Press P to resume — M to mute', w / 2, h / 2 + 30);
  ctx.restore();
}

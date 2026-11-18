// player.js — the Lumen light-ship: thrust movement, mouse aim, dash with
// i-frames, and the weapon rack the upgrade cards improve.
import { TAU, clamp, angleTo } from './utils.js';

export const WEAPONS = {
  pulse: { name: 'PULSE LAMP', rate: 8, speed: 780, damage: 1, spread: 0, count: 1, pierce: false, color: '#7df9ff' },
  twin: { name: 'TWIN WICKS', rate: 8, speed: 820, damage: 1, spread: 0, count: 2, pierce: false, color: '#7df9ff' },
  spread: { name: 'TRINE FAN', rate: 7, speed: 760, damage: 1, spread: 0.22, count: 3, pierce: false, color: '#ffd166' },
  rail: { name: 'LONGFLAME LANCE', rate: 3.4, speed: 1150, damage: 3, spread: 0, count: 1, pierce: true, color: '#ff5d8f' },
};

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = 14;
    this.angle = -Math.PI / 2;
    this.hull = 3;
    this.maxHull = 3;
    this.weapon = 'pulse';
    this.damageBonus = 0;
    this.fireRateBonus = 0;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashMax = 2.2;
    this.invuln = 0;
    this.magnet = 90;
    this.overdrive = 0; // 0..100, full at 100
    this.overdriveActive = 0;
    // Ember Glass: bubble charges. Start with 3; embers refill them
    // (every 6th ember picked up restores one charge, see main.js).
    this.bubbleCharges = 3;
    this.bubbleMax = 3;
    this.bubbleCooldown = 0;
    // Brass Depths: relic-driven stats, all 1.0 / 0 by default and raised
    // by relics only (see relics.js). speedMul scales thrust speed,
    // overdriveMul scales meter gain, invulnBonus extends post-hit
    // invulnerability, comboBonus lengthens the combo window.
    // Revision 5: upgrade-card stats, all 0 / default and raised by
    // cards only. chainBonus/shatterBonusR widen the Ember Glass shatter,
    // mineBonus hardens drift-mine blasts, rekindleBonus speeds lantern
    // rekindling, emberPerCharge sets the ember-to-bubble rate (6 by
    // default, 4 with QUICK GLASS), emberScoreBonus adds score per ember.
    this.chainBonus = 0;
    this.shatterBonusR = 0;
    this.mineBonus = 0;
    this.rekindleBonus = 0;
    this.emberPerCharge = 6;
    this.emberScoreBonus = 0;
    this.thrusting = false;
  }

  get weaponDef() { return WEAPONS[this.weapon]; }

  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    // Base stats are restored every run: hull, bubble and magnet caps
    // raised by upgrade cards or relics belong to one run only.
    this.maxHull = 3;
    this.hull = this.maxHull;
    this.bubbleMax = 3;
    this.magnet = 90;
    this.weapon = 'pulse';
    this.damageBonus = 0; this.fireRateBonus = 0;
    this.dashCooldown = 0; this.invuln = 0;
    this.overdrive = 0; this.overdriveActive = 0;
    this.bubbleCharges = this.bubbleMax;
    this.bubbleCooldown = 0;
    this.speedMul = 1; this.overdriveMul = 1;
    this.invulnBonus = 0; this.comboBonus = 0;
    this.chainBonus = 0; this.shatterBonusR = 0;
    this.mineBonus = 0; this.rekindleBonus = 0;
    this.emberPerCharge = 6; this.emberScoreBonus = 0;
  }

  update(dt, input, aimX, aimY, world) {
    const accel = 2400;
    let ax = 0, ay = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) ay -= 1;
    if (input.down('KeyS') || input.down('ArrowDown')) ay += 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) ax -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) ax += 1;
    const len = Math.hypot(ax, ay);
    if (len > 0) { ax /= len; ay /= len; }
    this.thrusting = len > 0;
    const dashing = this.dashTimer > 0;
    const speed = (dashing ? 900 : (this.overdriveActive > 0 ? 520 : 430)) * this.speedMul;
    this.vx += ax * accel * dt;
    this.vy += ay * accel * dt;
    const v = Math.hypot(this.vx, this.vy);
    if (v > speed) { this.vx = (this.vx / v) * speed; this.vy = (this.vy / v) * speed; }
    this.vx *= Math.pow(0.12, dt);
    this.vy *= Math.pow(0.12, dt);
    this.x = clamp(this.x + this.vx * dt, 24, world.w - 24);
    this.y = clamp(this.y + this.vy * dt, 24, world.h - 24);
    this.angle = angleTo(this.x, this.y, aimX, aimY);
    this.fireTimer -= dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.overdriveActive = Math.max(0, this.overdriveActive - dt);
    this.bubbleCooldown = Math.max(0, this.bubbleCooldown - dt);
    // Dash is Space only now: right-click / Shift belong to the
    // ember-glass bubble, so one input can never fire both at once.
    if (input.wasPressed('Space') && this.dashCooldown <= 0) {
      this.startDash();
    }
  }

  startDash() {
    this.dashTimer = 0.22;
    this.dashCooldown = this.dashMax;
    this.invuln = Math.max(this.invuln, 0.4);
    const dx = Math.cos(this.angle), dy = Math.sin(this.angle);
    this.vx = dx * 900;
    this.vy = dy * 900;
  }

  // Ember Glass: spend one charge to blow a bubble, or null while cooling
  // down / out of charges. The bubble itself is spawned by the Game.
  tryBubble() {
    if (this.bubbleCooldown > 0 || this.bubbleCharges <= 0) return null;
    this.bubbleCooldown = 0.7;
    this.bubbleCharges--;
    return this.angle;
  }

  // Returns an array of bullet specs to spawn (empty while cooling down).
  tryFire() {
    const w = this.weaponDef;
    const rate = (w.rate + this.fireRateBonus) * (this.overdriveActive > 0 ? 1.8 : 1);
    if (this.fireTimer > 0) return [];
    this.fireTimer = 1 / rate;
    const shots = [];
    const n = w.count;
    for (let i = 0; i < n; i++) {
      let a = this.angle;
      if (n > 1 && w.spread === 0) {
        // Twin lance: parallel bolts offset sideways.
        const off = (i - (n - 1) / 2) * 12;
        const px = this.x + Math.cos(this.angle + Math.PI / 2) * off;
        const py = this.y + Math.sin(this.angle + Math.PI / 2) * off;
        shots.push({ x: px, y: py, angle: a, speed: w.speed, damage: w.damage + this.damageBonus, pierce: w.pierce, color: w.color });
      } else {
        a += (i - (n - 1) / 2) * w.spread;
        shots.push({
          x: this.x + Math.cos(a) * 20, y: this.y + Math.sin(a) * 20,
          angle: a, speed: w.speed, damage: w.damage + this.damageBonus, pierce: w.pierce, color: w.color,
        });
      }
    }
    return shots;
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.invuln > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.rotate(this.angle);
    // Engine glow + thrust flame.
    ctx.globalCompositeOperation = 'lighter';
    const flame = this.thrusting ? 14 + Math.random() * 8 : 7;
    const fg = ctx.createRadialGradient(-12, 0, 0, -12, 0, flame + 8);
    fg.addColorStop(0, 'rgba(125,249,255,0.9)');
    fg.addColorStop(1, 'rgba(125,249,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(-12, 0, flame + 8, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Hull: a swept arrow-ship with a bright core.
    ctx.fillStyle = '#0e2a3d';
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#eafcff';
    ctx.beginPath();
    ctx.arc(4, 0, 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    // The keeper's own lantern, hung below the skiff in world space so it
    // always hangs down, swaying gently with a warm flame inside.
    const sway = Math.sin(time * 2.2) * 2;
    ctx.save();
    ctx.translate(this.x + sway, this.y);
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(0, 22, 0, 0, 22, 26);
    lg.addColorStop(0, 'rgba(255,176,61,0.4)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(0, 22, 26, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(160,130,80,0.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, 16);
    ctx.stroke();
    ctx.fillStyle = '#8a6d3b';
    ctx.beginPath();
    ctx.moveTo(-5, 16);
    ctx.lineTo(5, 16);
    ctx.lineTo(4, 19);
    ctx.lineTo(-4, 19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,0.35)';
    ctx.strokeStyle = '#b08d4f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-5, 19, 10, 11, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb03d';
    ctx.beginPath();
    ctx.moveTo(0, 29);
    ctx.quadraticCurveTo(-3, 25, 0, 21);
    ctx.quadraticCurveTo(3, 25, 0, 29);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Dash cooldown ring.
    if (this.dashCooldown > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(125,249,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - this.dashCooldown / this.dashMax));
      ctx.stroke();
      ctx.restore();
    }
  }
}

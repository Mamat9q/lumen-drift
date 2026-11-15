// player.js — the Lumen light-ship: thrust movement, mouse aim, dash with
// i-frames, and the weapon rack the upgrade cards improve.
import { TAU, clamp, angleTo } from './utils.js';

export const WEAPONS = {
  pulse: { name: 'PULSE CANNON', rate: 8, speed: 780, damage: 1, spread: 0, count: 1, pierce: false, color: '#7df9ff' },
  twin: { name: 'TWIN LANCE', rate: 8, speed: 820, damage: 1, spread: 0, count: 2, pierce: false, color: '#7df9ff' },
  spread: { name: 'TRINE SPREAD', rate: 7, speed: 760, damage: 1, spread: 0.22, count: 3, pierce: false, color: '#ffd166' },
  rail: { name: 'RAIL LANCE', rate: 3.4, speed: 1150, damage: 3, spread: 0, count: 1, pierce: true, color: '#ff5d8f' },
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
    this.thrusting = false;
  }

  get weaponDef() { return WEAPONS[this.weapon]; }

  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hull = this.maxHull;
    this.weapon = 'pulse';
    this.damageBonus = 0; this.fireRateBonus = 0;
    this.dashCooldown = 0; this.invuln = 0;
    this.overdrive = 0; this.overdriveActive = 0;
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
    const speed = dashing ? 900 : (this.overdriveActive > 0 ? 520 : 430);
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
    if ((input.wasPressed('Space') || input.wasPressed('ShiftLeft') || input.rightDown) && this.dashCooldown <= 0) {
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

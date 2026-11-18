// enemies.js — the Shatter swarm. Six kinds plus two bosses, all steering
// toward the Drift Gate (or the player when close), with distinct shapes,
// speeds and attacks so every night reads differently at a glance.
// Snuff-moths are different: they fly straight for the beacon lanterns and
// snuff them out — the keeper has to chase them down.
import { TAU, clamp, angleTo, rand, pick } from './utils.js';

export const KINDS = {
  mote: { hp: 1, speed: 150, r: 10, score: 50, color: '#ff5d8f', shape: 'diamond', gateDmg: 4, name: 'CINDER' },
  dart: { hp: 2, speed: 120, r: 13, score: 100, color: '#ff8a3d', shape: 'triangle', gateDmg: 6, name: 'EMBER DART' },
  spitter: { hp: 3, speed: 70, r: 14, score: 150, color: '#c77dff', shape: 'hex', gateDmg: 6, name: 'HEX SPITTER' },
  splitter: { hp: 4, speed: 85, r: 17, score: 200, color: '#ffd166', shape: 'square', gateDmg: 8, name: 'SPLITTER' },
  bulwark: { hp: 12, speed: 42, r: 24, score: 300, color: '#ff3d5e', shape: 'octagon', gateDmg: 14, name: 'BULWARK' },
  snuff: { hp: 2, speed: 105, r: 12, score: 125, color: '#8a7cff', shape: 'moth', gateDmg: 4, name: 'SNUFF-MOTH' },
};

let nextId = 1;

export class Enemy {
  constructor(kind, x, y, rng) {
    const def = KINDS[kind];
    this.id = nextId++;
    this.kind = kind;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.r = def.r;
    this.speed = def.speed * (0.9 + rng() * 0.2);
    this.score = def.score;
    this.color = def.color;
    this.shape = def.shape;
    this.name = def.name;
    this.gateDmg = def.gateDmg;
    this.angle = 0;
    this.spin = (rng() - 0.5) * 2;
    this.flash = 0;
    // Ember Glass: seconds left trapped inside a glass bubble. While
    // trapped the enemy floats, frozen — it cannot steer, shoot or snuff.
    // Bosses are never trapped (see main.js); they only take shatter damage.
    this.trapped = 0;
    this.shootTimer = 1 + rng() * 1.5;
    this.wobble = rng() * TAU;
    this.isBoss = false;
  }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt);
    this.wobble += dt * 3;
    // Trapped in glass: float gently upward, frozen. No steering, no
    // shooting, no snuffing — the bubble is the only thing moving it.
    if (this.trapped > 0) {
      this.trapped = Math.max(0, this.trapped - dt);
      this.y -= 20 * dt;
      this.angle += this.spin * dt * 0.3;
      return;
    }
    const gx = game.gate.x, gy = game.gate.y;
    const dp = Math.hypot(game.player.x - this.x, game.player.y - this.y);
    // A snuff-moth ignores the player and the gate: it flies for the
    // nearest lit beacon lantern and dies snuffing it out.
    if (this.kind === 'snuff' && game.lanterns) {
      let best = null, bd = Infinity;
      for (const L of game.lanterns) {
        if (L.flame <= 5) continue;
        const d = Math.hypot(L.x - this.x, L.y - this.y);
        if (d < bd) { bd = d; best = L; }
      }
      if (best) {
        const a = angleTo(this.x, this.y, best.x, best.y) + Math.sin(this.wobble) * 0.15;
        this.vx = Math.cos(a) * this.speed;
        this.vy = Math.sin(a) * this.speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle += this.spin * dt;
        return;
      }
    }
    // Chasers hunt the player when close; everyone drifts to the gate.
    let tx = gx, ty = gy;
    if (this.kind !== 'bulwark' && dp < 240) { tx = game.player.x; ty = game.player.y; }
    const a = angleTo(this.x, this.y, tx, ty) + Math.sin(this.wobble) * 0.25;
    const sp = this.kind === 'spitter' && dp < 300 ? this.speed * 0.4 : this.speed;
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.spin * dt;
    if (this.kind === 'spitter') {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0 && dp < 460) {
        this.shootTimer = 2.4;
        const aa = angleTo(this.x, this.y, game.player.x, game.player.y);
        game.spawnEnemyBullet(this.x, this.y, aa, 220, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    const r = this.r;
    ctx.beginPath();
    if (this.shape === 'moth') {
      // Two beating wings and a slim body — a moth drawn to the flame.
      const flap = Math.sin(this.wobble * 2) * 0.35;
      ctx.moveTo(0, -r * 0.4);
      ctx.quadraticCurveTo(r * 1.1, -r * (1.1 + flap), r * 0.9, r * 0.2);
      ctx.quadraticCurveTo(r * 0.5, r * 0.7, 0, r * 0.4);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.7, -r * 0.9, r * 0.2);
      ctx.quadraticCurveTo(-r * 1.1, -r * (1.1 + flap), 0, -r * 0.4);
    } else if (this.shape === 'diamond') {
      ctx.moveTo(r, 0); ctx.lineTo(0, r * 0.7); ctx.lineTo(-r, 0); ctx.lineTo(0, -r * 0.7);
    } else if (this.shape === 'triangle') {
      ctx.moveTo(r, 0); ctx.lineTo(-r * 0.8, r * 0.8); ctx.lineTo(-r * 0.8, -r * 0.8);
    } else if (this.shape === 'square') {
      ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
    } else if (this.shape === 'octagon') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, TAU);
    ctx.fill();
    ctx.restore();
    // The glass bubble around a trapped enemy: bright rim, faint fill, glint.
    if (this.trapped > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(174,233,255,0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 10, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(174,233,255,0.12)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 10, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(this.x - (this.r + 10) * 0.35, this.y - (this.r + 10) * 0.4, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (this.hp < this.maxHp && !this.isBoss) {
      const w = this.r * 2;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(this.x - w / 2, this.y - this.r - 9, w, 3);
      ctx.fillStyle = '#7df9ff';
      ctx.fillRect(this.x - w / 2, this.y - this.r - 9, w * (this.hp / this.maxHp), 3);
    }
  }
}

export class Boss extends Enemy {
  constructor(kind, x, y, rng) {
    super(kind === 'voidmaw' ? 'bulwark' : 'bulwark', x, y, rng);
    this.isBoss = true;
    this.bossKind = kind;
    this.r = 42;
    this.speed = 34;
    this.maxHp = kind === 'voidmaw' ? 240 : 130;
    this.hp = this.maxHp;
    this.score = kind === 'voidmaw' ? 5000 : 2500;
    this.color = kind === 'voidmaw' ? '#b517ff' : '#ff2e63';
    this.shape = 'octagon';
    this.gateDmg = 30;
    this.burstTimer = 2.2;
    this.summonTimer = 5;
    this.chargeTimer = 6;
    this.charging = 0;
  }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt);
    this.angle += dt * 0.5;
    const gx = game.gate.x, gy = game.gate.y;
    const a = angleTo(this.x, this.y, gx, gy);
    if (this.charging > 0) {
      this.charging -= dt;
      this.x += Math.cos(a) * 340 * dt;
      this.y += Math.sin(a) * 340 * dt;
      return;
    }
    this.x += Math.cos(a) * this.speed * dt;
    this.y += Math.sin(a) * this.speed * dt;
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = this.bossKind === 'voidmaw' ? 1.7 : 2.4;
      const n = this.bossKind === 'voidmaw' ? 12 : 8;
      for (let i = 0; i < n; i++) {
        const aa = (i / n) * TAU + this.angle;
        game.spawnEnemyBullet(this.x, this.y, aa, 190, 1);
      }
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = 6;
      for (let i = 0; i < 3; i++) game.spawnEnemy('mote', this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 80);
    }
    if (this.bossKind === 'voidmaw') {
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) { this.chargeTimer = 7; this.charging = 0.8; }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r + 26);
    g.addColorStop(0, this.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, this.r + 26, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.rotate(this.angle);
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const px = Math.cos(a) * this.r, py = Math.sin(a) * this.r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0b1030';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// Pick a spawn point on the arena edge, away from the player.
export function edgeSpawn(world, rng, margin = 30) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: rand(rng, 0, world.w), y: margin };
  if (side === 1) return { x: rand(rng, 0, world.w), y: world.h - margin };
  if (side === 2) return { x: margin, y: rand(rng, 0, world.h) };
  return { x: world.w - margin, y: rand(rng, 0, world.h) };
}

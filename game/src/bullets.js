// bullets.js — projectile pools for the player and the swarm, plus the
// ember pickups enemies drop. All collision is circle tests, resolved in
// main.js so the pools stay dumb and fast.
import { TAU } from './utils.js';

export class BulletPool {
  constructor() { this.items = []; }
  spawn(x, y, angle, speed, damage, pierce, color, friendly) {
    this.items.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      damage, pierce, color, friendly,
      r: friendly ? 4 : 6, life: friendly ? 1.4 : 6, hitSet: pierce ? new Set() : null,
    });
  }
  update(dt, world) {
    for (const b of this.items) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this.items = this.items.filter((b) => b.life > 0 && b.x > -20 && b.x < world.w + 20 && b.y > -20 && b.y < world.h + 20);
  }
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.items) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.friendly ? 3 : 4;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.friendly ? 1.6 : 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class EmberPool {
  constructor() { this.items = []; }
  spawn(x, y, rng) {
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      this.items.push({
        x, y,
        vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
        r: 5, life: 9, kind: rng() < 0.06 ? 'heart' : 'ember',
      });
    }
  }
  update(dt, player, world) {
    for (const s of this.items) {
      const d = Math.hypot(player.x - s.x, player.y - s.y);
      if (d < player.magnet) {
        const a = Math.atan2(player.y - s.y, player.x - s.x);
        s.vx += Math.cos(a) * 1400 * dt;
        s.vy += Math.sin(a) * 1400 * dt;
      }
      s.vx *= Math.pow(0.1, dt);
      s.vy *= Math.pow(0.1, dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.items = this.items.filter((s) => s.life > 0);
  }
  draw(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.items) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 6 + s.x);
      if (s.kind === 'heart') {
        ctx.fillStyle = `rgba(255,93,143,${pulse})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 7, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', s.x, s.y + 0.5);
      } else {
        // A live ember: a tiny flame diamond, warm gold.
        ctx.fillStyle = `rgba(255,176,61,${pulse})`;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(4, -1, 0, 6);
        ctx.quadraticCurveTo(-4, -1, 0, -6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = `rgba(255,243,196,${pulse})`;
        ctx.beginPath();
        ctx.arc(0, 1, 2, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }
}

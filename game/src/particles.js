// particles.js — explosions, thrust trails, shockwave rings, floating score
// text and the parallax starfield. Everything is additive glow: cheap,
// bright, and readable at a glance in a screenshot.
import { TAU, rand } from './utils.js';

export class ParticleSystem {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.shake = 0;
  }

  burst(x, y, color, count, speed, life = 0.7, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.6), maxLife: life,
        size: size * (0.6 + Math.random() * 0.8), color, drag: 0.92,
      });
    }
  }

  trail(x, y, color, size = 2.5) {
    this.parts.push({
      x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
      life: 0.35, maxLife: 0.35, size, color, drag: 0.9,
    });
  }

  ring(x, y, color, maxR = 90) {
    this.rings.push({ x, y, r: 6, maxR, color, life: 0.5, maxLife: 0.5 });
  }

  floatText(x, y, text, color = '#ffd166', size = 16) {
    this.texts.push({ x, y, text, color, size, life: 1.0, maxLife: 1.0 });
  }

  addShake(amount) { this.shake = Math.min(18, this.shake + amount); }

  update(dt) {
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.y -= 42 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) { r.r += (r.maxR - r.r) * dt * 6; r.life -= dt; }
    this.rings = this.rings.filter((r) => r.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, TAU);
      ctx.fill();
    }
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.font = `bold ${t.size}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  shakeOffset() {
    if (this.shake <= 0.2) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shake,
      y: (Math.random() - 0.5) * this.shake,
    };
  }
}

// Three depth layers of stars drifting past, plus slow nebula blobs.
export class Starfield {
  constructor(w, h, rng) {
    this.w = w;
    this.h = h;
    this.layers = [];
    for (let l = 0; l < 3; l++) {
      const stars = [];
      const n = 70 - l * 18;
      for (let i = 0; i < n; i++) {
        stars.push({
          x: rng() * w, y: rng() * h,
          size: 0.6 + (2 - l) * 0.5 + rng() * 0.8,
          tw: rng() * TAU,
        });
      }
      this.layers.push({ speed: 6 + l * 10, stars });
    }
    this.nebulae = [
      { x: w * 0.18, y: h * 0.25, r: 260, color: 'rgba(123,92,255,0.16)' },
      { x: w * 0.85, y: h * 0.7, r: 300, color: 'rgba(255,46,136,0.10)' },
      { x: w * 0.6, y: h * 0.12, r: 220, color: 'rgba(25,227,255,0.09)' },
    ];
  }

  update(dt) {
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        s.y += layer.speed * dt;
        s.tw += dt * 2;
        if (s.y > this.h + 2) { s.y = -2; s.x = Math.random() * this.w; }
      }
    }
  }

  draw(ctx) {
    for (const n of this.nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.save();
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(s.tw);
        ctx.fillStyle = '#cfe8ff';
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    }
    ctx.restore();
  }
}

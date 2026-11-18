// relics.js — the Brass Depths relic set: twelve named keepsakes dredged
// up from the deep, each a permanent run-long effect. A boss always drops
// one; a bulwark drops one 30% of the time. Relics are never lost between
// nights — they are the keeper's growing kit, and the dive chart on the
// title screen shows how deep the run has gone.
import { TAU } from './utils.js';

// Every relic: a measured, named effect. apply(game, player) runs once,
// on pickup, and the effect lasts for the rest of the run.
export const RELICS = [
  { id: 'wick', name: 'BRASS WICK', icon: 'W', desc: '+1 damage on every bolt.', apply: (g, p) => { p.damageBonus += 1; } },
  { id: 'heart', name: 'CLOCKWORK HEART', icon: 'H', desc: '+1 max hull and repair 1 hull.', apply: (g, p) => { p.maxHull += 1; p.hull = Math.min(p.maxHull, p.hull + 1); } },
  { id: 'current', name: 'DEEP CURRENT', icon: 'C', desc: '+15% ship speed.', apply: (g, p) => { p.speedMul *= 1.15; } },
  { id: 'magnet', name: 'MAGNET COIL', icon: 'M', desc: 'Ember magnet reach +60.', apply: (g, p) => { p.magnet += 60; } },
  { id: 'lode', name: 'EMBER LODE', icon: 'O', desc: '+1 ember-glass charge, refill all.', apply: (g, p) => { p.bubbleMax += 1; p.bubbleCharges = p.bubbleMax; } },
  { id: 'coil', name: 'OVERDRIVE COIL', icon: 'E', desc: 'Overdrive fills 25% faster.', apply: (g, p) => { p.overdriveMul *= 1.25; } },
  { id: 'oil', name: 'LANTERN OIL', icon: 'L', desc: 'Beacon lanterns gutter 40% slower.', apply: (g, p) => { g.lanternGutterMul *= 0.6; } },
  { id: 'lens', name: 'SHATTER LENS', icon: 'S', desc: 'Shatter radius +30 and +1 chain hop.', apply: (g, p) => { g.shatterR += 30; g.shatterHops += 1; } },
  { id: 'flame', name: 'TWIN FLAME', icon: 'F', desc: 'Combo window lasts 1s longer.', apply: (g, p) => { p.comboBonus += 1.0; } },
  { id: 'plating', name: 'IRON PLATING', icon: 'I', desc: '+0.6s invulnerability after a hit.', apply: (g, p) => { p.invulnBonus += 0.6; } },
  { id: 'sight', name: 'KEEN SIGHT', icon: 'K', desc: '+10% fire rate.', apply: (g, p) => { p.fireRateBonus += 1; } },
  { id: 'gilded', name: 'GILDED EMBER', icon: 'G', desc: 'Every ember is worth +25 score.', apply: (g, p) => { g.emberBonus += 25; } },
];

export class RelicPool {
  constructor() { this.items = []; }

  // Drop a random relic the run does not own yet. Returns null when the
  // set is complete (all twelve owned).
  spawn(x, y, rng, owned) {
    const pool = RELICS.filter((r) => !owned.some((o) => o.id === r.id));
    if (pool.length === 0) return null;
    const relic = pool[Math.floor(rng() * pool.length)];
    return this.spawnAt(x, y, relic);
  }

  spawnAt(x, y, relic) {
    const item = { x, y, vx: 0, vy: -14, relic, r: 14, life: 25, bob: Math.random() * TAU };
    this.items.push(item);
    return item;
  }

  update(dt, player, game) {
    for (const s of this.items) {
      s.bob += dt * 3;
      const d = Math.hypot(player.x - s.x, player.y - s.y);
      if (d < player.magnet) {
        const a = Math.atan2(player.y - s.y, player.x - s.x);
        s.vx += Math.cos(a) * 1200 * dt;
        s.vy += Math.sin(a) * 1200 * dt;
      }
      s.vx *= Math.pow(0.1, dt);
      s.vy *= Math.pow(0.1, dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (d < s.r + player.r + 6) {
        s.dead = true;
        s.relic.apply(game, player);
        game.relicsOwned.push(s.relic);
        game.particles.burst(s.x, s.y, '#ffd166', 24, 240, 0.8, 3);
        game.particles.ring(s.x, s.y, '#ffd166', 70);
        game.particles.floatText(player.x, player.y - 34, `RELIC: ${s.relic.name}`, '#ffd166', 18);
        game.audio.pickup();
      }
    }
    this.items = this.items.filter((s) => !s.dead && s.life > 0);
  }

  draw(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.items) {
      const bobY = Math.sin(s.bob) * 4;
      const pulse = 0.75 + 0.25 * Math.sin(time * 5 + s.x);
      // Brass ring + gold core + the relic's initial, so it reads at a glance.
      ctx.strokeStyle = `rgba(255,209,102,${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y + bobY, s.r, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,209,102,${0.22 * pulse})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y + bobY, s.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.font = '800 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.relic.icon, s.x, s.y + bobY + 0.5);
    }
    ctx.restore();
  }
}

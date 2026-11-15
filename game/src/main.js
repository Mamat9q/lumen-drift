// main.js — LUMEN DRIFT's Game: the state machine, the loop, collisions,
// the wave director, scoring and the screenshot staging hook.
// Logical world: 1280x720, letterboxed into the window.
import { clamp, mulberry32 } from './utils.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { ParticleSystem, Starfield } from './particles.js';
import { Player } from './player.js';
import { Enemy, Boss, edgeSpawn } from './enemies.js';
import { BulletPool, ShardPool } from './bullets.js';
import { WAVE_TABLE, TOTAL_WAVES, pickUpgrades } from './waves.js';
import * as render from './render.js';
import { stageShot } from './shots.js';

export const WORLD_W = 1280;
export const WORLD_H = 720;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = WORLD_W;
    this.h = WORLD_H;
    this.input = new Input(canvas);
    this.audio = new SoundEngine();
    this.particles = new ParticleSystem();
    this.starfield = new Starfield(this.w, this.h, mulberry32(1234));
    this.player = new Player(this.w / 2, this.h / 2 + 250);
    this.bullets = new BulletPool();
    this.enemyBullets = new BulletPool();
    this.shards = new ShardPool();
    this.enemies = [];
    this.gate = { x: this.w / 2, y: this.h / 2, r: 52, integrity: 100, maxIntegrity: 100 };
    this.state = 'title';
    this.score = 0;
    this.combo = 0;
    this.comboMult = 1;
    this.comboTimer = 0;
    this.wave = 1;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.runTime = 0;
    this.time = 0;
    this.spawnBag = [];
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.banner = null;
    this.upgradeChoices = [];
    this.hoverCard = -1;
    this.overReason = '';
    this.paused = false;
    this.dashSounded = false;
    this.frozen = false;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.statusEl = document.getElementById('status');
    this.resize();
    addEventListener('resize', () => this.resize());
    // Debug / playtest handle: the state a headless driver reads.
    window.__LUMEN = this;
  }

  resize() {
    const cw = innerWidth, ch = innerHeight;
    this.canvas.width = cw;
    this.canvas.height = ch;
    this.scale = Math.min(cw / this.w, ch / this.h);
    this.offsetX = (cw - this.w * this.scale) / 2;
    this.offsetY = (ch - this.h * this.scale) / 2;
  }

  mouseWorld() {
    return {
      x: (this.input.mouseX - this.offsetX) / this.scale,
      y: (this.input.mouseY - this.offsetY) / this.scale,
    };
  }

  setStatus(text) { if (this.statusEl) this.statusEl.textContent = text; }

  start() {
    const params = new URLSearchParams(location.search);
    const shot = params.get('shot');
    if (shot) {
      const seed = Number(params.get('seed') || 7);
      stageShot(this, shot, seed);
      this.frozen = true;
    }
    let last = performance.now();
    const loop = (now) => {
      const dt = clamp((now - last) / 1000, 0, 0.033);
      last = now;
      if (!this.frozen) {
        this.time += dt;
        this.update(dt);
      }
      this.render();
      this.input.endFrame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  startRun() {
    this.score = 0;
    this.combo = 0;
    this.comboMult = 1;
    this.comboTimer = 0;
    this.wave = 1;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.runTime = 0;
    this.gate.integrity = this.gate.maxIntegrity;
    this.player.reset(this.w / 2, this.h / 2 + 170);
    this.enemies = [];
    this.bullets.items = [];
    this.enemyBullets.items = [];
    this.shards.items = [];
    this.particles = new ParticleSystem();
    this.paused = false;
    this.state = 'playing';
    this.audio.ensure();
    this.audio.startMusic();
    this.startWave(1);
    this.setStatus('Wave 1. Defend the Drift Gate.');
  }

  startWave(n) {
    this.wave = n;
    const def = WAVE_TABLE[n - 1];
    this.spawnBag = [];
    for (const [kind, count] of Object.entries(def)) {
      if (kind === 'boss') continue;
      for (let i = 0; i < count; i++) this.spawnBag.push(kind);
    }
    this.spawnQueue = this.spawnBag.length + (def.boss ? 1 : 0);
    this.spawnTimer = 1.0;
    if (def.boss) {
      const p = edgeSpawn(this, Math.random);
      const boss = new Boss(def.boss, p.x, p.y, Math.random);
      this.enemies.push(boss);
      this.spawnQueue = this.spawnBag.length + 1;
      this.banner = { text: 'WARNING', sub: def.boss === 'voidmaw' ? 'VOID MAW APPROACHES' : 'SHATTERHEART APPROACHES', t: 2.6 };
      this.audio.bossAlarm();
    } else {
      this.banner = { text: `WAVE ${n}`, sub: n === TOTAL_WAVES ? 'FINAL WAVE — HOLD THE GATE' : 'HOSTILES INBOUND', t: 2.2 };
    }
  }

  spawnEnemy(kind, x, y) {
    this.enemies.push(new Enemy(kind, x, y, Math.random));
  }

  spawnEnemyBullet(x, y, angle, speed, damage) {
    this.enemyBullets.spawn(x, y, angle, speed, damage, false, '#e0aaff', false);
  }

  damagePlayer(amount) {
    if (this.player.invuln > 0) return;
    this.player.hull -= amount;
    this.player.invuln = 1.2;
    this.particles.addShake(12);
    this.particles.burst(this.player.x, this.player.y, '#ff5d8f', 22, 240, 0.7, 3);
    this.audio.playerHit();
    if (this.player.hull <= 0) this.gameOver('Your light-ship was shattered.');
  }

  killEnemy(e) {
    this.kills++;
    this.score += e.score * this.comboMult;
    this.combo++;
    this.comboTimer = 2.5;
    this.comboMult = Math.min(8, 1 + Math.floor(this.combo / 4));
    this.player.overdrive = Math.min(100, this.player.overdrive + (e.isBoss ? 25 : 4));
    this.particles.burst(e.x, e.y, e.color, e.isBoss ? 70 : 22, e.isBoss ? 380 : 230, 0.8, 3);
    if (e.isBoss) {
      this.particles.ring(e.x, e.y, '#ffd166', 180);
      this.particles.addShake(16);
    }
    this.particles.floatText(e.x, e.y - 10, `+${e.score * this.comboMult}`, '#ffd166', 15);
    this.shards.spawn(e.x, e.y, Math.random);
    this.audio.enemyDie();
    if (e.kind === 'splitter' && !e.isBoss) {
      for (let i = 0; i < 3; i++) {
        const m = new Enemy('mote', e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 30, Math.random);
        this.enemies.push(m);
      }
    }
  }

  gameOver(reason) {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.overReason = reason;
    this.audio.stopMusic();
    this.audio.gameOver();
    this.setStatus(`Game over. ${reason} Final score ${this.score}. Press R to fly again.`);
  }

  victory() {
    this.state = 'victory';
    this.audio.stopMusic();
    this.audio.victory();
    this.setStatus(`Victory! The gate is secured. Final score ${this.score}. Press R to play again.`);
  }

  update(dt) {
    const input = this.input;
    if (input.wasPressed('KeyM')) {
      const muted = this.audio.toggleMute();
      this.setStatus(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.starfield.update(dt);
    this.particles.update(dt);

    if (this.state === 'title') {
      if (input.wasPressed('Enter') || input.mouseClicked) {
        this.audio.ensure();
        this.startRun();
      }
      return;
    }
    if (this.state === 'gameover' || this.state === 'victory') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.mouseClicked) {
        this.audio.ensure();
        this.startRun();
      }
      return;
    }
    if (this.state === 'upgrade') {
      const m = this.mouseWorld();
      const cw = 250, ch = 210, gap = 30;
      const total = cw * 3 + gap * 2;
      const x0 = (this.w - total) / 2;
      const y0 = 210;
      this.hoverCard = -1;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (cw + gap);
        if (m.x >= x && m.x <= x + cw && m.y >= y0 && m.y <= y0 + ch) this.hoverCard = i;
      }
      let chosen = -1;
      if (input.wasPressed('Digit1')) chosen = 0;
      if (input.wasPressed('Digit2')) chosen = 1;
      if (input.wasPressed('Digit3')) chosen = 2;
      if (input.mouseClicked && this.hoverCard >= 0) chosen = this.hoverCard;
      if (chosen >= 0 && this.upgradeChoices[chosen]) {
        this.upgradeChoices[chosen].apply(this.player);
        this.audio.upgrade();
        this.state = 'playing';
        this.startWave(this.wave + 1);
      }
      return;
    }
    if (this.state !== 'playing') return;

    // Pause.
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      this.paused = !this.paused;
      this.setStatus(this.paused ? 'Paused.' : 'Resumed.');
      return;
    }
    if (this.paused) return;

    this.runTime += dt;
    const aim = this.mouseWorld();
    const wasDashing = this.player.dashTimer > 0;
    this.player.update(dt, input, aim.x, aim.y, this);
    if (this.player.dashTimer > 0 && !wasDashing) {
      this.audio.dash();
      this.particles.ring(this.player.x, this.player.y, '#7df9ff', 60);
    }
    if (this.player.thrusting && Math.random() < 0.5) {
      this.particles.trail(this.player.x - Math.cos(this.player.angle) * 14, this.player.y - Math.sin(this.player.angle) * 14, '#19e3ff');
    }
    // Overdrive.
    if (input.wasPressed('KeyE') && this.player.overdrive >= 100 && this.player.overdriveActive <= 0) {
      this.player.overdrive = 0;
      this.player.overdriveActive = 6;
      this.audio.overdrive();
      this.particles.ring(this.player.x, this.player.y, '#ff5d8f', 140);
      this.particles.floatText(this.player.x, this.player.y - 30, 'OVERDRIVE!', '#ff5d8f', 20);
    }
    // Firing.
    if (input.mouseDown) {
      const shots = this.player.tryFire();
      if (shots.length > 0) {
        this.shotsFired += shots.length;
        this.audio.shoot();
        for (const s of shots) {
          this.bullets.spawn(s.x, s.y, s.angle, s.speed, s.damage, s.pierce, s.color, true);
        }
        this.particles.trail(this.player.x + Math.cos(this.player.angle) * 22, this.player.y + Math.sin(this.player.angle) * 22, '#7df9ff', 3);
      }
    }
    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboMult = 1; }
    }
    // Spawn director.
    if (this.spawnBag.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.35, 0.95 - this.wave * 0.05);
        const i = Math.floor(Math.random() * this.spawnBag.length);
        const kind = this.spawnBag.splice(i, 1)[0];
        const p = edgeSpawn(this, Math.random);
        this.spawnEnemy(kind, p.x, p.y);
        this.spawnQueue = this.spawnBag.length;
      }
    }
    // Enemies.
    for (const e of this.enemies) e.update(dt, this);
    this.bullets.update(dt, this);
    this.enemyBullets.update(dt, this);
    this.shards.update(dt, this.player, this);
    this.resolveCollisions();
    // Wave clear.
    if (this.state === 'playing' && this.spawnBag.length === 0 && this.enemies.length === 0) {
      if (this.wave >= TOTAL_WAVES) {
        this.victory();
      } else {
        this.state = 'upgrade';
        this.upgradeChoices = pickUpgrades(Math.random, this.player);
        this.audio.waveClear();
        this.setStatus(`Wave ${this.wave} cleared. Choose an upgrade.`);
      }
    }
  }

  resolveCollisions() {
    const p = this.player;
    // Player bullets vs enemies.
    for (const b of this.bullets.items) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (b.hitSet && b.hitSet.has(e.id)) continue;
        const rr = b.r + e.r;
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < rr * rr) {
          e.hp -= b.damage;
          e.flash = 0.12;
          this.shotsHit++;
          this.particles.burst(b.x, b.y, b.color, 3, 90, 0.25, 2);
          if (b.hitSet) b.hitSet.add(e.id);
          else { b.dead = true; break; }
        }
      }
    }
    this.bullets.items = this.bullets.items.filter((b) => !b.dead);
    // Enemy bullets vs player.
    for (const b of this.enemyBullets.items) {
      if (b.dead) continue;
      const rr = b.r + p.r - 2;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < rr * rr) {
        b.dead = true;
        this.damagePlayer(1);
        if (this.state !== 'playing') return;
      }
    }
    this.enemyBullets.items = this.enemyBullets.items.filter((b) => !b.dead);
    // Enemies vs player (contact) and vs gate.
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dp = Math.hypot(p.x - e.x, p.y - e.y);
      if (dp < e.r + p.r - 2) {
        e.hp -= 3;
        this.damagePlayer(1);
        if (this.state !== 'playing') return;
      }
      const dg = Math.hypot(this.gate.x - e.x, this.gate.y - e.y);
      if (dg < this.gate.r + e.r - 4) {
        e.dead = true;
        this.gate.integrity = Math.max(0, this.gate.integrity - e.gateDmg);
        this.particles.burst(e.x, e.y, '#ff3d5e', 26, 260, 0.7, 3);
        this.particles.addShake(8);
        this.audio.gateHit();
        if (this.gate.integrity <= 0) {
          this.gameOver('The Drift Gate fell.');
          return;
        }
      }
    }
    // Deaths.
    for (const e of this.enemies) {
      if (!e.dead && e.hp <= 0) e.dead = true;
    }
    const dead = this.enemies.filter((e) => e.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const e of dead) this.killEnemy(e);
    // Shards vs player.
    for (const s of this.shards.items) {
      if (s.dead) continue;
      const rr = s.r + p.r + 4;
      if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 < rr * rr) {
        s.dead = true;
        if (s.kind === 'heart') {
          p.hull = Math.min(p.maxHull, p.hull + 1);
          this.particles.floatText(p.x, p.y - 24, '+1 HULL', '#ff5d8f', 16);
        } else {
          this.score += 25 * this.comboMult;
        }
        this.audio.pickup();
      }
    }
    this.shards.items = this.shards.items.filter((s) => !s.dead);
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04050d';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const shake = this.particles.shakeOffset();
    ctx.save();
    ctx.translate(this.offsetX + shake.x, this.offsetY + shake.y);
    ctx.scale(this.scale, this.scale);
    // The gate is the objective in play; on the menu and end screens the
    // starfield alone is the backdrop, so the big text stays clean.
    const inPlay = this.state === 'playing' || this.state === 'upgrade';
    render.drawWorld(ctx, this, this.time, inPlay);
    if (this.state === 'playing' || this.state === 'upgrade') {
      render.drawHUD(ctx, this);
      if (this.state === 'upgrade') render.drawUpgrade(ctx, this);
      if (this.paused) render.drawPaused(ctx, this);
    } else if (this.state === 'title') {
      render.drawTitle(ctx, this, this.time);
    } else if (this.state === 'gameover') {
      render.drawHUD(ctx, this);
      render.drawGameOver(ctx, this);
    } else if (this.state === 'victory') {
      render.drawHUD(ctx, this);
      render.drawVictory(ctx, this);
    }
    ctx.restore();
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.start();

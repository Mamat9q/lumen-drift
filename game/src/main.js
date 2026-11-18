// main.js — LUMEN DRIFT's Game: the state machine, the loop, collisions,
// the wave director, scoring and the screenshot staging hook.
// Logical world: 1280x720, letterboxed into the window.
import { clamp, mulberry32 } from './utils.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { ParticleSystem, Starfield } from './particles.js';
import { Player } from './player.js';
import { Enemy, Boss, edgeSpawn } from './enemies.js';
import { BulletPool, EmberPool } from './bullets.js';
import { RelicPool } from './relics.js';
import { WAVE_TABLE, TOTAL_WAVES, pickUpgrades, realmFor, pickRoads, UPGRADES, REALMS, ROADS } from './waves.js';
import { Workshop } from './workshop.js';
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
    this.embers = new EmberPool();
    this.enemies = [];
    // Brass Depths: the relic pool (dropped keepsakes, run-long effects)
    // and the drift mines — the arena fighting back, more of them the
    // deeper the night. shatterR/shatterHops/lanternGutterMul/emberBonus
    // are relic-modified game stats, reset every run.
    this.relics = new RelicPool();
    this.relicsOwned = [];
    this.hazards = [];
    this.shatterR = 90;
    this.shatterHops = 3;
    this.lanternGutterMul = 1;
    this.emberBonus = 0;
    // Revision 5 — three realms, the branching road, the workshop.
    // realm/realmGutter follow the night (Quench gutters lanterns 1.5x);
    // road holds the run's fork choices (max two: after nights 3 and 6);
    // relicChance is the bulwark relic drop rate (0.3, raised by the
    // Brass Road); roadChoices marks an upgrade screen showing roads.
    this.workshop = new Workshop();
    this.realm = realmFor(1);
    this.realmGutter = 1.0;
    this.road = [];
    this.roadChoices = false;
    this.relicChance = 0.3;
    this.gate = { x: this.w / 2, y: this.h / 2, r: 52, integrity: 100, maxIntegrity: 100 };
    // The three beacon lanterns the keeper tends. A flame gutters down on
    // its own; fly close to rekindle it. If all three go out, the dark
    // creeps in and the gate itself starts to fade.
    this.lanterns = this.makeLanterns();
    this.lanternsLit = 3;
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
    // Ember Glass: the last chain-shatter's kill count, and a short HUD
    // flash so the chain reads even after the floating text fades.
    this.lastChain = 0;
    this.chainFlash = null;
    // Every 6th ember picked up restores one bubble charge.
    this.emberCount = 0;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.statusEl = document.getElementById('status');
    this.resize();
    addEventListener('resize', () => this.resize());
    // Debug / playtest handle: the state a headless driver reads.
    window.__LUMEN = this;
    window.__LUMEN_UPGRADES = UPGRADES;
    window.__LUMEN_REALMS = REALMS;
    window.__LUMEN_ROADS = ROADS;
    window.__LUMEN_REALM_FOR = realmFor;
  }

  resize() {
    const cw = innerWidth, ch = innerHeight;
    this.canvas.width = cw;
    this.canvas.height = ch;
    this.scale = Math.min(cw / this.w, ch / this.h);
    this.offsetX = (cw - this.w * this.scale) / 2;
    this.offsetY = (ch - this.h * this.scale) / 2;
  }

  makeLanterns() {
    return [
      { x: 210, y: 150, flame: 100 },
      { x: 1070, y: 150, flame: 100 },
      { x: 640, y: 630, flame: 100 },
    ];
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
    this.lanterns = this.makeLanterns();
    this.lanternsLit = 3;
    this.lastChain = 0;
    this.chainFlash = null;
    this.emberCount = 0;
    this.relics.items = [];
    this.relicsOwned = [];
    this.hazards = [];
    this.shatterR = 90;
    this.shatterHops = 3;
    this.lanternGutterMul = 1;
    this.emberBonus = 0;
    this.player.reset(this.w / 2, this.h / 2 + 170);
    // Revision 5: a fresh run starts in the Ember Reaches with no road
    // taken yet — then the workshop's permanent ranks apply on top of
    // the reset base stats (a zero-rank profile plays exactly like rev-4).
    this.realm = realmFor(1);
    this.realmGutter = this.realm.gutter;
    this.road = [];
    this.roadChoices = false;
    this.relicChance = 0.3;
    this.workshop.applyToRun(this, this.player);
    this.enemies = [];
    this.bullets.items = [];
    this.enemyBullets.items = [];
    this.embers.items = [];
    this.particles = new ParticleSystem();
    this.paused = false;
    this.state = 'playing';
    this.audio.ensure();
    this.audio.startMusic();
    this.startWave(1);
    this.setStatus('Night 1. Tend the lanterns and defend the Drift Gate.');
  }

  startWave(n) {
    this.wave = n;
    // Revision 5: the realm follows the night — crossing into a new
    // realm re-tints the sky and names the banner.
    const prevRealm = this.realm;
    this.realm = realmFor(n);
    this.realmGutter = this.realm.gutter;
    const def = WAVE_TABLE[n - 1];
    this.spawnBag = [];
    this.hazards = [];
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
      const realmNote = this.realm !== prevRealm ? `${this.realm.name} — ` : '';
      this.banner = { text: `NIGHT ${n}`, sub: n === TOTAL_WAVES ? 'FINAL NIGHT — HOLD THE LIGHT' : `${realmNote}HOSTILES INBOUND — MIND THE LANTERNS`, t: 2.2 };
    }
    // Brass Depths: the table fights back. Drift mines seed the arena —
    // one per two nights, up to five — placed clear of the gate, the
    // lanterns and the keeper's start, so every night the floor itself
    // is a little more hostile.
    this.spawnMines(Math.min(5, Math.floor(n / 2)));
  }

  spawnMines(count) {
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, ok = false;
      for (let tries = 0; tries < 20 && !ok; tries++) {
        x = 60 + Math.random() * (this.w - 120);
        y = 60 + Math.random() * (this.h - 120);
        ok = Math.hypot(x - this.gate.x, y - this.gate.y) > 200
          && Math.hypot(x - this.player.x, y - this.player.y) > 220
          && this.lanterns.every((L) => Math.hypot(x - L.x, y - L.y) > 70)
          && this.hazards.every((m) => Math.hypot(x - m.x, y - m.y) > 90);
      }
      if (ok) this.hazards.push({ x, y, r: 16, t: Math.random() * 6.28, dead: false });
    }
  }

  // A drift mine goes off: a blast that hurts the keeper if they are too
  // close and shreds any enemy inside 90px. Shooting a mine is the safe
  // way to use it — the blast is the arena fighting back for you.
  detonateMine(m) {
    m.dead = true;
    this.particles.burst(m.x, m.y, '#ff8a3d', 30, 300, 0.8, 4);
    this.particles.ring(m.x, m.y, '#ff8a3d', 90);
    this.particles.addShake(10);
    this.audio.enemyDie();
    const p = this.player;
    if (Math.hypot(p.x - m.x, p.y - m.y) < 46) this.damagePlayer(1);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) < 90) this.applyDamage(e, 3 + this.player.mineBonus);
    }
    this.hazards = this.hazards.filter((h) => !h.dead);
  }

  // One damage route for everything that can hurt an enemy: bosses soak
  // hits on their brass plates first (see enemies.js Boss.takeHit),
  // everyone else takes hull damage directly.
  applyDamage(e, dmg) {
    if (e.isBoss) e.takeHit(dmg, this);
    else { e.hp -= dmg; e.flash = 0.12; }
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
    this.player.invuln = 1.2 + this.player.invulnBonus;
    this.particles.addShake(12);
    this.particles.burst(this.player.x, this.player.y, '#ff5d8f', 22, 240, 0.7, 3);
    this.audio.playerHit();
    if (this.player.hull <= 0) this.gameOver('Your lantern-skiff was shattered.');
  }

  // Ember Glass: shatter the bubble at `origin`. The blast hurts every
  // enemy within SHATTER_R (bosses included — they are immune to the trap
  // itself, not to the blast); any enemy the blast kills pops its own
  // neighbours within the same radius, up to MAX_HOPS hops. Returns the
  // number of enemies killed by this chain. Deaths are collected by the
  // normal death pass in resolveCollisions, so scoring stays in one place.
  shatterChain(origin, hop) {
    // Revision 5: CHAIN LENS / the Glass Road widen the blast and add hops.
    const SHATTER_R = this.shatterR + this.player.shatterBonusR;
    const MAX_HOPS = this.shatterHops + this.player.chainBonus;
    const SHATTER_DMG = 5;
    let kills = 0;
    const victims = [];
    for (const v of this.enemies) {
      if (v.dead || v.hp <= 0) continue;
      if ((v.x - origin.x) ** 2 + (v.y - origin.y) ** 2 < SHATTER_R * SHATTER_R) victims.push(v);
    }
    const freshKills = [];
    for (const v of victims) {
      this.applyDamage(v, SHATTER_DMG);
      if (v.hp <= 0) { v.dead = true; kills++; freshKills.push(v); }
    }
    this.particles.ring(origin.x, origin.y, '#aee9ff', SHATTER_R);
    this.particles.burst(origin.x, origin.y, '#aee9ff', 18, 240, 0.6, 3);
    this.particles.addShake(6);
    this.audio.enemyDie();
    if (hop < MAX_HOPS) {
      for (const k of freshKills) kills += this.shatterChain(k, hop + 1);
    }
    return kills;
  }

  killEnemy(e) {
    this.kills++;
    this.score += e.score * this.comboMult;
    this.combo++;
    this.comboTimer = 2.5 + this.player.comboBonus;
    this.comboMult = Math.min(8, 1 + Math.floor(this.combo / 4));
    this.player.overdrive = Math.min(100, this.player.overdrive + (e.isBoss ? 25 : 4) * this.player.overdriveMul);
    this.particles.burst(e.x, e.y, e.color, e.isBoss ? 70 : 22, e.isBoss ? 380 : 230, 0.8, 3);
    if (e.isBoss) {
      this.particles.ring(e.x, e.y, '#ffd166', 180);
      this.particles.addShake(16);
      // A boss always drops a relic — the deep pays for the climb.
      this.relics.spawn(e.x, e.y, Math.random, this.relicsOwned);
    } else if (e.kind === 'bulwark' && Math.random() < this.relicChance) {
      this.relics.spawn(e.x, e.y, Math.random, this.relicsOwned);
    }
    this.particles.floatText(e.x, e.y - 10, `+${e.score * this.comboMult}`, '#ffd166', 15);
    this.embers.spawn(e.x, e.y, Math.random);
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
    // Revision 5: a finished run banks a tenth of its score as workshop
    // embers, so even a lost run leaves the keeper a little richer.
    this.workshop.bank(this.score);
    this.audio.stopMusic();
    this.audio.gameOver();
    this.setStatus(`The light goes out. ${reason} Final score ${this.score}. Press R to keep again.`);
  }

  victory() {
    this.state = 'victory';
    // Revision 5: a won run banks too — the workshop grows either way.
    this.workshop.bank(this.score);
    this.audio.stopMusic();
    this.audio.victory();
    this.setStatus(`The gate still burns! Final score ${this.score}. Press R to play again.`);
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
      if (input.wasPressed('KeyW')) {
        this.state = 'workshop';
        return;
      }
      if (input.wasPressed('Enter') || input.mouseClicked) {
        this.audio.ensure();
        this.startRun();
      }
      return;
    }
    // Revision 5: the workshop — buy permanent ranks with banked
    // embers (keys 1–3), Esc/Enter back to the title.
    if (this.state === 'workshop') {
      if (input.wasPressed('Digit1')) this.workshop.buy('bubble');
      if (input.wasPressed('Digit2')) this.workshop.buy('hull');
      if (input.wasPressed('Digit3')) this.workshop.buy('damage');
      if (input.wasPressed('Escape') || input.wasPressed('Enter')) this.state = 'title';
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
        if (this.roadChoices) {
          // Revision 5: a road holds for the rest of the run.
          this.upgradeChoices[chosen].apply(this, this.player);
          this.road.push(this.upgradeChoices[chosen].id);
          this.roadChoices = false;
        } else {
          this.upgradeChoices[chosen].apply(this.player);
        }
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
    // Ember Glass: right-click / Shift blows a glass bubble (limited
    // charges, recharged by embers). The bubble drifts and traps the
    // first non-boss enemy it touches for 3 seconds.
    if (input.rightDown || input.down('ShiftLeft')) {
      const a = this.player.tryBubble();
      if (a !== null) {
        this.bullets.spawnBubble(
          this.player.x + Math.cos(a) * 22, this.player.y + Math.sin(a) * 22, a,
        );
        this.audio.shoot();
      }
    }
    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboMult = 1; }
    }
    // Chain flash decay (HUD readout of the last shatter).
    if (this.chainFlash) {
      this.chainFlash.t -= dt;
      if (this.chainFlash.t <= 0) this.chainFlash = null;
    }
    // Beacon lanterns: every flame gutters down on its own. Fly close to
    // a lantern to rekindle it. If all three go out, the dark creeps in
    // and the gate itself starts to fade.
    let lit = 0;
    for (const L of this.lanterns) {
      // Revision 5: the Quench gutters lanterns 1.5x; LANTERN WICK cards
      // rekindle faster. Relic oil still multiplies the gutter too.
      L.flame = Math.max(0, L.flame - 1.0 * this.lanternGutterMul * this.realmGutter * dt);
      const d = Math.hypot(this.player.x - L.x, this.player.y - L.y);
      if (d < 80) {
        L.flame = Math.min(100, L.flame + (45 + this.player.rekindleBonus) * dt);
        if (Math.random() < 0.3) this.particles.trail(L.x, L.y - 14, '#ffd166', 2);
      }
      if (L.flame > 5) lit++;
    }
    this.lanternsLit = lit;
    if (lit === 0) {
      this.gate.integrity = Math.max(0, this.gate.integrity - 2.5 * dt);
      if (this.gate.integrity <= 0) {
        this.gameOver('The last lantern went out and the dark took the gate.');
        return;
      }
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
    this.embers.update(dt, this.player, this);
    this.relics.update(dt, this.player, this);
    // Drift mines pulse; drift too close and one goes off in your face.
    for (const m of this.hazards) {
      m.t += dt;
      if (Math.hypot(this.player.x - m.x, this.player.y - m.y) < 42) {
        this.detonateMine(m);
        if (this.state !== 'playing') return;
      }
    }
    this.resolveCollisions();
    // Wave clear.
    if (this.state === 'playing' && this.spawnBag.length === 0 && this.enemies.length === 0) {
      if (this.wave >= TOTAL_WAVES) {
        this.victory();
      } else {
        this.state = 'upgrade';
        // Revision 5: after nights 3 and 6 the descent forks — offer
        // the three roads instead of a normal card pick (max two forks).
        if ((this.wave === 3 || this.wave === 6) && this.road.length < 2) {
          this.roadChoices = true;
          this.upgradeChoices = pickRoads();
          this.setStatus(`Night ${this.wave} held. The descent forks — choose your road.`);
        } else {
          this.roadChoices = false;
          this.upgradeChoices = pickUpgrades(Math.random, this.player);
          this.setStatus(`Night ${this.wave} held. Choose a keeper's craft.`);
        }
        this.audio.waveClear();
      }
    }
  }

  resolveCollisions() {
    const p = this.player;
    // Player bullets vs drift mines: shooting a mine sets it off — the
    // blast shreds enemies nearby, so a mine is a weapon if you spot it.
    for (const b of this.bullets.items) {
      if (b.dead || b.kind === 'bubble') continue;
      for (const m of this.hazards) {
        if (m.dead) continue;
        const rr = b.r + m.r;
        if ((b.x - m.x) ** 2 + (b.y - m.y) ** 2 < rr * rr) {
          b.dead = true;
          this.detonateMine(m);
          break;
        }
      }
    }
    this.bullets.items = this.bullets.items.filter((b) => !b.dead);
    if (this.state !== 'playing') return;
    // Player bullets vs enemies.
    for (const b of this.bullets.items) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (b.hitSet && b.hitSet.has(e.id)) continue;
        const rr = b.r + e.r;
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < rr * rr) {
          if (b.kind === 'bubble') {
            // A bubble traps the first non-boss, untrapped enemy it touches
            // and is spent; it drifts straight through bosses and through
            // enemies that are already trapped.
            if (e.isBoss || e.trapped > 0) continue;
            e.trapped = 3;
            b.dead = true;
            this.particles.ring(e.x, e.y, '#aee9ff', e.r + 14);
            this.particles.floatText(e.x, e.y - e.r - 12, 'TRAPPED!', '#aee9ff', 14);
            break;
          }
          // Shooting a trapped enemy shatters its bubble: the blast chains
          // to neighbours, and any shatter kill chains further (max 3 hops).
          if (e.trapped > 0) {
            const n = this.shatterChain(e, 1);
            this.lastChain = n;
            if (n >= 2) {
              this.chainFlash = { n, t: 2.0 };
              this.particles.floatText(e.x, e.y - 34, `CHAIN x${n}`, '#aee9ff', 22);
            }
          }
          this.applyDamage(e, b.damage);
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
        this.applyDamage(e, 3);
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
    // Enemies vs beacon lanterns: anything that touches a lantern throws
    // itself at the flame and gutters it; a snuff-moth snuffs it out
    // outright. Bosses are too big to be stopped by a lantern — they
    // plough straight past it.
    for (const e of this.enemies) {
      if (e.dead || e.isBoss) continue;
      for (const L of this.lanterns) {
        if (L.flame <= 0) continue;
        const rr = e.r + 16;
        if ((e.x - L.x) ** 2 + (e.y - L.y) ** 2 < rr * rr) {
          e.dead = true;
          if (e.kind === 'snuff') {
            L.flame = 0;
            this.particles.burst(L.x, L.y, '#8a7cff', 26, 220, 0.7, 3);
            this.particles.floatText(L.x, L.y - 26, 'SNUFFED!', '#8a7cff', 16);
          } else {
            L.flame = Math.max(0, L.flame - 25);
            this.particles.burst(L.x, L.y, '#ffd166', 16, 180, 0.6, 3);
          }
          this.audio.gateHit();
          break;
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
    // Embers vs player.
    for (const s of this.embers.items) {
      if (s.dead) continue;
      const rr = s.r + p.r + 4;
      if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 < rr * rr) {
        s.dead = true;
        if (s.kind === 'heart') {
          p.hull = Math.min(p.maxHull, p.hull + 1);
          this.particles.floatText(p.x, p.y - 24, '+1 HULL', '#ff5d8f', 16);
        } else {
          this.score += (25 + this.emberBonus + this.player.emberScoreBonus) * this.comboMult;
          // Ember Glass: every Nth ember restores one bubble charge
          // (N = 6 by default, 4 with QUICK GLASS).
          this.emberCount++;
          if (this.emberCount >= this.player.emberPerCharge) {
            this.emberCount = 0;
            if (this.player.bubbleCharges < this.player.bubbleMax) {
              this.player.bubbleCharges++;
              this.particles.floatText(p.x, p.y - 40, '+1 EMBER GLASS', '#aee9ff', 14);
            }
          }
        }
        this.audio.pickup();
      }
    }
    this.embers.items = this.embers.items.filter((s) => !s.dead);
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
    } else if (this.state === 'workshop') {
      render.drawWorkshop(ctx, this);
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

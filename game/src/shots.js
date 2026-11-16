// shots.js — deterministic staged scenes for the entry screenshots.
// Each shot builds a real game state with the game's own classes and the
// normal render path, frozen at a fixed time so the capture is stable.
// ?shot=title | action | victory | gameover  (&seed=N, default 7)
import { mulberry32, rand } from './utils.js';
import { Enemy, Boss } from './enemies.js';
import { Starfield } from './particles.js';

export function stageShot(game, name, seed = 7) {
  const rng = mulberry32(seed);
  game.time = 12.5;
  game.starfield = new Starfield(game.w, game.h, mulberry32(seed + 1));
  if (name === 'title') {
    game.state = 'title';
    // A live swarm drifts behind the dim title overlay — the menu reads as
    // a game in progress, not a static poster.
    const edgeSpots = [
      ['dart', 150, 130], ['mote', 1130, 110], ['spitter', 120, 610],
      ['dart', 1140, 620], ['mote', 1040, 90],
    ];
    for (const [kind, x, y] of edgeSpots) {
      const e = new Enemy(kind, x, y, rng);
      e.angle = rand(rng, 0, 6.28);
      game.enemies.push(e);
    }
    game.particles.burst(150, 130, '#ff8a3d', 14, 160, 0.7, 3);
    game.particles.burst(1140, 620, '#c77dff', 12, 150, 0.7, 3);
    return;
  }
  if (name === 'victory') {
    game.state = 'victory';
    game.score = 48320;
    game.wave = 10;
    game.kills = 214;
    game.shotsFired = 1820;
    game.shotsHit = 1294;
    game.runTime = 482;
    game.player.hull = 2;
    game.gate.integrity = 64;
    game.player.x = game.w / 2;
    game.player.y = game.h - 80;
    return;
  }
  if (name === 'gameover') {
    game.state = 'gameover';
    game.score = 18900;
    game.wave = 6;
    game.kills = 96;
    game.shotsFired = 940;
    game.shotsHit = 588;
    game.runTime = 301;
    game.overReason = 'The gate was overrun on wave 6.';
    game.player.hull = 0;
    game.gate.integrity = 0;
    game.player.x = game.w / 2 - 100;
    game.player.y = game.h / 2 + 250;
    // A last explosion where the ship died.
    game.particles.burst(game.player.x, game.player.y, '#ff5d8f', 40, 260, 1.2, 4);
    game.particles.ring(game.player.x, game.player.y, '#7df9ff', 130);
    return;
  }
  // action: boss fight on wave 5 — SHATTERHEART mid-arena with its escort
  // swarm, radial bullet ring, overdrive active and combo at x8. This is
  // the game's signature moment, so it is the cover action shot.
  game.state = 'playing';
  game.wave = 5;
  game.score = 21480;
  game.combo = 23;
  game.comboMult = 8;
  game.comboTimer = 2.1;
  game.kills = 96;
  game.shotsFired = 640;
  game.shotsHit = 471;
  game.runTime = 236;
  game.spawnQueue = 6;
  game.player.x = 400;
  game.player.y = 500;
  game.player.angle = -0.35;
  game.player.hull = 3;
  game.player.overdrive = 0;
  game.player.overdriveActive = 4.2;
  game.player.weapon = 'spread';
  game.gate.integrity = 74;
  // The boss, at 60% HP so the boss bar reads mid-fight.
  const boss = new Boss('shatterheart', 950, 300, rng);
  boss.hp = 78;
  boss.angle = 0.6;
  game.enemies.push(boss);
  const spots = [
    ['dart', 830, 210], ['mote', 860, 390], ['mote', 1040, 210],
    ['spitter', 1080, 430], ['dart', 780, 320], ['splitter', 1010, 480],
    ['mote', 700, 260], ['bulwark', 1120, 330], ['dart', 900, 540],
    ['mote', 620, 420], ['spitter', 1060, 140], ['dart', 1180, 520],
  ];
  for (const [kind, x, y] of spots) {
    const e = new Enemy(kind, x, y, rng);
    e.angle = rand(rng, 0, 6.28);
    game.enemies.push(e);
  }
  // The boss's radial burst, frozen mid-flight.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.28318 + 0.6;
    game.enemyBullets.spawn(
      950 + Math.cos(a) * 70, 300 + Math.sin(a) * 70, a, 190, 1, false, '#e0aaff', false,
    );
  }
  // Trine spread mid-flight from the ship toward the boss.
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      const a = -0.35 + (j - 1) * 0.14;
      const d = 90 + i * 70;
      game.bullets.spawn(
        400 + Math.cos(a) * d, 500 + Math.sin(a) * d, a, 780, 1, false, '#7df9ff', true,
      );
    }
  }
  // Explosions and shards from recent kills.
  game.particles.burst(830, 210, '#ff8a3d', 26, 220, 0.8, 3);
  game.particles.burst(1040, 210, '#ff5d8f', 18, 180, 0.7, 3);
  game.particles.ring(950, 300, '#ffd166', 120);
  game.particles.floatText(830, 180, '+500', '#ffd166', 18);
  game.particles.floatText(1040, 180, 'COMBO x8', '#7df9ff', 15);
  for (let i = 0; i < 5; i++) game.shards.spawn(720 + i * 24, 380 + (i % 2) * 20, rng);
  game.banner = { text: 'WARNING', sub: 'SHATTERHEART APPROACHES', t: 2.6 };
}

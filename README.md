[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Mamat9q/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Mamat9q/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# LUMEN DRIFT — Defend the Drift Gate

An original neon arena-defense game for make.fun's **best-game-01** bounty
("Make the best game", $1,000). You pilot the last light-ship and hold the
Drift Gate through 10 waves of the Shatter swarm — including two bosses —
then choose upgrades between waves and push your score as high as it goes.

## How to play

Open `game/index.html` from any static file server (for example
`node serve.ts`, then http://localhost:8080). No build step, no network,
no files outside `game/`.

| Control | Action |
|---|---|
| WASD / Arrow keys | Fly |
| Mouse | Aim |
| Hold left click | Fire |
| Space / Right-click | Dash (brief invulnerability) |
| E | Overdrive when the meter is full (6s of double fire rate) |
| 1 / 2 / 3 or click | Choose an upgrade card between waves |
| P | Pause — M mute — R restart on end screens |

## The loop

- **Defend the gate.** Enemies spawn at the arena edge and drift toward the
  Drift Gate. Anything that reaches it damages the gate — lose the gate,
  lose the game. Chasers hunt you when you get close; spitters shoot back;
  splitters break into three motes; bulwarks soak damage; the bosses
  **SHATTERHEART** (wave 5) and **VOID MAW** (wave 10) fire radial bursts,
  summon motes, and the Void Maw charges.
- **Score with combos.** Kills chain a combo multiplier up to x8. Enemies
  drop shards worth points (and rare hull repairs). Kills fill the Overdrive
  meter.
- **Upgrade between waves.** After every cleared wave, pick 1 of 3 cards:
  new weapons (Twin Lance, Trine Spread, Rail Lance), damage, fire rate,
  hull plating, faster dash, or a shard magnet.
- **Win or lose.** Clear wave 10 and the gate is secured. Lose your 3 hull
  or the gate's integrity and the drift goes dark. Both end screens show
  your score, kills, accuracy and time — and restart with R.

## Presentation

- All art is drawn in code (canvas 2D): parallax starfield, nebula glow,
  a swirling gate portal, additive particle explosions, shockwave rings,
  floating score text, screen shake, and a full HUD (score, combo, wave,
  hull hearts, gate integrity, dash and overdrive meters, boss bar).
- All sound is synthesized live with WebAudio: laser, explosions, pickups,
  dash whoosh, wave fanfares, boss alarms, and a 132 BPM bass/hat/pad loop.
  No audio files ship with the game.

## Structure

- `game/index.html` — canvas shell, loads the game
- `game/src/main.js` — Game state machine, loop, collisions, wave director
- `game/src/player.js` — the light-ship: thrust, aim, dash, weapons
- `game/src/enemies.js` — swarm kinds, AI, and the two bosses
- `game/src/bullets.js` — projectile pools and shard pickups
- `game/src/waves.js` — the 10-wave table and upgrade cards
- `game/src/render.js` — background, gate, HUD, and all screens
- `game/src/particles.js` — explosions, rings, floating text, starfield
- `game/src/audio.js` — synthesized SFX and music
- `game/src/input.js` — keyboard + mouse
- `game/src/shots.js` — deterministic staged scenes for the screenshots
- `game/src/utils.js` — math helpers and a seeded RNG
- `main.ts` — entrypoint: copies `game/` + `screenshots/` and writes the dossier
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Screenshots

`1-title.jpg` title screen, `2-action.jpg` mid-fight on wave 4,
`3-victory.jpg` the win screen, `4-gameover.jpg` the loss screen. All four
are real renders of the game's own code in a browser (see `shots.json`).

## License

MIT — see `LICENSE`.

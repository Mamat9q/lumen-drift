// waves.js — the ten-wave escalation table and the upgrade cards offered
// between waves. Waves grow in count and mix; bosses anchor waves 5 and 10.
export const TOTAL_WAVES = 10;

export const WAVE_TABLE = [
  { mote: 6 },
  { mote: 8, dart: 3 },
  { mote: 8, dart: 5, spitter: 2 },
  { mote: 10, dart: 6, spitter: 3, splitter: 2 },
  { boss: 'shatterheart', mote: 6, dart: 4 },
  { mote: 12, dart: 8, spitter: 4, splitter: 3 },
  { mote: 12, dart: 8, spitter: 5, splitter: 4, bulwark: 1 },
  { mote: 14, dart: 10, spitter: 6, splitter: 5, bulwark: 2 },
  { mote: 16, dart: 12, spitter: 7, splitter: 6, bulwark: 2 },
  { boss: 'voidmaw', mote: 10, dart: 8, spitter: 4, bulwark: 2 },
];

export const UPGRADES = [
  { id: 'twin', name: 'TWIN LANCE', desc: 'Fire two parallel bolts at once.', icon: 'II', apply: (p) => { p.weapon = 'twin'; } },
  { id: 'spread', name: 'TRINE SPREAD', desc: 'Fire three bolts in a fan.', icon: 'W', apply: (p) => { p.weapon = 'spread'; } },
  { id: 'rail', name: 'RAIL LANCE', desc: 'Slow piercing bolts that hit for 3.', icon: 'R', apply: (p) => { p.weapon = 'rail'; } },
  { id: 'damage', name: 'OVERCLOCK ROUNDS', desc: '+1 damage on every bolt.', icon: '+1', apply: (p) => { p.damageBonus += 1; } },
  { id: 'rapid', name: 'RAPID CYCLER', desc: '+25% fire rate.', icon: '>>', apply: (p) => { p.fireRateBonus += 2; } },
  { id: 'hull', name: 'HULL PLATING', desc: 'Repair 1 hull and raise max hull by 1.', icon: '♥', apply: (p) => { p.maxHull += 1; p.hull = Math.min(p.maxHull, p.hull + 1); } },
  { id: 'dash', name: 'SLIPSTREAM DASH', desc: 'Dash recharges 40% faster.', icon: '»', apply: (p) => { p.dashMax *= 0.6; } },
  { id: 'magnet', name: 'SHARD MAGNET', desc: 'Pull pickups from much further away.', icon: '◎', apply: (p) => { p.magnet += 130; } },
];

// Three distinct cards, never repeating a weapon the player already owns.
export function pickUpgrades(rng, player) {
  const pool = UPGRADES.filter((u) => {
    if (u.id === 'twin' && player.weapon !== 'pulse') return false;
    if (u.id === 'spread' && player.weapon !== 'pulse') return false;
    if (u.id === 'rail' && player.weapon !== 'pulse') return false;
    return true;
  });
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

// utils.js — small math helpers shared by every LUMEN DRIFT module.
export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
};
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

// mulberry32: a tiny deterministic RNG, so staged scenes and replays are stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (rng, lo, hi) => lo + rng() * (hi - lo);
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const fmt = (n) => n.toLocaleString('en-US');

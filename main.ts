// main.ts — the LUMEN DRIFT entrypoint (Node 22, standard library only).
//
// It hands the game in: copies game/ (static files) and screenshots/ (the
// four real renders) from beside this file into the output directory, then
// writes /output/dossier.json with the kit's vendored buildDossier library.
// The grader runs this program twice and both runs must write identical
// bytes, so there is no randomness, no clock and no network here at all.
//
// Local run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

// The scorer's own caps, so a local build refuses exactly what the gate
// would refuse: at most 4 screenshots, each at most 256 KiB; game/ at most
// 993 files and 48 MiB; no path under game/ over 1000 bytes; the dossier
// text at most 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

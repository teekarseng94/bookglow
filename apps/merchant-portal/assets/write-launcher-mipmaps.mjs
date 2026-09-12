import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = dirname(fileURLToPath(import.meta.url));
const androidRes = join(root, '..', 'android', 'app', 'src', 'main', 'res');
const svg = readFileSync(join(root, 'icon.svg'));

const launcherSizes = {
  'mipmap-ldpi': 36,
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

for (const [folder, width] of Object.entries(launcherSizes)) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(join(androidRes, folder, 'ic_launcher.png'), png);
  writeFileSync(join(androidRes, folder, 'ic_launcher_round.png'), png);
  console.log(`${folder} ${width}px`);
}

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = dirname(fileURLToPath(import.meta.url));

function render(svgName, pngName, width) {
  const svg = readFileSync(join(root, svgName));
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(join(root, pngName), png);
  console.log(`wrote ${pngName} (${png.length} bytes)`);
}

render('icon.svg', 'icon.png', 1024);
render('icon-only.svg', 'icon-only.png', 1024);
render('splash.svg', 'splash.png', 2732);
render('icon.svg', 'play-icon-512.png', 512);
render('play-feature-graphic.svg', 'play-feature-graphic.png', 1024);

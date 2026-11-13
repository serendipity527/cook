import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public/icon.svg');
const outDir = path.join(root, 'public/icons');

await mkdir(outDir, { recursive: true });

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of targets) {
  await sharp(source).resize(size, size).png().toFile(path.join(outDir, name));
  console.log(`generated ${name}`);
}

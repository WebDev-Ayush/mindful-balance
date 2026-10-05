import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'public/models/face-api');

// Canonical pretrained weights from the official face-api.js repo.
// We download only what we need for expressions:
// - tiny face detector (fast face detection)
// - face expression net (emotion probabilities)
const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

async function main() {
  await ensureDir(OUT_DIR);

  for (const name of FILES) {
    const url = `${BASE}/${name}`;
    const outPath = path.join(OUT_DIR, name);
    process.stdout.write(`Downloading ${name}... `);
    const buf = await download(url);
    await fs.writeFile(outPath, buf);
    process.stdout.write('ok\n');
  }

  console.log(`\nSaved face-api model files to: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



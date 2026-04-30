import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { renameSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, "../src/assets/logo.png");
const tmpPath = join(__dirname, "../src/assets/logo_tmp.png");
const outputPath = inputPath;

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = new Uint8ClampedArray(data);
const threshold = 240;

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  if (r >= threshold && g >= threshold && b >= threshold) {
    pixels[i + 3] = 0;
  }
}

await sharp(pixels, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(tmpPath);

renameSync(tmpPath, outputPath);
console.log(`Done: ${info.width}x${info.height} → background removed, saved to ${outputPath}`);

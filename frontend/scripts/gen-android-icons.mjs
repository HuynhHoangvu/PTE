/**
 * Generates Android launcher icons from src/assets/logo.png
 * Run: node scripts/gen-android-icons.mjs
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RES_DIR = path.join(__dirname, '../android/app/src/main/res');
const LOGO = path.join(__dirname, '../src/assets/logo.png');

// Brand background color (cream/white for clean icon)
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

// Icon sizes: [folder, size, foregroundSize (null = same)]
const ICON_SIZES = [
  ['mipmap-mdpi',    48,  null, 108],
  ['mipmap-hdpi',    72,  null, 162],
  ['mipmap-xhdpi',   96,  null, 216],
  ['mipmap-xxhdpi',  144, null, 324],
  ['mipmap-xxxhdpi', 192, null, 432],
];

async function makeSquareIcon(size, padding = 0.15) {
  const inner = Math.round(size * (1 - padding * 2));
  const logoBuffer = await sharp(LOGO)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
    .composite([{
      input: logoBuffer,
      gravity: 'center',
    }])
    .png()
    .toBuffer();
}

async function makeRoundIcon(size, padding = 0.1) {
  // Create circular mask
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>`
  );

  const inner = Math.round(size * (1 - padding * 2));
  const logoBuffer = await sharp(LOGO)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const squareWithLogo = await sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toBuffer();

  return sharp(squareWithLogo)
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function makeForeground(size, padding = 0.2) {
  // Foreground for adaptive icons - transparent bg, logo centered in safe zone
  const inner = Math.round(size * (1 - padding * 2));
  const logoBuffer = await sharp(LOGO)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  console.log('🎨 Generating Android launcher icons from logo.png...\n');

  for (const [folder, size, , fgSize] of ICON_SIZES) {
    const dir = path.join(RES_DIR, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png
    const iconBuf = await makeSquareIcon(size);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), iconBuf);
    console.log(`✅ ${folder}/ic_launcher.png (${size}×${size})`);

    // ic_launcher_round.png
    const roundBuf = await makeRoundIcon(size);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundBuf);
    console.log(`✅ ${folder}/ic_launcher_round.png (${size}×${size} round)`);

    // ic_launcher_foreground.png (for adaptive icons)
    if (fgSize) {
      const fgBuf = await makeForeground(fgSize);
      fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuf);
      console.log(`✅ ${folder}/ic_launcher_foreground.png (${fgSize}×${fgSize} foreground)`);
    }
  }

  // Also update the Play Store icon (512×512) to public folder
  const playIcon = await makeSquareIcon(512, 0.12);
  const playIconPath = path.join(__dirname, '../public/play-store-icon.png');
  fs.writeFileSync(playIconPath, playIcon);
  console.log(`\n✅ public/play-store-icon.png (512×512) — dùng cho Google Play`);

  // Update ic_launcher_background color to white
  const bgXmlPath = path.join(RES_DIR, 'values/ic_launcher_background.xml');
  fs.writeFileSync(bgXmlPath, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n`);
  console.log('✅ values/ic_launcher_background.xml → white background');

  console.log('\n🎉 Done! Chạy "npx cap sync android" rồi build lại app.');
}

main().catch(console.error);

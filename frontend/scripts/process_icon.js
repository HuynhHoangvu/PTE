const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\a577b73e-b3b4-4744-aeb7-66ecbae77618\\media__1781509716376.png';
const assetsDir = path.join(__dirname, '..', 'assets');
const outputPath = path.join(assetsDir, 'icon.png');

async function run() {
  try {
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    console.log('Trimming and resizing logo...');
    
    await sharp(inputPath)
      .trim()
      .resize({
        width: 800,
        height: 800,
        fit: 'inside',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer()
      .then(async (trimmedBuffer) => {
        const metadata = await sharp(trimmedBuffer).metadata();
        const width = metadata.width || 800;
        const height = metadata.height || 800;
        
        const top = Math.floor((1024 - height) / 2);
        const bottom = 1024 - height - top;
        const left = Math.floor((1024 - width) / 2);
        const right = 1024 - width - left;
        
        await sharp(trimmedBuffer)
          .extend({
            top,
            bottom,
            left,
            right,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .toFile(outputPath);
      });
      
    console.log('Icon generated successfully at:', outputPath);
  } catch (err) {
    console.error('Error processing icon:', err);
  }
}
run();

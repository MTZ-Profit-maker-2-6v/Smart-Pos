const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const svgPath = path.resolve(__dirname, '../assets/profit-maker-pos-icon.svg');
const outDir = path.resolve(__dirname, '../build');
const icoPath = path.resolve(outDir, 'icon.ico');

(async () => {
  await fs.promises.mkdir(outDir, { recursive: true });

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngFiles = [];

  for (const size of sizes) {
    const pngPath = path.join(outDir, `icon-${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(pngPath);
    pngFiles.push(pngPath);
  }

  const icoBuffer = await pngToIco(pngFiles);
  await fs.promises.writeFile(icoPath, icoBuffer);

  console.log('Created', icoPath);
})();
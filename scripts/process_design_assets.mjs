import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const texturesDir = path.join(__dirname, '..', 'public', 'textures');

// ==========================================
// 1. Process Loading Screen Asset (Image A)
// ==========================================
function processLoadingScreen() {
  const imgAPath = path.join(texturesDir, 'loading_screen_reference.png');
  const src = PNG.sync.read(fs.readFileSync(imgAPath));
  const width = src.width;
  const height = src.height;

  // Clone src to create clean loading_backdrop.png without baked progress bar
  const cleanBg = new PNG({ width, height });
  src.data.copy(cleanBg.data);

  // Patch progress bar & text (y: 390 to 535, x: 180 to 844)
  for (let y = 390; y < 535; y++) {
    for (let x = 180; x < 844; x++) {
      const srcY = 15 + ((y - 390) % 130);
      const srcX = (x % 2 === 0) ? (15 + ((x - 180) % 170)) : (830 + ((x - 180) % 170));
      const srcIdx = (srcY * width + srcX) * 4;
      const destIdx = (y * width + x) * 4;

      cleanBg.data[destIdx] = src.data[srcIdx];
      cleanBg.data[destIdx + 1] = src.data[srcIdx + 1];
      cleanBg.data[destIdx + 2] = src.data[srcIdx + 2];
      cleanBg.data[destIdx + 3] = src.data[srcIdx + 3];
    }
  }

  // Smooth seam
  for (let y = 388; y <= 393; y++) {
    const alpha = (y - 388) / 5;
    for (let x = 180; x < 844; x++) {
      const destIdx = (y * width + x) * 4;
      const patchY = 15 + ((y - 390 + 130) % 130);
      const patchX = 15 + ((x - 180) % 170);
      const patchIdx = (patchY * width + patchX) * 4;

      for (let c = 0; c < 3; c++) {
        cleanBg.data[destIdx + c] = Math.round(
          cleanBg.data[destIdx + c] * (1 - alpha) + src.data[patchIdx + c] * alpha
        );
      }
    }
  }

  fs.writeFileSync(path.join(texturesDir, 'loading_backdrop.png'), PNG.sync.write(cleanBg));
  console.log('Created loading_backdrop.png (1024x576)');

  // Extract Transparent MINENOTES 3D Logo (x: 120..920, y: 70..360)
  const logoX1 = 120;
  const logoY1 = 70;
  const logoW = 800;
  const logoH = 290;
  const logoPng = new PNG({ width: logoW, height: logoH });

  for (let y = 0; y < logoH; y++) {
    for (let x = 0; x < logoW; x++) {
      const srcX = logoX1 + x;
      const srcY = logoY1 + y;
      const srcIdx = (srcY * width + srcX) * 4;
      const destIdx = (y * logoW + x) * 4;

      const r = src.data[srcIdx];
      const g = src.data[srcIdx + 1];
      const b = src.data[srcIdx + 2];
      const maxVal = Math.max(r, g, b);

      if (maxVal < 20) {
        logoPng.data[destIdx] = 0;
        logoPng.data[destIdx + 1] = 0;
        logoPng.data[destIdx + 2] = 0;
        logoPng.data[destIdx + 3] = 0;
      } else if (maxVal < 36 && Math.abs(r - g) < 5 && Math.abs(g - b) < 5) {
        const alpha = Math.max(0, Math.min(255, Math.round((maxVal - 18) * 14)));
        logoPng.data[destIdx] = r;
        logoPng.data[destIdx + 1] = g;
        logoPng.data[destIdx + 2] = b;
        logoPng.data[destIdx + 3] = alpha;
      } else {
        logoPng.data[destIdx] = r;
        logoPng.data[destIdx + 1] = g;
        logoPng.data[destIdx + 2] = b;
        logoPng.data[destIdx + 3] = 255;
      }
    }
  }

  fs.writeFileSync(path.join(texturesDir, 'minenotes_3d_logo.png'), PNG.sync.write(logoPng));
  console.log('Created minenotes_3d_logo.png (800x290 transparent)');
}

// ==========================================
// 2. Process Main Menu Asset (Image B)
// ==========================================
function processMainMenu() {
  const imgBPath = path.join(texturesDir, 'main_menu_reference.jpg');
  const jpegBuf = fs.readFileSync(imgBPath);
  const rawJpg = jpeg.decode(jpegBuf, { useTArray: true });
  const { width, height, data } = rawJpg;

  // The 4 buttons in Image B are centered at:
  // x: 370 to 654 (btnW = 284)
  // y: 260 to 452 (btnH = 192)
  // Let's inpaint the button region by blending water reflections from left and right!
  const btnX = 368;
  const btnY = 260;
  const btnW = 288;
  const btnH = 194;

  for (let y = btnY; y < btnY + btnH; y++) {
    for (let x = btnX; x < btnX + btnW; x++) {
      const relX = (x - btnX) / btnW; // 0 to 1
      const destIdx = (y * width + x) * 4;

      // Sample left water (x: 230..360)
      const leftSampleX = Math.round(btnX - 10 - (1 - relX) * 120);
      const leftIdx = (y * width + leftSampleX) * 4;

      // Sample right water (x: 660..790)
      const rightSampleX = Math.round(btnX + btnW + 10 + relX * 120);
      const rightIdx = (y * width + rightSampleX) * 4;

      // Subtle water wave perturbation
      const wave = Math.sin(y * 0.25 + x * 0.12) * 0.06;
      const blend = Math.max(0, Math.min(1, relX + wave));

      for (let c = 0; c < 3; c++) {
        data[destIdx + c] = Math.round(
          data[leftIdx + c] * (1 - blend) + data[rightIdx + c] * blend
        );
      }
    }
  }

  // Also clean the bottom footer area (y: 524 to 568):
  // Patch footer texts using water reflection right above it (y: 495 to 522)
  const patchFooter = (fx, fy, fw, fh) => {
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const sx = fx + dx;
        const sy = fy - fh - 4 + dy;
        const dxCoord = fx + dx;
        const dyCoord = fy + dy;

        const srcIdx = (sy * width + sx) * 4;
        const destIdx = (dyCoord * width + dxCoord) * 4;

        for (let c = 0; c < 3; c++) {
          data[destIdx + c] = data[srcIdx + c];
        }
      }
    }
  };

  // MineNotes v1.0 on left
  patchFooter(10, 528, 145, 34);
  // Minecraft Book & Quill Edition in center
  patchFooter(370, 524, 275, 36);
  // Sound icon on right
  patchFooter(940, 510, 65, 48);

  const encodedJpg = jpeg.encode({ data, width, height }, 94);
  fs.writeFileSync(path.join(texturesDir, 'main_menu_backdrop.jpg'), encodedJpg.data);
  console.log('Created main_menu_backdrop.jpg (1024x576) without baked buttons or baked footer!');
}

processLoadingScreen();
processMainMenu();

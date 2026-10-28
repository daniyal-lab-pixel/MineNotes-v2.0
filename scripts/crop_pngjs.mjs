import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const texturesDir = path.join(__dirname, '..', 'public', 'textures');

function cropPng(srcPng, x, y, w, h) {
  const destPng = new PNG({ width: w, height: h });
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const srcIdx = ((y + dy) * srcPng.width + (x + dx)) << 2;
      const destIdx = (dy * w + dx) << 2;
      destPng.data[destIdx] = srcPng.data[srcIdx];
      destPng.data[destIdx + 1] = srcPng.data[srcIdx + 1];
      destPng.data[destIdx + 2] = srcPng.data[srcIdx + 2];
      destPng.data[destIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
  return destPng;
}

async function run() {
  const bookBuf = fs.readFileSync(path.join(texturesDir, 'minecraft_book.png'));
  const bookPng = PNG.sync.read(bookBuf);

  // 1. Single Book Background: x=20, y=1, w=146, h=180
  const bookSingle = cropPng(bookPng, 20, 1, 146, 180);
  fs.writeFileSync(path.join(texturesDir, 'book_single.png'), PNG.sync.write(bookSingle));
  console.log('Created book_single.png (146x180)');

  // 2. Turn Arrows
  // Right arrow normal: 3, 194, 18, 10
  const turnRight = cropPng(bookPng, 3, 194, 18, 10);
  fs.writeFileSync(path.join(texturesDir, 'turn_right.png'), PNG.sync.write(turnRight));
  // Right arrow hover: 26, 194, 18, 10
  const turnRightHover = cropPng(bookPng, 26, 194, 18, 10);
  fs.writeFileSync(path.join(texturesDir, 'turn_right_hover.png'), PNG.sync.write(turnRightHover));

  // Left arrow normal: 3, 207, 18, 10
  const turnLeft = cropPng(bookPng, 3, 207, 18, 10);
  fs.writeFileSync(path.join(texturesDir, 'turn_left.png'), PNG.sync.write(turnLeft));
  // Left arrow hover: 26, 207, 18, 10
  const turnLeftHover = cropPng(bookPng, 26, 207, 18, 10);
  fs.writeFileSync(path.join(texturesDir, 'turn_left_hover.png'), PNG.sync.write(turnLeftHover));

  // 3. Authentic Double-Page Book (Matching Reference 1)
  // Total width: 292, height: 180.
  // In Reference 1, the open book has:
  // - Outer brown leather cover around the entire perimeter with stepped corners.
  // - Center spine with groove.
  // - Left and right pages have authentic aged cream parchment with worn edges and no red outer stitches.
  const doubleWidth = 292;
  const doubleHeight = 180;
  const doublePng = new PNG({ width: doubleWidth, height: doubleHeight });

  // Clear to transparent
  for (let i = 0; i < doublePng.data.length; i += 4) {
    doublePng.data[i + 3] = 0;
  }

  // Sample leather border from bookPng
  // Left page:
  // Outer leather edge (dx=0..8): from bookPng x: 20..28
  // Parchment body (dx=9..139): from bookPng parchment area (x: 40..140 stretched/repeated cleanly)
  // Inner spine edge (dx=140..143): parchment inner margin
  for (let dy = 0; dy < doubleHeight; dy++) {
    for (let dx = 0; dx < 142; dx++) {
      let srcX;
      if (dx < 6) {
        // Outer leather cover
        srcX = 20 + dx;
      } else if (dx >= 135) {
        // Inner edge near spine
        srcX = 135 + (dx - 135);
      } else {
        // Pure cream parchment interior (completely avoiding stitches at x=26..35)
        srcX = 38 + Math.floor(((dx - 6) / 129) * 95);
      }
      const srcIdx = ((dy + 1) * bookPng.width + srcX) << 2;
      const destIdx = (dy * doubleWidth + dx) << 2;
      doublePng.data[destIdx] = bookPng.data[srcIdx];
      doublePng.data[destIdx + 1] = bookPng.data[srcIdx + 1];
      doublePng.data[destIdx + 2] = bookPng.data[srcIdx + 2];
      doublePng.data[destIdx + 3] = bookPng.data[srcIdx + 3];
    }
  }

  // Right page: mirror of left page so outer leather is on the right
  for (let dy = 0; dy < doubleHeight; dy++) {
    for (let dx = 0; dx < 142; dx++) {
      const srcIdx = (dy * doubleWidth + (141 - dx)) << 2;
      const destX = 150 + dx;
      const destIdx = (dy * doubleWidth + destX) << 2;
      doublePng.data[destIdx] = doublePng.data[srcIdx];
      doublePng.data[destIdx + 1] = doublePng.data[srcIdx + 1];
      doublePng.data[destIdx + 2] = doublePng.data[srcIdx + 2];
      doublePng.data[destIdx + 3] = doublePng.data[srcIdx + 3];
    }
  }

  // Center Spine (x: 140..151)
  for (let dy = 0; dy < doubleHeight; dy++) {
    for (let dx = 140; dx < 152; dx++) {
      const destIdx = (dy * doubleWidth + dx) << 2;
      if (dx === 145 || dx === 146) {
        // Deep center spine groove
        doublePng.data[destIdx] = 0x24;
        doublePng.data[destIdx + 1] = 0x12;
        doublePng.data[destIdx + 2] = 0x07;
      } else if (dx === 144 || dx === 147) {
        // Inner crease shadow
        doublePng.data[destIdx] = 0x3d;
        doublePng.data[destIdx + 1] = 0x20;
        doublePng.data[destIdx + 2] = 0x0e;
      } else if (dx === 143 || dx === 148) {
        // Leather highlight
        doublePng.data[destIdx] = 0x71;
        doublePng.data[destIdx + 1] = 0x3b;
        doublePng.data[destIdx + 2] = 0x19;
      } else {
        // Saddle leather tone
        doublePng.data[destIdx] = 0x5a;
        doublePng.data[destIdx + 1] = 0x2f;
        doublePng.data[destIdx + 2] = 0x15;
      }
      doublePng.data[destIdx + 3] = 255;
    }
  }

  fs.writeFileSync(path.join(texturesDir, 'book_double.png'), PNG.sync.write(doublePng));
  console.log('Created book_double.png (292x180)');

  // 4. Stone Buttons from widgets.png (width: 200, height: 20)
  const widgetsBuf = fs.readFileSync(path.join(texturesDir, 'minecraft_widgets.png'));
  const widgetsPng = PNG.sync.read(widgetsBuf);

  const btnNormal = cropPng(widgetsPng, 0, 66, 200, 20);
  fs.writeFileSync(path.join(texturesDir, 'mc_button.png'), PNG.sync.write(btnNormal));

  const btnHover = cropPng(widgetsPng, 0, 86, 200, 20);
  fs.writeFileSync(path.join(texturesDir, 'mc_button_hover.png'), PNG.sync.write(btnHover));

  const btnDisabled = cropPng(widgetsPng, 0, 46, 200, 20);
  fs.writeFileSync(path.join(texturesDir, 'mc_button_disabled.png'), PNG.sync.write(btnDisabled));

  console.log('Created mc_button textures (200x20)');
}

run().catch(console.error);

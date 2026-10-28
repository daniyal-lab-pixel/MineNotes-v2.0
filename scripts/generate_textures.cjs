const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, rgbaBuffer) {
  const rowBytes = width * 4;
  const filtered = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (rowBytes + 1)] = 0;
    rgbaBuffer.copy(filtered, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const compressed = zlib.deflateSync(filtered);

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const toCrc = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, toCrc, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const texturesDir = path.join(__dirname, '..', 'public', 'textures');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(texturesDir)) fs.mkdirSync(texturesDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// --- 1. DIRT TEXTURE (16x16) ---
const dirtPalette = [
  [134, 96, 67, 255],  // #866043 - base light brown
  [115, 81, 57, 255],  // #735139 - mid brown
  [92, 63, 44, 255],   // #5c3f2c - darker brown
  [74, 51, 30, 255],   // #4a331e - dark pebble
  [150, 108, 74, 255], // #966c4a - highlight speck
  [104, 78, 54, 255],  // #684e36 - neutral dirt
  [121, 84, 56, 255],  // #795438 - warm brown
  [87, 61, 38, 255]    // #573d26 - shadow dirt
];
const dirtMap = [
  0,1,1,2,0,5,1,3,1,1,4,1,2,0,1,5,
  1,2,3,1,1,0,2,1,0,2,1,3,1,1,6,1,
  2,1,0,1,4,1,1,5,2,1,0,1,2,3,1,0,
  1,0,2,3,1,2,0,1,1,4,1,2,1,0,1,2,
  0,1,1,1,0,1,3,2,0,1,2,1,0,1,4,1,
  5,2,0,2,1,0,1,1,2,1,1,0,3,2,1,0,
  1,1,3,1,4,1,2,0,1,3,0,1,1,1,2,5,
  2,0,1,2,1,1,0,1,2,1,4,2,0,3,1,1,
  1,3,0,1,2,5,1,3,1,0,1,1,2,1,0,2,
  0,1,2,1,1,0,2,1,0,2,3,1,1,4,1,0,
  4,1,1,3,0,1,1,4,2,1,0,2,0,1,2,1,
  1,2,0,1,2,3,1,1,1,0,1,1,3,2,1,3,
  2,1,3,2,1,0,2,0,3,2,4,1,0,1,0,1,
  0,2,1,0,4,1,1,2,1,0,1,2,1,3,2,0,
  1,0,2,1,1,3,0,1,0,1,2,1,2,0,1,4,
  3,1,0,4,2,1,2,5,1,2,1,0,1,1,3,1
];
const dirtBuf = Buffer.alloc(16 * 16 * 4);
for (let i = 0; i < 256; i++) {
  const col = dirtPalette[dirtMap[i]];
  dirtBuf[i * 4] = col[0];
  dirtBuf[i * 4 + 1] = col[1];
  dirtBuf[i * 4 + 2] = col[2];
  dirtBuf[i * 4 + 3] = col[3];
}
fs.writeFileSync(path.join(texturesDir, 'dirt.png'), createPng(16, 16, dirtBuf));

// --- 2. STONE TEXTURE (16x16) ---
const stonePalette = [
  [125, 125, 125, 255], // base mid gray #7d7d7d
  [112, 112, 112, 255], // dark mid #707070
  [95, 95, 95, 255],    // shadow #5f5f5f
  [145, 145, 145, 255], // highlight #919191
  [80, 80, 80, 255],    // dark speck #505050
  [135, 135, 135, 255]  // light gray #878787
];
const stoneMap = [
  0,1,0,3,0,1,2,0,1,0,3,1,0,2,0,1,
  1,0,2,1,0,3,0,1,0,2,1,0,3,0,1,0,
  0,3,1,0,1,0,2,1,3,0,1,2,0,1,4,0,
  1,0,0,2,3,1,0,1,0,1,0,3,1,0,1,2,
  2,1,3,0,1,0,1,3,2,0,1,0,2,3,0,1,
  0,0,1,2,0,3,2,0,1,3,0,1,0,1,2,0,
  1,3,0,1,2,0,1,0,2,0,3,2,1,0,3,1,
  0,1,2,0,3,1,0,4,1,2,0,1,0,2,0,0,
  3,0,1,3,0,1,2,1,0,1,3,0,1,0,1,3,
  0,2,0,1,2,0,3,0,2,0,1,2,0,3,2,0,
  1,0,3,0,1,3,0,1,0,3,0,1,2,1,0,1,
  2,1,0,2,0,1,2,0,3,1,2,0,1,0,3,2,
  0,3,1,0,3,0,1,3,0,2,0,1,0,2,1,0,
  1,0,2,1,0,2,0,1,2,0,3,0,2,0,3,1,
  0,2,0,3,1,0,3,2,0,1,0,2,1,3,0,2,
  2,0,1,0,2,1,0,1,3,0,2,1,0,1,2,0
];
const stoneBuf = Buffer.alloc(16 * 16 * 4);
for (let i = 0; i < 256; i++) {
  const col = stonePalette[stoneMap[i]];
  stoneBuf[i * 4] = col[0];
  stoneBuf[i * 4 + 1] = col[1];
  stoneBuf[i * 4 + 2] = col[2];
  stoneBuf[i * 4 + 3] = col[3];
}
fs.writeFileSync(path.join(texturesDir, 'stone.png'), createPng(16, 16, stoneBuf));

// --- 3. OAK PLANKS (16x16) ---
// Authentic wooden desk plank texture
const oakPalette = [
  [162, 130, 78, 255],  // #a2824e main oak plank
  [180, 146, 90, 255],  // #b4925a light grain
  [142, 112, 66, 255],  // #8e7042 darker grain
  [116, 90, 50, 255],   // #745a32 plank seam shadow
  [196, 160, 102, 255], // #c4a066 top highlight
  [95, 72, 38, 255]     // #5f4826 dark nail/seam
];
const oakMap = [
  3,3,3,3,3,3,3,3,5,3,3,3,3,3,3,3, // horizontal seam
  4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4, // top highlight
  0,1,0,0,2,0,1,0,0,2,0,1,0,0,2,0,
  0,0,1,0,0,2,0,1,0,0,2,0,1,0,0,1,
  3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3, // seam
  4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
  0,2,0,1,0,0,2,0,1,0,0,2,0,1,0,0,
  1,0,0,2,0,1,0,0,2,0,1,0,0,2,0,1,
  3,3,3,3,3,3,3,5,3,3,3,3,3,3,3,3, // seam
  4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
  0,0,2,0,1,0,0,2,0,1,0,0,2,0,1,0,
  2,0,1,0,0,2,0,1,0,0,2,0,1,0,0,2,
  3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3, // seam
  4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,
  0,1,0,0,2,0,1,0,0,2,0,1,0,0,2,0,
  1,0,2,0,0,1,0,2,0,0,1,0,2,0,0,1
];
const oakBuf = Buffer.alloc(16 * 16 * 4);
for (let i = 0; i < 256; i++) {
  const col = oakPalette[oakMap[i]];
  oakBuf[i * 4] = col[0];
  oakBuf[i * 4 + 1] = col[1];
  oakBuf[i * 4 + 2] = col[2];
  oakBuf[i * 4 + 3] = col[3];
}
fs.writeFileSync(path.join(texturesDir, 'oak_planks.png'), createPng(16, 16, oakBuf));

// --- 4. DARK CHARCOAL LOADING BACKGROUND (16x16) ---
const charcoalPalette = [
  [25, 25, 26, 255],
  [22, 22, 23, 255],
  [28, 28, 29, 255],
  [20, 20, 21, 255]
];
const charcoalBuf = Buffer.alloc(16 * 16 * 4);
for (let i = 0; i < 256; i++) {
  const c = charcoalPalette[(i * 7 + (i >> 4) * 13) % 4];
  charcoalBuf[i * 4] = c[0];
  charcoalBuf[i * 4 + 1] = c[1];
  charcoalBuf[i * 4 + 2] = c[2];
  charcoalBuf[i * 4 + 3] = c[3];
}
fs.writeFileSync(path.join(texturesDir, 'charcoal.png'), createPng(16, 16, charcoalBuf));

// --- 5. PARCHMENT BACKGROUND TILE (32x32) ---
// Warm, ivory-cream aged paper with subtle grain
const parchmentBuf = Buffer.alloc(32 * 32 * 4);
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    // Subtle procedural noise
    const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const variation = (noise - Math.floor(noise)) * 10 - 5;
    const r = Math.min(255, Math.max(0, Math.round(253 + variation * 0.5)));
    const g = Math.min(255, Math.max(0, Math.round(246 + variation * 0.7)));
    const b = Math.min(255, Math.max(0, Math.round(227 + variation * 0.9)));
    const idx = (y * 32 + x) * 4;
    parchmentBuf[idx] = r;
    parchmentBuf[idx + 1] = g;
    parchmentBuf[idx + 2] = b;
    parchmentBuf[idx + 3] = 255;
  }
}
fs.writeFileSync(path.join(texturesDir, 'parchment.png'), createPng(32, 32, parchmentBuf));

// --- 6. MINECRAFT BOOK PIXEL ART ICON (32x32) ---
// High quality pixel-art Book & Quill icon
const bookColors = {
  '_': [0, 0, 0, 0],          // transparent
  'K': [20, 12, 6, 255],       // black/dark brown outline
  'L': [82, 45, 18, 255],      // dark leather
  'M': [118, 65, 27, 255],     // mid leather brown
  'H': [156, 88, 38, 255],     // highlight leather
  'G': [218, 165, 32, 255],    // gold corner/clasp
  'D': [160, 115, 15, 255],    // dark gold
  'P': [245, 238, 215, 255],   // parchment white
  'Q': [215, 203, 175, 255],   // parchment shade
  'R': [168, 34, 34, 255],     // red ribbon bookmark
  'S': [120, 20, 20, 255],     // dark red ribbon
  'F': [235, 235, 235, 255],   // feather white
  'E': [180, 180, 190, 255],   // feather gray
  'T': [60, 45, 30, 255],      // quill tip
};

const bookIconMap = [
  "________________________________",
  "___________________________KK___",
  "__________________________KFEK__",
  "_________________________KFFEEF_",
  "________________________KFFEEFK_",
  "_______________________KFFEEFK__",
  "______________________KFFEEFK___",
  "_______KKKKKKKKKK____KFFEEFK____",
  "______KMMMMMMMMMMK__KFFEEFK_____",
  "_____KMHHHHHHHHHHK_KFFEEFK______",
  "____KMHLLLLLLLLLHHKFFEEFK_______",
  "___KMHLGGLLLLLLLLHFEFFK_________",
  "___KHLGDDGLLRLLLLHEEFK__________",
  "___KHLGDDGLLRLLLLHEK____________",
  "___KHLGGLLLLRLLLLHK_____________",
  "___KHLRLLLLLRLLLLK______________",
  "___KHLRRRRRRRLLLLK______________",
  "___KHLRLLLLLLLLLLK______________",
  "___KHLRLLLLLLLLLLK___TT_________",
  "___KHLRLLLLLLLLLLK__TKK_________",
  "___KHLRLLLLLLLLLLK_TKK__________",
  "___KHLRLLLLLLLLLLKKK____________",
  "___KHLRLLLLLLLLLLKK_____________",
  "___KHLGDDGLLLLLLLKK_____________",
  "___KMHGGDDGLLLLLLKKK____________",
  "____KMHLLLLLLLLLLKPPK___________",
  "_____KMHHHHHHHHHHKPPQK__________",
  "______KMMMMMMMMMMKPPPQK_________",
  "_______KKKKKKKKKKKPPPPQK________",
  "_________KKKKKKKKKKPPPQK________",
  "___________KKKKKKKKKKK__________",
  "________________________________"
];

const bookBuf = Buffer.alloc(32 * 32 * 4);
for (let y = 0; y < 32; y++) {
  const row = bookIconMap[y];
  for (let x = 0; x < 32; x++) {
    const char = row[x] || '_';
    const col = bookColors[char] || [0,0,0,0];
    const idx = (y * 32 + x) * 4;
    bookBuf[idx] = col[0];
    bookBuf[idx + 1] = col[1];
    bookBuf[idx + 2] = col[2];
    bookBuf[idx + 3] = col[3];
  }
}
fs.writeFileSync(path.join(iconsDir, 'book_32.png'), createPng(32, 32, bookBuf));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(32, 32, bookBuf));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(32, 32, bookBuf));

// --- 7. MINECRAFT WORLD LANDSCAPE (320x180) ---
// Generates an authentic pixel-art Minecraft landscape background
const landWidth = 320;
const landHeight = 180;
const landBuf = Buffer.alloc(landWidth * landHeight * 4);

for (let y = 0; y < landHeight; y++) {
  for (let x = 0; x < landWidth; x++) {
    const idx = (y * landWidth + x) * 4;
    // Horizon line with gentle rolling hills
    const hillHeight1 = Math.sin(x * 0.02) * 12 + Math.cos(x * 0.05) * 6;
    const hillHeight2 = Math.sin((x + 80) * 0.015) * 18 + Math.cos(x * 0.03) * 8;
    const horizon = 100 + Math.round(hillHeight1);
    const horizonBack = 90 + Math.round(hillHeight2);

    if (y < horizonBack && y < horizon) {
      // Sky gradient
      const skyFactor = y / 100;
      const r = Math.round(120 + skyFactor * 40);
      const g = Math.round(168 + skyFactor * 30);
      const b = 255;
      
      // Minecraft square clouds
      const isCloud = (y > 20 && y < 36 && ((x + 40) % 90 < 50)) ||
                      (y > 45 && y < 58 && ((x + 120) % 130 < 70));
      if (isCloud) {
        if (y === 35 || y === 57) {
          // Cloud bottom shadow
          landBuf[idx] = 210; landBuf[idx+1] = 220; landBuf[idx+2] = 245; landBuf[idx+3] = 255;
        } else {
          // Cloud white
          landBuf[idx] = 250; landBuf[idx+1] = 252; landBuf[idx+2] = 255; landBuf[idx+3] = 255;
        }
      } else {
        landBuf[idx] = r; landBuf[idx+1] = g; landBuf[idx+2] = b; landBuf[idx+3] = 255;
      }
    } else if (y < horizon) {
      // Distant hill (bluer green / atmospheric haze)
      const dNoise = ((x * 7 + y * 13) % 5);
      landBuf[idx] = 70 + dNoise * 3;
      landBuf[idx+1] = 130 + dNoise * 4;
      landBuf[idx+2] = 90 + dNoise * 4;
      landBuf[idx+3] = 255;
    } else {
      // Foreground grass hill
      const depth = y - horizon;
      const gNoise = ((x * 11 + y * 17) % 6);
      if (depth === 0) {
        // Sunlit grass edge
        landBuf[idx] = 135 + gNoise * 4;
        landBuf[idx+1] = 195 + gNoise * 4;
        landBuf[idx+2] = 45 + gNoise * 2;
        landBuf[idx+3] = 255;
      } else if (depth < 6) {
        // Lush green top
        landBuf[idx] = 95 + gNoise * 3;
        landBuf[idx+1] = 158 + gNoise * 4;
        landBuf[idx+2] = 32 + gNoise * 2;
        landBuf[idx+3] = 255;
      } else {
        // Deep grass & dirt undertone
        const dShade = Math.min(25, depth * 0.3);
        landBuf[idx] = Math.max(40, 75 - dShade + gNoise * 3);
        landBuf[idx+1] = Math.max(60, 130 - dShade + gNoise * 3);
        landBuf[idx+2] = Math.max(20, 30 - dShade + gNoise * 2);
        landBuf[idx+3] = 255;
      }

      // Add a couple of classic voxel oak trees
      // Tree 1 at x = 50, base at horizon + 10
      const tx1 = 50, ty1 = 95;
      if (Math.abs(x - tx1) <= 12 && y <= ty1 && y >= ty1 - 24) {
        // Leaves
        const isTrunk = Math.abs(x - tx1) <= 2 && y >= ty1 - 10;
        if (isTrunk) {
          landBuf[idx] = 105; landBuf[idx+1] = 82; landBuf[idx+2] = 52; landBuf[idx+3] = 255;
        } else {
          landBuf[idx] = 55 + gNoise * 4;
          landBuf[idx+1] = 115 + gNoise * 4;
          landBuf[idx+2] = 25 + gNoise * 2;
          landBuf[idx+3] = 255;
        }
      }

      // Tree 2 at x = 270
      const tx2 = 270, ty2 = 105;
      if (Math.abs(x - tx2) <= 14 && y <= ty2 && y >= ty2 - 28) {
        const isTrunk = Math.abs(x - tx2) <= 2 && y >= ty2 - 12;
        if (isTrunk) {
          landBuf[idx] = 105; landBuf[idx+1] = 82; landBuf[idx+2] = 52; landBuf[idx+3] = 255;
        } else {
          landBuf[idx] = 50 + gNoise * 4;
          landBuf[idx+1] = 110 + gNoise * 4;
          landBuf[idx+2] = 22 + gNoise * 2;
          landBuf[idx+3] = 255;
        }
      }
    }
  }
}
fs.writeFileSync(path.join(texturesDir, 'minecraft_landscape.png'), createPng(landWidth, landHeight, landBuf));

// --- 8. FIRST-PERSON HAND HOLDING FEATHER QUILL (64x64) ---
const handWidth = 64;
const handHeight = 64;
const handBuf = Buffer.alloc(handWidth * handHeight * 4);

const handColors = {
  '_': [0, 0, 0, 0],          // transparent
  'S': [0, 135, 135, 255],     // cyan shirt sleeve
  'D': [0, 105, 105, 255],     // dark cyan sleeve shadow
  'L': [0, 165, 165, 255],     // light cyan sleeve highlight
  'K': [194, 134, 108, 255],   // Steve skin mid
  'k': [160, 105, 82, 255],    // Steve skin shadow
  'h': [225, 165, 138, 255],   // Steve skin highlight
  'F': [245, 245, 250, 255],   // Feather white
  'f': [210, 215, 225, 255],   // Feather shade
  'g': [170, 175, 185, 255],   // Feather dark shade
  'Q': [120, 90, 60, 255],     // Quill shaft
  'I': [25, 25, 25, 255]       // Black ink nib
};

// 64x64 Hand in bottom right holding quill pointing upwards-left
const handGrid = [
  "________________________________________________________________",
  "________________________________________________________________",
  "____________________________________FF__________________________",
  "___________________________________FFFF_________________________",
  "__________________________________FFFFFF________________________",
  "_________________________________FFFFFFFF_______________________",
  "________________________________FFFFFFFFFF______________________",
  "_______________________________FFFFFFFFffff_____________________",
  "______________________________FFFFFFFFffffff____________________",
  "_____________________________FFFFFFFFffffffff___________________",
  "____________________________FFFFFFFFffffffffff__________________",
  "___________________________FFFFFFFFfffffffffff__________________",
  "__________________________FFFFFFFFffffffffffgg__________________",
  "_________________________FFFFFFFFfffffffffffgg__________________",
  "________________________FFFFFFFFffffffffffffgg__________________",
  "_______________________FFFFFFFFfffffffffffffgg__________________",
  "______________________FFFFFFFFffffffffffffffgg__________________",
  "_____________________FFFFFFFFffffffffffffffggg__________________",
  "____________________FFFFFFFFfffffffffffffffggg__________________",
  "___________________FFFFFFFFffffffffffffffffggg__________________",
  "__________________FFFFFFFFfffffffffffffffffggg__________________",
  "_________________FFFFFFFFffffffffffffffffffggg__________________",
  "_________________FFFFFFffffffffffffffffffffggg__________________",
  "__________________FFFFfffffffffffffffffffffggg__________________",
  "___________________FFffffffffffffffffffffffggg__________________",
  "____________________fffffffffffffffffffffffgg___________________",
  "_____________________fffffffffffffffffffffgg____________________",
  "______________________QQQQQQfffffffffffffgg_____________________",
  "_______________________QQQQQQQffffffffffgg______________________",
  "________________________QQQQQQQQfffffffgg_______________________",
  "_________________________QQQQQQQQQffffgg________________________",
  "__________________________QQQQQQQQQQfgg_________________________",
  "___________________________QQQQQQQQQQQ__________________________",
  "____________________________QQQQQQQQQQQ_________________________",
  "_____________________________QQQQQQQQQQQ________________________",
  "______________________________IIIIQQQQQQQ_______________________",
  "_______________________________IIIIQQQQQQQ______________________",
  "________________________________IIIIQQQQQKhhh___________________",
  "_________________________________IIIQQQQKhhhhhK_________________",
  "__________________________________IIQQQKhhhhhhKK________________",
  "___________________________________IQQQKhhhhhhKKK_______________",
  "____________________________________QQKhhhhhhKKKK_______________",
  "_____________________________________KhhhhhhKKKKk_______________",
  "_____________________________________KhhhhhKKKKkk_______________",
  "_____________________________________KhhhhKKKKkkk_______________",
  "_____________________________________KKhhKKKKkkkk_______________",
  "_____________________________________KKKKKKKkkkkk_______________",
  "_____________________________________KKKKKKkkkkkk_______________",
  "______________________________________KKKkkkkkkkk_______________",
  "______________________________________KKkkkkkkkkk_______________",
  "______________________________________LLLLSSSSSSSD______________",
  "_____________________________________LLLLLLSSSSSSDD_____________",
  "____________________________________LLLLLLLLSSSSSSDDD___________",
  "___________________________________LLLLLLLLLSSSSSSDDDD__________",
  "__________________________________LLLLLLLLLLSSSSSSDDDDD_________",
  "_________________________________LLLLLLLLLLLSSSSSSDDDDDD________",
  "________________________________LLLLLLLLLLLLSSSSSSDDDDDDD_______",
  "_______________________________LLLLLLLLLLLLLSSSSSSDDDDDDDD______",
  "______________________________LLLLLLLLLLLLLLSSSSSSDDDDDDDDD_____",
  "_____________________________LLLLLLLLLLLLLLLSSSSSSDDDDDDDDDD____",
  "____________________________LLLLLLLLLLLLLLLLSSSSSSDDDDDDDDDDD___",
  "___________________________LLLLLLLLLLLLLLLLLSSSSSSDDDDDDDDDDDD__",
  "__________________________LLLLLLLLLLLLLLLLLLSSSSSSDDDDDDDDDDDDD_",
  "_________________________LLLLLLLLLLLLLLLLLLLSSSSSSDDDDDDDDDDDDDD"
];

for (let y = 0; y < 64; y++) {
  const row = handGrid[y] || '';
  for (let x = 0; x < 64; x++) {
    const char = row[x] || '_';
    const col = handColors[char] || [0,0,0,0];
    const idx = (y * 64 + x) * 4;
    handBuf[idx] = col[0];
    handBuf[idx + 1] = col[1];
    handBuf[idx + 2] = col[2];
    handBuf[idx + 3] = col[3];
  }
}
fs.writeFileSync(path.join(texturesDir, 'hand_quill.png'), createPng(handWidth, handHeight, handBuf));

// --- 9. INVENTORY ITEM SLOT (18x18) ---
// Authentic Minecraft 18x18 GUI slot with 3D inset borders
const slotBuf = Buffer.alloc(18 * 18 * 4);
for (let y = 0; y < 18; y++) {
  for (let x = 0; x < 18; x++) {
    const idx = (y * 18 + x) * 4;
    let r = 139, g = 139, b = 139; // base #8b8b8b
    if (x === 0 || y === 0) {
      // Top & Left outer shadow #373737
      r = 55; g = 55; b = 55;
    } else if (x === 17 || y === 17) {
      // Bottom & Right outer highlight #ffffff
      r = 255; g = 255; b = 255;
    } else if (x === 1 || y === 1) {
      // Inner shadow #555555
      r = 85; g = 85; b = 85;
    } else if (x === 16 || y === 16) {
      // Inner highlight #c6c6c6
      r = 198; g = 198; b = 198;
    }
    slotBuf[idx] = r;
    slotBuf[idx + 1] = g;
    slotBuf[idx + 2] = b;
    slotBuf[idx + 3] = 255;
  }
}
fs.writeFileSync(path.join(texturesDir, 'slot.png'), createPng(18, 18, slotBuf));

console.log('Successfully generated all game textures, landscape, hand-quill, and icons!');

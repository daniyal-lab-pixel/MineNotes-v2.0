import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.join(__dirname, '..', '.edge-crop-profile');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json');
      const list = await res.json();
      const pageTarget = list.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await sleep(300);
    }
  }

  if (!wsUrl) {
    console.error('Could not connect to CDP');
    edgeProcess.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, {
        resolve: val => resolve(val),
        reject: err => reject(err)
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  const cropResult = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/textures/minecraft_book.png';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });

        function crop(x, y, w, h) {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          return canvas.toDataURL('image/png').split(',')[1];
        }

        // Also create a double-page book sprite!
        // In double-page book: Left page is 0..146 (minus right edge fold), Right page is mirrored or right half!
        // Let's create double-page book background:
        // Left half (142px wide) + Center spine (12px) + Right half (142px wide)
        const dCanvas = document.createElement('canvas');
        dCanvas.width = 290;
        dCanvas.height = 180;
        const dCtx = dCanvas.getContext('2d');
        dCtx.imageSmoothingEnabled = false;
        // Draw left page
        dCtx.drawImage(img, 0, 0, 144, 180, 0, 0, 144, 180);
        // Draw right page (mirrored right side of parchment)
        // Save state for flipping right page
        dCtx.save();
        dCtx.translate(290, 0);
        dCtx.scale(-1, 1);
        // Draw flipped book but skip left stitch area (stitch is at x=0..16)
        // Right page has cover on right, parchment in middle, spine on left
        dCtx.drawImage(img, 0, 0, 144, 180, 0, 0, 144, 180);
        dCtx.restore();
        
        // Draw center spine leather over seam
        dCtx.fillStyle = '#3d200e';
        dCtx.fillRect(142, 0, 6, 180);
        dCtx.fillStyle = '#221107';
        dCtx.fillRect(144, 0, 2, 180);

        return {
          bookSingle: crop(0, 0, 146, 180),
          turnRight: crop(0, 192, 23, 13),
          turnRightHover: crop(23, 192, 23, 13),
          turnLeft: crop(0, 205, 23, 13),
          turnLeftHover: crop(23, 205, 23, 13),
          bookDouble: dCanvas.toDataURL('image/png').split(',')[1]
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  const texturesDir = path.join(__dirname, '..', 'public', 'textures');
  const r = cropResult.result.value;

  fs.writeFileSync(path.join(texturesDir, 'book_single.png'), Buffer.from(r.bookSingle, 'base64'));
  fs.writeFileSync(path.join(texturesDir, 'turn_right.png'), Buffer.from(r.turnRight, 'base64'));
  fs.writeFileSync(path.join(texturesDir, 'turn_right_hover.png'), Buffer.from(r.turnRightHover, 'base64'));
  fs.writeFileSync(path.join(texturesDir, 'turn_left.png'), Buffer.from(r.turnLeft, 'base64'));
  fs.writeFileSync(path.join(texturesDir, 'turn_left_hover.png'), Buffer.from(r.turnLeftHover, 'base64'));
  fs.writeFileSync(path.join(texturesDir, 'book_double.png'), Buffer.from(r.bookDouble, 'base64'));

  console.log('Successfully cropped all textures to public/textures!');
  ws.close();
  edgeProcess.kill();
}

main().catch(console.error);

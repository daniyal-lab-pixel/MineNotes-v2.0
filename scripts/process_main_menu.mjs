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
    '--remote-debugging-port=9224',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json');
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
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/textures/main_menu_reference.jpg';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 576;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 1024, 576);

        // In Image B:
        // The 4 stone buttons are located at x: 370..654, y: 260..452.
        // The footer texts are at y: 520..560.
        // Behind the buttons is water / river reflection.
        // On the left of buttons (x: 230..365, y: 260..452) is water with ripple reflections and lilypads.
        // On the right of buttons (x: 658..790, y: 260..452) is water with reflections and greenery.
        // Below buttons (x: 370..654, y: 456..515) is also water with lilypads!
        
        // Let's patch the center button area using the surrounding water reflection!
        // We blend left water texture (x: 220..360) and right water texture (x: 660..800) into center!
        const btnW = 286;
        const btnH = 194;
        const btnX = 369;
        const btnY = 259;

        // Sample left water
        const leftData = ctx.getImageData(btnX - btnW / 2 - 10, btnY, btnW / 2 + 10, btnH);
        // Sample right water
        const rightData = ctx.getImageData(btnX + btnW, btnY, btnW / 2 + 10, btnH);

        // Inpaint the button area:
        // For x from 0 to btnW, blend from left water reflection to right water reflection
        const centerImgData = ctx.getImageData(btnX, btnY, btnW, btnH);
        for (let y = 0; y < btnH; y++) {
          for (let x = 0; x < btnW; x++) {
            const destIdx = (y * btnW + x) * 4;
            const progress = x / btnW; // 0 (left) to 1 (right)

            // Left sample index (mirror/sample)
            const lx = Math.min(leftData.width - 1, Math.max(0, leftData.width - 1 - Math.floor(x * 0.5)));
            const lIdx = (y * leftData.width + lx) * 4;

            // Right sample index
            const rx = Math.min(rightData.width - 1, Math.max(0, Math.floor((btnW - x) * 0.5)));
            const rIdx = (y * rightData.width + rx) * 4;

            // Blend based on progress with a subtle vertical water wave variation
            const wave = Math.sin(y * 0.2 + x * 0.1) * 0.05;
            const blend = Math.max(0, Math.min(1, progress + wave));

            for (let c = 0; c < 3; c++) {
              centerImgData.data[destIdx + c] = Math.round(
                leftData.data[lIdx + c] * (1 - blend) + rightData.data[rIdx + c] * blend
              );
            }
            centerImgData.data[destIdx + 3] = 255;
          }
        }
        ctx.putImageData(centerImgData, btnX, btnY);

        // Also clean the bottom footer line (y: 525..565)
        // Left text: "MineNotes v1.0" at x: 15..140, y: 530..560
        // Center text: "Minecraft Book & Quill Edition" at x: 380..640, y: 530..550
        // Right sound icon: at x: 950..990, y: 515..550
        // We patch footer using water above it at y: 500..525
        const patchFooter = (fx, fy, fw, fh) => {
          const sample = ctx.getImageData(fx, fy - fh - 5, fw, fh);
          ctx.putImageData(sample, fx, fy);
        };
        patchFooter(10, 528, 140, 30);
        patchFooter(370, 525, 270, 30);
        patchFooter(940, 510, 60, 45);

        return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  const texturesDir = path.join(__dirname, '..', 'public', 'textures');
  if (evalResult && evalResult.result && evalResult.result.value) {
    fs.writeFileSync(
      path.join(texturesDir, 'main_menu_backdrop.jpg'),
      Buffer.from(evalResult.result.value, 'base64')
    );
    console.log('Successfully created clean main_menu_backdrop.jpg without baked buttons!');
  } else {
    console.error('Failed to create main_menu_backdrop:', evalResult);
  }

  ws.close();
  edgeProcess.kill();
}

main().catch(console.error);

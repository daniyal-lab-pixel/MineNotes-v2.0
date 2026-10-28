import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.join(__dirname, '..', '.edge-capture-mobile-profile');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Capturing mobile view at 390x844...');
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9225',
    '--window-size=390,844',
    `--user-data-dir=${profileDir}`,
    'http://localhost:5173/?screen=editor'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json');
      const list = await res.json();
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl;
        break;
      }
    } catch {
      await sleep(300);
    }
  }

  if (!wsUrl) {
    console.error('Failed to get WebSocket debugger URL');
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

  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  console.log('Waiting for Book Editor on mobile...');
  for (let i = 0; i < 40; i++) {
    const ready = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.ProseMirror'))`,
      returnByValue: true
    });
    if (ready.result?.value) {
      console.log('Editor ready!');
      break;
    }
    await sleep(250);
  }

  // Populate sample mobile lecture note text
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const editor = document.querySelector('.ProseMirror');
        if (editor) {
          editor.innerHTML = '<p><strong>Arts &amp; Media 9:15</strong></p><p>class September 30th</p><p><em>Misinformation vs Disinformation</em></p><p>Misinformation: inaccurate or misleading information that is shared WITHOUT intent to harm.</p>';
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(500);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const target = path.join(screenshotsDir, '07_mobile_single_page.png');
  fs.writeFileSync(target, buf);
  console.log('Successfully captured:', target);

  ws.close();
  edgeProcess.kill();
}

run();

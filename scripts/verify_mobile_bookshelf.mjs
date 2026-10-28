import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const artifactScreenshotsDir = 'C:\\Users\\ALPHA\\.gemini\\antigravity-ide\\brain\\e0cb3f05-a9aa-48b8-93c7-4fd05ba8b43e\\screenshots';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.join(__dirname, '..', '.edge-test-profile_mobile');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Capturing Mobile Bookshelf View...');
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9232',
    `--user-data-dir=${profileDir}`,
    'http://localhost:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9232/json');
      const list = await res.json();
      const pageTarget = list.find(t => t.url && (t.url.includes('5173') || t.url.includes('localhost'))) || list.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await sleep(300);
    }
  }

  if (!wsUrl) {
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

  await new Promise(resolve => { ws.onopen = resolve; });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return res.result?.value;
  }

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    for (let i = 0; i < 30; i++) {
      if (await evaluate(`Boolean(document.querySelector('button'))`)) break;
      await sleep(200);
    }

    if (await evaluate(`document.body.innerText.includes('Welcome to MineNotes')`)) {
      await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const doneBtn = btns.find(b => b.innerText.includes('Done'));
        if (doneBtn) doneBtn.click();
      `);
      await sleep(400);
    }

    await evaluate(`
      const btns = Array.from(document.querySelectorAll('button'));
      const libBtn = btns.find(b => (b.textContent || '').includes('Saved Notes'));
      if (libBtn) libBtn.click();
    `);
    await sleep(1000);

    const result = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    fs.writeFileSync(path.join(screenshotsDir, '09_mobile_bookshelf.png'), buffer);
    fs.writeFileSync(path.join(artifactScreenshotsDir, '09_mobile_bookshelf.png'), buffer);
    console.log('Saved 09_mobile_bookshelf.png');
  } catch (err) {
    console.error(err);
  } finally {
    edgeProcess.kill();
    process.exit(0);
  }
}

run();

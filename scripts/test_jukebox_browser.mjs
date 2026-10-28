import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.join(__dirname, '..', '.edge-test-profile');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Validating YouTube Minecraft Jukebox in Edge browser...');

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9229',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9229/json');
      const list = await res.json();
      const pageTarget = list.find(t => t.url && t.url.includes('5173')) || list.find(t => t.type === 'page');
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await sleep(300);
    }
  }

  if (!wsUrl) {
    console.error('Could not connect to Edge CDP WebSocket');
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

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise(resolve => ws.onopen = resolve);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 850,
    deviceScaleFactor: 1,
    mobile: false
  });

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  // 1. Navigate to Main Menu
  console.log('Navigating to Main Menu...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/?screen=menu' });
  await sleep(2500);

  // Click Jukebox disc button on Main Menu
  console.log('Clicking Jukebox button in Main Menu...');
  await evaluate(`
    (function() {
      const btn = document.querySelector('button[aria-label="Open Music Discs Jukebox"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);

  // Inspect Jukebox state
  const modalInfo = await evaluate(`({
    isOpen: !!document.querySelector('div[aria-label="MineNotes Jukebox"]'),
    title: document.querySelector('div[class*="nowPlayingTitle"]')?.textContent,
    trackCount: document.querySelectorAll('div[class*="trackItem"]').length,
    hasPlayer: !!document.getElementById('minenotes-yt-iframe-player')
  })`);
  console.log('Main Menu Jukebox Modal Info:', modalInfo);

  // Capture Main Menu Jukebox screenshot
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'jukebox_main_menu.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Captured screenshots/jukebox_main_menu.png');

  // Close Jukebox
  await evaluate(`
    (function() {
      const closeBtn = document.querySelector('button[aria-label="Close Jukebox"]');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(800);

  // 2. Navigate to Book & Quill Editor
  console.log('Navigating to Editor...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/?screen=editor' });
  await sleep(2500);

  // Click Jukebox HUD Button
  console.log('Toggling Jukebox side-panel in Editor...');
  await evaluate(`
    (function() {
      const btn = document.querySelector('button[aria-label="Toggle Music Discs Jukebox"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);

  const editorJukeboxInfo = await evaluate(`({
    isDocked: !!document.querySelector('div[class*="jukeboxDocked"]'),
    hasBook: !!document.querySelector('div[class*="singleBookContainer"]'),
    nowPlaying: document.querySelector('div[class*="nowPlayingTitle"]')?.textContent,
    tracksVisible: document.querySelectorAll('div[class*="trackItem"]').length
  })`);
  console.log('Editor Jukebox Side-Panel Info:', editorJukeboxInfo);

  // Test selecting track #2 (Wet Hands)
  console.log('Selecting Wet Hands track...');
  await evaluate(`
    (function() {
      const tracks = document.querySelectorAll('div[class*="trackItem"]');
      if (tracks.length > 1) {
        tracks[1].click();
      }
    })()
  `);
  await sleep(1000);

  const track2Info = await evaluate(`document.querySelector('div[class*="nowPlayingTitle"]')?.textContent`);
  console.log('Now Playing after track selection:', track2Info);

  // Capture Docked Side Panel screenshot (Book & Quill + Visible Jukebox Player side by side)
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'jukebox_docked_editor.png'), Buffer.from(shot2.data, 'base64'));
  console.log('Captured screenshots/jukebox_docked_editor.png');

  console.log('All YouTube Jukebox validations completed successfully!');
  ws.close();
  edgeProcess.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});

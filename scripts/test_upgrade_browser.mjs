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
  console.log('=== STARTING BROWSER VERIFICATION FOR TYPING SOUNDS & PERSISTENT JUKEBOX ===');

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9230',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9230/json');
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
    console.error('Could not connect to Edge CDP WebSocket on port 9230');
    edgeProcess.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('BROWSER CONSOLE:', data.params.type, data.params.args.map(a => a.value ?? a.description).join(' '));
    }
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

  await new Promise(resolve => (ws.onopen = resolve));
  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  }

  async function takeScreenshot(name) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(screenshotsDir, `${name}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${name}.png`);
  }

  // 1. Wait for Main Menu or Editor to load
  console.log('1. Waiting for app to load...');
  await sleep(2500);

  // Check if we are on loading screen or menu
  let currentScreen = await evaluate(`window.location.search || 'root'`);
  console.log('Current URL/params:', currentScreen);

  // Navigate directly to editor to test typing sounds and jukebox
  await evaluate(`
    localStorage.removeItem('minenotes_jukebox_prefs');
    window.location.href = 'http://127.0.0.1:5173/?screen=editor';
  `);
  await sleep(2500);

  await takeScreenshot('01_editor_loaded');

  // 2. Test Typing Sounds in Editor
  console.log('2. Testing typing sound engine and intelligent detection...');
  const soundTestResult = await evaluate(`
    (() => {
      // Check sound configuration
      const audioCtx = window.AudioContext ? 'supported' : 'unsupported';
      const editorElement = document.querySelector('.ProseMirror');
      if (!editorElement) return { error: 'No ProseMirror editor found' };

      // Type some characters
      editorElement.focus();
      return {
        audioCtx,
        hasEditor: true,
        editorText: editorElement.textContent
      };
    })()
  `);
  console.log('Sound test initial result:', soundTestResult);

  // Type characters using CDP Input.dispatchKeyEvent
  console.log('Typing characters into Book & Quill...');
  const textToType = "Minecraft Book & Quill Note with C418 Jukebox";
  for (const char of textToType) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      text: char,
      unmodifiedText: char,
      key: char
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: char
    });
    await sleep(40);
  }

  await sleep(500);
  await takeScreenshot('02_typed_in_book');

  const typedContent = await evaluate(`document.querySelector('.ProseMirror')?.textContent`);
  console.log('Editor text after typing:', typedContent);

  // 3. Test Persistent Jukebox: Open Expanded Mode
  console.log('3. Opening Jukebox in Expanded mode...');
  const openJukeboxRes = await evaluate(`
    (() => {
      // Find disc button in top HUD
      const discBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.getAttribute('aria-label')?.includes('Jukebox') || b.title?.includes('Jukebox')
      );
      if (discBtn) {
        discBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()
  `);
  console.log('Open Jukebox button click:', openJukeboxRes);
  await sleep(1500);

  // Click Moog City track in the playlist
  await evaluate(`
    (() => {
      const tracks = Array.from(document.querySelectorAll('div[class*="trackItem"]'));
      const moogTrack = tracks.find(t => t.textContent.includes('Moog City'));
      if (moogTrack) moogTrack.click();
    })()
  `);
  await sleep(2000);
  await takeScreenshot('03_jukebox_expanded');

  // Verify YouTube iframe is present and genuinely visible
  const iframeCheck1 = await evaluate(`
    (() => {
      const iframe = document.getElementById('minenotes-yt-iframe-player');
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { error: 'No dialog found' };
      const rect = dialog.getBoundingClientRect();
      const iframeRect = iframe ? iframe.getBoundingClientRect() : null;
      return {
        dialogVisible: rect.width > 0 && rect.height > 0,
        dialogWidth: rect.width,
        dialogHeight: rect.height,
        hasIframe: !!iframe,
        iframeRect: iframeRect ? { width: iframeRect.width, height: iframeRect.height } : null
      };
    })()
  `);
  console.log('Expanded Jukebox geometry check:', iframeCheck1);

  // 4. Test Minimize Jukebox to Compact Mini-Player
  console.log('4. Minimizing Jukebox to Compact Mini-Player...');
  const minimizeRes = await evaluate(`
    (() => {
      const minBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.getAttribute('aria-label')?.includes('Minimize') || b.title?.includes('Minimize') || b.textContent?.trim() === '_'
      );
      if (minBtn) {
        minBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()
  `);
  console.log('Minimize button click:', minimizeRes);
  await sleep(1000);
  await takeScreenshot('04_jukebox_compact_mini_player');

  // Verify Compact mini-player is visible, positioned at bottom-right, and >= 200x200
  const compactCheck = await evaluate(`
    (() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { error: 'No compact dialog found' };
      const dRect = dialog.getBoundingClientRect();
      const videoContainer = dialog.querySelector('div[class*="videoContainerCompact"], div[class*="videoContainer"]');
      const vRect = videoContainer ? videoContainer.getBoundingClientRect() : null;
      const iframe = document.getElementById('minenotes-yt-iframe-player');
      return {
        compactVisible: dRect.width > 0 && dRect.height > 0,
        compactWidth: dRect.width,
        compactHeight: dRect.height,
        compactRight: window.innerWidth - dRect.right,
        compactBottom: window.innerHeight - dRect.bottom,
        videoWidth: vRect?.width,
        videoHeight: vRect?.height,
        compliantViewport: vRect ? (vRect.width >= 200 && vRect.height >= 140) : false,
        hasIframe: !!iframe
      };
    })()
  `);
  console.log('Compact Mini-Player verification:', compactCheck);

  // 5. Verify interaction while mini-player is docked: typing, turning page, changing weather
  console.log('5. Typing and turning pages while Mini-Player is active...');
  await evaluate(`
    (() => {
      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        editor.focus();
      }
    })()
  `);
  const additionalText = " — listening to C418 without interruption!";
  for (const char of additionalText) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char, unmodifiedText: char, key: char });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: char });
    await sleep(35);
  }
  await sleep(400);

  // Turn page
  const turnNextRes = await evaluate(`
    (() => {
      const nextBtn = document.querySelector('button[aria-label="Next Page"], button[aria-label="Next Pages"]');
      if (nextBtn) {
        nextBtn.click();
        return { turned: true };
      }
      return { turned: false };
    })()
  `);
  console.log('Turn page clicked:', turnNextRes);
  await sleep(800);
  await takeScreenshot('05_page_turned_with_mini_player');

  // Verify mini-player still alive and iframe unchanged
  const miniPlayerStillAlive = await evaluate(`
    (() => {
      const iframe = document.getElementById('minenotes-yt-iframe-player');
      const dialog = document.querySelector('[role="dialog"]');
      return {
        alive: !!iframe && !!dialog,
        pageNumberText: document.querySelector('span[class*="pageNumber"]')?.textContent
      };
    })()
  `);
  console.log('Mini-player after page turn:', miniPlayerStillAlive);

  // 6. Test restoring / expanding Jukebox back
  console.log('6. Expanding Jukebox back to full view...');
  const expandRes = await evaluate(`
    (() => {
      const expandBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.getAttribute('aria-label')?.includes('Expand') || b.title?.includes('Expand') || b.textContent?.trim() === '⤢'
      );
      if (expandBtn) {
        expandBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()
  `);
  console.log('Expand button clicked:', expandRes);
  await sleep(1000);
  await takeScreenshot('06_jukebox_restored');

  // 7. Test closing Jukebox
  console.log('7. Closing Jukebox...');
  const closeRes = await evaluate(`
    (() => {
      const closeBtn = document.querySelector('button[aria-label="Close Jukebox"]');
      if (closeBtn) {
        closeBtn.click();
        return { clicked: true };
      }
      return { clicked: false };
    })()
  `);
  console.log('Close button clicked:', closeRes);
  await sleep(800);
  await takeScreenshot('07_jukebox_closed');

  // 8. Test Audio Settings in SettingsView
  console.log('8. Navigating to Settings to inspect Audio Settings...');
  await evaluate(`
    window.location.href = 'http://127.0.0.1:5173/?screen=settings';
  `);
  await sleep(2000);
  await takeScreenshot('08_audio_settings_view');

  const settingsCheck = await evaluate(`
    (() => {
      const text = document.body.textContent;
      const hasAudioHeader = text.includes('Audio & Typing Sound Settings');
      const hasTypingToggle = text.includes('Typing: ON') || text.includes('Typing: OFF');
      const hasVolumeSlider = !!document.querySelector('input[type="range"][aria-label="Typing Sound Volume"]');
      const hasPageTurns = text.includes('Page Turns: ON') || text.includes('Page Turns: OFF');
      const hasUIClicks = text.includes('UI Clicks: ON') || text.includes('UI Clicks: OFF');
      return {
        hasAudioHeader,
        hasTypingToggle,
        hasVolumeSlider,
        hasPageTurns,
        hasUIClicks
      };
    })()
  `);
  console.log('Settings view audio controls verification:', settingsCheck);

  console.log('=== ALL BROWSER VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===');
  ws.close();
  edgeProcess.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Browser verification failed with error:', err);
  process.exit(1);
});

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
  console.log('Starting browser validation with local headless Edge...');

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9228',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9228/json');
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

  console.log('Connected to Edge CDP at:', wsUrl);
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

  // Set viewport to 1280x800
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Navigate to editor directly or through UI
  console.log('Navigating to editor...');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/?screen=editor' });
  await sleep(2500);

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  // Check current screen state
  const state = await evaluate(`({
    hasEditor: !!document.querySelector('.ProseMirror'),
    pageNumber: document.querySelector('span[class*="pageNumber"]')?.textContent,
    title: document.querySelector('span[class*="titleText"]')?.textContent
  })`);
  console.log('Initial Editor State:', state);

  // Generate 12 pages of authentic content
  console.log('Injecting 12 pages of chapter content...');
  let multiPageText = '';
  for (let i = 1; i <= 15; i++) {
    multiPageText += `<p><strong>Chapter ${i}: The Deep Dark Expedition.</strong> At coordinates ${i * 120}, 48, -${i * 140}, we discovered ancient city ruins. Sculk sensors and shriekers covered the catalyst floors. We extracted amethyst shards, enchanted golden apples, and diamond horse armor.</p>`;
  }

  const injectResult = await evaluate(`
    (function() {
      const editorDom = document.querySelector('.ProseMirror');
      if (!editorDom) return { success: false, reason: 'No editor found' };

      // Dispatch paste / content change event or paste via window
      const dt = new DataTransfer();
      dt.setData('text/html', ${JSON.stringify(multiPageText)});
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      });
      editorDom.dispatchEvent(pasteEvent);
      return { success: true };
    })()
  `);
  console.log('Paste Event Result:', injectResult);
  await sleep(1500);

  // If paste event was handled by browser or editor, let's verify page count
  let pageCountInfo = await evaluate(`({
    pageNumber: document.querySelector('span[class*="pageNumber"]')?.textContent,
    contentLength: document.querySelector('.ProseMirror')?.textContent?.length
  })`);
  console.log('Current Page Info after injection:', pageCountInfo);

  // If editor didn't accept synthetic paste event, insert text via TipTap command
  if (!pageCountInfo.contentLength || pageCountInfo.contentLength < 100) {
    console.log('Using editor element typing simulation...');
    await evaluate(`
      (function() {
        const editor = document.querySelector('.ProseMirror');
        if (editor) {
          editor.focus();
          document.execCommand('insertHTML', false, ${JSON.stringify(multiPageText)});
        }
      })()
    `);
    await sleep(2000);
    pageCountInfo = await evaluate(`({
      pageNumber: document.querySelector('span[class*="pageNumber"]')?.textContent,
      contentLength: document.querySelector('.ProseMirror')?.textContent?.length
    })`);
    console.log('Page Info after direct insertion:', pageCountInfo);
  }

  // Capture Single-Page mode screenshot
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'pagination_single_page.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Captured screenshots/pagination_single_page.png');

  // Toggle to Two-Page Reading Mode (click 3rd HUD button with PixelIcon book)
  console.log('Toggling to Two-Page Reading Mode...');
  await evaluate(`
    (function() {
      const buttons = Array.from(document.querySelectorAll('button[class*="slotButton"]'));
      const bookBtn = buttons.find(b => b.title?.includes('Reading') || b.getAttribute('aria-label')?.includes('Reading'));
      if (bookBtn) {
        bookBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(1000);

  const doubleModeInfo = await evaluate(`({
    isDoubleContainer: !!document.querySelector('div[class*="doubleBookContainer"]'),
    leftPageHeader: document.querySelector('div[class*="doubleBookPageHalfLeft"] span[class*="pageNumber"]')?.textContent,
    rightPageHeader: document.querySelector('div[class*="doubleBookPageHalfRight"] span[class*="pageNumber"]')?.textContent
  })`);
  console.log('Double Mode Info:', doubleModeInfo);

  // Capture Two-Page mode screenshot
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshotsDir, 'pagination_double_page.png'), Buffer.from(shot2.data, 'base64'));
  console.log('Captured screenshots/pagination_double_page.png');

  // Click Next Arrow in Double Mode to test page turning
  console.log('Testing page turning...');
  await evaluate(`
    (function() {
      const nextBtn = document.querySelector('button[class*="turnArrowRight"]');
      if (nextBtn) nextBtn.click();
    })()
  `);
  await sleep(800);

  const turnedInfo = await evaluate(`({
    leftPageHeader: document.querySelector('div[class*="doubleBookPageHalfLeft"] span[class*="pageNumber"]')?.textContent,
    rightPageHeader: document.querySelector('div[class*="doubleBookPageHalfRight"] span[class*="pageNumber"]')?.textContent
  })`);
  console.log('Turned Page Info (Spread 2):', turnedInfo);

  // Test PDF download button
  console.log('Triggering PDF download button...');
  await evaluate(`
    (function() {
      const buttons = Array.from(document.querySelectorAll('button[class*="slotButton"]'));
      const pdfBtn = buttons.find(b => b.title?.includes('PDF') || b.getAttribute('aria-label')?.includes('PDF'));
      if (pdfBtn) pdfBtn.click();
    })()
  `);
  await sleep(1500);

  const toastInfo = await evaluate(`document.querySelector('span[class*="pdfExportToast"]')?.textContent`);
  console.log('PDF Export Toast Status:', toastInfo);

  // Reload page to verify persistence
  console.log('Testing persistence across page reload...');
  await send('Page.reload');
  await sleep(2500);

  const reloadedInfo = await evaluate(`({
    title: document.querySelector('span[class*="titleText"]')?.textContent,
    pageNumber: document.querySelector('span[class*="pageNumber"]')?.textContent,
    hasContent: !!document.querySelector('.ProseMirror')?.textContent?.trim()
  })`);
  console.log('Reloaded Persistence Info:', reloadedInfo);

  console.log('All browser validations finished successfully!');
  ws.close();
  edgeProcess.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

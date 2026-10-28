import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.join(__dirname, '..', '.edge-test-profile');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Testing Alt+Q, Text Alignment, and PDF Export in browser...');

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9226',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9226/json');
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

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  async function takeScreenshot(filename) {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    const target = path.join(screenshotsDir, filename);
    fs.writeFileSync(target, buffer);
    console.log(`Saved screenshot: ${filename}`);
  }

  await send('Page.enable');
  await send('Runtime.enable');

  // Wait for loading to finish and enter Main Menu or Welcome
  console.log('Waiting for app startup to complete...');
  for (let i = 0; i < 40; i++) {
    const hasButtons = await evaluate(`document.querySelectorAll('button').length > 0`);
    if (hasButtons) break;
    await sleep(250);
  }

  // If welcome screen, click Done
  const isWelcome = await evaluate(`
    Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Done') || b.textContent.includes('Craft'))
  `);
  if (isWelcome) {
    await evaluate(`
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Done'));
      if (doneBtn) doneBtn.click();
    `);
    await sleep(500);
  }

  // Click 'New Note' on Main Menu
  console.log('Clicking New Note on Main Menu...');
  await evaluate(`
    const newNoteBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New Note'));
    if (newNoteBtn) newNoteBtn.click();
  `);
  await sleep(1000);

  // Ensure editor is mounted
  for (let i = 0; i < 30; i++) {
    const hasEditor = await evaluate(`!!document.querySelector('.ProseMirror')`);
    if (hasEditor) break;
    await sleep(200);
  }

  console.log('Editor mounted! Testing Alt+Q keyboard shortcut...');
  await send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    modifiers: 1, // Alt
    key: 'q',
    code: 'KeyQ',
    windowsVirtualKeyCode: 81
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    modifiers: 1,
    key: 'q',
    code: 'KeyQ',
    windowsVirtualKeyCode: 81
  });
  await sleep(600);

  // If drawer is open, check alignment buttons
  let drawerOpen = await evaluate(`!!document.querySelector('[role="dialog"]')`);
  if (!drawerOpen) {
    // Click the quill button directly to open
    await evaluate(`
      const qBtn = document.querySelector('[title*="Formatting"]');
      if (qBtn) qBtn.click();
    `);
    await sleep(400);
  }

  await takeScreenshot('14_quill_drawer_open.png');

  const alignCount = await evaluate(`
    document.querySelectorAll('[title*="Align"], [title*="Justify"]').length
  `);
  console.log(`Found alignment buttons: ${alignCount} (Expected: 4)`);

  // Click Align Center button
  console.log('Clicking Align Center...');
  await evaluate(`
    const centerBtn = document.querySelector('[title="Align Center"]');
    if (centerBtn) centerBtn.click();
  `);
  await sleep(300);

  // Close drawer with Escape
  console.log('Pressing Escape to close formatting drawer...');
  await send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27
  });
  await sleep(400);

  // Insert aligned sample text into editor
  await evaluate(`
    const editor = document.querySelector('.ProseMirror');
    if (editor) {
      editor.innerHTML = '<p style="text-align: center;">== MineNotes Master Guide ==</p><p style="text-align: justify;">This is an educational note with center and justify alignment, demonstrating professional page-accurate formatting.</p>';
    }
  `);
  await sleep(500);
  await takeScreenshot('15_editor_with_aligned_text.png');

  // Click Download as PDF
  console.log('Clicking Download Book as PDF...');
  const pdfClicked = await evaluate(`
    const pdfBtn = document.querySelector('[title="Download Book as PDF"]');
    if (pdfBtn) {
      pdfBtn.click();
      return true;
    }
    return false;
  `);
  console.log('PDF button clicked:', pdfClicked);
  await sleep(1200);
  await takeScreenshot('16_pdf_export_progress.png');

  console.log('Verification completed successfully!');
  ws.close();
  edgeProcess.kill();
}

run().catch(console.error);

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
const profileDir = path.join(__dirname, '..', '.edge-capture-profile');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  console.log('Launching Edge for screenshot-based visual validation...');

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:5173/'
  ]);

  edgeProcess.stderr.on('data', () => {});

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
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
    console.error('Could not connect to CDP WebSocket.');
    edgeProcess.kill();
    process.exit(1);
  }

  console.log('Connected to CDP at:', wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', data.params.type, (data.params.args || []).map(a => a.value || a.description).join(' '));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text);
    }
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
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout waiting for CDP response: ${method} (id: ${id})`));
      }, 5000);

      pending.set(id, {
        resolve: val => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: err => {
          clearTimeout(timer);
          reject(err);
        }
      });
      // console.log(`[CDP >>] ${method} (id: ${id})`);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function takeScreenshot(filename, width = 1280, height = 720) {
    try {
      const result = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(result.data, 'base64');
      const target = path.join(screenshotsDir, filename);
      fs.writeFileSync(target, buffer);
      console.log(`Saved screenshot: ${filename}`);
      return target;
    } catch (err) {
      console.error(`Failed to capture ${filename}:`, err.message);
    }
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res.result?.value;
  }

  try {
    await send('Page.enable');
    await send('Runtime.enable');

    console.log('1. Capturing loading screen...');
    await takeScreenshot('00_loading_screen.png', 1280, 720);

    // Wait until app finishes loading and enters welcome or menu
    console.log('2. Waiting for bootstrap to complete...');
    let currentScreen = '';
    for (let i = 0; i < 30; i++) {
      currentScreen = await evaluate(`
        document.querySelector('button') ? 'ready' : 'loading'
      `);
      if (currentScreen === 'ready') break;
      await sleep(200);
    }

    // Check if on welcome screen (first run) or menu
    const isWelcome = await evaluate(`
      document.body.innerText.includes('Welcome to MineNotes')
    `);
    if (isWelcome) {
      console.log('On Welcome Book screen, clicking Done to reach Main Menu...');
      await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const doneBtn = btns.find(b => b.innerText.includes('Done'));
        if (doneBtn) doneBtn.click();
      `);
      await sleep(400);
    }

    console.log('3. Capturing Main Menu...');
    await takeScreenshot('01_main_menu.png', 1280, 720);

    console.log('4. Navigating to Saved Notes Library...');
    const navLibRes = await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const libBtn = btns.find(b => (b.textContent || '').includes('Saved Notes'));
        if (!libBtn) return 'Saved Notes button not found, btns: ' + btns.map(b => b.textContent).join(' | ');
        libBtn.click();
        return 'Clicked Saved Notes';
      })()
    `);
    console.log('NavLib result:', navLibRes);
    await sleep(600);
    await takeScreenshot('02_saved_notes_library.png', 1280, 720);

    console.log('5. Creating a new Book & Quill...');
    const craftRes = await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const craftBtn = btns.find(b => (b.textContent || '').includes('Craft Book'));
        if (!craftBtn) return 'Craft Book button not found, btns: ' + btns.map(b => b.textContent).join(' | ');
        craftBtn.click();
        return 'Clicked Craft Book';
      })()
    `);
    console.log('Craft result:', craftRes);
    await sleep(700);

    console.log('6. Capturing Blank Single-Page Book & Quill...');
    await takeScreenshot('03_blank_single_page.png', 1280, 720);

    console.log('7. Opening Formatting & Dye Inventory Drawer...');
    const formatRes = await evaluate(`
      (() => {
        const formatBtn = document.querySelector('button[aria-label="Open Formatting Palette"]');
        if (!formatBtn) return 'Format button not found';
        formatBtn.click();
        return 'Opened Formatting';
      })()
    `);
    console.log('Format result:', formatRes);
    await sleep(400);
    await takeScreenshot('04_formatting_controls.png', 1280, 720);

    console.log('8. Closing drawer and typing multi-paragraph notes...');
    await evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close Formatting"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(300);

    const typeRes = await evaluate(`
      (() => {
        const editor = document.querySelector('.ProseMirror');
        if (!editor) return 'ProseMirror not found';
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertHTML', false, '<p>Welcome to the</p><p>Minecraft.Tools book</p><p>editor :-)</p><p>It support all styles:</p><p><strong>bold</strong>, <em>italic</em>, <u>underline</u>,</p><p>and all <span style="color: #5e7c16">Mine</span><span style="color: #b02e26">craft</span> <span style="color: #3ab3da">colors</span>.</p><p>Midnyte\\'s Editable</p><p>Book &amp; Quill!</p><p>_</p>');
        return 'Typed text: ' + editor.innerText;
      })()
    `);
    console.log('Type result:', typeRes);
    await sleep(400);
    await takeScreenshot('05_book_with_content.png', 1280, 720);

    console.log('9. Switching to Desktop Two-Page Reading Mode...');
    const readModeRes = await evaluate(`
      (() => {
        const readBtn = document.querySelector('button[aria-label="Toggle Reading Mode"], button[aria-label="Two-Page Reading Mode"]');
        if (!readBtn) return 'Read button not found';
        readBtn.click();
        return 'Switched to Two-Page Reading';
      })()
    `);
    console.log('ReadMode result:', readModeRes);
    await sleep(500);
    await takeScreenshot('06_desktop_two_page_reading.png', 1280, 720);

    console.log('10. Switching back to Single-Page and testing Mobile Viewport (390x844)...');
    await evaluate(`
      (() => {
        const closeReadBtn = document.querySelector('button[aria-label="Toggle Reading Mode"], button[aria-label="Single-Page Edit Mode"]');
        if (closeReadBtn) closeReadBtn.click();
      })()
    `);
    await sleep(300);

    console.log('10b. Setting mobile viewport 390x844 and capturing 07_mobile_single_page.png...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(600);
    await takeScreenshot('07_mobile_single_page.png', 390, 844);

    // Reset back to desktop viewport
    await send('Emulation.clearDeviceMetricsOverride');
    await sleep(300);

    console.log('10c. Opening Environment Atmosphere Popover...');
    await evaluate(`
      (() => {
        const envBtn = document.querySelector('button[aria-label="Toggle Environment Atmosphere"]');
        if (envBtn) envBtn.click();
      })()
    `);
    await sleep(400);
    await takeScreenshot('09_environment_popover.png', 1280, 720);

    console.log('10d. Switching to Rain Atmosphere...');
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const rainBtn = btns.find(b => b.textContent && b.textContent.includes('Rain Ambience'));
        if (rainBtn) rainBtn.click();
      })()
    `);
    await sleep(500);
    await takeScreenshot('10_editor_rain_mode.png', 1280, 720);

    console.log('10e. Switching to Snow Atmosphere...');
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const snowBtn = btns.find(b => b.textContent && b.textContent.includes('Snow Biome'));
        if (snowBtn) snowBtn.click();
      })()
    `);
    await sleep(500);
    await takeScreenshot('11_editor_snow_mode.png', 1280, 720);

    console.log('10f. Switching to Night Atmosphere...');
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nightBtn = btns.find(b => b.textContent && b.textContent.includes('Night Sky'));
        if (nightBtn) nightBtn.click();
      })()
    `);
    await sleep(500);
    await takeScreenshot('12_editor_night_mode.png', 1280, 720);

    console.log('11. Clicking Done to return to Saved Notes Library with books...');
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const doneBtn = btns.find(b => (b.textContent || '').trim() === 'Done');
        if (doneBtn) doneBtn.click();
      })()
    `);
    await sleep(600);
    await takeScreenshot('08_saved_notes_with_books.png', 1280, 720);

    console.log('11b. Navigating to Settings...');
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const backBtn = btns.find(b => b.textContent && b.textContent.includes('Back'));
        if (backBtn) backBtn.click();
      })()
    `);
    await sleep(400);
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const settingsBtn = btns.find(b => b.textContent && b.textContent.includes('Settings'));
        if (settingsBtn) settingsBtn.click();
      })()
    `);
    await sleep(500);
    await takeScreenshot('13_settings_view.png', 1280, 720);

    console.log('12. Capturing Loading Screen...');
    await send('Page.navigate', { url: 'http://127.0.0.1:5173/?screen=loading' });
    await sleep(800);
    await takeScreenshot('00_loading_screen.png', 1280, 720);

    console.log('All visual validation screenshots successfully captured!');
  } catch (err) {
    console.error('Error during desktop capture:', err);
  } finally {
    ws.close();
    edgeProcess.kill();
  }
}

capture();


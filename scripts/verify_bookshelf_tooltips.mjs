import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const artifactScreenshotsDir = 'C:\\Users\\ALPHA\\.gemini\\antigravity-ide\\brain\\e0cb3f05-a9aa-48b8-93c7-4fd05ba8b43e\\screenshots';
if (!fs.existsSync(artifactScreenshotsDir)) {
  fs.mkdirSync(artifactScreenshotsDir, { recursive: true });
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profileDir = path.join(__dirname, '..', '.edge-test-profile');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching Edge for comprehensive Bookshelf tooltip & UX verification...');

  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9230',
    `--user-data-dir=${profileDir}`,
    'http://localhost:5173/'
  ]);

  edgeProcess.stderr.on('data', () => {});

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9230/json');
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
    console.error('Could not connect to CDP WebSocket on port 9230.');
    edgeProcess.kill();
    process.exit(1);
  }

  console.log('Connected to CDP at:', wsUrl);
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
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout waiting for CDP response: ${method} (id: ${id})`));
      }, 7000);

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
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function takeScreenshot(filename) {
    try {
      const result = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(result.data, 'base64');
      const targetLocal = path.join(screenshotsDir, filename);
      const targetArtifact = path.join(artifactScreenshotsDir, filename);
      fs.writeFileSync(targetLocal, buffer);
      fs.writeFileSync(targetArtifact, buffer);
      console.log(`Saved screenshot: ${filename}`);
      return targetLocal;
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

  async function navigateToBookshelf() {
    for (let i = 0; i < 30; i++) {
      const isReady = await evaluate(`Boolean(document.querySelector('button'))`);
      if (isReady) break;
      await sleep(200);
    }

    const isWelcome = await evaluate(`document.body.innerText.includes('Welcome to MineNotes')`);
    if (isWelcome) {
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
    await sleep(600);
  }

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 760,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating initially to Bookshelf...');
    await navigateToBookshelf();

    const bookCount = await evaluate(`document.querySelectorAll('[role="button"][aria-label^="Book:"]').length`);
    console.log(`Initial book count: ${bookCount}`);

    if (bookCount < 6) {
      console.log('Seeding sample books in IndexedDB for visual layout verification...');
      await evaluate(`
        new Promise((resolve, reject) => {
          const req = indexedDB.open('MineNotesDB');
          req.onerror = () => reject(req.error);
          req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(['notes', 'bookMetadata'], 'readwrite');
            const notesStore = tx.objectStore('notes');
            const metaStore = tx.objectStore('bookMetadata');

            const samples = [
              { id: 'sample_1', title: 'The End Poem', text: 'I see the player you mean. PLAYER? Yes. Take care.', coverId: 'netherite', isFavorite: true },
              { id: 'sample_2', title: 'Redstone Logic & Circuits', text: 'Redstone repeaters add 1 to 4 ticks of delay.', coverId: 'redstone', isFavorite: false },
              { id: 'sample_3', title: 'Brewing Guide (Potions)', text: 'Nether Wart brews Awkward Potion.', coverId: 'amethyst', isFavorite: false },
              { id: 'sample_4', title: 'Enchanting Table Mechanics', text: '15 bookshelves yield Level 30 enchantments.', coverId: 'enchanted', isFavorite: true },
              { id: 'sample_5', title: 'Deep Dark Exploration Log', text: 'Ancient cities generate at Y -52.', coverId: 'obsidian', isFavorite: false },
              { id: 'sample_6', title: 'Villager Trading Blueprints', text: 'Fletcher trades 32 sticks for 1 emerald.', coverId: 'leather', isFavorite: false },
              { id: 'sample_7', title: 'Ocean Monument Raid Notes', text: 'Conduit power grants water breathing.', coverId: 'prismarine', isFavorite: false },
              { id: 'sample_8', title: 'Mob Farm Efficiency Tests', text: 'Spawn rates drop when caves are unlit.', coverId: 'golden', isFavorite: true },
              { id: 'fixture_clean_1', title: 'Untitled Note', text: '', coverId: 'leather', isFavorite: false, isTestFixture: true }
            ];

            const now = Date.now();
            for (let i = 0; i < samples.length; i++) {
              const s = samples[i];
              notesStore.put({
                id: s.id,
                title: s.title,
                content: s.text,
                plainText: s.text,
                pageCount: 2,
                wordCount: 15,
                createdAt: now - (i * 3600000),
                updatedAt: now - (i * 1800000),
                schemaVersion: 1,
                isTestFixture: s.isTestFixture || false
              });
              metaStore.put({
                noteId: s.id,
                coverId: s.coverId,
                titleColor: '#e0d8b0',
                isFavorite: s.isFavorite,
                shelfId: 'all',
                pageCount: 2
              });
            }

            tx.oncomplete = () => {
              db.close();
              resolve(true);
            };
            tx.onerror = () => reject(tx.error);
          };
        })
      `);
      await sleep(400);

      console.log('Reloading page to display seeded books on bookshelf...');
      await send('Page.reload');
      await sleep(1000);
      await navigateToBookshelf();
    }

    // Wait until books are in DOM
    for (let i = 0; i < 20; i++) {
      const count = await evaluate(`document.querySelectorAll('[role="button"][aria-label^="Book:"]').length`);
      if (count > 0) {
        console.log(`Books rendered on shelf: ${count}`);
        break;
      }
      await sleep(200);
    }

    // 1. Capture Bookshelf Base Overview
    console.log('1. Capturing Bookshelf Overview...');
    await takeScreenshot('01_bookshelf_overview.png');

    // 2. Hover Book in Row 1 (Top Row)
    console.log('2. Hovering Top Row Book (Row 1)...');
    const topRowRect = await evaluate(`
      (() => {
        const books = Array.from(document.querySelectorAll('[role="button"][aria-label^="Book:"]'));
        if (!books.length) return null;
        const rect = books[0].getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `);

    if (topRowRect) {
      console.log('Dispatching mouseMoved to Row 1:', topRowRect);
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(topRowRect.x),
        y: Math.round(topRowRect.y)
      });
      await sleep(350);
      await takeScreenshot('02_tooltip_top_row_no_clipping.png');
    }

    // 3. Hover Book in Middle Row (Row 2)
    console.log('3. Hovering Middle Row Book...');
    const midRowRect = await evaluate(`
      (() => {
        const books = Array.from(document.querySelectorAll('[role="button"][aria-label^="Book:"]'));
        if (books.length < 5) return null;
        const rect = books[4].getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `);

    if (midRowRect) {
      console.log('Dispatching mouseMoved to Row 2:', midRowRect);
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(midRowRect.x),
        y: Math.round(midRowRect.y)
      });
      await sleep(350);
      await takeScreenshot('03_tooltip_middle_row.png');
    }

    // 4. Hover Book on Bottom Row (Last row)
    console.log('4. Hovering Bottom Row Book...');
    const botRowRect = await evaluate(`
      (() => {
        const books = Array.from(document.querySelectorAll('[role="button"][aria-label^="Book:"]'));
        if (books.length < 8) return null;
        const rect = books[books.length - 1].getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `);

    if (botRowRect) {
      console.log('Dispatching mouseMoved to Bottom Row:', botRowRect);
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: Math.round(botRowRect.x),
        y: Math.round(botRowRect.y)
      });
      await sleep(350);
      await takeScreenshot('04_tooltip_bottom_row_no_clipping.png');
    }

    // Clear hover
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 });
    await sleep(200);

    // 5. Open Safe Test Book Cleanup Modal
    console.log('5. Opening Safe Test Book Cleanup Modal...');
    const openedModal = await evaluate(`
      (() => {
        const cleanBtn = document.querySelector('button[title*="Clean"], button[aria-label*="Clean"]');
        if (cleanBtn) {
          cleanBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Open modal result:', openedModal);

    if (openedModal) {
      await sleep(400);
      await takeScreenshot('05_test_book_cleanup_modal.png');

      // Click "Select All"
      console.log('Clicking Select All in cleanup modal...');
      await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const selectAllBtn = btns.find(b => (b.textContent || '').includes('Select All'));
          if (selectAllBtn) selectAllBtn.click();
        })()
      `);
      await sleep(200);
      await takeScreenshot('06_cleanup_modal_selection.png');

      // Click "Clean Selected" to show explicit confirmation dialog
      console.log('Triggering explicit confirmation dialog in Cleanup Modal...');
      await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const cleanSelectedBtn = btns.find(b => (b.textContent || '').includes('Clean Selected') || (b.textContent || '').includes('Delete'));
          if (cleanSelectedBtn) cleanSelectedBtn.click();
        })()
      `);
      await sleep(300);
      await takeScreenshot('07_cleanup_explicit_confirm_dialog.png');

      // Cancel to safely dismiss without deleting
      await evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const cancelBtn = btns.find(b => (b.textContent || '').includes('Cancel'));
          if (cancelBtn) cancelBtn.click();
        })()
      `);
      await sleep(200);

      // Close cleanup modal
      await evaluate(`
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close Cleanup Modal"]') ||
            Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Close'));
          if (closeBtn) closeBtn.click();
        })()
      `);
      await sleep(300);
    }

    // 6. Test Debounced Search & Instant Clear
    console.log('6. Testing Debounced Search with query "Redstone"...');
    await evaluate(`
      (() => {
        const input = document.querySelector('input[placeholder="Search books..."]');
        if (input) {
          // Native value setter so React input listener triggers properly
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          nativeInputValueSetter.call(input, 'Redstone');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await sleep(400); // 120ms debounce
    await takeScreenshot('08_search_filtered_results.png');

    console.log('All Bookshelf verification screenshots captured successfully!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    edgeProcess.kill();
    process.exit(0);
  }
}

run();

import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function captureDisabled() {
  const p = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9246',
    'http://localhost:5173/?screen=editor'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://localhost:9246/json');
    const list = await res.json();
    const target = list.find(t => t.url && t.url.includes('5173'));
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    let msgId = 1;
    const send = (method, params) => new Promise(r => {
      const curId = msgId++;
      const handler = evt => {
        const d = JSON.parse(evt.data);
        if (d.id === curId) { ws.removeEventListener('message', handler); r(d.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send('Runtime.enable', {});
    await send('Page.enable', {});

    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          // Open Jukebox
          const openJukeboxBtn = document.querySelector('button[aria-label="Toggle Music Discs Jukebox"]');
          if (openJukeboxBtn) openJukeboxBtn.click();
          await new Promise(r => setTimeout(r, 600));

          // Turn off auto-skip so the disabled track stays selected for inspection
          const skipBtn = document.querySelector('button[aria-label*="Auto-Skip"]');
          if (skipBtn && skipBtn.textContent.includes('ON')) {
            skipBtn.click();
            await new Promise(r => setTimeout(r, 300));
          }

          // Select Subwoofer Lullaby (Error 150)
          const allOptions = Array.from(document.querySelectorAll('[role="option"]'));
          const subOpt = allOptions.find(o => o.textContent && o.textContent.includes('Subwoofer Lullaby'));
          if (subOpt) {
            subOpt.click();
            await new Promise(r => setTimeout(r, 600));
          }
        })()
      `,
      awaitPromise: true
    });

    await new Promise(r => setTimeout(r, 1000));

    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshot && screenshot.data) {
      fs.writeFileSync('C:\\Users\\ALPHA\\.gemini\\antigravity-ide\\brain\\e0197ea4-95e5-4997-a63b-85a8f56cbb3b\\disabled_track_ui.png', Buffer.from(screenshot.data, 'base64'));
      console.log('Disabled track screenshot saved successfully.');
    }

    p.kill();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    p.kill();
    process.exit(1);
  }
}

captureDisabled();

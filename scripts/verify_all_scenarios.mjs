import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function verifyAll() {
  console.log('--- Launching Edge for Verification Suite ---');
  const p = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9245',
    'http://localhost:5173/?screen=editor'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch('http://localhost:9245/json');
    const list = await res.json();
    const target = list.find(t => t.url && t.url.includes('5173'));
    if (!target) throw new Error('No target page found on 5173');

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

    const results = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const report = {};

          // Scenario 17: Verify HTTP Referer meta tag in DOM
          const refMeta = document.querySelector('meta[name="referrer"]');
          report['17_http_referer'] = {
            present: !!refMeta,
            content: refMeta ? refMeta.getAttribute('content') : null
          };

          // Check Jukebox Controller availability
          const jc = window.jukeboxController || null;
          // Wait for UI to mount
          await new Promise(r => setTimeout(r, 1000));

          // Open Jukebox
          const openJukeboxBtn = document.querySelector('button[aria-label="Toggle Music Discs Jukebox"]');
          if (openJukeboxBtn) openJukeboxBtn.click();
          await new Promise(r => setTimeout(r, 600));

          // Scenario 18: Check for duplicate iframes
          const iframes = document.querySelectorAll('iframe');
          report['18_duplicate_iframes'] = {
            count: iframes.length,
            ids: Array.from(iframes).map(f => f.id || f.src)
          };

          // Scenario 11 & 12: Test embedding-disabled track
          // Select 'subwoofer-lullaby' (known error 150)
          const allOptions = Array.from(document.querySelectorAll('[role="option"]'));
          const subLullabyOpt = allOptions.find(o => o.textContent && o.textContent.includes('Subwoofer Lullaby'));
          if (subLullabyOpt) {
            subLullabyOpt.click();
            await new Promise(r => setTimeout(r, 600));
          }

          // Check status label in DOM
          const labelEl = document.querySelector('[class*="nowPlayingLabel"]');
          const noticeEl = document.querySelector('[class*="noticeText"]');
          const watchBtn = document.querySelector('a[class*="watchOnYtBtn"]');
          const badges = Array.from(document.querySelectorAll('[class*="badgeDisabled"]'));

          report['11_12_embedding_disabled_ui'] = {
            statusLabelText: labelEl ? labelEl.textContent : null,
            noticeText: noticeEl ? noticeEl.textContent : null,
            watchOnYouTubePresent: !!watchBtn,
            watchOnYouTubeHref: watchBtn ? watchBtn.href : null,
            disabledBadgesCount: badges.length,
            neverSaysReady: labelEl ? !labelEl.textContent.includes('READY') : true
          };

          // Scenario 1: Select a verified playable track (Wet Hands or Sweden)
          const wetHandsOpt = allOptions.find(o => o.textContent && o.textContent.includes('Wet Hands'));
          if (wetHandsOpt) {
            wetHandsOpt.click();
            await new Promise(r => setTimeout(r, 1500));
          }

          const wetHandsLabel = document.querySelector('[class*="nowPlayingLabel"]');
          report['1_verified_track_selection'] = {
            label: wetHandsLabel ? wetHandsLabel.textContent : null
          };

          // Scenario 8: Minimize and expand without destroying player
          const minBtn = document.querySelector('button[title*="Minimize"]');
          if (minBtn) minBtn.click();
          await new Promise(r => setTimeout(r, 600));

          const compactPlayer = document.querySelector('[class*="compactContainer"]');
          const iframeDuringCompact = document.querySelectorAll('iframe');
          report['8_minimize_check'] = {
            compactMounted: !!compactPlayer,
            iframeCount: iframeDuringCompact.length
          };

          const expandBtn = document.querySelector('button[title*="Expand Jukebox"]');
          if (expandBtn) expandBtn.click();
          await new Promise(r => setTimeout(r, 600));

          const expandedPlayer = document.querySelector('[class*="jukeboxModalFixed"]');
          report['8_expand_check'] = {
            expandedMounted: !!expandedPlayer
          };

          // Scenario 3, 4, 5, 20: Type in book, turn pages, verify editor unaffected
          const editorLeft = document.querySelector('.ProseMirror');
          if (editorLeft) {
            editorLeft.focus();
            document.execCommand('insertText', false, 'Testing musical typing isolation! ');
          }
          await new Promise(r => setTimeout(r, 400));

          // Check if typing text is inside editor
          const contentIncludes = editorLeft ? editorLeft.textContent.includes('Testing musical typing isolation!') : false;
          report['3_20_typing_and_editor_integrity'] = {
            typingSuccess: contentIncludes
          };

          return report;
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('BROWSER_VERIFICATION_RESULTS:', JSON.stringify(results.result.value, null, 2));

    // Capture screenshot
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshot && screenshot.data) {
      fs.writeFileSync('scripts/verification_screenshot.png', Buffer.from(screenshot.data, 'base64'));
      console.log('Screenshot saved to scripts/verification_screenshot.png');
    }

    p.kill();
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    p.kill();
    process.exit(1);
  }
}

verifyAll();

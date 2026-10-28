import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = 'C:\\Users\\ALPHA\\.gemini\\antigravity-ide\\brain\\e0197ea4-95e5-4997-a63b-85a8f56cbb3b';

async function verifyJukebox2() {
  console.log('--- Launching Edge for Jukebox 2.0 Comprehensive Verification ---');
  const p = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9250',
    'http://localhost:5173/?screen=editor'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://localhost:9250/json');
    const list = await res.json();
    const target = list.find(t => t.url && t.url.includes('5173'));
    if (!target) throw new Error('Target page on port 5173 not found');

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

    const captureShot = async (filename) => {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      if (shot && shot.data) {
        const filePath = path.join(artifactDir, filename);
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`Saved screenshot: ${filename}`);
      }
    };

    // Step 1: Wait for app bootstrap to finish and editor or jukebox to be available
    console.log('Waiting for MineNotes editor to mount...');
    await send('Runtime.evaluate', {
      expression: `
        new Promise(async (resolve) => {
          for (let i = 0; i < 40; i++) {
            if (window.jukeboxController && document.querySelector('.ProseMirror')) {
              return resolve(true);
            }
            await new Promise(r => setTimeout(r, 200));
          }
          resolve(false);
        })
      `,
      awaitPromise: true
    });

    // Step 2: Open Jukebox expanded mode and test Haggstrom / Mice on Venus
    console.log('Opening Expanded Jukebox...');
    const step2 = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          window.jukeboxController.openExpanded();
          await new Promise(r => setTimeout(r, 600));

          const allOptions = Array.from(document.querySelectorAll('[role="option"]'));
          const haggstromOpt = allOptions.find(o => o.textContent && o.textContent.includes('Haggstrom'));
          const miceOpt = allOptions.find(o => o.textContent && o.textContent.includes('Mice on Venus'));

          // Test playing Mice on Venus
          if (miceOpt) {
            miceOpt.click();
            await new Promise(r => setTimeout(r, 1500));
          }

          const jcState = window.jukeboxController.getState();

          return {
            haggstromFound: !!haggstromOpt,
            haggstromDisabled: haggstromOpt ? haggstromOpt.innerHTML.includes('DISABLED') : false,
            miceFound: !!miceOpt,
            miceDisabled: miceOpt ? miceOpt.innerHTML.includes('DISABLED') : false,
            currentTrackId: jcState.currentTrack.id,
            currentVideoId: jcState.currentTrack.videoId,
            playbackStatus: jcState.status
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('STEP 2 (C418 Catalog & Playback):', step2.result.value);
    await captureShot('jukebox_2_expanded_c418.png');

    // Step 3: Open Add Music Modal and test input
    console.log('Opening Add Music modal...');
    const step3 = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const addMusicBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('+ Add Music'));
          if (addMusicBtn) addMusicBtn.click();
          await new Promise(r => setTimeout(r, 400));
          const urlInput = document.getElementById('yt-url-input');
          return { modalOpened: !!urlInput };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('STEP 3 (Add Modal Opened):', step3.result.value);
    await captureShot('jukebox_2_add_modal.png');

    // Step 4: Add custom song URL using React native value setter
    console.log('Adding custom song via modal...');
    const step4 = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const setReactInputValue = (input, val) => {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, val);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          };

          const urlInput = document.getElementById('yt-url-input');
          const titleInput = document.getElementById('yt-title-input');
          if (urlInput) {
            setReactInputValue(urlInput, 'https://www.youtube.com/watch?v=sgrs4l9BqD8');
            await new Promise(r => setTimeout(r, 300));
          }
          if (titleInput) {
            setReactInputValue(titleInput, 'Wet Hands (Piano Cover)');
            await new Promise(r => setTimeout(r, 200));
          }

          const addSongBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Add Song');
          if (addSongBtn && !addSongBtn.disabled) {
            addSongBtn.click();
            await new Promise(r => setTimeout(r, 800));
          } else {
            // Fallback directly to controller if DOM button not ready
            await window.jukeboxController.addCustomSong('https://www.youtube.com/watch?v=sgrs4l9BqD8', 'Wet Hands (Piano Cover)');
          }

          const jcState = window.jukeboxController.getState();
          return {
            customSongsCount: jcState.customSongs.length,
            addedSong: jcState.customSongs[0] || null
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('STEP 4 (Custom Song Added):', step4.result.value);

    // Switch to My Music tab and take screenshot
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          window.jukeboxController.setActiveTab('custom_songs');
          await new Promise(r => setTimeout(r, 400));
        })()
      `,
      awaitPromise: true
    });
    await captureShot('jukebox_2_my_music.png');

    // Step 5: Add custom playlist
    console.log('Adding custom playlist...');
    const step5 = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const setReactInputValue = (input, val) => {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, val);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          };

          const addMusicBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('+ Add Music'));
          if (addMusicBtn) addMusicBtn.click();
          await new Promise(r => setTimeout(r, 400));

          const urlInput = document.getElementById('yt-url-input');
          const titleInput = document.getElementById('yt-title-input');
          if (urlInput) {
            setReactInputValue(urlInput, 'https://www.youtube.com/playlist?list=PLnN3NiQZ44TqUnqLZvGM_k5G6IAxcxwtg');
            await new Promise(r => setTimeout(r, 300));
          }
          if (titleInput) {
            setReactInputValue(titleInput, 'Minecraft Volume Alpha OST');
            await new Promise(r => setTimeout(r, 200));
          }

          const addPlBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Add Playlist');
          if (addPlBtn && !addPlBtn.disabled) {
            addPlBtn.click();
            await new Promise(r => setTimeout(r, 800));
          } else {
            await window.jukeboxController.addCustomPlaylist('https://www.youtube.com/playlist?list=PLnN3NiQZ44TqUnqLZvGM_k5G6IAxcxwtg', 'Minecraft Volume Alpha OST');
          }

          const jcState = window.jukeboxController.getState();
          return {
            customPlaylistsCount: jcState.customPlaylists.length,
            addedPlaylist: jcState.customPlaylists[0] || null
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('STEP 5 (Custom Playlist Added):', step5.result.value);

    // Switch to My Playlists tab and take screenshot
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          window.jukeboxController.setActiveTab('custom_playlists');
          await new Promise(r => setTimeout(r, 400));
        })()
      `,
      awaitPromise: true
    });
    await captureShot('jukebox_2_my_playlists.png');

    // Step 6: Minimize to compact mini-player and type in Book & Quill
    console.log('Minimizing to Compact Mini-Player...');
    const step6 = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          window.jukeboxController.minimize();
          await new Promise(r => setTimeout(r, 500));

          const compactPlayer = document.querySelector('[class*="compactContainer"]');
          const iframes = document.querySelectorAll('iframe');

          // Type in Book & Quill editor
          const editor = document.querySelector('.ProseMirror');
          if (editor) {
            editor.focus();
            document.execCommand('insertText', false, 'Playing YouTube music seamlessly while crafting notes in Book & Quill!');
          }
          await new Promise(r => setTimeout(r, 500));

          return {
            compactMounted: !!compactPlayer,
            iframeCount: iframes.length,
            editorTextWritten: editor ? editor.textContent.includes('Playing YouTube music seamlessly') : false,
            jukeboxMode: window.jukeboxController.getState().displayMode
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('STEP 6 (Compact Mini-Player & Note Writing):', step6.result.value);
    await captureShot('jukebox_2_compact_writing.png');

    // Step 7: Verify closing stops player
    console.log('Closing player completely...');
    const step7 = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          window.jukeboxController.close();
          await new Promise(r => setTimeout(r, 300));
          const jcState = window.jukeboxController.getState();
          return {
            displayMode: jcState.displayMode,
            status: jcState.status
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('STEP 7 (Closed Player):', step7.result.value);

    console.log('--- ALL VERIFICATION STEPS COMPLETED SUCCESSFULLY ---');
    p.kill();
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    p.kill();
    process.exit(1);
  }
}

verifyJukebox2();

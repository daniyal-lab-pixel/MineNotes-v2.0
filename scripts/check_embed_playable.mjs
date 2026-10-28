import { spawn } from 'child_process';
const C418_PLAYLIST = [
  { id: 'sweden', title: 'Sweden', videoId: 'xIQrC4CerB8' },
  { id: 'mice-on-venus', title: 'Mice on Venus', videoId: 'T5-faDLv1Vs' }
];

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testTrack(track) {
  return new Promise((resolve) => {
    const p = spawn(edgePath, [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9238',
      `https://www.youtube.com/embed/${track.videoId}?enablejsapi=1`
    ]);

    setTimeout(async () => {
      try {
        const res = await fetch('http://127.0.0.1:9238/json');
        const list = await res.json();
        const page = list.find(t => t.url && t.url.includes(track.videoId));
        if (!page) {
          p.kill();
          return resolve({ ...track, playable: false, reason: 'Page not found' });
        }
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        ws.onopen = () => {
          ws.send(JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
              expression: `document.body.innerText.includes('unavailable') || document.body.innerText.includes('disabled')`,
              returnByValue: true
            }
          }));
          ws.onmessage = (e) => {
            const d = JSON.parse(e.data);
            const isBlocked = d.result?.result?.value;
            ws.close();
            p.kill();
            resolve({ ...track, playable: !isBlocked, isBlocked });
          };
        };
      } catch (err) {
        p.kill();
        resolve({ ...track, playable: false, error: err.message });
      }
    }, 2500);
  });
}

async function main() {
  console.log('Testing all C418 tracks in actual Edge browser embed...');
  for (const track of C418_PLAYLIST) {
    const res = await testTrack(track);
    console.log(`${track.title} (${track.videoId}): ${res.playable ? 'PLAYABLE' : 'BLOCKED'}`);
  }
  process.exit(0);
}

main();

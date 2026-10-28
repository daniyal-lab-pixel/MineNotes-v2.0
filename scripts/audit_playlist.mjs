import { spawn } from 'child_process';
const C418_PLAYLIST = [
  { id: 'moog-city', title: 'Moog City', videoId: 'LFkIWS0njCc' },
  { id: 'wet-hands', title: 'Wet Hands', videoId: 'sgrs4l9BqD8' },
  { id: 'sweden', title: 'Sweden', videoId: 'xIQrC4CerB8' },
  { id: 'subwoofer-lullaby', title: 'Subwoofer Lullaby', videoId: 'ibUOxEBxVsE' },
  { id: 'living-mice', title: 'Living Mice', videoId: '5baJg-Ldgl0' },
  { id: 'haggstrom', title: 'Haggstrom', videoId: 'JZNy6eHw3FA' },
  { id: 'minecraft', title: 'Minecraft', videoId: 'qq-RGFyaq0U' },
  { id: 'mice-on-venus', title: 'Mice on Venus', videoId: 'T5-faDLv1Vs' },
  { id: 'dry-hands', title: 'Dry Hands', videoId: 'g9k-k8dZnyk' },
  { id: 'aria-math', title: 'Aria Math', videoId: 'atgjKEgSqSU' },
  { id: 'moog-city-2', title: 'Moog City 2', videoId: 'ML0ljUFlv8k' }
];

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function audit() {
  const p = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9241',
    'http://localhost:5173/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://localhost:9241/json');
    const list = await res.json();
    const target = list.find(t => t.url && t.url.includes('5173'));
    if (!target) throw new Error('No target page found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    let msgId = 1;
    const send = (method, params) => new Promise((resolve) => {
      const curId = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send('Runtime.enable', {});

    const evalResult = await send('Runtime.evaluate', {
      expression: `
        new Promise(async (resolve) => {
          const playlist = ${JSON.stringify(C418_PLAYLIST)};
          const report = [];

          if (!window.YT) {
            await new Promise((resScript) => {
              const tag = document.createElement('script');
              tag.src = 'https://www.youtube.com/iframe_api';
              window.onYouTubeIframeAPIReady = resScript;
              document.head.appendChild(tag);
            });
          }

          for (const track of playlist) {
            const container = document.createElement('div');
            container.id = 'audit-' + track.id;
            document.body.appendChild(container);

            const result = await new Promise((resTrack) => {
              let timeout = setTimeout(() => {
                finish({ status: 'TIMEOUT', duration: 4000 });
              }, 6000);

              let playerInstance = null;
              function finish(data) {
                clearTimeout(timeout);
                try {
                  if (playerInstance) playerInstance.destroy();
                  container.remove();
                } catch (e) {}
                resTrack(data);
              }

              try {
                playerInstance = new window.YT.Player(container.id, {
                  width: '240',
                  height: '200',
                  videoId: track.videoId,
                  playerVars: {
                    autoplay: 1,
                    origin: window.location.origin
                  },
                  events: {
                    onReady: (e) => {
                      try {
                        e.target.mute();
                        e.target.playVideo();
                      } catch (err) {}
                    },
                    onStateChange: (e) => {
                      // 1 = PLAYING, 3 = BUFFERING
                      if (e.data === 1) {
                        finish({ status: 'PLAYING_SUCCESS', code: 1 });
                      }
                    },
                    onError: (e) => {
                      finish({ status: 'ERROR', code: e.data });
                    }
                  }
                });
              } catch (err) {
                finish({ status: 'INIT_EXCEPTION', error: err.message });
              }
            });

            report.push({
              id: track.id,
              title: track.title,
              videoId: track.videoId,
              result
            });
          }

          resolve(report);
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('AUDIT_REPORT:', JSON.stringify(evalResult.result.value, null, 2));

    p.kill();
    process.exit(0);
  } catch (err) {
    console.error('Audit failed:', err);
    p.kill();
    process.exit(1);
  }
}

audit();

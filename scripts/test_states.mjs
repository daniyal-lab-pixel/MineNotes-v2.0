import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testStates() {
  const p = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9248',
    'http://localhost:5173/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://localhost:9248/json');
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

    const evalResult = await send('Runtime.evaluate', {
      expression: `
        new Promise(async (resolve) => {
          if (!window.YT) {
            await new Promise(resScript => {
              const tag = document.createElement('script');
              tag.src = 'https://www.youtube.com/iframe_api';
              window.onYouTubeIframeAPIReady = resScript;
              document.head.appendChild(tag);
            });
          }

          const container = document.createElement('div');
          document.body.appendChild(container);

          const events = [];
          const pl = new window.YT.Player(container, {
            width: '300',
            height: '200',
            videoId: 'X-u53QiZftg',
            playerVars: { autoplay: 1, origin: window.location.origin },
            events: {
              onReady: (e) => {
                events.push('READY');
                e.target.mute();
                e.target.playVideo();
              },
              onStateChange: (e) => {
                events.push('STATE_' + e.data);
                // If 1 (PLAYING)
                if (e.data === 1) {
                  setTimeout(() => {
                    resolve({ events, finalState: pl.getPlayerState(), videoData: pl.getVideoData() });
                  }, 1000);
                }
              },
              onError: (e) => {
                events.push('ERROR_' + e.data);
                resolve({ events, error: e.data });
              }
            }
          });

          setTimeout(() => {
            resolve({ events, timedOutState: pl.getPlayerState ? pl.getPlayerState() : null });
          }, 6000);
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('EVAL_RESULT:', JSON.stringify(evalResult.result.value, null, 2));
    p.kill();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    p.kill();
    process.exit(1);
  }
}

testStates();

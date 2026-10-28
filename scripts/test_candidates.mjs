import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const candidates = [
  { name: 'Subwoofer Lullaby 1', id: '3yzHucRX23E' },
  { name: 'Subwoofer Lullaby 2', id: 'k-V31X3_V9Y' },
  { name: 'Subwoofer Lullaby 3', id: '68EozgqC6gA' },
  { name: 'Living Mice 1', id: '6v4m1Xw5p0M' },
  { name: 'Living Mice 2', id: '1F2lY64w_sY' },
  { name: 'Haggstrom 1', id: '525j-W56YgI' },
  { name: 'Mice on Venus 1', id: 'HMj_hqdfhqw' },
  { name: 'Mice on Venus 2', id: '5v4w60c5w0g' },
  { name: 'Dry Hands 1', id: '7X2d5sC6v8k' }
];

async function test() {
  const p = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9242',
    'http://localhost:5173/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch('http://localhost:9242/json');
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
          const list = ${JSON.stringify(candidates)};
          const report = {};

          if (!window.YT) {
            await new Promise(resScript => {
              const tag = document.createElement('script');
              tag.src = 'https://www.youtube.com/iframe_api';
              window.onYouTubeIframeAPIReady = resScript;
              document.head.appendChild(tag);
            });
          }

          for (const item of list) {
            const container = document.createElement('div');
            container.id = 'cand-' + item.id;
            document.body.appendChild(container);

            const result = await new Promise(resTrack => {
              let timeout = setTimeout(() => {
                finish({ status: 'TIMEOUT' });
              }, 4000);

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
                  videoId: item.id,
                  playerVars: { autoplay: 1, origin: window.location.origin },
                  events: {
                    onReady: (e) => {
                      try { e.target.mute(); e.target.playVideo(); } catch (err) {}
                    },
                    onStateChange: (e) => {
                      if (e.data === 1) finish({ status: 'PLAYING_SUCCESS' });
                    },
                    onError: (e) => {
                      finish({ status: 'ERROR', code: e.data });
                    }
                  }
                });
              } catch (err) {
                finish({ status: 'EXCEPTION', error: err.message });
              }
            });

            report[item.id] = { name: item.name, ...result };
          }

          resolve(report);
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('CANDIDATES_REPORT:', JSON.stringify(evalResult.result.value, null, 2));
    p.kill();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    p.kill();
    process.exit(1);
  }
}

test();

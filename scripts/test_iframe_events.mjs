import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const candidates = [
  'a01QQhYLhjE',
  'w_vk7UwFBhc',
  'LFkIWS0njCc',
  'qq-RGFyaq0U',
  'sgrs4l9BqD8',
  'GH5_dD6EZno',
  'U3x8PkbP0-Q'
];

async function run() {
  const p = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9240',
    'http://127.0.0.1:5173/?screen=editor'
  ]);

  setTimeout(async () => {
    try {
      const res = await fetch('http://127.0.0.1:9240/json');
      const list = await res.json();
      const target = list.find(t => t.url && t.url.includes('5173'));
      const ws = new WebSocket(target.webSocketDebuggerUrl);

      ws.onopen = async () => {
        let id = 1;
        const call = (method, params) => new Promise(r => {
          const curId = id++;
          const handler = e => {
            const d = JSON.parse(e.data);
            if (d.id === curId) { ws.removeEventListener('message', handler); r(d.result); }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id: curId, method, params }));
        });

        await call('Runtime.enable', {});

        // Test candidates directly in the browser with new YT.Player
        const results = await call('Runtime.evaluate', {
          expression: `
            new Promise(async (resolve) => {
              const ids = ${JSON.stringify(candidates)};
              const out = {};
              
              // Load YT script if not ready
              if (!window.YT) {
                await new Promise(r => {
                  const tag = document.createElement('script');
                  tag.src = 'https://www.youtube.com/iframe_api';
                  window.onYouTubeIframeAPIReady = r;
                  document.head.appendChild(tag);
                });
              }

              for (const vid of ids) {
                const tempDiv = document.createElement('div');
                document.body.appendChild(tempDiv);
                const status = await new Promise(resTrack => {
                  let settled = false;
                  const pl = new window.YT.Player(tempDiv, {
                    width: '200',
                    height: '200',
                    videoId: vid,
                    events: {
                      onReady: () => {
                        setTimeout(() => {
                          if (!settled) { settled = true; resTrack('READY_OK'); pl.destroy(); }
                        }, 1200);
                      },
                      onError: (e) => {
                        if (!settled) { settled = true; resTrack('ERROR_' + e.data); pl.destroy(); }
                      }
                    }
                  });
                });
                out[vid] = status;
              }
              resolve(out);
            })
          `,
          awaitPromise: true,
          returnByValue: true
        });

        console.log('Results:', results?.value || results);
        p.kill();
        process.exit(0);
      };
    } catch (e) {
      console.log('Error:', e.message);
      p.kill();
      process.exit(1);
    }
  }, 2500);
}

run();

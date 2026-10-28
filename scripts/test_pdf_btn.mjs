import { spawn } from 'child_process';

async function main() {
  const edgeProcess = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9229',
    'http://127.0.0.1:5173/?screen=editor'
  ]);
  await new Promise(r => setTimeout(r, 2500));
  const res = await fetch('http://127.0.0.1:9229/json');
  const list = await res.json();
  const pageTarget = list.find(t => t.url && t.url.includes('5173')) || list[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({
    id: 2,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          const btn = document.querySelector('[title="Download Book as PDF"]');
          if (btn) {
            btn.click();
            return "CLICKED_SUCCESS";
          }
          return "BUTTON_NOT_FOUND";
        })()
      `,
      returnByValue: true
    }
  }));

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id === 2) {
      console.log('PDF response payload:', JSON.stringify(data));
      ws.close();
      edgeProcess.kill();
      process.exit(0);
    }
  };
}

main().catch(console.error);

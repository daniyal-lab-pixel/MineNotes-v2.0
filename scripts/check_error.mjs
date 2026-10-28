async function check() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const list = await res.json();
  const page = list.find(t => t.type === 'page');
  if (!page) {
    console.log('No page target found');
    return;
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `({
          errorText: document.querySelector('.errorBox p')?.innerText,
          bodyText: document.body.innerText,
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent)
        })`,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = e => {
    console.log('Result:', JSON.parse(e.data).result?.result?.value);
    process.exit(0);
  };
}
check();

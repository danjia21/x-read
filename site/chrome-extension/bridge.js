const trustedOrigins = new Set([
  'https://read.danjia.me',
  'http://127.0.0.1:3000', 'http://127.0.0.1:4173',
  'http://localhost:3000', 'http://localhost:4173',
]);

window.addEventListener('message', async event => {
  if (!trustedOrigins.has(location.origin)) return;
  const message = event.data;
  if (event.source !== window || event.origin !== location.origin ||
      message?.type !== 'x-read:open-with-notes' || typeof message.id !== 'string') return;

  let ok = false;
  try {
    const result = await chrome.runtime.sendMessage(message);
    ok = result?.ok === true;
  } catch { /* The extension may have been reloaded since this page opened. */ }
  window.postMessage({type: 'x-read:extension-result', id: message.id, ok}, location.origin);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, startServer } = require('../server');

async function listenServer(options = { port: 0, host: '127.0.0.1' }) {
  const server = startServer(options);
  if (!server.listening) {
    await new Promise((resolve) => server.on('listening', resolve));
  }
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    server,
    baseUrl,
    close: () => new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }),
  };
}

test('GET / returns 200 and plain text message', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
    const text = await res.text();
    assert.equal(text, 'CMK/GSX mockup server is running\n');
  } finally {
    await close();
  }
});

test('GET /not-found returns 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/not-found`);
    assert.equal(res.status, 404);
  } finally {
    await close();
  }
});

test('options.port=0 takes precedence over process.env.PORT', async () => {
  const originalPort = process.env.PORT;
  process.env.PORT = '99999';
  let runningServer = null;
  try {
    const { server, baseUrl, close } = await listenServer({ port: 0, host: '127.0.0.1' });
    runningServer = { close };
    const port = server.address().port;
    assert.ok(port > 0, 'Server should bind to an available ephemeral port');
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
  } finally {
    if (originalPort !== undefined) {
      process.env.PORT = originalPort;
    } else {
      delete process.env.PORT;
    }
    if (runningServer) {
      await runningServer.close();
    }
  }
});

test('requiring server.js has no side effects and exports functions', () => {
  assert.equal(typeof createApp, 'function');
  assert.equal(typeof startServer, 'function');
  const app = createApp();
  assert.ok(app);
  assert.equal(typeof app.listen, 'function');
});

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

const EXPECTED_INITIAL_FACILITIES = [
  { id: 'higashi2-gate', name: '東2ゲート', type: 'gate', state: 'open', x: 120, y: 340 },
  { id: 'higashi3-gate', name: '東3ゲート', type: 'gate', state: 'open', x: 180, y: 340 },
  { id: 'higashi123-shutter', name: '東123シャッター', type: 'shutter', state: 'open', x: 100, y: 200 },
  { id: 'higashi456-shutter', name: '東456シャッター', type: 'shutter', state: 'closed', x: 260, y: 200 },
  { id: 'higashi78-shutter', name: '東78シャッター', type: 'shutter', state: 'open', x: 420, y: 200 },
];

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

test('GET /api/facilities returns 200 and JSON array with all 5 initial facilities', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.deepStrictEqual(data, EXPECTED_INITIAL_FACILITIES);
  } finally {
    await close();
  }
});

test('GET /api/not-found returns 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/not-found`);
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

test('GET /h directly returns 200 without redirect and serves H terminal page', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`, { redirect: 'manual' });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('location'), null);
    assert.match(res.headers.get('content-type'), /^text\/html;\s*charset=utf-8/i);
    const text = await res.text();
    assert.ok(text.includes('H端末（指揮所用）'));
    assert.ok(!text.includes('M端末（現場用）'));
  } finally {
    await close();
  }
});

test('GET /m directly returns 200 without redirect and serves M terminal page', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`, { redirect: 'manual' });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('location'), null);
    assert.match(res.headers.get('content-type'), /^text\/html;\s*charset=utf-8/i);
    const text = await res.text();
    assert.ok(text.includes('M端末（現場用）'));
    assert.ok(!text.includes('H端末（指揮所用）'));
  } finally {
    await close();
  }
});

test('GET /h/index.html and GET /m/index.html serve respective terminal pages via static route', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const resH = await fetch(`${baseUrl}/h/index.html`);
    assert.equal(resH.status, 200);
    assert.match(resH.headers.get('content-type'), /^text\/html;\s*charset=utf-8/i);
    const textH = await resH.text();
    assert.ok(textH.includes('H端末（指揮所用）'));
    assert.ok(!textH.includes('M端末（現場用）'));

    const resM = await fetch(`${baseUrl}/m/index.html`);
    assert.equal(resM.status, 200);
    assert.match(resM.headers.get('content-type'), /^text\/html;\s*charset=utf-8/i);
    const textM = await resM.text();
    assert.ok(textM.includes('M端末（現場用）'));
    assert.ok(!textM.includes('H端末（指揮所用）'));
  } finally {
    await close();
  }
});

test('static 404: /h/missing.css and /m/missing.css return 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const resH = await fetch(`${baseUrl}/h/missing.css`);
    assert.equal(resH.status, 404);

    const resM = await fetch(`${baseUrl}/m/missing.css`);
    assert.equal(resM.status, 404);
  } finally {
    await close();
  }
});

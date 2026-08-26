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

const EXPECTED_FACILITY_IDS = [
  'higashi1-gate',
  'higashi2-gate',
  'higashi3-gate',
  'higashi4-gate',
  'higashi5-gate',
  'higashi6-gate',
  'higashi7-5-gate',
  'higashi13-gate',
  'higashi1-a-shutter',
  'higashi1-b-shutter',
  'higashi1-c-shutter',
  'higashi1-d-shutter',
  'higashi1-12-shutter',
  'higashi1-34-shutter',
  'higashi2-a-shutter',
  'higashi2-b-shutter',
  'higashi2-12-shutter',
  'higashi2-34-shutter',
  'higashi3-a-shutter',
  'higashi3-b-shutter',
  'higashi3-c-shutter',
  'higashi3-d-shutter',
  'higashi3-12-shutter',
  'higashi3-34-shutter',
  'higashi7-a-shutter',
  'higashi7-b-shutter',
  'higashi7-c-shutter',
  'higashi7-d-shutter',
  'higashi8-a-shutter',
  'higashi8-b-shutter',
];

const REPRESENTATIVE_FACILITIES = [
  { id: 'higashi2-gate', name: '東2ゲート', type: 'gate', state: 'open', x: 2388, y: 184 },
  { id: 'higashi13-gate', name: '東13ゲート', type: 'checkpoint', state: 'open', x: 20, y: 1300 },
  { id: 'higashi2-34-shutter', name: '東2-3/4', type: 'shutter', state: 'closed', x: 1600, y: 628 },
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

test('GET /api/facilities returns 200 and JSON array with all 30 facility IDs in order and matching keys', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 30);
    assert.deepStrictEqual(data.map((f) => f.id), EXPECTED_FACILITY_IDS);

    const expectedKeys = ['id', 'name', 'state', 'type', 'x', 'y'];
    for (const item of data) {
      assert.deepStrictEqual(Object.keys(item).sort(), expectedKeys);
    }
  } finally {
    await close();
  }
});

test('GET /api/facilities returns representative facilities with full field values', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities`);
    assert.equal(res.status, 200);
    const data = await res.json();

    for (const expected of REPRESENTATIVE_FACILITIES) {
      const actual = data.find((f) => f.id === expected.id);
      assert.ok(actual, `Representative facility ${expected.id} not found in response`);
      assert.deepStrictEqual(actual, expected);
    }
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

test('GET /shared/map-east.svg returns 200, svg content-type, and viewBox', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/shared/map-east.svg`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /image\/svg\+xml/i);
    const text = await res.text();
    assert.ok(text.includes('viewBox="0 0 2420.04 1386.29"'));
  } finally {
    await close();
  }
});

test('GET /shared/facility-map-check.html returns 200 and html content', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/shared/facility-map-check.html`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/html;\s*charset=utf-8/i);
  } finally {
    await close();
  }
});

const EXPECTED_HALL_NAMES = ['東1H', '東2H', '東3H', '東4H', '東5H', '東6H', '東7H', '東8H'];

test('GET /shared/facility-map-check.html body includes all 8 hall names', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/shared/facility-map-check.html`);
    const body = await res.text();
    for (const hallName of EXPECTED_HALL_NAMES) {
      assert.ok(body.includes(hallName), `body should include hall name: ${hallName}`);
    }
  } finally {
    await close();
  }
});

const EXPECTED_PLACE_NAMES = ['ガレリア', 'リンクスペース', '東ターミナル', '東棟屋外駐車場'];

test('GET /shared/facility-map-check.html body includes all 4 place names', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/shared/facility-map-check.html`);
    const body = await res.text();
    for (const placeName of EXPECTED_PLACE_NAMES) {
      assert.ok(body.includes(placeName), `body should include place name: ${placeName}`);
    }
  } finally {
    await close();
  }
});

test('GET /shared/missing.svg returns 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/shared/missing.svg`);
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

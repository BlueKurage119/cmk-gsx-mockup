const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server');
const { resetFacilities } = require('../src/state/facilities');
const { resetRequests } = require('../src/state/requests');

beforeEach(() => {
  resetFacilities();
  resetRequests();
});

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
  { id: 'higashi1-gate', name: '東1ゲート', type: 'gate', state: 'open', x: 2355, y: 531 },
  { id: 'higashi2-gate', name: '東2ゲート', type: 'gate', state: 'closed', x: 2388, y: 184 },
  { id: 'higashi13-gate', name: '東13ゲート', type: 'checkpoint', state: 'closed', x: 20, y: 1300 },
  { id: 'higashi2-34-shutter', name: '東2-入口3・4', type: 'shutter', state: 'closed', x: 1600, y: 628 },
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

test('PUT /api/facilities/:id updates state and returns updated facility', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/higashi2-gate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'open' }),
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^application\/json/i);
    const data = await res.json();
    assert.equal(data.id, 'higashi2-gate');
    assert.equal(data.state, 'open');
    assert.equal(data.name, '東2ゲート');

    // Verify GET /api/facilities reflects update
    const getRes = await fetch(`${baseUrl}/api/facilities`);
    const all = await getRes.json();
    const updated = all.find((f) => f.id === 'higashi2-gate');
    assert.equal(updated.state, 'open');
  } finally {
    await close();
  }
});

test('PUT /api/facilities/:id supports restricted state', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/higashi1-a-shutter`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'restricted' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, 'higashi1-a-shutter');
    assert.equal(data.state, 'restricted');
  } finally {
    await close();
  }
});

test('PUT /api/facilities/:id with invalid state returns 400', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/higashi2-gate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'invalid_state' }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    await close();
  }
});

test('PUT /api/facilities/:id with missing body or state returns 400', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/higashi2-gate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  } finally {
    await close();
  }
});

test('PUT /api/facilities/:id for non-existent facility returns 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/non-existent-facility`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'open' }),
    });
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    await close();
  }
});

test('PUT /api/facilities/batch updates multiple facilities and returns success', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: ['higashi1-a-shutter', 'higashi1-b-shutter', 'higashi2-gate'],
        state: 'open',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.updatedCount, 3);
    assert.equal(data.facilities.length, 3);
    for (const f of data.facilities) {
      assert.equal(f.state, 'open');
    }

    // Verify GET /api/facilities reflects batch update
    const getRes = await fetch(`${baseUrl}/api/facilities`);
    const all = await getRes.json();
    assert.equal(all.find((f) => f.id === 'higashi1-a-shutter').state, 'open');
    assert.equal(all.find((f) => f.id === 'higashi1-b-shutter').state, 'open');
    assert.equal(all.find((f) => f.id === 'higashi2-gate').state, 'open');
  } finally {
    await close();
  }
});

test('PUT /api/facilities/batch with invalid state returns 400', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: ['higashi1-a-shutter'],
        state: 'invalid_state',
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    await close();
  }
});

test('PUT /api/facilities/batch with empty or non-array ids returns 400', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const resEmpty = await fetch(`${baseUrl}/api/facilities/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: [],
        state: 'open',
      }),
    });
    assert.equal(resEmpty.status, 400);

    const resNonArray = await fetch(`${baseUrl}/api/facilities/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: 'not-an-array',
        state: 'open',
      }),
    });
    assert.equal(resNonArray.status, 400);
  } finally {
    await close();
  }
});

test('PUT /api/facilities/batch with non-existent id returns 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: ['higashi1-a-shutter', 'non-existent-id'],
        state: 'open',
      }),
    });
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    await close();
  }
});

test('POST /api/requests creates pending request and returns 201', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilityId: 'higashi2-gate',
        requestedState: 'open',
        note: '開門確認',
        applicant: '東地区外警1',
      }),
    });
    assert.equal(res.status, 201);
    assert.match(res.headers.get('content-type'), /^application\/json/i);
    const data = await res.json();
    assert.equal(data.id, 'req-1');
    assert.equal(data.facilityId, 'higashi2-gate');
    assert.equal(data.facilityName, '東2ゲート');
    assert.equal(data.requestedState, 'open');
    assert.equal(data.previousState, 'closed');
    assert.equal(data.status, 'pending');
    assert.equal(data.note, '開門確認');
    assert.equal(data.applicant, '東地区外警1');

    // Verify GET /api/requests includes this request
    const listRes = await fetch(`${baseUrl}/api/requests?status=pending`);
    const list = await listRes.json();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'req-1');
  } finally {
    await close();
  }
});

test('POST /api/requests with invalid requestedState returns 400', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilityId: 'higashi2-gate',
        requestedState: 'invalid_state',
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    await close();
  }
});

test('POST /api/requests with missing body or facilityId returns 400', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const resEmpty = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(resEmpty.status, 400);

    const resNoState = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi2-gate' }),
    });
    assert.equal(resNoState.status, 400);
  } finally {
    await close();
  }
});

test('POST /api/requests for non-existent facility returns 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilityId: 'non-existent-facility',
        requestedState: 'open',
      }),
    });
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    await close();
  }
});

test('GET /api/requests and GET /api/requests/:id return requests and handle 404', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi1-gate', requestedState: 'closed' }),
    });

    const listRes = await fetch(`${baseUrl}/api/requests`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'req-1');

    const singleRes = await fetch(`${baseUrl}/api/requests/req-1`);
    assert.equal(singleRes.status, 200);
    const item = await singleRes.json();
    assert.equal(item.id, 'req-1');

    const notFoundRes = await fetch(`${baseUrl}/api/requests/req-999`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    await close();
  }
});

test('POST /api/requests/:id/approve updates request status to approved and facility state to requestedState', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // Initial state of higashi2-gate is closed
    const facResInit = await fetch(`${baseUrl}/api/facilities`);
    const facListInit = await facResInit.json();
    const targetInit = facListInit.find((f) => f.id === 'higashi2-gate');
    assert.equal(targetInit.state, 'closed');

    // Create pending request for higashi2-gate -> open
    const createRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi2-gate', requestedState: 'open', applicant: '東地区外警1' }),
    });
    assert.equal(createRes.status, 201);
    const reqData = await createRes.json();
    assert.equal(reqData.status, 'pending');

    // Approve request
    const approveRes = await fetch(`${baseUrl}/api/requests/${reqData.id}/approve`, {
      method: 'POST',
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.success, true);
    assert.equal(approveData.request.status, 'approved');
    assert.equal(approveData.facility.state, 'open');

    // Verify facility state was actually updated in API
    const facResAfter = await fetch(`${baseUrl}/api/facilities`);
    const facListAfter = await facResAfter.json();
    const targetAfter = facListAfter.find((f) => f.id === 'higashi2-gate');
    assert.equal(targetAfter.state, 'open');

    // Approving already approved request returns 409
    const againRes = await fetch(`${baseUrl}/api/requests/${reqData.id}/approve`, {
      method: 'POST',
    });
    assert.equal(againRes.status, 409);

    // Approving non-existent request returns 404
    const notFoundRes = await fetch(`${baseUrl}/api/requests/req-999/approve`, {
      method: 'POST',
    });
    assert.equal(notFoundRes.status, 404);
  } finally {
    await close();
  }
});

test('POST /api/requests/:id/reject updates request status to rejected without changing facility state', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // Create pending request for higashi1-a-shutter -> open
    const createRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi1-a-shutter', requestedState: 'open', applicant: '東地区外警1' }),
    });
    const reqData = await createRes.json();

    // Reject request
    const rejectRes = await fetch(`${baseUrl}/api/requests/${reqData.id}/reject`, {
      method: 'POST',
    });
    assert.equal(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.equal(rejectData.success, true);
    assert.equal(rejectData.request.status, 'rejected');

    // Verify facility state was NOT changed (remains closed)
    const facRes = await fetch(`${baseUrl}/api/facilities`);
    const facList = await facRes.json();
    const target = facList.find((f) => f.id === 'higashi1-a-shutter');
    assert.equal(target.state, 'closed');

    // Rejecting already rejected request returns 409
    const againRes = await fetch(`${baseUrl}/api/requests/${reqData.id}/reject`, {
      method: 'POST',
    });
    assert.equal(againRes.status, 409);

    // Rejecting non-existent request returns 404
    const notFoundRes = await fetch(`${baseUrl}/api/requests/req-999/reject`, {
      method: 'POST',
    });
    assert.equal(notFoundRes.status, 404);
  } finally {
    await close();
  }
});

test('DELETE /api/requests/:id cancels pending request, returns 404 for unknown, and 409 for already cancelled', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi2-gate', requestedState: 'open' }),
    });

    // Cancel existing
    const deleteRes = await fetch(`${baseUrl}/api/requests/req-1`, { method: 'DELETE' });
    assert.equal(deleteRes.status, 200);
    const deleteData = await deleteRes.json();
    assert.equal(deleteData.success, true);
    assert.equal(deleteData.request.status, 'cancelled');

    // GET /api/requests?status=pending should now be empty
    const pendingRes = await fetch(`${baseUrl}/api/requests?status=pending`);
    const pendingList = await pendingRes.json();
    assert.equal(pendingList.length, 0);

    // Cancel again returns 409
    const againRes = await fetch(`${baseUrl}/api/requests/req-1`, { method: 'DELETE' });
    assert.equal(againRes.status, 409);

    // Unknown ID returns 404
    const notFoundRes = await fetch(`${baseUrl}/api/requests/req-999`, { method: 'DELETE' });
    assert.equal(notFoundRes.status, 404);
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
      assert.ok(body.includes(hallName), `Facility map check should include hall name: ${hallName}`);
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
      assert.ok(body.includes(placeName), `Facility map check should include place name: ${placeName}`);
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
  const mod = require('../server');
  assert.equal(typeof mod.createApp, 'function');
  assert.equal(typeof mod.startServer, 'function');
});

test('GET /h directly returns 200 without redirect and serves H terminal page with Material Design components and operation UI', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`, { redirect: 'manual' });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('location'), null);
    assert.match(res.headers.get('content-type'), /^text\/html;\s*charset=utf-8/i);
    const text = await res.text();
    assert.ok(text.includes('概況（東地区）'));
    assert.ok(text.includes('端末名: 東地区外務H1'));
    assert.ok(text.includes('current-datetime'));
    assert.ok(text.includes('nav-rail'));
    assert.ok(text.includes('data-view="overview"'));
    assert.ok(text.includes('data-view="facilities"'));
    assert.ok(text.includes('data-view="alerts"'));
    assert.ok(text.includes('map-container'));
    assert.ok(text.includes('toolbar'));
    assert.ok(text.includes('btn-cancel-selection'));
    assert.ok(text.includes('開放'));
    assert.ok(text.includes('閉鎖'));
    assert.ok(text.includes('制限'));
    assert.ok(text.includes('送信'));
    assert.ok(text.includes('いいえ'));
    assert.ok(text.includes('header-buzzer-blink'));
    assert.ok(text.includes('alarm-active'));
    assert.ok(text.includes('stopBuzzer'));
    assert.ok(text.includes('F8'));
    assert.ok(text.includes('facility-icon-pending'));
    assert.ok(text.includes('icon-pending-blink'));
    assert.ok(text.includes('request-detail-modal'));
    assert.ok(text.includes('btn-modal-approve'));
    assert.ok(text.includes('btn-modal-reject'));
    assert.ok(text.includes('modal-stack-badge'));
    assert.ok(text.includes('updateNotificationArea'));
    assert.ok(text.includes('pollFacilitiesAndRequests'));
    assert.ok(text.includes('POLL_INTERVAL_MS = 3000'));
    assert.ok(text.includes('/shared/map-east.svg'));
    assert.ok(text.includes('/api/facilities'));
    assert.ok(text.includes('/api/requests?status=pending'));
    assert.ok(!text.includes('M端末（現場用）'));
  } finally {
    await close();
  }
});

test('GET /h body includes all 8 hall names and 4 place names', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const body = await res.text();
    for (const hallName of EXPECTED_HALL_NAMES) {
      assert.ok(body.includes(hallName), `H terminal should include hall name: ${hallName}`);
    }
    for (const placeName of EXPECTED_PLACE_NAMES) {
      assert.ok(body.includes(placeName), `H terminal should include place name: ${placeName}`);
    }
  } finally {
    await close();
  }
});

test('GET /h includes notification area controls, buzzer alarm animation, F8 stop handler, and request detail modal markup', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();

    // Notification area and buttons
    assert.ok(text.includes('id="notification-area"'));
    assert.ok(text.includes('id="btn-detail"'));
    assert.ok(text.includes('id="btn-yes"'));
    assert.ok(text.includes('id="btn-no"'));
    assert.ok(text.includes('設備状態変更:'));

    // Buzzer stop logic and F8 key binding
    assert.ok(text.includes('header-buzzer-blink'));
    assert.ok(text.includes('alarm-active'));
    assert.ok(text.includes('stopBuzzer()'));
    assert.ok(text.includes("e.key === 'F8'"));

    // Icon pending blink animation
    assert.ok(text.includes('facility-icon-pending'));
    assert.ok(text.includes('icon-pending-blink'));

    // Request detail modal and actions
    assert.ok(text.includes('id="request-detail-modal"'));
    assert.ok(text.includes('id="request-detail-body"'));
    assert.ok(text.includes('id="btn-close-request-detail"'));
    assert.ok(text.includes('id="btn-modal-dismiss"'));
    assert.ok(text.includes('id="btn-modal-approve"'));
    assert.ok(text.includes('id="btn-modal-reject"'));
    assert.ok(text.includes('id="modal-stack-badge"'));
    assert.ok(text.includes('設備状態変更 申請内容'));
    assert.ok(text.includes('openRequestDetailModal'));
    assert.ok(text.includes('closeRequestDetailModal'));
    assert.ok(text.includes('approveCurrentRequest'));
    assert.ok(text.includes('rejectCurrentRequest'));
  } finally {
    await close();
  }
});

test('GET /m directly returns 200 without redirect and serves M terminal page with 2-pane layout, request modal, and facility input view', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`, { redirect: 'manual' });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('location'), null);
    assert.match(res.headers.get('content-type'), /^text\/html;\s*charset=utf-8/i);
    const text = await res.text();
    assert.ok(text.includes('M端末（現場用） - 概況表示'));
    assert.ok(text.includes('<meta name="viewport"'));
    assert.ok(text.includes('href="/m/style.css"'));
    assert.ok(text.includes('概況表示'));
    assert.ok(text.includes('東地区外警1'));
    assert.ok(text.includes('map-expand-icon'));
    assert.ok(text.includes('ゲート運用状況'));
    assert.ok(text.includes('シャッター運用状況'));
    assert.ok(!text.includes('閉所定'));
    assert.ok(!text.includes('開所定'));
    assert.ok(text.includes('open-gates-container'));
    assert.ok(text.includes('closed-shutters-container'));
    assert.ok(text.includes('map-zoom-modal'));
    assert.ok(text.includes('btn-zoom-reset'));
    assert.ok(text.includes('設備入力'));
    assert.ok(text.includes('非常通報'));
    assert.ok(text.includes('故障申告'));
    assert.ok(text.includes('pane-facility-input'));
    assert.ok(text.includes('filter-chip-bar'));
    assert.ok(text.includes('facility-list-container'));
    assert.ok(text.includes('request-modal'));
    assert.ok(text.includes('btn-submit-request'));
    assert.ok(text.includes('cancel-confirm-modal'));
    assert.ok(text.includes('toast-notification'));
    assert.ok(!text.includes('current-datetime'));
    assert.ok(!text.includes('H端末（指揮所用）'));
  } finally {
    await close();
  }
});

test('GET /m body includes all 8 hall names, 4 place names, facility & request fetch logic, and 3s polling sync', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const body = await res.text();
    for (const hallName of EXPECTED_HALL_NAMES) {
      assert.ok(body.includes(hallName), `M terminal should include hall name: ${hallName}`);
    }
    for (const placeName of EXPECTED_PLACE_NAMES) {
      assert.ok(body.includes(placeName), `M terminal should include place name: ${placeName}`);
    }
    assert.ok(body.includes('/shared/map-east.svg'), 'M terminal should fetch map SVG');
    assert.ok(body.includes('/api/facilities'), 'M terminal should fetch facilities API');
    assert.ok(body.includes('/api/requests'), 'M terminal should fetch requests API');
    assert.ok(body.includes('POLL_INTERVAL_MS = 3000'), 'M terminal should define 3s polling interval');
    assert.ok(body.includes('updateFacilityColors'), 'M terminal should have diff color updater');
    assert.ok(body.includes('pollFacilities'), 'M terminal should have periodic polling function');
    assert.ok(body.includes('renderFacilityList'), 'M terminal should have facility list renderer');
  } finally {
    await close();
  }
});

test('GET /m/style.css returns 200 and valid CSS content', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m/style.css`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/css/i);
    const css = await res.text();
    assert.ok(css.includes('--gcp-blue'));
    assert.ok(css.includes('.bottom-nav'));
    assert.ok(css.includes('.nav-item'));
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

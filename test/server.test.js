const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../server');
const { resetFacilities } = require('../src/state/facilities');
const { resetRequests } = require('../src/state/requests');
const { resetFaultReports } = require('../src/state/faultReports');
const { resetEmergencyAlerts } = require('../src/state/emergencyAlerts');

beforeEach(() => {
  resetFacilities();
  resetRequests();
  resetFaultReports();
  resetEmergencyAlerts();
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
  { id: 'higashi7-5-gate', name: '東7.5ゲート', type: 'gate', state: 'closed', x: 524, y: 1354 },
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

test('GET /api/facilities returns 200 and JSON array with all 29 facility IDs in order and matching keys', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.equal(data.length, 29);
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

test('Manual facility state update (single PUT /api/facilities/:id) automatically rejects pending request for that facility', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // 1. Create pending request for higashi2-gate (open)
    const createRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi2-gate', requestedState: 'open' }),
    });
    const reqData = await createRes.json();
    assert.equal(reqData.status, 'pending');

    // 2. Command center manually updates higashi2-gate to restricted
    const putRes = await fetch(`${baseUrl}/api/facilities/higashi2-gate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'restricted' }),
    });
    assert.equal(putRes.status, 200);

    // 3. Verify request is now automatically rejected
    const getReqRes = await fetch(`${baseUrl}/api/requests/${reqData.id}`);
    const updatedReq = await getReqRes.json();
    assert.equal(updatedReq.status, 'rejected');
    assert.equal(updatedReq.rejectReason, '手動変更により自動差戻し');
  } finally {
    await close();
  }
});

test('Manual facility state update (batch PUT /api/facilities/batch) automatically rejects pending requests for targeted facilities', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // Create pending requests for higashi1-a-shutter and higashi1-b-shutter
    const res1 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi1-a-shutter', requestedState: 'open' }),
    });
    const req1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi1-b-shutter', requestedState: 'open' }),
    });
    const req2 = await res2.json();

    // Batch update both
    const batchRes = await fetch(`${baseUrl}/api/facilities/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ['higashi1-a-shutter', 'higashi1-b-shutter'], state: 'open' }),
    });
    assert.equal(batchRes.status, 200);
    const batchData = await batchRes.json();
    assert.equal(batchData.autoRejectedCount, 2);

    // Verify both requests are now rejected
    const check1 = await (await fetch(`${baseUrl}/api/requests/${req1.id}`)).json();
    const check2 = await (await fetch(`${baseUrl}/api/requests/${req2.id}`)).json();
    assert.equal(check1.status, 'rejected');
    assert.equal(check2.status, 'rejected');
  } finally {
    await close();
  }
});

test('POST /api/requests/batch-approve batch approves multiple requests and updates facilities', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res1 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi2-gate', requestedState: 'open' }),
    });
    const req1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi1-a-shutter', requestedState: 'open' }),
    });
    const req2 = await res2.json();

    const batchApproveRes = await fetch(`${baseUrl}/api/requests/batch-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [req1.id, req2.id] }),
    });
    assert.equal(batchApproveRes.status, 200);
    const data = await batchApproveRes.json();
    assert.equal(data.success, true);
    assert.equal(data.approvedCount, 2);

    // Invalid body returns 400
    const errRes = await fetch(`${baseUrl}/api/requests/batch-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(errRes.status, 400);
  } finally {
    await close();
  }
});

test('POST /api/requests/batch-reject batch rejects multiple requests', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res1 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi2-gate', requestedState: 'open' }),
    });
    const req1 = await res1.json();

    const res2 = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityId: 'higashi1-a-shutter', requestedState: 'open' }),
    });
    const req2 = await res2.json();

    const batchRejectRes = await fetch(`${baseUrl}/api/requests/batch-reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [req1.id, req2.id], reason: '一括差戻テスト' }),
    });
    assert.equal(batchRejectRes.status, 200);
    const data = await batchRejectRes.json();
    assert.equal(data.success, true);
    assert.equal(data.rejectedCount, 2);
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

const EXPECTED_PLACE_NAMES = ['ガレリア', 'リンクスペース', '東ターミナル', '東棟屋外駐車場', '東13ゲート'];

test('GET /shared/facility-map-check.html body includes all 5 place names', async () => {
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
    assert.ok(text.includes('/api/requests'));
    assert.ok(!text.includes('M端末（現場用）'));
  } finally {
    await close();
  }
});

test('GET /h includes Alerts view markup (view-alerts, alert-table, category/status/hall filters, and batch action toolbar)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();

    // Alert view container & headers
    assert.ok(text.includes('id="view-alerts"'));
    assert.ok(text.includes('aria-label="警報一覧（東地区）"'));
    assert.ok(text.includes('警報一覧（東地区）'));

    // Filter controls
    assert.ok(text.includes('id="filter-alert-category"'));
    assert.ok(text.includes('id="filter-alert-status"'));
    assert.ok(text.includes('id="filter-alert-hall"'));
    assert.ok(text.includes('id="alert-count-info"'));
    assert.ok(text.includes('設備変更申請'));
    assert.ok(text.includes('非常通報'));
    assert.ok(text.includes('故障申告'));

    // Alert table and columns
    assert.ok(text.includes('id="alert-table"'));
    assert.ok(text.includes('id="alert-table-body"'));
    assert.ok(text.includes('id="check-all-alerts"'));
    assert.ok(text.includes('badge-category'));

    // Batch toolbar
    assert.ok(text.includes('id="alert-toolbar"'));
    assert.ok(text.includes('id="alert-selected-count"'));
    assert.ok(text.includes('id="btn-alert-batch-approve"'));
    assert.ok(text.includes('id="btn-alert-batch-reject"'));
    assert.ok(text.includes('id="btn-alert-batch-cancel"'));
    assert.ok(text.includes('id="btn-alert-batch-submit"'));
    assert.ok(text.includes('id="alert-notification-area"'));

    // JavaScript handlers
    assert.ok(text.includes('renderAlertTable'));
    assert.ok(text.includes('updateAlertBatchUIState'));
    assert.ok(text.includes('selectAlertBatchAction'));
    assert.ok(text.includes('submitAlertBatchAction'));
    assert.ok(text.includes('submitAlertBatchApprove'));
    assert.ok(text.includes('submitAlertBatchReject'));
    assert.ok(text.includes('mapToAlertItem'));
  } finally {
    await close();
  }
});

test('GET /h body includes all 8 hall names and 5 place names', async () => {
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
    assert.ok(!text.includes('filter-chip-bar'));
    assert.ok(text.includes('facility-list-container'));
    assert.ok(text.includes('request-modal'));
    assert.ok(text.includes('btn-submit-request'));
    assert.ok(text.includes('cancel-confirm-modal'));
    assert.ok(text.includes('toast-notification'));
    assert.ok(text.includes('id="device-badge"'));
    assert.ok(text.includes('TERMINAL_CONFIGS'));
    assert.ok(text.includes('resolveTerminalConfig'));
    assert.ok(text.includes('mkea1ga01'));
    assert.ok(text.includes('mkeaggk01'));
    assert.ok(!text.includes('current-datetime'));
    assert.ok(!text.includes('H端末（指揮所用）'));
  } finally {
    await close();
  }
});

test('GET /m body includes all 8 hall names, 5 place names, facility & request fetch logic, and 3s polling sync', async () => {
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

test('GET /m includes centered connection error badge in header with zero layout shift', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="connection-error-badge"'), 'M terminal should have connection-error-badge element');
    assert.ok(text.includes('class="header-center-group"'), 'M terminal should have header-center-group for centered badge');
    assert.ok(text.includes('受信異常'), 'M terminal should include 受信異常 text');
    assert.ok(text.includes('hideError'), 'M terminal should define hideError');
    assert.ok(text.includes('showError'), 'M terminal should define showError');

    const resCss = await fetch(`${baseUrl}/m/style.css`);
    const css = await resCss.text();
    assert.ok(css.includes('.header-center-group'), 'M style.css should style header-center-group');
    assert.ok(css.includes('.header-error-badge'), 'M style.css should style header-error-badge');
  } finally {
    await close();
  }
});

test('GET /h includes connection error badge with last sync timestamp and operation lock logic', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('id="connection-error-badge"'), 'H terminal should have connection-error-badge element');
    assert.ok(text.includes('class="header-center"'), 'H terminal should place connection-error-badge in header-center');
    assert.ok(text.includes('id="last-sync-time"'), 'H terminal should have last-sync-time element');
    assert.ok(text.includes('受信異常'), 'H terminal should include 受信異常 text');
    assert.ok(text.includes('最終更新:'), 'H terminal should include 最終更新: text');
    assert.ok(text.includes('isConnectionError'), 'H terminal should track isConnectionError state');
    assert.ok(text.includes('lastSuccessfulSyncTime'), 'H terminal should track lastSuccessfulSyncTime');
    assert.ok(text.includes('setConnectionError'), 'H terminal should define setConnectionError function');
    assert.ok(text.includes('.header-error-badge'), 'H terminal should style header-error-badge');
  } finally {
    await close();
  }
});

test('POST /api/fault-reports creates fault report (with & without photo) and GET /api/fault-reports retrieves them', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // 1. 写真なしの送信 (FormData)
    const formDataNoPhoto = new FormData();
    formDataNoPhoto.append('locationText', '東1ホール トイレ入口');
    formDataNoPhoto.append('description', 'ドアノブ破損');
    formDataNoPhoto.append('reporter', '東地区外警1');

    const res1 = await fetch(`${baseUrl}/api/fault-reports`, {
      method: 'POST',
      body: formDataNoPhoto,
    });
    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    assert.equal(data1.success, true);
    assert.equal(data1.report.id, 'fault-1');
    assert.equal(data1.report.locationText, '東1ホール トイレ入口');
    assert.equal(data1.report.description, 'ドアノブ破損');
    assert.equal(data1.report.photoUrl, null);
    assert.equal(data1.report.status, 'new');

    // 2. 写真ありの送信 (FormData + Blob)
    const fakeImageBlob = new Blob(['fake image content'], { type: 'image/jpeg' });
    const formDataWithPhoto = new FormData();
    formDataWithPhoto.append('locationText', '東2ホール シャッター横');
    formDataWithPhoto.append('description', 'センサーカバー脱落');
    formDataWithPhoto.append('photo', fakeImageBlob, 'test-photo.jpg');

    const res2 = await fetch(`${baseUrl}/api/fault-reports`, {
      method: 'POST',
      body: formDataWithPhoto,
    });
    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.equal(data2.success, true);
    assert.equal(data2.report.id, 'fault-2');
    assert.ok(data2.report.photoUrl.startsWith('/uploads/'));

    // 3. アップロードされた静的ファイルが取得できること
    const photoRes = await fetch(`${baseUrl}${data2.report.photoUrl}`);
    assert.equal(photoRes.status, 200);

    // 4. GET /api/fault-reports で一覧取得
    const listRes = await fetch(`${baseUrl}/api/fault-reports`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.equal(list.length, 2);
    assert.equal(list[0].id, 'fault-2'); // desc
    assert.equal(list[1].id, 'fault-1');

    // 5. GET /api/fault-reports/:id
    const singleRes = await fetch(`${baseUrl}/api/fault-reports/fault-1`);
    assert.equal(singleRes.status, 200);
    const single = await singleRes.json();
    assert.equal(single.locationText, '東1ホール トイレ入口');

    // 404 for unknown
    const notFoundRes = await fetch(`${baseUrl}/api/fault-reports/fault-999`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    await close();
  }
});

test('POST /api/fault-reports validates required fields', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // locationText 欠損
    const fd1 = new FormData();
    fd1.append('description', 'some description');
    const res1 = await fetch(`${baseUrl}/api/fault-reports`, { method: 'POST', body: fd1 });
    assert.equal(res1.status, 400);

    // description 欠損
    const fd2 = new FormData();
    fd2.append('locationText', 'some location');
    const res2 = await fetch(`${baseUrl}/api/fault-reports`, { method: 'POST', body: fd2 });
    assert.equal(res2.status, 400);
  } finally {
    await close();
  }
});

test('POST /api/fault-reports/:id/acknowledge updates status to acknowledged', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const fd = new FormData();
    fd.append('locationText', '東3ホール');
    fd.append('description', '水漏れ');
    const createRes = await fetch(`${baseUrl}/api/fault-reports`, { method: 'POST', body: fd });
    const createData = await createRes.json();

    const ackRes = await fetch(`${baseUrl}/api/fault-reports/${createData.report.id}/acknowledge`, {
      method: 'POST',
    });
    assert.equal(ackRes.status, 200);
    const ackData = await ackRes.json();
    assert.equal(ackData.success, true);
    assert.equal(ackData.report.status, 'acknowledged');
    assert.ok(typeof ackData.report.acknowledgedAt === 'number');

    // 存在しないIDへの確認済は404
    const notFoundAck = await fetch(`${baseUrl}/api/fault-reports/fault-999/acknowledge`, {
      method: 'POST',
    });
    assert.equal(notFoundAck.status, 404);
  } finally {
    await close();
  }
});

test('GET /m includes fault-report view pane, photo input, and submit form', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="pane-fault-report"'), 'M terminal should have pane-fault-report');
    assert.ok(text.includes('id="fault-location"'), 'M terminal should have fault-location input');
    assert.ok(text.includes('id="fault-description"'), 'M terminal should have fault-description textarea');
    assert.ok(text.includes('id="fault-photo-input"'), 'M terminal should have fault-photo-input');
    assert.ok(text.includes('id="btn-submit-fault"'), 'M terminal should have btn-submit-fault button');
    assert.ok(text.includes('id="nav-trouble"'), 'M terminal should have nav-trouble');
    assert.ok(text.includes('data-view="fault-report"'), 'nav-trouble should have data-view=fault-report');
    assert.ok(text.includes('initFaultReportForm'), 'M terminal should define initFaultReportForm');
  } finally {
    await close();
  }
});

test('GET /h includes fault-detail-modal, photo tag, and fault action handling', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('id="fault-detail-modal"'), 'H terminal should have fault-detail-modal');
    assert.ok(text.includes('id="modal-fault-location"'), 'H terminal should have modal-fault-location');
    assert.ok(text.includes('id="btn-modal-fault-ack"'), 'H terminal should have btn-modal-fault-ack');
    assert.ok(text.includes('badge-photo-tag'), 'H terminal should style badge-photo-tag');
    assert.ok(text.includes('notification-badge-type'), 'H terminal should style notification-badge-type');
    assert.ok(text.includes('/api/fault-reports'), 'H terminal should poll /api/fault-reports');
    assert.ok(text.includes('acknowledgeFaultReportById'), 'H terminal should define acknowledgeFaultReportById');
  } finally {
    await close();
  }
});

// ============================================================================
// Issue #68: 緊急発報（非常通報・傷病者通報）API & UI テスト
// ============================================================================

test('POST /api/emergency-alerts creates emergency alert with validation', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // 正常系: 非常通報 (incident)
    const res1 = await fetch(`${baseUrl}/api/emergency-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'incident',
        reason: '暴力行為',
        area: '東1ホール',
        note: '【事象】暴力行為 ケンカ発生',
        reporter: '東地区外警1',
      }),
    });
    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    assert.equal(data1.success, true);
    assert.equal(data1.alert.category, 'incident');
    assert.equal(data1.alert.reason, '暴力行為');
    assert.equal(data1.alert.area, '東1ホール');
    assert.equal(data1.alert.status, 'active');

    // 正常系: 傷病者通報 (injury)
    const res2 = await fetch(`${baseUrl}/api/emergency-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'injury',
        reason: '意識あり',
        area: 'ガレリア',
        note: '【容態問診】意識: あり',
      }),
    });
    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.equal(data2.alert.category, 'injury');
    assert.equal(data2.alert.area, 'ガレリア');

    // 異常系: 無効なカテゴリ
    const invalidCat = await fetch(`${baseUrl}/api/emergency-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'invalid', area: '東1ホール' }),
    });
    assert.equal(invalidCat.status, 400);

    // 異常系: 無効なエリア
    const invalidArea = await fetch(`${baseUrl}/api/emergency-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'incident', area: '西ホール' }),
    });
    assert.equal(invalidArea.status, 400);
  } finally {
    await close();
  }
});

test('GET /api/emergency-alerts returns list and supports status filter', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const listRes = await fetch(`${baseUrl}/api/emergency-alerts`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.ok(Array.isArray(list));

    const activeRes = await fetch(`${baseUrl}/api/emergency-alerts?status=active`);
    assert.equal(activeRes.status, 200);
    const activeList = await activeRes.json();
    assert.ok(activeList.every((a) => a.status === 'active'));
  } finally {
    await close();
  }
});

test('GET /api/emergency-alerts/:id and POST /api/emergency-alerts/:id/resolve', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    // 発報作成
    const createRes = await fetch(`${baseUrl}/api/emergency-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'incident',
        reason: '不審物',
        area: '東456屋外',
        note: '黒い不審なカバンあり',
      }),
    });
    assert.equal(createRes.status, 201);
    const { alert } = await createRes.json();

    // ID取得
    const getRes = await fetch(`${baseUrl}/api/emergency-alerts/${alert.id}`);
    assert.equal(getRes.status, 200);
    const fetched = await getRes.json();
    assert.equal(fetched.id, alert.id);
    assert.equal(fetched.status, 'active');

    // 404取得
    const notFoundRes = await fetch(`${baseUrl}/api/emergency-alerts/emg-non-existent`);
    assert.equal(notFoundRes.status, 404);

    // 対応完了
    const resolveRes = await fetch(`${baseUrl}/api/emergency-alerts/${alert.id}/resolve`, {
      method: 'POST',
    });
    assert.equal(resolveRes.status, 200);
    const resolveData = await resolveRes.json();
    assert.equal(resolveData.success, true);
    assert.equal(resolveData.alert.status, 'resolved');
    assert.ok(typeof resolveData.alert.resolvedAt === 'number');

    // 存在しないIDへの対応完了は404
    const notFoundResolve = await fetch(`${baseUrl}/api/emergency-alerts/emg-999/resolve`, {
      method: 'POST',
    });
    assert.equal(notFoundResolve.status, 404);
  } finally {
    await close();
  }
});

test('GET /m includes emergency-modal and 4-step wizard markup and JS logic', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="emergency-modal"'), 'M terminal should have emergency-modal');
    assert.ok(text.includes('id="emg-step-1"'), 'M terminal should have step 1');
    assert.ok(text.includes('id="emg-step-2"'), 'M terminal should have step 2');
    assert.ok(text.includes('id="emg-step-3"'), 'M terminal should have step 3');
    assert.ok(text.includes('id="emg-step-4"'), 'M terminal should have step 4');
    assert.ok(text.includes('id="btn-submit-emergency"'), 'M terminal should have submit emergency button');
    assert.ok(text.includes('initEmergencyModal'), 'M terminal should define initEmergencyModal');
    assert.ok(text.includes('/api/emergency-alerts'), 'M terminal should call /api/emergency-alerts');
  } finally {
    await close();
  }
});

test('GET /h includes emergency-detail-modal, pager, siren alarm, snooze logic, 24px map markers with spread offset, and coordinates', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('id="emergency-detail-modal"'), 'H terminal should have emergency-detail-modal');
    assert.ok(text.includes('id="modal-emg-pager"'), 'H terminal should have modal-emg-pager');
    assert.ok(text.includes('id="btn-emg-prev"'), 'H terminal should have btn-emg-prev');
    assert.ok(text.includes('id="btn-emg-next"'), 'H terminal should have btn-emg-next');
    assert.ok(text.includes('id="btn-modal-emg-resolve"'), 'H terminal should have btn-modal-emg-resolve');
    assert.ok(text.includes('AREA_COORDINATES'), 'H terminal should define AREA_COORDINATES');
    assert.ok(text.includes("'東78屋外': { x: 400, y: 707 }"), 'East 7-8 outdoor coordinate should be (400, 707)');
    assert.ok(text.includes('startEmergencyAlarm'), 'H terminal should define startEmergencyAlarm');
    assert.ok(text.includes('snoozeEmergencyAlarm'), 'H terminal should define snoozeEmergencyAlarm');
    assert.ok(text.includes('header-emergency-blink 0.8s'), 'H terminal should blink header with 0.8s duration');
    assert.ok(text.includes('updateEmergencyMarkers'), 'H terminal should define updateEmergencyMarkers');
    assert.ok(text.includes("text.setAttribute('font-size', '24');"), 'Map marker text should be 24px');
    assert.ok(text.includes('resolveEmergencyAlertById'), 'H terminal should define resolveEmergencyAlertById');
    assert.ok(text.includes('/api/emergency-alerts'), 'H terminal should poll /api/emergency-alerts');
    assert.ok(text.includes('notification-badge-emergency'), 'H terminal should style notification-badge-emergency');
  } finally {
    await close();
  }
});

test('GET /m includes emergency-card-container in overview pane, renderEmergencyCards logic, and removes modal close button and nav badge (Issue #72)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="emergency-card-container"'), 'M terminal should have emergency-card-container');
    assert.ok(text.includes('id="pane-overview"'), 'M terminal should have pane-overview');
    // emergency-card-container は pane-overview 内にある
    const overviewIdx = text.indexOf('id="pane-overview"');
    const cardIdx = text.indexOf('id="emergency-card-container"');
    const summaryIdx = text.indexOf('id="summary-pane-card"');
    assert.ok(overviewIdx < cardIdx && cardIdx < summaryIdx, 'emergency-card-container should be placed under map inside pane-overview');

    assert.ok(!text.includes('id="nav-emergency-badge"'), 'nav-emergency-badge should be removed');
    assert.ok(!text.includes('id="btn-close-emg-modal"'), 'btn-close-emg-modal should be removed');
    assert.ok(text.includes('renderEmergencyCards'), 'M terminal should define renderEmergencyCards');
    assert.ok(text.includes('emergency-active-card'), 'M terminal should render emergency-active-card');
    assert.ok(text.includes('/api/emergency-alerts'), 'M terminal should fetch /api/emergency-alerts in polling and init');
  } finally {
    await close();
  }
});

test('GET /m/style.css includes styles for emergency-card-container and emergency-active-card without animation or badge', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m/style.css`);
    const text = await res.text();
    assert.ok(text.includes('.emergency-card-container'), 'style.css should have .emergency-card-container');
    assert.ok(text.includes('.emergency-active-card'), 'style.css should have .emergency-active-card');
    assert.ok(text.includes('.emg-card-badge'), 'style.css should have .emg-card-badge');
    assert.ok(!text.includes('.nav-badge-count'), 'style.css should not have .nav-badge-count');
    assert.ok(!text.includes('card-appear'), 'style.css should not have card-appear animation');
  } finally {
    await close();
  }
});

test('GET /h includes Pitanet toolbar group, modals, and client logic (Issue #69)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    // ツールバー
    assert.ok(text.includes('id="btn-note-create-mode"'), 'H terminal should have btn-note-create-mode');
    assert.ok(text.includes('id="btn-note-list"'), 'H terminal should have btn-note-list (ピタ一覧)');
    assert.ok(text.includes('id="btn-note-submit"'), 'H terminal should have btn-note-submit (ピタ送信)');
    assert.ok(text.includes('ピタネット'), 'H terminal should have label ピタネット');
    assert.ok(text.includes('ピタ一覧'), 'H terminal should have button ピタ一覧');
    assert.ok(text.includes('ピタ送信'), 'H terminal should have button ピタ送信');

    // モーダル
    assert.ok(text.includes('id="note-create-modal"'), 'H terminal should have note-create-modal');
    assert.ok(text.includes('id="note-edit-modal"'), 'H terminal should have note-edit-modal');
    assert.ok(text.includes('id="note-list-modal"'), 'H terminal should have note-list-modal');
    assert.ok(text.includes('id="btn-note-discard"'), 'H terminal should have btn-note-discard');

    // JSロジック
    assert.ok(text.includes('createNoteSvgElement'), 'H terminal should define createNoteSvgElement');
    assert.ok(text.includes('getMapCoordinatesFromEvent'), 'H terminal should define getMapCoordinatesFromEvent');
    assert.ok(text.includes('renderNoteLayer'), 'H terminal should define renderNoteLayer');
    assert.ok(text.includes('commitPendingNoteChanges'), 'H terminal should define commitPendingNoteChanges');
    assert.ok(text.includes('discardPendingNoteChanges'), 'H terminal should define discardPendingNoteChanges');
    assert.ok(text.includes('note-card-rect'), 'H terminal should render note-card-rect');
    assert.ok(text.includes('/api/notes'), 'H terminal should poll /api/notes');
  } finally {
    await close();
  }
});

test('GET /m includes summary note layer rendering, popover modal, and polling (Issue #69)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="m-note-modal"'), 'M terminal should have m-note-modal');
    assert.ok(text.includes('id="btn-close-m-note"'), 'M terminal should have btn-close-m-note');
    assert.ok(text.includes('createSummaryNoteSvgElement'), 'M terminal should define createSummaryNoteSvgElement');
    assert.ok(text.includes('syncNoteLayers'), 'M terminal should define syncNoteLayers');
    assert.ok(text.includes('showNotePopover'), 'M terminal should define showNotePopover');
    assert.ok(text.includes('/api/notes?layer=summary'), 'M terminal should poll /api/notes?layer=summary');
  } finally {
    await close();
  }
});

test('GET /m/style.css includes .m-note-marker without scale jitter (Issue #69)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m/style.css`);
    const text = await res.text();
    assert.ok(text.includes('.m-note-marker'), 'M style.css should define .m-note-marker');
    assert.ok(!text.includes('scale(1.1)'), 'M style.css should not use transform: scale to avoid cursor jitter/escape bug');
  } finally {
    await close();
  }
});






test('GET /h includes map-legend markup and renderMapLegend logic (Issue #76)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('id="map-legend"'), 'H terminal should have a map-legend element');
    assert.ok(text.includes('function renderMapLegend'), 'H terminal should define renderMapLegend');
    assert.ok(text.includes('map-legend-dot'), 'H terminal should render map-legend-dot swatches');
  } finally {
    await close();
  }
});

test('GET /m includes map-legend markup, renderMapLegend logic, and pinch-zoom handling (Issue #76)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="map-legend"'), 'M terminal should have a map-legend element');
    assert.ok(text.includes('function renderMapLegend'), 'M terminal should define renderMapLegend');
    assert.ok(text.includes('activePointers'), 'M terminal should track multiple pointers for pinch-zoom');
    assert.ok(text.includes('getPointerDistance'), 'M terminal should compute pointer distance for pinch-zoom');
  } finally {
    await close();
  }
});

test('GET /m/style.css includes .map-legend styles (Issue #76)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m/style.css`);
    const text = await res.text();
    assert.ok(text.includes('.map-legend'), 'M style.css should define .map-legend');
    assert.ok(text.includes('.map-legend-dot'), 'M style.css should define .map-legend-dot');
  } finally {
    await close();
  }
});

test('GET /m includes Issue #78 terminal config logic, dynamic device-badge ID, and removes filter-chip-bar', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="device-badge"'), 'Should have id="device-badge" on device badge');
    assert.ok(text.includes('TERMINAL_CONFIGS'), 'Should define TERMINAL_CONFIGS');
    assert.ok(text.includes("DEFAULT_TERMINAL_ID = 'mkeaggk01'"), 'Should define DEFAULT_TERMINAL_ID');
    assert.ok(text.includes('resolveTerminalConfig'), 'Should define resolveTerminalConfig');
    assert.ok(text.includes('mkea1ga01'), 'Should contain mkea1ga01 configuration');
    assert.ok(text.includes('mkeaggk01'), 'Should contain mkeaggk01 configuration');
    assert.ok(!text.includes('filter-chip-bar'), 'Should not contain filter-chip-bar');
    assert.ok(text.includes('applicant: terminalConfig.displayName'), 'submitRequest should use terminalConfig');
    assert.ok(text.includes("formData.append('reporter', terminalConfig.displayName)"), 'Fault report should use terminalConfig');
    assert.ok(text.includes('reporter: terminalConfig.displayName'), 'Emergency alert should use terminalConfig');
  } finally {
    await close();
  }
});

test('GET /api/facilities does not include higashi13-gate (Issue #79)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/facilities`);
    const facilities = await res.json();
    assert.ok(!facilities.some((f) => f.id === 'higashi13-gate'), 'higashi13-gate should not exist in facilities');
    assert.equal(facilities.length, 29);
  } finally {
    await close();
  }
});

test('GET /h includes offline beep logic (playOfflineBeep) and fault buzzer tracking (buzzerAcknowledgedFaultIds) (Issue #81)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('buzzerAcknowledgedFaultIds'), 'H terminal should track acknowledged fault reports');
    assert.ok(text.includes('playOfflineBeep'), 'H terminal should include playOfflineBeep function');
    assert.ok(text.includes('stopOfflineBeep'), 'H terminal should include stopOfflineBeep function');
    assert.ok(text.includes('hasNewUnackFault'), 'H terminal polling should check unacknowledged fault reports');
  } finally {
    await close();
  }
});

test('GET /h includes header click handler for buzzer stop and siren snooze with pointer cursor (Issue #82)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('cursor: pointer'), 'app-header should have cursor: pointer style');
    assert.ok(text.includes('title="クリックまたはF8キーでブザー停止・サイレンスヌーズ"'), 'app-header should have snooze guide title attribute');
    assert.ok(text.includes("appHeader.addEventListener('click'"), 'app-header should have click event listener for stop buzzer and snooze');
  } finally {
    await close();
  }
});

test('GET /api/weather/alerts returns 200, success true, and Koto-ku weather alerts info (Issue #85)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/weather/alerts`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.area, '江東区');
    assert.equal(data.areaCode, '1310800');
    assert.ok(Array.isArray(data.alerts));
    assert.equal(typeof data.hasWarning, 'boolean');
    assert.equal(typeof data.hasSpecial, 'boolean');
  } finally {
    await close();
  }
});

test('GET /api/weather/radar-times returns 200, success true, and radar time series (Issue #85)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/api/weather/radar-times`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.times));
  } finally {
    await close();
  }
});

test('GET /m includes weather-card-container, badge elements, and fetchWeatherAlertsData logic (Issue #86)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="weather-card-container"'), 'M terminal should include weather-card-container');
    assert.ok(text.includes('id="weather-alert-badges"'), 'M terminal should include weather-alert-badges');
    assert.ok(text.includes('id="btn-m-radar-open"'), 'M terminal should include btn-m-radar-open');
    assert.ok(text.includes('fetchWeatherAlertsData'), 'M terminal should define fetchWeatherAlertsData');
    assert.ok(text.includes('renderWeatherCard'), 'M terminal should define renderWeatherCard');
    assert.ok(text.includes('/api/weather/alerts'), 'M terminal should query /api/weather/alerts');
  } finally {
    await close();
  }
});

test('GET /m/style.css includes styles for weather-card-container and weather badges (Issue #86)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m/style.css`);
    const text = await res.text();
    assert.ok(text.includes('.weather-card-container'), 'style.css should style .weather-card-container');
    assert.ok(text.includes('.weather-badge'), 'style.css should style .weather-badge');
    assert.ok(text.includes('.weather-badge.badge-warning'), 'style.css should style .badge-warning');
    assert.ok(text.includes('.btn-radar-open'), 'style.css should style .btn-radar-open');
  } finally {
    await close();
  }
});

test('GET /h includes weather notification handling and radar nav dot (Issue #86)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('id="nav-radar-dot"'), 'H terminal should have nav-radar-dot');
    assert.ok(text.includes('notification-badge-warning'), 'H terminal should define notification-badge-warning');
    assert.ok(text.includes('updateRadarNavDot'), 'H terminal should define updateRadarNavDot');
    assert.ok(text.includes('fetchWeatherAlertsData'), 'H terminal should define fetchWeatherAlertsData');
    assert.ok(text.includes('/api/weather/alerts'), 'H terminal should fetch /api/weather/alerts');
  } finally {
    await close();
  }
});

test('GET /h includes precipitation nowcast tab in Navigation Rail, view-radar panel, and radar map controls (Issue #87)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/h`);
    const text = await res.text();
    assert.ok(text.includes('id="nav-item-radar"'), 'H terminal should have nav-item-radar button in Navigation Rail');
    assert.ok(text.includes('降水NCST'), 'H terminal nav rail label should be 降水NCST');
    assert.ok(text.includes('id="view-radar"'), 'H terminal should have view-radar panel');
    assert.ok(text.includes('降水ナウキャスト（広域）'), 'H terminal should have 降水ナウキャスト（広域） title/label');
    assert.ok(text.includes('id="h-radar-map-wrapper"'), 'H terminal should have h-radar-map-wrapper');
    assert.ok(text.includes('id="h-radar-slider"'), 'H terminal should have h-radar-slider');
    assert.ok(text.includes('id="btn-h-radar-play"'), 'H terminal should have btn-h-radar-play');
    assert.ok(text.includes('initHRadar'), 'H terminal should define initHRadar');
    assert.ok(text.includes('createRadarMapController'), 'H terminal should define createRadarMapController');
  } finally {
    await close();
  }
});

test('GET /m includes full-screen radar modal markup and modal controller (Issue #87)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m`);
    const text = await res.text();
    assert.ok(text.includes('id="m-radar-modal"'), 'M terminal should have m-radar-modal overlay');
    assert.ok(text.includes('降水ナウキャスト'), 'M terminal should have 降水ナウキャスト label');
    assert.ok(text.includes('id="m-radar-map-wrapper"'), 'M terminal should have m-radar-map-wrapper');
    assert.ok(text.includes('id="m-radar-slider"'), 'M terminal should have m-radar-slider');
    assert.ok(text.includes('id="btn-m-radar-play"'), 'M terminal should have btn-m-radar-play');
    assert.ok(text.includes('id="btn-close-m-radar"'), 'M terminal should have btn-close-m-radar');
    assert.ok(text.includes('openMRadarModal'), 'M terminal should define openMRadarModal');
    assert.ok(text.includes('closeMRadarModal'), 'M terminal should define closeMRadarModal');
  } finally {
    await close();
  }
});

test('GET /m/style.css includes styles for radar modal overlay and controls (Issue #87)', async () => {
  const { baseUrl, close } = await listenServer();
  try {
    const res = await fetch(`${baseUrl}/m/style.css`);
    const text = await res.text();
    assert.ok(text.includes('.radar-modal-overlay'), 'style.css should style .radar-modal-overlay');
    assert.ok(text.includes('.radar-modal-map-viewport'), 'style.css should style .radar-modal-map-viewport');
    assert.ok(text.includes('.radar-modal-slider'), 'style.css should style .radar-modal-slider');
    assert.ok(text.includes('.btn-modal-close-radar'), 'style.css should style .btn-modal-close-radar');
  } finally {
    await close();
  }
});






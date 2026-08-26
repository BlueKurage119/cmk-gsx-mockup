const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  getRequests,
  getRequestById,
  createRequest,
  cancelRequest,
  updateRequestStatus,
  resetRequests,
} = require('../src/state/requests');
const { resetFacilities } = require('../src/state/facilities');

beforeEach(() => {
  resetFacilities();
  resetRequests();
});

test('getRequests() returns empty array initially', () => {
  assert.deepStrictEqual(getRequests(), []);
});

test('createRequest() successfully creates pending request with valid data', () => {
  const res = createRequest({
    facilityId: 'higashi2-gate',
    requestedState: 'open',
    note: '現場確認による開門',
    applicant: '東地区外警1',
  });

  assert.equal(res.success, true);
  assert.ok(res.request);
  assert.equal(res.request.id, 'req-1');
  assert.equal(res.request.facilityId, 'higashi2-gate');
  assert.equal(res.request.facilityName, '東2ゲート');
  assert.equal(res.request.facilityType, 'gate');
  assert.equal(res.request.requestedState, 'open');
  assert.equal(res.request.previousState, 'closed');
  assert.equal(res.request.status, 'pending');
  assert.equal(res.request.note, '現場確認による開門');
  assert.equal(res.request.applicant, '東地区外警1');
  assert.ok(typeof res.request.createdAt === 'number');

  const all = getRequests();
  assert.equal(all.length, 1);
  assert.deepStrictEqual(all[0], res.request);
});

test('createRequest() sets default applicant and empty note when omitted', () => {
  const res = createRequest({
    facilityId: 'higashi1-a-shutter',
    requestedState: 'open',
  });

  assert.equal(res.success, true);
  assert.equal(res.request.applicant, '東地区外警1');
  assert.equal(res.request.note, '');
});

test('createRequest() supports restricted state', () => {
  const res = createRequest({
    facilityId: 'higashi1-gate',
    requestedState: 'restricted',
  });

  assert.equal(res.success, true);
  assert.equal(res.request.requestedState, 'restricted');
});

test('createRequest() returns INVALID_FACILITY_ID for missing or non-string facilityId', () => {
  const res1 = createRequest({ requestedState: 'open' });
  assert.equal(res1.success, false);
  assert.equal(res1.reason, 'INVALID_FACILITY_ID');

  const res2 = createRequest({ facilityId: 123, requestedState: 'open' });
  assert.equal(res2.success, false);
  assert.equal(res2.reason, 'INVALID_FACILITY_ID');
});

test('createRequest() returns INVALID_STATE for unsupported state values', () => {
  const res = createRequest({
    facilityId: 'higashi2-gate',
    requestedState: 'invalid_state',
  });
  assert.equal(res.success, false);
  assert.equal(res.reason, 'INVALID_STATE');
});

test('createRequest() returns FACILITY_NOT_FOUND for non-existent facilityId', () => {
  const res = createRequest({
    facilityId: 'non-existent-facility',
    requestedState: 'open',
  });
  assert.equal(res.success, false);
  assert.equal(res.reason, 'FACILITY_NOT_FOUND');
});

test('getRequests() filters by status and facilityId', () => {
  createRequest({ facilityId: 'higashi1-gate', requestedState: 'closed' });
  createRequest({ facilityId: 'higashi2-gate', requestedState: 'open' });
  createRequest({ facilityId: 'higashi1-a-shutter', requestedState: 'open' });

  cancelRequest('req-2');

  const pendingList = getRequests({ status: 'pending' });
  assert.equal(pendingList.length, 2);
  assert.equal(pendingList[0].id, 'req-1');
  assert.equal(pendingList[1].id, 'req-3');

  const cancelledList = getRequests({ status: 'cancelled' });
  assert.equal(cancelledList.length, 1);
  assert.equal(cancelledList[0].id, 'req-2');

  const facilityList = getRequests({ facilityId: 'higashi1-gate' });
  assert.equal(facilityList.length, 1);
  assert.equal(facilityList[0].id, 'req-1');
});

test('getRequestById() returns request or null', () => {
  createRequest({ facilityId: 'higashi1-gate', requestedState: 'closed' });
  const req = getRequestById('req-1');
  assert.ok(req);
  assert.equal(req.id, 'req-1');

  const notFound = getRequestById('req-999');
  assert.equal(notFound, null);
});

test('cancelRequest() successfully cancels pending request', () => {
  createRequest({ facilityId: 'higashi2-gate', requestedState: 'open' });
  const res = cancelRequest('req-1');
  assert.equal(res.success, true);
  assert.equal(res.request.status, 'cancelled');
  assert.ok(res.request.updatedAt);

  // Cannot cancel again
  const resAgain = cancelRequest('req-1');
  assert.equal(resAgain.success, false);
  assert.equal(resAgain.reason, 'NOT_PENDING');
});

test('cancelRequest() returns NOT_FOUND for unknown id', () => {
  const res = cancelRequest('req-999');
  assert.equal(res.success, false);
  assert.equal(res.reason, 'NOT_FOUND');
});

test('updateRequestStatus() updates status to approved/rejected', () => {
  createRequest({ facilityId: 'higashi2-gate', requestedState: 'open' });
  const res = updateRequestStatus('req-1', 'approved');
  assert.equal(res.success, true);
  assert.equal(res.request.status, 'approved');

  const resInvalid = updateRequestStatus('req-1', 'invalid_status');
  assert.equal(resInvalid.success, false);
  assert.equal(resInvalid.reason, 'INVALID_STATUS');
});

test('resetRequests() clears all requests and resets counter', () => {
  createRequest({ facilityId: 'higashi1-gate', requestedState: 'closed' });
  createRequest({ facilityId: 'higashi2-gate', requestedState: 'open' });
  assert.equal(getRequests().length, 2);

  resetRequests();
  assert.equal(getRequests().length, 0);

  const resNew = createRequest({ facilityId: 'higashi1-gate', requestedState: 'open' });
  assert.equal(resNew.request.id, 'req-1');
});

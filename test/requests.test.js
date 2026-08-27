const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  getRequests,
  getRequestById,
  createRequest,
  cancelRequest,
  updateRequestStatus,
  rejectPendingRequestsForFacilities,
  batchApproveRequests,
  batchRejectRequests,
  resetRequests,
} = require('../src/state/requests');
const { resetFacilities, getFacilities } = require('../src/state/facilities');

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

test('rejectPendingRequestsForFacilities() automatically rejects pending requests for specified facility IDs', () => {
  createRequest({ facilityId: 'higashi1-gate', requestedState: 'closed' });
  createRequest({ facilityId: 'higashi2-gate', requestedState: 'open' });
  createRequest({ facilityId: 'higashi3-gate', requestedState: 'open' });

  const rejected = rejectPendingRequestsForFacilities(['higashi1-gate', 'higashi2-gate'], '手動変更により自動差戻し');
  assert.equal(rejected.length, 2);
  assert.equal(rejected[0].id, 'req-1');
  assert.equal(rejected[0].status, 'rejected');
  assert.equal(rejected[0].rejectReason, '手動変更により自動差戻し');
  assert.equal(rejected[1].id, 'req-2');
  assert.equal(rejected[1].status, 'rejected');

  // req-3 remains pending
  const pending = getRequests({ status: 'pending' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, 'req-3');

  // Calling again for single string ID
  const singleReject = rejectPendingRequestsForFacilities('higashi3-gate');
  assert.equal(singleReject.length, 1);
  assert.equal(singleReject[0].id, 'req-3');
  assert.equal(getRequests({ status: 'pending' }).length, 0);
});

test('batchApproveRequests() approves multiple requests and updates facility states', () => {
  createRequest({ facilityId: 'higashi2-gate', requestedState: 'open' });
  createRequest({ facilityId: 'higashi1-a-shutter', requestedState: 'open' });
  createRequest({ facilityId: 'higashi3-gate', requestedState: 'restricted' });

  const res = batchApproveRequests(['req-1', 'req-2']);
  assert.equal(res.success, true);
  assert.equal(res.approvedCount, 2);
  assert.equal(res.requests.length, 2);
  assert.equal(res.requests[0].status, 'approved');
  assert.equal(res.requests[1].status, 'approved');

  // Check facility states updated
  const facilities = getFacilities();
  const f2 = facilities.find((f) => f.id === 'higashi2-gate');
  const f1a = facilities.find((f) => f.id === 'higashi1-a-shutter');
  const f3 = facilities.find((f) => f.id === 'higashi3-gate');
  assert.equal(f2.state, 'open');
  assert.equal(f1a.state, 'open');
  assert.equal(f3.state, 'closed'); // unchanged

  // req-3 is still pending
  assert.equal(getRequests({ status: 'pending' }).length, 1);

  // Invalid ids returns INVALID_IDS
  const resInvalid = batchApproveRequests('not-array');
  assert.equal(resInvalid.success, false);
  assert.equal(resInvalid.reason, 'INVALID_IDS');
});

test('batchRejectRequests() rejects multiple requests', () => {
  createRequest({ facilityId: 'higashi2-gate', requestedState: 'open' });
  createRequest({ facilityId: 'higashi3-gate', requestedState: 'open' });

  const res = batchRejectRequests(['req-1', 'req-2'], '不要な申請のため一括差戻');
  assert.equal(res.success, true);
  assert.equal(res.rejectedCount, 2);
  assert.equal(res.requests[0].status, 'rejected');
  assert.equal(res.requests[0].rejectReason, '不要な申請のため一括差戻');
  assert.equal(res.requests[1].status, 'rejected');
  assert.equal(getRequests({ status: 'pending' }).length, 0);

  const resInvalid = batchRejectRequests([]);
  assert.equal(resInvalid.success, false);
  assert.equal(resInvalid.reason, 'INVALID_IDS');
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

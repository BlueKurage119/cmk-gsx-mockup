const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  getFacilities,
  updateFacilityState,
  resetFacilities,
} = require('../src/state/facilities');

const EXPECTED_INITIAL_FACILITIES = [
  { id: 'higashi1-gate', name: '東1ゲート', type: 'gate', state: 'open', x: 2355, y: 531 },
  { id: 'higashi2-gate', name: '東2ゲート', type: 'gate', state: 'closed', x: 2388, y: 184 },
  { id: 'higashi3-gate', name: '東3ゲート', type: 'gate', state: 'closed', x: 2218, y: 33 },
  { id: 'higashi4-gate', name: '東4ゲート', type: 'gate', state: 'closed', x: 906, y: 103 },
  { id: 'higashi5-gate', name: '東5ゲート', type: 'gate', state: 'closed', x: 1061, y: 1354 },
  { id: 'higashi6-gate', name: '東6ゲート', type: 'gate', state: 'closed', x: 1649, y: 1354 },
  { id: 'higashi7-5-gate', name: '東7.5ゲート', type: 'gate', state: 'closed', x: 524, y: 1354 },
  { id: 'higashi13-gate', name: '東13ゲート', type: 'checkpoint', state: 'closed', x: 20, y: 1300 },
  { id: 'higashi1-a-shutter', name: '東1-A', type: 'shutter', state: 'closed', x: 1989, y: 178 },
  { id: 'higashi1-b-shutter', name: '東1-B', type: 'shutter', state: 'closed', x: 1917, y: 178 },
  { id: 'higashi1-c-shutter', name: '東1-C', type: 'shutter', state: 'closed', x: 2158, y: 314 },
  { id: 'higashi1-d-shutter', name: '東1-D', type: 'shutter', state: 'closed', x: 2158, y: 510 },
  { id: 'higashi1-12-shutter', name: '東1-1・2', type: 'shutter', state: 'closed', x: 1904, y: 628 },
  { id: 'higashi1-34-shutter', name: '東1-3・4', type: 'shutter', state: 'closed', x: 2002, y: 628 },
  { id: 'higashi2-a-shutter', name: '東2-A', type: 'shutter', state: 'closed', x: 1587, y: 178 },
  { id: 'higashi2-b-shutter', name: '東2-B', type: 'shutter', state: 'closed', x: 1515, y: 178 },
  { id: 'higashi2-12-shutter', name: '東2-1・2', type: 'shutter', state: 'closed', x: 1502, y: 628 },
  { id: 'higashi2-34-shutter', name: '東2-3・4', type: 'shutter', state: 'closed', x: 1600, y: 628 },
  { id: 'higashi3-a-shutter', name: '東3-A', type: 'shutter', state: 'closed', x: 1185, y: 178 },
  { id: 'higashi3-b-shutter', name: '東3-B', type: 'shutter', state: 'closed', x: 1113, y: 178 },
  { id: 'higashi3-c-shutter', name: '東3-C', type: 'shutter', state: 'closed', x: 944, y: 314 },
  { id: 'higashi3-d-shutter', name: '東3-D', type: 'shutter', state: 'closed', x: 944, y: 510 },
  { id: 'higashi3-12-shutter', name: '東3-1・2', type: 'shutter', state: 'closed', x: 1100, y: 628 },
  { id: 'higashi3-34-shutter', name: '東3-3・4', type: 'shutter', state: 'closed', x: 1198, y: 628 },
  { id: 'higashi7-a-shutter', name: '東7-A', type: 'shutter', state: 'closed', x: 315, y: 1280 },
  { id: 'higashi7-b-shutter', name: '東7-B', type: 'shutter', state: 'closed', x: 446, y: 1280 },
  { id: 'higashi7-c-shutter', name: '東7-C', type: 'shutter', state: 'closed', x: 645, y: 1007 },
  { id: 'higashi7-d-shutter', name: '東7-D', type: 'shutter', state: 'closed', x: 209, y: 1016 },
  { id: 'higashi8-a-shutter', name: '東8-A', type: 'shutter', state: 'closed', x: 778, y: 457 },
  { id: 'higashi8-b-shutter', name: '東8-B', type: 'shutter', state: 'closed', x: 566, y: 448 },
];

beforeEach(() => {
  resetFacilities();
});

test('getFacilities() returns all 30 initial facilities with exact values', () => {
  const facilities = getFacilities();
  assert.deepStrictEqual(facilities, EXPECTED_INITIAL_FACILITIES);
});

test('getFacilities() returns objects with exactly expected keys and no extra/missing keys', () => {
  const facilities = getFacilities();
  assert.equal(facilities.length, 30);
  const expectedKeys = ['id', 'name', 'state', 'type', 'x', 'y'];

  for (const item of facilities) {
    const actualKeys = Object.keys(item).sort();
    assert.deepStrictEqual(actualKeys, expectedKeys);
  }
});

test('getFacilities() returns snapshot copies so external mutations do not affect internal state', () => {
  const firstCall = getFacilities();
  assert.equal(firstCall.length, 30);
  assert.equal(firstCall[0].state, 'open');

  // Mutate the returned array and its element
  firstCall[0].state = 'closed';
  firstCall.pop();

  const secondCall = getFacilities();
  assert.equal(secondCall.length, 30);
  assert.equal(secondCall[0].state, 'open');
  assert.deepStrictEqual(secondCall, EXPECTED_INITIAL_FACILITIES);
});

test('all facilities have coordinates within map viewBox (0 <= x <= 2420.04, 0 <= y <= 1386.29)', () => {
  const facilities = getFacilities();
  const maxX = 2420.04;
  const maxY = 1386.29;

  for (const f of facilities) {
    assert.ok(f.x >= 0 && f.x <= maxX, `Facility ${f.id} x=${f.x} is out of viewBox [0, ${maxX}]`);
    assert.ok(f.y >= 0 && f.y <= maxY, `Facility ${f.id} y=${f.y} is out of viewBox [0, ${maxY}]`);
  }
});

test('all facility IDs are unique among 30 facilities', () => {
  const facilities = getFacilities();
  const ids = facilities.map((f) => f.id);
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
});

test('all facilities have valid type (gate|shutter|checkpoint) and state (open|closed|restricted)', () => {
  const validTypes = new Set(['gate', 'shutter', 'checkpoint']);
  const validStates = new Set(['open', 'closed', 'restricted']);
  const facilities = getFacilities();

  for (const f of facilities) {
    assert.ok(validTypes.has(f.type), `Facility ${f.id} has invalid type: ${f.type}`);
    assert.ok(validStates.has(f.state), `Facility ${f.id} has invalid state: ${f.state}`);
  }
});

test('updateFacilityState() successfully updates state to open, restricted, and closed', () => {
  const res1 = updateFacilityState('higashi2-gate', 'open');
  assert.equal(res1.success, true);
  assert.equal(res1.facility.state, 'open');
  assert.equal(res1.facility.id, 'higashi2-gate');

  const facilitiesAfterOpen = getFacilities();
  const updated1 = facilitiesAfterOpen.find((f) => f.id === 'higashi2-gate');
  assert.equal(updated1.state, 'open');

  const res2 = updateFacilityState('higashi2-gate', 'restricted');
  assert.equal(res2.success, true);
  assert.equal(res2.facility.state, 'restricted');

  const res3 = updateFacilityState('higashi2-gate', 'closed');
  assert.equal(res3.success, true);
  assert.equal(res3.facility.state, 'closed');
});

test('updateFacilityState() returns INVALID_STATE for unsupported state values', () => {
  const res = updateFacilityState('higashi2-gate', 'invalid_state');
  assert.equal(res.success, false);
  assert.equal(res.reason, 'INVALID_STATE');
});

test('updateFacilityState() returns NOT_FOUND for unknown facility ID', () => {
  const res = updateFacilityState('non-existent-facility', 'open');
  assert.equal(res.success, false);
  assert.equal(res.reason, 'NOT_FOUND');
});

test('resetFacilities() restores all facilities back to initial state', () => {
  updateFacilityState('higashi1-gate', 'closed');
  updateFacilityState('higashi2-gate', 'open');
  assert.equal(getFacilities().find((f) => f.id === 'higashi1-gate').state, 'closed');
  assert.equal(getFacilities().find((f) => f.id === 'higashi2-gate').state, 'open');

  resetFacilities();
  assert.deepStrictEqual(getFacilities(), EXPECTED_INITIAL_FACILITIES);
});

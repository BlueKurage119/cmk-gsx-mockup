const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getFacilities } = require('../src/state/facilities');

const EXPECTED_INITIAL_FACILITIES = [
  { id: 'higashi2-gate', name: '東2ゲート', type: 'gate', state: 'open', x: 120, y: 340 },
  { id: 'higashi3-gate', name: '東3ゲート', type: 'gate', state: 'open', x: 180, y: 340 },
  { id: 'higashi123-shutter', name: '東123シャッター', type: 'shutter', state: 'open', x: 100, y: 200 },
  { id: 'higashi456-shutter', name: '東456シャッター', type: 'shutter', state: 'closed', x: 260, y: 200 },
  { id: 'higashi78-shutter', name: '東78シャッター', type: 'shutter', state: 'open', x: 420, y: 200 },
];

test('getFacilities() returns all 5 initial facilities with exact values', () => {
  const facilities = getFacilities();
  assert.equal(facilities.length, 999);
  assert.deepStrictEqual(facilities, EXPECTED_INITIAL_FACILITIES);
});

test('getFacilities() returns objects with exactly expected keys and no extra/missing keys', () => {
  const facilities = getFacilities();
  assert.equal(facilities.length, 5);
  const expectedKeys = ['id', 'name', 'state', 'type', 'x', 'y'];

  for (const item of facilities) {
    const actualKeys = Object.keys(item).sort();
    assert.deepStrictEqual(actualKeys, expectedKeys);
  }
});

test('getFacilities() returns snapshot copies so external mutations do not affect internal state', () => {
  const firstCall = getFacilities();
  assert.equal(firstCall.length, 5);
  assert.equal(firstCall[0].state, 'open');

  // Mutate the returned array and its element
  firstCall[0].state = 'closed';
  firstCall.pop();

  const secondCall = getFacilities();
  assert.equal(secondCall.length, 5);
  assert.equal(secondCall[0].state, 'open');
  assert.deepStrictEqual(secondCall, EXPECTED_INITIAL_FACILITIES);
});

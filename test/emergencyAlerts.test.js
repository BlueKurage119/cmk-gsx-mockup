const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  VALID_AREAS,
  VALID_CATEGORIES,
  getEmergencyAlerts,
  getEmergencyAlertById,
  createEmergencyAlert,
  resolveEmergencyAlert,
  resetEmergencyAlerts,
} = require('../src/state/emergencyAlerts');

beforeEach(() => {
  resetEmergencyAlerts();
});

test('VALID_AREAS contains 12 areas and VALID_CATEGORIES contains incident and injury', () => {
  assert.equal(VALID_AREAS.length, 12);
  assert.ok(VALID_AREAS.includes('東1ホール'));
  assert.ok(VALID_AREAS.includes('東123屋外'));
  assert.ok(VALID_AREAS.includes('ガレリア'));
  assert.deepEqual(VALID_CATEGORIES, ['incident', 'injury']);
});

test('getEmergencyAlerts() returns empty array initially', () => {
  const alerts = getEmergencyAlerts();
  assert.deepEqual(alerts, []);
});

test('createEmergencyAlert() creates valid alert with incident category', () => {
  const res = createEmergencyAlert({
    category: 'incident',
    reason: '暴力行為',
    area: '東1ホール',
    note: 'トラブル発生',
    reporter: '東地区外警1',
  });

  assert.ok(res.alert);
  assert.equal(res.alert.id, 'alert-1');
  assert.equal(res.alert.category, 'incident');
  assert.equal(res.alert.reason, '暴力行為');
  assert.equal(res.alert.area, '東1ホール');
  assert.equal(res.alert.note, 'トラブル発生');
  assert.equal(res.alert.reporter, '東地区外警1');
  assert.equal(res.alert.status, 'active');
  assert.ok(typeof res.alert.createdAt === 'number');
  assert.equal(res.alert.resolvedAt, null);
});

test('createEmergencyAlert() validation errors on invalid category or area', () => {
  const res1 = createEmergencyAlert({ category: 'unknown', area: '東1ホール' });
  assert.equal(res1.error, 'INVALID_CATEGORY');

  const res2 = createEmergencyAlert({ category: 'incident', area: '東京ドーム' });
  assert.equal(res2.error, 'INVALID_AREA');

  const res3 = createEmergencyAlert({ category: 'incident', area: '' });
  assert.equal(res3.error, 'INVALID_AREA');
});

test('getEmergencyAlerts() filters by status and orders by createdAt desc', () => {
  const a1 = createEmergencyAlert({ category: 'incident', area: '東1ホール', reason: '窃盗' }).alert;
  const a2 = createEmergencyAlert({ category: 'injury', area: '東2ホール', reason: '意識あり' }).alert;

  resolveEmergencyAlert(a1.id);

  const activeAlerts = getEmergencyAlerts({ status: 'active' });
  assert.equal(activeAlerts.length, 1);
  assert.equal(activeAlerts[0].id, a2.id);

  const allAlerts = getEmergencyAlerts({ status: 'all' });
  assert.equal(allAlerts.length, 2);
  assert.equal(allAlerts[0].id, a2.id);
  assert.equal(allAlerts[1].id, a1.id);
});

test('resolveEmergencyAlert() updates status and timestamp', () => {
  const a = createEmergencyAlert({ category: 'injury', area: '東3ホール' }).alert;
  const res = resolveEmergencyAlert(a.id);

  assert.ok(res.alert);
  assert.equal(res.alert.status, 'resolved');
  assert.ok(typeof res.alert.resolvedAt === 'number');

  const notFound = resolveEmergencyAlert('alert-999');
  assert.equal(notFound.error, 'NOT_FOUND');
});

test('getEmergencyAlertById() returns alert or null', () => {
  const a = createEmergencyAlert({ category: 'incident', area: 'ガレリア' }).alert;
  const found = getEmergencyAlertById(a.id);
  assert.equal(found.area, 'ガレリア');

  const notFound = getEmergencyAlertById('alert-999');
  assert.equal(notFound, null);
});

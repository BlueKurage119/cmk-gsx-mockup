const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getFaultReports,
  getFaultReportById,
  createFaultReport,
  acknowledgeFaultReport,
  resetFaultReports,
} = require('../src/state/faultReports');

test.beforeEach(() => {
  resetFaultReports();
});

test('getFaultReports() returns empty array initially', () => {
  assert.deepEqual(getFaultReports(), []);
});

test('createFaultReport() creates valid report with photo', () => {
  const result = createFaultReport({
    locationText: '東123ホール トイレ入口',
    description: 'ドアノブが破損している',
    photoFilename: '12345-photo.jpg',
    reporter: '東地区外警2',
  });

  assert.equal(result.success, true);
  assert.equal(result.report.id, 'fault-1');
  assert.equal(result.report.locationText, '東123ホール トイレ入口');
  assert.equal(result.report.description, 'ドアノブが破損している');
  assert.equal(result.report.photoFilename, '12345-photo.jpg');
  assert.equal(result.report.photoUrl, '/uploads/12345-photo.jpg');
  assert.equal(result.report.reporter, '東地区外警2');
  assert.equal(result.report.status, 'new');
  assert.ok(typeof result.report.createdAt === 'number');
  assert.equal(result.report.acknowledgedAt, null);
});

test('createFaultReport() creates report without photo and with default reporter', () => {
  const result = createFaultReport({
    locationText: '東4ホール 出入口A',
    description: '照明が点滅している',
  });

  assert.equal(result.success, true);
  assert.equal(result.report.photoFilename, null);
  assert.equal(result.report.photoUrl, null);
  assert.equal(result.report.reporter, '東地区外警1');
});

test('createFaultReport() validation errors on empty location or description', () => {
  const err1 = createFaultReport({ locationText: '', description: 'test' });
  assert.equal(err1.success, false);
  assert.equal(err1.reason, 'INVALID_LOCATION');

  const err2 = createFaultReport({ locationText: '   ', description: 'test' });
  assert.equal(err2.success, false);
  assert.equal(err2.reason, 'INVALID_LOCATION');

  const err3 = createFaultReport({ locationText: 'loc', description: '' });
  assert.equal(err3.success, false);
  assert.equal(err3.reason, 'INVALID_DESCRIPTION');

  const err4 = createFaultReport({ locationText: 'loc', description: '   ' });
  assert.equal(err4.success, false);
  assert.equal(err4.reason, 'INVALID_DESCRIPTION');
});

test('getFaultReports() filters by status and orders by createdAt desc', () => {
  createFaultReport({ locationText: '場所1', description: '説明1' });
  createFaultReport({ locationText: '場所2', description: '説明2' });
  const all = getFaultReports();
  assert.equal(all.length, 2);
  assert.equal(all[0].id, 'fault-2'); // desc
  assert.equal(all[1].id, 'fault-1');

  acknowledgeFaultReport('fault-1');
  const newOnly = getFaultReports({ status: 'new' });
  assert.equal(newOnly.length, 1);
  assert.equal(newOnly[0].id, 'fault-2');

  const ackOnly = getFaultReports({ status: 'acknowledged' });
  assert.equal(ackOnly.length, 1);
  assert.equal(ackOnly[0].id, 'fault-1');
});

test('acknowledgeFaultReport() updates status and timestamp', () => {
  createFaultReport({ locationText: '場所1', description: '説明1' });
  const ack = acknowledgeFaultReport('fault-1');
  assert.equal(ack.success, true);
  assert.equal(ack.report.status, 'acknowledged');
  assert.ok(typeof ack.report.acknowledgedAt === 'number');

  const notFound = acknowledgeFaultReport('fault-999');
  assert.equal(notFound.success, false);
  assert.equal(notFound.reason, 'NOT_FOUND');
});

test('getFaultReportById() returns report or null', () => {
  createFaultReport({ locationText: '場所1', description: '説明1' });
  const item = getFaultReportById('fault-1');
  assert.ok(item);
  assert.equal(item.id, 'fault-1');

  const missing = getFaultReportById('fault-999');
  assert.equal(missing, null);
});

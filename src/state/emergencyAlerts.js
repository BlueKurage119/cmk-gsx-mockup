const VALID_AREAS = [
  '東1ホール',
  '東2ホール',
  '東3ホール',
  '東4ホール',
  '東5ホール',
  '東6ホール',
  '東7ホール',
  '東8ホール',
  '東123屋外',
  '東456屋外',
  '東78屋外',
  'ガレリア',
];

const VALID_CATEGORIES = ['incident', 'injury'];

let nextAlertId = 1;
const emergencyAlerts = [];

function getEmergencyAlerts(options = {}) {
  const { status } = options;
  let list = emergencyAlerts.slice();

  if (status && status !== 'all') {
    list = list.filter((a) => a.status === status);
  }

  // 作成日時降順
  list.sort((a, b) => {
    if (b.createdAt !== a.createdAt) {
      return b.createdAt - a.createdAt;
    }
    const idNumA = parseInt(a.id.replace('alert-', ''), 10) || 0;
    const idNumB = parseInt(b.id.replace('alert-', ''), 10) || 0;
    return idNumB - idNumA;
  });

  return list.map((a) => ({ ...a }));
}

function getEmergencyAlertById(id) {
  const alert = emergencyAlerts.find((a) => a.id === id);
  return alert ? { ...alert } : null;
}

function createEmergencyAlert(data = {}) {
  const {
    category,
    reason,
    area,
    note,
    reporter,
  } = data;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return {
      error: 'INVALID_CATEGORY',
      message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    };
  }

  if (!area || typeof area !== 'string' || !VALID_AREAS.includes(area.trim())) {
    return {
      error: 'INVALID_AREA',
      message: `Invalid area. Must be one of: ${VALID_AREAS.join(', ')}`,
    };
  }

  const id = `alert-${nextAlertId++}`;
  const newAlert = {
    id,
    category,
    reason: typeof reason === 'string' ? reason.trim() : '',
    area: area.trim(),
    note: typeof note === 'string' ? note.trim() : '',
    reporter: typeof reporter === 'string' && reporter.trim() ? reporter.trim() : '東地区外警1',
    status: 'active',
    createdAt: Date.now(),
    resolvedAt: null,
  };

  emergencyAlerts.push(newAlert);
  return { alert: { ...newAlert } };
}

function resolveEmergencyAlert(id) {
  const alert = emergencyAlerts.find((a) => a.id === id);
  if (!alert) {
    return { error: 'NOT_FOUND', message: `Emergency alert not found: ${id}` };
  }

  alert.status = 'resolved';
  alert.resolvedAt = Date.now();
  return { alert: { ...alert } };
}

function resetEmergencyAlerts() {
  emergencyAlerts.length = 0;
  nextAlertId = 1;
}

module.exports = {
  VALID_AREAS,
  VALID_CATEGORIES,
  getEmergencyAlerts,
  getEmergencyAlertById,
  createEmergencyAlert,
  resolveEmergencyAlert,
  resetEmergencyAlerts,
};

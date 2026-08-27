const VALID_FAULT_STATUSES = new Set(['new', 'acknowledged']);

let faultReports = [];
let nextFaultId = 1;

/**
 * 故障報告一覧を取得（新しい順、フィルター対応）
 * @param {Object} [filter]
 * @param {string} [filter.status]
 * @returns {Array<Object>} 故障報告オブジェクトのスナップショット配列
 */
function getFaultReports(filter = {}) {
  let result = faultReports;
  if (filter.status) {
    result = result.filter((r) => r.status === filter.status);
  }
  // 作成日時降順（新しい順、同値時はID降順）
  const sorted = result.slice().sort((a, b) => {
    const diff = (b.createdAt || 0) - (a.createdAt || 0);
    if (diff !== 0) return diff;
    const aNum = parseInt(a.id.replace('fault-', ''), 10) || 0;
    const bNum = parseInt(b.id.replace('fault-', ''), 10) || 0;
    return bNum - aNum;
  });
  return sorted.map((r) => ({ ...r }));
}

/**
 * IDで故障報告を取得
 * @param {string} id
 * @returns {Object|null}
 */
function getFaultReportById(id) {
  const report = faultReports.find((r) => r.id === id);
  return report ? { ...report } : null;
}

/**
 * 新規故障報告を作成
 * @param {Object} data
 * @param {string} data.locationText
 * @param {string} data.description
 * @param {string|null} [data.photoFilename]
 * @param {string} [data.reporter]
 * @returns {Object} { success: boolean, report?: Object, reason?: string }
 */
function createFaultReport({ locationText, description, photoFilename = null, reporter = '東地区外警1' }) {
  if (!locationText || typeof locationText !== 'string' || !locationText.trim()) {
    return { success: false, reason: 'INVALID_LOCATION' };
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return { success: false, reason: 'INVALID_DESCRIPTION' };
  }

  const id = `fault-${nextFaultId++}`;
  const now = Date.now();
  const cleanedLocation = locationText.trim();
  const cleanedDescription = description.trim();
  const cleanedReporter = (typeof reporter === 'string' && reporter.trim()) ? reporter.trim() : '東地区外警1';
  const cleanFilename = (typeof photoFilename === 'string' && photoFilename.trim()) ? photoFilename.trim() : null;

  const newReport = {
    id,
    locationText: cleanedLocation,
    description: cleanedDescription,
    photoFilename: cleanFilename,
    photoUrl: cleanFilename ? `/uploads/${cleanFilename}` : null,
    reporter: cleanedReporter,
    status: 'new',
    createdAt: now,
    acknowledgedAt: null,
  };

  faultReports.push(newReport);
  return { success: true, report: { ...newReport } };
}

/**
 * 故障報告を確認済に更新
 * @param {string} id
 * @returns {Object} { success: boolean, report?: Object, reason?: string }
 */
function acknowledgeFaultReport(id) {
  const report = faultReports.find((r) => r.id === id);
  if (!report) {
    return { success: false, reason: 'NOT_FOUND' };
  }

  report.status = 'acknowledged';
  report.acknowledgedAt = Date.now();
  return { success: true, report: { ...report } };
}

/**
 * 状態をリセット（テスト用）
 */
function resetFaultReports() {
  faultReports = [];
  nextFaultId = 1;
}

module.exports = {
  VALID_FAULT_STATUSES,
  getFaultReports,
  getFaultReportById,
  createFaultReport,
  acknowledgeFaultReport,
  resetFaultReports,
};

const { getFacilities } = require('./facilities');

const VALID_REQUESTED_STATES = new Set(['open', 'closed', 'restricted']);
const VALID_REQUEST_STATUSES = new Set(['pending', 'approved', 'rejected', 'cancelled']);

let requests = [];
let nextRequestId = 1;

/**
 * 申請一覧を取得（フィルター対応）
 * @param {Object} [filter]
 * @param {string} [filter.status]
 * @param {string} [filter.facilityId]
 * @returns {Array<Object>} 申請オブジェクトのスナップショット配列
 */
function getRequests(filter = {}) {
  let result = requests;
  if (filter.status) {
    result = result.filter((r) => r.status === filter.status);
  }
  if (filter.facilityId) {
    result = result.filter((r) => r.facilityId === filter.facilityId);
  }
  return result.map((r) => ({ ...r }));
}

/**
 * IDで申請を取得
 * @param {string} id
 * @returns {Object|null} 申請オブジェクトまたはnull
 */
function getRequestById(id) {
  const req = requests.find((r) => r.id === id);
  return req ? { ...req } : null;
}

/**
 * 新規申請を作成
 * @param {Object} data
 * @param {string} data.facilityId
 * @param {string} data.requestedState
 * @param {string} [data.note]
 * @param {string} [data.applicant]
 * @returns {Object} { success: boolean, request?: Object, reason?: string }
 */
function createRequest({ facilityId, requestedState, note = '', applicant = '東地区外警1' }) {
  if (!facilityId || typeof facilityId !== 'string') {
    return { success: false, reason: 'INVALID_FACILITY_ID' };
  }
  if (!VALID_REQUESTED_STATES.has(requestedState)) {
    return { success: false, reason: 'INVALID_STATE' };
  }

  const facilities = getFacilities();
  const facility = facilities.find((f) => f.id === facilityId);
  if (!facility) {
    return { success: false, reason: 'FACILITY_NOT_FOUND' };
  }

  const id = `req-${nextRequestId++}`;
  const newRequest = {
    id,
    facilityId: facility.id,
    facilityName: facility.name,
    facilityType: facility.type,
    requestedState,
    previousState: facility.state,
    status: 'pending',
    createdAt: Date.now(),
    note: typeof note === 'string' ? note.trim() : '',
    applicant: typeof applicant === 'string' && applicant.trim() ? applicant.trim() : '東地区外警1',
  };

  requests.push(newRequest);
  return { success: true, request: { ...newRequest } };
}

/**
 * 申請を取り下げ（キャンセル）
 * @param {string} id
 * @returns {Object} { success: boolean, request?: Object, reason?: string }
 */
function cancelRequest(id) {
  const req = requests.find((r) => r.id === id);
  if (!req) {
    return { success: false, reason: 'NOT_FOUND' };
  }
  if (req.status !== 'pending') {
    return { success: false, reason: 'NOT_PENDING' };
  }

  req.status = 'cancelled';
  req.updatedAt = Date.now();
  return { success: true, request: { ...req } };
}

/**
 * 申請ステータスを更新（承認・却下等）
 * @param {string} id
 * @param {string} newStatus
 * @returns {Object} { success: boolean, request?: Object, reason?: string }
 */
function updateRequestStatus(id, newStatus) {
  if (!VALID_REQUEST_STATUSES.has(newStatus)) {
    return { success: false, reason: 'INVALID_STATUS' };
  }
  const req = requests.find((r) => r.id === id);
  if (!req) {
    return { success: false, reason: 'NOT_FOUND' };
  }
  if (req.status !== 'pending') {
    return { success: false, reason: 'NOT_PENDING' };
  }

  req.status = newStatus;
  req.updatedAt = Date.now();
  return { success: true, request: { ...req } };
}

/**
 * 申請状態を初期化
 */
function resetRequests() {
  requests = [];
  nextRequestId = 1;
}

module.exports = {
  VALID_REQUESTED_STATES,
  VALID_REQUEST_STATUSES,
  getRequests,
  getRequestById,
  createRequest,
  cancelRequest,
  updateRequestStatus,
  resetRequests,
};

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
 * 特定の設備に対する保留中（pending）の申請を自動差戻し（手動変更時）
 * @param {string|Array<string>} facilityIds 設備IDまたはその配列
 * @param {string} [reasonNote='手動変更により自動差戻し']
 * @returns {Array<Object>} 差戻された申請オブジェクトの配列
 */
function rejectPendingRequestsForFacilities(facilityIds, reasonNote = '手動変更により自動差戻し') {
  const ids = Array.isArray(facilityIds) ? new Set(facilityIds) : new Set([facilityIds]);
  const rejected = [];
  requests.forEach((req) => {
    if (ids.has(req.facilityId) && req.status === 'pending') {
      req.status = 'rejected';
      req.updatedAt = Date.now();
      req.rejectReason = reasonNote;
      rejected.push({ ...req });
    }
  });
  return rejected;
}

/**
 * 複数申請を一括承認
 * @param {Array<string>} ids 申請IDの配列
 * @returns {Object} { success: boolean, approvedCount: number, requests: Array, facilities: Array }
 */
function batchApproveRequests(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: false, reason: 'INVALID_IDS' };
  }
  const idSet = new Set(ids);
  const approvedRequests = [];
  const updatedFacilities = [];
  const { updateFacilityState } = require('./facilities');

  requests.forEach((req) => {
    if (idSet.has(req.id) && req.status === 'pending') {
      req.status = 'approved';
      req.updatedAt = Date.now();
      approvedRequests.push({ ...req });

      const facResult = updateFacilityState(req.facilityId, req.requestedState);
      if (facResult.success && facResult.facility) {
        updatedFacilities.push(facResult.facility);
      }
    }
  });

  return {
    success: true,
    approvedCount: approvedRequests.length,
    requests: approvedRequests,
    facilities: updatedFacilities,
  };
}

/**
 * 複数申請を一括差戻し
 * @param {Array<string>} ids 申請IDの配列
 * @param {string} [reason='一括差戻']
 * @returns {Object} { success: boolean, rejectedCount: number, requests: Array }
 */
function batchRejectRequests(ids, reason = '一括差戻') {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { success: false, reason: 'INVALID_IDS' };
  }
  const idSet = new Set(ids);
  const rejectedRequests = [];

  requests.forEach((req) => {
    if (idSet.has(req.id) && req.status === 'pending') {
      req.status = 'rejected';
      req.updatedAt = Date.now();
      req.rejectReason = reason;
      rejectedRequests.push({ ...req });
    }
  });

  return {
    success: true,
    rejectedCount: rejectedRequests.length,
    requests: rejectedRequests,
  };
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
  rejectPendingRequestsForFacilities,
  batchApproveRequests,
  batchRejectRequests,
  resetRequests,
};

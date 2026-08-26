const {
  getRequests,
  getRequestById,
  createRequest,
  cancelRequest,
  updateRequestStatus,
} = require('../state/requests');
const { updateFacilityState } = require('../state/facilities');

function registerRequestRoutes(app) {
  // GET /api/requests: 申請一覧取得
  app.get('/api/requests', (req, res) => {
    const { status, facilityId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (facilityId) filter.facilityId = facilityId;

    const list = getRequests(filter);
    res.status(200).json(list);
  });

  // GET /api/requests/:id: 単一申請取得
  app.get('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const item = getRequestById(id);
    if (!item) {
      return res.status(404).json({ error: `Request ${id} not found` });
    }
    return res.status(200).json(item);
  });

  // POST /api/requests: 新規申請作成
  app.post('/api/requests', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const { facilityId, requestedState, note, applicant } = body;
    if (!facilityId || typeof facilityId !== 'string') {
      return res.status(400).json({ error: 'facilityId is required and must be a string' });
    }
    if (!requestedState || typeof requestedState !== 'string') {
      return res.status(400).json({ error: 'requestedState is required and must be a string' });
    }

    const result = createRequest({ facilityId, requestedState, note, applicant });
    if (!result.success) {
      if (result.reason === 'FACILITY_NOT_FOUND') {
        return res.status(404).json({ error: `Facility ${facilityId} not found` });
      }
      if (result.reason === 'INVALID_STATE') {
        return res.status(400).json({
          error: `Invalid requestedState: ${requestedState}. Valid states: open, closed, restricted`,
        });
      }
      return res.status(400).json({ error: `Failed to create request: ${result.reason}` });
    }

    return res.status(201).json(result.request);
  });

  // POST /api/requests/:id/approve: 申請承認（設備状態を更新）
  app.post('/api/requests/:id/approve', (req, res) => {
    const { id } = req.params;
    const item = getRequestById(id);
    if (!item) {
      return res.status(404).json({ error: `Request ${id} not found` });
    }
    if (item.status !== 'pending') {
      return res.status(409).json({ error: `Request ${id} cannot be approved because it is ${item.status}` });
    }

    const facResult = updateFacilityState(item.facilityId, item.requestedState);
    if (!facResult.success) {
      return res.status(500).json({ error: `Failed to update facility state: ${facResult.reason}` });
    }

    const reqResult = updateRequestStatus(id, 'approved');
    if (!reqResult.success) {
      return res.status(500).json({ error: `Failed to update request status: ${reqResult.reason}` });
    }

    return res.status(200).json({
      success: true,
      request: reqResult.request,
      facility: facResult.facility,
    });
  });

  // POST /api/requests/:id/reject: 申請差戻（却下）
  app.post('/api/requests/:id/reject', (req, res) => {
    const { id } = req.params;
    const item = getRequestById(id);
    if (!item) {
      return res.status(404).json({ error: `Request ${id} not found` });
    }
    if (item.status !== 'pending') {
      return res.status(409).json({ error: `Request ${id} cannot be rejected because it is ${item.status}` });
    }

    const reqResult = updateRequestStatus(id, 'rejected');
    if (!reqResult.success) {
      return res.status(500).json({ error: `Failed to update request status: ${reqResult.reason}` });
    }

    return res.status(200).json({
      success: true,
      request: reqResult.request,
    });
  });

  // DELETE /api/requests/:id: 申請取り下げ（キャンセル）
  app.delete('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const result = cancelRequest(id);

    if (!result.success) {
      if (result.reason === 'NOT_FOUND') {
        return res.status(404).json({ error: `Request ${id} not found` });
      }
      if (result.reason === 'NOT_PENDING') {
        return res.status(409).json({ error: `Request ${id} cannot be cancelled because it is not pending` });
      }
      return res.status(400).json({ error: `Failed to cancel request: ${result.reason}` });
    }

    return res.status(200).json({ success: true, request: result.request });
  });
}

module.exports = {
  registerRequestRoutes,
};

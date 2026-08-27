const express = require('express');
const { getNotes, commitNoteChanges } = require('../state/notes');

function registerNoteRoutes(app) {
  const router = express.Router();

  // GET /api/notes (クエリ: ?layer=summary|detail)
  router.get('/notes', (req, res) => {
    const filter = {};
    if (req.query.layer) {
      filter.layer = req.query.layer;
    }
    const list = getNotes(filter);
    res.json(list);
  });

  // POST /api/notes/commit
  router.post('/notes/commit', (req, res) => {
    const body = req.body || {};
    const creates = Array.isArray(body.creates) ? body.creates : [];
    const updates = Array.isArray(body.updates) ? body.updates : [];
    const deletes = Array.isArray(body.deletes) ? body.deletes : [];

    const result = commitNoteChanges({ creates, updates, deletes });
    if (!result.success) {
      return res.status(400).json({
        error: 'ピタネットの一括コミットに失敗しました',
        reason: result.reason,
        detail: result.detail,
      });
    }

    res.json(result);
  });

  app.use('/api', router);
}

module.exports = { registerNoteRoutes };

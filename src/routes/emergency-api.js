const express = require('express');
const {
  getEmergencyAlerts,
  getEmergencyAlertById,
  createEmergencyAlert,
  resolveEmergencyAlert,
} = require('../state/emergencyAlerts');

function registerEmergencyRoutes(app) {
  const router = express.Router();

  // POST /api/emergency-alerts
  router.post('/emergency-alerts', (req, res) => {
    const { category, reason, area, note, reporter } = req.body || {};

    const result = createEmergencyAlert({
      category,
      reason,
      area,
      note,
      reporter,
    });

    if (result.error === 'INVALID_CATEGORY' || result.error === 'INVALID_AREA') {
      return res.status(400).json({ error: result.message });
    }

    if (result.error) {
      return res.status(500).json({ error: result.message });
    }

    return res.status(201).json({ success: true, alert: result.alert });
  });

  // GET /api/emergency-alerts
  router.get('/emergency-alerts', (req, res) => {
    const { status } = req.query;
    const list = getEmergencyAlerts({ status });
    return res.json(list);
  });

  // GET /api/emergency-alerts/:id
  router.get('/emergency-alerts/:id', (req, res) => {
    const alert = getEmergencyAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Emergency alert not found' });
    }
    return res.json(alert);
  });

  // POST /api/emergency-alerts/:id/resolve
  router.post('/emergency-alerts/:id/resolve', (req, res) => {
    const result = resolveEmergencyAlert(req.params.id);
    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ error: result.message });
    }
    if (result.error) {
      return res.status(500).json({ error: result.message });
    }
    return res.json({ success: true, alert: result.alert });
  });

  app.use('/api', router);
}

module.exports = {
  registerEmergencyRoutes,
};

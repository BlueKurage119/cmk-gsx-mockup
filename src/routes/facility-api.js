const { getFacilities, updateFacilityState } = require('../state/facilities');

function registerFacilityRoutes(app) {
  app.get('/api/facilities', (req, res) => {
    res.status(200).json(getFacilities());
  });

  app.put('/api/facilities/:id', (req, res) => {
    const { id } = req.params;
    const { state } = req.body || {};

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid state field' });
    }

    const result = updateFacilityState(id, state);
    if (!result.success) {
      if (result.reason === 'INVALID_STATE') {
        return res.status(400).json({ error: 'Invalid state. Allowed values are: open, closed, restricted' });
      }
      if (result.reason === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Facility not found' });
      }
      return res.status(400).json({ error: 'Failed to update facility state' });
    }

    return res.status(200).json(result.facility);
  });

  return app;
}

module.exports = {
  registerFacilityRoutes,
};

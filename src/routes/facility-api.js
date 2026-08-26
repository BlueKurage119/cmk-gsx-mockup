const { getFacilities, updateFacilityState, updateFacilitiesBatch } = require('../state/facilities');

function registerFacilityRoutes(app) {
  app.get('/api/facilities', (req, res) => {
    res.status(200).json(getFacilities());
  });

  app.put('/api/facilities/batch', (req, res) => {
    const { ids, state } = req.body || {};

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid state field' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid ids field. Expected non-empty array of facility IDs' });
    }

    const result = updateFacilitiesBatch(ids, state);
    if (!result.success) {
      if (result.reason === 'INVALID_STATE') {
        return res.status(400).json({ error: 'Invalid state. Allowed values are: open, closed, restricted' });
      }
      if (result.reason === 'INVALID_IDS') {
        return res.status(400).json({ error: 'Invalid ids array' });
      }
      if (result.reason === 'NOT_FOUND') {
        return res.status(404).json({ error: `Facility not found: ${result.notFoundId}` });
      }
      return res.status(400).json({ error: 'Failed to update facilities' });
    }

    return res.status(200).json({
      success: true,
      updatedCount: result.updatedCount,
      facilities: result.facilities,
    });
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

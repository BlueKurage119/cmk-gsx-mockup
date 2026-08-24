const { getFacilities } = require('../state/facilities');

function registerFacilityRoutes(app) {
  app.get('/api/facilities', (req, res) => {
    res.status(200).json(getFacilities());
  });

  return app;
}

module.exports = {
  registerFacilityRoutes,
};

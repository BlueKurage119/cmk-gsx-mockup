const express = require('express');
const {
  fetchWeatherAlerts,
  fetchRadarTimes,
} = require('../state/weather');

function registerWeatherRoutes(app) {
  const router = express.Router();

  // GET /api/weather/alerts
  router.get('/weather/alerts', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
      const data = await fetchWeatherAlerts({ forceRefresh });
      return res.json({
        success: true,
        ...data,
      });
    } catch (err) {
      console.error('API Error in /api/weather/alerts:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve weather alerts',
      });
    }
  });

  // GET /api/weather/radar-times
  router.get('/weather/radar-times', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
      const data = await fetchRadarTimes({ forceRefresh });
      return res.json({
        success: true,
        ...data,
      });
    } catch (err) {
      console.error('API Error in /api/weather/radar-times:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve radar times',
      });
    }
  });

  app.use('/api', router);
}

module.exports = {
  registerWeatherRoutes,
};

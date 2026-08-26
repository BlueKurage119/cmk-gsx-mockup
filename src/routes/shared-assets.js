const path = require('node:path');
const express = require('express');

function registerSharedRoutes(app) {
  const sharedRoot = path.resolve(__dirname, '../../public/shared');

  app.use('/shared', express.static(sharedRoot));

  return app;
}

module.exports = {
  registerSharedRoutes,
};

const path = require('node:path');
const express = require('express');

function registerTerminalRoutes(app) {
  const hRoot = path.resolve(__dirname, '../../public/h');
  const mRoot = path.resolve(__dirname, '../../public/m');

  app.get('/h', (req, res) => {
    res.sendFile('index.html', { root: hRoot });
  });
  app.use('/h', express.static(hRoot));

  app.get('/m', (req, res) => {
    res.sendFile('index.html', { root: mRoot });
  });
  app.use('/m', express.static(mRoot));

  return app;
}

module.exports = {
  registerTerminalRoutes,
};

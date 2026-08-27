const express = require('express');
const { registerTerminalRoutes } = require('./src/routes/terminal-pages');
const { registerFacilityRoutes } = require('./src/routes/facility-api');
const { registerRequestRoutes } = require('./src/routes/request-api');
const { registerFaultRoutes, uploadDir } = require('./src/routes/fault-api');
const { registerEmergencyRoutes } = require('./src/routes/emergency-api');
const { registerNoteRoutes } = require('./src/routes/note-api');
const { registerSharedRoutes } = require('./src/routes/shared-assets');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/uploads', express.static(uploadDir));

  app.get('/', (req, res) => {
    res.status(200).type('text/plain').send('CMK/GSX mockup server is running\n');
  });

  registerTerminalRoutes(app);
  registerFacilityRoutes(app);
  registerRequestRoutes(app);
  registerFaultRoutes(app);
  registerEmergencyRoutes(app);
  registerNoteRoutes(app);
  registerSharedRoutes(app);

  return app;
}

function startServer(options = {}) {
  const app = createApp();
  const port = options.port ?? process.env.PORT ?? 8080;

  const callback = () => {
    console.log(`Server listening on port ${port}`);
  };

  const server = options.host
    ? app.listen(port, options.host, callback)
    : app.listen(port, callback);

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};

const { app } = require("./app");
const { logger } = require("./middleware/logger");

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  server.ref();
  logger.info({ port }, "API server started");
});

function shutdown(signal) {
  logger.info({ signal }, "Shutting down API server");
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, "Error while closing server");
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = {
  server,
};

const pino = require("pino");
const pinoHttp = require("pino-http");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

const httpLogger = pinoHttp({
  logger,
  customProps(req) {
    return {
      correlationId: req.correlationId || null,
      user: req.userContext || null,
    };
  },
});

module.exports = {
  logger,
  httpLogger,
};

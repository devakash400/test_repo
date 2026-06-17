const { randomUUID } = require("node:crypto");

const CORRELATION_ID_HEADER = "x-correlation-id";

function correlationIdMiddleware(req, res, next) {
  const incomingCorrelationId = req.get(CORRELATION_ID_HEADER);
  const correlationId = incomingCorrelationId || randomUUID();

  req.correlationId = correlationId;
  res.locals.correlationId = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

module.exports = {
  CORRELATION_ID_HEADER,
  correlationIdMiddleware,
};

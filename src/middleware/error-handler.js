const { logger } = require("./logger");
const { sendError } = require("../utils/response");

function notFoundHandler(req, res) {
  return sendError(res, req, {
    message: "Route not found",
    statusCode: 404,
    code: "NOT_FOUND",
  });
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  logger.error(
    {
      err,
      correlationId: req.correlationId || null,
      user: req.userContext || null,
    },
    "Unhandled API error"
  );

  return sendError(res, req, {
    statusCode,
    code,
    message: err.publicMessage || err.message || "Unexpected error",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

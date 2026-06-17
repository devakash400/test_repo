function buildBaseMetadata(req) {
  return {
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
    user: req.userContext || null,
  };
}

function sendSuccess(res, req, data, message = "Request completed successfully", statusCode = 200) {
  const metadata = buildBaseMetadata(req);

  return res.status(statusCode).json({
    ok: true,
    message,
    data,
    ...metadata,
  });
}

function sendError(res, req, options = {}) {
  const {
    message = "Unexpected error",
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  } = options;
  const metadata = buildBaseMetadata(req);

  return res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message,
      details,
    },
    ...metadata,
  });
}

module.exports = {
  sendSuccess,
  sendError,
};

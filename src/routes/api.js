const express = require("express");
const { sendSuccess, sendError } = require("../utils/response");
const { appendClientErrorLog } = require("../utils/error-log-writer");

const router = express.Router();

router.get("/health", (req, res) => {
  return sendSuccess(
    res,
    req,
    {
      status: "up",
    },
    "Service is healthy"
  );
});

router.get("/orders/:orderId", (req, res) => {
  return sendSuccess(
    res,
    req,
    {
      orderId: req.params.orderId,
    },
    "Order fetched"
  );
});

router.post("/client-errors", async (req, res, next) => {
  try {
    const { correlationId, errorDetails } = req.body || {};

    if (!correlationId || typeof correlationId !== "string") {
      return sendError(res, req, {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "correlationId is required and must be a string",
      });
    }

    if (!errorDetails || typeof errorDetails !== "object" || Array.isArray(errorDetails)) {
      return sendError(res, req, {
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "errorDetails is required and must be an object",
      });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId,
      requestCorrelationId: req.correlationId,
      user: req.userContext || null,
      source: "frontend",
      request: {
        method: req.method,
        path: req.originalUrl,
        userAgent: req.get("user-agent") || null,
      },
      errorDetails,
    };

    const logFilePath = await appendClientErrorLog(logEntry);

    return sendSuccess(
      res,
      req,
      {
        logged: true,
        file: logFilePath,
      },
      "Client error logged",
      201
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/demo-error", (_req, _res, next) => {
  const error = new Error("Demo downstream failure");
  error.code = "DOWNSTREAM_UNAVAILABLE";
  error.statusCode = 503;
  error.publicMessage = "Dependent service unavailable";
  next(error);
});

module.exports = {
  apiRouter: router,
};

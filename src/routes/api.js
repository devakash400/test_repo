const express = require("express");
const { sendSuccess, sendError } = require("../utils/response");
const { appendClientErrorLog } = require("../utils/error-log-writer");
const { getOrderById } = require("../services/orders");

const router = express.Router();

router.get("/health", (req, res) => {
  return sendSuccess(res, req, { status: "up" }, "Service is healthy");
});

/**
 * GET /api/orders/:orderId
 *
 * Always sets `x-correlation-id` response header (via correlationIdMiddleware).
 * The `correlationId` is also present in the response body on both success and error.
 *
 * Frontend flow:
 *   1. Call this endpoint.
 *   2. Read `x-correlation-id` from the response header.
 *   3. If the response is an error (non-2xx), call POST /api/client-errors
 *      with that correlationId + error details.
 */
router.get("/orders/:orderId", (req, res, next) => {
  try {
    const order = getOrderById(req.params.orderId);
    return sendSuccess(res, req, order, "Order fetched");
  } catch (err) {
    return next(err);
  }
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

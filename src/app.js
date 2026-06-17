const express = require("express");
const { correlationIdMiddleware } = require("./middleware/correlation-id");
const { userContextMiddleware } = require("./middleware/user-context");
const { httpLogger } = require("./middleware/logger");
const { errorHandler, notFoundHandler } = require("./middleware/error-handler");
const { apiRouter } = require("./routes/api");

const app = express();

app.use(express.json());
app.use(correlationIdMiddleware);
app.use(userContextMiddleware);
app.use(httpLogger);

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = {
  app,
};

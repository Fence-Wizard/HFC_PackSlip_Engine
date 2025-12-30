const logger = require("../config/logger");

module.exports = function errorHandler(err, req, res, next) {
  // Log to console for visibility in dev
  // eslint-disable-next-line no-console
  console.error(err);
  logger.error("Unhandled error", {
    reqId: req?.id,
    message: err?.message,
    stack: err?.stack,
  });

  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ error: err?.message || "Internal Server Error" });
};


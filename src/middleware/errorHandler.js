const logger = require("../config/logger");

module.exports = function errorHandler(err, req, res, next) {
  logger.error("Unhandled error", {
    reqId: req?.id,
    message: err?.message,
    stack: err?.stack,
  });

  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).send({ error: "Internal Server Error" });
};


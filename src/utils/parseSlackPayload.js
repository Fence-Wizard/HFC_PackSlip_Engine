const logger = require("../config/logger");

function parseSlackPayload(req) {
  if (req.rawBody) {
    try {
      return JSON.parse(req.rawBody.toString("utf8"));
    } catch (err) {
      logger.warn("Failed to parse Slack raw body", { reqId: req.id, message: err.message });
      return null;
    }
  }

  if (req.body) {
    return req.body;
  }

  return null;
}

module.exports = { parseSlackPayload };


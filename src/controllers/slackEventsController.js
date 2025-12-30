const dedupeCache = require("../utils/dedupeCache");
const { parseSlackPayload } = require("../utils/parseSlackPayload");
const logger = require("../config/logger");
const { handleEvent } = require("../services/eventProcessor");

async function slackEventsHandler(req, res) {
  const payload = parseSlackPayload(req);
  if (!payload) {
    return res.status(400).send("Invalid JSON");
  }

  if (payload.type === "url_verification") {
    return res.status(200).send(payload.challenge);
  }

  const eventId = payload.event_id;
  const retryNum = req.headers["x-slack-retry-num"] || "0";
  const dedupeKey = eventId ? `${eventId}:${retryNum}` : null;

  if (dedupeKey && dedupeCache.seen(dedupeKey)) {
    logger.info("Skipped duplicate Slack event", { reqId: req.id, dedupeKey });
    return res.sendStatus(200);
  }

  // Ack immediately
  res.sendStatus(200);

  // Process async
  handleEvent(payload, req.id);
  return null;
}

module.exports = { slackEventsHandler };


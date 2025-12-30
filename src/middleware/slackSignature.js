const crypto = require("crypto");
const { config } = require("../config/env");
const logger = require("../config/logger");

function safeCompare(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function computeSlackSignature(signingSecret, timestamp, rawBody) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || "", "utf8");
  const base = `v0:${timestamp}:${body.toString("utf8")}`;
  const hmac = crypto.createHmac("sha256", signingSecret);
  hmac.update(base);
  return `v0=${hmac.digest("hex")}`;
}

module.exports = function slackSignature(req, res, next) {
  const timestamp = req.headers["x-slack-request-timestamp"];
  const signature = req.headers["x-slack-signature"];

  if (!timestamp || !signature) {
    logger.warn("Missing Slack signature headers", { reqId: req.id });
    return res.sendStatus(401);
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(ageSeconds) || ageSeconds > 60 * 5) {
    logger.warn("Slack signature too old", { reqId: req.id, timestamp });
    return res.sendStatus(400);
  }

  const rawBody = req.rawBody || req.body;
  if (!rawBody) {
    logger.warn("Missing raw body for Slack signature verification", { reqId: req.id });
    return res.sendStatus(400);
  }

  const expected = computeSlackSignature(config.slackSigningSecret, timestamp, rawBody);
  const ok = safeCompare(expected, signature);
  if (!ok) {
    logger.warn("Slack signature mismatch", { reqId: req.id });
    return res.sendStatus(401);
  }

  return next();
};


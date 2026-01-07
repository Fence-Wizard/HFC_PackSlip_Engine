const axios = require("axios");
const logger = require("../config/logger");
const { config } = require("../config/env");
const { withRetry } = require("../utils/retry");

async function sendToN8n(payload, reqId) {
  if (!config.n8nWebhookUrl) {
    logger.warn("N8N_WEBHOOK_URL not set; skipping webhook dispatch", { reqId });
    return { skipped: true };
  }

  // Log the attempt (mask URL for security, show host only)
  try {
    const urlHost = new URL(config.n8nWebhookUrl).host;
    logger.info("Sending webhook to n8n", { reqId, host: urlHost, payloadId: payload?.id });
  } catch {
    logger.info("Sending webhook to n8n", { reqId, payloadId: payload?.id });
  }

  return withRetry(
    async () => {
      const response = await axios.post(config.n8nWebhookUrl, payload, { timeout: 10000 });
      logger.info("Webhook delivered successfully", { reqId, status: response.status });
      return { delivered: true };
    },
    {
      retries: 2,
      shouldRetry: (err) => {
        const status = err?.response?.status;
        logger.warn("Webhook attempt failed, may retry", {
          reqId,
          code: err?.code,
          status,
          message: err?.message,
        });
        return err?.code === "ETIMEDOUT" || err?.code === "ECONNRESET" || (status && status >= 500);
      },
    },
  );
}

module.exports = { sendToN8n };


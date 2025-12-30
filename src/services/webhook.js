const axios = require("axios");
const logger = require("../config/logger");
const { config } = require("../config/env");
const { withRetry } = require("../utils/retry");

async function sendToN8n(payload, reqId) {
  if (!config.n8nWebhookUrl) {
    logger.warn("N8N_WEBHOOK_URL not set; skipping webhook dispatch", { reqId });
    return { skipped: true };
  }

  return withRetry(
    async () => {
      await axios.post(config.n8nWebhookUrl, payload, { timeout: 10000 });
      return { delivered: true };
    },
    {
      retries: 2,
      shouldRetry: (err) => {
        const status = err?.response?.status;
        return err?.code === "ETIMEDOUT" || err?.code === "ECONNRESET" || (status && status >= 500);
      },
    },
  );
}

module.exports = { sendToN8n };


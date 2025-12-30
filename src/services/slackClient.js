const { WebClient } = require("@slack/web-api");
const { config } = require("../config/env");
const logger = require("../config/logger");
const { withRetry } = require("../utils/retry");

const slack = new WebClient(config.slackBotToken);

async function postMessage(args, reqId) {
  return withRetry(
    () => slack.chat.postMessage(args),
    {
      retries: 3,
      shouldRetry: (err) => {
        const status = err?.data?.response_metadata?.status || err?.status;
        const retryable =
          err?.code === "ETIMEDOUT" ||
          err?.code === "ECONNRESET" ||
          status === 429 ||
          (status && status >= 500);
        if (!retryable) {
          logger.warn("Slack API non-retryable error", { reqId, message: err?.message });
        }
        return retryable;
      },
    },
  );
}

module.exports = {
  postMessage,
  slack,
};


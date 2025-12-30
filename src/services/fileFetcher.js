const axios = require("axios");
const { config } = require("../config/env");
const { withRetry } = require("../utils/retry");

async function downloadSlackFile(urlPrivate, reqId) {
  return withRetry(
    async () => {
      const res = await axios.get(urlPrivate, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${config.slackBotToken}` },
        timeout: 10000,
      });
      return Buffer.from(res.data);
    },
    {
      retries: 2,
      shouldRetry: (err) => {
        const status = err?.response?.status;
        return (
          err?.code === "ETIMEDOUT" ||
          err?.code === "ECONNRESET" ||
          status === 429 ||
          (status && status >= 500)
        );
      },
    },
  );
}

module.exports = { downloadSlackFile };


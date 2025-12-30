const path = require("path");

const OPTIONAL_VARS = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET"];

function optionalEnv(name) {
  return process.env[name] || null;
}

function numberEnv(name, fallback) {
  const raw = process.env[name];
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
}

const config = {
  port: 3000,
  baseUrl: null,
  uploadDir: null,
  dataDir: null,
  n8nWebhookUrl: null,
  slackBotToken: null,
  slackSigningSecret: null,
};

function loadConfig() {
  config.port = numberEnv("PORT", 3000);
  config.baseUrl = process.env.APP_BASE_URL || `http://localhost:${config.port}`;
  config.dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  config.uploadDir =
    process.env.UPLOAD_DIR || path.join(config.dataDir, "uploads");
  config.n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || null;

  OPTIONAL_VARS.forEach((name) => {
    config[name === "SLACK_BOT_TOKEN" ? "slackBotToken" : "slackSigningSecret"] =
      optionalEnv(name);
  });

  return config;
}

module.exports = {
  config,
  loadConfig,
};


const REQUIRED_VARS = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET"];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const config = {
  port: Number(process.env.PORT) || 3000,
  slackBotToken: null,
  slackSigningSecret: null,
};

function loadConfig() {
  REQUIRED_VARS.forEach((name) => {
    config[name === "SLACK_BOT_TOKEN" ? "slackBotToken" : "slackSigningSecret"] =
      requireEnv(name);
  });

  return config;
}

module.exports = {
  config,
  loadConfig,
};


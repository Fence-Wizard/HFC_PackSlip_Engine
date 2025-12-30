require("dotenv").config();

const express = require("express");
const { loadConfig, config } = require("./config/env");
const logger = require("./config/logger");
const requestId = require("./middleware/requestId");
const slackEventsRouter = require("./routes/slackEvents");
const healthRouter = require("./routes/health");
const errorHandler = require("./middleware/errorHandler");

loadConfig();

const app = express();

// Capture raw body for Slack signature verification on /slack/events
const rawBodySaver = (req, res, buf) => {
  req.rawBody = buf;
};

app.use(requestId);

app.use(
  "/slack/events",
  express.raw({ type: "application/json", limit: "25mb", verify: rawBodySaver }),
);

// Default JSON parser for the rest of the routes
app.use(express.json({ limit: "1mb" }));

app.use("/slack", slackEventsRouter);
app.use("/", healthRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Server running on http://localhost:${config.port}`);
  logger.info("Slack events endpoint: /slack/events");
});


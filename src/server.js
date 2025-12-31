require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const { loadConfig, config } = require("./config/env");
const logger = require("./config/logger");
const requestId = require("./middleware/requestId");
const healthRouter = require("./routes/health");
const uploadRouter = require("./routes/upload");
const reviewRouter = require("./routes/review");
const submitRouter = require("./routes/submit");
const packsRouter = require("./routes/packs");
const vendorsRouter = require("./routes/vendors");
const errorHandler = require("./middleware/errorHandler");

loadConfig();

// Ensure data directories exist so uploads and DB writes do not fail.
fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();

app.use(requestId);

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("http", {
      reqId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
    });
  });
  next();
});

app.use(express.json({ limit: "2mb" }));

// Serve static UI assets
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Serve uploaded files (for n8n to fetch)
app.use("/files", express.static(config.uploadDir));

app.use("/api", uploadRouter);
app.use("/api", reviewRouter);
app.use("/api", submitRouter);
app.use("/api", packsRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/", healthRouter);

// Friendly redirect for root
app.get("/", (req, res) => res.redirect("/upload.html"));

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`UI: ${config.baseUrl}/upload.html`);
});


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
const errorHandler = require("./middleware/errorHandler");

loadConfig();

// Ensure data directories exist so uploads and DB writes do not fail.
fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();

app.use(requestId);
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
app.use("/", healthRouter);

// Friendly redirect for root
app.get("/", (req, res) => res.redirect("/upload.html"));

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Server running on ${config.baseUrl}`);
  logger.info("Upload UI available at /upload.html");
});


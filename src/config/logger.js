const LEVELS = ["debug", "info", "warn", "error"];

function log(level, message, meta) {
  const levelLabel = LEVELS.includes(level) ? level : "info";
  const base = `[${new Date().toISOString()}] [${levelLabel.toUpperCase()}] ${message}`;
  if (!meta || Object.keys(meta).length === 0) {
    // eslint-disable-next-line no-console
    console.log(base);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`${base} ${JSON.stringify(meta)}`);
}

module.exports = {
  debug: (msg, meta) => log("debug", msg, meta),
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
};


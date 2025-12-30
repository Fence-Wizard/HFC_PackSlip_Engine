const DEFAULTS = {
  retries: 3,
  minDelayMs: 200,
  factor: 2,
  maxDelayMs: 3000,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calcDelay(attempt, opts) {
  const base = opts.minDelayMs * opts.factor ** attempt;
  const jitter = Math.random() * opts.minDelayMs;
  return Math.min(base + jitter, opts.maxDelayMs);
}

async function withRetry(fn, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      const shouldRetry =
        attempt <= opts.retries &&
        (opts.shouldRetry ? opts.shouldRetry(err) : true);
      if (!shouldRetry) {
        throw err;
      }
      const delay = calcDelay(attempt, opts);
      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);
    }
  }
}

module.exports = { withRetry };


class DedupeCache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  seen(key) {
    const now = Date.now();
    this.prune(now);
    const existing = this.cache.get(key);
    if (existing && existing > now) {
      return true;
    }
    this.cache.set(key, now + this.ttlMs);
    return false;
  }

  prune(now = Date.now()) {
    for (const [key, expires] of this.cache.entries()) {
      if (expires <= now) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new DedupeCache();

module.exports = cache;


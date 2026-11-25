// Tiny TTL + LRU cache with in-flight de-duplication.
// The dataset is static, so identical filter combinations can be served from memory.
export class Cache {
  constructor({ max = 500, ttlMs = 10 * 60 * 1000 } = {}) {
    this.max = max; this.ttlMs = ttlMs;
    this.store = new Map();      // key -> { value, expires }
    this.inflight = new Map();   // key -> Promise
    this.hits = 0; this.misses = 0;
  }
  async wrap(key, loader) {
    const hit = this.store.get(key);
    if (hit && hit.expires > Date.now()) {
      this.store.delete(key); this.store.set(key, hit); // refresh LRU position
      this.hits++;
      return { value: hit.value, cached: true };
    }
    if (this.inflight.has(key)) return { value: await this.inflight.get(key), cached: true };
    this.misses++;
    const p = loader().then((value) => {
      this.store.set(key, { value, expires: Date.now() + this.ttlMs });
      if (this.store.size > this.max) this.store.delete(this.store.keys().next().value);
      return value;
    }).finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return { value: await p, cached: false };
  }
  stats() { return { size: this.store.size, hits: this.hits, misses: this.misses }; }
}

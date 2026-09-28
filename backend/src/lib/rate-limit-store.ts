import type { Request } from "express";
import rateLimit, {
  ipKeyGenerator,
  MemoryStore,
  type ClientRateLimitInfo,
  type Options,
  type Store,
} from "express-rate-limit";
import { log } from "./logger";

/** The subset of the redis client the store needs. Injectable so tests need no Redis. */
export interface RedisLike {
  isReady: boolean;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  pTTL(key: string): Promise<number>;
  pExpire(key: string, milliseconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export { readPositiveInt } from "./env-utils";

/** Client key for rate limiting. IPv6 is collapsed to its /64 prefix so a client cannot dodge the limit by rotating the low bits. */
export function ipKey(req: Request): string {
  return ipKeyGenerator(req.ip ?? "");
}

/**
 * Counts hits in Redis so the limit is shared across instances and survives restarts.
 * If Redis is not ready or fails, it falls back to process memory: a temporarily
 * less accurate limit is better than rejecting or hanging every request.
 */
export class ResilientStore implements Store {
  readonly localKeys = false;
  private readonly memory = new MemoryStore();
  private windowMs = 0;
  private isFallbackLogged = false;

  constructor(
    readonly prefix: string,
    private readonly redis: RedisLike
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.memory.init(options);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    if (this.redis.isReady) {
      try {
        const result = await this.incrementInRedis(key);
        this.isFallbackLogged = false;
        return result;
      } catch (err) {
        this.warnFallback(`error de Redis (${err instanceof Error ? err.message : String(err)})`);
      }
    } else {
      this.warnFallback("Redis no está listo");
    }
    return this.memory.increment(key);
  }

  async decrement(key: string): Promise<void> {
    if (this.redis.isReady) {
      try {
        await this.redis.decr(this.prefix + key);
        return;
      } catch (err) {
        this.warnFallback(`error de Redis (${err instanceof Error ? err.message : String(err)})`);
      }
    }
    this.memory.decrement(key);
  }

  async resetKey(key: string): Promise<void> {
    this.memory.resetKey(key);
    if (!this.redis.isReady) return;
    try {
      await this.redis.del(this.prefix + key);
    } catch (err) {
      this.warnFallback(`error de Redis (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  private async incrementInRedis(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = this.prefix + key;
    const totalHits = await this.redis.incr(redisKey);
    let ttl = await this.redis.pTTL(redisKey);
    if (ttl < 0) {
      // First hit, or the key lost its expiry (crash between INCR and PEXPIRE): arm it again
      await this.redis.pExpire(redisKey, this.windowMs);
      ttl = this.windowMs;
    }
    return { totalHits, resetTime: new Date(Date.now() + ttl) };
  }

  private warnFallback(reason: string): void {
    if (this.isFallbackLogged) return;
    this.isFallbackLogged = true;
    log("warn", `[RateLimit] ${this.prefix} ${reason}: usando memoria hasta que Redis responda`);
  }
}

export interface LimiterConfig {
  readonly name: string;
  readonly windowMs: number;
  readonly limit: number;
  readonly message: string;
  readonly keyGenerator?: (req: Request) => string;
  readonly skip?: (req: Request) => boolean;
  readonly skipSuccessfulRequests?: boolean;
}

export interface LimiterDeps {
  readonly store: Store;
  readonly validate?: boolean;
}

export function createLimiter(config: LimiterConfig, deps: LimiterDeps) {
  return rateLimit({
    identifier: config.name,
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: deps.store,
    validate: deps.validate ?? true,
    skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
    keyGenerator: config.keyGenerator ?? ipKey,
    ...(config.skip ? { skip: config.skip } : {}),
    handler: (_req, res) => {
      res.status(429).json({ error: config.message });
    },
  });
}

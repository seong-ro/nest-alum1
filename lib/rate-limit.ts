// 슬라이딩 윈도우 방식 IP rate limit — @upstash/ratelimit 미사용으로 의존성 0
// Upstash Redis만 사용해 직접 구현 (기존 클라이언트 재활용 → 추가 비용 없음)

import { Redis } from "@upstash/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

interface Config {
  limit: number;
  windowSec: number;
  keyPrefix: string;
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * 슬라이딩 윈도우 카운터.
 * 동일 IP가 windowSec 내에 limit 이상 호출하면 차단.
 *
 * @param identifier IP 또는 사용자 식별자
 * @param config { limit: 최대 횟수, windowSec: 윈도우(초), keyPrefix }
 */
export async function checkRateLimit(
  identifier: string,
  config: Config,
): Promise<RateLimitResult> {
  const redis = getRedis();
  // Redis 미설정 시 fail-open — 서비스 계속 동작 (단, warn 로깅 권장)
  if (!redis) {
    return { allowed: true, remaining: config.limit, resetSeconds: 0 };
  }

  const key = `${config.keyPrefix}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSec;

  try {
    // Sorted set: score = timestamp, member = unique id
    // 1. 윈도우 밖 항목 제거
    await redis.zremrangebyscore(key, 0, windowStart);
    // 2. 현재 카운트 확인
    const count = await redis.zcard(key);
    if (count >= config.limit) {
      const oldest = await redis.zrange<string[]>(key, 0, 0, { withScores: true });
      const oldestTs = oldest.length >= 2 ? Number(oldest[1]) : now;
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: Math.max(0, oldestTs + config.windowSec - now),
      };
    }
    // 3. 새 요청 추가
    await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    await redis.expire(key, config.windowSec * 2); // 안전 만료
    return {
      allowed: true,
      remaining: config.limit - count - 1,
      resetSeconds: config.windowSec,
    };
  } catch {
    // Redis 일시 오류 시 fail-open (가용성 우선)
    return { allowed: true, remaining: config.limit, resetSeconds: 0 };
  }
}

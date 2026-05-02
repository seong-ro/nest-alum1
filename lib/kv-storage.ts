/**
 * Upstash Redis 기반 공유 갤러리 저장소.
 *
 * 변경 이력:
 *   v1.6 (deprecated): @vercel/kv 사용 — Vercel KV 제품 폐기로 더 이상 동작 안 함
 *   v1.7 (현재):       @upstash/redis 직접 사용 — Vercel Marketplace의 Upstash 통합 권장 방식
 *
 * 환경 변수 (Vercel에서 Upstash 통합 시 자동 주입):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * 하위 호환: 기존 Vercel KV에서 자동 이관된 경우 아래 변수도 인식
 *   KV_REST_API_URL    → UPSTASH_REDIS_REST_URL 로 간주
 *   KV_REST_API_TOKEN  → UPSTASH_REDIS_REST_TOKEN 로 간주
 */

import { Redis } from "@upstash/redis";
import type { EditorialCardData, StoredCard } from "./types";

const CARDS_KEY = "nest-alum1:cards:v1";

// ---------------------------------------------------------------------------
// 환경변수 통합 — Upstash / 구 KV 변수 모두 수용
// ---------------------------------------------------------------------------

function resolveRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

// 싱글턴 (서버리스 함수 재사용 시 연결 재활용)
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  const cfg = resolveRedisConfig();
  if (!cfg) {
    throw new Error("Redis env vars missing (UPSTASH_REDIS_REST_URL/TOKEN)");
  }
  _redis = new Redis({ url: cfg.url, token: cfg.token });
  return _redis;
}

// ---------------------------------------------------------------------------
// 외부 점검용: 설정 여부만 조회 (예외 없음)
// ---------------------------------------------------------------------------

export function isKvConfigured(): boolean {
  return resolveRedisConfig() !== null;
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export async function kvLoadGallery(): Promise<StoredCard[]> {
  const redis = getRedis();
  // Upstash는 JSON을 자동 파싱 — 이미 배열이면 그대로 반환
  const raw = await redis.get<StoredCard[] | string>(CARDS_KEY);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  // 문자열로 저장된 경우 수동 파싱
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function kvUpsertCard(
  id: string,
  card: EditorialCardData,
): Promise<{ mode: "created" | "overwritten"; total: number }> {
  const redis = getRedis();
  const cards = await kvLoadGallery();
  const idx = cards.findIndex((c) => c.id === id);
  const now = new Date().toISOString();

  if (idx >= 0) {
    const existing = cards[idx];
    cards[idx] = { ...existing, card, updatedAt: now };
    await redis.set(CARDS_KEY, cards);
    return { mode: "overwritten", total: cards.length };
  }

  cards.unshift({ id, card, createdAt: now, updatedAt: now });
  await redis.set(CARDS_KEY, cards);
  return { mode: "created", total: cards.length };
}

export async function kvDeleteCard(id: string): Promise<{ total: number }> {
  const redis = getRedis();
  const cards = await kvLoadGallery();
  const filtered = cards.filter((c) => c.id !== id);
  await redis.set(CARDS_KEY, filtered);
  return { total: filtered.length };
}

export async function kvFindCard(id: string): Promise<StoredCard | null> {
  const cards = await kvLoadGallery();
  return cards.find((c) => c.id === id) ?? null;
}

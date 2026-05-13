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

/**
 * v2.46.0: 백업 데이터로부터 카드 일괄 복원.
 *
 * mode 옵션:
 *  - "merge": 백업 카드를 추가/덮어쓰기, 기존 카드는 유지
 *  - "replace": 백업 데이터로 갤러리 전체 교체 (기존 데이터 모두 사라짐)
 *
 * userEdited 카드 보호: mode=merge에서 기존 카드가 userEdited=true이고 백업이
 * userEdited가 없거나 더 오래됐으면 기존 카드 유지.
 */
export async function kvBulkRestore(
  cards: StoredCard[],
  mode: "merge" | "replace" = "merge",
): Promise<{
  before: number;
  after: number;
  added: number;
  overwritten: number;
  preserved: number;
}> {
  const redis = getRedis();
  const existing = await kvLoadGallery();
  const before = existing.length;

  if (mode === "replace") {
    await redis.set(CARDS_KEY, cards);
    return {
      before,
      after: cards.length,
      added: cards.length,
      overwritten: 0,
      preserved: 0,
    };
  }

  // merge mode
  const map = new Map<string, StoredCard>();
  for (const c of existing) map.set(c.id, c);

  let added = 0;
  let overwritten = 0;
  let preserved = 0;

  for (const incoming of cards) {
    const current = map.get(incoming.id);
    if (!current) {
      map.set(incoming.id, incoming);
      added++;
      continue;
    }
    // userEdited 보호: 기존이 userEdited면 백업이 더 최신이고 userEdited인 경우만 덮어쓰기
    if (current.card.userEdited) {
      const incomingNewer = incoming.updatedAt > current.updatedAt;
      if (incoming.card.userEdited && incomingNewer) {
        map.set(incoming.id, incoming);
        overwritten++;
      } else {
        preserved++;
      }
      continue;
    }
    // 기존이 자동 추출이면 백업으로 덮어쓰기 (백업이 보통 더 정확)
    map.set(incoming.id, incoming);
    overwritten++;
  }

  const merged = Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await redis.set(CARDS_KEY, merged);
  return {
    before,
    after: merged.length,
    added,
    overwritten,
    preserved,
  };
}

export async function kvFindCard(id: string): Promise<StoredCard | null> {
  const cards = await kvLoadGallery();
  return cards.find((c) => c.id === id) ?? null;
}

/**
 * sitemap.ts — Next.js 15 Metadata API 표준 컨벤션 (v2.23.2)
 *
 * v2.23.0/2.23.1 빌드 로그 진단:
 *   "Dynamic server usage: Route /sitemap.xml couldn't be rendered statically
 *    because it used no-store fetch ... DYNAMIC_SERVER_USAGE"
 *
 * 원인: sitemap.ts는 기본적으로 정적 prerender 시도. 우리 코드는 빌드 타임에
 * Upstash REST API를 호출하므로 정적 prerender와 충돌.
 *
 * 해결:
 * - export const dynamic = "force-dynamic" 명시
 * - export const revalidate = 60 으로 짧은 캐시 (변경 즉시 반영)
 * - try/catch로 빌드 타임 Redis 호출 실패해도 정적 entries는 반환
 *
 * Reference:
 * - https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
 * - https://nextjs.org/docs/messages/dynamic-server-error
 */

import type { MetadataRoute } from "next";
import { kvLoadGallery } from "@/lib/kv-storage";
import { getSiteUrl } from "@/lib/site-url";

// ⭐ 강제 dynamic: 빌드 타임 prerender 시도 안 함 (Redis 호출 빌드 에러 차단)
// 매 요청마다 새로 생성되지만 ISR 캐시(revalidate)로 60초 단위 갱신
export const dynamic = "force-dynamic";
export const revalidate = 60;
// Next.js 15 strict static checking 우회 (빌드 환경에서 fetch 실패 시 무시)
export const fetchCache = "force-no-store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = getSiteUrl();
  const generatedAt = new Date();

  // 정적 페이지 — 항상 포함 (빌드 타임에도 안전)
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: generatedAt,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: generatedAt,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  // 카드 페이지 — Upstash Redis에서 동적 로드
  // 빌드 타임에는 Redis가 환경변수로 연결 안 되어 있을 수 있음 → try/catch
  let latestCardUpdate = generatedAt;
  try {
    const cards = await kvLoadGallery();
    for (const card of cards) {
      const updatedAt = new Date(card.updatedAt);
      // v2.53.0: heroImage가 있으면 image sitemap 정보 포함 (Google Image Search 노출↑)
      const heroImage = card.card.heroImage;
      const entry: MetadataRoute.Sitemap[number] = {
        url: `${SITE_URL}/${card.id}`,
        lastModified: updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      };
      if (heroImage) {
        entry.images = [heroImage];
      }
      entries.push(entry);
      if (updatedAt > latestCardUpdate) {
        latestCardUpdate = updatedAt;
      }
    }
    // 메인 페이지의 lastModified를 가장 최근 카드 시각으로 업데이트
    entries[0].lastModified = latestCardUpdate;
  } catch (err) {
    // 빌드 타임 또는 Redis 일시 오류 시 — 정적 entries만 응답
    // DYNAMIC_SERVER_USAGE 에러는 로그에 표시 안 함 (정상 동작 의미)
    if (err instanceof Error && err.message?.includes("DYNAMIC_SERVER_USAGE")) {
      // 정상 — Next.js가 dynamic으로 처리. 런타임에 다시 호출됨.
      return entries;
    }
    console.warn("[sitemap] Card data unavailable, returning static entries only");
  }

  return entries;
}

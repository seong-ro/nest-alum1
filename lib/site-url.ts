/**
 * SITE_URL 결정 헬퍼 — Vercel 배포 환경 안전성 보장
 *
 * 우선순위:
 *   1. NEXT_PUBLIC_SITE_URL (사용자가 Vercel 환경변수로 명시 — 권장)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (Vercel production 도메인)
 *   3. fallback: hardcoded production URL
 *
 * VERCEL_URL은 preview·branch deployment URL까지 포함하므로 SEO에 위험.
 * sitemap·robots·OG에 preview URL이 들어가면 검색엔진이 잘못된 도메인 인덱싱.
 * 따라서 VERCEL_URL은 사용하지 않음.
 *
 * 사용처: layout.tsx (metadataBase, OG), sitemap.ts, robots.ts, [id]/page.tsx
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "https://nest-alum1.vercel.app";
}

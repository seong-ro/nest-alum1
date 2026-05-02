import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions 페이로드 한도 (URL 문자열 + 비밀번호 → 1MB 충분)
    serverActions: {
      bodySizeLimit: "1mb",
    },
    // PPR(Partial Prerendering)은 Suspense fallback의 클라이언트 컴포넌트
    // 이중 마운트 문제로 v2.4.2에서 비활성화. 안정성 우선.
  },
  // 외부 OG 이미지 도메인 허용
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    unoptimized: true,
  },
  // cheerio는 서버에서만 — 클라이언트 번들 분리
  serverExternalPackages: ["cheerio"],

  // ─────────────────────────────────────────────────────────────────────
  // 보안 헤더 + sitemap/robots 전용 헤더
  // ─────────────────────────────────────────────────────────────────────
  async headers() {
    return [
      // sitemap.xml 전용 — Vercel Analytics 자동 주입 명시 차단
      // (Route Handler에서 헤더 설정해도 Vercel platform이 일부 케이스에서 덮어쓸 수 있어 이중 방어)
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=10, stale-while-revalidate=60" },
        ],
      },
      // robots.txt 전용
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      // llms.txt 전용 — 2026 GEO 표준 (Markdown 형식, AI 크롤러 친화)
      {
        source: "/llms.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" },
          // AI 크롤러가 콘텐츠 무료 사용 가능 명시
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          // XSS 보호 — 구형 브라우저용
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // MIME 스니핑 차단
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 사이트 iframe 임베드 차단
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Referrer 정책 — 외부로 전체 URL 노출 금지
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HTTPS 강제 (1년 + preload 대상)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // 권한 정책 — 위치/카메라/마이크/USB 등 자동 차단
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

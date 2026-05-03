/**
 * Sitemap.xml — Route Handler 직접 작성 (v2.13.6 강화)
 *
 * v2.13.5에서도 <script/> 자동 주입 발생 가능성 시 진단을 위한 강화:
 * - XML 응답에 버전 마커 주석 (배포 확인 즉시 가능)
 * - 빌드 timestamp (응답 시점 확인)
 * - Cache-Control 매우 짧게 (10초) → 변경사항 빠른 반영
 * - 진단용 헤더 (X-Sitemap-Version 등)
 *
 * Next.js Metadata API의 sitemap.ts 대신 Route Handler를 사용:
 * - Metadata API 응답은 Vercel Analytics/Speed Insights 자동 스크립트 주입 위험
 * - Route Handler는 응답 본문을 100% 제어 가능
 * - Content-Type을 명시적으로 application/xml로 보장
 */

import { kvLoadGallery } from "@/lib/kv-storage";
import { getSiteUrl } from "@/lib/site-url";

// 빌드 타임이 아닌 요청 시점에 매번 생성
export const dynamic = "force-dynamic";
export const revalidate = 10; // 10초 캐시 (빠른 갱신, 디버깅 친화)

const SITEMAP_VERSION = "v2.13.7";

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function entryToXml(entry: SitemapEntry): string {
  return [
    "  <url>",
    `    <loc>${xmlEscape(entry.loc)}</loc>`,
    `    <lastmod>${entry.lastmod}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
    "  </url>",
  ].join("\n");
}

export async function GET(): Promise<Response> {
  const SITE_URL = getSiteUrl();
  const now = new Date();
  const generatedAt = now.toISOString();

  // 정적 페이지 — 항상 포함
  const entries: SitemapEntry[] = [
    {
      loc: SITE_URL,
      lastmod: generatedAt,
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${SITE_URL}/about`,
      lastmod: generatedAt,
      changefreq: "monthly",
      priority: 0.9,
    },
  ];

  let latestCardUpdate = now;
  let cardCount = 0;
  let fetchError: string | null = null;

  try {
    const gallery = await kvLoadGallery();
    cardCount = gallery.length;

    for (const stored of gallery) {
      const updatedAt = stored.updatedAt ? new Date(stored.updatedAt) : now;
      const validDate = !isNaN(updatedAt.getTime()) ? updatedAt : now;
      entries.push({
        loc: `${SITE_URL}/${stored.id}`,
        lastmod: validDate.toISOString(),
        changefreq: "weekly",
        priority: 0.8,
      });
    }

    if (gallery.length > 0) {
      const latest = gallery
        .map((s) => {
          const t = new Date(s.updatedAt).getTime();
          return isNaN(t) ? 0 : t;
        })
        .reduce((max, t) => (t > max ? t : max), 0);
      if (latest > 0) latestCardUpdate = new Date(latest);
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    console.error("[sitemap] Redis fetch failed:", err);
  }

  entries[0].lastmod = latestCardUpdate.toISOString();

  // XML 생성 — 깨끗한 표준 sitemap 0.9
  // 버전 마커 주석은 <urlset> 바로 앞에 (XML 표준 허용 위치)
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Sitemap ${SITEMAP_VERSION} | generated=${generatedAt} | cards=${cardCount}${fetchError ? ` | fetch_error=${xmlEscape(fetchError)}` : ""} -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(entryToXml).join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // 짧은 캐시 — 변경사항 빠르게 반영
      "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=60",
      // Vercel Analytics 자동 주입 차단 hint
      "X-Robots-Tag": "noindex",
      // 진단용 헤더 — curl -I로 확인 가능
      "X-Sitemap-Version": SITEMAP_VERSION,
      "X-Sitemap-Generated": generatedAt,
      "X-Sitemap-Cards": String(cardCount),
    },
  });
}

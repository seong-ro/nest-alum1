/**
 * robots.txt — Route Handler 직접 작성
 *
 * sitemap.xml과 같은 이유로 Route Handler 사용:
 * - 응답 본문 100% 제어 (Vercel 자동 주입 차단)
 * - Content-Type을 text/plain으로 명시
 *
 * 2026 SEO + GEO 베스트 프랙티스:
 * - 일반 검색엔진 봇 모두 허용
 * - AI 크롤러 명시 허용 (ChatGPT·Claude·Perplexity·Gemini 등)
 * - /api/, /_next/ 만 차단
 */

import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1시간 (robots는 자주 안 바뀜)

interface RobotRule {
  userAgent: string;
  allow?: string;
  disallow?: string[];
  comment?: string;
}

const RULES: RobotRule[] = [
  {
    userAgent: "*",
    allow: "/",
    disallow: ["/api/", "/_next/"],
    comment: "일반 검색엔진",
  },
  // AI 크롤러 — 학습 + 실시간 검색 모두 명시 허용
  { userAgent: "GPTBot", allow: "/", disallow: ["/api/"], comment: "OpenAI ChatGPT" },
  { userAgent: "ChatGPT-User", allow: "/", disallow: ["/api/"], comment: "ChatGPT 실시간 브라우징" },
  { userAgent: "ClaudeBot", allow: "/", disallow: ["/api/"], comment: "Anthropic Claude" },
  { userAgent: "anthropic-ai", allow: "/", disallow: ["/api/"], comment: "Anthropic 변형" },
  { userAgent: "PerplexityBot", allow: "/", disallow: ["/api/"], comment: "Perplexity AI" },
  { userAgent: "Google-Extended", allow: "/", disallow: ["/api/"], comment: "Google Bard / Gemini" },
  { userAgent: "CCBot", allow: "/", disallow: ["/api/"], comment: "Common Crawl (다수 LLM 학습)" },
  { userAgent: "Applebot-Extended", allow: "/", disallow: ["/api/"], comment: "Apple Intelligence" },
  { userAgent: "Bytespider", allow: "/", disallow: ["/api/"], comment: "ByteDance/TikTok" },
];

function ruleToText(rule: RobotRule): string {
  const lines: string[] = [];
  if (rule.comment) lines.push(`# ${rule.comment}`);
  lines.push(`User-agent: ${rule.userAgent}`);
  if (rule.allow) lines.push(`Allow: ${rule.allow}`);
  if (rule.disallow) {
    for (const path of rule.disallow) {
      lines.push(`Disallow: ${path}`);
    }
  }
  return lines.join("\n");
}

export async function GET(): Promise<Response> {
  const SITE_URL = getSiteUrl();

  const text = [
    RULES.map(ruleToText).join("\n\n"),
    "",
    `# 2026 GEO 표준 — AI 친화 콘텐츠 맵 (Markdown 형식)`,
    `# robots.txt는 "어디 가지 마라" / llms.txt는 "여기에 가치 있다"`,
    `# Anthropic, Cursor, Mintlify, Vercel 공식 채택 표준`,
    `# 사이트의 모든 카드 + 메타데이터 + AI 사용 안내가 포함됨`,
    `# 참고: ${SITE_URL}/llms.txt`,
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${SITE_URL}`,
  ].join("\n");

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

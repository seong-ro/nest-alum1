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
    disallow: ["/api/", "/_next/", "/admin"],
    comment: "일반 검색엔진 + 모든 봇 (기본)",
  },

  // 한국 검색엔진 — 명시 허용 (네이버 SEO 가이드 권장)
  { userAgent: "Yeti", allow: "/", disallow: ["/api/", "/admin"], comment: "Naver — 한국 검색 핵심" },
  { userAgent: "Naverbot", allow: "/", disallow: ["/api/", "/admin"], comment: "Naver 변형" },
  { userAgent: "Daumoa", allow: "/", disallow: ["/api/", "/admin"], comment: "Daum/Kakao" },

  // 글로벌 검색엔진 — 명시 허용
  { userAgent: "Googlebot", allow: "/", disallow: ["/api/", "/admin"], comment: "Google" },
  { userAgent: "Googlebot-Image", allow: "/", disallow: ["/api/", "/admin"], comment: "Google 이미지" },
  { userAgent: "bingbot", allow: "/", disallow: ["/api/", "/admin"], comment: "Microsoft Bing (ChatGPT의 retrieval 백엔드)" },
  { userAgent: "Yandex", allow: "/", disallow: ["/api/", "/admin"], comment: "Yandex" },
  { userAgent: "DuckDuckBot", allow: "/", disallow: ["/api/", "/admin"], comment: "DuckDuckGo" },
  { userAgent: "Slurp", allow: "/", disallow: ["/api/", "/admin"], comment: "Yahoo" },
  { userAgent: "Seznam", allow: "/", disallow: ["/api/", "/admin"], comment: "Seznam.cz" },

  // AI 크롤러 — 학습 + 실시간 검색 모두 명시 허용 (2026년 Googlebot의 3.6배 트래픽)
  { userAgent: "GPTBot", allow: "/", disallow: ["/api/", "/admin"], comment: "OpenAI ChatGPT 학습" },
  { userAgent: "ChatGPT-User", allow: "/", disallow: ["/api/", "/admin"], comment: "ChatGPT 실시간 브라우징" },
  { userAgent: "OAI-SearchBot", allow: "/", disallow: ["/api/", "/admin"], comment: "OpenAI SearchGPT 인덱싱" },
  { userAgent: "ClaudeBot", allow: "/", disallow: ["/api/", "/admin"], comment: "Anthropic Claude" },
  { userAgent: "claude-web", allow: "/", disallow: ["/api/", "/admin"], comment: "Claude 변형" },
  { userAgent: "anthropic-ai", allow: "/", disallow: ["/api/", "/admin"], comment: "Anthropic 변형" },
  { userAgent: "PerplexityBot", allow: "/", disallow: ["/api/", "/admin"], comment: "Perplexity AI" },
  { userAgent: "Perplexity-User", allow: "/", disallow: ["/api/", "/admin"], comment: "Perplexity 사용자 검색" },
  { userAgent: "Google-Extended", allow: "/", disallow: ["/api/", "/admin"], comment: "Google Bard / Gemini" },
  { userAgent: "GeminiBot", allow: "/", disallow: ["/api/", "/admin"], comment: "Gemini 직접 크롤" },
  { userAgent: "CCBot", allow: "/", disallow: ["/api/", "/admin"], comment: "Common Crawl (다수 LLM 학습)" },
  { userAgent: "Applebot", allow: "/", disallow: ["/api/", "/admin"], comment: "Apple Search" },
  { userAgent: "Applebot-Extended", allow: "/", disallow: ["/api/", "/admin"], comment: "Apple Intelligence" },
  { userAgent: "Bytespider", allow: "/", disallow: ["/api/", "/admin"], comment: "ByteDance/TikTok" },
  { userAgent: "PetalBot", allow: "/", disallow: ["/api/", "/admin"], comment: "Huawei Petal Search" },
  { userAgent: "Cohere-AI", allow: "/", disallow: ["/api/", "/admin"], comment: "Cohere LLM" },
  { userAgent: "MistralAI-User", allow: "/", disallow: ["/api/", "/admin"], comment: "Mistral AI" },
  { userAgent: "Amazonbot", allow: "/", disallow: ["/api/", "/admin"], comment: "Amazon Alexa" },
  { userAgent: "FacebookExternalHit", allow: "/", disallow: ["/api/", "/admin"], comment: "Facebook OG 미리보기" },
  { userAgent: "LinkedInBot", allow: "/", disallow: ["/api/", "/admin"], comment: "LinkedIn 미리보기" },
  { userAgent: "Twitterbot", allow: "/", disallow: ["/api/", "/admin"], comment: "X/Twitter 카드" },
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

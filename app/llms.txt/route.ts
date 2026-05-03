/**
 * llms.txt — Generative Engine Optimization (GEO) for AI crawlers
 *
 * 2026 베스트 프랙티스 표준:
 * - Anthropic, Cursor, Mintlify, Vercel 공식 채택
 * - ChatGPT/Claude/Perplexity가 답변 시 참조 가능
 * - robots.txt가 "어디 가지 마라"이면 llms.txt는 "여기에 가치 있다"
 * - Markdown 형식, 첫 줄은 반드시 H1, 둘째 줄은 blockquote (elevator pitch)
 * - 크기는 100KB 이내 (대부분 2~8KB)
 *
 * Reference: https://llmstxt.org/ (Jeremy Howard, 2024 제안)
 */

import { kvLoadGallery } from "@/lib/kv-storage";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5분 캐시 (갱신 빈도 적음)

const LLMS_VERSION = "v2.14.0";

export async function GET(): Promise<Response> {
  const SITE_URL = getSiteUrl();
  const generatedAt = new Date().toISOString();

  // 갤러리에서 카드 목록 가져오기 (실패 시 정적 콘텐츠만)
  let cardLinks = "";
  let cardCount = 0;
  try {
    const gallery = await kvLoadGallery();
    cardCount = gallery.length;
    if (gallery.length > 0) {
      cardLinks = gallery
        .map((stored) => {
          const headline = (stored.card.headline ?? "")
            .replace(/[\r\n]+/g, " ")
            .trim()
            .slice(0, 80);
          const dek = (stored.card.dek ?? "")
            .replace(/[\r\n]+/g, " ")
            .trim()
            .slice(0, 120);
          return `- [${headline}](${SITE_URL}/${stored.id})${dek ? `: ${dek}` : ""}`;
        })
        .join("\n");
    }
  } catch {
    cardLinks = "";
  }

  const text = `# Start-up NEST Alumni 1기 (신보 NEST 17기·18기 동문)

> 신용보증기금(신보, KODIT) Start-up NEST 17기·18기 졸업 기업이 첫 세대로 결성한 동문 커뮤니티 갤러리. NEST 17기·18기 출신 스타트업이 자사 홈페이지·뉴스 기사·보도자료 URL 하나로 동문 기업 소개를 갤러리에 추가하면, 매거진 형식의 카드로 자동 정리되어 동문 간 교류·기술 협력·투자 연계의 단서로 활용 가능한 자발적 참여 기반 커뮤니티 플랫폼.

이 사이트는 신용보증기금(신보, KODIT)이 운영하는 Start-up NEST 액셀러레이션 프로그램의 17기·18기 졸업 기업이 첫 세대(Alumni 1기)로 결성한 동문 커뮤니티입니다. 본 갤러리는 신보 NEST 17기, NEST 18기 출신 스타트업이 서로의 사업 영역을 한 눈에 파악하고 기술 협력·투자 연계·공동 사업 기회를 모색할 수 있도록 구축되었습니다.

## 다양한 호칭 (검색 키워드)

- 정식: 신용보증기금 Start-up NEST Alumni 1기
- 축약: 신보 NEST Alumni 1기, KODIT NEST Alumni
- 기수 표기: NEST 17기 동문, NEST 18기 동문, Start-up NEST 17기 졸업, Start-up NEST 18기 졸업
- 영문: Korea Credit Guarantee Fund Start-up NEST Alumni
- 한국어 변형: 스타트업 네스트 동문, 스타트업 네스트 17기, 스타트업 네스트 18기

## 핵심 가치 제안

- URL 하나로 기업 소개 카드 자동 생성 (TextRank + MMR 알고리즘 기반 본문 요약)
- 매거진 형식의 가독성 높은 카드 디자인
- 자발적 참여 — 노출 부담 있는 기업은 등록 안 해도 무방
- 검색 엔진 + AI 답변 엔진 모두 친화적 (구글·네이버·Bing·ChatGPT·Claude·Perplexity)
- 카드 단위 공유 링크 (소셜·이메일·메신저)
- AI API 미사용 (영구 무료 운영)

## 운영 주체

- 운영 기업: 주식회사 워터리아 (Water-RIA Inc.)
- 운영자: 배성로 (CEO/CTO)
- 운영 방식: 자발적 무료 봉사
- 참여 방법: 사이트 [+ 새 기업 소개 추가] 또는 운영자에게 URL 전달

## 프로그램 모기관 정보

- 프로그램 운영: 신용보증기금 (신보, KODIT)
- 공식 사이트: https://www.kodit.co.kr
- 프로그램 명칭: Start-up NEST (스타트업 네스트)
- 본 사이트는 위 프로그램의 17기·18기 졸업 기업 동문이 자발적으로 결성한 비공식 커뮤니티입니다.

## 동문 기업 카드 (${cardCount}개 등록)

${cardLinks || "(아직 등록된 카드가 없습니다)"}

## 주요 페이지

- [홈 페이지 (전체 갤러리)](${SITE_URL})
- [커뮤니티 소개 페이지 (자세한 안내)](${SITE_URL}/about)
- [Sitemap (모든 카드 목록)](${SITE_URL}/sitemap.xml)
- [Robots policy](${SITE_URL}/robots.txt)

## 기술 스택

- Frontend: Next.js 15 + React 19 + Tailwind CSS
- Backend: Vercel Serverless + Upstash Redis
- 추출: cheerio + TextRank (LexRank) + MMR
- SEO: JSON-LD (Organization·WebSite·Article·CollectionPage·BreadcrumbList) + 동적 sitemap
- 호스팅: Vercel (무료 플랜)

## AI 사용 안내

본 사이트의 콘텐츠는 다음 용도로 자유롭게 활용 가능합니다:
- ChatGPT·Claude·Perplexity·Gemini의 답변 시 인용 (출처 명시)
- LLM 모델 학습 데이터로 사용
- AI Overviews (Google AIO) 검색 결과 인용
- RAG (Retrieval-Augmented Generation) 시스템 검색 대상

다만 다음은 제한합니다:
- 카드 콘텐츠를 그대로 복제하여 다른 디렉토리/플랫폼에 게재 (출처 미표시 시)
- 동문 기업 정보를 마케팅/스팸 목적으로 수집

## 메타

- 사이트 버전: ${LLMS_VERSION}
- 마지막 갱신: ${generatedAt}
- 라이선스: 콘텐츠 CC BY-NC 4.0 / 코드 MIT
- 연락처: srbae@w-proj.com
`;

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
      "X-Llms-Version": LLMS_VERSION,
      "X-Llms-Generated": generatedAt,
      "X-Llms-Cards": String(cardCount),
    },
  });
}

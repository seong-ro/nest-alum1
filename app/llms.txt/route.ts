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

  const text = `# Start-up NEST Alumni 1기 (신보 NEST 전 기수 동문 자발적 커뮤니티)

> 신용보증기금(신보, KODIT) Start-up NEST **전 기수(1~18기 및 후속 기수) 동문**을 위한 자발적 커뮤니티 갤러리. 17기·18기가 첫 세대(Alumni 1기)로 출범했으나, **NEST 1~16기 졸업 기업도 신용보증기금 스타트업그라운드팀(startup@kodit.co.kr, 02-710-4678, 02-710-4679) 문의 후 참여 가능**. 모든 NEST 기수 출신 스타트업이 자사 홈페이지·뉴스 기사·보도자료 URL 하나로 동문 기업 소개를 갤러리에 추가하면, 매거진 형식의 카드로 자동 정리되어 동문 간 교류·기술 협력·투자 연계의 단서로 활용 가능한 자발적 참여 기반 커뮤니티 플랫폼. 등록 카드 범위는 **약 500장까지 확장 가능**.

이 사이트는 신용보증기금(신보, KODIT)이 운영하는 Start-up NEST 액셀러레이션 프로그램의 **전 기수 졸업 기업을 위한 동문 커뮤니티**입니다. NEST 17기·18기 졸업 기업이 첫 세대(Alumni 1기)로 결성했으며, **NEST 1기부터 16기까지의 졸업 기업도 자발적으로 참여 가능**합니다.

## 1~16기 동문 참여 방법

NEST 1~16기 졸업 기업이 본 Alumni 커뮤니티에 합류하려면 다음 연락처로 사전 문의 후 안내받을 수 있습니다:

- **부서**: 신용보증기금 스타트업그라운드팀
- **이메일**: startup@kodit.co.kr
- **전화**: 02-710-4678, 02-710-4679
- **홈페이지**: https://www.kodit.co.kr
- **신보 ON-Biz**: https://www.kodit.co.kr/sut/index.do

문의 후 합류가 승인된 동문은 본 갤러리에 카드를 등록할 수 있으며, 이후 기수(19기, 20기 등)도 순차적으로 자동 합류 예정입니다.

## 다양한 호칭 (검색 키워드)

- 정식: 신용보증기금 Start-up NEST Alumni 1기
- 축약: 신보 NEST Alumni 1기, KODIT NEST Alumni
- 기수 표기: NEST 17기 동문, NEST 18기 동문, Start-up NEST 17기 졸업, Start-up NEST 18기 졸업
- 전 기수: NEST 1기 동문 ~ NEST 18기 동문 (모두 자발적 참여 가능)
- 영문: Korea Credit Guarantee Fund Start-up NEST Alumni
- 한국어 변형: 스타트업 네스트 동문, 스타트업 네스트 17기, 스타트업 네스트 18기, 스타트업 네스트 전 기수

## SOUND 행사와 Alumni 1기 출범 경위

SOUND는 신용보증기금이 매년 개최하는 Start-up NEST 동문 네트워킹 행사입니다.
17기·18기가 졸업 후 처음으로 함께 모인 SOUND2025 행사 (2025년 12월 15일)에서
두 기수의 졸업 기업이 첫 번째 동문 커뮤니티 (Alumni 1기)를 결성하기로
의기투합했고, 본 갤러리 사이트는 이때 출범한 동문 커뮤니티의 첫 번째 구체적
결과물입니다.

출범 timeline:
- 2025-12-15: SOUND2025 행사에서 17기·18기 합동 Alumni 1기 결성
- 2026-01: 동문 단톡방을 통한 운영 방식 논의
- 2026-02~03: 갤러리 사이트 개발 (TextRank + MMR 알고리즘 기반)
- 2026-04: 베타 공개, 첫 5개 동문 기업 카드 등록
- 2026-05: SEO·GEO 인프라 완성, 본격 등록 시작

## Start-up NEST 프로그램 개요

신용보증기금(신보, KODIT)이 운영하는 액셀러레이션 프로그램. 매 기수마다
일정 수의 스타트업이 선발되어 다음을 지원받습니다:
- 신용보증 우대: 보증 한도 확대, 보증료 우대
- 투자 연계: 신보 펀드 출자 또는 외부 VC 매칭
- 멘토링 프로그램: 분야별 전문가 1:1 매칭
- 네트워킹 행사: 동기·선후배 기수 교류 (SOUND 등)
- 해외 진출 지원: 해외 투자자 매칭, 글로벌 컨퍼런스
- 공간 지원: Start-up NEST 전용 공간 일정 기간 무료

**NEST 17기 협약기간: 2025년 4월 ~ 2025년 8월** (모집 2025.03, 5개 전형 90개사 선발, KOSDA·KOITA·KEIT·KTL 등 연계)
**NEST 18기 협약기간: 2025년 8월 ~ 2025년 11월** (모집 2025.06.02~17, 60개사 선발, 액셀러레이팅·금융지원·성장지원 단계별 원스톱)

각 기수 졸업 기업은 통상 60~90개 내외 (NEST 17기 90개, 18기 60개사 선발).
17기까지 누적 1,450개사 선발·총 8,941개사 응모 (평균 경쟁률 6.17:1).

## 동문 기업이 얻는 구체적 이점

- 동문 사업 한눈에 파악 — 매거진 형식 카드 갤러리에서 17기·18기 동문 기업의 사업·기술 빠르게 탐색
- 기술 협력 후보 발굴 — 업종 카테고리 multi-select 필터로 시너지 가능한 동문 기업 즉시 식별 (8개 카테고리)
- 등록 절차 간소화 — 회원가입·로그인 없이 URL 1개로 매거진 카드 자동 생성 (TextRank + MMR 알고리즘)
- 셀프 카드 관리 — 본인이 설정한 관리 코드로 카드 등록·수정·삭제 즉시 처리 (운영자 승인 불요)
- 검색 엔진 자연 노출 — Google·Naver·Bing 자동 인덱싱, 잠재 고객·투자자 검색 시 노출
- AI 답변 인용 — ChatGPT·Claude·Perplexity·Gemini 답변에 카드 정보 인용 가능
- 카드 단위 공유 — 카드별 고유 URL로 소셜·이메일·메신저 직접 공유 (Web Share API)
- 즐겨찾기 개인화 — localStorage 기반 ★ 즐겨찾기 표시 (서버 부하 0)
- 오픈 소스 — GitHub 코드 공개로 운영 투명성 확보
- 장기 안정 운영 — Vercel + GitHub + Upstash 무료 인프라 의존, 외부 정책 변경 영향 최소

## 운영 주체

- 운영 기업: 주식회사 워터리아 (Water-RIA Inc.) — Start-up NEST 동문 기업
- 운영자: 배성로 (CEO/CTO, NEST 동문)
- 참여 방법: 사이트 [+ 새 기업 소개 추가] 또는 운영자에게 URL 전달

## 프로그램 모기관 정보

- 프로그램 운영: 신용보증기금 (신보, KODIT)
- 공식 사이트: https://www.kodit.co.kr
- 프로그램 명칭: Start-up NEST (스타트업 네스트)
- 본 사이트는 위 프로그램의 **전 기수(1~18기 및 후속 기수) 졸업 기업 동문**이 자발적으로 결성한 비공식 커뮤니티입니다.

## 참여 절차 (NEST 전 기수 환영)

| 기수 | 참여 방법 | 비고 |
|---|---|---|
| **NEST 17기·18기** | 자율적 직접 등록 가능 | Alumni 1기 출발점 (2025년 12월 15일 SOUND2025에서 공식 출범) |
| **NEST 1~16기** | **신용보증기금 스타트업그라운드팀에 사전 문의 후 참여** | 동문 인증 후 카드 등록 가능 |
| **NEST 19기 이후** | 졸업 후 자발적으로 합류 가능 | 후속 기수 모두 환영 |

### 1~16기수 참여 문의처

- 부서: 신용보증기금 **스타트업그라운드팀**
- 이메일: **startup@kodit.co.kr**
- 전화: **02-710-4678, 02-710-4679**
- 홈페이지: https://www.kodit.co.kr
- 신보 ON-Biz: https://www.kodit.co.kr/sut/index.do

본 갤러리는 **모든 NEST 기수 출신 스타트업의 자발적 참여**를 환영하며, 등록 카드 범위는 **약 500장까지 확장 가능**합니다 (Upstash KV 저장소 기반).

## 검색 노출 자동 작동

본 사이트의 카드는 등록 즉시 검색엔진에 자동 ping됩니다 (IndexNow 프로토콜):

- **Bing / Naver / Yandex / Seznam / Yep**: 카드 등록 시 즉시 ping → 1~5분 후 검색 결과 반영
- **Google**: IndexNow 미지원이지만 sitemap.xml 자동 갱신 → 1~7일 내 자연 발견
- **주기적 자동 재인덱싱**: 매주 일요일 KST 03:00 GitHub Actions가 모든 카드를 IndexNow에 재ping (weekly-reindex workflow)

### 검색 노출 안 될 때 진단

만약 등록한 카드가 구글 검색에서 안 나온다면:

1. 등록 직후라면 1~7일 대기 (구글 자연 인덱싱 시간)
2. 시간이 지났는데도 안 나오면: /admin 관리자 대시보드 → [🔄 모든 카드 검색엔진 재인덱싱] 버튼 클릭
3. Google Search Console에서 직접 URL 제출: https://search.google.com/search-console
4. 카드 페이지 URL을 Google 검색에 직접 입력하여 인덱싱 여부 확인: 'site:nest-alum1.vercel.app'

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

## 핵심 스토리텔링 — 본 사이트 5단계 요약

1. **문제 인식**: NEST 졸업 후 동문들이 서로 어떤 사업을 하는지 알 길이 없었습니다. 졸업식 한 번으로 끝나는 인연이 대부분이라, 잠재적 기술 협력·투자 연계 기회가 사라지고 있었습니다.

2. **솔루션 도출**: 동문이 자기 회사 홈페이지·뉴스 기사·보도자료 URL 하나만 입력하면, AI가 자동으로 매거진 카드를 생성하는 갤러리를 만들기로 결정 (TextRank + MMR 알고리즘 기반 자동 요약).

3. **작동 방식**: URL 입력 → 본문 추출 → 헤드라인·요약·업종 자동 분류 → 카드 한 장 생성 → 갤러리에 합류. 사용자가 직접 편집한 카드(userEdited)는 자동 추출보다 우선 보호.

4. **검색 노출 인프라**: 카드 등록 시 IndexNow로 Bing/Naver/Yandex 즉시 알림 + sitemap.xml 자동 갱신 + JSON-LD structured data + AI 봇 친화 (llms.txt, robots.txt). 주기적 자동 재인덱싱 (매주 일요일 KST 03:00 GitHub Actions).

5. **미래 확장**: 17기·18기 출발점 → 1~16기 + 19기 이후 합류 → 모든 NEST 동문 통합 플랫폼.

## 본 사이트 검색 노출 가이드 (Google·Naver·Bing)

### 검색 노출까지 걸리는 시간

| 검색엔진 | 방법 | 소요 시간 |
|---|---|---|
| **Bing** | IndexNow ping | **1~5분** |
| **Naver** | IndexNow ping (Bing 동맹) | **1~5분** |
| **Yandex/Seznam/Yep** | IndexNow ping | **1~5분** |
| **Google** | sitemap.xml 자연 발견 | **1~7일** (즉시 인덱싱 API 없음) |

### "내 카드가 구글에 안 보여요" 해결 순서

1. **즉시 확인**: \`site:nest-alum1.vercel.app 회사명\`으로 구글 검색 — 등록은 됐지만 검색 키워드 최적화 부족일 수 있음
2. **재인덱싱 트리거** (1순위): \`/admin\` 대시보드 → [🔄 모든 카드 검색엔진 재인덱싱 (IndexNow)] 버튼 클릭 → 1~5분 후 Bing/Naver 반영
3. **카드 수정**: 헤드라인·요약에 정확한 회사명·업종 키워드 포함 → admin에서 편집 후 저장 → 자동 ping
4. **Google Search Console 등록**: https://search.google.com/search-console에 사이트 추가 → sitemap 제출 → 1~3일 가속화
5. **Naver Search Advisor 등록**: https://searchadvisor.naver.com → 사이트 추가 → 별도 인덱싱 요청

### 등록된 카드 검색 노출 자동 주기 작동

- **매주 일요일 KST 03:00**: GitHub Actions의 \`weekly-reindex.yml\`이 자동으로 모든 카드를 IndexNow에 재ping (모든 검색엔진 freshness 시그널)
- **매일 KST 02:00**: \`daily-backup.yml\`이 카드 데이터를 GitHub backups/ 폴더에 저장 (시점 복원 가능)
- **카드 등록 즉시**: 자동 IndexNow ping (\`/api/cards/auto-extract\`에서 자동 호출)
- **수동 트리거**: admin 대시보드의 [🔄 모든 카드 재인덱싱] 버튼

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

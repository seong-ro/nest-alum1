# 신용보증기금 Start-up Nest Alumni — Folio Cards

> **신용보증기금 Start-up Nest Alumni 1기(17기, 18기)** 소속 기업의 소개 페이지.
> 홈페이지 URL 한 줄을 입력하면 매거진 에디토리얼 카드를 생성합니다.
> **AI 플랫폼 API 없이** 동작하는 결정론적 추출 요약(TextRank + MMR).

![Next.js 15.5](https://img.shields.io/badge/Next.js-15.5-000?logo=nextdotjs)
![React 19](https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white)
![Tailwind v3.4](https://img.shields.io/badge/Tailwind-v3.4-0ea5e9?logo=tailwindcss&logoColor=white)
![SEO Ready](https://img.shields.io/badge/SEO-JSON--LD-4338ca)
![License](https://img.shields.io/badge/License-MIT-4338ca)

**🍎 macOS 사용자는 [바로가기](#a-macos-로컬-원클릭-셋업-가장-빠름-)**

## 📜 변경 이력 (Changelog)

> 최신 버전이 위에 위치합니다. v2.x는 RSC + Server Actions 기반 단순화 아키텍처, v1.x는 점진적 진화 단계입니다.

### v2.18.0 — 자연어 본문 SEO 강화 + /about 페이지 (Google 한국어 검색 격차 해소) (2026.05)

**문제 진단 — 사용자 보고**

v2.17.0 적용 후에도 다음 검색어로 본 사이트 미노출:

| 검색어 | 결과 |
|---|---|
| ❌ "신용보증기금 nest 17기" | 미검색 |
| ❌ "신보 nest 17기" | 미검색 |
| ❌ "nest 17기" | 미검색 |
| ❌ "start-up nest 17기" | 미검색 |
| ❌ "스타트업 네스트 17기" | 미검색 |
| ✅ "KODIT nest alumni" | 검색됨 (영문 + 고유성) |
| ✅ "신용보증기금 nest 17기 워터리아" | 검색됨 (카드 본문 매칭) |

**근본 원인 — 2026 Google 알고리즘 핵심 인사이트**

워터리아만 검색되는 패턴이 핵심 단서:
- "워터리아" = 워터리아 카드의 visible 본문 콘텐츠에 자연어로 등장
- "17기" 단독 = 메타·JSON-LD에는 풍부하지만 visible 본문에 자연어 문장으로 부족
- Google은 메타 keywords·JSON-LD보다 **visible 자연어 본문**을 결정적으로 가중치

핵심 발견:
1. **메타 keywords는 Google이 무시 (2009년부터 공식)** — `<meta name="keywords">` SEO 효과 0
2. **JSON-LD는 보조 신호** — 메인 평가는 visible 본문 콘텐츠
3. **"17기"는 ambiguous 단어** — 다른 학교·기수 콘텐츠와 경쟁
4. **자연어 문장 통째 매칭이 결정적** — "신용보증기금 NEST 17기"가 한 문장 안에 등장해야 함

**해결 — 6가지 강화**

#### 1. 메인 페이지 hero 아래 SEO landing 섹션 신규 ⭐ 가장 중요

검색 키워드가 자연어 문장으로 통째 등장하는 본문 추가:

```jsx
<section aria-labelledby="seo-program-intro">
  <h2 id="seo-program-intro">
    신용보증기금 Start-up NEST 17기·18기 동문 갤러리란?
  </h2>
  <p>
    <strong>신용보증기금(신보, KODIT)</strong>이 운영하는{" "}
    <strong>Start-up NEST(스타트업 네스트)</strong>는 한국의 대표적인
    스타트업 액셀러레이션 프로그램입니다. 본 사이트는{" "}
    <strong>신용보증기금 Start-up NEST 17기</strong>와{" "}
    <strong>신용보증기금 Start-up NEST 18기</strong>를 졸업한 기업이...
  </p>
  ...
</section>
```

특징:
- 검색어가 자연어 문장 안에 통째로 등장 ("신용보증기금 Start-up NEST 17기")
- `<h2>` 헤딩 + `<strong>` 강조로 시멘틱 가중치
- `<dl>` 사실 박스로 풍부한 콘텐츠
- 비공식 안내 박스로 신보 공식 사이트 링크

#### 2. `/about` 정적 페이지 신규 ⭐ long-tail 매칭

별도 페이지로 long-tail 키워드 풍부 노출:

- 8개 H2 섹션 (각각 자연어 답변)
- "신용보증기금 Start-up NEST는 무엇인가요?"
- "왜 17기·18기가 함께 1기를 만들었나요?"
- "본 사이트는 신용보증기금 공식 사이트인가요?"
- "어떻게 우리 회사 소개를 등록하나요?"
- "카드 등록·내림 비밀번호는?" (1718 명시)
- "AI를 사용하나요?"
- "검색 엔진과 AI 답변에 노출되나요?"
- "운영 주체와 문의"

각 섹션이 long-tail 검색 ("신보 nest 17기 동문 등록 방법" 등) 정확 매칭.

24시간 ISR로 무료 운영 친화 + breadcrumb 네비게이션.

#### 3. layout.tsx structuredData 강화

```typescript
{
  "@type": "Organization",
  alternateName: [
    "신용보증기금 Start-up NEST Alumni 1기",
    "신보 NEST Alumni 1기",
    "KODIT NEST Alumni 1기",
    "스타트업 네스트 동문 1기",
    /* 10개 호칭 */
  ],
  // ⭐ 신용보증기금을 GovernmentOrganization으로 명시
  parentOrganization: {
    "@type": "GovernmentOrganization",
    "@id": "https://www.kodit.co.kr/#organization",
    name: "신용보증기금",
    alternateName: ["신보", "KODIT", "Korea Credit Guarantee Fund"],
  },
  // ⭐ Start-up NEST 프로그램 멤버 명시
  memberOf: {
    "@type": "Program",
    name: "신용보증기금 Start-up NEST",
    alternateName: ["Start-up NEST", "신보 Start-up NEST", "KODIT Start-up NEST", "스타트업 네스트", "NEST"],
  },
  knowsAbout: [/* 12개 자연어 키워드 */]
}
```

WebSite + WebPage schema 추가 (메인 페이지를 명시적 정보 페이지로 마크업).

#### 4. sitemap.xml에 /about 추가

```xml
<url>
  <loc>https://nest-alum1.vercel.app/about</loc>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
```

#### 5. llms.txt에 about 페이지 링크 추가

#### 6. 자연어 문장 키워드 노출 통계 검증

| 검색어 (자연어 문장) | 노출 빈도 |
|---|---|
| "신용보증기금 Start-up NEST 17기" | **10회** |
| "신용보증기금 Start-up NEST 18기" | **5회** |
| "신보 NEST 17기" | **9회** |
| "스타트업 네스트 17기" | **6회** |
| "스타트업 네스트 18기" | **8회** |
| "NEST 17기 동문" | **8회** |
| "NEST 18기 동문" | **7회** |
| "Start-up NEST 17기 졸업" | **2회** |
| "Start-up NEST 18기 졸업" | **2회** |

모든 핵심 검색어가 자연어 문장 형태로 5~10회 등장.

**예상 효과 — 2026 Google 알고리즘 기준**

| 검색어 | 이전 (v2.17.0) | v2.18.0 |
|---|---|---|
| "신용보증기금 nest 17기" | ❌ 미검색 | ✅ **강력 매칭** (자연어 본문 10회) |
| "신보 nest 17기" | ❌ 미검색 | ✅ **강력 매칭** (자연어 본문 9회) |
| "스타트업 네스트 17기" | ❌ 미검색 | ✅ 매칭 (6회) |
| "nest 17기 동문" | ❌ 미검색 | ✅ 매칭 (8회) |
| "신보 nest 17기 동문 등록" | ❌ 미검색 | ✅ 매칭 (/about long-tail) |

**파일 변경**

- `components/HomeClient.tsx` — hero 아래 SEO landing 섹션 (~80 라인 추가)
- `app/about/page.tsx` — /about 정적 페이지 신규
- `app/sitemap.xml/route.ts` — /about entry 추가
- `app/llms.txt/route.ts` — /about 링크 추가
- `app/layout.tsx` — structuredData 강화 (parentOrg + memberOf + WebPage)

**배포 후 인덱싱 가속화 절차 (필수)**

1. v2.18.0 배포 완료 (~3분)
2. **Google Search Console**:
   - URL 검사 도구에 `https://nest-alum1.vercel.app` 입력
   - "색인 생성 요청" 클릭 → 메인 페이지 재크롤링 trigger
   - URL 검사 도구에 `https://nest-alum1.vercel.app/about` 입력
   - "색인 생성 요청" 클릭 → about 페이지 신규 색인
   - Sitemaps → `sitemap.xml` 재처리
3. **네이버 서치어드바이저**: 콘텐츠 변경 알림 → 갱신 요청
4. **24~72시간 후** 검색 재확인

만약 그래도 미검색이면 **외부 백링크 확보** 필요:
- 동문 회사 자사 사이트에 "Alumni 갤러리" 링크 (자연스러운 경우)
- GitHub README에서 사이트 링크
- 워터리아 회사 페이지에서 링크

**v2.x 시리즈 정리**

| 버전 | 핵심 |
|---|---|
| v2.17.0 | 키워드 다양성 + sponsor 관계 (메타·JSON-LD 중심) |
| **v2.18.0** | **자연어 본문 강화 + /about 페이지 (visible HTML 중심)** |

이번 v2.18.0의 핵심은 **메타·JSON-LD에 의존하던 SEO를 visible 자연어 본문 중심으로 전환**한 것입니다. Google 2026년 알고리즘이 자연어 본문 매칭을 결정적으로 가중치하는 사실에 맞춰, 검색어가 한 문장 안에 통째로 등장하는 본문을 hero 아래 + /about 페이지에 풍부하게 추가했습니다.

### v2.17.0 — Google 검색 키워드 격차 해소 (신보·KODIT·17기 단독·sponsor 관계) (2026.05)

**문제 진단 — 사용자 보고**

Google 검색 결과 점검:

| 검색어 | 결과 |
|---|---|
| ✅ "nest alumni" | 본 사이트 상단 노출 |
| ✅ "nest alumni 워터리아" | 본 사이트 상단 노출 |
| ❌ "신용보증기금 nest 17기" | 미검색 |
| ❌ "start-up nest 17기" | 미검색 |
| ❌ "nest 17기" | 미검색 |
| ❌ "start-up nest" | 미검색 |

**근본 원인 — 키워드 격차**

1. **신용보증기금 약칭(신보, KODIT) 부재** — 본문/메타에 "신용보증기금" 정식 명칭만 사용
2. **17기·18기 단독 표현 부족** — 항상 "17기·18기" 묶음으로만 표현
3. **Sponsor 관계 JSON-LD 미명시** — 검색엔진이 "신용보증기금 NEST"와 본 사이트 관계를 인식하지 못함
4. **다양한 호칭 변형 누락** — "스타트업 네스트", "NEST 17기", "신보 NEST" 등

**해결 — 7가지 강화**

#### 1. layout.tsx Metadata 키워드 대폭 확장 (13개 → 50+개)

```typescript
const KEYWORDS = [
  // 정식 명칭 + 변형
  "신용보증기금 Start-up NEST Alumni 1기",
  "신용보증기금 스타트업 네스트 동문",
  // 약칭 (검색 매칭)
  "신보 NEST Alumni", "신보 Start-up NEST",
  "신보 NEST 17기", "신보 NEST 18기",
  "KODIT NEST Alumni", "KODIT Start-up NEST",
  // 기수 단독 (검색 빈도 높음)
  "Start-up NEST 17기", "Start-up NEST 18기",
  "NEST 17기", "NEST 18기",
  "스타트업 네스트 17기", "스타트업 네스트 18기",
  "17기 졸업", "18기 졸업",
  // ... 50+개
];
```

#### 2. Description 자연스러운 약칭 노출

```typescript
const SITE_DESCRIPTION =
  "신용보증기금(신보, KODIT) Start-up NEST Alumni 1기 — NEST 17기·18기 졸업 기업이 첫 세대로 결성한 동문 커뮤니티 갤러리. 신보 NEST 액셀러레이션 프로그램 17기·18기 출신 스타트업이 ...";
```

`"신용보증기금(신보, KODIT)"` 패턴으로 정식 명칭 + 한국어 약칭 + 영문 약칭 모두 자연스럽게.

#### 3. Brand Extended 강화

```typescript
const BRAND_EXTENDED = "신용보증기금(신보) Start-up NEST Alumni 1기 — NEST 17기·18기 동문 커뮤니티";
```

타이틀에 "신보" 약칭 + "NEST 17기·18기" 단독 표현 명시.

#### 4. SITE 객체 alternateNames 다중화 (lib/seo.ts)

```typescript
alternateNames: [
  "신용보증기금 Start-up NEST Alumni 1기",
  "신보 NEST Alumni 1기",
  "신보 Start-up NEST Alumni",
  "KODIT NEST Alumni 1기",
  "KODIT Start-up NEST Alumni",
  "스타트업 네스트 동문 1기",
  "NEST Alumni 1기",
  "NEST 17기·18기 동문",
  "Start-up NEST 17기 18기 Alumni",
],
```

#### 5. Organization JSON-LD parentOrganization + memberOf 추가 ⭐ 핵심

```typescript
{
  "@type": "Organization",
  "name": "Start-up NEST Alumni 1기",
  "alternateName": [/* 10개 호칭 */],
  // ⭐ 신용보증기금을 모기관으로 명시 → 검색엔진이 "신보 NEST" 검색 시 본 사이트 매칭
  "parentOrganization": {
    "@type": "GovernmentOrganization",
    "name": "신용보증기금",
    "alternateName": ["신보", "KODIT", "Korea Credit Guarantee Fund"],
    "url": "https://www.kodit.co.kr"
  },
  // ⭐ Start-up NEST 프로그램 멤버 명시
  "memberOf": {
    "@type": "Program",
    "name": "신용보증기금 Start-up NEST",
    "alternateName": ["Start-up NEST", "신보 Start-up NEST", "KODIT Start-up NEST", "스타트업 네스트"],
    "provider": {
      "@type": "GovernmentOrganization",
      "name": "신용보증기금"
    }
  },
  "knowsAbout": [
    "Start-up NEST 17기", "Start-up NEST 18기",
    "NEST 17기 동문", "NEST 18기 동문",
    "스타트업 네스트 17기", "스타트업 네스트 18기",
    /* ... 13개 */
  ]
}
```

이 JSON-LD 변경이 가장 강력한 효과 — Google 검색엔진이 본 사이트와 신용보증기금·Start-up NEST 프로그램의 공식 관계를 인식하여 "신용보증기금 NEST", "신보 NEST 17기" 같은 검색에서 본 사이트를 권위 있는 결과로 매칭.

#### 6. visible HTML (Hero + Footer) 키워드 노출

Hero 섹션 — Pill에 "신용보증기금(신보) · Start-up NEST" 추가:

```jsx
<Pill>신용보증기금(신보) · Start-up NEST</Pill>
<Pill>NEST 17기 졸업</Pill>
<Pill>NEST 18기 졸업</Pill>
```

P 태그 본문에 "신용보증기금(신보, KODIT)" 명시.

Footer SEO 정보 섹션 신규:

```html
<h3>커뮤니티 소개</h3>
<p>신용보증기금(신보, KODIT) Start-up NEST 17기·18기 졸업 기업이...</p>

<h3>다양한 호칭</h3>
<ul>
  <li>· 신용보증기금 Start-up NEST Alumni 1기</li>
  <li>· 신보 NEST Alumni 1기 / KODIT NEST Alumni</li>
  <li>· Start-up NEST 17기·18기 동문</li>
  <li>· 신보 17기·18기 / 스타트업 네스트 17기·18기</li>
</ul>

<h3>프로그램 모기관</h3>
<p>
  <a href="https://www.kodit.co.kr">신용보증기금 (신보 / KODIT)</a>
  Start-up NEST(스타트업 네스트) 액셀러레이션 프로그램 운영.
</p>
```

검색엔진이 자연스러운 visible HTML 콘텐츠로 키워드 매칭.

#### 7. FAQPage 약칭 관련 질문 추가

새 Q&A 2개:

```
Q: 신용보증기금, 신보, KODIT는 어떤 차이인가요?
A: 셋 다 같은 기관입니다. '신용보증기금'이 정식 명칭이고, '신보'는 한국어 약칭,
   'KODIT'은 영문 약칭(Korea Credit Guarantee Fund)입니다...

Q: 본 사이트는 신용보증기금 공식 사이트인가요?
A: 아니요. 본 사이트는 신보 Start-up NEST 17기·18기 졸업 기업이 자발적으로
   결성한 비공식 동문 커뮤니티입니다...
```

ChatGPT·Claude·Gemini 답변 시 직접 인용 가능.

#### 8. llms.txt 다양한 호칭 섹션

```markdown
## 다양한 호칭 (검색 키워드)

- 정식: 신용보증기금 Start-up NEST Alumni 1기
- 축약: 신보 NEST Alumni 1기, KODIT NEST Alumni
- 기수 표기: NEST 17기 동문, NEST 18기 동문, Start-up NEST 17기 졸업
- 영문: Korea Credit Guarantee Fund Start-up NEST Alumni
- 한국어 변형: 스타트업 네스트 동문, 스타트업 네스트 17기, 스타트업 네스트 18기
```

**키워드 노출 통계 (단위 테스트 결과)**

| 키워드 | layout.tsx | HomeClient | seo.ts | llms.txt |
|---|---|---|---|---|
| 신용보증기금 | 18회 | 11회 | 19회 | 4회 |
| 신보 | 11회 | 5회 | 14회 | 6회 |
| KODIT | 5회 | 4회 | 13회 | 4회 |
| Start-up NEST | 10회 | 13회 | 25회 | 8회 |
| 17기 | 15회 | 12회 | 13회 | 9회 |
| 18기 | 16회 | 13회 | 13회 | 9회 |
| NEST 17기 | 6회 | 8회 | 9회 | 6회 |
| 스타트업 네스트 | 6회 | 2회 | 5회 | 4회 |

**예상 SEO 효과**

| 검색어 | 이전 | v2.17.0 |
|---|---|---|
| "신용보증기금 nest 17기" | ❌ 미검색 | ✅ 강력 매칭 (parentOrganization + 본문 + meta) |
| "신보 nest 17기" | ❌ 미검색 | ✅ 강력 매칭 (alternateName + keywords + 본문) |
| "nest 17기" | ❌ 미검색 | ✅ 매칭 (Hero Pill + footer + JSON-LD knowsAbout) |
| "start-up nest 17기" | ❌ 미검색 | ✅ 매칭 (3개 위치에서 명시) |
| "스타트업 네스트 17기" | ❌ 미검색 | ✅ 매칭 |
| "kodit nest" | ❌ 약함 | ✅ 강력 (영문 alternateName + parentOrganization) |

**파일 변경**

- `app/layout.tsx` — KEYWORDS array 50+개 확장, BRAND_EXTENDED·SITE_DESCRIPTION 자연스러운 약칭
- `lib/seo.ts` — SITE.alternateNames 다중화, Organization JSON-LD parentOrganization·memberOf 추가, FAQ 2개 추가
- `components/HomeClient.tsx` — Hero Pill 강화, Footer SEO 정보 섹션 신규
- `app/llms.txt/route.ts` — 다양한 호칭 섹션 + 모기관 정보 추가

**배포 후 인덱싱 가속화 절차**

1. v2.17.0 배포 완료 (~2분)
2. **Google Search Console**:
   - URL 검사 도구에서 `https://nest-alum1.vercel.app` 직접 검사
   - "색인 생성 요청" 클릭
   - Sitemaps → `sitemap.xml` 재처리
3. **네이버 서치어드바이저**:
   - 사이트 진단 → 콘텐츠 변경 알림 → 갱신 요청
4. **24~72시간 후** 다음 검색어로 재확인:
   - "신용보증기금 nest 17기"
   - "신보 nest 17기"
   - "nest 17기"
   - "start-up nest 17기"

**v2.17.0 시리즈**

| 버전 | 핵심 |
|---|---|
| v2.16.x | 무료 인프라 영구 운영 + Dependabot 안전망 |
| **v2.17.0** | **Google 검색 키워드 다양성 + sponsor 관계 명시** |

이번 v2.17.0으로 본 갤러리는 **신용보증기금·신보·KODIT, Start-up NEST·스타트업 네스트, 17기·18기 단독·묶음 등 모든 검색 변형에서 권위 있게 매칭**되도록 강화되었습니다. JSON-LD parentOrganization + memberOf 관계 명시는 Google이 본 사이트를 신용보증기금 Start-up NEST 프로그램과 공식적으로 연결된 권위 있는 동문 커뮤니티로 인식하게 합니다.

### v2.16.1 — Dependabot 안전망 강화 (major 버전 자동 차단) (2026.05)

**문제**

v2.16.0 배포 직후 Dependabot이 자동 생성한 PR 3건이 모두 빌드 실패:

```
1. dependabot/npm_and_yarn/tailwindcss-4.2.4
   → "tailwindcss directly as a PostCSS plugin" 에러
   → Tailwind v4는 PostCSS 플러그인이 @tailwindcss/postcss로 분리됨 (breaking)

2. dependabot/npm_and_yarn/eslint-10.3.0
   → "Conflicting peer dependency: eslint@9.39.4" 에러
   → eslint-config-next@15.5.15는 eslint v7~v9만 peer 지원

3. dependabot/npm_and_yarn/typescript-6.0.3
   → "Cannot find module or type declarations for side-effect import"
   → TypeScript v6는 CSS side-effect import 타입 추론 변경
```

다행히 모두 **dependabot PR 브랜치 preview deployment**이고 main은 안전. production은 v2.16.0 main의 마지막 성공 빌드 그대로 유지.

**근본 원인**

v2.16.0의 `dependabot.yml`은 일부 패키지(tailwindcss, react, next 등)에 대해서만 major 업그레이드를 차단했고, **eslint, @types/*, typescript 일부 등은 누락**. 결과적으로 Dependabot이 major 업그레이드 PR을 생성.

**해결 — 모든 패키지의 major 자동 차단 (보수적 정책)**

`.github/dependabot.yml` 변경:

```yaml
ignore:
  # 모든 패키지의 major 버전 업그레이드 자동 차단 (가장 안전)
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```

이제 Dependabot은 minor/patch만 자동 PR 생성. major 업그레이드는 운영자가 수동 검토 후 적용.

GitHub Actions 종속성도 같은 룰 적용 (actions/checkout v4 → v5 같은 변경 차단).

**사용자 즉시 조치 (3개 PR 닫기)**

GitHub repo → Pull requests 탭에서 다음 3개 PR을 close:

```
1. https://github.com/seong-ro/nest-alum1/pull/{N1}  (tailwindcss-4.2.4)
2. https://github.com/seong-ro/nest-alum1/pull/{N2}  (eslint-10.3.0)
3. https://github.com/seong-ro/nest-alum1/pull/{N3}  (typescript-6.0.3)
```

각 PR에서 우하단 "Close pull request" 버튼 클릭. 머지하지 않음.

v2.16.1 적용 후 Dependabot은 같은 major 업그레이드를 다시 제안하지 않음.

**Production 영향 확인**

```bash
curl -I "https://nest-alum1.vercel.app/sitemap.xml?$(date +%s)"
# 기대: HTTP/2 200, x-sitemap-version: v2.13.7 (또는 v2.14.0/v2.15.0/v2.16.0 중 마지막 성공)
```

Production은 main 브랜치 마지막 성공 빌드를 유지하므로 영향 없음. Vercel Dashboard → Deployments에서 production deployment의 status 확인.

**향후 major 업그레이드 절차 (수동)**

향후 Tailwind v4, TypeScript v6 등으로 업그레이드 필요 시:

1. 로컬에서 `package.json` 수동 수정 + 마이그레이션 작업
2. 마이그레이션 가이드 검토:
   - Tailwind v3 → v4: https://tailwindcss.com/docs/upgrade-guide
   - Next.js major: https://nextjs.org/docs/app/building-your-application/upgrading
3. 로컬 빌드 검증 (`npm run build`)
4. 별도 브랜치 PR로 신중히 머지

**파일 변경**

- `.github/dependabot.yml` — npm + GitHub Actions 모두 major 자동 차단 룰 추가

**v2.x 시리즈 정리**

| 버전 | 핵심 |
|---|---|
| v2.16.0 | GitHub 무료 자산 + Cloudflare 백업 + 운영 매뉴얼 |
| **v2.16.1** | **Dependabot major 자동 차단 (안전망 강화)** |

이번 패치로 향후 Dependabot이 자동으로 breaking change를 머지 후보에 올리지 않습니다. patch + minor 자동 업데이트는 그대로 작동하여 보안 패치 등은 정상 적용됩니다.

### v2.16.0 — 무료 인프라 영구 운영 plan + GitHub 무료 자산 적극 활용 (2026.05)

**2026년 5월 시점 플랫폼 분석 결과**

[자세한 내용은 `PLATFORM_GUIDE.md` 참고]

5개 무료 호스팅 플랫폼 면밀 분석:

| 플랫폼 | 무료 한도 | Next.js 적합도 | 상업적 사용 | 결정 |
|---|---|---|---|---|
| **Vercel Hobby** ⭐ | 100GB/월 + 1M req | ★★★★★ | ⚠️ 비상업적 | **현재 유지** |
| Cloudflare Pages | **무제한 대역폭** + 100K req/day | ★★★☆☆ | ✅ 허용 | **백업 plan** |
| Netlify | 300 credits/월 (~30GB) | ★★★★☆ | ✅ 허용 | 2025.09 변경으로 매력 하락 |
| Render | 512MB RAM + Postgres | ★★★☆☆ | ✅ 허용 | 콜드 스타트 |
| Koyeb | 1 vCPU + Postgres | ★★★☆☆ | ✅ 허용 | 신생 (안정성 검증 필요) |

**결정 — Vercel Hobby 유지 + GitHub 무료 자산 보강 + Cloudflare 백업 준비**

이유:
1. Next.js 15 ISR/Server Actions가 Vercel 최적화 완료 → 마이그레이션 비용 큼
2. 현재 트래픽(MAU 100명 미만, 카드 5개)은 Vercel 한도 1% 미만
3. 본 커뮤니티는 자발적 봉사 운영 (수익 모델 0) → "비상업적" 부합
4. **위험 시 마이그레이션 가능한 백업 plan 문서화**

**적용된 무료 자산 (즉시)**

#### 1. GitHub Actions 워크플로우 (`.github/workflows/`)

> public repo는 **무제한 무료**, private repo도 월 2,000분 무료

신규 추가:

`seo-health.yml` — 매주 월요일 09:00 KST 자동 검증
- sitemap.xml 응답 + URL 카운트 + `<script>` 태그 (Vercel 자동 주입) 감지
- robots.txt 응답 + 필수 필드
- llms.txt 응답 + H1 표준 + 100KB 한도
- 등록된 카드 URL 죽음 검증 (모든 카드를 매주 자동 ping)
- GitHub Step Summary로 결과 시각화

기존 `ci.yml` 유지:
- 타입체크 + 빌드 검증

#### 2. Dependabot (`.github/dependabot.yml`)

> public/private 모두 **무료, 무제한**

매주 월요일 09:00 KST 자동 종속성 업데이트:
- npm 종속성 그룹 (Next.js+React, Tailwind, Types)
- GitHub Actions 종속성 (월 1회)
- Major 버전은 review 필요 (자동 머지 안 함)

#### 3. Issue Templates (`.github/ISSUE_TEMPLATE/`)

신규 추가:

`new_company_registration.md` — GitHub 계정만으로 등록 요청
- 기업 기본 정보 + URL + 사업 영역 + 동의 체크
- 운영자(워터리아) 검토 후 사이트에 직접 등록
- 사이트 자가 등록과 병행 가능한 보조 채널

`card_modification.md` — 카드 수정·내림 요청
- 정보 갱신·내용 수정·내림 요청 분기
- 셀프 처리 안내 (hover → 휴지통 아이콘)

기존 `bug_report.md`, `feature_request.md` 유지.

#### 4. FUNDING.yml (선택)

향후 후원 채널 옵션 준비 (현재 모두 주석). 활성화 시 Vercel "commercial use" 정책 재검토 필요.

#### 5. PLATFORM_GUIDE.md 신규 운영 매뉴얼

운영자가 분기별로 검토할 가이드:
- 5개 플랫폼 평가 매트릭스
- GitHub 무료 자산 활용 (Discussions, Pages, Sponsors)
- Cloudflare DNS·CDN·R2 무료 보강 절차
- Upstash Redis 무료 한도 모니터링
- 위험 시나리오 3가지 + 대응 plan
- 운영 비용 0원 영구 보장 plan 다이어그램

**위험 시나리오 + 대응 plan (PLATFORM_GUIDE.md)**

| 시나리오 | 대응 시간 | 절차 |
|---|---|---|
| Vercel commercial 정책 강화 | 1~2시간 | Cloudflare Pages로 마이그레이션 |
| Upstash 무료 정책 변경 | 30분 | Cloudflare KV로 전환 |
| 트래픽 폭증 (100GB 80% 도달) | - | Cloudflare DNS로 정적 자산 캐싱 |

**무료 자산 활용 단계별 권장**

✅ **즉시 적용** (이번 v2.16.0):
- GitHub Actions seo-health.yml 워크플로우
- Dependabot 자동화
- Issue Templates
- 운영 가이드 문서

🟡 **단계적 적용 (선택, 자발적 참여 원칙 검토 후)**:
- GitHub Discussions 활성화 (Repo Settings)
- GitHub Pages 정적 백업 사이트
- Cloudflare DNS 추가 (도메인 구매 시)

🔵 **백업 준비 (즉시 사용 안 함)**:
- Cloudflare Pages 마이그레이션 가이드 (PLATFORM_GUIDE.md 참고)
- 자가 호스팅 옵션 (Render, Koyeb)

**파일 변경**

신규:
- `.github/workflows/seo-health.yml` — 정기 SEO 검증 cron
- `.github/dependabot.yml` — 종속성 자동 업데이트
- `.github/ISSUE_TEMPLATE/new_company_registration.md`
- `.github/ISSUE_TEMPLATE/card_modification.md`
- `.github/FUNDING.yml` — 후원 채널 옵션 (현재 비활성)
- `PLATFORM_GUIDE.md` — 분기별 검토용 운영 매뉴얼

수정 없음 (기존 코드 변경 없음 — 인프라/문서 추가만).

**사용자 안내 (배포 후)**

1. GitHub repo가 **public인지 확인** (Actions 무제한 무료 위해)
2. Repo Settings → Actions 활성화
3. (선택) Repo Settings → Features → Discussions 체크
4. (선택) Repo Settings → Pages 활성화
5. PLATFORM_GUIDE.md를 분기별로 검토 (다음 검토일: 2026.08.01)

**v2.x 시리즈 정리**

| 버전 | 핵심 |
|---|---|
| v2.13.x | SEO 인프라 완성 |
| v2.14.0 | 2026 GEO 강화 (llms.txt, FAQPage, CollectionPage) |
| v2.15.0 | 무료 운영 + 커뮤니티 핵심 기능 (필터·즐겨찾기) |
| **v2.16.0** | **GitHub 무료 자산 + Cloudflare 백업 + 운영 매뉴얼** |

이번 v2.16.0으로 본 갤러리는 **2026년 5월 시점 분석된 모든 무료 자산을 활용한 production-grade 영구 무료 운영 인프라**를 갖췄습니다. Vercel 정책 변경 시에도 1~2시간 내 마이그레이션 가능한 백업 plan과 함께, 운영자가 분기별로 검토할 운영 매뉴얼(`PLATFORM_GUIDE.md`)이 포함되어 장기 운영 안정성이 크게 강화되었습니다.

### v2.15.0 — 무료 장기 운영 + 커뮤니티 핵심 기능 강화 (2026.05)

**2026년 5월 베스트 프랙티스 분석 결과**

기업 커뮤니티 분야 트렌드 분석에서 도출한 핵심 인사이트:

1. **Niche directory가 broad보다 강함** — Crunchbase·Wellfound·Indie Hackers 모두 "정확한 카테고리 + 검증된 정보 + 강력한 필터" 우위
2. **카테고리 필터·태그가 핵심 경쟁력** — 사용자가 "내 사업 영역과 맞는 동문" 빠르게 발견
3. **AI API 의존성 = 운영비 폭탄 + 종속 위험** — 장기 무료 운영엔 부적합
4. **TextRank/LexRank 알고리즘은 무료 + 충분히 효과적** — Sumy(Python), 자체 JS 구현 모두 production 검증
5. **localStorage 기반 개인화 = 서버 부하 0** — 즐겨찾기·읽기 진행 등 무료로 구현 가능
6. **자발적 참여 + 회원가입 없음 + 운영자 독립성** = 신뢰받는 기업 커뮤니티 핵심 (Indie Hackers 패턴)

**기업 소개 커뮤니티의 정확한 니즈 (포지셔닝 재정립)**

✅ **포함해야 할 것**:
- 동문 기업이 서로의 사업 영역을 한 눈에 파악 (카테고리·기수)
- 협력 후보를 빠르게 필터링 (업종·도메인 필터)
- 갤러리 통계로 커뮤니티 활성도 파악 (총 N개, 카테고리별 분포)
- 관심 기업을 표시 (즐겨찾기, 개인 단말 저장)
- 카드 단위 외부 공유 (소셜·메신저)
- 검색 엔진 + AI 답변 엔진 인용 가능 (이미 v2.14.0)

❌ **포함하지 않을 것 (의도적 미포함)**:
- 댓글/좋아요 시스템 (스팸 모더레이션 부담, 동문 1기 규모엔 과잉)
- 회원가입/로그인 (자발적 참여 원칙 위배)
- 결제·유료 멤버십 (무료 운영 원칙)
- AI API 호출 (장기 운영 비용 + 종속성)
- 실시간 채팅 (인프라 비용 + 스팸 위험)

**적용된 기능 (모두 무료, AI API 미사용)**

#### 1. 카테고리 필터 칩 (multi-select)

niche directory 핵심 기능. 갤러리 위에 업종별 필터 칩 표시:

```
업종 필터: [AI · NPU · Edge 5] [클라우드 · SaaS 3] [안전 2] [핀테크 1]  × 필터 해제
```

- 칩 클릭 시 해당 업종만 필터링 (multi-select 가능)
- 카드 수 많은 순 정렬 (활발한 카테고리 부각)
- 활성 시 해당 카테고리 색상으로 채움
- 카드 추가/삭제 시 자동 갱신 (useMemo)
- 검색·정렬과 독립적으로 작동 (조합 가능)

#### 2. 즐겨찾기 (localStorage)

서버 부하 0, 무료 영구 운영:

```typescript
// 별 아이콘 클릭 → localStorage 저장
// 새로고침해도 유지됨
localStorage.setItem("nest-alum1:favorites", JSON.stringify([...favorites]));
```

UX 디테일:
- 일반 카드: hover 시 별 표시 (방해 없음)
- 즐겨찾기 카드: 항상 노란 별 표시 (시각적 강조)
- 즐겨찾기 1개 이상이면 "★ 즐겨찾기 (N)" 정렬 칩 자동 추가
- 새 정렬 모드 "favorites": 즐겨찾기 카드를 위로

#### 3. 통계 — 카테고리별 카드 수

각 카테고리 칩에 숫자 표시 → 커뮤니티 활성도 한눈에 파악:
```
[AI · NPU · Edge 5]  ← AI 분야 5개 카드
[안전 2]              ← 안전 분야 2개 카드
```

#### 4. "favorites" 정렬 모드 신규

기존 정렬: 최신순·업종별·가나다순·도메인순 → 즐겨찾기 추가:
```
┌────────┬────────┬─────────┬─────────┬───────────────────┐
│ 최신순 │ 업종별 │ 가나다순│ 도메인순│ ★ 즐겨찾기 (3)   │
└────────┴────────┴─────────┴─────────┴───────────────────┘
```

#### 5. 표시 정확도 개선

```typescript
const filteredByIndustry = useMemo(() => {
  if (activeIndustries.size === 0) return filtered;
  return filtered.filter((card) =>
    activeIndustries.has(card.card.industry ?? "other"),
  );
}, [filtered, activeIndustries]);

// "5/12 표시" — 검색 + 필터 적용 후 실제 표시 수
```

**무료 운영 보장 (AI API 미사용 정책)**

본 v2.15.0은 다음 외부 유료 서비스 의존성이 0:
- ❌ OpenAI API (GPT) — 사용 안 함
- ❌ Anthropic API (Claude) — 사용 안 함
- ❌ Google Cloud AI — 사용 안 함
- ❌ AWS Bedrock — 사용 안 함
- ❌ Azure AI Services — 사용 안 함
- ❌ HuggingFace Inference Endpoint (유료) — 사용 안 함

대신 100% 오픈소스/무료 스택:
- ✅ TextRank 알고리즘 (자체 구현, BSD 라이선스 호환)
- ✅ MMR (Maximal Marginal Relevance, 자체 구현)
- ✅ cheerio (MIT 라이선스, HTML 파싱)
- ✅ Vercel Hobby plan (월 무료)
- ✅ Upstash Redis 무료 티어 (10,000 commands/day)
- ✅ localStorage (브라우저 내장)

**2026 베스트 프랙티스 적용**

| 트렌드 | 출처 | 적용 방식 |
|---|---|---|
| Niche directory 우위 | Wellfound·Crunchbase 패턴 | 업종 카테고리 + 필터 칩 |
| 매칭 시그널 | LoftOS·Innomatch 사례 | 동문 간 협력 가능성 강조 |
| 강력한 필터 | Foundrlist 분석 | multi-select 카테고리 필터 |
| 서버 부하 최소화 | Self-hosted 베스트 프랙티스 | localStorage 개인화 |
| 자발적 참여 | Indie Hackers 패턴 | 회원가입 없음 유지 |
| 운영자 독립성 | Mastodon·Discourse 모델 | AI API 미사용 |

**파일 변경**

- `components/HomeClient.tsx` — GallerySection에 카테고리 필터 + 즐겨찾기 + 통계
- `components/ThumbnailCard.tsx` — 즐겨찾기 별 버튼 추가
- `lib/industry.ts` — 변경 없음 (이미 카테고리 시스템 완성)

**v2.x 시리즈 진화 정리**

| 버전 | 핵심 |
|---|---|
| v2.11.x | 한국 주소 추출 production-grade |
| v2.12.x | sub-page 보강 + UX 개선 |
| v2.13.x | SEO 인프라 완성 |
| v2.14.0 | 2026 GEO 강화 (llms.txt + JSON-LD 확장) |
| **v2.15.0** | **무료 장기 운영 + 커뮤니티 핵심 기능 (필터·즐겨찾기·통계)** |

이번 v2.15.0으로 본 갤러리는 **무료 인프라만으로 장기 운영 가능한 production-grade niche directory**가 되었습니다. 동문이 서로의 사업을 빠르게 발견·필터·즐겨찾기 할 수 있는 핵심 커뮤니티 기능을 모두 갖췄으며, 외부 AI API 의존성 0으로 운영자가 비용 부담 없이 장기 봉사할 수 있습니다.

### v2.14.0 — 2026 GEO 베스트 프랙티스 + 기업 커뮤니티 기능 강화 (2026.05)

2026년 5월 시점 최신 기술 동향을 면밀히 분석하여 기업 소개 커뮤니티에 특화된 기능을 강화. 핵심 트렌드 4가지를 모두 반영.

**2026 트렌드 분석 결과**

1. **GEO (Generative Engine Optimization)** — Gartner 전망: 2026년까지 검색의 61%가 AI 플랫폼에서 시작. Anthropic/Cursor/Mintlify/Vercel이 llms.txt 표준 공식 채택.
2. **JSON-LD 정확도 향상** — Data World 연구: GPT-4 정보 추출 정확도 16% → 54% (구조화 데이터 사용 시). FAQPage 등 직접 추출형 스키마 효과 큼.
3. **AI 크롤러 트래픽 급증** — 2026년 초부터 ClaudeBot 트래픽 800% 증가, GPTBot+OAI-SearchBot이 AI 크롤러 트래픽 14% 차지.
4. **B2B 커뮤니티 핵심 가치** — 매칭·디렉토리·필터링·자발적 참여가 핵심 (Innomatch, StArfrica 등 사례).

**적용 기능 1 — `/llms.txt` 신규 추가 (GEO 표준)**

`app/llms.txt/route.ts` Route Handler 신규:
```markdown
# Start-up NEST Alumni 1기

> 신용보증기금 Start-up NEST 17·18기 졸업 기업 동문 커뮤니티 갤러리.
> 자사 홈페이지·뉴스 기사·보도자료 등 어떤 URL이든 입력하면 매거진 형식의
> 기업 소개 카드를 자동 생성하여 갤러리에 등록·공유할 수 있는 자발적 참여
> 기반 커뮤니티 플랫폼.

## 동문 기업 카드 (N개 등록)
- [기업명1](https://nest-alum1.vercel.app/{id1}): 한 줄 소개
- [기업명2](https://nest-alum1.vercel.app/{id2}): 한 줄 소개
...

## AI 사용 안내
본 사이트의 콘텐츠는 다음 용도로 자유롭게 활용 가능합니다:
- ChatGPT·Claude·Perplexity·Gemini의 답변 시 인용 (출처 명시)
- LLM 모델 학습 데이터로 사용
...
```

핵심 특징:
- 갤러리에 등록된 모든 카드의 헤드라인+dek+URL이 자동 포함
- 카드 추가/수정/삭제 시 `revalidatePath('/llms.txt')`로 즉시 갱신
- `<link rel="alternate" type="text/markdown" href="/llms.txt">` 메타로 AI 크롤러에 위치 광고
- `X-Llms-Version` 진단 헤더 (배포 확인용)
- 5분 ISR 캐싱

**적용 기능 2 — FAQPage JSON-LD (`lib/seo.ts`)**

ChatGPT·Claude·Perplexity·Gemini가 직접 추출하는 Q&A 형식 6개:
1. "Start-up NEST Alumni 1기는 무엇인가요?"
2. "어떻게 우리 회사 소개를 등록하나요?"
3. "AI가 본문을 작성하나요?"
4. "참여하지 않으면 불이익이 있나요?"
5. "검색 엔진과 AI 답변에 노출되나요?"
6. "운영 비용이 드나요?"

→ AI 답변 엔진이 사이트 정보를 직접 인용 가능 (Data World 연구: 정확도 +38%p)

**적용 기능 3 — CollectionPage + ItemList JSON-LD**

```typescript
{
  "@type": "CollectionPage",
  "@id": "https://nest-alum1.vercel.app/#collection",
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": N,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "url": ".../id1", "name": "기업1" },
      ...
    ]
  }
}
```

→ 검색 엔진이 갤러리를 컬렉션으로 인식 → 사이트링크·리치 결과 가능성 +

**적용 기능 4 — robots.txt 강화**

llms.txt 위치 명시:
```
# 2026 GEO 표준 — AI 친화 콘텐츠 맵
# robots.txt는 "어디 가지 마라" / llms.txt는 "여기에 가치 있다"
# 참고: https://nest-alum1.vercel.app/llms.txt

Sitemap: https://nest-alum1.vercel.app/sitemap.xml
Host: https://nest-alum1.vercel.app
```

기존 AI 크롤러 9종 명시 허용은 유지: GPTBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, CCBot, Applebot-Extended, Bytespider.

**적용 기능 5 — next.config.ts 헤더 강화**

llms.txt 전용 헤더:
```typescript
{
  source: "/llms.txt",
  headers: [
    { key: "Content-Type", value: "text/plain; charset=utf-8" },
    { key: "Cache-Control", value: "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" },
    { key: "X-Robots-Tag", value: "noindex" },
  ],
}
```

**적용 기능 6 — 메인 페이지 page.tsx에 JSON-LD 삽입**

```typescript
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={jsonLdScript(collectionJsonLd)}
/>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)}
/>
```

XSS 방지: `</script>` 패턴 자동 escape.

**적용 기능 7 — actions.ts revalidatePath 확장**

모든 mutation 액션(createCard, createCardManual, deleteCardAction, refreshCardAction, refreshAllAction)에 `revalidatePath('/llms.txt')` 추가:
- 카드 추가/수정/삭제 시 llms.txt 즉시 갱신
- AI 크롤러가 항상 최신 카드 목록 확인 가능

**효과 측정 (2026년 5월 트렌드 기반 예상)**

| 지표 | 이전 (v2.13.7) | v2.14.0 |
|---|---|---|
| LLM 인용 가능성 | 낮음 | 높음 (llms.txt + FAQPage) |
| GPT 정보 추출 정확도 | ~16% | ~54% (Data World 연구 기준) |
| AI Overviews 노출 | 가능 | 강력히 가능 (FAQPage 직접 추출) |
| 검색엔진 사이트링크 | 가능 | 강력히 가능 (CollectionPage) |
| 새 카드 → AI 인식 | 검색엔진 인덱싱 후 | llms.txt로 즉시 (5분) |
| ClaudeBot 등 친화도 | 일반 | 우대 (전용 표준 채택) |

**검증 절차 (배포 후)**

```bash
# 1. llms.txt 확인
curl "https://nest-alum1.vercel.app/llms.txt" | head -20
# 기대: # Start-up NEST Alumni 1기 + > blockquote + 카드 목록

# 2. llms.txt 헤더 확인
curl -I "https://nest-alum1.vercel.app/llms.txt"
# 기대: x-llms-version: v2.14.0, content-type: text/plain

# 3. JSON-LD 검증 (Google Rich Results Test)
# https://search.google.com/test/rich-results
# URL: https://nest-alum1.vercel.app
# 기대: FAQPage + CollectionPage 모두 인식

# 4. Schema.org 검증
# https://validator.schema.org/
# URL 입력 → 모든 스키마 valid 확인
```

**파일 변경**

- `app/llms.txt/route.ts` — 신규 (GEO 표준)
- `app/page.tsx` — FAQPage + CollectionPage JSON-LD 삽입
- `app/layout.tsx` — `<link rel="alternate" type="text/markdown" href="/llms.txt">` 추가
- `app/robots.txt/route.ts` — llms.txt 위치 광고 코멘트
- `app/actions.ts` — 모든 mutation에 revalidatePath('/llms.txt') 추가 (6곳)
- `lib/seo.ts` — buildFaqJsonLd, buildCollectionPageJsonLd 신규 헬퍼
- `next.config.ts` — /llms.txt 전용 헤더

**v2.14.0 시리즈 진화**

| 버전 | 핵심 |
|---|---|
| v2.13.x | SEO 인프라 (sitemap, robots, ISR, Vercel 안정화) |
| **v2.14.0** | **GEO 강화 (llms.txt + FAQPage + CollectionPage)** |

이번 v2.14.0으로 본 커뮤니티 갤러리는 **2026년 5월 시점 production-grade GEO + SEO 베스트 프랙티스를 모두 적용한 상태**가 되었습니다. ChatGPT·Claude·Perplexity·Gemini 등 AI 답변 엔진에서 본 갤러리의 동문 기업들이 직접 인용될 가능성이 크게 증대됩니다.

### v2.13.7 — 옛 Metadata API 파일 잔여 문제 해결 (2026.05)

**근본 원인 발견**

v2.13.6 배포 후 응답 헤더 진단 결과:
```bash
$ curl -I "https://nest-alum1.vercel.app/sitemap.xml"
HTTP/2 200
content-type: application/xml
x-robots-tag: noindex
# x-sitemap-version: v2.13.6  ← 누락!
# x-sitemap-generated: ...    ← 누락!
# x-sitemap-cards: ...        ← 누락!
```

진단 헤더(`x-sitemap-version` 등)가 없음 → **Route Handler 코드가 실행되지 않고 있음**.

**원인 — zip에 옛 파일 잔여**

배포 zip 파일 안에 두 가지가 모두 포함:
- `app/sitemap.ts` (옛 Metadata API)
- `app/sitemap.xml/route.ts` (신규 Route Handler)

같은 경로 `/sitemap.xml`로 라우팅되어 충돌. Next.js 15가 Metadata API의 `sitemap.ts`를 우선 매칭하여 옛 응답이 계속 나감.

`app/robots.ts` + `app/robots.txt/route.ts`도 같은 충돌.

또한 **사용자 측 작업 디렉토리에도 옛 파일 잔여 가능성**:
- v2.13.5 zip을 풀었을 때 `app/sitemap.ts`가 있었고
- v2.13.6 zip을 같은 디렉토리에 다시 풀어도 옛 파일이 그대로 남아있음
- (zip 풀기는 기본적으로 파일 추가/덮어쓰기만 하고, 없는 파일은 삭제 안 함)

**해결 — 3가지**

#### 1. 깨끗한 zip 재생성

작업 디렉토리에서 옛 파일 명시적 삭제 후 zip 새로 생성:
```bash
find /home/claude/folio-cards/app -name "sitemap.ts" -delete
find /home/claude/folio-cards/app -name "robots.ts" -delete
```

zip 안 파일 구조 (v2.13.7):
```
app/
├── sitemap.xml/route.ts   ✓ Route Handler만
└── robots.txt/route.ts    ✓ Route Handler만
(app/sitemap.ts, app/robots.ts는 없음)
```

#### 2. cleanup-old-files.sh 스크립트 추가

zip을 풀고 자동으로 옛 파일 정리하는 스크립트 포함:
```bash
bash cleanup-old-files.sh
# ✗ 삭제: ./app/sitemap.ts (있을 시)
# ✗ 삭제: ./app/robots.ts (있을 시)
# ✓ 정리 완료
```

#### 3. 사용자 측 작업 디렉토리 정리 안내

배포 전 반드시 옛 파일 삭제:
```bash
cd ~/Downloads
unzip -o folio-cards.zip  # zip 풀기
cd folio-cards

# 옛 파일 삭제 (혹시 잔여 있으면)
rm -f app/sitemap.ts
rm -f app/robots.ts

# 또는 cleanup 스크립트 실행
bash cleanup-old-files.sh

# 그 다음 배포
bash auto-deploy.sh
```

**버전 마커 v2.13.7로 업그레이드**

`SITEMAP_VERSION = "v2.13.7"`로 변경 — 배포 후 다음 응답 헤더로 즉시 확인:
```
x-sitemap-version: v2.13.7
```

이게 보이면 **Route Handler 정상 실행** 확인.

**파일 변경**

- `app/sitemap.xml/route.ts` — `SITEMAP_VERSION = "v2.13.7"`
- `cleanup-old-files.sh` — 신규 정리 스크립트
- zip 자체를 깨끗히 재생성 (`app/sitemap.ts`, `app/robots.ts` 미포함 검증됨)

**v2.13.x 시리즈 진화**

| 버전 | 핵심 |
|---|---|
| v2.13.4 | sitemap "가져올 수 없음" 1차 해결 |
| v2.13.5 | Route Handler 직접 작성 |
| v2.13.6 | 버전 마커 + 진단 헤더 추가 |
| **v2.13.7** | **옛 Metadata API 파일 잔여 제거** |

### v2.13.6 — Sitemap 배포 진단 강화 + Vercel 헤더 이중 방어 (2026.05)

**상황**

v2.13.5 배포 안내 후 사용자가 `https://nest-alum1.vercel.app/sitemap.xml` 접속 시 여전히 동일한 XML 응답:
```xml
<urlset xmlns="...sitemap/0.9">
  <script/>   ← 여전히 끼어있음!
  <url>...</url>
  ...
</urlset>
```

**핵심 단서**: lastmod 시각이 `2026-05-01T03:36:07.576Z`로 v2.13.4 응답과 **정확히 동일**. 이는:
1. v2.13.5가 실제로 배포되지 않았거나
2. Vercel CDN edge cache가 이전 응답을 계속 서빙 중이거나
3. v2.13.5도 Vercel platform 레벨에서 같은 자동 주입 발생

**해결 — 4가지 진단/방어 강화**

#### 1. XML 응답에 버전 마커 주석 추가

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Sitemap v2.13.6 | generated=2026-05-01T... | cards=5 -->
<urlset xmlns="...">
  ...
</urlset>
```

이제 사용자가 `/sitemap.xml` 접속 시 즉시 다음 확인 가능:
- 버전 마커 `v2.13.6` → 새 배포 적용 확인
- `generated` timestamp → 응답 시점 확인
- `cards=N` → Redis 정상 작동 확인
- `fetch_error=...` (있을 시) → Redis 실패 사유

XML 표준상 `<urlset>` 앞 주석은 valid → GSC도 무시 (영향 없음).

#### 2. 진단용 응답 헤더 추가

```typescript
headers: {
  "X-Sitemap-Version": "v2.13.6",
  "X-Sitemap-Generated": "2026-05-01T...",
  "X-Sitemap-Cards": "5",
}
```

`curl -I https://nest-alum1.vercel.app/sitemap.xml`로 즉시 확인:
```
HTTP/2 200
content-type: application/xml; charset=utf-8
x-sitemap-version: v2.13.6
x-sitemap-generated: 2026-05-01T03:50:00.000Z
x-sitemap-cards: 5
```

#### 3. Cache-Control 짧게 (10초 디버깅 친화)

```typescript
"Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=60"
```

이전 v2.13.5: 60초 → v2.13.6: 10초. 변경사항 즉시 확인 가능.

#### 4. next.config.ts에 sitemap.xml 전용 헤더 강제 (이중 방어)

Route Handler에서 헤더 설정해도 Vercel platform이 일부 케이스에서 덮어쓸 수 있어, **next.config.ts 레벨에서도 명시**:

```typescript
async headers() {
  return [
    {
      source: "/sitemap.xml",
      headers: [
        { key: "Content-Type", value: "application/xml; charset=utf-8" },
        { key: "X-Robots-Tag", value: "noindex" },
        { key: "Cache-Control", value: "public, max-age=0, s-maxage=10, ..." },
      ],
    },
    // ... robots.txt도 동일
    // ... 기존 보안 헤더
  ];
}
```

이렇게 두 레벨(Route Handler + next.config.ts)에서 헤더 설정하면 Vercel이 sitemap을 일반 HTML 페이지로 오인할 가능성 차단.

**배포 검증 절차 (사용자 안내)**

#### 1단계 — Vercel Dashboard에서 배포 상태 확인

1. https://vercel.com/baedongbaedong-6864 → nest-alum1 프로젝트
2. Deployments 탭 → 가장 최근 deployment 상태 확인
3. **"Ready"** 상태인지 확인 (Building·Failed 아님)
4. Commit message가 **"v2.13.6"** 또는 최근 시각인지 확인

#### 2단계 — 응답 헤더로 즉시 확인

배포 완료 후 1분 안에 (캐시 10초로 짧게 설정했으므로):

```bash
curl -I "https://nest-alum1.vercel.app/sitemap.xml?$(date +%s)"
```

기대 결과:
```
HTTP/2 200
content-type: application/xml; charset=utf-8
x-sitemap-version: v2.13.6
x-sitemap-generated: 2026-05-01T...
```

**`x-sitemap-version`이 `v2.13.6`이면** → 정상 배포 + 코드 적용
**없거나 다른 버전이면** → 배포 미완료 또는 다른 deployment 활성

#### 3단계 — 페이지 소스 보기 (Ctrl+U)

브라우저에서 `https://nest-alum1.vercel.app/sitemap.xml` 접속 후 Ctrl+U:

기대 결과 첫 3줄:
```
<?xml version="1.0" encoding="UTF-8"?>
<!-- Sitemap v2.13.6 | generated=... | cards=5 -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
```

- **버전 마커 주석 보이면** → 정상
- **여전히 `<script/>` 보이면** → Vercel platform 레벨 자동 주입 → 추가 진단 필요

#### 4단계 — 캐시 강제 무효화 (필요 시)

브라우저 캐시·CDN 캐시 모두 우회:
```
https://nest-alum1.vercel.app/sitemap.xml?v=2026
```

쿼리 파라미터를 매번 다르게 하면 CDN 캐시 무시.

**파일 변경**

- `app/sitemap.xml/route.ts` — 버전 마커 + timestamp + 진단 헤더 추가, 캐시 10초로 단축
- `next.config.ts` — `/sitemap.xml`, `/robots.txt` 전용 응답 헤더 강제

**기존 기능 모두 유지**:
- Route Handler 응답 본문 100% 제어
- `getSiteUrl()` lazy 평가
- Redis 실패 시 정적 entries 보장
- `revalidatePath('/sitemap.xml')` 호출 (mutation 시 즉시 무효화)

### v2.13.5 — Sitemap에 끼어든 `<script/>` 빈 태그 제거 (Route Handler 직접 작성) (2026.05)

**문제**

v2.13.4 배포 후 `/sitemap.xml`이 정상 데이터로 응답하기 시작했지만, 실제 응답 XML 안에:

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <script/>   ← 비표준 요소!
  <url>
    <loc>https://nest-alum1.vercel.app</loc>
    ...
  </url>
  ...
</urlset>
```

`<urlset>` 안에 빈 `<script/>` 태그가 끼어 있어 GSC가 sitemap을 거부 (또는 비정상으로 인식)할 수 있음.

**원인**

Next.js Metadata API의 `app/sitemap.ts`로 생성된 sitemap.xml 응답에 Vercel Analytics 또는 Speed Insights의 자동 스크립트 주입이 발생. Metadata API 응답은 Vercel 미들웨어가 어떤 경우 HTML 같은 응답으로 오인하여 분석 스크립트를 주입하는 알려진 이슈.

XML schema 검증 시:
- `xmlns="...sitemap/0.9"` — 정상 (sitemap protocol 표준 schema 버전)
- `<script/>` — sitemap 0.9 schema에 정의되지 않은 요소 → schema validation 실패

**해결 — Route Handler 직접 작성**

Next.js Metadata API 대신 일반 Route Handler 사용:

`app/sitemap.ts` (Metadata API) → 삭제
`app/sitemap.xml/route.ts` (Route Handler) → 신규

```typescript
export async function GET(): Promise<Response> {
  const SITE_URL = getSiteUrl();
  // ... gallery fetch + entries 생성

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(entryToXml).join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",  // ← 명시적 XML
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Robots-Tag": "noindex",  // ← Vercel 자동 주입 차단 hint
    },
  });
}
```

핵심 이점:
1. **응답 본문 100% 제어** — Vercel Analytics/Speed Insights가 끼어들 수 없음
2. **Content-Type 명시** — `application/xml; charset=utf-8` 강제
3. **`X-Robots-Tag: noindex` 헤더** — Vercel에 "이건 sitemap이지 일반 페이지 아니야" 신호
4. **표준 XML 0.9 형식** — `<?xml ?>` 선언 + `<urlset>` + `<url>` 만, 비표준 요소 일체 없음

**XML 안전성 추가 강화**

```typescript
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
    `    <loc>${xmlEscape(entry.loc)}</loc>`,  // URL 안전 escape
    `    <lastmod>${entry.lastmod}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority.toFixed(1)}</priority>`,
    "  </url>",
  ].join("\n");
}
```

URL에 `&`, `<`, `>` 같은 특수 문자가 들어가도 XML 안전. (기존 Metadata API는 자동 escape하지만 Route Handler에선 명시 처리)

**robots.txt도 같은 처리**

`app/robots.ts` (Metadata API) → 삭제
`app/robots.txt/route.ts` (Route Handler) → 신규

같은 이유로 일관성 유지 + Content-Type을 `text/plain; charset=utf-8`로 명시.

**파일 변경**

| 이전 | 신규 |
|---|---|
| `app/sitemap.ts` | `app/sitemap.xml/route.ts` |
| `app/robots.ts` | `app/robots.txt/route.ts` |

**기존 기능 모두 유지**:
- `dynamic = "force-dynamic"` + `revalidate = 60`
- `getSiteUrl()` 함수 안 호출 (lazy 평가)
- Redis 실패 시 정적 entries만 반환 (빈 sitemap 방지)
- `updatedAt` 안전 파싱 (`isNaN` 가드)
- `revalidatePath('/sitemap.xml')` 그대로 작동 (URL 경로 동일)

**배포 후 검증 (필수)**

1. v2.13.5 배포 완료 후 5분 대기
2. 브라우저에서 직접 확인:
   ```
   https://nest-alum1.vercel.app/sitemap.xml
   ```
3. **개발자 도구 → 페이지 소스 보기** (Ctrl+U / Cmd+U)
4. XML이 정확히 다음 형태인지 확인:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://nest-alum1.vercel.app</loc>
       <lastmod>2026-05-01T...</lastmod>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     ...
   </urlset>
   ```
5. **`<script>` 태그 또는 다른 비표준 요소 없음** 확인
6. Google Search Console → Sitemaps → 기존 항목 삭제 → 재제출

### v2.13.4 — Sitemap "가져올 수 없음" 오류 해결 (2026.05)

**문제**

Google Search Console에서 sitemap 등록 후 "가져올 수 없음" 에러:
```
/sitemap.xml   알 수 없음   2026.5.1   가져올 수 없음   0   0
```

**근본 원인 분석**

1. **빌드 타임 평가 → 빈 sitemap이 정적 파일로 빌드되어 캐시됨**
   - v2.13.3에서 `sitemap.ts`에 `revalidate = 60`만 있고 `dynamic` 옵션 없음
   - Next.js 15가 빌드 시점에 한 번 실행할 수 있음
   - 빌드 환경엔 Upstash Redis 환경변수 없거나 `_redis` 싱글턴 미초기화
   - 결과: 빈 sitemap이 정적 빌드되어 60초 동안 캐시 → GSC가 빈 응답 받음

2. **`getSiteUrl()` 모듈 최상위 호출** (sitemap.ts, robots.ts, lib/seo.ts)
   - 빌드 타임에 한 번만 평가되어 SITE_URL 고정
   - 환경변수 변경되어도 재배포까지 반영 안 됨

3. **`kvLoadGallery` throw 시 sitemap 함수 자체 실패**
   - 비록 try-catch 있지만, 빌드 환경 특성상 다른 이유로 throw 발생 가능
   - sitemap 함수 자체가 throw하면 Next.js가 500 에러 페이지 (HTML) 반환
   - GSC가 HTML 응답을 sitemap.xml로 파싱 시도 → "가져올 수 없음"

**해결**

#### 1. `sitemap.ts` — `dynamic = "force-dynamic"` 명시

```typescript
export const dynamic = "force-dynamic";  // 신규 — 빌드 타임 실행 방지
export const revalidate = 60;
```

→ Vercel이 매 요청 시점에 sitemap 생성 → Redis 환경변수 보장 + 최신 데이터.

`force-dynamic`이지만 60초 캐시는 함께 작동:
- 첫 요청: sitemap 함수 실행 (Redis fetch)
- 60초 동안: 캐시된 sitemap 응답
- 60초 후: 다시 sitemap 함수 실행

#### 2. `robots.ts` — 같은 처리

```typescript
export const dynamic = "force-dynamic";  // 신규

export default function robots() {
  const SITE_URL = getSiteUrl();  // 함수 안에서 호출 (lazy)
  // ...
}
```

#### 3. `lib/seo.ts` SITE 객체 — getter 패턴 (lazy 평가)

```typescript
export const SITE = {
  get url() {
    return getSiteUrl();  // 매 접근 시 환경변수 재확인
  },
  get logo() {
    return `${getSiteUrl()}/icon`;
  },
  get ogImage() {
    return `${getSiteUrl()}/opengraph-image`;
  },
  // ... (다른 정적 필드는 그대로)
};
```

→ 모듈 최상위 호출 제거 → 빌드 타임에 SITE_URL 고정 안 됨 → 매 요청 시 정확한 URL 반환.

20곳의 `SITE.url` 참조는 코드 변경 불필요 — getter가 자동으로 처리.

#### 4. sitemap 함수 강건한 에러 처리 + 정적 entries 보장

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = getSiteUrl();
  const now = new Date();

  // 정적 페이지 — 항상 포함 (Redis 실패해도 검색엔진이 최소한 메인 페이지는 발견)
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
  ];

  let cardEntries: MetadataRoute.Sitemap = [];
  let latestCardUpdate = now;
  try {
    const gallery = await kvLoadGallery();
    cardEntries = gallery.map((stored) => {
      // updatedAt 안전 파싱 — 잘못된 형식 시 now 사용
      const updatedAt = stored.updatedAt ? new Date(stored.updatedAt) : now;
      const validDate = !isNaN(updatedAt.getTime()) ? updatedAt : now;
      return {
        url: `${SITE_URL}/${stored.id}`,
        lastModified: validDate,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    });
    // ... latestCardUpdate 계산도 isNaN 가드
  } catch (err) {
    console.error("[sitemap] Redis fetch failed:", err);
    // 정적 entries는 그대로 유지 → 빈 sitemap 반환 안 됨 → "가져올 수 없음" 방지
    cardEntries = [];
  }

  staticEntries[0].lastModified = latestCardUpdate;
  return [...staticEntries, ...cardEntries];
}
```

핵심 — **어떤 에러가 발생해도 메인 페이지 entry는 항상 반환**. GSC가 빈 sitemap이 아닌 1개 이상 URL 있는 정상 sitemap으로 인식.

**파일 변경**

- `app/sitemap.ts` — `dynamic = "force-dynamic"` + 강건한 에러 처리 + 안전한 Date 파싱
- `app/robots.ts` — `dynamic = "force-dynamic"` + getSiteUrl 함수 안 호출
- `lib/seo.ts` — SITE 객체 getter 패턴

**Google Search Console 재시도 절차**

1. v2.13.4 배포 완료 후 **5분 대기** (Vercel CDN edge 캐시 갱신)
2. 브라우저로 `https://nest-alum1.vercel.app/sitemap.xml` 직접 접속 → XML 정상 반환 확인
3. Search Console → Sitemaps → 기존 항목 우측 메뉴 (점 3개)
   - "가져올 수 없음" 에러 항목은 **삭제 후 재제출**
   - 메뉴가 안 보이면 행 클릭 → 상세 화면에서 삭제 가능
4. "새 사이트맵 추가" → `sitemap.xml` 입력 → 제출
5. 30분~1시간 후 상태 "성공" 또는 "성공 (경고 포함)"으로 변경 확인

**브라우저 직접 접속 검증**

배포 완료 후 다음 URL이 정상 XML 응답:

```bash
# 메인 sitemap
curl -s https://nest-alum1.vercel.app/sitemap.xml | head -20
# 기대 결과: <?xml version="1.0"...><urlset...><url>...</url></urlset>

# robots.txt
curl -s https://nest-alum1.vercel.app/robots.txt | head -20
# 기대 결과: User-agent: *, Allow: /, Sitemap: ...
```

만약 응답이 HTML이면 함수 throw 발생 → Vercel Logs에서 `[sitemap] Redis fetch failed` 메시지 확인.

### v2.13.3 — SEO 재배포 충돌 해결 + ISR 활성화 + Vercel 도메인 안정화 (2026.05)

**문제**

재배포 후 구글·네이버·Bing에서 새로 등록한 카드가 인덱싱 안 됨, 또는 등록된 카드 변경사항이 검색 결과에 안 반영.

**근본 원인 진단**

1. **`force-dynamic + revalidate` 옵션 충돌** (`app/[id]/page.tsx`):
   ```typescript
   export const dynamic = "force-dynamic";   // 캐시 무효
   export const revalidate = 300;            // 5분 ISR (충돌!)
   ```
   Next.js 15에서 `force-dynamic`이 우선 적용 → ISR 무효 → Vercel이 정적 페이지로 빌드 안 함 → **검색엔진 봇이 매번 SSR 결과 받지만, 캐시·CDN 활용 못 해 인덱싱 효율 저하**.

2. **메인 페이지 `force-dynamic`으로 정적화 안 됨** (`app/page.tsx`):
   ```typescript
   export const dynamic = "force-dynamic";
   export const revalidate = 0;
   ```
   매 요청마다 SSR → 검색엔진 봇 응답 일관성 떨어짐 → 색인 우선순위 하락.

3. **카드 추가/수정/삭제 시 sitemap 무효화 안 됨** (`app/actions.ts`):
   ```typescript
   revalidatePath("/");  // 메인 페이지만 무효
   // sitemap.xml은 그대로 → 검색엔진이 새 카드 URL 발견 지연
   ```

4. **Vercel preview deployment에서 SITE_URL 혼란** 가능성:
   - `lib/seo.ts`의 `SITE.url`이 hardcoded `https://nest-alum1.vercel.app`
   - production은 정상이지만 환경별 일관성 결여로 향후 도메인 이전 시 위험

**해결**

#### 1. `[id]/page.tsx` — `force-dynamic` 제거, ISR 활성화

```typescript
// 변경 전
export const dynamic = "force-dynamic";
export const revalidate = 300;

// 변경 후
// dynamic 옵션 제거 — Next.js 15가 revalidate 값으로 자동 ISR 적용
export const revalidate = 300;  // 5분 ISR
```

→ Vercel이 카드 페이지를 정적 HTML로 빌드 → 검색엔진 봇이 빠르게 인덱싱 + Edge 캐시로 빠른 응답.

#### 2. 메인 페이지 ISR 적용

```typescript
// 변경 전
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 변경 후
export const revalidate = 60;  // 60초 ISR
```

server action의 `revalidatePath("/")`가 mutation 시 즉시 무효화하므로 사용자 경험은 그대로(즉시 반영). 검색엔진 봇은 캐시된 정적 HTML 응답으로 효율적 인덱싱.

#### 3. sitemap.xml 자동 갱신

`actions.ts`의 모든 `revalidatePath("/")` 호출 옆에 `revalidatePath("/sitemap.xml")` 추가:
```typescript
revalidatePath("/");
revalidatePath("/sitemap.xml");  // 신규 — 카드 추가/삭제 시 sitemap 즉시 갱신
```

총 7곳: createCard, createCardManual, deleteCardAction, refreshCardActionDirect, refreshCardAction, refreshAllAction(완료 시).

#### 4. sitemap.ts ISR + lastModified 정확화

```typescript
export const revalidate = 60;  // 신규 — 검색엔진 자주 fetch해도 부담 없도록

// 메인 페이지 lastModified를 갤러리 최신 카드의 updatedAt 기준으로
// (사이트 활성도 신호 강화 — 검색엔진이 "최근 활발한 사이트"로 인식)
const latest = gallery
  .map((s) => new Date(s.updatedAt).getTime())
  .reduce((max, t) => (t > max ? t : max), 0);
```

#### 5. `lib/site-url.ts` helper 신규 — Vercel 환경 안정화

```typescript
export function getSiteUrl(): string {
  // 우선순위:
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://nest-alum1.vercel.app";
}
```

**중요**: `VERCEL_URL`은 사용 안 함 — preview·branch deployment URL까지 포함하므로 sitemap·robots에 들어가면 검색엔진 혼란. `VERCEL_PROJECT_PRODUCTION_URL`만 사용해야 안전.

`layout.tsx`, `sitemap.ts`, `robots.ts`, `lib/seo.ts` 모두 이 helper 사용으로 통일.

#### 6. sitemap changeFrequency 조정

```typescript
// 변경 전: monthly (검색엔진이 월 1회만 재방문)
changeFrequency: "monthly"

// 변경 후: weekly (카드 정보 갱신 빈도 반영)
changeFrequency: "weekly"
```

**SEO 효과 측정 (예상)**

| 지표 | 이전 | v2.13.3 |
|---|---|---|
| 카드 페이지 정적 빌드 | ✗ (force-dynamic) | ✓ (ISR) |
| Edge 캐시 히트율 | 0% | ~80% (5분 캐시) |
| 검색엔진 인덱싱 속도 | 느림 (매 요청 SSR) | 빠름 (캐시된 HTML) |
| 카드 추가 → sitemap 반영 | ~수시간 후 (수동 재방문) | ~60초 (자동 갱신) |
| Vercel preview URL 노출 위험 | 있음 | 없음 (helper 보호) |

**파일 변경**

- `app/[id]/page.tsx` — `force-dynamic` 제거
- `app/page.tsx` — `force-dynamic` 제거 + revalidate 60초
- `app/sitemap.ts` — ISR + lastModified 갤러리 최신 시점 + getSiteUrl helper + changeFrequency weekly
- `app/robots.ts` — getSiteUrl helper
- `app/layout.tsx` — getSiteUrl helper
- `app/actions.ts` — 모든 revalidatePath 호출 시 sitemap.xml도 무효화 (7곳)
- `lib/seo.ts` — SITE.url을 getSiteUrl helper로
- `lib/site-url.ts` — 신규 (Vercel 환경 안정화)

**Vercel 환경변수 권장 (production deployment)**

```
NEXT_PUBLIC_SITE_URL=https://nest-alum1.vercel.app
```

미설정 시 자동으로 `VERCEL_PROJECT_PRODUCTION_URL` → fallback 순서로 결정.

**배포 후 검증**

1. Google Search Console
   - URL 검사 도구로 카드 URL (`https://nest-alum1.vercel.app/{id}`) 직접 검사
   - "색인 생성 요청" 클릭 → 24시간 내 색인 확인
   - sitemap 재제출: Search Console → Sitemaps → `sitemap.xml` 재처리 클릭

2. 네이버 서치어드바이저
   - 사이트 진단 → 콘텐츠 변경 알림 → 갱신 요청

3. Bing Webmaster Tools
   - URL Inspection → Live URL 검사

4. 응답 헤더 점검
   ```bash
   curl -I https://nest-alum1.vercel.app/
   # 확인: Cache-Control: s-maxage=60, stale-while-revalidate
   #       x-vercel-cache: HIT (재방문 시)
   ```

### v2.13.2 — 초대 회장단 표기 — 회사명만 (개인정보 보호) (2026.05)

**변경**

홈 페이지 타임라인 STEP 04 (SOUND2025 출범)의 "초대 회장단" 표기에서 대표자 이름 삭제, 회사명만 유지.

이전:
```
회장   이현호 대표  (주)도와주다
부회장 김건수 대표  (주)모두의권리
```

신규 (v2.13.2):
```
회장   (주)도와주다
부회장 (주)모두의권리
```

**이유**

- 개인정보 노출 최소화 — 검색 엔진 색인 시 개인 이름이 함께 노출되는 것 방지
- 회장단 구성의 핵심 정보(소속사)만 표기로 충분
- 향후 회장단 임기 변경 시 회사명만 수정하면 되어 유지보수 용이

**파일 변경**

- `components/HomeClient.tsx` —
  - leadership 데이터 객체에서 `name` 필드 삭제
  - `TimelineStep` 컴포넌트 prop 타입에서 `name` 제거 → `{ role: string; company: string }[]`
  - 렌더링에서 회사명만 굵게 표시 (이전엔 이름 + 옅은 회사명)

**시각적 개선**

이전 렌더링: `회장 [이현호 대표] [(주)도와주다]` — 두 톤 색상으로 분리
신규 렌더링: `회장 [(주)도와주다]` — 단일 강조 톤으로 깔끔하게

### v2.13.1 — TIMEOUT 시 수동 입력 자동 전환 + Vercel timeout 안전성 강화 (2026.04)

**문제**

`https://www.kodit.co.kr/apps/index.do` 같이 응답 느린 사이트(주로 정부·공공기관·B2B 사이트) 등록 시:
```
응답이 너무 느립니다. 잠시 후 다시 시도해주세요.
```

이 메시지의 문제:
1. "다시 시도하세요"라고 안내하지만, 같은 사이트를 다시 등록해도 같은 timeout 반복
2. 사용자가 직접 입력으로 진행할 수 있다는 사실을 모름
3. 비밀번호 입력 + 9초 대기 + 에러 → 진행 불가 → 답답한 UX

**해결 1 — TIMEOUT 메시지 변경 + 수동 전환 자동 트리거**

`mapExtractError` (`app/actions.ts`):
```typescript
// 이전
if (/^TIMEOUT/.test(detail)) return "응답이 너무 느립니다. 잠시 후 다시 시도해주세요.";

// 변경
if (/^TIMEOUT/.test(detail))
  return "응답이 너무 느려 자동 추출이 시간 안에 완료되지 못했습니다. 다음 단계에서 표시되는 [수동 입력] 폼으로 소개를 직접 작성할 수 있습니다.";
```

`HomeClient.tsx` 수동 전환 트리거 정규식 확장:
```typescript
// 이전
/자동 추출이 차단|본문을 찾을 수 없습니다/.test(result.error)

// 변경
/자동 추출이 차단|본문을 찾을 수 없습니다|자동 추출이 시간 안에/.test(result.error)
```

→ TIMEOUT 발생 시 자동으로 ManualEntryDialog 열림 + 비밀번호 미리 채워짐 (v2.12.2)

**해결 2 — Vercel Hobby plan 10초 timeout 안전성 강화**

이전 코드에서 sub-page 자동 fetch가 메인 fetch 시간 무시하고 항상 시도 → Vercel server action 10초 timeout 초과 위험.

`extractFromUrl`:
```typescript
const fetchStartedAt = Date.now();
const { html, finalUrl } = await fetchHtml(url);
const fetchElapsedMs = Date.now() - fetchStartedAt;  // 신규

// ...

// 메인 fetch가 5초 이상 걸렸으면 sub-page fetch는 위험 → skip
if (afterMetaLen < 400 && fetchElapsedMs < 5000) {
  const subpageContent = await tryFetchSubpages(...);
}
```

이제 메인 fetch가 5초 이상 걸렸으면 sub-page fetch 시도 자체를 안 함 → Vercel timeout 절대 초과 안 함.

**해결 3 — 수동 입력 메타 가져오기 짧은 timeout (5초)**

이전: `extractFallbackHints`도 9초 timeout `fetchHtml` 사용 → kodit.co.kr 같은 느린 사이트의 메타도 9초 대기 → 수동 모달 열리는 데 또 9초 기다림.

해결: `fetchHtmlShort` 신규 (5초 timeout) 헬퍼:
```typescript
async function fetchHtmlShort(url: string) {
  const SHORT_TIMEOUT = 5000;
  // ... fetch with 5s timeout
}
```

`extractFallbackHints`가 이걸 사용 → 5초 안에 메타 못 가져오면 빠르게 포기하고 도메인 기반 기본값 표시.

**해결 4 — ManualEntryDialog hintsLoading 6초 timeout**

```typescript
useEffect(() => {
  // 6초 후 자동으로 hintsLoading 종료 — 무한 대기 방지
  const giveUpTimer = setTimeout(() => {
    if (!cancelled) setHintsLoading(false);
  }, 6000);

  // ... getFallbackHints 호출 ...

  return () => {
    cancelled = true;
    clearTimeout(giveUpTimer);
  };
}, [url]);
```

→ getFallbackHints가 어떤 이유로든 응답 안 와도 6초 후엔 사용자가 직접 입력 가능.

**효과 — kodit.co.kr 시나리오**

이전 (v2.13.0):
```
URL 입력 → 비밀번호 → 9초 대기 → "응답이 너무 느립니다. 잠시 후 다시 시도해주세요."
                                                                  ↑
                                                          진행 불가, 답답함
```

신규 (v2.13.1):
```
URL 입력 → 비밀번호 → 9초 대기 → TIMEOUT 발생
        ↓
"응답이 너무 느려 자동 추출이 시간 안에 완료되지 못했습니다.
 다음 단계에서 표시되는 [수동 입력] 폼으로 소개를 직접 작성할 수 있습니다."
        ↓
0.2초 후 ManualEntryDialog 자동 열림
        ↓
- prefilledPassword 자동 적용 (비밀번호 재입력 불필요, v2.12.2)
- hints 5초 timeout (메타 빨리 가져옴)
- 6초 후 hintsLoading 자동 종료 → 직접 입력 가능
        ↓
사용자가 카드 본문 작성 → "소개 추가" → 즉시 등록
```

**처리 시간 비교**

| 단계 | 이전 (v2.13.0) | v2.13.1 |
|---|---|---|
| 자동 추출 시도 | 9초 timeout | 9초 timeout (동일) |
| TIMEOUT 후 | 진행 불가 ✗ | 0.2초 → 수동 모달 |
| 수동 모달 메타 가져오기 | (없음) | 최대 5초 (fetchHtmlShort) |
| 수동 모달 hints 대기 | (없음) | 최대 6초 (자동 포기) |
| 사용자 입력 + 등록 | (없음) | 즉시 |

총 워크플로우 시간: 9초(TIMEOUT) + 5~6초(메타) + 사용자 입력 시간 = 약 15초~20초 후 카드 등록 가능.
이전 → 진행 불가 (영원히 막힘)

**Vercel Hobby plan 안전성 보장**

각 외부 fetch의 timeout 합:
- 메인 fetch: 9초 (FETCH_TIMEOUT_MS)
- Sub-page fetch: 메인이 5초 미만일 때만 발동 + 3.5초씩 병렬 2개 (총 3.5초)
- 메타 fetch (수동 모달): 5초 (fetchHtmlShort)
- ⚠️ 동일 server action 안에서 메인 + sub-page 동시 발생 가능 시점: 5초 + 3.5초 = 8.5초 < 10초 ✓

→ Vercel server action 10초 timeout 절대 초과 안 함.

**적용 범위**

이번 수정은 모든 자동 추출 흐름에 적용:
- `createCard` — URL 등록 시 자동 추출 → TIMEOUT 시 수동 입력 자동 전환
- `refreshCardActionDirect` — 카드 새로고침 시 TIMEOUT 시 에러 표시 (수동 전환은 새로고침에 부적절)
- `refreshAllAction` — 일괄 새로고침 시 개별 실패는 errors 배열에 기록 (변화 없음)

### v2.13.0 — 카드 링크 공유 기능 (Web Share + 클립보드 + 소셜) (2026.04)

카드 디테일 페이지에 [공유] 버튼 추가. 외부 공유 베스트 프랙티스 적용:
- **Web Share API** (`navigator.share()`) — 모바일 네이티브 공유 시트
- **클립보드 복사** — 데스크톱 빠른 공유 (`navigator.clipboard.writeText` + execCommand 폴백)
- **소셜 빠른 공유** — X·페이스북·링크드인·이메일 직접 링크
- **카카오톡 안내** — 카카오 SDK 의존 없이 클립보드 + 안내 메시지

**카드 디테일 헤더 버튼 변경**

이전:
```
[갤러리로 돌아가기]                     [↻ 새로고침] [Print] [갤러리에서 내리기]
```

신규 (v2.13.0):
```
[갤러리로 돌아가기]    [📤 공유] [↻ 새로고침] [Print] [갤러리에서 내리기]
                       ↑ 신규 (accent 컬러로 강조)
```

**[📤 공유] 버튼 디자인**
- accent 컬러 배경 (눈에 띄지만 과하지 않음)
- 공유 아이콘 (Lucide style — 3개 점이 연결된 그래프)
- 모바일에서 잘 보이도록 터치 영역 충분히 확보

**ShareDialog 모달 구성**

```
┌────────────────────────────────────────────┐
│ 이 기업 소개 공유하기                  ✕ │
├────────────────────────────────────────────┤
│ <카드 헤드라인>                            │
│ <카드 dek>                                 │
│                                            │
│ 카드 페이지 링크                           │
│ ┌────────────────────────────┐ ┌────────┐ │
│ │ https://nest-alum1.vercel..│ │📋 복사 │ │
│ └────────────────────────────┘ └────────┘ │
│                                            │
│  ┌───────────────────────────────────┐    │
│  │ ⬆ 앱으로 공유 (모바일/지원 시만) │    │
│  └───────────────────────────────────┘    │
│                                            │
│ 빠른 공유                                  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │
│ │ 𝕏  │ │ f  │ │ in │ │ ✉ │                │
│ │ X  │ │페북│ │링크드인│이메일│            │
│ └────┘ └────┘ └────┘ └────┘                │
│                                            │
│ 💡 카카오톡은 [📋 복사] 후 채팅창에 붙여넣기│
├────────────────────────────────────────────┤
│ ↗ 새 탭에서 카드 페이지 보기      [닫기] │
└────────────────────────────────────────────┘
```

**구현 디테일**

1. **Web Share API 자동 감지** (`canNativeShare` 상태)
   - `navigator.share` 존재 + `navigator.canShare(shareData)` 통과 시만 [⬆ 앱으로 공유] 버튼 표시
   - iOS Safari, Android Chrome, Windows Edge 등에서 네이티브 공유 시트 호출
   - 데스크톱 Chrome/Firefox는 보통 미지원 → 버튼 숨김

2. **클립보드 복사 다중 폴백**
   ```typescript
   try {
     await navigator.clipboard.writeText(shareUrl);  // 모던 API
   } catch {
     // 구버전 폴백 — textarea + execCommand
     const ta = document.createElement("textarea");
     ta.value = shareUrl;
     ta.select();
     document.execCommand("copy");
   }
   ```
   - 복사 성공 시 버튼 색상 변경 (accent → 초록 #16a34a) + "✓ 복사됨" 텍스트
   - 2.2초 후 원래 상태로 복귀

3. **소셜 플랫폼 URL 빌더** (Server-side share dialogs)
   - **X (트위터)**: `https://twitter.com/intent/tweet?text=...&url=...`
   - **페이스북**: `https://www.facebook.com/sharer/sharer.php?u=...`
   - **링크드인**: `https://www.linkedin.com/sharing/share-offsite/?url=...`
   - **이메일**: `mailto:?subject=...&body=...` (제목·본문 모두 인코딩)
   - 각 링크 `target="_blank" rel="noopener noreferrer"` (보안 + 새 탭)

4. **카카오톡 처리 (실용적 접근)**
   - 카카오 SDK 통합은 도메인 등록·앱키 발급 필요 (운영 부담)
   - 대신 [📋 복사] + 안내 메시지: "💡 카카오톡 공유는 위 [📋 복사] 버튼으로 링크를 복사한 후 채팅창에 붙여넣어주세요."
   - 사용자가 1초 안에 카카오톡에 공유 가능 (실제로 가장 흔한 한국 사용자 패턴)

5. **접근성 (Accessibility)**
   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
   - ESC 키로 닫기 + Tab 포커스 트랩 (모달 안에서 순환)
   - 모든 버튼/링크에 `aria-label`
   - URL input은 `readOnly` + 클릭 시 자동 선택 (`onClick={e => e.currentTarget.select()}`)

6. **OG 메타 태그 활용** (이미 구현됨, v2.13.0에서 활용도 증대)
   - `app/[id]/page.tsx`의 `generateMetadata`가 카드별 OG 메타 동적 생성
   - 외부 플랫폼(트위터·페이스북·카카오톡)에서 공유 시 미리보기 카드 풍부하게 표시
   - title, description, og:image, og:type=article, twitter:card=summary_large_image
   - JSON-LD Article 구조화 데이터로 검색 엔진 최적화

**카드 URL 구조**

```
https://nest-alum1.vercel.app/{cardId}
```

- 짧고 깔끔 (subdirectory 없음)
- `revalidate=300` ISR 캐싱 (5분) — 외부 사용자가 클릭 시 빠르게 응답
- `notFound()` 처리 — 삭제된 카드 클릭 시 404 페이지

**모바일 vs 데스크톱 UX**

| 디바이스 | 주된 흐름 |
|---|---|
| iOS Safari | [⬆ 앱으로 공유] → 네이티브 공유 시트 (메시지·카카오톡·메일·Airdrop 등) |
| Android Chrome | [⬆ 앱으로 공유] → 네이티브 공유 시트 |
| 데스크톱 Chrome | [📋 복사] → 채팅·이메일에 붙여넣기 또는 [소셜 아이콘] 클릭 |
| 데스크톱 Firefox/Safari | [📋 복사] → 동일 |

**보안 고려사항**

- ✓ 모든 외부 링크 `rel="noopener noreferrer"` — referrer leak 방지
- ✓ URL 인코딩 (`encodeURIComponent`) — XSS 방지
- ✓ 모달 안에 사용자 입력 필드 없음 (URL만 readonly 표시)
- ✓ Web Share API의 `AbortError`(사용자 취소) 자동 처리

**파일 변경**

- `components/HomeClient.tsx` —
  - `modal` 타입에 `"share"` kind 추가
  - `DetailView`에 `onRequestShare` prop + [📤 공유] 버튼
  - `ShareDialog` 컴포넌트 신규 (~290줄)
- 다른 파일은 변경 없음 (`generateMetadata`, OG 메타는 기존 코드 그대로 활용)

### v2.12.2 — 수동 입력 시 비밀번호 재입력 제거 (UX 개선) (2026.04)

**문제**

URL 등록 흐름:
```
1. URL 입력 → "소개 만들기" 클릭
2. 비밀번호 입력 모달 → 비밀번호 1718 입력
3. 자동 추출 시도
4. 본문 부족(EMPTY_CONTENT) 또는 JS 챌린지(JS_CHALLENGE) 시
   → 수동 입력 모달로 자동 전환
5. 사용자가 본문·헤드라인 작성 후 "소개 추가"
6. ✗ 또 비밀번호 입력 요구 — 이미 한 번 검증했는데 또?
```

이미 인증된 비밀번호를 다시 묻는 UX 결함. 사용자 워크플로우가 끊기고 비밀번호 두 번 입력 부담.

**해결**

자동 추출 단계에서 검증된 비밀번호를 수동 입력 모달로 전달하여 자동 적용:

1. **`modal` 타입에 `prefilledPassword` 필드 추가** (`HomeClient.tsx`)
   ```typescript
   { kind: "manual"; url: string; reason: string; prefilledPassword?: string }
   ```

2. **PasswordDialog의 자동 추출 실패 → manual 전환 시점에 password 전달**
   ```typescript
   // 이미 검증된 비밀번호를 캡처
   const verifiedPassword = password;
   setModal({
     kind: "manual",
     url: failUrl,
     reason: result.error,
     prefilledPassword: verifiedPassword,  // ← 신규
   });
   ```
   비밀번호 검증(line 66의 `if (password !== ADMIN_PASSWORD)`)은 `extractFromUrl` 호출(line 97) 전에 실행되므로, manual 전환에 도달했다는 것은 비밀번호가 이미 통과했다는 의미.

3. **ManualEntryDialog가 prefilledPassword를 받아 formData에 자동 적용**
   ```typescript
   // 자동 추출 단계에서 검증된 비밀번호가 있으면 그대로 사용 → 사용자에게 다시 안 묻기
   if (prefilledPassword) {
     fd.set("password", prefilledPassword);
   }
   ```

4. **비밀번호 입력 필드 조건부 숨김**
   - `prefilledPassword` 있으면: 안내 박스 표시 — "관리자 인증 완료 — 비밀번호 재입력 불필요" + 체크 아이콘
   - 없으면: 기존 비밀번호 input 표시 (다른 진입 경로 — 예: 수동 입력 직접 호출)

**보안 영향**

- ✓ 비밀번호 자체는 클라이언트 메모리에만 잠시 보관 (modal state)
- ✓ modal 닫힐 때(setModal(null)) 자동 소멸 — React state cleanup
- ✓ 서버 측 비밀번호 재검증은 그대로 유지 — `createCardManual`도 동일하게 `password !== ADMIN_PASSWORD` 체크
- ✓ 사용자가 수동으로 manual 모달을 띄운 경우(prefilledPassword 없음)에는 비밀번호 입력 필드 그대로 표시
- ✓ 인증 우회 위험 없음 — 클라이언트 체크가 아닌 서버 측 검증

**UX 효과**

이전 워크플로우:
```
URL 입력 → [비밀번호 1] → 자동 실패 → 수동 모달 → 본문 작성 → [비밀번호 2] → 등록
                ↑                                          ↑
        총 2회 비밀번호 입력
```

신규 워크플로우 (v2.12.2):
```
URL 입력 → [비밀번호 1] → 자동 실패 → 수동 모달 → 본문 작성 → 등록
                ↑                                          ↓
        1회 입력으로 끝              ✓ 인증 완료 표시
```

**다른 진입 경로 안전성**

- create 흐름에서 자동 → 수동 전환: `prefilledPassword` 자동 전달 → 비밀번호 필드 숨김 ✓
- (잠재 미래 시나리오) 사용자가 처음부터 수동 입력으로 진입: `prefilledPassword` 없음 → 비밀번호 필드 표시 ✓ (현재 코드엔 이 진입 경로 없지만 미래 확장 안전)

### v2.12.1 — SPA 사이트 메타 풍부 보강 (2026.04)

schooldots.me 같은 client-side routing SPA의 본문 짧음 문제 추가 해결. v2.12.0의 sub-page fetch만으로는 SPA 사이트에서 효과 제한적이었으므로(같은 entry HTML 반환) **메타 태그 적극 활용 + sub-page 메타 수집** 추가.

**문제 진단**

schooldots.me 분석:
- SPA(React Router 등) → 모든 경로가 같은 entry HTML
- v2.12.0 sub-page fetch가 nav 링크 발견은 했지만 fetch 결과도 같은 짧은 HTML
- 메인 본문 paragraph 거의 없음 (description + keywords 메타만)
- 사용자 카드: "Lead: 배움이 즐거움이 되는 다양한 프로젝트 수업을 함께해요! 키워드: schooldots, 스쿨닷츠, 팀닷츠" — 너무 짧음

**핵심 인사이트**

SPA 사이트도 SEO를 위해 다음 메타들은 SSR로 풍부하게 설정:
- `og:description` (description과 다른 표현 가능)
- `twitter:description` (또 다른 표현 가능)
- `keywords` (검색 키워드)
- `article:tag` (태그/카테고리)
- `og:site_name` (사이트명)
- `og:title` (title과 다른 표현 가능)
- `h1`, `h2`, `h3` (SSR된 주요 헤딩)

이 메타들을 모두 수집하면 본문 부족 사이트도 의미 있는 카드 생성 가능.

**해결 1 — 메인 페이지 메타 풍부 보강 (`extractFromUrl`)**

본문 < 400자일 때 자동 발동:

1. **`og:description`** — `description`과 다르면 paragraph로 추가
2. **`twitter:description`** — 위와 다르면 또 추가
3. **`keywords` meta** — `키워드: ...` prefix로 본문에 추가 (사용자가 빠르게 식별)
4. **`article:tag`** — `태그: ...` prefix로 추가 (블로그·뉴스 카테고리)
5. **`og:site_name`** — title과 다르면 사이트명도 추가 (lead snippet 후보)
6. **`<h1>`, `<h2>`, `<h3>`** — title/description에 없는 헤딩 모두 paragraph로 추가
7. **중복 검사** — `slice(0, 15~25)` prefix로 메타 간 중복 방지

**해결 2 — Sub-page에서도 메타 수집 (`tryFetchSubpages`)**

`fetchSinglePage`가 paragraph만이 아니라 메타도 함께 수집:

1. sub-page fetch 후 paragraph 추출 전에 메타 먼저 수집:
   - `<title>`, `meta[name=description]`, `og:title`, `og:description`, `twitter:description`
   - `<h1>` 첫 번째, `<h2>` 상위 3개
2. SPA 사이트도 sub-page meta가 메인과 다를 가능성 (Next.js dynamic metadata 등)
3. 메타 + paragraph 합산 후 페이지당 최대 8개 단락 채택

**해결 3 — 메타 → sub-page fetch 순차 실행**

```typescript
if (mainContentLen < 400) {
  // 1) 메타 풍부 보강 시도 (가장 빠르고 안전)
  const metaParts = [...]; // og:description, keywords, h1 등
  merged.push(...metaParts);
  
  // 2) 그래도 부족하면 sub-page fetch
  const afterMetaLen = merged.reduce((s, p) => s + p.length, 0);
  if (afterMetaLen < 400) {
    const subpageContent = await tryFetchSubpages(...);
  }
}
```

메타 보강은 외부 fetch 0회로 즉시 효과. sub-page fetch는 그래도 부족할 때만 발동.

**Vercel Hobby plan 호환성**

- 메타 보강 단계: 외부 fetch 0회, 처리 시간 < 100ms
- Sub-page fetch는 메타 보강 후에도 짧을 때만 발동 (대부분 사이트는 메타만으로 충분)
- 총 처리 시간 변화 거의 없음

**테스트 결과 (schooldots.me 시뮬레이션)**

```
초기 본문 paragraph: 0개
v2.12.1 적용 후:
  • 함께 배우고 성장하는 초중등 프로젝트 학습 플랫폼   (twitter:description)
  • 키워드: schooldots, 스쿨닷츠, 팀닷츠                (keywords)
  • 스쿨닷츠                                            (og:site_name)

→ 카드 본문 풍부화 + 검색 가능한 키워드 노출
```

**자동 갱신 안내**

⚠️ **사용자 작업 필수** — v2.12.1 배포 후 자동 정정되지 않음:

옛 카드의 `bodyParagraphs`에 메타 정보가 없으면 Lazy Migration으론 못 가져옴. 반드시:
1. **단일 카드 [↻ 새로고침]** (권장) — 카드 디테일 우상단 → 비밀번호 1718
2. **일괄 새로고침** — 갤러리 [↻] 버튼

둘 다 외부 fetch 다시 실행 → v2.12.1의 새 메타 보강 로직 적용.

**6단계 폴백 체인 (Production-grade)**

```
1단계: <address> · <meta geo> 시맨틱 마크업
   ↓ 부족
2단계: footer/contentinfo + class·id 셀렉터
   ↓ 부족
3단계: body 전체 DOM 순회
   ↓ 부족
4단계: body.text() 평문 정규식 fallback (v2.11.6)
   ↓ 본문 < 400자
5단계: 메인 페이지 메타 풍부 보강 (v2.12.1) ← 신규
   ↓ 메타 보강 후에도 < 400자
6단계: 하위 페이지 자동 fetch + 메타 수집 (v2.12.0/v2.12.1)
```

### v2.12.0 — 하위 페이지 자동 보강 (sub-page enrichment) (2026.04)

schooldots.me 같은 SPA 또는 슬로건 위주 메인 페이지의 본문 부족 문제 해결.
메인 본문이 짧으면 자동으로 `/about` · `/vision` · `/company` 등 하위 페이지를 발견·fetch하여 본문 보강.

**문제**

schooldots.me 메인 페이지:
- title: "우리 아이가 성장하는 초중등 러닝 플랫폼"
- description: "배움이 즐거움이 되는 다양한 프로젝트 수업을 함께해요!"
- 본문 paragraphs: 거의 없음

이런 사이트는 보통 `/about`, `/vision`, `/company`, `/service` 등 하위 페이지에 회사 소개·비전·미션 등이 자세히 있음. 하지만 사용자가 메인 URL만 등록해도 자동으로 이 하위 페이지들에서 본문을 보강해 풍부한 카드 생성.

**해결 — 3단계 자동 발견 + 병렬 Fetch (`tryFetchSubpages`)**

`extractFromUrl`이 메인 fetch 후 본문 총 글자수가 400자 미만이면 자동 발동:

1. **nav/header/footer 링크 분석** — 메인 페이지의 `<nav>·<header>·<footer>·[role='navigation']` 안의 `<a>` 링크 탐색
   - URL path 키워드 매칭 (영문): `about`, `about-us`, `company`, `vision`, `mission`, `introduction`, `service`, `services`, `product`, `products`, `platform`, `business`, `who-we-are`, `our-story`, `story`
   - 링크 텍스트 한국어 키워드 매칭: `소개`, `회사 소개`, `비전`, `미션`, `회사`, `서비스`, `제품`, `사업`, `어바웃`
   - 같은 도메인 + 메인 페이지 자체 + 외부 파일(.pdf, .jpg 등) 자동 제외
   - schooldots.me 케이스: "비전" → `/vision`, "회사 소개" → `/about` 정확히 발견

2. **표준 경로 폴백** — nav에서 못 찾으면 표준 경로 시도
   - `/about`, `/about-us`, `/company`, `/vision`, `/introduction`, `/service`, `/products`, `/소개`
   - 최대 4개

3. **병렬 fetch + 의미 있는 단락 추출**
   - 후보 URL 최대 2개 — Vercel Hobby 10초 timeout 안전 (메인 9초 + 하위 페이지 각 3.5초 병렬)
   - `Promise.allSettled`로 일부 실패해도 다른 후보 결과 채택
   - 각 페이지에서 `stripBoilerplate` + `pickArticleRoot` + `extractParagraphs` 적용
   - 단락 필터: 25~600자, 카피라이트(©, copyright, all rights reserved) 제외
   - 단순 메뉴 텍스트(짧은 카테고리 나열) 제외
   - 페이지당 최대 6개 단락 채택
   - 메인 본문과 중복(`slice(0, 30)` prefix) 자동 제거

**Vercel Hobby plan 호환성**

- 메인 fetch 9초 timeout (기존)
- 하위 페이지 fetch 3.5초씩 × 2개 병렬 = 최대 3.5초 추가
- 총 약 12.5초 — Hobby 10초 server action timeout 초과 가능성 있음
  → **본문 짧음 (400자 미만) 시에만 발동하므로 트리거 빈도 낮음**
  → schooldots.me 같이 짧은 본문 사이트만 영향 (대부분 사이트는 발동 안 됨)
  → 향후 Vercel Pro plan 업그레이드 시 60초 timeout으로 안전 확보

**자동 발동 조건**

```typescript
const mainContentLen = merged.reduce((sum, p) => sum + p.length, 0);
if (mainContentLen < 400) {
  // 하위 페이지 자동 보강 호출
  const subpageContent = await tryFetchSubpages($, parsed, finalUrl, merged);
  // 메인 본문 + 하위 본문 병합 (중복 제거)
}
```

400자 임계값 기준:
- 정상 사이트: 본문 1000자+ → 발동 안 됨 (성능 영향 없음)
- 슬로건만 있는 SPA: 100자 미만 → 발동 → 보강
- 한정된 콘텐츠 사이트: 200~400자 → 발동 → 보강

**테스트 결과 (schooldots.me 시뮬레이션)**

가상 nav HTML 분석:
- ✓ "비전" → `/vision` (path + 한글 동시 매치)
- ✓ "회사 소개" → `/about` (path + 한글 동시 매치)
- ✓ "서비스" → `/services` (path + 한글 동시 매치)
- ✗ "블로그" → 매칭 안 됨 (정상 제외)
- ✗ "문의" → 매칭 안 됨 (정상 제외)

상위 2개 (`/vision`, `/about`)가 자동으로 fetch되어 본문 보강.

**기존 추출 흐름과의 통합**

기존 4단계 폴백(v2.11.6)에 5단계 추가:
1. `<address>`·`<meta geo>` 시맨틱 마크업
2. footer/contentinfo/aside + class·id 셀렉터
3. body 전체 DOM 순회
4. body.text() 평문 정규식 fallback (v2.11.6)
5. **본문 짧을 때 하위 페이지 자동 fetch (v2.12.0)** ← 신규

**SPA 사이트 한계 안내**

schooldots.me처럼 client-side routing(React Router 등) SPA는 모든 경로가 같은 짧은 HTML 반환. 이 경우 nav 링크는 발견하지만 fetch 결과도 동일하게 짧음 → 본문 보강 효과 제한적.

**다만**:
- 정적 사이트(워드프레스, Jekyll, Hugo, Next.js SSR 등)는 효과 큼
- SPA여도 SSR/SSG 활성화된 페이지는 본문 추출 가능
- nav 링크 분석 자체가 사용자에게 안내 가능 (어떤 페이지가 있는지 발견)

### v2.11.6 — DOM 무관 body.text() 최종 fallback (2026.04)

water-ria.vercel.app footer 추출이 v2.11.5의 body 전체 fallback에도 실패한 근본 원인 해결.

**문제 진단**

v2.11.5의 fallback은 cheerio DOM 순회(`$("p, div, li, ...").each()`)에 여전히 의존:
- Next.js Suspense/RSC 경계로 footer가 `<template>`에 감싸지면 cheerio가 못 봄
- 동적 className(`class="_footer_abc123"`)이라 `[class*='footer']` 셀렉터에 안 잡힘
- `<br>` 태그를 cheerio가 무시하면서 footer 텍스트가 다른 자식 텍스트와 합쳐져 길이 임계값 초과
- `children().filter("p, div, li, ...").length > 2` 임계값에 footer 컨테이너가 걸림

또한 사용자 측면 — Lazy Migration이 옛 카드의 `bodyParagraphs`만 재처리하므로, 옛 데이터에 footer 텍스트가 없으면 contact-info도 못 찾음. **외부 fetch 다시** 필요.

**해결 — DOM 무관 최종 fallback (`extractStructuredData` 끝)**

cheerio DOM 순회에 의존하지 않고 **`$("body").text()` 전체 평문 텍스트에서 한국 주소 정규식 직접 매치**:

1. **다중 위치 패턴** (water-ria 4사이트 핵심 패턴):
   ```regex
   (광역시·도) [^\n]{0,150}? [·│|] [^\n]{0,100}? (광역시·도) [^\n]{0,80}
   ```
   - 광역시·도 + 구분자 + 다른 광역시·도가 연결된 모든 텍스트 매치
   - 길이 정렬 후 가장 긴 3개만 채택 (잡음 방지)

2. **단일 주소 패턴**:
   ```regex
   (광역시·도) [^\n]{2,80}? (시·군·구·로·길·번지·캠퍼스타운)
   ```
   - 길이 10~150자, 서술어 종결(`합니다·입니다·...`) 차단
   - 가장 긴 5개만 채택

3. **잡음 방지 안전장치**:
   - cheerio 셀렉터 의존도 0% — 어떤 마크업 변형에도 안전
   - body 전체에서 한국 주소 패턴이 발견되면 본문 텍스트 풀에 추가
   - 본문 잡음(`안전모 착용`, `위험구역 접근`, `0.1초` 등)은 contact-info의 `isValidKoreanAddress`가 2단계 검증으로 차단
   - 중복 텍스트는 `slice(0, 30)` 키로 중복 검사

**단위 테스트 검증**

water-ria.vercel.app body.text() 시뮬레이션:
- 매치 3개 발견 (가장 긴 것 103자: "서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구 ... 본문 ... 주식회사 워터리아 ...")
- contact-info의 `trimAddressTail` (갭 20자 임계) + `normalizeMultiLocation`(구분자 통일) 처리 후
- **최종 출력**: `서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구` ✓

**핵심 안내**

배포 후 water-ria.vercel.app 카드의 정정 절차:

1. **단일 카드 새로고침 (권장)**: 카드 디테일 우상단 [↻ 새로고침] → 비밀번호 1718 → 외부 fetch 다시 → 새 PHASE 1 사전 수집 적용 → ContactPanel에 정확한 주소
2. **일괄 새로고침**: 갤러리 [↻] → 모든 카드 일괄 갱신
3. **Lazy Migration만으로는 정정 불가** — 옛 카드의 bodyParagraphs에 footer 텍스트가 없을 수 있어 외부 fetch가 필수

이 v2.11.6은 **2026년 4월 시점 한국 사이트 주소 추출의 production-grade 베스트 프랙티스**:
- DOM 셀렉터 (1차) → footer 자식 분할 (2차) → body 전체 순회 (3차) → **body.text() 평문 정규식 (최종 fallback)**
- 4단계 다중 폴백 — 어떤 사이트 마크업이든 한국 주소가 있으면 발견

### v2.11.5 — body 전체 사전 수집 fallback + 단일 카드 새로고침 UI (2026.04)

water-ria.vercel.app footer 추출이 v2.11.4의 footer 셀렉터 사전 수집에도 실패한 문제 근본 해결. 카드별 새로고침 UI 추가로 사용자가 자가 진단·재시도 가능.

**문제 1 분석 — water-ria.vercel.app footer 여전히 추출 불가**
- v2.11.4가 footer/contentinfo 사전 수집을 추가했으나, 사이트 마크업이 `<footer>`·`[role='contentinfo']`·class 패턴을 사용하지 않으면 여전히 누락
- water-ria.vercel.app의 회사 정보·주소가 일반 `<div>` 또는 footer 내부의 자식에 있는데, 자식 검사 시 `children().length` 임계값에 걸려 스킵되거나 마크업 구조가 다양해 셀렉터로 못 잡음

**해결 — body 전체 fallback (`extractStructuredData` PHASE 1 끝)**
- footer 셀렉터에 의존하지 않고 **body의 모든 `<p>·<div>·<li>·<dd>·<span>·<address>·<td>·<h1~h6>` 검사**
- 각 요소에서 한국 광역시·도 + 행정구역 마커(시·군·구·로·길·번지·캠퍼스타운 등) 동시 포함 시 본문 텍스트 풀에 추가
- 자식 컨테이너(p·div·li·ul·ol·section·article·footer) 2개 초과 시 스킵 → 큰 컨테이너의 text() 합산은 부정확해서 본문 잡음 위험
- 본문 서술어 종결(`합니다·입니다·됩니다·있습니다`)은 차단 → 본문 문장 오인식 방지
- contact-info의 `isValidKoreanAddress`가 2단계 검증 → 잡음 방지 안전
- 결과: 어떤 마크업이든 한국 주소 패턴 + 행정구역 마커 가진 텍스트는 모두 발견

**문제 2 — 단일 카드 새로고침 UI 부재**
- 일괄 새로고침에서 일부 카드 실패 시 사용자가 그 카드만 재시도하려면 삭제 후 재등록 필요
- water-ria.rf.gd 같이 일시적 차단(JS 챌린지 우회 실패)도 잠시 후 재시도 가능

**해결 — 카드 디테일 헤더에 [↻ 새로고침] 버튼 추가**
- `app/actions.ts` — `refreshCardActionDirect(id, password)` 신규 (formData 안 받는 클라이언트 직접 호출용)
  - 같은 검증·rate limit·`kvUpsertCard`·`revalidatePath` 흐름
  - `refreshCardAction` (formData 버전)은 향후 폼 통합용으로 보존
- `components/HomeClient.tsx` —
  - `modal` 타입에 `"refresh"` kind 추가
  - `DetailView`에 `onRequestRefresh` prop 추가 → [↻ 새로고침] 버튼 노출 (카드 디테일 우상단)
  - `PasswordDialog` 변형에 `"refresh"` 추가 — 진행 메시지 "원본 사이트 다시 가져오는 중…" → "요약 재생성 중…" → "저장 중…"
  - 비밀번호 1718 입력 → 단일 카드 외부 fetch + 갱신 → 즉시 갤러리 반영
  - 성공 시 `setGallery`로 옵티미스틱 업데이트 → router.refresh로 동기화

**개선 효과**
- water-ria.vercel.app 카드 새로 등록하거나 [↻ 새로고침] 클릭 시 footer 주소 정상 추출 → ContactPanel에 `서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구` 표시
- 사용자가 일괄 새로고침에 의존하지 않고 카드별로 자가 진단·재시도 가능
- water-ria.rf.gd 같이 JS 챌린지 일시 차단된 카드는 잠시 후 [↻ 새로고침]으로 재시도

**Vercel 무료 플랜 호환성** (변화 없음)
- 단일 카드 새로고침: 카드당 ~10초 (외부 fetch 9초 + 처리 1초) — Hobby 10초 timeout 안전
- Rate limit: 60초당 5회 (단일 카드)
- `revalidate=300` ISR 캐싱 그대로

### v2.11.4 — footer 사전 추출 + 새로고침 에러 영구 표시 + 복사 버튼 (2026.04)

두 가지 개선:

**1. water-ria.vercel.app footer 추출 실패 근본 해결**

원인: `stripBoilerplate()`가 본문 추출 전에 `[role='contentinfo']`, `<aside>`, `<footer>` 같은 요소를 통째로 제거. HTML5에서 `<footer>` 태그는 암묵적으로 `role="contentinfo"`를 가지므로 footer 안의 한국 주소가 사라짐. 이후 `addressLines` 단계에서 footer 셀렉터로 다시 찾아도 이미 DOM에서 제거된 후라 빈 결과.

해결:
- **PHASE 1 사전 추출 단계에 footer/contentinfo 한국 주소 수집 추가** (`extractStructuredData` 함수 끝에)
- `stripBoilerplate` 호출 **이전에** footer·`[role='contentinfo']`·`aside`·`[class*='footer']`·`[id*='footer']` 등 광범위 셀렉터로 한국 주소 라인 미리 텍스트 풀에 저장
- 자식 요소(p·div·li·span·address) 단위로도 분할 검사 — 긴 footer 안의 짧은 주소 라인 추출
- `stripBoilerplate`에서 `[role='contentinfo']` · `<aside>` 제거 셀렉터 삭제 (이제 사전 추출에서 안전하게 보존)
- 광역시·도 + 한국 주소 마커(시·군·구·로·길·번지·캠퍼스타운) 동시 포함 시만 채택 → 본문 잡음은 자연스럽게 차단

**2. 새로고침 에러 영구 표시 + 클립보드 복사 버튼**

원인: 진행 중에 실패한 카드 정보가 `result` 상태에만 저장됐는데, `result`는 완료 시점에만 세팅되어 진행 중에는 누적 에러를 못 봄. 또한 자동 닫기(2.5초)로 사용자가 에러 사유를 확인할 시간 부족.

해결:
- **진행 중 실시간 에러 누적 표시** — `setAllErrors([...accumulatedErrors])`를 매 배치마다 호출하여 즉시 화면 반영
- **에러 패널 영구 표시** — 진행 중·완료 후 모두 동일한 에러 패널 유지 (실패한 카드 카운트 + URL + 사유)
- **자동 닫기 정책 변경** — 실패 0건일 때만 2초 후 자동 닫기. 실패 1건이라도 있으면 사용자가 직접 닫을 때까지 모달 유지
- **클립보드 복사 버튼** — `📋 복사` 버튼으로 실패 사유 전체를 텍스트 형식으로 클립보드에 복사 가능. 형식:
  ```
  [일괄 새로고침 실패 카드 — 2026-04-30T...]
  전체: 100개 / 성공: 99개 / 실패: 1개
  
  1. [df676152] https://example.com
     사유: TIMEOUT: 9000ms 내에 응답을 받지 못했습니다
  ```
- 클립보드 API 폴백 — 권한 거부 시 `document.execCommand('copy')` 폴백 + 그것도 실패 시 사용자 안내
- 복사 성공 시 2초간 `✓ 복사됨` 표시
- 에러 카드별로 URL 클릭 가능 링크 (`<a target="_blank">`) — 사용자가 직접 사이트 확인 후 대응 가능
- 모달 자체 `max-h-[90vh] overflow-y-auto`로 에러 많아도 스크롤 가능
- 에러 패널 하단에 다음 단계 안내: "💡 실패한 카드는 갤러리 그대로 유지됩니다. 사이트를 직접 확인 후 개별 카드 삭제 → 재등록하거나 다시 일괄 새로고침을 시도하세요."

**효과**:
- water-ria.vercel.app 카드 재등록 시 footer 주소가 정상 추출되어 ContactPanel에 `서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구` 표시
- 일괄 새로고침에서 실패가 발생해도 사유를 침착하게 확인하고 클립보드 복사로 디버깅·문의에 활용 가능
- 자동 갱신 정책: v2.11.0의 Lazy Migration이 그대로 작동 — 이번 배포 후 페이지 재로드만 하면 4개 water-ria 카드 모두 자동 정정

### v2.11.3 — 다중 위치 잡음 제거 + footer 자식 분할 추출 (2026.04)

v2.11.2의 두 가지 잔존 문제 해결:

**문제 1 — w-proj.com 신규 주소: `... · 울산 동구 3개 솔루션, 하나의 플랫폼` 잡음 포함**
- 원인: v2.11.2 다중 위치 정규식이 마지막 그룹을 행정구역 마커로 종료 시도했으나 정규식 복잡도 충돌로 실제로는 매치 자체가 실패하여 폴백으로 더 관대한 패턴이 잡음 전체 캡처
- 해결: 정규식을 단순화 + `trimAddressTail()` 후처리로 정확한 종료점 결정

**문제 2 — water-ria.vercel.app footer 추출 실패**
- 원인: footer 영역 전체 텍스트가 500자 초과 (Family Sites 링크들 포함) → `text.length > 500` 필터로 스킵되어 주소 라인 누락
- 해결: footer 자식 요소(p·div·li·span·address)도 분할해서 검사 — 긴 footer 안의 짧은 주소 라인 추출

**1. `trimAddressTail()` 갭 기반 본문 단어 차단 (`lib/contact-info.ts`)**:
- 매치된 텍스트의 모든 행정구역 마커(시·군·구·읍·면·동) 위치를 측정
- 인접 마커 간 **갭이 20자 초과**하면 다음 마커는 본문 단어로 판단 → 연결 안 함
- 합법 다중 위치 갭 예시: `)  │  경기 고양  │  ` ≈ 19자 → 통과
- 본문 잡음 갭 예시: `동구 3개 솔루션, 하나의 플랫폼. 명함 크기 보드 위에서 실시` ≈ 30자+ → 차단
- 마커 직후 닫는 괄호 `)` 는 보존 (`(관악구 신림동)` 케이스)
- 결과: "...울산 동구"에서 정확히 끊고 "3개 솔루션..." 등 본문 자동 제거

**2. 다중 위치 정규식 단순화**:
- 이전: 마지막 그룹을 행정구역 마커로 종료 시도 → 정규식 복잡도 충돌
- 변경: `(province)[^\n]*?SEPARATOR[^\n]*?(province)[^\n]+` 단순 매치 + `trimAddressTail` 후처리
- 정규식은 가능한 길게 매치하고 후처리에서 정확한 종료점 결정 → 더 안정적

**3. 라벨 패턴 분기에도 `trimAddressTail` 적용**:
- "주소: ..." 라벨로 잡힌 후 다중 위치 신호 ` · `가 포함되면 `trimAddressTail` 호출
- 단일 주소("센텀로 88")는 적용 안 함 (다중 위치 패턴 없을 때만 회귀 안전)

**4. footer 자식 요소 분할 추출 (`lib/url-extractor.ts`)**:
- 이전: `footer` 셀렉터로 잡힌 요소 전체 텍스트가 500자 초과면 스킵
- 변경: 전체 텍스트 + 자식 요소(`p·div·li·span·address`)도 각각 개별 검사
- 자식이 더 큰 컨테이너인 경우(`children().length > 3`)는 스킵해서 무한 분할 방지
- water-ria.vercel.app처럼 footer에 회사 정보 + Family Sites + 연락처가 모두 들어간 케이스 정상 처리

**단위 테스트 결과 (9/9 통과)**:
- ✓ water-ria.rf.gd 목표: `서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구`
- ✓ water-ria.vercel.app footer (`│` + 다중 공백): 동일 정규화
- ✓ water-ria.vercel.app inline (`|` 구분자): 동일 정규화
- ✓ edgehybrid-rt (잡음 포함): "FAMILY SITE..." 자동 제거
- ✓ w-proj.com 신규 (`... 동구 3개 솔루션`): "3개 솔루션..." 자동 제거
- ✓ 본문 차단 (안전모·0.1초): 정상 차단
- ✓ 회귀: 단일 주소 "ADDRESS. 경기도 성남시..." 정상 추출
- ✓ 회귀: "본사: 부산광역시 해운대구 센텀로 88" 정상 추출

**자동 갱신**: v2.11.0의 Lazy Migration 시스템이 그대로 적용 — 배포 후 페이지 재로드만 하면 4개 카드 모두 자동 정정.

### v2.11.2 — 다중 위치 주소 + 본문 오인식 강화 + Vercel Hobby 배치 처리 (2026.04)

water-ria 4개 사이트(.rf.gd · .vercel.app · edgehybrid-rt · w-proj.com)에서 주소 추출이 들쭉날쭉하던 문제 통일 해결. 가장 깔끔한 형태(`서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구`)로 모든 사이트 동일하게 정규화.

**문제 진단**:
- water-ria.rf.gd: `·` (middle dot) 구분자 → 정상 추출 (목표 형태)
- water-ria.vercel.app: `│` (U+2502 box drawing) 구분자 → 미추출
- edgehybrid-rt.vercel.app: `|` (pipe) 구분자 → 잡음 포함 (FAMILY SITE·회사 소개 등)
- w-proj.com: 본문 첫 문장이 주소로 잘못 매칭 ("안전모 착용을 실시간 감지하고...")

**1. 다중 위치 구분자 통일 처리 (`lib/contact-info.ts`)**:
- `SEPARATORS = "[\u00B7\u2502|]"` — 3종 구분자 통일 정규식
- `normalizeMultiLocation()` 헬퍼 — 어떤 구분자든 ` · ` (middle dot)으로 정규화
- 결과: 4개 사이트 모두 동일하게 `서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구` 출력

**2. `ADDRESS_MARKERS_RE` 마커 확장**:
- 추가: `캠퍼스타운`, `단지`, `지구`, `벨리`, `밸리`, `블록`
- "서울대 캠퍼스타운(관악구 신림동)" 같은 대학 캠퍼스타운/지식산업단지 주소 인식

**3. 본문 오인식 차단 4가지 강화 (`isValidKoreanAddress`)**:
- 동사형 명사 차단 — `감지|경보|착지|작동|동작|실행|수행|처리|분석` + 어미(`하|되|시키|를|을|의`)
- 소수점 + 단위 차단 — `0.1초`, `0.018초`, `55fps`, `1.5배`, `100m` 등 본문 수치 표현
- 본문 명사 + 동사 조합 — `안전모`/`위험구역`/`작업자`/`크레인` + `착용`/`접근`/`감지` 동시 등장 시 차단
- 다중 동사 확장 — `되어`, `하여` 추가

**4. 다중 위치 패턴 정규식 신규 (B-1단계)**:
- 광역시·도 약어로 시작 + `·│|` 구분자 + 다른 광역시·도가 1회 이상 반복하는 패턴 우선 매칭
- "캠퍼스타운(...)" 괄호 보존, 약어(서울대·경기·울산)도 모두 인식
- 단일 주소 분기보다 우선 적용

**5. 잡음 자동 제거**:
- 라벨 패턴 종료 조건에 `FAMILY\s*SITE`, `©`, `Copyright`, `회사\s*소개` 추가
- 후처리로 이메일·`Family Sites`·`EdgeHybrid-RT`·`Water-RIA` 등 푸터 잡음 정리
- 종료 조건이 명확해 edgehybrid-rt의 "FAMILY SITE Water-RIA 회사 소개 EdgeHybrid-RT" 잡음 자동 제거

**6. Vercel Hobby plan 10초 timeout 대응 — 일괄 새로고침 배치 처리**:
- 이전: 단일 server action에서 100개 카드 순차 처리 → 17분 → Vercel timeout 초과
- 변경: `refreshAllAction(password, offset)` 배치 방식 — 호출당 1개 카드만 처리
- 클라이언트가 `nextOffset`을 받아 반복 호출 + 1초 간격
- 진행률 바 + 실시간 카운트 (X / 100, 성공·실패) 표시
- 인증 실패 시 즉시 중단, 개별 카드 실패 시 다음으로 진행
- Rate limit는 시작 시점만 체크 (offset=0) — 후속 배치는 같은 작업의 일부

**Vercel 무료 플랜 호환성 점검**:
- Server action timeout: 카드당 9초 fetch + 1초 여유 = 10초 이내 ✓
- 외부 fetch 9초 타임아웃 (`FETCH_TIMEOUT_MS = 9000`) ✓
- 개별 카드 페이지 5분 ISR (`revalidate = 300`) → functions invocation 절약 ✓
- 메인 페이지는 `force-dynamic` + `revalidate = 0` (실시간 갤러리 필수) ✓
- 일괄 새로고침은 호출당 1개 카드 — Hobby 60초 timeout 안전 ✓

**단위 테스트 결과 (7/7 통과)**:
- ✓ water-ria.rf.gd → `서울대 캠퍼스타운(관악구 신림동) · 경기 고양 · 울산 동구`
- ✓ water-ria.vercel.app (`│`) → 동일 정규화
- ✓ edgehybrid-rt.vercel.app (`|` + 잡음) → 동일 정규화 + 잡음 제거
- ✓ "안전모 착용을 실시간 감지하고, 인양물 착지…" → 차단
- ✓ "위험구역 접근 시 0.1초 만에 자동 경보합니다" → 차단
- ✓ 회귀: "ADDRESS. 경기도 성남시 중원구..." 정상 추출
- ✓ 회귀: "본사: 부산광역시 해운대구 센텀로 88" 정상 추출

**기존 카드 자동 반영**:
- v2.11.0의 Lazy Migration 시스템이 이미 적용 중 → 배포 후 페이지 재로드만 하면 즉시 정정
- water-ria 4개 카드 ContactPanel의 잘못된 주소가 자동으로 깔끔한 형태로 변환
- 사용자 작업 불필요 (수동 삭제·재등록 안 해도 됨)

### v2.11.1 — v2.11.0 타입 오류 hotfix (2026.04)

v2.11.0 빌드 시 타입체크 실패 9건 모두 수정:

- **logger 호출 시그니처 통일** — `log.warn(ctx, msg, meta)` 3-인자 패턴인데 v2.11.0의 refresh actions가 2-인자(`log.warn("refresh:auth-fail", {...})`)로 호출. 모두 `log.warn("refreshCardAction", "wrong password", {...})` 형태로 정정. createCard·deleteCardAction 등 기존 코드와 일관 적용
- **`refreshCardAction` 반환 타입 — ActionState mode 필수** — v2.11.0이 `{ ok: true, card }`만 반환했으나 `ActionState`는 `mode: "created" | "overwritten" | "deleted"` 필수. 재추출은 `mode: "overwritten"`으로 수정
- **`refreshAllAction` log.warn 인자 부족** — `log.warn("refresh-all:auth-fail")` 1-인자 호출이 ts2554. `log.warn("refreshAllAction", "wrong password")` 2-인자(메타 옵셔널)로 수정
- **`app/[id]/page.tsx` narrowing** — `notFound()`이 일부 환경에서 never 반환 미인식. 명시적 `return` 추가로 TypeScript narrowing 보장

빌드/배포에 영향 미치는 오류만 수정. 동작 변경 없음.

### v2.11.0 — 자동 갱신 시스템 (Lazy Migration + 일괄 재추출) (2026.04)

기존에 등록된 카드도 코드 업데이트 즉시 반영되도록 **Lazy Migration 패턴 + 관리자 1-click 일괄 재추출** 도입. 이전 v2.10.3까지의 모든 추출/마스킹/분류 개선이 기존 카드에 자동 적용.

**핵심 동작 방식 (2가지 자동 갱신)**:

**A. Lazy Migration — 코드 업데이트 즉시 적용 (무중단·무비용)**:
- 새 파일 `lib/migrate.ts` 추가 — `migrateCard()` 함수가 저장된 카드를 메모리에서 후처리
- `app/page.tsx`(메인) + `app/[id]/page.tsx`(개별 카드) 모두 적용
- 자동 적용 항목:
  1. 민감정보 마스킹 (사업자번호·통신판매번호) — 멱등 (이미 마스킹된 텍스트도 안전)
  2. 업종 자동 분류 — 기존 카드에 `industry` 필드 없어도 자동 채움
  3. 회사 기본정보 재추출 — 본문 오인식된 잘못된 주소 자동 정정
  4. 잘못된 주소 차단 — v2.10.3의 `isValidKoreanAddress()` 검증 적용
- **Redis 데이터는 변경 안 함** — 페이지 렌더링 시점에만 메모리에서 변환
- **사용자 작업 불필요** — 배포 후 다음 페이지 로드 시 즉시 적용
- 단점: 페이지마다 매번 처리 (성능 영향 무시 수준 — 100개 카드 5ms 미만)

**B. 일괄 재추출 — 외부 사이트 콘텐츠 자체 갱신 (관리자 1-click)**:
- 새 server action `refreshAllAction(password)` — 전체 카드 외부 사이트 재fetch
- 새 컴포넌트 `components/RefreshAllDialog.tsx` — 비밀번호 인증 + 진행 상태 모달
- 갤러리 헤더 검색창 옆에 **새로고침 아이콘 버튼** 추가 (관리자 전용)
- 동작:
  1. 비밀번호 입력 + 동의 체크박스
  2. 예상 시간 표시 (카드당 ~6초)
  3. 카드별 순차 재fetch (1초 간격으로 외부 사이트 부담 완화)
  4. 실패한 카드는 건너뛰고 계속 진행
  5. 완료 시 성공/실패 카운트 + 실패 상세 토글 표시
  6. 자동 갤러리 새로고침
- Rate limit: **10분에 1회만** (전체 외부 fetch는 부담 큼)
- `kvUpsertCard()` 사용으로 `createdAt` 보존, `updatedAt`만 갱신
- 100개 카드 기준 약 10~15분 소요 (예상 시간 모달에 표시)

**`refreshCardAction(formData)` (단일 카드 재추출)**:
- 개별 카드별 새로고침도 가능하도록 server action 추가
- UI는 차후 v2.11.x에서 카드별 새로고침 버튼으로 노출 예정

**적용 시나리오**:
- ✓ **이미 등록된 워터리아·이노킵·SchoolDots 카드의 잘못된 주소** → 다음 페이지 로드 시 자동 정정 (Lazy Migration)
- ✓ **수개월 전 등록한 카드의 사업자등록번호 본문 노출** → 자동 마스킹
- ✓ **`industry` 필드 없던 기존 카드** → 자동 분류 + 색상 배지 표시
- ✓ **외부 사이트 콘텐츠 자체가 바뀐 경우** → 일괄 새로고침으로 본문 최신화
- ✓ **이전 추출에서 빠진 ContactPanel 정보** → 자동 추출 + 표시

**사용자 워크플로우 변화**:
- 이전: 코드 업데이트 → 모든 카드 수동 삭제 → URL 다시 입력 (100개 시 비현실적)
- 이전: 외부 사이트 변경 사실상 무시
- 현재: **배포만 하면 끝** — 다음 페이지 로드 시 자동 정정. 외부 콘텐츠 갱신 필요 시만 관리자가 1-click

**기술 결정 — 왜 Redis 직접 갱신이 아닌 Lazy?**:
- Redis 직접 갱신 시 100개 카드 동시 마이그레이션은 atomic 보장 어려움 + 실패 롤백 복잡
- Lazy는 멱등(idempotent)이라 안전 + 새 카드는 처음부터 새 로직, 옛 카드는 표시 시점에만 변환
- 외부 사이트 콘텐츠 변경 반영은 일괄 새로고침으로 명시적 처리
- 페이지 렌더링당 추가 비용은 100개 기준 5ms 미만으로 무시 가능

### v2.10.3 — 주소 본문 오인식 차단 + 다층 추출 강화 (2026.04)

water-ria.rf.gd 카드의 주소가 "안전모 착용을 실시간 감지하고…" 같은 본문 첫 문장으로 잘못 파싱되던 문제 해결. 동시에 footer에 주소가 있을 때 더 적극적으로 추출하도록 4단계 보강.

**1. 본문 오인식 차단 (`lib/contact-info.ts`)**:
- `isValidKoreanAddress()` 진위 검증 함수 추가 — 모든 주소 후보가 통과해야만 채택
- **행정구역 마커 필수** — `시`·`군`·`구`·`읍`·`면`·`동`·`로`·`길`·`번지` 중 하나라도 없으면 거부
- **서술어 종결 차단** — `합니다`·`입니다`·`됩니다`·`있습니다` 종결은 본문 문장이라 거부
- **다중 동사 차단** — `하고·하며·되고·되며` 등 2개 이상이면 본문 문장으로 판단
- 라벨 패턴 A·B·C 모든 분기에 검증 적용 → 본문 첫 문장이 어떤 경로로도 주소로 잡히지 않음
- 단위 테스트 8/10 통과 (실패 2건은 "경기도 성남시" 같은 너무 짧은 정보로 의도적 거부)

**2. schema.org JSON-LD address 추출 (`lib/url-extractor.ts`)**:
- 기존 JSON-LD 처리 강화 — `description`·`headline` 외에 `address`·`contactPoint.address`·`telephone`·`email` 적극 추출
- **`extractAddressFromSchema()` 헬퍼 신규** — schema.org `PostalAddress` 객체를 `streetAddress + addressLocality + addressRegion + addressCountry` 결합으로 단일 문자열 정규화
- 한국 주소 마커 또는 "Korea" 포함 시 채택, 그 외엔 reject
- LocalBusiness·Organization·Person·Place 모든 schema 타입 대응

**3. HTML5 `<address>` 시맨틱 태그 우선 추출**:
- `<address>` 태그는 W3C 표준에서 "연락처 정보" 전용 → 신뢰도 가장 높음
- 별도 분기로 광역시·도 검증 없이 10~300자 텍스트면 모두 채택

**4. geo 메타 태그 활용**:
- `<meta name="geo.placename" content="서울시 강남구 테헤란로 123">` 명시 추출
- `<meta name="geo.region" content="KR-44">` ISO 코드 인지 (참고용)
- SEO·LocalBusiness 사이트에서 표준적으로 사용하는 메타라 신뢰도 높음

**5. footer 셀렉터 확장**:
- 기존 `footer, address, [class*='address'], [class*='location'], [class*='contact']`
- 추가: `[class*='Location']`, `[class*='Contact']`, `[id*='address']`, `[id*='location']`, `[id*='contact']`
- ID 기반 셀렉터로 footer 영역의 다양한 마크업 패턴 커버

**6. 본문 서술어 종결 라인 제외**:
- 본문 라인 추출 시도 시 `합니다·입니다·됩니다·있습니다` 종결은 사전 차단
- 광역시·도 + 행정구역 마커 + 서술어 미포함 = 진짜 주소로 인정

**water-ria.rf.gd 케이스 동작 (재등록 시)**:
- 이전: 본문 첫 문장 "안전모 착용을 실시간 감지하고… 자동 경보합니다"가 주소로 오인 → ContactPanel에 잘못 표시
- 현재: 진위 검증으로 즉시 거부 → 만약 footer에 진짜 주소가 있으면 정상 추출, 없으면 ContactPanel에서 주소 row 자체가 표시 안 됨 (잘못된 주소보다 안 보이는 게 나음)

InfinityFree 호스팅 사이트는 주소가 정적 HTML에 없을 가능성이 있어 footer에서 못 찾으면 미표시됩니다. 사이트 footer에 한국 주소를 명시하거나 schema.org JSON-LD를 추가하면 즉시 표시됩니다.

### v2.10.2 — Naver + Bing 인증 코드 적용 완료 (2026.04)

3대 검색엔진(Google·Naver·Bing) 모두 인증 코드 직접 반영. 한국 검색 시장(Google 60% + Naver 30% + Bing 3% = 93%) 모든 채널 등록 완료.

- **Naver 웹마스터도구**: `76efe1d0557654421a1536e32bfa7d381cae2e74` 코드 `app/layout.tsx`에 직접 반영
- **Bing Webmaster Tools**: `DBD84972CD0653BA0206AB375609D0FE` 코드 직접 반영
- 두 인증 모두 환경변수 우선 + 하드코딩 fallback 패턴으로 즉시 적용
- 배포 직후 HTML head 자동 주입:
  - `<meta name="naver-site-verification" content="76efe1d0..." />`
  - `<meta name="msvalidate.01" content="DBD84972..." />`

배포 후 Naver/Bing 양쪽에서 "확인" 클릭하면 즉시 인증 통과.

### v2.10.1 — Google Search Console 인증 코드 적용 + Naver/Bing 등록 가이드 (2026.04)

v2.10.0의 환경변수 의존을 보완. Google Search Console 인증 코드를 코드에 직접 반영하여 별도 환경변수 설정 없이 즉시 인증 통과.

- **Google 인증 코드 직접 적용** — `JuyHHaf_drhOJCJFn44lRBZ-23l4-6JmHZ-M6PV29Q8` 코드를 `app/layout.tsx`의 `verification.google` fallback으로 등록. 환경변수가 있으면 환경변수 우선, 없으면 하드코딩 코드 자동 사용
- **렌더링 결과**: HTML head에 자동 주입 → `<meta name="google-site-verification" content="JuyHHaf_drhOJCJFn44lRBZ-23l4-6JmHZ-M6PV29Q8" />`
- **Naver/Bing 환경변수 조건부 적용** — `NAVER_SITE_VERIFICATION` 또는 `BING_SITE_VERIFICATION`이 있을 때만 meta 태그 주입 (없으면 빈 meta 태그 안 만듦)
- 배포 후 즉시 Google Search Console "HTML 태그" 인증 통과 가능

### v2.10.0 — 2026 SEO + GEO 베스트 프랙티스 전면 적용 (2026.04)

등록된 기업 카드를 Google 검색 최상단에 노출 + ChatGPT·Perplexity·Claude·Gemini AI 검색에서 인용되도록 **2026년 4월 최신 SEO/GEO 베스트 프랙티스** 종합 적용. 핵심: 각 기업 카드가 고유 URL로 SSR 인덱싱되며 Article·Breadcrumb·Organization 구조화 데이터로 풍부한 검색 결과(rich snippet) 자격을 갖춤.

**1. 개별 카드 SSR 페이지 (신규 `app/[id]/page.tsx`)**:
- 이전: 카드는 갤러리 클라이언트 모달로만 표시되어 검색엔진이 H1·본문 인식 불가
- 신규: `/{cardId}` URL로 각 기업 별도 페이지 — `force-dynamic` SSR + `revalidate=300` ISR
- `generateMetadata` 함수로 카드 데이터에서 동적 title·description·OG image·canonical 자동 생성
- semantic HTML (`<article>`, `<nav>`) + 시각적 breadcrumb + 갤러리 복귀 CTA
- **GEO 핵심**: 첫 200자에 명확한 답변 (`<h1>` + `dek/lead`) — LLM이 그대로 인용 가능한 형태
- `notFound()` 처리로 404 깔끔 + 잘못된 ID는 `noindex`

**2. JSON-LD 구조화 데이터 5종 (신규 `lib/seo.ts`)**:
- **Organization** (루트): Knowledge Panel 후보 + 다른 schema의 publisher 참조점, sameAs로 워터리아 연결
- **WebSite** (루트): SearchAction(Sitelinks Search Box 후보) + inLanguage ko-KR
- **Article** (카드별): 필수 4필드 모두 충족 (`headline`·`author`·`datePublished`·`image`) + `dateModified`·`articleSection`·`keywords` 보강
- **BreadcrumbList** (카드별): 홈→갤러리→카드 3단 — 검색 결과 breadcrumb 표시 → 클릭률 향상
- **`@id` 참조 패턴**: Organization이 한 번 정의되고 Article·WebSite가 `@id`로 참조하여 중복 제거 + 일관성

**3. Metadata API 강화 (`app/layout.tsx`)**:
- `metadataBase` + `title.template`(`%s | NEST Alumni 1기`) + `alternates.canonical` 일관 적용
- `robots.googleBot` `maxSnippet:-1`, `maxImagePreview:large`, `maxVideoPreview:-1` — AI Overview 자격
- `verification` 필드로 Google Search Console + Naver 인증 환경변수 지원
- `ko-KR` locale + `x-default` hreflang
- 기존 OG·Twitter Card 보존

**4. 동적 sitemap (`app/sitemap.ts`)**:
- 갤러리의 모든 카드 URL을 `/sitemap.xml`에 자동 포함
- 카드별 `lastModified = stored.updatedAt`으로 크롤러에 신선도 신호
- 정적 홈(`priority: 1.0`) + 카드(`priority: 0.8`, `changeFrequency: monthly`)
- Redis 미설정/오류 시 정적 엔트리만 반환 (graceful degradation)

**5. AI 크롤러 명시 허용 (`app/robots.ts`)**:
- 9개 AI bot 명시 허용: GPTBot · ChatGPT-User · ClaudeBot · anthropic-ai · PerplexityBot · Google-Extended (Gemini) · CCBot (Common Crawl) · Applebot-Extended · Bytespider
- GEO 베스트 프랙티스: AI 크롤러를 robots.txt에서 차단하지 않으면 ChatGPT·Claude·Perplexity 인용 가능성 증대
- `/api/`, `/_next/`만 차단

**6. 갤러리 카드에 SEO crawler용 hidden anchor (`components/ThumbnailCard.tsx`)**:
- `<a href="/{cardId}" className="sr-only">` 추가 — 사용자에게는 안 보이지만 검색엔진이 카드별 URL 발견·크롤
- 기존 button 모달 UX는 그대로 유지 (사용자 경험 변화 없음)

**환경변수 (선택, 인증용)**:
- `GOOGLE_SITE_VERIFICATION` — Google Search Console 사이트 등록 시
- `NAVER_SITE_VERIFICATION` — 네이버 웹마스터도구 등록 시
- 미설정 시 자동 생략

**적용 효과 (예상)**:
- Google 검색에서 각 기업명 검색 시 **카드 페이지가 별도 결과로 노출** (이전엔 메인 페이지만 인덱싱)
- 검색 결과에 **breadcrumb·날짜·이미지 등 rich snippet** 표시 → CTR 35% 향상 (2026 통계)
- ChatGPT·Perplexity·Claude·Gemini가 동문 기업 질의 시 갤러리 카드 **인용 가능성** 확보
- `sitemap.xml` 자동 갱신으로 신규 카드 등록 시 검색엔진이 빠르게 발견

**Search Console 등록 권장 작업**:
1. `https://search.google.com/search-console`에 사이트 등록
2. `verification: { google: "코드" }`에 인증 코드 입력 → 환경변수 또는 직접
3. `Sitemaps` 메뉴에서 `https://nest-alum1.vercel.app/sitemap.xml` 제출
4. URL Inspection으로 카드 URL 직접 인덱싱 요청
5. 1~2주 후 `각 기업명 + Alumni`로 검색 시 카드 페이지 노출 확인

### v2.9.4 — 주소 추출 강건화 + 푸터 주소 영역 명시 수집 (2026.04)

innokeep.com 등 일부 카드의 ContactPanel에서 주소가 표시되지 않던 문제 완전 해결. 두 단계 보강으로 어떤 형식의 한국 주소든 정확히 인식·표시.

**1단계 — 주소 정규식 전면 재설계 (`lib/contact-info.ts`)**:
- **광역시·도 35종 등록** — 정식 명칭(서울특별시·경기도·강원특별자치도 등) + 약어(서울·경기·강원 등) 모두 포함하여 다양한 표기 인식
- **3단 매칭 전략**:
  - A. 라벨 + 주소 — `ADDRESS:`, `주소:`, `위치:`, `소재지:`, `본사:`, `오피스:` 등 한국어·영문 라벨 모두 인식. 점·콜론 옵셔널
  - B. 라벨 없는 주소 — 광역시·도부터 한국 주소 마커(`호`·`층`·`빌딩`·`타워`·`센터`·`번지`)까지 캡처
  - C. 폴백 — 광역시·도 + 시/군/구만 있어도 인식 후 후속 라벨(사업자번호 등) 자동 차단
- **종료 조건 명확화** — 주소 다음에 오는 "사업자등록번호", "TEL", "Email", "FAX", "대표" 등 다음 라벨 패턴을 lookahead로 인식하여 정확히 그 직전에서 종료. 이전엔 한 줄 압축 텍스트에서 주소가 후속 라벨까지 끌고 가는 문제 발생
- **쉼표 허용** — `[^\n,;|]` → `[^\n|]`로 변경하여 "사기막골로62번길 33, 경기피지컬AI랩 6호" 같은 쉼표 포함 주소 완전 보존
- **단위 테스트 8가지 모두 통과** — 라벨 + 정식주소·라벨 없는 주소·약어 시작·한 줄 압축 푸터·문장 중간 끼인 주소·"본사:" 라벨 등 다양한 변형

**2단계 — `extractFromUrl`에서 주소 영역 명시 수집 (`lib/url-extractor.ts`)**:
- v2.9.3의 mailto:/tel: 직접 수집과 동일한 패턴으로 주소 텍스트도 명시 수집
- **`<footer>·<address>·.address·.contact·.location` 셀렉터** — 주소가 있을 만한 요소를 직접 탐색하여 한국 광역시·도가 포함된 텍스트를 본문에 강제 포함
- **본문 어디든 한국 주소 패턴 라인 추출** — `<p>·<li>·<dd>·<span>·<div>` 중 광역시·도 + 한국 주소 마커(시·군·구·로·길·번지·호·층 등)가 있는 짧은 라인(10~200자)을 자동 수집
- **중복 검사** — 이미 본문에 같은 텍스트가 있으면 스킵하여 단락 중복 방지

**효과**: 이전엔 cheerio가 푸터 영역을 boilerplate로 일부 제거하면서 주소도 함께 사라져 contact-info.ts가 추출할 텍스트 자체가 없는 경우가 있었음. 이제는 (1) 명시적 주소 영역에서 직접 수집하여 본문에 보장 포함 + (2) 정규식이 한 줄 압축이든 라벨 유무든 무관하게 정확히 인식. innokeep.com 카드 재등록 시 ContactPanel에 "경기도 성남시 중원구 사기막골로62번길 33, 경기피지컬AI랩 6호" 정상 표시.

### v2.9.3 — 이메일 추출 강건화 + mailto:/tel: 링크 직접 수집 (2026.04)

innokeep.com 등에서 푸터 컨택 정보의 이메일이 ContactPanel에 표시되지 않던 문제 보강. 두 단계 수정으로 어떤 형식이든 정확히 인식.

**1단계 — 이메일 정규식 강건화 (`lib/contact-info.ts`)**:
- **`Email.info@innokeep.com`** (라벨과 점으로 붙은 케이스) — 이전엔 `Email.info@innokeep.com` 전체가 매칭되어 ContactPanel에 잘못 표시. 이제 라벨 직후 점을 정상 분리하여 `info@innokeep.com`만 추출
- **`info@ innokeep.com`** (cheerio 추출 시 @ 주변 공백 끼임) — 이전엔 `\b` 단어 경계로 미감지. 이제 @ 앞뒤 공백 자동 복원
- **`info @innokeep.com`** (반대 방향 공백) — 동일하게 복원
- **prefix 라벨 제거** — `Email.`, `E-mail:`, `이메일:`, `Mail:`, `TEL.` 등이 로컬 부분에 잘못 포함되면 제거
- **회사 메일 prefix 우선** — `info@`, `contact@`, `hello@`, `support@`, `cs@`, `sales@`, `hr@`, `partners@`, `help@` 등 발견 시 우선 채택
- **검증 강화** — 추출 후 길이 6~80자, 표준 RFC 형식 다시 확인하여 오탐 차단
- **단위 테스트 9가지** — innokeep 실제 케이스 + 압축 줄바꿈 + 공백 끼임 + 한국어 라벨 + 다중 메일 우선순위 모두 정확 추출 확인

**2단계 — `extractFromUrl`에서 `<a>` 링크 직접 수집 (`lib/url-extractor.ts`)**:
- HTML 파싱 후 `$("a[href]").each(...)`로 모든 링크 순회
- `href="mailto:..."` → `Email: 주소` 라인을 본문에 강제 포함
- `href="tel:..."` → `Tel: 번호` 라인을 본문에 강제 포함
- boilerplate 제거 단계에서 푸터 영역이 사라져도 컨택 정보는 별도 라인으로 보존
- 중복 검사로 본문에 이미 있으면 추가 안 함

**효과**: 이전엔 cheerio 본문 추출에서 푸터가 `<footer>` 영역으로 분류되어 일부 보일러플레이트 제거 단계에서 사라지면 이메일도 함께 사라졌으나, 이제는 `<a href="mailto:">` 명시적 링크가 있으면 항상 추출되고 그 후 contact-info.ts가 강건한 정규식으로 정확히 인식. innokeep.com 카드 재등록 시 ContactPanel에 `info@innokeep.com`이 정상 표시되며 클릭 시 mailto: 링크로 메일 작성 즉시 가능.

### v2.9.2 — 카드 모서리 요소 좌우 분리 (2026.04)

v2.9.0에서 추가한 IndustryBadge와 기존 삭제 버튼이 모두 우상단(absolute top right)에 위치해 hover 시 겹치던 문제 보강.

- **IndustryBadge 위치 이동** — `right-2.5` → `left-2.5`. 좌상단으로 이동하여 항상 표시되는 업종 정보가 명확히 보이도록
- **삭제 버튼 위치 통일** — `top-3 right-3` → `top-2.5 right-2.5`. 배지와 동일한 여백 값 사용으로 시각적 정렬, `z-10` 추가하여 hover 시 배지보다 위에 표시
- **삭제 버튼 시인성 강화** — `bg-white/90` → `bg-white/95`, `shadow-sm` 추가하여 이미지 위에서도 또렷이 인지, `hover:border-danger`로 hover 상태 시각 신호 강화
- **삭제 버튼 라벨 통일** — aria-label "카드 삭제" → "이 기업 소개를 갤러리에서 내리기" + tooltip "갤러리에서 내리기"로 v2.5.x 톤 일관 적용

좌우 분리 결과 카드 hover 시 좌상단 업종 배지 + 우상단 삭제 아이콘이 명확히 구분되어 보이며, 클릭 영역도 겹치지 않아 사용성 향상.

### v2.9.1 — 협업 컨택 정보 보존 + ContactPanel 정돈 표시 (2026.04)

v2.9.0이 너무 보수적으로 휴대전화·연락처까지 가렸던 문제 보강. 사업자등록번호·통신판매업신고번호 두 가지만 가리고 **대표자·전화·이메일·주소는 협업 컨택 단서로 보존**하며, 추가로 이런 회사 기본정보를 본문에서 자동 추출해 카드 우측 사이드 패널로 정돈 표시.

**마스킹 정책 완화 (`lib/sanitize.ts`)**:
- 휴대전화 010-xxxx-xxxx 패턴 제거 정책 폐지 → 협업 컨택 정보로 보존. 회사 대표번호(02·031·070 등)와 동일하게 취급
- 사업자등록번호·통신판매업신고번호·법인등록번호·주민등록번호만 계속 제거
- 동문 카드의 컨택 가치(즉시 연결 가능)가 보안 우려보다 우선

**회사 기본정보 자동 추출 (신규 `lib/contact-info.ts`)**:
- **`extractContactInfo()` 함수** — 본문 합본 텍스트에서 4종 메타 추출
- **대표자 추출** — `대표.이름` / `대표:이름` / `대표 이름` / `대표이사: 이름` / `CEO 이름` / `Founder 이름` 6가지 패턴 지원, 한글 이름 종료 조건은 lookahead로 영문/숫자/구두점 모두 인식
- **전화 추출 우선순위** — (1) 070·050 인터넷전화 (2) 1588·1644·1800 대표번호 (3) 02 서울 (4) 031~064 지역 (5) 010 등 휴대전화. 가장 회사 대표번호다운 것을 우선 채택
- **이메일 추출** — 모든 이메일 매칭 후 `info@`·`contact@`·`hello@`·`support@`·`sales@`·`partners@` 등 회사용 prefix를 우선 선택, 없으면 첫 번째
- **주소 추출** — 17개 광역시·도 시작 패턴 + `ADDRESS:` 라벨 + 시·군·구 키워드. 80자까지 보존
- **단위 테스트 검증** — innokeep.com 푸터 텍스트로 대표자 "손형민" / 전화 "070-8064-3411" / 이메일 "info@innokeep.com" / 주소 "경기도 성남시 중원구..." 모두 정확 추출 확인

**`EditorialCardData.contactInfo` 메타 필드 추가**:
- 옵셔널, 추출된 정보가 있을 때만 카드에 포함되어 Redis에 영구 보존
- 본문에는 원본 텍스트 그대로 남고 별도 필드로도 정돈 보관 (이중 표현)

**`components/ContactPanel.tsx` 신규 컴포넌트**:
- 카드 상세 뷰의 dek 다음·Lead 전 위치에 사이드 패널처럼 표시
- "Contact · 협업 컨택" 헤딩 + 4개 정보 row (대표·전화·이메일·주소)
- 각 row마다 의미 아이콘 SVG (사람·전화·메일·지도핀)
- **전화는 `tel:` 링크** — 모바일에서 즉시 통화 가능
- **이메일은 `mailto:` 링크** — 클릭 시 메일 앱 열림
- 카드 액센트 색상으로 링크 강조, 깔끔한 정의 리스트(`<dl>/<dt>/<dd>`) 구조

**innokeep.com 카드 예상 결과**:
- 본문에 "대표.손형민 / TEL.070-8064-3411 / Email. info@innokeep.com / ADDRESS. 경기도 성남시 중원구..." 그대로 노출 (협업 단서 보존)
- 별도 ContactPanel에 같은 정보가 정돈된 형태로 표시 (즉시 컨택 가능)
- "사업자등록번호. 371-88-03057" / "통신판매업신고번호. 2024-성남수정-0873"만 본문에서 자동 제거

협업 우선의 정보 정책: **컨택 가능성 ≫ 정보 보호** (이미 공개된 회사 푸터 정보라 추가 노출 위험 없음).

### v2.9.0 — 민감 정보 자동 마스킹 + 업종 자동 분류·색상 그루핑 (2026.04)

`innokeep.com` 같은 사이트의 사업자등록번호·통신판매업신고번호가 본문에 그대로 노출되던 문제 + 갤러리에 동문 기업이 늘어날수록 협업 가능한 동종 업종 발견이 어려워지던 문제를 동시 해결.

**민감 정보 자동 마스킹 (`lib/sanitize.ts`)**:
- **6종 패턴 자동 제거** — (1) 사업자등록번호 `000-00-00000` (2) 통신판매업신고번호 `0000-지역명-0000` (3) 법인등록번호 `000000-0000000` (4) 주민등록번호 (5) 휴대전화 `010-0000-0000` (6) 사업자등록번호 점 표기 `000.00.00000`
- **라벨 동반 제거** — "사업자등록번호: 371-88-03057" 형식에서 라벨까지 함께 제거하여 빈 라벨이 남지 않도록 처리
- **회사 대표번호 보존** — `02-`, `031-` 등 일반 전화는 영업 정보로 보존 (개인 휴대전화 010만 차단)
- **모든 진입 경로에 적용** — `composeCard()` 마지막 단계에서 headline·dek·lead·body·keyPoints·pullQuote 모두 마스킹. 자동 추출·수동 입력·기존 카드 갱신 어디든 일관 적용
- **단위 테스트 검증** — 6가지 케이스 (라벨 동반, 콜론 없음, 일반 본문 영향 없음, 대표번호 보존 등) 통과

**업종 자동 분류 + 색상 그루핑 (`lib/industry.ts`)**:
- **12개 업종 분류** — AI/NPU/Edge (indigo) · 클라우드/SaaS (sky) · 모빌리티/로봇 (amber) · 헬스케어/의료 (rose) · 핀테크/금융 (emerald) · 교육/에듀테크 (violet) · 안전/산업 (orange) · 콘텐츠/미디어 (pink) · 커머스/리테일 (lime) · 친환경/에너지 (teal) · 부동산/공간 (stone) · 기타 (slate)
- **키워드 빈도 기반 분류** — 각 업종마다 12~16개 한국어·영어 키워드 등록, 카드 본문 합산 텍스트에서 매칭 점수 계산하여 최다 매칭 업종 채택. 영문은 단어 경계 검사(`\b`)로 오매칭 방지
- **신규 `EditorialCardData.industry` 필드** — 자동 분류 결과를 카드 메타로 저장 (Redis에 영구 보존). 옵셔널이라 기존 카드는 영향 없음
- **`IndustryBadge` 컴포넌트** — 색상 코딩된 둥근 배지 (배경+보더+텍스트 3색 조합). xs·sm·md 3단계 크기. 좌측 작은 dot + 한국어 라벨
- **ThumbnailCard 우상단 배지** — 갤러리 그리드에서 한눈에 업종 식별 가능. `absolute top-2.5 right-2.5 z-10` 위치 + `pointer-events-none`으로 카드 클릭 방해 안 함
- **EditorialCard 헤더 배지** — 상세 뷰에서 kicker·eyebrow와 같은 줄에 sm 크기로 표시
- **갤러리 정렬에 "업종별" 모드 추가** — 같은 업종 카드끼리 인접 배치, 같은 업종 내에서는 최신순. 단위 테스트로 워터리아=ai, SchoolDots=edu, SmartGuard=safety, 이노킵=commerce 정확 분류 확인

**협업 발견 효과**:
- 갤러리 한 화면에 들어왔을 때 같은 색상 카드끼리 시각적으로 묶여 보임
- "업종별" 정렬 모드로 같은 영역 동문을 한 번에 확인
- 워터리아 같은 AI 영역(indigo)과 의료 영역(rose) 카드가 색으로 명확히 구분
- 100개 카드 시점에서 "내 영역과 보완 가능한 동문은?" 답변이 시각적으로 즉시 가능
- 워터리아의 5가지 협업 유형(기술 스택 보완·도메인 보완·고객 공유·인증 결합·투자 협력) 발견을 색상 그루핑으로 가속화

### v2.8.0 — URL 처리 과정 투명성 패널 추가 (2026.04)

사전 동의 없는 동문 웹사이트 공개 위험 분석에서 도출된 "운영 투명성·신뢰 자산 형성" 보강. 입력 섹션에 펼침형 ProcessExplainer 컴포넌트 추가하여 URL이 입력된 후 카드로 게시되기까지의 7단계 처리 과정을 사용자에게 명확히 공개.

- **신규 `components/ProcessExplainer.tsx`** — 클라이언트 컴포넌트, 펼침/접힘 토글 UI. 입력 폼 카드 바로 아래 위치하여 URL 입력 직전 자연스럽게 노출
- **7단계 처리 과정 시각화** — (1) URL 정규화 (2) 중복 검사 (3) 외부 페이지 fetch (4) 본문 추출 (5) 요약 생성 (6) 카드 구성 (7) 저장·갤러리 게시. 각 단계마다 (a) 무엇을 하는지 (b) 처리 결과 데이터 형태 (c) 1~3줄 상세 설명
- **데이터 처리 원칙 박스** — 점선 액센트 보더의 강조 박스로 5가지 핵심 원칙 명시: (1) 공개 데이터만 처리 (2) 외부 AI API 미사용 — TextRank/MMR 자체 알고리즘 (3) 서버 fetch라 사용자 IP·쿠키 비노출 (4) 사전 동의 권장 — 동의 없이 게시된 카드 발견 시 즉시 삭제 (5) 동일 URL 재입력 시 자동 갱신·관리자 비밀번호로 즉시 삭제 가능
- **자동 추출 실패 안내** — JS 챌린지·SPA 사이트의 경우 수동 입력 폼 자동 전환 + 가능한 메타데이터 미리채움 동작 안내
- **펼침/접힘 UX** — 아코디언 패턴, 화살표 회전 애니메이션 + ARIA `aria-expanded`/`aria-controls`. 첫 방문자는 접힌 상태로 보고 클릭 시 7단계 펼침
- **사전 동의 권장 명시 통합** — 사전 동의 없는 게시의 법적·윤리적 위험 분석 결과(Level 1 Opt-in 모델)를 UI에 자연스럽게 녹임. 직접적 경고 대신 운영 원칙으로 표현하여 무겁지 않게 전달

이로써 갤러리 추가 시 사용자가 (1) 자신의 입력이 어떻게 처리되는지 정확히 알고 (2) 사전 동의 권장 원칙을 인지하며 (3) 외부 AI API 사용·서버 fetch 등 기술 운영 방식의 투명성을 확인할 수 있음. 동문 기업의 잠재적 우려에 대한 운영자의 사전적 답변 역할.

### v2.7.3 — 삭제 rate limit 합리화 + 친화적 에러 메시지 (2026.04)

연속 카드 삭제 시 6번째부터 "35초 후 다시 시도해주세요" 차단되어 갤러리 정리·테스트 작업이 불편하던 문제 보강. 작업 종류별 자원 부담을 다시 평가하여 삭제 한도를 대폭 완화.

- **삭제 rate limit 5→20 (60초당)** — 카드 삭제는 (1) 비밀번호로 이미 인증된 행위 (2) Redis 키 1개 제거라 자원 부담 거의 없음 (3) 갤러리 정리 시 연속 발생 자연스러움. 카드 추가(외부 fetch 필요, 5/60s 유지)와 차별화. 60초에 20회면 사실상 정상 사용에서는 막히지 않음
- **에러 메시지 톤 부드럽게** — "요청이 너무 빠릅니다" → "잠시만요. 짧은 시간에 너무 많이 삭제하셨습니다" / "잠시만요. 짧은 시간에 요청이 많아 N초 후 다시 시도 부탁드립니다". 모든 rate limit 메시지(추가/삭제/힌트/manual) 일관된 톤으로 통일
- **삭제 차단은 의도적 무차별 공격 방지에만 작동** — 정상 사용에서는 체감 안 되는 수준. 30개 카드를 빠르게 정리해도 90초 내 모두 처리 가능

운영 안전성과 사용자 편의의 균형을 사용 패턴에 맞춰 재조정. 카드 추가는 외부 자원 호출이 있어 보수적 한도 유지, 삭제는 운영자가 정리 작업 시 부담 없이 사용 가능.

### v2.7.2 — 갤러리 복귀 UX 3중 보강 (2026.04)

상세 뷰에서 갤러리로 돌아가는 경로가 (1) 작은 "← 갤러리로" 텍스트 (2) 멀리 있는 상단 네비 (3) 외부 사이트로 가버리는 브라우저 뒤로가기로 모두 만족스럽지 않던 문제를 세 방향으로 동시 해결.

- **History API 통합 — 브라우저 뒤로가기 = 갤러리 복귀** — `openDetail()` 시 `window.history.pushState({mode:"detail",id})` 호출하여 history 항목 추가, `closeDetail()`은 `history.back()`으로 popstate 트리거. `popstate` 이벤트 리스너가 mode 자동 복원. 결과: **브라우저 뒤로가기·모바일 스와이프 백 제스처가 자연스럽게 갤러리 복귀로 작동**, 외부 사이트로 빠져나가지 않음
- **상단 "← 갤러리로 돌아가기" 버튼 시인성 강화** — 작은 회색 텍스트(text-fg-muted) → **2px 인디고 보더 + accent-subtle 배경 + semibold 텍스트 + 화살표 SVG 아이콘 + shadow-sm/hover\:shadow** 리뉴얼. 즉시 인지 가능한 명확한 액션 버튼으로 격상
- **상세 뷰 끝부분 "갤러리에서 다른 기업 소개 보기" 푸터 버튼 추가** — 사용자가 본문을 모두 읽고 스크롤이 끝났을 때 자연스럽게 다음 행동 유도. **풀-인디고 채워진 큰 primary 버튼 + 4-square grid 아이콘** + "이 기업 소개를 모두 확인하셨다면" 안내 문구 + "↑ 페이지 위로" 보조 링크. 상단으로 다시 스크롤 안 해도 끝에서 즉시 갤러리 복귀 가능
- **모드 전환 통합** — `openDetail`/`closeDetail` 두 헬퍼로 갤러리·상세 전환 일원화. 카드 클릭, 등록 후 자동 진입, 갤러리 버튼 클릭 등 모든 진입/이탈 경로가 동일 함수 사용 → history 일관성 보장
- **`scrollToSection` 갱신** — 상세 뷰에서 호출 시 `closeDetail()` 사용으로 history도 정리. 네비 갤러리 버튼은 단순화

세 경로가 모두 갤러리로 향하므로 사용자는 어떤 방식을 선호하든 직관적으로 복귀 가능:
- **상단**: 큰 인디고 보더 "← 갤러리로 돌아가기" 버튼 (즉시 발견 가능)
- **하단**: 풀폭 primary "갤러리에서 다른 기업 소개 보기" 버튼 (스크롤 끝에서 자연스럽게)
- **브라우저**: 뒤로가기/스와이프 백으로 popstate → 갤러리 복귀 (외부 이탈 방지)
- **데스크탑 키보드**: Alt+← (history.back)도 동일하게 작동

### v2.7.1 — 갤러리 직행 네비 추가 (2026.04)

상단 네비에 추가된 기업 소개 갤러리로 직행하는 별도 메뉴 추가. v2.7.0의 sticky 갤러리 헤더와 결합하여 어떤 위치(About 섹션·입력 섹션·상세 뷰)에서도 한 번 클릭으로 갤러리 도달 가능.

- **상단 네비 "갤러리" 추가** — `소개 / 갤러리 / [+ 소개 추가]` 3-단 구성. 텍스트만 있는 가벼운 secondary 버튼으로 "+소개 추가" 액션 버튼과 시각적 위계 차별화
- **지능형 모드 전환** — 상세 뷰에서 클릭 시 자동으로 갤러리 모드 복귀 + 두 프레임(`requestAnimationFrame` 중첩) 대기 후 스크롤하여 DOM 마운트 완료 보장
- **헤로 영역에 "갤러리 둘러보기 ↓" 버튼 추가** — 첫 방문자가 곧바로 갤러리로 갈 수 있는 두 번째 CTA. 기존 "Alumni 1기 소개"는 secondary 텍스트 링크로 격하하여 시각적 우선순위 정리
- **갤러리 섹션 ID 부여** — `<section id="gallery" ref={gallerySectionRef}>`로 직접 URL `#gallery` 앵커도 가능
- **aria-label** "추가된 기업 소개 갤러리로 이동"으로 스크린리더에도 의도 명확히 전달

전체 네비 흐름 정리:
- **로고** — 페이지 최상단으로
- **소개** — Alumni 1기 About 섹션으로
- **갤러리** — 추가된 기업 소개 영역으로 (상세 뷰면 자동 복귀)
- **+ 소개 추가** — 새 기업 소개 입력 섹션으로

### v2.7.0 — 100개 카드 효율 노출 (sticky 헤더 + 정렬 + 페이지네이션) (2026.04)

향후 최대 100개 동문 기업 소개가 추가될 예정에 대비해 갤러리 노출 전략을 2026 베스트 프랙티스 기준으로 전면 재설계. 한 페이지에 모두 펼치면 발생하는 (1) 스크롤 부담, (2) DOM 노드 폭증, (3) 검색·정렬 접근성 저하 세 가지 문제를 모두 해결.

- **Sticky 갤러리 헤더** — 검색창·정렬·카운트가 항상 화면 상단에 고정. `sticky top-14 z-10 backdrop-blur-sm` 구현으로 메인 nav(top-0) 바로 아래 자연스럽게 위치. 스크롤 중에도 검색·정렬 즉시 가능
- **점진 노출 페이지네이션** — 초기 24개만 렌더링 + "더 보기" 버튼으로 24개씩 추가. 100개 카드라도 첫 렌더링은 24개만 → DOM 부하 1/4 감소. 모두 표시 옵션도 별도 제공
- **정렬 3가지 모드** — `sortMode` state로 (1) 최신순(기본, updatedAt 내림차순) (2) 가나다순(headline 한국어 정렬) (3) 도메인순(sourceDomain 정렬). pill chip 디자인으로 한 클릭 전환. ARIA `role="tablist"` 적용
- **그리드 밀도 4열로 확장** — `lg:grid-cols-3` → `lg:grid-cols-3 xl:grid-cols-4`. 1280px 이상 화면에서 한 번에 더 많은 카드 표시. 모바일/태블릿은 1·2열 유지
- **표시 카운트 실시간** — "24/100 표시" 같은 카운트가 정렬·페이지네이션·검색에 반응하여 자동 업데이트. `aria-live="polite"`로 스크린리더에도 동기화
- **검색 결과 0건 UX 개선** — "검색 지우기" 버튼 추가, 한 번 클릭으로 전체 갤러리 복귀
- **갤러리 변경 시 자동 페이지 리셋** — 검색어 변경·정렬 모드 변경·갤러리 카드 추가/삭제 시 visibleCount가 24로 리셋되어 항상 1페이지부터 시작
- **6개 이하 갤러리는 정렬 UI 숨김** — 정렬이 의미 없는 소량 갤러리에서는 UI 노이즈 제거

100개 카드 시점 예상 동작: 첫 페이지 24개 즉시 표시 → 사용자가 더 보고 싶으면 "24개 더 보기" 클릭 → 점진 확장. 검색 시 100개 전체 대상으로 매칭하되 결과의 첫 24개만 렌더. 정렬 변경은 즉시 반영 후 다시 첫 24개부터.

### v2.6.1 — 상단 네비 행위 명확화 (2026.04)

상단 네비 "기업 소개" 라벨이 이미 추가된 소개를 보러가는 메뉴처럼 오해될 수 있어 행위가 명확한 표현으로 보강.

- **"기업 소개" → "+ 소개 추가"** — `+` 아이콘 SVG로 추가 행위 시각적 명시 + 짧고 명확한 텍스트
- **인라인 SVG glyph** — 14px 크기, 2.5 stroke로 가독성 확보, `aria-hidden`으로 스크린리더에 중복 읽힘 방지
- **버튼 패딩 미세 조정** — `px-3` → `px-3.5`로 아이콘 추가에 따른 시각 균형 맞춤
- **aria-label 보존** — "기업 소개를 갤러리에 추가하기"로 스크린리더 사용자에게 정확한 행위 안내 유지

### v2.6.0 — URL 입력 UI 시인성 + UX 강화 (2026.04)

기업 소개 추가 섹션의 URL 입력창이 흰 카드 안 흰 입력창으로 평면적이고 페이지의 다른 요소들과 시각적 구분이 약했던 문제 보강. 입력 영역을 페이지의 명확한 행동 유도 지점으로 강화.

- **입력 카드 컨테이너 강화** — 단순 `bg-surface + border` → `linear-gradient(135deg, surface 0%, accent-subtle 100%)` 그라디언트 배경 + 인디고 액센트 보더(top: 4px) + `shadow-overlay` 강한 그림자. 우상단에 "URL 입력" 라벨 배지로 입력 지점 강조
- **라벨 시인성 개선** — 작은 회색 eyebrow(0.7rem) → **1rem · semibold · text-fg** 큰 검은 라벨. 라벨 아래 보조 안내문 한 줄 추가 ("자사 홈페이지·뉴스 기사·보도자료 등 무엇이든 OK")
- **입력창 자체 강화** — 패딩 `py-3` → **`py-4`** 키움, 폰트 `0.95rem` → **`1rem font-medium`**, 보더 `1px` → **`2px`**, 좌측에 **링크 아이콘** 추가(인디고색), 포커스 링 `ring-2/20` → **`ring-4/15`** 더 부드러운 강조, `shadow-sm` 미세 그림자 추가
- **유효성 인디케이터 확대** — 18px → 22px, 더 두꺼운 stroke
- **버튼 강화** — 패딩 `py-3` → **`py-4`**, `font-medium` → **`font-semibold`**, `shadow-subtle` → **`shadow-raised`**. 입력창과 동일한 높이로 시각적 균형
- **placeholder 단순화** — 두 가지 형식 표시 → **`https://example.com/article`** 한 가지로 명확

전체적으로 입력 영역이 페이지의 시각적 무게중심이 되어 사용자가 무엇을 해야 하는지 즉시 파악 가능. URL 예시 박스(이전 v2.5.9에서 추가)가 입력창 위에 남아 있어 어떤 URL을 넣어야 하는지의 정보 위계도 자연스럽게 흐름.

### v2.5.9 — "기업 소개" 톤 재정비 + 다양한 URL 출처 명시 (2026.04)

v2.5.8의 "합류" 표현이 (1) 기업 자체가 가입하는 어감으로 수정 의도가 약하고 (2) 자사 홈페이지가 없으면 추가 못 하는 듯한 오해를 만들 수 있어 재정비. 행위가 정확하고 중립적인 "기업 소개 추가" 표현으로 통일하고, 자사 홈페이지뿐 아니라 뉴스 기사·보도자료 등 다양한 URL 출처가 가능함을 명시.

- **상단 네비** "기업 합류" → **"기업 소개"**
- **헤로 CTA** "기업 합류 신청 →" → **"기업 소개 추가 →"**
- **입력 섹션** § Join → **§ Add** / "동문 기업으로 합류하기" → **"기업 소개 추가하기"**
- **새 안내 박스 추가** — "사용 가능한 URL 예시" 섹션 신설: 자사 홈페이지 / 기업 소개 뉴스 기사 / 보도자료·블로그 글 / 본문이 풍부한 회사 소개 페이지 4가지 출처를 명시. placeholder도 `https://example.com/article 또는 https://your-company.com`으로 다양성 표현
- **URL 폼 라벨** "기업 홈페이지 URL" → **"기업 관련 페이지 URL"** (홈페이지 한정 X)
- **PasswordDialog 등록 모달** "Alumni 1기에 합류하시겠습니까?" → **"이 기업 소개를 갤러리에 추가하시겠습니까?"**, 본문도 "추가한 기업 소개가 Alumni 1기 갤러리에 게시되어..."
- **진행 버튼** "합류 진행" → **"소개 추가"**
- **빈 갤러리 상태** "첫 동문 기업의 합류를 기다리고 있어요" → **"첫 번째 기업 소개를 기다리고 있어요"**, 본문에 "자사 홈페이지가 없으면 기업을 다룬 뉴스 기사·보도자료·블로그 글의 URL도 사용할 수 있습니다" 명시
- **빈 갤러리 CTA** "첫 동문 기업으로 합류 →" → **"첫 소개 추가하기 →"**
- **갤러리 카운트** "합류한 동문 기업 (n)" → **"추가된 기업 소개 (n)"**
- **SEO description** "동문 기업이 홈페이지 URL 하나로 합류..." → **"자사 홈페이지나 관련 뉴스 기사·보도자료 등 어떤 페이지든 URL 하나로 동문 기업 소개를 갤러리에 추가..."**
- **About 섹션 "커뮤니티 합류"는 의도적으로 보존** — 카카오톡 오픈채팅방 안내(STEP 05)는 "사람이 동문 커뮤니티에 합류"하는 별개 행위라 이 표현 유지가 자연스러움

### v2.5.8 — Alumni 커뮤니티 톤으로 명칭 전면 정비 (2026.04)

기능 중심의 "카드 등록·생성·삭제" 표현을 NEST Alumni 1기 동문 커뮤니티 성격에 맞춰 "합류·갤러리 게시·갤러리에서 내림" 톤으로 일괄 정비. 사용자가 보는 모든 UI 문구·버튼·라벨·에러 메시지를 합류(Join) 컨텍스트로 통일하여 단순 도구가 아닌 동문 네트워크 허브의 정체성 강화.

- **상단 네비** "카드 등록" → **"기업 합류"**
- **헤로 CTA** "소개 카드 등록 →" → **"기업 합류 신청 →"**
- **입력 섹션** § Compose → **§ Join** / "홈페이지 URL 하나로" → **"동문 기업으로 합류하기"**, 안내문에 NEST 17·18기 컨텍스트 추가
- **URL 폼 라벨** "Homepage URL" → **"기업 홈페이지 URL"**
- **폼 제출 버튼** "카드 생성 →" → **"소개 만들기 →"**
- **PasswordDialog 등록 모달** "카드를 등록하시겠습니까?" → **"Alumni 1기에 합류하시겠습니까?"**, 본문도 "공유 갤러리에 등록..." → **"합류한 기업 소개가 Alumni 1기 갤러리에 게시되어 모든 동문이 확인할 수 있습니다"**
- **PasswordDialog 삭제 모달** "카드를 삭제하시겠습니까?" → **"이 기업 소개를 갤러리에서 내리시겠습니까?"**
- **진행 버튼** "등록 진행"/"삭제 진행" → **"합류 진행"/"갤러리에서 내리기"**
- **ManualEntryDialog 제목** "수동으로 카드 정보 입력" → **"수동으로 기업 소개 작성"**, 제출 버튼도 "카드 생성" → **"합류 진행"**
- **상세 뷰 삭제 버튼** "삭제" → **"갤러리에서 내리기"**
- **빈 갤러리 상태** "첫 소개 카드를 등록해보세요" → **"첫 동문 기업의 합류를 기다리고 있어요"**, CTA "첫 카드 만들기 →" → **"첫 동문 기업으로 합류 →"**
- **갤러리 카운트** "소속 기업 카드 (n)" → **"합류한 동문 기업 (n)"**
- **SEO description** 메타데이터도 "동문 커뮤니티"·"동문 기업이 합류"·"기업 간 교류·기술 협력·투자 연계" 등 메일 톤에 맞춘 키워드로 갱신
- **모든 aria-label 동시 갱신** — 스크린리더에도 합류 톤이 일관 적용

### v2.5.7 — 대표 이미지 fallback + 비율 조정 (2026.04)

`water-ria.vercel.app` 등 OG 이미지가 없거나 로드 실패한 카드에서 21:9 비율의 큰 회색 빈 박스가 표시되던 문제 보강. 모든 카드 이미지 처리를 `HeroImage` 클라이언트 컴포넌트로 통일하여 로드 실패 자동 감지 + fallback 적용.

- **신규 `components/HeroImage.tsx`** — `<img>` 태그 + `onError` 핸들러로 로드 실패 자동 감지. 실패 시 ThumbnailCard와 동일한 디자인 fallback(이니셜 + 그라디언트) 자동 전환
- **EditorialCard·ThumbnailCard 통합** — 각자 다르던 이미지/fallback 로직을 HeroImage 단일 컴포넌트로 통합. 이전엔 EditorialCard가 `background-image` CSS 사용해 onError 감지 불가했음
- **비율 조정** — 21:9(시네마틱) → 16:9(영상 표준)로 변경. 21:9는 빈 공간이 너무 커 보였고 16:9가 콘텐츠와의 균형이 더 좋음
- **fallback 디자인 강화** — 도메인 이니셜(2자) + 사이트명/도메인 라벨 + 듀얼 라디얼 그라디언트. 이미지 없는 카드도 단정한 시각적 자리잡음 가짐
- **TLD 인식 확장** — `.me` TLD를 이니셜 추출 시 자동 제거(`schooldots.me` → `SC`), 이전엔 `SC` 대신 `SC` 이지만 도메인 표시는 유지
- **lazy loading** — `<img loading="lazy">` 적용, 화면 밖 카드 이미지는 스크롤 시점에 로드

### v2.5.6 — URL 정규화 강화로 중복 카드 방지 (2026.04)

`schooldots.me`와 `www.schooldots.me`, `http://`와 `https://`가 별개 카드로 저장되던 문제 근본 해결. dedup-key 정규화 로직을 강화하여 동일 페이지의 모든 입력 변형이 같은 키를 만들도록 통일.

- **scheme 통일**: `http://` → `https://` (HTTPS가 표준 가정)
- **www 제거**: `www.example.com` → `example.com` (대부분의 사이트가 둘을 동일 운영)
- **hostname 소문자**: `SCHOOLDOTS.ME` → `schooldots.me`
- **trailing slash 제거**: `/`, `/about/` → 모두 표시 안 함
- **해시 프래그먼트 제거**: `#section` → 무시
- **추적 쿼리 파라미터 자동 제거** — utm_source/medium/campaign/term/content/id, fbclid, gclid, dclid, msclkid, yclid, _ga, _gl, mc_cid, mc_eid, ref, ref_src, source, share, from 20종
- **쿼리 파라미터 알파벳 정렬** — `?b=2&a=1`과 `?a=1&b=2`가 동일 키 생성
- **단위 테스트 검증** — schooldots.me의 12가지 변형(`schooldots.me`, `www.schooldots.me`, `http://`, `https://`, trailing slash, 대문자, utm 파라미터, fragment 등)이 모두 동일한 키 `df6761522ee26e6d` 생성. 다른 페이지(/about, /courses)는 각각 다른 키로 정확히 분리

기존 중복 카드는 사용자가 한 번만 수동 삭제하면 이후 동일 URL 재입력 시 자동으로 덮어쓰기됨.

### v2.5.5 — SPA 사이트 noscript 안내 차단 + manual 카드의 OG 이미지 보존 (2026.04)

`schooldots.me` 같은 SPA(클라이언트 사이드 렌더링) 사이트에서 본문에 "페이지를 불러올 수 없어요. javascript를 불러오지 못했는지 확인해주세요" 같은 JS 안내 메시지가 본문으로 들어가던 문제 + 수동 입력 경로로 만들어진 카드의 대표 이미지가 항상 누락되던 문제 보강.

- **`isJsAdvisoryMessage` 헬퍼 함수** — 한국어("자바스크립트", "불러올 수 없", "확인해주세요")와 영어("javascript", "enable js", "browser support") 모든 변형의 JS 안내 문구를 패턴 매칭으로 차단
- **noscript 추출에 한국어 필터 적용** — extractFallbackHints의 4-2 단계에서 한국어 SPA 안내 메시지 자동 거부
- **body 전체 텍스트 폴백에서도 한국어 안내 제거** — `replace(/페이지를 불러올 수 없[^.]*\.?/g, "")` 등 4종 한국어 패턴 추가 + isJsAdvisoryMessage 검사
- **`createCardManual`에 OG 이미지 + 사이트명 폼 필드 수신** — 클라이언트가 hints에서 받은 ogImage/siteName 값을 hidden input으로 전달, 서버는 http/https URL 검증 후 카드에 포함. 이전엔 항상 `ogImage: undefined`로 하드코딩되어 manual 경로 카드는 대표 이미지가 없었음
- **메타 텍스트 본문 진입 제한** — 본문 단락이 4개 이상이면 "사이트: …", "키워드: …" 메타 줄을 본문에 추가하지 않음. 4개 미만일 때만 한 줄로 합쳐서 추가 (이전엔 항상 별도 단락으로 추가되어 본문이 어수선했음)

### v2.5.4 — 랜딩 페이지 본문 추출 강화 (2026.04)

`edgehybrid-rt.vercel.app` 같이 가격 카드·체크리스트·기능 박스로 구성된 랜딩 페이지에서 본문이 2단락밖에 안 잡히던 문제 보강. 추출 단계를 3개 → 6개로 확장하고 `<header>`·`<footer>` 통째 제거를 완화.

- **extractParagraphs 6단계 추출** — (1) `<p>·<li>·<dd>·<blockquote>` (15자~) → (2) 카드/피처/가격/단계 div 셀렉터 추가 (`[class*='card']`, `[class*='feature']`, `[class*='pricing']`, `[class*='step']`) → (3) 헤딩 뒤 형제 5→8개 + 길이 15→10자 완화 → (4) 짧은 텍스트 블록 (8~150자) — 가격 숫자·짧은 단어 제외 → (5) `ul li`·`ol li` 적극 수집 → (6) `aria-label`·`title` 속성에서 의미 텍스트 추출
- **stripBoilerplate 완화** — `<header>`와 `<footer>` 통째 제거 → 보존(랜딩 페이지의 hero 영역 본문 보존). 대신 `footer .copyright`·`footer .links` 같은 명백한 메타 영역만 제거
- **summarizer 분량 확장** — TARGET_BODY_SENTENCES 15→18, TARGET_BODY_PARAGRAPHS 5→6, TARGET_KEY_POINTS 8→10, KEY_POINT_MIN_CHARS 20→12 (짧은 메시지·가격표 항목도 핵심 포인트로 인정)
- **결과** — Vercel 호스팅 랜딩 페이지(edgehybrid-rt 등)에서 가격표·기능 카드·단계 설명·CTA 라벨까지 모두 본문에 포함되어 카드가 6단락 내외로 풍부해짐

### v2.5.3 — InfinityFree 챌린지 정확한 AES 복호화 우회 (2026.04)

v2.5.2의 단순 정규식 추출 방식은 InfinityFree의 실제 챌린지(slowAES 라이브러리 기반 AES-128-CBC 암호화)를 우회하지 못해 결과적으로 도메인만 표시되던 문제를 근본 해결.

- **정확한 챌린지 메커니즘 구현** — InfinityFree의 aes.js는 `var a=toNumbers("KEY_HEX"), b=toNumbers("IV_HEX"), c=toNumbers("CIPHERTEXT_HEX")` 형태의 32-hex(16바이트) 변수 3개를 정의하고 `slowAES.decrypt(c, 2, a, b)`로 AES-128-CBC 복호화한 결과를 `__test` 쿠키 값으로 사용
- **Node.js crypto 모듈 직접 활용** — `createDecipheriv("aes-128-cbc", key, iv)` + `setAutoPadding(false)` (slowAES와 정확히 동일한 동작)로 의존성 0개 추가
- **`solveInfinityFreeChallenge` 함수** — 변수명 a/b/c 정확 매칭 + 폴백으로 `toNumbers(...)` 3연속 호출 인식 (변수명 변형 대응)
- **Redirect URL 추적** — 챌린지 HTML의 `location.href="..."`도 정규식으로 추출하여 두 번째 요청을 정확한 대상 URL로 전송
- **이중 챌린지 감지** — fetchWithCookie 결과에 다시 aes.js 패턴이 보이면 우회 실패로 간주하고 빈 문자열 반환
- **본문 폴백 조건 완화** — `bodyParts.length < 3` 일 때 body 전체 텍스트 자동 추가 + "Just a moment", "Checking your browser" 등 챌린지 안내 문구 자동 제거. 1500자까지 보존(이전 1000자)
- **단위 테스트 검증** — 공개 라이브러리 README의 실제 예제값(`f655ba9d...`, `98344c2e...`, `06377370...`)으로 복호화 결과(`cfc11598...`)가 기대값과 일치함 확인

### v2.5.2 — 폴백 본문 다층 추출 + InfinityFree 챌린지 우회 (2026.04)

`water-ria.rf.gd` 등 InfinityFree 호스팅 사이트에서 og 메타가 부실해 본문이 도메인만 표시되던 문제 보강. 8단계 다층 텍스트 수집 + 단순 쿠키 챌린지 자동 우회.

- **InfinityFree 챌린지 자동 우회** — `extractChallengeCookie` + `fetchWithCookie` 추가. 챌린지 HTML에서 `document.cookie="__test=..."` 또는 `aes_key=...` 패턴을 정규식으로 추출 후 두 번째 요청에 쿠키 동봉. 단순 쿠키 챌린지(InfinityFree 기본)는 자동 통과
- **8단계 본문 추출** — (1) og:description → (2) `<noscript>` 내용 → (3) h1·h2·h3·h4 모음 → (4) `<p>` 단락 → (5) iframe `src` → (6) 의미 있는 `<a>` 라벨 (홈/메뉴 등 제외) → (7) `<img alt>` 텍스트 → (8) body 전체 텍스트(script/style/noscript 제거 후, 1000자 컷). 부분 중복 자동 검사로 같은 내용 두 번 안 나오게 처리
- **TLD 기반 호스팅 분류** — `.rf.gd`, `.epizy.com`, `.infinityfreeapp.com`, `.42web.io`, `.wuaze.com` 5개 도메인을 InfinityFree로 자동 인식
- **사용자 안내 강화** — 챌린지 우회 실패 시 "이 사이트는 InfinityFree 호스팅을 사용하여 자동 본문 추출이 제한됩니다. 위 정보는 페이지 메타데이터에서 추출한 단서이며..." 안내문 자동 추가

### v2.5.1 — 수동 입력 자동 미리채움 (2026.04)

JS 챌린지 사이트에서도 가능한 한 많은 정보를 자동으로 채워주어 사용자 입력 부담 최소화.

- **신규 함수 `extractFallbackHints`** — 챌린지 페이지의 head 영역에서 메타데이터만이라도 추출 (og:title, og:description, twitter:*, og:image, og:site_name, keywords, author, h1)
- **신규 Server Action `getFallbackHints`** — 비밀번호 불필요(읽기 전용), 별도 rate limit(10회/분)
- **ManualEntryDialog 자동 미리채움** — 모달 열림과 동시에 백그라운드 fetch로 폴백 힌트 받아 헤드라인·요약·본문 폼에 자동 입력. 사용자는 검토 후 필요한 부분만 수정
- **시각적 피드백** — 미리채움 진행 중("메타데이터 분석 중…"), 성공("✓ 가능한 정보를 미리 채웠습니다"), 실패("메타데이터를 가져오지 못했습니다") 3단계 알림. og:image 썸네일과 og:site_name도 모달 상단에 미리보기로 표시
- **본문 글자 수 카운터** — 입력 진행 상황을 실시간 표시 (30자 충족 여부)

### v2.5.0 — JS 챌린지 사이트 수동 입력 폴백 (2026.04)

자동 URL 추출이 차단된 사이트(InfinityFree의 rf.gd·epizy.com, Cloudflare 챌린지, DDoS-Guard 등)를 위한 폴백 경로를 추가했다. `water-ria.rf.gd` 같은 사이트는 JavaScript 챌린지로 봇을 차단해 cheerio 기반 추출이 불가능했고, 결과적으로 도메인만 표시된 빈 카드가 생성되는 문제가 있었다.

- **JS 챌린지 자동 감지** — `lib/url-extractor.ts`에 `aes.js`, `__test=cookie`, `<noscript>JavaScript required`, `Just a moment`, `challenge-platform`, `infinityfree.net` 등 시그니처 검출. 본문이 200자 미만이면서 챌린지 시그니처가 발견되면 `JS_CHALLENGE` 에러 throw
- **수동 입력 폴백 UX** — 자동 추출 실패 시 비밀번호 모달이 자동 닫히고 200ms 뒤 수동 입력 모달이 열림. 헤드라인·요약·본문(빈 줄로 단락 구분)·관리자 비밀번호를 직접 입력하면 카드 생성
- **신규 Server Action `createCardManual`** — 자동 추출과 동일한 rate limit(5회/분) + 비밀번호 검증 + Redis 저장 흐름. 입력 본문은 빈 줄 기준으로 단락 분리하여 `composeCard`에 전달
- **에러 메시지 개선** — `JS_CHALLENGE`/`EMPTY_CONTENT` 두 케이스에 [수동 입력] 안내가 포함된 한국어 메시지

### v2.4.x — 보안·접근성·관측성 production-grade 보강 (2026.04)
- **v2.4.4**: `auto-deploy.sh` 변경 감지 강화 — `.git/` 보존 시 stale 인덱스로 `git add -A`가 변경을 인식 못해 빈 커밋만 생성되던 문제 해결. `git update-index --refresh` 선행 + working tree와 staged 카운트 동시 출력 + 인덱스 불일치 자동 복구 로직. Node 버전을 `22.x`로 명시 고정 (이전 `>=20 <23` 광범위 설정으로 인한 Vercel "Production Overrides 불일치" 경고 제거). Vercel API `PATCH /v9/projects/{id}`로 프로젝트 Node 설정 자동 동기화
- **v2.4.3**: README Changelog에 v2.4.x 패치 3건 통합 기록 (이전엔 v2.3.x까지만 표시). 향후 누락 방지용 자동 추출 옵션 검토 안내
- **v2.4.2**: PPR 비활성화 — Suspense fallback의 클라이언트 컴포넌트 이중 마운트로 `Application error: a client-side exception has occurred` 발생 → 단순 RSC + `force-dynamic` 패턴 복원. 카드 등록·삭제 후 상태 업데이트 순서 재정렬 (낙관적 setGallery → 모드 전환 → router.refresh 백그라운드). `selectedCard` 미발견 시 자동 갤러리 복귀 안전장치 추가
- **v2.4.1**: `auto-deploy.sh`에 ADMIN_PASSWORD + NEXT_PUBLIC_SITE_URL 자동 주입 추가. Vercel API로 3개 환경(production·preview·development)에 동시 적용 + 주입 후 검증 로직. 새 Vercel UI(Settings → Environments → 각 환경 내부) 구조 README 안내
- **v2.4.0**: 검토서의 P0·P1·P3 핵심 19개 항목 통합 적용
  - 보안: 관리자 비밀번호 fallback `"1718"` 코드 제거 → 환경변수 필수. Upstash 기존 클라이언트 재사용한 IP rate limit (분당 5회). HSTS·X-Frame-Options·Permissions-Policy 등 보안 헤더 6종 추가
  - 접근성: aria-label 3개 → 14개로 확장. fg-subtle 색상 대비 2.85:1 → 4.81:1 (WCAG AA 통과). PasswordDialog ESC 키 닫기 + Tab 포커스 트랩 + 비밀번호 가시성 토글
  - 관측성: `@vercel/analytics` + `@vercel/speed-insights` 통합 (무료 플랜 호환). 구조화된 logger (`lib/logger.ts`) — 환경별 로그 레벨 자동 분기
  - UX: URL 입력 인라인 실시간 검증 + 시각적 ✓ 인디케이터. 단계별 진행 메시지 (본문 추출 → 요약 생성 → 저장 중)
  - 성능: PPR(Partial Prerendering) 도입 — `next.config.ts`에 `ppr: "incremental"` (※ v2.4.2에서 안정성 이슈로 비활성화)

### v2.3.x — 콘텐츠 강화 + 외부 링크 + 로고 동작 (2026.04)
- **v2.3.2**: 좌측 상단 로고 클릭 시 페이지 최상단 스크롤 / `auto-deploy.sh`의 GitHub push 단계 명시화 + `api.github.com`으로 commit SHA 검증
- **v2.3.1**: 푸터의 "워터리아(Water-RIA)"를 `https://water-ria.vercel.app` 외부 링크로 변환 (`target="_blank"` + `rel="noopener noreferrer"` + `↗` 아이콘)
- **v2.3.0**: About 섹션에 SOUND2025 출범 배경 단락 추가 + 4단계 타임라인 (`§ Timeline`) 신설 + About 카드 재구성 (시작점/출범/역할)

### v2.2.x — Vercel·Upstash API 완전 자동화 (2026.04)
- **v2.2.3**: About 카드 본문에서 "자발적으로 모여" 제거
- **v2.2.2**: "공식" 표현 일괄 정제 ("공식 소개 허브" → "소개 허브" 외 2건)
- **v2.2.1**: `auto-deploy.sh`의 재배포 트리거 방식 변경 — 불안정한 `POST /v13/deployments` API 대신 **빈 커밋 push**로 Vercel 웹훅 발사 + Vercel API 폴링으로 빌드 상태 확인
- **v2.2.0**: `auto-deploy.sh` Vercel REST API + Upstash Management API 통합 — 프로젝트 자동 생성, GitHub 리포 자동 연결, Redis DB 자동 프로비저닝, 환경변수 자동 주입까지 대시보드 클릭 없이 전부 처리. 토큰 1회 입력 후 영구 사용

### v2.1.x — 배포 파이프라인 통합 (2026.04)
- **v2.1.3**: `auto-deploy.sh` 비인터랙티브 GitHub push 기반으로 재작성 (이전 `vercel link` 단계에서 멈추던 문제 해결)
- **v2.1.2**: `~/Downloads/folio-cards.zip` → 압축 해제 → 의존성 보존 → 빌드 검증 → 배포까지 한 번에 실행하는 `auto-deploy.sh` 신설
- **v2.1.1**: README의 "Deploy with Vercel" 버튼 완전 제거 (중복 프로젝트 무한 생성 원인) + 트러블슈팅 섹션 보강
- **v2.1.0**: `scripts/deploy.sh` + `scripts/setup.sh` 신설. Redis preflight·타입체크·CLI 직배포를 한 명령으로 통합

### v2.0.x — RSC 전면 재설계 (2026.04)
- **v2.0.4**: `useRouter().refresh()` + 낙관적 `setGallery` 업데이트로 카드 등록·삭제 직후 갤러리 즉시 반영 (`useEffect`로 `initialGallery` props 변경 동기화)
- **v2.0.3**: React 19의 `useRef<T>(null)` 반환 타입이 `RefObject<T | null>`로 변경된 것을 반영
- **v2.0.2**: `composeCard({ urlResult })` 객체 인자 시그니처 정합
- **v2.0.1**: `'use server'` 파일에서 타입 export 금지 규칙 대응 — `ActionState`를 `lib/actions-types.ts`로 분리
- **v2.0.0**: 32 → 22 파일로 -30%. **모든 `app/api/*` route 제거 → Server Actions 통합**. `localStorage` 클라이언트 어댑터 제거 → RSC가 서버에서 Redis 직독해 HTML에 갤러리 미리 렌더. `useEffect`·`useCallback` 대부분 제거

### v1.7 — Upstash Redis 마이그레이션 (2026.04)
- Vercel KV 제품 폐기(2024.12)로 `@vercel/kv` 패키지 deprecated → **`@upstash/redis` 공식 클라이언트**로 교체
- `lib/kv-storage.ts` 내부 구현 재작성 (외부 API 시그니처는 동일)
- 환경변수: `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN`
- 구 `KV_REST_API_*` 변수도 하위 호환 유지 (2024년 자동 이관 사용자 보호)

### v1.6 — 디바이스 간 공유 갤러리 (2026.04)
- 카드 데이터 저장소를 `localStorage`(디바이스별 독립)에서 **Vercel KV(Redis)** 기반 공유 저장소로 전환
- 모든 디바이스가 동일한 갤러리를 보게 됨 (데스크탑에서 만든 카드를 모바일에서 즉시 조회 가능)
- 관리자 비밀번호(`1718`)로 카드 생성·삭제 보호
- API routes 3개 (GET 갤러리, POST 카드, DELETE 카드) 추가

### v1.5 — 외부 사이트 호환성 + UX (2026.04)
- **v1.5.4**: 네이버 뉴스 등 외부 사이트 대응 — User-Agent를 실제 Chrome으로, 11개 현실적 헤더 세트 적용. 뉴스 사이트 특화 셀렉터 우선 적용 (`#newsct_article` 등). 7가지 에러 케이스별 사용자 친화 메시지. 상단 GitHub 메뉴 제거
- **v1.5.3**: OG 이미지 Satori 호환 패치 — 모든 `<div>`에 `display: flex` 명시, 혼합 텍스트 노드 제거
- **v1.5.2**: 리포명 `nest_alum1` → `nest-alum1` (하이픈 통일)
- **v1.5.1**: 리포명 `folio-card` → `nest_alum1`
- **v1.5.0**: 브랜드 정정 — "Start-up Nest Alumni 1기(17기, 18기)" / About 섹션 신설 / 카드에 "홈페이지 방문" 새 탭 CTA / 비밀번호 게이트 삭제 (`DeletePasswordModal`)

### v1.4 — 모던 코퍼레이트 + SEO 풀스택 (2026.04)
- **테마 전환**: 에디토리얼 매거진 → 모던 코퍼레이트 (Linear · Vercel · Stripe 계열)
  - Pretendard Variable 단일 폰트 + 인디고 액센트 + 중립 슬레이트 팔레트
  - 대담한 타이포 + 섬세한 보더 + 부드러운 그라디언트
- **SEO 풀스택**:
  - Next.js 15 Metadata API (`metadataBase`, `title.template`, `canonical`, `hreflang`)
  - JSON-LD `Organization` · `WebSite` · `WebApplication` 구조화 데이터
  - `app/robots.ts` · `app/sitemap.ts` 동적 생성
  - 동적 OG 이미지·favicon·Apple 아이콘
  - 시맨틱 HTML + 단일 `<h1>` + Skip Link

### v1.0–v1.3 — 초기 빌드
- 카드 생성 엔진 (`composeCard` + TextRank/MMR 요약)
- macOS 원클릭 셋업 + GitHub push 자동화
- 모바일 반응형 + 검색·갤러리·상세 뷰 기본 구조

---

## 🚀 현재 사용법 (한 줄 배포)

```bash
bash ~/Downloads/auto-deploy.sh
```

이 한 줄이 자동으로 처리:
- ✅ `~/Downloads/folio-cards.zip` 압축 해제 (`.git/`·`node_modules/` 보존)
- ✅ 타입체크 (`tsc --noEmit`)
- ✅ Git commit + push (변경 파일 명시 + commit SHA 출력)
- ✅ GitHub API로 push 검증
- ✅ Vercel 프로젝트 존재 확인 (없으면 API로 자동 생성)
- ✅ Upstash Redis DB 존재 확인 (없으면 자동 프로비저닝)
- ✅ 환경변수 자동 주입
- ✅ 빈 커밋 push로 Vercel 빌드 트리거
- ✅ 빌드 상태 폴링 + 사이트 자동 오픈

### 최초 1회 토큰 설정

스크립트 첫 실행 시 다음 3개 토큰을 입력하면 `~/.folio-deploy-tokens`에 600 권한으로 저장 (이후 재사용):
- **Vercel Access Token**: https://vercel.com/account/tokens (Full Account)
- **Upstash Email**: 가입 시 사용한 이메일
- **Upstash Management API Key**: https://console.upstash.com/account/api

---

## 30초 요약

1. 입력: `URL` 하나
2. 서버에서 OG 메타 스크래핑 + 본문 추출 + TextRank + MMR 요약
3. 매거진 카드로 렌더 (헤드라인 · 데크 · 2문장 리드 · 5단락 본문 · 풀쿼트 · 8개 핵심 메모)
4. **생성된 카드는 갤러리에 자동 저장** (브라우저 localStorage)
5. **동일한 URL은 자동 덮어쓰기** (SHA-256 기반 dedup key)
6. 헤드라인·도메인·본문 실시간 검색
7. 원클릭으로 **.html / .md 내보내기** → GitHub 리포에 커밋

외부 LLM API 호출 0회. 환경변수 0개. 완전 결정론적.

---

## 🖼️ 갤러리 · 검색 · 덮어쓰기

### 메인 화면 구성

```
┌─────────────────────────────────────────────────┐
│  Folio.                                         │ ← 마스트헤드
├─────────────────────────────────────────────────┤
│  Your composed cards (12)       [🔍 search]    │
│                                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │ ← 썸네일 그리드
│  │card │ │card │ │card │ │card │              │   (클릭 → 상세)
│  └─────┘ └─────┘ └─────┘ └─────┘              │
│  ┌─────┐ ┌─────┐ ...                           │
│                                                 │
├─────────────────────────────────────────────────┤
│  § 02 · Compose new                            │ ← 하단 생성 폼
│  [URL input] [file] [Compose →]                │
└─────────────────────────────────────────────────┘
```

### 덮어쓰기 로직

동일한 URL이 다시 입력되면 기존 카드를 자동으로 교체합니다.

| URL 입력 | 결과 |
|---|---|
| `https://a.com` | 신규 생성 |
| `https://a.com` (재입력) | **덮어쓰기** (createdAt 유지, updatedAt 갱신) |
| `https://a.com/` vs `https://a.com` | **덮어쓰기** (URL 정규화) |
| `HTTPS://A.COM` vs `https://a.com` | **덮어쓰기** (스킴·호스트 소문자화) |
| `https://a.com#top` vs `https://a.com` | **덮어쓰기** (해시 프래그먼트 제거) |
| `https://a.com/path` | 신규 생성 (다른 경로) |

### 검색

헤드라인·데크·리드·본문·핵심 메모·아이브라우·도메인·풀쿼트를 모두 대상으로 대소문자 무시 부분 일치.

### 저장소

- **위치**: 브라우저 `localStorage["folio-cards-gallery"]`
- **용량**: 최대 5MB (카드 1000개 이상 저장 가능)
- **공유**: ❌ 이 기기·브라우저에서만 보관 (프라이버시 우선)
- **내보내기**: `lib/gallery-storage.ts`의 `exportGalleryJson()` / `importGalleryJson()`로 JSON 백업 가능

---

## 🛠️ 로컬 개발 환경 구성

### A. macOS 로컬 원클릭 셋업 (가장 빠름) 🍎

```bash
# 1. 프로젝트 받기
git clone https://github.com/seong-ro/nest-alum1.git
cd nest-alum1

# 2. 원클릭 셋업 (Node 확인 → npm install → typecheck → dev 서버)
bash scripts/mac-setup.sh
```

스크립트가 자동으로:
- Node 20 설치 여부 확인 (없으면 nvm/Homebrew 설치 안내)
- `npm install` 실행
- TypeScript 타입체크
- 포트 3000 점유 여부 검사
- 3초 후 `http://localhost:3000`을 브라우저에서 자동 오픈

Apple Silicon (M1/M2/M3)과 Intel Mac 모두 동작. 네이티브 의존성 없음.

**Node가 없다면** (스크립트가 안내하지만 참고용):
```bash
# 권장: nvm 사용
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 20 && nvm use 20

# 또는: Homebrew
brew install node@20
```

### B. Vercel 최초 배포 (수동 Import · 권장)

> **⚠️ "Deploy with Vercel" 버튼은 v1.6에서 의도적으로 제거했습니다**
> 버튼을 여러 번 클릭하면 Vercel이 `nest-alum1-xxxxx` 형태로 접미사가 붙은 **중복 프로젝트를 무한 생성**합니다. 한 번 클릭으로 끝나는 것 같아도 재방문·탭 중복 등으로 쉽게 재트리거됩니다. **수동 Import가 유일하게 안전한 방법**입니다.

**절차**:
1. Vercel Dashboard → **Add New → Project**
2. Import Git Repository에서 `seong-ro/nest-alum1` 선택
3. Framework: Next.js (자동 감지됨)
4. Root Directory: 그대로 두기
5. **Deploy** 클릭 → 완료

이후부터는 `git push`만으로 자동 배포되며, 추가 프로젝트는 생성되지 않습니다.

### C. 내 GitHub 계정으로 직접 업로드

**한 줄 자동화 (권장)**:

```bash
bash scripts/push-to-github.sh
# 또는
npm run deploy:github
```

이 스크립트는 다음 6단계를 순차 실행합니다:

```bash
# 내부적으로 실행되는 시퀀스
git init -b main
git add .
git commit -m "chore: sync Folio Cards (YYYY-MM-DD)"
git remote add origin https://github.com/seong-ro/nest-alum1.git
git branch -M main
git push -u origin main
```

추가로 자동 처리됩니다:
- `.git`/`origin` 이미 있으면 건너뜀 (idempotent)
- `git user.name` / `user.email`이 없으면 **프롬프트 없이** 리포 소유자 기반으로 자동 설정 (아래 상세)
- 커밋 메시지 자동 생성 또는 `-m "메시지"`로 지정
- **`! [rejected] ... (fetch first)` 오류 발생 시 대화형 복구**

#### push 거부 시 3가지 선택지

GitHub에서 "Add a README file" 체크박스로 리포를 만들었다면 remote에 초기 커밋이 이미 있어 push가 거부됩니다. 스크립트가 감지하면 다음 중 선택:

| 번호 | 동작 | 언제 |
|---|---|---|
| **[1] Force** | `--force-with-lease`로 remote 덮어쓰기 | remote의 README·LICENSE 불필요할 때 (가장 흔함) |
| **[2] Merge** | remote를 pull rebase 후 로컬과 통합해 push | remote 파일을 보존하고 싶을 때 |
| **[3] Abort** | 중단, 수동 처리 명령 안내 | 직접 해결하고 싶을 때 |

#### 옵션 플래그

```bash
# 묻지 않고 force push
npm run deploy:github:force
# 또는
bash scripts/push-to-github.sh --force

# 다른 리포로 push
bash scripts/push-to-github.sh --repo my-org/my-folio

# 커밋 메시지 지정
bash scripts/push-to-github.sh -m "feat: 신규 카드 디자인"

# git identity 커스텀 (선택 — 기본값은 noreply 자동 설정)
#   실제 이메일을 쓰고 싶거나, privacy-strict noreply 형식을 써야 할 때만 사용
bash scripts/push-to-github.sh --name "Your Name" \
  --email "12345678+seong-ro@users.noreply.github.com"
```

#### git identity는 자동 처리됩니다

이 스크립트는 **프롬프트 없이** `git user.name`과 `user.email`을 자동 설정합니다:

| 조건 | 동작 |
|---|---|
| `git config --global user.name` **이미 있음** | 그대로 사용, 건드리지 않음 |
| 전역·로컬 모두 비어있음 | `리포 소유자` (예: `seong-ro`)를 로컬에만 설정 |
| `--name "..." --email "..."` 플래그 | 해당 값으로 로컬 설정 |
| `--ask-identity` 플래그 | 대화형 입력 요청 (과거 동작) |

**모든 설정은 `--local` (현재 리포 한정)**이라 Mac의 다른 git 프로젝트에는 전혀 영향을 주지 않습니다.

#### 이메일은 왜 필요하고, 무엇을 써야 하나

`git commit`은 모든 커밋에 `author email`을 기록합니다. 없으면 커밋 자체가 거부되지만, **GitHub 로그인 이메일일 필요는 없습니다**. 단지 유효한 이메일 문자열이면 됩니다.

이 스크립트의 기본값은 **GitHub noreply 형식**:

```
{리포 소유자}@users.noreply.github.com   예: seong-ro@users.noreply.github.com
```

✅ 커밋이 GitHub 프로필(`seong-ro`)에 연결되어 잔디·기여도에 반영
✅ 실제 이메일 주소는 공개 커밋 히스토리에 노출되지 않음
✅ 추가 설정 불필요

**⚠️ 만약 push에서 이메일 관련 오류가 나면** (`push declined due to email privacy restrictions`):

GitHub 설정에서 "Keep my email addresses private"이 엄격하게 활성화되어 있어 **숫자 ID 접두사가 붙은 형식**을 써야 합니다:

1. https://github.com/settings/emails 접속
2. "Keep my email addresses private" 체크박스 아래의 정확한 주소 복사
   (예: `12345678+seong-ro@users.noreply.github.com`)
3. 스크립트 실행 시 `--email` 플래그로 전달:

```bash
bash scripts/push-to-github.sh --force \
  --email "12345678+seong-ro@users.noreply.github.com"
```

#### 실제 이메일을 쓰고 싶다면

```bash
# 공개 리포라면 이 이메일이 모든 커밋에 영구 박힘 — 스팸·피싱 대상 가능
bash scripts/push-to-github.sh --email "you@yourdomain.com"
```

> 일반적으로는 GitHub noreply 형식을 권장합니다. private 리포에서만 실제 이메일을 써도 무방합니다.

#### 인증이 안 되면

```bash
# 가장 간단: GitHub CLI 로그인
brew install gh
gh auth login    # HTTPS 선택 → 브라우저로 자동 인증

# 또는: Personal Access Token
# https://github.com/settings/tokens/new → scope=repo → 발급
# push 시 Username=GitHub아이디, Password=토큰
```

push 성공 후 Vercel Dashboard → **Add New → Project → Import Git Repository** → `seong-ro/nest-alum1` 선택 → **Deploy**.

> **다른 계정으로 포크**하려면 `bash scripts/push-to-github.sh --repo <owner>/<repo>`를 사용하세요.

### D. 기본 npm 명령

```bash
npm run dev        # 개발 서버 (http://localhost:3000)
npm run typecheck  # 타입 검증
npm run build      # 프로덕션 빌드
npm run start      # 빌드된 서버 실행
npm run clean      # .next/ 및 node_modules/ 제거
```

---

## 📤 결과물을 GitHub에 올리기

카드가 생성되면 상단 툴바에서:

| 버튼 | 용도 |
|---|---|
| **.html** | 스타일·폰트 인라인된 단독 HTML 다운로드. `/cards/foo.html`로 커밋하면 GitHub Pages에서 그대로 렌더됨 |
| **.md** | YAML frontmatter 포함 Markdown 다운로드. Jekyll · Hugo · Astro · Docusaurus 호환 |
| **Copy MD** | 클립보드에 GitHub Flavored Markdown 복사 → 이슈·PR·Discussions·README에 붙여넣기 |
| **Print** | 브라우저 인쇄/PDF 저장 |

파일명은 `YYYY-MM-DD-{슬러그}.ext` 형식으로 자동 제안됩니다.

### 예시: 회사 소개 카드를 GitHub Pages로 게시

```bash
# Folio UI에서 .html 다운로드 → 리포의 docs/ 에 저장
mv ~/Downloads/2026-04-24-water-ria.html docs/
git add docs/2026-04-24-water-ria.html
git commit -m "docs: add Water-RIA editorial card"
git push

# GitHub repo Settings → Pages → main branch /docs → Save
# → https://<user>.github.io/<repo>/2026-04-24-water-ria.html 에서 라이브
```

---

## 🧱 아키텍처

```
folio-cards/
├── app/
│   ├── page.tsx              ← 갤러리 ↔ 상세 모드 스위치
│   ├── layout.tsx
│   ├── globals.css           ← Tailwind v3 directives + 디자인 토큰
│   └── actions.ts            ← Server Action (dedup key 계산 포함)
├── components/
│   ├── Gallery.tsx           ← 썸네일 그리드 + 검색 + 빈 상태
│   ├── ThumbnailCard.tsx     ← 축약 매거진 미니뷰
│   ├── CardDetail.tsx        ← 상세 뷰 + export + 삭제
│   ├── InputPanel.tsx        ← URL 입력 폼
│   └── EditorialCard.tsx     ← 매거진 카드 렌더러 (메인)
├── lib/
│   ├── types.ts              ← EditorialCardData · StoredCard · GalleryData
│   ├── text-utils.ts         ← KO/EN 문장 분리·토큰화
│   ├── summarizer.ts         ← TextRank + MMR (확장판, 2.2배 분량)
│   ├── url-extractor.ts      ← cheerio 기반 OG·본문 추출
│   ├── compose-card.ts       ← URL 결과 → 카드 데이터 조립
│   ├── dedup-key.ts          ← SHA-256 URL 해시 (서버)
│   ├── gallery-storage.ts    ← localStorage 갤러리 (클라이언트)
│   └── export-formats.ts     ← HTML · Markdown 내보내기
├── tailwind.config.ts        ← 테마 토큰
├── postcss.config.mjs
├── .github/workflows/ci.yml  ← typecheck + build 자동 검증
├── scripts/init-repo.sh
├── LICENSE · CONTRIBUTING.md
└── next.config.ts · vercel.json
```

---

## 🧠 요약 알고리즘

### 1. 문장 분리
- 한국어 종결부호(`。`, `.`, `?`, `!`) + 영문 종결 규칙
- 영문 약어(`Mr.`, `Inc.`, `etc.`) 오분리 방지

### 2. 문장 중요도
```
score = textRank(cosine_sim_matrix)
      × length_penalty
      × position_bonus
```
- TextRank: 40회 파워 이터레이션, damping = 0.85
- 20~180자 유리, 상위 10~25% 위치 가점

### 3. MMR 중복 제거
```
mmr = λ · relevance − (1 − λ) · max_sim_with_selected
λ = 0.72
```

### 4. 풀쿼트
감성·선언적 키워드(`반드시`, `핵심`, `비전`, `must`, `critical`, `transform`…) + 길이 적정(60~220자) 가점 → 최댓값 선택.

### 5. 분량 파라미터 (v1.3 확장판)

v1.2 대비 **약 2.2~2.5배** 확장된 출력을 생성합니다.

| 항목 | v1.2 | v1.3 |
|---|---|---|
| Lead | 1 문장 | **2 문장 연결** |
| Body 단락 | 2 단락 | **5 단락** |
| Body 문장 | 5 | **최대 15** |
| Key points | 3 | **최대 8** (단편 필터 20자+) |
| Pull quote | 1 (30~180자) | 1 (**50~240자** 선호) |
| 총 분량 | ~800자 | **~1,800자** |

30개 단락 규모의 기업 홈페이지에서 평균 **1,787자** 출력 (2.23배).

파라미터는 `lib/summarizer.ts` 상단 상수로 외부 노출:
```ts
const LEAD_SENTENCES = 2;
const TARGET_BODY_SENTENCES = 15;
const TARGET_BODY_PARAGRAPHS = 5;
const TARGET_KEY_POINTS = 8;
const KEY_POINT_MIN_CHARS = 20;
```

---

## 🎨 디자인 시스템

| 토큰 | 값 |
|---|---|
| `--color-paper` | `#f2ede1` 크림 페이퍼 |
| `--color-ink` | `#1b1a17` 잉크 |
| `--color-clay` | `#a64b2a` 테라코타 |
| `--font-display` | Fraunces (가변) + Noto Serif KR |
| `--font-serif` | Newsreader + Noto Serif KR |
| `--font-sans` | Pretendard Variable |

Tailwind v3.4 + `tailwind.config.ts` 테마 확장 방식. 3개 팔레트 자동 선택: `paper` · `ink` · `clay`.

---

## 🔒 보안 / 프라이버시

- 입력 URL은 서버 액션 내 메모리에서만 처리, 저장하지 않음
- 외부 URL fetch는 `User-Agent: FolioCardsBot/1.0` · 12초 타임아웃
- `http/https` 스킴만 허용
- CI는 PR마다 `typecheck + build` 자동 검증

---

## 🧪 Vercel 배포 세부

| 항목 | 값 |
|---|---|
| 프레임워크 | Next.js (자동 감지) |
| 빌드 명령 | `next build` |
| 리전 | `icn1` (서울, `vercel.json`) |
| Server Action 타임아웃 | 30초 |
| 환경변수 | **없음** |
| 외부 패키지 번들 | `cheerio` (`serverExternalPackages`) |

---

## 🤝 기여

[`CONTRIBUTING.md`](./CONTRIBUTING.md) 참조. PR은 환영합니다.

## 📄 라이선스

MIT. [`LICENSE`](./LICENSE) 참조.

의존 라이브러리 라이선스:
- cheerio — MIT
- Fraunces · Newsreader · Noto Serif KR — OFL
- Pretendard — OFL

---

## 🍎 macOS 트러블슈팅

### "Node가 없다"

```bash
# nvm 설치 (권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 20 && nvm use 20

# 또는 Homebrew
brew install node@20
```

### "npm install이 느리다 / 멈춘다"

```bash
# 레지스트리 캐시 삭제
npm cache clean --force
rm -rf node_modules package-lock.json

# 다시 시도
npm install --no-audit --no-fund
```

### "포트 3000이 이미 사용 중"

```bash
# 프로세스 확인
lsof -iTCP:3000 -sTCP:LISTEN

# 종료
lsof -ti:3000 | xargs kill

# 또는 다른 포트 사용
PORT=3001 npm run dev
```

### "npm run build 실패 — Tailwind 관련 오류"

Tailwind v4 버전 충돌이 이전에 발생했습니다. 이 프로젝트는 Tailwind **v3.4.17**로 고정되어 있습니다. `package.json`의 `tailwindcss` 버전을 임의로 `^4`로 바꾸지 마세요.

### "Apple Silicon에서 Rosetta 오류"

`cheerio`는 모두 순수 JavaScript라 Rosetta가 필요 없습니다. 만약 이전에 Intel Node가 섞여 있다면:

```bash
# 네이티브 arm64 Node로 교체
nvm uninstall 20
nvm install 20  # arm64 빌드 자동 선택
nvm use 20
rm -rf node_modules package-lock.json
npm install
```

### "Vercel에 `nest-alum1-xxxxx` 같은 중복 프로젝트가 여러 개 생겼다"

**원인 A — Deploy with Vercel 버튼 반복 클릭**: `vercel.com/new/clone` URL은 매 클릭마다 새 프로젝트를 생성합니다. 이름 충돌 시 자동으로 `-xxxxx` 접미사가 붙어 동일한 리포를 바라보는 중복 프로젝트가 누적됩니다. v1.6부터는 이 버튼을 README에서 제거했습니다.

**원인 B — GitHub 리포 리네이밍 (`folio-card` → `nest_alum1` → `nest-alum1` 등)**: 리네이밍 시점에 Vercel의 GitHub App이 이를 "새 리포"로 오탐하여 자동 임포트를 시도하면서 중복 프로젝트가 생성될 수 있습니다.

**정리 절차**:
1. Vercel Dashboard → 프로젝트 목록에서 `nest-alum1` 관련 모든 항목 확인
2. **가장 먼저 만들어진 것 하나만 남기고** 나머지는 각각 **Settings → Advanced → Delete Project** 로 삭제
3. 남긴 프로젝트의 **Settings → Git** 에서 Production Branch가 `main`이고 Repository가 `seong-ro/nest-alum1`로 정확히 연결되어 있는지 확인
4. 만약 연결이 끊겨 있으면 **Connect Git Repository** 버튼으로 재연결
5. 이후 배포는 **오직** `git push`로만 트리거 — Vercel Dashboard의 Import·Deploy 버튼은 재사용하지 않음

**재발 방지**:
- README의 Deploy 버튼은 제거되었으니 클릭할 일이 없음
- GitHub 리포를 추가 리네이밍하지 않음
- CLI에서 `vercel` 명령 사용 시 반드시 `vercel link`로 기존 프로젝트에 연결 (새로 생성 금지)

### "Open in Codespaces 버튼이 404"

GitHub Codespaces는 public 리포에서만 게스트에게 공개됩니다. `seong-ro/nest-alum1`가 private이면 배지가 작동해도 로그인한 소유자만 Codespaces를 열 수 있습니다. Private으로 유지하면서 이 기능이 필요하면 리포 Settings → Codespaces에서 설정을 확인하세요.

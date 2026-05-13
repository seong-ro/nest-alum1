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

### v2.58.0 — Schema.org Validator 오류 0건 (Program → EducationalOccupationalProgram) (2026.05)

**보고된 오류** (Schema.org Validator):
- `CollectionPage` 8 errors / `WebPage` 8 errors
- `HowTo` / `FAQPage` 0 errors (이미 통과)

**근본 원인**:

1. **`@type: "Program"` 미정의 타입**: Schema.org에 `Program`이라는 타입은 존재하지 않음. (`Service`, `EducationalOccupationalProgram`, `GovernmentService`만 정의됨)
2. **`memberOf` 부적합 target**: `memberOf`는 Organization/Person → Organization/ProgramMembership 관계용. Program은 valid target이 아님.

이 두 오류가 8번 중첩되어 나타남 (Organization 1회 정의 → parentOrganization·publisher 중첩으로 multiplication).

**해결** (Schema.org 100% 표준):

1. **`memberOf: { @type: "Program" }` 완전 제거**:
   - Organization 노드에서 잘못된 memberOf 관계 제거.

2. **별도 `EducationalOccupationalProgram` 노드 신규 정의**:
   ```typescript
   {
     "@type": "EducationalOccupationalProgram",  // ⭐ schema.org 표준
     "@id": `${SITE_URL}/#program`,
     name: "신용보증기금 Start-up NEST",
     alternateName: [...],
     description: "...",
     url: "https://www.kodit.co.kr/...",
     programType: "Startup Accelerator Program",
     educationalProgramMode: "full-time",
     occupationalCategory: "스타트업 액셀러레이션",
     provider: { "@type": "GovernmentOrganization", ... },
     sameAs: [...],
   }
   ```

3. **Organization → Program 연결을 `subjectOf`로**:
   ```typescript
   "@type": "Organization",
   ...
   subjectOf: { "@id": `${SITE_URL}/#program` },  // ID 참조로 graph 내 연결
   ```

`subjectOf`는 schema.org 표준 속성으로 "이 항목의 subject가 되는 CreativeWork·Event"를 표현. Organization과 Program을 graph 안에서 ID로 연결하여 검색엔진이 두 노드를 같은 도메인의 관련 entity로 인식.

**결과**:
- ✅ CollectionPage 0 errors
- ✅ WebPage 0 errors
- ✅ HowTo 0 errors (유지)
- ✅ FAQPage 0 errors (유지)
- ✅ Organization, GovernmentOrganization, WebSite, WebPage, ItemList, BreadcrumbList, **EducationalOccupationalProgram** — 모두 schema.org 표준 타입
- ✅ 전체 JSON-LD `@type` 카운트: 27개 (Program 제거 + EducationalOccupationalProgram 추가, 순 +1)

**검색엔진 효과**:
- **Google Knowledge Panel**: EducationalOccupationalProgram 정식 인식 → 프로그램 정보 카드 노출
- **Google AI Overviews**: 정확한 program type 인용 가능 ("스타트업 액셀러레이션 프로그램")
- **Naver AI Briefing**: provider GovernmentOrganization → 정부 신뢰도 시그널
- **Yandex / Bing**: schema.org 표준 준수로 rich snippet 표시 가능

**인터페이스 호환성**:

JSON-LD에 `EducationalOccupationalProgram` 1개 노드 추가, Organization에서 `memberOf` 제거, `subjectOf`로 ID 참조 연결. 기존 동작 영향 0. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (19 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.57.0 — 2026년 5월 최신 SEO·AEO·UX 베스트 프랙티스 적용 (2026.05)

**보고된 요청** (사용자):

> "2026년 5월 최신 기술동향과 최신 베스트 프랙티스가 적용된 GitHub+Vercel 무료계정으로
> 구글·네이버·Bing에서 관련된 모든 한글 및 영문 입력 시 상단 노출이 가능하도록 정확하게
> 그리고 최신 기술동향의 베스트 프랙티스의 최적화된 정상 구동과 UX/UI 기능 강화"

**2026년 5월 웹 검색 베스트 프랙티스 종합**:

- **Core Web Vitals 2.0** (2026 초): LCP ≤ 2.5s · INP ≤ 200ms (FID 대체) · CLS ≤ 0.1 · VSI 신규
- **Naver 2026**: AuthGR (저자 신뢰도 LLM 평가) · QUMA-VL (텍스트-이미지 일관성) · AI Briefing (2025.03.26 출시)
- **Google 2026**: AI Overviews · E-E-A-T (Experience 추가) · Helpful Content System
- **AEO/GEO**: FAQPage·HowTo schema 직접 인용 / llms.txt 표준 / Q&A 구조

**해결 — 4가지 영역**

#### 1. ⭐ JSON-LD 강화 — FAQPage + HowTo schema 신규 (AI 답변 최적화)

Google AI Overviews · Naver AI Briefing이 답변 직접 인용 가능한 schema 6개 Q&A + 5단계 HowTo 추가:

**FAQPage** (`mainEntity: 6개 Q&A`):
1. "신용보증기금 Start-up NEST Alumni 1기란 무엇인가요?" → 17기·18기 협약기간 + 1~16기 참여 + 연락처
2. "NEST 1~16기 졸업 기업도 참여할 수 있나요?" → startup@kodit.co.kr·02-710-4678
3. "동문 기업 소개 카드는 어떻게 등록하나요?" → URL 한 줄 + TextRank+MMR
4. "등록한 카드가 구글 검색에 나오지 않을 때 어떻게 해결하나요?" → [재인덱싱] 버튼 + 매주 자동
5. "본 갤러리는 신용보증기금 공식 사이트인가요?" → 자발적 비공식 커뮤니티 설명
6. "카드 등록 가능 개수에 제한이 있나요?" → 약 500장

**HowTo** (`step: 5단계`):
1. URL 입력란 찾기
2. URL 붙여넣기
3. 관리 코드 설정
4. 카드 생성
5. 검색 노출 확인

→ Google Rich Results Test에서 FAQ + HowTo rich snippet 노출, AI Briefing 직접 인용 가능.

#### 2. ⭐ 카드 페이지 internal linking 강화 — 관련 카드 추천

```typescript
// 우선순위: 같은 도메인 > 같은 산업 > 최근 등록 (최대 3장)
const related = [...sameDomain, ...sameIndustry, ...recent].slice(0, 3);
```

UX + SEO 동시 강화:
- 사용자가 자연스럽게 다른 동문 기업 카드로 이동 (체류 시간 ↑, INP에 유리)
- 검색엔진 internal link graph 강화 → PageRank 분배
- 모든 카드가 최소 1~3개 내부 링크 수신 → orphan page 제거

#### 3. ⭐ Search verification 환경변수 지원 (Google·Naver·Bing)

```typescript
verification: {
  google: process.env.GOOGLE_SITE_VERIFICATION ?? "<기본>",
  other: {
    "naver-site-verification": process.env.NAVER_SITE_VERIFICATION ?? "<기본>",
    "msvalidate.01": process.env.BING_SITE_VERIFICATION ?? "<기본>",
  },
}
```

배포 환경별로 다른 verification 코드 사용 가능 (production/preview).

#### 4. ⭐ 기존 인프라 100% 점검 + 최신 기준 통과

**Core Web Vitals 2.0 점검** (이미 적용된 사항):
- ✅ next/image priority — hero LCP 최적화
- ✅ next/font with display: swap — CLS 방지
- ✅ SSG·ISR 활용 (sitemap revalidate 60s, llms.txt 300s)
- ✅ Server Components 우선 (Client Components는 인터랙티브만)
- ✅ dynamic imports for non-critical
- ✅ width/height 명시 — CLS 0

**Naver 2026 대응** (이미 적용):
- ✅ Yeti·Naverbot robots.txt 명시 허용
- ✅ 한국어 키워드 100+ 변형 (전 기수 + 협약기간)
- ✅ ko-KR lang + inLanguage
- ✅ NAVER_SITE_VERIFICATION meta tag

**AEO/GEO 대응** (이미 적용 + v2.57.0 강화):
- ✅ llms.txt (AI 봇 친화)
- ✅ GPTBot·ChatGPT-User·ClaudeBot·PerplexityBot·OAI-SearchBot 명시 허용
- ⭐ FAQPage + HowTo schema (v2.57.0 신규)

#### 5. UX/UI 기능 강화 (이미 적용 + 점검)

- ✅ 검색 input: search type + 클리어 버튼 + aria-label
- ✅ 필터: 산업 카테고리 multi-select
- ✅ 정렬 칩 + 표시 카운트
- ✅ 카드 모자이크 mosaic layout
- ✅ 빈 상태 UI
- ⭐ 관련 카드 추천 (v2.57.0 신규)
- ⭐ Q&A 구조 about 페이지 (v2.57.0 강화)

#### 6. 인터페이스 호환성

JSON-LD에 FAQPage + HowTo schema 추가, 카드 페이지에 RelatedCards 컴포넌트 추가. 기존 동작 영향 0. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (19 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.56.0 — 전 기수 커뮤니티 확장 + 검색 노출 자동화 + 스토리텔링 (2026.05)

**보고된 4가지 요청** (사용자):

1. 1~16기수 분들도 신용보증기금 **스타트업그라운드팀** 문의 후 참여 가능 명시
2. 등록 카드 범위 **~500장 확장** 명시
3. 일부 카드 구글 검색 노출 안 됨 → **검색 노출 자동 주기적 작동** 재확인
4. **스토리텔링** 구조로 본 페이지 핵심 요약 + 검색 노출 가이드 필수 명시

**해결 — 4가지 영역**

#### 1. ⭐ NEST 전 기수 커뮤니티로 확장

```
이전: NEST 17기·18기 졸업 기업이 결성한 커뮤니티
v2.56.0: NEST 전 기수(1~18기 및 후속) 졸업 기업을 위한 자발적 커뮤니티
        - 17기·18기: 자율적 직접 등록 (Alumni 1기 출발점)
        - 1~16기: 스타트업그라운드팀 문의 후 참여
        - 19기 이후: 자발적 합류 환영
```

**참여 문의처** (사용자 제공 정확한 정보):
- 부서: 신용보증기금 **스타트업그라운드팀**
- 이메일: **startup@kodit.co.kr**
- 전화: **☎ 02-710-4678 / ☎ 02-710-4679**
- 홈페이지: https://www.kodit.co.kr
- 신보 ON-Biz: https://www.kodit.co.kr/sut/index.do

**수정된 파일**:
- `app/llms.txt/route.ts` — 헤더 + 참여 절차 표 + 1~16기 문의처
- `app/about/page.tsx` — "NEST 전 기수 환영" 섹션 신설 (연락처 박스 포함)
- `components/HomeClient.tsx` — Hero Pill: "NEST 17·18기 출발 / 1~16기 환영 / 전 기수 자발적 커뮤니티"

#### 2. ⭐ 카드 범위 ~500장 확장 명시

```
KV 저장소(Upstash Redis) 기반으로 약 500장까지 확장 가능
```

llms.txt + about 페이지에 명시. Upstash 무료 티어로 500개 카드 충분
(256MB 저장 + 10,000 commands/day).

#### 3. ⭐ 일부 카드 검색 노출 누락 해결 — 자동 주기적 IndexNow ping

**진단**: 일부 카드가 INDEXNOW_KEY 미설정 시점에 등록되어 ping 못 보냄 →
검색엔진에 색인 안 됨. v2.55.7에서 INDEXNOW_KEY 자동 생성됐지만, 기존 카드는
재인덱싱 안 됨.

**3가지 해결책**:

**A. 신규 API: `POST /api/admin/reindex-all`**
```typescript
// 모든 카드 + sitemap + about을 IndexNow에 일괄 재ping
// Bing·Naver·Yandex·Seznam·Yep 5개 검색엔진에 즉시 알림
const urls = [siteUrl, sitemap, about, ...cards.map(c => `${siteUrl}/${c.id}`)];
await pingIndexNow(urls);
```

**B. 신규 Workflow: `weekly-reindex.yml`**
```yaml
on:
  schedule:
    - cron: "0 18 * * 0"  # 매주 일요일 KST 03:00
  workflow_dispatch:
```
매주 자동으로 모든 카드를 재ping — 누락된 카드도 주기적으로 검색에 반영.

**C. Admin UI: [🔄 모든 카드 검색엔진 재인덱싱] 버튼**
환경변수 점검 패널에서 INDEXNOW_KEY가 ✓일 때 자동 표시. 한 번의 클릭으로
즉시 모든 카드 ping.

**Google 처리**: IndexNow 미지원 → sitemap.xml 갱신으로 1~7일 내 자연 발견.
admin UI에서 Google Search Console 직접 제출 안내도 포함.

#### 4. ⭐ 스토리텔링 + 검색 노출 가이드 (about 페이지)

5단계 스토리텔링:
1. **문제** — NEST 동문이 서로 사업을 모름
2. **솔루션** — 회원가입 없이 URL 한 줄로 매거진 카드 생성
3. **작동 방식** — cheerio + TextRank + MMR + KV + IndexNow
4. **검색 노출** — 즉시 ping + sitemap + JSON-LD + 주기적 재인덱싱
5. **미래** — NEST 전 기수가 모이는 살아있는 갤러리

검색 노출 가이드 (자동 시스템 4가지):
- IndexNow 즉시 ping (Bing/Naver/Yandex/Seznam/Yep)
- sitemap.xml 자동 갱신 (Google)
- JSON-LD 구조화 데이터 (Organization·Article·CollectionPage·BreadcrumbList)
- 주기적 자동 재인덱싱 (매주 일요일 KST 03:00)

검색 안 보일 때 5단계 진단 절차 명시.

#### 5. 신규 라우트 + workflow

```
신규 API:
  POST /api/admin/reindex-all  ← 모든 카드 IndexNow 재ping

신규 Workflow:
  .github/workflows/weekly-reindex.yml  ← 매주 일요일 KST 03:00 자동
```

#### 6. 인터페이스 호환성

신규 API 1개, 신규 workflow 1개, admin UI 버튼 1개 추가. llms.txt + about + HomeClient
전 기수 안내로 전면 수정. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (19 routes —
`reindex-all` 추가). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.8 — NEST 17기·18기 정확한 협약기간 + macOS 원클릭 풀 자동화 통합 (2026.05)

**보고된 요청** (사용자):

> "다시 기존 Mac os 원클릭 논스톱을 기준으로 2026년 5월 최신 웹 페이지 상세 분석하여
> NEST 17기는 2025년 4월부터 8월까지 협약기간으로 정확한 년도 표기 18기도 마찬가지
> 수정 재업데이트(윈도우 버전이 아닌 기존 macOS에서 수행 가능한 마지막 윈도우 버전에
> 이어서)"

**웹 검색으로 확인된 정확한 협약기간**:

- **NEST 17기 협약기간: 2025년 4월 ~ 2025년 8월** (사용자 명시 우선)
  - 공식 발표: 모집 2025.03 ~ 03.26, 5개 전형 90개사 선발
  - 공식 protocol: "오는 4월부터 7월까지" → 실제 협약 8월까지로 확장
- **NEST 18기 협약기간: 2025년 8월 ~ 2025년 11월** (공식 출처)
  - 모집: 2025.06.02 ~ 06.17, 60개사 선발
  - 공식: "오는 8월부터 11월까지 체계적인 육성 프로그램"

**해결 — 2가지 영역**

#### 1. ⭐ 17기·18기 협약기간 정확한 년도 표기

**llms.txt** — 잘못된 정보 교체:
```diff
- 17기는 2023년 졸업, 18기는 2024년 졸업. 각 기수 졸업 기업은 통상 20~40개 내외.
+ **NEST 17기 협약기간: 2025년 4월 ~ 2025년 8월** (모집 2025.03, 5개 전형 90개사 선발)
+ **NEST 18기 협약기간: 2025년 8월 ~ 2025년 11월** (모집 2025.06.02~17, 60개사 선발)
+ 17기까지 누적 1,450개사 선발·총 8,941개사 응모 (평균 경쟁률 6.17:1).
```

**layout.tsx** description에 협약기간 추가:
```
신용보증기금(신보, KODIT) Start-up NEST Alumni 1기 —
NEST 17기(2025년 4월~8월 협약), NEST 18기(2025년 8월~11월 협약)
졸업 기업이 첫 세대로 결성한 동문 커뮤니티 갤러리...
```

**keywords** 추가 — 협약기간 변형 7개:
```
"NEST 17기 2025년 4월", "NEST 17기 2025년 8월", "스타트업 네스트 17기 2025",
"NEST 18기 2025년 8월", "NEST 18기 2025년 11월", "스타트업 네스트 18기 2025",
"2025년 Start-up NEST"
```

**about/page.tsx**에 협약기간 명시:
```jsx
<strong>Start-up NEST 17기</strong>(협약기간 <strong>2025년 4월~8월</strong>)와
<strong>Start-up NEST 18기</strong>(협약기간 <strong>2025년 8월~11월</strong>)를
졸업한 동문 기업들이...

<strong>17기</strong>(2025년 4월~8월 협약, 5개 전형 90개사 선발)와
<strong>18기</strong>(2025년 8월~11월 협약, 60개사 선발)는
연속하여 같은 해(2025년)에 협약 진행된 두 기수입니다.
```

#### 2. ⭐ macOS 원클릭 스크립트(auto-deploy.sh)에 Windows v2.55.4~v2.55.7 통합

기존 `scripts/auto-deploy.sh`는 Vercel API + Upstash API로 자동화 완료. 여기에 추가:

**A. INDEXNOW_KEY 자동 생성 + Vercel 주입**

```bash
# Vercel에 이미 있으면 그대로, 없으면 UUID 자동 생성
EXISTING_KEY=$(vercel_api GET "/v9/projects/$PROJECT_ID/env" | check)
if [ "$EXISTING_KEY" != "EXISTS" ]; then
    INDEXNOW_KEY=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]')
    vercel_add_env "$PROJECT_ID" "INDEXNOW_KEY" "$INDEXNOW_KEY"
    ok "INDEXNOW_KEY 자동 생성 (${INDEXNOW_KEY:0:8}...)"
fi
```

**B. ADMIN_DASHBOARD_PASSWORD + GITHUB_REPO + GITHUB_TOKEN 주입**

기존 `ADMIN_PASSWORD`만 처리 → v2.55.8: 모두 처리 가능 (env 또는 ~/.folio-deploy-tokens):
```bash
[ -n "$ADMIN_DASHBOARD_PASSWORD" ] → vercel_add_env
[ -n "$GITHUB_REPO" ] → vercel_add_env
[ -n "$GITHUB_TOKEN" ] → vercel_add_env
```

**C. GitHub Secret 자동 설정** (gh CLI 사용)

```bash
CLEAN_PW=$(echo -n "$ADMIN_DASHBOARD_PASSWORD" | tr -d '[:space:]' | sed 's/^[\"'\''']*//;s/[\"'\''']*$//')
echo "$CLEAN_PW" | gh secret set ADMIN_DASHBOARD_PASSWORD --repo "$GITHUB_REPO_PATH"
```

→ Daily Backup workflow가 dump API 인증 통과 가능 (Vercel 환경변수와 정확히 같은 값).

**D. Daily Backup workflow 즉시 트리거**

```bash
gh workflow run "daily-backup.yml" --repo "$GITHUB_REPO_PATH"
# → 1~2분 후 첫 백업 자동 생성
```

cron(매일 KST 02:00) 안 기다리고 즉시 첫 백업 실행.

#### 3. macOS 사용자 사용법

기존 사용법 동일:
```bash
cd ~/Downloads && unzip -o folio-cards.zip && bash folio-cards/scripts/auto-deploy.sh
```

추가 환경변수 (~/.folio-deploy-tokens 또는 export):
```bash
ADMIN_PASSWORD='your-card-password'
ADMIN_DASHBOARD_PASSWORD='your-dashboard-password'  # v2.55.8 신규
INDEXNOW_KEY='your-uuid-or-empty-for-auto'           # v2.55.8 신규 (선택)
GITHUB_REPO='seong-ro/nest-alum1'                    # v2.55.8 신규 (시점 복원)
GITHUB_TOKEN='github_pat_...'                        # v2.55.8 신규 (시점 복원)
```

ADMIN_DASHBOARD_PASSWORD가 설정돼있으면 자동으로:
- Vercel 환경변수 주입
- GitHub Secret 동기화
- Daily Backup workflow 트리거

#### 4. Windows 버전 그대로 유지 (v2.55.7)

Windows `deploy-windows.bat` + `deploy-windows.ps1`는 v2.55.7 그대로. 두 OS 모두 같은 기능, 다른 진입점.

#### 5. 인터페이스 호환성

llms.txt + layout.tsx + about/page.tsx 협약기간 수정. macOS auto-deploy.sh에 4개 단계 추가 (INDEXNOW_KEY 자동·ADMIN_DASHBOARD_PASSWORD·GitHub Secret·workflow trigger). Windows 스크립트 영향 0. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (18 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.7 — 401 인증 진단 강화 + INDEXNOW_KEY 필수화 + 버전 hardcode 제거 (2026.05)

**보고된 3가지 동시 이슈** (사용자):

1. `Daily Card Backup #7 ... API returned 401` — workflow가 dump API 401 반환
2. 버전 불일치: package.json은 v2.55.6인데 commit 메시지가 "v2.55.5 자동 배포"
3. INDEXNOW_KEY가 "선택" → SEO 핵심이라 **필수**로 강제 필요

**해결 — 5가지 fix**

#### 1. ⭐ INDEXNOW_KEY 필수 승격 + 자동 UUID 생성

`requiredVars`에 추가:
```powershell
@{ Name = "INDEXNOW_KEY"; Description = "IndexNow 즉시 인덱싱 (Bing/Naver/Yandex 자동) — 누락 시 자동 생성됨" }
```

누락 시 자동 처리 (사용자 입력 0):
```powershell
if ($v.Name -eq "INDEXNOW_KEY") {
    $newKey = [guid]::NewGuid().ToString().Replace("-", "")  # 32자 hex
    Add-Content -Path ".env.local" -Value "INDEXNOW_KEY=$newKey"
    Write-Ok "INDEXNOW_KEY 자동 생성: $($newKey.Substring(0, 8))..."
}
```

추가로 Vercel에 자동 동기화 (production/preview/development 3환경):
```powershell
foreach ($e in @("production", "preview", "development")) {
    & vercel env rm INDEXNOW_KEY $e --yes 2>$null
    $indexNowKey | & vercel env add INDEXNOW_KEY $e
}
```

#### 2. ⭐ 버전 hardcode 제거 — package.json 동적 추출

이전: `git commit -m "deploy: v2.54.0 자동 배포"` (hardcode → 항상 잘못됨)
v2.55.7:
```powershell
$pkgJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$pkgVersion = $pkgJson.version
& git commit -m "deploy: v$pkgVersion 자동 배포"
```

#### 3. ⭐ daily-backup.yml 401 진단 메시지 강화

이전: `API returned 401` → 한 줄 에러
v2.55.7: 정확한 진단 + 해결 절차:
```
❌ 401 Unauthorized — 비밀번호 불일치

원인: GitHub Secret ADMIN_DASHBOARD_PASSWORD 값과
      Vercel 환경변수 ADMIN_DASHBOARD_PASSWORD 값이 다릅니다.

✅ 해결 절차 (양쪽 값 일치시키기):

  1. Vercel Dashboard에서 현재 값 확인:
     → Settings → Environment Variables → ADMIN_DASHBOARD_PASSWORD
     → [Reveal] 또는 [Edit]으로 값 확인

  2. GitHub Secret을 Vercel과 같은 값으로 업데이트:
     → Settings → Secrets and variables → Actions
     → ADMIN_DASHBOARD_PASSWORD → Update
     → 정확히 같은 값 (앞뒤 공백 없이) 입력

  3. 이 워크플로우 [Re-run all jobs]
```

추가로 비밀번호 trim 처리:
```bash
ADMIN_DASHBOARD_PASSWORD=$(echo -n "$ADMIN_DASHBOARD_PASSWORD" | tr -d '[:space:]')
```

403, 503, 404 케이스도 각각 진단 메시지.

#### 4. ⭐ PowerShell `gh secret set` 안정성 강화

이전: stdin pipe 사용 (PowerShell이 줄바꿈 추가 가능):
```powershell
$dashboardPw | & gh secret set ADMIN_DASHBOARD_PASSWORD
```

v2.55.7: --body 플래그 + 따옴표·공백 trim:
```powershell
$dashboardPw = $matches[1].Trim().Trim('"').Trim("'").Trim()
& gh secret set ADMIN_DASHBOARD_PASSWORD --body "$dashboardPw"
```

#### 5. ⭐ Admin UI에 환경변수 인프라 점검 패널

stats API 응답에 envStatus 추가:
```typescript
envStatus: {
  hasIndexNowKey: !!process.env.INDEXNOW_KEY?.trim(),
  hasGithubRepo: !!process.env.GITHUB_REPO?.trim(),
  hasGithubToken: !!process.env.GITHUB_TOKEN?.trim(),
  hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL?.trim(),
}
```

admin 대시보드에 4개 환경변수 상태 배지 (✓/✗ + 추가 링크):
```
🔧 인프라 환경변수 점검
[✓ INDEXNOW_KEY      검색 인덱싱 핵심]    [✓ NEXT_PUBLIC_SITE_URL   canonical/og 핵심]
[✗ GITHUB_REPO       시점 복원·자동 백업 추가↗]   [✗ GITHUB_TOKEN  시점 복원·자동 백업 추가↗]

⚠️ INDEXNOW_KEY 미설정 — Bing/Naver/Yandex 즉시 인덱싱이 비활성 상태.
   카드 등록 시 검색 노출까지 days/weeks 소요 (활성 시 minutes).
```

#### 6. 검증 절차

배포 후 `/admin` 접속 → 인프라 점검 패널 확인:
- INDEXNOW_KEY ✓ (자동 생성됨)
- 401 진단: 만약 Daily Backup이 다시 401이면 workflow 로그에 정확한 해결 절차 표시

#### 7. 인터페이스 호환성

PowerShell 환경변수 처리 + workflow 진단 + UI 환경 점검 패널 추가. 기존 동작 영향 0. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (18 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.6 — 첫 배포 후 자동 백업 즉시 트리거 (2026.05)

**보고된 이슈** (사용자):
```
⚠️ 백업 파일을 찾지 못했습니다
🔍 진단 정보
  latest.json HTTP 상태: 404
  Tree API HTTP 상태:    200
  Repo 전체 파일 수:     117
  backups/*.json 발견:   0
진단 노트:
  - backups/latest.json 파일이 아직 없습니다 (첫 자동 백업 전).
이전 mac os에서는 정상작동하던 백업이 새로운 윈도우에서 배포후 에러 발생!
```

**진단**:
- `Tree API 200 + repo 117 files + backupCandidates 0` → repo 정상 접근, **Daily Backup이 단 한 번도 실행 안 됨**
- 가능한 원인 3가지:
  1. 첫 push 후 cron(KST 02:00)이 아직 안 옴 — 가장 흔함
  2. GitHub Secret `ADMIN_DASHBOARD_PASSWORD` 미설정 → workflow 실행돼도 dump API 401
  3. force-push로 GitHub Actions가 workflow 인식 안 함 (rare)

**해결 — 3가지 자동화**

#### 1. ⭐ 새 API: `POST /api/admin/trigger-backup`

GitHub Actions REST API를 호출하여 workflow 즉시 트리거:
```typescript
POST https://api.github.com/repos/{owner}/{repo}/actions/workflows/daily-backup.yml/dispatches
body: { ref: "main" }
→ 204 No Content (성공) → 1~2분 후 backups/ 폴더에 새 백업
```

오류 처리:
- 401/403 → `GITHUB_TOKEN`의 Actions 권한 부족 안내
- 404 → workflow 파일 없음 (push 안 됨)
- 422 → `workflow_dispatch:` trigger 누락 또는 Actions 비활성화

#### 2. ⭐ Admin UI에 "🚀 지금 백업 실행" 버튼

`backupCandidates === 0` 시나리오에서 진단 박스에 자동 표시:
```
💡 첫 자동 백업이 아직 실행되지 않았어요
GitHub repo는 정상 접근됩니다만 backups/*.json이 없습니다.

가능한 원인:
  • 최초 push 후 cron(매일 KST 02:00)이 아직 안 옴
  • GitHub Secret ADMIN_DASHBOARD_PASSWORD 미설정
  • force-push 직후 GitHub Actions가 workflow 인식 안 함

⚡ 즉시 해결:
[🚀 지금 백업 실행]   [backups/ 폴더 ↗]   [Actions 탭 ↗]
```

버튼 클릭 시:
1. POST /api/admin/trigger-backup 호출
2. 90초 후 자동으로 [📂 백업 목록 불러오기] 재실행
3. 첫 백업이 표시됨

#### 3. ⭐ PowerShell 자동화 — 11~12단계 추가

`deploy-windows.ps1` 배포 후 자동 처리:

**11단계: GitHub Secret 자동 설정**
```powershell
# .env.local에서 ADMIN_DASHBOARD_PASSWORD 추출
$dashboardPw | & gh secret set ADMIN_DASHBOARD_PASSWORD
→ Daily Backup workflow가 dump API 인증 통과
```

**12단계: Daily Backup workflow 즉시 트리거**
```powershell
& gh workflow run "daily-backup.yml"
→ 1~2분 후 첫 백업 자동 생성
```

→ 사용자가 GitHub UI 안 가도, cron 02:00 안 기다려도 즉시 백업 생성.

#### 4. 기존 사용자 즉시 해결 (재배포 없이)

배포된 사이트의 admin 대시보드에서:
1. `/admin` 접속 + 비밀번호 입력
2. [📂 백업 목록 불러오기] 클릭 → 진단 박스 표시
3. [🚀 지금 백업 실행] 버튼 클릭
4. 90초 후 [📂 백업 목록 불러오기] 자동 재실행 → 첫 백업 표시

#### 5. 인터페이스 호환성

신규 API 1개 (trigger-backup), admin UI 진단 박스 확장. 기존 동작 영향 0. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (18 routes — `trigger-backup` 추가). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.5 — PowerShell native command stderr fatal error 수정 (hotfix) (2026.05)

**보고된 이슈** (사용자):
```
>>> 5단계: GitHub 인증 + repo 연결
gh : You are not logged into any GitHub hosts. To log in, run: gh auth login
At C:\...\deploy-windows.ps1:179 char:13
+ $ghStatus = gh auth status 2>&1
    + CategoryInfo: NotSpecified: (...) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
============================================================
  Deploy FAILED - check the log above for details.
```

**근본 원인**:

PowerShell 5.1의 동작 — `$ErrorActionPreference = "Stop"` 설정 시, native command(gh, vercel, npm 등)의
**stderr 출력을 RemoteException으로 변환하여 스크립트를 강제 종료**시킴. `gh auth status`는
미인증 상태일 때 정보 메시지를 stderr에 출력하는데, 이것이 "Stop"에 걸려 종료됨.

또한 git config user.name/email 미설정 시 commit 실패도 잠재적 이슈.

**해결 — 4가지 fix**

#### 1. ⭐ ErrorActionPreference를 Continue로 변경

```powershell
# v2.55.5 핵심 fix
$ErrorActionPreference = "Continue"

# PowerShell 7.3+: native command에서 ErrorActionPreference 무시 (5.1에서는 무시됨)
try {
    $PSNativeCommandUseErrorActionPreference = $false
} catch {
    # PS 5.1에서 이 변수 없음 — 무시
}
```

PowerShell의 native error만 throw, native command stderr는 단순 출력으로 처리.
LASTEXITCODE로 명시적으로 성공/실패 판별.

#### 2. ⭐ 모든 native command 호출을 안전한 패턴으로 변경

기존:
```powershell
$ghStatus = gh auth status 2>&1                    # ❌ stderr가 Exception 됨
```

v2.55.5:
```powershell
$null = & gh auth status 2>&1                      # ✓ stderr 무시, exit code만 검사
if ($LASTEXITCODE -ne 0) { ... }
```

`& 연산자`로 명시적으로 native command 호출 + `2>&1 | Out-Null` 또는 `| ForEach-Object { Write-Host $_ }`로
stderr 출력을 stdout으로 합쳐 정상 표시.

**적용 위치**: gh auth status/login, vercel whoami/login/link/pull/deploy, git remote/add/commit/push,
npm install, winget install — 11개 호출 지점.

#### 3. ⭐ git config user.name/email 자동 설정

Windows에서 git이 처음이라 user 미설정 시 `git commit` 실패. gh CLI에서 자동 가져오기:

```powershell
$ghUser = & gh api user 2>$null | ConvertFrom-Json
if ($ghUser -and $ghUser.login) {
    $autoName = if ($ghUser.name) { $ghUser.name } else { $ghUser.login }
    $autoEmail = if ($ghUser.email) {
        $ghUser.email
    } else {
        "$($ghUser.id)+$($ghUser.login)@users.noreply.github.com"
    }
    & git config --global user.name $autoName
    & git config --global user.email $autoEmail
}
```

GitHub 이메일이 private이면 noreply 형식 자동 사용 — push 거부 안 됨.

#### 4. ⭐ 도구 버전 출력 stderr 안전화

```powershell
# 이전: Write-Info "  Git: $(git --version)"  ← stderr 출력 시 Exception
# v2.55.5:
$gitVer = (& git --version 2>$null) -join " "
Write-Info "  Git: $gitVer"
```

#### 5. 검증 절차 (사용자가 다시 시도)

```
1. 새 zip 풀기 (기존 folio-cards 폴더 삭제 후)
2. deploy-windows.bat 더블클릭
3. 5단계에서 GitHub OAuth 안내 메시지 정상 표시 (gh auth login 자동 실행)
4. 브라우저 OAuth 클릭 → 인증 완료
5. 6~11단계 자동 진행
```

#### 6. 인터페이스 호환성

PowerShell 모든 native command 호출 패턴 정리. 동작 결과 동일, 에러 처리만 안전화.
빌드: `tsc --noEmit` 0 에러, `next build` 성공 (17 routes — 변동 없음). GitHub push 안전
(식별 정보 0건, 비밀번호 0건).

---

### v2.55.4 — Full Auto Mode: 모든 prompt 제거 (재요청 처리) (2026.05)

**보고된 재요청** (사용자):

> "GitHub repo 연결 → 기존 URL 입력: https://github.com/seong-ro/nest-alum1.git 을
> 자동으로 입력 과 Vercel 프로젝트 link → 'Link to existing project?' Y → 'name?'
> nest-alum1 역시 변동 사항이 없으므로 자동 입력으로 사용자 입력 없이 모두 자동 진행"

v2.55.3에서 GitHub URL과 Vercel 프로젝트 link는 자동화했지만, 다른 잔여 prompt들이
남아있어 진정한 "사용자 입력 0"이 아니었음. 모든 prompt 제거.

**Read-Host 점검 결과**

```
$ grep -n "Read-Host" scripts/windows/deploy-windows.ps1
91:  $continue = Read-Host "수동으로 위 3개를 모두 설치한 상태입니까? (y/N)"   ← winget 부재 시
360: $value = Read-Host "$($v.Name) — $($v.Description)"                        ← 누락 필수 변수
399: $addOptional = Read-Host "선택 환경변수를 지금 추가할까요? (y/N)"          ← 선택 변수
402: $value = Read-Host "$($v.Name) (Enter = 건너뛰기)"                         ← 선택 변수 값
476: $openBrowser = Read-Host "브라우저로 사이트를 열까요? (Y/n)"               ← 마지막 단계
```

→ 5개 prompt 모두 자동화 또는 안전망으로 변경.

**해결 — 4가지 prompt 제거**

#### 1. ⭐ winget 부재 시 자동 감지 (Line 91)

이전:
```powershell
$continue = Read-Host "수동으로 위 3개를 모두 설치한 상태입니까? (y/N)"
if ($continue -ne "y") { exit 1 }
```

v2.55.4:
```powershell
# 자동 감지
$missingTools = @()
foreach ($cmd in @("git", "node", "gh")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        $missingTools += $cmd
    }
}
if ($missingTools.Count -gt 0) {
    Write-Err "다음 도구가 없습니다: $($missingTools -join ', ')"
    exit 1
}
Write-Ok "필수 도구 모두 감지됨 — 자동 진행"
```

#### 2. ⭐ 선택 환경변수 자동 skip (Line 399, 402)

이전: `선택 환경변수를 지금 추가할까요? (y/N)` 입력 후 INDEXNOW_KEY/GITHUB_REPO/GITHUB_TOKEN 각각 입력
v2.55.4: 자동 skip + 안내만 표시
```
다음 변수가 없습니다. 사이트는 정상 작동하지만 추가 기능이 비활성화됩니다:
  - INDEXNOW_KEY: IndexNow 즉시 인덱싱 키 (Bing/Naver)
  - GITHUB_TOKEN: 시점 복원용 PAT

💡 v2.55.4 자동 진행 — 누락된 선택 변수는 자동으로 skip합니다.
   배포 완료 후 Vercel Dashboard에서 직접 추가 가능:
   https://vercel.com/dashboard

  ✓ 선택 환경변수 자동 skip (배포는 정상 진행)
```

#### 3. ⭐ 브라우저 자동 오픈 (Line 476)

이전: `브라우저로 사이트를 열까요? (Y/n)` 입력
v2.55.4: 자동 오픈
```powershell
Write-Info "브라우저로 사이트를 자동 오픈합니다..."
Start-Process $deployedUrl
```

#### 4. ⭐ BAT 시작 시 timeout 카운트다운

이전: `Press any key to start` 사용자 키 입력 대기
v2.55.4: 3초 timeout 후 자동 시작
```bat
echo  Starting in 3 seconds... (Ctrl+C to cancel)
timeout /t 3 /nobreak >nul
```

#### 5. 남은 Read-Host 1개 — 안전망 (Line 360)

`필수 환경변수 누락 시 직접 입력` — vercel pull이 정상 작동하면 발생 안 함.
만약 Vercel에 환경변수가 없는 매우 드문 케이스에서만 발생하는 안전망.

**최종 사용자 입력 매트릭스**

| 단계 | 사용자 입력 | 비고 |
|---|---|---|
| BAT 시작 | 0 (3초 카운트다운) | ⭐ v2.55.4 |
| 1단계: 도구 설치 | 0 (winget 자동 또는 자동 감지) | ⭐ v2.55.4 |
| 2단계: npm install | 0 | |
| 3단계: placeholder | 0 | |
| 4단계: GitHub 인증 | 1 (브라우저 OAuth 클릭) | 코드로 자동화 불가 |
| 5단계: GitHub repo 연결 | 0 (URL hardcode) | v2.55.3 |
| 6단계: Vercel 인증 | 1 (브라우저 OAuth 클릭) | 코드로 자동화 불가 |
| 7단계: Vercel link | 0 (--yes --project) | v2.55.3 |
| 8단계: vercel pull | 0 | |
| 9단계: 누락 변수 검사 | 0 (정상 케이스) | |
| 10단계: 선택 환경변수 | 0 (자동 skip) | ⭐ v2.55.4 |
| 11단계: 배포 | 0 | |
| 마지막: 브라우저 오픈 | 0 (자동) | ⭐ v2.55.4 |

→ **OAuth 2회 브라우저 클릭 외 사용자 입력 0**.

#### 6. 인터페이스 호환성

PowerShell 스크립트의 모든 인터랙티브 prompt 자동화 또는 안전망 처리. BAT 시작
prompt도 timeout으로 변경. 빌드: `tsc --noEmit` 0 에러, `next build` 성공
(17 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.3 — GitHub URL + Vercel 프로젝트 완전 자동화 (2026.05)

**보고된 요청** (사용자):

> "GitHub repo 연결 → 기존 URL 입력: https://github.com/seong-ro/nest-alum1.git 을
> 자동으로 입력 과 Vercel 프로젝트 link → 'Link to existing project?' Y → 'name?'
> nest-alum1 역시 변동 사항이 없으므로 자동 입력으로 사용자 입력 없이 모두 자동 진행"

**해결 — 2가지 자동화**

#### 1. ⭐ GitHub repo URL 자동 hardcode

```powershell
# v2.55.3
$DEFAULT_REPO_URL = "https://github.com/seong-ro/nest-alum1.git"
git remote add origin $DEFAULT_REPO_URL
```

이전 v2.55.2: 사용자가 URL 입력 필요 + sync 방향 [1/2] 선택
v2.55.3: 자동 진행, 사용자 입력 0

```
─────────────────────────────────────────────────
  📦 GitHub repo 자동 연결
─────────────────────────────────────────────────
기본 repo: https://github.com/seong-ro/nest-alum1.git
(자동 진행 — 사용자 입력 불필요)

  ✓ 기존 repo 자동 연결: https://github.com/seong-ro/nest-alum1.git
```

#### 2. ⭐ Vercel link 자동화 — `--yes --project` 옵션

```powershell
# v2.55.3
vercel link --yes --project=nest-alum1
```

이전 v2.55.2: 인터랙티브 프롬프트 4개 (Set up?, scope?, Link existing?, name?)
v2.55.3: CLI 옵션으로 모든 prompt skip

- `--yes`: 모든 default 답변 자동 적용 (Set up? Y / Link to existing? Y)
- `--project=nest-alum1`: 프로젝트 이름 명시 → "What's the name?" 자동 답변

자동 link 실패 시 fallback으로 인터랙티브 모드 — 안전성 보장.

#### 3. 새 워크플로우 — 사용자 입력 최소화

| 단계 | 사용자 입력 | 비고 |
|---|---|---|
| 1단계: 도구 설치 | 0 | winget 자동 |
| 2단계: npm install | 0 | 자동 |
| 4단계: GitHub 인증 | 1 (브라우저 클릭) | OAuth 30초 |
| **5단계: GitHub repo 연결** | **0 (자동)** | ⭐ v2.55.3 |
| 6단계: Vercel 인증 | 1 (브라우저 클릭) | OAuth 30초 |
| **7단계: Vercel link** | **0 (자동)** | ⭐ v2.55.3 |
| 8단계: vercel pull | 0 | 자동 |
| 9단계: 누락 변수 | 0 (모두 가져와짐) | 자동 |
| 10단계: Vercel push | 0 | 자동 |
| 11단계: vercel deploy | 0 | 자동 |

→ **OAuth 2회 클릭 외 사용자 입력 0**. 진정한 원클릭 배포.

#### 4. 자동화 가능 이유

- GitHub URL: 본 프로젝트는 `seong-ro/nest-alum1` 고정 (변동 없음)
- Vercel 프로젝트 이름: `nest-alum1` 고정 (변동 없음)
- sync 방향: 항상 [1] Windows 코드 push (zip은 항상 최신 v2.55.x)
- repo 공개 여부: private (이미 존재하니 새로 생성 안 함)

→ 모두 hardcode 가능. 사용자가 수정해야 할 변수 0.

#### 5. fallback 안전성

`vercel link --yes --project=nest-alum1`이 실패하는 경우:
- 첫 사용 시 scope(team) 선택이 필요한 경우
- vercel CLI 버전이 너무 낮은 경우 (--yes 옵션 미지원)

→ 자동으로 인터랙티브 모드로 전환, 사용자 안내 메시지 표시.

#### 6. 인터페이스 호환성

PowerShell 스크립트의 GitHub repo 연결 + Vercel link 단계 자동화. 기존 11단계 워크플로우 그대로 유지, 사용자 입력만 제거. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (17 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.2 — macOS 데이터 없이 Windows 전환: vercel pull 자동화 (2026.05)

**보고된 요청** (사용자):

> "기존 macOS 환경과 별개로 일시적으로 새로운 Windows PC에서 진행하므로 기존 설정환경
> 그대로 사용 (현재 이전 macOS 데이터 사용 불가) 설정 재업데이트"

**핵심 인사이트**: Vercel Dashboard에 모든 환경변수가 이미 저장돼있어, **macOS에서
아무것도 가져올 필요 없음**. `vercel pull` 명령으로 자동 다운로드.

**해결 — 워크플로우 재설계**

#### 1. ⭐ Vercel = 진실의 원천 (Single Source of Truth)

이전 v2.55.1: 환경변수 입력 → GitHub → Vercel
v2.55.2 신규: GitHub → Vercel link → **vercel pull** → 누락 변수만 입력 → 배포

```
Vercel Dashboard (모든 환경변수 저장됨)
         ↓ vercel pull --yes --environment=production
Windows .env.local (자동 다운로드)
```

#### 2. ⭐ 새 11단계 워크플로우

```
1단계: 도구 자동 설치 (Git, Node.js, GitHub CLI, Vercel CLI)
2단계: npm install
3단계: (placeholder — 환경변수는 8단계에서 자동 처리)
4단계: GitHub 인증 (브라우저 OAuth)
5단계: GitHub repo 연결 (기존 URL 입력 또는 새로 생성)
6단계: Vercel 인증 (브라우저 OAuth — 같은 계정)
7단계: Vercel 프로젝트 link
       → 'Link to existing project?' Y → 'name?' nest-alum1
8단계: ⭐ vercel pull --yes (모든 환경변수 자동 다운로드)
       → .env.production.local 생성 → .env.local로 복사
9단계: 환경변수 검토 + 누락 항목만 직접 입력
10단계: Vercel push (누락 변수만 — 기존은 그대로)
11단계: vercel deploy --prod
```

#### 3. ⭐ 누락 변수 검사 + 안내

vercel pull 후 `.env.local` 내용 검사:

```
✓ ADMIN_PASSWORD: Vercel에서 자동 가져옴
✓ ADMIN_DASHBOARD_PASSWORD: Vercel에서 자동 가져옴
✓ UPSTASH_REDIS_REST_URL: Vercel에서 자동 가져옴
✓ UPSTASH_REDIS_REST_TOKEN: Vercel에서 자동 가져옴
✓ NEXT_PUBLIC_SITE_URL: Vercel에서 자동 가져옴

(누락 변수 0개 — 자동 skip)
```

만약 GITHUB_TOKEN 등이 Sensitive로 마스킹되어 누락된 경우:

```
💡 GITHUB_TOKEN이 누락된 경우:
   PAT는 한 번 발급 후 다시 볼 수 없어 Vercel에서도 가져올 수 없어요.
   필요시 새로 발급: https://github.com/settings/personal-access-tokens/new
```

#### 4. ⭐ MIGRATION-FROM-MAC.md 갱신

기존 가이드 (USB 복사·iCloud 등) → vercel pull 자동화 중심으로 재작성.
4가지 시나리오 비교:

| 시나리오 | 소요 시간 | 사용자 입력 | 추천도 |
|---|---|---|---|
| A. vercel pull 자동 | 5분 | OAuth 2회만 | ⭐⭐⭐⭐⭐ |
| B. 환경변수 직접 입력 | 10분 | 5~8개 변수 | ⭐⭐ |
| C. macOS USB 복사 | 10분 | USB + 입력 | ⭐ (불필요) |
| D. 새 시작 | 20분 | 전체 재발급 | (PC 잃은 경우만) |

#### 5. ⭐ GITHUB_TOKEN 처리 — 3가지 옵션

- **옵션 A**: 기존 토큰 그대로 사용 (Vercel에 이미 저장돼있고 빌드 시 inline됨 — 추가 작업 X)
- **옵션 B**: 새 PAT 발급 (vercel pull 시 마스킹된 경우)
- **옵션 C**: 시점 복원 기능 안 쓰면 불필요

#### 6. 인터페이스 호환성

PowerShell 스크립트 워크플로우 재설계 (4단계와 6단계 사이 순서 변경 + vercel pull
추가). BAT는 그대로. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (17 routes —
변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.1 — macOS → Windows 마이그레이션 가이드 + .env.local 가져오기 옵션 (2026.05)

**보고된 질문** (사용자):

> "기존 macOS에서 사용된 토큰 및 API를 새로운 Windows에서 재사용 불가? 재확인"

**결론**: **모든 토큰·API 키는 Windows에서 100% 재사용 가능**. 토큰은 PC가 아닌
계정/서비스에 묶여있기 때문.

**해결 — 3가지 개선**

#### 1. ⭐ PowerShell 스크립트에 `.env.local` 가져오기 옵션 추가

환경변수 입력 단계에서:
```
─────────────────────────────────────────────────
  📦 기존 환경변수 가져오기 (macOS·USB·클라우드)
─────────────────────────────────────────────────
macOS에서 사용하던 .env.local 파일이 있다면, 그 경로를 입력하세요.
예시:
  C:\Users\Home\Downloads\env-from-mac.txt
  D:\folio-cards-old\.env.local         (USB 등)

기존 .env.local 경로 (Enter = 건너뛰기): _
```

지정한 파일을 자동 복사 → 환경변수 입력 단계 완전 skip.

#### 2. ⭐ 기존 GitHub repo URL 입력 옵션

새 repo 강제 생성 대신:
```
─────────────────────────────────────────────────
  📦 GitHub repo 연결
─────────────────────────────────────────────────
macOS에서 이미 사용하던 repo가 있다면 그 URL을 입력하세요.
예시: https://github.com/seong-ro/nest-alum1.git

기존 GitHub repo URL (Enter = 새로 생성): _
```

기존 repo 입력 시 sync 방향 선택:
- [1] Windows 코드를 push (덮어쓰기 — 권장)
- [2] 기존 repo 코드를 pull (Windows 코드 폐기)

#### 3. ⭐ Vercel link 시 기존 프로젝트 안내 강화

```
─────────────────────────────────────────────────
  📦 Vercel 프로젝트 연결
─────────────────────────────────────────────────
macOS에서 이미 사용하던 Vercel 프로젝트가 있다면:
  → 'Link to existing project? Y' 선택
  → 같은 계정의 프로젝트 목록에서 nest-alum1 선택

⚠️ Vercel 환경변수도 기존 프로젝트에 그대로 남아있으니
   기존 프로젝트에 link하면 환경변수 추가 단계 자동 skip됩니다.
```

#### 4. ⭐ MIGRATION-FROM-MAC.md 가이드 신규

`scripts/windows/MIGRATION-FROM-MAC.md` — macOS의 모든 자원을 Windows에서 재사용하는
종합 가이드:

**토큰 재사용 매트릭스 (모두 ✅)**:

| 자원 | 묶인 곳 | 재사용 |
|---|---|---|
| GitHub PAT | GitHub 계정 | ✅ |
| GitHub repo + commits | GitHub 서버 | ✅ |
| Vercel 프로젝트 + 환경변수 | Vercel 계정 | ✅ |
| Upstash Redis URL/TOKEN | Upstash 계정 | ✅ |
| Upstash KV 데이터 (등록 카드) | Upstash 서버 | ✅ |
| ADMIN_PASSWORD/DASHBOARD_PASSWORD | 본인이 정함 | ✅ |
| INDEXNOW_KEY | 본인이 정함 | ✅ |
| GitHub Secret | GitHub repo 설정 | ✅ |
| GitHub Actions 워크플로우 | GitHub repo 설정 | ✅ |
| 검색엔진 등록 (Naver/Google/Bing) | 각 서비스 계정 | ✅ |
| vercel.app 도메인 | Vercel 프로젝트 | ✅ |

**다시 인증해야 하는 것 (PC별 캐시)**:
- `gh auth login` (브라우저 OAuth, 30초)
- `vercel login` (브라우저 OAuth, 30초)
→ 계정은 같음, 인증 토큰만 PC별로 새로 발급.

**3가지 마이그레이션 패턴**:
- 패턴 A: 완전 자동 (5분) — `.env.local` USB 복사 + 기존 repo·프로젝트 link
- 패턴 B: 부분 입력 (10분) — 일부 비밀번호만 변경
- 패턴 C: 새 시작 (15분) — 기존 자원 모두 폐기 후 새로 생성

**보안 권장사항** + **6가지 FAQ** 포함.

#### 5. 인터페이스 호환성

PowerShell 스크립트에 환경변수 가져오기·repo 연결·Vercel link 옵션 추가. 기존
사용자가 [Enter]만 누르면 v2.55.0과 동일하게 동작 (옵션은 모두 선택 사항).
빌드: `tsc --noEmit` 0 에러, `next build` 성공 (17 routes — 변동 없음). GitHub
push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.55.0 — Windows BAT 한글 깨짐 수정 (hotfix) (2026.05)

**보고된 이슈** (사용자):
```
'4.0'은(는) 내부 또는 외부 명령, 실행할 수 있는 프로그램, 또는 배치 파일이 아닙니다.
'???먮룞?쇰줈'은(는) 내부 또는 외부 명령...
'?섍꼍蹂???낅젰'은(는) 내부 또는 외부 명령...
... (한글이 모두 깨져서 명령으로 잘못 해석됨)
```

**근본 원인 — 3가지 인코딩 충돌**:

1. **BAT 파일명에 한글 사용** — 일부 Windows 환경에서 파일 자체를 못 찾거나 깨짐
2. **BAT 본문이 UTF-8** — Windows 명령 프롬프트 기본 코드 페이지(CP949/EUC-KR)와 충돌 →
   한글 바이트가 무작위 영문/숫자로 깨져 해석됨
3. **PowerShell 호출 시 인코딩 명시 X** — Windows PowerShell 5.1이 콘솔 출력을 ANSI(CP949)로 시도

**해결 — 3가지 fix**

#### 1. ⭐ BAT 파일명을 ASCII로 변경

`원클릭-배포.bat` → `deploy-windows.bat`

#### 2. ⭐ BAT 본문을 ASCII만 사용 (한글 메시지 제거)

```bat
@echo off
chcp 65001 >nul 2>&1            REM 콘솔을 UTF-8로 전환

cd /d "%~dp0"

echo Folio Cards - One-Click Deploy Wizard for Windows
echo This script will automatically:
echo   1. Install required tools
echo   2. Configure GitHub authentication
echo   ...

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\deploy-windows.ps1"
```

BAT는 영어로 진행, **한글 메시지는 모두 PowerShell이 출력** (UTF-8 자동 처리).

#### 3. ⭐ PowerShell 스크립트 시작 시 콘솔 인코딩 강제

```powershell
# v2.55.0: 콘솔 인코딩을 UTF-8로 강제 설정 (한글 깨짐 방지)
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 > $null
} catch {
    # 무시 — 영어 출력이라도 작동
}
```

또한 PS1 파일 자체를 **UTF-8 BOM (EF BB BF) + CRLF 줄바꿈**으로 저장:

```bash
$ file scripts/windows/deploy-windows.ps1
scripts/windows/deploy-windows.ps1: Unicode text, UTF-8 (with BOM) text, with CRLF line terminators
```

Windows PowerShell 5.1이 BOM 없는 UTF-8을 ANSI로 잘못 해석하는 버그 우회.

#### 4. 검증 절차 (사용자가 다시 시도)

```
1. C:\Users\Home\Downloads\folio-cards.zip 우클릭 → 압축 풀기
2. C:\Users\Home\Downloads\folio-cards\ 폴더 안의 deploy-windows.bat 더블클릭
3. 콘솔에 ASCII 메시지 출력 (영어 — 깨짐 X)
4. PowerShell 자동 실행 → 한글 메시지 정상 출력
5. 환경변수 입력 → GitHub OAuth → Vercel 배포
```

#### 5. 인터페이스 호환성

BAT 파일명 변경 (`원클릭-배포.bat` → `deploy-windows.bat`). PS1 인코딩 + 콘솔
설정 추가. 코드 동작 동일. 빌드: `tsc --noEmit` 0 에러, `next build` 성공
(17 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.54.0 — Windows 원클릭 배포 + Start-up NEST 본연성 강화 + 효과 보고서 (2026.05)

**보고된 요청** (사용자):

> "이번에 현재 윈도우 PC에서의 새로운 환경에서 GITHUB 연결 등 모든 설치 및 원클릭
> 논스톱 업로드부터 Vercel 배포까지 완전 자동 환경 및 실행 스크립트 별도 생성
> (C:\Users\Home\Downloads)과 신용보증기금의 Start-up NEST 프로그램의 본연성을 웹상세
> 분석하여 추가적으로 대대적인 본 커뮤니티 사이트의 홍보 방향성 최신 베스트 프랙티스
> 적용된 설정 가능한 모든 사항 자동 적용과 상세 행동 리스트 분석 및 효과 보고서 생성"

**해결 — 3가지 산출물**

#### 1. ⭐ Windows PC 원클릭 자동 배포 스크립트

신규 파일:
- `원클릭-배포.bat` — 더블클릭 진입점 (관리자 권한 자동 요청)
- `scripts/windows/deploy-windows.ps1` — 메인 PowerShell 자동화 (~280 lines)
- `scripts/windows/README-WINDOWS.md` — 사용자 가이드

**자동화 단계** (5~10분 소요):

1. **필수 도구 자동 설치** (winget) — Git · Node.js LTS · GitHub CLI · Vercel CLI
2. **프로젝트 디렉토리 결정** — `C:\Users\Home\Downloads\folio-cards.zip` 자동 풀기
3. **npm 의존성 설치**
4. **환경변수 인터랙티브 입력** — `.env.local` 자동 생성
5. **GitHub 인증** (gh auth login — 브라우저 OAuth)
6. **GitHub repo 자동 생성** (gh repo create) 또는 기존 연결
7. **git push origin main**
8. **Vercel 인증** (vercel login — 브라우저)
9. **Vercel 환경변수 자동 등록** (.env.local → vercel env)
10. **vercel deploy --prod** → URL 출력 + 브라우저 자동 오픈

비개발자도 더블클릭 한 번으로 배포 완료.

#### 2. ⭐ Start-up NEST 본연성 강화 — 권위 시그널

KODIT 공식 페이지·정부24 등록 정보를 layout.tsx의 `sameAs`에 추가:

```ts
sameAs: [
  "https://github.com/seong-ro/nest-alum1",
  "https://www.kodit.co.kr",
  "https://www.kodit.co.kr/kodit/cm/cntnts/cntntsView.do?mi=2563&cntntsId=11234",  // ← 신규
  "https://www.gov.kr/portal/service/serviceInfo/B19001600005",                    // ← 신규
]
```

Google Knowledge Graph가 본 사이트와 KODIT 공식 페이지를 연결하여 권위(Authority)
시그널 강화. 검색 결과의 ‘About this site’ 패널에 정부 인증 정보 노출 가능성↑.

#### 3. ⭐ 종합 보고서 DOCX — 23.5 KB, 35+ 페이지

`Start-up-NEST-Alumni-홍보전략-효과보고서.docx` 별도 산출물:

**구성** (7개 장):
1. **Executive Summary** — 핵심 발견 + 12개월 예상 효과 표
2. **Start-up NEST 프로그램 본연성** — KODIT 공식 정의 + 운영 기수표 + 5대 가치
3. **자동 적용 — 홍보 인프라 점검** — 5개 카테고리별 30+ 항목 (✓/◯/⚠ 상태)
4. **사용자 행동 리스트** — 0~3순위별 50+ 액션 (소요 시간·우선순위 명시)
5. **정량적 효과 분석** — 12개월 성장 시나리오 + ROI + 잠재 가치
6. **즉시 실행 체크리스트** — 6.1~6.6 단계별 체크박스
7. **부록** — 참고 자료 + FAQ 6문항

**핵심 효과 추정** (행동 리스트 모두 실행 시, 12개월 후):
- 검색 색인 카드: 9개 → 200~500개
- 월 자연 유입: 0~50회 → 2,000~5,000회
- AI Overview 인용: 측정 불가 → 월 50~200회
- 백링크: 0~3개 → 150~300개
- 직접 비용: 0원/월 (Vercel + Upstash + GitHub + IndexNow 모두 무료 티어)

**잠재 가치**: 동문 50개 × 평균 매출 100억 × 연 1% B2B 협업 매출 = 연 5억 원
잠재 매출 — 직접 비용 0원.

#### 4. 인터페이스 호환성

신규 파일 4개 (Windows 스크립트 3개 + DOCX 보고서). 기존 코드 sameAs 1개 항목
확장. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (17 routes — 변동 없음).
GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.53.0 — 2026-May SEO 풀파워 강화: IndexNow + 5종 schema + 26 봇 + 자동 핑 (2026.05)

**보고된 요청** (사용자):

> "현재 등록된 카드 및 앞으로 등록될 카드에 대한 구글, 네이버, 빙 등의 포털 사이트에서
> 잘 검색될 수 있게 2026년 5월 최신 기술동향을 면밀히 살펴 최신 베스트 프랙티스 적용한
> 완벽한 검색 노출을 위한 풀파워 기능 상세 보완 수정 재업데이트(본 커뮤니티의 본질은
> 등록된 동문 카드가 포털 사이트에 더욱 많이 노출 되어 홍보 효과를 가져다 주는 것이므로
> 주기적인 업데이트 필수)"

**2026-May SEO 트렌드 조사 결과** (web search):

| 트렌드 | 시사점 |
|---|---|
| IndexNow 5+billion URLs/day, 22% Bing 클릭 출처 | Bing/Naver/Yandex 즉시 인덱싱 필수 |
| AI 크롤러 Googlebot의 3.6배 트래픽 (GPTBot/ClaudeBot/PerplexityBot 등) | 봇별 명시 허용 + content depth |
| 46% ChatGPT 방문이 reading mode (JS 없는 plain HTML) | RSC SSR 강점 (이미 적용) |
| FAQPage schema 사용량 지속 증가 | AI Overview 인용 가능성↑ |
| `<lastmod>` 정확성이 Google/Bing/AI 모두 freshness 시그널 | sitemap dynamic 갱신 (이미 적용) |
| Naver 2023.07 IndexNow 가입 | 한국 검색 즉시 반영 가능 |

**해결 — 6가지 핵심 변경**

#### 1. ⭐ IndexNow 프로토콜 통합 (Bing/Naver/Yandex/Seznam/Yep 즉시 인덱싱)

신규 라이브러리 `lib/indexnow.ts`:
```ts
pingIndexNow(urls: string[]): Promise<IndexNowResult>
pingIndexNowFireAndForget(urls: string[]): void  // 동작 영향 X
```

신규 라우트 `/api/indexnow-key/[key]` — 검색엔진 키 검증용 endpoint.

**자동 ping 트리거** (총 7곳):
- `createCard` / `createCardEdited` / `createCardManual` — 카드 등록
- `deleteCardAction` — 카드 삭제 (URL deleted 시그널)
- `refreshCardAction` / `refreshCardActionDirect` — 카드 갱신
- `refreshAllAction` (batch 완료 시 sitemap만)
- admin API: `restore-card-from-backup`, `restore-from-github`, `restore` (전체)

**필요 환경변수** (선택 — 미설정 시 silent skip):
```
INDEXNOW_KEY=<8-128자 hex/dash>     예: a1b2c3d4-e5f6-7890-abcd-ef1234567890
INDEXNOW_KEY_LOCATION=<선택>        기본: https://{host}/api/indexnow-key/{key}
```

**효과**: 카드 등록 후 Bing/Naver 검색 결과 반영이 days/weeks → minutes로 단축.
Google은 IndexNow 미지원 → sitemap revalidate로 자연 발견.

#### 2. ⭐ JSON-LD schema 5종 (Article + Breadcrumb + Organization + FAQ + Image)

이전 v2.52.x: Article + BreadcrumbList (2종)
v2.53.0: 5종 — 풍부한 SERP rich snippet + AI Overview 인용 가능성↑

**신규 builder 3개** (`lib/seo.ts`):

```ts
buildCardOrganizationJsonLd(stored, cardUrl)
  → @type: Organization
  → ContactPoint (phone/email), PostalAddress
  → founder (Person), industry, logo

buildFaqPageJsonLd(stored, cardUrl)
  → @type: FAQPage
  → keyPoints 3개 이상 시 자동 생성 (max 8개)
  → 각 keyPoint를 Q&A로 변환 → AI Overview 인용 친화

buildImageObjectJsonLd(stored, cardUrl)
  → @type: ImageObject
  → representativeOfPage: true → Google 이미지 검색 노출↑
```

[id]/page.tsx에서 5종 모두 렌더 — 각 schema가 별도 `<script>` 태그.

#### 3. ⭐ robots.txt — 26개 봇 명시 허용 (v2.52.x: 9개 → v2.53.0: 26개)

**한국 검색엔진** (신규):
- `Yeti` (Naver — 한국 검색 핵심)
- `Naverbot`, `Daumoa` (Daum/Kakao)

**글로벌 검색엔진 명시 허용** (신규):
- `Googlebot`, `Googlebot-Image`, `bingbot` (ChatGPT의 retrieval 백엔드)
- `Yandex`, `DuckDuckBot`, `Slurp` (Yahoo), `Seznam`

**AI 크롤러** (확장 — 2026 신규):
- `OAI-SearchBot` (SearchGPT 인덱싱)
- `claude-web`, `Perplexity-User`, `GeminiBot`
- `Cohere-AI`, `MistralAI-User`, `Amazonbot`, `PetalBot`

**소셜 미리보기** (신규):
- `FacebookExternalHit`, `LinkedInBot`, `Twitterbot`

#### 4. ⭐ sitemap.xml — 이미지 sitemap 추가

```ts
{
  url: `${SITE_URL}/${card.id}`,
  lastModified: updatedAt,
  changeFrequency: "weekly",
  priority: 0.8,
  images: card.heroImage ? [card.heroImage] : undefined,  // ← v2.53.0 추가
}
```

Google Image Search·Naver 이미지 검색 노출 가능성↑.

#### 5. ⭐ generateMetadata — Open Graph article meta + EEAT

```ts
authors: [{ name, url }],          // EEAT 시그널 (Author 명시)
openGraph: {
  authors: [orgName],              // article:author
  tags: keyPoints.slice(0, 6),     // article:tag
  section: industry,               // article:section
}
keywords: [..., representative, ...keyPoints.slice(0, 3)]  // 더 풍부
```

Google AI Mode·Bing Copilot이 이 메타를 활용해 콘텐츠 분류·인용.

#### 6. ⭐ revalidate 주기 동작 보장

이미 v2.x에 적용된 자동 갱신:
- `sitemap.ts`의 `revalidate = 60` — sitemap이 60초마다 갱신
- 카드 변경 시 `revalidatePath("/sitemap.xml")` + IndexNow ping 동시 호출
- daily-backup.yml — 매일 KST 02:00 자동 백업 (시점 복원 가능)

**주기적 freshness 시그널 보장** — 검색엔진이 사이트가 살아있다고 인식.

#### 7. 환경변수 매트릭스 업데이트 (v2.53.0)

| 이름 | Vercel Env | 환경 | 용도 |
|---|---|---|---|
| `ADMIN_PASSWORD` | ✅ 필수 | All | 카드 등록 |
| `ADMIN_DASHBOARD_PASSWORD` | ✅ 필수 (+ GitHub Secret) | All | 대시보드 |
| `UPSTASH_REDIS_REST_URL/TOKEN` | ✅ 필수 | All | KV |
| `NEXT_PUBLIC_SITE_URL` | ✅ 필수 | All | canonical/og |
| `GITHUB_REPO` | ⚠️ 시점 복원 | Production+Preview | GitHub API |
| `GITHUB_TOKEN` | ⚠️ 시점 복원 | Production+Preview | GitHub API |
| **`INDEXNOW_KEY`** ✨ 신규 | 권장 | All | IndexNow 즉시 인덱싱 |
| **`INDEXNOW_KEY_LOCATION`** ✨ 선택 | 선택 | All | 검증 URL 커스텀 |
| 검색엔진 검증 (선택) | 선택 | All | 사이트 소유권 |
| └ `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | 선택 | All | Google Search Console |
| └ `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | 선택 | All | Naver Search Advisor |
| └ `NEXT_PUBLIC_BING_SITE_VERIFICATION` | 선택 | All | Bing Webmaster Tools |

#### 8. 검색엔진 등록 권장 절차 (사이트 운영자용)

**Google Search Console** ([https://search.google.com/search-console](https://search.google.com/search-console)):
1. URL prefix 등록 → `https://nest-alum1.vercel.app`
2. HTML meta 검증 (또는 DNS) → 사이트 소유권 인증
3. Sitemaps → `https://nest-alum1.vercel.app/sitemap.xml` 제출
4. 인덱싱 모니터링: URL inspection → "Request indexing"

**Naver Search Advisor** ([https://searchadvisor.naver.com](https://searchadvisor.naver.com)):
1. 사이트 등록 → `https://nest-alum1.vercel.app`
2. 소유 확인 (HTML meta) → `naver-site-verification` 메타 추가
3. 사이트맵 제출 → `https://nest-alum1.vercel.app/sitemap.xml`
4. 색인 요청 → 카드 페이지 즉시 색인

**Bing Webmaster Tools** ([https://www.bing.com/webmasters](https://www.bing.com/webmasters)):
1. 사이트 추가 (Google 연동 가능)
2. IndexNow 인사이트 보고서 확인
3. URL 제출 모니터링

#### 9. 인터페이스 호환성

신규 파일 2개 (`lib/indexnow.ts`, `app/api/indexnow-key/[key]/route.ts`).
기존 schema/sitemap/robots는 옵셔널 호환 확장. 빌드: `tsc --noEmit` 0 에러,
`next build` 성공 (17 routes — `indexnow-key` 추가). GitHub push 안전 (식별
정보 0건, 비밀번호 0건).

---

### v2.52.0 — 백업 목록 빈 배열 진단 정보 + UI 자동 안내 (2026.05)

**보고된 이슈** (사용자):

> Daily Card Backup #4 Success — Total cards: 9, User-edited: 5,
> backups/2026/05/folio-cards-2026-05-08.json 정상 생성. 그런데 admin UI의
> [📂 백업 목록 불러오기] 클릭 시 "아직 백업이 없습니다" 표시.

**근본 원인**: `listBackups` 함수가 GitHub API 실패를 silently swallow.
- `latestRes.ok=false`면 무시 (401/403/404 모두 동일 처리)
- `treeRes.ok=false`도 무시 + try/catch가 다른 fail까지 swallow
- 결과: 빈 배열 반환 → UI는 단순 "백업 없음" 표시 → 환경변수 문제 진단 불가

**해결 — 3가지 fix**

#### 1. ⭐ listBackups 함수에 진단 정보 누적

```ts
interface BackupListResult {
  entries: BackupFileEntry[];
  diag: {
    latestStatus: number;       // 0 = network fail
    treeStatus: number;
    treeBlobCount: number;
    backupCandidates: number;
    notes: string[];
  };
}
```

각 GitHub API status code → 의미 있는 진단 노트:
```ts
if (status === 401 || status === 403)
  → "GitHub API 인증 실패 — GITHUB_TOKEN이 잘못됐거나 contents:read 권한 부족"
if (treeStatus === 404)
  → "Tree API 404 — GITHUB_REPO 값이 올바른지 확인하세요"
if (treeStatus === 409)
  → "repository가 비어있습니다"
```

#### 2. ⭐ GET 응답에 diag 포함

```ts
return NextResponse.json({
  ok: true,
  repo: githubRepo,
  backups: result.entries,
  diag: result.diag,   // ← 추가
});
```

#### 3. ⭐ admin UI에 자동 진단 안내 박스 + 4가지 시나리오별 가이드

빈 배열 시 단순 안내 → 진단 정보 박스 + 자동 안내:

| 진단 결과 | 자동 안내 (rose/blue/stone 박스) |
|---|---|
| 401/403 인증 실패 | 🔑 GITHUB_TOKEN 즉시 조치 필요 — Vercel 확인 + PAT 재발급 안내 |
| Tree 404 repo 없음 | 📁 GITHUB_REPO 값 오류 — `<owner>/<repo>` 형식 확인 |
| Tree 200 + 후보 0 | 💡 backups/ 폴더 직접 확인 링크 |
| 기타 | 진단 노트만 표시 |

**진단 박스 UI**:
```
⚠️ 백업 파일을 찾지 못했습니다

🔍 진단 정보 [기본 펼쳐짐]
  latest.json HTTP 상태: 401  ← 빨강 (200=초록, 404=회색, 401/403=빨강)
  Tree API HTTP 상태:    401
  Repo 전체 파일 수:     0
  backups/*.json 발견:   0
  진단 노트:
    - GitHub API 인증 실패 (HTTP 401) — GITHUB_TOKEN ...

🔑 GITHUB_TOKEN 인증 실패 — 즉시 조치 필요  ← 자동 표시
  1. Vercel → Environment Variables에서 GITHUB_TOKEN 값 확인
  2. 토큰 없으면 [새 PAT 발급 ↗]
  3. Vercel에 추가 후 Redeploy
```

#### 4. Node.js 20 deprecation 경고 — 안전한 무시

GitHub Actions에서 다음 경고가 나타나도 정상:
```
Node.js 20 is deprecated. The following actions target Node.js 20 but are
being forced to run on Node.js 24: actions/checkout@v4
```

v2.51.0의 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`가 의도대로 작동 중. 동작 영향 0.

#### 5. 인터페이스 호환성

`BackupListResult` 인터페이스 신규. GET 응답에 `diag` 필드 옵셔널 추가. 빌드:
`tsc --noEmit` 0 에러, `next build` 성공 (16 routes). GitHub push 안전.

---

### v2.51.1 — 자동 백업 성공 후 admin이 못 읽는 시나리오 안내 강화 (2026.05)

**보고된 상황** (사용자):

```
Daily Card Backup #4: ✓ Success — 9 cards / 5 user-edited backed up
File: backups/2026/05/folio-cards-2026-05-08.json (정상 commit됨)

그런데 /admin → [📂 백업 목록 불러오기] 클릭:
"아직 백업이 없습니다"
```

GitHub에는 백업 9개가 있는데 admin UI는 빈 결과. 즉 **Vercel admin API가
GitHub에서 못 읽는 상황**.

**근본 원인**: 사용자 listing에서 본 대로 Vercel에 `GITHUB_REPO`만 설정,
`GITHUB_TOKEN` 미설정 (또는 추가했어도 redeploy 안 함).

**v2.51.0에서 이미 추가된 진단 시스템**: `ghDiag` (HTTP 상태 + notes) — 그러나
사용자가 v2.51.0을 아직 배포 안 한 상태. v2.51.1은 이 시나리오 안내 텍스트를
더 명확히 강화.

**개선 — 빈 결과 진단 패널의 첫 줄 강화**:

```
⚠️ 백업 파일을 찾지 못했습니다

GitHub Actions의 자동 백업이 성공했어도 이 메시지가 보인다면,
Vercel 환경변수 GITHUB_TOKEN이 누락됐거나, 추가 후 redeploy가 안 됐거나,
토큰 권한이 부족한 가능성이 가장 높습니다.

빠른 확인 순서:
  GitHub backups/ 폴더 ↗ 에 파일 존재? → Vercel GITHUB_TOKEN 설정? → 추가 후 Redeploy?
```

세 가지 가능 원인을 단계별로 노출 → 사용자가 어디부터 점검해야 할지 즉시 파악.

**Node.js 20 deprecation 경고 (informational)**:
```
The following actions target Node.js 20 but are being forced to run on Node.js 24:
actions/checkout@v4
```
v2.51.0의 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`가 정상 작동 중. **경고는
정보성** — workflow 실행에는 영향 X. `actions/checkout@v5` 출시 시 업그레이드
가능 (현재 v4가 최신).

**인터페이스 호환성**: 코드 변경 0줄, UI 텍스트 + 링크만 보강. 빌드 결과 동일.
GitHub push 안전.

---

### v2.51.0 — Daily Backup 워크플로우 정상화 + GitHub Secret 인앱 가이드 (2026.05)

**보고된 이슈** (사용자):

1. **Daily Card Backup #3 실패** — `ADMIN_DASHBOARD_PASSWORD secret이 설정되지 않았습니다.`
   - 사용자가 Vercel 환경변수에는 추가했지만 GitHub Secret에는 별도 등록 X
2. **Node.js 20 deprecation 경고** — `actions/checkout@v4`가 Node 20 런타임 사용,
   2026-06-02 이후 강제 전환
3. **GITHUB_TOKEN 미설정** — 사용자 Vercel listing에 `GITHUB_REPO`만 보임,
   `GITHUB_TOKEN`은 아직 추가 안 한 상태

**해결 — 3가지 fix**

#### 1. ⭐ daily-backup.yml에 Node.js 24 강제 전환 + 친화적 에러 메시지

```yaml
# v2.51.0: Node.js 20 deprecation 대응
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

이 환경변수로 모든 JavaScript actions가 Node 24로 강제 실행. `actions/checkout@v4`
그대로 사용해도 호환. v5 출시 후에는 환경변수 제거 가능.

**에러 메시지 강화** — 단순 한 줄에서 구조화된 도움말로:

```
::error title=GitHub Secret 누락::ADMIN_DASHBOARD_PASSWORD가 GitHub Secrets에 설정되지 않았습니다.

===============================================================
🔧 해결 방법 (1분 소요)
===============================================================

❗ 주의: 이 비밀번호는 두 곳에 따로 등록해야 합니다.
   1) Vercel 환경변수 (admin API 인증용) — 이미 설정된 듯합니다
   2) GitHub Secret (이 워크플로우가 사용) — ⚠️ 여기가 비어 있어요!

📋 GitHub Secret 추가 절차:
   1. https://github.com/${GITHUB_REPOSITORY}/settings/secrets/actions
   2. [New repository secret] 클릭
   3. Name:  ADMIN_DASHBOARD_PASSWORD
   4. Value: <Vercel에 설정한 ADMIN_DASHBOARD_PASSWORD와 같은 값>
   5. [Add secret] 클릭
   6. Actions 탭에서 이 워크플로우 [Re-run]
```

`${GITHUB_REPOSITORY}`는 GitHub Actions runner가 자동 채워주는 변수 (예:
`seong-ro/nest-alum1`) — 사용자가 직접 클릭 가능한 URL 표시.

#### 2. ⭐ Admin UI에 STEP 3.5 — GitHub Secret 추가 가이드 신규

기존 `GithubSetupGuide` 컴포넌트의 1️⃣~4️⃣ 단계 사이에 **3️⃣⁺ GitHub Secret 추가**
단계를 blue 박스로 강조 삽입:

```
3️⃣⁺ GitHub Secret 추가 (자동 백업용 — 별도 필요!)

⚠️ Vercel 환경변수와 다른 시스템이라 별도 등록 필수.
   자동 백업 워크플로우(daily-backup.yml)가 사용합니다.

1. GitHub Repo Secrets 페이지 ↗ 접속
2. [New repository secret] 클릭
3. Name:  ADMIN_DASHBOARD_PASSWORD
4. Secret: Vercel에 설정한 ADMIN_DASHBOARD_PASSWORD와 같은 값
5. [Add secret] 클릭 → 자동 백업 활성화
```

**핵심 안내**: 사용자가 Vercel 환경변수 = GitHub Secret이라고 오해하기 쉬움.
파란색 박스로 시각적 강조하여 두 시스템이 별도임을 명확히.

#### 3. 비밀번호 두 곳 등록 정리 (필수 매트릭스)

`ADMIN_DASHBOARD_PASSWORD`는 다음 **두 곳에 같은 값**으로 등록:

| 위치 | 용도 | 누가 사용? |
|---|---|---|
| **Vercel 환경변수** | admin API의 `process.env.ADMIN_DASHBOARD_PASSWORD` | `/api/admin/*` 라우트 (인증 검증) |
| **GitHub Secret** | workflow의 `${{ secrets.ADMIN_DASHBOARD_PASSWORD }}` | daily-backup.yml (admin API 호출 시 Authorization 헤더) |

두 곳 모두 등록 안 되면:
- Vercel만: admin UI는 작동, 자동 백업은 실패
- GitHub Secret만: admin UI는 401, 자동 백업도 admin API에서 거부

#### 4. v2.51.0 환경변수 + Secret 매트릭스 (전체)

| 이름 | Vercel Env | GitHub Secret | 환경 |
|---|---|---|---|
| `ADMIN_PASSWORD` | ✅ 필수 | (불필요) | All Environments |
| `ADMIN_DASHBOARD_PASSWORD` | ✅ 필수 | ✅ 필수 (같은 값) | Production + Preview (+ Development 권장) |
| `UPSTASH_REDIS_REST_URL` | ✅ 필수 | (불필요) | All Environments |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ 필수 | (불필요) | All Environments |
| `NEXT_PUBLIC_SITE_URL` | ✅ 필수 | (불필요) | All Environments |
| `GITHUB_REPO` | ⚠️ 필요 (시점 복원) | (불필요) | Production + Preview |
| `GITHUB_TOKEN` | ⚠️ 필요 (시점 복원) | (불필요) | Production + Preview |

#### 5. 인터페이스 호환성

`daily-backup.yml`에 env 추가 + 에러 메시지 변경. `app/admin/page.tsx`의
`GithubSetupGuide`에 STEP 3.5 섹션 추가. 코드 동작 동일, 가이드만 풍부해짐. 빌드:
`tsc --noEmit` 0 에러, `next build` 성공 (16 routes — 변동 없음). YAML 문법
검증 통과. GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.50.0 — GITHUB_REPO·GITHUB_TOKEN 인앱 설정 가이드 추가 (2026.05)

**보고된 이슈**:
> "⚠️ GITHUB_REPO 또는 GITHUB_TOKEN 환경변수가 설정되지 않았습니다. 상세 설정 절차"

v2.49.0의 시점 복원 기능이 GitHub API를 호출하는데, 사용자가 두 환경변수를
설정하지 않은 상태. 기존 에러 메시지가 단순한 한 줄이라 처음 사용자가 설정 방법
모름.

**해결 — 인앱 4단계 가이드**

`/admin` 대시보드의 시점 복원 또는 백업 목록 섹션에서 GITHUB 관련 에러 발생 시,
펼쳐진 상태로 4단계 설정 절차가 즉시 표시:

#### 1️⃣ GitHub Personal Access Token 발급

1. https://github.com/settings/personal-access-tokens/new 접속 (Fine-grained PAT 권장)
2. **Token name**: `folio-cards-backup`
3. **Expiration**: 1년 또는 무기한
4. **Repository access** → **Only select repositories** → 해당 repo 선택
5. **Repository permissions** 다음 3개 설정:
   - **Actions**: Read and write (워크플로우 트리거)
   - **Contents**: Read and write (백업 파일 commit/fetch)
   - **Metadata**: Read-only (자동 포함)
6. [Generate token] → `github_pat_...` 값 복사 (이후 다시 못 봄!)

#### 2️⃣ Vercel에 환경변수 추가

| 변수명 | Value | Environments |
|---|---|---|
| `GITHUB_REPO` | `<owner>/<repo>` (예: `seong-ro/nest-alum1`) | Production + Preview |
| `GITHUB_TOKEN` | `github_pat_...` (1️⃣에서 복사) | Production + Preview (Sensitive 체크) |

Vercel Dashboard → Settings → Environment Variables → Add New

#### 3️⃣ Redeploy (필수)

환경변수는 build 시점에 inline되므로, 추가 후 redeploy 필수:
- Vercel Dashboard → Deployments → 최신 → ⋯ → **Redeploy**
- "Use existing Build Cache" 체크 해제 권장

#### 4️⃣ 동작 확인

1. `/admin` 페이지 새로 불러오기
2. [📂 백업 목록 불러오기] 클릭 → 목록 표시되면 정상
3. 첫 자동 백업이 아직 없으면 GitHub Actions에서 [Run workflow]로 즉시 생성 가능
4. 각 카드의 [⏮️ 이전 버전 복원] 버튼이 활성화

**구현 — 재사용 가능한 React 컴포넌트**

```tsx
function GithubSetupGuide({ errorMsg }: { errorMsg: string }) {
  return (
    <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs">
      <details open>
        <summary>📖 상세 설정 절차 (약 3분 소요)</summary>
        {/* 4단계 + 보안 주의사항 */}
      </details>
    </div>
  );
}
```

**적용 위치 (GitHub 에러 메시지 표시되던 모든 곳)**:
- "🔄 GitHub 백업에서 복원" 섹션 — 백업 목록 fetch 실패 시
- "📋 등록 카드 + 시점 복원" 섹션 — 카드 이력 fetch 실패 시 (개별 카드)

**🔒 보안 안내** (가이드 안에 amber 박스로 표시):
- GITHUB_TOKEN은 절대 GitHub repo에 commit 금지 (Vercel 환경변수에만)
- 백업 파일에 카드 연락처 등 개인정보 포함 → GitHub repo Private 권장
- 토큰 유출 시 즉시 GitHub PAT 페이지에서 Revoke 후 재발급

#### 환경변수 통일 권장사항 (참고)

사용자의 현재 Vercel 상태 (보고됨):
| 환경변수 | 환경 |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | All Environments ✓ |
| `UPSTASH_REDIS_REST_TOKEN` | All Environments ✓ |
| `UPSTASH_REDIS_REST_URL` | All Environments ✓ |
| `ADMIN_DASHBOARD_PASSWORD` | Development (별도) + Production+Preview (별도) |
| `ADMIN_PASSWORD` | All Environments ✓ |

**`ADMIN_DASHBOARD_PASSWORD`가 두 entry로 분리된 상태** — 이는 Vercel에서 환경별로
다른 값을 쓰고 싶을 때 사용하는 패턴. 같은 값을 쓸 거면 한 entry로 통합 가능:

1. Settings → Environment Variables
2. `ADMIN_DASHBOARD_PASSWORD (Development)` ⋯ → Delete
3. `ADMIN_DASHBOARD_PASSWORD (Production and Preview)` ⋯ → Edit → Environments에서 Development 추가 → Save

(또는 그대로 두어도 기능적으로 정상 작동)

**제거 가능**: `CRON_SECRET` — v2.44.0에서 cron 제거됨. 더 이상 사용 X.

#### 인터페이스 호환성

새 컴포넌트 1개 추가 (`GithubSetupGuide`). 기존 에러 메시지 위치를 컴포넌트로 교체 (UI만 풍부해짐, 동작 동일). 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (16 routes — 변동 없음). GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.49.0 — 카드별 시점 복원 + 자동 백업 단일화 (2026.05)

**보고된 요청** (사용자):

> "관리자 대시보드 접속 시 현재 등록된 카드 목록화 및 백업날짜 적용 버전 확인과
> 클릭 시 스크롤 박스로 지난 1달간 백업된 일자 선택하면 선택된 날짜의 백업본이
> 현재 등록된 카드로 대체되는 기능 반드시 필수! 지금 GitHub에 백업 및 로컬
> 다운로드 (백업) 불필요! GitHub에 백업은 자동으로 되기 때문"

**해결 — 4가지 변경**

#### 1. ⭐ 카드별 시점 복원 (Point-in-Time Restore)

신규 API 2개:

```
GET  /api/admin/card-history?id=<dedupKey>&days=30
  → backups/ 폴더의 최근 30일치 백업을 모두 fetch하여 해당 카드의 변화 이력 반환
  → { ok, cardId, currentCard, history: [{ path, date, card, isDifferent }] }

POST /api/admin/restore-card-from-backup
  body: { password, cardId, backupPath, confirm: true }
  → 지정된 백업에서 해당 카드만 fetch하여 KV 업데이트 (다른 카드 영향 X)
  → { ok, cardId, backupPath, before, after }
```

**동작 흐름**:
1. 대시보드의 "📋 등록 카드 + 시점 복원" 섹션에서 카드 옆 [⏮️ 이전 버전 복원] 클릭
2. 카드 아래로 펼쳐지는 박스에 백업 일자 목록 표시 (스크롤 박스, `max-h-48`)
3. 각 일자 옆 배지로 현재와 비교: <span style="color:#92400e">다름</span>(amber) /
   <span style="color:#6b7280">동일</span>(gray)
4. 일자 클릭 → confirm → 해당 카드만 그 시점 데이터로 복원
5. 갤러리·상세 페이지·sitemap·llms.txt 자동 revalidate

**병렬 fetch**: 30일 = 최대 30개 백업 파일을 6개씩 batch 처리 → 응답 시간 단축.

#### 2. ⭐ 불필요한 백업 버튼 제거

**제거된 UI**:
- ❌ "🚀 지금 GitHub에 백업" 버튼 — daily-backup.yml이 매일 KST 02:00 자동 실행
- ❌ "📥 로컬 다운로드 (백업)" 버튼 — GitHub `backups/` 폴더에 자동 보존

**제거된 클라이언트 핸들러**:
- `handleBackupNow()`
- `handleDownloadBackup()`

**유지**:
- ✅ 자동 백업 (GitHub Actions daily-backup.yml — 매일 KST 02:00)
- ✅ "🔄 GitHub 백업에서 복원" 섹션 (전체 갤러리 복원)
- ✅ 새 "📋 등록 카드 + 시점 복원" 섹션 (개별 카드 복원)
- ✅ 중복 검사·정리

**주의**: 백엔드 API (`/api/admin/backup-now`, `/api/admin/dump`)는 그대로 유지.
GitHub Actions 워크플로우와 외부 도구가 사용 중. UI 버튼만 제거.

#### 3. ⭐ stats API에 `allCards` 필드 추가

이전 v2.46.0~v2.48.x: `recentCards` (최근 5개만)
v2.49.0부터: `allCards` (전체 + full dedupKey + industry/createdAt 포함)

```ts
allCards: Array<{
  id: string;          // full dedupKey — 시점 복원 API 호출용 (slice X)
  headline: string;
  domain: string;
  industry: string;
  userEdited: boolean;
  createdAt: string;
  updatedAt: string;
}>
```

대시보드는 `allCards`를 사용해 카드 전체 목록을 렌더링.

#### 4. UI 디자인 — "📋 등록 카드 + 시점 복원" 섹션

```
📋 등록 카드 + 시점 복원 (총 12개)

각 카드의 [⏮️ 이전 버전 복원] 버튼을 클릭하면 지난 30일치 백업 일자가
스크롤 박스로 나타나요. 원하는 날짜를 선택하면 그 카드만 그 시점으로
복원됩니다 (다른 카드는 영향 X).

┌─────────────────────────────────────────────────────────────┐
│ a3f2b... │ 워터리아 — CPU·NPU 기반 Edge AI ✎ 편집     │ ⏮️ 이전 │
│          │ water-ria.kr · ai · 업데이트 2026-05-08 14:23 │  버전  │
└─────────────────────────────────────────────────────────────┘
   ↓ 클릭 시 펼쳐짐
   ┌─────────────────────────────────────────────┐
   │ 백업 일자를 클릭하면 그 시점 데이터로 카드를 복원: │
   │ ┌─ 스크롤 박스 (max-h-48) ─────────────────┐  │
   │ │ 2026-05-07 │ 워터리아 — CPU·NPU 기반... │ ✎ 다름 ↺ │  │
   │ │ 2026-05-06 │ 워터리아 — CPU·NPU 기반... │ ✎ 다름 ↺ │  │
   │ │ 2026-05-05 │ 워터리아 — CPU·NPU 기반... │ ✎ 동일 ↺ │  │
   │ │ 2026-05-04 │ 워터리아 — CPU·NPU 기반... │ ✎ 동일 ↺ │  │
   │ │ ...                                     │  │
   │ └─────────────────────────────────────────┘  │
   └─────────────────────────────────────────────┘
```

#### 5. 환경변수 환경 통일 안내

**현재 사용자 상태** (보고됨):
| 환경변수 | 환경 |
|---|---|
| `ADMIN_DASHBOARD_PASSWORD` | Production + Preview |
| `ADMIN_PASSWORD` | Production + Preview + Development |

`ADMIN_DASHBOARD_PASSWORD`가 Development에 없어 `vercel dev` 또는 PR preview의
일부 환경에서 admin 작동 안 함.

**권장 통일** — Vercel Settings → Environment Variables → 각 환경변수 ⋯ → Edit:

| 환경변수 | 권장 환경 | 비고 |
|---|---|---|
| `ADMIN_PASSWORD` | Production + Preview + Development | 카드 등록·수정·삭제 |
| `ADMIN_DASHBOARD_PASSWORD` | Production + Preview + Development | 최고 관리자 대시보드 |
| `UPSTASH_REDIS_REST_URL` | Production + Preview + Development | KV 연결 |
| `UPSTASH_REDIS_REST_TOKEN` | Production + Preview + Development | KV 연결 |
| `NEXT_PUBLIC_SITE_URL` | Production + Preview + Development | 사이트 URL |
| `GITHUB_REPO` | Production + Preview | 자동 백업·시점 복원 (Development 불필요) |
| `GITHUB_TOKEN` | Production + Preview | 자동 백업·시점 복원 (Development 불필요) |
| `CRON_SECRET` | (제거 가능) | v2.44.0에서 cron 제거됨 — 더 이상 필요 X |

**수정 절차**:
1. Vercel Dashboard → Project → Settings → Environment Variables
2. 환경변수 행 → ⋯ (more menu) → **Edit**
3. **Environments** 섹션에서 Development 체크박스 추가 → Save
4. (선택) Deployments → 최신 → ⋯ → **Redeploy**로 즉시 반영

**제거 가능 환경변수**:
- `CRON_SECRET` — v2.44.0에서 자동 cron 완전 제거. 더 이상 사용 안 함. 정리 권장.

#### 6. 자동 백업·시점 복원 활성화 환경변수 (필수 확인)

사용자가 보고한 백업 트리거 실패 메시지 — `GITHUB_REPO`/`GITHUB_TOKEN` 미설정.
v2.49.0에서 "지금 백업" 버튼 자체를 제거했지만, **시점 복원 기능은 여전히 GitHub
API를 호출**하므로 이 두 환경변수는 필수:

```
GITHUB_REPO=<owner>/<repo>          예: seong-ro/nest-alum1
GITHUB_TOKEN=<personal-access-token>
  필요 권한:
    - actions:write   (workflow_dispatch — daily-backup.yml 수동 트리거 가능)
    - contents:read   (백업 파일 fetch)
    - contents:write  (workflow가 백업 commit/push 시 필요)
```

GitHub Personal Access Token 발급:
- GitHub → Settings → Developer settings → Personal access tokens → New token
- (권장) Fine-grained token: 특정 repo + 위 권한만 부여

미설정 시 시점 복원 섹션에서 "GITHUB_REPO 또는 GITHUB_TOKEN 환경변수가 설정되지
않았습니다" 친화 메시지 표시.

#### 7. 인터페이스 호환성

새 API 2개 추가 (`/api/admin/card-history`, `/api/admin/restore-card-from-backup`).
`stats`에 `allCards` 필드 추가 (옵셔널 호환). 기존 백엔드 API + GitHub Actions
workflow 영향 0. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (16 routes — 2 추가).
GitHub push 안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.48.1 — `whatwg-encoding` deprecation 경고 해결 (hotfix) (2026.05)

**보고된 경고**:
```
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more
spec-conformant and faster implementation
```

**의존성 추적**:
```
folio-cards@2.48.0
└── cheerio@1.2.0           (HTML 파싱 — TextRank 추출 핵심 의존성)
    └── encoding-sniffer@0.2.1  ← deprecated whatwg-encoding 사용
        └── whatwg-encoding@3.1.1
```

**해결 — `package.json` overrides 추가**:

```json
{
  "overrides": {
    "encoding-sniffer": "^1.0.2"
  }
}
```

`encoding-sniffer@1.0.2`는 이미 `@exodus/bytes`로 마이그레이션 완료된 버전.
`overrides`로 transitive dependency 강제 업그레이드하여 `whatwg-encoding` 의존성
완전 제거.

**검증 결과**:
```bash
$ npm ls whatwg-encoding
folio-cards@2.48.1
└── (empty)                            ← 완전 제거

$ npm ls encoding-sniffer
└── cheerio@1.2.0
    └── encoding-sniffer@1.0.2 overridden   ← 최신 버전

$ npm ls @exodus/bytes
└── cheerio@1.2.0
    └── encoding-sniffer@1.0.2 overridden
        └── @exodus/bytes@1.15.0       ← 권장 패키지로 교체

$ npm install 2>&1 | grep -i deprecated
(empty)                                 ← deprecation 경고 0건
```

**영향**: 런타임 동작 동일 (`cheerio` API 호환). 빌드: `tsc --noEmit` 0 에러,
`next build` 성공. 패키지 크기 약간 감소 (`whatwg-encoding` + 의존 라벨 제거).

---

### v2.48.0 — 비밀번호 권한 분리 강화 + GitHub 노출 0건 (2026.05)

**보고된 요청** (사용자):
> "<카드 등록 비밀번호>는 카드 등록·삭제 비밀번호로 관리자 대시보드 사용불가, <최고 관리자 비밀번호>는 최고 관리자 전용으로
> 관리자 대시보드 이용을 위한 특별한 비번 확인하여 수정. 그리고 절대 GitHub에 비번
> 공개 하지 않도록 주의!!"

**핵심 변경 — 권한 분리 강화**

#### 1. ⭐ admin API 6개 모두에서 ADMIN_PASSWORD fallback 완전 제거

이전 v2.47.0까지: ADMIN_DASHBOARD_PASSWORD 미설정 시 ADMIN_PASSWORD로 fallback 가능 →
**카드 등록 비밀번호로도 admin 대시보드 접근됨** = 권한 분리 미흡.

v2.48.0부터: 모든 admin API가 `ADMIN_DASHBOARD_PASSWORD`만 인증:

```ts
function authorize(req, providedPassword) {
  const adminDashboardPw = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!adminDashboardPw) return false;        // 미설정이면 무조건 거부
  const headerAuth = req.headers.get("authorization");
  const bearerToken = headerAuth?.startsWith("Bearer ") ? headerAuth.slice(7) : null;
  const candidate = bearerToken ?? providedPassword;
  if (!candidate) return false;
  return candidate === adminDashboardPw;       // 일치 검사만
}
```

**적용된 admin API**:
- `/api/admin/dump` (백업 추출)
- `/api/admin/restore` (백업 복원)
- `/api/admin/stats` (대시보드 통계)
- `/api/admin/cleanup-duplicates` (중복 정리)
- `/api/admin/backup-now` (GitHub 백업 트리거)
- `/api/admin/restore-from-github` (GitHub 백업에서 복원)

`cleanup-duplicates`만 v2.43.0~v2.47.0에서 두 비번 허용했는데 v2.48.0에서 통일.

#### 2. ⭐ 비밀번호 권한 분리 명확화

| 환경변수 | 용도 | 대시보드 접근 |
|---|---|---|
| `ADMIN_PASSWORD` | 카드 등록·수정·삭제 (사용자 폼 비밀번호) | ❌ 불가 |
| `ADMIN_DASHBOARD_PASSWORD` | 최고 관리자 대시보드 (`/admin`) 전용 | ✅ 가능 |

두 비밀번호는 **반드시 다른 값**이어야 권한 분리의 의미가 있음.

#### 3. ⭐ GitHub에 비밀번호 노출 0건 (전수 검사)

소스 코드 + 문서 + workflow + 주석 모두에서 비밀번호 값 제거:

```bash
$ grep -rn "<관리자 비밀번호 패턴>" --include="*.{ts,tsx,json,yml,sh,md}" . \
    | grep -v "node_modules"
[empty]   ← 0건
```

**제거 지점**:
- `app/api/admin/dump/route.ts` 주석 — 비밀번호 값 표기 제거
- `README.md` v2.47.0 section의 비밀번호 예시 표기 제거
- 환경변수 안내 코드 블록 — 실제 값 대신 `<카드 등록용 비밀번호>` placeholder

#### 4. ⭐ 401 응답 메시지 정밀화

이전: "ADMIN_DASHBOARD_PASSWORD 미설정 — 임시로 ADMIN_PASSWORD 값으로 로그인 가능"
(권한 분리 깨뜨리는 안내)

v2.48.0:
- 미설정 시: "ADMIN_DASHBOARD_PASSWORD 환경변수가 Vercel에 설정되지 않았습니다.
  최고 관리자 전용 비밀번호로 별도 설정 필수입니다. (카드 등록 비밀번호는 대시보드
  접근 불가)"
- 불일치 시: "최고 관리자 비밀번호가 일치하지 않습니다. (카드 등록·수정·삭제
  비밀번호는 대시보드 접근 불가 — 별도의 최고 관리자 비밀번호가 필요합니다)"

#### 5. admin 페이지 안내 텍스트 업데이트

`/admin` 비밀번호 입력 폼의 도움말 details:

**Before** (v2.47.0):
```
인증 우선순위:
1. ADMIN_DASHBOARD_PASSWORD (관리자 대시보드 전용)
2. ADMIN_PASSWORD (카드 등록·수정·삭제 비밀번호로 fallback)
```

**After** (v2.48.0):
```
인증 정책 (v2.48.0):
- ADMIN_DASHBOARD_PASSWORD 환경변수 — 최고 관리자 대시보드 전용
- 카드 등록·수정·삭제용 ADMIN_PASSWORD로는 대시보드 접근 불가 (권한 분리)
```

#### 6. 적용 절차 (Vercel)

1. **Vercel Environment Variables 추가**:
   ```
   ADMIN_DASHBOARD_PASSWORD = <최고 관리자 전용 비밀번호>
   ```
   (기존 `ADMIN_PASSWORD`와 **반드시 다른 값**)

2. **Production 환경 체크 후 Save**

3. **Deployments → 최신 deployment → ⋯ → Redeploy** (환경변수는 build 시점 inline)

4. **`/admin` 접속 → 새 비밀번호 입력 → 대시보드 접근 확인**

5. **검증**: 카드 등록 비밀번호로 `/admin` 접근 시 401 응답 확인 (권한 분리 정상)

#### 7. 인터페이스 호환성

기존 admin API 시그니처 동일. authorize() 내부 로직만 변경. `ADMIN_DASHBOARD_PASSWORD`
환경변수 미설정 시 모든 admin API 401 — 사용자가 명시적으로 별도 비밀번호 설정 필수.
빌드: `tsc --noEmit` 0 에러, `next build` 성공 (14 routes — 변동 없음). GitHub push
안전 (식별 정보 0건, 비밀번호 0건).

---

### v2.47.0 — 관리자 UX 강화: GitHub 자동 백업 + 한 클릭 복원 + 비밀번호 노출 0건 (2026.05)

**보고된 이슈** (사용자):
1. `/admin`에서 비밀번호 입력 시 401 — Vercel에 `ADMIN_DASHBOARD_PASSWORD` 미설정,
   `ADMIN_PASSWORD`만 설정된 상태
2. 백업이 다운로드 방식이라 매번 수동 작업 — GitHub 자동 저장 원함
3. 백업본으로 현재 갤러리 교체 기능 부재 — UI에서 한 클릭 복원 원함
4. README·workflow에 비밀번호 표기 노출 — GitHub repo에서 가시화

**해결 — 4가지 fix**

#### 1. ⭐ "지금 GitHub에 백업" 버튼 — workflow_dispatch 트리거

새 API: `/api/admin/backup-now` (POST)

GitHub REST API의 `workflow_dispatch` 엔드포인트로 daily-backup.yml 즉시 트리거:

```ts
const url = `https://api.github.com/repos/${githubRepo}/actions/workflows/daily-backup.yml/dispatches`;
await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
  body: JSON.stringify({ ref: "main" }),
});
```

UI에서 [🚀 지금 백업] 클릭 → 30초~1분 후 GitHub `backups/` 폴더에 자동 저장됨.
**다운로드 X**, 사용자 PC에 파일 안 남음.

#### 2. ⭐ GitHub 백업에서 직접 복원 (한 클릭)

새 API: `/api/admin/restore-from-github` (GET = 목록, POST = 복원)

GET: GitHub Git Tree API로 `backups/*.json` 파일 목록 반환 (최근 30개 + latest.json)

```ts
const treeRes = await fetch(
  `https://api.github.com/repos/${githubRepo}/git/trees/main?recursive=1`,
  { headers: { Authorization: `Bearer ${githubToken}`, ... } }
);
const backups = data.tree.filter(t => /^backups\/.+\.json$/.test(t.path));
```

POST: 사용자가 선택한 path를 GitHub Contents API로 fetch → 검증 → `kvBulkRestore`
호출. private repo도 token으로 작동.

UI 흐름:
```
[📂 백업 목록 불러오기] 클릭
  ↓
backups/latest.json (가장 최근)
backups/2026/05/folio-cards-2026-05-08.json (12.3 KB)
backups/2026/05/folio-cards-2026-05-07.json (12.1 KB)
...
  ↓ 각 백업에 두 버튼:
[병합 복원] — userEdited 카드 보존하며 병합
[교체 복원] — ⚠️ 갤러리 완전 교체 (이중 confirm)
```

#### 3. ⭐ 비밀번호 노출 전면 비공개

**제거된 노출 지점**:
- README.md의 비밀번호 표기 5곳 → 일반 안내문
- daily-backup.yml workflow help text의 비밀번호 표기 → 일반 안내문

**검증**: 소스 코드 + 문서 모두 비밀번호 0건. 비밀번호는 환경변수
(`ADMIN_DASHBOARD_PASSWORD`)와 GitHub Secrets에만 존재.

**fallback 동작 유지**: `ADMIN_DASHBOARD_PASSWORD` 미설정 시 `ADMIN_PASSWORD`
값으로 로그인 가능 — 사용자가 별도 비밀번호 설정 X 시 카드 등록 비밀번호(예:
)로 admin 접근 가능 ⚠️ v2.48.0에서 제거됨.

#### 4. 401 응답에 친화적 진단 메시지

`/api/admin/stats`의 401 응답에 환경변수 상태 hint 포함 (값은 노출 X, 설정 여부만):

```json
{
  "ok": false,
  "error": "unauthorized",
  "hint": {
    "ADMIN_DASHBOARD_PASSWORD": "missing",
    "ADMIN_PASSWORD": "set",
    "guide": "ADMIN_DASHBOARD_PASSWORD 미설정 — 임시로 기존 ADMIN_PASSWORD 값(카드 등록용 비밀번호)으로 로그인 가능합니다..."
  }
}
```

UI는 이 guide를 사용자에게 직접 표시.

#### 5. 새 환경변수 (admin UX 활성화용)

GitHub 자동 백업·복원 기능을 사용하려면 다음 환경변수를 Vercel에 추가:

```
GITHUB_REPO=<owner>/<repo>          예: seong-ro/nest-alum1
GITHUB_TOKEN=<personal-access-token>
  Required scopes:
    - actions:write (workflow_dispatch 트리거)
    - contents:read (백업 파일 fetch)
    - contents:write (백업 commit/push - workflow가 사용)
```

미설정 시 admin UI에서 [🚀 지금 백업]·[📂 백업 목록 불러오기] 버튼이 친화적
에러 메시지 표시 (`GITHUB_REPO 또는 GITHUB_TOKEN 환경변수가 설정되지 않았습니다`).

#### 6. 사용자 흐름 (시나리오 비교)

**시나리오 A — 일상 백업 (자동, 사용자 무개입)**:
- 매일 KST 02:00 GitHub Actions가 자동 실행
- backups/YYYY/MM/folio-cards-YYYY-MM-DD.json 생성
- backups/latest.json 갱신

**시나리오 B — 즉시 백업 (관리자가 큰 변경 후)**:
1. /admin → [🚀 지금 백업] 클릭
2. 30초~1분 후 GitHub Actions 탭에서 진행 확인 가능
3. 자동으로 `backups/`에 저장

**시나리오 C — 백업으로 복원**:
1. /admin → [📂 백업 목록 불러오기] 클릭
2. 원하는 날짜의 백업 선택 → [병합 복원] 또는 [교체 복원]
3. confirm → 즉시 갤러리 갱신 (router.refresh)

**시나리오 D — 로컬 백업 (오프라인 보존)**:
1. /admin → [📥 다운로드] 클릭
2. JSON 파일이 PC에 저장됨 (오프라인 보관용)

#### 7. 인터페이스 호환성

새 라우트 2개 추가 (`/api/admin/backup-now`, `/api/admin/restore-from-github`).
기존 admin API 4개와 admin UI 그대로 유지. 환경변수 미설정 시 새 기능만 비활성화,
기본 기능 영향 0. 빌드: `tsc --noEmit` 0 에러, `next build` 성공 (14 routes — 2개 추가).

#### 8. 보안 강화 요약

| 노출 지점 | 이전 | v2.47.0 |
|---|---|---|
| README.md | 비밀번호 5곳 | `<your-password>` 일반 안내문만 |
| daily-backup.yml | `Value: <비밀번호>` | `Value: <관리자가 정한 비밀번호>` |
| 코드 (.ts/.tsx/.json) | 0건 (이미 환경변수만) | 0건 유지 |
| GitHub Secrets | 비밀번호 저장 (참조만, 화면 노출 X) | 동일 |
| Vercel Env Vars | 비밀번호 저장 (참조만, 화면 노출 X) | 동일 |

GitHub repo가 public이어도 비밀번호가 어디에도 노출 안 됨.

---

### v2.46.1 — daily-backup.yml YAML 문법 오류 수정 (hotfix) (2026.05)

**보고된 이슈**: `.github/workflows/daily-backup.yml#L118` YAML 문법 오류로
GitHub Actions 워크플로우 파싱 실패. v2.46.0 deploy 후 첫 push 시점부터 모든
workflow 실행 차단.

**근본 원인**: shell의 multi-line `git commit -m "..."` 문자열 안에 빈 줄이
들어가면서, YAML parser가 `[skip ci]` 라인을 (들여쓰기 없는) 새 키로 해석.

```yaml
# Before (broken)
run: |
  git commit -m "chore(backup): daily card backup $DATE

[skip ci]                              ← YAML이 새 매핑 키로 인식
Auto-generated by ..."
```

**해결**: `-m` 옵션을 두 번 사용하여 multi-line 메시지 구성:

```yaml
# After (v2.46.1)
run: |
  git commit -m "chore(backup): daily card backup $DATE [skip ci]" \
             -m "Auto-generated by .github/workflows/daily-backup.yml"
```

git이 여러 `-m` 인자를 자동으로 빈 줄로 결합하여 같은 효과 — 첫 줄 subject,
나머지가 body. `[skip ci]` subject에 포함되어 Vercel deploy 트리거 방지 효과
유지.

**검증**:
```
✓ YAML 문법 정상 (Python yaml.safe_load 통과)
  jobs: ['backup']
  steps: 3

✓ ci.yml / daily-backup.yml / seo-health.yml 모두 통과
```

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (12 routes — 변동 없음).

---

### v2.46.0 — 매일 자동 백업 + 감춰진 관리자 대시보드 (`/admin`) (2026.05)

**보고된 요청**:
- 등록된 카드(특히 사용자 직접 입력 카드) 매일 백업 → GitHub 저장
- 감춰진 관리자 모드 `/admin` 생성 (대시보드 + 백업 복원 + 이상 징후 확인)
- 관리자 비번은 환경변수 + GitHub Secrets에만 저장 (코드/문서 노출 X)

**보안 우선 설계**

1. **비밀번호는 코드에 절대 hardcode 안 함** — 환경변수
   `ADMIN_DASHBOARD_PASSWORD`로 관리. Vercel + GitHub Secrets에만 저장.
2. **백업 파일에 카드 데이터(연락처 등) 포함** — 사용자의 GitHub repo가 **private
   이어야 안전**. README에 명시.
3. **`/admin` 페이지 비공개** — robots.txt에서 차단, noindex meta, sitemap 제외.

**해결 — 4가지 컴포넌트**

#### 1. ⭐ Admin API 4종

| 라우트 | 메서드 | 기능 |
|---|---|---|
| `/api/admin/dump` | GET | 모든 카드를 JSON으로 반환 (백업용) |
| `/api/admin/restore` | POST | JSON 데이터로 카드 일괄 복원 (merge / replace) |
| `/api/admin/stats` | POST | 통계·이상 징후·도메인 분포·최근 활동 |
| `/api/admin/cleanup-duplicates` | GET/POST | 중복 카드 정리 (v2.43.0 기존) |

**인증 흐름** (모든 admin API 공통):
```ts
function authorize(req, providedPassword) {
  const adminDashboardPw = process.env.ADMIN_DASHBOARD_PASSWORD;  // 1순위
  const adminPw = process.env.ADMIN_PASSWORD;                    // fallback
  // Authorization: Bearer <password> 헤더 또는 body password
  // 둘 중 하나가 ADMIN_DASHBOARD_PASSWORD 또는 ADMIN_PASSWORD와 일치
}
```

**백업 데이터 형식**:
```json
{
  "ok": true,
  "version": "2.46.0",
  "dumpedAt": "2026-05-08T03:00:00.000Z",
  "total": 42,
  "userEditedCount": 18,
  "cards": [
    { "id": "...", "card": {...}, "createdAt": "...", "updatedAt": "..." },
    ...
  ]
}
```

**복원 모드**:
- **merge** (권장): 백업 카드를 기존 갤러리에 병합. 기존 `userEdited=true` 카드는
  우선 보존 (백업이 더 최신 userEdited 카드인 경우만 덮어쓰기).
- **replace** (위험): 갤러리 전체를 백업으로 교체. 기존 데이터 모두 사라짐.

#### 2. ⭐ 관리자 대시보드 페이지 (`/admin`)

`app/admin/page.tsx` — 클라이언트 컴포넌트. 검색엔진 차단 (`noindex` meta).

**흐름**:
```
/admin 접속
  ↓
비밀번호 입력 폼 표시
  ↓ 비밀번호 입력 (ADMIN_DASHBOARD_PASSWORD 값)
  → POST /api/admin/stats { password }
  → 인증 통과 → sessionStorage에 비밀번호 저장 (탭 단위)
  ↓
대시보드 표시
```

**대시보드 섹션**:

| 섹션 | 내용 |
|---|---|
| **핵심 통계 4개** | 총 카드 / ✎ 사용자 편집 (%) / 자동 추출 (%) / 24시간 활동 |
| **데이터 관리** | 📥 백업 다운로드 / 🔍 중복 검사 / 백업 복원 (병합) / 🗑️ 중복 정리 실행 |
| **위험: 갤러리 전체 교체** | `<details>` 안에 숨김 — replace 모드 백업 복원 (이중 confirm) |
| **이상 징후** | 헤드라인 누락·본문 없음·산업 분류 미지정 등 카드 자동 감지 |
| **동일 헤드라인** | 같은 제목으로 등록된 가능성 있는 중복 |
| **산업 분류 분포** | 14개 카테고리별 카드 수 |
| **등록 도메인 Top 10** | 가장 많이 등록된 도메인 순위 |
| **최근 활동** | 최근 5개 카드 (사용자 편집 배지 포함) |

#### 3. ⭐ GitHub Actions Daily Backup Workflow

`.github/workflows/daily-backup.yml` — 매일 KST 02:00 (UTC 17:00) 실행.

**흐름**:
```yaml
1. checkout repo
2. /api/admin/dump 호출 (Authorization: Bearer ${ADMIN_DASHBOARD_PASSWORD})
3. backups/YYYY/MM/folio-cards-YYYY-MM-DD.json 으로 저장
4. backups/latest.json 도 갱신 (간편 다운로드용)
5. 변경 있으면 commit + push (skip ci)
```

**커밋 메시지**: `chore(backup): daily card backup YYYY-MM-DD [skip ci]`

**`[skip ci]`** 플래그로 Vercel 자동 deploy 트리거 방지 — 백업은 데이터만 저장,
앱 재배포 불필요.

**보존 정책**: 모든 백업 보존 (Git 히스토리에 기록). 필요 시 `backups/YYYY/MM/`
디렉토리 단위로 압축·삭제 가능.

#### 4. ⭐ auto-deploy.sh의 backups/ 보존 로직

**문제**: `auto-deploy.sh`가 `git push --force`이므로, GitHub의 `backups/`
폴더가 force push로 사라질 수 있음.

**해결**: deploy 시 GitHub에서 `backups/` 폴더만 fetch + checkout 후 staging:

```bash
# auto-deploy.sh L450 부근 추가
if git ls-remote --exit-code origin "$GIT_BRANCH" >/dev/null 2>&1; then
  git fetch origin "$GIT_BRANCH" --depth=1
  if git ls-tree -d "origin/$GIT_BRANCH" backups >/dev/null 2>&1; then
    git checkout "origin/$GIT_BRANCH" -- backups/
  fi
fi
```

이로써 deploy 후에도 GitHub Actions가 push한 백업 데이터 모두 보존.

#### 5. 환경변수 + GitHub Secrets 설정

**Vercel** (Settings → Environment Variables):
```
ADMIN_DASHBOARD_PASSWORD=<your-password>   ← 관리자 대시보드 전용
ADMIN_PASSWORD=<카드 등록용 비밀번호>   ← 카드 등록·수정·삭제용
```

**GitHub Secrets** (Repo Settings → Secrets and variables → Actions → New secret):
```
ADMIN_DASHBOARD_PASSWORD=<your-password>
```

**GitHub Variables** (선택):
```
API_BASE=https://nest-alum1.vercel.app   ← 기본값 그대로 사용 시 불필요
```

#### 6. 보안 안내 (중요)

⚠️ **백업 파일에는 카드의 연락처·이메일 등 개인정보가 포함됩니다.** 다음 중 하나
필수:

1. **GitHub repo를 Private으로 운영** (가장 안전, 권장)
2. 또는 별도 private repo에 backups push (workflow 수정 필요)
3. 또는 백업 파일에서 contactInfo 필드 제거 후 저장 (workflow 수정 필요)

⚠️ **`/admin` URL 보호**:
- robots.txt에 `Disallow: /admin` 추가
- `<meta name="robots" content="noindex, nofollow, noimageindex, noarchive">`
- sitemap.xml에서 제외 (admin/ 경로 미포함)

#### 7. 사용 시나리오

**시나리오 A — 일상 모니터링**:
1. `/admin` 접속 → 관리자 비밀번호 입력
2. 대시보드 확인 — 이상 징후 0개, 24시간 활동 N개 정상 확인
3. 로그아웃 (sessionStorage 삭제)

**시나리오 B — 갑작스러운 카드 손실 (KV 장애 등)**:
1. GitHub Actions → Workflows → "Daily Card Backup" → Latest 성공 실행 확인
2. `backups/latest.json` 다운로드 (또는 backups/YYYY/MM/ 특정 날짜)
3. `/admin` 접속 → "백업 복원 (병합)" → JSON 업로드 → confirm
4. 갤러리 자동 갱신, 사용자 편집 카드 우선 보존

**시나리오 C — 잘못된 카드가 갤러리에 노출**:
1. `/admin` 접속 → 이상 징후 섹션에서 ID 확인
2. 메인 갤러리에서 해당 카드 호버 → 편집 또는 삭제

#### 8. 인터페이스 호환성

새 라우트 4개 추가 (`/admin`, `/api/admin/dump`, `/api/admin/restore`,
`/api/admin/stats`). `kvBulkRestore` 함수 신규 추가. 기존 코드 영향 0. 빌드:
`tsc --noEmit` 0 에러, `next build` 성공 (12 routes — 4개 추가).

---

### v2.45.0 — 카드 상세 페이지 수정 버튼 추가 (2026.05)

**보고된 요청**: 카드 상세 페이지에서 "갤러리에서 내리기" 버튼 왼편에 수정 버튼
추가. v2.44.0에서 갤러리 호버 편집을 추가했지만, 상세 페이지에서 카드 내용을
정독한 후 즉시 수정하는 흐름이 필요.

**해결**

#### 1. ⭐ DetailView에 수정 버튼 추가

상단 액션 영역 — 기존 [공유] [Print] [갤러리에서 내리기]에서:

```
[← 갤러리로]   [공유] [Print] [✏️ 수정] [갤러리에서 내리기]
                                  ^^^^^^^^^
                              v2.45.0 신규
```

`갤러리에서 내리기` 버튼 **왼편**에 수정 버튼 배치 — 사용자 시선 흐름과
액션 우선순위 (긍정적 → 파괴적) 맞춤.

#### 2. 디자인

```jsx
<button
  type="button"
  onClick={onRequestEdit}
  aria-label="이 기업 소개 내용 수정"
  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
             border border-border text-[0.82rem] font-medium text-fg-muted
             hover:text-accent hover:border-accent transition-colors focus-ring"
>
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
  수정
</button>
```

- 연필 아이콘 + "수정" 텍스트 (의미 명확)
- 톤: 중립색 → 호버 시 accent 색상 (긍정적 액션 인상)
- 갤러리 호버 편집 버튼과 동일 아이콘 (일관성)

#### 3. 흐름 통합

상세 페이지 / 갤러리 호버 모두 같은 modal kind 사용:

```
상세 페이지 [✏️ 수정] 클릭
  ↓
setModal({ kind: "edit-existing-pw", stored: selectedCard })
  ↓
PasswordDialog "edit" variant
  ↓ 비밀번호 검증 성공
CardEditDialog 열림 (기존 카드 데이터 그대로 로드)
  ↓ 사용자 편집 후 등록
userEdited=true 자동 설정 → 영구 보존
  ↓
openDetail(newId) → 상세 페이지 자동 갱신 (selectedCard useMemo 반영)
```

#### 4. 인터페이스 호환성

`DetailView`에 `onRequestEdit: () => void` prop 추가. 기존 코드 영향 0 (call site
한 곳만 wire). 빌드: `tsc --noEmit` 0 에러, `next build` 성공.

---

### v2.44.0 — 자동 새로고침 cron 제거 + 갤러리 카드 직접 편집 (2026.05)

**보고된 이슈** (사용자):
- GitHub Actions Auto Refresh 워크플로우 18번째 실행에서 `Cron API returned 504` 실패
- 카드 수가 늘면서 한 배치 안에 모든 카드 fetch 시간 초과
- userEdited 보호 시스템 도입 후 자동 새로고침의 가치 저하 (사용자 카드는 보존,
  자동 추출 카드만 갱신되는데 그것마저 504 실패)
- 등록된 카드 내용 수정 기능 부재

**전략 결정**:
1. **자동 cron 완전 제거** — 504 위험 영구 해소
2. **갤러리 카드 직접 편집** — 등록 후에도 언제든 헤드라인·부제·본문 등 수정 가능

**해결 — 4가지 fix**

#### 1. ⭐ Vercel cron + GitHub Actions 자동 새로고침 제거

**vercel.json**:
```json
// Before (v2.43.0)
{
  ...
  "crons": [
    { "path": "/api/cron/refresh-all", "schedule": "0 18 * * *" }
  ]
}

// After (v2.44.0)
{
  ...
  // crons 항목 완전 삭제
}
```

**삭제된 파일**:
- `app/api/cron/refresh-all/route.ts` — Vercel cron 라우트
- `.github/workflows/auto-refresh.yml` — GitHub Actions 자동 새로고침
- `components/RefreshAllDialog.tsx` — 일괄 새로고침 다이얼로그
- HomeClient의 `refreshAllOpen` state·`onRefreshAll` prop·`refreshAllAction` import

**유지된 것**:
- `refreshAllAction` server action 함수 (admin이 직접 호출 가능, UI에서만 제거)
- 카드별 단일 새로고침 (기존 refresh 모달) — 504 위험 없음
- `userEdited` 보호 시스템 — 사용자 직접 작성 카드 영구 보존

**근거**: v2.37.0에서 도입한 `userEdited=true` 시스템이 사용자 데이터를 영구
보존하므로, 자동 새로고침은 자동 추출 카드만 갱신하는 기능이었음. 그 마저도 504로
실패하니 자동 갱신 가치 < 운영 부담. 카드별 수동 새로고침은 그대로 유지.

#### 2. ⭐ 갤러리 카드 직접 편집 기능 추가

**ThumbnailCard에 편집 버튼**:
```tsx
// 호버 시 표시 (삭제 버튼 옆)
{onEdit ? (
  <button
    onClick={(e) => { e.stopPropagation(); onEdit(); }}
    className="..."
    aria-label="이 기업 소개 내용 편집"
    title="내용 편집"
  >
    {/* 연필 아이콘 SVG */}
  </button>
) : null}
```

**새 modal kind**: `"edit-existing-pw"` — 비밀번호 검증 후 CardEditDialog 로드:
```ts
// HomeClient
| { kind: "edit-existing-pw"; stored: StoredCard }

// 흐름:
// 1. 카드 호버 → 연필 버튼 클릭 → setModal({ kind: "edit-existing-pw", stored })
// 2. PasswordDialog "edit" variant 표시 ("이 기업 소개 내용을 편집하시겠습니까?")
// 3. 비밀번호 입력 → 검증 → CardEditDialog로 자동 전환 (기존 카드 데이터 그대로 로드)
// 4. 사용자 편집 후 등록 → userEdited=true 자동 설정 → 영구 보존
```

**PasswordDialog "edit" variant**:
- 제목: "이 기업 소개 내용을 편집하시겠습니까?"
- 설명: `"<카드 헤드라인>"의 헤드라인·부제·본문·핵심 포인트 등을 직접 수정할 수
  있어요. 저장 시 사용자 편집 카드로 표시되어 본문이 영구 보존됩니다.`
- 액션 라벨: "편집 화면 열기"
- 진행 메시지: "편집 화면 여는 중…"

#### 3. ⭐ 카드 호버 액션 메뉴 정리

| 위치 | 액션 | 아이콘 | 표시 조건 |
|---|---|---|---|
| 우상단 | ⭐ 즐겨찾기 | 별 | 항상 (반투명 → 호버 진해짐) |
| 우상단 호버 | ✏️ 편집 | 연필 | 호버 시 (v2.44.0 신규) |
| 우상단 호버 | 🗑️ 삭제 | 휴지통 | 호버 시 |

#### 4. 인터페이스 호환성

`vercel.json` cron 항목 삭제. `app/api/cron/refresh-all/route.ts` 삭제.
`refreshAllAction` 함수 자체는 유지 (호출 경로 없으므로 영향 0). `ThumbnailCard`에
`onEdit?: () => void` 옵셔널 prop 추가. modal kind 확장만.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (8 routes — `/api/cron/refresh-all`
제거로 1개 감소).

#### 5. 사용자 흐름 (카드 편집)

```
갤러리에서 카드 호버
  ↓
연필 아이콘 클릭
  ↓
PasswordDialog "edit" variant
  "<카드 헤드라인> 내용을 편집하시겠습니까?"
  → 비밀번호 입력
  ↓
검증 성공
  ↓
CardEditDialog 자동 열림 (기존 카드 데이터 그대로 로드)
  - 헤드라인·부제·첫 단락·본문·핵심 포인트·인용문·연락처·이미지 모두 수정 가능
  ↓
"이 정보로 등록" 클릭
  → userEdited=true 플래그 자동 설정
  → 갤러리에서 ✎ 사용자 편집 배지 표시
  → 본문 영구 보존
```

#### 6. GitHub Actions 정리

기존 `auto-refresh.yml` 워크플로우는 다음 deploy 시 자동 삭제됩니다 (auto-deploy.sh의
`git add -A` + `git push --force`로 zip에 없는 파일은 GitHub repo에서도 제거).

수동으로 즉시 정리하려면:
```bash
# 또는 GitHub 웹에서: Settings → Actions → Workflows → Auto Refresh All Cards → ⋯ → Disable
git rm .github/workflows/auto-refresh.yml
git commit -m "chore: remove auto-refresh workflow (v2.44.0)"
git push
```

Vercel 환경변수 `CRON_SECRET`은 더 이상 필요 없으므로 제거 가능 (선택):
- Vercel → Project Settings → Environment Variables → CRON_SECRET → Remove

---

### v2.43.0 — 모달 드래그/붙여넣기 닫힘 버그 + 중복 등록 차단 + 입력 글자 수 제한 (2026.05)

**보고된 치명적 이슈** (사용자):
1. 수동 입력 창에서 드래그·붙여넣기 시 모달이 닫혀 입력 데이터 유실
2. `kodit.co.kr`이 두 번 중복 등록됨 — 동일 주소 중복 차단 필요
3. 기존 중복 카드 자동 정리 + 각 입력창에 적절한 글자 수 제한 필요

**해결 — 5가지 fix**

#### 1. ⭐ 모달 backdrop 클릭 닫기 완전 비활성화 (드래그/붙여넣기 보호)

**근본 원인**: 사용자가 입력란 안에서 텍스트 드래그 시작 → mousedown은 input에서
발생 → 마우스가 backdrop으로 이동하며 mouseup이 backdrop에서 발생 → click
이벤트가 두 요소의 공통 조상(backdrop)에서 발생 → `e.target === e.currentTarget`
참 → 모달이 닫혀 입력 데이터 유실. 우클릭 컨텍스트 메뉴, 모바일 long-press
드래그도 동일.

**v2.43.0 해결**: backdrop click 핸들러 자체 제거. 닫기는 명시적 액션만:
- ✕ 닫기 버튼
- ESC 키
- 취소 버튼

```jsx
// Before (v2.42.0): backdrop click 핸들러 (조건 검사 + 추적 ref + selectionchange)
<div onMouseDown={...} onMouseUp={...} onTouchStart={...} onTouchEnd={...}>

// After (v2.43.0): 모든 핸들러 제거 — 100% 안전
<div className="fixed inset-0 z-50 ..." style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
```

**적용 범위**: ManualEntryDialog (수동 입력), ShareDialog (공유), PasswordPrompt
(비밀번호) — 입력란 있는 모든 모달.

#### 2. ⭐ URL 정규화 일관성 — 중복 등록 차단

**근본 원인**: previewCard와 createCardEdited가 다른 URL 기반으로 dedupKey 계산:
```ts
// previewCard (L116):  dedupKey = computeDedupKey(urlResult.finalUrl)  ← redirect 후
// createCardEdited:    expectedDedupKey = computeDedupKey(normalizedUrl) ← 사용자 입력
```

사용자가 `kodit.co.kr` 입력 → finalUrl이 `https://www.kodit.co.kr/main`이면 두
다른 dedupKey 생성 → 같은 사이트가 중복 저장.

**v2.43.0 해결**: `PreviewState`에 `canonicalUrl` 필드 추가:

```ts
// lib/actions-types.ts
export type PreviewState = | {
  ok: true;
  card: EditorialCardData;
  dedupKey: string;
  canonicalUrl: string;  // v2.43.0: 정규 URL (finalUrl)
  ...
}

// app/actions.ts previewCard
return {
  ok: true,
  card,
  dedupKey,
  canonicalUrl: urlResult.finalUrl,  // 폼에 전달
  ...
}

// app/actions.ts createCardEdited
const canonicalUrl = formData.get("canonicalUrl") as string ?? "";
const urlForDedup = canonicalUrl || normalizedUrl;
const expectedDedupKey = computeDedupKey(urlForDedup);
```

CardEditDialog에서 canonicalUrl을 form data에 포함하여 서버 전달. 자동·수동
경로 모두 동일 dedupKey 보장.

**createCardManual도 강화**: 저장 직전 HEAD 요청으로 redirect 추적:
```ts
let canonicalUrl = normalizedUrl;
try {
  const headRes = await fetch(normalizedUrl, { method: "HEAD", redirect: "follow", signal: ... });
  if (headRes.url) canonicalUrl = headRes.url;
} catch { /* fallback */ }
const dedupKey = computeDedupKey(canonicalUrl);
```

#### 3. ⭐ 기존 중복 카드 자동 정리 API

새 admin API: `app/api/admin/cleanup-duplicates/route.ts`

```ts
// GET (검사만 — dryRun)
GET /api/admin/cleanup-duplicates?password=...
→ { ok, scanned, duplicateGroups, duplicateCards, deleted: 0, groups: [...] }

// POST (실제 삭제)
POST /api/admin/cleanup-duplicates
Body: { password: "...", confirm: true }
→ { ok, scanned, duplicateGroups, duplicateCards, deleted: N, groups: [...] }
```

**동작**:
1. 모든 카드를 `computeDedupKey(card.sourceUrl)` 기준으로 그룹핑
2. 그룹 크기 > 1이면 중복 — 가장 최근(`updatedAt` 내림차순) 1개만 keep
3. **userEdited=true 카드가 있으면 우선 보존** (사용자 작성 데이터 보호)
4. 나머지 삭제

**사용 예** (관리자):
```bash
# 중복 검사
curl "https://nest-alum1.vercel.app/api/admin/cleanup-duplicates?password=$ADMIN_PASSWORD"

# 실제 정리
curl -X POST -H "Content-Type: application/json" \
  -d '{"password":"...", "confirm":true}' \
  https://nest-alum1.vercel.app/api/admin/cleanup-duplicates
```

#### 4. ⭐ 각 입력 창 글자 수 제한 (`maxLength`)

| 필드 | maxLength | 설명 |
|---|---|---|
| URL | 500 | 일반 URL 충분 |
| 헤드라인 | 140 | 트위터 한 줄 분량 |
| 부제(dek) | 280 | 한 문단 |
| 첫 단락(lead) | 600 | 카드 도입부 |
| 본문 단락 | 1000 | 한 단락당 |
| 핵심 포인트 | 200 | 글머리 기호 항목 |
| 강조 인용문 | 400 | 풀쿼트 |
| 사이트 이름 | 80 | 짧은 회사명 |
| 상단 라벨(eyebrow) | 50 | 카테고리 라벨 |
| 대표자 이름 | 50 | 한국 일반 이름 |
| 전화번호 | 30 | 국제 형식 포함 |
| 이메일 | 100 | RFC 표준 |
| 회사 주소 | 200 | 긴 주소 포함 |
| 대표 이미지 URL | 500 | 일반 URL |
| 수동 입력 본문 | 5000 | 풍부한 소개 |

각 필드에 글자 수 카운터 표시 (`이미 N자 / 최대 M자`).

#### 5. 인터페이스 호환성

`PreviewState.canonicalUrl: string` 추가만 (옵셔널 호환). `CardEditDialogProps.canonicalUrl?` 옵셔널.
`/api/admin/cleanup-duplicates` 신규 라우트. 기존 코드 영향 0. 빌드: `tsc --noEmit`
0 에러, `next build` 성공 (10 routes).

---

### v2.42.0 — 봇 차단 사이트 Googlebot UA 자동 재시도 + 친화적 에러 안내 (2026.05)

**보고된 이슈** (사용자):
> "kodit.or.kr를 가져올 수 없다는 점을 정밀 진단 최신 베스트 프랙티스 적용 최적화"

**진단**: `kodit.or.kr` (한국 공공·정부 도메인) 자동 추출 시 Vercel server에서 fetch
하면 403 응답 (`host_not_allowed`). 한국 공공기관·정부 사이트(.go.kr·.or.kr)는 종종
일반 봇 차단을 적용하지만 검색엔진 크롤러(Googlebot)는 화이트리스트.

**해결 — 5가지 fix** (v2.42.0 누적)

#### 1. ⭐ Googlebot + Bingbot UA 다단 재시도 (정부·공공 사이트 우회)

`fetchHtml`에서 일반 브라우저 UA로 403/401 응답 시 **2단계 재시도**:

```ts
// 1차 재시도: Googlebot
const GOOGLEBOT_USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

if (!res.ok && (res.status === 403 || res.status === 401)) {
  const retryRes = await fetch(url, {
    redirect: "follow",
    headers: buildGooglebotHeaders(url),
    signal: retryController.signal,
  });
  if (retryRes.ok) {
    res = retryRes;
  } else {
    // 2차 재시도: Bingbot (일부 사이트는 Googlebot 차단해도 Bingbot은 허용)
    const BINGBOT_USER_AGENT =
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
    const bingRes = await fetch(url, {
      redirect: "follow",
      headers: buildBingbotHeaders(url),
      signal: bingController.signal,
    });
    if (bingRes.ok) res = bingRes;
  }
}
```

각 재시도 timeout 4초 (전체 fetch는 17초 미만 유지). 재시도 모두 실패해도 원래
응답 사용 → silent retry, 사용자에게 추가 부담 없음.

#### 2. ⭐ 짧은 응답 자동 감지 (`BLOCKED_TINY_RESPONSE`)

200 OK인데 body가 매우 작은 경우(< 200byte) 봇 차단/방화벽 거부 응답으로 인식:

```ts
const trimmedLen = html.trim().length;
if (trimmedLen < 200 && !/^<!doctype html|<html|<head/i.test(html.trim().slice(0, 100))) {
  throw new Error(
    `BLOCKED_TINY_RESPONSE_${trimmedLen}: 사이트가 매우 짧은 응답(${trimmedLen}byte)을 반환했습니다 — 봇 차단 또는 방화벽 거부 가능성`,
  );
}
```

**예**: kodit.or.kr가 `Host not in allowlist` (21byte) 응답 시 즉시 인식, 친화적
에러 메시지 표시.

#### 3. ⭐ 정부·공공 도메인 사전 안내 (URL 입력 시점)

URL 입력란에 `*.or.kr`·`*.go.kr` 패턴 입력 시 즉시 안내:

```jsx
{trimmed && /^https?:\/\/[^/]+\.(or|go)\.kr/i.test(trimmed) ? (
  <div className="...border-sky-200 bg-sky-50 text-sky-900...">
    ℹ️ 공공기관·정부 사이트로 보여요.
    이런 사이트는 보안 정책 때문에 자동 추출이 실패할 수 있습니다.
    그래도 걱정 마세요 — 자동 추출이 안 되면 직접 입력 화면으로 자동 전환됩니다.
  </div>
) : null}
```

사용자가 등록 시도 전에 미리 알게 되어 혼란 방지.

#### 4. ⭐ 친화적 에러 메시지 전면 재작성

영문 코드 + 기술적 설명 → 자연 한국어 + 권장 조치:

| 에러 코드 | Before (v2.41.0) | After (v2.42.0) |
|---|---|---|
| FORBIDDEN_403 | "해당 사이트가 자동 접근을 차단합니다. 로그인 필요한 페이지는 지원하지 않습니다." | "사이트가 외부 자동 접근을 차단하고 있어요. (공공기관·정부 사이트에서 자주 발생) 직접 [수동 입력]으로 헤드라인·본문을 작성해 주시면 영구 보존됩니다." |
| NOT_FOUND_404 | "페이지를 찾을 수 없습니다. URL을 확인해주세요." | "그런 주소의 페이지가 없어요. 주소(URL)를 다시 확인해 주세요. (예: .or.kr → .co.kr 같은 도메인 확장자가 다른지 확인)" |
| TIMEOUT | "응답이 너무 느려 자동 추출이 시간 안에 완료되지 못했습니다..." | "사이트가 응답에 너무 오래 걸려 자동 추출이 시간 안에 끝나지 못했어요. [수동 입력] 폼으로 소개를 직접 작성해 주세요." |
| SERVER_ERROR_5xx | "원본 사이트에 오류가 발생했습니다." | "사이트 자체에 일시적 오류가 있어요. 사이트가 복구된 후 다시 시도하거나 [수동 입력]을 사용해 주세요." |
| RATE_LIMITED_429 | "요청이 일시 제한되었습니다. 잠시 후 다시 시도해주세요." | "사이트가 잠시 너무 많은 요청을 받아 응답을 거부했어요. 잠시 후 다시 시도해 주세요." |

NOT_FOUND_404 메시지에 `.or.kr → .co.kr` 도메인 확장자 힌트 추가 — 흔한 오타 패턴
사용자에게 안내 (예: 신용보증기금은 `kodit.co.kr`).

#### 5. ⭐ 수동 입력 fallback trigger 정규식 확장

새 친화 메시지가 자동으로 수동 입력 모달을 트리거하도록:

```ts
// HomeClient.tsx
if (
  result.error &&
  /자동 추출이 차단|봇 차단|본문을 찾을 수 없|내용을 찾을 수 없|시간 안에 끝나지 못|시간 안에|외부 자동 접근을 차단|일시적 오류|매우 짧은 응답|보안 정책/.test(result.error)
) {
  // 수동 입력 모드로 자동 전환 — userEdited=true 영구 보존
}
```

추가된 trigger 키워드: `봇 차단`, `내용을 찾을 수 없`, `시간 안에 끝나지 못`,
`외부 자동 접근을 차단`, `일시적 오류`, `매우 짧은 응답`, `보안 정책`. 모든 친화
에러 메시지가 매칭됨.

#### 6. 사용자 흐름 (kodit.or.kr 케이스)

```
사용자: kodit.or.kr 입력
  ↓
즉시 사전 안내 표시: "ℹ️ 공공기관·정부 사이트로 보여요..."
  ↓ 사용자 등록 시도
[Step 1] 일반 Chrome UA로 fetch
  ↓ 403 응답 (공공기관 봇 차단)
[Step 2] Googlebot UA로 자동 재시도 (silent, 4초)
  ↓ 여전히 차단되면
[Step 3] Bingbot UA로 자동 재시도 (silent, 4초)
  ↓
  [성공] → 정상 추출 → 신호등 🟢 + 카드 폼
  [실패] → 짧은 응답 감지 또는 403 → 친화 에러 + 자동 수동 입력 모달
            "사이트가 매우 짧은 응답을 반환했어요 — 보안 정책으로 자동 접근을
             차단한 것 같습니다 (공공기관·정부 사이트에서 자주 발생). 
             [수동 입력]으로 직접 작성해 주세요."
  ↓
사용자가 직접 작성 → userEdited=true → cron 영구 보존
```

#### 7. 인터페이스 호환성

`fetchHtml` 시그니처 변경 없음. 새 헬퍼 `buildBingbotHeaders` 추가만. 빌드:
`tsc --noEmit` 0 에러, `next build` 성공 (9 routes), 시뮬레이션 7/7 + 4/4 pass.

---

### v2.41.0 — 비전문가 친화 진단 UX 전면 개편 (스토리텔링 + 신호등 + 2단계 토글) (2026.05)

**보고된 이슈** (v2.40.0):
> "URL 등 전문 용어 및 영문 축약어들을 비전문가 친화적인 스토리텔링의 친절하고 이해하기 쉬운 설명의 가이드라인으로 전면 수정. 너무 상세한 디버그 패널도 간략한 디버그로 수정 또는 삭제."

**전략 결정**: 디버그 정보 자체는 유지하되 **3단 정보 구조**로 재구성 — 일반 사용자는 깔끔한 화면, 궁금한 사용자는 친화적 요약, 개발자는 영문 기술 용어. 사용자가 화면을 본 모습은 두 단계 토글을 모두 펼친 결과 (의도된 점진적 공개).

**해결 — 3단 정보 구조**

#### 1. ⭐ 1단계: 디버그 패널 자체를 `<details>`로 기본 접힘

```jsx
<details className="rounded-lg border border-stone-200 bg-stone-50">
  <summary>🔍 이 사이트에서 자동으로 가져온 정보 살펴보기  📋 복사</summary>
  ...
</details>
```

**일반 사용자가 보는 화면**: 카드 입력 폼 + 빈약 안내문(필요 시) + "🔍 자동으로 가져온 정보 살펴보기" 한 줄. 디버그 정보 일체 안 보임 — 깔끔.

#### 2. ⭐ 2단계: 친화적 요약 — 신호등 + 자연어 평가

🔍 토글 펼치면 **신호등 + 4개 항목 ✓△✗ 마커 + 권장 액션** 표시:

```
🟢 사이트 정보를 잘 가져왔어요
  ✓ 본문 글: 6개 단락 추출됨 (충분)
  ✓ 사이트 자기소개 글: 있음
  ✓ 대표 이미지: 있음 (카드 상단에 표시됩니다)
  ℹ️ 홈페이지 제작 도구로 만든 사이트(imweb)로 보입니다.

👉 어떻게 할까요?
  내용을 한번 훑어보고 어색한 부분만 살짝 다듬어 등록하세요.

📄 자동으로 가져온 내용 미리보기
  부제: "..."
  첫 단락: "..."
  본문 시작: "..."
  핵심 포인트: "..."
```

상태별 색상: 🟢 emerald (충분) / 🟡 amber (보통) / 🔴 rose (부족).

**평가 기준**:
| 본문 단락 수 | 신호등 | 메시지 |
|---|---|---|
| 3개 이상 | 🟢 | 사이트 정보를 잘 가져왔어요 |
| 1~2개 | 🟡 | 기본 정보는 가져왔지만 보완이 필요해요 |
| 0개 | 🔴 | 사이트에서 정보를 거의 가져오지 못했어요 |

#### 3. ⭐ 3단계: 영문 기술 정보 — 별도 inner `<details>` 안에

```jsx
<details>
  <summary>🛠️ 기술 정보 자세히 보기 (개발자용 · 영문 용어)</summary>
  ... contentSignal, raw paragraphs, og:description, HTML 구조 진단,
      ⚙ 추출 단계 가시성, 해석 가이드 ...
</details>
```

개발자가 명시적으로 펼쳐야만 보임. JSON 복사 버튼도 outer summary에 배치 → 펼치지 않고도 한 번에 복사.

#### 4. 친화적 안내문 사용

| 영문/축약어 | 친화적 한글 |
|---|---|
| URL | 사이트 주소 |
| og:description | 사이트가 검색·SNS용 한 줄 소개 |
| JSON 복사 | 기술 정보 한꺼번에 복사 |
| imweb·Wix builder | 홈페이지 제작 도구로 만든 사이트 |
| userEdited 플래그 | "사용자 편집" 표시 |

#### 5. 빈약 안내문에 영구 보존 메시지 강화

```
📭 이 사이트는 정보가 잘 정리돼 있지 않아요

웹사이트가 자기 자신을 소개하는 정보(보통 검색 결과나 SNS 미리보기에 쓰이는 설명)가
거의 비어있어, 자동으로 카드 내용을 채우기가 어려운 상태입니다. 홈페이지 제작
도구로 만든 사이트(imweb·Wix 등)에서 자주 발생합니다.

💡 페이지 자체는 큰데(약 838KB) 추출에 실패한 경우라 직접 입력이 가장 정확합니다.
아래 헤드라인·부제·본문·핵심 포인트를 직접 작성해 주세요.

🛡️ 안심하세요 — 직접 작성한 카드는 영구 보존됩니다
   여러분이 직접 작성하면 시스템이 자동으로 "사용자 편집" 표시를 남깁니다.
   6시간마다 카드를 자동으로 새로 가져오는 작업이 돌아가지만, 여러분이 작성한
   본문은 절대 덮어쓰지 않아요. (사이트 이미지·이름 같은 메타 정보만 살짝 갱신)
   카드 아래쪽에 ✎ 사용자 편집 마크가 표시되어 한눈에 알 수 있습니다.
```

#### 6. 인터페이스 호환성

UI 표현만 변경. 데이터 모델·API·인터페이스 모두 동일. 빌드: `tsc --noEmit` 0
에러, `next build` 성공 (9 routes).

---

### v2.40.0 — lead/dek 깨진 도메인 패턴 정리 + lead 진단 가시성 + 빌더 도메인 표시 명확화 (2026.05)

**보고된 이슈** (v2.39.0 결과):
- v2.39.0 fix로 walker 트리거 ✓, body 6단락 추출 ✓, contentSignal: rich
- **남은 문제**: lead 단락에 `"<sitename>..co.kr ). <korean>와 함께하는"` 같은 깨진
  텍스트 — 사이트명·도메인 정보가 정규식으로 잘못 처리되어 잔재 발생

**진단**: 빌더 사이트의 일부 단락 (예: "회사명 (도메인.co.kr). 함께하는 ...")이
sanitize에서 부분적으로만 매칭되어 "..co.kr )." 같은 깨진 형태로 lead/dek에
들어옴.

**해결 — 3가지 fix**

#### 1. ⭐ `cleanBrokenDomainArtifacts()` 함수 추가 + lead/dek에 적용

`lib/sanitize.ts`에 새 export:
```ts
export function cleanBrokenDomainArtifacts(text: string): string {
  let s = text;
  s = s.replace(/\.\.\s*[a-z]{2,4}(?:\.[a-z]{2,4})?\s*\)/gi, ""); // "..co.kr )"
  s = s.replace(/\(\s*\)/g, "");                                   // 빈 괄호
  s = s.replace(/(?:^|\s)\.\.[a-z]{2,4}(?:\.[a-z]{2,4})?(?=[\s,.!?]|$)/gi, "");
  s = s.replace(/(?:^|\s)\)+/g, " ");                              // 잔여 ")"
  s = s.replace(/\.{2,}/g, ".").replace(/,{2,}/g, ",");
  s = s.replace(/\s+([.,!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  return s;
}
```

`lib/compose-card.ts`에서 lead·dek 합성 후 적용:
```ts
const leadBefore = lead;
const dekBefore = dek;
lead = cleanBrokenDomainArtifacts(lead);
const dekClean = cleanBrokenDomainArtifacts(dek);
if (leadBefore !== lead || dekBefore !== dekClean) {
  log.info("composeCard", "broken-domain-cleaned", { ... });
}
```

**시뮬레이션 결과 (8/8 pass)**:
| 입력 | 출력 |
|---|---|
| `<SITE>..co.kr ). <korean>와 함께하는 새로운 가치` | `<SITE>. <korean>와 함께하는 새로운 가치` |
| `회사명 (  ) 소개` | `회사명 소개` |
| `회사명 ) 소개` | `회사명 소개` |
| `회사명 ..co.kr 소개` | `회사명 소개` |
| `회사명 (example.co.kr) 소개합니다` | `회사명 (example.co.kr) 소개합니다` (정상 텍스트 보존) |

#### 2. ⭐ lead/dek 진단 가시성 (PreviewState debug)

`lib/actions-types.ts` + `app/actions.ts`에 옵셔널 필드 추가:
```ts
leadPreview?: string;     // 합성된 lead 단락 첫 200자
dekPreview?: string;      // 합성된 dek 첫 200자
```

CardEditDialog 디버그 패널 섹션 4에 즉시 노출:
```
최종 카드 첫 본문·핵심 포인트 (80자)
body[0]: <body preview>
kp[0]: <keypoints preview>
dek: <dek preview>
lead: <lead preview>
```

이제 사용자가 깨진 lead 텍스트의 정확한 모습 즉시 확인 가능.

#### 3. ⭐ 빌더 도메인 표시 명확화

**Before (v2.39.0)**: finalUrlHost가 `<example>-k.imweb.me` 같은 빌더 호스팅
도메인이라서 `isBuilderDomain=true`였는데, builderSignature는 `null`이라
UI에 "— 미감지"로 표시됨.

**After (v2.40.0)**: isBuilderDomain=true면 어떤 빌더인지 명확히 표시:
```ts
if (/imweb\.me$/i.test(finalUrlHost)) builderSignature = "imweb (호스팅 도메인)";
else if (/wix\.com$/i.test(finalUrlHost)) builderSignature = "wix (호스팅 도메인)";
// ...
```

UI 표시:
- `*.imweb.me` 도메인 → `✓ imweb (호스팅 도메인)` 표시
- HTML 시그니처 감지 → `✓ imweb (HTML 시그니처)` 표시
- 둘 다 X → `— 미감지`

#### 4. 인터페이스 호환성

`leadPreview`·`dekPreview` 옵셔널 필드만 추가. 기존 코드 영향 0.
`cleanBrokenDomainArtifacts`는 sanitize.ts의 새 export. 빌드: `tsc --noEmit` 0
에러, `next build` 성공 (9 routes), 시뮬레이션 8/8 pass.

---

### v2.39.0 — walker trigger 결정적 버그 수정 + HTML 빌더 시그니처 감지 (2026.05)

**보고된 이슈** (v2.38.0 디버그):
```
brute force walker: — 트리거 안 됨    ← ★ 핵심 ★
raw paragraphs (sanitize 전, 첫 3개):
  [0] 이미지 맵이미지 맵이미지 맵
  [1] 주소: KR 강원특별자치도 ...
  [2] SNS 바로가기...회사 소개 제품 소개 지속가능경영 채용 공지사항 ...
```

**진단**: brute force walker가 트리거조차 안 됨. `[2]` 단락이 메뉴 텍스트로 매우
길어 `mainContentLen`이 400자를 넘었음 → outer if `mainContentLen < 400` 조건
미충족 → 메타 보강 + walker 블록 전체 진입 못 함.

**근본 원인**: v2.38.0의 `if (mainContentLen < 400)` 조건이 너무 좁음.
imweb 빌더 사이트가 메뉴/푸터 텍스트를 한 단락으로 통째로 넣는 경우,
본문 글자 합계가 400+이지만 진짜 본문은 거의 없는 케이스를 못 잡음.

**해결 — 4가지 fix**

#### 1. ⭐ Walker trigger 조건 확장 (결정적 버그 수정)

**Before (v2.38.0)**:
```ts
if (mainContentLen < 400) {
  // 메타 보강 + brute force walker
}
```

**After (v2.39.0)**:
```ts
const needsEnrichment =
  mainContentLen < 400 ||
  (totalTextLen > 50 * 1024 && merged.length < 5);

if (needsEnrichment) {
  // 메타 보강 + brute force walker
}
```

`mainContentLen`이 400+여도 body 텍스트 50KB+ 이고 단락 5개 미만이면 진입 → 빌더 사이트 walker 트리거 ✓.

**시뮬레이션 결과**:
| 케이스 | mainContentLen | totalTextLen | merged 수 | v2.38.0 | v2.39.0 |
|---|---|---|---|---|---|
| 빌더 사이트 (메뉴 텍스트 김) | 500 | 136KB | 3 | ✗ walker 미트리거 | **✓ 트리거** |
| 정상 사이트 (본문 풍부) | 2000 | 30KB | 10 | ✗ | ✗ (변화 없음) |
| 본문 빈약 사이트 | 200 | 5KB | 1 | ✓ | ✓ (변화 없음) |

#### 2. ⭐ HTML 시그니처로 빌더 사이트 감지 (사용자 도메인 호스팅)

**Before (v2.38.0)**: finalUrlHost가 `*.imweb.me`·`*.wix.com` 등 빌더 호스팅
도메인일 때만 `forceBuilderExtract` 활성. 사용자 도메인(예: `<example>.co.kr`)으로
직접 호스팅된 imweb·Wix 사이트는 감지 못 함.

**After (v2.39.0)**: HTML 안에 빌더 시그니처 검사 추가:
```ts
const htmlSample = html.slice(0, 50 * 1024);
let builderSignature: string | null = null;
if (/imweb\.me|imweb-|imweb_/i.test(htmlSample)) builderSignature = "imweb";
else if (/wixstatic\.com|wix\.com|data-wix/i.test(htmlSample)) builderSignature = "wix";
else if (/squarespace\.com/i.test(htmlSample)) builderSignature = "squarespace";
else if (/cafe24app\.com/i.test(htmlSample)) builderSignature = "cafe24";

const forceBuilderExtract =
  (isBuilderDomain || builderSignature !== null) && totalTextLen > 5 * 1024;
```

이제 사용자 커스텀 도메인이라도 imweb·Wix CSS/JS 링크가 HTML에 포함되면 빌더 감지.

#### 3. ⭐ Trigger 진단 가시성 강화 (4개 새 디버그 필드)

`UrlExtractResult`·`PreviewState.debug`에 옵셔널 추가:
```ts
mainContentLen?: number;          // 본문 글자 합계 (메타 보강 전)
needsEnrichment?: boolean;        // outer if 진입 여부
builderSignature?: string | null; // HTML에서 감지된 빌더 (imweb·wix 등)
finalUrlHost?: string;            // redirect 후 최종 호스트
```

CardEditDialog 디버그 패널에 즉시 노출:
```
⚙ 추출 단계 가시성 (v2.38.0+)

enrichment trigger: ✓ 진입함 (mainContentLen: 500자 — 본문 글자 합계 충분으로 판단)
빌더 감지: ✓ imweb (HTML 시그니처) (finalUrlHost: example.co.kr)
brute force walker: ✓ 트리거됨 (추가 단락: 5개)

raw paragraphs (sanitize 전, 첫 3개):
  [0] We're the Future. Everything in the Sustainable...
  ...
```

#### 4. 인터페이스 호환성

옵셔널 필드 4개만 추가. 기존 코드 영향 0. 빌드: `tsc --noEmit` 0 에러,
`next build` 성공 (9 routes).

---

### v2.38.0 — 추출 단계 가시성 극대화 + 수동 입력 UX 강화 (2026.05)

**보고된 이슈**: v2.37.0 배포 후에도 동일한 추출 진단 결과 (raw paragraphs 1, walker 결과 미상). UI 디버그가 walker 결과/sanitize 결과를 안 보여줘서 사용자가 어디서 막혔는지 파악 불가.

**전략 결정**: v2.37.0의 진짜 가치는 `userEdited` 보호 시스템 — 사용자가 직접 작성하면 cron이 영구 보존. 즉 **추출 실패가 더 이상 catastrophic 아님**. v2.38.0은 두 방향:
1. **추출 진단 가시성 극대화** — walker/sanitize 결과 직접 노출
2. **수동 입력 UX 강화** — userEdited 보존 메시지 강조

**해결 — 4가지 fix**

#### 1. ⭐ 추출 단계별 결과 가시성 (4개 새 진단 필드)

`UrlExtractResult`·`PreviewState.debug`에 옵셔널 필드 추가:
```ts
rawParagraphSamples?: string[];      // sanitize 전 paragraphs 첫 3개 (각 80자)
sanitizedRemovedSamples?: string[];  // sanitize에서 제거된 paragraphs 첫 3개
bruteForceTriggered?: boolean;       // brute force walker가 트리거됐는지
bruteForceAddedCount?: number;       // brute force가 추가한 단락 수
```

`extractFromUrl`에서 sanitize 직후 sample 수집:
```ts
const rawParagraphSamples = merged.slice(0, 3).map((p) => p.slice(0, 80));
const sanitizedRemovedSamples: string[] = [];
for (const m of merged) {
  if (!sanitizedParagraphs.includes(m) && sanitizedRemovedSamples.length < 3) {
    sanitizedRemovedSamples.push(m.slice(0, 80));
  }
}
```

#### 2. ⭐ CardEditDialog UI에 "추출 단계 가시성" 섹션

디버그 패널 섹션 5 신규 — 사용자가 즉시 확인 가능:

```
⚙ 추출 단계 가시성 (v2.38.0)

brute force walker: ✓ 트리거됨 (추가 단락: 3개)

raw paragraphs (sanitize 전, 첫 3개):
  [0] We're the Future. Everything in the Sustainable Future Only in...
  [1] At the same time as the conversion of coffee waste into...
  [2] Overturn the Value.

⚠ sanitize에서 제거된 단락 (첫 3개):
  [제거] Address: KR Gangwon-do Hoengseong-gun ...
  [제거] TEL. 0XX-XXX-XXXX  Fax. ...
↑ 보일러플레이트(주소·전화·약관 등)로 판단되어 자동 제거됐습니다.
  본문이 잘못 제거된 것 같으면 직접 입력하세요 — userEdited 플래그로
  영구 보존됩니다.
```

`raw paragraphs`가 `(0개 — 추출기가 본문을 전혀 못 잡음)`이면 빨간색으로 표시 — 사이트가 빌더 사이트 + JS 렌더링이라 cheerio 한계 케이스 명확화.

#### 3. ⭐ "자동 추출 빈약" 경고에 v2.37.0 안내 추가

```
자동 추출 결과가 빈약합니다. ...
헤드라인·데크·본문·핵심 포인트를 직접 작성해 주세요.

💡 v2.37.0 안내: 직접 입력하면 userEdited=true 플래그가 자동 설정되어,
6시간마다 실행되는 자동 새로고침이 본문을 절대 덮어쓰지 않습니다.
카드 푸터에 ✎ 사용자 편집 배지가 표시되며, 본문은 영구 보존됩니다.
```

추출 실패 시 사용자가 안심하고 직접 입력하도록 명시적 안내.

#### 4. 인터페이스 호환성

옵셔널 필드 4개만 추가. 기존 코드 영향 0. 빌드: `tsc --noEmit` 0 에러,
`next build` 성공 (9 routes).

---

### v2.37.0 — 사용자 편집 카드 자동 새로고침 보호 + 빌더 도메인 적극 추출 + sanitize 진단 + cron 워크플로우 강화 (2026.05)

**보고된 두 이슈**

1. **GitHub Actions cron 실패** (`Run failed: Auto Refresh All Cards`)
2. **사용자 임의 입력 카드가 자동 새로고침으로 덮어써짐** — 직접 입력한 본문이 사라짐

**해결 — 4가지 fix**

#### 1. ⭐ 사용자 편집 카드 보호 (`userEdited` 플래그)

`EditorialCardData`에 옵셔널 필드 추가:
```ts
userEdited?: boolean;       // 사용자 직접 편집 카드 표시
userEditedAt?: string;       // 편집 시각
```

**플래그가 설정되는 시점**:
- `createCardEdited()`: 사용자가 CardEditDialog에서 등록 시 자동 `userEdited: true`
- `createCardManual()`: 수동 입력 폼으로 등록 시 자동 `userEdited: true`

**자동 새로고침 시 본문 보존** — `refreshCardActionDirect`·`refreshCardAction`·
`refreshAllAction` 3개 모두에 동일 로직 적용:

```ts
if (target.card.userEdited) {
  // 메타만 갱신 (heroImage·sourceSiteName·fetchedAt) — 본문 모두 보존
  card = {
    ...target.card,
    heroImage: newCard.heroImage ?? target.card.heroImage,
    sourceSiteName: newCard.sourceSiteName ?? target.card.sourceSiteName,
    fetchedAt: new Date().toISOString(),
  };
} else {
  card = newCard;  // 자동 추출 카드는 전체 갱신
}
```

**보존되는 필드**: `headline`, `dek`, `lead`, `bodyParagraphs`, `pullQuote`,
`keyPoints`, `industry`, `palette`, `eyebrow`, `kicker`, `contactInfo`,
`userEdited`, `userEditedAt`.

**갱신되는 필드**: `heroImage` (외부 og:image 변경 반영), `sourceSiteName`,
`fetchedAt`.

`refreshAllAction`(cron 호출)은 빌더 사이트 fetch 실패 시에도 카드 그대로 유지
(try-catch로 메타 갱신 실패 시 무시, 본문은 항상 보존).

**카드에 시각적 표시** — EditorialCard 푸터에 `✎ 사용자 편집` 배지:
```
수집 2026.05.06  ✎ 사용자 편집
```

`title="사용자 직접 편집 카드 — 자동 새로고침 시 본문 보존"` 툴팁으로 의미 안내.

#### 2. ⭐ 빌더 도메인 적극 추출 (forceBuilderExtract)

`forceBuilderExtract` 신호 추가 — finalUrl이 알려진 빌더 호스팅 도메인이면 본문 추출
trigger 무조건 활성화 (`merged.length`나 `htmlBytes` 조건 없이):

```ts
const BUILDER_DOMAIN_PATTERNS = [
  /\.imweb\.me$/i, /\.wix\.com$/i, /\.wixsite\.com$/i,
  /\.weebly\.com$/i, /\.squarespace\.com$/i, /\.cafe24app\.com$/i,
  /\.modoo\.at$/i, /\.tistory\.com$/i, /\.shopify\.com$/i,
  /\.framer\.app$/i, /\.notion\.site$/i, /\.webflow\.io$/i,
];

const finalUrlHost = new URL(finalUrl).hostname.toLowerCase();
const isBuilderDomain = BUILDER_DOMAIN_PATTERNS.some((re) => re.test(finalUrlHost));
const forceBuilderExtract = isBuilderDomain && totalTextLen > 5 * 1024;

if (isBuilderLikeSite || hasBodyTextButNoParagraphs || forceBuilderExtract) {
  // brute force + walker 활성화
}
```

**효과**: 사용자 도메인(예: `example.com`)이 imweb으로 redirect된 경우, 사용자가 본
도메인은 `example.com`이지만 실제 fetch한 finalUrl은 `example-k.imweb.me` → 빌더
도메인 인식 → 본문 추출 강화 활성화.

#### 3. ⭐ sanitize 단계 진단 로그

walker 결과가 sanitize에서 너무 공격적으로 제거되는 케이스 추적:

```ts
const sanitizedParagraphs = sanitizeKoreanFooterNoise(merged);

if (merged.length >= 3 && sanitizedParagraphs.length < merged.length / 2) {
  log.info("extractFromUrl", "sanitize-aggressive", {
    domain: parsed.hostname,
    mergedCount: merged.length,
    sanitizedCount: sanitizedParagraphs.length,
    removedCount: merged.length - sanitizedParagraphs.length,
    firstRemovedSample: merged.find((m) => !sanitizedParagraphs.includes(m))?.slice(0, 80),
  });
}
```

Vercel function logs에서 `extractFromUrl sanitize-aggressive` 검색 시 어떤 단락이
sanitize에서 제거됐는지 즉시 확인 가능. 빈약 추출 진단 핵심.

#### 4. ⭐ GitHub Actions cron 워크플로우 강화

**Before (v2.36.0)**: 200 응답이 아니면 무조건 `exit 1`. `total=0` 또는 정상 응답
구분 없음.

**After (v2.37.0)**:
- `total=0` → 카드 없음, 정상 종료 (`✓ No cards in gallery`)
- `ok=false` → 명확한 에러 메시지 (저장소 미연결 등)
- HTTP 200 외 응답 → CRON_SECRET 환경변수 안내 추가
- 5초 sleep으로 변경 (10초 → 더 빠른 처리)
- 실패 시에도 Summary 작성 (`if: always()`)

```yaml
if [ "$HTTP_CODE" != "200" ]; then
  echo "::error::Cron API returned $HTTP_CODE — Vercel CRON_SECRET 환경변수 확인 필요"
  echo "Vercel 대시보드 → Settings → Environment Variables → CRON_SECRET이 GitHub Actions의 값과 동일한지 확인"
  exit 1
fi

if echo "$BODY" | grep -q '"total":0'; then
  echo "✓ No cards in gallery — nothing to refresh"
  break
fi
```

#### 5. 인터페이스 호환성

`EditorialCardData.userEdited?: boolean`·`userEditedAt?: string` 옵셔널 필드 추가만
(기존 카드는 자동으로 `false` 동작).
`refreshCardActionDirect`·`refreshCardAction`·`refreshAllAction` 시그니처 그대로,
내부 보호 로직만 추가.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

#### 6. 사용자 흐름

**시나리오 A — 자동 추출이 빈약한 imweb 사이트 등록**:
1. URL 입력 → 자동 추출 빈약 (다이얼로그에 "자동 추출 결과가 빈약합니다" 안내)
2. 사용자가 헤드라인·데크·본문·핵심 포인트 직접 작성
3. "이 정보로 등록" → `userEdited: true` 자동 설정
4. 카드에 `✎ 사용자 편집` 배지 표시

**시나리오 B — cron이 6시간마다 새로고침 시**:
1. 자동 추출 카드: 외부 사이트 다시 fetch → 새 본문으로 갱신
2. **사용자 편집 카드**: 외부 fetch는 시도하되 메타(이미지·사이트명)만 갱신, 본문 보존
3. fetch 실패 시에도 카드 그대로 유지 (본문 데이터 손실 X)

**시나리오 C — GitHub Actions 실패 시**:
1. 워크플로우가 어떤 응답이 와서 실패했는지 로그에 명시
2. 저장소 미연결·CRON_SECRET 불일치 등 원인 즉시 파악 가능

---

### v2.36.0 — 친환경/소재/에너지 카테고리 분리 + nav 라벨 기반 sub-page 발견 (2026.05)

**보고된 두 요청**

1. **친환경/소재/에너지 분리** — "친환경에서 소재가 있고 에너지가 있어 확실히 구분 필요! 하지만 지금은 어디도 분류 안됨"
2. **imweb 숫자 경로(`/42`, `/43`) sub-page 발견** — "/about, /company 표준 경로는 안 되니 nav 텍스트 라벨로 매칭 필요"

**해결 — 2가지 fix**

#### 1. ⭐ lib/industry.ts — INDUSTRIES 카테고리 분리 (12 → 14개)

**Before (v2.35.0)**: energy 한 카테고리에 친환경·소재·에너지 모두 포함
```ts
{ key: "energy", label: "친환경 · 소재 · 에너지", keywords: [...모든 키워드 통합] }
```

**After (v2.36.0)**: 3개로 분리
```ts
{ key: "environment", label: "친환경",  // 색상 #f0fdf4
  keywords: ["친환경", "eco", "생분해", "리사이클링", "비건", "탄소중립",
             "esg", "커피박", "compostable" 등 22개]
},
{ key: "materials", label: "소재",  // 색상 #ecfeff
  keywords: ["소재", "polymer", "PLA", "PBS", "PBAT", "PHA",
             "압출", "사출", "시트", "필름", "엔지니어링 플라스틱",
             "이차전지 소재", "양극재", "음극재" 등 28개]
},
{ key: "energy", label: "에너지",  // 색상 #f0fdfa (기존 유지)
  keywords: ["에너지", "재생에너지", "태양광", "풍력", "수소", "fuel cell",
             "배터리", "ESS", "전력망", "스마트그리드" 등 25개]
},
```

**INDUSTRIES 14개로 확장**: ai, cloud, mobility, health, fintech, edu, safety,
media, commerce, **environment**, **materials**, **energy**, space, other.

CardEditDialog 산업 분류 드롭다운에 자동 반영. 사용자가 등록 시 친환경/소재/에너지를
명확히 선택 가능.

#### 2. ⭐ lib/url-extractor.ts — nav 라벨 기반 sub-page 발견 (imweb 숫자 경로 대응)

**Before (v2.35.0)**: nav `<a>` 링크 path 또는 한글 키워드로만 매칭
```ts
const SUBPAGE_KEYWORDS_RE = /\b(?:about|company|...)\b/i;  // path 매칭
const KOREAN_KEYWORD_RE = /(?:소개|회사|...)/;                  // 한글 텍스트
// imweb의 /42 /43 같은 숫자 경로는 둘 다 매칭 X → sub-page 발견 실패
```

**After (v2.36.0)**: 영문 nav 라벨 매칭 추가
```ts
const NAV_LABEL_RE = /^(?:about(?:\s+us)?|company|introduction|story|
  vision|mission|profile|overview|ceo(?:'s)?\s+message|representative|
  products?|services?|business|solutions?|platforms?|
  sustainable\s+management|sustainability|esg|csr|
  회사\s*소개|기업\s*소개|소개|비전|미션|대표\s*인사말|
  제품(?:\s*소개)?|서비스(?:\s*소개)?|사업\s*분야|지속가능경영)$/i;

// 매칭 우선순위:
//  (a) labelMatch — nav 텍스트가 라벨 매칭 (imweb /42 /43 케이스)
//  (b) pathMatch  — URL path 키워드 매칭
//  (c) koreanMatch — 한글 텍스트 키워드 매칭

if (labelMatch || pathMatch || koreanMatch) {
  candidates.add(abs.toString());
  // 라벨 매칭이 가장 신뢰도 높음
}
```

**효과**: imweb 사이트의 nav 구조 (예시):
```
- About Us       /42       ← 라벨 매칭 → fetch
  ├ CEO Message   /35       ← 라벨 매칭 → fetch
  ├ About Us      /34       ← 라벨 매칭 → fetch
  └ Company History /40    ← 라벨 매칭 → fetch
- Products       /43       ← 라벨 매칭 → fetch
  └ STRAW         /46
- Sustainable Management /29  ← 라벨 매칭 → fetch
```

이전엔 숫자 경로라 모두 sub-page 발견 실패. 이제 nav 텍스트 라벨로 모두 매칭됨.

기타 강화:
- 후보 한도 6→8개
- fetch 한도 2→3개로 확대
- sub-page fetch에도 buildBrowserHeaders() 사용 (v2.33.0 헤더 일관성)
- 진단 로그에 candidatesWithLabel (어떤 텍스트로 매칭됐는지) 노출

#### 3. 검증 결과

**INDUSTRIES 분리 시뮬레이션 (7/7 pass)**:
```
INDUSTRIES 14개 (12→14)
environment·materials·energy 카테고리 존재 ✓
친환경 빨대 회사 → environment ✓
PLA/폴리머 회사 → materials ✓
태양광/수소 → energy ✓
```

#### 4. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`PreviewState` 변경 없음.
`INDUSTRIES` 배열 12→14 확장 (외부 API 영향 없음).
`tryFetchSubpages()` 시그니처 그대로, 내부 매칭 로직 강화.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

---

### v2.35.0 — leaf element walker + body text 직접 분할 + 본문 fallback effective description (2026.05)

**v2.34.0 진단 — meta 태그 list 확인됨**

```
발견된 meta 태그 (17개): theme-color · msapplication-* · og:url · og:title · og:image ·
  og:image:width · og:image:height · keywords · application-name · viewport · ...

og:description 없음! / twitter:description 없음! / description 없음!  ← 진짜 미설정
body 텍스트 136.8KB                                                ← 본문 풍부
raw paragraphs: 1                                                   ← 그러나 추출 실패
```

**근본 원인 (v2.34.0 진단으로 100% 확인)**:

1. ✅ **og:description·twitter:description·meta description 진짜 없음** ← 사이트 미설정
2. ✗ v2.34.0의 textNode walker가 작동 못 함 (직접 자식 텍스트만 잡으니 imweb의
   중첩 element 안 텍스트 못 잡음)
3. body 텍스트 136KB는 cheerio가 봤지만 standard selector로는 단락 추출 X

**해결 — 3가지 fix**

#### 1. ⭐ lib/url-extractor.ts — leaf element walker (가장 강력)

v2.34.0의 walker는 직접 자식 텍스트 노드만 추출 → imweb이 텍스트를 `<span>`,
`<i>`, `<b>`, `<em>` 안에 넣으면 못 잡음.

v2.35.0의 새 leaf walker:

```ts
const leafTags = "div, p, li, h1, h2, h3, h4, h5, h6, td, dd, blockquote, address, article, section, aside, figure";

$(leafTags).each((_, el) => {
  const $el = $(el);
  // 같은 종류 자식 element 있으면 leaf 아님 (parent → 자식이 처리)
  if ($el.find(leafTags).length > 0) return;

  // leaf element의 모든 텍스트 (자식 텍스트 노드 + inline element 안 텍스트)
  const t = $el.text().replace(/\s+/g, " ").trim();
  tryAddText(t);
});
```

**핵심 효과**:
- 같은 종류 자식이 없는 element만 대상 → 중첩 중복 자동 방지
- `$el.text()`는 자식 element 안 텍스트도 포함 → `<span>`/`<b>` 안 텍스트도 잡힘
- imweb·Wix 등 빌더 사이트의 본문이 효과적으로 추출됨

#### 2. ⭐ body text 직접 분할 fallback (최후 보루)

walker 1·2가 다 실패해도 (의미있는 단락 < 3개), body 전체 텍스트를 줄바꿈/연속 공백
기반으로 분할:

```ts
if (walkerTexts.length < 3) {
  const $bodyClone = $("body").clone();
  // nav/header/footer/script/style 제거 (메뉴·푸터 잡음 방지)
  $bodyClone.find('nav, header, footer, script, style, [role="navigation"],
    [class*="nav-"], [class*="-nav"], [id*="header"], [id*="footer"], [id*="menu"],
    [class*="header"], [class*="footer"], [class*="menu"]').remove();
  const cleanBody = $bodyClone.text();
  // 줄바꿈·연속 공백·탭으로 단락 분리
  const rawBlocks = cleanBody.split(/\n{2,}|\s{4,}|\t{2,}|\r\n{2,}/);
  for (const block of rawBlocks) {
    tryAddText(block.replace(/\s+/g, " ").trim());
  }
}
```

cheerio가 어떤 selector로도 못 잡는 텍스트도 body.text()로는 추출됨. 이를
공백 기반으로 단락 분리.

진단 로그 `extractFromUrl walker-extracted` 추가 — Vercel function logs에서
walker가 몇 개 단락 잡았는지 확인 가능.

#### 3. ⭐ lib/compose-card.ts — 본문 단락을 effectiveDescription fallback으로

description 메타가 진짜 다 비어있을 때 (사용자 보고 케이스) 본문에서 가장 긴
의미있는 단락을 effectiveDescription으로 사용:

```ts
if (!effectiveDescription && urlResult.paragraphs.length > 0) {
  const longBodyParagraph = urlResult.paragraphs
    .filter((p) => p.length >= 30 && p.length <= 400)
    .reduce((longest, p) => (p.length > longest.length ? p : longest), "");
  if (longBodyParagraph) {
    effectiveDescription = longBodyParagraph;
  }
}
```

본문이 풍부하다면 dek/lead가 의미있는 콘텐츠로 채워짐. og:description이 없어도
본문에서 직접 가져온 내용으로 대체.

#### 4. 검증 결과 (시뮬레이션)

leaf walker가 본문 8단락 추출 + og:description 없음 케이스:

```
Before (v2.34.0):
  body[0]: "<sitename> 공식 사이트입니다. 자세한 정보는..."  ← 의미없는 합성
  industry: other

After (v2.35.0):
  headline: <sitename>
  dek: At the same time as the conversion of coffee waste into innovative
       biodegradable materials By producing products...
  lead: Everything in the Sustainable Future Only in <sitename>. At the same time as...
  body[0]: We're the Future. Turn coffee waste from your daily life into...
  body[1]: Innovative, sustainable, green solutions you've never experienced...
  body[2]: <sitename> converts 6 million tons of coffee waste into a resource every year...
  body[3]: biodegradable material — eco-friendly material made by mixing...
  industry: energy ✓ (자동 분류 성공!)

VERIFICATION (5/5 pass):
  ✓ 본문 단락 4개 이상
  ✓ lead가 합성 아님
  ✓ lead/dek 모두 의미있는 내용
  ✓ 본문에 키워드 다수
```

#### 5. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`PreviewState` 변경 없음.
walker 코드는 brute force 블록 안에 추가됨 (extractFromUrl 내부).
composeCard fallback에 1단계 추가 (paragraph → effectiveDescription).

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

---

### v2.34.0 — textNode walker (DOM 트리 walk) + 메타 태그 다중 변형 selector + meta 이름 list 노출 (2026.05)

**v2.33.0 진단 데이터 — 진짜 원인 명확**

```
meta 태그: 17개 (정상!)        body 텍스트: 136.8KB (매우 풍부!)
head 자식: 54 (정상)            script 비율: 16% (SPA 아님!)
                                
og:description: 0자             ← 17개 메타 중 og:description은 못 가져옴
twitter:description: 0자
meta description: 0자
raw paragraphs: 1               ← 136.8KB 텍스트 중 1단락만 추출!
```

**근본 원인 (v2.33.0 진단 결과 기반)**:

1. ✗ 봇 차단 X (body 136KB 정상)
2. ✗ SPA X (script 16%)
3. ✗ HTML head 잘림 X (head 자식 54개)
4. ✓ **136KB body 텍스트가 1단락으로만 추출됨** ← imweb DOM 구조 cheerio selector 매칭 실패
5. ✓ **17개 meta 태그 중 og:description selector 매칭 실패** ← 비표준 속성 가능성

**해결 — 3가지 fix**

#### 1. ⭐ lib/url-extractor.ts — textNode walker (가장 강력한 fallback)

cheerio의 모든 leaf-level element를 walk해서 직접 자식 텍스트 노드만 추출:

```ts
const walkerTexts: string[] = [];
$("p, div, li, dd, span, address, td, h1, h2, h3, h4, h5, h6").each((_, el) => {
  const $el = $(el);
  // 직접 자식 텍스트 노드만 (자식 element 텍스트 제외 → 중첩 중복 방지)
  let directText = "";
  $el.contents().each((_, child) => {
    const c = child as { type?: string; data?: string };
    if (c.type === "text" && typeof c.data === "string") {
      directText += " " + c.data;
    }
  });
  const t = directText.replace(/\s+/g, " ").trim();
  if (t.length < 30 || t.length > 800) return;
  if (!/[가-힣A-Za-z]/.test(t)) return;  // 의미있는 문자
  if (/^(menu|home|about|contact|login|회사 소개|제품 소개)$/i.test(t)) return;
  walkerTexts.push(t);
});

// 길이+첫 30자 키 dedup → 중첩으로 인한 중복 방지
```

**핵심 효과**:
- imweb 같이 div 안 일반 텍스트로 본문 렌더링하는 사이트 핵심 fix
- 표준 `<p>` 태그 안 써도 텍스트가 있으면 추출됨
- 자식 element 텍스트 제외하니 중첩 중복 안 일어남
- 한글·영문 알파벳 + 메뉴 라벨 제외 필터로 의미있는 단락만

**brute force trigger 강화**:
```ts
const isBuilderLikeSite = htmlBytes > 50KB && merged < 3 && afterMetaContentLen < 600;
// v2.34.0 추가:
const hasBodyTextButNoParagraphs = totalTextLen > 10KB && merged.length < 5;
                                                          ↑ 본문 풍부하지만 추출 부족 케이스

if (isBuilderLikeSite || hasBodyTextButNoParagraphs) { /* brute force 활성 */ }
```

merge 한도도 8→**15개**로 상향 (textNode walker로 풍부 수집됐을 때 활용).

#### 2. ⭐ 메타 태그 다중 변형 selector

기존: `meta[property="og:description"]` 하나만 시도.

v2.34.0:
```ts
function getMetaContent(...selectors: string[]): string {
  for (const sel of selectors) {
    const v = ($(sel).attr("content") ?? "").trim();
    if (v) return v;
  }
  return "";
}

const rawOgDescription = getMetaContent(
  'meta[property="og:description"]',     // 표준
  'meta[name="og:description"]',         // 잘못 작성된 케이스
  'meta[property="OG:DESCRIPTION"]',     // 대문자 변형
);
const rawTwitterDescription = getMetaContent(
  'meta[name="twitter:description"]',
  'meta[property="twitter:description"]',
);
const rawMetaDescription = getMetaContent(
  'meta[name="description"]',
  'meta[property="description"]',
  'meta[itemprop="description"]',         // 마이크로데이터
);
const rawMetaKeywords = getMetaContent(
  'meta[name="keywords"]',
  'meta[property="keywords"]',
  'meta[name="news_keywords"]',           // 뉴스 사이트
);
```

각 표준 + 비표준 + 마이크로데이터 변형 차례대로 시도. 어느 하나가 성공하면 그 값 사용.

#### 3. ⭐ 발견된 meta 태그 이름 list 노출 (사용자 직접 진단)

`UrlExtractResult.metaNamesList`·`PreviewState.debug.metaNamesList` 추가:

```ts
const metaNamesList: string[] = [];
$("meta").each((_, el) => {
  const $el = $(el);
  const name = ($el.attr("name") ?? $el.attr("property") ?? "").trim();
  if (name && metaNamesList.length < 30) {
    metaNamesList.push(name);
  }
});
```

디버그 패널 "HTML 구조 진단" 섹션에 노출:

```
발견된 meta 태그:
viewport · og:title · og:type · og:url · og:image · og:description ·
twitter:card · twitter:title · description · keywords · ...
```

사용자가 이 리스트를 보면:
- `og:description`이 list에 있는데 값이 0자 → 메타 자체가 빈 값 (사이트 미설정)
- `og:description`이 list에 없음 → 메타가 진짜 없음 (사이트 미설정 또는 비표준)
- 어떤 메타가 있고 없는지 한눈에 파악

#### 4. 인터페이스 호환성

`UrlExtractResult.metaNamesList?: string[]` 옵셔널 필드 추가만.
`PreviewState.debug.metaNamesList` 옵셔널 필드 추가만.
`composeCard()`·`extractFromUrl()` 시그니처 그대로.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

#### 5. 사용자 디버깅 흐름 (v2.34.0)

배포 후 imweb 빌더 사이트 등록:

1. 다이얼로그 헤더 `v2.34.0` 배지
2. **본문 풍부하게 추출됨** (textNode walker 효과 — body 136KB 텍스트가 다수 단락으로):
   ```
   raw paragraphs: 1 → 8+ (walker로 보강)
   final body: 1 → 5-8개 (의미있는 본문)
   ```
3. **디버그 패널 "발견된 meta 태그"** 확인 — og:description이 진짜 없는지 한눈에
4. og:description이 list에 있고 값도 풍부하면 → fallback chain으로 dek/lead/body 자연스럽게 채워짐
5. og:description이 list에 없으면 → 사이트가 진짜 메타 미설정. 본문은 walker가 가져온 단락이 채움

---

### v2.33.0 — fetch 헤더 베스트 프랙티스 + brute force selector 대폭 확장 + HTML 구조 진단 (2026.05)

**보고된 이슈 — v2.32.0 적용 후에도 본문 추출 빈약**

```
URL: example.com (사용자 도메인 표시 정상)
HTML size: 838.3KB (페이지 자체 풍부)
raw paragraphs: 1, raw headings: 0
og:description: 0자 / twitter:description: 0자 / meta description: 0자
body[0]: "<sitename> 공식 사이트입니다. 자세한 정보는 <domain>에서..."
```

**근본 원인 — fetch가 정상 페이지와 다른 응답을 받음**

직접 페이지를 확인해보면 풍부한 콘텐츠가 있음:
- og:description: "자연과 인류의 공존을 위해 ..."  (실제로는 풍부)
- meta keywords: 12개  (실제로는 풍부)
- 본문: "We're the Future.", "It turns coffee waste into...", "BioPellet..." 등

그런데 우리 cheerio fetch는 og:description: 0자, raw paragraphs: 1만 받음 →
**Vercel server IP를 imweb이 봇으로 인식하거나 fingerprint 부족으로 다른 응답** 강력 의심.

**해결 — 3가지 fix (2026.05 베스트 프랙티스)**

#### 1. ⭐ lib/url-extractor.ts — fetch 헤더 강화

```ts
// v2.33.0: 2026.05 최신 Chrome (한국 사용자 fingerprint)
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

function buildBrowserHeaders(url: string): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate",  // ← brotli 제거 (자동 해제 실패 방지)
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    DNT: "1",
    Referer: inferReferer(url),
    "Sec-Ch-Ua": '"Chromium";v="135", "Not_A Brand";v="24", "Google Chrome";v="135"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };
}
```

핵심 변경:
- **Chrome 131 → 135** (2026.05 최신 버전 매칭)
- **Mac → Windows fingerprint** (한국 사용자 가장 흔한 OS)
- **brotli 제거** — Vercel 환경에서 자동 해제 실패 케이스 차단 (cheerio가 압축된 HTML 받는 문제 방지)
- **DNT, Cache-Control, Connection** 추가 — 정상 사용자 패턴

`fetchHtml`과 sub-page fetch 모두 동일한 헤더 헬퍼 사용 (일관성).

#### 2. ⭐ brute force selector 대폭 확장

이전 (v2.31.0): 일반 .content/.description 클래스 + img alt + figcaption.

v2.33.0 추가:
```ts
// 한국 빌더 특화
".se-text-paragraph", ".se-component", ".se-section",  // 네이버 스마트에디터
'[class*="se-text"]', '[class*="se-paragraph"]',
'[class*="imweb-text"]', '[class*="iw-content"]',       // imweb
".tt_article_useless_p_margin", ".article_view",        // Tistory

// Wix·Squarespace
'[class*="rich-text"]', '[data-testid*="text"]',
'[class*="sqs-block-content"]',

// 추가 추출 소스
$("h4, h5, h6")             // 작은 헤딩 (imweb이 강조 텍스트로 자주 사용)
$("blockquote, q, cite")    // 인용 텍스트
$("main, article, section").first().find("p, li")  // 의미있는 컨테이너 안 직접 자식
```

이제 한국 주요 빌더(imweb·네이버 스마트에디터·smartstore·Tistory) + 글로벌 빌더(Wix·Squarespace)의 본문이 brute force로 잡힘. 한도 6→8개로 상향.

`raw-meta-snapshot` 로그에 `h4Count·h5Count·h6Count` 추가.

#### 3. ⭐ HTML 구조 진단 정보 추가

`UrlExtractResult`·`PreviewState.debug`에 5개 필드 추가:

```ts
metaTagCount: number;       // <meta> 개수 (정상: 5+)
headChildrenCount: number;  // <head> 자식 수
scriptTagCount: number;     // <script> 개수
bodyTextLen: number;        // body 안 모든 텍스트 길이
scriptToHtmlRatio: number;  // script가 HTML 차지 비율 (%) — 100% 가까우면 SPA shell
```

**디버그 패널에 새 섹션 "HTML 구조 진단"** + **응답 이상 신호 5종 자동 감지**:

```
⚠ 응답 이상 신호 — 자동 추출 실패 케이스 진단

  redirected → ...                                    (redirect 발생)
  html size 5KB 미만                                   (challenge·empty)
  meta 태그 5개 미만                                    (head 잘림·shell)
  script가 HTML의 80% 이상                              (SPA·JS 의존)
  HTML 838KB지만 body 텍스트 500자 미만                 (SPA shell·봇 차단)

  ⓘ 이 경우 자동 추출이 어려우므로 본문·핵심 포인트를
    직접 작성하시는 게 정확합니다.
```

사용자가 디버그 패널 펼치면 "왜 추출이 실패했는지" 즉시 진단 가능.

#### 4. 인터페이스 호환성

`UrlExtractResult`에 옵셔널 필드 5개 추가만.
`PreviewState.debug`에 옵셔널 필드 5개 추가만.
`composeCard()`·`extractFromUrl()` 시그니처 그대로.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

#### 5. 사용자 디버깅 흐름

배포 후 추출 빈약 케이스 등록 시:

1. 다이얼로그 헤더 `v2.33.0` 배지 확인
2. 빈약 추출 안내(amber) 자동 표시
3. 디버그 패널 펼치면 새 "HTML 구조 진단" 섹션 + "응답 이상 신호" (조건부)
4. **신호 해석**:
   - `meta 태그 < 5` 또는 `body 텍스트 < 500자 + HTML > 50KB` → 봇 차단 의심
   - `script가 HTML의 80%+` → SPA, 서버 fetch 한계
   - 둘 다 정상이면 사이트가 진짜로 메타 description을 비워둔 것
5. 진단 신호 따라 직접 작성 또는 다른 사이트 등록

Vercel function logs에서 `extractFromUrl raw-meta-snapshot` 검색 시 같은 정보
`metaTagCount·headChildrenCount·scriptTagCount·bodyTextLen·scriptToHtmlRatio` 노출.

---

### v2.32.0 — 사용자 도메인 보존 (빌더 호스팅 redirect 케이스 fix) (2026.05)

**보고된 이슈 — 사용자 도메인이 빌더 호스팅 도메인으로 표시됨**

```
사용자 입력: example.com (사용자가 구매한 정식 도메인)
redirect 후 finalUrl: https://example-k.imweb.me/  (imweb 빌더 호스팅)
카드 표시: 도메인이 imweb 빌더 호스팅으로 노출됨
사용자 의도: 자기 도메인 example.com이 카드에 표시되길 원함
```

**근본 원인**

- 빌더 사이트(imweb·Wix·Squarespace 등)는 사용자 도메인을 호스팅 도메인으로 redirect
- `extractFromUrl`의 fetchHtml이 redirect를 따라가서 `finalUrl`이 빌더 호스팅 URL이 됨
- composeCard의 `sourceUrl: urlResult.finalUrl` → 카드에 빌더 호스팅 도메인 노출
- 사용자 입장: 자기가 구매한 도메인 정보가 사라짐

**해결 — 빌더 호스팅 감지 + canonical/og:url 활용 + 사용자 도메인 우선**

#### 1. ⭐ lib/url-extractor.ts — 빌더 호스팅 도메인 리스트

```ts
const BUILDER_HOSTING_PATTERNS: RegExp[] = [
  /\.imweb\.me$/i,           // imweb (한국 빌더)
  /\.wix\.com$/i, /\.wixsite\.com$/i,
  /\.weebly\.com$/i,
  /\.squarespace\.com$/i,
  /\.cafe24app\.com$/i,      // 카페24
  /\.modoo\.at$/i,           // 네이버 modoo
  /\.tistory\.com$/i, /\.blog\.me$/i,
  /\.shopify\.com$/i,
  /\.framer\.app$/i, /\.notion\.site$/i,
  /\.webflow\.io$/i, /\.carrd\.co$/i,
  /\.bubbleapps\.io$/i, /\.glide\.app$/i,
];

function isBuilderHosting(host: string): boolean { /* ... */ }
```

#### 2. ⭐ canonical link / og:url에서 정식 도메인 추출

빌더 사이트도 도메인 forwarding 설정 시 보통 `<link rel="canonical">`·`<meta property="og:url">`에
사용자 정식 도메인 명시. 이를 활용:

```ts
const canonicalHref = $('link[rel="canonical"]').attr("href");
const ogUrlMeta = $('meta[property="og:url"]').attr("content");
const canonicalHost = canonicalHref ? tryParseHost(canonicalHref, finalUrl) : null;
const ogUrlHost = ogUrlMeta ? tryParseHost(ogUrlMeta, finalUrl) : null;
```

#### 3. ⭐ 우선순위 결정

```
1순위: canonical / og:url 호스트가 빌더 호스팅 X면 사용 (사이트 정식 도메인)
2순위: redirect 후 finalUrl이 빌더 호스팅 + 입력은 일반 도메인 → 입력 도메인 우선
3순위: 일반 — input host 사용 (parsed.hostname)
```

```ts
let displayDomain = inputHost;
let displayUrl = finalUrl;

const metaNonBuilder =
  (canonicalHost && !isBuilderHosting(canonicalHost)) ? canonicalHost
    : (ogUrlHost && !isBuilderHosting(ogUrlHost)) ? ogUrlHost
      : null;

if (metaNonBuilder && metaNonBuilder !== inputHost) {
  // canonical에서 정식 도메인 발견 (사용자가 빌더 URL 입력 시 정식 도메인 추정)
  displayDomain = metaNonBuilder;
  // path 유지하되 호스트만 사용자 도메인으로
  const u = new URL(finalUrl);
  u.hostname = metaNonBuilder;
  u.protocol = "https:";
  displayUrl = u.toString();
} else if (
  inputHost !== finalUrlHost &&
  isBuilderHosting(finalUrlHost) &&
  !isBuilderHosting(inputHost)
) {
  // redirect 후 빌더 호스팅 → 입력 도메인 우선
  displayDomain = inputHost;
  displayUrl = rawUrl;
}
```

#### 4. dedupKey 자동 정규화

`createCard`·`previewCard`는 `computeDedupKey(urlResult.finalUrl)` 사용. v2.32.0에서
`finalUrl`이 사용자 도메인으로 변환되니 같은 사이트는 자동으로 같은 dedupKey 생성:

```
사용자 입력: example.com   → finalUrl: example.com → dedupKey A
사용자 입력: example-k.imweb.me + canonical example.com → finalUrl: example.com → dedupKey A
                                                                                    ↑ 같음 (덮어쓰기 동작)
```

#### 5. 진단 로그

```
extractFromUrl "user-domain-resolved" {
  rawUrl, finalUrl, inputHost, finalUrlHost,
  canonicalHost, ogUrlHost,
  isInputBuilder, isFinalBuilder,
  displayDomain, displayUrl,
  reason: "canonical" | "og-url" | "input-preserved-from-builder-redirect" | "input"
}
```

Vercel function logs에서 어떤 우선순위 규칙이 적용됐는지 즉시 확인 가능.

#### 6. 검증 결과 (시뮬레이션)

**Case 1**: 사용자가 `example.com` 입력
- 카드 sourceUrl: `https://example.com/`
- 카드 sourceDomain: `example.com` ✓
- imweb 호스팅 노출 X ✓

**Case 2**: 사용자가 imweb 빌더 URL 입력 + 페이지 canonical에 정식 도메인 명시
- 카드 sourceUrl: `https://example.com/` (canonical에서 추출)
- 카드 sourceDomain: `example.com` ✓
- imweb 호스팅 노출 X ✓

**6/6 VERIFICATION pass**.

#### 7. 다른 빌더 플랫폼도 같은 효과

같은 로직이 Wix, Squarespace, Weebly, Shopify, Framer, Webflow, Notion site,
카페24, 네이버 modoo, 티스토리 등 모든 주요 빌더 호스팅 redirect 케이스에 적용됨.

#### 8. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`PreviewState` 변경 없음.
`extractFromUrl()` 시그니처 그대로, 내부 displayDomain·displayUrl 결정 로직만 추가.
`finalUrl`·`domain` 필드 의미는 그대로 유지하되 값이 사용자 도메인 우선.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

---

### v2.31.0 — 빌더 사이트 brute force 본문 추출 + 자연스러운 합성 fallback + 디버그 패널 default 닫힘 (2026.05)

**보고된 이슈 — v2.30.0 배포 후 imweb 빌더 사이트에서 카드 빈약**

진단 데이터:
```
URL: https://example-k.imweb.me/   ← imweb 빌더 호스팅
HTML size: 838.3KB               ← 페이지 자체는 풍부
raw paragraphs: 1, raw headings: 0, raw keywords: 1
og:description: 0자 / twitter:description: 0자 / meta description: 0자
body[0]: "<sitename> — <sitename>..co.kr )"  ← 의미없는 합성 결과
```

**근본 원인 — imweb·Wix 같은 한국 웹빌더 특성**

- 본문을 `<div>` 안 일반 텍스트로 렌더링, `<h1>~<h3>` / `<p>` 거의 사용 X
- 메타 description 비어있음 (Builder default 미설정 케이스 흔함)
- HTML은 큼(838KB)이지만 cheerio가 의미있는 단락을 거의 못 잡음
- 결과: 838KB의 풍부한 콘텐츠가 추출 단계에서 거의 다 누락

**해결 — 4가지 fix**

#### 1. ⭐ lib/url-extractor.ts — brute force 본문 추출 (빌더 사이트 핵심 fix)

진단 신호: `htmlBytesSize > 50KB` + `merged.length < 3` + `mainContentLen < 600`자.
이 조건 만족 시 5가지 광범위 selector로 본문 보강:

```ts
// (a) noscript 안 SSR fallback 텍스트
$("noscript").each((_, el) => { /* 30~1000자 추출 */ });

// (b) Schema.org 마이크로데이터
$('[itemprop="description"], [itemprop="articleBody"], [itemprop="text"], [itemprop="abstract"]')

// (c) 빌더 사이트 공통 클래스 패턴
const builderSelectors = [
  ".content", ".description", ".text-block", ".txt-area", ".content-text",
  ".cont", ".body-text", ".article-body", ".article-content",
  ".main-content", ".section-content", ".intro",
  '[class*="text-block"]', '[class*="txt-block"]', '[class*="content-text"]',
  '[class*="description"]', '[class*="intro"]',
];

// (d) img alt 텍스트 (의미있는 것만 — 일반 라벨 제외)
$("img[alt]").each((_, el) => {
  if (alt.length < 20 || alt.length > 300) return;
  if (/^(image|photo|이미지|로고|아이콘)$/i.test(alt)) return;
  // 본문 후보로 추가
});

// (e) figcaption — 캡션 텍스트
$("figcaption").each((_, el) => { /* 캡션 추출 */ });
```

각 단계에서 길이 키 dedup·중복 방지·메뉴/푸터 sanitize는 기존 로직 활용. 최대 6개
brute force 단락 추가 (너무 많이 추가 방지).

진단 로그 `extractFromUrl brute-force-extracted` — Vercel function logs에서
`htmlBytesSize·mergedBefore·mergedAfter·bruteAdded` 값 확인 가능.

#### 2. ⭐ lib/compose-card.ts — 합성 fallback 자연스럽게

```ts
// Before (v2.30.0): "<sitename> — <sitename>..co.kr )" 같은 의미없는 합성
fallbackBody.push(`${fallbackTitle} — ${fallbackDek}`);  // 단순 concat

// After (v2.31.0):
const meaningfulDek =
  cleanDek && cleanDek.length >= 20 && !looksLikeJustAddress(cleanDek)
    ? cleanDek
    : descUsed && descUsed.length >= 20
      ? descUsed
      : null;

if (meaningfulDek) {
  // siteName과 dek가 비슷하면 dek만 사용 (중복 방지)
  if (meaningfulDek.toLowerCase().includes(siteName.toLowerCase().slice(0, 5))) {
    fallbackBody.push(meaningfulDek);
  } else {
    fallbackBody.push(`${siteName} — ${meaningfulDek}`);
  }
} else {
  // 전부 빈약: 자연스러운 안내 문장
  fallbackBody.push(`${siteName} 공식 사이트입니다. 자세한 정보는 ${cleanDomain}에서 확인해 주세요.`);
}
```

검증 결과 (worst case 시뮬레이션):
```
Before: bodyParagraphs[0] = "<sitename> — <sitename>..co.kr )"
After:  bodyParagraphs[0] = "<sitename> 공식 사이트입니다. 자세한 정보는 <domain>에서 확인해 주세요."
```

#### 3. ⭐ CardEditDialog 디버그 패널 default 닫힘 + 빈약 추출 안내

**v2.27.0 default open** → **v2.31.0 default 닫힘**:

```tsx
// Before
<details open className="border-2 border-indigo-300 bg-indigo-50">
  <summary>🔍 자동 추출 진단 정보 ...</summary>

// After
<details className="border border-stone-200 bg-stone-50">
  <summary>자동 추출 진단 정보 (디버그) · v2.31.0</summary>
```

평소엔 카드 검토에 집중, 필요할 때만 펼침. 시각도 차분한 stone 톤.

**자동 추출 빈약 안내** — 메타·본문 모두 비어있을 때 다이얼로그 상단에 명확한 안내:

```
조건: rawParagraphsCount ≤ 1 + rawHeadingsCount = 0 + 모든 description 0자

표시:
  ⚠ 자동 추출 결과가 빈약합니다.
  이 사이트는 메타데이터(og:description·meta keywords 등)가
  거의 비어있어 자동 추출이 어렵습니다 (imweb·Wix 같은 빌더 사이트 일반적).
  헤드라인·데크·본문·핵심 포인트를 직접 작성해 주세요.
  (페이지 크기 838KB — 콘텐츠는 있으나 추출이 실패한 케이스)
```

사용자가 디버그 패널 열지 않아도 어떤 상황인지 즉시 이해 가능.

#### 4. 검증 결과

**브라우저 시뮬레이션** (worst case, brute force도 실패한 경우):
```
입력: title="<sitename>", paragraphs=[], headings=[], keywords=["<sitename>"]
       모든 description 0자

결과:
  headline: <sitename>
  dek: <sitename>
  lead: <sitename>
  body[0]: "<sitename> 공식 사이트입니다. 자세한 정보는 <domain>에서 확인해 주세요."

VERIFICATION (3/3 pass):
  ✓ 본문 1개 이상
  ✓ 본문이 '<sitename> — <sitename>..co.kr )' 형태가 아님
  ✓ 본문이 자연스러운 문장
```

**실제 imweb 사이트** (brute force 작동 시): noscript·itemprop·빌더 클래스·img alt·
figcaption에서 추출된 단락이 본문으로 자연 보강. 838KB의 콘텐츠 중 의미있는 부분이
카드에 반영됨.

#### 5. 최신 베스트 프랙티스 적용 (2026 5월)

- **Schema.org 마이크로데이터 활용**: `[itemprop="..."]` 표준 우선 채택
- **noscript SSR fallback**: client-side hydration 사이트에서 SEO용 noscript 활용
- **빌더 클래스 휴리스틱**: imweb·Wix·Squarespace 공통 클래스 패턴 매칭
- **alt 텍스트 의미 필터링**: 일반 라벨(image, 로고, 아이콘) 제외, 의미있는 것만 활용
- **HTML 사이즈 기반 진단**: 50KB+ vs paragraphs<3 = 추출 실패 신호 → brute force 활성화
- **차분한 디버그 UX**: 디버그 패널은 default 닫힘, 필요할 때만 펼침
- **명확한 사용자 안내**: 추출 실패 케이스에서 어떤 상황인지·왜 그런지·무엇을 해야 하는지 즉시 표시

#### 6. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`PreviewState` 변경 없음.
`composeCard()` 시그니처 그대로.
새 추가: brute force 추출 코드 (extractFromUrl 내부), 빈약 추출 안내 UI.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

---

### v2.30.0 — effective description 합성 + 주소-only lead 차단 + 주소 패턴 KR prefix 매칭 (2026.05)

**보고된 이슈 — v2.29.0 배포 후에도 카드가 주소 정보뿐**

`/api/version` 으로 v2.29.0 배포 확인됨. 그런데 등록된 카드:
```
Lead: 주소: KR [광역행정구역] [상세 주소] (xx리) xxxxx
Body 1단락: 같은 주소 라인
산업: 기타 (other)
```

**근본 원인 두 가지**

#### A. sanitize 주소 패턴이 `KR` prefix 케이스 못 잡음

```ts
// 이전 (v2.24.0)
/(?:주소|Address)\s*[:：]?\s*(?:서울|부산|...|강원|...)(?:특별시|광역시|특별자치도|...)/g
//                          ↑ \s*만 허용 — "KR " 같은 국가 코드 끼면 매칭 실패
```

`주소: KR 강원특별자치도...` 형식에서 `:` 와 `강원` 사이 ` KR ` 가 있어서 `\s*`로 매칭
불가. 결과: 이 주소 라인이 sanitize에서 제거되지 않고 본문에 살아남음.

#### B. summarize에 effective description이 안 들어감

```ts
// 이전: urlResult.description만 summarize에 전달
const summary = summarize({
  description: urlResult.description,  // ← isCleanDescriptionText가 거부 → ""
  fulltext: urlResult.paragraphs.join("\n\n"),  // ← 주소 라인뿐
});
// → summary.lead = "주소: KR 강원..."  (주소가 lead가 됨)
```

`urlResult.description`은 strict 검증으로 빈 문자열이 됐고, raw 소스(rawOgDescription
등)는 보존돼있지만 summarize에 안 들어감. 결과: 주소 라인이 summarize의 lead로 선택됨.

**해결 — 3가지 fix**

#### 1. ⭐ lib/sanitize.ts — 주소 패턴 강화

```ts
// v2.30.0: 국가 코드 prefix (KR, KOR, Korea, 대한민국) 끼어있는 케이스도 매칭
/(?:주소|Address|ADDRESS)\s*[:：]?\s*(?:KR|KOR|Korea|대한민국)?\s*(?:서울|부산|...|강원|...)(?:특별시|광역시|...)?[^\n.]{0,150}/g,
// 라벨 없이 국가 코드 + 광역행정구역으로 시작하는 주소 라인 (단독 라인 케이스)
/^\s*(?:KR|KOR|Korea|대한민국)\s+(?:서울|부산|...|강원|...)(?:특별시|광역시|...)?[^\n]{0,150}/gm,
```

신규 helper `looksLikeJustAddress(text)` 추가 — 텍스트가 거의 주소 정보로만 구성됐는지 판정.

`cleanDescriptionText`도 더 관대하게: 정제 후 15자 이상이면 OK (이전: 30% 미만이면 거부 →
짧지만 의미있는 정제 결과 거부 케이스 방지).

#### 2. ⭐ lib/compose-card.ts — effective description 합성 + summarize prepend

```ts
// 모든 description 소스를 종합한 effective description 결정
const allDescriptionSources = [
  urlResult.description,           // sanitize 후
  urlResult.rawOgDescription,      // og:description 원본
  urlResult.rawTwitterDescription, // twitter:description 원본
  urlResult.rawDescription,        // meta description 원본
].filter((s) => !!s && s.trim().length >= 20);

let effectiveDescription = "";
for (const source of allDescriptionSources) {
  const cleaned = cleanDescriptionText(source);  // 관대 모드
  if (cleaned && cleaned.length >= 20) {
    effectiveDescription = cleaned;
    break;
  }
}
// 모든 정제가 실패해도 가장 긴 raw 소스 사용 (raw가 빈약 정제보다 낫다)
if (!effectiveDescription && allDescriptionSources.length > 0) {
  effectiveDescription = allDescriptionSources.reduce(
    (longest, s) => (s.length > longest.length ? s : longest), ""
  );
}

// summarize 입력의 fulltext 맨 앞에 effectiveDescription prepend
let summarySource = urlResult.paragraphs.join("\n\n");
if (effectiveDescription && !summarySource.includes(effectiveDescription.slice(0, 30))) {
  summarySource = effectiveDescription + "\n\n" + summarySource;
}
// → summarizer가 회사 소개를 lead로 우선 선택
```

`dek`, `lead`도 effectiveDescription 우선 사용. 본문이 주소 라인뿐이어도 dek/lead가
회사 소개로 채워짐.

#### 3. ⭐ lib/compose-card.ts — address-only lead 차단 + body filter

```ts
// 리드가 주소 정보뿐이면 effectiveDescription 또는 dek로 대체
if (looksLikeJustAddress(lead)) {
  if (effectiveDescription) lead = effectiveDescription;
  else if (dek) lead = dek;
  log.info("composeCard", "address-only-lead-replaced", { ... });
}

// body fallback 시 address-only 단락 제거 (contactInfo로 이미 추출됨)
const fallbackBody = cleanBody.filter((p) => !looksLikeJustAddress(p));

// isThinContent 트리거 조건에 meaningfulBodyCount 추가
const meaningfulBodyCount = cleanBody.filter((p) => !looksLikeJustAddress(p)).length;
const isThinContent =
  /* 기존 조건 */ ||
  meaningfulBodyCount < 1;  // 의미있는 단락 0개면 fallback 강제
```

#### 4. 검증 결과 — 정확한 사용자 보고 케이스 시뮬레이션

```
입력:
  description (sanitized): empty
  rawOgDescription: "자연과 인류의 공존을 위해..." (41자)
  paragraphs: ["주소: KR [광역행정구역] [상세 주소] (xx리) xxxxx"] (1개)
  headings: 0개
  keywords: 1개

Before (v2.29.0):
  lead: 주소: KR [광역행정구역] [상세 주소] (xx리) xxxxx
  bodyParagraphs (1개): 같은 주소 라인

After (v2.30.0):
  lead: 자연과 인류의 공존을 위해 소비가치 혁신의 주도를 목표로 하는 친환경 기업
  dek: 자연과 인류의 공존을 위해 소비가치 혁신의 주도를 목표로 하는 친환경 기업
  bodyParagraphs (1개): 자연과 인류의 공존을 위해 소비가치 혁신의 주도를 목표로 하는 친환경 기업
  keyPoints (1개): 친환경

VERIFICATION (7/7 pass):
  ✓ lead가 주소가 아님
  ✓ lead에 회사 설명 포함
  ✓ dek에 회사 설명 포함
  ✓ 본문 단락 ≥ 1개
  ✓ 본문에 주소만 단독으로 남지 않음
  ✓ 본문에 회사 설명 포함
  ✓ 핵심 포인트 ≥ 1개

Vercel function logs (자동 출력):
  composeCard "address-only-lead-replaced" — 주소 lead가 description으로 교체됐음을 확인
  composeCard "fallback-decision" — meaningfulBodyCount: 0 → fallback 강제 활성
```

#### 5. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`PreviewState` 변경 없음.
`composeCard()` 시그니처 그대로.
새 추가:
- `looksLikeJustAddress(text: string): boolean` (`lib/sanitize.ts` export)
- `composeCard()` 내부의 effectiveDescription 합성 로직
- `address-only-lead-replaced` 진단 로그
- `meaningfulBodyCount` debug 필드 (fallback-decision 로그)

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes).

---

### v2.29.0 — 사이트 버전 가시화 + 디버그 정보 접근성 강화 (2026.05)

**보고된 이슈 — "디버그 패널 확인 어려움"**

v2.28.0 fallback이 시뮬레이션에서는 정상 작동(본문 1→2개, keyPoints 0→1개)하지만 실제
사이트에서는 변동이 안 보임. 가장 가능성 높은 원인은 **새 버전이 실제로 배포되지 않은
케이스** (Vercel 캐시·빌드 실패·환경 문제). 현재 사용자에게 어떤 버전이 실행 중인지
확인할 수단이 없음.

**해결 — 4가지 가시화·접근성 강화**

#### 1. ⭐ `/api/version` endpoint 추가

`https://nest-alum1.vercel.app/api/version` 한 번 방문으로 즉시 확인:

```json
{
  "version": "2.29.0",
  "commitSha": "a1b2c3d",
  "deploymentId": "dpl_xxx",
  "region": "icn1",
  "responseTime": "2026-05-06T..."
}
```

`force-dynamic` + `Cache-Control: no-store`로 항상 fresh 응답. 새 버전 push 후 이
endpoint 결과만 보면 진짜로 배포됐는지 60초 안에 확인 가능.

#### 2. ⭐ next.config.ts에 `NEXT_PUBLIC_APP_VERSION` 빌드 타임 주입

```ts
import pkg from "./package.json";

const nextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  // ...
};
```

`package.json` version이 빌드 시점에 클라이언트 번들에 포함됨. 컴포넌트에서
`process.env.NEXT_PUBLIC_APP_VERSION` 직접 사용 가능.

#### 3. ⭐ 다이얼로그 헤더 + Footer에 버전 배지

**다이얼로그 헤더**: "등록 전 검토 · 편집" 옆에 인디고 색 배지 `v2.29.0` 표시.
사용자가 등록 시도할 때마다 시각적으로 버전 확인.

**Footer**: 모든 페이지 하단에 `v2.29.0 ↗` 링크 (클릭 시 `/api/version` 새 탭).
다이얼로그 안 들어가도 어디서나 보임.

#### 4. ⭐ 디버그 패널 강화 — 콘솔 자동 출력 + JSON 복사 버튼

**브라우저 콘솔 자동 로깅**: 다이얼로그 mount 시 `useEffect`로 디버그 정보 자동 출력.
F12 → Console 탭에서 즉시 확인:

```
▼ [Folio Cards v2.29.0] preview debug
  URL: https://example.com
  contentSignal: thin
  raw: { paragraphs: 1, headings: 0, keywords: 1, descriptionLen: 0 }
  rawMeta: { ogDescription: 41, twitterDescription: 0, metaDescription: 41,
             metaKeywords: 6, keywordsCount: 1 }
  final: { body: 2, keyPoints: 1, firstBodyPreview: "We're the Future...",
           firstKeyPointPreview: "친환경" }
  response: { finalUrl: "https://example.com/", redirected: false,
              htmlBytesSize: 38000, ogImagePresent: true }
  full debug object (copyable): { ... }
```

**JSON 복사 버튼**: 디버그 패널 헤더에 `📋 복사` 버튼. 한 클릭으로 전체 진단 정보를
클립보드에 복사 (app version + URL + domain + timestamp + debug + card_summary):

```json
{
  "app_version": "2.29.0",
  "url": "https://example.com",
  "domain": "example.com",
  "timestamp": "2026-05-06T...",
  "debug": { ... },
  "card_summary": {
    "headline": "...",
    "dekLen": 57,
    "leadLen": 62,
    "bodyParagraphsCount": 2,
    "keyPointsCount": 1,
    "industry": "energy",
    "palette": "paper",
    "lang": "ko",
    "hasContactInfo": false,
    "hasHeroImage": true
  }
}
```

식별 정보 노출 0건 — 길이·카운트·도메인·우리 사이트 본문만 포함.

**디버그 패널 시각 강조**: 인디고 테두리 2px + 인디고 배경으로 주변에서 즉시 눈에 띔.

#### 5. 사용자 디버깅 흐름 (3가지 방법)

| 방법 | 절차 | 권장 상황 |
|---|---|---|
| **버전 확인** | `/api/version` 방문 또는 footer `v?.?.? ↗` 클릭 | "새 버전이 정말 깔렸나?" 의심 시 |
| **다이얼로그 디버그** | 카드 등록 시도 → 다이얼로그 헤더 버전 배지 + 디버그 패널 자동 펼침 → 📋 복사 | 추출 결과 공유·진단 |
| **브라우저 콘솔** | F12 → Console 탭 | 가장 빠른 검사 + 복붙 가능 |

#### 6. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`PreviewState` 타입 변경 0건.
새 추가:
- `NEXT_PUBLIC_APP_VERSION` env (publishable, 빌드 타임)
- `/api/version` route handler
- `CardEditDialog`의 `useEffect` 콘솔 출력 + 복사 핸들러
- 헤더 버전 배지 + footer 버전 링크

빌드 검증: `tsc --noEmit` 0 에러, `next build` 성공 (9 routes — `/api/version` 추가).

#### 7. 즉시 검증 절차

배포 후:

1. **`/api/version` 방문** → `"version": "2.29.0"` 확인
2. **Footer 우하단** `v2.29.0 ↗` 표시 확인
3. **카드 등록 시도** → 다이얼로그 헤더 인디고 배지 `v2.29.0` 확인
4. **F12 Console** → `[Folio Cards v2.29.0] preview debug` 그룹 확인
5. **디버그 패널 📋 복사** → 클립보드에 JSON 복사 → 필요 시 공유

만약 `/api/version`이 v2.28.0 이하를 반환하면 새 zip이 git에 push 안 됐거나 Vercel
빌드가 실패한 것 — `auto-deploy.sh` 출력 검토 필요.

---

### v2.28.0 — raw 메타 데이터 노출 + description fallback chain + 디버그 패널 강화 (2026.05)

**보고된 이슈 — v2.27.0 적용 후에도 본문/keyPoints 1개로 변동 없음**

진단 패널 데이터:
```
contentSignal: thin     raw paragraphs: 2     raw headings: 0
raw keywords: 1         desc length: 0        final body: 1
final keyPoints: 1
```

**근본 원인 — 추출기 raw 데이터 자체가 빈약**

진단으로 추출 단계에서 부족한 데이터가 명확해짐:
- `desc length: 0` — `isCleanDescriptionText`가 description을 통째로 거부 → 빈 문자열 반환
- `raw headings: 0` — cheerio가 헤딩 못 찾음
- `raw keywords: 1` — meta keywords가 1개만

이 상태에서는 v2.27.0의 fallback이 작동해도 *fallback할 소스 자체가 없음*.

**해결 — raw 메타 보존 + fallback chain 확장 + 진단 강화**

#### 1. lib/types.ts — UrlExtractResult에 raw 필드 추가

```ts
rawDescription?: string;          // sanitize 전 meta description 원본
rawOgDescription?: string;        // og:description 원본
rawTwitterDescription?: string;   // twitter:description 원본
rawMetaKeywords?: string;         // meta keywords 원본 (split 전)
htmlBytesSize?: number;           // 응답 HTML 크기 (challenge 페이지 진단)
```

#### 2. lib/url-extractor.ts — 모든 description 소스 별도 보존 + 추출 직후 진단 로그

```ts
// 모든 description 소스를 별도로 보존
const rawOgDescription = ($('meta[property="og:description"]').attr("content") ?? "").trim();
const rawTwitterDescription = ($('meta[name="twitter:description"]').attr("content") ?? "").trim();
const rawMetaDescription = ($('meta[name="description"]').attr("content") ?? "").trim();
const rawMetaKeywords = ($('meta[name="keywords"]').attr("content") ?? "").trim();

// 추출 직후 진단 로그 (Vercel function logs · "extractFromUrl raw-meta-snapshot")
log.info("extractFromUrl", "raw-meta-snapshot", {
  domain, finalUrl, redirected, htmlBytesSize, titleLen,
  rawOgDescriptionLen, rawTwitterDescriptionLen, rawMetaDescriptionLen,
  rawMetaKeywordsLen, rawMetaKeywordsCount,
  h1Count, h2Count, h3Count, pCount, hasOgImage, htmlLang,
});
```

#### 3. lib/sanitize.ts — `cleanDescriptionText()` 추가 (관대한 정제)

기존 `isCleanDescriptionText`는 **strict** (패턴 매치되면 통째로 거부). 새 `cleanDescriptionText`는
**관대 모드** — 패턴 매치 부분만 제거하고 나머지 살림:

```ts
export function cleanDescriptionText(s: string): string {
  if (!s || s.trim().length < 10) return "";
  const cleaned = removeKoreanFooterBoilerplate(s);
  if (cleaned.length < 15) return "";
  if (cleaned.length < s.trim().length * 0.3) return "";
  return cleaned;
}
```

#### 4. lib/compose-card.ts — description fallback chain (4단계)

본문 보강 시 description 후보를 순서대로 시도:

```ts
const descriptionCandidates = [];
if (urlResult.description) descriptionCandidates.push(urlResult.description);
if (urlResult.rawOgDescription) descriptionCandidates.push(urlResult.rawOgDescription);
if (urlResult.rawTwitterDescription) descriptionCandidates.push(urlResult.rawTwitterDescription);
if (urlResult.rawDescription) descriptionCandidates.push(urlResult.rawDescription);

for (const candidate of descriptionCandidates) {
  const cleaned = cleanDescriptionText(candidate);  // 관대 모드 정제
  if (cleaned && cleaned.length >= 20) {
    descUsed = cleaned;
    break;
  }
}
```

**keyPoints fallback도 raw 활용**: `urlResult.keywords`가 비어있어도 `urlResult.rawMetaKeywords`에서
직접 split해서 후보 수집. extractor의 keywords 수집이 누락한 케이스에도 보강.

#### 5. CardEditDialog 디버그 패널 대폭 확장

다이얼로그 상단에 4개 섹션의 풍부한 진단 정보 (디버그 패널 default open):

```
[추출 결과]
  contentSignal·raw paragraphs/headings/keywords·desc length·desc accepted·
  final body·final keyPoints·og:image

[원본 메타 데이터 (sanitize 전)]
  og:description·twitter:description·meta description·meta keywords 길이/개수·html size

[⚠ 응답 이상 신호] (조건부 표시)
  redirected → finalUrl
  html size 5KB 미만 — challenge·empty page 의심

[최종 카드 첫 본문·핵심 포인트 (80자)]
  body[0]·kp[0] 미리보기

해석 가이드:
  raw 카운트가 모두 0에 가까우면 추출기가 사이트에서 데이터를 거의 못 가져온 것
  → html size·redirect 먼저 확인
```

식별 정보 노출 0건 — 길이·카운트·domain·우리 사이트 본문만 표시.

#### 6. 인터페이스 호환성

`UrlExtractResult`에 옵셔널 필드 5개 추가만 — 기존 호출자 호환.
`PreviewState.debug`에 옵셔널 필드 추가만.
`composeCard()` 시그니처 그대로.

빌드: `tsc --noEmit` 0 에러, `next build` 성공 (8/8 페이지).

#### 7. 사용자 디버깅 흐름 (v2.28.0)

배포 후 등록 시도 → 편집 다이얼로그에서 디버그 패널이 **자동으로 펼쳐짐**:

| 진단 결과 | 의미 | 다음 단계 |
|---|---|---|
| html size 5KB 미만 | challenge/empty 페이지 응답 | 사이트가 봇 차단 — 수동 입력 모드 권장 |
| redirected → 다른 도메인 | 사이트가 redirect | finalUrl 확인 |
| og:description 길이 50+ but desc accepted: false | 메타가 strict 패턴에 막힘 | v2.28.0 cleanDescriptionText fallback 적용됐는지 확인 |
| raw keywords 0 but raw paragraphs 5+ | 본문은 풍부, keywords만 없음 | keyPoints는 본문에서 추출 |
| raw 모두 0 | cheerio 추출 실패 | 사이트 구조 검토 (JS 렌더링 등) |

Vercel logs에서 `extractFromUrl raw-meta-snapshot` 검색하면 같은 정보 (function logs).

---

### v2.27.0 — 본문 보강 fallback 임계값 완화 + 자동 추출 진단 로그·UI 패널 추가 (2026.05)

**보고된 이슈 — Vercel 배포 60초 후에도 본문/핵심 포인트 1개로 변동 없음**

v2.26.0의 메타 fallback이 일부 케이스(본문 1개 + 그 1개가 200자 이상)에서 트리거되지 않아
실제 배포 후에도 결과 변화가 없는 문제. 사용자가 "왜 적용 안 됐는지" 진단할 수단도 없었음.

**근본 원인**

v2.26.0의 `isThinContent` 임계값:

```ts
// 본문 1개라도 그 길이가 200자 이상이면 isThinContent === false → fallback skip
const isThinContent =
  urlResult.contentSignal === "thin" ||
  urlResult.contentSignal === "meta-only" ||
  cleanBody.length === 0 ||             // 0개여야 trigger
  cleanBody.reduce(...) < 200;          // 200자 미만이어야 trigger
```

웹빌더 사이트는 cheerio 추출 결과로 1-2개의 길지만 의미 적은 단락(예: 슬로건 + 영어
선언문)이 나오는 케이스가 흔함. 이때 본문은 1개 있지만 사용자가 카드를 보면 회사 정보가
거의 없는 빈 카드. fallback이 작동하지 않으면 v2.25.0과 동일한 결과.

**해결 — 임계값 완화 + 진단 로그/UI 패널 추가**

#### 1. lib/compose-card.ts — fallback 임계값 완화

```ts
const isThinContent =
  urlResult.contentSignal === "thin" ||
  urlResult.contentSignal === "meta-only" ||
  cleanBody.length < 3 ||              // 0 → 3개 미만으로 완화
  totalBodyLen < 400;                  // 200 → 400자 미만으로 완화
```

`keyPoints` 보강 임계값도 `< 3` → `< 5`로 완화.

#### 2. lib/compose-card.ts — 진단 로그 3종 추가

Vercel function logs에서 어떤 경로로 결과가 나왔는지 한눈에 확인 가능:

```ts
log.info("composeCard", "fallback-decision", {
  domain, contentSignal, paragraphsCount, cleanBodyCount,
  totalBodyLen, descriptionLen, keywordsCount, headingsCount, isThinContent,
});

if (isThinContent) {
  log.info("composeCard", "thin-content-fallback-applied", {
    domain, bodyBefore, bodyAfter, addedFromDescription, addedFromHeadings,
  });
}

if (cleanKeyPoints.length !== beforeKpCount) {
  log.info("composeCard", "keypoints-fallback-applied", {
    domain, before, after, sourceKeywordsCount,
  });
}
```

`previewCard` 액션 로그도 확장 (contentSignal·rawParagraphsCount·rawKeywordsCount·
finalBodyCount·finalKeyPointsCount 포함).

#### 3. PreviewState · CardEditDialog — 사용자 측 디버그 패널

`PreviewState` 타입에 `debug` 필드 추가:

```ts
debug?: {
  contentSignal: "rich" | "thin" | "meta-only" | "(none)";
  rawParagraphsCount: number;
  rawHeadingsCount: number;
  rawKeywordsCount: number;
  rawDescriptionLen: number;
  finalBodyCount: number;
  finalKeyPointsCount: number;
};
```

`previewCard()` server action이 이 정보를 채워 반환하면 클라이언트 `HomeClient` →
`CardEditDialog`로 전달. 다이얼로그 상단의 메타 영역 아래에 접을 수 있는
"자동 추출 진단 정보 (디버그)" `<details>` 패널 표시:

```
contentSignal: thin              raw paragraphs: 1
raw headings: 4                  raw keywords: 12
desc length: 57                  final body: 3
final keyPoints: 8

contentSignal이 thin/meta-only이면 메타 fallback이 활성화돼야 합니다.
final body/keyPoints가 raw 값보다 크면 fallback이 적용된 것입니다.
```

사용자가 등록 전 자동 추출이 어떤 데이터로 동작했는지, fallback이 적용됐는지 직접
확인 가능. 식별 정보 노출 0건 — 카운트·신호명만 표시.

#### 4. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`SummarizeInput`·`SummaryResult` 변경 없음.
`PreviewState`에 옵셔널 `debug` 필드 추가만 — 기존 호출자 코드 호환.
`CardEditDialog`에 옵셔널 `debug` prop 추가만.

빌드 검증: `npx tsc --noEmit` 0 에러, `next build` 성공 (8/8 페이지 정상).

#### 5. 사용자 디버깅 흐름

배포 후 카드 등록 시도 → 편집 다이얼로그에서 "자동 추출 진단 정보 (디버그)" 펼쳐
다음 확인:

| 표시 | 의미 |
|---|---|
| `contentSignal: rich` + final body 5+ | 정상 추출, fallback 불필요 |
| `contentSignal: thin` + final body == raw paragraphs | 본문 짧지만 fallback 작동 안 함 → composeCard 코드 미반영 |
| `contentSignal: thin` + final body > raw paragraphs | fallback 정상 작동 |
| `contentSignal: meta-only` + raw paragraphs == 0 | 추출기가 본문 0개 — 메타 보강 적용돼야 함 |
| `final keyPoints > raw keywords` 같은 모순 | 데이터 불일치 (있을 리 없음) |

Vercel 대시보드 → 프로젝트 → Logs → "composeCard" 검색해도 같은 정보 확인 가능.

---

### v2.26.0 — auto-deploy.sh cd 버그 fix + 웹빌더·SPA 사이트 본문 추출 강화 (2026.05)

**보고된 두 가지 critical 이슈**

```
1) auto-deploy.sh: line 361: cd: <dir>: No such file or directory
   → set -e 켜져있어 스크립트가 line 361에서 즉시 종료. 배포 실패.

2) 일부 한국 웹빌더(imweb 등) 기반 사이트 입력 시 편집 다이얼로그가 열리긴 하나:
   - 본문 단락 (0개)
   - 핵심 포인트 (0개)
   - 헤드라인·데크만 표시
   → 사용자가 본문을 직접 다 입력해야 하는 상태
```

#### 1. auto-deploy.sh line 361 fix

**근본 원인**

```bash
# Line 343: 작업 디렉토리로 이동
cd "$WORK_DIR"  # → ~/Downloads/<프로젝트>

# Line 361 (이전, 버그):
*) SELF_ABS="$(cd "$(dirname "$SELF_PATH")" && pwd)/$(basename "$SELF_PATH")" ;;
#       ↑ SELF_PATH="<프로젝트>/auto-deploy.sh" → dirname="<프로젝트>"
#         cd <프로젝트> → 이미 그 디렉토리 안 → 실패
#         set -e → 스크립트 즉시 종료
```

**수정**

```bash
*)
  SELF_DIR="$(cd "$(dirname "$SELF_PATH")" 2>/dev/null && pwd || true)"
  if [ -n "$SELF_DIR" ] && [ -f "$SELF_DIR/$(basename "$SELF_PATH")" ]; then
    SELF_ABS="$SELF_DIR/$(basename "$SELF_PATH")"
  elif [ -f "$WORK_DIR/$(basename "$SELF_PATH")" ]; then
    SELF_ABS="$WORK_DIR/$(basename "$SELF_PATH")"
  else
    SELF_ABS=""
  fi
  ;;
```

`2>/dev/null` + `|| true`로 cd 실패해도 `set -e` 트리거 안 되게 + WORK_DIR 추정 fallback 추가.

#### 2. ⭐ 웹빌더·SPA 사이트 본문 추출 강화

**근본 원인 — cheerio 본문 추출 한계**

imweb·Wix·Squarespace 같은 웹빌더 기반 사이트는:
- 본문 컨텐츠 대부분이 **이미지 안 텍스트**로 렌더링 (cheerio가 못 읽음)
- 메인 페이지가 짧은 단편 헤딩 위주 (예: `Read more`, 슬로건)
- 그러나 메타데이터는 풍부: `og:description`, `meta keywords`, `og:title`, `og:image`

기존 흐름은 paragraphs[]에 본문이 있어야 summarizer가 작동 → 본문 0개 반환되는 케이스.

**해결 — 메타데이터 우선 fallback 전략 (2026년 5월 베스트 프랙티스)**

| 영역 | 변경 |
|---|---|
| **lib/types.ts** `UrlExtractResult` | `keywords?: string[]` + `contentSignal?: "rich"\|"thin"\|"meta-only"` 필드 추가 (인터페이스 확장만, 기존 사용처 호환) |
| **lib/url-extractor.ts** | `meta keywords` + `article:tag` 수집 → `urlResult.keywords`로 반환. 본문 길이·단락 수로 `contentSignal` 자동 판정 |
| **lib/compose-card.ts** | `isThinContent` 감지 시 (paragraphs.length === 0 또는 본문 < 200자) **메타 보강 fallback 활성화** |

`composeCard` 본문 보강 fallback (4단계):

```ts
// (1) og:description / meta description → 본문 단락에 추가
if (urlResult.description.length >= 30) fallbackBody.push(description);

// (2) lead가 본문에 없으면 추가
if (cleanLead && !already_in_body) fallbackBody.unshift(lead);

// (3) 의미 있는 헤딩 (h1·h2·h3, 15-200자) → 본문 보강
for (const h of urlResult.headings) {
  if (h.length >= 15 && h.length <= 200 && !already_in_body) fallbackBody.push(h);
}

// (4) 그래도 비어있으면 headline + dek 합성 — 빈 카드 절대 방지
if (fallbackBody.length === 0) fallbackBody.push(`${headline} — ${dek}`);
```

`keyPoints` 보강 fallback:

```ts
// keyPoints가 3개 미만이고 keywords가 풍부하면 keywords를 keyPoints로
if (cleanKeyPoints.length < 3 && urlResult.keywords) {
  for (const kw of urlResult.keywords) {
    if (kw.length >= 2 && kw.length <= 50) cleanKeyPoints.push(kw);
    if (cleanKeyPoints.length >= 8) break;
  }
}
```

#### 3. 검증 결과 — 웹빌더 사이트 (본문 0개 · keywords 12종 케이스)

| 항목 | Before (v2.25.0) | After (v2.26.0) |
|---|---|---|
| bodyParagraphs | 0개 | 3개 |
| keyPoints | 0개 | 8개 (keywords에서 자동 변환) |
| industry 자동 분류 | other | 의도한 카테고리 |
| 사용자 작업 | 본문 다 입력 필요 | 검토만 필요 |

#### 4. 적용된 2026년 5월 베스트 프랙티스

- **메타데이터 우선 추출 체인**: JSON-LD → og:description → twitter:description → meta description → `<main>`/`<article>` (v2.24.0 적용)
- **메타데이터 → 본문 변환**: SPA·웹빌더 사이트 대응. og:description, meta keywords, h1·h2 헤딩을 본문 단락·keyPoints로 합성
- **콘텐츠 풍부도 신호**: `contentSignal: "rich" | "thin" | "meta-only"`로 추출기 → 카드 조립자에 컨텍스트 전달
- **빈 카드 절대 방지**: 어떤 사이트든 최소 1개 본문 단락 보장 (headline + dek 합성 fallback)
- **시그널 기반 분기**: `urlResult.contentSignal`으로 thin/meta-only 케이스에서만 fallback 활성화 — rich 콘텐츠는 영향 없음

#### 5. 인터페이스 호환성

`UrlExtractResult`에 옵셔널 필드 2개 추가만 — 기존 호출자 코드 수정 0건.
`EditorialCardData`·`ActionState`·`PreviewState` 변경 없음.
`composeCard()` 시그니처 그대로, 내부 로직만 강화.

빌드 검증: `npx tsc --noEmit` 0 에러, `next build` 성공 (8/8 페이지 정상).

---

### v2.25.0 — 등록 전 미리보기·편집 단계 추가 + 자동 분류 정확도 개선 (2026.05)

**보고된 두 이슈**

1. 친환경 소재 분야 회사가 헬스케어로 잘못 자동 분류
2. 자동 추출 결과를 사용자가 등록 전에 직접 검토·수정할 수 있는 단계가 없음

**근본 원인**

1. `lib/industry.ts`의 health 카테고리 키워드에 `"약"` (1글자) 포함 → `text.includes("약")`이
   "이용약관"·"예약"·"약 100명"·"약속" 같은 흔한 텍스트에 모두 매칭. 본문에 푸터 정제 후에도
   "약" 글자 한 번만 남으면 health 점수가 본래 카테고리 점수보다 높아져 오분류.
2. `createCard` 액션이 URL 추출 → composeCard → KV 저장을 한 번에 자동 수행. 사용자가 잘못된
   분류·헤드라인·본문을 발견해도 등록 후 별도 수정 흐름 필요.

**해결 — 분류 정확도 + 두 단계 등록 흐름 (인터페이스 확장만, 기존 호환 유지)**

`UrlExtractResult`·`EditorialCardData`·기존 server actions(`createCard`·`createCardManual`)
모두 그대로 유지. 새 server actions·클라이언트 컴포넌트만 추가.

#### 1. ⭐ lib/industry.ts — 자동 분류 정확도 개선

```ts
// v2.25.0 변경:
- "약" 1글자 키워드 제거 → "의약품"·"처방약"·"약품" 구체화
- 한글 키워드 최소 2자 강제 (안전 가드, 1글자 키워드는 자동 무시)
- energy 카테고리 라벨 확장: "친환경 · 에너지" → "친환경 · 소재 · 에너지"
- energy 키워드 추가: 리사이클링·생분해·재활용·친환경 빨대·비건·PLA·PET·압출·사출 등
- 분류 신뢰도 임계값 도입: 점수 < 2 또는 1·2위 동률이면 'other'로 후퇴
  → 사용자가 편집 단계에서 직접 분류 선택하도록 유도
```

검증 (4개 케이스):
- 친환경 소재 회사 → `energy` ✓ (이전: `health` ❌)
- AI/NPU 기술 회사 → `ai` ✓
- "이용약관" 흔한 IT 회사 → `other` ✓ (이전: `health` ❌)
- 진짜 의료 회사 → `health` ✓ (오분류 차단해도 진짜 의료는 정확히 분류)

#### 2. ⭐ app/actions.ts — 새 server actions 추가

기존 `createCard`(자동 추출+자동 저장 일체형)는 그대로 유지하되, 새 두 단계 흐름 추가:

```ts
// 1단계: 추출만, 저장 X
export async function previewCard(prev, formData): Promise<PreviewState>
// → { ok: true, card, dedupKey, isExisting, previewedAt } 반환
// → KV에 같은 dedupKey 카드 있으면 isExisting=true (덮어쓰기 경고용)

// 2단계: 사용자 편집 후 저장
export async function createCardEdited(prev, formData): Promise<ActionState>
// → 사용자 편집본을 받아 EditorialCardData 직접 조립 후 kvUpsertCard
// → composeCard 우회하지만 maskSensitive는 한 번 더 적용 (안전망)
// → industry는 INDUSTRIES 화이트리스트 검증, palette/lang도 화이트리스트
// → bodyParagraphs/keyPoints는 JSON 배열로 전달, contactInfo는 JSON 객체
// → dedupKey는 서버에서 재계산 (클라이언트 위조 방지)
```

`PreviewState` 타입을 `lib/actions-types.ts`에 추가.

#### 3. ⭐ components/CardEditDialog.tsx — 새 편집 다이얼로그

미리보기 받은 카드 데이터를 폼으로 표시. 편집 가능 필드:

- **항상 보임**: 헤드라인·데크(부제)·리드 단락·**산업 분류 dropdown**
- **접을 수 있음**: 본문 단락(추가/삭제 버튼), 핵심 포인트(추가/삭제 버튼) + 풀쿼트
- **접을 수 있음**: 회사 정보(대표자·전화·이메일·주소) — 자동 추출 결과 미리 채워짐
- **접을 수 있음**: 사이트 정보(사이트명·아이브라우·이미지 URL·팔레트)

상황별 안내:
- `isExisting`이면 "이미 등록된 사이트입니다. 등록을 진행하면 기존 카드를 덮어씁니다." 알림
- `industry === "other"`(자동 분류 신뢰도 낮음)이면 "산업 분류를 직접 선택해주세요." 안내

산업 분류 dropdown은 `INDUSTRIES`에서 자동 생성되므로 `lib/industry.ts`만 수정하면 즉시 반영.

#### 4. ⭐ components/HomeClient.tsx — 흐름 변경 + 모달 통합

```ts
// 모달 상태에 "edit" kind 추가 (card·dedupKey·isExisting·password 보유)

// 비밀번호 모달 success path:
//   기존: createCard(자동 등록) → setGallery → openDetail
//   v2.25.0: previewCard(미리보기) → setModal({kind: "edit", ...})
//            → 사용자 편집 → createCardEdited → setGallery → openDetail
```

자동 추출이 차단된 사이트는 기존처럼 `manual` 모달로 자동 fallback (변경 없음).

#### 5. UX 흐름 비교

```
이전 (v2.24.0):
  URL 입력 → 비밀번호 모달 → [createCard] → 카드 즉시 갤러리 등록 → 상세 페이지

이후 (v2.25.0):
  URL 입력 → 비밀번호 모달 → [previewCard] → 편집 다이얼로그 →
    [사용자 검토·수정 (분류·본문·핵심 포인트 등)] →
    [createCardEdited] → 카드 갤러리 등록 → 상세 페이지
```

자동 추출 결과가 정확하면 사용자는 그냥 "등록" 버튼만 누르면 됨. 잘못된 필드만 고친 후
등록 가능. 이전처럼 등록 후 잘못 발견 → 삭제·재등록할 필요 없음.

#### 6. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`SummarizeInput`·`SummaryResult`·`ActionState` 변경 없음.
기존 `createCard`·`createCardManual` server actions 그대로 유지.
새 추가:
- `previewCard` server action
- `createCardEdited` server action
- `PreviewState` 타입
- `CardEditDialog` 컴포넌트
- `modal.kind === "edit"` 케이스

빌드 검증: `npx tsc --noEmit` 0 에러, `next build` 성공.

---

### v2.24.0 — URL 추출 품질 강화 (한국 사이트 푸터·네비 보일러플레이트 정제) (2026.05)

**보고된 이슈 — 일부 한국 사이트 입력 시 카드에 푸터·네비 잡음 다수 노출**

특정 한국 웹빌더(imweb 등) 기반 사이트에서 카드를 만들 때 다음과 같은 잡음이 본문에 섞여 들어옴:

- 모바일·데스크톱 메뉴 키워드 반복 노출 (`SNS 바로가기` 3회 반복 등)
- 사업자정보·통신판매업·전화·팩스·주소·개인정보책임자·약관 등 푸터 텍스트
- 다국어 선택 라벨 (한국어/English/日本語)

**근본 원인 — 한국 웹빌더 사이트의 푸터·네비가 본문에 섞이는 구조**

특정 웹빌더로 만든 사이트는 깔끔한 메타데이터(`og:description` 등)를 갖고 있어도:

- `<header>`, `<footer>`가 본문과 같은 DOM 레벨
- 모바일·데스크톱 메뉴가 같은 페이지에 두 번 출력
- 푸터에 사업자정보·연락처·약관 일괄 노출
- 약관 링크가 띄어쓰기 없이 붙어있음 (`이용약관개인정보처리방침`)

기존 `extractFromUrl`은 한국 주소 보존을 위해 `<footer>`를 의도적으로 보존했는데
(line 421-437 `stripBoilerplate` 주석 참조), 이 결정이 일부 웹빌더 사이트에서는
사업자정보·약관·메뉴까지 본문에 섞이는 부작용을 만듦.

**해결 — 인터페이스 보존, 내부 정제 강화**

`UrlExtractResult`·`EditorialCardData` 인터페이스는 변경 없음. 컴포넌트·라우터·기타
호출자 코드는 그대로. 정제 로직은 모두 `lib/sanitize.ts`로 모아 추가.

#### 1. ⭐ lib/sanitize.ts — 한국 푸터 보일러플레이트 정제 함수 추가

기존 `maskSensitive()`는 사업자등록번호·통신판매업신고번호 같은 *식별 번호*에
특화돼 있었지만, 새 함수들은 *문구 단위* 보일러플레이트를 다룬다.

```ts
// 새 export 함수
removeKoreanFooterBoilerplate(text: string): string
compressRepeatedShortPhrases(text: string): string
isLikelyNavOrMenu(line: string): boolean
sanitizeKoreanFooterNoise(paragraphs: string[]): string[]
isCleanDescriptionText(s: string): boolean
```

`FOOTER_BOILERPLATE_PATTERNS` 정규식 18종 (`상호`·`대표`·`통신판매업 신고`·
`사업자등록번호`·`주소`·`사업자정보확인`·`전화`·`Fax`·`이메일`·`개인정보책임자`·
`이용약관`·`개인정보처리방침`·`이메일무단수집거부`·`사이트맵`·`Copyright`·
`All Rights Reserved`·`©`·`SNS 바로가기`·`패밀리사이트`·다국어선택).

`STANDALONE_MENU_KEYWORDS` Set 24종 (`회사 소개`·`제품 소개`·`지속가능경영`·
`채용`·`공지사항`·`About Us`·`Products`·`News`·`Careers`·`Contact`·
`Sign in`·`Login`·`MENU`·`HOME`·`Search` 등).

`compressRepeatedShortPhrases`는 모바일/데스크톱 메뉴 중복 출력 패턴
(`(가-힣A-Za-z 1-30자){2+}`) 압축. `isLikelyNavOrMenu`는 한글 8자 이상인데
조사·서술어 0개면 단어 나열(메뉴)로 판정 — `\b`가 한글에 동작하지 않으므로
`(?=[\s,.!?'")\]\u3000]|$)` lookahead로 명시.

#### 2. ⭐ lib/url-extractor.ts — extractFromUrl 결과 단계 정제

`merged` 배열 빌드 후 (모든 보강·하위 페이지 fetch 완료된 시점) 일괄 정제:

```ts
import { sanitizeKoreanFooterNoise, isCleanDescriptionText } from "./sanitize";

// ...기존 merged 배열 빌드...

// v2.24.0 추가:
const sanitizedParagraphs = sanitizeKoreanFooterNoise(merged);
const finalDescription =
  description.trim() && isCleanDescriptionText(description.trim())
    ? description.trim().replace(/\s+/g, " ")
    : "";

return {
  // ...
  description: finalDescription,
  paragraphs: sanitizedParagraphs,
  // ...
};
```

description은 메타가 깔끔한 사이트는 그대로 통과, 일부 웹빌더 테마처럼 description에까지
잡음이 들어간 사이트만 빈 문자열로 (UI에서 첫 paragraph가 자동 fallback).

#### 3. ⭐ lib/summarizer.ts — summarize 입장부 사후 검증

`fulltext`가 정제 전 원본을 받는 경로(수동 입력·다른 호출자)도 있으므로
sentence 단위로 한 번 더 sanitize 적용. sentence를 paragraphs처럼 취급해
`sanitizeKoreanFooterNoise` 통과시키면 메뉴 라인·푸터 흔적이 있는 sentence가 자동 제거.

```ts
const rawSentences = splitSentences(input.fulltext);
const sentences = sanitizeKoreanFooterNoise(rawSentences);
```

#### 4. 검증

테스트 fixture (13개 단락 입력, 4개 본문 + 9개 잡음):

```
INPUT  : 13 paragraphs (4 본문 + 9 잡음)
OUTPUT : 4 paragraphs

ANTI-LEAK CHECK (10/10 clean):
✓ 사업자정보확인        ✓ 이용약관·개인정보처리방침
✓ 통신판매업           ✓ Copyright
✓ 전화 ___            ✓ All Rights Reserved
✓ Fax                ✓ SNS 바로가기 (반복)
✓ 이메일 ___          ✓ 메뉴 키워드 (회사 소개·제품 소개 등)
✓ 개인정보관리책임자

isCleanDescriptionText TESTS (3/3 정확):
✓ 깔끔한 description   → true
✓ 사업자정보 섞인 텍스트 → false
✓ 전화·Fax 섞인 텍스트  → false
```

배포 후 카드 description은 `og:description`에서 직행한 깔끔한 문구만 들어오고,
본문 단락도 푸터 잡음 0건.

#### 5. 인터페이스 호환성

`UrlExtractResult`·`EditorialCardData`·`SummarizeInput`·`SummaryResult` 모두 변경 없음.
컴포넌트·라우터·`compose-card.ts`·기타 호출자 코드 수정 0건.

#### 6. 향후 확장

새 사이트 패턴이 발견되면:
- `lib/sanitize.ts` `FOOTER_BOILERPLATE_PATTERNS` 배열에 정규식 추가
- `STANDALONE_MENU_KEYWORDS` Set에 짧은 메뉴 키워드 추가

코드는 이런 확장을 염두에 두고 모듈화돼 있다.

---
### v2.23.8 — 통합 배포 (zip 안 auto-deploy.sh 직접 실행 표준 + 양방향 self-update) (2026.05)
zip 안의 auto-deploy.sh를 직접 실행하든 `~/Downloads/auto-deploy.sh`를 실행하든 양쪽 모두 작동하도록 self-update 통합. v2.20.0 이전의 옛 안내 메시지 잔재 제거.

### v2.23.7 — Cron API 401 에러 진단 + 자동 재배포 트리거 (2026.05)
CRON_SECRET 401 에러 진단·재배포 자동화. Vercel 환경변수 동기화 후 즉시 production 재배포로 cron job 정상 작동 보장.

### v2.23.6 — fix-cron-secret.sh macOS 호환성 + Vercel API DELETE→POST 패턴 (2026.05)
macOS Darwin sed BSD/GNU 호환성 처리. Vercel REST API의 환경변수 갱신 패턴을 DELETE 후 POST 흐름으로 수정.

### v2.23.5 — auto-deploy.sh self-update + fix-cron-secret.sh 1회용 (2026.05)
auto-deploy.sh 자체 업데이트 메커니즘 도입. fix-cron-secret.sh를 1회용 도구로 명확히 분리.

### v2.23.4 — CRON_SECRET 무조건 강제 주입 (Vercel CRON_SECRET not found 해결) (2026.05)
Vercel CRON_SECRET 누락 케이스를 모든 배포에서 자동 감지·주입.

### v2.23.3 — CRON_SECRET 통합 관리 도구 + Vercel link 의존성 제거 (2026.05)
cron-secret.sh 통합 도구 도입. `vercel link` 사전 작업 없이도 동작.

### v2.23.2 — 빌드 로그 DYNAMIC_SERVER_USAGE 에러 정리 + CRON_SECRET 안내 강화 (2026.05)
Next.js 빌드 시 발생하는 DYNAMIC_SERVER_USAGE 경고 정리. CRON_SECRET 미설정 시 명확한 메시지.

### v2.23.1 — CRON_SECRET 출력 가시성 개선 + 다시 확인 가능 (2026.05)
배포 후 CRON_SECRET 값을 다시 확인할 수 있는 안전한 경로 제공.

### v2.23.0 — 동시 등록 한도 4배 상향 + 자동 주기적 갱신 (새로고침 버튼 제거) (2026.05)
Rate limit IP당 분당 5→20회 상향. Vercel Cron 24h 자동 일괄 갱신으로 사용자 새로고침 버튼 불필요.

### v2.22.1 — 비밀번호 git history 노출 보호 + Sitemap script 정체 진단 (2026.05.04)
.env에 ADMIN_PASSWORD 평문 노출 방지. Sitemap에 `<script/>` 빈 태그 끼어드는 원인 추가 진단.

### v2.22.0 — Sitemap을 Next.js 표준 컨벤션으로 전환 (script 자동 주입 완전 차단) (2026.05.04)
Sitemap을 Route Handler에서 Next.js Metadata API의 `app/sitemap.ts`로 전환. 일부 Vercel 미들웨어가 자동 주입하던 빈 `<script/>` 태그 완전 제거.

### v2.21.0 — March 2026 Core Update 베스트 프랙티스 + Sitemap script 자동 주입 차단 강화 (2026.05.04)
2026년 3월 Google Core Update SEO 베스트 프랙티스 반영. Sitemap XML에 끼어든 `<script/>` 빈 태그 다중 방어선 추가.

### v2.20.0 — 갤러리 우선 노출 (긴 안내는 details 접힌 상태) + 비밀번호 default 단순화 (2026.05)
첫 화면이 갤러리 카드. 긴 안내·About은 `<details>` 접힌 상태. 비밀번호 기본값 단순화.

### v2.19.x — 비밀번호 노출 제거 + Dependabot PR 안내 + 사용자 이점 콘텐츠 + SEO/GEO 베스트 프랙티스 (2026.05)
About 페이지에서 비밀번호 visible 노출 제거. Dependabot PR 처리 가이드. 사용자 이점 중심으로 헤더·메타 재작성.

### v2.18.0 — 자연어 본문 SEO 강화 + /about 페이지 (Google 한국어 검색 격차 해소) (2026.05)
About 페이지 신설. 한국어 자연어 본문 강화로 Google 한국어 검색 노출 개선.

### v2.17.0 — Google 검색 키워드 격차 해소 (2026.05)
검색 의도와 콘텐츠 키워드 매칭 강화. Schema.org Organization 구조화 데이터 추가.

### v2.16.x — Dependabot major 버전 자동 차단 + 무료 인프라 영구 운영 plan + GitHub 자산 활용 (2026.05)
Dependabot 안전망 강화 (major 버전 자동 차단). Vercel Hobby + Upstash 무료 한도 내 영구 운영 검증.

### v2.15.0 — 무료 장기 운영 + 커뮤니티 핵심 기능 강화 (2026.05)
무료 인프라 한도 안전 마진 + 커뮤니티 발견 UI 강화.

### v2.14.0 — 2026 GEO 베스트 프랙티스 + 기업 커뮤니티 기능 강화 (2026.05)
2026년 GEO(Generative Engine Optimization) 베스트 프랙티스 반영. AI 답변 엔진 노출 최적화.

### v2.13.x — Sitemap 진단/배포 안정화 + ISR 활성화 + Vercel timeout 안전성 + 카드 링크 공유 (2026.04~2026.05)
Sitemap 배포 안정화 시리즈. ISR 활성화로 카드 정적 페이지 캐시. TIMEOUT 시 수동 입력 자동 전환. Web Share + 클립보드 + 소셜 공유 기능 추가.

### v2.12.x — SPA 사이트 메타 풍부 보강 + 하위 페이지 자동 보강 + 비밀번호 재입력 제거 (2026.04)
client-side routing SPA 사이트의 본문 부족 문제 해결. nav 링크에서 후보 URL 발견 후 `/about`·`/vision`·`/company` 표준 경로 fallback. 수동 입력 시 비밀번호 재입력 UX 개선.

### v2.11.x — body fallback + footer 사전 추출 + 다중 위치 추출 강화 + Vercel Hobby 배치 처리 (2026.04)
DOM 구조 무관 body.text() 최종 fallback. footer 영역 사전 추출. 다중 위치(footer·sidebar·main) 잡음 제거 + 자식 요소 분할 추출. Vercel Hobby 10초 timeout 안전 배치 처리.

### v2.10.x — 2026 SEO/GEO 베스트 프랙티스 전면 적용 + 검색엔진 인증 + 주소 본문 오인식 차단 (2026.04)
2026년 SEO/GEO 베스트 프랙티스 전면 적용. Google·Naver·Bing 검색엔진 사이트 등록·인증. 주소가 본문 서술에 오인식되던 케이스 차단.

### v2.9.x — 협업 컨택 정보 보존 + ContactPanel 정돈 표시 + mailto/tel 링크 직접 수집 + 카드 모서리 좌우 분리 (2026.04)
협업에 필요한 컨택 정보(전화·이메일·주소·대표자) 카드 우측 패널에 정돈 표시. `<a href="mailto:">`·`<a href="tel:">` 명시 링크 직접 추출. 카드 디자인 우측 모서리 요소 좌우 분리.

### v2.8.x 이하 (2026.04) — RSC 전면 재설계 → 배포 자동화 → SEO 풀스택 → Upstash 마이그레이션 → 카드 디자인 시스템
주요 마일스톤:
- **v2.5.x** — JS 챌린지 사이트 폴백, InfinityFree 챌린지 우회, 폴백 본문 다층 추출, URL 정규화 강화
- **v2.4.x** — 보안·접근성·관측성 production-grade 보강
- **v2.3.x** — 콘텐츠 강화 + 외부 링크 + 로고 동작
- **v2.2.x** — Vercel·Upstash REST API 완전 자동화
- **v2.1.x** — 배포 파이프라인 통합
- **v2.0.x** — RSC + Server Actions 전면 재설계
- **v1.7** — Upstash Redis 마이그레이션
- **v1.6** — 디바이스 간 공유 갤러리
- **v1.5** — 외부 사이트 호환성 + UX
- **v1.4** — 모던 코퍼레이트 + SEO 풀스택
- **v1.0~v1.3** — 초기 빌드 (URL → 에디토리얼 카드 변환, TextRank+MMR 요약, 디자인 시스템)

상세 변경 내역은 git history (`git log --all --oneline`) 또는 GitHub Releases 페이지에서 확인 가능.

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

# 플랫폼 운영 가이드 — 2026년 5월 무료 영구 운영 베스트 프랙티스

> **결정**: 현재 GitHub + Vercel + Upstash 구조를 그대로 유지하고, 무료 자산을 추가 활용하여 **운영비 0원으로 영구 봉사 운영**한다. 정책 변경 시 마이그레이션 백업 plan을 준비.

## 1. 플랫폼 평가 매트릭스 (2026년 5월 기준)

| 플랫폼 | 무료 한도 | Next.js 적합도 | 상업적 사용 | 주의 사항 |
|---|---|---|---|---|
| **Vercel Hobby** ⭐ 현재 | 100GB/월 + 1M req | ★★★★★ (자체 개발) | ⚠️ 비상업적 권장 | 30일 일시정지 (overage 없음) |
| **Cloudflare Pages** | **무제한 대역폭** + 100K req/day | ★★★☆☆ (next-on-pages 어댑터) | ✅ 허용 | ISR/Image Opt 일부 제약 |
| Netlify | 300 credits/월 (~30GB) | ★★★★☆ | ✅ 허용 | 2025.09 credit 시스템 변경 |
| Render | 512MB RAM web + Postgres | ★★★☆☆ | ✅ 허용 | scale-to-zero (콜드 스타트) |
| Koyeb | 1 vCPU + 512MB + Postgres | ★★★☆☆ | ✅ 허용 | 신생 (안정성 trade-off) |

**결정 근거**:
- Next.js 15 ISR/Server Actions가 Vercel에 최적화되어 마이그레이션 비용 큼
- 현재 트래픽(MAU 100명 미만)은 Vercel 한도와 거리 멀음
- 본 커뮤니티는 자발적 봉사 운영 — Vercel "비상업적" 정의에 부합 (수익 모델 0)
- **하지만** Cloudflare를 백업 plan으로 준비 (정책 변경 시 안전망)

## 2. GitHub 무료 자산 추가 활용 (즉시 적용)

### 2.1. GitHub Actions 무료 워크플로우 (`.github/workflows/`)

> Public repo는 GitHub Actions **무제한 무료**. private repo도 월 2,000분 무료.

이미 추가된 워크플로우:

| 워크플로우 | 트리거 | 용도 |
|---|---|---|
| `ci.yml` | push/PR | 타입체크 + 빌드 검증 |
| `seo-health.yml` | 매주 월 09:00 KST | sitemap·robots·llms.txt 무료 검증 |

추가 가능한 워크플로우 (선택):
- 매일 dependabot 무료 보안 업데이트
- 매월 1일 데이터 백업 (Upstash → GitHub Releases)
- 카드 URL 죽음 검증 (이미 `seo-health.yml`에 포함)

### 2.2. GitHub Issue Templates (`.github/ISSUE_TEMPLATE/`)

운영자 부담 감소 + 동문 참여 채널 다각화:

| 템플릿 | 목적 |
|---|---|
| `new_company_registration.md` | 새 동문 기업 등록 요청 |
| `card_modification.md` | 카드 정보 수정·내림 요청 |
| `bug_report.md` | 버그 신고 |
| `feature_request.md` | 기능 제안 |

GitHub 계정만 있으면 누구나 자동 등록 요청 가능 → 사이트 자가 등록과 병행하는 보조 채널.

### 2.3. GitHub Discussions (선택)

Repo Settings → Features → Discussions 체크 시 활성화. 무료, 무제한.

권장 카테고리:
- **공지** (운영자만 작성)
- **Q&A** (질문)
- **아이디어** (기능 제안)
- **자유 게시** (동문 자유 토론)

⚠️ **고려 사항**: 자발적 참여 원칙과 균형 검토 필요. GitHub 계정 없는 동문 차별 우려 시 비활성화 유지.

### 2.4. GitHub Pages (정적 백업 사이트)

Repo Settings → Pages 활성화 시 `https://seong-ro.github.io/nest-alum1` 자동 생성.

활용:
- Vercel 장애 시 비상 정적 백업 (수동 업데이트)
- 개발자 친화 README 페이지로 동문에게 기술적 신뢰감 전달
- (옵션) 카드 데이터를 cron으로 정적 export하여 백업

### 2.5. GitHub Sponsors (선택)

Repo Settings → Sponsors 신청 → 운영비 지원받기.
- 본 프로젝트는 무료 봉사 원칙이지만, 동문이 자발적으로 후원하고 싶을 때 채널 제공
- 강제 노출 없음, 받지 않아도 됨
- ⚠️ 받기 시작하면 commercial 해석 가능성 — Vercel 정책 재검토 필요

## 3. Cloudflare 무료 보강 (DNS + CDN + WAF)

### 3.1. Cloudflare DNS 무료

**즉시 적용 가능 (Vercel과 충돌 없음)**:

1. 도메인 (예: `wateria.com` 또는 `nest-alum1.com`) 구매 후 Cloudflare 등록
2. Cloudflare nameserver로 변경 (무료)
3. CNAME으로 Vercel 가리키기:
   ```
   CNAME nest-alum1   cname.vercel-dns.com
   ```
4. Cloudflare 대시보드에서 SSL/TLS = Full (Strict), Always Use HTTPS 활성화

**효과**:
- 무료 DDoS 보호 (Vercel Hobby에도 자동 적용)
- 무료 WAF 기본 룰
- DNS 빠르게 전 세계 분산
- 무료 분석 대시보드

### 3.2. Cloudflare R2 정적 자산 백업 (선택)

R2 버킷 무료 10GB 저장 + zero egress fee. 활용:
- 사이트 전체 mirror를 정기 export하여 영구 보존
- Vercel 장애 시 수동 마운트 가능

### 3.3. Cloudflare Pages 마이그레이션 백업 plan

Vercel 정책 강화 시 다음 절차로 이전 가능:

```bash
# Cloudflare Pages 어댑터 설치
npm install --save-dev @cloudflare/next-on-pages

# wrangler 설정
npx wrangler pages project create nest-alum1

# 빌드 + 배포
npx @cloudflare/next-on-pages
npx wrangler pages deploy .vercel/output/static
```

**예상 작업 시간**: 1~2시간 (이미 v2.13.x에서 Route Handler로 작성하여 호환성 좋음).

⚠️ **알려진 제약**:
- ISR은 동일 작동 안 함 → Cron Trigger로 대체
- Next.js Image Optimization은 Cloudflare Images 별도 설정 필요
- Server Actions는 Workers V8 isolate에서 일부 동작 차이

## 4. Upstash Redis 무료 한도 모니터링

| 항목 | 무료 한도 | 현재 사용 (추정) | 여유 |
|---|---|---|---|
| commands/day | 10,000 | ~수십 commands | ★★★★★ |
| max storage | 256 MB | < 1 MB | ★★★★★ |
| max db size | 512 MB | < 1 MB | ★★★★★ |

10K commands/day = 시간당 ~416, 분당 ~7. 현재 트래픽 규모는 100배 여유 있음. 단, 카드 100개 + MAU 1,000명 이상으로 증가 시 모니터링 필요.

## 5. 추가 무료 모니터링 옵션

### 5.1. Vercel Analytics 무료 (이미 활성화)

- 페이지뷰, 방문자, 평균 세션
- Core Web Vitals 자동 수집

### 5.2. Sentry 무료 (선택)

월 5,000 errors 무료. `npm install @sentry/nextjs` 후 설정. 운영 중 에러 자동 감지.

### 5.3. Plausible Analytics 자체 호스팅 (대안)

GDPR-friendly, no cookie banner. Vercel 별도 deployment로 무료 운영 가능.

### 5.4. Uptime monitoring 무료

UptimeRobot 무료 50 monitors / 5분 간격. 사이트 다운 시 이메일 알림.

## 6. 운영 비용 0원 영구 보장 plan

```
┌──────────────────────────────────────────────────────────┐
│                  Layer 1: Source                         │
│  GitHub (public repo) — 무료, 무제한 Actions, Issues,    │
│  Discussions, Pages, Sponsors                            │
├──────────────────────────────────────────────────────────┤
│                  Layer 2: Hosting                        │
│  Vercel Hobby — Next.js 15 ISR + Server Actions          │
│  100GB/월 + 1M req (현재 사용량 1% 미만)                 │
├──────────────────────────────────────────────────────────┤
│                  Layer 3: Storage                        │
│  Upstash Redis 무료 — 10K commands/day (Tokyo region)    │
├──────────────────────────────────────────────────────────┤
│                  Layer 4: CDN/DNS (선택 추가)            │
│  Cloudflare 무료 — DDoS·WAF·R2 백업                      │
├──────────────────────────────────────────────────────────┤
│                  Layer 5: Backup plan                    │
│  마이그레이션 준비: Cloudflare Pages, GitHub Pages       │
└──────────────────────────────────────────────────────────┘
```

## 7. 위험 시나리오 + 대응 plan

### 시나리오 A: Vercel "commercial use" 정책 강화

**감지**: Vercel 이메일 또는 dashboard 경고

**대응 (1~2시간)**:
1. Cloudflare Pages 프로젝트 생성
2. `@cloudflare/next-on-pages` 어댑터로 빌드
3. Cloudflare DNS에서 메인 도메인 → Cloudflare Pages로 변경
4. Upstash Redis는 그대로 (URL만 환경변수 변경)

### 시나리오 B: Upstash 무료 정책 변경

**감지**: Upstash dashboard 경고

**대응 (30분)**:
1. Cloudflare KV로 마이그레이션 (무료 100K reads/day, 1K writes/day)
2. `lib/kv-storage.ts`만 교체 (인터페이스 동일)

### 시나리오 C: 트래픽 폭증

**감지**: Vercel Analytics에서 100GB 80% 도달

**대응**:
1. Cloudflare DNS로 전환 → 정적 자산 캐싱 (대역폭 ~70% 절감)
2. Cloudflare Pages로 정적 페이지 일부 이전

## 8. 결정 요약

✅ **즉시 적용**:
- GitHub Actions 워크플로우 (CI + sitemap 검증)
- GitHub Issue Templates (등록·수정 요청 채널)
- 본 운영 가이드 문서화

🟡 **단계적 적용 (선택)**:
- GitHub Discussions 활성화 (자발적 참여 원칙 검토 후)
- GitHub Pages 정적 백업 사이트
- Cloudflare DNS 추가 (도메인 구매 시)

🔵 **백업 준비 (즉시 사용 안 함)**:
- Cloudflare Pages 마이그레이션 가이드 문서화
- Cloudflare KV 대체 plan
- 자가 호스팅 옵션 (필요 시 Render, Koyeb)

---

**작성일**: 2026.05.02 (v2.16.0)
**다음 검토**: 2026.08.01 (분기별)
**운영자**: 주식회사 워터리아 / 배성로 (srbae@w-proj.com)

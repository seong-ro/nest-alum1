# 🔄 macOS 데이터 없이 Windows로 전환 (v2.55.2)

> **상황**: macOS는 일시적으로 못 쓰는 상태. Windows에서 새로 시작하지만,
> 기존 GitHub repo·Vercel 프로젝트·Upstash DB는 그대로 사용하고 싶음.

> **결론**: **macOS에서 아무것도 가져올 필요 없음**. Vercel Dashboard에 모든
> 환경변수가 저장돼있어 `vercel pull` 명령 하나로 자동 다운로드됩니다.

---

## ⭐ 핵심 인사이트 — Vercel = 진실의 원천 (Single Source of Truth)

```
                    ┌─────────────────────────┐
                    │  Vercel Dashboard       │
                    │  (모든 환경변수 저장됨)  │
                    └──────────┬──────────────┘
                               │
                  vercel pull ↓
                               │
                ┌──────────────┴──────────────┐
                │  Windows .env.local         │
                │  (자동 다운로드)             │
                └─────────────────────────────┘
```

### Vercel에 이미 저장된 환경변수 (자동 다운로드 대상)

- ✅ `ADMIN_PASSWORD`
- ✅ `ADMIN_DASHBOARD_PASSWORD`
- ✅ `UPSTASH_REDIS_REST_URL`
- ✅ `UPSTASH_REDIS_REST_TOKEN`
- ✅ `NEXT_PUBLIC_SITE_URL`
- ✅ `INDEXNOW_KEY` (있다면)
- ✅ `GITHUB_REPO` (있다면)
- ⚠️ `GITHUB_TOKEN` — Sensitive로 저장되면 vercel pull 시 마스킹됨 → 새로 발급 필요

---

## 🚀 5분 마이그레이션 — vercel pull 자동화

### 1. Windows에서 zip 풀기

```
C:\Users\Home\Downloads\folio-cards.zip 우클릭 → "압축 풀기"
→ C:\Users\Home\Downloads\folio-cards\ 생성
```

### 2. `deploy-windows.bat` 더블클릭

스크립트가 자동으로 다음을 진행:

```
1단계: 도구 자동 설치 (Git, Node.js, GitHub CLI, Vercel CLI) — 5분
2단계: npm install
3단계: (placeholder — 환경변수는 8단계에서 자동 처리)
4단계: GitHub 인증 (브라우저 OAuth) — 30초
5단계: GitHub repo 연결
       → "기존 GitHub repo URL" 입력: https://github.com/seong-ro/nest-alum1.git
       → [1] Windows 코드 push 선택
6단계: Vercel 인증 (브라우저 OAuth) — 30초
7단계: Vercel 프로젝트 link
       → 'Link to existing project?' Y
       → 'name?' nest-alum1
8단계: ⭐ Vercel 환경변수 자동 다운로드 (vercel pull --yes)
       → .env.local 자동 생성됨
9단계: 누락 변수 검사 + 입력 (있다면)
10단계: Vercel push (누락 변수만)
11단계: vercel deploy --prod → 배포 URL 출력
```

### 3. 끝

배포 완료. 기존 데이터 + 검색엔진 등록 + 도메인 모두 그대로.

---

## 📋 화면 안내 (실제 출력 예시)

### 8단계 — Vercel 환경변수 자동 다운로드

```
>>> 8단계: Vercel 환경변수 자동 다운로드 (vercel pull)

─────────────────────────────────────────────────
  🌟 macOS .env.local 없이 환경변수 자동 가져오기
─────────────────────────────────────────────────
Vercel Dashboard에 저장된 모든 환경변수를 .env.local로
자동 다운로드합니다. macOS에서 파일 가져올 필요 X.

> Downloading `production` Environment Variables for Project nest-alum1
> Created .env.production.local file

  ✓ Vercel에서 환경변수 자동 다운로드 완료 → .env.local
```

### 9단계 — 누락 변수 검사

```
>>> 9단계: 환경변수 검토 + 누락 항목 보완

  ✓ ADMIN_PASSWORD: Vercel에서 자동 가져옴
  ✓ ADMIN_DASHBOARD_PASSWORD: Vercel에서 자동 가져옴
  ✓ UPSTASH_REDIS_REST_URL: Vercel에서 자동 가져옴
  ✓ UPSTASH_REDIS_REST_TOKEN: Vercel에서 자동 가져옴
  ✓ NEXT_PUBLIC_SITE_URL: Vercel에서 자동 가져옴

(누락 변수 0개 → 9단계 자동 skip)
```

만약 누락된 변수가 있으면:
```
⚠️ 누락된 환경변수 1개 — 직접 입력 필요

GITHUB_TOKEN — 시점 복원용 PAT (Vercel pull로 안 가져와지면 새로 발급 필요): _
```

---

## 🔑 GITHUB_TOKEN만 새로 발급해야 하는 이유

GitHub Personal Access Token은 **한 번 발급된 후 다시 볼 수 없어**, Vercel에 Sensitive로 저장되면 `vercel pull`로도 plain text 못 가져옵니다.

### 옵션 A — 기존 토큰 그대로 사용 (Vercel에 이미 있음, 추가 작업 X)

자동 백업·시점 복원이 정상 작동했다면, 이미 Vercel에 GITHUB_TOKEN이 있습니다.
새 PAT 발급 안 해도 작동 (Vercel 빌드 시점에 환경변수가 inline됨).

→ Vercel Dashboard → Settings → Environment Variables에서 GITHUB_TOKEN 존재 확인

### 옵션 B — 새 PAT 발급 (Vercel pull로 안 받아진 경우)

[GitHub PAT 발급 페이지 ↗](https://github.com/settings/personal-access-tokens/new)

```
Token name: folio-cards-windows
Expiration: 1년
Repository access: Only select repositories → nest-alum1
Permissions:
  - Actions: Read and write
  - Contents: Read and write
  - Metadata: Read-only (자동)

[Generate token] → github_pat_... 복사
```

스크립트 9단계에서 입력 또는 Vercel Dashboard에 직접 추가 → Redeploy.

### 옵션 C — 시점 복원 기능 안 쓰면 GITHUB_TOKEN 불필요

자동 백업 + admin 대시보드의 카드별 시점 복원 기능을 안 쓸 거면, GITHUB_TOKEN은
없어도 사이트는 정상 작동합니다.

---

## 🎯 마이그레이션 시나리오 비교

| 시나리오 | 소요 시간 | 사용자 입력 | 추천도 |
|---|---|---|---|
| **A. vercel pull 자동 (이 가이드)** | 5분 | OAuth 2회만 | ⭐⭐⭐⭐⭐ |
| B. 환경변수 직접 입력 | 10분 | 5~8개 변수 | ⭐⭐ |
| C. macOS USB 복사 | 10분 | USB 작업 + 입력 | ⭐ (불필요) |
| D. 새 시작 (모든 자원 신규) | 20분 | 전체 재발급 | (PC 잃어버린 경우만) |

---

## ⚠️ 주의사항

### 1. Vercel pull은 production environment 기준

기본적으로 production 환경의 환경변수를 다운로드합니다. development/preview에서
다른 값을 쓰는 경우, 다음 옵션:

```bash
vercel pull .env.local --environment=development
# 또는
vercel pull .env.local --environment=preview
```

### 2. Sensitive 변수는 마스킹

Vercel에서 "Sensitive" 체크된 변수(GITHUB_TOKEN 등)는 vercel pull 시 plain text가
아닌 마스킹된 값으로 다운로드될 수 있습니다. 이 경우 새 값으로 덮어써야 함.

### 3. .env.production.local은 .gitignore에 있음

vercel pull 후 `.env.production.local` 파일이 생성되는데, `.gitignore`에 이미 포함되어
GitHub에 commit되지 않습니다. 안전.

### 4. Vercel 프로젝트 link 단계가 핵심

`'Link to existing project?'`에서 **반드시 Y**를 선택해야 macOS 환경변수와 연결됩니다.
N(새 프로젝트)을 선택하면 빈 상태로 새로 시작.

---

## 🔧 문제 해결

### "vercel pull failed — No project linked"

→ 7단계 vercel link를 먼저 완료해야 함.

### Vercel 환경변수가 비어있음

→ macOS에서 환경변수를 Vercel에 push한 적 없는 경우. 수동 입력 모드로 진행.

### "Permission denied" 또는 "Not authorized"

→ vercel login에서 macOS와 다른 계정으로 로그인했을 가능성. 재로그인:
```powershell
vercel logout
vercel login
```
브라우저에서 같은 계정 선택.

### GITHUB_TOKEN이 마스킹돼있음

→ 새 PAT 발급 (옵션 B) 또는 시점 복원 기능 포기 (옵션 C).

---

## 📞 도움이 필요하면

- 이 가이드와 함께 `scripts/windows/README-WINDOWS.md` (일반 사용 가이드) 참조
- README.md의 변경 이력 v2.55.2 changelog 참조
- `/admin` 대시보드의 인앱 가이드 활용

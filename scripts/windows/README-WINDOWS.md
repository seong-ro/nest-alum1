# 🪟 Windows 원클릭 자동 배포 가이드 (v2.55.0)

> Windows PC에서 GitHub 연결부터 Vercel 배포까지 **완전 자동**.
> 더블클릭 한 번이면 끝납니다.

> **v2.55.0 변경**: BAT 파일명을 `deploy-windows.bat`로 변경 (한글 파일명 인코딩
> 문제 회피) + UTF-8 BOM/CRLF 정확히 적용 (CP949 환경에서도 한글 깨짐 방지).

---

## ⚡ 30초 시작 (가장 간단)

### 1단계 — zip 다운로드 + 풀기

1. Claude로부터 받은 `folio-cards.zip`을 `C:\Users\Home\Downloads\` 폴더에 저장
2. zip 우클릭 → "압축 풀기" → `C:\Users\Home\Downloads\folio-cards\` 생성

### 2단계 — 더블클릭

1. `C:\Users\Home\Downloads\folio-cards\` 안의 **`deploy-windows.bat`** 더블클릭
2. (관리자 권한 요청 시 "예" 클릭)

### 3단계 — 화면 안내 따라 입력

스크립트가 다음을 자동으로 수행합니다:
1. ✅ 필수 도구 자동 설치 (Git, Node.js, GitHub CLI, Vercel CLI)
2. ✅ npm 의존성 설치
3. ✅ 환경변수 입력 (인터랙티브)
4. ✅ GitHub 인증 + repo 자동 생성
5. ✅ git push
6. ✅ Vercel 인증 + 환경변수 등록 + 프로덕션 배포
7. ✅ 배포 URL 출력 + 브라우저 자동 오픈

**총 소요 시간**: 처음이면 5~10분 (도구 설치 시간 포함), 재배포는 1~2분.

---

## 📋 사전 준비 (한 번만)

### Upstash Redis 계정 생성 (KV 저장소)

1. https://console.upstash.com/login 접속
2. 무료 가입 (Google 계정 가능)
3. **Create Database** → 이름: `nest-alum1-gallery`, 리전: `ap-northeast-1` (Tokyo) 권장
4. **REST API** 탭에서 다음 두 값 복사:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### GitHub 계정 (있으면 OK)

스크립트가 브라우저 OAuth로 자동 인증.

### Vercel 계정 (있으면 OK)

스크립트가 브라우저로 자동 인증. GitHub 계정으로 가입 가능.

---

## 🤖 입력할 환경변수 (스크립트가 물어봅니다)

| 변수 | 값 | 비고 |
|---|---|---|
| `ADMIN_PASSWORD` | 카드 등록·수정·삭제 비밀번호 | 자유롭게 정함 (예: `4자리 숫자`) |
| `ADMIN_DASHBOARD_PASSWORD` | 관리자 대시보드 전용 | **위와 다른 값** 권장 |
| `UPSTASH_REDIS_REST_URL` | `https://...upstash.io` | Upstash에서 복사 |
| `UPSTASH_REDIS_REST_TOKEN` | `Auxxx...` | Upstash에서 복사 |
| `NEXT_PUBLIC_SITE_URL` | `https://nest-alum1.vercel.app` | 배포 후 자동 결정됨 (Enter로 기본값 사용) |

### 선택 환경변수 (Enter로 건너뛰기 가능)

| 변수 | 값 | 효과 |
|---|---|---|
| `INDEXNOW_KEY` | 8-128자 hex/dash 임의 문자열 | Bing/Naver 즉시 인덱싱 |
| `GITHUB_REPO` | `yourname/nest-alum1` | 시점 복원·자동 백업 |
| `GITHUB_TOKEN` | `github_pat_...` | 시점 복원·자동 백업 |

---

## 🔧 수동 배포 (스크립트 없이)

스크립트 사용을 원치 않으면:

### 1. 도구 설치

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install GitHub.cli
npm install -g vercel
```

### 2. 프로젝트 풀기 + 의존성

```powershell
cd C:\Users\Home\Downloads
Expand-Archive folio-cards.zip .
cd folio-cards
npm install
```

### 3. .env.local 작성

`.env.local` 파일을 메모장으로 생성:
```
ADMIN_PASSWORD=<카드용 비밀번호>
ADMIN_DASHBOARD_PASSWORD=<대시보드용 비밀번호>
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SITE_URL=https://nest-alum1.vercel.app
```

### 4. GitHub + Vercel

```powershell
gh auth login
git init -b main
git add .
git commit -m "initial deploy"
gh repo create nest-alum1 --private --source=. --remote=origin
git push -u origin main

vercel login
vercel link
vercel deploy --prod
```

---

## 🚨 문제 해결

### winget이 없다고 나옵니다

Windows 10 1809+ / Windows 11에서 사용 가능. Microsoft Store에서 "App Installer" 업데이트.
또는 [수동 다운로드](https://github.com/microsoft/winget-cli/releases).

### `gh auth login` 실패

수동 인증:
```powershell
gh auth login --web
```
브라우저가 열리면 GitHub 로그인 → 권한 허용.

### `vercel deploy` 실패 — environment variables not set

Vercel Dashboard에서 직접 추가:
1. https://vercel.com/dashboard
2. 프로젝트 → Settings → Environment Variables
3. 위 표의 변수들 추가
4. Deployments → Redeploy

### "Cannot create repo" 에러

GitHub 계정이 무료 플랜이면 private repo 무제한 가능. 동명 repo가 이미 있으면 다른 이름 사용.

### npm install 실패

Node.js 22 이상 필요. 확인:
```powershell
node --version
```
v22 미만이면 [nodejs.org](https://nodejs.org/)에서 LTS 다운로드.

---

## 🎯 배포 후 다음 단계

1. **카드 등록 테스트**: 메인 페이지 → 동문 사이트 URL 입력 → 카드 생성 확인
2. **관리자 대시보드 확인**: `/admin` → 비밀번호 입력 → 카드 목록·시점 복원 작동 확인
3. **검색엔진 등록**:
   - [Naver Search Advisor](https://searchadvisor.naver.com/) — 사이트 등록 + sitemap 제출
   - [Google Search Console](https://search.google.com/search-console) — 동일
   - [Bing Webmaster Tools](https://www.bing.com/webmasters) — 동일 (IndexNow 자동 동작)
4. **첫 자동 백업 트리거**: GitHub → Actions → "Daily Card Backup" → Run workflow
5. **GitHub Secret 추가**: GitHub repo → Settings → Secrets → `ADMIN_DASHBOARD_PASSWORD` (Vercel과 같은 값)

---

## 🔄 재배포 (코드 변경 후)

```powershell
cd C:\Users\Home\Downloads\folio-cards
git add .
git commit -m "update"
git push
# Vercel은 push 자동 감지 → 자동 배포 시작
```

또는 강제 즉시 배포:
```powershell
vercel deploy --prod
```

---

## 📞 도움이 필요하면

- [GitHub Issues](https://github.com/your-repo/issues)
- README.md의 변경 이력 (Changelog) 참조
- 관리자 대시보드 (`/admin`)의 인앱 가이드 활용

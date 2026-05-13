# ============================================================
#  Folio Cards — Windows 원클릭 자동 배포 PowerShell 스크립트
#  v2.55.0 (2026.05)
#
#  동작:
#   1. 필수 도구 자동 설치 (winget 사용 — Windows 10 1809+ / Win 11)
#      - Git, Node.js LTS, GitHub CLI (gh)
#   2. npm으로 Vercel CLI 설치
#   3. GitHub 인증 (gh auth login — 브라우저 OAuth)
#   4. GitHub repo 생성 또는 연결
#   5. 환경변수 인터랙티브 입력 → .env.local + Vercel env vars
#   6. git push origin main
#   7. Vercel 프로젝트 연결 + 배포
#   8. 첫 배포 URL 출력 + 검증
#
#  사용:
#   deploy-windows.bat 더블클릭 (관리자 권한 자동 요청)
#   또는 PowerShell에서:
#     powershell -ExecutionPolicy Bypass -File scripts\windows\deploy-windows.ps1
# ============================================================

# v2.55.5: 콘솔 인코딩을 UTF-8로 강제 설정 (한글 깨짐 방지)
# Windows PowerShell 5.1은 기본이 CP949인데, UTF-8로 바꿔야 한글 정상 출력.
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 > $null
} catch {
    # 무시 — 인코딩 변경 실패해도 진행 (영어 출력이라도 작동)
}

# v2.55.5 핵심 fix: ErrorActionPreference를 Continue로 설정
# 이유: PowerShell 5.1은 $ErrorActionPreference = "Stop"일 때 native command의
# stderr 출력을 RemoteException으로 변환하여 스크립트를 강제 종료시킴.
# gh/vercel/npm 등이 정상 동작 중에도 stderr에 정보 메시지를 출력하면 종료됨.
# Continue로 설정하면 native stderr는 단순 출력으로 처리되고,
# LASTEXITCODE로 명시적으로 성공/실패를 판별.
$ErrorActionPreference = "Continue"

# PowerShell 7.3+: native command에서 ErrorActionPreference 무시 (5.1에서는 무시됨)
try {
    $PSNativeCommandUseErrorActionPreference = $false
} catch {
    # PS 5.1에서 이 변수 없음 — 무시
}

# ── 색상 출력 헬퍼 ─────────────────────────────────────
function Write-Step { param($Msg) Write-Host ">>> " -ForegroundColor Cyan -NoNewline; Write-Host $Msg }
function Write-Ok   { param($Msg) Write-Host "  ✓ " -ForegroundColor Green -NoNewline; Write-Host $Msg }
function Write-Warn { param($Msg) Write-Host "  ⚠ " -ForegroundColor Yellow -NoNewline; Write-Host $Msg }
function Write-Err  { param($Msg) Write-Host "  ✗ " -ForegroundColor Red -NoNewline; Write-Host $Msg }
function Write-Info { param($Msg) Write-Host "    " -NoNewline; Write-Host $Msg -ForegroundColor Gray }

function Show-Banner {
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  Folio Cards — Windows 원클릭 배포 v2.54.0" -ForegroundColor Magenta
    Write-Host "  Start-up NEST Alumni 1기 동문 갤러리" -ForegroundColor Magenta
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host ""
}

Show-Banner

# ── 1. 작업 디렉토리 결정 ─────────────────────────────────────
Write-Step "1단계: 프로젝트 디렉토리 설정"
$DefaultDir = "C:\Users\Home\Downloads\folio-cards"
$ProjectDir = $DefaultDir

if (-not (Test-Path $ProjectDir)) {
    # zip 자동 탐색
    $ZipPath = "C:\Users\Home\Downloads\folio-cards.zip"
    if (Test-Path $ZipPath) {
        Write-Info "folio-cards.zip 발견 — 자동으로 풀고 있어요..."
        Expand-Archive -Path $ZipPath -DestinationPath "C:\Users\Home\Downloads\" -Force
        Write-Ok "압축 해제 완료: $ProjectDir"
    } else {
        Write-Err "프로젝트를 찾을 수 없습니다."
        Write-Info "C:\Users\Home\Downloads\folio-cards.zip 또는 C:\Users\Home\Downloads\folio-cards\ 폴더가 있어야 합니다."
        Write-Info "Claude로부터 받은 zip 파일을 다운로드 폴더에 두고 다시 실행해 주세요."
        exit 1
    }
} else {
    Write-Ok "프로젝트 디렉토리 확인: $ProjectDir"
}

Set-Location $ProjectDir

# ── 2. 필수 도구 자동 설치 ─────────────────────────────────────
Write-Step "2단계: 필수 도구 확인 및 자동 설치"

# winget 확인
$HasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
if (-not $HasWinget) {
    Write-Warn "winget이 없습니다. 도구를 자동 감지합니다..."
    Write-Info "Windows 10 1809+/Windows 11에서 winget 사용 가능."
    Write-Info "https://www.microsoft.com/store/productId/9NBLGGH4NNS1"
    Write-Info ""
    Write-Info "필수 도구가 이미 설치되어 있는지 확인 중..."

    # v2.55.4: 자동 감지 — Read-Host 제거
    $missingTools = @()
    foreach ($cmd in @("git", "node", "gh")) {
        if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
            $missingTools += $cmd
        }
    }
    if ($missingTools.Count -gt 0) {
        Write-Err "다음 도구가 없습니다: $($missingTools -join ', ')"
        Write-Info "수동 설치 후 스크립트를 다시 실행해 주세요:"
        Write-Info "  Git:        https://git-scm.com/download/win"
        Write-Info "  Node.js:    https://nodejs.org/ (LTS)"
        Write-Info "  GitHub CLI: https://cli.github.com/"
        exit 1
    }
    Write-Ok "필수 도구 모두 감지됨 — 자동 진행"
}

function Install-IfMissing {
    param($Cmd, $WingetId, $Name)
    if (Get-Command $Cmd -ErrorAction SilentlyContinue) {
        Write-Ok "$Name 이미 설치됨"
        return
    }
    if (-not $HasWinget) {
        Write-Err "$Name 가 없고 winget도 없어 자동 설치 불가."
        exit 1
    }
    Write-Info "$Name 설치 중... (winget install $WingetId)"
    & winget install --id $WingetId --silent --accept-package-agreements --accept-source-agreements 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "$Name 설치 실패 — 수동 설치 필요."
        exit 1
    }
    Write-Ok "$Name 설치 완료"
    # PATH 업데이트 (현재 세션에 적용)
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Install-IfMissing -Cmd "git" -WingetId "Git.Git" -Name "Git"
Install-IfMissing -Cmd "node" -WingetId "OpenJS.NodeJS.LTS" -Name "Node.js LTS"
Install-IfMissing -Cmd "gh" -WingetId "GitHub.cli" -Name "GitHub CLI"

# Vercel CLI는 npm으로
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Info "Vercel CLI 설치 중... (npm i -g vercel)"
    & npm install -g vercel 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Vercel CLI 설치 실패"
        exit 1
    }
    Write-Ok "Vercel CLI 설치 완료"
} else {
    Write-Ok "Vercel CLI 이미 설치됨"
}

# 버전 출력 (stderr 출력 방지)
Write-Host ""
Write-Info "도구 버전:"
$gitVer    = (& git --version 2>$null) -join " "
$nodeVer   = (& node --version 2>$null) -join " "
$npmVer    = (& npm --version 2>$null) -join " "
$ghVer     = (& gh --version 2>$null | Select-Object -First 1) -join " "
$vercelVer = (& vercel --version 2>$null) -join " "
Write-Info "  Git:    $gitVer"
Write-Info "  Node:   $nodeVer"
Write-Info "  npm:    v$npmVer"
Write-Info "  gh:     $ghVer"
Write-Info "  vercel: v$vercelVer"

# ── 3. npm 의존성 설치 ─────────────────────────────────────
Write-Step "3단계: npm 의존성 설치"
if (-not (Test-Path "node_modules")) {
    & npm install --no-fund --no-audit 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install 실패"
        exit 1
    }
    Write-Ok "node_modules 설치 완료"
} else {
    Write-Ok "node_modules 이미 존재"
}

# ── 4. 환경변수 처리 (vercel pull 자동화 — v2.55.2) ─────────────────────────────────────
#
# 흐름이 v2.55.1과 다릅니다:
#   v2.55.1: 환경변수 입력 → GitHub → Vercel
#   v2.55.2: GitHub → Vercel link → vercel pull (자동 다운로드) → 검토 → 배포
#
# 이유: Vercel Dashboard에 모든 환경변수가 이미 저장돼있으므로,
# 기존 프로젝트에 link만 하면 vercel pull로 .env.local 자동 생성 가능.
# macOS에서 .env.local 가져올 필요가 없어짐.

# 이 단계는 잠시 후 GitHub + Vercel link 후에 실제로 처리됩니다.
# 여기서는 placeholder 변수만 정의:
$EnvFile = ".env.local"

    # .env.local 작성
# ── 5. GitHub 인증 + repo 연결 ─────────────────────────────────────
Write-Step "5단계: GitHub 인증 + repo 연결"

# gh 인증 상태 확인 (stderr 출력을 무시하고 exit code만 검사)
$null = & gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Info "GitHub 인증이 필요합니다. 브라우저가 열리면 로그인해 주세요..."
    Write-Info "(macOS에서 사용하던 같은 GitHub 계정으로 로그인하세요)"
    & gh auth login --web --git-protocol https
    if ($LASTEXITCODE -ne 0) {
        Write-Err "GitHub 인증 실패"
        exit 1
    }
}
Write-Ok "GitHub 인증 완료"

# Git 저장소 확인 또는 초기화
if (-not (Test-Path ".git")) {
    Write-Info "Git 저장소 초기화..."
    & git init -b main 2>&1 | Out-Null
    Write-Ok "Git 저장소 초기화"
}

# v2.55.5: git config user.name/email 자동 설정 (gh CLI 인증 정보 활용)
# Windows에서 git이 처음이라 user 미설정 시 commit 실패 방지.
$gitUserName = & git config --global user.name 2>$null
$gitUserEmail = & git config --global user.email 2>$null
if ([string]::IsNullOrWhiteSpace($gitUserName) -or [string]::IsNullOrWhiteSpace($gitUserEmail)) {
    Write-Info "Git user 정보 자동 설정 (gh CLI에서 가져옴)..."
    $ghUser = & gh api user 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($ghUser -and $ghUser.login) {
        $autoName = if ($ghUser.name) { $ghUser.name } else { $ghUser.login }
        $autoEmail = if ($ghUser.email) {
            $ghUser.email
        } else {
            "$($ghUser.id)+$($ghUser.login)@users.noreply.github.com"
        }
        & git config --global user.name $autoName 2>&1 | Out-Null
        & git config --global user.email $autoEmail 2>&1 | Out-Null
        Write-Ok "Git user 자동 설정: $autoName <$autoEmail>"
    } else {
        # fallback — 임시 값 (실제 GitHub 메일 사용 권장)
        & git config --global user.name "folio-cards-deploy" 2>&1 | Out-Null
        & git config --global user.email "folio-cards@example.com" 2>&1 | Out-Null
        Write-Warn "gh user 정보 못 가져옴 — 임시 값 사용"
    }
}

# .gitignore 확인
if (-not (Test-Path ".gitignore")) {
    @"
node_modules/
.next/
.vercel/
.env.local
.env.*.local
*.log
.DS_Store
"@ | Set-Content -Path ".gitignore"
    Write-Ok ".gitignore 생성"
}

# remote origin 확인 또는 생성
$hasOrigin = & git remote get-url origin 2>$null
if (-not $hasOrigin -or $LASTEXITCODE -ne 0) {
    # v2.55.3: 자동 진행 — 기본 repo URL hardcode로 사용자 입력 0
    $DEFAULT_REPO_URL = "https://github.com/seong-ro/nest-alum1.git"

    Write-Info ""
    Write-Info "─────────────────────────────────────────────────"
    Write-Info "  📦 GitHub repo 자동 연결"
    Write-Info "─────────────────────────────────────────────────"
    Write-Info "기본 repo: $DEFAULT_REPO_URL"
    Write-Info "(자동 진행 — 사용자 입력 불필요)"
    Write-Info ""

    & git remote add origin $DEFAULT_REPO_URL 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Remote 추가 실패"
        exit 1
    }
    Write-Ok "기존 repo 자동 연결: $DEFAULT_REPO_URL"
    Write-Info "Windows 코드를 push합니다 (다음 단계에서 자동)."
} else {
    Write-Ok "GitHub remote 이미 설정: $hasOrigin"
}

# 첫 commit (변경사항 있으면)
& git add . 2>&1 | Out-Null
$hasChanges = & git status --porcelain 2>$null
if ($hasChanges) {
    Write-Info "변경사항 commit 중..."
    # v2.55.7: package.json에서 버전을 동적으로 읽어 commit 메시지에 사용
    $pkgVersion = "unknown"
    if (Test-Path "package.json") {
        try {
            $pkgJson = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($pkgJson.version) { $pkgVersion = $pkgJson.version }
        } catch { }
    }
    & git commit -m "deploy: v$pkgVersion 자동 배포" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Commit 완료"
    } else {
        Write-Warn "Commit 실패 — 진행 가능"
    }
}

# Push (stderr 출력 무시)
Write-Info "GitHub에 push 중..."
$null = & git push -u origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "push 실패 — 강제 push를 시도합니다"
    $null = & git push -u origin main --force 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Err "GitHub push 실패 — 권한 또는 네트워크 문제"
        exit 1
    }
}
Write-Ok "GitHub push 완료"

# ── 6. Vercel 인증 + link + vercel pull 자동화 ─────────────────────────────────────
Write-Step "6단계: Vercel 인증 + 기존 프로젝트 link"

# Vercel 인증 확인 (stderr 출력 무시)
$null = & vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Info "Vercel 인증이 필요합니다. 브라우저가 열리면 로그인해 주세요..."
    Write-Info "(macOS에서 사용하던 같은 Vercel 계정으로 로그인하세요)"
    & vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Vercel 인증 실패"
        exit 1
    }
}
$vercelUser = (& vercel whoami 2>$null) | Out-String
Write-Ok "Vercel 인증 완료: $($vercelUser.Trim())"

# Vercel 프로젝트 link (없으면 생성) — v2.55.3: 완전 자동화
if (-not (Test-Path ".vercel")) {
    $DEFAULT_PROJECT_NAME = "nest-alum1"

    Write-Info ""
    Write-Info "─────────────────────────────────────────────────"
    Write-Info "  📦 Vercel 프로젝트 자동 연결"
    Write-Info "─────────────────────────────────────────────────"
    Write-Info "기본 프로젝트: $DEFAULT_PROJECT_NAME"
    Write-Info "(자동 진행 — 사용자 입력 불필요)"
    Write-Info ""

    # vercel link --yes --project로 인터랙티브 prompt 모두 skip
    # --yes: 모든 default 답변 자동 적용 (Set up? Y / Link to existing? Y)
    # --project: 프로젝트 이름 명시 (What's the name? 자동 답변)
    & vercel link --yes --project=$DEFAULT_PROJECT_NAME 2>&1 | ForEach-Object { Write-Host $_ }

    if ($LASTEXITCODE -ne 0) {
        # 자동 link 실패 시 fallback — 인터랙티브 모드
        Write-Warn "자동 link 실패. 인터랙티브 모드로 전환합니다."
        Write-Info ""
        Write-Info "  화면에서 다음 순서로 답하세요:"
        Write-Info "    1. 'Set up ..?' → Y"
        Write-Info "    2. 'Which scope?' → 본인 계정 선택"
        Write-Info "    3. 'Link to existing project?' → Y"
        Write-Info "    4. 'What's the name?' → $DEFAULT_PROJECT_NAME"
        Write-Info ""

        & vercel link
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Vercel link 실패"
            exit 1
        }
    }
}
Write-Ok "Vercel 프로젝트 link 완료"

# ─────────────────────────────────────────────────────────────
# v2.55.2 핵심: vercel pull로 환경변수 자동 다운로드
# ─────────────────────────────────────────────────────────────
Write-Step "7단계: Vercel 환경변수 자동 다운로드 (vercel pull)"
Write-Info ""
Write-Info "─────────────────────────────────────────────────"
Write-Info "  🌟 macOS .env.local 없이 환경변수 자동 가져오기"
Write-Info "─────────────────────────────────────────────────"
Write-Info "Vercel Dashboard에 저장된 모든 환경변수를 .env.local로"
Write-Info "자동 다운로드합니다. macOS에서 파일 가져올 필요 X."
Write-Info ""

# vercel pull --yes로 자동 진행 (stderr 출력은 정상 메시지)
& vercel pull --yes --environment=production 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) {
    Write-Warn "vercel pull 실패 — 직접 입력 모드로 전환합니다."
    Write-Info "Vercel Dashboard → Settings → Environment Variables에서 값 확인 후 입력 가능."
} else {
    # vercel pull은 .vercel/.env.preview.local 또는 .env.production.local 생성
    # → .env.local로 복사
    if (Test-Path ".vercel/.env.production.local") {
        Copy-Item ".vercel/.env.production.local" -Destination ".env.local" -Force
        Write-Ok "Vercel에서 환경변수 자동 다운로드 완료 → .env.local"
    } elseif (Test-Path ".env") {
        Copy-Item ".env" -Destination ".env.local" -Force
        Write-Ok "Vercel에서 환경변수 자동 다운로드 완료 → .env.local"
    } else {
        Write-Warn "vercel pull 후 .env 파일을 찾을 수 없음 — 직접 입력 필요"
    }
}

# ─────────────────────────────────────────────────────────────
# 환경변수 누락 검사 + 누락된 것만 입력 받기
# ─────────────────────────────────────────────────────────────
Write-Info ""
Write-Step "8단계: 환경변수 검토 + 누락 항목 보완"

# 현재 .env.local 내용 읽기 (없으면 빈 문자열)
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
} else {
    $envContent = ""
}

# 필수 변수 체크
function Test-EnvVar {
    param($Name)
    return $envContent -match "(?m)^$Name="
}

$requiredVars = @(
    @{ Name = "ADMIN_PASSWORD";           Description = "카드 등록·수정·삭제 비밀번호" },
    @{ Name = "ADMIN_DASHBOARD_PASSWORD"; Description = "관리자 대시보드 전용 비밀번호 (위와 다른 값 권장)" },
    @{ Name = "UPSTASH_REDIS_REST_URL";   Description = "Upstash Redis URL (https://...upstash.io)" },
    @{ Name = "UPSTASH_REDIS_REST_TOKEN"; Description = "Upstash Redis Token" },
    @{ Name = "NEXT_PUBLIC_SITE_URL";     Description = "사이트 URL (https://nest-alum1.vercel.app)" },
    # v2.55.7: INDEXNOW_KEY를 필수로 승격 — 검색 즉시 인덱싱은 SEO의 핵심
    @{ Name = "INDEXNOW_KEY";             Description = "IndexNow 즉시 인덱싱 (Bing/Naver/Yandex 자동) — 누락 시 자동 생성됨" }
)

$missing = @()
foreach ($v in $requiredVars) {
    if (-not (Test-EnvVar $v.Name)) {
        $missing += $v
    } else {
        Write-Ok "$($v.Name): Vercel에서 자동 가져옴"
    }
}

# 누락된 것만 입력 받기 (INDEXNOW_KEY는 자동 생성)
if ($missing.Count -gt 0) {
    Write-Info ""
    Write-Info "⚠️ 누락된 환경변수 $($missing.Count)개 — 처리 중..."
    Write-Info ""
    foreach ($v in $missing) {
        if ($v.Name -eq "INDEXNOW_KEY") {
            # v2.55.7: INDEXNOW_KEY 자동 UUID 생성 (사용자 입력 불필요)
            $newKey = [guid]::NewGuid().ToString().Replace("-", "")
            Add-Content -Path ".env.local" -Value "INDEXNOW_KEY=$newKey"
            Write-Ok "INDEXNOW_KEY 자동 생성 (32자 hex): $($newKey.Substring(0, 8))..."
            Write-Info "  → Bing/Naver/Yandex 즉시 인덱싱 활성화됨"
        } else {
            $value = Read-Host "$($v.Name) — $($v.Description)"
            if (-not [string]::IsNullOrWhiteSpace($value)) {
                Add-Content -Path ".env.local" -Value "$($v.Name)=$value"
            }
        }
    }
}

# v2.55.7: INDEXNOW_KEY가 .env.local에 있는데 Vercel에 없으면 동기화
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "(?m)^INDEXNOW_KEY=(.+)$") {
    $indexNowKey = $matches[1].Trim()
    # Vercel에 등록 (이미 있으면 덮어쓰기)
    Write-Info "INDEXNOW_KEY를 Vercel에 동기화 중..."
    foreach ($e in @("production", "preview", "development")) {
        & vercel env rm INDEXNOW_KEY $e --yes 2>$null | Out-Null
        $indexNowKey | & vercel env add INDEXNOW_KEY $e 2>$null | Out-Null
    }
    Write-Ok "INDEXNOW_KEY Vercel 동기화 완료 (production/preview/development)"
}

# 선택 변수 (사용자 의지)
$optionalVars = @(
    @{ Name = "GITHUB_REPO";    Description = "시점 복원용 (예: yourname/nest-alum1)" },
    @{ Name = "GITHUB_TOKEN";   Description = "시점 복원용 PAT (Vercel pull로 안 가져와지면 새로 발급 필요)" }
)

# 환경변수 다시 읽기 (방금 입력한 것 반영)
$envContent = Get-Content ".env.local" -Raw

$missingOptional = @()
foreach ($v in $optionalVars) {
    if (-not (Test-EnvVar $v.Name)) {
        $missingOptional += $v
    }
}

if ($missingOptional.Count -gt 0) {
    Write-Info ""
    Write-Info "─────────────────────────────────────────────────"
    Write-Info "  💡 선택 환경변수 (없어도 사이트는 작동)"
    Write-Info "─────────────────────────────────────────────────"
    Write-Info "다음 변수가 없습니다. 사이트는 정상 작동하지만 추가 기능이 비활성화됩니다:"
    foreach ($v in $missingOptional) {
        Write-Info "  - $($v.Name): $($v.Description)"
    }
    Write-Info ""
    Write-Info "💡 v2.55.4 자동 진행 — 누락된 선택 변수는 자동으로 skip합니다."
    Write-Info "   배포 완료 후 Vercel Dashboard에서 직접 추가 가능:"
    Write-Info "   https://vercel.com/dashboard → 프로젝트 → Settings → Environment Variables"
    Write-Info ""
    Write-Info "💡 GITHUB_TOKEN이 누락된 경우:"
    Write-Info "   PAT는 한 번 발급 후 다시 볼 수 없어 vercel pull로 못 가져와요."
    Write-Info "   필요시 새로 발급 후 Vercel에 추가:"
    Write-Info "   https://github.com/settings/personal-access-tokens/new"
    Write-Info "   (Actions: Read and write + Contents: Read and write)"
    Write-Info ""
    # v2.55.4: 자동 skip — 사용자 입력 없음
    Write-Ok "선택 환경변수 자동 skip (배포는 정상 진행)"
}

# ─────────────────────────────────────────────────────────────
# 9단계: Vercel push (수동 등록한 변수만 — 기존 변수는 그대로)
# ─────────────────────────────────────────────────────────────
Write-Step "9단계: 누락 환경변수 Vercel push (있다면)"

if ($missing.Count -gt 0) {
    foreach ($v in $missing) {
        if ($envContent -match "(?m)^$($v.Name)=(.+)$") {
            $value = $matches[1].Trim()
            if (-not [string]::IsNullOrWhiteSpace($value)) {
                $envs = "production", "preview", "development"
                foreach ($e in $envs) {
                    vercel env rm $v.Name $e --yes 2>$null | Out-Null
                    $value | vercel env add $v.Name $e 2>$null | Out-Null
                }
                Write-Ok "Vercel에 등록: $($v.Name)"
            }
        }
    }
} else {
    Write-Ok "모든 필수 변수가 Vercel에서 가져옴 — 추가 등록 불필요"
}

# ─────────────────────────────────────────────────────────────
# 10단계: 프로덕션 배포
# ─────────────────────────────────────────────────────────────
Write-Step "10단계: 프로덕션 배포"
Write-Info "프로덕션 배포 시작 (3~5분 소요)..."

# vercel deploy stderr는 정상 진행 메시지 — 모두 stdout으로 합쳐서 처리
$deployOutput = & vercel deploy --prod 2>&1 | ForEach-Object {
    Write-Host $_
    $_  # 변수에 저장
}
$deployedUrl = ($deployOutput | Select-String "https://.*\.vercel\.app" | Select-Object -Last 1)
if ($deployedUrl) {
    $deployedUrl = $deployedUrl.Matches.Value
}

if ($LASTEXITCODE -eq 0 -and $deployedUrl) {
    Write-Ok "배포 완료!"

    # ─────────────────────────────────────────────────────────────
    # 11단계: GitHub Secret 자동 설정 (v2.55.6)
    # Daily Backup workflow가 dump API 호출 시 ADMIN_DASHBOARD_PASSWORD 인증 필요.
    # GitHub Secret으로 저장 → workflow에서 secrets.ADMIN_DASHBOARD_PASSWORD로 사용.
    # ─────────────────────────────────────────────────────────────
    Write-Host ""
    Write-Step "11단계: GitHub Secret 자동 설정 (Daily Backup용)"

    # .env.local에서 ADMIN_DASHBOARD_PASSWORD 추출
    if (Test-Path ".env.local") {
        $envContent = Get-Content ".env.local" -Raw
        if ($envContent -match "(?m)^ADMIN_DASHBOARD_PASSWORD=(.+)$") {
            # v2.55.7: 따옴표·공백·줄바꿈 제거 (Vercel pull 시 따옴표로 감쌀 수 있음)
            $dashboardPw = $matches[1].Trim().Trim('"').Trim("'").Trim()
            if (-not [string]::IsNullOrWhiteSpace($dashboardPw)) {
                Write-Info "ADMIN_DASHBOARD_PASSWORD를 GitHub Secret으로 등록 중..."
                Write-Info "  (Vercel과 정확히 같은 값으로 동기화)"
                Write-Info "  비밀번호 길이: $($dashboardPw.Length) 자"

                # v2.55.7: --body 플래그 사용 (stdin pipe 보다 안정적, 줄바꿈 안 섞임)
                & gh secret set ADMIN_DASHBOARD_PASSWORD --body "$dashboardPw" 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Ok "GitHub Secret 등록: ADMIN_DASHBOARD_PASSWORD ($($dashboardPw.Length)자)"
                    Write-Info "  → Vercel 환경변수와 같은 값으로 GitHub Secret 동기화 완료"
                    Write-Info "  → daily-backup.yml workflow가 dump API 인증 통과 가능"
                } else {
                    Write-Warn "GitHub Secret 등록 실패 — 수동 추가 필요"
                    Write-Info "  Settings → Secrets and variables → Actions → New secret"
                    Write-Info "  Name: ADMIN_DASHBOARD_PASSWORD"
                    Write-Info "  Value: <Vercel과 같은 값>"
                }
            } else {
                Write-Warn "ADMIN_DASHBOARD_PASSWORD가 비어있음 — Secret 등록 skip"
            }
        } else {
            Write-Warn ".env.local에서 ADMIN_DASHBOARD_PASSWORD 못 찾음"
        }
    }

    # ─────────────────────────────────────────────────────────────
    # 12단계: Daily Backup workflow 즉시 실행 (cron 02:00 KST 안 기다림)
    # ─────────────────────────────────────────────────────────────
    Write-Host ""
    Write-Step "12단계: Daily Backup workflow 즉시 트리거"
    Write-Info "GitHub Actions에 Daily Card Backup workflow 실행 요청..."
    Write-Info "(cron은 매일 KST 02:00이지만 첫 실행을 즉시 트리거)"

    # gh workflow run으로 workflow_dispatch 트리거
    & gh workflow run "daily-backup.yml" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Daily Backup workflow 트리거됨"
        Write-Info "  → 1~2분 후 backups/ 폴더에 첫 백업 생성됨"
        Write-Info "  → 진행 상황: $(git remote get-url origin | ForEach-Object { $_ -replace '\.git$', '' })/actions/workflows/daily-backup.yml"
    } else {
        Write-Warn "Workflow 자동 트리거 실패 — 수동 실행 가능"
        Write-Info "  GitHub repo → Actions → Daily Card Backup → Run workflow"
        Write-Info "  또는 admin 대시보드의 [🚀 지금 백업 실행] 버튼 사용"
    }

    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  🎉 배포 성공!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "  배포된 URL: " -NoNewline
    Write-Host $deployedUrl -ForegroundColor Cyan
    Write-Host "  관리자 페이지: " -NoNewline
    Write-Host "$deployedUrl/admin" -ForegroundColor Cyan
    $remoteUrl = (& git remote get-url origin 2>$null) | Out-String
    Write-Host "  GitHub repo: " -NoNewline
    Write-Host $remoteUrl.Trim() -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  다음 단계:" -ForegroundColor Yellow
    Write-Host "    1. 위 URL 접속 → 카드 등록 테스트" -ForegroundColor Yellow
    Write-Host "    2. /admin 접속 → 대시보드 비밀번호 입력 → [📂 백업 목록 불러오기]" -ForegroundColor Yellow
    Write-Host "       (1~2분 후 첫 백업 표시)" -ForegroundColor Yellow
    Write-Host "    3. Naver Search Advisor·Google Search Console에 사이트 등록" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""

    # 브라우저 자동 오픈
    # v2.55.4: 자동 진행 — 브라우저 자동 오픈 (사용자 입력 없음)
    Write-Info "브라우저로 사이트를 자동 오픈합니다..."
    Start-Process $deployedUrl
} else {
    Write-Err "배포 실패"
    Write-Host $deployOutput
    exit 1
}

Write-Host ""
Write-Host "스크립트 완료."

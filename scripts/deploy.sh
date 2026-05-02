#!/usr/bin/env bash
# =============================================================================
# deploy.sh — 원스텝 Vercel 배포 스크립트 (v2.1.1)
#
# 사용:
#   bash scripts/deploy.sh              # production 배포
#   bash scripts/deploy.sh --preview    # preview 배포
#   bash scripts/deploy.sh --no-build   # 로컬 타입체크 건너뛰기
#   bash scripts/deploy.sh --git        # git push 방식 (기존 워크플로우)
# =============================================================================

set -e

BLUE=$'\033[0;34m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
RED=$'\033[0;31m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
NC=$'\033[0m'

step()  { echo; echo -e "${BLUE}${BOLD}▸ $1${NC}"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1" >&2; }
info()  { echo -e "${DIM}  $1${NC}"; }

# ─── 인자 파싱 ───
MODE="production"
SKIP_BUILD=0
USE_GIT=0

for arg in "$@"; do
  case "$arg" in
    --preview)  MODE="preview" ;;
    --no-build) SKIP_BUILD=1 ;;
    --git)      USE_GIT=1 ;;
    -h|--help)
      head -n 10 "$0"
      exit 0
      ;;
  esac
done

# =============================================================================
# Step 0 — 환경 검증
# =============================================================================
step "환경 검증"

if ! command -v node >/dev/null 2>&1; then
  err "Node.js가 필요합니다. https://nodejs.org/"
  exit 1
fi
ok "Node $(node -v)"

if [ $USE_GIT -eq 0 ]; then
  if ! command -v vercel >/dev/null 2>&1; then
    warn "Vercel CLI 미설치 → 자동 설치 중..."
    npm install -g vercel >/dev/null 2>&1 || {
      err "Vercel CLI 설치 실패. 수동 실행: npm i -g vercel"
      exit 1
    }
  fi
  ok "Vercel CLI $(vercel --version 2>&1 | head -1)"

  if [ ! -f .vercel/project.json ]; then
    warn "프로젝트가 아직 Vercel에 연결되지 않았습니다"
    echo
    echo -e "최초 1회 셋업이 필요합니다:"
    echo -e "  ${BOLD}bash scripts/setup.sh${NC}"
    echo
    exit 1
  fi

  PROJECT_ID=$(grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' .vercel/project.json | cut -d'"' -f4)
  ok "프로젝트 연결됨 (ID: ${PROJECT_ID:0:16}…)"
fi

# =============================================================================
# Step 1 — Redis Preflight
# =============================================================================
step "Redis Preflight"

if [ $USE_GIT -eq 0 ] && [ -f .vercel/project.json ]; then
  info "Vercel에서 최신 환경변수 pull 중..."
  if ! vercel env pull .env.local --environment=production --yes >/dev/null 2>&1; then
    warn "env pull 실패 — 기존 .env.local 사용 시도"
  fi
fi

if [ -f .env.local ]; then
  UPSTASH_URL=$(grep -E "^(UPSTASH_REDIS_REST_URL|KV_REST_API_URL)=" .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  UPSTASH_TOKEN=$(grep -E "^(UPSTASH_REDIS_REST_TOKEN|KV_REST_API_TOKEN)=" .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")

  if [ -z "$UPSTASH_URL" ] || [ -z "$UPSTASH_TOKEN" ]; then
    err "Upstash Redis 환경변수 없음!"
    echo
    echo -e "Vercel Dashboard에서 ${BOLD}Upstash for Redis${NC}를 프로젝트에 연결하세요:"
    echo -e "  ${GREEN}https://vercel.com/marketplace/upstash${NC}"
    echo
    echo -e "또는 최초 셋업 재실행: ${BOLD}bash scripts/setup.sh${NC}"
    exit 1
  fi

  info "Redis ping 테스트 중..."
  PING_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $UPSTASH_TOKEN" \
    "$UPSTASH_URL/ping" --max-time 5 || echo "TIMEOUT")

  if [ "$PING_RESULT" = "200" ]; then
    ok "Redis 응답 정상 (HTTP 200)"
  else
    err "Redis 응답 실패 (HTTP $PING_RESULT)"
    echo
    echo "가능한 원인:"
    echo "  - Upstash 토큰 만료 → Vercel Dashboard에서 재연결"
    echo "  - 네트워크 방화벽"
    exit 1
  fi
else
  warn ".env.local 없음 — 서버 측에서만 검증됩니다"
fi

# =============================================================================
# Step 2 — 로컬 타입체크
# =============================================================================
if [ $SKIP_BUILD -eq 0 ]; then
  step "타입체크 (next build 실패 조기 감지)"

  if [ ! -d node_modules ]; then
    info "node_modules 없음 → npm install 실행..."
    npm install --silent
  fi

  if ! npx tsc --noEmit 2>&1; then
    err "타입 오류 발견. 배포 중단"
    echo
    echo "위 에러를 수정한 후 다시 시도하세요."
    echo -e "임시로 건너뛰려면: ${BOLD}bash scripts/deploy.sh --no-build${NC}"
    exit 1
  fi
  ok "타입체크 통과 (0 errors)"
fi

# =============================================================================
# Step 3 — 배포
# =============================================================================
if [ $USE_GIT -eq 1 ]; then
  step "Git 모드 배포"
  bash scripts/push-to-github.sh --force
  echo
  ok "Git push 완료. Vercel 웹훅이 곧 자동 빌드 시작 (10초 이내)"
  info "대시보드: https://vercel.com/dashboard"
else
  step "Vercel CLI 직배포 ($MODE)"
  info "로컬 코드 → Vercel 직접 업로드 (GitHub 우회)"
  info "환경변수는 Vercel 서버 값 사용 (재연결 불필요)"
  echo

  if [ "$MODE" = "production" ]; then
    vercel --prod --yes
  else
    vercel --yes
  fi
fi

echo
echo -e "${GREEN}${BOLD}✓ 완료!${NC}"
echo

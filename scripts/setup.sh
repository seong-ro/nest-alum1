#!/usr/bin/env bash
# =============================================================================
# setup.sh — Vercel + Upstash 최초 1회 셋업 도우미 (v2.1.1)
#
# 이 스크립트는 단 한 번만 실행합니다.
# 이후 배포는 scripts/deploy.sh 한 줄로 충분합니다.
# =============================================================================

set -e

# ─── 색상 (echo -e 로만 출력) ───
BLUE=$'\033[0;34m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
RED=$'\033[0;31m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
NC=$'\033[0m'

hr() { echo -e "${DIM}────────────────────────────────────────────────────${NC}"; }
step()  { echo; echo -e "${BLUE}${BOLD}▸ $1${NC}"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1" >&2; }
info()  { echo -e "${DIM}  $1${NC}"; }

# ─── 배너 ───
clear 2>/dev/null || true
echo
hr
echo -e "${BOLD}  Vercel + Upstash Redis 최초 셋업 (5분)${NC}"
hr
echo
echo "이 스크립트는 다음을 순서대로 안내합니다:"
echo
echo -e "  ${BOLD}1.${NC} Vercel CLI 설치"
echo -e "  ${BOLD}2.${NC} Vercel 로그인"
echo -e "  ${BOLD}3.${NC} 프로젝트 연결 (기존 nest-alum1에 링크)"
echo -e "  ${BOLD}4.${NC} Upstash Redis 통합"
echo -e "  ${BOLD}5.${NC} 환경변수 로컬 복사"
echo -e "  ${BOLD}6.${NC} 첫 배포"
echo
echo -e "${DIM}이후 재배포는 한 줄이면 됩니다:${NC}"
echo -e "  ${BOLD}bash scripts/deploy.sh${NC}"
echo
read -r -p "계속할까요? [Y/n] " REPLY
if [[ "$REPLY" =~ ^[Nn]$ ]]; then exit 0; fi

# =============================================================================
# 1. Vercel CLI
# =============================================================================
step "1/6 · Vercel CLI 설치 확인"

if ! command -v vercel >/dev/null 2>&1; then
  info "Vercel CLI 미설치 → npm install -g vercel 실행"
  if ! npm install -g vercel; then
    err "Vercel CLI 설치 실패"
    echo
    echo -e "수동 설치: ${BOLD}npm install -g vercel${NC}"
    echo -e "권한 에러 시: ${BOLD}sudo npm install -g vercel${NC}"
    exit 1
  fi
fi
ok "Vercel CLI $(vercel --version 2>&1 | head -1)"

# =============================================================================
# 2. Login
# =============================================================================
step "2/6 · Vercel 로그인"

if vercel whoami >/dev/null 2>&1; then
  ok "이미 로그인됨: $(vercel whoami 2>/dev/null | tail -1)"
else
  info "브라우저 창이 열립니다. 로그인 후 이 터미널로 돌아오세요."
  vercel login
fi

# =============================================================================
# 3. Project link
# =============================================================================
step "3/6 · 프로젝트 연결"

if [ -f .vercel/project.json ]; then
  PROJECT_ID=$(grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' .vercel/project.json | cut -d'"' -f4)
  ok "이미 연결됨 (Project ID: ${PROJECT_ID:0:16}…)"
else
  echo
  echo -e "${YELLOW}${BOLD}⚠ 중요 — 아래 질문에 정확히 답해주세요${NC}"
  echo
  echo -e "  ${BOLD}1) Set up and deploy?${NC}           → ${GREEN}Y${NC} 입력"
  echo -e "  ${BOLD}2) Which scope?${NC}                  → 방향키로 본인 계정 선택 후 ${GREEN}Enter${NC}"
  echo -e "  ${BOLD}3) Link to existing project?${NC}     → ${GREEN}Y${NC} 입력 ${RED}(반드시 Y!)${NC}"
  echo -e "  ${BOLD}4) Existing project name?${NC}        → ${GREEN}nest-alum1${NC} 입력"
  echo
  echo -e "  ${RED}${BOLD}절대 새 프로젝트를 만들지 마세요.${NC}"
  echo -e "  ${DIM}새로 만들면 Upstash 환경변수가 연결되지 않아 배포 실패합니다.${NC}"
  echo
  read -r -p "준비되면 Enter를 누르세요... " _
  echo
  vercel link
fi

# =============================================================================
# 4. Upstash
# =============================================================================
step "4/6 · Upstash Redis 통합"

# .env.local이 이미 Redis 변수를 가지면 스킵
if [ -f .env.local ] && grep -qE "^(UPSTASH_REDIS_REST_URL|KV_REST_API_URL)=" .env.local 2>/dev/null; then
  ok "Upstash 이미 통합됨 (환경변수 감지)"
else
  echo
  echo -e "  Vercel Dashboard에서 Upstash Redis를 설치해야 합니다."
  echo
  echo -e "  ${BOLD}다음 URL을 브라우저로 여세요:${NC}"
  echo -e "  ${GREEN}https://vercel.com/marketplace/upstash${NC}"
  echo
  echo -e "  ${BOLD}설치 순서:${NC}"
  echo "    1. [Install] 버튼 클릭 → [Add Integration]"
  echo -e "    2. Select Product → ${BOLD}Upstash for Redis${NC}"
  echo -e "       ${DIM}(Vector / Search / QStash 가 아닌 반드시 Redis)${NC}"
  echo -e "    3. Plan → ${BOLD}Free${NC}"
  echo -e "    4. Project → ${BOLD}nest-alum1${NC} 선택"
  echo -e "    5. Region → ${BOLD}Global${NC} 또는 ${BOLD}AWS Asia-Pacific Tokyo${NC}"
  echo "    6. Create → Connect to Vercel"
  echo
  echo -e "  ${DIM}이 작업은 Vercel Dashboard에서만 가능합니다 (CLI 미지원).${NC}"
  echo

  # macOS면 자동 열기
  if command -v open >/dev/null 2>&1; then
    read -r -p "브라우저를 자동으로 열까요? [Y/n] " REPLY
    if [[ ! "$REPLY" =~ ^[Nn]$ ]]; then
      open "https://vercel.com/marketplace/upstash"
    fi
  fi

  echo
  read -r -p "Upstash 설치 + 프로젝트 연결 완료했으면 Enter... " _
fi

# =============================================================================
# 5. Env pull
# =============================================================================
step "5/6 · 환경변수 로컬 복사"

if ! vercel env pull .env.local --environment=production --yes 2>&1; then
  err "환경변수 pull 실패"
  echo
  echo "가능한 원인:"
  echo "  - 프로젝트 연결이 잘못됨 → rm -rf .vercel && bash scripts/setup.sh 재실행"
  echo "  - 네트워크 오류 → 잠시 후 재시도"
  exit 1
fi

if grep -qE "^(UPSTASH_REDIS_REST_URL|KV_REST_API_URL)=" .env.local; then
  ok "Redis 환경변수 확인됨"
else
  err "Redis 환경변수가 .env.local에 없습니다"
  echo
  echo -e "Upstash 통합이 완료되지 않은 상태입니다."
  echo -e "Vercel Dashboard에서 ${BOLD}Settings → Environment Variables${NC}를 확인하세요."
  exit 1
fi

# =============================================================================
# 6. First deploy
# =============================================================================
step "6/6 · 첫 배포"

echo
read -r -p "지금 production 배포할까요? [Y/n] " REPLY
if [[ ! "$REPLY" =~ ^[Nn]$ ]]; then
  bash scripts/deploy.sh
else
  info "나중에 배포하려면: bash scripts/deploy.sh"
fi

echo
hr
echo -e "${GREEN}${BOLD}✓ 셋업 완료!${NC}"
hr
echo
echo -e "이후 재배포는 한 줄이면 됩니다:"
echo -e "  ${BOLD}bash scripts/deploy.sh${NC}"
echo
echo -e "이 명령 하나로 다음이 자동 수행됩니다:"
echo "  - Redis 연결 선검증 (0.5초)"
echo "  - 타입체크 (로컬에서 빠른 실패, 10초)"
echo "  - Vercel 직배포 (GitHub 우회, 30초)"
echo "  - 브라우저 자동 오픈"
echo

#!/usr/bin/env bash
# ------------------------------------------------------------
# Folio Cards — macOS 로컬 개발환경 원클릭 셋업
#
# 사용:
#   bash scripts/mac-setup.sh
#
# 동작:
#   1. Node 20 확인 (없으면 nvm/homebrew 안내)
#   2. npm install
#   3. TypeScript 체크
#   4. 개발 서버 실행
#   5. 브라우저 자동 오픈
#
# 이 스크립트는 Apple Silicon(M1/M2/M3)과 Intel Mac 모두에서 동작합니다.
# ------------------------------------------------------------
set -e

# 색상 출력
if [ -t 1 ]; then
  BOLD='\033[1m'
  DIM='\033[2m'
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  RESET='\033[0m'
else
  BOLD=''; DIM=''; RED=''; GREEN=''; YELLOW=''; BLUE=''; RESET=''
fi

say() { echo -e "${BLUE}▶${RESET} $1"; }
ok()  { echo -e "${GREEN}✓${RESET} $1"; }
warn(){ echo -e "${YELLOW}⚠${RESET} $1"; }
err() { echo -e "${RED}✗${RESET} $1"; }

echo ""
echo -e "${BOLD}Folio Cards — macOS setup${RESET}"
echo -e "${DIM}(Node 20, npm, Next.js 15)${RESET}"
echo ""

# 1. macOS인지 확인
if [[ "$OSTYPE" != "darwin"* ]]; then
  warn "이 스크립트는 macOS 전용입니다. Linux/Windows는 README의 일반 가이드를 따르세요."
  exit 1
fi

# 2. Apple Silicon 감지
if [[ "$(uname -m)" == "arm64" ]]; then
  say "Apple Silicon (arm64) 감지"
else
  say "Intel Mac (x86_64) 감지"
fi

# 3. Node 확인
if ! command -v node >/dev/null 2>&1; then
  err "Node.js가 설치되어 있지 않습니다."
  echo ""
  echo "  다음 중 하나로 Node 20을 설치하세요:"
  echo ""
  echo "  [nvm 사용 — 권장]"
  echo "    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "    source ~/.zshrc  (또는 ~/.bash_profile)"
  echo "    nvm install 20"
  echo "    nvm use 20"
  echo ""
  echo "  [Homebrew 사용]"
  echo "    brew install node@20"
  echo "    echo 'export PATH=\"/opt/homebrew/opt/node@20/bin:\$PATH\"' >> ~/.zshrc"
  echo "    source ~/.zshrc"
  echo ""
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
say "Node $NODE_VERSION 감지"

if [ "$NODE_MAJOR" -lt 20 ]; then
  err "Node 20 이상이 필요합니다 (현재 $NODE_VERSION)."
  if command -v nvm >/dev/null 2>&1; then
    echo "  nvm use 20  을 실행하세요."
  else
    echo "  nvm이 있다면: nvm install 20 && nvm use 20"
    echo "  아니면: brew install node@20"
  fi
  exit 1
fi

if [ "$NODE_MAJOR" -ge 23 ]; then
  warn "Node $NODE_VERSION은 아직 테스트되지 않은 버전입니다. Node 20 LTS를 권장합니다."
fi

ok "Node 버전 OK"

# 4. npm install
say "의존성 설치 중 (약 1~2분 소요)…"
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
  npm ci --no-audit --no-fund 2>&1 | tail -5 || {
    warn "npm ci 실패 — npm install로 fallback"
    npm install --no-audit --no-fund 2>&1 | tail -5
  }
else
  npm install --no-audit --no-fund 2>&1 | tail -5
fi
ok "설치 완료"

# 5. 타입체크
say "TypeScript 타입체크…"
if npm run typecheck 2>&1 | tail -3; then
  ok "타입체크 통과"
else
  warn "타입체크 실패 — 개발은 계속 가능하지만 빌드 전에 해결이 필요합니다"
fi

# 6. 포트 3000 사용 중인지 확인
if lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  warn "포트 3000이 이미 사용 중입니다."
  echo ""
  echo "  사용 중인 프로세스:"
  lsof -iTCP:3000 -sTCP:LISTEN | tail -n +2 | head -3
  echo ""
  echo "  다른 포트로 실행:  PORT=3001 npm run dev"
  echo "  또는 기존 프로세스 종료:  lsof -ti:3000 | xargs kill"
  echo ""
  read -p "  엔터를 누르면 그대로 진행 (Ctrl+C로 중단): " _
fi

# 7. 실행 준비 완료
echo ""
echo -e "${BOLD}✅ 준비 완료!${RESET}"
echo ""
echo "  다음 명령으로 시작하세요:"
echo ""
echo -e "    ${BOLD}npm run dev${RESET}"
echo ""
echo "  그 후 브라우저에서:"
echo -e "    ${BOLD}http://localhost:3000${RESET}"
echo ""
echo -e "  ${DIM}(Cmd+T 로 새 탭 → URL 붙여넣기)${RESET}"
echo ""

# 8. 자동 실행 여부 묻기
read -p "지금 바로 dev 서버를 시작할까요? [Y/n] " ans
if [[ -z "$ans" || "$ans" =~ ^[Yy] ]]; then
  say "3초 후 브라우저가 자동으로 열립니다…"
  (sleep 3 && open "http://localhost:3000") &
  npm run dev
fi

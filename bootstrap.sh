#!/usr/bin/env bash
#
# bootstrap.sh — v2.23.8 강제 업그레이드 + 즉시 배포
#
# 목적:
#   사용자의 ~/Downloads/auto-deploy.sh가 옛 버전(v2.20 이하)이어서
#   self-update가 작동하지 않는 경우, 이 스크립트로 강제 교체.
#
# 사용법:
#   bash bootstrap.sh
#
# 동작:
#   1. ~/Downloads/folio-cards.zip 압축 해제
#   2. zip 안의 auto-deploy.sh를 ~/Downloads/auto-deploy.sh로 강제 복사
#   3. 새 버전 auto-deploy.sh 즉시 실행
#

GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'
RED=$'\033[0;31m'
BOLD=$'\033[1m'
NC=$'\033[0m'

ok()   { printf "  %b✓%b %s\n" "$GREEN" "$NC" "$1"; }
warn() { printf "  %b⚠%b %s\n" "$YELLOW" "$NC" "$1"; }
err()  { printf "  %b✗%b %s\n" "$RED" "$NC" "$1"; }
info() { printf "  %bℹ%b %s\n" "$CYAN" "$NC" "$1"; }

ZIP_PATH="$HOME/Downloads/folio-cards.zip"
WORK_DIR="$HOME/Downloads/folio-cards"
USER_DEPLOY_SH="$HOME/Downloads/auto-deploy.sh"

echo ""
printf "%b%b▸ v2.23.8 강제 업그레이드 + 즉시 배포%b\n" "$CYAN" "$BOLD" "$NC"
echo ""

# 1) zip 존재 확인
if [ ! -f "$ZIP_PATH" ]; then
  err "zip 파일 없음: $ZIP_PATH"
  echo "  v2.23.8 zip을 ~/Downloads/folio-cards.zip 으로 다운로드하세요."
  exit 1
fi
ok "zip 발견: $ZIP_PATH"

# 2) 압축 해제
info "zip 압축 해제 중..."
cd "$HOME/Downloads" || exit 1
unzip -q -o "$ZIP_PATH"

if [ ! -f "$WORK_DIR/auto-deploy.sh" ]; then
  err "zip 안에 auto-deploy.sh 없음. zip 무결성 확인 필요."
  exit 1
fi
ok "압축 해제 완료: $WORK_DIR"

# 3) 버전 확인
NEW_VERSION=$(node -p "require('$WORK_DIR/package.json').version" 2>/dev/null || echo "?")
info "zip 버전: v$NEW_VERSION"

# 4) 기존 auto-deploy.sh 백업 + 새 버전으로 교체
if [ -f "$USER_DEPLOY_SH" ]; then
  OLD_HASH=$(shasum -a 256 "$USER_DEPLOY_SH" 2>/dev/null | cut -d' ' -f1)
  NEW_HASH=$(shasum -a 256 "$WORK_DIR/auto-deploy.sh" 2>/dev/null | cut -d' ' -f1)
  
  if [ "$OLD_HASH" = "$NEW_HASH" ]; then
    ok "auto-deploy.sh 이미 최신"
  else
    BACKUP="$HOME/Downloads/auto-deploy.sh.backup-$(date +%Y%m%d-%H%M%S)"
    cp "$USER_DEPLOY_SH" "$BACKUP"
    info "기존 auto-deploy.sh 백업: $BACKUP"
    
    cp "$WORK_DIR/auto-deploy.sh" "$USER_DEPLOY_SH"
    chmod +x "$USER_DEPLOY_SH"
    ok "auto-deploy.sh 새 버전(v$NEW_VERSION)으로 강제 교체 완료"
  fi
else
  cp "$WORK_DIR/auto-deploy.sh" "$USER_DEPLOY_SH"
  chmod +x "$USER_DEPLOY_SH"
  ok "auto-deploy.sh 새로 설치"
fi

# 5) 새 auto-deploy.sh 즉시 실행
echo ""
printf "%b%b▸ 새 auto-deploy.sh 실행 (v%s)%b\n" "$CYAN" "$BOLD" "$NEW_VERSION" "$NC"
echo ""
exec bash "$USER_DEPLOY_SH"

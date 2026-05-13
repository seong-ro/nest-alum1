#!/usr/bin/env bash
#
# fix-cron-secret.sh — CRON_SECRET 강제 재생성 + 자동 재배포 트리거
#
# 사용법:
#   bash fix-cron-secret.sh
#
# 동작 (모두 자동):
#   1. ~/.folio-deploy-tokens 로드
#   2. 새 32자 hex 강한 secret 생성
#   3. Vercel에 기존 값 모두 삭제 → 새 값 추가
#   4. Vercel API로 자동 재배포 트리거 (환경변수 적용 위해)
#   5. 토큰 파일 + 백업 파일 자동 저장
#   6. 박스 출력 + GitHub Secrets 등록 안내
#

# set -e 제거 (에러 발생해도 다음 단계 진행 — 진단/복구 친화적)
# set -u도 제거 (zsh 호환성 이슈 회피)

# ─── 색상 + 헬퍼 함수 (반드시 최상단) ───
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

# ─── 토큰 로드 ───
if [ ! -f "$HOME/.folio-deploy-tokens" ]; then
  err "~/.folio-deploy-tokens 없음"
  exit 1
fi
# shellcheck disable=SC1090
source "$HOME/.folio-deploy-tokens"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  err "VERCEL_TOKEN 미설정"
  exit 1
fi

PROJECT_ID="prj_njmq99LTbEstWeZzUqXXaYb4nXFN"
SITE_URL="https://nest-alum1.vercel.app"
GITHUB_REPO="seong-ro/nest-alum1"

echo ""
printf "%b%b▸ CRON_SECRET 강제 재생성 (Vercel + GitHub 동기화 준비)%b\n" "$CYAN" "$BOLD" "$NC"
echo ""

# ─── 1) 새 32자 hex 강한 secret 생성 ───
NEW_SECRET=""
if command -v openssl >/dev/null 2>&1; then
  NEW_SECRET=$(openssl rand -hex 16)
fi
if [ -z "$NEW_SECRET" ]; then
  NEW_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | cut -c1-32)
fi
ok "새 CRON_SECRET 생성 (32자 hex)"

# ─── 2) Vercel에서 기존 CRON_SECRET 모든 ID 조회 ───
info "Vercel 기존 CRON_SECRET 항목 정리 중..."

# node 스크립트를 변수로 분리하여 zsh 호환성 보장
NODE_LIST_IDS='
let d="";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    const ids = (j.envs || []).filter(x => x.key === "CRON_SECRET").map(x => x.id);
    process.stdout.write(ids.join(" "));
  } catch (e) {
    process.stdout.write("");
  }
});
'

ALL_IDS=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env" | \
  node -e "$NODE_LIST_IDS")

DELETED_COUNT=0
if [ -n "$ALL_IDS" ]; then
  for id in $ALL_IDS; do
    DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$id")
    if [ "$DEL_CODE" = "200" ] || [ "$DEL_CODE" = "204" ]; then
      DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
  done
fi

if [ "$DELETED_COUNT" -gt 0 ]; then
  ok "기존 CRON_SECRET 항목 ${DELETED_COUNT}개 삭제 완료"
else
  info "기존 CRON_SECRET 없음 (신규 등록)"
fi

# ─── 3) Vercel에 새 값 POST ───
info "Vercel에 새 값 주입 중..."

POST_RESP=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
  -d "{
    \"key\": \"CRON_SECRET\",
    \"value\": \"$NEW_SECRET\",
    \"type\": \"encrypted\",
    \"target\": [\"production\", \"preview\", \"development\"]
  }")

POST_CODE=$(echo "$POST_RESP" | tail -n 1)
POST_BODY=$(echo "$POST_RESP" | sed '$d')

if [ "$POST_CODE" = "200" ] || [ "$POST_CODE" = "201" ]; then
  ok "Vercel 주입 성공 (3개 환경: production / preview / development)"
else
  err "Vercel API 에러: HTTP $POST_CODE"
  echo "$POST_BODY"
  exit 1
fi

# ─── 4) 토큰 파일 자동 저장 (macOS/Linux 호환) ───
if grep -q "^CRON_SECRET=" "$HOME/.folio-deploy-tokens" 2>/dev/null; then
  if [ "$(uname)" = "Darwin" ]; then
    sed -i '' "s|^CRON_SECRET=.*|CRON_SECRET=\"$NEW_SECRET\"|" "$HOME/.folio-deploy-tokens"
  else
    sed -i "s|^CRON_SECRET=.*|CRON_SECRET=\"$NEW_SECRET\"|" "$HOME/.folio-deploy-tokens"
  fi
else
  echo "CRON_SECRET=\"$NEW_SECRET\"" >> "$HOME/.folio-deploy-tokens"
fi
chmod 600 "$HOME/.folio-deploy-tokens"
ok "~/.folio-deploy-tokens 갱신"

# ─── 5) 별도 백업 파일 ───
SECRET_FILE="$HOME/.folio-cron-secret-$(date +%Y%m%d-%H%M%S).txt"
cat > "$SECRET_FILE" <<EOF
=========================================
  CRON_SECRET — $(date)
=========================================

값:
  $NEW_SECRET

GitHub Actions 등록 (1회만 필요):
  1. https://github.com/$GITHUB_REPO/settings/secrets/actions
  2. 'New repository secret' 또는 기존 'Update'
  3. Name:  CRON_SECRET
  4. Value: $NEW_SECRET

테스트 (등록 후):
  https://github.com/$GITHUB_REPO/actions/workflows/auto-refresh.yml
  → 'Run workflow' 버튼 → ✓ Success 확인

이 파일을 등록 후 삭제하세요:
  rm "$SECRET_FILE"
EOF
chmod 600 "$SECRET_FILE"
ok "백업: $SECRET_FILE"

# ─── 6) 박스 출력 ───
echo ""
printf "%b%b╔════════════════════════════════════════════════════════════════╗%b\n" "$GREEN" "$BOLD" "$NC"
printf "%b%b║  CRON_SECRET 새로 생성 완료                                       ║%b\n" "$GREEN" "$BOLD" "$NC"
printf "%b%b╠════════════════════════════════════════════════════════════════╣%b\n" "$GREEN" "$BOLD" "$NC"
printf "%b%b║%b  %b%-62s%b%b║%b\n" "$GREEN" "$BOLD" "$NC" "$BOLD" "$NEW_SECRET" "$NC" "${GREEN}${BOLD}" "$NC"
printf "%b%b╚════════════════════════════════════════════════════════════════╝%b\n" "$GREEN" "$BOLD" "$NC"
echo ""

# ─── 7) Vercel 자동 재배포 트리거 (필수!) ───
printf "%b%b▸ Vercel 자동 재배포 트리거 (환경변수 변경은 재배포 시에만 적용)%b\n" "$CYAN" "$BOLD" "$NC"
echo ""

# 최신 production deployment 조회
NODE_GET_DEP='
let d="";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    const dep = j.deployments && j.deployments[0];
    if (dep) {
      process.stdout.write(dep.uid);
    } else {
      process.stdout.write("");
    }
  } catch (e) {
    process.stdout.write("");
  }
});
'

LATEST_DEP_UID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=1&state=READY&target=production" | \
  node -e "$NODE_GET_DEP")

REDEPLOY_SUCCESS=false

if [ -n "$LATEST_DEP_UID" ]; then
  info "최신 배포 UID: $LATEST_DEP_UID"
  info "Vercel API 재배포 호출 중..."
  
  REDEPLOY_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.vercel.com/v13/deployments?forceNew=1" \
    -d "{
      \"name\": \"nest-alum1\",
      \"deploymentId\": \"$LATEST_DEP_UID\",
      \"target\": \"production\"
    }")
  
  REDEPLOY_CODE=$(echo "$REDEPLOY_RESP" | tail -n 1)
  
  if [ "$REDEPLOY_CODE" = "200" ] || [ "$REDEPLOY_CODE" = "201" ]; then
    ok "Vercel 재배포 트리거 성공"
    info "1~2분 후 사이트 함수에 새 CRON_SECRET 적용 완료"
    REDEPLOY_SUCCESS=true
  else
    warn "Vercel API 재배포 실패 (HTTP $REDEPLOY_CODE)"
    info "수동 재배포 필요:"
    echo ""
    echo "    cd ~/Downloads && bash auto-deploy.sh"
    echo ""
  fi
else
  warn "최신 배포 정보 조회 실패"
  info "수동 재배포 필요:"
  echo ""
  echo "    cd ~/Downloads && bash auto-deploy.sh"
  echo ""
fi

# ─── 8) GitHub Actions 등록 안내 ───
echo ""
printf "%b%b━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%b\n" "$YELLOW" "$BOLD" "$NC"
printf "%b%b  ⚠️  다음 단계 — GitHub Secrets 갱신 (5초)                       %b\n" "$YELLOW" "$BOLD" "$NC"
printf "%b%b━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%b\n" "$YELLOW" "$BOLD" "$NC"
echo ""
printf "  1) %b%bhttps://github.com/$GITHUB_REPO/settings/secrets/actions%b\n" "$CYAN" "$BOLD" "$NC"
printf "  2) 기존 'CRON_SECRET' 클릭 → 'Update' (없으면 'New repository secret')\n"
printf "  3) %bName%b:  CRON_SECRET\n" "$BOLD" "$NC"
printf "  4) %bValue%b: %b%s%b\n" "$BOLD" "$NC" "$BOLD" "$NEW_SECRET" "$NC"
printf "  5) 'Update secret' / 'Add secret' 버튼\n"
echo ""

# ─── 9) 즉시 테스트 안내 ───
if [ "$REDEPLOY_SUCCESS" = true ]; then
  printf "%b%b▸ 1~2분 후 GitHub Actions 즉시 테스트%b\n" "$CYAN" "$BOLD" "$NC"
else
  printf "%b%b▸ Vercel 재배포 + GitHub Secrets 갱신 후 테스트%b\n" "$CYAN" "$BOLD" "$NC"
fi
echo ""
printf "  %bhttps://github.com/$GITHUB_REPO/actions/workflows/auto-refresh.yml%b\n" "$CYAN" "$NC"
printf "  → 'Run workflow' 버튼 → 5초 대기 → ✓ Success 확인\n"
echo ""

printf "%b완료. 백업 파일: %b%s%b\n" "$GREEN" "$BOLD" "$SECRET_FILE" "$NC"
echo ""

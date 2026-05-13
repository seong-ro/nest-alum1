#!/usr/bin/env bash
#
# diagnose-cron.sh — CRON_SECRET 401 에러 종합 진단 + 자동 해결
#
# 사용법:
#   bash diagnose-cron.sh           # 진단만 (변경 없음)
#   bash diagnose-cron.sh --fix     # 진단 + 자동 해결
#

# set -e/-u 제거 (zsh 호환성 + 진단 친화성)

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

FIX_MODE=false
[ "${1:-}" = "--fix" ] && FIX_MODE=true

# ─── 토큰 로드 ───
if [ ! -f "$HOME/.folio-deploy-tokens" ]; then
  err "~/.folio-deploy-tokens 없음"
  exit 1
fi
source "$HOME/.folio-deploy-tokens"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  err "VERCEL_TOKEN 미설정"
  exit 1
fi

PROJECT_ID="prj_njmq99LTbEstWeZzUqXXaYb4nXFN"
SITE_URL="https://nest-alum1.vercel.app"
GITHUB_REPO="seong-ro/nest-alum1"

echo ""
printf "%b%b━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%b\n" "$CYAN" "$BOLD" "$NC"
printf "%b%b  CRON_SECRET 401 에러 종합 진단%b\n" "$CYAN" "$BOLD" "$NC"
printf "%b%b━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%b\n" "$CYAN" "$BOLD" "$NC"
echo ""

# =====================================================================
# 1. Vercel 환경변수 등록 확인
# =====================================================================
printf "%b▸ [1/5] Vercel 환경변수 등록 확인%b\n" "$CYAN" "$NC"

NODE_GET_INFO='
let d="";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    const items = (j.envs || []).filter(x => x.key === "CRON_SECRET");
    if (items.length === 0) {
      process.stdout.write("NOT_FOUND");
    } else {
      const info = items.map(i => ({
        id: i.id,
        target: i.target,
        updatedAt: new Date(i.updatedAt).toISOString()
      }));
      process.stdout.write(JSON.stringify(info));
    }
  } catch (e) {
    process.stdout.write("PARSE_ERROR");
  }
});
'

VERCEL_CRON_INFO=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env" | \
  node -e "$NODE_GET_INFO")

ISSUE_VERCEL=false
if [ "$VERCEL_CRON_INFO" = "NOT_FOUND" ]; then
  err "Vercel에 CRON_SECRET 미등록"
  ISSUE_VERCEL=true
elif [ "$VERCEL_CRON_INFO" = "PARSE_ERROR" ]; then
  err "Vercel API 응답 파싱 실패"
  ISSUE_VERCEL=true
else
  COUNT=$(printf "%s" "$VERCEL_CRON_INFO" | node -e '
    let d=""; process.stdin.on("data",c=>d+=c);
    process.stdin.on("end",()=>{ try{ process.stdout.write(String(JSON.parse(d).length)); }catch{ process.stdout.write("?"); } });
  ')
  ok "Vercel에 CRON_SECRET 등록됨 ($COUNT개 항목)"
  printf "%s" "$VERCEL_CRON_INFO" | node -e '
    let d=""; process.stdin.on("data",c=>d+=c);
    process.stdin.on("end",()=>{
      try {
        const arr = JSON.parse(d);
        for (const i of arr) {
          console.log("    - target: " + JSON.stringify(i.target) + " | updatedAt: " + i.updatedAt);
        }
      } catch {}
    });
  '
fi

# =====================================================================
# 2. Vercel 배포 시점 비교
# =====================================================================
echo ""
printf "%b▸ [2/5] Vercel 배포 시점 비교%b\n" "$CYAN" "$NC"

ISSUE_DEPLOY=false
LATEST_DEP_UID=""

if [ "$ISSUE_VERCEL" = false ]; then
  CRON_UPDATED=$(printf "%s" "$VERCEL_CRON_INFO" | node -e '
    let d=""; process.stdin.on("data",c=>d+=c);
    process.stdin.on("end",()=>{
      try {
        const arr = JSON.parse(d);
        const sorted = arr.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        process.stdout.write(sorted[0].updatedAt);
      } catch { process.stdout.write(""); }
    });
  ')
  
  DEP_INFO=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&limit=1&state=READY&target=production" | \
    node -e '
      let d=""; process.stdin.on("data",c=>d+=c);
      process.stdin.on("end",()=>{
        try {
          const j = JSON.parse(d);
          const dep = j.deployments && j.deployments[0];
          if (dep) {
            process.stdout.write(new Date(dep.created).toISOString() + "|" + dep.uid);
          } else { process.stdout.write("|"); }
        } catch { process.stdout.write("|"); }
      });
    ')
  
  DEPLOY_TIME=$(echo "$DEP_INFO" | cut -d'|' -f1)
  LATEST_DEP_UID=$(echo "$DEP_INFO" | cut -d'|' -f2)
  
  if [ -z "$DEPLOY_TIME" ] || [ -z "$CRON_UPDATED" ]; then
    warn "배포 정보 또는 환경변수 시각 조회 실패"
  else
    info "CRON_SECRET 갱신: $CRON_UPDATED"
    info "최신 배포 시각:   $DEPLOY_TIME"
    
    # epoch 비교 (macOS BSD date / GNU date 모두 호환)
    if [ "$(uname)" = "Darwin" ]; then
      CRON_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo "$CRON_UPDATED" | cut -d'.' -f1)" +%s 2>/dev/null)
      DEPLOY_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo "$DEPLOY_TIME" | cut -d'.' -f1)" +%s 2>/dev/null)
    else
      CRON_EPOCH=$(date -d "$CRON_UPDATED" +%s 2>/dev/null)
      DEPLOY_EPOCH=$(date -d "$DEPLOY_TIME" +%s 2>/dev/null)
    fi
    
    CRON_EPOCH=${CRON_EPOCH:-0}
    DEPLOY_EPOCH=${DEPLOY_EPOCH:-0}
    
    if [ "$CRON_EPOCH" -gt "$DEPLOY_EPOCH" ]; then
      err "CRON_SECRET이 최신 배포보다 나중에 갱신됨"
      err "→ 사이트 함수는 옛 CRON_SECRET 사용 중. 재배포 필요!"
      ISSUE_DEPLOY=true
    else
      ok "최신 배포가 CRON_SECRET 갱신 후 발생 (정상)"
    fi
  fi
fi

# =====================================================================
# 3. 사이트 함수 실제 인증 테스트
# =====================================================================
echo ""
printf "%b▸ [3/5] 사이트 함수 인증 테스트%b\n" "$CYAN" "$NC"

ISSUE_AUTH="unknown"

if [ -n "${CRON_SECRET:-}" ]; then
  TEST_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$SITE_URL/api/cron/refresh-all" 2>/dev/null)
  
  case "$TEST_CODE" in
    200)
      ok "사이트 함수 인증 성공 (로컬 토큰 파일과 일치)"
      ISSUE_AUTH=false
      ;;
    401)
      err "사이트 함수 401 Unauthorized"
      err "→ 로컬 토큰 파일의 CRON_SECRET이 사이트 함수의 값과 다름"
      ISSUE_AUTH=true
      ;;
    503)
      err "사이트 함수 503 — Vercel에 CRON_SECRET 없음"
      ISSUE_AUTH=true
      ;;
    *)
      warn "사이트 함수 응답 HTTP $TEST_CODE"
      ISSUE_AUTH=true
      ;;
  esac
else
  warn "~/.folio-deploy-tokens에 CRON_SECRET 없음 — 인증 테스트 skip"
fi

# =====================================================================
# 4. GitHub Secrets 등록 상태 (gh CLI 있을 때)
# =====================================================================
echo ""
printf "%b▸ [4/5] GitHub Secrets 등록 확인%b\n" "$CYAN" "$NC"

ISSUE_GITHUB="unknown"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if gh secret list --repo "$GITHUB_REPO" 2>/dev/null | grep -q "^CRON_SECRET"; then
    ok "GitHub Secrets에 CRON_SECRET 등록됨"
    ISSUE_GITHUB=false
  else
    err "GitHub Secrets에 CRON_SECRET 미등록"
    ISSUE_GITHUB=true
  fi
else
  warn "gh CLI 미설치/미인증 — GitHub Secrets 자동 확인 skip"
  info "수동 확인: https://github.com/$GITHUB_REPO/settings/secrets/actions"
fi

# =====================================================================
# 5. 종합 진단 + 권장 조치
# =====================================================================
echo ""
printf "%b%b━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%b\n" "$CYAN" "$BOLD" "$NC"
printf "%b%b  [5/5] 종합 진단 결과%b\n" "$CYAN" "$BOLD" "$NC"
printf "%b%b━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%b\n" "$CYAN" "$BOLD" "$NC"
echo ""

NEEDS_FIX=false

if [ "$ISSUE_VERCEL" = true ]; then
  err "→ 문제: Vercel에 CRON_SECRET 미등록"
  NEEDS_FIX=true
  REASON="vercel_missing"
elif [ "$ISSUE_DEPLOY" = true ]; then
  err "→ 문제: Vercel 환경변수 갱신 후 재배포 안 함"
  NEEDS_FIX=true
  REASON="needs_redeploy"
elif [ "$ISSUE_AUTH" = true ]; then
  err "→ 문제: 로컬 토큰 파일과 사이트 함수의 CRON_SECRET 불일치"
  NEEDS_FIX=true
  REASON="needs_full_resync"
elif [ "$ISSUE_GITHUB" = true ]; then
  err "→ 문제: GitHub Secrets에 CRON_SECRET 미등록"
  NEEDS_FIX=true
  REASON="github_missing"
else
  ok "모든 시스템 정상 작동 중"
  exit 0
fi

echo ""

if [ "$FIX_MODE" = true ]; then
  printf "%b%b▸ 자동 해결 모드 (--fix)%b\n" "$YELLOW" "$BOLD" "$NC"
  echo ""
  
  case "$REASON" in
    needs_redeploy)
      info "Vercel API로 재배포 트리거 중..."
      if [ -n "$LATEST_DEP_UID" ]; then
        REDEPLOY_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
          -H "Authorization: Bearer $VERCEL_TOKEN" \
          -H "Content-Type: application/json" \
          "https://api.vercel.com/v13/deployments?forceNew=1" \
          -d "{
            \"name\": \"nest-alum1\",
            \"deploymentId\": \"$LATEST_DEP_UID\",
            \"target\": \"production\"
          }")
        if [ "$REDEPLOY_CODE" = "200" ] || [ "$REDEPLOY_CODE" = "201" ]; then
          ok "재배포 트리거 성공. 1~2분 후 적용 완료."
        else
          err "재배포 실패 (HTTP $REDEPLOY_CODE). 수동: cd ~/Downloads && bash auto-deploy.sh"
        fi
      fi
      ;;
    vercel_missing|needs_full_resync)
      info "fix-cron-secret.sh 실행 (재생성 + 재배포)..."
      bash "$(dirname "$0")/fix-cron-secret.sh"
      ;;
    github_missing)
      info "GitHub Secrets에 등록 필요. 다음 명령:"
      echo ""
      echo "    1) https://github.com/$GITHUB_REPO/settings/secrets/actions"
      echo "    2) Name: CRON_SECRET / Value: ${CRON_SECRET:-<~/.folio-deploy-tokens 확인>}"
      echo ""
      ;;
  esac
else
  printf "%b%b해결 방법:%b\n" "$YELLOW" "$BOLD" "$NC"
  echo ""
  case "$REASON" in
    needs_redeploy)
      echo "    bash diagnose-cron.sh --fix      # 자동 재배포"
      echo "    또는: cd ~/Downloads && bash auto-deploy.sh"
      ;;
    vercel_missing|needs_full_resync)
      echo "    bash diagnose-cron.sh --fix      # fix-cron-secret.sh 자동 실행"
      echo "    또는: bash fix-cron-secret.sh"
      ;;
    github_missing)
      echo "    1) https://github.com/$GITHUB_REPO/settings/secrets/actions"
      echo "    2) Name: CRON_SECRET / Value: ${CRON_SECRET:-<~/.folio-deploy-tokens 확인>}"
      ;;
  esac
fi

echo ""

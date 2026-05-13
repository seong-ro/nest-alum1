#!/usr/bin/env bash
#
# cron-secret.sh — CRON_SECRET 관리 통합 도구
#
# 사용법:
#   bash cron-secret.sh show       # 현재 값 조회
#   bash cron-secret.sh regen      # 새로 생성 + Vercel 갱신
#   bash cron-secret.sh github     # GitHub Secrets 직접 등록 (gh CLI 필요)
#   bash cron-secret.sh full       # 새로 생성 + Vercel + GitHub 모두 자동 (gh CLI 필요)
#
# 의존성:
#   ~/.folio-deploy-tokens 파일 (VERCEL_TOKEN 포함)
#   (선택) gh CLI — github 명령용
#

set -euo pipefail

# 색상
GREEN="\033[0;32m"; YELLOW="\033[1;33m"; CYAN="\033[0;36m"; BOLD="\033[1m"; NC="\033[0m"
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
info() { echo -e "${CYAN}ℹ${NC} $1"; }

# 토큰 로드
if [ -f ~/.folio-deploy-tokens ]; then
  source ~/.folio-deploy-tokens
else
  echo "Error: ~/.folio-deploy-tokens 파일이 없습니다."
  exit 1
fi

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "Error: VERCEL_TOKEN이 설정되지 않았습니다."
  exit 1
fi

PROJECT_ID="prj_njmq99LTbEstWeZzUqXXaYb4nXFN"
GITHUB_REPO="seong-ro/nest-alum1"

CMD="${1:-show}"

case "$CMD" in
  show)
    info "현재 Vercel에 등록된 CRON_SECRET 조회 중..."
    SECRET=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env?decrypt=true" | \
      node -e "
        let d=''; process.stdin.on('data',c=>d+=c);
        process.stdin.on('end',()=>{
          try { const j=JSON.parse(d); const e=j.envs?.find(x=>x.key==='CRON_SECRET'); console.log(e?.value||''); } catch { console.log(''); }
        });
      ")
    
    if [ -z "$SECRET" ]; then
      warn "CRON_SECRET이 Vercel에 등록되어 있지 않습니다."
      info "새로 생성하려면: bash $0 regen"
      exit 1
    fi
    
    echo ""
    echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║  CRON_SECRET (Vercel 현재 값)                                    ║${NC}"
    echo -e "${BOLD}${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
    printf "${BOLD}${GREEN}║  ${NC}%-60s ${BOLD}${GREEN}║${NC}\n" "$SECRET"
    echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "GitHub Actions 등록:"
    echo "  https://github.com/$GITHUB_REPO/settings/secrets/actions"
    echo "  Name:  CRON_SECRET"
    echo "  Value: $SECRET"
    echo ""
    
    # 토큰 파일에 자동 저장 (없을 경우만)
    if ! grep -q "^CRON_SECRET=" ~/.folio-deploy-tokens 2>/dev/null; then
      echo "CRON_SECRET=\"$SECRET\"" >> ~/.folio-deploy-tokens
      chmod 600 ~/.folio-deploy-tokens
      ok "~/.folio-deploy-tokens 에 자동 저장 완료"
    fi
    ;;
    
  regen)
    info "새 CRON_SECRET 생성 + Vercel 갱신..."
    NEW_SECRET=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d '/+=' | cut -c1-32)
    
    # 기존 값 삭제 + 새 값 추가 (Vercel API)
    # 1) 기존 ID 조회
    EXISTING_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env" | \
      node -e "
        let d=''; process.stdin.on('data',c=>d+=c);
        process.stdin.on('end',()=>{
          try { const j=JSON.parse(d); const e=j.envs?.find(x=>x.key==='CRON_SECRET'); console.log(e?.id||''); } catch { console.log(''); }
        });
      ")
    
    # 2) 기존 삭제
    if [ -n "$EXISTING_ID" ]; then
      curl -s -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$EXISTING_ID" > /dev/null
      info "기존 CRON_SECRET 삭제됨"
    fi
    
    # 3) 새 값 추가
    curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
      -d "{
        \"key\": \"CRON_SECRET\",
        \"value\": \"$NEW_SECRET\",
        \"type\": \"encrypted\",
        \"target\": [\"production\", \"preview\", \"development\"]
      }" > /dev/null
    
    ok "Vercel에 새 CRON_SECRET 주입 완료"
    
    # 토큰 파일 갱신
    if grep -q "^CRON_SECRET=" ~/.folio-deploy-tokens 2>/dev/null; then
      sed -i.bak "s|^CRON_SECRET=.*|CRON_SECRET=\"$NEW_SECRET\"|" ~/.folio-deploy-tokens
      rm -f ~/.folio-deploy-tokens.bak
    else
      echo "CRON_SECRET=\"$NEW_SECRET\"" >> ~/.folio-deploy-tokens
    fi
    chmod 600 ~/.folio-deploy-tokens
    ok "~/.folio-deploy-tokens 갱신"
    
    echo ""
    echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║  새 CRON_SECRET                                                   ║${NC}"
    echo -e "${BOLD}${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
    printf "${BOLD}${GREEN}║  ${NC}%-60s ${BOLD}${GREEN}║${NC}\n" "$NEW_SECRET"
    echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    warn "다음 단계 — GitHub Actions Secrets 갱신:"
    echo "  1) https://github.com/$GITHUB_REPO/settings/secrets/actions"
    echo "  2) CRON_SECRET 항목 → Update → 위 새 값으로 갱신"
    echo "  3) (또는: bash $0 github 자동 등록)"
    echo ""
    info "Vercel 재배포 권장 (새 CRON_SECRET 적용):"
    echo "  cd ~/Downloads && bash auto-deploy.sh"
    ;;
    
  github)
    info "GitHub Secrets에 CRON_SECRET 등록 시도..."
    if ! command -v gh >/dev/null 2>&1; then
      warn "gh CLI가 설치되어 있지 않습니다."
      echo "  설치: brew install gh"
      echo "  또는: bash $0 show 후 수동 등록"
      exit 1
    fi
    
    SECRET=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v9/projects/$PROJECT_ID/env?decrypt=true" | \
      node -e "
        let d=''; process.stdin.on('data',c=>d+=c);
        process.stdin.on('end',()=>{
          try { const j=JSON.parse(d); const e=j.envs?.find(x=>x.key==='CRON_SECRET'); console.log(e?.value||''); } catch { console.log(''); }
        });
      ")
    
    if [ -z "$SECRET" ]; then
      warn "Vercel에 CRON_SECRET 없음. 먼저 'bash $0 regen' 실행."
      exit 1
    fi
    
    # gh login 확인
    if ! gh auth status >/dev/null 2>&1; then
      warn "gh login 필요"
      echo "  실행: gh auth login"
      exit 1
    fi
    
    echo "$SECRET" | gh secret set CRON_SECRET --repo "$GITHUB_REPO"
    ok "GitHub Secrets에 CRON_SECRET 등록 완료"
    ;;
    
  full)
    bash "$0" regen
    bash "$0" github
    ;;
    
  *)
    echo "사용법:"
    echo "  bash $0 show        # 현재 값 조회 + 토큰 파일 자동 저장"
    echo "  bash $0 regen       # 새로 생성 + Vercel 갱신"
    echo "  bash $0 github      # gh CLI로 GitHub Secrets 자동 등록"
    echo "  bash $0 full        # regen + github 통합 (gh CLI 필요)"
    exit 1
    ;;
esac

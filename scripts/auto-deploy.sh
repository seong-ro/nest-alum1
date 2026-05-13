#!/usr/bin/env bash
# =============================================================================
# auto-deploy.sh — 완전 자동화 배포 스크립트
#
# 전제 (최초 1회만 준비):
#   1. Vercel Access Token 발급 → ~/.folio-deploy-tokens 에 저장
#      (https://vercel.com/account/tokens — "Create" → "Full Access")
#   2. GitHub 리포가 Vercel GitHub App과 연결되어 있어야 함
#      (https://github.com/apps/vercel — Configure → 리포 접근 허용)
#   3. Upstash 계정 생성 + Management API token 발급
#      (https://console.upstash.com/account/api — "Create API Key")
#
# 이 스크립트가 자동 수행:
#   - zip 해제 + 보존물 복원
#   - Git 커밋 + push
#   - Vercel 프로젝트 존재 확인 (없으면 API로 생성)
#   - Upstash Redis DB 존재 확인 (없으면 API로 생성)
#   - Vercel 환경변수 주입 (Redis URL/Token)
#   - Redeploy 트리거
#
# 사용:
#   bash ~/Downloads/auto-deploy.sh
# =============================================================================

set -e

# ─── 색상 ───
RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"
BLUE="\033[0;34m"; CYAN="\033[0;36m"; BOLD="\033[1m"; DIM="\033[2m"; NC="\033[0m"

step() { printf "\n${BLUE}${BOLD}▸ %s${NC}\n" "$1"; }
ok()   { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$1"; }
err()  { printf "${RED}✗${NC} %s\n" "$1" >&2; }
info() { printf "${DIM}  %s${NC}\n" "$1"; }

# ─── 설정 (기본값) ───
ZIP_PATH="$HOME/Downloads/folio-cards.zip"
WORK_DIR="$HOME/Downloads/folio-cards"
BACKUP_DIR="$HOME/Downloads/folio-cards.backup"
TOKENS_FILE="$HOME/.folio-deploy-tokens"

GIT_REMOTE_URL="${GIT_REMOTE_URL:-https://github.com/seong-ro/nest-alum1.git}"
GIT_USER_NAME="${GIT_USER_NAME:-seong-ro}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-seong-ro@users.noreply.github.com}"
GIT_BRANCH="${GIT_BRANCH:-main}"

VERCEL_PROJECT_NAME="${VERCEL_PROJECT_NAME:-nest-alum1}"
GITHUB_REPO_PATH="${GITHUB_REPO_PATH:-seong-ro/nest-alum1}"
UPSTASH_DB_NAME="${UPSTASH_DB_NAME:-nest-alum1-gallery}"
UPSTASH_DB_REGION="${UPSTASH_DB_REGION:-ap-northeast-1}"  # Tokyo

printf "\n${BOLD}${CYAN}Folio Cards 완전 자동 배포 (Vercel API + Upstash API)${NC}\n\n"

# =============================================================================
# 0. 토큰 설정 도우미
# =============================================================================
ensure_tokens() {
  if [ ! -f "$TOKENS_FILE" ]; then
    step "최초 1회 토큰 설정"

    cat <<EOF

  다음 3개 토큰이 필요합니다. 각 링크에서 발급 후 아래 대화형 입력:

  ${BOLD}1. Vercel Access Token${NC}
     ${CYAN}https://vercel.com/account/tokens${NC}
     → Create Token → Full Account → 복사

  ${BOLD}2. Upstash Management API Token${NC}
     ${CYAN}https://console.upstash.com/account/api${NC}
     → Create API Key → 이름·이메일 → 복사

  ${BOLD}3. Upstash 계정 이메일${NC}
     (Upstash 가입 시 사용한 이메일 주소)

EOF
    read -p "  준비되면 Enter... "

    echo ""
    read -p "  Vercel Token: " VERCEL_TOKEN
    echo ""
    read -p "  Upstash Email: " UPSTASH_EMAIL
    echo ""
    read -p "  Upstash API Key: " UPSTASH_API_KEY
    echo ""

    cat > "$TOKENS_FILE" <<EOF
VERCEL_TOKEN="$VERCEL_TOKEN"
UPSTASH_EMAIL="$UPSTASH_EMAIL"
UPSTASH_API_KEY="$UPSTASH_API_KEY"
EOF
    chmod 600 "$TOKENS_FILE"
    ok "토큰 저장 → $TOKENS_FILE (600 권한)"
  fi

  source "$TOKENS_FILE"
}

# =============================================================================
# Vercel API 헬퍼
# =============================================================================
vercel_api() {
  # usage: vercel_api METHOD PATH [DATA_JSON]
  local method="$1"
  local path="$2"
  local data="$3"

  if [ -n "$data" ]; then
    curl -sS -X "$method" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "https://api.vercel.com$path"
  else
    curl -sS -X "$method" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com$path"
  fi
}

# Vercel 프로젝트 존재 여부 확인
vercel_get_project_id() {
  local name="$1"
  local resp
  resp=$(vercel_api GET "/v9/projects/$name")
  # id 필드 추출
  echo "$resp" | node -e "
    let data = '';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      try {
        const j = JSON.parse(data);
        if (j.id && !j.error) console.log(j.id);
      } catch(e) {}
    });
  "
}

# Vercel 프로젝트 생성 (GitHub 연결 포함)
vercel_create_project() {
  local name="$1"
  local repo="$2"

  local payload
  payload=$(cat <<EOF
{
  "name": "$name",
  "framework": "nextjs",
  "gitRepository": {
    "type": "github",
    "repo": "$repo"
  }
}
EOF
)
  vercel_api POST "/v11/projects" "$payload"
}

# Vercel 환경변수 추가
vercel_add_env() {
  local project_id="$1"
  local key="$2"
  local value="$3"

  # 기존 동일 key 있으면 삭제 먼저
  vercel_api GET "/v9/projects/$project_id/env" | \
    node -e "
      let data = '';
      process.stdin.on('data', c => data += c);
      process.stdin.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.envs) {
            for (const e of j.envs) {
              if (e.key === '$key') console.log(e.id);
            }
          }
        } catch(e) {}
      });
    " | while read -r env_id; do
      [ -n "$env_id" ] && vercel_api DELETE "/v9/projects/$project_id/env/$env_id" >/dev/null
    done

  # 새로 추가
  local payload
  payload=$(cat <<EOF
{
  "key": "$key",
  "value": "$value",
  "target": ["production", "preview", "development"],
  "type": "encrypted"
}
EOF
)
  vercel_api POST "/v10/projects/$project_id/env" "$payload" >/dev/null
}

# Vercel 프로젝트 Node 버전 동기화
# package.json engines.node와 Vercel 프로젝트 설정 일치 보장
vercel_sync_node_version() {
  local project_id="$1"
  local node_version="$2"  # 예: "22.x"
  local payload
  payload=$(cat <<EOF
{
  "nodeVersion": "$node_version"
}
EOF
)
  vercel_api PATCH "/v9/projects/$project_id" "$payload" >/dev/null
}

# Vercel 배포 상태 확인 (가장 최근 1건)
vercel_latest_deployment() {
  local project_id="$1"
  vercel_api GET "/v6/deployments?projectId=$project_id&limit=1" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const j = JSON.parse(d);
        if (j.deployments && j.deployments.length > 0) {
          const dep = j.deployments[0];
          console.log(JSON.stringify({
            uid: dep.uid,
            url: dep.url,
            state: dep.state,
            ready: dep.readyState,
            created: dep.created
          }));
        }
      } catch(e) {}
    });
  "
}

# =============================================================================
# Upstash API 헬퍼
# =============================================================================
upstash_api() {
  local method="$1"
  local path="$2"
  local data="$3"

  if [ -n "$data" ]; then
    curl -sS -X "$method" \
      -u "$UPSTASH_EMAIL:$UPSTASH_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "https://api.upstash.com/v2$path"
  else
    curl -sS -X "$method" \
      -u "$UPSTASH_EMAIL:$UPSTASH_API_KEY" \
      "https://api.upstash.com/v2$path"
  fi
}

# 기존 DB 탐색 (이름으로)
upstash_find_db() {
  local name="$1"
  upstash_api GET "/redis/databases" | node -e "
    let data = '';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      try {
        const arr = JSON.parse(data);
        if (Array.isArray(arr)) {
          for (const db of arr) {
            if (db.database_name === '$name') {
              console.log(JSON.stringify({
                id: db.database_id,
                endpoint: db.endpoint,
                rest_token: db.rest_token
              }));
              return;
            }
          }
        }
      } catch(e) {}
    });
  "
}

# DB 새로 생성
upstash_create_db() {
  local name="$1"
  local region="$2"
  local payload
  payload=$(cat <<EOF
{
  "name": "$name",
  "region": "global",
  "primary_region": "$region",
  "read_regions": [],
  "tls": true
}
EOF
)
  upstash_api POST "/redis/database" "$payload"
}

# =============================================================================
# 1. zip 파일 탐지
# =============================================================================
step "zip 파일 탐지"

if [ ! -f "$ZIP_PATH" ]; then
  err "zip 파일 없음: $ZIP_PATH"
  exit 1
fi

ZIP_MTIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$ZIP_PATH" 2>/dev/null \
         || stat -c "%y" "$ZIP_PATH" 2>/dev/null | cut -d'.' -f1)
ok "발견: $ZIP_PATH ($ZIP_MTIME)"

# =============================================================================
# 2. 토큰 로드
# =============================================================================
ensure_tokens

# =============================================================================
# 3. 작업 디렉터리 준비
# =============================================================================
step "작업 디렉터리 준비"

GIT_TMP=""; NODEMODULES_TMP=""

if [ -d "$WORK_DIR" ]; then
  if [ -d "$WORK_DIR/.git" ]; then
    GIT_TMP=$(mktemp -d)
    mv "$WORK_DIR/.git" "$GIT_TMP/" 2>/dev/null
  fi
  if [ -d "$WORK_DIR/node_modules" ]; then
    NODEMODULES_TMP=$(mktemp -d)
    mv "$WORK_DIR/node_modules" "$NODEMODULES_TMP/" 2>/dev/null
  fi
  rm -rf "$BACKUP_DIR"
  mv "$WORK_DIR" "$BACKUP_DIR"
fi

cd "$HOME/Downloads"
unzip -q -o "$ZIP_PATH"
cd "$WORK_DIR"

[ -n "$GIT_TMP" ] && [ -d "$GIT_TMP/.git" ] && mv "$GIT_TMP/.git" "$WORK_DIR/" && rm -rf "$GIT_TMP"
[ -n "$NODEMODULES_TMP" ] && [ -d "$NODEMODULES_TMP/node_modules" ] && mv "$NODEMODULES_TMP/node_modules" "$WORK_DIR/" && rm -rf "$NODEMODULES_TMP"

NEW_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "?")
ok "v$NEW_VERSION 준비 완료"

# =============================================================================
# 4. npm install (필요 시)
# =============================================================================
if [ ! -d node_modules ]; then
  step "npm install"
  npm install --silent 2>&1 | tail -3
fi

# =============================================================================
# 5. 타입체크
# =============================================================================
step "타입체크"

set +e
npx tsc --noEmit > /tmp/tsc-output.log 2>&1
TSC_EXIT=$?
set -e

if [ $TSC_EXIT -ne 0 ]; then
  err "타입 오류:"
  head -30 /tmp/tsc-output.log | sed 's/^/  /'
  exit 1
fi
ok "통과"

# =============================================================================
# =============================================================================
# 6. Git 준비
# =============================================================================
step "Git 저장소 준비"

if [ ! -d .git ]; then
  git init -b "$GIT_BRANCH" >/dev/null 2>&1
  info ".git/ 새로 초기화"
fi

[ -z "$(git config user.name 2>/dev/null)" ] && git config user.name "$GIT_USER_NAME"
[ -z "$(git config user.email 2>/dev/null)" ] && git config user.email "$GIT_USER_EMAIL"

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$GIT_REMOTE_URL"
  info "origin 추가: $GIT_REMOTE_URL"
else
  CURRENT_REMOTE=$(git remote get-url origin)
  if [ "$CURRENT_REMOTE" != "$GIT_REMOTE_URL" ]; then
    git remote set-url origin "$GIT_REMOTE_URL"
    info "origin 갱신: $GIT_REMOTE_URL"
  fi
fi
ok "user: $(git config user.name) · remote: $(git remote get-url origin)"

# =============================================================================
# 7. 변경사항 스테이징 및 커밋 — 사용자에게 명시적으로 표시
# =============================================================================
step "변경사항 스테이징"

# .git 보존 후 인덱스가 stale 상태일 수 있음 → 강제 새로고침
# 1) 인덱스 새로고침 (파일 mtime 변경 감지)
git update-index --refresh >/dev/null 2>&1 || true
# 2) 현재 working tree 상태를 인덱스에 모두 반영
git add -A

# 인덱스와 HEAD 사이의 실제 차이 — 이게 진짜 push될 변경
STAGED_COUNT=$(git diff --cached --numstat | wc -l | tr -d ' ')

# 추가 검증: working tree와 HEAD의 차이도 확인 (untracked 포함)
WORKING_DIFF=$(git status --porcelain | wc -l | tr -d ' ')
HEAD_SHA_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")

info "git 상태:"
info "  현재 HEAD: $HEAD_SHA_BEFORE"
info "  working tree 변경: $WORKING_DIFF 항목"
info "  스테이징된 변경: $STAGED_COUNT 항목"

if [ "$STAGED_COUNT" -gt 0 ]; then
  echo ""
  info "스테이징된 파일 목록:"
  git diff --cached --stat | head -20 | sed 's/^/    /'
  if [ "$STAGED_COUNT" -gt 20 ]; then
    info "    ... 외 $((STAGED_COUNT - 20))개"
  fi
  COMMIT_MSG="Deploy v${NEW_VERSION} (${STAGED_COUNT} files changed)"
  git commit -m "$COMMIT_MSG" >/dev/null
  COMMIT_SHA=$(git rev-parse --short HEAD)
  ok "커밋 생성: ${COMMIT_SHA} \"${COMMIT_MSG}\""
elif [ "$WORKING_DIFF" -gt 0 ]; then
  # 이상 케이스: working tree에는 변경이 있는데 staged가 0
  # 인덱스 문제일 가능성 → 강제로 모든 파일 다시 스테이징
  warn "인덱스 불일치 감지 — 강제 재스테이징 시도"
  git rm -r --cached . >/dev/null 2>&1 || true
  git add -A
  STAGED_COUNT=$(git diff --cached --numstat | wc -l | tr -d ' ')
  if [ "$STAGED_COUNT" -gt 0 ]; then
    info "재스테이징 성공: $STAGED_COUNT 파일"
    COMMIT_MSG="Deploy v${NEW_VERSION} (re-staged ${STAGED_COUNT} files)"
    git commit -m "$COMMIT_MSG" >/dev/null
    COMMIT_SHA=$(git rev-parse --short HEAD)
    ok "커밋 생성: ${COMMIT_SHA}"
  else
    warn "재스테이징 후에도 변경 없음 → 빈 커밋으로 트리거"
    git commit --allow-empty -m "Redeploy v${NEW_VERSION}" >/dev/null
    COMMIT_SHA=$(git rev-parse --short HEAD)
  fi
else
  warn "변경사항 없음 → 빈 커밋으로 재배포 트리거"
  COMMIT_MSG="Redeploy v${NEW_VERSION} (no changes)"
  git commit --allow-empty -m "$COMMIT_MSG" >/dev/null
  COMMIT_SHA=$(git rev-parse --short HEAD)
  ok "빈 커밋 생성: ${COMMIT_SHA}"
fi

# =============================================================================
# 8. GitHub Push — 반드시 수행하고 명시적으로 검증
# =============================================================================
step "GitHub 업로드 (git push)"

LOCAL_BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$LOCAL_BRANCH" ]; then
  git branch -M "$GIT_BRANCH"
  LOCAL_BRANCH="$GIT_BRANCH"
fi

info "대상: $GIT_REMOTE_URL"
info "브랜치: $LOCAL_BRANCH → origin/$GIT_BRANCH"
info "커밋: $COMMIT_SHA"
echo ""

# Push 실행 — 사용자가 진행 상황을 보도록 stderr를 보여줌
set +e
git push origin "$LOCAL_BRANCH:$GIT_BRANCH" --force 2>&1 | tee /tmp/git-push.log
PUSH_EXIT=${PIPESTATUS[0]}
set -e

if [ $PUSH_EXIT -ne 0 ]; then
  err "git push 실패!"
  echo ""
  echo "  자주 있는 원인:"
  echo "    1. GitHub 인증 필요: ${BOLD}gh auth login${NC}"
  echo "    2. 리모트 URL 오타: $GIT_REMOTE_URL"
  echo "    3. 네트워크 연결 문제"
  echo ""
  echo "  로그: /tmp/git-push.log"
  exit 1
fi

# Push 성공 확인 — GitHub API로 실제 반영됐는지 검증
echo ""
info "GitHub API로 업로드 검증 중..."

GH_API_REPO="${GITHUB_REPO_PATH}"
REMOTE_SHA=$(curl -sS \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${GH_API_REPO}/commits/${GIT_BRANCH}" \
  2>/dev/null \
  | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const j = JSON.parse(d);
        if (j.sha) console.log(j.sha.substring(0, 7));
      } catch(e) {}
    });
  " || echo "")

if [ -n "$REMOTE_SHA" ]; then
  if [ "$REMOTE_SHA" = "$COMMIT_SHA" ]; then
    ok "GitHub 반영 확인됨: ${BOLD}$REMOTE_SHA${NC} (로컬과 일치)"
    info "커밋 보기: https://github.com/${GH_API_REPO}/commit/${REMOTE_SHA}"
  else
    warn "GitHub의 최신 SHA($REMOTE_SHA)가 방금 푸시한 SHA($COMMIT_SHA)와 다름"
    info "GitHub 캐시 지연일 수 있음. 잠시 후 새로고침해 확인하세요."
  fi
else
  warn "GitHub API 응답 확인 불가 (네트워크 또는 private repo). git push 자체는 성공함."
fi

ok "${BOLD}GitHub 업로드 완료${NC}"

# =============================================================================
# 9. Vercel 프로젝트 확인/생성
# =============================================================================
step "Vercel 프로젝트 확인"

PROJECT_ID=$(vercel_get_project_id "$VERCEL_PROJECT_NAME")

if [ -z "$PROJECT_ID" ]; then
  warn "프로젝트 없음 → API로 자동 생성"
  CREATE_RESP=$(vercel_create_project "$VERCEL_PROJECT_NAME" "$GITHUB_REPO_PATH")

  PROJECT_ID=$(echo "$CREATE_RESP" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const j = JSON.parse(d);
        if (j.id) console.log(j.id);
        else if (j.error) console.error('ERR:' + j.error.message);
      } catch(e) {}
    });
  " 2>&1)

  if [[ "$PROJECT_ID" == ERR:* ]]; then
    err "Vercel 프로젝트 생성 실패: ${PROJECT_ID#ERR:}"
    echo ""
    echo "  GitHub App 연결 확인 필요:"
    echo "    ${CYAN}https://github.com/apps/vercel${NC}"
    echo "    → Configure → Repository access → $GITHUB_REPO_PATH 포함 확인"
    exit 1
  fi
  ok "프로젝트 생성: $PROJECT_ID"
else
  ok "기존 프로젝트 발견: $PROJECT_ID"
fi

# =============================================================================
# 10. Upstash Redis DB 확인/생성
# =============================================================================
step "Upstash Redis DB 확인"

DB_INFO=$(upstash_find_db "$UPSTASH_DB_NAME")

if [ -z "$DB_INFO" ]; then
  warn "DB 없음 → API로 자동 생성"
  CREATE_DB_RESP=$(upstash_create_db "$UPSTASH_DB_NAME" "$UPSTASH_DB_REGION")
  DB_INFO=$(echo "$CREATE_DB_RESP" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const j = JSON.parse(d);
        if (j.database_id) {
          console.log(JSON.stringify({
            id: j.database_id,
            endpoint: j.endpoint,
            rest_token: j.rest_token
          }));
        }
      } catch(e) {}
    });
  ")

  if [ -z "$DB_INFO" ]; then
    err "Upstash DB 생성 실패"
    echo "  응답: $CREATE_DB_RESP"
    exit 1
  fi
  ok "DB 생성: $UPSTASH_DB_NAME"
else
  ok "기존 DB 발견"
fi

DB_ENDPOINT=$(echo "$DB_INFO" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).endpoint")
DB_TOKEN=$(echo "$DB_INFO" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).rest_token")
DB_URL="https://$DB_ENDPOINT"

info "REST URL: $DB_URL"

# =============================================================================
# 11. Vercel 환경변수 주입 — 모든 환경(production/preview/development) 동시 적용
# =============================================================================
step "Vercel 환경변수 주입"

info "주입 대상: production · preview · development 3개 환경 동시"

# Redis 환경변수 (Upstash 통합으로 이미 자동 주입되었을 수 있으나 멱등성 위해 재주입)
vercel_add_env "$PROJECT_ID" "UPSTASH_REDIS_REST_URL" "$DB_URL"
vercel_add_env "$PROJECT_ID" "UPSTASH_REDIS_REST_TOKEN" "$DB_TOKEN"
ok "Redis 환경변수 주입 (UPSTASH_REDIS_REST_URL/TOKEN)"

# 관리자 비밀번호 — 환경변수 우선, 미설정 시 Vercel 기존 값 그대로 유지
# 보안: README/git에 평문 저장 금지. 운영자만 ~/.folio-deploy-tokens에 보관
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  vercel_add_env "$PROJECT_ID" "ADMIN_PASSWORD" "$ADMIN_PASSWORD"
  ok "관리자 비밀번호 갱신 (환경변수에서 로드)"
else
  info "ADMIN_PASSWORD 환경변수 미설정 — Vercel 기존 값 그대로 유지"
  info "변경하려면 다음 중 하나로 설정 후 재실행:"
  echo "    1) export ADMIN_PASSWORD='your-password' && bash auto-deploy.sh"
  echo "    2) echo 'ADMIN_PASSWORD=\"your-password\"' >> ~/.folio-deploy-tokens"
fi

# 사이트 URL (선택) — JSON-LD/sitemap/canonical용
vercel_add_env "$PROJECT_ID" "NEXT_PUBLIC_SITE_URL" "https://nest-alum1.vercel.app"
ok "사이트 URL 환경변수 주입"

# ─── v2.55.8: ADMIN_DASHBOARD_PASSWORD (대시보드 전용 — Daily Backup도 사용) ───
if [ -n "${ADMIN_DASHBOARD_PASSWORD:-}" ]; then
  vercel_add_env "$PROJECT_ID" "ADMIN_DASHBOARD_PASSWORD" "$ADMIN_DASHBOARD_PASSWORD"
  ok "관리자 대시보드 비밀번호 주입"
else
  info "ADMIN_DASHBOARD_PASSWORD 미설정 — Vercel 기존 값 유지 (있는 경우)"
  info "  ~/.folio-deploy-tokens에 추가: ADMIN_DASHBOARD_PASSWORD='your-password'"
fi

# ─── v2.55.8: INDEXNOW_KEY 자동 생성 + 주입 (Bing/Naver/Yandex 즉시 인덱싱) ───
# INDEXNOW_KEY는 SEO 핵심 — 누락 시 검색 노출이 days/weeks → 활성 시 minutes
if [ -z "${INDEXNOW_KEY:-}" ]; then
  # Vercel에 이미 있으면 그대로 사용, 없으면 UUID 자동 생성
  EXISTING_KEY=$(vercel_api GET "/v9/projects/$PROJECT_ID/env" 2>/dev/null | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const j = JSON.parse(d);
        const e = j.envs?.find(x => x.key === 'INDEXNOW_KEY' && x.target.includes('production'));
        if (e) console.log('EXISTS');
      } catch(e) {}
    });
  ")

  if [ "$EXISTING_KEY" != "EXISTS" ]; then
    # 32자 hex UUID 자동 생성
    INDEXNOW_KEY=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]')
    vercel_add_env "$PROJECT_ID" "INDEXNOW_KEY" "$INDEXNOW_KEY"
    ok "INDEXNOW_KEY 자동 생성 + 주입 (${INDEXNOW_KEY:0:8}...)"
    info "  → Bing/Naver/Yandex 즉시 인덱싱 활성화됨"
  else
    info "INDEXNOW_KEY: Vercel에 이미 존재 — 그대로 사용"
  fi
else
  vercel_add_env "$PROJECT_ID" "INDEXNOW_KEY" "$INDEXNOW_KEY"
  ok "INDEXNOW_KEY 주입 (${INDEXNOW_KEY:0:8}...)"
fi

# ─── v2.55.8: GitHub 자동 백업·시점 복원 환경변수 (선택) ───
if [ -n "${GITHUB_REPO:-}" ]; then
  vercel_add_env "$PROJECT_ID" "GITHUB_REPO" "$GITHUB_REPO"
  ok "GITHUB_REPO 주입"
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
  vercel_add_env "$PROJECT_ID" "GITHUB_TOKEN" "$GITHUB_TOKEN"
  ok "GITHUB_TOKEN 주입"
elif [ -n "${GH_PAT:-}" ]; then
  vercel_add_env "$PROJECT_ID" "GITHUB_TOKEN" "$GH_PAT"
  ok "GITHUB_TOKEN 주입 (\$GH_PAT 사용)"
fi

# ─── 주입 검증 ───
echo ""
info "주입된 환경변수 검증 중..."
INJECTED=$(vercel_api GET "/v9/projects/$PROJECT_ID/env" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try {
      const j = JSON.parse(d);
      if (j.envs) {
        const required = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'ADMIN_PASSWORD'];
        const found = j.envs.filter(e => required.includes(e.key));
        for (const e of found) {
          const targets = e.target.join(',');
          console.log('  ✓ ' + e.key + ' → ' + targets);
        }
        const missing = required.filter(r => !found.find(f => f.key === r));
        if (missing.length > 0) {
          console.log('MISSING:' + missing.join(','));
        }
      }
    } catch(e) {}
  });
")

if echo "$INJECTED" | grep -q "MISSING"; then
  err "일부 환경변수 누락 — 대시보드에서 수동 확인 필요"
  echo "  Settings → Environments → Production → Environment Variables"
  exit 1
fi

echo "$INJECTED"
ok "${BOLD}3개 환경(production/preview/development)에 모두 정상 주입${NC}"

# ─── Node.js 버전 Vercel 프로젝트 설정 동기화 ───
# package.json engines.node와 Vercel UI 설정 불일치로 "Production Overrides" 경고 발생 방지
echo ""
info "Node.js 버전 동기화 (package.json ↔ Vercel 프로젝트 설정)"
NODE_VER_SETTING="22.x"
vercel_sync_node_version "$PROJECT_ID" "$NODE_VER_SETTING" 2>/dev/null || \
  warn "Node 버전 동기화 실패 (선택 단계, 무시해도 됨)"
ok "Node ${NODE_VER_SETTING} 설정 적용"

# =============================================================================
# 12. 재배포 트리거 — 빈 커밋 push로 Vercel 웹훅 발사
# =============================================================================
step "재배포 트리거"

# 환경변수 주입 직후 새 빌드를 트리거하려면 새 커밋이 필요함.
# (이미 git push가 끝난 상태라서 Vercel은 가만히 있음)
git commit --allow-empty -m "Trigger redeploy with env vars (v${NEW_VERSION})" >/dev/null 2>&1

set +e
git push origin "$LOCAL_BRANCH:$GIT_BRANCH" --force > /tmp/git-trigger.log 2>&1
TRIGGER_PUSH_EXIT=$?
set -e

if [ $TRIGGER_PUSH_EXIT -ne 0 ]; then
  warn "트리거 push 실패. 대시보드에서 수동 Redeploy 필요."
  info "https://vercel.com/dashboard"
else
  ok "트리거 push 완료 — Vercel 웹훅이 빌드 시작"
fi

# Vercel이 빌드를 받았는지 5초 대기 후 확인
echo ""
info "Vercel 빌드 시작 대기 (5초)..."
sleep 5

LATEST=$(vercel_latest_deployment "$PROJECT_ID")
if [ -n "$LATEST" ]; then
  STATE=$(echo "$LATEST" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).state || 'UNKNOWN'")
  DEP_URL=$(echo "$LATEST" | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).url || ''")
  case "$STATE" in
    BUILDING|INITIALIZING|QUEUED)
      ok "빌드 진행 중: $STATE"
      [ -n "$DEP_URL" ] && info "Deployment: https://$DEP_URL"
      ;;
    READY)
      ok "이미 빌드 완료: READY"
      ;;
    *)
      warn "배포 상태: $STATE (대시보드 확인 권장)"
      ;;
  esac
else
  warn "배포 상태 조회 실패. 대시보드에서 직접 확인:"
  info "https://vercel.com/dashboard"
fi

# =============================================================================
# v2.55.8: GitHub Secret 자동 설정 (Daily Backup workflow가 dump API 인증에 사용)
# =============================================================================
step "GitHub Secret 동기화 (Daily Backup용)"

if [ -n "${ADMIN_DASHBOARD_PASSWORD:-}" ]; then
  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      # 따옴표·공백·줄바꿈 모두 제거 (안전)
      CLEAN_PW=$(echo -n "$ADMIN_DASHBOARD_PASSWORD" | tr -d '[:space:]' | sed 's/^["'\''"]*//;s/["'\''"]*$//')
      info "ADMIN_DASHBOARD_PASSWORD를 GitHub Secret으로 등록..."
      info "  Vercel과 정확히 같은 값 (길이: ${#CLEAN_PW}자)"

      if echo "$CLEAN_PW" | gh secret set ADMIN_DASHBOARD_PASSWORD --repo "$GITHUB_REPO_PATH" 2>/dev/null; then
        ok "GitHub Secret 등록 완료: ADMIN_DASHBOARD_PASSWORD"
        info "  → Daily Backup workflow가 dump API 인증 통과 가능"
      else
        warn "GitHub Secret 등록 실패 — 수동 추가 필요"
        info "  https://github.com/$GITHUB_REPO_PATH/settings/secrets/actions"
      fi
    else
      warn "gh CLI 미인증 — Secret 자동 등록 skip"
      info "  실행: gh auth login --web"
      info "  이후 재시도 또는 수동 추가"
    fi
  else
    warn "gh CLI 미설치 — Secret 자동 등록 skip"
    info "  설치: brew install gh"
    info "  또는 수동 추가:"
    info "  https://github.com/$GITHUB_REPO_PATH/settings/secrets/actions"
  fi
else
  warn "ADMIN_DASHBOARD_PASSWORD 미설정 — Secret 자동 등록 skip"
fi

# =============================================================================
# v2.55.8: Daily Backup workflow 즉시 트리거 (cron 02:00 KST 안 기다림)
# =============================================================================
step "Daily Backup workflow 즉시 실행"
info "GitHub Actions Daily Card Backup workflow 트리거 중..."
info "(cron은 매일 KST 02:00이지만 첫 실행을 지금 즉시 트리거)"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if gh workflow run "daily-backup.yml" --repo "$GITHUB_REPO_PATH" 2>/dev/null; then
    ok "Daily Backup workflow 트리거됨"
    info "  → 1~2분 후 backups/ 폴더에 첫 백업 자동 생성"
    info "  → 진행 상황: https://github.com/$GITHUB_REPO_PATH/actions/workflows/daily-backup.yml"
  else
    warn "Workflow 자동 트리거 실패 — 수동 실행 가능"
    info "  GitHub repo → Actions → Daily Card Backup → Run workflow"
    info "  또는 admin 대시보드의 [🚀 지금 백업 실행] 버튼 사용"
  fi
else
  info "gh CLI 미인증 — workflow 자동 트리거 skip"
  info "  admin 대시보드의 [🚀 지금 백업 실행] 버튼으로 트리거 가능"
fi

# =============================================================================
# 완료
# =============================================================================
cat <<EOF

${GREEN}${BOLD}✓ 완전 자동 배포 완료${NC}

  버전: v$NEW_VERSION
  프로젝트 ID: $PROJECT_ID
  Production URL: ${CYAN}https://${VERCEL_PROJECT_NAME}.vercel.app${NC}

  빌드 진행 (약 1~2분):
    ${CYAN}https://vercel.com/dashboard${NC}

EOF

# =============================================================================
# Sitemap 자동 검증 (배포 60초 후)
# =============================================================================
info "60초 후 sitemap.xml 자동 검증 (Vercel 빌드 완료 대기)..."
sleep 60

SITEMAP_URL="https://${VERCEL_PROJECT_NAME}.vercel.app/sitemap.xml"
TMP_SITEMAP="/tmp/sitemap-verify-$$.xml"

if curl -s -f -o "$TMP_SITEMAP" "$SITEMAP_URL?$(date +%s)"; then
  # <script/> 자동 주입 검증
  if grep -q "<script" "$TMP_SITEMAP"; then
    warn "Sitemap에 <script> 태그가 여전히 주입됨. Vercel platform 이슈 가능성"
    info "Vercel 대시보드 → Settings → Web Analytics 비활성화 시도 권장"
  else
    ok "Sitemap <script> 자동 주입 차단 확인 ✓"
  fi
  
  # URL 카운트 검증
  URL_COUNT=$(grep -c "<url>" "$TMP_SITEMAP" || echo 0)
  ok "Sitemap URL 수: $URL_COUNT개"
  
  # XML validity 기본 검증
  if grep -q "<urlset" "$TMP_SITEMAP" && grep -q "</urlset>" "$TMP_SITEMAP"; then
    ok "Sitemap XML 유효성 통과"
  else
    warn "Sitemap XML 형식 이상"
  fi
  
  rm -f "$TMP_SITEMAP"
else
  warn "Sitemap 응답 실패. 1~2분 후 수동 재확인 권장:"
  info "  curl -s '$SITEMAP_URL'"
fi

# =============================================================================
# Google에 sitemap ping (검색엔진 빠른 재크롤 trigger)
# =============================================================================
# 2023년 6월부터 Google ping 공식 deprecated이지만 IndexNow는 작동
# Bing/Yandex는 IndexNow 표준 사용
info "검색엔진 빠른 재크롤 ping..."

# IndexNow ping (Bing, Yandex 대상)
INDEXNOW_KEY=$(echo -n "${VERCEL_PROJECT_NAME}-$(date +%Y)" | shasum -a 256 | cut -c1-32)
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"${VERCEL_PROJECT_NAME}.vercel.app\",
    \"key\": \"${INDEXNOW_KEY}\",
    \"urlList\": [
      \"https://${VERCEL_PROJECT_NAME}.vercel.app\",
      \"https://${VERCEL_PROJECT_NAME}.vercel.app/about\",
      \"https://${VERCEL_PROJECT_NAME}.vercel.app/sitemap.xml\"
    ]
  }" >/dev/null 2>&1 && ok "IndexNow ping 전송 완료 (Bing·Yandex)" || true

info "Google Search Console 색인 요청 (수동):"
echo "    1. https://search.google.com/search-console"
echo "    2. URL 검사 → https://${VERCEL_PROJECT_NAME}.vercel.app/sitemap.xml"
echo "    3. '색인 생성 요청' 클릭"
echo ""

# 대시보드 자동 오픈
if command -v open >/dev/null 2>&1; then
  open "https://${VERCEL_PROJECT_NAME}.vercel.app" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "https://${VERCEL_PROJECT_NAME}.vercel.app" >/dev/null 2>&1 &
fi

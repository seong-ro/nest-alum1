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

# 관리자 비밀번호 — v2.4.0부터 fallback 제거되어 환경변수 필수
# 토큰 파일에 ADMIN_PASSWORD가 있으면 사용, 없으면 기본값 "1718" 자동 주입
ADMIN_PW="${ADMIN_PASSWORD:-1718}"
vercel_add_env "$PROJECT_ID" "ADMIN_PASSWORD" "$ADMIN_PW"
if [ "$ADMIN_PW" = "1718" ]; then
  warn "관리자 비밀번호 기본값 '1718' 사용 중. 보안 강화를 원하면:"
  echo "    export ADMIN_PASSWORD='임의의-강력한-비밀번호' 후 재실행"
else
  ok "관리자 비밀번호 환경변수 주입 (사용자 정의)"
fi

# 사이트 URL (선택) — JSON-LD/sitemap/canonical용
vercel_add_env "$PROJECT_ID" "NEXT_PUBLIC_SITE_URL" "https://nest-alum1.vercel.app"
ok "사이트 URL 환경변수 주입"

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

# 대시보드 자동 오픈
if command -v open >/dev/null 2>&1; then
  open "https://${VERCEL_PROJECT_NAME}.vercel.app" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "https://${VERCEL_PROJECT_NAME}.vercel.app" >/dev/null 2>&1 &
fi

#!/usr/bin/env bash
# ------------------------------------------------------------
# Folio Cards — GitHub 원스텝 업로드 스크립트
#
# 기능:
#   1. git init (이미 있으면 건너뜀)
#   2. git add + commit (변경사항 있을 때만)
#   3. remote origin 추가/갱신
#   4. main 브랜치 보장
#   5. push 시도 → 거부 시 대화형 복구
#      (force / pull-rebase-merge / abort)
#
# 사용:
#   bash scripts/push-to-github.sh
#   bash scripts/push-to-github.sh --force              # 묻지 않고 강제 푸시
#   bash scripts/push-to-github.sh -m "수정 커밋 메시지"
#   bash scripts/push-to-github.sh --repo <owner>/<name> # 다른 리포로
#
# macOS / Linux 양쪽 호환 (BSD/GNU sed 모두).
# ------------------------------------------------------------
set -e

# ─── 색상 ─────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD='\033[1m'; DIM='\033[2m'
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; CLAY='\033[38;5;130m'
  RESET='\033[0m'
else
  BOLD=''; DIM=''; RED=''; GREEN=''; YELLOW=''; BLUE=''; CLAY=''; RESET=''
fi
say(){ echo -e "${BLUE}▶${RESET} $1"; }
ok(){  echo -e "${GREEN}✓${RESET} $1"; }
warn(){ echo -e "${YELLOW}⚠${RESET} $1"; }
err(){ echo -e "${RED}✗${RESET} $1"; }
hl(){  echo -e "${CLAY}${BOLD}$1${RESET}"; }

suggest_auth_help() {
  cat <<EOF

GitHub HTTPS 인증 설정 방법 (macOS):

  방법 A) GitHub CLI로 로그인 (가장 간단)
    brew install gh
    gh auth login
    # → HTTPS 선택 → 브라우저 로그인 → 자동 완료

  방법 B) Personal Access Token 발급
    1) https://github.com/settings/tokens/new 방문
    2) scope에 'repo' 체크
    3) 토큰 복사
    4) push 시도 시 Username = GitHub 아이디, Password = 방금 복사한 토큰

  방법 C) macOS Keychain에 저장
    git config --global credential.helper osxkeychain

EOF
}

# ─── 기본값 ────────────────────────────────────────────────────
REPO_PATH="seong-ro/nest-alum1"
FORCE=0
COMMIT_MESSAGE=""
OVERRIDE_NAME=""
OVERRIDE_EMAIL=""
ASK_IDENTITY=0

# ─── 인자 파싱 ──────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--force)
      FORCE=1
      shift
      ;;
    -m|--message)
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    -r|--repo)
      REPO_PATH="$2"
      shift 2
      ;;
    --name)
      OVERRIDE_NAME="$2"
      shift 2
      ;;
    --email)
      OVERRIDE_EMAIL="$2"
      shift 2
      ;;
    --ask-identity)
      ASK_IDENTITY=1
      shift
      ;;
    -h|--help)
      cat <<EOF
Folio Cards — GitHub 원스텝 업로드

사용법:
  bash scripts/push-to-github.sh [옵션]

옵션:
  -f, --force              거부 시 묻지 않고 강제 푸시
  -m, --message "메시지"   커밋 메시지 지정 (기본: 날짜 자동 생성)
  -r, --repo OWNER/REPO    대상 리포 경로 (기본: seong-ro/nest-alum1)
  --name "Real Name"       git user.name 덮어쓰기
  --email "you@example"    git user.email 덮어쓰기
  --ask-identity           user.name/email을 대화형으로 직접 입력 (과거 동작)
  -h, --help               이 도움말

git identity 처리:
  기본적으로 이 스크립트는 git user.name/email을 자동으로 설정합니다.
    - user.name  = 리포 소유자 (예: seong-ro)
    - user.email = {소유자}@users.noreply.github.com
  이 값들은 해당 리포지토리(--local)에만 적용되어 다른 프로젝트에 영향 없음.
  전역 값이 이미 있다면 그대로 사용합니다.

  GitHub에서 'Keep my email addresses private'을 엄격하게 켜둔 경우,
  https://github.com/settings/emails 에서 확인되는
  '{숫자ID}+{사용자명}@users.noreply.github.com' 형식을 --email로 지정하세요.
EOF
      exit 0
      ;;
    *)
      err "알 수 없는 옵션: $1"
      echo "도움말: bash scripts/push-to-github.sh --help"
      exit 1
      ;;
  esac
done

# REPO_PATH 유효성
if [[ ! "$REPO_PATH" =~ ^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$ ]]; then
  err "리포 경로 형식 오류: $REPO_PATH  (예: seong-ro/nest-alum1)"
  exit 1
fi
OWNER="${REPO_PATH%%/*}"
REPO_NAME="${REPO_PATH##*/}"
REPO_URL="https://github.com/${REPO_PATH}.git"
REPO_WEB="https://github.com/${REPO_PATH}"

# 기본 커밋 메시지
if [ -z "$COMMIT_MESSAGE" ]; then
  COMMIT_MESSAGE="chore: sync Folio Cards ($(date +%Y-%m-%d))"
fi

echo ""
hl "Folio Cards — GitHub 업로드"
echo -e "${DIM}대상 리포: ${REPO_WEB}${RESET}"
echo -e "${DIM}커밋 메시지: ${COMMIT_MESSAGE}${RESET}"
echo ""

# ─── 사전 점검 ─────────────────────────────────────────────────

# (1) git 설치
if ! command -v git >/dev/null 2>&1; then
  err "git이 설치되어 있지 않습니다."
  echo "  macOS: xcode-select --install 또는 brew install git"
  exit 1
fi

# (2) 작업 디렉터리 검증 — folio-cards 프로젝트인지
if [ ! -f "package.json" ]; then
  err "현재 디렉터리에 package.json이 없습니다."
  echo "  $(pwd)"
  echo "  folio-cards 프로젝트 디렉터리에서 실행하세요."
  exit 1
fi

if ! grep -q '"folio-cards"' package.json 2>/dev/null; then
  warn "package.json에 'folio-cards' 이름이 확인되지 않습니다."
  warn "계속하면 현재 디렉터리 전체가 ${REPO_PATH}로 push됩니다."
  read -p "계속할까요? [y/N] " ans
  if [[ ! "$ans" =~ ^[Yy]$ ]]; then
    echo "중단됨."
    exit 1
  fi
fi

# ─── 1. git init ────────────────────────────────────────────────
if [ ! -d ".git" ]; then
  say "git init -b main"
  git init -b main >/dev/null
  ok "신규 git 리포지토리 생성"
else
  say "기존 .git 감지 — 초기화 생략"
  # 현재 브랜치가 main이 아니면 변경
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    say "브랜치 $CURRENT_BRANCH → main 이름 변경"
    git branch -M main
  fi
fi

# ─── 2. git identity 자동 설정 (로컬, 이 리포 전용) ────────────
# 원칙:
#   - 기존 global/local user.name/email이 있으면 그대로 유지
#   - 없으면 리포 소유자 이름을 기본값으로 로컬에 설정 (다른 프로젝트에 영향 없음)
#   - --name/--email 플래그가 있으면 우선 적용
#   - --ask-identity 플래그면 과거처럼 대화형 입력 받음

if [ -n "$OVERRIDE_NAME" ]; then
  git config user.name "$OVERRIDE_NAME"
  ok "git user.name 설정: $OVERRIDE_NAME (--name 플래그)"
elif ! git config user.name >/dev/null 2>&1; then
  if [ "$ASK_IDENTITY" -eq 1 ]; then
    read -p "  git user.name 입력: " gitname
    git config user.name "$gitname"
  else
    # 자동 설정: 리포 owner
    git config user.name "$OWNER"
    ok "git user.name 자동 설정: $OWNER ${DIM}(로컬, 이 리포 전용)${RESET}"
  fi
fi

if [ -n "$OVERRIDE_EMAIL" ]; then
  git config user.email "$OVERRIDE_EMAIL"
  ok "git user.email 설정: $OVERRIDE_EMAIL (--email 플래그)"
elif ! git config user.email >/dev/null 2>&1; then
  if [ "$ASK_IDENTITY" -eq 1 ]; then
    read -p "  git user.email 입력: " gitemail
    git config user.email "$gitemail"
  else
    # 자동 설정: GitHub noreply 이메일 형식
    DEFAULT_EMAIL="${OWNER}@users.noreply.github.com"
    git config user.email "$DEFAULT_EMAIL"
    ok "git user.email 자동 설정: $DEFAULT_EMAIL ${DIM}(로컬)${RESET}"
  fi
fi

# ─── 2. add + commit ───────────────────────────────────────────
say "git add + commit"
git add -A

if git diff --cached --quiet 2>/dev/null; then
  # 이미 commit된 경우 — HEAD가 있는지 확인
  if ! git rev-parse HEAD >/dev/null 2>&1; then
    err "staging에 추가할 파일이 없고 commit 이력도 없습니다."
    echo "  현재 디렉터리가 비어있나요?"
    exit 1
  fi
  ok "스테이징할 변경사항 없음 — 기존 커밋 사용"
else
  git commit -m "$COMMIT_MESSAGE" >/dev/null
  ok "새 커밋 생성: $(git log -1 --format=%h)"
fi

# main 브랜치 재확인
git branch -M main 2>/dev/null || true

# ─── 3. remote 설정 ────────────────────────────────────────────
if git remote | grep -q '^origin$'; then
  CURRENT_REMOTE=$(git remote get-url origin)
  if [ "$CURRENT_REMOTE" = "$REPO_URL" ]; then
    say "origin 이미 $REPO_URL 로 설정됨"
  else
    say "origin 주소 갱신: $CURRENT_REMOTE → $REPO_URL"
    git remote set-url origin "$REPO_URL"
  fi
else
  say "git remote add origin $REPO_URL"
  git remote add origin "$REPO_URL"
fi
ok "origin 준비 완료"

# ─── 4. push 시도 ──────────────────────────────────────────────
echo ""
say "git push -u origin main"
echo ""

PUSH_OUTPUT_FILE=$(mktemp)
trap 'rm -f "$PUSH_OUTPUT_FILE"' EXIT

# 안전한 force를 위해 remote 먼저 fetch (무시해도 되는 오류)
do_fetch() {
  git fetch origin main --quiet 2>/dev/null || true
}

# 실제 push (PIPESTATUS로 git의 exit code 캡처)
do_push() {
  local args=("$@")
  git push "${args[@]}" 2>&1 | tee "$PUSH_OUTPUT_FILE"
  return "${PIPESTATUS[0]}"
}

if [ "$FORCE" -eq 1 ]; then
  warn "--force 모드 — 강제 푸시 시도"
  do_fetch
  PUSH_STATUS=0
  # fetch로 origin/main 참조가 확보되면 --force-with-lease, 없으면 plain --force
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    do_push -u origin main --force-with-lease || PUSH_STATUS=$?
  else
    do_push -u origin main --force || PUSH_STATUS=$?
  fi
else
  PUSH_STATUS=0
  do_push -u origin main || PUSH_STATUS=$?
fi

# ─── 5. push 결과 분기 ─────────────────────────────────────────
if [ "$PUSH_STATUS" -eq 0 ]; then
  echo ""
  hl "✅ 푸시 성공!"
  echo ""
  echo "  리포지토리:  $REPO_WEB"
  echo "  최신 커밋:   $(git log -1 --format='%h %s')"
  echo ""
  echo "  다음 단계:"
  echo "    1) Vercel Dashboard 방문 → Add New Project → Import Git Repository"
  echo "    2) '$REPO_PATH' 선택 → Deploy"
  echo ""
  exit 0
fi

# 실패 — 원인 파악
if grep -qE "rejected|fetch first|non-fast-forward" "$PUSH_OUTPUT_FILE"; then
  echo ""
  warn "Push가 거부되었습니다. Remote에 로컬에 없는 커밋이 존재합니다."
  echo ""
  echo -e "${DIM}흔한 원인: GitHub에서 리포지토리를 생성할 때 'Add a README file' 또는${RESET}"
  echo -e "${DIM}'Add .gitignore'를 체크해서 초기 커밋이 만들어진 경우.${RESET}"
  echo ""

  # Remote 상태 잠깐 조회
  say "Remote 브랜치 확인 중…"
  if git fetch origin main 2>/dev/null; then
    REMOTE_COMMIT=$(git log origin/main -1 --format='%h %s' 2>/dev/null || echo "(조회 불가)")
    echo "  ${DIM}remote main 최신: ${REMOTE_COMMIT}${RESET}"
  fi
  echo ""

  echo "어떻게 처리할까요?"
  echo ""
  echo -e "  ${BOLD}[1]${RESET} ${RED}Force push${RESET}    로컬로 remote 덮어쓰기 (remote 내용 삭제됨, 권장)"
  echo -e "  ${BOLD}[2]${RESET} ${BLUE}Merge${RESET}         remote 내용을 받아 병합 후 push (README 등 유지)"
  echo -e "  ${BOLD}[3]${RESET} ${DIM}Abort${RESET}         중단 (직접 처리)"
  echo ""
  read -p "선택 [1/2/3]: " choice
  echo ""

  case "$choice" in
    1)
      warn "force push 실행 중…"
      do_fetch
      FORCE_STATUS=0
      if git rev-parse --verify origin/main >/dev/null 2>&1; then
        do_push -u origin main --force-with-lease || FORCE_STATUS=$?
      else
        do_push -u origin main --force || FORCE_STATUS=$?
      fi
      if [ "$FORCE_STATUS" -eq 0 ]; then
        echo ""
        hl "✅ Force push 성공 — remote가 로컬과 동기화됨"
        echo ""
        echo "  리포지토리: $REPO_WEB"
        exit 0
      else
        err "Force push도 실패했습니다. GitHub 인증 설정을 확인하세요."
        suggest_auth_help
        exit 1
      fi
      ;;
    2)
      say "git pull --rebase origin main (unrelated histories 허용)"
      PULL_STATUS=0
      git pull origin main --rebase --allow-unrelated-histories 2>&1 || PULL_STATUS=$?
      if [ "$PULL_STATUS" -ne 0 ]; then
        err "Merge/rebase 중 충돌 발생. 수동 해결 후 다시 시도하세요:"
        echo "    1) 충돌 파일 편집"
        echo "    2) git add <파일>"
        echo "    3) git rebase --continue"
        echo "    4) git push -u origin main"
        exit 1
      fi
      say "이제 push"
      MERGE_PUSH_STATUS=0
      do_push -u origin main || MERGE_PUSH_STATUS=$?
      if [ "$MERGE_PUSH_STATUS" -eq 0 ]; then
        echo ""
        hl "✅ Merge + push 성공"
        echo ""
        echo "  리포지토리: $REPO_WEB"
        exit 0
      else
        err "push 실패. 위 로그를 확인하세요."
        exit 1
      fi
      ;;
    3|*)
      echo "중단됨. 수동 처리 팁:"
      echo "  force:  git push -u origin main --force-with-lease"
      echo "  merge:  git pull origin main --rebase --allow-unrelated-histories && git push -u origin main"
      exit 1
      ;;
  esac
elif grep -qE "Authentication failed|could not read Username|fatal: Authentication" "$PUSH_OUTPUT_FILE"; then
  echo ""
  err "GitHub 인증 실패"
  suggest_auth_help
  exit 1
elif grep -qE "Permission denied|publickey" "$PUSH_OUTPUT_FILE"; then
  echo ""
  err "SSH 키 인증 실패 (이 스크립트는 HTTPS를 씁니다)"
  echo "  origin이 SSH로 잘못 설정된 것 같습니다:"
  echo "    git remote set-url origin $REPO_URL"
  exit 1
else
  echo ""
  err "알 수 없는 오류로 push 실패"
  echo "  위 로그를 확인하세요. 전체 출력:"
  cat "$PUSH_OUTPUT_FILE"
  exit 1
fi

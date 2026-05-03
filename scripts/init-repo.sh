#!/usr/bin/env bash
# ------------------------------------------------------------
# Folio Cards — GitHub 리포지토리 초기화 스크립트
#
# 사용:
#   bash scripts/init-repo.sh <owner>/<repo> [ssh|https]
#   예: bash scripts/init-repo.sh seong-ro/nest-alum1
#       bash scripts/init-repo.sh seong-ro/nest-alum1 ssh
#
# 동작:
#   1. git init (이미 있으면 스킵)
#   2. package.json 및 README의 seong-ro/nest-alum1 템플릿을 실제 경로로 치환
#      (이미 교체된 프로젝트에서는 no-op)
#   3. git add, 첫 커밋
#   4. GitHub 원격 주소 추가 (기본 HTTPS)
#   5. main 브랜치로 push 안내
#
# 참고: push 명령은 안내만 출력합니다. 실제 push는 사용자가 직접 실행.
# ------------------------------------------------------------
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "사용법: bash scripts/init-repo.sh <owner>/<repo> [ssh|https]"
  echo "예:    bash scripts/init-repo.sh seong-ro/nest-alum1"
  exit 1
fi

REPO_PATH="$1"
PROTOCOL="${2:-https}"

# "user/repo" 형식 검증
if [[ ! "$REPO_PATH" =~ ^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$ ]]; then
  echo "❌ 리포 경로 형식이 올바르지 않습니다: $REPO_PATH"
  echo "   올바른 예: seong-ro/nest-alum1"
  exit 1
fi

if [[ "$PROTOCOL" != "ssh" && "$PROTOCOL" != "https" ]]; then
  echo "❌ 프로토콜은 'ssh' 또는 'https' 중 하나여야 합니다 (기본: https)"
  exit 1
fi

OWNER="${REPO_PATH%%/*}"
REPO="${REPO_PATH##*/}"

if [[ "$PROTOCOL" == "ssh" ]]; then
  REMOTE_URL="git@github.com:${REPO_PATH}.git"
else
  REMOTE_URL="https://github.com/${REPO_PATH}.git"
fi

echo "▶ 리포 경로:   $REPO_PATH"
echo "▶ 원격 URL:    $REMOTE_URL"
echo ""

# 1. 템플릿 치환 (YOUR_USERNAME 잔존분이 있을 경우)
if grep -rq "YOUR_USERNAME/folio-cards" package.json README.md CONTRIBUTING.md lib/export-formats.ts 2>/dev/null; then
  echo "▶ YOUR_USERNAME 플레이스홀더 감지 — 치환 중…"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|YOUR_USERNAME/folio-cards|$REPO_PATH|g" \
      package.json README.md CONTRIBUTING.md lib/export-formats.ts
    sed -i '' "s|YOUR_USERNAME%2Fnest-alum1s|$OWNER%2F$REPO|g" README.md
    sed -i '' "s|project-name=folio-cards|project-name=$REPO|g" README.md
    sed -i '' "s|repository-name=folio-cards|repository-name=$REPO|g" README.md
  else
    sed -i "s|YOUR_USERNAME/folio-cards|$REPO_PATH|g" \
      package.json README.md CONTRIBUTING.md lib/export-formats.ts
    sed -i "s|YOUR_USERNAME%2Fnest-alum1s|$OWNER%2F$REPO|g" README.md
    sed -i "s|project-name=folio-cards|project-name=$REPO|g" README.md
    sed -i "s|repository-name=folio-cards|repository-name=$REPO|g" README.md
  fi
fi

# 2. git init
if [ ! -d ".git" ]; then
  echo "▶ git init -b main"
  git init -b main
else
  echo "▶ 기존 .git 감지 — 초기화 생략"
  # 현재 브랜치가 main이 아니면 강제 변경
  current=$(git branch --show-current 2>/dev/null || echo "")
  if [ -n "$current" ] && [ "$current" != "main" ]; then
    echo "▶ 브랜치 $current → main 이름 변경"
    git branch -M main
  fi
fi

# 3. 커밋
git add .
if git diff --cached --quiet; then
  echo "▶ 커밋할 변경사항 없음"
else
  git commit -m "chore: initial Folio Cards commit"
fi

# 4. 원격 추가 (있으면 주소 갱신)
if git remote | grep -q '^origin$'; then
  echo "▶ origin 이미 존재 — 주소 갱신"
  git remote set-url origin "$REMOTE_URL"
else
  echo "▶ git remote add origin $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
fi

echo ""
echo "✅ 준비 완료. 다음 단계:"
echo ""
echo "   1) GitHub에서 https://github.com/new 접속 →"
echo "      소유자 '$OWNER', 리포 이름 '$REPO'로 빈 리포지토리 생성"
echo "      (README·.gitignore·LICENSE는 추가하지 마세요 — 이미 프로젝트에 있음)"
echo ""
echo "   2) push:"
echo "      git push -u origin main"
echo ""
echo "   3) Vercel → Add New → Project → Import Git Repository →"
echo "      '$REPO_PATH' 선택 → Deploy (환경변수 없음)"
echo ""

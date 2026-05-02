#!/bin/bash
# v2.13.7 정리 스크립트 — 옛 Metadata API 파일들을 명시적으로 삭제
# Mac/Linux 양쪽에서 작동
# 이 스크립트는 zip을 풀고 나서 한 번 실행하면 됨

set -e

DIR="${1:-.}"

echo "▸ 옛 Metadata API 파일 정리 (sitemap.ts, robots.ts)"

for f in "$DIR/app/sitemap.ts" "$DIR/app/robots.ts"; do
  if [ -f "$f" ]; then
    echo "  ✗ 삭제: $f"
    rm -f "$f"
  fi
done

echo ""
echo "▸ 정리 후 sitemap/robots 관련 파일 구조"
ls -la "$DIR"/app/sitemap* "$DIR"/app/robots* 2>&1 | grep -v "No such" || true

echo ""
echo "✓ 정리 완료. Route Handler만 남아있어야 정상:"
echo "  app/sitemap.xml/route.ts"
echo "  app/robots.txt/route.ts"

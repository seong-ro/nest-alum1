/**
 * v2.46.0: 카드 데이터 백업 dump API.
 *
 * 모든 카드를 JSON으로 반환 — GitHub Actions가 매일 호출하여 backups/ 폴더에 저장.
 * 사용자 직접 편집 카드(userEdited=true)에 우선순위 표시로 백업/복원 시 보호.
 *
 * 인증: ADMIN_DASHBOARD_PASSWORD (최고 관리자 전용 환경변수)
 *  - 카드 등록용 ADMIN_PASSWORD는 admin API 접근 불가 (권한 분리)
 *
 * 응답:
 *  {
 *    ok: true,
 *    version: "v2.46.0",
 *    dumpedAt: "2026-05-08T03:00:00.000Z",
 *    total: N,
 *    userEditedCount: M,
 *    cards: [{ id, card: {...}, createdAt, updatedAt }, ...]
 *  }
 */

import { NextRequest, NextResponse } from "next/server";
import { kvLoadGallery, isKvConfigured } from "@/lib/kv-storage";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: NextRequest): boolean {
  // v2.48.0: ADMIN_DASHBOARD_PASSWORD만 허용. ADMIN_PASSWORD(카드 등록용)는 admin 권한 X.
  // 카드 등록·수정·삭제용 비밀번호 ≠ 최고 관리자 대시보드 비밀번호 — 권한 분리.
  const adminDashboardPw = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!adminDashboardPw) return false;

  // Authorization: Bearer <password> 헤더만 허용 (URL 쿼리 X — 로그 노출 방지)
  const headerAuth = req.headers.get("authorization");
  const bearerToken = headerAuth?.startsWith("Bearer ") ? headerAuth.slice(7) : null;
  if (!bearerToken) return false;
  return bearerToken === adminDashboardPw;
}

export async function GET(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 503 });
  }
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const gallery = await kvLoadGallery();
  const userEditedCount = gallery.filter((c) => c.card.userEdited).length;

  log.info("admin-dump", "dumped", {
    total: gallery.length,
    userEditedCount,
  });

  return NextResponse.json({
    ok: true,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    dumpedAt: new Date().toISOString(),
    total: gallery.length,
    userEditedCount,
    cards: gallery,
  });
}

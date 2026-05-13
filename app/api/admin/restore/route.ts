/**
 * v2.46.0: 백업 데이터로 카드 복원 API.
 *
 * POST body:
 *  {
 *    password: "ADMIN_DASHBOARD_PASSWORD",
 *    confirm: true,
 *    mode: "merge" | "replace",
 *    cards: [...]   // dump API의 cards 배열
 *  }
 *
 * mode:
 *  - "merge" (권장): 백업 카드를 기존 갤러리에 병합. userEdited 카드 우선 보존.
 *  - "replace" (위험): 갤러리 전체를 백업으로 교체. 기존 카드 모두 삭제.
 */

import { NextRequest, NextResponse } from "next/server";
import { kvBulkRestore, isKvConfigured } from "@/lib/kv-storage";
import type { StoredCard } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { pingIndexNowFireAndForget } from "@/lib/indexnow";
import { getSiteUrl } from "@/lib/site-url";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: NextRequest, providedPassword: string | null): boolean {
  // v2.48.0: 권한 분리 — admin 대시보드는 ADMIN_DASHBOARD_PASSWORD 전용.
  // ADMIN_PASSWORD(카드 등록·수정·삭제용)는 admin API 접근 불가.
  const adminDashboardPw = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!adminDashboardPw) return false;
  const headerAuth = req.headers.get("authorization");
  const bearerToken = headerAuth?.startsWith("Bearer ") ? headerAuth.slice(7) : null;
  const candidate = bearerToken ?? providedPassword;
  if (!candidate) return false;
  return candidate === adminDashboardPw;
}

export async function POST(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 503 });
  }

  let body: {
    password?: string;
    confirm?: boolean;
    mode?: "merge" | "replace";
    cards?: StoredCard[];
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 });
  }

  if (!authorize(req, body.password ?? null)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!body.confirm) {
    return NextResponse.json(
      { ok: false, error: "confirm=true 필수 — 복원은 데이터를 변경합니다" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.cards)) {
    return NextResponse.json({ ok: false, error: "cards 배열 필수" }, { status: 400 });
  }

  // 입력 검증 — StoredCard 형태인지
  for (let i = 0; i < body.cards.length; i++) {
    const c = body.cards[i];
    if (!c || typeof c !== "object" || !c.id || !c.card || !c.card.headline) {
      return NextResponse.json(
        { ok: false, error: `cards[${i}]가 유효한 StoredCard 형식이 아닙니다` },
        { status: 400 },
      );
    }
  }

  const mode = body.mode ?? "merge";
  const result = await kvBulkRestore(body.cards, mode);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  // v2.53.0: 갤러리 전체 변경 → sitemap만 ping (카드별은 건수 많음)
  try {
    const siteUrl = getSiteUrl();
    pingIndexNowFireAndForget([siteUrl, `${siteUrl}/sitemap.xml`]);
  } catch {
    /* env 미설정 무시 */
  }

  log.info("admin-restore", "complete", {
    mode,
    ...result,
  });

  return NextResponse.json({
    ok: true,
    mode,
    ...result,
  });
}

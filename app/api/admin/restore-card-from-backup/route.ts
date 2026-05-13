/**
 * v2.49.0: 단일 카드를 특정 백업 시점으로 복원.
 *
 * POST /api/admin/restore-card-from-backup
 * body: { password, cardId, backupPath, confirm: true }
 *
 * 동작:
 *  1. 지정된 backupPath에서 cardId가 있는 카드 fetch
 *  2. 해당 카드만 KV에 upsert (다른 카드는 영향 X)
 *  3. 결과 반환 (이전 → 이후 비교 정보)
 */

import { NextRequest, NextResponse } from "next/server";
import { kvUpsertCard, kvFindCard, isKvConfigured } from "@/lib/kv-storage";
import type { StoredCard } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { pingIndexNowFireAndForget } from "@/lib/indexnow";
import { getSiteUrl } from "@/lib/site-url";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: NextRequest, providedPassword: string | null): boolean {
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
    cardId?: string;
    backupPath?: string;
    confirm?: boolean;
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
      { ok: false, error: "confirm=true 필수" },
      { status: 400 },
    );
  }

  if (!body.cardId || !body.backupPath) {
    return NextResponse.json(
      { ok: false, error: "cardId와 backupPath 필수" },
      { status: 400 },
    );
  }

  if (!/^backups\/[\w./-]+\.json$/.test(body.backupPath)) {
    return NextResponse.json(
      { ok: false, error: "유효하지 않은 백업 경로" },
      { status: 400 },
    );
  }

  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubRepo || !githubToken) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_REPO 또는 GITHUB_TOKEN 환경변수 미설정" },
      { status: 503 },
    );
  }

  // 백업 파일에서 해당 카드 추출
  const contentsRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/contents/${body.backupPath}?ref=main`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.raw",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!contentsRes.ok) {
    return NextResponse.json(
      { ok: false, error: `백업 파일을 가져올 수 없음 (HTTP ${contentsRes.status})` },
      { status: 502 },
    );
  }
  let parsed: { cards?: StoredCard[] };
  try {
    parsed = await contentsRes.json();
  } catch {
    return NextResponse.json({ ok: false, error: "백업 파일이 JSON이 아닙니다" }, { status: 502 });
  }
  if (!Array.isArray(parsed.cards)) {
    return NextResponse.json({ ok: false, error: "백업에 cards 배열이 없습니다" }, { status: 502 });
  }

  const targetCard = parsed.cards.find((c) => c.id === body.cardId);
  if (!targetCard) {
    return NextResponse.json(
      { ok: false, error: `백업에 cardId=${body.cardId.slice(0, 8)}... 카드 없음` },
      { status: 404 },
    );
  }

  // 현재 카드 (변경 전)
  const currentCard = await kvFindCard(body.cardId);

  // 단일 카드 upsert
  const result = await kvUpsertCard(targetCard.id, targetCard.card);
  revalidatePath("/");
  revalidatePath(`/${targetCard.id}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  // v2.53.0: 단일 카드 복원 → 그 카드 + sitemap ping
  try {
    const siteUrl = getSiteUrl();
    pingIndexNowFireAndForget([
      siteUrl,
      `${siteUrl}/${targetCard.id}`,
      `${siteUrl}/sitemap.xml`,
    ]);
  } catch {
    /* env 미설정 무시 */
  }

  log.info("admin-restore-card", "complete", {
    cardId: body.cardId.slice(0, 8),
    backupPath: body.backupPath,
    mode: result.mode,
  });

  return NextResponse.json({
    ok: true,
    cardId: body.cardId,
    backupPath: body.backupPath,
    mode: result.mode,
    before: currentCard
      ? {
          headline: currentCard.card.headline,
          updatedAt: currentCard.updatedAt,
          userEdited: !!currentCard.card.userEdited,
        }
      : null,
    after: {
      headline: targetCard.card.headline,
      updatedAt: targetCard.updatedAt,
      userEdited: !!targetCard.card.userEdited,
    },
  });
}

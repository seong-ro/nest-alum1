/**
 * v2.49.0: 특정 카드의 백업 이력 조회.
 *
 * GET /api/admin/card-history?id=<dedupKey>&days=30
 *
 * 동작:
 *  1. backups/ 폴더에서 최근 N일 (기본 30일) 안 백업 파일들 나열
 *  2. 각 백업 파일을 fetch하여 해당 cardId가 있는지 확인
 *  3. 발견된 백업의 (날짜, 경로, 카드 스냅샷) 반환
 *
 * 응답:
 *  {
 *    ok: true,
 *    cardId: string,
 *    currentCard: StoredCard | null,
 *    history: [
 *      { path: string, date: string, card: StoredCard, isDifferent: boolean }
 *    ]
 *  }
 */

import { NextRequest, NextResponse } from "next/server";
import { kvFindCard, isKvConfigured } from "@/lib/kv-storage";
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

export async function GET(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const passwordParam = url.searchParams.get("password");
  if (!authorize(req, passwordParam)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cardId = url.searchParams.get("id");
  const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get("days") ?? "30", 10) || 30));
  if (!cardId) {
    return NextResponse.json({ ok: false, error: "id 파라미터 필수" }, { status: 400 });
  }

  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubRepo || !githubToken) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "GITHUB_REPO 또는 GITHUB_TOKEN 환경변수가 설정되지 않았습니다. Vercel Settings → Environment Variables에서 추가해 주세요.",
      },
      { status: 503 },
    );
  }

  // 현재 카드
  const currentCard = await kvFindCard(cardId);

  // 백업 파일 목록 조회 (Git Tree API)
  let backupPaths: Array<{ path: string; date: string }> = [];
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${githubRepo}/git/trees/main?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!treeRes.ok) {
      return NextResponse.json(
        { ok: false, error: `GitHub API HTTP ${treeRes.status} — 토큰 권한 확인 필요 (contents:read)` },
        { status: 502 },
      );
    }
    const data = await treeRes.json();
    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

    backupPaths = (data.tree as Array<{ path: string; type: string }>)
      .filter(
        (t) =>
          t.type === "blob" &&
          /^backups\/.+folio-cards-\d{4}-\d{2}-\d{2}\.json$/.test(t.path),
      )
      .map((t) => {
        const m = t.path.match(/(\d{4})-(\d{2})-(\d{2})\.json$/);
        return {
          path: t.path,
          date: m ? `${m[1]}-${m[2]}-${m[3]}` : "",
        };
      })
      .filter((b) => {
        if (!b.date) return false;
        const dt = Date.parse(b.date + "T00:00:00Z");
        return !isNaN(dt) && dt >= cutoffMs;
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // 최신순
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "GitHub Tree API 호출 실패" },
      { status: 502 },
    );
  }

  // 각 백업에서 해당 카드 추출 (병렬 fetch — 단, 너무 많으면 throttle)
  const maxParallel = 6;
  const history: Array<{
    path: string;
    date: string;
    card: any;
    isDifferent: boolean;
  }> = [];

  for (let i = 0; i < backupPaths.length; i += maxParallel) {
    const batch = backupPaths.slice(i, i + maxParallel);
    const results = await Promise.all(
      batch.map(async (b) => {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${githubRepo}/contents/${b.path}?ref=main`,
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: "application/vnd.github.raw",
                "X-GitHub-Api-Version": "2022-11-28",
              },
            },
          );
          if (!res.ok) return null;
          const data = await res.json();
          const found = (data.cards ?? []).find((c: any) => c.id === cardId);
          if (!found) return null;
          // 현재 카드와 다른지 비교 (updatedAt 기준)
          const isDifferent =
            !currentCard || found.updatedAt !== currentCard.updatedAt;
          return { path: b.path, date: b.date, card: found, isDifferent };
        } catch {
          return null;
        }
      }),
    );
    for (const r of results) {
      if (r) history.push(r);
    }
  }

  log.info("admin-card-history", "fetched", {
    cardId: cardId.slice(0, 8),
    backupCount: backupPaths.length,
    historyCount: history.length,
    days,
  });

  return NextResponse.json({
    ok: true,
    cardId,
    currentCard,
    history,
    days,
    totalBackups: backupPaths.length,
  });
}

/**
 * v2.43.0: 중복 카드 자동 정리 API.
 *
 * 같은 sourceUrl이 다른 dedupKey 변형으로 중복 저장된 경우 (예: kodit.co.kr가
 * 다른 정규화 결과로 두 번 저장) 가장 최근 것만 남기고 삭제.
 *
 * 인증:
 *  - GET: ADMIN_DASHBOARD_PASSWORD 헤더로 검증 (최고 관리자 전용)
 *  - POST: ADMIN_DASHBOARD_PASSWORD body로 검증 (cron 또는 수동 호출)
 *
 * 응답:
 *  { ok: true, scanned: N, duplicates: M, deleted: K, groups: [...] }
 *
 * 기본 동작: dryRun=true로 검사만 (삭제 X). dryRun=false 또는 confirm=true 시 실제 삭제.
 */

import { NextRequest, NextResponse } from "next/server";
import { kvLoadGallery, kvDeleteCard, isKvConfigured } from "@/lib/kv-storage";
import { computeDedupKey } from "@/lib/dedup-key";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DuplicateGroup {
  canonicalKey: string;
  domain: string;
  kept: { id: string; sourceUrl: string; updatedAt: string };
  removed: Array<{ id: string; sourceUrl: string; updatedAt: string }>;
}

async function performCleanup(dryRun: boolean): Promise<{
  scanned: number;
  duplicateGroups: number;
  duplicateCards: number;
  deleted: number;
  groups: DuplicateGroup[];
}> {
  const gallery = await kvLoadGallery();

  // 모든 카드를 sourceUrl 정규화 키로 그룹핑
  const grouped = new Map<string, typeof gallery>();
  for (const stored of gallery) {
    const canonicalKey = computeDedupKey(stored.card.sourceUrl);
    const arr = grouped.get(canonicalKey) ?? [];
    arr.push(stored);
    grouped.set(canonicalKey, arr);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  let duplicateCards = 0;
  let deleted = 0;

  for (const [canonicalKey, group] of grouped) {
    if (group.length <= 1) continue;

    // updatedAt 내림차순 (가장 최근 것 첫째)
    group.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const kept = group[0];
    const toRemove = group.slice(1);

    duplicateCards += toRemove.length;

    // userEdited 카드는 보존 우선순위 — userEdited=true가 있으면 그것을 keep
    const userEditedIdx = group.findIndex((g) => g.card.userEdited);
    let actualKept = kept;
    let actualRemove = toRemove;
    if (userEditedIdx > 0) {
      actualKept = group[userEditedIdx];
      actualRemove = group.filter((_, i) => i !== userEditedIdx);
    }

    duplicateGroups.push({
      canonicalKey,
      domain: actualKept.card.sourceDomain,
      kept: {
        id: actualKept.id,
        sourceUrl: actualKept.card.sourceUrl,
        updatedAt: actualKept.updatedAt,
      },
      removed: actualRemove.map((r) => ({
        id: r.id,
        sourceUrl: r.card.sourceUrl,
        updatedAt: r.updatedAt,
      })),
    });

    if (!dryRun) {
      for (const r of actualRemove) {
        try {
          await kvDeleteCard(r.id);
          deleted++;
          log.info("cleanup-duplicates", "deleted", {
            id: r.id.slice(0, 8),
            sourceUrl: r.card.sourceUrl,
            keptId: actualKept.id.slice(0, 8),
          });
        } catch (e) {
          log.warn("cleanup-duplicates", "delete-failed", {
            id: r.id.slice(0, 8),
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
  }

  return {
    scanned: gallery.length,
    duplicateGroups: duplicateGroups.length,
    duplicateCards,
    deleted,
    groups: duplicateGroups,
  };
}

function authorize(req: NextRequest, providedPassword: string | null): boolean {
  // v2.48.0: 권한 분리 — admin API는 ADMIN_DASHBOARD_PASSWORD 전용.
  // ADMIN_PASSWORD(카드 등록·수정·삭제용)는 admin 대시보드 작업 불가.
  const adminDashboardPw = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!adminDashboardPw) return false;

  const headerAuth = req.headers.get("authorization");
  const bearerToken = headerAuth?.startsWith("Bearer ") ? headerAuth.slice(7) : null;
  const candidate = providedPassword ?? bearerToken;
  if (!candidate) return false;
  return candidate === adminDashboardPw;
}

export async function GET(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const password = url.searchParams.get("password");
  if (!authorize(req, password)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // GET은 항상 dryRun (검사만)
  const result = await performCleanup(true);
  return NextResponse.json({ ok: true, dryRun: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 503 });
  }
  let body: { password?: string; confirm?: boolean; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // body 없어도 헤더로 인증 가능
  }
  if (!authorize(req, body.password ?? null)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const dryRun = body.dryRun !== false && body.confirm !== true;
  const result = await performCleanup(dryRun);
  log.info("cleanup-duplicates", "complete", {
    dryRun,
    scanned: result.scanned,
    duplicateGroups: result.duplicateGroups,
    deleted: result.deleted,
  });
  return NextResponse.json({ ok: true, dryRun, ...result });
}

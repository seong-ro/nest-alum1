/**
 * v2.47.0: GitHub의 백업 파일에서 직접 복원 — 다운로드/업로드 없이 한 클릭으로.
 *
 * GET: 사용 가능한 백업 파일 목록 반환 (backups/ 폴더 + latest.json)
 * POST: 특정 백업 파일을 GitHub에서 fetch하여 KV에 복원
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

interface BackupFileEntry {
  path: string;
  name: string;
  date?: string;
  size?: number;
}

interface BackupListResult {
  entries: BackupFileEntry[];
  diag: {
    latestStatus: number;       // 0 = network fail
    treeStatus: number;
    treeBlobCount: number;
    backupCandidates: number;   // backups/*.json (not including latest)
    notes: string[];            // human-readable diagnostic notes
  };
}

async function listBackups(
  githubRepo: string,
  githubToken: string,
): Promise<BackupListResult> {
  const out: BackupFileEntry[] = [];
  const diag = {
    latestStatus: 0,
    treeStatus: 0,
    treeBlobCount: 0,
    backupCandidates: 0,
    notes: [] as string[],
  };

  // latest.json fetch
  try {
    const latestRes = await fetch(
      `https://api.github.com/repos/${githubRepo}/contents/backups/latest.json?ref=main`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    diag.latestStatus = latestRes.status;
    if (latestRes.ok) {
      const data = await latestRes.json();
      if (data && !Array.isArray(data)) {
        out.push({
          path: "backups/latest.json",
          name: "latest (가장 최근)",
          size: data.size,
        });
      }
    } else if (latestRes.status === 404) {
      diag.notes.push("backups/latest.json 파일이 아직 없습니다 (첫 자동 백업 전).");
    } else if (latestRes.status === 401 || latestRes.status === 403) {
      diag.notes.push(
        `GitHub API 인증 실패 (HTTP ${latestRes.status}) — GITHUB_TOKEN이 잘못됐거나 contents:read 권한 부족.`,
      );
    } else {
      diag.notes.push(`backups/latest.json fetch 실패 (HTTP ${latestRes.status}).`);
    }
  } catch (e) {
    diag.notes.push(`latest.json 네트워크 오류: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Git Tree API로 backups/ 디렉토리 walk
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
    diag.treeStatus = treeRes.status;
    if (treeRes.ok) {
      const data = await treeRes.json();
      const tree = (data.tree as Array<{ path: string; type: string; size: number; url: string }>) ?? [];
      diag.treeBlobCount = tree.length;
      const candidates = tree
        .filter(
          (t) =>
            t.type === "blob" &&
            /^backups\/.+\.json$/.test(t.path) &&
            !t.path.endsWith("latest.json"),
        )
        .sort((a, b) => b.path.localeCompare(a.path))
        .slice(0, 30);
      diag.backupCandidates = candidates.length;
      for (const entry of candidates) {
        const m = entry.path.match(/(\d{4}-\d{2}-\d{2})\.json$/);
        out.push({
          path: entry.path,
          name: m ? m[1] : entry.path.split("/").pop() ?? entry.path,
          date: m ? m[1] : undefined,
          size: entry.size,
        });
      }
      if (data.truncated) {
        diag.notes.push("Git Tree 응답이 truncated — repo가 매우 크면 일부 백업이 누락될 수 있습니다.");
      }
    } else if (treeRes.status === 401 || treeRes.status === 403) {
      diag.notes.push(
        `GitHub Tree API 인증 실패 (HTTP ${treeRes.status}) — GITHUB_TOKEN이 잘못됐거나 contents:read 권한 부족.`,
      );
    } else if (treeRes.status === 404) {
      diag.notes.push(
        `Tree API 404 — GITHUB_REPO 값이 올바른지 확인하세요 (현재: ${githubRepo}).`,
      );
    } else if (treeRes.status === 409) {
      diag.notes.push("Tree API 409 — repository가 비어있습니다 (commit 0개).");
    } else {
      diag.notes.push(`Git Tree API HTTP ${treeRes.status}.`);
    }
  } catch (e) {
    diag.notes.push(`Tree API 네트워크 오류: ${e instanceof Error ? e.message : String(e)}`);
    log.warn("admin-restore-from-github", "tree-walk-failed", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return { entries: out, diag };
}

export async function GET(req: NextRequest) {
  // GET은 헤더 또는 query string으로 인증 — body 없으니
  const url = new URL(req.url);
  const passwordParam = url.searchParams.get("password");
  if (!authorize(req, passwordParam)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const githubRepo = process.env.GITHUB_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubRepo || !githubToken) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_REPO 또는 GITHUB_TOKEN 환경변수가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  try {
    const result = await listBackups(githubRepo, githubToken);
    return NextResponse.json({
      ok: true,
      repo: githubRepo,
      backups: result.entries,
      diag: result.diag,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isKvConfigured()) {
    return NextResponse.json({ ok: false, error: "KV not configured" }, { status: 503 });
  }

  let body: {
    password?: string;
    confirm?: boolean;
    mode?: "merge" | "replace";
    path?: string;
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

  if (!body.path || !/^backups\/[\w./-]+\.json$/.test(body.path)) {
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

  // GitHub Contents API로 파일 fetch (private repo도 작동)
  const contentsRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/contents/${body.path}?ref=main`,
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
      {
        ok: false,
        error: `GitHub에서 ${body.path}을 가져올 수 없어요 (HTTP ${contentsRes.status})`,
      },
      { status: 502 },
    );
  }
  let parsed: { cards?: StoredCard[] };
  try {
    parsed = await contentsRes.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "백업 파일이 유효한 JSON이 아닙니다." },
      { status: 502 },
    );
  }
  if (!Array.isArray(parsed.cards)) {
    return NextResponse.json(
      { ok: false, error: "백업 파일에 cards 배열이 없습니다." },
      { status: 502 },
    );
  }

  for (let i = 0; i < parsed.cards.length; i++) {
    const c = parsed.cards[i];
    if (!c || typeof c !== "object" || !c.id || !c.card || !c.card.headline) {
      return NextResponse.json(
        { ok: false, error: `cards[${i}] 형식 오류` },
        { status: 502 },
      );
    }
  }

  const mode = body.mode ?? "merge";
  const result = await kvBulkRestore(parsed.cards, mode);
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

  log.info("admin-restore-from-github", "complete", {
    path: body.path,
    mode,
    ...result,
  });

  return NextResponse.json({
    ok: true,
    path: body.path,
    mode,
    ...result,
  });
}

/**
 * v2.47.0: 즉시 백업 — GitHub Actions Daily Backup workflow를 수동 트리거.
 *
 * Admin UI의 "지금 백업하기" 버튼이 호출. 다운로드 대신 GitHub repo에 자동 저장.
 *
 * 환경변수:
 *  - GITHUB_REPO: "owner/repo" 형식 (예: "seong-ro/nest-alum1")
 *  - GITHUB_TOKEN: workflow 트리거 권한 있는 PAT (또는 fine-grained token)
 *      - Required scopes: actions:write, contents:write
 *
 * 응답:
 *  { ok: true, message: "백업 작업이 GitHub Actions에서 시작됐습니다..." }
 *
 * 사용자가 GitHub Actions 탭에서 진행 상황 확인 가능.
 */

import { NextRequest, NextResponse } from "next/server";
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
  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body if header auth */
  }
  if (!authorize(req, body.password ?? null)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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

  // GitHub REST API: workflow_dispatch 트리거
  // POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
  const url = `https://api.github.com/repos/${githubRepo}/actions/workflows/daily-backup.yml/dispatches`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    });

    if (res.status === 204) {
      log.info("admin-backup-now", "triggered", { repo: githubRepo });
      return NextResponse.json({
        ok: true,
        message:
          "백업 작업이 GitHub Actions에서 시작됐습니다. 진행 상황은 GitHub 저장소의 Actions 탭에서 확인할 수 있어요. 보통 30초~1분 후 backups/ 폴더에 저장됩니다.",
        actionsUrl: `https://github.com/${githubRepo}/actions/workflows/daily-backup.yml`,
      });
    }

    const errBody = await res.text();
    log.warn("admin-backup-now", "github-api-error", {
      status: res.status,
      body: errBody.slice(0, 500),
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GitHub 인증 실패 — GITHUB_TOKEN이 만료됐거나 권한 부족 (actions:write, contents:write 필요).",
        },
        { status: 502 },
      );
    }
    if (res.status === 404) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "워크플로우를 찾을 수 없어요 — daily-backup.yml이 main 브랜치에 push됐는지, GITHUB_REPO 값이 올바른지 확인해 주세요.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { ok: false, error: `GitHub API 오류 ${res.status}: ${errBody.slice(0, 200)}` },
      { status: 502 },
    );
  } catch (e) {
    log.error("admin-backup-now", "fetch-failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, error: "GitHub API 호출 실패: " + (e instanceof Error ? e.message : String(e)) },
      { status: 502 },
    );
  }
}

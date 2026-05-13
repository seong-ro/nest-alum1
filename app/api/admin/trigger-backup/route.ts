/**
 * v2.55.6: GitHub Actions Daily Card Backup workflow 수동 트리거
 *
 * 사용 시나리오:
 *  - 첫 배포 후 cron(KST 02:00)까지 기다리지 않고 즉시 백업 실행
 *  - 수동 검증·복구 시점에 "지금 백업" 필요한 경우
 *  - GitHub Actions UI 안 가도 admin 대시보드에서 한 클릭
 *
 * 동작:
 *  1. ADMIN_DASHBOARD_PASSWORD로 인증
 *  2. GitHub Actions REST API 호출:
 *     POST /repos/{owner}/{repo}/actions/workflows/daily-backup.yml/dispatches
 *     body: { ref: "main" }
 *  3. 응답 204 No Content가 정상 (fire-and-forget)
 *  4. 1~2분 후 backups/ 폴더에 새 commit 생성됨
 *
 * 환경변수:
 *  - GITHUB_REPO + GITHUB_TOKEN 필요 (이미 시점 복원용으로 사용 중)
 */

import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_DASHBOARD_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD ?? "";
const WORKFLOW_FILENAME = "daily-backup.yml";

export async function POST(req: Request) {
  // 1. 인증
  const url = new URL(req.url);
  const password = url.searchParams.get("password") ?? "";

  if (!ADMIN_DASHBOARD_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_DASHBOARD_PASSWORD 환경변수가 설정되지 않았습니다." },
      { status: 503 },
    );
  }
  if (password !== ADMIN_DASHBOARD_PASSWORD) {
    return NextResponse.json({ ok: false, error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  // 2. GitHub 환경변수 확인
  const githubRepo = process.env.GITHUB_REPO?.trim();
  const githubToken = process.env.GITHUB_TOKEN?.trim();
  if (!githubRepo || !githubToken) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "GITHUB_REPO 또는 GITHUB_TOKEN 환경변수가 설정되지 않았습니다. " +
          "Vercel Dashboard → Settings → Environment Variables에서 추가 후 Redeploy 하세요.",
      },
      { status: 503 },
    );
  }

  // 3. GitHub Actions REST API 호출
  try {
    const apiUrl = `https://api.github.com/repos/${githubRepo}/actions/workflows/${WORKFLOW_FILENAME}/dispatches`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    });

    // GitHub API: 204 No Content = success (fire-and-forget)
    if (res.status === 204) {
      log.info("admin-trigger-backup", "dispatched", { repo: githubRepo });
      return NextResponse.json({
        ok: true,
        message:
          "Daily Backup workflow 트리거됨. 1~2분 후 backups/ 폴더에 새 백업이 생성됩니다.",
        workflowRunsUrl: `https://github.com/${githubRepo}/actions/workflows/${WORKFLOW_FILENAME}`,
      });
    }

    // 에러 처리
    let errorBody: unknown;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = await res.text();
    }

    log.warn("admin-trigger-backup", "github-api-error", {
      status: res.status,
      body: errorBody,
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        {
          ok: false,
          error: `GitHub API 인증 실패 (HTTP ${res.status}). GITHUB_TOKEN의 권한 부족 — Actions: Read and write 필요.`,
        },
        { status: 502 },
      );
    }
    if (res.status === 404) {
      return NextResponse.json(
        {
          ok: false,
          error: `Workflow 파일 못 찾음 (HTTP 404). .github/workflows/${WORKFLOW_FILENAME}가 main 브랜치에 push됐는지 확인하세요.`,
        },
        { status: 502 },
      );
    }
    if (res.status === 422) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Workflow를 찾았지만 dispatch 불가 (HTTP 422). ` +
            `daily-backup.yml에 'workflow_dispatch:' trigger가 있는지 확인하세요. ` +
            `(force push로 workflow 파일이 GitHub에 등록 안 됐을 수 있음 — repo Settings → Actions → General → "Allow all actions" 확인)`,
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: `GitHub API 에러 (HTTP ${res.status})`,
        detail: errorBody,
      },
      { status: 502 },
    );
  } catch (e) {
    log.error("admin-trigger-backup", "fetch-failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
